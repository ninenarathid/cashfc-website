// How each picture of a plant of more than one plot stands on its plots: finds the small soil mounds the plant grows out of
// (one a plot, icons-wide2-*), takes each mound's middle (the middle of its widest span, half its half-width above its
// lowest row: a mound is twice as wide as it is deep), and fits them to the plots' middles on the map by a scale and a move.
//
//   node measure-wide.mjs [--look <out.png>]     writes lib/town/wide-art.json (the tree this script is in)
//
// wide-art.json: { name: [k, x, y] }: k is screen px to one of the picture's at the map's scale 1, and (x, y) the point of
// the picture (its px from the top left) that stands on the middle of the footprint's plot middles (TownFarm's whole.x, y).
// So TownFarm draws it at mid − (x, y)·k·s, w·k·s by h·k·s; turned over, at mid.x − (w − x)·k·s.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "./pxlib.mjs";
import { SHAPES, screenOf } from "./plot-template.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../../../..");
const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/town/icon-atlas.json"), "utf8"));
const ROWS3 = ["BlueCorn", "LotusRootBed", "TrellisBerry"], ROWS2 = ["RowBean", "TeaBush", "RedOkra"];
const shapeOf = (name) => /Front[AB]$/.test(name) ? "front" : /Back[AB]$/.test(name) ? "back" : /Side[AB]$/.test(name) ? "side"
  : ROWS3.some((c) => name === `wide${c}A` || name === `wide${c}B`) ? "row3" : ROWS2.some((c) => name === `wide${c}A` || name === `wide${c}B`) ? "row2" : null;
const { data, info } = await L.sharp(path.join(ROOT, "public", atlas.image)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

/** Soil: a warm dark brown, not the lighter wood of a post or the cream of a root. */
function soil(r, g, b) {
  const [h, s, l] = L.hsl(r, g, b);
  return h >= 10 && h <= 42 && s >= 0.2 && l >= 0.08 && l <= 0.36;
}
/**
 * Mounds marked by eye on a 10-px grid (grid-view at 4x), where the soil runs together or a post or a root lies on it so
 * that the k-means split is off, or where more clumps than plots were drawn: each mound's middle, in the picture's px.
 */
const BY_EYE = {
  // rows (icons-wide3-a, -b): the two end mounds (a row of clumps drawn on more mounds than plots stands its end ones on the
  // end plots' middles)
  // (icons-wide4-a2, 2026-10-16: the ripe corn's soil runs together, and the trellis posts stand on the trellis berry's mounds)
  wideBlueCornB: [[29, 128], [119, 86]], wideTrellisBerryA: [[29, 119], [123, 78]], wideTrellisBerryB: [[30, 118], [122, 78]],
  wideRowBeanA: [[30, 128], [95, 92]], wideRowBeanB: [[40, 130], [105, 95]],
  wideTeaBushA: [[40, 108], [110, 75]], wideTeaBushB: [[45, 120], [110, 85]],
  wideRedOkraA: [[40, 128], [110, 92]], wideRedOkraB: [[45, 128], [110, 92]],
  // L's (icons-wide3-d; icons-wide2-c where its soil runs together): the corner's mound, then the arms' end mounds in the
  // shape's order (front: left, right; back: right, left; side: upper left, lower left)
  wideSunflowerPatchFrontA: [[75, 88], [20, 45], [130, 55]], wideSunflowerPatchFrontB: [[75, 92], [20, 47], [130, 57]],
  wideSunflowerPatchBackA: [[75, 62], [130, 90], [25, 90]], wideSunflowerPatchBackB: [[78, 62], [135, 92], [30, 92]],
  // (icons-wide4-c3, 2026-10-16: the back L's corner mound is half under the leaves; the side L's arms were drawn unevenly)
  wideBottleGourdBackA: [[71, 58], [123, 83], [20, 83]],
  wideBottleGourdSideA: [[88, 93], [18, 42], [23, 122]], wideBottleGourdSideB: [[88, 92], [18, 42], [23, 122]],
  wideSunflowerPatchSideA: [[88, 80], [20, 45], [25, 118]], wideSunflowerPatchSideB: [[90, 82], [20, 50], [35, 118]],
};
const out = {}, report = [];
function fit(name, shape, w, h, P, M, how) {
  const mean = (A, i) => A.reduce((t, p) => t + p[i], 0) / A.length;
  const pm = [mean(P, 0), mean(P, 1)], mm = [mean(M, 0), mean(M, 1)];
  let num = 0, den = 0;
  P.forEach((p, i) => { const dx = M[i][0] - mm[0], dy = M[i][1] - mm[1]; num += dx * (p[0] - pm[0]) + dy * (p[1] - pm[1]); den += dx * dx + dy * dy; });
  const k = num / den;
  const err = Math.sqrt(P.reduce((t, p, i) => t + (k * (M[i][0] - mm[0]) - (p[0] - pm[0])) ** 2 + (k * (M[i][1] - mm[1]) - (p[1] - pm[1])) ** 2, 0) / P.length);
  out[name] = [+k.toFixed(4), +mm[0].toFixed(2), +mm[1].toFixed(2)];
  report.push(`${name.padEnd(26)} ${shape.padEnd(5)} ${how.padEnd(6)} k ${k.toFixed(3)}  off by ${err.toFixed(1)} screen px (rms)  ${w}x${h} → ${(w * k).toFixed(0)}x${(h * k).toFixed(0)}`);
}

for (const name of Object.keys(atlas.icons).filter((n) => /^wide[A-Z]/.test(n)).sort()) {
  const shape = shapeOf(name);
  if (!shape) continue;
  const [ax, ay, w, h] = atlas.icons[name], plots = SHAPES[shape].map(screenOf);
  const is = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return false; const o = ((ay + y) * info.width + ax + x) * 4; return data[o + 3] > 0 && soil(data[o], data[o + 1], data[o + 2]); };
  if (BY_EYE[name]) {
    let P = plots, M = BY_EYE[name];
    // (a row's plots run from the upper right: its mounds are marked from the lower left)
    if (shape === "row3" || shape === "row2") M = [...M].sort((u, v) => u[1] - v[1]);
    if (M.length !== plots.length) P = [plots[0], plots[plots.length - 1]];
    fit(name, shape, w, h, P, M, "by eye");
    continue;
  }
  // the soil of the mounds: soil px in a run of at least six across (a post or a stem is narrower), split into as many
  // mounds as the shape has plots by k-means, started from the shape's own plots laid over the soil's extent
  const px = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!is(x, y)) continue;
    let a = x, b = x; while (is(a - 1, y)) a--; while (is(b + 1, y)) b++;
    if (b - a + 1 >= 6) px.push([x, y]);
  }
  if (px.length < 30 * plots.length) { report.push(`${name}: too little soil (${px.length} px): not measured`); continue; }
  const bx0 = Math.min(...px.map(([x]) => x)), bx1 = Math.max(...px.map(([x]) => x)), by0 = Math.min(...px.map(([, y]) => y)), by1 = Math.max(...px.map(([, y]) => y));
  const ex0 = Math.min(...plots.map(([x]) => x)), ex1 = Math.max(...plots.map(([x]) => x)), ey0 = Math.min(...plots.map(([, y]) => y)), ey1 = Math.max(...plots.map(([, y]) => y));
  let cs = plots.map(([x, y]) => [bx0 + 8 + (ex1 > ex0 ? (x - ex0) / (ex1 - ex0) : 0.5) * (bx1 - bx0 - 16), by0 + 4 + (ey1 > ey0 ? (y - ey0) / (ey1 - ey0) : 0.5) * (by1 - by0 - 8)]);
  let part = [];
  for (let it = 0; it < 30; it++) {
    part = plots.map(() => []);
    for (const p of px) { let best = 0, bd = Infinity; cs.forEach((c, i) => { const d = (p[0] - c[0]) ** 2 + (2 * (p[1] - c[1])) ** 2; if (d < bd) { bd = d; best = i; } }); part[best].push(p); }
    cs = part.map((m, i) => m.length ? [m.reduce((t, p) => t + p[0], 0) / m.length, m.reduce((t, p) => t + p[1], 0) / m.length] : cs[i]);
  }
  if (part.some((m) => m.length < 20)) { report.push(`${name}: a mound not found: not measured`); continue; }
  // a mound's middle: the middle of its widest row, half its half-width above its lowest row
  const mounds = part.map((m) => {
    const rows = new Map(); for (const [x, y] of m) { const r = rows.get(y) ?? [x, x]; rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]); }
    let wide = null; for (const [y, [a, b]] of rows) if (!wide || b - a > wide[2] - wide[1]) wide = [y, a, b];
    const low = Math.max(...m.map(([, y]) => y));
    return [(wide[1] + wide[2] + 1) / 2, low + 1 - (wide[2] - wide[1] + 1) / 4];
  });
  // (each mound is paired with the plot it was started from)
  const P = plots, M = mounds;
  fit(name, shape, w, h, P, M, "found");
}
fs.writeFileSync(path.join(ROOT, "lib/town/wide-art.json"), JSON.stringify(out, null, 1) + "\n");
console.log(report.join("\n"));

