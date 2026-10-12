"use client";
import{useEffect,useRef}from'react';
import type{ComboCue,ComboEffect}from'@/lib/town/combo-types';
import{drawComboMaterial}from'./drawComboMaterial';
const WORDS:Record<ComboCue,[string,string]>={water:['สายน้ำตอบรับกัน','The water answers'],wood:['จังหวะสองเสียงตรงกัน','Two rhythms meet'],echo:['เสียงสะท้อนขานรับ','An echo answers']};
export default function TownComboMaterialFx({cue,effect,th,reduced=false,quiet=false}:{cue:ComboCue;effect?:ComboEffect;th:boolean;reduced?:boolean;quiet?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return;const from=performance.now(),still=reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches;let frame=0;const draw=(now:number)=>{ctx.clearRect(0,0,c.width,c.height);drawComboMaterial(ctx,32,36,1,now-from,cue,still);if(!still&&now-from<1600)frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);},[cue,reduced]);
 return<div data-combo-fx={cue} data-still={reduced||undefined} className="flex items-center justify-center gap-1 rounded-lg border border-[#bbcea0]/40 bg-[#203029]/90 px-2 py-1 text-[#e6e9c3]"><canvas ref={canvas} aria-hidden width={64} height={56} className={quiet?'size-10 shrink-0':'h-14 w-16 shrink-0'} style={{imageRendering:'pixelated'}}/><span className="text-meta leading-snug" role={quiet?undefined:'status'}>{effect?.fresh&&<strong className="block text-[#fff2cf]">{th?'ค้นพบความผูกพันใหม่!':'A new bond discovered!'}</strong>}{WORDS[cue][th?0:1]}{effect?.resume!==undefined&&<span className="block font-data">{th?`เริ่มใกล้ฝั่งขึ้น ${Math.round(effect.resume*100)}%`:`${Math.round(effect.resume*100)}% closer to shore`}</span>}</span></div>;
}
