// Cash Town's city (the owner, 2026-11-23: "ช่วยเพิ่มแมพใหม่เป็นเมืองโดยมีรายละเอียดตามไฟล์ cashcity ใน Download คิดว่าน่าจะ
// replace แมพเดิม", then of the plan, "ตามที่แนะนำทั้งหมด เริ่มทำได้เลย"): a 140 × 135 map made in the Cashtown map editor,
// exported as map.json + pictures (its README.md says how to read it), turned into what the game reads. It is the first map
// of ours with heights (a sunken park, the canals and the sea four steps down, the roads a kerb below the pavements) and
// with rooms walked into (the city hall, the kitchen, the hospital, the bank, the uncle's mart: each an outside picture and
// a cut-away inside one on one footprint, the walls the map's own edges with a doorway left open).
//
//   node build-city.mjs [--src <export dir>] [--out <public dir>] [--json <file>] [--debug <png>] [--crop x0,y0,x1,y1]
//
//   --src    the editor's export (default: the shared tree's git-ignored work/cashcity, where its pictures stay)
//   --out    where the pictures go (default: <this repo>/public/town/city): one lossless webp a picture, cut to what is
//            drawn of it, written no finer than FINEST world px a pixel, named by its content (lib/town/city-art fetches
//            only those near the view)
//   --json   the map for the game (default: <this repo>/lib/town/city-map.json)
//   --debug  a picture of the map (or of --crop's tiles) with the walk rules laid over it (for looking at); Q its scale
//
// It lies with its corner at (-16, 0) in the game's tiles: 140 columns from 0 would run into the farm, which starts at
// x 128; from -16 it ends at 123, and the farm, the forest and everything stored on them stay where they are. Everything
// here is written in the game's tiles and isometric pixels, so nothing that reads it adds the corner again.
//
// What the game takes from the map is the map's own (README: "Never work out again what the map states"): where may be
// walked (its `collision`, with its water and the dock's boards), the edges nobody crosses (its fences and the rooms'
// walls), its heights and stairs, its seats, and its draw order (`draw_index`), kept wherever the game's back-to-front
// order would put two pictures the other way round. Which building is which, who stands where and where each way out
// leads are lib/town/city's.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REPO, exportReader, sharp, spriteWriter, toIso } from "./editor-export.mjs";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const SRC = arg("--src", "E:/NinenineProject/fcnext/.claude/skills/fc-cash-town/scripts/pixel/work/cashcity");
const OUT = arg("--out", path.join(REPO, "public/town/city"));
const JSON_OUT = arg("--json", path.join(REPO, "lib/town/city-map.json"));
const DEBUG = arg("--debug", "");
const CROP = arg("--crop", "");

const map = JSON.parse(fs.readFileSync(path.join(SRC, "map.json"), "utf8"));
const { cols: COLS, rows: ROWS } = map;
/** The map's corner in the game's tiles. */
const OX = -16, OY = 0;
/** Where the map's isometric pixels are in the game's. */
const ISO = toIso(OX, OY);
/** A map tile in the game's tiles. */
const G = ([x, y]) => [x + OX, y + OY];
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => +n.toFixed(3);

/* ── the ground ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const fineRow = (sy) => map.ground_fine?.rows?.[String(sy)] ?? "";
const fineAt = (sx, sy) => { const f = fineRow(sy)[sx]; return f && f !== "." ? f : map.ground[sy >> 3][sx >> 3]; };
const paintAt = (sx, sy) => { const f = fineRow(sy)[sx]; return f && f !== "." ? f : "."; };
const fineRows = [];
for (let sy = 0; sy < ROWS * 8; sy++) {
  let s = "", i = 0;
  while (i < COLS * 8) { const c = paintAt(i, sy); let j = i; while (j < COLS * 8 && paintAt(j, sy) === c) j++; s += c + (j - i > 1 ? j - i : ""); i = j; }
  fineRows.push(s);
}
const WATER = Object.entries(map.ground_legend).find(([, n]) => /water/.test(n))[0];
/** Whether a tile is water: half or more of its eighths painted water. */
const wetTile = (tx, ty) => { let n = 0; for (let sy = 0; sy < 8; sy++) for (let sx = 0; sx < 8; sx++) if (fineAt(tx * 8 + sx, ty * 8 + sy) === WATER) n++; return n >= 32; };

/* ── what each thing is ──────────────────────────────────────────────────────────────────────────────────────────── */

const base = (o) => o.asset.replace(/~.*$/, "");
/**
 * The rooms walked into: the outside picture and the cut-away inside one the map lays on one footprint (the owner's
 * labels, 2026-11-23: "ตึกเทศบาล มีกล่อง+โต๊ะคราฟ", "ห้องครัว มีกล่อง+โต๊ะคราฟ เตาอาหาร แทงค์น้ำ", "โรงพยาบาล", "ธนาคาร",
 * "ร้านค้าลุง"). Told apart by looking at each pair, 2026-11-23.
 */
