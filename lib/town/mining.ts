import { depthOf, isRest } from "./cave";
import { roll } from "./farm";
import { harderFor, wearing } from "./gifts";
import type { ItemId } from "./items";
import { stowAll } from "./pouches";
import { mayPower, usePower } from "./powers";
import { eased, isSpent, spend, staminaOf } from "./stamina";
import { ELEMENTS, GEMS, GEM_FX, ORES, gemBy, has, levelOf, optN, pickSwings, toolKindOf, type Element } from "./tools";
import { handOf, heldStack, held, take, type Purse, type Stack } from "./trade";
import { VEIN, faceOf, play, veinMods, yieldOf, type Cell, type VeinMods } from "./vein";

/**
 * Mining, as rules (the owner, 2026-10-08: a mountain's foot and a cave, very dark; rocks are found and dug; digging
 * may give special ore or the way down). The maps are lib/town/world's and lib/town/cave's; what a pick carries is
 * lib/town/tools'; what the whole village shares of the cave is lib/town/cave-state's; a vein's game is lib/town/vein's.
 *
 * - **A rock is struck on the map**: a pick in the hand, a rock within reach, so many swings. What it holds is rolled
 *   from the place, the rock, the turn, the day and a word only whoever keeps the game knows (`salt`: the code is
 *   public), and is never told before it breaks.
 * - **A rock broken is gone for everybody** and back at the next turn. One rock a floor hides the way down: found by
 *   anybody, it is open to everybody until the day turns.
 * - **With no stamina it is harder and never refused.**
 *
 * Pure, like the rest: every function is given the moment and what it needs, and gives back new things. Every number
 * is a knob, and they are all here.
 */
const MINUTE = 60_000;
export const MINING = {
  /** Rocks come back by the clock: a turn lasts so long, the same for every rock (the day's turn at 05:00 Bangkok is a turn's edge). */
  turn: 20 * MINUTE,
  /** The deepest floor there is. */
  floors: 30,
  /** From how many tiles off a rock is struck (a king's move). */
  reach: 1,
  /** How hard a rock is: on the mountain's foot, and in each of the cave's three depths. */
  hardness: { foot: 12, depth: [12, 18, 24] as readonly number[] },
  /** From which floor a line's better rocks are harder for the skilled (lib/town/gifts' HARDER). */
  harderFrom: 11,
  /** The stamina a rock costs, whatever the swings. */
  stamina: 1,
  /** With no stamina a rock takes so many times the swings. */
  tired: 2,
  /** Every rock leaves so much stone. */
  stone: 1,
  /** On the mountain's foot: how likely a rock leaves fragments too, and how many (least, most). */
  foot: { shard: 0.2, n: [1, 1] as [number, number] },
  /** In the cave: the same; how likely a rock hides a vein, and a vein is a gem's. */
  cave: { shard: 0.4, n: [1, 2] as [number, number], vein: 0.08, gem: 0.25 },
  /** Light and dark are a floor's element so many times as often as each of the other six. */
  rare: 0.5,
  /** Rocks so near each other "touch" (a king's move of so many tiles): for a rock loosened, and for one that breaks with its neighbour. */
  touch: 2,
  /** The crystal rock: on which floors it may stand, the plus a pick needs, and what it leaves (fragments of silver, and of the floor's gem). */
  crystal: { floors: [28, 30] as [number, number], plus: 10, shards: 20, chips: 5 },
  /** A swing on the page takes so long (milliseconds), and whoever keeps the game believes none quicker than `least`. */
  swing: { ms: 320, least: 180 },
  /** How far a member sees in the cave, in tiles: with nothing, holding a glowing mushroom, wearing the miner's lamp; a torch set down, and how long it burns. */
  light: { walker: 2, mushroom: 3, lamp: 4, torch: 4, burns: 5 * MINUTE },
  /** What is held as a weak light, and what is set down as a strong one. */
  mushroom: "glowMushroom" as ItemId, torch: "torch" as ItemId,
};

/* ── when ───────────────────────────────────────────────────────────────── */

/** The turn a moment is in. */
export const turnOf = (now: number): number => Math.floor(now / MINING.turn);
export const turnStart = (turn: number): number => turn * MINING.turn;
/** When the rocks that stand no longer are next back. */
export const nextTurnAt = (now: number): number => turnStart(turnOf(now) + 1);

/* ── what a place is ────────────────────────────────────────────────────── */

