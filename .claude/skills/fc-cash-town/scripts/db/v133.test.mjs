/*
 * v133 — waters that differ: dry run in PGlite.
 *
 * v133 stands on v132 (a bucket line). Water drawn has a nature by its moment (the rain's, the dew's, the moon's);
 * a bucket keeps it beside the hands its water came by; poured into the well it gives the well that nature for a
 * while; and while the well has one, every watering has it, by the trigger that keeps the heat. v105 to v131 are
 * replayed as they ran, then v130 and v132 (drafts, files, or history), then:
 *
 *   · a morning of water before the file, and the file run twice;
 *   · its closing block; that nothing else changed: every function its own text, the five written again the lines meant;
 *   · the rules, case by case: the well's water, the nature of a bucket drawn at a moment under a sky, a plot kept
 *     under a sky and a water;
 *   · in a world where no water has a nature, every story of before, to the same books and the same tables;
 *   · thirty stories over a day and a night, in the rain and under a full moon, step by step;
 *   · the three waters by the functions a member calls: drawn, handed on, poured, and a plant watered under each;
 *   · that the trigger cannot undo a watering; who may read and call what; the file a third time.
 *
 *   node v133.test.mjs            (STORIES=<n> takes the first n of each kind; RULES=0 leaves the rule cases out)
 *   node mutate.mjs <the file> v133.test.mjs v133.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
/** A migration of the town's: a draft beside this test while there is one and supabase/ has none; then supabase/; then history, once it has run. */
const fileOf = (n) => {
  const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith(`v${n}_`)), here = new URL(`./v${n}_draft.sql`, import.meta.url);
  return !inRepo && existsSync(here) ? readFileSync(here, "utf8") : migration(n);
};
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : fileOf(133);
const DIR = process.env.VECTORS ?? "now";
const need = (name, how) => {
  const at = new URL(`./${DIR}/${name}`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/${name}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run ${how}\` in the repo first`); process.exit(2); }
  return JSON.parse(readFileSync(at, "utf8"));
};
const WELL = need("vectors-v127.json", "lib/town/db-vectors-well.test.ts"), CARRY = need("vectors-v130.json", "lib/town/db-vectors-carry.test.ts"), LINE = need("vectors-v132.json", "lib/town/db-vectors-line.test.ts"), WATERS = need("vectors-v133.json", "lib/town/db-vectors-waters.test.ts");
const CODE = need("catalog.json", "lib/town/db-vectors.test.ts");
const take = (list) => (process.env.STORIES ? list.slice(0, Number(process.env.STORIES)) : list);

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
// (everything of the town's that has run, in the order it ran; then v130 and v132, which this one stands on)
const RAN = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 127, 128, 129, 126, 131];
const MIN = 60_000, HOUR = 3_600_000;
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const t = await supabaseLike({ extra });
for (const n of RAN) await t.run(migration(n), `v${n}`);
await t.run(fileOf(130), "v130");
await t.run(fileOf(132), "v132");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const clock = (ms) => t.sql(`update town.test_clock set ms = ${ms}`);
const NAME = Object.fromEntries((await t.sql(`select id, coalesce(character_name, display_name, discord_username, '') as name from public.profiles`)).rows.map((r) => [r.id, r.name]));
/** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
const purse = (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const pass = async (who, to) => { const r = await t.as(who, `select public.town_pass($1::uuid) as r`, [to]); return r.error ? r : r.rows[0].r; };
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return r ? { coins: r.coins, ...r.doc } : null; };
const plant = (x, y, doc) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = 0`, [x, y, JSON.stringify(doc)]);
const growing = (by, over = {}) => ({ by, crop: "pumpkin", sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: MORNING + 96 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...over });
/** What the well's book keeps (v127's four), who helped whom, the yard's water and whose pots, and whose hands each bucket's water came by. */
const book = async () => ({
  water: (await t.sql(`select member_id as by, buckets as left from public.town_well_water order by id`)).rows,
  cans: Object.fromEntries((await t.sql(`select member_id, item, carrier, waterings from public.town_well_cans order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, { by: r.carrier, left: r.waterings }])),
  carriers: Object.fromEntries((await t.sql(`select member_id, buckets, taken from public.town_carriers order by 1`)).rows.map((r) => [r.member_id, { buckets: r.buckets, taken: r.taken }])),
  reach: (await t.sql(`select day, carrier, x, y, owner, n from public.town_well_reach order by 1, 2, 3, 4`)).rows.reduce((all, r) => {
    (all[`${r.day}/${r.carrier}`] ??= {})[`${r.x},${r.y}`] = { owner: r.owner, n: r.n };
    return all;
  }, {}),
});
const yardNow = async () => ({
  yard: (await t.sql(`select member_id as by, buckets as left from public.town_yard_water order by id`)).rows,
  pots: (await t.sql(`select day, carrier, cook, n from public.town_yard_reach order by 1, 2, 3`)).rows.reduce((all, r) => { (all[`${r.day}/${r.carrier}`] ??= {})[r.cook] = r.n; return all; }, {}),
});
const helpNow = async () => (await t.sql(`select x, y, helper, owner, water, carry from public.town_plot_help order by 1, 2, 3`)).rows.reduce((all, r) => {
  const plot = (all[`${r.x},${r.y}`] ??= { owner: r.owner, by: {} });
  plot.by[r.helper] = { water: r.water, carry: r.carry };
  return all;
}, {});
// (a bucket drawn with a nature has a line with no hands: the code keeps the hands and the nature apart)
const lineNow = async () => Object.fromEntries((await t.sql(`select member_id, item, hands from public.town_line_water where cardinality(hands) > 0 order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, r.hands]));
const kindsNow = async () => Object.fromEntries((await t.sql(`select member_id, item, kind from public.town_line_water where kind is not null order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, r.kind]));
/** The well's water as it is kept: what was last poured in with a nature, run out or not; null when none ever was. */
const wellWater = async () => (await one(`select doc from public.town_things where key = 'well_water'`))?.doc ?? null;
const setWellWater = (w) => t.sql(`update public.town_things set doc = $1::jsonb where key = 'well_water'`, [JSON.stringify(w)]);
const plotNow = async (x, y) => (await one(`select soil, plant, changed from public.town_plots where x = $1 and y = $2`, [x, y])) ?? null;
/** The sky of the quarter hour a moment is in, as the database has it (none: that quarter hour is not written). */
const sky = async (ms, word) => {
  await t.sql(`delete from public.town_weather where slot = floor(${ms}::numeric / 900000)::bigint`);
  if (word) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values (floor(${ms}::numeric / 900000)::bigint, $1, 5, 10, $2)`, [word, ["drizzle", "rain", "storm"].includes(word) ? 1 : 0]);
};
const wellIs = async () => Number((await one(`select doc from public.town_things where key = 'well'`)).doc);
const deedsSince = async (id) => (await t.sql(`select id, member_id, what, thing, n, doc from public.town_deeds where id > $1 order by id`, [id])).rows.map((d) => ({ ...d, n: Number(d.n) }));
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as id from public.town_deeds`)).id);
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));
/** The lines of one text that are not in the other, in order (the longest run they share is left out). */
function differ(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const gone = [], more = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) gone.push(A[i++]); else more.push(B[j++]);
  }
  while (i < n) gone.push(A[i++]);
  while (j < m) more.push(B[j++]);
  return { gone, more };
}

/* ── a morning of water, before the file ─────────────────────────────────── */

const RIVER = [16, 38];
const wellAt = (await one(`select town.cat('farming')->'wellAt' as at`)).at, AT_WELL = [wellAt[0] + 1, wellAt[1]];
const holding = (who, item, water = 0, left = 100) => purse(who, 0, [{ item, n: 1, ...(water ? { water } : {}) }], left, { hand: item });
await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'; truncate public.town_well_water restart identity`);
await holding(U.m1, "bucket");
await purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
await plant(133, 5, growing(U.admin));
{
  const said = [];
  for (let i = 0; i < 2; i++) { said.push(await call(U.m1, "town_chore", ...RIVER)); said.push(await call(U.m1, "town_chore", ...AT_WELL)); }
  said.push(await call(U.m2, "town_chore", ...AT_WELL));
  said.push(await call(U.m2, "town_tend", 133, 5));
  t.check("before the file: two bucketfuls carried, a can filled from them, a plant of somebody else's watered", said.every((r) => r.ok === true) && (await wellIs()) === 1, said.map((r) => r.ok ?? r));
}
const bookWas = await book(), helpWas = await helpNow(), lineWas = await lineNow(), textsWas = await texts(), plotWas = await plotNow(133, 5), deedsWas = await lastDeed();

await t.runTwice(FILE, "v133");
const textsNow = await texts();
let v, r;

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = (await t.sql(`select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'town_line_water' order by ordinal_position`)).rows;
t.check("a bucket's water has its nature beside the hands it came by", same(v.map((c) => c.column_name), ["member_id", "item", "hands", "kind"]) && v[3].data_type === "text", v);
v = await one(`select c.relrowsecurity as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'town_line_water' and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.relname = 'town_line_water' and c.relnamespace = 'public'::regnamespace`);
t.check("…in a table still closed", same(v, { closed: true, grants: 0 }), v);
t.check("the well's water is there, with no nature yet", same(await wellWater(), null) && (await one(`select count(*)::int as n from public.town_things where key = 'well_water'`)).n === 1);
v = await t.sql(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_well', 'town_well_ranks') order by 1`);
t.check("the two functions written again are a member's to call still, and nobody's signed out", same(v.rows, ["town_well", "town_well_ranks"].map((proname) => ({ proname, anon: false, member: true }))), v.rows);
v = await one(`select town.cat('waters') as waters`);
t.check("the catalog has the waters' numbers", same(v.waters, { dawn: [5, 7], night: [19, 5], lasts: 30, most: 120, adds: { dawn: 1, rain: 0.5, moon: 0 }, guards: { dawn: 0, rain: 0, moon: 12 } }), v);
v = await one(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
       (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are nobody's in a browser", same(v, { member_has_rules: false, open: 0 }), v);
v = await t.sql(`select c.relname, tg.tgname from pg_trigger tg join pg_class c on c.oid = tg.tgrelid where tg.tgname in ('town_plots_heat', 'town_plays_yard', 'town_deeds_well') order by 1`);
t.check("the three triggers are as they were", same(v.rows, [{ relname: "town_deeds", tgname: "town_deeds_well" }, { relname: "town_plays", tgname: "town_plays_yard" }, { relname: "town_plots", tgname: "town_plots_heat" }]), v.rows);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.water_kind(bigint)", "town.well_poured(jsonb,text,integer,uuid,bigint)", "town.well_water_told(bigint)"];
  const AGAIN = ["town.plot_heat()", "town.well_seen(uuid,bigint,text,text,numeric,jsonb)", "town.well_book(uuid,bigint)", "town_well()", "town_well_ranks()"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("three functions are new, none is gone", same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added: added.filter((s) => !NEW.includes(s)), missing: NEW.filter((s) => !added.includes(s)), gone });
  const others = Object.keys(textsWas).filter((sig) => !AGAIN.includes(sig) && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter: the farm's, the heat's own rule, the line's, the jar's", others.length === 0 && Object.keys(textsWas).length > 190
    && ["town_tend(integer,integer,jsonb,boolean)", "town.water(text,jsonb,jsonb,text,bigint)", "town_chore(integer,integer)", "town.hot(bigint)", "town_ditch(integer,integer)", "town_pass(uuid)", "town.line_counted(uuid,text,integer,bigint,text)", "town.jar_work(integer,integer)", "town.deed_th(text)"].every((sig) => sig in textsWas), others);
  let d = differ(textsWas["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"], textsNow["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"]);
  t.check("the well's reader is v132's but for the nature of the water: six lines written otherwise, twenty in their place and beside them", d.gone.length === 6 && d.more.length === 20
    && d.gone.every((line) => /town_line_water|v_hands := array_remove|whoever takes it is the last|on conflict \(member_id, item\) do update set hands/.test(line)), d);
  d = differ(textsWas["town.plot_heat()"], textsNow["town.plot_heat()"]);
  t.check("the plots' trigger is v130's with the well's water beside the heat: three lines written otherwise", d.gone.length === 3 && d.more.length === 19 && d.more.some((line) => /town\.well_water_told\(new\.changed\)/.test(line)), d);
  d = differ(textsWas["town.well_book(uuid,bigint)"], textsNow["town.well_book(uuid,bigint)"]);
  t.check("the book is v132's with what the well's water is told when it is something", d.gone.length === 1 && d.gone[0] === "    'carriers', v_carriers);" && d.more.length === 4 && d.more[0] === "  v_water jsonb := town.well_water_told(p_now);", d);
  d = differ(textsWas["town_well()"], textsNow["town_well()"]);
  t.check("the book's own function is v130's with the well's water told beside it", d.gone.length === 1 && d.more.length === 2 && d.more[1] === "    'wellWater', town.well_water_told(now_));", d);
  d = differ(textsWas["town_well_ranks()"], textsNow["town_well_ranks()"]);
  t.check("everybody's rank is v132's with the well's water told beside it", same(d.gone, ["    'line', true);"]) && same(d.more, ["    'line', true,", "    'wellWater', town.well_water_told(town.now_ms()));"]), d);

  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  const was = Object.fromEntries(before.map((row) => [row.key, row])), written = after.filter((row) => !was[row.key] || String(row.updated_at) !== String(was[row.key].updated_at)).map((row) => row.key);
  t.check("it seeds one row and writes none over", same(written, ["waters"]) && after.length === before.length + 1 && after.every((row) => written.includes(row.key) || same(row.data, was[row.key].data)), written);
  const odd = after.filter((row) => !same(row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now", odd.length === 0 && after.length === before.length + 1, odd);
  t.check("what the book kept before the file is as it was: its water, who helped whom, the hands of each bucket, the plot watered that morning; and no bucket is given a nature after the fact",
    same(await book(), bookWas) && same(await helpNow(), helpWas) && same(await lineNow(), lineWas) && same(await kindsNow(), {}) && same(await plotNow(133, 5), plotWas) && (await lastDeed()) === deedsWas, await kindsNow());
}

/* ── the rules ───────────────────────────────────────────────────────────── */

if (process.env.RULES !== "0") {
  t.section(`the rules: ${WATERS.rules.length} cases of the well's water, ${WATERS.natures.length} moments a bucket is drawn at, ${WATERS.kept.length} rows written under a sky and a water`);
  let bad = 0, first = null;
  for (const c of WATERS.rules) {
    let got, error = null;
    try { got = (await t.db.query(`select town.well_poured($1::jsonb, $2::text, $3::int, $4::uuid, $5::bigint) as r`, c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)))).rows[0].r; } catch (e) { error = e.message; }
    if (error || !same(got ?? null, c.want)) { bad++; first ??= { args: c.args, want: c.want, got: error ?? got }; }
  }
  t.check(`well_poured: ${WATERS.rules.length} cases`, bad === 0 && WATERS.rules.length > 300, bad ? `${bad} differ; the first: ${JSON.stringify(first).slice(0, 1200)}` : "");
  // the nature of a bucket drawn: by the moment, and by whether it rains then
  bad = 0; first = null;
  const seenKinds = new Set();
  for (const c of WATERS.natures) {
    await t.sql(`delete from public.town_weather`);
    await sky(c.now, c.raining ? "rain" : "cloudy");
    const got = (await one(`select town.water_kind($1::bigint) as r`, [c.now])).r;
    seenKinds.add(got);
    if (got !== c.want) { bad++; first ??= { now: c.now, raining: c.raining, want: c.want, got }; }
  }
  t.check(`water_kind: ${WATERS.natures.length} moments, each the nature the code says, every nature and none among them`, bad === 0 && same([...seenKinds].map(String).sort(), ["dawn", "moon", "null", "rain"]), bad ? `${bad} differ; the first: ${JSON.stringify(first)}` : [...seenKinds]);
  await t.sql(`delete from public.town_weather`);
  const none = (await one(`select town.water_kind($1::bigint) as r`, [Date.parse("2026-10-06T12:00:00+07:00")])).r;
  t.check("a quarter hour nobody wrote the weather of is not rain: water drawn at noon then is plain", none === null, none);
  // a row as it was, written again under a sky and a water of the well, and what is kept
  bad = 0; first = null;
  let changed = 0;
  for (const [i, c] of WATERS.kept.entries()) {
    await t.sql(`delete from public.town_weather; delete from public.town_plots where x = 136 and y = 9`);
    await sky(c.now, c.sky);
    await setWellWater(c.well);
    await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (136, 9, town.bed_of(136, 9), $1, $2::jsonb, 0)`, [c.was.soil, JSON.stringify(c.was.plant)]);
    await t.sql(`update public.town_plots set soil = $1, plant = $2::jsonb, changed = $3::bigint where x = 136 and y = 9`, [c.next.soil, JSON.stringify(c.next.plant), c.now]);
    const got = await plotNow(136, 9);
    if (!same({ soil: got.soil, plant: got.plant }, c.want)) { bad++; first ??= { case: i, sky: c.sky, well: c.well, now: c.now, want: c.want.plant, got: got.plant, next: c.next.plant }; }
    if (!same(c.want, c.next)) changed++;
  }
  t.check(`kept: ${WATERS.kept.length} rows are kept as the code keeps them, ${changed} of them otherwise than they were written`, bad === 0 && changed > 100, bad ? `${bad} differ; the first: ${JSON.stringify(first).slice(0, 1500)}` : changed);
  await t.sql(`delete from public.town_weather; delete from public.town_plots where x = 136 and y = 9`);
  await setWellWater(null);
}

/* ── the well's book: the stories of before, in a world where no water has a nature ── */

const wipe = async () => {
  await t.sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_plot_help, public.town_thanks, public.town_yard_water, public.town_yard_reach, public.town_line_water restart identity`);
  await t.sql(`delete from public.town_weather`);
  await setWellWater(null);
};
/** A line written into the deeds as the game's functions write it: the trigger reads it. */
const write = (d) => t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, doc) values ($1, to_timestamp($2::bigint / 1000.0), $3, $4, $5::numeric, $6::jsonb)`, [
  d.by, d.at, d.what,
  // (a bucket poured, drawn or handed on is named only when the story names it)
  ["pour", "yard", "ditch", "draw", "pass"].includes(d.what) ? d.can ?? null : d.what === "fill" ? d.can : d.what === "sow" ? "seedKangkong" : d.what === "fresh" ? "pumpkinSoup" : "kangkong",
  ["pour", "yard", "ditch", "pass"].includes(d.what) ? d.n : 1,
  JSON.stringify(d.what === "water" ? { tile: d.tile, with: d.can, ...(d.whose ? { whose: d.whose } : {}) } : d.what === "sow" ? { tile: d.tile, with: "seedKangkong" }
    : d.what === "ditch" ? { tile: [133, 5], bed: 0, plants: d.plants } : d.what === "pour" ? { well: 0 } : d.what === "pass" ? { to: d.to, into: d.into } : d.what === "draw" ? {} : { jar: 0 }),
]);
/** Stories of steps (lines written, the book read, the work counted), run one after another; says what differed first. */
async function run(stories, { weather = false } = {}) {
  const bad = {}, done = {};
  for (const [n, s] of stories.entries()) {
    await wipe();
    if (weather) for (const slot of s.wet) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1::bigint, 'rain', 5, 10, 1) on conflict (slot) do nothing`, [slot]);
    for (const [i, step] of s.steps.entries()) {
      let kind, got, want = step.want;
      if (step.deed) { await write(step.deed); continue; }
      if (step.book) {
        kind = "book";
        got = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [step.book.me, step.book.now])).r;
        want = { ...want, carriers: want.carriers.map((c) => ({ ...c, name: NAME[c.id] })), ...(want.water ? { water: { ...want.water, name: NAME[want.water.by] } } : {}) };
      } else if (step.helpers) {
        kind = "helpers";
        const [x, y] = step.helpers.plot.split(",").map(Number);
        got = (await one(`select town.helpers_of($1::int, $2::int, $3::uuid) as r`, [x, y, step.helpers.me])).r;
      } else {
        kind = "work";
        got = (await one(`select town.jar_work($1::int, $2::int) as r`, [step.work.from, step.work.to])).r;
      }
      done[kind] = (done[kind] ?? 0) + 1;
      if (!same(got, want)) bad[kind] ??= { story: n, step: i, ask: step[kind], want, got };
    }
    const end = { ...(await book()), help: await helpNow(), ...(await yardNow()), line: await lineNow(), kinds: await kindsNow(), wellWater: await wellWater() };
    const differs = Object.keys(s.end).filter((k) => !same(end[k], s.end[k]));
    if (differs.length) bad.end ??= { story: n, differs, want: JSON.stringify(s.end[differs[0]]).slice(0, 600), got: JSON.stringify(end[differs[0]]).slice(0, 600) };
  }
  return { bad, done };
}
{
  // (a world where no water has a nature: every story of before is to read exactly as it did)
  await t.sql(`create or replace function town.water_kind(p_at bigint) returns text language sql stable as $$ select null::text $$`);
  const stories = take(WELL.stories);
  t.section(`where no water has a nature, everything reads as before: v127's ${stories.length} stories, v130's and v132's`);
  let badBook = null, badEnd = null, books = 0;
  for (const [n, s] of stories.entries()) {
    await wipe();
    let asked = 0;
    for (let i = 0; i <= s.deeds.length; i++) {
      for (; asked < s.asks.length && s.asks[asked].after === i; asked++) {
        const a = s.asks[asked], got = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [a.me, a.now])).r;
        books++;
        if (!same(got, { ...a.want, carriers: a.want.carriers.map((c) => ({ ...c, name: NAME[c.id] })) })) badBook ??= { story: n, after: i, me: a.me, want: a.want, got };
      }
      if (i < s.deeds.length) await write(s.deeds[i]);
    }
    const end = await book(), want = { water: s.end.water, cans: s.end.cans, carriers: s.end.carriers, reach: s.end.reach };
    if (!same(end, want)) badEnd ??= { story: n, differs: Object.keys(want).filter((k) => !same(end[k], want[k])) };
    if (!same(await helpNow(), s.end.help)) badEnd ??= { story: n, differs: ["help"] };
  }
  t.check(`v127's: the book reads as it did: ${books} readings`, !badBook && books > 100, badBook ? JSON.stringify(badBook).slice(0, 1500) : "");
  t.check("v127's: at each story's end the well's water, the cans, the carriers, what was reached and who helped are what they were", !badEnd, badEnd ?? "");
  for (const [label, set] of [["v130's", CARRY.stories], ["v132's", LINE.stories]]) {
    const { bad, done } = await run(take(set));
    t.check(`${label}: the book reads as the code's does: ${done.book ?? 0} times`, !bad.book && (done.book ?? 0) > 100, bad.book ? JSON.stringify(bad.book).slice(0, 1500) : done.book);
    t.check(`${label}: what each did for the others between two rounds: ${done.work ?? 0} times`, !bad.work && (done.work ?? 0) > 20, bad.work ? JSON.stringify(bad.work).slice(0, 1500) : done.work);
    t.check(`${label}: at each story's end what is kept is what the code keeps, and no bucket has a nature`, !bad.end, bad.end ?? "");
  }
  await t.run(FILE, "v133 again, to give water its natures back");
}
{
  const stories = take(WATERS.stories);
  t.section(`${stories.length} stories over a day and a night, in the rain and out of it, some under a full moon: ${stories.reduce((n, s) => n + s.steps.length, 0)} steps`);
  const { bad, done } = await run(stories, { weather: true });
  t.check(`the book reads as the code's does, what the well's water is and whose doing among it: ${done.book ?? 0} times`, !bad.book && (done.book ?? 0) > 100, bad.book ? JSON.stringify(bad.book).slice(0, 1500) : done.book);
  t.check(`what each did for the others between two rounds: ${done.work ?? 0} times`, !bad.work && (done.work ?? 0) > 20, bad.work ? JSON.stringify(bad.work).slice(0, 1500) : done.work);
  t.check("at each story's end what is kept is what the code keeps: the nature of each bucket's water and of the well's among it", !bad.end, bad.end ?? "");
  await wipe();
}