const ROOMS = [
  { name: "cityhall", out: "red_brick_schoolhouse_pixel_asset_df488b", in: "red_brick_schoolhouse_pixel_asset_14b39a" },
  { name: "kitchen", out: "create_european_style_restaurant_8013373", in: "create_european_style_restaurant_4195287" },
  { name: "hospital", out: "create_european_style_hospital_a_ea6b510", in: "create_european_style_hospital_a_c3339f1" },
  { name: "bank", out: "create_isometric_pixel_art_bank_85c33e84", in: "create_isometric_pixel_art_bank_9512ee63" },
  { name: "mart", out: "create_pixel_art_european_buildi_8b506f1", in: "create_pixel_art_european_buildi_794eb86" },
];
const roomOf = (o) => { for (const r of ROOMS) { if (o.asset.startsWith(r.out)) return [r, "out"]; if (o.asset.startsWith(r.in)) return [r, "in"]; } return null; };
const CHEST_SHUT = /^create_cute_storage_chest_asset_8a43d9c7/, CHEST_OPEN = /^create_cute_storage_chest_asset_f665530f/;
const LAMP = /^create_cute_street_lamp_asset/;
/** What lies low: drawn over the ground, covering so little of a walker that it may go further back to keep the editor's order. */
const LOW = /tulip|chrysanthemum|bellflower|iris_clump|wildflower|hydrangea|bush|starfish|picnic_mat/;
/** What lies flat on the ground, walked over or sat on: under whoever stands on it or beside it. */
const FLATS = /^picnic_mat|^long_drift_of_many_mixed_colour_tulips|starfish_and_seashell/;
const TREE = /_tree_|tree_pixel_art|cedar|ginkgo|maple|zelkova|camphor|persimmon|cocon/;

/* ── the pictures ────────────────────────────────────────────────────────────────────────────────────────────────── */

const reader = exportReader(SRC, map);
/**
 * The map's water, its six colours (the editor's water texture), shaded or not: cut out of the pictures of raised and sunk
 * ground, so that the city's live water (lib/town/city-water, drawn under everything) shows through where they had it,
 * the owner, 2026-11-23: "อยากทำกราฟฟิกใหม่ ให้มันดูเหมือนน้ำจริงๆเลย ไม่ใช่ jpg". 96% of the sheets' blue is these six
 * exactly; the rest is them darker along a bank.
 */
const WATER_COLOURS = [[36, 168, 236], [42, 176, 244], [100, 221, 255], [28, 159, 227], [48, 187, 255], [148, 244, 255]];
const isWater = (r, g, b) => WATER_COLOURS.some(([R, G, B]) => {
  const f = (r * R + g * G + b * B) / (R * R + G * G + B * B);
  return f > 0.45 && f < 1.12 && Math.abs(r - R * f) < 9 && Math.abs(g - G * f) < 9 && Math.abs(b - B * f) < 9;
});
let waterCut = 0;
/** A picture by its file, or a part of a terrain sheet by "file#x,y,w,h" (README §5's `rect`), its water cut out. */
const parts = new Map();
async function picture(key) {
  if (!key.includes("#")) return reader.picture(key);
  if (!parts.has(key)) {
    const [file, rect] = key.split("#"), [x, y, w, h] = rect.split(",").map(Number), sheet = await reader.picture(file);
    if (x < 0 || y < 0 || x + w > sheet.pw || y + h > sheet.ph) throw new Error(`a part beyond its sheet: ${key}`);
    const data = Buffer.alloc(w * h * 4);
    for (let j = 0; j < h; j++) sheet.data.copy(data, j * w * 4, ((y + j) * sheet.pw + x) * 4, ((y + j) * sheet.pw + x + w) * 4);
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] && isWater(data[i], data[i + 1], data[i + 2])) { data[i + 3] = 0; waterCut++; }
    parts.set(key, { data, pw: w, ph: h });
  }
  return parts.get(key);
}
const opaque = reader.opaque;
/** Where a placed thing is drawn, in the map's isometric pixels (README §6), raised or sunk with the ground it stands on (§11's `lift`). */
async function placeOf(o) {
  const a = map.assets[o.asset];
  let pl;
  if (a.rect) {
    // a terrain picture: a part of a sheet, its anchor on its footprint's middle, a picture pixel a world one
    const key = `${a.file}#${a.rect.join(",")}`, p = await picture(key), w = o.w ?? 1, h = o.h ?? 1;
    const [cx, cy] = o.at ?? [o.x + w / 2, o.y + h / 2], P = toIso(cx, cy), k = a.display?.w ? a.display.w / p.pw : 1;
    pl = { a, file: key, p, cx, cy, w, h, k, left: P.x - a.anchor[0] * k, top: P.y - a.anchor[1] * k, flip: !!o.flip };
  } else pl = await reader.placeOf(o);
  pl.top -= o.lift ?? 0;
  return pl;
}
/** Whether a picture, drawn where it is, is opaque at an isometric point. */
function drawnAt(pl, ix, iy) {
  let px = (ix - pl.left) / pl.k, py = (iy - pl.top) / pl.k;
  if (pl.flip) px = pl.p.pw - 1 - px;
  return opaque(pl.p, px, py);
}

/**
 * A stretch of raised or sunk ground in pieces of PIECE tiles along its row (README §11: one picture a row of tiles, up to
 * a hundred tiles long by the sea): a page holds the pieces about its view, not whole rows of the city (a row's picture
 * is drawn at one place back to front, so its pieces are too; each its own picture, cut to what is drawn of it).
 */
