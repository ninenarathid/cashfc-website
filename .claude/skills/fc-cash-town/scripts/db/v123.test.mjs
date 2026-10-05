/*
 * v123 — a wish at the fountain: dry run in PGlite.
 *
 * v123 adds the fountain (its rules, its row, its knobs, `town_blessings`, two functions a member calls) and writes
 * eight functions again: four rules that asked whether the meal's buff was the one they cared for and now ask
 * `town.has_buff` (two of them with a line more for a blessing of the fountain's own), sowing and cooking for two
 * more of those, the reading of a purse (with the blessings its member has), and the tally's word for a toss.
 *
 * v105 to v121 are replayed as they ran, then v122 (its draft, until it has run), then v123 twice. Then: every case
 * of lib/town/fountain made from the code as it is, put to the SQL; each function written again held to the text it
 * replaces, word for word but for the line meant; and the keeping: coins leaving for good, a goal by what the
 * village holds, a pot filled, a blessing held beside a meal's buff and beside another, who may.
 *
 *   node v123.test.mjs            (RULES=0 skips the cases)
 *   node mutate.mjs v123_draft.sql v123.test.mjs v123.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v123_draft.sql")) ? readFileSync(here("v123_draft.sql"), "utf8") : migration(123);
const vectors = process.env.RULES === "0" ? [] : JSON.parse(readFileSync(here("now/vectors-v123.json"), "utf8"));

const extra = `
create table public.kudos (id bigint generated always as identity primary key, sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null, day date not null default current_date, created_at timestamptz not null default now(), unique (sender_id, receiver_character_id, day));
alter table public.kudos enable row level security;
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;

const t = await supabaseLike({ extra });
for (let n = 105; n <= 121; n++) await t.run(migration(n), `v${n}`);

t.section("it will not run before v122");
{
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v122, it stops at its first line and says why", !!stopped && /v122 has not run/.test(stopped), stopped);
  const v = await t.sql(`select (select count(*)::int from public.town_knobs where key like 'wish%') as knobs, to_regclass('public.town_blessings') is null as no_table,
                                to_regprocedure('public.town_toss(text, integer, text)') is null as no_toss`);
  t.check("…having done nothing", v.rows[0].knobs === 0 && v.rows[0].no_table && v.rows[0].no_toss, v.rows);
}
// (v122 from supabase/ or from history once it is there; its draft, kept beside its own test, until then)
const V122 = (() => { try { return migration(122); } catch { return readFileSync(here("v122_draft.sql"), "utf8"); } })();
await t.run(V122, "v122");
// the game open, and a clock the test can move
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${Date.parse("2026-10-05T12:00:00+07:00")});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const NOON = Date.parse("2026-10-05T12:00:00+07:00"), MIN = 60_000, HOUR = 3_600_000;
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
await t.runTwice(FILE, "v123");

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

/* ── the rules, case by case ─────────────────────────────────────────────── */

