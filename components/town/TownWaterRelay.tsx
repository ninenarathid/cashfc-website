"use client";
import {useState,useEffect,useRef} from "react";
import type {Keeper} from "@/lib/town/keeper";
import {works,usesLeft} from "@/lib/town/gifts";
import {WATER} from "@/lib/town/farm";
import {ITEMS} from "@/lib/town/trade";
import {relayPlace} from "@/lib/town/reward-relay";
import {useReward} from "./TownRewardActions";
import TownFoot from "./TownFoot";
import TownIcon, {ICON_ATLAS,type IconName} from "./TownIcon";
import {iconOf} from "@/lib/town/items";

const button="pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-50";
import type {FarmDraw} from "./TownFarm";
export default function TownWaterRelay({keeper,th,at,register}:{keeper:Keeper;th:boolean;at:[number,number]|null;register?: (draw:FarmDraw|null)=>void}){
 const [open,setOpen]=useState(false),[slot,setSlot]=useState<number|null>(null),a=useReward(keeper,"water-relay"),p=keeper.purse(),r=p.professionRewards?.relay;
 const visible=useRef(r);visible.current=r;
 useEffect(()=>{
  register?.(frame=>{
   const receiver=visible.current;if(!receiver)return;
   const {ctx,project,onScreen,s,still,img,things,now:t}=frame,ground=project({x:receiver.at[0]+.5,y:receiver.at[1]+.5});
   if(onScreen(ground))things.push({depth:receiver.at[0]+receiver.at[1]+.8,draw:()=>{
    ctx.save();ctx.globalAlpha=.3;ctx.fillStyle='#243c34';ctx.beginPath();ctx.ellipse(ground.x,ground.y,15*s,5*s,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const cell=ICON_ATLAS.icons[iconOf(receiver.item) as IconName];
    if(img?.complete&&img.naturalWidth&&cell){const [x,y,w,h]=cell,k=1.05*s;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x,y,w,h,Math.round(ground.x-w*k/2),Math.round(ground.y-h*k+5*s),w*k,h*k);}
    if(receiver.water>0){ctx.fillStyle='#a6d8cc';for(let i=0;i<3;i++){const phase=still?.5:(t/1300+i/3)%1;ctx.globalAlpha=.6*(1-phase);ctx.fillRect(Math.round(ground.x+(i-1)*5*s),Math.round(ground.y-(15+phase*8)*s),Math.max(1,Math.round(2*s)),Math.max(1,Math.round(2*s)));}ctx.globalAlpha=1;}
   }});
   const elapsed=receiver.sentAt===undefined?Infinity:keeper.now()-receiver.sentAt;
   if(receiver.from&&elapsed>=0&&elapsed<1800&&!still){
    const origin=project({x:receiver.from[0]+.5,y:receiver.from[1]+.5});
    const draw=()=>{for(let i=0;i<18;i++){const q=elapsed/1800-i*.022;if(q<0||q>1)continue;
     const x=origin.x+(ground.x-origin.x)*q,y=origin.y+(ground.y-origin.y)*q-12*s-Math.sin(q*Math.PI)*24*s;
     if(onScreen({x,y})){ctx.fillStyle=i%3?'#78b8bd':'#d3eee0';const px=Math.max(1,Math.round(2*s));ctx.fillRect(Math.round(x),Math.round(y),px,px);}
    }};if(frame.over)frame.over(draw);else things.push({depth:1e6,draw});
   }
  });return ()=>register?.(null);
 },[register,keeper]);
 if(!keeper.rewardDo||(!works(p,"famWaterRelay")&&!r))return null;
 const available=p.bag.flatMap((s,i)=>s&&WATER.buckets[s.item]&&s.n===1&&Object.keys(s).every(k=>['item','n'].includes(k))?[i]:[]),chosen=slot!==null&&available.includes(slot)?slot:available[0];
 const blocked=a.busy||a.retry||!at||!relayPlace(at),near=at&&r&&Math.max(...at.map((v,i)=>Math.abs(v-r.at[i])))<=1;
 return <TownFoot rank={open?"board":"power"} icon="famWaterRelay" order={45}>
  <button className={`${button} pointer-events-auto`} data-water-relay onClick={()=>setOpen(v=>!v)}><TownIcon name="famWaterRelay" size={20}/>{th?"จุดรับน้ำของฉัน":"My water receiver"}</button>
  {open&&<section className="pointer-events-auto mt-2 max-w-sm rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl" aria-label={th?"ภูตส่งน้ำ":"Water relay spirit"}>
   <p className="mb-2 text-ui">{th?`ส่งน้ำจริงสูงสุด 6 ถัง · ระยะ 40 ช่องในแผนที่เดียวกัน · แรง 2 · เหลือ ${usesLeft(p,"famWaterRelay",keeper.now())} ครั้งวันนี้`:`Up to six real bucketfuls · 40 tiles on one map · 2 stamina · ${usesLeft(p,"famWaterRelay",keeper.now())} sends left today`}</p>
   {r?<>
    <p className="mb-3 text-ui"><TownIcon name={iconOf(r.item) as IconName} size={24}/>{ITEMS[r.item].name[th?"th":"en"]} · {r.at.join(", ")} · {th?`น้ำ ${r.water} ถัง`:`${r.water} bucketfuls`}</p>
    <div className="flex flex-wrap gap-2">
     {!r.water&&works(p,"famWaterRelay")&&<button className={button} data-relay-send disabled={blocked} onClick={()=>{if(at)void a.send({action:"relaySend",at});}}>{th?"ส่งน้ำจากถังที่ถือ":"Send held water"}</button>}
     <button className={button} data-relay-take disabled={blocked||!near} onClick={()=>{if(at)void a.send({action:"relayTake",at});}}>{th?"ยกภาชนะกลับ":"Retrieve container"}</button>
    </div>
    {!near&&<p className="mt-2 text-meta">{th?"เดินกลับไปอยู่ข้างจุดรับเพื่อยกภาชนะกลับ":"Return beside the receiver to retrieve it"}</p>}
   </>:<>
    <p className="mb-2 text-ui">{th?"วางภาชนะเปล่าจากกระเป๋าตรงที่ยืน ใช้แรง 1 แล้วถือถังน้ำไปส่งจากอีกจุด ภาชนะที่เติมแล้วต้องยกกลับก่อนวางใหม่":"Leave an empty bag container here for 1 stamina, then send from a held bucket elsewhere. Retrieve a filled receiver before placing another."}</p>
    {available.length?<label className="mb-3 block text-ui">{th?"ภาชนะเปล่า":"Empty container"}<select className="mt-1 min-h-11 w-full rounded-lg border border-ink/20 bg-bg px-2" value={chosen} onChange={e=>setSlot(Number(e.target.value))}>{available.map(i=><option key={i} value={i}>{ITEMS[p.bag[i]!.item].name[th?"th":"en"]} · #{i+1}</option>)}</select></label>:<p className="mb-3 text-ui">{th?"ต้องมีภาชนะขนน้ำเปล่าหนึ่งชิ้นในกระเป๋า":"An empty single water container is required in the bag"}</p>}
    <button className={button} data-relay-place disabled={blocked||chosen===undefined} onClick={()=>{if(at&&chosen!==undefined)void a.send({action:"relayPlace",slot:chosen,at});}}>{th?"วางจุดรับตรงนี้":"Place receiver here"}</button>
   </>}
   {a.reply&&<p role="status" className="mt-3 text-ui">{a.reply.ok?(th?"เรียบร้อย น้ำและภาชนะถูกเก็บไว้แล้ว":"Done. Water and container are accounted for"):a.reply.why==="full"?(th?"เว้นที่ว่างในกระเป๋าก่อนยกกลับ":"Make a free bag slot before retrieval"):a.reply.why==="far"?(th?"ไกลเกินไปหรืออยู่คนละแผนที่":"Too far away or on a different map"):a.reply.why==="spent"?(th?"ส่งครบสำหรับวันนี้แล้ว":"Today's sends are used"):(th?"ต้องถือถังที่มีน้ำ จุดรับต้องว่าง และไม่มีภาชนะชนิดปลายทางที่ยังมีน้ำซ้ำในกระเป๋า":"Hold a filled bucket; the receiver must be empty. Empty any other filled container of the receiver's type first")}</p>}
   {a.retry&&<button className={`${button} mt-2`} onClick={()=>void a.send()}>{th?"ตรวจผลอีกครั้ง":"Check result again"}</button>}
  </section>}
 </TownFoot>;
}
