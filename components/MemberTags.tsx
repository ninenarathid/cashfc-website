"use client";

import type { Member } from "@/lib/types";
import { ACHV_TIER_HELP, ACHV_TIER_LABEL, ultimateAbbr } from "@/lib/types";
import JobIcon, { jobTierStyle } from "@/components/JobIcon";

/**
 * Shared so the board and the member page cannot drift apart: the same member has to
 * read as the same thing in both places.
 *
 * Order matters — raid standing first, then the playstyles derived from rare
 * achievements. This game is not only raiding and the tags should not imply it is.
 */
export const TAG_LABELS: Record<string, string> = {
  all: "All",
  "tier-clear": "Tier cleared", prog: "Progging", raider: "Raider",
  ultimate: "Ultimate", veteran: "Veteran", extreme: "Extreme",
  achiever: "Achiever",
  crafter: "Crafter", gatherer: "Gatherer", relic: "Relic grinder",
  explorer: "Explorer", treasure: "Treasure hunter", goldsaucer: "Gold Saucer",
  seasonal: "Seasonal", pvp: "PvP", oldtimer: "Old-timer",
  casual: "Casual", unknown: "No data",
};

export const TAG_HELP: Record<string, string> = {
  "tier-clear": "Cleared every boss of the current savage tier",
  prog: "Partway through the current savage tier",
  raider: "Has savage kills in the current tier",
  ultimate: "Has cleared at least one Ultimate",
  veteran: "Cleared savage or Ultimate content, but not this tier",
  extreme: "Cleared at least one extreme trial this patch",
  achiever: "Top 20% of the FC for rare achievements overall",
  crafter: "Rare crafting achievements — top 30% of everyone who has any",
  gatherer: "Rare fishing, mining and botany achievements — top 30%",
  relic: "Rare relic weapon and tool achievements — top 30%",
  explorer: "Rare Eureka, Bozja and exploration achievements — top 30%",
  treasure: "Rare treasure map and hunt achievements — top 30%",
  goldsaucer: "Rare Gold Saucer achievements — top 30%",
  seasonal: "Rare seasonal event achievements — top 30%",
  pvp: "Rare PvP achievements — top 30%",
  oldtimer: "Rare legacy achievements from the game's early years — top 30%",
  casual: "No standout stats, but some data is public",
  unknown: "Logs and achievements are both private",
};

export const TAG_CLASS: Record<string, string> = {
  "tier-clear": "border-chili/60 bg-chili/15 text-chili",
  prog: "border-chili/35 bg-chili/5 text-chili/85",
  raider: "border-chili/50 bg-chili/10 text-chili",
  // Deliberately quiet: clearing an Ultimate is a big deal, but on a board where a
  // fifth of the roster has one it should not shout over everything else.
  ultimate: "border-gold/35 bg-gold/5 text-gold/85",
  veteran: "border-gold/30 bg-gold/5 text-gold/80",
  extreme: "border-[#c86fd1]/50 bg-[#c86fd1]/10 text-[#d79ade]",
  achiever: "border-jade/30 bg-jade/5 text-jade/85",
  crafter: "border-copper/50 bg-copper/10 text-copper",
  gatherer: "border-[#6aa84f]/50 bg-[#6aa84f]/10 text-[#93c47d]",
  relic: "border-[#b07ce8]/50 bg-[#b07ce8]/10 text-[#c9a8f0]",
  explorer: "border-[#4fa8b8]/50 bg-[#4fa8b8]/10 text-[#7fc7d4]",
  treasure: "border-[#d9a441]/45 bg-[#d9a441]/10 text-[#e3bd76]",
  goldsaucer: "border-[#e07bb0]/45 bg-[#e07bb0]/10 text-[#efa5cb]",
  seasonal: "border-[#8fa3d9]/45 bg-[#8fa3d9]/10 text-[#b0bee6]",
  pvp: "border-steel/45 bg-steel/10 text-steel",
  oldtimer: "border-[#a58b6a]/50 bg-[#a58b6a]/10 text-[#c2ac91]",
  casual: "border-line text-muted",
  unknown: "border-dashed border-line text-muted",
};

/** The same palette as TAG_CLASS, as hex, for charts that cannot use classes. */
export const TAG_COLOR: Record<string, string> = {
  "tier-clear": "#d14b3a", prog: "#a8483c", raider: "#c14a3c",
  ultimate: "#e5cc80", veteran: "#b8a678", extreme: "#c86fd1",
  achiever: "#4fb8a8",
  crafter: "#c98a5b", gatherer: "#6aa84f", relic: "#b07ce8",
  explorer: "#4fa8b8", treasure: "#d9a441", goldsaucer: "#e07bb0",
  seasonal: "#8fa3d9", pvp: "#7ea6c9", oldtimer: "#a58b6a",
  casual: "#9c8f78", unknown: "#55493a",
};

/** "Legendary crafter" reads better than "Legendary Crafter" mid-sentence. */
export function tagText(tag: string, tier?: string): string {
  const base = TAG_LABELS[tag] ?? tag;
  return tier ? `${ACHV_TIER_LABEL[tier]} ${base.toLowerCase()}` : base;
}

export default function MemberTags(
  { m, extremeTotal, size = "sm" }:
  { m: Member; extremeTotal?: number; size?: "sm" | "md" },
) {
  const tiers = m.achv_tiers ?? {};
  const ults = m.ult_cleared ?? [];
  const pad = size === "md" ? "px-3 py-1 text-[12.5px]" : "px-2.5 py-[3px] text-[11.5px]";

  // Every job that reached a grade, not just the best one: plenty of people are a
  // Legendary Reaper *and* a Master Dancer, and collapsing that to one loses the
  // second job somebody might want to ask about.
  const jobs = Object.entries(m.job_scores ?? {})
    .filter(([, s]) => s.tier)
    .sort((a, b) => b[1].score - a[1].score);

  return (
    <>
      {/* Deliberately understated: useful for finding someone who could teach a
          newcomer, not a ranking anyone should be playing for. Only shown from
          Expert up, because below that the answer to "could they teach this?" is no. */}
      {jobs.map(([job, s]) => (
        <span
          key={job}
          title={`${s.parse} average best parse over ${s.kills} kills across ${s.fights} fights — good person to ask about ${job}`}
          style={jobTierStyle(job, s.tier)}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium ${pad}`}>
          <JobIcon job={job} size={size === "md" ? 15 : 13} />
          {ACHV_TIER_LABEL[s.tier!]} {job}
        </span>
      ))}
      {m.tags.map((t) => {
        const tier = tiers[t];
        // Which Ultimates, not just that there were some — UCOB and FRU are worlds
        // apart. Still one chip, and no louder than the rest.
        const abbr = t === "ultimate" && ults.length
          ? ults.map(ultimateAbbr).join(", ") : null;
        const exCount = t === "extreme" ? (m.ex_cleared?.length ?? 0) : 0;
        return (
          <span key={t}
                title={abbr ? `Cleared: ${ults.join(", ")}`
                  : tier ? `${TAG_HELP[t] ?? t} — ${ACHV_TIER_HELP[tier]}`
                  : (TAG_HELP[t] ?? "")}
                className={`whitespace-nowrap rounded-full border font-medium ${pad} ${
                  TAG_CLASS[t] ?? "border-line text-muted"}`}>
            {tagText(t, tier)}
            {abbr && <span className="font-normal opacity-80">: {abbr}</span>}
            {exCount > 0 && (
              <small className="ml-1 opacity-75">
                {exCount}/{extremeTotal || "?"}
              </small>
            )}
          </span>
        );
      })}
    </>
  );
}
