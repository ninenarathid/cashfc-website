/*
 * v166 (every go at a board, whatever its end: `town_tries`, `town_try`, `town.tries_tally`) tried against the
 * stand-in database as it is after the last file that ran (stand-in.mjs's snapshot, in memory: nothing is written
 * anywhere).
 *
 *   node v166.test.mjs [the worktree's root]          (MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the draft> v166.test.mjs v166.mutations.mjs
 *
 * It reads the draft beside this file (`v166_draft.sql`) while there is one, then supabase/'s in the root given, then
 * history once it has run. The file adds a closed table, one function a member's page calls and a count for the SQL
 * editor, and writes nothing again. So what is held is: nothing that was there is touched; a go told is kept as it
 * was told, bounded; what is no board's word keeps nothing; one member leaves no more than forty lines a minute;
 * nothing hangs on a line (no play, no deed, no point, no purse moves); and who may call, read and count is who
 * should.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";

const [root] = process.argv.slice(2);
const beside = new URL("./v166_draft.sql", import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v166_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : existsSync(beside) ? readFileSync(beside, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(166));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const t0 = Date.now();
const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
const TRY = "public.town_try(text, text, text, text, boolean, integer, integer, integer, double precision)";
/** As PostgREST calls it: by the names of the words sent, and only those. What it answers, or the error it stops with. */
const tell = async (who, words) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.town_try(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
const GO = (more = {}) => ({ p_game: "farming", p_board: "pouring", p_what: "water", p_how: "done", p_spent: true, p_need: 2, p_hits: 2, p_misses: 1, p_secs: 3.5, ...more });
const linesOf = async (who) => rows(`select t.game, t.board, t.what, t.how, t.spent, t.need, t.hits, t.misses, t.secs::float8 as secs, t.doc from public.town_tries t where t.member_id = $1 order by t.id`, [who]);
const lines = async () => (await one(`select count(*)::int as n from public.town_tries`)).n;
/** Every function of the town's but the two the file adds: its text and who may call it. */
const texts = async () => rows(`select p.oid::regprocedure::text as name, md5(pg_get_functiondef(p.oid)) as body, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') and p.proname not in ('town_try', 'tries_tally') order by 1`);
/** What else is kept: the catalog, the knobs, how many tables, policies and triggers there are, and every trigger by name. */
const kept = async () => one(`select (select md5(string_agg(c.key || c.data::text, '|' order by c.key)) from public.town_catalog c) as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname <> 'town_tries') as tables,
  (select count(*)::int from pg_policies) as policies,
  (select string_agg(g.tgname || '@' || g.tgrelid::regclass::text, ',' order by 1) from pg_trigger g where not g.tgisinternal) as triggers`);
/** What a line here must never move: the plays, the deeds, the lines of work, everybody's purse. */
const hangs = async () => one(`select (select count(*)::int from public.town_plays) as plays, (select count(*)::int from public.town_deeds) as deeds,
  (select md5(coalesce(string_agg(w::text, '|' order by w::text), '')) from public.town_work w) as work,
  (select md5(coalesce(string_agg(p.member_id::text || p.doc::text, '|' order by p.member_id), '')) from public.town_purses p) as purses`);

t.section("before it");
t.check("there is no such table and no such function yet", (await one(`select to_regclass('public.town_tries') is null and to_regprocedure('${TRY}') is null as none`)).none);
const textsWas = await texts(), keptWas = await kept();

t.section("where what it stands on is not there, it stops at its first line and says why");
await t.sql(`alter function town.under(uuid) rename to under_away`);
const early = await t.db.exec(FILE).then(() => null, (e) => e.message ?? String(e));
t.check("where the rule it stands on is not there, it stops at its first line and says why", !!early && /v166 stands on/.test(early) && (await one(`select to_regclass('public.town_tries') is null as none`)).none, early);
await t.sql(`alter function town.under_away(uuid) rename to under`);

t.section("v166, twice over");
await t.runTwice(FILE, "v166");
const table = await one(`select c.relrowsecurity as closed, has_table_privilege('authenticated', 'public.town_tries', 'select') as member_reads,
  has_table_privilege('authenticated', 'public.town_tries', 'insert') as member_writes, has_table_privilege('anon', 'public.town_tries', 'select') as anon_reads
  from pg_class c where c.oid = 'public.town_tries'::regclass`);
t.check("the table is closed: row security on (what the file's foot says it should say)", table.closed === true, table);
t.check("…and no member and nobody signed out is granted anything on it (the foot's second and third words)", table.member_reads === false && table.member_writes === false && table.anon_reads === false, table);
const grants = await rows(`select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'town_tries' and grantee in ('anon', 'authenticated')`);
t.check("…not one privilege of any kind", grants.length === 0, grants);
const fn = await one(`select has_function_privilege('anon', '${TRY}', 'execute') as anon, has_function_privilege('authenticated', '${TRY}', 'execute') as member,
  has_function_privilege('authenticated', 'town.tries_tally(timestamptz, timestamptz)', 'execute') as the_tally,
  (select p.prosecdef from pg_proc p where p.oid = '${TRY}'::regprocedure) as definer, (select p.proconfig::text from pg_proc p where p.oid = '${TRY}'::regprocedure) as config`);
t.check("town_try is a member's to call and nobody's who is signed out (the foot)", fn.anon === false && fn.member === true, fn);
t.check("…security definer with its search path set", fn.definer === true && /search_path=public/.test(fn.config ?? ""), fn);
t.check("the count is no browser's to ask (the foot)", fn.the_tally === false, fn);
t.check("there is one town_try", (await rows(`select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'town_try'`)).length === 1);
t.check("no line yet, and the count has none (the foot)", (await lines()) === 0 && (await rows(`select * from town.tries_tally()`)).length === 0);
t.check("no other function of the town's is written, dropped, added or given to anybody else", same(await texts(), textsWas), (await texts()).length);
t.check("no other table, no policy, no trigger, no catalog row and no knob is touched", same(await kept(), keptWas), await kept());
t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0);
const fk = await one(`select c.confdeltype as del, c.confrelid::regclass::text as of from pg_constraint c where c.conrelid = 'public.town_tries'::regclass and c.contype = 'f'`);
t.check("a line is its member's: it goes when the member does", fk?.del === "c" && /profiles/.test(fk.of), fk);
t.check("the lines are found by member and newest first (what the forty a minute are counted by)", (await rows(`select 1 from pg_indexes where tablename = 'town_tries' and indexdef like '%(member_id, at DESC)%'`)).length === 1);

