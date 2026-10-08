/*
 * v160 (the bridge built by hand, and the village's works) tried against the stand-in database as it is after the
 * last file that ran (stand-in.mjs's snapshot, loaded in a second, in memory: nothing is written anywhere).
 *
 *   TOWN_VECTORS=<here>/now npx vitest run lib/town/db-vectors-bridge.test.ts        (in the tree: writes the cases)
 *   FC_REPO=<the tree whose code is meant> node v160.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the draft> v160.test.mjs v160.mutations.mjs                     (STORIES=few for the breaks)
 *
 * It reads the draft beside this file (`v160_draft.sql`) while there is one, then supabase/'s in the root given, then
 * history once it has run. What is held:
 *   · the file adds four tables, closed, and fourteen functions, six of them a member's to call; `town.work_counts_of`
 *     and `town.deed_th` are the ones they replace, word for word, but for the lines meant; nothing else of the
 *     town's is written, dropped or given to anybody; the catalog has one row more, the code's, and no other differs;
 *   · the rules are the site's own, case by case (lib/town/db-vectors-bridge.test.ts makes the cases from
 *     lib/town/bridge.ts);
 *   · built closed: every function answers closed, a page is told nothing, and the one line of the file's head opens it;
 *   · stories of four members at the bridge through the functions a member calls, with the test's clock: every
 *     answer, the doer's stamina, what each is told, and at the end what is kept, the helpers' line among it;
 *   · said plainly once each: a stone through three hands, the hundredth and the six-hundredth, the names in the
 *     order they came and my count for me alone, tired hands, the works' own giving, and who may.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { BRIDGE } = await import("@/lib/town/bridge");

const [root] = process.argv.slice(2);
const beside = new URL("./v160_draft.sql", import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v160_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : existsSync(beside) ? readFileSync(beside, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(160));
const CASES = JSON.parse(readFileSync(new URL("./now/vectors-v160.json", import.meta.url), "utf8"));
const FEW = process.env.STORIES === "few";
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const MIN = 60_000, HOUR = 60 * MIN;
const NOON = Date.parse("2026-10-08T12:00:00+07:00");
const PILE = [BRIDGE.pile.x, BRIDGE.pile.y], FOOT = [BRIDGE.foot.x, BRIDGE.foot.y];

const t0 = Date.now();
const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
// the test's clock in the place of the database's (before anything is compared: its text is not the file's to touch)
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = ${ms}`);

/** As PostgREST calls it: by the names of the words sent, and only those. */
const call = async (who, fn, words = {}) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
const lift = (who, at = PILE) => call(who, "town_stone_lift", { p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
const lay = (who, at = FOOT) => call(who, "town_stone_lay", { p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
const pass = (who, to) => call(who, "town_stone_pass", { p_to: to });
const drop = (who) => call(who, "town_stone_drop");
const read = async (who) => (await call(who, "town_works_read"))?.works ?? null;
const bagOf = (...things) => [...things, ...Array(10).fill(null)].slice(0, 10);
/** A member's purse laid anew: this bag, so much stamina today, and whatever else. */
const purse = (who, bag = bagOf(), left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::int)) || $4::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, JSON.stringify(bag), left, JSON.stringify(more)]);
const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
const staminaOf = async (who) => (await one(`select town.stamina_of(town.purse_kept($1, false), town.now_ms()) as n`, [who])).n;
const deeds = async (since = 0) => rows(`select d.id, d.member_id as by, d.what, d.thing, d.n::int as n, d.coins::int as coins, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [since]);
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as n from public.town_deeds`)).n);
const helpersOf = async (who) => (await one(`select w.kept from public.town_work w where w.member_id = $1 and w.line = 'helpers'`, [who]))?.kept ?? null;
const needOf = async (work = "bridge", thing = "stone") => one(`select n.need, n.have from public.town_work_needs n where n.work = $1 and n.thing = $2`, [work, thing]);
const handsOf = async (work = "bridge") => rows(`select h.member_id as id, h.thing, h.n, round(extract(epoch from h.first_at) * 1000)::float8 as first from public.town_work_hands h where h.work = $1 order by h.first_at, h.member_id::text collate "C", h.thing`, [work]);
const carriedOf = async () => Object.fromEntries((await rows(`select c.member_id as id, c.work, c.thing, c.hands from public.town_work_carried c`)).map((r) => [r.id, { work: r.work, thing: r.thing, hands: r.hands }]));
/** The bridge and everything about it as it was at first, but for what a check says: open or not, so many of so many. */
const anew = async ({ open = true, need = BRIDGE.need, have = 0 } = {}) => {
  await t.sql(`delete from public.town_work_carried where true; delete from public.town_work_hands where true; delete from public.town_work where line = 'helpers';`);
  await t.sql(`update public.town_works set opened_at = case when $1 then to_timestamp((town.now_ms() - 3600000) / 1000.0) end, done_at = null where id = 'bridge'`, [open]);
  await t.sql(`update public.town_work_needs set need = $1, have = $2 where work = 'bridge' and thing = 'stone'`, [need, have]);
};

const NEW = ["town.works_wants(jsonb, text)", "town.stone_near(integer, integer, text)", "town.stone_spans(integer, integer)", "town.stone_lift(jsonb, jsonb, jsonb, integer, integer, text, bigint)",
  "town.stone_pass(jsonb, text, jsonb, jsonb, jsonb)", "town.stone_lay(jsonb, jsonb, jsonb, integer, integer, bigint)", "town.stone_drop(jsonb, jsonb)", "town.works_give(jsonb, jsonb, text, integer)",
  "town.works_read(text)", "town.works_carried(uuid)", "town.works_counted(text, text, uuid[], integer, integer, bigint)", "town.works_told(uuid)"];
