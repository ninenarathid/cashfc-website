"use client";
import {useEffect,useRef,useState} from 'react';
import type {Keeper} from '@/lib/town/keeper';
import {works} from '@/lib/town/gifts';
import {ITEMS} from '@/lib/town/items';
import {placeOf} from '@/lib/town/world';
import type {FarmDraw} from './TownFarm';
import {useReward} from './TownRewardActions';
import TownFoot from './TownFoot';
import {GradeBadge} from './TownTrade';
const button='pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-bg disabled:opacity-40';
export default function TownPicnic({keeper,th,at,register,sit}:{keeper:Keeper;th:boolean;at:[number,number]|null;register?:(draw:FarmDraw|null)=>void;sit?:()=>boolean}){
 const [open,setOpen]=useState(false),[,tick]=useState(0),a=useReward(keeper,'picnic'),rows=keeper.pots(),view=useRef(rows);view.current=rows;
 useEffect(()=>keeper.watch(()=>tick(n=>n+1)),[keeper]);
 useEffect(()=>{register?.(f=>{for(const pot of view.current){if(!pot.picnic||pot.feast)continue;const {ctx,project,s,things,onScreen,still,now:t}=f,c=project({x:pot.at[0]+.5,y:pot.at[1]+.5});if(!onScreen(c))continue;
  things.push({depth:pot.at[0]+pot.at[1]+.85,draw:()=>{
   const cell=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].forEach(([u,v],i)=>{const q=project({x:pot.at[0]+u,y:pot.at[1]+v});if(i)ctx.lineTo(Math.round(q.x),Math.round(q.y));else ctx.moveTo(Math.round(q.x),Math.round(q.y));});ctx.closePath();ctx.fill();};
   cell(.06,.06,.88,.88,'#524936');cell(.08,.08,.84,.84,'#c6bd90');
   for(let x=0;x<4;x++)for(let y=0;y<4;y++)cell(.1+x*.2,.1+y*.2,.2,.2,(x+y)%2?'#78816a':'#d1c79b');
   for(let j=0;j<7;j++){cell(.12+j*.11,.92,.035,.055,'#b4a776');cell(.92,.12+j*.11,.055,.035,'#b4a776');}
   for(let n=0;n<Math.min(4,pot.left);n++){const q=project({x:pot.at[0]+.3+(n%2)*.38,y:pot.at[1]+.3+Math.floor(n/2)*.38}),px=Math.round(q.x),py=Math.round(q.y);ctx.fillStyle='#534a35';ctx.fillRect(px-4*s,py-2*s,8*s,4*s);ctx.fillStyle='#d9d2b0';ctx.fillRect(px-4*s,py-4*s,8*s,3*s);ctx.fillStyle='#a67a48';ctx.fillRect(px-3*s,py-4*s,6*s,s);if(!still){const rise=(t/450+n)%5;ctx.fillStyle='#e0d9bf80';ctx.fillRect(Math.round(px+(n%2?1:-1)*s),Math.round(py-(6+rise)*s),s,2*s);}}
  }});
 }});return()=>register?.(null);},[register]);
 if(!at||!keeper.rewardDo)return null;
 const near=rows.filter(p=>p.picnic&&!p.feast&&placeOf(...p.at)===placeOf(...at)&&Math.hypot(p.at[0]-at[0],p.at[1]-at[1])<=2),p=keeper.purse(),slots=p.bag.flatMap((s,i)=>s?.item==='potFull'&&s.of&&s.of.left>0?[{i,s}]:[]),owns=works(p,'thingPicnicCloth'),busy=a.busy||a.retry;
 if(!owns&&!near.length&&!a.retry)return null;
 return <TownFoot rank={open?"board":"power"} icon="thingPicnicCloth" order={61}><button className={`${button} pointer-events-auto`} data-picnic-open onClick={()=>setOpen(v=>!v)}>{th?'ปิกนิก':'Picnic'}</button>{open&&<section className="pointer-events-auto mt-2 w-[min(360px,calc(100vw-24px))] max-h-[60dvh] overflow-y-auto rounded-xl bg-bg/95 p-3 text-ink"><p className="mb-3 text-ui">{th?'วางอาหารจริงได้สี่ถ้วย ใช้แรง 1 เพื่อนใกล้ ๆ เลือกนั่งกินได้ใน 30 วินาที นับโควตามื้อปกติ ลุกก่อนกินครบจะเสียอาหารส่วนที่เหลือ':'Set out up to four real servings for one stamina. Nearby friends choose to sit and eat in thirty seconds. Normal meal allowances apply; rising early forfeits the rest.'}</p><div className="flex flex-col gap-2">{owns&&slots.map(({i,s})=><button key={i} className={button} disabled={busy} data-picnic-place onClick={()=>void a.send({action:'picnicPlace',slot:i,at})}>{th?'ปูผ้า':'Lay the cloth'} · {ITEMS[s.of!.dish].name[th?'th':'en']} ×{Math.min(4,s.of!.left)}<GradeBadge grade={s.grade} th={th} inline/></button>)}{near.map(pot=><div key={pot.id} className="rounded-lg border border-ink/20 p-2"><p>{ITEMS[pot.dish].name[th?'th':'en']} ×{pot.left}<GradeBadge grade={pot.grade} th={th} inline/></p><button className={`${button} mt-2`} data-picnic-eat disabled={busy||!!p.eating} onClick={()=>{if(sit?.())void a.send({action:'picnicEat',pot:pot.id,at,seated:true});}}>{th?'นั่งกิน · 30 วินาที':'Sit and eat · 30 seconds'}</button>{pot.by===keeper.id&&<button className={`${button} ml-2 mt-2`} disabled={busy} onClick={()=>void keeper.potTake(pot.id,at)}>{th?'เก็บอาหาร':'Pack up'}</button>}</div>)}</div>{a.reply&&!a.reply.ok&&<p role="status" className="mt-2">{th?'ตรวจที่ว่าง อาหาร และโควตามื้อนี้ แล้วลองอีกครั้ง':'Check free ground, servings and this meal’s allowance.'}</p>}{a.retry&&<button className={button} onClick={()=>void a.send()}>{th?'ตรวจคำสั่งเดิม':'Check the same request'}</button>}</section>}</TownFoot>;
}
