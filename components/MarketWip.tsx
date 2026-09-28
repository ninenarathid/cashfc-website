"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/lib/admin";
import { useLang, type Key } from "@/lib/i18n";
import { fmtGil } from "@/lib/wallet";
import {
  DEFAULT_PEG, DEFAULT_POPOTO_GIL, DEFAULT_SPREAD_PCT, LATEST_POTS, PEG_WORLD,
  board, fetchPotPrices, pegPrice, type PegSource, type PotKey,
} from "@/lib/market";

/**
 * Popoto Market, while it is being built.
 *
 * Admins only, and marked unfinished on its tab, the same arrangement the
 * guides had while they were being written. What is here now is the price
 * board worked out from today's real potion prices, so the settings can be
 * tried with real numbers before anything is built on them, and the list of
 * what has been decided so far.
 */

const GOLD = "#d9a441";

/** Popoto per HQ, as the board prints it: to a tenth, and rounded the house's way. */
const up = (n: number) => (Math.ceil(n * 10) / 10).toFixed(1);
const down = (n: number) => (Math.floor(n * 10) / 10).toFixed(1);

const DECIDED: Key[] = [
  "market.d1", "market.d2", "market.d3", "market.d4",
  "market.d5", "market.d6", "market.d7", "market.d8",
];
const PHASES: { key: Key; next: boolean }[] = [
  { key: "market.p1", next: true },
  { key: "market.p2", next: false },
  { key: "market.p3", next: false },
  { key: "market.p4", next: false },
];

function PegPreview() {
  const { t } = useLang();
  const [prices, setPrices] = useState<Partial<Record<PotKey, number>> | null>(null);
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState<PegSource>(DEFAULT_PEG);
  const [popotoGil, setPopotoGil] = useState(DEFAULT_POPOTO_GIL);
  const [spread, setSpread] = useState(DEFAULT_SPREAD_PCT);

  useEffect(() => {
    let live = true;
    fetchPotPrices()
      .then((p) => { if (live) setPrices(p); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const price = prices ? pegPrice(prices, source) : null;
  const b = useMemo(
    () => (price != null ? board(price, popotoGil, spread) : null),
    [price, popotoGil, spread]);

  const choice = (on: boolean) =>
    `rounded-lg border px-2.5 py-1 text-ui transition-colors ${
      on ? "border-gold bg-gold/15 text-gold"
         : "border-line text-muted hover:border-muted hover:text-ink"}`;

  return (
    <section className="mt-5 rounded-xl border border-line bg-card p-4 sm:p-5">
      <h2 className="font-display text-title font-semibold">{t("market.boardTitle")}</h2>
      <p className="mt-0.5 max-w-prose text-meta leading-relaxed text-muted">{t("market.boardNote")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-ui text-muted">{t("market.follow")}</span>
        {LATEST_POTS.map((p) => (
          <button key={p.key} type="button" onClick={() => setSource(p.key)}
                  aria-pressed={source === p.key} className={choice(source === p.key)}>
            {p.key}
          </button>
        ))}
        <button type="button" onClick={() => setSource("avg")}
                aria-pressed={source === "avg"} className={choice(source === "avg")}>
          {t("market.avg")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-meta text-muted">
          {t("market.popotoGil")}
          <input type="number" min={10} max={5000} step={10} value={popotoGil}
                 onChange={(e) => setPopotoGil(Number(e.target.value) || 0)}
                 className="w-36 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-read text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-meta text-muted">
          {t("market.spread")}
          <input type="number" min={0} max={60} step={1} value={spread}
                 onChange={(e) => setSpread(Number(e.target.value) || 0)}
                 className="w-36 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-read text-ink" />
        </label>
      </div>

      {failed ? (
        <div className="mt-4 rounded-lg border border-chili/40 bg-chili/10 p-3 text-ui text-chili">
          {t("market.pricesFailed")}
        </div>
      ) : !prices ? (
        <div className="mt-4 rounded-lg border border-dashed border-line p-6 text-center text-ui text-muted">
          {t("market.loadingPrices")}
        </div>
      ) : (
        <>
          {/* The board itself, laid out the way a gold shop's is: what it
              sells at, and what it buys back at, side by side. */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { label: t("market.sell"), value: b ? up(b.sell) : "—" },
              { label: t("market.buy"), value: b ? down(b.buy) : "—" },
            ].map((x) => (
              <div key={x.label} className="rounded-xl border p-4"
                   style={{ borderColor: `${GOLD}55`,
                            background: `linear-gradient(160deg, color-mix(in oklab, ${GOLD} 10%, var(--color-card)), var(--color-card))` }}>
                <div className="text-ui text-muted">{x.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-data text-[40px] font-bold leading-none text-gold">{x.value}</span>
                  <span className="text-ui text-muted">{t("market.perHq")}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-ui text-ink">
            {t("market.pegPrice")}: <span className="font-semibold">{price != null ? `${fmtGil(price)} gil` : "—"}</span>
            <span className="text-muted"> · {source === "avg" ? t("market.avg") : `G4 ${source}`} · HQ · {PEG_WORLD}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LATEST_POTS.map((p) => {
              const on = source === p.key || source === "avg";
              return (
                <span key={p.key}
                      className={`rounded-md border px-2 py-0.5 text-meta tabular-nums ${
                        on ? "border-gold/50 text-ink" : "border-line text-muted"}`}>
                  {p.key} {prices[p.key] ? fmtGil(prices[p.key]!) : "—"}
                </span>
              );
            })}
          </div>
          {b && (
            <p className="mt-3 max-w-prose text-meta leading-relaxed text-muted">
              {t("market.breakEven", { pct: Math.round(b.breakEven * 1000) / 10 })}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default function MarketWip() {
  const { t } = useLang();
  const { isAdmin, ready } = useAdmin();
  if (!ready) return null;
  if (!isAdmin) {
    return (
      <main className="pt-7">
        <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center leading-relaxed text-muted">
          {t("market.closed")}
        </div>
      </main>
    );
  }
  return <MarketBody />;
}

/** The page itself, for whoever the gate above has let in. */
export function MarketBody() {
  const { t } = useLang();
  return (
    <main className="pb-10 pt-7">
      <div className="font-data text-meta uppercase tracking-[0.22em] text-gold">Popoto Market</div>
      <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl font-bold">
        {t("market.title")}
        <span className="rounded-md border border-gold/50 bg-gold/10 px-2 py-0.5 font-data text-meta font-bold tracking-[0.14em] text-gold">
          WIP
        </span>
      </h1>
      <p className="mt-2 max-w-prose text-read leading-relaxed text-muted">{t("market.pitch")}</p>
      <p className="mt-1 text-ui text-gold">{t("market.wipNote")}</p>

      <PegPreview />

      <section className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5">
        <h2 className="font-display text-title font-semibold">{t("market.decided")}</h2>
        <ol className="mt-3 flex flex-col gap-2.5">
          {DECIDED.map((k, i) => (
            <li key={k} className="flex gap-3 text-read leading-relaxed text-ink/90">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 font-data text-label font-bold text-gold">
                {i + 1}
              </span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5">
        <h2 className="font-display text-title font-semibold">{t("market.phases")}</h2>
        <ul className="mt-3 flex flex-col">
          {PHASES.map((p) => (
            <li key={p.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/60 py-2.5 first:border-t-0">
              <span className="text-read text-ink">{t(p.key)}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-meta font-semibold ${
                p.next ? "bg-gold/15 text-gold" : "bg-line/60 text-muted"}`}>
                {p.next ? t("market.now") : t("market.queued")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
