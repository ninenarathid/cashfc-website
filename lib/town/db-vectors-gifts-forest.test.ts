import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { vectorsV125 } from "./db-vectors-wild.test";
import { HOES } from "./farm";
import { FORAGING, KINDS, SECRETS, SECRET_KINDS, SPOTS, costFor, fetches, gamesOf, gather, holds, isSecret, lanternLit, pigletDigs, placeAt, reachOf, ruleOf, turnStart, type Held, type Place } from "./forest";
import { GIFTS, USES, stretchOf, usedOf } from "./gifts";
import { CHEST_SCROLLS, DAY_RARES, HUNT, chestOf, huntArea, huntOf, huntSite, huntTold, mapDig, mapUse, warmthOf } from "./hunt";
import { ITEMS } from "./items";
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
 *   squirrel runs, with and without stamina, every way it is refused;
 * - `piglet_digs`, and `gather` asked of the piglet: following and not, with every count of its holes kept (none,
 *   some, the last, all, kept wrongly, of other hours), a hoe held and none, at what is dug and at what is not;
 * - `wild_place`, `wild_rule`, `wild_secret`: every number about the two ends of the places everybody has and of
 *   the secret ones, and what is no number; every kind there is and one there is not;
 * - `wild_holds`: every place, the secret ones among them, at moments over two days and a night of full moon, by a
 *   word given with the case (`WORD`) under a dry sky;
 * - `gather` at the secret places: the lantern worn and not, both games won, either failed, left, a record kept
 *   already and kept wrongly, a bag with no room, the heap's last share gone, stood too far;
 * - `hunt_of`, `hunt_site`, `hunt_area`, `hunt_told`, `hunt_warm`, `chest_of`: a hunt kept soundly, of another day
 *   and wrongly; members, days and maps; digs from on the chest to far beyond the last warmth; chests on days with
 *   a rare thing of their own and on days with none, by every sort of roll;
 * - `map_use`, `map_dig`: the thing had and not, every count of the day's maps, a hunt on already; digs on the chest
 *   and off it, a bag with no room, no hunt on, a count of chests kept and kept wrongly;
 * - `wild_reach` and `gather` from a moss stag's back: the stag following, at rest, another familiar at the heels;
 *   every kind of place and the secret ones, from on the place to three tiles off;
 * - `gather_as_it_was`: the forest's own cases of gathering from before there were gifts (v125's, lib/town/db-vectors-wild.test.ts),
 *   asked as they always were, with the eleven arguments the function had: somebody with no gift is as before.
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
/** The word the cases of what a place holds are rolled by (given with each case: the database's own is not read), and their moments: two days of a year no weather is kept of, and a night of full moon. */
export const WORD = "fireflies";
const MOMENTS = [...Array.from({ length: 9 }, (_, i) => at("2027-03-02T05:30:00") + i * 5 * HOUR + i * 11 * 60_000), at("2027-03-22T21:00:00"), at("2027-03-23T02:00:00")];
/** What a place has, as the database tells it: with the moment its turn ends. */
const heldAs = (h: Held | null, p: Place) => (h ? { ...h, until: turnStart(p, h.turn + 1) } : null);
const HOWS = ["pick", "choose", "dig", "shake"] as const;

