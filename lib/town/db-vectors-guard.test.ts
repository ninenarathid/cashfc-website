import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FARMING, PUT_ON, cure, deedFor, feed, pestAt, plotKey, see, tend, type Bed, type Plant, type Plot } from "./farm";
import { CROPS, CROP_IDS, ITEMS, type ItemId } from "./items";
import { dayOf } from "./stamina";
import { HOUR, newPurse, put, type Purse } from "./trade";
import { BEDS_IN_FARM, bedCorner } from "./world";

/**
 * The cases v140 is held to: what covers a plant against pests is not put on one that has a pest (lib/town/farm's
 * `feed` and `deedFor`), made as lib/town/db-vectors makes the others'. Plants a pest has struck, found by looking,
 * at moments before it came, while it is on them and after it has killed them; plants with none, covered and not;
 * and each with everything that is put on a plant in the hand, and a few things that are not.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-guard.test.ts     writes vectors-v140.json
 *
 * Under a clear sky (the dry run's weather is empty for them; the farm's cases in the rain are lib/town/db-vectors').
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)), of: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)], maybe: (p: number) => next() < p };
}
const at = (s: string) => Date.parse(`${s}+07:00`);
const WHO = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"];
/** Everything that is put on a plant, by what it does; and things that are not. */
export const COVERS = (Object.keys(PUT_ON) as ItemId[]).filter((id) => PUT_ON[id] === "guard");
export const CURES = (Object.keys(PUT_ON) as ItemId[]).filter((id) => PUT_ON[id] === "cure");
const FEEDS = (Object.keys(PUT_ON) as ItemId[]).filter((id) => PUT_ON[id] === "feed");
const OTHERS: Array<ItemId | null> = ["hoe", "can", "sickle", "rod", null];

