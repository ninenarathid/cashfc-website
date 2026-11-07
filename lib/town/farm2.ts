/**
 * The editor's farm (the owner, 2026-11-07: "oatto-farmv2", "เริ่มทำได้เลย"): a 150 × 110 map made in the Cashtown map
 * editor, read by .claude/skills/fc-cash-town/scripts/pixel/build-farm2.mjs into farm2-map.json, in the game's own tiles
 * (its corner at the farm's 128, 0). What the game takes from it, for lib/town/world, lib/town/pasture and the pages:
 * - its ground (the game's own textures: the editor painted it in them), a bed's tiles the game's field;
 * - what may be walked on (`walk`) and the edges nobody crosses (its fences, a barn's walls but its door);
 * - its beds and barns, numbered as the game's are (a member's plots and barn keep their number; each is somewhere else);
 * - the places the game's things are at: the wells, the storage chests, the fire bowls the lamp relay's flames are taken
 *   at, its lamp posts (the map's 59 lanterns in the garden and 33 more on the barns' side, the owner's "เราเพิ่มเองได้เลย"),
 *   the benches' seats, Uncle Popoto's stall, the making table, the pen, the duck pond, the gates' rings;
 * - the lanes the animals walk (written here from the map's roads: they are the map's, not worked out).
 *
 * Nothing here imports lib/town/world or lib/town/pasture (both import this): everything is in global tiles.
 */
import MAP from "./farm2-map.json";
import type { Facing, Ground, Prop, Vec } from "./world";

const [OX, OY] = MAP.origin as [number, number];
export const F2_COLS: number = MAP.cols;
export const F2_ROWS: number = MAP.rows;
/** The editor's farm's extent in the game's tiles: the farm as a map. */
export const F2_RECT = { x: OX, y: OY, w: F2_COLS, h: F2_ROWS } as const;
export const inF2 = (x: number, y: number) => x >= OX && y >= OY && x < OX + F2_COLS && y < OY + F2_ROWS;

/* ── walking ────────────────────────────────────────────────────────────── */

const WALK: string[] = MAP.walk;
/** A tile as the builder left it: "." ground, "~" water, "#" something stands there, "s" a bench's seat, " " no ground. */
export const f2Tile = (tx: number, ty: number): string => WALK[ty - OY]?.[tx - OX] ?? " ";
/** Whether a tile of the editor's farm is ground one may stand on. */
export const f2Open = (tx: number, ty: number) => f2Tile(tx, ty) === ".";
const EDGE = new Set<string>((MAP.edges as Array<[number, number, string]>).map(([x, y, s]) => `${x},${y},${s}`));
/** Whether a step across one tile edge crosses a fence or a barn's wall (README §8: side n of a tile is its north edge, w its west). */
function across(ax: number, ay: number, bx: number, by: number): boolean {
  if (bx === ax && by === ay - 1) return EDGE.has(`${ax},${ay},n`);
  if (bx === ax && by === ay + 1) return EDGE.has(`${bx},${by},n`);
  if (by === ay && bx === ax - 1) return EDGE.has(`${ax},${ay},w`);
  if (by === ay && bx === ax + 1) return EDGE.has(`${bx},${by},w`);
  return false;
}
/**
 * Whether a step from one tile to the next goes over a fence or through a barn's wall. A step on the slant goes over one
 * if either way round its corner would (no slipping past a fence's end between two of its lengths).
 */
export function f2OverEdge(ax: number, ay: number, bx: number, by: number): boolean {
  if (ax !== bx && ay !== by) return across(ax, ay, bx, ay) || across(bx, ay, bx, by) || across(ax, ay, ax, by) || across(ax, by, bx, by);
  return across(ax, ay, bx, by);
}

/* ── the ground ─────────────────────────────────────────────────────────── */

