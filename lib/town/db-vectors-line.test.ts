import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DITCH } from "./ditch";
import { WATER } from "./farm";
import type { ItemId } from "./items";
import { workOf } from "./jar";
import { pass } from "./line";
import { newPurse, put, roundOf, type Purse, type Stack } from "./trade";
import { bookOf, newLog, seen, type WaterDeed, type WellBook, type WellLog } from "./well";

/**
 * The cases the database's rules of a bucket line are held to (v132; lib/town/db-vectors-well.test.ts is the same for
 * the well's book, and says how). Two kinds:
 *
 * - **rules**: `town.pass`, its two purses and the moment, and what the code answers;
 * - **stories**: lines of water written one after another into the deeds, with a bucket drawn, a bucket handed on and
 *   a bucket poured (into the well, over a bed, into the yard's jar) out of the bucket it was handed into among them;
 *   along the way the book as each reads it, and what each did for the others between two rounds; at the end what is
 *   kept, whose hands each bucket's water has been through among it.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-line.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
type Step =
  | { deed: WaterDeed }
  | { book: { me: string; now: number }; want: WellBook }
  | { work: { from: number; to: number }; want: Array<[string, number]> };
interface Story { steps: Step[]; end: Pick<WellLog, "water" | "cans" | "carriers" | "reach" | "help" | "yard" | "pots" | "line"> }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

/** The dry run's own people (the fc-migration skill's harness: `U`). */
const WHO = ["00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"];
const MIN = 60_000, HOUR = 60 * MIN;
const BUCKETS = Object.keys(WATER.buckets) as ItemId[], CANS = Object.keys(WATER.cans) as ItemId[];
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(132);
  const one = (now: number, giver: boolean): Purse => {
    const p: Purse = { ...newPurse(), coins: c.int(0, 50) };
    const held = c.of<ItemId | null>([...BUCKETS, ...BUCKETS, ...BUCKETS, "can", "hoe", null]);
    if (held) {
      p.bag = put(p.bag, held, 1);
      // (a giver's bucket mostly has water, a taker's mostly none; and each the other way sometimes)
      const water = held in WATER.buckets ? (c.maybe(giver ? 0.8 : 0.25) ? c.of([1, 1, 2, WATER.buckets[held]!, WATER.buckets[held]! + 1]) : 0) : held === "can" ? c.int(0, 8) : 0;
      p.bag = p.bag.map((s): Stack | null => (s?.item === held && water ? { ...s, water } : s));
      if (c.maybe(0.9)) p.hand = held;
      // (a second of the same kind in the bag, empty: what is handed on goes into the first that has none)
      if (held in WATER.buckets && c.maybe(0.15)) p.bag = put(p.bag, held, 1);
    }
    if (c.maybe(0.3)) p.bag = put(p.bag, c.of(["kangkong", "rod"] as ItemId[]), 1);
    if (c.maybe(0.6)) p.stamina = { day: Math.floor((now + 7 * HOUR - 5 * HOUR) / (24 * HOUR)), left: c.of([0, 1, 2, 40, 100]) };
    return p;
  };
  for (let i = 0; i < 520; i++) {
    const now = MORNING + c.int(0, 180) * MIN, from = one(now, true), to = one(now, false);
    out.push({ fn: "pass", args: [from, to, now], want: pass(from, to, now) });
  }
  return out;
}

