import { WATER } from "./farm";
import type { ItemId } from "./items";
import { dayOf } from "./stamina";
import { no, put, roomFor, type Done, type Purse } from "./trade";

/**
 * The well's book: whose water went where.
 *
 * Some members carry water for the others' sake: they draw it at the river,
 * walk it to the farm's well and pour it in, and somebody else's plants grow
 * of it. On the night every deed began to be written down (2026-10-05), four
 * members poured 42 bucketfuls in two and a half hours, two of them with no
 * plant of their own; of 321 waterings 279 were of somebody else's plant. The
 * game told none of them anything, and the owner asked for it to be made
 * worth their while ("ผู้เล่นบางคน เน้น support ผู้เล่นคนอื่นโดยการตักน้ำมาส่งให้เพื่อน … แต่เขาไม่ได้
 * รับอะไรตอบแทนเลย"). Not with coins: a walk of a minute paid for is a coin
 * faucet anybody's second character can turn, and kindness paid for is a job.
 * What was missing is being seen, and getting somewhere:
 *
 * - **The book** says what came of a carrier's water today: how many
 *   waterings were of it, of how many plants, of how many people's; and who
 *   carried today, by name, in the order they came. To say so, water is
 *   followed: the well's water is kept lot by lot, the oldest taken first; a
 *   can filled is of the lot it was filled from; a plant watered from that
 *   can was watered with that carrier's water.
 * - **Ranks**: so many bucketfuls poured, all told, and a carrier is one by
 *   name, for everybody to see over their head. Nothing says how many it
 *   takes: the book shows how far along one is.
 * - **A yoke**: at the first rank the well has one for its carrier, which
 *   carries two bucketfuls a trip; at the last a great one, which carries
 *   four. Things like any other: lent, held, never sold (they fetch nothing).
 *
 * Pure. The database keeps the same (v127): a trigger reads each line of
 * `town_deeds` as it is written and does what `seen` does here.
 */
export const WELL_BOOK = {
  /** The bucketfuls poured into the well, all told, at which each rank begins. */
  ranks: [50, 200, 600],
  /** What the well has for whoever reaches a rank: the rank, and the thing. */
  gifts: [[1, "waterYoke"], [3, "waterYokeGreat"]] as Array<[number, ItemId]>,
  /** How many of the day's carriers the book lists. */
  listed: 40,
};

/** What a carrier of each rank is called, under their own name: the first rank to the last. */
export const RANK_TITLES: Array<[th: string, en: string]> = [["คนหาบน้ำ", "Water carrier"], ["คนหาบน้ำมือฉมัง", "Seasoned carrier"], ["ผู้ดูแลบ่อน้ำ", "Keeper of the well"]];

/** A deed with water, as it is written down (the database's `town_deeds`): who, when, what; how many bucketfuls were poured, the can filled or watered with, the plot, and whose plant it was when not one's own. */
export interface WaterDeed {
  by: string;
  at: number;
  what: "pour" | "fill" | "water";
  /** Poured: how many bucketfuls went in. */
  n?: number;
  /** Filled, or watered with: which can. */
  can?: string;
  tile?: [number, number];
  whose?: string;
}

/** What is kept of the water. */
export interface WellLog {
  /** The well's water, the oldest first: whose each lot is (nobody's, for water from before the book) and how many bucketfuls of it are left. */
  water: Array<{ by: string | null; left: number }>;
  /** Whose water is in each can, by who holds it and which can it is, and the waterings left of it. */
  cans: Record<string, { by: string | null; left: number }>;
  /** Every carrier: the bucketfuls poured, all told, and the ranks whose gift was taken. */
  carriers: Record<string, { buckets: number; taken: number[] }>;
  /** Who poured on each day, and how much: by the day, then by the carrier, with the moment of their first. */
  days: Record<string, Record<string, { buckets: number; first: number }>>;
  /** What came of each carrier's water on each day: by the day and the carrier, the plots it reached, with whose plant and how many waterings. */
  reach: Record<string, Record<string, { owner: string; n: number }>>;
  /** The plants of other people each member watered on each day: by the day and the member, the waterings to an owner. */
  hands: Record<string, Record<string, number>>;
}
export const newLog = (): WellLog => ({ water: [], cans: {}, carriers: {}, days: {}, reach: {}, hands: {} });

const canKey = (by: string, can: string) => `${by}/${can}`;
const dayKey = (day: number, who: string) => `${day}/${who}`;

