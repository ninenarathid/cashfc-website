// The barn's long trough (the owner, 2026-10-20: "หมายถึงวางอาหารได้ หลาย slot ใน ที่ใส่อาหารเดียว gen ภาพมาใหม่ให้ใหญ่ขึ้นก็ได้"):
// one trough along the barn with a compartment for each animal's place, laid end to end from three pieces cut out of
// one drawn trough of three equal compartments (prompts/scenery/pasture-trough.txt):
//
//   pa_troughLeft   the left end (the first board's outer half, its feet)       drawn last, over the first compartment's edge
//   pa_troughSlot   one compartment, from the middle of one board to the next    laid once a place, a step `v` apart
//   pa_troughRight  the right end                                               drawn last, over the last compartment's edge
//   pa_troughSlot_<species>_<full|half>  the same compartment with that species' feed in it (the in-place edits pasture-trough-<feed>-<n>):
//                 only the edit's changed pixels inside the compartment are laid on pa_troughSlot, so it joins exactly as it
//
// The compartment is cut by a seam (one x a row) through the second board, found where that board and the third,
// moved by the step, look most alike (a seam's two sides then come from boards drawn alike), so the copies join without
// a jog. The ends are cut by their own seams, each drawn over the compartment beside it.
//
//   node pasture-trough.mjs            cuts work/out/pasture-trough.png (and its edits), writes work/pasture/trough/*.png,
//                                      the pieces' json (work/pasture/trough/pieces.json) and a look of 2 and 4 places
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = path.join(HERE, "work", "pasture", "trough");
fs.mkdirSync(OUT, { recursive: true });
const FEEDS = ["chickFeed", "duckFeed", "sheepFeed", "cowFeed"], FILLS = ["full", "half"];
// a slot is named by whose feed it holds (lib/town/pasture-art's TROUGH_ART: pa_troughSlot_<species>_<half|full>)
const SPECIES = { chickFeed: "chicken", duckFeed: "duck", sheepFeed: "sheep", cowFeed: "cow" };
// --prompts: the eight in-place edits' words (prompts/scenery/pasture-trough-<feed>-<full|half>.txt) and their calls
// (work/pasture/calls-trough.txt), each filling the middle compartment alone (the feeds as lib/town/animal-items has them)
if (process.argv.includes("--prompts")) {
  const FEED = {
    chickFeed: "chicken feed: small golden-yellow, tan and cream grains of mixed corn and wheat",
    duckFeed: "duck feed: small pale green pellets mixed with strands of bright green waterweed",
    sheepFeed: "loose pale golden hay shaken out of a bale, its strands sticking up",
    cowFeed: "cattle feed: a mash of greenish-gold chopped hay with plenty of bright orange cracked corn",
  };
  const HOW = {
    full: (f) => `the middle compartment is heaped a little above its rim, from one board to the other, with ${f}`,
    half: (f) => `the middle compartment is filled to about half its depth with ${f}, lying low and level, its inner planks showing above the feed all round`,
  };
  const calls = [];
  for (const f of FEEDS) for (const n of FILLS) {
    const name = `pasture-trough-${f}-${n}`;
    fs.writeFileSync(path.join(HERE, "prompts", "scenery", `${name}.txt`), `The attached picture is a long wooden feeding trough from a cozy 2D town game, with three compartments in a row. Redraw the same picture with everything in exactly the same place on the canvas, at the same size, in the same three-quarter top-down view, with the same chunky pixel size and the same thick dark outline.

Change only this: ${HOW[n](FEED[f])}. The feed stays inside the middle compartment, between its two boards; the two other compartments stay empty, and every plank, board, foot and the iron rim stay exactly as they are.

Use the same pixel size as the attached picture: do not make the pixels smaller or larger. Crisp pixel art with hard square pixel edges, flat shading with a few tones per colour, no anti-aliasing, no blur, no gradients. Transparent background, no ground, no shadows, no text, no labels.
`);
    calls.push(`${name} gpt-image-2.5-sunburst low 1536x1024 prompts/scenery/${name}.txt work/out/pasture-trough.png`);
  }
  fs.writeFileSync(path.join(HERE, "work", "pasture", "calls-trough.txt"), calls.join("\n") + "\n");
  console.log(calls.length, "calls: work/pasture/calls-trough.txt");
  process.exit(0);
}
const edits = FEEDS.flatMap((f) => FILLS.map((n) => [`${f}_${n}`, `pasture-trough-${f}-${n}`])).filter(([, s]) => fs.existsSync(path.join(HERE, "work", "out", `${s}.png`)));

