/**
 * Walking in the HD-2D trial: the editor's town's own rules of where may be walked (lib/town/town2), asked tile by
 * tile, and a way found over them. Nothing of the live town's walkers is used: one test character, on one map.
 */
import { T2_COLS, T2_ROWS, inT2, t2OverRail, t2OverWall, t2Tile } from "@/lib/town/town2";

export interface P { x: number; y: number }

const OPEN = (() => {
  const out = new Uint8Array(T2_COLS * T2_ROWS);
  for (let y = 0; y < T2_ROWS; y++) for (let x = 0; x < T2_COLS; x++) {
    const c = t2Tile(x, y);
    out[y * T2_COLS + x] = c === "." || c === "=" || c === "f" ? 1 : 0;
  }
  return out;
})();
export const open = (tx: number, ty: number) => inT2(tx, ty) && OPEN[ty * T2_COLS + tx] === 1;
/** Whether one tile may be stepped to from the next: both open, no rail or wall between, no corner cut. */
export function step(ax: number, ay: number, bx: number, by: number): boolean {
  if (ax === bx && ay === by) return open(bx, by);
  if (!open(bx, by) || t2OverRail(ax, ay, bx, by) || t2OverWall(ax, ay, bx, by)) return false;
  if (ax !== bx && ay !== by) return step(ax, ay, bx, ay) && step(ax, ay, ax, by) && step(bx, ay, bx, by) && step(ax, by, bx, by);
  return true;
}

/** The open tile nearest a point, within a few tiles. */
export function nearestOpen(x: number, y: number, reach = 6): P | null {
  const tx = Math.floor(x), ty = Math.floor(y);
  let best: P | null = null, bd = Infinity;
  for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
    if (!open(tx + dx, ty + dy)) continue;
    const d = Math.hypot(tx + dx + 0.5 - x, ty + dy + 0.5 - y);
    if (d < bd) { bd = d; best = { x: tx + dx, y: ty + dy }; }
  }
  return best;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** A way from one tile to another, as the middles of the tiles to pass (the first left out), or null. */
export function findWay(from: P, to: P): P[] | null {
  const N = T2_COLS * T2_ROWS, id = (p: P) => p.y * T2_COLS + p.x;
  if (!open(from.x, from.y) || !open(to.x, to.y)) return null;
  const cost = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap: Array<[number, number]> = [[0, id(from)]];
  cost[id(from)] = 0;
  const h = (x: number, y: number) => { const dx = Math.abs(x - to.x), dy = Math.abs(y - to.y); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  while (heap.length) {
    let bi = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0]) bi = i;
    const [, cur] = heap.splice(bi, 1)[0];
    if (done[cur]) continue;
    done[cur] = 1;
    if (cur === id(to)) break;
    const cx = cur % T2_COLS, cy = (cur - cx) / T2_COLS;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inT2(nx, ny) || !step(cx, cy, nx, ny)) continue;
      const n = ny * T2_COLS + nx, c = cost[cur] + (dx && dy ? 1.414 : 1);
      if (c < cost[n]) { cost[n] = c; came[n] = cur; heap.push([c + h(nx, ny), n]); }
    }
  }
  if (came[id(to)] < 0) return null;
  const way: P[] = [];
  for (let c = id(to); c !== id(from); c = came[c]) way.push({ x: (c % T2_COLS) + 0.5, y: Math.floor(c / T2_COLS) + 0.5 });
  return way.reverse();
}
