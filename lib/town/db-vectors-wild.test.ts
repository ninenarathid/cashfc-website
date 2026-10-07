import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FARMING, HOES, pestAt, see, type Plant, type Plot } from "./farm";
import { KINDS, SPOTS, gather, holds, turnStart, type Held } from "./forest";
import { BUGS, BUG_IDS, HAUNTS, HAUNT_KINDS, LURES, SCARCE, bugTurnStart, net, pestToRid, plentyOf, swarmAt, type BugId, type Hunt, type Swarm, COMEBACK, comeback, hereAt, type Comeback } from "./insects";
import { CROP_IDS, type ItemId } from "./items";
import { newPurse, put, type Purse } from "./trade";
import { DRY, type Rain } from "./weather";
import { WISHES } from "./fountain";
import { FARM, plotAt } from "./world";

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
interface Vector { fn: string; args: unknown[]; want: unknown; keep?: true }

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

/**
 * The cases the ladybird's doing is held to (v126): `pestToRid`, with some plots of the farm as they might stand (plants
 * sown hours or days before, some covered, some cured, some long dead of a pest), a moment and a pick.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-wild.test.ts     writes vectors-v126.json too
 *
 * No rain in them: the dry run's sky is to be clear.
 */
export function vectorsV126(): Vector[] {
  const out: Vector[] = [], c = chance(20261026), tiles: Array<[number, number]> = [];
  for (let y = FARM.y; y < FARM.y + FARM.h; y++) for (let x = FARM.x; x < FARM.x + FARM.w; x++) if (plotAt(x, y)) tiles.push([x, y]);
  const day = at("2026-10-05T05:00:00");
  for (let i = 0; i < 260; i++) {
    const now = day + c.int(0, 72) * HOUR + c.int(0, 59) * MINUTE, plots: Record<string, Plot> = {};
    for (let n = c.int(0, 46); n > 0; n--) {
      const [x, y] = c.of(tiles), sown = now - c.int(1, 70) * HOUR - c.int(0, 59) * MINUTE;
      const plant: Plant = { by: c.of(["a", "b", "c"]), crop: c.of(CROP_IDS), sown, boost: 0, watered: 0, fed: 0, guard: c.maybe(0.15) ? sown + c.int(1, 30) * HOUR : 0,
        cured: c.maybe(0.2) ? sown + c.int(1, 40) * HOUR : 0, picked: 0, pickedAt: 0 };
      plots[`${x},${y}`] = c.maybe(0.08) ? { soil: c.of(["cleared", "tilled"] as const), plant: null } : { soil: "tilled", plant };
    }
    const pick = c.of([0, 0.2, 0.5, 0.75, 0.999, 1, c.next()]);
    out.push({ fn: "rid_pick", args: [plots, now, pick], want: pestToRid(plots, now, DRY, pick) });
  }
  out.push({ fn: "rid_pick", args: [{}, day, 0.5], want: null });
  // (two plants with a pest in one column, one above its tenth row and one from there down: "132,4" comes before
  // "132,10" by its tile and after it by its name, so these tell the one order from the other)
  const noon = day + 7 * HOUR, bare = (sown: number): Plant => ({ by: "a", crop: "pumpkin", sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 });
  /** A plant on a tile with a pest on it at that noon, found by looking; null when no hour of sowing brings one. */
  const struckAt = (x: number, y: number): Plot | null => {
    for (let h = 2; h <= 70; h++) { const plot: Plot = { soil: "tilled", plant: bare(noon - h * HOUR) }; if (see(`${x},${y}`, plot, noon).pest) return plot; }
    return null;
  };
  let pairs = 0;
  for (const [x, y] of tiles) {
    if (pairs >= 6 || y >= 10) continue;
    const low = tiles.find(([x2, y2]) => x2 === x && y2 >= 10 && !!struckAt(x2, y2)), up = struckAt(x, y);
    if (!low || !up) continue;
    const plots = { [`${x},${low[1]}`]: struckAt(x, low[1])!, [`${x},${y}`]: up };
    for (const pick of [0, 0.999]) out.push({ fn: "rid_pick", args: [plots, noon, pick], want: pestToRid(plots, noon, DRY, pick) });
    pairs++;
  }
  return out;
}

