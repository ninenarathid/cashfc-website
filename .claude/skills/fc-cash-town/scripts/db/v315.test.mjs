// v315, the editor's town's parts made again from the code after the export oato-v3, dry-run on the stand-in (no live
// database is touched): with the editor's town the town, as it is live, running it changes the catalog's fishing places
// and nothing else of the catalog; the haunts stay to the last perch; a second run changes nothing; a pot on a tile now
// closed goes to open ground and a pot elsewhere stays; going back to the old town and forth again is still to the letter.
//   cd <the tree> && FC_REPO=<a tree whose supabase/ has v179–v205, the shared one> node .claude/skills/fc-cash-town/scripts/db/v315.test.mjs
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
const text = readFileSync("supabase/v315_fishing_where_the_rocks_moved.sql", "utf8").replaceAll("\r\n", "\n");
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 296; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  await one("select town.apply_map('town2') r");
  eq(await one("select map, catalog from public.town_map_switch"), { map: "town2", catalog: "town2" }, "the editor's town is the town, as live");
  // (v311's boards are past what this stand-in replays: its row as it stands live, but for what it does not need)
  const liveSpots = [{ id: 0, board: "roll", x: 62, y: 7, place: "town" }, { id: 1, board: "roll", x: 27, y: 16, place: "town" }, { id: 2, board: "roll", x: 44, y: 30, place: "town" }];
  await db.query("insert into public.town_catalog (key, data) values ('boards', $1) on conflict (key) do update set data = excluded.data", [JSON.stringify({ reach: 2, turn: 900000, spots: liveSpots })]);
  const was = await cat();

  // ── a pot on a tile the export closes, and one on open ground ──
  const closed = "46,58", open = [44, 44];
  ok(!!T2.moves[closed], "the lantern's new tile is closed in the code");
  const member = (await one("select id from public.profiles order by id offset 1")).id;
  await db.query("delete from public.town_pots");
  await db.query(`insert into public.town_pots(member_id,dish,helpings,x,y,tok,set_at,feast,marks) values ($1,'stew',2,46,58,false,0,false,'{}'), ($1,'stew',2,$2,$3,false,0,false,'{}')`, [member, open[0], open[1]]);

  // ── run it, the way the SQL editor may send it, then again ──
  await db.exec(text.replaceAll("\n", "\r\n"));
  const after = await cat();
  await db.exec(text);
  eq(await cat(), after, "a second run changes nothing");

  // ── the catalog: its town's fishing places follow the code, and nothing else moved ──
  const kept = await one("select parts, taken from town.map_parts where map = 'town2'");
  eq(kept.taken, "code", "the editor's town's parts are the code's");
  for (const k of Object.keys(T2)) eq(kept.parts[k], T2[k], `its ${k} as the code makes them`);
  const laid = await one("select town.catalog_town_parts() r");
  for (const k of Object.keys(laid.r)) eq(laid.r[k], T2[k], `the catalog's ${k} is the town's as it stands`);
  for (const key of Object.keys(was)) {
    if (key === "fishing" || key === "boards") continue;
    eq(after[key], was[key], `catalog row ${key} is as it was`);
  }
  eq({ ...after.fishing, places: null }, { ...was.fishing, places: null }, "of the fishing row, only its places");
  eq(after.insects.haunts, was.insects.haunts, "the insects' haunts stay to the last perch");
  const farAway = (k) => Number(k.split(",")[0]) >= 128;
  eq(Object.keys(after.fishing.places).filter(farAway).sort(), Object.keys(was.fishing.places).filter(farAway).sort(), "the places on other maps are all there");

  // ── the boards: the spots as the code has them, the rest of the row as it was ──
  const spots = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(new URL("./repo-ts-town.mjs", import.meta.url).href)}); const { BOARD_SPOTS } = await import("@/lib/town/board-insects"); process.stdout.write(JSON.stringify(BOARD_SPOTS));`],
    { env: { ...process.env, FC_REPO: process.cwd().split("\\").join("/") }, encoding: "utf8", maxBuffer: 1 << 24 }));
  eq(after.boards.spots, spots, "the boards' spots are the code's");
  eq(after.boards.spots.length, 18, "all eighteen");
  eq({ ...after.boards, spots: null }, { ...was.boards, spots: null }, "of the boards' row, only its spots");
  eq((await one("select data->'spots'->2 s from public.town_catalog where key = 'boards'")).s, { x: 44, y: 31, id: 2, board: "roll", place: "town" }, "the file's own read-back of the moved spot");

  // ── what it says afterwards ──
  eq(await one(`select data->'places' ? '57,73' as a_new_place, data->'places' ? '52,70' as a_gone_place from public.town_catalog where key = 'fishing'`),
    { a_new_place: true, a_gone_place: false }, "the file's own read-back");

  // ── the pots ──
  const pots = await rows("select x, y from public.town_pots order by x");
  eq(pots.length, 2, "both pots are still there");
  ok(!pots.some((p) => p.x === 46 && p.y === 58), "the pot on the closed tile moved", pots);
  ok(pots.every((p) => !T2.moves[`${p.x},${p.y}`]), "both stand on open ground", pots);
  ok(pots.some((p) => p.x === open[0] && p.y === open[1]), "the pot on open ground stayed", pots);

  // ── nobody in a browser reaches the parts ──
  await db.exec("set role anon");
  const refused = await db.query("select * from town.map_parts").then(() => false, () => true);
  await db.exec("reset role");
  ok(refused, "anon cannot read the parts");

  // ── the emergency way back still is one, and forth again ──
  await one("select town.apply_map('classic') r");
  const classic = await one("select town.catalog_town_parts() r");
  ok(JSON.stringify(classic.r.places) !== JSON.stringify(T2.places), "the old town's parts are laid");
  await one("select town.apply_map('town2') r");
  eq(await cat(), after, "back to the old town and forth is to the letter");
  console.log(`v315 dry run: ${checks} checks passed`);
} finally { await db.close(); }
