// Cash Town's second main town (the owner, 2026-10-22: "oatto2-cash80x80v2 … เอามาใช้ replace เมืองหลัก", then "เปลี่ยนทั้ง
// เมือง", "ช่วยทำให้กินหน่วยความจำน้อย", "เขียนกฎเรื่องส่วนไหนเดินข้ามได้ ไม่ได้"): an 80 × 80 map made in the Cashtown map
// editor, exported as map.json + pictures (its README.md says how to read it), turned into what the game reads.
//
//   node build-town2.mjs [--src <export dir>] [--out <public dir>] [--json <file>] [--debug <png>]
//
//   --src    the editor's export (default: the shared tree's git-ignored work/oatto2, where its pictures stay)
//   --out    where the pictures go (default: <this repo>/public/town/town2): one lossless webp a picture, cut to what
//            is drawn of it and named by its content, so a page fetches only those it comes near (lib/town/town2-art)
//   --json   the map for the game (default: <this repo>/lib/town/town2-map.json): its ground at an eighth of a tile,
//            what may be walked on each tile, and every placed thing with where it is drawn
//   --debug  a picture of the whole map at a quarter size with the walk rules laid over it (for looking at)
//
// The walk rules (WALK below, and lib/town/town2's own on top of them) are the owner's to read in one place: what a
// thing stops depends on what it is, not on the editor's `solid` (it calls a flower and a stepping stone solid).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const REPO = path.resolve(HERE, "../../../../..");
const require = createRequire(path.join(REPO, "package.json"));
const sharp = require("sharp");
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const SRC = arg("--src", "E:/NinenineProject/fcnext/.claude/skills/fc-cash-town/scripts/pixel/work/oatto2");
const OUT = arg("--out", path.join(REPO, "public/town/town2"));
const JSON_OUT = arg("--json", path.join(REPO, "lib/town/town2-map.json"));
const DEBUG = arg("--debug", "");

const map = JSON.parse(fs.readFileSync(path.join(SRC, "map.json"), "utf8"));
const { cols: COLS, rows: ROWS } = map;
const toIso = (x, y) => ({ x: 32 * (x - y), y: 16 * (x + y) });

/* ── what each thing is, for walking ─────────────────────────────────────────────────────────────────────────────── */

/**
 * What a thing does to whoever walks, by its picture's name (first match wins):
 * - `flat`: lies on the ground, walked over (flowers, ferns, stepping stones, reeds, lotus leaves; and the pumpkins, out
 *   only in their season);
 * - `ring`: a gate's ring of light, walked onto (where it leads is lib/town/town2's);
 * - `trunk`: a tree, a bamboo clump: only the tile its trunk stands on is closed, the crown is over people's heads;
 * - `through`: a gateway, a torii, a rope between posts: only what touches the ground closes a tile (its posts),
 *   found from the picture itself, so the way between them stays open;
 * - `deck`: a bridge, the fishing pier, the stone pier: its boards are walked on, over the water too (found from the
 *   picture: a tile is deck where boards are drawn over its middle at the deck's height);
 * - `hall`: the kitchen hall, walked into by its doors (lib/town/town2 lays its floor and doors; here only its walls);
 * - `inside`: what is drawn of the hall from within, which stops nobody of itself;
 * - `block`: everything else (buildings, rocks, lanterns, statues, benches, bushes, stalls): the tiles under it.
 */
const WALK = [
  ["flat", /wildflower|bellflower|chrysanthemum|spider_lily|iris_clump|tulip|fern_fronds|stepping_stones|reed_clump|lotus_leaves|^game_flowers$|^game_fern$/],
  // (the pumpkins are out only in their season, lib/town/decor's carving: walked over, so that none is an unseen wall the rest of the year)
  ["flat", /^game_(pumpkin|jacko)/],
  ["ring", /^game_ring$/],
  ["trunk", /_tree_|bamboo_canes|^game_pine$|cherry_blossom_tree/],
  ["through", /^torii$|^village_gate$|tall_wooden_village_gateway|rope_barrier|laundry_hanging/],
  ["deck", /^bridge~|^fishing_pier~|^pier_of_mossy/],
  ["hall", /^kitchen_house$/],
  ["inside", /^kitchen_house_inside/],
];
const walkOf = (asset) => WALK.find(([, re]) => re.test(asset))?.[0] ?? "block";

