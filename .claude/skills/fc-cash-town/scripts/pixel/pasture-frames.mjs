// The pasture's animals as frames for build-scenery.mjs --set pasture: each animal's base picture (pasture-base.mjs, a
// gen.mjs sheet cut to its true pixels) is its `idle`, and the frames PixelLab drew from it (pl.mjs, work/pl/<name>/)
// are the rest, picked in prompts/pixellab/pasture/picks.json:
//
//   { "<piece prefix>": { "base": "<work/pasture/base name>", "frames": { "idle": "base", "walk1": ["<pl name>", <i>], ... } } }
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
  for (const [prefix, { base, frames, palette }] of Object.entries(picks)) {
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
      pieces.push({ name: `${prefix}_${frame}`, img: t.img, ax: fx - t.x0, ay: fy - t.y0 });
      console.log(`${(prefix + "_" + frame).padEnd(30)} ${t.img.w}x${t.img.h}  (${from === "base" ? "base" : from.join(" ")})`);
    }
  }
  return pieces;
}