/** A rock as it is laid: its number in its place, its tile, and its look (3 has crystals in it). `floor` 0 is the mountain's foot. */
export interface RockAt { id: number; x: number; y: number; look?: number }
/** How hard a place's rocks are, for somebody with so many points on the mining line. */
export function hardnessOf(floor: number, points = 0): number {
  if (floor <= 0) return MINING.hardness.foot;
  return MINING.hardness.depth[depthOf(floor)] * (floor >= MINING.harderFrom ? harderFor("mining", points) : 1);
}
/** The ore a place's rocks leave fragments of: copper on the mountain's foot and the cave's first depth, iron in the second, silver in the third. */
export const oreOf = (floor: number): ItemId => ORES[floor <= 0 ? 0 : depthOf(floor)].shard;
/** A floor's element of the day: light and dark half as likely as the other six. */
export function elementOf(salt: string, floor: number, day: number): Element {
  const weight = (e: Element) => (e === "light" || e === "dark" ? MINING.rare : 1);
  let left = roll(`${salt}:element`, floor, day) * ELEMENTS.reduce((t, e) => t + weight(e), 0);
  return ELEMENTS.find((e) => (left -= weight(e)) < 0) ?? ELEMENTS[0];
}
/** Whether a floor has rocks to break and a way down to find under one: every floor of the cave but the resting ones. */
export const isDug = (floor: number): boolean => floor >= 1 && floor <= MINING.floors && !isRest(floor);
/** Whether there is a floor under a floor. */
export const hasBelow = (floor: number): boolean => floor >= 1 && floor < MINING.floors;

/** Where the day's crystal rock stands: the floor and the rock. `rocksOf` gives a floor's rocks as they are laid that day. Null when no floor it may stand on has a rock. */
export function crystalOf(salt: string, day: number, rocksOf: (floor: number) => readonly RockAt[]): { floor: number; rock: number } | null {
  const floors: number[] = [];
  for (let f = MINING.crystal.floors[0]; f <= MINING.crystal.floors[1]; f++) if (isDug(f) && rocksOf(f).length) floors.push(f);
  if (!floors.length) return null;
  const floor = floors[Math.floor(roll(`${salt}:crystal`, day) * floors.length)], all = rocksOf(floor), crystals = all.filter((r) => r.look === 3), of = crystals.length ? crystals : all;
  return { floor, rock: of[Math.floor(roll(`${salt}:crystal:rock`, day) * of.length)].id };
}
/** The rock of a floor that hides the way down that day (never the crystal rock): null on a floor with none to find. */
export function wayRockOf(salt: string, floor: number, day: number, rocks: readonly RockAt[], crystal: number | null = null): number | null {
  if (!isDug(floor) || !hasBelow(floor)) return null;
  const of = rocks.filter((r) => r.id !== crystal);
  return of.length ? of[Math.floor(roll(`${salt}:way`, floor, day) * of.length)].id : null;
}

/** What a rock holds: plain stone with so many fragments (often none), a vein (a gem's or not, with the seed its face is made of), the way down, or the day's crystal. */
export type Holds =
  | { kind: "stone"; shards: number }
  | { kind: "vein"; gem: boolean; seed: number }
  | { kind: "way"; shards: number }
  | { kind: "crystal" };
/** What is known of a place on a day, for the rolls: which rock hides the way (null once it is open, or where there is none), and which is the crystal rock (null where it is not, or once it is broken). */
export interface PlaceToday { way: number | null; crystal: number | null }
/**
 * What a rock holds in a turn, for whoever strikes it with some pick (a pick may make veins likelier). On the
 * mountain's foot (`floor` 0) there are no veins and no way down.
 */
export function holdsOf(salt: string, floor: number, rock: number, turn: number, today: PlaceToday, pick: Stack | null | undefined = null): Holds {
  if (floor > 0 && today.crystal === rock) return { kind: "crystal" };
  const odds = floor > 0 ? MINING.cave : MINING.foot;
  const shards = roll(`${salt}:ore`, floor, rock, turn) < odds.shard ? odds.n[0] + Math.floor(roll(`${salt}:n`, floor, rock, turn) * (odds.n[1] - odds.n[0] + 1)) : 0;
  if (floor > 0 && today.way === rock) return { kind: "way", shards };
  if (floor > 0 && roll(`${salt}:vein`, floor, rock, turn) < MINING.cave.vein * gemBy(pick, "dark", GEM_FX.dark.pick.veins, 1)) {
    return { kind: "vein", gem: roll(`${salt}:gem`, floor, rock, turn) < MINING.cave.gem, seed: Math.floor(roll(`${salt}:face`, floor, rock, turn) * 4294967296) };
  }
  return { kind: "stone", shards };
}
/** What a peek says of a rock: stone, fragments, or a vein. (The way down and the crystal are no peek's to tell: each says what it would hold besides.) */
export type Peek = "stone" | "shards" | "vein";
export const peekOf = (h: Holds): Peek => (h.kind === "vein" ? "vein" : h.kind !== "crystal" && h.shards > 0 ? "shards" : "stone");

