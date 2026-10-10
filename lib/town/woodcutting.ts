import { carriedBag } from "./passive-equipment";
import type { ItemId } from "./items";
import { hasBuff } from "./stamina";
import { held, type Purse } from "./trade";
import { grainQuality, type GrainQuality, type WoodSelection } from "./wood-grain";

export const WOODCUTTING = { version: 1, quality: { rough: 1, clear: 2, heart: 2 }, hints: { notchGauge: 1, grainLens: 3 }, parts: { barkKnife: 2, sapTap: 2 }, brace: 1 } as const;
export const woodMods = (purse: Purse, now: number) => ({
  hints: Math.max(hasBuff(purse, now, "grain") ? 3 : 0, held(carriedBag(purse), "grainLens") > 0 ? WOODCUTTING.hints.grainLens : held(carriedBag(purse), "notchGauge") > 0 ? WOODCUTTING.hints.notchGauge : 0),
  direction: held(carriedBag(purse), "fellingWedge") > 0,
  buffered: held(carriedBag(purse), "braceStake") > 0,
});
export function woodQuality(tree: number, selected: WoodSelection, misses: number, purse: Purse, now: number): GrainQuality {
  return grainQuality(tree, selected, Math.max(0, misses - (woodMods(purse, now).buffered ? WOODCUTTING.brace : 0)));
}
/** A selected part is additional to the original logs and timber, and never rewards a lost go or a one-stroke power. */
export function woodYield(tree: number, elder: boolean, selected: WoodSelection, quality: GrainQuality, purse: Purse): Array<[ItemId, number]> {
  if (selected.part === "wood") return [[elder ? "cedarSliver" : quality === "heart" ? "heartwood" : quality === "clear" ? "straightWood" : "knottedWood", elder ? 1 : WOODCUTTING.quality[quality]]];
  if (selected.part === "bark") return [["pineBark", held(carriedBag(purse), "barkKnife") > 0 ? WOODCUTTING.parts.barkKnife : 1]];
  if (selected.part === "sap") return [["pinePitch", held(carriedBag(purse), "sapTap") > 0 ? WOODCUTTING.parts.sapTap : 1]];
  return [[selected.part === "seed" ? "pineNut" : "rootFiber", quality === "rough" ? 1 : 2]];
}
