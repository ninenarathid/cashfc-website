import { describe, expect, it } from "vitest";
import {
  ANIMALS, BREEDS, OFFERINGS, SPECIES, SPECIES_IDS, adultAt, breedAt, crossOf, dayOf, dayStart, gateAt, heartsOf, rangeOf,
  rollOf, settle, stageOf, starterOf, unitsOf, barnsOf, untendedOf, newHerd, heartGain, stagesPaid, childStats, childRange, careOf,
  type Animal, type Ctx,
} from "./animals";
import { dayOf as staminaDayOf } from "./stamina";
import { ITEMS, MAKES, type ItemId } from "./items";
import { animalAction, POPOTO_SHOP, feedHours, growFor, type AnimalWorld, type Env } from "./animal-act";
import { madeOf, potSays } from "./cooking";

import { put, held, gradePays, newPurse, type Purse } from "./trade";
import { FAMILY, ANIMAL_MAKES, FORAGE_BANDS } from "./animal-items";

const H = 3_600_000;
const T0 = dayStart(20_380) + 2 * H; // 07:00 Bangkok on a game day
const ctx: Ctx = { door: [] };
const chick = (over: Partial<Animal> = {}): Animal => ({
  id: "a1", owner: "me", species: "chicken", breed: "barnHen", name: "", born: T0, bought: true, home: "barn",
  sex: "f", stats: { thrift: 1, gentle: 1, vigor: 1 }, streak: 0, at: T0, food: 0, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: dayOf(T0) }, speedUntil: 0, windUntil: 0,
  narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, ...over,
});
const world = (animals: Animal[] = []): AnimalWorld => ({ animals, herds: [{ ...newHerd("me"), barn: 0 }], found: {}, spells: [], wagons: [], offers: [], asks: [] });
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
  it("eats half as fast while its barn door is open, and the speed-ups add up to three times", () => {
    const out = settle(chick({ food: 10 }), T0 + 10 * H, { door: [[T0, null]] });
    expect(out.food).toBeCloseTo(5, 6);
    const fast = settle(chick({ food: 4, speedUntil: T0 + 99 * H }), T0 + 4 * H, { door: [], bottle: true });
    expect(fast.grown).toBeCloseTo(12, 6);
    const capped = settle(chick({ food: 2, speedUntil: T0 + 99 * H, windUntil: T0 + 99 * H }), T0 + 2 * H, { door: [], bottle: true });
    expect(capped.grown).toBeCloseTo(6, 6);
  });
  it("banks rounds as a grown female in the barn, and a full bank pauses", () => {
    const hen = chick({ grown: adultAt("chicken"), food: 24 });
    const a = settle(hen, T0 + 24 * H, ctx);
    expect(a.banked).toBe(SPECIES.chicken.bank);
    expect(a.made).toBe(0);
    const kept = settle({ ...hen, home: "pen" }, T0 + 24 * H, ctx);
    expect(kept.banked).toBe(0);
  });
  it("credits a fed day's hearts when the day closes, and an outing's at once", () => {
    const a = settle(chick({ food: 24 }), dayStart(dayOf(T0) + 1) + 60_000, ctx);
    expect(a.hearts).toBe(ANIMALS.heart.fed);
    const hungry = settle(chick({ food: 1 }), dayStart(dayOf(T0) + 1) + 60_000, ctx);
    expect(hungry.hearts).toBe(0);
    const out = settle(chick({ food: 2 }), T0 + H, { door: [[T0, null]] });
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
    // (what is made of it pays by its grade too: the owner, 2026-10-20, "ของแปรรูป กำไรเยอะกว่านี้ได้")
    expect(gradePays("cream" as ItemId, 3)).toBe(2.5);
    expect(gradePays("omelette" as ItemId, 3)).toBe(1);
    // (cream and cheese of farm milk, any breed's; never of the uncle's own milk, which would print coins)
    expect(madeOf([["farmMilk" as ItemId, 2]])).toBe("cream");
    expect(madeOf([["jerseyMilk" as ItemId, 1], ["farmMilk" as ItemId, 1]])).toBe("cream");
    expect(madeOf([["milk" as ItemId, 2]])).toBe(null);
    expect(madeOf([["milk" as ItemId, 1], ["farmMilk" as ItemId, 1]])).toBe(null);
    expect(madeOf([["cocoaMilk" as ItemId, 3], ["salt" as ItemId, 1]])).toBe("farmCheese");
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

describe("the barns", () => {
  const rich = (coins = 20_000) => purseWith(coins, [["log", 100], ["stoneTile", 30]]);
  it("sells one barn of the 24 a member in stages, for coins, logs and stone tiles; no barn, no animals", () => {
    const w0: AnimalWorld = { ...world(), herds: [] };
    expect(animalAction(w0, rich(), { action: "buy", species: "chicken", sex: "f" }, env(T0)).why).toBe("barn");
    expect(animalAction(w0, purseWith(20_000), { action: "barn", index: 3 }, env(T0)).why).toBe("nothing");
    expect(animalAction(w0, rich(), { action: "barn", index: ANIMALS.barns.count }, env(T0)).why).toBe("none");
    expect(animalAction(w0, rich(ANIMALS.barns.stages[0].coins - 1), { action: "barn", index: 3 }, env(T0)).why).toBe("coins");
    const r = animalAction(w0, rich(), { action: "barn", index: 3 }, env(T0));
    expect(r.ok).toBe(true);
    const [S1, S2] = ANIMALS.barns.stages;
    expect(r.purse.coins).toBe(20_000 - S1.coins);
    expect([held(r.purse.bag, "log" as ItemId), held(r.purse.bag, "stoneTile" as ItemId)]).toEqual([100 - S1.logs, 30 - S1.stone]);
    expect(r.world.herds[0]).toMatchObject({ owner: "me", barn: 3, room: S1.room, lastCare: T0 });
    // (enlarged to its next stage, and no further)
    const big = animalAction(r.world, r.purse, { action: "enlarge" }, env(T0));
    expect([big.ok, big.world.herds[0].room, big.purse.coins]).toEqual([true, S2.room, 20_000 - S1.coins - S2.coins]);
    expect(animalAction(big.world, big.purse, { action: "enlarge" }, env(T0)).why).toBe("full");
    expect(animalAction(w0, rich(), { action: "enlarge" }, env(T0)).why).toBe("barn");
    expect(animalAction(r.world, purseWith(20_000), { action: "enlarge" }, env(T0)).why).toBe("nothing");
    expect(animalAction(r.world, rich(), { action: "barn", index: 4 }, env(T0)).why).toBe("had");
    expect(animalAction(r.world, rich(), { action: "barn", index: 3 }, env(T0, "pal")).why).toBe("taken");
    expect(barnsOf(r.world.herds)[3]).toBe("me");
  });
  it("warns of a barn untended 14 and 21 days, and gives it to one who waits after 28 only when none is free", () => {
    const D = 24 * H;
    expect(untendedOf({ barn: 0, lastCare: T0 }, T0 + 13 * D).level).toBe(0);
    expect(untendedOf({ barn: 0, lastCare: T0 }, T0 + 14 * D).level).toBe(1);
    expect(untendedOf({ barn: 0, lastCare: T0 }, T0 + 21 * D).level).toBe(2);
    expect(untendedOf({ barn: 0, lastCare: T0 }, T0 + 28 * D).level).toBe(3);
    expect(untendedOf({ barn: null, lastCare: 0 }, T0).level).toBe(0);
    const later = T0 + 29 * D;
    const herds = Array.from({ length: ANIMALS.barns.count }, (_, i) => ({ ...newHerd(`m${i}`), barn: i, lastCare: later }));
    herds[5] = { ...herds[5], lastCare: T0, door: [[T0, null]] };
    const w: AnimalWorld = { ...world([chick({ owner: "m5", food: 5 }), chick({ id: "a2", owner: "m6" })]), herds };
    expect(animalAction(w, rich(), { action: "barn", index: 6 }, env(later)).why).toBe("taken");
    expect(animalAction(w, rich(), { action: "barn", index: 5 }, env(T0 + 27 * D)).why).toBe("taken");
    const r = animalAction(w, rich(), { action: "barn", index: 5 }, env(later));
    expect(r.ok).toBe(true);
    expect(r.world.animals.find((a) => a.id === "a1")).toMatchObject({ owner: "m5", home: "pen", at: later });
    expect(r.world.herds.find((h) => h.owner === "m5")).toMatchObject({ barn: null, credit: stagesPaid(ANIMALS.barns.stages[0].room), door: [[T0, later]] });
    expect(r.world.herds.find((h) => h.owner === "me")).toMatchObject({ barn: 5 });
    // (a barn free: none is taken back)
    const free: AnimalWorld = { ...w, herds: w.herds.filter((h) => h.owner !== "m0") };
    expect(animalAction(free, rich(), { action: "barn", index: 5 }, env(later)).why).toBe("taken");
    // (the credit pays the coins of the next)
    const back = animalAction({ ...r.world, herds: r.world.herds.filter((h) => h.owner !== "m9") }, rich(0), { action: "barn", index: 9 }, env(later, "m5"));
    expect(back.ok).toBe(true);
    expect(back.world.herds.find((h) => h.owner === "m5")).toMatchObject({ barn: 9, credit: 0 });
  });
});

describe("a keeper's steps", () => {
  it("buys a baby of the sex chosen, with stats of 2 to 4, into the barn while it has room, then the pen, then no more", () => {
    let w = world(), p = purseWith(10_000);
    for (let i = 0; i < ANIMALS.barns.stages[0].room + ANIMALS.pen; i++) {
      const r = animalAction(w, p, { action: "buy", species: "chicken", sex: i % 2 ? "m" : "f" }, env(T0, "me", [0, 0.99, 0.5]));
      expect(r.ok).toBe(true); w = r.world; p = r.purse;
    }
    expect(w.animals.map((a) => a.home)).toEqual([...Array(ANIMALS.barns.stages[0].room).fill("barn"), ...Array(ANIMALS.pen).fill("pen")]);
    expect(w.animals.slice(0, 2).map((a) => a.sex)).toEqual(["f", "m"]);
    expect(w.animals[0].stats).toEqual({ thrift: 2, gentle: 4, vigor: 3 });
    expect(animalAction(w, p, { action: "buy", species: "chicken", sex: "f" }, env(T0)).why).toBe("places");
    expect(animalAction(world(), p, { action: "buy", species: "chicken", sex: "x" as "m" }, env(T0)).why).toBe("none");
    expect(animalAction(world(), purseWith(10), { action: "buy", species: "cow", sex: "f" }, env(T0)).why).toBe("coins");
  });
  it("keeps an animal in Uncle Popoto's pen frozen, and takes it back while the barn has room", () => {
    const hen = chick({ home: "pen", food: 10 });
    expect(settle(hen, T0 + 5 * H, ctx)).toMatchObject({ food: 10, grown: 0, at: T0 + 5 * H });
    expect(animalAction(world([hen]), purseWith(0, [["chickFeed", 1]]), { action: "feed", id: "a1", item: "chickFeed" }, env(T0)).why).toBe("pen");
    const back = animalAction(world([hen]), purseWith(0), { action: "move", id: "a1", home: "barn" }, env(T0 + 5 * H));
    expect(back.world.animals[0]).toMatchObject({ home: "barn", at: T0 + 5 * H, food: 10 });
    expect(settle(back.world.animals[0], T0 + 7 * H, ctx).food).toBeCloseTo(8, 6);
    const full = world([hen, ...[1, 2, 3, 4].map((i) => chick({ id: `b${i}` }))]);
    expect(animalAction(full, purseWith(0), { action: "move", id: "a1", home: "barn" }, env(T0)).why).toBe("places");
  });
  it("gives nothing to collect of a rooster, a drake or a bull, and wool of a ram", () => {
    for (const sp of ["chicken", "duck", "cow"] as const) {
      const m = settle(chick({ species: sp, breed: starterOf(sp).id, sex: "m", grown: adultAt(sp), food: 24 }), T0 + 24 * H, ctx);
      expect([m.made, m.banked]).toEqual([0, 0]);
    }
    const ram = settle(chick({ species: "sheep", breed: starterOf("sheep").id, sex: "m", grown: adultAt("sheep"), food: 24 }), T0 + 24 * H, ctx);
    expect(ram.banked).toBe(1);
  });
  it("eats less of thrift, grows faster of vigour, and takes a pet more to heart of gentleness", () => {
    const thrifty = settle(chick({ food: 10, stats: { thrift: 10, gentle: 1, vigor: 1 } }), T0 + 10 * H, ctx);
    expect(thrifty.food).toBeCloseTo(10 - 10 * (1 - 9 * ANIMALS.stats.thrift), 6);
    const quick = settle(chick({ food: 10, stats: { thrift: 1, gentle: 1, vigor: 10 } }), T0 + 10 * H, ctx);
    expect(quick.grown).toBeCloseTo(10 * (1 + 9 * ANIMALS.stats.vigor), 6);
    const pet = animalAction(world([chick({ stats: { thrift: 1, gentle: 10, vigor: 1 } })]), purseWith(0), { action: "pet", id: "a1" }, env(T0));
    expect(pet.world.animals[0].hearts).toBe(heartGain({ stats: { thrift: 1, gentle: 10, vigor: 1 } }, ANIMALS.heart.pet));
    expect(heartGain({ stats: { thrift: 1, gentle: 10, vigor: 1 } }, 3)).toBe(3.81);
  });
  it("opens my barn's door for my animals alone, and my care is written down", () => {
    const w0: AnimalWorld = { ...world([chick({ food: 10 }), chick({ id: "a2", owner: "pal", food: 10 })]), herds: [{ ...newHerd("me"), barn: 0 }, { ...newHerd("pal"), barn: 1 }] };
    const open = animalAction(w0, purseWith(0), { action: "door", open: true }, env(T0));
    expect(open.world.herds.find((h) => h.owner === "me")).toMatchObject({ door: [[T0, null]], lastCare: T0 });
    const mine = animalAction(open.world, purseWith(0), { action: "pet", id: "a1" }, env(T0 + 4 * H));
    expect(mine.world.animals[0].food).toBeCloseTo(10 - 4 * ANIMALS.outRate, 6);
    const theirs = animalAction(open.world, purseWith(0), { action: "pet", id: "a2" }, env(T0 + 4 * H, "pal"));
    expect(theirs.world.animals[1].food).toBeCloseTo(6, 6);
    const shut = animalAction(open.world, purseWith(0), { action: "door", open: false }, env(T0 + H));
    expect(shut.world.herds.find((h) => h.owner === "me")!.door).toEqual([[T0, T0 + H]]);
    expect(animalAction({ ...w0, herds: [] }, purseWith(0), { action: "door", open: true }, env(T0)).why).toBe("barn");
  });
  it("hands an animal on at Uncle Popoto: offered for a day, taken into the other's pen with its hearts, or refused", () => {
    const o = animalAction(world([chick({ hearts: 120 })]), purseWith(0), { action: "offer", id: "a1", to: "pal" }, env(T0));
    expect(o.world.offers).toHaveLength(1);
    expect(animalAction(o.world, purseWith(0), { action: "offer", id: "a1", to: "pal" }, env(T0)).why).toBe("used");
    expect(animalAction(world([chick()]), purseWith(0), { action: "offer", id: "a1", to: "me" }, env(T0)).why).toBe("none");
    const id = o.world.offers[0].id;
    expect(animalAction(o.world, purseWith(0), { action: "take", offer: id, yes: true }, env(T0, "stranger")).why).toBe("none");
    const t = animalAction(o.world, purseWith(0), { action: "take", offer: id, yes: true }, env(T0 + H, "pal"));
    expect(t.world.animals[0]).toMatchObject({ owner: "pal", home: "pen", hearts: 120 });
    expect(t.world.offers).toEqual([]);
    expect(animalAction(o.world, purseWith(0), { action: "take", offer: id, yes: true }, env(T0 + 25 * H, "pal")).why).toBe("none");
    const no = animalAction(o.world, purseWith(0), { action: "take", offer: id, yes: false }, env(T0, "pal"));
    expect([no.world.animals[0].owner, no.world.offers]).toEqual(["me", []]);
    const unoffered = animalAction(o.world, purseWith(0), { action: "unoffer", offer: id }, env(T0));
    expect(unoffered.world.offers).toEqual([]);
    const fullPen = { ...o.world, animals: [...o.world.animals, ...Array.from({ length: ANIMALS.pen }, (_, i) => chick({ id: `p${i}`, owner: "pal", home: "pen" }))] };
    expect(animalAction(fullPen, purseWith(0), { action: "take", offer: id, yes: true }, env(T0, "pal")).why).toBe("places");
    const sold = animalAction(o.world, purseWith(0), { action: "sell", id: "a1" }, env(T0));
    expect(sold.world.offers).toEqual([]);
  });
  it("lets only the owner collect; a friend allowed may feed, pet and treat, for thirty points a day at most", () => {
    const hen = chick({ grown: adultAt("chicken"), banked: 2, hearts: 100 });
    const w0: AnimalWorld = { ...world([hen]), herds: [{ ...newHerd("me"), barn: 0, carers: ["pal"] }] };
    expect(animalAction(w0, purseWith(0, [["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 0 }, env(T0, "pal")).why).toBe("theirs");
    expect(animalAction(w0, purseWith(0, [["chickFeed", 1]]), { action: "feed", id: "a1", item: "chickFeed" }, env(T0, "stranger")).why).toBe("theirs");
    const fed = animalAction(w0, purseWith(0, [["chickFeed", 3]]), { action: "feed", id: "a1", item: "chickFeed" }, env(T0, "pal"));
    expect(fed.ok).toBe(true);
    expect(fed.notes[0]).toMatchObject({ line: "helpers", pts: 6 });
    // (a friend's care is not the owner's: the barn's untended days run on)
    expect(fed.world.herds[0].lastCare).toBe(0);
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
  it("breeds one of each sex into a child that comes out later, rests both parents, and counts misses towards a clue", () => {
    const a = chick({ id: "p1", grown: adultAt("chicken"), hearts: 100 }), b = chick({ id: "p2", sex: "m", grown: adultAt("chicken"), hearts: 100 });
    const p = purseWith(1000, [["seedCorn", 5]]);
    expect(animalAction(world([a, { ...b, sex: "f" }]), p, { action: "breed", a: "p1", b: "p2", offering: "seedCorn" }, env(T0)).why).toBe("sex");
    expect(animalAction(world([a, { ...b, home: "pen" }]), p, { action: "breed", a: "p1", b: "p2", offering: "seedCorn" }, env(T0)).why).toBe("pen");
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
  it("asks a friend for a cross: lent an hour once they say yes, for that one cross; the child is the host's", () => {
    const hen = chick({ id: "h", grown: adultAt("chicken"), hearts: 100 });
    const roo = chick({ id: "r", owner: "pal", sex: "m", grown: adultAt("chicken"), hearts: 100 });
    const w0: AnimalWorld = { ...world([hen, roo, chick({ id: "x", owner: "pal", grown: adultAt("chicken") })]), herds: [{ ...newHerd("me"), barn: 0 }, { ...newHerd("pal"), barn: 1 }] };
    const breed = { action: "breed", a: "h", b: "r", offering: null } as const;
    expect(animalAction(w0, purseWith(1000), breed, env(T0)).why).toBe("lent");
    expect(animalAction(w0, purseWith(0), { action: "ask", mine: "h", theirs: "x" }, env(T0)).why).toBe("sex");
    const asked = animalAction(w0, purseWith(0), { action: "ask", mine: "h", theirs: "r" }, env(T0));
    const q = asked.world.asks[0];
    expect(q).toMatchObject({ from: "me", to: "pal", mine: "h", theirs: "r" });
    expect(animalAction(asked.world, purseWith(0), { action: "ask", mine: "h", theirs: "r" }, env(T0)).why).toBe("used");
    expect(animalAction(asked.world, purseWith(0), { action: "answer", ask: q.id, yes: true }, env(T0)).why).toBe("none");
    const yes = animalAction(asked.world, purseWith(0), { action: "answer", ask: q.id, yes: true }, env(T0 + H / 2, "pal"));
    expect(yes.world.animals.find((a) => a.id === "r")!.lent).toEqual({ to: "me", until: T0 + H / 2 + ANIMALS.lendHours * H, with: "h" });
    expect(yes.world.asks).toEqual([]);
    const bred = animalAction(yes.world, purseWith(1000), breed, env(T0 + H));
    expect(bred.ok).toBe(true);
    expect(bred.world.animals.filter((a) => !["h", "r", "x"].includes(a.id)).map((a) => a.owner)).toEqual(["me"]);
    expect(bred.world.animals.find((a) => a.id === "r")!.lent).toBeNull();
    expect(animalAction(yes.world, purseWith(1000), breed, env(T0 + 2 * H)).why).toBe("lent");
  });
  it("passes the parents' stats on, moved up only by care that was really given", () => {
    const of = (v: number, hearts: number, streak: number) => chick({ stats: { thrift: v, gentle: v, vigor: v }, hearts, streak });
    const best = of(6, 200, 7), worst = of(6, 0, 0);
    expect(careOf(best)).toBe(1);
    expect(careOf(worst)).toBe(0);
    const rolls = (xs: number[]) => () => xs.shift() ?? 0.5;
    // (cared for: a roll under 5% a +2, under 45% a +1, never down)
    expect(childStats(best, best, rolls([0.01, 0.3, 0.99]))).toEqual({ thrift: 8, gentle: 7, vigor: 6 });
    // (neglected: up only under 5%, down over 75%)
    expect(childStats(worst, worst, rolls([0.01, 0.3, 0.99]))).toEqual({ thrift: 7, gentle: 6, vigor: 5 });
    // (an odd sum is rounded either way at random)
    expect(childStats(of(5, 200, 7), best, rolls([0.2, 0.99, 0.8, 0.99, 0.2, 0.99]))).toEqual({ thrift: 5, gentle: 6, vigor: 5 });
    expect(childRange(best, best).thrift).toEqual({ lo: 6, hi: 8 });
    expect(childRange(worst, worst).thrift).toEqual({ lo: 5, hi: 7 });
    // (over many crosses: well cared-for parents raise their line, neglected ones let it fall)
    let up = 0, down = 0, i = 0;
    const rand = () => ((i = (i * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 2000; k++) { up += childStats(best, best, rand).vigor - 6; down += childStats(worst, worst, rand).vigor - 6; }
    expect(up / 2000).toBeGreaterThan(0.4);
    expect(down / 2000).toBeLessThan(-0.15);
  });
  it("takes the cradle once a day with its gift, and spring wind readies a round once an animal", () => {
    const hen = chick({ grown: adultAt("chicken"), made: 3, food: 10 });
    const gifted = (ids: string[]) => ({ ...purseWith(0), gifts: { had: ids, charms: [], owed: 0, familiar: null, used: {} } }) as unknown as Purse;
    expect(animalAction(world([hen]), purseWith(0), { action: "cradle", id: "a1" }, env(T0)).why).toBe("gift");
    // (a full barn: the baby waits in the pen)
    const crowded = world([hen, ...[2, 3, 4].map((i) => chick({ id: `b${i}` }))]);
    expect(animalAction(crowded, gifted(["thingCradle"]), { action: "cradle", id: "a1" }, env(T0)).world.animals.at(-1)!.home).toBe("pen");
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

describe("what Codex's check of the branch found (2026-10-20)", () => {
  it("reads a pot thing by thing: a breed's own egg stays its own where a recipe asks for it", () => {
    expect(madeOf([["farmCheese" as ItemId, 1], ["cream" as ItemId, 1], ["farmEgg" as ItemId, 1], ["sugar" as ItemId, 1]])).toBe("cheesecake");
    expect(madeOf([["lanternEgg" as ItemId, 2], ["farmMilk" as ItemId, 1], ["sugar" as ItemId, 1]])).toBe("lanternCustard");
    expect(madeOf([["blueEgg" as ItemId, 1], ["duckEgg" as ItemId, 1], ["oil" as ItemId, 1]])).toBe("omelette");
    expect(potSays([["jerseyMilk" as ItemId, 2]])).toEqual({ fits: true, whole: true, wrong: [] });
  });
  it("fills a trough of three days with a packed ration", () => {
    const r = animalAction(world([chick({ food: 0 })]), purseWith(0, [["packedRation", 1]]), { action: "feed", id: "a1", item: "packedRation" }, env(T0));
    expect(r.world.animals[0].food).toBe(ANIMALS.packed);
  });
  it("refuses a collection the bag has no room for, never losing part of it", () => {
    const hen = chick({ grown: adultAt("chicken"), banked: 2, hearts: 100 });
    const full = { ...purseWith(0), bag: [{ item: "eggBasket", n: 1 }, ...Array(18).fill({ item: "log", n: 999 }), null] } as unknown as Purse;
    expect(animalAction(world([hen]), full, { action: "collect", id: "a1", cracked: 0 }, env(T0, "me", [0, 0.99])).why).toBe("room");
  });
  it("pays a wagon ride once, and only soon after the tour", () => {
    const run = { id: "w1", by: "x", from: T0, stops: ["farm", "town"], riders: [{ who: "me", on: T0, leg: 0 }, { who: "pal", on: T0, leg: 0 }] };
    const w0: AnimalWorld = { ...world([chick()]), wagons: [run] };
    const once = animalAction(w0, purseWith(0), { action: "rode", run: "w1" }, env(T0 + 4 * 60_000));
    expect(once.ok).toBe(true);
    expect(animalAction(once.world, purseWith(0), { action: "rode", run: "w1" }, env(T0 + 24 * H)).why).toBe("used");
    expect(animalAction(once.world, purseWith(0), { action: "rode", run: "w1" }, env(T0 + 4 * 60_000 + (ANIMALS.wagon.claimMins + 1) * 60_000, "pal")).why).toBe("none");
  });
  it("counts every band an outing passes through", () => {
    const out = settle(chick({ food: 24 }), T0 + 16 * H, { door: [[T0, null]] });
    expect(out.outBands).toBe((1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6));
  });
  it("counts the warm bottle from the first step after it is had, never backwards", () => {
    const withBottle = { ...purseWith(0), gifts: { had: ["thingWarmBottle"], charms: [], owed: 0, familiar: null, used: {} } } as unknown as Purse;
    const first = animalAction(world([chick({ food: 24 })]), withBottle, { action: "pet", id: "a1" }, env(T0 + 10 * H));
    expect(first.world.animals[0].grown).toBeCloseTo(10, 6);
    expect(first.world.herds[0].bottleAt).toBe(T0 + 10 * H);
    const later = animalAction(first.world, withBottle, { action: "name", id: "a1", name: "Pip" }, env(T0 + 14 * H));
    expect(later.world.animals[0].grown).toBeCloseTo(10 + 4 * 2, 6);
  });
});
