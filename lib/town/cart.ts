import type { ItemId } from "./items";
import { placeOf, type Vec } from "./world";

/**
 * A water cart (the owner, 2026-10-05, of the members who carry water for
 * the others: "a cart pushed by two", the last of nine things thought of for
 * them, "ชอบทุกข้อเลยครับ"; and his rule for the town, that its games should
 * need several people so that they talk).
 *
 * The well gives its carriers a yoke at the first rank (two bucketfuls a
 * trip) and a great one at the last (four). Between them, at the second, it
 * has **a cart: six bucketfuls**, more than anything else carries. It is a
 * thing like the yokes (held in the hand, drawn at the river, poured into
 * the well, over a bed, into the yard's jar, handed on along a line; it
 * fetches nothing), with one way of its own: **it is too heavy for one**.
 * Whoever holds it walks at half the pace, unless somebody is beside them,
 * within three steps on the same map: then it goes as fast as anybody.
 *
 * So alone it brings three bucketfuls in the time a great yoke brings four,
 * and with a friend at its side six: the friend carrying a bucket of their
 * own besides. Nothing says so: its picture and its words say it is heavy,
 * it is slow, and then it is not.
 *
 * The pace is the page's own (every page moves everybody it sees by the same
 * rule, lib/town/session), like where anybody stands: nothing that keeps the
 * game knows of it. The database's part is the thing itself: three rows of
 * the catalog (`items`, `farming`, `well`), which v130 writes over.
 */
export const CART = {
  /** The thing. */
  item: "waterCart" as ItemId,
  /** How fast its holder walks alone, as a share of anybody's pace. */
  alone: 0.5,
  /** How near, in tiles, somebody else has to be for it to be pushed by two. */
  near: 3,
};

/**
 * How fast somebody walks, as a share of the walking pace: half, holding the cart with nobody beside them; anybody's
 * pace otherwise. `others` is where everybody else is, whatever the map.
 */
export function cartPace(hold: string | null | undefined, at: Vec, others: readonly Vec[]): number {
  if (hold !== CART.item) return 1;
  const here = placeOf(at.x, at.y);
  return others.some((o) => placeOf(o.x, o.y) === here && Math.hypot(o.x - at.x, o.y - at.y) <= CART.near) ? 1 : CART.alone;
}
