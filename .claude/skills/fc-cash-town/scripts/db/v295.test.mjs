// v295, the editor's town and the switch back, dry-run on the stand-in (no live database is touched): the file runs as
// checked out on Windows and again as written (the second run changes nothing); run, it changes no catalog row and
// shows the editor's town to the admins only; opened to everybody, the catalog's town parts are the editor's town's
// as the code makes them and nothing else of it moves; members' pots and water relays on a tile the new town closes go
// to the nearest open tile, the feast table's to its table; switched back, the catalog is to the letter what it was;
// and only an admin may switch it, from the town's chat.
//   cd <the tree> && FC_REPO=<a tree whose supabase/ has v179–v205, the shared one> node .claude/skills/fc-cash-town/scripts/db/v295.test.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";

const FILE = "supabase/v295_the_editors_town.sql";
const BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
const parts = (map) => JSON.parse(execFileSync(process.execPath, [".claude/skills/fc-cash-town/scripts/db/town2-parts.mjs"],
  { env: { ...process.env, FC_REPO: process.cwd().split("\\").join("/"), TOWN_MAP: map }, encoding: "utf8", maxBuffer: 1 << 26 }));
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const ok = (c, what, d) => { assert.ok(c, `${what} ${d === undefined ? "" : JSON.stringify(d)}`); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const cat = async () => Object.fromEntries((await rows("select key, data from public.town_catalog order by key")).map((r) => [r.key, r.data]));
const sw = async () => one("select map, catalog from public.town_map_switch");
const T2 = parts("town2"), OLD = parts("classic");
const text = readFileSync(FILE, "utf8").replaceAll("\r\n", "\n");
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 294; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  ok(!!(await one("select to_regprocedure('public.town_set_chat_reach(text)') f")).f, "v294 is in the stand-in");
  const ids = (await rows("select p.id from public.profiles p order by p.id")).map((r) => r.id);
  const [admin, member] = ids;
  await db.query("update public.profiles set is_admin = (id = $1)", [admin]);
  const as = async (who, q, a = []) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
    await db.query("select set_config('request.jwt.claim.role',$1,false)", [who ? "authenticated" : "anon"]);
    await db.exec(`set role ${who ? "authenticated" : "anon"}`);
    try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
  };
  const mapOf = (who) => as(who, "select public.town_map() r");

  // ── the file, twice ──
  const was = await cat();
  await db.exec(text.replaceAll("\n", "\r\n"));
  const first = await cat();
  await db.exec(text);
  eq(await cat(), first, "a second run changes nothing");
  eq(first, was, "running it changes no catalog row");
  eq(await sw(), { map: "town2-admins", catalog: "classic" }, "the admins see the editor's town, the catalog is the old town's");
  eq(await mapOf(admin), "town2", "an admin is given the editor's town");
  eq(await mapOf(member), "classic", "a member the old one");
  eq(await mapOf(null), "classic", "and somebody signed out the old one");
  eq((await one("select town.reward_relay_place('[79,79]'::jsonb) a, town.reward_relay_place('[80,10]'::jsonb) b, town.reward_relay_place('[239,85]'::jsonb) c")), { a: "town", b: null, c: "farm" }, "a relay may stand anywhere in the 80-wide town, the farm as before");

  // ── the catalog's town parts were the old town's as the code makes them ──
  const now = await one("select town.catalog_town_parts() r");
  for (const k of Object.keys(now.r)) eq(now.r[k], OLD[k], `the live ${k} is the old town's as the code has it`);

  // ── members' things in town before the switch ──
  // a pot on the old town's plaza where the editor's town has its fountain, another on open ground in both, a feast pot
  const fountain = [39, 41], open = [36, 44];
  ok(!!T2.moves[fountain.join(",")] && !T2.moves[open.join(",")], "the fountain is closed in the editor's town, the plaza not");
  await db.query("delete from public.town_pots");
  await db.query(`insert into public.town_pots(member_id,dish,helpings,x,y,tok,set_at,feast,marks) values
    ($1,'stew',3,$2,$3,false,0,false,'{}'), ($1,'stew',2,$4,$5,false,0,false,'{}'), ($1,'stew',1,46,48,false,0,true,'{}')`, [member, ...fountain, ...open]);
  await db.query(`update public.town_purses set doc = jsonb_set(coalesce(doc,'{}'::jsonb), '{professionRewards}', jsonb_build_object('relay', jsonb_build_object('item','x','at','[39,41]'::jsonb,'water',0))) where member_id = $1`, [member]);
  const purse = await one("select count(*)::int n from public.town_purses where member_id = $1", [member]);

  // ── only an admin switches ──
  for (const who of [member, null]) {
    const r = await as(who, "select public.town_set_map('town2') r");
    ok(r?.error || r?.ok === false, "a member or somebody signed out cannot switch", r);
  }
  eq(await sw(), { map: "town2-admins", catalog: "classic" }, "nothing switched");
  const bad = await as(admin, "select public.town_set_map('everyone') r");
  ok(bad?.ok === false && bad?.why === "map", "an admin's wrong word changes nothing", bad);

  // ── opened to everybody ──
  const opened = await as(admin, "select public.town_set_map('town2') r");
  ok(opened?.ok === true && opened.catalog === "town2", "an admin opens the editor's town", opened);
  eq(await mapOf(member), "town2", "a member is given the editor's town");
  const t2 = await cat();
  const laid = await one("select town.catalog_town_parts() r");
  for (const k of Object.keys(laid.r)) eq(laid.r[k], T2[k], `the catalog's ${k} is the editor's town's`);
  for (const key of Object.keys(was)) if (!["preparation", "fishing", "cooking", "insects", "yard", "box", "ground", "forge", "rewards"].includes(key)) eq(t2[key], was[key], `${key} untouched`);
  // (and within the rows touched, what is not the town's is as it was)
  const notTown = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !(+k.split(",")[0] < 128 && +k.split(",")[1] >= 0 && +k.split(",")[1] < 112)));
  eq(notTown(t2.fishing.places), notTown(was.fishing.places), "the forest's and the mountain's places to fish are as they were");
  eq(t2.insects.haunts.filter((h) => h[1] !== "town"), was.insects.haunts.filter((h) => h[1] !== "town"), "the farm's and the forest's haunts are as they were");
  eq(t2.insects.haunts.length, was.insects.haunts.length, "every haunt keeps its number");
  eq(t2.ground.maps.slice(1), was.ground.maps.slice(1), "the other maps' ground boxes are as they were");
  eq((await one("select stations r from (select data->'stations' stations from public.town_catalog where key='preparation') s")).r.slice(-1), was.preparation.stations.slice(-1), "the forest camp's fire is still a station");
  const pots = await rows("select x, y, feast from public.town_pots order by id");
  eq(pots[1], { x: open[0], y: open[1], feast: false }, "a pot on open ground stays");
  eq(pots[2], { x: T2.feastTile[0], y: T2.feastTile[1], feast: true }, "the feast table's pot is on the new feast table");
  ok(!T2.moves[`${pots[0].x},${pots[0].y}`] && Math.hypot(pots[0].x - fountain[0], pots[0].y - fountain[1]) < 4, "the pot where the fountain now stands went to the nearest open tile", pots[0]);
  ok(opened.moved.pots === 1, "one pot moved", opened.moved);
  if (purse.n) {
    const relay = await one("select doc->'professionRewards'->'relay'->'at' r from public.town_purses where member_id = $1", [member]);
    ok(!T2.moves[relay.r.join(",")], "the water relay on the fountain's tile went to open ground", relay.r);
  }
  const kept = await one("select taken, parts from town.map_parts where map = 'classic'");
  eq(kept.taken, "live", "the old town's parts were kept as the catalog held them");

  // ── a second time the same: nothing more ──
  await as(admin, "select public.town_set_map('town2') r");
  eq(await cat(), t2, "switching to the town it is changes nothing");

  // ── back to the old town, at once ──
  const back = await one("select town.apply_map('classic') r");
  ok(back.r.ok && back.r.catalog === "classic", "the SQL editor's line switches back", back.r);
  const again = await cat();
  eq(again, was, "the catalog is to the letter what it was");
  eq(await mapOf(admin), "classic", "everybody has the old town again");
  eq((await rows("select x, y, feast from public.town_pots order by id"))[2], { x: was.cooking.feast.tile[0], y: was.cooking.feast.tile[1], feast: true }, "the feast pot is back on the old feast table");

  // ── and round once more: still exact ──
  await one("select town.apply_map('town2') r");
  eq(await one("select town.catalog_town_parts() r").then((r) => r.r), laid.r, "the editor's town again, the same parts");
  await one("select town.apply_map('town2-admins') r");
  eq(await cat(), was, "back to the admins only: the old town's catalog, to the letter");
  eq(await sw(), { map: "town2-admins", catalog: "classic" }, "and the switch says so");

  // ── the tables and the rule are nobody's to reach ──
  for (const q of ["select * from public.town_map_switch", "select * from town.map_parts", "select town.apply_map('classic')"]) {
    const r = await as(member, `select (${q.startsWith("select *") ? `select count(*) from (${q}) x` : q}) r`);
    ok(!!r?.error, `a member cannot: ${q}`, r);
  }
  const perms = await one(`select has_function_privilege('anon','public.town_map()','execute') a,
    has_function_privilege('authenticated','public.town_set_map(text)','execute') b,
    not has_function_privilege('anon','public.town_set_map(text)','execute') c,
    not has_function_privilege('authenticated','town.apply_map(text,uuid)','execute') d`);
  eq(perms, { a: true, b: true, c: true, d: true }, "who may call what");
  console.log(`v295 dry run: ${checks} checks passed`);
} finally { await db.close(); }
