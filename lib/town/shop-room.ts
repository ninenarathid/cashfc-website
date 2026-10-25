/**
 * Granny Twilla's clothes shop (the owner, 2026-10-25): a room of the Cashtown map editor ("oatto-shopinstance"), entered
 * by the townhouse's door in the editor's town (lib/town/town2's T2_SHOP_DOOR) and left by the ring of light inside it.
 * One room everybody shares, a map of its own (lib/town/world's Place "shop") as the farm and the forest are: it lies
 * far off in the same tile space, so which map somebody is on is where they stand, and the room has its own chat channel
 * (lib/town/area-channel), its own camera bounds, and none of the sky (Town.tsx). (Not lib/town/shop: that is a
 * member's stall under a sign.)
 *
 * What is here was made from the editor's export by .claude/skills/fc-cash-town/scripts/pixel/build-shop.mjs
 * (shop-map.json: its floor, its walls, every placed thing and where may be walked), and given its parts in the game
 * below: where one comes in and goes out, where Granny stands, the notice board, the mannequin.
 *
 * ── Where may be walked (the export's own rules, its README §8: never work out again what the map states) ──
 * - A tile is open where the export's collision row has "." and closed where it has "#" (counters, shelves, racks,
 *   sacks, the barrel); its edges are the room's.
 * - A wall stands on an edge between two tiles and closes that edge (a doorway would not; this room has none). The
 *   walls are the room's back edges, west and north; a step that would cross one, straight or round its end, is not
 *   taken.
 * - The ring of light in the south corner is the way out: stepping onto it, and stopping there, takes you back out to
 *   the street before the townhouse's door.
 */
import MAP from "./shop-map.json";
import type { Vec } from "./world";

export const SHOP_COLS: number = MAP.cols;
export const SHOP_ROWS: number = MAP.rows;
/**
 * Where the room lies in the tile space: east of the forest and the farm's animal farm (both end before x 240), above
 * the mountain's rows (y 208 on), and within what a path's tiles are numbered by (lib/town/world's findPath).
 */
export const SHOP_ROOM = { x: 320, y: 112, w: SHOP_COLS, h: SHOP_ROWS };
/** Whether a point is in the room. */
export const inShop = (x: number, y: number) => x >= SHOP_ROOM.x && y >= SHOP_ROOM.y && x < SHOP_ROOM.x + SHOP_ROOM.w && y < SHOP_ROOM.y + SHOP_ROOM.h;
/** A point of the room's own (the export's tiles) in the tile space. */
const out = (x: number, y: number): Vec => ({ x: SHOP_ROOM.x + x, y: SHOP_ROOM.y + y });

/* ── where may be walked ────────────────────────────────────────────────── */

const WALK: string[] = MAP.walk;
/** Whether a tile of the room is open to stand on (the export's collision rows). */
export const shopOpen = (tx: number, ty: number) => inShop(tx, ty) && WALK[ty - SHOP_ROOM.y][tx - SHOP_ROOM.x] === ".";
/** The edges walls close, by the room's own tile and side ("x,y,n": the tile's north edge; "x,y,w": its west edge). A doorway closes none. */
const WALLED = new Set((MAP.walls as Array<[number, number, string, string]>).filter(([, , , kind]) => kind !== "door").map(([x, y, side]) => `${x},${y},${side}`));
/** Whether a straight step between two neighbouring tiles (the tile space's) crosses a wall. */
function across(ax: number, ay: number, bx: number, by: number): boolean {
  const x = ax - SHOP_ROOM.x, y = ay - SHOP_ROOM.y;
  if (bx === ax + 1) return WALLED.has(`${x + 1},${y},w`);
  if (bx === ax - 1) return WALLED.has(`${x},${y},w`);
  if (by === ay + 1) return WALLED.has(`${x},${y + 1},n`);
  if (by === ay - 1) return WALLED.has(`${x},${y},n`);
  return false;
}
/** Whether a step from one tile to a neighbour crosses one of the room's walls: straight across it, or diagonally round either way past its end. */
export function shopOverWall(ax: number, ay: number, bx: number, by: number): boolean {
  if (!inShop(ax, ay) && !inShop(bx, by)) return false;
  const dx = bx - ax, dy = by - ay;
  if (!dx || !dy) return across(ax, ay, bx, by);
  return across(ax, ay, ax + dx, ay) || across(ax + dx, ay, bx, by) || across(ax, ay, ax, ay + dy) || across(ax, ay + dy, bx, by);
}

