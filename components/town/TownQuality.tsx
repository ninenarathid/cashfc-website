"use client";

import { useEffect, useRef, useState } from "react";
import { useCloses } from "./useCloses";
import { COMPANIONS, GRADES, PARTNERS, QUALITY, ROLES, coverOffsets, type CompanionId, type Grade, type Range, type Role } from "@/lib/town/quality";
import { coveringNow, qualityNow, roundStart } from "@/lib/town/quality-plant";
import { see, type FarmSky, type Plant, type Plot } from "@/lib/town/farm";
import { bedCorner, bedOf } from "@/lib/town/world";
import { CROPS, ITEMS, type ItemId } from "@/lib/town/items";
import { FERTS, type Fert } from "@/lib/town/fertilisers";
import type { PriceTold } from "@/lib/town/market";
import { gradePays } from "@/lib/town/trade";
import { GROW_CROPS, SIZES, growFrame, saleOf, seedsFor, sideOf, sizeFor, waitOf } from "@/lib/town/giant-sizes";
import { needsOf } from "@/lib/town/giant-pull";
import { heldIn } from "@/lib/town/pouches";
import type { Purse } from "@/lib/town/trade";
import { gradeOf } from "@/lib/town/quality";
import TownIcon, { type IconName } from "./TownIcon";
import { Delta } from "./TownPrice";

/*
 * The farm's Quality on the page (the design's mock screens, approved 2026-10-15): a chip that says the range of the
 * plant one stands on, and the inspector it opens (the range on a 0–100 bar tinted by the grades, each grade's chance,
 * the four bars and what covers each now, and what has narrowed the range). Rules: lib/town/quality and quality-plant.
 */

/** What part of its round a plant has grown, as a percent floored to one place: so that one watering of a long crop moves it, and it never reads 100 before it is ripe. */
const shownGrowth = (part: number): string => (Math.floor(part * 1000) / 10).toFixed(1);
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

/** A coin amount to the hundredth, without the zeros it does not need. */
const coinsOf = (n: number) => String(Math.round(n * 100) / 100);
/**
 * What the plant's crop fetches this round, a piece at each grade (v283; the owner, 2026-10-19: "แสดงราคาที่ฟาร์ม ให้เห็น
 * ราคาตอนนี้ ราคาของแต่ละเกรด", after members said they could not see a price before picking). The grades its range
 * cannot reach are dimmed; how far the price stands from its base, and the buyers' interest, as the stall says them.
 */
