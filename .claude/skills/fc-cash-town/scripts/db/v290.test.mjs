// v290, the town's southern strip, dry-run: the file runs as checked out on Windows (CR at its line ends) and again as
// written (the second run changes nothing); each catalog row it touches is the row it was but for the town's entry, and
// that is the code's (lib/town/catalog, ground, insects); town.reward_relay_place is v284's text but for the town's rows
// and is lib/town/reward-relay's relayPlace on every map and its rim; and it refuses to run before v289.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v290.test.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { GROUND_MAPS } = await import("@/lib/town/ground");
const { NECTAR_MAPS } = await import("@/lib/town/insects");
const { COLS, ROWS, FARM, FOREST } = await import("@/lib/town/world");
const { relayPlace } = await import("@/lib/town/reward-relay");

const FILE = "supabase/v290_the_towns_southern_strip.sql";
// (the files that ran, as they ran: this tree writes the catalog blocks of v264, v266 and v267 again from the code)
const BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const cat = async () => Object.fromEntries((await rows("select key, data from public.town_catalog")).map((r) => [r.key, r.data]));
const relayDef = async () => (await one("select replace(pg_get_functiondef('town.reward_relay_place(jsonb)'::regprocedure), chr(13), '') d")).d;
const text = readFileSync(FILE, "utf8").replaceAll("\r\n", "\n");
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 289; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    // (v279 needs the site's member_contacts, which is not the town's; v289 is held back a moment to be sure this waits for it)
    if (n === 289) continue;
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  // before v289: refused, and nothing changed
  const first = await cat();
  await assert.rejects(db.exec(text), /Run v289 before v290/); checks++;
  await db.exec("rollback");
  eq(await cat(), first, "nothing changed before v289");
  for (const f of readdirSync("supabase").filter((x) => x.startsWith("v289_"))) await db.exec(readFileSync(`supabase/${f}`, "utf8"));

  const was = await cat(), wasRelay = await relayDef();
  eq(was.cooking.map.town, [64, 64], "the town was 64 × 64 to cooking");
  eq(was.insects.nectar.maps.filter((m) => m[0] === "town"), [["town", 0, 0, 64, 64]], "and to the nectar");
  eq(was.ground.maps[0], [0, 0, 64, 64], "and to what is dropped");
  const nursery = Array.isArray(was.rewards?.nurseryBoxes);
  console.log(`rewards.nurseryBoxes on the bench: ${nursery ? JSON.stringify(was.rewards.nurseryBoxes) : "none"}`);

  // as checked out on Windows, then as written
  await db.exec(text.replaceAll("\n", "\r\n"));
  const now = await cat();
  await db.exec(text);
  eq(await cat(), now, "a second run changes nothing");

  // each row it touches: as it was but for the town's entry, which is the code's
  const code = catalogOf();
  const town80 = (m) => (JSON.stringify(m) === "[0,0,64,64]" ? [0, 0, 64, 80] : JSON.stringify(m) === '["town",0,0,64,64]' ? ["town", 0, 0, 64, 80] : m);
  eq(now.cooking, { ...was.cooking, map: { ...was.cooking.map, town: [64, 80] } }, "cooking: only map.town");
  eq(now.cooking.map, code.cooking.map, "cooking.map is the code's");
  eq(now.insects, { ...was.insects, nectar: { ...was.insects.nectar, maps: was.insects.nectar.maps.map(town80) } }, "insects: only the town's nectar map");
  eq(now.insects.nectar.maps, NECTAR_MAPS, "the nectar maps are the code's");
  eq(now.ground, { ...was.ground, maps: was.ground.maps.map(town80) }, "ground: only the town's map");
  // (the database's has the mountain's after the code's three: the town's is the code's)
  eq(now.ground.maps.slice(0, GROUND_MAPS.length), GROUND_MAPS, "the ground's maps are the code's");
  if (nursery) eq(now.rewards, { ...was.rewards, nurseryBoxes: was.rewards.nurseryBoxes.map(town80) }, "rewards: only the town's nursery box");
  else eq(now.rewards, was.rewards, "rewards as it was");
  for (const key of Object.keys(was)) if (!["cooking", "insects", "ground", "rewards"].includes(key)) eq(now[key], was[key], `${key} untouched`);
  eq([COLS, ROWS], [64, 80], "the code's town is 64 × 80");

  // the relay's place: v284's text but for the town's last row, and the page's on every map and a tile past each edge
  eq((await relayDef()).replace("between 0 and 79 then 'town'", "between 0 and 63 then 'town'"), wasRelay, "reward_relay_place is v284's but for the town's rows");
  const at = [];
  for (const [x0, y0, w, h] of [[0, 0, COLS, ROWS], [FARM.x, FARM.y, FARM.w, FARM.h], [FOREST.x, FOREST.y, FOREST.w, FOREST.h]]) {
    for (let y = y0 - 1; y <= y0 + h; y++) for (const x of [x0 - 1, x0, x0 + Math.floor(w / 2), x0 + w - 1, x0 + w]) at.push([x, y]);
    for (let x = x0 - 1; x <= x0 + w; x++) for (const y of [y0 - 1, y0 + h - 1, y0 + h]) at.push([x, y]);
  }
  const got = await rows("select a::text k, town.reward_relay_place(a) p from jsonb_array_elements($1::jsonb) a", [JSON.stringify(at)]);
  for (const { k, p } of got) eq(p, relayPlace(JSON.parse(k)), `relay place at ${k}`);
  eq(await one("select town.reward_relay_place('[60,79]'::jsonb) a, town.reward_relay_place('[60,80]'::jsonb) b"), { a: "town", b: null }, "the strip's last row is the town's");
  console.log(`v290 dry run: ${checks} checks passed`);
} finally { await db.close(); }
