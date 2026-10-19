import { describe, expect, it } from "vitest";
import {
  ANIMALS, BREEDS, OFFERINGS, SPECIES, SPECIES_IDS, adultAt, breedAt, crossOf, dayOf, dayStart, gateAt, heartsOf, rangeOf,
  rollOf, settle, stageOf, starterOf, unitsOf, type Animal, type Ctx,
} from "./animals";
import { dayOf as staminaDayOf } from "./stamina";
import { ITEMS, MAKES, type ItemId } from "./items";
import { animalAction, POPOTO_SHOP, feedHours, growFor, type AnimalWorld, type Env } from "./animal-act";
import { madeOf, potSays } from "./cooking";

import { put, held, gradePays, newPurse, type Purse } from "./trade";
import { FAMILY, ANIMAL_MAKES, FORAGE_BANDS } from "./animal-items";

const H = 3_600_000;
const T0 = dayStart(20_380) + 2 * H; // 07:00 Bangkok on a game day
const ctx: Ctx = { gate: [] };
const chick = (over: Partial<Animal> = {}): Animal => ({
  id: "a1", owner: "me", species: "chicken", breed: "barnHen", name: "", born: T0, bought: true, place: "producing",
  at: T0, food: 0, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: dayOf(T0) }, speedUntil: 0, windUntil: 0,
  narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, ...over,
});
const world = (animals: Animal[] = []): AnimalWorld => ({ animals, herds: [], gate: [], found: {}, spells: [], wagons: [] });
let n = 0;
const env = (now: number, me = "me", rolls: number[] = []): Env => ({ me, now, rand: () => (rolls.length ? rolls.shift()! : 0.5), newId: () => `n${++n}`, spot: () => [150, -10] });
const purseWith = (coins: number, things: Array<[string, number, number?]> = []): Purse => {
  let p: Purse = { ...newPurse(), coins };
  for (const [id, k, g] of things) p = { ...p, bag: put(p.bag, id as ItemId, k, (g ?? 0) as 0 | 1 | 2 | 3) };
  return p;
};

describe("the clock", () => {
  it("keeps the same day as stamina's", () => {
    for (let t = T0; t < T0 + 3 * 24 * H; t += 37 * 60_000) expect(dayOf(t)).toBe(staminaDayOf(t));
    expect(dayOf(dayStart(dayOf(T0) + 1))).toBe(dayOf(T0) + 1);
    expect(dayOf(dayStart(dayOf(T0) + 1) - 1)).toBe(dayOf(T0));
  });
  it("grows only on fed hours, and a chick is grown in 48 of them", () => {
    const a = settle(chick({ food: 24 }), T0 + 30 * H, ctx);
    expect(a.grown).toBeCloseTo(24, 6);
    expect(a.food).toBe(0);
    expect(stageOf(a, T0 + 30 * H)).toBe("young");
    const b = settle({ ...a, food: 24 }, T0 + 60 * H, ctx);
    expect(b.grown).toBeCloseTo(adultAt("chicken"), 6);
    expect(stageOf(b, T0 + 60 * H)).toBe("adult");
  });
  it("eats half as fast while the gate is open, and the speed-ups add up to three times", () => {
    const out = settle(chick({ food: 10 }), T0 + 10 * H, { gate: [[T0, null]] });
    expect(out.food).toBeCloseTo(5, 6);
    const fast = settle(chick({ food: 4, speedUntil: T0 + 99 * H }), T0 + 4 * H, { gate: [], bottle: true });
    expect(fast.grown).toBeCloseTo(12, 6);
    const capped = settle(chick({ food: 2, speedUntil: T0 + 99 * H, windUntil: T0 + 99 * H }), T0 + 2 * H, { gate: [], bottle: true });
    expect(capped.grown).toBeCloseTo(6, 6);
  });
  it("banks rounds as an adult in a producing place, and a full bank pauses", () => {
    const hen = chick({ grown: adultAt("chicken"), food: 24 });
    const a = settle(hen, T0 + 24 * H, ctx);
    expect(a.banked).toBe(SPECIES.chicken.bank);
    expect(a.made).toBe(0);
    const kept = settle({ ...hen, place: "keeping" }, T0 + 24 * H, ctx);
    expect(kept.banked).toBe(0);
  });
  it("credits a fed day's hearts when the day closes, and an outing's at once", () => {
    const a = settle(chick({ food: 24 }), dayStart(dayOf(T0) + 1) + 60_000, ctx);
    expect(a.hearts).toBe(ANIMALS.heart.fed);
    const hungry = settle(chick({ food: 1 }), dayStart(dayOf(T0) + 1) + 60_000, ctx);
    expect(hungry.hearts).toBe(0);
    const out = settle(chick({ food: 2 }), T0 + H, { gate: [[T0, null]] });
    expect(out.hearts).toBe(ANIMALS.heart.out);
    expect(gateAt([[T0, T0 + H]], T0 + 2 * H).open).toBe(false);
  });
});

