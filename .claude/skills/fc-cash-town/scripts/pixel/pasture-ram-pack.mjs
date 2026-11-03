// The cloud ram's saddlebags (the owner, 2026-11-04: the ram carries a pack of ten slots, lib/town/ram-pack; his
// reference was a pack sheep with bags): laid onto the ram's own frames, which are never drawn again.
//
// work/out/ref-ram-pack.png is the ram's two base frames (pa_ram_SE_walk_0, pa_ram_NE_walk_0) at 6x; work/out/ram-pack-edit.png
// is gen.mjs's in-place edit of it with the bags hung on (prompts/scenery/ram-pack-edit.txt). For each view this:
//   1. finds where the edit's ram lies on the original (it may move a few canvas pixels), by the fleece and outline;
//   2. reads each of the original's cells in the edit (the commonest colour of its middle) and keeps, as the bag, the
//      cells that changed into leather, brass or the dark outline next to them, in pieces of eight cells or more;
//   3. lays that layer on every frame of the view, at where that frame's saddle is against the base frame's (found by
//      the saddle's dark leather cells), so the bags ride with the body as it steps.
// The sheep's picture (public/town/pasture-sheep-<hash>.png) is written again with the frames changed and its json
// points at the new name; the old picture is taken away.
//
//   node pasture-ram-pack.mjs <tree>/public/town [--look <out.png>]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const PUB = process.argv[2], LOOK = process.argv.includes("--look") ? process.argv[process.argv.indexOf("--look") + 1] : null;
if (!PUB) throw new Error("usage: node pasture-ram-pack.mjs <tree>/public/town [--look <out.png>]");
const K = 6, VIEWS = [{ base: "pa_ram_SE_walk_0", at: [40, 200], frames: ["pa_ram_SE_walk_0", "pa_ram_SE_walk_1", "pa_ram_SE_walk_2", "pa_ram_SE_walk_3"] },
  { base: "pa_ram_NE_walk_0", at: [880, 146], frames: ["pa_ram_NE_walk_0", "pa_ram_NE_walk_1", "pa_ram_NE_walk_2", "pa_ram_NE_walk_3"] }];