const PIECE = 4;
const placed = [];
for (const o of map.objects) {
  const pl = await placeOf(o);
  if (o.kind !== "terrain") { placed.push({ o, pl }); continue; }
  const { row, x0, x1 } = o.terrain, [file, rect] = pl.file.split("#"), [rx, ry, , rh] = rect.split(",").map(Number);
  for (let xa = x0, n = 0; xa <= x1; xa += PIECE, n++) {
    const xb = Math.min(x1, xa + PIECE - 1);
    // its columns of the picture: the tiles' own (a tile's middle is at 32 × (2x − row)), the first and last running to the picture's edges
    // (within the picture: a picture may show fewer tiles than its row names, and a part beyond it is another's on the sheet)
    const c0 = Math.max(0, xa === x0 ? 0 : Math.round(32 * (2 * xa - row) - 32 - pl.left)), c1 = Math.min(pl.p.pw, xb === x1 ? pl.p.pw : Math.round(32 * (2 * xb - row) + 32 - pl.left));
    if (c1 <= c0) continue;
    const key = `${file}#${rx + c0},${ry},${c1 - c0},${rh}`, p = await picture(key);
    // (nothing drawn in it: no piece)
    if (!p.data.some((v, i) => i % 4 === 3 && v > 0)) continue;
    placed.push({ o: { ...o, id: `${o.id}#${n}` }, pl: { ...pl, file: key, p, left: pl.left + c0 } });
  }
}

// (a picture far finer than it is ever drawn is written at FINEST world px a pixel: most of this map's pictures are 2k
// pictures drawn at a tenth to a twentieth of their size, some 360 MB decoded as they came. The game's characters are
// 0.67 world px a pixel, so a building is written with pixels the size of theirs: the editor's town's buildings are
// 0.375 to 0.5 and the farm's 0.45, but this city has six times their area of buildings to hold)
const FINEST = +(process.env.FINEST ?? 0.67);
const kOf = new Map();
for (const { pl } of placed) { const was = kOf.get(pl.file); if (!was || pl.k > was) kOf.set(pl.file, pl.k); }
const shrink = (file) => { const k = kOf.get(file) ?? 1; return file.includes("#") || k >= FINEST * 0.9 ? 1 : k / FINEST; };
const { sprites, sprite } = spriteWriter(OUT, picture, shrink);

/* ── the walk grid ───────────────────────────────────────────────────────────────────────────────────────────────── */

// "." ground, "~" water, "#" something stands there, "s" a seat (sat on from beside it), "=" the dock's boards, " " none
const walk = map.collision.rows.map((r, ty) => [...r].map((c, tx) => (c === "_" ? " " : c === "#" ? "#" : c === "s" ? "s" : wetTile(tx, ty) ? "~" : ".")));
// the ground's height in steps (0 flat, below 0 sunk), and the stairs: README §11
const height = map.height.map((r) => [...r]);
// the dock: its boards are walked on, over the water, level with the beach (the map has it solid, a thing in the water)
const DOCK = /^dock_2/;
// Its boards are where its picture shows them: the editor's tiles for it (mirrored) lie a tile beside them and run on past
// their end, so that one walked off into the sea (the owner, 2026-11-23: "ตรงนี้เดินออกมาได้เกินที่ตกปลา"). A tile is boards
// where three quarters of it is the picture.
for (const { o, pl } of placed) if (DOCK.test(o.asset)) {
  for (const [x, y] of o.tiles ?? []) if (x >= 0 && y >= 0 && x < COLS && y < ROWS && walk[y][x] === "#") walk[y][x] = wetTile(x, y) ? "~" : ".";
  for (let y = Math.max(0, Math.floor(pl.cy - pl.h / 2) - 1); y <= Math.min(ROWS - 1, Math.ceil(pl.cy + pl.h / 2)); y++)
    for (let x = Math.max(0, Math.floor(pl.cx - pl.w / 2) - 1); x <= Math.min(COLS - 1, Math.ceil(pl.cx + pl.w / 2)); x++) {
      let n = 0;
      for (let a = 0.1; a < 1; a += 0.2) for (let b = 0.1; b < 1; b += 0.2) { const P = toIso(x + a, y + b); if (drawnAt(pl, P.x, P.y)) n++; }
      if (n >= 19) { walk[y][x] = "="; height[y][x] = 0; }
    }
}
const edges = map.collision.edges.map(([x, y, side]) => [x + OX, y + OY, side]);
const blocked = new Set(map.collision.edges.map(([x, y, s]) => `${x},${y},${s}`));
const crosses = (ax, ay, bx, by) => {
  if (bx === ax && by === ay - 1) return blocked.has(`${ax},${ay},n`);
  if (bx === ax && by === ay + 1) return blocked.has(`${bx},${by},n`);
  if (by === ay && bx === ax - 1) return blocked.has(`${ax},${ay},w`);
  if (by === ay && bx === ax + 1) return blocked.has(`${bx},${by},w`);
  return true;
};

/* ── how each thing is drawn ─────────────────────────────────────────────────────────────────────────────────────── */

/**
 * How each thing is drawn among the walkers (lib/town/city-art), as the farm's are:
 * 0 `floor`: on the ground under everybody (the gates' rings);
 * 1 `stand`: back to front with the walkers, by its middle;
 * 2 `wide`: too wide for one place in that order (a building, a stretch of raised or sunk ground), in narrow upright
 *   strips, each as far forward as its footprint's front edge below it (a stretch of ground: its row, README §11);
 * 3 `edge`: a length of fence on a tile's edge, in strips as far forward as its edge's line (README §6's rule for walls);
 * 4 `role`: drawn by the game itself, when what it stands for says (a chest open);
 * 5 `outside`: a room's outside, drawn as a wide thing but for whoever is in it;
 * 6 `inside`: a room's cut-away inside, drawn only for whoever is in it, in strips at its back walls.
 */
