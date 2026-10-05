import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DITCH, ditch } from "./ditch";
import { FARMING, WATER, type Plant, type Plot } from "./farm";
import { FIELD } from "./gear";
import { HEAT, warmed } from "./heat";
import type { ItemId } from "./items";
import { workOf } from "./jar";
import { helpersOf, type Helper } from "./thanks";
import { newPurse, put, roundOf, type Purse, type Stack } from "./trade";
import type { Sky } from "./weather";
import { bookOf, newLog, seen, type WaterDeed, type WellBook, type WellLog } from "./well";
import { YARD, freshen, pourIn } from "./yard";

/**
 * The cases the database's rules of the water carriers' third round are held to (v130: a hot afternoon, a bucket
 * poured over a bed, the cooking yard's water jar; lib/town/db-vectors-well.test.ts is the same for the well's book,
 * and says how). Three kinds:
 *
 * - **rules**: a function of the schema `town`, its arguments in order, and what the code answers;
 * - **heat**: a plot as it was, as it is written at a moment under a sky, and as it is to be kept: the dry run writes
 *   the weather, the row and the row again, and reads what the trigger kept;
 * - **stories**: lines of water written one after another into the deeds, as for the well's book and the thanks, with
 *   the three new kinds among them (a bucket over a bed and the waterings it is, a bucket into the yard's jar, a pot
 *   cooked with the jar's water); along the way the book as each reads it, who helped a plant, and what each did for
 *   the others between two rounds; at the end what is kept.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-carry.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
interface Hot { sky: Sky; now: number; was: Plot; next: Plot; want: Plot }
type Step =
  | { deed: WaterDeed }
  | { book: { me: string; now: number }; want: WellBook }
  | { helpers: { me: string; plot: string }; want: Helper[] }
  | { work: { from: number; to: number }; want: Array<[string, number]> };
interface Story { steps: Step[]; end: Pick<WellLog, "water" | "cans" | "carriers" | "reach" | "help" | "yard" | "pots"> }

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
const MIN = 60_000, HOUR = 60 * MIN;
const BUCKETS = Object.keys(WATER.buckets) as ItemId[], CANS = Object.keys(WATER.cans) as ItemId[];
/** A morning with no weather written for it in the dry run: dry, and no hotter than any other. */
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const plantOf = (c: Chance, now: number): Plant => ({
  by: c.of(WHO), crop: c.of(["kangkong", "cabbage", "carrot", "pumpkin", "tomato", "chili"] as const),
  // sown within the hour, a few hours ago, or long ago (ripe, and for some of them spent)
  sown: now - c.of([20 * MIN, 3 * HOUR, 9 * HOUR, 40 * HOUR, 400 * HOUR]),
  boost: c.of([0, 0, 30 * MIN, 45 * MIN, 600 * MIN]),
  // never watered, watered within the hour (wet), or longer ago
  watered: c.of([0, 0, 0, now - 10 * MIN, now - 59 * MIN, now - 61 * MIN, now - 5 * HOUR]),
  fed: c.of([0, 0, now - HOUR]), guard: c.of([0, now + 48 * HOUR, now + 48 * HOUR]), cured: 0,
  picked: c.of([0, 0, 0, 1, 3]), pickedAt: 0,
});

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(130);
  // a bucket poured over a bed: beds of none to many plants, every kind of bucket with none to more than it carries, a can, nothing
  for (let i = 0; i < 420; i++) {
    const now = MORNING + c.int(0, 180) * MIN, bed: Record<string, Plot> = {};
    const many = c.of([0, 1, 3, 7, 9, 17, 30, 49]);
    for (let k = 0; k < many; k++) {
      const key = `${132 + c.int(0, 6)},${4 + c.int(0, 6)}`;
      bed[key] = c.maybe(0.1) ? { soil: c.of(["tilled", "cleared"] as const), plant: null } : { soil: "tilled", plant: (() => { const p = plantOf(c, now); return p.picked ? { ...p, pickedAt: p.sown + HOUR } : p; })() };
    }
    // (one bed in seven is a whole bed of growing plants nobody has watered: more than any bucket reaches)
    if (c.maybe(0.15)) for (let v = 0; v < 7; v++) for (let u = 0; u < 7; u++) bed[`${132 + u},${4 + v}`] = { soil: "tilled", plant: { ...plantOf(c, now), crop: "pumpkin", sown: now - 3 * HOUR, watered: 0, picked: 0, guard: now + 48 * HOUR } };
    const p: Purse = { ...newPurse(), coins: c.int(0, 50) };
    const held = c.of<ItemId | null>([...BUCKETS, ...BUCKETS, ...BUCKETS, "can", "hoe", null]);
    if (held) {
      p.bag = put(p.bag, held, 1);
      const water = held in WATER.buckets ? c.of([0, 1, 1, 2, WATER.buckets[held]!, WATER.buckets[held]! + 1]) : held === "can" ? c.int(0, 8) : 0;
      p.bag = p.bag.map((s): Stack | null => (s?.item === held && water ? { ...s, water } : s));
      if (c.maybe(0.9)) p.hand = held;
    }
    if (c.maybe(0.3)) p.bag = put(p.bag, c.of(["kangkong", "rod", "bucket"] as ItemId[]), 1);
    // (stamina: a fresh day's, some left, none)
    if (c.maybe(0.6)) p.stamina = { day: Math.floor((now + 7 * HOUR - 5 * HOUR) / (24 * HOUR)), left: c.of([0, 1, 2, 5, 40, 100]) };
    const tile: [number, number] = [132 + c.int(0, 6), 4 + c.int(0, 6)];
    out.push({ fn: "ditch", args: [p, bed, tile[0], tile[1], now], want: ditch(p, bed, tile, now) });
  }
  // a bucket poured into the yard's jar
  for (let i = 0; i < 180; i++) {
    const now = MORNING + c.int(0, 180) * MIN, p: Purse = { ...newPurse(), coins: c.int(0, 50) };
    const held = c.of<ItemId | null>([...BUCKETS, ...BUCKETS, "can", null]);
    if (held) {
      p.bag = put(p.bag, held, 1);
      const water = held in WATER.buckets ? c.of([0, 1, 2, WATER.buckets[held]!, WATER.buckets[held]! + 1]) : c.int(0, 8);
      p.bag = p.bag.map((s): Stack | null => (s?.item === held && water ? { ...s, water } : s));
      if (c.maybe(0.9)) p.hand = held;
    }
    if (c.maybe(0.5)) p.stamina = { day: Math.floor((now + 7 * HOUR - 5 * HOUR) / (24 * HOUR)), left: c.of([0, 1, 40]) };
    const jar = c.of([0, 0, 1, 5, YARD.holds - 2, YARD.holds - 1, YARD.holds, YARD.holds + 2]);
    out.push({ fn: "yard_pour", args: [p, jar, now], want: pourIn(p, jar, now) });
  }
  // a pot just cooked, and the jar
  const POTS: Stack[] = [
    { item: "potFull", n: 1, of: { dish: "pumpkinSoup", left: 5 } }, { item: "potFull", n: 1, of: { dish: "pumpkinSoup", left: 2 } }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 4 } },
    { item: "potFull", n: 1, of: { dish: "oddDish", left: 1 } }, { item: "potFull", n: 1, of: { dish: "mushroomSkewer", left: 2 } }, { item: "pot", n: 1 }, { item: "kangkong", n: 3 }, { item: "pumpkinSoup", n: 2 },
  ];
  for (let i = 0; i < 260; i++) {
    const p: Purse = { ...newPurse(), coins: c.int(0, 50) };
    p.bag = p.bag.map(() => (c.maybe(0.45) ? { ...c.of(POTS) } : null));
    // (a soup, another, the odd dish, what is roasted on a stick, something made that is no dish, a dish nobody cooks, a thing there is none of, nothing)
    const made = c.of<string | null>(["pumpkinSoup", "pumpkinSoup", "tomYum", "oddDish", "mushroomSkewer", "fishOnStick", "fishSauce", "riceBox", "nothing", null]);
    const jar = c.of([0, 1, 1, 2, YARD.holds]);
    out.push({ fn: "yard_freshen", args: [p, made, jar], want: freshen(p, made as ItemId | null, jar) });
  }
  return out;
}

