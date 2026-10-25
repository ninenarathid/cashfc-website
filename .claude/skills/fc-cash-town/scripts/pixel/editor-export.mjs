// What every import of a Cashtown map editor export shares (build-town2.mjs, build-shop.mjs): its pictures read once,
// each placed thing put where the export's README (§6) says it is drawn, and each picture written cut to what is drawn
// of it, as one lossless webp named by its content (so a page fetches only what it comes near, and a picture placed
// twice, or under two names, is one file).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const REPO = path.resolve(HERE, "../../../../..");
export const sharp = createRequire(path.join(REPO, "package.json"))("sharp");
export { REPO };

/** The isometric point of a tile point (README §2). */
export const toIso = (x, y) => ({ x: 32 * (x - y), y: 16 * (x + y) });

/** An export's pictures and where its things are drawn: `src` the export's folder, `map` its parsed map.json. */
export function exportReader(src, map) {
  const pics = new Map(); // source file -> { data, pw, ph }
  async function picture(file) {
    if (!pics.has(file)) { const { data, info } = await sharp(path.join(src, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); pics.set(file, { data, pw: info.width, ph: info.height }); }
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
  return { picture, opaque, placeOf };
}

/**
 * The pictures written to `out`, each cut to what is drawn of it: `sprite(file)` gives its number in `sprites`
 * ([{ src, w, h, cut: [x0, y0, whole width, whole height], f }]). `shrink(file)`, if given, may say a picture is far
 * finer than it is ever drawn: it is written at that part of its size (`f`, below 1), and drawn `1 / f` as large
 * (`scaleOf`), so that a page holds no more of it than it shows.
 */
export function spriteWriter(out, picture, shrink = () => 1) {
  fs.mkdirSync(out, { recursive: true });
  const sprites = [], spriteOf = new Map(); // source file -> index
  async function sprite(file) {
    if (spriteOf.has(file)) return spriteOf.get(file);
    const p = await picture(file);
    let x0 = p.pw, y0 = p.ph, x1 = -1, y1 = -1;
    for (let y = 0; y < p.ph; y++) for (let x = 0; x < p.pw; x++) if (p.data[(y * p.pw + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, f = Math.min(1, shrink(file) || 1);
    const w = f < 1 ? Math.max(1, Math.round(cw * f)) : cw, h = f < 1 ? Math.max(1, Math.round(ch * f)) : ch;
    let img = sharp(p.data, { raw: { width: p.pw, height: p.ph, channels: 4 } }).extract({ left: x0, top: y0, width: cw, height: ch });
    if (f < 1) img = sharp(await img.png().toBuffer()).resize(w, h, { kernel: "lanczos3" });
    const buf = await img.webp({ lossless: true, effort: 6 }).toBuffer();
    const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10);
    const slug = path.basename(file, ".png").replace(/~.*$/, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 28).replace(/-$/, "");
    const name = `${slug}-${hash}.webp`;
    // (the same picture placed twice, or under two names, is one file)
    let i = sprites.findIndex((s) => s.src === name);
    if (i < 0) { fs.writeFileSync(path.join(out, name), buf); i = sprites.push({ src: name, w, h, cut: [x0, y0, p.pw, p.ph], f: w / cw }) - 1; }
    spriteOf.set(file, i);
    return i;
  }
  /** Where a placed thing's cut picture's top-left is drawn (mirrored, the cut's left is measured from the right). */
  const cutAt = (pl, s) => { const sp = sprites[s], [x0, y0, pw] = sp.cut; return { left: pl.left + (pl.flip ? pw - x0 - sp.w / sp.f : x0) * pl.k, top: pl.top + y0 * pl.k }; };
  /** How many isometric pixels a written picture's pixel is, where a thing is drawn. */
  const scaleOf = (pl, s) => pl.k / sprites[s].f;
  return { sprites, sprite, cutAt, scaleOf };
}

/** README §10's noise, exactly (the borders only match the editor with the same numbers). */
export function hash2(ix, iy, seed) {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul((iy | 0) + 0x165667b1, 0x85ebca6b) ^ Math.imul(seed + 0x3c6ef372, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
export function noise(fx, fy, scale, seed) {
  const gx = fx / scale, gy = fy / scale, x0 = Math.floor(gx), y0 = Math.floor(gy);
  let tx = gx - x0, ty = gy - y0;
  tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
