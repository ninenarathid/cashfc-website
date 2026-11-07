// One farm's parts of the database's copies (lib/town/catalog): what supabase v323's switch (town.apply_farm) lays over
// the catalog for that farm, and what it needs to move a member's things from one farm to the other. Printed as JSON.
//   cd <the tree> && FC_REPO=<the tree> FARM_MAP=classic|farm2 node .claude/skills/fc-cash-town/scripts/db/farm2-parts.mjs
// (the town is the editor's, as it is live: TOWN_MAP=town2)
process.env.TOWN_MAP ??= "town2";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const W = await import("@/lib/town/world");
const { BARNS } = await import("@/lib/town/pasture");
const { SPRINGS } = await import("@/lib/town/reward-springs");
const want = process.env.FARM_MAP === "farm2";
if (W.F2 !== want) throw new Error(`asked for ${process.env.FARM_MAP}, read ${W.F2 ? "farm2" : "classic"}`);
const c = catalogOf();
const R = W.FARM_ALL;
const inFarm = (x, y) => x >= R.x && y >= R.y && x < R.x + R.w && y < R.y + R.h;
// what may be stood on, row by row over the farm's box ("." may, anything else may not): where a thing set down on a
// tile with no counterpart in the other farm may be put
const walk = [];
for (let y = R.y; y < R.y + R.h; y++) { let s = ""; for (let x = R.x; x < R.x + R.w; x++) s += W.placeOf(x, y) === "farm" && W.walkable(x, y) ? "." : "#"; walk.push(s); }
const parts = {
  map: want ? "farm2" : "classic",
  rect: [R.x, R.y, R.w, R.h],
  bedsAt: c.farming.bedsAt, side: c.farming.side, wellAt: c.farming.wellAt, wells: c.farming.wells, wellSize: W.WELL_SIZE,
  cookingFarm: c.cooking.map.farm,
  haunts: Object.fromEntries(c.insects.haunts.map((h, i) => [i, h]).filter(([, h]) => h[1] === "farm")),
  nectarFarm: c.insects.nectar.maps.find((m) => m[0] === "farm"),
  groundFarm: c.ground.maps.find((m) => m[0] === R.x && m[1] === R.y),
  boxFarm: c.box.more.filter(([x, y]) => inFarm(x, y)),
  lampsFarm: c.lamps.maps.farm,
  eggSpots: c.animals.eggSpots,
  wagonFarm: c.animals.wagonStops.farm,
  cloudCorners: c.farming.bedsAt,
  nurseryFarm: [R.x, R.y, R.w, R.h],
  springFarm: SPRINGS.sites[1],
  // (for moving things: each barn's corner, where its first gate from the town puts one, and the farm's walking rows)
  barns: BARNS.map((b) => [b.x, b.y]),
  arrive: (() => { const to = W.GATES.find((g) => g.leads === "farm").to; return [Math.floor(to.x), Math.floor(to.y)]; })(),
  walk,
};
for (const [k, v] of Object.entries(parts)) if (v === undefined) throw new Error(`no ${k}`);
process.stdout.write(JSON.stringify(parts));
