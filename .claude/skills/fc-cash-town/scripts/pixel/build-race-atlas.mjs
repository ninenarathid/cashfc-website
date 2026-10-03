// Cash Town's other races: AI sheets in work/out/<race> -> public/town/pixel-<race>-<hash>.png + pixel-<race>.json.
//
//   node build-race-atlas.mjs <race> [--out <dir>]        (default: fcnext/public/town)
//
// The Lalafell have their own builder (build-pixel-atlas.mjs: the two genders share the girl's
// skull). Every other race keeps a skull per gender, because their men and women differ too
// much in size for one head to fit both. Per gender, in work/out/<race>/ (made by gen-race.mjs):
//   <g>-bald-<type>       the skull and the body's shape: bald, plain base clothes (light-blue tunic)
//   <g>-starter-<type>    the body: the same, in the race's starter outfit
//   <g>-skinkey-<type>    the starter sheet with its bare skin (or fur) painted cyan
//   <g>-eyes_<e>-front    the bald front with other eyes (the bald front's own are "round")
//   <g>-<hair>-<type>     a creator hairstyle on that bald sheet, the hair in key green
//   type = front (walk), back (walk), poses (sit front, sit back, sleep, wave)
// The output has the Lalafell atlas's shape (lib/town/pixeldoll.ts reads both), plus each
// gender's height, its own back of the head, and `furKey` when the race's green is fur
// (Miqo'te ears and tail, recoloured with the hair).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const race = process.argv[2];
if (!race) throw new Error("which race?");
const OUT = path.join(HERE, "work", "out", race);
const DBG = path.join(HERE, "work", "debug");
const argOut = process.argv.indexOf("--out");
const PUB = argOut > 0 ? process.argv[argOut + 1] : "E:/NinenineProject/fcnext/public/town";
fs.mkdirSync(DBG, { recursive: true });
fs.mkdirSync(PUB, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.join(HERE, "races", `${race}.json`), "utf8"));

const onlyG = process.argv.indexOf("--gender");
const GENDERS = ["f", "m"].filter((g) => fs.existsSync(path.join(OUT, `${g}-bald-front.png`)) && (onlyG < 0 || process.argv[onlyG + 1] === g));
const TYPES = ["front", "back", "poses"];
const IDLE = 1;
const EYES = ["round", "big", "sharp", "droopy", "cat", "small"];
const HAIRS = Object.fromEntries(GENDERS.map((g) => [g, R.hairs[g].map((h) => h.id)]));
const file = (g, k, t) => path.join(OUT, `${g}-${k}-${t}.png`);
const have = (g, k, t) => fs.existsSync(file(g, k, t));
const FUR_KEY = race === "miqote" || race === "viera";

/* ── 1. every sheet to cells, on its gender and type's grid, in three palettes, lined up ── */

const grids = {};
const typeGrid = {};
for (const g of GENDERS) {
  for (const t of TYPES) {
    if (!have(g, "bald", t)) continue;
    // one pixel size for all of a gender's sheets, the front's: the back and the poses are edits of the
    // front at the same scale, and measured on their own their grid can come out a little different, which
    // would make the doll taller from behind than from the front
    const frontP = typeGrid[`${g}-front`]?.p;
    // (a read of more than 6.5 is the grid's double: the races are drawn at 4 to 5.5, and a Miqo'te man read at 8
    // was sampled at half his resolution, twice as blocky as the woman; then the half is looked for)
    let tg = L.detectGrid(await L.loadRaw(file(g, "bald", t)), frontP, [4, 8]);
    if (!frontP && tg.p > 6.5) tg = L.detectGrid(await L.loadRaw(file(g, "bald", t)), undefined, [tg.p / 2 - 0.4, tg.p / 2 + 0.4]);
    typeGrid[`${g}-${t}`] = tg;
    const wanted = [["bald", t], ["starter", t], ["skinkey", t]];
    if (t === "front") wanted.push(...EYES.slice(1).map((e) => [`eyes_${e}`, t]));
    if (t !== "poses") wanted.push(...HAIRS[g].map((h) => [h, t]));
    for (const [k] of wanted) {
      if (!have(g, k, t)) continue;
      const raw = await L.loadRaw(file(g, k, t));
      grids[`${g}-${k}-${t}`] = L.cellsOf(raw, L.detectGrid(raw, typeGrid[`${g}-${t}`].p));
    }
  }
  console.log(`${g}: grid front ${typeGrid[`${g}-front`]?.p.toFixed(2)}, back ${typeGrid[`${g}-back`]?.p.toFixed(2)}`);
}
const idleOf = (g) => L.figures(g, L.spansOf(g, 4))[IDLE];
function eyesAt(g) {
  let sx = 0, sy = 0, n = 0;
  for (const i of idleOf(g)) { const x = i % g.GW, y = (i / g.GW) | 0; if (L.clsAt(g, x, y) === "violet") { sx += x; sy += y; n++; } }
  return n ? { x: sx / n, y: sy / n } : null;
}
function earsAt(g) {
  const F = idleOf(g), b = L.bbox(g, F); let lo = null, hi = null;
  for (const i of F) {
    const x = i % g.GW, y = (i / g.GW) | 0;
    if (y > b.y0 + (b.y1 - b.y0) * 0.3 || L.clsAt(g, x, y) !== "skin") continue;
    if (!lo || x < lo.x) lo = { x, y }; if (!hi || x > hi.x) hi = { x, y };
  }
  return lo && hi ? { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 } : null;
}
const feat = {};
for (const g of GENDERS) {
  for (const k of ["bald", ...HAIRS[g]]) {
    if (grids[`${g}-${k}-front`]) feat[`${g}-${k}-front`] = eyesAt(grids[`${g}-${k}-front`]);
    if (grids[`${g}-${k}-back`]) feat[`${g}-${k}-back`] = earsAt(grids[`${g}-${k}-back`]);
  }
}
const rawSkull = {};
for (const key of Object.keys(grids)) if (key.includes("-bald-")) { const g = grids[key]; rawSkull[key] = { GW: g.GW, GH: g.GH, c: Uint8Array.from(g.c) }; }
const role = (k) => (k.includes("-skinkey-") ? "key" : k.includes("-starter-") ? "body" : /-(bald|eyes_)/.test(k) ? "face" : "hair");
/**
 * Where each gender's eyes are, on its bald front sheet as drawn: the two clumps of violet side by side, each as
 * a box of cells. Everything the builder does to eyes it does there and nowhere else: looked for by colour alone,
 * an Au Ra man's grey-blue scales were taken for eyes, turned the eyes' colour and blinked (2026-10-03).
 */
const eyeZone = {};
for (const gnd of GENDERS) {
  const sk = rawSkull[`${gnd}-bald-front`];
  if (!sk) continue;
  const F = idleOf(sk), b = L.bbox(sk, F);
  const violet = [...F].filter((i) => { const [h, s2, l] = L.hsl(sk.c[i * 4], sk.c[i * 4 + 1], sk.c[i * 4 + 2]); return h >= 245 && h <= 320 && s2 > 0.2 && l > 0.12 && ((i / sk.GW) | 0) < b.y0 + (b.y1 - b.y0) * 0.5; });
  const vset = new Set(violet), seen = new Set(), clumps = [];
  for (const i of violet) {
    if (seen.has(i)) continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) {
      const q = st.pop(); mem.push(q); const x = q % sk.GW, y = (q / sk.GW) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = (y + dy) * sk.GW + x + dx; if (vset.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } }
    }
    clumps.push({ ...L.bbox(sk, new Set(mem)), n: mem.length });
  }
  clumps.sort((p, q) => q.n - p.n);
  const mid = (c) => [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2];
  const first = clumps[0], second = first && clumps.slice(1).find((c) => Math.abs(mid(c)[1] - mid(first)[1]) <= 4 && Math.abs(mid(c)[0] - mid(first)[0]) >= 4);
  if (!first) throw new Error(`${gnd}: no eyes found on the bald front sheet (no violet in the top half of the standing figure)`);
  eyeZone[gnd] = [first, second].filter(Boolean);
  console.log(`  ${gnd}: eyes at ${eyeZone[gnd].map((c) => `x ${c.x0}-${c.x1} y ${c.y0}-${c.y1} (${c.n} cells)`).join(" and ")}${second ? "" : " (one found)"}`);
}
/** Whether a cell is at a gender's eyes, give or take `d` cells. */
const atEyes = (gnd, x, y, d) => (eyeZone[gnd] ?? []).some((c) => x >= c.x0 - d && x <= c.x1 + d && y >= c.y0 - d && y <= c.y1 + d);
// The eyes, made clearly violet before the palettes are made: a Roegadyn's are a few dull purple cells, and the shared
// palette turned them grey, so they could be found nowhere (no blink, no eye colour) once other sheets joined it
for (const [k, g] of Object.entries(grids)) {
  if (role(k) !== "face" || !k.endsWith("-front")) continue;
  const gnd = k[0];
  for (let i = 0; i < g.GW * g.GH; i++) {
    if (!g.c[i * 4 + 3] || !atEyes(gnd, i % g.GW, (i / g.GW) | 0, 5)) continue;
    const [h, s2, l] = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]);
    if (h < 240 || h > 320 || s2 <= 0.12 || l <= 0.12 || l >= 0.75) continue;
    // three tones, so they stay a colour of their own in the palette rather than one cell each of many
    [g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]] = L.rgb(262, 0.5, l < 0.3 ? 0.24 : l < 0.55 ? 0.42 : 0.62);
  }
}
const PALS = {};
if (process.env.EYE_DEBUG) { const g = grids["f-bald-front"], F = idleOf(g); const m = new Map(); for (const i of F) { const [h, s2, l] = L.hsl(g.c[i*4], g.c[i*4+1], g.c[i*4+2]); if (h >= 230 && h <= 320 && s2 > 0.1) { const k = `${Math.round(h)},${s2.toFixed(2)},${l.toFixed(2)}`; m.set(k, (m.get(k) ?? 0) + 1); } } console.log("  eye colours before the palette:", JSON.stringify([...m].slice(0, 12))); }
for (const r of ["body", "face", "hair"]) {
  const keys = Object.keys(grids).filter((k) => role(k) === r);
  if (!keys.length) continue;
  PALS[r] = L.paletteOf(keys.map((k) => grids[k]), 96);
  // the eyes' three violets (above) are the face palette's own, or they snap to the tunic's blue-grey
  if (r === "face") PALS[r].push(...[0.24, 0.42, 0.62].map((l) => L.rgb(262, 0.5, l)));
  for (const k of keys) L.snap(grids[k], PALS[r]);
}

if (process.env.EYE_DEBUG) { const g = grids["f-bald-front"], F = idleOf(g); const m = new Map(); for (const i of F) { const c = L.clsAt(g, i % g.GW, (i / g.GW) | 0); m.set(c, (m.get(c) ?? 0) + 1); } console.log("  after the palette, classes:", JSON.stringify([...m])); const v = [...F].filter((i) => { const [h, s2] = L.hsl(g.c[i*4], g.c[i*4+1], g.c[i*4+2]); return h >= 230 && h <= 320 && s2 > 0.1; }).map((i) => L.hsl(g.c[i*4], g.c[i*4+1], g.c[i*4+2]).map((x) => +x.toFixed(2))); console.log("  purples:", JSON.stringify(v.slice(0, 8))); }
function align(a, ref, y0, y1, R = 2) {
  let best = { s: -1e9, dx: 0, dy: 0 };
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    let sc = 0;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < ref.GW; x++) {
      const X = x - dx, Y = y - dy;
      const inA = X >= 0 && Y >= 0 && X < a.GW && Y < a.GH && a.c[(Y * a.GW + X) * 4 + 3];
      if (inA && L.clsAt(a, X, Y) === "green") continue;
      const Rr = ref.c[(y * ref.GW + x) * 4 + 3] !== 0;
      if (inA && Rr) sc++; else if (!!inA !== Rr) sc -= 0.5;
    }
    if (sc > best.s + 0.5 || (Math.abs(sc - best.s) <= 0.5 && Math.abs(dx) + Math.abs(dy) < Math.abs(best.dx) + Math.abs(best.dy))) best = { s: sc, dx, dy };
  }
  return best;
}
for (const g of GENDERS) for (const t of TYPES) {
  const fb = grids[`${g}-bald-${t}`];
  if (!fb) continue;
  let top = fb.GH, bot = 0;
  for (let i = 0; i < fb.GW * fb.GH; i++) if (fb.c[i * 4 + 3]) { const y = (i / fb.GW) | 0; if (y < top) top = y; if (y > bot) bot = y; }
  const head = [top, Math.round(top + (bot - top) * 0.42)];
  for (const k of ["starter", "skinkey", ...(t === "front" ? EYES.slice(1).map((e) => `eyes_${e}`) : [])]) {
    const key = `${g}-${k}-${t}`;
    if (!grids[key]) continue;
    const r = align(grids[key], fb, head[0], head[1]);
    if (r.dx || r.dy) { grids[key] = L.shifted(grids[key], r.dx, r.dy); console.log(`shift ${key} by ${r.dx},${r.dy}`); }
  }
  // hairstyles: by what the hair sits on, the eyes in front and the ear tips behind
  if (t === "poses") continue;
  const ref = feat[`${g}-bald-${t}`];
  for (const h of HAIRS[g]) {
    const key = `${g}-${h}-${t}`, at = feat[key];
    if (!grids[key]) continue;
    // a furry race's ears are drawn in the hair's green, so there are no skin ear tips to go by from behind:
    // the legs and feet then, which no hairstyle reaches and every sheet draws the same
    if (t === "back" && FUR_KEY) {
      const r = align(grids[key], fb, Math.round(top + (bot - top) * 0.62), bot, 8);
      if (r.dx || r.dy) { grids[key] = L.shifted(grids[key], r.dx, r.dy); console.log(`shift ${key} by ${r.dx},${r.dy} (by the legs)`); }
      continue;
    }
    // eyes (or ear tips) the hairstyle hides, or more than three cells out, are no guide (a Viera man's bangs over
    // his eyes moved Short Shag with Bangs 6 across and 8 up, 2026-10-03): then the legs, as for a furry race's back
    const byLegs = () => {
      const r = align(grids[key], fb, Math.round(top + (bot - top) * 0.62), bot, 8);
      if (r.dx || r.dy) { grids[key] = L.shifted(grids[key], r.dx, r.dy); console.log(`shift ${key} by ${r.dx},${r.dy} (by the legs)`); }
    };
    if (!at || !ref) { byLegs(); continue; }
    const dx = Math.round(ref.x - at.x), dy = Math.round(ref.y - at.y);
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { byLegs(); continue; }
    if (dx || dy) { grids[key] = L.shifted(grids[key], dx, dy); console.log(`shift ${key} by ${dx},${dy}`); }
  }
}

/* ── 2. frames ─────────────────────────────────────────────────────────── */

const figs = {};
for (const g of GENDERS) for (const t of TYPES) {
  const base = grids[`${g}-bald-${t}`];
  if (!base) continue;
  const sp = L.spansOf(base, 4);
  for (const key of Object.keys(grids)) if (key.startsWith(`${g}-`) && key.endsWith(`-${t}`)) figs[key] = L.figures(grids[key], sp);
}

/**
 * The chin cut of a figure in the base clothes: the narrowest row above the first row of tunic blue near the head
 * (`found`: there was such a row).
 */
function chinOf(g, set) {
  const b = L.bbox(g, set);
  let sx = 0, n = 0;
  for (const i of set) { const y = (i / g.GW) | 0; if (y < b.y0 + (b.y1 - b.y0) * 0.3) { sx += i % g.GW; n++; } }
  const hx = Math.round(sx / n);
  let eyes = b.y0 + 10;
  for (const i of set) { const y = (i / g.GW) | 0; if (y < b.y0 + (b.y1 - b.y0) * 0.5 && L.clsAt(g, i % g.GW, y) === "violet") eyes = Math.max(eyes, y); }
  let blue = b.y1;
  for (let y = eyes + 3; y <= b.y1 && blue === b.y1; y++) {
    let k = 0; for (let x = hx - 9; x <= hx + 9; x++) if (set.has(y * g.GW + x) && L.clsAt(g, x, y) === "blue") k++;
    if (k >= 3) blue = y;
  }
  let best = blue - 1, bw = 1e9;
  for (let y = blue - 9; y < blue; y++) {
    let w = 0; for (let x = hx - 16; x <= hx + 16; x++) if (set.has(y * g.GW + x)) w++;
    if (w <= bw) { bw = w; best = y; }
  }
  return { cut: best - 1, hx, found: blue < b.y1 };
}

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

