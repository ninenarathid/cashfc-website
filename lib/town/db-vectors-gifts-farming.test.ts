import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsV110 } from "./db-vectors.test";
import { vectorsV147 } from "./db-vectors-swarm.test";
import { BEDS, HOURGLASS, encoreHours, glassTurn, gnomeWater, growing, grown, moreOf, pestAt, pick, pouchPlots, pouchSeeds, quickMs, rowFor, rowTend, see, tend, type Bed, type Plant, type Plot } from "./farm";
import { usedOf } from "./gifts";
import { CROPS, CROP_IDS, type ItemId } from "./items";
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
 * - rows reaped with the sickle (`row_for`, `row_tend` again): ripe plants of every pace, some bearing again, some
 *   not ripe, plots with none; one's own bed, somebody else's and nobody's; the charm worn and not; nothing in the
 *   hand, a blade, and a thing with a deed of its own; marks of every sort; bags with room, with little, with none.
 * - **the farm as it was**: every case the farm's own rules were held to under a clear sky when their files ran
 *   (lib/town/db-vectors.test.ts's v110 cases, lib/town/db-vectors-swarm.test.ts's v147 cases with no insect
 *   counted), asked again of the functions v153 writes again and of those that stand on them (`grown`, `pest_at`,
 *   `see`, `water`, `pick`, `feed`, `cure`, `deed_for`, `tend`): no plant of them has a gift's mark, and each
 *   answers as it did.
 * - the hourglass: `quick_ms` between moments either side of every stretch; `grown`, `growing`, `pest_at` and
 *   `see` of plants it was turned over once, twice, long ago and just now, growing, picked and bearing again;
 *   `glass_turn` over beds of every sort, had and not, used today and yesterday, running and not, mine and not.
 * - the mandrake: `more_of`; `pick` and `tend` of plants at a first picking, a last one, one that was sung to and
 *   waits, one that is ripe for its bearing more, and one past it, with the mandrake following and not, songs left
 *   and none, a count of today and of yesterday; and `growing`, `pest_at`, `see` of the same plants.
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
  // the farm as it was: its own cases under a clear sky, asked again of what is written again and of what stands on it
  const AS_IT_WAS = new Set(["grown", "pest_at", "see", "water", "pick", "feed", "cure", "deed_for", "tend"]);
  for (const v of vectorsV110()) if (AS_IT_WAS.has(v.fn)) add(v.fn, v.args, v.want);
  for (const v of vectorsV147().cases) if (v.sky === 0 && AS_IT_WAS.has(v.fn)) add(v.fn, v.args, v.want);

  // the hourglass: the growth it adds, and every clock that counts it
  const SPAN = HOURGLASS.hours * HOUR;
  for (let i = 0; i < 220; i++) {
    const [bx, by] = bedCorner(c.int(0, BEDS_IN_FARM - 1)), key = `${bx + c.int(0, 6)},${by + c.int(0, 6)}`;
    const crop = c.of(CROP_IDS), k = CROPS[crop], sown = NOW - c.int(1, Math.ceil(k.hours * 1.2)) * HOUR - c.int(0, 3_599_999);
    // turned once, twice, three times: long ago, lately, at this very moment, and (kept wrongly) not a moment at all
    const turns = () => c.of([sown + c.int(0, 30) * HOUR, NOW - c.int(0, 5) * HOUR - c.int(0, 3_599_999), NOW - SPAN, NOW, sown - HOUR]);
    const fast = c.of<() => unknown>([() => [turns()], () => [turns()], () => [turns(), turns()].sort((a, b) => a - b), () => [turns(), turns(), turns()].sort((a, b) => a - b), () => [], () => [turns(), "x", null]])();
    const plant = { by: c.of([ME, YOU]), crop, sown, boost: c.maybe(0.3) ? c.int(1, 4) * 1_800_000 : 0, watered: 0, fed: c.maybe(0.2) ? sown + HOUR : 0, guard: c.maybe(0.5) ? NOW + 99 * HOUR : 0,
      cured: 0, picked: 0, pickedAt: 0, fast } as Plant;
    if (k.again && c.maybe(0.4)) { plant.picked = 1; plant.pickedAt = Math.max(sown + 1, NOW - c.int(0, Math.ceil(k.again * 1.3)) * HOUR - c.int(0, 3_599_999)); }
    const plot: Plot = { soil: "tilled", plant };
    for (const now of [NOW, NOW - c.int(1, 6) * HOUR, NOW + c.int(1, 40) * HOUR + c.int(0, 3_599_999)]) {
      add("quick_ms", [plant, sown, now], quickMs(plant, sown, now));
      add("quick_ms", [plant, now - c.int(1, 9) * HOUR, now], quickMs(plant, now - c.int(1, 9) * HOUR, now));
      add("grown", [plant, now], grown(plant, now));
      add("growing", [plant, now], growing(plant, now));
      add("pest_at", [key, plant, now], pestAt(key, plant, now));
      add("see", [key, plot, now], see(key, plot, now));
    }
  }
  // (quick_ms was asked with a moment of its own above: answered again as it was asked)
  for (const v of out) if (v.fn === "quick_ms") v.want = quickMs(v.args[0] as Plant, v.args[1] as number, v.args[2] as number);
  // …and turned over a bed
  for (let i = 0; i < 260; i++) {
    const bed = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(bed), me = c.of([ME, ME, YOU]), plots: Record<string, Plot> = {};
    const full = c.of([0, 1, 4, 12, 25]), sort = c.of(["growing", "growing", "growing", "mixed", "ripe"]);
    // (whether an hourglass was ever turned over this bed: never, long ago, or so lately that it still runs)
    const turnedAt = c.of(["never", "never", "never", "never", "old", "old", "running"]);
    for (let n = 0; n < full; n++) {
      const key = `${bx + c.int(0, 6)},${by + c.int(0, 6)}`;
      if (c.maybe(0.1)) { plots[key] = c.of(SOILS); continue; }
      const crop = c.of(CROP_IDS), k = CROPS[crop], part = sort === "ripe" ? 1.2 : sort === "mixed" ? c.of([0.3, 1.2]) : c.of([0.1, 0.5, 0.9]);
      const sown = NOW - Math.ceil(k.hours * part) * HOUR - c.int(0, 3_599_999);
      const plant: Plant = { by: me, crop, sown, boost: 0, watered: 0, fed: 0, guard: c.maybe(0.7) ? NOW + 99 * HOUR : 0, cured: 0, picked: 0, pickedAt: 0,
        ...(turnedAt !== "never" && c.maybe(0.6) ? { fast: turnedAt === "old" ? c.of([[NOW - 30 * HOUR], [NOW - 30 * HOUR, NOW - SPAN]]) : c.of([[NOW - HOUR], [NOW - SPAN + 1], [NOW - 30 * HOUR, NOW]]) } : {}) };
      plots[key] = { soil: "tilled", plant };
    }
    const day = dayOf(NOW);
    const used = c.of<unknown>([undefined, undefined, undefined, undefined, { thingHourglass: { k: day, n: 1 } }, { thingHourglass: { k: day - 1, n: 1 } }, { thingHourglass: { k: day, n: 0 }, famMandrake: { k: day, n: 3 } }]);
    const gifts = c.of<Purse["gifts"] | undefined>([{ had: ["thingHourglass"], charms: [] }, { had: ["thingHourglass"], charms: [] }, { had: ["thingHourglass", "charmHoe"], charms: ["charmHoe"] }, { had: ["charmHoe"], charms: [] }, undefined]);
    const p = purse(gifts && used !== undefined ? ({ ...gifts, used } as Purse["gifts"]) : gifts, null, [["can", 1]], c.of([100, 0]));
    const owner = c.of<string | null>([me, me, me, me, me === ME ? YOU : ME, null]);
    add("glass_turn", [plots, p, me, NOW, owner], glassTurn(plots, p, me, NOW, owner));
  }
  // the mandrake's song: a plant at each of its pickings, sung to and not
  for (let i = 0; i < 460; i++) {
    const [bx, by] = bedCorner(c.int(0, BEDS_IN_FARM - 1)), key = `${bx + c.int(0, 6)},${by + c.int(0, 6)}`, me = c.of([ME, ME, YOU]);
    const crop = c.of(CROP_IDS), k = CROPS[crop], picks = k.picks ?? 1, wait = encoreHours(crop);
    const state = c.of(["first", "last", "last", "last", "waiting", "encore", "encore", "over"]);
    const plant: Plant = { by: me, crop, sown: NOW - Math.ceil(k.hours * 1.3) * HOUR - c.int(0, 3_599_999) - (picks + 2) * Math.ceil(wait) * HOUR, boost: 0, watered: 0, fed: 0, guard: c.maybe(0.8) ? NOW + 999 * HOUR : 0, cured: 0, picked: 0, pickedAt: 0 };
    if (state === "last" && picks > 1) { plant.picked = picks - 1; plant.pickedAt = NOW - Math.ceil((k.again ?? 1) * c.of([1.2, 1.2, 0.4])) * HOUR; }
    if (state === "waiting") { plant.picked = picks; plant.pickedAt = NOW - Math.floor(wait * c.of([0.2, 0.5, 0.99]) * HOUR); plant.more = 1; }
    if (state === "encore") { plant.picked = picks; plant.pickedAt = NOW - Math.ceil(wait * 1.1) * HOUR; (plant as { more?: unknown }).more = c.of<unknown>([1, 1, 1, 1, 2, "1", 0, 2.5, -1]); }
    if (state === "over") { plant.picked = picks + 1; plant.pickedAt = NOW - 5 * HOUR; plant.more = 1; }
    const plot: Plot = { soil: "tilled", plant }, day = dayOf(NOW);
    const used = c.of<unknown>([undefined, undefined, { famMandrake: { k: day, n: c.of([0, 3, 6]) } }, { famMandrake: { k: day, n: c.of([7, 9]) } }, { famMandrake: { k: day - 1, n: 7 } }, { famMandrake: "7" }]);
    const gifts = c.of<Purse["gifts"] | undefined>([{ had: ["famMandrake"], charms: [], familiar: "famMandrake" }, { had: ["famMandrake"], charms: [], familiar: "famMandrake" }, { had: ["famMandrake", "charmSickle"], charms: ["charmSickle"], familiar: "famMandrake" },
      { had: ["famMandrake", "famGnome"], charms: [], familiar: "famGnome" }, { had: ["famMandrake"], charms: [] }, undefined]);
    const hand = c.of<ItemId | null>([null, null, "sickle", "shears"]);
    const p = purse(gifts && used !== undefined ? ({ ...gifts, used } as Purse["gifts"]) : gifts, hand, [["sickle", 1], ["shears", 1]], c.of([100, 100, 1, 0]));
    add("more_of", [plant], moreOf(plant));
    for (const now of [NOW, NOW + c.int(1, Math.ceil(wait * 1.5)) * HOUR + c.int(0, 3_599_999)]) {
      add("growing", [plant, now], growing(plant, now));
      add("pest_at", [key, plant, now], pestAt(key, plant, now));
      add("see", [key, plot, now], see(key, plot, now));
    }
    const may = c.maybe(0.92);
    add("pick", [key, p, plot, may, hand, NOW], pick(key, p, plot, may, hand, NOW));
    const bed: Bed | null = c.maybe(0.85) ? { by: me, tended: NOW - HOUR, empty: 0 } : null, others = c.of([0, 0, 3]);
    add("tend", [key, plot, bed, others, 0, p, me, NOW], tend(key, plot, bed ?? undefined, others, 0, p, me, NOW));
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
  // rows reaped with the sickle
  for (let i = 0; i < 340; i++) {
    const bed = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(bed), y = by + c.int(0, 6), keys = rowOf(bx, y).map(([u, v]) => `${u},${v}`);
    const me = c.of([ME, ME, YOU]), other = me === ME ? YOU : ME, whose = c.of([me, me, me, me, me, me, me, other, null]), plots: Record<string, Plot> = {};
    for (const key of keys) {
      const what = c.next();
      if (what < 0.08) { plots[key] = SOILS[1]; continue; }
      if (what < 0.14) continue;
      const crop = c.of(CROP_IDS), k = CROPS[crop], sown = NOW - Math.ceil(k.hours * c.of([1.05, 1.05, 1.05, 1.05, 1.3, 0.5])) * HOUR - c.int(0, 3_599_999);
      const plant: Plant = { by: whose ?? me, crop, sown, boost: 0, watered: 0, fed: 0, guard: c.maybe(0.85) ? NOW + 99 * HOUR : 0, cured: 0, picked: 0, pickedAt: 0 };
      // (one that bears again, picked before: ripe again, or not yet; and one on its last picking)
      if (k.again && c.maybe(0.4)) { plant.picked = c.maybe(0.3) ? (k.picks ?? 1) - 1 : 1; plant.pickedAt = NOW - Math.round(k.again * c.of([1.1, 1.1, 0.4]) * HOUR); }
      plots[key] = { soil: "tilled", plant };
    }
    const keeping: Bed | null = whose === null ? null : { by: whose, tended: NOW - c.of([1, 1, 30, 97]) * HOUR, empty: 0 };
    const gifts = c.of<Purse["gifts"] | undefined>([{ had: ["charmSickle"], charms: ["charmSickle"] }, { had: ["charmSickle"], charms: ["charmSickle"] }, { had: ["charmSickle", "famMandrake"], charms: ["charmSickle"], familiar: "famMandrake" }, { had: ["charmSickle", "charmHoe"], charms: ["charmHoe", "charmSickle"] },
      { had: ["charmSickle"], charms: [] }, undefined]);
    const hand = c.of<ItemId | null>([null, null, null, null, "sickle", "sickle", "shears", "can", "hoe"]);
    const base = purse(gifts, hand, [["sickle", 1], ["shears", 1], ["can", 1], ["hoe", 1]], c.of([100, 100, 5, 0]));
    // (a bag with room, with little, with none: the last slots taken up by something else)
    const taken = c.of([0, 0, 0, 0, 0, 4, 5, 6]), free = base.bag.map((s, n) => (s === null ? n : -1)).filter((n) => n >= 0).slice(-taken || base.bag.length);
    const p = { ...base, bag: base.bag.map((s, n) => (taken && free.includes(n) ? { item: "bowl" as ItemId, n: 1 } : s)) } as Purse;
    const grown = keys.filter((k) => !!plots[k]?.plant), stood = c.maybe(0.92) ? c.of(grown.length && c.maybe(0.85) ? grown : keys) : `${bx + 7},${y}`, rest = c.of([0, 0, 2]);
    const owner = c.of<string | null>([me, me, me, whose, null]);
    add("row_for", [stood, keys, plots, p, me, NOW, owner], rowFor(stood, keys, plots, p, me, NOW, owner));
    const marks = c.of<() => Record<string, boolean>>([
      () => Object.fromEntries(keys.map((k) => [k, true])), () => Object.fromEntries(keys.map((k) => [k, c.maybe(0.6)])), () => Object.fromEntries(keys.map((k) => [k, c.maybe(0.6)])),
      () => Object.fromEntries(keys.filter(() => c.maybe(0.7)).map((k) => [k, c.maybe(0.7)])), () => Object.fromEntries(keys.map((k) => [k, false])), () => ({}),
    ])();
    add("row_tend", [stood, keys, plots, keeping, rest, 0, p, me, NOW, marks], rowTend(stood, keys, plots, keeping ?? undefined, rest, 0, p, me, NOW, marks));
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
    // the sickle: a row picked with good cuts and bad, a plant left that the sweep did not go along, the bag too full for a plant and for its one more
    const reaps = of("row_tend").map((v) => ({ marks: v.args[9] as Record<string, boolean>, d: v.want as { ok: boolean; why?: string; deed?: string; each?: Array<{ key: string; n: number; well?: boolean }>; plots?: Record<string, Plot>; bed?: Bed } }))
      .filter((x) => !x.d.ok || x.d.deed === "pick");
    const picked = reaps.filter((x) => x.d.ok && x.d.each!.length > 0);
    expect(picked.length).toBeGreaterThan(40);
    expect(picked.some((x) => x.d.each!.length >= 5) && picked.some((x) => x.d.each!.some((e) => e.well) && x.d.each!.some((e) => !e.well))).toBe(true);
    expect(reaps.some((x) => !x.d.ok && x.d.why === "full") && reaps.some((x) => x.d.ok && x.d.each!.length === 0)).toBe(true);
    // (a plant picked for the last time leaves its plot bare; one that bears again stays, picked once more)
    expect(picked.some((x) => Object.values(x.d.plots!).some((pl) => pl.plant === null)) && picked.some((x) => Object.values(x.d.plots!).some((pl) => (pl.plant?.picked ?? 0) > 0))).toBe(true);
    // the farm as it was: its own cases are among them, by the hundred
    for (const fn of ["grown", "pest_at", "see", "water", "pick", "feed", "cure", "deed_for", "tend"]) expect(of(fn).length, fn).toBeGreaterThan(100);
    // the hourglass: growth added in part and in whole, none for a plant it was not turned over; a plant ripe for it that would not have been
    const quick = of("quick_ms").map((v) => v.want as number);
    expect(quick.some((q) => q === 0) && quick.some((q) => q === 2 * HOURGLASS.hours * HOUR) && quick.some((q) => q > 0 && q < 2 * HOURGLASS.hours * HOUR) && quick.some((q) => q > 2 * HOURGLASS.hours * HOUR)).toBe(true);
    const ripeFor = of("growing").filter((v) => { const pl = v.args[0] as Plant; return Array.isArray(pl.fast) && (v.want as { ripe: boolean }).ripe && !growing({ ...pl, fast: [] }, v.args[1] as number).ripe; });
    expect(ripeFor.length).toBeGreaterThan(3);
    expect(ripeFor.some((v) => (v.args[0] as Plant).picked > 0) && ripeFor.some((v) => (v.args[0] as Plant).picked === 0)).toBe(true);
    // …turned, and refused each way; a turning counted, and one of yesterday's that no longer counts
    const turned = of("glass_turn").map((v) => ({ purse: v.args[1] as Purse, now: v.args[3] as number, d: v.want as { ok: boolean; why?: string; quickened?: string[]; purse?: Purse } }));
    expect(turned.filter((x) => x.d.ok).length).toBeGreaterThan(25);
    for (const why of ["none", "spent", "theirs", "running", "soil"]) expect(turned.some((x) => !x.d.ok && x.d.why === why), why).toBe(true);
    expect(turned.every((x) => !x.d.ok || usedOf(x.d.purse!, "thingHourglass", x.now) === 1)).toBe(true);
    expect(turned.some((x) => x.d.ok && (x.purse.gifts?.used as Record<string, { k: number }> | undefined)?.thingHourglass?.k === dayOf(x.now) - 1)).toBe(true);
    // the mandrake: a plant sung to at its last picking (one picked once, and one that bears again), not sung to before its last, nor twice, nor without the mandrake, nor with no song left
    const sang = (v: Vector) => { const was = (v.args[2] as Plot).plant!, d = v.want as { ok: boolean; plot?: Plot }; return d.ok && !!d.plot!.plant && moreOf(d.plot!.plant) > moreOf(was); };
    const picks = of("pick"), lastOf = (v: Vector) => { const pl = (v.args[2] as Plot).plant!; return pl.picked + 1 >= (CROPS[pl.crop].picks ?? 1) + moreOf(pl); };
    expect(picks.filter(sang).length).toBeGreaterThan(20);
    expect(picks.some((v) => sang(v) && (CROPS[(v.args[2] as Plot).plant!.crop].picks ?? 1) === 1) && picks.some((v) => sang(v) && (CROPS[(v.args[2] as Plot).plant!.crop].picks ?? 1) > 1)).toBe(true);
    expect(picks.every((v) => !sang(v) || (lastOf(v) && usedOf((v.want as { purse: Purse }).purse, "famMandrake", v.args[5] as number) === usedOf(v.args[1] as Purse, "famMandrake", v.args[5] as number) + 1))).toBe(true);
    const gone = picks.filter((v) => (v.want as { ok: boolean; plot?: Plot }).ok && (v.want as { plot: Plot }).plot.plant === null);
    expect(gone.some((v) => usedOf(v.args[1] as Purse, "famMandrake", v.args[5] as number) >= 7) && gone.some((v) => moreOf((v.args[2] as Plot).plant!) > 0) && gone.some((v) => !(v.args[1] as Purse).gifts)).toBe(true);
    expect(of("tend").some((v) => (v.want as { ok: boolean; deed?: string; plot?: Plot }).ok && (v.want as { deed: string }).deed === "pick" && moreOf((v.want as { plot: Plot }).plot.plant ?? ({} as Plant)) > moreOf((v.args[1] as Plot).plant ?? ({} as Plant)))).toBe(true);
    // (a plant that waits for its bearing more is not ripe, and one whose wait is over is; one past it is spent)
    const sung = of("growing").filter((v) => moreOf(v.args[0] as Plant) > 0).map((v) => v.want as { ripe: boolean; spent: boolean });
    expect(sung.some((g) => g.ripe) && sung.some((g) => !g.ripe && !g.spent) && sung.some((g) => g.spent)).toBe(true);
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
