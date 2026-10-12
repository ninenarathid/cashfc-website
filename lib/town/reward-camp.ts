import {works,useGift} from './gifts';import {held,take,type Purse} from './trade';import {dayOf,spend} from './stamina';import {CAMPS,type FieldCamp} from './camps';import {extractionMarks} from './reward-actions';import type {RewardInput} from './reward-types';
export type CampLine='farming'|'helpers'|'kitchen';export interface CampMiss{index:number;mark:number}
export interface CampRetry{line:CampLine;until:number;site:number}
export function plantCampFlag(p:Purse,site:number,line:CampLine,at:[number,number],camp:FieldCamp|null,me:string,t:number){
 const no=(why:'none'|'far'|'spent')=>({ok:false as const,why});if(!works(p,'thingCampFlag')||!camp||camp.site!==site||camp.by!==me||camp.until<=t||camp.flag||!['farming','helpers','kitchen'].includes(line)||held(p.bag,'signalCord')<1)return no('none');if(Math.max(Math.abs(camp.x-at[0]),Math.abs(camp.y-at[1]))>CAMPS.reach)return no('far');const u=useGift(p,'thingCampFlag',t);if(!u.ok)return no('spent');return{ok:true as const,purse:{...spend(u.purse,1,t),bag:take(u.purse.bag,'signalCord',1)},camp:{...camp,flag:{line,members:[]}}};
}
/** Receipt contains the missed mark and its new played answer; no wrong beat becomes a success. */
export function consumeCampRetry(p:Purse,c:RewardInput,t:number){
 if(!c.campMiss)return{ok:true as const,purse:p};const miss=c.campMiss,state=p.professionRewards??{},coupon=p.campRetry;let line:CampLine,seed:number,width:number;
 if(c.action==='giantEnd'&&state.giant){line='farming';seed=state.giant.seed;width=.09;}
 else if(c.action==='reviveEnd'&&state.revive){line='helpers';seed=state.revive.seed;width=.07;}
 else if(c.action==='kitchenEnd'&&state.kitchen){line='kitchen';seed=(state.kitchen.seed+state.kitchen.stage)>>>0;width=.065;}
 else return{ok:false as const,why:'none' as const};
 if(!coupon||coupon.until<t||coupon.line!==line||!Number.isInteger(miss.index)||miss.index<0||miss.index>2||!Number.isFinite(miss.mark)||miss.mark<0||miss.mark>1||!('marks'in c)||!c.marks)return{ok:false as const,why:'none' as const};const target=extractionMarks(seed)[miss.index];
 if(Math.abs(target-miss.mark)<=width||!Number.isFinite(c.marks[miss.index])||c.marks[miss.index]<0||c.marks[miss.index]>1)return{ok:false as const,why:'none' as const};return{ok:true as const,purse:{...p,campRetry:null}};
}
export function flagBenefit(before:Purse,after:Purse,camp:FieldCamp,me:string,t:number){
 if(!camp.flag||camp.flag.members.includes(me)||camp.flag.members.length>=5||before.campRetryDay===dayOf(t))return{purse:after,camp};
 return{purse:{...after,campRetry:{line:camp.flag.line,until:Math.min(t+600000,camp.until),site:camp.site},campRetryDay:dayOf(t)},camp:{...camp,flag:{...camp.flag,members:[...camp.flag.members,me]}}};
}
