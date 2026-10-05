import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOES } from "./farm";
import { KINDS, SPOTS, gather, holds, turnStart, type Held } from "./forest";
import { BUGS, HAUNTS, HAUNT_KINDS, LURES, bugTurnStart, net, swarmAt, type Swarm } from "./insects";
import type { ItemId } from "./items";
import { newPurse, put, type Purse } from "./trade";
import { DRY, type Rain } from "./weather";
import { WISHES } from "./fountain";

/**
 * The cases the database's forest and insects are held to (v125), made as lib/town/db-vectors makes the others':
 * each is a rule of lib/town/forest or lib/town/insects, what it was asked, and what the site's own code answered.
 * The dry run puts every one to the SQL and wants the same answer back.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-wild.test.ts     writes vectors-v125.json
 *
 * The word the rolls hang on is `WORD`, and the sky is `RAINS` (quarter hours of rain, as the database keeps them):
 * the dry run sets both before it asks.
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

export const WORD = "dryrun";
const QUARTER = 900_000, HOUR = 3_600_000, MINUTE = 60_000;
const at = (s: string) => Date.parse(`${s}+07:00`);
/** Three days: the first dry, rain on the second's afternoon and through its night, a shower on the third's morning. */
const START = at("2026-10-05T05:00:00");
export const WET_SLOTS: number[] = [
  ...Array.from({ length: 14 }, (_, i) => Math.floor(at("2026-10-06T14:00:00") / QUARTER) + i),
  ...Array.from({ length: 30 }, (_, i) => Math.floor(at("2026-10-06T21:30:00") / QUARTER) + i),
  ...Array.from({ length: 3 }, (_, i) => Math.floor(at("2026-10-07T09:15:00") / QUARTER) + i),
];
const RAINS: Rain[] = WET_SLOTS.map((slot): Rain => [slot * QUARTER, (slot + 1) * QUARTER]);
/** A night of full moon, for what waits for one: 2026-10-26 (the moon is full that day). */
const MOON = at("2026-10-26T22:00:00");

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)), of: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)], maybe: (p: number) => next() < p };
}
const bagOf = (items: Array<[ItemId, number]>, slots = 10): Purse => {
  let p: Purse = { ...newPurse(), bag: Array<null>(slots).fill(null) };
  for (const [id, n] of items) p = { ...p, bag: put(p.bag, id, n) };
  return p;
};
/** What a place has, as the database tells it: with the moment its turn ends. */
const heldAs = (h: Held | null, id: number) => (h ? { ...h, until: turnStart(SPOTS[id], h.turn + 1) } : null);
const swarmAs = (s: Swarm | null, id: number) => (s ? { ...s, until: bugTurnStart(HAUNTS[id], s.turn + 1) } : null);

