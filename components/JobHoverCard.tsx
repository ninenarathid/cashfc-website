"use client";

import type { ReactNode } from "react";
import { HoverCard } from "@/components/ui/HoverCard";
import JobIcon, { jobLabel, jobTierStyle } from "@/components/JobIcon";
import { ACHV_TIER_LABEL, CONTENT_LABEL } from "@/lib/types";
import { ACHV_TIER_STYLE } from "@/lib/tags";
import { useLang } from "@/lib/i18n";

/**
 * What a graded job chip is claiming, broken into its parts.
 *
 * The same sentence was in a `title` attribute and read as one long breath:
 * "89.9 difficulty- and kill-weighted parse over 172 kills across 16 fights, up
 * to Ultimate — good person to ask about Red Mage". Four separate facts and a
 * recommendation, and no way to tell at a glance which number was the parse.
 *
 * The kill count is the one to be careful with. FF Logs gives a fight's kills as
 * a single all-jobs total and names only the job of the best parse, so these are
 * the kills on the fights where this job parsed best — not kills on this job. A
 * member queried it: 55 kills on Doomtrain, two of them on the Dark Knight the
 * card was naming.
 *
 * Here the numbers sit in a row of their own and the recommendation is what it
 * always was: the point of the chip. Nothing new is being said — the chip means
 * exactly what it meant — it is only laid out so the parts can be read one at a
 * time.
 */
export default function JobHoverCard(
  { job, tier, parse, kills, fights, hardest, children }: {
    job: string;
    tier: string;
    parse: number;
    kills: number;
    fights: number;
    hardest?: string | null;
    children: ReactNode;
  },
) {
  const { lang } = useLang();
  const th = lang === "th";
  const style = ACHV_TIER_STYLE[tier];

  const stat = (value: ReactNode, label: string) => (
    <div className="flex flex-col">
      <span className="font-data text-[14px] text-ink">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );

  return (
    <HoverCard trigger={children}>
      <div className="flex flex-col gap-2.5">
        <div
          style={jobTierStyle(job, tier)}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium">
          <JobIcon job={job} size={14} />
          {ACHV_TIER_LABEL[tier]} {jobLabel(job)}
        </div>

        <div className="flex gap-5 border-t border-line/70 pt-2.5">
          {stat(parse, th ? "parse" : "parse")}
          {stat(fights, th ? "บอสที่พาร์สดีสุด" : fights === 1 ? "best fight" : "best fights")}
          {stat(kills, th ? "ครั้งที่ฆ่ารวม" : "kills in them")}
        </div>

        {/* Said plainly, because a parse number with no qualifier invites the
            wrong comparison: it is weighted by how hard the fight was and how
            often they killed it, not a single best pull. */}
        <p className="text-[11.5px] text-muted">
          {th
            ? `ถ่วงน้ำหนักตามความยากและจำนวนครั้งที่ฆ่า${
                hardest ? ` · สูงสุดถึง ${CONTENT_LABEL[hardest] ?? hardest}` : ""}`
            : `Difficulty- and kill-weighted${
                hardest ? ` · up to ${CONTENT_LABEL[hardest] ?? hardest}` : ""}`}
        </p>

        <p className="border-t border-line/70 pt-2 text-ink/85">
          {th ? "เป็นคนที่ควรถามเรื่อง " : "Good person to ask about "}
          <span className="font-semibold"
                style={style ? { color: style.color, fontWeight: style.weight } : undefined}>
            {jobLabel(job)}
          </span>
        </p>
      </div>
    </HoverCard>
  );
}
