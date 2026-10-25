// Doll 2 outfits drawn by PixelLab instead of gen.mjs (the owner, 2026-10-25: "OpenAI credit เหลือ 1.1 usd ช่วยเอาไปทำที่
// PixelLab แทน แต่พยายามทำให้ออกมา เป็นแบบเดียวกันให้ได้"). The mannequin's figures are cut to their own pixels and laid on
// one small canvas that PixelLab edits whole (every frame seen at once, so the outfit is the same on each), and what comes
// back is laid again where the mannequin's figures stand on its sheets, at their grid: build-pixel-atlas.mjs then reads
// do-<id>-<type>.png as it reads gen.mjs's in-place edits. The skin key (dk-) is written from the mannequin: a cell is
// bare skin where the mannequin's was and the new cell is still skin-coloured and close to it.
//
//   node pl-doll.mjs pack <dir>                      writes <dir>/walk.png (front + back steps), <dir>/rest.png (sitting,
//                                                    eating) and <dir>/map.json, from work/out/d2-mannequin-*.png
//   node pl-doll.mjs unpack <dir> <id>               reads <dir>/walk-out.png and <dir>/rest-out.png (PixelLab's), writes
//                                                    work/out/do-<id>-{front,back,poses,eat}.png and dk-<id>-*.png
//   node pl-doll.mjs look <dir> <id> <out.png>       the mannequin's canvas and PixelLab's side by side, four times up
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = path.join(HERE, "work", "out");
const [cmd, dirArg, id, look] = process.argv.slice(2);
if (!cmd || !dirArg) { console.log("node pl-doll.mjs pack <dir> | unpack <dir> <id> | look <dir> <id> <out.png>"); process.exit(1); }
const dir = path.resolve(dirArg);

// the groups PixelLab edits, each one canvas: [sheet type, figure index on that sheet] (poses: 0 sits facing, 1 sits
// away; eat: 0, 1 facing, 2, 3 away: build-pixel-atlas.mjs's picks)
const GROUPS = {
  walk: { rows: [[["front", 0], ["front", 1], ["front", 2], ["front", 3]], [["back", 0], ["back", 1], ["back", 2], ["back", 3]]] },
  rest: { rows: [[["poses", 0], ["poses", 1], ["eat", 0]], [["eat", 1], ["eat", 2], ["eat", 3]]] },
};
const PAD = 6; // room round each figure for what the outfit adds (a cape, a hem), in the figure's own pixels
const MAX = 256; // Pro Flash's largest canvas

// a mannequin sheet on the grid build-pixel-atlas.mjs reads it on: front and back on f-bald's period; a seated sheet
// (poses, eat) on the front's period times its first figure's head width over the walking head's (`seatedOf`)
const widthTop = (g, set, p) => { const b = L.bbox(g, set), lim = b.y0 + (b.y1 - b.y0) * 0.35; let x0 = 1e9, x1 = -1;
  for (const i of set) { const x = i % g.GW, y = (i / g.GW) | 0; if (y <= lim) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } } return (x1 - x0 + 1) * p; };
const bald = {};
const baldGrid = async (t) => (bald[t] ??= L.detectGrid(await L.loadRaw(path.join(OUT, `f-bald-${t}.png`))));
async function sheetGrid(t) {
  const raw = await L.loadRaw(path.join(OUT, `d2-mannequin-${t}.png`));
  let grid;
  if (t === "front" || t === "back") grid = L.detectGrid(raw, (await baldGrid(t)).p);
  else {
    const front = await baldGrid("front"), poses = await baldGrid("poses");
    const bf = L.cellsOf(await L.loadRaw(path.join(OUT, "f-bald-front.png")), front);
    const walkW = widthTop(bf, L.figures(bf, L.spansOf(bf, 4))[1], front.p);
    const g0 = L.cellsOf(raw, L.detectGrid(raw, poses.p));
    grid = L.detectGrid(raw, front.p * widthTop(g0, L.figures(g0, L.spansOf(g0, 4))[0], poses.p) / walkW);
  }
  const g = L.cellsOf(raw, grid);
  return { raw, grid, g, F: L.figures(g, L.spansOf(g, 4)) };
}

const png = (buf, w, h, file) => L.sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
const up4 = (n) => Math.ceil(n / 4) * 4;

if (cmd === "pack") {
  fs.mkdirSync(dir, { recursive: true });
  const sheets = {}, map = { pad: PAD, groups: {} };
  for (const t of ["front", "back", "poses", "eat"]) sheets[t] = await sheetGrid(t);
  for (const [name, G] of Object.entries(GROUPS)) {
    const rows = G.rows.map((row) => row.map(([t, k]) => ({ t, k, b: L.bbox(sheets[t].g, sheets[t].F[k]) })));
    const slotW = (s) => s.b.x1 - s.b.x0 + 1 + PAD * 2, slotH = (s) => s.b.y1 - s.b.y0 + 1 + PAD * 2;
    const W = up4(Math.max(...rows.map((r) => r.reduce((n, s) => n + slotW(s), 0))));
    const H = up4(rows.reduce((n, r) => n + Math.max(...r.map(slotH)), 0));
    if (W > MAX || H > MAX) { console.log(`${name}: ${W}x${H} is larger than ${MAX}`); process.exit(1); }
    const buf = Buffer.alloc(W * H * 4), slots = [];
    let y = 0;
    for (const r of rows) {
      let x = 0; const rh = Math.max(...r.map(slotH));
      for (const s of r) {
        const { g, F } = sheets[s.t];
        // each figure stands on its row's foot line, so the canvas reads as one row of people
        const ox = x + PAD, oy = y + rh - PAD - (s.b.y1 - s.b.y0 + 1);
        for (const i of F[s.k]) { const gx = i % g.GW, gy = (i / g.GW) | 0; buf.set(g.c.subarray(i * 4, i * 4 + 4), ((oy + gy - s.b.y0) * W + ox + gx - s.b.x0) * 4); }
        slots.push({ t: s.t, k: s.k, x: x, y, w: slotW(s), h: rh, ox, oy, gx0: s.b.x0, gy0: s.b.y0 });
        x += slotW(s);
      }
      y += rh;
    }
    await png(buf, W, H, path.join(dir, `${name}.png`));
    map.groups[name] = { W, H, slots };
    console.log(`${name}.png ${W}x${H}`);
  }
  for (const t of Object.keys(sheets)) map[t] = { ...sheets[t].grid, W: sheets[t].raw.W, H: sheets[t].raw.H };
  fs.writeFileSync(path.join(dir, "map.json"), JSON.stringify(map, null, 1));
}

