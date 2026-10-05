import { describe, expect, it } from "vitest";
import { CROPS, ITEMS, ITEM_IDS } from "./items";
import { MARKET, costOf, counted, factorOf, factsOf, movingOf, newMarket, next, rolled, thingOf, worth, type Market } from "./market";
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
    for (const id of moving) { const t = thingOf(id, c)!; expect(ITEMS[id as keyof typeof ITEMS].pays).toBeGreaterThan(0); expect(t.floor).toBeLessThanOrEqual(100); expect(t.ceil).toBeGreaterThan(100); }
  });
  it("never falls under its cost and half as much again, nor under two fifths; what is cooked or made does not fall", () => {
    expect(thingOf("kangkong", c)).toEqual({ usual: 10, floor: 40, ceil: 150 });
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
  it("may rise the higher the plainer it is", () => {
    const by = (tier: number) => new Set(movingOf(c).filter((id) => ITEMS[id as keyof typeof ITEMS].tier === tier).map((id) => thingOf(id, c)!.ceil));
    expect([...by(1)]).toEqual([150]);
    expect([...by(2)]).toEqual([130]);
    expect([...by(3)]).toEqual([115]);
  });
  it("has the same usual worth a head a round as every other of its kind", () => {
    expect(thingOf("kangkong", c)!.usual * ITEMS.kangkong.pays).toBe(MARKET.usual.crop);
    expect(thingOf("pumpkin", c)!.usual * ITEMS.pumpkin.pays).toBeCloseTo(MARKET.usual.crop!, 10);
    expect(thingOf("catfish", c)!.usual * ITEMS.catfish.pays).toBeCloseTo(MARKET.usual.fish!, 10);
  });
});

describe("a round on", () => {
  const usual = 100;
  it("sold as much as usual, the price stays", () => {
    expect(next({ f: 100, m: usual }, usual, usual, 40, 150)).toEqual({ f: 100, m: usual });
  });
  it("sold a great deal, it falls: a quarter of itself in a round at the most, and never under its floor", () => {
    let st = { f: 100, m: usual };
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) { st = next(st, usual * 20, usual, 40, 150); seen.push(st.f); }
    expect(seen.slice(0, 4)).toEqual([75, 56, 42, 40]);
    expect(seen.at(-1)).toBe(40);
  });
  it("not sold, it rises: a tenth of itself in a round at the most, and never over its ceiling", () => {
    let st = { f: 100, m: usual };
    const seen: number[] = [];
    for (let i = 0; i < 8; i++) { st = next(st, 0, usual, 40, 150); seen.push(st.f); }
    expect(seen.slice(0, 5)).toEqual([110, 121, 133, 146, 150]);
    expect(seen.at(-1)).toBe(150);
  });
  it("answers to what was sold by a gentle bend, and remembers half of the round before", () => {
    // twice the usual amount, for good: the price settles at (1/2) ^ 0.7
    let st = { f: 100, m: usual };
    for (let i = 0; i < 30; i++) st = next(st, usual * 2, usual, 40, 150);
    expect(st.f).toBe(Math.round(100 * 0.5 ** 0.7));
    expect(st.m).toBeCloseTo(usual * 2, 3);
    // one great sale is half forgotten a round later
    expect(next({ f: 100, m: usual }, usual * 9, usual, 40, 150).m).toBe(usual * 5);
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
    expect(factorOf(market, "kangkong")).toBe(75);
    expect(factorOf(market, "chili")).toBe(100);
    expect(factorOf(market, "carrot")).toBe(110);
    expect(factorOf(market, "minnow")).toBe(110);
    expect(factorOf(market, "worm")).toBe(100);
    expect(factorOf(market, "rod")).toBe(100);
    // the round that ended is written down: what was sold, at the price it had
    expect(log).toEqual([[R, { kangkong: [100, 5_000], chili: [100, Math.round(thingOf("chili", c)!.usual * heads)] }]]);
    expect(Object.keys(market.at).sort()).toEqual(movingOf(c).sort());
  });
  it("left alone for some rounds, moves through each of them, selling nothing", () => {
    const first = rolled(counted(newMarket(R), "kangkong", 5_000), R + 1, heads, c).market;
    const { market, log } = rolled(first, R + 4, heads, c);
    expect(log.map(([round]) => round)).toEqual([R + 1, R + 2, R + 3]);
    // the great sale is forgotten by halves: the price falls on for two rounds, more slowly, and then turns
    expect(log.map(([, things]) => things.kangkong[0])).toEqual([75, 56, 51]);
    expect(factorOf(market, "kangkong")).toBe(56);
    // (what nobody sold has risen a tenth a round, four rounds running)
    expect(factorOf(market, "carrot")).toBe(146);
  });
  it("left alone for a long while, is moved no further than it takes everything to settle", () => {
    const { market, log } = rolled(newMarket(R), R + 400, heads, c);
    expect(log.length).toBe(2 * MARKET.lately);
    expect(market.round).toBe(R + 400);
    for (const id of movingOf(c)) expect(factorOf(market, id)).toBe(thingOf(id, c)!.ceil);
  });
  it("more heads make the usual amount more: the same selling sinks a price less in a bigger village", () => {
    const sale = counted(newMarket(R), "kangkong", 600);
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
    expect(factorOf(m, "cabbage")).toBe(150);
    expect(factorOf(m, "catfish")).toBe(150);
  });
});
