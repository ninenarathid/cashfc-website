// Granny Twilla's clothes shop (the owner, 2026-10-25): a 10 × 10 room made in the Cashtown map editor, exported as
// "oatto-shopinstance" (map.json + pictures; its README.md says how to read them), turned into what the game reads
// (lib/town/shop, lib/town/shop-art). One room everybody shares, entered by the townhouse's door in the editor's town.
//
//   node build-shop.mjs [--src <export dir>] [--out <public dir>] [--json <file>] [--debug <png>]
//
//   --src    the editor's export (default: the shared tree's git-ignored work/oatto-shop, where its pictures stay)
//   --out    where the pictures go (default: <this repo>/public/town/shop): one lossless webp a picture, cut to what is
//            drawn of it and named by its content (editor-export.mjs, as the town's), fetched only near the room
//   --json   the room for the game (default: <this repo>/lib/town/shop-map.json)
//   --debug  the room drawn at twice its size with its walk rules over it, and the order things are drawn in (to look at)
//
// What comes over as the export has it (its README, which says never to work out again what the map states):
// - the floor: its wooden texture laid over the room as README §4 says, and the walls' shadows (§8) laid on it, in one
//   picture drawn under everybody;
// - the walls: the export's own ready-made pictures (walls/wall_<n>.png, drawn a picture pixel to an isometric pixel),
//   standing on the room's back edges (west, north): every place in the room is on their front side, so they are drawn
//   before anything in it (§6, "Walls change this");
// - what may be walked on: `collision.rows` as they are, and the walls as closed edges (§8);
// - what stands there: each thing's picture where §6 puts it, in its layer, in order back to front by its footprint's
//   middle and its `z` (which the export set so that what stands on a counter comes right after the counter);
// - the popoto behind the west counter is where Granny Twilla stands (lib/town/shop's keeper): not drawn from here.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REPO, exportReader, noise, sharp, spriteWriter, toIso } from "./editor-export.mjs";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const SRC = arg("--src", "E:/NinenineProject/fcnext/.claude/skills/fc-cash-town/scripts/pixel/work/oatto-shop");
const OUT = arg("--out", path.join(REPO, "public/town/shop"));
const JSON_OUT = arg("--json", path.join(REPO, "lib/town/shop-map.json"));
const DEBUG = arg("--debug", "");

const map = JSON.parse(fs.readFileSync(path.join(SRC, "map.json"), "utf8"));
const { cols: COLS, rows: ROWS } = map;
const { picture, placeOf } = exportReader(SRC, map);
/**
 * A large picture far finer than the room ever shows it (the potato clock came 839 pixels tall, to be drawn 43 high) is
 * written at four of its pixels to an isometric pixel, as many as a screen at the closest zoom shows: what is drawn is
 * the same, and a page holds a sixth of it. The small ones are kept as they came, pixel for pixel.
 */
const FINEST = 4, LARGE = 200_000;
const drawnK = new Map();
for (const o of map.objects) { const pl = await placeOf(o); if (pl.p.pw * pl.p.ph > LARGE) drawnK.set(pl.file, Math.max(drawnK.get(pl.file) ?? 0, pl.k)); }
const { sprites, sprite, cutAt, scaleOf } = spriteWriter(OUT, picture, (file) => (drawnK.has(file) ? Math.min(1, FINEST * drawnK.get(file)) : 1));
const hashOf = (buf) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10);

/* ── the floor ───────────────────────────────────────────────────────────────────────────────────────────────────── */

