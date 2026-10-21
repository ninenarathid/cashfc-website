/**
 * The animal farm (ฟาร์มเลี้ยงสัตว์): where its places are, shared by the page's map (lib/town/world.ts), the trial and
 * the database's catalog row `animals` (v291). The page piece owns the layout; what it settles here is what the catalog
 * carries (the egg spots, the wagon's stops, the farm's bounds).
 *
 * Round 6 (docs/plans/animals/README.md; the owner, 2026-10-20: "ย้ายฟาร์มเลี้ยงสัตว์ มาเป็นอันใหญ่อันเดียวฝั่งนี้ดีกว่า 24
 * โรงเลี้ยง อยู่ตรงนี้เลย และใช้ ลุง popoto คนเดียว"): one big farm east of the vegetable garden, global x 188..239 beside
 * the garden's rows 0..85. The garden is x 128..187 and nothing of it moves but the trees about its two new gates. As
 * the screen sees it (x runs down to the right, y down to the left):
 * - a fence down its west edge (x 188) with two wide gates where the garden's two east-west roads meet it (rows 21-22
 *   and 63-64; each gate six rows wide), the roads carried on through them as its lanes ("ทำทางเดินในแมพ ให้เชื่อมไปที่
 *   ฟาร์มเลี้ยงสัตว์ด้วย");
 * - six rows of four barns, 8 × 4 tiles each (the old barn's picture fits it), the door in the middle of the front (the
 *   side that faces +y, down to the left), each row facing a lane of its own; a north-south lane down the farm's west
 *   side and one down its middle;
 * - Uncle Popoto's stall just inside the north gate, his pen (a paddock), the making table and the hay wagon's stop
 *   beside it;
 * - the meadow between the third and the fourth rows of barns, with the duck pond at its east end; the south meadow
 *   below the last row; woods along the far rims.
 *
 * Nothing here imports world.ts (world.ts imports this): everything is in global tiles and plain numbers.
 */
import { gateAt, type GateLog } from "./animals";

/** The farm's map with the animal farm: the garden's x 128..187 and the animal farm's 188..239, rows 0..85. */
export const PASTURE = {
  origin: [128, 0] as const,
  rect: [128, 0, 112, 86] as const,
} as const;
/** The animal farm's own tiles, in global tiles. */
export const PASTURE_AREA = { x: 188, y: 0, w: 52, h: 86 } as const;
type Rect = { x: number; y: number; w: number; h: number };
const inRect = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
/** Whether a tile (or a point) is in the animal farm. */
export const inPasture = (x: number, y: number) => inRect(x, y, PASTURE_AREA);

/* ── the lanes ── */

/** The top row of each row of barns' lane (a lane is two rows), north to south; the second and the fifth are the garden's two roads carried on. */
export const LANE_ROWS: readonly number[] = [10, 21, 32, 52, 63, 74];
/** The middle of a lane's two rows. */
export const laneY = (row: number) => LANE_ROWS[row] + 1;
/** The two north-south lanes: the west one (columns 193-194, rows 10..75) and the middle one (columns 214-215, rows 2..83). */
export const NS_LANES = { west: { x: 193, y0: 10, y1: 75 }, mid: { x: 214, y0: 2, y1: 83 } } as const;
/** How far east the lanes run (their last column). */
const LANE_END = 233;
/** The fence down the west edge, and the two gates in it: the rows each gate leaves open (six, the road's two in the middle) and the road through it. */
export const FENCE_X = 188;
export const FARM_GATES: ReadonlyArray<{ name: "north" | "south"; rows: readonly [number, number]; road: number }> = [
  { name: "north", rows: [19, 24], road: 21 },
  { name: "south", rows: [61, 66], road: 63 },
];
/** Whether a tile is a lane of the animal farm: a lane a row of barns faces (the two roads from the gates on west to the fence), or a north-south one. */
export function onLane(x: number, y: number): boolean {
  if (!inPasture(x, y)) return false;
  for (const r of LANE_ROWS) if (y === r || y === r + 1) {
    if (x >= NS_LANES.west.x && x <= LANE_END) return true;
    if ((r === 21 || r === 63) && x >= FENCE_X) return true;
  }
  const { west, mid } = NS_LANES;
  if ((x === west.x || x === west.x + 1) && y >= west.y0 && y <= west.y1) return true;
  return (x === mid.x || x === mid.x + 1) && y >= mid.y0 && y <= mid.y1;
}

/* ── the barns ── */

/** A barn's footprint (its walls' foot), in tiles along x and along y. */
export const BARN_SIZE = { w: 8, h: 4 } as const;
/** The west column of each of a row's four barns. */
export const BARN_COLS: readonly number[] = [196, 205, 217, 226];
export interface BarnPlace extends Rect {
  /** Its number (0..23): the four of the first row west to east, then the next row's. */
  i: number;
  row: number;
  col: number;
  /** Its door's two tiles (the middle of its front row), and the two in front of them outside. */
  door: ReadonlyArray<readonly [number, number]>;
  step: ReadonlyArray<readonly [number, number]>;
  /** The breeding nest (the front row's east end) and the hay (its west end): the two things inside that stop a walker. */
  nest: readonly [number, number];
  hay: readonly [number, number];
}
/** The 24 barns, by number. */
export const BARNS: readonly BarnPlace[] = Array.from({ length: 24 }, (_, i) => {
  const row = Math.floor(i / 4), col = i % 4, x = BARN_COLS[col], y = LANE_ROWS[row] - 5, { w, h } = BARN_SIZE;
  return {
    i, row, col, x, y, w, h,
    door: [[x + 3, y + h - 1], [x + 4, y + h - 1]], step: [[x + 3, y + h], [x + 4, y + h]],
    nest: [x + w - 1, y + h - 1], hay: [x, y + h - 1],
  };
});
/** Which barn a tile is inside (its floor), or -1. */
export function barnAt(x: number, y: number): number {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!inPasture(tx, ty)) return -1;
  const col = BARN_COLS.findIndex((c) => tx >= c && tx < c + BARN_SIZE.w);
  if (col < 0) return -1;
  const row = LANE_ROWS.findIndex((r) => ty >= r - 5 && ty < r - 5 + BARN_SIZE.h);
  return row < 0 ? -1 : row * 4 + col;
}
/**
 * Whether a step from one tile to the next goes through a barn's wall: in or out of a barn is only by its door, straight
 * through it (from a door tile to the one in front, or back).
 */
