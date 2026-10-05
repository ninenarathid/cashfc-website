"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { PriceTold } from "@/lib/town/market";
import { roundStart } from "@/lib/town/trade";
import TownIcon from "./TownIcon";

/**
 * The relatives' price for a thing, where things are left to be sold (the owner, 2026-10-05: "ช่วยทำให้กราฟราคาด้วย ตอน
 * ฝากขาย"): what one fetches this round, how far that is from its usual price, and the last seven days as a small line;
 * and, opened, the same days as a graph, with how many the whole village left in each round under it.
 *
 * It shows what is and says nothing of why (the panels' own rule: lib/town/market has the rule, and it is the
 * players' to find). The graph's frame is the lowest and the highest the price is ever, so where the line stands in
 * it can be read without a word.
 *
 * Two plots, one under the other, share the rounds along the bottom: coins and things are not one scale. Every
 * number on them is in the table beneath too.
 */

/** The price line's colour: the site's accent a step down, which on a panel's surface is inside the band a mark wants (the chart skill's validator: lightness, chroma, 3:1). */
const LINE = "#5a9ad8";
/** What one of a thing fetches at a price, in coins: to the hundredth. */
const eachOf = (id: ItemId, f: number) => Math.round(ITEMS[id].pays * f) / 100;
/** A round as it is called: its day by Bangkok's clock, and which of the two it is. */
function roundName(round: number, th: boolean): string {
  const day = new Intl.DateTimeFormat(th ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(new Date(roundStart(round)));
  const late = ((round % 2) + 2) % 2 === 1;
  return `${day} ${late ? (th ? "ค่ำ" : "evening") : (th ? "เช้า" : "morning")}`;
}

/** How far a price is from the usual one: an arrow and so many hundredths. Nothing at the usual price. */
export function Delta({ f, th }: { f: number; th: boolean }) {
  const d = f - 100;
  if (!d) return null;
  return (
    <span className={`flex shrink-0 items-center gap-0.5 font-data text-meta tabular-nums ${d > 0 ? "text-jade" : "text-copper"}`} data-price-delta={d}>
      <span aria-hidden>{d > 0 ? "▲" : "▼"}</span>{Math.abs(d)}%
      <span className="sr-only"> {d > 0 ? (th ? "สูงกว่าราคาปกติ" : "over the usual price") : (th ? "ต่ำกว่าราคาปกติ" : "under the usual price")}</span>
    </span>
  );
}

/** The frame a thing's price is drawn in: the lowest and the highest it is ever (and anything it has been outside them, when the numbers were other ones). */
function frameOf(told: PriceTold): { lo: number; hi: number } {
  const all = [told.f, ...told.was.map(([, f]) => f)];
  return { lo: Math.min(told.floor, ...all), hi: Math.max(told.ceil, ...all) };
}

/** The last seven days of a price as a line a row has room for; the round we are in is the dot at its end. */
function Spark({ told }: { told: PriceTold }) {
  const W = 52, H = 18, { lo, hi } = frameOf(told), fs = [...told.was.map(([, f]) => f), told.f];
  const x = (i: number) => (fs.length > 1 ? 2 + (i * (W - 6)) / (fs.length - 1) : W - 4), y = (f: number) => 2 + ((hi - f) / (hi - lo)) * (H - 4);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <line x1={0} x2={W} y1={y(100)} y2={y(100)} stroke="var(--color-line)" strokeWidth={1} />
      {fs.length > 1 && <polyline points={fs.map((f, i) => `${x(i).toFixed(1)},${y(f).toFixed(1)}`).join(" ")} fill="none" stroke="var(--color-muted)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={x(fs.length - 1)} cy={y(told.f)} r={2.5} fill={LINE} />
    </svg>
  );
}

/** A thing's price this round, in a row of the bag: what one fetches, how far that is from usual, and the small line, which opens the graph. */
export function PriceNow({ id, told, th, open, onToggle }: { id: ItemId; told: PriceTold; th: boolean; open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-meta text-muted" data-price={id} data-price-f={told.f}>
      <span>{th ? "ได้ชิ้นละ" : "Fetches"}</span>
      <span className="flex shrink-0 items-center gap-1 font-data tabular-nums text-gold"><TownIcon name="coin" size={13} />{eachOf(id, told.f)}</span>
      {!th && <span>each</span>}
      <Delta f={told.f} th={th} />
      <button type="button" aria-expanded={open} onClick={onToggle} data-price-graph={id}
              className={`pressable -my-1 flex min-h-8 items-center gap-1 rounded-lg px-1.5 hover:bg-line/40 ${open ? "bg-line/40" : ""}`}>
        <Spark told={told} />
        <span aria-hidden className="text-label text-muted">{open ? "▴" : "▾"}</span>
        <span className="sr-only">{th ? "กราฟราคา 7 วัน" : "The price over seven days"}</span>
      </button>
    </div>
  );
}

/** The graph's own measures: the gutters its numbers stand in, how far in from them the first and the last round stand (half a bar, so no bar is over a number), and how tall each plot is. */
const W = 340, L = 34, R = 40, IN = 12, TOP = 8, PRICE_H = 104, GAP = 26, SOLD_H = 40, AXIS = 16;

/** Seven days of a thing's price, and of how many the village left to be sold: the graph a row opens. */
export function PriceGraph({ id, told, round, th }: { id: ItemId; told: PriceTold; round: number; th: boolean }) {
  // every round gone by that was told, then the one we are in (what the village has left in it so far is not told)
  const pts: Array<{ round: number; f: number; sold: number | null }> = [...told.was.map(([r, f, sold]) => ({ round: r, f, sold })), { round, f: told.f, sold: null }];
  const [at, setAt] = useState<number | null>(null);
  const n = pts.length, last = n - 1, { lo, hi } = frameOf(told);
  const step = n > 1 ? (W - L - R - 2 * IN) / (n - 1) : 0;
  const x = (i: number) => (n > 1 ? L + IN + i * step : (L + W - R) / 2), y = (f: number) => TOP + ((hi - f) / (hi - lo)) * PRICE_H;
  const soldTop = TOP + PRICE_H + GAP, base = soldTop + SOLD_H, most = Math.max(1, ...pts.map((p) => p.sold ?? 0));
  const bar = Math.max(2, Math.min(24, step - 2)), tall = (sold: number) => (sold / most) * SOLD_H;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.f).toFixed(1)}`).join(" ");
  // the frame's own lines: the highest, the usual, the lowest (one that would sit on the usual one's number is left unnamed)
  const marks = [...new Set([hi, 100, lo])], named = (f: number) => f === 100 || Math.abs(y(f) - y(100)) >= 15;
  const shown = at ?? last, p = pts[shown];

  const find = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect(), sx = ((e.clientX - box.left) * W) / box.width;
    setAt(n > 1 ? Math.max(0, Math.min(last, Math.round((sx - L - IN) / step))) : 0);
  };
  const keyed = (e: KeyboardEvent<HTMLDivElement>) => {
    const by = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!by) return;
    e.preventDefault();
    setAt(Math.max(0, Math.min(last, (at ?? last) + by)));
  };

  return (
    <div className="mt-2 border-t border-line pt-2" data-price-graph-of={id}>
      {/* the readout: the round under the pointer (or the arrow keys), and otherwise the round we are in */}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-muted" aria-live="polite" data-price-readout={p.round}>
        <span className="text-ink">{shown === last ? (th ? "รอบนี้" : "This round") : roundName(p.round, th)}</span>
        <span className="flex items-center gap-1"><span aria-hidden className="inline-block h-0.5 w-3 rounded-full" style={{ background: LINE }} />
          <span className="flex items-center gap-1 font-data font-semibold tabular-nums text-ink"><TownIcon name="coin" size={13} />{eachOf(id, p.f)}</span></span>
        <Delta f={p.f} th={th} />
        {p.sold !== null && <span className="flex items-center gap-1"><span aria-hidden className="inline-block h-2.5 w-1.5 rounded-t-sm bg-line-strong" />
          <span className="font-data font-semibold tabular-nums text-ink">{p.sold}</span> {th ? "ชิ้นทั้งหมู่บ้าน" : "left by the village"}</span>}
      </p>

      <div tabIndex={0} role="group" onKeyDown={keyed} onBlur={() => setAt(null)}
           aria-label={th ? `กราฟราคา ${ITEMS[id].name.th} 7 วันที่ผ่านมา ใช้ลูกศรซ้ายขวาเพื่อดูทีละรอบ` : `The price of ${ITEMS[id].name.en.toLowerCase()} over seven days. Arrow keys step through the rounds.`}
           className="mt-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <svg viewBox={`0 0 ${W} ${base + AXIS}`} className="block w-full select-none" role="img" aria-hidden>
          {/* the price's frame */}
          {marks.map((f) => (
            <g key={f}>
              <line x1={L} x2={W - R} y1={y(f)} y2={y(f)} stroke={f === 100 ? "var(--color-line-lit)" : "var(--color-line)"} strokeWidth={1} />
              {named(f) && <text x={L - 6} y={y(f) + 3.5} textAnchor="end" fontSize={10} className={`font-data ${f === 100 ? "fill-ink" : "fill-muted"}`}>{eachOf(id, f)}</text>}
              {f === 100 && <text x={L - 6} y={y(f) + 13} textAnchor="end" fontSize={8.5} className="fill-muted">{th ? "ปกติ" : "usual"}</text>}
            </g>
          ))}
          {n > 1 && <path d={`${line} L${x(last).toFixed(1)} ${TOP + PRICE_H} L${x(0).toFixed(1)} ${TOP + PRICE_H} Z`} fill={LINE} opacity={0.1} />}
          {n > 1 && <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {/* the round we are in: the end of the line, with what it comes to beside it */}
          <circle cx={x(last)} cy={y(told.f)} r={4} fill={LINE} stroke="var(--color-card)" strokeWidth={2} />
          <text x={x(last) + 8} y={y(told.f) + 3.5} fontSize={10.5} className="fill-ink font-data font-semibold">{eachOf(id, told.f)}</text>

          {/* how many the village left, round by round */}
          <text x={L} y={soldTop - 7} fontSize={9.5} className="fill-muted">{th ? "ทั้งหมู่บ้านฝากขาย (ชิ้น)" : "Left by the village (things)"}</text>
          <text x={L - 6} y={soldTop + 7} textAnchor="end" fontSize={10} className="fill-muted font-data">{most}</text>
          <text x={L - 6} y={base + 3} textAnchor="end" fontSize={10} className="fill-muted font-data">0</text>
          <line x1={L} x2={W - R} y1={base} y2={base} stroke="var(--color-line-lit)" strokeWidth={1} />
          {pts.map((q, i) => {
            if (!q.sold) return null;
            const h = Math.max(2, tall(q.sold)), r = Math.min(4, h, bar / 2), x0 = x(i) - bar / 2, y0 = base - h;
            // (a rounded top, square at the baseline)
            return <path key={q.round} d={`M${x0} ${base} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} H${x0 + bar - r} Q${x0 + bar} ${y0} ${x0 + bar} ${y0 + r} V${base} Z`}
                         fill={i === at ? "var(--color-muted)" : "var(--color-line-strong)"} />;
          })}

          {/* the rounds along the bottom: where the days begin, and where they end */}
          {n > 1 && <text x={x(0)} y={base + AXIS - 3} fontSize={9.5} className="fill-muted">{roundName(pts[0].round, th)}</text>}
          <text x={x(last)} y={base + AXIS - 3} textAnchor={n > 1 ? "end" : "middle"} fontSize={9.5} className="fill-muted">{th ? "รอบนี้" : "now"}</text>

          {/* the round pointed at */}
          {at !== null && <>
            <line x1={x(at)} x2={x(at)} y1={TOP} y2={base} stroke="var(--color-line-strong)" strokeWidth={1} />
            <circle cx={x(at)} cy={y(pts[at].f)} r={4} fill={LINE} stroke="var(--color-card)" strokeWidth={2} />
          </>}
          <rect x={0} y={0} width={W} height={base + AXIS} fill="transparent" style={{ touchAction: "pan-y" }}
                onPointerMove={find} onPointerDown={find} onPointerLeave={(e) => { if (e.pointerType === "mouse") setAt(null); }} />
        </svg>
      </div>

      <details className="mt-1 text-meta text-muted">
        <summary className="cursor-pointer select-none py-1">{th ? "ดูเป็นตาราง" : "As a table"}</summary>
        <table className="mt-1 w-full border-collapse font-data tabular-nums">
          <thead>
            <tr className="border-b border-line text-left text-label uppercase tracking-wider">
              <th scope="col" className="py-1 pr-2 font-normal">{th ? "รอบ" : "Round"}</th>
              <th scope="col" className="py-1 pr-2 text-right font-normal">{th ? "ชิ้นละ" : "Each"}</th>
              <th scope="col" className="py-1 pr-2 text-right font-normal">{th ? "เทียบปกติ" : "Of usual"}</th>
              <th scope="col" className="py-1 text-right font-normal">{th ? "หมู่บ้านฝาก" : "Left"}</th>
            </tr>
          </thead>
          <tbody>
            {[...pts].reverse().map((q, i) => (
              <tr key={q.round} className="border-b border-line/50">
                <th scope="row" className="py-1 pr-2 text-left font-normal text-ink">{i === 0 ? (th ? "รอบนี้" : "This round") : roundName(q.round, th)}</th>
                <td className="py-1 pr-2 text-right text-ink">{eachOf(id, q.f)}</td>
                <td className="py-1 pr-2 text-right">{q.f}%</td>
                <td className="py-1 text-right">{q.sold ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
