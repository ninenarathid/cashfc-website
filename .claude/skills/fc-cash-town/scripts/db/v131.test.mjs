/*
 * v131 — an insect caught is gone for everybody, and comes back elsewhere: dry run in PGlite.
 *
 * v131 makes an insect one member's (every kind's `shares` 1), brings one back at another haunt of the map half a
 * minute after a catch (`town_comebacks`; `town.backs_now`, `town.bug_here`, `town.comeback`), writes `town_bugs` and
 * `town_net` again for it, has the common insects fetch about a third less (the `items` row) and turns the relatives'
 * usual amount of an insect down with it (`market_bug`).
 *
 * v105 to v125 are replayed as they ran, then v127 to v130 where they are there, then v126 (its draft, until it has
 * run), then v131 twice. Then: every case of the two rules made from the code as it is, with the word and the sky
 * they were made with; the two functions written again held to the text they replace but for the lines of
 * v131.lines.mjs; and the keeping: one catcher, gone for the next, one back half a minute later somewhere else on
 * that map, seen by everybody from then and caught once, bringing nothing back; the deeds; the knob; who may.
 *
 *   node build-v131.mjs && node v131.test.mjs            (RULES=0 skips the cases; RULES=few puts one in four, for the breaks)
 *   node mutate.mjs v131_draft.sql v131.test.mjs v131.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { TOWN_BUGS, TOWN_NET } from "./v131.lines.mjs";

// (the site's own number for the knob this file turns: lib/town/market, loaded as v124's dry run loads it)
await import("./repo-ts-town.mjs");
const { MARKET } = await import("@/lib/town/market");

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v131_draft.sql")) ? readFileSync(here("v131_draft.sql"), "utf8") : migration(131);
const told = JSON.parse(readFileSync(here("now/vectors-v131.json"), "utf8"));
const cases = process.env.RULES === "0" ? [] : process.env.RULES === "few" ? told.cases.filter((c, i) => i % 4 === 0 || c.want === null) : told.cases;

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
for (let n = 105; n <= 125; n++) await t.run(migration(n), `v${n}`);
const V125 = migration(125);
for (const n of [127, 128, 129, 130]) { let sql = null; try { sql = migration(n); } catch { /* not written yet, or not this tree's */ } if (sql) await t.run(sql, `v${n}`); }

t.section("it will not run before v126");
{
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v126, it stops at its first line and says why", !!stopped && /v126 has not run/.test(stopped), stopped);
  const v = await t.sql(`select to_regclass('public.town_comebacks') is null as no_table, to_regprocedure('town.comeback(integer, bigint, jsonb, double precision, double precision, double precision, jsonb, text)') is null as no_rule,
    (select value from public.town_knobs where key = 'market_bug') as knob, town.cat('insects')->'kinds'->'field'->>'shares' as shares`);
  t.check("…having done nothing", v.rows[0].no_table && v.rows[0].no_rule && Number(v.rows[0].knob) === 10 && v.rows[0].shares === "3", v.rows);
}
const V126 = (() => { try { return migration(126); } catch { return readFileSync(here("v126_draft.sql"), "utf8"); } })();
await t.run(V126, "v126");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const NOON = Date.parse("2026-10-05T12:00:00+07:00"), SEC = 1000, MIN = 60_000, HOUR = 3_600_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
const before = Object.fromEntries((await t.sql(`select key, data from public.town_catalog where key in ('insects', 'items')`)).rows.map((r) => [r.key, r.data]));
await t.runTwice(FILE, "v131");

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);

/* ── the catalog rows, and the knob ──────────────────────────────────────── */

