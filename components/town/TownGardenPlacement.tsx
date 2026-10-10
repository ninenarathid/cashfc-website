"use client";

import { useState } from "react";
import { gardenMods, gardenRoom, gardenShape } from "@/lib/town/gardening";
import { GARDEN_CROPS, type GardenCropId } from "@/lib/town/garden-items";
import { ITEMS } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { bedCorner, bedOf, plotsOfBed } from "@/lib/town/world";
import TownIcon, { type IconName } from "./TownIcon";
import styles from "./TownAdventure.module.css";

export default function TownGardenPlacement({ at, crop, keeper, th, onPlant, onClose }: {
  at: string; crop: GardenCropId; keeper: Keeper; th: boolean;
  onPlant: (rotation: number) => Promise<void>; onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0), [busy, setBusy] = useState(false);
  const [x, y] = at.split(",").map(Number), [bx, by] = bedCorner(bedOf(x, y)), side = Math.sqrt(plotsOfBed(x, y).length);
  const plots = keeper.farm(), cells = gardenShape(at, crop, rotation), ready = gardenRoom(at, crop, plots, rotation);
  const fx = gardenMods(keeper.purse(), keeper.now());
  const fits = fx.layout ? [0, 1, 2, 3].filter(r => gardenRoom(at, crop, plots, r)).length : 0;
  return <section data-garden-placement className={`${styles.panel} ${styles.garden} pointer-events-auto w-full max-w-[400px]`} aria-label={th ? "วางพืชหลายช่อง" : "Place a sprawling crop"}>
    <header className="flex items-center gap-2"><TownIcon name={crop as IconName} size={34} /><h2 className="font-display text-title font-semibold">{ITEMS[crop].name[th ? "th" : "en"]}</h2><button type="button" onClick={onClose} disabled={busy} className="pressable ml-auto min-h-11 px-2 text-meta">{th ? "เลิก" : "Cancel"}</button></header>
    <div className={styles.scene}><TownIcon name={GARDEN_CROPS[crop].seed as IconName} size={42}/><p className="text-meta">{th ? "วางเมล็ดไว้ที่จุดเริ่ม หมุนแนวรากให้พอดีกับช่องที่พรวนแล้ว ดูแลและเก็บที่จุดเมล็ด" : "Place the seed at the starting plot. Rotate its roots into tilled, empty cells. Tend and harvest at the seed."}</p></div>
    <div className="grid gap-1 rounded border-2 border-[#2a190d] bg-[#342518] p-2" style={{ gridTemplateColumns: `repeat(${side},minmax(0,1fr))` }} aria-label={th ? "แผนผังแปลง" : "Bed layout"}>
      {Array.from({ length: side * side }, (_, i) => {
        const cell = `${bx + i % side},${by + Math.floor(i / side)}`, plot = plots[cell], chosen = cells?.includes(cell), free = plot?.soil === "tilled" && !plot.plant;
        return <div key={cell} data-garden-cell={cell} className={`flex aspect-square items-center justify-center rounded border text-meta ${chosen ? free ? "border-[#b9e598] bg-[#53713b]" : "border-[#e29a87] bg-[#773d30]" : "border-[#73512e] bg-[#533a23]"}`} aria-label={`${cell}: ${chosen ? th ? "ตำแหน่งปลูก" : "plant footprint" : plot?.plant ? th ? "มีต้นพืช" : "occupied" : free ? th ? "ว่าง" : "free" : th ? "ต้องพรวน" : "needs tilling"}`}>
          {cell === at ? <TownIcon name={GARDEN_CROPS[crop].seed as IconName} size={22} /> : chosen ? "◆" : plot?.plant ? "●" : fx.layout && free ? "·" : ""}
        </div>;
      })}
    </div>
    <p className="mt-2 text-meta">{th ? "◆ รากของต้นใหม่   ● ต้นที่ปลูกไว้   เมล็ด = จุดดูแล" : "◆ New roots   ● Existing plant   Seed = tending point"}</p>
    {fx.layout && <p className="mt-2 text-meta text-[#cce8b1]">{th ? `กรอบนำราก: หมุนแล้ววางได้ ${fits} ทิศ` : `Root guide: ${fits} rotations fit here`}</p>}
    <div className="my-3 flex gap-2"><button type="button" disabled={busy} onClick={() => setRotation(r => (r + 3) % 4)} className="pressable min-h-11 flex-1 rounded border-2 border-[#2a190d] bg-[#4a2f18] p-2 text-meta">{th ? "↶ หมุนซ้าย" : "↶ Rotate left"}</button><button type="button" disabled={busy} onClick={() => setRotation(r => (r + 1) % 4)} className="pressable min-h-11 flex-1 rounded border-2 border-[#2a190d] bg-[#4a2f18] p-2 text-meta">{th ? "หมุนขวา ↷" : "Rotate right ↷"}</button></div>
    <p className="mb-2 min-h-10 text-meta" role="status">{ready ? th ? `ปลูกได้ ใช้พื้นที่ ${ready.length} ช่อง` : `Ready: ${ready.length} plots` : th ? "พื้นที่ไม่พอ หมุนต้นหรือพรวนช่องที่ติดกันเพิ่มก่อน" : "No room: rotate or till the neighbouring plots first."}</p>
    <button type="button" disabled={!ready || busy} onClick={async () => { setBusy(true); try { await onPlant(rotation); } finally { setBusy(false); } }} className="pressable min-h-11 w-full rounded border-2 border-[#2a190d] bg-[#f0c060] p-2 text-[#3a2209] disabled:opacity-40">{busy ? th ? "กำลังปลูก…" : "Planting…" : th ? "ปลูกในตำแหน่งนี้" : "Plant here"}</button>
  </section>;
}
