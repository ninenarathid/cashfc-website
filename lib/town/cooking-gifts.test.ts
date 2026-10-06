import { describe, expect, it } from "vitest";
import { basketEat, basketOf, basketPut, basketRoom, basketTake, inBasket } from "./cooking";
import { numberOf } from "./gifts";
import { ITEMS, type DishId, type ItemId } from "./items";
import { STAMINA, chew, sitDown, staminaOf } from "./stamina";
import { held, newPurse, put, type Purse } from "./trade";

/** The gifts of the kitchen's ranks (lib/town/gifts), as rules: the second rank's basket to the sixth's flame. */
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-07T12:00:00"), MIN = 60_000;
const purseWith = (gifts: string[], ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, stamina: { day: -1, left: 0 }, gifts: { had: gifts, charms: [] }, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(10).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };

describe("the dimension basket (the kitchen's second rank)", () => {
  const HOLDS = numberOf("thingBasket");
  it("holds twelve helpings, of any dishes together, in no slot of the bag", () => {
    expect(HOLDS).toBe(12);
    const p = purseWith(["thingBasket"], ["tomYum", 5], ["friedMinnow", 4], ["oddDish", 2], ["riceBox", 3]);
    const a = done(basketPut(Object.freeze(p) as Purse, 0, 5)), b = done(basketPut(a.purse, 1, 4)), c = done(basketPut(b.purse, 2, 2));
    expect(c.purse.basket).toEqual([["tomYum", 5], ["friedMinnow", 4], ["oddDish", 2]]);
    expect(c.purse.bag.filter(Boolean)).toEqual([{ item: "riceBox", n: 3 }]);
    expect(inBasket(c.purse)).toBe(11);
    expect(basketRoom(c.purse)).toBe(1);
    // the twelfth goes in, the thirteenth does not, and nothing is lost for asking
    expect(basketPut(c.purse, 3, 2)).toEqual({ ok: false, why: "full" });
    const full = done(basketPut(c.purse, 3, 1));
    expect(inBasket(full.purse)).toBe(HOLDS);
    expect(basketPut(full.purse, 3, 1)).toEqual({ ok: false, why: "full" });
    expect(held(full.purse.bag, "riceBox")).toBe(2);
    // (the bag itself was never touched but for what left it)
    expect(p.bag.filter(Boolean).length).toBe(4);
  });

  it("takes a part of a stack, and a dish that is in it already goes onto its own count", () => {
    const p = purseWith(["thingBasket"], ["tomYum", 5]);
    const a = done(basketPut(p, 0, 2));
    expect(a).toMatchObject({ dish: "tomYum", n: 2 });
    expect(a.purse.bag[0]).toEqual({ item: "tomYum", n: 3 });
    const b = done(basketPut(a.purse, 0, 3));
    expect(b.purse.basket).toEqual([["tomYum", 5]]);
    expect(b.purse.bag[0]).toBeNull();
  });

  it("is food only, and its owner's only", () => {
    const p = purseWith(["thingBasket"], ["tomYum", 2], ["minnow", 3], ["pot", 1], ["scrollSomTam", 1]);
    for (const slot of [1, 2, 3, 4, 99, -1, 0.5]) expect(basketPut(p, slot, 1)).toEqual({ ok: false, why: "none" });
    for (const n of [0, -1, 1.5, 3, Number.NaN]) expect(basketPut(p, 0, n)).toEqual({ ok: false, why: "amount" });
    // a pot of food is no helping: it is ladled first
    const pot: Purse = { ...p, bag: p.bag.map((s, i) => (i === 2 ? { item: "potFull" as ItemId, n: 1, of: { dish: "tomYum" as DishId, left: 4 } } : s)) };
    expect(basketPut(pot, 2, 1)).toEqual({ ok: false, why: "none" });
    // whoever has no basket puts nothing in, takes nothing out and eats nothing from one (though a purse says it holds something)
    const none: Purse = { ...purseWith([], ["tomYum", 2]), basket: [["tomYum", 3]] };
    expect(basketPut(none, 0, 1)).toEqual({ ok: false, why: "none" });
    expect(basketTake(none, "tomYum", 1)).toEqual({ ok: false, why: "none" });
    expect(basketEat(none, "tomYum", true, NOON)).toEqual({ ok: false, why: "none" });
    expect(basketRoom(none)).toBe(0);
  });

  it("gives a helping back to the bag, where the bag has room", () => {
    const p: Purse = { ...purseWith(["thingBasket"]), basket: [["tomYum", 3], ["friedMinnow", 1]] };
    const one = done(basketTake(p, "tomYum", 1));
    expect(one.purse.basket).toEqual([["tomYum", 2], ["friedMinnow", 1]]);
    expect(held(one.purse.bag, "tomYum")).toBe(1);
    const rest = done(basketTake(one.purse, "tomYum", 2));
    expect(rest.purse.basket).toEqual([["friedMinnow", 1]]);
    expect(held(rest.purse.bag, "tomYum")).toBe(3);
    expect(basketTake(p, "shabu", 1)).toEqual({ ok: false, why: "none" });
    expect(basketTake(p, "minnow", 1)).toEqual({ ok: false, why: "none" });
    for (const n of [0, 4, 1.5, -2]) expect(basketTake(p, "tomYum", n)).toEqual({ ok: false, why: "amount" });
    // a bag with no slot free and no stack of it begun has no room
    const crammed: Purse = { ...p, bag: p.bag.map(() => ({ item: "boot" as ItemId, n: 1 })) };
    expect(basketTake(crammed, "tomYum", 1)).toEqual({ ok: false, why: "full" });
    // …but a stack of it that is not full takes it
    const begunStack: Purse = { ...crammed, bag: crammed.bag.map((s, i) => (i === 4 ? { item: "tomYum" as ItemId, n: ITEMS.tomYum.stack - 1 } : s)) };
    expect(done(basketTake(begunStack, "tomYum", 1)).purse.bag[4]).toEqual({ item: "tomYum", n: ITEMS.tomYum.stack });
    expect(basketTake(begunStack, "tomYum", 2)).toEqual({ ok: false, why: "full" });
  });

  it("is eaten from as the bag is: sitting, a helping of this meal's hours, its bowl back at the end, its buff left", () => {
    const p: Purse = { ...purseWith(["thingBasket"]), stamina: { day: -1, left: 0 }, basket: [["tomYum", 2]] };
    expect(basketEat(p, "tomYum", false, NOON)).toEqual({ ok: false, why: "stand" });
    expect(basketEat(p, "shabu", true, NOON)).toEqual({ ok: false, why: "none" });
    const sat = done(basketEat(Object.freeze(p) as Purse, "tomYum", true, NOON));
    expect(sat.dish).toBe("tomYum");
    expect(sat.purse.basket).toEqual([["tomYum", 1]]);
    expect(sat.purse.meals.bowls).toEqual([0, 1, 0]);
    expect(sat.purse.eating).toEqual({ dish: "tomYum", meal: 1, from: NOON, till: NOON, got: 0 });
    // the same meal and the same count as the same helping out of the bag
    const bagged = done(sitDown({ ...p, bag: put(p.bag, "tomYum", 1) }, 0, true, NOON));
    expect(sat.purse.meals).toEqual(bagged.purse.meals);
    expect(sat.purse.eating).toEqual(bagged.purse.eating);
    // one is being eaten: no other is begun, from the basket or the bag
    expect(basketEat(sat.purse, "tomYum", true, NOON + MIN)).toEqual({ ok: false, why: "meal" });
    const eaten = chew(sat.purse, 0, NOON + STAMINA.minutes * MIN);
    expect(eaten.done).toBe(true);
    expect(held(eaten.purse.bag, "bowl")).toBe(1);
    expect(eaten.purse.buffs).toEqual([{ id: "hearty", level: 1, until: NOON + STAMINA.minutes * MIN + 3 * 60 * MIN }]);
    // (the gauge is never over its hundred)
    expect(staminaOf(eaten.purse, NOON + STAMINA.minutes * MIN)).toBe(100);
    // three to a meal's hours, whichever they are taken from
    let q: Purse = { ...p, basket: [["tomYum", 4]] };
    for (let i = 0; i < 3; i++) q = chew(done(basketEat(q, "tomYum", true, NOON + i * 10 * MIN)).purse, 0, NOON + i * 10 * MIN + 5 * MIN).purse;
    expect(basketEat(q, "tomYum", true, NOON + 40 * MIN)).toEqual({ ok: false, why: "meal" });
    expect(q.basket).toEqual([["tomYum", 1]]);
  });

  it("reads what a purse keeps of it soundly", () => {
    expect(basketOf({})).toEqual([]);
    expect(basketOf({ basket: "x" as unknown as Purse["basket"] })).toEqual([]);
    expect(basketOf({ basket: [["tomYum", 2], ["minnow", 3], ["tomYum", 4], ["shabu", 0], ["laab", 1.5], ["somTam", "2"], ["omelette"], null, ["riceBox", 1]] as unknown as Purse["basket"] }))
      .toEqual([["tomYum", 2], ["riceBox", 1]]);
  });
});
