import {BUGS,fits,nectarHaunt,type BugId} from './insects';import{works,useGift}from'./gifts';import{spend}from'./stamina';import type{Purse}from'./trade';import type{Rain}from'./weather';
export const CROWN_THEMES={flowers:['butterflyWhite','honeyBee','hoverfly'],garden:['ladybird','grasshopper','mantis'],night:['cricket','moth','firefly']} as const satisfies Record<string,readonly BugId[]>;
export type CrownTheme=keyof typeof CROWN_THEMES;
export interface CrownQuest{id:string;theme:CrownTheme;wanted:BugId[];seen:BugId[];left:number;began:number;until:number}
export function crownMay(q:CrownQuest|undefined|null,at:[number,number],t:number,salt:string,rains:readonly Rain[]){const h=nectarHaunt(at);return q&&h&&q.until>t&&q.seen.length===3&&q.left>0?q.wanted.filter(id=>fits(BUGS[id],id,h,t,salt,rains)):[];}
/** Called only after the original net transaction succeeds. Bonus followers and crown lures never feed this quest. */
export function crownCaught(before:Purse,after:Purse,got:readonly [string,number][],t:number,bonus=false):Purse{const q=before.professionRewards?.crown;if(bonus||!q||q.until<=t||q.seen.length===3||!works(before,'thingWingCrown'))return after;const seen=q.wanted.filter(id=>q.seen.includes(id)||got.some(([b,n])=>b===id&&n>0));return {...after,professionRewards:{...after.professionRewards,crown:{...q,seen}}};}
export function crownAction(p:Purse,input:{action:'crownLook'|'crownBegin'|'crownCall'|'crownCancel';theme?:CrownTheme;bug?:BugId;at:[number,number]},id:string,t:number,salt:string,rains:readonly Rain[]){
 if(!works(p,'thingWingCrown'))return {ok:false as const,why:'none' as const};const state=p.professionRewards??{},q=state.crown;
 if(input.action==='crownLook')return {ok:true as const,purse:p,crown:q??null,knownBugs:crownMay(q,input.at,t,salt,rains)};
 if(input.action==='crownCancel')return {ok:true as const,purse:{...p,professionRewards:{...state,crown:null}},crown:null};
 if(input.action==='crownBegin'){if(q&&q.until>t&&q.left>0||!input.theme||!(input.theme in CROWN_THEMES)||!nectarHaunt(input.at))return {ok:false as const,why:'none' as const};const used=useGift(p,'thingWingCrown',t);if(!used.ok)return used;const crown:CrownQuest={id,theme:input.theme,wanted:[...CROWN_THEMES[input.theme]],seen:[],left:3,began:t,until:t+86400000};return {ok:true as const,purse:{...spend(used.purse,2,t),professionRewards:{...state,crown}},crown};}
 const may=crownMay(q,input.at,t,salt,rains),h=nectarHaunt(input.at);if(!q||!h||!input.bug||!may.includes(input.bug)||p.lured&&p.lured.until>t)return {ok:false as const,why:'none' as const};
 const lured={x:input.at[0],y:input.at[1],haunt:h.id,bug:input.bug,n:1,from:t+3000,until:Math.min(q.until,t+1200000),seed:(h.id*100003+Math.floor(t/1000))%2147483647,origin:'crown' as const},crown={...q,left:q.left-1};return {ok:true as const,purse:{...p,lured,professionRewards:{...state,crown}},crown,lured,knownBugs:may};
}
