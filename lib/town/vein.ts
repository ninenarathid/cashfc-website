import type { ItemId } from "./items";
import { GEM_FX, gemBy, veinStrikes } from "./tools";
import type { Stack } from "./trade";

/**
 * A special vein: the game a rock opens when it hides one (the owner, 2026-10-08, of mining: rocks are dug, and
 * digging may give special ore). A thinking game with no clock, and a game of its own, as every piece of work in the
 * town is.
 *
 * A rock face of six cells by six. Some of its cells glint; some are hard knots. A crack starts at one edge, and a
 * strike on a cell of the crack's own row or column lengthens it towards that cell, two cells at the most. A knot
 * stops it. So many strikes and no more: what the crack has passed is what the vein gives.
 *
 * What the face is comes from a seed that whoever keeps the game makes, and a go is its strikes in their order: the
 * keeper plays them again by these rules and gives what they come to. Pure: nothing here reads a clock or rolls a
 * die of its own. Every number is a knob.
 *
 * Faces come of a few families, each laid its own way (the owner, 2026-10-08 evening: what there is to get better
 * at is reading a face): a seam along a row or a column, a cluster in a block, a ring about a middle, a scatter.
 * A face says which it is, and where its family lies. And the best go there was on a face can be asked for
 * (`bestRoute`), to be held against the go that was played once it is over.
 */
export const VEIN = {
  /** The face's side, in cells. */
  size: 6,
  /** How many cells glint, least and most; and how many knots there are. */
  points: [4, 6] as [number, number],
  knots: [4, 6] as [number, number],
  /** How many cells a strike lengthens the crack, at the most. */
  reach: 2,
  /** What a glinting cell gives, in fragments of the floor's ore. */
  ore: 2,
  /** On a gem vein: how many of the glinting cells are a gem's, and how many fragments of it each gives. */
  gem: { points: [1, 2] as [number, number], chips: [1, 3] as [number, number] },
  /** The stamina a vein costs. */
  stamina: 3,
  /** With no stamina: so many strikes fewer, and what glints shows only so long (milliseconds). */
  tired: { fewer: 2, shows: 2000 },
  /** The families a face comes of, and how often each (its share of their sum). */
  families: { seam: 3, cluster: 3, ring: 2, scatter: 2 } as Record<Family, number>,
  /**
   * What makes each family a face to be read and not only followed. A seam: how likely each of its cells lies a step
   * to the side of its line. A ring: how likely its middle is a knot. And for each, how many of the face's knots lie
   * among the family's own cells that do not glint (as many as there are such cells, at the most): in the seam's
   * line, in the cluster's block, on the ring itself.
   */
  seam: { kink: 0.25, knots: 2 }, cluster: { knots: 3 }, ring: { eye: 0.7, knots: 2 },
  /** No face is laid on which the best go of the fewest strikes a go can have (a plain pick, with no stamina) would pass fewer glinting cells than this. */
  least: 2,
};
/** How a face's glinting cells are laid: along a line, in a block of three by three, round a middle, or anywhere. */
export type Family = "seam" | "cluster" | "ring" | "scatter";
export const FAMILIES: readonly Family[] = ["seam", "cluster", "ring", "scatter"];

export type Cell = readonly [x: number, y: number];
/** A glinting cell: where, and how many fragments of the gem it gives (none: it is ore). */
export interface Glint { x: number; y: number; gem: number }
/**
 * A face: where the crack starts (a cell of an edge), what glints, and the knots in an order of their own (the first
 * of them are the ones ice takes). And its family, with where that lies on the face (`lie`: the cells from one corner
 * to the other, both within: a seam's line, a cluster's block, the square a ring runs round; the whole face for a
 * scatter): the board shows it, and it is all a face says of itself once its glint is no longer seen.
 */
export interface Face { size: number; start: [number, number]; points: Glint[]; knots: Array<[number, number]>; family: Family; lie: [x0: number, y0: number, x1: number, y1: number] }

