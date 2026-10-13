"use client";
import {useEffect,useRef,useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {CROSSINGS,setTemporaryCrossings,type TemporaryCrossing} from '@/lib/town/temporary-crossings';
import {works,usesLeft} from '@/lib/town/gifts';
import {FOREST} from '@/lib/town/world';
import type {FarmDraw} from './TownFarm';
import {useReward} from './TownRewardActions';
import TownFoot from './TownFoot';
import TownIcon from './TownIcon';
const button='pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-40';
export default function TownBeaverBridge({keeper,th,at,register}:{keeper:Keeper;th:boolean;at:[number,number]|null;register?:(draw:FarmDraw|null)=>void}){
 const [rows,setRows]=useState<TemporaryCrossing[]>([]),[open,setOpen]=useState(false),[reading,setReading]=useState(false),a=useReward(keeper,'bridge'),view=useRef(rows);view.current=rows;
 const near=!!at&&at[0]>=FOREST.x&&at[0]<FOREST.x+FOREST.w&&at[1]>=FOREST.y&&at[1]<FOREST.y+FOREST.h;
 useEffect(()=>{
  if(!near||!keeper.bridgesLook)return;
  let stopped=false;const sync=()=>{const next=keeper.bridges?.()??[];setTemporaryCrossings(next,()=>keeper.now());view.current=next;if(!stopped)setRows(next);};
  const read=async()=>{try{await keeper.bridgesLook?.();sync();}catch{/* Keep the last confirmed bridge until its own expiry; polling retries. */}finally{if(!stopped)setReading(false);}};
  setReading(true);void read();const off=keeper.watch(sync),timer=setInterval(()=>void read(),15000);
  return ()=>{stopped=true;off();clearInterval(timer);};
 },[near,keeper]);
 useEffect(()=>{register?.(f=>{
  const {ctx,project,onScreen,s,things,still}=f;
  for(let site=0;site<CROSSINGS.length;site++){
   const crossing=CROSSINGS[site],active=view.current.find(r=>r.site===site&&r.until>keeper.now());
   for(const bank of [crossing.a,crossing.b]){const c=project({x:bank[0]+.5,y:bank[1]+.5});if(!onScreen(c))continue;
    things.push({depth:bank[0]+bank[1]+1,draw:()=>{const px=Math.max(1,Math.round(s));ctx.fillStyle='#4b3828';ctx.fillRect(Math.round(c.x-2*s),Math.round(c.y-18*s),3*px,19*px);ctx.fillStyle='#bc985f';ctx.fillRect(Math.round(c.x-s),Math.round(c.y-17*s),px,17*px);ctx.fillStyle='#754f33';ctx.fillRect(Math.round(c.x-7*s),Math.round(c.y-18*s),13*px,6*px);ctx.fillStyle='#d5b37b';ctx.fillRect(Math.round(c.x-6*s),Math.round(c.y-17*s),11*px,px);ctx.fillStyle='#e1ca94';ctx.fillRect(Math.round(c.x-2*s),Math.round(c.y-15*s),4*px,px);}});
   }
   if(!active)continue;
   for(const [x,y] of crossing.tiles){const c=project({x:x+.5,y:y+.5});if(!onScreen(c))continue;
    things.push({depth:x+y+.9,draw:()=>{
     const polygon=(points:[number,number][],color:string,lift=0)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([u,v],i)=>{const c=project({x:x+u,y:y+v}),cx=Math.round(c.x),cy=Math.round(c.y-lift*s);if(i)ctx.lineTo(cx,cy);else ctx.moveTo(cx,cy);});ctx.closePath();ctx.fill();};
     polygon([[.07,0],[.93,0],[.93,1],[.07,1]],'#47392b',2);
     for(let j=0;j<4;j++){const v=j/4;polygon([[.1,v+.01],[.9,v+.01],[.9,v+.23],[.1,v+.23]],j%2?'#947448':'#a18050',5);polygon([[.13,v+.015],[.87,v+.015],[.87,v+.055],[.13,v+.055]],'#bd9b64',5);}
     for(const u of [.12,.86]){const a=project({x:x+u,y:y}),b=project({x:x+u,y:y+1});ctx.strokeStyle='#625037';ctx.lineWidth=Math.max(1,Math.round(s));ctx.beginPath();ctx.moveTo(Math.round(a.x),Math.round(a.y-7*s));ctx.lineTo(Math.round(b.x),Math.round(b.y-7*s));ctx.stroke();}
    }});
   }
   if(f.self&&Math.min(...[crossing.a,crossing.b].map(b=>Math.hypot(f.self!.x-b[0],f.self!.y-b[1])))<5){const c=project({x:crossing.a[0]+.5,y:crossing.a[1]+.5});f.sign(th?`สะพาน · ${Math.ceil((active.until-keeper.now())/60000)} นาที`:`Bridge · ${Math.ceil((active.until-keeper.now())/60000)} min`,c.x,c.y-27*s);}
  }
 });return ()=>register?.(null);},[register,keeper,th]);
 const p=keeper.purse(),own=works(p,'famBeaver'),site=at?CROSSINGS.findIndex(s=>[s.a,s.b].some(b=>b.every((n,i)=>n===at[i]))):-1;
 if(!near||!own||!keeper.rewardDo)return null;
 const active=rows.find(r=>r.site===site&&r.until>keeper.now());
 return <TownFoot rank={open?"board":"power"} icon="famBeaver" order={55}>
  <button className={`${button} pointer-events-auto`} data-beaver-open onClick={()=>setOpen(v=>!v)}><TownIcon name="famBeaver" size={24}/>{th?'บีเวอร์ทำทางข้าม':'Beaver crossings'}</button>
  {open&&<section className="pointer-events-auto mt-2 w-[min(360px,calc(100vw-24px))] max-h-[64dvh] overflow-y-auto rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl" aria-label={th?'สะพานบีเวอร์':'Beaver bridge'}>
   <p className="mb-3 text-ui">{th?'สะพานร่วมกันวันละหนึ่งแห่ง อยู่ 30 นาที ใช้ใยราก 2 และแรง 3 ทุกคนเดินข้ามได้ด้วยความเร็วเดิม หมดเวลาแล้วจะกลับฝั่งใกล้ที่สุดอย่างปลอดภัย':'One shared bridge per day, lasting thirty minutes. Two root fibres and three stamina. Everyone walks at their usual speed; expiry brings travellers to the nearest bank.'}</p>
   {site>=0?<><p className="mb-2">{th?`จุดนี้ใช้ไม้ซุง ${CROSSINGS[site].logs} ท่อน`:`This crossing needs ${CROSSINGS[site].logs} logs`}</p><button data-beaver-build className={button} disabled={!!active||reading||a.busy||a.retry||usesLeft(p,'famBeaver',keeper.now())<1} onClick={()=>{if(at)void a.send({action:'bridgeBuild',site,at});}}>{active?(th?'สะพานยังใช้งานอยู่':'Bridge is already open'):th?'ให้บีเวอร์สร้างตรงนี้':'Build here with the beaver'}</button></>:<><p className="mb-2">{th?'ยืนตรงหลักริมฝั่งที่กำหนด':'Stand at a marked bank post'}</p><ul className="list-inside list-disc text-ui">{CROSSINGS.map((s,i)=><li key={i}>{th?`จุด ${i+1}`:`Site ${i+1}`} · {s.a.join(',')} / {s.b.join(',')} · {s.logs} {th?'ไม้ซุง':'logs'}</li>)}</ul></>}
   {a.reply&&<p role="status" className="mt-3">{a.reply.ok?(th?'ทางข้ามพร้อมแล้ว ชวนเพื่อนเดินได้':'The crossing is ready for everyone'):th?'ตรวจไม้ซุง ใยราก บีเวอร์ที่ติดตาม จุดหลักฝั่ง และสิทธิ์วันนี้':'Check logs, root fibres, following beaver, the bank post and today’s use'}</p>}
   {a.retry&&<button className={button} onClick={()=>void a.send()}>{th?'ตรวจสะพานเดิมอีกครั้ง':'Check the same bridge'}</button>}
  </section>}
 </TownFoot>;
}
