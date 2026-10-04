import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WATER } from "./farm";
import { ITEM_IDS, type ItemId } from "./items";
import { newPurse, put, type Purse } from "./trade";
import { WELL_BOOK, bookOf, dueOf, newLog, rankOf, seen, takeGift, towards, type WaterDeed, type WellBook, type WellLog } from "./well";

/**
 * The cases the database's rules of the well's book are held to (v127; lib/town/catalog says why there are two
 * copies of a rule, and lib/town/db-vectors.test.ts is the same for the rest of the game). Two kinds:
 *
 * - **rules**: a function of the schema `town`, its arguments in order, and what the code answers;
 * - **stories**: so many lines of water written one after another (poured, a can filled, a plant watered), by four
 *   people over a night and the morning after, with the book as each of them reads it along the way and what is
 *   kept at the end. The dry run writes the same lines into `town_deeds`, where a trigger reads them, and wants the
 *   same book and the same four tables.
 *
 * Made by chance, from a seed: the same cases every time.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-well.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
interface Story {
  deeds: WaterDeed[];
  /** The book as somebody reads it once so many of the lines are written. */
  asks: Array<{ after: number; me: string; now: number; want: WellBook }>;
  end: WellLog;
}

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

/** The dry run's own people (the fc-migration skill's harness: `U`): the ids are theirs, so that nothing has to be put in their place. */
const WHO = ["00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"];
const CANS = Object.keys(WATER.cans) as ItemId[];
/** A few plots of the first bed, each somebody's plant. */
const TILES: Array<[number, number]> = [[133, 5], [134, 5], [135, 5], [133, 6], [134, 6], [135, 6], [136, 7], [137, 8]];

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(127);
  const marks = WELL_BOOK.ranks, near = [0, 1, ...marks.flatMap((m) => [m - 1, m, m + 1]), marks[marks.length - 1] * 3];
  const counts = [...near, ...Array.from({ length: 60 }, () => c.int(0, marks[marks.length - 1] + 100))];
  for (const n of counts) {
    out.push({ fn: "well_rank", args: [n], want: rankOf(n) });
    out.push({ fn: "well_towards", args: [n], want: towards(n) });
    for (const taken of [[], [1], [3], [1, 3], [2], [1, 2, 3]]) out.push({ fn: "well_due", args: [n, taken], want: dueOf(n, taken) });
  }
  // taking a gift: bags with room and without, the gift there already (a tool takes a slot of its own)
  for (let i = 0; i < 160; i++) {
    const p: Purse = { ...newPurse(), coins: c.int(0, 300) };
    const fill = c.of([0, 3, 9, 10, 10]);
    for (let k = 0; k < fill; k++) p.bag = put(p.bag, c.of(["rod", "hoe", "can", "bucket", "waterYoke", "worm", "kangkong"] as ItemId[]), 1);
    const buckets = c.of(counts), taken = c.of([[], [], [1], [3], [1, 3]]);
    const log: WellLog = { ...newLog(), carriers: buckets || taken.length || c.maybe(0.5) ? { me: { buckets, taken } } : {} };
    const did = takeGift(p, log, "me");
    out.push({ fn: "well_take", args: [p, buckets, taken], want: did.ok ? { ok: true, gift: did.gift, rank: did.rank, purse: did.purse } : did });
  }
  return out;
}

function story(seed: number, big: boolean, dry: boolean): Story {
  const c = chance(seed), deeds: WaterDeed[] = [], asks: Story["asks"] = [];
  // from three in the morning (Bangkok) on: dawn, when the game's day turns, comes two hours in
  let at = Date.parse("2026-10-06T03:00:00+07:00") + c.int(0, 3_000_000), log = newLog();
  const owner = TILES.map(() => c.of(WHO));
  const n = c.int(30, 90), can = () => (c.maybe(0.7) ? "can" : c.of(CANS));
  // (a dry story fills few cans, so that some run out and are watered with all the same)
  const pours = 0.3, fills = pours + (dry ? 0.04 : 0.2);
  for (let i = 0; i < n; i++) {
    at += c.int(1, 400) * 1000 + c.int(1, 999);
    const by = c.of(WHO), kind = c.next();
    let d: WaterDeed;
    if (kind < pours) d = { by, at, what: "pour", n: big && c.maybe(0.3) ? c.int(20, 320) : c.of([1, 1, 1, 2, 2, 4, 5, 0, 0.5, 2.5]) };
    else if (kind < fills) d = { by, at, what: "fill", can: can() };
    else {
      const t = c.int(0, TILES.length - 1);
      d = { by, at, what: "water", can: can(), tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) };
    }
    deeds.push(d);
    log = seen(log, d);
    if (c.maybe(0.25) || i === n - 1) for (const me of WHO) asks.push({ after: i + 1, me, now: at + c.int(1, 5000), want: bookOf(log, me, at + 1, (id) => id) });
  }
  // (the book is read at the moment said, which is a moment later than the one it was worked out at here: the day is the same unless dawn fell between, so those are made again at their own moment)
  for (const a of asks) {
    let l = newLog();
    for (const d of deeds.slice(0, a.after)) l = seen(l, d);
    a.want = bookOf(l, a.me, a.now, (id) => id);
  }
  return { deeds, asks, end: log };
}

describe("the cases the database's rules of the well's book are held to", () => {
  it("are made the same every time: the rules, and stories of water followed from the river to a plant", () => {
    const made = () => ({ rules: rules(), stories: Array.from({ length: 36 }, (_, i) => story(1270 + i, i % 3 === 0, i % 4 === 1)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    expect(all.rules.length).toBeGreaterThan(600);
    // every rank is reached somewhere, and something is due and something is not
    expect(new Set(all.rules.filter((v) => v.fn === "well_rank").map((v) => v.want))).toEqual(new Set([0, 1, 2, 3]));
    expect(all.rules.filter((v) => v.fn === "well_take").some((v) => (v.want as { ok: boolean }).ok)).toBe(true);
    for (const why of ["none", "full"]) expect(all.rules.some((v) => v.fn === "well_take" && (v.want as { why?: string }).why === why)).toBe(true);
    // the stories reach what they are for: water that is somebody's reaching somebody else's plant, a can run out, a
    // day that turns, a carrier with a rank and something waiting
    const books = all.stories.flatMap((s) => s.asks.map((a) => a.want));
    expect(books.some((b) => b.today.waterings > 0 && b.today.people > 1)).toBe(true);
    expect(books.some((b) => b.today.watered > 0)).toBe(true);
    expect(books.some((b) => b.rank === 3 && b.gift)).toBe(true);
    expect(books.some((b) => b.carriers.length >= 3)).toBe(true);
    expect(all.stories.some((s) => Object.keys(s.end.days).length > 1)).toBe(true);
    expect(all.stories.some((s) => Object.values(s.end.cans).some((can) => can.left === 0))).toBe(true);
    expect(all.stories.some((s) => s.end.water.length > 0)).toBe(true);
    // every thing named is a thing
    for (const v of all.rules) if (v.fn === "well_due" && v.want) expect(ITEM_IDS).toContain((v.want as [number, ItemId])[1]);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v127.json`, JSON.stringify(all)); }
  });
});
