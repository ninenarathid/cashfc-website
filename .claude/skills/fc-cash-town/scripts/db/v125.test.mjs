/*
 * v125 — the forest, and a net for insects: dry run in PGlite.
 *
 * v125 adds a word no browser reads (`town_secrets`), who took what in which turn (`town_takes`), the village's book
 * of insects (a row of `town_things`), the rules of lib/town/forest and lib/town/insects, four functions a member
 * calls, fifteen catalog rows, and writes one function again: v123's `town.deed_th`, with two words more.
 *
 * v105 to v122 are replayed as they ran, then v123 (its draft, until it has run), then v125 twice. Then: every case
 * of the two rule files made from the code as it is, put to the SQL, with the word and the sky the cases were made
 * with; the function written again held to the text it replaces; and the keeping: a thing gathered once each by so
 * many, a net and a tile and stamina, a beetle and somebody else's hand, the book, the deeds written down, who may.
 *
 *   node build-v125.mjs && node v125.test.mjs            (RULES=0 skips the cases; RULES=few puts one in six, for the breaks)
 *   node mutate.mjs v125_draft.sql v125.test.mjs v125.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v125_draft.sql")) ? readFileSync(here("v125_draft.sql"), "utf8") : migration(125);
const told = process.env.RULES === "0" ? { word: "dryrun", wet: [], cases: [] } : JSON.parse(readFileSync(here("now/vectors-v125.json"), "utf8"));
// (one in six of what the places and haunts have; all of a night of full moon, which is the only night some things are there; every gathering and catch)
if (process.env.RULES === "few") told.cases = told.cases.filter((c, i) => i % 6 === 0 || c.fn === "gather" || c.fn === "net" || c.fn === "wishes" || c.args[1] > Date.parse("2026-10-26T12:00:00+07:00"));

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
for (let n = 105; n <= 122; n++) await t.run(migration(n), `v${n}`);

t.section("it will not run before v123");
{
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v123, it stops at its first line and says why", !!stopped && /v123 has not run/.test(stopped), stopped);
  const v = await t.sql(`select to_regclass('public.town_secrets') is null as no_word, to_regclass('public.town_takes') is null as no_takes, to_regprocedure('public.town_wild()') is null as no_wild,
                                (select count(*)::int from public.town_catalog where key in ('forest', 'insects')) as rows`);
  t.check("…having done nothing", v.rows[0].no_word && v.rows[0].no_takes && v.rows[0].no_wild && v.rows[0].rows === 0, v.rows);
}
const V123 = (() => { try { return migration(123); } catch { return readFileSync(here("v123_draft.sql"), "utf8"); } })();
await t.run(V123, "v123");
// (v124, the fountain session's moving price, when it is there: nothing of v125 stands on it, but the two are to run one after the other)
const V124 = (() => { try { return migration(124); } catch { return existsSync(here("v124_draft.sql")) ? readFileSync(here("v124_draft.sql"), "utf8") : null; } })();
if (V124) await t.run(V124, "v124");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const NOON = Date.parse("2026-10-05T12:00:00+07:00"), MIN = 60_000, HOUR = 3_600_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
await t.runTwice(FILE, "v125");

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

/* ── the word, and the sky the cases were made with ──────────────────────── */

