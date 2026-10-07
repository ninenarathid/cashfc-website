import { leastSecs, type FellingAsk } from "./felling";
import { works } from "./gifts";
import type { ItemId } from "./items";
import type { TreeAge } from "./mountain";
import { mayPower, usePower } from "./powers";
import { dayOf, eased, isSpent, spend } from "./stamina";
import { FORGE, GEM_FX, LEVELS, axeAhead, axeBarPace, axeChops, gemBy, has, levelOf, optN, toolKindOf } from "./tools";
import { heldStack, put, roomFor, type Purse, type Stack } from "./trade";
import { MOUNTAIN_AT, MOUNTAIN_TREES } from "./world";

/**
 * The mountain's trees, and what felling one comes to (the owner, 2026-10-08: woodcutting; "Rocks struck and trees
 * felled are gone for EVERYBODY (as a caught insect is), and come back by the clock").
 *
 * - **A tree is everybody's.** Felled, it is a stump on every screen, and grows back by the clock through four looks
 *   (a stump, a sprout, a young tree, grown). Who felled which and when is kept by whoever keeps the game
 *   (`Grove`); a page is told only what is not grown, and draws that.
 * - **The ancient tree** is one, grown once a day from dawn, and falls only to an axe forged to the top.
 * - **The trees of the upper terraces** are for better axes than there are yet: an axe of the first tier is refused.
 * - **The game** is lib/town/felling's; this file puts one together from the axe in the hand (lib/town/tools reads
 *   what the axe carries), from tired hands, and from the two gifts that change it; and says what a go that was
 *   played brings home.
 *
 * Nothing here is told to the players: what an axe's option or gem does is theirs to find. Every number is a knob,
 * and they are all in `TREES`. Pure: every function is given the moment it is asked at and the numbers of chance it
 * may need, and gives back a new purse and a new grove.
 */
export const TREES = {
  /** The minutes a felled tree takes to be grown again; and the share of them at which each of its four looks begins. */
  regrow: 40, looks: [0, 0.25, 0.6, 1] as readonly number[],
  /** The stamina a tree felled costs; how near one stands to fell it, in tiles; and the tier of the axes there are. */
  cost: 2, reach: 1, axeTier: 1,
  /** What a tree gives: so many logs always, and fine timber by the misses (none: `clean`; up to `fair` of them: `some`; more: nothing). */
  logs: 2, timber: { clean: 2, fair: 2, some: 1 },
  /** The chops a plain tree and the ancient tree take with a plain axe (lib/town/tools' own table begins at the first). */
  chops: LEVELS.axe.chops[0], elderChops: 24,
  /** The ancient tree: its number among the trees, the plus an axe has to have, and what it gives. */
  elder: { id: 900, plus: FORGE.top, timber: 15, resin: 3 },
  /** A tree's kinds, by its tier; and what the ancient tree is called in what is written down. */
  kinds: ["pine", "ironwood", "moonwood"] as readonly string[], elderKind: "elder",
  /** What the resin-scent turns up besides the wood: one of these, as likely each. */
  scent: ["resin", "pineCone"] as readonly ItemId[],
  /** The echo axe: how many trees one game fells at the most, and how near the first the others stand, in tiles. */
  echo: { trees: 3, reach: 2 },
  /** A tree half cut by an axe's lightning: how near the felled one it stands, in tiles; and the share of its chops that are left. */
  chain: { reach: 3, left: 0.5 },
  /** The woodpecker: so many branches struck that are forgiven, a tree. */
  pecks: 1,
  /** The quickening root: a stump is "just made" for so many seconds after its tree fell. */
  root: { within: 120 },
};

/* ── what stands there ──────────────────────────────────────────────────── */

/** A tree as the layout has it: its number, its tile (the ancient tree: its corner and how many tiles it takes), its tier, and whether it is the ancient one. */
export interface Standing { id: number; x: number; y: number; tier: 1 | 2 | 3; size?: number; elder?: boolean }
/** The mountain's trees as the game sees them: every numbered tree, and the ancient tree with a number of its own. (None, outside the preview: lib/town/world lays the mountain out only there.) */
export const woodOf = (trees: ReadonlyArray<{ id: number; x: number; y: number; tier: 1 | 2 | 3 }>, cedar: { x: number; y: number; w: number } | null): Standing[] =>
  (trees.length ? [...trees.map((t) => ({ ...t })), ...(cedar ? [{ id: TREES.elder.id, x: cedar.x, y: cedar.y, tier: 1 as const, size: cedar.w, elder: true }] : [])] : []);