export function GradePrices({ id, told, th, reach }: { id: string; told: PriceTold; th: boolean; reach?: Record<Grade, number> }) {
  const base = told.base ?? ITEMS[id as ItemId]?.pays ?? 0;
  return (
    <div className="flex flex-col gap-1" data-farm-price={id} data-price-f={told.f}>
      <p className="flex flex-wrap items-center gap-x-1.5 text-meta font-semibold text-[#ffd27a]">
        {th ? "ลุงรับซื้อตอนนี้ (ต่อชิ้น)" : "The uncle pays now (a piece)"}<Delta f={told.f} th={th} />
      </p>
      <ul className="grid grid-cols-4 gap-1">
        {GRADES.map((g) => {
          const out = reach !== undefined && !(reach[g.grade] > 0);
          return <li key={g.grade} data-farm-price-grade={g.grade} aria-label={`${th ? g.th : g.en} ${coinsOf((base * told.f * gradePays(id as ItemId, g.grade)) / 100)}`}
                     className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded border-[1.5px] px-1 py-1 ${out ? "border-dashed border-[#6b4a2a] bg-[#3a2a1c] text-[#d8c39a]" : "border-[#1a0e06] bg-[#4a3522] text-ink"}`}
                     data-out={out || undefined}>
            {/* (a grade out of the range's reach: the chip's frame is dashed and its marker faint, its price still read) */}
            <span className="flex items-center gap-1 whitespace-nowrap text-label"><i aria-hidden className={`inline-block size-2.5 shrink-0 border border-[#22150a] ${out ? "opacity-50" : ""}`} style={{ background: ZONE[g.grade] }} />{g.grade ? "★".repeat(g.grade) : th ? "ธรรมดา" : "Normal"}</span>
            <span className={`flex items-center gap-0.5 font-data text-meta font-semibold tabular-nums ${out ? "text-[#e3cfa6]" : "text-gold"}`}><TownIcon name="coin" size={12} />{coinsOf((base * told.f * gradePays(id as ItemId, g.grade)) / 100)}</span>
          </li>;
        })}
      </ul>
      {told.demand !== undefined && <p className="text-label text-[#ead9b4]" data-farm-demand={told.demand}>
        {th ? "ผู้ซื้อรอบนี้" : "Buyer interest"}: {told.demand >= 115 ? th ? "คึกคัก" : "Strong" : told.demand <= 85 ? th ? "ซบเซา" : "Quiet" : th ? "ปกติ" : "Normal"}
        {!!told.demandTrend && <span> · {told.demandTrend > 0 ? th ? "เริ่มสนใจมากขึ้น" : "Picking up" : th ? "ความสนใจลดลง" : "Cooling"}</span>}
      </p>}
      {/* (v285: the whole village's usual amount a round, and what has been left so far: past it, the next round's price tends down) */}
      {told.usual !== undefined && <div className="text-meta text-[#ead9b4]" data-farm-usual={told.usual} data-farm-selling={told.selling ?? 0}>
        <p>{th ? `ปกติทั้งหมู่บ้าน ≈ ${told.usual} ชิ้น/รอบ · ฝากแล้ว ${told.selling ?? 0}` : `Village usual ≈ ${told.usual} a round · left ${told.selling ?? 0}`}</p>
        {(told.selling ?? 0) > told.usual && <p className="font-semibold text-[#ffb09c]">{th ? "เกินปกติแล้ว ราคารอบหน้ามีแนวโน้มลง" : "Over usual: the next round's price tends down"}</p>}
      </div>}
    </div>
  );
}

/** Standing on a plant: its range in a word, and the way into the inspector. */
/** (`top`: the mandrake follows me and the plant is mine, lib/town/farm's atTop: every fruit of its picking lands at the range's top, and the chip says so) */
export function QualityChip({ plant, now, rains, th, onOpen, gain, top }: { plant: Plant; now: number; rains: FarmSky; th: boolean; onOpen: () => void; gain?: number; top?: boolean }) {
  const { range, grown } = qualityNow(plant, now, rains);
  return (
    <button type="button" onClick={onOpen} data-quality-chip
            className="pop-in pressable tk tk-slot pointer-events-auto flex min-h-11 items-center gap-2 px-3 text-ui text-ink" data-state="open">
      <TownIcon name={plant.crop as IconName} size={22} />
      <span className="font-semibold">{th ? "คุณภาพ" : "Quality"} <span className="font-data tabular-nums">{range.lo}–{range.hi}</span></span>
      {/* (a fertiliser in the hand: what it would add to the ceiling by ripeness, lib/town/quality-plant's fertGain) */}
      {gain !== undefined ? <span className="font-data text-meta font-semibold text-[#8fd17a]" data-quality-gain={gain}>{gain > 0 ? (th ? `ใส่แล้ว +${gain}` : `+${gain} if put on`) : th ? "ใส่แล้วไม่เพิ่ม" : "adds nothing"}</span>
        : top ? <span className="font-data text-meta font-semibold text-[#f0c060]" data-quality-top={range.hi}>{th ? `แมนเดรก: ได้ ${range.hi}` : `mandrake: all ${range.hi}`}</span>
        : <span className="text-meta text-muted">{grown >= 1 ? (th ? "สุกแล้ว" : "ripe") : th ? "ดูรายละเอียด" : "details"}</span>}
    </button>
  );
}

/** The plant inspector: the range, the four bars and what covers them, and what has narrowed the range. */
export function QualityInspector({ plant, now, rains, th, onClose, onBed, onGrow, onChart, notes, onBook, book, price }: { plant: Plant; now: number; rains: FarmSky; th: boolean; onClose: () => void; onBed?: () => void; onGrow?: () => void; onChart?: () => void;
  /** (what the plant's place tells besides: an insect in the bag that could help, a crossing the pollen matches; the owner, 2026-10-16, one panel) */
  notes?: string[]; onBook?: () => void; book?: number;
  /** (its crop's price this round, v283: none where the database tells no farm prices yet) */
  price?: PriceTold }) {
  const seen = qualityNow(plant, now, rains), cover = coveringNow(plant, now, rains), close = useRef<HTMLButtonElement>(null);
  useCloses(onClose, close);
  const ripe = seen.grown >= 1, base = Math.max(0, seen.range.hi - QUALITY.spread), swelling = (plant.size?.until ?? 0) > now;
  const weakest = ROLES.reduce((w, r) => (seen.bars[r] < seen.bars[w] ? r : w), ROLES[0]);
  const partner = PARTNERS[plant.crop], partnerName = partner ? (partner in COMPANIONS ? COMPANIONS[partner as keyof typeof COMPANIONS][th ? "th" : "en"] : ITEMS[partner as ItemId]?.name[th ? "th" : "en"]) : null;
  const brushed = typeof plant.brushed === "number" && plant.brushed >= roundStart(plant);
  const name = ITEMS[plant.crop as ItemId]?.name[th ? "th" : "en"] ?? plant.crop;
  const left = (to: number) => (to > now + 1000 * 3_600_000 ? (th ? "ตลอดรอบ" : "all round") : th ? `อีก ${Math.max(1, Math.ceil((to - now) / 3_600_000))} ชม.` : `${Math.max(1, Math.ceil((to - now) / 3_600_000))} h left`);
  return (
    // (never taller than the room under the HUD's top plaque: on a short phone it scrolls rather than cover the clock)
    <section data-quality-inspector style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }}
             className="tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col overflow-hidden p-1.5 text-ui text-ink"
             aria-label={th ? `Quality ของ${name}` : `${name}'s Quality`}>
      <div className="flex min-h-0 flex-col gap-2 sm:gap-2.5 overflow-y-auto overscroll-contain p-1.5 sm:p-2.5">
      <header className="sticky -top-1.5 z-10 -mx-1 flex items-center gap-2 bg-[#5f3b1d] px-1 sm:-top-2.5">
        <TownIcon name={plant.crop as IconName} size={30} />
        <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{name}</h2>
        <span className="text-meta text-muted" data-quality-state>{swelling ? (th ? `กำลังโตเป็น ${plant.size!.n}×${plant.size!.n}` : `Growing to ${plant.size!.n}×${plant.size!.n}`) : ripe ? (th ? "สุกแล้ว" : "Ripe") : th ? `โต ${shownGrowth(seen.grown)}%` : `${shownGrowth(seen.grown)}% grown`}</span>
        <button ref={close} type="button" onClick={onClose} aria-label={th ? "ปิด" : "Close"} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center"><TownIcon name="close" size={16} /></button>
      </header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <b className="font-display text-[1.5rem] leading-tight" data-quality-headline>{th ? `คุณภาพ ${seen.range.lo}–${seen.range.hi}` : `Quality ${seen.range.lo}–${seen.range.hi}`}</b>
        <span className="text-meta text-muted">{ripe ? (th ? "ช่วงล็อกแล้ว สุ่มทีละผลตอนเก็บ" : "Locked: each fruit rolled at the pick") : th ? "ถ้าดูแลแบบนี้ต่อจนสุก" : "If cared for like this until ripe"}</span>
      </div>
      <QualityRange range={seen.range} base={base} th={th} />
      {price && <GradePrices id={plant.crop} told={price} th={th} reach={seen.chances} />}
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
      {swelling && (() => {
        const hours = Math.max(1, Math.ceil((plant.size!.until - now) / 3_600_000));
        return <p className="tk tk-window px-3 py-2 text-meta text-[#3b2412]" data-quality-swelling>{th ? `กำลังโตเต็มพื้นที่ อีก ${hours >= 48 ? `${Math.ceil(hours / 24)} วัน` : `${hours} ชม.`} ไม่ต้องรดน้ำหรือดูแลอะไร แปลงนี้จะไม่หลุดมือระหว่างรอ โตเต็มแล้วต้องใช้คนถอน ${needsOf(plant).hands} คน` : `Filling its ground: ${hours >= 48 ? `${Math.ceil(hours / 24)} days` : `${hours} hours`} more. It wants no care and the bed stays yours. Once grown it takes ${needsOf(plant).hands} people to pull.`}</p>;
      })()}
      {!swelling && plant.size && !plant.pull?.out && ripe && <p className="tk tk-window px-3 py-2 text-meta text-[#3b2412]" data-quality-swollen>{th ? `โตเต็มแล้ว ต้องใช้คนถอน ${needsOf(plant).hands} คน ขายให้ญาติได้ทั้งต้นตอนเก็บ` : `Fully grown: it takes ${needsOf(plant).hands} people to pull, and the relatives buy it whole when you pick it.`}</p>}
      {!swelling && !plant.pull?.out && onGrow && (GROW_CROPS as readonly string[]).includes(plant.crop) && (() => {
        const top = sizeFor(seen.range.hi), name = top ? `${top.n}×${top.n}` : "", stands = plant.footprint?.length ?? 1;
        if (ripe && top && top.n * top.n > stands) return <button type="button" onClick={onGrow} data-quality-grow-open className="pressable tk tk-btn min-h-11 px-4 font-display text-ui">{th ? `ปล่อยให้โต: ได้ถึง ${name}` : `Let it grow: up to ${name}`}</button>;
        return <p className="text-meta text-[#ead9b4]" data-quality-grow-note>{top ? (th ? `สุกแล้วปล่อยให้โตได้ถึง ${name} ถ้าเว้นที่ว่างรอบต้นไว้` : `Once ripe it can grow to ${name}, if the ground around it is free`) : th ? "ถึงคุณภาพ 70 ตอนสุก จะปล่อยให้โตเป็น 2×2 ได้" : "At Quality 70 when ripe it can grow to 2×2"}</p>;
      })()}
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
      {notes?.map((n) => <p key={n} className="rounded-md border border-[#a8c583]/60 bg-[#304323]/60 px-3 py-1.5 text-meta text-[#e1f1c9]" data-quality-note>{n}</p>)}
      {onBook && book ? <button type="button" onClick={onBook} data-quality-book className="pressable tk tk-btn-wood flex min-h-11 items-center gap-2 px-3 text-meta font-semibold"><TownIcon name="gardenNotebook" size={18} />{th ? `สมุดทดลองสวน · ${book} เรื่อง` : `Garden experiments · ${book}`}</button> : null}
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
    <section data-quality-bed className="tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col overflow-hidden p-1.5 text-ui text-ink"
             style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }} aria-label={th ? "ภาพรวมแปลง" : "The bed at a glance"}>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-1.5 sm:p-2.5">
      <header className="sticky -top-1.5 z-10 -mx-1 flex items-center gap-2 bg-[#5f3b1d] px-1 sm:-top-2.5">
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
      </div>
    </section>
  );
}

