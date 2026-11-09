import { describe, expect, it } from "vitest";
import { BODY, BREEDS, SPECIES, SPECIES_IDS, adultAt, bodyOf, breedOf, careScore, dayOf, dayStart, newHerd, rangeOf, settle, sizeGrade, unitsOf, type Animal } from "./animals";
import { animalAction, specialsFoundOf, type AnimalWorld, type Env } from "./animal-act";
import { ANIMAL_GRADED } from "./animal-items";
import { ITEMS, type ItemId } from "./items";
import { hashStr, patchKind, stretchOf } from "./roam";
import { SPECIAL, SPECIALS, chanceOf, habitMet, knowsHabit, outTogether, placesOf, specialOf, stripOf, withStrip, type Strip } from "./specials";
import { put, held, gradeIn, gradePays, newPurse, type Purse } from "./trade";
import { animalIcon } from "./animal-icons";
import atlas from "./icon-atlas.json";
import { counted, factorOf, factsOf, pricesTold } from "./market";
import { priceAs } from "./specials";

const H = 3_600_000;
const T0 = dayStart(20_380) + 2 * H; // 07:00 Bangkok
const hen = (over: Partial<Animal> = {}): Animal => ({
  id: "a1", owner: "me", species: "chicken", breed: "silkie", name: "", born: T0 - 10 * 24 * H, bought: false, home: "barn",
  sex: "f", stats: { thrift: 1, gentle: 1, vigor: 1 }, streak: 0, at: T0, food: 20, grown: adultAt("chicken"), made: 0, banked: 2, hearts: 200, today: { day: dayOf(T0) }, speedUntil: 0, windUntil: 0,
  narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, ...over,
});
const world = (animals: Animal[], door: Array<readonly [number, number | null]> = []): AnimalWorld => ({ animals, herds: [{ ...newHerd("me"), barn: 0, door }], found: {}, spells: [], wagons: [], offers: [], asks: [], specials: {} });
let n = 0;
const env = (now: number, me = "me", roll?: number, sky?: Env["sky"]): Env => ({ me, now, rand: () => 0.5, newId: () => `n${++n}`, spot: () => [200, 40], ...(roll === undefined ? {} : { specialRoll: () => roll }), ...(sky ? { sky } : {}) });
const purseWith = (things: Array<[string, number]>): Purse => {
  let p: Purse = newPurse();
  for (const [id, k] of things) p = { ...p, bag: put(p.bag, id as ItemId, k) };
  return p;
};
const STRIP: Omit<Strip, "at" | "special" | "n"> = { bands: 0, places: ["barn"], ate: [], rain: false, wind: false, company: false, heart: false };

describe("the specials, one a bred breed", () => {
  it("are 28, one for each breed B to H and none for a starter", () => {
    expect(SPECIALS.length).toBe(28);
    for (const b of BREEDS) expect(!!specialOf(b.id)).toBe(b.letter !== "A");
  });
  it("are things of the bag of their produce's tier, fetching what its unit would, of a grade, with a picture of their own", () => {
    for (const x of SPECIALS) {
      const produce = breedOf(x.breed)!.produce;
      expect(ITEMS[x.id as ItemId]).toBeTruthy();
      expect([ITEMS[x.id as ItemId].pays, ITEMS[x.id as ItemId].tier]).toEqual([ITEMS[produce].pays, ITEMS[produce].tier]);
      expect(ANIMAL_GRADED.includes(x.id)).toBe(true);
      for (const g of [0, 1, 2, 3] as const) expect(gradePays(x.id as ItemId, g)).toBe(gradePays(produce, g));
      expect(animalIcon(x.id) in (atlas.icons as Record<string, unknown>)).toBe(true);
    }
    for (const k of ["habitTime", "habitPlace", "habitFood", "habitWeather", "habitCompany", "habitHeart"]) expect(k in (atlas.icons as Record<string, unknown>)).toBe(true);
  });
  it("have habits a round can meet: a food its kind eats, a band of the eight, a place there is", () => {
    for (const x of SPECIALS) {
      if (x.habit.kind === "food") expect(SPECIES[x.species].feeds[x.habit.item as ItemId]).toBeGreaterThan(0);
      if (x.habit.kind === "time") expect(x.habit.band >= 0 && x.habit.band < 8).toBe(true);
      // (a pond only a duck goes to)
      if (x.habit.kind === "place" && x.habit.place === "pond") expect(x.species).toBe("duck");
    }
    // (the strawberry cow: mist vetch of 03-05, the doc's dew clover being no cow's food)
    expect(specialOf("strawberryCow")!.habit).toEqual({ kind: "food", item: "mistVetch" });
  });
});

