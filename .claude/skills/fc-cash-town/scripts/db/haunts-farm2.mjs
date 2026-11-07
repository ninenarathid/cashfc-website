// The insects' haunts of the editor's farm (lib/town/farm2, 2026-11-07), laid once and kept (lib/town/haunts-farm2.json),
// as the editor's town's were (haunts-town2.json, v295): every haunt the old farm had keeps its number and its kind and is
// given a place in the editor's farm by the same rule its kind was laid by on the old one (lib/town/insects): a field's on
// open grass away from the wells, the water's by the duck pond, petals and duff at a bed's verge, leaves by a bush or a
// tree, posts by a fence; a good garden's over its own bed, its perches round the bed's middle, as the code lays them.
// Kept from then on, so that a new export with a bush moved a little does not send every insect elsewhere.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/haunts-farm2.mjs
import { writeFileSync, readFileSync } from "node:fs";

// (the tree, with forward slashes: the loader of its TypeScript compares paths so)
const REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
process.env.FC_REPO = REPO;
process.env.FARM_MAP = "farm2";
process.env.TOWN_MAP = "town2";
await import("./repo-ts-town.mjs");
const W = await import("@/lib/town/world");
const F = await import("@/lib/town/farm2");
if (!W.F2) throw new Error("not the editor's farm");
const CLASSIC = JSON.parse(readFileSync(`${REPO}/lib/town/haunts-classic.json`, "utf8"));
const farm = CLASSIC.filter((h) => h.place === "farm");

let a = 20261107;
const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// what can be walked to on the farm, from where its first gate puts somebody
const open = new Set();
{
  const to = W.GATES.find((g) => g.leads === "farm").to, first = [Math.floor(to.x), Math.floor(to.y)], q = [first];
  open.add(first.join(","));
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!open.has(k) && W.placeOf(nx, ny) === "farm" && W.walkable(nx, ny) && !F.f2OverEdge(x, y, nx, ny)) { open.add(k); q.push([nx, ny]); }
    }
  }
}
const stands = (x, y) => open.has(`${x},${y}`);
const by = (p) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (stands(Math.floor(p.x) + dx, Math.floor(p.y) + dy)) return true; return false; };
const wet = (x, y) => W.groundAt(x, y) === "water";
const shore = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => wet(x + dx, y + dy));
const far = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const out = [];
const others = CLASSIC.filter((h) => h.place !== "farm");
const clear = (x, y, apart) => out.every((h) => Math.hypot(h.x - x - 0.5, h.y - y - 0.5) >= apart);
const about = (x, y, kind, n = 5, reach = 2.4) => {
  const c = { x: x + 0.5, y: y + 0.5 }, ps = [];
  for (let tries = 0; ps.length < n && tries < 90; tries++) {
    const ang = rnd() * Math.PI * 2, r = 0.8 + rnd() * (reach - 0.8), p = { x: Math.round((c.x + Math.cos(ang) * r) * 100) / 100, y: Math.round((c.y + Math.sin(ang) * r) * 100) / 100 };
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    if (W.placeOf(tx, ty) !== "farm" || !by(p) || (kind !== "water" && wet(tx, ty)) || ps.some((q) => far(p, q) < 1)) continue;
    ps.push(p);
  }
  return ps.sort((p, q) => Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(q.y - c.y, q.x - c.x));
};
const R = W.FARM;
const tiles = (fits) => { const all = []; for (let y = R.y + 1; y < R.y + R.h - 1; y++) for (let x = R.x + 1; x < R.x + R.w - 1; x++) if (fits(x, y)) all.push([x, y]); return all; };
const verge = (x, y) => stands(x, y) && !W.plotAt(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => W.plotAt(x + dx, y + dy));
const fenced = (x, y) => stands(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => F.f2OverEdge(x, y, x + dx, y + dy));
const leafy = (x, y) => stands(x, y) && W.groundAt(x, y) === "grass" && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => F.f2Tile(x + dx, y + dy) === "#");
const KIND = {
  field: tiles((x, y) => stands(x, y) && !W.plotAt(x, y) && W.groundAt(x, y) === "grass" && W.WELLS.every((w) => Math.hypot(x - w.x, y - w.y) > 4)),
  water: tiles((x, y) => stands(x, y) && shore(x, y)),
  petals: tiles(verge), duff: tiles(verge), leaves: tiles(leafy), posts: tiles(fenced),
};
const APART = { field: 6, water: 8, petals: 6, duff: 6, leaves: 6, posts: 6 };
const gardens = farm.filter((h) => h.kind === "garden").sort((p, q) => p.id - q.id);
for (const h of farm) {
  if (h.kind === "garden") {
    const bed = gardens.indexOf(h), [bx, by_] = W.bedCorner(bed);
    out.push({ id: h.id, x: bx + 3.5, y: by_ + 3.5, perches: [[1.5, 1.5], [3.5, 1], [5.5, 1.5], [6, 3.5], [5.5, 5.5], [3.5, 6], [1.5, 5.5], [1, 3.5]].map(([u, v]) => ({ x: bx + u, y: by_ + v })) });
    continue;
  }
  const list = KIND[h.kind];
  if (!list) throw new Error(`no rule for a farm haunt of kind ${h.kind}`);
  let put = false;
  for (let tries = 0; tries < 4000 && !put; tries++) {
    const [x, y] = list[Math.floor(rnd() * list.length)];
    if (!clear(x, y, APART[h.kind])) continue;
    const ps = about(x, y, h.kind);
    if (ps.length < 4) continue;
    out.push({ id: h.id, x: x + 0.5, y: y + 0.5, perches: ps });
    put = true;
  }
  if (!put) throw new Error(`no place for haunt ${h.id} (${h.kind})`);
}
writeFileSync(`${REPO}/lib/town/haunts-farm2.json`, JSON.stringify(out.sort((p, q) => p.id - q.id)));
const counts = {};
for (const h of farm) counts[h.kind] = (counts[h.kind] ?? 0) + 1;
console.log(`haunts-farm2: ${out.length} of the farm's ${farm.length} (${JSON.stringify(counts)}); others kept: ${others.length}`);
