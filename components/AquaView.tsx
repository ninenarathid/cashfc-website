"use client";

import type React from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip,
  XAxis, YAxis, type BarShapeProps, type TooltipContentProps,
} from "recharts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang, type Key, type Lang } from "@/lib/i18n";
import { AQUA } from "@/components/ui/WalletToast";
import AquaControls from "@/components/aqua/AquaControls";
import AquaQueue from "@/components/aqua/AquaQueue";
import AquaContacts, { type ContactPerson } from "@/components/aqua/AquaContacts";
import ContestDesk from "@/components/contest/ContestDesk";
import { fmtGil } from "@/lib/wallet";
import { EVENT_FROM, EVENT_OPENS, EVENT_SHUTS, EVENT_TO } from "@/lib/evercold";
import {
  SIZES, gilShort, type AquaDay, type AquaRaw, type AquaSummary, type Size,
} from "@/lib/aqua";

/**
 * Aqua's page, drawn. See lib/aqua.ts for where the numbers come from.
 *
 * Laid out in the order her evening goes. First how much she owes, which is
 * the biggest thing on the page and sits beside her, because it is her gil.
 * Then who is waiting to be met, which is the only part with a person at the
 * other end of it. Then the settings that decide how much there will be, with
 * what a day will cost worked out as she types. Then the events. Then the
 * members' Discord and Facebook, which she types in by hand and which wait
 * folded until she comes to do that. Then the charts, for the "why did
 * yesterday cost a million" questions.
 */

/**
 * Payment sizes, smallest to largest, as steps of the wallet's own gold.
 *
 * One hue in three lightnesses rather than three hues, because the sizes are
 * an order and not a set of names: the brightest step is the biggest money.
 * Checked as an ordinal ramp against the card (#1b212b): lightness rises
 * monotonically, the steps are far enough apart to tell, and the darkest one
 * still clears 3:1.
 */
const SIZE_COLOR: Record<Size, string> = { small: "#8f6b2c", medium: "#d9a441", large: "#f4d58c" };
const SIZE_LABEL: Record<Size, Key> = { small: "aqua.small", medium: "aqua.medium", large: "aqua.large" };
const GOLD = "#d9a441";
/** Her dress, which the top of the page is washed in. */
const GREEN = "#2e7458";
const SENDS = "#6aa9e0";
/** The card, which is also the colour of the gaps between stacked segments. */
const CARD = "#1b212b";
const GRID = "#262e3a";
const AXIS = { fill: "#8b97a8", fontSize: 11 };
const AXIS_LINE = { stroke: "#2b3441" };
const TIP: React.CSSProperties = {
  background: "#161b23", border: "1px solid #36414f", borderRadius: 10,
  color: "#e3e8ef", fontSize: 12.5, padding: "8px 11px",
  boxShadow: "0 10px 28px rgba(0,0,0,.45)",
};

const dayLong = (day: string, lang: Lang) =>
  new Date(`${day}T12:00:00+07:00`).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Bangkok",
  });

/** A day on the chart, with what its bar needs to know about itself. */
type Row = AquaDay & {
  /** The highest segment with anything in it, which is the one with the round top. */
  top: Size | null;
  bottom: Size | null;
  /** The most expensive day, which is the one bar that gets its figure written on it. */
  best: boolean;
  bestSends: boolean;
};

/**
 * One segment of a day's stacked bar.
 *
 * Drawn by hand for two things recharts will not do on its own in a stack: a
 * round top on whichever segment is highest that day, and a 2px gap in the
 * card's colour between segments, so three shades of gold that touch still
 * read as three.
 */
