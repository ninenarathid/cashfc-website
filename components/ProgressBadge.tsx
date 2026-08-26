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

  const when = p.last
    ? new Date(`${p.last}T00:00:00`).toLocaleDateString(
        lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short" })
    : null;

  const detail = cleared
    ? (lang === "th"
        ? `เพิ่งเคลียร์ ${p.name}${when ? ` เมื่อ ${when}` : ""} จาก ${p.pulls} ครั้งที่ลงในช่วงนี้`
        : `Cleared ${p.name}${when ? ` on ${when}` : ""}, across ${p.pulls} pulls in these logs`)
    : (lang === "th"
        ? `กำลังตี ${p.name} — ครั้งที่ดีที่สุดเหลือเลือดบอส ${p.pct}%${
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
      <span className="font-data">{progressLabel(p)}</span>
    </span>
  );
}
