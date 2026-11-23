/**
 * The city (the owner, 2026-11-23: "ช่วยเพิ่มแมพใหม่เป็นเมืองโดยมีรายละเอียดตามไฟล์ cashcity ใน Download คิดว่าน่าจะ replace
 * แมพเดิม", and of the plan, "ตามที่แนะนำทั้งหมด เริ่มทำได้เลย"): a 140 × 135 map of the Cashtown map editor, the town that
 * takes the place of the editor's town of 2026-10-22 (lib/town/town2, kept behind the database's switch as the way back).
 * lib/town/world asks lib/town/ed for the town, and ed gives it this module or town2's, which have the same shape: every
 * name here is town2's, meaning the same for the city.
 *
 * What is here was made from the editor's export by .claude/skills/fc-cash-town/scripts/pixel/build-city.mjs
 * (city-map.json, in the game's tiles: the map's corner is at (-16, 0), so that it ends at x 123, short of the farm at 128),
 * and given its parts in the game by hand below, from the owner's labels on his two pictures of 2026-11-23: the city hall
 * (a chest and a crafting table), the uncle's shop, the smith's ("ร้านตีบวก"), the kitchen (a chest, a crafting table, the
 * stove, the water tank), the bank, the casino, the clothes shop, the event hall, the hospital, the museum, the condo, the
 * port, the park's chest, trade board and notice board.
 *
 * ── Where may be walked (the map's own, README: "Never work out again what the map states") ──
 * - Its `collision`: a building, a lamp, a bench, a stall closes its tiles; flowers are walked over.
 * - Water (a tile half or more of which is painted water) is not walked on; it is fished from its edge.
 * - The dock at the beach is walked on, over the water, level with the sand; fished from (deep water).
 * - Nobody crosses its edges: the fences, the walls of the rooms (each with a doorway left open), and where the ground
 *   steps two or more steps up or down (the park's and the canals' walls). A kerb (one step) is walked over.
 * - The park is four steps down, entered by its four stairs; the roads one step below the pavements.
 * - The rooms (the city hall, the kitchen, the hospital, the bank, the uncle's mart) are walked into by their doorways;
 *   whoever is in one sees its cut-away inside, everybody else its outside.
 * - A ring of light is a way out (GATES). The edges of the map are closed but at the rings.
 */
import MAP from "./city-map.json";
import type { Facing, Fishing, Ground, Prop, PropKind, Vec } from "./world";
import type { T2Look, T2Thing } from "./town2";

const [OX, OY] = MAP.origin as [number, number];
export const T2_COLS: number = MAP.cols;
export const T2_ROWS: number = MAP.rows;
/** Where the city's corner is in the game's tiles. */
export const T2_ORIGIN = { x: OX, y: OY } as const;
export const inT2 = (x: number, y: number) => x >= OX && y >= OY && x < OX + T2_COLS && y < OY + T2_ROWS;
const SUB = 8;

/* ── the ground ─────────────────────────────────────────────────────────── */

const LEGEND = MAP.legend as Record<string, string>;
const TEXTURES = MAP.textures as Record<string, { src: string; perTile: number }>;
/** A kind of ground the map paints but has no picture of: drawn in its nearest. */
const STAND_IN: Record<string, string> = {
  road_border: "road", packed_brown_earth_with: "game_road", creambrick1: "creambrick3", creambrick2: "creambrick3",
  cream_brick_running_bond: "creambrick3", mixed_size_gray: "mixed_size_gray_1", mixedflower: "mixedflower3", mixedflower2: "mixedflower3",
};
const textureOf = (name: string) => (TEXTURES[name] ? name : TEXTURES[STAND_IN[name]] ? STAND_IN[name] : "grass");
// (a look of the city's is "t2:<its texture>": not one of the editor's town's names, which the type lists, but drawn the same way by lib/town/scenery)
const lookOf = (name: string) => `t2:${textureOf(name)}` as unknown as T2Look;
/** Each kind of ground's look (lib/town/scenery draws each from its own texture), and the texture. */
export const T2_LOOKS: readonly T2Look[] = Object.keys(TEXTURES).map((n) => `t2:${n}` as unknown as T2Look);
export const T2_TEXTURES: Array<{ look: T2Look; src: string }> = Object.entries(TEXTURES).map(([name, t]) => ({ look: `t2:${name}` as unknown as T2Look, src: `/town/city/${t.src}` }));
/** What each look is to the game's rules (insects, digging, what grows where). */
const GROUND_OF = (name: string): Ground => {
  const n = textureOf(name);
  if (/water/.test(n)) return "water";
  if (/sand/.test(n)) return "sand";
  if (/grass|flower/.test(n)) return "grass";
  if (/game_road|^road$/.test(n)) return "road";
  if (/wood/.test(n)) return "wood";
  return "plaza";
};