/* ── the ground ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const fine = map.ground_fine.rows;
/** The letter painted at an eighth of a tile, or the tile's own. */
const fineAt = (sx, sy) => { const f = fine[sy]?.[sx]; return f && f !== "." ? f : map.ground[sy >> 3][sx >> 3]; };
/** Each row of eighths as painted ("." where nothing was: the tile's own ground, whose border wanders), run-length coded: a letter, then how many when more than one. */
const paintAt = (sx, sy) => { const f = fine[sy]?.[sx]; return f && f !== "." ? f : "."; };
const fineRows = [];
for (let sy = 0; sy < ROWS * 8; sy++) {
  let s = "", i = 0;
  while (i < COLS * 8) { const c = paintAt(i, sy); let j = i; while (j < COLS * 8 && paintAt(j, sy) === c) j++; s += c + (j - i > 1 ? j - i : ""); i = j; }
  fineRows.push(s);
}
const WATER = Object.entries(map.ground_legend).find(([, n]) => n === "water")[0];
/** Whether a tile is water: half or more of its eighths painted water. */
const wetTile = (tx, ty) => { let n = 0; for (let sy = 0; sy < 8; sy++) for (let sx = 0; sx < 8; sx++) if (fineAt(tx * 8 + sx, ty * 8 + sy) === WATER) n++; return n >= 32; };

/* ── the pictures ────────────────────────────────────────────────────────────────────────────────────────────────── */

fs.mkdirSync(OUT, { recursive: true });
const pics = new Map(); // source file -> { data, pw, ph }
async function picture(file) {
  if (!pics.has(file)) { const { data, info } = await sharp(path.join(SRC, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); pics.set(file, { data, pw: info.width, ph: info.height }); }
  return pics.get(file);
}
const opaque = (p, x, y) => x >= 0 && y >= 0 && x < p.pw && y < p.ph && p.data[(Math.floor(y) * p.pw + Math.floor(x)) * 4 + 3] > 40;

/** Where a placed thing's picture is drawn, in isometric pixels (README §6), and the picture it is drawn from. */
async function placeOf(o) {
  const a = map.assets[o.asset], w = o.w ?? 1, h = o.h ?? 1;
  const [cx, cy] = o.at ?? [o.x + w / 2, o.y + h / 2];
  // (a thing standing in water is drawn from its picture without the rings, which the page draws moving: README §7)
  const file = a.sink?.body ?? a.file, p = await picture(file);
  const P = a.base === "corner" ? toIso(cx + w / 2, cy + h / 2) : toIso(cx, cy);
  if (a.base !== "corner" && !a.anchor) P.y += 8 * (w + h) * (a.foot ?? 0.45);
  let ax, ay;
  if (a.anchor) [ax, ay] = a.anchor;
  else {
    let top = p.ph, bottom = -1, minx = p.pw, maxx = -1;
    for (let y = 0; y < p.ph; y++) for (let x = 0; x < p.pw; x++) if (opaque(p, x, y)) { if (y < top) top = y; bottom = y; if (x < minx) minx = x; if (x > maxx) maxx = x; }
    ay = bottom + 1;
    const band = (from) => { let s = 0, n = 0, mn = p.pw, mx = -1; for (let y = from; y <= bottom; y++) for (let x = 0; x < p.pw; x++) if (opaque(p, x, y)) { s += x; n++; if (x < mn) mn = x; if (x > mx) mx = x; } return { mean: s / n, mid: (mn + mx) / 2 }; };
    if (a.base === "corner") ax = band(bottom - 2).mean + 0.5;
    else if (a.center === "base" || a.center === "mean") { const b = band(bottom - Math.max(2, Math.floor((bottom - top) / 12))); ax = a.center === "mean" ? b.mean : b.mid; }
    else ax = (minx + maxx) / 2;
  }
  const k = (a.display?.h ? a.display.h / p.ph : a.display?.w ? a.display.w / p.pw : (a.scale ?? 0.5)) * (o.scale ?? 1);
  if (o.flip) ax = p.pw - ax;
  return { a, file, p, cx, cy, w, h, k, left: P.x - ax * k, top: P.y - ay * k, flip: !!o.flip };
}
/** Whether a picture, drawn where it is, is opaque at an isometric point (`lift` pixels up the screen from it). */
function drawnAt(pl, ix, iy, lift = 0) {
  let px = (ix - pl.left) / pl.k, py = (iy - lift - pl.top) / pl.k;
  if (pl.flip) px = pl.p.pw - 1 - px;
  return opaque(pl.p, px, py);
}

/* ── the walk grid ───────────────────────────────────────────────────────────────────────────────────────────────── */

// "." ground, "~" water, "#" something stands there, "=" a deck (boards, over water or not), "h" the kitchen hall's walls
const walk = Array.from({ length: ROWS }, (_, ty) => Array.from({ length: COLS }, (_, tx) => (wetTile(tx, ty) ? "~" : ".")));
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < COLS && y < ROWS) walk[y][x] = c; };
const inBox = (x, y, pl, pad = 0) => x + 0.5 >= pl.cx - pl.w / 2 - pad && x + 0.5 <= pl.cx + pl.w / 2 + pad && y + 0.5 >= pl.cy - pl.h / 2 - pad && y + 0.5 <= pl.cy + pl.h / 2 + pad;
/** How high a deck's boards stand over the ground, in isometric pixels, as the pictures draw them. */
const DECK_LIFT = { bridge: 10, fishing_pier: 14, pier_of_mossy: 18 };

