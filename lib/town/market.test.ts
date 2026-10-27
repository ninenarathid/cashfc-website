import { describe, expect, it } from "vitest";
import { CROPS, ITEMS, ITEM_IDS } from "./items";
import { MARKET, costOf, counted, factorOf, factsOf, farmPricesOf, historicalPrice, marketDemand, movingOf, newMarket, next, pricesTold, rolled, thingOf, worth, type Market } from "./market";
import { GOODS } from "./trade";

const c = factsOf();

describe("what a thing costs to come by", () => {
  it("a vegetable: its seed at the stall, by what the plant gives in all", () => {
    // kangkong: a seed for 4, three pickings of five
    expect(costOf("kangkong", c)).toBeCloseTo(4 / 15, 10);
    expect(costOf("pumpkin", c)).toBe(GOODS.seedPumpkin!.price / 2);
    for (const id of Object.keys(CROPS)) expect(costOf(id, c)).toBeLessThan(ITEMS[id as keyof typeof ITEMS].pays);
  });
  it("a fish: the cheapest bait it takes that is used up; one that takes only a lure, nothing", () => {
    expect(costOf("minnow", c)).toBe(GOODS.worm!.price);
    expect(costOf("perch", c)).toBe(GOODS.worm!.price);
    expect(costOf("arowana", c)).toBe(0);
    // (what is no fish comes up on any bait unless it names some: the cheapest there is)
    expect(costOf("hyacinth", c)).toBeLessThanOrEqual(GOODS.worm!.price);
    expect(costOf("pearl", c)).toBe(Math.min(GOODS.antEggs!.price, GOODS.fermentedBait!.price));
  });
});

