"use client";

import { useEffect, useRef, useState } from "react";
import { COMPANIONS, GRADES, PARTNERS, QUALITY, ROLES, coverOffsets, type CompanionId, type Grade, type Range, type Role } from "@/lib/town/quality";
import { coveringNow, qualityNow, roundStart } from "@/lib/town/quality-plant";
import type { FarmSky, Plant, Plot } from "@/lib/town/farm";
import { bedCorner, bedOf } from "@/lib/town/world";
import { ITEMS, type ItemId } from "@/lib/town/items";
import { FERTS, type Fert } from "@/lib/town/fertilisers";
import TownIcon, { type IconName } from "./TownIcon";

/*
 * The farm's Quality on the page (the design's mock screens, approved 2026-10-15): a chip that says the range of the
 * plant one stands on, and the inspector it opens (the range on a 0–100 bar tinted by the grades, each grade's chance,
 * the four bars and what covers each now, and what has narrowed the range). Rules: lib/town/quality and quality-plant.
 */

const ZONE: Record<Grade, string> = { 0: "#8a7a64", 1: "#c3ced8", 2: "#f0c060", 3: "#d2a6ff" };
const ROLE: Record<Role, { icon: IconName; th: string; en: string; light: string; dark: string }> = {
  soil: { icon: "compost", th: "ดิน", en: "Soil", light: "#e0a764", dark: "#b07a3e" },
  water: { icon: "can", th: "น้ำ", en: "Water", light: "#8ccaff", dark: "#4a9be0" },
  pollen: { icon: "pollenBrush", th: "เกสร", en: "Pollen", light: "#ffe07a", dark: "#e3b23c" },
  guard: { icon: "guardFert", th: "ป้องกัน", en: "Guard", light: "#ff9a84", dark: "#d65a48" },
};
const SOURCE: Record<string, [th: string, en: string]> = {
  watered: ["รดน้ำ", "Watered"], damp: ["ร่องดินชื้น", "Damp furrow"], rain: ["ฝน", "Rain"], cloud: ["เมฆฝน", "Rain cloud"],
  wet: ["ดินชื้น", "Wet soil"], compost: ["ปุ๋ยหมัก", "Compost"], brush: ["พู่กันเกสร", "Pollen brush"],
  pollinator: ["แมลงผสมเกสร", "Pollinator"], guard: ["กันแมลง", "Pest guard"], helper: ["พืชช่วยข้าง ๆ", "A helper beside it"],
  house: ["บ้านแมลง", "Insect house"], base: ["ปุ๋ยรองพื้น", "Base fertiliser"], top: ["ปุ๋ยแต่งหน้า", "Top dressing"],
};
const TIP: Record<Role, [th: string, en: string]> = {
  soil: ["ใส่ปุ๋ยหมักครั้งเดียวได้ครึ่งแถบทั้งต้น", "Compost once for half the bar, all its life"],
  water: ["รดน้ำวันละครั้งได้ครึ่งแถบ", "Water once a day for half the bar"],
  pollen: ["ใช้พู่กันเกสรรอบละครั้งได้ครึ่งแถบ และช่วงแคบลง", "Brush once a round for half the bar and a narrower range"],
  guard: ["ใส่ปุ๋ยกันแมลงหรือน้ำแสงจันทร์", "Use pest-proof fertiliser or moon water"],
};
const pct = (v: number) => `${((v * 100) / 101).toFixed(2)}%`;