const CALL = {
  wishes: "to_jsonb(town.wishes())",
  first_goal: "town.first_goal($1::float8, $2::jsonb)", dawned: "town.dawned($1::jsonb, $2::bigint, $3::float8, $4::jsonb)", goal_of: "town.goal_of($1::jsonb, $2::jsonb)",
  blessings_of: "town.blessings_of($1::jsonb, $2::text, $3::bigint)",
  toss: "town.toss($1::jsonb, $2::jsonb, $3::text, $4::text, $5::float8, $6::bigint, $7::float8, $8::jsonb)",
  blessed: "town.blessed($1::jsonb, $2::jsonb, $3::text, $4::bigint)",
  buff_of: "town.buff_of($1::jsonb, $2::bigint)", has_buff: "town.has_buff($1::jsonb, $2::bigint, $3::text)", cost_of: "town.cost_of($1::jsonb, $2::float8, $3::bigint)",
  hastened: "town.hastened($1::jsonb, $2::float8)", tidy_note: "town.tidy_note($1::text)",
  sow: "town.sow($1::jsonb, $2::jsonb, $3::text, $4::text, $5::bigint)", water: "town.water($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)",
  cook: "town.cook($1::jsonb, $2::jsonb, $3::jsonb, $4::float8, $5::bigint)", chore: "town.chore($1::jsonb, $2::text, $3::int, $4::bigint)",
};
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
t.section(`the fountain's rules: ${vectors.length} cases, each as the site's own code answers it`);
const tally = new Map();
for (const v of vectors) {
  const sql = CALL[v.fn];
  if (!sql) throw new Error(`no SQL for ${v.fn}`);
  let got, error = null;
  try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
  if (typeof got === "bigint") got = Number(got);
  const ok = !error && same(got ?? null, v.want);
  const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  row.n++;
  if (!ok) { row.bad++; row.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  tally.set(v.fn, row);
}
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1800)}` : "");
if (vectors.length) t.check("every rule of the fountain's was asked", Object.keys(CALL).every((fn) => tally.has(fn)), Object.keys(CALL).filter((fn) => !tally.has(fn)));

/* ── what is written again ───────────────────────────────────────────────── */

t.section("each function written again is the one it replaces, word for word but for the line meant");
// (a file checked out on Windows has its lines ended the Windows way; one read from history has not)
const lf = (s) => s.split("\r\n").join("\n");
const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5)); };
const held = (name, was, ...lines) => {
  const old = words(was, name), now = words(FILE, name);
  let want = old, found = !!old;
  for (let i = 0; found && i < lines.length; i += 2) { found = want.split(lines[i]).length === 2; want = want.replace(lines[i], () => lines[i + 1]); }
  t.check(`${name} is as it last ran, but for the line${lines.length > 2 ? "s" : ""} meant`, !!old && !!now && old !== now && found && want === now,
    !old ? "not found before" : !now ? "not in the file" : !found ? "a line meant is not in the old text" : "it differs elsewhere");
};
held("town.cost_of", migration(107), "when town.buff_of(p_purse, p_now) = 'hearty'", "when town.has_buff(p_purse, p_now, 'hearty')");
held("town.strike_window", migration(108), "when town.buff_of(p_purse, p_now) = 'keen' then", "when town.has_buff(p_purse, p_now, 'keen') then");
held("town.water", migration(110), "when town.buff_of(p_purse, p_now) = 'green' then", "when town.has_buff(p_purse, p_now, 'green') then",
  "can || jsonb_build_object('water', (can->>'water')::numeric - 1)", "can || jsonb_build_object('water', (can->>'water')::numeric - (case when town.has_buff(p_purse, p_now, 'spring') then 0 else 1 end))");
held("town.sow", migration(110), "'boost', 0, 'watered', 0,", "'boost', case when town.has_buff(p_purse, p_now, 'sprout')\n        then (town.wishing()->>'sprout')::double precision * (town.cat('crops')->crop->>'hours')::double precision * 3600000 else 0 end, 'watered', 0,");
held("town.cook", migration(111), "    left_ := case when made is not null then town.helpings(dish, p_crew, p_misses, p_purse->'bag') else town.odd_helpings(alls, p_misses) end;",
  "    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, p_purse->'bag') else town.odd_helpings(alls, p_misses) end)\n      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);");
held("town.purse_of", migration(107), "select town.settle(town.purse_kept(p_member, p_hold), town.now_ms())",
  "select town.blessed(town.settle(town.purse_kept(p_member, p_hold), town.now_ms()), town.thing('fountain', false), p_member::text, town.now_ms())");
held("public.town_cast", V122, "coalesce(town.buff_of(purse, now_) = 'lucky', false)", "town.has_buff(purse, now_, 'lucky')",
  "    array[random(), random(), random(), random(), random(), random()]);\n",
  "    array[random(), random(), random(), random(), random(), random()]);\n  -- (under the fountain's swift blessing the bite comes sooner)\n  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;\n",
  "  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')));",
  "  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)\n  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')\n    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end));");
held("town.deed_th", migration(121), "when 'exchange' then", "when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'\n    when 'exchange' then");
held("town.chore", migration(110), "jsonb_build_object('item', hand, 'n', 1, 'water', f->'buckets'->hand))));\n  end if;\n  if what = 'pour' then",
  "jsonb_build_object('item', hand, 'n', 1, 'water', (f->'buckets'->>hand)::int\n          + (case when town.has_buff(p_purse, p_now, 'carry') then (town.wishing()->>'carry')::int else 0 end)))));\n  end if;\n  if what = 'pour' then");
held("public.town_chore", migration(121), "when 'draw' then (f->'buckets'->>town.hand_of(purse))::numeric else 1 end,",
  "when 'draw' then (f->'buckets'->>town.hand_of(purse))::numeric\n        + (case when town.has_buff(purse, now_, 'carry') then (town.wishing()->>'carry')::numeric else 0 end) else 1 end,");
held("town.note", migration(121), "coalesce(p_coins, 0), coalesce(p_doc, '{}'::jsonb))", "coalesce(p_coins, 0), coalesce(p_doc, '{}'::jsonb) || town.under(p_member))");
held("town.record", migration(108), "p_spent, p_buff, coalesce(p_doc, '{}'::jsonb))", "p_spent, p_buff, coalesce(p_doc, '{}'::jsonb) || town.under(p_member))");
{
  const v = await t.sql(`select p.proname, p.prosrc from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace)
                           and p.prosrc ~ 'buff_of\\([^)]*\\)\\s*=' order by 1`);
  t.check("no rule asks any more whether the meal's buff is the one it cares for", v.rows.length === 1 && v.rows[0].proname === "has_buff", v.rows.map((r) => r.proname));
  const b = await t.sql(`select prosrc from pg_proc where oid = 'town.buff_of(jsonb, bigint)'::regprocedure`);
  t.check("buff_of itself is as it was: the meal's buff", words(migration(107), "town.buff_of").includes(b.rows[0].prosrc.trim()), b.rows);
}

/* ── the closing block ───────────────────────────────────────────────────── */

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select count(*)::int as n from public.town_knobs where key like 'wish\\_%'`);
t.check("twelve knobs", v.rows[0].n === 12, v.rows);
v = await t.sql(`select t.doc->>'pot' as pot, jsonb_array_length(t.doc->'blessings') as running,
    (select c.relrowsecurity from pg_class c where c.oid = 'public.town_blessings'::regclass) as closed,
    (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name = 'town_blessings' and grantee in ('anon', 'authenticated')) as grants
  from public.town_things t where t.key = 'fountain'`);
t.check("an empty fountain, and a closed book of wishes", same(v.rows[0], { pot: "0", running: 0, closed: true, grants: 0 }), v.rows);
v = await t.sql(`select count(*) filter (where p.prosrc like '%town.has_buff(%')::int as ask_has_buff, count(*) filter (where p.prosrc like '%town.buff_of(%= ''%')::int as ask_the_old_way
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.proname in ('cost_of', 'strike_window', 'water', 'sow', 'cook', 'chore', 'town_chore', 'town_cast')`);
t.check("eight rules ask has_buff, none the old way", same(v.rows[0], { ask_has_buff: 8, ask_the_old_way: 0 }), v.rows);
v = await t.sql(`select count(*)::int as n, count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member, count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_toss', 'town_cheer', 'town_wish_report', 'town_wish_unsay', 'town_wish_hide', 'town_fountain')`);
t.check("six functions of the fountain's, each a member's to call and none of anybody's signed out (and one toss only, of three words)", same(v.rows[0], { n: 6, member: 6, anon: 0 }), v.rows);
v = await t.sql(`select (select c.relrowsecurity from pg_class c where c.oid = 'public.town_wish_notes'::regclass) as closed,
    (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name = 'town_wish_notes' and grantee in ('anon', 'authenticated')) as grants`);