const clean = { misses: 0, wrong: 0 };

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
    add("gather", [p, s.id, has, taken, mine, hand, tile[0], tile[1], misses, wrong, now, null, false], gather(p, s, has, taken, mine, hand, tile, { misses, wrong }, now));
  }

  // the piglet: whether it may dig; and a gathering asked of it
  const k = stretchOf(USES.famPiglet!, NOON), most = USES.famPiglet!.n;
  /** What a purse may keep of the piglet: following with every count, at rest, never taken, another at the heels. */
  const piglets: Array<Purse["gifts"] | undefined> = [
    undefined, { had: ["famPiglet"], charms: [], familiar: "famPiglet" }, { had: ["famPiglet"], charms: [] }, { had: [], charms: [], familiar: "famPiglet" },
    { had: ["famPiglet", "famSquirrel"], charms: [], familiar: "famSquirrel" },
    ...[0, 1, most - 1, most, most + 3, 2.5, -1].map((n): Purse["gifts"] => ({ had: ["famPiglet"], charms: [], familiar: "famPiglet", used: { famPiglet: { k, n } } })),
    { had: ["famPiglet"], charms: [], familiar: "famPiglet", used: { famPiglet: { k: k - 1, n: most } } },
    { had: ["famPiglet"], charms: [], familiar: "famPiglet", used: { famPiglet: "9" as unknown as { k: number; n: number }, famGnome: { k, n: 4 } } },
  ];
  for (const g of piglets) for (const when of [NOON, NOON + 6 * HOUR, NOON + 24 * HOUR, NOON - 2 * HOUR]) add("piglet_digs", [purseOf(g), when], pigletDigs(purseOf(g), when));
  for (let i = 0; i < 700; i++) {
    const s = c.maybe(0.75) ? c.of(SPOTS.filter((x) => x.kind === "mound")) : c.of(SPOTS), kind = KINDS[s.kind], find = c.of(kind.finds), now = c.of([NOON, NOON, NOON + 6 * HOUR]);
    const has: Held | null = c.maybe(0.04) ? null : { turn: c.int(1, 99999), item: find.item, n: c.int(find.n[0], find.n[1]) };
    const hand = c.of<ItemId | null>([null, null, "hoe", "rod"]);
    // (a bag with room; one with a slot for the thing's stack and no more; one with none)
    const fill = c.of(["room", "room", "room", "tight", "full"] as const);
    const filler: Array<[ItemId, number]> = fill === "room" ? [] : Array.from({ length: fill === "tight" ? 9 - (hand ? 1 : 0) : 10 }, (): [ItemId, number] => [c.of(["rod", "can", "pot", "pan"] as ItemId[]), 1]);
    const p = purseOf(c.of(piglets), [...(hand ? [[hand, 1] as [ItemId, number]] : []), ...filler], hand, c.of([100, 100, 2, 0]));
    const taken = c.maybe(0.1) ? kind.shares : c.int(0, kind.shares - 1), mine = c.maybe(0.05);
    const tile: [number, number] = c.maybe(0.9) ? [s.x + c.int(-1, 1), s.y + c.int(-1, 1)] : [s.x + 2, s.y];
    const misses = c.of([0, 0, 0, 1, 2, 5]), wrong = c.of([0, 0, 1]), asked = c.of(["famPiglet", "famPiglet", "famPiglet", null, "famSquirrel", "noSuchGift"]);
    add("gather", [p, s.id, has, taken, mine, hand, tile[0], tile[1], misses, wrong, now, asked, false], gather(p, s, has, taken, mine, hand, tile, { misses, wrong, with: asked }, now));
  }

  // the places, by their numbers: the ones everybody has, the secret ones, and what is none
  const last = SPOTS.length + SECRETS.length;
  for (const id of [null, -5, -1, 0, 1, SPOTS.length - 1, SPOTS.length, SPOTS.length + 1, last - 1, last, last + 1, 99999]) {
    const p = id === null ? null : placeAt(id);
    add("wild_place", [id], p ? [p.kind, p.x, p.y, p.zone] : null);
    add("wild_secret", [id], id !== null && isSecret(id));
  }
  for (const kind of [...Object.keys(KINDS), ...Object.keys(SECRET_KINDS), "noSuchKind", null]) add("wild_rule", [kind], kind && (kind in KINDS || kind in SECRET_KINDS) ? ruleOf({ kind } as Place) : null);
  // what every place holds, the secret ones among them
  for (const now of MOMENTS) for (const p of [...SPOTS, ...SECRETS]) add("wild_holds", [p.id, now, WORD], heldAs(holds(WORD, p, now), p));
  for (const id of [-1, last, last + 7]) add("wild_holds", [id, MOMENTS[0], WORD], null);

  // gathering at a secret place
  /** What a purse may keep of the lantern: worn, had and not worn, never taken, worn beside the lamp, with a familiar at the heels. */
  const lanterns: Array<Purse["gifts"] | undefined> = [
    undefined, { had: ["charmFirefly"], charms: [] }, { had: [], charms: ["charmFirefly"] }, { had: ["charmFirefly"], charms: ["charmFirefly"] }, { had: ["charmFirefly"], charms: ["charmFirefly"] },
    { had: ["charmFirefly", "charmLamp"], charms: ["charmLamp", "charmFirefly"] }, { had: ["charmFirefly", "famPiglet"], charms: ["charmFirefly"], familiar: "famPiglet" },
    { had: ["charmFirefly", "famSquirrel"], charms: ["charmFirefly"], familiar: "famSquirrel" },
  ];
  /** The record of the secret places gathered from, as a purse may keep it. */
  const records: Array<Purse["forest"] | undefined> = [undefined, undefined, null as unknown as Purse["forest"], {}, { secrets: [] }, { secrets: [SECRETS[1].id] }, { secrets: [SECRETS[5].id, SECRETS[0].id] }, { secrets: SECRETS.map((s) => s.id) }, { secrets: "all" as unknown as number[] }];
  for (let i = 0; i < 700; i++) {
    const s = c.of(SECRETS), kind = SECRET_KINDS[s.kind], find = c.of(kind.finds), now = c.of([NOON, NOON + 9 * HOUR]);
    const has: Held | null = c.maybe(0.04) ? null : { turn: c.int(1, 99999), item: find.item, n: c.int(find.n[0], find.n[1]) };
    const hand = c.of<ItemId | null>([null, null, "hoe", "rod"]);
    const fill = c.of(["room", "room", "room", "room", "full"] as const);
    const filler: Array<[ItemId, number]> = fill === "room" ? [] : Array.from({ length: 10 }, (): [ItemId, number] => [c.of(["rod", "can", "pot", "pan"] as ItemId[]), 1]);
    const forest = c.of(records);
    const p = { ...purseOf(c.maybe(0.75) ? c.of(lanterns.slice(3)) : c.of(lanterns), [...(hand && fill === "room" ? [[hand, 1] as [ItemId, number]] : []), ...filler], hand, c.of([100, 100, 3, 0])), ...(forest === undefined ? {} : { forest }) } as Purse;
    const taken = c.maybe(0.08) ? kind.shares : c.int(0, kind.shares - 1), mine = c.maybe(0.05);
    const tile: [number, number] = c.maybe(0.9) ? [s.x + c.int(-1, 1), s.y + c.int(-1, 1)] : [s.x + 2, s.y - 2];
    const misses = c.of([0, 0, 0, 0, 1, 3, 0.9]), wrong = c.of([0, 0, 0, 0, 1, 0.5]), lost = c.maybe(0.12), asked = c.of([null, null, "famPiglet"]);
    add("gather", [p, s.id, has, taken, mine, hand, tile[0], tile[1], misses, wrong, now, asked, lost], gather(p, s, has, taken, mine, hand, tile, { misses, wrong, with: asked, lost }, now));
  }

  // a sprite's treasure map
  const day = stretchOf(USES.thingMap!, NOON), people = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-00000000000a", "me"];
  /** A hunt as a purse may keep it: none, sound, of another day, and wrong in the ways there are. */
  const hunts: unknown[] = [undefined, null, { k: day, n: 1, digs: 0 }, { k: day, n: 2, digs: 4 }, { k: day, n: 3, digs: 0 }, { k: day - 1, n: 1, digs: 2 }, { k: day + 1, n: 1, digs: 0 }, { k: day, n: 2.7, digs: 1.9 }, { k: day, n: 1, digs: -2 },
    { k: day, n: 1 }, { k: String(day), n: 1, digs: 0 }, { k: day }, "x", [day, 1, 0]];
  const withHunt = (hunt: unknown, more: Partial<Purse> = {}, forest: object | null = {}): Purse =>
    ({ ...purseOf({ had: ["thingMap"], charms: [] }), ...(hunt === undefined && forest !== null && !Object.keys(forest).length ? {} : { forest: forest === null ? null : { ...forest, ...(hunt === undefined ? {} : { hunt }) } }), ...more }) as Purse;
  for (const h of hunts) for (const when of [NOON, NOON + 30 * HOUR]) {
    const p = withHunt(h);
    add("hunt_of", [p, when], huntOf(p, when));
    for (const me of people) add("hunt_told", [p, WORD, me, when], huntTold(p, WORD, me, when));
  }
  add("hunt_of", [withHunt(undefined, {}, null), NOON], huntOf(withHunt(undefined, {}, null), NOON));
  for (const me of people) for (const k of [day, day + 1, day + 40]) for (const n of [1, 2, 3]) for (const word of [WORD, "other"]) {
    add("hunt_site", [word, me, { k, n, digs: 0 }], huntSite(word, me, { k, n }));
    add("hunt_area", [word, me, { k, n, digs: 0 }], huntArea(word, me, { k, n }));
  }
  for (const site of [[200, 150], [150, 120]] as Array<[number, number]>) for (const dx of [0, 1, -1, 2, 3, -4, 6, 7, 10, 11, -30]) for (const dy of [0, 1, -3, 6, 10, 12]) add("hunt_warm", [site, site[0] + dx, site[1] + dy], warmthOf(site, [site[0] + dx, site[1] + dy]));
  for (const word of [WORD, "other", "third"]) for (let d = 0; d < 24; d++) for (const r0 of [0, 0.3, 0.49999, 0.5, 0.9]) for (const r1 of [0, 0.37, 0.71, 0.99999]) {
    const when = NOON + d * 24 * HOUR;
    add("chest_of", [word, when, r0, r1], chestOf(word, when, [r0, r1]));
  }
  // a map used: the thing had and not, every count of the day's, a hunt on already, what else the forest keeps
  for (const had of [true, false]) for (const n of [undefined, 0, 1, 2, 3, 5]) for (const h of [undefined, { k: day, n: 1, digs: 3 }, { k: day - 1, n: 2, digs: 0 }, null]) for (const forest of [{}, { secrets: [SECRETS[0].id], chests: 2 }, null]) for (const when of [NOON, NOON + 24 * HOUR]) {
    const p = withHunt(h, { gifts: { had: had ? ["thingMap"] : [], charms: [], ...(n === undefined ? {} : { used: { thingMap: { k: day, n } } }) } }, forest);
    add("map_use", [p, when], mapUse(p, when));
  }
  // a dig: on the chest, off it at every warmth, with no hunt, with no room, with chests counted and counted wrongly
  for (let i = 0; i < 500; i++) {
    const me = c.of(people), n = c.int(1, 3), hunt = c.maybe(0.06) ? c.of([undefined, null, { k: day - 1, n: 1, digs: 0 }]) : { k: day, n, digs: c.of([0, 0, 1, 7]) };
    const site = huntSite(WORD, me, { k: day, n }), far = c.of([0, 0, 0, 1, 2, 3, 5, 8, 11, 40]);
    const tile: [number, number] = [site[0] + far * c.of([-1, 1]), site[1] + c.int(-far, far)];
    const full = c.maybe(0.12), chests = c.of<unknown>([undefined, undefined, 0, 3, 2.6, -1, "4"]);
    const base = purseOf({ had: ["thingMap"], charms: [] }, full ? Array.from({ length: 10 }, (): [ItemId, number] => [c.of(["rod", "can", "pot", "pan"] as ItemId[]), 1]) : c.maybe(0.3) ? [["truffle", 9], ["rod", 1]] : []);
    const p = { ...base, forest: { ...(c.maybe(0.3) ? { secrets: [SECRETS[2].id] } : {}), ...(hunt === undefined ? {} : { hunt }), ...(chests === undefined ? {} : { chests }) } } as Purse;
    const when = c.of([NOON, NOON, NOON + 3 * HOUR]), r0 = c.of([0, 0.2, 0.6, 0.95]), r1 = c.next();
    add("map_dig", [p, WORD, me, tile[0], tile[1], when, r0, r1], mapDig(p, WORD, me, tile, when, [r0, r1]));
  }

  // the moss stag: how far is reached from its back, and a gathering from there
  const stags: Array<Purse["gifts"]> = [
    { had: ["famStag"], charms: [], familiar: "famStag" }, { had: ["famStag"], charms: [], familiar: "famStag" }, { had: ["famStag"], charms: [] }, { had: [], charms: [], familiar: "famStag" },
    { had: ["famStag", "famSquirrel"], charms: [], familiar: "famSquirrel" }, { had: ["famStag", "charmFirefly"], charms: ["charmFirefly"], familiar: "famStag" }, { had: ["famStag", "famPiglet"], charms: [], familiar: "famPiglet" },
  ];
  for (const g of stags) for (const how of [...HOWS, null]) add("wild_reach", [purseOf(g), how], reachOf(purseOf(g), how as (typeof HOWS)[number]));
  for (let i = 0; i < 500; i++) {
    const s: Place = c.maybe(0.2) ? c.of(SECRETS) : c.of(SPOTS), kind = ruleOf(s), find = c.of(kind.finds), now = NOON + c.int(0, 20) * HOUR;
    const has: Held = { turn: c.int(1, 99999), item: find.item, n: c.int(find.n[0], find.n[1]) };
    const hand = kind.how === "dig" && c.maybe(0.8) ? c.of(HOES) : c.of<ItemId | null>([null, "rod"]);
    const p = purseOf(c.of(stags), hand ? [[hand, 1]] : [], hand, c.of([100, 100, 0]));
    const far = c.of([0, 1, 2, 2, 2, 3]);
    const tile: [number, number] = c.maybe(0.5) ? [s.x + far * c.of([-1, 1]), s.y + c.int(-far, far)] : [s.x + c.int(-far, far), s.y + far * c.of([-1, 1])];
    add("gather", [p, s.id, has, 0, false, hand, tile[0], tile[1], 0, 0, now, null, false], gather(p, s, has, 0, false, hand, tile, clean, now));
  }

  // gathering as it was before there were gifts: v125's own cases, by the function's old eleven arguments
  for (const v of vectorsV125()) if (v.fn === "gather") out.push({ fn: "gather_as_it_was", args: v.args, want: JSON.parse(JSON.stringify(v.want)) });
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
    expect(FORAGING.stag).toBe(FORAGING.squirrel);
    // (from a stag's back: two tiles for every way of gathering while it follows, and a tile when it does not)
    const stagReach = of("wild_reach").filter((v) => (v.args[0] as Purse).gifts?.had?.includes?.("famStag"));
    expect(stagReach.some((v) => v.want === FORAGING.stag && v.args[1] === "dig" && (v.args[0] as Purse).gifts!.familiar === "famStag") && stagReach.some((v) => v.want === FORAGING.reach && v.args[1] === "choose")).toBe(true);
    expect(new Set(of("wild_cost").map((v) => v.want))).toEqual(new Set([0, 1, 2, 3]));
    // a gathering done and refused each way; fetched for nothing from further than a hand reaches; and by hand as ever
    const every = of("gather").map((v) => ({ id: v.args[1] as number, p: v.args[0] as Purse, spot: placeAt(v.args[1] as number)!, has: v.args[2] as Held | null, hand: v.args[5] as string | null, x: v.args[6] as number, y: v.args[7] as number, misses: v.args[8] as number,
      wrong: v.args[9] as number, now: v.args[10] as number, asked: v.args[11] as string | null, left: v.args[12] as boolean, did: v.want as { ok: boolean; why?: string; purse?: Purse; got?: Array<[string, number]>; lost?: boolean } }));
    const gathered = every.filter((g) => !isSecret(g.id)).map((g) => ({ ...g, spot: SPOTS[g.id] })), hidden = every.filter((g) => isSecret(g.id));
    expect(new Set(gathered.map((g) => (g.did.ok ? "ok" : g.did.why)))).toEqual(new Set(["ok", "none", "had", "bare", "far", "tool", "full", "spent"]));
    const dist = (g: (typeof gathered)[number]) => Math.max(Math.abs(g.x - g.spot.x), Math.abs(g.y - g.spot.y));
    const paid = (g: (typeof gathered)[number]) => g.p.stamina.left - g.did.purse!.stamina.left;
    expect(gathered.some((g) => g.did.ok && dist(g) === FORAGING.squirrel && fetches(g.p, KINDS[g.spot.kind].how) && paid(g) === 0 && g.p.stamina.left > 0)).toBe(true);
    expect(gathered.some((g) => !g.did.ok && g.did.why === "far" && dist(g) === FORAGING.squirrel && !fetches(g.p, KINDS[g.spot.kind].how))).toBe(true);
    expect(gathered.some((g) => !g.did.ok && g.did.why === "far" && dist(g) === FORAGING.squirrel + 1 && fetches(g.p, KINDS[g.spot.kind].how))).toBe(true);
    expect(gathered.some((g) => g.did.ok && KINDS[g.spot.kind].how === "pick" && !fetches(g.p, "pick") && paid(g) === 1)).toBe(true);
    expect(gathered.some((g) => g.did.ok && KINDS[g.spot.kind].how !== "pick" && fetches(g.p, "pick") && paid(g) >= 2)).toBe(true);
    // the piglet may dig, and may not; asked of it: dug with no hoe for one more and a hole counted, the last hole, refused
    // past its count and when it does not follow, as ever with a hoe and no asking, and no hole counted where nothing is dug
    expect(new Set(of("piglet_digs").map((v) => v.want))).toEqual(new Set([true, false]));
    const dug = gathered.filter((g) => KINDS[g.spot.kind].how === "dig"), pig = dug.filter((g) => g.asked === "famPiglet");
    const more = (g: (typeof gathered)[number]) => g.did.got![0][1] - Math.max(1, g.has!.n - Math.max(0, Math.floor(g.misses)));
    expect(pig.some((g) => g.did.ok && g.hand === null && more(g) === 1 && usedOf(g.did.purse!, "famPiglet", g.now) === usedOf(g.p, "famPiglet", g.now) + 1)).toBe(true);
    expect(pig.some((g) => g.did.ok && usedOf(g.did.purse!, "famPiglet", g.now) === USES.famPiglet!.n)).toBe(true);
    expect(pig.some((g) => g.did.ok && g.misses >= 2 && more(g) === 1)).toBe(true);
    expect(pig.some((g) => !g.did.ok && g.did.why === "spent") && pig.some((g) => !g.did.ok && g.did.why === "none" && g.has && !g.p.gifts?.familiar)).toBe(true);
    expect(pig.some((g) => !g.did.ok && g.did.why === "full" && g.hand === null)).toBe(true);
    expect(dug.some((g) => g.asked !== "famPiglet" && g.did.ok && g.hand === "hoe" && more(g) === 0 && pigletDigs(g.p, g.now) && usedOf(g.did.purse!, "famPiglet", g.now) === usedOf(g.p, "famPiglet", g.now))).toBe(true);
    expect(dug.some((g) => g.asked !== "famPiglet" && !g.did.ok && g.did.why === "tool" && pigletDigs(g.p, g.now))).toBe(true);
    expect(gathered.some((g) => g.asked === "famPiglet" && KINDS[g.spot.kind].how !== "dig" && g.did.ok && pigletDigs(g.p, g.now) && usedOf(g.did.purse!, "famPiglet", g.now) === usedOf(g.p, "famPiglet", g.now))).toBe(true);
    // the places by their numbers: one everybody has, a secret one, none; every kind's rules, and none for a kind there is not
    expect(of("wild_place").filter((v) => v.want === null).length).toBe(6);
    expect(of("wild_place").some((v) => (v.want as string[] | null)?.[0] === "ring") && of("wild_place").some((v) => (v.want as string[] | null)?.[0] === "bough")).toBe(true);
    expect(of("wild_secret").filter((v) => v.want === true).map((v) => v.args[0])).toEqual([SPOTS.length, SPOTS.length + 1, SPOTS.length + SECRETS.length - 1]);
    expect(of("wild_rule").filter((v) => v.want === null).length).toBe(2);
    expect(of("wild_rule").some((v) => (v.want as { then?: string } | null)?.then === "dig")).toBe(true);
    // what the secret places hold: something and nothing, each kind's things, a night thing among them
    const held = of("wild_holds").filter((v) => isSecret(v.args[0] as number));
    expect(held.some((v) => v.want === null) && held.filter((v) => v.want).length).toBeGreaterThan(15);
    const found = new Set(held.filter((v) => v.want).map((v) => (v.want as Held).item));
    expect(found.size).toBeGreaterThanOrEqual(6);
    expect([...found].some((id) => ["glowMushroom", "mandrake", "starShard", "moonflower"].includes(id))).toBe(true);
    for (const v of held) if (v.want) expect(SECRET_KINDS[SECRETS[(v.args[0] as number) - SPOTS.length].kind].finds.some((f) => f.item === (v.want as Held).item)).toBe(true);
    expect(of("wild_holds").filter((v) => !isSecret(v.args[0] as number) && v.want).length).toBeGreaterThan(900);
    // a secret place: nothing without the lantern; with it, all it has and the place in the record; lost by a miss, by a
    // wrong one and by leaving; refused each way a gathering is; and a record kept already is kept as it is
    expect(new Set(hidden.map((g) => (g.did.ok ? (g.did.lost ? "lost" : "ok") : g.did.why)))).toEqual(new Set(["ok", "lost", "none", "had", "bare", "far", "full"]));
    expect(hidden.some((g) => !g.did.ok && g.did.why === "none" && g.has && !lanternLit(g.p)) && hidden.every((g) => !g.did.ok || lanternLit(g.p))).toBe(true);
    const won = hidden.filter((g) => g.did.ok && !g.did.lost), gone = hidden.filter((g) => g.did.ok && g.did.lost);
    expect(won.every((g) => g.did.got![0][1] === g.has!.n && g.did.purse!.forest!.secrets!.includes(g.id) && Math.floor(g.misses) === 0 && Math.floor(g.wrong) === 0 && !g.left)).toBe(true);
    expect(won.some((g) => !Array.isArray(g.p.forest?.secrets)) && won.some((g) => (g.p.forest?.secrets?.length ?? 0) === 2 && g.did.purse!.forest!.secrets!.length === 3)
      && won.some((g) => Array.isArray(g.p.forest?.secrets) && g.p.forest!.secrets!.includes(g.id) && JSON.stringify(g.did.purse!.forest) === JSON.stringify(g.p.forest))).toBe(true);
    for (const g of won) if (Array.isArray(g.p.forest?.secrets) && !g.p.forest!.secrets!.includes(g.id)) expect(g.did.purse!.forest!.secrets).toEqual([...g.p.forest!.secrets!, g.id].sort((a, b) => a - b));
    expect(gone.every((g) => g.did.got!.length === 0 && JSON.stringify(g.did.purse!.bag) === JSON.stringify(g.p.bag) && JSON.stringify(g.did.purse!.forest) === JSON.stringify(g.p.forest))).toBe(true);
    expect(gone.some((g) => g.left && Math.floor(g.misses) === 0 && Math.floor(g.wrong) === 0) && gone.some((g) => !g.left && Math.floor(g.misses) > 0) && gone.some((g) => !g.left && Math.floor(g.misses) === 0 && Math.floor(g.wrong) > 0)).toBe(true);
    expect(gone.some((g) => g.p.stamina.left - g.did.purse!.stamina.left === SECRET_KINDS.ring.cost) && gone.some((g) => g.p.stamina.left === 0)).toBe(true);
    expect(hidden.some((g) => g.asked === "famPiglet" && g.did.ok && !g.did.lost && usedOf(g.did.purse!, "famPiglet", g.now) === 0 && gamesOf(g.spot)!.includes("dig"))).toBe(true);
    // a hunt read: none, and one of today; told with its ring; a site for every member, day and map; every warmth
    expect(of("hunt_of").some((v) => v.want === null) && of("hunt_of").some((v) => (v.want as { digs: number } | null)?.digs === 4) && of("hunt_of").some((v) => (v.want as { n: number } | null)?.n === 2 && (v.args[0] as Purse).forest!.hunt!.n === 2.7)).toBe(true);
    expect(of("hunt_told").some((v) => v.want === null) && of("hunt_told").some((v) => (v.want as { area: { r: number } } | null)?.area.r === HUNT.radius)).toBe(true);
    expect(new Set(of("hunt_site").map((v) => JSON.stringify(v.want))).size).toBeGreaterThan(40);
    expect(of("hunt_area").every((v, i) => { const s = of("hunt_site")[i].want as number[], a = v.want as { x: number; y: number }; return Math.abs(a.x - s[0]) <= HUNT.off && Math.abs(a.y - s[1]) <= HUNT.off; })).toBe(true);
    expect(new Set(of("hunt_warm").map((v) => v.want))).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    // a chest: each rare thing of a day, two of the lesser and one of the greater, and scrolls from one end of them to the other
    const chests = of("chest_of").map((v) => v.want as [ItemId, number]);
    for (const [id] of DAY_RARES) expect(chests.some(([item, n]) => item === id && n === (ITEMS[id].pays < HUNT.pair ? 2 : 1)), id).toBe(true);
    expect(chests.some(([item]) => item === CHEST_SCROLLS[0]) && chests.some(([item]) => item === CHEST_SCROLLS[CHEST_SCROLLS.length - 1]) && chests.every(([item, n]) => ITEMS[item].kind !== "scroll" || n === 1)).toBe(true);
    // a map used, and refused each way; the first, second and third of a day
    const uses = of("map_use").map((v) => v.want as { ok: boolean; why?: string; left?: number; purse?: Purse });
    expect(new Set(uses.map((u) => (u.ok ? `ok${u.left}` : u.why)))).toEqual(new Set(["ok2", "ok1", "ok0", "had", "spent", "none"]));
    expect(uses.some((u) => u.ok && u.purse!.forest!.secrets?.length === 1 && u.purse!.forest!.chests === 2 && u.purse!.forest!.hunt!.digs === 0)).toBe(true);
    // a dig: missed at every warmth and counted; the chest up, the hunt over and a chest more; no hunt; no room
    const digs = of("map_dig").map((v) => ({ p: v.args[0] as Purse, did: v.want as { ok: boolean; why?: string; found?: boolean; warm?: number; digs?: number; got?: Array<[ItemId, number]>; purse?: Purse } }));
    expect(new Set(digs.map((d) => (d.did.ok ? (d.did.found ? "found" : `warm${d.did.warm}`) : d.did.why)))).toEqual(new Set(["found", "warm1", "warm2", "warm3", "warm4", "warm5", "none", "full"]));
    expect(digs.filter((d) => d.did.ok && !d.did.found).every((d) => d.did.got!.length === 0 && d.did.purse!.forest!.hunt!.digs === d.did.digs && JSON.stringify(d.did.purse!.bag) === JSON.stringify(d.p.bag))).toBe(true);
    const up = digs.filter((d) => d.did.ok && d.did.found);
    expect(up.every((d) => d.did.purse!.forest!.hunt === null && d.did.got!.length === 1 && d.did.purse!.coins === d.p.coins)).toBe(true);
    expect(up.some((d) => d.did.purse!.forest!.chests === 1) && up.some((d) => d.did.purse!.forest!.chests === 4) && up.some((d) => d.did.purse!.forest!.chests === 3 && d.p.forest!.chests === 2.6)
      && up.some((d) => ITEMS[d.did.got![0][0]].kind === "scroll") && up.some((d) => ITEMS[d.did.got![0][0]].kind === "wild") && up.some((d) => d.did.digs! > 5)).toBe(true);
    // from a stag's back: gathered from two tiles off, every way there is and at a secret place; too far from three; and on foot from two
    const stagged = every.filter((g) => g.p.gifts?.had?.includes?.("famStag")), off = (g: (typeof every)[number]) => Math.max(Math.abs(g.x - g.spot.x), Math.abs(g.y - g.spot.y)), riding = (g: (typeof every)[number]) => g.p.gifts!.familiar === "famStag" && g.p.gifts!.had.includes("famStag");
    for (const how of ["pick", "choose", "dig", "shake"]) expect(stagged.some((g) => riding(g) && off(g) === 2 && g.did.ok && ruleOf(g.spot).how === how), how).toBe(true);
    expect(stagged.some((g) => riding(g) && off(g) === 2 && g.did.ok && isSecret(g.id)) && stagged.some((g) => riding(g) && off(g) === 3 && !g.did.ok && g.did.why === "far")
      && stagged.some((g) => !riding(g) && off(g) === 2 && !g.did.ok && g.did.why === "far") && stagged.some((g) => riding(g) && off(g) === 2 && g.did.ok && g.p.stamina.left - g.did.purse!.stamina.left >= 2)).toBe(true);
    expect(of("gather_as_it_was").length).toBe(1400);
    expect(of("gather_as_it_was").every((v) => v.args.length === 11)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-forest.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
