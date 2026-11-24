// Cash Town's first festival, Loy Krathong (2026-11-22): the parts a member puts a krathong together from, and the
// festival's two props on the new town map.
//
//   node build-krathong.mjs [--out <tree>] [--look <dir>]
//
// Writes <tree>/public/town/krathong-<hash>.png and <tree>/lib/town/krathong-art.json (the tree is this script's own
// checkout unless --out says otherwise). The sheets are read from work/out (in a worktree, link work to fcnext's, as the
// README says). --look writes the contact sheets the art is judged by: every base with every ring, each with a
// centrepiece, both lights and the trims, at 4x; the same at 1x on the river's water beside a character; each part
// alone at 6x over magenta; the props at map scale beside the Popoto Board and a character.
//
// The krathong is drawn by layering sub-rects of the one picture on a CANVAS 48 art pixels wide at a whole zoom, back to
// front: base, ring back half, light (three flicker frames), centrepiece, ring front half, trims. Every part's `place` is
// its top-left inside the canvas; trims are set at TRIMS (their bottom middles). The plan was 48 x 40 with a base 44 x 16;
// the model drew the platforms seen more from above (a top oval 18 to 20 rows deep, a side 11 to 13), which sits better
// on the town's 2:1 water, so the canvas is as tall as the tallest combination needs (50; 51 since the moon rabbit of
// 2026-11-24, whose ears stand a row above every earlier centrepiece) and the trims keep the plan's
// places against the base's last row. Each sheet is cut on one grid of its own (`range`), a mode colour a cell, as
// build-icons.mjs cuts icons, chosen so that every part comes out at one art pixel size: bases and rings about 45 wide,
// centrepieces about 20 x 26, the light 11 to 14 wide, trims 8 to 14.
//
// On the map (town2's things are drawn at their picture's pixels x k): MAP_SCALE map px to one art pixel of the parts,
// the avatars' own (pixeldoll's DOLL_PX); each prop has its own `scale`. The hall's `slots` are where a winner's krathong
// stands on each pedestal (its bottom middle), in the hall's own art pixels.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const SHEETS_DIR = process.env.KT_SHEETS ?? path.join(HERE, "work", "out");
const ROOT = path.resolve(HERE, "../../../../..");
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const TREE = arg("--out", ROOT);
const PUB = path.join(TREE, "public/town");
const JSON_OUT = path.join(TREE, "lib/town/krathong-art.json");
const LOOK = arg("--look", "");

// (its height is found below: the tallest of every combination, the base on its last row)
export const CANVAS = [48, 0];
/** Where the game sets the three trims (their bottom middles), front rim left, front middle, front rim right: as the
 *  first plan of a 48 x 40 canvas had them, against the base's last row (39 there). */
export let TRIMS = [[10, -6], [24, -2], [38, -6]];
/** Where a centrepiece and a light stand: across from the canvas's middle, and up from the top oval's middle. */
const CENTRE_AT = [+(process.env.KT_CDX ?? -2), +(process.env.KT_CUP ?? 3)], LIGHT_AT = [+(process.env.KT_LDX ?? 8), +(process.env.KT_LUP ?? 6)];
/** Map px to one art pixel: the krathong's parts at the avatars' own pixel size (pixeldoll's DOLL_PX, 0.67), so that a
 *  krathong on the river is about half a tile wide; the props a little coarser, between the avatars and town2's own things
 *  (the Popoto Board about 0.85, the trade board about 1.08), which makes the stall about the Popoto Board's width. */
const MAP_SCALE = 0.67, PROP_SCALE = { stall: 0.8, hall: 0.8 };
/** The hall's three pedestals (left, middle, right): where a krathong's bottom middle stands, in the hall's art pixels.
 *  Measured on the drawing: the plates' top ovals' middles (52,123), (104,130), (155,139); a krathong's bottom middle is
 *  the front of its underside, about 6 hall px nearer than its middle at the size it is shown there. */
const HALL_SLOTS = [[52, 128], [104, 136], [155, 145]];
const BASE_ROW = 200; // the base's last row while the parts are laid out; the canvas is cut to them after