export function barnWall(ax: number, ay: number, bx: number, by: number): boolean {
  const a = barnAt(ax, ay), b = barnAt(bx, by);
  if (a === b) return false;
  if (a >= 0 && b >= 0) return true;
  const inside = a >= 0 ? [ax, ay] : [bx, by], outside = a >= 0 ? [bx, by] : [ax, ay], barn = BARNS[a >= 0 ? a : b];
  return !(barn.door.some(([dx, dy]) => dx === inside[0] && dy === inside[1]) && outside[0] === inside[0] && outside[1] === inside[1] + 1);
}
/**
 * A barn's one trough (the owner, 2026-10-20: "ทำ ช่องใส่อาหารอันเดียว ยาวทั้งแถบโรงเลี้ยงไปเลย", "วางอาหารได้ หลาย slot ใน ที่ใส่
 * อาหารเดียว"): along its back wall (row `y` of the barn, against the wall at its north edge), laid out as a left end, a
 * slot for each place the barn houses (the herd's `room`: 2, then 4 when enlarged), and a right end; each slot a whole
 * tile, each end half a tile, centred on the wall. No stalls: the animals go about the whole floor together, and each
 * eats at its own slot. It stops nobody (it is against the wall).
 */
export const TROUGH = { slot: 1, end: 0.5, depth: 0.45 } as const;
export function troughOf(barn: Pick<BarnPlace, "x" | "y" | "w">, room: number) {
  // (never longer than the wall: past seven places, they share slots)
  const n = Math.max(1, Math.min(barn.w - 1, Math.floor(room))), len = n * TROUGH.slot + 2 * TROUGH.end, x0 = barn.x + (barn.w - len) / 2;
  return { x0, x1: x0 + len, y: barn.y, slots: Array.from({ length: n }, (_, k) => ({ x0: x0 + TROUGH.end + k * TROUGH.slot, x1: x0 + TROUGH.end + (k + 1) * TROUGH.slot })) };
}
/** Where an animal of a barn eats: before its slot of the trough (its place among the barn's animals, past the room they share). */
export function slotSpot(barn: Pick<BarnPlace, "x" | "y" | "w">, room: number, slot: number): { x: number; y: number } {
  const t = troughOf(barn, room), s = t.slots[((slot % t.slots.length) + t.slots.length) % t.slots.length];
  return { x: (s.x0 + s.x1) / 2, y: barn.y + 0.85 };
}
/** The middle of a barn's door on its front, and of the lane in front of it. */
export const doorOf = (b: BarnPlace) => ({ x: b.x + b.w / 2, y: b.y + b.h });
/** Whether a tile is a door tile of any barn (for the page: a door, open or shut). */
export const isDoor = (x: number, y: number) => { const i = barnAt(x, y); return i >= 0 && BARNS[i].door.some(([dx, dy]) => dx === x && dy === y); };

/* ── Uncle Popoto's corner, by the north gate ── */

/** Uncle Popoto's stall (what he stands at, where he stands, the tiles it takes), just inside the north gate. */
export const POPOTO = { stand: { x: 191.5, y: 17.4 }, at: { x: 191.1, y: 18.55 }, tiles: [[190, 17], [191, 17], [192, 17], [191, 18]] as ReadonlyArray<readonly [number, number]> } as const;
/** The making table (two tiles, its west one named), behind the stall. */
export const TABLE = [189, 14] as const;
/** Uncle Popoto's pen, a paddock south of the north road: whatever waits in it is drawn in it. */
export const PEN: Rect = { x: 189, y: 26, w: 4, h: 6 };
/** The village's water trough (two tiles, its west one named), by the pen. */
export const TROUGHS = { village: [189, 33] as const };
/** The duck pond, an ellipse (global tiles), at the meadow's east end. */
export const POND = { cx: 229.5, cy: 40.5, rx: 3.6, ry: 2.8 } as const;
const inPond = (x: number, y: number, more = 0) => (((x + 0.5 - POND.cx) / (POND.rx + more)) ** 2 + ((y + 0.5 - POND.cy) / (POND.ry + more)) ** 2) < 1;

/** The hay wagon's stops: one by each map's gate (a new map adds one here and nothing else). The farm's by the animal farm's north gate. */
export const WAGON_STOPS: Readonly<Record<string, readonly [number, number]>> = {
  farm: [191, 24],
  town: [57, 32],
  forest: [190, 186],
};

/* ── the spots the database knows ── */

/** The meadow (between the third and fourth rows of barns, west of the pond) and the south meadow (below the last row). */
export const MEADOW: Rect = { x: 196, y: 35, w: 29, h: 11 };
export const SOUTH_MEADOW: Rect = { x: 196, y: 77, w: 38, h: 6 };
/** Spots of the meadows where a bird out may lay (global tiles); `SpotOf` picks one by a seed. */
export const EGG_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [198, 36], [203, 39], [207, 35], [211, 42], [217, 37], [220, 44], [223, 39], [200, 44], [209, 38], [218, 41], [205, 45], [212, 36],
  [197, 78], [202, 81], [206, 77], [210, 80], [217, 78], [220, 82], [224, 79], [228, 77], [231, 81], [200, 82], [212, 79], [226, 82],
];
export const spotOf = (seed: number): [number, number] => {
  const s = EGG_SPOTS[((seed % EGG_SPOTS.length) + EGG_SPOTS.length) % EGG_SPOTS.length];
  return [s[0], s[1]];
};
/** The meadows' twelve forage spots (lib/town/animals' MEADOW), in their order. */
export const MEADOW_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [199, 41], [206, 43], [213, 39], [219, 35], [222, 42], [204, 37], [230, 35], [235, 30], [235, 50], [199, 80], [219, 80], [233, 79],
];
// (the woods are laid clear of every spot)
const SPOT_SET: ReadonlySet<string> = new Set([...EGG_SPOTS, ...MEADOW_SPOTS].map(([x, y]) => `${x},${y}`));

