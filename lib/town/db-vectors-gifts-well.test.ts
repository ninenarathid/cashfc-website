import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { dayOf } from "./stamina";
import { newPurse, type Purse } from "./trade";
import { DRINK, drinkOffer, drinkTake, hasDrunk, mealHours, toastOf } from "./well-gifts";

/**
 * The cases the database's rules of the well's gifts are held to (v153's part for the well; lib/town/
 * db-vectors-box.test.ts says how such a file works). Each is a function of the schema `town` with its arguments and
 * what the code answers:
 *
 * - `is_tile`, `toast_of`, `has_drunk`: what is kept soundly and what is not (a tile of one number, of a part of one,
 *   a drink held out to nobody, a count of other hours);
 * - `drink_offer`: with the flask and without, to somebody, to oneself, to nobody, put away, from what is no tile,
 *   over a drink already held out;
 * - `drink_take`: every way it is refused, each said before the next (nothing held out, too late, too far, drunk
 *   already, a full gauge), and drunk with gauges of every sort on both sides (none, a part of a point, nearly full,
 *   full, counted on another day).
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-well.test.ts
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
const NOW = at("2026-10-07T12:00:00"), HOUR = 3_600_000;

export function vectorsGiftsWell(): Vector[] {
  const c = chance(20261074), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const day = dayOf(NOW);
  /** A gauge of every sort: none, a part of a point, some, nearly full, full, and one counted on another day. */
  const gauge = (): Purse["stamina"] => c.of<() => Purse["stamina"]>([
    () => ({ day, left: 0 }), () => ({ day, left: 0.4 }), () => ({ day, left: c.int(1, 69) }), () => ({ day, left: c.int(1, 69) + c.of([0.25, 0.5, 0.1]) }),
    () => ({ day, left: c.int(70, 99) }), () => ({ day, left: 99.6 }), () => ({ day, left: 100 }), () => ({ day: day - 1, left: c.int(0, 100) }),
  ])();
  const gifts = (): Purse["gifts"] | undefined => c.of<() => Purse["gifts"] | undefined>([
    () => ({ had: ["thingFlask"], charms: [] }), () => ({ had: ["thingFlask"], charms: [] }), () => ({ had: ["thingFlask", "famFrog", "charmHoe"], charms: ["charmHoe"], familiar: "famFrog" }),
    () => ({ had: ["thingMoon", "famFrog"], charms: [] }), () => ({ had: [], charms: [] }), () => undefined,
  ])();
  /** A tile, or what is none. */
  const tile = (): unknown => c.of<() => unknown>([
    () => [c.int(8, 14), c.int(8, 14)], () => [c.int(8, 14), c.int(8, 14)], () => [c.int(8, 14), c.int(8, 14)], () => [10, 12], () => [c.int(0, 200), c.int(0, 200)],
    () => [10.5, 12], () => [10], () => [10, 12, 3], () => [null, 12], () => ["10", 12], () => [],
  ])();
  /** A drink held out as it may be kept: sound and still held, lapsed, to somebody else, and kept wrongly. */
  const toast = (to: string): unknown => c.of<() => unknown>([
    () => ({ to, at: [10, 12], till: NOW + c.int(1, 20_000) }), () => ({ to, at: [10, 12], till: NOW + c.int(1, 20_000) }), () => ({ to, at: [c.int(8, 14), c.int(8, 14)], till: NOW + 5000 }),
    () => ({ to, at: [10, 12], till: NOW }), () => ({ to, at: [10, 12], till: NOW - c.int(1, 60_000) }), () => ({ to: "Z", at: [10, 12], till: NOW + 5000 }),
    () => undefined, () => null, () => "x", () => ({ to: "", at: [10, 12], till: NOW + 5000 }), () => ({ to, at: [10], till: NOW + 5000 }), () => ({ to, at: [10, 12.5], till: NOW + 5000 }),
    () => ({ to, at: [10, 12], till: String(NOW + 5000) }), () => ({ to: 7, at: [10, 12], till: NOW + 5000 }), () => ({ at: [10, 12], till: NOW + 5000 }),
  ])();
  /** A drink already had, as it may be kept: of these hours, of others, and kept wrongly. */
  const drunk = (): unknown => c.of<() => unknown>([
    () => undefined, () => undefined, () => undefined, () => ({ k: mealHours(NOW), by: "Q" }), () => ({ k: mealHours(NOW) - 1, by: "Q" }), () => ({ k: mealHours(NOW) + 1, by: "Q" }),
    () => null, () => "x", () => ({ k: String(mealHours(NOW)), by: "Q" }), () => ({ by: "Q" }), () => [mealHours(NOW)],
  ])();
  const purse = (more: Record<string, unknown> = {}): Purse => {
    const g = gifts(), p: Record<string, unknown> = { ...newPurse(), stamina: gauge(), ...(g === undefined ? {} : { gifts: g }) };
    for (const [k, v] of Object.entries(more)) if (v !== undefined) p[k] = v;
    return p as unknown as Purse;
  };

  for (let i = 0; i < 80; i++) {
    const t = tile();
    add("is_tile", [t], Array.isArray(t) && t.length === 2 && t.every((v) => typeof v === "number" && Number.isInteger(v)));
  }
  for (let i = 0; i < 260; i++) {
    const p = purse({ toast: toast("B"), drunk: drunk() }), when = c.of([NOW, NOW + 3000, NOW + 5 * HOUR, NOW - 2 * HOUR, NOW + 24 * HOUR]);
    add("toast_of", [p], toastOf(p));
    add("has_drunk", [p, when], hasDrunk(p, when));
  }
  // a drink held out: to somebody, to oneself, to nobody (put away), from what is no tile, over one held out already
  for (let i = 0; i < 320; i++) {
    const p = purse({ toast: c.maybe(0.4) ? toast("C") : undefined }), to = c.of<string | null>(["B", "B", "B", "C", "A", "", null, null]), t = tile();
    add("drink_offer", [p, "A", to, t, NOW], drinkOffer(p, "A", to, t as [number, number], NOW));
  }
  // …and drunk: every sort of drink held out, of drinker and of place, a little after it was held out
  for (let i = 0; i < 1400; i++) {
    const giver = purse({ toast: toast("B"), ...(c.maybe(0.1) ? { drunk: drunk() } : {}) }), drinker = purse({ drunk: drunk(), ...(c.maybe(0.1) ? { toast: toast("A") } : {}) });
    const from = c.maybe(0.95) ? "A" : "B", me = c.maybe(0.95) ? "B" : c.of(["A", "C"]), t = c.maybe(0.6) ? [c.int(7, 13), c.int(9, 15)] : tile(), when = NOW + c.of([0, 0, 1, 2500, 19_999, 20_000, 26_000]);
    add("drink_take", [giver, drinker, from, me, t, when], drinkTake(giver, drinker, from, me, t as [number, number], when));
  }
  // (a drink well held out, to a drinker of every sort: what is left to say no is the drinker's own, a drink already had or a full gauge)
  for (let i = 0; i < 500; i++) {
    const tileFrom: [number, number] = [c.int(20, 40), c.int(20, 40)], when = NOW + c.int(0, 19_000) + c.of([0, 0, 5 * HOUR]);
    const giver = purse({ gifts: { had: ["thingFlask"], charms: [] }, toast: { to: "B", at: tileFrom, till: when + c.int(1, 20_000) } }), drinker = purse({ drunk: drunk() });
    const t = [tileFrom[0] + c.int(-3, 3) + c.of([0, 0, 0, 0, 1]), tileFrom[1] + c.int(-3, 3)];
    add("drink_take", [giver, drinker, "A", "B", t, when], drinkTake(giver, drinker, "A", "B", t as [number, number], when));
  }
  // (each refusal with nothing else in its way, and one of each sort of gauge that drinks)
  const flask = (left: number, more: Partial<Purse> = {}): Purse => ({ ...newPurse(), stamina: { day, left }, gifts: { had: ["thingFlask"], charms: [] }, ...more });
  const held = flask(40, { toast: { to: "B", at: [10, 12], till: NOW + 20_000 } }), plain = (left: number, more: Partial<Purse> = {}): Purse => ({ ...newPurse(), stamina: { day, left }, ...more });
  for (const [giver, drinker, from, me, t, when] of [
    [held, plain(20), "A", "B", [12, 13], NOW + 3000], [held, plain(85.5), "A", "B", [10, 12], NOW], [flask(95, { toast: held.toast }), plain(0), "A", "B", [13, 15], NOW],
    [flask(100, { toast: held.toast }), plain(99), "A", "B", [7, 9], NOW], [flask(40), plain(20), "A", "B", [10, 12], NOW], [held, plain(20), "A", "C", [10, 12], NOW],
    [{ ...held, gifts: { had: [], charms: [] } }, plain(20), "A", "B", [10, 12], NOW], [held, held, "A", "A", [10, 12], NOW], [held, plain(20), "A", "B", [10, 12], NOW + 20_000],
    [held, plain(20), "A", "B", [14, 12], NOW], [held, plain(20), "A", "B", [10, 16], NOW], [held, plain(20), "A", "B", [10, 8], NOW], [held, plain(20), "A", "B", [6, 12], NOW],
    [held, plain(20, { drunk: { k: mealHours(NOW), by: "Z" } }), "A", "B", [10, 12], NOW], [held, plain(20, { drunk: { k: mealHours(NOW), by: "Z" } }), "A", "B", [10, 12], NOW + 5 * HOUR - 20_000],
    [{ ...held, toast: { ...held.toast!, till: NOW + 5 * HOUR + 20_000 } }, plain(20, { drunk: { k: mealHours(NOW), by: "Z" } }), "A", "B", [10, 12], NOW + 5 * HOUR],
    [held, plain(100), "A", "B", [10, 12], NOW], [held, { ...plain(3), stamina: { day: day - 1, left: 3 } }, "A", "B", [10, 12], NOW],
  ] as Array<[Purse, Purse, string, string, [number, number], number]>) add("drink_take", [giver, drinker, from, me, t, when], drinkTake(giver, drinker, from, me, t, when));
  return out;
}

