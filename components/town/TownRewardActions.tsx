"use client";

import { useEffect, useRef, useState } from "react";
import type { Keeper, Did } from "@/lib/town/keeper";
import { works, usesLeft } from "@/lib/town/gifts";
import { mineralKnowledge, extractionMarks } from "@/lib/town/reward-actions";
import { fieldRecipes } from "@/lib/town/reward-field";
import type { RewardInput, RewardReply, ExtractionRun, RewardTrail } from "@/lib/town/reward-types";
import { trailAnswer } from "@/lib/town/reward-trails";
import { walkable } from "@/lib/town/world";
import { RESOURCE_GIFTS,resourceRecipe,knownGemColors } from "@/lib/town/reward-resources";
import { ELEMENTS,GEMS } from "@/lib/town/tools";
import { held } from "@/lib/town/trade";
import { FISH,FISH_IDS,type FishId,type BaitId } from "@/lib/town/items";
import type { Current } from "@/lib/town/river-items";
import type { ResourceKind } from "@/lib/town/reward-types";
import TownIcon from "./TownIcon";
import TownComboFx from "./TownComboFx";
import { ITEMS } from "@/lib/town/trade";
import TownFoot from "./TownFoot";
import {LIFT_MOUTH,usableJourney} from "@/lib/town/reward-lift";
import type {LiftJourney} from "@/lib/town/reward-types";

