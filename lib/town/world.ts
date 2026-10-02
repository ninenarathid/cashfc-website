/**
 * Cash Town's ground: the map, where you can walk, how to get there, and how
 * loud somebody is from where you stand.
 *
 * Pure functions, so the rules of the town can be tested without a browser
 * and every client works them out the same way. A move is sent as one
 * destination, not a stream of positions (the Zheza way): each client finds
 * the same path on the same map and walks the avatar along it, which is why
 * the path has to come from here and not from whoever happens to be drawing.
 *
 * Coordinates are tiles, continuous: tile (i, j) covers [i, i+1) × [j, j+1)
 * and its centre is (i + 0.5, j + 0.5). x runs down to the right on screen,
 * y down to the left; the isometric diamond is 2:1.
 */

export const COLS = 64;
export const ROWS = 64;
/** One tile on screen, before the town is scaled to fit. */
export const TILE_W = 64;
export const TILE_H = 32;

/** Walking speed, tiles a second. */
export const SPEED = 3.5;

/**
 * Deliveries a second the whole room's steps may cost, at most: half the
 * project's realtime allowance (500 a second, shared with the party board and
 * the bell), even if everybody clicks as fast as they can.
 */
export const MOVE_BUDGET = 250;

/**
 * How often somebody's steps may be announced, ms, with `n` people in the
 * room. Every announcement is delivered to the n − 1 others, so a room of n
 * all clicking nonstop costs n × (n − 1) × 1000 / every deliveries a second.
 * A step after standing still goes at once; only a burst of taps waits, and
 * then sends the last one.
 */
export function moveEvery(n: number): number {
  return Math.max(300, Math.ceil((n * (n - 1) * 1000) / MOVE_BUDGET));
}

/**
 * Whether distance matters to the voice. Off for now (the owner's call on
 * 2026-10-01): one room where everybody in voice hears everybody at full
 * volume, while the FC finds out how many one room holds. On, a voice fades
 * with distance (NEAR, FAR) and lines open nearest first (pickLines), the way
 * Gather works; everything for that is kept below.
 */
export const PROXIMITY = false;

/**
 * Hearing, when PROXIMITY is on: full volume within NEAR tiles, fading to
 * nothing at FAR. Close enough to feel like walking up to somebody, far enough
 * that two people on either side of the plaza are not in each other's ear.
 */
export const NEAR = 3.5;
export const FAR = 7;

export type Vec = { x: number; y: number };

export interface Building {
  id: string;
  /** Where it leads: a page of the site, so the town is a front door to it. */
  href: string;
  name: { th: string; en: string };
  /** Footprint in tiles, top corner (x, y), size w × h. Not walkable. */
  x: number; y: number; w: number; h: number;
  /** Wall height in unscaled pixels. */
  height: number;
  /** Roof, right wall, left wall. */
  colors: [string, string, string];
  icon: string;
}

/**
 * Buildings that lead to pages of the site. None for now (the owner's call,
 * 2026-10-02: the four houses of the first map went, for a bigger open town);
 * kept so a building can come back as a front door to a page.
 */
export const BUILDINGS: Building[] = [];

/**
 * The map (64 × 64 tiles, the owner's call on 2026-10-02: "ขอ Map ใหญ่กว่านี้อีก
 * ส่วนแรกจะเป็นเมืองเริ่มต้น"): the starter town in the middle, around a cobbled
 * plaza with the fountain, and the countryside all round it. Two paths cross the
 * whole map through the plaza.
 */
export const PLAZA = { x: 26, y: 26, w: 12, h: 12 };
/** The fountain in the middle of the plaza: a landmark, and not walkable. */
export const FOUNTAIN = { x: 31, y: 31, w: 2, h: 2 };
/** The starter town: lamps, benches and planters inside; woods and meadows outside. */
export const TOWN = { x: 16, y: 16, w: 32, h: 32 };
/**
 * Popoto Shop, being built (stage 1 of 3: the foundation, popoto workers on
 * site). Where things will be bought; not walkable.
 */
export const SHOP = { x: 39, y: 24, w: 3, h: 3, stage: 1 };
/**
 * The Popoto Board: a big notice board just north of the plaza, in the middle
 * of the map, telling the town how the building work goes and taking votes for
 * the next building (supabase v103). Not walkable; a tap on it opens it.
 */