export const WOOD: Standing[] = woodOf(MOUNTAIN_TREES, MOUNTAIN_AT.cedar);
export const treeOf = (id: number, wood: readonly Standing[] = WOOD): Standing | null => wood.find((t) => t.id === id) ?? null;
/** What a tree is called in what is written down, and what its kind is counted as on the line: by its tier, or the ancient tree's own. */
export const kindOf = (t: Standing): string => (t.elder ? TREES.elderKind : TREES.kinds[t.tier - 1]);
/** How far a tile is from a tree, in tiles (from the nearest of the tiles it stands on). */
export function farFrom(t: Standing, at: readonly [number, number]): number {
  const size = t.size ?? 1, dx = Math.max(t.x - at[0], 0, at[0] - (t.x + size - 1)), dy = Math.max(t.y - at[1], 0, at[1] - (t.y + size - 1));
  return Math.max(dx, dy);
}
/** How far two trees stand from each other, in tiles. */
const apart = (a: Standing, b: Standing) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/* ── what is kept ───────────────────────────────────────────────────────── */

/** A tree that was felled: when, and by whom. */
export interface Felled { at: number; by: string }
/** The trees as they are kept, the village's: those felled and not yet grown again, by their numbers; and those an axe's lightning has left half cut. */
export interface Grove { down: Record<string, Felled>; half: number[] }
export const newGrove = (): Grove => ({ down: {}, half: [] });
/** A grove as it is kept, made sound. */
export function groveOf(v: unknown): Grove {
  const g = (v && typeof v === "object" ? v : {}) as Partial<Grove>, down: Record<string, Felled> = {};
  for (const [id, f] of Object.entries(g.down && typeof g.down === "object" ? g.down : {})) {
    if (f && typeof f.at === "number" && Number.isFinite(f.at) && typeof f.by === "string") down[id] = { at: f.at, by: f.by };
  }
  return { down, half: Array.isArray(g.half) ? [...new Set(g.half.filter((n): n is number => Number.isInteger(n)))] : [] };
}

const MIN = 60_000;
/** When a tree felled at a moment is grown again: so many minutes on; the ancient tree, at the next dawn. */
export function grownAt(t: Pick<Standing, "elder">, felledAt: number): number {
  if (!t.elder) return felledAt + TREES.regrow * MIN;
  // (the day begins at dawn, as the stamina's does: the first moment of the day after the one it fell on)
  let lo = felledAt, hi = felledAt + 25 * 60 * MIN;
  const day = dayOf(felledAt);
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (dayOf(mid) > day) hi = mid; else lo = mid; }
  return hi;
}
/** A tree's look at a moment, from when it fell and when it is grown again: 0 a stump, 1 a sprout, 2 a young tree, 3 grown. The ancient tree is a stump until it is grown. */
export function lookAt(felledAt: number, until: number, now: number, elder = false): TreeAge {
  if (now >= until) return 3;
  if (elder || until <= felledAt) return 0;
  const share = (now - felledAt) / (until - felledAt);
  return share >= TREES.looks[2] ? 2 : share >= TREES.looks[1] ? 1 : 0;
}
/** How a tree looks now. */
export function ageOf(grove: Grove, t: Standing, now: number): TreeAge {
  const f = grove.down[t.id];
  return f ? lookAt(f.at, grownAt(t, f.at), now, !!t.elder) : 3;
}
export const isGrown = (grove: Grove, t: Standing, now: number): boolean => ageOf(grove, t, now) === 3;
/** A grove with what has grown again forgotten: only what still shows is kept. */
export function tidied(grove: Grove, now: number, wood: readonly Standing[] = WOOD): Grove {
  const down = Object.fromEntries(Object.entries(grove.down).filter(([id, f]) => { const t = treeOf(Number(id), wood); return !!t && now < grownAt(t, f.at); }));
  return Object.keys(down).length === Object.keys(grove.down).length ? grove : { ...grove, down };
}

