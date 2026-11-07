// Cash Town's farm from the map editor (the owner, 2026-11-07: "ช่วย check oatto-farmv2 ใน Download แล้ววางแผนปรับแผนที่ฟาร์ม
// จากแผนนี้หน่อย", and of the plan, "เริ่มทำได้เลย"): a 150 × 110 map made in the Cashtown map editor, exported as map.json +
// pictures (its README.md says how to read it), turned into what the game reads. It lies where the farm is, its corner at
// the farm's (128, 0) in the tile space (`settings.game_spots.origin_in_game`), and everything here is written in the
// game's tiles and isometric pixels, so nothing that reads it adds the corner again.
//
//   node build-farm2.mjs [--src <export dir>] [--out <public dir>] [--json <file>] [--debug <png>]
//
//   --src    the editor's export (default: the shared tree's git-ignored work/oatto-farmv2, where its pictures stay)
//   --out    where the pictures go (default: <this repo>/public/town/farm2): one lossless webp a picture, cut to what is
//            drawn of it and named by its content, so a page fetches only those it comes near (lib/town/farm2-art)
//   --json   the map for the game (default: <this repo>/lib/town/farm2-map.json)
//   --debug  a picture of the whole map at a quarter size with the walk rules laid over it (for looking at)
//
// What the game takes from the map, and what is the game's own, is in lib/town/farm2 (the map's numbers for the beds and
// the barns are the game's, so every member's plots and barn keep their number). Here:
// - the ground at an eighth of a tile, in the game's own textures (the editor's farm is painted in them), the beds'
//   tiles the game's "field";
// - what may be walked on each tile (the editor's `collision.rows`, its water, and a barn's floor), and the edges that
//   may not be crossed (its fences and the barns' walls: `collision.edges`);
// - every placed thing with where it is drawn, as lib/town/town2's things are, and how it stands among the walkers;
// - what the game draws itself, from the map's pictures, by what is going on (`roles`): each barn in the look its owner
//   has bought, shut, open or with somebody inside; each animal's food tray, full or empty; the fire bowls, lit at
//   night; the storage chests, open while somebody has them open; and where the beds, barns, wells, lamps, benches,
//   gates, Uncle Popoto's stall, his making table, his pen and the duck pond are.
// What is left out: the sand under the barns (it only marked where they stand: the author's note, "ลบพื้นทรายออกน่าจะดู
// ดีกว่า"), the beds' soil pictures (the game lays its own plots), and the barns' examples stacked on the first four.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REPO, exportReader, sharp, spriteWriter, toIso } from "./editor-export.mjs";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const SRC = arg("--src", "E:/NinenineProject/fcnext/.claude/skills/fc-cash-town/scripts/pixel/work/oatto-farmv2");
const OUT = arg("--out", path.join(REPO, "public/town/farm2"));
const JSON_OUT = arg("--json", path.join(REPO, "lib/town/farm2-map.json"));
const DEBUG = arg("--debug", "");

const map = JSON.parse(fs.readFileSync(path.join(SRC, "map.json"), "utf8"));
const { cols: COLS, rows: ROWS } = map;
const [OX, OY] = map.settings?.game_spots?.origin_in_game ?? [128, 0];
/** Where the map's isometric pixels are in the game's. */
const ISO = toIso(OX, OY);
/** A map tile in the game's tiles. */
const G = ([x, y]) => [x + OX, y + OY];

/* ── the ground ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const fineRow = (sy) => map.ground_fine.rows[String(sy)] ?? "";
/** The letter painted at an eighth of a tile, or the tile's own. */
const fineAt = (sx, sy) => { const f = fineRow(sy)[sx]; return f && f !== "." ? f : map.ground[sy >> 3][sx >> 3]; };
const paintAt = (sx, sy) => { const f = fineRow(sy)[sx]; return f && f !== "." ? f : "."; };
const fineRows = [];
for (let sy = 0; sy < ROWS * 8; sy++) {
  let s = "", i = 0;
  while (i < COLS * 8) { const c = paintAt(i, sy); let j = i; while (j < COLS * 8 && paintAt(j, sy) === c) j++; s += c + (j - i > 1 ? j - i : ""); i = j; }
  fineRows.push(s);
}
const WATER = Object.entries(map.ground_legend).find(([, n]) => n === "water")[0];
const wetTile = (tx, ty) => { let n = 0; for (let sy = 0; sy < 8; sy++) for (let sx = 0; sx < 8; sx++) if (fineAt(tx * 8 + sx, ty * 8 + sy) === WATER) n++; return n >= 32; };