/* ── what stands about ── */

export type PastureProp = { kind: "tree" | "pine" | "bush" | "fence" | "hay"; x: number; y: number; solid: boolean; across?: boolean };
/** A seeded random number, as the town's layouts draw them. */
const seeded = (seed: number) => { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const barnTile = (x: number, y: number) => barnAt(x, y) >= 0;
const stallAt = (x: number, y: number) => POPOTO.tiles.some(([tx, ty]) => tx === x && ty === y) || (y === TABLE[1] && (x === TABLE[0] || x === TABLE[0] + 1));
const troughAt = (x: number, y: number) => Object.values(TROUGHS).some(([tx, ty]) => y === ty && (x === tx || x === tx + 1));
const stopAt = (x: number, y: number) => Math.abs(x - WAGON_STOPS.farm[0]) <= 1 && Math.abs(y - WAGON_STOPS.farm[1]) <= 1;
/** The fence's runs down the west edge (a length is three tiles, as the town's fence is), every tile of it but the gates'. */
const FENCE_RUNS: ReadonlyArray<readonly [number, number]> = [[1, 18], [25, 60], [67, 84]];
const fenceTile = (x: number, y: number) => x === FENCE_X && FENCE_RUNS.some(([a, b]) => y >= a && y <= b);

/** The fence (each length's middle tile), a few hay bales, and the woods along the far rims. */
export const PASTURE_PROPS: PastureProp[] = (() => {
  const out: PastureProp[] = [];
  for (const [a, b] of FENCE_RUNS) for (let y = a + 1; y < b; y += 3) out.push({ kind: "fence", x: FENCE_X, y, solid: true });
  // the fence's two corners: low bushes
  out.push({ kind: "bush", x: FENCE_X, y: 0, solid: true }, { kind: "bush", x: FENCE_X, y: 85, solid: true });
  // hay by the south gate and along the west lane
  for (const [x, y] of [[190, 57], [191, 70], [190, 45]] as const) out.push({ kind: "hay", x, y, solid: true });
  const rnd = seeded(20261021), taken = new Set<string>(out.map((p) => `${p.x},${p.y}`));
  for (let tries = 0, placed = 0; placed < 90 && tries < 8000; tries++) {
    const x = PASTURE_AREA.x + 1 + Math.floor(rnd() * (PASTURE_AREA.w - 1)), y = Math.floor(rnd() * PASTURE_AREA.h), kind = rnd();
    // (the far rims: the east edge's last three columns, the first two rows and the last two; never on a lane, by a
    // barn, on the pond's shore or a spot)
    const rim = x >= 237 || y <= 1 || y >= 84;
    if (!rim || taken.has(`${x},${y}`) || onLane(x, y) || barnTile(x, y) || inPond(x, y, 1.2) || SPOT_SET.has(`${x},${y}`)) continue;
    if (x >= NS_LANES.mid.x - 1 && x <= NS_LANES.mid.x + 2) continue;
    taken.add(`${x},${y}`);
    out.push({ kind: kind < 0.42 ? "tree" : kind < 0.72 ? "pine" : "bush", x, y, solid: true });
    placed++;
  }
  return out;
})();
const solidSet: ReadonlySet<string> = new Set(PASTURE_PROPS.filter((p) => p.solid && p.kind !== "fence").map((p) => `${p.x},${p.y}`));

/** The ground of the animal farm at a point (for drawing; a tile is what its middle is). */
export type PastureGround = "grass" | "road" | "sand" | "water";
export function pastureGround(x: number, y: number): PastureGround {
  const tx = Math.floor(x), ty = Math.floor(y);
  // (the pond's edge drawn round, a little ragged)
  if (((x - POND.cx) / POND.rx) ** 2 + ((y - POND.cy) / POND.ry) ** 2 < 1 + 0.06 * Math.sin(x * 2.1) * Math.sin(y * 1.7)) return "water";
  if (onLane(tx, ty)) return "road";
  // (a barn's floor and the pen's are trodden earth; so is the ground at the stall and the wagon's stop)
  if (barnTile(tx, ty) || inRect(tx, ty, PEN) || stallAt(tx, ty) || stopAt(tx, ty)) return "sand";
  return "grass";
}
/** What stands on an animal-farm tile and stops a walker: the fence, a stall, the pen, a trough, a barn's nest or hay, a tree; "water" for the pond. */
export function pastureThing(x: number, y: number): "prop" | "water" | null {
  if (!inPasture(x, y)) return null;
  if (inPond(x, y)) return "water";
  if (fenceTile(x, y) || stallAt(x, y) || troughAt(x, y) || inRect(x, y, PEN)) return "prop";
  const b = barnAt(x, y);
  if (b >= 0) { const { nest, hay } = BARNS[b]; return (x === nest[0] && y === nest[1]) || (x === hay[0] && y === hay[1]) ? "prop" : null; }
  return solidSet.has(`${x},${y}`) ? "prop" : null;
}
/** The garden's side of the two gates: its trees within so many rows of a gate's road, this far in from its east edge, come off. */
export const GATE_CLEAR = { rows: 8, from: 50 } as const;
export const nearFarmGate = (u: number, v: number) => u >= GATE_CLEAR.from && FARM_GATES.some((g) => Math.abs(v - (g.road + 0.5)) <= GATE_CLEAR.rows);

/* ── where an animal is: drawn the same on every page, from its id, its barn, its owner's door and the clock ── */

export type Pose = "walk" | "idle" | "eat" | "sleep" | "swim";
export interface AnimalSpot { x: number; y: number; right: boolean; /** Its back to the viewer (going up the screen: x + y falling). */ back?: boolean; pose: Pose; /** The barn it is inside (its floor), or -1: drawn only for whoever is in that barn. */ inside: number }
/** Whether a step from one point to another goes up the screen, away from the viewer. */
const awayOf = (from: { x: number; y: number }, to: { x: number; y: number }) => to.x + to.y < from.x + from.y - 1e-6;
type P = { x: number; y: number };

export const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mix = (...n: number[]) => { let h = 0x9e3779b9; for (const k of n) { h ^= k + 0x7f4a7c15 + (h << 6) + (h >>> 2); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0; } return (h >>> 0) / 4294967296; };
const dist = (a: P, b: P) => Math.hypot(b.x - a.x, b.y - a.y);
const lenOf = (pts: readonly P[]) => pts.slice(1).reduce((n, p, i) => n + dist(pts[i], p), 0);
/** A point a distance along a list of points, and which way it goes across the screen there. */
function along(pts: readonly P[], d: number): { at: P; right: boolean; back: boolean } {
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = dist(a, b);
    if (left <= l || i === pts.length - 1) { const f = l ? Math.min(1, left / l) : 1; return { at: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, right: b.x - b.y - (a.x - a.y) >= 0, back: awayOf(a, b) }; }
    left -= l;
  }
  return { at: pts[pts.length - 1] ?? { x: 0, y: 0 }, right: true, back: false };
}

