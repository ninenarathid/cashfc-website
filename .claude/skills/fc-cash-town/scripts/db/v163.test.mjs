/*
 * v163 (the lamp relay at dusk) tried against the stand-in database as it is after the last file that ran, with
 * v160's draft on it (the bridge built by hand, which it stands on): stand-in.mjs's snapshot, loaded in a second, in
 * memory: nothing is written anywhere.
 *
 *   TOWN_VECTORS=<here>/now npx vitest run lib/town/db-vectors-lamps.test.ts         (in the tree: writes the cases)
 *   FC_REPO=<the tree whose code is meant> node v163.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the draft> v163.test.mjs v163.mutations.mjs                     (STORIES=few for the breaks)
 *
 * It reads the draft beside this file (`v163_draft.sql`) while there is one, then supabase/'s in the root given, then
 * history once it has run; and v160's the same way. What is held:
 *   · the file adds three tables, closed, and fourteen functions, four of them a member's to call; `town.work_counts_of`
 *     and `town.deed_th` are the ones they replace (v160's, with its block), word for word, but for the lines meant;
 *     nothing else of the town's is written, dropped or given to anybody; the catalog has one row more, the code's,
 *     and no other differs;
 *   · the rules are the site's own, case by case (lib/town/db-vectors-lamps.test.ts makes the cases from
 *     lib/town/lamps.ts);
 *   · stories of four members through a night, by day, through the morning and into the next evening, through the
 *     functions a member calls, with the test's clock: every answer, the doer's stamina, what each is told, and at
 *     the end what is kept, the helpers' line among it;
 *   · said plainly once each: a flame through three hands and the post it lights, the second of grace, tired hands,
 *     never from a lamp, what stands in the way, the last lamp of a map and the night counted, the morning after
 *     and the next evening, and who may.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { LAMPS, nightOf, nightEnds } = await import("@/lib/town/lamps");

const [root] = process.argv.slice(2);
const lf = (s) => s.split("\r\n").join("\n");
/** A file of the town's by its number: the draft beside this file while there is one, then supabase/'s in the root given, then history. */
const fileOf = (n) => {
  const beside = new URL(`./v${n}_draft.sql`, import.meta.url);
  const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith(`v${n}_`)) : null;
  return lf(existsSync(beside) ? readFileSync(beside, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(n));
};
const FILE = process.env.MIGRATION_FILE ? lf(readFileSync(process.env.MIGRATION_FILE, "utf8")) : fileOf(163);
const V160 = fileOf(160);
const CASES = JSON.parse(readFileSync(new URL("./now/vectors-v163.json", import.meta.url), "utf8"));
const FEW = process.env.STORIES === "few";
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const NIGHT = Date.parse("2026-10-08T21:00:00+07:00"), NOON = Date.parse("2026-10-08T12:00:00+07:00");
const FARM = LAMPS.maps.farm, FOREST = LAMPS.maps.forest, LIFE = LAMPS.life * 1000;

