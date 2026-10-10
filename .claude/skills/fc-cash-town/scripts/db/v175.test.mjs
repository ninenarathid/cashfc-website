import { readFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
import { defsOf } from "./build-v164.mjs";
import { changed } from "./build-v159.mjs";
import { bareWrites } from "./bare-writes.mjs";

const root = process.env.FC_REPO;
const file = (n) => join(root, ".claude/skills/fc-cash-town/scripts/db", n);
const source = readFileSync(file("v175_draft.sql"), "utf8");
const t = await standIn();
const run = (q) => t.sql(q).then((r) => r.rows);
const one = async (q, args = []) => (await t.sql(q, args)).rows[0];
const settle = (v) => Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : typeof v === "bigint" ? Number(v) : v;
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => v === null ? null : typeof v === "object" ? JSON.stringify(v) : v;

try { await t.db.exec(source); t.check("v174 guard", false); } catch (e) { t.check("v174 guard", /v174/.test(e.message), e.message); await t.db.exec("rollback"); }
await t.db.exec(readFileSync(join(root, "supabase/v174_the_blacksmith_his_great_fire_and_the_older_tools.sql"), "utf8"));
const old = await defsOf(run);
await t.runTwice(source, "v175");
const now = await defsOf(run);
const lines = JSON.parse(readFileSync(file("v175.lines.json"), "utf8"));
for (const [mark, sig, changes] of lines) t.check(`${sig}: only marked changes`, now[sig] === changed(old[sig], mark, changes));
const owned = new Set(lines.map(([,s]) => s));
t.check("no unrelated function changed", Object.keys(old).every((s) => owned.has(s) || old[s] === now[s]));
t.check("no bare table writes", (await bareWrites(run)).length === 0);
const open = await run(`select p.oid::regprocedure::text sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'town' and (has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('anon',p.oid,'execute'))`);
t.check("private helpers remain closed", open.length === 0, open);
const cat = JSON.parse(readFileSync(join(process.cwd(), "now175/catalog.json"), "utf8"));
t.check("forge catalog exactly matches code", same((await one("select data from public.town_catalog where key='forge'")).data, cat.forge));
const calls = JSON.parse(readFileSync(file("v174.smith.calls.json"), "utf8"));
const vectors = JSON.parse(readFileSync(join(process.cwd(), "now175/vectors-smith.json"), "utf8"));
const tally = new Map();
for (const v of vectors) {
  const result = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  tally.set(v.fn, result); result.n++;
  let got, error;
  try { got = (await t.db.query(`select ${calls[v.fn]} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
  if (error || !same(got ?? null, v.want)) { result.bad++; result.first ??= { args: v.args, want: v.want, got: error ?? got }; }
}
for (const [fn,r] of tally) t.check(`${fn}: ${r.n} code/SQL cases`, r.bad === 0, r.bad ? `${r.bad}: ${JSON.stringify(r.first).slice(0,1700)}` : "");

const NOW = Date.parse("2026-10-10T09:00:00+07:00"), dawn = Date.parse("2026-10-11T05:00:00+07:00");
const setClock = (at) => t.db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$ select ${at}::bigint $$`);
await setClock(NOW);
await t.sql("update public.town_knobs set value=1 where key in ('game_open','far_open','smith_open')");
const bag = [{item:"pick",n:1,plus:9,opts:["pkPeek","pkSteady"]},{item:"axe",n:1,plus:9,opts:["axDry","axKeen"]},{item:"oreSilver",n:20},{item:"timber",n:50},null,null,null,null,null,null];
const seed = async (id, extra = {}) => t.sql(`insert into public.town_purses(member_id,coins,doc) values($1,100000,town.fresh() || $2::jsonb)
  on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc`, [id, JSON.stringify({bag, ...extra})]);
const ask = async (id, slot) => {
  const r = await t.as(id,"select public.town_smith_try($1::integer) r",[slot]);
  if (r.error) return r;
  return r.rows[0].r;
};
const purse = async (id) => (await one("select town.purse_of($1::uuid,false) p",[id])).p;
await seed(U.m1); await seed(U.m2);
const first = await ask(U.m1,0), saved = await purse(U.m1);
t.check("accepted top attempt persists member counter", first.ok === true && saved.forgeDay === Math.floor((NOW+7200000)/86400000), first);
const repeat = await ask(U.m1,1), afterRepeat = await purse(U.m1);
t.check("another tool/device cannot spend twice, no extra charge", repeat.ok === false && repeat.why === "daily" && same(saved,afterRepeat), repeat);
t.check("other member has independent right", (await ask(U.m2,1)).ok === true);
await setClock(dawn-1);
t.check("before dawn still refused", (await ask(U.m1,1)).why === "daily");
await setClock(dawn);
t.check("at dawn allows another tool", (await ask(U.m1,1)).ok === true);
await seed(U.m1,{bag:[bag[0],...Array(9).fill(null)]});
const short = await ask(U.m1,0);
t.check("missing materials do not spend right", short.ok === false && short.why === "ore" && (await purse(U.m1)).forgeDay === undefined, short);
await seed(U.m1,{forgeDay:0});
const rpc = await t.as(U.m1,"select public.town_smith() r");
t.check("daily right is told through real authenticated RPC", rpc.rows?.[0]?.r?.smith?.fire?.daily?.used === false, rpc);
t.check("anonymous cannot forge", (await ask("anon",0)).code === "42501");
// Mutations must break the security story, not merely a textual assertion.
const trySig = "town.forge_try_fired(jsonb, jsonb, integer, double precision, text, text, bigint, double precision)";
const original = now[trySig];
await setClock(NOW); await seed(U.m1,{forgeDay:Math.floor((NOW+7200000)/86400000)});
await t.db.exec(original.replace("CREATE OR REPLACE", "CREATE OR REPLACE").replace("if needs then\n    -- v175: the locked purse", "if false then\n    -- v175: the locked purse"));
t.check("mutation removing daily gate is caught by RPC story", (await ask(U.m1,0)).ok === true);
await t.db.exec(original);
await seed(U.m1);
await t.db.exec(original.replace("if needs then did := did || jsonb_build_object('purse'", "if false then did := did || jsonb_build_object('purse'"));
await ask(U.m1,0);
t.check("mutation removing persisted counter is caught by RPC story", (await ask(U.m1,1)).ok === true);
await t.db.exec(original);
t.done();
await t.db.close();
