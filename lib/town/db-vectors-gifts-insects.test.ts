import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { fullMoon } from "./forest";
import { stretchOf, USES, wearing } from "./gifts";
import { BUGS, BUG_IDS, HAUNTS, HAUNT_KINDS, LURES, NECTAR, NECTAR_MAPS, PAIR, UNHUNTED, bugTurnStart, cloakAt, nectar, nectarHaunt, net, netMine, swarmAt, tierOf, type BugId, type Follower, type Lured, type Mine, type Swarm } from "./insects";
import type { ItemId } from "./items";
import { dayOf } from "./stamina";
import { handOf, newPurse, put, type Purse } from "./trade";
import { DRY } from "./weather";
import { placeOf } from "./world";

/**
 * The cases the database's rules of the insects' gifts are held to (v153; lib/town/db-vectors-gifts.test.ts says how
 * such a file works: a function of the schema `town`, its arguments, and what the code answers). Every moment is
 * years on, where the stand-in database has had no rain and nobody has caught anything: the sky is dry and every
 * kind is as plentiful as ever, here and there. The word the rolls hang on is told with each case.
 *
 * - `nectar_haunt`: tiles all over the three maps, at their edges, and off them;
 * - `nectar`: a drop put down by somebody with no nectar, with drops left and with none, with one out already and
 *   with one long gone; by flowers, water, a field, a light and litter; at noon, at night, at dawn, under a full
 *   moon; with every sort of number for the three of chance;
 * - `net_mine`: the insect of a drop not come yet, there, and gone; the one that follows a catch, in time, within the
 *   keeper's slack and too late; a net held and not; from the place and from too far; a bag with room and with none;
 *   misses of every sort; a word that names no insect of one's own; the cloak worn and not (a drop's insect caught
 *   under it has another following, the second of a pair has none);
 * - `cloak_at`: what every haunt that has an insect with days of its own has for the cloak's wearer alone, at
 *   moments of day and night over eight days, and at a moment found for each such insect; haunts that have none;
 * - `net`: v125's own catch (lib/town/db-vectors-wild.test.ts has its cases without the cloak), with the cloak worn,
 *   had and not worn, and not had: what follows the insect caught is kept in the purse of whoever wears it.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-gifts-insects.test.ts
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

export const WORD = "insects-gifts";
const HOUR = 3_600_000, MINUTE = 60_000;
const at = (s: string) => Date.parse(`${s}+07:00`);
/** A day years on, at dawn. */
const START = at("2033-03-01T05:00:00");

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}
const bagOf = (items: Array<[ItemId, number]>, slots = 10): Purse => {
  let p: Purse = { ...newPurse(), bag: Array<null>(slots).fill(null) };
  for (const [id, n] of items) p = { ...p, bag: put(p.bag, id, n) };
  return p;
};
/** A night the moon is full, after the start. */
const MOON = (() => { for (let t = START + 17 * HOUR; ; t += 24 * HOUR) if (fullMoon(t)) return t; })();