describe("care", () => {
  it("scores the body's size 0 / 2 / 3 / 5 and the days fed through, five at most, ten in all", () => {
    for (const sp of SPECIES_IDS) {
      expect([0, 39, 40, 69, 70, 94, 95, 100].map((v) => sizeGrade(sp, bodyOf(sp, v)))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
      expect(sizeGrade(sp, undefined)).toBe(0);
      expect(BODY.steps[sp].length).toBe(4);
    }
    expect(careScore({ species: "cow", body: bodyOf("cow", 100), streak: 14 })).toBe(10);
    expect(careScore({ species: "cow", body: bodyOf("cow", 80), streak: 2 })).toBe(5);
    expect(careScore({ species: "cow", streak: 3 })).toBe(3);
    expect(careScore({})).toBe(0);
  });
  it("lifts the floor with the graded feed, the two 25 at most, the feed alone 20 as before", () => {
    const top = { species: "cow" as const, hearts: 200, body: bodyOf("cow", 100), streak: 9 };
    expect(rangeOf({ ...top, narrow: 15 })).toEqual({ floor: 95, ceiling: 100 });
    expect(rangeOf({ ...top, narrow: 20 })).toEqual({ floor: 95, ceiling: 100 });
    expect(rangeOf({ hearts: 200, narrow: 99 })).toEqual({ floor: 90, ceiling: 100 });
    expect(rangeOf({ hearts: 0, narrow: 0, species: "cow", streak: 5 })).toEqual({ floor: 5, ceiling: 30 });
  });
  it("comes to the doc's table of excellent units at ten hearts (19 / 38, 23 / 55, 29 / 100 %)", () => {
    const share = (care: number, narrow: number) => { const r = rangeOf({ hearts: 200, narrow, species: "chicken", streak: care }); return Math.round((100 * (r.ceiling - Math.max(95, r.floor) + 1)) / (r.ceiling - r.floor + 1)); };
    expect([share(0, 0), share(0, 15), share(5, 0), share(5, 15)]).toEqual([19, 38, 23, 55]);
    const ten = (narrow: number) => { const r = rangeOf({ hearts: 200, narrow, species: "chicken", body: bodyOf("chicken", 100), streak: 5 }); return Math.round((100 * (r.ceiling - Math.max(95, r.floor) + 1)) / (r.ceiling - r.floor + 1)); };
    expect([ten(0), ten(15)]).toEqual([29, 100]);
  });
});

describe("a round's chance", () => {
  const full = { body: 3, streak: 5, gold: false };
  it("is a day's share by the cycle at full care: a hen 5 / 7 / 10 %, a duck 6.7 / 9.3 / 13.3, a cow 10 / 14 / 20, a sheep 20 / 28 / 40", () => {
    const at = (breed: string) => chanceOf({ ...full, breed, species: breedOf(breed)!.species, body: bodyOf(breedOf(breed)!.species, 100) }, false);
    expect([at("silkie"), at("lanternHen"), at("pocketPhoenix")].map((x) => +x.toFixed(4))).toEqual([0.05, 0.07, 0.1]);
    expect([at("runner"), at("raindropDuck"), at("littleLeviathan")].map((x) => +x.toFixed(4))).toEqual([0.0667, 0.0933, 0.1333]);
    expect([at("jersey"), at("strawberryCow"), at("milkyWayCow")].map((x) => +x.toFixed(4))).toEqual([0.1, 0.14, 0.2]);
    expect([at("shetland"), at("dandelionLamb"), at("goldenFleece")].map((x) => +x.toFixed(4))).toEqual([0.2, 0.28, 0.4]);
    // (the same a day for every species)
    for (const tier of ["silkie", "runner", "jersey", "shetland"]) expect(+(at(tier) * (24 / SPECIES[breedOf(tier)!.species].cycle)).toFixed(4)).toBe(0.2);
  });
  it("halves with no care, doubles on its habit, is half as much again for a gold coat, and never passes a half", () => {
    const base = { breed: "jersey", species: "cow" as const };
    expect(chanceOf({ ...base, streak: 0 }, false)).toBeCloseTo(0.05, 10);
    expect(chanceOf({ ...base, body: bodyOf("cow", 100), streak: 5 }, true)).toBeCloseTo(0.2, 10);
    expect(chanceOf({ ...base, body: bodyOf("cow", 100), streak: 5, gold: true }, true)).toBeCloseTo(0.3, 10);
    expect(chanceOf({ breed: "goldenFleece", species: "sheep", body: bodyOf("sheep", 100), streak: 5, gold: true }, true)).toBe(SPECIAL.cap);
    expect(chanceOf({ breed: "barnHen", species: "chicken", streak: 5 }, true)).toBe(0);
  });
});

describe("a round's strip and its habit", () => {
  it("meets each kind of habit", () => {
    const s = (o: Partial<Strip>) => ({ ...STRIP, ...o });
    expect(habitMet({ kind: "time", band: 1 }, s({ bands: 2 }))).toBe(true);
    expect(habitMet({ kind: "time", band: 1 }, s({ bands: 4 }))).toBe(false);
    expect(habitMet({ kind: "place", place: "pond" }, s({ places: ["garden", "pond"] }))).toBe(true);
    expect(habitMet({ kind: "place", place: "barn" }, s({}))).toBe(true);
    expect(habitMet({ kind: "food", item: "meadowOats" }, s({ ate: ["corn", "meadowOats"] }))).toBe(true);
    expect(habitMet({ kind: "weather", sky: "wind" }, s({ rain: true }))).toBe(false);
    expect(habitMet({ kind: "weather", sky: "rain" }, s({ rain: true }))).toBe(true);
    expect(habitMet({ kind: "company" }, s({ company: true }))).toBe(true);
    expect(habitMet({ kind: "heart" }, s({ heart: false }))).toBe(false);
  });
  it("says where it went: its door's stretches by the kind each was, the night's past the first left out, never out the barn", () => {
    const a = { id: "duck-7", species: "duck" as const };
    expect(placesOf(a, [], T0 - 5 * H, T0, 0)).toEqual(["barn"]);
    const seed = hashStr(a.id), { period } = stretchOf(seed);
    const door: Array<[number, number]> = [[T0 - 3 * H, T0 - H]];
    const kinds = new Set<string>();
    for (let k = period(T0 - 3 * H); k <= period(T0 - H - 1); k++) kinds.add(patchKind(seed, "duck", k));
    expect(new Set(placesOf(a, door, T0 - 5 * H, T0, 4))).toEqual(kinds);
    // (out from 20:00 to 04:00 Bangkok: only the first stretch counts, where it lay down)
    const night0 = dayStart(20_380) - 9 * H + 60_000, night = placesOf(a, [[night0, night0 + 8 * H]], night0 - H, night0 + 9 * H, 128);
    expect(night).toEqual([patchKind(seed, "duck", period(night0))]);
  });
  it("finds company in another member's animal of its kind out at once, of any age, and not at another time", () => {
    const mine = hen({ outBands: 4 }), theirs = hen({ id: "b1", owner: "pal" });
    const herds = [{ ...newHerd("pal"), barn: 1, door: [[T0 - 2 * H, T0 - H] as const] }];
    expect(outTogether(mine, [[T0 - 3 * H, T0 - 1.5 * H]], T0 - 5 * H, T0, herds, [theirs], T0)).toBe(true);
    // (a chick whose kept growth is short of grown, though it may have grown since: company all the same; Codex)
    expect(outTogether(mine, [[T0 - 3 * H, T0 - 1.5 * H]], T0 - 5 * H, T0, herds, [{ ...theirs, grown: 47, born: T0 - 30 * H }], T0)).toBe(true);
    expect(outTogether(mine, [[T0 - 3 * H, T0 - 1.5 * H]], T0 - 5 * H, T0, herds, [{ ...theirs, born: T0 + H }], T0)).toBe(false);
    expect(outTogether(mine, [[T0 - 4 * H, T0 - 3 * H]], T0 - 5 * H, T0, herds, [theirs], T0)).toBe(false);
    expect(outTogether(mine, [[T0 - 3 * H, T0 - 1.5 * H]], T0 - 5 * H, T0, herds, [{ ...theirs, species: "duck" }], T0)).toBe(false);
  });
  it("keeps the last three strips", () => {
    let s: Strip[] = [];
    for (let i = 0; i < 5; i++) s = withStrip(s, { ...STRIP, at: i, special: null, n: 0 });
    expect(s.map((x) => x.at)).toEqual([2, 3, 4]);
  });
  it("knows the habit after three finds", () => {
    expect(knowsHabit({ silkie: 2 }, "silkie")).toBe(false);
    expect(knowsHabit({ silkie: 3 }, "silkie")).toBe(true);
  });
});

describe("a collection", () => {
  it("turns a unit of each round into the special, of its grade, never more units; the strip, the book and the first finder", () => {
    const a = hen({ body: 3, streak: 6, today: { day: dayOf(T0), pet: true, treat: true } });
    const r = animalAction(world([a]), purseWith([["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 0 }, env(T0, "me", 0));
    expect(r.ok).toBe(true);
    expect(r.got?.special).toEqual({ item: "silkieTwinEgg", n: 2, grades: expect.any(Array) });
    expect(r.got?.n).toBe(0);
    expect(held(r.purse.bag, "silkieTwinEgg" as ItemId) + held(r.purse.bag, "silkieEgg" as ItemId)).toBe(2);
    expect(r.got!.special!.grades.every((q) => q >= 80)).toBe(true);
    expect(r.purse.bag.filter((s) => s?.item === "silkieTwinEgg").every((s) => gradeIn(s) >= 2)).toBe(true);
    expect(specialsFoundOf(r.purse)).toEqual({ silkie: 1 });
    expect(r.world.specials?.silkie?.by).toBe("me");
    expect(r.got?.firstSpecial).toBe(true);
    const b = r.world.animals.find((x) => x.id === "a1")!;
    expect(b.strips?.length).toBe(1);
    expect(b.strips?.[0]).toMatchObject({ special: "silkieTwinEgg", n: 2, heart: true, places: ["barn"] });
    expect(b.round).toEqual({ since: T0 });
    // a second finder is not the first
    const r2 = animalAction({ ...r.world, animals: [hen({ id: "c1", owner: "pal" })], herds: [...r.world.herds, { ...newHerd("pal"), barn: 1 }] }, purseWith([["eggBasket", 1]]), { action: "collect", id: "c1", cracked: 0 }, env(T0, "pal", 0));
    expect([r2.ok, r2.got?.firstSpecial, r2.world.specials?.silkie?.by]).toEqual([true, false, "me"]);
  });
  it("brings none by chance's other side, none for a starter, and none for eggs laid out on the meadow", () => {
    expect(animalAction(world([hen()]), purseWith([["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 0 }, env(T0, "me", 0.99)).got?.special).toBeNull();
    const starter = animalAction(world([hen({ breed: "barnHen" })]), purseWith([["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 0 }, env(T0, "me", 0));
    expect([starter.got?.special ?? null, starter.got?.strip ?? null, starter.got?.n]).toEqual([null, null, 2]);
    // (a hen out: of four rounds one is laid outside (rand 0.5), and the three collected roll, each a unit)
    const out = animalAction(world([hen({ banked: 4, outBands: 4 })], [[T0 - 3 * H, T0 - H]]), purseWith([["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 0 }, env(T0, "me", 0));
    expect([out.got?.special?.n, out.got?.n]).toEqual([3, 0]);
  });
  it("is refused for room as its produce would be, whatever is rolled, and keeps its rounds (no retry until a special comes; Codex)", () => {
    // (every slot full but two stacks of the special, of the two grades its care gives (80 to 100), with room in them: the produce has none)
    let p = purseWith([["eggBasket", 1]]);
    const odd = [{ item: "silkieTwinEgg" as ItemId, n: 1, grade: 2 as const }, { item: "silkieTwinEgg" as ItemId, n: 1, grade: 3 as const }];
    p = { ...p, bag: p.bag.map((x) => x ?? odd.shift() ?? { item: "corn" as ItemId, n: ITEMS.corn.stack }) };
    const a = hen({ body: 3, streak: 6, today: { day: dayOf(T0), pet: true, treat: true } });
    for (const roll of [0, 0.99]) {
      const r = animalAction(world([a]), p, { action: "collect", id: "a1", cracked: 0 }, env(T0, "me", roll));
      expect([r.ok, r.why]).toEqual([false, "room"]);
    }
    // (and with a slot free it goes in, all specials at a roll of 0)
    const free = { ...p, bag: p.bag.map((x, i) => (i === p.bag.length - 1 ? null : x)) };
    expect(animalAction(world([a]), free, { action: "collect", id: "a1", cracked: 0 }, env(T0, "me", 0)).got?.special?.n).toBe(2);
  });
  it("gives eggs fewer on a miss, never none", () => {
    expect(unitsOf("eggs", 2, null, 2).units).toBe(1);
    const r = animalAction(world([hen({ breed: "barnHen", banked: 1 })]), purseWith([["eggBasket", 1]]), { action: "collect", id: "a1", cracked: 5 }, env(T0));
    expect(r.got?.n).toBe(1);
  });
  it("reads the round's rain and wind from the sky", () => {
    const a = hen({ breed: "cayuga", species: "duck", round: { since: T0 - 4 * H } });
    const s = stripOf(a, T0, [], (from, to) => ({ rain: from <= T0 - 2 * H && to >= T0 - 2 * H, wind: false }), [], []);
    expect([s.rain, s.wind]).toEqual([true, false]);
  });
});

describe("the round's notes", () => {
  it("keep what a friend fed and that it was a friend, and a heart full today", () => {
    const w = { ...world([hen({ owner: "pal", round: { since: T0 - H } })]), herds: [{ ...newHerd("pal"), barn: 0, care: "anybody" as const }] };
    const fed = animalAction(w, purseWith([["corn", 3]]), { action: "feed", id: "a1", item: "corn" }, env(T0));
    expect(fed.ok).toBe(true);
    expect(fed.world.animals[0].round).toEqual({ since: T0 - H, ate: ["corn"], friend: true });
    const mine = world([hen({ hearts: 200, today: { day: dayOf(T0), pet: true } })]);
    const treat = animalAction(mine, purseWith([["cricket", 1]]), { action: "treat", id: "a1", item: "cricket" }, env(T0));
    expect(treat.world.animals[0].round?.heart).toBe(true);
  });
  it("keep a heart that came full in a day that closed before the collection (Codex)", () => {
    // (04:00: 198 points, a pet and a treat; out at 04:10 it comes to 200; the day closes at 05:00 and its pet and treat with it)
    const end = dayStart(dayOf(T0) + 1), at = end - H;
    const a = hen({ at, hearts: 198, body: 3, today: { day: dayOf(at), pet: true, treat: true } });
    const s = settle(a, end + H, { door: [[at + 10 * 60_000, null]] });
    expect([s.hearts, s.today.pet ?? false, s.round?.heart]).toEqual([200, false, true]);
    // (no treat that day: not full, though the day's food lifts it to 200)
    const s2 = settle({ ...a, today: { day: dayOf(at), pet: true } }, end + H, { door: [[at + 10 * 60_000, null]] });
    expect([s2.hearts, s2.round?.heart]).toEqual([200, undefined]);
  });
});

describe("at the uncle's", () => {
  it("prices a special at its produce's price of the round and counts it among its produce's sales", () => {
    const market = { round: 9, at: { silkieEgg: { f: 80, m: 1 } }, sold: {} };
    expect(priceAs("silkieTwinEgg")).toBe("silkieEgg");
    expect(priceAs("farmEgg")).toBe("farmEgg");
    expect(factorOf(market, "silkieTwinEgg")).toBe(80);
    expect(counted(market, "silkieTwinEgg", 3).sold).toEqual({ silkieEgg: 3 });
    const told = pricesTold(market, [], ["silkieTwinEgg"], factsOf());
    expect(told.things.silkieTwinEgg?.f).toBe(80);
  });
});