describe("a thing whose price moves", () => {
  it("is what play brings: a vegetable, a fish, what else a line brings up, what is cooked or made; never what the uncle sells, a tool, a seed or a scroll", () => {
    const moving = new Set(movingOf(c));
    for (const id of ["kangkong", "chili", "minnow", "megaCatfish", "hyacinth", "friedMinnow", "compost"]) expect(moving.has(id)).toBe(true);
    for (const id of ["rod", "worm", "seedKangkong", "rice", "bowl", "scrollFriedMinnow", "oddDish"]) expect(moving.has(id)).toBe(false);
    for (const id of moving) expect(GOODS[id as keyof typeof GOODS]).toBeUndefined();
    // every one of them fetches something, and has room to move
    for (const id of moving) { if (id in MARKET.fixed) continue; const t = thingOf(id, c)!; expect(ITEMS[id as keyof typeof ITEMS].pays).toBeGreaterThan(0); expect(t.floor).toBeLessThanOrEqual(100); expect(t.ceil).toBeGreaterThan(100); }
  });
  it("gives a thing of a band of its own that band, five a round for the whole village: the giant steak, 84 to 100 of its 120 (lib/town/giant-fish)", () => {
    expect(thingOf("giantSteak", c)).toEqual({ usual: 0, floor: 84, ceil: 100, batch: 5 });
    expect(ITEMS.giantSteak.pays).toBe(120);
  });
  it("never falls under its cost and half as much again, nor under two fifths; what is cooked or made does not fall", () => {
    expect(thingOf("kangkong", c)).toEqual({ usual: 5, floor: 40, ceil: 150, batch: 5, fall: 25 });
    expect(thingOf("pumpkin", c)!.floor).toBe(40);
    // a minnow takes a worm that costs most of what it fetches: its price cannot fall
    expect(thingOf("minnow", c)!.floor).toBe(100);
    expect(thingOf("friedMinnow", c)!.floor).toBe(100);
    expect(thingOf("compost", c)!.floor).toBe(100);
    for (const id of movingOf(c)) {
      const t = thingOf(id, c)!, it = ITEMS[id as keyof typeof ITEMS];
      expect(t.floor).toBeGreaterThanOrEqual(MARKET.floor);
      // (the least it fetches is its cost and half again, or its usual price when that is less)
      expect(it.pays * t.floor / 100).toBeGreaterThanOrEqual(Math.min(it.pays, costOf(id, c) * 1.5) - 1e-9);
    }
  });
  it("may rise the higher the plainer it is; a crop, whatever its tier, to its own ceiling (v285)", () => {
    const by = (tier: number) => new Set(movingOf(c).filter((id) => ITEMS[id as keyof typeof ITEMS].tier === tier && ITEMS[id as keyof typeof ITEMS].kind !== "crop" && !(id in MARKET.fixed)).map((id) => thingOf(id, c)!.ceil));
    expect(new Set(movingOf(c).filter((id) => ITEMS[id as keyof typeof ITEMS].kind === "crop").map((id) => thingOf(id, c)!.ceil))).toEqual(new Set([MARKET.cropCeil]));
    expect(MARKET.cropCeil).toBe(150);
    expect([...by(1)]).toEqual([220]);
    expect([...by(2)]).toEqual([200]);
    expect([...by(3)]).toEqual([180]);
  });
  it("has the same usual worth a head a round as every other of its kind; a crop dearer than kangkong more pieces than its worth says (v285)", () => {
    expect(thingOf("kangkong", c)!.usual * ITEMS.kangkong.pays).toBe(MARKET.usual.crop);
    expect(thingOf("catfish", c)!.usual * ITEMS.catfish.pays).toBeCloseTo(MARKET.usual.fish!, 10);
    // (a crop: its coins' worth measured against the square root of its price from kangkong up; never fewer pieces than before)
    expect(thingOf("pumpkin", c)!.usual).toBeCloseTo((MARKET.usual.crop! / ITEMS.pumpkin.pays) * Math.sqrt(ITEMS.pumpkin.pays / MARKET.cropAnchor), 10);
    for (const id of movingOf(c).filter((id) => ITEMS[id as keyof typeof ITEMS].kind === "crop")) expect(thingOf(id, c)!.usual * ITEMS[id as keyof typeof ITEMS].pays).toBeGreaterThanOrEqual(MARKET.usual.crop! - 1e-9);
    // at forty heads, a round: kangkong as before, the dear ones several times what they were (five, the batch, before)
    const at40 = (id: string) => Math.round(Math.max(thingOf(id, c)!.usual * 40, thingOf(id, c)!.batch));
    expect(["kangkong", "tomato", "redOkra", "pumpkin", "bottleGourd", "blueCorn", "trellisBerry"].map(at40)).toEqual([200, 122, 53, 33, 31, 27, 25]);
    expect(MARKET.cropFall).toBe(25);
    for (const id of movingOf(c)) expect(thingOf(id, c)!.fall).toBe(ITEMS[id as keyof typeof ITEMS].kind === "crop" ? 25 : undefined);
  });
});

describe("a round on", () => {
  const usual = 100;
  it("sold as much as usual, the price stays", () => {
    expect(next({ f: 100, m: usual }, usual, usual, 40, 150)).toEqual({ f: 100, m: usual });
  });
  it("large oversupply can reach the floor in two rounds, respecting the 40% step limit", () => {
    let st = { f: 100, m: usual };
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) { st = next(st, usual * 20, usual, 40, 150); seen.push(st.f); }
    expect(seen.slice(0, 4)).toEqual([60, 40, 40, 40]);
    expect(seen.at(-1)).toBe(40);
  });
  it("scarcity responds faster but respects the 35% upward step and the ceiling", () => {
    let st = { f: 100, m: usual };
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) { st = next(st, 0, usual, 40, 150); seen.push(st.f); }
    expect(seen.slice(0, 5)).toEqual([135, 150, 150, 150, 150]);
    expect(seen.at(-1)).toBe(150);
  });
  it("buffers ordinary supply and remembers 65% of new sales", () => {
    // Twice the usual supply, neutral buyer interest: equilibrium is two thirds.
    let st = { f: 100, m: usual };
    for (let i = 0; i < 30; i++) st = next(st, usual * 2, usual, 40, 150);
    expect(st.f).toBe(67);
    expect(st.m).toBeCloseTo(usual * 2, 3);
    expect(next({ f: 100, m: usual }, usual * 9, usual, 40, 150).m).toBeCloseTo(usual * 6.2);
  });
  it("a thing that cannot fall does not", () => {
    expect(next({ f: 100, m: usual }, usual * 50, usual, 100, 150).f).toBe(100);
  });
});

