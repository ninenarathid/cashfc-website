import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsFarming } from "./db-vectors-gifts-farming.test";
import { FARMING, dust, pestAt, pourFor, pourRow, see, tend, theirsAt, type Bed, type Plant, type Plot } from "./farm";
import { pestToRid } from "./insects";
import { wearing } from "./gifts";
import { vectorsLines } from "./db-vectors-lines.test";
import { HELPING, aided, belled, bridged, chime, diesAt, dustUntil, pouredAs, ring, runOf, share, type Aid } from "./helping";
import { countsOf, type Done } from "./line-points";
import type { Nature } from "./waters";
import { CROP_IDS, type ItemId } from "./items";
import { dayOf, staminaOf } from "./stamina";
import { HOUR, newPurse, put, type Purse } from "./trade";
import { BEDS_IN_FARM, bedCorner, rowOf } from "./world";

/**
 * The cases the database's rules of the helpers' line's gifts are held to (v153; lib/town/db-vectors-gifts.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers:
 *
 * - **the farming line as it was built**: every case of lib/town/db-vectors-gifts-farming.test.ts, asked again of
 *   the rules with the helpers' on top of them (the farm's own cases under a clear sky are among those): nobody in
 *   them wears a gift of the helpers' line but the gloves, and each answers as the code does.
 * - `theirs_at`: plots with a plant of mine, of another's and with none, in beds that are mine, another's, nobody's.
 * - `run_of`, `chime`, `bridged`: runs of every length, fresh, at the gap's very end and past it, kept wrongly; the
 *   anklet worn and not; seconds of every sort.
 * - `tend`: waterings and other work on plants of mine and of others, in beds of mine, of others and nobody's, with
 *   the gloves, the anklet, both and neither, a run short, at nineteen and past twenty, stamina and none.
 * - `pour_for`, `pour_row`: rows of every sort (thirsty, wet, ripe, bare, mixed; mine, another's, both), stood on
 *   anywhere along them and off them, the gloves worn and not, a can with much water, little and none, another thing
 *   in the hand, marks of every sort, and seconds told and not.
 * - `poured_as`: waterings of every size kept under every sky and water (hot and not; the dew's, the rain's, the
 *   moon's and none), once, twice and three times over, by a wearer of the bell and not; and what is no watering (a
 *   plant watered before, another plant, no plant, nothing added).
 * - `ring`: beds with waterings of mine at this moment and of others a moment ago, at the very end of the ten
 *   seconds, past them and long ago; marked as a bell-wearer's and not, rung already and not, once, twice and three
 *   times over; the bell worn by me and not; friends whose purses are held, and not.
 * - `belled`: gauges full, nearly full, half and empty; plants from none to more than a day's bound; a day's count
 *   fresh, near the bound, at it, of yesterday, and kept wrongly. `aided`: purses told of nothing yet, of some, of
 *   as many as are kept, and of what is kept wrongly.
 * - `share`: wearers of the ring and not, with uses left and none, of today and of yesterday; gauges of both from
 *   empty to full, whole and not; a friend near, at the reach's end, past it, and nowhere.
 * - `dies_at`, `dust_until`, `see`, `rid_pick`, `dust`: plants a pest struck (found by the farm's own roll), dusted
 *   never, once, twice, before the pest, long ago and just now, looked at before the six hours, at their very end,
 *   within the dust's twelve and past them; and the sprinkling itself, with the dust had and not, the day's five
 *   used and not, on a plant with a pest, with none, dead, one's own, and one the dust still lies on.
 * - `counts_of`: **the lines of work as they were counted** (every case of lib/town/db-vectors-lines.test.ts for
 *   what something done counts for, asked again of the rule written again), and a bell that rang, for every number
 *   of plants.
 *
 * Under a clear sky (the stand-in's weather is empty for these days).
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-helpers.test.ts
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
const NOW = at("2026-10-05T10:00:00");
const ME = "00000000-0000-0000-0000-000000000001", YOU = "00000000-0000-0000-0000-000000000002", THEM = "00000000-0000-0000-0000-000000000003";

export function vectorsHelpers(): Vector[] {
  const c = chance(20261071), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  // the farming line as it was built
  for (const v of vectorsFarming()) out.push(v);

  /** A purse with these gifts, this in the hand, a can of so many waterings among its things, and so much stamina. */
  const purse = (gifts: Purse["gifts"] | undefined, hand: ItemId | null, water: number, left: number, more: Partial<Purse> = {}): Purse => {
    const p = newPurse(), bag = put(put(put(p.bag, "can", 1), "hoe", 1), "pestCure", 2).map((s) => (s?.item === "can" && water > 0 ? { ...s, water } : s));
    return { ...p, stamina: { day: dayOf(NOW), left }, bag, hand, ...(gifts ? { gifts } : {}), ...more } as Purse;
  };
  const GIFTS: Array<Purse["gifts"] | undefined> = [
    { had: ["charmGloves"], charms: ["charmGloves"] }, { had: ["charmGloves", "charmAnklet"], charms: ["charmGloves", "charmAnklet"] }, { had: ["charmGloves", "charmAnklet"], charms: ["charmAnklet"] },
    { had: ["charmGloves", "charmAnklet"], charms: [] }, { had: ["charmAnklet", "charmHoe"], charms: ["charmHoe", "charmAnklet"] }, undefined,
  ];
  /** A run as a purse may keep it: none, short, at the gap's end, past it, near twenty, long, and kept wrongly. */
  const G = HELPING.anklet.gap * 1000;
  const runs = (): unknown => c.of<unknown>([undefined, undefined, { n: 1, at: NOW - 1000 }, { n: c.int(2, 17), at: NOW - c.int(0, G) }, { n: 5, at: NOW - G }, { n: 5, at: NOW - G - 1 }, { n: 18, at: NOW - 500 },
    { n: 19, at: NOW - 500 }, { n: 20, at: NOW }, { n: 31, at: NOW - G + 1 }, { n: 12, at: NOW - 5 * G }, { n: 9999, at: NOW - 1 }, { n: 3.7, at: NOW - 2 }, { n: 0, at: NOW }, { n: -2, at: NOW }, { n: 4, at: NOW + 500 },
    { n: "4", at: NOW }, { n: 4 }, "x", null, [3, NOW], { n: 6, at: NOW - G - 4000 }, { n: 6, at: NOW - G - 11000 }, { n: 6, at: NOW - G - 13000 }]);
  const plant = (by: string, over: Partial<Plant> = {}): Plant => ({ by, crop: c.of(CROP_IDS), sown: NOW - c.int(2, 30) * HOUR - c.int(0, 3_599_999), boost: c.maybe(0.3) ? c.int(1, 4) * 1_800_000 : 0, watered: 0, fed: 0, guard: NOW + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...over });

  // whose a plot's work is
  for (const plot of [undefined, { soil: "tilled", plant: null }, { soil: "tilled", plant: plant(ME) }, { soil: "tilled", plant: plant(YOU) }] as Array<Plot | undefined>) for (const owner of [null, ME, YOU]) {
    add("theirs_at", [plot ?? null, owner, ME], theirsAt(plot, owner, ME));
  }
  // the anklet's run
  for (let i = 0; i < 260; i++) {
    const kept = runs(), p = { ...purse(c.of(GIFTS), "can", 5, c.of([100, 3, 0])), ...(kept === undefined ? {} : { chime: kept }) } as Purse;
    const now = c.of([NOW, NOW, NOW + c.int(1, 9000)]), secs = c.of([0, 0.4, 3.2, 4, 11.9, 12, 40, -3]);
    add("run_of", [p, now], runOf(p, now));
    add("chime", [p, now], chime(p, now));
    add("bridged", [p, secs, now], bridged(p, secs, now));
  }
  // tending for somebody else, with the gloves and the anklet
  for (let i = 0; i < 420; i++) {
    const [bx, by] = bedCorner(c.int(0, BEDS_IN_FARM - 1)), key = `${bx + c.int(0, 6)},${by + c.int(0, 6)}`;
    const whose = c.of([YOU, YOU, YOU, ME, THEM]), bedBy = c.of([whose, whose, YOU, ME, null]), kept = runs();
    const hand = c.of<ItemId | null>(["can", "can", "can", "can", "hoe", "pestCure", null]);
    const p = { ...purse(c.of(GIFTS), hand, c.of([8, 8, 1, 0]), c.of([100, 100, 1, 0])), ...(kept === undefined ? {} : { chime: kept }) } as Purse;
    const plot: Plot = c.maybe(0.12) ? { soil: c.of(["wild", "cleared"]), plant: null } : { soil: "tilled", plant: plant(whose, { watered: c.of([0, 0, 0, NOW - 10 * 60_000, NOW - HOUR]) }) };
    const bed: Bed | null = bedBy === null ? null : { by: bedBy, tended: NOW - c.of([1, 30, 97]) * HOUR, empty: 0 };
    add("tend", [key, plot, bed, c.of([0, 3]), 0, p, ME, NOW], tend(key, plot, bed ?? undefined, c.of([0, 3]), 0, p, ME, NOW));
  }
  // (tend was asked with numbers drawn twice above: answered again as it was asked)
  for (const v of out.slice(-420)) v.want = JSON.parse(JSON.stringify(tend(v.args[0] as string, v.args[1] as Plot, (v.args[2] as Bed | null) ?? undefined, v.args[3] as number, v.args[4] as number, v.args[5] as Purse, v.args[6] as string, v.args[7] as number)));
  // rows poured along
  for (let i = 0; i < 420; i++) {
    const bed = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(bed), y = by + c.int(0, 6), keys = rowOf(bx, y).map(([u, v]) => `${u},${v}`);
    const whose = c.of([YOU, YOU, YOU, YOU, ME, null]), sort = c.of(["thirsty", "thirsty", "thirsty", "mixed", "mixed", "mine", "both"]), plots: Record<string, Plot> = {};
    for (const key of keys) {
      const what = sort === "thirsty" ? 0 : c.next(), by2 = sort === "mine" ? ME : sort === "both" ? c.of([ME, YOU]) : whose ?? THEM;
      if (what < 0.62) plots[key] = { soil: "tilled", plant: plant(by2) };
      else if (what < 0.74) plots[key] = { soil: "tilled", plant: plant(by2, { watered: NOW - c.of([10, 59]) * 60_000 }) };
      else if (what < 0.84) plots[key] = { soil: c.of(["tilled", "cleared"]), plant: null };
      else if (what < 0.92) plots[key] = { soil: "tilled", plant: plant(by2, { crop: "pumpkin", sown: NOW - 400 * HOUR }) };
    }
    const keeping: Bed | null = whose === null ? null : { by: whose, tended: NOW - c.of([1, 1, 30, 97]) * HOUR, empty: 0 };
    const kept = runs(), hand = c.of<ItemId | null>(["can", "can", "can", "can", "can", "hoe", null]);
    const p = { ...purse(c.of([GIFTS[0], GIFTS[0], GIFTS[1], GIFTS[1], GIFTS[2], GIFTS[3], undefined]), hand, c.of([8, 8, 8, 20, 4, 2, 1, 0]), c.of([100, 100, 2, 0])), ...(kept === undefined ? {} : { chime: kept }) } as Purse;
    const grown = keys.filter((k) => !!plots[k]?.plant), stood = c.maybe(0.92) ? c.of(grown.length && c.maybe(0.85) ? grown : keys) : `${bx + 7},${y}`, rest = c.of([0, 0, 2]);
    const owner = c.of<string | null>([whose, whose, whose, ME, null]);
    add("pour_for", [stood, keys, plots, p, ME, NOW, owner], pourFor(stood, keys, plots, p, ME, NOW, owner));
    const marks = c.of<() => Record<string, boolean>>([
      () => Object.fromEntries(keys.map((k) => [k, true])), () => Object.fromEntries(keys.map((k) => [k, true])), () => Object.fromEntries(keys.map((k, n) => [k, n < c.int(0, 7)])),
      () => Object.fromEntries(keys.filter(() => c.maybe(0.7)).map((k) => [k, c.maybe(0.7)])), () => ({ ...Object.fromEntries(keys.map((k) => [k, true])), "1,1": true }), () => Object.fromEntries(keys.map((k) => [k, false])), () => ({}),
    ])();
    const secs = c.of([0, 0, 3.4, 4.1, 12, 30]);
    add("pour_row", [stood, keys, plots, keeping, rest, 0, p, ME, NOW, marks, secs], pourRow(stood, keys, plots, keeping ?? undefined, rest, 0, p, ME, NOW, marks, secs));
  }
  // a watering as it is kept
  for (let i = 0; i < 320; i++) {
    const p = plant(c.of([YOU, ME]), { watered: c.of([0, 0, 0, NOW - HOUR, NOW - 61 * 60_000]), guard: c.of([0, NOW + 3 * HOUR, NOW + 30 * HOUR]) }), was: Plot = { soil: "tilled", plant: p };
    const base = c.of([1_800_000, 1_800_000, 2_700_000, 3_960_000, 1_800_000 * 1.5 * 1.15, 0.1 + 0.2, 0, -5]);
    const next: Plot = c.of<() => Plot>([
      () => ({ soil: "tilled", plant: { ...p, watered: NOW, boost: p.boost + base } }), () => ({ soil: "tilled", plant: { ...p, watered: NOW, boost: p.boost + base } }), () => ({ soil: "tilled", plant: { ...p, watered: NOW, boost: p.boost + base } }),
      () => ({ soil: "tilled", plant: { ...p, watered: NOW - 1, boost: p.boost + base } }), () => ({ soil: "tilled", plant: { ...p, sown: p.sown + 1, watered: NOW, boost: p.boost + base } }),
      () => ({ soil: "cleared", plant: null }), () => ({ soil: "tilled", plant: { ...p, fed: NOW } }),
    ])();
    const before = c.of<Plot | null>([was, was, was, was, { soil: "tilled", plant: { ...p, watered: NOW } }, { soil: "tilled", plant: null }, null]);
    const hot = c.maybe(0.35), kind = c.of<Nature | null>([null, null, null, "dawn", "rain", "moon"]), times = c.of([1, 1, 2, 2, 3]), worn = c.maybe(0.3);
    add("poured_as", [before, next, NOW, hot, kind, ME, times, worn], pouredAs(before ?? undefined, next, NOW, hot, kind, ME, times, worn));
  }
  // a bed rung over
  const ADDS = 1_800_000;
  for (let i = 0; i < 460; i++) {
    const bedN = c.int(0, BEDS_IN_FARM - 1), [bx, by] = bedCorner(bedN), bed: Record<string, Plot> = {}, watered: string[] = [];
    const lately = () => NOW - c.of([0, 1, 3000, 3000, 9999, 10000, 10001, 60000]);
    for (let n = c.of([1, 2, 4, 8, 14]); n > 0; n--) {
      const key = `${bx + c.int(0, 6)},${by + c.int(0, 6)}`, what = c.next(), base = c.of([ADDS, ADDS, ADDS * 1.5]), x = c.of([1, 1, 2, 3, 1.5, 2.5]);
      if (what < 0.08) { bed[key] = { soil: "tilled", plant: null }; continue; }
      if (what < 0.2) { bed[key] = { soil: "tilled", plant: plant(YOU, { watered: c.of([0, NOW - HOUR]) }) }; continue; }
      const mine = what < 0.55, by2 = mine ? ME : c.of([YOU, YOU, THEM]), when = mine ? c.of([NOW, NOW, NOW, NOW - 2000]) : lately();
      const mark = { by: by2, at: c.maybe(0.06) ? when - 5 : when, base, x, ...(c.maybe(mine ? 0.5 : 0.4) ? { worn: true } : {}), ...(c.maybe(mine ? 0.1 : 0.25) ? { bell: true } : {}) };
      bed[key] = { soil: "tilled", plant: plant(YOU, { watered: when, boost: c.of([0, 900_000]) + base * x, pour: c.maybe(0.05) ? ("x" as unknown as Plant["pour"]) : mark }) };
      if (mine && c.maybe(0.85)) watered.push(key);
    }
    if (c.maybe(0.1)) watered.push(`${bx},${by}`);
    const wears = c.maybe(0.5), may = c.of<string[] | null>([null, null, null, [YOU], [YOU, THEM], [THEM], []]);
    add("ring", [bed, [...new Set(watered)], ME, wears, NOW, may], ring(bed, [...new Set(watered)], ME, wears, NOW, may));
  }
  // what a bell gives back, and what a purse is told of
  {
    const day = dayOf(NOW);
    for (const left of [100, 99, 97.5, 50, 0]) for (const plants of [0, 1, 7, 25, 30]) for (const rung of [undefined, { day, n: 0 }, { day, n: 3 }, { day, n: 24 }, { day, n: 25 }, { day: day - 1, n: 25 }, { day, n: 3.5 }, "x", { day: String(day), n: 2 }]) {
      const p = { ...purse(undefined, null, 0, left), ...(rung === undefined ? {} : { rung }) } as Purse;
      add("belled", [p, plants, NOW], belled(p, plants, NOW));
    }
    // (and on a day the gauge has not been counted yet: it is full)
    const fresh = { ...purse(undefined, null, 0, 40), stamina: { day: day - 1, left: 40 } } as Purse;
    add("belled", [fresh, 5, NOW], belled(fresh, 5, NOW));
    const told = (n: number): Aid[] => Array.from({ length: n }, (_, i) => ({ what: c.of(["bell", "ring", "dust"] as const), by: YOU, name: "Yo", n: i + 1, at: NOW - (n - i) * 1000 }));
    for (const kept of [undefined, [], told(1), told(7), told(8), told(11), "x", [null, 3, { what: "ring" }, ...told(2)]]) for (const aid of [{ what: "bell", by: YOU, name: "Yo", n: 3, at: NOW, back: 6 }, { what: "dust", by: THEM, name: "", n: 1, at: NOW, key: "132,7" }] as Aid[]) {
      const p = { ...purse(undefined, null, 0, 50), ...(kept === undefined ? {} : { aided: kept }) } as Purse;
      add("aided", [p, aid], aided(p, aid));
    }
  }
  // strength shared
  {
    const day = dayOf(NOW), RING = { had: ["charmRing"], charms: ["charmRing"] };
    const wearers: Array<Purse["gifts"] | undefined> = [RING, RING, RING, { ...RING, used: { charmRing: { k: day, n: 1 } } }, { ...RING, used: { charmRing: { k: day, n: 2 } } }, { ...RING, used: { charmRing: { k: day, n: 3 } } },
      { ...RING, used: { charmRing: { k: day - 1, n: 3 } } }, { had: ["charmRing"], charms: [] }, { had: ["charmGloves"], charms: ["charmGloves"] }, undefined];
    for (const gifts of wearers) for (const mine of [100, 15, 14.9, 7.5, 0]) for (const theirs of [0, 50, 70, 85, 87.3, 99.9, 100]) {
      const far = c.of<number | null>([0, 1, 2.2, 3, 3, 3.01, 12, -1, null]);
      const a = purse(gifts, null, 0, mine), b = { ...purse(c.maybe(0.2) ? { had: ["charmBell"], charms: ["charmBell"] } : undefined, null, 0, theirs), ...(c.maybe(0.3) ? { aided: [{ what: "bell", by: THEM, name: "Th", n: 2, at: NOW - 5000, back: 4 }] } : {}) } as Purse;
      add("share", [a, b, ME, "Me", far, NOW], share(a, b, ME, "Me", far as number, NOW));
    }
    // (a friend whose gauge has not been counted today: it is full)
    const fresh = { ...purse(undefined, null, 0, 20), stamina: { day: day - 1, left: 20 } } as Purse;
    add("share", [purse(RING, null, 0, 80), fresh, ME, "Me", 1, NOW], share(purse(RING, null, 0, 80), fresh, ME, "Me", 1, NOW));
  }
  // the dying clock, and the dust that stops it
  {
    const KILLS = FARMING.pests.kills * HOUR, DUST = { had: ["thingDust"], charms: [] };
    let found = 0;
    for (let i = 0; i < 4000 && found < 150; i++) {
      const [bx, by] = bedCorner(c.int(0, BEDS_IN_FARM - 1)), key = `${bx + c.int(0, 6)},${by + c.int(0, 6)}`;
      const sown = NOW - c.int(60, 110) * HOUR - c.int(0, 3_599_999), base: Plant = { by: c.of([YOU, YOU, ME]), crop: "pumpkin", sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
      const struck = pestAt(key, base, NOW + 40 * HOUR);
      if (struck === null) continue;
      found++;
      // dusted: never; once in time; once too late; twice, the second as the first runs out; before the pest came; and kept wrongly
      const lists = c.of<() => unknown>([() => undefined, () => [struck + c.of([1, 3, 5]) * HOUR + c.int(0, 999)], () => [struck + KILLS], () => [struck + KILLS + 1], () => [struck + 7 * HOUR],
        () => [struck + 2 * HOUR, struck + 14 * HOUR], () => [struck + 2 * HOUR, struck + 14 * HOUR + c.of([0, HOUR, 5 * HOUR])], () => [struck - 20 * HOUR], () => [struck - 6 * HOUR], () => [struck + HOUR, "x", null], () => "x", () => []])();
      const p = { ...base, ...(lists === undefined ? {} : { dust: lists }) } as Plant, plot: Plot = { soil: "tilled", plant: p };
      add("dies_at", [p, struck, KILLS], diesAt(p, struck, KILLS));
      for (const dt of [HOUR, 2 * HOUR + 1, KILLS, KILLS + 1, 9 * HOUR, 13 * HOUR, 14 * HOUR, 18 * HOUR, 18 * HOUR + 1, 20 * HOUR + 5, 26 * HOUR, 27 * HOUR, 40 * HOUR].filter(() => c.maybe(0.5))) {
        const now = struck + dt;
        add("see", [key, plot, now], see(key, plot, now));
        add("dust_until", [p, now], dustUntil(p, now));
        const used = c.of<unknown>([undefined, undefined, { thingDust: { k: dayOf(now), n: 2 } }, { thingDust: { k: dayOf(now), n: 5 } }, { thingDust: { k: dayOf(now) - 1, n: 5 } }]);
        const gifts = c.of<Purse["gifts"] | undefined>([DUST, DUST, DUST, { had: ["thingDust", "charmGloves"], charms: ["charmGloves"] }, { had: ["charmGloves"], charms: ["charmGloves"] }, undefined]);
        const mine = purse(gifts && used !== undefined ? ({ ...gifts, used } as Purse["gifts"]) : gifts, null, 0, c.of([100, 0]));
        add("dust", [key, mine, plot, ME, now], dust(key, mine, plot, ME, now));
      }
      // (and a few plants beside it, some with a pest: which of them an insect caught would rid of it)
      const bedPlots: Record<string, Plot> = { [key]: plot, [`${bx + 7},${by}`]: { soil: "tilled", plant: null } };
      for (let n = 0; n < 5; n++) bedPlots[`${bx + c.int(0, 6)},${by + c.int(0, 6)}`] ??= { soil: "tilled", plant: { ...base, sown: sown + n * 1000, guard: c.maybe(0.4) ? NOW + 999 * HOUR : 0 } };
      for (const dt of [3 * HOUR, 8 * HOUR, 15 * HOUR, 30 * HOUR]) for (const pick of [0, 0.5, 0.99]) add("rid_pick", [bedPlots, struck + dt, pick], pestToRid(bedPlots, struck + dt, [], pick));
    }
    // (a plant with no pest, no plant at all: nothing to sprinkle it on)
    const clean: Plot = { soil: "tilled", plant: plant(YOU) };
    add("dust", ["132,7", purse(DUST, null, 0, 100), clean, ME, NOW], dust("132,7", purse(DUST, null, 0, 100), clean, ME, NOW));
    add("dust", ["132,7", purse(DUST, null, 0, 100), { soil: "tilled", plant: null }, ME, NOW], dust("132,7", purse(DUST, null, 0, 100), { soil: "tilled", plant: null }, ME, NOW));
    for (const whose of [YOU, ME, ""]) for (const doer of [ME, YOU]) {
      const d: Done = { from: "deed", what: "dust", thing: "pumpkin", n: 1, doc: whose ? { whose, tile: [132, 7] } : { tile: [132, 7] } };
      add("counts_of", [d, doer], countsOf(d, doer));
    }
  }
  // the lines of work as they were counted, and a bell that rang
  for (const v of vectorsLines()) if (v.fn === "counts_of") out.push(v);
  for (const n of [0, 1, 3, 7, 2.5, -1]) for (const doer of [ME, YOU]) {
    const d: Done = { from: "deed", what: "bell", thing: null, n, doc: { bed: 3, with: [YOU], plants: 7 } };
    add("counts_of", [d, doer], countsOf(d, doer));
  }
  // (and rows poured one after another by a wearer of both, whatever chance gave above: the run kept alive by the pours' own seconds, crossing twenty, and begun anew)
  {
    const [bx, by] = bedCorner(4), keys = rowOf(bx, by + 2).map(([u, v]) => `${u},${v}`), keeping: Bed = { by: YOU, tended: NOW - HOUR, empty: 0 };
    const plots = Object.fromEntries(keys.map((k) => [k, { soil: "tilled", plant: plant(YOU) } as Plot])), marks = Object.fromEntries(keys.map((k) => [k, true]));
    let p = purse(GIFTS[1], "can", 60, 100);
    for (const [dt, secs] of [[0, 4], [11000, 4], [17000, 3], [40000, 0], [45000, 5]]) {
      const did = pourRow(keys[2], keys, plots, keeping, 0, 0, p, ME, NOW + dt, marks, secs);
      add("pour_row", [keys[2], keys, plots, keeping, 0, 0, p, ME, NOW + dt, marks, secs], did);
      if (did.ok) p = did.purse;
    }
  }
  return out;
}