// ── the base and its edits, to true pixels on one palette
const raw0 = await L.loadRaw(path.join(HERE, "work", "out", "pasture-trough.png"));
const grid = L.detectGrid(raw0, undefined, [6.2, 7.2]);
const g0 = L.cellsOf(raw0, grid);
const ge = [];
// (an edit is cut on the base's grid and on its own, and the one that lines up better is taken: the model now and then
// redraws the trough a little larger or moved, in the same number of its own pixels)
for (const [, s] of edits) { const r = await L.loadRaw(path.join(HERE, "work", "out", `${s}.png`)); ge.push([L.cellsOf(r, L.detectGrid(r, grid.p)), L.cellsOf(r, L.detectGrid(r, undefined, [5.5, 9.5]))]); }
const pal = L.paletteOf([g0, ...ge.flat()], 64);
for (const g of [g0, ...ge.flat()]) L.snap(g, pal);
const box = L.bbox(g0, L.figures(g0, L.spansOf(g0, 1))[0]);
const W = box.x1 - box.x0 + 1, H = box.y1 - box.y0 + 1;
const px = (g, x, y, dx = 0, dy = 0) => { const X = x + box.x0 + dx, Y = y + box.y0 + dy; if (X < 0 || Y < 0 || X >= g.GW || Y >= g.GH) return [0, 0, 0, 0]; const o = (Y * g.GW + X) * 4; return [g.c[o], g.c[o + 1], g.c[o + 2], g.c[o + 3]]; };
const diff = (a, b) => (!a[3] && !b[3] ? 0 : !a[3] || !b[3] ? 300 : Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]));

// ── the step from one compartment to the next: the shift under which the trough looks most like itself
let v = null;
for (let dx = 30; dx <= 48; dx++) for (let dy = -26; dy <= -14; dy++) {
  let s = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = px(g0, x, y), b = px(g0, x + dx, y + dy); if (!a[3] || !b[3]) continue; s += diff(a, b); n++; }
  if (n > 800 && (!v || s / n < v.cost)) v = { dx, dy, cost: s / n };
}
console.log(`grid ${grid.p.toFixed(2)}, trough ${W}x${H}, step (${v.dx}, ${v.dy}), alike ${v.cost.toFixed(1)}`);

// ── a seam: one x a row inside [lo(y), hi(y)], moving at most 2 a row, through the pixels where the picture and the
// picture moved by `sh` agree best (both sides of the seam then join)
function seam(lo, hi, sh) {
  const cost = (x, y) => diff(px(g0, x, y), px(g0, x + sh.dx, y + sh.dy)) + diff(px(g0, x - 1, y), px(g0, x - 1 + sh.dx, y + sh.dy));
  const best = [], from = [];
  for (let y = 0; y < H; y++) {
    best.push(new Map()); from.push(new Map());
    for (let x = lo(y); x <= hi(y); x++) {
      let b = y ? Infinity : 0, f = null;
      if (y) for (const [px_, c] of best[y - 1]) if (Math.abs(px_ - x) <= 2 && c < b) { b = c; f = px_; }
      if (b === Infinity) { for (const [px_, c] of best[y - 1]) if (c + Math.abs(px_ - x) * 50 < b) { b = c + Math.abs(px_ - x) * 50; f = px_; } }
      best[y].set(x, b + cost(x, y)); from[y].set(x, f);
    }
  }
  let x = [...best[H - 1].entries()].sort((a, b) => a[1] - b[1])[0][0];
  const c = new Array(H);
  for (let y = H - 1; y >= 0; y--) { c[y] = x; x = from[y].get(x); }
  return c;
}
// where the second board stands in the drawn trough (read off work/pasture/trough/pasture-trough-grid.png): its back
// post's middle at x 44 down to row 43, the board's top across to its front post's middle at x 64 by row 54, the front
// post down from there; the seam is looked for within 3 pixels of that line (inside the post, which is 9 across)
const BOARD2 = { back: [44, 43], front: [64, 54] };
const mid2 = (y) => { const [[bx, by], [fx, fy]] = [BOARD2.back, BOARD2.front]; return Math.round(y <= by ? bx : y >= fy ? fx : bx + ((y - by) * (fx - bx)) / (fy - by)); };
const c0 = seam((y) => mid2(y) - 3, (y) => mid2(y) + 3, v);
const at = (c, y) => c[Math.max(0, Math.min(H - 1, y))];
// B_k(y): the k-th board's seam, the second board's moved by k steps
const B = (k, y) => at(c0, y - k * v.dy) + k * v.dx;
// the ends: the first board joined to the second (moved back a step), the fourth to the third
const cL = seam((y) => B(-1, y), (y) => B(-1, y) + 10, { dx: v.dx, dy: v.dy });
const cR = seam((y) => B(2, y) - 10, (y) => B(2, y), { dx: -v.dx, dy: -v.dy });