/** A hairstyle's hair over its own bald sheet: the green, its outline, what the style added (see build-pixel-atlas). */
function hairOverlay(g, set, base, cut) {
  const cl = (i) => L.clsAt(g, i % g.GW, (i / g.GW) | 0);
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
  const nearEye = (i) => around(i, true).some((j) => set.has(j) && cl(j) === "violet");
  const nearGreen = (i) => around(i, true).some((j) => green.has(j) || around(j, true).some((k) => green.has(k)));
  const out = new Set(green);
  for (const i of set) {
    if (out.has(i) || cl(i) !== "dark" || nearEye(i)) continue;
    const g4 = around(i, false).filter((j) => green.has(j)).length, g8 = around(i, true).filter((j) => green.has(j)).length;
    if (g4 >= 1 || g8 >= 2) out.add(i);
  }
  const added = (i) => {
    const c = cl(i);
    if (c === "violet" || c === "green" || nearEye(i)) return false;
    const x = i % g.GW, y = (i / g.GW) | 0;
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
  const st = [...set].filter((i) => !out.has(i) && around(i, false).some((j) => out.has(j)) && added(i));
  const took = new Set(st);
  while (st.length && took.size < 2500) {
    const i = st.pop(); out.add(i);
    for (const j of around(i, false)) if (set.has(j) && !took.has(j) && !out.has(j) && added(j)) { took.add(j); st.push(j); }
  }
  for (let pass = 0; pass < 2; pass++) for (const i of set) {
    if (!out.has(i) && cl(i) !== "skin" && around(i, false).filter((j) => out.has(j)).length >= 3) out.add(i);
  }
  return out;
}

/* ── 3. pieces ─────────────────────────────────────────────────────────── */

const pieces = [];
const meta = { v: 3, race, eyes: EYES, walk: {}, sit: {}, face: {}, hair: {}, height: {}, scale: {}, furKey: FUR_KEY };
// The model draws each race at its own pixel size; the town draws every picture pixel the same size, so each
// gender's pieces carry how big their pixels were against the Lalafell's, and are drawn that much smaller or larger:
// the races then stand at the heights they were drawn at beside a Lalafell.
const LALA_P = L.detectGrid(await L.loadRaw(path.join(HERE, "work", "out", "f-bald-front.png"))).p;
for (const g of GENDERS) meta.scale[g] = +(typeGrid[`${g}-front`].p / LALA_P).toFixed(4);
console.log("pixel scale against the Lalafell", JSON.stringify(meta.scale));
const subset = (g, set, pred) => new Set([...set].filter((i) => pred(i % g.GW, (i / g.GW) | 0)));
const copyOf = (g) => ({ GW: g.GW, GH: g.GH, c: Uint8Array.from(g.c) });

const REF = {};
for (const g of GENDERS) {
  REF[g] = {};
  for (const t of ["front", "back"]) {
    const key = `${g}-bald-${t}`, sk = grids[key], idle = figs[key][IDLE];
    REF[g][t] = { g: sk, idle, ...chinOf(rawSkull[key], idle) };
    // the head's own width across its middle, and the line below which the head piece keeps only that width
    // (trimHead): the body takes over the shoulders and collar there
    {
      const R0 = REF[g][t], head = [...idle].filter((i) => ((i / sk.GW) | 0) <= R0.cut), ys = head.map((i) => (i / sk.GW) | 0);
      const top = Math.min(...ys), mid = Math.round(top + (R0.cut - top) * 0.45);
      let x0 = 1e9, x1 = -1;
      for (const i of head) if (Math.abs(((i / sk.GW) | 0) - mid) <= 2) { const x = i % sk.GW; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      R0.band = { x0, x1, low: top + (R0.cut - top) * 0.6 };
    }
    console.log(`${g} ${t}: chin cut ${REF[g][t].cut}, head x ${REF[g][t].hx}`);
  }
  // how tall the standing doll is, ears and horns included (for names and taps), and to the top of the
  // head alone (its skin), which is what the town sizes races by: Viera ears do not count against them
  const bg = grids[`${g}-bald-front`], bf = figs[`${g}-bald-front`][IDLE], b = L.bbox(bg, bf);
  meta.height[g] = b.y1 - b.y0 + 1;
  // The top of the skull: up the head's own middle from the chin until it runs out, so ears and horns, beside
  // it or above it, never count (a Viera's ears, their pink inside taken for skin, had made the men stand at two
  // thirds of their height, 2026-10-02)
  const hx = REF[g].front.hx, drawn = (y) => bf.has(y * bg.GW + hx) || bf.has(y * bg.GW + hx - 1) || bf.has(y * bg.GW + hx + 1);
  let skinTop = REF[g].front.cut;
  while (skinTop > b.y0 && drawn(skinTop - 1)) skinTop--;
  (meta.body ??= {})[g] = b.y1 - skinTop + 1;
  console.log(`  ${g}: ${b.y1 - b.y0 + 1} tall with ears and horns, ${meta.body[g]} to the top of the skull`);
}

const isWarm = (c, i) => { const [h, s, l] = L.hsl(c[i], c[i + 1], c[i + 2]); return (h <= 45 || h >= 345) && s > 0.2 && l > 0.25 && l < 0.92; };
const isCyan = (c, i) => { const [h, s, l] = L.hsl(c[i], c[i + 1], c[i + 2]); return h >= 160 && h <= 215 && s > 0.3 && l > 0.2; };
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
const skinCells = [];
/** Every body frame with its skin-key sheet, for the skin pass below: { gnd, name, g, body, key }. */
const skinJobs = [];
/** Per grid, the cells found to be skin on its bodies (the faces ask the standing step's). */
const bodySkin = new Map();

const bodies = [];
/** Every walking step, kept to check that its body and head together leave no hole (see below). */
const checks = [];
for (const gnd of GENDERS) {
  meta.walk[gnd] = {};
  for (const t of ["front", "back"]) {
    const Rf = REF[gnd][t];
    const src = grids[`${gnd}-starter-${t}`] ? `${gnd}-starter-${t}` : `${gnd}-bald-${t}`;
    const g = copyOf(grids[src]), F = figs[src];
    const key = grids[`${gnd}-skinkey-${t}`];
    const frames = [];
    // A sheet may have a step drawn wrong, and a race's file says which earlier step stands in for it (`steps`).
    // The Elezen woman's last front step came without her sleeve puff, a white armband in its place, so the puff
    // blinked off once a stride. Its twin, the other passing step, is walked twice instead.
    const stepAs = R.steps?.[gnd]?.[t];
    if (stepAs && (stepAs.length !== 4 || stepAs.some((v, k) => !(v === k || (Number.isInteger(v) && v >= 0 && v < k && stepAs[v] === v))))) throw new Error(`${race}.json steps.${gnd}.${t}: four steps, each itself or an earlier one that is itself`);
    for (let k = 0; k < 4; k++) {
      if (stepAs && stepAs[k] !== k) { frames.push(frames[stepAs[k]]); console.log(`  ${gnd} ${t}: step ${k} is step ${stepAs[k]} again`); continue; }
      const s = headShift(Rf.g, Rf.idle, Rf.cut, g, F[k]);
      const ay = L.bbox(g, F[k]).y1, ax = Rf.hx + s.sx;
      const body = bodyOf(g, F[k], s, Rf);
      const name = `body-${gnd}-${t}-${k}`;
      skinJobs.push({ gnd, name, g, body, key, view: t, s, bald: src === `${gnd}-bald-${t}` ? null : { g: grids[`${gnd}-bald-${t}`], dx: 0, dy: 0 } });
      bodies.push([name, g, body, ax, ay]);
      checks.push({ gnd, t, k, g, frame: F[k], body, s, view: t, Rf });
      frames.push({ body: name, hx: 0, hy: Rf.cut + s.sy - ay });
    }
    meta.walk[gnd][t] = frames;
    console.log(`  ${gnd} ${t}: head moves`, frames.map((f) => f.hy).join(" "), src === `${gnd}-bald-${t}` ? "(no starter outfit yet: base clothes)" : "");
  }
}

/**
 * A head piece's cells on its own sheet: a gender's face of one eye shape ("round" is the bald front itself), or
 * the back of its head ("back"). Cut once; the sitting bodies ask before the faces themselves are made.
 */
const headSets = new Map();
function headSet(gnd, e) {
  const id = `${gnd}-${e}`;
  if (headSets.has(id)) return headSets.get(id);
  const t = e === "back" ? "back" : "front", key = e === "back" ? `${gnd}-bald-back` : e === "round" ? `${gnd}-bald-front` : `${gnd}-eyes_${e}-front`;
  let set = null;
  if (grids[key]) {
    const g = grids[key], cut = REF[gnd][t].cut;
    // (another eye shape leaves out only what the round face did, widened by two cells: each sheet draws the
    // tunic a cell or two apart; a Hrothgar man's kept a light-blue patch)
    let like = null;
    if (t === "front" && e !== "round") {
      const round = headSet(gnd, "round"), R = grids[`${gnd}-bald-front`];
      like = new Set();
      for (const i of round.leftOut) { const x = i % R.GW, y = (i / R.GW) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) like.add((y + dy) * g.GW + x + dx); }
    }
    set = trimHead(g, subset(g, figs[key][IDLE], (x, y) => y <= cut), cut, grids[`${gnd}-starter-${t}`], like);
    // what is left apart from the head low down is not the head's: a cell or two of the base clothes that the trim
    // missed (standing, it lay on the body's own cell; on a sitting body it floated beside the neck), or a whole
    // strip of the base collar with the neck showing in it, kept because the outfit is cream there too (a
    // Roegadyn man's lay over his scarf on every step, the neck in it as a blotch of skin on the scarf). The body
    // has all of that part of the figure itself (bodyOf), so nothing goes missing.
    {
      let top = 1e9; for (const i of set) top = Math.min(top, (i / g.GW) | 0);
      const low = top + (cut - top) * 0.6, seen = new Set(), comps = [];
      for (const i of set) {
        if (seen.has(i)) continue;
        const st = [i], mem = []; seen.add(i);
        while (st.length) {
          const q = st.pop(); mem.push(q); const x = q % g.GW, y = (q / g.GW) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * g.GW + x + dx; if (set.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } }
        }
        comps.push(mem);
      }
      comps.sort((p, q) => q.length - p.length);
      for (const mem of comps.slice(1)) if (mem.every((q) => ((q / g.GW) | 0) >= low)) {
        for (const q of mem) { set.delete(q); set.leftOut.add(q); }
        if (mem.length >= 20) console.log(`  ${id}: ${mem.length} cells apart from the head, below it, left to the body`);
      }
    }
  }
  headSets.set(id, set);
  return set;
}

/**
 * How far one sheet's figure is from another's, in cells: the move that lays the upper half of `frame` (on `g`)
 * best on `fb` (on `gb`), as silhouettes. `gb`'s cell (x − dx, y − dy) is `g`'s (x, y).
 */
function figureShift(g, frame, gb, fb) {
  const b = L.bbox(g, frame), y1 = b.y0 + Math.round((b.y1 - b.y0) * 0.5);
  const upper = [...frame].filter((i) => ((i / g.GW) | 0) <= y1).map((i) => [i % g.GW, (i / g.GW) | 0]);
  let best = { sc: -1e9, dx: 0, dy: 0 };
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    let sc = 0;
    for (const [x, y] of upper) { const X = x - dx, Y = y - dy; sc += X >= 0 && Y >= 0 && X < gb.GW && Y < gb.GH && fb.has(Y * gb.GW + X) ? 1 : -1; }
    for (const i of fb) { const x = (i % gb.GW) + dx, y = ((i / gb.GW) | 0) + dy; if (y <= y1 && !(x >= 0 && y >= 0 && x < g.GW && frame.has(y * g.GW + x))) sc--; }
    if (sc > best.sc || (sc === best.sc && Math.abs(dx) + Math.abs(dy) < Math.abs(best.dx) + Math.abs(best.dy))) best = { sc, dx, dy };
  }
  return best;
}

/**
 * Where a sitting frame's own head is, and how big, against the shared head: the shared head's shape scaled about
 * its chin and laid on the frame with its chin on the frame's own (`chin`, found on the bald poses sheet as the
 * standing chin is; without one, the chin's row is searched for too). The size and the column are the ones at
 * which the skull's upper three fifths (from the top of the skull, never the ears or horns above it, which are
 * posed as they like) agree best with the frame, as silhouettes: the cells both have, over the cells either has.
 * Gives the scale, where the shared head's reference column and chin row go, and the frame's cells that are its
 * own head: all of it above its skull's top, and the scaled shape, a little wider, down to the chin.
 */
function fitHead(g, frame, Rf, head, chin) {
  const B = Rf.g, cut = Rf.cut, hx = Rf.hx;
  const has = (set, x, y) => x >= 0 && y >= 0 && x < B.GW && y < B.GH && set.has(y * B.GW + x);
  // the top of the skull: up the head's own middle from the chin, on the whole bald figure
  let skullTop = cut;
  while (skullTop > 0 && [-1, 0, 1].some((d) => has(Rf.idle, hx + d, skullTop - 1))) skullTop--;
  const lowS = Math.round(skullTop + (cut - skullTop) * 0.6);
  const upper = new Set([...head].filter((i) => { const y = (i / B.GW) | 0; return y >= skullTop && y < lowS; }));
  let ux0 = 1e9, ux1 = -1;
  for (const i of upper) { const x = i % B.GW; ux0 = Math.min(ux0, x); ux1 = Math.max(ux1, x); }
  const fr = (X, Y) => X >= 0 && Y >= 0 && X < g.GW && Y < g.GH && frame.has(Y * g.GW + X);
  const agree = (r, c, cy) => {
    const Y0 = Math.ceil(cy + (skullTop - cut) * r), Y1 = Math.floor(cy + (lowS - cut) * r) - 1;
    const X0 = Math.floor(c + (ux0 - hx) * r) - 4, X1 = Math.ceil(c + (ux1 - hx) * r) + 4;
    let both = 0, either = 0;
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
      const inM = has(upper, Math.round(hx + (X - c) / r), Math.round(cut + (Y - cy) / r)), f2 = fr(X, Y);
      if (inM || f2) either++;
      if (inM && f2) both++;
    }
    return both / Math.max(1, either);
  };
  const fb = L.bbox(g, frame);
  let cys, c0;
  if (chin) { cys = [chin.cut, chin.cut - 1, chin.cut + 1]; c0 = chin.hx; }
  else {
    // no chin to go by: wherever below the frame's top a head of this kind may end
    const hb = L.bbox(B, head), lo = Math.round(fb.y0 + (cut - skullTop) * 0.8), hi = Math.round(fb.y0 + (cut - hb.y0) * 1.35) + 4;
    cys = []; for (let y = lo; y <= hi; y++) cys.push(y);
    const top = [...frame].filter((i) => ((i / g.GW) | 0) < fb.y0 + (cut - hb.y0) * 0.6);
    c0 = Math.round(top.reduce((t, i) => t + (i % g.GW), 0) / top.length);
  }
  let best = { sc: -1, r: 1, c: c0, cy: cys[0] };
  for (const cy of cys) for (let n = -20; n <= 35; n++) for (let dc = -6; dc <= 6; dc++) {
    const r = 1 + n * 0.01, c = c0 + dc, sc = agree(r, c, cy);
    if (sc > best.sc + 1e-9) best = { sc, r, c, cy };
  }
  const { r, c, cy } = best, ownTop = cy + (skullTop - cut) * r, ownLow = cy + ((Rf.band?.low ?? lowS) - cut) * r;
  const src = (X, Y) => has(head, Math.round(hx + (X - c) / r), Math.round(cut + (Y - cy) / r));
  // own: above its skull there is nothing but its ears and horns; high on the head, anything within three cells
  // of the shape (nothing but head is there); from the cheeks down, the shape itself and the cell beside it.
  // core: within the shape itself. wide: from the cheeks to three rows under the chin, within three cells of the
  // shape (where a jaw drawn further out than the standing head's may be: ownHead says which of it is head).
  const own = new Set(), core = new Set(), wide = new Set();
  for (const i of frame) {
    const X = i % g.GW, Y = (i / g.GW) | 0;
    if (Y > cy + 3) continue;
    const exact = src(X, Y);
    let near3 = exact;
    for (let dy = -3; dy <= 3 && !near3; dy++) for (let dx = -3; dx <= 3; dx++) if (src(X + dx, Y + dy)) { near3 = true; break; }
    if (Y <= cy) {
      if (exact) core.add(i);
      if (Y < ownTop - 1 || (Y < ownLow ? near3 : exact || src(X - 1, Y) || src(X + 1, Y))) own.add(i);
    }
    if (near3 && Y >= ownLow) wide.add(i);
  }
  return { r, ax: Math.round(c), cy, own, core, wide, ownTop, agree: best.sc, byChin: !!chin };
}

/**
 * Which of the cells round a sitting frame's head are its own head, and which the outfit's that lies over it or
 * beside it (a scarf up to the cheeks, a shoulder pad against the jaw). The candidates are what the scaled shape
 * takes in (fitHead), the skin within three cells of it from the cheeks down with the thin dark line along it (a
 * jaw drawn further out than the standing head's), and what the bald poses sheet shows to be head (`byBald`).
 * Of those, the head's are:
 * - everything above the top of its skull (ears, horns);
 * - skin (the pose's skin-key sheet has it cyan);
 * - a dark line a cell or two wide (its outline), and dark three cells thick only where most of the blob lies
 *   within the head's shape (the shadow under a chin; a shoulder pad's black runs far outside it);
 * - any other colour only if the shared head has it (ears' fur, horns, scales): a scarf's cream, a fur trim,
 *   steel are the outfit's.
 */
