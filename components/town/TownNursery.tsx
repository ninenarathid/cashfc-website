"use client";
import {useRef,useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {works,usesLeft} from '@/lib/town/gifts';
import {nurseryKnown,nurseryNode,nurseryLoot,nurseryPlace} from '@/lib/town/reward-nursery';
import {ITEMS} from '@/lib/town/trade';
import type {WoodPart} from '@/lib/town/wood-grain';
import {useReward,TrailMemory,ExtractionGame} from './TownRewardActions';
import TownFoot from './TownFoot';
import TownIcon from './TownIcon';
const button='pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-50';
const kindNames:Record<string,[string,string]>={pine:['สน','Pine'],ironwood:['ไม้เหล็ก','Ironwood'],moonwood:['ไม้จันทร์','Moonwood'],elder:['สนโบราณ','Ancient cedar']};
export default function TownNursery({keeper,th,at}:{keeper:Keeper;th:boolean;at:[number,number]|null}){
 const a=useReward(keeper,'nursery'),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false),[kinds,setKinds]=useState(['pine','pine','pine']),heldAt=useRef(at);
 const p=keeper.purse(),run=p.professionRewards?.nursery,known=nurseryKnown(p),node=run?nurseryNode(run):null;
 if(!keeper.rewardDo||!works(p,'thingTinyForest')||(!run&&!nurseryPlace(at??[])))return null;
 const blocked=a.busy||a.retry||finishing,position=at??heldAt.current,near=position&&run&&Math.max(...position.map((n,i)=>Math.abs(n-run.at[i])))<=2;
 async function finish(answers:number[]){if(!run?.challenge||!position)return;setPlaying(false);setFinishing(true);try{const wait=Math.max(0,run.challenge.began+2400-keeper.now());if(wait)await new Promise(r=>setTimeout(r,wait));await a.send({action:'nurseryEnd',nursery:run.id,challenge:run.challenge.id,answers,at:position});}finally{setFinishing(false);}}
 return <TownFoot rank={open?"board":"power"} icon="thingTinyForest" order={51}>
  <button className={`${button} pointer-events-auto`} data-nursery-open onClick={()=>{if(at)heldAt.current=at;setOpen(v=>!v);if(!open&&at)void a.send({action:'nurseryLook',at});}}><TownIcon name="thingTinyForest" size={22}/>{th?'ดูแลป่าในขวด':'Tend the bottle forest'}</button>
  {open&&<section className="pointer-events-auto mt-2 w-[min(370px,calc(100vw-24px))] max-h-[66dvh] overflow-y-auto rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl" aria-label={th?'ป่าในขวด':'Bottle forest'}>
   <div className="flex items-center gap-3"><TownIcon name="thingTinyForest" size={46}/><p className="text-ui">{th?'เมล็ดสนสามเมล็ด · เริ่มวันละครั้ง · สามต้นรวมสูงสุดหกส่วน · เล่นแต่ละครั้งใช้แรง 2 ไม่เพิ่มไม้ซุงหรือไม้แปรรูป':'Three pine seeds · One start a day · Three trees, up to six parts · 2 stamina per attempt. Creates no logs or timber'}</p></div>
   {run?<>
    <ol className="my-3 flex gap-2">{run.kinds.map((k,i)=><li key={i} aria-current={i===run.next?'step':undefined} className={`flex-1 rounded border border-ink/15 p-2 text-center text-ui ${i===run.next?'bg-accent/15':''}`}><TownIcon name={i<run.next?'pineBark':'pineNut'} size={26}/><br/>{kindNames[k]?.[th?0:1]} {i+1}{i<run.next?' ✓':''}</li>)}</ol>
    {!near?<p>{th?'กลับจุดที่วางขวดเพื่อเล่นต่อ':'Return to the bottle’s starting place to continue'}</p>:playing&&node&&run.challenge?(node.game==='timing'?<ExtractionGame run={{id:run.challenge.id,seed:node.seed}} th={th} label={th?'เก็บส่วนที่โตแล้ว':'Gather the grown part'} onFinish={v=>void finish(v)}/>:<TrailMemory key={run.challenge.id} identity={run.challenge.id} theme="wood" node={node} th={th} onFinish={v=>void finish(v)}/>):<div className="mt-3 flex flex-wrap gap-2">{(['wood','bark','sap','seed','root'] as WoodPart[]).filter(part=>!run.part||part===run.part).map(part=>{const [item,n]=nurseryLoot(run.kinds[run.next],part);return <button className={button} key={part} data-nursery-part={part} disabled={blocked} onClick={async()=>{if(position){const d=await a.send({action:'nurseryStage',nursery:run.id,part,at:position});if(d?.ok)setPlaying(true);}}}><TownIcon name={item} size={20}/>{ITEMS[item].name[th?'th':'en']} ×{n}</button>;})}</div>}
    <p className="mt-2 text-meta">{th?'เลือกส่วนก่อนเล่น ต้นละหนึ่งความพยายาม พลาดเสียแรงและข้ามต้นนั้น พักได้ก่อนเริ่มโจทย์ถัดไป':'Choose the part before playing. One played attempt per tree; a miss costs stamina and forfeits it. Pause before the next challenge'}</p>
    {!playing&&<button className="pressable mt-2 min-h-11 underline" disabled={blocked} onClick={()=>{if(position)void a.send({action:'nurseryCancel',nursery:run.id,at:position});}}>{th?'จบรอบนี้ · ไม่คืนเมล็ดหรือสิทธิ์':'End this nursery · Seeds and start stay spent'}</button>}
   </>:<>
    <div className="my-3 flex gap-2">{kinds.map((k,i)=><label key={i} className="flex-1 text-ui">{th?`ต้น ${i+1}`:`Tree ${i+1}`}<select value={known.includes(k)?k:known[0]??''} disabled={blocked} className="block min-h-11 w-full rounded border border-ink/20 bg-bg px-1" onChange={e=>setKinds(v=>v.map((n,j)=>i===j?e.target.value:n))}>{known.map(v=><option key={v} value={v}>{kindNames[v]?.[th?0:1]}</option>)}</select></label>)}</div>
    <p className="mb-2 text-meta">{th?'เลือกชนิดที่เคยโค่น ซ้ำได้ เฉพาะต้นโบราณให้ไม้ต่างชนิด เมล็ดสนทำให้รู้จักต้นสน':'Choose kinds you have felled; repeats are allowed. Only ancient trees change the wood output. Pine seeds teach pine'}</p>
    <button className={button} data-nursery-begin disabled={blocked||!position||!known.length||usesLeft(p,'thingTinyForest',keeper.now())<1} onClick={()=>{if(position)void a.send({action:'nurseryBegin',kinds:kinds.map(k=>known.includes(k)?k:known[0]),at:position});}}>{th?'ปลูกสามต้นในขวด':'Plant three bottle trees'}</button>
   </>}
   {a.reply?.ok&&a.reply.got&&<p role="status" className="mt-3 text-ui">{a.reply.completed?(th?'ครบสามต้นแล้ว · ':'All three trees tended · '):''}{a.reply.got.length?a.reply.got.map(([id,n])=>`${ITEMS[id].name[th?'th':'en']} ×${n}`).join(', '):th?'จังหวะพลาด ข้ามต้นนี้แล้ว':'A missed care step; this tree was forfeited'}</p>}
   {a.reply&&!a.reply.ok&&<p role="status" className="mt-3 text-ui">{a.reply.why==='full'?(th?'จัดกระเป๋าแล้วกลับมาเก็บส่วนเดิมได้':'Make room and gather this same part again'):(th?'ถือขวาน เตรียมเมล็ดสนจริงสามเมล็ด และตรวจจุดวางขวดกับสิทธิ์วันนี้':'Hold an axe, bring three actual pine seeds, and check the bottle’s location and today’s start')}</p>}
   {a.retry&&<button className={`${button} mt-2`} onClick={()=>void a.send()}>{th?'ตรวจผลอีกครั้ง':'Check result again'}</button>}
  </section>}
 </TownFoot>;
}