/* ── a member's own ─────────────────────────────────────────────────────── */

/** A vein opened and not yet played out: where its rock stood, the seed of its face, the gem it is of (or none), what it is played with, and whether this is its second go. */
export interface PendingVein { f: number; rock: number; turn: number; seed: number; gem: Element | null; mods: VeinMods; more: number; again?: boolean }
/** What a member keeps of the mine, in their purse (`mine`). */
export interface MineKept {
  /** Stamina still to pay, under a point (an earth gem's share is kept exact over time, as the gloves' was). */
  owed: number;
  /** Plain rocks broken since the last crumb. */
  crumb: number;
  /** The rocks loosened for them, of one place in one turn (`k` is "<floor>:<turn>"). */
  loose: { k: string; ids: number[] };
  vein: PendingVein | null;
  /** The resting floors reached: the lift's stops. */
  rests: number[];
  /** When a rock was last broken. */
  last: number;
}
const isCell = (c: unknown): c is Cell => Array.isArray(c) && c.length === 2 && Number.isInteger(c[0]) && Number.isInteger(c[1]);
function veinOf(v: unknown): PendingVein | null {
  const p = v as Partial<PendingVein> | null, m = p?.mods as Partial<VeinMods> | undefined;
  if (!p || typeof p !== "object" || !Number.isInteger(p.f) || !Number.isInteger(p.rock) || !Number.isInteger(p.turn) || typeof p.seed !== "number" || !m || !Number.isInteger(m.strikes)) return null;
  return {
    f: p.f!, rock: p.rock!, turn: p.turn!, seed: p.seed, gem: ELEMENTS.find((e) => e === p.gem) ?? null,
    mods: { strikes: Math.max(1, m.strikes!), back: Math.max(0, Math.floor(Number(m.back) || 0)), cross: Math.max(0, Math.floor(Number(m.cross) || 0)), spent: !!m.spent },
    more: Math.max(0, Math.floor(Number(p.more) || 0)), ...(p.again ? { again: true } : {}),
  };
}
/** What a purse keeps of the mine, made sound. */
export function mineOf(purse: Pick<Purse, "mine">): MineKept {
  const k = purse.mine && typeof purse.mine === "object" ? purse.mine : {};
  const loose = k.loose && typeof k.loose.k === "string" && Array.isArray(k.loose.ids) ? { k: k.loose.k, ids: k.loose.ids.filter((n) => Number.isInteger(n)) } : { k: "", ids: [] };
  return {
    owed: typeof k.owed === "number" && k.owed > 0 && k.owed < 1 ? k.owed : 0,
    crumb: Number.isInteger(k.crumb) && k.crumb! > 0 ? k.crumb! : 0,
    loose, vein: veinOf(k.vein),
    rests: [...new Set((Array.isArray(k.rests) ? k.rests : []).filter((n) => Number.isInteger(n) && isRest(n) && n <= MINING.floors))].sort((a, b) => a - b),
    last: typeof k.last === "number" && Number.isFinite(k.last) ? k.last : 0,
  };
}
/** The pick in the hand: null when what is held is no pick. */
export const pickOf = (purse: Purse): Stack | null => { const s = heldStack(purse); return s && toolKindOf(s.item) === "pick" ? s : null; };
/** Whether a rock is loosened for somebody in a place and a turn. */
export const isLoose = (purse: Pick<Purse, "mine">, floor: number, turn: number, rock: number): boolean => { const l = mineOf(purse).loose; return l.k === `${floor}:${turn}` && l.ids.includes(rock); };
/**
 * How many swings a rock takes: the pick's own (lib/town/tools: its power, its fire, its dark), twice with no
 * stamina, one fewer for a rock loosened. Never under one.
 */