// README §4, per isometric pixel of the room's diamond: the ground's kind where it is (painted detail, else the tile's
// own with its border wandering), that kind's texture laid across the tiles, and a dark line where two kinds meet
const tile = (fx, fy) => map.ground[Math.min(Math.max(Math.floor(fy), 0), ROWS - 1)][Math.min(Math.max(Math.floor(fx), 0), COLS - 1)];
const wob = (k) => { if (k === "_") return 0; const E = map.ground_edges || {}, name = map.ground_legend[k]; return +((E.kinds || {})[name] ?? E.wobble ?? 0.35); };
function groundAt(fx, fy) {
  const k0 = tile(fx, fy);
  if (k0 === "_") return k0;
  const f = map.ground_fine?.rows?.[Math.floor(fy * 8)]?.[Math.floor(fx * 8)];
  if (f && f !== ".") return f;
  const a0 = wob(k0);
  if (!a0) return k0;
  const n1 = 2 * (noise(fx, fy, 1.6, 11) - 0.5), n2 = 2 * (noise(fx, fy, 1.6, 12) - 0.5);
  const k = tile(fx + a0 * n1, fy + a0 * n2);
  if (k === k0) return k;
  const a = Math.min(a0, wob(k));
  return a === a0 ? k : tile(fx + a * n1, fy + a * n2);
}
const textures = {};
for (const [name, t] of Object.entries(map.ground_textures)) {
  const vs = t.variants ?? (t.file ? [t] : []);
  textures[name] = { color: t.color, variants: await Promise.all(vs.map(async (v) => ({ ...v, pic: await picture(v.file) }))) };
}
const FLOOR = { left: -ROWS * 32, top: 0, w: (COLS + ROWS) * 32, h: (COLS + ROWS) * 16 };
const tileOf = (wx, wy) => ({ fx: (wx / 32 + wy / 16) / 2, fy: (wy / 16 - wx / 32) / 2 });
const inside = (fx, fy) => fx >= 0 && fy >= 0 && fx < COLS && fy < ROWS;
const kindAt = (wx, wy) => { const { fx, fy } = tileOf(wx + 0.5, wy + 0.5); return inside(fx, fy) ? groundAt(fx, fy) : "_"; };
const floorPx = Buffer.alloc(FLOOR.w * FLOOR.h * 4);
for (let py = 0; py < FLOOR.h; py++) for (let px = 0; px < FLOOR.w; px++) {
  const wx = FLOOR.left + px, wy = FLOOR.top + py, k = kindAt(wx, wy);
  if (k === "_") continue;
  const { fx, fy } = tileOf(wx + 0.5, wy + 0.5), t = textures[map.ground_legend[k]];
  let rgb;
  if (!t?.variants.length) { const c = t?.color ?? "#808080"; rgb = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); }
  else {
    const vs = t.variants, ws = vs.map((v) => v.weight ?? 1), sum = ws.reduce((a, b) => a + b, 0);
    let v = vs[vs.length - 1];
    if (vs.length > 1) { const n = noise(fx, fy, 4, 100 + k.charCodeAt(0)); let cum = 0; for (let i = 0; i < vs.length; i++) { cum += ws[i]; if (n <= cum / sum) { v = vs[i]; break; } } }
    const tpt = v.texels_per_tile ?? 32, W = v.pic.pw, H = v.pic.ph;
    const u = ((Math.floor(fx * tpt) % W) + W) % W, vv = ((Math.floor(fy * tpt) % H) + H) % H, i = (vv * W + u) * 4;
    rgb = [v.pic.data[i], v.pic.data[i + 1], v.pic.data[i + 2]];
  }
  const left = kindAt(wx - 1, wy), up = kindAt(wx, wy - 1);
  const m = (left !== "_" && left !== k) || (up !== "_" && up !== k) ? 0.78 : 1;
  const o = (py * FLOOR.w + px) * 4;
  floorPx[o] = Math.round(rgb[0] * m); floorPx[o + 1] = Math.round(rgb[1] * m); floorPx[o + 2] = Math.round(rgb[2] * m); floorPx[o + 3] = 255;
}
// the walls' shadows (README §8): unscaled, their top-left at `origin`, right after the ground
const layers = [];
if (map.shadows?.file) layers.push({ input: path.join(SRC, map.shadows.file), left: map.shadows.origin[0] - FLOOR.left, top: map.shadows.origin[1] - FLOOR.top });
const floorBuf = await sharp(await sharp(floorPx, { raw: { width: FLOOR.w, height: FLOOR.h, channels: 4 } }).composite(layers).png().toBuffer())
  .webp({ lossless: true, effort: 6 }).toBuffer();
const floorSrc = `floor-${hashOf(floorBuf)}.webp`;
fs.writeFileSync(path.join(OUT, floorSrc), floorBuf);

/* ── what stands there ───────────────────────────────────────────────────────────────────────────────────────────── */

