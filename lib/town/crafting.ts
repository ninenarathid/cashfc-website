import { ITEMS, type ItemId } from "./items";
import { GEOLOGY_CRAFTS } from "./geology-items";
import { WOOD_CRAFTS } from "./wood-items";
import { GARDEN_CRAFTS } from "./garden-items";
import { INSECT_CRAFTS } from "./insect-items";
import { FORAGE_CRAFTS } from "./foraging-items";
import { STREAM_CRAFTS } from "./stream-items";
import { PREP_CRAFTS } from "./preparation-items";
import { CAMP_CRAFTS } from "./camp-items";
import { spend } from "./stamina";
import { held, no, put, roomFor, take, type Done, type Purse } from "./trade";

/** Workshop recipes use materials, never another tool's stack. Forging stays on the original tool. */
export const BASE_CRAFTS = {
  jar: [["clay", 6], ["stone", 2]],
  wok: [["oreIron", 3], ["timber", 1]],
  apron: [["silkCocoon", 4], ["vine", 2]],
  mortar: [["stone", 8], ["timber", 1]],
  sickle: [["oreIron", 2], ["timber", 1]],
  cleaver: [["oreIron", 3], ["timber", 1], ["resin", 1]],
  hoeIron: [["oreIron", 4], ["timber", 2]],
  rodTeak: [["timber", 3], ["silkCocoon", 3], ["oreIron", 1]],
  steamer: [["bambooCane", 4], ["vine", 2]],
  netSmall: [["bambooCane", 2], ["silkCocoon", 4]],
  sushiMat: [["bambooCane", 3], ["vine", 3]],
  canCopper: [["oreCopper", 4], ["resin", 1]],
  hookSteel: [["oreIron", 2], ["charcoal", 1]],
  lineBraid: [["silkCocoon", 4], ["vine", 2]],
  stoneBowl: [["stone", 6], ["clay", 2]],
  bucketIron: [["oreIron", 4], ["timber", 1]],
  floatQuill: [["feather", 4], ["bambooCane", 1], ["resin", 1]],
  rollingPin: [["timber", 2], ["resin", 1]],
  tok: [["bambooCane", 6], ["rope", 2]],
  oven: [["clay", 12], ["stone", 8], ["oreIron", 2]],
  ladle: [["timber", 2], ["oreCopper", 1]],
  hotpot: [["oreCopper", 6], ["oreIron", 3], ["charcoal", 2]],
  shears: [["oreIron", 4], ["charcoal", 2], ["timber", 1]],
  netLong: [["bambooCane", 4], ["silkCocoon", 8], ["rope", 2]],
  canBrass: [["oreCopper", 6], ["oreSilver", 2], ["resin", 2]],
  hoeSteel: [["oreIron", 6], ["charcoal", 3], ["timber", 3]],
  hookTwin: [["oreIron", 4], ["oreSilver", 1], ["charcoal", 2]],
  lineSilk: [["silkCocoon", 8], ["resin", 2], ["vine", 2]],
  panBrass: [["oreCopper", 6], ["oreSilver", 2], ["timber", 2]],
  potBrass: [["oreCopper", 8], ["oreSilver", 2]],
  stoveBig: [["clay", 10], ["oreIron", 5], ["stone", 4]],
  floatBell: [["oreCopper", 2], ["oreSilver", 1], ["bambooCane", 2]],
  rodMaster: [["timber", 6], ["silkCocoon", 6], ["oreSilver", 2]],
  steamerBamboo: [["bambooCane", 8], ["rope", 2], ["timber", 2]],
} as const satisfies Partial<Record<ItemId, ReadonlyArray<readonly [ItemId, number]>>>;
export const CRAFTS = { ...BASE_CRAFTS, ...WOOD_CRAFTS, ...GARDEN_CRAFTS, ...GEOLOGY_CRAFTS, ...INSECT_CRAFTS, ...FORAGE_CRAFTS, ...STREAM_CRAFTS, ...PREP_CRAFTS, ...CAMP_CRAFTS };
export type CraftId = keyof typeof CRAFTS;
export const CRAFT_IDS = Object.keys(CRAFTS) as CraftId[];
export const isCraft = (id: unknown): id is CraftId => typeof id === "string" && Object.hasOwn(CRAFTS, id);
export const CRAFT_COST = 4;
/** A first material opens a lead; unseen ingredients remain clues on the bench. */
export function craftLeads(purse: Purse, seen: readonly ItemId[] = []): CraftId[] {
  const known = new Set([...seen, ...purse.bag.flatMap(s => s ? [s.item] : []), ...(purse.crafted ?? [])]);
  return CRAFT_IDS.filter(id => known.has(id) || CRAFTS[id].some(([part]) => known.has(part)));
}
/** The bench fee covers the resale value: gathering free minerals cannot mint coins by selling tools. */
export const craftFee = (id: CraftId): number => ITEMS[id].pays;
export const craftRow = () => ({ cost: CRAFT_COST, recipes: Object.fromEntries(CRAFT_IDS.map((id) => [id, { needs: CRAFTS[id], fee: craftFee(id) }])) });
export const baseCraftRow = () => ({ cost: CRAFT_COST, recipes: Object.fromEntries((Object.keys(BASE_CRAFTS) as Array<keyof typeof BASE_CRAFTS>).map(id => [id, { needs: BASE_CRAFTS[id], fee: craftFee(id) }])) });

export function craft(purse: Purse, item: unknown, now: number): Done<{ purse: Purse; item: CraftId; n: number; fee: number }> {
  if (!isCraft(item)) return no("none");
  const fee = craftFee(item);
  if (purse.coins < fee) return no("coins");
  if (CRAFTS[item].some(([id, n]) => held(purse.bag, id) < n)) return no("none");
  let bag = purse.bag;
  for (const [id, n] of CRAFTS[item]) bag = take(bag, id, n);
  // Check after spending ingredients: the stacks they empty are available for the result.
  if (roomFor(bag, item) < 1) return no("full");
  return { ok: true, item, n: 1, fee, purse: { ...spend(purse, CRAFT_COST, now), coins: purse.coins - fee,
    bag: put(bag, item, 1), crafted: [...new Set([...(purse.crafted ?? []), item])] } };
}
