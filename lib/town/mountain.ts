import type { Facing } from "./world";

/**
 * The mountain's foot ("ตีนเขา"): a map to come, out of the town's west path
 * and over the bridge. Laid out here, pure, in its own tiles, (u, v) from its
 * top corner; lib/town/world stands it in the town's tile space and says who
 * may walk where.
 *
 * It climbs in four terraces towards the screen's upper left, which is the
 * way u falls: the foot yard at its east edge, where the gate from the town
 * is, then the slope, the upper terrace and the summit. Each terrace is
 * divided from the next by a cliff, a band of the map nobody walks on, drawn
 * as the rock face one looks at from below; a cliff is crossed only by its
 * two stone stairs.
 *
 * - the foot yard: the gate back to town, the mine's mouth in the first
 *   cliff's face, a camp fire with logs to sit on, a storage chest;
 * - the slope: pines, plain rocks, and one ancient cedar;
 * - the upper terrace: ironwoods;
 * - the summit: moonwoods, and a lookout with a bench.
 *
 * Shapes, not tiles, as the town's paths and the forest's stream are: the
 * ground is drawn from them point by point, and a tile is what its middle is.
 * A look-only preview for now (the owner, 2026-10-08): nothing is felled or
 * mined yet.
 */

/**
 * Not in a production build: there this file lays nothing out and says nothing of the ground, and the build drops
 * what is written under each such line (the kinds of thing that stand here, by name, among it). In a test and in
 * `next dev` it is whole. (The switch that puts the mountain in the world is lib/town/world's PREVIEW.)
 */
const OFF = process.env.NODE_ENV === "production";
/** The map's size in tiles: 72 along the climb, 56 across it. */
export const MOUNTAIN_W = 72, MOUNTAIN_H = 56;
/** How thick a cliff is on the map, in tiles. Its face stands that many half tiles tall on the screen: taller than a doll. */
export const CLIFF = 2.6;
/** Where each cliff's top edge runs, from the foot yard's up: u at the middle of the map. */
const TOPS = [53, 32, 14.5] as const;
/** A cliff's top edge at a point across the map: it wanders a little, and never by as much as a tile in a tile. */
export const cliffTop = (k: number, v: number) => TOPS[k] + 0.8 * Math.sin(v / 6.5 + k * 1.9) + 0.45 * Math.sin(v / 2.9 + k * 0.7);
/** The two stone stairs up each cliff: the first of the two rows each is cut through (a stair is two tiles wide). */
export const STAIRS: ReadonlyArray<readonly [number, number]> = [[13, 43], [23, 38], [15, 34]];
/** The rows the way in from the town comes by, at the map's east edge; and the rows the mine's mouth is in, in the first cliff. */
export const GATE_ROWS = [29, 30] as const, MOUTH_ROWS = [29, 30] as const;

/** The terraces: 0 the foot yard, 1 the slope, 2 the upper terrace, 3 the summit. */
export type Terrace = 0 | 1 | 2 | 3;
/** The cliff a point is on, and how far up its face (0 at its foot, 1 at its top); null off the cliffs. */
export function cliffAt(u: number, v: number): { k: number; rise: number } | null {
  for (let k = 0; k < TOPS.length; k++) {
    const top = cliffTop(k, v);
    if (u >= top && u < top + CLIFF) return { k, rise: 1 - (u - top) / CLIFF };
  }
  return null;
}
/** Whether a point is on a stair: on a cliff, in one of the two rows a stair of that cliff is cut through. */
export function stairAt(u: number, v: number): boolean {
  const c = cliffAt(u, v);
  return !!c && STAIRS[c.k].some((s) => v >= s && v < s + 2);
}
/** The terrace a point is on, or under: a cliff is counted with the terrace at its foot. */
export function terraceAt(u: number, v: number): Terrace {
  let t = 0;
  for (let k = 0; k < TOPS.length; k++) if (u < cliffTop(k, v)) t = k + 1;
  return t as Terrace;
}
/** Where the first cliff's foot is in a row: the first tile of the foot yard there. */
const yardEdge = (row: number) => Math.ceil(cliffTop(0, row + 0.5) + CLIFF - 0.5);
/**
 * The mine's mouth: the two tiles of the foot yard at the first cliff's foot that are its threshold, side by side.
 * Whoever stops on one is in the mine. (The mouth itself is a picture on the cliff's face behind them: nobody stands
 * in it, so nobody is ever half hidden by it.)
 */
