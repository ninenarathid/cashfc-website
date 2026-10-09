import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { depthOf, isRest } from "./cave";
import { catalogOf } from "./catalog";
import {
  breakRocks, caveAt, crystalBroken, floorAtTile, floorRocks, floorSpots, floorTile, goneAt, newCave, openWay, setMoss, setTorch, stands, strikeRock, struckAt, struckTold, wayOpen, boardOf, changesAt, cornerOf,
  type ByWhom, type CaveState, type CaveTold, type Moss, type Torch, type WayOpen,
} from "./cave-state";
import { farRocks } from "./far-side";
import { stretchOf } from "./gifts";
import { ITEMS } from "./items";
import { countsOf, type Done } from "./line-points";
import { caveLayout } from "./mining-row";
import {
  MINING, anyPick, crystalOf, drill, elementOf, hardnessOf, hasBelow, helpersOf, holdsOf, isDug, isLoose, liftStops, mayRide, mine, mineOf, oreOf, partOf, payFirst, peekOf, pickOf, reachRest, struckOf, swingsFor,
  torchDown, turnOf, wayRockOf,
  type Go as MineGo, type Holds, type PendingVein, type PlaceToday, type RockAt, type Struck,
} from "./mining";
import { powerRule } from "./powers";
import { dayOf } from "./stamina";
import { ALL, ELEMENTS, FORGE, GEM_FX, gemBy, has, pickSwings, poolOf, type Element, type OptionId } from "./tools";
import { newPurse, type Purse, type Stack } from "./trade";
import { VEIN, begin, bestRoute, faceOf, headOf, over, strike as veinStrike, veinMods } from "./vein";
import { accountOf, oddOf, veinFrom } from "./vein-account";

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

/* ── a go at a rock, as the trial's keeper makes one and as the database is told it ── */

/** A rock by what it holds: plain with nothing in it, with fragments, with moss; the way down; a vein, a gem's vein; the day's crystal. */
type Fate = "any" | "stone" | "shards" | "moss" | "way" | "vein" | "gem" | "crystal";
const isFate = (h: Holds, k: Fate): boolean => k === "any" || (k === "stone" ? h.kind === "stone" && !h.shards && !h.moss : k === "shards" ? h.kind === "stone" && h.shards > 0 : k === "moss" ? h.kind === "stone" && !!h.moss
  : k === "way" ? h.kind === "way" : k === "vein" ? h.kind === "vein" && !h.gem : k === "gem" ? h.kind === "vein" && h.gem : h.kind === "crystal");
/** The floors that have rocks. */
const DUG = Array.from({ length: MINING.floors }, (_, i) => i + 1).filter(isDug);
/** A place's rocks on a day (none, of a place that is none), laid once. */
const rocksAt = (f: number, day: number): RockAt[] => (f < 0 || f > MINING.floors ? [] : rocksOf(laid(f, day)));
const crystalAt = (word: string, day: number) => crystalOf(word, day, (n) => rocksAt(n, day));
const todayOf = (word: string, f: number, s: CaveState, crystal: { floor: number; rock: number } | null): PlaceToday => {
  if (f <= 0) return { way: null, crystal: null };
  const here = crystal && crystal.floor === f ? crystal.rock : null;
  return { way: s.ways[String(f)] ? null : wayRockOf(word, f, s.day, rocksAt(f, s.day), here), crystal: s.crystal ? null : here };
};
/** A tally with its members in the order the database keeps them (the order of their ids), which is the order it adds them up in. */
const ordered = (s: Struck): Struck => ({ ...s, by: Object.fromEntries(Object.entries(s.by).sort((a, b) => (a[0] < b[0] ? -1 : 1))) });
/** What a go came to, as it is held against the database's: how much is struck away is asked of the code for the tally as the database has it. */
const shown = (did: ReturnType<typeof mine>): unknown => (!did.ok ? did : did.done === false ? { ...did, struck: ordered(did.struck), part: partOf(ordered(did.struck)) } : { ...did, struck: ordered(did.struck) });