/** The range on the grades' 0–100: the band floor to ceiling, what narrowing cut off hatched, the ends named. */
export function QualityRange({ range, base, th, odds = true }: { range: Range; base?: number; th: boolean; odds?: boolean }) {
  const { lo, hi } = range, n = hi - lo + 1;
  const chance = (g: (typeof GRADES)[number]) => Math.max(0, Math.min(hi, g.to) - Math.max(lo, g.from) + 1) / n;
  return (
    <div className="flex flex-col gap-1" data-quality-range={`${lo}-${hi}`}>
      <div className="relative h-7 rounded-[3px] bg-[#22130a] shadow-[0_0_0_2px_#1a0e06]" role="img"
           aria-label={th ? `คุณภาพ ${lo} ถึง ${hi} จาก 100` : `Quality ${lo} to ${hi} of 100`}>
        {GRADES.map((g) => <i key={g.grade} className="absolute inset-y-0 opacity-30" style={{ left: pct(g.from), width: pct(g.to - g.from + 1), background: ZONE[g.grade] }} />)}
        {base !== undefined && base < lo && <i className="absolute inset-y-1 border-y border-l border-dashed border-[#e8d8b0] bg-[repeating-linear-gradient(45deg,#e8d8b0_0_2px,transparent_2px_6px)] opacity-70" style={{ left: pct(base), width: pct(lo - base) }} />}
        <i className="absolute inset-y-px rounded-[3px] border-2 border-[#fff7df] bg-gradient-to-r from-[#c3ced8] to-[#f0c060] shadow-[0_0_0_2px_#1a0e06]" style={{ left: pct(lo), width: pct(hi - lo + 1) }} />
      </div>
      <div className="relative h-5 text-meta font-semibold text-ink">
        <span className="absolute whitespace-nowrap" style={lo < 22 ? { left: 0 } : { right: `calc(100% - ${pct(lo)})` }}>{th ? `ต่ำสุด ${lo}` : `Floor ${lo}`}</span>
        <span className="absolute whitespace-nowrap" style={hi > 75 ? { right: 0 } : { left: pct(hi + 1) }}>{th ? `สูงสุด ${hi}` : `Ceiling ${hi}`}</span>
      </div>
      {base !== undefined && base < lo && <p className="text-label text-[#ead9b4]">{th ? `ลายขีด = พื้นที่ถูกยกขึ้น ${lo - base} (เดิมต่ำสุด ${base})` : `Hatched: floor raised by ${lo - base} (was ${base})`}</p>}
      {odds && <p className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-meta text-muted" data-quality-odds>
        {GRADES.filter((g) => chance(g) > 0).map((g) => <span key={g.grade} className="inline-flex items-center gap-1">
          <i aria-hidden className="inline-block size-3 border border-[#22150a]" style={{ background: ZONE[g.grade] }} />{th ? g.th : g.en} <b className="text-ink">{Math.round(chance(g) * 100)}%</b>
        </span>)}
      </p>}
    </div>
  );
}

/** Standing on a plant: its range in a word, and the way into the inspector. */
export function QualityChip({ plant, now, rains, th, onOpen, gain }: { plant: Plant; now: number; rains: FarmSky; th: boolean; onOpen: () => void; gain?: number }) {
  const { range, grown } = qualityNow(plant, now, rains);
  return (
    <button type="button" onClick={onOpen} data-quality-chip
            className="pop-in pressable tk tk-slot pointer-events-auto flex min-h-11 items-center gap-2 px-3 text-ui text-ink" data-state="open">
      <TownIcon name={plant.crop as IconName} size={22} />
      <span className="font-semibold">{th ? "Quality" : "Quality"} <span className="font-data tabular-nums">{range.lo}–{range.hi}</span></span>
      {/* (a fertiliser in the hand: what it would add to the ceiling by ripeness, lib/town/quality-plant's fertGain) */}
      {gain !== undefined ? <span className="font-data text-meta font-semibold text-[#8fd17a]" data-quality-gain={gain}>{gain > 0 ? (th ? `ใส่แล้ว +${gain}` : `+${gain} if put on`) : th ? "ใส่แล้วไม่เพิ่ม" : "adds nothing"}</span>
        : <span className="text-meta text-muted">{grown >= 1 ? (th ? "สุกแล้ว" : "ripe") : th ? "ดูรายละเอียด" : "details"}</span>}
    </button>
  );
}

