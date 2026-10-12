import { pouchesOf } from "./pouches";
import type { ItemId } from "./items";
import { ELEMENTS, GEMS, ORES } from "./tools";
import { held, type Purse } from "./trade";

export const SCANNABLE: readonly ItemId[] = [...ORES.map(o => o.shard), ...ELEMENTS.map(e => GEMS[e].chip)];
type Known = Pick<Purse, "bag" | "gifts" | "pouches" | "professionRewards">;
export function mineralKnowledge(p: Known): ItemId[] {
  const bags = [p.bag, ...pouchesOf(p).map(x=>x.slots)];
  return SCANNABLE.filter(id => p.professionRewards?.minerals?.includes(id) || bags.some(b => held(b, id) > 0));
}
/** Called only after all loot fits: a failed haul teaches nothing. */
export function learnMinerals<P extends Known>(p: P, got: ReadonlyArray<readonly [ItemId, number]>): P {
  const known = mineralKnowledge(p);
  const minerals = SCANNABLE.filter(id => known.includes(id) || got.some(([item, n]) => item === id && n > 0));
  return { ...p, professionRewards: { ...p.professionRewards, minerals } };
}
/** Remember an actual completed underground job, independently of owning the later lift reward. */
export function learnFloor<P extends Pick<Purse,"professionRewards">>(p:P,floor:number,limit:number):P{
  if(!Number.isInteger(floor)||floor<1||floor>limit)return p;
  const visited=Array.from(new Set([...(p.professionRewards?.visited??[]).filter(f=>Number.isInteger(f)&&f>=1&&f<=limit),floor])).sort((a,b)=>a-b);
  return {...p,professionRewards:{...p.professionRewards,visited}};
}