/** A place, a moment and a rock of it that holds what is asked for, for a pick: the word the rolls hang on is looked for until one does. */
interface Scene { word: string; now: number; day: number; turn: number; f: number; rocks: RockAt[]; crystal: { floor: number; rock: number } | null; rock: RockAt }
function sceneOf(c: Chance, fate: Fate, pick: Stack | null, foot = false): Scene {
  const now = c.of(NOWS) + c.int(0, 2) * 1000, day = dayOf(now), turn = turnOf(now), base = c.of(WORDS);
  for (let i = 0; i < 20000; i++) {
    const word = i ? `${base}:${i}` : base, crystal = crystalAt(word, day), f = foot ? 0 : fate === "crystal" ? crystal?.floor ?? 28 : c.of(DUG);
    const rocks = rocksAt(f, day), today = todayOf(word, f, newCave(day), crystal);
    const fits = rocks.filter((r) => isFate(holdsOf(word, f, r.id, turn, today, pick), fate));
    if (fits.length) return { word, now, day, turn, f, rocks, crystal, rock: c.of(fits) };
  }
  throw new Error(`no rock that holds ${fate}`);
}
/** The place as it stands for a scene: some other rocks broken or begun, the rock itself begun or not, the way down open or not, the crystal broken or not. */
function standing(c: Chance, sc: Scene, o: { had?: Struck | null; open?: boolean; shattered?: boolean; gone?: boolean } = {}): CaveState {
  let s = newCave(sc.day);
  const others = sc.rocks.filter((r) => r.id !== sc.rock.id);
  if (others.length && c.maybe(0.5)) s = breakRocks(s, sc.f, Array.from({ length: c.int(1, 5) }, () => c.of(others).id), sc.now);
  if (o.gone) s = breakRocks(s, sc.f, [sc.rock.id], sc.now);
  // (rocks about it that somebody has begun: a quake and a neighbour's breaking pass over another's, and take one's own)
  for (let i = others.length ? c.int(0, 3) : 0; i > 0; i--) { const first = c.of(WHO); s = strikeRock(s, sc.f, c.of(others).id, tally(first, [[first, c.of([0.25, 0.5, 1 / 3])]], sc.now - 900), sc.now); }
  if (o.had) s = strikeRock(s, sc.f, sc.rock.id, o.had, sc.now);
  const way = todayOf(sc.word, sc.f, s, sc.crystal).way;
  if (o.open && sc.f > 0 && way !== null && way !== sc.rock.id) { const r = sc.rocks.find((x) => x.id === way)!; s = openWay(s, sc.f, { rock: c.maybe(0.8) ? r.id : null, x: r.x, y: r.y, by: "m3", name: "m3", at: sc.now - 4000 }); }
  if (o.shattered && sc.crystal && !(sc.crystal.floor === sc.f && sc.crystal.rock === sc.rock.id)) s = crystalBroken(s, { by: "m2", name: "Nine", at: sc.now - 3000 });
  return caveAt(s, sc.now);
}
/** A member's purse at a scene: the pick in the first slot, and what is said of the rest. */
interface Miner {
  /** Stamina left today (nothing said: the day's whole). */
  left?: number;
  /** The bag: room for everything; a slot of stone one short of full and nothing else free; nothing free at all. */
  bag?: "roomy" | "tight" | "full";
  sack?: boolean;
  /** A vein open already; the rocks loosened here this turn; the plain rocks since the last crumb; a share of stamina owed; when a rock was last struck. */
  vein?: boolean; loose?: number[]; crumb?: number; owed?: number; last?: number;
  /** A counted option used so many times in the stretch that is. */
  used?: Partial<Record<OptionId, number>>;
  /** What the hand is on: the pick, something else, nothing. A second pick, further down the bag. */
  hand?: "pick" | "other" | "none"; second?: Stack | null;
}
function minerOf(sc: Scene, pick: Stack | null, o: Miner = {}): Purse {
  const filler: Stack = { item: "boot", n: 1 }, n = newPurse().bag.length;
  const rest: Array<Stack | null> = o.bag === "full" ? Array.from({ length: n - 2 }, () => filler) : o.bag === "tight" ? [{ item: "stone", n: ITEMS.stone.stack - 1 }, ...Array.from({ length: n - 3 }, () => filler)] : [{ item: "torch", n: 2 }];
  const powers = Object.fromEntries(Object.entries(o.used ?? {}).map(([id, used]) => [id, { k: stretchOf(powerRule(id)!, sc.now), n: used }]));
  const stacks: Array<Stack | null> = [pick, { item: "glowMushroom", n: 1 }, ...rest];
  while (stacks.length < n) stacks.push(null);
  if (o.second) stacks[n - 1] = o.second;
  return {
    ...purseWith(stacks),
    ...(o.hand === "none" ? {} : { hand: o.hand === "other" ? "glowMushroom" : "pick", ...(o.hand === "other" ? {} : { handAt: 0 }) }),
    ...(o.left === undefined ? {} : { stamina: { day: sc.day, left: o.left } }),
    ...(o.sack ? { gifts: { had: ["thingSack"], charms: [] }, pouches: { thingSack: [{ item: "stone", n: 7 }, null, null, null, null] } } : {}),
    ...(Object.keys(powers).length ? { powers } : {}),
    mine: {
      owed: o.owed ?? 0, crumb: o.crumb ?? 0, loose: o.loose ? { k: `${sc.f}:${sc.turn}`, ids: o.loose } : { k: "", ids: [] }, rests: [], last: o.last ?? 0, paid: null,
      vein: o.vein ? { f: sc.f, rock: 99, turn: sc.turn, seed: 4242, gem: null, mods: { strikes: 6, back: 0, cross: 0, spent: false }, more: 0 } : null,
    },
  } as Purse;
}
/** A go at a scene's rock: for the code, and as the database is told it (the place's rocks as they are laid, its document, and what the keeper works out of the day). */
function goOf(sc: Scene, s: CaveState, how: { rock?: number; at: [number, number]; swings: number; who: string; points?: number; quake?: boolean }): { go: MineGo; said: Record<string, unknown> } {
  const here = sc.crystal && sc.crystal.floor === sc.f ? sc.crystal.rock : null, today = todayOf(sc.word, sc.f, s, sc.crystal), element = elementOf(sc.word, sc.f, sc.day);
  const rock = how.rock ?? sc.rock.id, name = how.who === "m1" ? "Aqua" : how.who, points = how.points ?? 0, quake = !!how.quake;
  return {
    go: { now: sc.now, floor: sc.f, rock, at: how.at, swings: how.swings, rocks: sc.rocks, standing: (id) => stands(s, sc.f, id, sc.now, here), salt: sc.word, day: sc.day, today, element, points, quake, who: how.who, name, struck: (id) => struckAt(s, sc.f, id, sc.now) },
    said: { now: sc.now, floor: sc.f, rock, at: how.at, swings: how.swings, who: how.who, name, rocks: laidOf(sc.rocks), cave: placeOf(s, sc.f, sc.now, sc.crystal?.floor ?? null), crystal: here, day: sc.day, today, element, points, quake },
  };
}
/** A look at a rock, as the trial's keeper answers one (lib/town/trial's minePeek). */
function lookOf(p: Purse, go: MineGo): { ok: true; peek: string } | { ok: false; why: string } {
  const pick = pickOf(p);
  if (!pick || !has(pick, "pkPeek")) return { ok: false, why: "tool" };
  if (!go.rocks.some((r) => r.id === go.rock)) return { ok: false, why: "none" };
  if (!go.standing(go.rock)) return { ok: false, why: "gone" };
  return { ok: true, peek: peekOf(holdsOf(go.salt, go.floor, go.rock, turnOf(go.now), go.today, pick)) };
}
/** Whether a tile is one a member may be believed to stand on to strike from: the place of a rock only once that rock stands no longer; else, in the cave, floor with nothing on it, and on the mountain's foot any tile that is no floor of the cave's. */
const stoodOn = (f: number, day: number, x: number, y: number, rocks: readonly RockAt[], stands_: (id: number) => boolean): boolean => {
  const r = rocks.find((q) => q.x === x && q.y === y);
  return r ? !stands_(r.id) : f === 0 ? floorAtTile(x, y) === 0 : floorTile(f, day, x, y);
};

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

  /* ── a rock struck: every way a go can come out, with every sort of pick and purse ── */
  const P1: OptionId[] = ["pkPeek", "pkCrumb", "pkSteady", "pkLoose", "pkFresh", "pkCutter"], P2: OptionId[] = ["pkQuake", "pkTwin", "pkDrill", "pkGleam"];
  const NEAR: Array<[number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1]], FAR: Array<[number, number]> = [[2, 0], [0, 3], [-2, -2], [5, 1]];
  /** A pick of the miners' at some level, with what it may carry. */
  const minersPick = (level: number): Stack => pickAt(c, level, c.maybe(0.55) ? c.of(ELEMENTS) : null, c.maybe(0.75) ? [c.of(P1), c.of(P1), c.of(P2)] : []);
  /** A purse of somebody at a scene, by chance. */
  const anyMiner = (sc: Scene, pick: Stack | null, more: Miner = {}): Purse => minerOf(sc, pick, {
    left: c.of([undefined, undefined, 100, 40, 3, 2, 1, 0.5, 0, 0]), bag: c.of<Miner["bag"]>(["roomy", "roomy", "roomy", "roomy", "tight", "full"]), sack: c.maybe(0.3),
    crumb: c.int(0, 5), owed: c.of([0, 0, 0.35, 0.9]), last: c.of([0, 0, sc.now - 600_000, sc.now - 600_000, sc.now - 600_000, sc.now - 20_000, sc.now - 2000, sc.now - 700, sc.now - 100, sc.now + 5000]),
    loose: c.maybe(0.35) ? [sc.rock.id, ...sc.rocks.slice(0, 2).map((r) => r.id)].sort((a, b) => a - b).filter((id, i, all) => all.indexOf(id) === i) : undefined,
    used: { ...(c.maybe(0.5) ? { pkQuake: c.of([0, 3, 9, 10]) } : {}), ...(c.maybe(0.5) ? { pkFresh: c.of([0, 4, 9, 10]) } : {}) },
    ...more,
  });
  for (let i = 0; i < 2400; i++) {
    const fate = c.of<Fate>(["any", "any", "any", "any", "stone", "shards", "moss", "way", "vein", "vein", "gem", "crystal"]);
    const foot = (fate === "any" || fate === "stone" || fate === "shards") && c.maybe(0.3);
    const pick = minersPick(fate === "crystal" ? c.of([10, 10, 10, 9, 4]) : c.of([0, 0, 1, 3, 4, 6, 7, 9, 10, 10]));
    const sc = sceneOf(c, fate, pick, foot), who = c.of(WHO), other = c.of(WHO.filter((id) => id !== who));
    // the rock as this go finds it: untouched, begun by the striker, begun by another (with a helper or none), all but
    // struck away by another, struck whole away by others and waiting
    const had = c.of<() => Struck | null>([
      () => null, () => null, () => null, () => null, () => null, () => null, () => null, () => null,
      () => tally(who, [[who, c.of([1 / 4, 1 / 6, 0.5, 2 / 3])]], sc.now - 5000),
      () => tally(who, [[who, c.of([1 / 4, 1 / 3])], [other, c.of([1 / 4, 1 / 6])]], sc.now - 5000),
      () => tally(other, [[other, c.of([1 / 4, 1 / 6, 0.5])]], sc.now - 5000),
      () => tally(other, [[other, c.of([1 / 4, 1 / 3])], [who, c.of([1 / 4, 1 / 6])], ...(c.maybe(0.5) ? [[WHO.find((id) => id !== who && id !== other)!, 1 / 6] as [string, number]] : [])], sc.now - 5000),
      () => tally(other, [[other, c.of([0.9, 5 / 6, 0.99, 0.75])]], sc.now - 5000),
      () => tally(other, [[other, 0.6], [WHO.find((id) => id !== who && id !== other)!, 0.4]], sc.now - 5000),
    ])();
    const s = standing(c, sc, { had, open: c.maybe(0.3), shattered: c.maybe(0.15), gone: c.maybe(0.05) });
    const way: Miner = c.of<Miner>([...Array.from({ length: 30 }, () => ({})), { hand: "other" }, { hand: "none" }, { vein: true }, { vein: true }]);
    const p = anyMiner(sc, c.maybe(0.03) ? null : pick, { ...way, ...(c.maybe(0.1) ? { second: pickAt(c, c.int(0, 10)) } : {}) });
    const d = c.maybe(0.92) ? c.of(NEAR) : c.of(FAR);
    const { go, said } = goOf(sc, s, {
      rock: c.maybe(0.04) ? 999 : sc.rock.id, at: [sc.rock.x + d[0], sc.rock.y + d[1]], swings: c.of([1, 1, 2, 2, 3, 4, 6, 8, 12, 30, 30, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 2.7, 2.7, 0, 0.5, -3]),
      who, points: c.of([0, 0, 300, 700, 2200, 12000]), quake: has(pick, "pkQuake") ? c.maybe(0.6) : c.maybe(0.05),
    });
    const did = mine(p, go);
    add("mine", [p, said, sc.word], shown(did));
    add("stood", [sc.f, go.at[0], go.at[1], sc.f > 0 ? caveLayout(sc.f, sc.day) : null, said.rocks, said.cave, sc.now, said.crystal], stoodOn(sc.f, sc.day, go.at[0], go.at[1], sc.rocks, go.standing));
    if (did.ok && did.done === "theirs") {
      // whoever struck it first is paid, wherever they are and whatever they hold now: a pick in the hand, one in the
      // bag only, none at all; with room and with none; with a vein open already
      const theirs = c.of<Stack | null>([minersPick(c.int(0, 10)), minersPick(10), pickAt(c, 0), null]);
      const first = anyMiner(sc, theirs, { ...c.of<Miner>([{}, {}, {}, { hand: "other" }, { hand: "none" }, { vein: true }]), last: sc.now - 5000 });
      add("pay_first", [first, said, ordered(did.struck), sc.word], shown(payFirst(first, go, did.struck)));
    }
  }
  // (and whoever struck first paid for every sort of rock, by every sort of pick they may have about them)
  for (let i = 0; i < 700; i++) {
    const fate = c.of<Fate>(["any", "stone", "shards", "moss", "way", "vein", "gem", "crystal"]), theirs = c.maybe(0.1) ? null : minersPick(c.of([0, 3, 6, 10, 10]));
    const sc = sceneOf(c, fate, theirs), who = c.of(WHO), other = c.of(WHO.filter((id) => id !== who));
    const whole = tally(other, [[other, c.of([0.5, 2 / 3, 5 / 6])], [who, c.of([0.5, 1 / 3, 1 / 6])]], sc.now - 5000);
    const s = standing(c, sc, { had: whole, open: c.maybe(0.3), shattered: c.maybe(0.1), gone: c.maybe(0.04) });
    const first = anyMiner(sc, theirs, { ...c.of<Miner>([{}, {}, {}, { hand: "other" }, { hand: "none" }, { vein: true }]), last: sc.now - 5000 });
    const { go, said } = goOf(sc, s, { rock: c.maybe(0.03) ? 999 : sc.rock.id, at: [sc.rock.x + 1, sc.rock.y], swings: 1, who, quake: c.maybe(0.2) });
    add("pay_first", [first, said, whole, sc.word], shown(payFirst(first, go, whole)));
  }
  // a look at a rock, with a pick that has pkPeek and with one that has not
  for (let i = 0; i < 400; i++) {
    const pick = c.maybe(0.08) ? null : pickAt(c, c.of([0, 3, 6, 10]), c.maybe(0.3) ? "dark" : null, c.maybe(0.8) ? ["pkPeek"] : ["pkCrumb", "pkLoose"]);
    const fate = c.of<Fate>(["any", "any", "shards", "way", "vein", "crystal"]), sc = sceneOf(c, fate, pick, (fate === "any" || fate === "shards") && c.maybe(0.25));
    const s = standing(c, sc, { open: c.maybe(0.3), shattered: c.maybe(0.2), gone: c.maybe(0.1) }), p = minerOf(sc, pick, { hand: c.maybe(0.9) ? "pick" : "other" });
    const { go, said } = goOf(sc, s, { rock: c.maybe(0.06) ? 999 : sc.rock.id, at: [sc.rock.x, sc.rock.y + 1], swings: 0, who: "m1" });
    add("look", [p, said, sc.word], lookOf(p, go));
  }
  // where a member may be believed to stand: on floor, where a rock stood and stands no longer; never on a rock, in the wall, or off the place
  for (let i = 0; i < 500; i++) {
    const sc = sceneOf(c, "any", null, c.maybe(0.2)), s = standing(c, sc, { gone: c.maybe(0.3), open: c.maybe(0.5) });
    const { go, said } = goOf(sc, s, { at: [0, 0], swings: 1, who: "m1" });
    const k = sc.f > 0 ? cornerOf(sc.f) : { x: 30, y: 225 }, r = c.of(sc.rocks);
    const [x, y] = c.of<[number, number]>([[r.x, r.y], [sc.rock.x, sc.rock.y], [r.x + 1, r.y], [k.x + c.int(-1, 28), k.y + c.int(-1, 28)], [k.x + c.int(0, 27), k.y + c.int(0, 27)], [5, 330]]);
    add("stood", [sc.f, x, y, sc.f > 0 ? caveLayout(sc.f, sc.day) : null, said.rocks, said.cave, sc.now, said.crystal], stoodOn(sc.f, sc.day, x, y, sc.rocks, go.standing));
  }

  /* ── what a go leaves in a place's document ── */
  for (let i = 0; i < 300; i++) {
    const now = c.of(NOWS), word = c.of(WORDS), { s } = caveOf(c, now, word), f = c.int(0, MINING.floors + 1), doc = placeOf(s, f, now, f), st = stateOf(f, doc);
    const way: WayOpen = { rock: c.maybe(0.7) ? c.int(0, 20) : null, x: 70 + c.int(0, 9), y: 330 + c.int(0, 9), by: "m4", name: "Four", at: now };
    add("open_way", [doc, f, way], placeOf(openWay(st, f, way), f, now, f));
    add("crystal_broken", [doc, { by: "m3", name: "Three", at: now }], placeOf(crystalBroken(st, { by: "m3", name: "Three", at: now }), f, now, f));
    // (a light on a tile that has one already, on one that has none, and with one that has burnt out beside it)
    const lit = [...doc.torches, ...doc.moss], x = lit.length && c.maybe(0.5) ? lit[0].x : 75 + c.int(0, 5), y = lit.length && c.maybe(0.5) ? lit[0].y : 335 + c.int(0, 5);
    add("set_torch", [doc, f, x, y, "m2", now], placeOf(setTorch(st, f, x, y, "m2", now), f, now, f));
    add("set_moss", [doc, f, x, y, "m2", now], placeOf(setMoss(st, f, x, y, "m2", now), f, now, f));
  }

  /* ── the lift, a torch, and a floor broken through ── */
  for (let i = 0; i < 300; i++) {
    const kept = mineKept(), p = purseWith([], kept === undefined ? {} : ({ mine: kept } as Partial<Purse>));
    const f = c.of([10, 10, 20, 30, 40, 9, 0, -10, 15]), to = c.of([0, 10, 20, 30, 5, 40, -1]);
    add("reach_rest", [p, f], reachRest(p, f));
    add("lift_stops", [p], liftStops(p));
    add("may_ride", [p, to], mayRide(p, to));
  }
  for (let i = 0; i < 200; i++) {
    const hand = c.of<unknown>(["torch", "torch", "torch", "pick", null, undefined]);
    const p = { ...purseWith([c.maybe(0.8) ? { item: "torch", n: c.int(1, 3) } : null, { item: "pick", n: 1 }, c.maybe(0.3) ? { item: "torch", n: 1 } : null]), ...(hand === undefined ? {} : { hand }) } as Purse;
    add("torch_down", [p], torchDown(p));
  }
  for (let i = 0; i < 400; i++) {
    const now = c.of(NOWS), pick = c.maybe(0.08) ? null : pickAt(c, c.of([0, 6, 10, 10, 10]), null, c.maybe(0.75) ? ["pkDrill"] : ["pkQuake"]), used = c.of([undefined, 0, 1, 2, 3, 5]);
    const p = { ...purseWith([pick]), hand: c.maybe(0.9) ? "pick" : null, ...(used === undefined ? {} : { powers: { pkDrill: { k: c.maybe(0.85) ? dayOf(now) : dayOf(now) - 1, n: used } } }) } as Purse;
    const f = c.of([1, 5, 9, 10, 29, 30, 0, 31, 17]), open = c.maybe(0.25);
    add("drill", [p, f, open, now], drill(p, f, open, now));
  }
  // (the free tile beside one, where a way broken through opens: the code's own search, lib/town/trial's drillDo)
  for (const f of [1, 3, 9, 10, 20, 28]) {
    const day = DAYS[0], layout = caveLayout(f, day), k = cornerOf(f), spots = floorSpots(f, day);
    const tiles: Array<[number, number]> = [spots.up, spots.arrive, [spots.arrive[0] + 1, spots.arrive[1]], [spots.up[0] - 1, spots.up[1]], spots.down, ...Array.from({ length: 30 }, (): [number, number] => [k.x + c.int(-1, 28), k.y + c.int(-1, 28)])];
    for (const [x, y] of tiles) {
      const free = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]): [number, number] => [x + dx, y + dy])
        .find(([u, v]) => floorTile(f, day, u, v) && !(u === spots.up[0] && v === spots.up[1]) && !(u === spots.arrive[0] && v === spots.arrive[1]));
      add("beside", [layout, f, x, y], free ?? null);
    }
  }

  /* ── a vein played out, by what its page says of the go (lib/town/vein-account) ── */
  /** A go played by somebody who strikes any cell that can be struck: its strikes, in their order. */
  const anyGo = (vein: PendingVein): Array<[number, number]> => {
    const face = faceOf(vein.seed, !!vein.gem), strikes: Array<[number, number]> = [];
    let crack = begin(face, vein.mods);
    for (let i = 0; i < 40 && !over(face, crack); i++) {
      const [hx, hy] = headOf(crack), [dx, dy] = c.of([[1, 0], [-1, 0], [0, 1], [0, -1]] as const), far = c.int(1, VEIN.reach), to: [number, number] = [hx + dx * far, hy + dy * far];
      const did = veinStrike(face, vein.mods, crack, to);
      if (did.moved < 0) continue;
      strikes.push(to);
      crack = did.crack;
    }
    return strikes;
  };
  for (let i = 0; i < 1500; i++) {
    const now = c.of(NOWS), gem = c.maybe(0.4) ? c.of(ELEMENTS) : null;
    const pick = c.maybe(0.08) ? null : pickAt(c, c.of([0, 3, 6, 10, 10]), c.maybe(0.35) ? c.of<Element>(["water", "ice"]) : null, c.maybe(0.7) ? ["pkSteady", "pkCutter", "pkTwin"] : []);
    const mods = veinMods(pick, c.maybe(0.3));
    const vein: PendingVein = { f: c.int(1, MINING.floors), rock: c.int(0, 20), turn: turnOf(now), seed: c.int(0, 4294967295), gem, mods, more: gem && c.maybe(0.4) ? 1 : 0, ...(c.maybe(0.15) ? { again: true } : {}) };
    const face = faceOf(vein.seed, !!gem), honest = accountOf(vein, c.of<() => Array<[number, number]>>([() => bestRoute(face, mods).strikes, () => anyGo(vein), () => anyGo(vein), () => []])());
    // what a page may say: the go as it was; and each thing said pushed to the edge of what the rules allow, and past it
    const said = c.maybe(0.5) ? honest : c.of<() => unknown>([
      () => ({ ...honest, strikes: Array.from({ length: mods.strikes }, (_, k) => [k % VEIN.size, 0]), struck: mods.strikes, of: VEIN.points[1], ore: VEIN.points[1] - (gem ? Math.max(1, honest.gems.length) : 0) }),
      () => ({ ...honest, of: c.of([3, 7, 6, 4, 5]) }), () => ({ ...honest, ore: honest.ore + c.int(1, 3) }), () => ({ ...honest, struck: honest.struck + c.int(1, 4) }),
      // (strikes enough were made, and more are said to have counted than a go has: its own, and what a knot may give back)
      () => ({ ...honest, strikes: Array.from({ length: 20 }, (_, k) => [k % VEIN.size, 2]), struck: mods.strikes + mods.back + c.of([0, 1, 1, 3]) }),
      () => ({ ...honest, gems: [...honest.gems, c.int(1, 4)] }), () => ({ ...honest, strikes: Array.from({ length: 6 }, (_, k) => [k, 1]), struck: Math.min(6, mods.strikes), gems: [3, 3], ore: 4, of: 6 }), () => ({ ...honest, gems: [3, 3, 3] }),
      () => ({ ...honest, gems: [c.of([0, 4, 1.5, -1])] }), () => ({ ...honest, struck: 1, ore: 3 }), () => ({ ...honest, strikes: [...honest.strikes, c.of<unknown>([[6, 1], [1, -1], [1.5, 2], [1], "x", null])] }),
      () => ({ ...honest, strikes: Array.from({ length: 70 }, () => [1, 1]) }), () => ({ ...honest, strikes: c.of<unknown>([null, "none", 5]) }),
      () => ({ ...honest, seed: c.of<unknown>([vein.seed + 1, String(vein.seed), null]) }), () => ({ ...honest, again: !honest.again }), () => ({ ...honest, again: c.of<unknown>([honest.again ? 1 : 0, honest.again ? "yes" : "", null]) }),
      () => ({ ...honest, struck: c.of<unknown>(["3", null, 2.5, -1]) }), () => ({ ...honest, gems: c.of<unknown>([null, 2, "3"]) }), () => ({ ...honest, ore: c.of<unknown>([1.5, "2", null]) }), () => ({ ...honest, of: c.of<unknown>(["6", null, 5.5]) }),
      () => null, () => "go", () => [honest], () => ({}), () => 7,
    ])();
    const p = {
      ...purseWith(c.maybe(0.06) ? [pick, ...Array.from({ length: 9 }, (): Stack => ({ item: "boot", n: 1 }))] : [pick]), hand: c.maybe(0.92) ? "pick" : null, handAt: 0,
      ...(c.maybe(0.3) ? { gifts: { had: ["thingSack"], charms: [] } } : {}), ...(c.maybe(0.3) ? { powers: { pkTwin: { k: c.maybe(0.85) ? dayOf(now) : dayOf(now) - 1, n: c.of([0, 2, 4, 5]) } } } : {}),
      mine: { owed: 0, crumb: 2, loose: { k: "", ids: [] }, vein: c.maybe(0.04) ? null : vein, rests: [10], last: now - 9000, paid: null },
    } as Purse;
    add("vein_odd", [vein, [said ?? null]], oddOf(vein, said));
    add("vein_end", [p, [said ?? null], now], veinFrom(p, said, now));
  }
  // (a go of very few strikes, with some given back: no pick there is has so few, but the rule is the rule. Where a
  // strike given back runs one cell fewer than another is seen only here)
  for (let i = 0; i < 240; i++) {
    const mods = { strikes: c.of([1, 1, 2]), back: c.of([0, 1, 2, 4]), cross: 0, spent: false }, vein: PendingVein = { f: 2, rock: 1, turn: 9, seed: 77, gem: null, mods, more: 0 };
    const said = { seed: 77, again: false, strikes: Array.from({ length: 12 }, (_, k) => [k % VEIN.size, 3]), struck: c.int(0, mods.strikes + mods.back + 1), of: c.of([4, 5, 6]), ore: c.int(0, 6), gems: [] };
    add("vein_odd", [vein, [said]], oddOf(vein, said));
  }
  // (and the edges said out, whatever the chance above came to: every cell of a face passed as ore, a cell fewer and
  // two fewer, with no gem's cell, one and two, on a vein that is no gem's and on veins that are, which have a cell
  // at least that is no ore; and one strike more than a go has)
  for (const gem of [null, "fire", "dark"] as Array<Element | null>) for (const cells of [4, 5, 6]) for (const cut of [[], [1], [2, 3]] as number[][]) for (const less of [0, 1, 2]) for (const more of [0, 1]) {
    const mods = { strikes: 6, back: 1, cross: 0, spent: false }, vein: PendingVein = { f: 12, rock: 4, turn: 9, seed: 99, gem, mods, more: gem ? 1 : 0 };
    const said = { seed: 99, again: false, strikes: Array.from({ length: 9 }, (_, k) => [k % VEIN.size, 4]), struck: mods.strikes + mods.back + more, of: cells, ore: cells - less, gems: cut };
    const p = purseWith([{ item: "pick", n: 1 }], { hand: "pick", mine: { owed: 0, crumb: 0, loose: { k: "", ids: [] }, vein, rests: [], last: 0, paid: null } } as Partial<Purse>);
    add("vein_odd", [vein, [said]], oddOf(vein, said));
    add("vein_end", [p, [said], NOWS[0]], veinFrom(p, said, NOWS[0]));
  }

  /* ── the line: what a deed of the miners' counts for (lib/town/line-points) ── */
  const deed = (what: string, thing: string | null, n: number, doc: Record<string, unknown>): Done => ({ from: "deed", what, thing, n, doc });
  for (const done of [
    deed("mine", "stone", 1, { floor: 1, rock: 3, hand: "pick" }), deed("mine", "stone", 1, { floor: 1, rock: 3, got: "shardCopper", shards: 2 }), deed("mine", "stone", 3, { got: "shardIron" }),
    deed("mine", "stone", 0, {}), deed("mine", "stone", 2.7, { got: 5 }), deed("mine", "stone", -4, { got: null }), deed("mine", null, 1, { vein: true }),
    deed("vein", "shardCopper", 4, { floor: 3, passed: 4, of: 5 }), deed("vein", "shardSilver", 2, { chip: "chipRuby", gem: "fire" }), deed("vein", null, 1, { chip: "chipOnyx" }), deed("vein", null, 0, {}),
    deed("vein", "shardIron", 5, { again: true }), deed("vein", "shardIron", 5, { again: true, chip: "chipTopaz" }), deed("vein", "shardIron", 5, { again: false }), deed("vein", "shardIron", 5, { again: 1 }),
    deed("vein", "shardIron", 5, { again: 0 }), deed("vein", "shardIron", 5, { again: "" }), deed("vein", "shardIron", 5, { again: "yes", chip: 7 }), deed("vein", "", 5, { again: null }),
    deed("delve", null, 1, { floor: 4, rock: 9 }), deed("delve", null, 1, { floor: 4, how: "drill", tile: [70, 330] }),
    deed("hew", "stone", 1, { floor: 2, rock: 5, whose: "m2" }), deed("hew", "stone", 1, { whose: "m1" }), deed("hew", "stone", 1, { whose: 3 }), deed("hew", "stone", 1, {}),
    deed("crystal", "stone", 1, { got: "shardSilver", chip: "chipDiamond" }), deed("crystal", "stone", 1, { got: "shardSilver" }), deed("crystal", "stone", 1, { chip: "chipDiamond" }), deed("crystal", "stone", 1, {}),
    deed("lift", null, 10, {}), deed("torch", "torch", 1, { floor: 3, tile: [70, 330] }), deed("vein_odd", null, 0, { said: {} }), deed("net", "ladybird", 1, {}),
  ]) add("counts_of", [done, "m1"], countsOf(done, "m1"));

  /* ── edges of a rock struck, said out whatever the chance above came to (a chance of their own: nothing above moves) ── */
  // the swings' bound: two swings go in a whole hand's time for each after the last strike believed; a millisecond
  // short of that, at the very moment of the last, and BEFORE the last (an older call that waited for a place while
  // a newer one of the same member moved `last` on) they are too soon
  {
    const e = chance(41640), pick: Stack = { item: "pick", n: 1 }, swings = 2;
    for (const foot of [true, false]) {
      const sc = sceneOf(e, "stone", pick, foot), s = standing(e, sc);
      for (const last of [sc.now - swings * MINING.swing.least, sc.now - swings * MINING.swing.least + 1, sc.now - 1, sc.now, sc.now + 1, sc.now + 5000, sc.now + 86_400_000]) {
        const p = minerOf(sc, pick, { last }), { go, said } = goOf(sc, s, { at: [sc.rock.x + 1, sc.rock.y], swings, who: "m1" });
        add("mine", [p, said, sc.word], shown(mine(p, go)));
      }
    }
  }
  // whoever struck first, paid while a vein of their own is open (they began the rock, and opened the vein elsewhere
  // since): a rock that opens none leaves it open, as it was (a plain rock, one with fragments, the way down); one
  // that hides a vein waits for them. Each beside the same with no vein open
  {
    const e = chance(41641), pick: Stack = { item: "pick", n: 1 };
    for (const fate of ["stone", "shards", "way", "vein"] as Fate[]) for (const open of [true, false]) {
      const sc = sceneOf(e, fate, pick), whole = tally("m2", [["m1", 0.5], ["m2", 0.5]], sc.now - 5000), s = standing(e, sc, { had: whole });
      const first = minerOf(sc, pick, { vein: open, last: sc.now - 5000 }), { go, said } = goOf(sc, s, { at: [sc.rock.x + 1, sc.rock.y], swings: 1, who: "m1" });
      add("pay_first", [first, said, whole, sc.word], shown(payFirst(first, go, whole)));
    }
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
    // a rock struck: every refusal there is, and every way a go comes out
    interface Went { ok: boolean; why?: string; done?: boolean | "theirs"; vein?: { gem: string | null; more: number } | null; way?: number | null; crystal?: boolean; chained?: number | null; moss?: number[]; broke?: number[]; cost?: number; loose?: number[]; got?: Array<[string, number]>; purse?: Purse }
    const goes = of("mine").map((v) => v.want as Went), broke = goes.filter((g) => g.done === true);
    expect(new Set(goes.filter((g) => !g.ok).map((g) => g.why))).toEqual(new Set(["tool", "vein", "none", "gone", "far", "weak", "spent", "more", "soon", "full"]));
    // (no go is believed whose moment is not after the last strike believed; of the edges said out, the first is believed and the six after it are too soon, on the foot and in the cave)
    const stale = of("mine").filter((v) => ((v.args[0] as Purse).mine as { last: number }).last >= (v.args[1] as { now: number }).now);
    expect(stale.length).toBeGreaterThan(100);
    expect(stale.every((v) => (v.want as Went).ok === false) && stale.filter((v) => (v.want as Went).why === "soon").length > 50).toBe(true);
    expect(of("mine").slice(-14).map((v) => (v.want as Went).why ?? "in")).toEqual([...Array.from({ length: 2 }, () => ["in", "soon", "soon", "soon", "soon", "soon", "soon"])].flat());
    expect(goes.filter((g) => g.done === false).length).toBeGreaterThan(150);
    expect(goes.filter((g) => g.done === "theirs").length).toBeGreaterThan(60);
    expect(broke.length).toBeGreaterThan(500);
    expect(broke.some((g) => g.vein && !g.vein.gem) && broke.some((g) => g.vein?.gem) && broke.some((g) => g.vein && g.vein.more > 0) && broke.some((g) => g.way !== null) && broke.some((g) => g.crystal)).toBe(true);
    expect(broke.some((g) => g.chained !== null) && broke.some((g) => g.moss!.length > 0) && broke.some((g) => g.broke!.length > 2) && broke.some((g) => g.loose!.length > 0)).toBe(true);
    expect(broke.some((g) => g.cost === 0) && broke.some((g) => g.cost === 1) && broke.some((g) => g.cost! > 1) && broke.some((g) => (g.purse!.mine as { owed: number }).owed > 0)).toBe(true);
    expect(broke.some((g) => g.got!.some(([id, n]) => id === "shardSilver" && n >= MINING.crystal.shards)) && broke.some((g) => g.got!.some(([id]) => id.startsWith("chip")))).toBe(true);
    const firsts = of("pay_first").map((v) => v.want as Went);
    expect(new Set(firsts.filter((g) => !g.ok).map((g) => g.why))).toEqual(new Set(["none", "gone", "vein", "full"]));
    expect(firsts.filter((g) => g.ok).length).toBeGreaterThan(300);
    // (whoever is paid with a vein of their own open has it open still, to the letter: a rock that would open another is refused them; of the edges said out, three rocks that open none, then one that hides a vein)
    const veinIn = (p: unknown) => ((p as Purse).mine as { vein: { rock: number } | null }).vein;
    const held = of("pay_first").filter((v) => veinIn(v.args[0]) && (v.want as Went).ok);
    expect(held.length).toBeGreaterThan(30);
    expect(held.every((v) => JSON.stringify(veinIn((v.want as Went).purse)) === JSON.stringify(veinIn(v.args[0])) && (v.want as Went).vein === null)).toBe(true);
    const edges = of("pay_first").slice(-8).map((v) => { const w = v.want as Went; return w.ok ? veinIn(w.purse)?.rock ?? null : w.why; });
    expect(edges.slice(0, 7)).toEqual([99, null, 99, null, 99, null, "vein"]);
    expect(typeof edges[7] === "number" && edges[7] !== 99).toBe(true);
    expect(firsts.some((g) => g.vein) && firsts.some((g) => g.way !== null && g.ok) && firsts.some((g) => g.crystal) && firsts.every((g) => !g.ok || (g.purse!.mine as { paid: unknown }).paid !== null)).toBe(true);
    expect(new Set(of("look").map((v) => (v.want as { why?: string; peek?: string }).why ?? (v.want as { peek: string }).peek))).toEqual(new Set(["tool", "none", "gone", "stone", "shards", "vein"]));
    expect(of("stood").filter((v) => v.want === false).length).toBeGreaterThan(100);
    expect(of("stood").some((v) => v.want === true && (v.args[4] as Laid[]).some((r) => r[1] === v.args[1] && r[2] === v.args[2]))).toBe(true);
    // the lift, a torch, a floor broken through
    expect(of("reach_rest").filter((v) => JSON.stringify(v.want) !== JSON.stringify(v.args[0])).length).toBeGreaterThan(20);
    expect(of("may_ride").some((v) => v.want === true && v.args[1] !== 0) && of("may_ride").some((v) => v.want === false)).toBe(true);
    expect(new Set(of("torch_down").map((v) => (v.want as { why?: string }).why ?? "ok"))).toEqual(new Set(["tool", "ok"]));
    expect(new Set(of("drill").map((v) => (v.want as { why?: string }).why ?? "ok"))).toEqual(new Set(["tool", "none", "open", "spent", "ok"]));
    expect(of("beside").some((v) => v.want === null) && of("beside").filter((v) => v.want !== null).length > 50).toBe(true);
    // a vein played out: every way an account is odd, and every way a go ends
    expect(new Set(of("vein_odd").map((v) => v.want))).toEqual(new Set([null, "shape", "strikes", "of", "struck", "gems", "passed", "far"]));
    expect(of("vein_odd").filter((v) => v.want === null).length).toBeGreaterThan(500);
    const ends = of("vein_end").map((v) => v.want as { ok: boolean; why?: string; again?: boolean; got?: Array<[string, number]> });
    expect(new Set(ends.filter((e) => !e.ok).map((e) => e.why))).toEqual(new Set(["none", "odd", "full"]));
    expect(ends.filter((e) => e.ok).length > 500 && ends.some((e) => e.again) && ends.some((e) => e.got?.some(([id]) => id.startsWith("chip"))) && ends.some((e) => e.ok && e.got!.length === 0)).toBe(true);
    // the line: every deed of the miners' that counts, the twin's go that counts for its firsts alone, and those that count for nothing
    const counts = of("counts_of").map((v) => v.want as Array<{ line: string; raw: number; first?: string }>);
    expect(counts.filter((k) => k.length === 0).length).toBeGreaterThan(5);
    expect(counts.some((k) => k.length === 2 && k[1].line === "helpers") && counts.some((k) => k.length === 2 && k[0].raw === 0 && !!k[1].first) && counts.some((k) => k[0]?.raw === 10) && counts.some((k) => k[0]?.raw === 5) && counts.some((k) => k[0]?.raw === 3 && !k[0].first)).toBe(true);

    const dir = process.env.TOWN_VECTORS;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/vectors-mining.json`, JSON.stringify(all));
      writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf()));
    }
  }, 240_000);
});
