"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { FoldHead, useFold } from "@/components/guides/Fold";
import { inLang, pictureUrl, type GuideRow } from "@/lib/guides";

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
  const [open, setOpen] = useState<number | null>(null);
  const [shown, toggle] = useFold("needs");
  const unlock = inLang(lang, guide.unlock, guide.unlock_en);
  const pics = guide.unlock_pics ?? [];
  const urls = pics.map((p) => pictureUrl(p.path)).filter((u): u is string => !!u);
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
  if (chips.length === 0 && !unlock && pics.length === 0) return null;

  return (
    <section className="mt-3 rounded-xl border border-line bg-surface px-3.5 py-3">
      <h2 className="font-data text-meta font-semibold text-muted">
        <FoldHead open={shown} onToggle={toggle} controls="needs-body" className="min-h-8">{t("guide.req")}</FoldHead>
      </h2>
      <div id="needs-body" hidden={!shown}>
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
      {/* Where to go, on the game's own map (v348). */}
      {pics.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {pics.map((p, i) => (
            <button key={i} type="button" onClick={() => setOpen(i)} className="w-56 shrink-0 text-left sm:w-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pictureUrl(p.path) ?? undefined} alt={inLang(lang, p.say, p.say_en)}
                   width={p.w} height={p.h} loading="lazy" decoding="async"
                   className="aspect-[3/2] w-full cursor-zoom-in rounded-md border border-line bg-card object-cover" />
              {(p.say || p.say_en) && (
                <span className="mt-1 block text-meta leading-snug text-ink/85">{inLang(lang, p.say, p.say_en)}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open !== null && urls.length > 0 && (
        <ImageLightbox images={urls} at={Math.min(open, urls.length - 1)} onMove={setOpen} onClose={() => setOpen(null)} />
      )}
      </div>
    </section>
  );
}
