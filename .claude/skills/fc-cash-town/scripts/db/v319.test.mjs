// v319, a pack on the cloud ram, dry-run: the file runs twice (CR at its line ends, and as written) and the second run
// changes no function; the column is closed as its table is; town.pack_put and town.pack_take are lib/town/ram-pack's
// packPut and packTake case by case (the ram following or not, part of a stack, a tool, an empty slot, a wrong number, a
// full pack, a full bag); as a member, a thing goes in and comes back with the ram on, stays shut in with another
// familiar, each deed is written down and the box's own slots in the same row are untouched; another member sees an
// empty pack of their own; anon may call none of it.
//   cd <the tree> && FC_REPO=<the tree> V319_BENCH=<a scratch file> node .claude/skills/fc-cash-town/scripts/db/v319.test.mjs
//   (or from a kept bench: V319_FROM=E:/NinenineProject/fcnext-codex-bench/v317-bench.bin V319_FROM_THROUGH=316)
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { packPut, packTake, newPack } = await import("@/lib/town/ram-pack");
const { newPurse } = await import("@/lib/town/trade");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v319_a_pack_on_the_cloud_ram.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); } };
const REALTIME = `
 create schema if not exists realtime;
 grant usage on schema realtime to anon, authenticated;
 create table if not exists realtime.messages (id bigint generated always as identity primary key, extension text not null);
 alter table realtime.messages enable row level security;
 grant select, insert on realtime.messages to anon, authenticated;
 create or replace function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;`;
