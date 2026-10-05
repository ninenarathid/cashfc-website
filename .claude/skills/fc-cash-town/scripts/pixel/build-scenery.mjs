// Cash Town's scenery: AI sheets in work/out -> public/town/scenery-<hash>.png + scenery.json.
//
//   node build-scenery.mjs [--out <dir>]        (default: fcnext/public/town)
//   node build-scenery.mjs --set forest         the forest's things, in a picture of their own (forest-<hash>.png +
//                                               forest.json): fetched only by whoever goes there (lib/town/scenery.ts)
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
const argSet = process.argv.indexOf("--set");
/** Which picture is built: the town's scenery, or the forest's. */
const SET = argSet > 0 ? process.argv[argSet + 1] : "scenery";
if (SET !== "scenery" && SET !== "forest") throw new Error(`no such set: ${SET}`);

// [sheet, names, how]: "whole" keeps every shape on the sheet as one piece (the shop site and its
// heaps); "hat" stands frames on their feet under the middle of their yellow hard hat, so a
// popoto worker does not wobble from frame to frame
const SHEETS = [
  ["scene-props-a", ["tree", "pine", "bush", "rock"]],
  ["scene-props-b", ["lamp", "bench", "flowers", "sign"]],
  ["scene-fountain", ["fountain"]],
  ["scene-bench-back", ["lamp2", "barrel", "bench_back", "planter", "sign2"]],
  ["scene-shop-1", ["shop1"], "whole"],
  // the shop's later stages are edits of the first sheet, which the model moves about the canvas a little: each
  // stands on the first stage's ground point, found by laying its heaps (planks, bricks, barrow) on the first's
  ["scene-shop-2", ["shop2"], "whole", "scene-shop-1"],
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
  // the fishing deck going up at the river (its first stage), and popoto builders in a hurry:
  // three running with a plank, two hammering, one wiping its brow
  ["scene-pier-1", ["pier1"], "whole"],
  // the deck finished (its second stage): an edit of the first sheet, stood where the first stands
  ["scene-pier-2", ["pier2"], "whole", "scene-pier-1"],
  ["popoto-rush", ["rush1", "rush2", "rush3", "rush_h1", "rush_h2", "rush_wipe"], "hat"],
  // the two who keep shop in front of the Popoto Shop, and what each stands at: the uncle who sells tools and
  // seeds, the banker who changes popoto into Popoto coins
  ["popoto-uncle", ["un_stand", "un_wave", "un_show", "un_laugh"], "body"],
  ["popoto-banker", ["bk_stand", "bk_write", "bk_coin", "bk_bow"], "body"],
  ["scene-npc-stands", ["stall", "bankdesk"]],
  // the cooking yard going up below the plaza (its first stage). The model drew it soft on its largest canvas, with
  // no pixel size of its own: it is cut at 5 to the pixel, which gives its stoves and tables the size they had in
  // the first, smaller yard, and the yard twice that one's length and depth
  ["scene-kitchen-1", ["kitchen1"], "whole", undefined, [5, 5]],
  // the yard finished (2026-10-03): an edit of the first sheet, stood where the first stands, like the deck's
  ["scene-kitchen-2", ["kitchen2"], "whole", "scene-kitchen-1", [5, 5]],
  // the yard as it looks from outside (the owner, 2026-10-03: "ถ้าอยู่ด้านนอกจะเห้นเป็นอาคาร มองไม่เห้นข้างใน"): a house on the same
  // kerb, an edit of the finished yard. Only its kerb, its posts and its sign are the yard's own, so far fewer of its
  // cells agree with the yard's than a later stage's would: it is stood where the most of them do.
  ["scene-kitchen-house", ["kitchenHouse"], "whole", "scene-kitchen-2", [5, 5], { least: 0.1 }],
  // the farm's own things: its gateway, a length of fence (mirrored for the other way), the well, the tool shed, a
  // scarecrow and a bale of hay
  ["scene-farm-a", ["gateway", "fence", "well", "shed", "scarecrow", "hay"]],
  // the shopkeepers as they talk: a large portrait each, the mouth closed and open. They are drawn at about twice
  // the scenery's pixel size (the fifth entry is where to look for it); "talk" makes the open one the closed one
  // with only its mouth changed, so nothing else moves when it speaks
  ["talk-uncle", ["tk_uncle", "tk_uncle_o"], "talk", undefined, [7.5, 13]],
  ["talk-banker", ["tk_banker", "tk_banker_o"], "talk", undefined, [7.5, 13]],
];
// The forest's own (the owner, 2026-10-05: "หาของป่า จะมี map ใหม่ เป็นป่าใหญ่ๆ"): its trees and what grows and lies under them,
// the camp's things, the great tree of the deep woods, and the waterfall on its cliff.
const FOREST = [
  ["scene-forest-a", ["oak", "birch", "bamboo", "fern"]],
  // (drawn on the model's widest canvas, where its pixels come out twice as big: cut at about twelve to the pixel, so
  // that a stump is knee high and not chest high)
  ["scene-forest-b", ["log", "stump", "boulder", "campfire", "logseat", "tent"], undefined, undefined, [10.5, 13.5]],
  ["scene-forest-c", ["greattree"], "whole"],
  ["scene-forest-d", ["waterfall"], "whole"],
  // what its three gathering games are played on (the owner: "UI และ gameplay ของ mini game unique"): a scene each,
  // filling its canvas: the forest's floor seen close, the underside of a tree's crown, a patch of loosened earth
  ["scene-forest-game-floor", ["gameFloor"], "scene"],
  ["scene-forest-game-crown", ["gameCrown"], "scene"],
  ["scene-forest-game-mound", ["gameMound"], "scene"],
  // (and the camp's fire seen close, for what is roasted on a stick: components/town/TownRoasting)
  ["scene-forest-game-fire", ["gameFire"], "scene"],
];
const isWater = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510;
  return (b > r + 25 && b >= g && (mx - mn) / 255 > 0.18) || (l > 0.82 && b >= r && b >= g - 4); };