function segment(size: Size) {
  return function Segment(p: BarShapeProps) {
    const { x, y, width, height } = p;
    const row = p.payload as Row | undefined;
    if (!row || !(height > 0) || !(width > 0)) return <g />;
    const isTop = row.top === size;
    const y0 = y + (isTop ? 0 : 1);
    const y1 = y + height - (row.bottom === size ? 0 : 1);
    const h = y1 - y0;
    if (h < 0.5) return <g />;
    const r = isTop ? Math.min(4, width / 2, h) : 0;
    const d = r > 0
      ? `M${x},${y1} V${y0 + r} A${r},${r} 0 0 1 ${x + r},${y0} H${x + width - r}`
        + ` A${r},${r} 0 0 1 ${x + width},${y0 + r} V${y1} Z`
      : `M${x},${y1} V${y0} H${x + width} V${y1} Z`;
    return (
      <g>
        <path d={d} fill={SIZE_COLOR[size]} />
        {isTop && row.best && (
          <text x={x + width / 2} y={y0 - 7} textAnchor="middle"
                fill="#e3e8ef" fontSize={11} fontWeight={600}>
            {gilShort(row.total)}
          </text>
        )}
      </g>
    );
  };
}

const SEGMENTS: Record<Size, (p: BarShapeProps) => React.ReactElement> = {
  small: segment("small"), medium: segment("medium"), large: segment("large"),
};

/** A day's popoto, with the busiest day labelled. */
function SendBar(p: BarShapeProps) {
  const { x, y, width, height } = p;
  const row = p.payload as Row | undefined;
  if (!row || !(height > 0) || !(width > 0)) return <g />;
  const r = Math.min(4, width / 2, height);
  return (
    <g>
      <path fill={SENDS}
            d={`M${x},${y + height} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} H${x + width - r}`
              + ` A${r},${r} 0 0 1 ${x + width},${y + r} V${y + height} Z`} />
      {row.bestSends && (
        <text x={x + width / 2} y={y - 7} textAnchor="middle"
              fill="#e3e8ef" fontSize={11} fontWeight={600}>
          {row.sends.toLocaleString("en-US")}
        </text>
      )}
    </g>
  );
}

function Swatch({ color }: { color: string }) {
  return <i aria-hidden className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/** Her, standing on the right of the top card and out of the top of it. */
function Aqua() {
  const art = AQUA.purse;
  // Three pushes of the purse and then still. This is a page somebody sits and
  // reads numbers on, and a figure that never stops moving at the edge of the
  // eye is a figure that gets in the way of reading. `forwards` so she stops
  // on the drawing the loop ends on rather than on both at once.
  const settle: React.CSSProperties = {
    animationIterationCount: 3, animationFillMode: "forwards",
  };
  return (
    <span aria-hidden
          className="aqua-enter pointer-events-none absolute bottom-0 right-1 block h-[188px] w-[125px] sm:right-5 sm:h-[292px] sm:w-[195px]">
      <span className="aqua-lamp absolute bottom-4 left-1/2 block size-32 -translate-x-1/2 rounded-full sm:size-48"
            style={{ ...settle, animationDuration: `${art.cycle}ms`,
                     background: `radial-gradient(circle, ${GOLD}aa 0%, ${GOLD}40 42%, transparent 72%)` }} />
      <span className="absolute bottom-[3px] left-1/2 block h-[8px] w-[46%] -translate-x-1/2 rounded-[50%] bg-black/55 blur-[3px]" />
      <span className={`aqua-${art.move} absolute inset-0 block origin-bottom`} style={settle}>
        {[art.from, art.to].map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt=""
               className={`absolute inset-0 size-full select-none object-contain object-bottom aqua-${art.move}-${i === 0 ? "a" : "b"}`}
               style={{ ...settle,
                        filter: `drop-shadow(0 6px 12px rgba(0,0,0,.55)) drop-shadow(0 0 10px ${GOLD}40)` }} />
        ))}
      </span>
    </span>
  );
}

/** Where the Evercold draw stands today, in whole Bangkok days. */
function evercold(now: number): { key: Key; n?: number } {
  const opens = Date.parse(EVENT_OPENS);
  const shuts = Date.parse(EVENT_SHUTS);
  if (now < opens) return { key: "aqua.eSoon" };
  if (now > shuts) return { key: "aqua.eOver" };
  const left = Math.ceil((shuts - now) / 86_400_000);
  return left <= 1 ? { key: "aqua.eLastDay" } : { key: "aqua.eOn", n: left };
}

