import type { BaitId, CatchId } from "./items";
import { FISH } from "./items";
import type { Current, FishingHabitat } from "./river-items";
import type { Purse } from "./trade";

export const CURRENTS: Current[] = ["eddy", "run", "shelter"];
export const currentsAt = (habitat: FishingHabitat): Current[] => habitat === "pool" ? ["eddy", "shelter"] : habitat === "town" ? ["eddy"] : CURRENTS;
export const currentAt = (habitat: FishingHabitat, natural: Current | undefined, chosen: Current | undefined): Current =>
  chosen && currentsAt(habitat).includes(chosen) ? chosen : natural ?? "eddy";
const PATTERN_MS = 15 * 60_000;
export function castPattern(purse: Purse, bait: BaitId, tile: readonly [number, number], current: Current, now: number) {
  const key = `${tile[0]},${tile[1]}:${current}:${bait}`, old = purse.fishingPattern;
  const n = old?.key === key && now >= old.at && now - old.at < PATTERN_MS ? Math.min(6,old.n+1) : 1;
  return {key,n,at:now};
}
/** Repeated bait in one pocket becomes less enticing; changing bait or position clears it immediately. */
export function patternOdds(odds: Array<{what: CatchId; p: number}>, n: number): Array<{what: CatchId; p: number}> {
  if(n<4)return odds;
  const weighted=odds.map(o=>({...o,p:o.p * (o.what in FISH && ["rare","legend"].includes(FISH[o.what as keyof typeof FISH].tier) ? 0.5 : 1)}));
  const total=weighted.reduce((sum,o)=>sum+o.p,0);
  return total>0 ? weighted.map(o=>({...o,p:o.p/total})) : [];
}