const CACHE = process.env.V319_BENCH;
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
let db;
// (a bench an earlier dry run kept, `V319_FROM`, through `V319_FROM_THROUGH`: v317's v317-bench.bin is through v316)
const FROM = process.env.V319_FROM, THROUGH = Number(process.env.V319_FROM_THROUGH ?? 0);
if (CACHE && existsSync(CACHE)) db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
else if (FROM) {
  db = new PGlite({ loadDataDir: new Blob([readFileSync(FROM)]) });
  for (let n = THROUGH + 1; n <= 318; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { console.log(`  (v${n} did not replay here: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  }
  if (CACHE) writeFileSync(CACHE, Buffer.from(await (await db.dumpDataDir("none")).arrayBuffer()));
} else {
  db = await rewardDB(252);
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  await db.exec(REALTIME);
  const { migration } = await import(pathToFileURL(join(BENCH, "pglite-harness.mjs")).href);
  for (const n of [101, 102]) try { await db.exec(migration(n, { repo: process.env.FC_REPO ?? process.cwd() })); } catch (e) { console.log(`  (v${n}: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  for (let n = 275; n <= 318; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { console.log(`  (v${n} did not replay here: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  }
  if (CACHE) writeFileSync(CACHE, Buffer.from(await (await db.dumpDataDir("none")).arrayBuffer()));
}
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const fns = async () => (await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'town' order by 1, 2")).map((r) => r.proname + r.d).join();
/** A call as a member (`sub`) or as anon, with the role and the claims PostgREST would set. */
const as = async (who, q, a = []) => {
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who === "anon" ? "" : who]);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(who === "anon" ? { role: "anon" } : { sub: who, role: "authenticated" })]);
    await db.exec(`set role ${who === "anon" ? "anon" : "authenticated"}`);
    return { row: (await db.query(q, a)).rows[0] };
  } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};

try {
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  const first = await fns();
  await db.exec(sql);
  eq(await fns(), first, "a run again changes no function");

  // ── closed as its table is ──
  eq((await one("select data_type, column_default from information_schema.columns where table_schema = 'public' and table_name = 'town_boxes' and column_name = 'pack'")), { data_type: "jsonb", column_default: "'[]'::jsonb" }, "the column");
  eq((await one("select c.relrowsecurity as closed, (select count(*)::int from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = 'town_boxes' and g.grantee in ('anon', 'authenticated')) as grants from pg_class c where c.oid = 'public.town_boxes'::regclass")), { closed: true, grants: 0 }, "the table stays closed");
  eq((await one(`select has_function_privilege('authenticated', 'public.town_pack_put(integer, integer)', 'execute') as put, has_function_privilege('anon', 'public.town_pack_put(integer, integer)', 'execute') as put_anon,
    has_function_privilege('anon', 'public.town_pack()', 'execute') as read_anon, has_function_privilege('anon', 'public.town_pack_take(integer, integer)', 'execute') as take_anon,
    (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`)),
    { put: true, put_anon: false, read_anon: false, take_anon: false, open: 0 }, "who may call what");
  eq((await one("select town.deed_th('pack_put') as put, town.deed_th('pack_take') as take, town.deed_th('box_put') as box")), { put: "เก็บของใส่กระเป๋าแกะ", take: "หยิบของจากกระเป๋าแกะ", box: "เก็บของเข้ากล่อง" }, "the tally's words");

  // ── the rules are the page's, case by case ──
  const gifts = (worn) => ({ had: ["famCloudRam", "famSquirrel"], charms: [], owed: 0, familiar: worn ? "famCloudRam" : "famSquirrel", used: {} });
  const bag = [{ item: "worm", n: 7 }, { item: "rod", n: 1 }, { item: "dough", n: 3 }, ...Array(7).fill(null)];
  const full = { things: Array.from({ length: 10 }, () => ({ item: "rod", n: 1 })) };
  const fullBag = Array.from({ length: 10 }, () => ({ item: "rod", n: 1 }));
  const cases = [
    ["put part of a stack", "put", { bag, worn: true }, newPack(), 0, 4],
    ["put a tool", "put", { bag, worn: true }, newPack(), 1, 1],
    ["put with another familiar", "put", { bag, worn: false }, newPack(), 0, 1],
    ["put from an empty slot", "put", { bag, worn: true }, newPack(), 6, 1],
    ["put too many", "put", { bag, worn: true }, newPack(), 0, 9],
    ["put into a full pack", "put", { bag, worn: true }, full, 2, 1],
    ["take back", "take", { bag, worn: true }, { things: [{ item: "worm", n: 4 }] }, 0, 4],
    ["take with another familiar", "take", { bag, worn: false }, { things: [{ item: "worm", n: 4 }] }, 0, 4],
    ["take into a full bag", "take", { bag: fullBag, worn: true }, { things: [{ item: "worm", n: 4 }] }, 0, 1],
  ];
  for (const [what, how, p, pack, slot, n] of cases) {
    const purse = { ...newPurse(), bag: p.bag, gifts: gifts(p.worn) };
    const mine = (how === "put" ? packPut : packTake)(purse, pack, slot, n);
    const theirs = (await one(`select town.pack_${how}($1::jsonb, $2::jsonb, $3, $4) r`, [JSON.stringify(purse), JSON.stringify(pack), slot, n])).r;
    eq(theirs.ok, mine.ok, `${what}: ok`);
    if (mine.ok) { eq(theirs.pack, JSON.parse(JSON.stringify(mine.pack)), `${what}: the pack`); eq(theirs.purse.bag, JSON.parse(JSON.stringify(mine.purse.bag)), `${what}: the bag`); eq([theirs.item, theirs.n], [mine.item, mine.n], `${what}: what moved`); }
    else eq(theirs.why, mine.why, `${what}: why`);
  }

  // ── as members ──
  const me = (await one("select id from public.profiles where is_admin order by id limit 1")).id, other = (await one("select id from public.profiles where id <> $1 order by is_admin desc, id limit 1", [me])).id;
  const keep = async (who, worn) => { await db.query("insert into public.town_purses (member_id, coins, doc) values ($1, 0, '{}'::jsonb) on conflict (member_id) do nothing", [who]); const p = (await one("select town.purse_of($1, false) p", [who])).p; await db.query("select town.keep_purse($1, $2::jsonb)", [who, JSON.stringify({ ...p, bag, gifts: gifts(worn) })]); };
  await keep(me, true);
  await db.query("insert into public.town_boxes (member_id, things) values ($1, $2::jsonb) on conflict (member_id) do update set things = excluded.things", [me, JSON.stringify([{ item: "dough", n: 2 }])]);
  const deeds = async (what) => Number((await one("select count(*) n from public.town_deeds where member_id = $1 and what = $2", [me, what])).n);
  const put = await as(me, "select public.town_pack_put(0, 4) r");
  eq(put.row?.r?.ok, true, "a member puts four worms in");
  eq(put.row?.r?.pack?.things?.[0], { item: "worm", n: 4 }, "…and the answer has the pack");
  eq((await one("select town.purse_of($1, false)->'bag'->0 s", [me])).s, { item: "worm", n: 3 }, "…the bag keeps three");
  eq(await deeds("pack_put"), 1, "…and the deed is written");
  eq((await one("select things from public.town_boxes where member_id = $1", [me])).things, [{ item: "dough", n: 2 }], "the box's own slots are untouched");
  const theirs = await as(other, "select public.town_pack() r");
  eq(theirs.row?.r?.pack?.things?.every((s) => s === null) ?? theirs.error, true, "another member sees an empty pack of their own");
  await keep(me, false);
  const shut = await as(me, "select public.town_pack_take(0, 4) r");
  eq([shut.row?.r?.ok, shut.row?.r?.why], [false, "shut"], "with another familiar the pack is shut");
  eq((await as(me, "select public.town_pack() r")).row?.r?.pack?.things?.[0], { item: "worm", n: 4 }, "…and what is in it stays");
  await keep(me, true);
  const back = await as(me, "select public.town_pack_take(0, 4) r");
  eq(back.row?.r?.ok, true, "with the ram again it comes out");
  eq(await deeds("pack_take"), 1, "…and that deed is written");
  for (const q of ["select public.town_pack()", "select public.town_pack_put(0, 1)", "select public.town_pack_take(0, 1)", "select town.pack_of(gen_random_uuid())"]) {
    eq(/permission denied/.test((await as("anon", q)).error ?? ""), true, `anon may not: ${q}`);
  }
  console.log(failed ? `v319: ${failed} FAILED, ${checks} passed` : `v319: ${checks} checks passed.`);
  if (failed) process.exitCode = 1;
} catch (e) { console.error(e.message, e.where ?? ""); process.exitCode = 1; } finally { await db.close(); }
