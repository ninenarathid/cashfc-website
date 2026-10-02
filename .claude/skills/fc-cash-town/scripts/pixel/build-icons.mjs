// Cash Town's icons: AI sheets in work/out -> public/town/icons-<hash>.png + lib/town/icon-atlas.json.
//
//   node build-icons.mjs
//
// The owner's call (2026-10-02): every icon in Cash Town is pixel art made for
// it, no emoji ("จะได้ดูไม่เหมือน AI ทำ"). Each sheet is one row of icons drawn on
// a 16-pixel grid and scaled up; the true pixels are found, each icon cut out,
// and all of them packed into one small picture. The JSON beside the code
// (not in public/) is imported by components/town/TownIcon.tsx, so an icon
// needs no fetch before it shows.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = path.join(HERE, "work", "out");
const PUB = "E:/NinenineProject/fcnext/public/town";
const JSON_OUT = "E:/NinenineProject/fcnext/lib/town/icon-atlas.json";

// [sheet, names] in the order they stand on the sheet, left to right
const SHEETS = [
  ["icons-a", ["mic", "muted", "speaker", "micSettings", "warning", "signal"]],
  ["icons-b", ["wardrobe", "stats", "fullscreen", "exitFullscreen", "leave", "close"]],
  ["icons-c", ["zoomIn", "zoomOut", "recenter", "people", "walk", "away"]],
  ["icons-d", ["chat", "history", "down", "chevron", "check", "lock"]],
  ["icons-e", ["dice", "turnLeft", "turnRight", "town", "vote", "hammer"]],
  ["icons-f", ["music", "musicOff", "volumeLow", "volumeHigh"]],
  ["icons-sky", ["dawn", "morning", "noon", "afternoon", "dusk", "evening", "night"]],
];

const pieces = [];
for (const [sheet, names] of SHEETS) {
  const file = path.join(OUT, `${sheet}.png`);
  if (!fs.existsSync(file)) { console.log(`no ${sheet}`); continue; }
  const raw = await L.loadRaw(file);
  // icons on a 16-pixel grid fill about 180 of the sheet's pixels: big true pixels
  const grid = L.detectGrid(raw, undefined, [6, 16]);
  const g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], 48));
  // The icons stand evenly spaced, and some are in parts (corner brackets, footprints):
  // every piece goes to the column its middle is in, not to the nearest gap.
  const parts = L.components(g).filter((c) => c.mem.length >= 2);
  const xs = parts.flatMap((c) => c.mem.map((i) => i % g.GW));
  const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, col = (x1 - x0) / names.length;
  const figs = names.map(() => new Set());
  for (const c of parts) {
    const mid = c.mem.reduce((t, i) => t + (i % g.GW), 0) / c.mem.length;
    for (const i of c.mem) figs[Math.min(names.length - 1, Math.floor((mid - x0) / col))].add(i);
  }
  names.forEach((name, k) => {
    const set = figs[k];
    if (!set || !set.size) { console.log(`  ${name}: nothing found`); return; }
    const im = L.crop(g, set);
    pieces.push({ name, img: im });
    console.log(`${name.padEnd(15)} ${im.w}x${im.h}  (grid ${grid.p.toFixed(2)})`);
  });
}

const PAD = 1, W = 256;
const all = [...pieces].sort((a, b) => b.img.h - a.img.h);
let x = PAD, y = PAD, rowH = 0;
for (const p of all) {
  if (x + p.img.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
  p.x = x; p.y = y; x += p.img.w + PAD; rowH = Math.max(rowH, p.img.h);
}
const H = y + rowH + PAD;
const sheet = Buffer.alloc(W * H * 4);
for (const p of all) for (let r = 0; r < p.img.h; r++) p.img.buf.copy(sheet, ((p.y + r) * W + p.x) * 4, r * p.img.w * 4, (r + 1) * p.img.w * 4);
const png = await L.sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10);
const meta = {
  image: `/town/icons-${hash}.png`, size: [W, H],
  icons: Object.fromEntries(pieces.map((p) => [p.name, [p.x, p.y, p.img.w, p.img.h]])),
};
for (const f of fs.readdirSync(PUB)) if (/^icons-[0-9a-f]{10}\.png$/.test(f) && `/town/${f}` !== meta.image) fs.unlinkSync(path.join(PUB, f));
fs.writeFileSync(path.join(PUB, path.basename(meta.image)), png);
fs.writeFileSync(JSON_OUT, JSON.stringify(meta, null, 1) + "\n");
console.log(`wrote ${meta.image} ${W}x${H} (${(png.length / 1024).toFixed(1)} KB), ${pieces.length} icons`);
