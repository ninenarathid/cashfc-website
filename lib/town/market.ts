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
 *   other things: so many coins' worth a head a round, by its kind, buffered
 *   by at least one harvest or five units. "A head" is a member who
 *   has done anything in the town lately, so that more members do not sink
 *   prices by being there.
 * - **Buyer interest has busy and quiet periods** on different 5–7 day
 *   cycles. The next price combines that interest with shared selling.
 *   Hoarding does not guarantee a higher price, even if nobody sells.
 * - **It moves further down than up**: at most 40% down or 35% up per
 *   round. New selling contributes 65% of the remembered volume.
 * - **Never under what the thing costs to come by, and half as much again**
 *   (the seed at the stall by what a plant gives; the cheapest bait that takes
 *   the fish), nor under two fifths of its usual price. What is cooked or made
 *   never falls below its base: it has its makings' cost in it.
 * - **The plainer the thing, the higher it may rise**: 220% for the first
 *   tier, 200% for the second and 180% for the third.
 * - **What the uncle sells himself has one price** (he buys his own goods
 *   back at half: a price that rose would be coins for nothing), and so have
 *   tools, seeds and scrolls. Crafted staples can move, with the same base
 *   floor as meals; bought staples keep their fixed buyback price.
 * - **History records the base of each round**. An old percentage without
 *   its original base is not an actual historical coin price.
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
  ceil: [220, 200, 180],
  /** How far a price moves in a round at the most, in hundredths of itself. */
  fall: 40,
  rise: 35,
  /** How much of what was sold this round is remembered against what was remembered before, in hundredths. */
  memory: 65,
  /** How strongly buyer interest and remembered supply affect equilibrium, in hundredths. */
  bend: 100,
  /** One ordinary batch can be sold without treating a single rare item as a glut. */
  minVolume: 5,
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
  usual: { crop: 15, fish: 8, catch: 5, dish: 8, goods: 8, staple: 8, wild: 8, bug: 4 } as Partial<Record<ItemKind, number>>,
  /**
   * Crops, by rules of their own since v285 (the owner, 2026-10-19, after members said a crop sold only a few times
   * fell hard: "1-3 เอา", "ยังไม่ปิด แต่ให้ตกช้ากว่านี้หน่อย", "เพิ่มเฉพาะ สายปลูกผัก เพราะสายนี้ ต้องลงทุนเงิน และ เวลาเยอะ").
   * A usual amount in coins made a dear crop's market thin: at forty heads a village took two hundred kangkong a round
   * at their usual price, and five bottle gourds, blue corn or trellis berries (the batch's least), so that one
   * member's harvest of a few plants (46 bottle gourds in one round, read live) halved its price for everybody, and
   * the dearest crops, which a good planner grows, fetched the least for it.
   * - `cropAnchor`: a crop dearer than this many coins is usual in sqrt(pays / anchor) times the pieces its coins'
   *   worth alone would say; a cheaper one as before (kangkong, 3, as before: 200 a round at forty heads; tomato 122
   *   where it was 75, red okra 53 where 14, pumpkin 33, bottle gourd 31, blue corn 27, trellis berry 25 where 5).
   * - `cropCeil`: the most a crop's price rises to, whatever its tier (220, 200 and 180 before): an unsold crop no
   *   longer stands at twice its price to drop at the first sales.
   * - `cropFall`: how far a crop's price falls in a round at the most (40 before, as every other thing's still is).
   * The buyers' interest moves crops as before (the owner: not closed).
   */
  cropAnchor: 3,
  cropCeil: 150,
  cropFall: 25,
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

