"use client";
import {useEffect,useRef} from 'react';
import type {SymbolId} from '@/lib/casino';
import {drawCasinoSymbol} from '@/lib/town/casino-symbol-art';
const names={seven:'7',cherry:'Cherry',gold:'Gold bar',popoto:'Popoto'};
export default function CasinoSymbol({id}:{id:SymbolId}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const ctx=ref.current?.getContext('2d');if(ctx){ctx.clearRect(0,0,32,32);drawCasinoSymbol(ctx,id,16,16,32);}},[id]);
  return <canvas ref={ref} width={32} height={32} role="img" aria-label={names[id]} className="casino-symbol"/>;
}