describe("the market kept by the village", () => {
  const R = 41_470, heads = 25;
  it("begins with every price the usual one", () => {
    const m = newMarket(R);
    for (const id of ITEM_IDS) expect(factorOf(m, id)).toBe(100);
  });
  it("counts what is left to be sold in a round, and what is taken back", () => {
    let m = counted(newMarket(R), "kangkong", 30);
    m = counted(m, "kangkong", 12);
    m = counted(m, "kangkong", -40);
    m = counted(m, "chili", -5);
    expect(m.sold).toEqual({ kangkong: 2, chili: 0 });
  });
  it("is the same market within a round", () => {
    const m = counted(newMarket(R), "kangkong", 500), same = rolled(m, R, heads, c);
    expect(same.market).toBe(m);
    expect(same.log).toEqual([]);
  });
  it("moves every price once when the round turns: what was sold a great deal falls, what was not sold rises, and what the uncle sells stays", () => {
    const m = counted(counted(newMarket(R), "kangkong", 5_000), "chili", Math.round(thingOf("chili", c)!.usual * heads));
    const { market, log } = rolled(m, R + 1, heads, c);
    expect(market.round).toBe(R + 1);
    expect(market.sold).toEqual({});
    expect(factorOf(market, "kangkong")).toBe(75); // (a crop falls a quarter a round at the most since v285; 60 before)
    expect(factorOf(market, "chili")).toBeGreaterThanOrEqual(40);
    expect(factorOf(market, "carrot")).toBeGreaterThanOrEqual(40);
    expect(factorOf(market, "minnow")).toBeGreaterThanOrEqual(100);
    expect(factorOf(market, "worm")).toBe(100);
    expect(factorOf(market, "rod")).toBe(100);
    // the round that ended is written down: what was sold, at the price it had
    expect(log[0][0]).toBe(R);
    expect(log[0][1].kangkong).toEqual([100, 5_000, ITEMS.kangkong.pays]);
    expect(log[0][1].chili).toEqual([100, Math.round(thingOf("chili", c)!.usual * heads), ITEMS.chili.pays]);
    expect(Object.keys(market.at).sort()).toEqual(movingOf(c).sort());
  });
  it("left alone for some rounds, moves through each of them, selling nothing", () => {
    const first = rolled(counted(newMarket(R), "kangkong", 5_000), R + 1, heads, c).market;
    const { market, log } = rolled(first, R + 4, heads, c);
    expect(log.map(([round]) => round)).toEqual([R + 1, R + 2, R + 3]);
    expect(log[0][1].kangkong[0]).toBe(75);
    expect(log.slice(1).every(([, things]) => things.kangkong[1] === 0)).toBe(true);
    expect(factorOf(market, "kangkong")).toBeGreaterThanOrEqual(40);
  });
  it("long inactivity keeps recent round dates and the current demand phase", () => {
    const { market, log } = rolled(newMarket(R), R + 400, heads, c);
    expect(log.length).toBe(2 * MARKET.lately);
    expect(market.round).toBe(R + 400);
    expect(log.at(-1)![0]).toBe(R + 399);
    expect(log[0][0]).toBe(R + 400 - 2 * MARKET.lately);
    for (const id of movingOf(c)) {
      const factor = factorOf(market, id), t = thingOf(id, c)!;
      expect(factor).toBeGreaterThanOrEqual(t.floor);
      expect(factor).toBeLessThanOrEqual(t.ceil);
    }
  });
  it("more heads make the usual amount more: the same selling sinks a price less in a bigger village", () => {
    const sale = counted(newMarket(R), "kangkong", 300);
    expect(factorOf(rolled(sale, R + 1, 10, c).market, "kangkong")).toBeLessThan(factorOf(rolled(sale, R + 1, 60, c).market, "kangkong"));
  });
});

