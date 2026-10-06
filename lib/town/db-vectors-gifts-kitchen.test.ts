import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { RECIPE_IDS, basketEat, basketOf, basketPut, basketRoom, basketTake, cookWith, needsOf, spiceEat, spoon, spoonSays, takes, whispersOf } from "./cooking";
import { stretchOf } from "./gifts";
import { ITEMS, type DishId, type ItemId, type MealBuffId } from "./items";
import { STAMINA, begun, chew, dayOf, raised, spiceOf } from "./stamina";
import { newPurse, put, type Purse } from "./trade";

/**
 * The cases the database's rules of the kitchen's gifts are held to (v153's kitchen part; lib/town/db-vectors-gifts.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers:
 *
 * - `basket_of`, `basket_room`: purses that keep a basket soundly and not (no array, a thing that is no dish, a dish
 *   twice, a count that is no whole number above nothing), with the gift and without;
 * - `basket_put`: every slot of bags with dishes, other things, a pot of food and holes; amounts whole and not,
 *   none, more than the slot has, more than the basket has room for;
 * - `basket_take`: dishes in the basket and not, amounts of every sort, bags with room, with a stack begun, with none;
 * - `begun`, `basket_eat`: sitting and standing, a meal at hand, a meal's hours with none, some and all of their
 *   helpings had, on the day kept and on another, in each of the three meals' hours;
 * - `whispers_of`, `spoon_says`, `spoon`: pots that are a part of every recipe there is (some of its things, all but
 *   its last, all of it, one too many of a thing, a thing no recipe has with the rest), with recipes read whole
 *   already and not; asked with the spoon and without, of things the bag has and has not, with every count of the
 *   day's answers kept (none, some, all, of another day);
 * - `cook_with`: pots cooked by the hearth sprite and by hand: the sprite following, resting and not had; recipes made
 *   before and not, dishes and what is made otherwise, with one cook and with two; the cookware in the hand and not;
 *   every count of these hours' pots kept; a ladle, a pot of the same dish in the bag already, a bag with no room;
 *   and pots cooked by hand with the phoenix flame set to guard them and not, by its owner and by somebody without
 *   it, with every count of the day's givings back kept: recipes, the odd dish, and what bare hands lose;
 * - `spice_of`, `raised_to`, `chew`, `spice_eat`: a sprinkling of the meal at hand, of another meal, kept wrongly and
 *   not at all; a buff had at every level, run out, and not had, raised with a level and with none; meals counted on
 *   before, at and after their end, sprinkled and plain, of dishes that leave a buff and that leave none; and bowls
 *   sprinkled out of the bag and the basket, sitting and not, with the day's one sprinkling had and not.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-kitchen.test.ts
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-07T12:00:00"), HOUR = 3_600_000;
/** A moment in each meal's hours, and one before dawn (the day before's dinner still). */
const WHENS = [at("2026-10-07T06:30:00"), NOON, at("2026-10-07T19:10:00"), at("2026-10-08T03:00:00")];
const DISHES_SOME: DishId[] = ["tomYum", "friedMinnow", "oddDish", "riceBox", "shabu", "grilledCorn", "moonTea", "laab"];
const OTHERS: ItemId[] = ["minnow", "pot", "bowl", "rice", "worm", "boot"];