/** Plots written under a sky at an hour: watered with each can (and by green fingers, half as much again), by a bucket, and written otherwise. */
function heat(): Hot[] {
  const out: Hot[] = [], c = chance(1300);
  const day = Date.parse("2026-10-06T00:00:00+07:00");
  for (let i = 0; i < 560; i++) {
    const now = day + c.of([9, 11, 12, 12, 13, 14, 15, 15, 16, 17, 20]) * HOUR + c.int(0, 59) * MIN + c.int(0, 59_999);
    const sky = c.of<Sky>(["clear", "clear", "clear", "cloudy", "fog", "drizzle", "rain", "storm"]);
    const p = { ...plantOf(c, now), picked: 0 }, was: Plot = { soil: "tilled", plant: { ...p, watered: c.of([0, now - 2 * HOUR, now - 61 * MIN, now]) } };
    const how = c.next();
    let next: Plot;
    if (how < 0.55) {
      // a watering: a can's (with what it adds, and green fingers), or a bucket's plain water
      const can = c.of([...CANS, "bucket"] as ItemId[]), adds = FARMING.water.adds * MIN * (can in WATER.cans ? FIELD[can] ?? 1 : 1) * (c.maybe(0.2) ? 1.5 : 1);
      next = { ...was, plant: { ...was.plant!, watered: now, boost: was.plant!.boost + adds } };
    } else if (how < 0.65) next = { ...was, plant: { ...was.plant!, fed: now } };
    else if (how < 0.75) next = { ...was, plant: { ...was.plant!, cured: now } };
    // another plant in the plot, sown now with the fountain's start (and, for half of them, said to be watered at the same moment: it is no watering of the plant that was there); a plant picked, which is watered no longer
    else if (how < 0.85) next = { soil: "tilled", plant: { ...plantOf(c, now), sown: now, boost: was.plant!.boost + 36 * MIN, watered: c.maybe(0.5) ? now : 0, picked: 0 } };
    else if (how < 0.92) next = { ...was, plant: { ...was.plant!, picked: 1, pickedAt: now, watered: 0 } };
    // a watering said to be of a moment ago, written now; and one that adds nothing
    else if (how < 0.96) next = { ...was, plant: { ...was.plant!, watered: now - 1000, boost: was.plant!.boost + 30 * MIN } };
    else next = { ...was, plant: { ...was.plant!, watered: now } };
    out.push({ sky, now, was, next, want: warmed(was, next, now, sky) });
  }
  return out;
}