const MOUTH_U = /*#__PURE__*/ Math.max(.../*#__PURE__*/ MOUTH_ROWS.map(yardEdge));
export const MOUTH: ReadonlyArray<readonly [number, number]> = /*#__PURE__*/ MOUTH_ROWS.map((row) => [MOUTH_U, row] as const);
/** Where the mouth's picture stands: at the cliff's foot behind those two tiles, between their rows. */
export const MOUTH_AT = { u: MOUTH_U, v: MOUTH_ROWS[1] };

/** The trails, as lines from point to point: from the gate to the mouth and to every stair, and on to the lookout. */
const TRAILS: Array<Array<[number, number]>> = [
  // from the gate across the yard to the mine's mouth
  [[72.5, 30], [66, 30.3], [61, 29.7], [55.6, 30]],
  // and to the two stairs of the first cliff
  [[62, 30], [60.3, 23], [58.4, 16], [55.4, 14]],
  [[62, 30], [60.6, 37], [58.6, 43], [55.4, 44]],
  // across the slope from each stair's top to the next cliff's, and to the ancient cedar between them
  [[53.6, 14], [47, 16.5], [41, 21], [34.4, 24]],
  [[53.6, 44], [47, 42], [41, 40], [34.4, 39]],
  [[47, 16.5], [46.6, 22.5]],
  [[47, 42], [46.6, 31.5]],
  // the upper terrace
  [[32.6, 24], [26, 21.5], [21, 17.5], [17, 16]],
  [[32.6, 39], [26, 38], [21, 35.6], [17, 35]],
  [[26, 21.5], [24.6, 30], [26, 38]],
  // the summit: from each stair to the lookout
  [[15.2, 16], [10, 19.5], [6.6, 25.6]],
  [[15.2, 35], [10, 32], [6.6, 28.4]],
];
function nearSegment(u: number, v: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(u - (a[0] + t * dx), v - (a[1] + t * dy));
}
const onTrail = (u: number, v: number) => {
  const half = 0.92 + 0.1 * Math.sin(u * 0.9 + v * 0.7);
  return TRAILS.some((line) => line.some((p, i) => i > 0 && nearSegment(u, v, line[i - 1], p) < half));
};
/** A soft patchwork over the map, 0 to 1: where the ground of a terrace changes its kind. */
const patch = (u: number, v: number, seed: number) =>
  0.5 + 0.25 * Math.sin(u / 3.7 + seed) * Math.cos(v / 4.3 + seed * 1.7) + 0.25 * Math.sin((u + v) / 2.9 + seed * 2.3) * Math.cos((u - v) / 5.1 + seed);

/** The camp in the foot yard: its fire. The ancient cedar's three tiles by three. The lookout at the summit's far end. */
export const CAMP = { u: 64, v: 37 };
export const ANCIENT = { u: 43, v: 26, w: 3, h: 3 };
export const LOOKOUT = { u: 3, v: 26, w: 4, h: 3 };
const inBox = (u: number, v: number, r: { u: number; v: number; w: number; h: number }, more = 0) =>
  u >= r.u - more && u < r.u + r.w + more && v >= r.v - more && v < r.v + r.h + more;

/** What the mountain's ground is made of. */
export type MountainGround = "cliff" | "stair" | "road" | "grass" | "wood" | "rock" | "snow";
/** The ground at a point: a cliff's face or a stair up it, a trail, or what the terrace there is floored with. */
export function mountainGround(u: number, v: number): MountainGround {
  if (OFF) return "grass";
  const c = cliffAt(u, v);
  if (c) return STAIRS[c.k].some((s) => v >= s && v < s + 2) ? "stair" : "cliff";
  if (onTrail(u, v)) return "road";
  const t = terraceAt(u, v);
  // the foot yard: grass, stony under the cliff and about the mine's mouth
  if (t === 0) return u - (cliffTop(0, v) + CLIFF) < 1.1 + 1.6 * patch(u, v, 1) || Math.hypot(u - MOUTH_AT.u - 1.5, v - MOUTH_AT.v) < 3.4 ? "rock" : "grass";
  // the slope: the needle-strewn floor of a pine wood, with a few grassy glades (the cedar's is one)
  if (t === 1) return patch(u, v, 2) > 0.7 || Math.hypot(u - ANCIENT.u - 1.5, v - ANCIENT.v - 1.5) < 4.2 ? "grass" : "wood";
  // the upper terrace: stony, with grass between the stones
  if (t === 2) return patch(u, v, 3) > 0.56 ? "grass" : "rock";
  // the summit: snow, bare rock showing through it here and there and about the lookout
  return patch(u, v, 4) > 0.72 || Math.hypot(u - LOOKOUT.u - LOOKOUT.w / 2, v - LOOKOUT.v - LOOKOUT.h / 2) < 3.3 + 0.4 * Math.sin(Math.atan2(v - LOOKOUT.v, u - LOOKOUT.u) * 5) ? "rock" : "snow";
}