/** The log after a deed with water. */
export function seen(log: WellLog, d: WaterDeed): WellLog {
  const day = dayOf(d.at);
  if (d.what === "pour") {
    const n = Math.floor(d.n ?? 0);
    if (n <= 0) return log;
    const was = log.carriers[d.by] ?? { buckets: 0, taken: [] }, today = log.days[day] ?? {}, mine = today[d.by] ?? { buckets: 0, first: d.at };
    return {
      ...log,
      water: [...log.water, { by: d.by, left: n }],
      carriers: { ...log.carriers, [d.by]: { ...was, buckets: was.buckets + n } },
      days: { ...log.days, [day]: { ...today, [d.by]: { ...mine, buckets: mine.buckets + n } } },
    };
  }
  if (d.what === "fill") {
    if (!d.can) return log;
    // a bucketful of the oldest water there is; of nobody's, when the book knows of none
    const [first, ...rest] = log.water;
    const water = !first ? log.water : first.left > 1 ? [{ ...first, left: first.left - 1 }, ...rest] : rest;
    return { ...log, water, cans: { ...log.cans, [canKey(d.by, d.can)]: { by: first?.by ?? null, left: WATER.cans[d.can as ItemId] ?? 0 } } };
  }
  // a plant watered: with whose water, and whose plant
  const owner = d.whose ?? d.by;
  let next = log;
  if (owner !== d.by) {
    const key = dayKey(day, d.by), mine = log.hands[key] ?? {};
    next = { ...next, hands: { ...log.hands, [key]: { ...mine, [owner]: (mine[owner] ?? 0) + 1 } } };
  }
  const can = d.can ? log.cans[canKey(d.by, d.can)] : undefined;
  if (!can || can.left <= 0 || !d.can) return next;
  next = { ...next, cans: { ...next.cans, [canKey(d.by, d.can)]: { ...can, left: can.left - 1 } } };
  if (!can.by || can.by === owner || !d.tile) return next;
  const key = dayKey(day, can.by), plots = next.reach[key] ?? {}, plot = `${d.tile[0]},${d.tile[1]}`;
  return { ...next, reach: { ...next.reach, [key]: { ...plots, [plot]: { owner, n: (plots[plot]?.n ?? 0) + 1 } } } };
}

/** The rank so many bucketfuls make: none, or the first, the second, the third. */
export const rankOf = (buckets: number): number => WELL_BOOK.ranks.filter((at) => buckets >= at).length;
/** How far along from the rank one has to the next: from nothing to one; one at the last. */
export function towards(buckets: number): number {
  const rank = rankOf(buckets), from = rank ? WELL_BOOK.ranks[rank - 1] : 0, to = WELL_BOOK.ranks[rank];
  return to === undefined ? 1 : Math.max(0, Math.min(1, (buckets - from) / (to - from)));
}
/** What the well has waiting for somebody: the gift of the lowest rank they have reached and not taken. */
export function dueOf(buckets: number, taken: number[]): [number, ItemId] | null {
  const rank = rankOf(buckets);
  return WELL_BOOK.gifts.find(([at]) => at <= rank && !taken.includes(at)) ?? null;
}

/** What the book tells whoever opens it. */
export interface WellBook {
  /** All I have poured, my rank, how far towards the next, and whether the well has something for me. */
  buckets: number;
  rank: number;
  towards: number;
  gift: boolean;
  /** Today: the bucketfuls I poured; the waterings that were of my water, of how many plants, of how many people's; and the plants of others I watered myself, and for how many people. */
  today: { buckets: number; waterings: number; plants: number; people: number; watered: number; helped: number };
  /** Today's carriers, in the order they came: who, by name, how many bucketfuls, and their rank. */
  carriers: Array<{ id: string; name: string; buckets: number; rank: number }>;
}

/** The book as somebody reads it at a moment. `nameOf` gives a carrier's name. */
export function bookOf(log: WellLog, me: string, now: number, nameOf: (id: string) => string): WellBook {
  const day = dayOf(now), mine = log.carriers[me] ?? { buckets: 0, taken: [] };
  const reached = Object.values(log.reach[dayKey(day, me)] ?? {}), hands = log.hands[dayKey(day, me)] ?? {};
  const today = Object.entries(log.days[day] ?? {}).sort((a, b) => a[1].first - b[1].first || (a[0] < b[0] ? -1 : 1));
  return {
    buckets: mine.buckets, rank: rankOf(mine.buckets), towards: towards(mine.buckets), gift: !!dueOf(mine.buckets, mine.taken),
    today: {
      buckets: log.days[day]?.[me]?.buckets ?? 0,
      waterings: reached.reduce((t, r) => t + r.n, 0), plants: reached.length, people: new Set(reached.map((r) => r.owner)).size,
      watered: Object.values(hands).reduce((t, n) => t + n, 0), helped: Object.keys(hands).length,
    },
    carriers: today.slice(0, WELL_BOOK.listed).map(([id, c]) => ({ id, name: nameOf(id), buckets: c.buckets, rank: rankOf(log.carriers[id]?.buckets ?? 0) })),
  };
}

/** Everybody who has a rank, for the name over their head. */
export const ranksOf = (log: WellLog): Record<string, number> =>
  Object.fromEntries(Object.entries(log.carriers).map(([id, c]): [string, number] => [id, rankOf(c.buckets)]).filter(([, rank]) => rank > 0));

/** Take what the well has waiting: into the bag, if there is room. Gives the purse and the log as they are afterwards, and what was taken. */
export function takeGift(purse: Purse, log: WellLog, me: string): Done<{ purse: Purse; log: WellLog; gift: ItemId; rank: number }> {
  const mine = log.carriers[me], due = mine ? dueOf(mine.buckets, mine.taken) : null;
  if (!mine || !due) return no("none");
  const [rank, gift] = due;
  if (roomFor(purse.bag, gift) < 1) return no("full");
  return { ok: true, gift, rank, purse: { ...purse, bag: put(purse.bag, gift, 1) }, log: { ...log, carriers: { ...log.carriers, [me]: { ...mine, taken: [...mine.taken, rank] } } } };
}