/* ── what stands there ──────────────────────────────────────────────────── */

/** A placed thing: its picture's name, its footprint's box (the tile space's) and middle. */
export interface ShopThing { i: number; name: string; box: [number, number, number, number]; c: Vec }
export const SHOP_THINGS: ShopThing[] = (MAP.objects as number[][]).map((o, i) => ({
  i, name: MAP.names[o[0]], box: [SHOP_ROOM.x + o[8], SHOP_ROOM.y + o[9], SHOP_ROOM.x + o[10], SHOP_ROOM.y + o[11]],
  c: out((o[8] + o[10]) / 2, (o[9] + o[11]) / 2),
}));
const first = (re: RegExp) => { const t = SHOP_THINGS.find((q) => re.test(q.name)); if (!t) throw new Error(`shop: no ${re}`); return t; };
/** The tiles whose middles are in a box. */
const tilesIn = ([x0, y0, x1, y1]: readonly number[]): Array<[number, number]> => {
  const tiles: Array<[number, number]> = [];
  for (let y = Math.floor(y0); y <= Math.floor(y1); y++) for (let x = Math.floor(x0); x <= Math.floor(x1); x++) if (x + 0.5 >= x0 && x + 0.5 <= x1 && y + 0.5 >= y0 && y + 0.5 <= y1) tiles.push([x, y]);
  return tiles;
};

/** The ring of light, the way out: its tiles that are open, and its middle (for its glow). */
const RING = first(/^game_ring$/);
export const SHOP_RING = { i: RING.i, tiles: tilesIn(RING.box).filter(([x, y]) => shopOpen(x, y)), at: RING.c };
/**
 * Where one comes in from the townhouse's door: the open tile beside the ring, up the room from it, nearest its middle,
 * so that whoever comes in stands by the way out and sees it, and is not on it (stepping onto it again is a choice,
 * never a bounce).
 */
export const SHOP_IN: Vec = (() => {
  const on = new Set(SHOP_RING.tiles.map((t) => t.join(",")));
  let best: [number, number] | null = null, least = Infinity;
  for (const [x, y] of SHOP_RING.tiles) for (const [dx, dy] of [[0, -1], [-1, -1], [1, -1]]) {
    const tx = x + dx, ty = y + dy, d = Math.hypot(tx + 0.5 - RING.c.x, ty + 0.5 - RING.c.y);
    if (shopOpen(tx, ty) && !on.has(`${tx},${ty}`) && d < least) { least = d; best = [tx, ty]; }
  }
  if (!best) throw new Error("shop: no open tile by the ring");
  return { x: best[0] + 0.5, y: best[1] + 0.5 };
})();

/** The notice board on the north wall: a tap on it opens the weekly auction's board (Town.tsx's panel `auction`). */
export const SHOP_BOARD = first(/^wall_notice_board/).i;
/**
 * The mannequin by the east shelves: where the week's auction outfits are to be shown (lib/town/shop-room-art's
 * `onMannequin`, drawn with it; nothing yet).
 */
const MANNEQUIN = first(/^empty_dress_form_mannequin/);
export const SHOP_MANNEQUIN = { i: MANNEQUIN.i, at: MANNEQUIN.c };

/**
 * Granny Twilla (ยายทวิลล่า), who sells clothes: where the owner's popoto stood behind the west counter (the export's
 * `keeper`), drawn just before that counter so that its top hides her from the waist down, as a keeper behind her
 * counter (lib/town/shop-room-art's `keeperDepth`). She closes no tile (she stands between the counter and the wall); one
 * talks to her by tapping her, from anywhere in the room.
 */
const KEEPER = MAP.keeper as { at: [number, number]; behind: number };
export const SHOP_KEEPER = {
  id: "granny" as const, stand: SHOP_THINGS[KEEPER.behind].c, at: out(KEEPER.at[0], KEEPER.at[1]), tiles: [] as Array<[number, number]>,
  /** The counter she stands behind (its number among the room's things). */
  behind: KEEPER.behind,
};