describe("what so many of a thing fetch at a price", () => {
  it("is whole coins, the odd part lost", () => {
    expect(worth(20, 3, 87)).toBe(52);
    expect(worth(1, 3, 40)).toBe(1);
    expect(worth(1, 2, 40)).toBe(0);
    expect(worth(7, 12, 100)).toBe(84);
  });
});

/** A village's selling played through some rounds: the same every time. */
export function played(rounds: number, heads: number, sell: (round: number) => Record<string, number>): Market {
  let m = newMarket(0);
  for (let r = 0; r < rounds; r++) {
    for (const [id, n] of Object.entries(sell(r))) m = counted(m, id, n);
    m = rolled(m, r + 1, heads, c).market;
  }
  return m;
}
describe("a week of the farm filling up", () => {
  it("brings the plain vegetables down towards their floor, and leaves what nobody sells at its ceiling", () => {
    const m = played(14, 25, (r) => ({ kangkong: 200 + 150 * r, scallion: 200 + 150 * r, chili: 100 + 60 * r }));
    expect(factorOf(m, "kangkong")).toBeLessThan(60);
    expect(factorOf(m, "kangkong")).toBeGreaterThanOrEqual(40);
    expect(factorOf(m, "chili")).toBeLessThan(80);
    expect(factorOf(m, "cabbage")).toBeGreaterThan(factorOf(m, "kangkong"));
    expect(factorOf(m, "catfish")).toBeGreaterThanOrEqual(100);
  });
});

describe("what the whole village sells", () => {
  // (the owner, 2026-10-07: "การปรับราคาสินค้าขาย ช่วยทำให้ติดลบได้ ถ้ามีการขายสิ่งนั้นมากเกินไป". The village as it was that
  // morning: 38 heads, some 300 kangkong and 70 cabbages left a round, and of chili hardly any.)
  it("stands under its usual price when that is more than its usual amount, and over it when less", () => {
    const heads = 38, m = played(8, heads, () => ({ kangkong: 300, cabbage: 70, chili: 25 }));
    expect(thingOf("kangkong", c)!.usual * heads).toBe(190);
    const scarce = played(8, heads, () => ({}));
    expect(factorOf(m, "kangkong")).toBeLessThan(factorOf(scarce, "kangkong"));
    expect(factorOf(m, "cabbage")).toBeLessThan(factorOf(scarce, "cabbage"));
  });
  it("neutral demand and ordinary sales have the base as their equilibrium", () => {
    expect(next({ f: 100, m: 190 }, 190, 190, 40, 220)).toEqual({ f: 100, m: 190 });
  });
});