t.section("the rows, and the relatives' usual amount");
{
  const now = Object.fromEntries((await t.sql(`select key, data from public.town_catalog where key in ('insects', 'items')`)).rows.map((r) => [r.key, r.data]));
  t.check("an insect is one member's: every kind of haunt has it once", Object.keys(now.insects.kinds).length === 8 && Object.values(now.insects.kinds).every((k) => k.shares === 1)
    && Object.values(before.insects.kinds).every((k) => k.shares === 3), now.insects.kinds);
  t.check("it comes back half a minute later, where two minutes of a turn are left", same(now.insects.comeback, { after: 30, least: 120 }) && !("comeback" in before.insects), now.insects.comeback);
  const but = (row) => ({ ...row, kinds: Object.fromEntries(Object.entries(row.kinds).map(([k, v]) => [k, { ...v, shares: null }])), comeback: null });
  t.check("nothing else of the insects' row is other than it was: every insect, every haunt, a turn's minutes and its chance, the net", same(but(now.insects), but(before.insects)),
    Object.keys(now.insects).filter((k) => !same(but(now.insects)[k], but(before.insects)[k])));
  const PAYS = { butterflyWhite: [3, 2], monarch: [4, 3], dragonfly: [3, 2], damselfly: [7, 5], grasshopper: [3, 2], mantis: [9, 7], cicada: [7, 5], stickInsect: [8, 5], leafInsect: [8, 6], firefly: [6, 4], ladybird: [3, 2], scarab: [4, 3] };
  t.check("twelve common insects fetch about a third less", Object.entries(PAYS).every(([id, [was, is]]) => before.items[id].pays === was && now.items[id].pays === is),
    Object.keys(PAYS).map((id) => [id, before.items[id].pays, now.items[id].pays]));
  const changed = Object.keys(now.items).filter((id) => !same(now.items[id], before.items[id]));
  t.check("and nothing else of any thing is touched: no other thing, and of those twelve only what they fetch", same(changed.sort(), Object.keys(PAYS).sort()) && same(Object.keys(now.items), Object.keys(before.items))
    && changed.every((id) => same({ ...now.items[id], pays: 0 }, { ...before.items[id], pays: 0 })), changed);
  t.check("the rare ones are as they were", ["morpho", "glassDragonfly", "orchidMantis", "lunaMoth", "hawkMoth", "stagBeetle", "jewelBeetle", "herculesBeetle", "rhinoBeetle"].every((id) => now.items[id].pays === before.items[id].pays)
    && now.items.glassDragonfly.pays === 60 && now.items.herculesBeetle.pays === 150);
  const knob = async () => Number((await t.sql(`select value from public.town_knobs where key = 'market_bug'`)).rows[0].value);
  t.check("the relatives' usual amount of an insect is 7 coins a head a round, where it was 10", (await knob()) === 7, await knob());
  const K = (await t.sql(`select town.market_knobs() as k`)).rows[0].k;
  t.check("which is the number the site's own code has, as every other knob of the market's is", K.usual.bug === 7 && same(K, { ...MARKET, usual: { crop: 30, fish: 15, catch: 10, dish: 15, goods: 15, wild: 15, bug: 7 } }), { code: MARKET.usual, knobs: K.usual });
  await t.sql(`update public.town_knobs set value = 12 where key = 'market_bug'`);
  await t.db.exec(FILE);
  t.check("one an admin has turned stays turned when the file runs again", (await knob()) === 12, await knob());
  await t.sql(`update public.town_knobs set value = 7 where key = 'market_bug'`);
  const others = await t.sql(`select count(*)::int as n from public.town_knobs where key like 'market\\_%' and key <> 'market_bug'`);
  t.check("and no other knob of the market's is written by this file", others.rows[0].n >= 18 && !/market_(?!bug)/.test(FILE.replace(/--.*$/gm, "")), others.rows);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

await t.sql(`update public.town_secrets set word = $1 where key = 'wild'`, [told.word]);
await t.sql(`alter table public.town_weather disable trigger user`);
for (const slot of told.wet) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 9, 2) on conflict (slot) do update set sky = 'rain'`, [slot]);
await t.sql(`alter table public.town_weather enable trigger user`);

const CALL = {
  // (each asked the way one haunt is asked and, every other case, the way a look at all of them asks: handed the row and the word)
  bug_here: "town.bug_here($1::int, $2::bigint, $3::jsonb)", bug_here_all: "town.bug_here($1::int, $2::bigint, $3::jsonb, town.cat('insects'), town.word())",
  comeback: "town.comeback($1::int, $2::bigint, $3::jsonb, $4::float8, $5::float8, $6::float8)",
  comeback_all: "town.comeback($1::int, $2::bigint, $3::jsonb, $4::float8, $5::float8, $6::float8, town.cat('insects'), town.word())",
};
t.section(`an insect's coming back: ${cases.length} cases, each as the site's own code answers it`);
{
  const tally = new Map();
  for (const [n, v] of cases.entries()) {
    const sql = CALL[n % 2 ? `${v.fn}_all` : v.fn];
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    const ok = !error && same(got ?? null, v.want);
    const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: [v.args[0], v.args[1], (v.args[2] ?? []).length, ...v.args.slice(3)], want: v.want, got: error ?? got }; }
    tally.set(v.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1200)}` : "");
  if (cases.length) t.check("both rules were asked", tally.has("bug_here") && tally.has("comeback"), [...tally.keys()]);
}

/* ── what is written again ───────────────────────────────────────────────── */

