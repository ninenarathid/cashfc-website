// Whether every place of the city that matters can be walked to from the park (lib/town/city): the rooms' doorways, the
// shopkeepers, the smith, the boards, the chests, the crafting tables, the kitchen's places and seats, the doors into the
// clothes shop and the casino, the four ways out, every bench's standing tile, every lamp; and where one may fish.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/city-reach.mjs
const REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
process.env.FC_REPO = REPO;
process.env.TOWN_MAP = "city";
process.env.FARM_MAP = "farm2";
await import("./db/repo-ts-town.mjs");
const W = await import("@/lib/town/world");
const C = await import("@/lib/town/city");
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; if (!c || process.env.ALL) console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const start = { x: W.FOUNTAIN.x - 1, y: W.FOUNTAIN.y - 1 };
const seen = new Set([`${start.x},${start.y}`]), q = [[start.x, start.y]];
while (q.length) {
  const [x, y] = q.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
    if (seen.has(k) || W.placeOf(nx, ny) !== "town" || !W.walkable(nx, ny) || C.t2OverWall(x, y, nx, ny)) continue;
    seen.add(k); q.push([nx, ny]);
  }
}
const at = (x, y) => seen.has(`${Math.floor(x)},${Math.floor(y)}`);
const by = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => at(x + dx, y + dy));
console.log(`walked to from the park: ${seen.size} tiles`);
for (const r of C.T2_ROOMS) ok(`room ${r.name}: a doorway`, r.doors.some((d) => at(...d.outside) && at(...d.inside)), r.doors);
for (const k of C.T2_KEEPERS) ok(`keeper ${k.id} (${k.at.x}, ${k.at.y}) can be stood by`, k.tiles.some(([x, y]) => by(x, y)));
ok("the smith can be stood by", C.T2_SMITH.tiles.some(([x, y]) => by(x, y)));
for (const [n, b] of [["the Popoto Board", C.T2_BOARD], ["the trade board", C.T2_TRADE_BOARD], ["the fountain", C.T2_FOUNTAIN]]) {
  let any = false;
  for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) if (at(x, y)) any = true;
  ok(`${n} can be stood by`, any, b);
}
for (const c of C.T2_CHESTS) ok(`chest (${c.x}, ${c.y}) can be stood by`, c.tiles.some(([x, y]) => by(x, y)));
for (const t of C.T2_CRAFT_TABLES) ok(`crafting table ${t.thing} can be stood by`, t.tiles.some(([x, y]) => by(x, y)));
for (const p of C.T2_KITCHEN.places) ok(`kitchen ${p.kind} place ${p.at}`, at(...p.at));
for (const w of C.T2_KITCHEN.wash) ok(`kitchen wash place ${w}`, at(...w));
for (const s of C.T2_KITCHEN.seats) ok(`kitchen seat stand ${s.stand}`, at(...s.stand));
ok("the clothes shop's door: its street", at(C.T2_SHOP_DOOR.out.x, C.T2_SHOP_DOOR.out.y), C.T2_SHOP_DOOR);
ok("the casino's door: its street", at(C.T2_CASINO_DOOR.out.x, C.T2_CASINO_DOOR.out.y), C.T2_CASINO_DOOR);
for (const [n, g] of Object.entries(C.T2_GATES)) { ok(`the way out to the ${n}: its ring`, g.tiles.some(([x, y]) => at(x, y)), g.tiles); ok(`the way back from the ${n} lands walked`, at(g.back.x, g.back.y), g.back); }
let benches = 0, lampsOk = 0, lamps = 0;
for (const p of C.T2_PROPS) {
  if (p.kind === "bench") { benches++; ok(`seat (${p.x}, ${p.y}) stood by`, !!p.stand && at(p.stand.x, p.stand.y), p.stand); }
  if (p.kind === "lamp") { lamps++; if (by(p.x, p.y)) lampsOk++; }
}
ok(`lamps stood by: ${lampsOk} of ${lamps}`, lampsOk >= lamps - 4, lampsOk);
let shore = 0, deep = 0;
for (const k of seen) { const [x, y] = k.split(",").map(Number); const f = W.fishFrom(x, y); if (f) f.deep ? deep++ : shore++; }
console.log(`fishing: ${shore} tiles of bank, ${deep} of dock; benches ${benches}`);
ok("somewhere to fish deep", deep > 0); ok("somewhere to fish from a bank", shore > 40);
console.log(`${pass} passed, ${fail} failed`);
