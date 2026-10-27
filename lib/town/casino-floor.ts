import type {Vec} from './world';
import {CASINO_FURNITURE} from './casino-scenery';
/** The casino's interior as tiles: no runtime import of the world, which reads it (lib/town/casino-room). */
export const CASINO_MAP = { id:'popoto-municipality-basement', label:'เทศบาล Popoto · Casino ชั้นใต้ดิน', width:16, height:12 } as const;
/** Ten machines: five along the back wall (1 to 5), five in a row before them (6 to 10), left to right (the owner, 2026-10-27: "เพิ่มเป็น 10 เครื่อง"). */
export const CASINO_MACHINE_X = [2.5,5.5,8.5,11.5,14.5,2.5,5.5,8.5,11.5,14.5];
/** Where each machine stands: the back wall's on row 2, the front row's on row 5; its stool is the row before it, one more. */
export const CASINO_MACHINE_Y = [2.5,2.5,2.5,2.5,2.5,5.5,5.5,5.5,5.5,5.5];
export const CASINO_SPAWN = {x:8.5,y:9.5};
export function casinoWalkable(p:Vec) {
  const x=Math.floor(p.x),y=Math.floor(p.y);
  if(x<0||y<1||x>=16||y>=12)return false;
  if(CASINO_MACHINE_X.some((m,i)=>Math.floor(m)===x&&(CASINO_MACHINE_Y[i]<3?y<=2:y===Math.floor(CASINO_MACHINE_Y[i]))))return false;
  if(CASINO_FURNITURE.some(f=>x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h))return false;
  return true;
}