/** Per-head reference volume, one minimum batch, and its price band; and, for a crop, how far it falls in a round at the most (`MARKET.cropFall`; every other thing `MARKET.fall`). */
export interface Thing { usual: number; floor: number; ceil: number; batch: number; fall?: number }
export function thingOf(id: string, c: MarketFacts, k: MarketKnobs = MARKET): Thing | null {
  const it = c.items[id], coins = it ? k.usual[it.kind] : undefined;
  if (!it || !(it.pays > 0) || c.goods[id] || coins === undefined) return null;
  const floor = it.kind === "dish" || it.kind === "goods" || it.kind === "staple" ? k.made : Math.min(100, Math.max(k.floor, Math.ceil(costOf(id, c) * k.margin / it.pays)));
  const crop = c.crops[id];
  const batch = Math.max(k.minVolume, crop ? (crop.yield[0] + crop.yield[1]) / 2 : 1);
  // (a crop: its usual amount less steep against its price, a ceiling and a fall of its own: MARKET.cropAnchor, v285)
  if (it.kind === "crop") return { usual: (coins / it.pays) * Math.max(1, Math.sqrt(it.pays / k.cropAnchor)), floor, ceil: k.cropCeil, batch, fall: k.cropFall };
  return { usual: coins / it.pays, floor, ceil: k.ceil[it.tier - 1] ?? k.ceil[k.ceil.length - 1], batch };
}
/** Every thing whose price moves, as the catalog lists them. */
export const movingOf = (c: MarketFacts, k: MarketKnobs = MARKET): string[] => Object.keys(c.items).filter((id) => thingOf(id, c, k) !== null);

/** Where a thing's price stands: `f` hundredths of its usual price; and `m`, how much of it the village has been selling a round, as it is remembered. */
export interface Standing { f: number; m: number }
/** A round on: so many were sold in the round that ended, against the usual amount (for the whole village). `fall`: the thing's own, a crop's (`Thing.fall`), where it has one. */
export function next(st: Standing, sold: number, usual: number, floor: number, ceil: number, k: MarketKnobs = MARKET, demand = 100, fall = k.fall): Standing {
  const mem = k.memory / 100, m = (1 - mem) * st.m + mem * sold;
  // A reference batch buffers tiny volumes. An empty market can cool again when
  // buyers lose interest; zero sales no longer guarantee a permanent ceiling.
  const want = Math.min(ceil, Math.max(floor, 100 * Math.pow((2 * usual * demand / 100) / (m + usual), k.bend / 100)));
  const f = want < st.f ? Math.max(want, st.f * (1 - fall / 100)) : Math.min(want, st.f * (1 + k.rise / 100));
  return { f: Math.floor(f + 0.5), m };
}

/** The market, as the village keeps it: the round the prices are of, where each thing's stands, and what has been left to be sold so far this round. */
export interface Market {
  round: number;
  at: Record<string, Standing>;
  sold: Record<string, number>;
  /** How many heads the village was counted as when the round turned (the database keeps it since v285, for the farm's prices to tell a usual amount by). */
  heads?: number;
}
export const newMarket = (round: number): Market => ({ round, at: {}, sold: {} });
/** Every moving item's completed round: factor, shared sales, and its base then (unknown in legacy logs). */
export type Logged = [round: number, things: Record<string, [f: number, sold: number, base?: number]>];

const DEMAND_WAVE = [100, 115, 135, 155, 135, 110, 85, 65, 45, 65, 85, 100] as const;
/** Public buyer interest, on a distinct 5–7 day cycle for each item. Not a price forecast. */
export function marketDemand(id: string, round: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) % 2_147_483_647;
  const period = 10 + hash % 5, phase = Math.floor(hash / 5) % period;
  const turn = ((round + phase) % period + period) % period;
  return DEMAND_WAVE[Math.floor(turn * DEMAND_WAVE.length / period)];
}

/**
 * The market brought to a round: each round gone by since it was kept moves every price once (what was left in the
 * first of them is what was sold; nothing in the rest), and is written down. `heads` is how many the village is
 * counted as. A market left alone for a long while is moved through as many rounds as it takes anything to settle.
 */