const jsonFile = path.join(PUB, "pasture-sheep.json"), meta = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
const sheetFile = path.join(PUB, meta.image), sheet = await sharp(sheetFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = sheet.info.width, S = sheet.data;
const edit = await sharp(path.join("work/out", "ram-pack-edit.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const EW = edit.info.width, E = edit.data;

const px = (buf, w, x, y) => { const i = (y * w + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
/** A frame's own cells. */
const frame = (name) => { const [x, y, w, h] = meta.props[name]; return { x, y, w, h, at: (cx, cy) => (cx < 0 || cy < 0 || cx >= w || cy >= h ? [0, 0, 0, 0] : px(S, SW, x + cx, y + cy)) }; };
/** The commonest colour of a cell's middle in the edit, the cell laid at (ox, oy) on the canvas. */
const cellOf = (ox, oy, cx, cy) => {
  const seen = new Map();
  for (let dy = 1; dy < K - 1; dy++) for (let dx = 1; dx < K - 1; dx++) {
    const x = ox + cx * K + dx, y = oy + cy * K + dy;
    if (x < 0 || y < 0 || x >= EW || y >= edit.info.height) continue;
    const p = px(E, EW, x, y), key = p[3] < 128 ? "none" : `${p[0] >> 3},${p[1] >> 3},${p[2] >> 3}`;
    const was = seen.get(key) ?? { n: 0, p }; was.n++; seen.set(key, was);
  }
  const best = [...seen.values()].sort((a, b) => b.n - a.n)[0];
  return !best || best.p[3] < 128 ? [0, 0, 0, 0] : best.p;
};
const leather = ([r, g, b, a]) => a > 0 && r > g && g >= b - 6 && r - b > 30;          // browns, tans, brass and its shine
const dark = ([r, g, b, a]) => a > 0 && r + g + b < 170;
const saddle = ([r, g, b, a]) => a > 0 && r > g + 18 && g > b - 8 && r < 170;                   // the saddle's dark leather

const layers = [];
for (const v of VIEWS) {
  const f = frame(v.base);
  // 1. where the edit's ram lies: the move that agrees best on the original's opaque cells
  let best = { n: -1, ox: v.at[0], oy: v.at[1] };
  for (let dy = -18; dy <= 18; dy += 1) for (let dx = -18; dx <= 18; dx += 1) {
    let n = 0;
    for (let cy = 0; cy < f.h; cy += 2) for (let cx = 0; cx < f.w; cx += 2) {
      const o = f.at(cx, cy); if (!o[3]) continue;
      const x = v.at[0] + dx + cx * K + 3, y = v.at[1] + dy + cy * K + 3;
      if (x < 0 || y < 0 || x >= EW || y >= edit.info.height) continue;
      if (dist(px(E, EW, x, y), o) < 60) n++;
    }
    if (n > best.n) best = { n, ox: v.at[0] + dx, oy: v.at[1] + dy };
  }
  // 2. the cells that turned into the bag
  const bag = new Map();
  for (let cy = 0; cy < f.h; cy++) for (let cx = 0; cx < f.w; cx++) {
    const o = f.at(cx, cy), e = cellOf(best.ox, best.oy, cx, cy);
    if (!e[3] || dist(e, o) < 70) continue;
    if (leather(e) || dark(e)) bag.set(`${cx},${cy}`, e);
  }
  // (dark cells only where they edge leather; then only pieces of eight cells or more)
  for (const [k, e] of [...bag]) if (dark(e) && !leather(e)) { const [x, y] = k.split(",").map(Number); if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const n = bag.get(`${x + a},${y + b}`); return n && leather(n); })) bag.delete(k); }
  const kept = new Map(), seen = new Set();
  for (const k of bag.keys()) {
    if (seen.has(k)) continue;
    const piece = [k]; seen.add(k);
    for (let i = 0; i < piece.length; i++) { const [x, y] = piece[i].split(",").map(Number); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = `${x + a},${y + b}`; if (bag.has(n) && !seen.has(n)) { seen.add(n); piece.push(n); } } }
    if (piece.length >= 8) for (const p of piece) kept.set(p, bag.get(p));
  }
  // the base frame's saddle cells, to find each frame's against
  const saddleOf = (g) => { const s = []; for (let cy = 0; cy < g.h; cy++) for (let cx = 0; cx < g.w; cx++) if (saddle(g.at(cx, cy))) s.push([cx, cy]); return s; };
  const base = saddleOf(f);
  console.log(`${v.base}: the edit lies at ${best.ox},${best.oy} (${best.n} agree); the bag ${kept.size} cells; the saddle ${base.length} cells`);
  layers.push({ v, kept, base, saddleOf });
}

// 3. every frame of each view, the bag where its saddle is
const out = Buffer.from(S), changed = [];
for (const { v, kept, base, saddleOf } of layers) for (const name of v.frames) {
  const g = frame(name), mine = new Set(saddleOf(g).map(([x, y]) => `${x},${y}`));
  let best = { n: -1, dx: 0, dy: 0 };
  for (let dy = -8; dy <= 8; dy++) for (let dx = -6; dx <= 6; dx++) { let n = 0; for (const [x, y] of base) if (mine.has(`${x + dx},${y + dy}`)) n++; if (n > best.n) best = { n, dx, dy }; }
  let laid = 0;
  for (const [k, e] of kept) {
    const [cx, cy] = k.split(",").map(Number), x = cx + best.dx, y = cy + best.dy;
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
    const i = ((g.y + y) * SW + g.x + x) * 4; out[i] = e[0]; out[i + 1] = e[1]; out[i + 2] = e[2]; out[i + 3] = 255; laid++;
  }
  changed.push(name);
  console.log(`  ${name}: saddle at ${best.dx},${best.dy} (${best.n}/${base.length}), ${laid} cells laid`);
}

const png = await sharp(out, { raw: { width: SW, height: sheet.info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const name = `pasture-sheep-${crypto.createHash("sha256").update(png).digest("hex").slice(0, 10)}.png`;
fs.writeFileSync(path.join(PUB, name), png);
if (name !== meta.image) { fs.unlinkSync(sheetFile); meta.image = name; fs.writeFileSync(jsonFile, JSON.stringify(meta)); }
console.log(`wrote ${name}`);
if (LOOK) {
  const parts = []; let x = 4;
  for (const n of VIEWS.flatMap((v) => v.frames)) { const [l, t, w, h] = meta.props[n]; parts.push({ input: await sharp(png).extract({ left: l, top: t, width: w, height: h }).resize({ width: w * 3, height: h * 3, kernel: "nearest" }).toBuffer(), left: x, top: 4 }); x += w * 3 + 6; }
  await sharp({ create: { width: x, height: 400, channels: 4, background: "#5f7f4a" } }).composite(parts).png().toFile(LOOK);
}