export function vectorsGiftsInsects(): Vector[] {
  const c = chance(20261071), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });

  // the haunt a drop calls from: a net of tiles over each map, its corners, and tiles off every map
  for (const [, x0, y0, w, h] of NECTAR_MAPS) {
    for (let x = x0; x < x0 + w; x += 7) for (let y = y0; y < y0 + h; y += 7) add("nectar_haunt", [x, y], nectarHaunt([x, y])?.id ?? null);
    for (const [x, y] of [[x0, y0], [x0 + w - 1, y0 + h - 1], [x0 - 1, y0], [x0, y0 - 1], [x0 + w, y0 + h - 1], [x0 + w - 1, y0 + h]]) add("nectar_haunt", [x, y], nectarHaunt([x, y])?.id ?? null);
  }
  for (const [x, y] of [[-5, -5], [100, 100], [5000, 3], [3, 5000]]) add("nectar_haunt", [x, y], nectarHaunt([x, y])?.id ?? null);
  // (beside every haunt a drop calls from, and beside the others: a tree, a glade, the fall)
  for (const h of HAUNTS) { const p = h.perches[0]; add("nectar_haunt", [Math.floor(p.x), Math.floor(p.y)], nectarHaunt([Math.floor(p.x), Math.floor(p.y)])?.id ?? null); }

  // a drop put down
  const moments = [START + 7 * HOUR, START + 30 * MINUTE, START + 16 * HOUR, START + 19 * HOUR, START + 26 * HOUR, START + 3 * 24 * HOUR + 5 * HOUR, MOON, MOON + 2 * HOUR, START + 9 * 24 * HOUR + 4 * HOUR];
  const luck = [0, 0.000001, 0.25, 0.5, 0.75, 0.999, 0.999999, 1, 1.5, -0.3];
  const uses = (now: number, n: number) => ({ thingNectar: { k: stretchOf(USES.thingNectar!, now), n } });
  const calls = HAUNTS.filter((h) => NECTAR.at.includes(h.kind));
  for (let i = 0; i < 900; i++) {
    const now = c.of(moments) + c.int(0, 50) * MINUTE, h = c.maybe(0.85) ? c.of(calls) : c.of(HAUNTS), p = c.of(h.perches);
    const tile: [number, number] = c.maybe(0.04) ? [-9, c.int(0, 40)] : [Math.floor(p.x) + c.int(-2, 2), Math.floor(p.y) + c.int(-2, 2)];
    const gifts = c.of<() => Purse["gifts"] | undefined>([
      () => undefined, () => ({ had: ["charmNet"], charms: ["charmNet"] }),
      () => ({ had: ["thingNectar"], charms: [] }), () => ({ had: ["thingNectar"], charms: [] }), () => ({ had: ["thingNectar", "charmCloak"], charms: [] }), () => ({ had: ["thingNectar", "thingFlute"], charms: [], used: uses(now, c.int(0, 9)) }),
      // (the cloak worn: the insects that have days of their own may come on any day)
      () => ({ had: ["thingNectar", "charmCloak"], charms: ["charmCloak"] }), () => ({ had: ["thingNectar", "charmCloak", "charmNet"], charms: ["charmNet", "charmCloak"], used: uses(now, c.int(0, 9)) }),
      () => ({ had: ["thingNectar"], charms: [], used: uses(now, 9) }), () => ({ had: ["thingNectar"], charms: [], used: uses(now, 10) }), () => ({ had: ["thingNectar"], charms: [], used: uses(now, 14) }),
      // (ten used on another day: today's are all there)
      () => ({ had: ["thingNectar"], charms: [], used: uses(now - 24 * HOUR, 10) }),
    ])();
    const out_ = c.of<() => Lured | null | undefined>([
      () => undefined, () => undefined, () => undefined, () => undefined, () => null,
      () => ({ x: tile[0], y: tile[1], haunt: h.id, bug: "moth", n: 1, from: now - 5000, until: now + 60_000, seed: 3 }),
      () => ({ x: tile[0], y: tile[1], haunt: h.id, bug: "moth", n: 1, from: now - 200_000, until: now - 1, seed: 3 }),
      () => ({ x: tile[0], y: tile[1], haunt: h.id, bug: "moth", n: 1, from: now - 200_000, until: now, seed: 3 }),
    ])();
    const purse: Purse = { ...bagOf([["bugNet", 1]]), stamina: { day: dayOf(now), left: c.of([100, 40, 0]) }, ...(gifts === undefined ? {} : { gifts }), ...(out_ === undefined ? {} : { lured: out_ }) };
    const r: [number, number, number] = [c.maybe(0.5) ? c.next() : c.of(luck), c.maybe(0.5) ? c.next() : c.of(luck), c.maybe(0.5) ? c.next() : c.of(luck)];
    add("nectar", [purse, tile[0], tile[1], now, ...r, WORD], nectar(purse, tile, now, WORD, DRY, UNHUNTED, r));
  }
  // (and the whole of what may come, a step of chance at a time: by the forest's flowers at noon, by its fire on a night of full moon, by a field of the farm at night)
  const whole = (h: (typeof HAUNTS)[number], now: number, step: number) => {
    const p = h.perches[0], tile: [number, number] = [Math.floor(p.x), Math.floor(p.y)], purse: Purse = { ...bagOf([]), stamina: { day: dayOf(now), left: 100 }, gifts: { had: ["thingNectar"], charms: [] } };
    for (let r1 = 0; r1 < 1; r1 += step) { const r: [number, number, number] = [Math.round(r1 * 1000) / 1000, 0.99, 0]; add("nectar", [purse, tile[0], tile[1], now, ...r, WORD], nectar(purse, tile, now, WORD, DRY, UNHUNTED, r)); }
  };
  whole(HAUNTS.find((h) => h.kind === "blooms" && h.place === "forest")!, START + 7 * HOUR, 0.005);
  whole(HAUNTS.find((h) => h.kind === "lamp" && h.place === "forest")!, MOON, 0.02);
  whole(HAUNTS.find((h) => h.kind === "field" && h.place === "farm")!, START + 17 * HOUR, 0.02);

  // the insect of a drop, caught
  const held: Array<ItemId | null> = ["bugNet", "bugNet", "bugNet", "bugNet", null, "hoe"], kinds = Object.keys(BUGS) as BugId[];
  for (let i = 0; i < 1100; i++) {
    const now = START + c.int(0, 200) * HOUR + c.int(0, 59) * MINUTE, bug = c.of(kinds), hand = c.of(held), x = c.int(10, 50), y = c.int(10, 50);
    const lured = c.of<() => Lured | null | undefined>([
      () => undefined, () => null,
      () => ({ x, y, haunt: c.int(0, HAUNTS.length - 1), bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), from: now + c.int(1, 9000), until: now + 130_000, seed: 5 }),
      () => ({ x, y, haunt: c.int(0, HAUNTS.length - 1), bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), from: now - c.int(0, 90_000), until: now + c.int(1, 60_000), seed: 5 }),
      () => ({ x, y, haunt: c.int(0, HAUNTS.length - 1), bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), from: now - c.int(0, 90_000), until: now + c.int(1, 60_000), seed: 5 }),
      () => ({ x, y, haunt: c.int(0, HAUNTS.length - 1), bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), from: now - c.int(0, 90_000), until: now + c.int(1, 60_000), seed: 5 }),
      () => ({ x, y, haunt: c.int(0, HAUNTS.length - 1), bug, n: 1, from: now - 200_000, until: now - c.int(0, 5000), seed: 5 }),
      () => ({ x, y, haunt: 3, bug: "noSuchBug" as ItemId, n: 1, from: now - 1000, until: now + 60_000, seed: 5 }),
    ])();
    const filler: Array<[ItemId, number]> = c.maybe(0.2) ? Array.from({ length: c.int(8, 10) }, (): [ItemId, number] => [c.of(["rod", "hoe", "can", "pot", "pan"] as ItemId[]), 1]) : [];
    // (the one that follows a catch: in time, within the keeper's slack, at its very end, too late; kept wrongly)
    const follower = c.of<() => Follower | null | undefined>([
      () => undefined, () => undefined, () => null,
      () => ({ bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), at: [x, y], until: now + c.int(0, 3000) }),
      () => ({ bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), at: [x, y], until: now + c.int(0, 3000) }),
      () => ({ bug, n: 1, at: [x, y], until: now - c.int(1, PAIR.slack - 1) }),
      () => ({ bug, n: 1, at: [x, y], until: now - PAIR.slack }),
      () => ({ bug, n: 1, at: [x, y], until: now - PAIR.slack - c.int(1, 9000) }),
      () => ({ bug: "noSuchBug" as ItemId, n: 1, at: [x, y], until: now + 2000 }),
    ])();
    const gifts = c.of<() => Purse["gifts"] | undefined>([() => undefined, () => undefined, () => ({ had: ["thingNectar"], charms: [] }), () => ({ had: ["thingNectar", "charmCloak"], charms: ["charmCloak"] }), () => ({ had: ["charmCloak"], charms: [] })])();
    const purse: Purse = { ...bagOf([...(hand ? [[hand, 1] as [ItemId, number]] : []), ...filler, ...(c.maybe(0.15) ? [[bug as ItemId, c.int(1, 19)] as [ItemId, number]] : [])]), hand,
      stamina: { day: dayOf(now), left: c.of([100, 100, 3, 0]) }, ...(lured === undefined ? {} : { lured }), ...(follower === undefined ? {} : { follower }), ...(gifts === undefined ? {} : { gifts }) };
    const d = c.of([[0, 0], [1, -2], [4, 4], [6, 2], [-6, -2], [5, 4], [6, 3], [7, 0], [0, -7], [12, 9]]), tile: [number, number] = [x + d[0], y + d[1]];
    const misses = c.of([0, 0, 0, 1, 2, 3, 9, 1.7, -4]), which = c.of(["lured", "lured", "lured", "pair", "pair", "pair", "nothing"]);
    add("net_mine", [purse, which, handOf(purse), tile[0], tile[1], misses, now], netMine(purse, which as Mine, handOf(purse), tile, misses, now));
  }

  // what a haunt has for the cloak's wearer alone: every haunt that has an insect with days of its own, and a few that
  // have none, at moments of day and night over eight days; and for each such insect a moment at which it is there
  const swarmAs = (sw: Swarm | null, id: number) => (sw ? { ...sw, until: bugTurnStart(HAUNTS[id], sw.turn + 1) } : null);
  const dayKinds = BUG_IDS.filter((id) => BUGS[id].day), hosts = HAUNTS.filter((h) => dayKinds.some((id) => BUGS[id].at.includes(h.kind)));
  const others = HAUNTS.filter((h) => !hosts.includes(h)).filter((_, i) => i % 6 === 0);
  for (let k = 0; k < 44; k++) {
    const now = START + k * (4 * HOUR + 23 * MINUTE);
    for (const h of [...hosts, ...others]) add("cloak_at", [h.id, now, WORD], swarmAs(cloakAt(WORD, h, now, DRY), h.id));
  }
  for (const id of dayKinds) {
    let found = false;
    for (let t = START; t < START + 60 * 24 * HOUR && !found; t += 10 * MINUTE) for (const h of hosts) {
      if (!BUGS[id].at.includes(h.kind) || cloakAt(WORD, h, t, DRY)?.bug !== id) continue;
      add("cloak_at", [h.id, t, WORD], swarmAs(cloakAt(WORD, h, t, DRY), h.id));
      found = true;
      break;
    }
  }
  for (const id of [-1, HAUNTS.length, 99999]) add("cloak_at", [id, START, WORD], null);

  // a catch at a haunt with the cloak: v125's rule, the purse of whoever wears it with what follows
  const nets: Array<ItemId | null> = ["bugNet", "bugNet", "bugNet", "bugNet", null, "hoe"], lures: Array<ItemId | null> = [...LURES, null, "twig"];
  for (let i = 0; i < 600; i++) {
    const h = c.of(HAUNTS), fit = BUG_IDS.filter((id) => BUGS[id].at.includes(h.kind)), bug = c.of(fit), now = START + c.int(0, 60) * HOUR + c.int(0, 59) * MINUTE;
    const has: Swarm | null = c.maybe(0.05) ? null : { turn: c.int(1, 99999), bug, n: c.int(BUGS[bug].n[0], BUGS[bug].n[1]), seed: h.id * 100003 + 7, ...(c.maybe(0.3) ? { cloak: true } : {}) };
    const hand = c.of(nets), filler: Array<[ItemId, number]> = c.maybe(0.12) ? Array.from({ length: c.int(8, 10) }, (): [ItemId, number] => [c.of(["rod", "hoe", "can", "pot", "pan"] as ItemId[]), 1]) : [];
    const gifts = c.of<() => Purse["gifts"]>([() => ({ had: ["charmCloak"], charms: ["charmCloak"] }), () => ({ had: ["charmCloak"], charms: ["charmCloak"] }), () => ({ had: ["charmCloak", "charmNet"], charms: ["charmNet", "charmCloak"] }),
      () => ({ had: ["charmCloak"], charms: [] }), () => ({ had: ["charmNet"], charms: ["charmNet"] })])();
    const purse: Purse = { ...bagOf([...(hand ? [[hand, 1] as [ItemId, number]] : []), ...filler]), hand, gifts, stamina: { day: dayOf(now), left: c.of([100, 100, 2, 0]) },
      ...(c.maybe(0.2) ? { follower: { bug: "moth" as ItemId, n: 1, at: [3, 3] as [number, number], until: now - 60_000 } } : {}) };
    const shares = HAUNT_KINDS[h.kind].shares, taken = c.maybe(0.1) ? shares : 0, mine = c.maybe(0.05);
    const perch = c.of(h.perches), far = c.maybe(0.1);
    const tile: [number, number] = far ? [Math.floor(perch.x) + c.int(9, 14), Math.floor(perch.y) + c.int(9, 14)] : [Math.floor(perch.x) + c.int(-3, 3), Math.floor(perch.y) + c.int(-3, 3)];
    const misses = c.of([0, 0, 1, 2, 5]), lure = BUGS[bug].habit === "lure" ? c.of(lures) : null;
    add("net", [purse, h.id, has, taken, mine, hand, tile[0], tile[1], misses, now, lure], net(purse, h, has, taken, mine, hand, tile, misses, now, lure));
  }
  return out;
}