const DOT = 46;
const FINE = (() => {
  const out = new Uint8Array(T2_COLS * SUB * T2_ROWS * SUB);
  (MAP.fine as string[]).forEach((row, sy) => {
    let i = 0, sx = 0;
    while (i < row.length) {
      const c = row.charCodeAt(i++);
      let n = 0;
      while (i < row.length && row[i] >= "0" && row[i] <= "9") n = n * 10 + (row.charCodeAt(i++) - 48);
      for (let k = Math.max(1, n); k > 0; k--) out[sy * T2_COLS * SUB + sx++] = c;
    }
  });
  return out;
})();
/** The map's own tile (clamped to it) of a point of the map's own tiles. */
const clampX = (fx: number) => Math.min(Math.max(Math.floor(fx), 0), T2_COLS - 1);
const clampY = (fy: number) => Math.min(Math.max(Math.floor(fy), 0), T2_ROWS - 1);
const tileLetter = (fx: number, fy: number) => (MAP.ground as string[])[clampY(fy)][clampX(fx)];
const WOBBLE = MAP.wobble as { all: number; kinds: Record<string, number> };
const wobble = (k: string) => (k === "_" ? 0 : +(WOBBLE.kinds[LEGEND[k]] ?? WOBBLE.all));
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
/** The ground's letter at a point of the map's own tiles, as the editor draws it (its README's groundAt). */
function letterAt(fx: number, fy: number): string {
  const k0 = tileLetter(fx, fy);
  if (k0 === "_") return k0;
  const sx = Math.floor(fx * SUB), sy = Math.floor(fy * SUB);
  if (sx >= 0 && sy >= 0 && sx < T2_COLS * SUB && sy < T2_ROWS * SUB && FINE[sy * T2_COLS * SUB + sx] !== DOT) return String.fromCharCode(FINE[sy * T2_COLS * SUB + sx]);
  const a0 = wobble(k0);
  if (!a0) return k0;
  const n1 = 2 * (noise(fx, fy, 1.6, 11) - 0.5), n2 = 2 * (noise(fx, fy, 1.6, 12) - 0.5);
  const k = tileLetter(fx + a0 * n1, fy + a0 * n2);
  if (k === k0) return k;
  const a = Math.min(a0, wobble(k));
  return a === a0 ? k : tileLetter(fx + a * n1, fy + a * n2);
}
/** The look of the ground at a point of the city (the game's tiles). */
export function t2Look(x: number, y: number): T2Look {
  return lookOf(LEGEND[letterAt(x - OX, y - OY)] ?? "grass");
}
/** The kind of ground of a tile: what most of it is painted. */
const TILE_GROUND: Ground[] = (() => {
  const out: Ground[] = [];
  for (let ty = 0; ty < T2_ROWS; ty++) for (let tx = 0; tx < T2_COLS; tx++) {
    const n = new Map<number, number>();
    for (let sy = 0; sy < SUB; sy++) for (let sx = 0; sx < SUB; sx++) {
      const f = FINE[(ty * SUB + sy) * T2_COLS * SUB + tx * SUB + sx], c = f === DOT ? (MAP.ground as string[])[ty].charCodeAt(tx) : f;
      n.set(c, (n.get(c) ?? 0) + 1);
    }
    out.push(GROUND_OF(LEGEND[String.fromCharCode([...n.entries()].sort((a, b) => b[1] - a[1])[0][0])] ?? "grass"));
  }
  return out;
})();
export const t2Ground = (tx: number, ty: number): Ground => TILE_GROUND[(ty - OY) * T2_COLS + tx - OX] ?? "grass";

/** The city has no ground beyond its edges to look at (the editor's town had its far banks): the sea ends at the map's edge. */
export const T2_BANKS: Array<{ x: number; y: number; w: number; h: number }> = [];
export const inT2Banks = (_x: number, _y: number) => false;
export function t2BankLook(_x: number, _y: number): T2Look | null { return null; }

/* ── what stands there ──────────────────────────────────────────────────── */

const OBJECTS = MAP.objects as number[][];
export const T2_THINGS: T2Thing[] = OBJECTS.map((o, i) => ({
  i, name: MAP.names[o[0]], box: [o[8], o[9], o[10], o[11]], c: { x: (o[8] + o[10]) / 2, y: (o[9] + o[11]) / 2 },
}));
/** How narrow a strip of a wide thing is, in isometric pixels (lib/town/city-art draws such a thing in upright strips). */
export const T2_STRIP = 12;
/** Where a strip of a wide thing stands back to front: its footprint's front edge under the strip's middle (an isometric x). */
export const t2StripDepth = ([bx0, by0, bx1, by1]: readonly number[], mid: number) =>
  mid <= (bx1 - by1) * 32 ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
/** Nothing of the export is left out of the city. */
export const T2_LEFT_OUT = new Set<number>();
/** Tiles under a box (whose middles are inside it). */
const tilesIn = ([x0, y0, x1, y1]: readonly number[]): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let y = Math.floor(y0); y <= Math.floor(y1); y++) for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
    if (x + 0.5 >= x0 && x + 0.5 <= x1 && y + 0.5 >= y0 && y + 0.5 <= y1) out.push([x, y]);
  }
  return out;
};
const named = (re: RegExp) => T2_THINGS.filter((t) => re.test(t.name));
const first = (re: RegExp) => { const t = named(re)[0]; if (!t) throw new Error(`city: no ${re}`); return t; };
function boxOf(b: readonly number[]) {
  const ts = tilesIn(b), xs = ts.map(([x]) => x), ys = ts.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
}
/** A point of the map's own tiles in the game's. */
const g = (x: number, y: number): Vec => ({ x: x + OX, y: y + OY });

/* ── the rooms ──────────────────────────────────────────────────────────── */