/**
 * What this town has that the editor's export has not: two more clay stoves along the kitchen hall's back wall and a
 * worktable, each the export's own picture placed again (the hall is the cooking yard's: three stoves and a worktable,
 * as the yard had; lib/town/town2's T2_KITCHEN).
 */
const EXTRA = [
  { like: "japanese_kamado_clay_cooking_stove_with_~87", at: [68.5, 46.5] },
  { like: "japanese_kamado_clay_cooking_stove_with_~87", at: [70.5, 46.5] },
  { like: "long_low_wooden_dining_table_with_a_plan", at: [73.6, 46.65] },
];
for (const [n, e] of EXTRA.entries()) {
  const t = map.objects.find((o) => o.asset === e.like);
  if (!t) throw new Error(`no ${e.like} to place again`);
  const w = t.w ?? 1, h = t.h ?? 1, box = [e.at[0] - w / 2, e.at[1] - h / 2, e.at[0] + w / 2, e.at[1] + h / 2], tiles = [];
  for (let y = Math.floor(box[1]); y <= Math.floor(box[3]); y++) for (let x = Math.floor(box[0]); x <= Math.floor(box[2]); x++) {
    if (x + 0.5 >= box[0] && x + 0.5 <= box[2] && y + 0.5 >= box[1] && y + 0.5 <= box[3]) tiles.push([x, y]);
  }
  map.objects.push({ ...t, id: `extra:${n}:${e.like}`, at: e.at, x: Math.floor(box[0]), y: Math.floor(box[1]), tiles: tiles.length ? tiles : [[Math.floor(e.at[0]), Math.floor(e.at[1])]] });
}

