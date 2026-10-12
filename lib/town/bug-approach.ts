import type { Purse } from './trade';
import { handOf } from './trade';
import { mayNet, stealthOf, HAUNTS, type BugSight } from './insects';
export interface BugApproach {id:number;turn:number;at:[number,number];began:number;until:number;loadout:string;ready?:boolean}
export type ApproachContext='bugBegin'|'bugEnd'|'bugCancel';
/** One target only. The private caller decides whether this loadout can grant the bond. */
export function bugApproach(p:Purse,context:ApproachContext,c:Record<string,unknown>,t:number,sights:readonly BugSight[],eligible:boolean,loadout:string):{ok:true;purse:Purse}|null{
 const state=p.professionRewards??{},r=state.bugApproach;
 if(context==='bugCancel')return{ok:true as const,purse:{...p,professionRewards:{...state,bugApproach:null}}};
 const id=Number(c.id),turn=Number(c.turn),at=c.at as [number,number],h=HAUNTS[id];
 if(!eligible||!mayNet(handOf(p))||stealthOf(p,t)<=.5||!h||!sights.some(v=>v.id===id&&v.turn===turn)||!Array.isArray(at)||at.length!==2||at.some(n=>!Number.isInteger(n))||Math.min(...h.perches.map(v=>Math.max(Math.abs(v.x-at[0]),Math.abs(v.y-at[1]))))>8)return null;
 if(context==='bugBegin'){
  const started:BugApproach={id,turn,at,began:t,until:t+15000,loadout};return{ok:true as const,purse:{...p,professionRewards:{...state,bugApproach:started}}};
 }
 if(!r||r.ready||r.id!==id||r.turn!==turn||r.loadout!==loadout||r.at.some((n,i)=>n!==at[i])||t<r.began+1000||t>r.until)return null;
 return{ok:true as const,purse:{...p,professionRewards:{...state,bugApproach:{...r,ready:true,until:t+10000}}}};
}
export function quietApproach(p:Purse,id:number,turn:number,t:number,loadout:string){const r=p.professionRewards?.bugApproach;return !!r?.ready&&r.id===id&&r.turn===turn&&r.until>t&&r.loadout===loadout;}