export const BOARD = { x: 23, y: 23, w: 2, h: 2 };

/**
 * A river round the left of the map (the owner's call, 2026-10-02: "แม่น้ำขนาด
 * กลางที่ยังไม่สามารถข้ามได้"), three tiles wide with sandy banks. It runs down
 * the screen, so it cuts the west and the south paths about as far from the
 * plaza as each other; the far side waits for a bridge. On screen the left is
 * y − x, and down is x + y, so the river's middle wanders in y − x as it goes
 * down.
 */
export function riverMiddle(t: number): number {
  return 24 + 2.4 * Math.sin(t / 9) + 1.2 * Math.sin(t / 4.3 + 1);
}
/** How far a point is across the river from its middle, in tiles of y − x. */
const acrossRiver = (x: number, y: number) => Math.abs(y - x - riverMiddle(x + y - 1));
/** Tiles, by their middles: water, and the sandy bank beside it. */
const isWater = (x: number, y: number) => acrossRiver(x + 0.5, y + 0.5) < 1.6;
const isBank = (x: number, y: number) => !isWater(x, y) && acrossRiver(x + 0.5, y + 0.5) < 3.2;

/**
 * The paths (the owner's call, 2026-10-02: "ทางเดินให้ดูธรรมชาติกว่านี้ ตอนนี้มัน
 * ดูตรงเกินไป"): four dirt paths leave the plaza's four sides, straight at its
 * mouth and wandering more the further they go, a little wider here and a
 * little narrower there. They are shapes, not tiles: the ground is drawn from
 * them point by point, so a bend is a curve on screen; a tile is path when its
 * middle is.
 */
const MOUTH = 32;
/** 0 at the plaza's side, 1 from seven tiles out: how much a path may wander. */
function bend(d: number): number {
  const k = Math.min(1, Math.max(0, d / 7));
  return k * k * (3 - 2 * k);
}
/** Where a path's middle is, across it, at a point along it. */
function pathMiddle(along: number, out: number, seed: number): number {
  return MOUTH + bend(out) * (2.4 * Math.sin(along / 6.2 + seed) + 0.9 * Math.sin(along / 2.6 + seed * 2.3));
}
/** Half a path's width at a point along it. */
function pathHalf(along: number, seed: number): number {
  return 1 + 0.16 * Math.sin(along / 3.1 + seed) + 0.07 * Math.sin(along * 1.7 + seed);
}
/** The four paths: which way each runs, and its own shape. */
const ARMS = [
  { dir: "N", seed: 1.3 }, { dir: "S", seed: 4.1 }, { dir: "W", seed: 2.2 }, { dir: "E", seed: 5.7 },
] as const;
type Arm = (typeof ARMS)[number];
/** A point's place on an arm: how far along, how far out of the plaza, and across. */
function onArm(arm: Arm, x: number, y: number): { along: number; out: number; across: number } | null {
  const P0 = PLAZA.x, P1 = PLAZA.x + PLAZA.w;
  switch (arm.dir) {
    case "N": return y < P0 ? { along: y, out: P0 - y, across: x } : null;
    case "S": return y >= P1 ? { along: y, out: y - P1, across: x } : null;
    case "W": return x < P0 ? { along: x, out: P0 - x, across: y } : null;
    case "E": return x >= P1 ? { along: x, out: x - P1, across: y } : null;
  }
}
/** A short trail off the plaza, over to the shop's plot. (The Popoto Board stands on the grass, no path to it: the owner's call.) */
const TRAILS: Array<[Vec, Vec, number]> = [
  [{ x: 40.5, y: 26.8 }, { x: 37.4, y: 29.2 }, 0.7],
];
function nearSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
/** Whether a point (not a tile) is on a path. */
function pathAt(x: number, y: number): boolean {
  for (const arm of ARMS) {
    const a = onArm(arm, x, y);
    if (a && Math.abs(a.across - pathMiddle(a.along, a.out, arm.seed)) < pathHalf(a.along, arm.seed)) return true;
  }
  for (const [a, b, w] of TRAILS) if (nearSegment({ x, y }, a, b) < w) return true;
  return false;
}

