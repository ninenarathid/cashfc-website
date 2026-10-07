import { BAITS, CROPS, FISH, FLOTSAM, ITEMS, KEPT_BAITS, type ItemKind } from "./items";
import { GOODS } from "./trade";

/**
 * What the uncle's relatives pay: a price that moves with how much of a thing
 * the village sells.
 *
 * On the game's second day the purses held 1,369 Popoto coins and the plots
 * about 13,200 more still to be picked; the relatives bought without limit, at
 * a price that never moved. The owner's own answer (2026-10-05): "ถ้าผมทำให้ ของที่
 * ถูกขายเยอะราคาน้อยลง แต่ของที่ไม่ค่อยถูกขาย (คนไม่นิยมเล่น) ราคาเพิ่มขึ้น"; why: "จะทำให้
 * ผู้เล่นไม่หาแต่ของแพงๆ tier สูงๆมาขาย ของ tier อ่อนกว่าจะถูกมองข้าม"; and its limit:
 * "ราคาขึ้นลงได้ แต่ไม่ควรลงเกินกว่าต้นทุนของสิ่งๆนั่น ยังอยากให้ผู้เล่นที่เสียเวลาเล่นได้อะไร
 * กลับไปบ้าง".
 *
 * - **A price is posted for a round** (the relatives come twice a day,
 *   lib/town/trade's rounds): whatever is left with the uncle in a round
 *   fetches that round's price, early or late, so nobody races anybody. A lot
 *   keeps the price it was left at.
 * - **Each thing is measured against its own usual amount**, not against
 *   other things: so many coins' worth a head a round, by its kind. Sold more
 *   than that, its price falls; sold less, it rises. "A head" is a member who
 *   has done anything in the town lately, so that more members do not sink
 *   prices by being there.
 * - **It moves slowly, and further down than up**: at most a quarter of
 *   itself down in a round, a tenth up; what the village sold is remembered
 *   half and half with the round before.
 * - **Never under what the thing costs to come by, and half as much again**
 *   (the seed at the stall by what a plant gives; the cheapest bait that takes
 *   the fish), nor under two fifths of its usual price. What is cooked or made
 *   never falls at all: it has its makings' cost in it.
 * - **The plainer the thing, the higher it may rise**: half as much again for
 *   the first tier, less for the second and the third.
 * - **What the uncle sells himself has one price** (he buys his own goods
 *   back at half: a price that rose would be coins for nothing), and so have
 *   tools, seeds, staples and scrolls.
 *
 * Every number is a knob the database keeps (`town_knobs`, whole numbers:
 * hundredths where a share is meant). Pure: what a thing costs is worked out
 * from what the catalog says of it, given here as `MarketFacts`, so that the
 * database's own reckoning can be held to this one over its own catalog.
 */
export const MARKET = {
  /** The least a price falls to, in hundredths of the usual one; what is cooked or made falls no lower than `made`. */
  floor: 40,
  made: 100,
  /** A thing's price is never under its cost times this, in hundredths. */
  margin: 150,
  /** The most a price rises to, by the thing's tier. */
  ceil: [150, 130, 115],
  /** How far a price moves in a round at the most, in hundredths of itself. */
  fall: 25,
  rise: 10,
  /** How much of what was sold this round is remembered against what was remembered before, in hundredths. */
  memory: 50,
  /** How hard a price answers to selling, in hundredths: price = (usual / sold) to this power. */
  bend: 70,
  /** The fewest heads the village is counted as, and how many rounds back somebody is counted from. */
  heads: 10,
  lately: 14,
  /**
   * The usual amount of a thing, in coins' worth a head a round, by its kind. A kind not here has one price.
   * (An insect's was 10 until v131, 2026-10-05: what the common insects fetch was cut by a third then, and 7 kept
   * their usual number of things where it was, 7/2 against 10/3, so that the cut is a third however many are sold.)
   *
   * Every one of them was twice this until v155 (2026-10-07: 30, 15, 10, 15, 15, 15, 7). Two days on, 245 of the
   * 253 things stood over their usual price, the four vegetables the whole village sells among them (kangkong, some
   * six hundred a day, at 130): a head is anybody who has done anything in the town lately, half of whom sell
   * nothing in a round, and nobody sells every thing, so hardly anything was ever "sold more than usual". The
   * owner: "การปรับราคาสินค้าขาย ช่วยทำให้ติดลบได้ ถ้ามีการขายสิ่งนั้นมากเกินไป". At half, what the village sold that
   * day puts those four and some fifteen things of the forest under their usual price, and leaves the rest over it.
   */
  usual: { crop: 15, fish: 8, catch: 5, dish: 8, goods: 8, wild: 8, bug: 4 } as Partial<Record<ItemKind, number>>,
};
export type MarketKnobs = typeof MARKET;

