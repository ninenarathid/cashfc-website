// One town's parts of the database's copies (lib/town/catalog), for supabase v337's switch to the city (town.apply_map,
// town.map_parts): what is laid over the catalog for that town, and where a member's things on a tile it closes go. As
// town2-parts.mjs (v295), and two parts more: the town's chests among box.more (the city's city hall and kitchen chests
// open the same box), and the insects' boards' spots in town (boards.spots, by their number). Its moves cover the city's
// whole box (x -16..123, rows 0..134), so that whatever stood in town2's or the old town's is moved too. Printed as JSON.
//   cd <the tree> && FC_REPO=<the tree> TOWN_MAP=classic|town2|city node .claude/skills/fc-cash-town/scripts/db/city-parts.mjs
await import("./repo-ts-town.mjs");
process.env.FARM_MAP ??= "farm2";
const { catalogOf } = await import("@/lib/town/catalog");
const { COLS, ROWS, TOWN_RECT, TOWN_MAP, placeOf, walkable } = await import("@/lib/town/world").then(async (w) => ({ ...w, TOWN_MAP: (await import("@/lib/town/town-map")).TOWN_MAP }));
if (TOWN_MAP !== (process.env.TOWN_MAP ?? "classic")) throw new Error(`asked for ${process.env.TOWN_MAP}, read ${TOWN_MAP}`);
const c = catalogOf();
/** A tile of the town's part of the tile space (any town's: the city's reaches x -16 and row 134): x from -20 below 128, y from 0 to 140. */
const inTown = (x, y) => x >= -20 && x < 128 && y >= 0 && y <= 140;
const townKey = (k) => { const [x, y] = k.split(",").map(Number); return inTown(x, y); };
// where a thing on a tile the town closes goes: the six nearest tiles one may stand on (nearest first, then by row), over
// the city's whole box, which holds town2's and the old town's
const open = [];
for (let y = TOWN_RECT.y; y < TOWN_RECT.y + ROWS; y++) for (let x = TOWN_RECT.x; x < TOWN_RECT.x + COLS; x++) if (placeOf(x, y) === "town" && walkable(x, y)) open.push([x, y]);
const moves = {};
for (let y = 0; y < 135; y++) for (let x = -16; x < 124; x++) {
  if (placeOf(x, y) === "town" && walkable(x, y)) continue;
  // (only where somebody's things could stand: a tile of one of the towns)
  if (!(x >= 0 && x < 80 && y < 80) && !(x >= TOWN_RECT.x && x < TOWN_RECT.x + COLS && y < TOWN_RECT.y + ROWS)) continue;
  const near = [];
  for (const [ox, oy] of open) { const d = Math.hypot(ox - x, oy - y); if (d < 12) near.push({ t: [ox, oy], d }); }
  if (!near.length) for (const [ox, oy] of open) near.push({ t: [ox, oy], d: Math.hypot(ox - x, oy - y) });
  moves[`${x},${y}`] = near.sort((a, b) => a.d - b.d || a.t[1] - b.t[1] || a.t[0] - b.t[0]).slice(0, 6).map((m) => m.t);
}
const townBox = (m) => +m[1] === 0 && +m[0] < 128;
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
  boxMore: c.box.more.filter(([x, y]) => inTown(x, y)),
  groundTown: c.ground.maps.find(townBox),
  forgeAt: c.forge.stand.at,
  nurseryTown: [TOWN_RECT.x, TOWN_RECT.y, COLS, ROWS],
  boardSpots: c.boards.spots.filter((s) => s.place === "town"),
  moves,
};
process.stdout.write(JSON.stringify(parts));