/* ── what each thing is to the game ──────────────────────────────────────────────────────────────────────────────── */

const base = (o) => o.asset.replace(/~.*$/, "");
/** The four barn looks, plainest first (the game's facades 0..3, bought in this order): each shut, open and inside. */
const DESIGNS = [
  { shut: /^barnt1_1_/, open: /^barnt1_2_/, inside: /^barnt1_3_/ },
  { shut: /^barnt2_1_/, open: /^barnt2_2_/, inside: /^barnt2_3_/ },
  { shut: /^barn_v3_close$/, open: /^barn_v3_open$/, inside: /^barn_v3_inside$/ },
  { shut: /^barn_v4_close$/, open: /^barn_v4_open$/, inside: /^barn_v4_inside$/ },
];
const isDesign = (o) => DESIGNS.some((d) => d.shut.test(base(o)) || d.open.test(base(o)) || d.inside.test(base(o)));
const TRAY = /^create_animal_feeding_trough_asset_/;
const FIREBOWL = /^create_pixel_art_firebowl_asset_/;
const LANTERN = /^pixel_art_town_street_lantern_/;
const SCARECROW = /^create_cute_scarecrow_asset_/;
/** Not drawn at all: the beds' soil (the game's plots are), the sand that only marked a barn's place. */
const LEFT_OUT = (o) => o.kind === "farm_bed" || o.kind === "barn";

/* ── the pictures ────────────────────────────────────────────────────────────────────────────────────────────────── */

const { picture, opaque, placeOf } = exportReader(SRC, map);
const placed = [];
for (const o of map.objects) placed.push({ o, pl: await placeOf(o) });
/** How many bright warm pixels a picture has (a fire's flames, a lantern lit). */
const warmth = (p) => { let n = 0; for (let i = 0; i < p.pw * p.ph; i++) { const r = p.data[i * 4], g = p.data[i * 4 + 1], b = p.data[i * 4 + 2]; if (p.data[i * 4 + 3] > 200 && r > 225 && g > 120 && b < 120 && r - b > 110) n++; } return n; };
/** How colourful a picture is: the share of its pixels far from grey (a tray full of food against an empty one). */
const colour = (p) => { let n = 0, all = 0; for (let i = 0; i < p.pw * p.ph; i++) { if (p.data[i * 4 + 3] < 200) continue; all++; const r = p.data[i * 4], g = p.data[i * 4 + 1], b = p.data[i * 4 + 2]; if (Math.max(r, g, b) - Math.min(r, g, b) > 90 && g > r * 0.8) n++; } return n / Math.max(1, all); };

// (a picture far finer than the farm's characters, 0.67 world px to a pixel, and its town's buildings, 0.375 to 0.5, is
// written at 0.45: the two grandest barns were drawn at 0.28 to 0.39, 1,300 px wide, and would be some 5 MB each
// decoded; the plain two are at 0.45 to 0.52 and stay as drawn)
const FINEST = 0.45;
// (only a large picture: a small one costs little held, and keeps its own pixels)
const kOf = new Map(placed.map(({ pl }) => [pl.file, { k: pl.k, area: pl.p.pw * pl.p.ph }]));
const shrink = (file) => { const { k, area } = kOf.get(file) ?? { k: 1, area: 0 }; return k < FINEST * 0.9 && area > 300_000 ? k / FINEST : 1; };
const { sprites, sprite } = spriteWriter(OUT, picture, shrink);

/* ── the walk grid ───────────────────────────────────────────────────────────────────────────────────────────────── */