/** The popoto behind the west counter: where Granny Twilla stands (the owner, 2026-10-25), drawn by the game, not from here. */
const KEEPER = /^popoto$/;
/** How a thing is drawn among the walkers (lib/town/shop-art): on the floor under everybody, standing, or a wall. */
const DRAW = { floor: 0, stand: 1, wall: 2 };
const byId = new Map(map.objects.map((o) => [o.id, o]));
/** What a thing stands on, followed down to what stands on the floor (README §6, Attached objects); itself if nothing. */
const groundOf = (o) => { const seen = new Set([o.id]); let g = o; while (g.on && byId.has(g.on) && !seen.has(g.on)) { seen.add(g.on); g = byId.get(g.on); } return g; };
const kept = map.objects.filter((o) => !KEEPER.test(o.asset));
const index = new Map(kept.map((o, i) => [o.id, i]));
const names = [], nameOf = (n) => { let i = names.indexOf(n); if (i < 0) i = names.push(n) - 1; return i; };
const objects = [];
for (const o of kept) {
  const pl = await placeOf(o), s = await sprite(pl.file), { left, top } = cutAt(pl, s), base = groundOf(o);
  const draw = o.kind === "wall" ? DRAW.wall : o.layer === "decal" || o.asset === "game_ring" ? DRAW.floor : DRAW.stand;
  // [name, picture, left, top, scale, mirrored, how drawn, order back to front (middle's x + y + z), footprint x0 y0 x1
  //  y1, what it stands on (its number here; −1 the floor), the editor's own draw order]
  objects.push([nameOf(o.asset.replace(/~.*$/, "")), s, +left.toFixed(2), +top.toFixed(2), +scaleOf(pl, s).toFixed(5), pl.flip ? 1 : 0, draw,
    +(pl.cx + pl.cy + (o.z ?? 0)).toFixed(3), +(pl.cx - pl.w / 2).toFixed(3), +(pl.cy - pl.h / 2).toFixed(3), +(pl.cx + pl.w / 2).toFixed(3), +(pl.cy + pl.h / 2).toFixed(3),
    base === o ? -1 : index.get(base.id) ?? -1, o.draw_index ?? -1]);
}
const keeper = map.objects.find((o) => KEEPER.test(o.asset));
const keeperOn = keeper ? groundOf(keeper) : null;

/* ── the walkers fitted in ───────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The game draws everything that stands back to front by one number each, a walker by where they stand (x + y). A thing
 * here is first given its middle's x + y + z, the export's own order; then, wherever somebody could stand or walk with
 * their doll over its picture, README §6's rule says which of the two is in front (whoever stands wholly before its
 * footprint is drawn after it, whoever stands wholly behind it before), and its number is moved, as little as it can
 * be, to agree with every such place: the notice board on the north wall, whose middle is further down the room than
 * whoever stands right before it, and the west counter's end, which somebody beside it stood level with. What stands
 * on a thing moves with it. A thing no one number could agree with would be named here (none is, in this room).
 */
const DOLL = { left: -16, right: 16, up: -66, down: 4 };
const open = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && map.collision.rows[y][x] === ".";
const stands = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  if (!open(x, y)) continue;
  stands.push([x + 0.5, y + 0.5]);
  // (and on the way to each neighbour: a step is walked through, not jumped)
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    if (!open(x + dx, y + dy) || (dx && dy && (!open(x + dx, y) || !open(x, y + dy)))) continue;
    for (const t of [0.25, 0.5, 0.75]) stands.push([x + 0.5 + dx * t, y + 0.5 + dy * t]);
  }
}
const pictureBox = (o) => { const sp = sprites[o[1]]; return [o[2], o[3], o[2] + sp.w * o[4], o[3] + sp.h * o[4]]; };
const moved = [];
objects.forEach((o, i) => {
  if (o[6] !== DRAW.stand || o[12] >= 0) return;
  // (its picture and those of what stands on it)
  const boxes = [pictureBox(o), ...objects.filter((q) => q[12] === i).map(pictureBox)];
  const [x0, y0, x1, y1] = [o[8], o[9], o[10], o[11]];
  let lo = -Infinity, hi = Infinity;
  for (const [px, py] of stands) {
    const c = toIso(px, py);
    if (!boxes.some(([l, t, r, b]) => c.x + DOLL.right > l && c.x + DOLL.left < r && c.y + DOLL.down > t && c.y + DOLL.up < b)) continue;
    const before = px >= x1 || py >= y1, behind = px <= x0 || py <= y0;
    if (before && !behind) hi = Math.min(hi, px + py);
    else if (behind && !before) lo = Math.max(lo, px + py);
  }
  const d = o[7];
  if (lo >= hi) { console.warn(`  ${names[o[0]]}: no one place among the walkers fits it (behind ${lo}, before ${hi})`); return; }
  const to = d >= hi ? hi - 0.01 : d <= lo ? lo + 0.01 : d;
  if (to === d) return;
  moved.push(`${names[o[0]]} ${d} → ${+to.toFixed(3)}`);
  for (const q of objects) if (q === o || q[12] === i) q[7] = +(q[7] + to - d).toFixed(3);
});
if (moved.length) console.log(`  fitted among the walkers: ${moved.join("; ")}`);

