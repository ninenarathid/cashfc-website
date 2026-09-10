// The game's own map picture for every zone, written to data/map-art.json.
//
//   node scripts/fetch-map-art.mjs
//
// Not the pictures — those stay on XIVAPI and are fetched by the browser when
// a party actually shows one. Six hundred zones at half a megabyte each is
// three hundred megabytes, which is not something to keep in a repository for
// the handful of maps a board ever draws.
//
// What is kept is the two numbers you cannot work out without the game files:
//
//   id           Where the picture lives: "y6f2/00", which is the last part of
//                https://v2.xivapi.com/api/asset/map/y6f2/00
//   size         SizeFactor. A zone's map coordinates run from 1 to about 42
//                at a size factor of 100, and to half that at 200 — without it
//                a pin lands in the wrong half of every large zone.
//
// The maths, for whoever reads this next: a map coordinate lands at
// ((coord - 1) * (size / 100) / 41) of the way across the picture. The offsets
// in the Map sheet are for converting from world coordinates, which is the
// other direction and not the one anybody types into a Discord post.
import { readFileSync, writeFileSync } from "node:fs";

const API = "https://v2.xivapi.com/api";
const FIELDS = ["Id", "SizeFactor", "PlaceName.Name"].join(",");

const rows = [];
let after = 0;
for (;;) {
  const url = `${API}/sheet/Map?limit=500&after=${after}&fields=${encodeURIComponent(FIELDS)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const page = (await r.json()).rows ?? [];
  if (!page.length) break;
  rows.push(...page);
  after = page[page.length - 1].row_id;
}
console.log(`${rows.length} map rows read`);

/*
 * By zone name, because that is what a party stores.
 *
 * A zone can have several map rows — a tower with floors, a zone redrawn for a
 * later patch — and they are in row order, which is release order. The first
 * one is the ordinary above-ground map and the one somebody giving directions
 * means; the later ones are the basement.
 */
const art = {};
for (const x of rows) {
  const name = x.fields?.PlaceName?.fields?.Name?.trim();
  const id = x.fields?.Id;
  if (!name || !id || id === "default/00") continue;
  if (art[name]) continue;
  art[name] = { id, size: x.fields.SizeFactor || 100 };
}

// Only the zones the picker can actually offer. The Map sheet carries every
// inn room and private chamber in the game, and a file three times the size it
// needs to be is three times the size in everybody's browser.
const known = new Set(
  JSON.parse(readFileSync("data/maps.json", "utf8")).maps.map((m) => m.name));
const kept = Object.fromEntries(
  Object.entries(art).filter(([name]) => known.has(name)));

writeFileSync("data/map-art.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "XIVAPI v2, sheet Map (Id and SizeFactor, by PlaceName)",
  base: `${API}/asset/map/`,
  art: kept,
}, null, 1) + "\n");

const missing = [...known].filter((n) => !kept[n]);
console.log(`${Object.keys(kept).length} of ${known.size} zones have a map`);
if (missing.length) {
  console.log(`no map for ${missing.length}: ${missing.slice(0, 8).join(", ")}`
    + (missing.length > 8 ? " …" : ""));
}