// "." ground, "~" water, "#" something stands there, "s" a bench's seat (stands there), " " no ground
const walk = map.collision.rows.map((r, ty) => [...r].map((c, tx) => (c === "_" ? " " : c === "#" ? "#" : c === "s" ? "s" : wetTile(tx, ty) ? "~" : ".")));
const barnPlots = map.objects.filter((o) => o.kind === "barn").sort((a, b) => a.barn - b.barn);
// a barn's floor is walked on (only its door lets anybody in: its walls are edges), but its hay and its nest
for (const b of barnPlots) {
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) walk[y][x] = ".";
  for (const [x, y] of [...b.spots.hay, ...b.spots.nest]) walk[y][x] = "#";
}
const edges = map.collision.edges.map(([x, y, side]) => [x + OX, y + OY, side]);

/* ── the placed things, as the game draws them ───────────────────────────────────────────────────────────────────── */

/**
 * How each thing is drawn among the walkers (lib/town/farm2-art), as lib/town/town2-art's:
 * 0 `floor`: on the ground under everybody (the gates' rings, the pen's sand);
 * 1 `stand`: back to front with the walkers, by its middle;
 * 2 `wide`: a thing too wide for one place in that order (a barn, a glasshouse), in narrow upright strips, each as far
 *   forward as its footprint's front edge below it;
 * 3 `edge`: a length of fence on a tile's edge, in strips as far forward as its edge's line (README §6's rule for walls:
 *   whoever is on its near side in front of it, on its far side behind);
 * 4 `role`: drawn by the game itself, where and when what it stands for says (a barn's look, a tray, a fire lit, a
 *   chest open: lib/town/farm2's roles).
 */
const DRAW = { floor: 0, stand: 1, wide: 2, edge: 3, role: 4 };
const STRIP = 12;
const stripDepth = ([bx0, by0, bx1, by1], mid) =>
  mid <= (bx1 - by1) * 32 ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
const firebowls = placed.filter(({ o }) => FIREBOWL.test(base(o)));
const LIT_BOWL = firebowls.map(({ pl }) => pl.p).reduce((best, p) => (warmth(p) > warmth(best) ? p : best));
const trays = placed.filter(({ o }) => TRAY.test(base(o)));
const FULL_TRAY = trays.map(({ pl }) => pl.p).reduce((best, p) => (colour(p) > colour(best) ? p : best));
const howDrawn = ({ o, pl }) => {
  if (o.kind === "wall") return DRAW.edge;
  if (isDesign(o) || TRAY.test(base(o)) || base(o) === "chest_open" || (FIREBOWL.test(base(o)) && pl.p === LIT_BOWL)) return DRAW.role;
  if (o.kind === "ring" || o.kind === "pen") return DRAW.floor;
  return pl.w + pl.h >= 4 && o.kind !== "tree" ? DRAW.wide : DRAW.stand;
};

const names = [], nameOf = (n) => { let i = names.indexOf(n); if (i < 0) i = names.push(n) - 1; return i; };
const objects = [], rings = {}, strips = {}, walls = {};
/** Each export object's number among the things written, by its id. */
const indexOf = new Map();
for (const t of placed) {
  const { o, pl } = t;
  if (LEFT_OUT(o)) continue;
  const s = await sprite(pl.file), sp = sprites[s], [x0, y0, pw] = sp.cut, k = pl.k / sp.f;
  // the cut picture's own top-left, where the whole one's was drawn (mirrored, the cut's left is measured from the
  // right), in the game's isometric pixels
  const left = +(pl.left + (pl.flip ? pw - x0 - sp.w / sp.f : x0) * pl.k + ISO.x).toFixed(2), top = +(pl.top + y0 * pl.k + ISO.y).toFixed(2);
  const draw = howDrawn(t);
  const box = [+(pl.cx - pl.w / 2 + OX).toFixed(3), +(pl.cy - pl.h / 2 + OY).toFixed(3), +(pl.cx + pl.w / 2 + OX).toFixed(3), +(pl.cy + pl.h / 2 + OY).toFixed(3)];
  const d = pl.cx + pl.cy + OX + OY + (o.z ?? 0);
  indexOf.set(o.id, objects.length);
  // [name, picture, left, top, scale, mirrored, how drawn, order, footprint x0 y0 x1 y1]
  objects.push([nameOf(base(o)), s, left, top, +k.toFixed(5), pl.flip ? 1 : 0, draw, +d.toFixed(3), ...box]);
  if (draw === DRAW.wide) {
    // (a wide thing's strips at its footprint's front edge; written only where they are not that: none here)
  }
  if (draw === DRAW.edge) { const [wx, wy, side] = o.wall; walls[objects.length - 1] = [wx + OX, wy + OY, side]; }
  if (pl.a.sink) rings[objects.length - 1] = pl.a.sink.lines.map(([x, y, , size]) =>
    [+(pl.left + (pl.flip ? pl.p.pw - x : x) * pl.k + ISO.x).toFixed(1), +(pl.top + y * pl.k + ISO.y).toFixed(1), String(size)]);
}
const byAsset = (re) => map.objects.filter((o) => re.test(base(o)) && indexOf.has(o.id));
const idx = (o) => indexOf.get(o.id);
const centre = (o) => (o.at ? [o.at[0] + OX, o.at[1] + OY] : [o.x + (o.w ?? 1) / 2 + OX, o.y + (o.h ?? 1) / 2 + OY]);
const r2 = (n) => Math.round(n * 100) / 100;

