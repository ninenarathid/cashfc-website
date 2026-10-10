import { carriedBag } from "./passive-equipment";
import { HOES } from "./farm";
import type { Held, Place } from "./forest";
import type { ItemId } from "./items";
import { hasBuff, spend } from "./stamina";
import { held, no, put, roomFor, type Done, type Purse } from "./trade";

export type ForestPart="whole"|"leaf"|"root";
export interface ForestRest {from:number;until:number}
/** Uprooting leaves the current shares intact, then rests the site during its following turn. */
export const FORAGE_PARTS={
  parts:{leaves:{leaf:"forestLichen"},flowers:{leaf:"fragrantPetal",root:"flowerBulb"},bamboo:{leaf:"bambooSheath"},greens:{leaf:"fernTip",root:"wildMedicRoot"},berries:{leaf:"berryPip"},mushrooms:{leaf:"mushroomSpores"}},
  leaf:2,root:1,restMinutes:30,spadeMinutes:15,bonus:1,
} as const;
export const partsAt=(kind:string):Partial<Record<ForestPart,ItemId>>=>FORAGE_PARTS.parts[kind as keyof typeof FORAGE_PARTS.parts]??{};
export const seesTraces=(purse:Purse,now:number)=>held(carriedBag(purse),"traceLens")>0||hasBuff(purse,now,"traces");
export const restingAt=(rest:ForestRest|undefined,now:number)=>!!rest&&rest.from<=now&&now<rest.until;
/** All choices are checked again by the keeper; names and discoveries never determine a yield. */
export function gatherPart(purse:Purse,spot:Pick<Place,"id"|"kind">,has:Held,part:ForestPart,hand:ItemId|null,misses:number,cost:number,nextTurn:number,now:number):Done<{purse:Purse;got:Array<[ItemId,number]>;rest?:ForestRest}> {
  if(part!=="leaf"&&part!=="root")return no("none");
  const item=partsAt(spot.kind)[part];if(!item)return no("none");
  if(part==="root"&&held(carriedBag(purse),"rootSpade")<1&&(!hand||!HOES.includes(hand)))return no("tool");
  const carried=(id:ItemId)=>held(carriedBag(purse),id)>0;
  // Tools which protect the same yield share one bonus, even when several are carried together.
  const protection=part==="leaf"&&carried("pruningKnife")||item==="forestLichen"&&carried("specimenPress")||["berryPip","mushroomSpores"].includes(item)&&carried("seedSieve");
  const forgiven=carried("forageBasket")?1:0;
  const n=Math.max(1,(part==="leaf"?FORAGE_PARTS.leaf:FORAGE_PARTS.root)+(protection?FORAGE_PARTS.bonus:0)-Math.max(0,Math.floor(Number.isFinite(misses)?misses:0)-forgiven));
  if(roomFor(purse.bag,item)<n)return no("full");
  const entry=`${spot.kind}:${part}:${item}`,book=purse.forestPartsBook??[];
  const rest=part==="root"?{from:nextTurn,until:nextTurn+(carried("rootSpade")?FORAGE_PARTS.spadeMinutes:FORAGE_PARTS.restMinutes)*60000}:undefined;
  return {ok:true,purse:{...spend(purse,cost,now),bag:put(purse.bag,item,n),forestPartsBook:book.includes(entry)?book:[...book,entry]},got:[[item,n]],...(rest?{rest}:{})};
}
