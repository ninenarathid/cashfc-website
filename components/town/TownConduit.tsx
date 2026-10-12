"use client";
import {useState} from "react";
import type {Keeper} from "@/lib/town/keeper";
import {works} from "@/lib/town/gifts";
import {conduitAnswer} from "@/lib/town/reward-conduit";
import {useReward} from "./TownRewardActions";
import TownIcon from "./TownIcon";
import TownFoot from "./TownFoot";
const button="pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-50";
function Valve({turn,active}:{turn:number;active?:boolean}){
 return <svg width="64" height="44" viewBox="0 0 64 44" aria-hidden className="shrink-0"><path d="M0 22H26" stroke="#7b725b" strokeWidth="8"/>{[0,1,2].map(i=><path key={i} d={`M34 22L60 ${[5,22,39][i]}`} stroke={i===turn?(active?'#a7dfcd':'#d5bd83'):'#4d5651'} strokeWidth="6"/>)}<circle cx="30" cy="22" r="10" fill="#79664a"/><path d={`M24 22H32L46 ${[9,22,35][turn]}`} fill="none" stroke={active?'#c3eee0':'#eed3a0'} strokeWidth="4"/></svg>;
}
export default function TownConduit({keeper,th,at,onWatered}:{keeper:Keeper;th:boolean;at:[number,number]|null;onWatered:(keys:string[])=>void}){
 const a=useReward(keeper,"conduit"),[open,setOpen]=useState(false),[answers,setAnswers]=useState([1,1,1]),[finishing,setFinishing]=useState(false),p=keeper.purse(),run=p.professionRewards?.conduit;
 if(!keeper.rewardDo||(!works(p,"thingRiverHorn")&&!run))return null;
 if(!at&&!run&&!a.retry)return null;
 const blocked=a.busy||a.retry||finishing,expected=run?conduitAnswer(run.seed):null,near=run&&at&&at.every((v,i)=>v===run.at[i]);
 async function finish(){if(!run||!at)return;setFinishing(true);try{const wait=Math.max(0,run.began+2400-keeper.now());if(wait)await new Promise(r=>setTimeout(r,wait));const did=await a.send({action:"conduitEnd",run:run.id,answers,at});if(did?.ok)onWatered(did.watered??[]);}finally{setFinishing(false);}}
 return <TownFoot rank={open?"board":"chip"} order={47}>
  <button className={`${button} pointer-events-auto`} data-conduit-open onClick={()=>setOpen(v=>!v)}><TownIcon name="thingRiverHorn" size={22}/>{th?"ต่อทางน้ำด้วยแตร":"Connect the water branches"}</button>
  {open&&<section className="pointer-events-auto mt-2 w-[min(370px,calc(100vw-24px))] max-h-[66dvh] overflow-y-auto rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl" aria-label={th?"ต่อทางน้ำสามแขนง":"Three water branches"}>
   <p className="mb-3 text-ui">{th?"ต่อช่องออกให้เข้าทางสวนทั้งสามแขนง รดเฉพาะแขนงที่ถูก · น้ำจริงเท่าเดิม · แรง 1 ต่อเกม + 1 ต่อถังน้ำ · แปลงพักแตร 90 นาที":"Match each outlet to its garden branch. Correct branches only · Real water · 1 stamina per game + 1 per bucketful · 90-minute bed cooldown"}</p>
   {run?<>
    {!near&&<p role="status" className="mb-2 text-ui">{th?"กลับไปยืนที่จุดเริ่มเพื่อต่อทางน้ำ":"Return to the starting tile to connect the flow"}</p>}
    <div className="space-y-2">{expected!.map((target,i)=>{
     const width=Math.ceil(run.roots.length/3),count=run.roots.slice(i*width,(i+1)*width).length;
     return <div key={i} className="rounded-lg border border-ink/15 bg-ink/5 p-2">
      <div className="flex items-center justify-between gap-2"><span className="text-ui">{th?`แขนง ${i+1} · ${count} ต้น`:`Branch ${i+1} · ${count} roots`}</span><Valve turn={target}/></div>
      <div className="flex items-center justify-between gap-2"><Valve turn={answers[i]} active={target===answers[i]}/><button className={button} data-conduit-valve={i} disabled={blocked||!near} aria-label={th?`หมุนวาล์ว ${i+1}`:`Turn valve ${i+1}`} onClick={()=>setAnswers(v=>v.map((n,j)=>j===i?(n+1)%3:n))}>{th?"หมุนวาล์ว":"Turn valve"}</button></div>
     </div>;
    })}</div>
    <div className="mt-3 flex flex-wrap gap-2"><button className={button} data-conduit-finish disabled={blocked||!near} onClick={()=>void finish()}>{th?"ปล่อยน้ำตามทาง":"Release the flow"}</button><button className={button} disabled={blocked} onClick={()=>void a.send({action:"conduitCancel",at:run.at})}>{th?"พับทางน้ำ":"Fold the conduit"}</button></div>
   </>:<button className={button} data-conduit-start disabled={blocked||!at} onClick={()=>{if(at)void a.send({action:"conduitBegin",at});}}>{th?"วางทางน้ำในแปลงนี้":"Lay this bed's conduit"}</button>}
   {a.reply&&<p role="status" className="mt-3 text-ui">{a.reply.ok&&a.reply.watered?(th?`น้ำถึง ${a.reply.watered.length} ต้น ใช้ ${a.reply.used} ถังน้ำ`:`Water reached ${a.reply.watered.length} roots, using ${a.reply.used} bucketfuls`):!a.reply.ok?(a.reply.why==="spent"?(th?"แปลงนี้กำลังพักแตร ยังรดน้ำธรรมดาได้":"This bed rests the horn; ordinary watering still works"):a.reply.why==="far"?(th?"ต้องอยู่ในแปลง และกลับจุดเริ่มเพื่อจบเกม":"Stand in a bed and return to the starting point to finish"):(th?"ถือถังที่มีน้ำและเลือกแปลงที่มีต้นกระหายน้ำก่อน":"Hold a filled bucket and choose a bed with thirsty plants")):""}</p>}
   {a.retry&&<button className={`${button} mt-2`} onClick={()=>void a.send()}>{th?"ตรวจผลอีกครั้ง":"Check result again"}</button>}
  </section>}
 </TownFoot>;
}
