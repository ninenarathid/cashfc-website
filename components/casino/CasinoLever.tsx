"use client";
/**
 * The slot's lever, in place of the spin button (the owner, 2026-10-27: "เปลี่ยนการกดปั่นเป็นการ ดึงคันโยกโดยเปลี่ยน UI ให้
 * เหมือนเครื่อง slot machine จริงๆ", the mock passed: "ภาพโอเคแล้ว"). Its mount and its arm in five poses are the casino's
 * own pictures (icons-casino-lever, lib/town/casino-reels.json), each arm laid by its brass cap on the mount's socket.
 * Dragged down it follows the finger and pulls once past most of the way; a tap pulls it whole; Enter or Space too
 * (a click with no pointer). It springs back by itself.
 */
import {useEffect,useRef,useState} from 'react';
import REELS from '@/lib/town/casino-reels.json';

const ICONS=REELS.icons as unknown as Record<string,[number,number,number,number]>,SHEET=`/town/casino/${REELS.image.split('/').pop()}`;
/** Screen pixels to one of the pictures': the reels' own size, whole. */
const K=2;
/** Each pose of the arm, upright to hanging down, with its pivot (the brass cap's middle) in its own pixels; the mount's socket likewise. */
const ARM:Array<[string,number,number]>=[['leverUp',7,36],['leverTiltUp',15.5,19],['leverFront',7,7.5],['leverTiltDown',17.5,4.5],['leverDown',7,5]];
const MOUNT:[string,number,number]=['leverMount',8.5,13.5];
/** How far down a finger goes for the whole pull, and the share of it that pulls. */
const PULL=90,ENOUGH=.6;

function Piece({name,px,py}:{name:string;px:number;py:number}){
  const [x,y,w,h]=ICONS[name];
  return <span className="casino-lever-piece" style={{width:w*K,height:h*K,left:-px*K,top:-py*K,backgroundImage:`url(${SHEET})`,backgroundPosition:`${-x*K}px ${-y*K}px`,backgroundSize:`${REELS.size[0]*K}px ${REELS.size[1]*K}px`}}/>;
}

export default function CasinoLever({ready,dim,label,onPull,className=''}:{ready:boolean;dim:boolean;label:string;onPull:()=>void;className?:string}){
  const [pose,setPose]=useState(0);
  const drag=useRef<{y:number;moved:boolean}|null>(null),timers=useRef<number[]>([]);
  const later=(ms:number,f:()=>void)=>{timers.current.push(window.setTimeout(f,ms));};
  const stop=()=>{timers.current.forEach(clearTimeout);timers.current=[];};
  useEffect(()=>stop,[]);
  /** Back up to upright, a pose at a time. */
  const back=(from:number)=>{stop();for(let p=from-1,t=60;p>=0;p--,t+=55){const q=p;later(t,()=>setPose(q));}};
  /** The whole pull: down a pose at a time, the spin at the bottom, then back. */
  const pull=()=>{stop();for(let p=1;p<ARM.length;p++){const q=p;later(p*40,()=>setPose(q));}later(ARM.length*40,()=>{onPull();back(ARM.length-1);});};
  const [name,px,py]=ARM[pose];
  return <button type="button" className={`casino-lever ${className}${dim?' is-dim':''}`} aria-label={label} title={label} disabled={!ready}
    onPointerDown={e=>{if(!ready||e.button>0)return;stop();e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,moved:false};}}
    onPointerMove={e=>{const d=drag.current;if(!d)return;const by=e.clientY-d.y;if(Math.abs(by)>6)d.moved=true;setPose(Math.round(Math.min(1,Math.max(0,by/PULL))*(ARM.length-1)));}}
    onPointerUp={e=>{const d=drag.current;drag.current=null;if(!d)return;const by=(e.clientY-d.y)/PULL;
      if(!d.moved)pull();else if(by>=ENOUGH){setPose(ARM.length-1);onPull();back(ARM.length-1);}else back(pose);}}
    onPointerCancel={()=>{drag.current=null;back(pose);}}
    // (a click no pointer made: the keyboard, or a script; a tap has pulled already)
    onClick={e=>{if(e.detail===0&&ready)pull();}}>
    <span className="casino-lever-pivot"><Piece name={MOUNT[0]} px={MOUNT[1]} py={MOUNT[2]}/><Piece name={name} px={px} py={py}/></span>
  </button>;
}
