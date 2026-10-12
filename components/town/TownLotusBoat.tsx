"use client";
import {useEffect,useRef,useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {BOAT_ROUTES,boatPosition,setLotusBoats,type LotusBoat} from '@/lib/town/lotus-boats';
import type {BoatInput} from '@/lib/town/reward-boat';
import {works} from '@/lib/town/gifts';
import {FOREST} from '@/lib/town/world';
import type {FarmDraw} from './TownFarm';
import {useReward} from './TownRewardActions';
import TownFoot from './TownFoot';
const button='pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-40';
export default function TownLotusBoat({keeper,th,at,register}:{keeper:Keeper;th:boolean;at:[number,number]|null;register?:(draw:FarmDraw|null)=>void}){
 const [rows,setRows]=useState<LotusBoat[]>([]),[open,setOpen]=useState(false),[,tick]=useState(0),view=useRef(rows),where=useRef(at),a=useReward(keeper,'boat');view.current=rows;where.current=at;
 const near=!!at&&at[0]>=FOREST.x&&at[0]<FOREST.x+FOREST.w&&at[1]>=FOREST.y&&at[1]<FOREST.y+FOREST.h,pointer=!!keeper.purse().professionRewards?.boat;
 useEffect(()=>{
  if(!near&&!pointer)return;
  let done=false;const sync=()=>{const next=keeper.boats?.()??[];setLotusBoats(next,keeper.id,()=>keeper.now());view.current=next;if(!done)setRows(next);};
  const read=async()=>{try{await keeper.boatsLook?.(where.current??[0,0]);sync();}catch{/* Confirmed leases expire independently; retry the shared reader. */}};
  void read();const off=keeper.watch(sync),timer=setInterval(()=>void read(),15000),clock=setInterval(()=>tick(n=>n+1),500);
  return()=>{done=true;off();clearInterval(timer);clearInterval(clock);};
 },[keeper,near,pointer]);
 useEffect(()=>{register?.(f=>{
  const {ctx,project,s,things,onScreen,still}=f,now=keeper.now();
  for(const r of BOAT_ROUTES){const c=project({x:r.dock[0]+.5,y:r.dock[1]+.5});if(!onScreen(c))continue;things.push({depth:r.dock[0]+r.dock[1]+.9,draw:()=>{ctx.fillStyle='#544331';ctx.fillRect(Math.round(c.x-6*s),Math.round(c.y-9*s),Math.round(12*s),Math.round(3*s));ctx.fillStyle='#b69b64';ctx.fillRect(Math.round(c.x-5*s),Math.round(c.y-10*s),Math.round(10*s),Math.max(1,Math.round(s)));}});}
  for(const b of view.current){if(b.until<=now||!BOAT_ROUTES[b.site])continue;const p=boatPosition(b,now),c=project(p);if(!onScreen(c))continue;
   things.push({depth:p.x+p.y-.12,draw:()=>{
    const bob=still?0:Math.round(Math.sin(now/600)*s),poly=(v:[number,number][],color:string,dy=0)=>{ctx.fillStyle=color;ctx.beginPath();v.forEach(([x,y],i)=>{const q=project({x:p.x+x,y:p.y+y});if(i)ctx.lineTo(Math.round(q.x),Math.round(q.y+dy*s+bob));else ctx.moveTo(Math.round(q.x),Math.round(q.y+dy*s+bob));});ctx.closePath();ctx.fill();};
    poly([[-.6,-.38],[.38,-.6],[.66,.38],[-.38,.64]],'#254d50',3);
    for(let n=0;n<3;n++){const drift=still?0:(now/800+n)%3;const q=project({x:p.x-.52+drift*.12,y:p.y+.57});ctx.fillStyle='#7ac3b3';ctx.fillRect(Math.round(q.x-(5+n)*s),Math.round(q.y+(2+n)*s),Math.round((10+2*n)*s),Math.max(1,Math.round(s)));}
    poly([[-.7,-.18],[-.45,-.62],[.12,-.72],[.64,-.4],[.74,.14],[.36,.68],[-.28,.69],[-.65,.32]],'#335847',-3);
    poly([[-.63,-.17],[-.41,-.55],[.11,-.65],[.56,-.35],[.67,.12],[.32,.61],[-.26,.61],[-.58,.28]],'#68955c',-5);
    poly([[-.49,-.16],[-.31,-.44],[.1,-.51],[.43,-.28],[.51,.1],[.25,.47],[-.2,.47],[-.44,.2]],'#9daf70',-5);
    for(const [x,y]of [[-.4,-.4],[.42,-.3],[.4,.4],[-.4,.4]]){const u=project(p),z=project({x:p.x+x,y:p.y+y});ctx.strokeStyle='#b4c388';ctx.lineWidth=Math.max(1,Math.round(s));ctx.beginPath();ctx.moveTo(Math.round(u.x),Math.round(u.y-5*s+bob));ctx.lineTo(Math.round(z.x),Math.round(z.y-5*s+bob));ctx.stroke();}
    for(let j=0;j<5;j++){const u=-.24+j*.12;poly([[u-.035,-.3],[u+.035,-.3],[u+.035,.3],[u-.035,.3]],j%2?'#82734b':'#a08b58',-6);}
    poly([[-.1,-.42],[.03,-.52],[.18,-.4],[.02,-.34]],'#d8d889',-6);
    const stern=project({x:p.x-.4,y:p.y+.3});ctx.fillStyle='#b09160';ctx.fillRect(Math.round(stern.x-10*s),Math.round(stern.y-7*s+bob),Math.round(18*s),Math.max(1,Math.round(2*s)));
   }});
  }
 });return()=>register?.(null);},[register,keeper]);
 if(!at)return null;
 const t=keeper.now(),active=rows.filter(b=>b.until>t),own=active.find(b=>b.owner===keeper.id||b.guest===keeper.id),site=BOAT_ROUTES.findIndex(r=>r.dock.every((n,i)=>n===at[i])),available=active.filter(b=>b.open&&b.station===0&&b.owner!==keeper.id&&BOAT_ROUTES[b.site]?.dock.every((n,i)=>n===at[i])),moving=!!own?.trip&&own.trip.arrives>t;
 if(!near&&!own||!own&&!works(keeper.purse(),'thingLotusBoat')&&!available.length)return null;
 const send=(boat:Omit<BoatInput,'at'>)=>void a.send({action:'boat',boat,at}),disabled=a.busy||a.retry||moving;
 return <TownFoot rank={open?'board':'chip'} order={56}><button className={`${button} pointer-events-auto`} data-boat-open onClick={()=>setOpen(v=>!v)}>{th?'เรือใบบัว':'Lotus boat'}</button>{open&&<section className="pointer-events-auto mt-2 w-[min(350px,calc(100vw-24px))] max-h-[62dvh] overflow-y-auto rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl" aria-label={th?'เรือใบบัว':'Lotus boat'}>
  <p className="mb-3 text-ui">{th?'ล่องไปจุดตกปลากลางน้ำด้วยความเร็วเดิน ใช้แรง 2 อยู่ 30 นาที เปิดที่นั่งให้เพื่อนหนึ่งคนขึ้นเองได้ ทุกคนต้องเก็บสายก่อนเดินทางกลับ':'Sail at ordinary walking speed to a midstream fishing spot. Two stamina, thirty minutes. Offer one seat for a friend to accept. Finish fishing before returning.'}</p>
  {own?<div className="flex flex-wrap gap-2">{moving?<p role="status">{th?'กำลังล่องเรือ…':'Sailing…'}</p>:own.station===0?<>{own.owner===keeper.id&&<><button className={button} disabled={disabled} data-boat-seat onClick={()=>send({action:'open',owner:own.owner,open:!own.open})}>{own.open?(th?'ปิดที่นั่ง':'Close seat'):th?'เปิดที่นั่งให้เพื่อน':'Offer a seat'}</button><button className={button} disabled={disabled} data-boat-depart onClick={()=>send({action:'depart',owner:own.owner})}>{th?'ล่องไปกลางน้ำ':'Sail midstream'}</button></>}<button className={button} disabled={disabled} onClick={()=>send({action:'leave',owner:own.owner})}>{th?'ลงเรือ':'Disembark'}</button></>:<button className={button} disabled={disabled} data-boat-return onClick={()=>send({action:'return',owner:own.owner})}>{th?'กลับฝั่งด้วยกัน':'Return to the bank'}</button>}</div>:<div className="flex flex-col gap-2">{site>=0&&works(keeper.purse(),'thingLotusBoat')?<button className={button} disabled={disabled} data-boat-launch onClick={()=>send({action:'launch',site})}>{th?'วางเรือที่ท่านี้':'Launch at this dock'}</button>:works(keeper.purse(),'thingLotusBoat')&&<p>{th?'ท่าเรือ':'Docks'}: {BOAT_ROUTES.map(r=>r.dock.join(',')).join(' / ')}</p>}{available.map(b=><button key={b.owner} className={button} disabled={disabled} data-boat-join onClick={()=>send({action:'join',owner:b.owner})}>{th?'ขึ้นเรือของ':'Board'} {b.name??b.owner.slice(0,8)}</button>)}</div>}
  {a.reply&&!a.reply.ok&&<p role="status" className="mt-3">{th?'ตรวจตำแหน่งท่า ที่นั่งว่าง และสายตกปลาของทุกคนบนเรือ':'Check the dock, the offered seat and everyone’s fishing lines'}</p>}{a.retry&&<button className={button} onClick={()=>void a.send()}>{th?'ตรวจคำสั่งเดิม':'Check the same request'}</button>}
 </section>}</TownFoot>;
}
