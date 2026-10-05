import { push } from "./deal";
import type { ItemId } from "./items";
import { no, type Done, type Purse, type Stack } from "./trade";
import { COLS, FARM, FOREST, ROWS, placeOf } from "./world";

/**
 * Things dropped on the ground (the owner, 2026-10-05: "สามารถทิ้งของที่ไม่ใช้จาก
 * กระเป๋าได้ ลงพื้น คนอื่นเก็บได้ แต่ถ้าไม่มีคนเก็บจะหายไปใน 10 วิ").
 *
 * Whatever is in a slot of the bag can be dropped where its holder stands:
 * the whole of the slot, as the stack it is (a pot goes with its food, a can
 * with its water). It lies there for ten seconds. Anybody standing by it in
 * that time picks it up, the one who dropped it too, if their bag has room
 * for all of it; the first to do so has it. After the ten seconds it is gone
 * for good.
 *
 * So a bag is made room in without a trip to the uncle, a thing is handed to
 * whoever stands near without a deal, and what nobody wants leaves the game.
 * Every drop and every picking up is written down by whoever keeps the game
 * (a drop that nobody answers is a thing lost).
 *
 * Pure: who keeps what lies about is somebody else's (the browser's trial; the
 * database, v134), and so is the clock.
 */
export const GROUND = {
  /** How long a thing lies before it is gone, in seconds. */
  lasts: 10,
  /** How near a thing one stands to pick it up, in tiles (one: on its tile, or any of the eight about it). */
  reach: 1,
};
/** The maps a thing may be dropped on, each as the box of its tiles: the town, the farm and the forest (what the database is told: it knows no tile's ground). */
export const GROUND_MAPS: Array<[x: number, y: number, w: number, h: number]> = [[0, 0, COLS, ROWS], [FARM.x, FARM.y, FARM.w, FARM.h], [FOREST.x, FOREST.y, FOREST.w, FOREST.h]];

/** A thing lying on the ground: who dropped it, the stack as it left their bag, the tile it lies on, and the moment it is gone. */
export interface Dropped { id: number; by: string; stack: Stack; at: [number, number]; until: number }

/** Why something was not done with a thing on the ground, beyond what a bag refuses for. */
export type GroundRefusal =
  | "far"   // not standing by it
  | "lost"; // it is not there any more: somebody picked it up, or its time ran out
type Did<T> = Done<T> | { ok: false; why: GroundRefusal };
const not = (why: GroundRefusal): { ok: false; why: GroundRefusal } => ({ ok: false, why });

/** What lies on the ground at a moment: everything whose time has not run out. */
export const lying = (all: readonly Dropped[], now: number): Dropped[] => all.filter((d) => d.until > now);
/** Whether somebody on a tile stands by a thing. */
export const reaches = (d: Dropped, at: readonly [number, number]) => Math.max(Math.abs(at[0] - d.at[0]), Math.abs(at[1] - d.at[1])) <= GROUND.reach;

/**
 * Drop what is in a slot of my bag onto the tile I stand on: all of it. `id` is the number whoever keeps the game
 * gives the thing. Refused when the slot has nothing in it, and when the tile is on no map.
 */
export function drop(purse: Purse, slot: number, by: string, at: readonly [number, number], now: number, id: number): Done<{ purse: Purse; dropped: Dropped }> {
  const s = Number.isInteger(slot) && slot >= 0 ? purse.bag[slot] : null;
  if (!s) return no("none");
  if (!Number.isInteger(at[0]) || !Number.isInteger(at[1]) || placeOf(at[0], at[1]) === null) return no("none");
  return {
    ok: true,
    purse: { ...purse, bag: purse.bag.map((b, i) => (i === slot ? null : b)) },
    dropped: { id, by, stack: { ...s }, at: [at[0], at[1]], until: now + GROUND.lasts * 1000 },
  };
}

/**
 * Pick a thing up from the ground into my bag, from the tile I stand on: all of it or none. `d` is the thing as it
 * is kept, or nothing when it is no longer kept. Whoever keeps the game takes it off the ground when this comes off.
 */
export function pickUp(purse: Purse, d: Dropped | null | undefined, at: readonly [number, number], now: number): Did<{ purse: Purse; item: ItemId; n: number }> {
  if (!d || d.until <= now) return not("lost");
  if (!reaches(d, at)) return not("far");
  // (as the stack it is, so that what it holds comes with it)
  const bag = push(purse.bag, [d.stack]);
  if (!bag) return no("full");
  return { ok: true, purse: { ...purse, bag }, item: d.stack.item, n: d.stack.n };
}