export function swingsFor(pick: Stack | null | undefined, floor: number, spent: boolean, loose = false, points = 0): number {
  const plain = pickSwings(pick, hardnessOf(floor, points)) * (spent ? MINING.tired : 1);
  return Math.max(1, plain - (loose ? optN("pkLoose", "fewer") : 0));
}
/** Whether a tile (or the tile a point is in) is within a king's move of so many tiles of a rock's. */
export const near = (a: readonly [number, number] | { x: number; y: number }, b: { x: number; y: number }, by: number): boolean => {
  const x = "x" in a ? a.x : a[0], y = "y" in a ? a.y : a[1];
  return Math.max(Math.abs(Math.floor(x) - b.x), Math.abs(Math.floor(y) - b.y)) <= by;
};
/** How far somebody's own light reaches in the cave: the lamp worn, a glowing mushroom held, or a walker's own. */
export const lightOf = (purse: Purse): number => (wearing(purse, "charmMinerLamp") ? MINING.light.lamp : handOf(purse) === MINING.mushroom ? MINING.light.mushroom : MINING.light.walker);

/* ── a rock struck ──────────────────────────────────────────────────────── */

export type MineRefusal =
  | "tool"   // no pick in the hand
  | "none"   // no such rock, or no such place
  | "gone"   // it stands no longer this turn
  | "far"    // out of reach
  | "more"   // it takes more swings than that
  | "weak"   // this pick will not bite (the crystal rock)
  | "full"   // no room for what it leaves
  | "soon"   // quicker than a hand swings
  | "vein"   // a vein is open and not played out
  | "spent"  // a counted power has no time left in its stretch
  | "open"   // the way down is open already
  | "here";  // nothing can be opened or set down on this tile
/** What a go is, as whoever keeps the game has it. */
export interface Go {
  now: number;
  /** 0: the mountain's foot. */
  floor: number;
  rock: number;
  /** Where the member stands. */
  at: readonly [number, number];
  /** The swings the page made. */
  swings: number;
  /** The place's rocks as they are laid today, and whether each still stands. */
  rocks: readonly RockAt[];
  standing: (id: number) => boolean;
  salt: string;
  day: number;
  today: PlaceToday;
  /** The floor's element of the day (for a gem vein and the crystal). */
  element: Element;
  /** The member's points on the mining line. */
  points: number;
  /** A counted power: one swing for every rock within a step of the member. */
  quake?: boolean;
}
export interface Mined {
  ok: true; purse: Purse;
  /** The rocks that broke, the one struck first; and of them the one a neighbour's breaking took with it. */
  broke: number[]; chained: number | null;
  got: Array<[ItemId, number]>;
  /** The rock the way down was under, if this go found it. */
  way: number | null;
  vein: PendingVein | null;
  crystal: boolean;
  /** The rocks now loosened for the member, in this place and turn. */
  loose: number[];
  /** What it cost in stamina, and whether it was done with none. */
  cost: number; spent: boolean;
  /** What each broken rock left, for the deeds: the rock, its fragments (if any), whether it was a plain one. */
  each: Array<{ rock: number; kind: Holds["kind"]; shards: number }>;
}
const add = (got: Array<[ItemId, number]>, id: ItemId, n: number) => { if (n <= 0) return; const had = got.find((g) => g[0] === id); if (had) had[1] += n; else got.push([id, n]); };

/**
 * A rock struck for the last time: it breaks, and the purse has what it left. Refused with nothing changed when
 * there is no pick in the hand, the rock is gone or too far, the swings are too few, the pick is too weak for a
 * crystal, or there is no room for what it leaves.
 */