describe("the cases the database's ladybird is held to", () => {
  it("come out of the site's own rule, and have plots with a pest and plots without", () => {
    const all = vectorsV126();
    const found = all.filter((v) => v.want !== null).length;
    expect(found).toBeGreaterThan(60);
    expect(all.length - found).toBeGreaterThan(30);
    // (among them: plots whose plant died of its pest, which has none to take; and several with a pest, of which the pick tells one from another)
    const dead = all.some((v) => Object.entries(v.args[0] as Record<string, Plot>).some(([k, p]) => p.plant && see(k, p, v.args[1] as number).dead));
    expect(dead).toBe(true);
    const several = all.filter((v) => Object.entries(v.args[0] as Record<string, Plot>).filter(([k, p]) => p.plant && see(k, p, v.args[1] as number).pest).length > 1);
    expect(several.length).toBeGreaterThan(10);
    expect(several.some((v) => pestToRid(v.args[0] as Record<string, Plot>, v.args[1] as number, DRY, 0) !== pestToRid(v.args[0] as Record<string, Plot>, v.args[1] as number, DRY, 0.999))).toBe(true);
    // (and some where the first by its tile is not the first by its name)
    const byName = all.filter((v) => { const keys = Object.keys(v.args[0] as Record<string, Plot>); return keys.length === 2 && v.args[2] === 0 && v.want !== null && v.want !== [...keys].sort()[0]; });
    expect(byName.length).toBeGreaterThanOrEqual(3);
    for (const v of all) if (v.want) { const p = (v.args[0] as Record<string, Plot>)[v.want as string].plant!; expect(pestAt(v.want as string, p, v.args[1] as number)).not.toBeNull(); }
    expect(FARMING.pests.kills).toBe(6);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v126.json`, JSON.stringify({ cases: all })); }
  });
});

/**
 * The cases an insect's coming back is held to (v131): `hereAt` (what a haunt has, of its own or come back to it) and
 * `comeback` (where the one caught comes back, and as what), at moments of the three days and the full moon's night,
 * each with some that have come back already: made one after another, as catches at that moment would make them.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-wild.test.ts     writes vectors-v131.json too
 *
 * With v125's word and sky.
 */
export function vectorsV131(): Vector[] {
  const out: Vector[] = [], c = chance(20261031);
  const moments = [START + 7 * HOUR, START + 17 * HOUR, at("2026-10-06T15:30:00"), at("2026-10-06T23:10:00"), at("2026-10-07T09:40:00"), at("2026-10-07T13:00:00"), MOON];
  for (const first of moments) for (let k = 0; k < 6; k++) {
    const now = first + c.int(0, 50) * MINUTE + c.int(0, 59) * 1000;
    const caught = HAUNTS.filter((h) => swarmAt(WORD, h, now, RAINS)), backs: Comeback[] = [];
    for (let i = c.int(0, 8); i > 0 && caught.length; i--) {
      const b = comeback(WORD, c.of(caught), now, RAINS, backs, [c.next(), c.next(), c.next()]);
      if (b) backs.push(b);
    }
    // (and one of a turn before, which is nobody's any more)
    if (backs.length && c.maybe(0.5)) backs.push({ ...backs[0], turn: backs[0].turn - 1, from: backs[0].from - 20 * MINUTE });
    for (let i = 0; i < 8; i++) {
      const from = c.of(c.maybe(0.8) && caught.length ? caught : HAUNTS);
      const r: [number, number, number] = c.maybe(0.12) ? [c.of([0, 1, -0.5, 1.5]), c.of([0, 1, 0.999999, -2]), c.of([0, 1, 3])] : [c.next(), c.next(), c.next()];
      out.push({ fn: "comeback", args: [from.id, now, backs, ...r], want: comeback(WORD, from, now, RAINS, backs, r) });
    }
    const looked = [...backs.map((b) => HAUNTS[b.haunt]), ...Array.from({ length: 10 }, () => c.of(HAUNTS))];
    for (const h of looked) for (const t of [now, now + COMEBACK.after * 1000 - 1, now + COMEBACK.after * 1000, now + 5 * MINUTE, now + 25 * MINUTE])
      out.push({ fn: "bug_here", args: [h.id, t, backs], want: swarmAs(hereAt(WORD, h, t, RAINS, backs), h.id) });
  }
  for (const id of [-1, HAUNTS.length]) out.push({ fn: "comeback", args: [id, START, [], 0.5, 0.5, 0.5], want: null }, { fn: "bug_here", args: [id, START, []], want: null });
  return out;
}

describe("the cases the database's coming back is held to", () => {
  it("come out of the site's own rules: some come back and some cannot, some haunts have their own and some one come back", () => {
    const all = vectorsV131();
    const backs = all.filter((v) => v.fn === "comeback"), here = all.filter((v) => v.fn === "bug_here");
    expect(backs.filter((v) => v.want).length).toBeGreaterThan(200);
    expect(here.filter((v) => (v.want as Swarm | null)?.back).length).toBeGreaterThan(60);
    expect(here.filter((v) => v.want && !(v.want as Swarm).back).length).toBeGreaterThan(200);
    expect(here.filter((v) => !v.want).length).toBeGreaterThan(200);
    // (one that has come back is not there a moment before, and is from its moment)
    const b = backs.find((v) => v.want)!.want as Comeback;
    expect(hereAt(WORD, HAUNTS[b.haunt], b.from - 1, RAINS, [b])).toBeNull();
    expect(hereAt(WORD, HAUNTS[b.haunt], b.from, RAINS, [b])?.back).toBe(true);
    // every map is among them, the day's insects and the night's
    expect(new Set(backs.filter((v) => v.want).map((v) => HAUNTS[(v.want as Comeback).haunt].place)).size).toBe(3);
    expect(new Set(backs.filter((v) => v.want).map((v) => (v.want as Comeback).bug)).size).toBeGreaterThan(12);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v131.json`, JSON.stringify({ word: WORD, wet: WET_SLOTS, cases: all })); }
  });
});

