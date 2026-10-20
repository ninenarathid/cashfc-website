// One picture of every pasture look as the species' sheets will have it (pasture-frames.mjs's lookFrames: tidied,
// the back view mirrored, each loop on its ground point): a row a look, its SE walk and idle, then its NE walk and idle,
// every frame on a ground line at the look's size in the game (its scale times its kind's ANIMAL_K) times `zoom`.
//
//   node checks/pasture-looks.mjs [out.png] [--zoom 3] [--only chicken|duck|sheep|cow] [--looks a,b,c]
import fs from "node:fs";
import path from "node:path";
import { lookFrames, lookOf } from "../pasture-frames.mjs";
import * as L from "../pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const args = process.argv.slice(2), opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const out = args[0] && !args[0].startsWith("--") ? args[0] : path.join(HERE, "..", "work", "pasture", "contact-looks.png");
const zoom = +opt("--zoom", 3), only = opt("--only", undefined), pick = opt("--looks", "")?.split(",").filter(Boolean);
const K = { chicken: 0.6, duck: 0.6, sheep: 0.5, cow: 0.5 };
const { pieces } = await lookFrames(only);
const chars = JSON.parse(fs.readFileSync(path.join(HERE, "..", "work", "pasture", "chars.json"), "utf8"));
const rows = [];
for (const look of Object.keys(chars)) {
  if (pick.length && !pick.includes(look)) continue;
  const who = lookOf(look);
  if (!who || (only && who.species !== only)) continue;
  const mine = pieces.filter((p) => p.name.startsWith(`${who.prefix}_`) && /_(SE|NE)_(walk|idle)_\d+$/.test(p.name));
  if (!mine.length) continue;
  const cells = [];
  for (const v of ["SE", "NE"]) for (const a of ["walk", "idle"]) {
    const loop = mine.filter((p) => p.name.startsWith(`${who.prefix}_${v}_${a}_`));
    cells.push(...loop, null);
  }
  rows.push({ look, species: who.species, cells });
}
// each frame drawn at its game size (nearest), standing on the row's ground line
const S = (p, sp) => zoom * K[sp] * (p.k ?? 1);
let W = 0, y = 0;
const comp = [];
for (const r of rows) {
  const h = Math.ceil(Math.max(...r.cells.filter(Boolean).map((p) => p.ay * S(p, r.species)))) + 8;
  let x = 110;
  // a loop's frames each in a cell as wide as its widest, its ground point at the cell's middle (so a jump shows)
  const cw = Math.ceil(Math.max(...r.cells.filter(Boolean).map((p) => p.img.w * S(p, r.species)))) + 4;
  for (const p of r.cells) {
    if (!p) { x += 14; continue; }
    const s = S(p, r.species), w = Math.max(1, Math.round(p.img.w * s)), hh = Math.max(1, Math.round(p.img.h * s));
    const buf = await L.sharp(p.img.buf, { raw: { width: p.img.w, height: p.img.h, channels: 4 } }).resize({ width: w, height: hh, kernel: "nearest" }).png().toBuffer();
    comp.push({ input: buf, left: Math.round(x + cw / 2 - p.ax * s), top: Math.round(y + h - 4 - p.ay * s) });
    x += cw;
  }
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="106" height="${h}"><text x="4" y="${h - 8}" font-family="sans-serif" font-size="13" fill="#fff">${r.look}</text></svg>`);
  comp.push({ input: label, left: 0, top: y });
  W = Math.max(W, x);
  y += h;
}
await L.sharp({ create: { width: Math.max(1, W), height: Math.max(1, y), channels: 4, background: "#6f9448" } }).composite(comp.filter((c) => c.left >= 0 && c.top >= 0)).png().toFile(out);
console.log(`${rows.length} looks: ${out}`);
