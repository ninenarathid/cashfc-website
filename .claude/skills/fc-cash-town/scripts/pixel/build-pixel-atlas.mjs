// Cash Town's pixel Lalafell: AI sheets in work/out -> public/town/pixel-<hash>.png + pixel.json.
//
//   node build-pixel-atlas.mjs [--out <dir>]        (default: fcnext/public/town)
//
// Sheets, all 1536x1024 in-place edits of one another so their figures line up:
//   f-bald-<type>.png      the shared skull: a bald Lalafell girl
//   <g>-starter-<type>.png the body: bald, in the gender's starter outfit (g = f | m)
//   f-neutral-front.png    the girl's calm face on the bald head
//   m-face-front.png       the boy's face on that same head
//   f-<hair>-<type>.png    a hairstyle on the girl's bald head, the hair in key green
//                          (hair = f01..f14 for girls, m01..m13 for boys: the creator's own list)
//   type = front (walk, 3/4 front), back (walk, 3/4 back), poses (sit front, sit back, sleep, wave)
//
// Walking is layered: each frame's body below the chin, plus one head moved
// with the body. A head is the one shared bald skull, the gender's face, and
// the hairstyle's hair laid over it, so every look has the same head size and
// the same face, and hair and face never shimmer. Poses are whole frames from
// each hairstyle's sheet (--poses).
// Hair (green) and eyes (violet) are recoloured in the browser (lib/town/pixeldoll.ts).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = path.join(HERE, "work", "out");
const DBG = path.join(HERE, "work", "debug");
const argOut = process.argv.indexOf("--out");
const PUB = argOut > 0 ? process.argv[argOut + 1] : "E:/NinenineProject/fcnext/public/town";
fs.mkdirSync(DBG, { recursive: true });
fs.mkdirSync(PUB, { recursive: true });

