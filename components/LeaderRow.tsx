"use client";

import Link from "next/link";
import { useAvatar } from "@/lib/avatars";
import { ACHV_TIER_STYLE } from "@/lib/tags";
import { ACHV_TIER_LABEL } from "@/lib/types";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ReactNode } from "react";

/**
 * One line of a leaderboard.
 *
 * Shared so the achievement boards and the potato board cannot drift apart in
 * how they draw a place — they are read side by side on one page, and two rows
 * that rank the same way should not look like two different things.
 *
 * The top three get a face. Below that a name is enough: a column of thirty
 * portraits is a page of thumbnails with some numbers on it, and the point of
 * a top three is that it is glanceable without reading.
 */

export interface Leader {
  id: number;
  name: string;
  avatar: string | null;
  score: number;
  n: number;
  /** A grade, drawn as one: legendary | master | expert. */
  tier?: string;
  /** Anything else to say beside the name — "on vacation". */
  note?: string;
  noteTone?: "accent" | "muted";
}

const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
/** A stable colour per name, so a missing portrait is still somebody's colour. */
const hue = (n: string) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

export default function LeaderRow(
  { row, place, value, sub, title }: {
    row: Leader;
    place: number;
    /** The number this board ranks by, already formatted. */
    value: string;
    /** The smaller number in brackets after it. */
    sub?: string;
    /** What the number means, on hover. */
    title?: ReactNode;
  },
) {
  const top = place <= 3;
  // What they chose, then what the Lodestone has. The site already has one
  // answer to "which picture is this person" and this is it — a member who set
  // a profile picture set it for every page, this one included.
  const face = useAvatar(row.id, row.avatar);
  return (
    <li className={`grid items-center gap-2 ${
      top ? "grid-cols-[22px_78px_1fr_auto] py-2" : "grid-cols-[22px_1fr_auto]"} text-[13px]`}>
      <span className={`text-right font-data text-[11.5px] ${
        top ? "text-accent" : "text-muted"}`}>
        {place}
      </span>

      {top && (
        <Link href={`/member/${row.id}`} className="block size-[78px] shrink-0">
          {face ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={face} alt="" loading="lazy"
                 className="size-[78px] rounded-full border border-line object-cover" />
          ) : (
            <span className="grid size-[78px] place-items-center rounded-full border border-line font-data text-[18px] text-ink/80"
                  style={{ background: `hsl(${hue(row.name)} 30% 22%)` }}>
              {initials(row.name)}
            </span>
          )}
        </Link>
      )}

      <span className="min-w-0 truncate">
        <Link href={`/member/${row.id}`}
              className={`font-data text-ink no-underline hover:text-accent ${
                top ? "text-[16px] font-semibold" : ""}`}>
          {row.name}
        </Link>
        {/* The grade is the loudest thing on the line after the name, and gets
            louder the higher it is — a Legendary should not have to be looked
            for among the Experts. */}
        {row.tier && ACHV_TIER_STYLE[row.tier] && (
          <span className="ml-1.5 align-baseline"
                style={{ color: ACHV_TIER_STYLE[row.tier].color,
                         fontWeight: ACHV_TIER_STYLE[row.tier].weight,
                         fontSize: row.tier === "legendary" ? "12.5px"
                           : row.tier === "master" ? "12px" : "11.5px" }}>
            {ACHV_TIER_LABEL[row.tier] ?? row.tier}
          </span>
        )}
        {row.note && (
          <span className={`ml-1.5 text-[11px] ${
            row.noteTone === "muted" ? "text-muted/70" : "text-accent"}`}>
            {row.note}
          </span>
        )}
      </span>

      {/* The site's tooltip rather than the browser's: this one explains what
          the number is measured against, which is a sentence rather than a
          label, and the browser's waits a second and wraps where it likes. */}
      <Tooltip content={title} side="left">
        <span className="cursor-default text-right font-data text-[12px] text-muted">
          {value}
          {sub && <small className="ml-1 opacity-60">({sub})</small>}
        </span>
      </Tooltip>
    </li>
  );
}
