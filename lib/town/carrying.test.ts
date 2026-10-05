import { describe, expect, it } from "vitest";
import { ODD, cook } from "./cooking";
import { DITCH, ditch, reachOf, thirsty } from "./ditch";
import { FARMING, WATER, water, type Plant, type Plot } from "./farm";
import { HEAT, hotAt, warmed } from "./heat";
import { DISHES, DISH_IDS, type ItemId } from "./items";
import { staminaOf } from "./stamina";
import { hold, newPurse, put, type Purse } from "./trade";
import { ALWAYS_RAIN } from "./weather";
import { bookOf, newLog, rankOf, seen, type WaterDeed } from "./well";
import { workOf } from "./jar";
import { helpersOf } from "./thanks";
import { YARD, canPour, freshen, pourIn, takesWater } from "./yard";

/** A moment by Bangkok's clock. */
const at = (s: string) => Date.parse(`${s}+07:00`);
const MIN = 60_000, HOUR = 60 * MIN;
const MORNING = at("2026-10-06T09:00:00"), NOON = at("2026-10-06T12:00:00"), ONE = at("2026-10-06T13:10:00");
const purseWith = (...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]) };
};
const withWater = (id: ItemId, n: number, ...more: Array<[ItemId, number]>): Purse => {
  const p = purseWith([id, 1], ...more);
  return { ...p, bag: p.bag.map((s) => (s?.item === id ? { ...s, water: n } : s)) };
};
const holding = (p: Purse, id: ItemId): Purse => {
  const d = hold(p, p.bag.findIndex((s) => s?.item === id));
  if (!d.ok) throw new Error("nothing to hold");
  return d.purse;
};
const plant = (over: Partial<Plant> = {}): Plant => ({ by: "me", crop: "pumpkin", sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: MORNING + 96 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...over });
const sown = (over: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: plant(over) });
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
/** A bed of so many plants in a row from 133,5, each as told. */
const row = (n: number, over: (i: number) => Partial<Plant> = () => ({})): Record<string, Plot> => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${133 + (i % 7)},${5 + Math.floor(i / 7)}`, sown(over(i))]));

describe("a hot afternoon (the owner, 2026-10-05: one of nine things for those who carry water)", () => {
  it("is from noon to four by Bangkok's clock, under a clear sky that is known", () => {
    expect(hotAt(NOON, "clear")).toBe(true);
    expect(hotAt(at("2026-10-06T15:59:59"), "clear")).toBe(true);
    expect(hotAt(at("2026-10-06T16:00:00"), "clear")).toBe(false);
    expect(hotAt(at("2026-10-06T11:59:59"), "clear")).toBe(false);
    for (const sky of ["cloudy", "fog", "drizzle", "rain", "storm"] as const) expect(hotAt(ONE, sky)).toBe(false);
    // a sky nobody has told of is not a hot one
    expect(hotAt(ONE, null)).toBe(false);
    expect(hotAt(ONE, undefined)).toBe(false);
    expect([HEAT.from, HEAT.to, HEAT.by]).toEqual([12, 16, 1]);
  });

  it("makes a watering do as much again, whatever it was done with", () => {
    const was = sown();
    for (const can of ["can", "canCopper", "canBrass"] as ItemId[]) {
      const did = done(water("133,5", holding(withWater(can, 3), can), was, can, ONE));
      const added = did.plot.plant!.boost;
      expect(warmed(was, did.plot, ONE, "clear").plant!.boost).toBe(added * 2);
      // …and nothing more under another sky, or at another hour
      expect(warmed(was, did.plot, ONE, "cloudy")).toBe(did.plot);
      const late = done(water("133,5", holding(withWater(can, 3), can), was, can, MORNING));
      expect(warmed(was, late.plot, MORNING, "clear")).toBe(late.plot);
    }
  });

  it("adds only to a watering: the same plant, watered at this moment and not before", () => {
    const was = sown({ boost: 5 * MIN });
    // fed, cured, guarded: the plot is written and nothing was watered
    const fed: Plot = { ...was, plant: { ...was.plant!, fed: ONE } };
    expect(warmed(was, fed, ONE, "clear")).toBe(fed);
    // another plant in the plot (sown anew, with the fountain's start): not a watering
    const anew: Plot = { soil: "tilled", plant: plant({ sown: ONE, boost: 30 * MIN }) };
    expect(warmed(was, anew, ONE, "clear")).toBe(anew);
    // a plot that had no plant, or was not there at all
    expect(warmed(undefined, anew, ONE, "clear")).toBe(anew);
    expect(warmed({ soil: "tilled", plant: null }, anew, ONE, "clear")).toBe(anew);
    // watered already at this very moment (the same writing seen twice): not again
    const wet: Plot = { ...was, plant: { ...was.plant!, watered: ONE, boost: 35 * MIN } };
    expect(warmed(wet, { ...wet, plant: { ...wet.plant!, boost: 65 * MIN } }, ONE, "clear").plant!.boost).toBe(65 * MIN);
    // a watering that added nothing adds nothing more
    expect(warmed(was, { ...was, plant: { ...was.plant!, watered: ONE } }, ONE, "clear").plant!.boost).toBe(5 * MIN);
    expect(warmed(was, wet, ONE, "clear").plant!.boost).toBe(65 * MIN);
  });
});

describe("a bucket poured over a bed (the owner, 2026-10-05: \"a bed's ditch\")", () => {
  it("waters eight plants to a bucketful, the nearest first, with plain water", () => {
    const bed = row(12), me = holding(withWater("bucket", 1), "bucket");
    const did = done(ditch(me, bed, [133, 5], MORNING));
    expect(did.used).toBe(1);
    expect(did.watered).toHaveLength(DITCH.plants);
    // the nearest to where I stand: my own plot, then its neighbours (the one further up the map first, then further left)
    expect(did.watered.slice(0, 4)).toEqual(["133,5", "134,5", "133,6", "134,6"]);
    for (const key of did.watered) expect(did.plots[key].plant).toMatchObject({ watered: MORNING, boost: FARMING.water.adds * MIN });
    expect(Object.keys(did.plots).sort()).toEqual([...did.watered].sort());
    // the bucket is empty, and it cost what a bucketful costs
    expect(did.purse.bag.find((s) => s?.item === "bucket")).toEqual({ item: "bucket", n: 1 });
    expect(staminaOf(did.purse, MORNING)).toBe(100 - DITCH.cost);
    expect([DITCH.plants, DITCH.cost]).toEqual([8, 3]);
  });

  it("is plain water whatever is held besides, and a yoke pours what the bed has plants for", () => {
    const bed = row(12), me = holding(withWater("waterYokeGreat", WATER.buckets.waterYokeGreat!), "waterYokeGreat");
    const did = done(ditch(me, bed, [136, 5], MORNING));
    // twelve plants: two bucketfuls, and two stay in the yoke
    expect([did.used, did.watered.length]).toEqual([2, 12]);
    expect(did.purse.bag.find((s) => s?.item === "waterYokeGreat")).toEqual({ item: "waterYokeGreat", n: 1, water: 2 });
    expect(staminaOf(did.purse, MORNING)).toBe(100 - 2 * DITCH.cost);
    // one bucketful short of the bed: the nearest eight, and no more
    const one = done(ditch(holding(withWater("bucket", 1), "bucket"), bed, [136, 5], MORNING));
    expect(one.watered).toHaveLength(8);
    expect(one.watered).toEqual(reachOf(holding(withWater("bucket", 1), "bucket"), bed, [136, 5], MORNING));
    // a bucketful that finds three thirsty plants is poured out all the same
    const few = done(ditch(holding(withWater("bucketIron", 2), "bucketIron"), row(3), [133, 5], MORNING));
    expect([few.used, few.watered.length]).toEqual([1, 3]);
    expect(few.purse.bag.find((s) => s?.item === "bucketIron")).toEqual({ item: "bucketIron", n: 1, water: 1 });
  });

  it("waters only what a can would: nothing wet, dead, done, or ripe for good", () => {
    const bed: Record<string, Plot> = {
      "133,5": sown(),
      // watered half an hour ago
      "134,5": sown({ watered: MORNING - 30 * MIN }),
      // ripe, and it bears once: it only waits to be picked
      "135,5": sown({ crop: "cabbage", sown: MORNING - 400 * HOUR }),
      // bare ground, tilled
      "136,5": { soil: "tilled", plant: null },
      "137,5": sown({ by: "somebody" }),
    };
    expect(Object.keys(bed).filter((k) => thirsty(k, bed[k], MORNING))).toEqual(["133,5", "137,5"]);
    const did = done(ditch(holding(withWater("bucket", 1), "bucket"), bed, [135, 5], MORNING));
    // (133 and 137 are as far from 135: the one further left first)
    expect(did.watered).toEqual(["133,5", "137,5"]);
    // while it rains every plant is wet, and nothing is poured
    expect(ditch(holding(withWater("bucket", 1), "bucket"), bed, [135, 5], MORNING, ALWAYS_RAIN)).toEqual({ ok: false, why: "wet" });
    expect(reachOf(holding(withWater("bucket", 1), "bucket"), bed, [135, 5], MORNING, ALWAYS_RAIN)).toEqual([]);
  });

  it("is refused with nothing to pour, and with nothing to pour it on", () => {
    const bed = row(4);
    // a can is no bucket; a bucket with no water; a bucket in the bag and not in the hand
    expect(ditch(holding(withWater("can", 5), "can"), bed, [133, 5], MORNING)).toEqual({ ok: false, why: "hand" });
    expect(ditch(holding(purseWith(["bucket", 1]), "bucket"), bed, [133, 5], MORNING)).toEqual({ ok: false, why: "hand" });
    expect(ditch(withWater("bucket", 1), bed, [133, 5], MORNING)).toEqual({ ok: false, why: "hand" });
    expect(reachOf(withWater("bucket", 1), bed, [133, 5], MORNING)).toEqual([]);
    const me = holding(withWater("bucket", 1), "bucket");
    // every plant watered already: `wet`; no plant at all: `soil`
    expect(ditch(me, row(4, () => ({ watered: MORNING - MIN })), [133, 5], MORNING)).toEqual({ ok: false, why: "wet" });
    expect(ditch(me, { "133,5": { soil: "tilled", plant: null } }, [133, 5], MORNING)).toEqual({ ok: false, why: "soil" });
    expect(ditch(me, {}, [133, 5], MORNING)).toEqual({ ok: false, why: "soil" });
  });

  it("with no stamina left is done all the same, and takes none", () => {
    const me = { ...holding(withWater("bucket", 1), "bucket"), stamina: { day: -1, left: 0 } };
    const tired: Purse = { ...me, stamina: { day: Math.floor((MORNING + 7 * HOUR - 5 * HOUR) / (24 * HOUR)), left: 0 } };
    const did = done(ditch(tired, row(8), [133, 5], MORNING));
    expect(did.watered).toHaveLength(8);
    expect(staminaOf(did.purse, MORNING)).toBe(0);
  });

  it("is written in the well's book as the pourer's own water on every plant it reached", () => {
    const deeds: WaterDeed[] = [
      { by: "ann", at: MORNING, what: "ditch", n: 1, plants: 3, can: "bucket" },
      { by: "ann", at: MORNING, what: "water", can: "bucket", tile: [133, 5], whose: "di" },
      { by: "ann", at: MORNING, what: "water", can: "bucket", tile: [134, 5], whose: "di" },
      // …and one of her own plants in the same bed: nobody is helped by that
      { by: "ann", at: MORNING, what: "water", can: "bucket", tile: [135, 5] },
    ];
    const log = deeds.reduce(seen, newLog()), book = bookOf(log, "ann", MORNING + MIN, (id) => id);
    // a bucketful carried: towards her rank, and among the day's carriers; her water on two of Di's plants, by her own hand
    expect(log.carriers.ann.buckets).toBe(1);
    expect(book.today).toEqual({ buckets: 1, waterings: 2, plants: 2, people: 1, watered: 2, helped: 1 });
    expect(book.carriers).toEqual([{ id: "ann", name: "ann", buckets: 1, rank: 0 }]);
    // the bucket is followed for the plants it reached, and no further
    expect(log.cans["ann/bucket"]).toEqual({ by: "ann", left: 0 });
    // nothing went into the well, and none of its water is hers
    expect(log.water).toEqual([]);
    // Di has Ann to thank for both plots; the jar counts two waterings, not a bucketful besides
    expect(helpersOf(log, "133,5", "di").map((h) => h.id)).toEqual(["ann"]);
    expect(helpersOf(log, "134,5", "di").map((h) => h.id)).toEqual(["ann"]);
    expect(Object.values(log.work)).toEqual([{ ann: { buckets: 0, waterings: 2 } }]);
    expect(workOf(log, Number(Object.keys(log.work)[0]), Number(Object.keys(log.work)[0]) + 1)).toEqual([["ann", 2]]);
    // six hundred bucketfuls poured over beds make a keeper of the well as surely as six hundred into it
    expect(rankOf(seen(newLog(), { by: "ann", at: MORNING, what: "ditch", n: 600, plants: 0, can: "bucket" }).carriers.ann.buckets)).toBe(3);
    // a line with no bucket, or of no bucketful, is nothing
    expect(seen(newLog(), { by: "ann", at: MORNING, what: "ditch", n: 1, plants: 3 })).toEqual(newLog());
    expect(seen(newLog(), { by: "ann", at: MORNING, what: "ditch", n: 0, plants: 3, can: "bucket" })).toEqual(newLog());
  });
});

describe("the water jar in the cooking yard (the owner, 2026-10-05: \"a pot with fresh water gives a helping more\")", () => {
  it("is poured into from a bucket, as much as it has room for", () => {
    const me = holding(withWater("waterYokeGreat", 4), "waterYokeGreat");
    expect(canPour(me, 0)).toBe(true);
    const did = done(pourIn(me, 0, MORNING));
    expect([did.jar, did.poured]).toEqual([4, 4]);
    expect(did.purse.bag.find((s) => s?.item === "waterYokeGreat")).toEqual({ item: "waterYokeGreat", n: 1 });
    expect(staminaOf(did.purse, MORNING)).toBe(100 - YARD.cost);
    // nearly full: what there is room for goes in, and the rest stays in the bucket
    const nearly = done(pourIn(me, YARD.holds - 1, MORNING));
    expect([nearly.jar, nearly.poured]).toEqual([YARD.holds, 1]);
    expect(nearly.purse.bag.find((s) => s?.item === "waterYokeGreat")).toEqual({ item: "waterYokeGreat", n: 1, water: 3 });
    // full, an empty bucket, a can, a bucket not in the hand: nothing to do
    expect(canPour(me, YARD.holds)).toBe(false);
    expect(pourIn(me, YARD.holds, MORNING)).toEqual({ ok: false, why: "none" });
    expect(canPour(holding(purseWith(["bucket", 1]), "bucket"), 0)).toBe(false);
    expect(canPour(holding(withWater("can", 5), "can"), 0)).toBe(false);
    expect(canPour(withWater("bucket", 1), 0)).toBe(false);
    expect([YARD.holds, YARD.gives, YARD.cost]).toEqual([10, 1, 1]);
  });

  it("gives a pot cooked while it has water a helping more, and is a bucketful the less", () => {
    const cookPurse = holding(purseWith(["pot", 1], ["pumpkin", 2], ["scallion", 5], ["salt", 5], ["rice", 5], ["chili", 5]), "pot");
    // (a soup one cook makes in a plain pot)
    const some: ItemId = "pumpkinSoup";
    expect(DISHES.pumpkinSoup.recipe).toMatchObject({ in: ["pot"], cooks: 1 });
    const did = done(cook(cookPurse, DISHES.pumpkinSoup.recipe!.needs, ["pot"], 0, MORNING));
    expect(did.made).toBe(some);
    const fresh = freshen(did.purse, did.made, 3);
    expect([fresh.fresh, fresh.jar]).toEqual([true, 2]);
    expect(fresh.purse.bag.find((s) => s?.item === "potFull")!.of).toEqual({ dish: some, left: did.n + YARD.gives });
    expect(did.n).toBe(DISHES.pumpkinSoup.recipe!.serves);
    // an empty jar: everything is as it was cooked
    expect(freshen(did.purse, did.made, 0)).toEqual({ purse: did.purse, jar: 0, fresh: false });
    // the odd dish takes none
    const odd = done(cook(cookPurse, [["rice", 1], ["chili", 1]], ["pot"], 0, MORNING));
    expect(odd.made).toBe(ODD);
    expect(freshen(odd.purse, odd.made, 3)).toEqual({ purse: odd.purse, jar: 3, fresh: false });
    // nothing made, and something made that is no dish: none either
    expect(freshen(cookPurse, null, 3).fresh).toBe(false);
    expect(freshen(cookPurse, "fishSauce", 3).fresh).toBe(false);
    // of two pots of the same dish in the bag, the first has the helping
    const two = { ...did.purse, bag: did.purse.bag.map((s, i) => (i === did.purse.bag.findIndex((x) => !x) ? { item: "potFull" as ItemId, n: 1, of: { dish: "pumpkinSoup" as const, left: 9 } } : s)) };
    const pots = freshen(two, some, 1).purse.bag.filter((s) => s?.item === "potFull").map((s) => s!.of!.left);
    expect(pots.reduce((a, b) => a + b, 0)).toBe(did.n + 9 + YARD.gives);
  });

  it("takes no part in what is roasted on a skewer", () => {
    const roasted = DISH_IDS.filter((id) => DISHES[id].recipe?.in.includes("skewer"));
    expect(roasted.length).toBeGreaterThan(0);
    for (const id of roasted) expect(takesWater(id)).toBe(false);
    expect(takesWater(ODD)).toBe(false);
    expect(takesWater(null)).toBe(false);
    // every other dish that is somebody's recipe does
    for (const id of DISH_IDS) if (DISHES[id].recipe && !roasted.includes(id) && id !== ODD) expect(takesWater(id)).toBe(true);
  });

  it("is written in the well's book: whose water a pot was cooked with", () => {
    const deeds: WaterDeed[] = [
      { by: "ann", at: MORNING, what: "yard", n: 2 },
      { by: "bo", at: MORNING + MIN, what: "yard", n: 1 },
      // three pots: Ann's two bucketfuls go first, then Bo's; Ann's own pot is nobody's doing
      { by: "cy", at: MORNING + 2 * MIN, what: "fresh" },
      { by: "ann", at: MORNING + 3 * MIN, what: "fresh" },
      { by: "cy", at: MORNING + 4 * MIN, what: "fresh" },
      // …and one with the jar's water all followed: nothing to say of it
      { by: "di", at: MORNING + 5 * MIN, what: "fresh" },
    ];
    const log = deeds.reduce(seen, newLog());
    expect(log.yard).toEqual([]);
    const ann = bookOf(log, "ann", MORNING + HOUR, (id) => id), bo = bookOf(log, "bo", MORNING + HOUR, (id) => id);
    expect(ann.today).toEqual({ buckets: 2, waterings: 0, plants: 0, people: 0, watered: 0, helped: 0, pots: 1, cooks: 1 });
    expect(bo.today).toEqual({ buckets: 1, waterings: 0, plants: 0, people: 0, watered: 0, helped: 0, pots: 1, cooks: 1 });
    // carried for the others: among the day's carriers, towards the rank, and work at the jar by the well (a bucketful each)
    expect(ann.carriers.map((c) => [c.id, c.buckets])).toEqual([["ann", 2], ["bo", 1]]);
    expect(log.carriers.ann.buckets).toBe(2);
    expect(Object.values(log.work)).toEqual([{ ann: { buckets: 2, waterings: 0 }, bo: { buckets: 1, waterings: 0 } }]);
    // a cook who carried nothing is told of no pots
    expect(bookOf(log, "cy", MORNING + HOUR, (id) => id).today).toEqual({ buckets: 0, waterings: 0, plants: 0, people: 0, watered: 0, helped: 0 });
    // the next day begins with none
    expect(bookOf(log, "ann", MORNING + 24 * HOUR, (id) => id).today.pots).toBeUndefined();
  });
});
