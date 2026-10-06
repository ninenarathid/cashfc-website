import { roll } from "./farm";
import { DIG_SITES, KINDS, isDayOf } from "./forest";
import { USES, stretchOf, useGift, usedOf, type GiftRefusal } from "./gifts";
import { ITEMS, SCROLLS, type ItemId } from "./items";
import { GOODS, no, put, roomFor, type Done, type Purse } from "./trade";

/**
 * A sprite's treasure map (the forest's fifth rank: lib/town/gifts' thingMap; the owner's ladder of 2026-10-07: "a
 * sprite's chest to dig up: rare things of a day or a scroll, three maps a day"). Pure, like the rest: the moment and
 * the chance are given.
 *
 * - **Used, a map begins a hunt**: a chest is buried at one of the forest's dig sites (lib/town/forest's DIG_SITES),
 *   which one rolled from the word only whoever keeps the game knows, whose map it is, the day, and which of the
 *   day's maps. Nobody is told the tile, its owner neither.
 * - **The map is a ring drawn on the forest**: the chest lies somewhere inside it (its middle is off the chest by a
 *   roll of its own, so the ring's middle is no better a guess than its rim).
 * - **It is found by digging, hot and cold**: a dig anywhere says how near it was, in five warmths, and nothing more.
 *   So it is read like a map, walked to, and felt for: a small adventure, not a mark on a tile. A dig costs nothing
 *   but the walking; how many it took is kept, for the telling.
 * - **A dig on the tile itself brings up the chest**: a rare thing of the forest whose day it is, if it is such a
 *   day and the chest's own roll says so, or else a recipe scroll that is only ever found. Things, never coins.
 * - One hunt at a time, and a hunt lasts its day: a map not dug up by dawn is gone with the day's count.
 *
 * Every number is mine.
 */
export const HUNT = {
  /** How far the ring's middle may lie from the chest, each way, in tiles; and how wide the ring is: the chest is always inside it. */
  off: 5, radius: 8,
  /** How near a dig has to be for each warmth, in tiles (the larger of across and down): on it, beside it, near, not far, far. Beyond the last it is cold. */
  bands: [0, 1, 3, 6, 10] as readonly number[],
  /** The chance a chest holds a rare thing of the day, on a day that has one (else, and on a day that has none, a scroll); and a thing the relatives pay less than so much for comes two to a chest. */
  rare: 0.5, pair: 100,
};
/** A hunt as it is kept (`purse.forest.hunt`): the day it is of, which of that day's maps it is, and how many digs have missed. */
export interface Hunt { k: number; n: number; digs: number }
/** A hunt as its owner is told it: which map of the day, the digs so far, and the ring on the forest the chest lies inside. */
export interface HuntTold { n: number; digs: number; area: { x: number; y: number; r: number } }

/** The forest's things that have a day of their own, each once, with the chance a day is one: what a chest may hold. */
export const DAY_RARES: ReadonlyArray<readonly [ItemId, number]> = (() => {
  const out: Array<[ItemId, number]> = [];
  for (const k of Object.values(KINDS)) for (const f of k.finds) if (f.day && !out.some(([id]) => id === f.item)) out.push([f.item, f.day]);
  return out;
})();
/** The scrolls a chest may hold: of the first two tiers' dishes, the ones nobody sells (as a bottle from the river holds: lib/town/scrolls). */
export const CHEST_SCROLLS: readonly ItemId[] = (Object.keys(SCROLLS) as ItemId[]).filter((s) => !GOODS[s] && ITEMS[s].tier <= 2);

