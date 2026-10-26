// Every worn thing's piece alone, as built, enlarged over magenta (the owner, 2026-10-26: "ห้ามมี pixel bug แบบนี้เด็ดขาด"):
// a hole shows as magenta inside it, a strip of skin it should not carry as peach along its edge, an eaten brim as a
// bite. ART_WORKFLOW.md "No pixel bugs", step 2.
//   node checks/piece-look.mjs <out.png> <slot> [ids]      slot: hat, face, neck, hair; DIR=<a build folder>
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const [OUT = "work/debug/pieces.png", slot = "hat", list] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel.json`, "utf8"));
const pic = await L.loadRaw(`${DIR}/${j.image}`), S = 6;
const ids = list ? list.split(",") : Object.keys(j.wear?.[slot] ?? {});
const tiles = [];
for (const id of ids) for (const v of ["front", "back"]) {
  for (const n of [j.wear?.[slot]?.[id]?.[v], j.wear?.[slot]?.[id]?.under?.[v]]) { if (!n) continue;
  const [x, y, w, h] = j.frames[n], buf = Buffer.alloc(w * h * 4);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const si = ((y + r) * pic.W + x + c) * 4, di = (r * w + c) * 4;
    if (pic.data[si + 3]) pic.data.copy(buf, di, si, si + 4); else { buf[di] = 255; buf[di + 2] = 255; buf[di + 3] = 255; }
  }
  tiles.push({ img: await L.sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(w * S, h * S, { kernel: "nearest" }).png().toBuffer(), w: w * S, h: h * S });
} }
const cols = 6, cw = Math.max(...tiles.map((t) => t.w)) + 10, ch = Math.max(...tiles.map((t) => t.h)) + 10;
await L.sharp({ create: { width: cols * cw, height: Math.ceil(tiles.length / cols) * ch, channels: 4, background: "#3a4050" } })
  .composite(tiles.map((t, i) => ({ input: t.img, left: (i % cols) * cw, top: Math.floor(i / cols) * ch }))).png().toFile(OUT);
console.log(OUT, tiles.length, "pieces");