function ownHead(g, frame, fit, key, Rf, head, byBald) {
  const GW = g.GW, ks = key ? keyShift(g, key, frame) : null;
  const keyed = (i) => {
    if (!key) return false;
    const x = (i % GW) + ks.dx, y = ((i / GW) | 0) + ks.dy;
    return x >= 0 && y >= 0 && x < key.GW && y < key.GH && !!key.c[(y * key.GW + x) * 4 + 3] && isCyan(key.c, (y * key.GW + x) * 4);
  };
  const isDark = (i) => L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2] < 0.36;
  const darkAt = (x, y) => x >= 0 && y >= 0 && x < GW && y < g.GH && frame.has(y * GW + x) && isDark(y * GW + x);
  const thick = new Map();
  const isThick = (i) => {
    let v = thick.get(i);
    if (v !== undefined) return v;
    v = false;
    const x = i % GW, y = (i / GW) | 0;
    for (let oy = -1; oy <= 1 && !v; oy++) for (let ox = -1; ox <= 1 && !v; ox++) {
      let all = true;
      for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) if (!darkAt(x + ox + dx, y + oy + dy)) { all = false; break; }
      if (all) v = true;
    }
    thick.set(i, v);
    return v;
  };
  const blob = new Map();
  const headBlob = (i) => {
    if (blob.has(i)) return blob.get(i);
    const st = [i], mem = [], seen = new Set([i]);
    while (st.length && mem.length < 6000) {
      const q = st.pop(); mem.push(q); const x = q % GW, y = (q / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= GW || Y >= g.GH) continue;
        const j = Y * GW + X;
        if (!seen.has(j) && frame.has(j) && isDark(j) && isThick(j)) { seen.add(j); st.push(j); }
      }
    }
    const v = mem.filter((q) => fit.core.has(q)).length >= mem.length * 0.7;
    for (const q of mem) blob.set(q, v);
    return v;
  };
  // the shared head's common colours
  const count = new Map();
  for (const i of head) { const c = (Rf.g.c[i * 4] << 16) | (Rf.g.c[i * 4 + 1] << 8) | Rf.g.c[i * 4 + 2]; count.set(c, (count.get(c) ?? 0) + 1); }
  const common = [...count].filter(([, n]) => n >= Math.max(4, head.size * 0.004)).map(([c]) => [c >> 16, (c >> 8) & 255, c & 255]);
  const likeHead = (i) => common.some((q) => Math.abs(q[0] - g.c[i * 4]) + Math.abs(q[1] - g.c[i * 4 + 1]) + Math.abs(q[2] - g.c[i * 4 + 2]) <= 60);
  const around = (i) => { const x = i % GW, y = (i / GW) | 0, out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < GW && Y < g.GH) out.push(Y * GW + X); } return out; };

  const cand = new Set(fit.own);
  for (const i of fit.wide) if (!cand.has(i) && keyed(i)) cand.add(i);
  for (const i of fit.wide) if (!cand.has(i) && isDark(i) && !isThick(i) && around(i).some((j) => cand.has(j) && keyed(j))) cand.add(i);
  for (const i of byBald ?? []) cand.add(i);
  const own = new Set();
  let outfit = 0;
  for (const i of cand) {
    const y = (i / GW) | 0;
    const mine = y < fit.ownTop - 1 || keyed(i) || (isDark(i) ? !isThick(i) || headBlob(i) : likeHead(i));
    if (mine) own.add(i); else outfit++;
  }
  return { own, outfit };
}

/**
 * A sitting frame's own head, as the same pose in the base clothes shows it: on the bald poses sheet everything
 * of the figure down to the chin that is not the tunic (its blue, joined to the tunic below the chin, and the
 * cream of its collar) is head: skull, face, jaw, ears, horns. The outfit sheet is that sheet dressed, so its
 * cells where the bald sheet has head of about the same colour are its own head too (where the outfit covers the
 * jaw, a scarf, the colours differ, and the cell is the outfit's). Catches what the scaled shape misses: a jaw
 * drawn further out than the standing head's.
 * `d`: the bald sheet's cell (x − d.dx, y − d.dy) is the outfit sheet's (x, y); `cy`: the chin's row on the latter.
 */
function baldHead(g, frame, gb, fb, d, cy) {
  const cyB = cy - d.dy, GW = gb.GW, cl = (i) => L.clsAt(gb, i % GW, (i / GW) | 0);
  // the tunic: blue joined to blue below the chin
  const tunic = new Set(), st = [];
  for (const i of fb) if (((i / GW) | 0) > cyB && cl(i) === "blue") { tunic.add(i); st.push(i); }
  while (st.length) {
    const q = st.pop(), x = q % GW, y = (q / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= GW || Y >= gb.GH) continue;
      const j = Y * GW + X;
      if (fb.has(j) && !tunic.has(j) && cl(j) === "blue") { tunic.add(j); st.push(j); }
    }
  }
  // its collar: light cells that are not skin, within two cells of the tunic, near the chin
  const nearTunic = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tunic.has((y + dy) * GW + x + dx)) return true; return false; };
  const head = new Set();
  for (const i of fb) {
    const x = i % GW, y = (i / GW) | 0;
    if (y > cyB + 3 || tunic.has(i)) continue;
    const c = cl(i), light = L.hsl(gb.c[i * 4], gb.c[i * 4 + 1], gb.c[i * 4 + 2])[2];
    if (y >= cyB - 8 && c !== "skin" && light > 0.7 && nearTunic(x, y)) continue;
    head.add(i);
  }
  const own = new Set();
  for (const i of frame) {
    const x = i % g.GW, y = (i / g.GW) | 0;
    if (y > cy + 3) continue;
    let hit = false;
    for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x - d.dx + dx, Y = y - d.dy + dy;
      if (X < 0 || Y < 0 || X >= GW || Y >= gb.GH) continue;
      const j = Y * GW + X;
      if (!head.has(j)) continue;
      if (Math.abs(g.c[i * 4] - gb.c[j * 4]) + Math.abs(g.c[i * 4 + 1] - gb.c[j * 4 + 1]) + Math.abs(g.c[i * 4 + 2] - gb.c[j * 4 + 2]) < 90) { hit = true; break; }
    }
    if (hit) own.add(i);
  }
  return own;
}

/**
 * What is left of a sitting frame's own head once the head is cut out by the shared head's shape, which never fits
 * to the cell: bits apart from the body that end above the chin (the tip of an ear or a horn, a speck of outline),
 * and slivers a cell or two wide along the cut, above the chin (the head's own outline, where it ran a little
 * outside the shape). Moves them from `body` to `own`; returns how many.
 */
function tidyHead(g, body, own, cy0) {
  const cy = cy0 + 3;
  const GW = g.GW, at = (x, y) => (x >= 0 && y >= 0 && x < GW && y < g.GH ? y * GW + x : -1);
  let n = 0;
  const apart = () => {
    const seen = new Set(), comps = [];
    for (const i of body) {
      if (seen.has(i)) continue;
      const st = [i], mem = []; seen.add(i);
      while (st.length) {
        const q = st.pop(); mem.push(q); const x = q % GW, y = (q / GW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = at(x + dx, y + dy); if (j >= 0 && body.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } }
      }
      comps.push(mem);
    }
    comps.sort((p, q) => q.length - p.length);
    for (const mem of comps.slice(1)) {
      let low = 0; for (const q of mem) low = Math.max(low, (q / GW) | 0);
      if (low <= cy) for (const q of mem) { body.delete(q); own.add(q); n++; }
    }
  };
  apart();
  for (let round = 0; round < 2; round++) {
    const thin = [];
    for (const i of body) {
      const x = i % GW, y = (i / GW) | 0;
      if (y > cy) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const j = at(x + dx, y + dy); if (j >= 0 && own.has(j)) { near = true; break; } }
      if (!near) continue;
      // within some 3 by 3 block of body? then it is no sliver
      let thick = false;
      for (let oy = -1; oy <= 1 && !thick; oy++) for (let ox = -1; ox <= 1 && !thick; ox++) {
        let all = true;
        for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) { const j = at(x + ox + dx, y + oy + dy); if (j < 0 || !body.has(j)) { all = false; break; } }
        if (all) thick = true;
      }
      if (!thick) thin.push(i);
    }
    for (const i of thin) { body.delete(i); own.add(i); n++; }
  }
  apart();
  return n;
}

/**
 * Which cells of a sitting frame's own head stay in its body, the shared head being laid over it. The shared head
 * is not the size of the pose's own (see the sitting loop), so of the own head's cells that it does not cover:
 * - those that stand out past it into the open (a wider cheek, the rim of a bigger skull) go, or they would show
 *   as a second outline round the head;
 * - those in the nooks between the head and the body (under the jaw, between a cheek and a collar or a shoulder
 *   pad) stay, or the background would show through at the neck.
 * A nook is where a square `2k+1` cells wide, moved in from outside, cannot come: the head it wears (`cov`, what
 * every eye shape covers) and the rest of the body (`rest`) are in its way; the own head's cells are not.
 * And what is kept has to join the two: of the cells the square cannot reach, a clump that touches the head and
 * not the body is a step in the head's own outline (the shared head a cell narrower there than the pose's, under
 * an ear or a horn), open to the air, and what was kept in one stood beside the head as a line of the art's own
 * skin outside its outline (an Au Ra sitting, seen from behind, 2026-10-03). Under a jaw the clump runs down to
 * the collar, and stays whole.
 */
function neckFill(g, own, rest, cov, from, k = 3) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const set of [own, cov]) for (const i of set) { const x = i % g.GW, y = (i / g.GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  x0 -= k + 3; y0 -= k + 3; x1 += k + 3; y1 += k + 3;
  const W2 = x1 - x0 + 1, H2 = y1 - y0 + 1, at = (x, y) => (y - y0) * W2 + (x - x0);
  // where the square reaches, with these cells in its way
  const sweep = (inWay) => {
    const blocked = new Uint8Array(W2 * H2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= g.GW || y >= g.GH || !inWay(y * g.GW + x)) continue;
      for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { const X = x + dx, Y = y + dy; if (X >= x0 && Y >= y0 && X <= x1 && Y <= y1) blocked[at(X, Y)] = 1; }
    }
    const reach = new Uint8Array(W2 * H2), st = [];
    const seed = (x, y) => { const j = at(x, y); if (!blocked[j] && !reach[j]) { reach[j] = 1; st.push(j); } };
    for (let x = x0; x <= x1; x++) { seed(x, y0); seed(x, y1); }
    for (let y = y0; y <= y1; y++) { seed(x0, y); seed(x1, y); }
    while (st.length) {
      const q = st.pop(), x = (q % W2) + x0, y = ((q / W2) | 0) + y0;
      if (x > x0) seed(x - 1, y); if (x < x1) seed(x + 1, y); if (y > y0) seed(x, y - 1); if (y < y1) seed(x, y + 1);
    }
    const swept = new Uint8Array(W2 * H2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!reach[at(x, y)]) continue;
      for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) { const X = x + dx, Y = y + dy; if (X >= x0 && Y >= y0 && X <= x1 && Y <= y1) swept[at(X, Y)] = 1; }
    }
    return swept;
  };
  const swept = sweep((i) => cov.has(i) || rest.has(i));
  const nook = new Set();
  // (only from the cheeks down, `from`: higher up, a nook is between two ears, and nothing of the own head belongs there)
  for (const i of own) { if (cov.has(i)) continue; const x = i % g.GW, y = (i / g.GW) | 0; if (y >= from && !swept[at(x, y)]) nook.add(i); }
  const fill = new Set(), seen = new Set();
  for (const i of nook) {
    if (seen.has(i)) continue;
    const st = [i], mem = []; seen.add(i);
    let toBody = false;
    while (st.length) {
      const q = st.pop(), x = q % g.GW, y = (q / g.GW) | 0; mem.push(q);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= g.GW || Y >= g.GH) continue;
        const n = Y * g.GW + X;
        if (rest.has(n)) toBody = true;
        else if (nook.has(n) && !seen.has(n)) { seen.add(n); st.push(n); }
      }
    }
    if (toBody) for (const q of mem) fill.add(q);
  }
  return fill;
}

/**
 * The own head's outline and the shadow under its chin, where they run through what was kept of it (neckFill),
 * painted as the skin beside them: dark under the shared head's own outline read as a second jaw, or as a black
 * blob at the neck. (What is dark here is the head's: ownHead left the outfit's dark out.) Returns how many cells
 * were painted.
 */
function skinOver(g, fill, own) {
  const GW = g.GW, was = Uint8Array.from(g.c);
  const light = (i) => L.hsl(was[i * 4], was[i * 4 + 1], was[i * 4 + 2])[2];
  let n = 0;
  for (const i of fill) {
    if (light(i) >= 0.36) continue;
    // the nearest skin of its own head, a few cells off at most
    let from = -1;
    const seen = new Set([i]);
    let ring = [i];
    for (let d = 0; d < 7 && from < 0 && ring.length; d++) {
      const next = [];
      for (const q of ring) {
        const qx = q % GW, qy = (q / GW) | 0;
        for (let dy = -1; dy <= 1 && from < 0; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = qx + dx, Y = qy + dy; if (X < 0 || Y < 0 || X >= GW || Y >= g.GH) continue;
          const j = Y * GW + X;
          if (seen.has(j) || !own.has(j)) continue;
          seen.add(j);
          if (isWarm(was, j * 4) && light(j) >= 0.45) { from = j; break; }
          next.push(j);
        }
        if (from >= 0) break;
      }
      ring = next;
    }
    if (from < 0) continue;
    g.c[i * 4] = was[from * 4]; g.c[i * 4 + 1] = was[from * 4 + 1]; g.c[i * 4 + 2] = was[from * 4 + 2];
    n++;
  }
  return n;
}

/**
 * Cells of the frame that neither its body nor a head it may wear (each eye shape, laid at shift `s`) covers,
 * and that the outside cannot reach: put back into the body, so no head leaves a hole. (The eye shapes differ by
 * a cell here and there along the jaw; what one covers, another may leave open, and enclose.) Returns how many.
 */
function closeHoles(g, frame, body, heads, s) {
  let n = 0;
  for (let turn = 0, changed = true; changed && turn < 6; turn++) {
    changed = false;
    for (const h of heads) {
      const covered = new Set(body);
      for (const i of h.set) { const x = (i % h.g.GW) + s.sx, y = ((i / h.g.GW) | 0) + s.sy; if (x >= 0 && y >= 0 && x < g.GW && y < g.GH) covered.add(y * g.GW + x); }
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const i of covered) { const x = i % g.GW, y = (i / g.GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      x0--; y0--; x1++; y1++;
      const W2 = x1 - x0 + 1, out = new Uint8Array(W2 * (y1 - y0 + 1)), st = [0];
      out[0] = 1;
      while (st.length) {
        const q = st.pop(), x = (q % W2) + x0, y = ((q / W2) | 0) + y0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < x0 || Y < y0 || X > x1 || Y > y1) continue;
          const j = (Y - y0) * W2 + (X - x0);
          if (out[j] || covered.has(Y * g.GW + X)) continue;
          out[j] = 1; st.push(j);
        }
      }
      for (const i of frame) {
        const x = i % g.GW, y = (i / g.GW) | 0;
        if (!covered.has(i) && x >= x0 && x <= x1 && y >= y0 && y <= y1 && !out[(y - y0) * W2 + (x - x0)]) { body.add(i); n++; changed = true; }
      }
    }
  }
  return n;
}