/** Which way something faces, as the screen sees it: down-right, down-left, up-right, up-left. */
export type Facing = "SE" | "SW" | "NE" | "NW";
/** The tile in front of something facing that way (where you stand to sit on a bench). */
export const FRONT: Record<Facing, Vec> = { SE: { x: 1, y: 0 }, SW: { x: 0, y: 1 }, NE: { x: 0, y: -1 }, NW: { x: -1, y: 0 } };

/** What stands about the town, drawn from the scenery picture (lib/town/scenery). */
export type PropKind = "tree" | "pine" | "bush" | "rock" | "lamp" | "bench" | "flowers" | "barrel" | "planter" | "signpost" | "bin" | "flowerbed";
export interface Prop {
  kind: PropKind; x: number; y: number;
  /** Whether it stops a walker (flowers do not). */
  solid: boolean;
  /** Benches: the way the seat faces. */
  facing?: Facing;
}

const within = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const isPlaza = (x: number, y: number) => within(x, y, PLAZA);
const isShop = (x: number, y: number) => within(x, y, SHOP);
const isRoad = (x: number, y: number) => !isPlaza(x, y) && !isWater(x, y) && !isBank(x, y) && pathAt(x + 0.5, y + 0.5);
const isBoard = (x: number, y: number) => within(x, y, BOARD);

/**
 * Road works (the owner's call, 2026-10-02): the north and east paths, the two
 * the river does not cut, are closed where they leave the map, "กำลังซ่อม
 * ทางเดิน", with a barrier across each and a popoto worker waving a flag.
 * Where each stands: the path's middle a tile in from the map's edge.
 */
export const ROADWORKS: Array<{ x: number; y: number; arm: "N" | "E" }> = (["N", "E"] as const).map((dir) => {
  const arm = ARMS.find((a) => a.dir === dir)!;
  const along = dir === "N" ? 1.2 : COLS - 1.2, out = dir === "N" ? PLAZA.y - along : along - PLAZA.x - PLAZA.w;
  const across = pathMiddle(along, out, arm.seed);
  return dir === "N" ? { x: across, y: along, arm: dir } : { x: along, y: across, arm: dir };
});
/** The tiles the road works close: across the path and a tile beyond each side, two deep. */
const closed = new Set<string>();
for (const w of ROADWORKS) for (let d = -3; d <= 3; d++) for (let k = -1; k <= 0; k++) {
  const x = w.arm === "N" ? Math.floor(w.x) + d : COLS - 1 + k, y = w.arm === "N" ? k + 1 : Math.floor(w.y) + d;
  closed.add(x + "," + y);
}
const isClosed = (x: number, y: number) => closed.has(x + "," + y);

/** Which way faces the fountain from (x, y). */
function towardFountain(x: number, y: number): Facing {
  const dx = FOUNTAIN.x + FOUNTAIN.w / 2 - (x + 0.5), dy = FOUNTAIN.y + FOUNTAIN.h / 2 - (y + 0.5);
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "SE" : "NW";
  return dy > 0 ? "SW" : "NE";
}

/**
 * The town's scenery, laid out by a fixed seed so every screen has the same
 * town: in town, lamps round the plaza and along the paths, benches facing the
 * fountain and the paths, planters at the plaza's corners; outside, woods and
 * meadows. Nothing grows on a path, the plaza or the shop's plot, nor right
 * beside them, so nobody's way is blocked.
 */