// [sheet, names left to right, options]; a name beginning `_` is drawn only to hold the sheet's size and is not packed.
// `range`: the grid looked for, in the sheet's own pixels (KT_RANGE_<sheet>=a-b tries another).
const SHEETS = [
  // (krathong-bases-2 is an in-place edit of krathong-bases: the log slice, the scored loaf and ruffled marigolds, which
  // read as a dish, a dish and oranges in the first; every part is taken from the edit, so that all six are one drawing)
  ["krathong-bases-2", ["b_wood", "b_leaf", "b_bread", "r_leaf", "r_lotus", "_r_marigold"], { range: [11.2, 11.6] }],
  // (krathong-bases-3, an in-place edit of -2 that changed only the marigolds: their dark middles still read as orange
  // slices (Codex's second look); only that ring is taken from it)
  ["krathong-bases-3", ["_b_wood", "_b_leaf", "_b_bread", "_r_leaf", "_r_lotus", "r_marigold"], { range: [11.2, 11.6] }],
  ["krathong-lights", ["l_candle#0", "l_candle#1", "l_candle#2", "l_firefly#0", "l_firefly#1", "l_firefly#2"], { range: [13.5, 14.3] }],
  // (the centrepieces on their chunky grid: on their finer one, 5.5, they are 40 across; cut coarser, 13.5, the bouquet
  // went to mush)
  ["krathong-centre-a", ["c_flower", "c_mushroom", "c_shell", "c_butterfly", "c_crystal", "c_carving"], { range: [10.6, 11.1] }],
  ["krathong-centre-b", ["c_sweets", "c_feather", "c_bell", "c_lily", "_flower", "_shell"], { range: [10.6, 11.1] }],
  // (the trims: each sheet's first is a centrepiece drawn again only to hold the size, so that the charms come out at a
  // centrepiece's pixel size and a third to a half its height; krathong-trims-a, drawn without one, came out as large as
  // the centrepieces and is not used)
  ["krathong-trims-c", ["_cflower", "t_flower", "t_mushroom", "t_shell", "t_butterfly", "t_crystal"], { range: [13.5, 14.1] }],
  ["krathong-trims-d", ["_csweets", "t_carving", "t_sweets", "t_feather", "t_bell", "t_lily"], { range: [12.7, 13.3] }],
  // ── the second round of parts (2026-11-24, the owner: "อยากให้มีแบบกระทงมากกว่านี้ เน้นความหลากหลาย") ──
  // (krathong-bases-4, an in-place edit of -3 that turned all six into new parts: a banana-trunk slice, a half coconut,
  // a lily pad on a lily pad; rings of rose petals, pandan loops and scallop shells. The model drew them a sixteenth
  // larger than -3 on the same pixel (rings 49 to 51 wide on -3's grid, 11.5, the lily pad 49: past the canvas), so
  // the sheet is cut on 12.28, which gives the rings -3's rings' size (46 to 48 x 27 to 28) and stays crisp: its cells
  // still one colour each, the outline one cell. Its rose ring read as a ring of apples and is taken from -5)
  ["krathong-bases-4", ["b_trunk", "b_coconut", "b_lilypad", "_r_rose", "r_pandan", "r_shell"], { range: [12.1, 12.4] }],
  // (krathong-bases-5, an in-place edit of -4 that changed only the rose ring: rose heads curled in a spiral)
  ["krathong-bases-5", ["_b_trunk", "_b_coconut", "_b_lilypad", "r_rose", "_r_pandan", "_r_shell"], { range: [12.1, 12.4] }],
  // (a red paper lantern on a bamboo stick, its light patch growing and shrinking; a candle with incense in a cup)
  ["krathong-lights-2", ["l_lantern#0", "l_lantern#1", "l_lantern#2", "l_incense#0", "l_incense#1", "l_incense#2"], { range: [13.5, 14.3] }],
  // (krathong-centre-a as the reference, the bouquet and the mushrooms drawn again only to hold the size: on 10.96 they
  // come out at their first drawing's 21x26 and 20x26, on the first sheets' range (10.65) a row taller. The rabbit's
  // ears make it 27 rows, one more than any centrepiece before it, so the canvas is 51 rows, not 50)
  ["krathong-centre-c", ["c_lotusbud", "c_star", "c_koi", "c_rabbit", "_flower2", "_mushroom2"], { range: [10.9, 11.2] }],
  // (krathong-trims-c as the reference: its bouquet drawn again as the anchor, its shell charm as a filler)
  ["krathong-trims-e", ["_cflower2", "t_star", "t_bow", "t_lantern", "t_moon", "_tshell"], { range: [13.5, 14.1] }],
];
/** The parts of each kind, in the order they were added. The platforms' common top oval (where every ring stands) is
 *  measured on the first three only, so that the parts of the first round keep their places as more are added; a later
 *  base is an in-place edit of their sheet and lies on the same oval. */
const BASES = ["b_wood", "b_leaf", "b_bread", "b_trunk", "b_coconut", "b_lilypad"], OVAL_BASES = BASES.slice(0, 3);
const RINGS = ["r_leaf", "r_lotus", "r_marigold", "r_rose", "r_pandan", "r_shell"];
// the props for town2, one row: a tall lantern post only to hold the scale, the stall, the hall of fame stand
const PROPS = ["krathong-props", ["_post", "stall", "hall"], { range: [4.5, 8] }];

const rangeOf = (sheet, opts) => {
  const e = process.env[`KT_RANGE_${sheet.replace(/-/g, "_")}`];
  return e ? e.split("-").map(Number) : opts.range;
};

/* ── cutting ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A see-through patch of `most` cells or fewer that the figure closes in on takes the commonest colour round it. */
function closeSmallHoles(img, most = 8) {
  const { w, h, buf } = img, op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && buf[(y * w + x) * 4 + 3] > 0;
  const seen = new Uint8Array(w * h);
  let filled = 0;
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || op(s % w, (s / w) | 0)) continue;
    const patch = [s]; let open = false; seen[s] = 1;
    for (let n = 0; n < patch.length; n++) {
      const q = patch[n], qx = q % w, qy = (q / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = qx + dx, Y = qy + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) { open = true; continue; }
        const j = Y * w + X; if (!seen[j] && !op(X, Y)) { seen[j] = 1; patch.push(j); }
      }
    }
    if (open || patch.length > most) continue;
    const near = new Map();
    for (const q of patch) for (const j of [q - 1, q + 1, q - w, q + w]) if (j >= 0 && j < w * h && buf[j * 4 + 3]) { const k = buf.readUInt32LE(j * 4); near.set(k, (near.get(k) ?? 0) + 1); }
    const k = [...near].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (k === undefined) continue;
    for (const q of patch) buf.writeUInt32LE(k, q * 4);
    filled += patch.length;
  }
  return filled;
}

/** Only the largest piece (8-connected) and pieces of at least `keep` cells; returns what was dropped. */
function dropSpecks(img, keep = 4) {
  const { w, h, buf } = img, lab = new Int32Array(w * h).fill(-1), parts = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] >= 0 || !buf[s * 4 + 3]) continue;
    const st = [s], mem = []; lab[s] = parts.length;
    while (st.length) { const q = st.pop(); mem.push(q); const qx = q % w, qy = (q / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = qx + dx, Y = qy + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (buf[j * 4 + 3] && lab[j] < 0) { lab[j] = parts.length; st.push(j); } } }
    parts.push(mem);
  }
  const most = Math.max(0, ...parts.map((p) => p.length));
  let dropped = 0;
  for (const p of parts) if (p.length < most && p.length < keep) { for (const q of p) buf.writeUInt32LE(0, q * 4); dropped += p.length; }
  return dropped;
}

