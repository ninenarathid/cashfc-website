"use client";
import {useState} from "react";
import type {Keeper} from "@/lib/town/keeper";
import type {Stander} from "@/lib/town/line";
import {works,usesLeft} from "@/lib/town/gifts";
import {bedOf,bedCorner} from "@/lib/town/world";
import {ExtractionGame,useReward} from "./TownRewardActions";
import TownFoot from "./TownFoot";
import TownIcon from "./TownIcon";
const button="pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-50";
export default function TownCloud({keeper,th,at,people}:{keeper:Keeper;th:boolean;at:[number,number]|null;people?:()=>Stander[]}){
 const a=useReward(keeper,"cloud"),[open,setOpen]=useState(false),[beds,setBeds]=useState<number[]>([]),[giver,setGiver]=useState(''),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false);
 const p=keeper.purse(),run=p.professionRewards?.cloud,own=works(p,'thingCloudJar'),bed=at?bedOf(...at):-1,owners=keeper.owners(),mine=bed>=0&&owners.get(bed)?.by===keeper.id;
 if(!keeper.rewardDo||(!at&&!run)||(!own&&!mine&&!run))return null;
 const blocked=a.busy||a.retry||finishing,selected=beds.length?beds:bed>=0?[bed]:[],near=at&&run&&at.every((n,i)=>n===run.at[i]);
 async function finish(marks:number[]){if(!run||!at)return;setPlaying(false);setFinishing(true);try{const wait=Math.max(0,run.began+2400-keeper.now());if(wait)await new Promise(r=>setTimeout(r,wait));await a.send({action:'cloudEnd',run:run.id,marks,at});}finally{setFinishing(false);}}
 return <TownFoot rank={open?'board':'chip'} order={50}>
  <button className={`${button} pointer-events-auto`} data-cloud-open onClick={()=>setOpen(v=>!v)}><TownIcon name="thingCloudJar" size={22}/>{th?'เมฆเหนือสวน':'Garden clouds'}</button>
  {open&&<section className="pointer-events-auto mt-2 w-[min(370px,calc(100vw-24px))] max-h-[66dvh] overflow-y-auto rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl" aria-label={th?'เมฆเหนือสวน':'Garden clouds'}>
   <p className="mb-3 text-ui">{th?'น้ำพิเศษจริงหนึ่งถัง · แรง 6 · จบเกมได้วันละครั้ง แม้พลาด ฝนอยู่ที่ต้นเดิมสิบนาที คุณน้ำให้ผลครั้งเดียว ต้นละวันละครั้ง':'One real special bucketful · 6 stamina · One finished game a day, including a miss. Ten-minute rain on existing roots; water nature applies once per root per day'}</p>
   {run?(playing?<ExtractionGame run={run} th={th} label={th?'เคาะจังหวะเรียกเมฆ':'Beat the cloud rhythm'} onFinish={marks=>void finish(marks)}/>:<div className="flex flex-wrap gap-2"><button className={button} data-cloud-play disabled={blocked||!near} onClick={()=>setPlaying(true)}>{th?'เริ่มเคาะเรียกเมฆ':'Start the cloud rhythm'}</button><button className={button} disabled={blocked} onClick={()=>void a.send({action:'cloudCancel',at:run.at})}>{th?'เก็บไห':'Put the jar away'}</button>{!near&&<p>{th?'กลับจุดเริ่มก่อน':'Return to the starting tile'}</p>}</div>):own&&at&&bed>=0?<>
    <div className="mb-3 grid grid-cols-2 gap-2">{Array.from(owners).filter(([n])=>{const c=bedCorner(n);return Math.max(Math.abs(c[0]+4-at[0]),Math.abs(c[1]+4-at[1]))<=20;}).map(([n,o])=><label key={n} className="flex min-h-11 items-center gap-2 rounded border border-ink/15 p-2 text-ui"><input type="checkbox" checked={selected.includes(n)} disabled={blocked||(!selected.includes(n)&&selected.length>=3)} onChange={e=>setBeds(e.target.checked?[...selected,n]:selected.filter(v=>v!==n))}/>{th?`แปลง ${n+1}`:`Bed ${n+1}`} · {o.name}</label>)}</div>
    <p className="mb-2 text-meta">{th?'เพื่อนต้องอนุญาตไหของเราในแปลงเขาก่อน คำอนุญาตอยู่สิบนาทีและถอนได้':'Friends must permit this jar from their bed first. Consent lasts ten minutes and can be revoked'}</p>
    <button className={button} data-cloud-begin disabled={blocked||selected.length<1||usesLeft(p,'thingCloudJar',keeper.now())<1} onClick={()=>void a.send({action:'cloudBegin',beds:selected,at})}>{th?'เตรียมไหในแปลงเหล่านี้':'Prepare these beds'}</button>
   </>:null}
   {mine&&at&&!run&&<div className="mt-3 border-t border-ink/15 pt-3"><label className="text-ui">{th?'อนุญาตไหของเพื่อน':'Permit a friend’s jar'}<select value={giver} onChange={e=>setGiver(e.target.value)} className="mt-1 block min-h-11 w-full rounded border border-ink/20 bg-bg px-2"><option value="">{th?'เลือกเพื่อนในแผนที่':'Choose a friend on the map'}</option>{(people?.()??[]).filter(s=>s.id!==keeper.id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="mt-2 flex flex-wrap gap-2"><button className={button} disabled={blocked||!giver} onClick={()=>void a.send({action:'cloudConsent',giver,at})}>{th?'อนุญาต 10 นาที':'Permit for 10 minutes'}</button><button className={button} disabled={blocked} onClick={()=>void a.send({action:'cloudConsent',giver:null,at})}>{th?'ถอนคำอนุญาต':'Revoke consent'}</button></div></div>}
   {a.reply&&<p role="status" className="mt-3 text-ui">{a.reply.ok?(a.reply.watered?(a.reply.watered.length?(th?`เมฆให้น้ำ ${a.reply.watered.length} ต้น`:`Cloud reached ${a.reply.watered.length} roots`):(th?'จังหวะขาด เมฆสลาย ใช้น้ำและสิทธิ์แล้ว':'The rhythm broke; water and today’s attempt were spent')):a.reply.consented!==undefined?(a.reply.consented?(th?'อนุญาตแล้ว':'Permission granted'):(th?'ถอนแล้ว':'Permission revoked')):''):a.reply.why==='theirs'?(th?'เจ้าของแปลงยังไม่อนุญาตไหนี้ หรือถอนคำอนุญาตแล้ว':'The bed owner has not permitted this jar, or revoked consent'):(th?'ถือถังที่มีน้ำพิเศษ และเลือกต้นที่ยังแห้ง ไม่ได้ฝนไหวันนี้ ตรวจจุดยืนและสิทธิ์ที่เหลือ':'Hold special water and choose dry roots that have not had jar rain today. Check your location and remaining use')}</p>}
   {a.retry&&<button className={`${button} mt-2`} onClick={()=>void a.send()}>{th?'ตรวจผลอีกครั้ง':'Check result again'}</button>}
  </section>}
 </TownFoot>;
}