t.section("the functions written again are the ones they replace, word for word but for the lines meant");
const lf = (s) => s.split("\r\n").join("\n");
const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3); };
{
  for (const [name, from, lines, whose] of [["public.town_bugs", V125, TOWN_BUGS, "v125"], ["public.town_net", V126, TOWN_NET, "v126"]]) {
    const old = words(from, name), now = words(FILE, name);
    let made = old, once = true;
    for (const [a, b] of lines) { if (!made || made.split(a).length !== 2) once = false; else made = made.replace(a, () => b); }
    t.check(`${name} is ${whose}'s, but for the lines of v131.lines.mjs`, !!old && !!now && once && old !== now && made === now,
      !old ? `not found in ${whose}` : !now ? "not in the file" : !once ? `a line meant is not in ${whose}'s once` : "it differs elsewhere: run build-v131.mjs");
  }
  const made = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  t.check("the file makes five functions: three rules, and the two a member calls", same(made.sort(), ["public.town_bugs", "public.town_net", "town.backs_now", "town.bug_here", "town.comeback"]), made);
  const net = words(FILE, "public.town_net");
  t.check("a catch still takes its haunt's lock first, and a ladybird's doing is as v126 wrote it", !!net && net.includes("perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));")
    && net.indexOf("pg_advisory_xact_lock(hashtext('town:haunt:'") < net.indexOf("town.backs_now(now_)") && net.includes("rid := town.rid_pick(") && net.includes("perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));"));
}

