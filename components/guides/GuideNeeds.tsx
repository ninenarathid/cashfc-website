"use client";

import { useLang } from "@/lib/i18n";
import { inLang, type GuideRow } from "@/lib/guides";

/** The usual make-up of a party of this size. */
const MAKEUP: Record<number, [number, number, number]> = { 8: [2, 2, 4], 4: [1, 1, 2] };

/**
 * What the fight asks before you go in, at the top of the guide (the owner,
 * 2026-11-25): the level, the average item level, how many players and in
 * what roles, the time limit, and how to unlock it. Nothing when a guide has
 * none of it written.
 */
export default function GuideNeeds({ guide }: { guide: GuideRow }) {
  const { t, lang } = useLang();
  const unlock = inLang(lang, guide.unlock, guide.unlock_en);
  const chips: string[] = [];
  if (guide.req_level) chips.push(t("guide.req.level", { n: guide.req_level }));
  if (guide.req_ilvl) chips.push(t("guide.req.ilvl", { n: guide.req_ilvl }));
  if (guide.req_party) {
    const m = MAKEUP[guide.req_party];
    chips.push(m
      ? t("guide.req.partyRoles", { n: guide.req_party, t: m[0], h: m[1], d: m[2] })
      : t("guide.req.party", { n: guide.req_party }));
  }
  if (guide.req_minutes) chips.push(t("guide.req.time", { n: guide.req_minutes }));
  if (chips.length === 0 && !unlock) return null;

  return (
    <section className="mt-3 rounded-xl border border-line bg-surface px-3.5 py-3">
      <h2 className="font-data text-meta font-semibold text-muted">{t("guide.req")}</h2>
      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full border border-line bg-card px-2.5 py-1 font-data text-ui font-semibold text-ink">{c}</span>
          ))}
        </div>
      )}
      {unlock && (
        <div className="mt-2.5">
          <div className="text-meta font-semibold text-muted">{t("guide.req.unlock")}</div>
          <p className="mt-0.5 whitespace-pre-line text-read leading-relaxed text-ink/90">{unlock}</p>
        </div>
      )}
    </section>
  );
}
