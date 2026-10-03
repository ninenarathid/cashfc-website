/*
 * v110 — a seed in the ground: dry run in PGlite.
 *
 * The rules: every case in now/vectors-v110.json (from `TOWN_VECTORS=<this folder>/now npx vitest run
 * lib/town/db-vectors.test.ts` in the repo) is put to the SQL and must come back as the code answered it. The
 * keeping: who may tend, a plot from weeds to a picking, whose a bed is and how it lapses, what the browser's own
 * account of the hoe may cost, a pest and what it leaves, water from the river to the well to the can, and what a
 * page is told of the farm.
 *
 *   node v110.test.mjs            (RULES=0 skips the cases, for a quick look at the keeping)
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v110_a_seed_in_the_ground.sql" v110.test.mjs v110.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(110);   // (from supabase/, or from history once it has run)
const VECTORS = new URL("./now/vectors-v110.json", import.meta.url);
if (!existsSync(VECTORS)) { console.log("no now/vectors-v110.json: run `TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors.test.ts` in the repo first"); process.exit(2); }
const vectors = process.env.RULES === "0" ? [] : JSON.parse(readFileSync(VECTORS, "utf8"));

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
for (const n of [105, 106, 107, 108, 109]) await t.run(migration(n), `v${n}`);
await t.runTwice(FILE, "v110");

const CALL = {
  tool_of: "town.tool_of($1::text)", bed_of: "town.bed_of($1::int, $2::int)",
  growth: "town.growth($1::text, $2::float8, $3::int, $4::float8)", grown: "town.grown($1::jsonb, $2::bigint)",
  pest_at: "town.pest_at($1::text, $2::jsonb, $3::bigint)", see: "town.see($1::text, $2::jsonb, $3::bigint)",
  yield_of: "town.yield_of($1::text, $2::jsonb, $3::text)", owner_of: "town.owner_of($1::jsonb, $2::boolean, $3::bigint)",
  hoe: "town.hoe($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", sow: "town.sow($1::jsonb, $2::jsonb, $3::text, $4::text, $5::bigint)",
  water: "town.water($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", feed: "town.feed($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)",
  cure: "town.cure($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", pick: "town.pick($1::text, $2::jsonb, $3::jsonb, $4::boolean, $5::text, $6::bigint)",
  deed_for: "town.deed_for($1::text, $2::jsonb, $3::text, $4::text, $5::bigint, $6::text)",
  tend: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint)",
  chore_for: "town.chore_for($1::jsonb, $2::text, $3::int)", chore: "town.chore($1::jsonb, $2::text, $3::int, $4::bigint)",
};
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

t.section(`the rules: ${vectors.length} cases, each as the site's own code answers it`);
const tally = new Map();
for (const v of vectors) {
  let got, error = null;
  try { got = (await t.db.query(`select ${CALL[v.fn]} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
  if (typeof got === "bigint") got = Number(got);
  const ok = !error && same(got ?? null, v.want);
  const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  row.n++;
  if (!ok) { row.bad++; row.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  tally.set(v.fn, row);
}
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1800)}` : "");

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, (select count(*) from jsonb_object_keys(data))::int as n from public.town_catalog where key in ('crops', 'farming') order by key`);
t.check("the two documents it seeds", v.rows.map((r) => `${r.key} ${r.n}`).join(", ") === "crops 26, farming 22", v.rows);
v = await t.sql(`select doc from public.town_things where key = 'well'`);
t.check("the well is there, and empty", v.rows.length === 1 && v.rows[0].doc === 0, v.rows);
v = await t.sql(`select c.relname, c.relrowsecurity from pg_class c where c.oid in ('public.town_plots'::regclass, 'public.town_beds'::regclass) order by 1`);
t.check("both tables have row security on", v.rows.length === 2 && v.rows.every((r) => r.relrowsecurity === true), v.rows);
v = await t.sql(`select count(*)::int as n from information_schema.role_table_grants where table_schema = 'public' and table_name in ('town_plots', 'town_beds') and grantee in ('anon', 'authenticated')`);
t.check("…and nothing granted to a browser", v.rows[0].n === 0, v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
                        count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member
                   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_farm', 'town_tend', 'town_chore')`);
t.check("the three functions a browser calls: members only", v.rows[0].anon === 0 && v.rows[0].member === 3, v.rows);
v = await t.sql(`select town.bed_of(132, 4) as first, town.bed_of(183, 39) as last, town.bed_of(156, 23) as the_well`);
t.check("the first bed, the last, and the well, which is no plot", v.rows[0].first === 0 && v.rows[0].last === 23 && v.rows[0].the_well === -1, v.rows);
v = await t.sql(`select town.growth('kangkong', 6, 0, 0)->>'ripe' as ripe, town.growth('kangkong', 5.9, 0, 0)->>'stage' as stage`);
t.check("morning glory is ripe at six hours, and half grown just before", v.rows[0].ripe === "true" && v.rows[0].stage === "4", v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
                        (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const HOUR = 3_600_000;
// 08:00 in Bangkok: the first of the day's pest hours
const MORNING = Date.parse("2026-10-05T08:00:00+07:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
let NOW = MORNING;
const clock = async (ms) => { NOW = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
/** Give a member a purse with these things in its first slots, that one in the hand, and so much stamina left today. */
const purse = async (who, stacks, hand = null, left = 80) => {
  const bag = [...stacks, null, null, null, null, null].slice(0, Math.max(5, stacks.length));
  await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'hand', $3::text,
                 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)))
               on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify(bag), hand, left]);
};
const hold = async (who, item) => { await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text) where member_id = $1`, [who, item]); };
const docOf = async (who) => (await t.sql(`select doc from public.town_purses where member_id = $1`, [who])).rows[0].doc;
const staminaOf = async (who) => (await docOf(who)).stamina.left;
const heldIn = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const plotAt = async (x, y) => (await t.sql(`select bed, soil, plant, changed from public.town_plots where x = $1 and y = $2`, [x, y])).rows[0] ?? null;
const bedRow = async (bed) => (await t.sql(`select member_id, tended, empty from public.town_beds where bed = $1`, [bed])).rows[0] ?? null;
const plays = async (who) => (await t.sql(`select game, won, secs, spent, buff, doc from public.town_plays where member_id = $1 and game = 'farming' order by id`, [who])).rows;
const wellNow = async () => (await t.sql(`select doc from public.town_things where key = 'well'`)).rows[0].doc;
const big = (n) => (typeof n === "bigint" ? Number(n) : Number(n));

t.section("who may come to the farm");
for (const [who, name] of [["anon", "anon"], [U.unver, "an unproved character"], [U.nochar, "an account with no character"]]) {
  let r = await t.as(who, `select public.town_farm(0) as r`);
  t.check(`${name} may not look at the farm`, r.code === "42501", r);
  r = await t.as(who, `select public.town_tend(132, 4, null) as r`);
  t.check(`…nor tend a plot`, r.code === "42501", r);
  r = await t.as(who, `select public.town_chore(155, 23) as r`);
  t.check(`…nor carry water`, r.code === "42501", r);
}
for (const table of ["town_plots", "town_beds"]) {
  for (const [who, name] of [["anon", "anon"], [U.m1, "a member"]]) {
    const r = await t.as(who, `select * from public.${table} limit 1`);
    t.check(`${name} cannot read ${table}`, r.code === "42501", r);
  }
  const w = await t.as(U.m1, table === "town_plots"
    ? `insert into public.town_plots (x, y, bed, soil, changed) values (132, 4, 0, 'tilled', 0)`
    : `insert into public.town_beds (bed, member_id, tended) values (0, '${U.m1}', 0)`);
  t.check(`a member cannot write ${table}`, w.code === "42501", w);
}
let r = await t.as(U.m1, `update public.town_things set doc = '40'::jsonb where key = 'well'`);
t.check("nor fill the well by hand", r.code === "42501" && (await wellNow()) === 0, r);
r = await t.as(U.m1, `select town.tend('132,4', '{"soil":"wild","plant":null}'::jsonb, null, 0, 0, town.fresh(), 'x', 0)`);
t.check("nor call a rule itself", r.code === "42501", r);

t.section("a plot: from weeds to tilled soil");
await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 3 }, { item: "guardFert", n: 2 }], "hoe");
await purse(U.m2, [{ item: "hoe", n: 1 }, { item: "seedCabbage", n: 2 }, { item: "can", n: 1, water: 2 }], "hoe");
r = await call(U.m1, "town_tend", 131, 4, null);
t.check("a tile that is no plot is not tended", r.ok === false && r.why === "none" && (await plotAt(131, 4)) === null, r);
r = await call(U.m1, "town_tend", null, null, null);
t.check("nor is no tile at all", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_tend", 2000000000, -2000000000, null);
t.check("nor one far off the map", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_tend", 132, 4, { hits: 3, misses: 2, secs: 4.2, need: 3, more: "x".repeat(50) });
t.check("the hoe clears the weeds", r.ok === true && r.deed === "clear" && r.key === "132,4" && r.plot.soil === "cleared" && r.plot.plant === null && r.bed === null, r);
t.check("…for its stamina, and one more for every miss the browser owns to", r.purse.stamina.left === 80 - 4 - 2 && r.misses === 2, r.purse.stamina);
let row = await plotAt(132, 4);
t.check("…and the plot is kept, in its bed, dated by the town's clock", row?.soil === "cleared" && row.plant === null && row.bed === 0 && big(row.changed) === MORNING, row);
let p = await plays(U.m1);
t.check("the go is written down: what was done, where, what it wanted, and only three numbers of what the browser said",
  p.length === 1 && p[0].won === true && Math.abs(p[0].secs - 4.2) < 1e-6 && p[0].spent === false
  && same(p[0].doc, { what: "clear", tile: [132, 4], need: 3, misses: 2, claims: { hits: 3, misses: 2, secs: 4.2 } }), p);
r = await call(U.m1, "town_tend", 132, 4, { hits: 3, misses: 9999, secs: -5 });
t.check("it tills what is cleared; of ten thousand misses thirty are counted", r.ok === true && r.deed === "till" && r.plot.soil === "tilled" && r.misses === 30 && r.purse.stamina.left === 74 - 4 - 30, r);
p = await plays(U.m1);
t.check("…and the record keeps what was said within bounds", p.length === 2 && p[1].secs === 0 && same(p[1].doc.claims, { hits: 3, misses: 1000, secs: 0 }), p[1]);
r = await call(U.m1, "town_tend", 132, 4, null);
t.check("a hoe does nothing more to tilled soil, and nothing is spent", r.ok === false && r.why === "soil" && r.purse.stamina.left === 40 && r.plot.soil === "tilled", r);
r = await call(U.m1, "town_tend", 133, 4, { misses: -8, hits: "three", secs: null });
t.check("misses below nothing cost nothing, and what is no number is not kept", r.ok === true && r.misses === 0 && r.purse.stamina.left === 36
  && same((await plays(U.m1))[2].doc.claims, { hits: null, misses: 0, secs: null }), r);
r = await call(U.m1, "town_tend", 134, 4, JSON.stringify("not a document"));
t.check("an account that is no document is no account", r.ok === true && r.misses === 0 && same((await plays(U.m1))[3].doc.claims, { hits: null, misses: null, secs: null }), r);

await call(U.m1, "town_tend", 133, 4, null);
t.check("a second plot of the bed is tilled too", (await plotAt(133, 4))?.soil === "tilled" && (await plays(U.m1)).length === 5);

t.section("a seed, and whose the bed is");
await hold(U.m1, "seedKangkong");
r = await call(U.m1, "town_farm", 0);
t.check("before anything is sown no bed is anybody's", same(r.beds, {}) && Object.keys(r.plots).length === 3, r);
r = await call(U.m1, "town_tend", 132, 4, null);
t.check("a seed goes into tilled soil", r.ok === true && r.deed === "sow" && r.plot.plant?.crop === "kangkong" && r.plot.plant.by === U.m1 && r.plot.plant.sown === MORNING
  && heldIn(r.purse.bag, "seedKangkong") === 2, r);
t.check("…and the bed is the sower's, under their character's name", r.bed?.by === U.m1 && r.bed.name === "Member One" && r.bed.tended === MORNING && r.bed.empty === 0, r.bed);
t.check("sowing is no game, and no go is written for it", (await plays(U.m1)).length === 5);
r = await call(U.m2, "town_tend", 135, 5, null);
t.check("another's hoe is refused in that bed", r.ok === false && r.why === "theirs" && (await plotAt(135, 5)) === null && (await staminaOf(U.m2)) === 80, r);
await hold(U.m2, "seedCabbage");
r = await call(U.m2, "town_tend", 133, 4, null);
t.check("…and so is another's seed, in soil the owner tilled", r.ok === false && r.why === "theirs" && heldIn((await docOf(U.m2)).bag, "seedCabbage") === 2, r);
await hold(U.m2, "can");
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("anybody may water it: half an hour of growth, and a watering less in the can", r.ok === true && r.deed === "water" && r.plot.plant.boost === 1_800_000 && r.plot.plant.watered === MORNING
  && r.purse.bag[2].water === 1, r);
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("not twice in an hour", r.ok === false && r.purse.bag[2].water === 1, r);
await clock(MORNING + HOUR);
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("an hour on, again", r.ok === true && r.plot.plant.boost === 3_600_000 && r.purse.bag[2].water === 0, r);
t.check("…which leaves the bed its owner's, and not tended by the one who helped", (await bedRow(0))?.member_id === U.m1 && big((await bedRow(0)).tended) === MORNING, await bedRow(0));
await clock(MORNING + 2 * HOUR);
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("an empty can waters nothing", r.ok === false && r.why === "dry" && (await plotAt(132, 4)).plant.boost === 3_600_000, r);

t.section("no more beds than one may hold");
await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 5 }, { item: "guardFert", n: 2 }], "hoe", 100);
for (const [x, y] of [[140, 4], [148, 4]]) { await call(U.m1, "town_tend", x, y, null); await call(U.m1, "town_tend", x, y, null); }
await hold(U.m1, "seedKangkong");
r = await call(U.m1, "town_tend", 140, 4, null);
t.check("a second bed is taken by sowing in it", r.ok === true && r.deed === "sow" && (await bedRow(1))?.member_id === U.m1, r);
r = await call(U.m1, "town_tend", 148, 4, null);
t.check("a third is refused, and the seed is kept", r.ok === false && r.why === "beds" && (await bedRow(2)) === null && heldIn(r.purse.bag, "seedKangkong") === 4 && (await plotAt(148, 4)).plant === null, r);
await hold(U.m2, "seedCabbage");
r = await call(U.m2, "town_tend", 148, 4, null);
t.check("soil somebody else tilled in a free bed is anybody's to sow, and the bed the sower's", r.ok === true && r.bed?.by === U.m2 && r.bed.name === "Member Two", r);

t.section("growing, by the town's clock");
await clock(MORNING + 2 * HOUR + 60_000);
await hold(U.m1, "guardFert");
r = await call(U.m1, "town_tend", 132, 4, null);
t.check("fertiliser against pests covers a plant for a day", r.ok === true && r.deed === "feed" && r.plot.plant.guard === NOW + 24 * HOUR && heldIn(r.purse.bag, "guardFert") === 1, r);
r = await call(U.m1, "town_tend", 132, 4, null);
t.check("…and is not put on twice", r.ok === false && r.why === "soil" && heldIn(r.purse.bag, "guardFert") === 1, r);
await hold(U.m1, null);
r = await call(U.m1, "town_tend", 132, 4, null);
t.check("an unripe plant is not picked", r.ok === false && r.why === "soil", r);
// sown at 08:00, watered twice (an hour of growth): ripe five hours on
await clock(MORNING + 5 * HOUR - 1);
v = await t.sql(`select town.see('132,4', jsonb_build_object('soil', soil, 'plant', plant), town.now_ms()) as s from public.town_plots where x = 132 and y = 4`);
t.check("a millisecond short of its hours it is half grown", v.rows[0].s.stage === 4 && v.rows[0].s.ripe === false, v.rows[0].s);
await clock(MORNING + 5 * HOUR);
v = await t.sql(`select town.see('132,4', jsonb_build_object('soil', soil, 'plant', plant), town.now_ms()) as s from public.town_plots where x = 132 and y = 4`);
t.check("at its hours it is ripe: the two waterings brought it an hour sooner", v.rows[0].s.stage === 5 && v.rows[0].s.ripe === true && v.rows[0].s.dead === false, v.rows[0].s);
await hold(U.m2, null);
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("not for somebody else to pick", r.ok === false && r.why === "theirs" && (await plotAt(132, 4)).plant.picked === 0, r);
const before = await docOf(U.m1);
r = await call(U.m1, "town_tend", 132, 4, null);
const n1 = heldIn(r.purse?.bag ?? [], "kangkong");
t.check("its owner picks it: two or three, into the bag", r.ok === true && r.deed === "pick" && same(r.got, [["kangkong", n1]]) && (n1 === 2 || n1 === 3) && r.purse.stamina.left === before.stamina.left - 2, r);
t.check("…and one that bears again stays, picked once", r.plot.plant?.picked === 1 && r.plot.plant.pickedAt === NOW && r.plot.plant.watered === 0, r.plot);
r = await call(U.m1, "town_tend", 132, 4, null);
t.check("it is not ripe again at once", r.ok === false && r.why === "soil", r);
await clock(NOW + 12 * HOUR);
await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "pebble", n: 1 }, { item: "pebble", n: 1 }, { item: "pebble", n: 1 }, { item: "pebble", n: 1 }], null, 100);
r = await call(U.m1, "town_tend", 132, 4, null);
t.check("twelve hours on it is, but a full bag picks nothing", r.ok === false && r.why === "full" && (await plotAt(132, 4)).plant.picked === 1 && r.purse.stamina.left === 100, r);

t.section("a pest, and what it leaves");
// a plot of the first bed with a plant a pest struck at 08:00, found by asking the rule
const struck = (await t.sql(`
  select x, y from generate_series(133, 138) x, generate_series(5, 10) y
   where town.pest_at(x || ',' || y, jsonb_build_object('by', '${U.m1}', 'crop', 'pumpkin', 'sown', ${MORNING} - 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0),
           ${MORNING}::bigint + 9 * 3600000) = ${MORNING}::bigint + 3 * 3600000 limit 1`)).rows[0];
t.check("somewhere in the bed a pest strikes a pumpkin at eleven", !!struck, struck);
const [sx, sy] = [struck.x, struck.y], T0 = MORNING + 3 * HOUR;
const sick = { by: U.m1, crop: "pumpkin", sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
const plant = async (x, y, doc, bed = 0) => { await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', $4::jsonb, 0)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant`, [x, y, bed, JSON.stringify(doc)]); };
await plant(sx, sy, sick);
await t.sql(`update public.town_beds set tended = ${T0} where bed = 0`);
await clock(T0 + HOUR);
await purse(U.m2, [{ item: "pestCure", n: 2 }, { item: "hoe", n: 1 }], "pestCure");
r = await call(U.m2, "town_tend", sx, sy, null);
t.check("anybody may cure it while it lives", r.ok === true && r.deed === "cure" && r.plot.plant.cured === NOW && heldIn(r.purse.bag, "pestCure") === 1, r);
r = await call(U.m2, "town_tend", sx, sy, null);
t.check("a plant with no pest takes no cure", r.ok === false && heldIn(r.purse.bag, "pestCure") === 1, r);
await plant(sx, sy, sick);
await clock(T0 + 6 * HOUR + 1);
r = await call(U.m2, "town_tend", sx, sy, null);
t.check("left more than six hours it is dead, and past curing", r.ok === false && heldIn(r.purse.bag, "pestCure") === 1, r);
await hold(U.m2, "hoe");
r = await call(U.m2, "town_tend", sx, sy, null);
t.check("only the bed's owner pulls it up", r.ok === false && r.why === "theirs" && (await plotAt(sx, sy)).plant !== null, r);
await purse(U.m1, [{ item: "hoe", n: 1 }], "hoe", 100);
r = await call(U.m1, "town_tend", sx, sy, { misses: 5 });
t.check("pulled up, it leaves compost and cleared ground; pulling is no game, and its misses cost nothing",
  r.ok === true && r.deed === "pull" && same(r.got, [["compost", 1]]) && r.plot.soil === "cleared" && r.plot.plant === null && r.purse.stamina.left === 98 && r.misses === 0, r);