/**
 * The cases an insect's scarcity is held to (v139): `plentyOf` (how much of its usual self a kind is at a moment), and
 * `swarmAt`, `hereAt` and `comeback` again with what has been caught: three made-up days of catches (`HUNTS`), the
 * common kinds by the score, the rare ones hardly, one morning's forty dragonflies in ten minutes, and one afternoon's
 * six hundred white butterflies in ten (`BURST`: a kind going from plentiful to all but gone while turns are under way,
 * which is where a turn's beginning and the moment of asking say different things).
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-wild.test.ts     writes vectors-v139.json too
 *
 * With v125's word and sky. The catches are in the file (`hunts`: the insect, the moment, how many): the dry run
 * writes each down as a catch is written down (a line of `town_deeds`) before it asks, and has no other.
 */
const BURST = at("2026-10-05T15:00:00");
export const HUNTS: Hunt[] = (() => {
  const c = chance(20261039), out: Hunt[] = [];
  const many: Array<[BugId, number]> = [["dragonfly", 480], ["cicada", 150], ["ladybird", 50], ["caterpillar", 50], ["damselfly", 40], ["grasshopper", 30], ["butterflyWhite", 25], ["cricket", 40],
    ["moth", 40], ["firefly", 25], ["rhinoBeetle", 20], ["stickInsect", 10], ["mantis", 6], ["scarab", 6], ["morpho", 3], ["leafInsect", 3], ["monarch", 2]];
  for (const [bug, n] of many) for (let i = 0; i < n; i++) out.push({ bug, at: START - 20 * HOUR + c.int(0, 80 * 3600) * 1000 + c.int(0, 999), n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]) });
  for (let i = 0; i < 40; i++) out.push({ bug: "dragonfly", at: at("2026-10-06T09:00:00") + c.int(0, 600) * 1000, n: 1 });
  for (let i = 0; i < 600; i++) out.push({ bug: "butterflyWhite", at: BURST + c.int(0, 600) * 1000, n: 1 });
  return out.sort((a, b) => a.at - b.at);
})();

