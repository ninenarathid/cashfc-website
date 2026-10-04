import { describe, expect, it } from "vitest";
import {
  BEDS, FARMING, WATER, WILD, chore, choreFor, cropOf, cure, deedFor, feed, grown, hitsFor, hoe, isTree, ownerOf, pestAt, pick, see, sow, tend, toolOf, water, waterIn, yieldOf,
  type Bed, type Plant, type Plot,
} from "./farm";
import atlas from "./icon-atlas.json";
import { CROPS, CROP_IDS, FISH, ITEMS, STAGES, growIconOf, type ItemId } from "./items";
import { staminaOf } from "./stamina";
import { GOODS, held, hold, newPurse, put, type Purse } from "./trade";
import { ALWAYS_RAIN, SLOT_MS, rainsOf, slotOf, type Rain } from "./weather";
import { BEDS_IN_FARM, FARM, WELL, atWell, bedCorner, bedOf, plotAt, walkable } from "./world";

/** A moment by Bangkok's clock. */
const at = (s: string) => Date.parse(`${s}+07:00`);
const HOUR = 3_600_000, NIGHT = at("2026-10-03T20:00:00");
const purseWith = (...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]) };
};
/** A purse with a thing in it that has water in it (a can, a bucket), and whatever else. */
const withWater = (id: ItemId, n: number, ...more: Array<[ItemId, number]>): Purse => {
  const p = purseWith([id, 1], ...more);
  return { ...p, bag: p.bag.map((s) => (s?.item === id ? { ...s, water: n } : s)) };
};
/** That purse, with a thing of it taken up in the hand. */
const holding = (p: Purse, id: ItemId): Purse => {
  const d = hold(p, p.bag.findIndex((s) => s?.item === id));
  if (!d.ok) throw new Error("nothing to hold");
  return d.purse;
};
const plant = (over: Partial<Plant> = {}): Plant => ({ by: "me", crop: "kangkong", sown: NIGHT, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...over });
const sown = (over: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: plant(over) });
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };

describe("a plot", () => {
  it("is cleared of weeds and then tilled, with a hoe in the hand", () => {
    const me = purseWith(["hoe", 1]);
    const cleared = done(hoe("1,1", me, WILD, "hoe", NIGHT));
    expect(cleared.plot).toEqual({ soil: "cleared", plant: null });
    expect(staminaOf(cleared.purse, NIGHT)).toBe(100 - FARMING.costs.clear);
    const tilled = done(hoe("1,1", cleared.purse, cleared.plot, "hoe", NIGHT));
    expect(tilled.plot.soil).toBe("tilled");
    // tilled soil needs no more hoeing; and nothing is done without the hoe, or with one that is not in the bag
    expect(hoe("1,1", me, tilled.plot, "hoe", NIGHT)).toEqual({ ok: false, why: "soil" });
    expect(hoe("1,1", me, WILD, "can", NIGHT)).toEqual({ ok: false, why: "hand" });
    expect(hoe("1,1", me, WILD, null, NIGHT)).toEqual({ ok: false, why: "hand" });
    expect(hoe("1,1", newPurse(), WILD, "hoe", NIGHT)).toEqual({ ok: false, why: "hand" });
    // a better hoe is a hoe
    expect(done(hoe("1,1", purseWith(["hoeSteel", 1]), WILD, "hoeSteel", NIGHT)).plot.soil).toBe("cleared");
  });

  it("takes one seed, from the hand, in tilled soil", () => {
    const me = purseWith(["seedKangkong", 3]), tilled: Plot = { soil: "tilled", plant: null };
    const d = done(sow(me, tilled, "seedKangkong", "me", NIGHT));
    expect(d.plot.plant).toMatchObject({ by: "me", crop: "kangkong", sown: NIGHT, picked: 0 });
    expect(held(d.purse.bag, "seedKangkong")).toBe(2);
    expect(sow(me, WILD, "seedKangkong", "me", NIGHT)).toEqual({ ok: false, why: "soil" });
    expect(sow(me, d.plot, "seedKangkong", "me", NIGHT)).toEqual({ ok: false, why: "soil" });
    expect(sow(me, tilled, "hoe", "me", NIGHT)).toEqual({ ok: false, why: "hand" });
    expect(sow(newPurse(), tilled, "seedKangkong", "me", NIGHT)).toEqual({ ok: false, why: "hand" });
    // every seed there is grows its own vegetable
    for (const c of CROP_IDS) expect(cropOf(CROPS[c].seed)).toBe(c);
    expect(cropOf("rod")).toBeNull();
  });
});

