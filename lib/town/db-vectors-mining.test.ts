import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { depthOf, isRest } from "./cave";
import { catalogOf } from "./catalog";
import {
  breakRocks, caveAt, crystalBroken, floorAtTile, floorRocks, floorTile, goneAt, newCave, openWay, setMoss, setTorch, stands, strikeRock, struckAt, struckTold, wayOpen, boardOf, changesAt, cornerOf,
  type ByWhom, type CaveState, type CaveTold, type Moss, type Torch, type WayOpen,
} from "./cave-state";
import { farRocks } from "./far-side";
import { caveLayout } from "./mining-row";
import {
  MINING, anyPick, crystalOf, elementOf, hardnessOf, hasBelow, helpersOf, holdsOf, isDug, isLoose, mineOf, oreOf, partOf, peekOf, pickOf, struckOf, swingsFor, turnOf, wayRockOf,
  type Holds, type PlaceToday, type RockAt, type Struck,
} from "./mining";
import { dayOf } from "./stamina";
import { ALL, ELEMENTS, FORGE, GEM_FX, gemBy, has, pickSwings, poolOf, type Element, type OptionId } from "./tools";
import { newPurse, type Purse, type Stack } from "./trade";
import { veinMods } from "./vein";

/**
 * The cases the database's rules are held to for v164's miners' part (lib/town/db-vectors-base.test.ts says how such
 * a file works). Each is a function of the schema `town` with its arguments and what the code answers
 * (.claude/skills/fc-cash-town/scripts/db/v164.mining.calls.json says which function each name is).
 *
 * A rock is told to the database as its layout tells it, [number, x, y, look], and a place's document as the
 * database keeps one (the base's head): this file turns the code's own shapes into those, and the code's whole
 * `CaveState` into the one place's document and back.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-mining.test.ts
 */
interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}
type Chance = ReturnType<typeof chance>;
const at = (s: string) => Date.parse(`${s}+07:00`);
/** Moments of two days, either side of dawn and of a turn's edge. */
const NOWS = [at("2026-10-08T12:00:00"), at("2026-10-08T04:59:30"), at("2026-10-08T05:00:30"), at("2026-10-08T19:39:59.999"), at("2026-10-08T19:40:00"), at("2026-10-09T08:15:00")];
const DAYS = [...new Set(NOWS.map(dayOf))];
/** Two words the rolls hang on: a short one, and one as long as the database's own. */
const WORDS = ["mine", "5f0c9a1be27d4c38a6e19b02d7f4c5a15f0c9a1be27d4c38a6e19b02d7f4c5a1"];
const WHO = ["m1", "m2", "m3", "m4"];

/** A rock as the database is told it. */
type Laid = [id: number, x: number, y: number, look: number];
const laidOf = (rocks: readonly RockAt[]): Laid[] => rocks.map((r) => [r.id, r.x, r.y, r.look ?? 0]);
const rocksOf = (laid: readonly Laid[]): RockAt[] => laid.map(([id, x, y, look]) => ({ id, x, y, look }));
/** The floors of the days the cases are of, laid once. */
const LAID = new Map<string, Laid[]>();
const laid = (floor: number, day: number): Laid[] => {
  if (floor <= 0) return laidOf(farRocks());
  const k = `${floor}:${day}`;
  if (!LAID.has(k)) LAID.set(k, caveLayout(floor, day).rocks as Laid[]);
  return LAID.get(k)!;
};

/** A pick at a level, with the options drawn at the milestones it has reached (those said first), and a gem or none. */
function pickAt(c: Chance, level: number, gem: Element | null = null, want: OptionId[] = []): Stack {
  const p1 = poolOf("pick", 1), p2 = poolOf("pick", 2);
  const first = [...want.filter((id) => p1.includes(id)), ...p1.filter((id) => !want.includes(id)).sort(() => c.next() - 0.5)].slice(0, 2);
  const top = want.find((id) => p2.includes(id)) ?? c.of(p2);
  const drawn = [...first, top].slice(0, FORGE.milestones.filter((m) => level >= m).length);
  return { item: "pick", n: 1, ...(level > 0 ? { plus: level } : {}), ...(drawn.length ? { opts: drawn } : {}), ...(gem ? { gems: [gem] } : {}) };
}
const anyPickAt = (c: Chance): Stack | null => (c.maybe(0.08) ? null : pickAt(c, c.of([0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]), c.maybe(0.45) ? c.of(ELEMENTS) : null));
/** A purse with some stacks in its first slots, and what is said of the rest. */
const purseWith = (stacks: Array<Stack | null>, more: Partial<Purse> = {}): Purse => {
  const p = newPurse();
  return { ...p, bag: [...stacks, ...p.bag.slice(stacks.length)], ...more };
};