type RoomName = "cityhall" | "kitchen" | "hospital" | "bank" | "mart";
interface Room { name: RoomName; out: number; in: number; box: [number, number, number, number]; doors: Array<{ inside: [number, number]; outside: [number, number] }> }
/** The rooms walked into: each's outside and inside pictures, its footprint (tiles, the far edges not in it), and its doorways. */
export const T2_ROOMS: Room[] = (MAP.roles.rooms as unknown as Room[]);
const room = (name: RoomName) => T2_ROOMS.find((r) => r.name === name)!;
/** Which room a tile is in, or null. */
export const t2RoomAt = (x: number, y: number): Room | null => {
  for (const r of T2_ROOMS) if (x >= r.box[0] && y >= r.box[1] && x < r.box[2] && y < r.box[3]) return r;
  return null;
};

/* ── the city's places ──────────────────────────────────────────────────── */

/** The park's fountain (the potato fountain in its middle): a landmark, not walked on; people appear round it. */
const BASIN = first(/potato_park_fountain/);
export const T2_FOUNTAIN = { ...boxOf(BASIN.box) };
export const T2_FOUNTAIN_THING = BASIN.i;
/** The park: four steps down in the middle of the city, its fountain in its middle. */
export const T2_PLAZA = { x: 50 + OX, y: 52 + OY, w: 40, h: 36 };
/** The city as against its edges, for what roams it (critters, the popotos' outings). */
export const T2_TOWN = { x: 6 + OX, y: 6 + OY, w: 126, h: 112 };
/** The storage chests (one box, the member's own, opened at any of them): the park's first, then the city hall's and the kitchen's. */
const CHESTS = (MAP.roles.chests as unknown as Array<{ at: [number, number]; tiles: Array<[number, number]>; shut: number; open: number | null }>)
  .slice().sort((a, b) => Math.abs(a.at[0] - 39.5) + Math.abs(a.at[1] - 60.6) - (Math.abs(b.at[0] - 39.5) + Math.abs(b.at[1] - 60.6)));
const PARK_CHEST = CHESTS[0];
export const T2_STOREBOX = { x: PARK_CHEST.tiles[0][0], y: PARK_CHEST.tiles[0][1] };
export const T2_CHEST_OPEN = PARK_CHEST.open ?? -1;
export const T2_CHEST_SHUT = PARK_CHEST.shut;
/** Every chest of the city: the tile its storage box answers at (the database's box.at and box.more), its pictures. */
export const T2_CHESTS = CHESTS.map((c) => ({ x: c.tiles[0][0], y: c.tiles[0][1], tiles: c.tiles, shut: c.shut, open: c.open ?? -1 }));
/** The Popoto Board (news and votes): the notice board at the park's west corner (the owner's red ring, "บอร์ดประกาศ"). */
const NOTICE = first(/^noticeboard$/);
export const T2_BOARD = boxOf(NOTICE.box);
export const T2_BOARD_THING = NOTICE.i;
/** The trade board: the blue board in the park's north (the owner's "บอร์ดซื้อขาย"). */
const TRADE = first(/^board$/);
export const T2_TRADE_BOARD = boxOf(TRADE.box);
export const T2_TRADE_THING = TRADE.i;
/** The crafting tables: the city hall's and the kitchen's (the owner: "มีกล่อง+โต๊ะคราฟ"), each opening the crafting panel. */
export const T2_CRAFT_TABLES = [first(/^create_isometric_crafting_table/), first(/^pixel_art_kitchen_crafting_table/)].map((t) => ({ thing: t.i, tiles: tilesIn(t.box), at: t.c }));
/** The uncle's shop: the 24 mart north of the city hall's road ("ร้านค้าลุง"), walked into; he keeps it from inside. */
const MART = room("mart");
export const T2_SHOP = { x: MART.box[0], y: MART.box[1], w: MART.box[2] - MART.box[0], h: MART.box[3] - MART.box[1], stage: 2 };
/** The uncle in his mart, before the drinks' fridges; the banker in the bank, before its counter (each `at` where the popoto stands, closing its tile). */
const BANK = room("bank");
export const T2_KEEPERS = [
  { id: "uncle" as const, stand: { x: (MART.box[0] + MART.box[2]) / 2, y: (MART.box[1] + MART.box[3]) / 2 }, at: g(75.55, 24.55), tiles: [[75 + OX, 24 + OY]] as Array<[number, number]> },
  { id: "banker" as const, stand: { x: (BANK.box[0] + BANK.box[2]) / 2, y: (BANK.box[1] + BANK.box[3]) / 2 }, at: g(21.5, 108.55), tiles: [[21 + OX, 108 + OY]] as Array<[number, number]> },
];
/**
 * The smith at his shop's door ("ร้านตีบวก": the weapon shop with the knight in its window, north-east of the mart), on
 * the pavement before its south-west face, where its door and hanging sign are; whoever is within `reach` of the shop is by it.
 */
const SMITHY = first(/^pixel_art_weapon_shop_building/);
export const T2_SMITH = {
  // (`stand` is where "by the forge" is measured from: the shop's front, by its door, so that the editor's town's reach of six
  // holds; the database keeps the same, forge.stand)
  id: "smith" as const, stand: g(86.5, 26.5), at: g(85.5, 29.55), board: g(85.5, 31.1), sign: SMITHY.c,
  fire: [0, 0] as [number, number], tiles: [[85 + OX, 29 + OY]] as Array<[number, number]>, reach: 6,
};
/**
 * The clothes shop's door, the way into Granny Twilla's shop (lib/town/shop-room): its door under the striped awning, near
 * the left end of its south-west face. `tile` is the shop's tile behind the door, which nobody stands on: walked onto
 * only to go in (lib/town/world's findPath); `out` the pavement before it; `at` the door's foot, for its name and tap.
 */
