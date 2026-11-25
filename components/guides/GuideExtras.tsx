"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import ImageLightbox from "@/components/ui/ImageLightbox";
import FocusPicture from "@/components/guides/FocusPicture";
import { inLang, pictureUrl, seatColor, type GuideRow, type Seat } from "@/lib/guides";

/** "From xivjpraids.com", with the link, under what came from there. */
function Credit({ guide }: { guide: GuideRow }) {
  const { t } = useLang();
  if (!guide.xref_name) return null;
  const [before, after = ""] = t("guide.xref", { name: "\u0000" }).split("\u0000");
  return (
    <p className="mt-1.5 text-meta text-muted">
      {before}
      {guide.xref_url && /^https:\/\//.test(guide.xref_url) ? (
        <a href={guide.xref_url} target="_blank" rel="noopener noreferrer"
           className="text-accent underline decoration-accent/40 underline-offset-2">{guide.xref_name}</a>
      ) : guide.xref_name}
      {after}
    </p>
  );
}

/**
 * The strat's macro, to paste into the game, in English or Japanese (the
 * owner, 2026-11-25: "macro 2 ภาษา"). Thai is not one of them: the game's chat
 * does not draw it. Copied whole with one press.
 */
export function GuideMacro({ guide }: { guide: GuideRow }) {
  const { t } = useLang();
  const has = { en: !!guide.macro_en?.trim(), ja: !!guide.macro_ja?.trim() };
  const [tab, setTab] = useState<"en" | "ja">(has.en ? "en" : "ja");
  const [copied, setCopied] = useState(false);
  if (!has.en && !has.ja) return null;
  const text = (tab === "en" ? guide.macro_en : guide.macro_ja) ?? "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the clipboard refused; the text is there to select */ }
  };
  const tabCls = (on: boolean) => `min-h-9 rounded-lg border px-3 text-read ${on ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line text-ink hover:border-accent"}`;
  return (
    <section id="macro" className="mt-6 scroll-mt-[calc(var(--nav-h)+1rem)]">
      <h2 className="mb-2.5 font-display text-lg font-semibold">{t("guide.macro")}</h2>
      <div className="rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {has.en && <button type="button" className={tabCls(tab === "en")} aria-pressed={tab === "en"} onClick={() => setTab("en")}>English</button>}
          {has.ja && <button type="button" className={tabCls(tab === "ja")} aria-pressed={tab === "ja"} onClick={() => setTab("ja")}>日本語</button>}
          <button type="button" onClick={() => void copy()}
                  className="ml-auto min-h-9 rounded-lg bg-accent px-3.5 text-read font-semibold text-bg">
            {copied ? t("guide.copied") : t("guide.copyMacro")}
          </button>
        </div>
        <pre className="mt-2.5 overflow-x-auto whitespace-pre rounded-lg border border-line bg-bg p-3 font-mono text-ui leading-relaxed text-ink"
             lang={tab === "ja" ? "ja" : "en"}>{text}</pre>
        <Credit guide={guide} />
      </div>
    </section>
  );
}

/**
 * The whole fight on one page (the owner, 2026-11-25: the xivjpraids
 * cheatsheet, in Thai, with their credit). As panels, each lit for the
 * reader's own seat where the positions are fixed ("focus แค่ตำแหน่งที่เรา
 * เลือก เฉพาะ mech ที่ fix position"), and as one picture to open and keep.
 */
export function GuideCheatsheet({ guide, seat }: { guide: GuideRow; seat: Seat }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  const panels = guide.cheat_panels ?? [];
  const pics = lang === "en" && guide.cheat_pics_en?.length ? guide.cheat_pics_en : guide.cheat_pics ?? [];
  if (!panels.length && !pics.length) return null;
  const urls = pics.map((p) => pictureUrl(p.path)).filter((u): u is string => !!u);
  const color = seatColor(seat);
  return (
    <section id="cheatsheet" className="mt-5 scroll-mt-[calc(var(--nav-h)+1rem)]">
      <h2 className="mb-2.5 font-display text-lg font-semibold">{t("guide.cheatsheet")}</h2>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
        {panels.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {panels.map((p, i) => {
              const lines = (lang === "en" && p.lines_en?.length ? p.lines_en : p.lines) ?? [];
              return (
                <div key={i} className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-bg/40 p-2">
                  <div className="text-ui font-semibold leading-snug text-ink">{inLang(lang, p.title, p.title_en)}</div>
                  {p.path ? (
                    <FocusPicture picture={p.path} w={p.w ?? null} h={p.h ?? null}
                                  points={p.spots?.[seat]?.at ?? []} ring={p.ring ?? 6} color={color}
                                  alt={inLang(lang, p.title, p.title_en)} />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-lg border border-line bg-card px-2 text-center text-lead font-semibold leading-relaxed text-ink">
                      <span className="whitespace-pre-line">{lines.join("\n")}</span>
                    </div>
                  )}
                  {p.path && lines.length > 0 && (
                    <div className="text-meta leading-snug text-muted">{lines.join(" · ")}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {urls[0] && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOpen(0)}
                    className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-read text-ink hover:border-accent hover:text-accent">
              {t("guide.wholeCheatsheet")}
            </button>
            <a href={urls[0]} download target="_blank" rel="noopener"
               className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-read text-ink no-underline hover:border-accent hover:text-accent">
              {t("guide.saveCheatsheet")}
            </a>
          </div>
        )}
        <Credit guide={guide} />
      </div>
      {open !== null && urls.length > 0 && (
        <ImageLightbox images={urls} at={Math.min(open, urls.length - 1)} onMove={setOpen} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