/* ── the code's whole cave, and the one place's document the database keeps ── */

/** A place's document as the database keeps it (the miners' part says its shape in its head). */
interface Place {
  day: number; way: WayOpen | null; crystal: ByWhom | null;
  broken: { turn: number; ids: number[] }; struck: { turn: number; rocks: Record<string, Struck> };
  torches: Torch[]; moss: Moss[];
}
/** The one place's document of the code's whole state. `crystalOn`: the floor the day's crystal rock stands on (whoever broke it is written there). */
const placeOf = (s: CaveState, f: number, now: number, crystalOn: number | null): Place => ({
  day: s.day, way: s.ways[String(f)] ?? null, crystal: crystalOn === f ? s.crystal : null,
  broken: s.broken[String(f)] ?? { turn: turnOf(now), ids: [] }, struck: s.struck[String(f)] ?? { turn: turnOf(now), rocks: {} },
  torches: s.torches.filter((t) => t.f === f), moss: (s.moss ?? []).filter((m) => m.f === f),
});
/** The code's whole state of one place's document (as it is kept, sound or not). */
const wholeOf = (f: number, doc: unknown): unknown => {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return doc;
  const d = doc as Partial<Place>;
  return { day: d.day, ways: { [String(f)]: d.way }, broken: { [String(f)]: d.broken }, struck: { [String(f)]: d.struck }, crystal: d.crystal, deepest: null, torches: d.torches, moss: d.moss };
};
/** …and of a sound one, as a state the code's rules go on from. */
const stateOf = (f: number, doc: Place): CaveState => ({
  day: doc.day, ways: doc.way ? { [String(f)]: doc.way } : {}, broken: { [String(f)]: doc.broken }, struck: { [String(f)]: doc.struck }, crystal: doc.crystal, deepest: null, torches: doc.torches, moss: doc.moss,
});
/** What is known of a place on a day, for the rolls, as the trial's keeper works it out (lib/town/trial's todayAt). */
function todayAt(word: string, floor: number, s: CaveState, crystal: { floor: number; rock: number } | null): PlaceToday {
  if (floor <= 0) return { way: null, crystal: null };
  const mine = crystal && crystal.floor === floor ? crystal.rock : null;
  return { way: s.ways[String(floor)] ? null : wayRockOf(word, floor, s.day, floorRocks(floor, s.day), mine), crystal: s.crystal ? null : mine };
}
/** What a member is told of the cave, as the trial's keeper tells it (lib/town/trial's cave). */
function toldOf(s: CaveState, p: Purse, me: string, floor: number, tile: [number, number] | null, now: number, word: string): CaveTold {
  const kept = mineOf(p), pick = pickOf(p), turn = turnOf(now), c = crystalOf(word, s.day, (n) => floorRocks(n, s.day));
  const gone: Record<string, number[]> = {};
  for (let f = 0; f <= MINING.floors; f++) {
    const ids = goneAt(s, f, now);
    if (s.crystal && c && c.floor === f && !ids.includes(c.rock)) ids.push(c.rock);
    if (ids.length) gone[String(f)] = ids;
  }
  const reach = gemBy(pick, "light", GEM_FX.light.pick.glint), glints: number[] = [];
  if (reach > 0 && floor > 0 && tile) {
    const today = todayAt(word, floor, s, c);
    for (const r of floorRocks(floor, s.day)) {
      if (gone[String(floor)]?.includes(r.id) || (reach < ALL && Math.hypot(r.x - tile[0], r.y - tile[1]) > reach)) continue;
      if (holdsOf(word, floor, r.id, turn, today, pick).kind === "vein") glints.push(r.id);
    }
  }
  const [lf, lt] = kept.loose.k.split(":").map(Number);
  return {
    day: s.day, turn, again: changesAt(s, now), gone,
    ways: Object.fromEntries(Object.entries(s.ways).map(([f, w]) => [f, { x: w.x, y: w.y, rock: w.rock, name: w.name }])),
    torches: s.torches.filter((t) => t.until > now), moss: s.moss.filter((m) => m.until > now), deepest: boardOf(s),
    rests: kept.rests, vein: kept.vein, loose: lt === turn && kept.loose.ids.length ? { floor: lf, ids: kept.loose.ids } : null, glints,
    place: floor, struck: struckTold(s, floor, me, now), paid: kept.paid,
    crystal: !c || s.crystal ? null : floor === c.floor ? { floor: c.floor, rock: c.rock } : pick && has(pick, "pkGleam") ? { floor: c.floor, rock: null } : null,
  };
}
/** A rock's tally with some members' shares: the keys in the order the database keeps them, as the code then adds them up. */
const tally = (first: string, shares: Array<[string, number]>, at_: number): Struck => ({ first, name: first === "m1" ? "Aqua" : first, at: at_, by: Object.fromEntries([...shares].sort((a, b) => (a[0] < b[0] ? -1 : 1))) });
/**
 * The village's cave as it may stand at a moment: rocks broken and being broken on some floors, ways open, torches and
 * moss, the day's crystal rock broken or whole. Everything that has a moment has one of its own, earlier than now.
 */