/* ── the closing block ───────────────────────────────────────────────────── */

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select (select count(*)::int from jsonb_each(town.cat('insects')->'kinds') k where (k.value->>'shares')::int = 1) as kinds_of_one,
  (select count(*)::int from jsonb_each(town.cat('insects')->'kinds')) as kinds, town.cat('insects')->'comeback' as comeback`);
t.check("eight kinds of one, and the coming back", same(v.rows[0], { kinds_of_one: 8, kinds: 8, comeback: { after: 30, least: 120 } }), v.rows);
v = await t.sql(`select town.cat('items')->'ladybird'->>'pays' as ladybird, town.cat('items')->'cicada'->>'pays' as cicada,
  town.cat('items')->'glassDragonfly'->>'pays' as glass_dragonfly, town.cat('items')->'herculesBeetle'->>'pays' as hercules`);
t.check("a ladybird 2, a cicada 5, a glass dragonfly 60, a Hercules beetle 150", same(v.rows[0], { ladybird: "2", cicada: "5", glass_dragonfly: "60", hercules: "150" }), v.rows);
v = await t.sql(`select c.relrowsecurity as closed, (select count(*)::int from information_schema.role_table_grants g
  where g.table_schema = 'public' and g.table_name = 'town_comebacks' and g.grantee in ('anon', 'authenticated')) as grants from pg_class c where c.oid = 'public.town_comebacks'::regclass`);
t.check("what has come back is kept closed", same(v.rows[0], { closed: true, grants: 0 }), v.rows);
v = await t.sql(`select has_function_privilege('authenticated', 'public.town_bugs()', 'execute') as bugs, has_function_privilege('anon', 'public.town_bugs()', 'execute') as bugs_anon,
  has_function_privilege('authenticated', 'public.town_net(integer, integer, integer, numeric, uuid)', 'execute') as net, has_function_privilege('anon', 'public.town_net(integer, integer, integer, numeric, uuid)', 'execute') as net_anon,
  (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the two are a member's and nobody's signed out, and the rules are no browser's", same(v.rows[0], { bugs: true, bugs_anon: false, net: true, net_anon: false, open: 0 }), v.rows);

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
const haunts = (await t.sql(`select town.cat('insects')->'haunts' as h, town.cat('insects')->'kinds' as k, town.cat('insects')->'bugs' as b`)).rows[0];
const tileBy = (id) => { const [x, y] = haunts.h[id][3][0]; return [Math.floor(x), Math.floor(y)]; };
const comebacks = async () => (await t.sql(`select haunt, turn::text as turn, bug, n, from_ms::text as from_ms, by from public.town_comebacks order by from_ms, haunt`)).rows;
const sees = async (who, id) => { const b = await rpc(who, "town_bugs"); return b.bugs.find(([i]) => i === id) ?? null; };

t.section("an insect caught, by two members");
for (const who of [U.m1, U.m2, U.admin]) { await grant(who, "bugNet"); await holdItem(who, "bugNet"); }
// a noon of the first, dry day: a haunt of the farm with an insect of its own that one alone can catch
await clock(NOON);
{
  const first = await rpc(U.m1, "town_bugs");
  t.check("what is out is told, and nothing has come back yet: nothing to ask again for", Array.isArray(first.bugs) && first.bugs.length > 10 && first.bugsAgain === null && (await comebacks()).length === 0, { n: first.bugs?.length, again: first.bugsAgain });
  const own = first.bugs.find(([id, bug]) => haunts.h[id][1] === "farm" && haunts.b[bug].habit !== "lure");
  const [id, bug, turn] = own, [x, y] = tileBy(id), map = haunts.h[id][1];
  t.check("both members are told the same insect at the same haunt", same((await sees(U.m2, id))?.slice(0, 3), [id, bug, turn]));
  const did = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y, p_misses: 0 });
  t.check("the first to swing catches it", did.ok === true && did.got[0][0] === bug && (await heldOf(U.m1, bug)) >= 1 && did.haunt === id, did);
  t.check("it is told to nobody any more: not to whoever caught it, not to the other", (await sees(U.m1, id)) === null && (await sees(U.m2, id)) === null);
  const second = await rpc(U.m2, "town_net", { p_haunt: id, p_x: x, p_y: y, p_misses: 0 });
  t.check("the other, swinging at where it was, is told it is gone, and has nothing", second.ok === false && second.why === "bare" && (await heldOf(U.m2, bug)) === 0, second);
  const again = await rpc(U.m1, "town_net", { p_haunt: id, p_x: x, p_y: y });
  t.check("and whoever caught it cannot catch it again", again.ok === false && again.why === "had", again);

  const rows = await comebacks();
  t.check("one is to come back: one line, at another haunt of the same map, half a minute on, by whose catch", rows.length === 1 && rows[0].haunt !== id && haunts.h[rows[0].haunt][1] === map
    && Number(rows[0].from_ms) === NOON + 30 * SEC && rows[0].by === U.m1 && !!haunts.b[rows[0].bug], rows);
  const back = rows[0], there = back.haunt;
  t.check("where it comes back had nothing of its own in that turn, and an insect that keeps to such a haunt comes", (await t.sql(`select town.bug_at($1::int, $2::bigint) as own`, [there, NOON + 30 * SEC])).rows[0].own === null
    && haunts.b[back.bug].at.includes(haunts.h[there][0]), back);
  t.check("whoever caught it is told when to ask again, and not where", did.bugsAgain === NOON + 30 * SEC && !JSON.stringify(did).includes(`"next"`) && !("back" in did), did);
  const d = await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'net' order by id desc limit 1`, [U.m1]);
  t.check("the deed says where its insect comes back, and not that it was one come back itself", d.rows[0].doc.next === there && !("back" in d.rows[0].doc) && d.rows[0].doc.haunt === id, d.rows);
  // before its moment
  await clock(NOON + 29 * SEC);
  const early = await rpc(U.m2, "town_bugs");
  t.check("a moment before, it is told to nobody, and everybody is told when to ask again", !early.bugs.some(([i]) => i === there) && early.bugsAgain === NOON + 30 * SEC, { again: early.bugsAgain });
  const tooSoon = await rpc(U.m2, "town_net", { p_haunt: there, p_x: tileBy(there)[0], p_y: tileBy(there)[1] });
  t.check("and a swing at where it will be catches nothing", tooSoon.ok === false && tooSoon.why === "none", tooSoon);
  // from its moment
  await clock(NOON + 30 * SEC);
  const a = await sees(U.m1, there), b = await sees(U.m2, there);
  t.check("from its moment both are told it: the same insect, of that haunt's turn, until the turn ends", !!a && same(a, b) && a[1] === back.bug && String(a[2]) === back.turn && a[4] > NOON + 30 * SEC + 2 * MIN - 1, { a, b });
  t.check("and nobody is told to ask again", (await rpc(U.m1, "town_bugs")).bugsAgain === null);
  const lured = haunts.b[back.bug].habit === "lure";
  if (lured) { await grant(U.admin, "resin"); await holdItem(U.admin, "resin"); }
  const [bx, by] = tileBy(there), had = await heldOf(U.m2, back.bug);
  const took = await rpc(U.m2, "town_net", { p_haunt: there, p_x: bx, p_y: by, ...(lured ? { p_by: U.admin } : {}) });
  t.check("the other catches the one that came back", took.ok === true && took.got[0][0] === back.bug && (await heldOf(U.m2, back.bug)) === had + back.n, took);
  t.check("it brings nothing back: no second line, and nothing to ask again for", (await comebacks()).length === 1 && !("bugsAgain" in took), { rows: await comebacks(), took });
  const d2 = await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'net' order by id desc limit 1`, [U.m2]);
  t.check("its deed says it was one that had come back, and names no next", d2.rows[0].doc.back === true && !("next" in d2.rows[0].doc) && d2.rows[0].doc.haunt === there, d2.rows);
  t.check("and it is told to nobody any more", (await sees(U.m1, there)) === null && (await sees(U.m2, there)) === null && (await sees(U.admin, there)) === null);
  const late = await rpc(U.m1, "town_net", { p_haunt: there, p_x: bx, p_y: by });
  t.check("whoever swings at it afterwards is told it is gone", late.ok === false && late.why === "bare", late);
  // the haunt's next turn is its own again
  const until = a[4];
  await clock(until + 1);
  const next = (await t.sql(`select town.bug_here($1::int, town.now_ms(), town.backs_now(town.now_ms())) as h, town.bug_at($1::int, town.now_ms()) as own`, [there])).rows[0];
  t.check("in its next turn the haunt has what it rolls for itself, or nothing: what came back is over", same(next.h, next.own), next);
  await clock(NOON + 30 * SEC);
}
{
  // several catches at once: each of a haunt's own brings one back, each at a haunt of its own
  const out = (await rpc(U.admin, "town_bugs")).bugs.filter(([id, bug]) => haunts.h[id][1] === "forest" && haunts.b[bug].habit !== "lure").slice(0, 6);
  const start = (await comebacks()).length;
  let caught = 0;
  for (const [id] of out) { const [x, y] = tileBy(id); if ((await rpc(U.admin, "town_net", { p_haunt: id, p_x: x, p_y: y })).ok === true) caught++; }
  const rows = (await comebacks()).slice(start);
  t.check("six caught in the forest bring six back, each at a haunt of its own, all in the forest, none where one was just caught", caught === out.length && out.length === 6 && rows.length === 6
    && new Set(rows.map((r) => r.haunt)).size === 6 && rows.every((r) => haunts.h[r.haunt][1] === "forest" && !out.some(([id]) => id === r.haunt)), { caught, rows });
  // old lines are thrown away as catches go on
  await t.sql(`insert into public.town_comebacks (haunt, turn, bug, n, from_ms) values (0, 1, 'ladybird', 1, $1)`, [NOON - 7 * HOUR]);
  const one = (await rpc(U.m1, "town_bugs")).bugs.find(([id, bug]) => haunts.h[id][1] === "town" && haunts.b[bug].habit !== "lure");
  if (one) await rpc(U.m1, "town_net", { p_haunt: one[0], p_x: tileBy(one[0])[0], p_y: tileBy(one[0])[1] });
  t.check("a line six hours old is thrown away at the next catch", !!one && !(await comebacks()).some((r) => r.haunt === 0 && r.turn === "1"), await comebacks());
}

