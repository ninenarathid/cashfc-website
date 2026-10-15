import { works,usesLeft,useGift,giftsOf } from "./gifts";
import { SPOTS } from "./forest";
import { GEMS,ELEMENTS } from "./tools";
import { bySmith } from "./world";
import {floorAtTile,floorTile} from "./cave-state";
import { held,take,type Purse } from "./trade";
import { stowAll } from "./pouches";
import { spend,dayOf } from "./stamina";
import { mineralKnowledge } from "./reward-knowledge";
import { trailAnswer } from "./reward-trails";
import type { ItemId } from "./items";
import type { ResourceKind,ResourceRun,RewardInput,RewardReply } from "./reward-types";

export const RESOURCE_GIFTS={hive:"thingTreeHive",repair:"thingCrystalRepair",color:"charmGemColor",branch:"charmBranchVein"} as const;
export interface ResourceRecipe {needs:Array<[ItemId,number]>;got:Array<[ItemId,number]>}
const gems=ELEMENTS.map(e=>GEMS[e].gem),chips=ELEMENTS.map(e=>GEMS[e].chip);
export function resourceRecipe(kind:ResourceKind,key:string,p?:Purse):ResourceRecipe|null{
  if(kind==="branch"&&(key==="ore"||key==="crystal")){const item=p?.professionRewards?.branch?.[key];return item?{needs:[],got:[[item,key==="ore"?4:3]]}:null;}
  if(kind==="hive"&&["honey","wax"].includes(key))return {needs:[["fragrantPetal",5]],got:[[key==="honey"?"gardenHoney":"beeswax",2]]};
  if(kind==="repair"&&chips.includes(key as ItemId))return {needs:[[key as ItemId,2],["quartzCore",1],["rootTwine",1]],got:[["wholeGeode",1]]};
  if(kind==="color"){
    const [a,b,target,...extra]=key.split(":");
    if(!extra.length&&gems.includes(a as ItemId)&&gems.includes(b as ItemId)&&gems.includes(target as ItemId)&&target!==GEMS.light.gem&&target!==GEMS.dark.gem&&a!==b)return {needs:[[a as ItemId,1],[b as ItemId,1],["sparkPowder",1]],got:[[target as ItemId,1]]};
  }
  return null;
}
export function knownGemColors(p:Purse):ItemId[]{const known=mineralKnowledge(p);return ELEMENTS.filter(e=>known.includes(GEMS[e].chip)||held(p.bag,GEMS[e].gem)>0).map(e=>GEMS[e].gem);}
/** Ingredient selection uses physical, plain stacks. Tool sockets and stored material are never inputs. */
function supplied(p:Purse,r:ResourceRecipe){return r.needs.every(([id,n])=>held(p.bag,id)>=n&&!p.bag.some(s=>s?.item===id&&Object.keys(s).some(k=>k!=="item"&&k!=="n")));}
function located(kind:ResourceKind,at:[number,number],p:Purse,now:number){
 if(kind==="branch"){const s=p.professionRewards?.branch;return !!s&&s.day===dayOf(now)&&now<=s.until&&floorAtTile(...at)===s.floor&&floorTile(s.floor,s.day,...at)&&Math.max(Math.abs(at[0]-s.at[0]),Math.abs(at[1]-s.at[1]))<=3;}
 return kind==="hive"?SPOTS.some(s=>Math.max(Math.abs(s.x-at[0]),Math.abs(s.y-at[1]))<=8):bySmith(at[0]+.5,at[1]+.5);
}
type Result=({ok:true;purse:Purse}&RewardReply)|{ok:false;why:"none"|"far"|"full"|"spent"};
export function beginResource(p:Purse,kind:ResourceKind,recipe:string,id:string,at:[number,number],now:number,seed:number):Result{
  const gift=RESOURCE_GIFTS[kind],r=resourceRecipe(kind,recipe,p);
  if(!gift||!works(p,gift)||!r||!supplied(p,r)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return {ok:false,why:"none"};
  if(p.professionRewards?.resource&&now<=p.professionRewards.resource.until)return {ok:false,why:"none"};
  if(!located(kind,at,p,now))return {ok:false,why:"far"};
  if(kind==="color"&&!knownGemColors(p).includes(r.got[0][0]))return {ok:false,why:"none"};
  if(usesLeft(p,gift,now)<1)return {ok:false,why:"spent"};
  let preview=p.bag;for(const [item,n]of r.needs)preview=take(preview,item,n);
  if(!stowAll({...p,bag:preview},r.got))return {ok:false,why:"full"};
  const g=giftsOf(p),loadout=JSON.stringify([[...g.charms].sort(),g.familiar]);
  const source=p.professionRewards?.branch;
  const resource:ResourceRun={id,kind,recipe,at,node:{at,game:kind==="repair"||kind==="branch"?"timing":"order",seed:kind==="branch"?source!.seed:seed},began:now,until:kind==="branch"?Math.min(now+90000,source!.until):now+90000,loadout,...(kind==="branch"?{source:source!.key}:{})};
  return {ok:true,resource,purse:{...p,professionRewards:{...p.professionRewards,resource}}};
}
export type ResourceCorrection=(p:Purse,action:string,now:number,loadout:string)=>{purse:Purse;effect:import("./combo-types").ComboEffect}|null;
export function resourceAction(p:Purse,input:Extract<RewardInput,{action:"resourceEnd"|"resourceCancel"}>,now:number,correction?:ResourceCorrection):Result{
  const run=p.professionRewards?.resource;if(!run||run.id!==input.run||!works(p,RESOURCE_GIFTS[run.kind]))return {ok:false,why:"none"};
  if(input.action==="resourceCancel")return {ok:true,resource:null,purse:{...p,professionRewards:{...p.professionRewards,resource:null}}};
  if(now<run.began+2400||now>run.until)return {ok:false,why:"none"};
  if(input.at[0]!==run.at[0]||input.at[1]!==run.at[1]||!located(run.kind,input.at,p,now))return {ok:false,why:"far"};
  if(run.kind==="branch"&&run.source!==p.professionRewards?.branch?.key)return {ok:false,why:"none"};
  const r=resourceRecipe(run.kind,run.recipe,p),expected=trailAnswer(run.node),a=input.answers;
  if(!r||!supplied(p,r)||!Array.isArray(a)||a.length!==3||!a.every(n=>Number.isFinite(n)&&n>=0&&n<=(run.node.game==="timing"?1:2)))return {ok:false,why:"none"};
  const won=expected.every((n,i)=>run.node.game==="timing"?Math.abs(n-a[i])<=.09:n===a[i]);
  if(!won&&run.kind==="color"&&!run.correctionUsed&&run.loadout&&usesLeft(p,RESOURCE_GIFTS.color,now)>0){
    const bond=correction?.(p,`color:${run.id}`,now,run.loadout);
    if(bond){const resource={...run,began:now,correctionUsed:true};return {ok:true,resource,correction:true,combo:bond.effect,purse:{...bond.purse,professionRewards:{...bond.purse.professionRewards,resource}}};}
  }
  let bag=p.bag;if(won)for(const [item,n]of r.needs)bag=take(bag,item,n);
  const got=won?r.got:[],after=stowAll({...p,bag},got);if(!after)return {ok:false,why:"full"};
  const used=useGift(after,RESOURCE_GIFTS[run.kind],now);if(!used.ok)return {ok:false,why:used.why==="spent"?"spent":"none"};
  return {ok:true,got,passed:won?3:0,left:used.left,resource:null,purse:{...spend(used.purse,3,now),professionRewards:{...used.purse.professionRewards,resource:null,...(run.kind==="branch"?{branch:null}:{})}}};
}
