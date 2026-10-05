import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DITCH } from "./ditch";
import { FARMING, WATER, type Plant, type Plot } from "./farm";
import { moonAge } from "./fishing";
import { FIELD } from "./gear";
import type { ItemId } from "./items";
import { workOf } from "./jar";
import { roundOf } from "./trade";
import { NATURES, keptAs, natureAt, pouredIn, type Nature, type WellWater } from "./waters";
import { SLOT_MS, rainingAt, rainsOf, slotOf, type Sky } from "./weather";
import { bookOf, newLog, seen, type WaterDeed, type WellBook, type WellLog } from "./well";

/**
 * The cases the database's rules of waters that differ are held to (v133; lib/town/db-vectors-well.test.ts is the same
 * for the well's book, and says how). Four kinds:
 *
 * - **rules**: `town.well_poured`, its arguments in order, and what the code answers;
 * - **natures**: a moment, whether it rains then, and the nature of water drawn at it: the dry run writes the
 *   weather and asks `town.water_kind`;
 * - **kept**: a plot as it was, as it is written at a moment under a sky while the well's water is something (or
 *   nothing), and as it is to be kept: the dry run writes the weather, the well's water, the row and the row again;
 * - **stories**: lines of water written into the deeds over a day and a night, with the quarter hours it rained in:
 *   buckets drawn at dawn, in the rain and under a full moon among them, handed on and poured; along the way the
 *   book as each reads it (what the well's water is, and whose doing, among it), and at the end what is kept.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-waters.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
interface Drawn { now: number; raining: boolean; want: Nature | null }
interface Kept { sky: Sky | null; now: number; well: WellWater | null; was: Plot; next: Plot; want: Plot }
type Step =
  | { deed: WaterDeed }
  | { book: { me: string; now: number }; want: WellBook }
  | { work: { from: number; to: number }; want: Array<[string, number]> };
interface Story { wet: number[]; steps: Step[]; end: Pick<WellLog, "water" | "cans" | "carriers" | "reach" | "help" | "yard" | "pots" | "line" | "kinds" | "wellWater"> }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}
type Chance = ReturnType<typeof chance>;

/** The dry run's own people (the fc-migration skill's harness: `U`). */
const WHO = ["00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"];
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR, MONTH = 29.530588853;
const BUCKETS = Object.keys(WATER.buckets) as ItemId[], CANS = Object.keys(WATER.cans) as ItemId[];
const at = (s: string) => Date.parse(`${s}+07:00`);
/** A midnight (Bangkok) of the day the moon is full, by the moon's own reckoning; and one of a day it is new. */
const FULL = (() => { let t = at("2026-10-01T00:00:00"); while (Math.abs(moonAge(t + 12 * HOUR) - MONTH / 2) > 0.5) t += DAY; return t; })(), NEW = FULL + 15 * DAY;
const well = (c: Chance, now: number): WellWater | null => (c.maybe(0.3) ? null : { kind: c.of(NATURES), by: c.of(WHO), until: now + c.of([-HOUR, -1, 0, 1, 10 * MIN, 30 * MIN, 119 * MIN, 2 * HOUR]) });

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(133);
  for (let i = 0; i < 360; i++) {
    const now = at("2026-10-06T06:00:00") + c.int(0, 600) * MIN, was = well(c, now);
    const kind = c.of<Nature | null>([...NATURES, ...NATURES, null]), n = c.of([0, 1, 1, 2, 3, 4, 9]), by = c.of(WHO);
    out.push({ fn: "well_poured", args: [was, kind, n, by, now], want: pouredIn(was, kind, n, by, now) });
  }
  return out;
}

/** Moments over a day of the full moon, a day near it and a day of the new moon, each with rain and without. */
function natures(): Drawn[] {
  const out: Drawn[] = [], c = chance(1331);
  for (const day of [FULL, FULL + DAY, FULL - 2 * DAY, FULL + 2 * DAY, NEW, at("2026-10-06T00:00:00")]) {
    for (let h = 0; h < 24; h++) {
      const now = day + h * HOUR + c.int(0, 59) * MIN + c.int(0, 59_999);
      out.push({ now, raining: false, want: natureAt(now, false) });
      if (c.maybe(0.35)) out.push({ now: now + 1, raining: true, want: natureAt(now + 1, true) });
    }
    // (the hours' own edges)
    for (const edge of [5, 7, 19]) for (const d of [-1, 0]) out.push({ now: day + edge * HOUR + d, raining: false, want: natureAt(day + edge * HOUR + d, false) });
  }
  return out;
}