t.section("what no browser may");
for (const who of ["anon", U.m1]) {
  const label = who === "anon" ? "somebody signed out" : "a member";
  let r = await t.as(who, `select * from public.town_comebacks`);
  t.check(`${label} cannot read where insects come back`, !!r.error || r.rows.length === 0, r);
  r = await t.as(who, `insert into public.town_comebacks (haunt, turn, bug, n, from_ms) values (1, 1, 'herculesBeetle', 1, 0)`);
  t.check(`${label} cannot write one back`, !!r.error, r);
  r = await t.as(who, `select town.comeback(0, 0, '[]'::jsonb, 0.5, 0.5, 0.5)`);
  t.check(`${label} cannot ask the rule where one would come back`, !!r.error, r);
  r = await t.as(who, `select town.backs_now(0)`);
  t.check(`${label} cannot ask the rules what has come back`, !!r.error, r);
}
{
  const r = await rpc("anon", "town_bugs");
  t.check("nobody signed out is told what is out", !!r.error, r);
  const told2 = JSON.stringify([await rpc(U.m1, "town_bugs"), await rpc(U.m2, "town_net", { p_haunt: 0, p_x: 0, p_y: 0 })]);
  t.check("and nothing a member is answered has the word in it", !told2.includes(told.word), told2.slice(0, 200));
}

t.section("how long it takes");
{
  const from = haunts.h.findIndex((h) => h[1] === "forest");
  let began = Date.now();
  for (let i = 0; i < 5; i++) await t.sql(`select town.comeback($1::int, town.now_ms(), town.backs_now(town.now_ms()), 0.5, 0.5, 0.5)`, [from]);
  const one = (Date.now() - began) / 5;
  began = Date.now();
  await rpc(U.m1, "town_bugs");
  const all = Date.now() - began;
  console.log(`  (where one comes back in the forest, its fifty-nine haunts looked over: ${one.toFixed(0)} ms here; what is out for a member: ${all} ms)`);
  t.check("a catch can wait for it", one < 4000 && all < 6000, { one, all });
}

t.done();
