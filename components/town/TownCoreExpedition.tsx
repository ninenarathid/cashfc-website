"use client";
import {useRef,useState} from "react";
import type {Keeper} from "@/lib/town/keeper";
import {works,usesLeft} from "@/lib/town/gifts";
import {CORE_ROUTES,coreChoices} from "@/lib/town/reward-core";
import {ITEMS} from "@/lib/town/trade";
import type {CoreRoute} from "@/lib/town/reward-types";
import {useReward,ExtractionGame,TrailMemory} from "./TownRewardActions";
import TownFoot from "./TownFoot";
import TownIcon from "./TownIcon";
const button="pressable min-h-11 rounded-lg bg-[#ced6b1] px-3 py-2 text-ui font-semibold text-[#263c37] disabled:opacity-50";
export default function TownCoreExpedition({keeper,th,at,floor}:{keeper:Keeper;th:boolean;at:()=>[number,number]|null;floor:number}){
 const action=useReward(keeper,"core"),[open,setOpen]=useState(false),[playing,setPlaying]=useState(false),[finishing,setFinishing]=useState(false),heldAt=useRef<[number,number]|null>(null);
 const p=keeper.purse(),core=p.professionRewards?.core,room=core?.room,position=()=>at()??heldAt.current;
 if(!keeper.rewardDo||!works(p,"thingCoreSpade")||floor<1)return null;
 const blocked=action.busy||action.retry||finishing,labels:Record<CoreRoute,string>={ore:th?"สายแร่ · 8 ชิ้น · แรง 3":"Ore · 8 fragments · 3 stamina",crystal:th?"ผลึก · 4 ชิ้น · แรง 4":"Crystal · 4 fragments · 4 stamina",safe:th?"อุโมงค์มั่นคง · หิน 8 · แรง 2":"Stable tunnel · 8 stones · 2 stamina"};
 async function finish(answers:number[]){if(!core||!room?.challenge)return;setPlaying(false);setFinishing(true);try{const wait=Math.max(0,room.challenge.began+2400-keeper.now());if(wait)await new Promise(r=>setTimeout(r,wait));const t=position();if(t)await action.send({action:"coreEnd",core:core.id,challenge:room.challenge.id,answers,at:t});}finally{setFinishing(false);}}
 return <TownFoot rank={open?"board":"power"} icon="thingCoreSpade" order={43}>
  {!open?<button className={button} data-core-open onClick={()=>{heldAt.current=at();setOpen(true);}}><TownIcon name="thingCoreSpade" size={20}/>{th?"สำรวจแก่นแร่":"Explore the core"}</button>:<section className="pointer-events-auto max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-xl border border-[#87988d]/50 bg-[#23332f]/95 p-3 text-[#e1e8cf] shadow-xl" aria-label={th?"ห้องแก่นแร่":"Core rooms"}>
   <div className="flex items-center justify-between gap-2"><p className="font-semibold"><TownIcon name="thingCoreSpade" size={24}/>{th?"ห้องแก่นแร่":"Core rooms"}</p><button className={button} disabled={blocked||playing} onClick={()=>setOpen(false)}>{th?"พักไว้":"Pause"}</button></div>
   <p className="my-3 text-ui">{th?"สามห้องส่วนตัว เลือกเส้นทางก่อนเล่นแต่ละห้อง เล่นได้ห้องละหนึ่งครั้ง พลาดเสียแรงและข้ามห้องนั้น":"Three private rooms. Choose a route before each room; one played attempt per room. A miss costs stamina and forfeits this room."}</p>
   {core?<>
    <ol className="mb-3 flex gap-2" aria-label={th?"ความคืบหน้า":"Progress"}>{[0,1,2].map(i=><li key={i} aria-current={core.next===i?"step":undefined} className={`flex-1 rounded-lg border px-2 py-3 text-center ${i<core.next?"border-[#a9be86] bg-[#52653f]":i===core.next?"border-[#dac389] bg-[#574b36]":"border-[#536259] bg-[#2b3c35]"}`}>{th?"ห้อง":"Room"} {i+1}{i<core.next?" ✓":""}</li>)}</ol>
    <p className="mb-3 text-meta">{th?`ชั้น ${core.floor} · เล่นแล้ว ${core.next}/3 ห้อง`:`Floor ${core.floor} · ${core.next}/3 rooms complete`}</p>
    {core.floor!==floor?<p role="status">{th?`กลับไปชั้น ${core.floor} เพื่อเล่นต่อ`:`Return to floor ${core.floor} to continue`}</p>:playing&&room?.challenge?(room.node.game==="timing"?<ExtractionGame key={room.challenge.id} th={th} run={{id:room.challenge.id,seed:room.node.seed}} onFinish={a=>void finish(a)}/>:<TrailMemory key={room.challenge.id} th={th} identity={room.challenge.id} theme="cave" node={room.node} onFinish={a=>void finish(a)}/>):room?<div className="space-y-2">
     <p>{labels[room.route]} · {ITEMS[room.mineral].name[th?"th":"en"]}</p>
     <button className={button} data-core-play disabled={blocked} onClick={async()=>{const t=position();if(t){const did=await action.send({action:"coreRoom",core:core.id,route:room.route,at:t});if(did?.ok)setPlaying(true);}}}>{th?"อ่านห้องนี้":"Read this room"}</button>
    </div>:<div className="flex flex-col gap-2">{coreChoices(core).map(route=><button className={button} key={route} data-core-route={route} disabled={blocked} onClick={async()=>{const t=position();if(t){await action.send({action:"coreRoom",core:core.id,route,at:t});}}}>{labels[route]} · {CORE_ROUTES[route].game==="timing"?(th?"จับจังหวะ":"Timing"):CORE_ROUTES[route].game==="order"?(th?"จำลำดับ":"Remember the order"):(th?"จำรอย":"Remember a trace")}</button>)}</div>}
    {!playing&&<button className="pressable mt-3 min-h-11 px-2 text-meta underline" disabled={blocked} onClick={()=>{const t=position();if(t)void action.send({action:"coreCancel",core:core.id,at:t});}}>{th?"ยุติรอบนี้ · ไม่คืนสิทธิ์เริ่ม":"End this expedition · Start is not refunded"}</button>}
   </>:<button className={button} data-core-start disabled={blocked||usesLeft(p,"thingCoreSpade",keeper.now())<1} onClick={()=>{const t=position();if(t)void action.send({action:"coreBegin",floor,at:t});}}>{th?`เริ่มบนชั้นที่เคยทำงาน · เหลือ ${usesLeft(p,"thingCoreSpade",keeper.now())} รอบวันนี้`:`Start on this worked floor · ${usesLeft(p,"thingCoreSpade",keeper.now())} starts today`}</button>}
   {action.reply?.ok&&action.reply.got&&<p role="status" className="mt-3">{action.reply.completed?(th?"สำรวจครบสามห้องแล้ว · ":"Three rooms explored · "):""}{action.reply.got.length?action.reply.got.map(([id,n])=>`${ITEMS[id].name[th?"th":"en"]} ×${n}`).join(", "):th?"อ่านพลาด ข้ามห้องนี้แล้ว":"A missed reading; this room was forfeited"}</p>}
   {action.reply&&!action.reply.ok&&<p role="status" className="mt-3">{action.reply.why==="full"?(th?"กระเป๋าเต็ม จัดของแล้วอ่านห้องเดิมต่อได้":"Make room, then read this same room again"):action.reply.why==="far"?(th?"กลับไปชั้นที่เริ่มไว้แล้วเลือกเล่นอีกครั้ง":"Return to the starting floor and reopen this room"):(th?"ต้องถือจอบขุดและเคยทำงานบนชั้นนี้จริง":"Hold a mining pick and use a floor where you have worked")}</p>}
   {action.retry&&<button className={`${button} mt-3`} onClick={()=>void action.send()}>{th?"ตรวจผลเดิมอีกครั้ง":"Check the original result again"}</button>}
  </section>}
 </TownFoot>;
}