/** The plant inspector: the range, the four bars and what covers them, and what has narrowed the range. */
export function QualityInspector({ plant, now, rains, th, onClose, onBed, onChart }: { plant: Plant; now: number; rains: FarmSky; th: boolean; onClose: () => void; onBed?: () => void; onChart?: () => void }) {
  const seen = qualityNow(plant, now, rains), cover = coveringNow(plant, now, rains), close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onClose]);
  const ripe = seen.grown >= 1, base = Math.max(0, seen.range.hi - QUALITY.spread);
  const weakest = ROLES.reduce((w, r) => (seen.bars[r] < seen.bars[w] ? r : w), ROLES[0]);
  const partner = PARTNERS[plant.crop], partnerName = partner ? (partner in COMPANIONS ? COMPANIONS[partner as keyof typeof COMPANIONS][th ? "th" : "en"] : ITEMS[partner as ItemId]?.name[th ? "th" : "en"]) : null;
  const brushed = typeof plant.brushed === "number" && plant.brushed >= roundStart(plant);
  const name = ITEMS[plant.crop as ItemId]?.name[th ? "th" : "en"] ?? plant.crop;
  const left = (to: number) => (to > now + 1000 * 3_600_000 ? (th ? "ตลอดรอบ" : "all round") : th ? `อีก ${Math.max(1, Math.ceil((to - now) / 3_600_000))} ชม.` : `${Math.max(1, Math.ceil((to - now) / 3_600_000))} h left`);
  return (
    // (never taller than the room under the HUD's top plaque: on a short phone it scrolls rather than cover the clock)
    <section data-quality-inspector style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }}
             className="tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col gap-2 overflow-y-auto overscroll-contain p-3 text-ui text-ink sm:gap-2.5 sm:p-4"
             aria-label={th ? `Quality ของ${name}` : `${name}'s Quality`}>
      <header className="flex items-center gap-2">
        <TownIcon name={plant.crop as IconName} size={30} />
        <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{name}</h2>
        <span className="text-meta text-muted">{ripe ? (th ? "สุกแล้ว" : "Ripe") : th ? `โต ${Math.floor(seen.grown * 100)}%` : `${Math.floor(seen.grown * 100)}% grown`}</span>
        <button ref={close} type="button" onClick={onClose} aria-label={th ? "ปิด" : "Close"} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center"><TownIcon name="close" size={16} /></button>
      </header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <b className="font-display text-[1.5rem] leading-tight" data-quality-headline>{th ? `คุณภาพ ${seen.range.lo}–${seen.range.hi}` : `Quality ${seen.range.lo}–${seen.range.hi}`}</b>
        <span className="text-meta text-muted">{ripe ? (th ? "ช่วงล็อกแล้ว สุ่มทีละผลตอนเก็บ" : "Locked: each fruit rolled at the pick") : th ? "ถ้าดูแลแบบนี้ต่อจนสุก" : "If cared for like this until ripe"}</span>
      </div>
      <QualityRange range={seen.range} base={base} th={th} />
      <ul className="flex flex-col gap-1.5" aria-label={th ? "สี่แถบ" : "The four bars"}>
        {ROLES.map((r) => {
          const c = cover[r], v = seen.bars[r];
          const level = c?.level ?? 0;
          return <li key={r} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-x-2" data-quality-bar={r}>
            <span className="flex items-center gap-1.5"><TownIcon name={ROLE[r].icon} size={16} />{th ? ROLE[r].th : ROLE[r].en}</span>
            <span aria-hidden className="tk-bar h-3"><i style={{ width: `${(v / QUALITY.bar) * 100}%`, background: `linear-gradient(${ROLE[r].light} 0 50%, ${ROLE[r].dark} 50%)` }} /></span>
            <span className="text-right font-data text-meta font-semibold tabular-nums">{v}/{QUALITY.bar}</span>
            <span className="col-start-2 col-end-4 -mt-0.5 text-label text-[#ead9b4]">{c ? `${SOURCE[c.src ?? ""]?.[th ? 0 : 1] ?? ""} · ${level >= 1 ? (th ? "เต็มแถบ" : "whole") : level >= 0.5 ? (th ? "ครึ่งแถบ" : "half") : `${Math.round(level * 100)}%`} · ${left(c.to)}` : th ? "ยังไม่มีอะไรช่วยตอนนี้" : "Nothing covers it now"}</span>
          </li>;
        })}
      </ul>
      {!ripe && <p className="tk tk-window px-3 py-2 text-meta text-[#3b2412]" data-quality-tip>▸ {TIP[weakest][th ? 0 : 1]}</p>}
      {/* (its two fertiliser slots, lib/town/fertilisers) */}
      <div className="flex flex-wrap items-center gap-1.5 text-label" data-quality-ferts>
        {([["base", plant.base, th ? "รองพื้น" : "Base"], ["top", plant.top, th ? "แต่งหน้า" : "Top"]] as const).map(([slot, on, word]) => {
          const live = !!on && (slot === "base" ? plant.picked === 0 : (on.until ?? 0) > now);
          return <span key={slot} data-quality-fert={slot} className={`inline-flex min-h-8 items-center gap-1 rounded border-[1.5px] px-2 ${live ? "border-[#2f5a1f] bg-[#8fd17a] text-[#16300c]" : "border-[#1a0e06] bg-[#4a3522] text-ink"}`}>
            {word}: {live && on ? <><TownIcon name={on.item as IconName} size={16} />{ITEMS[on.item as ItemId]?.name[th ? "th" : "en"]}{slot === "top" ? ` · ${th ? "อีก" : ""} ${Math.max(1, Math.ceil(((on.until ?? 0) - now) / 3_600_000))} ${th ? "ชม." : "h"}` : ""}</>
              : slot === "base" ? (plant.picked === 0 ? (th ? "ว่าง · ใส่ได้รอบแรก" : "empty · first round") : th ? "หมดแล้ว" : "over") : th ? "ว่าง" : "empty"}
          </span>;
        })}
        {onChart && <button type="button" onClick={onChart} data-quality-chart-open className="pressable tk tk-btn-wood min-h-11 px-3 font-display text-meta">{th ? "ตารางปุ๋ย" : "Fertiliser chart"}</button>}
      </div>
      {onBed && <button type="button" onClick={onBed} data-quality-bed-open className="pressable tk tk-btn-wood min-h-11 px-4 font-display text-ui">{th ? "ภาพรวมแปลง: ใครช่วยต้นไหน" : "The bed: who helps which plant"}</button>}
      <div className="flex flex-col gap-1.5" data-quality-narrowing>
        <p className="text-meta font-semibold text-[#ffd27a]">{th ? `ช่วงแคบลง ${seen.narrowing} (ยกต่ำสุด รวมไม่เกิน ${QUALITY.narrowest})` : `Narrowed by ${seen.narrowing} (floor raised, ${QUALITY.narrowest} at most)`}</p>
        <div className="flex flex-wrap gap-1.5 text-label">
          {[
            { on: brushed, label: th ? "พู่กัน −10" : "Brush −10" },
            { on: !!plant.q?.bed?.p, label: partnerName ? (th ? `คู่หู ${partnerName} −10` : `Partner ${partnerName} −10`) : th ? "คู่หู −10" : "Partner −10" },
            { on: !!plant.q?.bed?.h?.some((e) => e.x && e.from <= now && now < e.to), label: th ? "แมลงหายาก −10" : "Rare insect −10" },
            { on: !!plant.top && (plant.top.until ?? 0) > now && !!(FERTS[plant.top.item] as { narrows?: true } | undefined)?.narrows, label: th ? "ห่อสามวัน −10" : "3-day packet −10" },
          ].map((n) => <span key={n.label} className={`inline-flex min-h-8 items-center gap-1 rounded border-[1.5px] px-2 ${n.on ? "border-[#2f5a1f] bg-[#8fd17a] text-[#16300c]" : "border-[#1a0e06] bg-[#4a3522] text-ink"}`}>{n.on ? "✓ " : ""}{n.label}</span>)}
        </div>
      </div>
    </section>
  );
}

