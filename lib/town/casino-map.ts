import { fromIso, toIso, type Vec } from './world';
import {CASINO_MACHINE_X,CASINO_MACHINE_Y,CASINO_MAP,CASINO_SPAWN,casinoWalkable} from './casino-floor';
export {CASINO_MACHINE_X,CASINO_MACHINE_Y,CASINO_MAP,CASINO_SPAWN,casinoWalkable};
export const CASINO_BOUNDS = { minX:toIso(0,CASINO_MAP.height).x-30,maxX:toIso(CASINO_MAP.width,0).x+30,minY:-140,maxY:toIso(CASINO_MAP.width,CASINO_MAP.height).y+70 };
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
