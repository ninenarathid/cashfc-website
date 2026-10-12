import {works} from "./gifts";
import {carried} from "./line";
import {reachOf,ditch} from "./ditch";
import type {Plot,FarmSky} from "./farm";
import {spend} from "./stamina";
import {DRY} from "./weather";
import {bedOf} from "./world";
import type {Purse} from "./trade";
import {extractionMarks} from "./reward-actions";
import type {ConduitRun,RewardInput,RewardReply} from "./reward-types";
export const CONDUIT={cooldown:90*60000,roots:48,cost:1};
export const conduitAnswer=(seed:number)=>extractionMarks(seed).map(n=>Math.round(n*100)%3);
export const plantIdentity=(key:string,p:Plot)=>p.plant?`${key}:${p.plant.by}:${p.plant.sown}:${p.plant.crop}:${p.plant.picked}`:null;
type Result=({ok:true;purse:Purse;plots?:Record<string,Plot>;cooldown?:number}&RewardReply)|{ok:false;why:"none"|"far"|"spent"};
export function conduit(p:Purse,input:RewardInput,id:string,bed:Record<string,Plot>,cooldown:number,now:number,seed:number,rains:FarmSky=DRY):Result{
 const state=p.professionRewards??{},run=state.conduit,number=bedOf(...input.at);
 if(input.action==="conduitCancel")return {ok:true,purse:{...p,professionRewards:{...state,conduit:null}},conduit:null};
 if(!works(p,"thingRiverHorn")||!carried(p))return {ok:false,why:"none"};
 if(number<0)return {ok:false,why:"far"};
 if(cooldown>now)return {ok:false,why:"spent"};
 const filtered=Object.fromEntries(Object.entries(bed).filter(([key])=>{const [x,y]=key.split(',').map(Number);return bedOf(x,y)===number;}));
 if(input.action==="conduitBegin"){
  if(run&&now<=run.until)return {ok:false,why:"none"};
  const keys=reachOf(p,filtered,input.at,now,rains).slice(0,CONDUIT.roots);
  if(!keys.length||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return {ok:false,why:"none"};
  const next:ConduitRun={id,at:input.at,bed:number,seed,began:now,until:now+90000,roots:keys.map(key=>({key,identity:plantIdentity(key,filtered[key])!}))};
  return {ok:true,conduit:next,purse:{...p,professionRewards:{...state,conduit:next}}};
 }
 if(input.action!=="conduitEnd"||!run||run.id!==input.run||now<run.began+2400||now>run.until||input.answers.length!==3||!input.answers.every(n=>Number.isInteger(n)&&n>=0&&n<=2))return {ok:false,why:"none"};
 if(input.at.some((n,i)=>n!==run.at[i]))return {ok:false,why:"far"};
 const answers=conduitAnswer(run.seed),width=Math.ceil(run.roots.length/3),passed=answers.map((n,i)=>n===input.answers[i]);
 const matched=Object.fromEntries(run.roots.flatMap((r,i)=>filtered[r.key]&&plantIdentity(r.key,filtered[r.key])===r.identity&&passed[Math.floor(i/width)]?[[r.key,filtered[r.key]]]:[]));
 const did=ditch(p,matched,input.at,now,rains),updated=did.ok?did.plots:{},used=did.ok?did.used:0;
 // Deliberate flow saves stamina; no resource refund or water multiplication.
 const purse=did.ok?{...spend(p,1+used*CONDUIT.cost,now),bag:did.purse.bag}:spend(p,1,now);
 return {ok:true,purse:{...purse,professionRewards:{...state,conduit:null}},conduit:null,plots:updated,watered:Object.keys(updated),used,passed:passed.filter(Boolean).length,...(used>0?{cooldown:now+CONDUIT.cooldown}:{})};
}
