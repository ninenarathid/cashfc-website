import type {Vec} from './world';
import {CASINO_DEPTH,CASINO_FURNITURE,CASINO_SIZE} from './casino-scenery';
/** The casino's interior as tiles: no runtime import of the world, which reads it (lib/town/casino-room). */
export const CASINO_MAP = { id:'popoto-municipality-basement', label:'เทศบาล Popoto · Casino ชั้นใต้ดิน', width:CASINO_SIZE.w, height:CASINO_SIZE.h } as const;
/** Each row's places, left to right. */
const ROW = [2.5,5.5,8.5,11.5,14.5,17.5,20.5,23.5,26.5,29.5];
/** Twenty machines: 1 to 10 where they have always stood, 11 to 20 in a row behind them along the wall (the owner, 2026-10-31). */
export const CASINO_MACHINE_X = [...ROW,...ROW];
/** Where each machine stands: the first row's with the floor behind it, the back row's against the wall; its stool is the row before it, one more. */
export const CASINO_MACHINE_Y = [...ROW.map(()=>2.5+CASINO_DEPTH),...ROW.map(()=>2.5)];
export const CASINO_SPAWN = {x:CASINO_SIZE.w/2+.5,y:9.5+CASINO_DEPTH};
export function casinoWalkable(p:Vec) {
  const x=Math.floor(p.x),y=Math.floor(p.y);
  if(x<0||y<1||x>=CASINO_MAP.width||y>=CASINO_MAP.height)return false;
  if(CASINO_MACHINE_X.some((m,i)=>Math.floor(m)===x&&(CASINO_MACHINE_Y[i]<3?y<=2:y===Math.floor(CASINO_MACHINE_Y[i]))))return false;
  if(CASINO_FURNITURE.some(f=>x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h))return false;
  return true;
}