/** Trim an image to its opaque box. */
function tight(img) {
  const { w, h, buf } = img; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (buf[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { w: 0, h: 0, buf: Buffer.alloc(0), x0: 0, y0: 0 };
  const W = x1 - x0 + 1, H = y1 - y0 + 1, out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) buf.copy(out, y * W * 4, ((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4);
  return { w: W, h: H, buf: out, x0, y0 };
}

/** A sheet of n things in a row → each thing's picture, cut on the sheet's grid (build-icons.mjs's way: every piece to
 *  the column its middle is in). */
async function cutRow(sheet, names, opts) {
  const file = path.join(SHEETS_DIR, `${sheet}.png`);
  if (!fs.existsSync(file)) { console.log(`no ${sheet}`); return null; }
  const raw = await L.loadRaw(file);
  const grid = L.detectGrid(raw, undefined, rangeOf(sheet, opts));
  const g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], opts.colours ?? 48));
  const parts = L.components(g).filter((c) => c.mem.length >= 2);
  const out = {};
  let figs;
  if (opts.spans) figs = L.figures(g, L.spansOf(g, names.length));
  else {
    const xs = parts.flatMap((c) => c.mem.map((i) => i % g.GW));
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, col = (x1 - x0) / names.length;
    figs = names.map(() => new Set());
    for (const c of parts) { const mid = c.mem.reduce((t, i) => t + (i % g.GW), 0) / c.mem.length; for (const i of c.mem) figs[Math.min(names.length - 1, Math.floor((mid - x0) / col))].add(i); }
  }
  names.forEach((name, k) => {
    if (!figs[k]?.size) { console.log(`  ${sheet} ${name}: nothing found`); return; }
    const im = L.crop(g, figs[k]);
    out[name] = { w: im.w, h: im.h, buf: im.buf };
  });
  return { grid: grid.p, out };
}

/* ── the krathong's parts ────────────────────────────────────────────────────────────────────────────────────────── */

const px = (im, x, y) => (x < 0 || y < 0 || x >= im.w || y >= im.h ? 0 : im.buf[(y * im.w + x) * 4 + 3]);

/** A platform seen from the front and above: its side band's thickness is the height of its outermost columns, its top
 *  oval is the rest. */
function platformShape(im) {
  const colH = (x) => { let n = 0; for (let y = 0; y < im.h; y++) if (px(im, x, y)) n++; return n; };
  const side = Math.round((colH(0) + colH(1) + colH(im.w - 1) + colH(im.w - 2)) / 4);
  return { side, top: im.h - side };
}

/** A ring split at its opening: in a column through the opening what lies below it is the near half (drawn in front of
 *  the centrepiece), what lies above it the far half; in a column beside the opening, what lies below the oval's middle
 *  is the near half. */
function splitRing(im, midY) {
  // the opening: clear cells not reached from the picture's edge
  const seen = new Uint8Array(im.w * im.h), st = [];
  const push = (x, y) => { const i = y * im.w + x; if (!seen[i] && !px(im, x, y)) { seen[i] = 1; st.push(i); } };
  for (let x = 0; x < im.w; x++) { push(x, 0); push(x, im.h - 1); }
  for (let y = 0; y < im.h; y++) { push(0, y); push(im.w - 1, y); }
  while (st.length) { const q = st.pop(), qx = q % im.w, qy = (q / im.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = qx + dx, Y = qy + dy; if (X >= 0 && Y >= 0 && X < im.w && Y < im.h) push(X, Y); } }
  const hole = (x, y) => !px(im, x, y) && !seen[y * im.w + x];
  const back = { w: im.w, h: im.h, buf: Buffer.alloc(im.buf.length) }, front = { w: im.w, h: im.h, buf: Buffer.alloc(im.buf.length) };
  let holeCells = 0;
  for (let x = 0; x < im.w; x++) {
    let hy0 = -1, hy1 = -1;
    for (let y = 0; y < im.h; y++) if (hole(x, y)) { holeCells++; if (hy0 < 0) hy0 = y; hy1 = y; }
    for (let y = 0; y < im.h; y++) {
      if (!px(im, x, y)) continue;
      const isFront = hy0 >= 0 ? y > hy1 : y > midY;
      const to = isFront ? front : back, o = (y * im.w + x) * 4;
      im.buf.copy(to.buf, o, o, o + 4);
    }
  }
  return { back, front, holeCells };
}

/** Light frames: each laid on the first where most of their cells agree, then the first's body kept in every frame,
 *  so only the flame (or the fireflies) moves. `moving(rgb)` says which colours are the moving part. */
