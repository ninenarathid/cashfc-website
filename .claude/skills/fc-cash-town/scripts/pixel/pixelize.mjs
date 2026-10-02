// AI "pixel art" sheet -> true pixel frames.
// node pixelize.mjs <in.png> <outPrefix> [colours=40] [frames=auto]
// 1. alpha snapped to 0/255; 2. grid period + phase from the colour-edge comb;
// 3. mode colour per cell; 4. one shared palette (median cut) for the sheet;
// 5. frames split at empty columns, aligned on the ground line and the head's centre.
import { createRequire } from "node:module";
const require = createRequire("E:/NinenineProject/fcnext/package.json");
const sharp = require("sharp");
import fs from "node:fs";

const [inp, outPrefix, kArg = "40"] = process.argv.slice(2);
const K = +kArg;
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const A = (x, y) => data[(y * W + x) * 4 + 3] >= 128;
const diff = (i, j) => Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2])
  + Math.abs(data[i + 3] - data[j + 3]);

// 1-D edge signals
const ex = new Float64Array(W), ey = new Float64Array(H);
for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) {
  const i = (y * W + x) * 4;
  if (data[i + 3] < 128 && data[i - 1] < 128) continue;
  const dx = diff(i, i - 4), dy = diff(i, i - W * 4);
  if (dx > 60) ex[x] += 1;
  if (dy > 60) ey[y] += 1;
}
function comb(sig) {
  // on-grid edges minus edges halfway between grid lines, so a multiple of the true period loses
  const at = k => { const r = Math.round(k); return sig[r] ?? 0; };
  let best = { score: -1e9 };
  for (let p = 3; p <= 14; p += 0.01) for (let ph = 0; ph < p; ph += 0.25) {
    let on = 0, mid = 0, n = 0;
    for (let k = ph; k < sig.length - p; k += p) { on += at(k); mid += at(k + p / 2); n++; }
    const score = (on - mid) / n;
    if (score > best.score) best = { p, ph, score };
  }
  return best;
}
// fit the period on x and y together, phases separately
const bx = comb(ex), by = comb(ey);
const SQUARE = process.env.SQUARE === "1"; let p = (bx.p + by.p) / 2; const G = process.env.GRID; if (G === "x") p = bx.p; else if (G) p = +G; const pX = (SQUARE || G) ? p : bx.p, pY = (SQUARE || G) ? p : by.p;
// refine phases with the shared period
function phase(sig, p) { let best = { s: -1e9 }; for (let ph = 0; ph < p; ph += 0.1) { let s = 0, n = 0; for (let k = ph; k < sig.length - p; k += p) { s += (sig[Math.round(k)] ?? 0) - (sig[Math.round(k + p / 2)] ?? 0); n++; } if (s / n > best.s) best = { s: s / n, ph }; } return best.ph; }
const phx = phase(ex, pX), phy = phase(ey, pY);
console.log(`grid x ${bx.p.toFixed(2)} y ${by.p.toFixed(2)} -> ${p.toFixed(2)}  phase ${phx.toFixed(1)},${phy.toFixed(1)}`);

const GW = Math.floor((W - phx) / pX), GH = Math.floor((H - phy) / pY);
const cells = new Uint8Array(GW * GH * 4);
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  const x0 = phx + gx * pX, y0 = phy + gy * pY;
  const m = new Map(); let opaque = 0, tot = 0;
  for (let y = Math.ceil(y0 + pY * 0.2); y < y0 + pY * 0.8; y++) for (let x = Math.ceil(x0 + pX * 0.2); x < x0 + pX * 0.8; x++) {
    if (x >= W || y >= H) continue;
    const i = (y * W + x) * 4; tot++;
    if (data[i + 3] < 128) continue; opaque++;
    const key = (data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | data[i + 2] >> 3;
    const e = m.get(key) ?? [0, 0, 0, 0]; e[0]++; e[1] += data[i]; e[2] += data[i + 1]; e[3] += data[i + 2]; m.set(key, e);
  }
  if (!tot || opaque * 2 < tot) continue;
  let b = null; for (const e of m.values()) if (!b || e[0] > b[0]) b = e;
  const o = (gy * GW + gx) * 4;
  cells[o] = b[1] / b[0]; cells[o + 1] = b[2] / b[0]; cells[o + 2] = b[3] / b[0]; cells[o + 3] = 255;
}

// shared palette by median cut
const px = []; for (let i = 0; i < cells.length; i += 4) if (cells[i + 3]) px.push([cells[i], cells[i + 1], cells[i + 2]]);
let boxes = [px];
while (boxes.length < K) {
  boxes.sort((a, b) => b.length - a.length);
  let split = -1, bi = -1;
  for (let k = 0; k < boxes.length; k++) {
    const bx = boxes[k]; if (bx.length < 2) continue;
    const r = [0, 1, 2].map(c => Math.max(...bx.map(q => q[c])) - Math.min(...bx.map(q => q[c])));
    const s = Math.max(...r) * Math.sqrt(bx.length); if (s > split) { split = s; bi = k; }
  }
  if (bi < 0) break;
  const bx = boxes[bi];
  const r = [0, 1, 2].map(c => Math.max(...bx.map(q => q[c])) - Math.min(...bx.map(q => q[c])));
  const c = r.indexOf(Math.max(...r));
  bx.sort((a, b) => a[c] - b[c]);
  boxes.splice(bi, 1, bx.slice(0, bx.length >> 1), bx.slice(bx.length >> 1));
}
const pal = boxes.filter(b => b.length).map(b => [0, 1, 2].map(c => Math.round(b.reduce((s, q) => s + q[c], 0) / b.length)));
for (let i = 0; i < cells.length; i += 4) if (cells[i + 3]) {
  let bd = 1e9, bc = null;
  for (const c of pal) { const d = (c[0] - cells[i]) ** 2 * 2 + (c[1] - cells[i + 1]) ** 2 * 4 + (c[2] - cells[i + 2]) ** 2 * 3; if (d < bd) { bd = d; bc = c; } }
  cells[i] = bc[0]; cells[i + 1] = bc[1]; cells[i + 2] = bc[2];
}
// drop specks: opaque cells with no opaque 4-neighbour
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  const o = (gy * GW + gx) * 4; if (!cells[o + 3]) continue;
  const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const X = gx + dx, Y = gy + dy; return X >= 0 && Y >= 0 && X < GW && Y < GH && cells[(Y * GW + X) * 4 + 3]; }).length;
  if (!n) cells[o + 3] = 0;
}