/* The lanes as a network: nodes where lanes meet or end, and the lengths between them (worked out once). */
const NODES: Record<string, P> = (() => {
  const n: Record<string, P> = {};
  LANE_ROWS.forEach((_, k) => { n[`W${k}`] = { x: NS_LANES.west.x + 1, y: laneY(k) }; n[`C${k}`] = { x: NS_LANES.mid.x + 1, y: laneY(k) }; n[`E${k}`] = { x: LANE_END, y: laneY(k) }; });
  n.CN = { x: NS_LANES.mid.x + 1, y: NS_LANES.mid.y0 + 1 }; n.CS = { x: NS_LANES.mid.x + 1, y: NS_LANES.mid.y1 };
  n.GN = { x: FENCE_X, y: laneY(1) }; n.GS = { x: FENCE_X, y: laneY(4) };
  // (the garden: its two roads west to near its gate from town, and its lane north to south)
  n.A1 = { x: 158, y: laneY(1) }; n.A0 = { x: 134, y: laneY(1) }; n.B1 = { x: 158, y: laneY(4) }; n.B0 = { x: 134, y: laneY(4) };
  n.N0 = { x: 158, y: 5 }; n.N1 = { x: 158, y: 80 };
  return n;
})();
const EDGES: ReadonlyArray<readonly [string, string]> = [
  ...LANE_ROWS.flatMap((_, k) => [[`W${k}`, `C${k}`], [`C${k}`, `E${k}`]] as Array<[string, string]>),
  ...LANE_ROWS.slice(1).map((_, k) => [`W${k}`, `W${k + 1}`] as [string, string]),
  ["CN", "C0"], ...LANE_ROWS.slice(1).map((_, k) => [`C${k}`, `C${k + 1}`] as [string, string]), ["C5", "CS"],
  ["GN", "W1"], ["GS", "W4"], ["A1", "GN"], ["A0", "A1"], ["B1", "GS"], ["B0", "B1"], ["N0", "A1"], ["A1", "B1"], ["B1", "N1"],
];
const NAMES = Object.keys(NODES);
const NET = (() => {
  const n = NAMES.length, D = Array.from({ length: n }, () => new Array<number>(n).fill(Infinity)), next = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  for (let i = 0; i < n; i++) { D[i][i] = 0; next[i][i] = i; }
  for (const [a, b] of EDGES) { const i = NAMES.indexOf(a), j = NAMES.indexOf(b), l = dist(NODES[a], NODES[b]); D[i][j] = D[j][i] = l; next[i][j] = j; next[j][i] = i; }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) { D[i][j] = D[i][k] + D[k][j]; next[i][j] = next[i][k]; }
  return { D, next };
})();
/** The edge of the network a point on a lane lies on (the nearest, by how far off it the point is). */
function edgeOf(p: P): number {
  let best = 0, off = Infinity;
  EDGES.forEach(([a, b], i) => {
    const A = NODES[a], B = NODES[b], l2 = (B.x - A.x) ** 2 + (B.y - A.y) ** 2, t = l2 ? Math.max(0, Math.min(1, ((p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y)) / l2)) : 0;
    const d = Math.hypot(A.x + (B.x - A.x) * t - p.x, A.y + (B.y - A.y) * t - p.y);
    if (d < off - 1e-6) { off = d; best = i; }
  });
  return best;
}
/** The way along the lanes from one point on them to another (both on the network). */
function laneWay(from: P, to: P): P[] {
  const e1 = edgeOf(from), e2 = edgeOf(to);
  if (e1 === e2) return [from, to];
  let best: { l: number; a: number; b: number } = { l: Infinity, a: 0, b: 0 };
  for (const a of EDGES[e1]) for (const b of EDGES[e2]) {
    const ia = NAMES.indexOf(a), ib = NAMES.indexOf(b), l = dist(from, NODES[a]) + NET.D[ia][ib] + dist(NODES[b], to);
    if (l < best.l) best = { l, a: ia, b: ib };
  }
  const pts: P[] = [from];
  for (let i = best.a; ; i = NET.next[i][best.b]) { pts.push(NODES[NAMES[i]]); if (i === best.b || i < 0) break; }
  pts.push(to);
  return pts;
}

