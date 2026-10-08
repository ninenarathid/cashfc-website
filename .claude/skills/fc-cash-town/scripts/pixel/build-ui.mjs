// The town's own skin for its HUD and menus: sheets of flat UI pieces (work/out/ui-kit-*.png, prompts/ui/) cut to
// their true pixels, each piece made a nine-slice a browser can stretch to any size (CSS border-image).
//
//   node build-ui.mjs [--out <tree>/lib/town] [--look <out.png>]
//
// The owner, 2026-10-09, of menus that were the web site's navy glass over the pixel map: "ควร gen ภาพมาใช้ยังไงให้ดูเป็น
// เกมส์ ที่ professional มากขึ้น", and of wood, parchment and iron studs shown him in a mock, "แบบนี้ดีแล้ว".
//
// What the model draws is never a clean frame: its edges wander by a pixel and its rim is not the same on four sides.
// So of each piece only the four corners are kept as drawn; each edge is one row (or column) of the drawing, taken at
// the piece's middle, and the middle is one colour. The piece that comes out is (2c + 1) pixels a side for a corner
// of c, some 350 bytes, and is written into lib/town/ui-kit.json as a data: address: components/town/TownSkin.ts
// makes the CSS of it. Nothing is fetched for the skin.
//
// A piece that is another's with its colours moved (the wooden button is the dark plate, lighter) is made here and
// not drawn: `from` and `lift`.
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const OUT = path.join(HERE, "work", "out");
const TO = path.resolve(arg("--out") ?? path.join(HERE, "..", "..", "..", "..", "..", "lib", "town"));

/** [sheet, the pieces from left to right, { range: where to look for the pixel size, corner: cells kept at each corner }] */
const SHEETS = [
  ["ui-kit-a", ["window", "plate", "slot", "slotOn", "btn", "btnDown"], { range: [6, 12], corner: 7 }],
];
/** Pieces made of another: every colour lifted (above 1) or sunk, the outline left as it is. */
const MADE = [
  ["btnWood", "plate", 1.34],
  ["btnWoodDown", "plate", 1.08],
];

const pieces = {};
const looks = [];
for (const [sheet, names, opts] of SHEETS) {
  const file = path.join(OUT, `${sheet}.png`);
  if (!fs.existsSync(file)) throw new Error(`no ${sheet}.png in work/out: draw it first (prompts/ui/${sheet}.txt)`);
  const raw = await L.loadRaw(file), grid = L.detectGrid(raw, undefined, opts.range), g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], 32));
  const parts = L.components(g).filter((c) => c.mem.length >= 30).map((c) => L.bbox(g, new Set(c.mem))).sort((a, b) => a.x0 - b.x0);
  if (parts.length !== names.length) throw new Error(`${sheet}: ${parts.length} pieces found, ${names.length} named`);
  const px = (x, y) => { const o = (y * g.GW + x) * 4; return [g.c[o], g.c[o + 1], g.c[o + 2], g.c[o + 3] ? 255 : 0]; };
  console.log(`${sheet}: pixel size ${grid.p.toFixed(2)}`);
  for (const [i, b] of parts.entries()) {
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1, c = Math.min(opts.corner, Math.floor((Math.min(w, h) - 1) / 2));
    const S = 2 * c + 1, cells = new Uint8Array(S * S * 4), mx = b.x0 + (w >> 1), my = b.y0 + (h >> 1);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const sx = x < c ? b.x0 + x : x > c ? b.x1 - (S - 1 - x) : mx, sy = y < c ? b.y0 + y : y > c ? b.y1 - (S - 1 - y) : my;
      cells.set(px(sx, sy), (y * S + x) * 4);
    }
    // every corner cell on the piece's outer rim that the drawing left clear stays clear; anything clear inside is a hole
    for (let y = c; y <= c; y++) for (let x = 0; x < S; x++) if (!cells[(y * S + x) * 4 + 3]) throw new Error(`${names[i]}: a hole in its middle row`);
    pieces[names[i]] = { c, size: S, cells };
    console.log(`  ${names[i]}: ${w}x${h} as drawn, corner ${c}`);
  }
}
for (const [name, from, lift] of MADE) {
  const p = pieces[from]; if (!p) throw new Error(`${name}: no ${from}`);
  const cells = new Uint8Array(p.cells);
  for (let o = 0; o < cells.length; o += 4) {
    // (the dark outline is what holds the town's pieces together: it stays)
    if (cells[o] + cells[o + 1] + cells[o + 2] < 150) continue;
    for (let k = 0; k < 3; k++) cells[o + k] = Math.max(0, Math.min(255, Math.round(cells[o + k] * lift)));
  }
  pieces[name] = { c: p.c, size: p.size, cells };
}

const kit = { v: 1, scale: 2, pieces: {} };
for (const [name, p] of Object.entries(pieces)) {
  const png = await L.sharp(Buffer.from(p.cells), { raw: { width: p.size, height: p.size, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toBuffer();
  const o = ((p.size >> 1) * p.size + (p.size >> 1)) * 4;
  kit.pieces[name] = { c: p.c, mid: "#" + [p.cells[o], p.cells[o + 1], p.cells[o + 2]].map((v) => v.toString(16).padStart(2, "0")).join(""), uri: `data:image/png;base64,${png.toString("base64")}` };
  looks.push({ name, png, size: p.size });
}
fs.writeFileSync(path.join(TO, "ui-kit.json"), JSON.stringify(kit, null, 1) + "\n");
console.log(`${Object.keys(kit.pieces).length} pieces -> ${path.join(TO, "ui-kit.json")} (${fs.statSync(path.join(TO, "ui-kit.json")).size} bytes)`);

// (to look at: every piece eight times its size, and stretched as a frame of 30 by 14 cells)
const look = arg("--look");
if (look) {
  const comp = []; let x = 8;
  for (const l of looks) {
    comp.push({ input: await L.sharp(l.png).resize({ width: l.size * 8, kernel: "nearest" }).png().toBuffer(), left: x, top: 8 });
    x += l.size * 8 + 8;
  }
  await L.sharp({ create: { width: x, height: looks[0].size * 8 + 16, channels: 3, background: "#2b3440" } }).composite(comp).png().toFile(look);
  console.log("->", look);
}