const plantOf = (c: Chance, now: number): Plant => ({
  by: c.of(WHO), crop: c.of(["kangkong", "cabbage", "pumpkin", "tomato"] as const), sown: now - c.of([20 * MIN, 3 * HOUR, 40 * HOUR]),
  boost: c.of([0, 0, 30 * MIN, 600 * MIN]), watered: c.of([0, 0, now - 61 * MIN, now - 5 * HOUR, now]),
  fed: c.of([0, now - HOUR]), guard: c.of([0, now - HOUR, now + 3 * HOUR, now + 48 * HOUR]), cured: 0, picked: 0, pickedAt: 0,
});
function kept(): Kept[] {
  const out: Kept[] = [], c = chance(1332), day = at("2026-10-06T00:00:00");
  for (let i = 0; i < 620; i++) {
    const now = day + c.of([6, 9, 12, 13, 15, 16, 20]) * HOUR + c.int(0, 59) * MIN + c.int(0, 59_999);
    const sky = c.of<Sky | null>(["clear", "clear", "cloudy", "fog", null]), w = well(c, now);
    const was: Plot = { soil: "tilled", plant: plantOf(c, now) }, how = c.next();
    let next: Plot;
    if (how < 0.7) {
      const can = c.of([...CANS, "bucket"] as ItemId[]), adds = FARMING.water.adds * MIN * (can in WATER.cans ? FIELD[can] ?? 1 : 1) * (c.maybe(0.2) ? 1.5 : 1);
      next = { ...was, plant: { ...was.plant!, watered: now, boost: was.plant!.boost + adds } };
    } else if (how < 0.8) next = { ...was, plant: { ...was.plant!, fed: now } };
    else if (how < 0.9) next = { soil: "tilled", plant: { ...plantOf(c, now), sown: now, boost: was.plant!.boost + 36 * MIN, watered: c.maybe(0.5) ? now : 0 } };
    else next = { ...was, plant: { ...was.plant!, watered: now } };
    out.push({ sky, now, well: w, was, next, want: keptAs(was, next, now, sky, w && w.until > now ? w.kind : null) });
  }
  return out;
}

const TILES: Array<[number, number]> = [[133, 5], [134, 5], [135, 5], [133, 6], [134, 6], [135, 6], [136, 7], [137, 8]];
function story(seed: number): Story {
  const c = chance(seed), steps: Step[] = [];
  // from an afternoon on, through the night and the dawn after: of a day the moon is full, or of an ordinary one
  const start = c.of([FULL, FULL, at("2026-10-06T00:00:00")]) + 15 * HOUR + c.int(0, 3_000_000);
  // the quarter hours it rains in: a few showers, each of some quarter hours on end
  const wet: number[] = [];
  for (let k = c.int(0, 4); k > 0; k--) { const from = slotOf(start) + c.int(0, 60); for (let q = c.int(1, 5); q > 0; q--) wet.push(from + q); }
  const rains = rainsOf(wet), slots = [...new Set(wet)].sort((a, b) => a - b);
  let now = start, log = newLog();
  const owner = TILES.map(() => c.of(WHO)), bucket = Object.fromEntries(WHO.map((id) => [id, c.of(BUCKETS)]));
  const can = () => (c.maybe(0.75) ? "can" : c.of(CANS));
  const n = c.int(70, 130), first = roundOf(now);
  const push = (d: WaterDeed) => { steps.push({ deed: d }); log = seen(log, d); };
  for (let i = 0; i < n; i++) {
    // (some long waits, so that the story reaches the night and the dawn)
    now += c.maybe(0.12) ? c.int(20, 90) * MIN : c.int(1, 600) * 1000 + c.int(1, 999);
    const by = c.of(WHO), kind = c.next();
    if (kind < 0.25) push({ by, at: now, what: "draw", can: bucket[by], ...((k) => (k ? { kind: k } : {}))(natureAt(now, rainingAt(rains, now))) });
    else if (kind < 0.42) {
      const to = c.of(WHO.filter((id) => id !== by));
      push({ by, at: now, what: "pass", n: c.of([1, 1, 2, 4, 0]), can: bucket[by], to, into: bucket[to] });
    } else if (kind < 0.66) push({ by, at: now, what: "pour", n: c.of([1, 1, 2, 2, 4, 0, 0.5]), ...(c.maybe(0.92) ? { can: bucket[by] } : {}) });
    else if (kind < 0.72) {
      const tiles = TILES.map((_, t) => t).filter(() => c.maybe(0.4)), used = Math.max(1, Math.ceil(tiles.length / DITCH.plants));
      if (!tiles.length) continue;
      push({ by, at: now, what: "ditch", n: used, plants: tiles.length, can: bucket[by] });
      for (const t of tiles) push({ by, at: now, what: "water", can: bucket[by], tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) });
    } else if (kind < 0.78) push({ by, at: now, what: "yard", n: c.of([1, 2, 0]), can: bucket[by] });
    else if (kind < 0.84) push({ by, at: now, what: "fill", can: can() });
    else {
      const t = c.int(0, TILES.length - 1);
      push({ by, at: now, what: "water", can: can(), tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) });
    }
    if (c.maybe(0.2) || i === n - 1) {
      const when = now + c.int(1, 400);
      for (const me of WHO) steps.push({ book: { me, now: when }, want: bookOf(log, me, when, (id) => id) });
      const from = first + c.int(0, 1), to = roundOf(now) + c.int(0, 1);
      steps.push({ work: { from, to }, want: workOf(log, from, to) });
    }
  }
  void SLOT_MS;
  return { wet: slots, steps, end: { water: log.water, cans: log.cans, carriers: log.carriers, reach: log.reach, help: log.help, yard: log.yard, pots: log.pots, line: log.line, kinds: log.kinds, wellWater: log.wellWater } };
}