function steadyFrames(frames, moving, band = false) {
  const A = frames[0];
  const at = frames.map((B, i) => {
    if (!i) return { dx: 0, dy: 0 };
    let best = { n: -1, dx: 0, dy: 0 };
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      let n = 0;
      for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) { if (!px(A, x, y) || !px(B, x + dx, y + dy)) continue; const o = (y * A.w + x) * 4, q = ((y + dy) * B.w + x + dx) * 4; if (Math.abs(A.buf[o] - B.buf[q]) + Math.abs(A.buf[o + 1] - B.buf[q + 1]) + Math.abs(A.buf[o + 2] - B.buf[q + 2]) < 40) n++; }
      if (n > best.n) best = { n, dx, dy };
    }
    return best;
  });
  // the box of them all, in the first's frame
  const x0 = Math.min(0, ...at.map((b) => -b.dx)), y0 = Math.min(0, ...at.map((b) => -b.dy));
  const x1 = Math.max(...frames.map((f, i) => f.w - at[i].dx)), y1 = Math.max(...frames.map((f, i) => f.h - at[i].dy));
  const w = x1 - x0, h = y1 - y0;
  const laid = frames.map((f, i) => {
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const X = x - at[i].dx - x0, Y = y - at[i].dy - y0; if (X >= 0 && Y >= 0 && X < w && Y < h) f.buf.copy(buf, (Y * w + X) * 4, (y * f.w + x) * 4, (y * f.w + x) * 4 + 4); }
    return { w, h, buf };
  });
  const first = laid[0], rgb = (im, i) => [im.buf[i * 4], im.buf[i * 4 + 1], im.buf[i * 4 + 2], im.buf[i * 4 + 3]];
  if (band === "box") {
    // what moves is where the frames differ most: the largest patch of cells that differ from the first frame (with
    // any patch that touches its box), grown a cell for the outline round it, is the frame's own; every other cell is
    // the first's, so a cell of the body drawn a shade differently does not flicker. For a light whose moving part is
    // not set off by a band of rows (the lantern's patch of light inside its paper; a candle's flame beside the incense,
    // whose glowing tips are flame-coloured too).
    const differs = (f, i) => { const a = rgb(first, i), b = rgb(f, i); return !a[3] !== !b[3] || (a[3] && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) >= 40); };
    return laid.map((f, k) => {
      if (!k) return f;
      const lab = new Int32Array(w * h).fill(-1), pts = [];
      for (let s = 0; s < w * h; s++) {
        if (lab[s] >= 0 || !differs(f, s)) continue;
        const st = [s], mem = []; lab[s] = pts.length;
        while (st.length) { const q = st.pop(); mem.push(q); const qx = q % w, qy = (q / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = qx + dx, Y = qy + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (lab[j] < 0 && differs(f, j)) { lab[j] = pts.length; st.push(j); } } }
        pts.push(mem);
      }
      const buf = Buffer.from(first.buf);
      if (!pts.length) return { w, h, buf };
      const boxOf = (mem) => mem.reduce((b, q) => [Math.min(b[0], q % w), Math.min(b[1], (q / w) | 0), Math.max(b[2], q % w), Math.max(b[3], (q / w) | 0)], [w, h, -1, -1]);
      const big = pts.reduce((a, b) => (b.length > a.length ? b : a));
      let box = boxOf(big);
      for (const p of pts) { const b = boxOf(p); if (p !== big && b[0] <= box[2] + 1 && b[2] >= box[0] - 1 && b[1] <= box[3] + 1 && b[3] >= box[1] - 1) box = [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]; }
      const [bx0, by0, bx1, by1] = [box[0] - 1, box[1] - 1, box[2] + 1, box[3] + 1];
      let kept = 0;
      for (let y = Math.max(0, by0); y <= Math.min(h - 1, by1); y++) for (let x = Math.max(0, bx0); x <= Math.min(w - 1, bx1); x++) { const i = y * w + x; f.buf.copy(buf, i * 4, i * 4, i * 4 + 4); }
      for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0; if ((x < bx0 || x > bx1 || y < by0 || y > by1) && differs(f, i)) kept++; }
      boxReport.push(`  frame ${k}: its own in [${bx0},${by0}]-[${bx1},${by1}], ${kept} other cell(s) that differ kept as the first frame's`);
      return { w, h, buf };
    });
  }
  if (band === "side") {
    // a candle with something standing beside it (the incense in its cup): the candle's rule (above the wax's top row,
    // the frame's own) only in the candle's columns, its cream body and the outline right of it; every other cell the
    // first frame's. The incense's third frame was drawn with a shorter candle and its own cup and sticks: taken whole,
    // the sticks jumped.
    const cream = (i) => { const [r, g, b, a] = rgb(first, i); if (!a) return false; const [, s, l] = L.hsl(r, g, b); return s < 0.4 && l > 0.6; };
    let creamX = -1; for (let i = 0; i < w * h; i++) if (cream(i)) creamX = Math.max(creamX, i % w);
    const splitX = creamX + 2;
    const rowN = (im, y) => { let n = 0; for (let x = 0; x < splitX; x++) if (im.buf[(y * w + x) * 4 + 3]) n++; return n; };
    const bodyW = Math.max(...Array.from({ length: h }, (_, y) => rowN(first, y)));
    let waxTop = 0; while (waxTop < h && rowN(first, waxTop) < bodyW * 0.7) waxTop++;
    boxReport.push(`: the candle's columns 0-${splitX - 1}, its wax from row ${waxTop}`);
    return laid.map((f, k) => {
      if (!k) return f;
      const buf = Buffer.from(first.buf);
      for (let y = 0; y < waxTop; y++) for (let x = 0; x < splitX; x++) { const i = y * w + x; f.buf.copy(buf, i * 4, i * 4, i * 4 + 4); }
      return { w, h, buf };
    });
  }
  if (band) {
    // a flame: everything above the wax's top row is the frame's own (the flame with its outline and the wick), the wax
    // the first frame's. (Taking only the flame's colours left the first frame's flame outline in the leaning one.) The
    // wax's top row is the first as wide as most of the body.
    const rowN = (im, y) => { let n = 0; for (let x = 0; x < w; x++) if (im.buf[(y * w + x) * 4 + 3]) n++; return n; };
    const bodyW = Math.max(...Array.from({ length: h }, (_, y) => rowN(first, y)));
    let waxTop = 0; while (waxTop < h && rowN(first, waxTop) < bodyW * 0.7) waxTop++;
    const out = laid.map((f) => { const buf = Buffer.from(first.buf); f.buf.copy(buf, 0, 0, waxTop * w * 4); buf.fill(0, 0, 0); f.buf.copy(buf, 0, 0, waxTop * w * 4); return { w, h, buf }; });
    // a one-cell bump on the wax's outline (a cell with one neighbour, beside the body) is a speck, in every frame
    for (let y = waxTop; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!first.buf[i * 4 + 3]) continue;
      let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && first.buf[(Y * w + X) * 4 + 3]) n++; }
      if (n <= 1) for (const o of out) o.buf.writeUInt32LE(0, i * 4);
    }
    return out;
  }
  return laid.map((f, k) => {
    if (!k) return f;
    const buf = Buffer.from(first.buf);
    for (let i = 0; i < w * h; i++) {
      const a = rgb(first, i), b = rgb(f, i);
      // a cell is the moving part's when either frame has the moving part's colour there (or nothing in one and the
      // moving part in the other)
      if ((a[3] && moving(a)) || (b[3] && moving(b))) f.buf.copy(buf, i * 4, i * 4, i * 4 + 4);
    }
    return { w, h, buf };
  });
}

/** A flame's colours: warm and bright (and the dark outline round it is handled by the caller's box). */
const flameish = ([r, g, b]) => { const [hh, s, l] = L.hsl(r, g, b); return (hh <= 60 || hh >= 350) && s > 0.45 && l > 0.45; };
/** A firefly's colours: yellow-green and bright. */
const fireflyish = ([r, g, b]) => { const [hh, s, l] = L.hsl(r, g, b); return hh >= 55 && hh <= 100 && s > 0.35 && l > 0.45; };

