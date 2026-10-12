import { WATER } from "./farm";
import { carried } from "./line";
import { works, useGift } from "./gifts";
import { spend } from "./stamina";
import type { Purse } from "./trade";
import type { RewardInput, RewardReply, WaterRelay } from "./reward-types";
import { FARM, FOREST } from "./world";

/** One real container left at a real point. It is neither extra bag storage nor a water source. */
export function relayPlace(at: readonly number[]): string | null {
  if (at.length!==2 || !at.every(Number.isSafeInteger)) return null;
  const [x,y]=at;
  if(x>=0&&y>=0&&x<64&&y<64)return "town";
  for(const [name,b] of [["farm",FARM],["forest",FOREST]] as const)
    if(x>=b.x&&y>=b.y&&x<b.x+b.w&&y<b.y+b.h)return name;
  return null;
}
export type WaterTrace={kind?:import("./waters").Nature|null;hands?:string[]};
type Result=({ok:true;purse:Purse}&RewardReply)|{ok:false;why:"none"|"far"|"full"|"spent"};
export function waterRelay(p:Purse,input:RewardInput,now:number,trace:WaterTrace={}):Result{
  const state=p.professionRewards??{},stored=state.relay;
  if(!relayPlace(input.at))return {ok:false,why:"far"};
  const finish=(purse:Purse,relay:WaterRelay|null,extra:RewardReply={}):Result=>({ok:true,purse:{...purse,professionRewards:{...purse.professionRewards,relay}},relay,...extra});
  if(input.action==="relayTake"){
    if(!stored)return {ok:false,why:"none"};
    if(Math.max(...input.at.map((n,i)=>Math.abs(n-stored.at[i])))>1)return {ok:false,why:"far"};
    if(stored.water>0&&p.bag.some(s=>s?.item===stored.item&&(s.water??0)>0))return {ok:false,why:"none"};
    const slot=p.bag.findIndex(s=>s===null);if(slot<0)return {ok:false,why:"full"};
    const bag=p.bag.slice();bag[slot]={item:stored.item,n:1,...(stored.water>0?{water:stored.water}:{})};
    return finish({...p,bag},null,{moved:stored.water});
  }
  if(!works(p,"famWaterRelay"))return {ok:false,why:"none"};
  if(input.action==="relayPlace"){
    if(stored||!Number.isSafeInteger(input.slot)||input.slot<0)return {ok:false,why:"none"};
    const s=p.bag[input.slot];
    if(!s||!WATER.buckets[s.item]||s.n!==1||Object.keys(s).some(k=>!['item','n'].includes(k)))return {ok:false,why:"none"};
    const bag=p.bag.slice();bag[input.slot]=null;
    return finish({...spend(p,1,now),bag},{item:s.item,at:input.at,water:0});
  }
  if(input.action!=="relaySend"||!stored||stored.water>0)return {ok:false,why:"none"};
  if(relayPlace(input.at)!==relayPlace(stored.at)||Math.max(...input.at.map((n,i)=>Math.abs(n-stored.at[i])))>40)return {ok:false,why:"far"};
  const source=carried(p);if(!source)return {ok:false,why:"none"};
  const n=Math.min(6,WATER.buckets[stored.item]!,source.has);if(n<1)return {ok:false,why:"none"};
  if(p.bag.some((s,i)=>s?.item===stored.item&&(i===source.slot?source.has-n:(s.water??0))>0))return {ok:false,why:"none"};
  const used=useGift(p,"famWaterRelay",now);if(!used.ok)return {ok:false,why:used.why==="spent"?"spent":"none"};
  const bag=p.bag.slice(),left=source.has-n;bag[source.slot]={item:source.hand,n:1,...(left>0?{water:left}:{})};
  const relay:WaterRelay={...stored,from:input.at,sentAt:now,water:n,kind:trace.kind??null,hands:[...new Set(trace.hands??[])].slice(-32)};
  return finish({...spend(used.purse,2,now),bag},relay,{moved:n,left:used.left});
}
