import { ITEMS, type ItemId } from "./items";
import { no, put, roomFor, roundOf, type Done, type Purse } from "./trade";
import type { WellLog } from "./well";

/**
 * The jar at the well.
 *
 * A way for whoever grows things to give something back to those who carry
 * their water and water their plants (the owner, 2026-10-05: they "ไม่ได้รับ
 * อะไรตอบแทนเลย"). A jar stands by the farm's well. Anybody drops coins into it,
 * or something from their bag. When the uncle's relatives next come by (the
 * rounds, lib/town/trade), what is in the jar is shared out among everybody
 * who worked for the others since the jar was last shared: by the bucketfuls
 * they poured into the well and the plants of other people they watered. Each
 * one's share waits at the jar until they take it.
 *
 * No coin is made by it: what one drops another is given, and every drop and
 * every share is written down. Nobody having worked, the jar keeps what it
 * has for the next time.
 *
 * Pure. The database keeps the same (v129).
 */
export const JAR = {
  /** How many waterings a bucketful poured counts as, when the jar is shared (a can filled from it waters eight plants). */
  bucket: 8,
  /** The kinds of thing that may be dropped in: what is grown, caught, cooked or made. Never a tool, a seed, a scroll. */
  kinds: ["crop", "fish", "dish", "goods", "catch", "staple"] as string[],
};

/** What is in the jar, and the round it was last shared in. Things in the order they were first dropped. */
export interface Jar { round: number; coins: number; things: Array<[ItemId, number]> }
/** What waits at the jar for each: coins, and things. */
export type Owed = Record<string, { coins: number; things: Array<[ItemId, number]> }>;
export const newJar = (round: number): Jar => ({ round, coins: 0, things: [] });
/** The jar as a page is told of it: what is in it, the moment it is next shared, and what waits for whoever asks. */
export interface JarTold extends Jar { next: number; mine: Owed[string] | null }

/** Whether a stack may be dropped in: a plain thing of a kind the jar takes (not a pot of food, not a bucket of water). */
export const mayDrop = (s: Purse["bag"][number]): boolean => !!s && JAR.kinds.includes(ITEMS[s.item].kind) && !s.of && !s.water;

const whole = (n: number) => Number.isInteger(n) && n > 0;
const add = (things: Array<[ItemId, number]>, id: ItemId, n: number): Array<[ItemId, number]> =>
  (things.some(([t]) => t === id) ? things.map(([t, k]): [ItemId, number] => (t === id ? [t, k + n] : [t, k])) : [...things, [id, n]]);

/** Drop coins into the jar, or so many of the thing in a slot. */
export function drop(purse: Purse, jar: Jar, what: { coins: number } | { slot: number; n: number }): Done<{ purse: Purse; jar: Jar }> {
  if ("coins" in what) {
    if (!whole(what.coins)) return no("amount");
    if (what.coins > purse.coins) return no("coins");
    return { ok: true, purse: { ...purse, coins: purse.coins - what.coins }, jar: { ...jar, coins: jar.coins + what.coins } };
  }
  const s = purse.bag[what.slot];
  if (!s) return no("none");
  if (!mayDrop(s)) return no("unwanted");
  if (!whole(what.n) || what.n > s.n) return no("amount");
  const bag = purse.bag.map((b, i) => (i !== what.slot ? b : s.n === what.n ? null : { ...s, n: s.n - what.n }));
  return { ok: true, purse: { ...purse, bag }, jar: { ...jar, things: add(jar.things, s.item, what.n) } };
}

/** What each did for the others from one round up to (not into) another, in waterings: a bucketful poured counts as so many. Only those who did something. */
export function workOf(well: WellLog, from: number, to: number): Array<[string, number]> {
  const sum = new Map<string, number>();
  for (const [round, all] of Object.entries(well.work)) {
    if (Number(round) < from || Number(round) >= to) continue;
    for (const [who, w] of Object.entries(all)) sum.set(who, (sum.get(who) ?? 0) + w.buckets * JAR.bucket + w.waterings);
  }
  return [...sum].filter(([, w]) => w > 0).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/**
 * So many of something shared out by work: each their whole share, and what is left over one at a time to those whose
 * share fell furthest short of what was theirs (the one who did more first, then by their ids). All of it is given.
 */
export function shares(total: number, work: Array<[string, number]>): Array<[string, number]> {
  const all = work.reduce((t, [, w]) => t + w, 0);
  if (total <= 0 || all <= 0) return [];
  const got = work.map(([who, w]) => ({ who, w, n: Math.floor((total * w) / all), short: (total * w) % all }));
  let left = total - got.reduce((t, g) => t + g.n, 0);
  for (const g of [...got].sort((a, b) => b.short - a.short || b.w - a.w || (a.who < b.who ? -1 : 1))) {
    if (left <= 0) break;
    g.n++; left--;
  }
  return got.filter((g) => g.n > 0).map((g) => [g.who, g.n]);
}

/** The jar shared out, if a round has turned since it last was: what waits for each afterwards. With nobody having worked, the jar keeps what it has. */
export function settle(jar: Jar, owed: Owed, well: WellLog, now: number): { jar: Jar; owed: Owed; shared: boolean } {
  const round = roundOf(now);
  return round <= jar.round ? { jar, owed, shared: false } : settleWith(jar, owed, workOf(well, jar.round, round), round);
}
/** The same, told what each did since the jar's round and which round it is now (later than the jar's). */
export function settleWith(jar: Jar, owed: Owed, work: Array<[string, number]>, round: number): { jar: Jar; owed: Owed; shared: boolean } {
  if (!work.length || (!jar.coins && !jar.things.length)) return { jar: { ...jar, round }, owed, shared: false };
  const next: Owed = { ...owed };
  const give = (who: string, coins: number, thing?: [ItemId, number]) => {
    const was = next[who] ?? { coins: 0, things: [] };
    next[who] = { coins: was.coins + coins, things: thing ? add(was.things, thing[0], thing[1]) : was.things };
  };
  for (const [who, n] of shares(jar.coins, work)) give(who, n);
  for (const [id, k] of jar.things) for (const [who, n] of shares(k, work)) give(who, 0, [id, n]);
  return { jar: newJar(round), owed: next, shared: true };
}

/** Take what waits for me at the jar: the coins, and as many of the things as the bag has room for (the rest wait on). */
export function collect(purse: Purse, owed: Owed, me: string): Done<{ purse: Purse; owed: Owed; coins: number; things: Array<[ItemId, number]> }> {
  const mine = owed[me];
  if (!mine || (!mine.coins && !mine.things.length)) return no("nothing");
  let bag = purse.bag;
  const took: Array<[ItemId, number]> = [], left: Array<[ItemId, number]> = [];
  for (const [id, n] of mine.things) {
    const fits = Math.min(n, roomFor(bag, id));
    if (fits > 0) { bag = put(bag, id, fits); took.push([id, fits]); }
    if (fits < n) left.push([id, n - fits]);
  }
  if (!mine.coins && !took.length) return no("full");
  const rest: Owed = { ...owed };
  if (left.length) rest[me] = { coins: 0, things: left }; else delete rest[me];
  return { ok: true, coins: mine.coins, things: took, purse: { ...purse, coins: purse.coins + mine.coins, bag }, owed: rest };
}
