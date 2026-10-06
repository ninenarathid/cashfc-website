import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FARMING, PUT_ON, cure, deedFor, feed, inPestHours, pestAt, pestChance, pestHour, plotKey, roll, see, tend, type Bed, type FarmSky, type Plant, type Plot, type Swarms } from "./farm";
import { CROPS, CROP_IDS, ITEMS, type ItemId } from "./items";
import { dayOf } from "./stamina";
import { HOUR, newPurse, put, type Purse } from "./trade";
import { BEDS_IN_FARM, bedCorner } from "./world";

/**
 * The cases v147 is held to: pests come a little oftener in an hour the farm was counted with insects that eat plants
 * on it (lib/town/farm's `pestAt` under a sky's `swarms`), made as lib/town/db-vectors makes the others'. A few
 * skies, each a list of hours and how many insects each was counted with (none at all; some in every hour; many in
 * every hour; an uneven day, with hours nobody counted); under each, plants of every pace sown at many moments, asked
 * when a pest came, what the plot shows through the hours after, and what a hand with each thing that is put on a
 * plant is offered and does. The dry run lays each sky's hours in the database's own table and asks the same.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-swarm.test.ts     writes vectors-v147.json
 *
 * Under a clear sky of rain (the dry run's weather is empty for them).
 */
interface Vector { fn: string; args: unknown[]; want: unknown; sky: number }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)), of: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)], maybe: (p: number) => next() < p };
}
const at = (s: string) => Date.parse(`${s}+07:00`);
const WHO = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"];
const FROM = at("2026-10-03T00:00:00"), DAYS = 6;
const HANDS: Array<ItemId | null> = [...(Object.keys(PUT_ON) as ItemId[]), "hoe", "can", null];

