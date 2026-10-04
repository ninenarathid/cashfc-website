import { goesIn, isCookware } from "./cooking";
import { WATER, toolOf } from "./farm";
import { ALL_SIGNS, oddsOf } from "./fishing";
import { CARRIES, COOK_EASE, FIELD, KITCHEN_GEAR, RODS, TACKLE } from "./gear";
import { BAITS, CROPS, CROP_IDS, DISHES, DISH_IDS, ITEMS, ITEM_IDS, MAKES, MAKE_IDS, SCROLLS, type ItemId } from "./items";
import { INSIDE, foundScrolls } from "./scrolls";
import { GOODS } from "./trade";

/**
 * What every thing is good for, and where every thing comes from: the two
 * questions the owner asked before opening (2026-10-03: "make sure ว่า อุปกรณ์ ทุก
 * อย่างสามารถใช้ได้จริง / make sure ว่า recipe ของอาหารทุกอย่าง สามารถหาได้ในเกม").
 * Nothing here is shown to the players; it is for the tests, which hold the
 * rules to it, and for the owner's test window.
 */

/** What a tool does, by the rules that read it. */
export type Use =
  | "rod"       // fished with, held in the hand
  | "tackle"    // makes fishing easier, carried
  | "hoe"       // clears and tills a plot
  | "can"       // waters a plant
  | "blade"     // picks one more
  | "bucket"    // carries water from the river to the farm's well
  | "cookware"  // something is cooked or made in it
  | "kitchen"   // gives more helpings
  | "ease"      // makes the stirring easier
  | "carry"     // worn, makes the bag bigger
  | "serve"     // ladles a helping, or is ladled from
  | "table";    // lets more gather round a pot

/** The uses of a thing, as the rules have them. Empty for a thing that is only ever an ingredient, a bait, a seed, something to eat or to sell. */
export function usesOf(id: ItemId): Use[] {
  const uses: Use[] = [];
  if (id in RODS) uses.push("rod");
  if (id in TACKLE) uses.push("tackle");
  if (toolOf(id) === "hoe") uses.push("hoe");
  if (id in WATER.cans) uses.push("can");
  if (id in FIELD && toolOf(id) === null) uses.push("blade");
  if (id in WATER.buckets) uses.push("bucket");
  if (isCookware(id)) uses.push("cookware");
  if (id in KITCHEN_GEAR) uses.push("kitchen");
  if (id in COOK_EASE) uses.push("ease");
  if (id in CARRIES) uses.push("carry");
  if (id === "bowl" || id === "ladle" || id === "potFull") uses.push("serve");
  if (id === "tok") uses.push("table");
  return uses;
}

/** Where a thing comes from. */
export type Source = "shop" | "river" | "farm" | "kitchen";

/**
 * Everything that can be had in the game, and from where: bought from the
 * uncle; caught on a bait that can itself be had; grown from a seed that can;
 * cooked or made of things that can, in cookware that can. Worked out to the
 * end: what is made of what is made is here too. `shelf` is what the uncle
 * sells: everything he ever will, or only what his orders have opened so far
 * (lib/town/orders).
 */
export function sources(shelf: ItemId[] = Object.keys(GOODS) as ItemId[]): Map<ItemId, Source> {
  const from = new Map<ItemId, Source>();
  for (const id of shelf) from.set(id, "shop");
  const has = (id: ItemId) => from.has(id);
  for (let more = true; more;) {
    more = false;
    const add = (id: ItemId, source: Source) => { if (!from.has(id)) { from.set(id, source); more = true; } };
    // the river: with a rod, whatever a bait one has brings up, at any hour, in rain or not, deep water or shallow,
    // and whatever a fish may wait for
    if (Object.keys(RODS).some((r) => has(r as ItemId))) {
      for (const bait of BAITS) if (has(bait)) for (let hour = 0; hour < 24; hour++) for (const rain of [false, true]) for (const shallow of [false, true]) {
        for (const o of oddsOf(bait, hour, rain, false, shallow, ALL_SIGNS)) add(o.what, "river");
      }
    }
    // and what is inside what the river brings up: the scrolls nobody sells. (A seed in a fish's belly is not
    // counted on: it is luck, and what the uncle may ask for is worked out from this, lib/town/orders.)
    for (const thing of Object.keys(INSIDE) as ItemId[]) if (has(thing) && INSIDE[thing]!.tiers) for (const scroll of foundScrolls(INSIDE[thing]!.tiers!)) add(scroll, "river");
    // the farm: with a hoe, what a seed one has grows; and a plant that dies leaves compost
    if (ITEM_IDS.some((id) => toolOf(id) === "hoe" && has(id))) {
      for (const c of CROP_IDS) if (has(CROPS[c].seed)) { add(c, "farm"); add("compost", "farm"); }
    }
    // the kitchen: a dish (in a pot of the yard's), and what else is made
    for (const id of DISH_IDS) {
      const r = DISHES[id].recipe;
      if (r && r.needs.every(([n]) => has(n)) && r.in.every(has)) { add(id, "kitchen"); add("potFull", "kitchen"); }
    }
    for (const id of MAKE_IDS) {
      const m = MAKES[id]!;
      if (m.needs.every(([n]) => has(n)) && m.in.every(has)) add(id, "kitchen");
    }
    // and the odd dish: anything that goes in, cooked wrong by somebody who holds cookware
    if (ITEM_IDS.some((id) => isCookware(id) && has(id)) && ITEM_IDS.some((id) => goesIn(id) && has(id))) { add("oddDish", "kitchen"); add("potFull", "kitchen"); }
  }
  return from;
}

/** The things nobody can have yet: none, when the game is whole. */
export const missing = (): ItemId[] => { const from = sources(); return ITEM_IDS.filter((id) => !from.has(id)); };
/** The tools nothing reads: none, when every piece of gear does something. */
export const idle = (): ItemId[] => ITEM_IDS.filter((id) => ITEMS[id].kind === "tool" && !usesOf(id).length);
/** The dishes whose recipe nothing in the game leads to (lib/town/hints): none, when every recipe can be found. */
export const scrollOf = (id: ItemId): ItemId | null => (Object.keys(SCROLLS) as ItemId[]).find((s) => SCROLLS[s] === id) ?? null;
