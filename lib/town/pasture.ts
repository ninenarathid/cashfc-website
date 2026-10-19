/**
 * Where the pasture's places are: the farm's new north-east rows (local y -32..-1, global x 128..187), shared by the
 * page's map (lib/town/world.ts), the trial and the database's catalog row `animals` (v291). The page piece owns the
 * layout and may move these; whatever it settles is what the catalog carries.
 *
 * The garden's origin stays (128, 0): nothing of the vegetable garden moves. The pasture is laid out in its own
 * tiles here, and world.ts asks this file what stands on a pasture tile and what its ground is. Nothing here imports
 * world.ts (world.ts imports this), so everything is in global tiles and plain numbers.
 *
 * The plan, as the screen sees it (the pasture lies up and to the right of the garden):
 * - the gate: in a gap of the old rim's trees (garden rows 0..2, columns 27..29, where no tree ever stood), at the
 *   pasture's first row, with a fence either side of it; members walk through it at any hour, open or shut;
 * - a lane on from the gate to a lane across the pasture; Uncle Popoto's stall and the making table east of the gate,
 *   the hay wagon's stop west of it, the village water trough at the crossing;
 * - the barn (cows, sheep) in the west with its dirt yard, its trough and the breeding nest at its door;
 * - the coop (chickens, ducks) in the east with the nursery hut, its yard and its trough; the duck pond north of it;
 * - the meadow over the rest, with woods along the far rim.
 */
export const PASTURE = {
  /** Rows added north-east of the farm's old rim, at negative local y. */
  rows: 32,
  /** The farm's origin (unchanged) and its bounds with the pasture: x 128..187, y -32..85. */
  origin: [128, 0] as const,
  rect: [128, -32, 60, 118] as const,
} as const;

/** The pasture's own rows, in global tiles. */
export const PASTURE_AREA = { x: 128, y: -32, w: 60, h: 32 } as const;
const X0 = PASTURE_AREA.x;
type Rect = { x: number; y: number; w: number; h: number };
const inRect = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
/** Whether a tile (or a point) is in the pasture's rows. */
export const inPasture = (x: number, y: number) => inRect(x, y, PASTURE_AREA);

/* ── the places ── */

/** The village's gate between the meadow and the garden: the three tiles members and animals pass, and its two posts. */
export const GATE = { x: X0 + 27, y: -1, w: 3, posts: [[X0 + 26, -1], [X0 + 30, -1]] as ReadonlyArray<readonly [number, number]> } as const;
/** The barn (cows and sheep) and the coop (chickens and ducks), the nursery hut beside the coop: the ground each stands on. */
export const BARN: Rect = { x: X0 + 6, y: -21, w: 9, h: 6 };
export const COOP: Rect = { x: X0 + 40, y: -19, w: 6, h: 4 };
export const NURSERY: Rect = { x: X0 + 46, y: -18, w: 3, h: 3 };
/** Their dirt yards, where the animals keep while the gate is shut. */
export const BARN_YARD: Rect = { x: X0 + 3, y: -24, w: 19, h: 14 };
export const COOP_YARD: Rect = { x: X0 + 37, y: -22, w: 16, h: 12 };
/** The duck pond, an ellipse (global tiles). */
export const POND = { cx: X0 + 51.5, cy: -27, rx: 6.5, ry: 4.2 } as const;
/** The troughs (two tiles each, their west tile named): one at each building, and the village's water trough at the crossing. */
export const TROUGHS = { barn: [X0 + 16, -13] as const, coop: [X0 + 41, -13] as const, village: [X0 + 31, -11] as const };
/** The breeding nest, at the barn's door. */
export const NEST = [X0 + 10, -14] as const;
/** Uncle Popoto's stall (what he stands at, and where he stands), east of the gate; and the making table beside it. */
export const POPOTO = { stand: { x: X0 + 33.5, y: -3.4 }, at: { x: X0 + 33.1, y: -2.45 }, tiles: [[X0 + 32, -4], [X0 + 33, -4], [X0 + 34, -4], [X0 + 33, -3]] as ReadonlyArray<readonly [number, number]> } as const;
export const TABLE = [X0 + 37, -4] as const;
/** The lanes: on from the gate, and across the pasture. */
const LANE_NS: Rect = { x: X0 + 28, y: -9, w: 2, h: 8 };
const LANE_EW: Rect = { x: X0 + 3, y: -9, w: 54, h: 2 };