export function rolled(market: Market, round: number, heads: number, c: MarketFacts, k: MarketKnobs = MARKET): { market: Market; log: Logged[] } {
  if (round <= market.round) return { market, log: [] };
  const ids = movingOf(c, k), log: Logged[] = [], steps = Math.min(round - market.round, 2 * k.lately);
  const start = round - steps;
  let at = market.at;
  if (start > market.round) {
    const retention = 1 - k.memory / 100, skipped = start - market.round;
    at = Object.fromEntries(ids.map(id => {
      const t = thingOf(id, c, k)!, st = at[id] ?? { f: 100, m: Math.max(t.usual * heads, t.batch) };
      const memory = skipped > 2 * k.lately ? 0 : (retention * st.m + (1 - retention) * (market.sold[id] ?? 0)) * retention ** (skipped - 1);
      return [id, { f: st.f, m: memory }];
    }));
  }
  for (let i = 0; i < steps; i++) {
    const was = at, now: Record<string, Standing> = {}, things: Logged[1] = {};
    for (const id of ids) {
      const t = thingOf(id, c, k)!, usual = Math.max(t.usual * heads, t.batch);
      const st = was[id] ?? { f: 100, m: usual }, sold = i === 0 && start === market.round ? market.sold[id] ?? 0 : 0;
      now[id] = next(st, sold, usual, t.floor, t.ceil, k, marketDemand(id, start + i + 1), t.fall);
      // Store the base used in this round; later balance changes must never
      // relabel an old percentage as a coin price that was never available.
      things[id] = [st.f, sold, c.items[id].pays];
    }
    log.push([start + i, things]);
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
/** Unknown old bases stay unknown; never replace them with today's catalog. */
export const historicalPrice = (base: number | null | undefined, f: number): number | null => base == null ? null : Math.round(base * f) / 100;

/**
 * What a member is told of a thing's price: where it stands this round, the least and the most it is ever (all in
 * hundredths of the usual one), and the rounds of the last seven days as they ended, the oldest first: the round, the
 * price it had, and how many the village sold in it.
 */
export interface PriceTold { f: number; floor: number; ceil: number; base?: number; demand?: number; demandTrend?: number; was: Array<[round: number, f: number, sold: number, base?: number | null]>;
  /** (the farm's, v285) the whole village's usual amount a round at the heads it is counted as, whole pieces; and how many have been left with the uncle so far this round */
  usual?: number; selling?: number }
/** The displayed offer, checked again under the purse/world locks on deposit. */
export interface MarketQuote { item: string; round: number; f: number; base: number }
/** …and of prices: the round they are of, and each thing I hold or have left with the uncle whose price moves. Of nothing else: what I do not hold has no price here. */
export interface PricesTold { round: number; things: Record<string, PriceTold> }
/** Before anything has been told (and where the price does not move yet): every thing at its usual price, and no graph. */
export const NO_PRICES: PricesTold = { round: 0, things: {} };
export function pricesTold(market: Market, log: Logged[], held: string[], c: MarketFacts, k: MarketKnobs = MARKET): PricesTold {
  const lately = log.filter(([round]) => round >= market.round - k.lately && round < market.round).sort((a, b) => a[0] - b[0]);
  const things: PricesTold["things"] = {};
  for (const id of new Set(held)) {
    const t = thingOf(id, c, k);
    if (t) things[id] = { f: factorOf(market, id), floor: t.floor, ceil: t.ceil, base: c.items[id].pays,
      demand: marketDemand(id, market.round), demandTrend: Math.sign(marketDemand(id, market.round) - marketDemand(id, market.round - 1)),
      was: lately.map(([round, doc]) => [round, doc[id]?.[0] ?? 100, doc[id]?.[1] ?? 0, doc[id]?.[2] ?? null]) };
  }
  return { round: market.round, things };
}
/**
 * Every crop's price this round, as the farm is told it whether one holds the crop or not (the owner, 2026-10-19:
 * "แสดงราคาที่ฟาร์ม ให้เห็นราคาตอนนี้ ราคาของแต่ละเกรด", after members said they could not see a price before picking):
 * what `pricesTold` tells of a thing held, without the days gone by. The database's public.town_farm_prices (v283).
 */
export function farmPricesOf(market: Market, c: MarketFacts, k: MarketKnobs = MARKET): PricesTold {
  const told = pricesTold(market, [], Object.keys(c.items).filter((id) => c.items[id].kind === "crop"), c, k), heads = market.heads ?? k.heads;
  // (v285: the whole village's usual amount a round, and what has been left so far: "ขายเกินนี้ ราคารอบหน้าจะลง")
  for (const [id, t] of Object.entries(told.things)) {
    const thing = thingOf(id, c, k)!;
    told.things[id] = { ...t, usual: Math.floor(Math.max(thing.usual * heads, thing.batch) + 0.5), selling: market.sold[id] ?? 0 };
  }
  return told;
}