export const T2_SHOP_DOOR = { tile: [62 + OX, 107 + OY] as [number, number], out: g(62.5, 108.5), at: g(62.4, 108) };
/**
 * The casino's door, the way into the Popoto Casino (lib/town/casino-room): its red carpet and steps in the porch of its
 * south-east face (the map leaves the porch open: tiles 31 to 32, rows 105 to 106). `tile` is the porch's inner tile;
 * `out` the pavement before it; `at` its foot.
 */
export const T2_CASINO_DOOR = { tile: [31 + OX, 105 + OY] as [number, number], out: g(33.5, 105.5), at: g(32.4, 105.6) };

/* ── the kitchen ────────────────────────────────────────────────────────── */

const KITCHEN_ROOM = room("kitchen");
/** The kitchen's floor (inside its walls, as tiles x0..x1, y0..y1), and its doorway. */
const FLOOR_BOX = { x0: KITCHEN_ROOM.box[0], y0: KITCHEN_ROOM.box[1], x1: KITCHEN_ROOM.box[2] - 1, y1: KITCHEN_ROOM.box[3] - 1 };
export const T2_HALL_DOORS = KITCHEN_ROOM.doors;
export const t2InHall = (x: number, y: number) => x >= FLOOR_BOX.x0 && x <= FLOOR_BOX.x1 && y >= FLOOR_BOX.y0 && y <= FLOOR_BOX.y1;
/** The kitchen's things, by their footprints. */
const HALL_THINGS = T2_THINGS.filter((t) => t.i !== KITCHEN_ROOM.out && t.i !== KITCHEN_ROOM.in && !/^terrain$|^wall$/.test(t.name)
  && t.c.x > FLOOR_BOX.x0 - 0.5 && t.c.x < FLOOR_BOX.x1 + 1 && t.c.y > FLOOR_BOX.y0 - 0.5 && t.c.y < FLOOR_BOX.y1 + 1);
export const T2_HALL = { thing: KITCHEN_ROOM.out, inside: KITCHEN_ROOM.in, box: T2_THINGS[KITCHEN_ROOM.out].box, floor: FLOOR_BOX, things: HALL_THINGS.map((t) => t.i) };

/* ── where may be walked ────────────────────────────────────────────────── */

const WALK: string[] = MAP.walk;
const EDGE = new Set<string>((MAP.edges as Array<[number, number, string]>).map(([x, y, s]) => `${x},${y},${s}`));
/** What a tile is: "." ground, "~" water, "#" something standing (a seat too, sat on from beside it), "=" the dock's boards, "f" the kitchen's floor. */
export function t2Tile(tx: number, ty: number): string {
  if (!inT2(tx, ty)) return "#";
  const c = WALK[ty - OY][tx - OX];
  if (c === " " || c === "s") return "#";
  if (c === "." && t2InHall(tx, ty)) return "f";
  return c;
}
export const T2_DECK = (x: number, y: number) => inT2(x, y) && WALK[y - OY][x - OX] === "=";
/** Whether a step across one tile edge crosses a fence, a room's wall or a step in the ground (README §8, §11: side n of a tile is its north edge, w its west). */
function across(ax: number, ay: number, bx: number, by: number): boolean {
  if (bx === ax && by === ay - 1) return EDGE.has(`${ax},${ay},n`);
  if (bx === ax && by === ay + 1) return EDGE.has(`${bx},${by},n`);
  if (by === ay && bx === ax - 1) return EDGE.has(`${ax},${ay},w`);
  if (by === ay && bx === ax + 1) return EDGE.has(`${bx},${by},w`);
  return false;
}
/** Whether a step goes over a fence, through a wall or up a wall of ground; a step on the slant does if either way round its corner would. */
export function t2OverWall(ax: number, ay: number, bx: number, by: number): boolean {
  if (ax !== bx && ay !== by) return across(ax, ay, bx, ay) || across(bx, ay, bx, by) || across(ax, ay, ax, by) || across(ax, by, bx, by);
  return across(ax, ay, bx, by);
}
/** No railings in the city: its edges say it all (t2OverWall). */
export function t2OverRail(_ax: number, _ay: number, _bx: number, _by: number): boolean { return false; }

/** No stage in the city (the editor's town's festival stage): nothing is on it, nothing stands at it. */
export const T2_STAGE: T2Thing = { i: -1, name: "", box: [-1e4, -1e4, -1e4, -1e4], c: { x: -1e4, y: -1e4 } };
export const T2_STAGE_UP = 0;
export const T2_STAGE_BASE = { x: -1e4, y: -1e4, r: 0 };
export const t2OnStage = (_x: number, _y: number) => false;

/* ── the ground's heights (README §11) ──────────────────────────────────── */

