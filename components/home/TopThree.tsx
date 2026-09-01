"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAvatar } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";
import { TAG_COLOR, TAG_LABELS } from "@/lib/tags";
import TagIcon from "@/components/TagIcon";
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
  color: string;
  /** The potato boards bring their own; the rest use the game's own tag art. */
  emoji?: string;
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
        first ? "text-[12.5px] font-semibold" : "text-[12px] text-ink/75"}`}>
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
  const [potato, setPotato] = useState<Board[]>([]);

  // The two potato boards live in the database and change daily, so they are
  // read here rather than baked in at deploy time like the rest.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const [kudos, posts] = await Promise.all([
        supabase.from("kudos").select("receiver_character_id"),
        supabase.from("gallery_posts").select("character_id, like_count")
          .not("character_id", "is", null),
      ]);

      const count = (pairs: [number, number][]) => {
        const total = new Map<number, number>();
        for (const [id, n] of pairs) total.set(id, (total.get(id) ?? 0) + n);
        return [...total.entries()]
          .filter(([, n]) => n > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, SHOW)
          .map(([id]) => ({
            id,
            name: names[id]?.name ?? `#${id}`,
            avatar: names[id]?.avatar ?? null,
          }));
      };

      const made: Board[] = [];
      const profile = count(((kudos.data ?? []) as { receiver_character_id: number }[])
        .map((k) => [k.receiver_character_id, 1]));
      if (profile.length) {
        made.push({ key: "popoto", label: t("lb.popoto"), color: "#e5cc80",
                    emoji: "🥔", rows: profile });
      }
      const gallery = count(((posts.data ?? []) as
        { character_id: number; like_count: number | null }[])
        .map((p) => [p.character_id, p.like_count ?? 0]));
      if (gallery.length) {
        made.push({ key: "gallery", label: t("lb.gallery"), color: "#4fb8a8",
                    emoji: "🥔", rows: gallery });
      }
      setPotato(made);
    })();
  }, [names, t]);

  const boards: Board[] = [
    ...potato,
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
              className="text-[12.5px] font-normal text-accent no-underline hover:underline">
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
            <span className="flex items-center gap-1.5 truncate text-[12px] font-medium"
                  style={{ color: `color-mix(in srgb, ${b.color} 78%, #ffffff)` }}>
              <span className="grid size-[18px] shrink-0 place-items-center rounded"
                    style={{ background: `${b.color}26` }}>
                {b.emoji
                  ? <span className="text-[11px] leading-none">{b.emoji}</span>
                  : <TagIcon tag={b.key} size={13} />}
              </span>
              {b.label}
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