// sitting: the starter poses' first two frames, resampled so their heads are this gender's skull's size
for (const gnd of GENDERS) {
  const src = have(gnd, "starter", "poses") ? "starter" : have(gnd, "bald", "poses") ? "bald" : null;
  if (!src) continue;
  // The same body in every pose (the owner, 2026-10-02: "ตัวเท่าเดิม ทุก Action"): the poses sheet's last figure
  // stands, waving, drawn at the scale of the sitting ones beside it, so the sheet's pixel size is the one that
  // makes it as tall as the walking figure, feet to the top of the head (its raised hand, beside the head, left
  // out). Matching the heads instead gave a sitting Roegadyn man too big, then too small: the model draws a
  // sitting body at its own size under the same head.
  // Feet to the eyes: the top of the head is no measure (ears, horns, the waving hand; a Viera's sage-green ears
  // made one sit too small and the other too big), and the eyes are the topmost violet in a bald figure. Eyes too
  // faint to find (a Roegadyn woman's) in either figure: feet to the top of the head, up its middle, for both.
  const eyesUp = (g, set) => {
    const bb = L.bbox(g, set), vy = [...set].filter((i) => L.clsAt(g, i % g.GW, (i / g.GW) | 0) === "violet").map((i) => (i / g.GW) | 0);
    if (!vy.length) return null;
    const top = Math.min(...vy), eyes = vy.filter((y) => y <= top + 4);
    return bb.y1 - eyes.reduce((t, y) => t + y, 0) / eyes.length;
  };
  const headUp = (g, set) => {
    const bb = L.bbox(g, set), xs = [...set].filter((i) => ((i / g.GW) | 0) > bb.y0 + (bb.y1 - bb.y0) * 0.4).map((i) => i % g.GW).sort((p2, q) => p2 - q);
    const mx = xs[xs.length >> 1];
    for (let y = bb.y0; y <= bb.y1; y++) for (let d = -2; d <= 2; d++) if (set.has(y * g.GW + mx + d)) return bb.y1 - y + 1;
    return bb.y1 - bb.y0 + 1;
  };
  let tall = eyesUp;
  const fp = typeGrid[`${gnd}-front`].p;
  const raw = await L.loadRaw(file(gnd, src, "poses"));
  {
    const g0 = L.cellsOf(raw, L.detectGrid(raw, typeGrid[`${gnd}-poses`].p));
    if (process.env.SIT_DEBUG) console.log(`  ${gnd} eyes: walking ${eyesUp(grids[`${gnd}-bald-front`], figs[`${gnd}-bald-front`][IDLE])}, waving ${eyesUp(g0, L.figures(g0, L.spansOf(g0, 4))[3])}`);
    if (eyesUp(grids[`${gnd}-bald-front`], figs[`${gnd}-bald-front`][IDLE]) === null || eyesUp(g0, L.figures(g0, L.spansOf(g0, 4))[3]) === null) {
      if (FUR_KEY) throw new Error(`${gnd}: no eyes found to size the poses by, and the ears make the head's top no measure`);
      tall = headUp;
      console.log(`  ${gnd}: no eyes to size the poses by; the top of the head instead`);
    }
  }
  const walkH = tall(grids[`${gnd}-bald-front`], figs[`${gnd}-bald-front`][IDLE]) * fp;
  // found by turns: measure the waving figure at a guess, size the grid by it, measure again
  let p = typeGrid[`${gnd}-poses`].p;
  for (let k = 0; k < 3; k++) {
    const g0 = L.cellsOf(raw, L.detectGrid(raw, p));
    const waveH = tall(g0, L.figures(g0, L.spansOf(g0, 4))[3]) * p;
    p = fp * waveH / walkH;
    if (process.env.SIT_DEBUG) console.log(`  ${gnd} pose scale, turn ${k}: walking ${walkH.toFixed(0)} px feet to eyes, waving ${waveH.toFixed(0)} px, so ${p.toFixed(2)}`);
  }
  const g = L.cellsOf(raw, L.detectGrid(raw, p));
  L.snap(g, PALS.body ?? PALS.face);
  const F = L.figures(g, L.spansOf(g, 4));
  const keyRaw = have(gnd, "skinkey", "poses") ? await L.loadRaw(file(gnd, "skinkey", "poses")) : null;
  const key = keyRaw && L.cellsOf(keyRaw, L.detectGrid(keyRaw, p));
  // the same poses in the base clothes, for each figure's chin (found as the standing chin is, by the tunic's blue)
  const baldRaw = src === "starter" && have(gnd, "bald", "poses") ? await L.loadRaw(file(gnd, "bald", "poses")) : null;
  const gb = baldRaw ? L.cellsOf(baldRaw, L.detectGrid(baldRaw, p)) : src === "bald" ? g : null;
  const Fb = baldRaw ? L.figures(gb, L.spansOf(gb, 4)) : src === "bald" ? F : null;
  meta.sit[gnd] = {};
  for (const [k, t] of [[0, "front"], [1, "back"]]) {
    const Rf = REF[gnd][t];
    // The pose's own head is not the size of the shared one (drawn sitting, a head came out anything from 0.94 to
    // 1.21 of the same race's standing head), and since the body is sized to match the standing body, whatever of
    // its own head a sitting body kept showed round the shared head: a second jaw line, a rim behind the skull,
    // whiskers beside the muzzle. So a sitting body keeps none of its own head: the head is found on the frame
    // (the shared head's shape, scaled, laid where it fits), left out whole, and the shared head stands on its chin.
    const head = headSet(gnd, t === "back" ? "back" : "round");
    const heads = (t === "back" ? ["back"] : EYES).map((e) => ({ set: headSet(gnd, e), g: grids[t === "back" ? `${gnd}-bald-back` : e === "round" ? `${gnd}-bald-front` : `${gnd}-eyes_${e}-front`] })).filter((h) => h.set);
    let chin = null, shift = null;
    if (gb && Fb[k]?.size) {
      shift = baldRaw ? figureShift(g, F[k], gb, Fb[k]) : { dx: 0, dy: 0 };
      const ch = chinOf(gb, Fb[k]);
      if (ch.found) chin = { cut: ch.cut + shift.dy, hx: ch.hx + shift.dx };
    }
    if (!chin) console.log(`  ${gnd} sit ${t}: no chin found on the bald poses sheet; the head is looked for by its shape alone`);
    let fit = fitHead(g, F[k], Rf, head, chin);
    // a chin that the head's shape does not bear out is not gone by (a Roegadyn sitting three-quarters on has a
    // shoulder of the tunic's blue beside the cheek, well above the chin): the shape alone is tried too, and wins
    // where it clearly agrees better
    if (chin) {
      const free = fitHead(g, F[k], Rf, head, null);
      if (free.agree > fit.agree + 0.02) {
        console.log(`  ${gnd} sit ${t}: by the chin on the bald poses sheet (row ${chin.cut}) the shapes agree ${(fit.agree * 100).toFixed(0)}%; by the shape alone (chin at row ${free.cy}) ${(free.agree * 100).toFixed(0)}%: the shape`);
        fit = free;
      }
    }
    const s = { sx: fit.ax - Rf.hx, sy: fit.cy - Rf.cut };
    const ay = L.bbox(g, F[k]).y1, ax = fit.ax;
    // which of the cells round it are its own head (and which the outfit's, lying over it or beside it)
    const { own, outfit } = ownHead(g, F[k], fit, key, Rf, head, shift ? baldHead(g, F[k], gb, Fb[k], shift, fit.cy) : null);
    const rest = new Set([...F[k]].filter((i) => !own.has(i)));
    // the bits and slivers of the head that the shape missed are the head's too
    const tidied = tidyHead(g, rest, own, fit.cy);
    // what every head it may wear covers (the eye shapes differ by a cell here and there along the jaw)
    const cov = new Set();
    {
      const [first, ...others] = heads;
      for (const i of first.set) {
        const x = i % first.g.GW, y = (i / first.g.GW) | 0;
        if (!others.every((h) => h.set.has(y * h.g.GW + x))) continue;
        const X = x + s.sx, Y = y + s.sy;
        if (X >= 0 && Y >= 0 && X < g.GW && Y < g.GH) cov.add(Y * g.GW + X);
      }
    }
    // of its own head, the nooks between the shared head and the body stay, as skin
    const fill = neckFill(g, own, rest, cov, (Rf.band?.low ?? Rf.cut) + s.sy), painted = skinOver(g, fill, own);
    const body = new Set([...rest, ...fill]);
    // and a cell that some head would leave as a hole in the doll stays too
    const kept = closeHoles(g, F[k], body, heads, s);
    console.log(`  ${gnd} sit ${t}: its own head is ${fit.r.toFixed(2)} of the shared one (the shapes agree ${(fit.agree * 100).toFixed(0)}%); of its ${own.size} cells (${tidied} bits and slivers round it; ${outfit} beside it left to the outfit) ${fill.size} stay in the nooks at the neck (${painted} of its outline painted skin)${kept ? `, ${kept} more to close holes` : ""}`);
    if (process.env.FILL_DEBUG === `${gnd}-${t}`) {
      // the neck, cell by cell: # the head every look wears, o the rest of the body, F own head kept (fill), x own
      // head left out, . nothing
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const i of fill) { const x = i % g.GW, y = (i / g.GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      console.log(`  fill ${fill.size} cells, x ${x0}..${x1} y ${y0}..${y1}; chin row ${fit.cy}, from row ${(Rf.band?.low ?? Rf.cut) + s.sy}`);
      for (let y = y0 - 6; y <= y1 + 4; y++) {
        let row = String(y).padStart(4) + " ";
        for (let x = x0 - 8; x <= x1 + 8; x++) { const i = y * g.GW + x; row += fill.has(i) ? "F" : cov.has(i) ? "#" : rest.has(i) ? "o" : own.has(i) ? "x" : "."; }
        console.log(row);
      }
    }
    if (process.env.SIT_MAP) {
      // who has what round the neck: the body's own cells as drawn; kept head cells (the nooks) tinted magenta; head
      // cells left out, red; where the shared head lies (and the body has nothing), blue
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const set of [own, cov]) for (const i of set) { const x = i % g.GW, y = (i / g.GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      x0 -= 6; x1 += 6; y1 += 14; y0 = Math.max(y0, y1 - 60);
      const w = x1 - x0 + 1, h = y1 - y0 + 1, buf = Buffer.alloc(w * h * 4);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= g.GW || y >= g.GH) continue;
        const i = y * g.GW + x, o = ((y - y0) * w + (x - x0)) * 4, c = [g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]];
        let px = null;
        if (fill.has(i)) px = [Math.round(c[0] * 0.5 + 127), Math.round(c[1] * 0.4), Math.round(c[2] * 0.5 + 127)];
        else if (body.has(i)) px = c;
        else if (own.has(i)) px = cov.has(i) ? [60, 90, 200] : [230, 40, 40];
        else if (cov.has(i)) px = [90, 130, 255];
        if (px) buf.set([...px, 255], o);
      }
      await L.sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(w * 8, h * 8, { kernel: "nearest" }).flatten({ background: "#20301c" }).png().toFile(path.join(HERE, "work", "debug", `sitmap-${race}-${gnd}-${t}.png`));
    }
    checks.push({ gnd, t: `sit ${t}`, k: 0, g, frame: F[k], body, s, view: t, Rf, own });
    const name = `sit-${gnd}-${t}`;
    // (all of its own head that stayed: the nooks, and the cells kept to close holes)
    skinJobs.push({ gnd, name, g, body, key, view: t, s, sit: true, fill: new Set([...body].filter((i) => own.has(i))), bald: baldRaw && shift ? { g: gb, dx: shift.dx, dy: shift.dy } : null });
    bodies.push([name, g, body, ax, ay]);
    meta.sit[gnd][t] = { body: name, hx: 0, hy: Rf.cut + s.sy - ay };
    const ratio = meta.sit[gnd][t].hy / meta.walk[gnd][t][IDLE].hy;
    if (!(ratio > 0.3 && ratio < 0.8)) throw new Error(`${gnd} sit ${t}: the neck at ${ratio.toFixed(2)} of standing; a sitting doll is about half (0.3 to 0.8)`);
    console.log(`  ${gnd} sit ${t}: resampled at ${p.toFixed(2)}, head at ${meta.sit[gnd][t].hy}`);
  }
}

