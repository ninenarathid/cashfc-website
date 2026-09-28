/**
 * Popoto Market: the price board. Work in progress, admins only.
 *
 * An HQ Popoto is priced like gold at a gold shop. The reference is a real
 * price in the game, the latest tier of stat potion on Tonberry's market
 * board, and the site turns it into popoto at a rate an admin sets. Buying HQ
 * costs the mid rate; selling HQ back pays less, and the difference is burned
 * rather than kept by anybody.
 *
 *   mid  = potion price ÷ what one popoto is worth in gil
 *   sell = mid             popoto → HQ
 *   buy  = mid × (1 − spread)   HQ → popoto
 *
 * Nothing here is saved yet. The page shows the board from today's prices so
 * the settings can be tried before any of it is built on.
 */

/** One of the potions the price can follow. */
export interface Pot {
  key: PotKey;
  /** The item id on Tonberry's market board. */
  id: number;
  name: string;
}

export type PotKey = "STR" | "DEX" | "INT" | "MND";

/** What the board follows: one potion, or the average of all four. */
export type PegSource = PotKey | "avg";

/**
 * The newest tier of potion, Grade 4 Gemdraughts (ilvl 770).
 *
 * Four of the five, not all five. Vitality is barely traded on Tonberry (most
 * days nobody buys one), so a price read off it would be whatever the last
 * odd sale happened to be, and an average that includes it would be pulled
 * about by that one number.
 */
export const LATEST_POTS: Pot[] = [
  { key: "STR", id: 49234, name: "Grade 4 Gemdraught of Strength" },
  { key: "DEX", id: 49235, name: "Grade 4 Gemdraught of Dexterity" },
  { key: "INT", id: 49237, name: "Grade 4 Gemdraught of Intelligence" },
  { key: "MND", id: 49238, name: "Grade 4 Gemdraught of Mind" },
];

export const PEG_WORLD = "Tonberry";

/** The starting settings. All three will be an admin's to change. */
export const DEFAULT_PEG: PegSource = "STR";
export const DEFAULT_POPOTO_GIL = 200;
export const DEFAULT_SPREAD_PCT = 20;

/** The price the board follows, from the prices that could be read. */
export function pegPrice(
  prices: Partial<Record<PotKey, number>>, source: PegSource,
): number | null {
  if (source !== "avg") {
    const p = prices[source];
    return p && p > 0 ? p : null;
  }
  const got = LATEST_POTS.map((p) => prices[p.key]).filter((p): p is number => !!p && p > 0);
  return got.length ? got.reduce((s, p) => s + p, 0) / got.length : null;
}

/** The two numbers on the board, in popoto per HQ. */
export interface Board {
  mid: number;
  /** What one HQ costs, popoto → HQ. */
  sell: number;
  /** What one HQ pays back, HQ → popoto. */
  buy: number;
  /**
   * How far the potion has to rise before crafting HQ and selling it back
   * pays, as a fraction. Anything smaller and a round trip loses popoto.
   */
  breakEven: number;
}

export function board(price: number, popotoGil: number, spreadPct: number): Board | null {
  if (!(price > 0) || !(popotoGil > 0)) return null;
  const spread = Math.min(Math.max(spreadPct, 0), 99) / 100;
  const mid = price / popotoGil;
  return { mid, sell: mid, buy: mid * (1 - spread), breakEven: 1 / (1 - spread) - 1 };
}

/**
 * Today's HQ prices for the latest potions, from Universalis.
 *
 * The average of recent HQ sales on Tonberry, which is a fair stand-in for
 * the three-day median the board will really use. Universalis answers a
 * browser directly (it sends Access-Control-Allow-Origin: *), so this needs no
 * server of our own.
 */
export async function fetchPotPrices(): Promise<Partial<Record<PotKey, number>>> {
  const ids = LATEST_POTS.map((p) => p.id).join(",");
  const res = await fetch(`https://universalis.app/api/v2/aggregated/${PEG_WORLD}/${ids}`);
  if (!res.ok) throw new Error(`Universalis ${res.status}`);
  const body = (await res.json()) as {
    results?: { itemId: number; hq?: { averageSalePrice?: { world?: { price?: number } } } }[];
  };
  const out: Partial<Record<PotKey, number>> = {};
  for (const r of body.results ?? []) {
    const pot = LATEST_POTS.find((p) => p.id === r.itemId);
    const price = r.hq?.averageSalePrice?.world?.price;
    if (pot && price && price > 0) out[pot.key] = price;
  }
  return out;
}