/* ── checks: the owner's no-pixel-bug rule ───────────────────────────────────────────────────────────────────────── */

function bugs(im, { holesOk = false } = {}) {
  const { w, h, buf } = im;
  let semi = 0; for (let i = 3; i < buf.length; i += 4) if (buf[i] > 0 && buf[i] < 255) semi++;
  const lab = new Int32Array(w * h).fill(-1), parts = [];
  for (let s = 0; s < w * h; s++) { if (lab[s] >= 0 || !buf[s * 4 + 3]) continue; const st = [s]; let n = 0; lab[s] = parts.length; while (st.length) { const q = st.pop(); n++; const qx = q % w, qy = (q / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = qx + dx, Y = qy + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (buf[j * 4 + 3] && lab[j] < 0) { lab[j] = parts.length; st.push(j); } } } parts.push(n); }
  parts.sort((a, b) => b - a);
  const seen = new Uint8Array(w * h), st = [];
  const push = (x, y) => { const i = y * w + x; if (!seen[i] && !buf[i * 4 + 3]) { seen[i] = 1; st.push(i); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (st.length) { const q = st.pop(), qx = q % w, qy = (q / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = qx + dx, Y = qy + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) push(X, Y); } }
  let holes = 0; for (let i = 0; i < w * h; i++) if (!seen[i] && !buf[i * 4 + 3]) holes++;
  return { parts, holes: holesOk ? 0 : holes, rawHoles: holes, semi };
}

/* ── build ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

const cut = {};
const grids = {};
for (const [sheet, names, opts] of SHEETS) {
  const r = await cutRow(sheet, names, opts);
  if (!r) continue;
  grids[sheet] = r.grid;
  for (const [n, im] of Object.entries(r.out)) cut[n] = im;
}

const parts = {}; // name → { img, place } or { frames: [img], place } or { img } (trims)
const report = [];
/** Parts whose see-through cells inside their box are drawn gaps, not holes: a ring's opening, the gap between the bell
 *  and its arch, the slit between the lantern and the bamboo stick it hangs from (outside both outlines). */
const DRAWN_GAPS = /^r_.*_(back|front)$|^c_bell$|^l_lantern/;
const ok = (name, im, extra = {}) => {
  const filled = /^l_lantern/.test(name) ? 0 : closeSmallHoles(im), dropped = dropSpecks(im);
  if (filled || dropped) report.push(`  ${name}: filled ${filled} see-through cell(s), dropped ${dropped} loose`);
  return Object.assign(tight(im), extra);
};

// the bases: their middles at the canvas's middle, their bottoms on its last row
const bases = BASES.filter((n) => cut[n]);
const shapes = {};
for (const n of bases) {
  const im = ok(n, cut[n]);
  shapes[n] = platformShape(im);
  parts[n] = { img: im, place: [Math.round(CANVAS[0] / 2 - im.w / 2), BASE_ROW + 1 - im.h] };
}
// the platforms' common top oval: its front edge row and its middle, in the canvas (the first three's)
const ovalBases = OVAL_BASES.filter((n) => parts[n]);
const topFront = Math.round(ovalBases.reduce((s, n) => s + parts[n].place[1] + shapes[n].top, 0) / ovalBases.length) - 1;
const topBack = Math.round(ovalBases.reduce((s, n) => s + parts[n].place[1], 0) / ovalBases.length);
const ovalMid = Math.round((topFront + topBack) / 2);

// the rings: their lowest row on the top oval's front edge, split into the far and near halves
for (const n of RINGS) {
  if (!cut[n]) continue;
  const im = ok(n, cut[n]);
  const left = Math.round(CANVAS[0] / 2 - im.w / 2), top = topFront + 1 - im.h;
  const { back, front, holeCells } = splitRing(im, ovalMid - top);
  if (!holeCells) report.push(`  ${n}: NO OPENING found: the ring is closed in the middle`);
  const b = tight(back), f = tight(front);
  parts[`${n}_back`] = { img: b, place: [left + b.x0, top + b.y0] };
  parts[`${n}_front`] = { img: f, place: [left + f.x0, top + f.y0] };
  parts[n] = { whole: im, place: [left, top] }; // only for the checks
}

// the centrepieces: their bottom middle a little behind the top oval's middle, so that the near petals hide only their
// foot; the light further back and to the right, so that it stands beside the centrepiece and is not hidden by it
const CENTRE_FOOT = [CANVAS[0] / 2 + CENTRE_AT[0], ovalMid + 1 - CENTRE_AT[1]];
const LIGHT_FOOT = [CANVAS[0] / 2 + LIGHT_AT[0], ovalMid + 1 - LIGHT_AT[1]];
for (const n of Object.keys(cut).filter((n) => /^c_/.test(n))) {
  const im = ok(n, cut[n]);
  parts[n] = { img: im, place: [Math.round(CENTRE_FOOT[0] - im.w / 2), CENTRE_FOOT[1] - im.h] };
}
for (const n of Object.keys(cut).filter((n) => /^t_/.test(n))) parts[n] = { img: ok(n, cut[n]) };
const boxReport = [];
for (const [id, moving, band] of [["l_candle", flameish, true], ["l_firefly", fireflyish, false], ["l_lantern", null, "box"], ["l_incense", null, "side"]]) {
  const fr = [0, 1, 2].map((k) => cut[`${id}#${k}`]).filter(Boolean);
  if (fr.length !== 3) continue;
  boxReport.length = 0;
  const steady = steadyFrames(fr.map((f, k) => ok(`${id}#${k}`, f)), moving, band);
  for (const l of boxReport) report.push(`  ${id}${l}`);
  // one box for the three
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const f of steady) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (px(f, x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const frames = steady.map((f) => { const w = x1 - x0 + 1, h = y1 - y0 + 1, buf = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) f.buf.copy(buf, y * w * 4, ((y + y0) * f.w + x0) * 4, ((y + y0) * f.w + x1 + 1) * 4); return { w, h, buf }; });
  // the bottom middle of the body (the first frame's lowest row)
  const w = frames[0].w, h = frames[0].h;
  parts[id] = { frames, place: [Math.round(LIGHT_FOOT[0] - w / 2), LIGHT_FOOT[1] - h] };
}

// the canvas: from the highest row any part reaches to the base's last row
{
  const tops = Object.values(parts).filter((p) => p.place && !p.whole).map((p) => p.place[1]);
  const top = Math.min(...tops), shift = -top;
  for (const p of Object.values(parts)) if (p.place) p.place = [p.place[0], p.place[1] + shift];
  CANVAS[1] = BASE_ROW + 1 + shift;
  TRIMS = TRIMS.map(([x, y]) => [x, CANVAS[1] - 1 + y]);
  CENTRE_FOOT[1] += shift; LIGHT_FOOT[1] += shift;
}
const [topBackC, topFrontC, ovalMidC] = [topBack, topFront, ovalMid].map((r) => r + CANVAS[1] - 1 - BASE_ROW);

// the props
const props = {};
{
  const [sheet, names, opts] = PROPS;
  const r = await cutRow(sheet, names, { ...opts, colours: 64, spans: true });
  if (r) {
    grids[sheet] = r.grid;
    for (const [n, im] of Object.entries(r.out)) {
      if (n.startsWith("_")) continue;
      const t = ok(n, im);
      // its ground point: the bottom middle of its picture (its lowest rows are only its front corner, the stage and the
      // table being drawn three-quarter on)
      props[n] = { img: t, foot: [Math.floor(t.w / 2), t.h - 1] };
    }
  }
}

/* ── pack ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const items = [];
for (const [n, p] of Object.entries(parts)) {
  if (p.whole) continue;
  if (p.frames) p.frames.forEach((f, k) => items.push({ key: [n, k], img: f }));
  else items.push({ key: [n], img: p.img });
}
for (const [n, p] of Object.entries(props)) items.push({ key: ["prop", n], img: p.img });
const PAD = 1, AW = Math.max(256, ...items.map((i) => i.img.w + 2 * PAD));
let x = PAD, y = PAD, rowH = 0;
for (const it of [...items].sort((a, b) => b.img.h - a.img.h)) {
  if (x + it.img.w + PAD > AW) { x = PAD; y += rowH + PAD; rowH = 0; }
  it.x = x; it.y = y; x += it.img.w + PAD; rowH = Math.max(rowH, it.img.h);
}
const AH = y + rowH + PAD;
const sheet = Buffer.alloc(AW * AH * 4);
for (const it of items) for (let r = 0; r < it.img.h; r++) it.img.buf.copy(sheet, ((it.y + r) * AW + it.x) * 4, r * it.img.w * 4, (r + 1) * it.img.w * 4);
const png = await L.sharp(sheet, { raw: { width: AW, height: AH, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10);
const image = `/town/krathong-${hash}.png`;

const rect = (it) => [it.x, it.y, it.img.w, it.img.h];
const meta = { v: 1, image, size: [AW, AH], canvas: CANVAS, mapScale: MAP_SCALE, trims: TRIMS, parts: {}, props: {} };
const order = (n) => ["b_", "r_", "l_", "c_", "t_"].findIndex((p) => n.startsWith(p));
for (const n of Object.keys(parts).filter((n) => !parts[n].whole).sort((a, b) => order(a) - order(b) || a.localeCompare(b))) {
  const p = parts[n];
  if (p.frames) meta.parts[n] = { frames: items.filter((i) => i.key[0] === n).sort((a, b) => a.key[1] - b.key[1]).map(rect), place: p.place };
  else if (n.startsWith("t_")) meta.parts[n] = { at: rect(items.find((i) => i.key[0] === n)) };
  else meta.parts[n] = { at: rect(items.find((i) => i.key[0] === n)), place: p.place };
}
for (const n of Object.keys(props)) meta.props[n] = { at: rect(items.find((i) => i.key[0] === "prop" && i.key[1] === n)), foot: props[n].foot, scale: PROP_SCALE[n], ...(n === "hall" ? { slots: HALL_SLOTS } : {}) };

fs.mkdirSync(PUB, { recursive: true });
for (const f of fs.readdirSync(PUB)) if (/^krathong-[0-9a-f]{10}\.png$/.test(f) && `/town/${f}` !== image) fs.unlinkSync(path.join(PUB, f));
fs.writeFileSync(path.join(PUB, path.basename(image)), png);
fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, JSON.stringify(meta, (k, v) => (Array.isArray(v) && v.every((n) => typeof n === "number") ? JSON.stringify(v) : v), 1).replace(/"\[([\d,.-]+)\]"/g, "[$1]") + "\n");

console.log(`grids: ${Object.entries(grids).map(([s, p]) => `${s} ${p.toFixed(2)}`).join(", ")}`);
console.log(`canvas ${CANVAS}; top oval: back row ${topBackC}, front row ${topFrontC}, middle ${ovalMidC}; centrepiece foot ${CENTRE_FOOT}, light foot ${LIGHT_FOOT}; trims ${JSON.stringify(TRIMS)}`);
for (const [n, p] of Object.entries(parts)) {
  if (p.whole) continue;
  const ims = p.frames ?? [p.img];
  // (drawn gaps, not bugs: a ring's opening, the gap between the bell and its arch)
  const b = ims.map((im) => bugs(im, { holesOk: DRAWN_GAPS.test(n) }));
  const flag = b.some((q) => q.semi || q.holes || q.parts.length > 1);
  console.log(`${flag ? "!!" : "ok"} ${n.padEnd(18)} ${ims[0].w}x${ims[0].h}${p.place ? ` at ${p.place}` : ""}${b.map((q) => (q.parts.length > 1 ? `  apart: ${q.parts.slice(1).join(",")}` : "") + (q.holes ? `  holes ${q.holes}` : "") + (q.semi ? `  half-clear ${q.semi}` : "")).join("")}${shapes[n] ? `  (top oval ${shapes[n].top}, side ${shapes[n].side})` : ""}`);
}
// (the stall's open space under its awning, between its posts, is drawn, not a hole)
for (const [n, p] of Object.entries(props)) { const q = bugs(p.img, { holesOk: n === "stall" }); console.log(`${q.holes || q.parts.length > 1 ? "!!" : "ok"} prop ${n.padEnd(13)} ${p.img.w}x${p.img.h} foot ${p.foot}${q.parts.length > 1 ? `  apart: ${q.parts.slice(1).join(",")}` : ""}${q.holes ? `  holes ${q.holes}` : ""}`); }
for (const l of report) console.log(l);
console.log(`wrote ${image} ${AW}x${AH} (${(png.length / 1024).toFixed(1)} KB) and ${path.relative(TREE, JSON_OUT)}`);

/* ── the look ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

if (LOOK) {
  fs.mkdirSync(LOOK, { recursive: true });
  const raw = (im) => L.sharp(im.buf, { raw: { width: im.w, height: im.h, channels: 4 } });
  /** One krathong on its canvas: [base, ring, light, frame, centre, [trim, trim, trim]]. */
  const compose = (base, ring, light, frame, centre, trims) => {
    const W = CANVAS[0], H = CANVAS[1], buf = Buffer.alloc(W * H * 4);
    const lay = (im, [lx, ly]) => { for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const o = (y * im.w + x) * 4; if (!im.buf[o + 3]) continue; const X = lx + x, Y = ly + y; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; im.buf.copy(buf, (Y * W + X) * 4, o, o + 4); } };
    lay(parts[base].img, parts[base].place);
    if (ring) lay(parts[`${ring}_back`].img, parts[`${ring}_back`].place);
    if (light) lay(parts[light].frames[frame], parts[light].place);
    if (centre) lay(parts[centre].img, parts[centre].place);
    if (ring) lay(parts[`${ring}_front`].img, parts[`${ring}_front`].place);
    (trims ?? []).forEach((t, k) => { if (!t || !parts[t]) return; const im = parts[t].img; lay(im, [TRIMS[k][0] - Math.floor(im.w / 2), TRIMS[k][1] - im.h + 1]); });
    return { w: W, h: H, buf };
  };
  const B = ["b_wood", "b_leaf", "b_bread"], R = ["r_leaf", "r_lotus", "r_marigold"];
  const C = Object.keys(parts).filter((n) => /^c_/.test(n)), T = Object.keys(parts).filter((n) => /^t_/.test(n));
  const combos = [];
  B.forEach((b, i) => R.forEach((r, j) => { const k = i * 3 + j; combos.push([b, r, k % 2 ? "l_firefly" : "l_candle", k % 3, C[k % C.length], [T[(k + 1) % T.length], T[(k + 4) % T.length], T[(k + 7) % T.length]]]); }));
  // the tenth centrepiece too, and one with nothing but a base and a ring
  combos.push(["b_wood", "r_lotus", "l_candle", 1, C[9 % C.length], [T[0], null, T[3]]]);
  combos.push(["b_leaf", "r_leaf", null, 0, null, []]);
  // (KT_LOOK=all: every base, old and new, with every ring, the new lights, centrepieces and trims among them, after
  // the first round's eleven; and each new ring and base bare)
  if (process.env.KT_LOOK === "all") {
    const B2 = BASES.filter((n) => parts[n]), R2 = RINGS.filter((n) => parts[`${n}_back`]);
    const L2 = ["l_lantern", "l_incense", "l_candle", "l_firefly"].filter((n) => parts[n]);
    const C2 = ["c_lotusbud", "c_star", "c_koi", "c_rabbit"].filter((n) => parts[n]), T2 = ["t_star", "t_bow", "t_lantern", "t_moon"].filter((n) => parts[n]);
    let k = 0;
    for (const b of B2) for (const r of R2) {
      if (B.includes(b) && R.includes(r)) continue;
      combos.push([b, r, L2[k % L2.length], k % 3, k % 3 === 2 ? C[k % C.length] : C2[k % C2.length], [T2[k % T2.length], T[(k + 3) % T.length], T2[(k + 1) % T2.length]]]); k++;
    }
    for (const b of B2.slice(3)) combos.push([b, null, null, 0, null, []]);
    for (const r of R2.slice(3)) combos.push(["b_leaf", r, null, 0, null, []]);
  }
  const ims = combos.filter((c) => parts[c[0]] && (!c[1] || parts[`${c[1]}_back`])).map((c) => compose(...c));

  // 1) every pair at 4x on the panel's dark green
  const Z = 4, GAP = 8, cols = ims.length > 12 ? 8 : 4, rows = Math.ceil(ims.length / cols);
  const tile = { w: CANVAS[0] * Z, h: CANVAS[1] * Z };
  const comps = await Promise.all(ims.map(async (im, i) => ({ input: await raw(im).resize(im.w * Z, im.h * Z, { kernel: "nearest" }).png().toBuffer(), left: GAP + (i % cols) * (tile.w + GAP), top: GAP + Math.floor(i / cols) * (tile.h + GAP) })));
  await L.sharp({ create: { width: GAP + cols * (tile.w + GAP), height: GAP + rows * (tile.h + GAP), channels: 4, background: "#1d3a2c" } }).composite(comps).png().toFile(path.join(LOOK, "krathong-4x.png"));

  // 2) the same at 1x on the river's water beside a character (both at their own pixel size), and that blown up 3x
  const water = path.join(ROOT, "public/town/town2", fs.readdirSync(path.join(ROOT, "public/town/town2")).find((f) => /^ground-water-.*\.png$/.test(f)));
  const doll = await (async () => {
    const r = await L.loadRaw(path.join(SHEETS_DIR, "d2-starter-front.png"));
    const g = L.cellsOf(r, L.detectGrid(r, undefined, [5.6, 6.0]));
    const f = L.figures(g, L.spansOf(g, 4)); const im = L.crop(g, f[0]); return { w: im.w, h: im.h, buf: im.buf };
  })();
  // (in rows of at most 14, a character at the start of each)
  const perRow = Math.min(ims.length, 14), wRows = Math.ceil(ims.length / perRow), rowH1 = Math.max(doll.h, CANVAS[1]) + 12;
  const WW = 12 + perRow * (CANVAS[0] + 10) + doll.w + 12, WH = wRows * rowH1 + 12;
  const wtex = await L.sharp(water).resize(64, 64, { fit: "cover" }).png().toBuffer();
  const tiles = []; for (let ty = 0; ty < WH; ty += 64) for (let tx = 0; tx < WW; tx += 64) tiles.push({ input: wtex, left: tx, top: ty });
  const onWater = [];
  for (let r = 0; r < wRows; r++) onWater.push({ input: await raw(doll).png().toBuffer(), left: 12, top: (r + 1) * rowH1 - doll.h });
  for (const [i, im] of ims.entries()) onWater.push({ input: await raw(im).png().toBuffer(), left: 12 + doll.w + 10 + (i % perRow) * (CANVAS[0] + 10), top: (Math.floor(i / perRow) + 1) * rowH1 - CANVAS[1] });
  const w1 = await L.sharp({ create: { width: WW, height: WH, channels: 4, background: "#2b5d7a" } }).composite([...tiles, ...onWater]).png().toBuffer();
  await L.sharp(w1).toFile(path.join(LOOK, "krathong-1x-water.png"));
  await L.sharp(w1).resize(WW * 3, WH * 3, { kernel: "nearest" }).toFile(path.join(LOOK, "krathong-1x-water-3x.png"));

  // 3) every part alone at 6x over magenta, its name under it
  const all = Object.entries(parts).filter(([, p]) => !p.whole).flatMap(([n, p]) => (p.frames ? p.frames.map((f, k) => [`${n}#${k}`, f]) : [[n, p.img]]));
  const S6 = 6, cw = 50 * S6, ch = 44 * S6, pc = 8, pr = Math.ceil(all.length / pc);
  const pcomps = [];
  for (const [i, [n, im]] of all.entries()) {
    pcomps.push({ input: await raw(im).resize(im.w * S6, im.h * S6, { kernel: "nearest" }).png().toBuffer(), left: (i % pc) * cw + 6, top: Math.floor(i / pc) * ch + 6 });
    pcomps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="20"><text x="4" y="15" font-family="monospace" font-size="15" fill="#fff">${n} ${im.w}x${im.h}</text></svg>`), left: (i % pc) * cw, top: Math.floor(i / pc) * ch + ch - 22 });
  }
  await L.sharp({ create: { width: pc * cw, height: pr * ch, channels: 4, background: "#ff00ff" } }).composite(pcomps).png().toFile(path.join(LOOK, "krathong-parts-6x.png"));

  // 4) the props at map scale on grass beside the Popoto Board and a character (the doll at 0.67 map px to its pixel,
  // each prop at PROP_K, the board at its own k), and the same 2x
  if (Object.keys(props).length) {
    const PROP_K = +(process.env.KT_PROP_K ?? PROP_SCALE.stall);
    const board = path.join(ROOT, "public/town/town2", fs.readdirSync(path.join(ROOT, "public/town/town2")).find((f) => /^kosatsu-board-cloud-.*\.webp$/.test(f)));
    const bm = await L.sharp(board).metadata(), bw = Math.round(bm.width * 0.3255), bh = Math.round(bm.height * 0.3255);
    const sized = async (im, k) => raw(im).resize(Math.round(im.w * k), Math.round(im.h * k), { kernel: "nearest" }).png().toBuffer();
    const row = [
      { input: await L.sharp(board).resize(bw, bh).png().toBuffer(), w: bw, h: bh },
      { input: await sized(doll, MAP_SCALE), w: Math.round(doll.w * MAP_SCALE), h: Math.round(doll.h * MAP_SCALE) },
      ...Object.values(props).map((p) => ({ input: null, im: p.img, w: Math.round(p.img.w * PROP_K), h: Math.round(p.img.h * PROP_K) })),
      { input: await sized(doll, MAP_SCALE), w: Math.round(doll.w * MAP_SCALE), h: Math.round(doll.h * MAP_SCALE) },
    ];
    for (const r of row) if (!r.input) r.input = await sized(r.im, PROP_K);
    const GW = row.reduce((s, r) => s + r.w + 16, 16), GH = Math.max(...row.map((r) => r.h)) + 40;
    let gx = 16; const pc2 = row.map((r) => { const c = { input: r.input, left: gx, top: GH - 20 - r.h }; gx += r.w + 16; return c; });
    // three winners on the hall's slots, at 0.75 of the parts' map size, and three characters in front of the stage
    const hallAt = row.findIndex((r) => r.im === props.hall?.img);
    if (hallAt >= 0) {
      const H0 = pc2[hallAt], hk = PROP_SCALE.hall, kk = 0.75 * MAP_SCALE;
      for (const [i, [sx, sy]] of HALL_SLOTS.entries()) {
        const im = ims[[1, 4, 7][i] % ims.length], w = Math.round(im.w * kk), h = Math.round(im.h * kk);
        pc2.push({ input: await raw(im).resize(w, h, { kernel: "nearest" }).png().toBuffer(), left: Math.round(H0.left + sx * hk - w / 2), top: Math.round(H0.top + sy * hk - h + 1) });
      }
      const dw = Math.round(doll.w * MAP_SCALE), dh = Math.round(doll.h * MAP_SCALE), dimg = await sized(doll, MAP_SCALE);
      for (const [sx] of HALL_SLOTS) pc2.push({ input: dimg, left: Math.round(H0.left + sx * hk - dw / 2 - 6), top: GH - 6 - dh });
    }
    const g1 = await L.sharp({ create: { width: GW, height: GH, channels: 4, background: "#7fae5a" } }).composite(pc2).png().toBuffer();
    await L.sharp(g1).resize(GW * 2, GH * 2, { kernel: "nearest" }).toFile(path.join(LOOK, "krathong-props-2x.png"));
  }
  console.log(`looks in ${LOOK}`);
}
