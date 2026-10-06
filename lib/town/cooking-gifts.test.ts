import { describe, expect, it } from "vitest";
import { COOKING, RECIPE_IDS, basketEat, basketOf, basketPut, basketRoom, basketTake, cook, cookWith, harderCook, inBasket, needsOf, readsAll, spiceEat, spoon, spoonSays, stirMods, whispersOf } from "./cooking";
import { USES, harderAt, numberOf, usesLeft } from "./gifts";
import { LINES } from "./lines";
import { ROASTING, doneFrom, startRoast } from "./roasting";
import { STIRRING, startStir, stir, stirred } from "./stirring";
import { toldOf } from "./hints";
import { BUFF_HOURS, BUFF_LEVELS, DISHES, ITEMS, MAKES, type DishId, type ItemId } from "./items";
import { STAMINA, chew, getUp, levelOf, settle, sitDown, spiceOf, staminaOf } from "./stamina";
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

describe("the hearth sprite (the kitchen's fourth rank)", () => {
  const TOMYUM = DISHES.tomYum.recipe!.needs, SERVES = DISHES.tomYum.recipe!.serves, MORE = numberOf("famSprite");
  /** A purse the sprite follows, with what a tom yum takes and a pot to cook it in; its member has made one before. */
  const withSprite = (...more: Array<[ItemId, number]>): Purse => {
    const p = purseWith(["famSprite"], ...TOMYUM, ["pot", 1], ...more);
    return { ...p, stamina: { day: -1, left: 0 }, made: ["tomYum", "fishSauce"], gifts: { had: ["famSprite"], charms: [], familiar: "famSprite" } };
  };
  const pots = (p: Purse) => p.bag.filter((s) => s?.item === "potFull").map((s) => s!.of);

  it("cooks a recipe its member has made before at once: its full helpings and one more, whatever a hand would have missed", () => {
    expect(MORE).toBe(1);
    const p = withSprite();
    const did = done(cookWith(Object.freeze(p) as Purse, TOMYUM, ["pot"], 5, NOON, { sprite: true }));
    expect(did).toMatchObject({ made: "tomYum", n: SERVES + MORE, sprite: true });
    expect(pots(did.purse)).toEqual([{ dish: "tomYum", left: SERVES + MORE }]);
    // by hand, with as many misses, half the pot is all that is left; with none, its full helpings and no more
    expect(done(cook(p, TOMYUM, ["pot"], 5, NOON)).n).toBe(Math.ceil(SERVES / 2));
    expect(done(cookWith(p, TOMYUM, ["pot"], 0, NOON)).n).toBe(SERVES);
    expect(done(cookWith(p, TOMYUM, ["pot"], 0, NOON)).sprite).toBeUndefined();
    // the things are out of the bag, the stamina is paid, and the pot is counted against this meal's hours
    for (const [id] of TOMYUM) expect(held(did.purse.bag, id)).toBe(0);
    expect(staminaOf(did.purse, NOON)).toBe(STAMINA.max - COOKING.cost);
    expect(usesLeft(did.purse, "famSprite", NOON)).toBe(USES.famSprite!.n - 1);
    // what else the pot would have had, it has too: a ladle's helping more
    expect(done(cookWith(withSprite(["ladle", 1]), TOMYUM, ["pot"], 0, NOON, { sprite: true })).n).toBe(SERVES + COOKING.ladle + MORE);
  });

  it("cooks only while it follows, only what was made before, and three pots to a meal's hours", () => {
    const p = withSprite();
    // it has to follow: had and resting, it cooks nothing
    expect(cookWith({ ...p, gifts: { had: ["famSprite"], charms: [], familiar: null } }, TOMYUM, ["pot"], 0, NOON, { sprite: true })).toEqual({ ok: false, why: "none" });
    expect(cookWith({ ...p, gifts: { had: [], charms: [] } }, TOMYUM, ["pot"], 0, NOON, { sprite: true })).toEqual({ ok: false, why: "none" });
    // a recipe never made is still a guess, and things that are no recipe's are no pot of the sprite's
    expect(cookWith({ ...p, made: ["fishSauce"] }, TOMYUM, ["pot"], 0, NOON, { sprite: true })).toEqual({ ok: false, why: "unmade" });
    expect(cookWith({ ...withSprite(["hyacinth", 2]) }, [["hyacinth", 2]], ["pot"], 0, NOON, { sprite: true })).toEqual({ ok: false, why: "unmade" });
    // the cookware the recipe takes has to be in the hand, as at any stove: refused, with nothing lost and nothing counted
    expect(cookWith(p, TOMYUM, [null], 0, NOON, { sprite: true })).toEqual({ ok: false, why: "tool" });
    const crammed: Purse = { ...p, bag: [...p.bag.filter(Boolean), ...Array<null>(10).fill(null)].slice(0, TOMYUM.length + 1).map((s) => s && (ITEMS[s.item].stack > 1 ? { ...s, n: s.n + 1 } : s)) };
    expect(cookWith(crammed, TOMYUM, ["pot"], 0, NOON, { sprite: true })).toEqual({ ok: false, why: "full" });
    // three pots in a meal's hours, and the fourth is the hand's to cook; the next meal's hours, three again
    let q = withSprite();
    for (let i = 0; i < 3; i++) {
      const again = done(cookWith({ ...q, bag: withSprite().bag }, TOMYUM, ["pot"], 0, NOON + i * MIN, { sprite: true }));
      expect(again.n).toBe(SERVES + MORE);
      q = again.purse;
    }
    expect(cookWith({ ...q, bag: withSprite().bag }, TOMYUM, ["pot"], 0, NOON + 4 * MIN, { sprite: true })).toEqual({ ok: false, why: "spent" });
    expect(done(cookWith({ ...q, bag: withSprite().bag }, TOMYUM, ["pot"], 0, NOON + 4 * MIN)).n).toBe(SERVES);
    expect(done(cookWith({ ...q, bag: withSprite().bag }, TOMYUM, ["pot"], 0, at("2026-10-07T17:30:00"), { sprite: true })).n).toBe(SERVES + MORE);
  });

  it("makes what is made otherwise at its full number, and no more", () => {
    const needs = MAKES.fishSauce!.needs, p: Purse = { ...withSprite(...needs) };
    const did = done(cookWith(p, needs, ["pot"], 3, NOON, { sprite: true }));
    expect(did).toMatchObject({ made: "fishSauce", n: MAKES.fishSauce!.gives, sprite: true });
    expect(held(did.purse.bag, "fishSauce")).toBe(MAKES.fishSauce!.gives);
    expect(pots(did.purse)).toEqual([]);
  });

  it("leaves a pot that was in the bag already as it was", () => {
    const p = withSprite();
    const before: Purse = { ...p, bag: p.bag.map((s, i) => (i === 7 ? { item: "potFull" as ItemId, n: 1, of: { dish: "tomYum" as DishId, left: 2 } } : s)) };
    const did = done(cookWith(before, TOMYUM, ["pot"], 0, NOON, { sprite: true }));
    expect(pots(did.purse).sort((a, b) => a!.left - b!.left)).toEqual([{ dish: "tomYum", left: 2 }, { dish: "tomYum", left: SERVES + MORE }]);
  });
});

