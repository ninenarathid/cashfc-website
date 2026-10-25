// A gen.mjs sheet of a few figures (a popoto's poses, a talk portrait's two mouths) edited by PixelLab instead (the
// owner, 2026-10-25: OpenAI credit is down to $1.10, "ช่วยเอาไปทำที่ PixelLab แทน แต่พยายามทำให้ออกมา เป็นแบบเดียวกันให้ได้").
// The sheet's figures are cut to their own pixels on one small canvas that PixelLab edits whole, and what comes back is
// laid on a sheet of the same size, at the same grid and the same places, so build-scenery.mjs cuts it as it cut the
// first: a new NPC drawn as an edit of an existing one keeps that one's pixel size and scale.
//
//   node pl-sheet.mjs pack <sheet.png> <dir> <n> <lo-hi>     the sheet's n figures, its grid searched in lo-hi (the range
//                                                            build-scenery.mjs gives that sheet): <dir>/sheet.png, map.json
//   node pl-sheet.mjs unpack <dir> <out.png>                 <dir>/sheet-out.png (PixelLab's) back on a sheet
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const [cmd, a, b, c, d] = process.argv.slice(2);
const PAD = 4, MAX = 256;
const up4 = (n) => Math.ceil(n / 4) * 4;
const png = (buf, w, h, file) => L.sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);

if (cmd === "pack") {
  const sheet = path.resolve(a), dir = path.resolve(b), n = +c, [lo, hi] = d.split("-").map(Number);
  fs.mkdirSync(dir, { recursive: true });
  const raw = await L.loadRaw(sheet), grid = L.detectGrid(raw, undefined, [lo, hi]), g = L.cellsOf(raw, grid);
  const F = L.figures(g, L.spansOf(g, n)), boxes = F.map((f) => L.bbox(g, f));
  // in one row, or two when one is too wide; every figure keeps its height over the sheet's lowest foot, so they stand
  // as they stood
  const foot = Math.max(...boxes.map((bx) => bx.y1)), rowH = foot - Math.min(...boxes.map((bx) => bx.y0)) + 1 + PAD * 2;
  const wOf = (bx) => bx.x1 - bx.x0 + 1 + PAD * 2;
  let rows = 1, W, H;
  for (; rows <= 3; rows++) {
    const per = Math.ceil(n / rows);
    W = up4(Math.max(...Array.from({ length: rows }, (_, r) => boxes.slice(r * per, r * per + per).reduce((s, bx) => s + wOf(bx), 0))));
    H = up4(rowH * rows);
    if (W <= MAX && H <= MAX) break;
  }
  if (W > MAX || H > MAX) { console.log(`${W}x${H} is larger than ${MAX}: pack fewer figures`); process.exit(1); }
  const per = Math.ceil(n / rows), buf = Buffer.alloc(W * H * 4), slots = [];
  for (let k = 0; k < n; k++) {
    const r = Math.floor(k / per), bx = boxes[k], w = wOf(bx), x = boxes.slice(r * per, k).reduce((s, q) => s + wOf(q), 0), y = r * rowH;
    const ox = x + PAD, oy = y + rowH - PAD - (foot - bx.y0 + 1);
    for (const i of F[k]) { const gx = i % g.GW, gy = (i / g.GW) | 0; buf.set(g.c.subarray(i * 4, i * 4 + 4), ((oy + gy - bx.y0) * W + ox + gx - bx.x0) * 4); }
    slots.push({ x, y, w, h: rowH, ox, oy, gx0: bx.x0, gy0: bx.y0 });
  }
  await png(buf, W, H, path.join(dir, "sheet.png"));
  fs.writeFileSync(path.join(dir, "map.json"), JSON.stringify({ sheet, W, H, grid, size: [raw.W, raw.H], slots }, null, 1));
  console.log(`sheet.png ${W}x${H}, grid ${grid.p.toFixed(2)}`);
}

if (cmd === "unpack") {
  const dir = path.resolve(a), out = path.resolve(b);
  const m = JSON.parse(fs.readFileSync(path.join(dir, "map.json"), "utf8"));
  const got = await L.loadRaw(path.join(dir, "sheet-out.png"));
  if (got.W !== m.W || got.H !== m.H) { console.log(`sheet-out.png is ${got.W}x${got.H}, the canvas was ${m.W}x${m.H}`); process.exit(1); }
  const [SW, SH] = m.size, { p, phx, phy } = m.grid, buf = Buffer.alloc(SW * SH * 4);
  let n = 0;
  for (const s of m.slots) for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
    const o = (y * m.W + x) * 4;
    if (got.data[o + 3] < 128) continue;
    const gx = s.gx0 + x - s.ox, gy = s.gy0 + y - s.oy;
    const x0 = Math.round(phx + gx * p), x1 = Math.round(phx + (gx + 1) * p), y0 = Math.round(phy + gy * p), y1 = Math.round(phy + (gy + 1) * p);
    for (let yy = Math.max(0, y0); yy < Math.min(SH, y1); yy++) for (let xx = Math.max(0, x0); xx < Math.min(SW, x1); xx++) { const q = (yy * SW + xx) * 4; buf[q] = got.data[o]; buf[q + 1] = got.data[o + 1]; buf[q + 2] = got.data[o + 2]; buf[q + 3] = 255; }
    n++;
  }
  await png(buf, SW, SH, out);
  console.log(`${out}: ${n} cells`);
}