t.section("the word");
{
  const v = await t.sql(`select count(*)::int as n, min(length(word)) as len, bool_and(word ~ '^[0-9a-f]+$') as hex from public.town_secrets`);
  t.check("one word, long, made here", v.rows[0].n === 1 && v.rows[0].len >= 32 && v.rows[0].hex, v.rows);
  const before = (await t.sql(`select word from public.town_secrets where key = 'wild'`)).rows[0].word;
  await t.db.exec(FILE);
  const after = (await t.sql(`select word from public.town_secrets where key = 'wild'`)).rows[0].word;
  t.check("run again, the word is the one it was (what the places have does not change under anybody)", before === after);
}
await t.sql(`update public.town_secrets set word = $1 where key = 'wild'`, [told.word]);
// (the weather is kept closed: the test writes the cases' rain as the editor would)
await t.sql(`alter table public.town_weather disable trigger user`);
for (const slot of told.wet) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 9, 2) on conflict (slot) do update set sky = 'rain'`, [slot]);
await t.sql(`alter table public.town_weather enable trigger user`);

/* ── the rules, case by case ─────────────────────────────────────────────── */

const CALL = {
  wishes: "to_jsonb(town.wishes())",
  // (each asked the way one place is asked and, every other case, the way a look at all of them asks: handed the row and the word)
  wild_holds: "town.wild_holds($1::int, $2::bigint)", wild_holds_all: "town.wild_holds($1::int, $2::bigint, town.cat('forest'), town.word())",
  bug_at: "town.bug_at($1::int, $2::bigint)", bug_at_all: "town.bug_at($1::int, $2::bigint, town.cat('insects'), town.word())",
  gather: "town.gather($1::jsonb, $2::int, $3::jsonb, $4::int, $5::boolean, $6::text, $7::int, $8::int, $9::float8, $10::float8, $11::bigint)",
  net: "town.net($1::jsonb, $2::int, $3::jsonb, $4::int, $5::boolean, $6::text, $7::int, $8::int, $9::float8, $10::bigint, $11::text)",
};
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
// (the code answers a refusal with its reason only, and a purse with no stamina kept yet as it stands; the SQL the same)
t.section(`the forest's and the insects' rules: ${told.cases.length} cases, each as the site's own code answers it`);
const tally = new Map();
for (const [n, v] of told.cases.entries()) {
  const sql = CALL[n % 2 && CALL[`${v.fn}_all`] ? `${v.fn}_all` : v.fn];
  if (!sql) throw new Error(`no SQL for ${v.fn}`);
  let got, error = null;
  try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
  const ok = !error && same(got ?? null, v.want);
  const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  row.n++;
  if (!ok) { row.bad++; row.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  tally.set(v.fn, row);
}
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1800)}` : "");
if (told.cases.length) t.check("every rule was asked", Object.keys(CALL).every((fn) => fn.endsWith("_all") || tally.has(fn)), Object.keys(CALL).filter((fn) => !fn.endsWith("_all") && !tally.has(fn)));

/* ── what is written again ───────────────────────────────────────────────── */

t.section("the function written again is the one it replaces, word for word but for the line meant");
{
  const lf = (s) => s.split("\r\n").join("\n");
  const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5)); };
  const old = words(V123, "town.deed_th"), now = words(FILE, "town.deed_th"), from = "when 'exchange' then", to = "when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'\n    when 'exchange' then";
  t.check("town.deed_th is v123's, but for two words more", !!old && !!now && old !== now && old.split(from).length === 2 && old.replace(from, () => to) === now,
    !old ? "not found before" : !now ? "not in the file" : "it differs elsewhere: run build-v125.mjs");
  const v = await t.sql(`select town.deed_th('gather') as gather, town.deed_th('net') as net, town.deed_th('toss') as toss, town.deed_th('pour') as pour, town.deed_th('something new') as other`);
  t.check("its words", same(v.rows[0], { gather: "เก็บของป่า", net: "จับแมลง", toss: "โยนเหรียญลงน้ำพุ", pour: "เทน้ำลงบ่อ", other: "something new" }), v.rows);
  const oldW = words(V123, "town.wishes"), nowW = words(FILE, "town.wishes"), fromW = "'] $$", toW = "', 'forage', 'net'] $$";
  t.check("town.wishes is v123's, but for two wishes more at its end", !!oldW && !!nowW && oldW !== nowW && (oldW + "$$").split(fromW).length === 2 && (oldW + "$$").replace(fromW, () => toW) === nowW + "$$",
    !oldW ? "not found before" : !nowW ? "not in the file" : "it differs elsewhere: run build-v125.mjs");
  const w = await t.sql(`select town.wishes() as w`);
  t.check("the fountain knows the two wishes, after every one it knew", w.rows[0].w.slice(-2).join() === "forage,net" && w.rows[0].w.length >= 13 && w.rows[0].w[0] === "calm", w.rows);
  // nothing else that was here before is written by this file
  const made = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  const before = new Set();
  for (let n = 105; n <= 122; n++) for (const m of lf(migration(n)).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)) before.add(m[1]);
  for (const m of lf(V123).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)) before.add(m[1]);
  t.check("and they are the only two of the functions there were that this file writes", same(made.filter((f) => before.has(f)).sort(), ["town.deed_th", "town.wishes"]), made.filter((f) => before.has(f)));
}

/* ── the closing block ───────────────────────────────────────────────────── */

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select (select count(*)::int from public.town_secrets) as words,
  (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name in ('town_secrets', 'town_takes') and grantee in ('anon', 'authenticated')) as grants,
  (select bool_and(c.relrowsecurity) from pg_class c where c.oid in ('public.town_secrets'::regclass, 'public.town_takes'::regclass)) as closed`);