/** What the catalog says of things, as far as their prices go (the database's rows have the same shape: lib/town/catalog). */
export interface MarketFacts {
  items: Record<string, { kind: ItemKind; tier: number; pays: number }>;
  goods: Record<string, { price: number } | undefined>;
  fish: Record<string, { baits: Partial<Record<string, number>> } | undefined>;
  flotsam: Record<string, { on?: string[] } | undefined>;
  crops: Record<string, { seed: string; yield: [number, number]; picks?: number | null } | undefined>;
  baits: string[];
  kept: string[];
}
/** Those facts as this code has them. */
export const factsOf = (): MarketFacts => ({ items: ITEMS, goods: GOODS, fish: FISH, flotsam: FLOTSAM, crops: CROPS, baits: BAITS, kept: KEPT_BAITS });

/** What a bait costs a line: the stall's price, or what the relatives pay for one the stall does not sell. One that is not used up costs a line nothing, and is not counted. */
const baitCost = (id: string, c: MarketFacts): number | null => (c.kept.includes(id) ? null : c.goods[id]?.price ?? c.items[id]?.pays ?? 0);
/** What a thing costs to come by, in coins paid: the seed by what the plant gives, the cheapest bait the fish takes; nothing for what is found. */
export function costOf(id: string, c: MarketFacts): number {
  const it = c.items[id];
  if (!it) return 0;
  if (it.kind === "crop") {
    const crop = c.crops[id];
    return crop ? (c.goods[crop.seed]?.price ?? 0) / ((crop.picks ?? 1) * (crop.yield[0] + crop.yield[1]) / 2) : 0;
  }
  if (it.kind === "fish" || it.kind === "catch") {
    const takes = it.kind === "fish" ? Object.keys(c.fish[id]?.baits ?? {}) : c.flotsam[id]?.on ?? c.baits;
    const costs = c.baits.filter((b) => takes.includes(b)).map((b) => baitCost(b, c)).filter((x): x is number => x !== null);
    return costs.length ? Math.min(...costs) : 0;
  }
  return 0;
}

/** A thing whose price moves: its usual amount a head a round, and the least and the most its price is, in hundredths of the usual one. Null for a thing with one price. */
export interface Thing { usual: number; floor: number; ceil: number }
export function thingOf(id: string, c: MarketFacts, k: MarketKnobs = MARKET): Thing | null {
  const it = c.items[id], coins = it ? k.usual[it.kind] : undefined;
  if (!it || !(it.pays > 0) || c.goods[id] || coins === undefined) return null;
  const floor = it.kind === "dish" || it.kind === "goods" ? k.made : Math.min(100, Math.max(k.floor, Math.ceil(costOf(id, c) * k.margin / it.pays)));
  return { usual: coins / it.pays, floor, ceil: k.ceil[it.tier - 1] ?? k.ceil[k.ceil.length - 1] };
}
/** Every thing whose price moves, as the catalog lists them. */
export const movingOf = (c: MarketFacts, k: MarketKnobs = MARKET): string[] => Object.keys(c.items).filter((id) => thingOf(id, c, k) !== null);

/** Where a thing's price stands: `f` hundredths of its usual price; and `m`, how much of it the village has been selling a round, as it is remembered. */
export interface Standing { f: number; m: number }
/** A round on: so many were sold in the round that ended, against the usual amount (for the whole village). */
export function next(st: Standing, sold: number, usual: number, floor: number, ceil: number, k: MarketKnobs = MARKET): Standing {
  const mem = k.memory / 100, m = (1 - mem) * st.m + mem * sold;
  const want = Math.min(ceil, Math.max(floor, 100 * Math.pow(usual / Math.max(m, usual / 100), k.bend / 100)));
  const f = want < st.f ? Math.max(want, st.f * (1 - k.fall / 100)) : Math.min(want, st.f * (1 + k.rise / 100));
  return { f: Math.floor(f + 0.5), m };
}