// --look: each picture with its mounds' middles (red) and where its plots' middles fall (cyan) after the fit
const look = process.argv.indexOf("--look");
if (look > 0) {
  const S = 3, tiles = [];
  for (const [name, [k, mx, my]] of Object.entries(out)) {
    const [ax, ay, w, h] = atlas.icons[name], plots = SHAPES[shapeOf(name)].map(screenOf);
    const pm = [plots.reduce((t, p) => t + p[0], 0) / plots.length, plots.reduce((t, p) => t + p[1], 0) / plots.length];
    const img = await L.sharp(path.join(ROOT, "public", atlas.image)).extract({ left: ax, top: ay, width: w, height: h }).resize({ width: w * S, height: h * S, kernel: "nearest" }).png().toBuffer();
    const dia = plots.map(([px, py]) => { const cx = (mx + (px - pm[0]) / k) * S, cy = (my + (py - pm[1]) / k) * S, hw = 32 / k * S, hh = 16 / k * S; return `<polygon points="${cx - hw},${cy} ${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh}" fill="none" stroke="#0ff" stroke-width="2"/>`; }).join("");
    const svg = Buffer.from(`<svg width="${w * S}" height="${h * S}">${dia}</svg>`);
    tiles.push({ name, buf: await L.sharp(img).composite([{ input: svg }]).png().toBuffer(), w: w * S, h: h * S });
  }
  const cols = 4, cw = Math.max(...tiles.map((t) => t.w)) + 10, ch = Math.max(...tiles.map((t) => t.h)) + 30;
  const comp = tiles.flatMap((t, i) => [{ input: t.buf, left: (i % cols) * cw, top: Math.floor(i / cols) * ch }, { input: Buffer.from(`<svg width="${cw}" height="20"><text x="2" y="14" font-size="13" fill="#fff" font-family="Arial">${t.name}</text></svg>`), left: (i % cols) * cw, top: Math.floor(i / cols) * ch + t.h + 4 }]);
  await L.sharp({ create: { width: cols * cw, height: Math.ceil(tiles.length / cols) * ch, channels: 4, background: "#3a3040" } }).composite(comp).png().toFile(process.argv[look + 1]);
  console.log(`wrote ${process.argv[look + 1]}`);
}