export function vectorsV147(): { skies: Array<Array<[number, number]>>; cases: Vector[] } {
  const c = chance(20261047), cases: Vector[] = [];
  const hours = Array.from({ length: DAYS * 24 }, (_, i) => pestHour(FROM) + i);
  // none; some every hour; many every hour; an uneven week: hours with none, some, many, and hours nobody counted
  const uneven: Swarms = Object.fromEntries(hours.filter(() => c.maybe(0.8)).map((h) => [h, c.of([0, 0, 1, 2, 3, 4, 6, 9])]));
  const skies: Swarms[] = [{}, Object.fromEntries(hours.map((h) => [h, 2])), Object.fromEntries(hours.map((h) => [h, 6])), uneven];
  const add = (sky: number, fn: string, args: unknown[], want: unknown) => cases.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)), sky });
  const holding = (hand: ItemId | null, now: number): Purse => {
    const p = newPurse();
    return { ...p, bag: hand ? put(p.bag, hand, Math.min(2, ITEMS[hand].stack)) : p.bag, hand, stamina: { day: dayOf(now), left: c.of([0, 3, 100]) } };
  };
  // plants: a plot of the farm, a vegetable of any pace, a moment of the first days it was sown at; some fed, some
  // covered a while, some cured once, some picked and bearing again
  const plants: Array<{ key: string; plant: Plant; moments: number[] }> = [];
  for (let i = 0; i < 140; i++) {
    const [bx, by] = bedCorner(c.int(0, BEDS_IN_FARM - 1)), key = plotKey(bx + c.int(0, 6), by + c.int(0, 6));
    const crop = c.of(CROP_IDS), sown = FROM + c.int(0, 3 * 24) * HOUR + c.int(0, 3_599_999);
    const plant: Plant = { by: c.of(WHO), crop, sown, boost: c.maybe(0.3) ? c.int(1, 4) * 1_800_000 : 0, watered: 0, fed: c.maybe(0.2) ? sown + c.int(0, 5) * HOUR : 0,
      guard: c.maybe(0.2) ? sown + c.int(1, 30) * HOUR : 0, cured: c.maybe(0.15) ? sown + c.int(1, 20) * HOUR + (c.maybe(0.3) ? 0 : c.int(1, 3_599_999)) : 0, picked: 0, pickedAt: 0 };
    // (one cured on the stroke of an hour, now and then: that hour's pest is the one it was rid of)
    if (plant.cured && c.maybe(0.3)) plant.cured = Math.ceil(plant.cured / HOUR) * HOUR;
    if (CROPS[crop].again && c.maybe(0.25)) { plant.picked = 1; plant.pickedAt = sown + Math.ceil(CROPS[crop].hours) * HOUR; }
    // (the moments it is asked at are its own, the same under every sky: the end, and a few on the way, one on the stroke of an hour)
    const moments = [FROM + DAYS * 24 * HOUR, plant.sown + c.int(1, 40) * HOUR, plant.sown + c.int(1, 90) * HOUR + c.int(0, 3_599_999), Math.ceil((plant.sown + c.int(4, 60) * HOUR) / HOUR) * HOUR];
    plants.push({ key, plant, moments });
  }
  // Found by looking, so that the edges are among the cases whatever the draw. Twelve plants whose very first hour is
  // one of the pests' and rolls between three and four in a hundred: struck in it for the insects alone (asked on the
  // stroke of that hour, within it, the moment before it, and later). And twelve cured on the stroke of the hour their
  // pest came: that hour's roll is the pest they were rid of.
  let first = 0, stroke = 0;
  for (let tries = 0; tries < 200_000 && (first < 12 || stroke < 12); tries++) {
    const [bx, by] = bedCorner(c.int(0, BEDS_IN_FARM - 1)), key = plotKey(bx + c.int(0, 6), by + c.int(0, 6));
    const sown = FROM + c.int(0, 3 * 24) * HOUR + c.int(1, 3_599_999), h0 = Math.ceil(sown / HOUR);
    const plant: Plant = { by: c.of(WHO), crop: "pumpkin", sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
    const r = roll(key, h0, sown);
    if (first < 12 && inPestHours(h0 * HOUR) && r >= FARMING.pests.chance && r < pestChance(1)) {
      first++;
      plants.push({ key, plant, moments: [h0 * HOUR, h0 * HOUR + c.int(1, HOUR - 1), h0 * HOUR - 1, h0 * HOUR + 2 * HOUR] });
      continue;
    }
    const t = stroke < 12 ? pestAt(key, plant, sown + 40 * HOUR) : null;
    if (t !== null) { stroke++; plants.push({ key, plant: { ...plant, cured: t }, moments: [t, t + c.int(1, HOUR - 1), t + 5 * HOUR, t + 30 * HOUR] }); }
  }
  if (first < 12 || stroke < 12) throw new Error(`the edges were not found: ${first} struck in their first hour, ${stroke} cured on the stroke`);
  for (const [n, swarms] of skies.entries()) {
    const sky: FarmSky = { rains: [], swarms };
    for (const { key, plant, moments } of plants) {
      const plot: Plot = { soil: "tilled", plant }, end = FROM + DAYS * 24 * HOUR;
      // when a pest came, asked at the end and at a few moments on the way
      for (const now of moments) {
        add(n, "pest_at", [key, plant, now], pestAt(key, plant, now, sky));
        add(n, "see", [key, plot, now], see(key, plot, now, sky));
      }
      // while a pest is on it under this sky (if one comes), and just before: what a hand is offered and does
      const t = pestAt(key, plant, end, sky), when = t === null ? c.of(moments) : t + c.int(0, FARMING.pests.kills * HOUR + 2 * HOUR);
      for (const now of t === null ? [when] : [t - 1, t, when]) {
        const hand = c.of(HANDS), me = c.of(WHO), p = holding(hand, now);
        add(n, "feed", [key, p, plot, hand, now], feed(key, p, plot, hand, now, sky));
        add(n, "cure", [key, p, plot, hand, now], cure(key, p, plot, hand, now, sky));
        add(n, "deed_for", [key, plot, hand, me, now, c.of([null, me, WHO.find((w) => w !== me)!])], deedFor(key, plot, hand, me, now, null, sky));
        const bed: Bed | undefined = c.maybe(0.3) ? undefined : { by: c.maybe(0.7) ? me : WHO.find((w) => w !== me)!, tended: now - c.int(0, 20) * HOUR, empty: 0 };
        const others = c.of([0, 2]);
        add(n, "tend", [key, plot, bed ?? null, others, 0, p, me, now], tend(key, plot, bed, others, 0, p, me, now, sky));
      }
    }
  }
  // (deed_for was asked with an owner of its own above: answered again as it was asked)
  for (const v of cases) if (v.fn === "deed_for") { const [key, plot, hand, me, now, owner] = v.args as [string, Plot, ItemId | null, string, number, string | null]; v.want = deedFor(key, plot, hand, me, now, owner, { rains: [], swarms: skies[v.sky] }) ?? null; }
  return { skies: skies.map((s) => Object.entries(s).map(([h, n]): [number, number] => [Number(h), n])), cases };
}