/* ── skin on the bodies ──────────────────────────────────────────────────────
 * Which cells of a body are skin. The skin-key sheet (the same figures, their skin painted cyan by the model)
 * says where, but only roughly: it is a redrawing, so its edges are a cell out here and there, and it gets
 * whole patches wrong (a Roegadyn man's back, where it drew the scarf down over bare skin). Taken cell by cell,
 * that left skin in its own peach on a doll of any other skin colour: specks along every arm and a patch on the
 * back (the owner, 2026-10-03: "มี pixel มีปัญหา").
 *
 * So the key is read three ways, and the colours are a second witness:
 * - a cell under the key's cyan is skin, unless its colour is plainly the outfit's (over all of a gender's frames
 *   each colour's share of cells under the key says whose it is: the skin's are nearly always under it, the
 *   outfit's nearly never);
 * - a cell where the key sheet repeats the outfit sheet's own colour was left alone by the model, as the
 *   outfit's: it is not skin, whatever its colour (a Hrothgar's gold buckle is the colour of his fur, an Au Ra's
 *   cream shirt the colour of his tail), but for the fringe of a limb the model did not quite paint to;
 * - a cell where the key sheet has something else (it drew over the skin, or sits a cell out) is told by its
 *   colour: one of the skin's main colours, beside skin or in a patch of its own, is skin, and so is an edge
 *   cell close to the skin beside it.
 */
{
  const OUTFIT = 0.3, MAIN = 0.9, MASS = 0.9, LIKE = 30, EDGE = 50, NEAR = 42, PATCH = 3, KEPT = 40, FRINGE = 24, ENCLOSED = 12, SHADE = 0.5, ODD = 0.1, TUFT = 20, TUFT_X = 14;
  const shadeMap = [];
  const rgbOf = (g, i) => (g.c[i * 4] << 16) | (g.c[i * 4 + 1] << 8) | g.c[i * 4 + 2];
  const hex = (c) => "#" + c.toString(16).padStart(6, "0");
  const dist = (a, b) => Math.abs((a >> 16) - (b >> 16)) + Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) + Math.abs((a & 255) - (b & 255));
  const around = (g, i) => { const x = i % g.GW, y = (i / g.GW) | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < g.GW && Y < g.GH) r.push(Y * g.GW + X); } return r; };
  for (const gnd of GENDERS) {
    const jobs = skinJobs.filter((j) => j.gnd === gnd && j.key);
    if (!jobs.length) { console.log(`  ${gnd}: no skin-key sheets; the bodies' skin is left as drawn`); continue; }
    // the vote, and what the key sheet has at each warm cell
    const stat = new Map();
    for (const j of jobs) {
      const ks = keyShift(j.g, j.key, j.body), K = j.key;
      j.warm = new Set(); j.keyed = new Set(); j.kept = new Set();
      for (const i of j.body) {
        if (!isWarm(j.g.c, i * 4)) continue;
        j.warm.add(i);
        const x = (i % j.g.GW) + ks.dx, y = ((i / j.g.GW) | 0) + ks.dy;
        const under = x >= 0 && y >= 0 && x < K.GW && y < K.GH && !!K.c[(y * K.GW + x) * 4 + 3] && isCyan(K.c, (y * K.GW + x) * 4);
        if (under) j.keyed.add(i);
        else {
          // the key sheet repeats this cell's colour here or a cell away: the model left it as the outfit's
          let near = 1e9;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= K.GW || Y >= K.GH) continue;
            const k4 = (Y * K.GW + X) * 4;
            if (!K.c[k4 + 3] || isCyan(K.c, k4)) continue;
            near = Math.min(near, Math.abs(j.g.c[i * 4] - K.c[k4]) + Math.abs(j.g.c[i * 4 + 1] - K.c[k4 + 1]) + Math.abs(j.g.c[i * 4 + 2] - K.c[k4 + 2]));
          }
          if (near <= KEPT) j.kept.add(i);
        }
        const c = rgbOf(j.g, i), e = stat.get(c) ?? { in: 0, tot: 0 };
        e.tot++; if (under) e.in++;
        stat.set(c, e);
      }
    }
    const share = (c) => { const e = stat.get(c); return e ? e.in / e.tot : 0; };
    // a colour seen often and nearly never under the key is plainly the outfit's, however like the skin it looks:
    // a Hyur man's tan mantle has highlights within a shade of the shadow on his arms
    const plain = (c) => { const e = stat.get(c); return !!e && e.tot >= 12 && e.in / e.tot < OUTFIT; };
    // the skin's main colours: those nearly always under the key, the commonest of them, to nine tenths of their cells
    const cand = [...stat].filter(([, e]) => e.in / e.tot >= MAIN).sort((p, q) => q[1].in - p[1].in);
    const mass = cand.reduce((t, [, e]) => t + e.in, 0);
    const main = [];
    for (let k = 0, sum = 0; k < cand.length && sum < mass * MASS; k++) { main.push(cand[k][0]); sum += cand[k][1].in; }
    const likeMain = new Map();
    const isLike = (c) => { let v = likeMain.get(c); if (v === undefined) { v = main.some((q) => dist(q, c) <= LIKE); likeMain.set(c, v); } return v; };
    // every colour nearly always under the key, common or not: what an edge cell may be close to
    const own = cand.filter(([, e]) => e.in >= 6).map(([c]) => c), nearOwn = new Map();
    const isNear = (c) => { let v = nearOwn.get(c); if (v === undefined) { v = own.some((q) => dist(q, c) <= NEAR); nearOwn.set(c, v); } return v; };
    if (process.env.SKIN_DEBUG) {
      console.log(`  ${gnd} skin vote (colour, cells under the key / all, share):`);
      for (const [c, e] of [...stat].sort((p, q) => q[1].tot - p[1].tot)) if (e.tot >= 12) console.log(`    ${hex(c)} ${String(e.in).padStart(5)}/${String(e.tot).padEnd(5)} ${(e.in / e.tot).toFixed(2)} ${main.includes(c) ? "main" : isLike(c) ? "like a main one" : e.in / e.tot < OUTFIT ? "outfit" : ""}`);
    }
    // An Au Ra's horns. On the head they take the skin's colour (every warm cell of a face piece does), and the
    // key paints the tail as skin too; but the key leaves the horns as drawn, so the end of a horn that a body
    // carries beside its head stayed ivory: a horn in two colours on any skin but the art's own. So the horns are
    // skin on the bodies as well: wherever the bald head has its horn (what is light, warm and not under the key
    // above the chin), laid on each frame's own head.
    const horns = {};
    if (race === "aura") for (const t of ["front", "back"]) {
      const R = REF[gnd][t], bald = grids[`${gnd}-bald-${t}`], key = grids[`${gnd}-skinkey-${t}`];
      if (!R || !bald || !key) continue;
      const cyanBy = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < key.GW && Y < key.GH && key.c[(Y * key.GW + X) * 4 + 3] && isCyan(key.c, (Y * key.GW + X) * 4)) return true; } return false; };
      horns[t] = [...R.idle].filter((i) => { const x = i % bald.GW, y = (i / bald.GW) | 0; return y <= R.cut && isWarm(bald.c, i * 4) && L.hsl(bald.c[i * 4], bald.c[i * 4 + 1], bald.c[i * 4 + 2])[2] >= 0.55 && !cyanBy(x, y); }).map((i) => [i % bald.GW, (i / bald.GW) | 0]);
      console.log(`  ${gnd} ${t}: ${horns[t].length} horn cells on the bald head`);
    }
    let added = 0, dropped = 0, total = 0, horned = 0, shaded = 0, odd = 0, things = 0;
    for (const j of jobs) {
      const g = j.g, skin = new Set(), shade = new Set();
      // (SKIN_TRACE=<job>: which rule took each cell, as a count and a map of letters)
      const trace = process.env.SKIN_TRACE === j.name ? new Map() : null;
      const stage = (letter) => { if (trace) for (const i of skin) if (!trace.has(i)) trace.set(i, letter); };
      // What the same figure has in its base clothes too, at that cell (or the next) and of that colour, is the
      // body's own and no part of this outfit. Walking steps only: their sheet is the base sheet redrawn in place,
      // cell for cell; a sitting pose is not.
      const B = j.sit ? null : j.bald?.g;
      const onBald = (i) => {
        if (!B) return false;
        const x = (i % g.GW) - j.bald.dx, y = ((i / g.GW) | 0) - j.bald.dy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= B.GW || Y >= B.GH) continue;
          const k = (Y * B.GW + X) * 4;
          if (B.c[k + 3] && Math.abs(B.c[k] - g.c[i * 4]) + Math.abs(B.c[k + 1] - g.c[i * 4 + 1]) + Math.abs(B.c[k + 2] - g.c[i * 4 + 2]) <= 60) return true;
        }
        return false;
      };
      // under the key, anything that is not plainly the outfit's. (Not "or what the base sheet has too": tried
      // 2026-10-03 for the cream underside of an Au Ra man's tail, and it made skin of a Roegadyn's scarf at the
      // nape, where the base tunic's cream collar lies under it.)
      for (const i of j.keyed) if (share(rgbOf(g, i)) >= OUTFIT) skin.add(i);
      stage("k");
      // what a sitting frame kept of its own head at the neck: there the key is believed cell by cell, whatever
      // the vote says of the colour (the shadow under a jaw is the colour of a leather strap, and stayed the art's
      // own brown at the neck of a doll of any other skin; a scarf under the chin the key left alone, and it stays)
      for (const i of j.fill ?? []) if (j.keyed.has(i) && j.body.has(i)) skin.add(i);
      stage("f");
      const byCell = new Set();
      // A thing the key painted by mistake: an Elezen woman's white sleeve puff, painted cyan whole, took the
      // skin's colour (dark, on a dark Elezen). The vote clears its creams, which her white coat tails share. Its
      // beige shading is in nothing else, so it is "always under the key", and the vote calls it skin: a dozen
      // dark blotches in a white sleeve. But such a cell is pale, it is like none of the skin's main colours, and
      // it lies among cells that are plainly the outfit's with little or no sure skin beside it. It is the
      // outfit's; and then the next one in, until none is left. (Only pale cells: a dark one left as drawn reads
      // as a shadow, a pale one that takes a dark skin is a blotch.)
      // Never what the base sheet has too (onBald): that is the body's own, pale as it is. An Au Ra's tail is cream
      // underneath, beside a cream skirt; a Hrothgar's muzzle is cream. Without that the rule went down the whole
      // tail, cell after cell; and so only on walking steps, where the base sheet can be asked.
      // (Tried and dropped, 2026-10-03: "an outlined shape that is nearly all the outfit's is the outfit's whole".
      // Skin and cloth meet with no outline between them, a neck and a mantle, and the neck went with the mantle.)
      if (B) {
        const pale = (i) => L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2] >= 0.55 && !onBald(i);
        const outfits = new Set();
        for (let again = true, rounds = 0; again && rounds < 12; rounds++) {
          again = false;
          for (const i of [...skin]) {
            const c = rgbOf(g, i);
            if (!j.keyed.has(i) || isLike(c) || !pale(i)) continue;
            let out = 0, sure = 0;
            for (const n of around(g, i)) {
              if (skin.has(n)) { if (isLike(rgbOf(g, n))) sure++; }
              else if (outfits.has(n) || (j.warm.has(n) && plain(rgbOf(g, n)))) out++;
            }
            if (out >= 2 && out > sure) { skin.delete(i); j.kept.add(i); outfits.add(i); things++; again = true; byCell.add(i); }
          }
        }
      }
      stage("t");
      for (const [x, y] of horns[j.view] ?? []) {
        const d = j.sit ? 4 : 2;
        for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
          const i = (y + j.s.sy + dy) * g.GW + x + j.s.sx + dx;
          if (j.warm.has(i) && !skin.has(i) && L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2] >= 0.5) { skin.add(i); horned++; }
        }
      }
      // where the key has something else: the skin's main colours, in patches, touching skin or big enough to be
      // skin themselves
      const open = (i) => j.warm.has(i) && !j.keyed.has(i) && !j.kept.has(i);
      const seen = new Set();
      for (const i of j.warm) {
        if (skin.has(i) || seen.has(i) || !open(i) || !isLike(rgbOf(g, i)) || plain(rgbOf(g, i))) continue;
        const st = [i], mem = []; seen.add(i);
        let touches = false;
        while (st.length) {
          const q = st.pop(); mem.push(q);
          for (const n of around(g, q)) {
            if (skin.has(n)) { touches = true; continue; }
            if (!seen.has(n) && open(n) && isLike(rgbOf(g, n)) && !plain(rgbOf(g, n))) { seen.add(n); st.push(n); }
          }
        }
        if (touches || mem.length >= PATCH) for (const q of mem) skin.add(q);
      }
      stage("p");
      // the edges, twice over: a cell beside skin (two cells of it) and close to that skin's colour or to any of
      // the skin's own colours (the darker shade a limb has along its outline); where the key kept the cell's
      // colour, only one all but the same as the skin beside it (the fringe the model did not paint to), or one
      // of the skin's main colours that is the skin's more often than not (a bit of bare skin the model forgot
      // to paint, at the top of a Roegadyn woman's collar: a gold buckle is the colour of a lion's fur, but under
      // the key nowhere)
      const edges = (rounds, late = false) => {
        for (let round = 0; round < rounds; round++) {
          const more = [];
          for (const i of j.warm) {
            if (skin.has(i)) continue;
            const c = rgbOf(g, i), by = around(g, i).filter((q) => skin.has(q));
            if (by.length < 2) continue;
            // (going further in, late, never through a colour that is plainly the outfit's: six rounds of "close to
            // a skin colour" ran right across the Hyur man's mantle where the key had drawn it a shade off)
            if (late && plain(c)) continue;
            if (j.kept.has(i) ? by.some((q) => dist(rgbOf(g, q), c) <= FRINGE) || (isLike(c) && share(c) >= SHADE) : isNear(c) || by.some((q) => dist(rgbOf(g, q), c) <= EDGE)) more.push(i);
          }
          if (!more.length) break;
          for (const i of more) skin.add(i);
        }
      };
      edges(2);
      stage("e");
      // a shadow on the skin: a clump of colours that are skin's more often than not (their share under the key),
      // which the key neither painted nor kept as the outfit's, with skin along most of its edge (the dark outline
      // is nobody's): the far leg seen between a tail and the near leg, which stayed orange on a lion of any other
      // colour. A strap's edge beside a limb has as much strap round it as skin, and stays.
      {
        const seenS = new Set();
        const isShade = (i) => j.warm.has(i) && !skin.has(i) && !j.kept.has(i) && share(rgbOf(g, i)) >= SHADE;
        const dark = (i) => L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2] < 0.28;
        for (const i of j.warm) {
          if (seenS.has(i) || !isShade(i)) continue;
          const st = [i], mem = [], bySkin = new Set(), byOther = new Set(); seenS.add(i);
          while (st.length) {
            const q = st.pop(); mem.push(q);
            for (const n of around(g, q)) {
              if (skin.has(n)) bySkin.add(n);
              else if (isShade(n)) { if (!seenS.has(n)) { seenS.add(n); st.push(n); } }
              else if (j.body.has(n) && !dark(n)) byOther.add(n);
            }
          }
          if (bySkin.size >= 3 && bySkin.size >= 2 * byOther.size) for (const q of mem) { skin.add(q); shade.add(q); }
        }
        shaded += shade.size;
      }
      stage("s");
      // what skin wholly surrounds is skin: a warm cell with skin nearly all round it, and a small clump (a
      // shadow's darker shade) with nothing but skin round it; never what the key kept as the outfit's (a pendant)
      for (const i of j.warm) if (!skin.has(i) && !j.kept.has(i) && around(g, i).filter((q) => skin.has(q)).length >= 6) skin.add(i);
      {
        const seen2 = new Set();
        for (const i of j.warm) {
          if (skin.has(i) || seen2.has(i) || j.kept.has(i)) continue;
          const st = [i], mem = []; seen2.add(i);
          let closed = true;
          while (st.length) {
            const q = st.pop(); mem.push(q);
            for (const n of around(g, q)) {
              if (skin.has(n)) continue;
              if (j.warm.has(n) && !j.kept.has(n)) { if (!seen2.has(n)) { seen2.add(n); st.push(n); } }
              else closed = false;
            }
          }
          if (closed && mem.length <= ENCLOSED) for (const q of mem) skin.add(q);
        }
      }
      // (the edges once more, of what the shadows and the clumps added, and further in: a forgotten bit of skin is
      // a few cells across)
      stage("c");
      edges(6, true);
      stage("E");
      // and a speck of "skin" that is none of the skin's main colours, alone in something else, is not skin (the
      // odd cell of a brown strap that the key caught).
      // A Hrothgar's tail tuft is not skin either: it stays its own brown on a lion of any colour. The key sheet
      // painted it on some frames and not on others (the man's when he sits, the woman's on most), whole or in
      // part: a blotch of the skin's colour in the tuft, or a tuft of the skin's colour, on some steps only. The
      // tuft is the end of the tail, the leftmost thing on every frame, and none of it is of the skin's main
      // colours; a hand or a foot in shadow is not either, but is never out there.
      {
        const seen3 = new Set(), b = L.bbox(g, j.body);
        for (const i of [...skin]) {
          if (seen3.has(i)) continue;
          const st = [i], mem = []; seen3.add(i);
          while (st.length) { const q = st.pop(); mem.push(q); for (const n of around(g, q)) if (skin.has(n) && !seen3.has(n)) { seen3.add(n); st.push(n); } }
          const like = mem.filter((q) => isLike(rgbOf(g, q))).length;
          const tuft = race === "hrothgar" && mem.length >= TUFT && like <= mem.length * ODD && mem.every((q) => (q % g.GW) - b.x0 <= TUFT_X);
          if (tuft || (mem.length <= 3 && !like)) { for (const q of mem) skin.delete(q); if (tuft) odd += mem.length; }
        }
      }
      if (process.env.THING_DEBUG && byCell.size) {
        console.log(`    things ${j.name}: ${byCell.size} pale cells of a thing the key painted by mistake`);
        if (process.env.THING_DEBUG === j.name) {
          const b = L.bbox(g, j.body), w = b.x1 - b.x0 + 3, h = b.y1 - b.y0 + 3, buf = Buffer.alloc(w * h * 4);
          for (const i of j.body) {
            const x = (i % g.GW) - b.x0 + 1, y = ((i / g.GW) | 0) - b.y0 + 1;
            const px = byCell.has(i) ? [255, 255, 0] : skin.has(i) ? [150, 0, 150] : [g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]];
            buf.set([...px, 255], (y * w + x) * 4);
          }
          await L.sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(w * 6, h * 6, { kernel: "nearest" }).flatten({ background: "#20242c" }).png().toFile(`work/debug/things-${j.name}.png`);
        }
      }
      if (trace) {
        const names = { k: "under the key", f: "kept of its own head", p: "a patch of the main colours", e: "an edge", s: "a shadow", c: "surrounded", E: "an edge, late" };
        const tally = {};
        for (const [i, l] of trace) if (skin.has(i)) tally[l] = (tally[l] ?? 0) + 1;
        console.log(`  ${j.name}: skin by rule: ${Object.entries(tally).map(([l, n]) => `${names[l]} (${l}) ${n}`).join(", ")}`);
        const b = L.bbox(g, j.body), rows = +(process.env.SKIN_TRACE_ROWS ?? 60);
        for (let y = b.y0; y <= Math.min(b.y1, b.y0 + rows); y++) {
          let row = String(y - b.y0).padStart(4) + " ";
          for (let x = b.x0; x <= b.x1; x++) { const i = y * g.GW + x; row += skin.has(i) ? trace.get(i) ?? "?" : !j.body.has(i) ? " " : j.kept.has(i) ? "-" : j.warm.has(i) ? "w" : "#"; }
          console.log(row);
        }
      }
      if (process.env.SKIN_WHY === j.name) {
        // what is warm and was not taken, colour by colour, and a map: skin magenta, the key's cyan that was dropped
        // blue, what the key kept green, the rest of the warm yellow
        const by = new Map();
        for (const i of j.warm) { if (skin.has(i)) continue; const c = rgbOf(g, i), e = by.get(c) ?? { n: 0, kept: 0, keyed: 0 }; e.n++; if (j.kept.has(i)) e.kept++; if (j.keyed.has(i)) e.keyed++; by.set(c, e); }
        console.log(`  ${j.name}: warm and not skin, by colour (cells, kept by the key, under the key, share, near an own colour):`);
        for (const [c, e] of [...by].sort((p, q) => q[1].n - p[1].n).slice(0, 24)) console.log(`    ${hex(c)} ${String(e.n).padStart(4)} kept ${String(e.kept).padStart(4)} keyed ${String(e.keyed).padStart(4)} share ${share(c).toFixed(2)} ${isNear(c) ? "near" : ""} ${isLike(c) ? "like" : ""}`);
        // and, round the skin-coloured cells that were left (like a main colour), the cells as letters: S skin,
        // K kept by the key, k under the key and dropped, w other warm, # anything else of the body, . nothing
        const odd = [...j.warm].filter((i) => !skin.has(i) && isLike(rgbOf(g, i)));
        if (odd.length && process.env.SKIN_WHY_TEXT) {
          const xs = odd.map((i) => i % g.GW), ys = odd.map((i) => (i / g.GW) | 0);
          for (let y = Math.min(...ys) - 3; y <= Math.max(...ys) + 3; y++) {
            let row = String(y).padStart(4) + " ";
            for (let x = Math.min(...xs) - 3; x <= Math.max(...xs) + 3; x++) { const i = y * g.GW + x; row += skin.has(i) ? "S" : !j.body.has(i) ? "." : j.kept.has(i) ? (isLike(rgbOf(g, i)) ? "K" : "o") : j.keyed.has(i) ? "k" : j.warm.has(i) ? "w" : "#"; }
            console.log(row);
          }
        }
        const b = L.bbox(g, j.body), w = b.x1 - b.x0 + 3, h = b.y1 - b.y0 + 3, buf = Buffer.alloc(w * h * 4);
        for (const i of j.body) {
          const x = (i % g.GW) - b.x0 + 1, y = ((i / g.GW) | 0) - b.y0 + 1;
          const px = skin.has(i) ? [255, 0, 255] : j.keyed.has(i) ? [40, 90, 255] : j.kept.has(i) ? [0, 200, 80] : j.warm.has(i) ? [255, 230, 0] : [g.c[i * 4] >> 1, g.c[i * 4 + 1] >> 1, g.c[i * 4 + 2] >> 1];
          buf.set([...px, 255], (y * w + x) * 4);
        }
        await L.sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(w * 8, h * 8, { kernel: "nearest" }).flatten({ background: "#20242c" }).png().toFile(`work/debug/skin-why-${gnd}.png`);
      }
      if (process.env.SHADE_MAP) shadeMap.push({ j, skin: new Set(skin), shade });
      for (const i of skin) if (!j.keyed.has(i)) added++;
      for (const i of j.keyed) if (!skin.has(i)) dropped++;
      total += skin.size;
      for (const i of skin) skinCells.push([g, i]);
      if (!bodySkin.has(g)) bodySkin.set(g, new Set());
      for (const i of skin) bodySkin.get(g).add(i);
    }
    console.log(`  ${gnd}: ${total} skin cells on ${jobs.length} bodies (${added} the key missed${horned ? `, ${horned} of them horn` : ""}${shaded ? `, ${shaded} of them shadow` : ""}, ${dropped} it had that are the outfit's${odd ? `, ${odd} of those the tail's tuft` : ""}${things ? `, ${things} in a thing the key painted by mistake` : ""})`);
  }
  if (shadeMap.length) {
    // every body, dimmed, its skin magenta and what the shadow rule took white
    const CW = 130, CH = 200, per = 10, rows = Math.ceil(shadeMap.length / per), buf = Buffer.alloc(CW * per * CH * rows * 4);
    shadeMap.forEach(({ j, skin, shade }, k) => {
      const g = j.g, b = L.bbox(g, j.body), ox = (k % per) * CW + ((CW - (b.x1 - b.x0 + 1)) >> 1), oy = ((k / per) | 0) * CH + CH - 4 - (b.y1 - b.y0 + 1);
      for (const i of j.body) {
        const x = (i % g.GW) - b.x0 + ox, y = ((i / g.GW) | 0) - b.y0 + oy;
        if (x < 0 || y < 0 || x >= CW * per || y >= CH * rows) continue;
        const px = shade.has(i) ? [255, 255, 255] : skin.has(i) ? [150, 0, 150] : [g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]];
        buf.set([...px, 255], (y * CW * per + x) * 4);
      }
    });
    await L.sharp(buf, { raw: { width: CW * per, height: CH * rows, channels: 4 } }).resize(CW * per * 3, CH * rows * 3, { kernel: "nearest" }).flatten({ background: "#20242c" }).png().toFile(`work/debug/shade-${race}.png`);
  }
}

