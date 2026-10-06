import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { RECIPE_IDS, basketEat, basketOf, basketPut, basketRoom, basketTake, cookWith, needsOf, spoon, spoonSays, takes, whispersOf } from "./cooking";
import { stretchOf } from "./gifts";
import { ITEMS, type DishId, type ItemId } from "./items";
import { begun, dayOf } from "./stamina";
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
 *   every count of these hours' pots kept; a ladle, a pot of the same dish in the bag already, a bag with no room.
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
  for (let i = 0; i < 520; i++) {
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
    const g = c.maybe(0.1) ? undefined : { had: c.maybe(0.9) ? ["famSprite", "famGnome", "charmApron"] : ["famGnome"], charms: [], ...(fam === undefined ? {} : { familiar: fam }), ...(used === undefined ? {} : { used }) };
    const made = c.of<() => ItemId[] | undefined>([() => [id], () => [id], () => [id], () => [id, "tomYum"], () => POTS.filter((x) => x !== id), () => [], () => undefined])();
    const p = { ...newPurse(), stamina: { day: dayOf(NOON), left: c.of([100, 3, 0]) }, bag: b, ...(g ? { gifts: g } : {}), ...(made ? { made } : {}), recipes: [] } as Purse;
    const how = c.of<Record<string, unknown>>([{ sprite: true }, { sprite: true }, { sprite: true }, { sprite: true }, {}, { sprite: false }, { sprite: "yes" }]);
    const misses = c.of([0, 0, 1, 3, 9]);
    add("cook_with", [p, things, crew, misses, now, how], cookWith(p, things, crew, misses, now, how as { sprite?: boolean }));
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
    const pots = of("cook_with").map((v) => ({ how: v.args[5] as { sprite?: unknown }, misses: v.args[3] as number, d: v.want as { ok: boolean; why?: string; made?: string; n?: number; sprite?: boolean } }));
    const bySprite = pots.filter((x) => x.how.sprite === true), byHand = pots.filter((x) => x.how.sprite !== true);
    for (const why of ["none", "unmade", "spent", "crew", "tool", "full"]) expect(bySprite.some((x) => !x.d.ok && x.d.why === why), why).toBe(true);
    expect(bySprite.every((x) => !x.d.ok || x.d.sprite === true) && byHand.every((x) => x.d.sprite === undefined)).toBe(true);
    for (const id of ["tomYum", "friedMinnow", "crabCurry", "fishSauce", "compost"]) expect(bySprite.some((x) => x.d.ok && x.d.made === id), id).toBe(true);
    // (a pot of the sprite's is whole whatever was missed; by hand, the same recipe and the odd dish)
    expect(bySprite.some((x) => x.d.ok && x.misses >= 3 && x.d.made! in { tomYum: 1, friedMinnow: 1, crabCurry: 1, grilledCorn: 1, shabu: 1 })).toBe(true);
    expect(byHand.some((x) => x.d.ok && x.d.made === "oddDish")).toBe(true);
    expect(byHand.some((x) => x.d.ok && x.d.made !== "oddDish" && x.d.made !== null)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-kitchen.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
