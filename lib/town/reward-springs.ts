import {WATER} from "./farm";
import {works,useGift} from "./gifts";
import {handOf,type Purse} from "./trade";
import {spend} from "./stamina";
import {WELL,CAMP} from "./world";
import type {RewardInput,RewardReply} from "./reward-types";
export const SPRINGS={sites:[[39,32],[WELL.x+3,WELL.y+1],[CAMP.fire.x-4,CAMP.fire.y+3],[11,216],[58,230]] as [number,number][],reach:2,capacity:12,duration:3600000};
export interface RewardSpring {site:number;id:string;by:string;at:[number,number];until:number;left:number}
export const springSite=(at:readonly number[])=>at.length===2&&at.every(Number.isSafeInteger)?SPRINGS.sites.findIndex(s=>Math.max(Math.abs(s[0]-at[0]),Math.abs(s[1]-at[1]))<=SPRINGS.reach):-1;
type Result=({ok:true;purse:Purse;spring:RewardSpring}&RewardReply)|{ok:false;why:"none"|"far"|"spent"};
/** The twelve bucketfuls belong to the spring, never twelve for each visitor. */
export function springAction(p:Purse,input:RewardInput,id:string,me:string,old:RewardSpring|null,now:number):Result{
 if((input.action!=="springPlace"&&input.action!=="springDraw")||!Number.isSafeInteger(input.site)||!SPRINGS.sites[input.site]||springSite(input.at)!==input.site)return {ok:false,why:"far"};
 if(input.action==="springPlace"){
  if(!works(p,"thingSpringStone"))return {ok:false,why:"none"};
  if(old&&old.until>now&&old.left>0)return {ok:false,why:"spent"};
  const used=useGift(p,"thingSpringStone",now);if(!used.ok)return {ok:false,why:used.why==="spent"?"spent":"none"};
  return {ok:true,spring:{site:input.site,id,by:me,at:SPRINGS.sites[input.site],until:now+SPRINGS.duration,left:SPRINGS.capacity},left:used.left,purse:spend(used.purse,3,now)};
 }
 if(!old||old.until<=now||old.left<=0||old.site!==input.site)return {ok:false,why:"none"};
 const hand=handOf(p);if(!hand||!WATER.buckets[hand])return {ok:false,why:"none"};
 if(p.bag.some(s=>s?.item===hand&&(s.water??0)>0))return {ok:false,why:"none"};
 const slot=p.bag.findIndex(s=>s?.item===hand&&s.n===1&&Object.keys(s).every(k=>['item','n'].includes(k)));if(slot<0)return {ok:false,why:"none"};
 const n=Math.min(old.left,WATER.buckets[hand]!);const bag=p.bag.slice();bag[slot]={item:hand,n:1,water:n};
 return {ok:true,spring:{...old,left:old.left-n},purse:{...spend(p,WATER.costs.draw,now),bag},moved:n};
}
