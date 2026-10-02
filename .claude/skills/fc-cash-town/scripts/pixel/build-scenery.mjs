// Cash Town's scenery: AI sheets in work/out -> public/town/scenery-<hash>.png + scenery.json.
//
//   node build-scenery.mjs [--out <dir>]        (default: fcnext/public/town)
//
// scene-props-a.png  tree, pine, bush, rock        (one row, the characters' pixel size and angle)
// scene-props-b.png  lamp, bench, flowers, sign
// scene-fountain.png fountain
// tex-<kind>.png     top-down ground textures (grass, plaza, road), projected onto the
//                    isometric ground in the browser (lib/town/scenery.ts)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = path.join(HERE, "work", "out");
const argOut = process.argv.indexOf("--out");
const PUB = argOut > 0 ? process.argv[argOut + 1] : "E:/NinenineProject/fcnext/public/town";
fs.mkdirSync(PUB, { recursive: true });

// [sheet, names, how]: "whole" keeps every shape on the sheet as one piece (the shop site and its
// heaps); "hat" stands frames on their feet under the middle of their yellow hard hat, so a
// popoto worker does not wobble from frame to frame
const SHEETS = [
  ["scene-props-a", ["tree", "pine", "bush", "rock"]],
  ["scene-props-b", ["lamp", "bench", "flowers", "sign"]],
  ["scene-fountain", ["fountain"]],
  ["scene-bench-back", ["lamp2", "barrel", "bench_back", "planter", "sign2"]],
  ["scene-shop-1", ["shop1"], "whole"],
  ["scene-popoto-workers", ["pw_h1", "pw_h2", "pw_h3", "pw_c1", "pw_c2", "pw_c3"], "hat"],
  // the fountain as four frames drawn together (one image, so they agree); "anim" keeps
  // the first frame's stone in every frame, so only the water moves
  ["scene-fountain-anim", ["fountain_a1", "fountain_a2", "fountain_a3", "fountain_a4"], "anim"],
  ["scene-board", ["board"], "whole"],
  // the Popoto Board's vote: what could go up next, as little dioramas
  ["scene-icons", ["ic_condo", "ic_land", "ic_office"]],
  // the plaza and the paths' furniture (the hedge is drawn flat on, so it is not used)
  ["scene-props-c", ["signpost", "bin", "flowerbed", "hedge"]],
  // road works closing the north and east paths, and the popoto waving its flag there
  ["scene-roadworks", ["roadworks"], "whole"],
  ["popoto-flagger", ["pf1", "pf2", "pf3"], "hat"],
  // popoto out and about at their hour (lib/town/popotos): "body" stands each frame under the
  // middle of the popoto's own brown, so a running or kicking popoto does not wobble sideways
  ["popoto-run", ["pr1", "pr2", "pr3", "pr4"], "body"],
  ["popoto-eat", ["pe1", "pe2", "pe3"], "body"],
  ["popoto-kick", ["pk1", "pk2", "pk3", "ball"], "body"],
  ["popoto-badminton", ["pb1", "pb2", "pb3", "shuttle"], "body"],
  ["popoto-tired", ["pt1", "pt2", "pt3"], "body"],
  // life about town (lib/town/critters) and the river's passers-by
  ["critter-cat", ["cat1", "cat2", "cat3", "cat4", "cat_sit", "cat_lick"], "body"],
  ["critter-dog", ["dog1", "dog2", "dog3", "dog4", "dog_sit", "dog_tilt"], "body"],
  ["critter-bird", ["bird_up", "bird_mid", "bird_down", "bird_sit", "bird_look", "bird_peck"], "body"],
  ["critter-butterfly", ["bfy1", "bfy2", "bfy3", "bfb1", "bfb2", "bfb3"]],
  ["river-things", ["rv_leaf", "rv_lily", "rv_boat", "rv_stick", "rv_duck", "rv_koi"]],
  // leaves on the wind (fine weather), drawn small and tumbling
  ["scene-leaves", ["lf1", "lf2", "lf3", "lf4", "lf5", "lf6"]],
];
const isWater = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510;
  return (b > r + 25 && b >= g && (mx - mn) / 255 > 0.18) || (l > 0.82 && b >= r && b >= g - 4); };
const TEXTURES = ["grass", "plaza", "road", "water", "sand"];