t.check("the wishes' words are a closed book too", same(v.rows[0], { closed: true, grants: 0 }), v.rows);
v = await t.sql(`select has_function_privilege('authenticated', 'public.town_toss(text, integer, text)', 'execute') as member, has_function_privilege('anon', 'public.town_toss(text, integer, text)', 'execute') as anon,
    has_function_privilege('authenticated', 'public.town_fountain()', 'execute') as look, has_function_privilege('anon', 'public.town_fountain()', 'execute') as anon_look,
    has_function_privilege('authenticated', 'public.town_cast(text, integer, integer, boolean)', 'execute') as cast_, has_function_privilege('anon', 'public.town_cast(text, integer, integer, boolean)', 'execute') as anon_cast,
    has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
    (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as rules_open`);
t.check("a member may toss, look and cast; nobody signed out may; the rules are nobody's in a browser",
  same(v.rows[0], { member: true, anon: false, look: true, anon_look: false, cast_: true, anon_cast: false, member_has_rules: false, rules_open: 0 }), v.rows);
v = await t.sql(`select town.wishing() as k`);
t.check("the knobs come to the numbers the site's code has", same(Object.fromEntries(Object.entries(v.rows[0].k).map(([k, x]) => [k, Number(x)])), { share: 0.03, least: 100, rounds: 3, more: 2, hours: 3, people: 3, within: 60, counts: 1.5, swift: 0.4, sprout: 0.15, feast: 1, carry: 1 }), v.rows);
v = await t.sql(`select town.deed_th('toss') as toss, town.deed_th('pour') as pour, town.deed_th('exchange') as exchange, town.deed_th('something new') as unknown`);
t.check("the tally has a word for a toss, and its other words as they were", same(v.rows[0], { toss: "โยนเหรียญลงน้ำพุ", pour: "เทน้ำลงบ่อ", exchange: "แลก popoto เป็นเหรียญ", unknown: "something new" }) && (await t.sql(`select town.deed_th('report') as r`)).rows[0].r === "รายงานคำอธิษฐาน", v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const coinsOf = async (who) => (await t.sql(`select coins from public.town_purses where member_id = $1`, [who])).rows[0]?.coins ?? null;
const give = (who, coins) => t.sql(`insert into public.town_purses (member_id, coins) values ($1, $2) on conflict (member_id) do update set coins = excluded.coins`, [who, coins]);
const fountain = async () => (await t.sql(`select doc from public.town_things where key = 'fountain'`)).rows[0].doc;
const deeds = async (who) => (await t.sql(`select what, thing, n::float8 as n, coins::float8 as coins, doc from public.town_deeds where member_id = $1 and what = 'toss' order by id`, [who])).rows;

t.section("who may");
let r = await t.as(null, `select public.town_fountain() as r`);
t.check("somebody signed out is refused the fountain", !!r.error, r);
r = await t.as(null, `select public.town_toss('lucky', 1) as r`);
t.check("…and a toss", !!r.error, r);
r = await call(U.unver, "town_toss", "lucky", 1);
t.check("an account with no proved character is refused", !!r.error, r);
r = await t.as(U.m1, `select * from public.town_blessings`);
t.check("the book of wishes is no member's to read", !!r.error || r.rows.length === 0, r);
r = await t.as(U.m1, `select town.toss('{"coins": 5}'::jsonb, '{}'::jsonb, 'x', 'lucky', 1, 0, 0, '{}'::jsonb) as r`);
t.check("…nor the rules to call", !!r.error, r);
await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
r = await call(U.m1, "town_toss", "lucky", 1);
t.check("while the game is shut a member is refused, as everywhere", !!r.error, r);
r = await call(U.admin, "town_fountain");
t.check("…and an admin is not", !r.error && r.fountain?.goal === 100, r);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);

t.section("a look, and a coin tossed");
await give(U.m1, 60); await give(U.m2, 500); await give(U.guest, 40); await give(U.admin, 2_740);   // 3,340 coins in the village
r = await call(U.m1, "town_fountain");
t.check("the day's goal is 3% of all the coins there are, and never under 100", r.fountain.goal === 100 && r.fountain.pot === 0 && same(r.fountain.who, []) && r.fountain.mine === false && r.fountain.rounds === 3, r.fountain);
t.check("…told with the numbers a page words itself with", Number(r.fountain.hours) === 3 && r.fountain.people === 3 && r.fountain.within === 60 && Number(r.fountain.counts) === 1.5, r.fountain);
t.check("…and with what can be wished for: a meal's five, then the fountain's own six; what waits for the forest and the insects is not offered",
  same(r.fountain.wishes, ["calm", "keen", "lucky", "hearty", "green", "swift", "clear", "spring", "sprout", "feast", "carry"]), r.fountain.wishes);
r = await call(U.m1, "town_toss", "forage", 1);
t.check("a wish that waits is refused like one there is not", r.ok === false && r.why === "none", r);
t.check("looking keeps nothing", (await fountain()).day === -1);
for (const [wish, coins, why] of [["rain", 5, "none"], [null, 5, "none"], ["lucky", 0, "amount"], ["lucky", -4, "amount"], ["lucky", null, "amount"], ["lucky", 61, "coins"]]) {
  r = await call(U.m1, "town_toss", wish, coins);
  t.check(`a toss of ${coins} towards ${wish} is refused: ${why}`, r.ok === false && r.why === why && r.purse.coins === 60, r);
}
t.check("a toss refused takes nothing and writes nothing", (await coinsOf(U.m1)) === 60 && (await deeds(U.m1)).length === 0 && (await fountain()).day === -1);
r = await call(U.m1, "town_toss", "green", 25);
t.check("a coin tossed leaves the purse for good and counts towards its wish", r.ok === true && r.took === 25 && r.counted === 25 && r.granted === null && r.purse.coins === 35 && (await coinsOf(U.m1)) === 35, r);
t.check("…and the fountain says so: the pot, the wish, who (by name), that my coin is in it",
  r.fountain.pot === 25 && same(r.fountain.by, { green: 25 }) && r.fountain.who.length === 1 && typeof r.fountain.who[0] === "string" && r.fountain.who[0].length > 0 && r.fountain.mine === true, r.fountain);
