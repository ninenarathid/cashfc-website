// The pasture's animals as frames for build-scenery.mjs --set pasture: each animal's base picture (pasture-base.mjs, a
// gen.mjs sheet cut to its true pixels) is its `idle`, and the frames PixelLab drew from it (pl.mjs, work/pl/<name>/)
// are the rest, picked in prompts/pixellab/pasture/picks.json:
//
//   { "<piece prefix>": { "base": "<work/pasture/base name>", "k": <size>, "frames": { "idle": "base", "walk1": ["<pl name>", <i>], ... } } }
//
// `k` is how much larger than its kind's pictures it is drawn (written into pasture.json's `scale`, read by the page):
// its sheet's grid over its kind's first sheet's (a sheet cut finer drew its animal in more pixels), times its stage's
// share where the model drew a young one as large as a grown one.
//
// A piece is named "<prefix>_<frame>" (for an animal "an_<breed>_adult_SE", so "an_barnHen_adult_SE_walk1": the names of
// lib/town/pasture-art.ts). What is done to a PixelLab frame, as the doll builder does to its frames (ART_WORKFLOW,
// "PixelLab"): what is half see-through is dropped, every colour is snapped to the base picture's own palette, specks
// apart from the animal are taken off, and every frame of an animal stands on the base's ground point (the frames are
// drawn on the base's canvas, so the point is the same canvas pixel): nothing jumps from frame to frame.
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const WORK = path.join(HERE, "work");

