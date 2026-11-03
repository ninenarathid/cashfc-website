"use client";
import {useEffect,useRef,useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {BOAT_ROUTES,boatDrawn,setLotusBoats,type LotusBoat} from '@/lib/town/lotus-boats';
import type {BoatInput} from '@/lib/town/reward-boat';
import {works} from '@/lib/town/gifts';
import {FOREST} from '@/lib/town/world';
import type {FarmDraw} from './TownFarm';
import {useReward} from './TownRewardActions';
import TownFoot from './TownFoot';
import TownIcon from './TownIcon';
import {drawBoatDock,drawLotusBoat} from './boat-draw';

/**
 * The lotus-leaf boat (the fishing line's eighth rank, v230; the owner, 2026-11-04: "ช่วยแก้บั๊ค … ให้ใช้งานได้จริง Gen ภาพใหม่
 * ให้ UI ดีขึ้นด้วย"). Its panel walks a member through it in three steps: to a dock (named, with a walk there, where it
 * gave the docks' tile numbers before), out to the anchor in the stream, and back; the time the boat has left, the
 * friend's seat, how far the boat has sailed, and why a press was refused. The boats themselves and the docks' jetties
 * and signs are drawn on the forest's map for everybody (components/town/boat-draw).
 */
const DOCK: Record<string, [th: string, en: string]> = {creek: ['ท่าลำธาร', 'Creek dock'], headwater: ['ท่าต้นน้ำ', 'Headwater dock']};
const WHY: Record<string, [th: string, en: string]> = {
 far: ['ต้องยืนบนท่าเรือ หรือบนเรือลำนั้น', 'Stand on the dock, or on that boat'],
 spent: ['เก็บสายเบ็ดของทุกคนบนเรือก่อน หรือคุณมีเรือลอยอยู่แล้ว', 'Reel in every line aboard first, or you already have a boat out'],
 none: ['ตอนนี้ทำแบบนั้นไม่ได้', 'That cannot be done now'],
};
const primary='pressable min-h-11 w-full rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-40';
const secondary='pressable min-h-11 rounded-lg border border-line-strong px-3 py-2 text-ui text-ink disabled:opacity-40';
const clock=(ms:number)=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const STEPS:Array<[icon:'boatDock'|'boatOar'|'boatAnchor',th:string,en:string]>=[['boatDock','ท่าเรือ','Dock'],['boatOar','ล่องเรือ','Sail'],['boatAnchor','กลางน้ำ','Midstream']];

export default function TownLotusBoat({keeper,th,at,register,walk}:{keeper:Keeper;th:boolean;at:[number,number]|null;register?:(draw:FarmDraw|null)=>void;walk?:(x:number,y:number)=>boolean}){
 const [rows,setRows]=useState<LotusBoat[]>([]),[open,setOpen]=useState(false),[,tick]=useState(0),view=useRef(rows),where=useRef(at),a=useReward(keeper,'boat');view.current=rows;if(at)where.current=at;
 const near=!!at&&at[0]>=FOREST.x&&at[0]<FOREST.x+FOREST.w&&at[1]>=FOREST.y&&at[1]<FOREST.y+FOREST.h,pointer=!!keeper.purse().professionRewards?.boat;
 useEffect(()=>{
  if(!near&&!pointer)return;
  let done=false;const sync=()=>{const next=keeper.boats?.()??[];setLotusBoats(next,keeper.id,()=>keeper.now());view.current=next;if(!done)setRows(next);};
  // (asked from where I last stood, never from a tile 0,0 while a panel hides where I am)
  const read=async()=>{const here=where.current;if(!here)return;try{await keeper.boatsLook?.(here);sync();}catch{/* Confirmed leases expire independently; retry the shared reader. */}};
  void read();const off=keeper.watch(sync),timer=setInterval(()=>void read(),15000),clock=setInterval(()=>tick(n=>n+1),500);
  return()=>{done=true;off();clearInterval(timer);clearInterval(clock);};
 },[keeper,near,pointer]);
 useEffect(()=>{register?.(f=>{
  const {ctx,project,s,things,onScreen,still,light}=f,now=keeper.now();
  for(const r of BOAT_ROUTES){const c=project({x:r.dock[0]+.5,y:r.dock[1]+.5}),w=project({x:r.anchor[0]+.5,y:r.anchor[1]+.5});if(onScreen(c)||onScreen(w))drawBoatDock(f,r,c,w);}
  for(const b of view.current){if(b.until<=now||!BOAT_ROUTES[b.site])continue;const p=boatDrawn(b,now),c=project(p);if(!onScreen(c))continue;
   const sailing=!!b.trip&&b.trip.arrives>now;
   things.push({depth:p.x+p.y-.12,draw:()=>drawLotusBoat(ctx,c,s,sailing,now,!!still,light)});
  }
 });return()=>register?.(null);},[register,keeper]);
 if(!at)return null;
 const t=keeper.now(),mine=works(keeper.purse(),'thingLotusBoat'),active=rows.filter(b=>b.until>t),own=active.find(b=>b.owner===keeper.id||b.guest===keeper.id);
 const site=BOAT_ROUTES.findIndex(r=>r.dock.every((n,i)=>n===at[i]));
 const offered=active.filter(b=>b.open&&b.station===0&&!b.guest&&b.owner!==keeper.id&&BOAT_ROUTES[b.site]?.dock.every((n,i)=>n===at[i]));
 if(!near&&!own||!own&&!mine&&!offered.length)return null;
 const moving=!!own?.trip&&own.trip.arrives>t,owner=own?.owner===keeper.id,send=(boat:Omit<BoatInput,'at'>)=>void a.send({action:'boat',boat,at}),disabled=a.busy||a.retry||moving;
 // (the step it is at: 0 at a dock, 1 under way, 2 at the anchor)
 const step=!own?0:moving?1:own.station===1?2:0,going=moving&&own?.trip?.to===1;
 const progress=moving&&own?.trip?Math.max(0,Math.min(1,(t-own.trip.at)/Math.max(1,own.trip.arrives-own.trip.at))):0;
 const docks=BOAT_ROUTES.map((r,i)=>({r,i,far:Math.max(Math.abs(r.dock[0]-at[0]),Math.abs(r.dock[1]-at[1]))})).sort((x,y)=>x.far-y.far);
 const why=a.reply&&!a.reply.ok?WHY[a.reply.why as string]??WHY.none:null;
 return <TownFoot rank={open?"board":"power"} icon="thingLotusBoat" order={56}>
  <button className="pressable pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-line-lit bg-surface/95 pl-2 pr-3 text-ui font-semibold text-ink shadow-lg shadow-black/30" aria-expanded={open} data-boat-open onClick={()=>setOpen(v=>!v)}>
   <TownIcon name="thingLotusBoat" size={26}/>{th?'เรือใบบัว':'Lotus boat'}{own&&<span className="font-data text-meta tabular-nums text-muted" data-boat-left>{clock(own.until-t)}</span>}
  </button>
  {open&&<section className="pop-in pointer-events-auto mt-2 w-[min(360px,calc(100vw-24px))] max-h-[62dvh] overflow-y-auto rounded-xl border border-line-lit bg-surface/97 text-ink shadow-xl shadow-black/40 backdrop-blur-sm" aria-labelledby="town-boat-h">
   <div className="flex items-center gap-2 border-b border-line px-4 py-3">
    <TownIcon name="thingLotusBoat" size={30}/>
    <h2 id="town-boat-h" className="min-w-0 truncate font-display text-title font-semibold">{th?'เรือใบบัว':'Lotus-leaf boat'}</h2>
    {own&&<span className="ml-auto rounded-full border border-line-strong px-2.5 py-0.5 font-data text-meta tabular-nums text-muted">{th?'เหลือ ':'left '}{clock(own.until-t)}</span>}
   </div>
   <div className="px-4 pb-4 pt-3">
    <ol className="mb-3 grid grid-cols-3 gap-1.5" aria-label={th?'ขั้นตอน':'Steps'}>
     {STEPS.map(([icon,sth,sen],i)=><li key={icon} aria-current={step===i?'step':undefined} className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-meta ${step===i?'border-accent bg-accent/15 font-semibold text-accent':i<step?'border-line text-ink':'border-line text-muted'}`}><TownIcon name={icon} size={22}/>{th?sth:sen}</li>)}
    </ol>
    {moving&&<div className="mb-3" role="status" data-boat-moving>
     <p className="mb-1.5 text-ui">{going?(th?'กำลังล่องไปกลางน้ำ…':'Sailing midstream…'):(th?'กำลังกลับฝั่ง…':'Returning to the bank…')}</p>
     <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{width:`${Math.round(progress*100)}%`}}/></div>
    </div>}
    {own?<div className="flex flex-col gap-2">
     {!moving&&own.station===0&&<>
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-ui">
       <span className="text-muted">{th?'ที่นั่งเพื่อน':'Friend’s seat'}</span>
       <span className="ml-auto font-semibold" data-boat-seat-state>{own.guest?(own.guest===keeper.id?(th?'คุณนั่งอยู่':'You'):(th?'มีเพื่อนนั่งแล้ว':'Taken')):own.open?(th?'เปิดรอเพื่อน':'Open'):(th?'ปิด':'Closed')}</span>
       {owner&&!own.guest&&<button className={secondary} disabled={disabled} data-boat-seat onClick={()=>send({action:'open',owner:own.owner,open:!own.open})}>{own.open?(th?'ปิด':'Close'):(th?'เปิด':'Open')}</button>}
      </div>
      {owner?<button className={primary} disabled={disabled} data-boat-depart onClick={()=>send({action:'depart',owner:own.owner})}>{th?'ล่องไปกลางน้ำ':'Sail midstream'}</button>:<p className="text-ui text-ink/80">{th?'รอเจ้าของเรือออกเรือ':'Waiting for the owner to set off'}</p>}
      <button className={secondary} disabled={disabled} data-boat-leave onClick={()=>send({action:'leave',owner:own.owner})}>{owner?(th?'เก็บเรือ ขึ้นฝั่ง':'Put the boat away'):(th?'ลงจากเรือ':'Disembark')}</button>
     </>}
     {!moving&&own.station===1&&<>
      <p className="rounded-lg border border-line px-3 py-2 text-ui"><span className="font-semibold">{th?'ทอดสมอแล้ว':'Anchored'}</span> · {th?'ถือคันเบ็ดแล้วแตะที่น้ำเพื่อตกปลา':'hold a rod and tap the water to fish'}</p>
      {owner?<button className={primary} disabled={disabled} data-boat-return onClick={()=>send({action:'return',owner:own.owner})}>{th?'กลับฝั่ง':'Return to the bank'}</button>:<p className="text-ui text-ink/80">{th?'เจ้าของเรือเป็นคนพากลับฝั่ง':'The owner takes the boat back'}</p>}
      <p className="text-ui text-ink/80">{th?'เก็บสายเบ็ดของทุกคนก่อนออกเรือ':'Everyone reels in before the boat moves'}</p>
     </>}
    </div>:<div className="flex flex-col gap-2">
     {offered.map(b=><div key={b.owner} className="flex items-center gap-2 rounded-lg border border-accent/60 bg-accent/10 px-3 py-1.5">
      <span className="min-w-0 flex-1 truncate text-ui">{th?'เรือของ ':'Boat of '}<b>{b.name??b.owner.slice(0,8)}</b> · {th?'ที่นั่งว่าง':'a seat free'}</span>
      <button className={secondary} disabled={disabled} data-boat-join onClick={()=>send({action:'join',owner:b.owner})}>{th?'ขึ้นเรือ':'Board'}</button>
     </div>)}
     {mine&&(site>=0?<>
      <p className="text-ui">{th?`คุณอยู่ที่${DOCK[BOAT_ROUTES[site].habitat][0]}`:`You are at the ${DOCK[BOAT_ROUTES[site].habitat][1]}`}</p>
      <button className={primary} disabled={disabled} data-boat-launch onClick={()=>send({action:'launch',site})}>{th?'วางเรือที่ท่านี้':'Launch here'}</button>
      <p className="text-meta text-muted">{th?'ใช้แรง 2 · เรืออยู่ได้ 30 นาที · ชวนเพื่อนนั่งได้ 1 คน':'2 stamina · lasts 30 minutes · one friend may ride'}</p>
     </>:<>
      <p className="text-ui">{th?'ไปที่ท่าเรือก่อน แล้ววางเรือที่นั่น':'Go to a dock first, and launch there'}</p>
      {docks.map(({r,i,far},k)=><button key={i} className={`${k===0?primary:`${secondary} w-full`} flex items-center justify-between gap-2 text-left`} disabled={!walk} data-boat-walk={i} onClick={()=>walk?.(r.dock[0],r.dock[1])}>
       <span className="flex items-center gap-2"><TownIcon name="boatDock" size={20}/>{th?`เดินไป${DOCK[r.habitat][0]}`:`Walk to the ${DOCK[r.habitat][1]}`}</span><span className="font-data text-meta tabular-nums opacity-80">{th?`${far} ช่อง`:`${far} tiles`}</span>
      </button>)}
     </>)}
    </div>}
    {why&&<p role="status" className="mt-3 text-meta text-accent" data-boat-why>{why[th?0:1]}</p>}
    {a.retry&&<button className={`${secondary} mt-2 w-full`} onClick={()=>void a.send()}>{th?'ส่งคำสั่งเดิมอีกครั้ง':'Send the same request again'}</button>}
   </div>
  </section>}
 </TownFoot>;
}