describe("what it gives", () => {
  it("sets the range from hearts, the floor raised by graded feed (twenty at most)", () => {
    expect(rangeOf({ hearts: 0, narrow: 0 })).toEqual({ floor: 0, ceiling: 30 });
    expect(rangeOf({ hearts: 200, narrow: 0 })).toEqual({ floor: 70, ceiling: 100 });
    expect(rangeOf({ hearts: 200, narrow: 99 })).toEqual({ floor: 90, ceiling: 100 });
    expect(rollOf({ floor: 70, ceiling: 100 }, 0.999)).toBe(100);
    expect(rollOf({ floor: 70, ceiling: 100 }, 0)).toBe(70);
    expect(rollOf({ floor: 70, ceiling: 100 }, 0, true)).toBe(100);
    expect(heartsOf({ hearts: 59 })).toBe(2);
  });
  it("gives by the game: eggs less what cracked, a fleece 3 to 7, a milking 2 to 5 a round", () => {
    expect(unitsOf("eggs", 4, null, 1).units).toBe(3);
    expect(unitsOf("shear", 1, { hits: 0, misses: 9, secs: 9 }, 0)).toEqual({ units: 3, whole: false });
    expect(unitsOf("shear", 1, { hits: 20, misses: 0, secs: 9 }, 0)).toEqual({ units: 7, whole: true });
    expect(unitsOf("milk", 2, { hits: 10, misses: 0, secs: 9 }).units).toBe(10);
    expect(unitsOf("milk", 1, { hits: 0, misses: 10, secs: 9 }).units).toBe(2);
  });
  it("pays a farm egg by its grade, and a farm egg is an egg in the kitchen", () => {
    expect(gradePays("farmEgg" as ItemId, 3)).toBe(2.5);
    expect(gradePays("cream" as ItemId, 3)).toBe(1);
    expect(madeOf([["farmEgg" as ItemId, 2], ["oil" as ItemId, 1]])).toBe("omelette");
    expect(madeOf([["blueEgg" as ItemId, 1], ["duckEgg" as ItemId, 1], ["oil" as ItemId, 1]])).toBe("omelette");
    expect(madeOf([["lanternEgg" as ItemId, 2], ["milk" as ItemId, 1], ["sugar" as ItemId, 1]])).toBe("lanternCustard");
    expect(madeOf([["farmEgg" as ItemId, 2], ["farmMilk" as ItemId, 1], ["sugar" as ItemId, 1]])).toBe("custard");
    expect(potSays([["farmEgg" as ItemId, 1]]).fits).toBe(true);
  });
});

describe("breeding", () => {
  it("takes the right offering at the right step, at its tier's odds", () => {
    const A = starterOf("chicken"), B = breedAt("chicken", "B"), C = breedAt("chicken", "C");
    expect(crossOf(A, A, OFFERINGS.chicken.B!, false)).toMatchObject({ right: true, odds: 60, target: B });
    expect(crossOf(A, A, "seedTomato", false)).toMatchObject({ right: false, odds: 0, target: B });
    expect(crossOf(A, A, OFFERINGS.chicken.C!, true)).toMatchObject({ right: true, odds: 70, target: C });
    expect(crossOf(B, C, "marigold", false).target?.letter).toBe("D");
    expect(crossOf(breedAt("chicken", "E"), breedAt("chicken", "G"), "prism", false).odds).toBe(10);
  });
  it("names an item for every step and species, and everything the line names is an item", () => {
    for (const sp of SPECIES_IDS) for (const L of ["B", "C", "D", "E", "F", "G", "H"] as const) expect(ITEMS[OFFERINGS[sp][L]!]).toBeTruthy();
    const ids = new Set<string>([
      ...BREEDS.map((b) => b.produce), ...Object.keys(POPOTO_SHOP), ...Object.keys(FAMILY), ...Object.values(FAMILY),
      ...SPECIES_IDS.flatMap((sp) => [...Object.keys(SPECIES[sp].feeds), ...SPECIES[sp].treats, SPECIES[sp].sack, SPECIES[sp].growItem]),
      ...Object.keys(FORAGE_BANDS), ...Object.keys(ANIMAL_MAKES), ...Object.values(ANIMAL_MAKES).flatMap((m) => m!.needs.map(([k]) => k)), "manure", "packedRation", "dewGrow",
    ]);
    for (const id of ids) expect(ITEMS[id as ItemId], id).toBeTruthy();
    for (const id of Object.keys(ANIMAL_MAKES)) expect(MAKES[id as ItemId]).toBeTruthy();
    for (const sp of SPECIES_IDS) expect(feedHours(sp, SPECIES[sp].sack)).toBe(24);
    expect(growFor("cow", "calfGrow")).toBe(ANIMALS.growFeed);
  });
});