export const GROW_REFUSED: Record<string, [string, string]> = {
  none: ["ปล่อยให้โตตอนนี้ไม่ได้", "It cannot grow now"],
  theirs: ["แปลงนี้ไม่ใช่ของคุณแล้ว", "This bed is no longer yours"],
  unripe: ["ต้นนี้ยังไม่สุก", "It is not ripe"],
  pest: ["ต้นนี้มีแมลงอยู่ รักษาให้หายก่อน", "It has a pest: cure it first"],
  quality: ["คุณภาพยังไม่ถึงขนาดนี้", "Its ceiling has not reached this size"],
  room: ["พื้นที่เปลี่ยนไปแล้ว ดูแผนที่อีกครั้ง", "The ground has changed: look at the map again"],
  seeds: ["เมล็ดไม่พอ", "Not enough seeds"],
  busy: ["มีคนกำลังดึงต้นนี้อยู่", "Someone is pulling it"],
  spent: ["วันนี้ใช้ถุงเมล็ดแล้ว พรุ่งนี้มาใหม่", "The seeds are used for today"],
  far: ["รอบนี้จบไปแล้ว ลองใหม่ได้เลย", "That go has ended: try again"],
};
/**
 * "Let it grow" (the owner, 2026-10-31: "จะกดปล่อยให้โตได้ ต้องมีพื้นที่รองรับก่อน เขียนอธิบายให้ผู้เล่นเข้าใจง่ายๆด้วย โดยใช้แผนที่แปลงที่มีอยู่ในเกม
 * อยู่แล้ว"): the bed's own map (as QualityBed lays it) with the square the plant would take in gold, each plot of it green
 * when ready and red when not, and in plain words what is still in the way. Rules: lib/town/giant-sizes.
 */