/**
 * Something standing on the mountain, in the mountain's own tiles. A tree has its kind (`tier`: 1 a pine, 2 an
 * ironwood, 3 a moonwood); a rock, which of its looks. Each tree and each rock that will be worked has a number of
 * its own (`id`): its place among the mountain's trees, or among its rocks, in the order the seed laid them. It is
 * the same on every screen and stays so for as long as the layout is as it is (mountain.test.ts holds a few by name).
 * How a tree looks just now (a stump, a sprout, a young tree, grown) and whether a rock still stands are not the
 * layout's to say: whoever keeps the game says, and the map draws that.
 */
export interface MountainProp {
  kind: "mtree" | "mrock" | "campfire" | "logseat" | "storebox" | "bench" | "msign" | "tree" | "pine" | "bush" | "flowers" | "boulder" | "log";
  u: number; v: number; solid: boolean; facing?: Facing; tier?: 1 | 2 | 3; look?: number; id?: number;
}
/** A tree's four looks, by its age: a stump, a sprout, a young tree, grown. */
export type TreeAge = 0 | 1 | 2 | 3;
/**
 * An age for a tree to be shown at where nobody keeps the game yet, so that all four looks can be seen (the preview
 * asks for it; left alone, every tree is grown): of every eleven trees of a kind, by their numbers, one is a stump,
 * one a sprout and one a young tree.
 */
export const sampleAge = (id: number): TreeAge => (id % 11 === 3 ? 0 : id % 11 === 6 ? 1 : id % 11 === 8 ? 2 : 3);

/** Whether a tile is the map's rim: its outermost ring, but for the two rows the gate is in. */
const isRim = (u: number, v: number) => u === 0 || v === 0 || v === MOUNTAIN_H - 1 || (u === MOUNTAIN_W - 1 && !(GATE_ROWS as readonly number[]).includes(v));
/** Whether a tile is closed by the ground itself: a cliff's face (but for its stairs), or the rim. */
export const shut = (u: number, v: number) => isRim(u, v) || (!!cliffAt(u + 0.5, v + 0.5) && !stairAt(u + 0.5, v + 0.5));

/**
 * What stands about the mountain, laid out by a fixed seed like the town and the forest: the same on every screen.
 * Nothing solid stands on a trail or beside one, beside a cliff or a stair, on the rim's inside, or touching another
 * solid thing even at a corner: so every solid thing has open ground all round it, and nothing but the cliffs ever
 * shuts a way.
 */
