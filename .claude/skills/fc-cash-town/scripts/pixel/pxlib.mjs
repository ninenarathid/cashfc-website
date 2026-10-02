// AI "pixel art" sheets -> true pixel cells: grid, mode colour per cell, a shared palette, shapes.
import { createRequire } from "node:module";
const require = createRequire("E:/NinenineProject/fcnext/package.json");
export const sharp = require("sharp");

export async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/* ── grid ─────────────────────────────────────────────────────────────── */

function edges({ data, W, H }) {
  const diff = (i, j) => Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]) + Math.abs(data[i + 3] - data[j + 3]);
  const ex = new Float64Array(W), ey = new Float64Array(H);
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) {
    const i = (y * W + x) * 4;
    if (data[i + 3] < 128 && data[i - 1] < 128) continue;
    if (diff(i, i - 4) > 60) ex[x]++;
    if (diff(i, i - W * 4) > 60) ey[y]++;
  }
  return { ex, ey };
}
// on-grid edges minus edges half-way between grid lines, so a multiple of the true period loses
function combScore(sig, p, ph) {
  let on = 0, mid = 0, n = 0;
  for (let k = ph; k < sig.length - p; k += p) { on += sig[Math.round(k)] ?? 0; mid += sig[Math.round(k + p / 2)] ?? 0; n++; }
  return (on - mid) / n;
}
export function bestPhase(sig, p) {
  let best = { s: -1e9, ph: 0 };
  for (let ph = 0; ph < p; ph += 0.1) { const s = combScore(sig, p, ph); if (s > best.s) best = { s, ph }; }
  return best.ph;
}
/** The pixel period (from x; y is noisier) and the phase on each axis. With `period`, only the phases; `range` bounds the search. */
export function detectGrid(raw, period, range = [3, 14]) {
  const { ex, ey } = edges(raw);
  let p = period;
  if (!p) {
    let best = { s: -1e9 };
    for (let q = range[0]; q <= range[1]; q += 0.01) for (let ph = 0; ph < q; ph += 0.25) { const s = combScore(ex, q, ph); if (s > best.s) best = { s, q }; }
    p = best.q;
  }
  return { p, phx: bestPhase(ex, p), phy: bestPhase(ey, p) };
}

/* ── cells ────────────────────────────────────────────────────────────── */

/** Mode colour of the middle of each cell; a cell is opaque when most of it is. */
export function cellsOf(raw, { p, phx, phy }) {
  const { data, W, H } = raw;
  const GW = Math.floor((W - phx) / p), GH = Math.floor((H - phy) / p);
  const c = new Uint8Array(GW * GH * 4);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const x0 = phx + gx * p, y0 = phy + gy * p;
    const m = new Map(); let opaque = 0, tot = 0;
    for (let y = Math.ceil(y0 + p * 0.2); y < y0 + p * 0.8; y++) for (let x = Math.ceil(x0 + p * 0.2); x < x0 + p * 0.8; x++) {
      if (x >= W || y >= H) continue;
      const i = (y * W + x) * 4; tot++;
      if (data[i + 3] < 128) continue; opaque++;
      const key = (data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | data[i + 2] >> 3;
      const e = m.get(key) ?? [0, 0, 0, 0]; e[0]++; e[1] += data[i]; e[2] += data[i + 1]; e[3] += data[i + 2]; m.set(key, e);
    }
    if (!tot || opaque * 2 < tot) continue;
    let b = null; for (const e of m.values()) if (!b || e[0] > b[0]) b = e;
    const o = (gy * GW + gx) * 4;
    c[o] = b[1] / b[0]; c[o + 1] = b[2] / b[0]; c[o + 2] = b[3] / b[0]; c[o + 3] = 255;
  }
  return { GW, GH, c };
}

/** One palette for many grids (median cut), so layers from different sheets share colours. */
export function paletteOf(grids, K) {
  const px = [];
  for (const g of grids) for (let i = 0; i < g.c.length; i += 4) if (g.c[i + 3]) px.push([g.c[i], g.c[i + 1], g.c[i + 2]]);
  let boxes = [px];
  const range = (bx, ch) => { let lo = 255, hi = 0; for (const q of bx) { if (q[ch] < lo) lo = q[ch]; if (q[ch] > hi) hi = q[ch]; } return hi - lo; };
  while (boxes.length < K) {
    let bi = -1, split = -1;
    boxes.forEach((bx, k) => { if (bx.length < 2) return; const s = Math.max(range(bx, 0), range(bx, 1), range(bx, 2)) * Math.sqrt(bx.length); if (s > split) { split = s; bi = k; } });
    if (bi < 0) break;
    const bx = boxes[bi], r = [0, 1, 2].map(ch => range(bx, ch)), ch = r.indexOf(Math.max(...r));
    bx.sort((a, b) => a[ch] - b[ch]);
    boxes.splice(bi, 1, bx.slice(0, bx.length >> 1), bx.slice(bx.length >> 1));
  }
  return boxes.filter(b => b.length).map(b => [0, 1, 2].map(ch => Math.round(b.reduce((s, q) => s + q[ch], 0) / b.length)));
}
export function snap(g, pal) {
  const cache = new Map();
  for (let i = 0; i < g.c.length; i += 4) if (g.c[i + 3]) {
    const key = g.c[i] << 16 | g.c[i + 1] << 8 | g.c[i + 2];
    let bc = cache.get(key);
    if (!bc) {
      let bd = 1e9;
      for (const q of pal) { const d = (q[0] - g.c[i]) ** 2 * 2 + (q[1] - g.c[i + 1]) ** 2 * 4 + (q[2] - g.c[i + 2]) ** 2 * 3; if (d < bd) { bd = d; bc = q; } }
      cache.set(key, bc);
    }
    g.c[i] = bc[0]; g.c[i + 1] = bc[1]; g.c[i + 2] = bc[2];
  }
  // lone specks
  for (let y = 0; y < g.GH; y++) for (let x = 0; x < g.GW; x++) {
    const o = (y * g.GW + x) * 4; if (!g.c[o + 3]) continue;
    let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(g, x + dx, y + dy)) n++;
    if (!n) g.c[o + 3] = 0;
  }
}
export const at = (g, x, y) => x >= 0 && y >= 0 && x < g.GW && y < g.GH && g.c[(y * g.GW + x) * 4 + 3] ? (y * g.GW + x) * 4 : 0;
export const rgbAt = (g, x, y) => { const o = (y * g.GW + x) * 4; return [g.c[o], g.c[o + 1], g.c[o + 2], g.c[o + 3]]; };