const TILES: Array<[number, number]> = [[133, 5], [134, 5], [135, 5], [133, 6], [134, 6], [135, 6], [136, 7], [137, 8], [132, 9], [138, 10]];
function story(seed: number): Story {
  const c = chance(seed), steps: Step[] = [];
  // from a Sunday afternoon (Bangkok) on: a round turns at seven in the evening, the day at dawn
  let at = Date.parse("2026-10-11T15:00:00+07:00") + c.int(0, 7_000_000), log = newLog();
  const owner = TILES.map(() => c.of(WHO));
  const can = () => (c.maybe(0.75) ? "can" : c.of(CANS));
  const n = c.int(50, 110), first = roundOf(at);
  const push = (d: WaterDeed) => { steps.push({ deed: d }); log = seen(log, d); };
  for (let i = 0; i < n; i++) {
    at += c.int(1, 900) * 1000 + c.int(1, 999);
    const by = c.of(WHO), kind = c.next();
    if (kind < 0.14) push({ by, at, what: "pour", n: c.of([1, 1, 2, 2, 4, 0, 0.5]) });
    else if (kind < 0.26) push({ by, at, what: "fill", can: can() });
    else if (kind < 0.31) { const t = c.int(0, TILES.length - 1); owner[t] = by; push({ by, at, what: "sow", tile: TILES[t] }); }
    else if (kind < 0.52) {
      const t = c.int(0, TILES.length - 1);
      push({ by, at, what: "water", can: can(), tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) });
    } else if (kind < 0.72) {
      // a bucket over a bed: so many bucketfuls for so many plants, each written as a watering with that bucket at the same moment
      const bucket = c.of(BUCKETS), tiles = TILES.map((_, t) => t).filter(() => c.maybe(0.45)), used = Math.max(1, Math.ceil(tiles.length / DITCH.plants));
      if (!tiles.length) continue;
      push({ by, at, what: "ditch", n: used, plants: tiles.length, can: bucket });
      for (const t of tiles) push({ by, at, what: "water", can: bucket, tile: TILES[t], ...(owner[t] !== by ? { whose: owner[t] } : {}) });
    } else if (kind < 0.86) push({ by, at, what: "yard", n: c.of([1, 2, 2, 4, 4, 0, 0.5]) });
    else push({ by, at, what: "fresh" });
    if (c.maybe(0.22) || i === n - 1) {
      const now = at + c.int(1, 400);
      for (const me of WHO) steps.push({ book: { me, now }, want: bookOf(log, me, now, (id) => id) });
      const t = c.int(0, TILES.length - 1), plot = `${TILES[t][0]},${TILES[t][1]}`;
      steps.push({ helpers: { me: owner[t], plot }, want: helpersOf(log, plot, owner[t]) });
      const from = first + c.int(0, 1), to = roundOf(at) + c.int(0, 1);
      steps.push({ work: { from, to }, want: workOf(log, from, to) });
    }
  }
  return { steps, end: { water: log.water, cans: log.cans, carriers: log.carriers, reach: log.reach, help: log.help, yard: log.yard, pots: log.pots } };
}