const placed = [];
for (const o of map.objects) {
  const pl = await placeOf(o);
  placed.push({ o, pl });
}
// decks first, so that what stands on them closes their tiles again
for (const { o, pl } of placed) {
  if (walkOf(o.asset) !== "deck") continue;
  if (o.asset.startsWith("bridge")) {
    // a bridge: the two rows of tiles nearest its middle line, all along it (its rails stand on the rows outside them);
    // walked on where its boards lift the walker (lib/town/town2's liftAt)
    const along = pl.w >= pl.h;
    for (let y = Math.floor(pl.cy - pl.h / 2); y <= Math.floor(pl.cy + pl.h / 2); y++) for (let x = Math.floor(pl.cx - pl.w / 2); x <= Math.floor(pl.cx + pl.w / 2); x++) {
      if (!inBox(x, y, pl) || Math.abs((along ? y : x) + 0.5 - (along ? pl.cy : pl.cx)) > 0.9) continue;
      set(x, y, "=");
    }
    continue;
  }
  const lift = DECK_LIFT[Object.keys(DECK_LIFT).find((k) => o.asset.startsWith(k))];
  const r = Math.ceil(Math.max(pl.w, pl.h) / 2) + 1;
  for (let y = Math.floor(pl.cy) - r; y <= Math.floor(pl.cy) + r; y++) for (let x = Math.floor(pl.cx) - r; x <= Math.floor(pl.cx) + r; x++) {
    if (!inBox(x, y, pl)) continue;
    const c = toIso(x + 0.5, y + 0.5);
    // boards over the tile's middle, and over most of the tile round it: a tile the deck only grazes is not walked
    const hits = [[0, 0], [-10, 0], [10, 0], [0, -4], [0, 4]].filter(([dx, dy]) => drawnAt(pl, c.x + dx, c.y + dy, lift)).length;
    // (and not under the fishing pier's hut, which stands on its boards: looked at in the picture, 2026-10-22)
    const hut = o.asset.startsWith("fishing_pier") && x >= 10 && x <= 14 && y >= 56 && y <= 59;
    if (hits >= 4) set(x, y, hut ? "#" : "=");
  }
}
for (const { o, pl } of placed) {
  const how = walkOf(o.asset);
  if (how === "flat" || how === "ring" || how === "deck" || how === "inside") continue;
  if (how === "trunk") { set(Math.floor(pl.cx), Math.floor(pl.cy), "#"); continue; }
  const tiles = o.tiles?.length ? o.tiles : [[Math.floor(pl.cx), Math.floor(pl.cy)]];
  if (how === "through") {
    // only where the picture stands on the ground: its posts (a tile whose middle, or a point near it, is drawn on)
    for (const [x, y] of tiles) {
      const c = toIso(x + 0.5, y + 0.5);
      if ([[0, -2], [-6, -2], [6, -2]].some(([dx, dy]) => drawnAt(pl, c.x + dx, c.y + dy))) set(x, y, "#");
    }
    continue;
  }
  for (const [x, y] of tiles) set(x, y, how === "hall" ? "h" : "#");
}

/* ── the pictures, cut and written ───────────────────────────────────────────────────────────────────────────────── */

