import { carriedBag } from "./passive-equipment";
import { PREP_MAKES } from "./preparation-items";
import { byOf, type ItemId } from "./items";
import { levelOf, spend } from "./stamina";
import { held, put, roomFor, take, type Purse } from "./trade";
import { CAMP, KITCHEN } from "./world";

export type PrepId=keyof typeof PREP_MAKES;
export interface PrepRun { id:string; recipe:PrepId; seed:number; at:number; until:number; tile:[number,number] }
export interface PrepAnswers { method:number; heat:number; finish:number; correction?:boolean }
export const PREPARATION={
 cost:4,minMs:2000,minutes:3,
 stations:[...KITCHEN.places.map(p=>p.at),[CAMP.fire.x,CAMP.fire.y] as [number,number]],reach:1,
 farStations:[[CAMP.fire.x,CAMP.fire.y]],
 recipes:PREP_MAKES,
 // Three manual decisions: cut/grind/fold, adjust the initial heat, then finish by the colour and sound.
 methods:{dicedRoot:0,emberRice:2,brownedOnion:0,driedZest:0,crushedHerb:1,fishStock:2,roastedSeed:2,whiskedEgg:2,fragrantOil:1,smokedSalt:1,fermentStarter:2,brightSauce:1,thickBroth:2,sweetGlaze:2,spicePaste:1},
 heat:{dicedRoot:0,emberRice:2,brownedOnion:2,driedZest:1,crushedHerb:0,fishStock:1,roastedSeed:2,whiskedEgg:0,fragrantOil:1,smokedSalt:1,fermentStarter:0,brightSauce:1,thickBroth:1,sweetGlaze:1,spicePaste:0},
 finish:{dicedRoot:0,emberRice:1,brownedOnion:1,driedZest:0,crushedHerb:0,fishStock:2,roastedSeed:1,whiskedEgg:0,fragrantOil:2,smokedSalt:1,fermentStarter:0,brightSauce:2,thickBroth:2,sweetGlaze:2,spicePaste:0},
} as const;
export const atPreparation=(at:readonly number[])=>at.length===2&&at.every(Number.isInteger)&&PREPARATION.stations.some(s=>Math.max(Math.abs(s[0]-at[0]),Math.abs(s[1]-at[1]))<=PREPARATION.reach);
export function preparationTargets(run:PrepRun){return {method:PREPARATION.methods[run.recipe],heat:PREPARATION.heat[run.recipe],finish:PREPARATION.finish[run.recipe]};}
export function preparationReady(p:Purse,id:unknown,at:readonly number[]){
 if(!atPreparation(at))return "far" as const;
 if(typeof id!=="string"||!Object.hasOwn(PREP_MAKES,id))return "none" as const;
 const r=PREP_MAKES[id as PrepId];
 if(held(p.bag,"prepBoard")<1||r.in.some(tool=>held(p.bag,tool)<1))return "tool" as const;
 if(r.needs.some(([part,n])=>held(p.bag,part)<n))return "none" as const;
 return null;
}
export function prepare(p:Purse,run:PrepRun|null,id:string,answers:PrepAnswers,at:readonly number[],now:number){
 const no=(why:"none"|"far"|"tool"|"full"|"spent")=>({ok:false as const,why});
 if(!run||run.id!==id||now<run.at+PREPARATION.minMs||now>run.until)return no("none");
 if(at.length!==2||at[0]!==run.tile[0]||at[1]!==run.tile[1])return no("far");
 const refused=preparationReady(p,run.recipe,at);if(refused)return no(refused);
 if(!answers||![answers.method,answers.heat,answers.finish].every(n=>Number.isInteger(n)&&n>=0&&n<=2)||(answers.correction!==undefined&&typeof answers.correction!=="boolean"))return no("none");
 const target=preparationTargets(run);
 let mistakes=Number(answers.method!==target.method)+Number(answers.heat!==target.heat)+Number(answers.finish!==target.finish);
 const adjusts=Math.max(held(carriedBag(p),"tastingSpoon")>0?1:0,byOf("seasoning",levelOf(p,now,"seasoning")))>0;
 if(answers.correction&&!adjusts)return no("tool");
 // A taste can save one decision; carrying a spoon and eating the buff never makes this two.
 if(answers.correction)mistakes=Math.max(0,mistakes-1);
 const recipe=PREP_MAKES[run.recipe];let bag=p.bag;
 for(const[part,n]of recipe.needs)bag=take(bag,part,n);
 const item:ItemId=mistakes===0?run.recipe:"compost",n=mistakes===0?recipe.gives:1;
 if(roomFor(bag,item)<n)return no("full");
 return {ok:true as const,made:item,n,mistakes,purse:{...spend(p,PREPARATION.cost,now),bag:put(bag,item,n),prepBook:[...new Set([...(p.prepBook??[]),...(mistakes===0?[run.recipe]:[])])],made:[...new Set([...(p.made??[]),...(mistakes===0?[run.recipe]:[])])]}};
}