type Props = { keeper:Keeper; th:boolean; at:()=>[number,number]|null };
const button="pressable pointer-events-auto min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-50";
const panel="pointer-events-auto w-full rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl backdrop-blur";
/** Keep the exact command through an uncertain network result, including a reload. */
export function useReward(keeper:Keeper, kind:string) {
  const key=`cashtown.reward-request.${keeper.id}.${kind}`;
  const pending=useRef<{request:string;input:RewardInput}|null>(null), sending=useRef(false);
  const [busy,setBusy]=useState(false),[reply,setReply]=useState<Did<RewardReply>|null>(null),[retry,setRetry]=useState(false);
  useEffect(()=>{try{const raw=sessionStorage.getItem(key);pending.current=raw?JSON.parse(raw):null;setRetry(!!pending.current);}catch{/* Storage is optional. */}},[key]);
  async function send(input?:RewardInput) {
    if (sending.current || !keeper.rewardDo) return;
    const cmd=pending.current ?? (input?{request:crypto.randomUUID(),input}:null);
    if (!cmd) return;
    pending.current=cmd;
    try{sessionStorage.setItem(key,JSON.stringify(cmd));}catch{/* Continue in memory. */}
    sending.current=true;setBusy(true);setRetry(false);
    try {
      const did=await keeper.rewardDo(cmd.input,cmd.request);setReply(did);
      pending.current=null;
      try{sessionStorage.removeItem(key);}catch{/* Storage is optional. */}
      return did;
    } catch { setRetry(true); }
    finally{sending.current=false;setBusy(false);}
  }
  return {send,busy,reply,retry,clear:()=>setReply(null)};
}
function Notice({did,th}:{did:Did<RewardReply>|null;th:boolean}) {
  if (!did || did.ok) return null;
  const words=did.why==="full" ? ["กระเป๋าเต็ม จัดของแล้วลองอีกครั้ง","Make room and try again"] : did.why==="spent" ? ["ใช้ครบสำหรับวันนี้แล้ว","No uses left today"] : did.why==="far" ? ["กลับไปยังจุดที่เริ่มไว้","Return to where you started"] : ["ยังใช้ที่นี่ไม่ได้ หรือไม่พบสิ่งที่เลือก","Not available here, or nothing matching was found"];
  return <p role="status" className="mt-2 text-ui">{words[th?0:1]}</p>;
}
export function TownPocketLift({keeper,th,at,floor,onRide}:Props&{floor:number;onRide:(ride:LiftJourney)=>void}){
  const action=useReward(keeper,"lift"),[open,setOpen]=useState(false),[expired,setExpired]=useState(false),applied=useRef<string[]>([]),p=keeper.purse(),anchor=p.professionRewards?.lift?.floor;
  const key=`cashtown.lift-applied.${keeper.id}`;
  useEffect(()=>{try{const ids=JSON.parse(sessionStorage.getItem(key)??"[]");if(Array.isArray(ids))applied.current=ids.filter(x=>typeof x==="string").slice(-64);}catch{/* In-memory acknowledgement still works. */}},[key]);
  useEffect(()=>{
    const ride=action.reply?.ok?action.reply.ride:undefined;if(!ride||applied.current.includes(ride.id))return;
    applied.current=[...applied.current,ride.id].slice(-64);try{sessionStorage.setItem(key,JSON.stringify(applied.current));}catch{/* Optional storage. */}
    if(!usableJourney(ride,keeper.now())){setExpired(true);return;}
    setOpen(false);setExpired(false);onRide(ride);
  },[action.reply,key,keeper,onRide]);
  if(!keeper.rewardDo||!works(p,"thingPocketLift"))return null;
  const here=at(),mouth=here&&Math.max(Math.abs(here[0]-LIFT_MOUTH[0]),Math.abs(here[1]-LIFT_MOUTH[1]))<=3;
  if(floor===0&&!mouth&&!action.retry&&!open)return null;
  const disabled=action.busy||action.retry;
  return <TownFoot rank={open?"board":"power"} icon={"thingPocketLift"} order={38}>
    <button className={button} onClick={()=>setOpen(x=>!x)} data-pocket-lift><TownIcon name="thingPocketLift" size={20}/>{th?"ลิฟต์พับ":"Folding lift"}</button>
    {open&&<section className={`${panel} mt-2 max-w-sm`} aria-label={th?"ลิฟต์พับใต้ดิน":"Folding cave lift"}>
      <p className="font-semibold">{anchor?(th?`ปักหลักไว้ที่ชั้น ${anchor}`:`Anchored on floor ${anchor}`):(th?"ยังไม่ได้ปักหลัก":"No floor anchored")}</p>
      <p className="my-2 text-ui">{th?`เหลือ ${usesLeft(p,"thingPocketLift",keeper.now())} เที่ยววันนี้ · หนึ่งเที่ยวคือไปหรือกลับ`:`${usesLeft(p,"thingPocketLift",keeper.now())} legs left today · Each direction counts once`}</p>
      {floor>0&&<button className={`${button} mr-2`} disabled={disabled} onClick={()=>{const t=at();if(t)void action.send({action:"liftAnchor",floor,at:t});}}>{th?"ปักหลักชั้นที่เคยทำงาน":"Anchor this worked floor"}</button>}
      {anchor&&(floor===anchor||floor===0)&&<button className={`${button} mt-2`} disabled={disabled} onClick={()=>{const t=at();if(t)void action.send({action:"liftRide",floor,to:floor===0?anchor:0,at:t});}}>{floor===0?(th?`ลงไปชั้น ${anchor}`:`Travel to floor ${anchor}`):(th?"กลับปากเหมือง":"Return to the mine mouth")}</button>}
      {!anchor&&<p className="mt-2 text-ui">{th?"ลงไปปักหลักบนชั้นที่เคยทำงานจริงก่อน":"Anchor a floor where you have worked first"}</p>}
      <Notice did={action.reply} th={th}/>
      {expired&&<p role="status" className="mt-2 text-ui">{th?"คำสั่งเดินทางนี้เก่าแล้ว ตรวจตำแหน่งปัจจุบันก่อนเดินทางครั้งใหม่":"This journey has expired. Check your location before making a new trip"}</p>}
      {action.retry&&<button className={`${button} mt-2`} onClick={()=>void action.send()}>{th?"ตรวจผลการเดินทางอีกครั้ง":"Check the journey again"}</button>}
    </section>}
  </TownFoot>;
}
export function TownBranchVein({keeper,th,at}:Props){
  const action=useReward(keeper,"branch"),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false),p=keeper.purse(),source=p.professionRewards?.branch;
  const stored=p.professionRewards?.resource,run=stored?.kind==="branch"&&keeper.now()<=stored.until?stored:null,live=source&&keeper.now()<=source.until;
  if(!keeper.rewardDo||!works(p,"charmBranchVein")||(!live&&!run&&!action.reply&&!action.retry))return null;
  const blocked=action.busy||action.retry||finishing;
  async function finish(answers:number[]){if(!run)return;setPlaying(false);setFinishing(true);try{const wait=Math.max(0,run.began+2400-keeper.now());if(wait)await new Promise(r=>setTimeout(r,wait));const t=at();if(t)await action.send({action:"resourceEnd",run:run.id,answers,at:t});}finally{setFinishing(false);}}
  return <TownFoot rank={open?"board":"power"} icon={"charmBranchVein"} order={42}>
    {!open?<button className={button} onClick={()=>setOpen(true)} data-vein-branch>{th?"สำรวจกิ่งสายแร่":"Explore the vein branch"}</button>:<section className={panel} aria-label={th?"กิ่งสายแร่":"Vein branch"}>
      <div className="mb-3 flex justify-between gap-2"><p className="font-semibold"><TownIcon name="charmBranchVein" size={24}/>{th?"เครื่องรางแยกสายแร่":"Branch-vein charm"}</p><button className={button} disabled={blocked||playing} onClick={()=>{setOpen(false);if(!live)action.clear();}}>{th?"พักไว้":"Pause"}</button></div>
      <p className="mb-3 text-ui">{th?`เลือกเพียงกิ่งเดียว · จบเกมใช้แรง 3 แม้พลาด · เหลือ ${usesLeft(p,"charmBranchVein",keeper.now())} ครั้งวันนี้`:`Choose one branch · A finished attempt costs 3 stamina even on a miss · ${usesLeft(p,"charmBranchVein",keeper.now())} left today`}</p>
      {run?(playing?<ExtractionGame key={run.id} run={{id:run.id,seed:run.node.seed}} th={th} onFinish={a=>void finish(a)}/>:<div className="flex flex-wrap gap-2"><button className={button} disabled={blocked} onClick={()=>setPlaying(true)}>{th?"เริ่มสกัดกิ่ง":"Begin the branch"}</button><button className={button} disabled={blocked} onClick={()=>{const t=at();if(t)void action.send({action:"resourceCancel",run:run.id,at:t});}}>{th?"เปลี่ยนกิ่ง":"Change the branch"}</button></div>):live?<div className="flex flex-wrap gap-2">{(["ore","crystal"] as const).filter(key=>source[key]).map(recipe=><button key={recipe} className={button} disabled={blocked} onClick={()=>{const t=at();if(t)void action.send({action:"resourceBegin",kind:"branch",recipe,at:t});}}>{ITEMS[source[recipe]!].name[th?"th":"en"]} ×{recipe==="ore"?4:3}</button>)}</div>:<p className="text-ui">{th?"กิ่งนี้จบแล้ว อ่านรอยแร่ใหม่เพื่อหาอีกกิ่ง":"This branch has ended. Read a new main vein to find another"}</p>}
      {action.reply?.ok&&action.reply.got&&<p role="status" className="mt-2">{action.reply.got.length?action.reply.got.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(", "):th?"กิ่งย่อยแตกเสียหาย ไม่ได้วัสดุเพิ่ม":"The branch crumbled without extra material"}</p>}
      <Notice did={action.reply} th={th}/>{action.retry&&<button className={`${button} mt-2`} onClick={()=>void action.send()}>{th?"ตรวจผลอีกครั้ง":"Check the result again"}</button>}
    </section>}
  </TownFoot>;
}
export function TownSchoolBell({keeper,th,tile,bait,current,star}:{keeper:Keeper;th:boolean;tile:[number,number];bait:BaitId;current:Current;star:boolean}){
  const action=useReward(keeper,"school"),[chosen,setChosen]=useState<FishId|null>(null),p=keeper.purse(),call=p.professionRewards?.school;
  if(!keeper.rewardDo||!works(p,"thingSchoolBell"))return null;
  // (not the time bands' newcomers: they only take what is no fish's place, so the bell cannot call them: lib/town/fishing's freshOdds)
  const known=FISH_IDS.filter(id=>FISH[id].tier!=="legend"&&!FISH[id].fresh&&(p.best[id]??0)>0),fish=chosen&&known.includes(chosen)?chosen:known[0];
  const active=call&&call.left>0&&keeper.now()<call.until;
  return <div className="mt-3 rounded-lg border border-[#c5cf93]/40 bg-[#24372f]/70 p-3 text-[#e6efbe]" data-school-bell>
    <p className="flex items-center gap-2 text-ui font-semibold"><TownIcon name="thingSchoolBell" size={24}/>{th?"กระดิ่งเรียกฝูง":"Shoal-calling bell"}</p>
    {active?<p className="mt-2 text-ui" role="status">{ITEMS[call.fish].name[th?"th":"en"]} · {th?`เหลือ ${call.left} การทอดเบ็ดที่เข้าเงื่อนไข`:`${call.left} eligible casts remain`}{star?(th?" · เหยื่อดาวจะไม่ใช้สิทธิ์นี้":" · Stardust leaves these charges intact"):""}</p>:<>
      <p className="mt-2 text-meta">{th?`น้ำหนักเข้าหาเหยื่อ 3 เท่า สำหรับสามการทอดเบ็ด ไม่รับประกันว่าจะกัด · เปิดได้อีก ${usesLeft(p,"thingSchoolBell",keeper.now())} ครั้งวันนี้`:`Triple draw weight for three casts, without guaranteeing a bite · ${usesLeft(p,"thingSchoolBell",keeper.now())} calls left today`}</p>
      {fish?<div className="mt-2 flex flex-wrap gap-2"><label className="text-meta">{th?"ปลาที่เคยจับ":"Fish you have caught"}<select className="block min-h-11 max-w-full rounded-lg border border-[#c5cf93]/40 bg-[#24372f] px-2 text-ui" value={fish} onChange={e=>setChosen(e.target.value as FishId)}>{known.map(id=><option value={id} key={id}>{ITEMS[id].name[th?"th":"en"]}</option>)}</select></label><button className="pressable min-h-11 rounded-lg bg-[#dce6a5] px-3 text-ui font-semibold text-[#24372f] disabled:opacity-50" disabled={star||action.busy||action.retry} onClick={()=>void action.send({action:"schoolStart",fish,bait,current,at:tile})}>{th?"เรียกฝูงด้วยเหยื่อนี้":"Call with this bait"}</button></div>:<p className="mt-2 text-meta">{th?"จับปลาธรรมดาสักชนิดก่อน แล้วกระดิ่งจะจำชนิดนั้นได้":"Catch a nonlegendary fish so the bell can learn it"}</p>}
    </>}
    {action.reply&&!action.reply.ok&&<p role="status" className="mt-2 text-ui">{th?"ยังเรียกปลาชนิดนี้ที่นี่ด้วยเหยื่อนี้ไม่ได้ หรือใช้สิทธิ์ครบแล้ว":"This fish cannot be called here with this bait, or today's calls are used"}</p>}
    {action.retry&&<button className="pressable min-h-11 underline" onClick={()=>void action.send()}>{th?"ตรวจผลอีกครั้ง":"Check the result again"}</button>}
  </div>;
}
export function TownOreCompass({keeper,th,at,floor}:Props & {floor:number}) {
  const action=useReward(keeper,`scan.${floor}`),[open,setOpen]=useState(false),known=mineralKnowledge(keeper.purse());
  if (!keeper.rewardDo || !works(keeper.purse(),"thingOreCompass")) return null;
  const did=action.reply;
  const directions={N:["เหนือ","North"],NE:["ตะวันออกเฉียงเหนือ","Northeast"],E:["ตะวันออก","East"],SE:["ตะวันออกเฉียงใต้","Southeast"],S:["ใต้","South"],SW:["ตะวันตกเฉียงใต้","Southwest"],W:["ตะวันตก","West"],NW:["ตะวันตกเฉียงเหนือ","Northwest"],here:["ใกล้จุดที่ยืน","Right here"]};
  return <TownFoot rank={open?"board":"power"} icon={"thingOreCompass"} order={39}>
    {!open ? <button className={button} type="button" onClick={()=>setOpen(true)} data-reward-compass>{th?"เข็มทิศสายแร่":"Ore compass"}</button> :
      <section className={panel} aria-label={th?"เข็มทิศสายแร่":"Ore compass"}>
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{th?`เลือกแร่ที่รู้จัก · ชั้น ${floor}`:`Known minerals · Floor ${floor}`}</h3><button className={button} onClick={()=>setOpen(false)}>{th?"ปิด":"Close"}</button></div>
        <p className="my-2 text-meta">{th?`เหลือ ${usesLeft(keeper.purse(),"thingOreCompass",keeper.now())} ครั้งวันนี้`:`${usesLeft(keeper.purse(),"thingOreCompass",keeper.now())} scans left today`}</p>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{known.map(id=><button className={button} key={id} disabled={action.busy||action.retry} onClick={()=>{const t=at();if(t)void action.send({action:"scan",floor,mineral:id,at:t});}}>{ITEMS[id].name[th?"th":"en"]}</button>)}</div>
        {!known.length&&<p>{th?"เก็บแร่ก่อน เข็มทิศจะจำชนิดที่เคยพบ":"Collect a mineral first so the compass learns it"}</p>}
        {did?.ok&&did.direction&&did.distance&&<p className="mt-3 font-semibold" role="status">{directions[did.direction][th?0:1]} · {({near:["ใกล้","Nearby"],mid:["ระยะกลาง","A little further"],far:["ไกล","Far away"]})[did.distance][th?0:1]}</p>}
        <Notice did={did} th={th}/>
        {action.retry&&<button className={`${button} mt-2`} onClick={()=>void action.send()}>{th?"ตรวจผลอีกครั้ง":"Check the result again"}</button>}
      </section>}
  </TownFoot>;
}
export function ExtractionGame({run,onFinish,th,label,width=.09,retryFirst=false}:{run:Pick<ExtractionRun,"seed"|"id">;onFinish:(marks:number[],miss?:import('@/lib/town/reward-camp').CampMiss)=>void;th:boolean;label?:string;width?:number;retryFirst?:boolean}) {
  const cursor=useRef<HTMLSpanElement>(null),began=useRef(0),marks=useRef<number[]>([]),locked=useRef(false);
  const [step,setStep]=useState(0),targets=extractionMarks(run.seed);
  const retried=useRef<import('@/lib/town/reward-camp').CampMiss|undefined>(undefined),[retryNote,setRetryNote]=useState(false);
  useEffect(()=>{let frame=0;began.current=performance.now();function tick(t:number){if(cursor.current)cursor.current.style.left=`${(1-Math.cos((t-began.current)/500))/2*100}%`;frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[run.id]);
  function cut(){if(locked.current)return;const mark=(1-Math.cos((performance.now()-began.current)/500))/2;if(retryFirst&&!retried.current&&Math.abs(mark-targets[marks.current.length])>width){retried.current={index:marks.current.length,mark};began.current=performance.now();setRetryNote(true);return;}marks.current.push(mark);if(marks.current.length===3){locked.current=true;onFinish(marks.current,retried.current);}else{setStep(marks.current.length);setRetryNote(false);}}
  return <div data-reward-extraction-game className="space-y-3">
    <p className="text-ui">{th?`กดเมื่อเส้นเข้าแถบสี · ${step+1}/3`:`Press when the line enters the coloured band · ${step+1}/3`}</p>
    {retryNote&&<p role="status" className="text-ui">{th?'ธงค่ายให้ลองจังหวะนี้ใหม่ได้หนึ่งครั้ง':'The camp pennant lets you replay this beat once.'}</p>}
    <div className="relative h-8 overflow-hidden rounded bg-ink/15" aria-hidden><span className="absolute inset-y-0 bg-accent/70" style={{left:`${(targets[step]-width)*100}%`,width:`${width*200}%`}}/><span ref={cursor} className="absolute inset-y-0 w-1 bg-ink"/></div>
    <button autoFocus className={`${button} w-full`} onClick={cut}>{label??(th?"สกัด":"Extract")}</button>
  </div>;
}
export function TownWoodExtraction({keeper,th,at}:Props) {
  const action=useReward(keeper,"extraction"),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false);
  const p=keeper.purse(),source=p.professionRewards?.extraction,run=p.professionRewards?.run;
  if (!keeper.rewardDo || !works(p,"thingForesterKnife") || (!source&&!action.reply&&!action.retry)) return null;
  async function finish(marks:number[]){if(!run)return;setPlaying(false);setFinishing(true);try{const delay=Math.max(0,run.began+2400-keeper.now());if(delay)await new Promise(resolve=>setTimeout(resolve,delay));const t=at();if(t)await action.send({action:"extractEnd",run:run.id,marks,at:t});}finally{setFinishing(false);}}
  return <TownFoot rank={open?"board":"power"} icon={"thingForesterKnife"} order={40}>
    {!open?<button className={button} onClick={()=>setOpen(true)}>{th?"แยกส่วนจากต้นที่โค่น":"Extract from the felled tree"}</button>:
      <section className={panel} aria-label={th?"แยกส่วนไม้":"Wood extraction"}>
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-semibold">{th?"มีดแยกส่วนช่างป่า":"Forester’s extraction knife"}</h3><button className={button} disabled={playing||action.busy||finishing} onClick={()=>{setOpen(false);if(!source)action.clear();}}>{th?"ปิด":"Close"}</button></div>
        {playing&&run?<ExtractionGame key={run.id} run={run} th={th} onFinish={marks=>void finish(marks)}/>:
          run&&keeper.now()<=run.until?<button className={button} disabled={action.busy||action.retry||finishing} onClick={()=>setPlaying(true)}>{th?"เริ่มสกัด":"Start extracting"}</button>:
            source&&keeper.now()<=source.until?<div className="flex flex-wrap gap-2">{(["bark","sap","seed"] as const).filter(part=>part!==source.excluded).map(part=><button key={part} className={button} disabled={action.busy||action.retry} onClick={()=>{const t=at();if(t)void action.send({action:"extractBegin",part,at:t});}}>{({bark:["เปลือก","Bark"],sap:["ยาง","Sap"],seed:["เมล็ด","Seed"]})[part][th?0:1]}</button>)}</div>:<p>{th?"โค่นต้นใหม่เพื่อเก็บส่วนเพิ่มเติม":"Fell another tree to collect an extra part"}</p>}
        {action.reply?.ok&&action.reply.got&&<p className="mt-2" role="status">{action.reply.got.length?action.reply.got.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(", "):th?"สกัดพลาด ลองต้นต่อไป":"The extraction missed. Try another tree."}</p>}
        <Notice did={action.reply} th={th}/>
        {action.retry&&<button className={`${button} mt-2`} onClick={()=>void action.send()}>{th?"ตรวจผลอีกครั้ง":"Check the result again"}</button>}
      </section>}
  </TownFoot>;
}

export function TrailMemory({node,identity,onFinish,th,theme="forest"}:{node:RewardTrail["nodes"][number];identity:string;onFinish:(answers:number[])=>void;th:boolean;theme?:"forest"|"hive"|"color"|"cave"|"wood"|"dragon"|"bean"}){
  const expected=trailAnswer(node),[flash,setFlash]=useState(true),[answers,setAnswers]=useState<number[]>([]),locked=useRef(false);
  useEffect(()=>{const timer=setTimeout(()=>setFlash(false),2400);return()=>clearTimeout(timer);},[identity]);
  const icons=theme==="bean"?["longBean","basil","seedRowBean"] as const:theme==="dragon"?["springSample","reedPith","loach"] as const:theme==="wood"?["pineBark","pinePitch","pineNut"] as const:theme==="cave"?["stone","quartzCore","wholeGeode"] as const:theme==="color"?["gemRuby","gemSapphire","gemAmber"] as const:theme==="hive"?["fragrantPetal","gardenHoney","beeswax"] as const:["fragrantPetal","mushroomSpores","rootFiber"] as const;
  const labels=theme==="bean"?(th?["ถั่ว","ใบ","เมล็ด"]:["Bean","Leaf","Seed"]):theme==="dragon"?(th?["น้ำ","กก","ปลา"]:["Water","Reed","Fish"]):theme==="wood"?(th?["เปลือก","ยาง","เมล็ด"]:["Bark","Pitch","Seed"]):theme==="cave"?(th?["หิน","ควอตซ์","จีโอด"]:["Stone","Quartz","Geode"]):theme==="color"?(th?["แดง","น้ำเงิน","อำพัน"]:["Red","Blue","Amber"]):theme==="hive"?(th?["กลีบ","น้ำผึ้ง","ไขผึ้ง"]:["Petal","Honey","Wax"]):th?["กลีบ","เห็ด","ราก"]:["Petal","Mushroom","Root"];
  function choose(n:number){if(locked.current)return;const next=[...answers,n];setAnswers(next);if(next.length===expected.length){locked.current=true;onFinish(next);}}
  return <div data-trail-memory className="space-y-3"><p>{flash?(th?"จำร่องรอยนี้ไว้":"Remember this trace"):(th?"เลือกภาพตามลำดับที่เห็น":"Choose the pictures in the order you saw")}</p>
    {flash?<div className="flex justify-center gap-4 rounded-lg bg-ink/10 p-4" aria-label={th?"ร่องรอยที่ต้องจำ":"The trace to remember"}>{expected.map((n,i)=><span key={i} className="flex flex-col items-center gap-1"><TownIcon name={icons[n]} size={36}/><span className="text-meta">{labels[n]}</span></span>)}</div>:
      <div className="flex flex-wrap justify-center gap-2">{icons.map((id,n)=><button key={id} className={button} onClick={()=>choose(n)}><TownIcon name={id} size={30}/><span className="ml-2">{labels[n]}</span></button>)}</div>}
    <p className="text-meta">{th?`เลือกแล้ว ${answers.length}/${expected.length}`:`${answers.length}/${expected.length} chosen`}</p>
  </div>;
}

export function TownResourceBench({keeper,th,at,place}:Props&{place:"forest"|"smith"}){
  const action=useReward(keeper,`resource.${place}`),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false);
  const [a,setA]=useState("gemRuby"),[b,setB]=useState("gemSapphire"),[target,setTarget]=useState("gemRuby"),heldAt=useRef<[number,number]|null>(null),position=()=>at()??heldAt.current;
  const p=keeper.purse(),stored=p.professionRewards?.resource,run=stored&&keeper.now()<=stored.until?stored:null;
  const kinds=(place==="forest"?["hive"]:["repair","color"]) as Exclude<ResourceKind,"branch">[],owned=kinds.filter(kind=>works(p,RESOURCE_GIFTS[kind]));
  if(!keeper.rewardDo||!owned.length)return null;
  const blocked=action.busy||action.retry||finishing;
  async function begin(kind:ResourceKind,recipe:string){const t=position();if(t)await action.send({action:"resourceBegin",kind,recipe,at:t});}
  async function finish(answers:number[]){if(!run)return;setPlaying(false);setFinishing(true);try{const delay=Math.max(0,run.began+2400-keeper.now());if(delay)await new Promise(resolve=>setTimeout(resolve,delay));const t=position();if(t)await action.send({action:"resourceEnd",run:run.id,answers,at:t});}finally{setFinishing(false);}}
  const title=place==="forest"?(th?"รังผึ้งต้นไม้ใหญ่":"Old-tree hive"):(th?"ประสานผลึกและสีพลอย":"Mend crystals and gem colours");
  const recipe=run?resourceRecipe(run.kind,run.recipe):null,colors=knownGemColors(p);
  function cost(kind:ResourceKind,key:string){return resourceRecipe(kind,key)?.needs.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(" + ");}
  return <TownFoot rank={open?"board":"power"} icon={place==="forest"?"thingTreeHive":"thingCrystalRepair"} order={44}>
    {!open?<button className={button} disabled={!at()} onClick={()=>{heldAt.current=at();setOpen(true);}}>{title}</button>:<section className={panel} aria-label={title}>
      <div className="mb-3 flex justify-between gap-2"><h3 className="font-semibold">{title}</h3><button className={button} disabled={blocked||playing} onClick={()=>setOpen(false)}>{th?"พักไว้":"Pause"}</button></div>
      <p className="mb-3 text-meta">{th?"จบเกมใช้แรง 3 และสิทธิ์หนึ่งครั้ง ถ้าพลาดยังเก็บวัตถุดิบไว้":"Finishing costs 3 stamina and one attempt. A miss keeps the ingredients."}</p>
      {run?(playing?(run.node.game==="timing"?<ExtractionGame key={run.id} run={{id:run.id,seed:run.node.seed}} th={th} onFinish={answers=>void finish(answers)}/>:<TrailMemory key={run.id} identity={run.id} node={run.node} theme={run.kind==="hive"?"hive":"color"} th={th} onFinish={answers=>void finish(answers)}/>):<div className="space-y-2">
        <p>{cost(run.kind,run.recipe)} → {recipe?.got.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(", ")}</p>
        <button className={button} disabled={blocked} onClick={()=>setPlaying(true)}>{th?"เริ่มประสาน":"Begin arranging"}</button>
        <button className="pressable ml-3 min-h-11 underline" disabled={blocked} onClick={()=>{const t=position();if(t)void action.send({action:"resourceCancel",run:run.id,at:t});}}>{th?"ยกเลิก":"Cancel"}</button>
      </div>):<div className="max-h-64 space-y-4 overflow-y-auto">
        {owned.includes("hive")&&<div className="space-y-2"><p>{cost("hive","honey")}</p><div className="flex gap-2">{(["honey","wax"] as const).map(key=><button className={button} key={key} disabled={blocked} onClick={()=>void begin("hive",key)}>{key==="honey"?(th?"ผลิตน้ำผึ้ง":"Make honey"):(th?"ผลิตไขผึ้ง":"Make wax")}</button>)}</div></div>}
        {owned.includes("repair")&&<div className="space-y-2"><p>{th?"ประสานจีโอด · ต้องมีเศษผลึก 10 + แกนควอตซ์ 2 + เชือกใยราก 1":"Mend a geode · 10 fragments + 2 quartz cores + 1 root twine"}</p><div className="flex flex-wrap gap-2">{ELEMENTS.filter(e=>held(p.bag,GEMS[e].chip)>=10).map(e=><button className={button} key={e} disabled={blocked} onClick={()=>void begin("repair",GEMS[e].chip)}>{ITEMS[GEMS[e].chip].name[th?"th":"en"]}</button>)}</div></div>}
        {owned.includes("color")&&<div className="space-y-2"><p>{th?"พลอยพื้นฐานสองสี + ผงจุดประกาย 1 → พลอยสีที่รู้จัก 1":"Two loose gem colours + 1 spark powder → 1 known gem"}</p><div className="grid grid-cols-2 gap-2">{([{value:a,set:setA,label:th?"พลอยเม็ดแรก":"First gem",ids:ELEMENTS.map(e=>GEMS[e].gem)},{value:b,set:setB,label:th?"พลอยเม็ดที่สอง":"Second gem",ids:ELEMENTS.map(e=>GEMS[e].gem)},{value:target,set:setTarget,label:th?"สีปลายทาง":"Target colour",ids:colors}]).map(({value,set,label,ids})=><label key={label} className="text-meta">{label}<select className="mt-1 min-h-11 w-full rounded-lg border border-ink/20 bg-bg p-2 text-ui" value={value} onChange={e=>set(e.target.value)}>{ids.map(id=><option key={id} value={id}>{ITEMS[id].name[th?"th":"en"]}</option>)}</select></label>)}</div><button className={button} disabled={blocked||a===b||!colors.includes(target as typeof colors[number])} onClick={()=>void begin("color",`${a}:${b}:${target}`)}>{th?"เลือกชุดประสานสี":"Choose these colours"}</button></div>}
      </div>}
      <p className="mt-3 text-meta">{owned.map(kind=>`${({hive:th?"รังผึ้ง":"Hive",repair:th?"ซ่อมผลึก":"Mending",color:th?"สีพลอย":"Colours"})[kind]} ${usesLeft(p,RESOURCE_GIFTS[kind],keeper.now())}`).join(" · ")}</p>
      {action.reply?.ok&&action.reply.got&&<p role="status" className="mt-2">{action.reply.got.length?action.reply.got.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(", "):th?"พลาดจังหวะ วัตถุดิบยังอยู่ครบ":"The rhythm missed. Your ingredients are intact."}</p>}
      <Notice did={action.reply} th={th}/>{action.retry&&<button className={button} onClick={()=>void action.send()}>{th?"ตรวจผลอีกครั้ง":"Check the result again"}</button>}
      {action.reply?.ok&&action.reply.correction&&action.reply.combo&&<div className="mt-3"><TownComboFx cue={action.reply.combo.cue} effect={action.reply.combo} th={th}/><p className="mt-2 text-ui">{th?"ภูตชวนให้ลองเรียงสีใหม่ วัตถุดิบและสิทธิ์ชุดเดิมยังอยู่":"The sprite invites you to arrange the colours again. Your ingredients and batch allowance remain."}</p></div>}
    </section>}
  </TownFoot>;
}
export function TownForestTrail({keeper,th,at,walk}:Props&{walk?:(x:number,y:number)=>boolean}){
  const action=useReward(keeper,"trail"),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false);
  const heldAt=useRef<[number,number]|null>(null),position=()=>at()??heldAt.current;
  const p=keeper.purse(),trail=p.professionRewards?.trail,node=trail?.nodes[trail.next];
  if(!keeper.rewardDo||(!works(p,"thingForestRing")&&!works(p,"thingStarBottle")&&!(trail?.kind==="dragon"&&works(p,"famRiverDragon"))))return null;
  async function finish(answers:number[]){if(!trail?.challenge)return;setPlaying(false);setFinishing(true);try{const delay=Math.max(0,trail.challenge.began+2400-keeper.now());if(delay)await new Promise(resolve=>setTimeout(resolve,delay));const t=position();if(t)await action.send({action:"trailEnd",trail:trail.id,challenge:trail.challenge.id,answers,at:t});}finally{setFinishing(false);}}
  async function start(){const t=position();if(!t||!trail||!node||Math.max(Math.abs(t[0]-node.at[0]),Math.abs(t[1]-node.at[1]))>3){if(t&&trail)await action.send({action:"trailStage",trail:trail.id,at:t});return;}if(!trail.challenge||keeper.now()>trail.challenge.until)await action.send({action:"trailStage",trail:trail.id,at:t});if(keeper.purse().professionRewards?.trail?.challenge)setPlaying(true);}
  function follow(){if(!node||!walk)return;const [x,y]=node.at;const choices=[[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1]];for(const [a,b]of choices)if(walkable(a,b)&&walk(a,b)){setOpen(false);break;}}
  const blocked=action.busy||action.retry||finishing;
  return <TownFoot rank={open?"board":"power"} icon={"thingForestRing"} order={43}>
    {!open?<button className={button} disabled={!at()} onClick={()=>{const t=at();if(t){heldAt.current=t;setOpen(true);}}}>{trail?(th?`ตามรอยส่วนตัว · จุด ${trail.next+1}/3`:`Personal trail · Trace ${trail.next+1}/3`):(th?"เปิดเส้นทางภูตป่า":"Open a forest spirit trail")}</button>:<section className={panel} aria-label={th?"เส้นทางส่วนตัว":"Personal trail"}>
      <div className="mb-3 flex justify-between gap-2"><h3 className="font-semibold">{trail?.kind==="dragon"?(th?"ตามรอยมังกรสายธาร":"Follow the river dragon"):trail?.kind==="star"?(th?"ตามร่องรอยดาว":"Follow star traces"):(th?"ตามรอยภูตป่า":"Follow forest spirit traces")}</h3><button className={button} disabled={playing||blocked} onClick={()=>setOpen(false)}>{th?"พักไว้":"Pause"}</button></div>
      {!trail?<div className="flex flex-wrap gap-2">{(["forest","star"] as const).filter(kind=>works(p,kind==="forest"?"thingForestRing":"thingStarBottle")).map(kind=><button key={kind} className={button} disabled={blocked} onClick={()=>{const t=position();if(t)void action.send({action:"trailBegin",kind,at:t});}}>{kind==="forest"?(th?"รอยภูต · 2 เส้นทาง/วัน":"Spirit traces · 2 trails/day"):(th?"รอยดาว · 1 เส้นทาง/วัน":"Star traces · 1 trail/day")}</button>)}</div>:
        playing&&node&&trail.challenge?(node.game==="timing"?<ExtractionGame run={{id:trail.challenge.id,seed:node.seed}} th={th} onFinish={answers=>void finish(answers)}/>:<TrailMemory key={trail.challenge.id} identity={trail.challenge.id} node={node} theme={trail.kind==="dragon"?"dragon":"forest"} th={th} onFinish={answers=>void finish(answers)}/>):
          <div className="space-y-3"><p>{th?`ร่องรอย ${trail.next+1}/3 · กลับมาต่อที่จุดนี้ได้`:`Trace ${trail.next+1}/3 · Your progress stays here`}</p><div className="flex flex-wrap gap-2"><button className={button} disabled={blocked} onClick={follow}>{th?"เดินไปหาร่องรอย":"Walk to the trace"}</button><button className={button} disabled={blocked} onClick={()=>void start()}>{th?"อ่านร่องรอย":"Read the trace"}</button></div>
            <button className="pressable min-h-11 text-meta underline" disabled={blocked} onClick={()=>{const t=position();if(t)void action.send({action:"trailCancel",trail:trail.id,at:t});}}>{th?"เลิกเส้นทางนี้ (ไม่คืนสิทธิ์เริ่ม)":"Abandon this trail (the start remains used)"}</button></div>}
      {action.reply?.ok&&action.reply.got&&<p role="status" className="mt-2">{action.reply.got.length?action.reply.got.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(", "):th?"ยังไม่ได้วัสดุจากร่องรอยนี้":"No materials from this trace yet"}{action.reply.completed?(th?" · ครบเส้นทางแล้ว":" · Trail completed"):""}</p>}
      <Notice did={action.reply} th={th}/>{action.retry&&<button className={`${button} mt-2`} onClick={()=>void action.send()}>{th?"ตรวจผลอีกครั้ง":"Check the result again"}</button>}
    </section>}
  </TownFoot>;
}

