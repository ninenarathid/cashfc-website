import{works}from'./gifts';import{held,type Purse}from'./trade';import{spend}from'./stamina';import{extractionMarks}from'./reward-actions';
export const RING_BEETLES=['rhinoBeetle','stagBeetle','jewelBeetle','herculesBeetle','scarab','orchardBeetle']as const;
export type RingBeetle=typeof RING_BEETLES[number];
export interface ArenaRun{id:string;bug:RingBeetle;opponent:RingBeetle;seed:number;at:[number,number];began:number;until:number}
export function arenaTargets(seed:number){return extractionMarks(seed).map(n=>({attack:Math.round(n*100)%3,mark:n}));}
export function arenaAction(p:Purse,input:{action:'arenaLook'|'arenaBegin'|'arenaEnd'|'arenaCancel';bug?:RingBeetle;run?:string;answers?:Array<{stance:number;mark:number}>;at:[number,number]},id:string,t:number,seed:number,known:readonly string[]){
 const before=p.professionRewards??{},state=before.arena;
 if(!works(p,'thingBeetleRing'))return {ok:false as const,why:'none' as const};
 if(input.action==='arenaLook')return {ok:true as const,purse:p,knownBeetles:RING_BEETLES.filter(b=>known.includes(b)&&held(p.bag,b)>0)};
 if(input.action==='arenaCancel')return {ok:true as const,purse:{...p,professionRewards:{...before,arena:null}},arena:null};
 if(input.action==='arenaBegin'){
  if(state&&state.until>t||!input.bug||!RING_BEETLES.includes(input.bug)||!known.includes(input.bug)||held(p.bag,input.bug)<1||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return {ok:false as const,why:'none' as const};
  const arena:ArenaRun={id,bug:input.bug,opponent:RING_BEETLES[seed%RING_BEETLES.length],seed,at:input.at,began:t,until:t+120000};return {ok:true as const,purse:{...p,professionRewards:{...before,arena}},arena};
 }
 if(!state||input.run!==state.id||state.until<t||t<state.began+6000||held(p.bag,state.bug)<1)return {ok:false as const,why:'none' as const};
 if(!state.at.every((n,i)=>n===input.at[i]))return {ok:false as const,why:'far' as const};
 if(!Array.isArray(input.answers)||input.answers.length!==3||input.answers.some(a=>!Number.isInteger(a.stance)||a.stance<0||a.stance>2||!Number.isFinite(a.mark)||a.mark<0||a.mark>1))return {ok:false as const,why:'none' as const};
 const targets=arenaTargets(state.seed),score=targets.reduce((n,x,i)=>n+(input.answers![i].stance===(x.attack+1)%3&&Math.abs(input.answers![i].mark-x.mark)<=.1?1:0),0),arenaBook={...before.arenaBook,[state.bug]:Math.max(before.arenaBook?.[state.bug]??0,score)};
 return {ok:true as const,purse:{...spend(p,1,t),professionRewards:{...before,arena:null,arenaBook}},arena:null,arenaScore:score};
}
