/**
 * The second main town (the owner, 2026-10-22): "oatto2-cash80x80v2", an 80 × 80 town of the Cashtown map editor, in
 * place of the town laid out since 2026-10-02 ("เปลี่ยนทั้งเมือง เปลี่ยนตำแหน่ง NPC แมลงในเมืองทั้งหมดเลย"; the bridge
 * game is not in it, "ข้ามได้เลย"). lib/town/world asks here for everything of the town while lib/town/town-map says
 * this is the town; the farm, the forest, the mountain and the cave are as they were. Since 2026-10-31 it is the
 * author's later export of it, "oato-v3", with things attached to what they stand on and its footprints set to the grid.
 *
 * What is here was made from the editor's export by .claude/skills/fc-cash-town/scripts/pixel/build-town2.mjs
 * (town2-map.json: the ground at an eighth of a tile, every placed thing, and where may be walked), and given its
 * parts in the game by hand below: which building the uncle keeps, where the banker stands, which way out leads where.
 *
 * ── Where may be walked (the owner: "เขียนกฎเรื่องส่วนไหนเดินข้ามได้ ไม่ได้") ──
 * - Ground of every kind (grass, earth, the plaza's stones, sand, the woods' floor): walked on.
 * - Water (a tile half or more of which is painted water): not walked on, nor stood on to fish; fished from its edge.
 * - A bridge, the fishing pier, the stone pier: walked on, over the water too; fished from (deep water).
 * - A building, the fountain, a stall, a board, the chest, a well, a rock, a statue, a lantern, a bench, a bush, a bin:
 *   closes the tiles it stands on. A tree closes only its trunk's tile; its crown is over people's heads.
 * - A torii, a village gate, a rope between posts: only their posts close a tile; the way through is open.
 * - Flowers, ferns, reeds, lotus leaves and stepping stones are walked over.
 * - The kitchen hall is walked into by its two doors only (the noren at the front, the steps at the side), and its
 *   tables, benches, stoves and jar close their tiles inside it.
 * - A ring of light is a way out (GATES): stepping on it takes you where it leads. The two by the west bridges stand at
 *   the bridges' far ends, so the bridge is crossed first; they lead on to the mountain only while it is open.
 * - The edges of the map are closed, but at the rings.
 * The tiles as built are town2-map.json's `walk` ("." ground, "~" water, "#" something standing, "=" a deck, "h" the
 * kitchen hall); the hall's floor and doors are opened here.
 */
import MAP from "./town2-map.json";
import type { Facing, Fishing, Ground, Prop, PropKind, Vec } from "./world";

export const T2_COLS: number = MAP.cols;
export const T2_ROWS: number = MAP.rows;
const SUB = 8;

/* ── the ground ─────────────────────────────────────────────────────────── */

/** How the editor's ground is drawn here: lib/town/scenery's kinds of its own, each with the editor's own texture. */
export type T2Look = "t2grass" | "t2water" | "t2sand" | "t2road" | "t2wood" | "t2plaza";
export const T2_LOOKS: readonly T2Look[] = ["t2grass", "t2water", "t2sand", "t2road", "t2wood", "t2plaza"];
const NAMES: Record<string, { look: T2Look; ground: Ground }> = {
  grass: { look: "t2grass", ground: "grass" }, water: { look: "t2water", ground: "water" }, sand: { look: "t2sand", ground: "sand" },
  dirt_road: { look: "t2road", ground: "road" }, forest: { look: "t2wood", ground: "wood" }, centre_stone: { look: "t2plaza", ground: "plaza" },
};
const LEGEND = MAP.legend as Record<string, string>;
/** Each look's texture (public/town/town2), for lib/town/scenery. */
export const T2_TEXTURES: Array<{ look: T2Look; src: string }> = Object.entries(MAP.textures as Record<string, { src: string }>)
  .filter(([name]) => NAMES[name]).map(([name, t]) => ({ look: NAMES[name].look, src: `/town/town2/${t.src}` }));