const STEP: number = MAP.terrain.step, SOFT: number = MAP.terrain.soft;
const HEIGHT = MAP.height as string[];
const heightOf = (x: number, y: number) => HEIGHT[y].charCodeAt(x) - 75;
const STAIRS = new Map<string, [number, number, string, number, string?]>((MAP.stairs as Array<[number, number, string, number, string?]>).map((s) => [`${s[0] - OX},${s[1] - OY}`, s]));
/** The tile whose ground shows at a point of the map's own tiles (README §11's srcTile). */
function srcTile(fx: number, fy: number): [number, number] {
  const x0 = Math.floor(fx), y0 = Math.floor(fy), k0 = (MAP.ground as string[])[y0][x0];
  if (k0 === "_") return [x0, y0];
  const a0 = wobble(k0);
  if (!a0) return [x0, y0];
  const n1 = 2 * (noise(fx, fy, 1.6, 11) - 0.5), n2 = 2 * (noise(fx, fy, 1.6, 12) - 0.5);
  let x = clampX(fx + a0 * n1), y = clampY(fy + a0 * n2);
  const k = (MAP.ground as string[])[y][x];
  if (k !== k0) {
    const a = Math.min(a0, wobble(k));
    if (a !== a0) { x = clampX(fx + a * n1); y = clampY(fy + a * n2); }
  }
  if (x === x0 && y === y0) return [x, y];
  const hard = STAIRS.has(`${x0},${y0}`) || STAIRS.has(`${x},${y}`) || Math.abs(heightOf(x0, y0) - heightOf(x, y)) > SOFT;
  return hard ? [x0, y0] : [x, y];
}
/**
 * How far up the screen somebody standing at a point is drawn, in isometric pixels: the ground's height there (README
 * §11's elevAt), below 0 where it is sunk (the park, a road, the dock's water under its boards is not: its boards are
 * level with the beach). On stairs a step a tread.
 */
export function t2Lift(x: number, y: number): number {
  const fx = x - OX, fy = y - OY;
  if (fx < 0 || fy < 0 || fx >= T2_COLS || fy >= T2_ROWS) return 0;
  const [tx, ty] = srcTile(fx, fy);
  const h = heightOf(tx, ty), s = STAIRS.get(`${tx},${ty}`);
  if (!s) return h * STEP;
  const way = s[2], rise = s[3];
  const t = way === "NE" ? 1 - (fy - ty) : way === "SE" ? fx - tx : way === "SW" ? fy - ty : 1 - (fx - tx);
  if (s[4] === "ramp") return (h + rise * Math.min(1, Math.max(0, t))) * STEP;
  return (h + Math.min(rise - 1, Math.max(0, Math.floor(t * rise))) + 1) * STEP;
}

/* ── the kitchen, as lib/town/world's KITCHEN ───────────────────────────── */

type Station = "stove" | "table" | "fire";
const beside = (tiles: Array<[number, number]>, open: (x: number, y: number) => boolean) => {
  const out: Array<[number, number]> = [], on = new Set(tiles.map((t) => t.join(",")));
  for (const [x, y] of tiles) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = `${x + dx},${y + dy}`;
    if (!on.has(k) && open(x + dx, y + dy) && !out.some((o) => o.join(",") === k)) out.push([x + dx, y + dy]);
  }
  return out;
};
/** How high the dining table's top is over the floor, in isometric pixels, and how wide a pot on it is drawn (TownCook's). */
const TABLE_UP = 26, POT_WIDE = 24;
/** How far up the screen a bench's sitter is drawn from the map's seat point (components/town/Town.tsx's SEAT_LIFT). */
const SEAT_LIFT = 12;
const fromIso = (ix: number, iy: number): Vec => ({ x: (ix / 32 + iy / 16) / 2, y: (iy / 16 - ix / 32) / 2 });
const iso = (p: Vec) => ({ x: (p.x - p.y) * 32, y: (p.x + p.y) * 16 });
type Seat = { tile: [number, number]; facing: Facing; point: [number, number]; lift: number; view: string; mirror: boolean; draw: string };
const BENCHES = MAP.roles.benches as unknown as Array<{ thing: number; seats: Seat[] }>;
const FRONT: Record<Facing, Vec> = { SE: { x: 1, y: 0 }, SW: { x: 0, y: 1 }, NE: { x: 0, y: -1 }, NW: { x: -1, y: 0 } };
const depthOf = (i: number) => OBJECTS[i]?.[7] ?? 0;
/**
 * The kitchen as lib/town/world's KITCHEN (the cooking yard's shape, which the cooking games and the database's copies
 * read): its floor, its doorway, where one cooks (by the stove counter or the kitchen's worktable), washes (by the water
 * tank) and sits to eat (the dining table, three to a bench). Points of the picture are isometric pixels from `foot`, the
 * doorway's threshold.
 */