describe("a keeper's steps", () => {
  it("buys a baby into a producing place, and refuses past the places or the coins", () => {
    let w = world(), p = purseWith(10_000);
    for (let i = 0; i < 4; i++) { const r = animalAction(w, p, { action: "buy", species: "chicken" }, env(T0)); expect(r.ok).toBe(true); w = r.world; p = r.purse; }
    expect(w.animals.map((a) => a.place)).toEqual(["producing", "producing", "nursery", "nursery"]);
    expect(animalAction(w, p, { action: "buy", species: "chicken" }, env(T0)).why).toBe("places");
    expect(animalAction(world(), purseWith(10), { action: "buy", species: "cow" }, env(T0)).why).toBe("coins");
  });
  it("lets only the owner collect; a friend allowed may feed, pet and treat, for thirty points a day at most", () => {
    const hen = chick({ grown: adultAt("chicken"), banked: 2, hearts: 100 });
    const w0: AnimalWorld = { ...world([hen]), herds: [{ owner: "me", keeping: 0, facade: 0, care: "named", carers: ["pal"] }] };
    expect(animalAction(w0, purseWith(0, [["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 0 }, env(T0, "pal")).why).toBe("theirs");
    expect(animalAction(w0, purseWith(0, [["chickFeed", 1]]), { action: "feed", id: "a1", item: "chickFeed" }, env(T0, "stranger")).why).toBe("theirs");
    const fed = animalAction(w0, purseWith(0, [["chickFeed", 3]]), { action: "feed", id: "a1", item: "chickFeed" }, env(T0, "pal"));
    expect(fed.ok).toBe(true);
    expect(fed.notes[0]).toMatchObject({ line: "helpers", pts: 6 });
    const pet = animalAction(fed.world, fed.purse, { action: "pet", id: "a1" }, env(T0, "pal"));
    expect(pet.notes[0]).toMatchObject({ line: "helpers", pts: 1 });
    expect(animalAction(pet.world, pet.purse, { action: "pet", id: "a1" }, env(T0, "pal")).why).toBe("used");
    const capped = { ...pet.purse, animalCare: { day: dayOf(T0), n: 29 } } as Purse;
    const more = animalAction({ ...pet.world, animals: [{ ...hen, id: "a2", food: 0 }] }, { ...capped, bag: put(capped.bag, "chickFeed" as ItemId, 1) }, { action: "feed", id: "a2", item: "chickFeed" }, env(T0, "pal"));
    expect(more.notes[0]?.pts).toBe(1);
  });
  it("collects a graded harvest with the tool, a manure a day, and line points", () => {
    const hen = chick({ grown: adultAt("chicken"), banked: 3, hearts: 200 });
    const r = animalAction(world([hen]), purseWith(0, [["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 1 }, env(T0, "me", [0.99, 0.99, 0.99, 0.99]));
    expect(r.ok).toBe(true);
    expect(r.got?.n).toBe(2);
    expect(held(r.purse.bag, "farmEgg" as ItemId)).toBe(2);
    expect(held(r.purse.bag, "manure" as ItemId)).toBe(1);
    expect(r.notes[0]).toMatchObject({ line: "animals", pts: 2 * ANIMALS.points.unit });
    expect(animalAction(world([hen]), purseWith(0), { action: "collect", id: "a1", cracked: 0 }, env(T0)).why).toBe("nothing");
    const cow = chick({ species: "cow", breed: "dairyCow", grown: adultAt("cow"), banked: 1 });
    expect(animalAction(world([cow]), purseWith(0, [["milker", 1]]), { action: "collect", id: "a1", play: { hits: 9, misses: 0, secs: 1 } }, env(T0)).why).toBe("soon");
  });
  it("breeds a child that comes out later, rests both parents, and counts misses towards a clue", () => {
    const a = chick({ id: "p1", grown: adultAt("chicken"), hearts: 100 }), b = chick({ id: "p2", grown: adultAt("chicken"), hearts: 100 });
    const p = purseWith(1000, [["seedCorn", 5]]);
    const hit = animalAction(world([a, b]), p, { action: "breed", a: "p1", b: "p2", offering: "seedCorn" }, env(T0, "me", [0.1]));
    expect(hit.got).toMatchObject({ child: "silkie", first: true, right: true });
    const child = hit.world.animals.find((x) => x.breed === "silkie")!;
    expect(stageOf(child, T0)).toBe("coming");
    expect(stageOf(child, T0 + ANIMALS.hatch.bird)).toBe("baby");
    expect(hit.world.animals.find((x) => x.id === "p1")!.rest).toBe(T0 + ANIMALS.rest);
    expect(animalAction(hit.world, hit.purse, { action: "breed", a: "p1", b: "p2", offering: "seedCorn" }, env(T0 + H)).why).toBe("rest");
    let w = world([a, b]), q = p;
    for (let i = 0; i < 3; i++) {
      const r = animalAction(w, q, { action: "breed", a: "p1", b: "p2", offering: "seedCorn" }, env(T0 + i * 3 * 24 * H, "me", [0.99, 0.2]));
      expect(r.got?.child).toBe("barnHen");
      w = { ...r.world, animals: r.world.animals.filter((x) => x.id === "p1" || x.id === "p2") }; q = r.purse;
    }
    expect((q as Purse & { animalBook: { misses: Record<string, number> } }).animalBook.misses["chicken.B"]).toBe(3);
  });
  it("takes the cradle once a day with its gift, and spring wind readies a round once an animal", () => {
    const hen = chick({ grown: adultAt("chicken"), made: 3, food: 10 });
    const gifted = (ids: string[]) => ({ ...purseWith(0), gifts: { had: ids, charms: [], owed: 0, familiar: null, used: {} } }) as unknown as Purse;
    expect(animalAction(world([hen]), purseWith(0), { action: "cradle", id: "a1" }, env(T0)).why).toBe("gift");
    const c1 = animalAction(world([hen]), gifted(["thingCradle"]), { action: "cradle", id: "a1" }, env(T0, "me", [0.9]));
    expect(c1.ok).toBe(true);
    expect(animalAction(c1.world, c1.purse, { action: "cradle", id: "a1" }, env(T0 + 1000)).why).toBe("spent");
    const blew = animalAction(world([hen]), gifted(["thingSpringWind"]), { action: "wind" }, env(T0, "other"));
    expect(blew.ok).toBe(true);
    const came = animalAction(blew.world, purseWith(0), { action: "enter" }, env(T0 + 60_000));
    expect(came.world.animals[0].banked).toBe(1);
    const again = animalAction(came.world, purseWith(0), { action: "enter" }, env(T0 + 120_000));
    expect(again.world.animals[0].banked).toBe(1);
  });
});

describe("the meadow", () => {
  it("gives one thing a spot a band to a member, and a round out brings a find now and then", async () => {
    const { findOf, forageAt, MEADOW } = await import("./animals");
    const { FORAGE_BANDS } = await import("./animal-items");
    const r = animalAction(world(), purseWith(0), { action: "forage", spot: 3 }, env(T0));
    expect(r.ok).toBe(true);
    expect(r.got?.item).toBe(forageAt(FORAGE_BANDS, dayOf(T0), 2, 3));
    expect(animalAction(r.world, r.purse, { action: "forage", spot: 3 }, env(T0 + 1000)).why).toBe("used");
    expect(animalAction(r.world, r.purse, { action: "forage", spot: MEADOW.spots }, env(T0)).why).toBe("none");
    for (let band = 0; band < 8; band++) expect(forageAt(FORAGE_BANDS, 1, band, 0)).toBeTruthy();
    expect(findOf("chicken", 0, 0, 0)).toBeNull();
    expect(findOf("chicken", 1 << 2, 0.1, 0)).toBe("worm");
    expect(findOf("duck", 1 << 0, 0.1, 0)).toBe("ghostReed");
    expect(findOf("cow", 1 << 6, 0.9, 0)).toBeNull();
  });
});
