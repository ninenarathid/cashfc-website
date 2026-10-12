import {works,usesLeft} from "./gifts";
import {bites,isGrown,heldBy,type Standing,type Grove} from "./trees";
import type {Purse,Stack} from "./trade";
export type DominoDirection=[number,number];
export type DominoPreview=(p:Purse,grove:Grove,tree:number,direction:DominoDirection,at:[number,number],now:number,wood?:readonly Standing[],me?:string)=>{purse:Purse;effect:import("./combo-types").ComboEffect}|null;
export const DOMINO_DIRECTIONS:readonly DominoDirection[]=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
export function validDominoDirection(d:readonly number[]):boolean{return d.length===2&&d.every(n=>Number.isInteger(n)&&Math.abs(n)<=1)&&d.some(n=>n!==0);}
/** The first physical trunk on a ray either continues the chain or stops it. No skipping blocked trunks. */
export function dominoGroup(p:Purse,grove:Grove,first:Standing,axe:Stack,now:number,direction:DominoDirection,wood:readonly Standing[],me?:string):Standing[]{
 if(!validDominoDirection(direction)||first.elder||!works(p,"charmDomino")||usesLeft(p,"charmDomino",now)<1)return [];
 const group=[first];let from=first;
 for(let i=1;i<3;i++){
  const ray=wood.filter(t=>!group.some(g=>g.id===t.id)&&isGrown(grove,t,now)).map(t=>({t,n:Math.max(Math.abs(t.x-from.x),Math.abs(t.y-from.y))})).filter(({t,n})=>n>=1&&n<=4&&t.x-from.x===direction[0]*n&&t.y-from.y===direction[1]*n).sort((a,b)=>a.n-b.n||a.t.id-b.t.id);
  const next=ray[0]?.t;if(!next||next.elder||bites(axe,next)||heldBy(grove,next.id,now,me))break;
  group.push(next);from=next;
 }
 return group;
}