const DRAW = { floor: 0, stand: 1, wide: 2, edge: 3, role: 4, outside: 5, inside: 6 };
const STRIP = 12;
const stripDepth = ([bx0, by0, bx1, by1], mid) =>
  mid <= (bx1 - by1) * 32 ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
const edgeDepth = ([x, y, side], mid) => (side === "n" ? mid / 32 + 2 * y : 2 * x - mid / 32);
const howDrawn = ({ o, pl }) => {
  if (o.kind === "wall") return DRAW.edge;
  if (CHEST_OPEN.test(o.asset)) return DRAW.role;
  const room = roomOf(o);
  if (room) return room[1] === "out" ? DRAW.outside : DRAW.inside;
  if (o.kind === "terrain") return DRAW.wide;
  // (the dock, walked on over the sea, and the gates' rings, on the ground: one picture each at its back corner, so that
  // whoever stands on it is over it, and the ground or sea under it behind it, keepEditorOrder below; a ring laid on the
  // floor under everything was covered by the raised ground drawn after it, the owner, 2026-11-23, "วาร์ปโดนบัง", and the
  // dock in strips showed the sea through between them)
  if (o.kind === "ring" || DOCK.test(o.asset)) return DRAW.stand;
  return pl.w + pl.h >= 4 && !TREE.test(o.asset) ? DRAW.wide : DRAW.stand;
};

/**
 * Open ground inside a building's footprint that is reached from in front of it: the museum's stairs up to its door.
 * Whoever stands there is over the building's strips that cross that ground (its treads, the wing behind, the door), not
 * under the building's front edge: the owner, 2026-11-23, of the museum, "ตึกนี้ layer ทับคน". Open ground reached only
 * from behind the building stays behind it. Each strip goes back to just before the backmost such tile it crosses (a
 * walker there is at least its row + 0.98, lib/town Town.tsx).
 */
const laneDepths = (box, left, count) => {
  const x0 = Math.max(0, Math.floor(box[0] + 1e-6)), y0 = Math.max(0, Math.floor(box[1] + 1e-6));
  const x1 = Math.min(COLS, Math.ceil(box[2] - 1e-6)), y1 = Math.min(ROWS, Math.ceil(box[3] - 1e-6));
  const open = (x, y) => x >= x0 && y >= y0 && x < x1 && y < y1 && (walk[y][x] === "." || walk[y][x] === "=");
  const seen = new Set(), lane = [];
  const outside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && (walk[y][x] === "." || walk[y][x] === "=" || walk[y][x] === "s");
  // (from in front: the ground before the footprint's two front sides, one stretch at a time; a stretch that goes through
  // to the ground behind its opposite side is a way through, a gate's: whoever walks it stays under the arch. A corner cut
  // off the footprint, open to a front side and the back side beside it, is not)
  const fronts = [];
  for (let x = x0; x < x1; x++) if (outside(x, y1)) fronts.push([x, y1 - 1, x, y1]);
  for (let y = y0; y < y1; y++) if (outside(x1, y)) fronts.push([x1 - 1, y, x1, y]);
  for (const [sx, sy, fx, fy] of fronts) {
    if (seen.has(`${sx},${sy}`) || !open(sx, sy) || crosses(fx, fy, sx, sy)) continue;
    const queue = [[sx, sy]];
    seen.add(`${sx},${sy}`);
    const side = { x0: false, y0: false, x1: false, y1: false };
    for (let h = 0; h < queue.length; h++) {
      const [x, y] = queue[h];
      if (x === x0 && outside(x - 1, y) && !crosses(x, y, x - 1, y)) side.x0 = true;
      if (y === y0 && outside(x, y - 1) && !crosses(x, y, x, y - 1)) side.y0 = true;
      if (x === x1 - 1 && outside(x1, y) && !crosses(x, y, x1, y)) side.x1 = true;
      if (y === y1 - 1 && outside(x, y1) && !crosses(x, y, x, y1)) side.y1 = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (open(nx, ny) && !seen.has(`${nx},${ny}`) && !crosses(x, y, nx, ny)) { seen.add(`${nx},${ny}`); queue.push([nx, ny]); }
      }
    }
    if (!((side.x1 && side.x0) || (side.y1 && side.y0))) lane.push(...queue);
  }
  const queue = lane;
  if (!queue.length) return null;
  return Array.from({ length: count }, (_, n) => {
    const a = left + n * STRIP, b = a + STRIP;
    let d = Infinity;
    for (const [x, y] of queue) if (32 * (x - y - 1) < b && 32 * (x - y + 1) > a) d = Math.min(d, x + y + 0.97);
    return d;
  });
};