/** Numbers from 0 to 1 in an order that a seed fixes. */
function numbers(seed: number): () => number {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const between = (rnd: () => number, [least, most]: readonly [number, number]) => least + Math.floor(rnd() * (most - least + 1));
const STEPS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The family a seed's face comes of: the seed's own, whatever the try at laying it. */
export function familyOf(seed: number): Family {
  let left = numbers(seed ^ 0x51ed270b)() * FAMILIES.reduce((t, f) => t + VEIN.families[f], 0);
  return FAMILIES.find((f) => (left -= VEIN.families[f]) < 0) ?? "scatter";
}
/** One try at a face: null when a glinting cell cannot be come to at all, or the crack has nowhere to go. */
function attempt(seed: number, gem: boolean, n: number): Face | null {
  const rnd = numbers(seed ^ Math.imul(n + 1, 0x9e3779b1)), size = VEIN.size, taken = new Set<number>(), family = familyOf(seed);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size;
  const free = (): [number, number] => {
    for (;;) { const x = Math.floor(rnd() * size), y = Math.floor(rnd() * size); if (!taken.has(y * size + x)) { taken.add(y * size + x); return [x, y]; } }
  };
  // the crack starts on an edge: which, and where along it
  const side = Math.floor(rnd() * 4), along = Math.floor(rnd() * size);
  const start: [number, number] = side === 0 ? [along, 0] : side === 1 ? [size - 1, along] : side === 2 ? [along, size - 1] : [0, along];
  taken.add(start[1] * size + start[0]);
  // where the family lies, and the cells its glint may be in (a scatter's: anywhere)
  const many = between(rnd, VEIN.points);
  let lie: Face["lie"] = [0, 0, size - 1, size - 1], cells: Array<[number, number]> | null = null, eye: [number, number] | null = null;
  if (family === "seam") {
    // a row or a column, each of its cells now and then a step to one side
    const line = Math.floor(rnd() * size), flat = rnd() < 0.5;
    lie = flat ? [0, line, size - 1, line] : [line, 0, line, size - 1];
    cells = Array.from({ length: size }, (_, i): [number, number] => {
      const off = rnd() < VEIN.seam.kink ? (rnd() < 0.5 ? -1 : 1) : 0, to = on(line + off, 0) ? line + off : line - off;
      return flat ? [i, to] : [to, i];
    });
  } else if (family === "cluster") {
    const x = Math.floor(rnd() * (size - 2)), y = Math.floor(rnd() * (size - 2));
    lie = [x, y, x + 2, y + 2];
    cells = Array.from({ length: 9 }, (_, i): [number, number] => [x + (i % 3), y + Math.floor(i / 3)]);
  } else if (family === "ring") {
    // the eight cells round a middle that is off the face's edge; the middle itself is often a knot
    const x = 1 + Math.floor(rnd() * (size - 2)), y = 1 + Math.floor(rnd() * (size - 2));
    lie = [x - 1, y - 1, x + 1, y + 1];
    cells = Array.from({ length: 9 }, (_, i): [number, number] => [x - 1 + (i % 3), y - 1 + Math.floor(i / 3)]).filter(([u, v]) => u !== x || v !== y);
    if (rnd() < VEIN.ring.eye) eye = [x, y];
  }
  let points: Glint[];
  const inner: Array<[number, number]> = [];
  if (cells) {
    // (so many of the family's cells, drawn in an order of the seed's; never the cell the crack starts in. Of those
    // that are left, a few are knots: the family's own)
    const of = cells.filter(([x, y]) => !taken.has(y * size + x));
    for (let i = of.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [of[i], of[j]] = [of[j], of[i]]; }
    points = of.slice(0, many).map(([x, y]) => { taken.add(y * size + x); return { x, y, gem: 0 }; });
    if (points.length < VEIN.points[0]) return null;
    for (const [x, y] of of.slice(many, many + (family === "seam" ? VEIN.seam.knots : family === "cluster" ? VEIN.cluster.knots : VEIN.ring.knots))) { taken.add(y * size + x); inner.push([x, y]); }
  } else points = Array.from({ length: many }, () => { const [x, y] = free(); return { x, y, gem: 0 }; });
  // (the family's own knots are the last of the knots, a ring's eye the very last: ice takes the others first)
  if (eye) { taken.add(eye[1] * size + eye[0]); inner.push(eye); }
  const knots = [...Array.from({ length: Math.max(0, between(rnd, VEIN.knots) - inner.length) }, free), ...inner];
  if (gem) {
    const gems = Math.min(points.length, between(rnd, VEIN.gem.points));
    for (let i = 0; i < gems; i++) points[i].gem = between(rnd, VEIN.gem.chips);
    // (which of them are the gem's is not always the first laid)
    points.sort((a, b) => a.y * size + a.x - (b.y * size + b.x));
  }
  // every glinting cell is come to from the start, a cell at a time, round the knots
  const shut = new Set(knots.map(([x, y]) => y * size + x)), seen = new Set<number>([start[1] * size + start[0]]), queue: Array<[number, number]> = [start];
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of STEPS) {
      const u = x + dx, v = y + dy, k = v * size + u;
      if (u < 0 || v < 0 || u >= size || v >= size || shut.has(k) || seen.has(k)) continue;
      seen.add(k); queue.push([u, v]);
    }
  }
  if (seen.size < 2 || points.some((p) => !seen.has(p.y * size + p.x))) return null;
  // (and the shortest go there is finds something worth its strikes on it)
  const face: Face = { size, start, points, knots, family, lie };
  return bestRoute(face, veinMods(null, true)).passed < Math.min(VEIN.least, points.length) ? null : face;
}
/** The face a seed makes: the same for the same seed, wherever it is made. `gem`: a gem vein, some of whose glinting cells are a gem's. */
export function faceOf(seed: number, gem = false): Face {
  for (let n = 0; n < 200; n++) { const f = attempt(seed, gem, n); if (f) return f; }
  // (never come to in a million seeds tried; a face with nothing in the crack's way, all the same)
  return { size: VEIN.size, start: [0, 0], points: [{ x: 2, y: 0, gem: gem ? 1 : 0 }, { x: 4, y: 0, gem: 0 }, { x: 4, y: 2, gem: 0 }, { x: 2, y: 2, gem: 0 }], knots: [], family: "scatter", lie: [0, 0, VEIN.size - 1, VEIN.size - 1] };
}

