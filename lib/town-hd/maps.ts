/**
 * The maps of the HD-2D trial (the owner, 2026-11-17, of the first town: "คิดว่าแบบนี้ดีแล้ว ช่วยลองทำด้วยวิธีเดียวกัน
 * ให้ครบทุกแมพ"). Each is one of the Cashtown map editor's exports as the game already reads it: its pictures and where
 * each was drawn, its ground, and its own rules of walking. The engine (./engine) stands any of them up the same way.
 *
 * Everything is in the game's own tiles (the farm's corner is at 128, 0, as in the game).
 */
import TOWN from "@/lib/town/town2-map.json";
import FARM from "@/lib/town/farm2-map.json";
import SHOP from "@/lib/town/shop-map.json";
import { T2_COLS, T2_LEFT_OUT, T2_PLAZA, T2_ROWS, inT2, t2BankLook, t2Look, t2OverRail, t2OverWall, t2Tile, type T2Look } from "@/lib/town/town2";
import { F2_RECT, f2Ground, f2OverEdge, f2Tile } from "@/lib/town/farm2";
import type { WalkMap } from "./walk";

export type MapId = "town" | "farm" | "shop";
/** The ground's looks, by number, as the engine paints them: the six pictures of the editor's ground, and a bed's turned soil. */
export const LOOK = { grass: 0, water: 1, sand: 2, road: 3, wood: 4, plaza: 5, field: 6, dark: 7 } as const;

export interface HdMap extends WalkMap {
  id: MapId;
  /** Where its pictures are served from. */
  dir: string;
  sprites: Array<[string, number, number]>;
  names: string[];
  /** [name, sprite, isoX, isoY, scale, flip, how, depth, x0, y0, x1, y1] */
  objects: number[][];
  /** The ground's look at a point inside the map. */
  look(x: number, y: number): number;
  /** The ground's look just outside it, where the map says (a river's far bank); null where it does not. */
  bank?(x: number, y: number): number | null;
  /** A tile that is boards over water or ground. */
  isDeck(x: number, y: number): boolean;
  /** A tile something stands on. */
  shut(x: number, y: number): boolean;
  start: { x: number; y: number };
  leftOut: Set<number>;
  /** Of the things a map keeps for another state (a barn open, a chest open: `how` 4), the ones shown. */
  shown?: RegExp;
  /** A room: nothing beyond its floor, and no sun to throw shadows in it. */
  indoors?: boolean;
  /** A wide thing with no shape of its own is stood up as a plain house (its picture makes it what it is). */
  plainHouses: boolean;
}

/* ── the town ───────────────────────────────────────────────────────────── */

const T2: T2Look[] = ["t2grass", "t2water", "t2sand", "t2road", "t2wood", "t2plaza"];
// The stone pier in the south: its boards are a tile nearer the bank than its tiles. The tile of water between its end
// and the bank is boards here ("ท่าน้ำตรงนี้ควรจะเดินขึ้นไปได้"), and its far row is water under its picture's end
// ("ตรงนี้ช่องเดินเลยมา 1 ช่อง"): the owner, 2026-11-17.
const PAST_END = new Set(["49,75", "50,75", "51,75"]);
function gap(x: number, y: number): boolean {
  if (t2Tile(x, y) !== "~") return false;
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const a = t2Tile(x + dx, y + dy), b = t2Tile(x - dx, y - dy);
    if ((a === "=" && b === ".") || (a === "." && b === "=")) return true;
  }
  return false;
}
/** The fishing pier's stairs are climbed along, from their foot; not crossed from their sides, through their strings. */
const STAIR_SIDES = new Set(["20,63|20,62", "20,62|20,63", "20,64|20,65", "20,65|20,64"]);
const townDeck = (x: number, y: number) => (t2Tile(x, y) === "=" && !PAST_END.has(`${x},${y}`)) || gap(x, y);