const standing = [];
const flats = new Set(), lanes = [];
for (const t of placed) {
  const { o, pl } = t;
  const s = await sprite(pl.file), sp = sprites[s], [x0, y0, pw] = sp.cut;
  // the cut picture's own top-left, where the whole one's was drawn (mirrored, the cut's left is measured from the right)
  const left = pl.left + (pl.flip ? pw - x0 - sp.w / sp.f : x0) * pl.k, top = pl.top + y0 * pl.k, k = pl.k / sp.f;
  const draw = howDrawn(t), box = [pl.cx - pl.w / 2, pl.cy - pl.h / 2, pl.cx + pl.w / 2, pl.cy + pl.h / 2];
  const d = pl.cx + pl.cy + (o.z ?? 0);
  const u = { o, pl, s, k, draw, box, left, top, w: sp.w * k, h: sp.h * k, d };
  if (draw === DRAW.wide || draw === DRAW.outside) u.strips = Array.from({ length: Math.ceil(u.w / STRIP) }, (_, n) => (o.kind === "terrain" ? d : stripDepth(box, left + n * STRIP + STRIP / 2)));
  if (draw === DRAW.edge) u.strips = Array.from({ length: Math.ceil(u.w / STRIP) }, (_, n) => edgeDepth(o.wall, left + n * STRIP + STRIP / 2));
  if (o.kind === "ring" || DOCK.test(o.asset)) u.d = box[0] + box[1];
  // (a thing that lies flat on the ground (FLATS): the picnic mat, the tulips' drift, the starfish and shells; one picture at its back corner, so that whoever stands on it or beside it is over it, not under it: the
  // owner, 2026-11-23, of the park's picnic mat drawn over him, "ส่วนนี้บังคนเล่น")
  else if (FLATS.test(o.asset)) {
    u.draw = DRAW.stand; u.d = box[0] + box[1]; delete u.strips; flats.add(base(o));
  }
  if (u.draw === DRAW.wide && o.kind !== "terrain") {
    const back = laneDepths(box, left, u.strips.length);
    if (back && back.some((v, n) => v < u.strips[n])) { u.strips = u.strips.map((v, n) => Math.min(v, back[n])); u.stripsMoved = true; lanes.push(base(o)); }
  }

  standing.push(u);
}

/**
 * The editor's order among things that stand still, kept (lib/town/town2's builder, keepEditorOrder): where two pictures
 * overlap and the game's back-to-front order would draw them the other way round from `draw_index`, the one the editor
 * draws first goes back, just far enough. Only what lies low may go back (flowers, bushes), and the strips of a stretch of
 * raised or sunk ground (the editor draws the ground before whatever stands on it: the park's fountain stands over the
 * park's floor in front of its middle). Going back only ever shows more of whoever walks there. What would need anything
 * else moved is counted and listed (`stuck`).
 */
function keepEditorOrder(all) {
  const CELL = 3, cells = new Map(), mine = all.map(() => []);
  const ordered = (t) => t.draw !== DRAW.floor && t.draw !== DRAW.role && t.draw !== DRAW.inside;
  all.forEach((t, i) => {
    if (!ordered(t)) return;
    const { pl } = t, W = pl.p.pw * pl.k, H = pl.p.ph * pl.k;
    for (let iy = Math.floor(pl.top / CELL) * CELL; iy < pl.top + H; iy += CELL) for (let ix = Math.floor(pl.left / CELL) * CELL; ix < pl.left + W; ix += CELL) {
      if (!drawnAt(pl, ix + CELL / 2, iy + CELL / 2)) continue;
      const key = `${ix},${iy}`;
      let at = cells.get(key);
      if (!at) cells.set(key, (at = { ix: ix + CELL / 2, things: [] }));
      at.things.push(i);
      mine[i].push(at);
    }
  });
  const placeAt = (t, ix) => (t.strips ? t.strips[Math.max(0, Math.min(t.strips.length - 1, Math.floor((ix - t.left) / STRIP)))] : t.d);
  // (and a wide thing's strips under a small thing the editor draws over it: a bench on the fountain's stone square, the
  // owner, 2026-11-23, "layer ก้อนอิฐบัคเข้ามาในเก้าอี้". Not a fence's, nor a room's: whoever stands behind either is behind it)
  const movable = (t, b) => t.o.kind === "terrain" || (t.draw === DRAW.stand && LOW.test(t.o.asset)) || (t.draw === DRAW.wide && b.draw === DRAW.stand);
  const moved = [], stuck = new Map();
  for (const i of all.map((_, n) => n).sort((a, b) => all[b].o.draw_index - all[a].o.draw_index)) {
    const t = all[i];
    if (!ordered(t)) continue;
    const was = t.d, wasStrips = t.strips?.slice();
    for (const { ix, things } of mine[i]) for (const j of things) {
      const b = all[j];
      if (j === i || b.o.draw_index <= t.o.draw_index) continue;
      const limit = placeAt(b, ix) - 0.001;
      if (placeAt(t, ix) <= limit) continue;
      if (!movable(t, b)) { const key = `${base(t.o)} under ${base(b.o)}`; stuck.set(key, (stuck.get(key) ?? 0) + 1); continue; }
      if (t.strips) { const n = Math.floor((ix - t.left) / STRIP); if (t.strips[n] > limit) t.strips[n] = limit; }
      else if (t.d > limit) t.d = limit;
    }
    if (t.d < was) moved.push(t.o.id);
    if (t.strips && t.strips.some((v, n) => v < wasStrips[n])) { t.stripsMoved = true; moved.push(t.o.id); }
  }
  return { moved, stuck };
}
console.log(`lying flat, under whoever stands on them: ${[...flats].join(", ")}`);
console.log(`water cut out of the ground's pictures: ${waterCut} pixels`);
console.log(`open ground walked inside their footprints: ${lanes.join(", ") || "none"}`);
const { moved, stuck } = keepEditorOrder(standing);

/* ── written as the game reads them ──────────────────────────────────────────────────────────────────────────────── */