const pieces = [];
for (const [sheet, names, how] of SHEETS) {
  if (!fs.existsSync(path.join(OUT, `${sheet}.png`))) { console.log(`no ${sheet}`); continue; }
  const raw = await L.loadRaw(path.join(OUT, `${sheet}.png`));
  // the characters' own pixel size (about 5.3–6.2): a double period scores as well and halves every prop
  const grid = L.detectGrid(raw, undefined, [4.5, 7.5]);
  const g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], 64));
  const figs = how === "whole" ? [new Set(L.components(g).filter(c => c.mem.length >= 3).flatMap(c => c.mem))] : L.figures(g, L.spansOf(g, names.length));
  names.forEach((name, k) => {
    const set = figs[k], b = L.bbox(g, set), im = L.crop(g, set);
    // the ground point: the bottom middle (props stand on it)
    let ax = Math.round((b.x0 + b.x1) / 2);
    if (how === "hat") {
      let sx = 0, n = 0;
      for (const i of set) { const [h, s2, l] = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]); if (h >= 40 && h <= 62 && s2 > 0.6 && l > 0.4 && l < 0.75) { sx += i % g.GW; n++; } }
      if (n) ax = Math.round(sx / n);
    }
    if (how === "body") {
      let sx = 0, n = 0;
      for (const i of set) { const [h, s2, l] = L.hsl(g.c[i * 4], g.c[i * 4 + 1], g.c[i * 4 + 2]); if (h >= 20 && h <= 42 && s2 > 0.35 && l > 0.42 && l < 0.78) { sx += i % g.GW; n++; } }
      if (n > 20) ax = Math.round(sx / n);
    }
    pieces.push({ name, img: im, ax: ax - im.x0, ay: b.y1 - im.y0 });
    console.log(`${name.padEnd(9)} ${im.w}x${im.h}  (grid ${grid.p.toFixed(2)})`);
  });
  if (how === "anim") {
    // every later frame takes the first frame's stone wherever both have stone
    const first = pieces.find(p => p.name === names[0]);
    const at = (p, rx, ry) => { const x = rx + p.ax, y = ry + p.ay; return x >= 0 && y >= 0 && x < p.img.w && y < p.img.h ? (y * p.img.w + x) * 4 : -1; };
    for (const name of names.slice(1)) {
      const p = pieces.find(q => q.name === name);
      for (let y = 0; y < p.img.h; y++) for (let x = 0; x < p.img.w; x++) {
        const i = (y * p.img.w + x) * 4, d = p.img.buf;
        if (!d[i + 3] || isWater(d[i], d[i + 1], d[i + 2])) continue;
        const j = at(first, x - p.ax, y - p.ay), f = first.img.buf;
        if (j >= 0 && f[j + 3] && !isWater(f[j], f[j + 1], f[j + 2])) f.copy(d, i, j, j + 4);
      }
    }
  }
}

// textures: true pixels, cut to a whole number of their own pixels
const textures = [];
for (const t of TEXTURES) {
  const raw = await L.loadRaw(path.join(OUT, `tex-${t}.png`));
  const grid = L.detectGrid(raw);
  const g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], 32));
  const n = Math.min(g.GW, g.GH);
  const buf = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = (y * g.GW + x) * 4; buf.set([g.c[i], g.c[i + 1], g.c[i + 2], 255], (y * n + x) * 4); }
  textures.push({ name: t, img: { buf, w: n, h: n } });
  console.log(`tex ${t.padEnd(6)} ${n}x${n}  (grid ${grid.p.toFixed(2)})`);
}

// pack
const all = [...pieces, ...textures];
const PAD = 1, W = 512;
all.sort((a, b) => b.img.h - a.img.h);
let x = PAD, y = PAD, rowH = 0;
for (const p of all) {
  if (x + p.img.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
  p.x = x; p.y = y; x += p.img.w + PAD; rowH = Math.max(rowH, p.img.h);
}
const H = y + rowH + PAD;
const sheet = Buffer.alloc(W * H * 4);
for (const p of all) for (let r = 0; r < p.img.h; r++) p.img.buf.copy(sheet, ((p.y + r) * W + p.x) * 4, r * p.img.w * 4, (r + 1) * p.img.w * 4);
const png = await L.sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10);
const meta = {
  v: 1, image: `scenery-${hash}.png`, size: [W, H],
  props: Object.fromEntries(pieces.map(p => [p.name, [p.x, p.y, p.img.w, p.img.h, p.ax, p.ay]])),
  textures: Object.fromEntries(textures.map(p => [p.name, [p.x, p.y, p.img.w, p.img.h]])),
};
for (const f of fs.readdirSync(PUB)) if (/^scenery-[0-9a-f]{10}\.png$/.test(f) && f !== meta.image) fs.unlinkSync(path.join(PUB, f));
fs.writeFileSync(path.join(PUB, meta.image), png);
fs.writeFileSync(path.join(PUB, "scenery.json"), JSON.stringify(meta));
console.log(`wrote ${meta.image} ${W}x${H} (${(png.length / 1024).toFixed(0)} KB)`);
