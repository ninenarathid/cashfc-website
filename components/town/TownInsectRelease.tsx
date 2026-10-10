"use client";
import { useState } from "react";
import { insectCareMode } from "@/lib/town/insect-garden";
import { ITEMS, iconOf } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { handOf } from "@/lib/town/trade";
import { see } from "@/lib/town/farm";
import TownIcon, { type IconName } from "./TownIcon";
import { WHY } from "./TownTrade";
import styles from "./TownAdventure.module.css";

export default function TownInsectRelease({ keeper, at, th }: { keeper: Keeper; at: string; th: boolean }) {
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const p = keeper.purse(), hand = handOf(p), mode = insectCareMode(hand);
  if (!mode || !hand || !keeper.farm()[at]?.plant) return null;
  const plot = keeper.farm()[at], plant = plot.plant!, seen = see(at, plot, keeper.now(), keeper.rains());
  const unavailable = plant.root && plant.root !== at ? th ? "กลับไปปล่อยที่จุดเมล็ดของต้นนี้" : "Release at this plant's seed plot."
    : seen.dead ? th ? "ต้นนี้ตายแล้ว ต้องปลูกใหม่ก่อน" : "This plant has died. Plant again first."
    : mode === "pollinate" && plant.by !== keeper.id ? th ? "ผสมเกสรได้เฉพาะต้นของคุณ" : "Pollinate your own plant."
    : mode === "pollinate" && seen.ripe ? th ? "ต้นนี้สุกแล้ว เก็บผลก่อนค่อยช่วยรอบใหม่" : "This plant is ripe. Harvest before helping its next bearing."
    : mode === "pollinate" && plant.pollenRound === plant.picked ? th ? "รอบนี้มีแมลงช่วยเกสรแล้ว รอให้เก็บผลก่อน" : "A visitor has already helped this bearing. Harvest before another visit."
    : mode === "guard" && !seen.pest ? th ? "ต้นนี้ไม่มีศัตรูพืช เก็บแมลงไว้ใช้เมื่อจำเป็น" : "This plant has no pests. Keep the insect for when it is needed."
    : null;
  const slot = p.bag.findIndex(s => s?.item === hand && s.n > 0);
  return <section data-insect-release className={`${styles.panel} ${styles.forest} pointer-events-auto w-[min(380px,calc(100vw-24px))]`} aria-label={th ? "ให้แมลงดูแลสวน" : "Let an insect tend the garden"}>
    <div className={styles.scene}><TownIcon name={iconOf(hand) as IconName} size={44} /><div><p className="font-display text-title">{th ? ITEMS[hand].name.th : ITEMS[hand].name.en}</p><p className={styles.caption}>{mode === "pollinate" ? th ? "ผู้ช่วยผสมเกสร" : "A pollination visitor" : th ? "ผู้ช่วยปกป้องต้นพืช" : "A garden guardian"}</p></div></div>
    <p className="mt-1 text-meta">{mode === "pollinate" ? th ? "ให้ตัวหนึ่งไปเยี่ยมดอกของต้นนี้ หรือเก็บไว้ในกระเป๋า" : "Let one visit this plant's flowers, or keep it in your bag." : th ? "ปล่อยตัวหนึ่งลงบนต้นที่มีศัตรูพืช หรือเก็บไว้ในกระเป๋า" : "Release one onto a plant with pests, or keep it in your bag."}</p>
    {unavailable && <p role="status" className="mt-2 text-meta">{unavailable}</p>}
    <button type="button" disabled={busy || slot < 0 || !!unavailable} className="pressable mt-2 min-h-11 w-full rounded border border-[#d5df9a] bg-[#476238] px-3 py-2 text-ui disabled:opacity-50" onClick={async () => {
      setBusy(true); try { const did = await keeper.insectCare(at, slot, mode); setNote(did.ok ? th ? "แมลงไปดูแลต้นแล้ว" : "The insect has left to tend the plant." : WHY[did.why as keyof typeof WHY]?.[th ? 0 : 1] ?? (th ? "ต้นนี้ยังไม่พร้อม" : "This plant is not ready.")); } finally { setBusy(false); }
    }}>{busy ? th ? "กำลังปล่อย…" : "Releasing…" : th ? mode === "pollinate" ? "ปล่อย 1 ตัวไปผสมเกสร" : "ปล่อย 1 ตัวไปกำจัดศัตรูพืช" : mode === "pollinate" ? "Release one to pollinate" : "Release one to tend pests"}</button>
    {note && <p className="mt-2 text-meta" aria-live="polite">{note}</p>}
  </section>;
}
