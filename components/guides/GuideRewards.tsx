"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { inLang, pictureUrl, type RewardRow } from "@/lib/guides";

/**
 * What the fight gives: the token and how many a clear drops, what it buys
 * and at what item level, the rare mount — and what each looks like (the
 * owner, 2026-11-25).
 *
 * The icons are the game's own. A set of weapons is a grid of their icons
 * with the job under each; a tap names the weapon, because twenty-two names
 * written out would bury the icons they are meant to label. Pictures of the
 * thing open large, like a step's reference pictures.
 */
export default function GuideRewards({ rewards }: { rewards: RewardRow[] }) {
  const { t } = useLang();
  if (rewards.length === 0) return null;
  return (
    <section id="rewards" className="mt-8 scroll-mt-[calc(var(--nav-h)+1rem)]">
      <h2 className="mb-2.5 font-display text-lg font-semibold">{t("guide.rewards")}</h2>
      <div className="flex flex-col gap-3">
        {rewards.map((r) => <RewardCard key={r.id} r={r} />)}
      </div>
    </section>
  );
}

function RewardCard({ r }: { r: RewardRow }) {
  const { t, lang } = useLang();
  const [piece, setPiece] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const icon = pictureUrl(r.icon);
  const say = inLang(lang, r.say, r.say_en);
  const picUrls = r.pics.map((p) => pictureUrl(p.path)).filter((u): u is string => !!u);
  const chosen = piece != null ? r.pieces[piece] : null;

  return (
    <article className="min-w-0 rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" width={48} height={48} loading="lazy" decoding="async"
               className="size-12 shrink-0 rounded-lg" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-line px-2 py-0.5 font-data text-label text-muted">
              {t(`guide.kind.${r.kind}` as "guide.kind.other")}
            </span>
            {r.ilvl != null && (
              <span className="rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 font-data text-label font-semibold text-accent">
                IL{r.ilvl}
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-title font-semibold text-ink">{r.name}</h3>
        </div>
      </div>

      {say && <p className="mt-2 whitespace-pre-line text-read leading-relaxed text-ink/90">{say}</p>}

      {r.pieces.length > 0 && (
        <div className="mt-2.5">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
            {r.pieces.map((p, i) => {
              const src = pictureUrl(p.icon);
              const on = piece === i;
              return (
                <button key={i} type="button" onClick={() => setPiece(on ? null : i)} aria-pressed={on}
                        aria-label={p.job ? `${p.name} · ${p.job}` : p.name} title={p.name}
                        className={`flex flex-col items-center gap-0.5 rounded-lg border p-1 transition-colors ${on ? "border-accent bg-accent/10" : "border-transparent hover:border-line"}`}>
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" width={40} height={40} loading="lazy" decoding="async" className="size-10 rounded-md" />
                  )}
                  {p.job && <span className="font-data text-label text-muted">{p.job}</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1 min-h-6 text-ui text-muted" aria-live="polite">
            {chosen ? <span className="text-ink">{chosen.name}{chosen.job ? ` · ${chosen.job}` : ""}</span> : t("guide.pickPiece")}
          </p>
        </div>
      )}

      {r.pics.length > 0 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {r.pics.map((p, i) => (
            <button key={i} type="button" onClick={() => setOpen(i)} className="w-44 shrink-0 text-left sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pictureUrl(p.path) ?? undefined} alt={inLang(lang, p.say, p.say_en)}
                   width={p.w} height={p.h} loading="lazy" decoding="async"
                   className="aspect-[4/3] w-full cursor-zoom-in rounded-md border border-line bg-card object-contain" />
              {(p.say || p.say_en) && (
                <span className="mt-1 block text-meta leading-snug text-ink/85">{inLang(lang, p.say, p.say_en)}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open !== null && picUrls.length > 0 && (
        <ImageLightbox images={picUrls} at={Math.min(open, picUrls.length - 1)}
                       onMove={setOpen} onClose={() => setOpen(null)} />
      )}
    </article>
  );
}