/**
 * The trees as a page is told them: every tree that is not grown, with when it fell and when it is grown again (a
 * page draws its look from the two, by the clock); and the trees half cut. Of the ancient tree only that it is down:
 * when it is grown again is told to whoever holds an axe that knows it.
 */
export interface TreesTold { down: Array<{ id: number; at: number; until?: number }>; half: number[] }
export function toldOf(grove: Grove, purse: Purse, now: number, wood: readonly Standing[] = WOOD): TreesTold {
  const knows = has(heldStack(purse), "axElder"), down: TreesTold["down"] = [];
  for (const [id, f] of Object.entries(grove.down)) {
    const t = treeOf(Number(id), wood);
    if (!t) continue;
    const until = grownAt(t, f.at);
    if (now < until) down.push({ id: t.id, at: f.at, ...(t.elder && !knows ? {} : { until }) });
  }
  return { down: down.sort((a, b) => a.id - b.id), half: grove.half.filter((id) => !grove.down[id]).sort((a, b) => a - b) };
}
/** A tree's look as a page reads it from what it was told: grown, with nothing told of it. */
export function lookOf(told: TreesTold | null, id: number, now: number): TreeAge {
  const d = told?.down.find((x) => x.id === id);
  if (!d) return 3;
  return d.until === undefined ? 0 : lookAt(d.at, d.until, now, id === TREES.elder.id);
}

/* ── the purse's own ────────────────────────────────────────────────────── */

/** What a woodcutter's purse keeps of the line: the part of a point of stamina left owing by an axe's earth (lib/town/stamina's eased), and how many trees have fallen towards the next offcut. */
export interface FellingKept { owed: number; dust: number }
export function fellingOf(purse: Pick<Purse, "felling">): FellingKept {
  const k = purse.felling, owed = typeof k?.owed === "number" && k.owed > 0 && k.owed < 1 ? k.owed : 0;
  const dust = typeof k?.dust === "number" && Number.isInteger(k.dust) && k.dust > 0 ? k.dust : 0;
  return { owed, dust };
}

/**
 * The wood a go brings home, into the bag: the purse with every thing in it, or null when the bag has not the room
 * for all of it. (The one place things from a tree go into a bag: whatever holds wood besides the bag is to be
 * reached from here.)
 */
export function bringHome<P extends Purse>(purse: P, things: ReadonlyArray<readonly [ItemId, number]>): P | null {
  let bag = purse.bag;
  for (const [item, n] of things) {
    if (n <= 0) continue;
    if (roomFor(bag, item) < n) return null;
    bag = put(bag, item, n);
  }
  return { ...purse, bag };
}

/* ── a game, put together ───────────────────────────────────────────────── */

/** Why a tree is not felled: it is not grown; this axe will not bite (a tree of a better tier); the ancient tree asks more of an axe; it is too far. */
export type TreeRefusal = "stump" | "bite" | "plus" | "far";
type No = { ok: false; why: TreeRefusal | "none" | "tool" | "full" | "spent" };
const no = (why: No["why"]): No => ({ ok: false, why });

/** The axe in the hand, if it is one. */
export const axeOf = (purse: Purse): Stack | null => { const s = heldStack(purse); return s && toolKindOf(s.item) === "axe" ? s : null; };
/** Whether this axe may fell that tree at all, and why not: its tier, and the ancient tree's own asking. */
function bites(axe: Stack, t: Standing): TreeRefusal | null {
  if (t.tier > TREES.axeTier) return "bite";
  if (t.elder && levelOf(axe) < TREES.elder.plus) return "plus";
  return null;
}
/** The chops a tree takes with an axe: the axe's own all told, and half of that of a tree half cut. */
export function chopsFor(axe: Stack, t: Standing, half: boolean): number {
  const whole = axeChops(axe, t.elder ? TREES.elderChops : TREES.chops);
  return half ? Math.max(1, Math.ceil(whole * TREES.chain.left)) : whole;
}
/**
 * The trees one game fells, the first being the one walked up to: with the echo axe worn, as many more grown trees
 * of the axe's own reach as stand near the first, the nearest first (a tie: the lower number). The ancient tree is
 * felled by itself and never among others.
 */
