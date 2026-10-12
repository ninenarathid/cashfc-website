"use client";
import {useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {works,usesLeft} from '@/lib/town/gifts';
import {WOOD,farFrom,lookOf} from '@/lib/town/trees';
import {partReady} from '@/lib/town/tree-parts';
import {pactNode,pactLoot} from '@/lib/town/reward-pact';
import {ITEMS} from '@/lib/town/trade';
import {useReward,TrailMemory} from './TownRewardActions';
import TownFoot from './TownFoot';
import TownIcon from './TownIcon';
import type {PactRun} from '@/lib/town/reward-types';
const button='pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-40';
export default function TownTreePact({keeper,th,at,near,onCare}:{keeper:Keeper;th:boolean;at:[number,number]|null;near:boolean;onCare:(tree:number)=>void}){
 const a=useReward(keeper,'pact'),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false),p=keeper.purse(),run=p.professionRewards?.pact,now=keeper.now(),told=keeper.trees();
 const tree=at?WOOD.filter(t=>!t.elder&&lookOf(told,t.id,now)===3&&farFrom(t,at)<=1).sort((a,b)=>a.id-b.id)[0]:null;
 if(!keeper.rewardDo||!works(p,'charmTreePact')||!near)return null;
 const blocked=a.busy||a.retry||finishing;
 async function finish(answers:number[]){if(!run||!at)return;setPlaying(false);setFinishing(true);try{const d=await a.send({action:'pactEnd',run:run.id,answers,at});if(d?.ok&&d.got?.length)onCare(run.tree);}finally{setFinishing(false);}}
 return <TownFoot rank={open?'board':'chip'} order={60}>
  <button className={`${button} pointer-events-auto`} data-pact-open onClick={()=>setOpen(v=>!v)}><TownIcon name="charmTreePact" size={22}/>{th?'ดูแลต้นที่ยังยืน':'Tend a living tree'}</button>
  {open&&<section aria-label={th?'สนธิสัญญาต้นไม้':'Living-tree pact'} className="pointer-events-auto mt-2 w-[min(360px,calc(100vw-24px))] max-h-[64dvh] overflow-y-auto rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl">
   <p className="mb-3 text-ui">{th?'น้ำจริง 1 ถัง · ปุ๋ย 1 · แรง 2 ต่อครั้ง · วันละสามครั้ง เลือกส่วนแล้วจำลำดับการดูแลให้ถูก ต้นไม้จะยังยืนอยู่':'One real bucketful · One compost · Two stamina per attempt · Three a day. Choose a part and remember the care sequence; the tree stays standing.'}</p>
   {run&&playing?<TrailMemory key={run.id} identity={run.id} node={pactNode(run)} theme="wood" th={th} onFinish={v=>void finish(v)}/>:
    run&&now<=run.until?<div className="flex flex-wrap gap-2"><button className={button} disabled={blocked||!at} onClick={()=>setPlaying(true)}>{th?'ทำลำดับเดิมต่อ':'Continue this sequence'}</button><button className="pressable min-h-11 underline" disabled={blocked} onClick={()=>{if(at)void a.send({action:'pactCancel',at});}}>{th?'ยกเลิกการดูแล':'Cancel care'}</button></div>:
    tree?<div className="flex flex-wrap gap-2">{(['bark','sap','seed','root'] as PactRun['part'][]).map(part=>{const [item,n]=pactLoot(part);return <button key={part} data-pact-part={part} className={button} disabled={blocked||!partReady(told?.parts,tree.id,part,now)||usesLeft(p,'charmTreePact',now)<1} onClick={async()=>{if(at){const d=await a.send({action:'pactBegin',tree:tree.id,part,at});if(d?.ok)setPlaying(true);}}}><TownIcon name={item} size={22}/>{ITEMS[item].name[th?'th':'en']} ×{n}</button>;})}</div>:<p>{th?'ถือถังน้ำแล้วมายืนข้างต้นไม้ที่โตเต็มที่':'Hold a filled bucket beside a grown tree'}</p>}
   <p className="mt-3 text-meta">{th?'ส่วนที่เก็บแล้วพัก 10 นาทีร่วมกับการโค่น มีด และการฟังหัวใจไม้ โค่นและเก็บไม้ซุงได้ตามปกติ พลาดยังใช้น้ำ ปุ๋ย แรง และสิทธิ์ครั้งนี้':'Each collected part rests ten minutes across care, felling, knife and heartwood listening. Logs remain available. A miss still spends the water, compost, stamina and attempt.'}</p>
   {a.reply&&!a.reply.ok&&<p role="status" className="mt-2">{a.reply.why==='full'?(th?'กระเป๋าเต็ม จัดที่แล้วลองผลเดิมอีกครั้ง':'Bag full; make room and retry the same result'):th?'ตรวจน้ำ ปุ๋ย สิทธิ์วันนี้ และต้นที่ยังไม่มีใครกำลังโค่น':'Check water, compost, today’s uses and that nobody is felling this tree'}</p>}
   {a.reply?.ok&&a.reply.got&&<p role="status" className="mt-2">{a.reply.got.length?a.reply.got.map(([id,n])=>`${ITEMS[id].name[th?'th':'en']} ×${n}`).join(', '):th?'ลำดับผิด ต้นยังยืนอยู่แต่ใช้ของดูแลไปแล้ว':'The sequence missed; the tree stands, and care supplies were spent'}</p>}
   {a.retry&&<button className={button} onClick={()=>void a.send()}>{th?'ตรวจผลเดิมอีกครั้ง':'Check the same result'}</button>}
  </section>}
 </TownFoot>;
}