export const PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  const taken = new Set<string>();
  const put = (kind: PropKind, x: number, y: number, solid = true, facing?: Facing) => {
    out.push(facing ? { kind, x, y, solid, facing } : { kind, x, y, solid }); taken.add(`${x},${y}`);
  };
  // The layout (the owner's call, 2026-10-02: "ไฟถนน ม้านั่ง ควรจัดให้ดีกว่านี้"): the plaza
  // has a lamp and a flower bed at each corner and benches round the fountain, facing it, a
  // bin at the end of each pair, and a signpost; each path is lit on both sides where it
  // leaves the plaza, then has two resting places on the way out of town, a bench facing
  // the path with a bin and flowers beside it and a lamp across the way, on alternate sides.
  for (const [x, y] of [[26, 26], [37, 26], [26, 37], [37, 37]]) put("lamp", x, y);
  for (const [x, y] of [[27, 27], [36, 27], [27, 36], [36, 36]]) put("flowerbed", x, y);
  for (const [x, y] of [[31, 28], [32, 28], [28, 31], [28, 32], [35, 31], [35, 32], [31, 35], [32, 35]]) put("bench", x, y, true, towardFountain(x, y));
  for (const [x, y] of [[33, 28], [28, 30], [35, 33], [30, 35]]) put("bin", x, y);
  put("signpost", 34, 29);
  /** The tile just off an arm's side at a point along it: -1 the low side, 1 the high side. */
  const beside = (arm: Arm, along: number, side: -1 | 1): Vec => {
    const upDown = arm.dir === "N" || arm.dir === "S";
    const out = along < PLAZA.x ? PLAZA.x - along : along - PLAZA.x - PLAZA.w;
    const mid = pathMiddle(along + 0.5, out + 0.5, arm.seed), half = pathHalf(along + 0.5, arm.seed);
    let across = Math.floor(mid + side * (half + 0.2));
    while (upDown ? isRoad(across, along) : isRoad(along, across)) across += side;
    return upDown ? { x: across, y: along } : { x: along, y: across };
  };
  /** Where a point `out` tiles from the plaza is along an arm. */
  const alongAt = (arm: Arm, out: number) => (arm.dir === "N" || arm.dir === "W" ? PLAZA.x - 1 - out : PLAZA.x + PLAZA.w + out);
  /** The way a bench beside an arm faces to look at the path. */
  const facingPath = (arm: Arm, side: -1 | 1): Facing =>
    arm.dir === "N" || arm.dir === "S" ? (side < 0 ? "SE" : "NW") : (side < 0 ? "SW" : "NE");
  /** Put something down only where nothing is and nobody walks a path. */
  const free = (p: Vec) => !taken.has(`${p.x},${p.y}`) && !isRoad(p.x, p.y) && !isPlaza(p.x, p.y) && !isShop(p.x, p.y) && !isBoard(p.x, p.y);
  ARMS.forEach((arm, i) => {
    // lit on both sides where it leaves the plaza
    for (const side of [-1, 1] as const) { const p = beside(arm, alongAt(arm, 1), side); if (free(p)) put("lamp", p.x, p.y); }
    // two resting places, on alternate sides, each arm starting on its own side
    const first: -1 | 1 = i % 2 ? 1 : -1;
    for (const [out, side] of [[5, first], [9, -first as -1 | 1]] as const) {
      const at = alongAt(arm, out), bench = beside(arm, at, side);
      if (!free(bench)) continue;
      put("bench", bench.x, bench.y, true, facingPath(arm, side));
      // the bin on the plaza's side of it, flowers on the other
      const toward = arm.dir === "N" || arm.dir === "W" ? 1 : -1;
      const bin = beside(arm, at + toward, side), fl = beside(arm, at - toward, side);
      if (free(bin)) put("bin", bin.x, bin.y);
      if (free(fl)) put("flowers", fl.x, fl.y, false);
      const lamp = beside(arm, at, (-side) as -1 | 1);
      if (free(lamp)) put("lamp", lamp.x, lamp.y);
    }
  });
  let a = 20261002;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clear = (x: number, y: number, r: number) => {
    if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) return false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (taken.has(`${X},${Y}`) || isRoad(X, Y) || isPlaza(X, Y) || isShop(X, Y) || isBoard(X, Y) || isWater(X, Y) || isBank(X, Y) || isClosed(X, Y)) return false;
    }
    return true;
  };
  const scatter = (kind: PropKind, n: number, r: number, inTown: boolean, solid = true) => {
    for (let tries = 0, placed = 0; placed < n && tries < n * 80; tries++) {
      const x = Math.floor(rnd() * COLS), y = Math.floor(rnd() * ROWS);
      if (within(x, y, TOWN) !== inTown || !clear(x, y, r)) continue;
      put(kind, x, y, solid); placed++;
    }
  };
  // town: a few trees and plenty of flowers
  scatter("tree", 14, 1, true); scatter("bush", 12, 1, true); scatter("flowers", 28, 0, true, false);
  // countryside: woods and meadows
  scatter("tree", 150, 0, false); scatter("pine", 90, 0, false); scatter("bush", 60, 0, false);
  scatter("rock", 30, 0, false); scatter("flowers", 90, 0, false, false);
  return out;
})();