/* ── the roles ───────────────────────────────────────────────────────────────────────────────────────────────────── */

const beds = map.objects.filter((o) => o.kind === "farm_bed").sort((a, b) => a.bed - b.bed);
if (beds.length !== 48 || beds.some((b, i) => b.bed !== i || b.w !== 7 || b.h !== 7)) throw new Error("the farm should have beds 0..47, each 7 × 7");
if (barnPlots.length !== 24 || barnPlots.some((b, i) => b.barn !== i || b.w !== 8 || b.h !== 4)) throw new Error("the farm should have barns 0..23, each 8 × 4");
// (a bed's tiles are the game's field: whatever the editor's collision says of them, they are walked on)
for (const b of beds) for (let y = b.y; y < b.y + 7; y++) for (let x = b.x; x < b.x + 7; x++) if (walk[y][x] !== ".") throw new Error(`bed ${b.bed}: tile ${x},${y} is "${walk[y][x]}"`);

/** A barn look's three pictures, where they stand from their barn's corner (isometric pixels from the corner's point). */
const designs = DESIGNS.map((d, n) => {
  const pick = (re) => { const o = map.objects.find((q) => re.test(base(q))); if (!o) throw new Error(`no ${re} for barn look ${n}`); return o; };
  const o = { shut: pick(d.shut), open: pick(d.open), inside: pick(d.inside) };
  const plot = barnPlots.find((b) => b.x === o.shut.x && b.y === o.shut.y);
  if (!plot || [o.open, o.inside].some((q) => q.x !== plot.x || q.y !== plot.y)) throw new Error(`barn look ${n}: its pictures are not on one barn`);
  const corner = toIso(plot.x + OX, plot.y + OY), rel = (q) => { const t = objects[idx(q)]; return [r2(t[2] - corner.x), r2(t[3] - corner.y)]; };
  return { shut: idx(o.shut), open: idx(o.open), inside: idx(o.inside), at: { shut: rel(o.shut), open: rel(o.open), inside: rel(o.inside) }, example: plot.barn };
});
/** An animal's tray: the full one's picture and the empty one's, and where one stands from its tile's middle. */
const trayOf = (full) => {
  const t = trays.find(({ pl }) => (pl.p === FULL_TRAY) === full), o = t.o, at = toIso(o.x + 0.5 + OX, o.y + 0.5 + OY), q = objects[idx(o)];
  const plot = barnPlots.find((b) => o.x >= b.x && o.x < b.x + b.w && o.y >= b.y && o.y < b.y + b.h);
  return { thing: idx(o), at: [r2(q[2] - at.x), r2(q[3] - at.y)], from: [o.x - plot.x, o.y - plot.y] };
};
const fires = (() => {
  const unlit = firebowls.filter(({ pl }) => pl.p !== LIT_BOWL).map(({ o }) => o);
  const lit = firebowls.filter(({ pl }) => pl.p === LIT_BOWL).map(({ o }) => o);
  // (in the order of the game's four fires: the garden's north and south, then the barns' north and south)
  const order = (a, b) => (a.x > 70) - (b.x > 70) || a.y - b.y;
  return unlit.sort(order).map((o) => {
    const l = lit.find((q) => q.x === o.x && q.y === o.y);
    return { tile: G([o.x + 1, o.y + 1]), tiles: o.tiles?.length ?? 4, unlit: idx(o), lit: l ? idx(l) : null, box: [o.x + OX, o.y + OY, o.x + OX + o.w, o.y + OY + o.h] };
  });
})();
const chests = byAsset(/^chest_closed$/).sort((a, b) => a.y - b.y).map((o) => {
  const open = map.objects.find((q) => base(q) === "chest_open" && q.x === o.x && q.y === o.y);
  return { tile: G([o.x, o.y]), tiles: [G([o.x, o.y]), G([o.x + 1, o.y])], shut: idx(o), open: open ? idx(open) : null };
});
const wells = byAsset(/^create_stone_well_/).sort((a, b) => a.y - b.y).map((o) => {
  const [cx, cy] = centre(o);
  return { at: [r2(cx), r2(cy)], tiles: (o.tiles ?? []).map(G), thing: idx(o) };
});
/** Where a lantern's light is: its picture's top quarter's middle, isometric pixels. */
const headOf = (q) => {
  const sp = sprites[q[1]], k = q[4];
  return [r2(q[2] + (sp.w * k) / 2), r2(q[3] + sp.h * k * 0.16)];
};
const lanterns = byAsset(LANTERN).map((o) => ({ tile: G(o.tiles?.[0] ?? [Math.floor(o.x), Math.floor(o.y)]), thing: idx(o), head: headOf(objects[idx(o)]) }));
const benches = map.objects.filter((o) => o.sit?.length && indexOf.has(o.id)).map((o) => ({
  thing: idx(o),
  seats: o.sit.map((s) => ({ tile: G(s.tile), facing: s.facing, point: [r2(s.point[0] + ISO.x), r2(s.point[1] + ISO.y)], view: s.view, mirror: !!s.mirror, draw: s.draw })),
}));
const scarecrows = byAsset(SCARECROW).map((o) => ({ thing: idx(o), tile: G([Math.floor(centre(o)[0] - OX), Math.floor(centre(o)[1] - OY)]) }));
const one = (re) => { const o = byAsset(re)[0]; if (!o) throw new Error(`no ${re}`); return o; };
const stall = one(/^livestock_supply_stall_/), table = one(/^wood_counter_with_cheese_maker/), waterTrough = one(/^create_water_trough_/);
const penObj = map.objects.find((o) => o.kind === "pen");
const ringObjs = byAsset(/^game_ring$/).sort((a, b) => a.y - b.y);

