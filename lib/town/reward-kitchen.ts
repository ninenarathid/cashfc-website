import {works,useGift} from './gifts';
import {held,take,type Purse,type Stack} from './trade';
import {DISHES,type DishId,type MealBuffId,type ItemId} from './items';
import {spend} from './stamina';
import {extractionMarks} from './reward-actions';
import {KITCHEN} from './world';
import type {Pot} from './cooking';
export const FLAVORS={basil:'green',salt:'calm',garlic:'keen'} as const;
export interface KitchenRun {rescued?:boolean;id:string;kind:'fire'|'banquet';recipe?:DishId;seed:number;at:[number,number];began:number;until:number;stage:number;attempts:number;foods?:Stack[]}
export type KitchenInput={action:'kitchenBegin'|'kitchenEnd'|'kitchenCancel'|'flavorTune';kind?:KitchenRun['kind'];recipe?:DishId;ingredient?:keyof typeof FLAVORS;slots?:number[];run?:string;marks?:number[];at:[number,number]};
const no=(why:'none'|'far'|'spent')=>({ok:false as const,why});
export function kitchenAction(p:Purse,c:KitchenInput,id:string,t:number,seed:number,me:string){
 const state=p.professionRewards??{},r=state.kitchen;
 if(c.action==='kitchenCancel')return {ok:true as const,purse:{...p,professionRewards:{...state,kitchen:null}},kitchen:null};
 if(c.action==='flavorTune'){
  if(!works(p,'thingFlavorBook')||!c.recipe||!DISHES[c.recipe]?.recipe||!(p.made??[]).includes(c.recipe)||!c.ingredient||!(c.ingredient in FLAVORS)||held(p.bag,c.ingredient)<1)return no('none');
  if(state.flavor&&state.flavor.until>t)return no('none');const u=useGift(p,'thingFlavorBook',t);if(!u.ok)return no('spent');
  return {ok:true as const,purse:{...u.purse,bag:take(u.purse.bag,c.ingredient,1),professionRewards:{...state,flavor:{recipe:c.recipe,secondary:FLAVORS[c.ingredient],until:t+1800000}}}};
 }
 if(c.action==='kitchenBegin'){
  if(r&&r.until>t||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return no('none');
  let foods:Stack[]|undefined,bag=p.bag;
  if(c.kind==='fire'){if(!works(p,'charmChefFlame')||!c.recipe||!DISHES[c.recipe]?.recipe||!(p.made??[]).includes(c.recipe)||state.fire&&state.fire.until>t)return no('none');}
  else if(c.kind==='banquet'){
   if(!works(p,'thingDragonPot')||!c.slots||c.slots.length!==5)return no('none');foods=[];bag=[...bag];
   for(const i of c.slots){const s=Number.isInteger(i)&&i>=0?bag[i]:null;if(!s?.of||s.item!=='potFull'||s.of.left<1||!DISHES[s.of.dish]?.recipe||!(p.made??[]).includes(s.of.dish))return no('none');foods.push({...s,of:{...s.of,left:1}});bag[i]=s.of.left===1?null:{...s,of:{...s.of,left:s.of.left-1}};}
   if(new Set(foods.map(s=>s.of!.dish)).size<3)return no('none');
  }else return no('none');
  const u=useGift(p,c.kind==='fire'?'charmChefFlame':'thingDragonPot',t);if(!u.ok)return no('spent');
  const kitchen:KitchenRun={id,kind:c.kind,seed,at:c.at,began:t,until:t+1800000,stage:0,attempts:0,...(c.kind==='fire'?{recipe:c.recipe}:{foods})};
  return {ok:true as const,purse:{...u.purse,bag,professionRewards:{...state,kitchen}},kitchen};
 }
 if(!r||r.id!==c.run||r.until<t||t<r.began+2400||r.at.some((n,i)=>n!==c.at[i])||!works(p,r.kind==='fire'?'charmChefFlame':'thingDragonPot'))return no('far');
 if(!c.marks||c.marks.length!==3||c.marks.some(n=>!Number.isFinite(n)||n<0||n>1))return no('none');
 const pass=extractionMarks((r.seed+r.stage)>>>0).every((n,i)=>Math.abs(n-c.marks![i])<=.065),after=spend(p,2,t),attempts=r.attempts+1;
 if(!pass){const kitchen=attempts>=5?null:{...r,began:t,attempts};return {ok:true as const,purse:{...after,professionRewards:{...state,kitchen}},kitchen,kitchenPassed:false};}
 if(r.kind==='fire')return {ok:true as const,purse:{...after,professionRewards:{...state,kitchen:null,fire:{recipe:r.recipe!,until:t+1800000}}},kitchen:null,kitchenPassed:true};
 if(r.stage<2){const kitchen={...r,stage:r.stage+1,began:t,attempts};return {ok:true as const,purse:{...after,professionRewards:{...state,kitchen}},kitchen,kitchenPassed:true};}
 const banquet:Pot[]=r.foods!.map((s,i)=>({id:`${id}-${i}`,by:me,dish:s.of!.dish,left:1,at:KITCHEN.feast.tile,feast:true,set:t,warm:Math.max(s.warm??0,.5),...(s.scent?{scent:s.scent}:{}),...(s.secondary?{secondary:s.secondary}:{}),...(s.cookedBy?{cookedBy:s.cookedBy}:{}),...(s.cookId?{cookId:s.cookId}:{})}));
 return {ok:true as const,purse:{...after,professionRewards:{...state,kitchen:null}},kitchen:null,banquet,kitchenPassed:true};
}
/** One prepared bonus belongs to one actual manual pot, never a failed guess or sprite batch. */
export function kitchenCooked<T extends {ok:boolean;purse?:Purse;made?:ItemId|null;n?:number;back?:boolean;sprite?:boolean}>(before:Purse,d:T,misses:number,t:number,me:string,id:string):T{
 if(!d.ok||!d.purse||!d.made||!DISHES[d.made as DishId]?.recipe||d.back)return d;
 const state=before.professionRewards??{},fire=!d.sprite&&state.fire&&state.fire.until>=t&&state.fire.recipe===d.made&&works(before,'charmChefFlame'),flavor=!d.sprite&&state.flavor&&state.flavor.until>=t&&state.flavor.recipe===d.made&&works(before,'thingFlavorBook'),extra=fire&&misses===0?2:0;
 const slot=d.purse.bag.findIndex((s,i)=>s?.item==='potFull'&&s.of?.dish===d.made&&before.bag[i]?.item!=='potFull');if(slot<0)return d;
 const bag=d.purse.bag.map((s,i)=>i===slot?{...s!,of:{...s!.of!,left:s!.of!.left+extra},cookedBy:me,cookId:id,...(flavor?{secondary:state.flavor!.secondary}:{})}:s),professionRewards={...d.purse.professionRewards,...(fire?{fire:null}:{}),...(flavor?{flavor:null}:{})};
 return {...d,n:(d.n??0)+extra,purse:{...d.purse,bag,professionRewards}};
}
export type FoodMarks={warm?:number;scent?:number;secondary?:MealBuffId;cookedBy?:string;cookId?:string};