t.section("a bed that lapses");
// bed 1 has one plant of the first member's, sown at 10:00 on the first day, never tended since
const day5 = MORNING + 2 * HOUR + 96 * HOUR;
await clock(day5);
await purse(U.guest, [{ item: "seedCabbage", n: 2 }, { item: "hoe", n: 1 }], "hoe");
r = await call(U.guest, "town_tend", 141, 4, null);
t.check("four days untended to the hour, it is still its owner's", r.ok === false && r.why === "theirs", r);
await clock(day5 + HOUR);
r = await call(U.guest, "town_tend", 141, 4, null);
t.check("past that it is anybody's: a stranger's hoe is let in", r.ok === true && r.deed === "clear" && r.bed === null, r);
t.check("…and its keeping is dropped", (await bedRow(1)) === null);
v = await t.sql(`select count(*)::int as n from public.town_plots where bed = 1 and plant is not null`);
t.check("…though what grows there stays", v.rows[0].n === 1, v.rows);
// bed 2 is the second member's, with one cabbage; picked, the bed stands empty, and a day later is free
await plant(148, 4, { by: U.m2, crop: "cabbage", sown: NOW - 30 * HOUR, boost: 0, watered: 0, fed: 0, guard: NOW + HOUR, cured: 0, picked: 0, pickedAt: 0 }, 2);
await t.sql(`update public.town_beds set tended = ${NOW} - 3600000 where bed = 2`);
await purse(U.m2, [{ item: "hoe", n: 1 }], null, 100);
r = await call(U.m2, "town_tend", 148, 4, null);
t.check("the last plant picked, the bed stands empty from that moment", r.ok === true && r.deed === "pick" && r.plot.soil === "cleared" && r.bed?.empty === NOW && r.bed.tended === NOW, r);
const emptied = NOW;
await clock(emptied + 24 * HOUR);
await hold(U.guest, "hoe");
r = await call(U.guest, "town_tend", 149, 4, null);
t.check("a day empty to the hour, still its owner's", r.ok === false && r.why === "theirs", r);
await clock(emptied + 24 * HOUR + 1);
r = await call(U.guest, "town_tend", 149, 4, null);
t.check("a millisecond more, and it is free", r.ok === true && r.deed === "clear" && (await bedRow(2)) === null, r);
// the first member holds bed 0, and two that have lapsed: one whose keeping was dropped, one whose keeping is still there
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (5, '${U.m1}', ${NOW} - 200 * 3600000::bigint, ${NOW} - 100 * 3600000::bigint)`);
await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 2 }], "hoe", 100);
await call(U.m1, "town_tend", 161, 4, null);
await call(U.m1, "town_tend", 161, 4, null);
await hold(U.m1, "seedKangkong");
await t.sql(`update public.town_beds set tended = ${NOW} where bed = 0`);
r = await call(U.m1, "town_tend", 161, 4, null);
t.check("a bed that has lapsed no longer counts against the two", r.ok === true && r.deed === "sow" && r.bed?.by === U.m1, r);
await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 2 }], "hoe", 100);
await call(U.m1, "town_tend", 169, 4, null);
await call(U.m1, "town_tend", 169, 4, null);
await hold(U.m1, "seedKangkong");
r = await call(U.m1, "town_tend", 169, 4, null);
t.check("…but two that are held do", r.ok === false && r.why === "beds", r);

t.section("water: from the river, to the well, to the can");
await purse(U.m1, [{ item: "bucket", n: 1 }, { item: "can", n: 1 }], "bucket", 50);
r = await call(U.m1, "town_chore", 100, 5);
t.check("nowhere near water there is nothing to do", r.ok === false && r.why === "none" && r.purse.stamina.left === 50, r);
r = await call(U.m1, "town_chore", null, null);
t.check("nor nowhere at all", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_chore", 155, 23);
t.check("an empty bucket pours nothing into the well", r.ok === false && r.why === "none" && r.well === 0, r);
r = await call(U.m1, "town_chore", 16, 38);
t.check("at the river's bank the bucket is drawn full", r.ok === true && r.chore === "draw" && r.purse.bag[0].water === 1 && r.purse.stamina.left === 48 && r.well === 0, r);
r = await call(U.m1, "town_chore", 16, 38);
t.check("a full bucket draws no more", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_chore", 157, 24);
t.check("beside the well it is poured in", r.ok === true && r.chore === "pour" && r.well === 1 && r.purse.bag[0].water === undefined && r.purse.stamina.left === 47 && (await wellNow()) === 1, r);
await hold(U.m1, "can");
r = await call(U.m1, "town_chore", 156, 23);
t.check("standing in the well is not standing beside it", r.ok === false && r.why === "none" && (await wellNow()) === 1, r);
r = await call(U.m1, "town_chore", 156, 22);
t.check("a can is filled for one bucket of the well's water", r.ok === true && r.chore === "fill" && r.purse.bag[1].water === 8 && r.well === 0 && (await wellNow()) === 0, r);
r = await call(U.m1, "town_chore", 156, 22);
t.check("a full can takes no more", r.ok === false && r.why === "none", r);
await purse(U.m2, [{ item: "can", n: 1, water: 3 }, { item: "bucketIron", n: 1, water: 2 }], "can", 50);
r = await call(U.m2, "town_chore", 155, 22);
t.check("a dry well fills nothing, and nothing is spent", r.ok === false && r.why === "dry" && r.purse.bag[0].water === 3 && r.purse.stamina.left === 50, r);
await t.sql(`update public.town_things set doc = '39'::jsonb where key = 'well'`);
await hold(U.m2, "bucketIron");
r = await call(U.m2, "town_chore", 155, 22);
t.check("a well nearly full takes what it has room for; the rest stays in the bucket", r.ok === true && r.chore === "pour" && r.well === 40 && r.purse.bag[1].water === 1 && (await wellNow()) === 40, r);
r = await call(U.m2, "town_chore", 155, 22);
t.check("a full well takes none", r.ok === false && r.why === "none" && (await wellNow()) === 40 && r.purse.bag[1].water === 1, r);

t.section("what a page is told of the farm");
await clock(NOW + 20_000);
r = await call(U.guest, "town_farm", 0);
const told = Object.keys(r.plots).length;
v = await t.sql(`select count(*)::int as n from public.town_plots`);
t.check("every plot that is no longer weeds, as the code's own Plot", told === v.rows[0].n && told >= 9 && same(Object.keys(r.plots["132,4"]).sort(), ["plant", "soil"]) && r.plots["132,4"].plant.crop === "kangkong", Object.keys(r.plots));
t.check("…the beds by their number, each with its owner's character's name; the well; the moment",
  r.beds["0"]?.by === U.m1 && r.beds["0"].name === "Member One" && Object.values(r.beds).every((b) => typeof b.name === "string" && typeof b.tended === "number") && r.well === 40 && r.now === NOW, r.beds);
t.check("…and nothing of anybody's purse", !("purse" in r), Object.keys(r));
const since = r.now;
await clock(NOW + 60_000);
await purse(U.guest, [{ item: "hoe", n: 1 }], "hoe");
await call(U.guest, "town_tend", 177, 33, null);
r = await call(U.guest, "town_farm", since);
t.check("asked for what is new since then, only what changed", same(Object.keys(r.plots), ["177,33"]) && r.plots["177,33"].soil === "cleared" && "0" in r.beds && r.well === 40, Object.keys(r.plots));
r = await call(U.guest, "town_farm", NOW + 9_000);
t.check("what changed a few seconds before the moment asked from is told again: a deed done as the last answer was read is never missed", same(Object.keys(r.plots), ["177,33"]), Object.keys(r.plots));
r = await call(U.guest, "town_farm", NOW + 10_000);
t.check("…and past that, nothing", same(r.plots, {}), Object.keys(r.plots));
await clock(NOW + 30_000);
await call(U.guest, "town_tend", 177, 33, null);
r = await call(U.guest, "town_farm", NOW);
t.check("a plot that changes again is new again", same(Object.keys(r.plots), ["177,33"]) && r.plots["177,33"].soil === "tilled", r.plots);
r = await call(U.guest, "town_farm", null);
t.check("asked with nothing, all of it", Object.keys(r.plots).length === told + 1, Object.keys(r.plots).length);
t.check("…with every bed that is kept", same(Object.keys(r.beds).sort(), ["0", "3", "5"]), r.beds);
await t.sql(`update public.profiles set character_name = null, display_name = 'Shown Name' where id = '${U.m1}'`);
r = await call(U.guest, "town_farm", 0);
t.check("a bed is called what its owner is called now", r.beds["0"].name === "Shown Name", r.beds["0"]);

t.section("an account that is closed");
v = await t.sql(`select count(*)::int as n from public.town_beds where member_id = '${U.m1}'`);
const had = v.rows[0].n;
await t.sql(`delete from auth.users where id = '${U.m1}'`);
v = await t.sql(`select count(*)::int as beds, (select count(*)::int from public.town_plots where plant->>'by' = '${U.m1}') as plants from public.town_beds where member_id = '${U.m1}'`);
t.check("its beds are nobody's; what it sowed stays in the ground for whoever comes", had >= 1 && v.rows[0].beds === 0 && v.rows[0].plants >= 1, v.rows);
r = await call(U.guest, "town_farm", 0);
t.check("…and the farm is still told", r.well === 40 && !("0" in r.beds), r.beds);

t.section("running it again keeps what an admin changed");
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{well}', '60') where key = 'farming'`);
await t.run(FILE, "v110 a third time");
v = await t.sql(`select data->>'well' as well, (select doc from public.town_things where key = 'well') as holds, (select count(*)::int from public.town_plots) as plots from public.town_catalog where key = 'farming'`);
t.check("a number changed in the catalog is not put back, the well is not emptied, and no plot is lost", v.rows[0].well === "60" && v.rows[0].holds === 40 && v.rows[0].plots === told + 1, v.rows);

await t.done();