// frames: split at runs of empty columns
const colHas = [...Array(GW)].map((_, x) => { for (let y = 0; y < GH; y++) if (cells[(y * GW + x) * 4 + 3]) return true; return false; });
const spans = []; let s0 = -1;
for (let x = 0; x <= GW; x++) { const h = x < GW && colHas[x]; if (h && s0 < 0) s0 = x; if (!h && s0 >= 0) { if (x - s0 > 8) spans.push([s0, x - 1]); s0 = -1; } }
const WANT = +(process.env.FRAMES || 0);
const colCount = x => { let c = 0; for (let y = 0; y < GH; y++) if (cells[(y * GW + x) * 4 + 3]) c++; return c; };
while (WANT && spans.length < WANT) {
  // split the widest span at its emptiest column away from the edges
  let wi = 0; spans.forEach((sp, i) => { if (sp[1] - sp[0] > spans[wi][1] - spans[wi][0]) wi = i; });
  const [a, b] = spans[wi]; let bx = -1, bc = 1e9;
  for (let x = a + 25; x <= b - 25; x++) { const c = colCount(x); if (c < bc) { bc = c; bx = x; } }
  if (bx < 0) break;
  spans.splice(wi, 1, [a, bx - 1], [bx, b]);
}
// whole connected shapes go to the span holding their centre, so a split never cuts a figure
const lab = new Int32Array(GW * GH).fill(-1); const comps = [];
for (let i = 0; i < GW * GH; i++) {
  if (!cells[i * 4 + 3] || lab[i] >= 0) continue;
  const id = comps.length, st = [i], mem = []; lab[i] = id;
  while (st.length) { const c = st.pop(); mem.push(c); const cx = c % GW, cy = (c / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = cx + dx, Y = cy + dy;
      if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue; const j = Y * GW + X;
      if (cells[j * 4 + 3] && lab[j] < 0) { lab[j] = id; st.push(j); } } }
  comps.push({ mem, cx: mem.reduce((t, c) => t + (c % GW), 0) / mem.length });
}
const members = spans.map(() => []);
for (const c of comps) { let k = spans.findIndex(([a, b]) => c.cx >= a && c.cx <= b + 1);
  if (k < 0) k = spans.reduce((bi, sp, i) => Math.abs((sp[0] + sp[1]) / 2 - c.cx) < Math.abs((spans[bi][0] + spans[bi][1]) / 2 - c.cx) ? i : bi, 0);
  members[k].push(...c.mem); }
const frames = members.map(mem => {
  const xs = mem.map(c => c % GW), ys = mem.map(c => (c / GW) | 0);
  const a = Math.min(...xs), b = Math.max(...xs), top = Math.min(...ys), bot = Math.max(...ys);
  let sx = 0, n = 0; const lim = top + (bot - top) * 0.4;
  mem.forEach((c, i) => { if (ys[i] < lim) { sx += xs[i]; n++; } });
  return { mem, a, b, top, bot, hx: process.env.ALIGN === 'bbox' ? (a + b) / 2 : sx / n };
});
const FW = Math.max(...frames.map(f => f.b - f.a + 1)) + 6;
const FH = Math.max(...frames.map(f => f.bot - f.top + 1)) + 4;
console.log(`cells ${GW}x${GH}, ${pal.length} colours, ${frames.length} frames, frame box ${FW}x${FH}`, frames.map(f => `${f.b - f.a + 1}x${f.bot - f.top + 1}`).join(" "));
const strip = Buffer.alloc(FW * frames.length * FH * 4);
const SW = FW * frames.length;
frames.forEach((f, k) => {
  const offX = Math.round(FW / 2 - (f.hx - f.a)), offY = FH - 2 - (f.bot - f.top + 1);
  for (const c of f.mem) { const x = c % GW, y = (c / GW) | 0, o = c * 4;
    const X = k * FW + offX + (x - f.a), Y = offY + (y - f.top);
    if (X < k * FW || X >= (k + 1) * FW || Y < 0 || Y >= FH) continue;
    strip.set(cells.subarray(o, o + 4), (Y * SW + X) * 4); }
});
await sharp(strip, { raw: { width: SW, height: FH, channels: 4 } }).png().toFile(`${outPrefix}-strip.png`);
await sharp(await sharp(strip, { raw: { width: SW, height: FH, channels: 4 } }).resize(SW * 4, FH * 4, { kernel: "nearest" }).png().toBuffer())
  .flatten({ background: "#2a2f3a" }).png().toFile(`${outPrefix}-strip-x4.png`);
fs.writeFileSync(`${outPrefix}.json`, JSON.stringify({ frameW: FW, frameH: FH, frames: frames.length, colours: pal.length, grid: +p.toFixed(3), sizes: frames.map(f => [f.b - f.a + 1, f.bot - f.top + 1]) }));
