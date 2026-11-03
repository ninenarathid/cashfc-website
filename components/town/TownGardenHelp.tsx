"use client";
import {useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {works,usesLeft} from '@/lib/town/gifts';
import {see} from '@/lib/town/farm';
import {bedOf} from '@/lib/town/world';
import {ExtractionGame,useReward} from './TownRewardActions';
import TownFoot from './TownFoot';
import TownIcon from './TownIcon';
/**
 * Helping a friend's garden with the helpers' later gifts: the garden fairy (famGardenMender, rank 7) mends a beat a
 * friend really missed in a row of theirs, and the seed of returning life (rank 9) rescues a friend's root that pests
 * killed. Laid out as the boat's panel is (the owner, 2026-11-04: make it really usable): a card for each, what it
 * costs and how many are left today, and why a press was refused.
 */
const primary='pressable min-h-11 w-full rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-40';
const WHY:Record<string,[th:string,en:string]>={
 spent:['วันนี้ใช้ครบแล้ว','None left today'],
 far:['ยืนที่ต้นนั้นก่อน','Stand at that plot first'],
 full:['กระเป๋าเต็ม จัดของก่อน','Make room in your bag first'],
};
export default function TownGardenHelp({keeper,th,at}:{keeper:Keeper;th:boolean;at:[number,number]|null}){
 const a=useReward(keeper,'help-garden'),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),p=keeper.purse(),r=p.professionRewards?.revive,run=r&&r.until>keeper.now()?r:null;
 if(!at||bedOf(...at)<0||!keeper.rewardDo||!['famGardenMender','thingReviveSeed'].some(g=>works(p,g)))return null;
 const key=at.join(','),plot=keeper.farm()[key],jobs=(p.professionRewards?.failedGarden??[]).filter(j=>j.until>keeper.now()&&j.owner!==keeper.id&&j.key===key),dead=!!plot?.plant&&plot.plant.by!==keeper.id&&see(key,plot,keeper.now(),keeper.rains()).dead,busy=a.busy||a.retry;
 if(!open&&!run&&!jobs.length&&!dead)return null;
 const mends=usesLeft(p,'famGardenMender',keeper.now()),seeds=usesLeft(p,'thingReviveSeed',keeper.now());
 const why=a.reply&&!a.reply.ok?(WHY[a.reply.why as string]??['ตรวจต้นเดิม ตำแหน่ง เครื่องมือ และของที่ต้องใช้','Check the root, where you stand, your tool and supplies']):null;
 async function finish(marks:number[],campMiss?:import("@/lib/town/reward-camp").CampMiss){if(!run||!at)return;setPlaying(false);const ms=Math.max(0,run.began+2400-keeper.now());if(ms)await new Promise(r=>setTimeout(r,ms));await a.send({action:'reviveEnd',run:run.id,marks,at,...(campMiss?{campMiss}:{})});}
 const chip=(n:number,of:number)=><span className="ml-auto shrink-0 rounded-full border border-line-strong px-2.5 py-0.5 font-data text-meta tabular-nums text-muted">{th?`เหลือ ${n}/${of}`:`${n}/${of} left`}</span>;
 return <TownFoot rank={open?"board":"power"} icon="famGardenMender" order={65}>
  <button className="pressable pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-line-lit bg-surface/95 pl-2 pr-3 text-ui font-semibold text-ink shadow-lg shadow-black/30" aria-expanded={open} data-garden-help onClick={()=>setOpen(v=>!v)}><TownIcon name="famGardenMender" size={26}/>{th?'ช่วยสวนเพื่อน':'Help a friend’s garden'}</button>
  {open&&<section className="pop-in pointer-events-auto mt-2 w-[min(380px,calc(100vw-24px))] max-h-[62dvh] overflow-y-auto rounded-xl border border-line-lit bg-surface/97 text-ink shadow-xl shadow-black/40 backdrop-blur-sm" aria-labelledby="town-help-h">
   <div className="flex items-center gap-2 border-b border-line px-4 py-3"><TownIcon name="famGardenMender" size={30}/><h2 id="town-help-h" className="min-w-0 truncate font-display text-title font-semibold">{th?'ช่วยสวนเพื่อน':'Help a friend’s garden'}</h2></div>
   <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
    {works(p,'famGardenMender')&&<div className="rounded-lg border border-line p-3" data-help-mend-card>
     <p className="mb-1 flex items-center gap-2 text-ui font-semibold"><TownIcon name="famGardenMenderM1" size={22}/>{th?'ภูตซ่อมจังหวะสวน':'The garden fairy'}{chip(mends,10)}</p>
     <p className="mb-2 text-meta text-ink/80">{th?'ซ่อมหนึ่งจังหวะที่เพื่อนพลาดจริงในแถวสวน ภายใน 10 นาที ใช้เครื่องมือ น้ำ และแรงเหมือนเดิม':'Mends one beat a friend really missed in a row, within ten minutes, with the same tool, water and stamina'}</p>
     {jobs.length?jobs.map(j=><button key={j.id} data-help-mend className={primary} disabled={busy||!mends} onClick={()=>void a.send({action:'helpMend',job:j.id,at}).then(d=>{if(d?.ok)window.dispatchEvent(new Event('town:fairy-mend'));})}>{th?'ซ่อมจังหวะนี้':'Mend this beat'}</button>)
      :<p className="text-meta text-muted">{th?'ต้นนี้ไม่มีจังหวะที่พลาดให้ซ่อม ยืนที่ช่องที่เพื่อนพลาด':'Nothing to mend here: stand where a friend missed a beat'}</p>}
    </div>}
    {works(p,'thingReviveSeed')&&<div className="rounded-lg border border-line p-3" data-revive-card>
     <p className="mb-1 flex items-center gap-2 text-ui font-semibold"><TownIcon name="thingReviveSeed" size={22}/>{th?'เมล็ดคืนชีวิต':'Seed of returning life'}{chip(seeds,3)}</p>
     <p className="mb-2 text-meta text-ink/80">{th?'ชุบต้นเพื่อนที่ตายจากแมลงและยังไม่เคยเก็บ ประคองรากสามจังหวะ ต้นกลับมาโตครึ่งหนึ่ง ใช้เมล็ดเดิม 1 ยาฆ่าแมลง 1 และแรง 3 (ไม่ใช้กับผักยักษ์)':'Brings back a friend’s pest-killed root before its first picking: steady it in three beats and it grows half back. One of its seed, one pest cure, three stamina (not giants)'}</p>
     {run?(playing?<ExtractionGame retryFirst={p.campRetry?.line==="helpers"&&p.campRetry.until>keeper.now()} run={run} width={.07} th={th} label={th?'ประคองราก':'Steady the root'} onFinish={(m,miss)=>void finish(m,miss)}/>:<button className={primary} data-revive-play disabled={busy} onClick={()=>setPlaying(true)}>{th?'ประคองรากสามจังหวะ':'Steady the root in three beats'}</button>)
      :dead?<button className={primary} data-revive-begin disabled={busy||!seeds} onClick={()=>void a.send({action:'reviveBegin',at})}>{th?'ช่วยต้นนี้':'Rescue this root'}</button>
      :<p className="text-meta text-muted">{th?'ยืนที่ต้นของเพื่อนที่ตายจากแมลง':'Stand at a friend’s root that pests killed'}</p>}
    </div>}
    {a.reply?.ok&&a.reply.helpPassed===false&&<p role="status" className="text-meta text-accent">{th?'ยังประคองไม่สำเร็จ เมล็ดและยายังอยู่':'The root slipped; your seed and cure remain'}</p>}
    {why&&<p role="status" className="text-meta text-accent" data-help-why>{why[th?0:1]}</p>}
    {a.retry&&<button className="pressable min-h-11 rounded-lg border border-line-strong px-3 py-2 text-ui text-ink" onClick={()=>void a.send()}>{th?'ส่งคำสั่งเดิมอีกครั้ง':'Send the same request again'}</button>}
   </div>
  </section>}
 </TownFoot>;
}