/* ── what can be walked to ───────────────────────────────────────────────────────────────────────────────────────── */

const blocked = new Set(edges.map(([x, y, s]) => `${x - OX},${y - OY},${s}`));
const crosses = (ax, ay, bx, by) => {
  if (bx === ax && by === ay - 1) return blocked.has(`${ax},${ay},n`);
  if (bx === ax && by === ay + 1) return blocked.has(`${bx},${by},n`);
  if (by === ay && bx === ax - 1) return blocked.has(`${ax},${ay},w`);
  if (by === ay && bx === ax + 1) return blocked.has(`${bx},${by},w`);
  return true;
};
const open = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && walk[y][x] === ".";
const reach = (() => {
  const [sx, sy] = [Math.floor(ringObjs[0].at?.[0] ?? ringObjs[0].x) + 2, Math.floor(ringObjs[0].at?.[1] ?? ringObjs[0].y)];
  const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || !open(nx, ny) || crosses(x, y, nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen;
})();
const unreached = [];
for (const b of beds) for (let y = b.y; y < b.y + 7; y++) for (let x = b.x; x < b.x + 7; x++) if (!reach.has(`${x},${y}`)) unreached.push(`bed ${b.bed} ${x},${y}`);
for (const b of barnPlots) for (const [x, y] of [...b.spots.door, ...b.spots.step]) if (!reach.has(`${x},${y}`)) unreached.push(`barn ${b.barn} ${x},${y}`);
if (unreached.length) throw new Error(`not reached from the west gate: ${unreached.slice(0, 12).join("; ")} (${unreached.length})`);

/** The pen's own ground: its picture's box, the tiles of it nobody walks to. */
const pen = (() => {
  const x0 = penObj.x, y0 = penObj.y, tiles = [];
  for (let y = y0; y < y0 + penObj.h; y++) for (let x = x0; x < x0 + penObj.w; x++) if (!reach.has(`${x},${y}`) && walk[y][x] === ".") tiles.push([x, y]);
  const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
  return { x: Math.min(...xs) + OX, y: Math.min(...ys) + OY, w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1, tiles: tiles.length };
})();
/** The duck pond: its water tiles' middle and how far it goes each way. */
const pond = (() => {
  const wet = [];
  for (let y = 40; y < 64; y++) for (let x = 100; x < 140; x++) if (walk[y][x] === "~") wet.push([x, y]);
  if (!wet.length) return null;
  const xs = wet.map((t) => t[0] + 0.5), ys = wet.map((t) => t[1] + 0.5);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { cx: r2((x0 + x1) / 2 + OX), cy: r2((y0 + y1) / 2 + OY), rx: r2((x1 - x0) / 2 + 0.5), ry: r2((y1 - y0) / 2 + 0.5), tiles: wet.length };
})();

/* ── the lamps: the map's lanterns, and as many again on the barns' side ─────────────────────────────────────────── */

// (the owner, 2026-11-07, of the barns' side, where the map has none: "เราเพิ่มเองได้เลย เอาตามความเหมาะสม". The game's
// farm has 92 lamp posts; the map's 59 stand in the garden, so 33 more are put on the barns' side, the map's own lantern
// placed again: each, one at a time, on the free tile nearest the darkest ground that can be walked to there, seven
// tiles or more from every lamp and fire, never on a road, in a barn or the pen, by the water, in front of a barn's door
// or with a barn in front of it, until they are all put)
const POSTS = 92, EAST = 84;
const lampTiles = [...lanterns.map((l) => [l.tile[0] - OX, l.tile[1] - OY]), ...fires.map((f) => [f.tile[0] - OX, f.tile[1] - OY])];
const barnTile = (x, y) => barnPlots.some((b) => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h + 2);
const isRoad = (x, y) => map.ground[y][x] === "r";
const nearWater = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (walk[y + dy]?.[x + dx] === "~") return true; return false; };
const inPenBox = (x, y) => x >= penObj.x - 1 && x <= penObj.x + penObj.w && y >= penObj.y - 1 && y <= penObj.y + penObj.h;
const canPost = (x, y) => x >= EAST && x < COLS - 1 && y >= 1 && y < ROWS - 1 && reach.has(`${x},${y}`) && !isRoad(x, y) && !barnTile(x, y) && !inPenBox(x, y) && !nearWater(x, y)
  // (beside something that can be walked to: a lamp is lit from within two tiles of it)
  && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(`${x + dx},${y + dy}`))
  // (nothing tall right in front of it, down the screen)
  && walk[y + 1][x + 1] !== "#";
