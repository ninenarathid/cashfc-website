"use client";
import { carriedBag } from "@/lib/town/passive-equipment";
import { partsAt, seesTraces, type ForestPart } from "@/lib/town/foraging-parts";
import { ITEMS } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { held } from "@/lib/town/trade";
import { HOES } from "@/lib/town/farm";
import TownIcon, { type IconName } from "./TownIcon";
import TownNotebook from "./TownNotebook";
import styles from "./TownAdventure.module.css";

const TRACE:Record<string,[string,string]>={
  leaves:["รอยสีเขียวเทาติดกับใบไม้เก่า","Pale green growth clings to old leaves."],
  flowers:["กลีบหอมลอยอยู่เหนือดินที่นูนขึ้น","Fragrant petals above a small rise in the soil."],
  bamboo:["กาบบางซ้อนอยู่รอบหน่อไผ่","Thin sheaths overlap around a bamboo shoot."],
  greens:["ยอดม้วนขึ้นใหม่ มีรากแน่นอยู่ใต้ดิน","New curled tips above firm roots."],
  berries:["เมล็ดเล็กซ่อนอยู่ในผลสุก","Tiny seeds hide inside ripe fruit."],
  mushrooms:["ฝุ่นละเอียดติดใต้หมวกเห็ด","Fine dust clings beneath the mushroom caps."],
};
export default function TownForageParts({kind,keeper,th,onChoose,onClose}:{kind:string;keeper:Keeper;th:boolean;onChoose:(part:ForestPart)=>void;onClose:()=>void}) {
  const purse=keeper.purse(),parts=partsAt(kind),known=purse.forestPartsBook??[],read=seesTraces(purse,keeper.now());
  const rootTool=held(carriedBag(purse),"rootSpade")>0||!!purse.hand&&HOES.includes(purse.hand);
  return <section data-forage-parts className={`${styles.panel} ${styles.forest} pointer-events-auto w-full max-w-[400px]`} aria-label={th?"ร่องรอยที่จุดเก็บ":"Traces at this gathering place"}>
    <header className="flex items-center gap-2"><TownIcon name="traceLeaf" size={28}/><h2 className="font-display text-title">{th?"มีร่องรอยตรงนี้":"Traces here"}</h2><button type="button" onClick={onClose} className="pressable ml-auto min-h-11 px-2">{th?"ปิด":"Close"}</button></header>
    <div className={styles.scene}><TownIcon name="traceLeaf" size={48}/><p className="text-ui">{TRACE[kind]?.[th?0:1]}</p></div>
    <div className="grid gap-2">
      <button type="button" onClick={()=>onChoose("whole")} className="pressable min-h-11 rounded border border-[#8a7549] bg-[#dac69a] p-2 text-ui">{th?"เก็บของที่เห็นเหมือนเดิม":"Gather what you see"}</button>
      {Object.entries(parts).map(([part,item])=>{
        const discovered=known.includes(`${kind}:${part}:${item}`),root=part==="root",allowed=!root||rootTool;
        return <button type="button" key={part} disabled={!allowed} data-forage-part={part} onClick={()=>onChoose(part as ForestPart)} className="pressable flex min-h-12 items-center gap-2 rounded border border-[#607346] bg-[#d1ddb3] p-2 text-left text-ui disabled:opacity-50">
          <TownIcon name={(discovered?item:root?"mound":"traceLeaf") as IconName} size={30}/><span>{discovered?ITEMS[item!].name[th?"th":"en"]:root?th?"แยกส่วนใต้ต้น":"Separate the lower part":th?"เก็บส่วนเล็กโดยเหลือต้นไว้":"Gather a small part; leave the plant"}
            <small className="block text-meta">{!allowed?th?"ต้องมีเสียมหรือถือจอบ":"Carry a root spade or hold a hoe":root?th?`รอบหน้าจุดนี้พัก ${held(carriedBag(purse),"rootSpade")>0?15:30} นาที`:`Next turn this site rests ${held(carriedBag(purse),"rootSpade")>0?15:30} minutes`:th?"เก็บแล้วรอบหน้ายังเติบโตต่อ":"It keeps growing for the next turn"}</small>
          </span>
        </button>;
      })}
    </div>
    {read&&<p className="mt-2 text-meta" data-traces-reading>{th?"อ่านร่องรอยได้ชัดขึ้น ส่วนที่แยกเก็บจะจดไว้เมื่อได้มา":"The traces are clearer. Gathered parts go into your notebook."}</p>}
    {known.length>0&&<TownNotebook title={th?"สมุดร่องรอยของฉัน":"My trail notebook"} th={th} icon="traceLeaf" entries={known.flatMap(e=>{const [place,part,raw]=e.split(":"),id=raw as keyof typeof ITEMS;return ITEMS[id]?[{key:e,title:ITEMS[id].name[th?"th":"en"],icon:id as IconName,category:part==="root"?th?"ส่วนใต้ต้น":"Roots":th?"ส่วนเหนือดิน":"Above ground",body:<><p>{TRACE[place]?.[th?0:1]}</p><p>{part==="root"?th?"แยกจากส่วนใต้ต้น จุดเก็บต้องพักก่อนเติบโตต่อ ใช้เสียมหรือจอบช่วยขุด":"Taken from beneath the plant. The site rests before growing again; use a root spade or hoe.":th?"แยกส่วนเล็กออกโดยเหลือต้นไว้ ให้เติบโตต่อในรอบหน้า":"Gathered a small part while leaving the plant to grow next turn."}</p></>}]:[];})}/>}
  </section>;
}
