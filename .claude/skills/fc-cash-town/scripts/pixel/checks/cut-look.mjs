// Sheets side by side as the game will show them: each cut to its pixel grid the way the builders do (one colour a
// cell, 64 colours), with how clean the drawing was before the cut. For choosing between two drawings of one thing
// (a prompt before and after Codex read it, the same call at two quality settings): the README, "Codex reads a prompt".
//   node checks/cut-look.mjs <out.png> <lo-hi> [--crop x,y,w,h] <label=file> ...
// <lo-hi> is where to look for the pixel size (4.5-7.5 for scenery). The pixel size of an icon sheet has to be found
// by eye first (work/icon-pitch2.mjs, work/icon-try.mjs): looked for freely it comes out at a half or a third.
import * as L from "../pxlib.mjs";
const argv = process.argv.slice(2), out = argv.shift(), [lo, hi] = argv.shift().split("-").map(Number);
let crop = null;
if (argv[0] === "--crop") { argv.shift(); crop = argv.shift().split(",").map(Number); }
const W = 760, tiles = [];
for (const a of argv) {
  const [label, file] = [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)];
  const raw = await L.loadRaw(file), grid = L.detectGrid(raw, undefined, [lo, hi]), g = L.cellsOf(raw, grid);
  // how much of each cell's middle is its one colour, and how many of the picture's edges lie on the grid's lines
  let pure = 0, cells = 0;
  for (let gy = 0; gy < g.GH; gy++) for (let gx = 0; gx < g.GW; gx++) {
    if (!g.c[(gy * g.GW + gx) * 4 + 3]) continue;
    const x0 = grid.phx + gx * grid.p, y0 = grid.phy + gy * grid.p, m = new Map(); let n = 0;
    for (let y = Math.ceil(y0 + grid.p * 0.2); y < y0 + grid.p * 0.8; y++) for (let x = Math.ceil(x0 + grid.p * 0.2); x < x0 + grid.p * 0.8; x++) {
      if (x >= raw.W || y >= raw.H) continue;
      const i = (y * raw.W + x) * 4, k = (raw.data[i] >> 3) << 10 | (raw.data[i + 1] >> 3) << 5 | raw.data[i + 2] >> 3;
      m.set(k, (m.get(k) ?? 0) + 1); n++;
    }
    if (n) { pure += Math.max(...m.values()) / n; cells++; }
  }
  let on = 0, all = 0;
  const d = raw.data, diff = (i, j) => Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) + Math.abs(d[i + 3] - d[j + 3]);
  for (let y = 1; y < raw.H; y++) for (let x = 1; x < raw.W; x++) {
    const i = (y * raw.W + x) * 4;
    if (d[i + 3] < 128 && d[i - 1] < 128) continue;
    if (diff(i, i - 4) > 60) { all++; const f = ((x - grid.phx) / grid.p) % 1, off = Math.min(Math.abs(f), 1 - Math.abs(f)) * grid.p; if (off <= 1) on++; }
  }
  const before = new Set(); for (let o = 0; o < g.c.length; o += 4) if (g.c[o + 3]) before.add(g.c[o] << 16 | g.c[o + 1] << 8 | g.c[o + 2]);
  L.snap(g, L.paletteOf([g], 64));
  console.log(`${label}: pitch ${grid.p.toFixed(2)}, ${g.GW}x${g.GH} cells, a cell ${(pure / cells * 100).toFixed(0)}% one colour, ${(on / all * 100).toFixed(0)}% of edges on the grid, ${before.size} colours before the palette`);
  let img = L.sharp(Buffer.from(g.c), { raw: { width: g.GW, height: g.GH, channels: 4 } });
  if (crop) { const [x, y, w, h] = crop.map((v) => Math.round(v / grid.p)); img = img.extract({ left: Math.min(x, g.GW - 1), top: Math.min(y, g.GH - 1), width: Math.min(w, g.GW - x), height: Math.min(h, g.GH - y) }); }
  const cut = await img.png().toBuffer();
  const tile = await L.sharp(cut).resize({ width: W, kernel: "nearest" }).flatten({ background: "#161b23" }).png().toBuffer();
  const meta = await L.sharp(tile).metadata();
  tiles.push({ label, tile, h: meta.height, note: `pitch ${grid.p.toFixed(2)} · ${g.GW}×${g.GH} cells · cell ${(pure / cells * 100).toFixed(0)}% one colour · ${(on / all * 100).toFixed(0)}% edges on grid` });
}
const cols = Math.min(2, tiles.length), rows = Math.ceil(tiles.length / cols), H = Math.max(...tiles.map((t) => t.h)), PAD = 14, HEAD = 46;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const comp = [];
tiles.forEach((t, i) => {
  const x = PAD + (i % cols) * (W + PAD), y = PAD + Math.floor(i / cols) * (H + HEAD + PAD);
  comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HEAD}"><text x="0" y="18" font-family="Segoe UI, sans-serif" font-size="17" font-weight="700" fill="#f2efe6">${esc(t.label)}</text><text x="0" y="38" font-family="Segoe UI, sans-serif" font-size="13" fill="#a9b3c1">${esc(t.note)}</text></svg>`), left: x, top: y });
  comp.push({ input: t.tile, left: x, top: y + HEAD });
});
await L.sharp({ create: { width: PAD + cols * (W + PAD), height: PAD + rows * (H + HEAD + PAD), channels: 3, background: "#0d1117" } }).composite(comp).png().toFile(out);
console.log("->", out);