export function mine(purse: Purse, go: Go): Mined | { ok: false; why: MineRefusal } {
  const no = (why: MineRefusal) => ({ ok: false as const, why });
  const pick = pickOf(purse), kept = mineOf(purse), turn = turnOf(go.now);
  if (!pick) return no("tool");
  if (kept.vein) return no("vein");
  const rock = go.rocks.find((r) => r.id === go.rock);
  if (!rock) return no("none");
  if (!go.standing(rock.id)) return no("gone");
  if (!near(go.at, rock, MINING.reach)) return no("far");
  const holds = holdsOf(go.salt, go.floor, rock.id, turn, go.today, pick);
  if (holds.kind === "crystal" && levelOf(pick) < MINING.crystal.plus) return no("weak");
  const spent = isSpent(purse, go.now), quake = !!go.quake;
  if (quake && !mayPower(purse, pick, "pkQuake", go.now)) return no("spent");
  const needed = quake ? 1 : swingsFor(pick, go.floor, spent, isLoose(purse, go.floor, turn, rock.id), go.points);
  if (!Number.isFinite(go.swings) || go.swings < needed) return no("more");
  if (go.now >= kept.last && go.now - kept.last < needed * MINING.swing.least) return no("soon");

  // which rocks break: the one struck; with a quake, every plain rock within a step of the member; and now and then a neighbour
  const breaks: Array<{ rock: RockAt; holds: Holds }> = [{ rock, holds }];
  const plainAt = (r: RockAt) => { const h = holdsOf(go.salt, go.floor, r.id, turn, go.today, pick); return h.kind === "stone" ? h : null; };
  if (quake) {
    for (const r of go.rocks) {
      if (r.id === rock.id || !go.standing(r.id) || !near(go.at, r, optN("pkQuake", "reach"))) continue;
      const h = plainAt(r);
      if (h) breaks.push({ rock: r, holds: h });
    }
  }
  let chained: number | null = null;
  const chance = gemBy(pick, "lightning", GEM_FX.lightning.pick.chain);
  if (chance > 0 && roll(`${go.salt}:chain`, go.floor, rock.id, turn) < chance) {
    const next = go.rocks.filter((r) => go.standing(r.id) && !breaks.some((b) => b.rock.id === r.id) && near(rock, r, MINING.touch) && plainAt(r))
      .sort((a, b) => Math.hypot(a.x - rock.x, a.y - rock.y) - Math.hypot(b.x - rock.x, b.y - rock.y) || a.id - b.id)[0];
    if (next) { breaks.push({ rock: next, holds: plainAt(next)! }); chained = next.id; }
  }

  // what they leave
  const got: Array<[ItemId, number]> = [], ore = oreOf(go.floor), each: Mined["each"] = [];
  let crumb = kept.crumb, way: number | null = null, crystal = false, vein: PendingVein | null = null;
  for (const b of breaks) {
    add(got, "stone", MINING.stone);
    const h = b.holds;
    let shards = 0;
    if (h.kind === "stone" || h.kind === "way") {
      shards = h.shards;
      if (h.kind === "way") way = b.rock.id;
      else if (has(pick, "pkCrumb") && ++crumb >= optN("pkCrumb", "every")) { crumb = 0; shards += optN("pkCrumb", "more"); }
      add(got, ore, shards);
    } else if (h.kind === "crystal") {
      crystal = true;
      const by = has(pick, "pkGleam") ? optN("pkGleam", "by") : 1;
      shards = Math.ceil(MINING.crystal.shards * by);
      add(got, ORES[ORES.length - 1].shard, shards);
      add(got, GEMS[go.element].chip, Math.ceil(MINING.crystal.chips * by));
    }
    each.push({ rock: b.rock.id, kind: h.kind, shards });
  }
  const stowed = stowAll(purse, got);
  if (!stowed) return no("full");

  // what it costs: a point a go, none while the miner's wind lasts, an earth gem's share less (kept exact over time)
  let after: Purse = stowed, cost = 0, owed = kept.owed;
  const fresh = has(pick, "pkFresh") ? usePower(after, pick, "pkFresh", go.now) : null;
  if (fresh?.ok) after = fresh.purse;
  else {
    const had = staminaOf(after, go.now), did = eased(after, spend(after, MINING.stamina, go.now), go.now, 1 - gemBy(pick, "earth", GEM_FX.earth.pick.stamina), owed);
    cost = had - staminaOf(did.purse, go.now);
    after = did.purse; owed = did.owed;
  }
  if (quake) { const used = usePower(after, pick, "pkQuake", go.now); if (used.ok) after = used.purse; }
  if (holds.kind === "vein") {
    // the vein is the member's from here: played with the pick as it is now, and with the stamina left after the rock
    const tired = isSpent(after, go.now);
    vein = { f: go.floor, rock: rock.id, turn, seed: holds.seed, gem: holds.gem ? go.element : null, mods: veinMods(pick, tired), more: holds.gem && has(pick, "pkCutter") ? optN("pkCutter", "more") : 0 };
    const had = staminaOf(after, go.now);
    after = spend(after, VEIN.stamina, go.now);
    cost += had - staminaOf(after, go.now);
  }
  // what is loosened: the rocks that touch one that broke, and still stand
  const gone = breaks.map((b) => b.rock.id), k = `${go.floor}:${turn}`;
  let loose = (kept.loose.k === k ? kept.loose.ids : []).filter((id) => !gone.includes(id));
  if (has(pick, "pkLoose")) {
    for (const r of go.rocks) if (!gone.includes(r.id) && !loose.includes(r.id) && go.standing(r.id) && breaks.some((b) => near(b.rock, r, MINING.touch))) loose.push(r.id);
    loose = loose.sort((a, b) => a - b);
  }
  after = { ...after, mine: { ...kept, owed, crumb, loose: { k, ids: loose }, vein, last: go.now } };
  return { ok: true, purse: after, broke: gone, chained, got, way, vein, crystal, loose, cost, spent, each };
}