export default function AquaView(
  { s, raw, supabase, me, onReload, span, spans, onSpan, onRefresh, busy, failed, loadedAt, people }: {
    s: AquaSummary;
    raw: AquaRaw;
    supabase: SupabaseClient;
    me: string | null;
    /** Read everything again, after something on the page has changed it. */
    onReload: () => Promise<void>;
    span: number;
    spans: readonly number[];
    onSpan: (n: number) => void;
    onRefresh: () => void;
    busy: boolean;
    failed: string | null;
    loadedAt: Date | null;
    /** Everybody with a page, for the list of how each is reached. */
    people: ContactPerson[];
  },
) {
  const { t, lang } = useLang();

  const bestIdx = s.days.reduce((b, d, i) => (d.total > (s.days[b]?.total ?? 0) ? i : b), 0);
  const sendIdx = s.days.reduce((b, d, i) => (d.sends > (s.days[b]?.sends ?? 0) ? i : b), 0);
  const rows: Row[] = s.days.map((d, i) => {
    const has = SIZES.filter((z) => d[z] > 0);
    return {
      ...d, top: has[has.length - 1] ?? null, bottom: has[0] ?? null,
      best: i === bestIdx && d.total > 0, bestSends: i === sendIdx && d.sends > 0,
    };
  });
  const lastIdx = rows.length - 1;

  const pill = (on: boolean) =>
    `rounded-lg border px-2.5 py-1 text-ui transition-colors ${
      on ? "border-gold bg-gold/15 text-gold"
         : "border-line text-muted hover:border-muted hover:text-ink"}`;

  const gilTip = ({ active, payload }: TooltipContentProps) => {
    const d = payload?.[0]?.payload as Row | undefined;
    if (!active || !d) return null;
    return (
      <div style={TIP}>
        <div className="mb-1 font-semibold">
          {dayLong(d.day, lang)}{d.today && <span className="font-normal text-muted"> · {t("aqua.todaySoFar")}</span>}
        </div>
        {[...SIZES].reverse().map((z) => (
          <div key={z} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-muted"><Swatch color={SIZE_COLOR[z]} />{t(SIZE_LABEL[z])}</span>
            <span className="tabular-nums">{fmtGil(d[z])}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-5 border-t border-line pt-1 font-semibold">
          <span>{t("aqua.tTotal")}</span><span className="tabular-nums">{fmtGil(d.total)} gil</span>
        </div>
        <div className="mt-0.5 text-meta text-muted">
          {t("aqua.tSends", { n: d.sends.toLocaleString("en-US") })}
          {d.perSend != null && <> · {t("aqua.tPerSend", { gil: fmtGil(d.perSend) })}</>}
        </div>
      </div>
    );
  };

  const sendTip = ({ active, payload }: TooltipContentProps) => {
    const d = payload?.[0]?.payload as Row | undefined;
    if (!active || !d) return null;
    return (
      <div style={TIP}>
        <div className="font-semibold">{dayLong(d.day, lang)}</div>
        <div>{t("aqua.tSends", { n: d.sends.toLocaleString("en-US") })}</div>
      </div>
    );
  };

  const owedTip = ({ active, payload }: TooltipContentProps) => {
    const d = payload?.[0]?.payload as Row | undefined;
    if (!active || !d) return null;
    return (
      <div style={TIP}>
        <div className="font-semibold">
          {dayLong(d.day, lang)}{d.today && <span className="font-normal text-muted"> · {t("aqua.todaySoFar")}</span>}
        </div>
        <div className="text-muted">{t("aqua.tOwed")}</div>
        <div className="font-semibold tabular-nums">{fmtGil(d.owedEnd)} gil</div>
      </div>
    );
  };

  const whoTip = ({ active, payload }: TooltipContentProps) => {
    const d = payload?.[0]?.payload as AquaSummary["recipients"][number] | undefined;
    if (!active || !d) return null;
    return (
      <div style={TIP}>
        <div className="font-semibold">{d.name}</div>
        <div className="tabular-nums">{fmtGil(d.gil)} gil · {t("aqua.kPaidSub", { n: d.count.toLocaleString("en-US") })}</div>
      </div>
    );
  };

  const tiles = [
    { label: t("aqua.kPaid"), value: fmtGil(s.paid),
      sub: t("aqua.kPaidSub", { n: s.payments.toLocaleString("en-US") }) },
    { label: t("aqua.kPerDay"), value: fmtGil(s.perDay), sub: t("aqua.kPerDaySub") },
    { label: t("aqua.kTop"), value: s.top ? fmtGil(s.top.gil) : "—",
      sub: s.top ? dayLong(s.top.day, lang) : "" },
    { label: t("aqua.kPerSend"), value: s.perSend != null ? fmtGil(s.perSend) : "—",
      sub: t("aqua.kPerSendSub") },
  ];

  const card = "mt-4 rounded-xl border border-line bg-card p-4 sm:p-5";
  const ever = evercold(Date.now());

  return (
    <main className="pb-10 pt-6">
      <Link href="/admin" className="text-ui text-muted no-underline hover:text-ink">
        {t("aqua.back")}
      </Link>

      {/* ── The glamour contest ──────────────────────────────────────────── */}
      {/* Hers to run as well, so the way in is here and not only on the admin
          panel. Above the gil, which has a figure standing out of its top. */}
      <ContestDesk supabase={supabase} />

      {/* ── How much, right now ──────────────────────────────────────────── */}
      <section className="relative mt-14 sm:mt-20">
        <div className="rounded-2xl p-[1.5px]"
             style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD}40 38%, ${GREEN} 100%)` }}>
          <div className="relative overflow-hidden rounded-[15px] py-5 pl-5 pr-[132px] sm:py-7 sm:pl-7 sm:pr-[236px]"
               style={{ background: `linear-gradient(155deg,`
                 + ` color-mix(in oklab, ${GREEN} 30%, var(--color-surface)) 0%,`
                 + ` color-mix(in oklab, ${GREEN} 12%, var(--color-surface)) 55%,`
                 + ` color-mix(in oklab, ${GOLD} 12%, var(--color-surface)) 100%)` }}>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-2/3"
                  style={{ background: `radial-gradient(circle at 85% 70%, ${GOLD}33 0%, transparent 60%)` }} />
            <div className="relative">
              <div className="font-data text-meta uppercase tracking-[0.22em] text-gold">
                {t("aqua.eyebrow")}
              </div>
              <h1 className="mt-1.5 font-display text-lead font-semibold text-ink">
                {t("aqua.owedTitle")}
              </h1>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="font-data text-[34px] font-bold leading-tight text-gold sm:text-[56px]">
                  {fmtGil(s.owed.total)}
                </span>
                <span className="font-data text-title font-semibold text-gold/80 sm:text-head">gil</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-ui text-ink/90 sm:text-read">
                <span className="flex items-start gap-2">
                  <Swatch color={GOLD} />
                  <span className="-mt-0.5">{t("aqua.inWallets", { gil: fmtGil(s.owed.inWallets), n: s.owed.holders })}</span>
                </span>
                <span className="flex items-start gap-2">
                  <Swatch color="#4fb8a8" />
                  <span className="-mt-0.5">{t("aqua.waiting", { gil: fmtGil(s.owed.waitingGil), n: s.owed.waiting })}</span>
                </span>
                {s.owed.items > 0 && (
                  <span className="flex items-start gap-2">
                    <Swatch color="#c98a5b" />
                    <span className="-mt-0.5">
                      {t("aqua.items", { n: s.owed.items, gil: fmtGil(s.owed.itemsGil) })}
                      {s.owed.itemsUnpriced > 0 && (
                        <span className="text-muted"> · {t("aqua.itemsUnpriced", { n: s.owed.itemsUnpriced })}</span>
                      )}
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-line-lit bg-bg/40 px-2.5 py-0.5 text-meta text-ink">
                  {t("aqua.today", { gil: fmtGil(s.today) })}
                </span>
                {s.owed.ready > 0 && (
                  <span className="rounded-full border px-2.5 py-0.5 text-meta text-gold"
                        style={{ borderColor: `${GOLD}80`, background: `${GOLD}1f` }}>
                    {t("aqua.ready", { n: s.owed.ready, gil: fmtGil(s.owed.readyGil) })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <Aqua />
      </section>

      {/* ── Who is waiting, and whose wallet is about to be ─────────────── */}
      {/* Straight under the total, because it is the one part of the page with
          somebody at the other end of it, waiting on her. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AquaQueue supabase={supabase} me={me} groups={s.groups} count={s.queue.length}
                   unclaimed={s.unclaimed} names={raw.names} onChanged={onReload} />
        <section className="rounded-xl border border-line bg-card p-4 sm:p-5">
          <h2 className="font-display text-title font-semibold">{t("aqua.pTitle")}</h2>
          <p className="mt-0.5 text-meta text-muted">{t("aqua.pNote")}</p>
          {s.purses.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-line p-6 text-center text-ui text-muted">
              {t("aqua.pEmpty")}
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-2.5">
              {s.purses.map((w, i) => {
                const bar = raw.purse?.threshold ?? 0;
                const pct = bar > 0 ? Math.min(100, (w.balance / bar) * 100) : 0;
                return (
                  <li key={`${i}-${w.name}`}>
                    <div className="flex items-baseline gap-2 text-ui">
                      <span className="min-w-0 truncate text-ink">{w.name}</span>
                      {w.ready && (
                        <span className="rounded bg-gold/15 px-1.5 text-label font-semibold text-gold">
                          {t("aqua.pReady")}
                        </span>
                      )}
                      <span className="ml-auto tabular-nums text-ink">{fmtGil(w.balance)}</span>
                    </div>
                    {bar > 0 && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/60">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── What decides how much there will be ──────────────────────────── */}
      {/* Keyed on the wallet's settings so the bar box shows what was saved,
          whichever page it was saved from, rather than what was typed before. */}
      <AquaControls key={`${raw.purse?.on}-${raw.purse?.threshold}`}
                    supabase={supabase} cupboard={raw.cupboard} master={raw.master}
                    purse={raw.purse} rolls={s.rolls} actualPerDay={s.recentPerDay}
                    onSaved={onReload} />

      {/* ── Events ───────────────────────────────────────────────────────── */}
      <section className={card}>
        <h2 className="font-display text-title font-semibold">{t("aqua.eTitle")}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-bg/40 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-read font-semibold text-ink">Popoto: Road to Evercold</div>
            <div className="text-meta text-muted">
              {dayLong(EVENT_FROM, lang)} – {dayLong(EVENT_TO, lang)}
              {" · "}
              <span className={ever.key === "aqua.eOver" ? "font-semibold text-gold" : ""}>
                {t(ever.key, { n: ever.n ?? 0, date: dayLong(EVENT_FROM, lang) })}
              </span>
            </div>
          </div>
          <Link href="/admin#popoto" className="text-ui text-accent no-underline hover:underline">
            {t("aqua.eEntries")}
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-ui">
          <Link href="/admin#anns" className="text-accent no-underline hover:underline">{t("aqua.eAnns")}</Link>
          <Link href="/admin#prizes" className="text-accent no-underline hover:underline">{t("aqua.fullEditor")}</Link>
        </div>
      </section>

      {/* ── How each member is reached ───────────────────────────────────── */}
      {/* Hers to type in, so it is on her page. Under the things with a date
          or a person waiting on them, above the things that are only read. */}
      <AquaContacts people={people} className={card} />

      {/* ── Which days ───────────────────────────────────────────────────── */}
      <h2 className="mt-8 font-display text-head font-semibold">{t("aqua.statsTitle")}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {spans.map((n) => (
          <button key={n} type="button" onClick={() => onSpan(n)}
                  aria-pressed={n === span} className={pill(n === span)}>
            {t("adm.pcDays", { n })}
          </button>
        ))}
        <button type="button" onClick={onRefresh}
                className="rounded-lg border border-line px-2.5 py-1 text-ui text-muted hover:border-muted hover:text-ink">
          {t("adm.pcRefresh")}
        </button>
        <span className="text-meta text-muted">
          {busy ? t("adm.pcLoading")
            : loadedAt ? t("aqua.updated", {
              time: loadedAt.toLocaleTimeString(lang === "th" ? "th-TH" : "en-GB",
                { hour: "2-digit", minute: "2-digit" }) }) : null}
        </span>
      </div>
      {failed && (
        <div className="mt-3 rounded-lg border border-chili/40 bg-chili/10 p-3 text-ui text-chili">
          {t("adm.pcFailed", { why: failed })}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-xl border border-line bg-card p-3.5">
            <div className="text-meta text-muted">{x.label}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-data text-2xl font-bold leading-none text-ink">{x.value}</span>
              {x.value !== "—" && <span className="text-meta text-muted">gil</span>}
            </div>
            <div className="mt-1.5 text-meta text-muted">{x.sub}</div>
          </div>
        ))}
      </div>

      {/* ── What was paid, and what it was paid on ───────────────────────── */}
      <section className={card}>
        <h2 className="font-display text-title font-semibold">{t("aqua.cPaid")}</h2>
        <p className="mt-0.5 max-w-prose text-meta leading-relaxed text-muted">{t("aqua.cPaidNote")}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted">
          {[...SIZES].reverse().map((z) => (
            <span key={z} className="inline-flex items-center gap-1.5">
              <Swatch color={SIZE_COLOR[z]} />{t(SIZE_LABEL[z])}
            </span>
          ))}
        </div>
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} axisLine={AXIS_LINE} tickLine={false} />
              <YAxis tickFormatter={gilShort} width={44} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#e3e8ef0d" }} content={gilTip} />
              {SIZES.map((z) => (
                <Bar key={z} dataKey={z} stackId="gil" fill={SIZE_COLOR[z]} maxBarSize={24}
                     shape={SEGMENTS[z]} name={t(SIZE_LABEL[z])} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h3 className="mt-6 font-display text-read font-semibold">{t("aqua.cSends")}</h3>
        <p className="mt-0.5 max-w-prose text-meta leading-relaxed text-muted">{t("aqua.cSendsNote")}</p>
        <div className="mt-2 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} axisLine={AXIS_LINE} tickLine={false} />
              <YAxis tickFormatter={gilShort} width={44} tick={AXIS} axisLine={false} tickLine={false}
                     allowDecimals={false} />
              <Tooltip cursor={{ fill: "#e3e8ef0d" }} content={sendTip} />
              <Bar dataKey="sends" fill={SENDS} maxBarSize={24} shape={SendBar} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── And what is still owed, day by day ───────────────────────────── */}
      <section className={card}>
        <h2 className="font-display text-title font-semibold">{t("aqua.cOwed")}</h2>
        <p className="mt-0.5 max-w-prose text-meta leading-relaxed text-muted">{t("aqua.cOwedNote")}</p>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 26, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} axisLine={AXIS_LINE} tickLine={false} />
              <YAxis tickFormatter={gilShort} width={44} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ stroke: "#4a586b" }} content={owedTip} />
              <Area type="monotone" dataKey="owedEnd" stroke={GOLD} strokeWidth={2}
                    fill={GOLD} fillOpacity={0.1} isAnimationActive={false}
                    activeDot={{ r: 5, fill: GOLD, stroke: CARD, strokeWidth: 2 }}
                    dot={(p: { cx?: number; cy?: number; index?: number }) => (
                      p.index === lastIdx && p.cx != null && p.cy != null ? (
                        <g key={`end-${p.index}`}>
                          <circle cx={p.cx} cy={p.cy} r={4.5} fill={GOLD} stroke={CARD} strokeWidth={2} />
                          <text x={p.cx - 8} y={p.cy - 11} textAnchor="end"
                                fill="#e3e8ef" fontSize={11.5} fontWeight={600}>
                            {fmtGil(rows[lastIdx].owedEnd)}
                          </text>
                        </g>
                      ) : <g key={`dot-${p.index}`} />
                    )} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Who, and from what ───────────────────────────────────────────── */}
      <div className="grid gap-x-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="font-display text-title font-semibold">{t("aqua.lWho")}</h2>
          <p className="mt-0.5 text-meta text-muted">{t("aqua.lWhoNote")}</p>
          {s.recipients.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-line p-6 text-center text-ui text-muted">
              {t("aqua.noData")}
            </div>
          ) : (
            <div className="mt-2" style={{ height: Math.max(150, s.recipients.length * 30) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.recipients} layout="vertical" margin={{ left: 0, right: 76, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={116}
                         tick={{ fill: "#c9d1dc", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#e3e8ef0d" }} content={whoTip} />
                  <Bar dataKey="gil" fill={GOLD} maxBarSize={16} radius={[0, 4, 4, 0]}
                       isAnimationActive={false}>
                    <LabelList dataKey="gil" position="right" fill="#c9d1dc" fontSize={11}
                               formatter={(v) => fmtGil(Number(v))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className={card}>
          <h2 className="font-display text-title font-semibold">{t("aqua.lPrize")}</h2>
          <p className="mt-0.5 text-meta text-muted">{t("aqua.lWhoNote")}</p>
          {s.byPrize.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-line p-6 text-center text-ui text-muted">
              {t("aqua.noData")}
            </div>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[340px] text-ui">
                <thead>
                  <tr className="text-left text-meta text-muted">
                    <th className="py-1.5 pr-2 font-normal">{t("aqua.colPrize")}</th>
                    <th className="py-1.5 pr-2 text-right font-normal">{t("aqua.colTimes")}</th>
                    <th className="py-1.5 pr-3 text-right font-normal">{t("aqua.colGil")}</th>
                    <th className="w-[32%] py-1.5 font-normal">{t("aqua.colShare")}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byPrize.map((p) => {
                    const pct = Math.round(p.share * 1000) / 10;
                    return (
                      <tr key={p.name} className="border-t border-line/60">
                        <td className="py-2 pr-2 text-ink">{p.name}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted">{p.count.toLocaleString("en-US")}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink">{fmtGil(p.gil)}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: GOLD }} />
                            </div>
                            <span className="w-11 text-right text-meta tabular-nums text-muted">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Every number, for reading rather than looking at ─────────────── */}
      <details className={card}>
        <summary className="cursor-pointer font-display text-title font-semibold">
          {t("aqua.tableTitle")}
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-ui tabular-nums">
            <thead>
              <tr className="text-left text-meta text-muted">
                <th className="py-1.5 pr-3 font-normal">{t("aqua.colDay")}</th>
                <th className="py-1.5 pr-3 text-right font-normal">{t("aqua.colSends")}</th>
                <th className="py-1.5 pr-3 text-right font-normal">{t("aqua.colPayments")}</th>
                <th className="py-1.5 pr-3 text-right font-normal">{t("aqua.colPaid")}</th>
                <th className="py-1.5 pr-3 text-right font-normal">{t("aqua.colPerSend")}</th>
                <th className="py-1.5 text-right font-normal">{t("aqua.colOwed")}</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((d) => (
                <tr key={d.day} className="border-t border-line/60">
                  <td className="py-1.5 pr-3 text-ink">
                    {dayLong(d.day, lang)}{d.today && <span className="text-muted"> · {t("aqua.todaySoFar")}</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-right">{d.sends.toLocaleString("en-US")}</td>
                  <td className="py-1.5 pr-3 text-right">{d.count.toLocaleString("en-US")}</td>
                  <td className="py-1.5 pr-3 text-right text-ink">{fmtGil(d.total)}</td>
                  <td className="py-1.5 pr-3 text-right text-muted">{d.perSend != null ? fmtGil(d.perSend) : "—"}</td>
                  <td className="py-1.5 text-right">{fmtGil(d.owedEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </main>
  );
}