describe("the stardust spice (the kitchen's fifth rank)", () => {
  const MEAL = STAMINA.minutes * MIN, HOURS = BUFF_HOURS * 60 * MIN, TOP = numberOf("thingSpice");
  const withSpice = (...items: Array<[ItemId, number]>) => purseWith(["thingSpice"], ...items);
  it("sprinkled on a bowl about to be eaten: eaten up, its buff is at the last level at once", () => {
    expect(TOP).toBe(BUFF_LEVELS);
    const p = withSpice(["tomYum", 2]);
    const sat = done(spiceEat(Object.freeze(p) as Purse, { slot: 0 }, true, NOON));
    // the meal is begun as ever, and the sprinkling is of that meal
    expect(sat.purse.eating).toEqual(done(sitDown(p, 0, true, NOON)).purse.eating);
    expect(sat.purse.meals).toEqual(done(sitDown(p, 0, true, NOON)).purse.meals);
    expect(sat.purse.spiced).toEqual({ from: NOON, level: TOP });
    expect(spiceOf(sat.purse)).toBe(TOP);
    expect(usesLeft(sat.purse, "thingSpice", NOON)).toBe(0);
    // half eaten, nothing yet; eaten up, the fourth level, for a new buff's hours
    expect(levelOf(chew(sat.purse, 0, NOON + MEAL / 2).purse, NOON + MEAL / 2, "hearty")).toBe(0);
    const eaten = chew(sat.purse, 0, NOON + MEAL);
    expect(eaten.done).toBe(true);
    expect(eaten.purse.buffs).toEqual([{ id: "hearty", level: TOP, until: NOON + MEAL + HOURS }]);
    expect(eaten.purse.buff).toEqual({ id: "hearty", until: NOON + MEAL + HOURS });
    // …where a plain bowl leaves the first
    expect(chew(done(sitDown(p, 0, true, NOON)).purse, 0, NOON + MEAL).purse.buffs).toEqual([{ id: "hearty", level: 1, until: NOON + MEAL + HOURS }]);
    // a tab closed at the table: the meal that ran out is settled the same
    expect(settle(sat.purse, NOON + 30 * MIN).buffs).toEqual([{ id: "hearty", level: TOP, until: NOON + MEAL + HOURS }]);
  });

  it("raises a buff one has to the last level with its hours as they run, and never past the last", () => {
    for (const level of [1, 2, 3, 4]) {
      const p: Purse = { ...withSpice(["tomYum", 1]), buffs: [{ id: "hearty", level, until: NOON + 40 * MIN }, { id: "keen", level: 2, until: NOON + 90 * MIN }] };
      const eaten = chew(done(spiceEat(p, { slot: 0 }, true, NOON)).purse, 0, NOON + MEAL).purse;
      expect(eaten.buffs).toEqual([{ id: "hearty", level: TOP, until: NOON + 40 * MIN }, { id: "keen", level: 2, until: NOON + 90 * MIN }]);
    }
  });

  it("is once a day, counted as it is sprinkled; and can still come to nothing", () => {
    const p = withSpice(["tomYum", 3]);
    const sat = done(spiceEat(p, { slot: 0 }, true, NOON));
    // getting up before the bowl is eaten forfeits its buff as ever, and the sprinkling with it
    const up = getUp(sat.purse, 0, NOON + 2 * MIN);
    expect(up.eating).toBeNull();
    expect(up.buffs ?? []).toEqual([]);
    expect(usesLeft(up, "thingSpice", NOON + 2 * MIN)).toBe(0);
    // no second sprinkling today: refused, and no meal is begun for it
    expect(spiceEat(up, { slot: 0 }, true, NOON + 3 * MIN)).toEqual({ ok: false, why: "spent" });
    // the next bowl, eaten plain, is plain: a sprinkling is of its own meal and no other
    const plain = done(sitDown(up, 0, true, NOON + 3 * MIN));
    expect(spiceOf(plain.purse)).toBe(0);
    expect(chew(plain.purse, 0, NOON + 3 * MIN + MEAL).purse.buffs).toEqual([{ id: "hearty", level: 1, until: NOON + 3 * MIN + MEAL + HOURS }]);
    // tomorrow, once more
    const next = NOON + 24 * 60 * MIN;
    expect(done(spiceEat({ ...up, meals: { day: -1, eaten: [false, false, false] } }, { slot: 0 }, true, next)).purse.spiced).toEqual({ from: next, level: TOP });
  });

  it("is refused as the meal itself would be, and where there is nothing for it to raise: nothing begun, nothing counted", () => {
    const p = withSpice(["tomYum", 1], ["grilledCorn", 1], ["minnow", 1]);
    expect(spiceEat(purseWith([], ["tomYum", 1]), { slot: 0 }, true, NOON)).toEqual({ ok: false, why: "none" });
    expect(spiceEat(p, { slot: 0 }, false, NOON)).toEqual({ ok: false, why: "stand" });
    expect(spiceEat(p, { slot: 2 }, true, NOON)).toEqual({ ok: false, why: "none" });
    expect(spiceEat(p, { slot: 7 }, true, NOON)).toEqual({ ok: false, why: "none" });
    // a dish that leaves no buff
    expect(DISHES.grilledCorn.buff).toBeUndefined();
    expect(spiceEat(p, { slot: 1 }, true, NOON)).toEqual({ ok: false, why: "none" });
    const full: Purse = { ...p, meals: { day: Math.floor((NOON + 2 * 3_600_000) / 86_400_000), eaten: [false, true, false], bowls: [0, 3, 0] } };
    expect(spiceEat(full, { slot: 0 }, true, NOON)).toEqual({ ok: false, why: "meal" });
  });

  it("is sprinkled on a bowl out of the basket as on one out of the bag", () => {
    const p: Purse = { ...purseWith(["thingSpice", "thingBasket"]), basket: [["friedMinnow", 2]] };
    const sat = done(spiceEat(p, { dish: "friedMinnow" }, true, NOON));
    expect(sat.purse.basket).toEqual([["friedMinnow", 1]]);
    expect(chew(sat.purse, 0, NOON + MEAL).purse.buffs).toEqual([{ id: "keen", level: TOP, until: NOON + MEAL + HOURS }]);
    expect(spiceEat({ ...p, gifts: { had: ["thingSpice"], charms: [] } }, { dish: "friedMinnow" }, true, NOON)).toEqual({ ok: false, why: "none" });
    expect(spiceEat(p, { dish: "tomYum" }, true, NOON)).toEqual({ ok: false, why: "none" });
  });
});