describe("the cases the database's rules of waters that differ are held to", () => {
  it("are made the same every time", () => {
    const made = () => ({ rules: rules(), natures: natures(), kept: kept(), stories: Array.from({ length: 30 }, (_, i) => story(1330 + i)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    // the well: begun, kept longer, held to its most, taken over, left alone, run out
    const wells = all.rules.map((v) => ({ was: v.args[0] as WellWater | null, kind: v.args[1] as Nature | null, now: v.args[4] as number, want: v.want as WellWater | null }));
    expect(wells.some((w) => w.want && w.was && w.was.until > w.now && w.was.kind === w.kind && w.want.until > w.was.until)).toBe(true);
    expect(wells.some((w) => w.want && w.want.until === w.now + 120 * MIN)).toBe(true);
    expect(wells.some((w) => w.want && w.was && w.was.until > w.now && w.kind && w.was.kind !== w.kind)).toBe(true);
    expect(wells.some((w) => w.want === null) && wells.some((w) => w.want && !w.kind)).toBe(true);
    // every nature is drawn somewhere, and none
    expect(new Set(all.natures.map((d) => d.want))).toEqual(new Set(["dawn", "rain", "moon", null]));
    expect(all.natures.filter((d) => d.want === "moon").length).toBeGreaterThan(10);
    // kept: each nature's doing, with the heat and without
    const changed = all.kept.filter((k) => JSON.stringify(k.want) !== JSON.stringify(k.next));
    expect(changed.length).toBeGreaterThan(120);
    for (const kind of NATURES) expect(changed.some((k) => k.well?.kind === kind && k.well.until > k.now)).toBe(true);
    expect(changed.some((k) => k.well?.kind === "dawn" && k.well.until > k.now && k.sky === "clear" && k.want.plant!.boost - k.next.plant!.boost > k.next.plant!.boost - k.was.plant!.boost)).toBe(true);
    expect(changed.some((k) => k.want.plant!.guard !== k.next.plant!.guard)).toBe(true);
    expect(all.kept.length - changed.length).toBeGreaterThan(150);
    // the stories reach what they are for
    const deeds = all.stories.flatMap((s) => s.steps.flatMap((x) => ("deed" in x ? [x.deed] : [])));
    for (const kind of NATURES) expect(deeds.filter((d) => d.what === "draw" && d.kind === kind).length).toBeGreaterThan(5);
    const books = all.stories.flatMap((s) => s.steps.flatMap((x) => ("book" in x ? [x.want] : [])));
    for (const kind of NATURES) expect(books.some((b) => b.water?.kind === kind)).toBe(true);
    expect(books.some((b) => !b.water)).toBe(true);
    expect(all.stories.some((s) => Object.keys(s.end.kinds).length >= 2)).toBe(true);
    expect(all.stories.some((s) => s.end.wellWater !== null)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v133.json`, JSON.stringify(all)); }
  });
});
