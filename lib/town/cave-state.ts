import { CAVE_SIZE, caveFloor, isRest } from "./cave";
import { MINING, partOf, struckOf, turnOf, type Paid, type PendingVein, type RockAt, type Struck } from "./mining";
import { dayOf } from "./stamina";

/**
 * What the whole village shares of the mountain's rocks and the cave (the owner, 2026-10-08: a rock struck is gone
 * for everybody and comes back by the clock; a way down found by anybody is open to everybody until 05:00). Kept by
 * whoever keeps the game: one of these for the village. A member's own (the resting floors reached, a vein opened)
 * is in their purse (lib/town/mining's MineKept).
 *
 * Pure: every function is given the moment, and gives back a new state. The cave's day is the stamina's: it turns at
 * 05:00 in Bangkok.
 */

/** A way down that is open: under which rock it was found (none: it was broken through), its tile, who opened it and when. */
export interface WayOpen { rock: number | null; x: number; y: number; by: string; name: string; at: number }
/** A torch set down: on which floor, on which tile, until when it burns, and whose it was. */
export interface Torch { f: number; x: number; y: number; until: number; by: string }
/** Who did something the village's board tells of, and when. */
export interface ByWhom { by: string; name: string; at: number }
export interface CaveState {
  /** The day this is the cave of: the ways, the crystal and the deepest floor are that day's. */
  day: number;
  /** The ways down that are open, by the floor they lead down from. */
  ways: Record<string, WayOpen>;
  /** The rocks broken, by place (0 is the mountain's foot): in which turn, and which. */
  broken: Record<string, { turn: number; ids: number[] }>;
  /** The rocks being broken, by place: in which turn, and of each (by its number) who struck it first and how much of it each member has struck away (lib/town/mining's Struck). */
  struck: Record<string, { turn: number; rocks: Record<string, Struck> }>;
  /** Who broke the day's crystal rock, once somebody has. */
  crystal: ByWhom | null;
  /** The deepest floor the village has opened the way to today, and who opened it. */
  deepest: (ByWhom & { floor: number }) | null;
  /** The torches that burn. */
  torches: Torch[];
}

/** The cave's day a moment is in: it turns at 05:00 in Bangkok, as the stamina's does. */
export const caveDay = (now: number): number => dayOf(now);
export const newCave = (day: number): CaveState => ({ day, ways: {}, broken: {}, struck: {}, crystal: null, deepest: null, torches: [] });
const isBy = (v: unknown): v is ByWhom => !!v && typeof v === "object" && typeof (v as ByWhom).by === "string" && typeof (v as ByWhom).name === "string" && typeof (v as ByWhom).at === "number";
/** A state as it is kept, made sound, and as it is at a moment: a new day has no way open, its crystal whole and nothing reached; a torch burnt out is gone; rocks of a turn gone by are back, whole. */
export function caveAt(kept: unknown, now: number): CaveState {
  const k = (kept && typeof kept === "object" ? kept : {}) as Partial<CaveState>, day = caveDay(now), turn = turnOf(now), same = k.day === day;
  const ways: CaveState["ways"] = {}, broken: CaveState["broken"] = {}, struck: CaveState["struck"] = {};
  if (same && k.ways && typeof k.ways === "object") {
    for (const [f, w] of Object.entries(k.ways)) {
      if (!w || !isBy(w) || !Number.isInteger(w.x) || !Number.isInteger(w.y)) continue;
      ways[String(Number(f))] = { rock: Number.isInteger(w.rock) ? w.rock : null, x: w.x, y: w.y, by: w.by, name: w.name, at: w.at };
    }
  }
  if (k.broken && typeof k.broken === "object") {
    for (const [f, b] of Object.entries(k.broken)) if (b && b.turn === turn && Array.isArray(b.ids)) broken[String(Number(f))] = { turn, ids: [...new Set(b.ids.filter((n) => Number.isInteger(n)))] };
  }
  if (k.struck && typeof k.struck === "object") {
    for (const [f, b] of Object.entries(k.struck)) {
      if (!b || b.turn !== turn || !b.rocks || typeof b.rocks !== "object") continue;
      const rocks: Record<string, Struck> = {};
      for (const [id, s] of Object.entries(b.rocks)) { const sound = struckOf(s); if (sound && Number.isInteger(Number(id))) rocks[String(Number(id))] = sound; }
      if (Object.keys(rocks).length) struck[String(Number(f))] = { turn, rocks };
    }
  }
  const deepest = same && isBy(k.deepest) && Number.isInteger(k.deepest.floor) ? { floor: k.deepest.floor, by: k.deepest.by, name: k.deepest.name, at: k.deepest.at } : null;
  const torches = (Array.isArray(k.torches) ? k.torches : []).filter((t) => t && Number.isInteger(t.f) && Number.isInteger(t.x) && Number.isInteger(t.y) && typeof t.until === "number" && t.until > now && typeof t.by === "string")
    .map((t) => ({ f: t.f, x: t.x, y: t.y, until: t.until, by: t.by }));
  return { day, ways, broken, struck, crystal: same && isBy(k.crystal) ? { by: k.crystal.by, name: k.crystal.name, at: k.crystal.at } : null, deepest, torches };
}