/** The garden's blocks an animal roams (x and y spans), and its lanes they are entered from (its two roads and its north-south lane). */
const GARDEN = {
  xs: [[129, 143], [143, 157], [159, 173], [173, 187]] as const,
  ys: [[3, 12], [12, 21], [23, 33], [33, 43], [43, 53], [53, 63], [65, 74], [74, 83]] as const,
  lanes: [[{ x: 134, y: laneY(1) }, { x: FENCE_X, y: laneY(1) }], [{ x: 134, y: laneY(4) }, { x: FENCE_X, y: laneY(4) }], [{ x: 158, y: 5 }, { x: 158, y: 80 }]] as ReadonlyArray<readonly [P, P]>,
};
/** The point of a straight stretch nearest a point. */
function nearestOn(a: P, b: P, p: P): P {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2, t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2)) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
/** The places an animal out of its barn grazes or wanders: patches of the meadows (entered from the lane above them), the pond, blocks of the garden. */
interface Patch { kind: "meadow" | "pond" | "garden"; area: Rect; /** Where it is entered: a point on the lanes, and the point in it the way comes to. */ entry: P; anchor: P }
const PATCHES: readonly Patch[] = (() => {
  const out: Patch[] = [];
  for (let x = MEADOW.x; x < MEADOW.x + MEADOW.w; x += 5) {
    const w = Math.min(5, MEADOW.x + MEADOW.w - x), cx = x + w / 2;
    out.push({ kind: "meadow", area: { x, y: MEADOW.y, w, h: 5 }, entry: { x: cx, y: laneY(2) }, anchor: { x: cx, y: MEADOW.y + 0.6 } });
    out.push({ kind: "meadow", area: { x, y: MEADOW.y + 5, w, h: MEADOW.h - 5 }, entry: { x: cx, y: laneY(2) }, anchor: { x: cx, y: MEADOW.y + 5.5 } });
  }
  for (let x = SOUTH_MEADOW.x; x < SOUTH_MEADOW.x + SOUTH_MEADOW.w; x += 6) {
    const w = Math.min(6, SOUTH_MEADOW.x + SOUTH_MEADOW.w - x), cx = x + w / 2;
    out.push({ kind: "meadow", area: { x, y: SOUTH_MEADOW.y, w, h: SOUTH_MEADOW.h }, entry: { x: cx, y: laneY(5) }, anchor: { x: cx, y: SOUTH_MEADOW.y + 0.6 } });
  }
  out.push({ kind: "pond", area: { x: POND.cx - POND.rx, y: POND.cy - POND.ry, w: POND.rx * 2, h: POND.ry * 2 }, entry: { x: POND.cx, y: laneY(2) }, anchor: { x: POND.cx, y: POND.cy - POND.ry + 0.7 } });
  // (the garden: blocks of it either side of its north-south lane, between its two roads, beds and all; each entered
  // from the nearest point of its lanes, and roamed tile by tile: roamOf)
  for (const [x0, x1] of GARDEN.xs) for (const [y0, y1] of GARDEN.ys) {
    const c = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, entry = GARDEN.lanes.map(([a, b]) => nearestOn(a, b, c)).sort((a, b) => dist(a, c) - dist(b, c))[0];
    out.push({ kind: "garden", area: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, entry, anchor: entry });
  }
  return out;
})();
/**
 * Which patch an animal is at in a stretch of time: the garden a little more often than the meadows (the owner,
 * 2026-10-22: "ช่วยทำให้ สัตว์เดินออกไปที่แปลงผักมากขึ้น"), a duck the pond a third of the time.
 */
const GARDEN_SHARE = 0.55, POND_SHARE = 0.3;
function patchOf(seed: number, species: string, k: number): number {
  const r = mix(seed, k, 21), garden = PATCHES.map((p, i) => [p, i] as const).filter(([p]) => p.kind === "garden"), meadow = PATCHES.map((p, i) => [p, i] as const).filter(([p]) => p.kind === "meadow");
  if (species === "duck" && r < POND_SHARE) return PATCHES.findIndex((p) => p.kind === "pond");
  const list = mix(seed, k, 22) < GARDEN_SHARE ? garden : meadow;
  return list[Math.floor(mix(seed, k, 23) * list.length) % list.length][1];
}
/** A point in a patch for a wander's step. */
function pointIn(p: Patch, seed: number, k: number, n: number): P {
  const u = mix(seed, k, n, 1), v = mix(seed, k, n, 2);
  if (p.kind === "pond") { const a = u * Math.PI * 2, r = 0.25 + 0.6 * Math.sqrt(v); return { x: POND.cx + Math.cos(a) * (POND.rx - 0.9) * r, y: POND.cy + Math.sin(a) * (POND.ry - 0.8) * r }; }
  return { x: p.area.x + 0.4 + u * (p.area.w - 0.8), y: p.area.y + 0.4 + v * (p.area.h - 0.8) };
}

/**
 * The garden's ground an animal may stand on (lib/town/pasture-garden lays it in: world.ts and lamps.ts know it, and this
 * cannot import them); none, and an animal in the garden stands on its lane.
 */
let gardenFree: ((x: number, y: number) => boolean) | null = null;
export function roamGarden(free: (x: number, y: number) => boolean) { gardenFree = free; roams.clear(); }
/** Whether nothing stands on a straight way across the garden. */
function clearWay(a: P, b: P): boolean {
  const n = Math.max(1, Math.ceil(dist(a, b) * 4));
  for (let i = 0; i <= n; i++) if (!gardenFree!(Math.floor(a.x + ((b.x - a.x) * i) / n), Math.floor(a.y + ((b.y - a.y) * i) / n))) return false;
  return true;
}
/** How far a step of a roam goes at the most, in tiles. */
const ROAM_STEP = 4;
const roams = new Map<string, P[]>();
/**
 * A stretch's roam of a garden block, its steps 0 .. n-2 (the owner: "ช่วยทำให้เดินมั่วเลย เดินเข้าไปในแปลงผักด้วยก็ได้"):
 * from its anchor on the lane a step at a time to free ground, beds and all, never through anything that stands; into
 * the block and about it; then home along the way it came, cutting across wherever nothing is in the way, so that its
 * last step is to the anchor. The same on every page, from the patch, the animal and the stretch.
 */
