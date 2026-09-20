"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang } from "@/lib/i18n";
import { oneIn, readRareOdds, type Prize, type RareOdds } from "@/lib/prizes";

/** One thing a popoto can turn into, and how often. */
interface Slice {
  key: string;
  label: string;
  /** Per popoto sent to somebody else, as a percentage. Zero when switched off. */
  pct: number;
  /** What it would be if everything were switched on. */
  ifOn: number;
  color: string;
  /** Who it lands on. */
  who: string;
  off: boolean;
}

/**
 * Black or white on a segment, whichever can be read on it.
 *
 * A tier's colour is fixed and light enough for dark text, but a prize wears
 * whatever colour an admin picked out of a colour box — including navy — and
 * a percentage nobody can read is a percentage that may as well be absent.
 */
function inkOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#1b1005";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? "#1b1005" : "#f7f3ea";
}

/**
 * The gold a wrapped popoto arrives in — the site's own, so the slice for it
 * is the colour the thing itself is rather than one of its three tiers'.
 */
const RARE_GOLD = "#e5cc80";

/** Percentages, rounded the way a small chance has to be to stay true. */
const say = (n: number): string =>
  (n >= 10 ? n.toFixed(1) : n >= 1 ? n.toFixed(2) : n.toFixed(3))
    .replace(/\.?0+$/, "");

/**
 * Everything one popoto can turn into, on one bar. See v87–v89.
 *
 * The question this answers is the one nobody could answer before without
 * holding two tabs open and multiplying: a member sends a popoto — what are
 * the odds of anything at all happening, and of each particular thing? The
 * rare popoto's chance lives on one switch (v83) and splits three ways (v86);
 * every prize has its own (v87). They are separate rolls and were separate
 * screens, and separate screens is how a Free Company ends up giving away
 * more than anybody meant to.
 *
 * Two bars, because one cannot do it. The first is honest about scale: an
 * ordinary popoto is almost all of it, and seeing that the interesting
 * outcomes are a sliver is the point of drawing it to scale. The second
 * throws the sliver away and asks the only question left — of the popotos
 * that do turn into something, which something.
 *
 * It draws what is happening now rather than what is configured. A prize
 * behind a switch that is off is a prize nobody can win, and a summary that
 * counted it would be answering a different question than the one asked.
 */