export function vectorsV140(): Vector[] {
  const c = chance(20261040), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  /** Somebody with two of a thing in the bag and it in the hand, fed or tired. */
  const holding = (hand: ItemId | null, now: number): Purse => {
    const p = newPurse();
    return { ...p, bag: hand ? put(p.bag, hand, Math.min(2, ITEMS[hand].stack)) : p.bag, hand, stamina: { day: dayOf(now), left: c.of([0, 3, 100]) } };
  };
  /** Every deed a hand has for a plot at a moment, asked each way the database is asked. */
  const ask = (key: string, plot: Plot, hand: ItemId | null, now: number) => {
    const me = c.of(WHO), p = holding(hand, now);
    add("feed", [key, p, plot, hand, now], feed(key, p, plot, hand, now));
    add("cure", [key, p, plot, hand, now], cure(key, p, plot, hand, now));
    for (const owner of [null, me, WHO.find((w) => w !== me)!]) add("deed_for", [key, plot, hand, me, now, owner], deedFor(key, plot, hand, me, now, owner));
    const bed: Bed | undefined = c.maybe(0.3) ? undefined : { by: c.maybe(0.7) ? me : WHO.find((w) => w !== me)!, tended: now - c.int(0, 20) * HOUR, empty: 0 };
    const others = c.of([0, 2]);
    add("tend", [key, plot, bed ?? null, others, 0, p, me, now], tend(key, plot, bed, others, 0, p, me, now));
  };
  // plants a pest strikes, found by looking: a plot of the farm, a vegetable slow enough, a morning it was sown
  const struck: Array<{ key: string; plant: Plant; t: number }> = [];
  for (let tries = 0; struck.length < 60 && tries < 4000; tries++) {
    const [bx, by] = bedCorner(c.int(0, BEDS_IN_FARM - 1)), key = plotKey(bx + c.int(0, 6), by + c.int(0, 6));
    const crop = c.of(CROP_IDS.filter((id) => CROPS[id].hours >= 12)), sown = at("2026-10-03T06:00:00") + c.int(0, 60) * HOUR + c.int(0, 3_599_999);
    const plant: Plant = { by: c.of(WHO), crop, sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
    const t = pestAt(key, plant, sown + CROPS[crop].hours * HOUR);
    if (t !== null) struck.push({ key, plant, t });
  }
  const dies = FARMING.pests.kills * HOUR;
  for (const { key, plant, t } of struck) {
    const plot: Plot = { soil: "tilled", plant };
    // the moment before it comes, the moment it does, while it is on the plant, its last moment, and dead of it
    for (const now of [t - 1, t, t + c.int(1, dies - 2), t + dies, t + dies + 1]) {
      for (const hand of [...COVERS, ...CURES]) ask(key, plot, hand, now);
      ask(key, plot, c.of(FEEDS), now);
      ask(key, plot, c.of(OTHERS), now);
    }
    // cured an hour in, it is covered by anything that covers; covered already, by nothing more
    const cured: Plot = { soil: "tilled", plant: { ...plant, cured: t + HOUR } }, covered: Plot = { soil: "tilled", plant: { ...plant, cured: t + HOUR, guard: t + HOUR + 1 + FARMING.guard * HOUR } };
    for (const hand of [...COVERS, c.of(CURES)]) { ask(key, cured, hand, t + HOUR + 1); ask(key, covered, hand, t + 2 * HOUR); }
    // covered while the pest was on it, before a cover minded one: it is rid of it still, and its cover is as any
    const old: Plot = { soil: "tilled", plant: { ...plant, guard: t + HOUR + FARMING.guard * HOUR } };
    for (const now of [t + 2 * HOUR, t + dies + 1, t + HOUR + FARMING.guard * HOUR + 1]) {
      add("see", [key, old, now], see(key, old, now));
      ask(key, old, c.of(COVERS), now);
      ask(key, old, c.of(CURES), now);
    }
  }
  return out;
}

describe("the cases the database's cover and cure are held to", () => {
  it("come out of the site's own rules: a cover refused to every plant that has a pest and taken by every one that has none", () => {
    const all = vectorsV140(), covers = new Set<string>(COVERS), cures = new Set<string>(CURES);
    expect([...covers].sort()).toEqual(["guardFert", "ladybird", "lavenderSachet", "mantis", "mosquitofish"]);
    expect([...cures].sort()).toEqual(["archerfish", "pestCure"]);
    const feeds = all.filter((v) => v.fn === "feed" && covers.has(v.args[3] as string));
    const pestOn = (v: Vector) => see(v.args[0] as string, v.args[2] as Plot, v.args[4] as number).pest;
    const ok = (v: Vector) => (v.want as { ok: boolean }).ok;
    // on a plant with a pest: never; on one with none, alive and not covered: always
    expect(feeds.filter(pestOn).length).toBeGreaterThan(800);
    expect(feeds.filter(pestOn).every((v) => !ok(v) && (v.want as { why: string }).why === "soil")).toBe(true);
    expect(feeds.filter((v) => !pestOn(v) && ok(v)).length).toBeGreaterThan(500);
    for (const id of COVERS) {
      expect(feeds.some((v) => v.args[3] === id && pestOn(v)), id).toBe(true);
      expect(feeds.some((v) => v.args[3] === id && ok(v)), id).toBe(true);
    }
    // a cure is taken by every plant with a pest and by none without
    const curing = all.filter((v) => v.fn === "cure" && cures.has(v.args[3] as string));
    const pestOnCure = (v: Vector) => see(v.args[0] as string, v.args[2] as Plot, v.args[4] as number).pest;
    expect(curing.filter(pestOnCure).length).toBeGreaterThan(300);
    expect(curing.every((v) => ok(v) === pestOnCure(v))).toBe(true);
    // what the hand is offered says the same: a cover never where there is a pest
    const offers = all.filter((v) => v.fn === "deed_for" && covers.has(v.args[2] as string));
    // (a plant may ripen with its pest still on it: its owner is then offered the picking, never the cover)
    const onPest = offers.filter((v) => see(v.args[0] as string, v.args[1] as Plot, v.args[4] as number).pest);
    expect(onPest.length).toBeGreaterThan(1500);
    expect(onPest.every((v) => v.want === null || v.want === "pick")).toBe(true);
    expect(offers.filter((v) => v.want === "feed").length).toBeGreaterThan(900);
    // and what makes a plant grow goes on with a pest there or not
    expect(all.some((v) => v.fn === "feed" && PUT_ON[v.args[3] as ItemId] === "feed" && pestOn(v) && ok(v))).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v140.json`, JSON.stringify({ cases: all })); }
  });
});
