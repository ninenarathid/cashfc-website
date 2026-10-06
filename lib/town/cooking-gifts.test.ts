import { describe, expect, it } from "vitest";
import { RECIPE_IDS, basketEat, basketOf, basketPut, basketRoom, basketTake, inBasket, needsOf, readsAll, spoon, spoonSays, whispersOf } from "./cooking";
import { USES, numberOf, usesLeft } from "./gifts";
import { toldOf } from "./hints";
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

describe("the whispering spoon (the kitchen's third rank)", () => {
  const DAY = 24 * 60 * MIN;
  it("tells the secret thing of the recipe the pot is on the way to: its last, the one a found recipe never names", () => {
    const says = spoonSays([["snakehead", 1], ["tomato", 2], ["chili", 2]], []);
    expect(says).toEqual({ ok: true, of: "tomYum", secret: "scallion", ways: 1 });
    // what a found recipe hides is that same thing
    expect(toldOf("tomYum").needs.map(([id]) => id)).not.toContain("scallion");
    expect(toldOf("tomYum").last).not.toBeNull();
    // one thing of it is enough to be on the way, in no greater an amount than the recipe takes
    expect(spoonSays([["snakehead", 1]], [])).toMatchObject({ of: "tomYum", secret: "scallion" });
    expect(spoonSays([["snakehead", 2]], [])).toEqual({ ok: false, why: "astray" });
  });

  it("where the pot can still be more than one recipe, answers for the one nearest done, and says how many ways there are", () => {
    // three minnows: fried minnow wants one thing more, fish sauce three
    expect(spoonSays([["minnow", 3]], [])).toEqual({ ok: true, of: "friedMinnow", secret: "salt", ways: 2 });
    // …and a recipe read whole already is left out: there is nothing to tell of it
    expect(spoonSays([["minnow", 3]], ["friedMinnow"])).toEqual({ ok: true, of: "fishSauce", secret: "salt", ways: 1 });
    expect(spoonSays([["minnow", 3]], ["friedMinnow", "fishSauce"])).toEqual({ ok: false, why: "known" });
    expect(spoonSays([], [])).toEqual({ ok: false, why: "amount" });
    expect(spoonSays([["hyacinth", 1], ["snakehead", 1]], [])).toEqual({ ok: false, why: "astray" });
    // by every single thing there is a recipe for: the nearest done of those it fits, the first in the book's order of two as near
    const short = (id: ItemId, n: number) => needsOf(id).reduce((t, [, k]) => t + k, 0) - n;
    for (const thing of new Set(RECIPE_IDS.flatMap((id) => needsOf(id).map(([t]) => t)))) {
      const says = spoonSays([[thing, 1]], []);
      if (!says.ok) throw new Error(`nothing said of ${thing}`);
      const fits = RECIPE_IDS.filter((id) => needsOf(id).some(([t, n]) => t === thing && n >= 1));
      expect(says.ways).toBe(fits.length);
      const least = Math.min(...fits.map((id) => short(id, 1)));
      expect(says.of).toBe(fits.find((id) => short(id, 1) === least));
      expect(says.secret).toBe(needsOf(says.of).at(-1)![0]);
    }
  });

  it("is asked of things of one's own bag, three times a day, and what it told is read whole from then on", () => {
    const p = purseWith(["thingSpoon"], ["snakehead", 1], ["tomato", 2], ["chili", 2], ["minnow", 4]);
    const pot: Array<[ItemId, number]> = [["snakehead", 1], ["tomato", 2]];
    expect(spoon(purseWith([], ["snakehead", 1], ["tomato", 2]), pot, NOON)).toEqual({ ok: false, why: "none" });
    expect(spoon(p, [], NOON)).toEqual({ ok: false, why: "amount" });
    expect(spoon(p, [["snakehead", 2]], NOON)).toEqual({ ok: false, why: "none" });
    expect(spoon(p, [["pot" as ItemId, 1]], NOON)).toEqual({ ok: false, why: "none" });
    expect(spoon(p, [["noSuchThing" as ItemId, 1]], NOON)).toEqual({ ok: false, why: "none" });
    expect(readsAll(p, "tomYum")).toBe(false);
    const one = done(spoon(Object.freeze(p) as Purse, pot, NOON));
    expect(one).toMatchObject({ of: "tomYum", secret: "scallion", ways: 1, left: USES.thingSpoon!.n - 1 });
    expect(one.purse.whispers).toEqual(["tomYum"]);
    expect(readsAll(one.purse, "tomYum")).toBe(true);
    // nothing leaves the bag for asking, and nothing but the count and what was told is changed
    expect(one.purse.bag).toEqual(p.bag);
    // asked again of the same pot there is nothing more to tell, and it is not counted
    expect(spoon(one.purse, pot, NOON + MIN)).toEqual({ ok: false, why: "known" });
    expect(usesLeft(one.purse, "thingSpoon", NOON + MIN)).toBe(2);
    // of another pot it goes on: first one recipe, then the next it could be
    const two = done(spoon(one.purse, [["minnow", 3]], NOON + 2 * MIN)), three = done(spoon(two.purse, [["minnow", 3]], NOON + 3 * MIN));
    expect([two.of, three.of]).toEqual(["friedMinnow", "fishSauce"]);
    expect(three.left).toBe(0);
    expect(three.purse.whispers).toEqual(["tomYum", "friedMinnow", "fishSauce"]);
    expect(spoon(three.purse, [["chili", 1]], NOON + 4 * MIN)).toEqual({ ok: false, why: "spent" });
    // the next day it answers again
    expect(done(spoon(three.purse, [["chili", 1]], NOON + DAY)).left).toBe(2);
    // a recipe one has made is not what it answers for
    const made: Purse = { ...p, made: ["friedMinnow"] };
    expect(done(spoon(made, [["minnow", 3]], NOON)).of).toBe("fishSauce");
  });

  it("reads what a purse keeps of its tellings soundly", () => {
    expect(whispersOf({})).toEqual([]);
    expect(whispersOf({ whispers: ["tomYum", "minnow", "tomYum", 3, null, "fishSauce", "oddDish"] as unknown as Purse["whispers"] })).toEqual(["tomYum", "fishSauce"]);
  });
});