export const T2_KITCHEN = (() => {
  const door = KITCHEN_ROOM.doors.slice().sort((a, b) => a.outside[0] - b.outside[0])[0];
  const foot = { x: door.outside[0], y: door.outside[1] };
  const px = (p: Vec) => { const a = iso(p), f = iso(foot); return { x: a.x - f.x, y: a.y - f.y }; };
  const at = (pxx: number, pyy: number): Vec => ({ x: foot.x + (pyy / 16 + pxx / 32) / 2, y: foot.y + (pyy / 16 - pxx / 32) / 2 });
  const floor: Array<[number, number]> = [];
  for (let y = FLOOR_BOX.y0; y <= FLOOR_BOX.y1; y++) for (let x = FLOOR_BOX.x0; x <= FLOOR_BOX.x1; x++) if (WALK[y - OY][x - OX] === ".") floor.push([x, y]);
  const open = (x: number, y: number) => floor.some(([fx, fy]) => fx === x && fy === y);
  const tilesOf = (re: RegExp) => HALL_THINGS.filter((t) => re.test(t.name)).map((t) => tilesIn(t.box));
  const stoves = tilesOf(/^kitchen$/), jars = tilesOf(/^create_kitchen_water_storage/), worktables = tilesOf(/^pixel_art_kitchen_crafting_table/);
  const places: Array<{ at: [number, number]; kind: Station }> = [];
  const put = (kind: Station, tiles: Array<[number, number]>) => { for (const t of tiles) if (!places.some((p) => p.at.join(",") === t.join(","))) places.push({ at: t, kind }); };
  for (const s of stoves) put("stove", beside(s, open));
  for (const t of worktables) put("table", beside(t, open));
  // (and the city hall's crafting table, "ตึกเทศบาล มีกล่อง+โต๊ะคราฟ": a worktable too, so that whoever stands at it has the
  // table's panel, its workbench with it; the tiles beside it on the hall's floor)
  {
    const hall = room("cityhall"), onFloor = (x: number, y: number) => x >= hall.box[0] && x < hall.box[2] && y >= hall.box[1] && y < hall.box[3] && WALK[y - OY]?.[x - OX] === ".";
    put("table", beside(T2_CRAFT_TABLES[0].tiles, onFloor));
  }
  const wash = jars.flatMap((j) => beside(j, open)).filter(([x, y]) => !places.some((p) => p.at[0] === x && p.at[1] === y));
  const tableThings = HALL_THINGS.filter((t) => /^dining_table$/.test(t.name)).sort((a, b) => a.c.x - b.c.x);
  // the benches' seats, the map's own (README §6's `sit`): the far benches' (facing the viewer) first
  const hallBenches = BENCHES.filter((b) => HALL_THINGS.some((t) => t.i === b.thing));
  const seats = hallBenches.flatMap((b) => b.seats.map((s) => ({ b, s }))).sort((a, b) => Number(a.s.facing === "NE" || a.s.facing === "NW") - Number(b.s.facing === "NE" || b.s.facing === "NW") || a.s.point[0] - b.s.point[0]).map(({ b, s }) => {
    const p = fromIso(s.point[0], s.point[1]), q = px(p), back = s.facing === "NE" || s.facing === "NW";
    const tc = T2_THINGS[b.thing].c, table = Math.max(0, tableThings.findIndex((t) => Math.abs(t.c.x - tc.x) < 3));
    // where one stands to sit down there: behind the bench, away from the table, else the nearest floor beside it
    const f = FRONT[s.facing], [sx, sy] = s.tile;
    const stand = (open(sx - f.x, sy - f.y) ? [sx - f.x, sy - f.y] : floor.slice().sort((a, c) => Math.hypot(a[0] + 0.5 - p.x, a[1] + 0.5 - p.y) - Math.hypot(c[0] + 0.5 - p.x, c[1] + 0.5 - p.y))[0]) as [number, number];
    return { at: p, px: q.x, py: q.y, back, table, stand, over: depthOf(b.thing) + 0.01 };
  });
  // a table's top: its footprint raised TABLE_UP, in the kitchen's pixels from its foot
  const topOf = (t: T2Thing) => {
    const [x0, y0, x1, y1] = t.box, corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => { const q = px({ x, y }); return { x: q.x, y: q.y - TABLE_UP }; });
    return corners;
  };
  const tops = tableThings.map((t) => {
    const c = topOf(t), xs = c.map((q) => q.x), ys = c.map((q) => q.y);
    return [Math.min(...xs), (t.c.x + t.c.y - foot.x - foot.y - 0.025) * 16, Math.max(...xs), Math.max(...ys)] as [number, number, number, number];
  });
  // a pot on the table: on its top along the middle of its long side, drawn after every strip of the table it is over
  const served = [1, 2, 0, 3].flatMap((i) => tableThings.map((t, table) => {
    const [x0, y0, x1, y1] = t.box, along = x1 - x0 >= y1 - y0;
    const p = along ? { x: x0 + (0.14 + i * 0.24) * (x1 - x0), y: (y0 + y1) / 2 } : { x: (x0 + x1) / 2, y: y0 + (0.14 + i * 0.24) * (y1 - y0) };
    const q = px(p), qy = q.y - TABLE_UP, half = POT_WIDE / 2, o = OBJECTS[t.i], sp = (MAP.sprites as Array<[string, number, number]>)[o[1]];
    let depth = -Infinity;
    const ix = iso(foot).x + q.x;
    for (let sx = o[2]; sx < o[2] + sp[1] * o[4]; sx += T2_STRIP) if (sx < ix + half && sx + T2_STRIP > ix - half) depth = Math.max(depth, t2StripDepth(t.box, sx + T2_STRIP / 2));
    return { px: Math.round(q.x), py: Math.round(qy), at: at(q.x, qy), table, depth: (Number.isFinite(depth) ? depth : t.c.x + t.c.y) + 0.005 };
  }));
  const over = tableThings.map((t) => { const c = topOf(t); return at(c[0].x, c[0].y - 8); });
  const feastTile = tableThings.length ? floor.slice().sort((a, b) => Math.hypot(a[0] + 0.5 - tableThings[0].c.x, a[1] + 0.5 - tableThings[0].c.y) - Math.hypot(b[0] + 0.5 - tableThings[0].c.x, b[1] + 0.5 - tableThings[0].c.y))[0] : floor[0];
  const stoveAt = stoves.map((s) => px({ x: s[0][0] + 0.5, y: s[0][1] + 0.5 }));
  const mid = { x: (door.inside[0] + 0.5), y: door.inside[1] + 0.5 };
  return {
    stage: process.env.NODE_ENV !== "production" ? 2 : 1, foot, tiles: [] as Array<[number, number]>,
    near: (_x: number, _y: number) => false,
    ways: { south: mid, north: mid },
    way: KITCHEN_ROOM.doors.map((d) => d.inside),
    floor,
    stands: [] as Array<{ kind: "stove" | "table" | "fire" | "dining" | "wash"; box: [number, number, number, number]; rise: number }>,
    posts: [] as Array<[number, number, number, number]>,
    places, wash, seats, tops,
    feast: { served, over, door: { x: foot.x + 0.4, y: foot.y - 0.4 }, tile: feastTile },
    lights: {
      fire: (stoveAt[0] ? [stoveAt[0].x, stoveAt[0].y - 14] : [0, 0]) as [number, number],
      mouths: stoveAt.map((s) => [s.x, s.y - 14] as [number, number]),
      lanterns: [] as Array<[number, number]>,
      windows: [] as Array<[number, number, number, number]>,
      door: [-20, -40, 20, 0] as [number, number, number, number],
    },
    at,
  };
})();

