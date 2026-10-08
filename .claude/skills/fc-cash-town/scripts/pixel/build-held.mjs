// What is held in the hand on the map: the long tools standing upright, and the small pictures of a gem's element
// about a tool. work/out/held-*.png -> public/town/held-<hash>.png + lib/town/held-art.json.
//
//   node build-held.mjs [--out <tree>]      (in a worktree, name the tree: the default writes into fcnext's)
//
// Every sheet is one row of pictures on a clear ground: `held-tools-a` eight tall tools (a pick, an axe, three hoes,
// an insect net, a sickle, shears), each upright with its head at the top turned to the right; `held-fx-<element>`
// six pictures of an element, three tiny ones and three big ones (its flourish, twice, and its grandest); and
// `held-fx-mix` what shows where two elements meet. The pictures of a row are not of one width, so a row is cut at
// its widest empty gaps (so many pictures, one gap fewer), and whatever lies between two gaps is one picture, in
// however many parts it was drawn (a ring of crystals, sparks over a flame).
//
// The JSON beside the code (imported by components/town/held.ts) says where each picture is: a tool with where its
// handle stands (the middle of its foot, from the left) and where its head is (the middle of its top part), in its
// own pixels; an element's six pictures in their order.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const at = process.argv.indexOf("--out"), TREE = at > 0 ? process.argv[at + 1] : "E:/NinenineProject/fcnext";
const OUT = path.join(HERE, "work", "out");

/** The long tools in the order they stand on their sheet, each with how much of its height (from the top) is its head. */
const TOOLS = [["pick", 0.2], ["axe", 0.24], ["hoe", 0.2], ["hoeIron", 0.2], ["hoeSteel", 0.2], ["bugNet", 0.38], ["sickle", 0.6], ["shears", 0.5]];
const ELEMENTS = ["fire", "water", "ice", "earth", "lightning", "wind", "light", "dark"];

/** A sheet's true pixels, in a palette of so many colours. */
async function cells(sheet, colours, range) {
  const file = path.join(OUT, `${sheet}.png`);
  if (!fs.existsSync(file)) return null;
  const raw = await L.loadRaw(file), grid = L.detectGrid(raw, undefined, range), g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], colours));
  return { g, pitch: grid.p };
}
/** A row of so many pictures, cut at its widest empty gaps: the cells of each, left to right. */
function row(g, want) {
  const full = new Uint8Array(g.GW);
  for (let i = 0; i < g.GW * g.GH; i++) if (g.c[i * 4 + 3]) full[i % g.GW] = 1;
  const gaps = [];
  let from = -1, first = -1, last = -1;
  for (let x = 0; x < g.GW; x++) if (full[x]) { if (first < 0) first = x; last = x; }
  for (let x = first; x <= last; x++) {
    if (!full[x]) { if (from < 0) from = x; continue; }
    if (from >= 0) { gaps.push([x - from, from, x]); from = -1; }
  }
  const cuts = gaps.sort((a, b) => b[0] - a[0]).slice(0, want - 1).map((c) => (c[1] + c[2]) / 2).sort((a, b) => a - b);
  const sets = Array.from({ length: cuts.length + 1 }, () => new Set());
  for (let i = 0; i < g.GW * g.GH; i++) if (g.c[i * 4 + 3]) { const x = i % g.GW; let k = 0; while (k < cuts.length && x > cuts[k]) k++; sets[k].add(i); }
  return sets;
}

const pieces = [];
// ── the long tools ──
{
  const sheet = await cells("held-tools-a", 40, [4, 12]);
  if (!sheet) console.log("no held-tools-a");
  else {
    const sets = row(sheet.g, TOOLS.length);
    if (sets.length !== TOOLS.length) throw new Error(`held-tools-a: ${sets.length} pictures found, ${TOOLS.length} wanted`);
    TOOLS.forEach(([name, top], k) => {
      const im = L.crop(sheet.g, sets[k]), solid = (x, y) => im.buf[(y * im.w + x) * 4 + 3] > 0;
      // where its handle stands: the middle of its lowest rows
      let sx = 0, n = 0;
      for (let y = Math.floor(im.h * 0.85); y < im.h; y++) for (let x = 0; x < im.w; x++) if (solid(x, y)) { sx += x + 0.5; n++; }
      // where its head is: the middle of its top part
      let hx = 0, hy = 0, m = 0;
      for (let y = 0; y < Math.ceil(im.h * top); y++) for (let x = 0; x < im.w; x++) if (solid(x, y)) { hx += x + 0.5; hy += y + 0.5; m++; }
      const round = (v) => Math.round(v * 10) / 10;
      pieces.push({ kind: "tool", name, img: im, more: [round(sx / n), round(hx / m), round(hy / m)] });
      console.log(`${name.padEnd(12)} ${im.w}x${im.h}  handle at ${round(sx / n)}, head at ${round(hx / m)},${round(hy / m)}  (grid ${sheet.pitch.toFixed(2)})`);
    });
  }
}
// ── the elements, and where two meet ──
for (const name of [...ELEMENTS, "mix"]) {
  const sheet = await cells(`held-fx-${name}`, 20, [8, 18]);
  if (!sheet) { console.log(`no held-fx-${name}`); continue; }
  const sets = row(sheet.g, 6);
  if (sets.length !== 6) throw new Error(`held-fx-${name}: ${sets.length} pictures found, 6 wanted`);
  sets.forEach((set, k) => {
    const im = L.crop(sheet.g, set);
    pieces.push({ kind: "fx", name, k, img: im });
  });
  console.log(`${name.padEnd(12)} ${sets.map((s) => { const im = L.crop(sheet.g, s); return `${im.w}x${im.h}`; }).join("  ")}  (grid ${sheet.pitch.toFixed(2)})`);
}

const PAD = 1, W = 256;
const all = [...pieces].sort((a, b) => b.img.h - a.img.h);
let x = PAD, y = PAD, rowH = 0;
for (const p of all) {
  if (x + p.img.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
  p.x = x; p.y = y; x += p.img.w + PAD; rowH = Math.max(rowH, p.img.h);
}
const H = y + rowH + PAD;
const buf = Buffer.alloc(W * H * 4);
for (const p of all) for (let r = 0; r < p.img.h; r++) p.img.buf.copy(buf, ((p.y + r) * W + p.x) * 4, r * p.img.w * 4, (r + 1) * p.img.w * 4);
const png = await L.sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10), pub = path.join(TREE, "public", "town");
const fx = {};
for (const p of pieces) if (p.kind === "fx") (fx[p.name] ??= [])[p.k] = [p.x, p.y, p.img.w, p.img.h];
const meta = {
  image: `/town/held-${hash}.png`, size: [W, H],
  tools: Object.fromEntries(pieces.filter((p) => p.kind === "tool").map((p) => [p.name, [p.x, p.y, p.img.w, p.img.h, ...p.more]])),
  fx,
};
for (const f of fs.readdirSync(pub)) if (/^held-[0-9a-f]{10}\.png$/.test(f) && f !== `held-${hash}.png`) fs.unlinkSync(path.join(pub, f));
fs.writeFileSync(path.join(pub, `held-${hash}.png`), png);
fs.writeFileSync(path.join(TREE, "lib", "town", "held-art.json"), JSON.stringify(meta, null, 1) + "\n");
console.log(`wrote ${meta.image} ${W}x${H} (${(png.length / 1024).toFixed(1)} KB), ${pieces.length} pictures`);
