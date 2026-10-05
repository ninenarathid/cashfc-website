import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WATER } from "./farm";
import type { ItemId } from "./items";
import { collect, drop, settleWith, shares, workOf, type Jar, type Owed } from "./jar";
import { boardOf, helpersOf, thank, toThank, type Helper, type Thanks, type ThanksBoard } from "./thanks";
import { newPurse, put, roundOf, type Purse, type Stack } from "./trade";
import { newLog, seen, type WaterDeed, type WellLog } from "./well";

/**
 * The cases the database's rules of thanks and of the jar at the well are held to (v129; lib/town/db-vectors-well
 * .test.ts is the same for the well's book, and says how). Two kinds:
 *
 * - **rules**: the jar's own, each a function of the schema `town` with its arguments and what the code answers;
 * - **stories**: lines written one after another into the deeds (water poured, a can filled, a plant watered, a
 *   plot sown) by four people from a Sunday afternoon into the Monday after, so that a round of the uncle's, a
 *   week and a day all turn; along the way somebody thanks whoever helped their plant, and it is asked who helped a
 *   plant, whom somebody has still to thank, what the board says, and what each did for the others between two
 *   rounds. At the end, who helped which plant.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-kind.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
type Step =
  | { deed: WaterDeed }
  | { thank: { me: string; plot: string; now: number }; want: unknown }
  | { helpers: { me: string; plot: string }; want: Helper[] }
  | { toThank: { me: string; now: number }; want: Record<string, Helper[]> }
  | { board: { me: string; now: number }; want: ThanksBoard }
  | { work: { from: number; to: number }; want: Array<[string, number]> };
interface Story { steps: Step[]; end: WellLog["help"] }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

/** The dry run's own people (the fc-migration skill's harness: `U`). */
const WHO = ["00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"];
const CANS = Object.keys(WATER.cans) as ItemId[];
const TILES: Array<[number, number]> = [[133, 5], [134, 5], [135, 5], [133, 6], [134, 6], [135, 6]];
const THINGS: Stack[] = [
  { item: "kangkong", n: 7 }, { item: "tilapia", n: 2 }, { item: "friedMinnow", n: 1 }, { item: "rice", n: 9 }, { item: "driftwood", n: 3 }, { item: "compost", n: 4 },
  { item: "hoe", n: 1 }, { item: "seedKangkong", n: 5 }, { item: "scrollFriedMinnow", n: 1 }, { item: "worm", n: 12 },
  { item: "bucket", n: 1, water: 1 }, { item: "bucket", n: 1 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } },
];

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(129);
  const works = (): Array<[string, number]> => WHO.filter(() => c.maybe(0.7)).map((id): [string, number] => [id, c.of([1, 1, 2, 3, 8, 8, 16, 24, 40, 97])]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  for (let i = 0; i < 260; i++) {
    const total = c.of([0, 1, 1, 2, 3, 5, 7, 10, 13, 50, 99, 100, 1000]), work = works();
    out.push({ fn: "jar_shares", args: [total, work], want: shares(total, work) });
  }
  const jarOf = (): Jar => ({ round: 59000 + c.int(0, 4), coins: c.of([0, 0, 3, 50, 121]), things: c.maybe(0.5) ? [] : [["kangkong", c.int(1, 9)], ...(c.maybe(0.5) ? [["tilapia", c.int(1, 3)] as [ItemId, number]] : [])] });
  const owedOf = (): Owed => Object.fromEntries(WHO.filter(() => c.maybe(0.3)).map((id) => [id, { coins: c.int(0, 20), things: c.maybe(0.5) ? [] : [[c.of(["kangkong", "carp"] as ItemId[]), c.int(1, 4)] as [ItemId, number]] }]));
  for (let i = 0; i < 200; i++) {
    const jar = jarOf(), owed = owedOf(), work = works(), round = jar.round + c.int(1, 3);
    out.push({ fn: "jar_settle", args: [jar, owed, work, round], want: settleWith(jar, owed, work, round) });
  }
  for (let i = 0; i < 220; i++) {
    const p: Purse = { ...newPurse(), coins: c.of([0, 1, 5, 40]) };
    p.bag = p.bag.map(() => (c.maybe(0.55) ? { ...c.of(THINGS) } : null));
    const jar = jarOf();
    const what = c.maybe(0.4) ? { coins: c.of([0, 1, 2, 5, 41, -1, 1.5]) } : { slot: c.of([0, 1, 2, 3, 9, 10, -1]), n: c.of([1, 1, 2, 7, 13, 0, 1.5]) };
    out.push({ fn: "jar_drop", args: [p, jar, what], want: drop(p, jar, what) });
  }
  for (let i = 0; i < 160; i++) {
    const p: Purse = { ...newPurse(), coins: c.int(0, 30) };
    const fill = c.of([0, 4, 9, 10, 10]);
    for (let k = 0; k < fill; k++) p.bag = put(p.bag, c.of(["rod", "hoe", "kangkong", "carp"] as ItemId[]), c.of([1, 1, 19]));
    const mine = c.maybe(0.15) ? null : { coins: c.of([0, 0, 7, 48]), things: c.maybe(0.3) ? [] : [[c.of(["kangkong", "carp"] as ItemId[]), c.int(1, 30)], ...(c.maybe(0.4) ? [["tilapia", c.int(1, 5)] as [ItemId, number]] : [])] as Array<[ItemId, number]> };
    const did = collect(p, mine ? { me: mine } : {}, "me");
    out.push({ fn: "jar_collect", args: [p, mine], want: did.ok ? { ok: true, coins: did.coins, things: did.things, purse: did.purse, mine: did.owed.me ?? null } : did });
  }
  return out;
}