t.check("…with nothing of anybody's id in what a page is told", !JSON.stringify(r.fountain).includes(U.m1), r.fountain);
let f = await fountain();
t.check("the goal was set by the day's first toss: 3,340 coins come to 100", f.first === 100 && f.given === 0, f);
let d = await deeds(U.m1);
t.check("the toss is written down: the wish, the coins, what it did to the purse", d.length === 1 && same({ ...d[0], doc: undefined }, { what: "toss", thing: "green", n: 25, coins: -25, doc: undefined }) && d[0].doc.counted === 25 && !("granted" in d[0].doc), d);
t.check("…with no word of a blessing, there being none", !("under" in d[0].doc), d[0].doc);
r = await call(U.m2, "town_fountain");
t.check("somebody else sees the same pot, and that their coin is not in it", r.fountain.pot === 25 && r.fountain.mine === false && r.fountain.who.length === 1, r.fountain);

t.section("the pot filled");
await clock(NOON + 10 * MIN);
r = await call(U.m2, "town_toss", "lucky", 40);
t.check("a second wish gathers its own coins", r.ok && same(r.fountain.by, { green: 25, lucky: 40 }) && r.fountain.pot === 65, r.fountain);
await clock(NOON + 20 * MIN);
r = await call(U.guest, "town_toss", "green", 40);
t.check("the fountain takes no more than fills the pot: thirty-five of forty", r.ok && r.took === 35 && r.purse.coins === 5, r);
t.check("…and grants the wish with the most behind it, there and then", r.granted === "green", r);
t.check("…to whoever filled it", same(r.purse.blessed, [{ id: "green", until: NOON + 20 * MIN + 3 * HOUR }]), r.purse.blessed);
t.check("…the pot empty again, and the next goal twice the first", r.fountain.pot === 0 && same(r.fountain.who, []) && r.fountain.given === 1 && r.fountain.goal === 200, r.fountain);
t.check("…and the blessing told: which, until when, whose coin filled it, how many have it, that I do",
  r.fountain.blessings.length === 1 && r.fountain.blessings[0].id === "green" && r.fountain.blessings[0].until === NOON + 20 * MIN + 3 * HOUR
  && r.fountain.blessings[0].people === 3 && r.fountain.blessings[0].mine === true && r.fountain.blessings[0].by.length > 0, r.fountain.blessings);
for (const who of [U.m1, U.m2]) {
  const me = await call(who, "town_me");
  t.check("everybody whose coin was in the pot has it, as their purse is next read", same(me.purse.blessed, [{ id: "green", until: NOON + 20 * MIN + 3 * HOUR }]), me.purse.blessed);
}
r = await call(U.admin, "town_me");
t.check("somebody whose coin was not in it has none", !("blessed" in r.purse), r.purse.blessed);
{
  // the same deed by somebody who has the blessing and by somebody who has not: a thing taken into the hand
  const worm = JSON.stringify([{ item: "worm", n: 1 }, ...Array(9).fill(null)]);
  for (const who of [U.m1, U.admin]) await t.sql(`update public.town_purses set doc = coalesce(doc, town.fresh()) || jsonb_build_object('bag', $2::jsonb) where member_id = $1`, [who, worm]);
  await call(U.m1, "town_hold", 0);
  await call(U.admin, "town_hold", 0);
  const held_ = async (who) => (await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'hold' order by id desc limit 1`, [who])).rows[0]?.doc;
  t.check("a deed is written down with the blessings its doer has: under green, for one whose coin was in the pot", same((await held_(U.m1))?.under, ["green"]), await held_(U.m1));
  t.check("…and with nothing of a blessing that is somebody else's", !!(await held_(U.admin)) && !("under" in (await held_(U.admin))), await held_(U.admin));
}
v = await t.sql(`select day, round, wish, goal::float8 as goal, by_member, people, extract(epoch from until)::bigint * 1000 as until, extract(epoch from at)::bigint * 1000 as at from public.town_blessings`);
t.check("the wish granted is written in the book: which, its goal, whose coin, how many, until when, by the town's clock",
  v.rows.length === 1 && v.rows[0].wish === "green" && v.rows[0].round === 1 && v.rows[0].goal === 100 && v.rows[0].by_member === U.guest && v.rows[0].people === 3
  && Number(v.rows[0].until) === NOON + 20 * MIN + 3 * HOUR && Number(v.rows[0].at) === NOON + 20 * MIN, v.rows);
d = await deeds(U.guest);
t.check("…and with the toss that filled it", d.length === 1 && d[0].n === 35 && d[0].coins === -35 && d[0].doc.granted === "green", d);
t.check("…which is the first deed done under it", same(d[0].doc.under, ["green"]), d[0].doc);

t.section("a blessing is held beside a meal's buff, and does what the buff does");
{
  // a member with a keen meal behind them and the green blessing: both; and each rule sees its own
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('buff', jsonb_build_object('id', 'keen', 'until', $2::bigint)) where member_id = $1`, [U.m1, NOON + 5 * HOUR]);
  const me = (await call(U.m1, "town_me")).purse;
  v = await t.sql(`select town.has_buff($1::jsonb, $2, 'green') as green, town.has_buff($1::jsonb, $2, 'keen') as keen, town.has_buff($1::jsonb, $2, 'lucky') as lucky, town.buff_of($1::jsonb, $2) as meal`, [JSON.stringify(me), NOON + 30 * MIN]);
  t.check("a keen meal and a green blessing: both are had, and a go is still kept with the meal's", same(v.rows[0], { green: true, keen: true, lucky: false, meal: "keen" }), v.rows);
  v = await t.sql(`select town.strike_window($1::jsonb, $2) as with_, town.strike_window(($1::jsonb) - 'buff', $2) as without`, [JSON.stringify(me), NOON + 30 * MIN]);
  t.check("the keen meal still widens the strike", v.rows[0].with_ > v.rows[0].without, v.rows);
  // watering: a can with water in the hand, a plant that wants it
  const plot = { soil: "tilled", plant: { crop: "chili", sown: NOON - HOUR, boost: 0, watered: 0, fed: 0, cured: 0, guard: 0, picked: 0, pickedAt: 0, by: U.m1 } };
  const bag = [{ item: "can", n: 1, water: 5 }, ...Array(9).fill(null)];
  const dry = { ...me, bag, hand: "can", blessed: undefined }, wet = { ...me, bag, hand: "can" };
  v = await t.sql(`select (town.water('3,3', $1::jsonb, $3::jsonb, 'can', $4)->'plot'->'plant'->>'boost')::float8 as plain,
                          (town.water('3,3', $2::jsonb, $3::jsonb, 'can', $4)->'plot'->'plant'->>'boost')::float8 as blessed`, [JSON.stringify(dry), JSON.stringify(wet), JSON.stringify(plot), NOON + 30 * MIN]);
  t.check("a watering under the green blessing adds half as much again, as after a green meal", v.rows[0].plain > 0 && Math.abs(v.rows[0].blessed - v.rows[0].plain * 1.5) < 1e-6, v.rows);
  v = await t.sql(`select town.water('3,3', $1::jsonb, $2::jsonb, 'can', $3)->'plot'->'plant'->>'boost' as later`, [JSON.stringify(wet), JSON.stringify(plot), NOON + 20 * MIN + 3 * HOUR]);
  t.check("…and no more once the blessing has ended", Number(v.rows[0].later) === (await t.sql(`select (town.water('3,3', $1::jsonb, $2::jsonb, 'can', $3)->'plot'->'plant'->>'boost')::float8 as x`, [JSON.stringify(dry), JSON.stringify(plot), NOON + 30 * MIN])).rows[0].x, v.rows);
}

