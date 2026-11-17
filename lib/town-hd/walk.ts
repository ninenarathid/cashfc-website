/**
 * Walking in the HD-2D trial: a map's own rules of where may be walked, asked tile by tile, and a way found over them.
 * Nothing of the live town's walkers is used: one test character, on one map at a time (./maps says what each map's
 * rules are).
 */
export interface P { x: number; y: number }
/** What a map tells of its walking: its extent in tiles, which tiles are open, and which steps between open tiles are barred. */
export interface WalkMap {
  x0: number; y0: number; cols: number; rows: number;
  open(x: number, y: number): boolean;
  /** A rail, a wall or a fence between two neighbouring tiles. */
  barred(ax: number, ay: number, bx: number, by: number): boolean;
}
export type Walk = ReturnType<typeof makeWalk>;

export function makeWalk(m: WalkMap) {
  const inside = (x: number, y: number) => x >= m.x0 && y >= m.y0 && x < m.x0 + m.cols && y < m.y0 + m.rows;
  const at = (x: number, y: number) => (y - m.y0) * m.cols + x - m.x0;
  const OPEN = new Uint8Array(m.cols * m.rows);
  for (let y = m.y0; y < m.y0 + m.rows; y++) for (let x = m.x0; x < m.x0 + m.cols; x++) OPEN[at(x, y)] = m.open(x, y) ? 1 : 0;
  const open = (tx: number, ty: number) => inside(tx, ty) && OPEN[at(tx, ty)] === 1;
  /** Whether one tile may be stepped to from the next: both open, nothing barring the way, no corner cut. */
  function step(ax: number, ay: number, bx: number, by: number): boolean {
    if (ax === bx && ay === by) return open(bx, by);
    if (!open(bx, by) || m.barred(ax, ay, bx, by)) return false;
    if (ax !== bx && ay !== by) return step(ax, ay, bx, ay) && step(ax, ay, ax, by) && step(bx, ay, bx, by) && step(ax, by, bx, by);
    return true;
  }
  /** The open tile nearest a point, within a few tiles. */
  function nearestOpen(x: number, y: number, reach = 6): P | null {
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
  function findWay(from: P, to: P): P[] | null {
    const N = m.cols * m.rows, id = (p: P) => at(p.x, p.y);
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
      const lx = cur % m.cols, cx = lx + m.x0, cy = (cur - lx) / m.cols + m.y0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!inside(nx, ny) || !step(cx, cy, nx, ny)) continue;
        const n = at(nx, ny), c = cost[cur] + (dx && dy ? 1.414 : 1);
        if (c < cost[n]) { cost[n] = c; came[n] = cur; heap.push([c + h(nx, ny), n]); }
      }
    }
    if (came[id(to)] < 0) return null;
    const way: P[] = [];
    for (let c = id(to); c !== id(from); c = came[c]) way.push({ x: (c % m.cols) + m.x0 + 0.5, y: Math.floor(c / m.cols) + m.y0 + 0.5 });
    return way.reverse();
  }
  return { open, step, nearestOpen, findWay };
}
