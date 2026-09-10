// Where every housing plot is on the district map, written to data/housing.json.
//
//   node scripts/fetch-housing.mjs
//
// The game marks all sixty plots of each district on its own map, and the
// marker table carries them as world coordinates. Converted here to the map
// coordinates everything else on this site speaks, because doing it in the
// browser would mean shipping the offsets and the arithmetic to do a sum whose
// answer never changes.
//
// Two maps per district, which is the part worth knowing: plots 1 to 30 are on
// the main map and 31 to 60 are the subdivision, a separate picture with its
// own offsets. A pin placed on the wrong one of the two lands in a field.
//
// The two extra markers each district carries are the apartment buildings.
// They have no plot number and nobody arranges to meet at one, so they are
// dropped rather than numbered 61 and 62.
import { writeFileSync } from "node:fs";

const API = "https://v2.xivapi.com/api";
const FIELDS = [
  "X", "Z",
  "Map.Id", "Map.SizeFactor", "Map.OffsetX", "Map.OffsetY",
  "Map.PlaceName.Name",
].join(",");

const r = await fetch(
  `${API}/sheet/HousingMapMarkerInfo?limit=500&fields=${encodeURIComponent(FIELDS)}`);
if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
const rows = (await r.json()).rows ?? [];
console.log(`${rows.length} plot markers read`);

/**
 * World coordinates to the ones the game prints on your screen.
 *
 * The formula the community has used since 2013. X and Z are the horizontal
 * plane in FFXIV — Y is height — so a map's vertical axis comes from Z.
 */
const toMap = (world, offset, sizeFactor) => {
  const c = (sizeFactor || 100) / 100;
  const v = (world + (offset || 0)) * c;
  return Math.round(((41 / c) * ((v + 1024) / 2048) + 1) * 10) / 10;
};

const districts = {};
for (const row of rows) {
  const f = row.fields ?? {};
  const map = f.Map?.fields;
  const name = map?.PlaceName?.fields?.Name?.trim();
  // Subrows are the plots, in order: 1 to 30 on the main map, 31 to 60 in the
  // subdivision, and whatever is left over is an apartment building.
  if (!name || !map?.Id || row.subrow_id > 60) continue;
  (districts[name] ??= []).push({
    plot: row.subrow_id,
    map: map.Id,
    size: map.SizeFactor || 100,
    x: toMap(f.X, map.OffsetX, map.SizeFactor),
    y: toMap(f.Z, map.OffsetY, map.SizeFactor),
  });
}
for (const list of Object.values(districts)) list.sort((a, b) => a.plot - b.plot);

writeFileSync("data/housing.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "XIVAPI v2, sheet HousingMapMarkerInfo (world coordinates converted)",
  wards: 30,
  districts,
}, null, 1) + "\n");

for (const [name, list] of Object.entries(districts)) {
  const maps = [...new Set(list.map((p) => p.map))];
  const bad = list.filter((p) => p.x < 1 || p.x > 45 || p.y < 1 || p.y > 45);
  console.log(`  ${String(list.length).padStart(2)} plots  ${name.padEnd(20)}`
    + `${maps.join(" + ")}   plot 1 at (${list[0]?.x}, ${list[0]?.y})`
    + (bad.length ? `   OFF THE MAP: ${bad.length}` : ""));
}