export default function PrizeOdds(
  { supabase, prizes, prizesOn }: {
    supabase: SupabaseClient;
    prizes: Prize[];
    /** The master prize switch. Off means none of them are in play. */
    prizesOn: boolean;
  },
) {
  const { t, lang } = useLang();
  const [rare, setRare] = useState<RareOdds | null | undefined>(undefined);

  useEffect(() => {
    void readRareOdds(supabase).then(setRare);
  }, [supabase]);

  const slices = useMemo<Slice[]>(() => {
    const out: Slice[] = [];

    // The rare popoto as one slice rather than three. Which tier it comes out
    // is a second roll inside this one and a separate question: what this bar
    // is for is how often a popoto is anything other than a popoto, and
    // splitting the one entry everybody already knows the number of into
    // thirds made the bar harder to read for a fact nobody came here for.
    // The split is still on the rare popoto's own tab, where it is set.
    if (rare) {
      out.push({
        key: "rare", label: t("prize.oddsPopoto"),
        pct: rare.on ? rare.chance : 0, ifOn: rare.chance, color: RARE_GOLD,
        who: t("prize.oddsToReceiver"), off: !rare.on,
      });
    }

    // Then the prizes. The daily ones are left out on purpose: they are not
    // rolled per popoto but once on the first of somebody's day, so putting
    // them on a bar about one popoto would be a fourth kind of number
    // pretending to be the same as the other three.
    for (const p of prizes) {
      if (p.draw === "daily") continue;
      const live = prizesOn && p.active && p.stock !== 0;
      out.push({
        key: `prize-${p.id}`,
        label: (lang === "en" ? p.nameEn : null) || p.name,
        pct: live ? p.chance : 0, ifOn: p.chance, color: p.color,
        who: p.draw === "give" ? t("prize.oddsToSender")
          : p.draw === "both" ? t("prize.oddsToBoth") : t("prize.oddsToReceiver"),
        off: !live,
      });
    }
    return out;
  }, [rare, prizes, prizesOn, lang, t]);

  const daily = prizes.filter((p) => p.draw === "daily");

  /*
   * How often a popoto turns into nothing at all.
   *
   * The rolls are independent, so it is the product of each one missing, not
   * a hundred minus the sum — which at these sizes differs by a couple of
   * hundredths, and would be wrong by a lot if anybody ever set a prize to
   * thirty per cent. The bar is then drawn from that, with the outcomes
   * sharing what is left in proportion, so it adds to a hundred and the big
   * segment is a number somebody could check.
   */
  const live = slices.filter((s) => s.pct > 0);
  const nothing = live.reduce((n, s) => n * (1 - s.pct / 100), 1) * 100;
  const something = 100 - nothing;
  const marginal = live.reduce((n, s) => n + s.pct, 0);
  const share = (s: Slice) => (marginal > 0 ? (s.pct / marginal) * something : 0);

  if (rare === undefined) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display font-semibold">{t("prize.oddsTitle")}</span>
        <span className="text-ui text-muted">{t("prize.oddsSub")}</span>
      </div>

      {/* ── to scale, so the sliver looks like a sliver ─────────────────── */}
      <div>
        <div className="flex h-7 w-full overflow-hidden rounded-lg border border-line bg-bg">
          {live.map((s) => (
            <span key={s.key} title={`${s.label} — ${say(s.pct)}%`}
                  style={{ width: `${share(s)}%`, minWidth: 3, background: s.color }} />
          ))}
          <span className="flex flex-1 items-center justify-end bg-surface pr-2 text-meta text-muted">
            {t("prize.oddsOrdinary")} {say(nothing)}%
          </span>
        </div>
        <p className="mt-1.5 text-ui text-muted">
          {something > 0
            ? t("prize.oddsSomething", {
              pct: say(something), n: (oneIn(something) ?? 0).toLocaleString() })
            : t("prize.oddsNothing")}
        </p>
      </div>

      {/* ── and the same thing with the sliver filling the bar ──────────── */}
      {live.length > 0 && (
        <div>
          <div className="mb-1 text-ui text-muted">{t("prize.oddsOfThose")}</div>
          <div className="flex h-9 w-full overflow-hidden rounded-lg border border-line">
            {live.map((s) => {
              const w = (s.pct / marginal) * 100;
              return (
                <span key={s.key} title={`${s.label} — ${say(s.pct)}%`}
                      className="flex items-center justify-center overflow-hidden text-meta font-semibold"
                      style={{ width: `${w}%`, minWidth: 3, background: s.color,
                               color: inkOn(s.color) }}>
                  {w >= 9 && `${Math.round(w)}%`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── the legend, which is where the real numbers are ─────────────── */}
      <ul className="flex flex-col gap-1">
        {slices.map((s) => (
          <li key={s.key} className={`flex flex-wrap items-center gap-2 text-ui ${
            s.off ? "opacity-50" : ""}`}>
            <span className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="text-ink">{s.label}</span>
            <span className="text-muted">· {s.who}</span>
            <span className="ml-auto flex items-center gap-2">
              {s.off ? (
                <span className="text-gold">
                  {t("prize.oddsPaused", { pct: say(s.ifOn) })}
                </span>
              ) : (
                <>
                  <span className="font-data text-ink">{say(s.pct)}%</span>
                  {oneIn(s.pct) != null && (
                    <span className="text-muted">
                      {t("adm.prizeChanceMeans", { n: (oneIn(s.pct) ?? 0).toLocaleString() })}
                    </span>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Drawn once a day rather than once a popoto, so they are named here
          rather than given a slice of a bar that is about one popoto. */}
      {daily.length > 0 && (
        <p className="text-ui leading-relaxed text-muted">
          {t("prize.oddsDaily", {
            list: daily.map((p) => `${(lang === "en" ? p.nameEn : null) || p.name}`
              + ` ${say(p.chance)}%`).join(" · "),
          })}
        </p>
      )}

      {rare === null && (
        <p className="text-ui leading-relaxed text-gold">{t("prize.oddsNoRare")}</p>
      )}
    </section>
  );
}
