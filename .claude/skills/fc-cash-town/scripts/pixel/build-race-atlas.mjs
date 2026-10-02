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
// The eyes, made clearly violet before the palettes are made: a Roegadyn's are a few dull purple cells, and the shared
// palette turned them grey, so they could be found nowhere (no blink, no eye colour) once other sheets joined it
for (const [k, g] of Object.entries(grids)) {
  if (role(k) !== "face") continue;
  for (let i = 0; i < g.GW * g.GH; i++) {
    if (!g.c[i * 4 + 3]) continue;
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

/** The chin cut of a standing figure: the narrowest row above the first row of tunic blue near the head. */
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
  return { cut: best - 1, hx };
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
const faceSkin = (g, set) => { for (const i of set) if (isWarm(g.c, i * 4)) skinCells.push([g, i]); };
const keySkin = (g, key, body) => {
  const ks = keyShift(g, key, body);
  let n = 0;
  for (const i of body) {
    const x = i % g.GW + ks.dx, y = ((i / g.GW) | 0) + ks.dy;
    if (isWarm(g.c, i * 4) && x < key.GW && y < key.GH && key.c[(y * key.GW + x) * 4 + 3] && isCyan(key.c, (y * key.GW + x) * 4)) { skinCells.push([g, i]); n++; }
  }
  return n;
};

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
    for (let k = 0; k < 4; k++) {
      const s = headShift(Rf.g, Rf.idle, Rf.cut, g, F[k]);
      const ay = L.bbox(g, F[k]).y1, ax = Rf.hx + s.sx;
      const body = bodyOf(g, F[k], s, Rf);
      if (key) { const n = keySkin(g, key, body); if (k === IDLE) console.log(`  ${gnd} ${t}: ${n} skin cells`); }
      const name = `body-${gnd}-${t}-${k}`;
      bodies.push([name, g, body, ax, ay]);
      checks.push({ gnd, t, k, g, frame: F[k], body, s, view: t, Rf });
      frames.push({ body: name, hx: 0, hy: Rf.cut + s.sy - ay });
    }
    meta.walk[gnd][t] = frames;
    console.log(`  ${gnd} ${t}: head moves`, frames.map((f) => f.hy).join(" "), src === `${gnd}-bald-${t}` ? "(no starter outfit yet: base clothes)" : "");
  }
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
  meta.sit[gnd] = {};
  for (const [k, t] of [[0, "front"], [1, "back"]]) {
    const Rf = REF[gnd][t];
    const s = headShift(Rf.g, Rf.idle, Rf.cut, g, F[k]);
    const ay = L.bbox(g, F[k]).y1, ax = Rf.hx + s.sx;
    const body = bodyOf(g, F[k], s, Rf);
    checks.push({ gnd, t: `sit ${t}`, k: 0, g, frame: F[k], body, s, view: t, Rf });
    if (key) keySkin(g, key, body);
    const name = `sit-${gnd}-${t}`;
    bodies.push([name, g, body, ax, ay]);
    meta.sit[gnd][t] = { body: name, hx: 0, hy: Rf.cut + s.sy - ay };
    const ratio = meta.sit[gnd][t].hy / meta.walk[gnd][t][IDLE].hy;
    if (!(ratio > 0.3 && ratio < 0.8)) throw new Error(`${gnd} sit ${t}: the neck at ${ratio.toFixed(2)} of standing; a sitting doll is about half (0.3 to 0.8)`);
    console.log(`  ${gnd} sit ${t}: resampled at ${p.toFixed(2)}, head at ${meta.sit[gnd][t].hy}`);
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
 * droopy eyes were found as no eyes at all and kept their blue whatever colour was picked (2026-10-02). Only small
 * patches of it within the face, above the chin, are eyes; anything larger is clothes.
 */
function eyeTone(g, set, cut) {
  // (greyish purples too: the shared palette greys a Roegadyn's tiny dark eyes, and then they were found nowhere)
  const eyeish = (i) => { const [h, s2, l] = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]); return h >= 195 && h <= 320 && s2 > 0.08 && l > 0.12; };
  const ys = [...set].map((i) => (i / g.GW) | 0), top = Math.min(...ys), lo = top + (cut - top) * 0.25, hi = cut - 3;
  const seen = new Set();
  let n = 0;
  for (const i of set) {
    if (seen.has(i) || !eyeish(i)) continue;
    const st = [i], mem = []; seen.add(i);
    while (st.length) {
      const q = st.pop(); mem.push(q); const x = q % g.GW, y = (q / g.GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * g.GW + x + dx; if (set.has(j) && !seen.has(j) && eyeish(j)) { seen.add(j); st.push(j); } }
    }
    const b = L.bbox(g, new Set(mem));
    if (mem.length > 40 || b.y1 - b.y0 > 8 || b.y0 < lo || b.y1 > hi) continue;
    for (const q of mem) {
      const [h, s2, l] = L.hsl(g.c[q * 4], g.c[q * 4 + 1], g.c[q * 4 + 2]);
      if (h >= 250 && h <= 305) continue;
      const [r, gg, bb] = L.rgb(262, Math.max(s2, 0.25), l);
      g.c[q * 4] = r; g.c[q * 4 + 1] = gg; g.c[q * 4 + 2] = bb; n++;
    }
  }
  return n;
}