/** The benches, in a fixed order: somebody sitting is told to the room by this index. */
export const BENCHES: Prop[] = PROPS.filter((p) => p.kind === "bench");

/** The bench on a tile, as an index into BENCHES, or −1. */
export function benchAt(tx: number, ty: number): number {
  return BENCHES.findIndex((b) => b.x === tx && b.y === ty);
}

const solidAt = new Set(PROPS.filter((p) => p.solid).map((p) => `${p.x},${p.y}`));

/** What stands on a tile and stops a walker, if anything. */
export function thingAt(tx: number, ty: number): Building | "fountain" | "shop" | "board" | "roadworks" | "water" | "prop" | null {
  for (const b of BUILDINGS) if (within(tx, ty, b)) return b;
  if (within(tx, ty, FOUNTAIN)) return "fountain";
  if (isShop(tx, ty)) return "shop";
  if (isBoard(tx, ty)) return "board";
  if (isClosed(tx, ty)) return "roadworks";
  if (isWater(tx, ty)) return "water";
  if (solidAt.has(`${tx},${ty}`)) return "prop";
  return null;
}

/** Can somebody stand on this tile? */
export function walkable(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return thingAt(tx, ty) === null;
}

/** The kind of ground, for drawing. */
export function groundAt(tx: number, ty: number): "plaza" | "road" | "grass" | "water" | "sand" {
  if (isWater(tx, ty)) return "water";
  if (isBank(tx, ty)) return "sand";
  if (isPlaza(tx, ty)) return "plaza";
  if (isRoad(tx, ty) || isShop(tx, ty)) return "road";
  return "grass";
}

/**
 * The ground at a point (not a tile), for drawing: the same shapes as the
 * tiles, but with curved edges, and the river's sand a band of its own that
 * frays a little at its edge.
 */
export function groundLook(x: number, y: number): ReturnType<typeof groundAt> {
  const r = acrossRiver(x, y);
  if (r < 1.6) return "water";
  if (r < 2.5 + 0.22 * Math.sin(x * 1.9) * Math.sin(y * 2.3)) return "sand";
  if (within(x, y, PLAZA)) return "plaza";
  if (within(x, y, SHOP) || pathAt(x, y)) return "road";
  return "grass";
}

/* ── projection ─────────────────────────────────────────────────────────── */

