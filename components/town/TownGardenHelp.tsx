"use client";
import {useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {works,usesLeft} from '@/lib/town/gifts';
import {see} from '@/lib/town/farm';
import {bedOf} from '@/lib/town/world';
import {ExtractionGame,useReward} from './TownRewardActions';
import TownFoot from './TownFoot';
const button='pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-bg disabled:opacity-40';
export default function TownGardenHelp({keeper,th,at}:{keeper:Keeper;th:boolean;at:[number,number]|null}){
 const a=useReward(keeper,'help-garden'),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),p=keeper.purse(),r=p.professionRewards?.revive,run=r&&r.until>keeper.now()?r:null;
 if(!at||bedOf(...at)<0||!keeper.rewardDo||!['famGardenMender','thingReviveSeed'].some(g=>works(p,g)))return null;
 const key=at.join(','),plot=keeper.farm()[key],jobs=(p.professionRewards?.failedGarden??[]).filter(j=>j.until>keeper.now()&&j.owner!==keeper.id&&j.key===key),dead=!!plot?.plant&&plot.plant.by!==keeper.id&&see(key,plot,keeper.now(),keeper.rains()).dead,busy=a.busy||a.retry;
 if(!open&&!run&&!jobs.length&&!dead)return null;
 async function finish(marks:number[],campMiss?:import("@/lib/town/reward-camp").CampMiss){if(!run||!at)return;setPlaying(false);const ms=Math.max(0,run.began+2400-keeper.now());if(ms)await new Promise(r=>setTimeout(r,ms));await a.send({action:'reviveEnd',run:run.id,marks,at,...(campMiss?{campMiss}:{})});}
 return <TownFoot rank={open?"board":"power"} icon="famGardenMender" order={65}><button className={`${button} pointer-events-auto`} data-garden-help onClick={()=>setOpen(v=>!v)}>{th?'ช่วยสวนเพื่อน':'Help a friend’s garden'}</button>{open&&<section className="pointer-events-auto mt-2 w-[min(380px,calc(100vw-24px))] max-h-[62dvh] overflow-y-auto rounded-xl bg-bg/95 p-3 text-ink">
  {works(p,'famGardenMender')&&<div className="mb-4"><p className="mb-2 text-ui">{th?'ภูตซ่อมได้หนึ่งจังหวะที่พลาดจริงจากงานแถวของเพื่อน ภายในสิบนาที ยังใช้เครื่องมือ น้ำและแรงเดิม ยืนที่ต้นที่พลาดแล้วกดซ่อม':'Recover an actually missed beat from a friend’s row within ten minutes. The original held tool, water and stamina still apply. Stand at the missed plot to recover it.'}</p>{jobs.map(j=><button key={j.id} data-help-mend className={button} disabled={busy} onClick={()=>void a.send({action:'helpMend',job:j.id,at})}>{th?'ซ่อมจังหวะนี้':'Recover this beat'} · {usesLeft(p,'famGardenMender',keeper.now())}/10</button>)}{!jobs.length&&<p className="text-meta">{th?'จุดนี้ไม่มีจังหวะพลาดที่ยังซ่อมได้':'No recoverable missed beat at this plot.'}</p>}</div>}
  {works(p,'thingReviveSeed')&&<><p className="mb-3 text-ui">{th?'ชุบต้นเพื่อนที่ตายจากแมลงและยังไม่เคยเก็บ ผ่านสามจังหวะให้กลับมาโตครึ่งหนึ่ง ใช้เมล็ดพันธุ์เดิมหนึ่งเมล็ด ยาฆ่าแมลงหนึ่งชุดและแรง 3 ต้นละครั้ง ไม่ใช้กับผักยักษ์':'Rescue a retained pest-killed friend’s root before its first harvest. Three beats restore half growth with one original seed, one pest cure and three stamina. Once per root; excludes giants.'}</p>{run?(playing?<ExtractionGame retryFirst={p.campRetry?.line==="helpers"&&p.campRetry.until>keeper.now()} run={run} width={.07} th={th} label={th?'ประคองราก':'Steady the root'} onFinish={(m,miss)=>void finish(m,miss)}/>:<button className={button} data-revive-play disabled={busy} onClick={()=>setPlaying(true)}>{th?'ประคองรากสามจังหวะ':'Steady the root in three beats'}</button>):<button className={button} data-revive-begin disabled={busy||!dead} onClick={()=>void a.send({action:'reviveBegin',at})}>{th?'ช่วยต้นนี้':'Rescue this root'} · {usesLeft(p,'thingReviveSeed',keeper.now())}/3</button>}</>}
  {a.reply?.ok&&a.reply.helpPassed===false&&<p role="status">{th?'ยังประคองไม่สำเร็จ เมล็ดและยายังอยู่':'The root slipped; your seed and cure remain.'}</p>}{a.reply&&!a.reply.ok&&<p role="status">{th?'ตรวจต้นเดิม ตำแหน่ง เครื่องมือ ของใช้และสิทธิ์วันนี้':'Check the original root, position, tool, supplies and daily allowance.'}</p>}{a.retry&&<button className={button} onClick={()=>void a.send()}>{th?'ตรวจคำสั่งเดิม':'Check the same request'}</button>}
 </section>}</TownFoot>;
}