const t0 = Date.now();
const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
// the test's clock in the place of the database's (before anything is compared: its text is not the file's to touch)
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NIGHT});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = ${ms}`);
// v160's draft first: this file stands on it (a stone in the hands is not empty hands, and the two functions written again are v160's)
await t.db.exec(V160);

/** As PostgREST calls it: by the names of the words sent, and only those. */
const call = async (who, fn, words = {}) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
const take = (who, map = "farm", at = LAMPS.maps[map]?.fire ?? FARM.fire) => call(who, "town_flame_take", { p_map: map, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
const pass = (who, to) => call(who, "town_flame_pass", { p_to: to });
const light = (who, post, map = "farm", at = LAMPS.maps[map]?.posts[post] ?? FARM.posts[0]) => call(who, "town_lamp_light", { p_map: map, p_post: post, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
const read = async (who) => (await call(who, "town_lamps_read"))?.lamps ?? null;
const bagOf = (...things) => [...things, ...Array(10).fill(null)].slice(0, 10);
/** A member's purse laid anew: this bag, so much stamina today, and whatever else. */
const purse = (who, bag = bagOf(), left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::int)) || $4::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, JSON.stringify(bag), left, JSON.stringify(more)]);
const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
const staminaOf = async (who) => (await one(`select town.stamina_of(town.purse_kept($1, false), town.now_ms()) as n`, [who])).n;
const deeds = async (since = 0) => rows(`select d.id, d.member_id as by, d.what, d.thing, d.n::int as n, d.coins::int as coins, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [since]);
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as n from public.town_deeds`)).n);
const helpersOf = async (who) => (await one(`select w.kept from public.town_work w where w.member_id = $1 and w.line = 'helpers'`, [who]))?.kept ?? null;
/** Every post lit, as it is kept: the night, the map, the post, when, whose hands its flame came by; with `by`, who lit it too. */
const litOf = async (by = false) => (await rows(`select l.night, l.map, l.post, round(extract(epoch from l.lit_at) * 1000)::float8 as at, l.hands, l.member_id as by from public.town_lamps_lit l order by l.night, l.map, l.post`))
  .map((r) => ({ night: r.night, map: r.map, post: r.post, at: r.at, hands: r.hands, ...(by ? { by: r.by } : {}) }));
/** Who bears a flame (one that has gone out among them: it stays until it is written over), and the nights every lamp of a map was lit. */
const flamesOf = async () => Object.fromEntries((await rows(`select f.member_id as id, f.map, f.hands, f.until_ms::float8 as until from public.town_lamp_flames f`)).map((r) => [r.id, { from: r.map, until: r.until, hands: r.hands }]));
const fullOf = async () => rows(`select n.night, n.map, round(extract(epoch from n.full_at) * 1000)::float8 as at from public.town_lamp_nights n where n.full_at is not null order by n.night, n.map`);
const byKey = (list) => [...list].sort((a, b) => a.night - b.night || (a.map < b.map ? -1 : a.map > b.map ? 1 : 0) || (a.post ?? 0) - (b.post ?? 0));
/** What a page is told, with every name the member's id (the test's own people are held by their ids; their names are said plainly further down). */
const byIds = (lamps) => (lamps ? { ...lamps, maps: Object.fromEntries(Object.entries(lamps.maps).map(([map, m]) => [map, { ...m, lit: m.lit.map((l) => ({ ...l, hands: l.hands.map((h) => ({ id: h.id, name: h.id })) })), lighters: m.lighters.map((h) => ({ id: h.id, name: h.id })) }])) } : null);
const NOTHING = { lit: [], lighters: [], full: 0 };
/** The lamps as they were at first: none lit on any night, nobody bearing a flame, no night counted, nobody with a stone, and no helpers' line. */
const anew = () => t.sql(`delete from public.town_lamps_lit where true; delete from public.town_lamp_nights where true; delete from public.town_lamp_flames where true;
  delete from public.town_work_carried where true; delete from public.town_work where line = 'helpers';`);
/** So many of a map's posts lit tonight already (nobody's flame), the first so many by their numbers. */
const litSoFar = async (map, n, at = NIGHT) => {
  const night = nightOf(at);
  await t.sql(`insert into public.town_lamp_nights (night, map) values ($1, $2) on conflict do nothing`, [night, map]);
  for (let post = 0; post < n; post++) await t.sql(`insert into public.town_lamps_lit (night, map, post, lit_at) values ($1, $2, $3, to_timestamp($4 / 1000.0)) on conflict do nothing`, [night, map, post, at]);
};

const NEW = ["town.lamp_night(bigint)", "town.lamp_by(text, integer, integer, integer)", "town.flame_alive(jsonb, bigint)", "town.flame_good(jsonb, bigint, double precision)",
  "town.flame_take(jsonb, jsonb, boolean, integer, text, integer, integer, text, bigint)", "town.flame_pass(jsonb, text, jsonb, jsonb, boolean, bigint)",
  "town.lamp_light(jsonb, jsonb, jsonb, text, integer, integer, integer, bigint)", "town.lamps_flame(uuid)", "town.lamps_lit(text, integer)", "town.lamps_told(uuid, bigint)"];
const CALLED = ["public.town_lamps_read()", "public.town_flame_take(text, integer, integer)", "public.town_flame_pass(uuid)", "public.town_lamp_light(text, integer, integer, integer)"];
const AGAIN = ["town.work_counts_of(jsonb, text)", "town.deed_th(text)"];
const TABLES = ["town_lamp_nights", "town_lamps_lit", "town_lamp_flames"];
const NAMES = [...NEW, ...CALLED, ...AGAIN].map((s) => s.slice(0, s.indexOf("(")));
/** Every function of the town's but those the file writes: its text, and who may call it. */
const texts = async () => rows(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, md5(pg_get_functiondef(p.oid)) as body,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') and not (n.nspname || '.' || p.proname = any($1)) order by 1`, [NAMES]);
const defOf = async (sig) => (await one(`select pg_get_functiondef(to_regprocedure($1)) as d`, [sig]))?.d ?? null;
const kept = async () => one(`select (select md5(string_agg(c.key || c.data::text, '|' order by c.key)) from public.town_catalog c where c.key <> 'lamps') as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') as tables,
  (select count(*)::int from pg_policies) as policies, (select count(*)::int from pg_trigger g where not g.tgisinternal) as triggers,
  (select md5(string_agg(g.tgname || pg_get_triggerdef(g.oid), '|' order by g.tgname)) from pg_trigger g where not g.tgisinternal) as trigger_texts`);

t.section("before it: nothing of any lamps");
const OLD = Object.fromEntries(await Promise.all(AGAIN.map(async (sig) => [sig, await defOf(sig)])));
const textsWas = await texts(), keptWas = await kept();
const before = await call(U.m1, "town_lamps_read");
t.check("a page that asks for the lamps is answered that there is no such function", !!before.error && /does not exist/.test(before.error), before);
const countedWas = (await one(`select town.work_counts_of($1::jsonb, $2) as c`, [JSON.stringify({ from: "deed", what: "lamp_light", thing: "flame", n: 1, doc: {} }), U.m1])).c;
t.check("…and a post lit counts on no line", same(countedWas, []), countedWas);

t.section("where a file it stands on is not there, it stops at its first lines and says why");
await t.sql(`alter function town.work_counts_of(jsonb, text) rename to work_counts_of_away`);
const early = await t.db.exec(FILE).then(() => null, (e) => e.message ?? String(e));
t.check("where the helpers' line is not there, it stops and says it needs v149", !!early && /v163 needs v149/.test(early) && (await one(`select to_regclass('public.town_lamp_flames') is null as none`)).none, early);
await t.sql(`alter function town.work_counts_of_away(jsonb, text) rename to work_counts_of`);
await t.sql(`alter function town.works_carried(uuid) rename to works_carried_away`);
const early160 = await t.db.exec(FILE).then(() => null, (e) => e.message ?? String(e));
t.check("where the bridge's file is not there, it stops and says it needs v160", !!early160 && /v163 needs v160/.test(early160) && (await one(`select to_regclass('public.town_lamp_flames') is null as none`)).none, early160);
await t.sql(`alter function town.works_carried_away(uuid) rename to works_carried`);

t.section("v163, twice over");
await t.runTwice(FILE, "v163");
const tables = await rows(`select c.relname as name, c.relrowsecurity as closed,
    (select count(*)::int from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as grants,
    (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname = any($1) order by 1`, [TABLES]);