describe("stock decisions and buyer interest", () => {
  it("quiet buyers can cool an unsold item: hoarding is not an always-rising price", () => {
    let st = { f: 200, m: 0 };
    for (let i = 0; i < 5; i++) st = next(st, 0, 100, 40, 220, MARKET, 45);
    expect(st.f).toBe(90);
  });
  it("normal supply still responds to strong and weak buyer interest", () => {
    expect(next({ f: 100, m: 100 }, 100, 100, 40, 220, MARKET, 155).f).toBe(135);
    expect(next({ f: 100, m: 100 }, 100, 100, 40, 220, MARKET, 45).f).toBe(60);
  });
  it("every buyer cycle is bounded, deterministic and has both quiet and busy phases", () => {
    for (const id of ["blueCorn", "corn", "berryJam", "megaCatfish"]) {
      const interest = Array.from({ length: 42 }, (_, i) => marketDemand(id, i));
      expect(Math.min(...interest)).toBe(45);
      expect(Math.max(...interest)).toBe(155);
      expect(interest).toEqual(Array.from({ length: 42 }, (_, i) => marketDemand(id, i)));
    }
  });
  it("one ordinary hybrid harvest is buffered even in the smallest village", () => {
    // (a hybrid's harvest is one plot's since 2026-10-16, under the least batch)
    const t = thingOf("blueCorn", c)!;
    expect(t.batch).toBe(MARKET.minVolume);
    const usual = Math.max(t.usual * MARKET.heads, t.batch);
    // (since v285 a dear crop's usual amount is over the batch even at the fewest heads: one harvest does not lower it)
    expect(usual).toBeGreaterThan(t.batch);
    expect(next({ f: 100, m: usual }, t.batch, usual, t.floor, t.ceil, MARKET, 100, t.fall).f).toBeGreaterThanOrEqual(100);
  });
  it("crafted staples move while bought staples keep their fixed buyback price", () => {
    expect(thingOf("berryJam", c)!.floor).toBe(100);
    expect(thingOf("rice", c)).toBeNull();
    expect(thingOf("sugar", c)).toBeNull();
    expect(thingOf("oil", c)).toBeNull();
  });
  it("new history freezes its base while legacy history stays explicitly unknown", () => {
    const prior = newMarket(100), first = rolled(counted(prior, "blueCorn", 7), 101, 10, c);
    const revalued = { ...c, items: { ...c.items, blueCorn: { ...c.items.blueCorn, pays: 999 } } };
    const told = pricesTold(first.market, [[99, { blueCorn: [115, 2] }], ...first.log], ["blueCorn"], revalued).things.blueCorn;
    expect(told.base).toBe(999);
    expect(told.was[0][3]).toBeNull();
    expect(told.was[1][3]).toBe(170);
    expect(told.demand).toBe(marketDemand("blueCorn", 101));
    expect(historicalPrice(told.was[0][3], told.was[0][1])).toBeNull();
    expect(historicalPrice(told.was[1][3], told.was[1][1])).toBe(170);
  });
  it("a full buyer cycle can reverse an unsold price while respecting all step limits", () => {
    let market = newMarket(0), prior = 100;
    const seen = [prior];
    for (let r = 1; r <= 42; r++) {
      market = rolled(market, r, 10, c).market;
      const f = factorOf(market, "blueCorn");
      // (a crop falls a quarter a round at the most since v285, and rises to its own ceiling)
      expect(f).toBeGreaterThanOrEqual(Math.round(prior * (1 - MARKET.cropFall / 100)));
      expect(f).toBeLessThanOrEqual(Math.min(MARKET.cropCeil, Math.round(prior * 1.35)));
      seen.push(f); prior = f;
    }
    expect(seen.some((f, i) => i > 0 && f < seen[i - 1])).toBe(true);
    expect(seen.some((f, i) => i > 0 && f > seen[i - 1])).toBe(true);
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(40);
  });
});

describe("every crop's price, told at the farm (v283; the owner, 2026-10-19)", () => {
  it("tells each crop whose price moves, held or not, as a thing held is told, without the days gone by", () => {
    const c = factsOf(), m: Market = { round: 500, at: { kangkong: { f: 60, m: 400 }, blueCorn: { f: 140, m: 1 } }, sold: {} };
    const told = farmPricesOf(m, c);
    const crops = Object.keys(c.items).filter((id) => c.items[id].kind === "crop" && thingOf(id, c) !== null);
    expect(Object.keys(told.things).sort()).toEqual(crops.sort());
    expect(told.round).toBe(500);
    // (v285: the whole village's usual amount a round, at the heads the market was counted as, and what is left so far)
    expect(told.things.kangkong).toEqual({ ...pricesTold(m, [], ["kangkong"], c).things.kangkong, was: [], usual: 5 * MARKET.heads, selling: 0 });
    const counted40 = farmPricesOf({ ...m, heads: 40, sold: { bottleGourd: 12 } }, c);
    expect([counted40.things.kangkong.usual, counted40.things.bottleGourd.usual, counted40.things.bottleGourd.selling]).toEqual([200, 31, 12]);
    expect([told.things.kangkong.f, told.things.blueCorn.f, told.things.tomato.f]).toEqual([60, 140, 100]);
    expect(Object.values(told.things).every((t) => t.was.length === 0)).toBe(true);
    // (no seed, fish or dish among them)
    expect(["seedKangkong", "minnow", "stirKangkong"].some((id) => id in told.things)).toBe(false);
  });
});