/** The rocks of a place that are gone at a moment: those broken this turn, and the one the open way down was found under. */
export function goneAt(state: CaveState, floor: number, now: number): number[] {
  const b = state.broken[String(floor)], ids = b && b.turn === turnOf(now) ? [...b.ids] : [], way = state.ways[String(floor)];
  if (way && way.rock !== null && !ids.includes(way.rock)) ids.push(way.rock);
  return ids;
}
/** Whether a rock of a place stands at a moment. `crystal`: the day's crystal rock if it is this place's; once broken it is gone for the day. */
export const stands = (state: CaveState, floor: number, rock: number, now: number, crystal: number | null = null): boolean =>
  !goneAt(state, floor, now).includes(rock) && !(state.crystal && crystal === rock);
/** Some rocks of a place broken: what was struck away of them is no more to be kept. */
export function breakRocks(state: CaveState, floor: number, ids: readonly number[], now: number): CaveState {
  const turn = turnOf(now), b = state.broken[String(floor)], had = b && b.turn === turn ? b.ids : [], s = state.struck?.[String(floor)];
  const struck = s && s.turn === turn ? { ...state.struck, [String(floor)]: { turn, rocks: Object.fromEntries(Object.entries(s.rocks).filter(([id]) => !ids.includes(Number(id)))) } } : state.struck;
  return { ...state, broken: { ...state.broken, [String(floor)]: { turn, ids: [...new Set([...had, ...ids])] } }, struck };
}
/** What has been struck away of a rock of a place at a moment, and by whom: null when nobody has struck it this turn. */
export function struckAt(state: CaveState, floor: number, rock: number, now: number): Struck | null {
  const s = state.struck?.[String(floor)];
  return s && s.turn === turnOf(now) ? s.rocks[String(rock)] ?? null : null;
}
/** A rock of a place as it is struck now (lib/town/mining's `mine` gives the tally after a go). */
export function strikeRock(state: CaveState, floor: number, rock: number, struck: Struck, now: number): CaveState {
  const turn = turnOf(now), s = state.struck?.[String(floor)], had = s && s.turn === turn ? s.rocks : {};
  return { ...state, struck: { ...state.struck, [String(floor)]: { turn, rocks: { ...had, [String(rock)]: struck } } } };
}
/** What a member is told of the rocks of a place that are being broken: how much of each is struck away, how much of that by them, who struck it first (their name), and whether that was the member. */
export interface StruckTold { part: number; own: number; by: string; mine: boolean }
export function struckTold(state: CaveState, floor: number, who: string, now: number): Record<string, StruckTold> {
  const s = state.struck?.[String(floor)];
  if (!s || s.turn !== turnOf(now)) return {};
  return Object.fromEntries(Object.entries(s.rocks).map(([id, r]) => [id, { part: partOf(r), own: Math.min(1, r.by[who] ?? 0), by: r.name, mine: r.first === who }]));
}
/** Whether a floor's way down is open: a resting floor's always is; another's once it has been found or broken through that day. Never below the last floor. */
export const wayOpen = (state: CaveState, floor: number): boolean => floor >= 1 && floor < MINING.floors && (isRest(floor) || !!state.ways[String(floor)]);
/** A floor's way down opened: it stays so for the day; and the floor under it is the deepest the village has reached, if it is. */
export function openWay(state: CaveState, floor: number, way: WayOpen): CaveState {
  if (state.ways[String(floor)] || floor < 1 || floor >= MINING.floors) return state;
  const reached = floor + 1;
  const deepest = !state.deepest || reached > state.deepest.floor ? { floor: reached, by: way.by, name: way.name, at: way.at } : state.deepest;
  return { ...state, ways: { ...state.ways, [String(floor)]: way }, deepest };
}
/** The day's crystal rock broken. */
export const crystalBroken = (state: CaveState, who: ByWhom): CaveState => (state.crystal ? state : { ...state, crystal: who });
/** A torch set down: it burns from now, for everybody. One to a tile: a new one there burns anew. */
export function setTorch(state: CaveState, floor: number, x: number, y: number, by: string, now: number): CaveState {
  return { ...state, torches: [...state.torches.filter((t) => t.until > now && !(t.f === floor && t.x === x && t.y === y)), { f: floor, x, y, until: now + MINING.light.burns, by }] };
}
export const torchesAt = (state: CaveState, floor: number, now: number): Torch[] => state.torches.filter((t) => t.f === floor && t.until > now);
/** What the village's board tells: the deepest floor reached today and who opened the way to it; nothing, before anybody has. */
export const boardOf = (state: CaveState): { floor: number; by: string; name: string; at: number } | null => (state.deepest ? { ...state.deepest } : null);
/** When what a page was told of the cave next changes by itself: the rocks' next turn, or the first torch to burn out. */
export const changesAt = (state: CaveState, now: number): number => Math.min((turnOf(now) + 1) * MINING.turn, ...state.torches.filter((t) => t.until > now).map((t) => t.until));