function roamOf(pi: number, seed: number, k: number, n: number): P[] {
  const key = `${pi}:${seed}:${k}:${n}`, had = roams.get(key);
  if (had) return had;
  const p = PATCHES[pi], c = { x: p.area.x + p.area.w / 2, y: p.area.y + p.area.h / 2 }, rnd = seeded(Math.floor(mix(pi, seed, k, 31) * 2 ** 31));
  const pts: P[] = [], trail: P[] = [p.anchor];
  let at = p.anchor;
  for (let j = 0; j <= n - 2; j++) {
    if (trail.length - 1 >= n - 1 - j) {
      // (home: to the furthest point back along the trail a straight way reaches, not too far for a step)
      let i = trail.length - 2;
      while (i > 0 && dist(at, trail[i - 1]) <= ROAM_STEP * 1.5 && clearWay(at, trail[i - 1])) i--;
      if (i >= 0) { at = trail[i]; trail.length = i + 1; }
    } else {
      // (out: a step to free ground in the block, or towards it while it is not there yet; else it stands where it is)
      for (let tries = 0; tries < 12; tries++) {
        const a = rnd() * Math.PI * 2, r = 1.2 + rnd() * (ROAM_STEP - 1.2), q = { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
        if (!(inRect(q.x, q.y, p.area) || dist(q, c) < dist(at, c) - 0.5) || !clearWay(at, q)) continue;
        at = q; trail.push(q); break;
      }
    }
    pts.push(at);
  }
  if (roams.size > 600) roams.clear();
  roams.set(key, pts);
  return pts;
}

/** How fast each kind walks, tiles a second (on the lanes a little faster, at a trot). */
const PACE: Record<string, number> = { cow: 0.55, sheep: 0.7, chicken: 1.3, duck: 0.9 };
const TROT = 1.4;
/** How long a stretch out in one patch lasts before an animal moves on. */
const STRETCH = 10 * 60_000;

/** Where an animal of a barn rests when nothing else is going on: a place of the floor by its slot (its place among the barn's animals). */
export function restOf(barn: BarnPlace, slot: number): P {
  const k = ((slot % 4) + 4) % 4;
  return { x: barn.x + 1.4 + k * 1.75, y: barn.y + 1.9 };
}
/** The way from its resting place out through the door to the lane in front (the floor has nothing on it to go round). */
function outOf(barn: BarnPlace, slot: number): P[] {
  const s = restOf(barn, slot), d = doorOf(barn);
  return [s, { x: d.x, y: barn.y + 2.6 }, { x: d.x, y: barn.y + barn.h + 0.5 }, { x: d.x, y: barn.y + barn.h + 2 }];
}
const ways = new Map<string, P[]>();
/** From its resting place to a patch's anchor (out through the door, along the lanes, into the patch). */
function stallToPatch(barn: BarnPlace, slot: number, patch: number): P[] {
  const k = `s${barn.i}.${slot % 4}>${patch}`;
  let w = ways.get(k);
  if (!w) { const o = outOf(barn, slot), p = PATCHES[patch]; w = [...o.slice(0, -1), ...laneWay(o[o.length - 1], p.entry), p.anchor]; ways.set(k, w); }
  return w;
}
/** From one patch's anchor to another's. */
function patchToPatch(a: number, b: number): P[] {
  const k = `p${a}>${b}`;
  let w = ways.get(k);
  if (!w) { const A = PATCHES[a], B = PATCHES[b]; w = [A.anchor, ...laneWay(A.entry, B.entry), B.anchor]; ways.set(k, w); }
  return w;
}
/** Where a moment is, out: a place on a way (and the way, so that a door shut then can bring it back the same way), in a patch, or still in its stall. */
type Out = { at: P; right: boolean; back?: boolean; pose: Pose; way?: { pts: P[]; d: number; from: number | "stall" }; patch?: number };

interface Who { id: string; species: string; young: boolean }
const paceOf = (a: Who) => (PACE[a.species] ?? 0.8) * (a.young ? 0.85 : 1);
const stretchOf = (seed: number) => {
  const off = seed % STRETCH;
  return { period: (tt: number) => Math.floor((tt + off) / STRETCH), start: (k: number) => k * STRETCH - off };
};
/** The first way out after a door opened: when it sets off, the stretch it goes to (this one's patch, or the next's if it would get there after this one is over), the way, and when it is there. */
function firstOut(a: Who, barn: BarnPlace, slot: number, opened: number) {
  const seed = hashStr(a.id), lane = paceOf(a) * TROT, { period, start } = stretchOf(seed);
  // (one after another out of the door, by their places, so that they do not crowd in it)
  const go = opened + (slot % 8) * 2200 + (seed % 5) * 500, p0 = period(opened);
  let q = p0, way = stallToPatch(barn, slot, patchOf(seed, a.species, p0));
  if (go + (lenOf(way) / lane) * 1000 > start(p0 + 1)) { q = p0 + 1; way = stallToPatch(barn, slot, patchOf(seed, a.species, q)); }
  return { go, q, way, there: go + (lenOf(way) / lane) * 1000 };
}
/** An animal's life out of its barn from a door's opening: out to a patch, a stretch there, on to the next. */
function outAt(a: Who, barn: BarnPlace, slot: number, opened: number, t: number): Out {
  const seed = hashStr(a.id), pace = paceOf(a), lane = pace * TROT, { period, start } = stretchOf(seed);
  const { go, q, way: first, there } = firstOut(a, barn, slot, opened);
  if (t < go) return { at: restOf(barn, slot), right: true, pose: "idle" };
  const T0 = there - go;
  if (t < there) { const d = ((t - go) / 1000) * lane, r = along(first, d); return { at: r.at, right: r.right, back: r.back, pose: "walk", way: { pts: first, d, from: "stall" } }; }
  const k = Math.max(q, period(t)), patch = patchOf(seed, a.species, k);
  let w0 = k === q ? go + T0 : start(k);
  if (k > q) {
    const was = patchOf(seed, a.species, k - 1);
    if (was !== patch) {
      const way = patchToPatch(was, patch), T = (lenOf(way) / lane) * 1000;
      if (t < start(k) + T) { const d = ((t - start(k)) / 1000) * lane, r = along(way, d); return { at: r.at, right: r.right, back: r.back, pose: "walk", way: { pts: way, d, from: was } }; }
      w0 = start(k) + T;
    }
  }
  return { ...wander(PATCHES[patch], seed, k, pace, w0, start(k + 1), t), patch };
}
/** A stretch in a patch: from its anchor, a step at a time to points in it, back to the anchor by the stretch's end. */
function wander(p: Patch, seed: number, k: number, pace: number, w0: number, w1: number, t: number): Out {
  const L = 9_000 + (seed % 8) * 1000, n = Math.floor((w1 - w0) / L), i = Math.floor((t - w0) / L);
  const swim = p.kind === "pond";
  if (n < 2 || i >= n || i < 0) return { at: p.anchor, right: mix(seed, k, 9) < 0.5, pose: swim ? "swim" : "idle" };
  const roam = p.kind === "garden" ? (gardenFree ? roamOf(PATCHES.indexOf(p), seed, k, n) : []) : null;
  const pt = (j: number) => (j < 0 || j >= n - 1 ? p.anchor : roam ? (roam[j] ?? p.anchor) : pointIn(p, seed, k, j));
  const from = i === 0 ? p.anchor : pt(i - 1), to = pt(i), d = dist(from, to);
  // (a step never takes longer than most of its slot: a longer one is taken at a trot)
  const walk = Math.min((d / pace) * 1000, L * 0.8), into = t - w0 - i * L, right = to.x - to.y - (from.x - from.y) >= 0;
  if (into < walk && d > 0.05) { const f = into / walk; return { at: { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }, right, back: awayOf(from, to), pose: swim ? "swim" : "walk" }; }
  // (standing, it keeps the way it came now and then, else turns to the viewer)
  return { at: to, right: mix(seed, k, i, 6) < 0.5 ? right : !right, back: awayOf(from, to) && mix(seed, k, i, 8) < 0.4, pose: swim ? "swim" : mix(seed, k, i, 4) < 0.45 ? "eat" : "idle" };
}
/** The way back to its resting place in the barn from wherever it was when its door was shut. */
function homeWay(barn: BarnPlace, slot: number, out: Out): P[] {
  const pts: P[] = [out.at];
  if (out.way) {
    // back the way it came, through the points of it already passed, to where the way began; and from the patch it
    // had set off from (if it had), home
    const { pts: w, d, from } = out.way, passed: P[] = [];
    for (let i = 1, run = 0; i < w.length; i++) { run += dist(w[i - 1], w[i]); if (run < d) passed.push(w[i]); else break; }
    pts.push(...passed.reverse(), w[0]);
    if (from !== "stall") pts.push(...[...stallToPatch(barn, slot, from)].reverse());
  } else if (out.patch !== undefined) pts.push(...[...stallToPatch(barn, slot, out.patch)].reverse());
  else pts.push(restOf(barn, slot));
  return pts.filter((p, i) => i === 0 || dist(p, pts[i - 1]) > 1e-6);
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
/** The door's last change at or before a moment: open since when, or shut since when (and when it had opened). */
function doorAt(door: GateLog, t: number): { open: boolean; since: number; opened: number } {
  let open = { since: -Infinity }, shut = { since: -Infinity, opened: -Infinity };
  for (const [from, to] of door) {
    if (from <= t && (to === null || t < to)) { if (from > open.since) open = { since: from }; }
    else if (to !== null && to <= t && to > shut.since) shut = { since: to, opened: from };
  }
  const g = gateAt(door, t);
  return g.open ? { open: true, since: open.since, opened: open.since } : { open: false, since: shut.since, opened: shut.opened };
}
/** How long after its door is shut an animal settles in its barn (walked home, it stands at its resting place until then). */
const SETTLE = 5 * 60_000;
/**
 * In the barn, from a moment on (`since`, from its resting place): about the whole floor with the others, a step at a
 * time, and now and then to its own slot of the trough to eat.
 */
function inBarn(a: Who, barn: BarnPlace, slot: number, room: number, since: number, t: number): Out {
  const seed = hashStr(a.id), L = 8_000 + (seed % 5) * 1000, k = Math.floor((t - since) / L), rest = restOf(barn, slot);
  if (k < 0) return { at: rest, right: mix(seed, 5) < 0.5, pose: "idle" };
  const pt = (j: number): P & { eat?: boolean } => {
    if (j < 0) return rest;
    if (mix(seed, j, 3) < 0.3) { const e = slotSpot(barn, room, slot); return { x: e.x + (mix(seed, j, 4) - 0.5) * 0.3, y: e.y, eat: true }; }
    return { x: barn.x + 0.7 + mix(seed, j, 1) * (barn.w - 1.4), y: barn.y + 1.0 + mix(seed, j, 2) * 1.6 };
  };
  const from = pt(k - 1), to = pt(k), into = t - since - k * L, walk = Math.min(L * 0.7, (dist(from, to) / (PACE[a.species] ?? 0.8)) * 1000), right = to.x - to.y - (from.x - from.y) >= 0;
  if (into < walk && dist(from, to) > 0.05) { const f = into / walk; return { at: { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }, right, back: awayOf(from, to), pose: "walk" }; }
  // (at the trough it faces the wall, its back to the viewer, its head down)
  return { at: to, right: to.eat ? false : mix(seed, k, 6) < 0.5, back: !!to.eat || (awayOf(from, to) && mix(seed, k, 8) < 0.4), pose: to.eat ? "eat" : mix(seed, k, 7) < 0.25 ? "eat" : "idle" };
}
/** When the door was last shut before a moment (for where in the barn an animal is when it is opened again), or none. */
function shutBefore(door: GateLog, t: number) {
  let c = -Infinity;
  for (const [, to] of door) if (to !== null && to <= t && to > c) c = to;
  return c;
}

/**
 * Where an animal is at a moment and what it does: about its barn while its owner's barn door is shut; out through the
 * door, along the lanes, to the meadows, the pond and the garden's lanes while it is open (the owner: "ตอนเช้า สามารถ
 * เปิดประตูให้ออกมากินหญ้า เดินเล่นที่สวนปลูกผักได้"), on to another patch every ten minutes; back the way it came when it
 * is shut; lying down at night where it is. The same on every page from the id, the barn, the door's log and the clock;
 * purely for drawing (nothing of the game hangs on where an animal is). `slot`: its place among its barn's animals (its
 * slot of the trough); `room`: how many the barn houses (its trough's slots).
 */
export function animalSpot(a: Who, barnIndex: number, slot: number, door: GateLog, now: number, night = asleepAt(now), room = 4): AnimalSpot {
  const barn = BARNS[barnIndex];
  if (!barn) return { x: PEN.x + 2, y: PEN.y + 3, right: true, pose: "idle", inside: -1 };
  const lane = paceOf(a) * TROT;
  const d = doorAt(door, now);
  // (settled in the barn so long after a shut door: from its resting place; before a door was ever opened, from the start of time)
  const settled = (shut: number) => (Number.isFinite(shut) ? shut + SETTLE : 0);
  // (at night, in the barn, it lies down where it was as night fell, or where it settled after)
  const asleepIn = (since: number) => (night ? Math.max(since, Math.min(now, nightBegan(now))) : now);
  const asleep = (x: Out): Out => (night ? { ...x, pose: "sleep" } : x);
  let o: Out;
  if (d.open) {
    // (until it sets off it is about the barn as it was; at night it lies down where it is once it is out)
    const first = firstOut(a, barn, slot, d.since);
    const sleepFrom = night ? Math.max(nightBegan(now), first.there) : Infinity;
    if (now < first.go) o = inBarn(a, barn, slot, room, settled(shutBefore(door, d.since)), now);
    else {
      o = outAt(a, barn, slot, d.since, Math.min(now, sleepFrom));
      if (now >= sleepFrom && o.pose !== "swim") o = { ...o, pose: "sleep" };
    }
  } else if (Number.isFinite(d.since) && Number.isFinite(d.opened)) {
    // (where it was as the door shut: lying where night found it, if the night had come and it was out by then)
    const atShut = asleepAt(d.since) ? Math.min(d.since, Math.max(nightBegan(d.since), firstOut(a, barn, slot, d.opened).there)) : d.since;
    const was = outAt(a, barn, slot, d.opened, atShut), home = homeWay(barn, slot, was), T = (lenOf(home) / lane) * 1000;
    if (now < d.since + T) { const r = along(home, ((now - d.since) / 1000) * lane); o = { at: r.at, right: r.right, back: r.back, pose: "walk" }; }
    else o = asleep(inBarn(a, barn, slot, room, Math.max(d.since + T, settled(d.since)), asleepIn(Math.max(d.since + T, settled(d.since)))));
  } else o = asleep(inBarn(a, barn, slot, room, 0, asleepIn(0)));
  if (night && o.pose !== "walk" && o.pose !== "swim") o = { ...o, pose: "sleep" };
  return { x: o.at.x, y: o.at.y, right: o.right, back: !!o.back && o.pose !== "sleep", pose: o.pose, inside: barnAt(o.at.x, o.at.y) };
}
/** Where an animal waiting in Uncle Popoto's pen is: about the paddock, by its id and the clock. */
export function penSpot(id: string, species: string, now: number, night = asleepAt(now)): AnimalSpot {
  // (at night it lies where it was as night fell)
  const seed = hashStr(id), L = 10_000 + (seed % 6) * 1000, t = night ? Math.min(now, nightBegan(now)) : now, k = Math.floor((t + seed % L) / L);
  const pt = (j: number): P => ({ x: PEN.x + 0.6 + mix(seed, j, 1) * (PEN.w - 1.2), y: PEN.y + 0.7 + mix(seed, j, 2) * (PEN.h - 1.3) });
  const from = pt(k - 1), to = pt(k), into = (t + seed % L) - k * L, walk = Math.min(L * 0.7, (dist(from, to) / (PACE[species] ?? 0.8)) * 1000), right = to.x - to.y - (from.x - from.y) >= 0;
  if (!night && into < walk && dist(from, to) > 0.05) { const f = into / walk; return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, right, back: awayOf(from, to), pose: "walk", inside: -1 }; }
  return { x: to.x, y: to.y, right: mix(seed, k, 6) < 0.5, pose: night ? "sleep" : mix(seed, k, 4) < 0.4 ? "eat" : "idle", inside: -1 };
}
/** For the tests: every way an animal may take (out of each barn's stalls to each patch, and between patches), as lists of points. */
export const allWays = () => [
  ...BARNS.flatMap((b) => Array.from({ length: 4 }, (_, s) => PATCHES.map((_, p) => stallToPatch(b, s, p))).flat()),
  ...PATCHES.flatMap((_, a) => PATCHES.map((__, b) => (a === b ? null : patchToPatch(a, b))).filter((w): w is P[] => !!w)),
];
export const PATCH_AREAS = () => PATCHES.map((p) => ({ kind: p.kind, area: p.area, anchor: p.anchor }));
/** For the tests: the roams of the garden's blocks for so many animals and stretches, each from its anchor and back to it. */
export const gardenRoams = (seeds: readonly number[], ks: readonly number[], n = 50) =>
  PATCHES.flatMap((p, pi) => (p.kind === "garden" ? seeds.flatMap((seed) => ks.map((k) => ({ area: p.area, pts: [p.anchor, ...roamOf(pi, seed, k, n), p.anchor] }))) : []));
/** For the tests: how many stretches of so many animals are spent in the garden, the meadows and the pond. */
export const patchShares = (species: string, seeds: readonly number[], ks: readonly number[]) => {
  const n: Record<string, number> = { garden: 0, meadow: 0, pond: 0 };
  for (const seed of seeds) for (const k of ks) n[PATCHES[patchOf(seed, species, k)].kind]++;
  return n;
};