t.check("three tables more: the nights, the posts lit, and the flames borne", same(tables.map((r) => r.name), [...TABLES].sort()) && (await kept()).tables === keptWas.tables + 3, tables.map((r) => r.name));
t.check("…each closed: row security on, no policy, and nothing granted to a browser", tables.length === 3 && tables.every((r) => r.closed && r.grants === 0 && r.policies === 0), tables);
const fns = await rows(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, p.prosecdef as definer, coalesce(p.proconfig::text, '') as config,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = any($1) order by 1`, [[...NEW, ...CALLED].map((s) => s.slice(0, s.indexOf("(")))]);
const sig = (s) => s.replace(/\b(p_[a-z_]+) /g, "").replace(/ DEFAULT [^,)]+/g, "");
t.check("fourteen functions more, with the words they are said to take", same(fns.map((f) => sig(f.name)).sort(), [...NEW, ...CALLED].sort()), fns.map((f) => sig(f.name)));
const called = fns.filter((f) => f.name.startsWith("public."));
t.check("the four a browser calls are a member's to call and nobody's who is signed out", called.length === 4 && called.every((f) => f.member && !f.anon), called.map((f) => [f.name, f.anon, f.member]));
t.check("…each security definer with its search path set", called.length === 4 && called.every((f) => f.definer && /search_path=public/.test(f.config)), called.map((f) => [f.name, f.definer, f.config]));
const ruleFns = fns.filter((f) => f.name.startsWith("town."));
t.check("the ten rules are no browser's to call", ruleFns.length === 10 && ruleFns.every((f) => !f.member && !f.anon && !f.definer), ruleFns.map((f) => [f.name, f.anon, f.member]));
t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0);
t.check("no other function of the town's is written, dropped, added or given to anybody else", same(await texts(), textsWas), (await texts()).length);
const keptNow = await kept();
t.check("no other catalog row, no knob, no policy and no trigger is touched", same({ ...keptNow, tables: 0 }, { ...keptWas, tables: 0 }), keptNow);

t.section("the catalog's row, and nothing lit");
const row = (await one(`select town.cat('lamps') as c`)).c;
t.check("the catalog's row `lamps` is the code's, to the entry", same(row, catalogOf().lamps), row);
t.check("…with twelve posts and a fire a map", row.maps.farm.posts.length === 12 && row.maps.forest.posts.length === 12 && row.maps.farm.fire.length === 2 && row.maps.forest.fire.length === 2, [row.maps.farm.posts.length, row.maps.forest.posts.length]);
const seeded = await one(`select (select count(*)::int from public.town_lamps_lit) as lit, (select count(*)::int from public.town_lamp_nights) as nights, (select count(*)::int from public.town_lamp_flames) as flames`);
t.check("it seeds no lamp lit, no night and no flame", same(seeded, { lit: 0, nights: 0, flames: 0 }), seeded);
await t.sql(`update public.town_catalog set data = data || '{"life": 9}'::jsonb where key = 'lamps'`);
await t.db.exec(FILE);
t.check("run again, it leaves a number an admin changed as it finds it", (await one(`select town.cat('lamps')->>'life' as n`)).n === "9");
await t.sql(`update public.town_catalog set data = data || '{"life": 5}'::jsonb where key = 'lamps'`);

t.section("the two functions given lines are the ones they replace");
// (each is the text it had after v160, with one block of the file's before its last line, marked at its top and its end)
const TOP = "the lamp relay at dusk (v163)", END = "the lamp relay at dusk (v163): its end";
const MARK = "  return '[]'::jsonb;\nend;\n";
const BRANCH = `  -- ── ${TOP}: a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──\n  if what in ('lamp_light', 'lamp_hand') then\n    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));\n  end if;\n  -- ── ${END} ──\n`;
const countsNow = await defOf(AGAIN[0]);
// (the last of them: the function has one such line for every kind of deed)
const lastMark = OLD[AGAIN[0]].lastIndexOf(MARK);
t.check("town.work_counts_of is the one it replaces, word for word, but for the one block for a post lit, marked at its top and its end", lastMark > 0 && countsNow === OLD[AGAIN[0]].slice(0, lastMark) + BRANCH + OLD[AGAIN[0]].slice(lastMark), countsNow?.length);
t.check("…and v160's block for a stone laid is still in it", /the bridge built by hand \(v160\): its end/.test(countsNow ?? "") && /'stone_lay', 'stone_hand'/.test(countsNow ?? ""));
const WORDS = { flame_take: "รับไฟจากกองไฟ", flame_pass: "ส่งไฟต่อให้คนถัดไป", lamp_light: "จุดโคม", lamp_hand: "ไฟที่ช่วยกันส่งต่อมาจุดโคม" };
const thNow = await defOf(AGAIN[1]);
const thMeant = OLD[AGAIN[1]].replace("else p_what end", () => `-- ── ${TOP} ──\n    ${Object.entries(WORDS).map(([k, v]) => `when '${k}' then '${v}'`).join(" ")}\n    -- ── ${END} ──\n    else p_what end`);
t.check("town.deed_th is the one it replaces, word for word, but for the one block of four words, marked at its top and its end", OLD[AGAIN[1]].split("else p_what end").length === 2 && thNow === thMeant, thNow?.slice(-520));
const said = Object.fromEntries(await Promise.all(Object.keys(WORDS).map(async (k) => [k, (await one(`select town.deed_th($1) as w`, [k])).w])));
t.check("each deed of the lamps' has its word in Thai, and a deed from before has the word it had", same(said, WORDS) && (await one(`select town.deed_th('pass') as w`)).w === "ส่งถังน้ำต่อให้คนถัดไป" && (await one(`select town.deed_th('stone_lay') as w`)).w === "วางหินที่เชิงสะพาน" && (await one(`select town.deed_th('no such') as w`)).w === "no such", said);
const privs = await rows(`select p.oid::regprocedure::text as name, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member from pg_proc p where p.oid = any($1::regprocedure[])`, [AGAIN]);
t.check("…and both are still no browser's to call", privs.length === 2 && privs.every((p) => !p.anon && !p.member), privs);
const stoneStill = (await one(`select town.work_counts_of($1::jsonb, $2) as c`, [JSON.stringify({ from: "deed", what: "stone_lay", thing: "stone", n: 1, doc: {} }), U.m1])).c;
t.check("…and a stone laid for the bridge counts as it did", same(stoneStill, [{ to: null, line: "helpers", raw: 1 }]), stoneStill);

t.section("the rules, case by case, as the code answers them");
const ASK = {
  night: "town.lamp_night($1::bigint)", by: "town.lamp_by($1::text, $2::int, $3::int, $4::int)",
  take: "town.flame_take($1::jsonb, $2::jsonb, $3::boolean, $4::int, $5::text, $6::int, $7::int, $8::text, $9::bigint)",
  pass: "town.flame_pass($1::jsonb, $2::text, $3::jsonb, $4::jsonb, $5::boolean, $6::bigint)",
  light: "town.lamp_light($1::jsonb, $2::jsonb, $3::jsonb, $4::text, $5::int, $6::int, $7::int, $8::bigint)", counts: "town.work_counts_of($1::jsonb, $2::text)",
};
const SAID = {
  night: "which night a moment is in", by: "who stands by a fire and by a post", take: "a flame taken", pass: "a flame handed on", light: "a post lit", counts: "what a deed of the lamps' counts for on the lines",
};
for (const fn of Object.keys(ASK)) {
  const cases = CASES.rules.filter((v) => v.fn === fn);
  let wrong = 0, first = null;
  for (const v of cases) {
    const jsonb = ASK[fn].split(",").map((part) => /jsonb/.test(part));
    const r = await t.as("super", `select ${ASK[fn]} as r`, v.args.map((a, i) => (jsonb[i] ? JSON.stringify(a ?? null) : a)));
    const got = r.error ? { error: r.error } : r.rows[0].r;
    if (!same(got, v.want)) { wrong++; first ??= { args: v.args, want: v.want, got }; }
  }
  t.check(`${SAID[fn]}: ${cases.length} cases, each as the code answers it`, cases.length > 0 && wrong === 0, first ? JSON.stringify(first).slice(0, 900) : "");
}

t.section("stories: four members and the lamps, through the functions a member calls");
const RODS = bagOf({ item: "rod", n: 1 });
// (for the breaks: an evening of four, an eager pair who light a whole map, the day, and the morning)
const stories = FEW ? [CASES.stories[0], CASES.stories[1], CASES.stories[16], CASES.stories[20], CASES.stories[21]] : CASES.stories;
let played = 0, storyWrong = null, endWrong = null, lineWrong = null, fulls = 0;
for (const [i, s] of stories.entries()) {
  await clock(s.steps[0].now - 1000);
  await anew();
  for (const who of Object.keys(s.stamina)) await purse(who, RODS, s.stamina[who]);
  for (const [k, x] of s.steps.entries()) {
    await clock(x.now);
    const d = x.deed;
    const r = d.fn === "take" ? await take(x.by, d.map, d.at) : d.fn === "pass" ? await pass(x.by, d.to) : d.fn === "light" ? await light(x.by, d.post, d.map, d.at)
      : d.fn === "hold" ? await call(x.by, "town_hold", { p_slot: d.slot }) : d.fn === "put_away" ? await call(x.by, "town_hold", { p_slot: null }) : await call(x.by, "town_lamps_read");
    played++;
    if (storyWrong) continue;
    const got = d.fn === "read" ? {} : Object.fromEntries(["ok", "why", "until", "n", "of", "full"].filter((key) => r?.[key] !== undefined).map((key) => [key, r[key]]));
    // (names are the test's own people's: held by their ids here, and said plainly further down)
    const told = byIds(r?.lamps ?? (await read(x.by)));
    const left = d.fn === "read" ? await staminaOf(x.by) : r?.purse ? Number((await one(`select town.stamina_of($1::jsonb, town.now_ms()) as n`, [JSON.stringify(r.purse)])).n) : null;
    if (!same(got, x.want) || !same(told, x.told) || left !== x.stamina) storyWrong = { story: i, step: k, deed: d, by: x.by, now: x.now, got, want: x.want, left, stamina: x.stamina, told: same(told, x.told) ? "same" : told, wantTold: same(told, x.told) ? "same" : x.told };
  }
  const end = { lit: await litOf(), flames: await flamesOf(), full: await fullOf() };
  if (!endWrong && !same(end, { lit: byKey(s.end.lit), flames: s.end.flames, full: byKey(s.end.full) })) endWrong = { story: i, got: end, want: s.end };
  fulls += s.end.full.length;
  const lines = {};
  for (const who of Object.keys(s.stamina)) { const l = await helpersOf(who); if (l) lines[who] = { points: l.points, today: l.today, day: l.day }; }
  if (!lineWrong && !same(lines, s.end.helpers)) lineWrong = { story: i, got: lines, want: s.end.helpers };
}
t.check(`${stories.length} stories, ${played} deeds: every answer, the doer's stamina and what they are told of the lamps are the code's`, played > 400 && !storyWrong, storyWrong ? JSON.stringify(storyWrong).slice(0, 1600) : "");
t.check("…and at each end what is kept: every post lit with the hands its flame came by, who bears a flame, and the nights every lamp of a map was lit", !endWrong && (FEW || fulls >= 1), endWrong ? JSON.stringify(endWrong).slice(0, 1400) : `${fulls} whole nights`);
t.check("…and where each stands on the helpers' line: three points a post to everybody its flame came by, counted by the day's bound", !lineWrong, lineWrong ? JSON.stringify(lineWrong).slice(0, 900) : "");

t.section("a flame through three pairs of hands, and the post it lights");
await clock(NIGHT);
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
const mark1 = await lastDeed();
const up = await take(U.m1, "farm", [FARM.fire[0] + 2, FARM.fire[1] - 1]);
t.check("taken at the fire with empty hands: for nothing, and it lives five seconds by the database's clock", up?.ok === true && up.until === NIGHT + LIFE && (await staminaOf(U.m1)) === 100 && same(await flamesOf(), { [U.m1]: { from: "farm", until: NIGHT + LIFE, hands: [U.m1] } }), { why: up?.why, until: up?.until, flames: await flamesOf() });
t.check("…with nothing in the bag for it, and no coin moved", same((await purseOf(U.m1)).bag, RODS) && up.purse?.coins === 0 && !("flame" in up), up?.purse?.bag);
t.check("…and its bearer is told it, and nobody else is", same(up.lamps?.flame, { until: NIGHT + LIFE, hands: 1 }) && (await read(U.m2)).flame === null, up?.lamps?.flame);
await clock(NIGHT + 4000);
const on1 = await pass(U.m1, U.m2);
t.check("handed on to somebody with empty hands: for nothing, and it is fresh again, five seconds from that moment", on1?.ok === true && on1.until === NIGHT + 4000 + LIFE && (await staminaOf(U.m1)) === 100 && (await staminaOf(U.m2)) === 100
  && same(await flamesOf(), { [U.m2]: { from: "farm", until: NIGHT + 4000 + LIFE, hands: [U.m1, U.m2] } }), { why: on1?.why, flames: await flamesOf() });
t.check("…whoever handed it on is told their hands are empty, and whoever took it that they bear a flame", on1.lamps?.flame === null && same((await read(U.m2)).flame, { until: NIGHT + 4000 + LIFE, hands: 2 }), on1?.lamps?.flame);
await clock(NIGHT + 8000);
const on2 = await pass(U.m2, U.guest);
await clock(NIGHT + 12_000);
const lit1 = await light(U.guest, 2, "farm", [FARM.posts[2][0] - 2, FARM.posts[2][1] + 1]);
t.check("a post lit from a tile by it: one stamina, the flame spent, one of twelve lit", on2?.ok === true && lit1?.ok === true && lit1.n === 1 && lit1.of === 12 && lit1.full === false && (await staminaOf(U.guest)) === 99 && same(await flamesOf(), {}),
  { why: lit1?.why, n: lit1?.n, flames: await flamesOf() });
t.check("…kept for the night with who lit it and the hands its flame came by", same(await litOf(true), [{ night: nightOf(NIGHT), map: "farm", post: 2, at: NIGHT + 12_000, hands: [U.m1, U.m2, U.guest], by: U.guest }]), await litOf(true));
t.check("…and its answer says nothing of whose hands the flame came by", lit1?.ok === true && !("hands" in lit1) && !("flame" in on1), Object.keys(lit1 ?? {}));
const points = Object.fromEntries(await Promise.all([U.m1, U.m2, U.guest, U.admin].map(async (id) => [id, (await helpersOf(id))?.points ?? 0])));
t.check("all three whose hands it went through have three points on the helpers' line; nobody else has", same(points, { [U.m1]: 3, [U.m2]: 3, [U.guest]: 3, [U.admin]: 0 }), points);
const written = (await deeds(mark1)).map((d) => [d.by, d.what, d.thing, d.n, d.coins]);
t.check("every deed is written down: a taking, two handings on, a lighting, and a line for each of the two others the flame came by",
  same(written, [[U.m1, "flame_take", "flame", 1, 0], [U.m1, "flame_pass", "flame", 1, 0], [U.m2, "flame_pass", "flame", 1, 0], [U.guest, "lamp_light", "flame", 1, 0], [U.m1, "lamp_hand", "flame", 1, 0], [U.m2, "lamp_hand", "flame", 1, 0]]), written);
const docs = (await deeds(mark1)).map((d) => d.doc);
t.check("…each with its particulars: the map and the tile, to whom, which post and how many were lit, by whom", docs[0].map === "farm" && same(docs[0].tile, [FARM.fire[0] + 2, FARM.fire[1] - 1]) && docs[1].to === U.m2 && docs[3].post === 2 && docs[3].lit === 1 && docs[3].hands === 3
  && same(docs[3].tile, [FARM.posts[2][0] - 2, FARM.posts[2][1] + 1]) && !("full" in docs[3]) && docs[4].by === U.guest && docs[4].post === 2, docs);
// (two more: a post of the admin's alone a minute later, and one of member two's and member one's after that, in the forest)
await clock(NIGHT + MIN); await take(U.admin); await light(U.admin, 0);
await clock(NIGHT + 2 * MIN); await take(U.m2, "forest"); await pass(U.m2, U.m1); const third = await light(U.m1, 5, "forest");
const page = await read(U.m1);
t.check("a page is told the night, and each map's posts lit by their numbers with the hands each flame came by, by name",
  page.night === nightOf(NIGHT) && same(page.maps.farm.lit, [{ post: 0, at: NIGHT + MIN, hands: [{ id: U.admin, name: "Aqua Admin" }] }, { post: 2, at: NIGHT + 12_000, hands: [{ id: U.m1, name: "Member One" }, { id: U.m2, name: "Member Two" }, { id: U.guest, name: "Guest Three" }] }])
  && same(page.maps.forest.lit, [{ post: 5, at: NIGHT + 2 * MIN, hands: [{ id: U.m2, name: "Member Two" }, { id: U.m1, name: "Member One" }] }]) && third?.n === 1, page.maps);
t.check("the night's lighters are everybody whose hands a flame that lit a post went through, in the order they first came, each once, with their names and no number",
  same(page.maps.farm.lighters, [{ id: U.m1, name: "Member One" }, { id: U.m2, name: "Member Two" }, { id: U.guest, name: "Guest Three" }, { id: U.admin, name: "Aqua Admin" }])
  && same(page.maps.forest.lighters, [{ id: U.m2, name: "Member Two" }, { id: U.m1, name: "Member One" }]) && !/\d/.test(JSON.stringify([...page.maps.farm.lighters, ...page.maps.forest.lighters].map((h) => h.name))), page.maps.farm.lighters);
t.check("…and nothing more is told: the night, the two maps (what is lit, the lighters, the whole nights) and my flame", Object.keys(page).sort().join() === "flame,maps,night" && Object.keys(page.maps).sort().join() === "farm,forest" && Object.keys(page.maps.farm).sort().join() === "full,lighters,lit", Object.keys(page.maps.farm));

t.section("the second of grace, and tired hands");
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
await clock(NIGHT); await take(U.m1);
await clock(NIGHT + LIFE + 1000);
const graced = await pass(U.m1, U.m2);
t.check("a handing on asked for a second after the flame's time still counts, and the flame is fresh from that moment", graced?.ok === true && graced.until === NIGHT + 2 * LIFE + 1000, graced?.why ?? graced?.until);
await clock(NIGHT + 2 * LIFE + 2001);
const late = await pass(U.m2, U.guest);
t.check("…and a moment later it does not: the flame has gone out, and nobody has it", late?.ok === false && late.why === "out" && (await read(U.guest)).flame === null && (await read(U.m2)).flame === null, late?.why);
await clock(NIGHT + MIN); await take(U.m1);
await clock(NIGHT + MIN + LIFE + 1000);
const gracedLight = await light(U.m1, 3);
t.check("a lighting asked for a second after the flame's time still counts too", gracedLight?.ok === true, gracedLight?.why);
await clock(NIGHT + 2 * MIN); await take(U.m1);
await clock(NIGHT + 2 * MIN + LIFE + 1001);
const lateLight = await light(U.m1, 4);
t.check("…and a moment later it does not, with stamina left: out, the post dark, no stamina gone", lateLight?.ok === false && lateLight.why === "out" && (await staminaOf(U.m1)) === 99 && !(await litOf()).some((l) => l.post === 4), lateLight?.why);
await purse(U.guest, RODS, 0);
await clock(NIGHT + 3 * MIN); await take(U.guest);
await clock(NIGHT + 3 * MIN + LIFE + 1000 + LAMPS.hold * 1000);
const tiredLight = await light(U.guest, 4);
t.check("with no stamina the post is lit all the same, and the flame is good for the hold's time longer", tiredLight?.ok === true && (await staminaOf(U.guest)) === 0 && (await litOf()).some((l) => l.post === 4), tiredLight?.why);
await clock(NIGHT + 4 * MIN); const tiredTake = await take(U.guest);
await clock(NIGHT + 4 * MIN + LIFE + 1001 + LAMPS.hold * 1000);
const tiredLate = await light(U.guest, 5);
t.check("…and no longer than that", tiredTake?.ok === true && tiredLate?.ok === false && tiredLate.why === "out", [tiredTake?.why, tiredLate?.why]);
await clock(NIGHT + 5 * MIN); await take(U.guest);
const tiredPass = await pass(U.guest, U.admin);
t.check("a flame is taken and handed on with no stamina, for nothing", tiredPass?.ok === true && (await staminaOf(U.guest)) === 0 && (await staminaOf(U.admin)) === 100, tiredPass?.why);

t.section("never from a lamp, and what stands in the way");
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
await clock(NIGHT);
await litSoFar("farm", 3);
const atLamp = await take(U.m1, "farm", FARM.posts[0]), nowhere = await take(U.m1, "farm", null), off = await take(U.m1, "farm", [FARM.fire[0] + LAMPS.near + 1, FARM.fire[1]]), other = await take(U.m1, "forest", FARM.fire), noMap = await take(U.m1, "town", FARM.fire);
t.check("a flame is taken only at a fire: not at a post that is lit, not from too far, not at another map's fire, not on a map with no lamps", [atLamp, nowhere, off, other, noMap].every((r) => r?.ok === false && r.why === "far") && same(await flamesOf(), {}), [atLamp?.why, nowhere?.why, off?.why, other?.why, noMap?.why]);
await call(U.m1, "town_hold", { p_slot: 0 });
const handful = await take(U.m1);
t.check("…and only with nothing in the hand: hand", handful?.ok === false && handful.why === "hand", handful?.why);
await call(U.m1, "town_hold", { p_slot: null });
await t.sql(`update public.town_works set opened_at = now() where id = 'bridge'; insert into public.town_work_carried (member_id, work, thing, hands) values ($1, 'bridge', 'stone', array[$1::uuid])`.replace(/\$1/g, `'${U.m1}'`));
const stony = await take(U.m1);
t.check("…and not with a stone of the bridge's in the hands: stone", stony?.ok === false && stony.why === "stone", stony?.why);
await take(U.m2);
const toStony = await pass(U.m2, U.m1);
t.check("a flame is not handed to somebody who carries a stone: stone", toStony?.ok === false && toStony.why === "stone" && same(Object.keys(await flamesOf()), [U.m2]), toStony?.why);
await t.sql(`delete from public.town_work_carried where true; update public.town_works set opened_at = null where id = 'bridge'`);
const twice = await take(U.m2);
t.check("a second flame is not taken while one is alive: held", twice?.ok === false && twice.why === "held", twice?.why);
await call(U.m1, "town_hold", { p_slot: 0 });
const toHand = await pass(U.m2, U.m1);
t.check("a flame is not handed to somebody with a thing in the hand: hand", toHand?.ok === false && toHand.why === "hand" && same(Object.keys(await flamesOf()), [U.m2]), toHand?.why);
await call(U.m1, "town_hold", { p_slot: null });
await take(U.m1);
const toHeld = await pass(U.m2, U.m1);
t.check("…nor to somebody who bears a live flame: held", toHeld?.ok === false && toHeld.why === "held" && same(Object.keys(await flamesOf()).sort(), [U.m1, U.m2].sort()), toHeld?.why);
await purse(U.unver, RODS, 100);
const selfish = await pass(U.m2, U.m2), toNone = await pass(U.m2, null), toStranger = await pass(U.m2, U.unver), toGone = await pass(U.m2, "00000000-0000-0000-0000-0000000000ff");
t.check("…nor to oneself, to nobody, to a character never proved or to somebody who is not there: none", [selfish, toNone, toStranger, toGone].every((r) => r?.ok === false && r.why === "none") && same((await flamesOf())[U.m2].hands, [U.m2]), [selfish?.why, toNone?.why, toStranger?.why, toGone?.why]);
const empty = await pass(U.guest, U.admin), unlit = await light(U.guest, 5);
t.check("with no flame nothing is handed on and nothing is lit: none", empty?.ok === false && empty.why === "none" && unlit?.ok === false && unlit.why === "none", [empty?.why, unlit?.why]);
const again = await light(U.m2, 1), farPost = await light(U.m2, 5, "farm", [FARM.posts[5][0] + LAMPS.near + 1, FARM.posts[5][1]]), noPost = await light(U.m2, 12), wrongMap = await light(U.m2, 5, "forest", FARM.posts[5]);
t.check("a post that is lit is not lit again, and the flame is still its bearer's: lit", again?.ok === false && again.why === "lit" && (await staminaOf(U.m2)) === 100 && !!(await flamesOf())[U.m2], again?.why);
t.check("a post is lit only from a tile by it, and only a post there is: far", [farPost, noPost, wrongMap].every((r) => r?.ok === false && r.why === "far") && (await litOf()).length === 3, [farPost?.why, noPost?.why, wrongMap?.why]);
t.check("a night on which a lamp was only tried for, or not every lamp was lit, is not counted whole", (await rows(`select 1 from public.town_lamp_nights n where n.full_at is null`)).length === 2 && (await read(U.m1)).maps.farm.full === 0 && (await read(U.m1)).maps.forest.full === 0 && same(await fullOf(), []), await rows(`select * from public.town_lamp_nights`));
// (a flame of mine that went out is written over by the next I take, and by one handed to me)
await clock(NIGHT + MIN);
const anewFlame = await take(U.m1), handedOver = (await take(U.guest))?.ok && (await pass(U.guest, U.m2));
t.check("a flame that has gone out is no flame: another is taken over it, and one is handed into those hands", anewFlame?.ok === true && handedOver?.ok === true && same((await flamesOf())[U.m2].hands, [U.guest, U.m2]) && (await rows(`select 1 from public.town_lamp_flames`)).length === 2, [anewFlame?.why, handedOver?.why]);

t.section("the last lamp of a map, and the night counted");
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
await clock(NIGHT);
await litSoFar("farm", 11);
const mark2 = await lastDeed();
await take(U.m1); await pass(U.m1, U.m2);
await clock(NIGHT + 2000);
const last = await light(U.m2, 11);
t.check("the twelfth post lit says so: twelve of twelve, all of them", last?.ok === true && last.n === 12 && last.of === 12 && last.full === true, [last?.why, last?.n, last?.full]);
t.check("…the night is kept as one on which every lamp of that map was lit, and a page is told one such night", same(await fullOf(), [{ night: nightOf(NIGHT), map: "farm", at: NIGHT + 2000 }]) && last.lamps.maps.farm.full === 1 && last.lamps.maps.forest.full === 0, await fullOf());
t.check("…and the deed says it was the last", (await deeds(mark2)).find((d) => d.what === "lamp_light")?.doc.full === true && (await deeds(mark2)).find((d) => d.what === "lamp_light")?.doc.lit === 12);
const noMore = await take(U.guest), elsewhere = await take(U.guest, "forest");
t.check("with every lamp of a map lit its fire gives no flame: whole; the other map's does", noMore?.ok === false && noMore.why === "whole" && elsewhere?.ok === true, [noMore?.why, elsewhere?.why]);
// (the same night counted once, whatever is asked again)
await t.sql(`delete from public.town_lamps_lit where post = 11`);
await clock(NIGHT + MIN); await take(U.m1); const relit = await light(U.m1, 11);
t.check("a night is counted whole once", relit?.ok === true && relit.full === true && same(await fullOf(), [{ night: nightOf(NIGHT), map: "farm", at: NIGHT + 2000 }]) && relit.lamps.maps.farm.full === 1, await fullOf());

t.section("the morning after, and the next evening");
const DAWN = nightEnds(nightOf(NIGHT));
await clock(DAWN - 3000);
const beforeDawn = await read(U.m1), lastFlame = await take(U.admin, "forest");
t.check("a lamp lit stays lit until five in the morning", beforeDawn.night === nightOf(NIGHT) && beforeDawn.maps.farm.lit.length === 12 && lastFlame?.ok === true, [beforeDawn.night, beforeDawn.maps.farm.lit.length]);
await clock(DAWN + 1000);
const morning = await read(U.m1), dayLight = await light(U.admin, 7, "forest"), dayTake = await take(U.m2, "forest");
t.check("at five it is day: a page is told no night and no lamp lit, and still how many nights were whole", same(morning, { night: null, maps: { farm: { ...NOTHING, full: 1 }, forest: NOTHING }, flame: (await read(U.m1)).flame }) && morning.maps.farm.lit.length === 0, morning);
t.check("…a flame taken before five lights nothing after it, and none is given: day", dayLight?.ok === false && dayLight.why === "day" && dayTake?.ok === false && dayTake.why === "day" && !(await litOf()).some((l) => l.map === "forest" && l.post === 7), [dayLight?.why, dayTake?.why]);
await clock(NOON + DAY);
t.check("by day nothing is given, and nothing kept is touched", (await take(U.m1))?.why === "day" && (await litOf()).filter((l) => l.map === "farm").length === 12, await fullOf());
await clock(NIGHT + DAY);
const nextEve = await read(U.m1), nextTake = await take(U.m1), nextLight = await light(U.m1, 0);
t.check("the next evening no lamp is lit, a flame is given again, and the first post is the first of twelve", nextEve.night === nightOf(NIGHT) + 1 && same(nextEve.maps.farm, { ...NOTHING, full: 1 }) && nextTake?.ok === true && nextLight?.ok === true && nextLight.n === 1 && nextLight.full === false, [nextEve.night, nextTake?.why, nextLight?.n]);
t.check("…what was lit the night before is kept, by its night", (await litOf()).filter((l) => l.night === nightOf(NIGHT) && l.map === "farm").length === 12 && (await litOf()).filter((l) => l.night === nightOf(NIGHT) + 1).length === 1);
await t.sql(`update public.town_catalog set data = data || '{"from": 1740}'::jsonb where key = 'lamps'`);
t.check("the row's own stop: with its evening put at a minute no day has, no moment is night", (await take(U.m2))?.why === "day" && (await read(U.m2)).night === null);
await t.sql(`update public.town_catalog set data = data || '{"from": 1050}'::jsonb where key = 'lamps'`);

t.section("who may");
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
await clock(NIGHT + 2 * DAY);
const out = await Promise.all([call("anon", "town_lamps_read"), call("anon", "town_flame_take", { p_map: "farm", p_x: FARM.fire[0], p_y: FARM.fire[1] }), call("anon", "town_flame_pass", { p_to: U.m1 }), call("anon", "town_lamp_light", { p_map: "farm", p_post: 0, p_x: FARM.posts[0][0], p_y: FARM.posts[0][1] })]);
t.check("somebody signed out is refused all four", out.every((r) => /permission denied/.test(r.error ?? "")), out.map((r) => r.error ?? r));
for (const who of ["unver", "nochar"]) {
  await purse(U[who], RODS, 100);
  const tries = [await call(U[who], "town_lamps_read"), await take(U[who]), await pass(U[who], U.m1), await light(U[who], 0)];
  t.check(`${who === "unver" ? "a character never proved" : "an account with no character"} is refused all four, and bears no flame`, tries.every((r) => r.code === "42501") && same(await flamesOf(), {}), tries.map((r) => r.code ?? r.why ?? r));
}
await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
const shutGame = [await call(U.m1, "town_lamps_read"), await take(U.m1)], admin = await take(U.admin);
t.check("while the town's game is shut a member is refused, and an admin is not", shutGame.every((r) => r.code === "42501") && admin?.ok === true, [shutGame.map((r) => r.code ?? r), admin?.why]);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const peek = [];
for (const table of TABLES) for (const who of ["anon", U.m1]) peek.push(await t.as(who, `select count(*) from public.${table}`));
t.check("the three tables are nobody's to read from a browser", peek.length === 6 && peek.every((r) => /permission denied/.test(r.error ?? "")), peek.map((r) => r.error ?? r.rows));
const poke = [await t.as(U.m1, `insert into public.town_lamp_flames (member_id, map, until_ms) values ('${U.m1}', 'farm', 9999999999999)`), await t.as(U.m1, `update public.town_lamp_flames set until_ms = 9999999999999 where true`),
  await t.as(U.m1, `insert into public.town_lamp_nights (night, map, full_at) values (1, 'farm', now())`), await t.as(U.m1, `insert into public.town_lamps_lit (night, map, post, hands) values (1, 'farm', 0, array['${U.m1}'::uuid])`), await t.as(U.m1, `delete from public.town_lamps_lit where true`)];
t.check("…nor to write: no flame conjured or kept alive, no night counted, no post lit or put out from outside", poke.every((r) => /permission denied/.test(r.error ?? "")), poke.map((r) => r.error ?? r.affected));
const rules = [await t.as(U.m1, `select town.lamps_told('${U.m2}'::uuid, 0)`), await t.as(U.m1, `select town.lamps_flame('${U.m2}'::uuid)`), await t.as(U.m1, `select town.lamp_light('{}'::jsonb, '{}'::jsonb, '[]'::jsonb, 'farm', 0, 0, 0, 0)`),
  await t.as(U.m1, `select town.flame_take('{}'::jsonb, null, false, 0, 'farm', 0, 0, 'x', 0)`), await t.as(U.m1, `select town.lamp_night(0)`)];
t.check("the rules are not to be asked from outside: nobody reads another's flame or lights a post by the rule itself", rules.every((r) => /permission denied/.test(r.error ?? "")), rules.map((r) => r.error ?? r.rows));

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