const CALLED = ["public.town_works_read()", "public.town_stone_lift(integer, integer)", "public.town_stone_pass(uuid)", "public.town_stone_lay(integer, integer)", "public.town_stone_drop()", "public.town_work_give(text, text, integer)"];
const AGAIN = ["town.work_counts_of(jsonb, text)", "town.deed_th(text)"];
const TABLES = ["town_works", "town_work_needs", "town_work_hands", "town_work_carried"];
const NAMES = [...NEW, ...CALLED, ...AGAIN].map((s) => s.slice(0, s.indexOf("(")));
/** Every function of the town's but those the file writes: its text, and who may call it. */
const texts = async () => rows(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, md5(pg_get_functiondef(p.oid)) as body,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') and not (n.nspname || '.' || p.proname = any($1)) order by 1`, [NAMES]);
const defOf = async (sig) => (await one(`select pg_get_functiondef(to_regprocedure($1)) as d`, [sig]))?.d ?? null;
const kept = async () => one(`select (select md5(string_agg(c.key || c.data::text, '|' order by c.key)) from public.town_catalog c where c.key <> 'bridge') as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') as tables,
  (select count(*)::int from pg_policies) as policies, (select count(*)::int from pg_trigger g where not g.tgisinternal) as triggers,
  (select md5(string_agg(g.tgname || pg_get_triggerdef(g.oid), '|' order by g.tgname)) from pg_trigger g where not g.tgisinternal) as trigger_texts`);

t.section("before it: nothing of any works");
const OLD = Object.fromEntries(await Promise.all(AGAIN.map(async (sig) => [sig, await defOf(sig)])));
const textsWas = await texts(), keptWas = await kept();
const before = await call(U.m1, "town_works_read");
t.check("a page that asks for the works is answered that there is no such function", !!before.error && /does not exist/.test(before.error), before);
const countedWas = (await one(`select town.work_counts_of($1::jsonb, $2) as c`, [JSON.stringify({ from: "deed", what: "stone_lay", thing: "stone", n: 1, doc: {} }), U.m1])).c;
t.check("…and a stone laid counts on no line", same(countedWas, []), countedWas);

t.section("where v149's lines are not there, it stops at its first line and says why");
await t.sql(`alter function town.work_counts_of(jsonb, text) rename to work_counts_of_away`);
const early = await t.db.exec(FILE).then(() => null, (e) => e.message ?? String(e));
t.check("where the rule it stands on is not there, it stops at its first line and says why", !!early && /v160 needs v149/.test(early) && (await one(`select to_regclass('public.town_works') is null as none`)).none, early);
await t.sql(`alter function town.work_counts_of_away(jsonb, text) rename to work_counts_of`);

t.section("v160, twice over");
await t.runTwice(FILE, "v160");
const tables = await rows(`select c.relname as name, c.relrowsecurity as closed,
    (select count(*)::int from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as grants,
    (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname = any($1) order by 1`, [TABLES]);
t.check("four tables more: the works, what each needs, who gave, and what is carried in the hands", same(tables.map((r) => r.name), [...TABLES].sort()) && (await kept()).tables === keptWas.tables + 4, tables.map((r) => r.name));
t.check("…each closed: row security on, no policy, and nothing granted to a browser", tables.length === 4 && tables.every((r) => r.closed && r.grants === 0 && r.policies === 0), tables);
const fns = await rows(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, p.prosecdef as definer, coalesce(p.proconfig::text, '') as config,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = any($1) order by 1`, [[...NEW, ...CALLED].map((s) => s.slice(0, s.indexOf("(")))]);
const sig = (s) => s.replace(/\b(p_[a-z_]+) /g, "").replace(/ DEFAULT [^,)]+/g, "");
t.check("fourteen functions more, with the words they are said to take", same(fns.map((f) => sig(f.name)).sort(), [...NEW, ...CALLED].sort()), fns.map((f) => sig(f.name)));
const called = fns.filter((f) => f.name.startsWith("public."));
t.check("the six a browser calls are a member's to call and nobody's who is signed out", called.length === 6 && called.every((f) => f.member && !f.anon), called.map((f) => [f.name, f.anon, f.member]));
t.check("…each security definer with its search path set", called.length === 6 && called.every((f) => f.definer && /search_path=public/.test(f.config)), called.map((f) => [f.name, f.definer, f.config]));
const ruleFns = fns.filter((f) => f.name.startsWith("town."));
t.check("the twelve rules are no browser's to call", ruleFns.length === 12 && ruleFns.every((f) => !f.member && !f.anon && !f.definer), ruleFns.map((f) => [f.name, f.anon, f.member]));
t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0);
t.check("no other function of the town's is written, dropped, added or given to anybody else", same(await texts(), textsWas), (await texts()).length);
const keptNow = await kept();
t.check("no other catalog row, no knob, no policy and no trigger is touched", same({ ...keptNow, tables: 0 }, { ...keptWas, tables: 0 }), keptNow);

t.section("the catalog's row, and the bridge as it is seeded");
const row = (await one(`select town.cat('bridge') as c`)).c;
t.check("the catalog's row `bridge` is the code's, to the entry", same(row, catalogOf().bridge), row);
const seeded = await rows(`select w.id, w.opened_at, w.done_at, n.thing, n.need, n.have from public.town_works w left join public.town_work_needs n on n.work = w.id`);
t.check("one work, the bridge: closed, not whole, needing six hundred stones and having none", same(seeded, [{ id: "bridge", opened_at: null, done_at: null, thing: "stone", need: BRIDGE.need, have: 0 }]), seeded);
await t.sql(`update public.town_work_needs set need = 77, have = 5 where work = 'bridge'`);
await t.db.exec(FILE);
t.check("run again, it leaves what the bridge needs and has as it finds them", same(await needOf(), { need: 77, have: 5 }), await needOf());
await anew({ open: false });

t.section("the two functions given lines are the ones they replace");
// (each is main's text as it is live, with one block of the file's before its last line, marked at its top and its end)
const TOP = "the bridge built by hand (v160)", END = "the bridge built by hand (v160): its end";
const MARK = "  return '[]'::jsonb;\nend;\n";
const BRANCH = `  -- ── ${TOP}: a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──\n  if what in ('stone_lay', 'stone_hand') then\n    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));\n  end if;\n  -- ── ${END} ──\n`;
const countsNow = await defOf(AGAIN[0]);
t.check("town.work_counts_of is the one it replaces, word for word, but for the one block for a stone laid, marked at its top and its end", OLD[AGAIN[0]].split(MARK).length === 2 && countsNow === OLD[AGAIN[0]].replace(MARK, () => BRANCH + MARK), countsNow?.length);
const WORDS = { stone_lift: "ยกหินจากกองหิน", stone_pass: "ส่งหินต่อให้คนถัดไป", stone_lay: "วางหินที่เชิงสะพาน", stone_hand: "หินที่ช่วยกันส่งต่อมาถึงเชิงสะพาน", stone_drop: "ปล่อยหินทิ้ง", work_give: "มอบของให้งานของหมู่บ้าน" };
const thNow = await defOf(AGAIN[1]);
const thMeant = OLD[AGAIN[1]].replace("else p_what end", () => `-- ── ${TOP}, and the village's works ──\n    ${Object.entries(WORDS).map(([k, v]) => `when '${k}' then '${v}'`).join(" ")}\n    -- ── ${END} ──\n    else p_what end`);
t.check("town.deed_th is the one it replaces, word for word, but for the one block of six words, marked at its top and its end", OLD[AGAIN[1]].split("else p_what end").length === 2 && thNow === thMeant, thNow?.slice(-520));
const said = Object.fromEntries(await Promise.all(Object.keys(WORDS).map(async (k) => [k, (await one(`select town.deed_th($1) as w`, [k])).w])));
t.check("each deed of the bridge's and the works' has its word in Thai, and a deed from before has the word it had", same(said, WORDS) && (await one(`select town.deed_th('pass') as w`)).w === "ส่งถังน้ำต่อให้คนถัดไป" && (await one(`select town.deed_th('no such') as w`)).w === "no such", said);
const privs = await rows(`select p.oid::regprocedure::text as name, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member from pg_proc p where p.oid = any($1::regprocedure[])`, [AGAIN]);
t.check("…and both are still no browser's to call", privs.length === 2 && privs.every((p) => !p.anon && !p.member), privs);