describe("the cases the database's rules of the helpers' line's gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsHelpers();
    expect(JSON.stringify(vectorsHelpers())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    // the farming line's own cases are all among them
    expect(all.length).toBeGreaterThan(vectorsFarming().length + 1500);
    // a run: none, short, at twenty and past it, begun anew; the anklet not worn
    const chimes = of("chime").map((v) => ({ p: v.args[0] as Purse, d: v.want as { purse: Purse; times: number } }));
    expect(chimes.some((x) => x.d.times === 1 && !x.d.purse.chime) && chimes.some((x) => x.d.times === 2 && x.d.purse.chime!.n === 1) && chimes.some((x) => x.d.times === 2 && x.d.purse.chime!.n > 1 && x.d.purse.chime!.n < 20)).toBe(true);
    expect(chimes.some((x) => x.d.times === HELPING.anklet.top && x.d.purse.chime!.n === 20) && chimes.some((x) => x.d.times === HELPING.anklet.top && x.d.purse.chime!.n > 20)).toBe(true);
    const runs = of("run_of").map((v) => v.want as number);
    expect(runs.some((n) => n === 0) && runs.some((n) => n === 5) && runs.some((n) => n > 20)).toBe(true);
    expect(of("bridged").some((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])) && of("bridged").some((v) => JSON.stringify(v.want) === JSON.stringify(v.args[0]) && wearing(v.args[0] as Purse, "charmAnklet"))).toBe(true);
    // tending: for somebody else with the gloves (no stamina), without them (its cost), one's own (its cost); the anklet's twice and three times, and never on one's own
    const tended = of("tend").slice(-420).map((v) => ({ plot: v.args[1] as Plot, bed: v.args[2] as Bed | null, before: v.args[5] as Purse, me: v.args[6] as string, now: v.args[7] as number, did: v.want as { ok: boolean; deed?: string; purse?: Purse; times?: number } })).filter((x) => x.did.ok);
    const paid = (x: (typeof tended)[number]) => staminaOf(x.before, x.now) - staminaOf(x.did.purse!, x.now);
    const theirs = (x: (typeof tended)[number]) => theirsAt(x.plot, x.bed?.by ?? null, x.me);
    expect(tended.some((x) => wearing(x.before, "charmGloves") && theirs(x) && staminaOf(x.before, x.now) >= 2 && paid(x) === 0)).toBe(true);
    expect(tended.some((x) => !wearing(x.before, "charmGloves") && theirs(x) && paid(x) >= 1) && tended.some((x) => wearing(x.before, "charmGloves") && !theirs(x) && paid(x) >= 1)).toBe(true);
    expect(tended.some((x) => x.did.times === 2) && tended.some((x) => x.did.times === 3) && tended.some((x) => x.did.deed === "water" && wearing(x.before, "charmAnklet") && !theirs(x) && x.did.times === undefined)).toBe(true);
    expect(tended.every((x) => x.did.times === undefined || (x.did.deed === "water" && wearing(x.before, "charmAnklet") && theirs(x)))).toBe(true);
    expect(tended.some((x) => x.did.deed !== "water" && wearing(x.before, "charmAnklet") && theirs(x))).toBe(true);
    // rows: offered whole and in part and not at all; poured whole, in part, with nothing reached, and refused
    const fors = of("pour_for").map((v) => v.want as string[]);
    expect(fors.some((f) => f.length === 7) && fors.some((f) => f.length > 1 && f.length < 7) && fors.filter((f) => f.length === 0).length > 60).toBe(true);
    const pours = of("pour_row").map((v) => ({ p: v.args[6] as Purse, now: v.args[8] as number, secs: v.args[10] as number, d: v.want as { ok: boolean; why?: string; each?: Array<{ key: string; times: number }>; purse?: Purse } }));
    expect(pours.some((x) => x.d.ok && x.d.each!.length === 7) && pours.some((x) => x.d.ok && x.d.each!.length > 0 && x.d.each!.length < 7) && pours.some((x) => x.d.ok && x.d.each!.length === 0)).toBe(true);
    expect(pours.some((x) => !x.d.ok && x.d.why === "none")).toBe(true);
    // (for no stamina; with the anklet each plant is of the run: twice, and three times from the twentieth; and a run kept alive by the pour's own seconds)
    expect(pours.some((x) => x.d.ok && x.d.each!.length > 1 && staminaOf(x.p, NOW) >= 2 && staminaOf(x.d.purse!, NOW) === staminaOf(x.p, NOW))).toBe(true);
    expect(pours.some((x) => x.d.ok && x.d.each!.some((e) => e.times === 2) && x.d.each!.some((e) => e.times === 3)) && pours.some((x) => x.d.ok && x.d.each!.length > 0 && x.d.each!.every((e) => e.times === 1))).toBe(true);
    expect(pours.some((x) => x.d.ok && x.d.each!.length > 0 && x.secs > 0 && runOf(x.p, x.now) === 0 && x.d.purse!.chime!.n > x.d.each!.length)).toBe(true);
    // a watering kept: once, twice, three times over; made the more by the sky and bound at three with a gift in it; with the moon's guard; and what is no watering left as it is
    const kept = of("poured_as").map((v) => ({ next: v.args[1] as Plot, times: v.args[6] as number, d: v.want as Plot }));
    const xs = kept.flatMap((k) => (k.d.plant?.pour && k.d.plant.pour.at === NOW ? [{ x: k.d.plant.pour.x, times: k.times }] : []));
    for (const x of [1, 1.5, 2, 2.5, 3]) expect(xs.some((k) => k.x === x), String(x)).toBe(true);
    expect(xs.every((k) => k.x <= HELPING.most) && xs.some((k) => k.x === 3 && k.times === 2) && xs.some((k) => k.x === 2 && k.times === 2) && xs.some((k) => k.x === 2 && k.times === 1)).toBe(true);
    expect(kept.some((k) => k.d.plant?.pour?.worn === true) && kept.some((k) => !!k.d.plant?.pour && k.d.plant.guard > (k.next.plant?.guard ?? 0))).toBe(true);
    expect(kept.filter((k) => JSON.stringify(k.d) === JSON.stringify(k.next)).length).toBeGreaterThan(60);
    // the bell: rung for me alone, for a friend too, for two friends; not rung with nobody near, with no bell between us, with nothing of mine to double, with a friend whose purse is not held
    const rings = of("ring").map((v) => ({ wears: v.args[3] as boolean, may: v.args[5] as string[] | null, d: v.want as { plots: Record<string, Plot>; mine: string[]; pals: Record<string, string[]>; near: string[] } | null }));
    expect(rings.filter((r) => r.d).length).toBeGreaterThan(60);
    expect(rings.filter((r) => !r.d).length).toBeGreaterThan(60);
    expect(rings.some((r) => r.d && Object.keys(r.d.pals).length === 0) && rings.some((r) => r.d && Object.keys(r.d.pals).length === 1) && rings.some((r) => r.d && Object.keys(r.d.pals).length === 2)).toBe(true);
    expect(rings.some((r) => r.d && !r.wears) && rings.some((r) => r.d && r.may !== null)).toBe(true);
    // (a friend whose watering had rung already is rung with all the same, and not doubled again)
    expect(rings.some((r) => r.d && r.d.near.length > Object.keys(r.d.pals).length) && rings.every((r) => !r.d || r.d.near.length >= 1)).toBe(true);
    const rungX = rings.flatMap((r) => (r.d ? Object.values(r.d.plots).map((pl) => pl.plant!.pour!.x) : []));
    expect(rungX.every((x) => x <= HELPING.most) && rungX.some((x) => x === 2) && rungX.some((x) => x === 3)).toBe(true);
    const backs = of("belled").map((v) => (v.want as { back: number }).back);
    expect(backs.some((b) => b === 0) && backs.some((b) => b === 14) && backs.some((b) => b === 2.5) && backs.some((b) => b === 2) && backs.some((b) => b === 50)).toBe(true);
    expect(of("aided").some((v) => (v.want as Purse).aided!.length === HELPING.told) && of("aided").some((v) => (v.want as Purse).aided!.length === 1)).toBe(true);
    expect(of("counts_of").length).toBeGreaterThan(200);
    // the dust: a plant kept alive by it past its six hours, one it came too late for, one whose dust has run out and is dead; sprinkled, and refused each way
    const dies = of("dies_at").map((v) => ({ p: v.args[0] as Plant, struck: v.args[1] as number, kills: v.args[2] as number, at: v.want as number }));
    expect(dies.some((d) => d.at === d.struck + d.kills) && dies.some((d) => d.at === d.struck + d.kills + 12 * HOUR) && dies.some((d) => d.at === d.struck + d.kills + 24 * HOUR) && dies.some((d) => d.at > d.struck + d.kills && d.at < d.struck + d.kills + 12 * HOUR)).toBe(true);
    const seenDust = of("see").map((v) => ({ key: v.args[0] as string, plot: v.args[1] as Plot, now: v.args[2] as number, s: v.want as { pest: boolean; dead: boolean } })).filter((x) => Array.isArray(x.plot.plant?.dust) && x.plot.plant!.dust!.length > 0);
    const bare = (x: (typeof seenDust)[number]) => see(x.key, { ...x.plot, plant: { ...x.plot.plant!, dust: undefined } }, x.now);
    expect(seenDust.filter((x) => x.s.pest && !x.s.dead && bare(x).dead).length).toBeGreaterThan(20);
    expect(seenDust.some((x) => x.s.dead && bare(x).dead) && seenDust.some((x) => x.s.pest && bare(x).pest)).toBe(true);
    const dusts = of("dust").map((v) => v.want as { ok: boolean; why?: string; left?: number; plot?: Plot });
    expect(dusts.filter((d) => d.ok).length).toBeGreaterThan(30);
    expect(dusts.some((d) => d.ok && d.left === 4) && dusts.some((d) => d.ok && d.left === 2) && dusts.some((d) => d.ok && d.plot!.plant!.dust!.length === 2)).toBe(true);
    for (const why of ["none", "spent", "soil", "own", "running"]) expect(dusts.some((d) => !d.ok && d.why === why), why).toBe(true);
    expect(of("dust_until").some((v) => v.want === null) && of("dust_until").some((v) => typeof v.want === "number")).toBe(true);
    expect(of("rid_pick").some((v) => v.want === null) && of("rid_pick").some((v) => typeof v.want === "string")).toBe(true);
    // the ring: thirty given for fifteen, less where the friend's gauge has less room, and refused each way
    const shares = of("share").map((v) => v.want as { ok: boolean; why?: string; gave?: number; paid?: number; left?: number; theirs?: Purse });
    expect(shares.some((d) => d.ok && d.gave === 30 && d.paid === 15 && d.left === 2) && shares.some((d) => d.ok && d.gave! < 30 && d.gave! > 0 && d.paid === d.gave! / 2) && shares.some((d) => d.ok && d.left === 0)).toBe(true);
    for (const why of ["none", "spent", "far", "full", "weak"]) expect(shares.some((d) => !d.ok && d.why === why), why).toBe(true);
    expect(shares.every((d) => !d.ok || (d.theirs!.stamina.left <= 100 && d.theirs!.aided!.at(-1)!.what === "ring"))).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-helpers.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
