import { describe, expect, it } from "vitest";
import { CART, cartPace } from "./cart";
import { catalogOf } from "./catalog";
import { WATER } from "./farm";
import { ITEMS } from "./items";
import { pass } from "./line";
import { hold, newPurse, put, type Purse } from "./trade";
import { WELL_BOOK, newLog, rankOf, seen, takeGift } from "./well";
import { FARM, SPEED, stepAlong, type Vec } from "./world";

const NOW = Date.parse("2026-10-06T09:00:00+07:00");
const at = (x: number, y: number): Vec => ({ x, y });
/** Somebody with one thing, held, and so much water in it. */
const holding = (id: keyof typeof ITEMS, water = 0): Purse => {
  const p = newPurse(), d = hold({ ...p, bag: put(p.bag, id, 1) }, 0);
  if (!d.ok) throw new Error("nothing to hold");
  return water ? { ...d.purse, bag: d.purse.bag.map((s) => (s?.item === id ? { ...s, water } : s)) } : d.purse;
};

describe("a water cart (the owner, 2026-10-05: \"a cart pushed by two\")", () => {
  it("carries more than anything else, and is the well's for the rank between the two yokes", () => {
    const most = Math.max(...Object.entries(WATER.buckets).filter(([id]) => id !== CART.item).map(([, n]) => n!));
    expect(WATER.buckets[CART.item]).toBe(6);
    expect(WATER.buckets[CART.item]!).toBeGreaterThan(most);
    expect(WELL_BOOK.gifts).toEqual([[1, "waterYoke"], [2, "waterCart"], [3, "waterYokeGreat"]]);
    // it fetches nothing, like the yokes
    expect(ITEMS[CART.item].pays).toBe(0);
  });

  it("is half as fast for whoever holds it alone, and as fast as anybody with somebody within three steps", () => {
    const me = at(10, 10);
    expect(cartPace("waterCart", me, [])).toBe(0.5);
    expect(cartPace("waterCart", me, [at(10, 14), at(20, 10)])).toBe(0.5);
    expect(cartPace("waterCart", me, [at(10, 13)])).toBe(1);
    expect(cartPace("waterCart", me, [at(12, 12)])).toBe(1);
    // (three steps as the crow flies: a little over is not beside)
    expect(cartPace("waterCart", me, [at(13, 11)])).toBe(0.5);
    expect(cartPace("waterCart", me, [at(40, 40), at(10.5, 9.5)])).toBe(1);
  });

  it("slows nobody who holds anything else, or nothing", () => {
    for (const hand of [null, undefined, "", "bucket", "waterYoke", "waterYokeGreat", "rod", "hoe"]) expect(cartPace(hand, at(10, 10), [])).toBe(1);
  });

  it("is not pushed by somebody on another map, however near the numbers are", () => {
    // (the farm's corner and the tile beside it that is no map at all)
    const onFarm = at(FARM.x, FARM.y + 3), off = at(FARM.x - 1, FARM.y + 3), beside = at(FARM.x + 1, FARM.y + 3);
    expect(cartPace("waterCart", onFarm, [off])).toBe(0.5);
    expect(cartPace("waterCart", onFarm, [beside])).toBe(1);
  });

  it("so alone it brings three bucketfuls in the time a great yoke brings four, and with a friend six", () => {
    // the same road walked for the same while: how far each has got
    const road = [at(30, 10)], dt = 2;
    const walked = (pace: number) => stepAlong(at(10, 10), road, SPEED * pace * dt).pos.x - 10;
    const alone = walked(cartPace("waterCart", at(10, 10), [])), two = walked(cartPace("waterCart", at(10, 10), [at(11, 10)])), yoke = walked(cartPace("waterYokeGreat", at(10, 10), []));
    expect(alone).toBeCloseTo(yoke / 2, 6);
    expect(two).toBeCloseTo(yoke, 6);
    const [cart, great] = [WATER.buckets.waterCart!, WATER.buckets.waterYokeGreat!];
    expect(cart * (alone / yoke)).toBe(3);
    expect(cart * (alone / yoke)).toBeLessThan(great);
    expect(cart * (two / yoke)).toBeGreaterThan(great);
  });

  it("is a bucket in everything else: its six bucketfuls are a carrier's six, and go on along a line as far as the next bucket holds", () => {
    let log = newLog();
    log = seen(log, { by: "ann", at: NOW, what: "pour", n: 6, can: "waterCart" });
    expect(log.carriers.ann.buckets).toBe(6);
    expect(rankOf(log.carriers.ann.buckets)).toBe(0);
    const did = pass(holding("waterCart", 6), holding("waterYokeGreat"), NOW);
    expect(did.ok && [did.n, did.from.bag[0], did.to.bag[0]]).toEqual([4, { item: "waterCart", n: 1, water: 2 }, { item: "waterYokeGreat", n: 1, water: 4 }]);
    const back = pass(holding("bucket", 1), holding("waterCart"), NOW);
    expect(back.ok && [back.n, back.to.bag[0]]).toEqual([1, { item: "waterCart", n: 1, water: 1 }]);
  });

  it("waits at the well for somebody of the second rank who has the yoke, and is taken once", () => {
    const [, second] = WELL_BOOK.ranks;
    const log = { ...newLog(), carriers: { ann: { buckets: second, taken: [1] } } };
    const did = takeGift(newPurse(), log, "ann");
    expect(did.ok && [did.gift, did.rank, did.purse.bag[0]]).toEqual(["waterCart", 2, { item: "waterCart", n: 1 }]);
    if (!did.ok) return;
    expect(takeGift(did.purse, did.log, "ann")).toEqual({ ok: false, why: "none" });
  });

  it("is in the catalog the database keeps: the thing, what it carries, the rank it is given at", () => {
    const c = catalogOf() as unknown as { items: Record<string, { kind: string; pays: number }>; farming: { buckets: Record<string, number> }; well: { gifts: Array<[number, string]> } };
    expect(c.items.waterCart).toMatchObject({ kind: "tool", pays: 0 });
    expect(c.farming.buckets.waterCart).toBe(6);
    expect(c.well.gifts).toEqual([[1, "waterYoke"], [2, "waterCart"], [3, "waterYokeGreat"]]);
  });
});