export function vectorsV139(): Vector[] {
  const out: Vector[] = [], c = chance(20261139), day = SCARCE.day * HOUR;
  // how plentiful each kind is: at moments of the three days, and on either side of a catch and of its day's end
  const moments = [...Array.from({ length: 9 }, (_, i) => START - 2 * HOUR + i * 11 * HOUR + i * 17 * MINUTE), START + 9 * 24 * HOUR];
  for (const bug of BUG_IDS) {
    for (const now of moments) out.push({ fn: "plenty", args: [bug, now], want: plentyOf(HUNTS, bug, now) });
    const one = HUNTS.find((h) => h.bug === bug);
    if (one) for (const now of [one.at - 1, one.at, one.at + 1, one.at + day - 1, one.at + day, one.at + day + 1]) out.push({ fn: "plenty", args: [bug, now], want: plentyOf(HUNTS, bug, now) });
  }
  out.push({ fn: "plenty", args: ["no such insect", START], want: 1 });
  // what every haunt has, hunted: v125's thirty moments again, and the hour after the burst ten minutes at a time
  const hours = [...Array.from({ length: 30 }, (_, i) => START + i * 2.4 * HOUR + i * 7 * MINUTE), ...Array.from({ length: 7 }, (_, i) => at("2026-10-06T09:05:00") + i * 10 * MINUTE)];
  for (const now of hours) for (const h of HAUNTS) out.push({ fn: "bug_at", args: [h.id, now], want: swarmAs(swarmAt(WORD, h, now, RAINS, HUNTS), h.id) });
  // (and in the thick of the butterflies' burst, a minute at a time: these are kept by whoever takes only some of the cases)
  for (let m = 2; m <= 12; m += 2) for (const h of HAUNTS) if (h.kind === "blooms" || h.kind === "field") {
    const now = BURST + m * MINUTE;
    out.push({ fn: "bug_at", args: [h.id, now], want: swarmAs(swarmAt(WORD, h, now, RAINS, HUNTS), h.id), keep: true });
  }
  // and an insect's coming back, hunted: v131's way of making them, with what has been caught
  for (const first of [START + 7 * HOUR, START + 17 * HOUR, at("2026-10-06T09:20:00"), at("2026-10-06T15:30:00"), at("2026-10-06T23:10:00"), at("2026-10-07T09:40:00"), at("2026-10-07T13:00:00")]) for (let k = 0; k < 6; k++) {
    const now = first + c.int(0, 50) * MINUTE + c.int(0, 59) * 1000;
    const caught = HAUNTS.filter((h) => swarmAt(WORD, h, now, RAINS, HUNTS)), backs: Comeback[] = [];
    for (let i = c.int(0, 8); i > 0 && caught.length; i--) {
      const b = comeback(WORD, c.of(caught), now, RAINS, backs, [c.next(), c.next(), c.next()], HUNTS);
      if (b) backs.push(b);
    }
    for (let i = 0; i < 10; i++) {
      const from = c.of(c.maybe(0.8) && caught.length ? caught : HAUNTS);
      const r: [number, number, number] = c.maybe(0.12) ? [c.of([0, 1, -0.5, 1.5]), c.of([0, 1, 0.999999, -2]), c.of([0, 1, 3])] : [c.next(), c.next(), c.next()];
      out.push({ fn: "comeback", args: [from.id, now, backs, ...r], want: comeback(WORD, from, now, RAINS, backs, r, HUNTS) });
    }
    const looked = [...backs.map((b) => HAUNTS[b.haunt]), ...Array.from({ length: 10 }, () => c.of(HAUNTS))];
    for (const h of looked) for (const t of [now, now + COMEBACK.after * 1000, now + 5 * MINUTE, now + 25 * MINUTE])
      out.push({ fn: "bug_here", args: [h.id, t, backs], want: swarmAs(hereAt(WORD, h, t, RAINS, backs, HUNTS), h.id) });
  }
  return out;
}

