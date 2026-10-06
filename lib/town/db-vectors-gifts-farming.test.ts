import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { rowFor, rowTend, type Bed, type Plot } from "./farm";
import type { ItemId } from "./items";
import { dayOf } from "./stamina";
import { HOUR, newPurse, put, type Purse } from "./trade";
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
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-farming.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
