import type { ItemId } from "./items";
import type { Purse } from "./trade";

/**
 * Better gear makes things easier (the owner, 2026-10-03: "อุปกรณ์ ที่ดีขึ้น (ทำให้
 * เล่นง่าย)"). What each piece is better at, as numbers the games multiply by:
 * 1 is the first tier's, the plain thing.
 *
 * - **A rod** is the one in the hand (fishing is done with the rod held). A
 *   better one widens the safe stretch and slows its moves.
 * - **Tackle** only has to be in the bag, and the best of each kind counts:
 *   a float gives longer to strike, a hook is slower to slip, a line slower to
 *   snap, a net leaves less line to win.
 * - **A bag** is made bigger by what is carried: the basket, the carrying
 *   basket and the carrying pole, five slots each.
 * - **The plots' tools and the kitchen's**: how much quicker a hoe or a
 *   watering can works, how many more helpings better cookware gives, how
 *   much easier an apron makes the stirring, how much better a brush scrubs
 *   than a wad of fibre.
 *
 * Nothing here is told to the players: what a thing does is theirs to find.
 * Pure, and every number a knob.
 */
export const RODS = {
  rod: { band: 1, pace: 1 },
  rodTeak: { band: 1.2, pace: 0.88 },
  rodMaster: { band: 1.4, pace: 0.76 },
} satisfies Partial<Record<ItemId, { band: number; pace: number }>>;
export type RodId = keyof typeof RODS;
export const ROD_IDS = Object.keys(RODS) as RodId[];
export const isRod = (id: string | null | undefined): id is RodId => !!id && id in RODS;

/** What a piece of tackle is better at: the strike's moment, how long a hook holds while slack, how long a line bears strain, and the share of the line left to win. */
export const TACKLE: Partial<Record<ItemId, { strike?: number; slip?: number; snap?: number; line?: number }>> = {
  // (the first of each is made, of a fish: a float of a moonfish's scale, a hook of a gar's; lib/town/items' MAKES)
  // (and two of the forest's things: a float of a feather and a joint of bamboo, a line spun of silk cocoons)
  floatFeather: { strike: 1.1 }, floatGlow: { strike: 1.15 }, floatQuill: { strike: 1.25 }, floatBell: { strike: 1.5 },
  hookScale: { slip: 1.15 }, hookSteel: { slip: 1.3 }, hookTwin: { slip: 1.6 },
  lineSpun: { snap: 1.15 }, lineBraid: { snap: 1.3 }, lineSilk: { snap: 1.6 },
  netSmall: { line: 0.88 }, netLong: { line: 0.76 },
};

/** What somebody fishes with, all told: the rod, and what it and the tackle in the bag multiply. */
export interface Gear { rod: RodId | null; band: number; pace: number; strike: number; slip: number; snap: number; line: number }
export const PLAIN: Gear = { rod: null, band: 1, pace: 1, strike: 1, slip: 1, snap: 1, line: 1 };

/** The gear somebody has to hand: the rod they hold (or, holding none, the best in the bag), and the best of each kind of tackle in the bag. */
export function gearOf(bag: Purse["bag"], hand: ItemId | null): Gear {
  const has = (id: ItemId) => bag.some((s) => s?.item === id);
  const rod = isRod(hand) && has(hand) ? hand : [...ROD_IDS].reverse().find(has) ?? null;
  const gear: Gear = { ...PLAIN, rod, ...(rod ? RODS[rod] : {}) };
  for (const s of bag) {
    const t = s ? TACKLE[s.item] : undefined;
    if (!t) continue;
    gear.strike = Math.max(gear.strike, t.strike ?? 1);
    gear.slip = Math.max(gear.slip, t.slip ?? 1);
    gear.snap = Math.max(gear.snap, t.snap ?? 1);
    gear.line = Math.min(gear.line, t.line ?? 1);
  }
  return gear;
}

/** How many slots each thing carried adds to a bag. */
export const CARRIES: Partial<Record<ItemId, number>> = { basket: 5, krabung: 5, yoke: 5 };

/** The plots' tools: how many times as fast each works as the first of its kind. */
export const FIELD: Partial<Record<ItemId, number>> = { hoe: 1, hoeIron: 1.5, hoeSteel: 2.2, can: 1, canCopper: 1.5, canBrass: 2.2, sickle: 1.5, shears: 1.5 };
/** The kitchen's better cookware: how many times the helpings a dish cooked with it gives (in a cook's hand, or, the stove, in the bag of whoever begins the dish). */
export const KITCHEN_GEAR: Partial<Record<ItemId, number>> = { wok: 1.25, potBrass: 1.5, panBrass: 1.5, stoveBig: 1.25 };
/** What makes the stirring easier, carried by whoever stirs: how many times as wide the mark to hit is. */
export const COOK_EASE: Partial<Record<ItemId, number>> = { apron: 1.3 };