/* ── a vein played out ──────────────────────────────────────────────────── */

export interface VeinDone {
  ok: true; purse: Purse; got: Array<[ItemId, number]>;
  /** How many glinting cells the crack passed, of how many; and the strikes made. */
  passed: number; of: number; struck: number;
  /** Whether the same face is to be played once more (a counted power). */
  again: boolean;
  vein: PendingVein;
}
/**
 * A vein played out: its strikes are played again by the rules, and the purse has what the crack passed. Refused
 * with nothing changed when no vein is open, or there is no room for what it gives (the vein then waits).
 */
export function veinEnd(purse: Purse, strikes: ReadonlyArray<Cell>, now: number): VeinDone | { ok: false; why: MineRefusal } {
  const kept = mineOf(purse), vein = kept.vein;
  if (!vein) return { ok: false, why: "none" };
  const face = faceOf(vein.seed, !!vein.gem), crack = play(face, vein.mods, (Array.isArray(strikes) ? strikes : []).filter(isCell));
  const got = yieldOf(face, crack, oreOf(vein.f), vein.gem ? GEMS[vein.gem].chip : null, vein.more);
  const stowed = stowAll(purse, got);
  if (!stowed) return { ok: false, why: "full" };
  // a twin vein: the same face once more, with the pick now in the hand, so many times a day
  const pick = pickOf(stowed), twin = !vein.again && pick ? usePower(stowed, pick, "pkTwin", now) : null;
  const after: Purse = twin?.ok ? twin.purse : stowed;
  return {
    ok: true, got, passed: crack.got.length, of: face.points.length, struck: crack.struck, again: !!twin?.ok, vein,
    purse: { ...after, mine: { ...mineOf(after), vein: twin?.ok ? { ...vein, again: true } : null } },
  };
}

/* ── the lift, a torch, and a floor broken through ──────────────────────── */

/** A resting floor reached: it is one of the lift's stops for the member from then on. */
export function reachRest(purse: Purse, floor: number): Purse {
  const kept = mineOf(purse);
  if (!isRest(floor) || floor > MINING.floors || kept.rests.includes(floor)) return purse;
  return { ...purse, mine: { ...kept, rests: [...kept.rests, floor].sort((a, b) => a - b) } };
}
/** Where the lift takes somebody: the cave's mouth (0) always, and the resting floors they have reached. */
export const liftStops = (purse: Pick<Purse, "mine">): number[] => [0, ...mineOf(purse).rests];
export const mayRide = (purse: Pick<Purse, "mine">, to: number): boolean => liftStops(purse).includes(to);
/** A torch set down from the hand: one fewer in the bag. (Where it stands and how long it burns is the cave's own state.) */
export function torchDown(purse: Purse): { ok: true; purse: Purse } | { ok: false; why: MineRefusal } {
  if (handOf(purse) !== MINING.torch || held(purse.bag, MINING.torch) < 1) return { ok: false, why: "tool" };
  return { ok: true, purse: { ...purse, bag: take(purse.bag, MINING.torch, 1) } };
}
/** The floor struck to open the way down oneself: a counted power of the pick in the hand, on a floor whose way is not open yet. */
export function drill(purse: Purse, floor: number, wayOpen: boolean, now: number): { ok: true; purse: Purse; left: number } | { ok: false; why: MineRefusal } {
  const pick = pickOf(purse);
  if (!pick || !has(pick, "pkDrill")) return { ok: false, why: "tool" };
  if (!isDug(floor) || !hasBelow(floor)) return { ok: false, why: "none" };
  if (wayOpen) return { ok: false, why: "open" };
  const used = usePower(purse, pick, "pkDrill", now);
  return used.ok ? { ok: true, purse: used.purse, left: used.left } : { ok: false, why: "spent" };
}
