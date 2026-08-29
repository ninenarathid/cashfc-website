"use client";

import type { ProgressRow } from "@/lib/types";
import { ultimateAbbr } from "@/lib/types";
import { useLang } from "@/lib/i18n";

/**
 * What somebody is raiding right now, read from their own recent logs.
 *
 * Two states, and freshness decides whether either shows at all. Content does
 * not: an Ultimate from three expansions ago is current if it was pulled last
 * week, and the tier everybody else is on is not current for a member who has
 * not logged into it. The pipeline only keeps rows from the last ten days.
 *
 *   learning — the deepest pull so far: how much boss health was left, and which
 *              phase. Lower is further in, which is backwards from most numbers
 *              on this site, so the tooltip spells it out.
 *   cleared  — killed it in those same logs. Once it dies, "was at 0.9%" stops
 *              being the story, so the percentage is dropped entirely.
 */
export function progressLabel(p: ProgressRow): string {
  const name = p.kind === "ultimate" ? ultimateAbbr(p.name) : p.name;
  if (p.state === "cleared") return name;
  const phase = p.phase > 0 ? ` P${p.phase}` : "";
  return `${name} ${p.pct}%${phase}`;
}

export default function ProgressBadge(
  { progress: p, size = "sm" }: { progress: ProgressRow; size?: "sm" | "md" },
) {
  const { t, lang } = useLang();
  const pad = size === "md" ? "px-3 py-1 text-[12.5px]" : "px-2.5 py-[3px] text-[11.5px]";
  const cleared = p.state === "cleared";

  const locale = lang === "th" ? "th-TH" : "en-GB";
  const when = p.last
    ? new Date(`${p.last}T00:00:00`).toLocaleDateString(
        locale, { day: "numeric", month: "short" })
    : null;

  // A clear happened at a time, and saying so is most of what makes it news
  // rather than a record. Falls back to the day for rows written before the
  // pipeline kept the minute.
  const stamp = cleared && p.last_ts
    ? new Date(p.last_ts * 1000).toLocaleString(
        locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : cleared ? when : null;

  const detail = cleared
    ? (lang === "th"
        ? `เคลียร์ครั้งแรก ${p.name}${stamp ? ` เมื่อ ${stamp}` : ""} จาก ${p.pulls} ครั้งที่ลงในช่วงนี้`
        : `First clear of ${p.name}${stamp ? ` at ${stamp}` : ""}, across ${p.pulls} pulls in these logs`)
    : (lang === "th"
        ? `กำลังเล่น ${p.name} — ครั้งที่ดีที่สุดเหลือเลือดบอส ${p.pct}%${
            p.phase > 0 ? ` ที่ Phase ${p.phase}` : ""} จาก ${p.pulls} ครั้งที่ลง${
            when ? ` ล่าสุด ${when}` : ""}`
        : `Learning ${p.name} — best attempt left the boss at ${p.pct}%${
            p.phase > 0 ? ` in phase ${p.phase}` : ""}, across ${p.pulls} pulls${
            when ? `, last on ${when}` : ""}`);

  const tone = cleared
    ? "border-jade/50 bg-jade/10 text-jade"
    : "border-copper/50 bg-copper/10 text-copper";

  return (
    <span title={detail}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium ${pad} ${tone}`}>
      <span className="opacity-75">
        {t(cleared ? "member.justCleared" : "member.progressing")}
      </span>
      {/* Which kind of content, then which fight. "Vamp Fatale" means nothing to
          somebody who does not raid this tier; "Savage · Vamp Fatale" places it
          for everybody, and the two Ultimates a week apart stop looking like the
          same news as a savage boss. */}
      <span className="opacity-60">
        {t(p.kind === "ultimate" ? "member.kindUltimate" : "member.kindSavage")} ·
      </span>
      <span className="font-data">{progressLabel(p)}</span>
      {stamp && <span className="font-data opacity-70">· {stamp}</span>}
    </span>
  );
}