t.section("a go told is kept as it was told");
const hangsWas = await hangs();
let did = await tell(U.m1, GO());
t.check("a member's go is kept", did === true && (await lines()) === 1, did);
let mine = await linesOf(U.m1);
t.check("…as it was told: the line of work, the board, what, how, tired, and the board's count", same(mine[0], { game: "farming", board: "pouring", what: "water", how: "done", spent: true, need: 2, hits: 2, misses: 1, secs: 3.5, doc: {} }), mine[0]);
const when = await one(`select abs(extract(epoch from t.at) * 1000 - town.now_ms()) as off from public.town_tries t where t.member_id = $1`, [U.m1]);
t.check("…at the town's clock's moment", Number(when.off) < 5000, when);
did = await tell(U.m1, { p_game: "forest", p_board: null, p_what: "mushrooms", p_how: "left", p_spent: false });
mine = await linesOf(U.m1);
t.check("told in five words only, with no board, it is kept with nothing counted", did === true && same(mine[1], { game: "forest", board: null, what: "mushrooms", how: "left", spent: false, need: 0, hits: 0, misses: 0, secs: 0, doc: {} }), mine[1] ?? did);
const each = [];
for (const game of ["farming", "cooking", "forest", "insects"]) for (const how of ["done", "dropped", "left"]) each.push(await tell(U.m1, GO({ p_game: game, p_how: how, p_board: "steady", p_what: "friedRice_2" })));
t.check("each line of work and each end is kept", each.every((r) => r === true) && (await lines()) === 14, each);
// (a blessing that holds for this member: written into the fountain's row as the fountain writes it)
const fountainWas = (await one(`select doc from public.town_things where key = 'fountain'`))?.doc ?? null;
await t.sql(`update public.town_things set doc = coalesce(doc, '{}'::jsonb) || jsonb_build_object('blessings', jsonb_build_array(jsonb_build_object('id', 'green', 'until', town.now_ms() + 3600000, 'of', jsonb_build_array($1::text)))) where key = 'fountain'`, [U.m1]);
did = await tell(U.m1, GO({ p_what: "blessed" }));
mine = await linesOf(U.m1);
t.check("a go under a blessing has it beside it, as a play's and a deed's lines have", did === true && same(mine.at(-1).doc, { under: ["green"] }), mine.at(-1)?.doc);
did = await tell(U.m2, GO({ p_what: "unblessed" }));
t.check("…and another member's, who is not under it, has none", did === true && same((await linesOf(U.m2)).at(-1).doc, {}), (await linesOf(U.m2)).at(-1)?.doc);
await t.sql(`update public.town_things set doc = $1::jsonb where key = 'fountain'`, [JSON.stringify(fountainWas)]);
await t.sql(`delete from public.town_tries where true`);

