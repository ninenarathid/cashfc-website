import { works,useGift } from "./gifts";
import { SPOTS } from "./forest";
import { stowAll } from "./pouches";
import { spend } from "./stamina";
import type { Purse } from "./trade";
import type { ItemId } from "./items";
import { extractionMarks } from "./reward-actions";
import type { TrailKind,RewardTrail,RewardInput,RewardReply } from "./reward-types";

type Result=({ok:true;purse:Purse}&RewardReply)|{ok:false;why:"none"|"far"|"full"|"spent"};
const gift=(kind:TrailKind)=>kind==="dragon"?"famRiverDragon":kind==="forest"?"thingForestRing":"thingStarBottle";
const validTile=(at:readonly number[])=>at.length===2&&at.every(Number.isSafeInteger);
const distance=(a:readonly number[],b:readonly number[])=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));
export function trailAnswer(node:RewardTrail["nodes"][number]):number[]{
  if(node.game==="timing")return extractionMarks(node.seed);
  const values=extractionMarks(node.seed).map(n=>Math.round(n*100)%3);
  return node.game==="memory"?[values[0]]:values;
}
/** Each run has exactly three independent, ordinary trace sites, never a shared spawn or a secret spot. */
export function beginTrail(p:Purse,kind:TrailKind,id:string,at:[number,number],now:number,seed:number):Result{
  if(!["forest","star"].includes(kind)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295||!works(p,gift(kind))||p.professionRewards?.trail)return {ok:false,why:"none"};
  if(!validTile(at)||!SPOTS.some(s=>distance(at,[s.x,s.y])<=8))return {ok:false,why:"far"};
  const sites=SPOTS.filter(s=>distance(at,[s.x,s.y])<=28).sort((a,b)=>a.id-b.id);
  if(sites.length<3)return {ok:false,why:"none"};
  const used=useGift(p,gift(kind),now);if(!used.ok)return {ok:false,why:used.why==="spent"?"spent":"none"};
  const offset=(seed>>>0)%sites.length,step=Math.floor(sites.length/3);
  const nodes=(["memory","order","timing"] as const).map((game,i)=>{const site=sites[(offset+i*step)%sites.length];return {at:[site.x,site.y] as [number,number],game,seed:((seed>>>0)+i*7919)%4294967296};});
  const trail:RewardTrail={id,kind,nodes,next:0,began:now,challenge:null};
  return {ok:true,purse:{...used.purse,professionRewards:{...used.purse.professionRewards,trail}},trail,left:used.left};
}
export function trailAction(p:Purse,input:Exclude<RewardInput,{action:"trailBegin"}>,request:string,now:number):Result{
  const trail=p.professionRewards?.trail;
  if(!("trail" in input)||!trail||input.trail!==trail.id||!works(p,gift(trail.kind)))return {ok:false,why:"none"};
  if(input.action==="trailCancel")return {ok:true,purse:{...p,professionRewards:{...p.professionRewards,trail:null}},trail:null};
  const node=trail.nodes[trail.next];if(!node||!validTile(input.at)||distance(input.at,node.at)>3)return {ok:false,why:"far"};
  if(input.action==="trailStage"){
    const challenge=trail.challenge&&now<=trail.challenge.until?trail.challenge:{id:request,began:now,until:now+90000};
    const next={...trail,challenge};return {ok:true,purse:{...p,professionRewards:{...p.professionRewards,trail:next}},trail:next};
  }
  if(input.action!=="trailEnd"||!trail.challenge||trail.challenge.id!==input.challenge||now<trail.challenge.began+2400||now>trail.challenge.until)return {ok:false,why:"none"};
  const expected=trailAnswer(node),answers=input.answers;
  if(!Array.isArray(answers)||answers.length!==expected.length||!answers.every(n=>Number.isFinite(n)&&n>=0&&n<=(node.game==="timing"?1:2)))return {ok:false,why:"none"};
  const won=expected.every((n,i)=>node.game==="timing"?Math.abs(n-answers[i])<=.09:n===answers[i]);
  const got:Array<[ItemId,number]>=!won||trail.kind==="dragon"?[]:trail.kind==="star"?(trail.next===2?[["starShard",1]]:[]):[[(["forestLichen","mushroomSpores","wildMedicRoot"] as const)[trail.next],1]];
  const stowed=stowAll(p,got);if(!stowed)return {ok:false,why:"full"};
  const completed=won&&trail.next===2,next=completed?null:{...trail,next:trail.next+(won?1:0),challenge:null};
  return {ok:true,purse:{...spend(stowed,2,now),professionRewards:{...stowed.professionRewards,trail:next,...(completed&&trail.kind==="dragon"&&trail.dragon?{dragon:{...trail.dragon,until:now+1800000}}:{})}},trail:next,got,passed:won?expected.length:0,completed};
}