const ground = [...reach].map((k) => k.split(",").map(Number)).filter(([x]) => x >= EAST - 2);
const added = [];
const far = (x, y) => Math.min(...[...lampTiles, ...added].map(([a, b]) => Math.hypot(a - x, b - y)));
while (lanterns.length + added.length < POSTS) {
  let dark = null, d = -1;
  for (const [x, y] of ground) { const v = far(x, y); if (v > d) { d = v; dark = [x, y]; } }
  let best = null, bd = Infinity;
  for (let y = dark[1] - 8; y <= dark[1] + 8; y++) for (let x = dark[0] - 8; x <= dark[0] + 8; x++) {
    if (!canPost(x, y) || far(x, y) < 7) continue;
    const v = Math.hypot(x - dark[0], y - dark[1]);
    if (v < bd) { bd = v; best = [x, y]; }
  }
  if (!best) { ground.splice(ground.findIndex(([x, y]) => x === dark[0] && y === dark[1]), 1); if (!ground.length) throw new Error("no room for the barns' lamps"); continue; }
  added.push(best);
  walk[best[1]][best[0]] = "#";
}
// each placed as the map's own lantern is, on its tile's middle
const LANTERN_O = byAsset(LANTERN)[0], LANTERN_Q = objects[idx(LANTERN_O)];
const [lcx, lcy] = centre(LANTERN_O), lanternAt = toIso(lcx, lcy);
for (const [x, y] of added) {
  const c = toIso(x + 0.5 + OX, y + 0.5 + OY), q = [...LANTERN_Q];
  q[2] = r2(LANTERN_Q[2] + c.x - lanternAt.x); q[3] = r2(LANTERN_Q[3] + c.y - lanternAt.y);
  q[7] = +(x + y + 1 + OX + OY).toFixed(3);
  q[8] = x + 0.32 + OX; q[9] = y + 0.32 + OY; q[10] = x + 0.68 + OX; q[11] = y + 0.68 + OY;
  objects.push(q);
  lanterns.push({ tile: G([x, y]), thing: objects.length - 1, head: headOf(q), added: true });
}

