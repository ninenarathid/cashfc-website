import {reelAt, spinRevealed, type CasinoSpin} from '../casino';
import {drawCasinoSymbol} from './casino-symbol-art';

/** The cabinet's public display sits above heads and is painted after people.
 * Every viewer uses the recorded spin and reveal clock, never a second roll. */
export function drawCasinoMarquee(ctx:CanvasRenderingContext2D, machine:number, spin:CasinoSpin|undefined,
  player:string, now:number, x:number, y:number, scale:number, reduced:boolean) {
  const rolling=!!spin&&!spinRevealed(spin,now), won=!!spin&&!rolling&&!!spin.prize;
  const accent=rolling?'#f0cc83':won?'#add9b1':spin?'#eea994':'#d2ba8a';
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
  // A small brass bracket connects this display to its own cabinet.
  ctx.fillStyle='#624329';ctx.fillRect(-31,72,3,12);ctx.fillRect(28,72,3,12);
  ctx.fillStyle='#ba9457';ctx.fillRect(-30,72,1,12);ctx.fillRect(29,72,1,12);
  ctx.fillStyle='#36271c';ctx.fillRect(-48,0,96,74);
  ctx.fillStyle='#ac854d';ctx.fillRect(-47,1,94,72);
  ctx.fillStyle='#ead2a4';ctx.fillRect(-45,3,90,68);
  ctx.fillStyle='#493322';ctx.fillRect(-44,4,88,14);
  ctx.textAlign='center';ctx.textBaseline='middle';
  const fit=(text:string,width:number)=>{
    if(ctx.measureText(text).width<=width)return text;
    const chars=Array.from(text);while(chars.length&&ctx.measureText(chars.join('')+'…').width>width)chars.pop();
    return chars.join('')+'…';
  };
  ctx.font='9px Tahoma, sans-serif';ctx.fillStyle='#f4dfb7';
  ctx.fillText(fit(`${machine} · ${spin?.player_name??player}`,82),0,11);
  for(let reel=0;reel<4;reel++){
    const left=-43+reel*22;
    ctx.fillStyle='#9b7444';ctx.fillRect(left,21,20,25);
    ctx.fillStyle='#fff5da';ctx.fillRect(left+1,22,18,23);
    drawCasinoSymbol(ctx,spin?reelAt(spin,reel,now,reduced):'popoto',left+10,33.5,16);
  }
  ctx.fillStyle='#493322';ctx.fillRect(-44,49,88,21);
  ctx.fillStyle=accent;ctx.font='bold 10px Tahoma, sans-serif';
  const status=rolling?'กำลังลุ้น…':won?'ได้รางวัล!':spin?'ไม่ได้รางวัล':'พร้อมหมุน';
  ctx.fillText(status,0,spin?.prize&&!rolling?55:59);
  if(won){ctx.font='9px Tahoma, sans-serif';ctx.fillStyle='#fff0c9';ctx.fillText(fit(spin!.prize!.name,82),0,65);}
  ctx.restore();
}
