import {CROSSINGS,type TemporaryCrossing} from './temporary-crossings';
import {works,useGift} from './gifts';
import {held,take,type Purse} from './trade';
import {spend} from './stamina';
import type {RewardInput} from './reward-types';
export function buildCrossing(p:Purse,input:RewardInput,id:string,me:string,old:TemporaryCrossing|null,now:number):{ok:true;purse:Purse;bridge:TemporaryCrossing;left:number}|{ok:false;why:'far'|'none'|'spent'} {
 if(input.action!=='bridgeBuild'||!Number.isSafeInteger(input.site)||!CROSSINGS[input.site])return {ok:false,why:'far'};
 const site=CROSSINGS[input.site];if(![site.a,site.b].some(bank=>bank.every((n,i)=>n===input.at[i])))return {ok:false,why:'far'};
 if(!works(p,'famBeaver')||held(p.bag,'log')<site.logs||held(p.bag,'rootFiber')<2||p.bag.some(s=>s&&['log','rootFiber'].includes(s.item)&&Object.keys(s).some(k=>!['item','n'].includes(k))))return {ok:false,why:'none'};
 if(old&&old.until>now)return {ok:false,why:'spent'};
 const used=useGift(p,'famBeaver',now);if(!used.ok)return {ok:false,why:used.why==='spent'?'spent':'none'};
 return {ok:true,purse:{...spend(used.purse,3,now),bag:take(take(p.bag,'log',site.logs),'rootFiber',2)},bridge:{site:input.site,id,by:me,until:now+1800000},left:used.left};
}