const names = [], nameOf = (n) => { let i = names.indexOf(n); if (i < 0) i = names.push(n) - 1; return i; };
const objects = [], rings = {}, strips = {}, walls = {}, lifts = {};
const indexOf = new Map();
const D = OX + OY;
for (const t of standing) {
  const { o, pl, s, k, draw, box } = t;
  indexOf.set(o.id, objects.length);
  // [name, picture, left, top, scale, mirrored, how drawn, order, footprint x0 y0 x1 y1]
  objects.push([nameOf(base(o)), s, r2(t.left + ISO.x), r2(t.top + ISO.y), +k.toFixed(5), pl.flip ? 1 : 0, draw, r3(t.d + D),
    r3(box[0] + OX), r3(box[1] + OY), r3(box[2] + OX), r3(box[3] + OY)]);
  const n = objects.length - 1;
  // (a wide thing's strips: written for a stretch of ground and wherever the editor's order has moved any from the
  // footprint's front edge; a fence's are its edge's)
  if (t.strips && (o.kind === "terrain" || t.stripsMoved)) strips[n] = t.strips.map((v) => r3(v + D));
  if (draw === DRAW.edge) walls[n] = G(o.wall).concat(o.wall[2]);
  if (o.lift) lifts[n] = o.lift;
  if (pl.a.sink) rings[n] = pl.a.sink.lines.map(([x, y, , size]) =>
    [r2(pl.left + (pl.flip ? pl.p.pw - x : x) * pl.k + ISO.x), r2(pl.top + y * pl.k + ISO.y), String(size)]);
}
const idx = (o) => indexOf.get(o.id);
const byAsset = (re) => map.objects.filter((o) => re.test(o.asset) && indexOf.has(o.id));
const centre = (o) => { const w = o.w ?? 1, h = o.h ?? 1; const [cx, cy] = o.at ?? [o.x + w / 2, o.y + h / 2]; return [r2(cx + OX), r2(cy + OY)]; };

/* ── the roles the builder can read off the map ──────────────────────────────────────────────────────────────────── */

const rooms = ROOMS.map((r) => {
  const out = map.objects.find((o) => o.asset.startsWith(r.out)), inside = map.objects.find((o) => o.asset.startsWith(r.in));
  if (!out || !inside) throw new Error(`room ${r.name}: no pictures`);
  const [x0, y0, x1, y1] = [Math.round(out.x), Math.round(out.y), Math.round(out.x + out.w), Math.round(out.y + out.h)];
  // its doorways: the tiles of its footprint's edge whose step out is not a wall
  const doors = [];
  for (let x = x0; x < x1; x++) for (const [y, oy] of [[y1 - 1, y1], [y0, y0 - 1]]) if (!crosses(x, y, x, oy) && walk[y][x] !== "#" && walk[oy]?.[x] !== "#") doors.push({ inside: G([x, y]), outside: G([x, oy]) });
  for (let y = y0; y < y1; y++) for (const [x, ox] of [[x1 - 1, x1], [x0, x0 - 1]]) if (!crosses(x, y, ox, y) && walk[y][x] !== "#" && walk[y]?.[ox] !== "#") doors.push({ inside: G([x, y]), outside: G([ox, y]) });
  return { name: r.name, out: idx(out), in: idx(inside), box: [x0 + OX, y0 + OY, x1 + OX, y1 + OY], doors };
});
const chests = byAsset(CHEST_SHUT).map((o) => {
  const open = map.objects.find((q) => CHEST_OPEN.test(q.asset) && Math.abs(centre(q)[0] - centre(o)[0]) < 0.5 && Math.abs(centre(q)[1] - centre(o)[1]) < 0.5);
  return { at: centre(o), tiles: (o.tiles ?? []).map(G), shut: idx(o), open: open ? idx(open) : null };
});
/** Where a lamp's light is: its picture's top eighth's middle, isometric pixels. */
const lamps = byAsset(LAMP).map((o) => { const q = objects[idx(o)], sp = sprites[q[1]]; return { tile: G(o.tiles?.[0] ?? [Math.floor(o.x), Math.floor(o.y)]), thing: idx(o), head: [r2(q[2] + (sp.w * q[4]) / 2), r2(q[3] + sp.h * q[4] * 0.12)] }; });
const benches = map.objects.filter((o) => o.sit?.length && indexOf.has(o.id)).map((o) => ({
  thing: idx(o),
  seats: o.sit.map((s) => ({ tile: G(s.tile), facing: s.facing, point: [r2(s.point[0] + ISO.x), r2(s.point[1] + ISO.y)], lift: s.lift ?? 0, view: s.view, mirror: !!s.mirror, draw: s.draw })),
}));
const ringObjs = byAsset(/^game_ring$/).map((o) => ({ thing: idx(o), centre: centre(o) }));

/* ── what can be walked to ───────────────────────────────────────────────────────────────────────────────────────── */

const open = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && (walk[y][x] === "." || walk[y][x] === "=");
const reach = (() => {
  const fountain = map.objects.find((o) => /potato_park_fountain/.test(o.asset));
  const sx = Math.floor(fountain.x) - 1, sy = Math.floor(fountain.y) - 1;
  if (!open(sx, sy)) throw new Error(`the start by the fountain ${sx},${sy} is "${walk[sy][sx]}"`);
  const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (seen.has(key) || !open(nx, ny) || crosses(x, y, nx, ny)) continue;
      seen.add(key); q.push([nx, ny]);
    }
  }
  return seen;
})();
const unreached = [];
for (const r of rooms) for (const dd of r.doors) if (!reach.has(`${dd.outside[0] - OX},${dd.outside[1] - OY}`)) unreached.push(`${r.name} door ${dd.outside}`);
for (const c of chests) if (!c.tiles.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(`${x - OX + dx},${y - OY + dy}`)))) unreached.push(`chest ${c.at}`);
for (const g of ringObjs) { const [cx, cy] = g.centre; if (!reach.has(`${Math.floor(cx - OX)},${Math.floor(cy - OY)}`)) unreached.push(`ring ${g.centre}`); }
if (unreached.length) console.warn(`NOT reached from the park: ${unreached.join("; ")}`);
// (ground nobody can walk to is closed: a tap there is refused at once, rather than looked for over the whole city)
let shut = 0;
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (walk[y][x] === "." && !reach.has(`${x},${y}`)) { walk[y][x] = "#"; shut++; }

