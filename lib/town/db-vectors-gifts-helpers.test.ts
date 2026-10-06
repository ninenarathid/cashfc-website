import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsFarming } from "./db-vectors-gifts-farming.test";
import { pourFor, pourRow, tend, theirsAt, type Bed, type Plant, type Plot } from "./farm";
import { wearing } from "./gifts";
import { HELPING, bridged, chime, pouredAs, runOf } from "./helping";
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
  const runs = (): unknown => c.of<unknown>([undefined, undefined, { n: 1, at: NOW - 1000 }, { n: c.int(2, 17), at: NOW - c.int(0, 8000) }, { n: 5, at: NOW - 8000 }, { n: 5, at: NOW - 8001 }, { n: 18, at: NOW - 500 },
    { n: 19, at: NOW - 500 }, { n: 20, at: NOW }, { n: 31, at: NOW - 7999 }, { n: 12, at: NOW - 60000 }, { n: 9999, at: NOW - 1 }, { n: 3.7, at: NOW - 2 }, { n: 0, at: NOW }, { n: -2, at: NOW }, { n: 4, at: NOW + 500 },
    { n: "4", at: NOW }, { n: 4 }, "x", null, [3, NOW], { n: 6, at: NOW - 12000 }, { n: 6, at: NOW - 19000 }, { n: 6, at: NOW - 21000 }]);
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
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-helpers.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