/** Move a grid by whole cells. */
export function shifted(g, dx, dy) {
  const c = new Uint8Array(g.c.length);
  for (let y = 0; y < g.GH; y++) for (let x = 0; x < g.GW; x++) {
    const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= g.GW || Y >= g.GH) continue;
    c.set(g.c.subarray((y * g.GW + x) * 4, (y * g.GW + x) * 4 + 4), (Y * g.GW + X) * 4);
  }
  return { GW: g.GW, GH: g.GH, c };
}

/* ── colour classes ───────────────────────────────────────────────────── */

export function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function cls(r, g, b) {
  const [h, s, l] = hsl(r, g, b);
  if (h >= 70 && h <= 170 && s > 0.2 && l > 0.08) return "green";
  if (h >= 245 && h <= 310 && s > 0.15 && l > 0.12) return "violet";
  if (l < 0.2) return "dark";
  if (h >= 195 && h <= 240 && s > 0.2) return "blue";
  if (h >= 8 && h <= 40 && s > 0.3 && l >= 0.42 && l <= 0.88) return "skin";
  if (h <= 45 && l < 0.42 && s > 0.15) return "brown";
  if (l > 0.72 && h >= 30 && h <= 70) return "cream";
  return "other";
}
export const clsAt = (g, x, y) => { const o = (y * g.GW + x) * 4; return g.c[o + 3] ? cls(g.c[o], g.c[o + 1], g.c[o + 2]) : "clear"; };

/* ── shapes and frames ────────────────────────────────────────────────── */

export function components(g) {
  const lab = new Int32Array(g.GW * g.GH).fill(-1), comps = [];
  for (let i = 0; i < g.GW * g.GH; i++) {
    if (!g.c[i * 4 + 3] || lab[i] >= 0) continue;
    const id = comps.length, st = [i], mem = []; lab[i] = id;
    while (st.length) {
      const q = st.pop(); mem.push(q); const qx = q % g.GW, qy = (q / g.GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = qx + dx, Y = qy + dy; if (X < 0 || Y < 0 || X >= g.GW || Y >= g.GH) continue;
        const j = Y * g.GW + X; if (g.c[j * 4 + 3] && lab[j] < 0) { lab[j] = id; st.push(j); }
      }
    }
    comps.push({ mem, cx: mem.reduce((t, q) => t + (q % g.GW), 0) / mem.length });
  }
  return comps;
}

/** Column spans of the figures, split at the emptiest column until there are `want`. */
export function spansOf(g, want) {
  const colN = x => { let n = 0; for (let y = 0; y < g.GH; y++) if (g.c[(y * g.GW + x) * 4 + 3]) n++; return n; };
  const spans = []; let s0 = -1;
  for (let x = 0; x <= g.GW; x++) { const h = x < g.GW && colN(x) > 0; if (h && s0 < 0) s0 = x; if (!h && s0 >= 0) { if (x - s0 > 8) spans.push([s0, x - 1]); s0 = -1; } }
  while (spans.length < want) {
    let wi = 0; spans.forEach((sp, i) => { if (sp[1] - sp[0] > spans[wi][1] - spans[wi][0]) wi = i; });
    const [a, b] = spans[wi]; let bx = -1, bc = 1e9;
    for (let x = a + 25; x <= b - 25; x++) { const c = colN(x); if (c < bc) { bc = c; bx = x; } }
    if (bx < 0) break;
    spans.splice(wi, 1, [a, bx - 1], [bx, b]);
  }
  return spans;
}

/** Cells (indices) of each figure: whole shapes go to the span holding their centre. */
export function figures(g, spans) {
  const out = spans.map(() => []);
  for (const c of components(g)) {
    if (c.mem.length < 3) continue;
    let k = spans.findIndex(([a, b]) => c.cx >= a - 1 && c.cx <= b + 1);
    if (k < 0) k = spans.reduce((bi, sp, i) => Math.abs((sp[0] + sp[1]) / 2 - c.cx) < Math.abs((spans[bi][0] + spans[bi][1]) / 2 - c.cx) ? i : bi, 0);
    out[k].push(...c.mem);
  }
  return out.map(mem => new Set(mem));
}

export function bbox(g, set) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const i of set) { const x = i % g.GW, y = (i / g.GW) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}

/** A cropped RGBA image of the cells in `set`. */
export function crop(g, set) {
  const b = bbox(g, set), w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (const i of set) { const x = i % g.GW, y = (i / g.GW) | 0; buf.set(g.c.subarray(i * 4, i * 4 + 4), ((y - b.y0) * w + (x - b.x0)) * 4); }
  return { buf, w, h, x0: b.x0, y0: b.y0 };
}