export function vectorsKitchen(): Vector[] {
  const c = chance(20261072), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  /** A bag of so many slots: dishes, other things, a pot of food, holes. */
  const bag = (slots: number, fill: number): Purse["bag"] => Array.from({ length: slots }, () => {
    if (!c.maybe(fill)) return null;
    const kind = c.int(0, 9);
    if (kind === 0) return { item: "potFull" as ItemId, n: 1, of: { dish: c.of(DISHES_SOME), left: c.int(1, 5) } };
    const item = kind <= 6 ? (c.of(DISHES_SOME) as ItemId) : c.of(OTHERS);
    return { item, n: c.int(1, Math.max(1, Math.min(ITEMS[item].stack, 9))) };
  });
  /** What a purse may keep as its basket: sound, or wrong in one of the ways there are. */
  const basket = (): unknown => c.of<() => unknown>([
    () => undefined, () => [], () => [[c.of(DISHES_SOME), c.int(1, 4)]],
    () => { const pool = [...DISHES_SOME]; return Array.from({ length: c.int(1, 5) }, () => [pool.splice(c.int(0, pool.length - 1), 1)[0], c.int(1, 4)]); },
    () => [["tomYum", 12]], () => [["tomYum", 6], ["friedMinnow", 5]], () => [["tomYum", 11], ["riceBox", 1]], () => [["tomYum", 9], ["shabu", 9]],
    () => "tomYum", () => ({ tomYum: 2 }), () => null,
    () => [["tomYum", 2], ["minnow", 3], ["tomYum", 4], ["shabu", 0], ["laab", 1.5], ["moonTea", "2"], ["riceBox"], null, ["grilledCorn", 1], ["noSuchDish", 2], ["oddDish", -1], [3, 3], ["friedMinnow", 2, 2]],
  ])();
  const gifts = () => c.of<Purse["gifts"] | undefined>([undefined, { had: [], charms: [] }, { had: ["thingBasket"], charms: [] }, { had: ["thingBasket"], charms: [] }, { had: ["thingBasket"], charms: [] },
    { had: ["charmApron", "thingBasket", "thingSpoon"], charms: ["charmApron"] }, { had: ["charmApron"], charms: ["charmApron"] }]);
  const purse = (more: Partial<Purse> = {}): Purse => {
    const b = basket(), g = gifts();
    return { ...newPurse(), stamina: { day: dayOf(NOON), left: c.of([100, 40, 0]) }, bag: bag(c.of([6, 10]), c.of([0.3, 0.7, 1])), ...(g === undefined ? {} : { gifts: g }), ...(b === undefined ? {} : { basket: b as Purse["basket"] }), ...more } as Purse;
  };

  // what is kept, made sound; how much room there is
  for (let i = 0; i < 220; i++) { const p = purse(); add("basket_of", [p], basketOf(p)); add("basket_room", [p], basketRoom(p)); }
  // put in: every slot and the ones there are not, amounts of every sort
  for (let i = 0; i < 260; i++) {
    const p = purse();
    for (const slot of [c.int(0, p.bag.length - 1), c.int(0, p.bag.length - 1), c.of([-1, p.bag.length, 99])]) {
      const n = c.of<number | null>([1, 1, 1, 2, 3, p.bag[slot]?.n ?? 1, (p.bag[slot]?.n ?? 1) + 1, 12, 13, 0, -1, 1.5, null]);
      add("basket_put", [p, slot, n], basketPut(p, slot, n as number));
    }
  }
  // (a basket with exactly so much room: the last that fits, and one more)
  for (const room of [0, 1, 2, 5]) for (const n of [1, 2, 3, 5, 6]) for (const g of [{ had: ["thingBasket"], charms: [] }, { had: [], charms: [] }]) {
    const p: Purse = { ...newPurse(), gifts: g, basket: room === 12 ? [] : [["tomYum", 12 - room]], bag: put(put(newPurse().bag, "friedMinnow", 6), "tomYum", 6) };
    for (const slot of [0, 1]) add("basket_put", [p, slot, n], basketPut(p, slot, n));
  }
  // taken out: a dish that is in it and one that is not, into bags with room, with a stack begun, with none
  for (let i = 0; i < 260; i++) {
    const p = purse(), mine = basketOf(p);
    const dish = c.of<string | null>([mine[0]?.[0] ?? "tomYum", mine[mine.length - 1]?.[0] ?? "shabu", c.of(DISHES_SOME), "minnow", "noSuchDish", null]);
    const had = mine.find(([d]) => d === dish)?.[1] ?? 1;
    add("basket_take", [p, dish, c.of<number | null>([1, 1, 2, had, had + 1, 0, -2, 1.5, null])], basketTake(p, dish as string, c.of<number>([1])));
  }
  // (basket_take's amount was drawn twice above: answered again as it was asked)
  for (const v of out) if (v.fn === "basket_take") v.want = JSON.parse(JSON.stringify(basketTake(v.args[0] as Purse, v.args[1] as string, v.args[2] as number)));
  for (const fill of ["empty", "begun", "stackFull", "crammed"] as const) for (const n of [1, 2, 3]) {
    const stack = ITEMS.tomYum.stack;
    let b = newPurse().bag.map(() => null) as Purse["bag"];
    if (fill === "begun") b = b.map((_, i) => (i === 3 ? { item: "tomYum" as ItemId, n: stack - 2 } : { item: "boot" as ItemId, n: 1 }));
    if (fill === "stackFull") b = b.map((_, i) => (i === 3 ? { item: "tomYum" as ItemId, n: stack } : { item: "boot" as ItemId, n: 1 }));
    if (fill === "crammed") b = b.map(() => ({ item: "boot" as ItemId, n: 1 }));
    const p: Purse = { ...newPurse(), gifts: { had: ["thingBasket"], charms: [] }, basket: [["friedMinnow", 1], ["tomYum", 4]], bag: b };
    add("basket_take", [p, "tomYum", n], basketTake(p, "tomYum", n));
  }
  // a helping begun, and one eaten straight out of the basket: sitting and not, a meal at hand, the hours' helpings had
  for (let i = 0; i < 320; i++) {
    const now = c.of(WHENS), day = dayOf(now);
    const meals = c.of<() => Purse["meals"]>([
      () => ({ day: -1, eaten: [false, false, false] }), () => ({ day, eaten: [false, false, false], bowls: [0, 0, 0] }), () => ({ day, eaten: [true, false, false] }),
      () => ({ day, eaten: [true, true, true], bowls: [c.int(1, 3), c.int(1, 3), c.int(1, 3)] }), () => ({ day, eaten: [true, true, true], bowls: [3, 3, 3] }),
      () => ({ day: day - 1, eaten: [true, true, true], bowls: [3, 3, 3] }), () => ({ day, eaten: [false, true, false], bowls: [0, 2, 0] }),
    ])();
    const eating = c.maybe(0.15) ? { dish: "riceBox" as DishId, meal: 1 as const, from: now - 60_000, till: now - 60_000, got: 0 } : null;
    const p = purse({ meals, eating });
    const mine = basketOf(p), dish = c.of<string | null>([mine[0]?.[0] ?? "tomYum", mine[0]?.[0] ?? "tomYum", mine[mine.length - 1]?.[0] ?? "shabu", c.of(DISHES_SOME), "minnow", null]);
    const seated = c.of<boolean | null>([true, true, true, false, null]);
    add("basket_eat", [p, dish, seated, now], basketEat(p, dish as string, seated as boolean, now));
    add("begun", [p, c.of(DISHES_SOME), now], begun(p, c.of(DISHES_SOME), now));
  }
  // (begun's dish was drawn twice above: answered again as it was asked)
  for (const v of out) if (v.fn === "begun") v.want = JSON.parse(JSON.stringify(begun(v.args[0] as Purse, v.args[1] as DishId, v.args[2] as number)));

  // the spoon: a pot that is a part of a recipe, of every recipe there is, and pots that are no recipe's
  const part = (id: ItemId, how: number): Array<[ItemId, number]> => {
    const needs = needsOf(id);
    if (how === 0) return needs.slice(0, -1);                                    // all but its secret thing
    if (how === 1) return needs.slice(0, Math.max(1, c.int(1, needs.length)));   // its first things
    if (how === 2) return needs.map(([t, n]): [ItemId, number] => [t, c.int(1, n)]).filter(() => c.maybe(0.7)); // some of each
    if (how === 3) return needs;                                                 // all of it
    if (how === 4) return needs.map(([t, n], i): [ItemId, number] => [t, i === 0 ? n + 1 : n]); // one too many of its first
    return [...needs.slice(0, 1), [c.of<ItemId>(["hyacinth", "boot", "minnow", "salt"]), 1]]; // with something else
  };
  const knowns = (id: ItemId): string[] => c.of<() => string[]>([() => [], () => [], () => [id], () => [c.of(RECIPE_IDS)], () => [...RECIPE_IDS], () => RECIPE_IDS.filter(() => c.maybe(0.5)), () => ["noSuchThing", id]])();
  for (const id of RECIPE_IDS) for (let how = 0; how < 6; how++) {
    const pot = part(id, how);
    add("spoon_says", [pot, knowns(id)], spoonSays(pot, knowns(id)));
    // (and the recipe whole, with nothing known: it is the one answered for)
    if (how === 3) add("spoon_says", [pot, []], spoonSays(pot, []));
  }
  for (const pot of [[], [["minnow", 3]], [["minnow", 3], ["minnow", 1]], [["salt", 1]], [["rice", 0]], [["chili", 1], ["garlic", 1]]] as Array<Array<[ItemId, number]>>) for (const known of [[], ["friedMinnow"], ["friedMinnow", "fishSauce"]]) add("spoon_says", [pot, known], spoonSays(pot, known));
  // (spoon_says' known recipes were drawn twice above: answered again as they were asked)
  for (const v of out) if (v.fn === "spoon_says") v.want = JSON.parse(JSON.stringify(spoonSays(v.args[0] as Array<[ItemId, number]>, v.args[1] as string[])));
  for (let i = 0; i < 60; i++) {
    const p = { whispers: c.of<() => unknown>([() => undefined, () => [], () => ["tomYum"], () => ["tomYum", "minnow", "tomYum", 3, null, "fishSauce", "oddDish", "noSuchThing"], () => "tomYum", () => ({ tomYum: 1 }), () => RECIPE_IDS.filter(() => c.maybe(0.3))])() } as Pick<Purse, "whispers">;
    add("whispers_of", [p], whispersOf(p));
  }
  const kDay = stretchOf({ n: 3, per: "day" }, NOON);
  for (let i = 0; i < 420; i++) {
    const id = c.of(RECIPE_IDS), pot = part(id, c.int(0, 5)), now = c.of([NOON, NOON + 5 * HOUR, NOON + 24 * HOUR]);
    // a bag that has the pot's things (or is one short of one of them), and something else
    let b = newPurse().bag.map(() => null) as Purse["bag"];
    const short = c.maybe(0.12);
    pot.forEach(([t, n], j) => { const k = short && j === 0 ? n - 1 : n; if (k > 0) b = put(b, t, Math.min(k, ITEMS[t].stack)); });
    const used = c.of<() => unknown>([() => undefined, () => undefined, () => ({ thingSpoon: { k: kDay, n: c.int(0, 4) } }), () => ({ thingSpoon: { k: kDay, n: 3 } }), () => ({ thingSpoon: { k: kDay - 1, n: 3 } }), () => ({ thingSpoon: { k: kDay, n: 2 }, famGnome: { k: 5, n: 1 } })])();
    const g = c.of<() => Purse["gifts"] | undefined>([() => undefined, () => ({ had: ["thingBasket"], charms: [] }), () => ({ had: ["thingSpoon"], charms: [] }), () => ({ had: ["thingSpoon"], charms: [] }), () => ({ had: ["thingSpoon", "charmApron"], charms: ["charmApron"] })])();
    const p = { ...newPurse(), stamina: { day: dayOf(NOON), left: 50 }, bag: b, ...(g ? { gifts: { ...g, ...(used === undefined ? {} : { used }) } } : {}),
      ...(c.maybe(0.4) ? { made: c.of<() => ItemId[]>([() => [id], () => [c.of(RECIPE_IDS)], () => RECIPE_IDS.filter(() => c.maybe(0.5))])() } : {}),
      ...(c.maybe(0.4) ? { whispers: c.of<() => ItemId[]>([() => [id], () => [c.of(RECIPE_IDS), c.of(RECIPE_IDS)], () => RECIPE_IDS.filter(() => c.maybe(0.5))])() } : {}) } as Purse;
    const asked = c.of<() => Array<[ItemId, number]>>([() => pot, () => pot, () => pot, () => [], () => [...pot, ["pot" as ItemId, 1]], () => pot.map(([t, n]): [ItemId, number] => [t, n + 0.5]), () => Array.from({ length: 9 }, (_, j): [ItemId, number] => [(["minnow", "salt", "rice", "chili", "garlic", "corn", "tomato", "basil", "scallion"] as ItemId[])[j], 1])])();
    add("spoon", [p, asked, now], spoon(p, asked, now));
  }
  // the hearth sprite: pots cooked with no game, and the same pots cooked by hand
  const kMeal = stretchOf({ n: 3, per: "meal" }, NOON);
  const POTS: ItemId[] = ["tomYum", "friedMinnow", "fishSauce", "compost", "crabCurry", "grilledCorn", "shabu", "curryPaste"];
  for (let i = 0; i < 900; i++) {
    const id = c.of(POTS), needs = needsOf(id), t = takes(id), now = c.of([NOON, NOON, NOON + 6 * HOUR]);
    // what is put in: the recipe, or (now and then) something that is none
    const things = c.of<() => Array<[ItemId, number]>>([() => needs, () => needs, () => needs, () => needs, () => needs.slice(0, -1).concat([["hyacinth", 1]]), () => [["hyacinth", 2]], () => [], () => needs.map(([x, n]): [ItemId, number] => [x, n + 1])])();
    let b = Array<null>(c.of([8, 12])).fill(null) as Purse["bag"];
    for (const [x, n] of things) if (c.maybe(0.95)) b = put(b, x, Math.min(n + c.of([0, 0, 1]), ITEMS[x].stack));
    if (c.maybe(0.2)) b = put(b, "ladle", 1);
    if (c.maybe(0.2)) b = b.map((s, j) => (j === b.length - 1 && !s ? { item: "potFull" as ItemId, n: 1, of: { dish: (id in { tomYum: 1, friedMinnow: 1, crabCurry: 1, grilledCorn: 1, shabu: 1 } ? id : "tomYum") as DishId, left: c.int(1, 4) } } : s));
    if (c.maybe(0.1)) b = b.map((s) => s ?? { item: "boot" as ItemId, n: 1 });
    // who cooks with what: the cookware the recipe takes, a cook to a piece; or not all of it
    const crew = c.of<() => Array<ItemId | null>>([() => (t.in.length ? [...t.in] : [null]), () => (t.in.length ? [...t.in] : [null]), () => (t.in.length ? [...t.in] : [null]), () => [...t.in, null, null], () => [null], () => [t.in[0] ?? "pot"], () => ["pan", "pot", "grill"]])();
    const fam = c.of<string | null | undefined>(["famSprite", "famSprite", "famSprite", "famSprite", null, undefined, "famGnome"]);
    const used = c.of<() => unknown>([() => undefined, () => undefined, () => ({ famSprite: { k: kMeal, n: c.int(0, 4) } }), () => ({ famSprite: { k: kMeal, n: 3 } }), () => ({ famSprite: { k: kMeal - 1, n: 3 } }), () => ({ famSprite: { k: kMeal, n: 2 }, thingSpoon: { k: 1, n: 1 } })])();
    const flamed = c.of<() => unknown>([() => undefined, () => undefined, () => ({ k: stretchOf({ n: 3, per: "day" }, now), n: c.int(0, 4) }), () => ({ k: stretchOf({ n: 3, per: "day" }, now), n: 3 }), () => ({ k: stretchOf({ n: 3, per: "day" }, now) - 1, n: 3 })])();
    const usedAll = used === undefined && flamed === undefined ? undefined : { ...((used as object | undefined) ?? {}), ...(flamed === undefined ? {} : { thingFlame: flamed }) };
    const g = c.maybe(0.1) ? undefined : { had: [...(c.maybe(0.9) ? ["famSprite", "famGnome", "charmApron"] : ["famGnome"]), ...(c.maybe(0.7) ? ["thingFlame"] : [])], charms: [], ...(fam === undefined ? {} : { familiar: fam }), ...(usedAll === undefined ? {} : { used: usedAll }) };
    const made = c.of<() => ItemId[] | undefined>([() => [id], () => [id], () => [id], () => [id, "tomYum"], () => POTS.filter((x) => x !== id), () => [], () => undefined])();
    const p = { ...newPurse(), stamina: { day: dayOf(NOON), left: c.of([100, 3, 0]) }, bag: b, ...(g ? { gifts: g } : {}), ...(made ? { made } : {}), recipes: [], ...(c.maybe(0.2) ? { tries: { tomYum: 2 } } : {}) } as Purse;
    const how = c.of<Record<string, unknown>>([{ sprite: true }, { sprite: true }, { sprite: true }, { sprite: true, flame: true }, {}, { sprite: false }, { sprite: "yes" }, { flame: true }, { flame: true }, { flame: true }, { flame: true }, { sprite: false, flame: true }, { flame: "yes" }]);
    const misses = c.of([0, 0, 1, 3, 9]);
    add("cook_with", [p, things, crew, misses, now, how], cookWith(p, things, crew, misses, now, how as { sprite?: boolean; flame?: boolean }));
  }
  // (a bag with no slot for the pot once the things are out of it: each of them one more than the recipe takes, and nothing else free)
  for (const how of [{ sprite: true }, { flame: true }, {}]) for (const slots of [4, 5]) {
    const needs = needsOf("tomYum");
    let b = Array<null>(slots).fill(null) as Purse["bag"];
    for (const [x, n] of needs) b = put(b, x, n + 1);
    b = b.map((s) => s ?? { item: "boot" as ItemId, n: 1 });
    const p = { ...newPurse(), stamina: { day: dayOf(NOON), left: 100 }, bag: b, made: ["tomYum"], gifts: { had: ["famSprite", "thingFlame"], charms: [], familiar: "famSprite" } } as Purse;
    add("cook_with", [p, needs, ["pot"], 0, NOON, how], cookWith(p, needs, ["pot"], 0, NOON, how));
  }
  // the stardust spice: which meal is sprinkled, what a sprinkled bowl leaves, and the sprinkling itself
  const MEAL = STAMINA.minutes * 60_000, BUFFS: MealBuffId[] = ["calm", "keen", "lucky", "hearty", "green", "forage", "net"];
  const buffsKept = (now: number) => c.of<() => Purse["buffs"] | undefined>([() => undefined, () => [], () => [{ id: c.of(BUFFS), level: c.int(1, 4), until: now + c.int(1, 170) * 60_000 }],
    () => [{ id: "hearty", level: c.int(1, 4), until: now + 40 * 60_000 }, { id: "keen", level: 2, until: now + 90 * 60_000 }], () => [{ id: "hearty", level: 3, until: now - 60_000 }], () => [{ id: "calm", level: 4, until: now + 5 * 60_000 }, { id: "forage", level: 1, until: now + 60_000 }]])();
  const sprinkling = (from: number) => c.of<() => unknown>([() => undefined, () => undefined, () => ({ from, level: 4 }), () => ({ from, level: 4 }), () => ({ from, level: 4 }), () => ({ from: from - 1, level: 4 }), () => ({ from, level: 0 }), () => ({ from, level: 2.5 }),
    () => ({ from, level: "4" }), () => ({ level: 4 }), () => "yes", () => null, () => ({ from: String(from), level: 4 }), () => ({ from, level: 9 })])();
  for (let i = 0; i < 300; i++) {
    const from = NOON - c.of([0, 60_000, MEAL - 1, MEAL, MEAL + 60_000]), dish = c.of<DishId>(["tomYum", "friedMinnow", "grilledCorn", "riceBox", "oddDish", "moonTea", "mushroomSoup"]);
    const eating = c.maybe(0.12) ? null : { dish, meal: 1 as const, from, till: from + c.of([0, 30_000, 120_000]), got: c.of([0, 3.5]) };
    const sp = sprinkling(from), bf = buffsKept(NOON);
    const p = { ...newPurse(), stamina: { day: dayOf(NOON), left: c.of([0, 40, 99.5]) }, meals: { day: dayOf(NOON), eaten: [false, true, false], bowls: [0, 1, 0] }, eating, bag: put(newPurse().bag, "boot", c.of([0, 1])),
      ...(sp === undefined ? {} : { spiced: sp }), ...(bf === undefined ? {} : { buffs: bf }), ...(c.maybe(0.3) ? { owed: 1 } : {}) } as Purse;
    add("spice_of", [p], spiceOf(p));
    add("chew", [p, c.of([0, 0, 2, 7]), NOON], chew(p, c.of([0]), NOON));
    const id = c.of(BUFFS), to = c.of([0, 0, 1, 2, 4, 4, 5]);
    add("raised_to", [p, id, NOON, to], raised(p, id, NOON, to));
  }
  // (chew's company was drawn twice above: answered again as it was asked)
  for (const v of out) if (v.fn === "chew") v.want = JSON.parse(JSON.stringify(chew(v.args[0] as Purse, v.args[1] as number, v.args[2] as number)));
  const kDay2 = stretchOf({ n: 1, per: "day" }, NOON);
  for (let i = 0; i < 360; i++) {
    const now = c.of(WHENS), day = dayOf(now);
    const g = c.of<() => Purse["gifts"] | undefined>([() => undefined, () => ({ had: ["thingBasket"], charms: [] }), () => ({ had: ["thingSpice"], charms: [] }), () => ({ had: ["thingSpice", "thingBasket"], charms: [] }), () => ({ had: ["thingSpice", "thingBasket"], charms: [] }),
      () => ({ had: ["thingSpice", "thingBasket"], charms: [], used: { thingSpice: { k: stretchOf({ n: 1, per: "day" }, now), n: 1 } } }), () => ({ had: ["thingSpice"], charms: [], used: { thingSpice: { k: kDay2 - 3, n: 1 } } })])();
    const meals = c.of<() => Purse["meals"]>([() => ({ day: -1, eaten: [false, false, false] }), () => ({ day, eaten: [false, false, false], bowls: [0, 0, 0] }), () => ({ day, eaten: [true, true, true], bowls: [3, 3, 3] }), () => ({ day, eaten: [true, true, true], bowls: [c.int(0, 2), c.int(0, 2), c.int(0, 2)] })])();
    const p = { ...newPurse(), stamina: { day, left: 50 }, meals, eating: c.maybe(0.1) ? { dish: "riceBox" as DishId, meal: 1 as const, from: now - 60_000, till: now - 60_000, got: 0 } : null,
      bag: bag(8, c.of([0.5, 0.9])), ...(g ? { gifts: g } : {}), ...(c.maybe(0.6) ? { basket: basket() as Purse["basket"] } : {}), ...(c.maybe(0.3) ? { spiced: { from: now - 999, level: 4 } } : {}) } as Purse;
    const mine = basketOf(p), fromBasket = c.maybe(0.4);
    const slot = c.of([c.int(0, 7), c.int(0, 7), -1, 99]), dish = c.of<string>([mine[0]?.[0] ?? "tomYum", mine[mine.length - 1]?.[0] ?? "grilledCorn", "grilledCorn", "minnow"]);
    const seated = c.of<boolean | null>([true, true, true, true, false, null]);
    add("spice_eat", [p, fromBasket ? null : slot, fromBasket ? dish : null, seated, now], spiceEat(p, fromBasket ? { dish } : { slot }, seated as boolean, now));
  }
  return out;
}

