import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GROUND, drop, pickUp, type Dropped } from "./ground";
import { newPurse, type Purse, type Stack } from "./trade";
import { FARM, FOREST, placeOf } from "./world";

/**
 * The cases the database's rules of things dropped on the ground are held to (v137; lib/town/db-vectors-box.test.ts
 * is the same for the storage box, and says how). Two kinds:
 *
 * - **rules**: each a function of the schema `town` with its arguments and what the code answers: which tiles are on
 *   a map, a slot dropped (things that stack, that do not, that hold something; slots and tiles that are and are not),
 *   and a thing picked up (there, gone, its time run out to the millisecond, from by it and from too far, into bags
 *   with room and without);
 * - **stories**: two members and a run of deeds, one after another, each with what the code answers and what both bags
 *   and the ground hold after it, the clock put on between them so that things are lost: the dry run does the same
 *   through the functions a member calls.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-ground.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
type Step =
  | { deed: "drop"; who: 0 | 1; slot: number; at: [number, number]; wait: number; want: { ok: boolean; why?: string }; bags: [Purse["bag"], Purse["bag"]]; lying: Array<[number, string, number]> }
  | { deed: "take"; who: 0 | 1; nth: number; at: [number, number]; wait: number; want: { ok: boolean; why?: string; item?: string; n?: number }; bags: [Purse["bag"], Purse["bag"]]; lying: Array<[number, string, number]> }
  | { deed: "fill"; who: 0 | 1; bag: Purse["bag"] };
interface Story { bags: [Purse["bag"], Purse["bag"]]; steps: Step[] }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

const THINGS: Stack[] = [
  { item: "kangkong", n: 7 }, { item: "kangkong", n: 20 }, { item: "kangkong", n: 13 }, { item: "minnow", n: 1 }, { item: "minnow", n: 19 }, { item: "worm", n: 12 },
  { item: "cabbage", n: 10 }, { item: "koi", n: 1 }, { item: "rod", n: 1 }, { item: "hoe", n: 1 }, { item: "boot", n: 2 }, { item: "scrollFriedMinnow", n: 1 },
  { item: "bucket", n: 1, water: 1 }, { item: "bucket", n: 1 }, { item: "can", n: 1, water: 0 }, { item: "can", n: 1, water: 6 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } },
];
const HERE: [number, number] = [30, 40], NOW = Date.parse("2026-10-06T09:00:00+07:00");
const ON: Array<[number, number]> = [HERE, [0, 0], [63, 63], [FARM.x + 3, FARM.y + 3], [FOREST.x + 50, FOREST.y + 70]];
const OFF: Array<[number, number]> = [[-1, 5], [64, 5], [100, 100], [FARM.x + FARM.w, FARM.y], [FOREST.x - 1, FOREST.y + 4]];
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const WHO = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"];

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(137);
  // which tiles are on a map: along every edge of the three, and a scatter
  const edges: Array<[number, number]> = [];
  for (const [x, y, w, h] of [[0, 0, 64, 64], [FARM.x, FARM.y, FARM.w, FARM.h], [FOREST.x, FOREST.y, FOREST.w, FOREST.h]]) {
    for (const dx of [-1, 0, 1, w - 1, w]) for (const dy of [-1, 0, 1, h - 1, h]) edges.push([x + dx, y + dy]);
  }
  for (let i = 0; i < 60; i++) edges.push([c.int(-5, 250), c.int(-5, 200)]);
  for (const at of edges) out.push({ fn: "on_ground", args: at, want: placeOf(at[0], at[1]) !== null });
  const bag = (full: number) => Array.from({ length: c.of([10, 10, 15]) }, () => (c.maybe(full) ? { ...c.of(THINGS) } : null));
  for (let i = 0; i < 500; i++) {
    const purse: Purse = { ...newPurse(), coins: c.int(0, 40), bag: bag(c.of([0.3, 0.7, 1])) };
    if (c.maybe(0.2)) purse.hand = purse.bag.find(Boolean)?.item ?? null;
    const slot = c.of([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10, 14, 15, -1]), at = c.maybe(0.85) ? c.of(ON) : c.of(OFF), now = NOW + c.int(0, 99_999), id = c.int(1, 9999);
    out.push({ fn: "ground_drop", args: plain([purse, slot, WHO[0], at[0], at[1], now, id]), want: plain(drop(purse, slot, WHO[0], at, now, id)) });
  }
  for (let i = 0; i < 700; i++) {
    const purse: Purse = { ...newPurse(), coins: c.int(0, 40), bag: bag(c.of([0, 0.5, 0.9, 1])) };
    const lies = c.of(ON), now = NOW + c.int(0, 99_999);
    // (its time mostly not yet run out; sometimes at the very millisecond, or long ago)
    const d: Dropped | null = c.maybe(0.08) ? null : { id: c.int(1, 9999), by: c.of(WHO), stack: { ...c.of(THINGS) }, at: lies, until: now + c.of([1, 1, 500, 9_999, 10_000, 10_000, 0, -1, -60_000]) };
    const from: [number, number] = c.maybe(0.8) ? [lies[0] + c.int(-1, 1), lies[1] + c.int(-1, 1)] : [lies[0] + c.of([-2, 2, 0, 5]), lies[1] + c.of([2, -2, 3, 0])];
    out.push({ fn: "ground_pick", args: plain([purse, d, from[0], from[1], now]), want: plain(pickUp(purse, d, from, now)) });
  }
  return out;
}

function story(seed: number): Story {
  const c = chance(seed);
  const fresh = (full: number) => Array.from({ length: 10 }, () => (c.maybe(full) ? { ...c.of(THINGS) } : null));
  const purses: [Purse, Purse] = [{ ...newPurse(), bag: fresh(0.8) }, { ...newPurse(), bag: fresh(0.4) }];
  const first: [Purse["bag"], Purse["bag"]] = [plain(purses[0].bag), plain(purses[1].bag)];
  let ground: Dropped[] = [], now = NOW, next = 1;
  const steps: Step[] = [];
  const told = (): Array<[number, string, number]> => ground.filter((d) => d.until > now).map((d) => [d.id, d.stack.item, d.stack.n]);
  for (let i = 0; i < 60; i++) {
    const who = c.maybe(0.5) ? 0 : 1;
    if (i % 15 === 14) {
      purses[who] = { ...purses[who], bag: fresh(0.9) };
      steps.push({ deed: "fill", who, bag: plain(purses[who].bag) });
      continue;
    }
    // (a little while goes by before each deed: mostly a second or two, now and then longer than a thing lies)
    const wait = c.maybe(0.85) ? c.int(200, 3000) : c.int(9000, 14_000);
    now += wait;
    const lying = ground.filter((d) => d.until > now);
    if (c.maybe(0.5) || !lying.length) {
      const taken = purses[who].bag.flatMap((s, k) => (s ? [k] : []));
      const slot = taken.length && c.maybe(0.9) ? c.of(taken) : c.int(-1, 11), at = c.maybe(0.95) ? HERE : c.of(OFF);
      const did = drop(purses[who], slot, WHO[who], at, now, next);
      if (did.ok) { purses[who] = did.purse; ground.push(did.dropped); next++; }
      steps.push({ deed: "drop", who, slot, at, wait, want: did.ok ? { ok: true } : { ok: false, why: did.why }, bags: [plain(purses[0].bag), plain(purses[1].bag)], lying: told() });
    } else {
      // (the n-th thing ever dropped in this story: mostly one that lies, sometimes one that is gone)
      const d = c.maybe(0.85) ? c.of(lying) : c.of(ground), nth = ground.indexOf(d);
      const at: [number, number] = c.maybe(0.9) ? [HERE[0] + c.int(-1, 1), HERE[1] + c.int(-1, 1)] : [HERE[0] + 2, HERE[1]];
      const still = ground[nth].until > now ? ground[nth] : null, did = pickUp(purses[who], still, at, now);
      if (did.ok) { purses[who] = did.purse; ground[nth] = { ...ground[nth], until: -1 }; }
      steps.push({ deed: "take", who, nth, at, wait, want: did.ok ? { ok: true, item: did.item, n: did.n } : { ok: false, why: did.why }, bags: [plain(purses[0].bag), plain(purses[1].bag)], lying: told() });
    }
  }
  return { bags: first, steps };
}

describe("the cases the database's rules of things dropped on the ground are held to", () => {
  it("are made the same every time: the rules, and stories of two who drop things and pick them up", () => {
    const made = () => ({ lasts: GROUND.lasts, rules: rules(), stories: Array.from({ length: 24 }, (_, i) => story(1370 + i)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    expect(all.rules.length).toBeGreaterThan(1200);
    const whys = (fn: string) => new Set(all.rules.filter((v) => v.fn === fn).map((v) => (v.want as { ok?: boolean; why?: string }).ok ? "ok" : (v.want as { why?: string }).why));
    expect(whys("ground_drop")).toEqual(new Set(["ok", "none"]));
    expect(whys("ground_pick")).toEqual(new Set(["ok", "lost", "far", "full"]));
    const done = (fn: string) => all.rules.filter((v) => v.fn === fn && (v.want as { ok: boolean }).ok);
    expect(done("ground_drop").length).toBeGreaterThan(200);
    expect(done("ground_pick").length).toBeGreaterThan(150);
    // a thing that holds something dropped and picked up as it is; a tile on no map refused though the slot has a thing
    expect(done("ground_drop").some((v) => (v.want as { dropped: Dropped }).dropped.stack.of)).toBe(true);
    expect(done("ground_pick").some((v) => ((v.args[1] as Dropped).stack.water ?? 0) > 0)).toBe(true);
    expect(all.rules.some((v) => v.fn === "ground_drop" && !(v.want as { ok: boolean }).ok && !!(v.args[0] as Purse).bag[v.args[1] as number])).toBe(true);
    expect(all.rules.filter((v) => v.fn === "on_ground").some((v) => v.want === true)).toBe(true);
    expect(all.rules.filter((v) => v.fn === "on_ground").some((v) => v.want === false)).toBe(true);
    // the stories: things handed from one to the other, picked back by their dropper, lost, and refused each way
    const steps = all.stories.flatMap((s) => s.steps).flatMap((s) => (s.deed === "fill" ? [] : [s]));
    expect(steps.filter((s) => s.deed === "drop" && s.want.ok).length).toBeGreaterThan(300);
    expect(steps.filter((s) => s.deed === "take" && s.want.ok).length).toBeGreaterThan(150);
    expect(new Set(steps.filter((s) => s.deed === "take" && !s.want.ok).map((s) => s.want.why))).toEqual(new Set(["lost", "far", "full"]));
    expect(steps.some((s) => s.deed === "drop" && !s.want.ok)).toBe(true);
    expect(steps.some((s) => s.lying.length >= 3)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v137.json`, JSON.stringify(all)); }
  });
});