/**
 * What a member is told of the cave by whoever keeps the game: what the village shares (the rocks gone by place, the
 * ways down open with where each is, the torches burning, the deepest floor reached today), and their own (the
 * lift's stops, a vein opened and not played out, the rocks loosened for them, the rocks that glint for them on the
 * floor they are on, and the day's crystal rock where they may know of it). Never what a rock holds.
 *
 * And of the place they are in (the floor they said, 0 the mountain's foot): the rocks that are being broken, each
 * with how much of it is struck away and who began it; and the last rock of their own that somebody else broke for
 * them.
 */
export interface CaveTold {
  day: number; turn: number;
  /** When this next changes by itself: a page asks again then. */
  again: number;
  gone: Record<string, number[]>;
  ways: Record<string, { x: number; y: number; rock: number | null; name: string }>;
  torches: Torch[];
  deepest: { floor: number; by: string; name: string; at: number } | null;
  rests: number[];
  vein: PendingVein | null;
  loose: { floor: number; ids: number[] } | null;
  glints: number[];
  /** The day's crystal rock while it stands: its floor and its number to whoever is on that floor; its floor alone to a pick that knows it. */
  crystal: { floor: number; rock: number | null } | null;
  /** The place I said I am in (a floor of the cave; 0, the mountain's foot), and its rocks that are being broken, by their number. (Missing from a keeper older than several picks on one rock.) */
  place?: number;
  struck?: Record<string, StruckTold>;
  /** The last rock I struck first that somebody else broke for me. */
  paid?: Paid | null;
}

/* ── where things are, in the world's tiles ─────────────────────────────── */

/** Where the cave's floors lie in the world (lib/town/world's CAVE, said here so that the rules need nothing of the map's): the first floor's corner, how many to a row, and how far apart. */
export const CAVE_AT = { x: 0, y: 320, across: 4, apart: 64 };
export const cornerOf = (floor: number): { x: number; y: number } => ({ x: CAVE_AT.x + ((floor - 1) % CAVE_AT.across) * CAVE_AT.apart, y: CAVE_AT.y + Math.floor((floor - 1) / CAVE_AT.across) * CAVE_AT.apart });
/** Which floor of the cave a tile of the world is on (0: none). */
export function floorAtTile(x: number, y: number): number {
  if (x < CAVE_AT.x || y < CAVE_AT.y) return 0;
  const col = Math.floor((x - CAVE_AT.x) / CAVE_AT.apart), row = Math.floor((y - CAVE_AT.y) / CAVE_AT.apart);
  if (col >= CAVE_AT.across || x - CAVE_AT.x - col * CAVE_AT.apart >= CAVE_SIZE || y - CAVE_AT.y - row * CAVE_AT.apart >= CAVE_SIZE) return 0;
  const n = row * CAVE_AT.across + col + 1;
  return n <= MINING.floors ? n : 0;
}
/** A floor's rocks as they are laid on a day, in the world's tiles (none on a resting floor). */
export function floorRocks(floor: number, day: number): RockAt[] {
  if (floor < 1 || floor > MINING.floors) return [];
  const c = cornerOf(floor);
  return caveFloor(floor, day).rocks.map((r) => ({ id: r.id, x: c.x + r.u, y: c.y + r.v, look: r.look }));
}
/** Whether a tile of the world is floor of a floor of the cave that somebody may stand on, with nothing standing on it. */
export function floorTile(floor: number, day: number, x: number, y: number): boolean {
  if (floor < 1 || floor > MINING.floors) return false;
  const c = cornerOf(floor), u = x - c.x, v = y - c.y;
  return u >= 0 && v >= 0 && u < CAVE_SIZE && v < CAVE_SIZE && caveFloor(floor, day).open[v * CAVE_SIZE + u] === 1;
}
/** Where a floor's things are on a day, in the world's tiles: the ladder come down by, where one stands on arriving, the layout's own ladder down, and a resting floor's lift with the tile one takes it from. */
export function floorSpots(floor: number, day: number): { up: [number, number]; arrive: [number, number]; down: [number, number]; lift?: [number, number]; liftAt?: [number, number] } {
  const f = caveFloor(floor, day), c = cornerOf(floor), at = ([u, v]: readonly [number, number]): [number, number] => [c.x + u, c.y + v];
  return { up: at(f.up), arrive: at(f.arrive), down: at(f.down), ...(f.rest ? { lift: at(f.rest.lift), liftAt: at([f.rest.lift[0] + 1, f.rest.lift[1] + 1]) } : {}) };
}