/* ── the ripples ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const ripples = { frames: map.ripples?.frames ?? 2, fps: map.ripples?.fps ?? 1, src: "", sizes: {} };
{
  const parts = [];
  for (const [size, r] of Object.entries(map.ripples?.sizes ?? {})) for (const side of ["back", "front"]) parts.push({ size, side, r, file: path.join(SRC, r[side]) });
  let y = 0, W = 0;
  for (const p of parts) { const m = await sharp(p.file).metadata(); p.w = m.width; p.h = m.height; p.y = y; y += m.height; W = Math.max(W, m.width); }
  const sheet = await sharp({ create: { width: Math.max(1, W), height: Math.max(1, y), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts.map((p) => ({ input: p.file, left: 0, top: p.y }))).webp({ lossless: true }).toBuffer();
  ripples.src = `ripples-${crypto.createHash("sha1").update(sheet).digest("hex").slice(0, 10)}.webp`;
  fs.writeFileSync(path.join(OUT, ripples.src), sheet);
  for (const p of parts) { const at = (ripples.sizes[p.size] ??= { frame: p.r.frame_size, centre: p.r.centre }); at[p.side] = [0, p.y, p.w, p.h]; }
}

/* ── written ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const out = {
  v: 1, cols: COLS, rows: ROWS, origin: [OX, OY], from: `${path.basename(SRC)}, exported ${map.exported}`,
  legend: map.ground_legend, wobble: map.ground_edges?.wobble ?? 0.35,
  ground: map.ground, fine: fineRows,
  walk: walk.map((r) => r.join("")),
  edges,
  sprites: sprites.map(({ src, w, h }) => [src, w, h]),
  names, objects, rings, strips, walls, ripples,
  roles: {
    beds: beds.map((b) => G([b.x, b.y])),
    barns: barnPlots.map((b) => ({ x: b.x + OX, y: b.y + OY, door: b.spots.door.map(G), step: b.spots.step.map(G), hay: G(b.spots.hay[0]), nest: G(b.spots.nest[0]) })),
    designs, trays: { full: trayOf(true), empty: trayOf(false) },
    fires, chests, wells, lanterns, benches, scarecrows,
    stall: { thing: idx(stall), tiles: (stall.tiles ?? []).map(G), centre: centre(stall).map(r2) },
    table: { thing: idx(table), tiles: (table.tiles ?? []).map(G), centre: centre(table).map(r2) },
    waterTrough: { thing: idx(waterTrough), tiles: (waterTrough.tiles ?? []).map(G), centre: centre(waterTrough).map(r2) },
    pen, pond,
    rings: ringObjs.map((o) => ({ thing: idx(o), centre: centre(o).map(r2) })),
  },
};
fs.writeFileSync(JSON_OUT, JSON.stringify(out));
const count = (c) => out.walk.join("").split(c).length - 1;
console.log(`farm2: ${objects.length} things, ${sprites.length} pictures, ${(fs.statSync(JSON_OUT).size / 1024).toFixed(0)} KB of map;`,
  `tiles: ground ${count(".")}, water ${count("~")}, closed ${count("#")}, seats ${count("s")}; edges ${edges.length}; walked to ${reach.size}`);
console.log(`roles: ${designs.length} barn looks, fires ${fires.length} (lit pictures ${fires.filter((f) => f.lit !== null).length}), chests ${chests.length}, wells ${wells.length},`,
  `lamps ${lanterns.length} (${added.length} added), benches ${benches.length} (${benches.reduce((n, b) => n + b.seats.length, 0)} seats), scarecrows ${scarecrows.length},`,
  `pen ${JSON.stringify(pen)}, pond ${JSON.stringify(pond)}`);
const fine = sprites.map((s, i) => [s.src, s.f]).filter(([, f]) => f < 1);
console.log(`written finer than drawn, at ${FINEST} world px a pixel: ${fine.map(([s, f]) => `${s} ×${f.toFixed(2)}`).join(", ") || "none"}`);
const bytes = sprites.reduce((n, s) => n + fs.statSync(path.join(OUT, s.src)).size, 0), decoded = sprites.reduce((n, s) => n + s.w * s.h * 4, 0);
console.log(`pictures: ${(bytes / 1e6).toFixed(1)} MB of webp, ${(decoded / 1e6).toFixed(0)} MB decoded if all were held at once`);

/* ── a look at the rules ─────────────────────────────────────────────────────────────────────────────────────────── */