// ── the pieces, each on its own canvas with its offset from the trough's box
function piece(name, inside, from = (x, y) => px(g0, x, y)) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y) && from(x, y)[3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, buf = Buffer.alloc(w * h * 4);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) { const p = from(x, y); if (p[3]) buf.set(p, ((y - y0) * w + (x - x0)) * 4); }
  return { name, x: x0, y: y0, w, h, buf };
}
const seg = (x, y) => x >= B(0, y) && x < B(1, y);
const pieces = [piece("pa_troughLeft", (x, y) => x < cL[y]), piece("pa_troughSlot", seg), piece("pa_troughRight", (x, y) => x >= cR[y])];
// the filled compartments: the edit, laid where it lines up best with the base, its changed pixels inside the
// compartment (a few pixels in from its seams) laid on the empty one
for (const [k, [feed]] of edits.entries()) {
  let al = null;
  for (const g of ge[k]) {
    const eb = L.bbox(g, L.figures(g, L.spansOf(g, 1))[0]), ox = eb.x0 - box.x0, oy = eb.y1 - box.y1;
    for (let dx = ox - 4; dx <= ox + 4; dx++) for (let dy = oy - 4; dy <= oy + 4; dy++) {
      let s = 0, n = 0;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (!seg(x, y)) { const a = px(g0, x, y); if (!a[3]) continue; s += diff(a, px(g, x, y, dx, dy)); n++; }
      if (!al || s / n < al.cost) al = { g, dx, dy, cost: s / n };
    }
  }
  const g = al.g;
  const inner = (x, y) => x >= B(0, y) + 3 && x < B(1, y) - 3;
  pieces.push(piece(`pa_troughSlot_${SPECIES[feed.split("_")[0]]}_${feed.split("_")[1]}`, seg, (x, y) => {
    const a = px(g0, x, y), b = px(g, x, y, al.dx, al.dy);
    return inner(x, y) && b[3] && diff(a, b) > 40 ? b : a;
  }));
  console.log(`  ${feed}: lined up at (${al.dx}, ${al.dy}), unlike ${al.cost.toFixed(1)}`);
}
for (const p of pieces) await L.sharp(p.buf, { raw: { width: p.w, height: p.h, channels: 4 } }).png().toFile(path.join(OUT, `${p.name}.png`));
// Every piece stands on one point, its place's: where the compartment's front wall meets the floor, at its middle (the
// slot's own for a slot; for the left end the first place's, for the right end the last's). A trough of n places is
// then each slot drawn at its place's point, the left end at the first's and the right end at the last's, the places a
// step apart (pieces.json: `step`, the drawn trough's pixels from one place to the next, up to the right).
const slot = pieces.find((p) => p.name === "pa_troughSlot"), xc = slot.x + Math.floor(slot.w / 2);
let yc = -1; for (let y = 0; y < H; y++) if (seg(xc, y) && px(g0, xc, y)[3]) yc = y;
const A = { x: xc, y: yc }, standsAt = (p) => p.name === "pa_troughLeft" ? [A.x - v.dx, A.y - v.dy] : p.name === "pa_troughRight" ? [A.x + v.dx, A.y + v.dy] : [A.x, A.y];
const meta = { grid: +grid.p.toFixed(3), step: [v.dx, v.dy], pieces: Object.fromEntries(pieces.map((p) => [p.name, { x: p.x, y: p.y, w: p.w, h: p.h, ax: standsAt(p)[0] - p.x, ay: standsAt(p)[1] - p.y }])) };
fs.writeFileSync(path.join(OUT, "pieces.json"), JSON.stringify(meta, null, 1));

// ── a look: troughs of 2 and 4 places, empty and with the feeds in turn, at 4x
async function lay(n, fill) {
  // place i (0 = the lowest left) is the compartment moved by (i - 1) steps from where it was cut (the base's second)
  const S = 4, pad = 4, w = W + Math.max(0, n - 3) * v.dx + pad * 2, h = H + Math.max(0, n - 3) * -v.dy + pad * 2;
  const oy = Math.max(0, n - 3) * -v.dy;
  const comp = [];
  const put = async (name, dx, dy) => { const p = pieces.find((q) => q.name === name); if (!p) return; comp.push({ input: await L.sharp(p.buf, { raw: { width: p.w, height: p.h, channels: 4 } }).resize({ width: p.w * S, kernel: "nearest" }).png().toBuffer(), left: (p.x + dx + pad) * S, top: (p.y + dy + pad + oy) * S }); };
  for (let i = 0; i < n; i++) await put(pieces.some((q) => q.name === fill(i)) ? fill(i) : "pa_troughSlot", (i - 1) * v.dx, (i - 1) * v.dy);
  await put("pa_troughLeft", 0, 0);
  await put("pa_troughRight", (n - 3) * v.dx, (n - 3) * v.dy);
  return L.sharp({ create: { width: w * S, height: h * S, channels: 4, background: "#6b5a44" } }).composite(comp).png().toBuffer();
}
const looks = [await lay(2, () => "pa_troughSlot"), await lay(4, () => "pa_troughSlot")];
if (edits.length) for (const n of FILLS) looks.push(await lay(4, (i) => `pa_troughSlot_${SPECIES[FEEDS[i]]}_${n}`));
let y = 0; const comp = [];
for (const b of looks) { const m = await L.sharp(b).metadata(); comp.push({ input: b, left: 0, top: y }); y += m.height + 8; }
const wmax = Math.max(...(await Promise.all(looks.map(async (b) => (await L.sharp(b).metadata()).width))));
await L.sharp({ create: { width: wmax, height: y, channels: 4, background: "#3a3026" } }).composite(comp).png().toFile(path.join(OUT, "look.png"));
console.log(`pieces: ${pieces.map((p) => p.name).join(", ")}; look: work/pasture/trough/look.png`);