/** What a go is played with: its strikes, how many of those a knot stops are given back, how many of the knots are ice the crack may cross, and whether its points are seen all along. */
export interface VeinMods { strikes: number; back: number; cross: number; spent: boolean }
/** …by the pick in the hand, and whether its holder has any stamina left. */
export function veinMods(pick: Stack | null | undefined, spent: boolean): VeinMods {
  return {
    strikes: Math.max(1, veinStrikes(pick) - (spent ? VEIN.tired.fewer : 0)),
    back: gemBy(pick, "water", GEM_FX.water.pick.back), cross: gemBy(pick, "ice", GEM_FX.ice.pick.cross), spent,
  };
}
/** The knots of a face that are ice for a go: the first so many, in the face's own order. */
export const iceOf = (face: Face, mods: Pick<VeinMods, "cross">): Array<[number, number]> => face.knots.slice(0, Math.max(0, mods.cross));
/** Whether a cell of a face stops a crack in a go: a knot that is not ice. */
export const stops = (face: Face, mods: Pick<VeinMods, "cross">, x: number, y: number): boolean => face.knots.findIndex(([kx, ky]) => kx === x && ky === y) >= Math.max(0, mods.cross);

/** A go as it stands: the cells the crack has run through (the first is where it started), the strikes left, how many may still be given back, and which glinting cells it has passed (by their place in the face's list). */
export interface Crack { path: Array<[number, number]>; left: number; back: number; got: number[]; struck: number }
export const begin = (face: Face, mods: VeinMods): Crack => ({ path: [[face.start[0], face.start[1]]], left: mods.strikes, back: mods.back, got: [], struck: 0 });
export const headOf = (crack: Crack): [number, number] => crack.path[crack.path.length - 1];
/** Whether a cell can be struck: on the face, in the crack's own row or column, and not where its end is; and there is a strike left. */
export function mayStrike(face: Face, crack: Crack, [x, y]: Cell): boolean {
  const [hx, hy] = headOf(crack);
  return crack.left > 0 && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < face.size && y < face.size && (x === hx) !== (y === hy);
}
/** Whether a go is over: no strike left, or nothing left to pass. */
export const over = (face: Face, crack: Crack): boolean => crack.left <= 0 || crack.got.length >= face.points.length;
/**
 * A strike on a cell: the crack runs towards it, two cells at the most and never past it, and stops before a knot.
 * A strike a knot stopped short is given back while the go has any to give back. Gives the go after it, how far the
 * crack ran, whether a knot stopped it, and the glinting cells it passed this time. A cell that cannot be struck
 * changes nothing (`moved` -1).
 */
export function strike(face: Face, mods: VeinMods, crack: Crack, cell: Cell): { crack: Crack; moved: number; knot: boolean; back: boolean; passed: number[] } {
  if (!mayStrike(face, crack, cell)) return { crack, moved: -1, knot: false, back: false, passed: [] };
  let [hx, hy] = headOf(crack);
  const dx = Math.sign(cell[0] - hx), dy = Math.sign(cell[1] - hy), far = Math.min(VEIN.reach, Math.abs(cell[0] - hx) + Math.abs(cell[1] - hy));
  const path = [...crack.path], got = [...crack.got], passed: number[] = [];
  let moved = 0, knot = false;
  for (let i = 0; i < far; i++) {
    const x = hx + dx, y = hy + dy;
    if (stops(face, mods, x, y)) { knot = true; break; }
    hx = x; hy = y; moved++;
    path.push([x, y]);
    const p = face.points.findIndex((q) => q.x === x && q.y === y);
    if (p >= 0 && !got.includes(p)) { got.push(p); passed.push(p); }
  }
  const back = knot && crack.back > 0;
  return { crack: { path, got, left: crack.left - (back ? 0 : 1), back: crack.back - (back ? 1 : 0), struck: crack.struck + 1 }, moved, knot, back, passed };
}
/** A whole go played again from its strikes, in their order: what cannot be struck is passed over, and nothing is struck once the go is over. */
export function play(face: Face, mods: VeinMods, strikes: ReadonlyArray<Cell>): Crack {
  let crack = begin(face, mods);
  for (const cell of Array.isArray(strikes) ? strikes.slice(0, 64) : []) {
    if (over(face, crack)) break;
    if (Array.isArray(cell)) crack = strike(face, mods, crack, [Number(cell[0]), Number(cell[1])]).crack;
  }
  return crack;
}
/**
 * What a go gives: so many fragments of the floor's ore for each glinting cell of ore passed, and each gem's cell its
 * own fragments of the gem (`more` besides, of a gem vein one of whose gem cells was passed).
 */