/** Tile coordinates to unscaled isometric pixels, origin at the map's top corner. */
export function toIso(x: number, y: number): Vec {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

/** The inverse: unscaled isometric pixels back to tile coordinates. */
export function fromIso(ix: number, iy: number): Vec {
  const a = ix / (TILE_W / 2);
  const b = iy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/* ── paths ──────────────────────────────────────────────────────────────── */

const DIRS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * A* across the tile grid, eight ways, never cutting a corner past something
 * solid. Returns the tile centres to walk through after the start, ending at
 * the goal's centre, or null when the goal cannot be reached. Deterministic:
 * the same start and goal give the same path on every client.
 */
export function findPath(from: Vec, to: Vec): Vec[] | null {
  const sx = Math.floor(from.x), sy = Math.floor(from.y);
  const gx = Math.floor(to.x), gy = Math.floor(to.y);
  if (!walkable(gx, gy)) return null;
  if (sx === gx && sy === gy) return [{ x: gx + 0.5, y: gy + 0.5 }];

  const key = (x: number, y: number) => y * COLS + x;
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - gx), dy = Math.abs(y - gy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const g = new Map<number, number>([[key(sx, sy), 0]]);
  const came = new Map<number, number>();
  // Small grid, so a sorted array is fast enough and keeps ties deterministic.
  const open: Array<{ x: number; y: number; f: number; n: number }> = [{ x: sx, y: sy, f: h(sx, sy), n: 0 }];
  const closed = new Set<number>();
  let order = 0;

  while (open.length) {
    open.sort((a, b) => a.f - b.f || a.n - b.n);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    if (cur.x === gx && cur.y === gy) {
      const path: Vec[] = [];
      let k: number | undefined = ck;
      while (k !== undefined && k !== key(sx, sy)) {
        path.push({ x: (k % COLS) + 0.5, y: Math.floor(k / COLS) + 0.5 });
        k = came.get(k);
      }
      return path.reverse();
    }
    closed.add(ck);
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!walkable(nx, ny)) continue;
      // Diagonals only where both sides are open, so nobody clips a corner.
      if (dx && dy && (!walkable(cur.x + dx, cur.y) || !walkable(cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const cost = (g.get(ck) ?? 0) + (dx && dy ? Math.SQRT2 : 1);
      if (cost < (g.get(nk) ?? Infinity)) {
        g.set(nk, cost);
        came.set(nk, ck);
        open.push({ x: nx, y: ny, f: cost + h(nx, ny), n: ++order });
      }
    }
  }
  return null;
}

/**
 * Walk `dist` tiles along a path. Returns where that leaves you and what is
 * left of the path; an empty path means you have arrived.
 */
export function stepAlong(pos: Vec, path: Vec[], dist: number): { pos: Vec; path: Vec[] } {
  let p = { ...pos };
  const rest = [...path];
  let left = dist;
  while (rest.length && left > 0) {
    const next = rest[0];
    const dx = next.x - p.x, dy = next.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= left) {
      p = { ...next };
      rest.shift();
      left -= d;
    } else {
      p = { x: p.x + (dx / d) * left, y: p.y + (dy / d) * left };
      left = 0;
    }
  }
  return { pos: p, path: rest };
}

/* ── hearing ────────────────────────────────────────────────────────────── */

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Volume (0–1) of somebody `d` tiles away. */
export function hearing(d: number, proximity = PROXIMITY): number {
  if (!proximity) return 1;
  if (d <= NEAR) return 1;
  if (d >= FAR) return 0;
  return 1 - (d - NEAR) / (FAR - NEAR);
}

/* ── who to keep a voice line to ────────────────────────────────────────── */

/**
 * Lines open to people within FAR (where they become audible), and stay open
 * until they are past DROP: the gap stops a line flapping open and shut as
 * somebody walks along the edge, and covers the fraction of a tile by which
 * two screens may disagree about where somebody is.
 */
export const DROP = 9.5;

/**
 * At most this many lines are opened, nearest first. Each line uploads the
 * microphone once more, so the cap is what lets a crowded room work on a
 * phone: in a crowd you talk to the people around you, as in life.
 */
export const MAX_LINES = 8;

/**
 * Who to have a voice line to: everybody already connected and still within
 * DROP, plus the nearest within FAR up to MAX_LINES in all. Lines the other
 * side opened are kept the same way, so both ends agree without talking it
 * over.
 */
export function pickLines(
  me: Vec,
  others: Array<{ id: string; pos: Vec }>,
  connected: ReadonlySet<string>,
  proximity = PROXIMITY,
): Set<string> {
  // One room, everybody together: a line to everybody in voice.
  if (!proximity) return new Set(others.map((o) => o.id));
  const near = others
    .map((o) => ({ id: o.id, d: distance(me, o.pos) }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  const keep = new Set<string>();
  for (const o of near) if (connected.has(o.id) && o.d <= DROP) keep.add(o.id);
  for (const o of near) {
    if (keep.size >= MAX_LINES) break;
    if (o.d <= FAR) keep.add(o.id);
  }
  return keep;
}

/* ── arriving ───────────────────────────────────────────────────────────── */

/** The tiles around the fountain where people appear. */
const SPAWNS: Vec[] = (() => {
  const out: Vec[] = [];
  for (let y = FOUNTAIN.y - 2; y <= FOUNTAIN.y + FOUNTAIN.h + 1; y++) for (let x = FOUNTAIN.x - 2; x <= FOUNTAIN.x + FOUNTAIN.w + 1; x++) {
    if (walkable(x, y)) out.push({ x: x + 0.5, y: y + 0.5 });
  }
  return out;
})();

/** Where somebody appears, the same spot for the same person every time. */
export function spawnFor(id: string): Vec {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return SPAWNS[Math.abs(hash) % SPAWNS.length];
}