async function rgba(file) {
  const { data, info } = await L.sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: Buffer.from(data) };
}
/** The colours a picture has, each once. */
function paletteOf(im) {
  const seen = new Map();
  for (let i = 0; i < im.d.length; i += 4) if (im.d[i + 3] >= 128) seen.set((im.d[i] << 16) | (im.d[i + 1] << 8) | im.d[i + 2], [im.d[i], im.d[i + 1], im.d[i + 2]]);
  return [...seen.values()];
}
/** Every pixel solid or clear, in the nearest colour of the palette; then only what touches the animal's largest part (8 ways), and parts of `keep` pixels or more. */
function tidy(im, pal, keep = 4) {
  const { w, h, d } = im, out = Buffer.alloc(d.length);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    let best = pal[0], bd = Infinity;
    for (const c of pal) { const e = (c[0] - d[i]) ** 2 * 3 + (c[1] - d[i + 1]) ** 2 * 4 + (c[2] - d[i + 2]) ** 2 * 2; if (e < bd) { bd = e; best = c; } }
    out[i] = best[0]; out[i + 1] = best[1]; out[i + 2] = best[2]; out[i + 3] = 255;
  }
  // parts, 8 ways
  const part = new Int32Array(w * h).fill(-1), sizes = [];
  for (let s = 0; s < w * h; s++) {
    if (!out[s * 4 + 3] || part[s] >= 0) continue;
    const id = sizes.length, stack = [s]; part[s] = id; let n = 0;
    while (stack.length) {
      const p = stack.pop(); n++;
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, q = Y * w + X;
        if (X < 0 || Y < 0 || X >= w || Y >= h || part[q] >= 0 || !out[q * 4 + 3]) continue;
        part[q] = id; stack.push(q);
      }
    }
    sizes.push(n);
  }
  const big = sizes.indexOf(Math.max(...sizes));
  for (let p = 0; p < w * h; p++) if (part[p] >= 0 && part[p] !== big && sizes[part[p]] < keep) out[p * 4 + 3] = 0;
  return { w, h, d: out };
}
/** The picture cut to what is drawn, and where its top-left corner was. */
function trim(im) {
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.d[(y * im.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, buf = Buffer.alloc(w * h * 4);
  for (let r = 0; r < h; r++) im.d.copy(buf, r * w * 4, ((y0 + r) * im.w + x0) * 4, ((y0 + r) * im.w + x1 + 1) * 4);
  return { img: { buf, w, h }, x0, y0 };
}

/** Every animal frame picked, as pieces of the pasture's sheet: { name, img: { buf, w, h }, ax, ay }. */
export async function pastureFrames(picksFile = path.join(HERE, "prompts", "pixellab", "pasture", "picks.json")) {
  if (!fs.existsSync(picksFile)) return [];
  const picks = JSON.parse(fs.readFileSync(picksFile, "utf8")), pieces = [];
  for (const [prefix, { base, frames, palette, k }] of Object.entries(picks)) {
    if (prefix.startsWith("_")) continue;
    const baseFile = path.join(WORK, "pasture", "base", `${base}.png`), meta = JSON.parse(fs.readFileSync(path.join(WORK, "pasture", "base", `${base}.json`), "utf8"));
    const b = await rgba(baseFile), pal = paletteOf(b);
    // (a frame that brings a colour of its own, a blush or a closed eye's lash, may name extra colours to keep)
    for (const hex of palette ?? []) pal.push([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
    // the ground point on the canvas: under the middle of the base animal, on its lowest row
    const fx = meta.x + Math.floor(meta.w / 2), fy = meta.y + meta.h - 1;
    for (const [frame, from] of Object.entries(frames)) {
      let im;
      if (from === "base") im = b;
      else {
        const [pl, i, field = "images"] = from, file = path.join(WORK, "pl", pl, `${field}-${i}.png`);
        if (!fs.existsSync(file)) { console.log(`  ${prefix}_${frame}: no ${path.relative(WORK, file)}`); continue; }
        im = await rgba(file);
        if (im.w !== b.w || im.h !== b.h) throw new Error(`${pl} frame ${i} is ${im.w}x${im.h}, its base ${b.w}x${b.h}: not the base's canvas`);
      }
      const t = trim(tidy(im, pal));
      pieces.push({ name: `${prefix}_${frame}`, img: t.img, ax: fx - t.x0, ay: fy - t.y0, ...(k && k !== 1 ? { k: +k.toFixed(3) } : {}) });
      console.log(`${(prefix + "_" + frame).padEnd(30)} ${t.img.w}x${t.img.h}  (${from === "base" ? "base" : from.join(" ")})`);
    }
  }
  return pieces;
}

// ── round 2: every look in two views, its walk and its idle as loops (pasture-looks.mjs drew them; README "The pasture") ──
//
// A look is a breed's female (`<breed>`), its male (`<breed>M`), a shorn sheep (`<breed>Shorn`, `<breed>MShorn`), a
// species' young (chick, pullet, duckling, youngDuck, lamb, hogget, calf, heifer) or the cloud ram. Its pieces:
//
//   <prefix>_<SE|NE>_walk_<i>, <prefix>_<SE|NE>_idle_<i>   the loops (SW and NW are these mirrored, by the page)
//   <prefix>_<SE|NE>_idle, _walk1, _walk2                  the same pictures under round 1's names (idle's first, the
//                                                          walk's first and third), so a page that asks by those still
//                                                          finds them
//
// where <prefix> is lib/town/pasture-art's: an_<breed>_adult, an_<breed>_male, an_<breed>_shorn, an_<breed>_male_shorn,
// an_<species>_<baby|young>, pa_ram. A bird's back view was drawn facing the upper left (its "north") and is mirrored
// here to face NE. Each loop stands on one ground point (the middle of its frames' boxes, their lowest row), so nothing
// jumps between its frames; its colours are snapped to the look's base's.
export const KIND = {
  chicken: ["barnHen", "silkie", "araucana", "marans", "lanternHen", "cloudHen", "goldenHen", "pocketPhoenix"],
  duck: ["puddleDuck", "runner", "cayuga", "mandarin", "raindropDuck", "moonDuck", "paperboatDuck", "littleLeviathan"],
  sheep: ["meadowSheep", "shetland", "jacob", "valais", "dandelionLamb", "rainbowSheep", "starFleece", "goldenFleece"],
  cow: ["dairyCow", "jersey", "highland", "brownSwiss", "strawberryCow", "cocoaCow", "flowerCow", "milkyWayCow"],
};
export const YOUNG = { chicken: ["chick", "pullet"], duck: ["duckling", "youngDuck"], sheep: ["lamb", "hogget"], cow: ["calf", "heifer"] };
/** Each kind's first sheet's grid: what its pictures' sizes are measured against. */
export const REF = { chicken: "barnHen", duck: "barnHen", sheep: "meadowSheep", cow: "dairyCow" };
/** A young one's share where the model drew it too large (measured: the pullet stood as tall as the hens). */
export const SHARE = { pullet: 0.78, duckling: 0.8, youngDuck: 0.7, hogget: 0.9, calf: 0.72, heifer: 0.74 };
const meta = (n) => JSON.parse(fs.readFileSync(path.join(WORK, "pasture", "base", `${n}.json`), "utf8"));

/** A look's species and its pieces' prefix. */
export function lookOf(look) {
  if (look === "cloudRam") return { species: "sheep", prefix: "pa_ram" };
  for (const [species, [baby, young]] of Object.entries(YOUNG)) {
    if (look === baby) return { species, prefix: `an_${species}_baby` };
    if (look === young) return { species, prefix: `an_${species}_young` };
  }
  const m = /^(.+?)(M)?(Shorn)?$/.exec(look), breed = m[1];
  const species = Object.entries(KIND).find(([, b]) => b.includes(breed))?.[0];
  if (!species) return null;
  const male = !!m[2], shorn = !!m[3];
  return { species, breed, male, shorn, prefix: `an_${breed}_${male ? (shorn ? "male_shorn" : "male") : shorn ? "shorn" : "adult"}` };
}
/** Where a look's loop was drawn (round 2's names; the meadow sheep's trial kept PixelLab's direction words). */
function loopDir(look, action, view) {
  for (const n of [`pasture2-${look}-${action}-${view}`, `pasture2-anim-${look}-${action}-${view === "SE" ? "south" : "east"}`]) if (fs.existsSync(path.join(WORK, "pl", n, "images-0.png"))) return n;
  return null;
}
/** A loop's frames: a custom animation's first picture is the picture it started from (the base or the rotation), not a step of it. */
function loopFiles(dir, action) {
  const d = path.join(WORK, "pl", dir), n = fs.readdirSync(d).filter((f) => /^images-\d+\.png$/.test(f)).length;
  const custom = /"mode":\s*"pixminimax"|"mode":\s*"v3"/.test(fs.readFileSync(path.join(d, "response.json"), "utf8")) || n === 5;
  let idx = [...Array(n).keys()];
  if (custom && action === "walk") idx = idx.slice(1);
  // (a template's idle is eight or nine pictures of a slow breath: every other one is the same breath in four or five)
  if (!custom && action === "idle" && n > 5) idx = idx.filter((i) => i % 2 === 0);
  return idx.map((i) => path.join(d, `images-${i}.png`));
}
function mirror(im) {
  const out = Buffer.alloc(im.d.length);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) im.d.copy(out, (y * im.w + (im.w - 1 - x)) * 4, (y * im.w + x) * 4, (y * im.w + x) * 4 + 4);
  return { ...im, d: out };
}
/** The looks drawn in round 2 (work/pasture/chars.json), as pieces; and what each has, for lib/town/pasture-art's table. */
export async function lookFrames(only) {
  const charsFile = path.join(WORK, "pasture", "chars.json");
  if (!fs.existsSync(charsFile)) return { pieces: [], table: {} };
  const chars = JSON.parse(fs.readFileSync(charsFile, "utf8")), pieces = [], table = {};
  for (const [look, c] of Object.entries(chars)) {
    const who = lookOf(look);
    if (!who || (only && who.species !== only)) continue;
    const m = meta(c.base), k = (m.grid / meta(REF[who.species]).grid) * (SHARE[look] ?? 1);
    const pal = paletteOf(await rgba(path.join(WORK, "pasture", "base", `${c.base}.png`)));
    for (const view of ["SE", "NE"]) for (const action of ["walk", "idle"]) {
      const dir = loopDir(look, action, view);
      if (!dir) continue;
      // (a back view drawn as PixelLab's "north" faces the upper left: mirrored; the meadow sheep's trial drew it as "east")
      const flip = view === "NE" && !/-east$/.test(dir) && fs.readFileSync(path.join(WORK, "pl", dir, "response.json"), "utf8").includes("\"direction\": \"north\"");
      const ims = [];
      for (const f of loopFiles(dir, action)) { let im = tidy(await rgba(f), pal); if (flip) im = mirror(im); ims.push(im); }
      // one ground point for the loop: the middle of all its frames' boxes, their lowest row
      let x0 = Infinity, x1 = -1, y1 = -1;
      for (const im of ims) for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.d[(y * im.w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const fx = Math.round((x0 + x1) / 2);
      ims.forEach((im, i) => {
        const t = trim(im), name = `${who.prefix}_${view}_${action}_${i}`;
        const also = action === "idle" && i === 0 ? [`${who.prefix}_${view}_idle`] : action === "walk" && i === 0 ? [`${who.prefix}_${view}_walk1`] : action === "walk" && i === 2 ? [`${who.prefix}_${view}_walk2`] : [];
        // (the cloud ram's round 1 names had no view: its SE pictures keep them)
        if (who.prefix === "pa_ram" && view === "SE") also.push(...also.map((a) => a.replace("_SE_", "_")));
        pieces.push({ name, img: t.img, ax: fx - t.x0, ay: y1 - t.y0, also, ...(k !== 1 ? { k: +k.toFixed(3) } : {}) });
      });
      ((table[who.prefix] ??= {})[view] ??= {})[action] = ims.length;
    }
    // (a view whose idle is not drawn yet stands as its walk's first frame, so the page has one to stand it by)
    for (const view of ["SE", "NE"]) {
      const t = table[who.prefix]?.[view];
      if (!t?.walk || t.idle) continue;
      const first = pieces.find((p) => p.name === `${who.prefix}_${view}_walk_0`);
      first.also.push(`${who.prefix}_${view}_idle_0`, `${who.prefix}_${view}_idle`);
      t.idle = 1;
    }
  }
  return { pieces, table };
}

/** The barn's trough in pieces (pasture-trough.mjs cut them: work/pasture/trough/), each on its place's point. */
export async function troughPieces() {
  const file = path.join(WORK, "pasture", "trough", "pieces.json");
  if (!fs.existsSync(file)) return [];
  const { pieces } = JSON.parse(fs.readFileSync(file, "utf8")), out = [];
  for (const [name, p] of Object.entries(pieces)) {
    const im = await rgba(path.join(WORK, "pasture", "trough", `${name}.png`));
    out.push({ name, img: { buf: im.d, w: im.w, h: im.h }, ax: p.ax, ay: p.ay });
  }
  return out;
}

// node pasture-frames.mjs --table: writes what each look has drawn into lib/town/pasture-art.ts's built block
// (ANIMAL_LOOPS: a look's prefix -> its views -> how many pictures its walk and idle loops have)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(HERE, "pasture-frames.mjs") && process.argv.includes("--table")) {
  const { table } = await lookFrames();
  const file = path.resolve(HERE, "..", "..", "..", "..", "..", "lib", "town", "pasture-art.ts");
  const src = fs.readFileSync(file, "utf8"), a = src.indexOf("export const ANIMAL_LOOPS"), b = src.indexOf("// ── end built ──");
  if (a < 0 || b < 0) throw new Error("no built block in pasture-art.ts");
  const rows = Object.keys(table).sort().map((p) => `  ${p}: { ${Object.entries(table[p]).map(([v, t]) => `${v}: { ${Object.entries(t).map(([k, n]) => `${k}: ${n}`).join(", ")} }`).join(", ")} },`);
  const block = `export const ANIMAL_LOOPS: Readonly<Record<string, Partial<Record<ArtView, Partial<Record<"walk" | "idle", number>>>>>> = {\n${rows.join("\n")}\n};\n`;
  fs.writeFileSync(file, src.slice(0, a) + block + src.slice(b));
  console.log(`${rows.length} looks in ANIMAL_LOOPS`);
}
