/**
 * The city's water moving (the owner, 2026-11-23: "ช่วยแก้ไขให้น้ำ ดูมีความเคลื่อนไหว มีคลื่น มากกว่านี้ได้ไหม"): the sea and
 * the canal are the map's own pictures of sunken water (lib/town/city-art), still; over them, at the water's own height
 * and in each row's turn back to front (so the near bank still stands in front of the water behind it), this draws:
 * - waves: thin crests that rise, roll a little way and fade, toward the beach on the sea, down the canal;
 * - foam: a white line along every bank and the beach, washing in and out;
 * - glints: the sun on the water, twinkling here and there;
 * - the water's own texture again, faint, drifting two ways at once over the still one: the surface shimmers and flows.
 * All of it by the wall clock (everybody sees the same water), cheap: a few strokes a tile of what is on the screen.
 */
import { T2_COLS, T2_DOCK_BOX, T2_ORIGIN, T2_ROWS, T2_TEXTURES, t2Tile } from "./city";
import type { Vec } from "./world";

const OX = T2_ORIGIN.x, OY = T2_ORIGIN.y;
const isWater = (x: number, y: number) => t2Tile(x, y) === "~";
/** The water under and about the dock: left to the dock's picture (the moving layer would lie over its boards). */
const [DX0, DY0, DX1, DY1] = T2_DOCK_BOX;
const byDock = (x: number, y: number) => x >= Math.floor(DX0) - 1 && x <= Math.ceil(DX1) && y >= Math.floor(DY0) - 1 && y <= Math.ceil(DY1);
/** The water's texture (the city's "game_water"), fetched once, for the drifting layer. */
let TEX: HTMLImageElement | null = null, texReady = false;
const texture = () => {
  if (!TEX && typeof Image !== "undefined") {
    const src = T2_TEXTURES.find((t) => /water/.test(String(t.look)))?.src;
    if (src) { TEX = new Image(); TEX.onload = () => { texReady = true; }; TEX.src = src; }
  }
  return texReady ? TEX : null;
};
const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();
/** Each water tile's sides that touch land (or the dock): 1 north (−y), 2 east (+x), 4 south (+y), 8 west (−x). */
let SHORE: Uint8Array | null = null;
function shoreOf(x: number, y: number): number {
  if (!SHORE) {
    SHORE = new Uint8Array(T2_COLS * T2_ROWS);
    for (let ty = OY; ty < OY + T2_ROWS; ty++) for (let tx = OX; tx < OX + T2_COLS; tx++) {
      if (!isWater(tx, ty)) continue;
      let m = 0;
      if (!isWater(tx, ty - 1) && ty - 1 >= OY) m |= 1;
      if (!isWater(tx + 1, ty) && tx + 1 < OX + T2_COLS) m |= 2;
      if (!isWater(tx, ty + 1) && ty + 1 < OY + T2_ROWS) m |= 4;
      if (!isWater(tx - 1, ty) && tx - 1 >= OX) m |= 8;
      SHORE[(ty - OY) * T2_COLS + tx - OX] = m;
    }
  }
  return SHORE[(y - OY) * T2_COLS + x - OX];
}
const hash = (x: number, y: number, k: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
/** The sea (the rows along the city's south-west edge, and the bay by the beach): its waves roll toward the shore; the canal's run down it. */
const inSea = (y: number) => y >= 116;
/** The sides of a tile, each its two ends and its inward step (tile fractions). */
const SIDES: Array<[number, [number, number], [number, number], [number, number]]> = [
  [1, [0, 0], [1, 0], [0, 1]], [2, [1, 0], [1, 1], [-1, 0]], [4, [1, 1], [0, 1], [0, -1]], [8, [0, 1], [0, 0], [1, 0]],
];

export type Push = (depth: number, draw: () => void) => void;

/**
 * Push the moving water of the tiles of water in a view (isometric pixels: what is on the screen) into the frame's back-
 * to-front list: each row of tiles just after its own still water (a stretch of ground's place is its row + 0.97), before
 * anything standing on that row. `project` is the page's own (a tile point to the screen, the ground's height laid on).
 */
export function pushCityWater(ctx: CanvasRenderingContext2D, push: Push, project: (p: Vec) => Vec, view: { x0: number; y0: number; x1: number; y1: number }, s: number, sec: number) {
  const fx = (wx: number, wy: number) => (wx / 32 + wy / 16) / 2, fy = (wx: number, wy: number) => (wy / 16 - wx / 32) / 2;
  // (the view's tiles, a little beyond it: the water stands lower than the level ground it is seen past)
  const cs = [[view.x0, view.y0], [view.x1, view.y0], [view.x0, view.y1 + 80], [view.x1, view.y1 + 80]];
  const xs = cs.map(([a, b]) => fx(a, b)), ys = cs.map(([a, b]) => fy(a, b));
  const x0 = Math.max(OX, Math.floor(Math.min(...xs)) - 1), x1 = Math.min(OX + T2_COLS - 1, Math.ceil(Math.max(...xs)) + 1);
  const y0 = Math.max(OY, Math.floor(Math.min(...ys)) - 1), y1 = Math.min(OY + T2_ROWS - 1, Math.ceil(Math.max(...ys)) + 1);
  const rows = new Map<number, Array<[number, number]>>();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!isWater(x, y) || byDock(x, y)) continue;
    const ix = (x - y) * 32, iy = (x + y + 1) * 16;
    if (ix < view.x0 - 64 || ix > view.x1 + 64 || iy < view.y0 - 32 || iy > view.y1 + 96) continue;
    const r = x + y;
    let list = rows.get(r);
    if (!list) rows.set(r, (list = []));
    list.push([x, y]);
  }
  const hw = 32 * s, hh = 16 * s, tex = texture();
  let pattern = tex ? patterns.get(ctx) ?? null : null;
  if (tex && !pattern) { pattern = ctx.createPattern(tex, "repeat"); if (pattern) patterns.set(ctx, pattern); }
  for (const [r, tiles] of rows) push(r + 0.975, () => {
    ctx.save();
    ctx.lineCap = "round";
    // ── the surface: the water's texture twice more, faint, drifting two ways, over this row's tiles ──
    if (pattern && tiles.length) {
      const o = project({ x: OX, y: OY }), lift = project({ x: tiles[0][0] + 0.5, y: tiles[0][1] + 0.5 }).y - ((tiles[0][0] + 0.5 - OX + tiles[0][1] + 0.5 - OY) * hh + o.y);
      ctx.beginPath();
      for (const [x, y] of tiles) {
        const c = project({ x: x + 0.5, y: y + 0.5 });
        ctx.moveTo(c.x, c.y - hh); ctx.lineTo(c.x + hw, c.y); ctx.lineTo(c.x, c.y + hh); ctx.lineTo(c.x - hw, c.y); ctx.closePath();
      }
      ctx.globalCompositeOperation = "screen";
      // (a texel of the ground is half a tile's 64 pixels: 32 to a tile edge, laid along the tiles, README §4)
      for (const [du, dv, k, alpha] of [[sec * 5.5, sec * 2.2, 1, 0.3], [-sec * 3.1, sec * 4.4, 1.37, 0.2]] as const) {
        const m = new DOMMatrix([s * k, 0.5 * s * k, -s * k, 0.5 * s * k, o.x + (du - dv) * s, o.y + lift + (du + dv) * 0.5 * s]);
        pattern.setTransform(m);
        ctx.fillStyle = pattern;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    for (const [x, y] of tiles) {
      const c = project({ x: x + 0.5, y: y + 0.5 });
      // a point of the tile (u along x, v along y, 0 to 1) on the screen, at the water's height
      const P = (u: number, v: number) => ({ x: c.x + (u - v) * hw, y: c.y + (u + v - 1) * hh });
      const sea = inSea(y);
      // ── waves: two crests a tile, each rolling across it and fading out ──
      ctx.lineWidth = Math.max(1, 1.5 * s);
      for (let i = 0; i < 2; i++) {
        const ph = (sec * (sea ? 0.21 : 0.15) + hash(x, y, i)) % 1, k = Math.sin(Math.PI * ph);
        if (k < 0.08) continue;
        const v = sea ? 1 - ph : ph, u0 = 0.08 + hash(x, y, i + 2) * 0.35, u1 = Math.min(0.95, u0 + 0.3 + hash(x, y, i + 4) * 0.3);
        const a = P(u0, v), b = P(u1, v), m = P((u0 + u1) / 2, v - 0.09);
        ctx.strokeStyle = `rgba(240,250,255,${(0.55 * k).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y, b.x, b.y); ctx.stroke();
      }
      // ── foam along a bank or the beach, washing in and out ──
      const shore = shoreOf(x, y);
      if (shore) {
        const wash = 0.5 + 0.5 * Math.sin(sec * 1.25 + (x + y) * 0.7);
        for (const [bit, [ax, ay], [bx, by], [nx, ny]] of SIDES) {
          if (!(shore & bit)) continue;
          for (const [d, alpha, w] of [[0.07 + 0.12 * wash, 0.8, 2], [0.24 + 0.14 * wash, 0.35 * (1 - wash) + 0.12, 1.3]] as const) {
            const a = P(ax + nx * d, ay + ny * d), b = P(bx + nx * d, by + ny * d);
            ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
            ctx.lineWidth = Math.max(1, w * s);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // ── the sun's glints ──
      if (hash(x, y, 7) < 0.32) {
        const k = Math.pow(Math.max(0, Math.sin(sec * 1.6 + hash(x, y, 8) * 20)), 8);
        if (k > 0.05) {
          const g = P(0.2 + hash(x, y, 9) * 0.6, 0.2 + hash(x, y, 10) * 0.6), z = Math.max(1, s * 1.4);
          ctx.fillStyle = `rgba(255,255,255,${(0.85 * k).toFixed(3)})`;
          ctx.fillRect(g.x - z * 1.5, g.y - z / 2, z * 3, z);
          ctx.fillRect(g.x - z / 2, g.y - z * 1.5, z, z * 3);
        }
      }
    }
    ctx.restore();
  });
}
