"use client";
/**
 * One reel of the sheet's machine as a strip of faces turning down past the line (lib/casino's reelView: the faces
 * over and under it seen, the owner, 2026-10-27), drawn on a canvas every frame while it turns, once when it stands.
 */
import {useEffect,useRef} from 'react';
import {reelView,type CasinoSpin} from '@/lib/casino';
import {casinoSymbolsReady,drawCasinoSymbol} from '@/lib/town/casino-symbol-art';

/** `now`: the room's clock, the server's time as useCasino keeps it (a device's own clock may be minutes off). */
export default function CasinoReel({spin,reel,reduced,now}:{spin:CasinoSpin|null;reel:number;reduced:boolean;now:{current:()=>number}}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let frame=0,gone=false,running=false;
    /** One frame; whether the reel still turns. */
    const draw=()=>{
      const box=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.round(box.width*dpr),h=Math.round(box.height*dpr);
      const ctx=canvas.getContext('2d');if(!ctx||!w||!h)return false;
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      // (a face's cell a little over half the window: the line's face whole, a part of the one over and under it)
      const cell=Math.round(box.height*.56)*dpr,size=Math.round(cell*.86),view=reelView(spin,reel,now.current(),reduced);
      ctx.clearRect(0,0,w,h);
      for(const {face,y} of view.faces)drawCasinoSymbol(ctx,face,w/2,h/2+y*cell,size);
      return view.moving;
    };
    // (a canvas with no size, its sheet shut, stops the loop; it starts again when the sheet opens and the canvas has one)
    const loop=()=>{running=!gone&&draw();if(running)frame=requestAnimationFrame(loop);};
    loop();
    void casinoSymbolsReady().then(()=>{if(!gone)draw();});
    const resized=new ResizeObserver(()=>{if(!gone&&!running)loop();});resized.observe(canvas);
    return()=>{gone=true;cancelAnimationFrame(frame);resized.disconnect();};
  },[spin,reel,reduced,now]);
  return <canvas ref={ref} className="casino-reel-strip" aria-hidden/>;
}
