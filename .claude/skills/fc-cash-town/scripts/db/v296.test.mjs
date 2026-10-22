// v296, the editor's town's parts made again from the code, dry-run on the stand-in (no live database is touched): run
// while the old town is the town, it changes no catalog row and writes the editor's town's parts as the code makes them
// (a second run changes nothing); opened, the catalog's town parts are those; run again while the editor's town is the
// town, it lays them again and moves a pot off a tile now closed (behind the water pavilion's tank); switched back,
// the catalog is to the letter what it was.
//   cd <the tree> && FC_REPO=<a tree whose supabase/ has v179–v205, the shared one> node .claude/skills/fc-cash-town/scripts/db/v296.test.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";

const BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
const T2 = JSON.parse(execFileSync(process.execPath, [".claude/skills/fc-cash-town/scripts/db/town2-parts.mjs"],
  { env: { ...process.env, FC_REPO: process.cwd().split("\\").join("/"), TOWN_MAP: "town2" }, encoding: "utf8", maxBuffer: 1 << 26 }));
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const ok = (c, what, d) => { assert.ok(c, `${what} ${d === undefined ? "" : JSON.stringify(d)}`); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const cat = async () => Object.fromEntries((await rows("select key, data from public.town_catalog order by key")).map((r) => [r.key, r.data]));
const text = readFileSync("supabase/v296_the_editors_town_as_it_stands.sql", "utf8").replaceAll("\r\n", "\n");
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 295; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  eq(await one("select map, catalog from public.town_map_switch"), { map: "town2-admins", catalog: "classic" }, "v295 is in the stand-in, the admins only");

  // ── run while the old town is the town: twice ──
  const was = await cat();
  await db.exec(text.replaceAll("\n", "\r\n"));
  await db.exec(text);
  eq(await cat(), was, "running it changes no catalog row");
  const kept = await one("select parts, taken from town.map_parts where map = 'town2'");
  eq(kept.taken, "code", "the editor's town's parts are the code's");
  for (const k of Object.keys(T2)) eq(kept.parts[k], T2[k], `its ${k} as the code makes them`);
  ok(T2.feastFloor.some(([x, y]) => x === 68 && y === 46) && !T2.stations.some(([x, y]) => x === 67 && y === 46), "the stove's tile is the hall's floor, the places beside it gone");
  ok(!!T2.moves["69,16"] && !T2.moves["9,48"], "behind the tank is closed, the stage's top open");

  // ── opened: the catalog's town parts are those ──
  await one("select town.apply_map('town2') r");
  const laid = await one("select town.catalog_town_parts() r");
  for (const k of Object.keys(laid.r)) eq(laid.r[k], T2[k], `the catalog's ${k} is the editor's town's as it stands`);
  const opened = await cat();

  // ── run again while the editor's town is the town: a pot on a tile now closed goes to open ground ──
  const member = (await one("select id from public.profiles order by id offset 1")).id;
  await db.query("delete from public.town_pots");
  await db.query(`insert into public.town_pots(member_id,dish,helpings,x,y,tok,set_at,feast,marks) values ($1,'stew',2,69,16,false,0,false,'{}')`, [member]);
  await db.exec(text);
  eq(await cat(), opened, "laying them again changes nothing in the catalog");
  const pot = await one("select x, y from public.town_pots");
  ok(!T2.moves[`${pot.x},${pot.y}`] && Math.hypot(pot.x - 69, pot.y - 16) < 3, "the pot behind the tank went to the nearest open tile", pot);

  // ── back to the old town: to the letter ──
  await one("select town.apply_map('classic') r");
  eq(await cat(), was, "the catalog is to the letter what it was");
  console.log(`v296 dry run: ${checks} checks passed`);
} finally { await db.close(); }