function caveOf(c: Chance, now: number, word: string): { s: CaveState; crystal: { floor: number; rock: number } | null } {
  const day = dayOf(now), crystal = crystalOf(word, day, (f) => floorRocks(f, day));
  let s = newCave(day), tick = now - 50_000;
  const next = () => (tick += c.int(1, 600));
  const floors = [0, ...Array.from({ length: c.int(1, 6) }, () => c.int(1, MINING.floors)), ...(c.maybe(0.4) && crystal ? [crystal.floor] : [])];
  for (const f of [...new Set(floors)].sort((a, b) => a - b)) {
    const rocks = rocksOf(laid(f, day));
    if (!rocks.length) continue;
    if (c.maybe(0.7)) s = breakRocks(s, f, Array.from({ length: c.int(1, 4) }, () => c.of(rocks).id), now);
    for (let i = c.int(0, 3); i > 0; i--) {
      const first = c.of(WHO), others = WHO.filter((id) => id !== first && c.maybe(0.4));
      s = strikeRock(s, f, c.of(rocks).id, tally(first, [[first, c.of([1 / 4, 1 / 6, 1 / 7, 0.5])], ...others.map((id): [string, number] => [id, c.of([1 / 4, 1 / 6, 1 / 7])])], next()), now);
    }
    if (f > 0 && c.maybe(0.5)) { const r = c.of(rocks), by = c.of(WHO); s = openWay(s, f, { rock: c.maybe(0.8) ? r.id : null, x: r.x, y: r.y, by, name: by === "m1" ? "Aqua" : by, at: next() }); }
    if (f > 0) for (let i = c.int(0, 2); i > 0; i--) { const r = c.of(rocks); s = setTorch(s, f, r.x + 1, r.y, c.of(WHO), next() - c.of([0, 0, MINING.light.burns])); }
    if (f > 0) for (let i = c.int(0, 2); i > 0; i--) { const r = c.of(rocks); s = setMoss(s, f, r.x, r.y, c.of(WHO), next() - c.of([0, 0, MINING.moss.glows])); }
  }
  if (crystal && c.maybe(0.3)) s = crystalBroken(s, { by: "m2", name: "Nine", at: next() });
  return { s: caveAt(s, now), crystal };
}

