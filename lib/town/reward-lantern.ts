import {BUGS,BUG_IDS,fits,nectarHaunt,type BugId} from './insects';
import {works,useGift} from './gifts';import {spend} from './stamina';import type {Purse} from './trade';import type {Rain} from './weather';
/** Only the hour is simulated. Habitat, dry weather, rare day and moon remain real. */
export function lanternMay(at:[number,number],t:number,salt:string,rains:readonly Rain[],known:readonly string[]){const h=nectarHaunt(at);return h?BUG_IDS.filter(id=>known.includes(id)&&BUGS[id].hours?.some(([a,b])=>a===0||b===24)&&fits(BUGS[id],id,h,t,salt,rains,false,true)):[];}
export function lanternAction(p:Purse,input:{action:'lanternLook'|'lanternLight';bug?:BugId;at:[number,number]},t:number,salt:string,rains:readonly Rain[],known:readonly string[]){
 if(!works(p,'thingMoonLantern'))return {ok:false as const,why:'none' as const};
 const knownBugs=lanternMay(input.at,t,salt,rains,known);
 if(input.action==='lanternLook')return {ok:true as const,purse:p,knownBugs};
 const h=nectarHaunt(input.at);if(!h||!input.bug||!knownBugs.includes(input.bug))return {ok:false as const,why:'none' as const};
 if(p.lured&&p.lured.until>t)return {ok:false as const,why:'none' as const};
 const used=useGift(p,'thingMoonLantern',t);if(!used.ok)return used;
 const lured={x:input.at[0],y:input.at[1],haunt:h.id,bug:input.bug,n:1,from:t+3000,until:t+1200000,seed:(h.id*100003+Math.floor(t/1000))%2147483647,origin:'lantern' as const};
 return {ok:true as const,purse:{...spend(used.purse,2,t),lured},knownBugs,lured,left:used.left};
}