/* ── what stands about the city, as the game's props ────────────────────── */

const KINDS: Array<[RegExp, PropKind, boolean]> = [
  [/^create_cute_street_lamp/, "lamp", true],
  [/japanese_cedar/, "pine", true],
  [/ginkgo|maple|zelkova|camphor|persimmon|apple_tree|cocon/, "tree", true],
  [/tulip|chrysanthemum|bellflower|iris_clump/, "flowers", false],
  [/bush|hydrangea/, "bush", true],
  [/^rock_/, "rock", true],
  [/^trash/, "bin", true],
];
/** A bench's places in the city: each seat of the map's (README §6's `sit`), the bench it is on, for a tap. */
export const T2_PROP_THING = new Map<Prop, number>();
/**
 * The city's props: what the game's rules look for (seats to sit on, lamps that glow and draw moths, trees birds sit in
 * and leaves fall from, flowers butterflies visit), one to a thing at the tile under its middle. A seat is the map's own:
 * its tile (closed: one sits there from beside it), where the sitter is drawn (the map's point, which the game draws
 * SEAT_LIFT higher), the tile one stands on to sit (before it, else the nearest open one beside it), just after its seat's
 * picture. The kitchen's benches are its table's (T2_KITCHEN). The park's storage box is the last, as it was.
 */
export const T2_PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  const hall = new Set(HALL_THINGS.map((t) => t.i));
  for (const t of T2_THINGS) {
    if (hall.has(t.i)) continue;
    const k = KINDS.find(([re]) => re.test(t.name));
    if (!k) continue;
    const p: Prop = { kind: k[1], x: Math.floor(t.c.x), y: Math.floor(t.c.y), solid: k[2] };
    out.push(p);
    T2_PROP_THING.set(p, t.i);
  }
  const free = (x: number, y: number, from: [number, number]) => { const c = t2Tile(x, y); return (c === "." || c === "f" || c === "=") && !t2OverWall(from[0], from[1], x, y); };
  for (const b of BENCHES) {
    if (hall.has(b.thing)) continue;
    for (const s of b.seats) {
      const [x, y] = s.tile, f = FRONT[s.facing];
      // (the map's point is where the sitter's foot is drawn, raised or sunk with the ground; the game draws a sitter SEAT_LIFT over its seat's point)
      const seat = fromIso(s.point[0], s.point[1] + SEAT_LIFT);
      let stand: Vec | null = free(x + f.x, y + f.y, [x, y]) ? { x: x + f.x, y: y + f.y } : null;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (!stand && free(x + dx, y + dy, [x, y])) stand = { x: x + dx, y: y + dy };
      const p: Prop = { kind: "bench", x, y, solid: true, facing: s.facing, seat, stand: stand ?? { x: x + f.x, y: y + f.y }, over: depthOf(b.thing) + 0.01, of: b.thing };
      out.push(p);
      T2_PROP_THING.set(p, b.thing);
    }
  }
  const box: Prop = { kind: "storebox", x: T2_STOREBOX.x, y: T2_STOREBOX.y, solid: true };
  out.push(box);
  T2_PROP_THING.set(box, T2_CHEST_SHUT);
  return out;
})();

/** Where each lamp's light is (its lantern, high on its post): its tile's middle and how far up the screen from there, in isometric pixels (with the ground's sinking). */
const LAMPS = MAP.roles.lamps as unknown as Array<{ tile: [number, number]; thing: number; head: [number, number] }>;
export const T2_LAMP_LIGHT = new Map<Prop, { at: Vec; up: number }>(T2_PROPS.filter((p) => p.kind === "lamp").map((p) => {
  const i = T2_PROP_THING.get(p)!, l = LAMPS.find((q) => q.thing === i), t = T2_THINGS[i];
  const foot = iso(t.c).y;
  return [p, { at: t.c, up: l ? Math.round(foot - l.head[1]) : 60 }];
}));

/* ── the ways out ───────────────────────────────────────────────────────── */