/* ── the ripples, the fences' shadows, the ground's pictures ─────────────────────────────────────────────────────── */

const ripples = { frames: map.ripples?.frames ?? 2, fps: map.ripples?.fps ?? 1, src: "", sizes: {} };
{
  const ps = [];
  for (const [size, r] of Object.entries(map.ripples?.sizes ?? {})) for (const side of ["back", "front"]) ps.push({ size, side, r, file: path.join(SRC, r[side]) });
  let y = 0, W = 0;
  for (const p of ps) { const m = await sharp(p.file).metadata(); p.w = m.width; p.h = m.height; p.y = y; y += m.height; W = Math.max(W, m.width); }
  const sheet = await sharp({ create: { width: Math.max(1, W), height: Math.max(1, y), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(ps.map((p) => ({ input: p.file, left: 0, top: p.y }))).webp({ lossless: true }).toBuffer();
  ripples.src = `ripples-${crypto.createHash("sha1").update(sheet).digest("hex").slice(0, 10)}.webp`;
  fs.writeFileSync(path.join(OUT, ripples.src), sheet);
  for (const p of ps) { const at = (ripples.sizes[p.size] ??= { frame: p.r.frame_size, centre: p.r.centre }); at[p.side] = [0, p.y, p.w, p.h]; }
}
// the fences' shadows (README §8): one picture the size of the map, cut into squares, only those with a shadow on them
const shadows = [];
if (map.shadows?.file) {
  const SQ = 512, { data, info } = await sharp(path.join(SRC, map.shadows.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y += SQ) for (let x = 0; x < info.width; x += SQ) {
    const w = Math.min(SQ, info.width - x), h = Math.min(SQ, info.height - y);
    let any = false;
    for (let j = 0; j < h && !any; j++) for (let i = 0; i < w; i++) if (data[((y + j) * info.width + x + i) * 4 + 3] > 3) { any = true; break; }
    if (!any) continue;
    const buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left: x, top: y, width: w, height: h }).webp({ lossless: true }).toBuffer();
    const src = `shadow-${crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10)}.webp`;
    fs.writeFileSync(path.join(OUT, src), buf);
    shadows.push([r2(map.shadows.origin[0] + x + ISO.x), r2(map.shadows.origin[1] + y + ISO.y), w, h, src]);
  }
}
const textures = {};
for (const [name, t] of Object.entries(map.ground_textures)) {
  const v = t.variants?.[0] ?? t;
  if (!v.file) continue;
  const buf = await sharp(path.join(SRC, v.file)).png().toBuffer();
  const file = `ground-${name.replace(/_/g, "-")}-${crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10)}.png`;
  fs.writeFileSync(path.join(OUT, file), buf);
  textures[name] = { src: file, perTile: v.texels_per_tile ?? 32 };
}

/* ── written ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const out = {
  v: 1, cols: COLS, rows: ROWS, origin: [OX, OY], from: `${path.basename(SRC)}, exported ${map.exported}`,
  legend: map.ground_legend, textures, wobble: { all: map.ground_edges?.wobble ?? 0.35, kinds: map.ground_edges?.kinds ?? {} },
  ground: map.ground, fine: fineRows,
  walk: walk.map((r) => r.join("")),
  // each tile's height in steps, a letter: "K" is 0, a letter before it a step down
  height: height.map((r) => r.map((h) => String.fromCharCode(75 + h)).join("")),
  terrain: { step: map.terrain?.step ?? 9, walk: map.terrain?.walk ?? 1, soft: map.terrain?.soft ?? 2 },
  stairs: (map.stairs ?? []).map(([x, y, way, rise, ramp]) => [x + OX, y + OY, way, rise, ...(ramp ? [ramp] : [])]),
  edges,
  sprites: sprites.map(({ src, w, h }) => [src, w, h]),
  names, objects, rings, strips, walls, lifts, ripples, shadows,
  roles: { rooms, chests, lamps, benches, rings: ringObjs },
};
fs.writeFileSync(JSON_OUT, JSON.stringify(out));
const count = (c) => out.walk.join("").split(c).length - 1;
console.log(`city: ${objects.length} things, ${sprites.length} pictures, ${(fs.statSync(JSON_OUT).size / 1024).toFixed(0)} KB of map;`,
  `tiles: ground ${count(".")}, water ${count("~")}, closed ${count("#")} (${shut} nobody can walk to), seats ${count("s")}, boards ${count("=")}; edges ${edges.length}; walked to ${reach.size}`);
console.log(`roles: rooms ${rooms.map((r) => `${r.name} (${r.doors.length} doorway tiles)`).join(", ")}; chests ${chests.length}; lamps ${lamps.length}; benches ${benches.length} (${benches.reduce((n, b) => n + b.seats.length, 0)} seats); rings ${ringObjs.length}; shadow squares ${shadows.length}`);
console.log(`editor's order kept: ${moved.length} moved back; stuck (would need a tall thing moved): ${[...stuck.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ×${n}`).join("; ") || "none"}`);
const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0), decoded = sprites.reduce((n, s) => n + s.w * s.h * 4, 0);
console.log(`pictures: ${(bytes / 1e6).toFixed(1)} MB on disk, ${(decoded / 1e6).toFixed(0)} MB decoded if all were held at once (FINEST ${FINEST})`);

/* ── a look at the rules ─────────────────────────────────────────────────────────────────────────────────────────── */

for (const [ci, crop] of (CROP ? CROP.split(";") : [""]).entries()) if (DEBUG) {
  const CROP = crop, DEBUG_TO = CROP ? DEBUG.replace(/.png$/, `-${ci}.png`) : DEBUG;
  const Q = +(process.env.Q ?? (CROP ? 1 : 0.25));
  const [cx0, cy0, cx1, cy1] = CROP ? CROP.split(",").map(Number) : [0, 0, COLS, ROWS];
  // the view in the map's isometric pixels
  const vx0 = toIso(cx0, cy1).x - 64, vx1 = toIso(cx1, cy0).x + 64, vy0 = toIso(cx0, cy0).y - 900, vy1 = toIso(cx1, cy1).y + 100;
  const W = Math.ceil((vx1 - vx0) * Q), H = Math.ceil((vy1 - vy0) * Q);
  const order = standing.filter((t) => t.draw !== DRAW.role && t.draw !== DRAW.inside).sort((a, b) => a.o.draw_index - b.o.draw_index);
  const comps = [];
  for (const t of order) {
    const sp = sprites[t.s], w = Math.max(1, Math.round(t.w * Q)), h = Math.max(1, Math.round(t.h * Q));
    const left = Math.round((t.left - vx0) * Q), top = Math.round((t.top - vy0) * Q);
    if (left + w <= 0 || top + h <= 0 || left >= W || top >= H) continue;
    let img = sharp(path.join(OUT, sp.src)); if (t.pl.flip) img = img.flop();
    const buf = await img.resize(w, h, { kernel: "nearest" }).png().toBuffer();
    const ex0 = Math.max(0, -left), ey0 = Math.max(0, -top), cw = Math.min(w, W - left) - ex0, ch = Math.min(h, H - top) - ey0;
    if (cw <= 0 || ch <= 0) continue;
    comps.push({ input: cw === w && ch === h ? buf : await sharp(buf).extract({ left: ex0, top: ey0, width: cw, height: ch }).png().toBuffer(), left: left + ex0, top: top + ey0 });
  }
  const tint = { "~": "rgba(40,120,255,0.30)", "#": "rgba(255,40,40,0.40)", s: "rgba(255,0,200,0.5)", "=": "rgba(255,220,0,0.45)", " ": "rgba(0,0,0,0.6)" };
  const lift = (x, y) => (height[y]?.[x] ?? 0) * 9;
  const P = (a, b, up = 0) => { const p = toIso(a, b); return `${((p.x - vx0) * Q).toFixed(1)},${((p.y - up - vy0) * Q).toFixed(1)}`; };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) {
    const c = walk[y][x], up = lift(x, y);
    const fill = tint[c] ?? (height[y][x] < 0 ? "rgba(0,255,140,0.10)" : "rgba(0,0,0,0)");
    svg += `<polygon points="${P(x, y, up)} ${P(x + 1, y, up)} ${P(x + 1, y + 1, up)} ${P(x, y + 1, up)}" fill="${fill}" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>`;
  }
  for (const [x, y, s] of map.collision.edges) {
    if (x < cx0 - 1 || x > cx1 + 1 || y < cy0 - 1 || y > cy1 + 1) continue;
    const a = s === "n" ? [x + 1, y] : [x, y + 1], up = Math.max(lift(x, y), lift(s === "n" ? x : x - 1, s === "n" ? y - 1 : y));
    svg += `<line x1="${P(x, y, up).split(",")[0]}" y1="${P(x, y, up).split(",")[1]}" x2="${P(a[0], a[1], up).split(",")[0]}" y2="${P(a[0], a[1], up).split(",")[1]}" stroke="yellow" stroke-width="${CROP ? 2 : 1}"/>`;
  }
  for (const r of rooms) for (const dd of r.doors) { const [x, y] = [dd.inside[0] - OX, dd.inside[1] - OY]; svg += `<circle cx="${P(x + 0.5, y + 0.5).split(",")[0]}" cy="${P(x + 0.5, y + 0.5).split(",")[1]}" r="${CROP ? 6 : 2}" fill="#0f0"/>`; }
  if (CROP) for (let y = cy0; y < cy1; y += 2) for (let x = cx0; x < cx1; x += 2) svg += `<text x="${P(x + 0.5, y + 0.5).split(",")[0]}" y="${P(x + 0.5, y + 0.5).split(",")[1]}" font-size="9" fill="white" text-anchor="middle">${x},${y}</text>`;
  svg += "</svg>";
  const baseImg = await sharp({ create: { width: W, height: H, channels: 4, background: "#14171d" } }).composite(comps).png().toBuffer();
  await sharp(baseImg).composite([{ input: Buffer.from(svg) }]).png().toFile(DEBUG_TO);
  console.log("debug picture:", DEBUG_TO, `${W}x${H}`);
}