/** The hay wagon's stops: one by each map's gate (a new map adds one here and nothing else). */
export const WAGON_STOPS: Readonly<Record<string, readonly [number, number]>> = {
  farm: [X0 + 23, -3],
  town: [57, 32],
  forest: [190, 186],
};

/* ── the spots the database knows ── */

/** Spots of the meadow where a bird out may lay (global tiles); `SpotOf` picks one by a seed. */
export const EGG_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [134, -27], [139, -25], [145, -28], [150, -26], [155, -28], [160, -25], [164, -28], [152, -20], [157, -14], [162, -22], [147, -12], [154, -11],
  [165, -12], [178, -13], [181, -19], [183, -15], [137, -5], [143, -6], [148, -4], [165, -6], [171, -5], [177, -4], [183, -7], [132, -12],
];
export const spotOf = (seed: number): [number, number] => {
  const s = EGG_SPOTS[((seed % EGG_SPOTS.length) + EGG_SPOTS.length) % EGG_SPOTS.length];
  return [s[0], s[1]];
};
/** The meadow's twelve forage spots (lib/town/animals' MEADOW), in their order. */
export const MEADOW_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [133, -27], [140, -28], [147, -26], [153, -29], [159, -27], [165, -26], [168, -29], [150, -21], [158, -18],
  [161, -13], [136, -7], [184, -10],
];
// (the woods are laid clear of every spot)
const SPOT_SET: ReadonlySet<string> = new Set([...EGG_SPOTS, ...MEADOW_SPOTS].map(([x, y]) => `${x},${y}`));

/* ── what stands about the pasture ── */