/** The market, as the village keeps it: the round the prices are of, where each thing's stands, and what has been left to be sold so far this round. */
export interface Market {
  round: number;
  at: Record<string, Standing>;
  sold: Record<string, number>;
}
export const newMarket = (round: number): Market => ({ round, at: {}, sold: {} });
/** A round as it is written down when it ends: for each thing that was sold or whose price was not the usual one, the price it had and how many were sold. */
export type Logged = [round: number, things: Record<string, [f: number, sold: number]>];

/**
 * The market brought to a round: each round gone by since it was kept moves every price once (what was left in the
 * first of them is what was sold; nothing in the rest), and is written down. `heads` is how many the village is
 * counted as. A market left alone for a long while is moved through as many rounds as it takes anything to settle.
 */
export function rolled(market: Market, round: number, heads: number, c: MarketFacts, k: MarketKnobs = MARKET): { market: Market; log: Logged[] } {
  if (round <= market.round) return { market, log: [] };
  const ids = movingOf(c, k), log: Logged[] = [], steps = Math.min(round - market.round, 2 * k.lately);
  let at = market.at;
  for (let i = 0; i < steps; i++) {
    const was = at, now: Record<string, Standing> = {}, things: Logged[1] = {};
    for (const id of ids) {
      const t = thingOf(id, c, k)!, st = was[id] ?? { f: 100, m: t.usual * heads }, sold = i === 0 ? market.sold[id] ?? 0 : 0;
      now[id] = next(st, sold, t.usual * heads, t.floor, t.ceil, k);
      if (sold > 0 || st.f !== 100) things[id] = [st.f, sold];
    }
    log.push([market.round + i, things]);
    at = now;
  }
  return { market: { round, at, sold: {} }, log };
}

/** The price of a thing now, in hundredths of its usual one: 100 for a thing with one price, and for one nobody has sold yet. */
export const factorOf = (market: Market, id: string): number => market.at[id]?.f ?? 100;
/** So many more of a thing left to be sold this round (fewer, when some are taken back). */
export function counted(market: Market, id: string, n: number): Market {
  const left = Math.max(0, (market.sold[id] ?? 0) + n);
  return { ...market, sold: { ...market.sold, [id]: left } };
}
/** What so many of a thing fetch at a price: whole coins, the odd part lost. */
export const worth = (n: number, pays: number, f: number) => Math.floor((n * pays * f) / 100);

/**
 * What a member is told of a thing's price: where it stands this round, the least and the most it is ever (all in
 * hundredths of the usual one), and the rounds of the last seven days as they ended, the oldest first: the round, the
 * price it had, and how many the village sold in it.
 */
export interface PriceTold { f: number; floor: number; ceil: number; was: Array<[round: number, f: number, sold: number]> }
/** …and of prices: the round they are of, and each thing I hold or have left with the uncle whose price moves. Of nothing else: what I do not hold has no price here. */
export interface PricesTold { round: number; things: Record<string, PriceTold> }
/** Before anything has been told (and where the price does not move yet): every thing at its usual price, and no graph. */
export const NO_PRICES: PricesTold = { round: 0, things: {} };
export function pricesTold(market: Market, log: Logged[], held: string[], c: MarketFacts, k: MarketKnobs = MARKET): PricesTold {
  const lately = log.filter(([round]) => round >= market.round - k.lately && round < market.round).sort((a, b) => a[0] - b[0]);
  const things: PricesTold["things"] = {};
  for (const id of new Set(held)) {
    const t = thingOf(id, c, k);
    if (t) things[id] = { f: factorOf(market, id), floor: t.floor, ceil: t.ceil, was: lately.map(([round, doc]) => [round, doc[id]?.[0] ?? 100, doc[id]?.[1] ?? 0]) };
  }
  return { round: market.round, things };
}