export function groupOf(purse: Purse, grove: Grove, first: Standing, axe: Stack, now: number, wood: readonly Standing[] = WOOD): Standing[] {
  if (first.elder || !works(purse, "charmEchoAxe")) return [first];
  const more = wood.filter((t) => t.id !== first.id && !t.elder && !bites(axe, t) && apart(t, first) <= TREES.echo.reach && isGrown(grove, t, now))
    .sort((a, b) => apart(a, first) - apart(b, first) || a.id - b.id);
  return [first, ...more.slice(0, TREES.echo.trees - 1)];
}
/**
 * The most a go at these trees can bring home: what the bag has to have room for before the axe is swung (where the
 * axe's scent may turn up one of two things, room for either of them a tree).
 */
export function mostOf(axe: Stack, trees: readonly Standing[]): Array<[ItemId, number]> {
  let logs = 0, timber = 0, resin = 0, scent = 0;
  const twice = has(axe, "axDouble") ? optN("axDouble", "by") : 1, elder = has(axe, "axElder") ? optN("axElder", "by") : 1;
  for (const t of trees) {
    if (t.elder) { timber += Math.ceil(TREES.elder.timber * elder); resin += Math.ceil(TREES.elder.resin * elder); continue; }
    logs += (TREES.logs + (gemBy(axe, "dark", GEM_FX.dark.axe.log) > 0 ? 1 : 0) + (has(axe, "axDust") ? optN("axDust", "more") : 0)) * twice;
    timber += TREES.timber.clean * twice;
    if (has(axe, "axResin")) scent++;
  }
  const out: Array<[ItemId, number]> = [["log", logs], ["timber", timber], ...TREES.scent.map((id): [ItemId, number] => [id, scent + (id === "resin" ? resin : 0)])];
  if (!TREES.scent.includes("resin")) out.push(["resin", resin]);
  return out.filter(([, n]) => n > 0);
}
const hasRoom = (purse: Purse, axe: Stack, trees: readonly Standing[]): boolean => !!bringHome(purse, mostOf(axe, trees));

/** What a tree walked up to comes to before the game: the trees it is played for, and the game to play (lib/town/felling makes it from `ask`). */
export interface Begun { trees: number[]; ask: FellingAsk; elder: boolean }
/**
 * Walk up to a tree with an axe in the hand: whether it can be felled now, and the game that fells it. `seed`: a
 * number of chance, from which each trunk is made. Refused: no axe in the hand; too far; an axe that will not bite;
 * the ancient tree to an axe that is not at the top; a tree that is not grown; a bag with no room for what it may give.
 */
export function begin(purse: Purse, grove: Grove, id: number, at: readonly [number, number], now: number, seed: number, wood: readonly Standing[] = WOOD): ({ ok: true } & Begun) | No {
  const t = treeOf(id, wood), axe = axeOf(purse);
  if (!t) return no("none");
  if (!axe) return no("tool");
  if (farFrom(t, at) > TREES.reach) return no("far");
  const refused = bites(axe, t);
  if (refused) return no(refused);
  if (!isGrown(grove, t, now)) return no("stump");
  const trees = groupOf(purse, grove, t, axe, now, wood);
  if (!hasRoom(purse, axe, trees)) return no("full");
  return {
    ok: true, trees: trees.map((x) => x.id), elder: !!t.elder,
    ask: {
      trees: trees.map((x, i) => ({ id: x.id, chops: chopsFor(axe, x, grove.half.includes(x.id)), seed: (Math.imul(seed | 0, 31) + Math.imul(x.id + 1, 7919) + i) | 0 })),
      ahead: axeAhead(axe), pace: axeBarPace(axe),
      spared: gemBy(axe, "water", GEM_FX.water.axe.spared) + (works(purse, "famWoodpecker") ? TREES.pecks : 0),
      spent: isSpent(purse, now),
    },
  };
}

/* ── a go, brought home ─────────────────────────────────────────────────── */

/**
 * How a go went, as the page played it: the tree walked up to; of every tree of the game whether it fell and with
 * how many misses; the seconds played by hand; and what was asked of the axe's counted powers (`one`: the tree to fall
 * at one chop, with no game; `twice`: twice the wood).
 */
