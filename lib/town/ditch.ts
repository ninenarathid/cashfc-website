import { FARMING, WATER, deedFor, see, type FarmRefusal, type Plot } from "./farm";
import type { ItemId } from "./items";
import { spend } from "./stamina";
import { handOf, type Done, type Purse } from "./trade";
import { DRY, type Rain } from "./weather";

/**
 * A bucket poured over a bed (the owner, 2026-10-05, of the members who carry
 * water for the others: "a bed's ditch", one of nine things thought of for
 * them, "ชอบทุกข้อเลยครับ").
 *
 * A carrier stood by while the farmers watered: their water went into the
 * well, and from there into somebody else's can. Now a bucket does something
 * at a bed too. Standing on a plot with a bucket that has water in it, it is
 * poured into the bed's ditch, and **each bucketful waters eight of the
 * bed's plants that could do with water, the nearest first**: anybody's bed,
 * as a can waters anybody's plant.
 *
 * - It is the same water: a bucketful into the well fills a plain can, which
 *   waters eight plants. What it spares is the walking and the stamina (three
 *   a bucketful, where eight waterings cost eight), not water.
 * - It is plain water: what a better can adds, or a meal that left green
 *   fingers, a bucket does not. A copper can still does more with a bucketful
 *   than the ditch does.
 * - A plant is watered once an hour, as ever: what is wet, by a can or by the
 *   rain, takes none of it. A bucketful that finds fewer than eight thirsty
 *   plants is poured out all the same.
 * - A yoke pours every bucketful it carries that the bed has plants for.
 *
 * It is written down as a watering of each plant (lib/town/well): whoever
 * pours is thanked at the picking and counted at the jar as whoever waters
 * with a can is, and the water was their own.
 *
 * Pure. The database does the same (v130: `town_ditch`).
 */
export const DITCH = {
  /** How many plants a bucketful waters. */
  plants: 8,
  /** The stamina a bucketful poured costs. */
  cost: 3,
};

/** Whether the plant in a plot could be watered now, by anybody. (What a can in the hand would be offered there: a can stands for any water.) */
export const thirsty = (key: string, plot: Plot, now: number, rains: readonly Rain[] = DRY) => deedFor(key, plot, "can", "", now, null, rains) === "water";

/** The bucketfuls in the bucket I hold (the first of its kind that has water in it), and which slot it is; none when what I hold carries no water. */
function held(purse: Purse): { hand: ItemId; slot: number; has: number } | null {
  const hand = handOf(purse);
  if (!hand || !(hand in WATER.buckets)) return null;
  const slot = purse.bag.findIndex((s) => s?.item === hand && (s.water ?? 0) > 0);
  return slot < 0 ? null : { hand, slot, has: Math.floor(purse.bag[slot]!.water!) };
}

/**
 * Which plots of a bed the bucket in my hand would water, poured from a tile: the thirsty ones, the nearest first
 * (then the one further up the map, then further left), as many as its water reaches. `bed` is every plot of that
 * bed that is not weeds, by its tile.
 */
export function reachOf(purse: Purse, bed: Record<string, Plot>, tile: [number, number], now: number, rains: readonly Rain[] = DRY): string[] {
  const mine = held(purse);
  if (!mine) return [];
  return Object.keys(bed).filter((key) => thirsty(key, bed[key], now, rains))
    .map((key) => { const [x, y] = key.split(",").map(Number); return { key, x, y, far: (x - tile[0]) ** 2 + (y - tile[1]) ** 2 }; })
    .sort((a, b) => a.far - b.far || a.y - b.y || a.x - b.x)
    .slice(0, mine.has * DITCH.plants).map((p) => p.key);
}

/**
 * Pour the bucket in my hand over a bed, from a tile of it. Gives the purse as it is afterwards, the plots that were
 * watered as they now are, and how many bucketfuls it took. Refused with nothing in the hand that carries water, or
 * none in it (`hand`); and with no plant there that could do with any: `wet` when one is only watered already,
 * `soil` otherwise.
 */
export function ditch(purse: Purse, bed: Record<string, Plot>, tile: [number, number], now: number, rains: readonly Rain[] = DRY):
  Done<{ purse: Purse; plots: Record<string, Plot>; used: number; watered: string[] }> | { ok: false; why: FarmRefusal } {
  const mine = held(purse);
  if (!mine) return { ok: false, why: "hand" };
  const watered = reachOf(purse, bed, tile, now, rains);
  if (!watered.length) {
    const wet = Object.keys(bed).some((key) => { const s = see(key, bed[key], now, rains); return !!bed[key].plant && !s.dead && s.wet; });
    return { ok: false, why: wet ? "wet" : "soil" };
  }
  const used = Math.ceil(watered.length / DITCH.plants), left = mine.has - used;
  const plots: Record<string, Plot> = {};
  for (const key of watered) {
    const p = bed[key].plant!;
    plots[key] = { ...bed[key], plant: { ...p, watered: now, boost: p.boost + FARMING.water.adds * 60_000 } };
  }
  return {
    ok: true, plots, used, watered,
    purse: { ...spend(purse, DITCH.cost * used, now), bag: purse.bag.map((s, i) => (i === mine.slot ? (left > 0 ? { item: mine.hand, n: 1, water: left } : { item: mine.hand, n: 1 }) : s)) },
  };
}
