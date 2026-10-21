// One town's parts of the database's copies (lib/town/catalog): what supabase v295's switch (town.apply_map) lays over
// the catalog for that town, and where a member's things on a tile it closes are moved to. Printed as JSON.
//   cd <the tree> && FC_REPO=<the tree> TOWN_MAP=classic|town2 node .claude/skills/fc-cash-town/scripts/db/town2-parts.mjs
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { COLS, ROWS, T2, placeOf, walkable } = await import("@/lib/town/world");
const want = process.env.TOWN_MAP === "town2";
if (T2 !== want) throw new Error(`asked for ${process.env.TOWN_MAP}, read ${T2 ? "town2" : "classic"}`);
const c = catalogOf();
/** A tile of the town's part of the tile space (the town, and what lies between it and the farm and the forest): x below 128, y from 0 below 112. */
const townKey = (k) => { const [x, y] = k.split(",").map(Number); return x < 128 && y >= 0 && y < 112; };
// where a thing on a tile the town closes goes: the six nearest tiles one may stand on (nearest first, then by row)
const open = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (placeOf(x, y) === "town" && walkable(x, y)) open.push([x, y]);
const moves = {};
for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) {
  if (placeOf(x, y) === "town" && walkable(x, y)) continue;
  moves[`${x},${y}`] = open.map(([ox, oy]) => ({ t: [ox, oy], d: Math.hypot(ox - x, oy - y) }))
    .sort((a, b) => a.d - b.d || a.t[1] - b.t[1] || a.t[0] - b.t[0]).slice(0, 6).map((m) => m.t);
}
const parts = {
  stations: c.preparation.stations,
  places: Object.fromEntries(Object.entries(c.fishing.places).filter(([k]) => townKey(k))),
  cookingTown: c.cooking.map.town,
  feastTile: c.cooking.feast.tile,
  feastFloor: c.cooking.feast.floor,
  haunts: Object.fromEntries(c.insects.haunts.map((h, i) => [i, h]).filter(([, h]) => h[1] === "town")),
  nectarTown: c.insects.nectar.maps.find((m) => m[0] === "town"),
  yardAt: c.yard.at,
  boxAt: c.box.at,
  groundTown: c.ground.maps[0],
  forgeAt: c.forge.stand.at,
  nurseryTown: [0, 0, COLS, ROWS],
  moves,
};
process.stdout.write(JSON.stringify(parts));