if (cmd === "unpack") {
  if (!id) { console.log("unpack <dir> <id>"); process.exit(1); }
  const map = JSON.parse(fs.readFileSync(path.join(dir, "map.json"), "utf8"));
  const sheets = {};
  for (const t of ["front", "back", "poses", "eat"]) sheets[t] = await sheetGrid(t);
  // per sheet type: cells to write (gx, gy, rgba)
  const cells = { front: [], back: [], poses: [], eat: [] };
  for (const [name, G] of Object.entries(map.groups)) {
    const got = await L.loadRaw(path.join(dir, `${name}-out.png`));
    if (got.W !== G.W || got.H !== G.H) { console.log(`${name}-out.png is ${got.W}x${got.H}, the canvas was ${G.W}x${G.H}`); process.exit(1); }
    for (const s of G.slots) {
      for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
        const o = (y * got.W + x) * 4;
        if (got.data[o + 3] < 128) continue;
        cells[s.t].push({ k: s.k, gx: s.gx0 + x - s.ox, gy: s.gy0 + y - s.oy, rgba: [got.data[o], got.data[o + 1], got.data[o + 2], 255] });
      }
    }
  }
  for (const t of ["front", "back", "poses", "eat"]) {
    const { raw, grid, g, F } = sheets[t];
    const { p, phx, phy } = grid;
    const sheet = Buffer.alloc(raw.W * raw.H * 4), key = Buffer.alloc(raw.W * raw.H * 4);
    const fill = (buf, gx, gy, [r, gg, b, a]) => {
      const x0 = Math.round(phx + gx * p), x1 = Math.round(phx + (gx + 1) * p), y0 = Math.round(phy + gy * p), y1 = Math.round(phy + (gy + 1) * p);
      for (let y = Math.max(0, y0); y < Math.min(raw.H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(raw.W, x1); x++) { const o = (y * raw.W + x) * 4; buf[o] = r; buf[o + 1] = gg; buf[o + 2] = b; buf[o + 3] = a; }
    };
    // the seated sheet's sleeping and waving figures are never read: kept as the mannequin's, so its four spans hold
    if (t === "poses") for (const k of [2, 3]) for (const i of F[k]) { const c = [...g.c.subarray(i * 4, i * 4 + 4)]; fill(sheet, i % g.GW, (i / g.GW) | 0, c); fill(key, i % g.GW, (i / g.GW) | 0, c); }
    let skin = 0;
    for (const { gx, gy, rgba } of cells[t]) {
      fill(sheet, gx, gy, rgba);
      const m = gx >= 0 && gy >= 0 && gx < g.GW && gy < g.GH && g.c[(gy * g.GW + gx) * 4 + 3] ? [...g.c.subarray((gy * g.GW + gx) * 4, (gy * g.GW + gx) * 4 + 3)] : null;
      const [h, s, l] = L.hsl(...rgba.slice(0, 3));
      const near = m && L.cls(...m) === "skin" && Math.abs(m[0] - rgba[0]) + Math.abs(m[1] - rgba[1]) + Math.abs(m[2] - rgba[2]) < 90;
      const isSkin = near && (h <= 45 || h >= 345) && s > 0.2 && l > 0.25 && l < 0.92;
      if (isSkin) skin++;
      fill(key, gx, gy, isSkin ? [0, 200, 255, 255] : rgba);
    }
    await png(sheet, raw.W, raw.H, path.join(OUT, `do-${id}-${t}.png`));
    await png(key, raw.W, raw.H, path.join(OUT, `dk-${id}-${t}.png`));
    console.log(`do-${id}-${t}.png  ${cells[t].length} cells, ${skin} skin`);
  }
}

if (cmd === "look") {
  const pics = [];
  for (const name of ["walk", "rest"]) for (const f of [`${name}.png`, `${name}-out.png`]) if (fs.existsSync(path.join(dir, f))) pics.push(path.join(dir, f));
  const metas = await Promise.all(pics.map((f) => L.sharp(f).metadata()));
  const W = Math.max(...metas.map((m) => m.width)) * 4 * 2 + 16, H = metas.filter((_, i) => i % 2 === 0).reduce((n, m) => n + m.height * 4 + 8, 0);
  const comp = [];
  let y = 0;
  for (let i = 0; i < pics.length; i += 2) {
    for (let j = 0; j < 2 && i + j < pics.length; j++) comp.push({ input: await L.sharp(pics[i + j]).resize(metas[i + j].width * 4, metas[i + j].height * 4, { kernel: "nearest" }).png().toBuffer(), left: j * (metas[i].width * 4 + 16), top: y });
    y += metas[i].height * 4 + 8;
  }
  await L.sharp({ create: { width: W, height: H, channels: 4, background: { r: 40, g: 44, b: 52, alpha: 1 } } }).composite(comp).png().toFile(look);
  console.log(look);
}
