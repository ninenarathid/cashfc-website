import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { HOES } from "./farm";
import { FORAGING, KINDS, SECRETS, SECRET_KINDS, SPOTS, costFor, fetches, gamesOf, gather, holds, isSecret, lanternLit, pigletDigs, placeAt, reachOf, ruleOf, turnStart, type Held, type Place } from "./forest";
import { GIFTS, USES, stretchOf, usedOf } from "./gifts";
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
 *   already and kept wrongly, a bag with no room, the heap's last share gone, stood too far.
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
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-forest.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
