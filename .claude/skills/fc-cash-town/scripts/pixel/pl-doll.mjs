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

// ── Head things (hats, glasses, things at the neck, in the hair): build-pixel-atlas.mjs reads only the standing figure of
// a dh-/da- sheet against its base (a hat and a hair thing: f-bald-<view>; glasses: f-neutral-front; the neck:
// d2-mannequin-<view>), and its key copy (dhk-/dak-) says which cells are the thing. PixelLab's inpaint keeps every
// cell outside its mask exactly, so the key is the cells that changed.
//   node pl-doll.mjs head <dir> <slot>          writes <dir>/head.png, <dir>/head-mask.png and head.json (slot: hat,
//                                               hair, face, neck): the standing figure of each view side by side
//   node pl-doll.mjs unhead <dir> <id> <g>      reads <dir>/head-out.png, writes work/out/<g>-<id>-<view>.png and
//                                               <g>k-<id>-<view>.png (g: dh for a hat, da for the rest)
// (full: a hat over the whole head, face and ears and all, as the pumpkin set's jack-o'-lantern: the owner, 2026-10-25)
const HEAD_BASE = { hat: (v) => `f-bald-${v}`, full: (v) => `f-bald-${v}`, hair: (v) => `f-bald-${v}`, face: () => "f-neutral-front", neck: (v) => `d2-mannequin-${v}` };
const HEAD_VIEWS = { hat: ["front", "back"], full: ["front", "back"], hair: ["front", "back"], face: ["front"], neck: ["front", "back"] };
async function standing(slot, v) {
  const name = HEAD_BASE[slot](v), raw = await L.loadRaw(path.join(OUT, `${name}.png`));
  const t = name === "f-neutral-front" ? "front" : v;
  const grid = L.detectGrid(raw, (await baldGrid(t)).p), g = L.cellsOf(raw, grid);
  const F = L.figures(g, L.spansOf(g, 4))[1], b = L.bbox(g, F);
  // the chin: the narrowest row between the head and the body
  let cut = b.y0, w = 1e9;
  for (let y = b.y0 + Math.round((b.y1 - b.y0) * 0.4); y <= b.y0 + Math.round((b.y1 - b.y0) * 0.75); y++) {
    let x0 = 1e9, x1 = -1; for (const i of F) if (((i / g.GW) | 0) === y) { const x = i % g.GW; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    if (x1 >= 0 && x1 - x0 < w) { w = x1 - x0; cut = y; }
  }
  return { name, raw, grid, g, F, b, cut };
}
if (cmd === "head") {
  const slot = id;
  if (!HEAD_BASE[slot]) { console.log("head <dir> <hat|hair|face|neck>"); process.exit(1); }
  fs.mkdirSync(dir, { recursive: true });
  const parts = [];
  for (const v of HEAD_VIEWS[slot]) {
    const s = await standing(slot, v);
    // what is cut: the head with room above it for a tall hat, down to a little under the chin (the neck: to the chest)
    const y0 = s.b.y0 - (slot === "hat" || slot === "hair" || slot === "full" ? 22 : 2), y1 = slot === "neck" ? s.cut + 16 : s.cut + 3;
    const x0 = s.b.x0 - 6, x1 = s.b.x1 + 6;
    parts.push({ v, s, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  const W = up4(Math.max(32, parts.reduce((n, p) => n + p.w, 0))), H = up4(Math.max(32, ...parts.map((p) => p.h)));
  const img = Buffer.alloc(W * H * 4), mask = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) mask[i * 4 + 3] = 255;
  let ox = 0;
  const meta = { slot, W, H, parts: [] };
  for (const p of parts) {
    const { g, F, b, cut } = p.s, oy = H - p.h;
    for (const i of F) { const x = i % g.GW, y = (i / g.GW) | 0; if (y < p.y0 || y >= p.y0 + p.h) continue; img.set(g.c.subarray(i * 4, i * 4 + 4), ((oy + y - p.y0) * W + ox + x - p.x0) * 4); }
    // where it may draw: a hat or a hair thing above the ears (the face, the ears and the chin stay); glasses across
    // the eyes; a neck thing from the chin down to the chest, over the shoulders
    const earTop = b.y0 + Math.round((cut - b.y0) * 0.55), eyes = b.y0 + Math.round((cut - b.y0) * 0.62);
    const may = (x, y) => slot === "full" ? y <= cut + 1
      : slot === "hat" || slot === "hair" ? y <= earTop
      : slot === "face" ? Math.abs(y - eyes) <= 5 && x >= b.x0 - 3 && x <= b.x1 + 3
      : y >= cut - 2;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (may(p.x0 + x, p.y0 + y)) { const o = ((oy + y) * W + ox + x) * 4; mask[o] = mask[o + 1] = mask[o + 2] = 255; }
    meta.parts.push({ v: p.v, base: p.s.name, ox, oy, x0: p.x0, y0: p.y0, w: p.w, h: p.h });
    ox += p.w;
  }
  await png(img, W, H, path.join(dir, "head.png"));
  await png(mask, W, H, path.join(dir, "head-mask.png"));
  fs.writeFileSync(path.join(dir, "head.json"), JSON.stringify(meta, null, 1));
  console.log(`head.png ${W}x${H} (${meta.parts.map((p) => p.v).join(", ")})`);
}
if (cmd === "unhead") {
  const g0 = look;
  if (!id || !["dh", "da"].includes(g0)) { console.log("unhead <dir> <id> <dh|da>"); process.exit(1); }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "head.json"), "utf8"));
  const got = await L.loadRaw(path.join(dir, "head-out.png")), was = await L.loadRaw(path.join(dir, "head.png"));
  for (const p of meta.parts) {
    const s = await standing(meta.slot, p.v), { raw, grid, g } = s, { p: P, phx, phy } = grid;
    const sheet = Buffer.from(raw.data), key = Buffer.from(raw.data);
    const fill = (buf, gx, gy, c) => {
      const x0 = Math.round(phx + gx * P), x1 = Math.round(phx + (gx + 1) * P), y0 = Math.round(phy + gy * P), y1 = Math.round(phy + (gy + 1) * P);
      for (let y = Math.max(0, y0); y < Math.min(raw.H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(raw.W, x1); x++) { const o = (y * raw.W + x) * 4; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = c[3]; }
    };
    let n = 0;
    const a = got.data, b = was.data, changed = new Set();
    // the head's own skin tones: the model may also paint skin out past the head's old edge under the thing, which is
    // the head, never the thing (a pumpkin's orange is far from them, though both are "warm")
    const skins = [];
    for (let i = 0; i < meta.W * meta.H; i++) if (b[i * 4 + 3] >= 128 && L.cls(b[i * 4], b[i * 4 + 1], b[i * 4 + 2]) === "skin") skins.push([b[i * 4], b[i * 4 + 1], b[i * 4 + 2]]);
    const skinLike = (o) => skins.some((s) => Math.abs(s[0] - a[o]) + Math.abs(s[1] - a[o + 1]) + Math.abs(s[2] - a[o + 2]) < 50);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const o = ((p.oy + y) * meta.W + p.ox + x) * 4;
      const d = Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2]);
      // (inside the mask the model redraws the head too, a few shades off: a cell still of the head's own colour class
      // and near its colour is the head, not the thing; seen as skin carried over the hair by the pumpkin crown)
      const redrawn = a[o + 3] >= 128 && b[o + 3] >= 128 && d < 60 && L.cls(a[o], a[o + 1], a[o + 2]) === L.cls(b[o], b[o + 1], b[o + 2]);
      // (over the whole head nothing of it is left to tell apart: every changed cell is the thing)
      if (!(d < 4 && (a[o + 3] >= 128) === (b[o + 3] >= 128)) && (meta.slot === "full" || (!redrawn && !(a[o + 3] >= 128 && skinLike(o))))) changed.add(y * p.w + x);
    }
    // a speck or a stray stroke the model left apart from the thing (beside the head) is not the thing: the largest piece
    // of the change is kept, and any other piece inside its box (grown three cells) or a sixth its size or more
    const pieces = [];
    for (const c0 of [...changed]) {
      if (!changed.has(c0)) continue;
      const st = [c0], mem = [c0];
      changed.delete(c0);
      while (st.length) { const q = st.pop(), qx = q % p.w, qy = (q / p.w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const r = (qy + dy) * p.w + qx + dx; if (qx + dx >= 0 && qx + dx < p.w && changed.has(r)) { changed.delete(r); st.push(r); mem.push(r); } } }
      pieces.push(mem);
    }
    pieces.sort((u, v) => v.length - u.length);
    const keep = new Set(pieces[0] ?? []);
    if (pieces.length) {
      const xs = pieces[0].map((c) => c % p.w), ys = pieces[0].map((c) => (c / p.w) | 0);
      const bx = [Math.min(...xs) - 3, Math.max(...xs) + 3, Math.min(...ys) - 3, Math.max(...ys) + 3];
      for (const pc of pieces.slice(1)) {
        const inside = pc.every((c) => { const x = c % p.w, y = (c / p.w) | 0; return x >= bx[0] && x <= bx[1] && y >= bx[2] && y <= bx[3]; });
        if (inside || pc.length * 6 >= pieces[0].length) for (const c of pc) keep.add(c);
      }
      // the model may run a thread of one row along the mask's lower edge, out past the thing (seen on the pumpkin
      // crown): its lowest row keeps only what lies under the row above it, a cell either way (a brim's corner)
      const low = Math.max(...[...keep].map((c) => (c / p.w) | 0)), above = [...keep].filter((c) => ((c / p.w) | 0) === low - 1).map((c) => c % p.w);
      if (above.length) for (const c of [...keep]) if (((c / p.w) | 0) === low && (c % p.w < Math.min(...above) - 1 || c % p.w > Math.max(...above) + 1)) keep.delete(c);
    }
    for (const c of keep) {
      const x = c % p.w, y = (c / p.w) | 0, o = ((p.oy + y) * meta.W + p.ox + x) * 4;
      const gx = p.x0 + x, gy = p.y0 + y;
      if (a[o + 3] >= 128) { fill(sheet, gx, gy, [a[o], a[o + 1], a[o + 2], 255]); fill(key, gx, gy, [230, 0, 200, 255]); n++; }
      else { fill(sheet, gx, gy, [0, 0, 0, 0]); fill(key, gx, gy, [0, 0, 0, 0]); }
    }
    await png(sheet, raw.W, raw.H, path.join(OUT, `${g0}-${id}-${p.v}.png`));
    await png(key, raw.W, raw.H, path.join(OUT, `${g0}k-${id}-${p.v}.png`));
    console.log(`${g0}-${id}-${p.v}.png  ${n} cells changed (base ${p.base})`);
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