t.section("a coin tossed while it lasts, and a second blessing");
await clock(NOON + HOUR);
r = await call(U.admin, "town_toss", "hearty", 1);
t.check("whoever tosses a coin while a blessing lasts has what is left of it", r.ok && same(r.purse.blessed, [{ id: "green", until: NOON + 20 * MIN + 3 * HOUR }]), r.purse.blessed);
t.check("…and their coin is in the next pot", r.fountain.pot === 1 && r.fountain.mine === true && r.fountain.blessings[0].people === 4, r.fountain);
r = await call(U.admin, "town_toss", "hearty", 2_000);
t.check("the second pot takes 199 more of 2,000 and grants the second wish", r.ok && r.took === 199 && r.granted === "hearty" && r.purse.coins === 2_740 - 200, r);
t.check("…held beside the first: each runs its own three hours",
  same(r.purse.blessed, [{ id: "green", until: NOON + 20 * MIN + 3 * HOUR }, { id: "hearty", until: NOON + HOUR + 3 * HOUR }]), r.purse.blessed);
t.check("…and the third costs four times the first", r.fountain.goal === 400 && r.fountain.given === 2 && r.fountain.blessings.length === 2, r.fountain);
r = await call(U.m1, "town_me");
t.check("somebody whose coin was only in the first has the first only", same(r.purse.blessed, [{ id: "green", until: NOON + 20 * MIN + 3 * HOUR }]), r.purse.blessed);
v = await t.sql(`select town.cost_of($1::jsonb, 10, $2) as blessed, town.cost_of(($1::jsonb) - 'blessed', 10, $2) as plain`, [JSON.stringify((await call(U.admin, "town_me")).purse), NOON + HOUR]);
t.check("under the hearty blessing everything costs less stamina", v.rows[0].blessed === 7 && v.rows[0].plain === 10, v.rows);
await clock(NOON + 20 * MIN + 3 * HOUR);
r = await call(U.admin, "town_me");
t.check("the first ends in its own time, the second runs on", same(r.purse.blessed, [{ id: "hearty", until: NOON + HOUR + 3 * HOUR }]), r.purse.blessed);
await clock(NOON + HOUR + 3 * HOUR);
r = await call(U.admin, "town_me");
t.check("…and then that too: the purse carries nothing of it", !("blessed" in r.purse), r.purse.blessed);
r = await call(U.m1, "town_fountain");
t.check("the fountain tells no blessing that has ended", r.fountain.blessings.length === 0, r.fountain.blessings);

t.section("tossed together");
await give(U.m1, 100); await give(U.guest, 100);
await clock(NOON + 5 * HOUR);
const one = await call(U.m1, "town_toss", "calm", 10);
await clock(NOON + 5 * HOUR + 20_000);
const two = await call(U.m2, "town_toss", "calm", 10);
await clock(NOON + 5 * HOUR + 40_000);
const three = await call(U.guest, "town_toss", "calm", 10);
t.check("the third person within the minute counts for one and a half; the coins gone are the coins tossed",
  one.counted === 10 && two.counted === 10 && three.counted === 15 && three.took === 10 && three.purse.coins === 90 && three.fountain.pot === 35, [one.counted, two.counted, three.counted, three.fountain.pot]);
await clock(NOON + 5 * HOUR + 3 * MIN);
r = await call(U.m1, "town_toss", "calm", 10);
t.check("a minute on, a coin counts for itself again", r.counted === 10 && r.fountain.pot === 45, r);

