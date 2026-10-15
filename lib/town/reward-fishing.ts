import {FISH,type FishId,type CatchId} from "./items";
import {works,useGift} from "./gifts";
import type {Purse} from "./trade";
import type {SchoolCall} from "./reward-types";
export type FishPool=ReadonlyArray<{what:CatchId;p:number}>;
export function startSchool(p:Purse,fish:FishId,pool:FishPool,now:number){
  if(!works(p,"thingSchoolBell")||!FISH[fish]||FISH[fish].tier==="legend"||!((p.best[fish]??0)>0)||!pool.some(x=>x.what===fish&&x.p>0))return {ok:false as const,why:"none" as const};
  if(p.professionRewards?.school&&p.professionRewards.school.left>0&&p.professionRewards.school.until>now)return {ok:false as const,why:"none" as const};
  const used=useGift(p,"thingSchoolBell",now);if(!used.ok)return {ok:false as const,why:used.why==="spent"?"spent" as const:"none" as const};
  const school:SchoolCall={fish,left:3,until:now+30*60000};return {ok:true as const,purse:{...used.purse,professionRewards:{...used.purse.professionRewards,school}},school,left:used.left};
}
/** One boosted catch per charge. Extra-line and stardust casts preserve the call. */
export function schoolWeights(p:Purse,pool:FishPool,star:boolean,now:number,pair=false){
  const s=p.professionRewards?.school;
  if(pair||star||!s||s.left<1||now>=s.until||!works(p,"thingSchoolBell")||!FISH[s.fish]||FISH[s.fish].tier==="legend"||!pool.some(x=>x.what===s.fish&&x.p>0))return {purse:p,odds:pool.map(x=>({...x}))};
  const weights=pool.map(x=>({...x,p:x.p*(x.what===s.fish?3:1)})),total=weights.reduce((sum,x)=>sum+x.p,0);
  if(!(total>0))return {purse:p,odds:pool.map(x=>({...x}))};
  return {purse:{...p,professionRewards:{...p.professionRewards,school:{...s,left:s.left-1}}},odds:weights.map(x=>({...x,p:x.p/total}))};
}