t.check("one word, two closed tables", same(v.rows[0], { words: 1, grants: 0, closed: true }), v.rows);
v = await t.sql(`select jsonb_array_length(town.cat('forest')->'spots') as places, jsonb_array_length(town.cat('insects')->'haunts') as haunts,
  town.cat('items') ? 'bugNet' as net, town.cat('shelf')->'basic' ? 'bugNet' as on_the_shelf, town.cat('cooking')->'cookware' ? 'skewer' as skewer,
  town.cat('cooking')->'never' ? 'bug' as never, town.cat('fishing')->'baits' ? 'grasshopper' as bait, town.cat('farming')->'tools'->>'ladybird' as ladybird`);
t.check("the places, the haunts, a net on the shelf, a skewer for cookware, an insect never in a pot, one on a hook and one on a plant",
  v.rows[0].places > 150 && v.rows[0].haunts > 60 && v.rows[0].net && v.rows[0].on_the_shelf && v.rows[0].skewer && v.rows[0].never && v.rows[0].bait && v.rows[0].ladybird === "guard", v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon, count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_wild', 'town_gather', 'town_bugs', 'town_net')`);
t.check("four functions, each a member's to call and none of anybody's signed out", same(v.rows[0], { anon: 0, member: 4 }), v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
  (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are no browser's", same(v.rows[0], { member_has_rules: false, open: 0 }), v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const rpc = async (who, fn, args = {}) => {
  const keys = Object.keys(args);
  const r = await t.as(who, `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, keys.map((k) => param(args[k])));
  return r.error ? { error: r.error } : r.rows[0].r;
};
const grant = async (who, item, n = 1) => { await t.sql(`insert into public.town_purses (member_id, doc) values ($1, town.fresh()) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', town.put(doc->'bag', $2, $3::int)) where member_id = $1`, [who, item, n]); };
const holdItem = (who, item) => t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text) where member_id = $1`, [who, item]);
const heldOf = async (who, item) => (await t.sql(`select town.held(doc->'bag', $2) as n from public.town_purses where member_id = $1`, [who, item])).rows[0]?.n ?? 0;
const staminaOf = async (who) => (await t.sql(`select town.stamina_of(doc, town.now_ms()) as s from public.town_purses where member_id = $1`, [who])).rows[0].s;
const spots = (await t.sql(`select town.cat('forest')->'spots' as s, town.cat('forest')->'kinds' as k`)).rows[0];
const haunts = (await t.sql(`select town.cat('insects')->'haunts' as h, town.cat('insects')->'kinds' as k, town.cat('insects')->'bugs' as b`)).rows[0];

t.section("the forest, by a member");
await clock(NOON);
let wild = await rpc(U.m1, "town_wild");
t.check("a member is told what every place has for them", !wild.error && Array.isArray(wild.wild) && wild.wild.length > 40 && wild.now === NOON, JSON.stringify(wild).slice(0, 300));
t.check("each with its number, its thing, how many and when its turn ends", wild.wild.every(([id, item, n, until]) => Number.isInteger(id) && (item === null || typeof item === "string") && n >= 1 && until > NOON));
t.check("what is buried is not told", wild.wild.every(([id, item]) => (spots.k[spots.s[id][0]].how === "dig") === (item === null)));
{
  const r = await rpc("anon", "town_wild");
  t.check("nobody signed out is told anything", !!r.error, r);
  const g = await rpc(U.nochar, "town_wild");
  t.check("nor somebody with no proved character", !!g.error || g.denied === true || !g.wild, JSON.stringify(g).slice(0, 200));
}
// something picked up: no tool, a tile beside it
const lying = wild.wild.find(([id, item]) => item && spots.k[spots.s[id][0]].how === "pick" && spots.k[spots.s[id][0]].shares === 3);
{
  const [id, item, n] = lying, [, x, y] = spots.s[id];
  const far = await rpc(U.m1, "town_gather", { p_spot: id, p_x: x + 5, p_y: y, p_went: null });
  t.check("from too far off: refused, and nothing taken", far.ok === false && far.why === "far" && (await heldOf(U.m1, item)) === 0, far);
  const did = await rpc(U.m1, "town_gather", { p_spot: id, p_x: x + 1, p_y: y, p_went: { misses: 0, wrong: 0, secs: 0 } });
  t.check("from beside it: gathered, all of it, into the bag", did.ok === true && same(did.got, [[item, n]]) && (await heldOf(U.m1, item)) === n && did.spot === id, did);
  t.check("for the stamina its kind costs", (await staminaOf(U.m1)) === 100 - spots.k[spots.s[id][0]].cost, await staminaOf(U.m1));
  const again = await rpc(U.m1, "town_gather", { p_spot: id, p_x: x + 1, p_y: y, p_went: null });
  t.check("once: a second time it is refused", again.ok === false && again.why === "had" && (await heldOf(U.m1, item)) === n, again);
  const mine = await rpc(U.m1, "town_wild");
  t.check("and the place is no longer told to them", !mine.wild.some(([i]) => i === id));
  const theirs = await rpc(U.m2, "town_wild");
  t.check("but is to the next member, who takes from it too", theirs.wild.some(([i]) => i === id) && (await rpc(U.m2, "town_gather", { p_spot: id, p_x: x, p_y: y })).ok === true);
  const third = await rpc(U.admin, "town_gather", { p_spot: id, p_x: x, p_y: y });
  const fourth = await rpc(U.guest, "town_gather", { p_spot: id, p_x: x, p_y: y });
  t.check("three may, and the fourth finds it bare", third.ok === true && fourth.ok === false && fourth.why === "bare", { third, fourth });
  const d = await t.sql(`select what, thing, n::int as n, coins::int as coins, doc from public.town_deeds where member_id = $1 and what = 'gather'`, [U.m1]);
  t.check("the deed is written down: what, how many, where, how the game went",
    d.rows.length === 1 && d.rows[0].thing === item && d.rows[0].n === n && d.rows[0].doc.spot === id && d.rows[0].doc.how === "pick" && same(d.rows[0].doc.tile, [x + 1, y]) && d.rows[0].doc.spent === false, d.rows);
  // the next turn: there may be something again, and the place is theirs to take from once more
  await clock(NOON + 10 * MIN);
  const next = await rpc(U.m1, "town_wild");
  const has = (await t.sql(`select town.wild_holds($1, town.now_ms()) as h`, [id])).rows[0].h;
  t.check("in its next turn the place is told again, if it has something", next.wild.some(([i]) => i === id) === !!has, { has });
  await clock(NOON);
}
// something dug: a hoe in the hand, and misses that cost one each
{
  const buried = wild.wild.filter(([id]) => spots.k[spots.s[id][0]].how === "dig");
  const [id, , n] = buried.find(([, , n]) => n >= 2) ?? buried[0], [, x, y] = spots.s[id];
  const bare = await rpc(U.m2, "town_gather", { p_spot: id, p_x: x, p_y: y });
  t.check("digging with empty hands is refused", bare.ok === false && bare.why === "tool", bare);
  await grant(U.m2, "hoe");
  await holdItem(U.m2, "hoe");
  const did = await rpc(U.m2, "town_gather", { p_spot: id, p_x: x, p_y: y, p_went: { misses: 1, wrong: 3, secs: 12.5 } });
  t.check("with a hoe it is dug out, one fewer for the miss and never none", did.ok === true && did.got.length === 1 && did.got[0][1] === Math.max(1, n - 1), { did, n });
  const d = await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'gather' order by id desc limit 1`, [U.m2]);
  t.check("and the hoe and the misses are in the deed", d.rows[0].doc.hand === "hoe" && d.rows[0].doc.misses === 1 && d.rows[0].doc.secs === 12.5 && d.rows[0].doc.how === "dig", d.rows);
}
// mushrooms: a wrong one is a toadstool besides
{
  const shroom = wild.wild.find(([id]) => spots.s[id][0] === "mushrooms");
  if (shroom) {
    const [id, item, n] = shroom, [, x, y] = spots.s[id];
    const did = await rpc(U.admin, "town_gather", { p_spot: id, p_x: x, p_y: y, p_went: { misses: 0, wrong: 9, secs: 4 } });
    t.check("among mushrooms every wrong one taken is a toadstool, two at the most", did.ok === true && same(did.got, [[item, n], ["toadstool", 2]]), did);
  } else t.check("(no mushrooms at this hour to try a toadstool with)", true);
}
{
  const bad = [await rpc(U.m1, "town_gather", { p_spot: -1, p_x: 0, p_y: 0 }), await rpc(U.m1, "town_gather", { p_spot: 99999, p_x: 0, p_y: 0 }), await rpc(U.m1, "town_gather", { p_spot: null, p_x: null, p_y: null })];
  t.check("a place that is none is answered, not an error", bad.every((b) => b.ok === false && b.why === "none"), bad);
  const junk = await rpc(U.m1, "town_gather", { p_spot: lying[0], p_x: spots.s[lying[0]][1], p_y: spots.s[lying[0]][2], p_went: { misses: "many", wrong: [1], secs: {} } });
  t.check("an account of the game that is nonsense is read as nothing, and the rule answers", junk.ok === false && junk.why === "had", junk);
}

t.section("insects, by a member");
// a night, for the moths, the crickets and the beetles
const NIGHT = Date.parse("2026-10-05T22:00:00+07:00");
await clock(NIGHT);
let bugs = await rpc(U.m1, "town_bugs");
t.check("a member is told which haunts have an insect for them", !bugs.error && Array.isArray(bugs.bugs) && bugs.bugs.length > 10 && bugs.now === NIGHT, JSON.stringify(bugs).slice(0, 300));
t.check("each with its number, the insect, its turn, its seed and when the turn ends", bugs.bugs.every(([id, bug, turn, seed, until]) => haunts.b[bug] && seed === id * 100003 + turn && until > NIGHT));
t.check("and the book, empty", same(bugs.book, {}), bugs.book);
t.check("nobody signed out is told anything", !!(await rpc("anon", "town_bugs")).error);
const tileBy = (id) => { const [x, y] = haunts.h[id][3][0]; return [Math.floor(x), Math.floor(y)]; };
{
  const [id, bug] = bugs.bugs.find(([, b]) => haunts.b[b].habit !== "lure"), [x, y] = tileBy(id), n = haunts.b[bug].n[0];
  const bare = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y, p_misses: 0 });
  t.check("with no net in the hand: refused", bare.ok === false && bare.why === "tool", bare);
  await grant(U.m1, "bugNet");
  await holdItem(U.m1, "bugNet");
  const far = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x + 40, p_y: y, p_misses: 0 });
  t.check("from another part of the map: refused", far.ok === false && far.why === "far", far);
  const before = await staminaOf(U.m1), had = await heldOf(U.m1, bug);
  const did = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y, p_misses: 5 });
  t.check("with a net, from near: caught, and in the bag", did.ok === true && did.got[0][0] === bug && (await heldOf(U.m1, bug)) >= had + n && did.haunt === id, did);
  t.check("for its stamina and two more, however many swings missed", before - (await staminaOf(U.m1)) === haunts.b[bug].cost + 2, before - (await staminaOf(U.m1)));
  t.check("the village's first of its kind", did.first === true);
  const again = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y });
  t.check("once: a second time it is refused", again.ok === false && again.why === "had", again);
  const book = (await rpc(U.m2, "town_bugs")).book;
  t.check("and the book says who caught the first, by the name the site knows them by", typeof book[bug] === "string" && book[bug].length > 0, book);
  const d = await t.sql(`select thing, n::int as n, doc from public.town_deeds where member_id = $1 and what = 'net'`, [U.m1]);
  t.check("the deed is written down", d.rows.length === 1 && d.rows[0].thing === bug && d.rows[0].doc.haunt === id && d.rows[0].doc.misses === 5 && d.rows[0].doc.first === true && d.rows[0].doc.map === haunts.h[id][1], d.rows);
  await grant(U.m2, "bugNet");
  await holdItem(U.m2, "bugNet");
  const second = await rpc(U.m2, "town_net", { p_haunt: id, p_x: x, p_y: y });
  t.check("the next member catches it too, and is not the first", second.ok === true && second.first === false, second);
}
// a beetle: only to something sweet in another's hand
{
  const beetle = bugs.bugs.find(([, b]) => haunts.b[b].habit === "lure");
  if (beetle) {
    const [id, bug] = beetle, [x, y] = tileBy(id);
    const alone = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y });
    t.check("a beetle is not caught by somebody alone", alone.ok === false && alone.why === "lure", alone);
    const self = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y, p_by: U.m1 });
    t.check("nor by naming oneself", self.ok === false && self.why === "lure", self);
    const empty = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y, p_by: U.admin });
    t.check("nor with somebody who holds nothing sweet", empty.ok === false && empty.why === "lure", empty);
    await grant(U.admin, "resin");
    await holdItem(U.admin, "resin");
    const did = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y, p_by: U.admin });
    t.check("with somebody who holds resin, it is", did.ok === true && did.got[0][0] === bug, did);
    t.check("the resin is still theirs", (await heldOf(U.admin, "resin")) === 1);
    const d = await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'net' order by id desc limit 1`, [U.m1]);
    t.check("and the deed says what was held, and by whom", d.rows[0].doc.lure === "resin" && d.rows[0].doc.by === U.admin, d.rows);
  } else t.check("(no beetle out at this hour to try the lure with)", false, bugs.bugs.map(([, b]) => b));
}
{
  const bad = [await rpc(U.m1, "town_net", { p_haunt: -1, p_x: 0, p_y: 0 }), await rpc(U.m1, "town_net", { p_haunt: 99999, p_x: 0, p_y: 0 }), await rpc(U.m1, "town_net", { p_haunt: null, p_x: null, p_y: null })];
  t.check("a haunt that is none is answered, not an error", bad.every((b) => b.ok === false && b.why === "none"), bad);
}

t.section("what no browser may");
{
  for (const who of ["anon", U.m1]) {
    const label = who === "anon" ? "somebody signed out" : "a member";
    let r = await t.as(who, `select word from public.town_secrets`);
    t.check(`${label} cannot read the word`, !!r.error || r.rows.length === 0, r);
    r = await t.as(who, `select town.word()`);
    t.check(`${label} cannot ask the rules for it`, !!r.error, r);
    r = await t.as(who, `select town.wild_holds(0, 0, null, 'guess')`);
    t.check(`${label} cannot ask what a place will have`, !!r.error, r);
    r = await t.as(who, `select * from public.town_takes`);
    t.check(`${label} cannot read who took what`, !!r.error || r.rows.length === 0, r);
    r = await t.as(who, `insert into public.town_takes (what, place, turn, member_id) values ('spot', 0, 0, '${U.m1}')`);
    t.check(`${label} cannot write that they took, or that somebody else did`, !!r.error, r);
  }
  const told2 = JSON.stringify([await rpc(U.m1, "town_wild"), await rpc(U.m1, "town_bugs"), await rpc(U.m1, "town_gather", { p_spot: 0, p_x: 0, p_y: 0 })]);
  t.check("and nothing a member is answered has the word in it", !told2.includes(told.word), told2.slice(0, 200));
}

t.section("the tally");
{
  const v2 = await t.sql(`select what, th, sum(times)::int as times from town.tally() where what in ('gather', 'net') group by 1, 2 order by 1`);
  t.check("gathering and catching are counted, each by its Thai word", v2.rows.length === 2 && v2.rows[0].th === "เก็บของป่า" && v2.rows[1].th === "จับแมลง" && v2.rows[0].times >= 5 && v2.rows[1].times >= 2, v2.rows);
  const takes = await t.sql(`select what, count(*)::int as n from public.town_takes group by 1 order by 1`);
  t.check("who took what is kept, a line to a taking", takes.rows.length === 2 && takes.rows.every((r) => r.n >= 2), takes.rows);
}

t.done();