t.section("the day's last blessing, and the morning");
await give(U.admin, 5_000);
r = await call(U.admin, "town_toss", "lucky", 5_000);
t.check("the third pot filled: the day's last", r.ok && r.granted === "lucky" && r.took === 355 && r.fountain.given === 3 && r.fountain.goal === null, r);
await clock(NOON + 5 * HOUR + 10 * MIN);
r = await call(U.m2, "town_toss", "keen", 30);
t.check("after it a coin is taken whole and waits in the pot: nothing more is granted that day", r.ok && r.took === 30 && r.granted === null && r.fountain.pot === 30 && r.fountain.goal === null, r);
t.check("…though it has what is left of the blessing running", r.purse.blessed?.length === 1 && r.purse.blessed[0].id === "lucky", r.purse.blessed);
const TOMORROW = Date.parse("2026-10-06T09:00:00+07:00");
await clock(TOMORROW);
const supply = Number((await t.sql(`select sum(coins) as s from public.town_purses`)).rows[0].s);
r = await call(U.m1, "town_fountain");
t.check("in the morning the goal is 3% of what the village holds then, and the pot has waited", r.fountain.goal === Math.max(100, Math.round(0.03 * supply)) && r.fountain.pot === 30 && r.fountain.given === 0 && r.fountain.blessings.length === 0, [r.fountain, supply]);
await t.sql(`update public.town_knobs set value = 100 where key = 'wish_share'`);
r = await call(U.m1, "town_fountain");
t.check("a knob turned is the fountain's number at the next look: a tenth of the village's coins", r.fountain.goal === Math.round(0.1 * supply), [r.fountain.goal, supply]);
await t.run(FILE, "v123 a third time");
r = await call(U.m1, "town_fountain");
t.check("run again, the file leaves a knob an admin turned, the pot and the purses as they are", r.fountain.goal === Math.round(0.1 * supply) && r.fountain.pot === 30
  && Number((await t.sql(`select sum(coins) as s from public.town_purses`)).rows[0].s) === supply && (await t.sql(`select count(*)::int as n from public.town_blessings`)).rows[0].n === 3, r.fountain);
await t.sql(`update public.town_knobs set value = 30 where key = 'wish_share'`);