const RINGS = MAP.roles.rings as unknown as Array<{ thing: number; centre: [number, number] }>;
const ring = (x: number, y: number) => { const r = RINGS.find((q) => Math.abs(q.centre[0] - x) < 0.6 && Math.abs(q.centre[1] - y) < 0.6); if (!r) throw new Error(`city: no ring at ${x},${y}`); return r; };
/** A ring's tiles that can be stepped on. */
const ringTiles = (r: { thing: number }) => tilesIn(T2_THINGS[r.thing].box).filter(([x, y]) => t2Tile(x, y) === ".");
const way = (r: { thing: number; centre: [number, number] }, back: Vec) => ({ tiles: ringTiles(r), arch: { x: r.centre[0], y: r.centre[1] }, back });
/**
 * The four ways out (the owner, 2026-11-23, as recommended): by the farmer's truck on the north-east edge, the two farm
 * gates (the farm lies north-east of the village, lib/town/world's FARM); the small ring further along that edge, the
 * forest (north); the ring on the north-west edge, the mountain (north-west, open only while the mountain is).
 */
export const T2_GATES = {
  forest: way(ring(54.19, 8.81), g(70.5, 12.5)),
  farm: way(ring(78.01, 8.99), g(94.5, 13.5)),
  farm2: way(ring(88.01, 9.01), g(104.5, 13.5)),
  mountain: way(ring(-8.4, 39.35), g(11.5, 39.5)),
};
export const T2_RING_MOVES: Array<{ i: number; to: Vec }> = [];
/** Where each way out's ring of light is: for its glow at night. */
export const T2_RINGS: Array<{ at: Vec; lift: number }> = RINGS.map((r) => ({ at: { x: r.centre[0], y: r.centre[1] }, lift: 0 }));

/* ── the river ─────────────────────────────────────────────────────────── */

/**
 * The city's canal as a line down its middle (tiles), from where it comes in at the north-east edge, down past the event
 * hall and the clothes shop to the sea, and along the sea to the west corner: for what moves on it (Town.tsx's
 * drawRiver: the current, glints, fish, what drifts down).
 */
const RIVER: Vec[] = [[34.5, 0.5], [34.5, 43], [39.5, 50], [39.5, 94], [44, 99], [46.5, 103], [46.5, 119], [40, 126], [24, 128.5], [4, 129]].map(([x, y]) => g(x, y));
const RIVER_AT = (() => { let d = 0; return RIVER.map((p, i) => (d += i ? Math.hypot(p.x - RIVER[i - 1].x, p.y - RIVER[i - 1].y) : 0)); })();
/** A point of the river: `t` how far down it (0 to 140, the old town's river's own measure), `across` from its middle (−2.8 to 2.8). */
export function t2RiverPoint(t: number, across: number): Vec {
  const L = RIVER_AT[RIVER_AT.length - 1], d = Math.max(0, Math.min(L, (t / 140) * L));
  let i = 1;
  while (i < RIVER.length - 1 && RIVER_AT[i] < d) i++;
  const a = RIVER[i - 1], b = RIVER[i], k = (d - RIVER_AT[i - 1]) / (RIVER_AT[i] - RIVER_AT[i - 1] || 1);
  const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
  // (the canal is six tiles across: two and a half either side of its middle)
  const off = across * 0.85;
  return { x: a.x + dx * k - (dy / n) * off, y: a.y + dy * k + (dx / n) * off };
}

/* ── fishing ────────────────────────────────────────────────────────────── */

const isWater = (tx: number, ty: number) => inT2(tx, ty) && WALK[ty - OY][tx - OX] === "~";
function openWater(x: number, y: number, clear: number): boolean {
  for (const dx of [-clear, 0, clear]) for (const dy of [-clear, 0, clear]) if (!isWater(Math.floor(x + dx), Math.floor(y + dy))) return false;
  return true;
}
const WAYS: Vec[] = [[-1, 1], [-1, 0], [0, 1], [-1, -1], [1, 1], [0, -1], [1, 0], [1, -1]].map(([x, y]) => ({ x: x / Math.hypot(x, y), y: y / Math.hypot(x, y) }));
/**
 * Where somebody standing on a tile can fish (as in the editor's town): from the dock the line goes out to open water
 * within a cast, deep; from the land at the water's edge (the canal's and the sea's banks, the beach), a little way out,
 * the shallows.
 */
export function t2Fish(tx: number, ty: number, cast: { reach: number; least: number; clear: number }): Fishing | null {
  const c = t2Tile(tx, ty);
  if (c !== "." && c !== "=") return null;
  const cx = tx + 0.5, cy = ty + 0.5, deep = c === "=";
  if (!deep && ![[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => isWater(tx + dx, ty + dy))) return null;
  const further = [0, 0.5, 1][(((tx + 2 * ty) % 3) + 3) % 3];
  let best = Infinity, found: Fishing | null = null;
  WAYS.forEach((w, n) => {
    for (let d = deep ? cast.least : 0.9; d <= cast.reach + 1e-9; d += 0.1) {
      if (!openWater(cx + w.x * d, cy + w.y * d, cast.clear)) continue;
      if (d + n * 0.35 < best) {
        best = d + n * 0.35;
        const far = [further, further / 2, 0].map((more) => d + more).find((v) => v <= cast.reach + 1e-9 && openWater(cx + w.x * v, cy + w.y * v, cast.clear))!;
        found = { float: { x: Math.round((cx + w.x * far) * 100) / 100, y: Math.round((cy + w.y * far) * 100) / 100 }, deep };
      }
      break;
    }
  });
  return found;
}
