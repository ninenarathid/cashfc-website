import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { HOES } from "./farm";
import { FORAGING, KINDS, SPOTS, costFor, fetches, gather, reachOf, type Held } from "./forest";
import { GIFTS } from "./gifts";
import type { ItemId } from "./items";
import { dayOf } from "./stamina";
import { newPurse, put, type Purse } from "./trade";

/**
 * The cases the database's rules of the forest's gifts are held to (v153's forest part; lib/town/db-vectors-box.test.ts
 * says how such a file works). Each is a function of the schema `town` with its arguments and what the code answers:
 *
 * - `wild_fetches`, `wild_reach`, `wild_cost`: a squirrel following, at rest, never taken, another familiar; every
 *   way of gathering and every kind of place;
 * - `gather`: every kind of place by hand and with a squirrel at the heels, from on the place to beyond where the
 *   squirrel runs, with and without stamina, every way it is refused.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-forest.test.ts     writes vectors-gifts-forest.json
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
const NOON = at("2026-10-06T12:00:00"), HOUR = 3_600_000;
const HOWS = ["pick", "choose", "dig", "shake"] as const;

export function vectorsForest(): Vector[] {
  const c = chance(20261071), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const ids = GIFTS.map((g) => g.id) as string[];
  /** A purse: a bag of so many slots with these things in it, this in the hand, so much stamina, and these gifts. */
  const purseOf = (gifts: Purse["gifts"] | undefined, items: Array<[ItemId, number]> = [], hand: ItemId | null = null, left = 100, slots = 10): Purse => {
    let p: Purse = { ...newPurse(), bag: Array<null>(slots).fill(null), stamina: { day: dayOf(NOON), left } };
    for (const [id, n] of items) p = { ...p, bag: put(p.bag, id, n) };
    return { ...p, hand, ...(gifts === undefined ? {} : { gifts }) } as Purse;
  };
  /** What a purse may keep of the squirrel: following, at rest, never taken, another at the heels, nothing said, said wrongly. */
  const squirrels: Array<Purse["gifts"] | undefined> = [
    undefined, { had: [], charms: [] }, { had: ["famSquirrel"], charms: [], familiar: "famSquirrel" }, { had: ["famSquirrel"], charms: [] },
    { had: ["famSquirrel", "famGnome"], charms: [], familiar: "famGnome" }, { had: [], charms: [], familiar: "famSquirrel" },
    { had: [...ids], charms: ["charmLamp"], familiar: "famSquirrel" }, { had: ["famSquirrel"], charms: [], familiar: null }, { had: "famSquirrel" as unknown as string[], charms: [], familiar: "famSquirrel" },
  ];

  // the squirrel: whether it fetches, from how far, for what
  for (const g of squirrels) for (const how of [...HOWS, "sing", null]) {
    const p = purseOf(g);
    add("wild_fetches", [p, how], fetches(p, how as (typeof HOWS)[number]));
    add("wild_reach", [p, how], reachOf(p, how as (typeof HOWS)[number]));
  }
  for (const g of squirrels) for (const k of Object.keys(KINDS) as Array<keyof typeof KINDS>) add("wild_cost", [purseOf(g), KINDS[k]], costFor(purseOf(g), KINDS[k]));

  // gathering with a squirrel at the heels, and without: every kind of place, every distance, every way it ends
  const hands: Array<ItemId | null> = [null, ...HOES, "rod"];
  for (let i = 0; i < 900; i++) {
    const s = c.of(SPOTS), kind = KINDS[s.kind], find = c.of(kind.finds), now = NOON + c.int(0, 40) * HOUR;
    const has: Held | null = c.maybe(0.05) ? null : { turn: c.int(1, 99999), item: find.item, n: c.int(find.n[0], find.n[1]) };
    const hand = kind.how === "dig" && c.maybe(0.7) ? c.of(HOES) : c.of(hands);
    const filler: Array<[ItemId, number]> = c.maybe(0.15) ? Array.from({ length: c.int(8, 10) }, (): [ItemId, number] => [c.of(["rod", "hoe", "can", "pot", "pan"] as ItemId[]), 1]) : [];
    const p = purseOf(c.maybe(0.6) ? c.of(squirrels.slice(2)) : c.of(squirrels), [...(hand ? [[hand, 1] as [ItemId, number]] : []), ...filler], hand, c.of([100, 100, 3, 1, 0]));
    const taken = c.maybe(0.12) ? kind.shares : c.int(0, kind.shares - 1), mine = c.maybe(0.06);
    // (on it, beside it, as far as a squirrel runs, a tile beyond that, and far off)
    const far = c.of([0, 1, 1, FORAGING.squirrel, FORAGING.squirrel, FORAGING.squirrel + 1, 5]);
    const tile: [number, number] = c.maybe(0.5) ? [s.x + far * c.of([-1, 1]), s.y + c.int(-far, far)] : [s.x + c.int(-far, far), s.y + far * c.of([-1, 1])];
    const misses = c.of([0, 0, 0, 1, 2, 0.9]), wrong = c.of([0, 0, 1, 2, 4]);
    add("gather", [p, s.id, has, taken, mine, hand, tile[0], tile[1], misses, wrong, now], gather(p, s, has, taken, mine, hand, tile, { misses, wrong }, now));
  }
  return out;
}

describe("the cases the database's rules of the forest's gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsForest();
    expect(JSON.stringify(vectorsForest())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    // the squirrel fetches, and does not; reaches a tile, and as far as it runs; costs nothing, and what a place costs
    expect(new Set(of("wild_fetches").map((v) => v.want))).toEqual(new Set([true, false]));
    expect(new Set(of("wild_reach").map((v) => v.want))).toEqual(new Set([FORAGING.reach, FORAGING.squirrel]));
    expect(new Set(of("wild_cost").map((v) => v.want))).toEqual(new Set([0, 1, 2, 3]));
    // a gathering done and refused each way; fetched for nothing from further than a hand reaches; and by hand as ever
    const gathered = of("gather").map((v) => ({ p: v.args[0] as Purse, spot: SPOTS[v.args[1] as number], x: v.args[6] as number, y: v.args[7] as number, now: v.args[10] as number, did: v.want as { ok: boolean; why?: string; purse?: Purse } }));
    expect(new Set(gathered.map((g) => (g.did.ok ? "ok" : g.did.why)))).toEqual(new Set(["ok", "none", "had", "bare", "far", "tool", "full"]));
    const dist = (g: (typeof gathered)[number]) => Math.max(Math.abs(g.x - g.spot.x), Math.abs(g.y - g.spot.y));
    const paid = (g: (typeof gathered)[number]) => g.p.stamina.left - g.did.purse!.stamina.left;
    expect(gathered.some((g) => g.did.ok && dist(g) === FORAGING.squirrel && fetches(g.p, KINDS[g.spot.kind].how) && paid(g) === 0 && g.p.stamina.left > 0)).toBe(true);
    expect(gathered.some((g) => !g.did.ok && g.did.why === "far" && dist(g) === FORAGING.squirrel && !fetches(g.p, KINDS[g.spot.kind].how))).toBe(true);
    expect(gathered.some((g) => !g.did.ok && g.did.why === "far" && dist(g) === FORAGING.squirrel + 1 && fetches(g.p, KINDS[g.spot.kind].how))).toBe(true);
    expect(gathered.some((g) => g.did.ok && KINDS[g.spot.kind].how === "pick" && !fetches(g.p, "pick") && paid(g) === 1)).toBe(true);
    expect(gathered.some((g) => g.did.ok && KINDS[g.spot.kind].how !== "pick" && fetches(g.p, "pick") && paid(g) >= 2)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-forest.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