/* ── written ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const out = {
  v: 1, cols: COLS, rows: ROWS, from: `oatto-shopinstance, exported ${map.exported}`,
  floor: [floorSrc, FLOOR.left, FLOOR.top, FLOOR.w, FLOOR.h],
  walk: map.collision.rows,
  walls: (map.walls ?? []).map((w) => [w.x, w.y, w.side, w.kind]),
  sprites: sprites.map(({ src, w, h }) => [src, w, h]),
  names, objects,
  // where Granny stands (the popoto's point), and what she stands behind: drawn just before it, so that its top hides her
  // from the waist down, as a keeper behind her counter (her figure is the game's: lib/town/shop)
  keeper: keeper ? { at: keeper.at ?? [keeper.x + (keeper.w ?? 1) / 2, keeper.y + (keeper.h ?? 1) / 2], behind: keeperOn && keeperOn !== keeper ? index.get(keeperOn.id) ?? -1 : -1 } : null,
};
fs.writeFileSync(JSON_OUT, JSON.stringify(out));
const free = out.walk.join("").split(".").length - 1;
console.log(`shop: ${objects.length} things, ${sprites.length} pictures + the floor, ${(fs.statSync(JSON_OUT).size / 1024).toFixed(1)} KB of map; ${free} open tiles, ${out.walls.length} walls`);

/* ── a look ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

if (DEBUG) {
  const Q = 2, pad = 40, W = FLOOR.w * Q + 2 * pad, H = (FLOOR.h + 160) * Q + pad, ox = -FLOOR.left, oy = 150;
  const at = (x, y) => ({ x: Math.round((x + ox) * Q + pad), y: Math.round((y + oy) * Q) });
  const comps = [{ input: await sharp(path.join(OUT, floorSrc)).resize(FLOOR.w * Q, FLOOR.h * Q, { kernel: "nearest" }).png().toBuffer(), ...(({ x, y }) => ({ left: x, top: y }))(at(FLOOR.left, FLOOR.top)) }];
  // (the popoto that stands for Granny drawn too, where the editor has it, for comparing)
  const shown = objects.map((o) => ({ file: path.join(OUT, sprites[o[1]].src), w: sprites[o[1]].w, h: sprites[o[1]].h, left: o[2], top: o[3], k: o[4], flip: o[5],
    key: o[6] === DRAW.floor ? -1e9 : o[6] === DRAW.wall ? -1e6 + o[13] : o[7] }));
  if (keeper) {
    const pl = await placeOf(keeper);
    shown.push({ file: path.join(SRC, pl.file), w: pl.p.pw, h: pl.p.ph, left: pl.left, top: pl.top, k: pl.k, flip: pl.flip ? 1 : 0, key: pl.cx + pl.cy + (keeper.z ?? 0) });
  }
  for (const t of shown.sort((a, b) => a.key - b.key)) {
    const w = Math.max(1, Math.round(t.w * t.k * Q)), h = Math.max(1, Math.round(t.h * t.k * Q));
    let img = sharp(t.file); if (t.flip) img = img.flop();
    const p = at(t.left, t.top);
    comps.push({ input: await img.resize(w, h, { kernel: "nearest" }).png().toBuffer(), left: p.x, top: p.y });
  }
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = out.walk[y][x], pts = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([a, b]) => { const p = toIso(a, b), q = at(p.x, p.y); return `${q.x},${q.y}`; }).join(" ");
    svg += `<polygon points="${pts}" fill="${c === "." ? "rgba(0,0,0,0)" : "rgba(255,40,40,0.25)"}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`;
    const m = at(toIso(x + 0.5, y + 0.5).x, toIso(x + 0.5, y + 0.5).y);
    svg += `<text x="${m.x}" y="${m.y + 4}" font-size="11" fill="#ff0" text-anchor="middle" font-family="monospace">${x},${y}</text>`;
  }
  if (keeper) { const k = toIso(...out.keeper.at), q = at(k.x, k.y); svg += `<circle cx="${q.x}" cy="${q.y}" r="5" fill="#0ff"/>`; }
  svg += "</svg>";
  const base = await sharp({ create: { width: W, height: H, channels: 4, background: "#14171d" } }).composite(comps).png().toBuffer();
  await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toFile(DEBUG);
  console.log("debug picture:", DEBUG);
}