export function vectorsMining(): Vector[] {
  const c = chance(20261165), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });

  /* ── when, and what a place is ── */
  for (const now of [...NOWS, 0, MINING.turn - 1, MINING.turn, 1_759_900_000_123]) add("turn", [now], turnOf(now));
  for (let f = -1; f <= MINING.floors + 2; f++) {
    add("is_rest", [f], isRest(f));
    add("depth", [f], depthOf(f));
    add("is_dug", [f], isDug(f));
    add("has_below", [f], hasBelow(f));
    add("ore", [f], oreOf(f));
    for (const points of [0, 49, 50, 699, 700, 1300, 5500, 12000, 99999]) add("hardness", [f, points], hardnessOf(f, points));
    for (const word of WORDS) for (const day of DAYS) add("element", [word, f, day], elementOf(word, f, day));
  }

  /* ── the rolls ── */
  for (const word of [...WORDS, "a", "b", "c", "d", "e", "f", "g", "h"]) for (const day of [...DAYS, DAYS[0] + 7, DAYS[0] + 31]) {
    const floors: Record<string, Laid[]> = {};
    for (let f = MINING.crystal.floors[0]; f <= MINING.crystal.floors[1]; f++) floors[String(f)] = laid(f, DAYS[0]);
    const want = crystalOf(word, day, (f) => rocksOf(floors[String(f)] ?? []));
    add("crystal_of", [word, day, floors], want);
    // (a floor with no rock with crystals in it, and floors with no rock at all)
    const plain = Object.fromEntries(Object.entries(floors).map(([f, rs]) => [f, rs.map(([id, x, y]): Laid => [id, x, y, 1])]));
    add("crystal_of", [word, day, plain], crystalOf(word, day, (f) => rocksOf(plain[String(f)] ?? [])));
    const one = { [String(MINING.crystal.floors[0] + 1)]: floors[String(MINING.crystal.floors[0] + 1)] };
    add("crystal_of", [word, day, one], crystalOf(word, day, (f) => rocksOf(one[String(f)] ?? [])));
    add("crystal_of", [word, day, {}], crystalOf(word, day, () => []));
  }
  for (const word of WORDS) for (const day of DAYS) for (let f = 0; f <= MINING.floors; f++) {
    const rocks = laid(f, DAYS[0]), crystal = c.maybe(0.3) && rocks.length ? c.of(rocks)[0] : null;
    add("way_rock", [word, f, day, rocks, crystal], wayRockOf(word, f, day, rocksOf(rocks), crystal));
  }
  add("way_rock", [WORDS[0], 3, DAYS[0], [], null], wayRockOf(WORDS[0], 3, DAYS[0], [], null));
  add("way_rock", [WORDS[0], 3, DAYS[0], [[4, 10, 10, 0]], 4], wayRockOf(WORDS[0], 3, DAYS[0], [{ id: 4, x: 10, y: 10 }], 4));
  for (let i = 0; i < 2600; i++) {
    const word = c.of(WORDS), f = c.maybe(0.2) ? 0 : c.int(1, MINING.floors), rocks = laid(f, DAYS[0]), rock = rocks.length && c.maybe(0.95) ? c.of(rocks)[0] : c.int(0, 60);
    const turn = turnOf(c.of(NOWS)) + c.int(0, 40), pick = anyPickAt(c);
    const today: PlaceToday = { way: c.maybe(0.15) ? rock : c.maybe(0.3) && rocks.length ? c.of(rocks)[0] : null, crystal: c.maybe(0.08) ? rock : c.maybe(0.1) && rocks.length ? c.of(rocks)[0] : null };
    const holds = holdsOf(word, f, rock, turn, today, pick);
    add("holds", [word, f, rock, turn, today, pick], holds);
    add("peek", [holds], peekOf(holds));
  }
  for (const h of [{ kind: "stone", shards: 0 }, { kind: "stone", shards: 2, moss: true }, { kind: "way", shards: 0 }, { kind: "way", shards: 1 }, { kind: "vein", gem: true, seed: 7 }, { kind: "crystal" }] as Holds[]) add("peek", [h], peekOf(h));

  /* ── a member's own ── */
  const veinKept = (): unknown => c.of<() => unknown>([
    () => undefined, () => null, () => ({ f: 3, rock: 5, turn: 99, seed: 12345, gem: null, mods: { strikes: 6, back: 0, cross: 0, spent: false }, more: 0 }),
    () => ({ f: 22, rock: 1, turn: 100, seed: 4000000000, gem: c.of([...ELEMENTS, "noSuchElement", 5, null]), mods: { strikes: c.of([0, 1, 8, 12, -3]), back: c.of([0, 2, -1, 1.7, "2", " 3 ", "x", true, null, undefined]), cross: c.of([1, 4, 2.9, "", false]), spent: c.of([true, false, 0, 1, "", "yes", null, undefined]) }, more: c.of([0, 1, 1.5, -2, "1", null, undefined]), again: c.of([true, false, 1, 0, undefined]) }),
    () => ({ f: 3.5, rock: 5, turn: 99, seed: 1, mods: { strikes: 6 } }), () => ({ f: 3, rock: "5", turn: 99, seed: 1, mods: { strikes: 6 } }), () => ({ f: 3, rock: 5, turn: 99, seed: "1", mods: { strikes: 6 } }),
    () => ({ f: 3, rock: 5, turn: 99, seed: 1 }), () => ({ f: 3, rock: 5, turn: 99, seed: 1, mods: { strikes: 6.5 } }), () => ({ f: 3, rock: 5, seed: 1, mods: { strikes: 6 } }), () => "a vein", () => [3, 5], () => 7,
  ])();
  const paidKept = (): unknown => c.of<() => unknown>([
    () => undefined, () => null, () => ({ at: 1_759_900_000_000, f: 4, rock: 2, got: [["stone", 1], ["shardCopper", 2]], way: false, crystal: false, vein: false, by: "Aqua" }),
    () => ({ at: 5, f: 0, rock: 9, got: [["stone", 1], ["stone"], "stone", [1, 2], ["chipRuby", "2"], ["shardIron", 3, 4]], way: c.of([true, 1, "x", 0, null]), crystal: c.of([true, undefined]), vein: c.of([false, "v"]), by: c.of(["Nine", 5, null, undefined]) }),
    () => ({ at: "5", f: 0, rock: 9, got: [] }), () => ({ at: 5, f: 0.5, rock: 9, got: [] }), () => ({ at: 5, f: 0, rock: 9 }), () => ({ at: 5, f: 0, rock: 9, got: "none" }), () => "paid", () => [],
  ])();
  const mineKept = (): unknown => c.of<() => unknown>([
    () => undefined, () => undefined, () => null, () => [], () => "mine", () => ({}),
    () => ({ owed: c.of([0, 0.5, 0.999, 1, -0.2, 1.5, "0.5", null]), crumb: c.of([0, 1, 4, -1, 2.5, "3"]), loose: c.of<unknown>([{ k: "3:99", ids: [1, 2, 2, "3", 4.5, null] }, { k: 3, ids: [1] }, { k: "3:99" }, { ids: [1] }, "3:99", null, undefined]),
      vein: veinKept(), rests: c.of<unknown>([[10], [20, 10, 10], [30, 10, 20], [5, 10, 40, "20", 10.5, 0, -10], "10", null, undefined]), last: c.of([0, 1_759_900_000_000, "5", null, -3, 12.5]), paid: paidKept() }),
    () => ({ owed: 0.25, crumb: 3, loose: { k: "7:1234", ids: [4, 9] }, vein: veinKept(), rests: [10, 20], last: 1_759_900_000_000, paid: paidKept() }),
  ])();
  for (let i = 0; i < 500; i++) {
    const kept = mineKept(), p = purseWith([], kept === undefined ? {} : ({ mine: kept } as Partial<Purse>));
    add("mine_of", [p], mineOf(p));
    const f = c.of([3, 7, 0]), turn = c.of([99, 1234]), rock = c.of([1, 2, 4, 9]);
    add("is_loose", [p, f, turn, rock], isLoose(p, f, turn, rock));
  }
  for (let i = 0; i < 400; i++) {
    // two picks of a kind, another tool, and the hand on one of them, on something else, on nothing
    const a = c.maybe(0.8) ? pickAt(c, c.int(0, 10)) : null, b = c.maybe(0.6) ? pickAt(c, c.int(0, 10), c.maybe(0.3) ? c.of(ELEMENTS) : null) : null;
    const hand = c.of<unknown>(["pick", "pick", "minnow", "hoe", null, undefined, "noSuchThing"]), handAt = c.of<unknown>([0, 2, 2, 1, 5, undefined, undefined]);
    const p = { ...purseWith([a, { item: "minnow", n: 3 }, b, c.maybe(0.3) ? { item: "hoe", n: 1, plus: 4 } : null]), ...(hand === undefined ? {} : { hand }), ...(handAt === undefined ? {} : { handAt }) } as Purse;
    add("pick", [p], pickOf(p));
    add("any_pick", [p], anyPick(p));
  }
  for (let i = 0; i < 700; i++) {
    const pick = anyPickAt(c), hardness = c.of([12, 18, 24, 18 * 1.08, 24 * 1.56, 12.5, 1, 3]);
    add("pick_swings", [pick, hardness], pickSwings(pick, hardness));
    const f = c.int(0, MINING.floors), spent = c.maybe(0.3), loose = c.maybe(0.3), points = c.of([0, 0, 300, 700, 2200, 12000]);
    add("swings", [pick, f, spent, loose, points], swingsFor(pick, f, spent, loose, points));
    add("vein_mods", [pick, spent], veinMods(pick, spent));
  }
  // (every level with every gem that changes the swings, on every hardness there is: where a share rounds is where the two could part)
  for (let level = 0; level <= 10; level++) for (const gem of [null, "fire", "dark"] as Array<Element | null>) for (let f = 0; f <= MINING.floors; f += 5) for (const points of [0, 700, 12000]) {
    const pick = pickAt(c, level, gem);
    add("swings", [pick, f, false, false, points], swingsFor(pick, f, false, false, points));
    add("swings", [pick, f, true, true, points], swingsFor(pick, f, true, true, points));
  }
  for (const steady of [false, true]) for (let level = 0; level <= 10; level++) for (const gem of [null, "water", "ice"] as Array<Element | null>) for (const spent of [false, true]) {
    const pick = pickAt(c, level, gem, steady ? ["pkSteady"] : ["pkPeek", "pkCrumb"]);
    add("vein_mods", [pick, spent], veinMods(pick, spent));
  }

  /* ── a rock being broken ── */
  const struckKept = (): unknown => c.of<() => unknown>([
    () => undefined, () => null, () => ({ first: "m1", name: "Aqua", at: 5, by: { m1: 0.25 } }), () => ({ first: "m1", name: "Aqua", at: 5, by: { m1: 0.25, m2: 0.5, m3: 0.125 } }),
    () => ({ first: "m2", name: 7, at: "5", by: { m1: 0.6, m2: 0.7 } }), () => ({ first: "m1", by: { m1: 0, m2: -1, m3: "0.5", m4: null } }), () => ({ first: "m1", by: { m1: 2.5, m2: 0.1 } }),
    () => ({ first: "m3", name: "N", at: 9, by: { m1: 1 / 3, m2: 1 / 3 } }), () => ({ first: 1, by: { m1: 0.5 } }), () => ({ first: "m1", by: "m1" }), () => ({ first: "m1" }), () => "struck", () => ({ first: "m1", name: "A", at: 1, by: {} }),
    () => ({ first: "m1", name: "A", at: 1, by: Object.fromEntries(WHO.slice(0, c.int(1, 4)).map((id) => [id, c.of([1 / 7, 2 / 7, 1 / 6, 0.1, 0.2, 0.3, 0.999999])])) }),
  ])();
  for (let i = 0; i < 400; i++) {
    const kept = struckKept(), sound = struckOf(kept);
    add("struck_of", [[kept ?? null]], sound);
    add("part", [sound], partOf(sound));
    if (sound) add("helpers", [sound], helpersOf(sound));
  }
  /* ── a place's document ── */
  const byKept = (): unknown => c.of<() => unknown>([() => ({ by: "m2", name: "Nine", at: 1_759_900_000_000 }), () => ({ by: "m2", name: "Nine", at: "1" }), () => ({ by: "m2", at: 1 }), () => ({ by: 2, name: "Nine", at: 1 }), () => null, () => undefined, () => "m2"])();
  const lightsKept = (now: number, f: number): unknown => c.of<() => unknown>([
    () => undefined, () => [], () => null, () => "torch",
    () => [{ f, x: 70, y: 330, until: now + 1, by: "m1" }, { f, x: 71, y: 330, until: now, by: "m1" }, { f, x: 72, y: 330, until: now - 5000, by: "m2" }, { f, x: 73, y: 330, until: now + 60_000, by: "m3", more: true }],
    () => [{ f: f + 0.5, x: 70, y: 330, until: now + 9, by: "m1" }, { f, x: "70", y: 330, until: now + 9, by: "m1" }, { f, x: 70, y: 330, until: String(now + 9), by: "m1" }, { f, x: 70, y: 330, until: now + 9, by: 1 }, null, "x", [f, 70, 330], { f, x: 70, y: 331, until: now + 9, by: "m4" }],
  ])();
  const placeKept = (now: number, f: number): unknown => c.of<() => unknown>([
    () => undefined, () => null, () => ({}), () => [], () => "cave",
    () => ({ day: c.of([dayOf(now), dayOf(now), dayOf(now), dayOf(now) - 1, dayOf(now) + 1, String(dayOf(now)), null]),
      way: c.of<() => unknown>([() => null, () => undefined, () => ({ rock: c.of([4, null, 4.5, "4", undefined]), x: 70, y: 330, by: "m1", name: "Aqua", at: now - 9 }), () => ({ rock: 4, x: 70.5, y: 330, by: "m1", name: "Aqua", at: 1 }), () => ({ rock: 4, x: 70, y: 330, by: "m1", at: 1 }), () => "way"])(),
      crystal: byKept(),
      broken: c.of<() => unknown>([() => undefined, () => null, () => ({ turn: turnOf(now), ids: [3, 1, 3, 2.5, "4", null, 1, 7] }), () => ({ turn: turnOf(now) - 1, ids: [3, 1] }), () => ({ turn: String(turnOf(now)), ids: [3] }), () => ({ turn: turnOf(now) }), () => ({ turn: turnOf(now), ids: "3" }), () => [turnOf(now), [3]]])(),
      struck: c.of<() => unknown>([() => undefined, () => null, () => ({ turn: turnOf(now), rocks: { 3: struckKept(), 12: struckKept(), x: { first: "m1", name: "A", at: 1, by: { m1: 0.5 } }, 5: { first: "m1", name: "A", at: 1, by: { m1: 0.5, m2: 0.25 } } } }),
        () => ({ turn: turnOf(now) - 1, rocks: { 3: { first: "m1", name: "A", at: 1, by: { m1: 0.5 } } } }), () => ({ turn: turnOf(now), rocks: [] }), () => ({ turn: turnOf(now) }), () => ({ rocks: { 3: { first: "m1", name: "A", at: 1, by: { m1: 0.5 } } } })])(),
      torches: lightsKept(now, f), moss: lightsKept(now, f) }),
  ])();
  for (let i = 0; i < 700; i++) {
    const now = c.of(NOWS), f = c.int(0, MINING.floors), kept = placeKept(now, f);
    add("cave_at", [[kept ?? null], now], placeOf(caveAt(wholeOf(f, kept), now), f, now, f));
  }
  for (let i = 0; i < 260; i++) {
    const now = c.of(NOWS), word = c.of(WORDS), { s, crystal } = caveOf(c, now, word), day = dayOf(now);
    const places = [...new Set([...Object.keys(s.broken), ...Object.keys(s.struck), ...Object.keys(s.ways), ...s.torches.map((t) => String(t.f)), ...s.moss.map((m) => String(m.f)), ...(crystal ? [String(crystal.floor)] : []), "0", String(c.int(1, MINING.floors))])].map(Number).sort((a, b) => a - b);
    const caves = Object.fromEntries(places.map((f) => [String(f), placeOf(s, f, now, crystal?.floor ?? null)]));
    for (const f of places) {
      const doc = caves[String(f)], rocks = laid(f, day), here = crystal && crystal.floor === f ? crystal.rock : null, who = c.of(WHO);
      add("gone", [doc, now], goneAt(s, f, now));
      add("way_open", [doc, f], wayOpen(s, f));
      add("struck_told", [doc, who, now], struckTold(s, f, who, now));
      add("today", [word, f, day, rocks, doc, here], todayAt(word, f, s, crystal));
      if (!rocks.length) continue;
      for (let j = 0; j < 3; j++) {
        const rock = c.maybe(0.9) ? c.of(rocks)[0] : 99;
        add("stands", [doc, rock, now, here], stands(s, f, rock, now, here));
        add("struck_at", [doc, rock, now], struckAt(s, f, rock, now));
        const first = c.of(WHO), t = tally(first, [[first, c.of([0.25, 1 / 3, 0.5])], ...(c.maybe(0.5) ? [[c.of(WHO.filter((id) => id !== first)), 1 / 6] as [string, number]] : [])], now - 7);
        add("strike", [doc, rock, t, now], placeOf(strikeRock(stateOf(f, doc), f, rock, t, now), f, now, f));
        const ids = Array.from({ length: c.int(1, 3) }, () => (c.maybe(0.9) ? c.of(rocks)[0] : 99));
        add("break", [doc, ids, now], placeOf(breakRocks(stateOf(f, doc), f, ids, now), f, now, f));
      }
    }
    // what a member is told: with every sort of pick, standing here and there, with something of their own kept or nothing
    for (let j = 0; j < 3; j++) {
      const f = c.maybe(0.75) ? c.of(places) : c.int(0, MINING.floors), rocks = laid(f, day), turn = turnOf(now);
      const pick = c.maybe(0.1) ? null : pickAt(c, c.of([0, 3, 6, 10, 10]), c.maybe(0.6) ? "light" : c.maybe(0.3) ? c.of(ELEMENTS) : null, c.maybe(0.5) ? ["pkGleam"] : []);
      const corner = f > 0 ? cornerOf(f) : { x: 30, y: 230 }, near = rocks.length ? c.of(rocks) : null;
      const tile: [number, number] | null = c.maybe(0.1) ? null : near && c.maybe(0.7) ? [near[1] + c.int(-6, 6), near[2] + c.int(-6, 6)] : [corner.x + c.int(0, 27), corner.y + c.int(0, 27)];
      const kept = c.maybe(0.5) ? { rests: c.of([[10], [10, 20], []]), vein: c.maybe(0.3) ? { f, rock: 3, turn, seed: 77, gem: null, mods: { strikes: 6, back: 0, cross: 0, spent: false }, more: 0 } : null,
        loose: c.of([{ k: `${f}:${turn}`, ids: [1, 5] }, { k: `${f}:${turn - 1}`, ids: [1] }, { k: `${f}:${turn}`, ids: [] }, { k: "", ids: [] }]), last: now - 500, owed: 0, crumb: 2,
        paid: c.maybe(0.3) ? { at: now - 900, f, rock: 2, got: [["stone", 1]], way: false, crystal: false, vein: false, by: "Nine" } : null } : undefined;
      const p = purseWith([pick, { item: "glowMushroom", n: 2 }], { hand: c.maybe(0.9) ? "pick" : "glowMushroom", ...(kept ? { mine: kept } : {}) } as Partial<Purse>);
      const me = c.of(WHO);
      add("told", [caves, p, me, f, tile?.[0] ?? null, tile?.[1] ?? null, now, word, rocks, crystal], toldOf(s, p, me, f, tile, now, word));
    }
  }

  /* ── where things are, by a day's layout ── */
  for (let f = 1; f <= MINING.floors; f++) {
    const k = cornerOf(f);
    for (const [dx, dy] of [[0, 0], [27, 27], [28, 0], [0, 28], [-1, 5], [5, -1], [13, 13], [63, 63], [64, 0]]) add("floor_at", [k.x + dx, k.y + dy], floorAtTile(k.x + dx, k.y + dy));
  }
  for (const [x, y] of [[0, 0], [40, 230], [0, 319], [-5, 400], [300, 330], [10, 320 + 64 * 8], [null, 330], [5, null]] as Array<[number | null, number | null]>) add("floor_at", [x, y], x === null || y === null ? 0 : floorAtTile(x, y));
  for (const f of [1, 2, 7, 10, 19, 20, 28, 29, 30]) {
    const day = DAYS[0], layout = caveLayout(f, day), k = cornerOf(f);
    for (let i = 0; i < 36; i++) {
      const x = k.x + c.int(-1, 28), y = k.y + c.int(-1, 28);
      add("floor_tile", [layout, f, x, y], floorTile(f, day, x, y));
    }
    add("floor_tile", [layout, f, null, k.y + 3], false);
    add("floor_tile", [layout, 0, k.x + 3, k.y + 3], floorTile(0, day, k.x + 3, k.y + 3));
  }
  return out;
}