export function QualityGrow({ at, plots, now, rains, th, purse, onClose, onGo, atOnce }: { at: string; plots: Readonly<Record<string, Plot>>; now: number; rains: FarmSky; th: boolean; purse: Purse; onClose: () => void;
  /** Asks the game; a refusal's reason, or null when it has begun. */
  onGo: (n: number) => Promise<string | null>;
  /** The farming line's seventh rank, for whoever has it: its uses left today, and going on to its game (TownGrowAtOnce). */
  atOnce?: { left: number; onGo: (n: number) => void } }) {
  const plant = plots[at]?.plant ?? null, seen = plant ? qualityNow(plant, now, rains) : null, ceiling = seen?.range.hi ?? 0, top = sizeFor(ceiling), stands = plant?.footprint?.length ?? 1;
  const [busy, setBusy] = useState(false), [said, setSaid] = useState<string | null>(null);
  const [x0, y0] = at.split(",").map(Number), [cx, cy] = bedCorner(bedOf(x0, y0));
  const [chosen, setChosen] = useState<number>(top?.n ?? 2), frame = growFrame(at, chosen, plots), size = SIZES.find((s) => s.n === chosen)!;
  const grid = useRef<HTMLDivElement>(null), [box, setBox] = useState<number>(0);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onClose]);
  useEffect(() => { const g = grid.current; if (g) setBox(g.offsetWidth); }, []);
  if (!plant || !seen) return null;
  const side = 7, cells = Array.from({ length: side * side }, (_, i) => `${cx + (i % side)},${cy + Math.floor(i / side)}`), own = new Set(plant.footprint?.length ? plant.footprint : [at]);
  const inFrame = new Set(frame?.cells ?? []), blocked = frame?.blocked ?? new Map<string, string>(), withPlant = [...blocked.values()].filter((w) => w === "plant").length, unready = blocked.size - withPlant;
  const crop = plant.crop, seedsNeed = seedsFor(chosen, sideOf(plant)), seedsHave = heldIn(purse, CROPS[crop].seed), pest = see(at, plots[at], now, rains).pest;
  const allowed = ceiling >= size.from, groundReady = allowed && !!frame && blocked.size === 0, ready = groundReady && seedsHave >= seedsNeed && !pest;
  const name = ITEMS[crop as ItemId]?.name[th ? "th" : "en"] ?? crop;
  const hours = waitOf(crop, chosen), lo = saleOf(crop, chosen, gradeOf(seen.range.lo)), hi = saleOf(crop, chosen, gradeOf(seen.range.hi));
  const cell = box ? (box - 12 - 3 * (side - 1)) / side : 0;
  const facts: Array<[string, string]> = [[th ? "เมล็ดเพิ่ม" : "Seeds", `${seedsNeed} / ${seedsHave}`], [th ? "รออีก" : "Wait", hours >= 48 ? (th ? `${Math.round(hours / 24)} วัน` : `${Math.round(hours / 24)} d`) : th ? `${hours} ชม.` : `${hours} h`], [th ? "คนถอน" : "Hands", `${size.hands}`], [th ? "ขายได้" : "Sells for", lo === hi ? lo.toLocaleString() : `${lo.toLocaleString()}–${hi.toLocaleString()}`]];
  return (
    <section data-quality-grow className="tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col overflow-hidden p-1.5 text-ui text-ink"
             style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }} aria-label={th ? "ปล่อยให้โต" : "Let it grow"}>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-1.5 sm:p-2.5">
      <header className="sticky -top-1.5 z-10 -mx-1 flex items-center gap-2 bg-[#5f3b1d] px-1 sm:-top-2.5">
        <TownIcon name={crop as IconName} size={30} />
        <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{th ? "ปล่อยให้โต" : "Let it grow"}</h2>
        <button type="button" onClick={onClose} aria-label={th ? "ปิด" : "Close"} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center"><TownIcon name="close" size={16} /></button>
      </header>
      <p className="text-meta" data-quality-grow-top>{th ? `${name} คุณภาพสูงสุด ${ceiling}${top ? ` โตได้ถึง ${top.n}×${top.n}` : " ต้องถึง 70 จึงจะโตได้"}` : `${name}, ceiling ${ceiling}${top ? `: can grow to ${top.n}×${top.n}` : ": needs 70 to grow"}`}</p>
      <div className="grid grid-cols-6 gap-1" role="group" aria-label={th ? "เลือกขนาด" : "Choose a size"}>
        {SIZES.map((s) => {
          const can = ceiling >= s.from, here = s.n * s.n <= stands;
          return <button key={s.n} type="button" disabled={here} aria-pressed={chosen === s.n} onClick={() => setChosen(s.n)} data-quality-grow-size={s.n}
            className={`pressable tk ${chosen === s.n ? "tk-btn" : "tk-btn-wood"} flex min-h-11 flex-col items-center justify-center px-0.5 leading-tight ${can && !here ? "" : "opacity-75"}`}>
            <b className="font-data text-meta">{s.n}×{s.n}</b>
            <span className="text-[11px]">{here ? (th ? "ตอนนี้" : "now") : can ? (th ? "ถึงแล้ว" : "reached") : th ? `ต้อง ${s.from}` : `needs ${s.from}`}</span>
          </button>;
        })}
      </div>
      <div className="relative mx-auto w-full" style={{ maxWidth: "min(280px, max(136px, calc(100dvh - 33rem)))" }}>
        <div ref={grid} className="grid gap-[3px] rounded border-2 border-[#22150a] bg-[#2c1e12] p-1" style={{ gridTemplateColumns: `repeat(${side},minmax(0,1fr))` }}>
          {cells.map((k) => {
            const on = plots[k], isOwn = own.has(k), inside = inFrame.has(k), why = blocked.get(k), standing = on?.plant ? on.plant.root ?? k : null;
            const bg = isOwn ? "#7a5a1e" : inside ? (why ? "#9c3226" : "#3f7f35") : standing ? "#4b3827" : "#332416";
            return <div key={k} data-grow-cell={k} data-grow-state={isOwn ? "own" : inside ? (why ? "blocked" : "ready") : "out"} className="relative grid aspect-square min-h-0 place-items-center rounded-[3px] border-2 border-[#3a2817]" style={{ background: bg, opacity: inside || isOwn ? 1 : 0.62 }}>
              {on?.plant && standing === k && <TownIcon name={(ITEMS[on.plant.crop as ItemId] ? on.plant.crop : "mystery") as IconName} size={18} />}
              {inside && !isOwn && why === "soil" && <b aria-hidden className="font-data text-meta text-[#ffd9cf]">×</b>}
            </div>;
          })}
        </div>
        {frame && cell > 0 && <div aria-hidden className="pointer-events-none absolute rounded-[4px] border-[3px] border-[#ffd34d] shadow-[0_0_0_1.5px_#1a0e06]" style={{ left: 6 + (frame.x0 - cx) * (cell + 3) - 3, top: 6 + (frame.y0 - cy) * (cell + 3) - 3, width: frame.n * cell + (frame.n - 1) * 3 + 6, height: frame.n * cell + (frame.n - 1) * 3 + 6 }} />}
      </div>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-label text-[#ead9b4]" aria-label={th ? "ความหมายของสี" : "What the colours mean"}>
        <li className="flex items-center gap-1"><i aria-hidden className="size-3 rounded-[2px] border-2 border-[#ffd34d]" />{th ? "โตเต็มกรอบนี้" : "Fills this frame"}</li>
        <li className="flex items-center gap-1"><i aria-hidden className="size-3 rounded-[2px] bg-[#3f7f35]" />{th ? "พร้อม" : "Ready"}</li>
        <li className="flex items-center gap-1"><i aria-hidden className="size-3 rounded-[2px] bg-[#9c3226]" />{th ? "ยังไม่พร้อม" : "Not ready"}</li>
      </ul>
      <p className="tk tk-window px-3 py-2 text-meta text-[#3b2412]" data-quality-grow-status={ready ? "ready" : "blocked"}>
        {!allowed ? (th ? `ต้นนี้คุณภาพยังไม่ถึง ${size.from} จึงโตเป็น ${chosen}×${chosen} ไม่ได้` : `Its ceiling has not reached ${size.from}, so it cannot grow to ${chosen}×${chosen}`)
          : !frame ? (th ? "ขนาดนี้ไม่พอดีกับแปลง" : "This size does not fit the bed")
          : pest ? (th ? "ต้นนี้มีแมลงอยู่ รักษาให้หายก่อนจึงปล่อยให้โตได้" : "It has a pest: cure it first")
          : groundReady && !ready ? (th ? `ต้องมีเมล็ด${name} ${seedsNeed} เมล็ด ตอนนี้มี ${seedsHave}` : `It takes ${seedsNeed} ${name} seeds; you have ${seedsHave}`)
          : ready ? (th ? "ที่ว่างครบแล้ว กดปล่อยให้โตได้เลย" : "The ground is ready") : th ? `ก่อนกด ต้อง${withPlant ? `ขุดต้นไม้ออก ${withPlant} ช่อง` : ""}${withPlant && unready ? " และ" : ""}${unready ? `พรวนดินอีก ${unready} ช่อง` : ""}${withPlant ? " (ต้นนี้สุกแล้ว ขุดต้นอื่นออกคุณภาพไม่ลด)" : ""}` : `First ${withPlant ? `dig out ${withPlant} plants` : ""}${withPlant && unready ? " and " : ""}${unready ? `till ${unready} plots` : ""}`}
      </p>
      <dl className="grid grid-cols-[1fr_1fr_1fr_1.7fr] gap-1 text-center text-label" data-quality-grow-facts>
        {facts.map(([label, value]) => <div key={label} className="tk tk-slot flex flex-col justify-center px-1 py-1"><dt className="text-[#ead9b4]">{label}</dt><dd className="font-data font-semibold text-ink">{value}</dd></div>)}
      </dl>
      {said && <p role="status" className="text-meta font-semibold text-[#ffd27a]" data-quality-grow-said>{said}</p>}
      {atOnce && <p className="text-meta text-[#ead9b4]" data-quality-grow-atonce-note>{atOnce.left > 0 ? (th ? "ถุงเมล็ดผักยักษ์: ผ่านเกมปลูกสามจังหวะ แล้วโตเต็มขนาดทันที วันนี้เหลือ 1 ครั้ง" : "Giant seeds: pass the three planting beats and it is full size at once. One use left today.") : (th ? "ถุงเมล็ดผักยักษ์: วันนี้ใช้แล้ว พรุ่งนี้มาใหม่" : "Giant seeds: used for today, come back tomorrow.")}</p>}
      <div className="sticky -bottom-1.5 z-10 -mx-1 flex gap-1.5 bg-[#5f3b1d] px-1 pb-1 pl-12 pt-1 sm:-bottom-2.5 sm:pl-1">{atOnce && <button type="button" disabled={!ready || busy || atOnce.left < 1} data-quality-grow-atonce onClick={() => atOnce.onGo(chosen)} className={`pressable tk ${ready && atOnce.left > 0 ? "tk-btn" : "tk-btn-wood opacity-70"} flex min-h-11 flex-1 items-center justify-center gap-1.5 px-2 font-display text-ui`}><TownIcon name="thingGiantSeeds" size={20} />{th ? "โตทันที" : "Grow at once"}</button>}<button type="button" disabled={!ready || busy} data-quality-grow-go onClick={() => { setBusy(true); setSaid(null); void onGo(chosen).then((why) => { setBusy(false); if (why) setSaid((GROW_REFUSED[why] ?? GROW_REFUSED.none)[th ? 0 : 1]); else onClose(); }); }} className={`pressable tk ${ready && !atOnce ? "tk-btn" : "tk-btn-wood"} ${ready ? "" : "opacity-70"} min-h-11 flex-1 px-2 font-display text-ui`}>{ready ? (th ? `${atOnce ? "รอโต" : "ปล่อยให้โตเป็น"} ${chosen}×${chosen}` : `${atOnce ? "Wait for" : "Grow to"} ${chosen}×${chosen}`) : th ? (atOnce ? "ยังโตไม่ได้" : "ยังปล่อยให้โตไม่ได้") : "Not ready yet"}</button></div>
      </div>
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
  useCloses(onClose, close);
  const fills = (a: Role, b: Role) => (Object.entries(FERTS) as Array<[string, Fert]>).filter(([, f]) => {
    const bars = f.bars as Partial<Record<Role, number>>;
    return a === b ? bars[a] === 1 : bars[a] === 0.5 && bars[b] === 0.5;
  });
  return (
    <section data-fert-chart style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }}
             className="tk tk-plate pointer-events-auto flex w-[min(520px,calc(100vw-16px))] flex-col overflow-hidden p-1.5 text-ui text-ink"
             aria-label={th ? "ตารางปุ๋ย" : "Fertiliser chart"}>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-1.5 sm:p-2.5">
      <header className="sticky -top-1.5 z-10 -mx-1 flex items-center gap-2 bg-[#5f3b1d] px-1 sm:-top-2.5">
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
      </div>
    </section>
  );
}