export type PastureProp = { kind: "tree" | "pine" | "bush" | "fence"; x: number; y: number; solid: boolean; across?: boolean };
/** A seeded random number, as the town's layouts draw them. */
const seeded = (seed: number) => { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const inPond = (x: number, y: number, more = 0) => (((x + 0.5 - POND.cx) / (POND.rx + more)) ** 2 + ((y + 0.5 - POND.cy) / (POND.ry + more)) ** 2) < 1;
const onLane = (x: number, y: number) => inRect(x, y, LANE_NS) || inRect(x, y, LANE_EW);
const onYard = (x: number, y: number) => inRect(x, y, BARN_YARD) || inRect(x, y, COOP_YARD);
const builtOn = (x: number, y: number) => inRect(x, y, BARN) || inRect(x, y, COOP) || inRect(x, y, NURSERY);
const troughAt = (x: number, y: number) => Object.values(TROUGHS).some(([tx, ty]) => y === ty && (x === tx || x === tx + 1));
const stallAt = (x: number, y: number) => POPOTO.tiles.some(([tx, ty]) => tx === x && ty === y) || (y === TABLE[1] && (x === TABLE[0] || x === TABLE[0] + 1));
const stopAt = (x: number, y: number) => Math.abs(x - WAGON_STOPS.farm[0]) <= 1 && Math.abs(y - WAGON_STOPS.farm[1]) <= 1;

/** The fence along the pasture's first row either side of the gate (three tiles a length), and the woods along its far rim. */
export const PASTURE_PROPS: PastureProp[] = (() => {
  const out: PastureProp[] = [];
  // (the whole width, the posts either side of the gate at the ends of the two runs)
  for (let u = 1; u <= 25; u += 3) out.push({ kind: "fence", x: X0 + u, y: -1, solid: true, across: true });
  for (let u = 31; u <= 58; u += 3) out.push({ kind: "fence", x: X0 + u, y: -1, solid: true, across: true });
  const rnd = seeded(20261020), taken = new Set<string>();
  for (let tries = 0, placed = 0; placed < 70 && tries < 6000; tries++) {
    const u = Math.floor(rnd() * PASTURE_AREA.w), v = -PASTURE_AREA.h + Math.floor(rnd() * PASTURE_AREA.h), kind = rnd();
    const x = X0 + u;
    // (the far rim: its last three rows and the two edges; never on a lane, a yard, the pond's shore or a spot)
    if (!(v <= -30 || u >= 57 || u <= 1) || v >= -2) continue;
    if (taken.has(`${x},${v}`) || onLane(x, v) || onYard(x, v) || inPond(x, v, 1.2) || SPOT_SET.has(`${x},${v}`)) continue;
    taken.add(`${x},${v}`);
    out.push({ kind: kind < 0.45 ? "tree" : kind < 0.75 ? "pine" : "bush", x, y: v, solid: true });
    placed++;
  }
  return out;
})();
/** The fence's tiles (a length is three tiles across, as the screen sees it) and every other prop's own tile. */
const propTiles = (p: PastureProp): Array<[number, number]> => (p.kind === "fence" ? [[p.x - 1, p.y], [p.x, p.y], [p.x + 1, p.y]] : [[p.x, p.y]]);
const solidSet: ReadonlySet<string> = new Set(PASTURE_PROPS.filter((p) => p.solid).flatMap((p) => propTiles(p).map(([a, b]) => `${a},${b}`)));

/** The ground of the pasture at a point (for drawing; a tile is what its middle is). */
export type PastureGround = "grass" | "road" | "sand" | "water";
export function pastureGround(x: number, y: number): PastureGround {
  const tx = Math.floor(x), ty = Math.floor(y);
  // (the pond's edge drawn round, a little ragged)
  if (((x - POND.cx) / POND.rx) ** 2 + ((y - POND.cy) / POND.ry) ** 2 < 1 + 0.06 * Math.sin(x * 2.1) * Math.sin(y * 1.7)) return "water";
  if (onLane(tx, ty)) return "road";
  if (onYard(tx, ty)) return "sand";
  return "grass";
}
/** What stands on a pasture tile and stops a walker: a building, a trough, the stall, the nest, a fence, a tree; "water" for the pond. */
export function pastureThing(x: number, y: number): "prop" | "water" | null {
  if (!inPasture(x, y)) return null;
  if (inPond(x, y)) return "water";
  if (builtOn(x, y) || troughAt(x, y) || stallAt(x, y) || (x === NEST[0] && y === NEST[1])) return "prop";
  if (GATE.posts.some(([px, py]) => px === x && py === y)) return "prop";
  return solidSet.has(`${x},${y}`) ? "prop" : null;
}

/* ── where an animal is: drawn the same on every page, from its id, its home and the clock (as lib/town/critters) ── */

export type Home = "barn" | "coop";
export const homeOf = (species: string): Home => (species === "cow" || species === "sheep" ? "barn" : "coop");
export type Pose = "walk" | "idle" | "eat" | "sleep" | "swim";
export interface AnimalSpot { x: number; y: number; right: boolean; pose: Pose }

export const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mix = (...n: number[]) => { let h = 0x9e3779b9; for (const k of n) { h ^= k + 0x7f4a7c15 + (h << 6) + (h >>> 2); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0; } return (h >>> 0) / 4294967296; };
/** Free tiles of an area: no building, trough, prop or water on them, and not the wagon's stop. */
const free = (r: Rect, also?: (x: number, y: number) => boolean): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!pastureThing(x, y) && !stopAt(x, y) && (!also || also(x, y))) out.push([x, y]);
  return out;
};
type Areas = Record<"barn" | "coop" | "meadow" | "pond" | "lanes" | "barnYoung" | "coopYoung", Array<[number, number]>>;
let areas: Areas | null = null;
function areasOf(): Areas {
  if (areas) return areas;
  // (in front of and beside each building, in its yard; the young keep by the nursery hut, or at the barn's east end)
  const barnFront = free({ x: BARN_YARD.x + 1, y: BARN.y + BARN.h, w: BARN_YARD.w - 2, h: BARN_YARD.y + BARN_YARD.h - BARN.y - BARN.h - 1 });
  const barnSide = free({ x: BARN.x + BARN.w + 1, y: BARN_YARD.y + 1, w: BARN_YARD.x + BARN_YARD.w - BARN.x - BARN.w - 2, h: BARN_YARD.h - 2 });
  const coopFront = free({ x: COOP_YARD.x + 1, y: COOP.y + COOP.h, w: COOP_YARD.w - 2, h: COOP_YARD.y + COOP_YARD.h - COOP.y - COOP.h - 1 });
  const coopSide = free({ x: COOP_YARD.x + 1, y: COOP_YARD.y + 1, w: 2, h: COOP_YARD.h - 2 });
  const meadow = [...free({ x: X0 + 3, y: -29, w: 52, h: 5 }, (x, y) => !inPond(x, y, 1)), ...free({ x: X0 + 23, y: -24, w: 13, h: 13 })];
  const shore: Array<[number, number]> = [];
  for (let a = 0; a < 18; a++) { const t = (a / 18) * Math.PI * 2; shore.push([Math.floor(POND.cx + Math.cos(t) * (POND.rx - 1.8)), Math.floor(POND.cy + Math.sin(t) * (POND.ry - 1.3))]); }
  // (the garden's lanes, when the gate is open: the lane north to south, and the first lane across)
  const lanes: Array<[number, number]> = [];
  for (let v = 4; v < 40; v += 2) lanes.push([X0 + 29, v]);
  for (let u = 6; u < 55; u += 3) lanes.push([X0 + u, 21]);
  areas = { barn: [...barnFront, ...barnSide], coop: [...coopFront, ...coopSide], meadow, pond: shore, lanes, barnYoung: barnSide,
    coopYoung: free({ x: NURSERY.x - 1, y: NURSERY.y + NURSERY.h, w: 5, h: 3 }) };
  return areas;
}
/** Bangkok hours an animal lies down in, wherever it is. */
const NIGHT = { from: 19, to: 5 };
const HOUR = 3_600_000;
const bkHour = (t: number) => new Date(t + 7 * HOUR).getUTCHours();
export const asleepAt = (t: number) => { const h = bkHour(t); return h >= NIGHT.from || h < NIGHT.to; };
/** When the night a moment is in began (the last 19:00 in Bangkok). */
const nightBegan = (t: number) => {
  const h = bkHour(t), midnight = Math.floor((t + 7 * HOUR) / (24 * HOUR)) * 24 * HOUR - 7 * HOUR;
  return h >= NIGHT.from ? midnight + NIGHT.from * HOUR : midnight - 24 * HOUR + NIGHT.from * HOUR;
};
/** How fast each kind walks, in tiles a second. */
const PACE: Record<string, number> = { cow: 0.55, sheep: 0.7, chicken: 1.3, duck: 0.9 };

