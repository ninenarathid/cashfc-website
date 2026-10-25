// node checks/hair-crown.mjs   DIR=<a build folder>
// How much bare scalp shows over each hairstyle's crown: the head piece's skin cells above the eyes' row that no hair
// cell covers, front and back (the head as lib/town/pixeldoll draws it: the face piece, then the hair over it).
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const sharp = L.sharp;
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel.json`, "utf8"));
const raw = async (f) => (await sharp(`${DIR}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
const pics = { "": await raw(j.image) };
for (const [g, s] of Object.entries(j.sheets ?? {})) pics[g] = await raw(s.image);
const cells = (name) => {
  const f = j.frames[name]; if (!f) return new Map();
  const [x, y, w, h, ox, oy, g] = f, { data, info } = pics[g ?? ""], m = new Map();
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const i = ((y + r) * info.width + x + c) * 4; if (data[i + 3] >= 128) m.set(`${ox + c},${oy + r}`, [data[i], data[i + 1], data[i + 2]]); }
  return m;
};
const skin = ([r, g, b]) => r > 150 && g > 90 && b < 170 && r > b + 40 && r > g;
const out = [];
for (const id of Object.keys(j.hair)) for (const view of ["front", "back"]) {
  if (id === "bald") continue;
  const gg = id[0] === "m" ? "m" : "f";
  const head = cells(view === "front" ? j.face[gg].round : j.face.back), hair = cells(j.hair[id][view]);
  // (above the eyes: the top 40% of the head piece's height)
  const ys = [...head.keys()].map((k) => +k.split(",")[1]), top = Math.min(...ys), cut = top + Math.round((Math.max(...ys) - top) * 0.4);
  let n = 0; const where = [];
  for (const [k, c] of head) { const y = +k.split(",")[1]; if (y <= cut && skin(c) && !hair.has(k)) { n++; where.push(k); } }
  out.push({ id, view, n, where: where.slice(0, 8).join(" ") });
}
for (const o of out.filter((o) => o.n > 0)) console.log(o.id.padEnd(5), o.view.padEnd(5), String(o.n).padStart(3), o.where);
console.log("hairs with no bare crown:", out.filter((o) => !o.n).length, "of", out.length);