/* ── waters, through the functions a member calls ────────────────────────── */

t.section("waters that differ: by the functions a member calls");
const HALF = 30 * MIN;
{
  await wipe();
  await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'; truncate public.town_plots, public.town_beds`);
  const DAWN = Date.parse("2026-10-06T06:00:00+07:00");
  const can = (who = U.m2, water = 8) => purse(who, 0, [{ item: "can", n: 1, water }], 100, { hand: "can" });
  /** A watering of a fresh plant of the admin's at a plot, by m2 with a plain can: what is kept. */
  const waterAt = async (x, y) => { await can(); await plant(x, y, growing(U.admin, { sown: DAWN - 2 * HOUR, guard: 0 })); const said = await call(U.m2, "town_tend", x, y); return { said, kept: (await plotNow(x, y)).plant }; };
  // the dew
  await clock(DAWN);
  await sky(DAWN, "cloudy");
  await holding(U.m1, "bucket");
  r = await call(U.m1, "town_chore", ...RIVER);
  t.check("a bucket drawn at six in the morning has the dew's nature, and nobody's hands on it", r.ok === true && same(await kindsNow(), { [`${U.m1}/bucket`]: "dawn" }) && same(await lineNow(), {}), await kindsNow());
  v = await waterAt(134, 5);
  t.check("before any is poured into the well, a watering is as it always was", v.said.ok === true && v.kept.boost === HALF && v.kept.guard === 0, v.kept);
  r = await call(U.m1, "town_chore", ...AT_WELL);
  t.check("poured into the well, it gives the well the dew's nature for half an hour, and it is the pourer's doing", r.ok === true && same(await wellWater(), { kind: "dawn", by: U.m1, until: DAWN + 30 * MIN }), await wellWater());
  r = await call(U.m2, "town_well_ranks");
  t.check("everybody's rank tells what the well's water is, which is how a page comes to show it", same(r.wellWater, { kind: "dawn", by: U.m1, until: DAWN + 30 * MIN }) && r.line === true, r);
  r = await call(U.m2, "town_well");
  t.check("…and the book: which, until when, and whose doing, by name", same(r.wellBook.water, { kind: "dawn", by: U.m1, until: DAWN + 30 * MIN, name: NAME[U.m1] }) && same(r.wellWater, { kind: "dawn", by: U.m1, until: DAWN + 30 * MIN }), r.wellBook);
  await clock(DAWN + 5 * MIN);
  v = await waterAt(135, 5);
  t.check("while the well has the dew's nature a watering does as much again: an hour of growth with a plain can", v.said.ok === true && v.kept.boost === 2 * HALF && v.kept.guard === 0, v.kept);
  t.check("…the answer has the plot as the rule made it", v.said.plot.plant.boost === HALF, v.said.plot.plant);
  await clock(DAWN + 31 * MIN);
  v = await waterAt(136, 5);
  r = await call(U.m2, "town_well");
  t.check("half an hour on the well's water is plain again, and so is a watering: neither the book nor everybody's rank says anything of it", v.kept.boost === HALF && r.wellWater === null && !("water" in r.wellBook) && (await call(U.m2, "town_well_ranks")).wellWater === null, { kept: v.kept, told: r.wellWater });
  // two bucketfuls, an hour; more of the same, longer; never past two hours from now
  await clock(DAWN + 40 * MIN);
  await holding(U.m1, "bucketIron");
  await call(U.m1, "town_chore", ...RIVER);
  await call(U.m1, "town_chore", ...AT_WELL);
  t.check("an iron bucket's two bucketfuls of dew: an hour", same(await wellWater(), { kind: "dawn", by: U.m1, until: DAWN + 100 * MIN }), await wellWater());
  await holding(U.admin, "waterYokeGreat");
  await call(U.admin, "town_chore", ...RIVER);
  await call(U.admin, "town_chore", ...AT_WELL);
  t.check("four more: kept longer, to two hours from now and no further, and it is the last pourer's doing", same(await wellWater(), { kind: "dawn", by: U.admin, until: DAWN + 160 * MIN }), await wellWater());
  // plain water changes nothing
  await clock(Date.parse("2026-10-06T07:30:00+07:00"));
  await holding(U.m1, "bucket");
  await call(U.m1, "town_chore", ...RIVER);
  t.check("a bucket drawn at half past seven is plain water", !(`${U.m1}/bucket` in await kindsNow()), await kindsNow());
  await call(U.m1, "town_chore", ...AT_WELL);
  t.check("…and poured in, changes nothing of the well's", same(await wellWater(), { kind: "dawn", by: U.admin, until: DAWN + 160 * MIN }), await wellWater());

  // the rain's
  const TEN = Date.parse("2026-10-06T10:00:00+07:00");
  await clock(TEN);
  await sky(TEN, "rain");
  await holding(U.m1, "bucket");
  await call(U.m1, "town_chore", ...RIVER);
  t.check("a bucket drawn while it rains has the rain's nature", (await kindsNow())[`${U.m1}/bucket`] === "rain", await kindsNow());
  await setWellWater({ kind: "dawn", by: U.admin, until: TEN + HOUR });
  await clock(TEN + 16 * MIN);
  await sky(TEN + 16 * MIN, "cloudy");
  await call(U.m1, "town_chore", ...AT_WELL);
  t.check("poured into a well that has the dew's, the rain's takes its place, from now", same(await wellWater(), { kind: "rain", by: U.m1, until: TEN + 46 * MIN }), await wellWater());
  v = await waterAt(134, 5);
  t.check("while the well has the rain's nature a watering does half as much again", v.kept.boost === 1.5 * HALF && v.kept.guard === 0, v.kept);

  // the moon's
  const NIGHT = WATERS.natures.find((d) => d.want === "moon").now;
  await clock(NIGHT);
  await sky(NIGHT, "clear");
  await setWellWater(null);
  await holding(U.m1, "bucket");
  await call(U.m1, "town_chore", ...RIVER);
  t.check("a bucket drawn on a night the moon is full has the moon's nature", (await kindsNow())[`${U.m1}/bucket`] === "moon", await kindsNow());
  // …handed on, it goes with the water
  await holding(U.guest, "bucket");
  r = await t.as(U.m1, `select public.town_pass($1::uuid) as r`, [U.guest]);
  t.check("handed on, the nature goes with the water", !r.error && r.rows[0].r.ok === true && (await kindsNow())[`${U.guest}/bucket`] === "moon" && same((await lineNow())[`${U.guest}/bucket`], [U.m1, U.guest]), await kindsNow());
  await call(U.guest, "town_chore", ...AT_WELL);
  t.check("poured in by whoever it was handed to: the well has the moon's nature, and it is their doing", same(await wellWater(), { kind: "moon", by: U.guest, until: NIGHT + 30 * MIN }), await wellWater());
  await can();
  await plant(135, 5, growing(U.admin, { sown: NIGHT - 2 * HOUR, guard: 0 }));
  r = await call(U.m2, "town_tend", 135, 5);
  v = (await plotNow(135, 5)).plant;
  t.check("while the well has the moon's nature a watering adds what it always did, and the plant is kept from pests for twelve hours", r.ok === true && v.boost === HALF && v.guard === NIGHT + 12 * HOUR, v);
  await can();
  await plant(136, 5, growing(U.admin, { sown: NIGHT - 2 * HOUR, guard: NIGHT + 30 * HOUR }));
  await call(U.m2, "town_tend", 136, 5);
  t.check("…a plant kept from pests for longer already is left so", (await plotNow(136, 5)).plant.guard === NIGHT + 30 * HOUR);

  // only the well takes a nature
  await clock(DAWN + 24 * HOUR);
  await sky(DAWN + 24 * HOUR, "cloudy");
  await setWellWater(null);
  await holding(U.m1, "bucket");
  await call(U.m1, "town_chore", ...RIVER);
  await plant(137, 5, growing(U.admin, { sown: DAWN + 22 * HOUR }));
  r = await call(U.m1, "town_ditch", 137, 5);
  t.check("dew poured over a bed waters like any water, and gives the well nothing", r.ok === true && Object.values(r.plots).every((p) => p.plant.boost === HALF || p.plant.boost > HALF) && r.plots["137,5"].plant.boost === HALF && same(await wellWater(), null), r.plots?.["137,5"]);
  const JAR_AT = (await one(`select town.cat('yard')->'at'->0 as at`)).at;
  await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'yard'`);
  await holding(U.m1, "bucket");
  await call(U.m1, "town_chore", ...RIVER);
  r = await call(U.m1, "town_yard_pour", ...JAR_AT);
  t.check("…nor does dew poured into the yard's jar", r.ok === true && same(await wellWater(), null), r);

  // with the heat: each adds what the watering itself added
  const ONE = Date.parse("2026-10-07T13:00:00+07:00");
  await clock(ONE);
  await sky(ONE, "clear");
  await setWellWater({ kind: "dawn", by: U.m1, until: ONE + HOUR });
  await can();
  await plant(138, 5, growing(U.admin, { sown: ONE - 2 * HOUR }));
  await call(U.m2, "town_tend", 138, 5);
  t.check("on a hot afternoon with the dew in the well, a watering has its own half hour, one for the heat and one for the dew", (await plotNow(138, 5)).plant.boost === 3 * HALF, (await plotNow(138, 5)).plant);
  r = await call(U.m1, "town_ditch", 138, 6);
  await holding(U.m1, "bucket", 1);
  await plant(138, 6, growing(U.admin, { sown: ONE - 2 * HOUR }));
  r = await call(U.m1, "town_ditch", 138, 6);
  t.check("…and so has a bucket's water poured over a bed while the well has a nature: every watering on the farm has it", r.ok === true && r.plots["138,6"].plant.boost === 3 * HALF, r.plots?.["138,6"]);

  // the trigger never undoes a watering
  await t.sql(`create or replace function town.well_water_told(p_now bigint) returns jsonb language plpgsql stable as $$ begin raise exception 'the well ran dry'; end $$`);
  await can();
  await plant(134, 6, growing(U.admin, { sown: ONE - 2 * HOUR }));
  r = await call(U.m2, "town_tend", 134, 6);
  t.check("should the rule of the well's water break, the watering is kept as it was written, and nothing fails", r.ok === true && (await plotNow(134, 6)).plant.boost === HALF && (await plotNow(134, 6)).plant.watered === ONE, r);
  await t.run(FILE, "v133 again, to put the rule right");
  t.check("the file run again leaves the well's water as it was", same(await wellWater(), { kind: "dawn", by: U.m1, until: ONE + HOUR }), await wellWater());
}

/* ── who may ─────────────────────────────────────────────────────────────── */

t.section("who may read and call what");
for (const [what, sql] of [["the nature of water drawn now", `select town.water_kind(0)`], ["the rule of the well's water", `select town.well_poured(null, 'dawn', 4, '${U.m1}'::uuid, 0)`], ["what the well's water is, by its rule", `select town.well_water_told(0)`]]) {
  r = await t.as(U.m1, sql);
  t.check(`${what} is not a member's to ask`, r.code === "42501", r);
}
r = await t.as(U.m1, `update public.town_things set doc = '{"kind": "dawn", "by": "${U.m1}", "until": 99999999999999}'::jsonb where key = 'well_water'`);
t.check("a member cannot give the well a nature by writing it", !!r.code || r.affected === 0, r);
r = await t.as(U.m1, `insert into public.town_line_water (member_id, item, hands, kind) values ('${U.m1}', 'bucket', '{}', 'moon')`);
t.check("…nor their bucket's water", r.code === "42501", r);
{
  const a = await call("anon", "town_well_ranks"), u = await call(U.unver, "town_well");
  t.check("the two functions written again are still not somebody signed out's, nor somebody's with no proved character", a.code === "42501" && u.code === "42501", [a, u]);
}

/* ── again ───────────────────────────────────────────────────────────────── */

t.section("the file a third time");
{
  const was = { kinds: await kindsNow(), line: await lineNow(), well: await wellWater(), book: await book(), texts: await texts(), rows: (await t.sql(`select key, data from public.town_catalog order by key`)).rows };
  await t.run(FILE, "v133 once more");
  t.check("run again, it changes nothing: the buckets' water, the well's, the book, every function, every row of the catalog", same(await kindsNow(), was.kinds) && same(await lineNow(), was.line) && same(await wellWater(), was.well)
    && same(await book(), was.book) && same(await texts(), was.texts) && same((await t.sql(`select key, data from public.town_catalog order by key`)).rows, was.rows));
}

t.done();