if (DEBUG) {
  const Q = +(process.env.Q ?? 0.25), ox = (ROWS - OX) * 32, oy = -ISO.y, W = Math.ceil((COLS + ROWS) * 32 * Q), H = Math.ceil((COLS + ROWS) * 16 * Q) + 120;
  const comps = [];
  for (const [, si, ox0, oy0, ok, of, how] of objects) {
    if (how === DRAW.role) continue;
    const sp = sprites[si], w = Math.max(1, Math.round(sp.w * ok * Q)), h = Math.max(1, Math.round(sp.h * ok * Q));
    let img = sharp(path.join(OUT, sp.src)); if (of) img = img.flop();
    const left = Math.round((ox0 + ox) * Q), top = Math.round((oy0 + oy) * Q) + 100;
    if (left + w <= 0 || top + h <= 0 || left >= W || top >= H) continue;
    const buf = await img.resize(w, h, { kernel: "nearest" }).png().toBuffer();
    const cx0 = Math.max(0, -left), cy0 = Math.max(0, -top), cw = Math.min(w, W - left) - cx0, ch = Math.min(h, H - top) - cy0;
    if (cw <= 0 || ch <= 0) continue;
    comps.push({ input: cw === w && ch === h ? buf : await sharp(buf).extract({ left: cx0, top: cy0, width: cw, height: ch }).png().toBuffer(), left: left + cx0, top: top + cy0 });
  }
  const tint = { "~": "rgba(40,120,255,0.35)", "#": "rgba(255,40,40,0.45)", s: "rgba(255,0,200,0.5)", " ": "rgba(0,0,0,0.6)" };
  const P = (a, b) => { const p = toIso(a + OX, b + OY); return `${((p.x + ox) * Q).toFixed(1)},${((p.y + oy) * Q + 100).toFixed(1)}`; };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = walk[y][x], bed = beds.some((b) => x >= b.x && x < b.x + 7 && y >= b.y && y < b.y + 7);
    const fill = tint[c] ?? (bed ? "rgba(140,90,40,0.35)" : !reach.has(`${x},${y}`) ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0)");
    svg += `<polygon points="${P(x, y)} ${P(x + 1, y)} ${P(x + 1, y + 1)} ${P(x, y + 1)}" fill="${fill}" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;
  }
  for (const [x, y, s] of edges) { const a = s === "n" ? [x + 1, y] : [x, y + 1]; svg += `<line x1="${P(x - OX, y - OY).split(",")[0]}" y1="${P(x - OX, y - OY).split(",")[1]}" x2="${P(a[0] - OX, a[1] - OY).split(",")[0]}" y2="${P(a[0] - OX, a[1] - OY).split(",")[1]}" stroke="yellow" stroke-width="1.2"/>`; }
  for (const l of lanterns) { const [x, y] = l.tile; svg += `<circle cx="${P(x - OX + 0.5, y - OY + 0.5).split(",")[0]}" cy="${P(x - OX + 0.5, y - OY + 0.5).split(",")[1]}" r="3" fill="${l.added ? "#0ff" : "#ff0"}"/>`; }
  svg += "</svg>";
  const baseImg = await sharp({ create: { width: W, height: H, channels: 4, background: "#14171d" } }).composite(comps).png().toBuffer();
  await sharp(baseImg).composite([{ input: Buffer.from(svg) }]).png().toFile(DEBUG);
  console.log("debug picture:", DEBUG);
}