function story(seed: number): Story {
  const c = chance(seed), steps: Step[] = [];
  // from a Sunday afternoon (Bangkok) on: a round turns at seven in the evening, the week at midnight, the day at dawn
  let at = Date.parse("2026-10-11T15:00:00+07:00") + c.int(0, 7_000_000), log = newLog(), given: Thanks[] = [];
  const owner = TILES.map(() => c.of(WHO));
  const can = () => (c.maybe(0.75) ? "can" : c.of(CANS));
  const n = c.int(50, 110), first = roundOf(at);
  for (let i = 0; i < n; i++) {
    at += c.int(1, 900) * 1000 + c.int(1, 999);
    const by = c.of(WHO), kind = c.next();
    if (kind < 0.12) {
      // thanks: usually by a plot's owner, sometimes by somebody whose plant it is not
      const t = c.int(0, TILES.length - 1), me = c.maybe(0.8) ? owner[t] : by, plot = `${TILES[t][0]},${TILES[t][1]}`;
      const did = thank(log, given, plot, me, at);
      if (did.ok) given = did.given;
      steps.push({ thank: { me, plot, now: at }, want: did.ok ? { ok: true, thanked: did.thanked } : did });
      continue;
    }
    let d: WaterDeed;
    if (kind < 0.3) d = { by, at, what: "pour", n: c.of([1, 1, 2, 2, 4, 0, 0.5]) };
    else if (kind < 0.45) d = { by, at, what: "fill", can: can() };
    else if (kind < 0.52) { const t = c.int(0, TILES.length - 1); owner[t] = by; d = { by, at, what: "sow", tile: TILES[t] }; }
    else {
      const t = c.int(0, TILES.length - 1);
      d = { by, at, what: "water", can: can(), tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) };
    }
    steps.push({ deed: d });
    log = seen(log, d);
    if (c.maybe(0.2) || i === n - 1) {
      const me = c.of(WHO), t = c.int(0, TILES.length - 1), plot = `${TILES[t][0]},${TILES[t][1]}`, now = at + c.int(1, 400);
      steps.push({ helpers: { me: owner[t], plot }, want: helpersOf(log, plot, owner[t]) });
      steps.push({ toThank: { me, now }, want: toThank(log, given, me, now) });
      steps.push({ board: { me, now }, want: boardOf(given, me, now, (id) => id) });
      const from = first + c.int(0, 1), to = roundOf(at) + c.int(0, 1);
      steps.push({ work: { from, to }, want: workOf(log, from, to) });
    }
  }
  return { steps, end: log.help };
}

describe("the cases the database's rules of thanks and of the jar are held to", () => {
  it("are made the same every time: the jar's rules, and stories of plants helped and thanks given", () => {
    const made = () => ({ rules: rules(), stories: Array.from({ length: 30 }, (_, i) => story(1290 + i)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    expect(all.rules.length).toBeGreaterThan(800);
    // each refusal there is, and each rule done
    const whys = (fn: string) => new Set(all.rules.filter((v) => v.fn === fn).map((v) => (v.want as { ok?: boolean; why?: string }).ok ? "ok" : (v.want as { why?: string }).why));
    expect(whys("jar_drop")).toEqual(new Set(["ok", "amount", "coins", "none", "unwanted"]));
    expect(whys("jar_collect")).toEqual(new Set(["ok", "nothing", "full"]));
    expect(all.rules.filter((v) => v.fn === "jar_settle").some((v) => (v.want as { shared: boolean }).shared)).toBe(true);
    expect(all.rules.filter((v) => v.fn === "jar_settle").some((v) => !(v.want as { shared: boolean }).shared)).toBe(true);
    expect(all.rules.filter((v) => v.fn === "jar_shares").some((v) => (v.want as unknown[]).length >= 3)).toBe(true);
    // the stories reach what they are for
    const steps = all.stories.flatMap((s) => s.steps);
    const thanks = steps.flatMap((s) => ("thank" in s ? [s.want as { ok: boolean; thanked?: string[] }] : []));
    expect(thanks.filter((t) => t.ok).length).toBeGreaterThan(20);
    expect(thanks.some((t) => t.ok && t.thanked!.length >= 2)).toBe(true);
    expect(thanks.some((t) => !t.ok)).toBe(true);
    const boards = steps.flatMap((s) => ("board" in s ? [s.want] : []));
    expect(boards.some((b) => b.today.length > 0 && b.week < b.all)).toBe(true);
    expect(boards.some((b) => b.top.length >= 2 && JSON.stringify(b.top) !== JSON.stringify(b.ever))).toBe(true);
    expect(steps.some((s) => "helpers" in s && s.want.some((h) => h.carry > 0 && h.water > 0))).toBe(true);
    expect(steps.some((s) => "toThank" in s && Object.keys(s.want).length >= 2)).toBe(true);
    expect(steps.some((s) => "work" in s && s.want.length >= 3)).toBe(true);
    expect(all.stories.some((s) => Object.keys(s.end).length >= 3)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v129.json`, JSON.stringify(all)); }
  });
});
