"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { periodStart } from "@/lib/popoto";
import { galleryTotals, profileTotals, rank, type BoardRow } from "@/lib/popoto-board";
import { useAvatar } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";
import { TAG_COLOR, TAG_LABELS } from "@/lib/tags";
import TagIcon from "@/components/TagIcon";
import PopotoIcon from "@/components/ui/PopotoIcon";
import type { BucketRow } from "@/lib/leaderboards";

/**
 * Who leads what, on the front page.
 *
 * Ten boards with three names each is thirty rows, which on a front page is not
 * a summary of the leaderboards — it is the leaderboards, printed twice. So this
 * keeps the one thing the full page cannot give at a glance, the shape of who
 * is ahead in what, and drops everything that made it a table.
 *
 * No numbers. A percentage of rare crafting achievements is meaningless without
 * the paragraph explaining it, and that paragraph lives on the other page along
 * with the ranking it justifies. Here the question is only "who", so the answer
 * is only faces and names.
 *
 * One line per board rather than a card each. Cards would be ten boxes of
 * chrome around thirty names; a line puts the playstyle at the left in its own
 * colour and the three people beside it, and ten of those read as a list rather
 * than as a wall.
 *
 * The whole thing is a link. Anybody who reads a row and wants the numbers
 * behind it is one click from them, which is also why none of them are here.
 */

const SHOW = 3;

interface Board {
  key: string;
  label: string;
  /** A word under the label: the potato boards say which stretch they count. */
  note?: string;
  color: string;
  /** The potato boards bring their own; the rest use the game's own tag art. */
  icon?: ReactNode;
  rows: { id: number; name: string; avatar: string | null }[];
}

function Face({ row, first }: {
  row: { id: number; name: string; avatar: string | null };
  first: boolean;
}) {
  const face = useAvatar(row.id, row.avatar);
  return (
    <Link href={`/member/${row.id}`}
          className="flex min-w-0 items-center gap-1.5 no-underline">
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={face} alt="" loading="lazy"
             className={`shrink-0 rounded-full border border-line object-cover ${
               first ? "size-7" : "size-6"}`} />
      ) : (
        <span className={`shrink-0 rounded-full border border-line bg-card ${
          first ? "size-7" : "size-6"}`} />
      )}
      <span className={`truncate font-data text-ink transition-colors hover:text-accent ${
        first ? "text-ui font-semibold" : "text-ui text-ink/75"}`}>
        {row.name}
      </span>
    </Link>
  );
}

export default function TopThree(
  { buckets, names }: {
    /** The achievement boards, worked out at build time from the roster file. */
    buckets: { key: string; rows: BucketRow[] }[];
    names: Record<number, { name: string; avatar: string | null }>;
  },
) {
  const { t } = useLang();
  const [potato, setPotato] = useState<{ profile: BoardRow[]; gallery: BoardRow[] } | null>(null);

  // The two potato boards live in the database and change daily, so they are
  // read here rather than baked in at deploy time like the rest. This month,
  // the way the leaderboards open, counted by the same functions and ranked by
  // the same rule, so the front page and the page it links to agree on who is
  // ahead. It used to count every potato ever given, which was also every page
  // of the kudos table on every visit to the front page.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const from = periodStart("month");
    Promise.all([profileTotals(supabase, from), galleryTotals(supabase, from)]).then(
      ([profile, gallery]) => setPotato({
        profile: rank(profile, names).slice(0, SHOW),
        gallery: rank(gallery, names).slice(0, SHOW),
      }),
      // A front page without its potato rows is still a front page.
      () => {});
  }, [names]);

  const month = t("lb.monthNote");
  const boards: Board[] = [
    ...(potato?.profile.length ? [{
      key: "popoto", label: t("lb.popoto"), note: month, color: "#e5cc80",
      icon: <PopotoIcon size={16} />, rows: potato.profile }] : []),
    ...(potato?.gallery.length ? [{
      key: "gallery", label: t("lb.gallery"), note: month, color: "#4fb8a8",
      icon: <PopotoIcon size={16} />, rows: potato.gallery }] : []),
    ...buckets.filter((b) => b.rows.length).map((b) => ({
      key: b.key,
      label: TAG_LABELS[b.key] ?? b.key,
      color: TAG_COLOR[b.key] ?? "#8b97a8",
      rows: b.rows,
    })),
  ];
  if (!boards.length) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex flex-wrap items-baseline gap-3 font-display text-lg font-semibold">
        {t("lb.title")}
        <Link href="/leaderboards"
              className="text-ui font-normal text-accent no-underline hover:underline">
          {t("lb.full")} →
        </Link>
      </h2>

      <div className="grid gap-x-6 gap-y-1 rounded-xl border border-line bg-surface p-3.5 md:grid-cols-2">
        {boards.map((b) => (
          <div key={b.key}
               className="grid grid-cols-[minmax(92px,auto)_1fr] items-center gap-x-3 border-b border-line/40 py-1.5 last:border-0 md:border-0">
            {/* The tag's own art rather than a coloured dot. A dot only says
                "these are different"; the icon says which one, which is the
                whole job of the thing sitting in front of a name. */}
            <span className="flex items-center gap-1.5 truncate text-ui font-medium"
                  style={{ color: `color-mix(in srgb, ${b.color} 78%, #ffffff)` }}>
              <span className="grid size-[18px] shrink-0 place-items-center rounded"
                    style={{ background: `${b.color}26` }}>
                {b.icon ?? <TagIcon tag={b.key} size={13} />}
              </span>
              {b.note ? (
                // Under the label rather than after it: on a phone the three
                // names beside it are already down to a few letters each, and
                // a longer label would take the rest.
                <span className="min-w-0">
                  <span className="block truncate">{b.label}</span>
                  <span className="block font-data text-label font-normal text-muted">
                    {b.note}
                  </span>
                </span>
              ) : b.label}
            </span>
            {/* Equal columns rather than a flowing row, so the leaders line up
                down the page and the second and third names do not wander
                about depending on how long the first one is. */}
            <span className="grid min-w-0 grid-cols-3 gap-x-2">
              {b.rows.slice(0, SHOW).map((r, i) => (
                <Face key={r.id} row={r} first={i === 0} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