const town: HdMap = {
  id: "town", dir: "/town/town2", x0: 0, y0: 0, cols: T2_COLS, rows: T2_ROWS,
  sprites: TOWN.sprites as Array<[string, number, number]>, names: TOWN.names as string[], objects: TOWN.objects as number[][],
  look: (x, y) => T2.indexOf(t2Look(x, y)),
  bank: (x, y) => { const b = t2BankLook(x, y); return b ? T2.indexOf(b) : null; },
  open: (x, y) => { if (!inT2(x, y)) return false; const c = t2Tile(x, y); return c === "." || c === "f" || townDeck(x, y); },
  barred: (ax, ay, bx, by) => t2OverRail(ax, ay, bx, by) || t2OverWall(ax, ay, bx, by) || STAIR_SIDES.has(`${ax},${ay}|${bx},${by}`),
  isDeck: townDeck,
  shut: (x, y) => t2Tile(x, y) === "#",
  start: { x: T2_PLAZA.x + T2_PLAZA.w / 2, y: T2_PLAZA.y + T2_PLAZA.h * 0.72 },
  leftOut: T2_LEFT_OUT,
  plainHouses: false,
};

/* ── the farm ───────────────────────────────────────────────────────────── */

const farm: HdMap = {
  id: "farm", dir: "/town/farm2", x0: F2_RECT.x, y0: F2_RECT.y, cols: F2_RECT.w, rows: F2_RECT.h,
  sprites: FARM.sprites as Array<[string, number, number]>, names: FARM.names as string[], objects: FARM.objects as number[][],
  look: (x, y) => LOOK[f2Ground(x, y)] ?? LOOK.grass,
  open: (x, y) => f2Tile(x, y) === ".",
  barred: f2OverEdge,
  isDeck: () => false,
  shut: (x, y) => f2Tile(x, y) === "#",
  // (inside the farm's west gate, where the town's road comes in)
  start: { x: F2_RECT.x + 16, y: F2_RECT.y + 53 },
  leftOut: new Set(),
  // (a barn as it first stands, shut; a trough full: the rest of a map's `how` 4 are the same things in another state)
  shown: /^(barnt1_1|barnt2_1|barn_v3_close|barn_v4_close|create_animal_feeding_trough_asset_19fd5)/,
  plainHouses: true,
};

/* ── Granny Twilla's clothes shop ───────────────────────────────────────── */

// (a room of the editor's, in its own tiles: its floor one picture, laid on the ground as the first of its things)
const SHOP_WALLS = new Set((SHOP.walls as Array<[number, number, string, string]>).map(([x, y, side]) => `${x},${y},${side}`));
const shopAcross = (ax: number, ay: number, bx: number, by: number) =>
  bx === ax && by === ay - 1 ? SHOP_WALLS.has(`${ax},${ay},n`) : bx === ax && by === ay + 1 ? SHOP_WALLS.has(`${bx},${by},n`)
    : by === ay && bx === ax - 1 ? SHOP_WALLS.has(`${ax},${ay},w`) : by === ay && bx === ax + 1 ? SHOP_WALLS.has(`${bx},${by},w`) : false;
const SHOP_FLOOR = SHOP.floor as unknown as [string, number, number, number, number];
const shop: HdMap = {
  id: "shop", dir: "/town/shop", x0: 0, y0: 0, cols: SHOP.cols, rows: SHOP.rows,
  sprites: [...(SHOP.sprites as Array<[string, number, number]>), [SHOP_FLOOR[0], SHOP_FLOOR[3], SHOP_FLOOR[4]]],
  names: [...(SHOP.names as string[]), "room_floor"],
  objects: [[SHOP.names.length, SHOP.sprites.length, SHOP_FLOOR[1], SHOP_FLOOR[2], 1, 0, 0, 0, 0, 0, SHOP.cols, SHOP.rows], ...(SHOP.objects as number[][])],
  look: () => LOOK.dark,
  open: (x, y) => (SHOP.walk as string[])[y]?.[x] === ".",
  barred: (ax, ay, bx, by) => (ax !== bx && ay !== by
    ? shopAcross(ax, ay, bx, ay) || shopAcross(bx, ay, bx, by) || shopAcross(ax, ay, ax, by) || shopAcross(ax, by, bx, by) : shopAcross(ax, ay, bx, by)),
  isDeck: () => false,
  shut: (x, y) => (SHOP.walk as string[])[y]?.[x] === "#",
  start: { x: 5.5, y: 6.5 },
  leftOut: new Set(),
  indoors: true,
  plainHouses: false,
};

export const MAPS: Record<MapId, HdMap> = { town, farm, shop };
