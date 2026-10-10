import { PLAIN_ROD, rodFx, type RodFx } from "./forged";
import type { ItemId } from "./items";
import type { Purse, Stack } from "./trade";

/**
 * Better gear makes things easier (the owner, 2026-10-03: "อุปกรณ์ ที่ดีขึ้น (ทำให้
 * เล่นง่าย)"). What each piece is better at, as numbers the games multiply by:
 * 1 is the first tier's, the plain thing.
 *
 * - **A rod** is the one in the hand (fishing is done with the rod held). A
 *   better one widens the safe stretch and slows its moves.
 * - **Hooks** use the chosen hook slot, with their item kept in the bag.
 * - **Other tackle** only has to be in the bag, and the best of each kind counts:
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
  flowFloat: { strike: 1.3 }, springLeader: { slip: 1.4 }, torrentNet: { line: 0.8 },
  // (the first of each is made, of a fish: a float of a moonfish's scale, a hook of a gar's; lib/town/items' MAKES)
  // (and two of the forest's things: a float of a feather and a joint of bamboo, a line spun of silk cocoons)
  floatFeather: { strike: 1.1 }, floatGlow: { strike: 1.15 }, floatQuill: { strike: 1.25 }, floatBell: { strike: 1.5 },
  hookScale: { slip: 1.15 }, hookSteel: { slip: 1.3 }, hookTwin: { slip: 1.6 },
  lineSpun: { snap: 1.15 }, lineBraid: { snap: 1.3 }, lineSilk: { snap: 1.6 },
  netSmall: { line: 0.88 }, netLong: { line: 0.76 },
};

/** What somebody fishes with, all told: the rod, and what it and the tackle in the bag multiply. */
export interface Gear {
  rod: RodId | null; band: number; pace: number; strike: number; slip: number; snap: number; line: number;
  // ── forging: old tools ── (what the rod's own forging is to a line and a fight: lib/town/forged; left out of a rod that carries nothing)
  fx?: RodFx;
}
export const PLAIN: Gear = { rod: null, band: 1, pace: 1, strike: 1, slip: 1, snap: 1, line: 1 };

// ── forging: old tools ──
/**
 * The rod somebody fishes with, as the stack it is: the one in the hand (`slot`: the slot it was taken up from, of
 * two of a kind), or, of a rod that is only in the bag, the one of its kind forged furthest. What it carries of its
 * own is that stack's and no other's.
 */
export function rodStack(bag: Purse["bag"], rod: RodId | null, slot: number | null = null): Stack | null {
  if (!rod) return null;
  const held = slot !== null && slot >= 0 ? bag[slot] : null;
  if (held?.item === rod) return held;
  let best: Stack | null = null;
  for (const s of bag) if (s?.item === rod && (!best || (s.plus ?? 0) > (best.plus ?? 0))) best = s;
  return best;
}

/**
 * The gear somebody has to hand: the rod held (or the best in the bag), the fitted hook, and the best other tackle.
 * (`slot`: the slot the thing in the hand was taken up from, where that is known: which of two rods of a kind is held.)
 */
export function gearOf(bag: Purse["bag"], hand: ItemId | null, slot: number | null = null, hook: Purse["fishingHook"] = null): Gear {
  const has = (id: ItemId) => bag.some((s) => s?.item === id);
  const rod = isRod(hand) && has(hand) ? hand : [...ROD_IDS].reverse().find(has) ?? null;
  const gear: Gear = { ...PLAIN, rod, ...(rod ? RODS[rod] : {}) };
  // ── forging: old tools ──
  const fx = rodFx(rodStack(bag, rod, rod === hand ? slot : null));
  if (fx !== PLAIN_ROD) gear.fx = fx;
  for (const s of bag) {
    if (s && ["hookScale", "hookSteel", "hookTwin"].includes(s.item) && (s.item !== hook || !rod || s.n < 1)) continue;
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