// faces: per gender, the bald front ("round") and the other eye shapes above the chin; the back of each head
const faces = [];
for (const gnd of GENDERS) {
  meta.face[gnd] = {};
  let roundLeft = null;
  for (const e of EYES) {
    const key = e === "round" ? `${gnd}-bald-front` : `${gnd}-eyes_${e}-front`;
    if (!grids[key]) { console.log(`  no ${key}`); continue; }
    const g = copyOf(grids[key]), set = trimHead(g, subset(g, figs[key][IDLE], (x, y) => y <= REF[gnd].front.cut), REF[gnd].front.cut, grids[`${gnd}-starter-front`], e === "round" ? null : roundLeft);
    // (widened by two cells: each sheet draws the tunic a cell or two apart; a Hrothgar man's kept a light-blue patch)
    if (e === "round") { roundLeft = new Set(); for (const i of set.leftOut) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) roundLeft.add(i + dy * g.GW + dx); }
    const toned = eyeTone(g, set, REF[gnd].front.cut);
    if (toned) console.log(`  face-${gnd}-${e}: ${toned} eye cell(s) made violet`);
    faceSkin(g, [...set].filter((i) => !L.clsAt(g, i % g.GW, (i / g.GW) | 0).startsWith("violet")));
    faces.push([`face-${gnd}-${e}`, g, set, gnd, "front"]);
    meta.face[gnd][e] = `face-${gnd}-${e}`;
  }
  const g = copyOf(grids[`${gnd}-bald-back`]), set = trimHead(g, subset(g, figs[`${gnd}-bald-back`][IDLE], (x, y) => y <= REF[gnd].back.cut), REF[gnd].back.cut, grids[`${gnd}-starter-back`]);
  faceSkin(g, set);
  faces.push([`face-${gnd}-back`, g, set, gnd, "back"]);
  meta.face[gnd].back = `face-${gnd}-back`;
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
  for (const { gnd, t, k, g, frame, body, s, view, Rf } of checks) for (const head of headsOf(gnd, view)) {
    const covered = new Set(body);
    if (head) for (const i of head[2]) {
      const x = (i % head[1].GW) + s.sx, y = ((i / head[1].GW) | 0) + s.sy;
      if (x >= 0 && y >= 0 && x < g.GW && y < g.GH) covered.add(y * g.GW + x);
    }
    const low = (Rf.band?.low ?? Rf.cut) + s.sy;
    const holes = [...frame].filter((i) => !covered.has(i) && ((i / g.GW) | 0) >= low);
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
  let f = faceOf(g, set, im);
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
function faceOf(g, head, im) {
  const violet = [...head].filter((i) => L.clsAt(g, i % g.GW, (i / g.GW) | 0) === "violet");
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
