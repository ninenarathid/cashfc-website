// Everything you can still walk into unsynced, written to data/legacy.json.
//
//   node scripts/fetch-legacy.mjs
//
// Run it when a patch adds some, or when last patch's extreme and savage stop
// being the current ones — a few times a year, so this is hand-run rather than
// scheduled.
//
// What counts as one. Three of the game's own content types, and one flag:
//
//   Trials                 Eight-player, which leaves out five four-player
//                          story fights that are not an evening anybody
//                          arranges. The Ultimates are a content type of their
//                          own and are not here; nobody farms one for a mount.
//   Raids                  Normal and savage both. The alliance arrangement —
//                          three parties of eight — is ContentMemberType 4 and
//                          is left out, because the board lists those under
//                          Alliance raid already.
//   Not a high-end duty    The flag the game puts on this patch's extreme,
//                          savage and unreal: minimum item level, no
//                          undersizing, no walking in with three friends. It
//                          comes off when the next patch lands, which is
//                          exactly the moment a fight stops being progression
//                          and starts being something you farm — and the
//                          current ones are already on the board under Extreme
//                          and Savage.
//
// Read from the game's own Duty Finder table rather than typed out: two hundred
// of them, and a hand-written list would be wrong the week a patch lands.
import { writeFileSync } from "node:fs";

const API = "https://v2.xivapi.com/api";

const FIELDS = [
  "Name",
  "ContentType.Name",
  "ClassJobLevelRequired",
  "ItemLevelRequired",
  "ContentMemberType",
  "ContentMemberType.MembersPerParty",
  "TerritoryType.ExVersion.Name",
  "HighEndDuty",
].join(",");

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

// The game writes these the way they read in a sentence — "the Bowl of Embers"
// — and the Duty Finder shows them capitalised. A list half of whose names
// start with a lowercase "the" reads as a bug in the list.
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The two the board has no other heading for. */
const KINDS = new Set(["Trials", "Raids"]);

/** Three parties of eight. Those are on the board under Alliance raid. */
const ALLIANCE = 4;

const trials = rows
  .filter((x) => KINDS.has(x.fields?.ContentType?.fields?.Name))
  .filter((x) => (x.fields.Name ?? "").trim())
  .filter((x) => (x.fields.ContentMemberType?.fields?.MembersPerParty ?? 0) === 8)
  .filter((x) => (x.fields.ContentMemberType?.value
                  ?? x.fields.ContentMemberType?.row_id) !== ALLIANCE)
  .filter((x) => !x.fields.HighEndDuty)
  // The seasonal placeholders. "Special Event I" is what the Duty Finder calls
  // the slot a live event borrows for a week, and it is not a trial anybody
  // arranges an evening around.
  .filter((x) => !/^Special Event/i.test(x.fields.Name.trim()))
  .map((x) => ({
    id: x.row_id,
    name: title(x.fields.Name.trim()),
    level: x.fields.ClassJobLevelRequired ?? 0,
    ilvl: x.fields.ItemLevelRequired ?? 0,
    size: 8,
    raid: x.fields.ContentType.fields.Name === "Raids",
    expansion: x.fields.TerritoryType?.fields?.ExVersion?.fields?.Name || "Unknown",
  }))
  .sort((a, b) => a.level - b.level || a.id - b.id);

/*
 * This expansion's extremes come off, whatever the game's flag says.
 *
 * HighEndDuty only marks the one the current patch is about; the four before
 * it in the same expansion lose the flag and would land here, which puts every
 * Dawntrail extreme on the board twice — once under Extreme, where the FC's
 * own list already has it, and once under a heading that says "legacy".
 *
 * At the level cap only, worked out from the data rather than typed, so this
 * keeps meaning the same thing after the next expansion moves the cap: a level
 * 50 Minstrel's Ballad really is a legacy trial and stays.
 *
 * Both spellings. "The Minstrel's Ballad: Necron's Embrace" is an extreme in
 * everything but the word — it is on the FC's extreme list under the boss's
 * own name — and dropping one spelling while keeping the other would be
 * arbitrary.
 */
const cap = Math.max(...trials.map((t) => t.level));
const current = (t) =>
  t.level === cap && (/\(Extreme\)$/.test(t.name) || /Minstrel's Ballad/.test(t.name));
const legacy = trials.filter((t) => !current(t));
const dropped = trials.filter(current);

/*
 * Expansions newest first, taken from the data so a new one needs nothing here.
 *
 * Somebody farming a mount means a trial from a few expansions back far more
 * often than the first one in the game, and either way a list that opens on A
 * Realm Reborn asks them to scroll past twelve years to reach what they meant.
 */
const order = [...new Set(rows
  .map((x) => x.fields?.TerritoryType?.fields?.ExVersion)
  .filter((e) => e?.fields?.Name)
  .map((e) => `${e.row_id}\t${e.fields.Name}`))]
  .map((s) => s.split("\t"))
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([, name]) => name);

const expansions = order.filter((e) => legacy.some((d) => d.expansion === e));

writeFileSync("data/legacy.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "XIVAPI v2, ContentFinderCondition (Trials + Raids, 8 players, not HighEndDuty)",
  expansions,
  duties: legacy,
}, null, 1) + "\n");

console.log(`
${legacy.length} trials across ${expansions.length} expansions`
  + ` — level cap ${cap}, so ${dropped.length} current extremes left out:`
  + ` ${dropped.map((t) => t.name).join(", ")}`);
for (const e of expansions) {
  const n = legacy.filter((d) => d.expansion === e);
  console.log(`  ${String(n.length).padStart(3)}  ${e}`
    + `   ${n[0]?.name} … ${n[n.length - 1]?.name}`);
}
