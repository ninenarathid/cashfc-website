// Every dungeon in the game, written to data/dungeons.json.
//
//   node scripts/fetch-dungeons.mjs
//
// Run it when a patch adds some. A handful a year, so this is a hand-run script
// rather than anything on a schedule.
//
// Read from the game's own Duty Finder table rather than typed out: there are
// well over a hundred of them, a list by hand would be wrong the week a patch
// lands, and the game already knows the level, the party size and which
// expansion each belongs to.
//
// "Dungeon" here means what the Duty Finder means by it — ContentType 2. Deep
// dungeons are their own content type and their own kind of evening; Palace of
// the Dead is not something anybody arranges the way they arrange Sastasha.
import { writeFileSync } from "node:fs";

const API = "https://v2.xivapi.com/api";

/** What ContentType.Name says for the ones we want. */
const WANT = "Dungeons";

const FIELDS = [
  "Name",
  "ContentType.Name",
  "ClassJobLevelRequired",
  "ItemLevelRequired",
  "ContentMemberType.MembersPerParty",
  "TerritoryType.ExVersion.Name",
].join(",");

/**
 * The whole sheet, a page at a time.
 *
 * There is no server-side filter for "only the dungeons", so this reads every
 * Duty Finder row and keeps the ones that are. About nine hundred rows, which
 * is two requests.
 */
const rows = [];
let after = 0;
for (;;) {
  const url = `${API}/sheet/ContentFinderCondition?limit=500&after=${after}&fields=${encodeURIComponent(FIELDS)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const page = (await r.json()).rows ?? [];
  if (!page.length) break;
  rows.push(...page);
  after = page[page.length - 1].row_id;
}
console.log(`${rows.length} Duty Finder rows read`);

/*
 * The game writes these the way they read in a sentence — "the Thousand Maws of
 * Toto-Rak" — and the Duty Finder shows them capitalised. A list of names that
 * half start with a lowercase "the" reads as a bug in the list.
 */
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const dungeons = rows
  .filter((x) => x.fields?.ContentType?.fields?.Name === WANT)
  .filter((x) => (x.fields.Name ?? "").trim())
  .map((x) => ({
    id: x.row_id,
    name: title(x.fields.Name.trim()),
    level: x.fields.ClassJobLevelRequired ?? 0,
    ilvl: x.fields.ItemLevelRequired ?? 0,
    size: x.fields.ContentMemberType?.fields?.MembersPerParty ?? 4,
    expansion: x.fields.TerritoryType?.fields?.ExVersion?.fields?.Name || "Unknown",
  }))
  // Level, then release order within a level, which is how the Duty Finder
  // lists them and therefore how people expect to find one.
  .sort((a, b) => a.level - b.level || a.id - b.id);

/*
 * Expansions newest first.
 *
 * Somebody arranging a dungeon run means this expansion far more often than a
 * twelve-year-old one, and a list that opens on A Realm Reborn asks them to
 * scroll past the whole game to reach what they meant. The order is taken from
 * the data rather than typed, so a new expansion needs nothing here.
 */
const order = [...new Set(rows
  .map((x) => x.fields?.TerritoryType?.fields?.ExVersion)
  .filter((e) => e?.fields?.Name)
  .map((e) => `${e.row_id}\t${e.fields.Name}`))]
  .map((s) => s.split("\t"))
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([, name]) => name);

const expansions = order.filter((e) => dungeons.some((d) => d.expansion === e));

writeFileSync("data/dungeons.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "XIVAPI v2, sheet ContentFinderCondition (ContentType: Dungeons)",
  expansions,
  dungeons,
}, null, 1) + "\n");

console.log(`\n${dungeons.length} dungeons across ${expansions.length} expansions:`);
for (const e of expansions) {
  const n = dungeons.filter((d) => d.expansion === e);
  console.log(`  ${String(n.length).padStart(3)}  ${e}`
    + `   ${n[0]?.name} … ${n[n.length - 1]?.name}`);
}
const odd = dungeons.filter((d) => d.size !== 4);
if (odd.length) console.log(`\nnot four-player: ${odd.map((d) => `${d.name} (${d.size})`).join(", ")}`);