export interface FellWent { tree: number; trees: Array<{ id: number; felled: boolean; misses: number }>; secs: number; one?: boolean; twice?: boolean }
/** The numbers of chance a go may need, each from 0 to 1, a set a tree: whether the axe's dark turns up a log more, whether its scent turns something up and what, whether its lightning half cuts a neighbour. */
export interface FellLuck { dark: number; scent: number; which: number; chain: number }
/** One tree that fell: its number and kind, the misses it fell with, what it gave, and the neighbour its fall left half cut, if any. */
export interface FellOne { id: number; kind: string; misses: number; got: Array<[ItemId, number]>; chained: number | null; free: boolean; twice: boolean }
/** What a go came to: the purse and the grove after it, every tree that fell, all it brought home, and whether it was the one chop of the axe's own. */
export interface Fell { purse: Purse; grove: Grove; felled: FellOne[]; got: Array<[ItemId, number]>; one: boolean }

/** The fine timber a plain tree gives, by the misses it fell with. */
export const timberFor = (misses: number): number => (misses <= 0 ? TREES.timber.clean : misses <= TREES.timber.fair ? TREES.timber.some : 0);
/** Things, summed: each kind once, in the order it first came. */
function summed(all: Array<Array<[ItemId, number]>>): Array<[ItemId, number]> {
  const out: Array<[ItemId, number]> = [];
  for (const got of all) for (const [item, n] of got) { const had = out.find((x) => x[0] === item); if (had) had[1] += n; else out.push([item, n]); }
  return out;
}

/**
 * A go at felling, as it is judged by whoever keeps the game. The trees named have to be the ones the game was for
 * (the one walked up to, and with the echo axe those near it), still grown, and reached with an axe that bites; a go
 * that says it was played faster than a hand can chop is no go. Every tree that fell is a stump for everybody from
 * now, and gives its wood; the stamina is paid a tree felled. A go in which nothing fell changes nothing.
 * `luck`: a set of numbers of chance for each tree named, in their order.
 */