/**
 * The bed at a glance (the design's "ภาพรวมแปลง"): every plant with its ceiling and a dot a bar (filled when the bar is
 * at least half); a role chosen tints each plant by that bar; the plant chosen has a line from each helper that covers
 * it, numbered, and the helpers named below.
 */
export function QualityBed({ at, plots, now, rains, th, onClose }: { at: string; plots: Readonly<Record<string, Plot>>; now: number; rains: FarmSky; th: boolean; onClose: () => void }) {
  const [x0, y0] = at.split(",").map(Number), bed = bedOf(x0, y0), [cx, cy] = bedCorner(bed);
  const [chosen, setChosen] = useState(at), [lens, setLens] = useState<Role | null>(null);
  const grid = useRef<HTMLDivElement>(null), [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onClose]);
  useEffect(() => { const g = grid.current; if (g) setBox({ w: g.offsetWidth, h: g.offsetHeight }); }, []);
  const side = 7, cells = Array.from({ length: side * side }, (_, i) => `${cx + (i % side)},${cy + Math.floor(i / side)}`);
  const rootOf = (k: string) => plots[k]?.plant?.root ?? (plots[k]?.plant ? k : null);
  const seen = new Map<string, ReturnType<typeof qualityNow>>();
  for (const k of cells) { const r = rootOf(k); if (r && !seen.has(r) && plots[r]?.plant) seen.set(r, qualityNow(plots[r].plant!, now, rains)); }
  const pick = rootOf(chosen) ?? chosen, mine = plots[pick]?.plant, myCells = mine ? mine.footprint ?? [pick] : [];
  // the helpers that reach the plant chosen, by the order of their keys
  const helpers = cells.filter((k) => rootOf(k) === k && k !== pick).flatMap((k) => {
    const h = COMPANIONS[plots[k]!.plant!.crop as CompanionId];
    if (!h) return [];
    const [hx, hy] = k.split(",").map(Number), reach = new Set(coverOffsets(h.shape, plots[k]!.plant!.rotation ?? 0).map(([u, v]) => `${hx + u},${hy + v}`));
    return myCells.some((c) => reach.has(c)) && (!lens || lens === h.role) ? [{ key: k, role: h.role, crop: plots[k]!.plant!.crop }] : [];
  });
  const centre = (k: string) => { const [x, y] = k.split(",").map(Number); return box ? { x: ((x - cx + 0.5) / side) * box.w, y: ((y - cy + 0.5) / side) * box.h } : { x: 0, y: 0 }; };
  const tint = (k: string) => { const r = rootOf(k), q = r ? seen.get(r) : null; if (!lens || !q) return undefined; const v = q.bars[lens]; return v >= 25 ? ROLE[lens].dark : v >= 12 ? `${ROLE[lens].dark}99` : "#3a2a1c"; };
  const name = (crop: string) => ITEMS[crop as ItemId]?.name[th ? "th" : "en"] ?? crop;
  const seenMine = mine ? seen.get(pick) : null;
  return (
    <section data-quality-bed className="tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col gap-2 overflow-y-auto overscroll-contain p-3 text-ui text-ink sm:p-4"
             style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }} aria-label={th ? "ภาพรวมแปลง" : "The bed at a glance"}>
      <header className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{th ? "ภาพรวมแปลง" : "The bed"}</h2>
        <button type="button" onClick={onClose} aria-label={th ? "ปิด" : "Close"} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center"><TownIcon name="close" size={16} /></button>
      </header>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={th ? "ดูทีละแถบ" : "One bar at a time"}>
        {([null, ...ROLES] as Array<Role | null>).map((r) => <button key={r ?? "all"} type="button" aria-pressed={lens === r} onClick={() => setLens(r)}
          className={`pressable tk ${lens === r ? "tk-btn" : "tk-btn-wood"} flex min-h-11 items-center gap-1 px-3 text-meta`}>{r ? <><TownIcon name={ROLE[r].icon} size={14} />{th ? ROLE[r].th : ROLE[r].en}</> : th ? "ทั้งหมด" : "All"}</button>)}
      </div>
      <p className="text-label text-[#ead9b4]">{lens ? (th ? `สีเต็ม = แถบ${ROLE[lens].th}เต็ม · จาง = ครึ่ง · มืด = ขาด` : `Solid = whole ${ROLE[lens].en.toLowerCase()} bar · faint = half · dark = none`) : th ? "จุด ซ้ายบน ดิน · ขวาบน น้ำ · ซ้ายล่าง เกสร · ขวาล่าง ป้องกัน · ทึบ = ได้ครึ่งแถบขึ้นไป · เลข = คุณภาพสูงสุด" : "Dots: top left soil · top right water · bottom left pollen · bottom right guard · solid = half a bar or more · number = ceiling"}</p>
      <div className="relative">
        <div ref={grid} className="grid gap-[3px] rounded border-2 border-[#22150a] bg-[#2c1e12] p-1" style={{ gridTemplateColumns: `repeat(${side},minmax(0,1fr))` }}>
          {cells.map((k) => {
            const r = rootOf(k), q = r ? seen.get(r) : null, p = r ? plots[r]?.plant : null, isPick = r === pick && !!r, helping = helpers.findIndex((h) => h.key === k);
            return <button key={k} type="button" onClick={() => r && setChosen(r)} data-bed-cell={k} aria-label={p ? `${name(p.crop)} ${q?.range.lo}–${q?.range.hi}` : th ? "ว่าง" : "empty"}
              className={`relative grid aspect-square min-h-0 place-items-center rounded-[3px] border-2 ${isPick ? "border-[#fff7df]" : "border-[#3a2817]"} ${r ? "pressable" : ""}`}
              style={{ background: tint(k) ?? (r ? "#5b4330" : "#3a2a1c"), opacity: pick && r && !isPick && helping < 0 && helpers.length ? 0.55 : 1 }}>
              {p && (r === k) && <TownIcon name={(ITEMS[p.crop as ItemId] ? p.crop : "mystery") as IconName} size={18} />}
              {q && r === k && !lens && <b className="absolute bottom-0.5 left-0.5 font-data text-[11px] leading-none text-[#fff7df] [text-shadow:0_1px_0_#000]">{q.range.hi}</b>}
              {q && r === k && !lens && ROLES.map((role, i) => <i key={role} aria-hidden className="absolute size-[9px] rounded-full border-[1.5px] border-[#1a0e06]"
                style={{ background: q.bars[role] >= 12 ? ROLE[role].dark : "transparent", borderColor: q.bars[role] >= 12 ? "#1a0e06" : "#f0dcb4", left: i % 2 ? undefined : 2, right: i % 2 ? 2 : undefined, top: i < 2 ? 2 : undefined, bottom: i < 2 ? undefined : 14 }} />)}
            </button>;
          })}
        </div>
        {box && <svg className="pointer-events-none absolute inset-0" width={box.w} height={box.h} aria-hidden>
          {helpers.map((h) => { const a = centre(h.key), b = centre(pick); return <g key={h.key}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1a0e06" strokeWidth={5} strokeLinecap="round" />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ROLE[h.role].light} strokeWidth={3} strokeLinecap="round" />
            <circle cx={a.x} cy={a.y} r={5} fill={ROLE[h.role].light} stroke="#1a0e06" strokeWidth={2} /></g>; })}
          {/* (each helper's number over its line's end, on a backing of its own) */}
          {helpers.map((h, i) => { const a = centre(h.key); return <g key={`n${h.key}`}>
            <circle cx={a.x} cy={a.y} r={9} fill="#f0c060" stroke="#1a0e06" strokeWidth={2} />
            <text x={a.x} y={a.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3a2209">{i + 1}</text></g>; })}
        </svg>}
      </div>
      {mine && seenMine && <div className="tk tk-slot px-3 py-2 text-meta" data-quality-bed-pick>
        <b>{name(mine.crop)} · {th ? `คุณภาพ ${seenMine.range.lo}–${seenMine.range.hi}` : `Quality ${seenMine.range.lo}–${seenMine.range.hi}`}</b><br />
        {helpers.length ? helpers.map((h, i) => `${"①②③④⑤⑥⑦⑧"[i]} ${th ? ROLE[h.role].th : ROLE[h.role].en} ← ${name(h.crop)}`).join(" · ") : th ? "ยังไม่มีพืชช่วยต้นนี้ ▸ ปลูกพืชช่วยข้าง ๆ" : "No helper reaches it yet ▸ plant one beside it"}
      </div>}
    </section>
  );
}

/**
 * The fertilisers at a glance (the design's 4×4 chart): a row and a column a bar; on the diagonal what fills that bar
 * whole, above it what fills the two by half; each with its slot (base to the first picking, top for its hours).
 */
export function FertChart({ th, onClose }: { th: boolean; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  // (a phone has no hover: the fertiliser tapped is named under the chart)
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    close.current?.focus();
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onClose]);
  const fills = (a: Role, b: Role) => (Object.entries(FERTS) as Array<[string, Fert]>).filter(([, f]) => {
    const bars = f.bars as Partial<Record<Role, number>>;
    return a === b ? bars[a] === 1 : bars[a] === 0.5 && bars[b] === 0.5;
  });
  return (
    <section data-fert-chart style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }}
             className="tk tk-plate pointer-events-auto flex w-[min(520px,calc(100vw-16px))] flex-col gap-2 overflow-y-auto overscroll-contain p-3 text-ui text-ink sm:p-4"
             aria-label={th ? "ตารางปุ๋ย" : "Fertiliser chart"}>
      <header className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{th ? "ตารางปุ๋ย" : "Fertiliser chart"}</h2>
        <button ref={close} type="button" onClick={onClose} aria-label={th ? "ปิด" : "Close"} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center"><TownIcon name="close" size={16} /></button>
      </header>
      <p className="text-meta text-muted">{th ? "ช่องทแยงเติมแถบเดียวเต็ม ช่องอื่นเติมสองแถบครึ่งหนึ่ง · ร = รองพื้น (ถึงเก็บครั้งแรก) · ต = แต่งหน้า (ตามชั่วโมง)" : "The diagonal fills one bar whole, the rest two bars by half · B = base (to the first picking) · T = top (its hours)"}</p>
      {(() => {
        const f = picked ? (FERTS as Record<string, Fert>)[picked] : null;
        if (!picked || !f) return <p className="text-meta text-muted" data-fert-picked="">{th ? "แตะที่ปุ๋ยเพื่อดูชื่อ" : "Tap a fertiliser to see its name"}</p>;
        const bars = (Object.entries(f.bars) as Array<[Role, number]>).map(([r, v]) => `${th ? ROLE[r].th : ROLE[r].en}${v < 1 ? (th ? "ครึ่ง" : " half") : th ? "เต็ม" : " whole"}`).join(" · ");
        return <p className="tk tk-window flex items-center gap-2 px-3 py-2 text-meta text-[#3b2412]" data-fert-picked={picked}>
          <TownIcon name={picked as IconName} size={24} />
          <span><b>{ITEMS[picked as ItemId]?.name[th ? "th" : "en"]}</b> · {f.slot === "base" ? (th ? "รองพื้น ถึงเก็บครั้งแรก" : "base, to the first picking") : th ? `แต่งหน้า ${f.hours} ชม.` : `top, ${f.hours} h`} · {bars}{f.narrows ? (th ? " · ยกต่ำสุด" : " · raises the floor") : ""}</span>
        </p>;
      })()}
      <div className="hidden grid-cols-[2.5rem_repeat(4,minmax(0,1fr))] gap-1 sm:grid" role="table">
        <span />
        {ROLES.map((r) => <span key={r} role="columnheader" className="flex flex-col items-center py-1 text-label text-muted"><TownIcon name={ROLE[r].icon} size={18} />{th ? ROLE[r].th : ROLE[r].en}</span>)}
        {ROLES.map((a, i) => <div key={a} role="row" className="contents">
          <span role="rowheader" className="flex items-center justify-center" title={th ? ROLE[a].th : ROLE[a].en}><TownIcon name={ROLE[a].icon} size={18} /></span>
          {ROLES.map((b, j) => {
            const here = j < i ? [] : fills(a, b);
            return <div key={b} role="cell" data-fert-cell={`${a}-${b}`} className={`flex min-h-12 min-w-0 flex-wrap content-start gap-0.5 rounded border p-1 ${j < i ? "border-transparent" : i === j ? "border-[#f0c060]/60 bg-[#4a3522]" : "border-[#1a0e06] bg-[#3a2a1a]"}`}>
              {here.map(([id, f]) => <button key={id} type="button" onClick={() => setPicked(id)} data-fert-pick={id} aria-pressed={picked === id}
                  className={`pressable inline-flex min-h-8 min-w-8 items-center justify-center rounded ${picked === id ? "bg-[#f0c060]/30 outline outline-1 outline-[#f0c060]" : ""}`}
                  title={`${ITEMS[id as ItemId]?.name[th ? "th" : "en"]} · ${f.slot === "base" ? (th ? "รองพื้น" : "base") : `${th ? "แต่งหน้า" : "top"} ${f.hours} ${th ? "ชม." : "h"}`}`}>
                <TownIcon name={id as IconName} size={20} /><sup className="font-data text-[0.6rem] text-[#ead9b4]">{f.slot === "base" ? (th ? "ร" : "B") : (th ? "ต" : "T")}</sup>
              </button>)}
            </div>;
          })}
        </div>)}
      </div>
      {/* (a phone: the same ten pairs as rows, each fertiliser a whole tap wide) */}
      <ul className="flex flex-col gap-1 sm:hidden" data-fert-list>
        {ROLES.flatMap((a, i) => ROLES.slice(i).map((b) => [a, b] as const)).map(([a, b]) => (
          <li key={`${a}-${b}`} className={`flex items-center gap-2 rounded border p-1 ${a === b ? "border-[#f0c060]/60 bg-[#4a3522]" : "border-[#1a0e06] bg-[#3a2a1a]"}`}>
            <span className="flex w-16 shrink-0 items-center gap-0.5 text-label text-muted">
              <TownIcon name={ROLE[a].icon} size={16} />{a === b ? (th ? "เต็ม" : "whole") : <><TownIcon name={ROLE[b].icon} size={16} />{th ? "ครึ่ง" : "half"}</>}
            </span>
            <span className="flex min-w-0 flex-wrap gap-1">
              {fills(a, b).map(([id, f]) => <button key={id} type="button" onClick={() => setPicked(id)} data-fert-pick={id} aria-pressed={picked === id} aria-label={ITEMS[id as ItemId]?.name[th ? "th" : "en"]}
                  className={`pressable relative grid size-11 place-items-center rounded ${picked === id ? "bg-[#f0c060]/30 outline outline-1 outline-[#f0c060]" : "bg-black/10"}`}>
                <TownIcon name={id as IconName} size={26} /><span className="absolute bottom-0 right-0.5 font-data text-[0.6rem] text-[#ead9b4]">{f.slot === "base" ? (th ? "ร" : "B") : (th ? "ต" : "T")}</span>
              </button>)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

