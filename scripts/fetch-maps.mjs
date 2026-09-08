// Every named map in the game, written to data/maps.json.
//
//   node scripts/fetch-maps.mjs
//
// Run it when a patch adds zones. Nothing calls it automatically: the map list
// changes twice a year and a nightly job for it would be a nightly job that
// almost always writes the same file.
//
// Why a file rather than a live call: the party finder asks "where?" on a form
// that has to be usable offline of any third party, and a picker that spins
// while XIVAPI is having a bad afternoon is a picker nobody can use. The whole
// list is a few tens of kilobytes.
//
// What is kept, and what is thrown away:
//
//   Maps with no place name are the engine's own — loading screens, default
//   entries, test rooms. They are dropped.
//
//   The same place often has several maps, because a zone with an upper and a
//   lower level is two of them, and because a map gets a new row when its art
//   is redrawn. They are collapsed by name: somebody arranging a photo shoot
//   means the place, not the revision of its cartography.
//
//   The region is kept for grouping — "La Noscea", "Othard" — so a list of six
//   hundred names can be read as a handful of shelves.
import { writeFileSync } from "node:fs";

const API = "https://v2.xivapi.com/api";
const FIELDS = "Id,PlaceName.Name,PlaceNameRegion.Name,PlaceNameSub.Name,SizeFactor";

const name = (v) => (v && typeof v === "object" ? v.fields?.Name ?? "" : "") || "";

async function page(after) {
  const url = `${API}/sheet/Map?limit=500&fields=${FIELDS}`
    + (after == null ? "" : `&after=${after}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json()).rows ?? [];
}

const byName = new Map();
let after = null;
let seen = 0;

for (;;) {
  const rows = await page(after);
  if (!rows.length) break;
  seen += rows.length;
  for (const row of rows) {
    const f = row.fields ?? {};
    const place = name(f["PlaceName"]);
    // "???" is the game's own placeholder, used for a region that has not been
    // revealed and for a handful of unnamed rooms. It is not a place anybody
    // can arrange to meet in.
    if (!place || place === "???") continue;
    const raw = name(f["PlaceNameRegion"]);
    // Instanced content — raids, trials, dungeons — carries no region. Given
    // one rather than left blank, because "no region" would be the largest
    // group in the list and would read as a bug.
    const region = !raw || raw === "???" ? "Instances" : raw;
    const sub = name(f["PlaceNameSub"]);
    // First row wins. Later rows for the same place are extra floors and
    // redrawn art, which is not what anybody means by "where".
    if (byName.has(place)) continue;
    byName.set(place, {
      name: place,
      ...(region ? { region } : {}),
      ...(sub ? { sub } : {}),
      id: f.Id || undefined,
      size: f.SizeFactor || undefined,
    });
  }
  after = rows[rows.length - 1].row_id;
  process.stdout.write(`\rread ${seen} rows, ${byName.size} places`);
}

const maps = [...byName.values()]
  .sort((a, b) => {
    const ra = a.region === "Instances" ? "zzz" : a.region ?? "";
    const rb = b.region === "Instances" ? "zzz" : b.region ?? "";
    return ra.localeCompare(rb) || a.name.localeCompare(b.name);
  });

// Instances last: somebody picking a place for a photograph means a zone far
// more often than they mean the inside of a raid.
const regions = [...new Set(maps.map((m) => m.region).filter(Boolean))]
  .sort((a, b) => (a === "Instances" ? 1 : b === "Instances" ? -1 : a.localeCompare(b)));

writeFileSync("data/maps.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "XIVAPI v2, sheet Map",
  regions,
  maps,
}, null, 1) + "\n");

console.log(`\n${maps.length} places across ${regions.length} regions -> data/maps.json`);
