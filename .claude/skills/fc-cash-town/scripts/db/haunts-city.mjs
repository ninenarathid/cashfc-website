// The insects' haunts of the city (lib/town/city, 2026-11-23), laid once and kept (lib/town/haunts-city.json), as the
// editor's town's were (haunts-town2.json, v295) and the editor's farm's (haunts-farm2.json): every haunt the town has
// keeps its number and its kind (23: eight of blooms, seven of lamps, five of water, three of petals) and is given a place
// in the city by what its kind is: blooms among the city's flowers (the park's beds, the tulip drifts, the irises and
// bellflowers), a lamp's at one of its 66 street lamps, water on a bank of the canal or the sea, petals under the trees
// of the park and the avenues. Kept from then on, so that a new export with a flower moved a little does not send every
// insect in the city somewhere else.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/haunts-city.mjs
import { writeFileSync, readFileSync } from "node:fs";

const REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
process.env.FC_REPO = REPO;
process.env.TOWN_MAP = "city";
process.env.FARM_MAP = "farm2";
await import("./repo-ts-town.mjs");
const W = await import("@/lib/town/world");
const C = await import("@/lib/town/city");
if (!W.CITY) throw new Error("not the city");
const CLASSIC = JSON.parse(readFileSync(`${REPO}/lib/town/haunts-classic.json`, "utf8"));
const town = CLASSIC.filter((h) => h.place === "town");

let a = 20261123;
const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// what can be walked to in the city, from beside the park's fountain
const open = new Set();
{
  const first = [W.FOUNTAIN.x - 1, W.FOUNTAIN.y - 1], q = [first];
  if (!W.walkable(first[0], first[1])) throw new Error(`the start ${first} is not walked on`);
  open.add(first.join(","));
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!open.has(k) && W.placeOf(nx, ny) === "town" && W.walkable(nx, ny) && !C.t2OverWall(x, y, nx, ny)) { open.add(k); q.push([nx, ny]); }
    }
  }
}
const stands = (x, y) => open.has(`${x},${y}`) && !C.t2RoomAt(x, y);
const by = (p) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (stands(Math.floor(p.x) + dx, Math.floor(p.y) + dy)) return true; return false; };
const wet = (x, y) => W.groundAt(x, y) === "water";
const shore = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => wet(x + dx, y + dy));
const far = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const out = [];
const clear = (x, y, apart) => out.every((h) => Math.hypot(h.x - x - 0.5, h.y - y - 0.5) >= apart);
const about = (x, y, kind, n = 5, reach = 2.4) => {
  const c = { x: x + 0.5, y: y + 0.5 }, ps = [];
  for (let tries = 0; ps.length < n && tries < 120; tries++) {
    const ang = rnd() * Math.PI * 2, r = 0.8 + rnd() * (reach - 0.8), p = { x: Math.round((c.x + Math.cos(ang) * r) * 100) / 100, y: Math.round((c.y + Math.sin(ang) * r) * 100) / 100 };
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    if (W.placeOf(tx, ty) !== "town" || !by(p) || (kind !== "water" && wet(tx, ty)) || ps.some((q) => far(p, q) < 1)) continue;
    ps.push(p);
  }
  return ps.sort((p, q) => Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(q.y - c.y, q.x - c.x));
};
const near = (kinds, reach) => {
  const ps = C.T2_PROPS.filter((p) => kinds.includes(p.kind));
  const all = [];
  for (const k of open) {
    const [x, y] = k.split(",").map(Number);
    if (!stands(x, y)) continue;
    if (ps.some((p) => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= reach)) all.push([x, y]);
  }
  return all;
};
const KIND = {
  blooms: near(["flowers"], 1),
  lamp: near(["lamp"], 1),
  water: [...open].map((k) => k.split(",").map(Number)).filter(([x, y]) => stands(x, y) && shore(x, y)),
  petals: near(["tree"], 1),
};
const APART = { blooms: 7, lamp: 9, water: 10, petals: 8 };
for (const h of town) {
  const list = KIND[h.kind];
  if (!list?.length) throw new Error(`no place for a town haunt of kind ${h.kind}`);
  let put = false;
  for (let tries = 0; tries < 6000 && !put; tries++) {
    const [x, y] = list[Math.floor(rnd() * list.length)];
    if (!clear(x, y, APART[h.kind])) continue;
    const ps = about(x, y, h.kind);
    if (ps.length < 4) continue;
    out.push({ id: h.id, x: x + 0.5, y: y + 0.5, perches: ps });
    put = true;
  }
  if (!put) throw new Error(`no place for haunt ${h.id} (${h.kind})`);
}
writeFileSync(`${REPO}/lib/town/haunts-city.json`, JSON.stringify(out.sort((p, q) => p.id - q.id)));
const counts = {};
for (const h of town) counts[h.kind] = (counts[h.kind] ?? 0) + 1;
console.log(`haunts-city: ${out.length} of the town's ${town.length} (${JSON.stringify(counts)}); candidates ${JSON.stringify(Object.fromEntries(Object.entries(KIND).map(([k, v]) => [k, v.length])))}`);