describe("a plant", () => {
  it("grows through its five stages by the clock, the first of them only what was sown, and is ripe when its time is up", () => {
    const plot = sown(), hours = CROPS.kangkong.hours;
    expect(see("1,1", plot, NIGHT)).toMatchObject({ crop: "kangkong", by: "me", stage: 1, ripe: false, pest: false, dead: false });
    expect(see("1,1", plot, NIGHT + hours * 0.2 * HOUR).stage).toBe(2);
    expect(see("1,1", plot, NIGHT + hours * 0.45 * HOUR).stage).toBe(3);
    expect(see("1,1", plot, NIGHT + hours * 0.8 * HOUR).stage).toBe(4);
    expect(see("1,1", plot, NIGHT + hours * HOUR)).toMatchObject({ stage: 5, ripe: true });
    expect(see("1,1", WILD, NIGHT)).toMatchObject({ soil: "wild", crop: null, stage: 0 });
  });

  it("has a picture for every stage of every vegetable: what was sown, the sprout and the seedling they share, and two of its own", () => {
    const icons = Object.keys(atlas.icons);
    for (const c of CROP_IDS) for (let stage = 1; stage <= STAGES; stage++) expect(icons).toContain(growIconOf(c, stage));
    // what was sown is not a plant yet (the owner: "ตอนหว่าน เมล็ดตอนนี้จะขึ้นมาเป้นต้นเลย ให้ state แรก เป็นแค่ seed ก่อน"): seeds, a bulb,
    // a root, a cutting or a nut in the ground
    expect(new Set(CROP_IDS.map((c) => growIconOf(c, 1)))).toEqual(new Set(["plotSeeds", "plotSeedsBig", "plotBulb", "plotRoot", "plotCutting", "plotNut"]));
    expect([1, 2, 3, 4, 5].map((stage) => growIconOf("kangkong", stage))).toEqual(["plotSeeds", "plotSprout", "plotSeedling", "growKangkongA", "growKangkongB"]);
    expect(growIconOf("coconut", 1)).toBe("plotNut");
    expect(growIconOf("garlic", 1)).toBe("plotBulb");
  });

  it("grows half an hour for a watering, once an hour, by anybody with water in their can; more from a better can", () => {
    const me = withWater("can", 3), plot = sown({ by: "somebody else" });
    const wet = done(water("1,1", me, plot, "can", NIGHT + HOUR));
    expect(grown(wet.plot.plant!, NIGHT + HOUR)).toBeCloseTo(1.5, 9);
    expect(waterIn(wet.purse.bag, "can")).toBe(2);
    expect(see("1,1", wet.plot, NIGHT + HOUR + 60_000).wet).toBe(true);
    expect(water("1,1", me, wet.plot, "can", NIGHT + HOUR + 59 * 60_000)).toEqual({ ok: false, why: "wet" });
    const again = done(water("1,1", wet.purse, wet.plot, "can", NIGHT + 2 * HOUR));
    expect(grown(again.plot.plant!, NIGHT + 2 * HOUR)).toBeCloseTo(3, 9);
    const brass = done(water("1,1", withWater("canBrass", 1), plot, "canBrass", NIGHT + HOUR));
    expect(brass.plot.plant!.boost).toBeGreaterThan(wet.plot.plant!.boost * 2);
    expect(water("1,1", me, plot, "hoe", NIGHT + HOUR)).toEqual({ ok: false, why: "hand" });
    expect(water("1,1", me, WILD, "can", NIGHT + HOUR)).toEqual({ ok: false, why: "soil" });
  });

  it("grows half as much again for a watering by somebody a meal has left with green fingers, while the buff lasts", () => {
    const me = withWater("can", 3), plot = sown(), plain = done(water("1,1", me, plot, "can", NIGHT + HOUR));
    const green = done(water("1,1", { ...me, buff: { id: "green", until: NIGHT + 2 * HOUR } }, plot, "can", NIGHT + HOUR));
    expect(green.plot.plant!.boost).toBe(plain.plot.plant!.boost * 1.5);
    // (worn off, or another meal's buff: a plain watering)
    expect(done(water("1,1", { ...me, buff: { id: "green", until: NIGHT + HOUR } }, plot, "can", NIGHT + HOUR)).plot.plant!.boost).toBe(plain.plot.plant!.boost);
    expect(done(water("1,1", { ...me, buff: { id: "keen", until: NIGHT + 2 * HOUR } }, plot, "can", NIGHT + HOUR)).plot.plant!.boost).toBe(plain.plot.plant!.boost);
  });

  it("is not watered from an empty can: the can is filled first", () => {
    const plot = sown();
    // a can as it is bought has no water in it, and one that has watered its last is empty again
    expect(water("1,1", purseWith(["can", 1]), plot, "can", NIGHT + HOUR)).toEqual({ ok: false, why: "dry" });
    const last = done(water("1,1", withWater("can", 1), plot, "can", NIGHT + HOUR));
    expect(waterIn(last.purse.bag, "can")).toBe(0);
    expect(water("1,1", last.purse, sown(), "can", NIGHT + 3 * HOUR)).toEqual({ ok: false, why: "dry" });
    // the first can waters between five and ten times on a filling (the owner's range), and a better one more
    expect(WATER.cans.can).toBeGreaterThanOrEqual(5);
    expect(WATER.cans.can).toBeLessThanOrEqual(10);
    expect(WATER.cans.canCopper!).toBeGreaterThan(WATER.cans.can!);
    expect(WATER.cans.canBrass!).toBeGreaterThan(WATER.cans.canCopper!);
  });

  it("grows faster once it is fed, and is covered against pests for a day by the other fertiliser", () => {
    const me = purseWith(["growFert", 2], ["guardFert", 2]), plot = sown({ crop: "pumpkin" });
    const fed = done(feed("1,1", me, plot, "growFert", NIGHT + 4 * HOUR));
    expect(held(fed.purse.bag, "growFert")).toBe(1);
    // four hours plain, then every hour worth a quarter more
    expect(grown(fed.plot.plant!, NIGHT + 12 * HOUR)).toBeCloseTo(4 + 8 * FARMING.feed, 9);
    expect(feed("1,1", fed.purse, fed.plot, "growFert", NIGHT + 5 * HOUR)).toEqual({ ok: false, why: "soil" });
    const kept = done(feed("1,1", me, plot, "guardFert", NIGHT));
    expect(kept.plot.plant!.guard).toBe(NIGHT + FARMING.guard * HOUR);
    expect(feed("1,1", me, kept.plot, "guardFert", NIGHT + HOUR)).toEqual({ ok: false, why: "soil" });
    expect(feed("1,1", me, plot, "hoe", NIGHT)).toEqual({ ok: false, why: "hand" });
  });

  it("is picked by whoever may, into a bag with room, when ripe: so many as its kind gives", () => {
    const ripeAt = NIGHT + CROPS.cabbage.hours * HOUR, plot = sown({ crop: "cabbage" }), me = purseWith(["hoe", 1]);
    expect(pick("1,1", me, plot, true, null, ripeAt - HOUR)).toEqual({ ok: false, why: "unripe" });
    expect(pick("1,1", me, plot, false, null, ripeAt)).toEqual({ ok: false, why: "theirs" });
    const d = done(pick("1,1", me, plot, true, null, ripeAt));
    // (a cabbage plant gives two heads, never more or fewer)
    expect(CROPS.cabbage.yield).toEqual([2, 2]);
    expect(d.got).toEqual([["cabbage", 2]]);
    expect(held(d.purse.bag, "cabbage")).toBe(2);
    // picked once and done: the plot is cleared ground again
    expect(d.plot).toEqual({ soil: "cleared", plant: null });
    // a bag with no room keeps the plant where it is
    const full: Purse = { ...newPurse(), bag: newPurse().bag.map(() => ({ item: "boot" as ItemId, n: 5 })) };
    expect(pick("1,1", full, plot, true, null, ripeAt)).toEqual({ ok: false, why: "full" });
    // what a picking gives is within the vegetable's own range, and not always the same
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const n = yieldOf(`${i},7`, plant({ crop: "chili", sown: NIGHT + i }));
      expect(n).toBeGreaterThanOrEqual(CROPS.chili.yield[0]);
      expect(n).toBeLessThanOrEqual(CROPS.chili.yield[1]);
      seen.add(n);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("gives one more to the right blade: a sickle for what is cut once, shears for a tree", () => {
    const tree = CROP_IDS.find(isTree)!, herb = CROP_IDS.find((c) => !isTree(c))!;
    expect(tree).toBeDefined();
    const one = plant({ crop: herb }), other = plant({ crop: tree });
    expect(yieldOf("1,1", one, "sickle")).toBe(yieldOf("1,1", one) + 1);
    expect(yieldOf("1,1", one, "shears")).toBe(yieldOf("1,1", one));
    expect(yieldOf("1,1", other, "shears")).toBe(yieldOf("1,1", other) + 1);
    expect(yieldOf("1,1", other, "sickle")).toBe(yieldOf("1,1", other));
    // the blade has to be the one in the bag
    const ripeAt = NIGHT + CROPS[herb].hours * HOUR, plot = sown({ crop: herb });
    expect(done(pick("1,1", purseWith(["sickle", 1]), plot, true, "sickle", ripeAt)).got![0][1]).toBe(yieldOf("1,1", one) + 1);
    expect(done(pick("1,1", newPurse(), plot, true, "sickle", ripeAt)).got![0][1]).toBe(yieldOf("1,1", one));
  });

  it("bears again, some of them: back a stage, ripe again after its own while, so many times in all", () => {
    const c = CROPS.kangkong, me = purseWith(["hoe", 1]);
    let plot = sown(), purse = me, now = NIGHT + c.hours * HOUR;
    for (let n = 1; n <= c.picks!; n++) {
      const d = done(pick("1,1", purse, plot, true, null, now));
      purse = d.purse; plot = d.plot;
      if (n < c.picks!) {
        expect(see("1,1", plot, now)).toMatchObject({ stage: 4, ripe: false });
        expect(pick("1,1", purse, plot, true, null, now + (c.again! - 1) * HOUR)).toEqual({ ok: false, why: "unripe" });
        now += c.again! * HOUR;
        expect(see("1,1", plot, now).ripe).toBe(true);
      }
    }
    expect(plot).toEqual({ soil: "cleared", plant: null });
  });
});

describe("pests", () => {
  /** Many plots sown at the same moment, each with when its pest struck (if one did) by two days on. */
  const struck = (over: Partial<Plant> = {}) => Array.from({ length: 400 }, (_, i) => pestAt(`${i},3`, plant({ crop: "pumpkin", ...over }), NIGHT + 48 * HOUR));

  it("strike some growing plants, only by day, and never one that is covered", () => {
    const hits = struck().filter((t): t is number => t !== null);
    expect(hits.length).toBeGreaterThan(60);
    expect(hits.length).toBeLessThan(340);
    for (const t of hits) {
      const hour = new Date(t + 7 * HOUR).getUTCHours();
      expect(hour).toBeGreaterThanOrEqual(FARMING.pests.from);
      expect(hour).toBeLessThan(FARMING.pests.to);
    }
    // covered for a day from the evening it was sown: nothing strikes before that day is out
    for (const t of struck({ guard: NIGHT + FARMING.guard * HOUR })) if (t !== null) expect(t).toBeGreaterThanOrEqual(NIGHT + FARMING.guard * HOUR);
    // the same answer for everybody who looks
    expect(struck()).toEqual(struck());
  });

  it("kill a plant left to them for more than six hours, always before midnight; a cure, anybody's, saves it", () => {
    const key = Array.from({ length: 400 }, (_, i) => `${i},3`).find((k) => pestAt(k, plant({ crop: "pumpkin" }), NIGHT + 48 * HOUR) !== null)!;
    const p = plant({ crop: "pumpkin" }), plot: Plot = { soil: "tilled", plant: p }, t = pestAt(key, p, NIGHT + 48 * HOUR)!;
    expect(see(key, plot, t - 1).pest).toBe(false);
    expect(see(key, plot, t + HOUR)).toMatchObject({ pest: true, dead: false });
    expect(see(key, plot, t + FARMING.pests.kills * HOUR + 1)).toMatchObject({ pest: false, dead: true, ripe: false });
    // (the last strike is before 18:00, so the six hours end before midnight)
    expect(new Date(t + FARMING.pests.kills * HOUR + 7 * HOUR).getUTCDate()).toBe(new Date(t + 7 * HOUR).getUTCDate());
    // cured by a stranger an hour in, it lives
    const stranger = purseWith(["pestCure", 1]);
    const cured = done(cure(key, stranger, plot, "pestCure", t + HOUR));
    expect(held(cured.purse.bag, "pestCure")).toBe(0);
    expect(see(key, cured.plot, t + 2 * HOUR)).toMatchObject({ pest: false, dead: false });
    expect(cure(key, stranger, cured.plot, "pestCure", t + 2 * HOUR)).toEqual({ ok: false, why: "soil" });
    expect(cure(key, stranger, plot, "hoe", t + HOUR)).toEqual({ ok: false, why: "hand" });
    // dead, it cannot be picked or watered; pulled up with a hoe it leaves compost and cleared ground
    const late = t + FARMING.pests.kills * HOUR + HOUR, me = withWater("can", 5, ["hoe", 1]);
    expect(pick(key, me, plot, true, null, late)).toEqual({ ok: false, why: "soil" });
    expect(water(key, me, plot, "can", late)).toEqual({ ok: false, why: "soil" });
    const pulled = done(hoe(key, me, plot, "hoe", late));
    expect(pulled.plot).toEqual({ soil: "cleared", plant: null });
    expect(held(pulled.purse.bag, "compost")).toBe(1);
  });

  it("leave a ripe plant alone: nothing is lost by coming late to pick it", () => {
    const ripeAt = NIGHT + CROPS.kangkong.hours * HOUR;
    for (let i = 0; i < 300; i++) {
      const key = `${i},9`, p = plant(), t = pestAt(key, p, NIGHT + 30 * 24 * HOUR);
      if (t !== null) expect(t).toBeLessThan(ripeAt);
      else expect(see(key, { soil: "tilled", plant: p }, NIGHT + 30 * 24 * HOUR)).toMatchObject({ ripe: true, dead: false });
    }
  });
});

describe("what a thing in the hand does to a plot", () => {
  it("is one deed, by what the thing is and how the plot stands", () => {
    const tilled: Plot = { soil: "tilled", plant: null }, cleared: Plot = { soil: "cleared", plant: null }, growing = sown(), ripeAt = NIGHT + CROPS.kangkong.hours * HOUR;
    expect(toolOf("hoeIron")).toBe("hoe");
    expect(toolOf("canCopper")).toBe("can");
    expect(toolOf("seedMango")).toBe("seed");
    expect(toolOf("rod")).toBeNull();
    expect(deedFor("1,1", WILD, "hoe", "me", NIGHT)).toBe("clear");
    expect(deedFor("1,1", cleared, "hoe", "me", NIGHT)).toBe("till");
    expect(deedFor("1,1", tilled, "hoe", "me", NIGHT)).toBeNull();
    expect(deedFor("1,1", tilled, "seedCorn", "me", NIGHT)).toBe("sow");
    expect(deedFor("1,1", WILD, "seedCorn", "me", NIGHT)).toBeNull();
    expect(deedFor("1,1", growing, "can", "you", NIGHT + HOUR, "me")).toBe("water");
    expect(deedFor("1,1", sown({ watered: NIGHT + HOUR }), "can", "me", NIGHT + HOUR + 60_000)).toBeNull();
    expect(deedFor("1,1", growing, "growFert", "me", NIGHT)).toBe("feed");
    expect(deedFor("1,1", growing, "guardFert", "me", NIGHT)).toBe("feed");
    expect(deedFor("1,1", growing, "pestCure", "me", NIGHT)).toBeNull();
    // ripe, in my bed: picked whatever is in the hand (but a hoe has its own work, and does none here)
    expect(deedFor("1,1", growing, null, "me", ripeAt, "me")).toBe("pick");
    expect(deedFor("1,1", growing, "rod", "me", ripeAt, "me")).toBe("pick");
    expect(deedFor("1,1", growing, "sickle", "me", ripeAt, "me")).toBe("pick");
    expect(deedFor("1,1", growing, null, "me", ripeAt - HOUR, "me")).toBeNull();
    // with nothing in the hand, weeds are weeds
    expect(deedFor("1,1", WILD, null, "me", NIGHT)).toBeNull();
  });

  it("is only the helping deeds, in somebody else's bed: the hoe's, watering, feeding, curing; never sowing or picking", () => {
    const tilled: Plot = { soil: "tilled", plant: null }, growing = sown({ by: "me" }), ripeAt = NIGHT + CROPS.kangkong.hours * HOUR;
    // a hoe works in anybody's bed (the owner, 2026-10-04: "ยังขุดแปลงคนอื่นได้เหมือนเดิมแต่ เสีย stamina")
    expect(deedFor("1,1", WILD, "hoe", "you", NIGHT, "me")).toBe("clear");
    expect(deedFor("1,1", { soil: "cleared", plant: null }, "hoe", "you", NIGHT, "me")).toBe("till");
    expect(deedFor("1,1", tilled, "hoe", "you", NIGHT, "me")).toBeNull();
    expect(deedFor("1,1", growing, "hoe", "you", NIGHT + HOUR, "me")).toBeNull();
    expect(deedFor("1,1", tilled, "seedCorn", "you", NIGHT, "me")).toBeNull();
    expect(deedFor("1,1", growing, null, "you", ripeAt, "me")).toBeNull();
    expect(deedFor("1,1", growing, "can", "you", NIGHT + HOUR, "me")).toBe("water");
    expect(deedFor("1,1", growing, "growFert", "you", NIGHT, "me")).toBe("feed");
    // a bed that is nobody's is anybody's to work, and what was left growing in it anybody's to pick
    expect(deedFor("1,1", WILD, "hoe", "you", NIGHT, null)).toBe("clear");
    expect(deedFor("1,1", growing, null, "you", ripeAt, null)).toBe("pick");
  });
});

describe("a bed", () => {
  const DAY = 24 * HOUR, tilled: Plot = { soil: "tilled", plant: null };
  const sower = () => holding(purseWith(["seedKangkong", 5]), "seedKangkong");

  it("belongs to whoever sows in it first, the whole of it", () => {
    const first = done(tend("1,1", tilled, undefined, 0, 0, sower(), "me", NIGHT));
    expect(first.deed).toBe("sow");
    expect(first.bed).toEqual({ by: "me", tended: NIGHT, empty: 0 });
    expect(ownerOf(first.bed, true, NIGHT + HOUR)).toBe("me");
    // somebody else, in another plot of the same bed: no sowing, no picking; but they may hoe and water
    expect(tend("2,1", tilled, first.bed, 1, 0, sower(), "you", NIGHT + HOUR)).toEqual({ ok: false, why: "theirs" });
    // …but may hoe there, for the stamina it costs anybody; the bed stays its owner's, and is not tended by it
    const helper = holding(purseWith(["hoe", 1]), "hoe");
    const lent = tend("2,1", WILD, first.bed, 1, 0, helper, "you", NIGHT + HOUR);
    expect(lent.ok && lent.deed).toBe("clear");
    expect(lent.ok && lent.plot).toEqual({ soil: "cleared", plant: null });
    expect(lent.ok && lent.bed).toEqual(first.bed);
    expect(lent.ok && staminaOf(helper, NIGHT + HOUR) - staminaOf(lent.purse, NIGHT + HOUR)).toBe(FARMING.costs.clear);
    const tilledToo = tend("2,1", { soil: "cleared", plant: null }, first.bed, 1, 0, helper, "you", NIGHT + HOUR);
    expect(tilledToo.ok && tilledToo.deed).toBe("till");
    expect(tilledToo.ok && tilledToo.bed).toEqual(first.bed);
    const ripeAt = NIGHT + CROPS.kangkong.hours * HOUR;
    expect(tend("1,1", first.plot, first.bed, 0, 0, newPurse(), "you", ripeAt)).toEqual({ ok: false, why: "theirs" });
    const helped = done(tend("1,1", first.plot, first.bed, 0, 0, holding(withWater("can", 2), "can"), "you", NIGHT + HOUR));
    expect(helped.deed).toBe("water");
    // (a helper's deed is not the owner's tending)
    expect(helped.bed).toEqual(first.bed);
    // the owner goes on to the next plot of their bed
    const second = done(tend("2,1", tilled, first.bed, 1, 0, first.purse, "me", NIGHT + 2 * HOUR));
    expect(second.bed).toEqual({ by: "me", tended: NIGHT + 2 * HOUR, empty: 0 });
  });

  it("is free again when nothing has grown in it for more than a day", () => {
    const bed: Bed = { by: "me", tended: NIGHT, empty: 0 }, ripeAt = NIGHT + CROPS.cabbage.hours * HOUR;
    // its last plant picked: the day begins
    const picked = done(tend("1,1", sown({ crop: "cabbage" }), bed, 0, 0, newPurse(), "me", ripeAt));
    expect(picked.deed).toBe("pick");
    expect(picked.bed).toEqual({ by: "me", tended: ripeAt, empty: ripeAt });
    expect(ownerOf(picked.bed, false, ripeAt + DAY)).toBe("me");
    expect(ownerOf(picked.bed, false, ripeAt + DAY + 1)).toBeNull();
    // hoeing the empty bed does not begin the day again; sowing in it ends it
    const hoed = done(tend("1,1", picked.plot, picked.bed, 0, 0, holding(purseWith(["hoe", 1]), "hoe"), "me", ripeAt + 20 * HOUR));
    expect(hoed.bed).toEqual({ by: "me", tended: ripeAt + 20 * HOUR, empty: ripeAt });
    const resown = done(tend("1,1", hoed.plot, hoed.bed, 0, 0, sower(), "me", ripeAt + 21 * HOUR));
    expect(resown.bed).toEqual({ by: "me", tended: ripeAt + 21 * HOUR, empty: 0 });
    // once it has lapsed, the next to sow there has it
    const taken = done(tend("3,1", tilled, picked.bed, 0, 0, sower(), "you", ripeAt + DAY + HOUR));
    expect(taken.bed).toEqual({ by: "you", tended: ripeAt + DAY + HOUR, empty: 0 });
  });

  it("is free again when it has plants its owner has not tended for more than four days", () => {
    const bed: Bed = { by: "me", tended: NIGHT, empty: 0 };
    expect(BEDS.untended).toBe(96);
    expect(BEDS.empty).toBe(24);
    expect(ownerOf(bed, true, NIGHT + 4 * DAY)).toBe("me");
    expect(ownerOf(bed, true, NIGHT + 4 * DAY + 1)).toBeNull();
    // any deed of the owner's there counts: watering on the third day keeps it four days more
    // (covered against pests all the while, so that what is tried here is the keeping and not the pests)
    const safe = NIGHT + 100 * DAY;
    const kept = done(tend("1,1", sown({ crop: "pumpkin", guard: safe }), bed, 0, 0, holding(withWater("can", 2), "can"), "me", NIGHT + 3 * DAY));
    expect(ownerOf(kept.bed, true, NIGHT + 6 * DAY)).toBe("me");
    // lapsed, what grows in it is anybody's: a stranger picks it, and the old keeping is dropped with that
    const late = NIGHT + 5 * DAY, left = sown({ guard: safe });
    const stranger = done(tend("1,1", left, bed, 0, 0, newPurse(), "you", late));
    expect(stranger.deed).toBe("pick");
    expect(stranger.bed).toBeUndefined();
    expect(ownerOf(undefined, false, late)).toBeNull();
  });

  it("is one of only so many that one person may hold", () => {
    expect(tend("1,1", tilled, undefined, 0, BEDS.each, sower(), "me", NIGHT)).toEqual({ ok: false, why: "beds" });
    expect(tend("1,1", tilled, undefined, 0, BEDS.each - 1, sower(), "me", NIGHT).ok).toBe(true);
    // (in a bed that is already mine, sowing is never refused for that)
    expect(tend("2,1", tilled, { by: "me", tended: NIGHT, empty: 0 }, 1, BEDS.each, sower(), "me", NIGHT).ok).toBe(true);
  });

  it("is one of twenty-four on the farm, seven plots by seven", () => {
    const beds = new Map<number, number>();
    for (let y = FARM.y; y < FARM.y + FARM.h; y++) for (let x = FARM.x; x < FARM.x + FARM.w; x++) {
      const bed = bedOf(x, y);
      expect(bed >= 0).toBe(plotAt(x, y));
      if (bed >= 0) beds.set(bed, (beds.get(bed) ?? 0) + 1);
    }
    expect([...beds.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: BEDS_IN_FARM }, (_, i) => i));
    for (const n of beds.values()) expect(n).toBe(49);
    for (let bed = 0; bed < BEDS_IN_FARM; bed++) {
      const [x, y] = bedCorner(bed);
      expect(bedOf(x, y)).toBe(bed);
      expect(bedOf(x + 6, y + 6)).toBe(bed);
      expect(bedOf(x - 1, y)).not.toBe(bed);
    }
  });
});

describe("water", () => {
  it("is drawn at the river in a bucket, poured into the farm's well, and taken from the well by the can", () => {
    // by the river with an empty bucket in the hand
    let me = holding(purseWith(["bucket", 1], ["can", 1]), "bucket"), well = 0;
    expect(choreFor(me, "river", well)).toBe("draw");
    expect(choreFor(me, "well", well)).toBeNull();
    expect(choreFor(me, null, well)).toBeNull();
    const drawn = done(chore(me, "river", well, NIGHT));
    expect(waterIn(drawn.purse.bag, "bucket")).toBe(1);
    expect(staminaOf(drawn.purse, NIGHT)).toBe(100 - WATER.costs.draw);
    // a full bucket is not filled again; at the well it is poured in
    expect(choreFor(drawn.purse, "river", well)).toBeNull();
    expect(choreFor(drawn.purse, "well", well)).toBe("pour");
    const poured = done(chore(drawn.purse, "well", well, NIGHT));
    expect(poured.well).toBe(1);
    expect(waterIn(poured.purse.bag, "bucket")).toBe(0);
    me = poured.purse; well = poured.well;
    // the can, at the well: a bucket of the well's water fills it
    me = holding(me, "can");
    expect(choreFor(me, "river", well)).toBeNull();
    expect(choreFor(me, "well", well)).toBe("fill");
    const filled = done(chore(me, "well", well, NIGHT));
    expect(filled.well).toBe(0);
    expect(waterIn(filled.purse.bag, "can")).toBe(WATER.cans.can);
    // a full can is not filled again, and an empty well fills nothing
    expect(choreFor(filled.purse, "well", 5)).toBeNull();
    expect(chore(me, "well", 0, NIGHT)).toEqual({ ok: false, why: "dry" });
  });

  it("is kept in the well up to its brim, and nothing is done without the right thing in the hand", () => {
    const full = holding(withWater("bucket", 1), "bucket");
    expect(choreFor(full, "well", WATER.well)).toBeNull();
    expect(done(chore(full, "well", WATER.well - 1, NIGHT)).well).toBe(WATER.well);
    expect(choreFor(holding(purseWith(["hoe", 1]), "hoe"), "river", 0)).toBeNull();
    expect(choreFor(purseWith(["bucket", 1]), "river", 0)).toBeNull();
    expect(chore(purseWith(["bucket", 1]), "river", 0, NIGHT)).toEqual({ ok: false, why: "none" });
    // a better can takes one bucket too, and waters more with it
    const brass = done(chore(holding(purseWith(["canBrass", 1]), "canBrass"), "well", 3, NIGHT));
    expect(brass.well).toBe(2);
    expect(waterIn(brass.purse.bag, "canBrass")).toBe(WATER.cans.canBrass);
  });

  it("has its well where the farm's lanes cross, with room to stand round it", () => {
    expect(walkable(WELL.x, WELL.y)).toBe(false);
    const round = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy): [number, number] => [WELL.x + dx, WELL.y + dy])).filter(([x, y]) => x !== WELL.x || y !== WELL.y);
    for (const [x, y] of round) expect(atWell(x, y)).toBe(true);
    expect(round.filter(([x, y]) => walkable(x, y)).length).toBeGreaterThanOrEqual(6);
    expect(atWell(WELL.x, WELL.y)).toBe(false);
    expect(atWell(WELL.x + 2, WELL.y)).toBe(false);
  });
});
describe("what waiting is worth (the owner, 2026-10-04: every crop twice as many, the hoe half the stamina)", () => {
  // what each crop gave at a picking when the game opened, least and most
  const OPENED: Record<string, [number, number]> = {
    kangkong: [2, 3], scallion: [2, 3], cabbage: [1, 1], carrot: [2, 3], daikon: [1, 2], corn: [2, 3], chili: [3, 5], tomato: [3, 4], basil: [3, 4],
    sweetPotato: [2, 4], garlic: [2, 3], pumpkin: [1, 1], eggplant: [2, 3], cucumber: [2, 4], longBean: [3, 5], lemongrass: [2, 3], galangal: [1, 2],
    lime: [3, 5], papaya: [1, 2], mango: [2, 3], banana: [3, 4], coconut: [1, 2], ginger: [1, 2], turmeric: [1, 2], taro: [1, 2], watermelon: [1, 1],
  };

  it("gives of every crop twice what it gave when the game opened", () => {
    expect(Object.keys(CROPS).sort()).toEqual(Object.keys(OPENED).sort());
    for (const [id, [lo, hi]] of Object.entries(OPENED)) expect(CROPS[id as keyof typeof CROPS].yield, id).toEqual([lo * 2, hi * 2]);
  });

  it("clears and tills for two stamina each, and the other deeds for what they cost", () => {
    expect(FARMING.costs).toEqual({ clear: 2, till: 2, pull: 2, sow: 1, water: 1, feed: 1, cure: 1, pick: 2 });
  });

  it("pays a point of stamina better for morning glory than for a common fish, and better still for what takes longer", () => {
    // coins a planting brings less its seed, for the stamina it takes on ground that was cleared (till, sow, each picking)
    const perStamina = (id: keyof typeof CROPS) => {
      const c = CROPS[id], picks = c.picks ?? 1, pieces = ((c.yield[0] + c.yield[1]) / 2) * picks;
      return (pieces * ITEMS[id].pays - GOODS[c.seed]!.price) / (FARMING.costs.till + FARMING.costs.sow + FARMING.costs.pick * picks);
    };
    // a catfish, the best of the common fish for its stamina: what it pays less a worm, for its fight
    const fish = (ITEMS.catfish.pays - GOODS.worm!.price) / FISH.catfish.fight.effort;
    expect(fish).toBe(2);
    expect(perStamina("kangkong")).toBeGreaterThan(fish * 2);
    expect(perStamina("cabbage")).toBeGreaterThan(perStamina("kangkong"));
    expect(perStamina("chili")).toBeGreaterThan(perStamina("cabbage"));
    expect(perStamina("pumpkin")).toBeGreaterThan(perStamina("chili"));
  });
});

