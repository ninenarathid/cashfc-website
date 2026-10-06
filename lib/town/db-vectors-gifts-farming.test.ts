import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { BEDS, gnomeWater, pouchPlots, pouchSeeds, rowFor, rowTend, type Bed, type Plant, type Plot } from "./farm";
import { CROP_IDS, type ItemId } from "./items";
import { dayOf } from "./stamina";
import { HOUR, held, newPurse, put, type Purse } from "./trade";
import { BEDS_IN_FARM, FARM, bedCorner, bedOf, rowOf } from "./world";

/**
 * The cases the database's rules of the farming line's gifts are held to (v153; lib/town/db-vectors-gifts.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers:
 *
 * - `row_keys`: the row of its bed a tile is in, for every tile of the farm's first rows and columns and some off it;
 * - `row_for`, `row_tend`: rows of every sort (weeds, cleared, tilled, with plants, mixed), stood on anywhere along
 *   them and off them, in one's own bed, somebody else's, nobody's and one that has lapsed, with each gift worn and
 *   not, the right thing in the hand and not, stamina and none, and marks of every sort.
 *
 * - `pouch_seeds`, `pouch_plots`: every count of plots and of seeds, for a row of seven and of other lengths; and
 *   rows to sow (`row_for`, `row_tend` again): tilled plots and plots not ready, the pouch had and not, a seed in
 *   the hand and not, from one seed to more than enough, a free bed taken and refused to whoever holds two.
 * - `gnome_water`: beds with plants of every pace sown at many moments (growing, ripe, bearing again, watered a
 *   while ago and just now), bare soil and nothing at all; the gnome following, another familiar, none; rounds kept
 *   for this bed and for others, fresh, old and kept wrongly; one's own bed, somebody else's and nobody's.
 *
 * Under a clear sky (the stand-in's weather is empty for these days).
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-farming.test.ts
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOW = at("2026-10-05T13:00:00");
const ME = "00000000-0000-0000-0000-000000000001", YOU = "00000000-0000-0000-0000-000000000002";

export function vectorsFarming(): Vector[] {
  const c = chance(20261053), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });

  // the row of its bed a tile is in: across the farm's first two beds and the grass between, down past a bed's foot, and off the farm
  for (let x = FARM.x; x < FARM.x + 22; x++) for (const y of [FARM.y + 3, FARM.y + 4, FARM.y + 10, FARM.y + 11, FARM.y + 12, FARM.y + 26]) add("row_keys", [x, y], rowOf(x, y).map(([u, v]) => `${u},${v}`));
  for (const [x, y] of [[0, 0], [30, 30], [FARM.x + 57, FARM.y + 39], [FARM.x + 55, FARM.y + 39], [-3, 5]] as Array<[number, number]>) add("row_keys", [x, y], rowOf(x, y).map(([u, v]) => `${u},${v}`));

  const purse = (gifts: Purse["gifts"] | undefined, hand: ItemId | null, items: Array<[ItemId, number]>, left: number): Purse => {
    const p = newPurse();
    return { ...p, stamina: { day: dayOf(NOW), left }, bag: items.reduce((bag, [id, n]) => put(bag, id, n), p.bag), hand, ...(gifts ? { gifts } : {}) } as Purse;
  };
  const SOILS: Plot[] = [{ soil: "cleared", plant: null }, { soil: "tilled", plant: null }];
  for (let i = 0; i < 420; i++) {
    const bed = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(bed), y = by + c.int(0, 6), keys = rowOf(bx, y).map(([u, v]) => `${u},${v}`);
    // the row: mostly weeds (not kept), some plots cleared or tilled; now and then all of one sort
    const sort = c.of(["mixed", "mixed", "mixed", "wild", "cleared", "tilled"]), plots: Record<string, Plot> = {};
    for (const key of keys) {
      if (sort === "wild" || (sort === "mixed" && c.maybe(0.45))) continue;
      plots[key] = sort === "cleared" ? SOILS[0] : sort === "tilled" ? SOILS[1] : c.of(SOILS);
    }
    const me = c.of([ME, ME, YOU]), whose = c.of([me, me, me === ME ? YOU : ME, null, null]);
    const keeping: Bed | null = whose === null ? null : { by: whose, tended: NOW - c.of([1, 30, 97, 200]) * HOUR, empty: c.of([0, 0, NOW - 2 * HOUR, NOW - 30 * HOUR]) };
    const gifts = c.of<Purse["gifts"] | undefined>([{ had: ["charmHoe"], charms: ["charmHoe"] }, { had: ["charmHoe"], charms: ["charmHoe"] }, { had: ["charmHoe", "charmGloves"], charms: ["charmGloves", "charmHoe"] },
      { had: ["charmHoe"], charms: [] }, undefined]);
    const hand = c.of<ItemId | null>(["hoe", "hoe", "hoe", "hoeIron", "can", null]);
    const p = purse(gifts, hand, c.maybe(0.9) ? [["hoe", 1], ["hoeIron", 1], ["can", 1]] : [["can", 1]], c.of([100, 100, 9, 3, 0]));
    const stood = c.maybe(0.9) ? c.of(keys) : `${bx + 7},${y}`, rest = c.of([0, 0, 2]), holds = c.of([0, 1, 2]);
    const owner = c.of<string | null>([null, me, whose]);
    add("row_for", [stood, keys, plots, p, me, NOW, owner], rowFor(stood, keys, plots, p, me, NOW, owner));
    // marks: every beat hit, none, some, some with a word of a plot that is not of the row, and nothing said at all
    const marks = c.of<() => Record<string, boolean>>([
      () => Object.fromEntries(keys.map((k) => [k, true])), () => Object.fromEntries(keys.map((k) => [k, true])), () => Object.fromEntries(keys.map((k) => [k, c.maybe(0.6)])),
      () => Object.fromEntries(keys.filter(() => c.maybe(0.7)).map((k) => [k, c.maybe(0.7)])), () => ({ ...Object.fromEntries(keys.map((k) => [k, c.maybe(0.8)])), "1,1": true }),
      () => Object.fromEntries(keys.map((k) => [k, false])), () => ({}),
    ])();
    add("row_tend", [stood, keys, plots, keeping, rest, holds, p, me, NOW, marks], rowTend(stood, keys, plots, keeping ?? undefined, rest, holds, p, me, NOW, marks));
  }
  // the gnome sent down a bed
  for (let i = 0; i < 260; i++) {
    const bed = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(bed), me = c.of([ME, ME, YOU]), plots: Record<string, Plot> = {};
    const full = c.of([0, 3, 12, 30]);
    for (let n = 0; n < full; n++) {
      const key = `${bx + c.int(0, 6)},${by + c.int(0, 6)}`;
      if (c.maybe(0.15)) { plots[key] = c.of(SOILS); continue; }
      const crop = c.of(CROP_IDS), sown = NOW - c.int(1, 70) * HOUR - c.int(0, 3_599_999);
      const plant: Plant = { by: me, crop, sown, boost: c.maybe(0.3) ? c.int(1, 4) * 1_800_000 : 0, watered: c.of([0, 0, NOW - 10 * 60_000, NOW - 59 * 60_000 - 59_999, NOW - HOUR, NOW - 3 * HOUR]),
        fed: c.maybe(0.2) ? sown + HOUR : 0, guard: c.maybe(0.6) ? NOW + 24 * HOUR : 0, cured: 0, picked: 0, pickedAt: 0 };
      plots[key] = { soil: "tilled", plant };
    }
    const gifts = c.of<Purse["gifts"] | undefined>([{ had: ["famGnome"], charms: [], familiar: "famGnome" }, { had: ["famGnome"], charms: [], familiar: "famGnome" }, { had: ["famGnome", "charmHoe"], charms: ["charmHoe"], familiar: "famGnome" },
      { had: ["famGnome", "famSquirrel"], charms: [], familiar: "famSquirrel" }, { had: ["famGnome"], charms: [] }, { had: [], charms: [], familiar: "famGnome" }, undefined]);
    const other = String((bed + 1) % BEDS_IN_FARM);
    const gnomed = c.of<unknown>([undefined, undefined, undefined, { [bed]: NOW - 10 * 60_000 }, { [bed]: NOW - 59 * 60_000 - 59_999 }, { [bed]: NOW - HOUR }, { [bed]: NOW - 5 * HOUR, [other]: NOW - 60_000 },
      { [other]: NOW - 60_000 }, { [bed]: "soon", [other]: NOW - 2 * HOUR }, "x", [NOW], { [bed]: null }]);
    const p = { ...purse(gifts, c.of<ItemId | null>(["can", null]), [["can", 1]], c.of([100, 0])), ...(gnomed === undefined ? {} : { gnomed }) } as Purse;
    const owner = c.of<string | null>([me, me, me, me === ME ? YOU : ME, null]);
    add("gnome_water", [bed, plots, p, me, NOW, owner], gnomeWater(bed, plots, p, me, NOW, owner));
  }
  // the pouch: what a row takes of it, and how far so many seeds reach
  for (const side of [7, 5, 1]) for (let n = 0; n <= 9; n++) { add("pouch_seeds", [n, side], pouchSeeds(n, side)); add("pouch_plots", [n, side], pouchPlots(n, side)); }
  // …and rows sown from it
  for (let i = 0; i < 320; i++) {
    const bed = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(bed), y = by + c.int(0, 6), keys = rowOf(bx, y).map(([u, v]) => `${u},${v}`);
    const me = c.of([ME, ME, YOU]), whose = c.of([me, me, me, me === ME ? YOU : ME, null, null]);
    // the row: mostly tilled; some plots cleared, some weeds, some with a plant already
    const sort = c.of(["tilled", "tilled", "mixed", "mixed", "mixed"]), plots: Record<string, Plot> = {};
    for (const key of keys) {
      const what = sort === "tilled" ? 0 : c.next();
      if (what < 0.6) plots[key] = SOILS[1];
      else if (what < 0.72) plots[key] = SOILS[0];
      else if (what < 0.86) plots[key] = { soil: "tilled", plant: { by: whose ?? me, crop: c.of(CROP_IDS), sown: NOW - c.int(1, 40) * HOUR, boost: 0, watered: 0, fed: 0, guard: NOW + 99 * HOUR, cured: 0, picked: 0, pickedAt: 0 } };
    }
    const keeping: Bed | null = whose === null ? null : { by: whose, tended: NOW - c.of([1, 30, 97]) * HOUR, empty: c.of([0, 0, NOW - 2 * HOUR, NOW - 30 * HOUR]) };
    const gifts = c.of<Purse["gifts"] | undefined>([{ had: ["thingPouch"], charms: [] }, { had: ["thingPouch"], charms: [] }, { had: ["thingPouch", "charmHoe"], charms: ["charmHoe"] }, { had: ["charmHoe"], charms: ["charmHoe"] }, undefined]);
    const seed = c.of<ItemId>(["seedPumpkin", "seedKangkong", "seedMango"]), hand = c.of<ItemId | null>([seed, seed, seed, seed, "hoe", null]);
    const p = purse(gifts, hand, [["hoe", 1], [seed, c.of([1, 2, 3, 4, 5, 6, 9, 20])]], c.of([100, 100, 4, 0]));
    const stood = c.maybe(0.92) ? c.of(keys) : `${bx + 7},${y}`, rest = c.of([0, 0, 2]), holds = c.of([0, 0, 1, 2]);
    const owner = c.of<string | null>([null, me, whose]);
    add("row_for", [stood, keys, plots, p, me, NOW, owner], rowFor(stood, keys, plots, p, me, NOW, owner));
    const marks = c.of<Record<string, boolean>>([{}, {}, Object.fromEntries(keys.map((k) => [k, false])), Object.fromEntries(keys.map((k) => [k, true]))]);
    add("row_tend", [stood, keys, plots, keeping, rest, holds, p, me, NOW, marks], rowTend(stood, keys, plots, keeping ?? undefined, rest, holds, p, me, NOW, marks));
  }
  return out;
}

describe("the cases the database's rules of the farming line's gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsFarming();
    expect(JSON.stringify(vectorsFarming())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    // a row of seven, and none off the beds
    const rows = of("row_keys").map((v) => ({ x: v.args[0] as number, y: v.args[1] as number, keys: v.want as string[] }));
    expect(rows.some((r) => r.keys.length === 7) && rows.some((r) => r.keys.length === 0)).toBe(true);
    for (const r of rows) expect(r.keys.length, `${r.x},${r.y}`).toBe(bedOf(r.x, r.y) < 0 ? 0 : 7);
    // the hoe's row: offered for weeds and for cleared ground, whole and in part, and not offered
    const fors = of("row_for").map((v) => v.want as { deed: string; plots: string[] } | null);
    for (const deed of ["clear", "till"]) expect(fors.some((f) => f?.deed === deed && f.plots.length === 7) && fors.some((f) => f?.deed === deed && f.plots.length > 1 && f.plots.length < 7), deed).toBe(true);
    expect(fors.filter((f) => f === null).length).toBeGreaterThan(40);
    // done whole, in part, with nothing done, and refused
    const tends = of("row_tend").map((v) => ({ bed: v.args[3] as Bed | null, me: v.args[7] as string, d: v.want as { ok: boolean; why?: string; each?: unknown[]; bed?: Bed } }));
    expect(tends.some((t) => t.d.ok && t.d.each!.length === 7) && tends.some((t) => t.d.ok && t.d.each!.length > 0 && t.d.each!.length < 7) && tends.some((t) => t.d.ok && t.d.each!.length === 0)).toBe(true);
    expect(tends.some((t) => !t.d.ok && t.d.why === "none")).toBe(true);
    // in one's own bed (which it tends), in somebody else's (which stays theirs), in nobody's
    expect(tends.some((t) => t.d.ok && t.d.each!.length > 0 && t.bed?.by === t.me && t.d.bed?.tended === NOW)).toBe(true);
    expect(tends.some((t) => t.d.ok && t.d.each!.length > 0 && !!t.bed && t.bed.by !== t.me && t.d.bed?.by === t.bed.by)).toBe(true);
    expect(tends.some((t) => t.d.ok && t.d.each!.length > 0 && !t.d.bed)).toBe(true);
    // the pouch: a whole row for five seeds, fewer plots for fewer, as many as the seeds reach, a free bed taken, and refused to whoever holds as many as one may
    const sows = of("row_tend").map((v) => ({ purse: v.args[6] as Purse, bed: v.args[3] as Bed | null, holds: v.args[5] as number, me: v.args[7] as string, d: v.want as { ok: boolean; why?: string; deed?: string; each?: unknown[]; seeds?: number; purse?: Purse; bed?: Bed } }))
      .filter((x) => !x.d.ok || x.d.deed === "sow");
    const seedsIn = (p: Purse) => (p.hand ? held(p.bag, p.hand) : 0);
    expect(sows.some((x) => x.d.ok && x.d.each!.length === 7 && x.d.seeds === 5 && seedsIn(x.purse) - seedsIn({ ...x.d.purse!, hand: x.purse.hand }) === 5)).toBe(true);
    expect(sows.some((x) => x.d.ok && x.d.each!.length === 4 && x.d.seeds === 3) && sows.some((x) => x.d.ok && x.d.each!.length === 2 && x.d.seeds === 2)).toBe(true);
    expect(sows.some((x) => x.d.ok && x.d.each!.length < 7 && seedsIn({ ...x.d.purse!, hand: x.purse.hand }) === 0)).toBe(true);
    expect(sows.some((x) => x.d.ok && !x.bed && x.d.bed?.by === x.me) && sows.some((x) => !x.d.ok && x.d.why === "beds" && x.holds >= BEDS.each)).toBe(true);
    expect(of("pouch_seeds").length).toBe(30);
    // the gnome: a bed watered whole and in part, and refused each way
    const gnomes = of("gnome_water").map((v) => ({ plots: v.args[1] as Record<string, Plot>, d: v.want as { ok: boolean; why?: string; watered?: string[]; purse?: Purse } }));
    const plantsIn = (plots: Record<string, Plot>) => Object.values(plots).filter((x) => x.plant).length;
    expect(gnomes.some((g) => g.d.ok && g.d.watered!.length > 8) && gnomes.some((g) => g.d.ok && g.d.watered!.length < plantsIn(g.plots))).toBe(true);
    for (const why of ["none", "theirs", "wet", "soil"]) expect(gnomes.some((g) => !g.d.ok && g.d.why === why), why).toBe(true);
    // (a round of another bed that still counts is kept beside this one's; one that no longer does is forgotten)
    expect(gnomes.some((g) => g.d.ok && Object.keys(g.d.purse!.gnomed ?? {}).length === 2) && gnomes.some((g) => g.d.ok && Object.keys(g.d.purse!.gnomed ?? {}).length === 1)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-farming.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