/**
 * A head piece is everything above the chin cut, and on a thick-necked race (a Hrothgar man) that takes in the
 * shoulders of the plain base tunic too, drawn over the real outfit as a light-blue patch. So the head keeps,
 * in its lower part, only what is within the head's own width (measured across its middle), and leaves out the
 * base tunic's collar there: what the outfit sheet has otherwise, rising from the chin cut or the shoulders.
 * A difference with face all round it (an eye drawn a little apart on the outfit sheet, the Hrothgar woman's
 * eyes sit that low) is the face's own and stays: dropping it left the eyes see-through (2026-10-02).
 */
function trimHead(g, set, cut, outfit, like = null) {
  const ys = [...set].map((i) => (i / g.GW) | 0), top = Math.min(...ys), mid = Math.round(top + (cut - top) * 0.45);
  let x0 = 1e9, x1 = -1;
  for (const i of set) { const y = (i / g.GW) | 0; if (Math.abs(y - mid) <= 2) { const x = i % g.GW; x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
  const low = top + (cut - top) * 0.6;
  const beside = (x) => x < x0 - 1 || x > x1 + 1;
  // the base tunic's colours below the line (with no outfit sheet to tell by, its blue)
  // (another eye shape is the round face redrawn: it leaves out only what the round face did, `like`, since its own
  // eyes differ from the outfit sheet's by design; a Hyur woman's big eyes went with her collar, 2026-10-02)
  const tunic = (i) => { const x = i % g.GW, y = (i / g.GW) | 0; return y >= low && set.has(i) && (!like || like.has(i)) && (outfit ? differs(g, outfit, x, y) : L.clsAt(g, x, y) === "blue"); };
  // ...that reach the chin cut or the shoulders through each other
  const drop = new Set(), st = [];
  for (const i of set) {
    const x = i % g.GW, y = (i / g.GW) | 0;
    if (y < low || beside(x) || !tunic(i)) continue;
    if (y >= cut - 1 || beside(x - 1) || beside(x + 1)) { drop.add(i); st.push(i); }
  }
  while (st.length) {
    const i = st.pop();
    for (const j of [i - 1, i + 1, i - g.GW, i + g.GW]) if (!drop.has(j) && !beside(j % g.GW) && tunic(j)) { drop.add(j); st.push(j); }
  }
  const kept = new Set([...set].filter((i) => {
    const x = i % g.GW, y = (i / g.GW) | 0;
    // high on the head everything is the head's own; beside it, low down, are the shoulders: the body has those
    return y < low || (!beside(x) && !drop.has(i));
  }));
  // what was left to the body on purpose, for the hole check
  kept.leftOut = new Set([...set].filter((i) => !kept.has(i)));
  return kept;
}
/**
 * A body frame: everything below the chin cut, and the whole lower part of its own head too (from the line
 * where the head piece starts keeping only its own width, trimHead). The shared head is drawn over it, so this
 * only ever shows where the two differ: the shoulders and collar the head piece leaves out, and the cell or two
 * where the model drew this step's head a little apart from the shared one. Without it those are holes.
 */
function bodyOf(g, frame, s, Rf) {
  const cut = Rf.cut + s.sy, b = Rf.band;
  return new Set([...frame].filter((i) => {
    const y = (i / g.GW) | 0;
    return y > cut || (!!b && y >= b.low + s.sy);
  }));
}

/** Whether two lined-up sheets have clearly different colours at a cell (or only one has it). */
function differs(a, b, x, y) {
  if (x >= b.GW || y >= b.GH) return true;
  const i = (y * a.GW + x) * 4, j = (y * b.GW + x) * 4;
  if (!b.c[j + 3]) return true;
  return Math.abs(a.c[i] - b.c[j]) + Math.abs(a.c[i + 1] - b.c[j + 1]) + Math.abs(a.c[i + 2] - b.c[j + 2]) > 90;
}

/**
 * The eyes' colour, made the violet the town recolours (lib/town/pixeldoll isEye, and faceOf for the blink): the
 * model draws some irises blue-violet, which the palette then splits between blue and violet, so a Hrothgar man's
 * droopy eyes were found as no eyes at all and kept their blue whatever colour was picked (2026-10-02). Only at
 * the eyes (eyeZone), and only what an iris can be: violet, however dull, or a strong blue. And whatever else in
 * the piece is the eyes' violet is made grey, so that nothing but the eyes takes the eye colour in the town.
 */
function eyeTone(g, set, gnd) {
  const hslAt = (i) => L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]);
  const iris = (i) => { const [h, s2, l] = hslAt(i); return l > 0.12 && ((h >= 240 && h <= 320 && s2 > 0.12) || (h >= 195 && h < 240 && s2 > 0.25)); };
  const seen = new Set();
  let n = 0, greyed = 0;
  for (const i of set) {
    if (seen.has(i) || !iris(i) || !atEyes(gnd, i % g.GW, (i / g.GW) | 0, 3)) continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) {
      const q = st.pop(); mem.push(q); const x = q % g.GW, y = (q / g.GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * g.GW + x + dx; if (set.has(j) && !seen.has(j) && iris(j) && atEyes(gnd, j % g.GW, (j / g.GW) | 0, 6)) { seen.add(j); st.push(j); } }
    }
    if (mem.length > 70) continue;
    for (const q of mem) {
      const [h, s2, l] = hslAt(q);
      if (h >= 250 && h <= 305 && s2 > 0.2) continue;
      const [r, gg, bb] = L.rgb(262, Math.max(s2, 0.3), l);
      g.c[q * 4] = r; g.c[q * 4 + 1] = gg; g.c[q * 4 + 2] = bb; n++;
    }
  }
  for (const i of set) {
    if (seen.has(i) || L.clsAt(g, i % g.GW, (i / g.GW) | 0) !== "violet" || atEyes(gnd, i % g.GW, (i / g.GW) | 0, 6)) continue;
    const [h, , l] = hslAt(i), [r, gg, bb] = L.rgb(h, 0.1, l);
    g.c[i * 4] = r; g.c[i * 4 + 1] = gg; g.c[i * 4 + 2] = bb; greyed++;
  }
  return { n, greyed };
}

/**
 * A face piece's skin: every warm cell high on the head, where there is nothing but head. Lower down the piece may
 * carry a little of the base sheet's cream collar (where the outfit is cream there too, a scarf, it was kept as
 * no different), and that is not skin: a Roegadyn man's scarf had streaks of his skin colour. So below the line a
 * warm cell is skin where the outfit sheet's standing body has skin, at that cell or the next; or where it is
 * plainly of the face's own colours (those that are each a thirtieth of the skin above the line, or more): the
 * neck between the chin and that scarf is skin too, and stayed the art's own peach on a doll of any other skin
 * (2026-10-03), which the cream of a collar is nowhere near.
 */
function faceSkin(g, set, gnd, t, round = null) {
  const RIM = 50;
  const low = REF[gnd][t].band?.low ?? REF[gnd][t].cut;
  const walk = skinJobs.find((j) => j.gnd === gnd && j.name === `body-${gnd}-${t}-${IDLE}`);
  const there = walk && bodySkin.get(walk.g);
  const near = (x, y) => { if (!there) return true; const W = walk.g.GW; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (there.has((y + dy) * W + x + dx)) return true; return false; };
  // the face's own colours
  const tally = new Map();
  let above = 0;
  for (const i of set) {
    if (((i / g.GW) | 0) >= low || !isWarm(g.c, i * 4)) continue;
    const c = (g.c[i * 4] << 16) | (g.c[i * 4 + 1] << 8) | g.c[i * 4 + 2];
    tally.set(c, (tally.get(c) ?? 0) + 1); above++;
  }
  // (each at least a thirtieth of the face: "the commonest, to nine tenths of it" took in the odd pale cell, a
  // highlight, and with it a Roegadyn woman's cream collar on three of her six faces)
  const main = [...tally].filter(([, n]) => n >= above / 30).sort((p, q) => q[1] - p[1]).map(([c]) => c);
  const own = (i) => main.some((c) => Math.abs((c >> 16) - g.c[i * 4]) + Math.abs(((c >> 8) & 255) - g.c[i * 4 + 1]) + Math.abs((c & 255) - g.c[i * 4 + 2]) <= 30);
  if (process.env.OWN_DEBUG) {
    // what the colour rule takes below the line, by colour, with each colour's share of the face above the line
    const by = new Map();
    for (const i of set) { const y = (i / g.GW) | 0; if (y < low || !isWarm(g.c, i * 4) || !own(i)) continue; const c = (g.c[i * 4] << 16) | (g.c[i * 4 + 1] << 8) | g.c[i * 4 + 2]; by.set(c, (by.get(c) ?? 0) + 1); }
    console.log(`    ${gnd} ${t} face, own below the line: ${[...by].sort((p, q) => q[1] - p[1]).slice(0, 10).map(([c, n]) => `#${c.toString(16).padStart(6, "0")}×${n} (${(100 * (tally.get(c) ?? 0) / above).toFixed(1)}% above)`).join(" ")}`);
    console.log(`      main: ${main.slice(0, 12).map((c) => `#${c.toString(16).padStart(6, "0")} ${(100 * tally.get(c) / above).toFixed(0)}%`).join(" ")}`);
  }
  // (`sure`: skin by where it is or by its colour, not only by lying next to the body's skin: at a collar that
  // takes in a cell of cream, which is nothing to go by)
  const mine = new Set(), sure = new Set(), rest = [];
  for (const i of set) {
    if (!isWarm(g.c, i * 4)) continue;
    const x = i % g.GW, y = (i / g.GW) | 0;
    if (y < low || own(i)) { mine.add(i); sure.add(i); }
    else if (near(x, y)) mine.add(i);
    else rest.push(i);
  }
  // The rim of what is surely skin, two cells deep: a cell beside sure skin and all but its colour. The underside
  // of an Au Ra woman's horn is a line of paler ivory below the line, and stayed a pale line under a horn of any
  // other skin. (From sure skin only: from the cream a collar lends the neck, the skin ran down the collar.)
  const apart = (a, b) => Math.abs(g.c[a * 4] - g.c[b * 4]) + Math.abs(g.c[a * 4 + 1] - g.c[b * 4 + 1]) + Math.abs(g.c[a * 4 + 2] - g.c[b * 4 + 2]);
  // (never the white of an eye: at the eyes, and very light or all but grey)
  const chroma = (i) => Math.max(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]) - Math.min(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]);
  const eyeWhite = (i) => t === "front" && atEyes(gnd, i % g.GW, (i / g.GW) | 0, 2) && (L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2] >= 0.85 || chroma(i) < 50);
  let rim = 0;
  for (let round2 = 0; round2 < 2; round2++) {
    const more = [];
    for (const i of rest) {
      if (mine.has(i) || eyeWhite(i)) continue;
      const x = i % g.GW, y = (i / g.GW) | 0;
      let hit = false;
      for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) { const q = (y + dy) * g.GW + x + dx; if ((dx || dy) && sure.has(q) && apart(q, i) <= RIM) { hit = true; break; } }
      if (hit) more.push(i);
    }
    if (!more.length) break;
    for (const i of more) { mine.add(i); sure.add(i); }
    rim += more.length;
  }
  // An eyelid, and the shade under a brow: at the eyes, what is warm, of a skin's depth of colour and lightness,
  // and has skin beside it. A sleepy eye's lid is a darker tan than anything the face has more of, so nothing
  // above took it, and it stayed tan on a face of any other colour. Right against an eye it needs no skin beside
  // it: the sliver of cheek past the far eye has the eye on one side and the head's outline on the other.
  let lids = 0;
  if (t === "front") for (let round2 = 0; round2 < 3; round2++) {
    const more = [];
    for (const i of rest) {
      const x = i % g.GW, y = (i / g.GW) | 0;
      if (mine.has(i) || !atEyes(gnd, x, y, 3) || chroma(i) < 60) continue;
      const l = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2];
      if (l < 0.45 || l >= 0.85) continue;
      let by = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && mine.has((y + dy) * g.GW + x + dx)) by++;
      if (by >= 2 || atEyes(gnd, x, y, 1)) more.push(i);
    }
    if (!more.length) break;
    for (const i of more) { mine.add(i); sure.add(i); }
    lids += more.length;
  }
  // And a small patch the face's skin and outline close in on every side: a Hrothgar man's muzzle is cream down
  // to the mouth, below the line, and the last of it stayed a pale patch under his nose on a lion of any other
  // colour. A patch that reaches the edge of the piece, or lies against anything light that is not skin, is a
  // bit of collar and stays (grown by colour alone, the skin ran into a Roegadyn woman's cream collar). And
  // never the white of an eye, which is a small light patch with face all round it too.
  const atEye = eyeWhite;
  const all = new Set(set), pending = new Set(rest), seen = new Set();
  const lightOf = (i) => L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2];
  let grown = 0;
  for (const i of rest) {
    if (seen.has(i)) continue;
    const st = [i], mem = []; seen.add(i);
    let closed = true, bySkin = 0;
    const why = [];
    while (st.length) {
      const q = st.pop(), x = q % g.GW, y = (q / g.GW) | 0; mem.push(q);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const X = x + dx, Y = y + dy, n = Y * g.GW + X;
        // (the edge of the piece, or an eye: the fronts are given without their eyes)
        if (X < 0 || Y < 0 || X >= g.GW || Y >= g.GH || !all.has(n)) { closed = false; why.push(g.c[n * 4 + 3] ? "out:#" + [0, 1, 2].map((k) => g.c[n * 4 + k].toString(16).padStart(2, "0")).join("") : "edge"); continue; }
        if (pending.has(n)) { if (!seen.has(n)) { seen.add(n); st.push(n); } continue; }
        if (mine.has(n)) bySkin++;
        else if (lightOf(n) >= 0.6) { closed = false; why.push("light:#" + [0, 1, 2].map((k) => g.c[n * 4 + k].toString(16).padStart(2, "0")).join("")); }
      }
    }
    if (process.env.FACE_DEBUG && mem.length >= 3) console.log(`    ${gnd} ${t} face patch of ${mem.length} at (${mem[0] % g.GW},${(mem[0] / g.GW) | 0}), low ${low.toFixed(0)}: ${closed ? "closed" : "open"} skin ${bySkin} ${[...new Set(why)].slice(0, 8).join(" ")}`);
    if (closed && mem.length <= 24 && bySkin >= 3 && !mem.some(atEye)) { for (const q of mem) { mine.add(q); sure.add(q); } grown += mem.length; }
  }
  // Another eye shape is the round face redrawn with other eyes: what is surely skin on the round face is skin on
  // it, where it kept the colour (the sheets lie two cells apart at most), but for the eyes. Each sheet's patches
  // close a little differently, and a patch left open on one eye shape was fur on five faces and cream on the sixth.
  let like = 0;
  if (round) {
    const R = round.g;
    for (const i of rest) {
      if (mine.has(i) || atEye(i)) continue;
      const x = i % g.GW, y = (i / g.GW) | 0;
      let hit = false;
      for (let dy = -2; dy <= 2 && !hit; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= R.GW || Y >= R.GH) continue;
        const q = Y * R.GW + X;
        if (round.skin.has(q) && Math.abs(R.c[q * 4] - g.c[i * 4]) + Math.abs(R.c[q * 4 + 1] - g.c[i * 4 + 1]) + Math.abs(R.c[q * 4 + 2] - g.c[i * 4 + 2]) <= 40) { hit = true; break; }
      }
      if (hit) { mine.add(i); like++; }
    }
  }
  if (process.env.FACE_DEBUG) for (const i of rest) {
    if (mine.has(i) || lightOf(i) < 0.45) continue;
    const x = i % g.GW, y = (i / g.GW) | 0;
    let best = 1e9, skinBy = 0, nearest = 1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = (y + dy) * g.GW + x + dx; if (mine.has(q)) nearest = Math.min(nearest, apart(q, i)); }
    if (round) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const q = (y + dy) * round.g.GW + x + dx;
      if (round.skin.has(q)) best = Math.min(best, Math.abs(round.g.c[q * 4] - g.c[i * 4]) + Math.abs(round.g.c[q * 4 + 1] - g.c[i * 4 + 1]) + Math.abs(round.g.c[q * 4 + 2] - g.c[i * 4 + 2]));
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (mine.has((y + dy) * g.GW + x + dx)) skinBy++;
    console.log(`    ${gnd} ${t} face: light cell left at (${x},${y}) #${[0, 1, 2].map((k) => g.c[i * 4 + k].toString(16).padStart(2, "0")).join("")} l${lightOf(i).toFixed(2)}, ${skinBy} skin beside it (nearest in colour ${nearest === 1e9 ? "-" : nearest})${t === "front" && atEyes(gnd, x, y, 3) ? " AT THE EYES" : ""}${round ? `, round-face skin within two cells ${best === 1e9 ? "none" : best}` : ""}`);
  }
  for (const i of mine) skinCells.push([g, i]);
  if (rim && process.env.SKIN_DEBUG) console.log(`  ${gnd} ${t} face: ${rim} cell(s) at the rim of sure skin made skin`);
  if (lids && process.env.SKIN_DEBUG) console.log(`  ${gnd} ${t} face: ${lids} cell(s) of eyelid made skin`);
  if (like && process.env.SKIN_DEBUG) console.log(`  ${gnd} ${t} face: ${like} cell(s) skin as on the round face`);
  if (grown && process.env.SKIN_DEBUG) console.log(`  ${gnd} ${t} face: ${grown} cell(s) closed in by the face's skin made skin`);
  return { left: rest.length - rim - lids - grown - like, skin: sure };
}