export function vectorsV125(): Vector[] {
  const out: Vector[] = [], c = chance(20261005);
  // what every place of the forest has: at eleven moments over the three days, and on a night of full moon
  const moments = [...Array.from({ length: 11 }, (_, i) => START + i * 7 * HOUR + i * 13 * MINUTE), MOON, MOON + 3 * HOUR];
  for (const now of moments) for (const s of SPOTS) out.push({ fn: "wild_holds", args: [s.id, now], want: heldAs(holds(WORD, s, now, RAINS), s.id) });
  // and every haunt its insect: more moments (a haunt's turn is short, and what is out changes with the hour)
  const hours = [...Array.from({ length: 30 }, (_, i) => START + i * 2.4 * HOUR + i * 7 * MINUTE), MOON, MOON + 2 * HOUR, MOON + 5 * HOUR];
  for (const now of hours) for (const h of HAUNTS) out.push({ fn: "bug_at", args: [h.id, now], want: swarmAs(swarmAt(WORD, h, now, RAINS), h.id) });
  // (and the lamps all through a night of full moon, ten minutes at a time: one moth waits for it)
  for (let i = 0; i < 60; i++) for (const h of HAUNTS) if (h.kind === "lamp") {
    const now = at("2026-10-26T19:00:00") + i * 10 * MINUTE;
    out.push({ fn: "bug_at", args: [h.id, now], want: swarmAs(swarmAt(WORD, h, now, RAINS), h.id) });
  }
  // (nothing at a place that is none)
  for (const id of [-1, SPOTS.length, 99999]) out.push({ fn: "wild_holds", args: [id, START], want: null });
  for (const id of [-1, HAUNTS.length, 99999]) out.push({ fn: "bug_at", args: [id, START], want: null });

  // the fountain's wishes, with the two this file's migration adds at their end
  out.push({ fn: "wishes", args: [], want: WISHES });

  // gathering: every kind of place, with what it may have, every way it is refused and every way it comes off
  const hands: Array<ItemId | null> = [null, ...HOES, "rod", "bugNet"];
  for (let i = 0; i < 1400; i++) {
    const s = c.of(SPOTS), kind = KINDS[s.kind], find = c.of(kind.finds), now = START + c.int(0, 60) * HOUR;
    const has: Held | null = c.maybe(0.06) ? null : { turn: c.int(1, 99999), item: find.item, n: c.int(find.n[0], find.n[1]) };
    const hand = c.maybe(0.6) ? (kind.how === "dig" ? c.of(HOES) : c.of(hands)) : c.of(hands);
    // a bag with room, a bag nearly full of other things, one full of the thing itself
    const filler: Array<[ItemId, number]> = c.maybe(0.2) ? Array.from({ length: c.int(8, 10) }, (): [ItemId, number] => [c.of(["rod", "hoe", "can", "pot", "pan"] as ItemId[]), 1]) : [];
    const purse = bagOf([...(hand ? [[hand, 1] as [ItemId, number]] : []), ...filler, ...(c.maybe(0.15) ? [[find.item, c.int(1, 60)] as [ItemId, number]] : [])]);
    const withHand: Purse = { ...purse, hand, ...(c.maybe(0.3) ? { stamina: { day: 0, left: 0 } } : {}) };
    const taken = c.maybe(0.2) ? kind.shares : c.int(0, kind.shares - 1), mine = c.maybe(0.07);
    const tile: [number, number] = c.maybe(0.85) ? [s.x + c.int(-1, 1), s.y + c.int(-1, 1)] : [s.x + c.int(-3, 3), s.y + c.int(2, 4)];
    const misses = c.of([0, 0, 0, 1, 2, 5, 0.9, -2]), wrong = c.of([0, 0, 1, 2, 4, 1.5, -1]);
    out.push({ fn: "gather", args: [withHand, s.id, has, taken, mine, hand, tile[0], tile[1], misses, wrong, now], want: gather(withHand, s, has, taken, mine, hand, tile, { misses, wrong }, now) });
  }
  // catching: every insect at a haunt it keeps to
  const held: Array<ItemId | null> = ["bugNet", "bugNet", "bugNet", null, "hoe"], lures: Array<ItemId | null> = [...LURES, null, "twig", "bugNet"];
  for (let i = 0; i < 1400; i++) {
    const h = c.of(HAUNTS), fits = (Object.keys(BUGS) as Array<keyof typeof BUGS>).filter((id) => BUGS[id].at.includes(h.kind)), bug = c.of(fits), now = START + c.int(0, 60) * HOUR;
    const has: Swarm | null = c.maybe(0.06) ? null : { turn: c.int(1, 99999), bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), seed: h.id * 100003 + 7 };
    const hand = c.of(held);
    const filler: Array<[ItemId, number]> = c.maybe(0.2) ? Array.from({ length: c.int(8, 10) }, (): [ItemId, number] => [c.of(["rod", "hoe", "can", "pot", "pan"] as ItemId[]), 1]) : [];
    const purse: Purse = { ...bagOf([...(hand ? [[hand, 1] as [ItemId, number]] : []), ...filler, ...(c.maybe(0.15) ? [[bug as ItemId, c.int(1, 19)] as [ItemId, number]] : [])]), hand,
      ...(c.maybe(0.3) ? { stamina: { day: 0, left: 0 } } : {}) };
    const shares = HAUNT_KINDS[h.kind].shares, taken = c.maybe(0.2) ? shares : c.int(0, shares - 1), mine = c.maybe(0.07);
    const perch = c.of(h.perches), far = c.maybe(0.15);
    const tile: [number, number] = far ? [Math.floor(perch.x) + c.int(9, 14), Math.floor(perch.y) + c.int(9, 14)] : [Math.floor(perch.x) + c.int(-3, 3), Math.floor(perch.y) + c.int(-3, 3)];
    const misses = c.of([0, 0, 0, 1, 2, 3, 9, 1.7, -4]), lure = BUGS[bug].habit === "lure" ? c.of(lures) : c.of([null, null, ...lures]);
    out.push({ fn: "net", args: [purse, h.id, has, taken, mine, hand, tile[0], tile[1], misses, now, lure], want: net(purse, h, has, taken, mine, hand, tile, misses, now, lure) });
  }
  return out;
}

describe("the cases the database's forest and insects are held to", () => {
  it("come out of the site's own rules, and reach every way a gathering and a catch can end", () => {
    const all = vectorsV125();
    const why = (fn: string) => new Set(all.filter((v) => v.fn === fn).map((v) => { const w = v.want as { ok: boolean; why?: string }; return w.ok ? "ok" : w.why; }));
    expect(why("gather")).toEqual(new Set(["ok", "none", "had", "bare", "far", "tool", "full"]));
    expect(why("net")).toEqual(new Set(["ok", "none", "had", "bare", "far", "tool", "full", "lure"]));
    // every thing the forest may give is had at some moment of them, but the rarest; and most of the insects
    const finds = new Set(all.filter((v) => v.fn === "wild_holds" && v.want).map((v) => (v.want as Held).item));
    expect(finds.size).toBeGreaterThan(24);
    for (const id of ["moonflower", "chanterelle", "truffle", "twig", "wildApple"]) expect(finds.has(id as ItemId), id).toBe(true);
    const bugs = new Set(all.filter((v) => v.fn === "bug_at" && v.want).map((v) => (v.want as Swarm).bug));
    expect(bugs.size).toBeGreaterThan(16);
    for (const id of ["butterflyWhite", "cricket", "moth", "lunaMoth", "dragonfly", "rhinoBeetle"]) expect(bugs.has(id as keyof typeof BUGS), id).toBe(true);
    // (and with no rain told, what waits for rain is nowhere: the sky is what makes the difference)
    expect(SPOTS.some((s) => holds(WORD, s, at("2026-10-06T16:00:00"), RAINS)?.item !== holds(WORD, s, at("2026-10-06T16:00:00"), DRY)?.item)).toBe(true);
    expect(WISHES.slice(-2)).toEqual(["forage", "net"]);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v125.json`, JSON.stringify({ word: WORD, wet: WET_SLOTS, cases: all })); }
  });
});