describe("the cases the database's pests are held to, under the farm's insects", () => {
  it("come out of the site's own rules: the same plants struck oftener in the hours the farm had insects on it, and no other", () => {
    const { skies, cases } = vectorsV147();
    expect(skies.length).toBe(4);
    expect(skies[0]).toEqual([]);
    // an uneven sky has hours with none, some and many, hours nobody counted, and hours outside the pests' own
    const uneven = new Map(skies[3]);
    expect([...uneven.values()].some((n) => n === 0) && [...uneven.values()].some((n) => n >= 1 && n < 4) && [...uneven.values()].some((n) => n >= 4)).toBe(true);
    expect(uneven.size).toBeLessThan(DAYS * 24);
    expect([...uneven.keys()].some((h) => !inPestHours(h * HOUR))).toBe(true);
    const struckAt = (sky: number) => cases.filter((v) => v.sky === sky && v.fn === "pest_at");
    const none = struckAt(0), some = struckAt(1), many = struckAt(2), mixed = struckAt(3);
    expect(none.length).toBe(4 * (140 + 24));
    // the edges are among them: a plant struck in its very first hour for the insects alone, asked on the stroke of it…
    const onStroke = (v: Vector) => Math.ceil((v.args[1] as Plant).sown / HOUR) * HOUR === v.args[2];
    expect(none.filter((v, i) => onStroke(v) && v.want === null && some[i].want === v.args[2] && many[i].want === v.args[2]).length).toBe(12);
    // …and a plant cured on the stroke of the hour its pest came, which has none then nor within the hour
    const curedOnIt = none.filter((v) => (v.args[1] as Plant).cured === v.args[2] && pestAt(v.args[0] as string, { ...(v.args[1] as Plant), cured: 0 }, v.args[2] as number) === v.args[2]);
    expect(curedOnIt.length).toBe(12);
    expect(curedOnIt.every((v) => v.want === null)).toBe(true);
    const hit = (list: Vector[]) => list.filter((v) => v.want !== null).length;
    // more are struck the more insects the hours had; whoever is struck with none is struck no later with some
    expect(hit(none)).toBeGreaterThan(100);
    expect(hit(some)).toBeGreaterThan(hit(none) + 10);
    expect(hit(many)).toBeGreaterThan(hit(some) + 10);
    expect(hit(mixed)).toBeGreaterThan(hit(none));
    expect(hit(mixed)).toBeLessThan(hit(many));
    for (let i = 0; i < none.length; i++) {
      expect(some[i].args).toEqual(none[i].args);
      if (none[i].want !== null) { expect(some[i].want).not.toBeNull(); expect(some[i].want as number).toBeLessThanOrEqual(none[i].want as number); }
      if (some[i].want !== null) { expect(many[i].want).not.toBeNull(); expect(many[i].want as number).toBeLessThanOrEqual(some[i].want as number); }
    }
    // some of what a hand does differs by the sky: a cure taken where there is a pest only for the insects
    const cured = (sky: number) => cases.filter((v) => v.sky === sky && v.fn === "cure" && (v.want as { ok: boolean }).ok).length;
    expect(cured(0) + cured(1) + cured(2) + cured(3)).toBeGreaterThan(20);
    // every rule that looks for a pest was asked under every sky
    for (let sky = 0; sky < 4; sky++) for (const fn of ["pest_at", "see", "feed", "cure", "deed_for", "tend"]) expect(cases.some((v) => v.sky === sky && v.fn === fn), `${fn} under sky ${sky}`).toBe(true);
    // (a plant cured on the stroke of an hour is among them)
    expect(cases.some((v) => v.fn === "pest_at" && ((v.args[1] as Plant).cured ?? 0) > 0 && (v.args[1] as Plant).cured % HOUR === 0)).toBe(true);
    expect(pestChance(0)).toBe(FARMING.pests.chance);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v147.json`, JSON.stringify({ skies, cases })); }
  });
});