export function layMountain(): MountainProp[] {
  if (OFF) return [];
  const out: MountainProp[] = [];
  const solid = new Set<string>(), used = new Set<string>();
  let trees = 0, rocks = 0;
  const put = (p: MountainProp) => {
    // (a tree and a rock are numbered as they are laid, each kind from nought)
    out.push(p.kind === "mtree" ? { ...p, id: trees++ } : p.kind === "mrock" ? { ...p, id: rocks++ } : p);
    used.add(`${p.u},${p.v}`);
    if (p.solid) solid.add(`${p.u},${p.v}`);
  };
  const ground = (u: number, v: number) => mountainGround(u + 0.5, v + 0.5);
  // the camp: its fire, four logs to sit on along its two far sides (each facing the fire and whoever looks on), and
  // the storage chest beside it
  put({ kind: "campfire", u: CAMP.u, v: CAMP.v, solid: true });
  for (const [du, dv, facing] of [[-2, -1, "SE"], [-2, 0, "SE"], [-1, -2, "SW"], [0, -2, "SW"]] as const) put({ kind: "logseat", u: CAMP.u + du, v: CAMP.v + dv, solid: true, facing });
  put({ kind: "storebox", u: CAMP.u + 3, v: CAMP.v - 3, solid: true });
  // a signpost where the trails part
  put({ kind: "msign", u: 63, v: 28, solid: true });
  // the lookout's bench: sat on with one's back to the map, looking out
  put({ kind: "bench", u: LOOKOUT.u + 2, v: LOOKOUT.v + 1, solid: true, facing: "NW" });
  // kept clear: the cedar's own tiles and a step round them, the lookout, the camp, the way in and the mouth's front
  const kept = (u: number, v: number) => inBox(u, v, ANCIENT, 1) || inBox(u, v, LOOKOUT, 1) || Math.hypot(u - CAMP.u, v - CAMP.v) < 4.6
    || (u >= MOUNTAIN_W - 6 && Math.abs(v + 0.5 - 30) < 3) || Math.hypot(u + 0.5 - MOUTH_AT.u - 1, v + 0.5 - MOUTH_AT.v) < 4.2;
  let a = 20261008;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const around = (u: number, v: number, is: (x: number, y: number) => boolean) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (is(u + dx, v + dy)) return true;
    return false;
  };
  const hard = (u: number, v: number) => { const g = ground(u, v); return g === "cliff" || g === "stair" || g === "road"; };
  /** So many things on a terrace, each made from a number of its own; solid ones clear of everything all round. */
  const grow = (n: number, terrace: Terrace, make: (k: number) => Omit<MountainProp, "u" | "v">) => {
    for (let tries = 0, placed = 0; placed < n && tries < n * 80; tries++) {
      const u = 2 + Math.floor(rnd() * (MOUNTAIN_W - 4)), v = 2 + Math.floor(rnd() * (MOUNTAIN_H - 4)), k = rnd();
      if (used.has(`${u},${v}`) || kept(u, v) || hard(u, v) || terraceAt(u + 0.5, v + 0.5) !== terrace) continue;
      const p = make(k);
      if (p.solid && (around(u, v, (x, y) => solid.has(`${x},${y}`)) || around(u, v, hard) || around(u, v, isRim))) continue;
      put({ ...p, u, v });
      placed++;
    }
  };
  // the slope: sixty pines (trees 0 to 59), forty plain rocks (rocks 0 to 39)
  grow(60, 1, () => ({ kind: "mtree", tier: 1, solid: true }));
  grow(40, 1, (k) => ({ kind: "mrock", look: Math.floor(k * 3), solid: true }));
  // the upper terrace: forty ironwoods (trees 60 to 99), and a few rocks
  grow(40, 2, () => ({ kind: "mtree", tier: 2, solid: true }));
  grow(8, 2, (k) => ({ kind: "mrock", look: Math.floor(k * 3), solid: true }));
  // the summit: twenty moonwoods (trees 100 to 119), and a few rocks
  grow(20, 3, () => ({ kind: "mtree", tier: 3, solid: true }));
  grow(6, 3, (k) => ({ kind: "mrock", look: Math.floor(k * 3), solid: true }));
  // the foot yard: a few of the town's own trees and bushes, a boulder or two, a fallen log
  grow(14, 0, (k) => ({ kind: k < 0.6 ? "tree" : k < 0.8 ? "bush" : k < 0.93 ? "boulder" : "log", solid: true }));
  // flowers underfoot, on the grass of the yard and the slope's glades
  for (const terrace of [0, 1, 2] as const) grow(terrace === 0 ? 26 : 10, terrace, () => ({ kind: "flowers", solid: false }));
  // the rim: something on every other tile of the map's edge (all of it is closed), so that the world ends behind it:
  // the town's own trees about the yard, its pines and rocks higher up, and only rocks on the summit. None of the
  // mountain's three kinds of tree: those are counted, and each is one that will be felled
  for (let v = 0; v < MOUNTAIN_H; v++) for (let u = 0; u < MOUNTAIN_W; u++) {
    if (!isRim(u, v) || (u + v) % 2 || used.has(`${u},${v}`) || hard(u, v)) continue;
    // (nothing beside the gate: its gateway stands there, and whoever comes in is not to arrive behind a tree)
    if (u === MOUNTAIN_W - 1 && Math.abs(v - 29.5) < 3) continue;
    const t = terraceAt(u + 0.5, v + 0.5), k = rnd();
    put(t === 0 ? { kind: k < 0.7 ? "tree" : "boulder", u, v, solid: true }
      : t === 3 || k < 0.45 ? { kind: "boulder", u, v, solid: true } : { kind: "pine", u, v, solid: true });
  }
  return out;
}

/**
 * The mountain's tiles that stop a walker, by their own (u, v): the cliffs' faces and the rim, what stands on them,
 * and the ancient cedar's nine. The lookout's deck is walked on.
 */
export function closedOf(props: readonly MountainProp[]): Set<string> {
  if (OFF) return new Set();
  const out = new Set(props.filter((p) => p.solid).map((p) => `${p.u},${p.v}`));
  for (let v = 0; v < MOUNTAIN_H; v++) for (let u = 0; u < MOUNTAIN_W; u++) if (shut(u, v) || inBox(u, v, ANCIENT)) out.add(`${u},${v}`);
  return out;
}
