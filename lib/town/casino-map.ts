import { fromIso, toIso, type Vec } from './world';
import {CASINO_FURNITURE} from './casino-scenery';
export const CASINO_MAP = { id:'popoto-municipality-basement', label:'เทศบาล Popoto · Casino ชั้นใต้ดิน', width:16, height:12 } as const;
export const CASINO_MACHINE_X = [2.5,5.5,8.5,11.5,14.5];
export const CASINO_SPAWN = {x:8.5,y:9.5};
export const CASINO_BOUNDS = { minX:toIso(0,12).x-30,maxX:toIso(16,0).x+30,minY:-140,maxY:toIso(16,12).y+70 };
export function casinoWalkable(p:Vec) {
  const x=Math.floor(p.x),y=Math.floor(p.y);
  if(x<0||y<1||x>=16||y>=12)return false;
  if(CASINO_MACHINE_X.some(m=>Math.floor(m)===x&&y<=2))return false;
  if(CASINO_FURNITURE.some(f=>x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h))return false;
  return true;
}
/** The town's tile coordinates and stepAlong movement, with this interior's own collision grid. */
export function casinoPath(start:Vec,end:Vec): Vec[] {
  if(!casinoWalkable(end))return [];
  const sx=Math.floor(start.x),sy=Math.floor(start.y),ex=Math.floor(end.x),ey=Math.floor(end.y);
  if(sx===ex&&sy===ey)return [{...end}];
  const queue:Array<[number,number]>=[[sx,sy]],before=new Map<string,string|null>([[`${sx},${sy}`,null]]);
  for(let at=0;at<queue.length;at++){
    const [x,y]=queue[at];if(x===ex&&y===ey)break;
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
      const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
      if(before.has(key)||!casinoWalkable({x:nx+.5,y:ny+.5}))continue;
      before.set(key,`${x},${y}`);queue.push([nx,ny]);
    }
  }
  let key:string|null=`${ex},${ey}`;if(!before.has(key))return [];
  const path:Vec[]=[];while(key!==`${sx},${sy}`&&key){const [x,y]=key.split(',').map(Number);path.unshift({x:x+.5,y:y+.5});key=before.get(key)??null;}
  path[path.length-1]={...end};return path;
}
export const casinoTileFromIso=(x:number,y:number)=>fromIso(x,y);