// faces: per gender, the bald front ("round") and the other eye shapes above the chin; the back of each head
const faces = [];
/** Each gender's round face and its skin, for the other eye shapes (faceSkin). */
const roundSkin = {};
for (const gnd of GENDERS) {
  meta.face[gnd] = {};
  for (const e of EYES) {
    const key = e === "round" ? `${gnd}-bald-front` : `${gnd}-eyes_${e}-front`;
    if (!grids[key]) { console.log(`  no ${key}`); continue; }
    const g = copyOf(grids[key]), set = headSet(gnd, e);
    const toned = eyeTone(g, set, gnd);
    if (toned.n || toned.greyed) console.log(`  face-${gnd}-${e}: ${toned.n} eye cell(s) made violet${toned.greyed ? `, ${toned.greyed} violet cell(s) away from the eyes made grey` : ""}`);
    const fs2 = faceSkin(g, [...set].filter((i) => !L.clsAt(g, i % g.GW, (i / g.GW) | 0).startsWith("violet")), gnd, "front", e === "round" ? null : roundSkin[gnd]);
    if (e === "round") roundSkin[gnd] = { g, skin: fs2.skin };
    faces.push([`face-${gnd}-${e}`, g, set, gnd, "front"]);
    meta.face[gnd][e] = `face-${gnd}-${e}`;
  }
  const g = copyOf(grids[`${gnd}-bald-back`]), set = headSet(gnd, "back");
  faceSkin(g, set, gnd, "back");
  faces.push([`face-${gnd}-back`, g, set, gnd, "back"]);
  meta.face[gnd].back = `face-${gnd}-back`;
}

// Nothing floats beside a doll. A step's body and the head on it are one figure; a few cells of the body apart
// from it under every head it may wear are a bit the sheet drew loose (the end of a Hrothgar woman's tassel,
// hanging in the air beside her leg on two steps), and go. Anything bigger apart, or apart under one head only,
// stops the build: that is a piece gone astray, not a speck.
{
  const LOOSE = 12;
  // the parts of a set of cells: those joined to each other, corners counting
  const partsOf = (g, set) => {
    const seen = new Set(), parts = [];
    for (const i of set) {
      if (seen.has(i)) continue;
      const st = [i], mem = []; seen.add(i);
      while (st.length) {
        const q = st.pop(), x = q % g.GW, y = (q / g.GW) | 0; mem.push(q);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= g.GW || Y >= g.GH) continue;
          const j = Y * g.GW + X; if (set.has(j) && !seen.has(j)) { seen.add(j); st.push(j); }
        }
      }
      parts.push(mem);
    }
    return parts;
  };
  let gone = 0, astray = 0;
  for (const { gnd, t, k, g, frame, body, s, view } of checks) {
    const heads = faces.filter(([, , , fg, ft]) => fg === gnd && ft === view);
    let loose = null;
    for (const head of heads) {
      const all = new Set(body);
      for (const i of head[2]) {
        const x = (i % head[1].GW) + s.sx, y = ((i / head[1].GW) | 0) + s.sy;
        if (x >= 0 && y >= 0 && x < g.GW && y < g.GH) all.add(y * g.GW + x);
      }
      const comps = partsOf(g, all).sort((a, b) => b.length - a.length);
      const apart = new Set(comps.slice(1).flat().filter((i) => body.has(i)));
      for (const c of comps.slice(1)) if (c.length > LOOSE) { astray += c.length; console.log(`  ASTRAY ${gnd} ${t} step ${k} ${head[0]}: ${c.length} cells apart from the doll at (${c[0] % g.GW},${(c[0] / g.GW) | 0})`); }
      loose = loose ? new Set([...loose].filter((i) => apart.has(i))) : apart;
      if (apart.size !== loose.size) { astray += apart.size - loose.size; console.log(`  ASTRAY ${gnd} ${t} step ${k} ${head[0]}: ${apart.size - loose.size} cell(s) apart from the doll under this head only`); }
    }
    if (!loose?.size) continue;
    for (const i of loose) { body.delete(i); frame.delete(i); }
    gone += loose.size;
    console.log(`  ${gnd} ${t} step ${k}: ${loose.size} loose cell(s) beside the doll taken off`);
  }
  console.log(astray ? `speck check: ${astray} cell(s) astray` : `speck check: every doll in one piece${gone ? ` (${gone} loose cells taken off)` : ""}`);
  if (astray && !process.argv.includes("--allow-holes")) throw new Error("pieces of a doll are apart from it (see above); --allow-holes to build anyway");
}

// Nothing may go missing (the owner, 2026-10-02: "ห้ามให้มีจุดผิดพลาดเด็ดขาด"): every walking step, its body and
// its head laid on it as the town lays them, must cover every cell of the outfit sheet's own figure. A cell the
// sheet has and neither piece does is a hole in the doll; the build stops and says where.
{
  // Two kinds of hole: a cell of the figure from the neck down that neither piece has, and a see-through cell
  // anywhere inside the doll (one the outside cannot reach). Above the neck the shared head stands in for each
  // step's own, so a cell or two of that step's outline may go unused there; that is not a hole.
  const headsOf = (gnd, t) => faces.filter(([, , , fg, ft]) => fg === gnd && ft === t);
  let holesAll = 0;
  for (const { gnd, t, k, g, frame, body, s, view, Rf, own } of checks) for (const head of headsOf(gnd, view)) {
    const covered = new Set(body);
    if (head) for (const i of head[2]) {
      const x = (i % head[1].GW) + s.sx, y = ((i / head[1].GW) | 0) + s.sy;
      if (x >= 0 && y >= 0 && x < g.GW && y < g.GH) covered.add(y * g.GW + x);
    }
    const low = (Rf.band?.low ?? Rf.cut) + s.sy;
    const holes = [...frame].filter((i) => !covered.has(i) && ((i / g.GW) | 0) >= low && !own?.has(i));
    // inside holes: flood the outside of the doll's box, and any empty cell the flood cannot reach is inside
    {
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const i of covered) { const x = i % g.GW, y = (i / g.GW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      x0--; y0--; x1++; y1++;
      const W2 = x1 - x0 + 1, out = new Uint8Array(W2 * (y1 - y0 + 1)), st = [0];
      const at = (x, y) => (y - y0) * W2 + (x - x0);
      out[0] = 1;
      while (st.length) {
        const q = st.pop(), x = (q % W2) + x0, y = ((q / W2) | 0) + y0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < x0 || Y < y0 || X > x1 || Y > y1) continue;
          const j = at(X, Y);
          if (out[j] || covered.has(Y * g.GW + X)) continue;
          out[j] = 1; st.push(j);
        }
      }
      // (a gap the artwork itself has, between an arm and the body, is no hole: only a cell the figure has counts)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * g.GW + x;
        if (!out[at(x, y)] && !covered.has(i) && frame.has(i) && !holes.includes(i)) holes.push(i);
      }
    }
    if (holes.length) {
      holesAll += holes.length;
      console.log(`  HOLES ${gnd} ${t} step ${k} ${head[0]}: ${holes.length} cell(s), e.g. ${holes.slice(0, 6).map((i) => `(${i % g.GW},${(i / g.GW) | 0})`).join(" ")}`);
    }
  }
  // and every head piece (each eye shape, the back) must hold every cell of its own sheet's head above the
  // line where it starts keeping only its own width: a missing cell there is a see-through face
  for (const [name, g, set, gnd, t] of faces) {
    const key = name.endsWith("-back") ? `${gnd}-bald-back` : name.endsWith("-round") ? `${gnd}-bald-front` : `${gnd}-eyes_${name.split("-").pop()}-front`;
    const fig = figs[key]?.[IDLE], low = REF[gnd][t].band?.low ?? REF[gnd][t].cut;
    if (!fig) continue;
    const miss = [...fig].filter((i) => ((i / g.GW) | 0) < low && !set.has(i));
    // below that line too, nothing of its sheet left out with the piece all round it: that is see-through
    // wherever the body under it is not drawn the same (the eyes, 2026-10-02)
    {
      const b = L.bbox(g, set), W2 = b.x1 - b.x0 + 3, H2 = b.y1 - b.y0 + 3, out = new Uint8Array(W2 * H2), st = [0];
      const inSet = (x, y) => set.has(y * g.GW + x);
      out[0] = 1;
      while (st.length) {
        const q = st.pop(), x = (q % W2) + b.x0 - 1, y = ((q / W2) | 0) + b.y0 - 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy, j = (Y - b.y0 + 1) * W2 + (X - b.x0 + 1);
          if (X < b.x0 - 1 || Y < b.y0 - 1 || X > b.x1 + 1 || Y > b.y1 + 1 || out[j] || inSet(X, Y)) continue;
          out[j] = 1; st.push(j);
        }
      }
      for (const i of fig) {
        const x = i % g.GW, y = (i / g.GW) | 0;
        if (y >= low && x >= b.x0 && x <= b.x1 && y <= b.y1 && !set.has(i) && !set.leftOut?.has(i) && !out[(y - b.y0 + 1) * W2 + (x - b.x0 + 1)]) miss.push(i);
      }
    }
    if (miss.length) { holesAll += miss.length; console.log(`  HOLES ${name}: ${miss.length} cell(s) of the face missing, e.g. ${miss.slice(0, 6).map((i) => `(${i % g.GW},${(i / g.GW) | 0})`).join(" ")}`); }
  }
  console.log(holesAll ? `hole check: ${holesAll} missing cell(s)` : "hole check: every step whole");
  if (holesAll && !process.argv.includes("--allow-holes")) throw new Error("the dolls have holes (see above); --allow-holes to build anyway");
}

// the skin (or fur) ramp: six shades by lightness, from every skin cell of the race
const lum = (c, i) => L.hsl(c[i], c[i + 1], c[i + 2])[2];
const sorted = skinCells.map(([g, i]) => [lum(g.c, i * 4), g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]]).sort((a, b) => a[0] - b[0]);
const RAMP = Array.from({ length: 6 }, (_, k) => {
  const part = sorted.slice(Math.floor(sorted.length * k / 6), Math.floor(sorted.length * (k + 1) / 6));
  return [1, 2, 3].map((j) => Math.round(part.reduce((t, q) => t + q[j], 0) / Math.max(1, part.length)));
});
const rampL = RAMP.map((c) => L.hsl(...c)[2]);
const skinOf = new Map();
for (const [g, i] of skinCells) { if (!skinOf.has(g)) skinOf.set(g, new Set()); skinOf.get(g).add(i); }
for (const [g, i] of skinCells) {
  const l = lum(g.c, i * 4);
  let k = 0; for (let j = 1; j < RAMP.length; j++) if (Math.abs(rampL[j] - l) < Math.abs(rampL[k] - l)) k = j;
  g.c.set(RAMP[k], i * 4);
}
meta.skin = RAMP;
console.log("skin ramp", RAMP.map((c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("")).join(" "));
const rampKeys = new Set(RAMP.map((c) => c.join(",")));
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
/** Each gender's round face, as found, and where its piece starts on the grid: the other eye shapes are lined up on it. */
const roundFace = {};
for (const [name, g, set, gnd, t] of faces) {
  unclash(g, set);
  const im = L.crop(g, set);
  pieces.push({ name, img: im, ox: im.x0 - REF[gnd][t].hx, oy: im.y0 - REF[gnd][t].cut });
  if (t !== "front") continue;
  let f = faceOf(g, set, im, gnd);
  if (name.endsWith("-round") && f.eyes.length === 2) roundFace[gnd] = { f, im };
  // One eye found (the far one drawn as a sliver at the edge of the face, as a Hrothgar man's small eyes are):
  // the other is where the round face has it, and closes over whatever this face has there.
  const R = roundFace[gnd];
  if (f.eyes.length < 2 && R) {
    const at = (e, o) => ({ x: (e.x0 + e.x1) / 2 + o.x0, y: (e.y0 + e.y1) / 2 + o.y0 });
    // the round face's eyes this face has not got (the one farthest from what it has, or both)
    const want = f.eyes.length ? [R.f.eyes.map((e) => ({ e, d: Math.hypot(at(e, R.im).x - at(f.eyes[0], im).x, at(e, R.im).y - at(f.eyes[0], im).y) })).sort((p, q) => q.d - p.d)[0].e] : R.f.eyes;
    const got = [];
    for (const e of want) {
      const x0 = e.x0 + R.im.x0, y0 = e.y0 + R.im.y0, x1 = e.x1 + R.im.x0, y1 = e.y1 + R.im.y0, cells = [];
      for (let y = y0 - 1; y <= y1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
        const i = y * g.GW + x, c = L.clsAt(g, x, y);
        if (set.has(i) && c !== "skin" && c !== "green") cells.push([x - im.x0, y - im.y0]);
      }
      if (cells.length) got.push({ x0: x0 - im.x0, y0: y0 - im.y0, x1: x1 - im.x0, y1: y1 - im.y0, cells });
    }
    if (f.eyes.length + got.length === 2) {
      const mouth = f.mouth ?? (R.f.mouth && { x: R.f.mouth.x + R.im.x0 - im.x0, y: R.f.mouth.y + R.im.y0 - im.y0 });
      f = { ...f, eyes: [...f.eyes, ...got].sort((p, q) => p.x0 - q.x0), mouth };
      console.log(`  ${name}: ${got.length} eye(s) where the round face has them`);
    }
  }
  if (f.eyes.length === 2) meta.faceData[name] = f; else console.log(`  ${name}: ${f.eyes.length} eye(s) found, no blink`);
}

// hair: the overlay alone, drawn over the face; a bare crown between the hair filled (as for the Lalafell)
function crownOf(gnd) {
  const g = grids[`${gnd}-bald-front`], F = idleOf(g), top = L.bbox(g, F).y0, eyes = eyesAt(g);
  if (!eyes || race === "hrothgar") return [];
  const line = top + Math.round((eyes.y - top) * 0.68), cells = [];
  for (const i of F) { const x = i % g.GW, y = (i / g.GW) | 0; if (y < line && L.clsAt(g, x, y) === "skin") cells.push([x, y]); }
  return cells;
}
function fillCrown(g, set, crown) {
  const count = new Map();
  for (const i of set) {
    const o = i * 4, [, sat, l] = L.hsl(g.c[o], g.c[o + 1], g.c[o + 2]);
    if (L.clsAt(g, i % g.GW, (i / g.GW) | 0) !== "green" || l < 0.25 || l > 0.6 || sat < 0.3) continue;
    const k = (g.c[o] << 16) | (g.c[o + 1] << 8) | g.c[o + 2];
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  const main = [...count.entries()].sort((p, q) => q[1] - p[1])[0]?.[0];
  if (main === undefined) return 0;
  let dark = main, darkL = 1;
  for (const i of set) {
    const o = i * 4;
    if (L.clsAt(g, i % g.GW, (i / g.GW) | 0) !== "green") continue;
    const l = L.hsl(g.c[o], g.c[o + 1], g.c[o + 2])[2];
    if (l < darkL) { darkL = l; dark = (g.c[o] << 16) | (g.c[o + 1] << 8) | g.c[o + 2]; }
  }
  const added = [];
  for (const [x, y] of crown) {
    const i = y * g.GW + x;
    if (set.has(i)) continue;
    let left = false, right = false;
    for (let d = 1; d < 14; d++) { if (set.has(i - d)) left = true; if (set.has(i + d)) right = true; }
    if (!left || !right) continue;
    g.c[i * 4] = main >> 16; g.c[i * 4 + 1] = (main >> 8) & 255; g.c[i * 4 + 2] = main & 255; g.c[i * 4 + 3] = 255;
    set.add(i); added.push(i);
  }
  for (const i of added) if (!set.has(i + g.GW)) { g.c[i * 4] = dark >> 16; g.c[i * 4 + 1] = (dark >> 8) & 255; g.c[i * 4 + 2] = dark & 255; }
  return added.length;
}
/**
 * A furry race's ears are the race's, not the hairstyle's: each hair sheet draws its own copy, which took the hair's
 * colour all over and hid the face's ears with their pink insides ("เกือบทุกทรง หูดำแปลกๆ", 2026-10-02). So the
 * ears (all the bald figure has above the top of its skull, and a little round them) are cut out of the hair, and
 * the face's own show.
 */
function earsOf(gnd, t) {
  if (!FUR_KEY) return null;
  const g = grids[`${gnd}-bald-${t}`], F = figs[`${gnd}-bald-${t}`][IDLE], R = REF[gnd][t];
  const at = (y) => F.has(y * g.GW + R.hx) || F.has(y * g.GW + R.hx - 1) || F.has(y * g.GW + R.hx + 1);
  let top = R.cut;
  while (at(top - 1)) top--;
  const ears = new Set();
  for (const i of F) {
    if (((i / g.GW) | 0) >= top + 1) continue;
    // (widened a little round the ear, but never down onto the crown, where the hair stays)
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (((i / g.GW) | 0) + dy < top) ears.add(i + dy * g.GW + dx);
  }
  ears.top = top;
  return ears;
}
/**
 * The hair without the ears: the race's own (where the face draws them), and the copy this hair sheet drew, which
 * may stand a few cells apart: the race's ear shape slid to where it best covers what the sheet has above the
 * skull. (Flooding from the ears instead took the crown of a shaggy hairstyle with them, flat-topping it.)
 */
function withoutEars(g, set, ears, figure) {
  if (!ears) return set;
  const above = [...ears].filter((i) => ((i / g.GW) | 0) < ears.top - 1);
  let best = { n: -1, d: 0 };
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const d = dy * g.GW + dx;
    let n = 0;
    for (const i of above) if (figure.has(i + d)) n++;
    if (n > best.n || (n === best.n && Math.abs(d) < Math.abs(best.d))) best = { n, d };
  }
  return new Set([...set].filter((i) => !ears.has(i) && !(ears.has(i - best.d) && ((i - best.d) / g.GW | 0) < ears.top)));
}
/**
 * A furry race's hair raised to cover its skull: with the ears cut away, a hairstyle drawn a little lower than the
 * bald head showed a sliver of bare scalp between the ears (Viera, Short Shag with Bangs, 2026-10-03). Column by
 * column, bare scalp above the hair's top (eight cells at most) is filled with the hair's colour, the top cell its
 * outline.
 */
function capCrown(g, set, gnd, t, ears) {
  if (!ears) return 0;
  const bald = grids[`${gnd}-bald-${t}`], F = figs[`${gnd}-bald-${t}`][IDLE];
  const tone = (pick) => { let best = null; for (const i of set) { if (L.clsAt(g, i % g.GW, (i / g.GW) | 0) !== "green") continue; const l = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2]; if (!best || pick(l, best.l)) best = { i, l }; } return best?.i; };
  const mid = (() => { const ls = [...set].filter((i) => L.clsAt(g, i % g.GW, (i / g.GW) | 0) === "green").map((i) => [L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2])[2], i]).sort((p, q) => p[0] - q[0]); return ls.length ? ls[ls.length >> 1][1] : undefined; })();
  const dark = tone((l, b) => l < b);
  if (mid === undefined || dark === undefined) return 0;
  const paint = (i, from) => { g.c[i * 4] = g.c[from * 4]; g.c[i * 4 + 1] = g.c[from * 4 + 1]; g.c[i * 4 + 2] = g.c[from * 4 + 2]; g.c[i * 4 + 3] = 255; set.add(i); };
  let n = 0;
  const xs = new Set([...F].map((i) => i % g.GW));
  // every bare cell of the skull's top (its skin, down to twelve rows) that has hair below it in its column, within
  // eight rows: a leftover cell of hair higher up no longer hides the gap under it
  for (const x of xs) {
    for (let y = ears.top; y < ears.top + 12; y++) {
      const i = y * g.GW + x;
      // (the skull's skin, or its highlight, which from behind is a lighter cream: anything but outline and fur)
      const c = L.clsAt(bald, x, y);
      if (set.has(i) || !F.has(i) || ears.has(i) || c === "dark" || c === "green" || c === "clear") continue;
      let below = false;
      for (let k = 1; k <= 8 && !below; k++) if (set.has((y + k) * g.GW + x)) below = true;
      if (!below) continue;
      paint(i, set.has(i - g.GW) ? mid : dark);
      n++;
    }
  }
  return n;
}
/**
 * A furry race's tail is drawn in the hair's green too, and each hair sheet drew one: the hair piece carried it, on
 * the body's own tail while standing and a second tail beside a sitting doll ("Miqote ตอนนั่งมีสองหาง", 2026-10-03).
 * Green in the hair below the chin that lies on the bald figure's tail (within two cells) goes, with its outline.
 */