t.section("what is no board's word keeps nothing");
const bad = [];
for (const more of [{ p_game: "fishing" }, { p_game: "washing" }, { p_game: "" }, { p_game: null }, { p_game: "Farming" },
  { p_how: "won" }, { p_how: "" }, { p_how: null }, { p_how: "DONE" },
  { p_what: "" }, { p_what: null }, { p_what: "a b" }, { p_what: "1abc" }, { p_what: "x".repeat(49) }, { p_what: "x';drop table public.town_tries;--" }, { p_what: "น้ำ" },
  { p_board: "Net" }, { p_board: "a-b" }, { p_board: "" }, { p_board: "x".repeat(17) }, { p_board: "net2" }]) bad.push([more, await tell(U.m1, GO(more))]);
t.check("a line of work, an end, a name or a board that is none keeps nothing and says only that", bad.every(([, r]) => r === false), bad.filter(([, r]) => r !== false));
t.check("…and no line came of any of them", (await lines()) === 0, await lines());
did = await tell(U.m1, GO({ p_what: "x".repeat(48), p_board: "x".repeat(16) }));
t.check("the longest name and the longest board there may be are kept", did === true && (await lines()) === 1, did);

t.section("the numbers are brought inside what a board can count");
await t.sql(`delete from public.town_tries where true`);
did = await tell(U.m1, GO({ p_need: -5, p_hits: 5000, p_misses: null, p_secs: -1, p_spent: null }));
mine = await linesOf(U.m1);
t.check("a number below nothing is nothing, one past a thousand a thousand, none given nothing; tired not said is not tired", did === true && same([mine[0].need, mine[0].hits, mine[0].misses, mine[0].secs, mine[0].spent], [0, 1000, 0, 0, false]), mine[0] ?? did);
did = await tell(U.m1, GO({ p_need: 2147483647, p_hits: -2147483648, p_misses: 1001, p_secs: 99999 }));
mine = await linesOf(U.m1);
t.check("…and the largest there are, and an hour's seconds at the most", did === true && same([mine[1].need, mine[1].hits, mine[1].misses, mine[1].secs], [1000, 0, 1000, 3600]), mine[1] ?? did);
const odd = [await tell(U.m1, GO({ p_secs: "NaN" })), await tell(U.m1, GO({ p_secs: "Infinity" })), await tell(U.m1, GO({ p_secs: null }))];
mine = await linesOf(U.m1);
t.check("seconds that are no number, or without end, are an hour; none given, nothing", odd.every((r) => r === true) && same(mine.slice(2).map((l) => l.secs), [3600, 3600, 0]), mine.slice(2).map((l) => l.secs));

t.section("no more than forty a minute from one member");
await t.sql(`delete from public.town_tries where true`);
const burst = [];
for (let i = 0; i < 40; i++) burst.push(await tell(U.m2, GO({ p_misses: i })));
t.check("forty in a minute are kept", burst.every((r) => r === true) && (await linesOf(U.m2)).length === 40, burst.filter((r) => r !== true).length);
did = await tell(U.m2, GO({ p_what: "more" }));
t.check("the forty-first in a minute is not kept, and is told so", did === false && (await linesOf(U.m2)).length === 40, did);
did = await tell(U.m1, GO());
t.check("…while another member's is kept: the forty are each member's own", did === true && (await linesOf(U.m1)).length === 1, did);
await t.sql(`update public.town_tries set at = at - interval '61 seconds' where member_id = $1`, [U.m2]);
did = await tell(U.m2, GO({ p_what: "later" }));
t.check("a minute on, the member's next is kept again", did === true && (await linesOf(U.m2)).length === 41, did);