export function fell(purse: Purse, grove: Grove, me: string, went: FellWent, at: readonly [number, number], now: number, luck: readonly FellLuck[], wood: readonly Standing[] = WOOD): ({ ok: true } & Fell) | No {
  const first = treeOf(went.tree, wood), axe = axeOf(purse);
  if (!first) return no("none");
  if (!axe) return no("tool");
  if (farFrom(first, at) > TREES.reach) return no("far");
  const refused = bites(axe, first);
  if (refused) return no(refused);
  const group = groupOf(purse, grove, first, axe, now, wood);
  let mine = purse;
  // the axe's one chop: the tree walked up to falls with no game (never the ancient tree), and nothing else does
  const one = !!went.one;
  if (one) {
    if (first.elder) return no("none");
    if (!isGrown(grove, first, now)) return no("stump");
    const used = usePower(mine, axe, "axOne", now);
    if (!used.ok) return no(used.why);
    mine = used.purse;
  }
  const named = one ? [{ id: first.id, felled: true, misses: 0 }] : went.trees;
  if (!Array.isArray(named) || new Set(named.map((n) => n.id)).size !== named.length) return no("none");
  const fallen: Array<{ t: Standing; misses: number; i: number }> = [];
  named.forEach((n, i) => {
    const t = group.find((g) => g.id === n.id);
    if (n.felled && t && isGrown(grove, t, now)) fallen.push({ t, misses: Math.max(0, Math.floor(Number(n.misses) || 0)), i });
  });
  // (the tree walked up to was felled by somebody else meanwhile, and nothing of the game's stands any more: told as the stump it is)
  if (!fallen.length && named.some((n) => n.felled)) return no("stump");
  if (!one && !(Number(went.secs) + 0.05 >= leastSecs(fallen.map((f) => chopsFor(axe, f.t, grove.half.includes(f.t.id)))))) return no("none");

  let down = { ...grove.down }, half = grove.half.slice(), kept = fellingOf(mine);
  const felled: FellOne[] = [];
  for (const { t, misses, i } of fallen) {
    const l = luck[i] ?? { dark: 1, scent: 1, which: 1, chain: 1 }, got: Array<[ItemId, number]> = [];
    let twice = false, free = false;
    if (t.elder) {
      const by = has(axe, "axElder") ? optN("axElder", "by") : 1;
      got.push(["timber", Math.ceil(TREES.elder.timber * by)], ["resin", Math.ceil(TREES.elder.resin * by)]);
    } else {
      let logs = TREES.logs, timber = timberFor(misses);
      if (l.dark < gemBy(axe, "dark", GEM_FX.dark.axe.log)) logs++;
      if (has(axe, "axDust")) {
        kept = { ...kept, dust: kept.dust + 1 };
        if (kept.dust >= optN("axDust", "every")) { logs += optN("axDust", "more"); kept = { ...kept, dust: 0 }; }
      }
      // twice the wood, where it was asked for and the axe has a time left for it
      if (went.twice) {
        const used = usePower(mine, axe, "axDouble", now);
        if (used.ok) { mine = used.purse; twice = true; logs *= optN("axDouble", "by"); timber *= optN("axDouble", "by"); }
      }
      got.push(["log", logs]);
      if (timber > 0) got.push(["timber", timber]);
      if (has(axe, "axResin") && l.scent < 1 / optN("axResin", "in")) got.push([TREES.scent[Math.min(TREES.scent.length - 1, Math.floor(l.which * TREES.scent.length))], 1]);
    }
    // the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less the axe's earth (what is left of a point is owed on)
    const fresh = usePower(mine, axe, "axFresh", now);
    if (fresh.ok) { mine = fresh.purse; free = true; }
    else {
      const paid = eased(mine, spend(mine, TREES.cost, now), now, 1 - gemBy(axe, "earth", GEM_FX.earth.axe.stamina), kept.owed);
      mine = paid.purse;
      kept = { ...kept, owed: paid.owed };
    }
    down[t.id] = { at: now, by: me };
    half = half.filter((id) => id !== t.id);
    // the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    let chained: number | null = null;
    if (!t.elder && l.chain < gemBy(axe, "lightning", GEM_FX.lightning.axe.chain)) {
      const near = wood.filter((o) => !o.elder && o.id !== t.id && !bites(axe, o) && !half.includes(o.id) && !down[o.id] && apart(o, t) <= TREES.chain.reach && !fallen.some((f) => f.t.id === o.id))
        .sort((a, b) => apart(a, t) - apart(b, t) || a.id - b.id)[0];
      if (near) { half.push(near.id); chained = near.id; }
    }
    felled.push({ id: t.id, kind: kindOf(t), misses, got, chained, free, twice });
  }
  const got = summed(felled.map((f) => f.got)), home = bringHome(mine, got);
  if (!home) return no("full");
  // (what has grown again is forgotten as the grove is written)
  for (const id of Object.keys(down)) { const t = treeOf(Number(id), wood); if (!t || now >= grownAt(t, down[id].at)) delete down[id]; }
  const keptNow = felled.length ? { felling: kept } : {};
  return { ok: true, purse: { ...home, ...keptNow }, grove: { down, half }, felled, got, one };
}

/**
 * The quickening root: a stump just made by me grows back at once, for everybody. Never the ancient tree's. Counted
 * by the day, by the axe in the hand.
 */
export function rootBack(purse: Purse, grove: Grove, me: string, id: number, now: number, wood: readonly Standing[] = WOOD): { ok: true; purse: Purse; grove: Grove; left: number } | No {
  const t = treeOf(id, wood), f = grove.down[id], axe = axeOf(purse);
  if (!t || t.elder) return no("none");
  if (!axe) return no("tool");
  if (!f || f.by !== me || now - f.at > TREES.root.within * 1000 || now >= grownAt(t, f.at)) return no("none");
  const used = usePower(purse, axe, "axRoot", now);
  if (!used.ok) return no(used.why);
  const down = { ...grove.down };
  delete down[id];
  return { ok: true, purse: used.purse, grove: { ...grove, down }, left: used.left };
}
/** The stump the quickening root may bring back for me now, if there is one: the last tree I felled, while it is just made. */
export function rootable(purse: Purse, grove: Grove, me: string, now: number, wood: readonly Standing[] = WOOD): number | null {
  const axe = axeOf(purse);
  if (!axe || !mayPower(purse, axe, "axRoot", now)) return null;
  const mine = Object.entries(grove.down).filter(([id, f]) => { const t = treeOf(Number(id), wood); return !!t && !t.elder && f.by === me && now - f.at <= TREES.root.within * 1000; }).sort((a, b) => b[1].at - a[1].at)[0];
  return mine ? Number(mine[0]) : null;
}