describe("the phoenix flame in a bottle (the kitchen's sixth rank)", () => {
  const WRONG: Array<[ItemId, number]> = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["hyacinth", 1]];
  const withFlame = (...more: Array<[ItemId, number]>) => purseWith(["thingFlame"], ...WRONG, ["pot", 1], ...more);
  it("gives every ingredient back where things come to an odd dish: the stamina is paid, the taste is told, the miss is counted", () => {
    const p = withFlame();
    // without it (or with it not set to), a pot of the odd dish, and the things are gone
    const odd = done(cookWith(p, WRONG, ["pot"], 0, NOON));
    expect(odd.made).toBe("oddDish");
    expect(held(odd.purse.bag, "snakehead")).toBe(0);
    expect(done(cookWith(purseWith([], ...WRONG, ["pot", 1]), WRONG, ["pot"], 0, NOON, { flame: true })).made).toBe("oddDish");
    const back = done(cookWith(Object.freeze(p) as Purse, WRONG, ["pot"], 2, NOON, { flame: true }));
    expect(back).toMatchObject({ made: null, n: 0, back: true, taste: odd.taste });
    expect(back.taste).toBe("swap");
    expect(back.purse.bag).toEqual(p.bag);
    expect(staminaOf(back.purse, NOON)).toBe(STAMINA.max - COOKING.cost);
    // one thing off, and that thing the recipe's last: a try at the tom yum, as ever
    expect(back.purse.tries).toEqual({ tomYum: 1 });
    expect(back.purse.tries).toEqual(odd.purse.tries);
    expect(usesLeft(back.purse, "thingFlame", NOON)).toBe(USES.thingFlame!.n - 1);
  });

  it("gives back what bare hands would have lost, too", () => {
    const p = withFlame();
    const lost = done(cookWith(p, WRONG, [null], 0, NOON));
    expect(lost).toMatchObject({ made: null, n: 0 });
    expect(held(lost.purse.bag, "snakehead")).toBe(0);
    expect(held(lost.purse.bag, "compost")).toBe(1);
    const back = done(cookWith(p, WRONG, [null], 0, NOON, { flame: true }));
    expect(back).toMatchObject({ made: null, n: 0, back: true });
    expect(back.purse.bag).toEqual(p.bag);
  });

  it("is not spent on what is a recipe, three times a day on what is not, and then things are as they always were", () => {
    const TOMYUM = DISHES.tomYum.recipe!.needs;
    const p = purseWith(["thingFlame"], ...TOMYUM, ["hyacinth", 9], ["pot", 1]);
    const real = done(cookWith(p, TOMYUM, ["pot"], 0, NOON, { flame: true }));
    expect(real).toMatchObject({ made: "tomYum", n: DISHES.tomYum.recipe!.serves });
    expect(real.back).toBeUndefined();
    expect(usesLeft(real.purse, "thingFlame", NOON)).toBe(3);
    let q = p;
    for (let i = 0; i < 3; i++) {
      const back = done(cookWith(q, [["hyacinth", 2]], ["pot"], 0, NOON + i * MIN, { flame: true }));
      expect(back.back).toBe(true);
      expect(held(back.purse.bag, "hyacinth")).toBe(9);
      q = back.purse;
    }
    const fourth = done(cookWith(q, [["hyacinth", 2]], ["pot"], 0, NOON + 5 * MIN, { flame: true }));
    expect(fourth).toMatchObject({ made: "oddDish" });
    expect(fourth.back).toBeUndefined();
    expect(held(fourth.purse.bag, "hyacinth")).toBe(7);
    // tomorrow, three more
    expect(done(cookWith(q, [["hyacinth", 2]], ["pot"], 0, NOON + 24 * 60 * MIN, { flame: true })).back).toBe(true);
    // what cooking refuses, it refuses: nothing to give back, nothing counted
    expect(cookWith(p, [["minnow", 1]], ["pot"], 0, NOON, { flame: true })).toEqual({ ok: false, why: "none" });
    expect(cookWith(p, [], ["pot"], 0, NOON, { flame: true })).toEqual({ ok: false, why: "amount" });
  });
});

