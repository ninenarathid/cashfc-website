import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { ALL_SIGNS, ORB, PAIR, STAR, castFrom, castLine, driveBack, hookBait, hookBaits, hookStar, lightOrb, oddsOf, orbOf, sift, starOdds, underOrb, type OrbSky } from "./fishing";
import { stretchOf, USES } from "./gifts";
import { BAITS, FISH, type BaitId, type CatchId, type FishId, type ItemId, type Sign, type Tier } from "./items";
import { dayOf } from "./stamina";
import { newPurse, put, type Purse } from "./trade";

/**
 * The cases the database's rules of the fishing deck's gifts are held to (v153's fishing part;
 * lib/town/db-vectors-gifts.test.ts says how such a file works). Each is a function of the schema `town` with its
 * arguments and what the code answers:
 *
 * - `drive_back`: the otter following, had and not following, not had; with every count kept of this meal's hours
 *   and of others; a line snapped, a hook slipped, and every other end; a line whose fish was driven back already.
 * - `sift`: what takes each bait at hours of every sort, under both skies, from the deck and from the bank, with and
 *   without the signs, sifted of the legends (a rod of two lines), of the rare and the legends, of nothing, of every
 *   fish.
 * - `hook_baits`: one, two and three of a bait from bags that hold none, one, two, a stack; a bait that is not
 *   eaten; no rod; what is no bait; a count that is none.
 * - `cast_from`, `cast_line`: a line dropped from a bait's own odds and from sifted ones, by numbers drawn
 *   beforehand; and the same line by the bait's name, which is the same cast.
 * - `orb_of`, `orb_light`, `under_orb`: a sky kept and one run out, of each sort, and kept wrongly in every way; the
 *   orb lit under each sky and under none there is, by somebody who has it, who has lit it today already, who has it
 *   not; and the hour, the rain and the signs a line is dropped by under each sky and under none.
 * - `star_odds`, `hook_star`: what takes a stardust bait under both skies, from the deck and from the bank, with every
 *   set of signs, at each tier the uncle's shelf may have reached; and the bait put on the hook by somebody with a
 *   rod and without, who has it and has it not, with each count of the day's kept; and a line dropped from its odds.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-fishing.test.ts
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
const NOW = at("2026-10-06T12:00:00");
type Odds = Array<{ what: CatchId; p: number }>;

export function vectorsFishing(): Vector[] {
  const c = chance(20261071), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const purse = (gifts: Purse["gifts"] | undefined, more: Partial<Purse> = {}): Purse => {
    const p = { ...newPurse(), stamina: { day: dayOf(NOW), left: 100 }, ...more } as Purse;
    return gifts === undefined ? p : ({ ...p, gifts } as Purse);
  };
  const bag = (things: Array<[ItemId, number]>) => things.reduce((b, [id, n]) => put(b, id, n), newPurse().bag);

  // the otter: following, had and at rest, another following, none had; every count of it; every end of a fight
  const meal = stretchOf(USES.famOtter!, NOW);
  for (const gifts of [undefined, { had: ["famOtter"], charms: [], familiar: "famOtter" }, { had: ["famOtter"], charms: [], familiar: null }, { had: ["famOtter", "famGnome"], charms: [], familiar: "famGnome" }, { had: ["charmFloat"], charms: ["charmFloat"] }] as Array<Purse["gifts"] | undefined>) {
    for (const used of [undefined, 0, 1, 9, 10, 11]) for (const dk of [0, -1]) {
      const g = gifts && used !== undefined ? { ...gifts, used: { famOtter: { k: meal + dk, n: used }, famGnome: { k: meal, n: 3 } } } : gifts;
      for (const how of ["snapped", "slipped", "landed", "left", "early", null]) for (const again of [false, true, null]) for (const when of [NOW, NOW + 7 * 3_600_000]) {
        add("drive_back", [purse(g), how, again, when], driveBack(purse(g), how as string, !!again, when));
      }
    }
  }

  // what may take a bait, sifted: of the legends, of the rare and the legends, of nothing, of every fish
  const SIFTS: Tier[][] = [PAIR.never, ["rare", "legend"], [], ["common", "uncommon", "rare", "legend"], ["uncommon"]];
  const odds: Array<{ bait: BaitId; hour: number; rain: boolean; shallow: boolean; signs: Sign[]; own: Odds }> = [];
  for (const bait of BAITS) for (const hour of [0, 3, 6, 9, 12, 15, 18, 20, 22]) {
    const rain = c.maybe(0.3), shallow = c.maybe(0.25), signs = c.maybe(0.3) ? [...ALL_SIGNS] : c.maybe(0.3) ? [c.of(ALL_SIGNS)] : [];
    odds.push({ bait, hour, rain, shallow, signs, own: oddsOf(bait, hour, rain, false, shallow, signs) });
  }
  for (const o of odds) for (const tiers of SIFTS) add("sift", [o.own, tiers], sift(o.own, tiers));
  add("sift", [odds[0].own, null], sift(odds[0].own, []));

  // so many of a bait put on hooks at once
  const BAGS: Array<Array<[ItemId, number]>> = [[], [["rod", 1]], [["rod", 1], ["worm", 1]], [["rod", 1], ["worm", 2]], [["rod", 1], ["worm", 30]], [["worm", 9]], [["rodTeak", 1], ["dough", 3], ["lure", 1]],
    [["rod", 1], ["lure", 2], ["corn", 2]], [["rod", 1], ["worm", 20], ["worm", 20], ["minnow", 4]], [["rodMaster", 1], ["cricket", 2], ["boot", 3]]];
  for (const things of BAGS) for (const bait of ["worm", "dough", "lure", "corn", "minnow", "cricket", "boot", "noSuchBait"]) for (const n of [1, 2, 3, 0, null]) {
    const p = purse(undefined, { bag: bag(things) });
    add("hook_baits", [p, bait, n], hookBaits(p, bait as BaitId, n as number));
    if (n === 1) expect(hookBaits(p, bait as BaitId, 1)).toEqual(hookBait(p, bait as BaitId));
  }

  // a line dropped from what may take it: a bait's own odds, and sifted ones
  for (let i = 0; i < 520; i++) {
    const o = c.of(odds), from = c.of<() => Odds>([() => o.own, () => sift(o.own, PAIR.never), () => sift(o.own, ["rare", "legend"])])();
    const rnd = Array.from({ length: 6 }, () => c.next());
    let k = 0;
    add("cast_from", [from, rnd], castFrom(from, () => rnd[k++]));
    // (and by the bait's name: the same cast as from its own odds)
    if (i % 4 === 0) { let j = 0; add("cast_line", [o.bait, o.hour, o.rain, false, o.shallow, o.signs, rnd], castLine(o.bait, o.hour, o.rain, false, () => rnd[j++], o.shallow, o.signs)); }
  }

  // the sky an orb has lit: of each sort, lit and run out, and kept wrongly
  const today = stretchOf(USES.thingOrb!, NOW), soon = NOW + 60_000;
  const KEPT: unknown[] = [undefined, null, { sky: "night", until: soon }, { sky: "rain", until: NOW + 1 }, { sky: "moon", until: NOW }, { sky: "moon", until: NOW - 5 }, { sky: "moon", until: soon + ORB.minutes * 60_000 }, { sky: "noon", until: soon }, { sky: 3, until: soon },
    { sky: "night", until: "soon" }, "night", ["night", soon], { until: soon }, { sky: "rain" }];
  for (const orb of KEPT) for (const when of [NOW, NOW + ORB.minutes * 60_000]) {
    const p = purse(undefined, (orb === undefined ? {} : { orb }) as Partial<Purse>);
    add("orb_of", [p, when], orbOf(p, when));
  }
  // lit: by somebody who has it, who has lit it today, who lit it yesterday, who has it not; under each sky and under none there is
  for (const gifts of [undefined, { had: ["thingOrb"], charms: [] }, { had: ["thingOrb"], charms: [], used: { thingOrb: { k: today, n: 1 } } }, { had: ["thingOrb"], charms: [], used: { thingOrb: { k: today - 1, n: 1 } } }, { had: ["thingBait"], charms: [] }] as Array<Purse["gifts"] | undefined>) {
    for (const sky of ["night", "rain", "moon", "noon", "", null]) for (const orb of [undefined, { sky: "rain", until: soon }]) for (const when of [NOW, NOW + 86_400_000]) {
      const p = purse(gifts, orb ? { orb } : {});
      add("orb_light", [p, sky, when], lightOrb(p, sky as string, when));
    }
  }
  // what takes a stardust bait
  const stars: Odds[] = [];
  for (const rain of [false, true]) for (const shallow of [false, true]) for (const signs of [[], ["full"], ["tired"], ["after", "weekend"], [...ALL_SIGNS]] as Sign[][]) for (const top of [1, 2, 3, 0]) {
    const got = starOdds(rain, shallow, signs, top);
    add("star_odds", [rain, shallow, signs, top], got);
    if (got.length) stars.push(got);
  }
  for (let i = 0; i < 120; i++) { const from = c.of(stars), rnd = Array.from({ length: 6 }, () => c.next()); let k = 0; add("cast_from", [from, rnd], castFrom(from, () => rnd[k++])); }
  // …put on the hook
  const dayOfBait = stretchOf(USES.thingBait!, NOW);
  for (const things of [[], [["rod", 1]], [["rodTeak", 1], ["worm", 3]], [["worm", 9]]] as Array<Array<[ItemId, number]>>) {
    for (const gifts of [undefined, { had: ["thingBait"], charms: [] }, { had: ["thingOrb"], charms: [] }] as Array<Purse["gifts"] | undefined>) for (const used of [undefined, 0, 1, 2, 3, 4]) for (const dk of [0, -1]) for (const when of [NOW, NOW + 86_400_000]) {
      const g = gifts && used !== undefined ? { ...gifts, used: { thingBait: { k: dayOfBait + dk, n: used } } } : gifts, p = purse(g, { bag: bag(things) });
      add("hook_star", [p, when], hookStar(p, when));
    }
  }
  // what the water answers under it
  for (const sky of [null, ...ORB.skies] as Array<OrbSky | null>) for (const hour of [0, 6, 12, 23]) for (const rain of [false, true]) for (const signs of [[], ["after"], ["full"], ["tired", "after", "full"], [...ALL_SIGNS]] as Sign[][]) {
    add("under_orb", [sky, hour, rain, signs], underOrb(sky, hour, rain, signs));
  }
  return out;
}

describe("the cases the database's rules of the fishing deck's gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsFishing();
    expect(JSON.stringify(vectorsFishing())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    // the otter: a fish driven back with times left and with its last, refused as spent, and refused as nothing to do
    const drove = of("drive_back").map((v) => v.want as { ok: boolean; why?: string; left?: number });
    expect(drove.some((d) => d.ok && d.left === 9) && drove.some((d) => d.ok && d.left === 0) && drove.some((d) => !d.ok && d.why === "spent") && drove.some((d) => !d.ok && d.why === "none")).toBe(true);
    // sifted: a legend taken out of odds that had one, odds left as they were, and odds with only what is no fish left
    const sifted = of("sift").map((v) => ({ from: v.args[0] as Odds, tiers: v.args[1] as Tier[] | null, left: v.want as Odds }));
    const tierOf = (what: CatchId) => (what in FISH ? FISH[what as FishId].tier : null);
    expect(sifted.some((x) => x.tiers?.join() === "legend" && x.from.some((o) => tierOf(o.what) === "legend") && !x.left.some((o) => tierOf(o.what) === "legend"))).toBe(true);
    expect(sifted.some((x) => x.tiers?.length === 2 && x.from.some((o) => tierOf(o.what) === "rare") && x.left.every((o) => tierOf(o.what) !== "rare" && tierOf(o.what) !== "legend"))).toBe(true);
    expect(sifted.some((x) => x.tiers?.length === 0 && JSON.stringify(x.left) === JSON.stringify(x.from)) && sifted.some((x) => x.tiers?.length === 4 && x.left.length > 0 && x.left.every((o) => tierOf(o.what) === null))).toBe(true);
    for (const x of sifted) expect(Math.abs(x.left.reduce((t, o) => t + o.p, 0) - 1)).toBeLessThan(1e-9);
    // baits hooked: two taken, one of a bait not eaten left where it is, and each way of being refused
    const hooked = of("hook_baits").map((v) => ({ n: v.args[2] as number | null, bait: v.args[1] as string, did: v.want as { ok: boolean; why?: string } }));
    expect(hooked.some((h) => h.did.ok && h.n === 2 && h.bait === "worm") && hooked.some((h) => h.did.ok && h.n === 2 && h.bait === "lure") && hooked.some((h) => !h.did.ok && h.did.why === "tool")
      && hooked.some((h) => !h.did.ok && h.did.why === "none" && h.n === 2 && h.bait === "worm")).toBe(true);
    // casts: fish and what is no fish, with nibbles and without
    const casts = of("cast_from").map((v) => v.want as { what: CatchId; nibbles: number[]; size: number });
    expect(casts.some((x) => x.what in FISH && x.nibbles.length === 2) && casts.some((x) => !(x.what in FISH) && x.size === 0) && new Set(casts.map((x) => x.what)).size).toBeGreaterThan(20);
    expect(of("cast_line").length).toBeGreaterThan(100);
    // the orb: each sky read as lit, one run out and one kept wrongly read as none; lit, refused as spent and as nothing to light; and each sky changing what it changes
    const lit = of("orb_of").map((v) => v.want as string | null);
    for (const sky of ORB.skies) expect(lit.includes(sky), sky).toBe(true);
    expect(lit.filter((x) => x === null).length).toBeGreaterThan(10);
    const lights = of("orb_light").map((v) => v.want as { ok: boolean; why?: string; until?: number; purse?: Purse });
    expect(lights.some((d) => d.ok && d.purse?.orb?.sky === "moon") && lights.some((d) => !d.ok && d.why === "spent") && lights.some((d) => !d.ok && d.why === "none")).toBe(true);
    const unders = of("under_orb").map((v) => ({ sky: v.args[0] as string | null, hour: v.args[1] as number, rain: v.args[2] as boolean, signs: v.args[3] as string[], got: v.want as { hour: number; rain: boolean; signs: string[] } }));
    expect(unders.some((u) => u.sky === "night" && u.hour === 12 && u.got.hour === ORB.night) && unders.some((u) => u.sky === "rain" && !u.rain && u.got.rain && u.signs.includes("after") && !u.got.signs.includes("after"))
      && unders.some((u) => u.sky === "moon" && !u.signs.includes("full") && u.got.signs.includes("full") && u.got.hour === ORB.night) && unders.some((u) => u.sky === null && JSON.stringify(u.got) === JSON.stringify({ hour: u.hour, rain: u.rain, signs: u.signs }))).toBe(true);
    // the stardust bait: only the rare and better ever take it; none in the shallows; the moon's fish under a full moon only; more fish the further the shelf has come
    const starred = of("star_odds").map((v) => ({ rain: v.args[0] as boolean, shallow: v.args[1] as boolean, signs: v.args[2] as string[], top: v.args[3] as number, odds: v.want as Odds }));
    for (const x of starred) for (const o of x.odds) expect(STAR.tiers.includes(tierOf(o.what)!), o.what).toBe(true);
    expect(starred.filter((x) => x.shallow).every((x) => x.odds.length === 0) && starred.filter((x) => x.top === 0).every((x) => x.odds.length === 0)).toBe(true);
    expect(starred.some((x) => x.odds.some((o) => o.what === "moonFish")) && starred.filter((x) => !x.signs.includes("full")).every((x) => !x.odds.some((o) => o.what === "moonFish"))).toBe(true);
    const deck = (top: number) => starred.find((x) => !x.rain && !x.shallow && x.signs.length === 0 && x.top === top)!.odds;
    expect(deck(1).length).toBeGreaterThan(4);
    expect(deck(2).length).toBeGreaterThan(deck(1).length);
    expect(deck(3).length).toBeGreaterThan(deck(2).length);
    expect(deck(1).some((o) => tierOf(o.what) === "legend") && deck(1).some((o) => tierOf(o.what) === "rare")).toBe(true);
    for (const x of starred) if (x.odds.length) expect(Math.abs(x.odds.reduce((t, o) => t + o.p, 0) - 1)).toBeLessThan(1e-9);
    const hooks = of("hook_star").map((v) => v.want as { ok: boolean; why?: string; left?: number });
    expect(hooks.some((h) => h.ok && h.left === 2) && hooks.some((h) => h.ok && h.left === 0) && hooks.some((h) => !h.ok && h.why === "spent") && hooks.some((h) => !h.ok && h.why === "tool") && hooks.some((h) => !h.ok && h.why === "none")).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-fishing.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
