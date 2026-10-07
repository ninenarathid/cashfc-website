/**
 * The cave under the mountain: a map to come, entered by the mine's mouth in
 * the foot yard's cliff. Its floors are not drawn by hand: each is made here
 * from its number and a day's number, the same for everybody who works it out,
 * and another one the next day.
 *
 * A floor is a square of rock with three or four chambers hollowed out of it
 * and tunnels joining them. One comes down into it by a ladder with a lamp
 * hung on it, and goes further down by another, at the far end of the way
 * through. Rocks stand about its chambers. It is dark: lib/town/world says
 * where its floors lie and who may walk where, and the map draws the dark.
 *
 * Shapes, not tiles, as the town's paths are: a chamber is a blob and a tunnel
 * a bent line with a width, the ground is drawn from them point by point, and
 * a tile is floor when its middle is.
 *
 * Pure, in a floor's own tiles, (u, v) from its top corner. A look-only
 * preview for now (the owner, 2026-10-08): nothing is mined yet, and the way
 * down, which the game will hide under a rock, stands open.
 */

/** A floor's side, in tiles. Its outermost ring is always rock. */
export const CAVE_SIZE = 28;
/** About how many rocks stand on a floor, and the fewest a floor is let have. */
export const CAVE_ROCKS = { most: 24, least: 18 };
/** How far light reaches in the cave, in tiles: about a walker's own doll, and from the lamp on the arrival ladder. */
export const CAVE_LIGHT = { walker: 2, ladder: 3 };

/** A chamber: its middle, how far its wall is from it, and what makes that wall uneven (two waves round it, and how much longer it is one way than the other). */
export interface Chamber { u: number; v: number; r: number; a: number; b: number; long: number }
/** A tunnel: from a chamber's middle to the next one's by a point between them, and half its width. */
export interface Tunnel { from: [number, number]; via: [number, number]; to: [number, number]; half: number }
/** A rock standing on a floor, and which of its looks it has (3 is the one with crystals in it). */
export interface CaveRock { u: number; v: number; look: 0 | 1 | 2 | 3 }
export interface CaveFloor {
  n: number; day: number;
  chambers: Chamber[]; tunnels: Tunnel[];
  /** Whether each tile is floor, row by row (v × CAVE_SIZE + u). */
  open: Uint8Array;
  /** The ladder one came down by (stopping on it goes back up), where one stands on arriving, and the ladder down. */
  up: [number, number]; arrive: [number, number]; down: [number, number];
  rocks: CaveRock[];
}