describe("the cases the database's rules of the kitchen's gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsKitchen();
    expect(JSON.stringify(vectorsKitchen())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => new Set(of(fn).map((v) => { const d = v.want as { ok: boolean; why?: string }; return d.ok ? "ok" : d.why; }));
    for (const fn of ["basket_of", "basket_room", "basket_put", "basket_take", "basket_eat", "begun"]) expect(of(fn).length, fn).toBeGreaterThan(40);
    // the basket: kept soundly and not, with room and with none
    expect(of("basket_of").some((v) => (v.want as unknown[]).length === 0) && of("basket_of").some((v) => (v.want as unknown[]).length > 2)).toBe(true);
    expect(of("basket_of").some((v) => JSON.stringify(v.want) !== JSON.stringify((v.args[0] as Purse).basket ?? []) && (v.want as unknown[]).length > 0)).toBe(true);
    const rooms = new Set(of("basket_room").map((v) => v.want as number));
    expect(rooms.has(0) && rooms.has(12) && [...rooms].some((r) => r > 0 && r < 12)).toBe(true);
    expect([...whys("basket_put")].sort()).toEqual(["amount", "full", "none", "ok"]);
    expect([...whys("basket_take")].sort()).toEqual(["amount", "full", "none", "ok"]);
    expect([...whys("basket_eat")].sort()).toEqual(["meal", "none", "ok", "stand"]);
    // a helping put onto a count that was there, and one that begins its own; the last out takes its dish with it
    const puts = of("basket_put").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ before: basketOf(v.args[0] as Purse), after: (v.want as { purse: Purse }).purse.basket! }));
    expect(puts.some((x) => x.after.length === x.before.length && x.before.length > 0) && puts.some((x) => x.after.length === x.before.length + 1)).toBe(true);
    const takes = of("basket_take").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ before: basketOf(v.args[0] as Purse), after: (v.want as { purse: Purse }).purse.basket! }));
    expect(takes.some((x) => x.after.length === x.before.length) && takes.some((x) => x.after.length === x.before.length - 1)).toBe(true);
    // a meal begun out of the basket in each of the three meals' hours
    const meals = new Set(of("basket_eat").filter((v) => (v.want as { ok: boolean }).ok).map((v) => (v.want as { purse: Purse }).purse.eating!.meal));
    expect([...meals].sort()).toEqual([0, 1, 2]);
    // the spoon: told, and silent each way; of a pot that could be one recipe and of one that could be many; a recipe kept as told
    expect([...whys("spoon_says")].sort()).toEqual(["amount", "astray", "known", "ok"]);
    expect([...whys("spoon")].sort()).toEqual(["amount", "astray", "known", "none", "ok", "spent"]);
    const said = of("spoon_says").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { of: string; ways: number });
    expect(said.some((s) => s.ways === 1) && said.some((s) => s.ways > 3)).toBe(true);
    for (const id of RECIPE_IDS) expect(said.some((s) => s.of === id), id).toBe(true);
    const told = of("spoon").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ before: whispersOf(v.args[0] as Purse), d: v.want as { of: ItemId; left: number; purse: Purse } }));
    expect(told.every((x) => x.d.purse.whispers!.at(-1) === x.d.of && x.d.purse.whispers!.length === x.before.length + 1)).toBe(true);
    expect(told.some((x) => x.d.left === 0) && told.some((x) => x.d.left === 2) && told.some((x) => x.before.length > 0)).toBe(true);
    expect(of("whispers_of").some((v) => (v.want as unknown[]).length === 2) && of("whispers_of").some((v) => (v.want as unknown[]).length === 0)).toBe(true);
    // the sprite's pots: a dish with its helping more, something made at its full number, each refusal of its own and of cooking's; and pots by hand
    const pots = of("cook_with").map((v) => ({ before: v.args[0] as Purse, how: v.args[5] as { sprite?: unknown; flame?: unknown }, misses: v.args[3] as number, d: v.want as { ok: boolean; why?: string; made?: string | null; n?: number; sprite?: boolean; back?: boolean; taste?: string; purse?: Purse } }));
    // the flame: every thing given back (the bag as it was, the stamina paid) of the odd dish and of what bare hands lose; not of a recipe; not past the day's three; not for whoever has none
    const guarded = pots.filter((x) => x.how.flame === true && x.how.sprite !== true && x.d.ok);
    const backs = guarded.filter((x) => x.d.back === true);
    expect(backs.length).toBeGreaterThan(8);
    expect(backs.every((x) => x.d.made === null && x.d.n === 0 && typeof x.d.taste === "string" && JSON.stringify(x.d.purse!.bag) === JSON.stringify(x.before.bag))).toBe(true);
    expect(backs.some((x) => x.d.purse!.stamina.left < x.before.stamina.left) && backs.some((x) => x.d.purse!.tries !== undefined)).toBe(true);
    expect(guarded.some((x) => !x.d.back && x.d.made === "oddDish") && guarded.some((x) => !x.d.back && x.d.made !== null && x.d.made !== "oddDish")).toBe(true);
    expect(pots.filter((x) => x.how.flame !== true).every((x) => x.d.back === undefined)).toBe(true);
    const bySprite = pots.filter((x) => x.how.sprite === true), byHand = pots.filter((x) => x.how.sprite !== true);
    for (const why of ["none", "unmade", "spent", "crew", "tool", "full"]) expect(bySprite.some((x) => !x.d.ok && x.d.why === why), why).toBe(true);
    expect(bySprite.every((x) => !x.d.ok || x.d.sprite === true) && byHand.every((x) => x.d.sprite === undefined)).toBe(true);
    for (const id of ["tomYum", "friedMinnow", "crabCurry", "fishSauce", "compost"]) expect(bySprite.some((x) => x.d.ok && x.d.made === id), id).toBe(true);
    // (a pot of the sprite's is whole whatever was missed; by hand, the same recipe and the odd dish)
    expect(bySprite.some((x) => x.d.ok && x.misses >= 3 && x.d.made! in { tomYum: 1, friedMinnow: 1, crabCurry: 1, grilledCorn: 1, shabu: 1 })).toBe(true);
    expect(byHand.some((x) => x.d.ok && x.d.made === "oddDish")).toBe(true);
    expect(byHand.some((x) => x.d.ok && x.d.made !== "oddDish" && x.d.made !== null)).toBe(true);
    // the spice: a sprinkling that is this meal's and one that is not; a buff raised to the last level, new and had; meals ended sprinkled and plain
    expect(new Set(of("spice_of").map((v) => v.want)).size).toBeGreaterThan(2);
    expect(of("spice_of").some((v) => v.want === 4) && of("spice_of").some((v) => v.want === 0 && (v.args[0] as Purse).spiced !== undefined)).toBe(true);
    const ended = of("chew").map((v) => ({ before: v.args[0] as Purse, d: v.want as { done: boolean; purse: Purse } })).filter((x) => x.d.done);
    const top = (x: (typeof ended)[number]) => (x.d.purse.buffs ?? []).some((b) => b.level === 4 && !(x.before.buffs ?? []).some((w) => w.id === b.id && w.level >= 3));
    expect(ended.some((x) => spiceOf(x.before) === 4 && top(x)) && ended.some((x) => spiceOf(x.before) === 0 && (x.d.purse.buffs ?? []).some((b) => b.level === 1))).toBe(true);
    expect(ended.every((x) => spiceOf(x.before) > 0 || !top(x))).toBe(true);
    expect(of("chew").some((v) => !(v.want as { done: boolean }).done)).toBe(true);
    const raises = of("raised_to").map((v) => ({ to: v.args[3] as number, d: v.want as { buffs: Array<{ id: string; level: number }> }, id: v.args[1] as string }));
    expect(raises.some((x) => x.to === 4 && x.d.buffs.find((b) => b.id === x.id)!.level === 4) && raises.some((x) => x.to === 0 && x.d.buffs.find((b) => b.id === x.id)!.level === 1) && raises.every((x) => x.d.buffs.every((b) => b.level <= 4))).toBe(true);
    expect([...whys("spice_eat")].sort()).toEqual(["meal", "none", "ok", "spent", "stand"]);
    const sprinkled = of("spice_eat").filter((v) => (v.want as { ok: boolean }).ok).map((v) => ({ fromBasket: v.args[2] !== null, now: v.args[4] as number, p: (v.want as { purse: Purse }).purse }));
    expect(sprinkled.some((x) => x.fromBasket) && sprinkled.some((x) => !x.fromBasket) && sprinkled.every((x) => x.p.spiced!.from === x.now && x.p.spiced!.level === 4 && x.p.eating!.from === x.now)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-kitchen.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