describe("good dishes are harder for the skilled (from the kitchen's fourth rank, 8% a rank)", () => {
  const AT = LINES.kitchen.marks;
  it("is by the thing's tier and the cook's rank: the simplest are as they are for everybody", () => {
    expect(ITEMS.tomYum.tier).toBe(1);
    expect(ITEMS.omelette.tier).toBe(2);
    expect(ITEMS.greenCurry.tier).toBe(3);
    for (const points of [0, AT[2], AT[3], AT[9], 99999]) expect(harderCook("tomYum", points)).toBe(1);
    expect(harderCook("omelette", 0)).toBe(1);
    expect(harderCook("omelette", AT[3] - 1)).toBe(1);
    expect(harderCook("omelette", AT[3])).toBeCloseTo(1.08, 10);
    expect(harderCook("greenCurry", AT[5])).toBeCloseTo(1.24, 10);
    expect(harderCook("omelette", AT[9])).toBeCloseTo(1.56, 10);
    // something else that is made counts as a dish does; the odd dish and nothing never
    expect(ITEMS.curryPaste.tier).toBe(2);
    expect(harderCook("curryPaste", AT[3])).toBeCloseTo(1.08, 10);
    expect(harderCook("fishSauce", AT[9])).toBe(1);
    expect(harderCook("oddDish", AT[9])).toBe(1);
    expect(harderCook(null, AT[9])).toBe(1);
    // every thing there is a recipe for has an answer, and none is easier
    for (const id of RECIPE_IDS) expect(harderCook(id, AT[9])).toBe(ITEMS[id].tier >= 2 ? harderAt(10) : 1);
  });

  it("in the stirring is a narrower good pace and a slip that costs sooner; plain, the game is as it was", () => {
    const mods = stirMods([], false), plain = startStir(6, mods);
    expect(startStir(6, mods, 1)).toEqual(plain);
    expect(startStir(6, mods, 0.5)).toEqual(plain);
    for (const rank of [4, 6, 10]) {
      const h = harderAt(rank), hard = startStir(6, mods, h);
      expect((hard.hi - hard.lo) * h).toBeCloseTo(plain.hi - plain.lo, 10);
      expect((hard.hi + hard.lo) / 2).toBeCloseTo(STIRRING.pace, 10);
      expect(hard.grace * h).toBeCloseTo(plain.grace, 10);
      expect(hard.need).toBe(plain.need);
    }
    // tired hands at the tenth rank still have a pace to keep
    const tired = startStir(6, stirMods([], true), harderAt(10));
    expect(tired.hi - tired.lo).toBeGreaterThan(0.3);
    // a hand that wanders a little keeps the plain pot's pace and loses helpings of the hard one
    const wander = (s: ReturnType<typeof startStir>) => { let g = s; for (let i = 0; i < 1200 && !stirred(g); i++) g = stir(g, (STIRRING.pace + 0.55 * Math.sin(i / 12)) * 0.05, 0.05); return g; };
    expect(wander(plain).misses).toBe(0);
    expect(wander(startStir(6, mods, harderAt(10))).misses).toBeGreaterThan(0);
  });

  it("in the roast is a fire that flares oftener and a face done nearer to burnt; plain, the game is as it was", () => {
    expect(startRoast(false, 7, 1, 1)).toEqual(startRoast(false, 7));
    expect(doneFrom(startRoast(false, 7))).toBe(ROASTING.done);
    expect(doneFrom(startRoast(true, 7))).toBe(ROASTING.tiredDone);
    const flares = (h: number) => startRoast(false, 7, 1, h).flares.filter((at) => at <= ROASTING.longest).length;
    expect(flares(harderAt(4))).toBeGreaterThan(flares(1));
    expect(flares(harderAt(10))).toBeGreaterThan(flares(harderAt(4)));
    for (const rank of [4, 10]) {
      const h = harderAt(rank), r = startRoast(false, 7, 1, h);
      expect((ROASTING.burnt - doneFrom(r)) * h).toBeCloseTo(ROASTING.burnt - ROASTING.done, 10);
      expect(doneFrom(r)).toBeLessThan(ROASTING.burnt);
    }
    expect(doneFrom(startRoast(true, 7, 1, harderAt(10)))).toBeLessThan(ROASTING.burnt);
  });
});