/** The ground painted at each eighth of a tile, as letters of LEGEND ("." where nothing was painted: the tile's own). */
const DOT = 46;
const FINE = (() => {
  const out = new Uint8Array(T2_COLS * SUB * T2_ROWS * SUB);
  MAP.fine.forEach((row: string, sy: number) => {
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
const tileLetter = (fx: number, fy: number) => {
  const x = Math.min(Math.max(Math.floor(fx), 0), T2_COLS - 1), y = Math.min(Math.max(Math.floor(fy), 0), T2_ROWS - 1);
  return MAP.ground[y][x];
};
const wobble = (k: string) => {
  if (k === "_") return 0;
  const name = LEGEND[k];
  return +((MAP.wobble.kinds as Record<string, number>)[name] ?? MAP.wobble.all);
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
/** The ground's letter at a point of the town, as the editor draws it (its README's groundAt: what was painted, else the tile's own with its border wandering off the grid). */
function letterAt(fx: number, fy: number): string {
  const k0 = tileLetter(fx, fy);
  if (k0 === "_") return k0;
  const sx = Math.floor(fx * SUB), sy = Math.floor(fy * SUB);
  // (what was painted is the editor's own detail, kept exactly)
  if (sx >= 0 && sy >= 0 && sx < T2_COLS * SUB && sy < T2_ROWS * SUB && FINE[sy * T2_COLS * SUB + sx] !== DOT) return String.fromCharCode(FINE[sy * T2_COLS * SUB + sx]);
  const a0 = wobble(k0);
  if (!a0) return k0;
  const n1 = 2 * (noise(fx, fy, 1.6, 11) - 0.5), n2 = 2 * (noise(fx, fy, 1.6, 12) - 0.5);
  const k = tileLetter(fx + a0 * n1, fy + a0 * n2);
  if (k === k0) return k;
  const a = Math.min(a0, wobble(k));
  return a === a0 ? k : tileLetter(fx + a * n1, fy + a * n2);
}
/** The look of the ground at a point of the town. */
export function t2Look(x: number, y: number): T2Look {
  return NAMES[LEGEND[letterAt(x, y)] ?? "grass"]?.look ?? "t2grass";
}
/** The kind of ground of a tile: what most of it is painted. */
const TILE_GROUND: Ground[] = (() => {
  const out: Ground[] = [];
  for (let ty = 0; ty < T2_ROWS; ty++) for (let tx = 0; tx < T2_COLS; tx++) {
    const n = new Map<number, number>();
    for (let sy = 0; sy < SUB; sy++) for (let sx = 0; sx < SUB; sx++) {
      const f = FINE[(ty * SUB + sy) * T2_COLS * SUB + tx * SUB + sx], c = f === DOT ? MAP.ground[ty].charCodeAt(tx) : f;
      n.set(c, (n.get(c) ?? 0) + 1);
    }
    const best = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.push(NAMES[LEGEND[String.fromCharCode(best)]]?.ground ?? "grass");
  }
  return out;
})();
export const t2Ground = (tx: number, ty: number): Ground => TILE_GROUND[ty * T2_COLS + tx] ?? "grass";

/**
 * The far banks beyond the town's west and south edges, where its bridges come down (the owner, 2026-10-22, of the
 * old town's ground showing there: "ส่วนนี้ transition ดูตัดกันไปหน่อย"): ground to look at, on no map. The river runs
 * on a little past the edge in the town's own water, then a band of sand, then grass, and the woods' floor further off;
 * where the town's edge is land, its grass goes on. All in the editor's textures, so nothing meets the town at a seam.
 */
export const T2_BANKS = [{ x: -18, y: -3, w: 18, h: 86 }, { x: -3, y: T2_ROWS, w: T2_COLS + 6, h: 10 }];
export const inT2Banks = (x: number, y: number) => T2_BANKS.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
export function t2BankLook(x: number, y: number): T2Look | null {
  if (inT2(x, y) || !inT2Banks(x, y)) return null;
  // the nearest point of the town's edge, and how far out from it
  const ex = Math.min(Math.max(x, 0.02), T2_COLS - 0.02), ey = Math.min(Math.max(y, 0.02), T2_ROWS - 0.02);
  const out = Math.max(Math.abs(x - ex), Math.abs(y - ey)), west = x < 0 && Math.abs(x - ex) >= Math.abs(y - ey);
  const edge = NAMES[LEGEND[letterAt(ex, ey)] ?? "grass"]?.look ?? "t2grass";
  const n = noise(x, y, 3.2, 31) - 0.5, n2 = noise(x, y, 1.3, 33) - 0.5, far = noise(x, y, 4.5, 37);
  if (edge === "t2water") {
    // (the west bridges' far ends are some two tiles out, the south bridge's one: each comes down on the sand)
    // (its edge wanders as the editor's shores do: slowly, with a little fray)
    const bank = (west ? 1.75 : 0.6) + n * (west ? 0.8 : 0.6) + n2 * 0.18;
    if (out < bank) return "t2water";
    if (out < bank + 0.85 + n2 * 0.5) return "t2sand";
  } else if (out < 0.7 + n * 0.4) return edge === "t2road" || edge === "t2plaza" ? "t2grass" : edge;
  return out > 5 + far * 4 ? "t2wood" : "t2grass";
}
export const inT2 = (x: number, y: number) => x >= 0 && y >= 0 && x < T2_COLS && y < T2_ROWS;

/* ── what stands there ──────────────────────────────────────────────────── */

/** A placed thing: its picture's name, its footprint's box (tiles) and middle. */
export interface T2Thing { i: number; name: string; box: [number, number, number, number]; c: Vec }
export const T2_THINGS: T2Thing[] = (MAP.objects as number[][]).map((o, i) => ({
  i, name: MAP.names[o[0]], box: [o[8], o[9], o[10], o[11]], c: { x: (o[8] + o[10]) / 2, y: (o[9] + o[11]) / 2 },
}));
const named = (re: RegExp) => T2_THINGS.filter((t) => re.test(t.name));
/** How narrow a strip of a wide thing is, in isometric pixels (lib/town/town2-art draws such a thing in upright strips). */
export const T2_STRIP = 12;
/**
 * Where a strip of a wide thing stands back to front: its footprint's front edge under the strip's middle (an isometric
 * x), the left side (y = by1) before its bottom corner, the right (x = bx1) after.
 */
export const t2StripDepth = ([bx0, by0, bx1, by1]: readonly number[], mid: number) =>
  mid <= (bx1 - by1) * 32 ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
/**
 * Things of the export that are not part of this town: the small ring and the road works laid in the shop's doorway
 * (where the uncle stands), the ring by the road works in the south-east (that road is closed: a ring there would be a
 * way out that leads nowhere), and the stove that stood in the kitchen hall's back doorway (the owner, 2026-10-22:
 * "เอาอันนี้ออกให้ด้วย มันขวางทางประตู").
 */
export const T2_LEFT_OUT = new Set(T2_THINGS.filter((t) =>
  (t.name === "game_ring" && (Math.abs(t.c.x - 45.21) < 0.5 || Math.abs(t.c.x - 73.96) < 0.5))
  || (t.name === "game_roadworks" && Math.abs(t.c.x - 45.95) < 0.5)
  || (/^japanese_kamado/.test(t.name) && Math.abs(t.c.x - 68.5) < 0.3 && Math.abs(t.c.y - 46.5) < 0.3)).map((t) => t.i));
/** Tiles under a box (whose middles are inside it). */
const tilesIn = ([x0, y0, x1, y1]: readonly number[]): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let y = Math.floor(y0); y <= Math.floor(y1); y++) for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
    if (x + 0.5 >= x0 && x + 0.5 <= x1 && y + 0.5 >= y0 && y + 0.5 <= y1) out.push([x, y]);
  }
  return out;
};
const first = (re: RegExp) => { const t = named(re)[0]; if (!t) throw new Error(`town2: no ${re}`); return t; };

/** The fountain in the plaza's middle (the wishing basin): a landmark, not walked on; people appear round it. */
const BASIN = first(/^wishing_basin$/);
export const T2_FOUNTAIN = { x: Math.floor(BASIN.box[0] + 0.5), y: Math.floor(BASIN.box[1] + 0.5), w: 3, h: 3 };
/** The plaza: the paved round the fountain. */
export const T2_PLAZA = { x: 29, y: 31, w: 26, h: 29 };
/** The town as against its edges, for what roams it (critters, the popotos' outings). */
export const T2_TOWN = { x: 8, y: 6, w: 68, h: 64 };
/** The storage box: the red chest north-east of the plaza (its closed picture; the open one is drawn while its panel is open). */
const CHEST = first(/^chest_closed$/);
export const T2_STOREBOX = { x: Math.floor(CHEST.c.x), y: Math.floor(CHEST.box[1] + 0.5) };
export const T2_CHEST_OPEN = first(/^chest_open$/).i;
export const T2_CHEST_SHUT = CHEST.i;
/** The Popoto Board (news and votes): the notice board on the plaza's west side. */
const KOSATSU = first(/^kosatsu_board_cloud$/);
export const T2_BOARD = boxOf(KOSATSU.box);
/** The trade board: the board of goods on the plaza's north side, which everybody passes. */
const TRADE = first(/^trade_board_cloud$/);
export const T2_TRADE_BOARD = boxOf(TRADE.box);
/** The uncle's shop: the merchant's house north of the plaza (no longer a building site). */
const MACHIYA = first(/^machiya_shop$/);
export const T2_SHOP = { ...boxOf(MACHIYA.box), stage: 2 };
function boxOf(b: readonly number[]) {
  const ts = tilesIn(b), xs = ts.map(([x]) => x), ys = ts.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
}
/** The uncle at his shop's open front, the banker before the money changer's counter (each `at` where the popoto stands, closing its tile). */
const CHANGER = first(/^money_changer$/);
export const T2_KEEPERS = [
  { id: "uncle" as const, stand: MACHIYA.c, at: { x: 45.6, y: 29.45 }, tiles: [[45, 29]] as Array<[number, number]> },
  { id: "banker" as const, stand: CHANGER.c, at: { x: 53.45, y: 56.75 }, tiles: [[53, 56]] as Array<[number, number]> },
];
/** The blacksmith at his forge, south-west of the plaza: he stands at its open side; whoever is within `reach` of the forge is by it. */
const FORGE = first(/^forge$/);
export const T2_SMITH = {
  id: "smith" as const, stand: FORGE.c, at: { x: 33.9, y: 52.6 }, board: { x: 33.9, y: 54.2 }, sign: FORGE.c,
  fire: [0, 0] as [number, number], tiles: [[33, 52]] as Array<[number, number]>, reach: 6,
};
/**
 * The townhouse's door, the way into Granny Twilla's clothes shop (the owner, 2026-10-25: its door is the townhouse's;
 * lib/town/shop-room): the wooden door in its south-west face, at x 75.0 to 75.6 along its front edge (its picture
 * looked at, 2026-10-25; the latticed front on its south-east face is a shop window, no door). `tile` is the house's
 * tile behind the door, which nobody stands on: walked onto only to go in (lib/town/world's findPath lets a path end
 * there and run nowhere else through it, so nothing else of the town changes); `out` is the street before it, where
 * whoever comes out of the shop stands; `at` the door's foot, for its name and its tap.
 */
const TOWNHOUSE = first(/^townhouse$/);
export const T2_SHOP_DOOR = {
  tile: [75, Math.floor(TOWNHOUSE.box[3])] as [number, number],
  out: { x: 75.5, y: Math.floor(TOWNHOUSE.box[3]) + 1.5 },
  at: { x: 75.3, y: TOWNHOUSE.box[3] },
};
/**
 * The kura's door, the way down into the Popoto Casino (the owner, 2026-10-27: "โรงเก็บของ kura ก็ได้"; lib/town/casino-room):
 * the arched doorway in the middle of its south-west face (x 66.8 to 69.5 along its front edge). As the townhouse's,
 * `tile` is the kura's tile behind the door (its front row, the last it closes: its box reaches only 0.45 into the row
 * before it), walked onto only to go in; `out` the ground before it; `at` its foot.
 */
const KURA = first(/^kura$/), KURA_FRONT = Math.floor(KURA.box[3] - 0.5);
export const T2_CASINO_DOOR = {
  tile: [68, KURA_FRONT] as [number, number],
  out: { x: 68.5, y: KURA_FRONT + 1.5 },
  at: { x: 68.2, y: KURA.box[3] },
};

/* ── the kitchen hall ───────────────────────────────────────────────────── */

const HALL = first(/^kitchen_house$/);
/**
 * Its floor (inside its walls), and its two ways in (the owner, 2026-10-22: "เดินเข้าครัวได้สองทางคือ ซ้ายล่าง กับ ขวาบนตาม
 * ภาพ"): the gap in the low front wall under the noren, x 66.6 to 70.8 on its picture, and the doorway in the back wall,
 * x 67.5 to 69.2 (the stove that stood in it taken out: T2_LEFT_OUT). No way in at the side any more.
 */
const FLOOR_BOX = { x0: 62, y0: 46, x1: 75, y1: 53 };
export const T2_HALL_DOORS: Array<{ inside: [number, number]; outside: [number, number] }> = [
  ...[67, 68, 69, 70].map((x) => ({ inside: [x, 53] as [number, number], outside: [x, 54] as [number, number] })),
  { inside: [68, 46], outside: [68, 45] },
];
export const t2InHall = (x: number, y: number) => x >= FLOOR_BOX.x0 && x <= FLOOR_BOX.x1 && y >= FLOOR_BOX.y0 && y <= FLOOR_BOX.y1;
const WALK: string[] = MAP.walk;
const doorOut = new Set(T2_HALL_DOORS.map((d) => d.outside.join(",")));
/** The hall's things, by their footprints. */
const HALL_THINGS = T2_THINGS.filter((t) => !T2_LEFT_OUT.has(t.i) && t.c.x > FLOOR_BOX.x0 && t.c.x < FLOOR_BOX.x1 + 1 && t.c.y > FLOOR_BOX.y0 && t.c.y < FLOOR_BOX.y1 + 1 && !/kitchen_house/.test(t.name));
export const T2_HALL = { thing: HALL.i, inside: first(/^kitchen_house_inside/).i, box: HALL.box, floor: FLOOR_BOX, things: HALL_THINGS.map((t) => t.i) };

type Station = "stove" | "table" | "fire";
/** The tiles a thing of the hall closes (its footprint), and those beside it on the floor that are open. */
const hallTiles = (re: RegExp) => HALL_THINGS.filter((t) => re.test(t.name)).map((t) => tilesIn(t.box));
const beside = (tiles: Array<[number, number]>, open: (x: number, y: number) => boolean) => {
  const out: Array<[number, number]> = [], on = new Set(tiles.map((t) => t.join(",")));
  for (const [x, y] of tiles) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = `${x + dx},${y + dy}`;
    if (!on.has(k) && open(x + dx, y + dy) && !out.some((o) => o.join(",") === k)) out.push([x + dx, y + dy]);
  }
  return out;
};
/**
 * The kitchen hall as lib/town/world's KITCHEN (the cooking yard's shape, which the cooking games and the database's
 * copies read): its floor, its doors, where one cooks (by a stove, a worktable or the fire), washes (by the water jar) and
 * sits to eat (the two long tables, three to a bench). Points of the picture are isometric pixels from `foot`, the
 * front door's threshold, as the yard's were from its picture's ground point.
 */
/**
 * The long tables' top in their picture (dining_table's own pixels, unmirrored): its front corner, nearest the viewer,
 * and the corners at the other ends of its long edge and of its short edge from there.
 */
const TABLE_TOP = { front: [125, 197], long: [399, 57], short: [0, 142] } as const;
/** How wide a pot on the feast table is drawn, in isometric pixels (TownCook's). */
const POT_WIDE = 24;
export const T2_KITCHEN = (() => {
  const foot = { x: 67, y: 54 };
  const iso = (p: Vec) => ({ x: (p.x - p.y) * 32, y: (p.x + p.y) * 16 });
  const px = (p: Vec) => { const a = iso(p), f = iso(foot); return { x: a.x - f.x, y: a.y - f.y }; };
  const at = (pxx: number, pyy: number): Vec => ({ x: foot.x + (pyy / 16 + pxx / 32) / 2, y: foot.y + (pyy / 16 - pxx / 32) / 2 });
  const shut = new Set(HALL_THINGS.flatMap((t) => tilesIn(t.box).map(([x, y]) => `${x},${y}`)));
  const floor: Array<[number, number]> = [];
  for (let y = FLOOR_BOX.y0; y <= FLOOR_BOX.y1; y++) for (let x = FLOOR_BOX.x0; x <= FLOOR_BOX.x1; x++) if (!shut.has(`${x},${y}`)) floor.push([x, y]);
  const open = (x: number, y: number) => floor.some(([fx, fy]) => fx === x && fy === y);
  const stoves = hallTiles(/kamado/), jars = hallTiles(/water_jar/), tables = hallTiles(/^dining_table$/).sort((a, b) => a[0][0] - b[0][0]);
  const worktables = hallTiles(/^long_low_wooden_dining_table/);
  const places: Array<{ at: [number, number]; kind: Station }> = [];
  const put = (kind: Station, tiles: Array<[number, number]>) => { for (const t of tiles) if (!places.some((p) => p.at.join(",") === t.join(","))) places.push({ at: t, kind }); };
  for (const s of stoves) put("stove", beside(s, open));
  // (the worktable by the back wall, from either side and its front)
  for (const t of worktables) put("table", beside(t, open));
  const wash = jars.flatMap((j) => beside(j, open)).filter(([x, y]) => !places.some((p) => p.at[0] === x && p.at[1] === y));
  // three to a bench, a bench along each long side of each table: the far benches (facing the viewer) first
  const benches = HALL_THINGS.filter((t) => /^kitchen_bench$/.test(t.name));
  const seats = [false, true].flatMap((back) => tables.map((t) => {
    const ty = t[0][1], b = benches.filter((q) => (back ? q.c.y > ty + 0.5 : q.c.y < ty + 0.5) && Math.abs(q.c.x - (t[0][0] + t[t.length - 1][0] + 1) / 2) < 2)[0];
    return { b, table: tables.indexOf(t) };
  }).flatMap(({ b, table }) => {
    if (!b) return [];
    const [x0, , x1] = b.box, y = b.c.y;
    return [0, 1, 2].map((i) => {
      // (drawn up on the bench's seat: a step back up the screen from its middle)
      const p = { x: x0 + ((i + 0.5) * (x1 - x0)) / 3 - 0.32, y: y - 0.32 }, q = px(p);
      const sy = back ? Math.ceil(y) : Math.floor(y) - 1, sx = Math.floor(p.x);
      const stand = (open(sx, sy) ? [sx, sy] : floor.slice().sort((a, c) => Math.hypot(a[0] + 0.5 - p.x, a[1] + 0.5 - p.y) - Math.hypot(c[0] + 0.5 - p.x, c[1] + 0.5 - p.y))[0]) as [number, number];
      // (and drawn just before the bench's picture, on it: the near benches were drawn over their sitters, the owner, 2026-10-22)
      return { at: p, px: q.x, py: q.y, back, table, stand, over: (MAP.objects as number[][])[b.i][7] + 0.01 };
    });
  }));
  const tableThings = tables.map((t) => HALL_THINGS.find((q) => /^dining_table$/.test(q.name) && Math.floor(q.c.x) >= t[0][0] && Math.floor(q.c.x) <= t[t.length - 1][0])!);
  // (each top's second figure is where it stands back to front, as the yard's tops were: whoever sits behind the table is
  // just before it; Town.tsx's depthOf reads it so)
  const tops = tables.map((t, table) => {
    const a = px({ x: t[0][0], y: t[0][1] }), b = px({ x: t[t.length - 1][0] + 1, y: t[0][1] + 1 }), thing = tableThings[table];
    return [Math.min(a.x, b.x), (thing.c.x + thing.c.y - foot.x - foot.y - 0.025) * 16, Math.max(a.x, b.x), Math.max(a.y, b.y)] as [number, number, number, number];
  });
  // A point of a long table's top, as its picture draws it (mirrored where the editor laid it so), in the hall's pixels:
  // `along` its long edge from the front corner, `across` from the front edge to the back one (lib/town/town2-art)
  const iFoot = iso(foot);
  const onTop = (table: number, along: number, across: number) => {
    const o = (MAP.objects as number[][])[tableThings[table].i], w = (MAP.sprites as Array<[string, number, number]>)[o[1]][1], { front, long, short } = TABLE_TOP;
    const x = front[0] + along * (long[0] - front[0]) + across * (short[0] - front[0]), y = front[1] + along * (long[1] - front[1]) + across * (short[1] - front[1]);
    return { x: Math.round(o[2] + (o[5] === 1 ? w - x : x) * o[4] - iFoot.x), y: Math.round(o[3] + y * o[4] - iFoot.y) };
  };
  // A pot on the feast table stands on a long table's top, along the middle of it, and is drawn after every strip of the
  // table it is over (lib/town/town2-art draws the table in strips): they stood on the floor under the top and were drawn
  // before the table's front, which hid them but for what showed between its legs (the owner, 2026-10-26: "อาหารลอยอยู่
  // ใต้โต๊ะ"). `depth` is that place back to front, which TownCook reads before the tops'.
  const served = [1, 2, 0, 3].flatMap((i) => tables.map((_, table) => {
    const q = onTop(table, 0.14 + i * 0.24, 0.5), half = POT_WIDE / 2, thing = tableThings[table], o = (MAP.objects as number[][])[thing.i];
    let depth = -Infinity;
    for (let sx = o[2]; sx < o[2] + (MAP.sprites as Array<[string, number, number]>)[o[1]][1] * o[4]; sx += T2_STRIP) {
      if (sx < q.x + iFoot.x + half && sx + T2_STRIP > q.x + iFoot.x - half) depth = Math.max(depth, t2StripDepth(thing.box, sx + T2_STRIP / 2));
    }
    return { px: q.x, py: q.y, at: at(q.x, q.y), table, depth: depth + 0.005 };
  }));
  const feastTile = floor.slice().sort((a, b) => Math.hypot(a[0] + 0.5 - 69.5, a[1] + 0.5 - 50.5) - Math.hypot(b[0] + 0.5 - 69.5, b[1] + 0.5 - 50.5))[0];
  const tiles: Array<[number, number]> = [];
  for (let y = 0; y < T2_ROWS; y++) for (let x = 0; x < T2_COLS; x++) if (WALK[y][x] === "h" && !t2InHall(x, y) && !doorOut.has(`${x},${y}`)) tiles.push([x, y]);
  const stoveAt = stoves.map((s) => px({ x: s[0][0] + 0.5, y: s[0][1] + 0.5 }));
  return {
    stage: process.env.NODE_ENV !== "production" ? 2 : 1, foot, tiles,
    near: (_x: number, _y: number) => false,
    ways: { south: { x: 68.5, y: 53.5 }, north: { x: 68.5, y: 46.5 } },
    way: T2_HALL_DOORS.map((d) => d.inside),
    floor,
    stands: [] as Array<{ kind: "stove" | "table" | "fire" | "dining" | "wash"; box: [number, number, number, number]; rise: number }>,
    posts: [] as Array<[number, number, number, number]>,
    places, wash, seats, tops,
    // (the few words over each table over its top's back corner, clear of the pots on it and of whoever sits behind it:
    // TownCook draws them 30 pixels up from here)
    feast: { served, over: tables.map((_, table) => { const q = onTop(table, 1, 1); return at(q.x, q.y + 8); }), door: { x: 66.9, y: 53.6 }, tile: feastTile },
    lights: {
      fire: (stoveAt[0] ? [stoveAt[0].x, stoveAt[0].y - 6] : [0, 0]) as [number, number],
      mouths: stoveAt.map((s) => [s.x, s.y - 6] as [number, number]),
      lanterns: [] as Array<[number, number]>,
      windows: [] as Array<[number, number, number, number]>,
      door: [-20, -40, 20, 0] as [number, number, number, number],
    },
    at,
  };
})();
export const T2_DECK = (x: number, y: number) => inT2(x, y) && WALK[y][x] === "=";

/* ── where may be walked ────────────────────────────────────────────────── */

const LEFT_OUT_TILES = new Set([...T2_LEFT_OUT].flatMap((i) => tilesIn(T2_THINGS[i].box).map(([x, y]) => `${x},${y}`)));
/**
 * The festival stage, walked on (the owner, 2026-10-22: "ทำให้เวที เดินขึ้นไปได้ด้วย"): its round top, 70 isometric
 * pixels up (the height of its skirt in its picture), the tiles within 3.6 of a point a little left of its footprint's
 * middle; and its stairs at its front right, the two columns before its footprint's right edge, on the two rows from its
 * middle, coming down to the ground on the column after it (its picture with the tiles laid over it, at its height and
 * on the ground). Stepped on and off by its stairs only. Drawn in strips at its back edges (lib/town/town2-art).
 */
export const T2_STAGE = first(/^oval_wooden_festival_stage/);
export const T2_STAGE_UP = 70;
/** Its round foot on the ground: its footprint's middle and half its width (what stands behind it is behind this). */
export const T2_STAGE_BASE = {
  x: (T2_STAGE.box[0] + T2_STAGE.box[2]) / 2, y: (T2_STAGE.box[1] + T2_STAGE.box[3]) / 2,
  r: (T2_STAGE.box[2] - T2_STAGE.box[0] + T2_STAGE.box[3] - T2_STAGE.box[1]) / 4,
};
const STAGE_MID = { x: (T2_STAGE.box[0] + T2_STAGE.box[2]) / 2 - 0.27, y: (T2_STAGE.box[1] + T2_STAGE.box[3]) / 2 + 0.28 };
const STAGE_FOOT = Math.floor(T2_STAGE.box[2]) + 1, STAGE_ROW = Math.floor(STAGE_MID.y);
const STAGE_STAIRS = new Set([STAGE_FOOT - 2, STAGE_FOOT - 1].flatMap((x) => [STAGE_ROW, STAGE_ROW + 1].map((y) => `${x},${y}`)));
const STAGE_LANDINGS = new Set([STAGE_ROW, STAGE_ROW + 1].map((y) => `${STAGE_FOOT - 1},${y}|${STAGE_FOOT},${y}`));
const onStageTop = (x: number, y: number) => Math.hypot(x + 0.5 - STAGE_MID.x, y + 0.5 - STAGE_MID.y) <= 3.6;
const onStage = (x: number, y: number) => onStageTop(x, y) || STAGE_STAIRS.has(`${x},${y}`);
/** Whether a tile is the stage's (its top or its stairs). */
export const t2OnStage = onStage;
/** How far up somebody on the stage is drawn: its top's height, less down its stairs (to nothing at their foot). */
const stageLift = (x: number, y: number) => {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (STAGE_STAIRS.has(`${tx},${ty}`)) return T2_STAGE_UP * Math.min(1, Math.max(0, (STAGE_FOOT - x) / 2));
  return onStageTop(tx, ty) ? T2_STAGE_UP : 0;
};
/**
 * The ground right behind the water pavilion's tank (the temizuya): closed, as its tank is (the owner, 2026-10-22: "ตรงนี้
 * เดินเข้ามาแล้ว ตัวละครขาด", of somebody stood there under its roof, drawn behind the tank's wall and so cut in half in
 * its water). Its front stays open.
 */
const TEMIZUYA = first(/^temizuya$/);
const BEHIND_TANK = (() => {
  const under = tilesIn(TEMIZUYA.box), bx = Math.floor(TEMIZUYA.box[0] - 0.5), by = Math.floor(TEMIZUYA.box[1] - 0.5);
  return new Set([...under.map(([, y]) => `${bx},${y}`), ...under.map(([x]) => `${x},${by}`), `${bx},${by}`]);
})();
/** What a tile is: "." ground, "~" water, "#" something standing, "=" a deck, "f" the hall's floor, "h" the hall's walls. */
export function t2Tile(tx: number, ty: number): string {
  if (!inT2(tx, ty)) return "#";
  if (onStage(tx, ty)) return "=";
  if (BEHIND_TANK.has(`${tx},${ty}`)) return "#";
  // (what was left out of the town no longer stands in the way; the uncle stands in the shop's doorway instead)
  const c = WALK[ty][tx] === "#" && LEFT_OUT_TILES.has(`${tx},${ty}`) ? "." : WALK[ty][tx];
  if (c === "h" || (c === "." && t2InHall(tx, ty))) return t2InHall(tx, ty) ? "f" : doorOut.has(`${tx},${ty}`) ? "." : "h";
  return c;
}
/**
 * The fishing pier stands up on its posts, railed with rope: it is stepped on and off only at the foot of its stairs, at
 * its front right, where they come down to the ground at x 20, y 62.8 to 65 (the owner, 2026-10-22: "ตรงนี้เดินลงมาได้
 * ทั้งๆที่ไม่ควร", of somebody stepping down off its front by the crates). Nowhere else is its deck a way to the ground.
 */
const PIER = first(/^fishing_pier$/);
const PIER_LANDINGS = new Set(["19,63|20,63", "19,64|20,64"]);
const onPier = (x: number, y: number) => WALK[y]?.[x] === "=" && x + 0.5 >= PIER.box[0] && x + 0.5 <= PIER.box[2] && y + 0.5 >= PIER.box[1] && y + 0.5 <= PIER.box[3];
/** Whether a step goes over the fishing pier's railing or the stage's edge: between either and the ground anywhere but their stairs. */
export function t2OverRail(ax: number, ay: number, bx: number, by: number): boolean {
  const sa = onStage(ax, ay), sb = onStage(bx, by);
  if (sa !== sb) return !STAGE_LANDINGS.has(sa ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`);
  const a = onPier(ax, ay), b = onPier(bx, by);
  if (a === b) return false;
  const [dx, dy, gx, gy] = a ? [ax, ay, bx, by] : [bx, by, ax, ay];
  return WALK[gy]?.[gx] !== "=" && !PIER_LANDINGS.has(`${dx},${dy}|${gx},${gy}`);
}
/** Whether a step crosses the hall's walls: in or out only by a door. */
export function t2OverWall(ax: number, ay: number, bx: number, by: number): boolean {
  const a = t2InHall(ax, ay), b = t2InHall(bx, by);
  if (a === b) return false;
  const [ix, iy, ox, oy] = a ? [ax, ay, bx, by] : [bx, by, ax, ay];
  return !T2_HALL_DOORS.some((d) => d.inside[0] === ix && d.inside[1] === iy && d.outside[0] === ox && d.outside[1] === oy);
}

/* ── what stands about the town, as the game's props ────────────────────── */

const KINDS: Array<[RegExp, PropKind, boolean]> = [
  [/bench/, "bench", true],
  [/kasuga_stone_lantern|hanging_red_pape/, "lamp", true],
  [/japanese_cedar|^game_pine$/, "pine", true],
  [/_tree_|bamboo_canes|cherry_blossom_tree/, "tree", true],
  [/^game_flowerbed$/, "flowerbed", true],
  [/wildflower|bellflower|chrysanthemum|spider_lily|iris_clump|tulip|^game_flowers$/, "flowers", false],
  [/^game_bush$|azalea|hydrangea/, "bush", true],
  [/^rock_|boulder/, "rock", true],
  [/^game_bin$|bucket_bin/, "bin", true],
  [/^game_signpost$/, "signpost", true],
];
/**
 * Which way a bench's sitter faces (the owner, 2026-10-22: "make sure ว่าเก้าอี้ทุกที่จะนั่งได้ถูกทิศทางเสมอ", of benches sat
 * on with their backs behind their sitters' faces, and of one by the water sat on looking away from it). A bench with a
 * back faces as its picture does: drawn facing down-left, mirrored down-right. One without faces what it was set about,
 * by the tile under its middle: the two on the river's flower bank the water, the four round the stone square one
 * another, the stage's two rows of three the stage, the two by the beckoning cat the cat, the long one by the tanuki the
 * path. Any other faces the viewer, across its length.
 */
const BACKED = /^(low_wide_wooden_tea_house_bench|plain_dark_wooden_bench_with)/;
const FACES: Record<string, Facing> = {
  "55,70": "SW", "58,70": "SW",
  "10,23": "SW", "7,23": "SW", "10,27": "NE", "7,27": "NE",
  "15,46": "NW", "17,46": "NW", "20,47": "NW", "15,51": "NW", "18,52": "NW", "20,52": "NW",
  "40,66": "SW", "38,67": "SE",
  "36,13": "SW",
};
/** How far forward of a bench's middle its sitter sits: on a bench with a back, before it. */
const BEFORE_BACK = 0.15;
/** A step the way something faces (lib/town/world's FRONT: this module is read before that one). */
const FRONT: Record<Facing, Vec> = { SE: { x: 1, y: 0 }, SW: { x: 0, y: 1 }, NE: { x: 0, y: -1 }, NW: { x: -1, y: 0 } };
/**
 * A bench's places, a prop to each: two on a long one (the owner, 2026-10-22: "ถ้าเป็นเก้าอี้ยาวแบบนี้ช่วยทำให้นั่งได้สอง
 * slot", after two people sat on one in the same place), one on a short one. Each says where its sitter is drawn (along
 * the bench's length), where one stands to sit down there (the ground before it, or, where that is flowers or water,
 * behind it), and how far forward its sitter is drawn: just before the bench's picture, on it (Town.tsx drew the long
 * bench by the tanuki over whoever sat on it).
 */
function benchSeats(t: T2Thing): Prop[] {
  const [x0, y0, x1, y1] = t.box;
  const facing = BACKED.test(t.name) ? ((MAP.objects as number[][])[t.i][5] === 1 ? "SE" : "SW")
    : FACES[`${Math.floor(t.c.x)},${Math.floor(t.c.y)}`] ?? (x1 - x0 >= y1 - y0 ? "SW" : "SE");
  const alongX = facing === "SW" || facing === "NE", length = alongX ? x1 - x0 : y1 - y0, deep = alongX ? y1 - y0 : x1 - x0;
  const n = length >= 1.5 ? 2 : 1, f = FRONT[facing], forward = BACKED.test(t.name) ? BEFORE_BACK : 0;
  const walk = (x: number, y: number) => { const c = WALK[y]?.[x]; return c === "." || c === "="; };
  const under = (x: number, y: number) => x + 0.5 > x0 && x + 0.5 < x1 && y + 0.5 > y0 && y + 0.5 < y1;
  const over = (MAP.objects as number[][])[t.i][7] + 0.01;
  return Array.from({ length: n }, (_, k) => {
    const o = ((k - (n - 1) / 2) * length) / n;
    const seat = { x: t.c.x + (alongX ? o : 0) + f.x * forward, y: t.c.y + (alongX ? 0 : o) + f.y * forward };
    const reach = deep / 2 + 0.5, tile = (d: number) => ({ x: Math.floor(seat.x + f.x * d), y: Math.floor(seat.y + f.y * d) });
    const ahead = tile(reach), behind = tile(-reach);
    let stand = walk(ahead.x, ahead.y) && !under(ahead.x, ahead.y) ? ahead : walk(behind.x, behind.y) && !under(behind.x, behind.y) ? behind : null;
    if (!stand) {
      let best = Infinity;
      for (let y = Math.floor(seat.y) - 2; y <= Math.floor(seat.y) + 2; y++) for (let x = Math.floor(seat.x) - 2; x <= Math.floor(seat.x) + 2; x++) {
        const d = Math.hypot(x + 0.5 - seat.x, y + 0.5 - seat.y);
        if (walk(x, y) && !under(x, y) && d < best) { best = d; stand = { x, y }; }
      }
    }
    return { kind: "bench", x: Math.floor(seat.x), y: Math.floor(seat.y), solid: true, facing, seat, stand: stand ?? ahead, over, of: t.i };
  });
}
/**
 * The town's props: what the game's rules look for (benches to sit on, lamps that glow and draw moths, trees birds sit
 * in and leaves fall from, flowers butterflies visit), one to a thing at the tile under its middle. Drawn by
 * lib/town/town2-art from the editor's pictures, never from the scenery's. The storage box is the last, as it was.
 */
/** Which placed thing each prop is (its picture's box on the screen is a bench's or the chest's place to tap). */
export const T2_PROP_THING = new Map<Prop, number>();
export const T2_PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  for (const t of T2_THINGS) {
    if (T2_LEFT_OUT.has(t.i) || HALL_THINGS.includes(t)) continue;
    const k = KINDS.find(([re]) => re.test(t.name));
    if (!k) continue;
    for (const p of k[1] === "bench" ? benchSeats(t) : [{ kind: k[1], x: Math.floor(t.c.x), y: Math.floor(t.c.y), solid: k[2] } as Prop]) {
      out.push(p);
      T2_PROP_THING.set(p, t.i);
    }
  }
  const box: Prop = { kind: "storebox", x: T2_STOREBOX.x, y: T2_STOREBOX.y, solid: true };
  out.push(box);
  T2_PROP_THING.set(box, CHEST.i);
  return out;
})();

/**
 * Where each lamp's light is (the stone lanterns' fire box, the paper lanterns on their posts): its thing's middle and
 * how far up the screen its flame is, in isometric pixels, for the night (Town.tsx, where the old town's lamps glow).
 */
export const T2_LAMP_LIGHT = new Map<Prop, { at: Vec; up: number }>(T2_PROPS.filter((p) => p.kind === "lamp").map((p) => {
  const t = T2_THINGS[T2_PROP_THING.get(p)!];
  return [p, { at: t.c, up: /hanging_red_pape/.test(t.name) ? 80 : 34 }];
}));

/* ── the ways out ───────────────────────────────────────────────────────── */

const ring = (x: number, y: number) => named(/^game_ring$/).find((t) => Math.abs(t.c.x - x) < 0.6 && Math.abs(t.c.y - y) < 0.6)!;
/** A ring's tiles that can be stepped on (a gate's post may stand on the edge of one). */
const ringTiles = (t: T2Thing) => tilesIn(t.box).filter(([x, y]) => WALK[y][x] === "." || WALK[y][x] === "=");
/** The bridges over the west river, north and south (their far ends lead on to the mountain), and the one over the south river. */
const BRIDGES = named(/^bridge$/).sort((a, b) => a.c.y - b.c.y);
/** A bridge's tiles at the map's west edge: the far end, where the way on is. */
const farEnd = (b: T2Thing) => tilesIn(b.box).filter(([x, y]) => x === 0 && WALK[y][x] === "=");
export const T2_GATES = {
  forest: { tiles: ringTiles(ring(16.82, 1.56)), arch: { x: 17.17, y: 2.19 }, back: { x: 17.5, y: 5.5 } },
  farm: { tiles: ringTiles(ring(44.41, 8.07)), arch: { x: 44.76, y: 8.7 }, back: { x: 44.5, y: 11.5 } },
  farm2: { tiles: ringTiles(ring(52.73, 8.23)), arch: { x: 53.08, y: 8.85 }, back: { x: 52.5, y: 11.5 } },
  mountain: { tiles: [...farEnd(BRIDGES[0]), ...farEnd(BRIDGES[1])], arch: { x: 0.5, y: BRIDGES[0].c.y }, back: { x: 6.5, y: 17.5 } },
};
/** The two rings of the west bridges, moved from the bridges' feet to their far ends (where the way on is), lifted onto the boards. */
export const T2_RING_MOVES: Array<{ i: number; to: Vec }> = [
  { i: ring(5.70, 17.38).i, to: { x: 0.85, y: 17.0 } },
  { i: ring(6.23, 36.40).i, to: { x: 0.85, y: 35.9 } },
];

/** Where each way out's ring of light is (and how far up the screen it is drawn, on a bridge's boards): for its glow at night. */
export const T2_RINGS: Array<{ at: Vec; lift: number }> = [
  { at: ring(16.82, 1.56).c, lift: 0 }, { at: ring(44.41, 8.07).c, lift: 0 }, { at: ring(52.73, 8.23).c, lift: 0 },
  ...T2_RING_MOVES.map((m) => ({ at: m.to, lift: 17 })),
];

/* ── standing raised ────────────────────────────────────────────────────── */

/** How high the bridges' boards are over the ground, in isometric pixels, and how far from each end the steps climb to it. */
const BRIDGE_LIFT = 17, STEPS = 1.4;
/** How far up the screen somebody on a deck is drawn: on the stage, its top's height; on a bridge, its boards' (less on their steps); elsewhere nothing. */
export function t2Lift(x: number, y: number): number {
  const up = stageLift(x, y);
  if (up) return up;
  for (const b of BRIDGES) {
    const [x0, y0, x1, y1] = b.box;
    if (x < x0 || x > x1 || y < y0 || y > y1 || WALK[Math.floor(y)]?.[Math.floor(x)] !== "=") continue;
    const along = x1 - x0 >= y1 - y0, t = along ? x : y, a = along ? x0 : y0, z = along ? x1 : y1;
    return BRIDGE_LIFT * Math.min(1, Math.max(0, (t - a) / STEPS), Math.max(0, (z - t) / STEPS));
  }
  return 0;
}

/* ── the river ─────────────────────────────────────────────────────────── */

/**
 * The editor's town's river as a line down its middle, from where it comes in at the north-west corner, down the west
 * side and along the south to the east edge (tiles): for what moves on it (Town.tsx's drawRiver: the current, glints,
 * fish, what drifts down), as the old town's ran down its own middle.
 */
const RIVER: Vec[] = [
  { x: 13, y: 3.2 }, { x: 6, y: 3.4 }, { x: 2.4, y: 7 }, { x: 2.2, y: 20 }, { x: 2.3, y: 40 }, { x: 2.6, y: 52 }, { x: 3.6, y: 60 },
  { x: 6.5, y: 66 }, { x: 12, y: 70.4 }, { x: 20, y: 73.6 }, { x: 30, y: 76.2 }, { x: 45, y: 77.4 }, { x: 60, y: 77.9 }, { x: 80, y: 78.4 },
];
const RIVER_AT = (() => { let d = 0; return RIVER.map((p, i) => (d += i ? Math.hypot(p.x - RIVER[i - 1].x, p.y - RIVER[i - 1].y) : 0)); })();
/** A point of the river: `t` how far down it (0 to 140, the old town's river's own measure), `across` from its middle (−2.8 to 2.8 across its water). */
export function t2RiverPoint(t: number, across: number): Vec {
  const L = RIVER_AT[RIVER_AT.length - 1], d = Math.max(0, Math.min(L, (t / 140) * L));
  let i = 1;
  while (i < RIVER.length - 1 && RIVER_AT[i] < d) i++;
  const a = RIVER[i - 1], b = RIVER[i], k = (d - RIVER_AT[i - 1]) / (RIVER_AT[i] - RIVER_AT[i - 1] || 1);
  const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
  // (its water is narrower than the old river's: two tiles either side of its middle at most)
  const off = across * 0.68;
  return { x: a.x + dx * k - (dy / n) * off, y: a.y + dy * k + (dx / n) * off };
}

/* ── fishing ────────────────────────────────────────────────────────────── */

/** Whether a float may ride at a point: on water, clear of the shore and of anything standing in it. */
function openWater(x: number, y: number, clear: number): boolean {
  for (const dx of [-clear, 0, clear]) for (const dy of [-clear, 0, clear]) {
    const tx = Math.floor(x + dx), ty = Math.floor(y + dy);
    if (!inT2(tx, ty) || WALK[ty][tx] !== "~") return false;
  }
  return true;
}
const WAYS: Vec[] = [[-1, 1], [-1, 0], [0, 1], [-1, -1], [1, 1], [0, -1], [1, 0], [1, -1]].map(([x, y]) => ({ x: x / Math.hypot(x, y), y: y / Math.hypot(x, y) }));
/**
 * Where somebody standing on a tile can fish (the owner, 2026-10-03, of the old town: the deck for the deep water and
 * the bank all along the river for the shallows; kept so): from a deck (a bridge, the fishing pier, the stone pier) the
 * line goes out to open water within a cast, deep; from the land at the water's edge, a little way out, the shallows.
 */
export function t2Fish(tx: number, ty: number, cast: { reach: number; least: number; clear: number }): Fishing | null {
  const c = t2Tile(tx, ty);
  // (the stage is no deck to fish from, near as the river is)
  if ((c !== "." && c !== "=") || onStage(tx, ty)) return null;
  const cx = tx + 0.5, cy = ty + 0.5, deep = c === "=";
  if (!deep && ![[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => WALK[ty + dy]?.[tx + dx] === "~")) return null;
  // (a row of tiles casting the same way would all land on one spot: each casts a little further than the next)
  const further = [0, 0.5, 1][(((tx + 2 * ty) % 3) + 3) % 3];
  let best = Infinity, found: Fishing | null = null;
  WAYS.forEach((w, n) => {
    for (let d = deep ? cast.least : 0.9; d <= cast.reach + 1e-9; d += 0.1) {
      if (!openWater(cx + w.x * d, cy + w.y * d, cast.clear)) continue;
      if (d + n * 0.35 < best) {
        best = d + n * 0.35;
        const far = [further, further / 2, 0].map((more) => d + more).find((at) => at <= cast.reach + 1e-9 && openWater(cx + w.x * at, cy + w.y * at, cast.clear))!;
        found = { float: { x: Math.round((cx + w.x * far) * 100) / 100, y: Math.round((cy + w.y * far) * 100) / 100 }, deep };
      }
      break;
    }
  });
  return found;
}