describe("the cases the database's scarcity is held to", () => {
  it("come out of the site's own rules: kinds as plentiful as ever and kinds down to a fifth; haunts that have lost their insect to it, and comings back that it stopped", () => {
    const all = vectorsV139();
    const plenty = all.filter((v) => v.fn === "plenty").map((v) => v.want as number);
    expect(plenty.every((p) => p > 0 && p <= 1)).toBe(true);
    expect(plenty.filter((p) => p === 1).length).toBeGreaterThan(60);
    expect(plenty.filter((p) => p < 0.25).length).toBeGreaterThan(3);
    expect(plenty.filter((p) => p > 0.5 && p < 1).length).toBeGreaterThan(40);
    // a catch counts from the moment after it, and for a day
    const one = HUNTS[0];
    expect(plentyOf([one], one.bug, one.at)).toBe(1);
    expect(plentyOf([one], one.bug, one.at + 1)).toBeLessThan(1);
    expect(plentyOf([one], one.bug, one.at + SCARCE.day * HOUR)).toBe(1);
    // of the haunts and moments asked, some hundreds have an insect that the same roll would have had with nothing caught, and many have lost theirs
    const at_ = all.filter((v) => v.fn === "bug_at");
    const lost = at_.filter((v) => !v.want && swarmAt(WORD, HAUNTS[v.args[0] as number], v.args[1] as number, RAINS)).length;
    const kept = at_.filter((v) => v.want).length;
    expect(lost).toBeGreaterThan(150);
    expect(kept).toBeGreaterThan(400);
    // in the burst, haunts whose turn began before it have their butterfly still, though by the moment of asking the kind is all but gone
    // (four minutes in: with turns of seven minutes some haunts' turns began before the burst and are still under way)
    const mid = BURST + 4 * MINUTE;
    expect(plentyOf(HUNTS, "butterflyWhite", BURST)).toBeGreaterThan(0.5);
    expect(plentyOf(HUNTS, "butterflyWhite", mid)).toBeLessThan(0.12);
    expect(at_.filter((v) => v.keep && v.args[1] === mid && (v.want as Swarm | null)?.bug === "butterflyWhite").length).toBeGreaterThanOrEqual(2);
    // what is out hunted is what was out anyway: never another insect, never one where there was none
    for (const v of at_) if (v.want) expect(swarmAs(swarmAt(WORD, HAUNTS[v.args[0] as number], v.args[1] as number, RAINS), v.args[0] as number)).toEqual(v.want);
    const backs = all.filter((v) => v.fn === "comeback"), here = all.filter((v) => v.fn === "bug_here");
    expect(backs.filter((v) => v.want).length).toBeGreaterThan(120);
    expect(backs.filter((v) => !v.want).length).toBeGreaterThan(60);
    expect(here.filter((v) => (v.want as Swarm | null)?.back).length).toBeGreaterThan(30);
    expect(here.filter((v) => v.want && !(v.want as Swarm).back).length).toBeGreaterThan(80);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v139.json`, JSON.stringify({ word: WORD, wet: WET_SLOTS, hunts: HUNTS, cases: all })); }
  });
});
