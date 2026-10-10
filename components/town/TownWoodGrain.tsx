"use client";

import { useState } from "react";
import { grainOf, WOOD_PARTS, type GrainSide, type WoodPart, type WoodSelection } from "@/lib/town/wood-grain";

import type { ComboEffect } from "@/lib/town/combo-types";
import TownComboFx from "./TownComboFx";
import TownIcon from "./TownIcon";
import styles from "./TownAdventure.module.css";

const PART: Record<WoodPart, [string, string]> = { wood: ["เนื้อไม้", "Wood"], bark: ["เปลือก", "Bark"], sap: ["ชัน", "Pitch"], seed: ["เมล็ด", "Seeds"], root: ["ใยราก", "Root fiber"] };
const selectedClass = "border-[#8fd45f] bg-[#31512c] text-[#f4ffe8]";
const plainClass = "border-[#2a190d] bg-[#4a2f18] text-[#ffeccb]";

/** Read the trunk, choose three notches and a safe fall, then play the timed chops. */
export default function TownWoodGrain({ th, tree, hints, direction, buffered, onBond, reduced, onReady, onSkip, onCancel }: {
  onBond?: (notches: number[]) => Promise<ComboEffect | undefined>; reduced?: boolean;
  th: boolean; tree: number; hints: number; direction: boolean; buffered: boolean;
  onReady: (choice: WoodSelection) => void; onSkip: () => void; onCancel: () => void;
}) {
  const plan = grainOf(tree);
  const [bond,setBond]=useState<ComboEffect>();
  const [checking,setChecking]=useState(false);
  const [checked,setChecked]=useState(false);
  const [notches, setNotches] = useState<Array<GrainSide | null>>([null, null, null]);
  const [lean, setLean] = useState<GrainSide | null>(null);
  const [part, setPart] = useState<WoodPart>("wood");
  const complete = notches.every(s => s !== null) && lean !== null;
  return <section data-wood-grain data-town-game aria-label={th ? "อ่านลายไม้" : "Read the grain"}
    className={`${styles.panel} ${styles.wood} max-w-full`}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-display text-title font-semibold">{th ? "อ่านลายไม้ก่อนลงขวาน" : "Read the grain before chopping"}</h2>
      <button type="button" onClick={onCancel} className="pressable min-h-11 px-2 text-meta">{th ? "เลิก" : "Cancel"}</button>
    </div>
    <div className={styles.scene}><TownIcon name="axe" size={42}/><p className="text-meta">{th ? "บากตามเสี้ยนทั้ง 3 จุด แล้วเลือกทิศที่ต้นเอียง ระหว่างฟันยังต้องหลบกิ่ง" : "Follow the grain at all three notches, then choose the tree's lean. Avoid branches while chopping."}</p></div>
    <p className="mb-2 text-meta">{th ? "ดูเส้นจากบนลงล่าง: ปลายเส้นไปทางไหน ให้บากฝั่งนั้น" : "Read each line from top to bottom: notch on the side its lower end points toward."}</p>
    {bond && <div className="mb-2"><TownComboFx cue={bond.cue} effect={bond} th={th} reduced={reduced} /><p className="mt-1 text-meta">{th ? "นกชี้รอยบากที่ควรแก้ ลองอ่านอีกครั้ง" : "The bird points to a notch. Read it once more."}</p></div>}
    <div className="rounded-md border-2 border-[#2a190d] bg-[#3a2513] px-2 py-1">
      {plan.notches.map((side, i) => <fieldset key={i} className="flex items-center gap-2 border-b border-[#9c6b3d]/40 py-1 last:border-0">
        <legend className="sr-only">{th ? `รอยบากที่ ${i + 1}` : `Notch ${i + 1}`}</legend>
        <svg viewBox="0 0 90 42" role="img" aria-label={th ? `เสี้ยนเอียง${side < 0 ? "ซ้าย" : "ขวา"}` : `${side < 0 ? "Left" : "Right"}-leaning grain`} className="h-11 w-20 shrink-0">
          <rect x="2" y="1" width="86" height="40" rx="3" fill="#9c6b3d" stroke="#2a190d" strokeWidth="2" />
          {[15, 30, 45, 60, 75].map(x => <path key={x} d={`M${x - side * 8} 6 L${x + side * 8} 36`} stroke="#e9cfa4" strokeWidth="3" fill="none" />)}
        </svg>
        <span className="w-5 font-data text-meta">{i + 1}</span>
        {([-1, 1] as const).map(s => <button key={s} type="button" aria-pressed={notches[i] === s}
          aria-label={th ? `บากที่ ${i + 1} ฝั่ง${s < 0 ? "ซ้าย" : "ขวา"}` : `Notch ${i + 1}, ${s < 0 ? "left" : "right"}`}
          data-notch={i} data-side={s} onClick={() => setNotches(old => old.map((v, j) => i === j ? s : v))}
          className={`pressable relative min-h-11 flex-1 rounded-md border-2 px-2 font-data text-title ${notches[i] === s ? selectedClass : plainClass}`}>
          {s < 0 ? "←" : "→"}{(i < hints && s === side || bond?.index === i && bond.side === s) && <span className="absolute right-1 top-1 text-label text-[#8fd45f]" aria-label={th ? "แนวที่สัมผัสลายไม้บอก" : "Grain hint"}>✦</span>}
        </button>)}
      </fieldset>)}
    </div>
    <fieldset className="mt-2">
      <legend className="mb-1 text-meta">{th ? "ดูแนวลำต้นแล้วเลือกทิศล้ม" : "Read the trunk's lean and choose its fall"}</legend>
      <svg viewBox="0 0 100 38" role="img" aria-label={th ? `ลำต้นเอียง${plan.lean < 0 ? "ซ้าย" : "ขวา"}` : `Trunk leans ${plan.lean < 0 ? "left" : "right"}`} className="mx-auto h-10 w-28">
        <path d={`M50 35 L${50 + plan.lean * 10} 5`} stroke="#e9cfa4" strokeWidth="10" />
        <path d="M15 36 H85" stroke="#2a190d" strokeWidth="3" />
      </svg>
      <div className="flex gap-2">{([-1, 1] as const).map(s => <button key={s} type="button" aria-pressed={lean === s}
        data-fall={s} onClick={() => setLean(s)} className={`pressable min-h-11 flex-1 rounded-md border-2 px-3 text-ui ${lean === s ? selectedClass : plainClass}`}>
        {s < 0 ? (th ? "← ล้มซ้าย" : "← Fall left") : th ? "ล้มขวา →" : "Fall right →"}{direction && s === plan.lean ? " ✦" : ""}
      </button>)}</div>
    </fieldset>
    <fieldset className="mt-2">
      <legend className="mb-1 text-meta">{th ? "ส่วนที่จะเก็บเพิ่มเติม" : "Additional part to harvest"}</legend>
      <div className="flex flex-wrap gap-1">{WOOD_PARTS.map(p => <button key={p} type="button" aria-pressed={part === p}
        onClick={() => setPart(p)} data-wood-part={p} className={`pressable min-h-11 grow rounded-md border-2 px-2 text-meta ${part === p ? selectedClass : plainClass}`}>{PART[p][th ? 0 : 1]}</button>)}</div>
    </fieldset>
    {buffered && <p className="mt-1 text-meta text-[#bde99e]">{th ? "หลักประคองช่วยรักษาคุณภาพจากการพลาดหนึ่งครั้ง" : "The bracing stake preserves quality through one miss."}</p>}
    {!complete && <p role="status" className="mt-2 text-meta">{th ? `เลือกรอยบากแล้ว ${notches.filter(s => s !== null).length} / 3 จุด${lean === null ? " · ยังไม่ได้เลือกทิศล้ม" : " · เลือกทิศล้มแล้ว"}` : `${notches.filter(s => s !== null).length} / 3 notches chosen · ${lean === null ? "Choose a fall direction" : "Fall direction chosen"}`}</p>}
    <div className="mt-3 flex gap-2">
      <button type="button" onClick={onSkip} className="pressable min-h-11 rounded-md border-2 border-[#2a190d] px-2 text-meta">{th ? "เก็บไม้ตามเดิม" : "Original harvest"}</button>
      <button type="button" disabled={!complete || checking} onClick={async () => { if(!complete || checking) return; if(!checked && onBond) { setChecking(true); try { const effect=await onBond(notches as number[]); setChecked(true); if(effect) { setBond(effect); return; } } finally { setChecking(false); } } onReady({ notches: notches as GrainSide[], direction: lean!, part }); }}
        data-grain-ready className="pressable min-h-11 flex-1 rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] px-3 text-ui font-semibold text-[#3a2209] disabled:opacity-45">{th ? "พร้อมลงขวาน" : "Ready to chop"}</button>
    </div>
  </section>;
}
