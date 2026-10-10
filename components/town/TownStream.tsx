"use client";

import { useEffect, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { ITEMS, type ItemId } from "@/lib/town/items";
import { STREAM_MAKES } from "@/lib/town/stream-items";
import { STREAM_WORK, streamRouteAt, streamSiteAt, waterNature, type StreamAction } from "@/lib/town/stream-work";
import { held } from "@/lib/town/trade";
import { atWell } from "@/lib/town/world";
import TownFoot from "./TownFoot";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import type { FarmDraw } from "./TownFarm";
import TownNotebook from "./TownNotebook";
import styles from "./TownAdventure.module.css";

export default function TownStream({keeper,tile,busy,th,mountain,register}:{keeper:Keeper;tile:[number,number]|null;busy:boolean;th:boolean;mountain:boolean;register:(draw:FarmDraw|null)=>void}) {
  const [open,setOpen]=useState(false),[pending,setPending]=useState(false),[note,setNote]=useState("");
  const [,redraw]=useState(0);
  const p=keeper.purse();
  const site=mountain&&tile?streamSiteAt(tile):null,well=!!tile&&atWell(...tile);
  const active=!busy&&(!!site||well&&p.bag.some(s=>s&&waterNature(s.item)));
  useEffect(()=>keeper.watch(()=>redraw(n=>n+1)),[keeper]);
  useEffect(()=>{
    if(!active)return;
    const refresh=()=>{if(!document.hidden)void keeper.streamLook();};
    refresh();
    const timer=setInterval(refresh,15_000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[keeper,active]);
  useEffect(()=>{
    register(({ctx,things,project,onScreen,s,img,now,still})=>{
      if(!img?.complete||!img.naturalWidth)return;
      const flowing=streamRouteAt(keeper.streamGate(),keeper.now());
      for(const bank of STREAM_WORK.sites){
        const anchor={x:bank.x+0.5,y:bank.y+0.5},at=project(anchor);
        if(!onScreen(at))continue;
        things.push({depth:at.y,draw:()=>{
          ctx.save();
          ctx.lineCap="square";
          for(const channel of ["pool","reed"] as const){
            const end=project({x:anchor.x+(channel==="pool"?-0.8:0.8),y:anchor.y+1.1});
            ctx.strokeStyle=channel===flowing?"#a3e0d3":"#6b8478";
            ctx.lineWidth=Math.max(1,Math.round((channel===flowing?3:1)*s));
            ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(end.x,end.y);ctx.stroke();
            if(channel===flowing){
              const step=still?0.6:(now%1600)/1600;
              ctx.fillStyle="#e7f4dc";
              ctx.fillRect(Math.round(at.x+(end.x-at.x)*step),Math.round(at.y+(end.y-at.y)*step),Math.max(1,Math.round(2*s)),Math.max(1,Math.round(s)));
            }
          }
          const [x,y,w,h]=ICON_ATLAS.icons.streamGate,k=24*s/Math.max(w,h);
          ctx.imageSmoothingEnabled=false;
          ctx.drawImage(img,x,y,w,h,Math.round(at.x-w*k/2),Math.round(at.y-h*k),w*k,h*k);
          ctx.restore();
        }});
      }
    });
    return()=>register(null);
  },[keeper,register]);
  const gate=keeper.streamGate(),route=streamRouteAt(gate,keeper.now()),book=p.streamBook??[];
  const name=(id:ItemId)=>ITEMS[id].name[th?"th":"en"];
  const ready=Object.entries(STREAM_MAKES).filter(([,r])=>r.needs.every(([id,n])=>held(p.bag,id)>=n));
  async function deed(action:StreamAction,choice:string) {
    if(pending||!tile)return;
    setPending(true);setNote("");
    try {
      const d=await keeper.streamDo(action,choice,tile,crypto.randomUUID());
      setNote(d.ok?d.got?.map(([id,n])=>`${name(id)} ×${n}`).join(" · ")??(th?"สายน้ำเปลี่ยนแล้ว":"The water has changed."):({full:th?"ไม่มีที่ว่างแล้ว":"There is no room.",spent:th?"รอให้สายน้ำพักสักครู่":"Let the stream settle a while.",tool:th?"ต้องเตรียมเครื่องมือก่อน":"Prepare the right tool first.",none:th?"ทางน้ำหรือของที่เตรียมยังไม่พร้อม":"The route or ingredients are not ready.",far:th?"กลับไปที่ริมต้นน้ำหรือบ่อ":"Return to the stream bank or well."} as Record<string,string>)[d.why]??(th?"ยังทำไม่ได้":"Not ready yet."));
    } finally {setPending(false);}
  }
  if(!active)return null;
  if(!open)return <TownFoot rank="chip"><button type="button" onClick={()=>setOpen(true)} data-stream-open className="pressable pointer-events-auto flex min-h-11 items-center gap-2 rounded border-2 border-[#4b695c] bg-[#e3ddbe] px-3 text-ui text-[#293c32]"><TownIcon name="streamFork" size={26}/>{th?well?"ลองน้ำที่เตรียมไว้":"มีร่องน้ำแยกตรงนี้":well?"Try the prepared water":"A channel branches here"}</button></TownFoot>;
  return <TownFoot rank="board"><section data-stream-panel className={`${styles.panel} ${styles.water} pointer-events-auto w-full max-w-[420px]`} aria-label={th?"ริมต้นน้ำ":"At the headwater"}>
    <header className="flex items-center gap-2"><TownIcon name="streamGate" size={30}/><h2 className="font-display text-title">{th?well?"น้ำที่นำกลับมา":"ร่องน้ำบนภูเขา":well?"Water brought home":"Mountain channels"}</h2><button type="button" onClick={()=>setOpen(false)} className="pressable ml-auto min-h-11 px-2">{th?"ปิด":"Close"}</button></header>
    <p className="mb-2 text-meta">{th?well?"เทน้ำที่เตรียมไว้ 1 ชิ้นและใช้แรง 1 แต้ม เพื่อเปลี่ยนน้ำในบ่อที่ทุกคนใช้ร่วมกัน":"เก็บตัวอย่างด้วยกระบอกเก็บน้ำหรือถัง แล้วนำมาลองกรองหรือผสม · สำรวจและเตรียมใช้แรงครั้งละ 3 แต้ม":well?"Pour 1 prepared water and spend 1 stamina to change the well shared by everyone.":"Sample with a water sampler or bucket, then try filtering or mixing · Gathering and preparation each cost 3 stamina."}</p>
    {site&&<>
      <svg viewBox="0 0 340 100" className={styles.routeMap} role="img" aria-label={th?`น้ำกำลังไหล${route==="pool"?"เข้าแอ่งพัก":"ผ่านร่องกก"}`:`Water flows ${route==="pool"?"into the pool":"through the reeds"}`}>
        <path d="M170 4 V34 M170 34 Q80 30 65 63 M170 34 Q260 30 275 63" fill="none" stroke="#a7bbb0" strokeWidth="8"/>
        <path d={route==="pool"?"M170 4 V34 Q80 30 65 63":"M170 4 V34 Q260 30 275 63"} fill="none" stroke="#397b83" strokeWidth="5"/>
        <rect x="151" y="25" width="38" height="16" fill="#bfa376" stroke="#4c655b" strokeWidth="2"/>
        <ellipse cx="65" cy="68" rx="32" ry="12" fill={route==="pool"?"#7fc2c3":"#bdcdc4"}/>
        <path d="M266 77 L265 55 M278 77 V48 M286 77 L290 56" stroke="#668257" strokeWidth="3"/>
        <text x="65" y="97" textAnchor="middle" fill="#233c39" fontSize="12">{th?"แอ่งพัก":"Pool"}</text><text x="275" y="97" textAnchor="middle" fill="#233c39" fontSize="12">{th?"ร่องกก":"Reeds"}</text>
      </svg>
      <p className="mb-2 text-ui">{th?route==="pool"?"น้ำหยุดพักในแอ่ง มอสเกาะขอบหิน":"น้ำไหลผ่านกก พาตะกอนละเอียดลงมา":route==="pool"?"Water settles in a moss-lined pool.":"Water flows through reeds, carrying fine sediment."}</p>
      {held(p.bag,"flowGauge")>0&&<p className="mb-2 text-meta" data-flow-gauge>{th?`ไม้เทียบระดับชี้ไปทาง${route==="pool"?"แอ่งพัก":"ร่องกก"}`:`The gauge points to the ${route} channel.`}{gate&&gate.until>keeper.now()?` · ${Math.ceil((gate.until-keeper.now())/60_000)} ${th?"นาที":"min"}`:""}</p>}
      {held(p.bag,"sluiceKey")>0&&<div className={styles.routeChoice}>{(["pool","reed"] as const).map(r=><button type="button" key={r} disabled={pending||route===r} aria-pressed={route===r} data-stream-route={r} onClick={()=>void deed("gate",r)} className="pressable text-ui">{th?r==="pool"?"หมุนเข้าแอ่งพัก":"หมุนผ่านร่องกก":r==="pool"?"Divert to pool":"Divert through reeds"}<small>{route===r?(th?"ทางที่น้ำไหลอยู่":"Current flow"):(th?"เปลี่ยนทางน้ำร่วมกัน":"Change the shared flow")}</small></button>)}</div>}
      <p className={styles.sectionLabel}>{th?"สำรวจริมฝั่ง":"Explore the bank"}</p>
      <div className="grid grid-cols-2 gap-2">{site.items.map(id=>{const known=book.includes(id),available=(id!=="springSample"||route==="pool")&&(id!=="rushingSample"||route==="reed"),taken=p.streamTaken?.[`${site.id}:${id}`]===Math.floor(keeper.now()/STREAM_WORK.every);return <button type="button" key={id} disabled={pending||!available||taken} data-stream-sample={id} onClick={()=>void deed("sample",id)} className="pressable flex min-h-12 items-center gap-2 rounded border border-[#8b9576] bg-[#d7e3c7] p-2 text-left text-ui disabled:opacity-50"><TownIcon name={id as IconName} size={28}/>{known?name(id):th?id.endsWith("Sample")?"เก็บตัวอย่างน้ำ":"แยกของริมฝั่ง":id.endsWith("Sample")?"Sample the water":"Collect a bank material"}</button>;})}</div>
      {ready.length>0&&<div className="mt-3 space-y-2">{ready.map(([id,r])=><button type="button" key={id} disabled={pending} data-stream-prepare={id} onClick={()=>void deed("prepare",id)} className="pressable w-full rounded border border-[#8b9576] bg-[#ddd4b8] p-2 text-left text-ui disabled:opacity-50"><span className="block font-semibold">{book.includes(id as ItemId)?name(id as ItemId):th?id.endsWith("Blend")?"ลองผสมในเหยือก":"ลองแยกและกรอง":id.endsWith("Blend")?"Try a mixture":"Try separating and filtering"}</span><small className="text-meta">{r.needs.map(([part,n])=>`${name(part)} ×${n}`).join(" · ")}</small></button>)}</div>}
    </>}
    {well&&<div className="grid gap-2">{p.bag.filter(s=>s&&waterNature(s.item)).map((s,i)=>s&&<button type="button" key={`${s.item}:${i}`} disabled={pending} data-stream-pour={s.item} onClick={()=>void deed("pour",s.item)} className="pressable flex min-h-12 items-center gap-2 rounded border border-[#8b9576] bg-[#d7e3c7] p-2 text-ui disabled:opacity-50"><TownIcon name={s.item as IconName} size={28}/>{th?"เทลงบ่อ":"Pour into the well"} · {name(s.item)}</button>)}</div>}
    {note&&<p role="status" className={`${styles.result} text-ui`}>{note}</p>}
    {book.length>0&&<TownNotebook title={th?"สมุดทดลองน้ำ":"My water experiments"} th={th} icon="streamFork" entries={book.filter(id=>id in ITEMS).map(id=>{const r=STREAM_MAKES[id as keyof typeof STREAM_MAKES];return {key:id,title:name(id),icon:id as IconName,category:r?th?"แยก กรอง และผสม":"Filter and blend":th?"พบที่ริมฝั่ง":"Bank discoveries",body:r?<><p>{th?"ทดลองสำเร็จจากวัตถุดิบเหล่านี้":"Prepared successfully from these ingredients"}</p><ul>{r.needs.map(([part,n])=><li key={part} className="flex items-center gap-2"><TownIcon name={part as IconName} size={24}/>{name(part)} ×{n}</li>)}</ul><p>{th?"เครื่องครัว":"Cookware"}: {r.in.map(name).join(" · ")}</p></>:<p>{th?"พบระหว่างสำรวจริมสายน้ำบนภูเขา เก็บตัวอย่างและของริมฝั่งเพื่อทดลองแยก กรอง หรือผสมต่อ":"Found along the mountain stream. Collect samples and bank materials to experiment with separating, filtering and blending."}</p>};})}/>}
  </section></TownFoot>;
}
