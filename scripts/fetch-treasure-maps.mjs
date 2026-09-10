// Every treasure map you can open, written to data/treasure-maps.json.
//
//   node scripts/fetch-treasure-maps.mjs
//
// Run it when a patch adds one. Two a year at most, so this is a hand-run
// script rather than anything on a schedule.
//
// The G numbers are the community's, not the game's: nothing in the item sheet
// says "G17". They are not hardcoded either, because a table typed out by hand
// is a table that is wrong the week a new map lands. They are counted — the
// nth skin map by item id is Gn — which comes out matching what everybody
// already says, from Leather at G1 to Gargantuaskin at G18, and gives the next
// one its number without anybody editing anything.
//
// The maps that are not part of that run keep their names and get no number:
// the Thief's Map and the "Special" maps are real maps and are not what anybody
// means by a G.
import { writeFileSync } from "node:fs";

const API = "https://v2.xivapi.com/api";

const r = await fetch(
  `${API}/search?sheets=Item&query=Name~%22timeworn%22&fields=Name&limit=100`);
if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);

const rows = ((await r.json()).results ?? [])
  .map((x) => ({ id: x.row_id, name: x.fields?.Name ?? "" }))
  // Item id is release order, which is the only order that matters here.
  .sort((a, b) => a.id - b.id)
  // "Timeworn Artifact" and the Thaumaturgic ones are Occult Crescent loot
  // rather than maps. Anything that is not called a map is not one.
  .filter((x) => /\bMap$/.test(x.name));

// The run of skins, which is what the numbering counts.
// The apostrophe in Br'aaxskin is why this is not \w+: without it that map
// fell out of the run, and every map after it was numbered one too low —
// Gargantuaskin came out G17 when the FC calls it G18.
const isSkin = (n) => /^Timeworn ([\w']+skin|Leather) Map$/.test(n);
let g = 0;
const maps = rows.map((x) => {
  const skin = isSkin(x.name);
  if (skin) g += 1;
  return {
    id: x.id,
    name: x.name,
    ...(skin ? { g: `G${g}` } : {}),
    // What people call it out loud: "Gargantuaskin", not "Timeworn
    // Gargantuaskin Map".
    short: x.name.replace(/^Timeworn /, "").replace(/ Map$/, ""),
  };
});

// Newest first. Somebody arranging a map night means this week's map far more
// often than they mean a nine-year-old one, and a list that opens on Leather
// asks them to scroll past a decade to reach it.
maps.reverse();

writeFileSync("data/treasure-maps.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "XIVAPI v2, sheet Item",
  // The one at the top, named so the front end does not have to decide which
  // "latest" means.
  latest: maps[0]?.name ?? null,
  maps,
}, null, 1) + "\n");

console.log(`${maps.length} maps, newest is ${maps[0]?.short} (${maps[0]?.g ?? "—"})`);
for (const m of maps.slice(0, 6)) console.log(`  ${(m.g ?? "").padEnd(4)} ${m.name}`);
