import { ODD, takes } from "./cooking";
import { WATER } from "./farm";
import { DISHES, type DishId, type ItemId } from "./items";
import { spend } from "./stamina";
import { handOf, no, type Done, type Purse } from "./trade";

/**
 * The water jar in the cooking yard (the owner, 2026-10-05, of the members
 * who carry water for the others: "a jar at the cooking yard: a pot with
 * fresh water gives a helping more", one of nine things thought of for them,
 * "ชอบทุกข้อเลยครับ").
 *
 * The big jar by the washing tub has stood in the yard's picture since the
 * yard was finished, with nothing to do. Now it holds water: anybody with a
 * bucket that has water in it pours it in, standing by the jar, and **a pot
 * cooked while the jar has water takes a bucketful of it and comes with a
 * helping more**.
 *
 * - **A bonus, never a condition**: with the jar empty everything is cooked
 *   as it always was.
 * - Not the odd dish (things that make nothing gain nothing by good water),
 *   and not what is roasted on a skewer, which takes no water and is cooked
 *   by the forest's fire, far from the jar.
 * - Whose water it was is followed, as at the well (lib/town/well): the
 *   well's book tells a carrier how many pots were cooked with their water
 *   today, and for how many cooks.
 *
 * Pure. The database does the same (v130): `town_yard_pour`, and a trigger on
 * the cooking written down (`town_plays`), so that the rule of cooking itself
 * is not written again.
 */
export const YARD = {
  /** How many bucketfuls the jar holds. */
  holds: 10,
  /** The helpings more a pot cooked with its water has. */
  gives: 1,
  /** The stamina it costs to pour a bucket into it. */
  cost: 1,
  /** The cookware whose dishes take no water. */
  dry: ["skewer"] as ItemId[],
};

/** Whether the bucket in my hand can be poured into the jar: it has water, and the jar has room. */
export const canPour = (purse: Purse, jar: number): boolean => {
  const hand = handOf(purse);
  return !!hand && hand in WATER.buckets && jar < YARD.holds && purse.bag.some((s) => s?.item === hand && (s.water ?? 0) > 0);
};

/** Pour the bucket in my hand into the jar: as much of it as the jar has room for; the rest stays in the bucket. */
export function pourIn(purse: Purse, jar: number, now: number): Done<{ purse: Purse; jar: number; poured: number }> {
  const hand = handOf(purse);
  if (!hand || !canPour(purse, jar)) return no("none");
  const slot = purse.bag.findIndex((s) => s?.item === hand && (s.water ?? 0) > 0), has = purse.bag[slot]!.water!, poured = Math.min(has, YARD.holds - jar);
  return {
    ok: true, jar: jar + poured, poured,
    purse: { ...spend(purse, YARD.cost, now), bag: purse.bag.map((s, i) => (i === slot ? (has > poured ? { item: hand, n: 1, water: has - poured } : { item: hand, n: 1 }) : s)) },
  };
}

/** Whether what was cooked takes the jar's water: a dish that is somebody's recipe, cooked in something that holds water. */
export const takesWater = (made: ItemId | null | undefined): made is DishId =>
  !!made && made in DISHES && made !== ODD && !!DISHES[made as DishId].recipe && !takes(made).in.some((c) => YARD.dry.includes(c));

/**
 * A purse just after something was cooked, and the jar: when what was cooked takes water and the jar has some, the
 * pot of it in the bag (the first, of several of that dish) has a helping more and the jar a bucketful less.
 */
export function freshen(purse: Purse, made: ItemId | null | undefined, jar: number): { purse: Purse; jar: number; fresh: boolean } {
  if (!takesWater(made) || jar < 1) return { purse, jar, fresh: false };
  const slot = purse.bag.findIndex((s) => s?.item === "potFull" && s.of?.dish === made);
  if (slot < 0) return { purse, jar, fresh: false };
  const pot = purse.bag[slot]!;
  return { fresh: true, jar: jar - 1, purse: { ...purse, bag: purse.bag.map((s, i) => (i === slot ? { ...pot, of: { ...pot.of!, left: pot.of!.left + YARD.gives } } : s)) } };
}
