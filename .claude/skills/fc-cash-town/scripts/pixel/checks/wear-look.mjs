// Doll 2's worn things on the built dolls, as the browser lays them (lib/town/pixeldoll: body, neck, face, glasses,
// hair cut at a hat's brim, hair clip, hat), in raw key colours: every hat and accessory over a few hairstyles, front
// and back, and every outfit walking, sitting and eating. For looking at before the game.
//   node checks/wear-look.mjs [outPng] [hairs]      DIR=<a trial build's folder> (default fcnext's public/town)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const OUT = process.argv[2] ?? "work/debug/wear-look.png";
const HAIRS = (process.argv[3] ?? "f01,f05,m03,m13").split(",");
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel.json`, "utf8"));
const { data } = await L.loadRaw(`${DIR}/${j.image}`);
// (an outfit's pieces are in a picture of its own, named by the frame's seventh entry: build-pixel-atlas's meta.sheets)
const pics = { "": { data, W: j.size[0] } };
for (const [g, s] of Object.entries(j.sheets ?? {})) pics[g] = { data: (await L.loadRaw(`${DIR}/${s.image}`)).data, W: s.size[0] };
const W = j.size[0], CW = 70, CH = 92, S = 3;
const rows = [];
const g = (h) => (h[0] === "m" ? "m" : "f");
// [label, cells: [{ hair, view, outfit, hat, face, neck, hairWear, pose }]]
const hats = [null, ...Object.keys(j.wear?.hat ?? {})];
for (const hair of HAIRS) for (const view of ["front", "back"]) rows.push(hats.map((hat) => ({ hair, view, hat })));
const accs = [["face", Object.keys(j.wear?.face ?? {})], ["neck", Object.keys(j.wear?.neck ?? {})], ["hairWear", Object.keys(j.wear?.hair ?? {})]];
for (const hair of HAIRS.slice(0, 2)) for (const view of ["front", "back"]) rows.push(accs.flatMap(([slot, ids]) => ids.map((id) => ({ hair, view, [slot]: id }))));
const outfits = process.env.OUTFITS ? process.env.OUTFITS.split(",") : ["starter", ...Object.keys(j.outfits ?? {})];
for (const pose of ["walk", "sit", "eat0", "eat1"]) for (const view of ["front", "back"]) rows.push(outfits.map((outfit) => ({ hair: HAIRS[0], view, outfit, pose })));
// (LOOKS=<a JSON list of rows of cells>: only those, a whole look to a cell, e.g. an outfit with its hat and its glasses)
if (process.env.LOOKS) rows.splice(0, rows.length, ...JSON.parse(process.env.LOOKS));
const cols = Math.max(...rows.map((r) => r.length));
const out = Buffer.alloc(CW * cols * CH * rows.length * 4);
const OW = CW * cols;
const blit = (name, dx, dy, keep = () => true) => {
  const f = j.frames[name]; if (!f) return;
  const [x, y, w, h, ox, oy, g] = f, { data, W } = pics[g ?? ""];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const si = ((y + r) * W + x + c) * 4; if (!data[si + 3] || !keep(ox + c, oy + r)) continue;
    const X = dx + ox + c, Y = dy + oy + r; if (X < 0 || Y < 0 || X >= OW || Y >= CH * rows.length) continue;
    data.copy(out, (Y * OW + X) * 4, si, si + 4);
  }
};
rows.forEach((cells, ri) => cells.forEach((cell, ci) => {
  const gg = g(cell.hair), view = cell.view, O = cell.outfit && cell.outfit !== "starter" ? j.outfits[cell.outfit] : null;
  let step = (O?.walk ?? j.walk[gg])[view][1];
  if (cell.pose === "sit") step = (O?.sit ?? j.sit[gg])[view];
  if (cell.pose?.startsWith("eat")) step = (O?.eat ?? j.eat)?.[view]?.[+cell.pose[3]] ?? step;
  const ax = ci * CW + CW / 2, ay = ri * CH + CH - 6;
  blit(step.body, ax, ay);
  const hx = ax + step.hx, hy = ay + step.hy;
  const worn = (slot, id) => (id ? j.wear?.[slot]?.[id]?.[view] : null);
  blit(worn("neck", cell.neck), hx, hy);
  blit(view === "front" ? j.face[gg].round : j.face.back, hx, hy);
  // (an ear's base before the hair, as lib/town/pixeldoll draws it)
  blit(cell.hairWear ? j.wear?.hair?.[cell.hairWear]?.under?.[view] : null, hx, hy - (view === "back" ? j.lift?.[cell.hair] ?? 0 : 0));
  const clip = cell.hat ? j.wear.hat[cell.hat]?.clip?.[view] : null;
  const under = clip ? (x, y) => y > clip.ys[Math.min(clip.ys.length - 1, Math.max(0, x - clip.x0))] : () => true;
  if (j.hair[cell.hair]?.[view]) blit(j.hair[cell.hair][view], hx, hy, under);
  blit(worn("face", cell.face), hx, hy);
  blit(worn("hair", cell.hairWear), hx, hy);
  blit(worn("hat", cell.hat), hx, hy);
  if (cell.pose?.startsWith("eat") && view === "front" && step.hand) for (let d = -1; d <= 1; d++) { const X = ax + step.hand.x + d, Y = ay + step.hand.y; out.writeUInt32BE(0xff00ffff, (Y * OW + X) * 4); }
}));
await L.sharp(out, { raw: { width: OW, height: CH * rows.length, channels: 4 } }).resize(OW * S, CH * rows.length * S, { kernel: "nearest" }).flatten({ background: "#3a4050" }).png().toFile(OUT);
console.log(OUT, `${cols}x${rows.length}`);
