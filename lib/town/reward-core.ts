import { works,useGift } from "./gifts";
import { MINING,oreOf,pickOf } from "./mining";
import { floorTile } from "./cave-state";
import { visitedFloors } from "./reward-lift";
import { mineralKnowledge,learnFloor } from "./reward-knowledge";
import { ELEMENTS,GEMS } from "./tools";
import { stowAll } from "./pouches";
import { spend,dayOf } from "./stamina";
import { trailAnswer } from "./reward-trails";
import type { Purse } from "./trade";
import type { CoreRun,CoreRoute,RewardInput,RewardReply } from "./reward-types";
type Result=({ok:true;purse:Purse}&RewardReply)|{ok:false;why:"none"|"far"|"full"|"spent"};
export const CORE_ROUTES={ore:{game:"timing",cost:3,n:2},crystal:{game:"order",cost:4,n:1},safe:{game:"memory",cost:2,n:2}} as const;
export function coreChoices(run:CoreRun){return (["ore","crystal","safe"] as const).filter(r=>r==="safe"||(r==="ore"?run.known.includes(oreOf(run.floor)):ELEMENTS.some(e=>run.known.includes(GEMS[e].chip))));}
const located=(f:number,at:[number,number],now:number)=>at.length===2&&at.every(Number.isSafeInteger)&&floorTile(f,dayOf(now),...at);
export function beginCore(p:Purse,floor:number,id:string,at:[number,number],now:number,seed:number,proof:readonly number[]=[]):Result{
 if(!works(p,"thingCoreSpade")||!pickOf(p)||p.professionRewards?.core||!Number.isInteger(floor)||floor<1||floor>MINING.floors||!visitedFloors(p,proof).includes(floor)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return {ok:false,why:"none"};
 if(!located(floor,at,now))return {ok:false,why:"far"};
 const used=useGift(p,"thingCoreSpade",now);if(!used.ok)return {ok:false,why:used.why==="spent"?"spent":"none"};
 const core:CoreRun={id,floor,seed,began:now,next:0,known:mineralKnowledge(p),room:null},learned=learnFloor(used.purse,floor,MINING.floors);
 return {ok:true,core,left:used.left,purse:{...learned,professionRewards:{...learned.professionRewards,core}}};
}
/** A room's route, mineral and puzzle stay fixed across misses, reconnects and expired challenges. */
export function coreAction(p:Purse,input:Extract<RewardInput,{action:"coreRoom"|"coreEnd"|"coreCancel"}>,request:string,now:number):Result{
 const run=p.professionRewards?.core;if(!run||run.id!==input.core)return {ok:false,why:"none"};
 if(input.action==="coreCancel")return {ok:true,core:null,purse:{...p,professionRewards:{...p.professionRewards,core:null}}};
 if(!works(p,"thingCoreSpade")||!pickOf(p))return {ok:false,why:"none"};
 if(!located(run.floor,input.at,now))return {ok:false,why:"far"};
 if(input.action==="coreRoom"){
  if(!coreChoices(run).includes(input.route)||run.room&&run.room.route!==input.route)return {ok:false,why:"none"};
  const seed=(run.seed+run.next*7919)%4294967296,route=input.route;
  const chips=ELEMENTS.map(e=>GEMS[e].chip).filter(id=>run.known.includes(id));
  const room=run.room??{route,mineral:route==="safe"?"stone":route==="ore"?oreOf(run.floor):chips[seed%chips.length],node:{at:input.at,seed,game:CORE_ROUTES[route].game},challenge:null};
  const challenge=room.challenge&&now<=room.challenge.until&&input.at.every((v,i)=>v===room.node.at[i])?room.challenge:{id:request,began:now,until:now+90000};
  const core={...run,room:{...room,node:{...room.node,at:challenge===room.challenge?room.node.at:input.at},challenge}};
  return {ok:true,core,purse:{...p,professionRewards:{...p.professionRewards,core}}};
 }
 const room=run.room,c=room?.challenge;
 if(!room||!c||c.id!==input.challenge||now<c.began+2400||now>c.until)return {ok:false,why:"none"};
 if(input.at.some((v,i)=>v!==room.node.at[i]))return {ok:false,why:"far"};
 const a=input.answers,expected=trailAnswer(room.node),timing=room.node.game==="timing";
 if(!Array.isArray(a)||a.length!==expected.length||!a.every(n=>Number.isFinite(n)&&n>=0&&n<=(timing?1:2)))return {ok:false,why:"none"};
 const won=expected.every((v,i)=>timing?Math.abs(v-a[i])<=.09:v===a[i]),budget=CORE_ROUTES[room.route];
 const got:Array<[typeof room.mineral,number]>=won?[[room.mineral,budget.n]]:[],after=stowAll(p,got);if(!after)return {ok:false,why:"full"};
 const completed=won&&run.next===2,core=completed?null:{...run,next:run.next+(won?1:0),room:won?null:{...room,challenge:null}};
 return {ok:true,core,got,completed,passed:won?expected.length:0,purse:{...spend(after,budget.cost,now),professionRewards:{...after.professionRewards,core}}};
}