describe("the cases the database's rules of the well's gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsGiftsWell();
    expect(JSON.stringify(vectorsGiftsWell())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const whys = (fn: string) => new Set(of(fn).map((v) => { const d = v.want as { ok: boolean; why?: string }; return d.ok ? "ok" : d.why; }));
    expect(of("is_tile").some((v) => v.want === true) && of("is_tile").some((v) => v.want === false)).toBe(true);
    expect(of("toast_of").filter((v) => v.want !== null).length).toBeGreaterThan(40);
    expect(of("toast_of").filter((v) => v.want === null).length).toBeGreaterThan(40);
    expect(of("has_drunk").filter((v) => v.want === true).length).toBeGreaterThan(5);
    // a drink held out, put away, and refused
    const offers = of("drink_offer").map((v) => ({ to: v.args[2], d: v.want as { ok: boolean; till?: number | null } }));
    expect(offers.some((x) => x.d.ok && x.to !== null && x.d.till === NOW + DRINK.waits * 1000) && offers.some((x) => x.d.ok && x.to === null && x.d.till === null) && offers.some((x) => !x.d.ok)).toBe(true);
    expect([...whys("drink_offer")].sort()).toEqual(["none", "ok"]);
    // drunk, and refused each way there is
    expect([...whys("drink_take")].sort()).toEqual(["drunk", "far", "late", "none", "ok", "sated"]);
    for (const why of ["drunk", "far", "late", "none", "sated"]) expect(of("drink_take").filter((v) => (v.want as { why?: string }).why === why).length, why).toBeGreaterThan(8);
    const drank = of("drink_take").map((v) => v.want as { ok: boolean; got?: number; back?: number }).filter((d) => d.ok);
    expect(drank.length).toBeGreaterThan(40);
    // the whole drink, a part of one at a gauge nearly full, and a giver who had the whole ten, a part of it, and none
    expect(drank.some((d) => d.got === DRINK.gives) && drank.some((d) => d.got! > 0 && d.got! < DRINK.gives)).toBe(true);
    expect(drank.some((d) => d.back === DRINK.back) && drank.some((d) => d.back! > 0 && d.back! < DRINK.back) && drank.some((d) => d.back === 0)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-well.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
