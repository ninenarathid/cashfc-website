// v307, a giant pulled out together, dry-run: the file runs twice (as checked out on Windows, CR at its line ends, and as
// written); a ripe giant's call, joins, leaves and go against lib/town/giant-pull case by case; reports that claim a
// half-swing not yet come or a broken number refused; two who pull well together bring it out, the helper credited
// (a `giant_help` deed, five helpers' points) and its keeper's pick a fruit more; a stamina once a go each; nobody
// picks a giant that has not been pulled out (the deed a plot offers, and town.pick itself); a go run out is late and
// called again with its crew; anon and a stranger to the town refused.
//   cd <the tree> && FC_REPO=<the tree> V307_BENCH=<a scratch file> node .claude/skills/fc-cash-town/scripts/db/v307.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const GP = await import("@/lib/town/giant-pull");
const { CROPS } = await import("@/lib/town/items");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v307_a_giant_pulled_out_together.sql", BASE = "5568ab2b";
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
const CACHE = process.env.V307_BENCH;
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
let db;
if (CACHE && existsSync(CACHE)) db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
else {
  db = await rewardDB(252);
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  await db.exec(REALTIME);
  const { migration } = await import(pathToFileURL(join(BENCH, "pglite-harness.mjs")).href);
  for (const n of [101, 102]) try { await db.exec(migration(n, { repo: process.env.FC_REPO ?? process.cwd() })); } catch (e) { console.log(`  (v${n}: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  for (let n = 275; n <= 306; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { console.log(`  (v${n} did not replay here: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  }
  if (CACHE) writeFileSync(CACHE, Buffer.from(await (await db.dumpDataDir("none")).arrayBuffer()));
}
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const asOf = (who, role = "authenticated") => async (q, a = []) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
  try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { ok: false, why: `error ${e.code}` }; } finally { await db.exec("reset role"); }
};