describe("the cases the database's rules of the insects' gifts are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsGiftsInsects();
    expect(JSON.stringify(vectorsGiftsInsects())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);
    const why = (fn: string) => new Set(of(fn).map((v) => { const w = v.want as { ok: boolean; why?: string }; return w.ok ? "ok" : w.why; }));

    // the haunt a drop calls from: one of every kind it calls from, on every map; none off the maps; and never a tree, a glade or the fall
    const called = of("nectar_haunt").map((v) => ({ at: v.args as [number, number], h: v.want === null ? null : HAUNTS[v.want as number] }));
    expect(called.length).toBeGreaterThan(300);
    for (const kind of NECTAR.at) expect(called.some((x) => x.h?.kind === kind), kind).toBe(true);
    for (const place of ["town", "farm", "forest"]) expect(called.some((x) => x.h?.place === place), place).toBe(true);
    expect(called.some((x) => x.h === null)).toBe(true);
    for (const x of called) {
      expect(x.h === null).toBe(placeOf(x.at[0], x.at[1]) === null);
      if (x.h) { expect(NECTAR.at).toContain(x.h.kind); expect(x.h.place).toBe(placeOf(x.at[0], x.at[1])); }
    }

    // a drop: put down, and refused each way; an insect of every tier among what came, a rare one seldom
    expect(why("nectar")).toEqual(new Set(["ok", "none", "spent", "out", "quiet"]));
    const came = of("nectar").filter((v) => (v.want as { ok: boolean }).ok).map((v) => v.want as { lured: Lured; left: number; purse: Purse });
    expect(came.length).toBeGreaterThan(200);
    const tiers = came.map((x) => tierOf(x.lured.bug as BugId));
    expect(new Set(tiers)).toEqual(new Set(["common", "uncommon", "rare"]));
    expect(new Set(came.map((x) => x.lured.bug))).toContain("orchidMantis");
    expect(new Set(came.map((x) => x.lured.bug))).toContain("lunaMoth");
    // (of the drops put down by chance, the first nine hundred cases, a rare one hardly ever comes)
    const byChance = of("nectar").slice(0, 900).filter((v) => (v.want as { ok: boolean }).ok).map((v) => tierOf((v.want as { lured: Lured }).lured.bug as BugId));
    expect(byChance.filter((t) => t === "rare").length / byChance.length).toBeLessThan(0.05);
    // (never what comes down only to a hand, nor what keeps to a glade or the fall)
    for (const x of came) { expect(BUGS[x.lured.bug as BugId].habit).not.toBe("lure"); expect(["morpho", "glassDragonfly", "cicada"]).not.toContain(x.lured.bug); }
    expect(came.some((x) => x.left === 9) && came.some((x) => x.left === 0)).toBe(true);
    expect(came.some((x) => x.lured.n === 2) && came.some((x) => x.lured.from - (x.purse.lured!.until - NECTAR.stays * 1000) === 0)).toBe(true);
    for (const x of came) expect(x.purse.lured).toEqual(x.lured);

    // the insect of a drop, and the one that follows a catch: caught, and refused each way
    expect(why("net_mine")).toEqual(new Set(["ok", "none", "tool", "far", "full"]));
    const mine = of("net_mine").map((v) => ({ p: v.args[0] as Purse, which: v.args[1] as string, now: v.args[6] as number, d: v.want as { ok: boolean; why?: string; purse?: Purse } }));
    // the second of a pair: caught in time, caught within the keeper's slack, refused past it; and it has none following
    const pairs = mine.filter((x) => x.which === "pair" && x.p.follower && x.p.follower.bug !== ("noSuchBug" as ItemId));
    expect(pairs.some((x) => x.d.ok && x.p.follower!.until >= x.now) && pairs.some((x) => x.d.ok && x.p.follower!.until < x.now)).toBe(true);
    expect(pairs.some((x) => !x.d.ok && x.d.why === "none" && x.p.follower!.until + PAIR.slack < x.now)).toBe(true);
    for (const x of pairs) if (x.d.ok) expect(x.d.purse!.follower).toBeNull();
    // a drop's insect caught under the cloak has another following; without the cloak it has none
    const drops = mine.filter((x) => x.which === "lured" && x.d.ok);
    expect(drops.some((x) => wearing(x.p, "charmCloak") && x.d.purse!.follower?.until === x.now + 3000 && x.d.purse!.follower.bug === x.p.lured!.bug)).toBe(true);
    for (const x of drops) if (!wearing(x.p, "charmCloak")) expect(x.d.purse!.follower).toEqual(x.p.follower);

    // the cloak's own insects: each of the six that have days of their own, never on a day of its own, and mostly nothing
    const cloaks = of("cloak_at").map((v) => ({ h: v.args[0] as number, now: v.args[1] as number, sw: v.want as (Swarm & { until: number }) | null }));
    expect(cloaks.length).toBeGreaterThan(1500);
    expect(new Set(cloaks.filter((x) => x.sw).map((x) => x.sw!.bug))).toEqual(new Set(["monarch", "morpho", "glassDragonfly", "hawkMoth", "jewelBeetle", "herculesBeetle"]));
    for (const x of cloaks) if (x.sw) { expect(x.sw.cloak).toBe(true); expect(BUGS[x.sw.bug].day).toBeGreaterThan(0); expect(swarmAt(WORD, HAUNTS[x.h], x.now, DRY)?.bug).not.toBe(x.sw.bug); }
    expect(cloaks.filter((x) => !x.sw).length).toBeGreaterThan(cloaks.length / 2);
    // (a nectar drop of somebody who wears it: one of them came that has days of its own)
    expect(of("nectar").some((v) => { const w = v.want as { ok: boolean; lured?: Lured }; return w.ok && wearing(v.args[0] as Purse, "charmCloak") && !!BUGS[w.lured!.bug as BugId].day; })).toBe(true);

    // a catch at a haunt under the cloak: what follows is kept for whoever wears it, and nobody else
    expect(why("net")).toEqual(new Set(["ok", "none", "had", "bare", "far", "tool", "full", "lure"]));
    const caught = of("net").map((v) => ({ p: v.args[0] as Purse, has: v.args[2] as Swarm, now: v.args[9] as number, d: v.want as { ok: boolean; purse?: Purse } })).filter((x) => x.d.ok);
    expect(caught.filter((x) => wearing(x.p, "charmCloak")).length).toBeGreaterThan(100);
    for (const x of caught) {
      if (wearing(x.p, "charmCloak")) expect(x.d.purse!.follower).toMatchObject({ bug: x.has.bug, n: x.has.n, until: x.now + 3000 });
      else expect(x.d.purse!.follower).toEqual(x.p.follower);
    }
    expect(caught.some((x) => !wearing(x.p, "charmCloak"))).toBe(true);
    expect(of("net_mine").some((v) => (v.want as { ok: boolean }).ok && (v.args[5] as number) >= 2) && of("net_mine").some((v) => (v.want as { ok: boolean }).ok && (v.args[0] as Purse).stamina.left === 0)).toBe(true);

    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-gifts-insects.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });
});