function withoutTail(g, set, gnd, t) {
  if (!FUR_KEY) return set;
  const bald = grids[`${gnd}-bald-${t}`], F = figs[`${gnd}-bald-${t}`][IDLE], cut = REF[gnd][t].cut;
  const zone = new Set();
  for (const i of F) { const x = i % bald.GW, y = (i / bald.GW) | 0; if (y > cut && L.clsAt(bald, x, y) === "green") for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) zone.add(i + dy * g.GW + dx); }
  const green = (i) => set.has(i) && L.clsAt(g, i % g.GW, (i / g.GW) | 0) === "green";
  const gone = new Set(), seen = new Set();
  for (const i of set) {
    if (seen.has(i) || !green(i)) continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) { const q = st.pop(); mem.push(q); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = q + dy * g.GW + dx; if (!seen.has(j) && green(j)) { seen.add(j); st.push(j); } } }
    const low = mem.filter((q) => ((q / g.GW) | 0) > cut);
    if (low.length && low.filter((q) => zone.has(q)).length >= low.length * 0.6) for (const q of low) if (zone.has(q)) gone.add(q);
  }
  if (!gone.size) return set;
  const out = new Set([...set].filter((i) => !gone.has(i)));
  // the tail's outline: dark cells beside it with no hair left beside them
  const near = (i, S) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && S(i + dy * g.GW + dx)) return true; return false; };
  for (const i of [...out]) if (((i / g.GW) | 0) > cut && L.clsAt(g, i % g.GW, (i / g.GW) | 0) !== "green" && near(i, (j) => gone.has(j)) && !near(i, (j) => out.has(j) && L.clsAt(g, j % g.GW, (j / g.GW) | 0) === "green")) out.delete(i);
  return out;
}
/**
 * What is left apart from the hair itself: the main mass stays, and a separate piece only if it is more than a
 * speck and in the head's rows, neither all above the skull (a strip of the ears' copy) nor all below the chin
 * (a tail drawn where the bald sheet has none).
 */
function hairOnly(g, set, ears, cut) {
  if (!ears) return set;
  const comps = [], seen = new Set();
  for (const i of set) {
    if (seen.has(i)) continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) { const q = st.pop(); mem.push(q); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = q + dy * g.GW + dx; if (set.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } } }
    comps.push(mem);
  }
  comps.sort((p, q) => q.length - p.length);
  const out = new Set(comps[0] ?? []);
  for (const mem of comps.slice(1)) {
    const ys = mem.map((q) => (q / g.GW) | 0), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (mem.length >= 8 && y1 > ears.top + 1 && y0 <= cut) for (const q of mem) out.add(q);
  }
  return out;
}
/**
 * Skin in a hair piece. Where a hair sheet drew the head a cell wider than the bald sheet has it, or an ear or a
 * horn a little apart (a Hrothgar's ears through his mane, an Au Ra's horns through her hair), the overlay took
 * that skin in with the hair, and in the town it kept the art's own colour on a member of any other skin: orange
 * ears on a black lion. So what in the piece is of the skin's colours and joined to the bald head's skin is made
 * skin proper (the ramp's colours, which the town paints), and a flower or a ribbon of some such colour, lying in
 * the hair apart from the head, is left as it is. Returns how many cells.
 */
function hairSkin(g, set, gnd, t) {
  const base = grids[`${gnd}-bald-${t}`], F = figs[`${gnd}-bald-${t}`][IDLE], GW = g.GW;
  const like = (i) => RAMP.some((c) => Math.abs(c[0] - g.c[i * 4]) + Math.abs(c[1] - g.c[i * 4 + 1]) + Math.abs(c[2] - g.c[i * 4 + 2]) <= 48);
  const headSkin = (x, y) => x >= 0 && y >= 0 && x < base.GW && y < base.GH && F.has(y * base.GW + x) && isWarm(base.c, (y * base.GW + x) * 4);
  const cand = new Set([...set].filter((i) => isWarm(g.c, i * 4) && like(i)));
  const st = [], got = new Set();
  for (const i of cand) {
    const x = i % GW, y = (i / GW) | 0;
    let by = false;
    for (let dy = -1; dy <= 1 && !by; dy++) for (let dx = -1; dx <= 1; dx++) if (headSkin(x + dx, y + dy)) { by = true; break; }
    if (by) { got.add(i); st.push(i); }
  }
  while (st.length) {
    const q = st.pop(), x = q % GW, y = (q / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * GW + x + dx; if (cand.has(j) && !got.has(j)) { got.add(j); st.push(j); } }
  }
  if (!got.size) return 0;
  if (!skinOf.has(g)) skinOf.set(g, new Set());
  for (const i of got) {
    const l = lum(g.c, i * 4);
    let k = 0; for (let j = 1; j < RAMP.length; j++) if (Math.abs(rampL[j] - l) < Math.abs(rampL[k] - l)) k = j;
    g.c.set(RAMP[k], i * 4);
    skinOf.get(g).add(i);
  }
  return got.size;
}
for (const gnd of GENDERS) {
  const crown = crownOf(gnd);
  const ears = { front: earsOf(gnd, "front"), back: earsOf(gnd, "back") };
  for (const hair of HAIRS[gnd]) for (const t of ["front", "back"]) {
    const hk = `${gnd}-${hair}-${t}`;
    if (!grids[hk]) continue;
    const g = copyOf(grids[hk]);
    const set0 = hairOverlay(g, figs[hk][IDLE], grids[`${gnd}-bald-${t}`], REF[gnd][t].cut);
    // the base tunic is light blue: anything of it below the eyes is not the hairstyle's
    const eyeY = feat[`${gnd}-bald-front`]?.y ?? 0;
    const set = hairOnly(g, withoutTail(g, withoutEars(g, new Set([...set0].filter((i) => !(L.clsAt(g, i % g.GW, (i / g.GW) | 0) === "blue" && ((i / g.GW) | 0) > eyeY))), ears[t], figs[hk][IDLE]), gnd, t), ears[t], REF[gnd][t].cut);
    { const n = hairSkin(g, set, gnd, t); if (n && process.env.CAP_DEBUG) console.log(`  ${hk}: ${n} skin cell(s) in the hair piece`); }
    unclash(g, set);
    if (t === "front") { const n = fillCrown(g, set, crown); if (n) console.log(`  ${hk}: ${n} crown cell(s) filled`); }
    { const n = capCrown(g, set, gnd, t, ears[t]); if (n && process.env.CAP_DEBUG) console.log(`  ${hk}: ${n} scalp cell(s) covered`); }
    const im = L.crop(g, set);
    const name = `hair-${gnd}-${hair}-${t}`;
    pieces.push({ name, img: im, ox: im.x0 - REF[gnd][t].hx, oy: im.y0 - REF[gnd][t].cut });
    (meta.hair[hair] ??= {})[t] = name;
  }
}

/** Eye cells (to close for a blink) and the mouth's centre, in piece pixels (as build-pixel-atlas). */
function faceOf(g, head, im, gnd) {
  const violet = [...head].filter((i) => L.clsAt(g, i % g.GW, (i / g.GW) | 0) === "violet");
  // The eyes are where this gender's eyes are (eyeZone): the violet at each place is that eye, in however many
  // clumps it is drawn (a lash apart from its iris made two "eyes" of a Miqo'te man's near eye, and none of the far).
  if (eyeZone[gnd]?.length) {
    const zones = eyeZone[gnd], byZone = zones.map(() => []);
    const gap = (z, x, y) => Math.max(z.x0 - x, x - z.x1, z.y0 - y, y - z.y1, 0);
    for (const i of violet) {
      const x = i % g.GW, y = (i / g.GW) | 0;
      let k = 0; for (let n = 1; n < zones.length; n++) if (gap(zones[n], x, y) < gap(zones[k], x, y)) k = n;
      if (gap(zones[k], x, y) <= 4) byZone[k].push(i);
    }
    const boxes = byZone.filter((m) => m.length).map((m) => ({ ...L.bbox(g, new Set(m)), n: m.length })).sort((p, q) => p.x0 - q.x0);
    return faceFrom(g, head, im, boxes);
  }
  const comps = [], seen = new Set(), vset = new Set(violet);
  for (const i of violet) {
    if (seen.has(i)) continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) {
      const q = st.pop(); mem.push(q); const x = q % g.GW, y = (q / g.GW) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = (y + dy) * g.GW + x + dx; if (vset.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } }
    }
    comps.push({ ...L.bbox(g, new Set(mem)), n: mem.length });
  }
  // an eye is two cells or more, unless the face is drawn so small that it is one (a Roegadyn's, 2026-10-02)
  if (comps.filter((c) => c.n >= 2).length >= 2) comps.splice(0, comps.length, ...comps.filter((c) => c.n >= 2));
  else {
    // the biggest, and beside it, at its height, the biggest of the rest
    comps.sort((p, q) => q.n - p.n);
    const [first, ...rest] = comps, mid = (c) => (c.y0 + c.y1) / 2;
    const second = first && rest.find((c) => Math.abs(mid(c) - mid(first)) <= 3 && (c.x0 > first.x1 + 2 || c.x1 < first.x0 - 2));
    comps.splice(0, comps.length, ...[first, second].filter(Boolean));
  }
  return faceFrom(g, head, im, comps);
}

/** A face's blink and mouth data from its eyes' boxes (see faceOf). */
function faceFrom(g, head, im, comps) {
  const nearHair = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (head.has((y + dy) * g.GW + x + dx) && L.clsAt(g, x + dx, y + dy) === "green") return true; return false; };
  comps.sort((p, q) => p.x0 - q.x0);
  const eyes = comps.slice(0, 2).map((b) => {
    const cells = [];
    for (let y = b.y0 - 1; y <= b.y1; y++) for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
      const i = y * g.GW + x; if (!head.has(i)) continue;
      const c = L.clsAt(g, x, y), core = x >= b.x0 && x <= b.x1 && y >= b.y0;
      if (c === "green" || (c === "skin" && !core) || nearHair(x, y)) continue;
      cells.push([x - im.x0, y - im.y0]);
    }
    return { x0: b.x0 - im.x0, y0: b.y0 - im.y0, x1: b.x1 - im.x0, y1: b.y1 - im.y0, cells };
  });
  let mouth = null;
  if (comps.length >= 2) {
    const cx = (b2) => (b2.x0 + b2.x1) / 2, mid = (cx(comps[0]) + cx(comps[1])) / 2 + 1, ey = Math.max(comps[0].y1, comps[1].y1), mx = Math.round(mid);
    let chin = ey + 1;
    while (head.has((chin + 1) * g.GW + mx) && L.clsAt(g, mx, chin + 1) === "skin") chin++;
    mouth = { x: mx - im.x0, y: Math.round(ey + (chin - ey) * 0.5) - im.y0 };
  }
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
for (const p of pieces) for (let r = 0; r < p.img.h; r++) p.img.buf.copy(sheet, ((p.y + r) * W + p.x) * 4, r * p.img.w * 4, (r + 1) * p.img.w * 4);
const png = await L.sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10);
meta.image = `pixel-${race}-${hash}.png`;
meta.size = [W, H];
meta.frames = Object.fromEntries(pieces.map((p) => [p.name, [p.x, p.y, p.img.w, p.img.h, p.ox, p.oy]]));
meta.hairs = Object.keys(meta.hair).filter((h) => meta.hair[h].front && meta.hair[h].back);
for (const f of fs.readdirSync(PUB)) if (new RegExp(`^pixel-${race}-[0-9a-f]{10}\\.png$`).test(f) && f !== meta.image) fs.unlinkSync(path.join(PUB, f));
fs.writeFileSync(path.join(PUB, meta.image), png);
fs.writeFileSync(path.join(PUB, `pixel-${race}.json`), JSON.stringify(meta));
console.log(`wrote ${meta.image} ${W}x${H} (${(png.length / 1024).toFixed(0)} KB), ${pieces.length} pieces, heights ${JSON.stringify(meta.height)}, hairs: ${meta.hairs.join(" ")}`);

/* ── 5. a debug picture: each gender bald and in every hairstyle, front and back ── */

const cols = [];
for (const gnd of GENDERS) { cols.push([gnd, null]); for (const h of HAIRS[gnd]) if (meta.hair[h]?.front && meta.hair[h]?.back) cols.push([gnd, h]); }
const CW = 120, CH = 180, S = 2, DW = CW * cols.length, DH = CH * 2;
const dbg = Buffer.alloc(DW * DH * 4);
const put = (name, ax, ay) => {
  const [px, py, w, h, ox, oy] = meta.frames[name];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const si = ((py + r) * W + px + c) * 4; if (!sheet[si + 3]) continue;
    const X = ax + ox + c, Y = ay + oy + r; if (X < 0 || Y < 0 || X >= DW || Y >= DH) continue;
    sheet.copy(dbg, (Y * DW + X) * 4, si, si + 4);
  }
};
cols.forEach(([gnd, hair], col) => ["front", "back"].forEach((t, row) => {
  const f = meta.walk[gnd][t][IDLE], ax = col * CW + CW / 2, ay = row * CH + CH - 6;
  put(f.body, ax, ay);
  put(meta.face[gnd][t === "front" ? "round" : "back"], ax + f.hx, ay + f.hy);
  if (hair) put(meta.hair[hair][t], ax + f.hx, ay + f.hy);
}));
await L.sharp(dbg, { raw: { width: DW, height: DH, channels: 4 } }).resize(DW * S, DH * S, { kernel: "nearest" }).flatten({ background: "#2a2f3a" }).png().toFile(path.join(DBG, `race-${race}.png`));
console.log(`debug: work/debug/race-${race}.png`);