describe("tired hands (the owner, 2026-10-04: the work that has no game stayed free with no stamina; \"ออกแบบเพิ่มเลย\")", () => {
  it("asks the hoe's game of the hoe's work always, and of everything else only with no stamina left", () => {
    for (const spent of [false, true]) {
      expect(hitsFor("clear", spent)).toBe(FARMING.swings.clear);
      expect(hitsFor("till", spent)).toBe(FARMING.swings.till);
    }
    for (const work of ["pull", "sow", "water", "feed", "cure", "pick", "draw", "pour", "fill"] as const) {
      expect(hitsFor(work, false)).toBe(0);
      expect(hitsFor(work, true)).toBe(FARMING.tired);
    }
    // lighter work, a shorter round: fewer hits than the hoe's, and more than one
    expect(FARMING.tired).toBe(2);
    expect(FARMING.tired).toBeLessThan(FARMING.swings.clear);
  });
});

describe("rain on the plots (the owner, 2026-10-04: \"ระหว่างที่ฝนตก พืชทั้งหมดจะถือว่ารดน้ำแล้ว ตลอดการตก\")", () => {
  // a morning glory (six hours) sown at eight in the evening, when no pest is about; two hours of rain from nine
  const T0 = NIGHT, S = slotOf(T0 + HOUR);
  const rains: Rain[] = rainsOf([S, S + 1, S + 2, S + 3, S + 4, S + 5, S + 6, S + 7]);
  const plant = (more: Partial<Plant> = {}): Plant => ({ by: "me", crop: "kangkong", sown: T0, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more });
  const plot = (more: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: plant(more) });
  const withCan = (): Purse => { const p = newPurse(); const bag = put(p.bag, "can", 1).map((s) => (s?.item === "can" ? { ...s, water: 5 } : s)); return { ...p, hand: "can", bag, stamina: { day: -1, left: 0 } }; };

  it("adds what watering on the hour would: half an hour of growth to an hour of rain, by the minute", () => {
    expect(rains).toEqual([[S * SLOT_MS, (S + 8) * SLOT_MS]]);
    expect(FARMING.water.adds / FARMING.water.every).toBe(0.5);
    const p = plant();
    // before the rain, and with none, the clock alone
    expect(grown(p, T0 + HOUR, rains)).toBeCloseTo(grown(p, T0 + HOUR), 9);
    expect(grown(p, T0 + 6 * HOUR)).toBeCloseTo(6, 9);
    // half an hour into it, a quarter of an hour more; at its end, an hour more; and no more after
    expect(grown(p, T0 + 1.5 * HOUR, rains)).toBeCloseTo(1.5 + 0.25, 9);
    expect(grown(p, T0 + 3 * HOUR, rains)).toBeCloseTo(3 + 1, 9);
    expect(grown(p, T0 + 5 * HOUR, rains)).toBeCloseTo(5 + 1, 9);
    // rain that fell before it was sown did nothing for it
    expect(grown(plant({ sown: T0 + 2 * HOUR }), T0 + 4 * HOUR, rains)).toBeCloseTo(2 + 0.5, 9);
    // …on top of what a can and a fertiliser did
    expect(grown(plant({ boost: 30 * 60_000 }), T0 + 3 * HOUR, rains)).toBeCloseTo(3 + 0.5 + 1, 9);
  });

  it("so a plant is ripe sooner for it: an hour sooner, for two hours of rain", () => {
    expect(see("133,5", plot(), T0 + 5 * HOUR - 1).ripe).toBe(false);
    expect(see("133,5", plot(), T0 + 5 * HOUR, rains).ripe).toBe(true);
    expect(see("133,5", plot(), T0 + 5 * HOUR - 60_000, rains).ripe).toBe(false);
    expect(see("133,5", plot(), T0 + 6 * HOUR).ripe).toBe(true);
    // and it is picked then
    const picked = pick("133,5", newPurse(), plot(), true, null, T0 + 5 * HOUR, rains);
    expect(picked.ok).toBe(true);
    expect(pick("133,5", newPurse(), plot(), true, null, T0 + 5 * HOUR)).toEqual({ ok: false, why: "unripe" });
  });

  it("a plot is wet for as long as it rains, and a can has nothing to do there", () => {
    const k = "133,5", me = withCan();
    expect(see(k, plot(), T0 + 30 * 60_000, rains).wet).toBe(false);
    expect(see(k, plot(), T0 + HOUR, rains).wet).toBe(true);
    expect(see(k, plot(), T0 + 3 * HOUR - 1, rains).wet).toBe(true);
    expect(see(k, plot(), T0 + 3 * HOUR, rains).wet).toBe(false);
    expect(deedFor(k, plot(), "can", "me", T0 + 2 * HOUR, null, rains)).toBeNull();
    expect(water(k, me, plot(), "can", T0 + 2 * HOUR, rains)).toEqual({ ok: false, why: "wet" });
    expect(tend(k, plot(), { by: "me", tended: T0, empty: 0 }, 0, 0, me, "me", T0 + 2 * HOUR, rains)).toMatchObject({ ok: false });
    // before it and after it the can waters as ever
    expect(deedFor(k, plot(), "can", "me", T0 + 30 * 60_000, null, rains)).toBe("water");
    const after = water(k, me, plot(), "can", T0 + 3 * HOUR, rains);
    expect(after.ok && after.plot.plant!.boost).toBe(30 * 60_000);
    // with no rain said, the rules are what they were
    expect(deedFor(k, plot(), "can", "me", T0 + 2 * HOUR)).toBe("water");
  });

  it("reaches every plant, whoever's it is; a plant picked once and bearing again waits by the clock as it did", () => {
    expect(see("140,5", { soil: "tilled", plant: plant({ by: "somebody" }) }, T0 + 2 * HOUR, rains).wet).toBe(true);
    // (kept from pests all the while, so that the clock alone decides)
    const chili = plant({ crop: "chili", picked: 1, pickedAt: T0, guard: T0 + 1000 * HOUR }), again = CROPS.chili.again!;
    expect(see("133,5", { soil: "tilled", plant: chili }, T0 + again * HOUR - 1, ALWAYS_RAIN).ripe).toBe(false);
    expect(see("133,5", { soil: "tilled", plant: chili }, T0 + again * HOUR, ALWAYS_RAIN).ripe).toBe(true);
  });

  it("is counted the same when a pest is looked for: a plant the rain has ripened is safe from then on", () => {
    // a carrot sown before the pests' hours, under a week of rain: half as long again in the ground as the clock says
    const key = "133,5", p = plant({ crop: "carrot", sown: at("2026-10-03T06:00:00") }), hours = CROPS.carrot.hours;
    const ripeDry = p.sown + hours * HOUR, ripeWet = p.sown + (hours / 1.5) * HOUR;
    expect(grown(p, ripeWet, ALWAYS_RAIN)).toBeCloseTo(hours, 6);
    for (let t = p.sown; t <= ripeDry + 30 * HOUR; t += HOUR) {
      const dry = pestAt(key, p, t), wet = pestAt(key, p, t, ALWAYS_RAIN);
      // (no pest ever comes to it in the rain that would not have come without, and none after the rain has ripened it)
      if (wet !== null) { expect(wet).toBe(dry); expect(wet).toBeLessThan(ripeWet); }
    }
  });
});