t.section("nothing hangs on a line");
t.check("no play and no deed was written, no line of work counted and no purse moved by all of the above", same(await hangs(), hangsWas), { now: await hangs(), was: hangsWas });
t.check("the table has no trigger, and none was added anywhere", (await rows(`select 1 from pg_trigger g where g.tgrelid = 'public.town_tries'::regclass and not g.tgisinternal`)).length === 0 && (await kept()).triggers === keptWas.triggers);

t.section("who may");
const before = await lines();
const out = await tell("anon", GO());
t.check("somebody signed out is refused", /permission denied/.test(out?.error ?? ""), out);
for (const who of ["unver", "nochar"]) {
  const r = await tell(U[who], GO());
  t.check(`${who === "unver" ? "a character never proved" : "an account with no character"} leaves no line`, r !== true && r !== false && r?.code === "42501" && (await linesOf(U[who])).length === 0, r);
}
await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
const shut = await tell(U.m1, GO({ p_what: "shut" })), adm = await tell(U.admin, GO({ p_what: "shut" }));
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
t.check("while the game is shut a member leaves none and an admin does, as with every function of the game's", shut?.code === "42501" && adm === true && (await linesOf(U.admin)).length === 1, { shut, adm });
const peeks = [];
for (const who of [U.m1, U.admin, "anon"]) {
  peeks.push(await t.as(who, `select * from public.town_tries`));
  peeks.push(await t.as(who, `insert into public.town_tries (member_id, game, what, how, spent, need, hits, misses, secs) values ($1, 'farming', 'x', 'done', false, 0, 0, 0, 0)`, [U.m1]));
  peeks.push(await t.as(who, `update public.town_tries set how = 'done' where true`));
  peeks.push(await t.as(who, `delete from public.town_tries where true`));
}
t.check("no member, no admin's browser and nobody signed out reads the table or writes to it", peeks.every((r) => r.code === "42501"), peeks.map((r) => r.code ?? r.rows?.length));
t.check("…and every line is still there", (await lines()) === before + 1, { now: await lines(), before });
const asked = [await t.as(U.m1, `select * from town.tries_tally()`), await t.as("anon", `select * from town.tries_tally()`)];
t.check("the count is refused to a member's browser and to whoever is signed out", asked.every((r) => r.code === "42501"), asked.map((r) => r.code ?? r.rows?.length));

t.section("the count, for the SQL editor");
await t.sql(`delete from public.town_tries where true`);
for (const [how, misses, secs] of [["done", 0, 2], ["done", 1, 4], ["done", 2, 6], ["dropped", 3, 1], ["left", 0, 0]]) await tell(U.m1, GO({ p_board: "steady", p_how: how, p_misses: misses, p_secs: secs }));
await tell(U.m2, GO({ p_board: "steady", p_how: "done", p_misses: 0, p_secs: 8, p_spent: false }));
await tell(U.m2, GO({ p_game: "insects", p_board: null, p_what: "ladybird", p_how: "dropped", p_spent: false }));
const tally = await rows(`select * from town.tries_tally()`);
const num = (r) => r && Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" || (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) ? Number(v) : v]));
t.check("a board's tired goes: how many, by how many, how they ended, how many in a hundred came off, misses a go played out, half the seconds",
  same(num(tally.find((r) => r.board === "steady" && r.tired === true)), { game: "farming", board: "steady", tired: true, goes: 5, members: 1, done: 3, dropped: 1, given_up: 1, done_in_100: 60, misses_a_go: 1.5, half_secs: 4 }), tally.map(num));
t.check("…its fed goes apart from them", same(num(tally.find((r) => r.board === "steady" && r.tired === false)), { game: "farming", board: "steady", tired: false, goes: 1, members: 1, done: 1, dropped: 0, given_up: 0, done_in_100: 100, misses_a_go: 0, half_secs: 8 }), tally.map(num));
t.check("…and work with no board on a line of its own", same(num(tally.find((r) => r.game === "insects")), { game: "insects", board: "-", tired: false, goes: 1, members: 1, done: 0, dropped: 1, given_up: 0, done_in_100: 0, misses_a_go: 1, half_secs: null }) && tally.length === 3, tally.map(num));
t.check("outside the days asked for, no line", (await rows(`select * from town.tries_tally(now() - interval '3 days', now() - interval '2 days')`)).length === 0 && (await rows(`select * from town.tries_tally(now() + interval '1 day', now() + interval '2 days')`)).length === 0);

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