export function yieldOf(face: Face, crack: Pick<Crack, "got">, ore: ItemId, chip: ItemId | null, more = 0): Array<[ItemId, number]> {
  let shards = 0, chips = 0;
  for (const i of crack.got) { const p = face.points[i]; if (!p) continue; if (p.gem > 0 && chip) chips += p.gem; else shards += VEIN.ore; }
  if (chips > 0) chips += Math.max(0, more);
  return [...(shards ? [[ore, shards] as [ItemId, number]] : []), ...(chips && chip ? [[chip, chips] as [ItemId, number]] : [])];
}
/**
 * The best go there is on a face with what a go is played with (its strikes, what a knot gives back, the knots that
 * are ice): the one that passes the most glinting cells, and of those the one of the fewest strikes. Its strikes in
 * their order, the cells its crack runs through, and which glinting cells it passes.
 *
 * Every way a go can stand is looked at once, a strike further at a time: where the crack's end is, what it has
 * passed, the strikes left and what may still be given back (a few thousand ways at the most: a face is small).
 * Asked by the board once a go is over, to hold it against the go that was played; nothing is kept or paid by it.
 */
export interface Route { passed: number; strikes: Array<[number, number]>; path: Array<[number, number]>; got: number[] }
export function bestRoute(face: Face, mods: VeinMods): Route {
  interface Way { x: number; y: number; mask: number; left: number; back: number; from: number; by: [number, number] | null }
  const bits = (m: number) => { let n = 0; for (; m; m &= m - 1) n++; return n; };
  const first: Way = { x: face.start[0], y: face.start[1], mask: 0, left: mods.strikes, back: mods.back, from: -1, by: null };
  const ways: Way[] = [first], seen = new Set<string>([`${first.x},${first.y},0,${first.left},${first.back}`]), all = face.points.length;
  let best = 0;
  for (let i = 0; i < ways.length && bits(ways[best].mask) < all; i++) {
    const w = ways[i];
    if (w.left <= 0) continue;
    const got = face.points.flatMap((_, p) => (w.mask & (1 << p) ? [p] : []));
    for (const [dx, dy] of STEPS) for (let far = 1; far <= VEIN.reach; far++) {
      const to: [number, number] = [w.x + dx * far, w.y + dy * far];
      const did = strike(face, mods, { path: [[w.x, w.y]], left: w.left, back: w.back, got, struck: 0 }, to);
      if (did.moved < 0) continue;
      const [hx, hy] = headOf(did.crack), mask = did.crack.got.reduce((m, p) => m | (1 << p), 0), key = `${hx},${hy},${mask},${did.crack.left},${did.crack.back}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ways.push({ x: hx, y: hy, mask, left: did.crack.left, back: did.crack.back, from: i, by: to });
      // (ways are come to in the order of their strikes: the first to pass so many is of the fewest)
      if (bits(mask) > bits(ways[best].mask)) best = ways.length - 1;
    }
  }
  const strikes: Array<[number, number]> = [];
  for (let i = best; i > 0; i = ways[i].from) strikes.unshift(ways[i].by!);
  const crack = play(face, mods, strikes);
  return { passed: crack.got.length, strikes, path: crack.path, got: crack.got };
}
/**
 * The most glinting cells any go could pass on a face, with so many strikes and nothing given back (for the tests and
 * for tuning: nothing in the game asks it).
 */
export function bestOf(face: Face, mods: VeinMods): number {
  let best = 0;
  const go = (crack: Crack) => {
    if (crack.got.length > best) best = crack.got.length;
    if (over(face, crack) || best >= face.points.length) return;
    const [hx, hy] = headOf(crack);
    for (const [dx, dy] of STEPS) for (let far = 1; far <= VEIN.reach; far++) {
      const did = strike(face, { ...mods, back: 0 }, { ...crack, back: 0 }, [hx + dx * far, hy + dy * far]);
      if (did.moved > 0 && (far === 1 || did.moved === far)) go(did.crack);
    }
  };
  go(begin(face, mods));
  return best;
}