export function TownFieldProcessor({keeper,th,at,kind,floor}:Props & {kind:"wood"|"mineral";floor?:number}) {
  const action=useReward(keeper,`process.${kind}`),[open,setOpen]=useState(false),gift=kind==="wood"?"thingPocketSawmill":"famDwarf";
  const p=keeper.purse(),recipes=fieldRecipes(p,kind);
  if(!keeper.rewardDo||!works(p,gift)||(kind==="mineral"&&(!floor||floor<1)))return null;
  const title=kind==="wood"?["โรงเลื่อยพับได้","Folding sawmill"]:["ภูตคนแคระแปรแร่","Dwarven mineral spirit"];
  return <TownFoot rank={open?"board":"power"} icon={gift} order={41}>
    {!open?<button className={button} onClick={()=>setOpen(true)}>{title[th?0:1]}</button>:<section className={panel} aria-label={title[th?0:1]}>
      <div className="flex items-center justify-between"><h3 className="font-semibold">{title[th?0:1]}</h3><button className={button} onClick={()=>setOpen(false)}>{th?"ปิด":"Close"}</button></div>
      <p className="my-2 text-ui">{th?`เหลือ ${usesLeft(p,gift,keeper.now())} ชุดวันนี้ · ใช้สูตร เครื่องมือ และวัสดุเดิม`:`${usesLeft(p,gift,keeper.now())} batches left today · Original tools and ingredients required`}</p>
      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{recipes.map(recipe=><button key={recipe} className={button} disabled={action.busy||action.retry} onClick={()=>{const t=at();if(t)void action.send({action:"process",kind,recipe,at:t,...(floor?{floor}:{})});}}>{ITEMS[recipe].name[th?"th":"en"]}</button>)}</div>
      {!recipes.length&&<p>{th?"ทำสูตรแปรรูปสำเร็จที่ครัวก่อน แล้วนำสูตรนั้นมาใช้ระหว่างเดินทาง":"Make a processing recipe at the kitchen first, then bring that recipe on the road"}</p>}
      {action.reply?.ok&&action.reply.got&&<p role="status" className="mt-2">{action.reply.got.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(", ")}</p>}
      <Notice did={action.reply} th={th}/>
      {action.retry&&<button className={`${button} mt-2`} onClick={()=>void action.send()}>{th?"ตรวจผลอีกครั้ง":"Check the result again"}</button>}
    </section>}
  </TownFoot>;
}