describe("the cases the database's rules of a hot afternoon, a bucket over a bed and the yard's jar are held to", () => {
  it("are made the same every time", () => {
    const made = () => ({ rules: rules(), heat: heat(), stories: Array.from({ length: 30 }, (_, i) => story(1300 + i)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    expect(all.rules.length).toBeGreaterThan(800);
    // each refusal there is, and each rule done
    const whys = (fn: string) => new Set(all.rules.filter((v) => v.fn === fn).map((v) => (v.want as { ok?: boolean; why?: string }).ok ? "ok" : (v.want as { why?: string }).why));
    expect(whys("ditch")).toEqual(new Set(["ok", "hand", "soil", "wet"]));
    expect(whys("yard_pour")).toEqual(new Set(["ok", "none"]));
    const poured = all.rules.filter((v) => v.fn === "ditch" && (v.want as { ok: boolean }).ok).map((v) => v.want as { used: number; watered: string[] });
    // one bucketful and several; a bucketful not all of which was wanted; a bed with more thirsty plants than the bucket reached
    expect(new Set(poured.map((p) => p.used)).size).toBeGreaterThanOrEqual(3);
    expect(poured.some((p) => p.watered.length % DITCH.plants !== 0)).toBe(true);
    expect(poured.some((p) => p.watered.length === p.used * DITCH.plants && p.used >= 2)).toBe(true);
    expect(all.rules.filter((v) => v.fn === "yard_pour").some((v) => { const w = v.want as { ok: boolean; poured?: number; jar?: number }; return w.ok && w.jar === YARD.holds && w.poured! < 4; })).toBe(true);
    const fresh = all.rules.filter((v) => v.fn === "yard_freshen").map((v) => ({ made: v.args[1], ...(v.want as { fresh: boolean }) }));
    expect(fresh.filter((f) => f.fresh).length).toBeGreaterThan(20);
    expect(fresh.filter((f) => f.fresh).every((f) => f.made === "pumpkinSoup" || f.made === "tomYum")).toBe(true);
    // the heat: waterings that are doubled, and everything that is not one
    const hot = all.heat.filter((h) => h.want.plant!.boost !== h.next.plant!.boost);
    expect(hot.length).toBeGreaterThan(20);
    expect(hot.every((h) => h.sky === "clear" && h.want.plant!.boost - h.next.plant!.boost === (h.next.plant!.boost - h.was.plant!.boost) * HEAT.by)).toBe(true);
    expect(all.heat.length - hot.length).toBeGreaterThan(100);
    // the stories reach what they are for
    const steps = all.stories.flatMap((s) => s.steps);
    const books = steps.flatMap((s) => ("book" in s ? [s.want] : []));
    expect(books.some((b) => (b.today.pots ?? 0) >= 3)).toBe(true);
    expect(books.some((b) => (b.today.cooks ?? 0) >= 2)).toBe(true);
    expect(books.some((b) => b.today.pots === undefined && b.today.buckets > 0)).toBe(true);
    expect(books.some((b) => b.today.waterings > 0 && b.today.watered > 0)).toBe(true);
    expect(steps.some((s) => "helpers" in s && s.want.some((h) => h.carry > 0 && h.water > 0))).toBe(true);
    expect(steps.some((s) => "work" in s && s.want.length >= 3)).toBe(true);
    expect(all.stories.some((s) => s.end.yard.length > 0)).toBe(true);
    expect(all.stories.some((s) => Object.keys(s.end.pots).length >= 2)).toBe(true);
    expect(all.stories.some((s) => Object.keys(s.end.cans).some((k) => /bucket|Yoke/.test(k)))).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v130.json`, JSON.stringify(all)); }
  });
});