const TEXTURES = SET === "forest" ? ["wood"] : ["grass", "plaza", "road", "water", "sand", "field"];

const pieces = [];
/** Whole sheets as gridded, for a later sheet to stand where an earlier one does: its cells and its ground point. */
const wholes = new Map();
/** How far sheet `g` is from sheet `ref`, in cells: the move that lays the most of ref's lowest third on it. */
function moveOnto(g, ref, refSet) {
  const b = L.bbox(ref, refSet), y0 = Math.round(b.y1 - (b.y1 - b.y0) * 0.33);
  const low = [...refSet].filter((i) => ((i / ref.GW) | 0) >= y0);
  let best = { n: -1, dx: 0, dy: 0 };
  for (let dy = -40; dy <= 40; dy++) for (let dx = -40; dx <= 40; dx++) {
    let n = 0;
    for (const i of low) {
      const x = (i % ref.GW) + dx, y = ((i / ref.GW) | 0) + dy;
      if (x < 0 || y < 0 || x >= g.GW || y >= g.GH) continue;
      const j = (y * g.GW + x) * 4;
      if (g.c[j + 3] && Math.abs(g.c[j] - ref.c[i * 4]) + Math.abs(g.c[j + 1] - ref.c[i * 4 + 1]) + Math.abs(g.c[j + 2] - ref.c[i * 4 + 2]) < 70) n++;
    }
    if (n > best.n) best = { n, dx, dy };
  }
  return { ...best, of: low.length };
}
for (const [sheet, names, how, like, range, opts] of SET === "forest" ? FOREST : SHEETS) {
  if (!fs.existsSync(path.join(OUT, `${sheet}.png`))) { console.log(`no ${sheet}`); continue; }
  const raw = await L.loadRaw(path.join(OUT, `${sheet}.png`));
  // the characters' own pixel size (about 5.3–6.2): a double period scores as well and halves every prop
  // (a sheet that stands where another does is cut at that one's pixel size)
  const grid = L.detectGrid(raw, wholes.get(like)?.grid.p, range ?? [4.5, 7.5]);
  const g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], 64));
  // ("scene": the whole canvas is the one piece, every cell of it)
  const figs = how === "scene" ? [new Set(Array.from({ length: g.GW * g.GH }, (_, i) => i))]
    : how === "whole" ? [new Set(L.components(g).filter(c => c.mem.length >= 3).flatMap(c => c.mem))] : L.figures(g, L.spansOf(g, names.length));
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
    let ay = b.y1;
    if (how === "whole") {
      const ref = wholes.get(like);
      if (ref) {
        const m = moveOnto(g, ref.g, ref.set);
        ax = ref.ax + m.dx; ay = ref.ay + m.dy;
        console.log(`  ${name}: stands where ${like} does, moved ${m.dx},${m.dy} (${m.n} of ${m.of} cells of its heaps agree)`);
        if (m.n < m.of * (opts?.least ?? 0.5)) throw new Error(`${sheet}: its heaps do not match ${like}'s (${m.n} of ${m.of}); it cannot be stood on the same ground point`);
      }
      wholes.set(sheet, { g, grid, set, ax, ay });
    }
    pieces.push({ name, img: im, ax: ax - im.x0, ay: ay - im.y0 });
    console.log(`${name.padEnd(9)} ${im.w}x${im.h}  (grid ${grid.p.toFixed(2)})`);
  });
  if (how === "talk") {
    // the talking face is the quiet one with only its mouth changed: the second is laid on the first at the move
    // that agrees best, and only the cells that differ about the mouth (the middle of the lower face) are taken
    const a = pieces.find(p => p.name === names[0]), b = pieces.find(p => p.name === names[1]);
    const far = (i, j) => Math.abs(a.img.buf[i] - b.img.buf[j]) + Math.abs(a.img.buf[i + 1] - b.img.buf[j + 1]) + Math.abs(a.img.buf[i + 2] - b.img.buf[j + 2]);
    let best = { n: -1, dx: 0, dy: 0 };
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      let n = 0;
      for (let y = 0; y < a.img.h; y++) for (let x = 0; x < a.img.w; x++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= b.img.w || Y >= b.img.h) continue;
        const i = (y * a.img.w + x) * 4, j = (Y * b.img.w + X) * 4;
        if (!!a.img.buf[i + 3] === !!b.img.buf[j + 3] && (!a.img.buf[i + 3] || far(i, j) < 40)) n++;
      }
      if (n > best.n) best = { n, dx, dy };
    }
    const buf = Buffer.from(a.img.buf);
    let changed = 0;
    for (let y = Math.round(a.img.h * 0.44); y < a.img.h * 0.72; y++) for (let x = Math.round(a.img.w * 0.38); x < a.img.w * 0.8; x++) {
      const X = x + best.dx, Y = y + best.dy;
      if (X < 0 || Y < 0 || X >= b.img.w || Y >= b.img.h) continue;
      const i = (y * a.img.w + x) * 4, j = (Y * b.img.w + X) * 4;
      if (a.img.buf[i + 3] && b.img.buf[j + 3] && far(i, j) > 60) { b.img.buf.copy(buf, i, j, j + 4); changed++; }
    }
    b.img = { ...a.img, buf }; b.ax = a.ax; b.ay = a.ay;
    console.log(`  ${names[1]}: ${names[0]} with ${changed} cells about the mouth changed (laid on it at ${best.dx},${best.dy})`);
  }
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
// (1024 across since the fishing deck grew to 619: a piece wider than the picture would be written over its neighbours)
const PAD = 1, W = 1024;
for (const p of all) if (p.img.w + 2 * PAD > W) throw new Error(`${p.name} is ${p.img.w} wide: wider than the picture (${W})`);
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
  v: 1, image: `${SET}-${hash}.png`, size: [W, H],
  props: Object.fromEntries(pieces.map(p => [p.name, [p.x, p.y, p.img.w, p.img.h, p.ax, p.ay]])),
  textures: Object.fromEntries(textures.map(p => [p.name, [p.x, p.y, p.img.w, p.img.h]])),
};
for (const f of fs.readdirSync(PUB)) if (f.startsWith(`${SET}-`) && /^-[0-9a-f]{10}\.png$/.test(f.slice(SET.length)) && f !== meta.image) fs.unlinkSync(path.join(PUB, f));
fs.writeFileSync(path.join(PUB, meta.image), png);
fs.writeFileSync(path.join(PUB, `${SET}.json`), JSON.stringify(meta));
console.log(`wrote ${meta.image} ${W}x${H} (${(png.length / 1024).toFixed(0)} KB)`);