const TILES: Array<[number, number]> = [[133, 5], [134, 5], [135, 5], [133, 6], [134, 6], [135, 6], [136, 7], [137, 8], [132, 9], [138, 10]];
function story(seed: number): Story {
  const c = chance(seed), steps: Step[] = [];
  // from a Sunday afternoon (Bangkok) on: a round turns at seven in the evening, the day at dawn
  let at = Date.parse("2026-10-11T15:00:00+07:00") + c.int(0, 7_000_000), log = newLog();
  const owner = TILES.map(() => c.of(WHO));
  // (each has a bucket of a kind for the whole story, so that the hands a bucket's water came by are met again)
  const bucket = Object.fromEntries(WHO.map((id) => [id, c.of(BUCKETS)]));
  const can = () => (c.maybe(0.75) ? "can" : c.of(CANS));
  const n = c.int(60, 120), first = roundOf(at);
  const push = (d: WaterDeed) => { steps.push({ deed: d }); log = seen(log, d); };
  for (let i = 0; i < n; i++) {
    at += c.int(1, 700) * 1000 + c.int(1, 999);
    const by = c.of(WHO), kind = c.next();
    if (kind < 0.12) push({ by, at, what: "draw", can: bucket[by] });
    else if (kind < 0.42) {
      const to = c.of(WHO.filter((id) => id !== by));
      push({ by, at, what: "pass", n: c.of([1, 1, 1, 2, 4, 0]), can: bucket[by], to, into: bucket[to] });
    } else if (kind < 0.60) push({ by, at, what: "pour", n: c.of([1, 1, 2, 2, 4, 0, 0.5, 2.5]), ...(c.maybe(0.9) ? { can: bucket[by] } : {}) });
    else if (kind < 0.68) {
      const tiles = TILES.map((_, t) => t).filter(() => c.maybe(0.4)), used = Math.max(1, Math.ceil(tiles.length / DITCH.plants));
      if (!tiles.length) continue;
      push({ by, at, what: "ditch", n: used, plants: tiles.length, can: bucket[by] });
      for (const t of tiles) push({ by, at, what: "water", can: bucket[by], tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) });
    } else if (kind < 0.76) push({ by, at, what: "yard", n: c.of([1, 2, 4, 0]), can: bucket[by] });
    else if (kind < 0.81) push({ by, at, what: "fresh" });
    else if (kind < 0.88) push({ by, at, what: "fill", can: can() });
    else if (kind < 0.91) { const t = c.int(0, TILES.length - 1); owner[t] = by; push({ by, at, what: "sow", tile: TILES[t] }); }
    else {
      const t = c.int(0, TILES.length - 1);
      push({ by, at, what: "water", can: can(), tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) });
    }
    if (c.maybe(0.2) || i === n - 1) {
      const now = at + c.int(1, 400);
      for (const me of WHO) steps.push({ book: { me, now }, want: bookOf(log, me, now, (id) => id) });
      const from = first + c.int(0, 1), to = roundOf(at) + c.int(0, 1);
      steps.push({ work: { from, to }, want: workOf(log, from, to) });
    }
  }
  return { steps, end: { water: log.water, cans: log.cans, carriers: log.carriers, reach: log.reach, help: log.help, yard: log.yard, pots: log.pots, line: log.line } };
}

describe("the cases the database's rules of a bucket line are held to", () => {
  it("are made the same every time", () => {
    const made = () => ({ rules: rules(), stories: Array.from({ length: 30 }, (_, i) => story(1320 + i)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    // each refusal there is, and water handed on whole and in part
    const whys = new Set(all.rules.map((v) => (v.want as { ok?: boolean; why?: string }).ok ? "ok" : (v.want as { why?: string }).why));
    expect(whys).toEqual(new Set(["ok", "hand", "none", "full"]));
    const done = all.rules.filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { n: number; from: Purse; can: ItemId });
    expect(done.length).toBeGreaterThan(80);
    expect(done.some((d) => d.from.bag.some((s) => s?.item === d.can && (s.water ?? 0) > 0))).toBe(true);
    expect(new Set(done.map((d) => d.n)).size).toBeGreaterThanOrEqual(3);
    // the stories reach what they are for: water poured that came by two hands and by three, a bucket drawn anew, and those counted who never poured
    const ends = all.stories.map((s) => s.end);
    expect(ends.some((e) => Object.values(e.line).some((h) => h.length >= 3))).toBe(true);
    const deeds = all.stories.flatMap((s) => s.steps.flatMap((x) => ("deed" in x ? [x.deed] : [])));
    expect(deeds.filter((d) => d.what === "pass" && (d.n ?? 0) > 0).length).toBeGreaterThan(400);
    expect(deeds.filter((d) => d.what === "draw").length).toBeGreaterThan(100);
    const books = all.stories.flatMap((s) => s.steps.flatMap((x) => ("book" in x ? [x.want] : [])));
    expect(books.some((b) => b.carriers.length === 4)).toBe(true);
    expect(all.stories.some((s) => s.steps.some((x) => "work" in x && x.want.length >= 3))).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v132.json`, JSON.stringify(all)); }
  });
});