t.section("the rules, case by case, as the code answers them");
const ASK = {
  lift: "town.stone_lift($1::jsonb, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::text, $7::bigint)", pass: "town.stone_pass($1::jsonb, $2::text, $3::jsonb, $4::jsonb, $5::jsonb)",
  lay: "town.stone_lay($1::jsonb, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::bigint)", drop: "town.stone_drop($1::jsonb, $2::jsonb)", give: "town.works_give($1::jsonb, $2::jsonb, $3::text, $4::int)",
  wants: "town.works_wants($1::jsonb, $2::text)", spans: "town.stone_spans($1::int, $2::int)", near: "town.stone_near($1::int, $2::int, $3::text)", counts: "town.work_counts_of($1::jsonb, $2::text)",
};
const SAID = {
  lift: "a stone lifted", pass: "a stone handed on", lay: "a stone laid", drop: "a stone let go of", give: "a thing given to a work out of the bag", wants: "whether a work still wants a thing",
  spans: "how many spans so many stones make", near: "who stands by the pile and by the foot", counts: "what a deed of the bridge's counts for on the lines",
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

t.section("built closed: nothing is offered, and every function answers closed");
await anew({ open: false });
await purse(U.m1); await purse(U.m2); await purse(U.guest); await purse(U.admin);
await clock(NOON);
await t.sql(`insert into public.town_work_carried (member_id, work, thing, hands) values ($1, 'bridge', 'stone', array[$1::uuid])`, [U.guest]);
const mark0 = await lastDeed(), shutPurse = await purseOf(U.m1);
const shutTold = await read(U.m1);
t.check("a page is told only that the bridge is not open: no number, no name, no stone in anybody's hands", same(shutTold, { works: { bridge: { open: false, done: null, needs: {}, helpers: [], mine: {} } }, carried: null }) && same(await read(U.guest), shutTold), shutTold);
const shut = { lift: await lift(U.m1), pass: await pass(U.guest, U.m1), lay: await lay(U.guest), drop: await drop(U.guest), give: await call(U.m1, "town_work_give", { p_work: "bridge", p_thing: "stone", p_n: 1 }) };
t.check("lifting, handing on, laying, letting go and giving each answer closed", Object.values(shut).every((r) => r?.ok === false && r.why === "closed"), Object.fromEntries(Object.entries(shut).map(([k, r]) => [k, r?.why ?? r])));
t.check("…with nothing done: no deed written, no stamina gone, the bridge as it was, the stone that was in somebody's hands still there",
  (await deeds(mark0)).length === 0 && same(await purseOf(U.m1), shutPurse) && same(await needOf(), { need: BRIDGE.need, have: 0 }) && same(Object.keys(await carriedOf()), [U.guest]), { deeds: (await deeds(mark0)).length, need: await needOf() });
t.check("…and each tells the page again that it is not open", Object.values(shut).every((r) => r?.works?.works?.bridge?.open === false && r.works.carried === null), shut.lift?.works);
await t.sql(`delete from public.town_work_carried where true`);

t.section("opened by the one line the file's head gives");
const OPEN = FILE.split("\n").map((l) => l.trim()).find((l) => /^--\s+update public\.town_works set opened_at/.test(l))?.replace(/^--\s+/, "") ?? "";
t.check("the file's head gives the owner one line to open it with", OPEN === "update public.town_works set opened_at = now() where id = 'bridge';", OPEN);
await t.sql(OPEN);
const openTold = await read(U.m1);
t.check("the line run, a page is told the bridge: open, none of six hundred, nobody yet", same(openTold, { works: { bridge: { open: true, done: null, needs: { stone: { need: BRIDGE.need, have: 0 } }, helpers: [], mine: {} } }, carried: null }), openTold);
const up0 = await lift(U.m1);
t.check("…and a stone is lifted", up0?.ok === true && same(up0.works?.carried, { work: "bridge", thing: "stone" }), up0?.why ?? up0?.works?.carried);
await t.sql(`update public.town_works set opened_at = null where id = 'bridge'`);
t.check("closed again, whoever held a stone is told of none, and is refused like everybody", (await read(U.m1)).carried === null && (await lay(U.m1))?.why === "closed", await read(U.m1));

t.section("stories: four members at the bridge, through the functions a member calls");
const RODS = bagOf({ item: "rod", n: 1 });
const stories = FEW ? CASES.stories.slice(0, 3).concat(CASES.stories.slice(16, 18)) : CASES.stories;
let played = 0, storyWrong = null, endWrong = null, lineWrong = null;
for (const [i, s] of stories.entries()) {
  await clock(s.steps[0].now - 1000);
  await anew({ open: true, need: s.need, have: s.have });
  for (const who of Object.keys(s.stamina)) await purse(who, RODS, s.stamina[who]);
  for (const [k, x] of s.steps.entries()) {
    await clock(x.now);
    const d = x.deed;
    const r = d.fn === "lift" ? await lift(x.by, d.at) : d.fn === "lay" ? await lay(x.by, d.at) : d.fn === "pass" ? await pass(x.by, d.to) : d.fn === "drop" ? await drop(x.by)
      : d.fn === "hold" ? await call(x.by, "town_hold", { p_slot: d.slot }) : d.fn === "put_away" ? await call(x.by, "town_hold", { p_slot: null }) : await call(x.by, "town_works_read");
    played++;
    if (storyWrong) continue;
    const got = d.fn === "read" ? {} : Object.fromEntries(["ok", "why", "have", "spans", "span", "whole"].filter((key) => r?.[key] !== undefined).map((key) => [key, r[key]]));
    // (names are the test's own people's: held by their ids here, and said plainly further down)
    const works = r?.works ?? (await read(x.by)), told = works ? { ...works, works: Object.fromEntries(Object.entries(works.works).map(([id, w]) => [id, { ...w, helpers: w.helpers.map((h) => ({ id: h.id, name: h.id })) }])) } : null;
    const left = d.fn === "read" ? await staminaOf(x.by) : r?.purse ? Number((await one(`select town.stamina_of($1::jsonb, town.now_ms()) as n`, [JSON.stringify(r.purse)])).n) : null;
    if (!same(got, x.want) || !same(told, x.told) || left !== x.stamina) storyWrong = { story: i, step: k, deed: d, by: x.by, got, want: x.want, left, stamina: x.stamina, told: same(told, x.told) ? "same" : told, wantTold: same(told, x.told) ? "same" : x.told };
  }
  const bridge = await one(`select round(extract(epoch from w.opened_at) * 1000)::float8 as opened, round(extract(epoch from w.done_at) * 1000)::float8 as done from public.town_works w where w.id = 'bridge'`);
  const hands = {};
  for (const h of await handsOf()) (hands[h.id] ??= {})[h.thing] = { n: h.n, first: h.first };
  const end = { done: bridge.done, needs: { stone: await needOf() }, hands };
  if (!endWrong && !same(end, { done: s.end.bridge.done, needs: s.end.bridge.needs, hands: s.end.bridge.hands })) endWrong = { story: i, got: end, want: s.end.bridge };
  if (!endWrong && !same(await carriedOf(), s.end.carried)) endWrong = { story: i, carried: await carriedOf(), want: s.end.carried };
  const lines = {};
  for (const who of Object.keys(s.stamina)) { const l = await helpersOf(who); if (l) lines[who] = { points: l.points, today: l.today, day: l.day }; }
  if (!lineWrong && !same(lines, s.end.helpers)) lineWrong = { story: i, got: lines, want: s.end.helpers };
}
t.check(`${stories.length} stories, ${played} deeds: every answer, the doer's stamina and what they are told of the works are the code's`, played > 400 && !storyWrong, storyWrong ? JSON.stringify(storyWrong).slice(0, 1400) : "");
t.check("…and at each end what is kept: how many the bridge has, who was counted how many and when each first came, whether it is marked whole, who still holds a stone and whose hands it came by", !endWrong, endWrong ? JSON.stringify(endWrong).slice(0, 1200) : "");
t.check("…and where each stands on the helpers' line: a point a stone to everybody it came by, counted by the day's bound", !lineWrong, lineWrong ? JSON.stringify(lineWrong).slice(0, 900) : "");

t.section("a stone through three pairs of hands");
await clock(NOON);
await anew({ open: true });
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
const mark1 = await lastDeed();
const up = await lift(U.m1, [PILE[0] + 1, PILE[1] - 2]);
t.check("lifted at the pile with empty hands: one stamina, and the stone is in the lifter's hands", up?.ok === true && (await staminaOf(U.m1)) === 99 && same((await carriedOf())[U.m1], { work: "bridge", thing: "stone", hands: [U.m1] }), { why: up?.why, left: await staminaOf(U.m1) });
t.check("…with nothing in the bag for it, and no coin moved", same((await purseOf(U.m1)).bag, RODS) && up.purse?.coins === 0 && !("carried" in up), up?.purse?.bag);
const on1 = await pass(U.m1, U.m2);
t.check("handed on to somebody with empty hands: at once, for nothing", on1?.ok === true && (await staminaOf(U.m1)) === 99 && (await staminaOf(U.m2)) === 100 && same(await carriedOf(), { [U.m2]: { work: "bridge", thing: "stone", hands: [U.m1, U.m2] } }), { why: on1?.why, carried: await carriedOf() });
t.check("…whoever handed it on is told their hands are empty, and whoever took it that they hold a stone", on1.works?.carried === null && same((await read(U.m2)).carried, { work: "bridge", thing: "stone" }), on1?.works?.carried);
const on2 = await pass(U.m2, U.guest);
await clock(NOON + 5 * MIN);
const down = await lay(U.guest, [FOOT[0] - 2, FOOT[1] + 1]);
t.check("laid at the foot: one stamina, the bridge has one more, and the hands are empty", on2?.ok === true && down?.ok === true && down.have === 1 && down.spans === 0 && down.span === false && down.whole === false && (await staminaOf(U.guest)) === 99 && same(await carriedOf(), {}) && same(await needOf(), { need: BRIDGE.need, have: 1 }),
  { why: down?.why, have: down?.have, need: await needOf() });
t.check("…and its answer says nothing of whose hands the stone came by", down?.ok === true && !("hands" in down) && !("carried" in on1) && !("carried" in up), Object.keys(down ?? {}));
t.check("all three whose hands it went through are counted one stone, each from that moment", same(await handsOf(), [U.m1, U.m2, U.guest].map((id) => ({ id, thing: "stone", n: 1, first: NOON + 5 * MIN }))), await handsOf());
const points = Object.fromEntries(await Promise.all([U.m1, U.m2, U.guest, U.admin].map(async (id) => [id, (await helpersOf(id))?.points ?? 0])));
t.check("…and each has a point on the helpers' line; nobody else has", same(points, { [U.m1]: 1, [U.m2]: 1, [U.guest]: 1, [U.admin]: 0 }), points);
const written = (await deeds(mark1)).map((d) => [d.by, d.what, d.thing, d.n, d.coins]);
t.check("every deed is written down: a lift, two handings on, a laying, and a line for each of the two others it came by",
  same(written, [[U.m1, "stone_lift", "stone", 1, 0], [U.m1, "stone_pass", "stone", 1, 0], [U.m2, "stone_pass", "stone", 1, 0], [U.guest, "stone_lay", "stone", 1, 0], [U.m1, "stone_hand", "stone", 1, 0], [U.m2, "stone_hand", "stone", 1, 0]]), written);
const docs = (await deeds(mark1)).map((d) => d.doc);
t.check("…each with its particulars: the tile, to whom, how many the bridge had, by whom", same(docs[0].tile, [PILE[0] + 1, PILE[1] - 2]) && docs[1].to === U.m2 && docs[3].have === 1 && docs[3].hands === 3 && same(docs[3].tile, [FOOT[0] - 2, FOOT[1] + 1]) && docs[4].by === U.guest && docs.every((d) => d.work === "bridge"), docs);
// (two more: a stone of the admin's alone a minute later, and one of member two's and member one's after that)
await clock(NOON + 6 * MIN); await lift(U.admin); await lay(U.admin);
await clock(NOON + 7 * MIN); await lift(U.m2); await pass(U.m2, U.m1); const third = await lay(U.m1);
const page = await read(U.m1);
t.check("the sign's names are everybody who has helped in the order they first came (who came at one moment by their ids), with their names and no number",
  same(page.works.bridge.helpers, [{ id: U.m1, name: "Member One" }, { id: U.m2, name: "Member Two" }, { id: U.guest, name: "Guest Three" }, { id: U.admin, name: "Aqua Admin" }]) && !/\d/.test(JSON.stringify(page.works.bridge.helpers.map((h) => h.name))), page.works.bridge.helpers);
t.check("my own count is told to me alone: two for member one, one for the guest, one for the admin",
  same(page.works.bridge.mine, { stone: 2 }) && same((await read(U.guest)).works.bridge.mine, { stone: 1 }) && same((await read(U.admin)).works.bridge.mine, { stone: 1 }) && third.have === 3 && same(third.works.works.bridge.mine, { stone: 2 }), page.works.bridge.mine);
t.check("…and nobody's count but mine is in what I am told", !JSON.stringify(page).includes('"n"') && Object.keys(page.works.bridge).sort().join() === "done,helpers,mine,needs,open", Object.keys(page.works.bridge));

t.section("what stands in the way");
await clock(NOON + 10 * MIN);
const far = await lift(U.m1, FOOT), nowhere = await lift(U.m1, null), off = await lift(U.m1, [PILE[0] + BRIDGE.near + 1, PILE[1]]);
t.check("a stone is lifted only from a tile by the pile: far", [far, nowhere, off].every((r) => r?.ok === false && r.why === "far") && same(await carriedOf(), {}), [far?.why, nowhere?.why, off?.why]);
await call(U.m1, "town_hold", { p_slot: 0 });
const handful = await lift(U.m1);
t.check("…and only with nothing in the hand: hand", handful?.ok === false && handful.why === "hand" && (await staminaOf(U.m1)) === 98, handful?.why);
await lift(U.m2);
const twice = await lift(U.m2);
t.check("a second stone is not lifted while one is held: held", twice?.ok === false && twice.why === "held" && (await staminaOf(U.m2)) === 98, twice?.why);
const toHand = await pass(U.m2, U.m1);
t.check("a stone is not handed to somebody with a thing in the hand: hand", toHand?.ok === false && toHand.why === "hand" && same(Object.keys(await carriedOf()), [U.m2]), toHand?.why);
await call(U.m1, "town_hold", { p_slot: null });
await lift(U.m1);
const toHeld = await pass(U.m2, U.m1);
t.check("…nor to somebody who holds a stone: held", toHeld?.ok === false && toHeld.why === "held" && same(Object.keys(await carriedOf()).sort(), [U.m1, U.m2].sort()), toHeld?.why);
await purse(U.unver, RODS, 100);
const selfish = await pass(U.m2, U.m2), toNone = await pass(U.m2, null), toStranger = await pass(U.m2, U.unver), toGone = await pass(U.m2, "00000000-0000-0000-0000-0000000000ff");
t.check("…nor to oneself, to nobody, to a character never proved or to somebody who is not there: none", [selfish, toNone, toStranger, toGone].every((r) => r?.ok === false && r.why === "none") && same((await carriedOf())[U.m2].hands, [U.m2]), [selfish?.why, toNone?.why, toStranger?.why, toGone?.why]);
const empty = await pass(U.guest, U.admin), nothing = await lay(U.guest), noDrop = await drop(U.guest);
t.check("with no stone there is nothing to hand on, to lay or to let go of: none", [empty, nothing, noDrop].every((r) => r?.ok === false && r.why === "none"), [empty?.why, nothing?.why, noDrop?.why]);
const wrongPlace = await lay(U.m2, PILE), noPlace = await lay(U.m2, null);
t.check("a stone is laid only from a tile by the foot: far, and it stays in the hands", [wrongPlace, noPlace].every((r) => r?.ok === false && r.why === "far") && (await needOf()).have === 3 && !!(await carriedOf())[U.m2], [wrongPlace?.why, noPlace?.why]);
const mark2 = await lastDeed(), let_ = await drop(U.m2);
t.check("let go of anywhere, it is gone: nothing comes back, the bridge has no more, and it is written down", let_?.ok === true && let_.works.carried === null && !(await carriedOf())[U.m2] && (await staminaOf(U.m2)) === 98 && (await needOf()).have === 3 && same((await deeds(mark2)).map((d) => [d.by, d.what]), [[U.m2, "stone_drop"]]), let_?.why);
t.check("…and nothing refused wrote a deed or spent stamina", (await staminaOf(U.guest)) === 99 && (await deeds(mark2)).length === 1);
await drop(U.m1);

t.section("the hundredth stone is a span, the six-hundredth makes it whole");
await anew({ open: true, have: 98 });
await clock(NOON + 20 * MIN);
await lift(U.m1); const s99 = await lay(U.m1); await lift(U.m1); const s100 = await lay(U.m1); await lift(U.m1); const s101 = await lay(U.m1);
t.check("the ninety-ninth is no span, the hundredth is the first, the hundred-and-first is none", [s99, s100, s101].every((r) => r?.ok) && same([s99, s100, s101].map((r) => [r.have, r.spans, r.span, r.whole]), [[99, 0, false, false], [100, 1, true, false], [101, 1, false, false]]), [s99, s100, s101].map((r) => [r?.have, r?.spans, r?.span]));
const spanDeed = (await rows(`select d.doc from public.town_deeds d where d.what = 'stone_lay' order by d.id desc limit 2`)).map((r) => r.doc.span ?? null);
t.check("…and the deed of the stone that finished a span says which", same(spanDeed, [null, 1]), spanDeed);
await anew({ open: true, have: 598 });
for (const who of [U.m1, U.m2, U.guest]) { await purse(who, RODS, 100); await lift(who); }
await clock(NOON + 30 * MIN);
const s599 = await lay(U.m2);
await clock(NOON + 31 * MIN);
const s600 = await lay(U.m1);
t.check("the six-hundredth stone makes the bridge whole: six spans, and the moment is marked", s599?.whole === false && s600?.ok === true && same([s600.have, s600.spans, s600.span, s600.whole], [600, 6, true, true]) && s600.works.works.bridge.done === NOON + 31 * MIN, [s600?.have, s600?.spans, s600?.whole, s600?.works?.works?.bridge?.done]);
const late = await lay(U.guest), more = await lift(U.m2);
t.check("…then nothing more is laid or lifted: whole", late?.ok === false && late.why === "whole" && more?.ok === false && more.why === "whole" && same(await needOf(), { need: BRIDGE.need, have: 600 }), [late?.why, more?.why]);
t.check("…the stone that came too late is still in its holder's hands, to be let go of", !!(await carriedOf())[U.guest] && (await drop(U.guest))?.ok === true && same(await carriedOf(), {}), await carriedOf());
const whole = await read(U.admin);
t.check("…and the names stay on the sign in the order they came, with my own count", same(whole.works.bridge.helpers.map((h) => h.id), [U.m2, U.m1]) && same((await read(U.m1)).works.bridge.mine, { stone: 1 }) && whole.works.bridge.done === NOON + 31 * MIN, whole.works.bridge);

t.section("tired hands: nothing is refused");
await anew({ open: true });
await clock(NOON + 40 * MIN);
await purse(U.m1, RODS, 0); await purse(U.m2, RODS, 0);
const tiredUp = await lift(U.m1), tiredOn = await pass(U.m1, U.m2), tiredDown = await lay(U.m2);
t.check("with no stamina a stone is lifted, handed on and laid all the same, at none", tiredUp?.ok === true && tiredOn?.ok === true && tiredDown?.ok === true && tiredDown.have === 1 && (await staminaOf(U.m1)) === 0 && (await staminaOf(U.m2)) === 0, [tiredUp?.why, tiredOn?.why, tiredDown?.why]);
await purse(U.m1, RODS, 1);
await lift(U.m1);
t.check("the last point of stamina lifts a stone and leaves none", (await staminaOf(U.m1)) === 0 && (await lay(U.m1))?.ok === true && (await staminaOf(U.m1)) === 0);

t.section("the works' own giving: out of the bag");
await t.sql(`insert into public.town_works (id, opened_at) values ('heap', null), ('fence', now());
  insert into public.town_work_needs (work, thing, need, have) values ('heap', 'kangkong', null, 0), ('heap', 'salt', 4, 0), ('fence', 'kangkong', 5, 0);`);
const KANG = (n, salt = 0) => bagOf({ item: "kangkong", n }, ...(salt ? [{ item: "salt", n: salt }] : []));
await purse(U.m1, KANG(20, 6), 50);
await clock(NOON + 50 * MIN);
const giveShut = await call(U.m1, "town_work_give", { p_work: "heap", p_thing: "kangkong", p_n: 2 }), noWork = await call(U.m1, "town_work_give", { p_work: "tower", p_thing: "kangkong", p_n: 2 });
t.check("a work that is not open, and one there is none of, take nothing: closed", giveShut?.why === "closed" && noWork?.why === "closed" && same((await purseOf(U.m1)).bag, KANG(20, 6)), [giveShut?.why, noWork?.why]);
await t.sql(`update public.town_works set opened_at = now() where id = 'heap'`);
const mark3 = await lastDeed(), lineWas = await helpersOf(U.m1);
const g1 = await call(U.m1, "town_work_give", { p_work: "fence", p_thing: "kangkong", p_n: 3 });
t.check("so many given leave the bag and are the work's: it has three, the giver is counted three, no stamina and no coin", g1?.ok === true && g1.have === 3 && same((await purseOf(U.m1)).bag, KANG(17, 6)) && same(await needOf("fence", "kangkong"), { need: 5, have: 3 }) && same((await handsOf("fence")).map((h) => [h.id, h.thing, h.n]), [[U.m1, "kangkong", 3]]) && (await staminaOf(U.m1)) === 50 && g1.purse.coins === 0,
  { why: g1?.why, bag: (await purseOf(U.m1)).bag, need: await needOf("fence", "kangkong") });
t.check("…written down as a deed with its word, which counts on no line", same((await deeds(mark3)).map((d) => [d.by, d.what, d.thing, d.n, d.doc.work, d.doc.have]), [[U.m1, "work_give", "kangkong", 3, "fence", 3]]) && same(await helpersOf(U.m1), lineWas), await deeds(mark3));
const over = await call(U.m1, "town_work_give", { p_work: "fence", p_thing: "kangkong", p_n: 3 });
t.check("what would pass what the work needs is refused whole: over", over?.ok === false && over.why === "over" && same((await purseOf(U.m1)).bag, KANG(17, 6)) && (await needOf("fence", "kangkong")).have === 3, over?.why);
const short = await call(U.m1, "town_work_give", { p_work: "heap", p_thing: "salt", p_n: 7 }), none = await call(U.m1, "town_work_give", { p_work: "heap", p_thing: "rod", p_n: 1 }), zero = await call(U.m1, "town_work_give", { p_work: "heap", p_thing: "salt", p_n: 0 }), unsaid = await call(U.m1, "town_work_give", { p_work: "heap", p_thing: "salt", p_n: null });
t.check("more than the bag has is short; a thing the work does not take, and no number, are none", short?.why === "short" && none?.why === "none" && zero?.why === "none" && unsaid?.why === "none", [short?.why, none?.why, zero?.why, unsaid?.why]);
const g2 = await call(U.m1, "town_work_give", { p_work: "fence", p_thing: "kangkong", p_n: 2 });
const fence = await one(`select round(extract(epoch from w.done_at) * 1000)::float8 as done from public.town_works w where w.id = 'fence'`);
t.check("the last it needs makes it whole: marked at that moment, and told to a page", g2?.ok === true && g2.have === 5 && fence.done === NOON + 50 * MIN && g2.works.works.fence.done === NOON + 50 * MIN, { why: g2?.why, done: fence.done });
await t.sql(`update public.town_work_needs set need = 9 where work = 'fence'`);
const g3 = await call(U.m1, "town_work_give", { p_work: "fence", p_thing: "kangkong", p_n: 1 });
t.check("the mark closes nothing: a work marked whole that needs more again takes more, and keeps its first mark", g3?.ok === true && g3.have === 6 && (await one(`select round(extract(epoch from w.done_at) * 1000)::float8 as done from public.town_works w where w.id = 'fence'`)).done === NOON + 50 * MIN, g3?.why ?? g3?.have);
await t.sql(`update public.town_work_needs set have = 100000 where work = 'heap' and thing = 'kangkong'`);
const g4 = await call(U.m1, "town_work_give", { p_work: "heap", p_thing: "kangkong", p_n: 14 });
t.check("a need with no number takes any amount, whatever it has, and such a work is never marked whole", g4?.ok === true && g4.have === 100014 && (await one(`select w.done_at from public.town_works w where w.id = 'heap'`)).done_at === null && same((await purseOf(U.m1)).bag, KANG(0, 6).map((s) => (s?.item === "kangkong" ? null : s))), g4?.why ?? g4?.have);
await purse(U.m2, KANG(4, 4), 50);
const g5 = await call(U.m2, "town_work_give", { p_work: "heap", p_thing: "salt", p_n: 4 });
t.check("who gave is kept by work and thing, each from when they first came; and a page is told its givers", g5?.ok === true && same((await handsOf("heap")).map((h) => [h.id, h.thing, h.n]), [[U.m1, "kangkong", 14], [U.m2, "salt", 4]]) && same(g5.works.works.heap.helpers.map((h) => h.id), [U.m1, U.m2]) && same(g5.works.works.heap.mine, { salt: 4 }), await handsOf("heap"));
t.check("…and a work with a need that has no number is not marked whole, though all it needs a number of is there", same(await needOf("heap", "salt"), { need: 4, have: 4 }) && (await one(`select w.done_at from public.town_works w where w.id = 'heap'`)).done_at === null && g5.works.works.heap.done === null, g5?.works?.works?.heap);
t.check("the bridge's stones are not to be given out of a bag: nobody has one", (await call(U.m1, "town_work_give", { p_work: "bridge", p_thing: "stone", p_n: 1 }))?.why === "short");
await t.sql(`delete from public.town_works where id in ('heap', 'fence')`);
t.check("a work taken away takes what it needed and who gave with it", (await rows(`select 1 from public.town_work_needs where work in ('heap', 'fence') union all select 1 from public.town_work_hands where work in ('heap', 'fence')`)).length === 0);

t.section("who may");
await anew({ open: true });
await clock(NOON + 55 * MIN);
const out = await Promise.all([call("anon", "town_works_read"), call("anon", "town_stone_lift", { p_x: PILE[0], p_y: PILE[1] }), call("anon", "town_stone_pass", { p_to: U.m1 }), call("anon", "town_stone_lay", { p_x: FOOT[0], p_y: FOOT[1] }), call("anon", "town_stone_drop"), call("anon", "town_work_give", { p_work: "bridge", p_thing: "stone", p_n: 1 })]);
t.check("somebody signed out is refused all six", out.every((r) => /permission denied/.test(r.error ?? "")), out.map((r) => r.error ?? r));
for (const who of ["unver", "nochar"]) {
  await purse(U[who], RODS, 100);
  const tries = [await call(U[who], "town_works_read"), await lift(U[who]), await pass(U[who], U.m1), await lay(U[who]), await drop(U[who]), await call(U[who], "town_work_give", { p_work: "bridge", p_thing: "stone", p_n: 1 })];
  t.check(`${who === "unver" ? "a character never proved" : "an account with no character"} is refused all six, and holds no stone`, tries.every((r) => r.code === "42501") && same(await carriedOf(), {}), tries.map((r) => r.code ?? r.why ?? r));
}
await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
const shutGame = [await call(U.m1, "town_works_read"), await lift(U.m1)], admin = await lift(U.admin);
t.check("while the town's game is shut a member is refused, and an admin is not", shutGame.every((r) => r.code === "42501") && admin?.ok === true, [shutGame.map((r) => r.code ?? r), admin?.why]);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const peek = [];
for (const table of TABLES) for (const who of ["anon", U.m1]) peek.push(await t.as(who, `select count(*) from public.${table}`));
t.check("the four tables are nobody's to read from a browser", peek.every((r) => /permission denied/.test(r.error ?? "")), peek.map((r) => r.error ?? r.rows));
const poke = [await t.as(U.m1, `update public.town_work_needs set have = 600 where work = 'bridge'`), await t.as(U.m1, `update public.town_works set opened_at = now() where true`), await t.as(U.m1, `insert into public.town_work_carried (member_id, work, thing) values ('${U.m1}', 'bridge', 'stone')`)];
t.check("…nor to write: no stone laid, no work opened and no stone conjured from outside", poke.every((r) => /permission denied/.test(r.error ?? "")), poke.map((r) => r.error ?? r.affected));
const rules = [await t.as(U.m1, `select town.works_counted('bridge', 'stone', array['${U.m1}'::uuid], 500, 500, 0)`), await t.as(U.m1, `select town.works_told('${U.m2}'::uuid)`), await t.as(U.m1, `select town.stone_lay('{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 0)`)];
t.check("the rules are not to be asked from outside: nobody counts themselves stones, or reads another's count", rules.every((r) => /permission denied/.test(r.error ?? "")), rules.map((r) => r.error ?? r.rows));

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