t.section("a line dropped under the fountain's own blessings");
{
  const DECK = [16, 38], MID = Date.parse("2026-10-07T12:00:00+07:00");
  await clock(MID);
  const fisher = async (ids) => {
    await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('hand', 'rod', 'bag', $2::jsonb))
                 on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [U.m1, JSON.stringify([{ item: "rod", n: 1 }, { item: "worm", n: 9 }, ...Array(8).fill(null)])]);
    await t.sql(`delete from public.town_lines where member_id = $1`, [U.m1]);
    await t.sql(`update public.town_things set doc = jsonb_set(doc, '{blessings}', $1::jsonb) where key = 'fountain'`,
      [JSON.stringify(ids.map((id) => ({ id, from: MID - MIN, until: MID + HOUR, by: U.m2, of: [U.m1] })))]);
  };
  const lineOf = async () => (await t.sql(`select doc from public.town_lines where member_id = $1`, [U.m1])).rows[0].doc;
  const TIERS = (await t.sql(`select data from public.town_catalog where key = 'fish'`)).rows[0].data;
  await fisher([]);
  r = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false);
  let line = await lineOf();
  t.check("with no blessing a line is dropped as before: the wait told is the line's, and nothing of what is on it",
    r.ok === true && r.line.wait === line.wait && line.bites_at === MID + line.wait * 1000 && !("shade" in r.line) && same(Object.keys(r.line).sort(), ["nibbles", "wait"]), r.line);
  // (the knob at a hundred: the bite is a second away whatever was drawn, so the hastening is seen without chance)
  await t.sql(`update public.town_knobs set value = 100 where key = 'wish_swift'`);
  await fisher(["swift"]);
  r = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false);
  line = await lineOf();
  t.check("under the swift blessing the bite comes sooner, in the line kept and in what the page is told", r.ok === true && r.line.wait === 1 && line.wait === 1 && line.bites_at === MID + 1000 && r.line.nibbles.every((n) => n === 0), [r.line, line.wait]);
  await fisher([]);
  r = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false);
  t.check("…and only under it", r.ok === true && (await lineOf()).wait >= 3, r.line);
  {
    const casts = (await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'cast' order by id desc limit 2`, [U.m1])).rows.map((x) => x.doc);
    t.check("every deed is written down with the blessings it was done under: the line dropped under swift says so, the next says nothing",
      !("under" in casts[0]) && same(casts[1].under, ["swift"]) && Array.isArray(casts[1].tile), casts);
    // a go at a game is kept the same way (written here as the functions that end a line or a hoeing write it)
    await fisher(["swift", "clear"]);
    await t.sql(`select town.record($1, 'fishing', true, 3, false, null, '{"how": "landed"}'::jsonb)`, [U.m1]);
    await fisher([]);
    await t.sql(`select town.record($1, 'fishing', true, 3, false, null, '{"how": "landed"}'::jsonb)`, [U.m1]);
    const goes = (await t.sql(`select doc from public.town_plays where member_id = $1 order by id desc limit 2`, [U.m1])).rows.map((x) => x.doc);
    t.check("…and so is a go at a game", same(goes[1], { how: "landed", under: ["swift", "clear"] }) && same(goes[0], { how: "landed" }), goes);
  }
  await t.sql(`update public.town_knobs set value = 40 where key = 'wish_swift'`);
  const shades = new Set();
  let honest = true, told = 0;
  for (let i = 0; i < 400 && !(i >= 12 && shades.has("other") && shades.size > 1); i++) {
    await fisher(["clear"]);
    r = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false);
    line = await lineOf();
    const want = TIERS[line.what]?.tier ?? "other";
    if (r.line.shade !== want) honest = false;
    if ("shade" in r.line) told++;
    shades.add(r.line.shade);
  }
  t.check("under clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish", honest && told >= 12 && shades.has("other") && shades.has("common")
    && [...shades].every((x) => ["common", "uncommon", "rare", "legend", "other"].includes(x)), [...shades]);
  t.check("…and never which", !JSON.stringify(r.line).includes((await lineOf()).what) && same(Object.keys(r.line).sort(), ["nibbles", "shade", "wait"]), r.line);
  await t.sql(`update public.town_things set doc = jsonb_set(doc, '{blessings}', '[]'::jsonb) where key = 'fountain'`);
}

t.section("a bucket drawn under the water bearers' blessing");
{
  const AT = Date.parse("2026-10-07T15:00:00+07:00");
  await clock(AT);
  const river = (await t.sql(`select split_part(p.key, ',', 1)::int as x, split_part(p.key, ',', 2)::int as y from jsonb_each((select data->'places' from public.town_catalog where key = 'fishing')) p order by 1, 2 limit 1`)).rows[0];
  const bearer = async (who, ids, bucket = "bucket") => {
    await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('hand', $2::text, 'bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 50)))
                 on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, bucket, JSON.stringify([{ item: bucket, n: 1 }, ...Array(9).fill(null)])]);
    await t.sql(`update public.town_things set doc = jsonb_set(doc, '{blessings}', $1::jsonb) where key = 'fountain'`,
      [JSON.stringify(ids.map((id) => ({ id, from: AT - MIN, until: AT + HOUR, by: U.m2, of: [who] })))]);
  };
  const drawn = async (who) => (await t.sql(`select n::float8 as n, doc from public.town_deeds where member_id = $1 and what = 'draw' order by id desc limit 1`, [who])).rows[0];
  await bearer(U.m1, []);
  r = await call(U.m1, "town_chore", river.x, river.y);
  t.check("with no blessing a bucket holds one bucketful, written down as one", r.ok === true && r.chore === "draw" && r.purse.bag[0].water === 1 && (await drawn(U.m1)).n === 1, [r.purse?.bag?.[0], await drawn(U.m1)]);
  await bearer(U.m1, ["carry"]);
  r = await call(U.m1, "town_chore", river.x, river.y);
  t.check("under it, one more: two bucketfuls in the bucket, and two written down, under the blessing", r.ok === true && r.purse.bag[0].water === 2 && (await drawn(U.m1)).n === 2 && same((await drawn(U.m1)).doc.under, ["carry"]), [r.purse?.bag?.[0], await drawn(U.m1)]);
  await t.sql(`update public.town_things set doc = jsonb_set(doc, '{blessings}', '[]'::jsonb) where key = 'fountain'`);
}

t.section("the tally");
v = await t.sql(`select what, th, times::int as times, n::float8 as n, coins::float8 as coins from town.tally() where what = 'toss' order by times desc`);
t.check("who tossed, how often and how many coins is in the tally, with its word", v.rows.length === 4 && v.rows.every((x) => x.th === "โยนเหรียญลงน้ำพุ" && x.coins === -x.n)
  && v.rows.reduce((s, x) => s + x.n, 0) === 25 + 40 + 35 + 1 + 199 + 10 + 10 + 10 + 10 + 355 + 30, v.rows);
v = await t.sql(`select what, times::int as times from town.tally() where what = 'cast'`);
t.check("…beside the lines dropped, as before", v.rows.length === 1 && v.rows[0].times >= 15, v.rows);

t.section("a wish in its writer's words");
{
  const DAY3 = Date.parse("2026-10-08T12:00:00+07:00");
  await clock(DAY3);
  for (const who of [U.m1, U.m2, U.guest, U.admin]) await give(who, 50);
  const notes = async (who) => (await call(who, "town_fountain")).fountain.notes;
  const rows = async () => (await t.sql(`select id, member_id, wish, note, cardinality(cheers) as cheers, cardinality(reports) as reports, hidden, hidden_by from public.town_wish_notes order by id`)).rows;
  r = await call(U.m1, "town_toss", "lucky", 2, "  ขอให้เคลียร์  savage\tสัปดาห์นี้ ");
  t.check("a toss with words: the coins go as any toss's, and the wish is kept tidy", r.ok === true && r.took === 2 && r.purse.coins === 48 && r.fountain.notes.length === 1
    && r.fountain.notes[0].note === "ขอให้เคลียร์ savage สัปดาห์นี้" && r.fountain.notes[0].wish === "lucky" && r.fountain.notes[0].cheers === 0 && r.fountain.notes[0].mine === true && r.fountain.notes[0].hidden === false, r.fountain.notes);
  t.check("…told with its writer's name, and nothing of anybody's id", r.fountain.notes[0].by.length > 0 && !JSON.stringify(r.fountain.notes).includes(U.m1), r.fountain.notes);
  d = await deeds(U.m1);
  t.check("…and the toss written down as one that carried words", d.at(-1).doc.note === true && d.at(-1).n === 2, d.at(-1));
  const id1 = r.fountain.notes[0].id;
  r = await call(U.m1, "town_toss", "lucky", 1, "x".repeat(81));
  t.check("words too long for a wish refuse the toss: nothing is taken, nothing written", r.ok === false && r.why === "note" && r.purse.coins === 48 && (await deeds(U.m1)).length === d.length && (await rows())[0].note === "ขอให้เคลียร์ savage สัปดาห์นี้", r);
  r = await call(U.m1, "town_toss", "lucky", 1, "   ");
  t.check("words that are only spaces are no words: the coin is tossed, and the wish stays as it was", r.ok === true && r.purse.coins === 47 && (await rows()).length === 1 && (await rows())[0].note === "ขอให้เคลียร์ savage สัปดาห์นี้", r);
  r = await call(U.m2, "town_fountain");
  t.check("somebody else reads it, as not theirs", r.fountain.notes.length === 1 && r.fountain.notes[0].mine === false && r.fountain.notes[0].cheered === false && r.fountain.admin === false, r.fountain.notes);
  const before = r.fountain.by.lucky ?? 0;
  r = await call(U.m2, "town_cheer", id1, 3);
  t.check("a coin tossed onto it goes towards the wish it was for, and is counted beside it", r.ok === true && r.took === 3 && r.purse.coins === 47 && (r.fountain.by.lucky ?? 0) === before + 3
    && r.fountain.notes[0].cheers === 1 && r.fountain.notes[0].cheered === true, r.fountain);
  t.check("…written down as a toss onto that wish", (await deeds(U.m2)).at(-1).doc.cheer === id1);
  r = await call(U.m2, "town_cheer", id1, 1);
  t.check("another coin from the same hand is a coin, and one name still", r.ok === true && r.fountain.notes[0].cheers === 1 && r.purse.coins === 46, r.fountain.notes);
  r = await call(U.m1, "town_cheer", id1, 1);
  t.check("nobody tosses onto their own wish", r.ok === false && r.why === "none" && r.purse.coins === 47, r);
  r = await call(U.m1, "town_toss", "green", 1, "อีกคำหนึ่ง");
  t.check("a second wish the same day takes the first one's place: one a member a day, and nobody has tossed onto the new one", r.ok === true && (await rows()).length === 1
    && r.fountain.notes[0].note === "อีกคำหนึ่ง" && r.fountain.notes[0].wish === "green" && r.fountain.notes[0].cheers === 0 && r.fountain.notes[0].id === id1, r.fountain.notes);

  // reports: once each, never of one's own; the third hides it
  r = await call(U.m1, "town_wish_report", id1);
  t.check("nobody reports their own wish", r.ok === false && r.why === "none", r);
  r = await call(U.m2, "town_wish_report", id1);
  t.check("a report is taken, once", r.ok === true && r.fountain.notes[0]?.reported === true && (await call(U.m2, "town_wish_report", id1)).ok === false && (await rows())[0].reports === 1, r);
  await call(U.guest, "town_wish_report", id1);
  t.check("two reports leave it where it is", (await notes(U.m2)).length === 1 && (await rows())[0].hidden === false);
  await call(U.admin, "town_wish_report", id1);
  t.check("the third hides it from everybody else", (await rows())[0].hidden === true && (await notes(U.m2)).length === 0 && (await notes(U.guest)).length === 0, await rows());
  r = await call(U.m1, "town_fountain");
  t.check("…its writer still reads it, told that it is hidden", r.fountain.notes.length === 1 && r.fountain.notes[0].hidden === true, r.fountain.notes);
  r = await call(U.m2, "town_cheer", id1, 1);
  t.check("no coin is tossed onto a hidden wish", r.ok === false && r.why === "gone" && r.purse.coins === 46, r);
  v = await t.sql(`select count(*)::int as n from public.town_deeds where what = 'report'`);
  t.check("each report is written down", v.rows[0].n === 3, v.rows);

  // an admin
  r = await call(U.admin, "town_fountain");
  t.check("an admin is told so, and reads what is hidden", r.fountain.admin === true && r.fountain.notes.length === 1 && r.fountain.notes[0].hidden === true, r.fountain);
  r = await call(U.m2, "town_wish_hide", id1, false);
  t.check("only an admin hides a wish or shows it", !!r.error, r);
  r = await call(U.admin, "town_wish_hide", id1, false);
  t.check("shown again by an admin: everybody reads it, and its reports are forgotten", r.ok === true && (await notes(U.m2)).length === 1 && (await rows())[0].reports === 0 && (await rows())[0].hidden === false, await rows());
  r = await call(U.admin, "town_wish_hide", id1, true);
  t.check("hidden by an admin", r.ok === true && (await notes(U.m2)).length === 0 && (await rows())[0].hidden_by === U.admin, await rows());
  r = await call(U.m1, "town_toss", "green", 1, "เขียนใหม่");
  t.check("…what its writer writes for the rest of that day stays hidden", r.ok === true && (await rows())[0].note === "เขียนใหม่" && (await rows())[0].hidden === true && (await notes(U.m2)).length === 0, await rows());

  // taking one's own back; another day; nothing of two days ago
  r = await call(U.m2, "town_toss", "calm", 1, "ของฉันเอง");
  const id2 = r.fountain.notes.find((n) => n.mine).id;
  r = await call(U.guest, "town_wish_unsay", id2);
  t.check("nobody takes back somebody else's wish", r.ok === false && r.why === "none" && (await rows()).length === 2, r);
  r = await call(U.m2, "town_wish_unsay", id2);
  t.check("its writer does", r.ok === true && (await rows()).length === 1 && r.fountain.notes.length === 0, r.fountain.notes);
  await call(U.m2, "town_toss", "calm", 1, "วันนี้");
  await clock(DAY3 + 24 * HOUR);
  r = await call(U.m2, "town_toss", "keen", 1, "วันถัดไป");
  t.check("the next day is a new wish; yesterday's is still read, the newest first", r.ok === true && same(r.fountain.notes.map((n) => n.note), ["วันถัดไป", "วันนี้"]), r.fountain.notes);
  await clock(DAY3 + 48 * HOUR);
  t.check("two days on, the older is no longer read", same((await notes(U.m2)).map((n) => n.note), ["วันถัดไป"]));
  for (const [fn, args] of [["town_cheer", [id1, 1]], ["town_wish_report", [id1]], ["town_wish_unsay", [id1]], ["town_wish_hide", [id1, true]]]) {
    r = await t.as(null, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
    t.check(`somebody signed out is refused ${fn}`, !!r.error, r);
  }
  r = await t.as(U.m1, `select * from public.town_wish_notes`);
  t.check("the words are no member's to read from the table", !!r.error || r.rows.length === 0, r);
  r = await t.as(U.m1, `insert into public.town_wish_notes (member_id, day, wish, note) values ($1, 1, 'lucky', 'straight in')`, [U.m1]);
  t.check("…nor to write there", !!r.error || r.affected === 0, r);
}

await t.done();
