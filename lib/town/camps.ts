import { carriedBag } from "./passive-equipment";
import { byOf, type ItemId, type MealBuffId } from "./items";
import { dayOf, levelOf, mealBuffs, spend } from "./stamina";
import { held, take, type Purse } from "./trade";
import { CAMP } from "./world";

export interface FieldCamp { site:number; x:number;y:number;by:string;until:number;left:number;wide:boolean;lit:boolean }
export const CAMPS={
 sites:[[CAMP.fire.x-3,CAMP.fire.y+3],[CAMP.fire.x+3,CAMP.fire.y+3],[11,216],[34,238],[58,230]] as [number,number][],
 reach:2,cost:4,minutes:30,awningMinutes:45,charges:3,chestCharges:5,benefitMinutes:10,daily:3,
 supplies:{trailRation:"calm",mintPoultice:"scent",repairBundle:"layers",seedPacket:"pollen",waterPack:"waterProperty",dryTinder:"grain",campCanvas:"calm",signalCord:"traces",warmBlanket:"hearty",fieldBandage:"green",travelBiscuit:"keen",sharedTea:"calm",soilCarePack:"pollen",toolCareOil:"grain",trailMarker:"traces"},
} as const;
export const campSiteAt=(at:readonly number[])=>at.length===2&&at.every(Number.isInteger)?CAMPS.sites.findIndex(s=>Math.max(Math.abs(s[0]-at[0]),Math.abs(s[1]-at[1]))<=CAMPS.reach):-1;
export function makeCamp(p:Purse,site:number,at:readonly number[],old:FieldCamp|null,me:string,now:number){
 const no=(why:"none"|"far"|"tool"|"spent")=>({ok:false as const,why});
 if(!Number.isInteger(site)||!CAMPS.sites[site]||campSiteAt(at)!==site)return no("far");
 if(held(p.bag,"campKit")<1)return no("tool");
 if(old&&old.until>now)return no("spent");
 const charges=held(carriedBag(p),"provisionChest")>0?CAMPS.chestCharges:CAMPS.charges;
 if(held(p.bag,"campCanvas")<1||held(p.bag,"dryTinder")<1||held(p.bag,"trailRation")<charges)return no("none");
 let bag=take(take(take(p.bag,"campCanvas",1),"dryTinder",1),"trailRation",charges);
 const wide=held(carriedBag(p),"signalPennant")>0,lit=held(carriedBag(p),"campLantern")>0;
 const camp:FieldCamp={site,x:CAMPS.sites[site][0],y:CAMPS.sites[site][1],by:me,until:now+(held(carriedBag(p),"weatherAwning")>0?CAMPS.awningMinutes:CAMPS.minutes)*60000,left:charges,wide,lit};
 return {ok:true as const,camp,purse:{...spend(p,CAMPS.cost,now),bag}};
}
export function campBenefit(p:Purse,camp:FieldCamp|null,supply:string,at:readonly number[],now:number){
 const no=(why:"none"|"far"|"spent"|"tool")=>({ok:false as const,why});
 if(!camp||camp.until<=now||camp.left<=0)return no("none");
 if(at.length!==2||!at.every(Number.isInteger)||Math.max(Math.abs(camp.x-at[0]),Math.abs(camp.y-at[1]))>CAMPS.reach)return no("far");
 if(!Object.hasOwn(CAMPS.supplies,supply))return no("none");
 const used=p.campUses?.day===dayOf(now)?p.campUses.n:0;
 if(used>=CAMPS.daily)return no("spent");
 if(held(p.bag,supply as ItemId)<1)return no("none");
 if(supply==="sharedTea"&&held(p.bag,"fieldKettle")<1)return no("tool");
 const effect=CAMPS.supplies[supply as keyof typeof CAMPS.supplies] as MealBuffId;
 const live=mealBuffs(p,now),had=live.find(b=>b.id===effect),until=now+CAMPS.benefitMinutes*60000*Math.max(1,byOf("campPreparation",levelOf(p,now,"campPreparation")));
 // Preserve the stronger existing buff and its clock. A camp never raises an existing level.
 const buffs=had?live.map(b=>b===had?{...b,until:Math.max(b.until,until)}:b):[...live,{id:effect,level:1,until}];
 return {ok:true as const,effect,camp:{...camp,left:camp.left-1},purse:{...spend(p,1,now),bag:take(p.bag,supply as ItemId,1),buffs,campUses:{day:dayOf(now),n:used+1},campBook:[...new Set([...(p.campBook??[]),supply as ItemId])]}};
}