const sprites = [], spriteOf = new Map(); // source file -> index
async function sprite(file) {
  if (spriteOf.has(file)) return spriteOf.get(file);
  const p = await picture(file);
  let x0 = p.pw, y0 = p.ph, x1 = -1, y1 = -1;
  for (let y = 0; y < p.ph; y++) for (let x = 0; x < p.pw; x++) if (p.data[(y * p.pw + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const buf = await sharp(p.data, { raw: { width: p.pw, height: p.ph, channels: 4 } }).extract({ left: x0, top: y0, width: w, height: h }).webp({ lossless: true, effort: 6 }).toBuffer();
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10);
  const slug = path.basename(file, ".png").replace(/~.*$/, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 28).replace(/-$/, "");
  const name = `${slug}-${hash}.webp`;
  // (the same picture placed twice, or under two names, is one file)
  let i = sprites.findIndex((s) => s.src === name);
  if (i < 0) { fs.writeFileSync(path.join(OUT, name), buf); i = sprites.push({ src: name, w, h, cut: [x0, y0, p.pw, p.ph] }) - 1; }
  spriteOf.set(file, i);
  return i;
}

/**
 * How each thing is drawn among the walkers (lib/town/town2-art):
 * 0 `floor`: on the ground under everybody (a ring, stepping stones, the inside of the kitchen hall, a deck walked on);
 * 1 `stand`: back to front with the walkers, by its middle (README's order);
 * 2 `wide`: a thing too wide for one place in that order (a building, the water wheel): drawn in narrow upright strips,
 *   each as far forward as its footprint's front edge below it, so that whoever stands beside it is in front or behind
 *   as they should be. The editor's "overhead" (its way of putting a few things over their neighbours) is not kept:
 *   the strips do that job, and a walker is never under a bush they stand in front of.
 */
const DRAW = { floor: 0, stand: 1, wide: 2 };
/**
 * The things whose lanterns or fire glow at night, and how many of their brightest warm spots: found in the picture
 * (looked at for each, 2026-10-22: the hall's paper lanterns, the shop's, the stall's, the forge's fire, the bathhouse's
 * door lamps). The stone lanterns and the lantern posts are the game's lamps (lib/town/town2's props) and glow as such.
 */
const LIGHTS = [[/^kitchen_house$/, 5], [/^machiya_shop$/, 2], [/^yatai$/, 2], [/^forge$/, 1], [/^bathhouse$/, 2]];
/** A picture's warm bright spots (lantern paper lit, a fire's mouth), largest first: [x, y, pixels]. */
function warmSpots(p, n) {
  const W = p.pw, H = p.ph, hit = new Uint8Array(W * H), seen = new Uint8Array(W * H), out = [];
  for (let i = 0; i < W * H; i++) { const r = p.data[i * 4], g = p.data[i * 4 + 1], b = p.data[i * 4 + 2]; if (p.data[i * 4 + 3] > 200 && r > 225 && g > 140 && b < 170 && r - b > 90) hit[i] = 1; }
  for (let i = 0; i < W * H; i++) {
    if (!hit[i] || seen[i]) continue;
    const st = [i]; let sx = 0, sy = 0, c = 0; seen[i] = 1;
    while (st.length) {
      const j = st.pop(), x = j % W, y = (j / W) | 0; sx += x; sy += y; c++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = Y * W + X; if (X >= 0 && Y >= 0 && X < W && Y < H && hit[k] && !seen[k]) { seen[k] = 1; st.push(k); } }
    }
    if (c >= 12) out.push([Math.round(sx / c), Math.round(sy / c), c]);
  }
  return out.sort((a, b) => b[2] - a[2]).slice(0, n);
}
const names = [], nameOf = (n) => { let i = names.indexOf(n); if (i < 0) i = names.push(n) - 1; return i; };
const objects = [], rings = {}, lights = {};
for (const { o, pl } of placed) {
  const s = await sprite(pl.file), sp = sprites[s], [x0, y0, pw] = sp.cut;
  // the cut picture's own top-left, where the whole one's was drawn (mirrored, the cut's left is measured from the right)
  const left = pl.left + (pl.flip ? pw - x0 - sp.w : x0) * pl.k, top = pl.top + y0 * pl.k;
  const how = walkOf(o.asset), layer = o.layer ?? ((o.kind ?? pl.a.kind) === "decal" ? "decal" : "main");
  const draw = layer === "decal" || how === "ring" || how === "deck" || how === "inside" || /stepping_stones/.test(o.asset) ? DRAW.floor
    : pl.w + pl.h >= 4 && how !== "trunk" ? DRAW.wide : DRAW.stand;
  // [name, picture, left, top, scale, mirrored, how drawn, order, footprint x0 y0 x1 y1]
  objects.push([nameOf(o.asset.replace(/~.*$/, "")), s, +left.toFixed(2), +top.toFixed(2), +pl.k.toFixed(5), pl.flip ? 1 : 0, draw,
    +(pl.cx + pl.cy + (o.z ?? 0)).toFixed(3), +(pl.cx - pl.w / 2).toFixed(3), +(pl.cy - pl.h / 2).toFixed(3), +(pl.cx + pl.w / 2).toFixed(3), +(pl.cy + pl.h / 2).toFixed(3)]);
  // what of it glows at night: its lanterns' and its fire's brightest warm spots, in isometric pixels (LIGHTS below)
  const glow = LIGHTS.find(([re]) => re.test(o.asset));
  if (glow) lights[objects.length - 1] = warmSpots(pl.p, glow[1]).map(([x, y, n]) =>
    [+(pl.left + (pl.flip ? pl.p.pw - x : x) * pl.k).toFixed(1), +(pl.top + y * pl.k).toFixed(1), Math.min(3, Math.max(1, Math.round(Math.sqrt(n) / 8)))]);
  // where its legs meet the water, in isometric pixels, and which rings: README §7 (the rings are drawn moving there)
  if (pl.a.sink) rings[objects.length - 1] = pl.a.sink.lines.map(([x, y, , size]) =>
    [+(pl.left + (pl.flip ? pl.p.pw - x : x) * pl.k).toFixed(1), +(pl.top + y * pl.k).toFixed(1), String(size)]);
}

/* ── the water's rings ───────────────────────────────────────────────────────────────────────────────────────────── */

// every size's two strips (behind and before the legs), one under another in one picture: a page fetches it once
const ripples = { frames: map.ripples?.frames ?? 2, fps: map.ripples?.fps ?? 1, src: "", sizes: {} };
{
  const parts = [];
  for (const [size, r] of Object.entries(map.ripples?.sizes ?? {})) for (const side of ["back", "front"]) parts.push({ size, side, r, file: path.join(SRC, r[side]) });
  let y = 0, W = 0;
  for (const p of parts) { const m = await sharp(p.file).metadata(); p.w = m.width; p.h = m.height; p.y = y; y += m.height; W = Math.max(W, m.width); }
  const sheet = await sharp({ create: { width: W, height: Math.max(1, y), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts.map((p) => ({ input: p.file, left: 0, top: p.y }))).webp({ lossless: true }).toBuffer();
  ripples.src = `ripples-${crypto.createHash("sha1").update(sheet).digest("hex").slice(0, 10)}.webp`;
  fs.writeFileSync(path.join(OUT, ripples.src), sheet);
  for (const p of parts) {
    const at = (ripples.sizes[p.size] ??= { frame: p.r.frame_size, centre: p.r.centre });
    at[p.side] = [0, p.y, p.w, p.h];
  }
}

/* ── the ground's pictures ───────────────────────────────────────────────────────────────────────────────────────── */

const textures = {};
for (const [name, t] of Object.entries(map.ground_textures)) {
  const v = t.variants?.[0] ?? t;
  const buf = await sharp(path.join(SRC, v.file)).png().toBuffer();
  const file = `ground-${name.replace(/_/g, "-")}-${crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10)}.png`;
  fs.writeFileSync(path.join(OUT, file), buf);
  textures[name] = { src: file, perTile: v.texels_per_tile ?? 32 };
}

/* ── written ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const out = {
  v: 1, cols: COLS, rows: ROWS, from: `oatto2-cash80x80v2, exported ${map.exported}`,
  legend: map.ground_legend, textures,
  wobble: { all: map.ground_edges?.wobble ?? 0.35, kinds: map.ground_edges?.kinds ?? {} },
  ground: map.ground, fine: fineRows,
  walk: walk.map((r) => r.join("")),
  sprites: sprites.map(({ src, w, h }) => [src, w, h]),
  names, objects, rings, lights, ripples,
};
fs.writeFileSync(JSON_OUT, JSON.stringify(out));
const count = (c) => out.walk.join("").split(c).length - 1;
console.log(`town2: ${objects.length} things, ${sprites.length} pictures, ${(fs.statSync(JSON_OUT).size / 1024).toFixed(0)} KB of map;`,
  `tiles: ground ${count(".")}, water ${count("~")}, closed ${count("#")}, deck ${count("=")}, hall ${count("h")}`);

/* ── a look at the rules ─────────────────────────────────────────────────────────────────────────────────────────── */

if (DEBUG) {
  const Q = +(process.env.Q ?? 0.25), ox = ROWS * 32, W = Math.ceil((COLS + ROWS) * 32 * Q), H = Math.ceil((COLS + ROWS) * 16 * Q) + 120;
  const comps = [];
  for (const [, si, ox0, oy0, ok, of] of objects) {
    const sp = sprites[si], w = Math.max(1, Math.round(sp.w * ok * Q)), h = Math.max(1, Math.round(sp.h * ok * Q));
    let img = sharp(path.join(OUT, sp.src)); if (of) img = img.flop();
    const left = Math.round((ox0 + ox) * Q), top = Math.round(oy0 * Q) + 100;
    if (left + w <= 0 || top + h <= 0 || left >= W || top >= H) continue;
    const buf = await img.resize(w, h, { kernel: "nearest" }).png().toBuffer();
    const cx0 = Math.max(0, -left), cy0 = Math.max(0, -top), cw = Math.min(w, W - left) - cx0, ch = Math.min(h, H - top) - cy0;
    comps.push({ input: cw === w && ch === h ? buf : await sharp(buf).extract({ left: cx0, top: cy0, width: cw, height: ch }).png().toBuffer(), left: left + cx0, top: top + cy0 });
  }
  const tint = { "~": "rgba(40,120,255,0.35)", "#": "rgba(255,40,40,0.45)", "=": "rgba(255,220,0,0.55)", h: "rgba(255,0,200,0.5)" };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = walk[y][x], pts = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([a, b]) => { const p = toIso(a, b); return `${((p.x + ox) * Q).toFixed(1)},${(p.y * Q + 100).toFixed(1)}`; }).join(" ");
    svg += `<polygon points="${pts}" fill="${tint[c] ?? "rgba(0,0,0,0)"}" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>`;
  }
  svg += "</svg>";
  const base = await sharp({ create: { width: W, height: H, channels: 4, background: "#14171d" } }).composite(comps).png().toBuffer();
  await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toFile(DEBUG);
  console.log("debug picture:", DEBUG);
}