/**
 * Where an animal is at a moment, and what it does: wandering its home yard while the gate is shut (the young by the
 * nursery or the barn's side), the meadow, the pond and the garden's lanes while it is open, lying down where it was
 * at nightfall. `open(t)` says whether the gate stood open at a moment (lib/town/animals' gateAt). Purely for drawing:
 * nothing of the game hangs on where an animal is.
 */
export function animalSpot(id: string, species: string, young: boolean, now: number, open: (t: number) => boolean, night = asleepAt(now)): AnimalSpot {
  if (night) { const at = wander(id, species, young, nightBegan(now), open); return { x: at.x, y: at.y, right: at.right, pose: at.pose === "swim" ? "swim" : "sleep" }; }
  return wander(id, species, young, now, open);
}
function wander(id: string, species: string, young: boolean, now: number, open: (t: number) => boolean): AnimalSpot {
  const seed = hashStr(id), a = areasOf(), slotMs = 9_000 + (seed % 7) * 1000, off = seed % slotMs;
  const k = Math.floor((now + off) / slotMs), into = now + off - k * slotMs;
  const pointOf = (n: number): { x: number; y: number; eat: boolean; swim: boolean } => {
    const out = open(n * slotMs - off), home = homeOf(species);
    // (now and then to the trough, while home)
    if (!out && !young && mix(seed, n, 3) < 0.18) { const t = TROUGHS[home]; return { x: t[0] + 0.5 + (mix(seed, 11) - 0.5) * 1.4, y: t[1] + 1.4, eat: true, swim: false }; }
    const r = mix(seed, n, 5);
    const list = out ? (species === "duck" ? (r < 0.55 ? a.pond : a.meadow) : r < 0.22 ? a.lanes : a.meadow)
      : young ? (home === "barn" ? a.barnYoung : a.coopYoung)
        : species === "duck" && r < 0.35 ? a.pond : a[home];
    const swim = list === a.pond;
    const p = list[Math.floor(mix(seed, n, 7) * list.length) % Math.max(1, list.length)] ?? [NEST[0], NEST[1] + 1];
    return { x: p[0] + 0.25 + mix(seed, n, 1) * 0.5, y: p[1] + 0.25 + mix(seed, n, 2) * 0.5, eat: !swim && mix(seed, n, 4) < 0.4, swim };
  };
  const from = pointOf(k - 1), to = pointOf(k);
  const d = Math.hypot(to.x - from.x, to.y - from.y), walkMs = (d / (PACE[species] ?? 0.8)) * 1000 * (young ? 0.8 : 1);
  const right = to.x - to.y - (from.x - from.y) >= 0;
  if (into < walkMs && d > 0.05) {
    const f = into / walkMs;
    return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, right, pose: to.swim && f > 0.85 ? "swim" : "walk" };
  }
  return { x: to.x, y: to.y, right: mix(seed, k, 6) < 0.5 ? right : !right, pose: to.swim ? "swim" : to.eat ? "eat" : "idle" };
}
