import { WATER } from "./farm";
import type { ItemId } from "./items";
import { spend } from "./stamina";
import { handOf, type Purse } from "./trade";
import { LINE_HANDS } from "./well";
import { GATES, placeOf, type Vec } from "./world";

/**
 * A bucket line (the owner, 2026-10-05, of the members who carry water for
 * the others: "a bucket line of three or more", one of nine things thought of
 * for them, "ชอบทุกข้อเลยครับ"; and his rule for the town, that its games
 * should need several people so that they talk).
 *
 * Water is drawn at the river, in the town; the well is on the farm, through
 * the gate: a minute's walk a bucketful. A line spares the walk. **Somebody
 * with water in the bucket they hold hands it on to somebody else who holds
 * an empty one and stands within sight**: the water is in the other's bucket
 * at once, and they hand it on in their turn, or pour it where they stand
 * (into the well, over a bed, into the yard's jar).
 *
 * - **Within sight** is forty tiles as the path goes: straight across a map,
 *   or to the gate and on from its other side. From the nearest of the river
 *   to the farm's well is some sixty-three: **two cannot reach, three can**
 *   (one by the water, one about the gate, one at the well). More make it
 *   easier to stand, and a line to the cooking yard's jar is shorter.
 * - Handing on costs a stamina and nothing else. With none left it is the
 *   short game of pouring, like any work with water.
 * - **Everybody whose hands the water went through has carried it**: when it
 *   is poured, each of them is counted a bucketful in the well's book (their
 *   rank, the day's carriers, their work at the jar by the well), as the one
 *   who pours is. Whose water it was, for the thanks and for what the book
 *   says came of it, is still the pourer's.
 * - What stands in the way of a hand that is not there: nothing but that the
 *   other has to hold a bucket, empty. Standing in line with one is saying
 *   yes.
 *
 * Nothing says how many it takes: the button is there when somebody stands
 * near enough with an empty bucket.
 *
 * Pure. The database does the same (v132: `town_pass`). It cannot know where
 * anybody stands (nothing of the game's can: the room is the page's), so how
 * near the two are is the page's to hold to, like who stands at a stove.
 */
export const LINE = {
  /** How far apart two may stand for water to be handed on, in tiles as the path goes. */
  reach: 40,
  /** The stamina handing a bucket on costs whoever hands it. */
  cost: 1,
  /** How many of those whose hands the water went through are remembered (the last so many: lib/town/well keeps them). */
  hands: LINE_HANDS,
};

/** Why water was not handed on: nothing to hand (`hand`), nobody there to take it (`none`: they hold no bucket), or their bucket has water in it (`full`). */
export type PassRefusal = "hand" | "none" | "full";

/** The bucket I hold that has water in it: which thing, which slot, how many bucketfuls. Null when I hold none. */
export function carried(purse: Purse): { hand: ItemId; slot: number; has: number } | null {
  const hand = handOf(purse);
  if (!hand || !(hand in WATER.buckets)) return null;
  const slot = purse.bag.findIndex((s) => s?.item === hand && (s.water ?? 0) > 0);
  return slot < 0 ? null : { hand, slot, has: Math.floor(purse.bag[slot]!.water!) };
}

/**
 * Hand the water in the bucket I hold on to somebody: into the empty bucket they hold, as much as it carries (what
 * it does not, stays in mine). Gives both purses as they are afterwards, how many bucketfuls went over, and which
 * things they went from and into.
 */
export function pass(from: Purse, to: Purse, now: number):
  { ok: true; from: Purse; to: Purse; n: number; can: ItemId; into: ItemId } | { ok: false; why: PassRefusal } {
  const mine = carried(from);
  if (!mine) return { ok: false, why: "hand" };
  const theirs = handOf(to);
  if (!theirs || !(theirs in WATER.buckets)) return { ok: false, why: "none" };
  const slot = to.bag.findIndex((s) => s?.item === theirs && !(s.water ?? 0));
  if (slot < 0) return { ok: false, why: "full" };
  const n = Math.min(mine.has, WATER.buckets[theirs]!), left = mine.has - n;
  return {
    ok: true, n, can: mine.hand, into: theirs,
    from: { ...spend(from, LINE.cost, now), bag: from.bag.map((s, i) => (i === mine.slot ? (left > 0 ? { item: mine.hand, n: 1, water: left } : { item: mine.hand, n: 1 }) : s)) },
    to: { ...to, bag: to.bag.map((s, i) => (i === slot ? { item: theirs, n: 1, water: n } : s)) },
  };
}

const far = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
/**
 * How far it is from one point to another as the path goes: straight, on one map; by a gate between two (to the
 * gate, and on from where it leads). Infinity where no gate joins the two maps.
 */
export function between(a: Vec, b: Vec): number {
  const from = placeOf(Math.floor(a.x), Math.floor(a.y)), to = placeOf(Math.floor(b.x), Math.floor(b.y));
  if (!from || !to) return Infinity;
  if (from === to) return far(a, b);
  let best = Infinity;
  for (const gate of GATES) {
    if (gate.from !== from || gate.leads !== to) continue;
    for (const [x, y] of gate.tiles) best = Math.min(best, far(a, { x: x + 0.5, y: y + 0.5 }) + far(gate.to, b));
  }
  return best;
}
/** Whether two stand near enough for water to be handed from one to the other. */
export const inReach = (a: Vec, b: Vec) => between(a, b) <= LINE.reach;
