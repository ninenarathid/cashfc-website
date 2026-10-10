"use client";
import { useEffect, useRef } from "react";
import { readToolWord, toolWord } from "@/lib/town/tools";
import type { Stack } from "@/lib/town/trade";
import { elementSkin } from "./element-skins";

export default function TownToolSkin({stack}:{stack:Stack}) {
  const canvas=useRef<HTMLCanvasElement>(null),word=toolWord(stack);
  useEffect(()=>{
    let frame=0,tries=0;
    const paint=()=>{
      const c=canvas.current?.getContext("2d"),skin=elementSkin(stack.item,readToolWord(word));
      if(!c)return;
      c.clearRect(0,0,96,96);
      if(!skin){if(++tries<300)frame=requestAnimationFrame(paint);return;}
      c.imageSmoothingEnabled=false;const [x,y,w,h]=skin.cell;c.drawImage(skin.image,x,y,w,h,0,0,96,96);
    };
    paint();return()=>cancelAnimationFrame(frame);
  },[stack.item,word]);
  return <canvas ref={canvas} width={96} height={96} className="size-24 shrink-0" role="img" aria-label="Elemental equipment appearance" data-element-skin={stack.item} data-element-word={word}/>;
}
