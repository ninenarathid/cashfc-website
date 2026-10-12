import type { Purse } from '../trade';
import type { ItemId } from '../items';
import { held, handOf } from '../trade';
import { madeOf, takes, inHands } from '../cooking';
import { comboLoadout, matchesCombo, commitCombo } from './combos';

export interface WarmJob { id:string; things:Array<[ItemId,number]>; crew:Array<ItemId|null>; began:number; until:number; loadout:string; retried?:boolean }
/** The checkpoint buys another played attempt; it never adds ingredients or servings. */
export function warmCooking(p:Purse, context:'cookBegin'|'cookRetry'|'cookCancel', input:Record<string,unknown>, t:number, rain:boolean, id:string){
 const state=p.professionRewards??{},job=state.warmJob;
 if(context==='cookCancel')return {ok:true as const,purse:{...p,professionRewards:{...state,warmJob:null}}};
 if(!rain||!matchesCombo(p,['charmApron','famFrog']))return null;
 if(context==='cookBegin'){
  const things=input.things as Array<[ItemId,number]>,crew=input.crew as Array<ItemId|null>;
  if(!Array.isArray(things)||!things.length||things.some(v=>!Array.isArray(v)||v.length!==2||!Number.isInteger(v[1])||v[1]<1)||!Array.isArray(crew)||crew.length<1||crew[0]!==handOf(p))return null;
  const made=madeOf(things);if(!made||!p.made?.includes(made)&&!p.recipes.includes(made as never)||!inHands(takes(made).in,crew)||crew.length<takes(made).cooks)return null;
  const totals=new Map<ItemId,number>();for(const[k,n]of things)totals.set(k,(totals.get(k)??0)+n);if([...totals].some(([k,n])=>held(p.bag,k)<n))return null;
  const r:WarmJob={id,things,crew,began:t,until:t+120000,loadout:comboLoadout(p)};return {ok:true as const,purse:{...p,professionRewards:{...state,warmJob:r}},job:id};
 }
 if(!job||job.id!==input.job||job.retried||t<job.began+2400||t>job.until||job.loadout!==comboLoadout(p)||Number(input.hits)<1||Number(input.misses)<1||!Number.isFinite(input.secs)||Number(input.secs)<2.4||job.crew[0]!==handOf(p))return null;
 const totals=new Map<ItemId,number>();for(const[k,n]of job.things)totals.set(k,(totals.get(k)??0)+n);if([...totals].some(([k,n])=>held(p.bag,k)<n))return null;
 const bond=commitCombo(p,'SC04',`cook:${job.id}`,t);if(!bond)return null;
 return {ok:true as const,purse:{...bond.purse,professionRewards:{...state,warmJob:{...job,retried:true}}},effect:bond.effect};
}
