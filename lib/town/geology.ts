import { carriedBag } from "./passive-equipment";
import type { ItemId } from "./items";
import type { Purse } from "./trade";
import { held } from "./trade";
import { hasBuff } from "./stamina";
import type { PendingVein } from "./mining";
export interface RockChoice { echo: -1 | 1; focus: "ore" | "crystal" }
export const GEOLOGY = { version: 1, ore: 2, sieve: 1, crystal: 1, quartz: 1 } as const;
export const rockChoice = (v: unknown): v is RockChoice => !!v && typeof v === "object" && [-1, 1].includes((v as RockChoice).echo) && ["ore", "crystal"].includes((v as RockChoice).focus);
export const echoOf = (seed: number): -1 | 1 => Math.abs(Math.trunc(seed)) % 2 ? 1 : -1;
export const geologyMods = (purse: Purse, now: number) => ({ hint: hasBuff(purse, now, "layers") || held(carriedBag(purse), "echoHammer") > 0, cavities: held(carriedBag(purse), "cavityLens") > 0, preserve: held(carriedBag(purse), "crystalWrap") > 0, sieve: held(carriedBag(purse), "oreSieve") > 0, chisel: held(carriedBag(purse), "seamChisel") > 0, cord: held(carriedBag(purse), "surveyCord") > 0 });
/** The bounded vein account supplies the number reached. Empty attempts earn nothing. */
export function geologicalYield(vein: PendingVein, choice: RockChoice, ore: number, gems: number, purse: Purse): Array<[ItemId, number]> {
  if (ore + gems <= 0) return [];
  const correct = choice.echo === echoOf(vein.seed), mods = geologyMods(purse, 0);
  if (choice.focus === "crystal") return gems > 0 && vein.gem && correct ? [["wholeGeode", GEOLOGY.crystal + Number(mods.preserve)]] : [];
  const pool: ItemId[] = vein.f < 11 ? ["slateLayer", "clayPocket", "mineralSalt", "pyriteCluster"] : vein.f < 21 ? ["copperNodule", "ironNodule", "mineralSalt", "pyriteCluster"] : ["silverNodule", "ironNodule", "copperNodule", "pyriteCluster"];
  const raw = pool[Math.abs(Math.trunc(vein.seed)) % pool.length];
  return [...(ore > 0 ? [[raw, (correct ? GEOLOGY.ore : 1) + Number(mods.sieve)] as [ItemId, number]] : []), ...(correct && (mods.chisel || mods.cord) ? [["quartzCore", GEOLOGY.quartz] as [ItemId, number]] : [])];
}
