"use client";
/**
 * The Casino Coin's own picture beside its counts (the owner, 2026-10-27: "วาดไอคอน Casino Coin ... ให้เป็น pixel art แบบเดียวกับ
 * เกม"): icons-casino-b's chip, from the casino's own small picture (lib/town/casino-reels.json), its pixels hard.
 */
import REELS from '@/lib/town/casino-reels.json';

const ICONS=REELS.icons as unknown as Record<string,[number,number,number,number]>,SHEET=`/town/casino/${REELS.image.split('/').pop()}`;

export default function CasinoChipIcon({size=18,className=''}:{size?:number;className?:string}){
  const [x,y,w,h]=ICONS.casinoChip,k=size/Math.max(w,h);
  return <span aria-hidden className={`inline-block shrink-0 ${className}`} style={{width:Math.round(w*k),height:Math.round(h*k),backgroundImage:`url(${SHEET})`,
    backgroundPosition:`${-x*k}px ${-y*k}px`,backgroundSize:`${REELS.size[0]*k}px ${REELS.size[1]*k}px`,backgroundRepeat:'no-repeat',imageRendering:'pixelated'}}/>;
}
