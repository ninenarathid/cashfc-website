"use client";

import { useRef, useState } from "react";
import { CRAFTS, craft, craftFee, craftLeads, type CraftId } from "@/lib/town/crafting";
import { clueOf, KIND_WORD } from "@/lib/town/clues";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { held, type Purse } from "@/lib/town/trade";
import { usesOf } from "@/lib/town/uses";
import { ItemIcon, WHY } from "./TownTrade";
import TownIcon from "./TownIcon";
import TownDiscoveryNote from "./TownDiscoveryNote";
import styles from "./TownAdventure.module.css";

export default function TownCrafting({ keeper, purse, th }: { keeper: Keeper; purse: Purse; th: boolean }) {
  const [query, setQuery] = useState("");
  const [category,setCategory]=useState<string|null>(null);
  const [busy, setBusy] = useState<CraftId | null>(null);
  const [message, setMessage] = useState("");
  const pending = useRef<{ item: CraftId; request: string } | null>(null);
  const working = useRef(false);
  const name = (id: ItemId) => th ? ITEMS[id].name.th : ITEMS[id].name.en;
  const make = async (item: CraftId) => {
    if (working.current) return;
    working.current = true;
    setBusy(item);
    setMessage("");
    if (pending.current?.item !== item) pending.current = { item, request: crypto.randomUUID() };
    try {
      const did = await keeper.craft(item, pending.current.request);
      if (did.ok) { pending.current = null; setMessage(`${name(item)} ×${did.n}`); }
      else {
        // Keep the same request after a lost response: retrying cannot spend ingredients twice.
        if (did.why !== "away") pending.current = null;
        const why = (WHY as Partial<Record<string, [string, string]>>)[did.why];
        setMessage(why ? why[th ? 0 : 1] : th ? "ยังทำชิ้นนี้ไม่ได้" : "Cannot make this yet");
      }
    } finally { working.current = false; setBusy(null); }
  };
  const seen = new Set([...(keeper.shops()?.seen ?? []), ...purse.bag.flatMap(s => s ? [s.item] : [])]);
  const leads = craftLeads(purse, [...seen]);
  const labels:Record<string,[string,string]>={rod:["ตกปลา","Fishing"],tackle:["ตกปลา","Fishing"],axe:["ตัดไม้","Woodcutting"],woodwork:["ตัดไม้","Woodcutting"],pick:["ขุดแร่","Mining"],survey:["ขุดแร่","Mining"],hoe:["สวน","Gardening"],can:["สวน","Gardening"],blade:["สวน","Gardening"],garden:["สวน","Gardening"],net:["แมลง","Insects"],insectCare:["แมลง","Insects"],foraging:["ของป่า","Foraging"],bucket:["สายน้ำ","Waterwork"],waterwork:["สายน้ำ","Waterwork"],cookware:["ทำอาหาร","Cooking"],kitchen:["ทำอาหาร","Cooking"],ease:["ทำอาหาร","Cooking"],serve:["ทำอาหาร","Cooking"],table:["ทำอาหาร","Cooking"],carry:["สัมภาระ","Carrying"],preparation:["เตรียมอาหาร","Preparation"],camp:["ค่ายพัก","Camps"]};
  const group=(id:ItemId)=>labels[usesOf(id)[0]]?.[0]??KIND_WORD[ITEMS[id].kind].th;
  const groupName=(key:string)=>th?key:Object.values(labels).find(words=>words[0]===key)?.[1]??Object.values(KIND_WORD).find(words=>words.th===key)?.en??key;
  const categories=[...new Set(leads.map(group))];
  const matches = leads.filter((id) => (!category||group(id)===category)&&`${ITEMS[id].name.th} ${ITEMS[id].name.en}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const startingClues: Record<string, [string, string]> = {
    ตกปลา: ["ถือคันเบ็ด เลือกเหยื่อ แล้วลองริมน้ำในหมู่บ้าน ป่า หรือภูเขา แต่ละแหล่งมีสิ่งให้สังเกตต่างกัน", "Hold a rod, choose bait and try the village, forest or mountain water. Each water has different signs to read."],
    ตัดไม้: ["ถือขวานเข้าใกล้ต้นไม้ เริ่มตัดแล้วลองอ่านรอยบนเนื้อไม้ ก่อนเลือกส่วนที่จะเก็บ", "Hold an axe near a tree. Start felling and read the grain before choosing what to harvest."],
    ขุดแร่: ["ถือพลั่วเข้าเหมือง เริ่มขุดสายแร่แล้วลองฟังเสียงและเลือกสิ่งที่จะเก็บ", "Take a pick into the mine. Start a vein, listen to its echo and choose what to extract."],
    สวน: ["ลองปลูกต่างชนิดติดกันในแปลงของตัวเอง ดูแลให้โตพร้อมกัน แล้วเก็บผลที่จุดเมล็ด", "Try different plants side by side in your own bed. Grow them together and harvest at their seed plots."],
    แมลง: ["จับแมลงแล้วลองถือมันในมือขณะยืนบนต้นพืช แมลงบางตัวช่วยสวนได้", "After catching an insect, try holding it while standing on a planted plot. Some insects can help the garden."],
    ของป่า: ["เข้าใกล้ของป่าที่เก็บได้ แล้วกดดูส่วนที่เก็บได้ ลองสังเกตมากกว่าผลที่เห็น", "Approach a gathering spot and choose Inspect harvest parts. Look beyond the fruit you can see."],
    สายน้ำ: ["ไปจุดร่องน้ำแยกบนภูเขา นำถังหรือกระบอกเก็บน้ำไป แล้วเริ่มสำรวจริมฝั่ง", "Find the branching channels on the mountain. Bring a bucket or water sampler and explore the bank."],
    ทำอาหาร: ["ที่เตาหรือโต๊ะครัว ลองเตรียมวัตถุดิบด้วยเขียงเตรียมวัตถุดิบและเครื่องครัว ก่อนนำไปทำอาหารต่อ", "At a stove or kitchen table, try preparing ingredients with a preparation board and cookware, then use what you make in cooking."],
    เตรียมอาหาร: ["นำเขียงเตรียมวัตถุดิบ เครื่องครัว และวัตถุดิบมาที่ลานครัว แล้วกดเตรียมวัตถุดิบ", "Bring a preparation board, cookware and ingredients to the kitchen yard, then choose Prepare ingredients."],
    ค่ายพัก: ["มองหาที่พักริมทางในป่าหรือภูเขา นำชุดตั้งค่ายไป แล้วเปิดดูของที่ต้องเตรียม เพื่อนร่วมทางใช้ค่ายด้วยได้", "Look for a wayside camp spot in the forest or mountain. Bring a camp kit and check the supplies needed; travelers can share the camp."],
  };
  const clue = category ? startingClues[category] : undefined;
  return <section className={`${styles.workshop} min-h-0 flex-1 overflow-y-auto`} aria-label={th ? "โต๊ะคราฟต์อุปกรณ์" : "Equipment workshop"}>
    <header className={styles.workshopHeader}><TownIcon name="axe" size={48}/><div><h3 className="font-display">{th?"โต๊ะช่างของลุง":"The uncle's workbench"}</h3><p>{th ? "วางวัตถุดิบไว้ แล้วเลือกชิ้นที่อยากสร้าง" : "Lay out your materials and choose what to build."}</p></div></header>
    <p className="mb-3 text-sm text-[#c9a877]">{th ? "ไม้เนื้อดีจากการตัดไม้ · แร่จากเหมืองและช่างตีเหล็ก · ดิน ไม้ไผ่ และรังไหมจากป่า" : "Fine timber from felling · ore from mining and smelting · clay, bamboo and cocoons from the forest"}</p>
    <label className="mb-3 block text-sm">{th ? "ค้นหาอุปกรณ์" : "Find equipment"}<input name="workshop-search" type="search" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} className="mt-1 block min-h-11 w-full rounded border border-[#8a6948] bg-[#2a190d] px-3" /></label>
    <div className={styles.bookCategories} role="group" aria-label={th?"ประเภทงานช่าง":"Workshop categories"}>{[null,...categories].map(c=><button type="button" key={c??"all"} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c?groupName(c):th?"ทั้งหมด":"All"}</button>)}</div>
    <TownDiscoveryNote title={th ? "ลุงฝากบอก · เริ่มลองตรงไหน" : "A word from the uncle · where to begin"}>
      <p>{clue?.[th ? 0 : 1] ?? (th ? "เก็บไม้ แร่ หรือของป่ามาสักชิ้น งานช่างที่เกี่ยวข้องจะเริ่มปรากฏ ลองเลือกประเภทของสายที่อยากเล่นเพื่ออ่านคำใบ้เริ่มต้น" : "Bring a piece of wood, ore or a forest material to uncover related crafts. Choose a profession category for a starting clue.")}</p>
      <p>{th ? "ของที่ยังไม่เคยพบจะบอกแค่ลักษณะและแหล่งที่มา ลองเก็บกลับมาแล้วเปิดโต๊ะช่างอีกครั้ง" : "Unseen materials have only a description and a source clue. Gather one and check the workbench again."}</p>
    </TownDiscoveryNote>
    <p role="status" className="mb-2 min-h-6 text-sm text-[#f0c060]">{message}</p>
    <ul className={styles.craftList}>
      {matches.map((id) => {
        const check = craft(purse, id, keeper.now());
        return <li key={id} className={styles.recipe} data-craft={id}>
          <div className="flex items-center gap-2"><span className={styles.recipeIcon}><ItemIcon id={id} size={36} /></span><strong className="min-w-0 flex-1 text-ui">{name(id)}</strong><span className="text-xs">{th ? "ขั้น" : "Tier"} {ITEMS[id].tier}</span></div>
          <p className="mt-2 text-meta leading-relaxed text-[#6b5236]">{ITEMS[id].about[th?"th":"en"]}</p>
          <ul className="my-2 space-y-1 text-sm">{CRAFTS[id].map(([part, n]) => {
            const clue = clueOf(part), lang = th ? "th" : "en";
            return <li key={part} className="flex items-center gap-2">{seen.has(part) || purse.crafted?.includes(id) ? <><ItemIcon id={part} size={18} /><span>{name(part)}</span></> : <span className="text-[#735b36]">{clue.sort[lang]}{clue.from && <small className="block">{clue.from[lang]}</small>}</span>}<span className={`ml-auto shrink-0 tabular-nums ${held(purse.bag, part) < n ? "text-[#9b352b]" : "text-[#365c37]"}`}>{held(purse.bag, part)} / {n}</span></li>;
          })}</ul>
          <button type="button" disabled={!!busy || !check.ok} onClick={() => void make(id)} className="min-h-11 w-full rounded border-2 border-[#2a190d] bg-[#70512f] px-3 text-[#fff0cd] disabled:opacity-50">{busy === id ? (th ? "กำลังสร้าง…" : "Making…") : `${th ? "สร้าง" : "Make"} · ${craftFee(id)} ${th ? "เหรียญ" : "coins"}`}</button>
          {!check.ok && check.why === "full" && <p className="mt-1 text-sm">{th ? "เก็บของเข้ากล่องเพื่อเปิดที่ว่างก่อน" : "Store something to make room first"}</p>}
        </li>;
      })}
    </ul>
    {!matches.length && <div className="py-3 text-ui"><p>{leads.length>0?(th?"ยังไม่มีงานที่ตรงกับการค้นหาหรือหมวดนี้ ลองดูหมวดอื่น":"No crafts match this search or category. Try another category."):(th?"ลุงรอดูวัตถุดิบที่คุณเก็บมา ลองนำไม้ แร่ หรือของป่าติดกระเป๋ามาด้วย":"The uncle waits to see what you bring. Carry some wood, ore or forest materials here.")}</p>{leads.length>0&&<button type="button" onClick={()=>{setCategory(null);setQuery("");}} className="mt-2 min-h-11 rounded border border-[#8a6948] px-3">{th?"ดูงานช่างที่พบทั้งหมด":"Show all discovered crafts"}</button>}</div>}
  </section>;
}
