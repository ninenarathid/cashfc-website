// The editor's town as built (lib/town/town2-map.json) against the export it was built from: every pair of things that
// stand still whose pictures overlap and which the game draws the other way round from the editor's `draw_index`. Each
// such pair should be one meant so (build-town2's keepEditorOrder says which: a tree is not moved, what lies on the floor
// stays there). Run it after every new export, and look at what it lists.
//   node town2-order.mjs [--src <export dir>] [--json <file>]
import fs from "node:fs";
import path from "node:path";
import { REPO, exportReader } from "../editor-export.mjs";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const SRC = arg("--src", "E:/NinenineProject/fcnext/.claude/skills/fc-cash-town/scripts/pixel/work/oato-v3");
const MAP = JSON.parse(fs.readFileSync(arg("--json", path.join(REPO, "lib/town/town2-map.json")), "utf8"));
const map = JSON.parse(fs.readFileSync(path.join(SRC, "map.json"), "utf8"));
const { placeOf, opaque } = exportReader(SRC, map);

const STRIP = 12, CELL = 3;
const stripDepth = ([bx0, by0, bx1, by1], mid) =>
  mid <= (bx1 - by1) * 32 ? Math.min(bx1, Math.max(bx0, mid / 32 + by1)) + by1 : bx1 + Math.min(by1, Math.max(by0, bx1 - mid / 32));
const stageAt = MAP.objects.findIndex((o) => /^oval_wooden_festival_stage/.test(MAP.names[o[0]]));

const things = [];
// (the things the builder adds to the export come after the export's own, so the first of `objects` are the export's, in order)
for (const [i, o] of map.objects.entries()) {
  const m = MAP.objects[i], pl = await placeOf(o);
  things.push({ i, o, pl, how: m[6], d: m[7], left: m[2], box: m.slice(8, 12), strips: MAP.strips[i] });
}
const [bx0, by0, bx1, by1] = things[stageAt].box, sx = (bx0 + bx1) / 2, sy = (by0 + by1) / 2, sr = (bx1 - bx0 + by1 - by0) / 4;
const placeAt = (t, ix) => {
  if (t.i === stageAt) return sx + sy - Math.sqrt(Math.max(0, 2 * sr * sr - (ix / 32 - (sx - sy)) ** 2));
  if (t.how !== 2) return t.d;
  return t.strips?.[Math.floor((ix - t.left) / STRIP)] ?? stripDepth(t.box, t.left + Math.floor((ix - t.left) / STRIP) * STRIP + STRIP / 2);
};

const cells = new Map();
for (const t of things) {
  const { pl } = t, W = pl.p.pw * pl.k, H = pl.p.ph * pl.k;
  for (let iy = Math.floor(pl.top / CELL) * CELL; iy < pl.top + H; iy += CELL) for (let ix = Math.floor(pl.left / CELL) * CELL; ix < pl.left + W; ix += CELL) {
    let px = (ix + CELL / 2 - pl.left) / pl.k;
    const py = (iy + CELL / 2 - pl.top) / pl.k;
    if (pl.flip) px = pl.p.pw - 1 - px;
    if (!opaque(pl.p, px, py)) continue;
    const k = `${ix},${iy}`;
    let at = cells.get(k);
    if (!at) cells.set(k, (at = { ix: ix + CELL / 2, list: [] }));
    at.list.push(t);
  }
}
const pairs = new Map();
for (const { ix, list } of cells.values()) {
  if (list.length < 2) continue;
  list.sort((a, b) => a.o.draw_index - b.o.draw_index);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const A = list[i], B = list[j];
    // (the game: what lies on the floor first, then back to front)
    const first = (A.how === 0) !== (B.how === 0) ? A.how === 0 : placeAt(A, ix) <= placeAt(B, ix);
    if (first) continue;
    const key = `${A.o.id} < ${B.o.id}`, p = pairs.get(key) ?? { A, B, n: 0 };
    p.n++;
    pairs.set(key, p);
  }
}
const name = (t) => `${t.o.asset.replace(/~.*$/, "").slice(0, 34)} (${t.o.layer}) at ${t.pl.cx.toFixed(1)},${t.pl.cy.toFixed(1)}`;
const rows = [...pairs.values()].sort((a, b) => b.n - a.n);
console.log(`${rows.length} pairs drawn the other way round from the editor:`);
for (const p of rows) console.log(`${String(p.n * CELL * CELL).padStart(6)} px  ${name(p.A)}  under  ${name(p.B)}`);
