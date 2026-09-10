// The Duty Roulettes, written to data/roulettes.json.
//
//   node scripts/fetch-roulettes.mjs
//
// Run it if a patch adds one, which happens about once an expansion.
//
// Read from the game's own ContentRoulette sheet rather than typed out, for the
// reason the dungeons are: a list by hand is wrong the week a patch lands, and
// wrong in the one place people would be using it.
//
// That sheet also holds the Chocobo Races, which share a table with the
// roulettes and are not one. Anything that is not called a roulette — or the
// Frontline daily, which is one in everything but name — is dropped.
import { writeFileSync } from "node:fs";

const API = "https://v2.xivapi.com/api";

const r = await fetch(`${API}/sheet/ContentRoulette?limit=60&fields=Name`);
if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
const rows = (await r.json()).rows ?? [];

/*
 * The Duty Finder's own order, which is by reward rather than by release.
 *
 * Row id is release order and puts Leveling first and Expert fifth, which is
 * nobody's mental list: the roulette people open the window for is Expert, and
 * a list that buries it fifth is a list they have to read rather than scan.
 */
const ORDER = [
  "Expert",
  "Level Cap Dungeons",
  "High-level Dungeons",
  "Leveling",
  "Trials",
  "Main Scenario",
  "Guildhests",
  "Alliance Raids",
  "Normal Raids",
  "Mentor",
  "Frontline",
];

const found = new Map();
for (const x of rows) {
  const full = (x.fields?.Name ?? "").trim();
  if (!full) continue;
  // "Duty Roulette: Expert" -> "Expert"; "Daily Challenge: Frontline" the same.
  const m = /^(?:Duty Roulette|Daily Challenge):\s*(.+)$/.exec(full);
  if (!m) continue;
  if (!found.has(m[1])) found.set(m[1], { id: x.row_id, name: m[1], full });
}

const roulettes = ORDER.map((name) => found.get(name)).filter(Boolean);

const missed = [...found.keys()].filter((n) => !ORDER.includes(n));
if (missed.length) {
  // Loud on purpose: a roulette the game has and this list does not is a
  // roulette nobody can tick, and the failure is otherwise silent.
  console.log(`\n!! in the game and not in ORDER: ${missed.join(", ")}`);
  console.log("   add it above, in the place the Duty Finder puts it.\n");
}

writeFileSync("data/roulettes.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "XIVAPI v2, sheet ContentRoulette",
  /** Thai time. The daily reset is 15:00 UTC, and the FC reads clocks in ICT. */
  resets_at: "22:00",
  roulettes,
}, null, 1) + "\n");

console.log(`${roulettes.length} roulettes:`);
for (const x of roulettes) console.log(`  ${String(x.id).padStart(3)}  ${x.name}`);