try {
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  const after = (await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') order by 1, 2")).map((r) => r.proname + r.d).join();
  await db.exec(sql);
  eq((await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') order by 1, 2")).map((r) => r.proname + r.d).join(), after, "a second run changes no function");

  // ── what it should say afterwards ──
  eq(await one(`select position('giant_help' in pg_get_functiondef('town.work_counts_of(jsonb,text)'::regprocedure)) > 0 as counted,
         position('pull''->>''out' in pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)'::regprocedure)) > 0 as gated,
         position('pull''->>''out' in pg_get_functiondef('town.deed_for(text,jsonb,text,text,bigint,text)'::regprocedure)) > 0 as offered,
         has_function_privilege('anon', 'public.town_giant_pull(text,integer,integer,jsonb)', 'EXECUTE') as anon_may`),
    { counted: true, gated: true, offered: true, anon_may: false }, "what it should say afterwards");
  eq((await one("select town.deed_th('giant_help') r")).r, "ช่วยเพื่อนดึงผักยักษ์", "the deed's words");
  eq((await one("select town.work_counts_of($1::jsonb, 'x') r", [JSON.stringify({ from: "deed", what: "giant_help", thing: "pumpkin", n: 1, doc: { by: "y" } })])).r,
    [{ to: null, line: "helpers", raw: GP.PULL.points }], "five helpers' points, as lib/town/line-points");

  // ── a ripe giant in a bed of m1's ──
  await db.exec("update public.town_knobs set value = 1 where key = 'game_open'");
  const ids = (await rows("select p.id from public.profiles p order by p.id")).map((r) => r.id);
  const members = [];
  for (const id of ids) if ((await asOf(id)("select public.town_giant_pull('look', 0, 0) r"))?.why !== "error 42501") members.push(id);
  console.log(`  ${members.length} of ${ids.length} profiles are let into the town`);
  assert.ok(members.length >= 4, "four members to pull with"); checks++;
  const stranger = ids.find((id) => !members.includes(id));
  const [m1, m2, m3, m4, m5] = members;
  const at = [134, 6], key = at.join(","), cells = [[134, 6], [135, 6], [134, 7], [135, 7]];
  const bed = (await one("select town.bed_of($1, $2) b", at)).b;
  const plant = (more = {}) => ({ by: m1, crop: "pumpkin", sown: Date.now() - (CROPS.pumpkin.hours + 2) * 3_600_000, boost: 0, watered: 0, fed: 0, guard: Date.now() + 86_400_000,
    cured: 0, picked: 0, pickedAt: 0, root: key, footprint: cells.map((c) => c.join(",")), giant: true, ...more });
  const lay = async (more = {}) => {
    await db.query("insert into public.town_beds (bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0", [bed, m1, Date.now()]);
    for (const [x, y] of cells) await db.query("delete from public.town_plots where x = $1 and y = $2", [x, y]);
    for (const [x, y] of cells) await db.query("insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', $4, $5) on conflict (x, y) do update set bed = excluded.bed, soil = excluded.soil, plant = excluded.plant, changed = excluded.changed", [x, y, bed, JSON.stringify(plant(more)), Date.now()]);
  };
  const plotOf = async () => { const r = await one("select soil, plant from public.town_plots where x = $1 and y = $2", at); return { soil: r.soil, plant: r.plant }; };
  const pull = (who, action, hits = []) => asOf(who)("select public.town_giant_pull($1, $2, $3, $4::jsonb) r", [action, ...at, JSON.stringify(hits)]);
  // (the database's moment moved back: a go begun `ms` ago)
  const goBack = async (ms) => { const p = (await plotOf()).plant; p.pull.go = Date.now() - ms; await db.query("update public.town_plots set plant = $3 where x = $1 and y = $2", [...at, JSON.stringify(p)]); };
  const why = (r) => (r?.ok ? "ok" : r?.why);

  await lay();
  eq(why(await pull(m1, "look")), "ok", "a look at the root");
  eq(why(await asOf(m1)("select public.town_giant_pull('open', 135, 6) r")), "none", "only at the root");
  eq(why(await pull(m2, "open")), "theirs", "called only by whoever may pick in the bed");
  let r = await pull(m1, "open");
  eq([r.ok, r.plots[key].plant.pull.crew, r.plots[key].plant.pull.go], [true, [m1], 0], "called by the bed's keeper");
  eq(why(await pull(m1, "open")), "busy", "not called twice");
  eq(why(await pull(m2, "join")), "ok", "a helper joins");
  eq(why(await pull(m2, "join")), "in", "once");
  eq(why(await pull(m3, "join")), "ok", "a second");
  if (m4) eq(why(await pull(m4, "join")), "ok", "a third");
  if (m5) eq(why(await pull(m5, "join")), "full", "no fourth helper");
  eq(why(await pull(m3, "leave")), "ok", "a helper leaves");
  eq((await plotOf()).plant.pull.crew, [m1, m2, ...(m4 ? [m4] : [])], "and is gone from the crew");
  eq(why(await pull(m2, "go")), "theirs", "started by the caller only");
  eq(why(await pull(m1, "hits", [0])), "shut", "no report before the go");
  eq(why(await pull(m1, "go")), "ok", "started");
  eq(why(await pull(m3, "join")), "shut", "nobody joins once it has started");
  eq(why(await pull(m3, "hits", [0])), "crew", "a report from outside the crew");
  eq(why(await pull(m1, "hits", [0])), "none", "a half-swing not yet come");
  await goBack(GP.PULL.count + 9 * GP.PULL.swing);
  eq(why(await pull(m1, "hits", [1.5])), "none", "a broken number");
  eq(why(await pull(m1, "hits", "[0]")), "none", "not a list");
  const stamina = async (m) => (await one("select doc->'stamina' s from public.town_purses where member_id = $1", [m])).s;
  const s1 = await stamina(m1);
  r = await pull(m1, "hits", [0, 1, 2, 3]);
  eq([r.ok, r.plots[key].plant.pull.hits[m1], r.plots[key].plant.pull.paid], [true, [0, 1, 2, 3], [m1]], "a report kept, and paid for");
  r = await pull(m1, "hits", [2, 3, 4, 5, 6, 7]);
  eq([r.plots[key].plant.pull.hits[m1], r.plots[key].plant.pull.paid, r.plots[key].plant.pull.out], [[0, 1, 2, 3, 4, 5, 6, 7], [m1], 0], "merged, paid once, still in the ground (8 of 24)");
  const s2 = await stamina(m1);
  eq(s2.left, (s1?.left ?? 100) - 1, "one stamina the go");
  eq(why(await pick()), "unripe", "nobody picks it before it is out");
  if (m4) { r = await pull(m4, "hits", [0]); eq(r.plots[key].plant.pull.out, 0, "a third hand, one pull"); }
  // the twin: what the page's rules say of the same reports
  const twin = (p, who, hits) => GP.giantPull("hits", key, p, who, who === m1, { stamina: { day: -1, left: 0 }, bag: [] }, Date.now(), hits);
  const before = await plotOf();
  r = await pull(m2, "hits", [0, 1, 2, 3, 4, 5, 6, 7]);
  const t2 = twin(before, m2, [0, 1, 2, 3, 4, 5, 6, 7]);
  const got = r.plots[key].plant.pull;
  eq([got.hits, got.bonus, got.helped, got.out > 0], [t2.plot.plant.pull.hits, t2.plot.plant.pull.bonus, t2.plot.plant.pull.helped, t2.plot.plant.pull.out > 0], "the database and the page agree on the pull");
  eq([got.out > 0, got.bonus, got.helped], [true, 1, [m2]], "out together: the helper who pulled well credited (the one-pull hand not)");
  eq((await rows("select member_id, thing, doc->>'by' as by from public.town_deeds where what = 'giant_help'")).map((d) => [d.member_id, d.thing, d.by]), [[m2, "pumpkin", m1]], "a giant_help deed in the helper's name");
  eq(why(await pull(m2, "hits", [8])), "done", "nothing after it is out");
  eq(why(await pull(m1, "open")), "done", "nor a new call");
  // the farm: the deed a plot offers, and the pick
  const deed = async (p) => (await one("select town.deed_for($1, $2::jsonb, null, $3, $4, $3) r", [key, JSON.stringify(p), m1, Date.now()])).r;
  eq(await deed(await plotOf()), "pick", "a giant pulled out is offered for picking");
  const p = await pickAs();
  const base = (await one("select town.yield_of($1, $2::jsonb, null) r", [key, JSON.stringify((await plotOf()).plant)])).r;
  eq(p.got, [["pumpkin", base * 6 + 1]], "six times and a fruit for the helper");
  await lay();
  eq(await deed(await plotOf()), null, "a giant not pulled out offers no pick");
  eq(why(await pick()), "unripe", "and town.pick refuses it");
  // a go that ran out: late, and called again with its crew
  await pull(m1, "open"); await pull(m2, "join"); await pull(m1, "go");
  await goBack(GP.PULL.count + GP.PULL.swings * GP.PULL.swing + GP.PULL.grace + 2000);
  eq(why(await pull(m2, "hits", [0])), "late", "a report after the go and its grace");
  r = await pull(m1, "open");
  eq([r.ok, r.plots[key].plant.pull.crew, r.plots[key].plant.pull.go], [true, [m1, m2], 0], "called again, the crew kept");
  eq(why(await pull(m1, "leave")), "ok", "the caller's leaving ends it");
  eq((await plotOf()).plant.pull, undefined, "no call left");
  // strangers
  eq(why(await asOf(null, "anon")("select public.town_giant_pull('look', 134, 6) r")), "error 42501", "anon refused");
  if (stranger) eq(why(await asOf(stranger)("select public.town_giant_pull('open', 134, 6) r")), "error 42501", "a stranger to the town refused");

  async function pick() { const pl = await plotOf(); return (await one("select town.pick($1, $2::jsonb, $3::jsonb, true, null, $4, $5) r", [key, JSON.stringify(await purseOf(m1)), JSON.stringify(pl), Date.now(), m1])).r; }
  async function pickAs() { return pick(); }
  async function purseOf(m) { return (await one("select town.purse_of($1, false) p", [m])).p; }
  console.log(`v307: ${checks} checks passed${failed ? `, ${failed} FAILED` : ""}.`);
  if (failed) process.exitCode = 1;
} catch (e) { console.error(e.message, e.detail ?? "", e.where ?? "", e.stack?.split("\n").slice(1, 4).join(" | ")); process.exitCode = 1; } finally { await db.close(); }