const GENDERS = ["f", "m"];
// the character creator's hairstyles, each for its own gender; "bald" is the fallback for both
const HAIRS = [
  ...Array.from({ length: 14 }, (_, i) => `f${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 13 }, (_, i) => `m${String(i + 1).padStart(2, "0")}`),
  "bald",
];
const hairFor = (gnd, hair) => hair === "bald" || hair[0] === gnd;
const TYPES = ["front", "back", "poses"];
const POSES = ["sitF", "sitB", "sleep", "wave"];
const IDLE = 1; // the walk frame with both feet under the body
// the faces: drawn on the girl's bald front sheet, so they share its skull
const EYES = ["round", "big", "sharp", "droopy", "cat", "small"];
const FACES = [["f", "neutral", "front"], ["m", "face", "front"],
  ...["f", "m"].flatMap(g => EYES.slice(1).map(e => [g, `eyes_${e}`, "front"]))];
const FACE = { f: "f-neutral-front", m: "m-face-front" };

const file = (g, h, t) => path.join(OUT, `${g}-${h}-${t}.png`);
const have = (g, h, t) => fs.existsSync(file(g, h, t));

/* ── 1. every sheet to cells, on its type's grid, in one palette, lined up ── */

const grids = {}; // `${g}-${h}-${t}` -> cells
const typeGrid = {};
const wanted = [];
for (const t of TYPES) {
  wanted.push(["f", "bald", t], ["f", "starter", t], ["m", "starter", t]);
  if (t !== "poses") wanted.push(["f", "skinkey", t], ["m", "skinkey", t]);
  for (const h of HAIRS) if (h !== "bald" && t !== "poses") wanted.push(["f", h, t]);
}
wanted.push(...FACES);
for (const t of TYPES) typeGrid[t] = L.detectGrid(await L.loadRaw(file("f", "bald", t)));
for (const [g, h, t] of wanted) {
  if (!have(g, h, t)) continue;
  const raw = await L.loadRaw(file(g, h, t));
  grids[`${g}-${h}-${t}`] = L.cellsOf(raw, L.detectGrid(raw, typeGrid[t].p));
}
const idleOf = g => L.figures(g, L.spansOf(g, 4))[IDLE];
function eyesAt(g) {
  let sx = 0, sy = 0, n = 0;
  for (const i of idleOf(g)) { const x = i % g.GW, y = (i / g.GW) | 0; if (L.clsAt(g, x, y) === "violet") { sx += x; sy += y; n++; } }
  return n ? { x: sx / n, y: sy / n } : null;
}
function earsAt(g) {
  const F = idleOf(g), b = L.bbox(g, F); let lo = null, hi = null;
  for (const i of F) {
    const x = i % g.GW, y = (i / g.GW) | 0;
    if (y > b.y0 + (b.y1 - b.y0) * 0.5 || L.clsAt(g, x, y) !== "skin") continue;
    if (!lo || x < lo.x) lo = { x, y }; if (!hi || x > hi.x) hi = { x, y };
  }
  return lo && hi ? { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 } : null;
}
const feat = {};
for (const key of Object.keys(grids)) {
  if (key === "f-neutral-front" || /^f-[fm]\d\d-front$/.test(key)) feat[key] = eyesAt(grids[key]);
  if (key === "f-bald-back" || /^f-[fm]\d\d-back$/.test(key)) feat[key] = earsAt(grids[key]);
}
// The shared skull's own colours, before any palette, so its chin is found the same way every build.
const rawSkull = {};
for (const t of TYPES) { const g = grids[`f-bald-${t}`]; rawSkull[t] = { GW: g.GW, GH: g.GH, c: Uint8Array.from(g.c) }; }
// Three palettes: the bodies (the outfits' reds and navies), the skull and faces (the
// violet eyes, recoloured later, must stay violet), and the hair. In one shared palette the
// rarer colours drown among the hair sheets' greens.
const role = k => (k.includes("-skinkey-") ? "key" : k.includes("-starter-") ? "body" : /^(f-bald|f-neutral|m-face|[fm]-eyes_)/.test(k) ? "face" : "hair");
const PALS = {};
for (const r of ["body", "face", "hair"]) {
  const keys = Object.keys(grids).filter(k => role(k) === r);
  const pal = L.paletteOf(keys.map(k => grids[k]), 96);
  PALS[r] = pal;
  for (const k of keys) L.snap(grids[k], pal);
}

// Line every sheet up with the girl's bald one of its type: the best whole-cell
// shift (at most two) over a band of rows. Cells the hair covers count for nothing,
// so long hair hanging over the body cannot pull a sheet sideways.
function align(a, ref, y0, y1) {
  let best = { s: -1e9, dx: 0, dy: 0 };
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    let sc = 0;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < ref.GW; x++) {
      const X = x - dx, Y = y - dy;
      const inA = X >= 0 && Y >= 0 && X < a.GW && Y < a.GH && a.c[(Y * a.GW + X) * 4 + 3];
      if (inA && L.clsAt(a, X, Y) === "green") continue;
      const R = ref.c[(y * ref.GW + x) * 4 + 3] !== 0;
      if (inA && R) sc++; else if (!!inA !== R) sc -= 0.5;
    }
    // ties go to no shift
    if (sc > best.s + 0.5 || (Math.abs(sc - best.s) <= 0.5 && Math.abs(dx) + Math.abs(dy) < Math.abs(best.dx) + Math.abs(best.dy))) best = { s: sc, dx, dy };
  }
  return best;
}
const applied = {};
for (const t of TYPES) {
  const fb = grids[`f-bald-${t}`];
  let top = fb.GH, bot = 0;
  for (let i = 0; i < fb.GW * fb.GH; i++) if (fb.c[i * 4 + 3]) { const y = (i / fb.GW) | 0; if (y < top) top = y; if (y > bot) bot = y; }
  const head = [top, Math.round(top + (bot - top) * 0.42)], body = [Math.round(top + (bot - top) * 0.55), bot];
  const fix = (key, band) => {
    if (!grids[key]) return;
    const r = align(grids[key], fb, band[0], band[1]);
    applied[key] = r;
    if (r.dx || r.dy) { grids[key] = L.shifted(grids[key], r.dx, r.dy); console.log(`shift ${key} by ${r.dx},${r.dy}`); }
  };
  fix(`f-starter-${t}`, head);
  fix(`m-starter-${t}`, head);
  fix(`f-skinkey-${t}`, head);
  fix(`m-skinkey-${t}`, head);
  for (const [g, h, tt] of FACES) if (tt === t) fix(`${g}-${h}-${t}`, head);
}

// Hairstyles line up by what the hair is drawn around, not by the body: adding hair, the model
// often moved the head up a few rows (2026-10-02: "ทรงผมบางทรง วางไว้สูงเกิน"). Front sheets go by
// the eyes (the violet centre of the standing frame, against the girl's face), back sheets by the
// ear tips (the outermost skin of the head's top half, against the bald skull).
{
  const moved = (key) => { const f = feat[key], a = applied[key] ?? { dx: 0, dy: 0 }; return f && { x: f.x + a.dx, y: f.y + a.dy }; };
  const refs = { front: moved("f-neutral-front"), back: moved("f-bald-back") };
  for (const h of HAIRS) for (const t of ["front", "back"]) {
    const key = `f-${h}-${t}`;
    if (h === "bald" || !grids[key]) continue;
    const at = feat[key], ref = refs[t];
    if (!at || !ref) { console.log(`  ${key}: no ${t === "front" ? "eyes" : "ears"} found, left where it is`); continue; }
    const dx = Math.max(-8, Math.min(8, Math.round(ref.x - at.x))), dy = Math.max(-8, Math.min(8, Math.round(ref.y - at.y)));
    if (dx || dy) { grids[key] = L.shifted(grids[key], dx, dy); console.log(`shift ${key} by ${dx},${dy} (${t === "front" ? "eyes" : "ears"})`); }
  }
}

/* ── 2. frames ─────────────────────────────────────────────────────────── */

const spans = {}, figs = {};
for (const t of TYPES) spans[t] = L.spansOf(grids[`f-bald-${t}`], 4);
for (const [key, g] of Object.entries(grids)) figs[key] = L.figures(g, spans[key.split("-")[2]]);

/** The chin cut of a standing figure: the narrowest row above the first row of tunic blue near the head. */
function chinOf(g, set) {
  const b = L.bbox(g, set);
  let sx = 0, n = 0;
  for (const i of set) { const y = (i / g.GW) | 0; if (y < b.y0 + (b.y1 - b.y0) * 0.3) { sx += i % g.GW; n++; } }
  const hx = Math.round(sx / n);
  // below the eyes: dark-blue eye pixels must not pass for the tunic
  let eyes = b.y0 + 10;
  for (const i of set) { const y = (i / g.GW) | 0; if (y < b.y0 + (b.y1 - b.y0) * 0.5 && L.clsAt(g, i % g.GW, y) === "violet") eyes = Math.max(eyes, y); }
  let blue = b.y1;
  for (let y = eyes + 3; y <= b.y1 && blue === b.y1; y++) {
    let k = 0; for (let x = hx - 7; x <= hx + 7; x++) if (set.has(y * g.GW + x) && L.clsAt(g, x, y) === "blue") k++;
    if (k >= 3) blue = y;
  }
  let best = blue - 1, bw = 1e9;
  for (let y = blue - 9; y < blue; y++) {
    let w = 0; for (let x = hx - 14; x <= hx + 14; x++) if (set.has(y * g.GW + x)) w++;
    if (w <= bw) { bw = w; best = y; }
  }
  return { cut: best - 1, hx };
}

/** Where the reference head (rows <= cut of `idle` in grid `tg`) sits in frame `frame` of grid `g`. */
function headShift(tg, idle, cut, g, frame) {
  const top = (gg, set) => { const b = L.bbox(gg, set); let sx = 0, n = 0; for (const i of set) { if (((i / gg.GW) | 0) < b.y0 + (b.y1 - b.y0) * 0.3) { sx += i % gg.GW; n++; } } return [sx / n, b.y0]; };
  const [ix, iy] = top(tg, idle), [fx, fy] = top(g, frame);
  const cx = Math.round(fx - ix), cy = Math.round(fy - iy);
  let best = { s: -1e9, sx: 0, sy: 0 };
  for (let sy = cy - 4; sy <= cy + 4; sy++) for (let sx = cx - 4; sx <= cx + 4; sx++) {
    let sc = 0;
    for (const i of idle) {
      const x = i % tg.GW, y = (i / tg.GW) | 0; if (y > cut) continue;
      const j = (y + sy) * g.GW + x + sx;
      if (!frame.has(j)) { sc -= 1; continue; }
      const d = Math.abs(tg.c[i * 4] - g.c[j * 4]) + Math.abs(tg.c[i * 4 + 1] - g.c[j * 4 + 1]) + Math.abs(tg.c[i * 4 + 2] - g.c[j * 4 + 2]);
      sc += d < 40 ? 1 : 0;
    }
    if (sc > best.s) best = { s: sc, sx, sy };
  }
  return best;
}

/**
 * A hairstyle's hair, to lay over the shared skull: the green (patches of 10+
 * cells), the outline touching it (never the eyes' lashes), whatever the
 * hairstyle added beside it that the bald sheet does not have (ribbons, bands,
 * bobbles; never skin or eyes), and the few cells the hair surrounds.
 */
function hairOverlay(g, set, base, cut) {
  const cl = i => L.clsAt(g, i % g.GW, (i / g.GW) | 0);
  const around = (i, d8) => {
    const x = i % g.GW, y = (i / g.GW) | 0, r = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && (d8 || !dx || !dy)) r.push((y + dy) * g.GW + x + dx);
    return r;
  };
  const green = new Set(), seen = new Set();
  for (const i of set) {
    if (seen.has(i) || cl(i) !== "green") continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) { const q = st.pop(); mem.push(q); for (const j of around(q, true)) if (set.has(j) && !seen.has(j) && cl(j) === "green") { seen.add(j); st.push(j); } }
    if (mem.length >= 10) for (const q of mem) green.add(q);
  }
  const nearEye = i => around(i, true).some(j => set.has(j) && cl(j) === "violet");
  const nearGreen = i => around(i, true).some(j => green.has(j) || around(j, true).some(k => green.has(k)));
  const out = new Set(green);
  for (const i of set) {
    if (out.has(i) || cl(i) !== "dark" || nearEye(i)) continue;
    const g4 = around(i, false).filter(j => green.has(j)).length, g8 = around(i, true).filter(j => green.has(j)).length;
    if (g4 >= 1 || g8 >= 2) out.add(i);
  }
  // added by the hairstyle: anything outside the bald silhouette (ribbons, bows sticking out);
  // over the skull, above the chin, only what is light (white bands, ribbons) or a clearly
  // different colour (bobbles), never dark (the face's own lines); nothing below the chin
  const added = i => {
    const c = cl(i);
    if (c === "violet" || c === "green" || nearEye(i)) return false;
    const x = i % g.GW, y = (i / g.GW) | 0;
    // below the chin only ties and outlines close to the hair, never the tunic's own colours
    if (y > cut) return nearGreen(i) && c !== "blue" && c !== "cream" && c !== "skin" && (x >= base.GW || y >= base.GH || !base.c[(y * base.GW + x) * 4 + 3]);
    if (x >= base.GW || y >= base.GH) return true;
    const bi = (y * base.GW + x) * 4;
    if (!base.c[bi + 3]) return true;
    if (c === "dark") return false;
    const [h1, s1, l1] = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]), [h2, , l2] = L.hsl(base.c[bi], base.c[bi + 1], base.c[bi + 2]);
    if (l1 > 0.72 && l1 - l2 > 0.08) return true;
    const d = Math.abs(base.c[bi] - g.c[i * 4]) + Math.abs(base.c[bi + 1] - g.c[i * 4 + 1]) + Math.abs(base.c[bi + 2] - g.c[i * 4 + 2]);
    const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
    return c !== "skin" && s1 > 0.35 && dh > 25 && d > 60;
  };
  // grown from the hair and its outline, through what the hairstyle added
  const st = [...set].filter(i => !out.has(i) && around(i, false).some(j => out.has(j)) && added(i));
  const took = new Set(st);
  while (st.length && took.size < 1500) {
    const i = st.pop(); out.add(i);
    for (const j of around(i, false)) if (set.has(j) && !took.has(j) && !out.has(j) && added(j)) { took.add(j); st.push(j); }
  }
  for (let pass = 0; pass < 2; pass++) for (const i of set) {
    if (!out.has(i) && cl(i) !== "skin" && around(i, false).filter(j => out.has(j)).length >= 3) out.add(i);
  }
  return out;
}

/* ── 3. pieces ─────────────────────────────────────────────────────────── */

const pieces = []; // { name, img: {buf,w,h}, ox, oy } offsets from the anchor (feet), in pixels
const meta = { v: 2, eyes: EYES, walk: {} };
const subset = (g, set, pred) => new Set([...set].filter(i => pred(i % g.GW, (i / g.GW) | 0)));

// the shared skull: the girl's standing frame, its chin cut and head centre, per way
const REF = {};
for (const t of ["front", "back"]) {
  const g = grids[`f-bald-${t}`], idle = figs[`f-bald-${t}`][IDLE];
  REF[t] = { g, idle, ...chinOf(rawSkull[t], idle) };
  console.log(`${t}: chin cut ${REF[t].cut}, head x ${REF[t].hx}`);
}

// ── skin: one ramp of exact colours shared by every face and body, so the browser can move
// all skin to a picked colour by colour alone. Faces: warm cells (hue 345–45). Bodies: warm cells
// the skin key paints cyan (the outfits' tan boots and pouch are warm too, but never cyan).
const isWarm = (c, i) => { const [h, s, l] = L.hsl(c[i], c[i + 1], c[i + 2]); return (h <= 45 || h >= 345) && s > 0.2 && l > 0.25 && l < 0.92; };
const isCyan = (c, i) => { const [h, s, l] = L.hsl(c[i], c[i + 1], c[i + 2]); return h >= 160 && h <= 215 && s > 0.3 && l > 0.2; };

/** The skin key's offset that puts its cyan on the body's warm cells. */
function keyShift(g, key, set) {
  let best = { n: -1, dx: 0, dy: 0 };
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    let n = 0;
    for (const i of set) {
      if (!isWarm(g.c, i * 4)) continue;
      const x = i % g.GW + dx, y = ((i / g.GW) | 0) + dy;
      if (x >= 0 && y >= 0 && x < key.GW && y < key.GH && key.c[(y * key.GW + x) * 4 + 3] && isCyan(key.c, (y * key.GW + x) * 4)) n++;
    }
    if (n > best.n) best = { n, dx, dy };
  }
  return best;
}

const skinCells = []; // [grid, index] of every skin cell that goes into a piece
const faceSkin = (g, set) => { for (const i of set) if (isWarm(g.c, i * 4)) skinCells.push([g, i]); };

// copies, so the shared grids stay as they are
const copyOf = g => ({ GW: g.GW, GH: g.GH, c: Uint8Array.from(g.c) });

const bodies = []; // [name, grid, set, ax, ay]
for (const gnd of GENDERS) {
  meta.walk[gnd] = {};
  for (const t of ["front", "back"]) {
    const R = REF[t];
    const g = copyOf(grids[`${gnd}-starter-${t}`]), F = figs[`${gnd}-starter-${t}`];
    const key = grids[`${gnd}-skinkey-${t}`];
    const frames = [];
    for (let k = 0; k < 4; k++) {
      // where the shared skull sits on this gender's body in this step
      const s = headShift(R.g, R.idle, R.cut, g, F[k]);
      const ground = L.bbox(g, F[k]).y1;
      const ax = R.hx + s.sx, ay = ground;
      const body = subset(g, F[k], (x, y) => y > R.cut + s.sy);
      if (key) {
        const ks = keyShift(g, key, body);
        let n = 0;
        for (const i of body) {
          const x = i % g.GW + ks.dx, y = ((i / g.GW) | 0) + ks.dy;
          if (isWarm(g.c, i * 4) && x < key.GW && y < key.GH && key.c[(y * key.GW + x) * 4 + 3] && isCyan(key.c, (y * key.GW + x) * 4)) { skinCells.push([g, i]); n++; }
        }
        if (k === IDLE) console.log(`  ${gnd} ${t}: ${n} skin cells (key off by ${ks.dx},${ks.dy})`);
      }
      const name = `body-${gnd}-${t}-${k}`;
      bodies.push([name, g, body, ax, ay]);
      // the head's reference point (the skull's centre at its chin cut) from this step's feet
      frames.push({ body: name, hx: 0, hy: R.cut + s.sy - ay });
    }
    meta.walk[gnd][t] = frames;
    console.log(`  ${gnd} ${t}: head moves`, frames.map(f => f.hy).join(" "));
  }
}

// sitting: the starter poses' first two frames (sitting, front and back), resampled so their
// heads are the shared skull's size (the pose sheets came out about 8% larger), the head
// fitted the same way as on a walking step
meta.sit = {};
{
  const widthTop = (g, set, p) => { const b = L.bbox(g, set), lim = b.y0 + (b.y1 - b.y0) * 0.35; let x0 = 1e9, x1 = -1;
    for (const i of set) { const x = i % g.GW, y = (i / g.GW) | 0; if (y <= lim) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } } return (x1 - x0 + 1) * p; };
  const walkW = widthTop(grids["f-bald-front"], figs["f-bald-front"][IDLE], typeGrid.front.p);
  for (const gnd of GENDERS) {
    if (!have(gnd, "starter", "poses")) continue;
    const raw = await L.loadRaw(file(gnd, "starter", "poses"));
    const g0 = L.cellsOf(raw, L.detectGrid(raw, typeGrid.poses.p));
    const sitW = widthTop(g0, L.figures(g0, L.spansOf(g0, 4))[0], typeGrid.poses.p);
    const p = typeGrid.front.p * sitW / walkW;
    const g = L.cellsOf(raw, L.detectGrid(raw, p));
    L.snap(g, PALS.body);
    const F = L.figures(g, L.spansOf(g, 4));
    const keyRaw = have(gnd, "skinkey", "poses") ? await L.loadRaw(file(gnd, "skinkey", "poses")) : null;
    const key = keyRaw && L.cellsOf(keyRaw, L.detectGrid(keyRaw, p));
    meta.sit[gnd] = {};
    for (const [k, t] of [[0, "front"], [1, "back"]]) {
      const R = REF[t];
      const s = headShift(R.g, R.idle, R.cut, g, F[k]);
      const ground = L.bbox(g, F[k]).y1;
      const ax = R.hx + s.sx, ay = ground;
      const body = subset(g, F[k], (x, y) => y > R.cut + s.sy);
      if (key) {
        const ks = keyShift(g, key, body);
        for (const i of body) {
          const x = i % g.GW + ks.dx, y = ((i / g.GW) | 0) + ks.dy;
          if (isWarm(g.c, i * 4) && x < key.GW && y < key.GH && key.c[(y * key.GW + x) * 4 + 3] && isCyan(key.c, (y * key.GW + x) * 4)) skinCells.push([g, i]);
        }
      }
      const name = `sit-${gnd}-${t}`;
      bodies.push([name, g, body, ax, ay]);
      meta.sit[gnd][t] = { body: name, hx: 0, hy: R.cut + s.sy - ay };
      console.log(`  ${gnd} sit ${t}: resampled at ${p.toFixed(2)}, head at ${meta.sit[gnd][t].hy}`);
    }
  }
}

// faces: the skull and a face above the chin, one per gender and eye shape; the back of the head is shared
const faces = []; // [name, grid, set]
meta.face = { f: {}, m: {}, back: "face-back" };
for (const gnd of GENDERS) for (const e of EYES) {
  const key = e === "round" ? FACE[gnd] : `${gnd}-eyes_${e}-front`;
  if (!grids[key]) { console.log(`  no ${key}`); continue; }
  const g = copyOf(grids[key]), set = subset(g, figs[key][IDLE], (x, y) => y <= REF.front.cut);
  faceSkin(g, [...set].filter(i => !L.clsAt(g, i % g.GW, (i / g.GW) | 0).startsWith("violet")));
  faces.push([`face-${gnd}-${e}`, g, set]);
  meta.face[gnd][e] = `face-${gnd}-${e}`;
}
{
  const g = copyOf(grids["f-bald-back"]), set = subset(g, figs["f-bald-back"][IDLE], (x, y) => y <= REF.back.cut);
  faceSkin(g, set);
  faces.push(["face-back", g, set]);
}

// the ramp: six shades by lightness, from every skin cell
const lum = (c, i) => L.hsl(c[i], c[i + 1], c[i + 2])[2];
const sorted = skinCells.map(([g, i]) => [lum(g.c, i * 4), g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]]).sort((a, b) => a[0] - b[0]);
const RAMP = Array.from({ length: 6 }, (_, k) => {
  const part = sorted.slice(Math.floor(sorted.length * k / 6), Math.floor(sorted.length * (k + 1) / 6));
  return [1, 2, 3].map(j => Math.round(part.reduce((t, q) => t + q[j], 0) / part.length));
});
const rampL = RAMP.map(c => L.hsl(...c)[2]);
const isSkin = new Set(skinCells.map(([g, i]) => g)), skinOf = new Map();
for (const [g, i] of skinCells) { if (!skinOf.has(g)) skinOf.set(g, new Set()); skinOf.get(g).add(i); }
for (const [g, i] of skinCells) {
  const l = lum(g.c, i * 4);
  let k = 0; for (let j = 1; j < RAMP.length; j++) if (Math.abs(rampL[j] - l) < Math.abs(rampL[k] - l)) k = j;
  g.c.set(RAMP[k], i * 4);
}
meta.skin = RAMP;
console.log("skin ramp", RAMP.map(c => "#" + c.map(v => v.toString(16).padStart(2, "0")).join("")).join(" "));
// nothing else may wear a ramp colour exactly
const rampKeys = new Set(RAMP.map(c => c.join(",")));
const unclash = (g, set) => {
  const mine = skinOf.get(g) ?? new Set();
  for (const i of set) {
    if (mine.has(i)) continue;
    while (rampKeys.has(`${g.c[i * 4]},${g.c[i * 4 + 1]},${g.c[i * 4 + 2]}`)) g.c[i * 4 + 2] = g.c[i * 4 + 2] < 255 ? g.c[i * 4 + 2] + 1 : 254;
  }
};

for (const [name, g, set, ax, ay] of bodies) {
  unclash(g, set);
  const im = L.crop(g, set);
  pieces.push({ name, img: im, ox: im.x0 - ax, oy: im.y0 - ay });
}
meta.faceData = {};
for (const [name, g, set] of faces) {
  unclash(g, set);
  const t = name === "face-back" ? "back" : "front";
  const im = L.crop(g, set);
  const piece = { name, img: im, ox: im.x0 - REF[t].hx, oy: im.y0 - REF[t].cut };
  if (t === "front") { const f = faceOf(g, set, im); if (f.eyes.length === 2) meta.faceData[name] = f; else console.log(`  ${name}: ${f.eyes.length} eye(s) found, no blink`); }
  pieces.push(piece);
}

// hair: each hairstyle's overlay alone, drawn over the face
//
// Seen from the front, several of the model's styles part in the middle with bare skin running
// almost to the crown: under dark hair on a pale face it read as a wig sitting too far back
// (2026-10-02: "ทรงผมพวกนี้ มันดูวางผิดตำแหน่งแปลกๆ"). The top of the skull is always hair:
// any skin left there is filled with the style's own main tone. The forehead below is the
// style's to show.
const crown = (() => {
  const g = grids["f-neutral-front"], F = idleOf(g), top = L.bbox(g, F).y0, eyes = eyesAt(g);
  const line = top + Math.round((eyes.y - top) * 0.68), cells = [];
  for (const i of F) { const x = i % g.GW, y = (i / g.GW) | 0; if (y < line && L.clsAt(g, x, y) === "skin") cells.push([x, y]); }
  return cells;
})();
function fillCrown(g, set) {
  // the style's main tone: its most common mid green
  const count = new Map();
  for (const i of set) {
    const o = i * 4, [h, sat, l] = L.hsl(g.c[o], g.c[o + 1], g.c[o + 2]);
    if (L.clsAt(g, i % g.GW, (i / g.GW) | 0) !== "green" || l < 0.25 || l > 0.6 || sat < 0.3) continue;
    const k = (g.c[o] << 16) | (g.c[o + 1] << 8) | g.c[o + 2];
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  const main = [...count.entries()].sort((p, q) => q[1] - p[1])[0]?.[0];
  if (main === undefined) return 0;
  // and its outline: the darkest green it has, for the new hairline's edge
  let dark = main, darkL = 1;
  for (const i of set) {
    const o = i * 4;
    if (L.clsAt(g, i % g.GW, (i / g.GW) | 0) !== "green") continue;
    const l = L.hsl(g.c[o], g.c[o + 1], g.c[o + 2])[2];
    if (l < darkL) { darkL = l; dark = (g.c[o] << 16) | (g.c[o + 1] << 8) | g.c[o + 2]; }
  }
  const added = [];
  let filled = 0;
  for (const [x, y] of crown) {
    const i = y * g.GW + x;
    if (set.has(i)) continue;
    // only where the hair is all round it, left and right: a parting, not past the hair's edge
    let left = false, right = false;
    for (let d = 1; d < 14; d++) { if (set.has(i - d)) left = true; if (set.has(i + d)) right = true; }
    if (!left || !right) continue;
    g.c[i * 4] = main >> 16; g.c[i * 4 + 1] = (main >> 8) & 255; g.c[i * 4 + 2] = main & 255; g.c[i * 4 + 3] = 255;
    set.add(i); added.push(i); filled++;
  }
  // the bottom edge of what was filled, where skin shows below, drawn in the outline's colour
  for (const i of added) if (!set.has(i + g.GW)) { g.c[i * 4] = dark >> 16; g.c[i * 4 + 1] = (dark >> 8) & 255; g.c[i * 4 + 2] = dark & 255; }
  return filled;
}
meta.hair = {};
for (const hair of HAIRS) for (const t of ["front", "back"]) {
  const hk = `f-${hair}-${t}`;
  if (hair === "bald" || !grids[hk]) continue;
  const g = copyOf(grids[hk]);
  const set = hairOverlay(g, figs[hk][IDLE], grids[`f-bald-${t}`], REF[t].cut);
  unclash(g, set);
  if (t === "front") { const n = fillCrown(g, set); if (n) console.log(`  ${hk}: ${n} crown cell(s) filled`); }
  const im = L.crop(g, set);
  const name = `hair-${hair}-${t}`;
  pieces.push({ name, img: im, ox: im.x0 - REF[t].hx, oy: im.y0 - REF[t].cut });
  (meta.hair[hair] ??= {})[t] = name;
}

/** Eye cells (to close for a blink) and the mouth's centre (to open when talking), in piece pixels. */
function faceOf(g, head, im) {
  const violet = [...head].filter(i => L.clsAt(g, i % g.GW, (i / g.GW) | 0) === "violet");
  // eyes: violet patches, each grown by the dark lid above and highlights inside its box
  const comps = [];
  const seen = new Set();
  for (const i of violet) {
    if (seen.has(i)) continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) {
      const q = st.pop(); mem.push(q); const x = q % g.GW, y = (q / g.GW) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const j = (y + dy) * g.GW + x + dx; if (violet.includes(j) && !seen.has(j)) { seen.add(j); st.push(j); }
      }
    }
    if (mem.length >= 2) comps.push(L.bbox(g, new Set(mem)));
  }
  // each eye: its box, and the cells a blink covers: the box grown a cell to the sides and up (the
  // white and the lid), never skin, never hair, never the outline of the hair
  const nearHair = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (head.has((y + dy) * g.GW + x + dx) && L.clsAt(g, x + dx, y + dy) === "green") return true; return false; };
  comps.sort((p, q) => p.x0 - q.x0);
  const eyes = comps.map(b => {
    const cells = [];
    for (let y = b.y0 - 1; y <= b.y1; y++) for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
      const i = y * g.GW + x; if (!head.has(i)) continue;
      const c = L.clsAt(g, x, y);
      const core = x >= b.x0 && x <= b.x1 && y >= b.y0;
      if (c === "green" || (c === "skin" && !core) || nearHair(x, y)) continue;
      cells.push([x - im.x0, y - im.y0]);
    }
    return { x0: b.x0 - im.x0, y0: b.y0 - im.y0, x1: b.x1 - im.x0, y1: b.y1 - im.y0, cells };
  });
  // mouth: under the eyes, near the middle between them, inside the face (not its outline), darker than skin
  let mouth = null;
  if (comps.length === 2) {
    const cx = b2 => (b2.x0 + b2.x1) / 2;
    const mid = (cx(comps[0]) + cx(comps[1])) / 2 + 1;
    const ey = Math.max(...comps.map(b2 => b2.y1));
    const inside = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!head.has((y + dy) * g.GW + x + dx)) return false; return true; };
    let best = null;
    for (let y = ey + 2; y <= ey + 10 && !best; y++) for (let x = Math.floor(mid - 3); x <= Math.ceil(mid + 3); x++) {
      const i = y * g.GW + x; if (!head.has(i) || !inside(x, y)) continue;
      const c = L.clsAt(g, x, y); if (c === "skin" || c === "green") continue;
      const [, , l] = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]);
      if (l < 0.55 && (!best || Math.abs(x - mid) < Math.abs(best.x - mid))) best = { x, y };
    }
    // the chin under that middle: the last row of skin going down
    const mx = Math.round(mid);
    let chin = ey + 1;
    while (head.has((chin + 1) * g.GW + mx) && L.clsAt(g, mx, chin + 1) === "skin") chin++;
    // half way from the eyes to the chin: most smiles are too faint to find at this size
    mouth = { x: mx - im.x0, y: Math.round(ey + (chin - ey) * 0.5) - im.y0 };
  }
  // the face's skin: its commonest skin colour, for shutting the eyes
  const count = new Map();
  for (const i of head) { const x = i % g.GW, y = (i / g.GW) | 0; if (L.clsAt(g, x, y) !== "skin") continue;
    const k = g.c[i * 4] << 16 | g.c[i * 4 + 1] << 8 | g.c[i * 4 + 2]; count.set(k, (count.get(k) ?? 0) + 1); }
  const top = [...count].sort((p, q) => q[1] - p[1])[0]?.[0] ?? 0xe8b090;
  return { eyes, mouth, skin: [top >> 16, (top >> 8) & 255, top & 255] };
}

/* ── 4. pack ───────────────────────────────────────────────────────────── */

const PAD = 1, W = 512;
pieces.sort((a, b) => b.img.h - a.img.h);
let x = PAD, y = PAD, rowH = 0;
for (const p of pieces) {
  if (x + p.img.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
  p.x = x; p.y = y; x += p.img.w + PAD; rowH = Math.max(rowH, p.img.h);
}
const H = y + rowH + PAD;
const sheet = Buffer.alloc(W * H * 4);
for (const p of pieces) for (let r = 0; r < p.img.h; r++)
  p.img.buf.copy(sheet, ((p.y + r) * W + p.x) * 4, r * p.img.w * 4, (r + 1) * p.img.w * 4);
const png = await L.sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10);
meta.image = `pixel-${hash}.png`;
meta.size = [W, H];
meta.frames = Object.fromEntries(pieces.map(p => [p.name, [p.x, p.y, p.img.w, p.img.h, p.ox, p.oy]]));
meta.hairs = Object.keys(meta.hair).filter(h => meta.hair[h].front && meta.hair[h].back);

for (const f of fs.readdirSync(PUB)) if (/^pixel-[0-9a-f]{10}\.png$/.test(f) && f !== meta.image) fs.unlinkSync(path.join(PUB, f));
fs.writeFileSync(path.join(PUB, meta.image), png);
fs.writeFileSync(path.join(PUB, "pixel.json"), JSON.stringify(meta));
console.log(`wrote ${meta.image} ${W}x${H} (${(png.length / 1024).toFixed(0)} KB), ${pieces.length} pieces, hairs: ${meta.hairs.join(" ")}`);

/* ── 5. a debug picture: every gender x hair, walking front and back, at 3x ── */

const cols = [];
for (const gnd of GENDERS) for (const hair of HAIRS) if (hairFor(gnd, hair) && (hair === "bald" || (meta.hair[hair]?.front && meta.hair[hair]?.back))) cols.push([gnd, hair]);
const CW = 80, CH = 100, S = 3;
const dbg = Buffer.alloc(CW * 8 * cols.length * CH * 4);
const DW = CW * 8;
const put = (name, ax, ay, row) => {
  const [px, py, w, h, ox, oy] = meta.frames[name];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const si = ((py + r) * W + px + c) * 4; if (!sheet[si + 3]) continue;
    const X = ax + ox + c, Y = row * CH + ay + oy + r; if (X < 0 || Y < 0 || X >= DW || Y >= cols.length * CH) continue;
    sheet.copy(dbg, (Y * DW + X) * 4, si, si + 4);
  }
};
cols.forEach(([gnd, hair], row) => {
  ["front", "back"].forEach((t, ti) => meta.walk[gnd][t].forEach((f, k) => {
    const ax = (ti * 4 + k) * CW + CW / 2, ay = CH - 6;
    const [, , , , ox, oy] = meta.frames[f.body];
    put(f.body, ax, ay, row);
    put(t === "front" ? meta.face[gnd].round : meta.face.back, ax + f.hx, ay + f.hy, row);
    if (hair !== "bald") put(meta.hair[hair][t], ax + f.hx, ay + f.hy, row);
  }));
});
await L.sharp(dbg, { raw: { width: DW, height: cols.length * CH, channels: 4 } })
  .resize(DW * S, cols.length * CH * S, { kernel: "nearest" }).flatten({ background: "#2a2f3a" }).png().toFile(path.join(DBG, "walk.png"));
console.log("debug: work/debug/walk.png");
