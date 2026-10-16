"use client";

import { useEffect, useRef, useState } from "react";
import { see, type FarmSky } from "@/lib/town/farm";
import { usesLeft } from "@/lib/town/gifts";
import { ITEMS, growIconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { bedCorner, bedOf, plotsOfBed } from "@/lib/town/world";
import TownIcon, { type IconName } from "./TownIcon";
import styles from "./TownAdventure.module.css";

/**
 * The enchanted hoe's move (lib/town/farm's movePlant; the owner, 2026-10-16: "ย้ายตำแหน่งผักในแปลงตัวเองได้"): my bed
 * as a grid, the plant I stand at marked, the plots it may go to lit (a tilled empty plot to move it onto, another plant
 * of mine to change places with). One is chosen, and the move is made by the button under the grid, so that a tap
 * that strays costs none of the day's moves. Laid out as the sprawling crop's placing is (TownGardenPlacement).
 */
export default function TownMovePlant({ at, keeper, th, now, rains, onMove, onClose }: {
  at: string; keeper: Keeper; th: boolean; now: number; rains: FarmSky;
  onMove: (to: string) => Promise<boolean>; onClose: () => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null), [busy, setBusy] = useState(false), shut = useRef<HTMLButtonElement>(null);
  const [x, y] = at.split(",").map(Number), [bx, by] = bedCorner(bedOf(x, y)), side = Math.round(Math.sqrt(plotsOfBed(x, y).length));
  const plots = keeper.farm(), targets = new Set(keeper.moveAt(at)), left = usesLeft(keeper.purse(), "charmHoe", now);
  const mine = plots[at]?.plant, nameOf = (id: string) => ITEMS[id as ItemId]?.name[th ? "th" : "en"] ?? id;
  const pick = chosen && targets.has(chosen) ? chosen : null, swapWith = pick ? plots[pick]?.plant ?? null : null;
  // (Escape leaves it, as every asking of the farm's does)
  useEffect(() => {
    shut.current?.focus();
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onClose]);
  const iconAt = (k: string) => { const p = plots[k]?.plant; return p ? growIconOf(p.crop, Math.max(1, see(k, plots[k], now, rains).stage)) as IconName : null; };
  return <section data-farm-move style={{ maxHeight: "min(46rem, calc(100dvh - 10rem))" }} className={`${styles.panel} ${styles.garden} pointer-events-auto w-full max-w-[400px] overflow-y-auto overscroll-contain !p-2.5 sm:!p-3.5`} aria-label={th ? "ย้ายต้นในแปลง" : "Move a plant in the bed"}>
    <header className="flex items-center gap-2">
      <TownIcon name="charmHoe" size={30} />
      <h2 className="font-display text-title font-semibold">{th ? `ย้าย${mine ? nameOf(mine.crop) : "ต้นนี้"}` : `Move the ${mine ? nameOf(mine.crop).toLowerCase() : "plant"}`}</h2>
      <button ref={shut} type="button" onClick={onClose} disabled={busy} data-farm-move-close className="pressable ml-auto min-h-11 min-w-11 px-2 text-meta">{th ? "เลิก" : "Cancel"}</button>
    </header>
    <p className="mb-2 text-meta leading-relaxed">{th ? "แตะช่องว่างที่พรวนแล้วเพื่อย้ายไป หรือแตะต้นอื่นของเราเพื่อสลับที่ ต้นเก็บการเติบโตและคุณภาพไว้ทั้งหมด" : "Tap a tilled empty plot to move it there, or another plant of yours to swap. It keeps all its growth and Quality."}</p>
    <div className="grid gap-[3px] rounded border-2 border-[#2a190d] bg-[#342518] p-1" style={{ gridTemplateColumns: `repeat(${side},minmax(0,1fr))` }} role="group" aria-label={th ? "แผนผังแปลง" : "Bed layout"}>
      {Array.from({ length: side * side }, (_, i) => {
        const cell = `${bx + i % side},${by + Math.floor(i / side)}`, plot = plots[cell], icon = iconAt(cell), here = cell === at, open = targets.has(cell);
        const swap = open && !!plot?.plant, isPick = cell === pick;
        const look = here ? "border-[#f0c060] bg-[#6b4424] ring-2 ring-[#f0c060]" : isPick ? "border-[#ffeccb] bg-[#53713b] ring-2 ring-[#ffeccb]"
          : open ? swap ? "border-[#8fc7e8] bg-[#2f4a5a]" : "border-[#b9e598] bg-[#3f5a2c]"
          : plot?.soil === "tilled" || plot?.plant ? "border-[#73512e] bg-[#533a23] opacity-60" : "border-[#4a3520] bg-[#3a2918] opacity-45";
        const label = `${cell}: ${here ? (th ? "ต้นที่จะย้าย" : "the plant to move") : open ? (swap ? (th ? `สลับกับ${nameOf(plot!.plant!.crop)}` : `swap with the ${nameOf(plot!.plant!.crop).toLowerCase()}`) : (th ? "ย้ายมาที่นี่ได้" : "move here")) : plot?.plant ? (th ? "ย้ายไปไม่ได้" : "not a place to move to") : th ? "ว่าง ยังไม่พร้อม" : "not ready"}`;
        const inner = <>
          {icon ? <TownIcon name={icon} size={26} /> : open ? <span aria-hidden className="text-ui font-semibold text-[#cfeab7]">+</span> : null}
          {swap && <span aria-hidden className="absolute right-0.5 top-0 font-data text-label font-semibold text-[#cdeaff]">⇄</span>}
        </>;
        return open
          ? <button key={cell} type="button" disabled={busy} onClick={() => setChosen(cell)} data-move-cell={cell} data-move-kind={swap ? "swap" : "move"} aria-pressed={isPick} aria-label={label}
              className={`pressable relative flex aspect-square min-h-0 items-center justify-center rounded border-2 ${look}`}>{inner}</button>
          : <div key={cell} data-move-cell={cell} data-move-kind={here ? "here" : "none"} aria-label={label} className={`relative flex aspect-square items-center justify-center rounded border-2 ${look}`}>{inner}</div>;
      })}
    </div>
    <p className="mt-2 text-meta">{th ? "ขอบทอง ต้นนี้ · + ช่องว่าง · ⇄ สลับที่" : "Gold: this plant · + empty plot · ⇄ swap"} · <span className="font-data tabular-nums" data-move-left>{th ? `วันนี้ย้ายได้อีก ${left} ครั้ง` : `${left} moves left today`}</span></p>
    <p className="mb-2 min-h-6 text-meta font-semibold" role="status">{pick ? (swapWith ? (th ? `สลับที่กับ${nameOf(swapWith.crop)}` : `Swap places with the ${nameOf(swapWith.crop).toLowerCase()}`) : th ? "ย้ายไปช่องที่เลือก" : "Move it to the chosen plot") : targets.size ? (th ? "เลือกช่องที่จะย้ายไป" : "Choose where it goes") : th ? "ตอนนี้ไม่มีที่ให้ย้ายไป" : "There is nowhere to move it now"}</p>
    <button type="button" disabled={!pick || busy} data-farm-move-go onClick={async () => { if (!pick) return; setBusy(true); try { if (!(await onMove(pick))) setChosen(null); } finally { setBusy(false); } }}
      className="pressable min-h-11 w-full rounded border-2 border-[#2a190d] bg-[#f0c060] p-2 text-[#3a2209] disabled:opacity-40">
      {busy ? (th ? "กำลังย้าย…" : "Moving…") : swapWith ? (th ? "สลับที่" : "Swap them") : th ? "ย้ายมาที่นี่" : "Move it here"}
    </button>
  </section>;
}
