import { WATER } from "./farm";
import type { ItemId } from "./items";
import { dayOf } from "./stamina";
import { no, put, roomFor, roundOf, type Done, type Purse } from "./trade";
import { natureOf, pouredIn, type Nature, type WellWater } from "./waters";

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
 * Since the third round of the same (2026-10-05) water goes two more ways,
 * and the book follows both: **a bucket poured over a bed** (lib/town/ditch)
 * is the pourer's own water on every plant it reaches, and counts towards
 * their rank like a bucketful into the well; **a bucket poured into the
 * cooking yard's jar** (lib/town/yard) is kept lot by lot like the well's,
 * and a pot cooked with it is a line of what came of that carrier's water.
 *
 * Since the fourth round a bucketful may come by several hands (lib/town/
 * line: a bucket line). **Everybody whose hands it went through has carried
 * it**: when it is poured, wherever, each of them is counted the bucketful as
 * the pourer is (their rank, the day's carriers, their work at the jar).
 * Whose water it was stays the pourer's.
 *
 * Since the fifth, water has a nature by the moment it was drawn (lib/town/
 * waters): a bucket keeps the nature of its water, hands it on with it, and
 * poured into the well gives it to the well for a while. The book says what
 * the well's water is now, and whose doing.
 *
 * Pure. The database keeps the same (v127, v129, v130, v132, v133): a trigger
 * reads each line of `town_deeds` as it is written and does what `seen` does
 * here.
 */
export const WELL_BOOK = {
  /** The bucketfuls poured into the well, all told, at which each rank begins. */
  ranks: [50, 200, 600],
  /** What the well has for whoever reaches a rank: the rank, and the thing. (The cart came later, lib/town/cart: whoever had passed its rank by then finds it waiting.) */
  gifts: [[1, "waterYoke"], [2, "waterCart"], [3, "waterYokeGreat"]] as Array<[number, ItemId]>,
  /** How many of the day's carriers the book lists. */
  listed: 40,
};

/** What a carrier of each rank is called, under their own name: the first rank to the last. */
export const RANK_TITLES: Array<[th: string, en: string]> = [["คนหาบน้ำ", "Water carrier"], ["คนหาบน้ำมือฉมัง", "Seasoned carrier"], ["ผู้ดูแลบ่อน้ำ", "Keeper of the well"]];

/**
 * A deed with water, as it is written down (the database's `town_deeds`): who, when, what; how many bucketfuls were
 * poured, the can filled or watered with, the plot, and whose plant it was when not one's own. And a seed sown, which
 * is no water: a plot sown anew begins with nobody having helped its plant. Since the third round: a bucket poured over
 * a bed (`ditch`: so many bucketfuls, for so many `plants`, each of which is then written as a watering with that
 * bucket), a bucket poured into the yard's jar (`yard`), and a pot cooked with a bucketful of the jar's (`fresh`: by
 * the cook). Since the fourth: a bucket drawn at the river (`draw`: nobody's hands are on its water yet) and one
 * handed on (`pass`: from which bucket, `to` whom, `into` which of theirs). Since the fifth a bucket drawn says the
 * nature of its water, when it has one (`kind`: the database works it out from the moment and the sky).
 */
export interface WaterDeed {
  by: string;
  at: number;
  what: "pour" | "fill" | "water" | "sow" | "ditch" | "yard" | "fresh" | "draw" | "pass";
  /** Poured: how many bucketfuls went in (or over the bed). Filled: how many the can took of the well. */
  n?: number;
  /** Poured over a bed: how many plants it watered. */
  plants?: number;
  /** Filled, or watered with: which can; or which bucket was drawn, handed on, poured (into the well, over a bed, into the yard's jar). */
  can?: string;
  /** Handed on: to whom, and into which bucket of theirs. */
  to?: string;
  into?: string;
  /** Drawn: the nature of the water, when it has one. */
  kind?: Nature;
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
  /**
   * Who has helped the plant in each plot since it was sown (lib/town/thanks): whose plant it is, and for each helper
   * how many times they watered it and how many waterings of it were of water they carried.
   */
  help: Record<string, { owner: string; by: Record<string, { water: number; carry: number }> }>;
  /** What each did for the others in each of the uncle's rounds (lib/town/jar): bucketfuls poured, and waterings of other people's plants. */
  work: Record<string, Record<string, { buckets: number; waterings: number }>>;
  /** The water in the cooking yard's jar (lib/town/yard), the oldest first: whose each lot is, and how many bucketfuls of it are left. */
  yard: Array<{ by: string | null; left: number }>;
  /** The pots cooked with each carrier's water on each day: by the day and the carrier, how many to a cook. */
  pots: Record<string, Record<string, number>>;
  /** Whose hands the water in a bucket has been through (lib/town/line): by who holds the bucket and which it is, in the order it came by them, the holder last. A bucket drawn at the river has none. */
  line: Record<string, string[]>;
  /** The nature of the water in a bucket, when it has one (lib/town/waters): by who holds the bucket and which it is. */
  kinds: Record<string, Nature>;
  /** The well's water when a nature was last poured into it: which, until when, by whom. */
  wellWater: WellWater | null;
}
export const newLog = (): WellLog => ({ water: [], cans: {}, carriers: {}, days: {}, reach: {}, hands: {}, help: {}, work: {}, yard: [], pots: {}, line: {}, kinds: {}, wellWater: null });
/** How many of those whose hands the water went through are remembered: the last so many (lib/town/line's own number, kept here so that the book does not hang on the map). */
export const LINE_HANDS = 8;

const canKey = (by: string, can: string) => `${by}/${can}`;
const dayKey = (day: number, who: string) => `${day}/${who}`;
const plotOf = (tile: [number, number]) => `${tile[0]},${tile[1]}`;
function worked(work: WellLog["work"], round: number, who: string, buckets: number, waterings: number): WellLog["work"] {
  const all = work[round] ?? {}, mine = all[who] ?? { buckets: 0, waterings: 0 };
  return { ...work, [round]: { ...all, [who]: { buckets: mine.buckets + buckets, waterings: mine.waterings + waterings } } };
}
function helped(help: WellLog["help"], plot: string, owner: string, who: string, how: "water" | "carry"): WellLog["help"] {
  // (a plant of somebody else's than the one the plot's helpers helped: theirs are forgotten)
  const was = help[plot]?.owner === owner ? help[plot] : { owner, by: {} }, mine = was.by[who] ?? { water: 0, carry: 0 };
  return { ...help, [plot]: { owner, by: { ...was.by, [who]: { ...mine, [how]: mine[how] + 1 } } } };
}

/**
 * The log after so many bucketfuls were poured out of a bucket: everybody else whose hands that water went through is
 * counted them too (their rank, the day's carriers, their work in the round).
 */
function counted(log: WellLog, d: WaterDeed, n: number): WellLog {
  const others = (d.can ? log.line[canKey(d.by, d.can)] ?? [] : []).filter((h) => h !== d.by);
  if (!others.length || n <= 0) return log;
  const day = dayOf(d.at), round = roundOf(d.at);
  let { carriers, work } = log, today = log.days[day] ?? {};
  for (const h of others) {
    const was = carriers[h] ?? { buckets: 0, taken: [] }, mine = today[h] ?? { buckets: 0, first: d.at };
    carriers = { ...carriers, [h]: { ...was, buckets: was.buckets + n } };
    today = { ...today, [h]: { ...mine, buckets: mine.buckets + n } };
    work = worked(work, round, h, n, 0);
  }
  return { ...log, carriers, work, days: { ...log.days, [day]: today } };
}

/** The log after a deed with water. */
export function seen(log: WellLog, d: WaterDeed): WellLog {
  const day = dayOf(d.at), round = roundOf(d.at);
  if (d.what === "draw") {
    // a bucket drawn at the river: nobody's hands are on its water but the drawer's own, and it has the nature of the moment, or none
    if (!d.can) return log;
    const key = canKey(d.by, d.can);
    if (!(key in log.line) && !(key in log.kinds) && !d.kind) return log;
    const line = { ...log.line }, kinds = { ...log.kinds };
    delete line[key];
    if (d.kind) kinds[key] = d.kind; else delete kinds[key];
    return { ...log, line, kinds };
  }
  if (d.what === "pass") {
    if (!d.can || !d.to || !d.into || Math.floor(d.n ?? 0) <= 0) return log;
    // the hands it came by, and whoever takes it last (once): only the last so many are remembered
    const was = log.line[canKey(d.by, d.can)] ?? [d.by], hands = [...was.filter((h) => h !== d.to), d.to].slice(-LINE_HANDS);
    // (the water's nature goes with it)
    const kind = log.kinds[canKey(d.by, d.can)], kinds = { ...log.kinds };
    if (kind) kinds[canKey(d.to, d.into)] = kind; else delete kinds[canKey(d.to, d.into)];
    return { ...log, line: { ...log.line, [canKey(d.to, d.into)]: hands }, kinds };
  }
  if (d.what === "sow") {
    if (!d.tile || !(plotOf(d.tile) in log.help)) return log;
    const help = { ...log.help };
    delete help[plotOf(d.tile)];
    return { ...log, help };
  }
  if (d.what === "pour") {
    const n = Math.floor(d.n ?? 0);
    if (n <= 0) return log;
    const was = log.carriers[d.by] ?? { buckets: 0, taken: [] }, today = log.days[day] ?? {}, mine = today[d.by] ?? { buckets: 0, first: d.at };
    // (water with a nature gives it to the well for a while: lib/town/waters)
    const kind = d.can ? log.kinds[canKey(d.by, d.can)] : undefined;
    return counted({
      ...log,
      ...(kind ? { wellWater: pouredIn(log.wellWater, kind, n, d.by, d.at) } : {}),
      water: [...log.water, { by: d.by, left: n }],
      carriers: { ...log.carriers, [d.by]: { ...was, buckets: was.buckets + n } },
      days: { ...log.days, [day]: { ...today, [d.by]: { ...mine, buckets: mine.buckets + n } } },
      work: worked(log.work, round, d.by, n, 0),
    }, d, n);
  }
  if (d.what === "ditch" || d.what === "yard") {
    const n = Math.floor(d.n ?? 0);
    if (n <= 0 || (d.what === "ditch" && !d.can)) return log;
    // carried all the same: it counts towards the rank, and among the day's carriers
    const was = log.carriers[d.by] ?? { buckets: 0, taken: [] }, today = log.days[day] ?? {}, mine = today[d.by] ?? { buckets: 0, first: d.at };
    const next = { ...log, carriers: { ...log.carriers, [d.by]: { ...was, buckets: was.buckets + n } }, days: { ...log.days, [day]: { ...today, [d.by]: { ...mine, buckets: mine.buckets + n } } } };
    // over a bed: the bucket is a can of the pourer's own water, for the plants it reached (each is written as a watering next)
    if (d.what === "ditch") return counted({ ...next, cans: { ...log.cans, [canKey(d.by, d.can!)]: { by: d.by, left: Math.max(0, Math.floor(d.plants ?? 0)) } } }, d, n);
    // into the yard's jar: a lot of its water, and work done for the others
    return counted({ ...next, yard: [...log.yard, { by: d.by, left: n }], work: worked(log.work, round, d.by, n, 0) }, d, n);
  }
  if (d.what === "fresh") {
    // a bucketful of the oldest water the jar has; a pot of somebody else's cooked with it is a line of what came of that carrier's water
    const [first, ...rest] = log.yard;
    if (!first) return log;
    const yard = first.left > 1 ? [{ ...first, left: first.left - 1 }, ...rest] : rest;
    if (!first.by || first.by === d.by) return { ...log, yard };
    const key = dayKey(day, first.by), cooks = log.pots[key] ?? {};
    return { ...log, yard, pots: { ...log.pots, [key]: { ...cooks, [d.by]: (cooks[d.by] ?? 0) + 1 } } };
  }
  if (d.what === "fill") {
    if (!d.can) return log;
    // so many bucketfuls of the oldest water there is: as many as the filling took of the well (`n`; one where the deed
    // says none: a filling took one until 2026-10-07). The can's water is of whoever carried the oldest of them; of
    // nobody's, when the book knows of none
    const first = log.water[0];
    let water = log.water;
    for (let n = Math.max(1, Math.floor(d.n ?? 1)); n > 0 && water.length; n--) { const [head, ...rest] = water; water = head.left > 1 ? [{ ...head, left: head.left - 1 }, ...rest] : rest; }
    return { ...log, water, cans: { ...log.cans, [canKey(d.by, d.can)]: { by: first?.by ?? null, left: WATER.cans[d.can as ItemId] ?? 0 } } };
  }
  // a plant watered: with whose water, and whose plant
  const owner = d.whose ?? d.by, plot = d.tile ? plotOf(d.tile) : null;
  let next = log;
  if (owner !== d.by) {
    const key = dayKey(day, d.by), mine = log.hands[key] ?? {};
    next = {
      ...next, hands: { ...log.hands, [key]: { ...mine, [owner]: (mine[owner] ?? 0) + 1 } },
      work: worked(log.work, round, d.by, 0, 1), help: plot ? helped(log.help, plot, owner, d.by, "water") : log.help,
    };
  }
  const can = d.can ? log.cans[canKey(d.by, d.can)] : undefined;
  if (!can || can.left <= 0 || !d.can) return next;
  next = { ...next, cans: { ...next.cans, [canKey(d.by, d.can)]: { ...can, left: can.left - 1 } } };
  if (!can.by || can.by === owner || !plot) return next;
  const key = dayKey(day, can.by), plots = next.reach[key] ?? {};
  return { ...next, reach: { ...next.reach, [key]: { ...plots, [plot]: { owner, n: (plots[plot]?.n ?? 0) + 1 } } }, help: helped(next.help, plot, owner, can.by, "carry") };
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
  /**
   * Today: the bucketfuls I poured; the waterings that were of my water, of how many plants, of how many people's; the
   * plants of others I watered myself, and for how many people; and, when there are any (the yard's jar: of none the
   * book says nothing, as it said nothing before there was a jar), the pots cooked with my water, and for how many cooks.
   */
  today: { buckets: number; waterings: number; plants: number; people: number; watered: number; helped: number; pots?: number; cooks?: number };
  /** Today's carriers, in the order they came: who, by name, how many bucketfuls, and their rank. */
  carriers: Array<{ id: string; name: string; buckets: number; rank: number }>;
  /** The well's water, while it has a nature (lib/town/waters): which, until when, and who brought it (the last to pour some of it in). */
  water?: { kind: Nature; until: number; by: string; name: string };
}

/** The book as somebody reads it at a moment. `nameOf` gives a carrier's name. */
export function bookOf(log: WellLog, me: string, now: number, nameOf: (id: string) => string): WellBook {
  const day = dayOf(now), mine = log.carriers[me] ?? { buckets: 0, taken: [] };
  const reached = Object.values(log.reach[dayKey(day, me)] ?? {}), hands = log.hands[dayKey(day, me)] ?? {};
  const today = Object.entries(log.days[day] ?? {}).sort((a, b) => a[1].first - b[1].first || (a[0] < b[0] ? -1 : 1));
  const pots = Object.values(log.pots[dayKey(day, me)] ?? {});
  return {
    buckets: mine.buckets, rank: rankOf(mine.buckets), towards: towards(mine.buckets), gift: !!dueOf(mine.buckets, mine.taken),
    today: {
      buckets: log.days[day]?.[me]?.buckets ?? 0,
      waterings: reached.reduce((t, r) => t + r.n, 0), plants: reached.length, people: new Set(reached.map((r) => r.owner)).size,
      watered: Object.values(hands).reduce((t, n) => t + n, 0), helped: Object.keys(hands).length,
      ...(pots.length ? { pots: pots.reduce((t, n) => t + n, 0), cooks: pots.length } : {}),
    },
    carriers: today.slice(0, WELL_BOOK.listed).map(([id, c]) => ({ id, name: nameOf(id), buckets: c.buckets, rank: rankOf(log.carriers[id]?.buckets ?? 0) })),
    ...(log.wellWater && natureOf(log.wellWater, now) ? { water: { kind: log.wellWater.kind, until: log.wellWater.until, by: log.wellWater.by, name: nameOf(log.wellWater.by) } } : {}),
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
