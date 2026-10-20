// The pasture's animals: a gen.mjs sheet cut to its true pixels the way build-scenery.mjs cuts props (the grid found in
// the range given, one colour a cell, 64 colours), and each animal written alone as a picture of its own pixels, padded
// on a square canvas with its feet on the canvas's ground line: the first frame PixelLab animates (ART_WORKFLOW,
// "PixelLab"; docs/plans/animals/ART-NEEDED.md). A name beginning "_" (a scale holder such as a post) is not written.
//
//   node pasture-base.mjs <sheet> <lo-hi> <name,name,...> [--pad <canvas side>]
//
// Out: work/pasture/base/<name>.png (the canvas, transparent, the animal centred, its lowest row PAD_FOOT rows above the
// bottom) and work/pasture/base/<name>.json ({ w, h, side, x, y }: the animal's box on the canvas).
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const [sheet, range, list] = process.argv.slice(2);
const padArg = process.argv.indexOf("--pad");
const OUT = path.join(HERE, "work", "pasture", "base");
fs.mkdirSync(OUT, { recursive: true });
const names = list.split(",");
const [lo, hi] = range.split("-").map(Number);
const raw = await L.loadRaw(path.join(HERE, "work", "out", `${sheet}.png`));
const grid = L.detectGrid(raw, undefined, [lo, hi]);
const g = L.cellsOf(raw, grid);
L.snap(g, L.paletteOf([g], 64));
const figs = L.figures(g, L.spansOf(g, names.length));
console.log(`${sheet}: grid ${grid.p.toFixed(2)}, ${g.GW}x${g.GH} cells`);
names.forEach((name, k) => {
  const set = figs[k];
  if (!set) { console.log(`  ${name}: no figure`); return; }
  const im = L.crop(g, set);
  if (name.startsWith("_")) { console.log(`  ${name.padEnd(16)} ${im.w}x${im.h} (not written)`); return; }
  // a canvas a little larger than the animal, rounded up to 8, with room above for a hop and to the sides for a step
  const side = padArg > 0 ? +process.argv[padArg + 1] : Math.ceil((Math.max(im.w, im.h) * 1.35) / 8) * 8;
  const x = Math.floor((side - im.w) / 2), y = side - 2 - im.h;
  const buf = Buffer.alloc(side * side * 4);
  for (let r = 0; r < im.h; r++) im.buf.copy(buf, ((y + r) * side + x) * 4, r * im.w * 4, (r + 1) * im.w * 4);
  L.sharp(buf, { raw: { width: side, height: side, channels: 4 } }).png().toFile(path.join(OUT, `${name}.png`));
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ sheet, grid: +grid.p.toFixed(3), w: im.w, h: im.h, side, x, y }));
  console.log(`  ${name.padEnd(16)} ${im.w}x${im.h} on ${side}x${side}`);
});