/** Numbers from 0 to 1 in an order that a seed fixes. */
function numbers(seed: number): () => number {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A seed that is a floor's own on a day (and another at each further try at laying it out). */
function seedOf(n: number, day: number, attempt: number): number {
  let h = Math.imul(n + 7919, 0x85ebca6b) ^ Math.imul(day + 104729, 0xc2b2ae35) ^ Math.imul(attempt + 31, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return h ^ (h >>> 13);
}

/** How far a point is inside a chamber's wall, as a share of the way from its middle: under 1 is inside. */
function chamberReach(c: Chamber, u: number, v: number): number {
  const du = u - c.u, dv = (v - c.v) * c.long, turn = Math.atan2(dv, du);
  return Math.hypot(du, dv) / (c.r * (1 + 0.13 * Math.sin(3 * turn + c.a) + 0.08 * Math.sin(5 * turn + c.b)));
}
function nearSegment(u: number, v: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(u - (a[0] + t * dx), v - (a[1] + t * dy));
}
/** Whether a point (not a tile) of a floor's square is hollow: in a chamber or a tunnel, and inside the outermost ring of rock. */
export function hollowAt(f: Pick<CaveFloor, "chambers" | "tunnels">, u: number, v: number): boolean {
  if (u < 1 || v < 1 || u >= CAVE_SIZE - 1 || v >= CAVE_SIZE - 1) return false;
  for (const c of f.chambers) if (chamberReach(c, u, v) < 1) return true;
  for (const t of f.tunnels) if (nearSegment(u, v, t.from, t.via) < t.half || nearSegment(u, v, t.via, t.to) < t.half) return true;
  return false;
}
/** Whether a tile of a floor is one somebody may stand on: floor, with no rock on it. */
export const floorAt = (f: CaveFloor, u: number, v: number) => u >= 0 && v >= 0 && u < CAVE_SIZE && v < CAVE_SIZE && f.open[v * CAVE_SIZE + u] === 1;

/** The four quarters of a floor, round it: where its chambers lie. */
const QUARTERS: ReadonlyArray<readonly [number, number]> = [[7.5, 7.5], [20.5, 7.5], [20.5, 20.5], [7.5, 20.5]];
const STEPS4: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** One try at a floor: null when it did not come out right (a chamber cut off, no room for the ladders, too few rocks). */
function attemptAt(n: number, day: number, attempt: number): CaveFloor | null {
  const rnd = numbers(seedOf(n, day, attempt));
  const count = rnd() < 0.5 ? 3 : 4, first = Math.floor(rnd() * 4), way = rnd() < 0.5 ? 1 : 3;
  const chambers: Chamber[] = Array.from({ length: count }, (_, i) => {
    const [qu, qv] = QUARTERS[(first + i * way) % 4];
    return { u: qu + (rnd() - 0.5) * 3.2, v: qv + (rnd() - 0.5) * 3.2, r: 4.3 + rnd() * 1.5, a: rnd() * 6.283, b: rnd() * 6.283, long: 0.84 + rnd() * 0.34 };
  });
  const tunnels: Tunnel[] = [];
  const join = (a: Chamber, b: Chamber) => {
    // by a point between the two, a little to one side: a tunnel bends
    const mu = (a.u + b.u) / 2, mv = (a.v + b.v) / 2, far = Math.hypot(b.u - a.u, b.v - a.v) || 1, side = (rnd() - 0.5) * 4.4;
    const via: [number, number] = [Math.max(3, Math.min(CAVE_SIZE - 3, mu - ((b.v - a.v) / far) * side)), Math.max(3, Math.min(CAVE_SIZE - 3, mv + ((b.u - a.u) / far) * side))];
    tunnels.push({ from: [a.u, a.v], via, to: [b.u, b.v], half: 1.15 + rnd() * 0.3 });
  };
  for (let i = 1; i < count; i++) join(chambers[i - 1], chambers[i]);
  // (four chambers lie round the floor: now and then the last is joined to the first as well, and the way through is a ring)
  if (count === 4 && rnd() < 0.35) join(chambers[3], chambers[0]);

  const open = new Uint8Array(CAVE_SIZE * CAVE_SIZE), shape = { chambers, tunnels };
  for (let v = 0; v < CAVE_SIZE; v++) for (let u = 0; u < CAVE_SIZE; u++) if (hollowAt(shape, u + 0.5, v + 0.5)) open[v * CAVE_SIZE + u] = 1;
  const is = (u: number, v: number) => u >= 0 && v >= 0 && u < CAVE_SIZE && v < CAVE_SIZE && open[v * CAVE_SIZE + u] === 1;
  const middle = (c: Chamber): [number, number] => [Math.floor(c.u), Math.floor(c.v)];
  // every chamber's middle is walked to from the first's, a step at a time and never across a corner
  const [su, sv] = middle(chambers[0]);
  if (!is(su, sv)) return null;
  const reached = new Uint8Array(CAVE_SIZE * CAVE_SIZE), queue: Array<[number, number]> = [[su, sv]];
  reached[sv * CAVE_SIZE + su] = 1;
  while (queue.length) {
    const [u, v] = queue.pop()!;
    for (const [du, dv] of STEPS4) if (is(u + du, v + dv) && !reached[(v + dv) * CAVE_SIZE + u + du]) { reached[(v + dv) * CAVE_SIZE + u + du] = 1; queue.push([u + du, v + dv]); }
  }
  if (chambers.some((c) => { const [u, v] = middle(c); return !is(u, v) || !reached[v * CAVE_SIZE + u]; })) return null;
  // (a pocket of floor that the way through does not reach is rock)
  for (let i = 0; i < open.length; i++) if (!reached[i]) open[i] = 0;

  // The ladder one comes down by: at the back of the first chamber as the screen sees it (its tile nearest the top of
  // the screen), against the rock, with room to stand before it. The ladder down: in the middle of the last one.
  let up: [number, number] | null = null;
  for (let v = 0; v < CAVE_SIZE; v++) for (let u = 0; u < CAVE_SIZE; u++) {
    if (!is(u, v) || chamberReach(chambers[0], u + 0.5, v + 0.5) >= 1 || !is(u + 1, v + 1) || !is(u + 1, v) || !is(u, v + 1) || !is(u + 2, v + 2)) continue;
    if (!up || u + v < up[0] + up[1] || (u + v === up[0] + up[1] && Math.abs(u - v - (chambers[0].u - chambers[0].v)) < Math.abs(up[0] - up[1] - (chambers[0].u - chambers[0].v)))) up = [u, v];
  }
  const down = middle(chambers[count - 1]);
  if (!up) return null;
  const arrive: [number, number] = [up[0] + 1, up[1] + 1];
  for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) if (!is(down[0] + du, down[1] + dv)) return null;
  if (Math.max(Math.abs(down[0] - arrive[0]), Math.abs(down[1] - arrive[1])) < 6) return null;

  // Rocks: each on floor with floor all round it, never touching another even at a corner, and clear of the ladders.
  // So every rock can be walked round, and none shuts a way.
  const rocks: CaveRock[] = [];
  const clear = (u: number, v: number, of: readonly [number, number], by: number) => Math.max(Math.abs(u - of[0]), Math.abs(v - of[1])) >= by;
  const last = chambers[count - 1];
  for (let tries = 0; rocks.length < CAVE_ROCKS.most && tries < CAVE_ROCKS.most * 70; tries++) {
    const u = 1 + Math.floor(rnd() * (CAVE_SIZE - 2)), v = 1 + Math.floor(rnd() * (CAVE_SIZE - 2)), k = rnd();
    let room = true;
    for (let dv = -1; dv <= 1 && room; dv++) for (let du = -1; du <= 1; du++) if (!is(u + du, v + dv)) { room = false; break; }
    if (!room || !clear(u, v, up, 3) || !clear(u, v, arrive, 3) || !clear(u, v, down, 3) || rocks.some((r) => !clear(u, v, [r.u, r.v], 2))) continue;
    // (one in four of the rocks of the last chamber has crystals in it)
    const deep = chamberReach(last, u + 0.5, v + 0.5) < 1;
    rocks.push({ u, v, look: deep && k < 0.25 ? 3 : k < 0.5 ? 0 : k < 0.78 ? 1 : 2 });
  }
  if (rocks.length < CAVE_ROCKS.least) return null;
  // (a floor always has one with crystals to show: the rock of the last chamber nearest its ladder, if none came up)
  if (!rocks.some((r) => r.look === 3)) {
    const near = rocks.filter((r) => chamberReach(last, r.u + 0.5, r.v + 0.5) < 1).sort((p, q) => Math.hypot(p.u - down[0], p.v - down[1]) - Math.hypot(q.u - down[0], q.v - down[1]))[0];
    if (!near) return null;
    near.look = 3;
  }
  for (const r of rocks) open[r.v * CAVE_SIZE + r.u] = 2;
  return { n, day, chambers, tunnels, open, up, arrive, down, rocks };
}

/**
 * Floor `n` of the cave (1 is the first under the mouth) as it is on a day: the same for the same two numbers,
 * wherever it is worked out. A layout that did not come out right is tried again from the next seed, in order.
 */
export function caveFloor(n: number, day: number): CaveFloor {
  for (let attempt = 0; attempt < 400; attempt++) {
    const f = attemptAt(n, day, attempt);
    if (f) return f;
  }
  throw new Error(`no floor ${n} on day ${day}`);
}

/** Which of the cave's three depths a floor is in, by which its earth is tinted: floors 1 to 10, 11 to 20, 21 and deeper. */
export const depthOf = (n: number): 0 | 1 | 2 => (n > 20 ? 2 : n > 10 ? 1 : 0);

/** A light on a floor, in its own tiles: where, and how far it reaches. */
export interface CaveLight { u: number; v: number; r: number }
/**
 * The lights on a floor as one screen has them: the lamp on the ladder one came down by, and everybody who stands
 * on the floor, each with the little light of their own. Everybody's adds up: whoever is near me lights their own
 * ground on my screen too.
 */
export function lightsOf(f: CaveFloor, people: ReadonlyArray<{ u: number; v: number }>): CaveLight[] {
  return [{ u: f.up[0] + 0.5, v: f.up[1] + 0.5, r: CAVE_LIGHT.ladder }, ...people.map((p) => ({ u: p.u, v: p.v, r: CAVE_LIGHT.walker }))];
}
/** Whether a point of a floor is lit by any of some lights. */
export const litBy = (lights: readonly CaveLight[], u: number, v: number) => lights.some((l) => Math.hypot(u - l.u, v - l.v) <= l.r);
/**
 * The small map of a floor, filled in as it is walked: every tile whose middle a light reaches is marked seen (row
 * by row, like `open`). Gives how many were marked that were not before.
 */
export function reveal(seen: Uint8Array, lights: readonly CaveLight[]): number {
  let fresh = 0;
  for (const l of lights) {
    for (let v = Math.max(0, Math.floor(l.v - l.r)); v <= Math.min(CAVE_SIZE - 1, Math.ceil(l.v + l.r)); v++) for (let u = Math.max(0, Math.floor(l.u - l.r)); u <= Math.min(CAVE_SIZE - 1, Math.ceil(l.u + l.r)); u++) {
      if (seen[v * CAVE_SIZE + u] || Math.hypot(u + 0.5 - l.u, v + 0.5 - l.v) > l.r) continue;
      seen[v * CAVE_SIZE + u] = 1;
      fresh++;
    }
  }
  return fresh;
}
