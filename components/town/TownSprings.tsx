"use client";
import {useEffect,useState,useRef} from "react";
import type {Keeper} from "@/lib/town/keeper";
import {works,usesLeft} from "@/lib/town/gifts";
import {SPRINGS,springSite} from "@/lib/town/reward-springs";
import type {FarmDraw} from "./TownFarm";
import {useReward} from "./TownRewardActions";
import TownFoot from "./TownFoot";
import TownIcon from "./TownIcon";
const names=[["ลานกลางเมือง","Town plaza"],["ข้างบ่อสวน","Garden well"],["จุดพักป่า","Forest rest"],["เชิงผา","Lower cliff"],["บนผา","Upper cliff"]];
const button="pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-50";
export default function TownSprings({keeper,th,at,register}:{keeper:Keeper;th:boolean;at:[number,number]|null;register?:(draw:FarmDraw|null)=>void}){
 const [open,setOpen]=useState(false),[reading,setReading]=useState(false),a=useReward(keeper,"springs"),p=keeper.purse(),site=springSite(at??[]),nodes=keeper.springs?.()??[],view=useRef(nodes);view.current=nodes;
 useEffect(()=>{
  if(site<0||!keeper.springsLook)return;
  let stopped=false;const read=async()=>{try{await keeper.springsLook?.();}catch{/* A failed read leaves commands available for a retry. */}finally{if(!stopped)setReading(false);}};
  setReading(true);void read();const timer=open?setInterval(()=>void read(),15000):null;
  return ()=>{stopped=true;if(timer)clearInterval(timer);};
 },[site,open,keeper]);
 useEffect(()=>{
  register?.(f=>{
   const {ctx,project,onScreen,s,things,now,still}=f;
   for(const node of view.current){if(node.until<=keeper.now()||node.left<=0)continue;
    const point=project({x:node.at[0]+.5,y:node.at[1]+.5});if(!onScreen(point))continue;
    things.push({depth:node.at[0]+node.at[1]+.8,draw:()=>{
     ctx.save();ctx.fillStyle='#263c35';ctx.globalAlpha=.32;ctx.beginPath();ctx.ellipse(point.x,point.y+3*s,23*s,10*s,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
     ctx.fillStyle='#365a5d';ctx.beginPath();ctx.ellipse(point.x,point.y,20*s,9*s,0,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#608f91';ctx.beginPath();ctx.ellipse(point.x,point.y-2*s,17*s,6*s,0,0,Math.PI*2);ctx.fill();
     // Small irregular stones follow the pool's ground plane; moss softens the outside edge.
     const px=Math.max(1,Math.round(s));
     for(let i=0;i<13;i++){
      const angle=i*Math.PI*2/13,x=Math.round(point.x+Math.cos(angle)*(20+i%2)*s),y=Math.round(point.y+Math.sin(angle)*9*s),w=4+i%3;
      ctx.fillStyle=i%2?'#626553':'#6d705c';ctx.fillRect(x-2*px,y-2*px,w*px,3*px);ctx.fillRect(x-px,y-3*px,(w-2)*px,px);
      ctx.fillStyle='#919780';ctx.fillRect(x-px,y-2*px,2*px,px);ctx.fillStyle='#434d3b';ctx.fillRect(x-2*px,y+px,(w-1)*px,px);
      if(i%3===0){ctx.fillStyle='#6b8250';ctx.fillRect(x+px,y,2*px,px);ctx.fillStyle='#82965d';ctx.fillRect(x+2*px,y-px,px,px);}
     }
     for(let i=0;i<4;i++){const phase=still?.45:((now/1400+i*.27)%1);ctx.fillStyle=i%2?'#8db8ad':'#b7d5c3';ctx.globalAlpha=.55*(1-phase);ctx.fillRect(Math.round(point.x+(phase-.5)*18*s),Math.round(point.y-4*s+i*2*s),Math.round((2+phase*6)*s),px);}
     ctx.globalAlpha=1;ctx.restore();
    }});if(f.self&&Math.max(Math.abs(f.self.x-node.at[0]),Math.abs(f.self.y-node.at[1]))<5)f.sign(th?`ตาน้ำ · ${node.left} ถัง`:`Spring · ${node.left} bucketfuls`,point.x,point.y-25*s);
   }
  });return ()=>register?.(null);
 },[keeper,register,th]);
 const active=nodes.find(n=>n.site===site&&n.until>keeper.now()&&n.left>0),own=works(p,"thingSpringStone");
 if(!keeper.rewardDo||!keeper.springsLook||(!own&&!active&&site<0))return null;
 if(site<0&&!own)return null;
 const disabled=a.busy||a.retry||reading;
 return <TownFoot rank={open?"board":"chip"} order={49}>
  <button className={`${button} pointer-events-auto`} data-spring-open onClick={()=>setOpen(v=>!v)}><TownIcon name="thingSpringStone" size={22}/>{th?"ตาน้ำพักทาง":"Rest-site spring"}</button>
  {open&&<section className="pointer-events-auto mt-2 max-w-sm rounded-xl border border-ink/20 bg-bg/95 p-3 text-ink shadow-xl" aria-label={th?"ตาน้ำพักทาง":"Rest-site spring"}>
   {site>=0?<>
    <p className="mb-2 font-semibold">{names[site][th?0:1]}</p>
    {active?<><p className="mb-3 text-ui">{th?`ทุกคนแบ่งน้ำกองเดียวกัน เหลือ ${active.left} ถัง · อีก ${Math.ceil((active.until-keeper.now())/60000)} นาที`:`One shared stock · ${active.left} bucketfuls remain · ${Math.ceil((active.until-keeper.now())/60000)} minutes left`}</p><button className={button} data-spring-draw disabled={disabled||!at} onClick={()=>{if(at)void a.send({action:"springDraw",site,at});}}>{th?"เติมภาชนะเปล่าที่ถือ · แรง 2":"Fill held empty container · 2 stamina"}</button></>:<><p className="mb-3 text-ui">{th?"ตาน้ำธรรมดา 12 ถัง อยู่หนึ่งชั่วโมง ทุกคนช่วยกันตักได้ ใช้แรง 3 และหนึ่งสิทธิ์วันนี้":"Twelve ordinary bucketfuls for everyone, lasting one hour. Awakening costs three stamina and one daily use"}</p>{own&&<button className={button} data-spring-place disabled={disabled||!at||usesLeft(p,"thingSpringStone",keeper.now())<1} onClick={()=>{if(at)void a.send({action:"springPlace",site,at});}}>{th?"ปลุกตาน้ำตรงนี้":"Awaken this spring"}</button>}</>}
   </>:<><p className="mb-2 text-ui">{th?"ไปยังจุดพักเหล่านี้เพื่อปลุกตาน้ำ วันละหนึ่งจุด":"Visit a marked rest site to awaken one spring a day"}</p><ul className="list-inside list-disc text-ui">{SPRINGS.sites.map((_,i)=><li key={i}>{names[i][th?0:1]}</li>)}</ul></>}
   {a.reply&&<p role="status" className="mt-3 text-ui">{a.reply.ok?(a.reply.moved?(th?`ตักน้ำธรรมดา ${a.reply.moved} ถัง`:`Drew ${a.reply.moved} ordinary bucketfuls`):(th?"ตาน้ำเปิดแล้ว ชวนเพื่อนมาเติมได้":"The spring is open. Friends can fill here")):a.reply.why==="spent"?(th?"มีตาน้ำอยู่แล้ว หรือใช้สิทธิ์วันนี้ไปแล้ว":"A spring is already active, or today's use is spent"):a.reply.why==="far"?(th?"เดินมาอยู่ข้างจุดพักก่อน":"Stand beside the rest site first"):(th?"ตาน้ำหมดแล้ว หรือยังไม่ได้ถือภาชนะเปล่า เทน้ำเดิมและแยกภาชนะเป็นหนึ่งชิ้นก่อน":"The spring has ended, or no empty single container is held. Empty existing water and split stacked containers first")}</p>}
   {a.retry&&<button className={`${button} mt-2`} onClick={()=>void a.send()}>{th?"ตรวจผลอีกครั้ง":"Check result again"}</button>}
  </section>}
 </TownFoot>;
}