const SUB = 8, DOT = 46;
const LEGEND = MAP.legend as Record<string, string>;
const FINE = (() => {
  const out = new Uint8Array(F2_COLS * SUB * F2_ROWS * SUB);
  (MAP.fine as string[]).forEach((row, sy) => {
    let i = 0, sx = 0;
    while (i < row.length) {
      const c = row.charCodeAt(i++);
      let n = 0;
      while (i < row.length && row[i] >= "0" && row[i] <= "9") n = n * 10 + (row.charCodeAt(i++) - 48);
      for (let k = Math.max(1, n); k > 0; k--) out[sy * F2_COLS * SUB + sx++] = c;
    }
  });
  return out;
})();
const tileLetter = (fx: number, fy: number) => {
  const x = Math.min(Math.max(Math.floor(fx), 0), F2_COLS - 1), y = Math.min(Math.max(Math.floor(fy), 0), F2_ROWS - 1);
  return MAP.ground[y][x];
};
function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul((iy | 0) + 0x165667b1, 0x85ebca6b) ^ Math.imul(seed + 0x3c6ef372, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
function noise(fx: number, fy: number, scale: number, seed: number): number {
  const gx = fx / scale, gy = fy / scale, x0 = Math.floor(gx), y0 = Math.floor(gy);
  let tx = gx - x0, ty = gy - y0;
  tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
const WOBBLE = +MAP.wobble;
/** The ground's letter at a point of the map's own tiles, as the editor draws it (its README's groundAt). */
function letterAt(fx: number, fy: number): string {
  const k0 = tileLetter(fx, fy);
  const sx = Math.floor(fx * SUB), sy = Math.floor(fy * SUB);
  if (sx >= 0 && sy >= 0 && sx < F2_COLS * SUB && sy < F2_ROWS * SUB && FINE[sy * F2_COLS * SUB + sx] !== DOT) return String.fromCharCode(FINE[sy * F2_COLS * SUB + sx]);
  if (!WOBBLE) return k0;
  const n1 = 2 * (noise(fx, fy, 1.6, 11) - 0.5), n2 = 2 * (noise(fx, fy, 1.6, 12) - 0.5);
  return tileLetter(fx + WOBBLE * n1, fy + WOBBLE * n2);
}
/** The editor's kinds of ground are the game's own (its textures are "game texture: grass", …). */
const KIND: Record<string, Ground> = { grass: "grass", road: "road", sand: "sand", water: "water", wood: "wood" };

/* ── the beds ───────────────────────────────────────────────────────────── */

/** How many plots a bed is across and down. */
export const F2_BED = 7;
const BEDS = MAP.roles.beds as Array<[number, number]>;
const BED_AT = (() => {
  const at = new Int16Array(F2_COLS * F2_ROWS).fill(-1);
  BEDS.forEach(([x, y], bed) => { for (let j = 0; j < F2_BED; j++) for (let i = 0; i < F2_BED; i++) at[(y + j - OY) * F2_COLS + x + i - OX] = bed; });
  return at;
})();
/** Which bed a tile is a plot of, by the game's number (the map's), or −1. */
export const f2BedOf = (tx: number, ty: number): number => (inF2(tx, ty) ? BED_AT[(ty - OY) * F2_COLS + tx - OX] : -1);
/** A bed's corner tile nearest the top of the screen. */
export const f2BedCorner = (bed: number): [number, number] => { const c = BEDS[bed]; return c ? [c[0], c[1]] : [OX, OY]; };
export const F2_BEDS = BEDS.length;

/** The look of the ground at a point (for drawing): a bed's plots are the game's field. */
export function f2Ground(x: number, y: number): Ground {
  if (f2BedOf(Math.floor(x), Math.floor(y)) >= 0) return "field";
  return KIND[LEGEND[letterAt(x - OX, y - OY)]] ?? "grass";
}
/** A tile's kind of ground: what most of it is painted (a bed's, field). */
const TILE_GROUND: Ground[] = (() => {
  const out: Ground[] = [];
  for (let ty = 0; ty < F2_ROWS; ty++) for (let tx = 0; tx < F2_COLS; tx++) {
    if (BED_AT[ty * F2_COLS + tx] >= 0) { out.push("field"); continue; }
    const n = new Map<number, number>();
    for (let sy = 0; sy < SUB; sy++) for (let sx = 0; sx < SUB; sx++) {
      const f = FINE[(ty * SUB + sy) * F2_COLS * SUB + tx * SUB + sx], c = f === DOT ? MAP.ground[ty].charCodeAt(tx) : f;
      n.set(c, (n.get(c) ?? 0) + 1);
    }
    out.push(KIND[LEGEND[String.fromCharCode([...n.entries()].sort((a, b) => b[1] - a[1])[0][0])]] ?? "grass");
  }
  return out;
})();
export const f2TileGround = (tx: number, ty: number): Ground => TILE_GROUND[(ty - OY) * F2_COLS + tx - OX] ?? "grass";

/* ── the placed things ──────────────────────────────────────────────────── */

const R = MAP.roles;
/** A placed thing's order back to front (its middle's x + y), as the builder wrote it. */
export const f2Depth = (i: number) => (MAP.objects as number[][])[i]?.[7] ?? 0;

/** The wells, north and south: a 2 × 2 block each (its west-most tile first), and its middle. */
export const F2_WELLS = (R.wells as unknown as Array<{ at: [number, number]; tiles: Array<[number, number]>; thing: number }>).map((w) => ({
  x: Math.min(...w.tiles.map((t) => t[0])), y: Math.min(...w.tiles.map((t) => t[1])), at: { x: w.at[0], y: w.at[1] }, thing: w.thing,
}));
/** The storage chests, north and south: the west tile of the two each stands on, and its pictures shut and open. */
export const F2_CHESTS = (R.chests as unknown as Array<{ tile: [number, number]; tiles: Array<[number, number]>; shut: number; open: number | null }>).map((c) => ({ x: c.tile[0], y: c.tile[1], tiles: c.tiles, shut: c.shut, open: c.open }));
/** The four fire bowls, in the order of the game's fires (the garden's north and south, the barns' side's north and south): the tile a flame is taken by, the bowl unlit and lit. */
export const F2_FIRES = (R.fires as unknown as Array<{ tile: [number, number]; unlit: number; lit: number | null; box: [number, number, number, number] }>).map((f) => ({ x: f.tile[0], y: f.tile[1], unlit: f.unlit, lit: f.lit, box: f.box }));
/** The lamp posts, in the relay's order (each a lantern of the map's, placed by the builder on the barns' side where `added`): the tile it stands on, where its light is (isometric pixels), its picture. */
export const F2_LAMPS = (R.lanterns as unknown as Array<{ tile: [number, number]; head: [number, number]; thing: number; added?: boolean }>).map((l) => ({ x: l.tile[0], y: l.tile[1], head: { x: l.head[0], y: l.head[1] }, thing: l.thing, added: !!l.added }));
/** The scarecrows (the owner, 2026-11-07: "เอากลับมาแต่ทำให้ถ้าบังแปลงผัก ยังสามารถ interact กับแปลงผักข้างหลังได้"): drawn, see-through when they cover what is behind. */
export const F2_SCARECROWS = (R.scarecrows as unknown as Array<{ thing: number; tile: [number, number] }>).map((s) => ({ thing: s.thing, x: s.tile[0], y: s.tile[1] }));
/** The gates' rings (to the town), north and south: where each is. */
export const F2_RINGS = (R.rings as unknown as Array<{ thing: number; centre: [number, number] }>).map((r) => ({ thing: r.thing, x: r.centre[0], y: r.centre[1] }));
/** The barns' four looks, plainest first (the game's facades 0..3): each's pictures shut, open and inside, and where each stands from its barn's corner (isometric pixels). */
export const F2_DESIGNS = R.designs as unknown as Array<{ shut: number; open: number; inside: number; at: Record<"shut" | "open" | "inside", [number, number]> }>;
/** An animal's food tray, full and empty: its picture, where it stands from its tile's middle (isometric pixels), and which tile of its barn the map has it on. */
export const F2_TRAYS = R.trays as unknown as Record<"full" | "empty", { thing: number; at: [number, number]; from: [number, number] }>;

/* ── the farm's own places ──────────────────────────────────────────────── */

const tilesOf = (t: Array<[number, number]>) => t.map(([x, y]) => [x, y] as const);
/** Uncle Popoto's stall (the map's livestock stall): its tiles, its middle. */
export const F2_STALL = { thing: R.stall.thing, tiles: tilesOf(R.stall.tiles as Array<[number, number]>), at: { x: R.stall.centre[0], y: R.stall.centre[1] } };
/** The making table (the map's cheese counter): its two tiles, the west one first. */
export const F2_TABLE = { thing: R.table.thing, tiles: tilesOf(R.table.tiles as Array<[number, number]>) };
/** The village's water trough by the pen. */
export const F2_WATER_TROUGH = { thing: R.waterTrough.thing, tiles: tilesOf(R.waterTrough.tiles as Array<[number, number]>) };
/** Uncle Popoto's pen: the ground inside its fence. */
export const F2_PEN = { x: R.pen.x, y: R.pen.y, w: R.pen.w, h: R.pen.h };
/** The duck pond: the middle of its water and how far it goes each way. */
export const F2_POND = R.pond as unknown as { cx: number; cy: number; rx: number; ry: number };
/** The 24 barns' plots, by number: 8 × 4, the door in the middle of the front, with the two tiles in front of it, the hay and the nest. */
export const F2_BARN_PLOTS = (R.barns as unknown as Array<{ x: number; y: number; door: Array<[number, number]>; step: Array<[number, number]>; hay: [number, number]; nest: [number, number] }>);

/* ── the benches ────────────────────────────────────────────────────────── */

/** A bench's places in the editor's farm are told apart from the town's by this much added to its thing's number. */
export const F2_BENCH_OF = 100_000;
const FRONT: Record<Facing, Vec> = { SE: { x: 1, y: 0 }, SW: { x: 0, y: 1 }, NE: { x: 0, y: -1 }, NW: { x: -1, y: 0 } };
/** How far up the screen a sitter is drawn from their seat's point, isometric pixels (components/town/Town.tsx's SEAT_LIFT). */
const SEAT_LIFT = 12;
/** The isometric point's tile point. */
const fromIso = (ix: number, iy: number): Vec => ({ x: (ix / 32 + iy / 16) / 2, y: (iy / 16 - ix / 32) / 2 });
/**
 * The benches' seats, a prop to each (the map's own: README §6's `sit`, its point where the sitter's foot is drawn, its
 * facing and which side of the bench it is drawn on): the seat's tile (closed: one sits there from beside it), where the
 * sitter is drawn, the tile one stands on to sit down (before it, else the nearest open one beside it), and its order
 * back to front, just after the bench's picture.
 */
export const F2_BENCHES: Prop[] = (R.benches as unknown as Array<{ thing: number; seats: Array<{ tile: [number, number]; facing: Facing; point: [number, number] }> }>).flatMap((b) => b.seats.map((s) => {
  // (the map's point is where the sitter's foot is drawn; the game draws a sitter SEAT_LIFT over its seat's point)
  const [x, y] = s.tile, f = FRONT[s.facing], seat = fromIso(s.point[0], s.point[1] + SEAT_LIFT);
  const free = (tx: number, ty: number) => f2Open(tx, ty) && !f2OverEdge(x, y, tx, ty);
  let stand: Vec | null = free(x + f.x, y + f.y) ? { x: x + f.x, y: y + f.y } : null;
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (!stand && free(x + dx, y + dy)) stand = { x: x + dx, y: y + dy };
  return { kind: "bench", x, y, solid: true, facing: s.facing, seat, stand: stand ?? { x: x + f.x, y: y + f.y }, over: f2Depth(b.thing) + 0.01, of: F2_BENCH_OF + b.thing } as Prop;
}));

/* ── the animals' lanes ─────────────────────────────────────────────────── */

const g = (x: number, y: number) => ({ x: x + OX, y: y + OY });
/**
 * The barns' side, as lib/town/pasture lays out its animals' ways: its extent (east of the garden's fence, the barn gates
 * at the map's x 81 and 82), each row of barns' lane (the top row of two; a barn stands five rows above it), its barns'
 * four columns, and the lanes as a network of the map's roads (nodes where they meet, and the stretches between):
 * - the six lanes the rows of barns face, from the west lane (x 91-92) to the east one (x 134-135);
 * - the north lane (rows 12-13) and the short one across the middle (rows 59-60, from the middle lane east);
 * - the three lanes down: the west, the middle (x 112-113) and the east; and the north-west one (x 86-87) from the north
 *   lane down to the north gate's road;
 * - the garden's two roads (rows 25-28 and 77-80) through the barn gates, and its lane down the middle (x 47-50).
 * All in the map's own tiles here, the game's below.
 */
const LANE_ROWS = [21, 32, 43, 68, 79, 90];
const laneMid = (r: number) => r + 1;
const NODES_MAP: Record<string, [number, number]> = {};
LANE_ROWS.forEach((r, k) => { NODES_MAP[`W${k}`] = [92, laneMid(r)]; NODES_MAP[`C${k}`] = [113, laneMid(r)]; NODES_MAP[`E${k}`] = [135, laneMid(r)]; });
Object.assign(NODES_MAP, {
  NW: [87, 13], NC: [113, 13], NE: [135, 13], NG: [87, 27], WN: [92, 27], GN: [82, 27], GS: [81, 79],
  MC: [113, 60], ME: [135, 60],
  A1: [49, 27], A0: [18, 27], B1: [49, 79], B0: [18, 79], N0: [49, 5], N1: [49, 100],
});
const EDGES_MAP: Array<[string, string]> = [
  ...LANE_ROWS.flatMap((_, k) => [[`W${k}`, `C${k}`], [`C${k}`, `E${k}`]] as Array<[string, string]>),
  ["W0", "WN"], ["WN", "W1"], ["W1", "W2"], ["W2", "W3"], ["W3", "W4"], ["W4", "W5"],
  ["NC", "C0"], ["C0", "C1"], ["C1", "C2"], ["C2", "MC"], ["MC", "C3"], ["C3", "C4"], ["C4", "C5"],
  ["NE", "E0"], ["E0", "E1"], ["E1", "E2"], ["E2", "ME"], ["ME", "E3"], ["E3", "E4"], ["E4", "E5"],
  ["NW", "NC"], ["NC", "NE"], ["NW", "NG"], ["NG", "WN"], ["MC", "ME"],
  ["GN", "NG"], ["GS", "W4"],
  ["A1", "GN"], ["A0", "A1"], ["B1", "GS"], ["B0", "B1"], ["N0", "A1"], ["A1", "B1"], ["B1", "N1"],
];
export const F2_PASTURE = {
  /** The barns' side: east of the garden's fence. */
  area: { x: OX + 83, y: OY, w: F2_COLS - 83, h: F2_ROWS },
  laneRows: LANE_ROWS.map((r) => r + OY),
  /** The west column of each of a row's four barns. */
  barnCols: [94, 103, 115, 124].map((x) => x + OX),
  /** The lanes down: west (two columns, its west one), middle and east, and how far each runs. */
  nsLanes: { west: { x: 91 + OX, y0: 21 + OY, y1: 91 + OY }, mid: { x: 112 + OX, y0: 12 + OY, y1: 91 + OY }, east: { x: 134 + OX, y0: 12 + OY, y1: 91 + OY } },
  /** How far east the lanes run (their last column). */
  laneEnd: 135 + OX,
  /** The barn gates in the garden's fence, north and south: the rows each leaves open and the road through it. */
  gates: [{ name: "north" as const, rows: [26 + OY, 27 + OY] as const, road: 26 + OY, x: 82 + OX }, { name: "south" as const, rows: [78 + OY, 79 + OY] as const, road: 78 + OY, x: 81 + OX }],
  nodes: Object.fromEntries(Object.entries(NODES_MAP).map(([k, [x, y]]) => [k, g(x, y)])) as Record<string, Vec>,
  edges: EDGES_MAP as ReadonlyArray<readonly [string, string]>,
  /** The hay wagon's stop: by the north barn gate, between the two lanes down. */
  wagon: [89 + OX, 23 + OY] as const,
  /**
   * The garden's blocks an animal roams (x and y spans, map's tiles + the corner): between its beds' columns either side
   * of its lane down, between its roads; and its lanes they are entered from.
   */
  garden: {
    xs: [[17, 33], [33, 46], [52, 64], [64, 81]].map(([a, b]) => [a + OX, b + OX] as const),
    ys: [[4, 13], [13, 22], [29, 41], [41, 51], [53, 65], [65, 76], [81, 93], [93, 101]].map(([a, b]) => [a + OY, b + OY] as const),
    lanes: [[g(18, 27), g(82, 27)], [g(18, 79), g(81, 79)], [g(49, 5), g(49, 100)]] as ReadonlyArray<readonly [Vec, Vec]>,
  },
  /** The meadows: the strip north of the pen and the pond, and the wide grass south of the last row of barns. */
  meadow: { x: 93 + OX, y: 45 + OY, w: 40, h: 3 },
  southMeadow: { x: 93 + OX, y: 93 + OY, w: 44, h: 10 },
};