describe("the cases the database's rules of mining are held to", () => {
  it("are made the same every time, and reach every answer a rule can give", () => {
    const all = vectorsMining();
    expect(JSON.stringify(vectorsMining())).toBe(JSON.stringify(all));
    const of = (fn: string) => all.filter((v) => v.fn === fn);

    // what a place is: three depths, the resting floors, every element of a day
    expect(new Set(of("depth").map((v) => v.want))).toEqual(new Set([0, 1, 2]));
    expect(of("is_rest").filter((v) => v.want === true).map((v) => v.args[0])).toEqual([10, 20, 30]);
    expect(new Set(of("element").map((v) => v.want)).size).toBe(ELEMENTS.length);
    expect(new Set(of("hardness").map((v) => v.want)).size).toBeGreaterThan(8);
    // the rolls: the crystal rock on either floor it may stand on, and nowhere; a way down on every floor that has one to find
    const crystals = of("crystal_of").map((v) => v.want as { floor: number; rock: number } | null);
    expect(new Set(crystals.map((x) => x?.floor ?? 0))).toEqual(new Set([0, 28, 29]));
    expect(of("way_rock").filter((v) => v.want === null).every((v) => !isDug(v.args[1] as number) || !hasBelow(v.args[1] as number) || !(v.args[3] as unknown[]).length || (v.args[3] as unknown[]).length === 1)).toBe(true);
    expect(of("way_rock").some((v) => v.want !== null)).toBe(true);
    const kinds = of("holds").map((v) => v.want as Holds);
    expect(new Set(kinds.map((h) => h.kind))).toEqual(new Set(["stone", "vein", "way", "crystal"]));
    expect(kinds.some((h) => h.kind === "stone" && h.moss) && kinds.some((h) => h.kind === "stone" && h.shards === 2) && kinds.some((h) => h.kind === "vein" && h.gem) && kinds.some((h) => h.kind === "way" && h.shards > 0)).toBe(true);
    expect(new Set(of("peek").map((v) => v.want))).toEqual(new Set(["stone", "shards", "vein"]));
    // a member's own: kept soundly and not; a pick in the hand, the best in the bag, none
    const kept = of("mine_of").map((v) => v.want as ReturnType<typeof mineOf>);
    expect(kept.some((k) => k.vein?.again) && kept.some((k) => k.vein && k.vein.gem) && kept.some((k) => k.paid && k.paid.got.length === 2) && kept.some((k) => k.rests.length === 3) && kept.some((k) => k.owed > 0) && kept.some((k) => k.loose.ids.length > 0)).toBe(true);
    expect(of("is_loose").some((v) => v.want === true) && of("is_loose").some((v) => v.want === false)).toBe(true);
    expect(of("pick").some((v) => v.want === null) && of("any_pick").some((v) => v.want !== null && of("pick").find((p) => p.args[0] === v.args[0])!.want === null)).toBe(true);
    expect(new Set(of("pick_swings").map((v) => v.want)).size).toBeGreaterThan(8);
    expect(of("swings").every((v) => (v.want as number) >= 1)).toBe(true);
    expect(new Set(of("vein_mods").map((v) => (v.want as { strikes: number }).strikes)).size).toBeGreaterThan(6);
    // a rock's tally
    expect(of("struck_of").some((v) => v.want === null) && of("part").some((v) => v.want === 1) && of("part").some((v) => (v.want as number) > 0 && (v.want as number) < 1) && of("helpers").some((v) => (v.want as string[]).length === 3)).toBe(true);

    const dir = process.env.TOWN_VECTORS;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/vectors-mining.json`, JSON.stringify(all));
      writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf()));
    }
  }, 240_000);
});
