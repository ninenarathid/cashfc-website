"use client";
import { useState } from "react";
import {works} from "@/lib/town/gifts";
import { insectCareMode,type InsectCare } from "@/lib/town/insect-garden";
import { ITEMS, iconOf } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { handOf } from "@/lib/town/trade";
import { see } from "@/lib/town/farm";
import TownIcon, { type IconName } from "./TownIcon";
import { WHY } from "./TownTrade";
import styles from "./TownAdventure.module.css";
import TownDiscoveryNote from "./TownDiscoveryNote";

export default function TownInsectRelease({ keeper, at, th }: { keeper: Keeper; at: string; th: boolean }) {
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const p = keeper.purse(), hand = handOf(p), mode = insectCareMode(hand);
  if (!keeper.farm()[at]?.plant) return null;
  const plot = keeper.farm()[at], plant = plot.plant!, seen = see(at, plot, keeper.now(), keeper.rains());
  if (!mode || !hand) {
    if (seen.dead || (plant.root && plant.root !== at)) return null;
    const visitor = p.bag.find(s => s && s.n > 0 && (
      insectCareMode(s.item) === "guard" && seen.pest ||
      insectCareMode(s.item) === "pollinate" && plant.by === keeper.id && !seen.ripe && plant.pollenRound !== plant.picked
    ));
    if (!visitor && plant.by !== keeper.id) return null;
    return <div className="pointer-events-auto w-[min(380px,calc(100vw-24px))]" data-garden-start-hint>
      <TownDiscoveryNote title={th ? visitor ? "ในกระเป๋ามีแมลงที่ช่วยต้นนี้ได้" : "ลองปลูกต้นต่างชนิดไว้ข้างกัน" : visitor ? "An insect in your bag can help this plant" : "Try growing different neighbours"}>
        {visitor && <p>{th ? `เปิดกระเป๋าแล้วถือ${ITEMS[visitor.item].name.th}ในมือ ขณะยืนที่จุดเมล็ดของต้นนี้ จะมีปุ่มให้ปล่อยแมลง · ใช้แมลง 1 ตัว` : `Open your bag and hold ${ITEMS[visitor.item].name.en} at this plant's seed plot to reveal the release action. It uses one insect.`}</p>}
        {plant.by === keeper.id && <p>{th ? "ปลูกต่างชนิดให้ติดกันในแปลงเดียวกันของคุณ ดูแลจนทั้งคู่สุกพร้อมกัน แล้วลองเก็บผลที่จุดเมล็ด บางคู่มีสิ่งให้ค้นพบ" : "Grow different neighbours in the same bed of your own. Tend both until they are ripe together, then harvest at a seed plot. Some pairs have something to discover."}</p>}
      </TownDiscoveryNote>
    </div>;
  }
  const unavailable = plant.root && plant.root !== at ? th ? "กลับไปปล่อยที่จุดเมล็ดของต้นนี้" : "Release at this plant's seed plot."
    : seen.dead ? th ? "ต้นนี้ตายแล้ว ต้องปลูกใหม่ก่อน" : "This plant has died. Plant again first."
    : mode === "pollinate" && plant.by !== keeper.id ? th ? "ผสมเกสรได้เฉพาะต้นของคุณ" : "Pollinate your own plant."
    : mode === "pollinate" && seen.ripe ? th ? "ต้นนี้สุกแล้ว เก็บผลก่อนค่อยช่วยรอบใหม่" : "This plant is ripe. Harvest before helping its next bearing."
    : mode === "pollinate" && plant.pollenRound === plant.picked ? th ? "รอบนี้มีแมลงช่วยเกสรแล้ว รอให้เก็บผลก่อน" : "A visitor has already helped this bearing. Harvest before another visit."
    : mode === "guard" && !seen.pest ? th ? "ต้นนี้ไม่มีศัตรูพืช เก็บแมลงไว้ใช้เมื่อจำเป็น" : "This plant has no pests. Keep the insect for when it is needed."
    : null;
  const slot = p.bag.findIndex(s => s?.item === hand && s.n > 0),guardian=mode==="pollinate"&&works(p,"charmPollenGuardian");
  async function release(choice:InsectCare){setBusy(true);try{const did=await keeper.insectCare(at,slot,choice);setNote(did.ok?th?"แมลงไปดูแลต้นแล้ว":"The insect has left to tend the plant.":WHY[did.why as keyof typeof WHY]?.[th?0:1]??(th?"ต้นนี้ยังไม่พร้อม":"This plant is not ready."));}finally{setBusy(false);}}
  return <section data-insect-release className={`${styles.panel} ${styles.forest} pointer-events-auto w-[min(380px,calc(100vw-24px))]`} aria-label={th ? "ให้แมลงดูแลสวน" : "Let an insect tend the garden"}>
    <div className={styles.scene}><TownIcon name={iconOf(hand) as IconName} size={44} /><div><p className="font-display text-title">{th ? ITEMS[hand].name.th : ITEMS[hand].name.en}</p><p className={styles.caption}>{mode === "pollinate" ? th ? "ผู้ช่วยผสมเกสร" : "A pollination visitor" : th ? "ผู้ช่วยปกป้องต้นพืช" : "A garden guardian"}</p></div></div>
    <p className="mt-1 text-meta">{mode === "pollinate" ? th ? "ให้ตัวหนึ่งไปเยี่ยมดอกของต้นนี้ หรือเก็บไว้ในกระเป๋า" : "Let one visit this plant's flowers, or keep it in your bag." : th ? "ปล่อยตัวหนึ่งลงบนต้นที่มีศัตรูพืช หรือเก็บไว้ในกระเป๋า" : "Release one onto a plant with pests, or keep it in your bag."}</p>
    {unavailable && <p role="status" className="mt-2 text-meta">{unavailable}</p>}
    {guardian?<div className="mt-2 grid gap-2"><p className="text-meta">{th?"เลือกหนึ่งผล ใช้แมลงหนึ่งตัวและสิทธิ์เกสรของรอบนี้ เมล็ดผสมต้องมีคู่สุกข้างกันตอนเก็บ ไม่ซ้อนมีดทาบยอดเกินสองเมล็ด":"Choose one effect, using one insect and this bearing’s pollination. Hybrid seeds still need ripe neighbours at harvest; at most two with a grafting knife."}</p>{(["grow","cross"] as const).map(choice=><button key={choice} data-pollen-choice={choice} disabled={busy||slot<0||!!unavailable} className="pressable min-h-11 rounded border border-[#d5df9a] bg-[#476238] px-3 py-2 text-[#f0e8c8] text-ui disabled:opacity-50" onClick={()=>void release(choice)}>{choice==="grow"?(th?"ปล่อย 1 ตัว · เพิ่มโต 1 ชั่วโมง":"Release one · grow one hour"):(th?"ปล่อย 1 ตัว · เตรียมเมล็ดผสม":"Release one · prepare hybrid seed")}</button>)}</div>:<button type="button" disabled={busy||slot<0||!!unavailable} className="pressable mt-2 min-h-11 w-full rounded border border-[#d5df9a] bg-[#476238] px-3 py-2 text-[#f0e8c8] text-ui disabled:opacity-50" onClick={()=>void release(mode)}>{busy?(th?"กำลังปล่อย…":"Releasing…"):mode==="pollinate"?(th?"ปล่อย 1 ตัวไปผสมเกสร":"Release one to pollinate"):(th?"ปล่อย 1 ตัวไปกำจัดศัตรูพืช":"Release one to tend pests")}</button>}
    {note && <p className="mt-2 text-meta" aria-live="polite">{note}</p>}
  </section>;
}