const forestOf = (purse: Pick<Purse, "forest">) => (purse.forest && typeof purse.forest === "object" ? purse.forest : {});
/** The hunt somebody is on now: the one kept, if it is of today (one of another day is gone with its day). */
export function huntOf(purse: Pick<Purse, "forest">, now: number): Hunt | null {
  const h = forestOf(purse).hunt as { k?: unknown; n?: unknown; digs?: unknown } | null | undefined;
  if (!h || typeof h !== "object" || typeof h.k !== "number" || typeof h.n !== "number" || h.k !== stretchOf(USES.thingMap!, now)) return null;
  return { k: h.k, n: Math.floor(h.n), digs: typeof h.digs === "number" && h.digs > 0 ? Math.floor(h.digs) : 0 };
}
/** The tile a hunt's chest is buried at: rolled from the keeper's word, whose hunt it is, the day and the map. */
export function huntSite(salt: string, me: string, hunt: Pick<Hunt, "k" | "n">): readonly [number, number] {
  return DIG_SITES[Math.min(DIG_SITES.length - 1, Math.floor(roll(`${salt}:hunt:${me}`, hunt.k, hunt.n) * DIG_SITES.length))];
}
/** The ring a hunt's map draws: its middle off the chest by rolls of its own, and wide enough that the chest is inside. */
export function huntArea(salt: string, me: string, hunt: Pick<Hunt, "k" | "n">): HuntTold["area"] {
  const [x, y] = huntSite(salt, me, hunt), span = 2 * HUNT.off + 1;
  return { x: x + Math.floor(roll(`${salt}:hunt:${me}:dx`, hunt.k, hunt.n) * span) - HUNT.off, y: y + Math.floor(roll(`${salt}:hunt:${me}:dy`, hunt.k, hunt.n) * span) - HUNT.off, r: HUNT.radius };
}
/** A hunt as its owner is told it; null with none on. */
export function huntTold(purse: Pick<Purse, "forest">, salt: string, me: string, now: number): HuntTold | null {
  const hunt = huntOf(purse, now);
  return hunt ? { n: hunt.n, digs: hunt.digs, area: huntArea(salt, me, hunt) } : null;
}
/** How warm a dig is: 0 on the chest, then beside it, near, not far, far; and one past the last of them, cold. */
export function warmthOf(site: readonly [number, number], at: readonly [number, number]): number {
  const d = Math.max(Math.abs(at[0] - site[0]), Math.abs(at[1] - site[1])), i = HUNT.bands.findIndex((b) => d <= b);
  return i < 0 ? HUNT.bands.length : i;
}
/** What a chest holds, by two rolls: a rare thing of the forest whose day it is (two of one worth little), or a scroll. */
export function chestOf(salt: string, now: number, rolls: readonly [number, number]): [ItemId, number] {
  const rares = DAY_RARES.filter(([id, day]) => isDayOf(salt, id, day, now));
  const pick = <T,>(list: readonly T[]) => list[Math.min(list.length - 1, Math.max(0, Math.floor(rolls[1] * list.length)))];
  if (rares.length && rolls[0] < HUNT.rare) { const [id] = pick(rares); return [id, ITEMS[id].pays < HUNT.pair ? 2 : 1]; }
  return [pick(CHEST_SCROLLS), 1];
}

/** Use a map: one of the day's, and a hunt begins. Refused with a hunt on already (`had`), with no map left today (`spent`), or with no such thing (`none`). */
export function mapUse<P extends Purse>(purse: P, now: number): { ok: true; purse: P; left: number } | { ok: false; why: GiftRefusal } {
  if (huntOf(purse, now)) return { ok: false, why: "had" };
  const used = useGift(purse, "thingMap", now);
  if (!used.ok) return used;
  return { ok: true, left: used.left, purse: { ...used.purse, forest: { ...forestOf(purse), hunt: { k: stretchOf(USES.thingMap!, now), n: usedOf(used.purse, "thingMap", now), digs: 0 } } } };
}
/**
 * Dig for the chest from the tile I stand on. Off it, the dig says how warm it was and is counted. On it, the chest
 * is up: what it holds is in the bag (which has to have room: nothing is lost, the chest waits), the hunt is over,
 * and it is one more in the count of chests found. Refused with no hunt on.
 */
export function mapDig(purse: Purse, salt: string, me: string, at: readonly [number, number], now: number, rolls: readonly [number, number]):
  Done<{ purse: Purse; found: boolean; warm: number; digs: number; got: Array<[ItemId, number]> }> {
  const hunt = huntOf(purse, now), mine = forestOf(purse);
  if (!hunt) return no("none");
  const warm = warmthOf(huntSite(salt, me, hunt), at), digs = hunt.digs + 1;
  if (warm > 0) return { ok: true, found: false, warm, digs, got: [], purse: { ...purse, forest: { ...mine, hunt: { ...hunt, digs } } } };
  const [item, n] = chestOf(salt, now, rolls);
  if (roomFor(purse.bag, item) < n) return no("full");
  const chests = typeof mine.chests === "number" && mine.chests > 0 ? Math.floor(mine.chests) : 0;
  return { ok: true, found: true, warm: 0, digs, got: [[item, n]], purse: { ...purse, bag: put(purse.bag, item, n), forest: { ...mine, hunt: null, chests: chests + 1 } } };
}

/** The catalog's part (in its forest row, as `hunt`): the dig sites, the ring, the warmths, and what a chest may hold, so that the database only looks up. */
export const huntRow = () => ({ sites: DIG_SITES.map(([x, y]) => [x, y]), off: HUNT.off, radius: HUNT.radius, bands: HUNT.bands, rare: HUNT.rare, pair: HUNT.pair, rares: DAY_RARES, scrolls: CHEST_SCROLLS });
