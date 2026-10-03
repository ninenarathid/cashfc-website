/*
 * v108 — a line in the water: dry run in PGlite.
 *
 * The rules: every case in vectors-v108.json (from `TOWN_VECTORS=<this folder> npx vitest run
 * lib/town/db-vectors.test.ts` in the repo) is put to the SQL and must come back as the code answered it. The
 * keeping: who may drop a line, what a cast tells and what it keeps to itself, the strike by the database's clock,
 * a landing believed or not, what is no fish, a snapped line, a full bag, and the record of every go.
 *
 *   node v108.test.mjs
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v108_a_line_in_the_water.sql" v108.test.mjs v108.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(108);   // (from supabase/, or from history once it has run)
const VECTORS = new URL("./vectors-v108.json", import.meta.url);
if (!existsSync(VECTORS)) { console.log("no vectors-v108.json: run `TOWN_VECTORS=<this folder> npx vitest run lib/town/db-vectors.test.ts` in the repo first"); process.exit(2); }
const vectors = JSON.parse(readFileSync(VECTORS, "utf8"));

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
await t.run(migration(105), "v105");
await t.run(migration(106), "v106");
await t.run(migration(107), "v107");
await t.runTwice(FILE, "v108");

const RND = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($6::jsonb) with ordinality as e(x, ord))";
const CALL = {
  odds: "town.odds($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean)",
  cast_line: `town.cast_line($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${RND})`,
  hook_bait: "town.hook_bait($1::jsonb, $2::text)", lose_bait: "town.lose_bait($1::jsonb, $2::text)",
  land_catch: "town.land_catch($1::jsonb, $2::text, $3::float8)", strike_window: "town.strike_window($1::jsonb, $2::bigint)",
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
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1400)}` : "");

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, (select count(*) from jsonb_object_keys(data))::int as n from public.town_catalog where key in ('fish', 'flotsam', 'fishing') order by key`);
t.check("the three documents it seeds", v.rows.map((r) => `${r.key} ${r.n}`).join(", ") === "fish 32, fishing 15, flotsam 6", v.rows);
v = await t.sql(`select (select count(*) from jsonb_object_keys(data->'places'))::int as places,
                        (select count(*) from jsonb_each(data->'places') p where p.value = 'true'::jsonb)::int as deep from public.town_catalog where key = 'fishing'`);
t.check("seventy-two places to drop a line from, twenty-two of them over deep water", v.rows[0].places === 72 && v.rows[0].deep === 22, v.rows);
v = await t.sql(`select c.relname, c.relrowsecurity from pg_class c where c.oid in ('public.town_lines'::regclass, 'public.town_plays'::regclass) order by 1`);
t.check("both tables have row security on", v.rows.length === 2 && v.rows.every((r) => r.relrowsecurity === true), v.rows);
v = await t.sql(`select count(*)::int as n from information_schema.role_table_grants where table_schema = 'public' and table_name in ('town_lines', 'town_plays') and grantee in ('anon', 'authenticated')`);
t.check("…and nothing granted to a browser", v.rows[0].n === 0, v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
                        count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member
                   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_cast', 'town_strike', 'town_land', 'town_line')`);
t.check("the four functions a browser calls: members only", v.rows[0].anon === 0 && v.rows[0].member === 4, v.rows);
v = await t.sql(`select jsonb_array_length(town.odds('worm', 12, false, false, false))::int as n, has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
                        (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("five things bite on a worm at noon", v.rows[0].n === 5, v.rows);
t.check("the rules are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const NOON = Date.parse("2026-10-05T12:00:00+07:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = async (ms) => { await t.sql(`update town.test_clock set ms = ${ms}`); };
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
/** Give a member a purse with these things in its first slots and so much stamina left today. */
const purse = async (who, stacks, left = 50) => {
  const bag = [...stacks, null, null, null, null, null].slice(0, 5);
  await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::int)))
               on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify(bag), left]);
};
/** A line as if it had been dropped at noon: what is on its way, and when. */
const line = (what, size, more = {}) => ({ what, size, wait: 20, nibbles: [8], bait: "worm", x: 16, y: 38, deep: true, hour: 12, rain: false, cast_at: NOON, bites_at: NOON + 20_000, struck_at: null, ...more });
const setLine = async (who, doc) => { await t.sql(`insert into public.town_lines (member_id, doc) values ($1, $2::jsonb) on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify(doc)]); };
const lineOf = async (who) => (await t.sql(`select doc from public.town_lines where member_id = $1`, [who])).rows[0]?.doc ?? null;
const plays = async (who) => (await t.sql(`select game, won, secs, spent, doc from public.town_plays where member_id = $1 order by id`, [who])).rows;
const bagOf = async (who) => (await t.sql(`select doc->'bag' as bag from public.town_purses where member_id = $1`, [who])).rows[0].bag;
const heldIn = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);

t.section("who may drop a line");
for (const [who, name] of [["anon", "anon"], [U.unver, "an unproved character"], [U.nochar, "an account with no character"]]) {
  let r = await t.as(who, `select public.town_cast('worm', 16, 38, false) as r`);
  t.check(`${name} may not cast`, r.code === "42501", r);
  r = await t.as(who, `select public.town_strike(null) as r`);
  t.check(`…nor strike`, r.code === "42501", r);
  r = await t.as(who, `select public.town_land('left', null) as r`);
  t.check(`…nor land`, r.code === "42501", r);
  r = await t.as(who, `select public.town_line() as r`);
  t.check(`…nor ask after a line`, r.code === "42501", r);
}
for (const table of ["town_lines", "town_plays"]) {
  for (const [who, name] of [["anon", "anon"], [U.m1, "a member"]]) {
    const r = await t.as(who, `select * from public.${table} limit 1`);
    t.check(`${name} cannot read ${table}`, r.code === "42501", r);
  }
  const w = await t.as(U.m1, table === "town_lines" ? `insert into public.town_lines (member_id, doc) values ('${U.m1}', '{"what":"koi"}')` : `insert into public.town_plays (member_id, game, won) values ('${U.m1}', 'fishing', true)`);
  t.check(`a member cannot write ${table}`, w.code === "42501", w);
}

t.section("a cast");
await purse(U.m1, [{ item: "rod", n: 1 }, { item: "worm", n: 4 }]);
await purse(U.m2, [{ item: "worm", n: 3 }]);
let r = await call(U.m1, "town_cast", "worm", 5, 5, false);
t.check("not from a tile no line can be dropped from", r.ok === false && r.why === "none" && heldIn(r.purse.bag, "worm") === 4, r);
r = await call(U.m1, "town_cast", "rod", 16, 38, false);
t.check("a rod is no bait", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_cast", "worm'; drop table x", 16, 38, false);
t.check("nor is anything that is not a word", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_cast", null, 16, 38, false);
t.check("nor nothing", r.ok === false && r.why === "none", r);
r = await call(U.m2, "town_cast", "worm", 16, 38, false);
t.check("without a rod there is no casting, and the bait is kept", r.ok === false && r.why === "tool" && heldIn(await bagOf(U.m2), "worm") === 3, r);
t.check("…and no line is out", (await lineOf(U.m2)) === null);
r = await call(U.m1, "town_cast", "worm", 16, 38, false);
let kept = await lineOf(U.m1);
t.check("a cast takes a bait and answers when the float will go under, and when it twitches before", r.ok === true && Number.isInteger(r.line.wait) && r.line.wait > 0 && Array.isArray(r.line.nibbles)
  && heldIn(r.purse.bag, "worm") === 3, r);
t.check("…and never what is on its way", same(Object.keys(r.line).sort(), ["nibbles", "wait"]) && !JSON.stringify(r).includes(kept.what) , { answer: r.line, kept: kept.what });
t.check("the database keeps the rest: what will take it, how long it is, when it bites, from where", typeof kept.what === "string" && kept.bait === "worm" && kept.deep === true && kept.hour === 12
  && kept.cast_at === NOON && kept.bites_at === NOON + kept.wait * 1000 && kept.struck_at === null && kept.wait === r.line.wait && same(kept.nibbles, r.line.nibbles), kept);
r = await call(U.m1, "town_line");
t.check("a page loaded again can ask after its line, and is told no more", r.now === NOON && r.line.bait === "worm" && r.line.wait === kept.wait && r.line.struck_at === null && r.line.what === undefined && r.line.size === undefined, r);
r = await call(U.m1, "town_cast", "worm", 16, 39, false);
v = await t.sql(`select count(*)::int as n from public.town_lines where member_id = $1`, [U.m1]);
t.check("another cast gives the first line up: one line to a member, and another bait gone", r.ok === true && v.rows[0].n === 1 && heldIn(r.purse.bag, "worm") === 2 && (await lineOf(U.m1)).y === 39, { r, n: v.rows });
r = await call(U.m1, "town_cast", "worm", 0, 23, true);
kept = await lineOf(U.m1);
t.check("from the bank the water is shallow, and the rain is the browser's word", r.ok === true && kept.deep === false && kept.rain === true, kept);
await purse(U.m2, [{ item: "rod", n: 1 }, { item: "dough", n: 20 }, { item: "dough", n: 20 }, { item: "dough", n: 20 }]);
const fromBank = new Set();
for (let i = 0; i < 60; i++) { await call(U.m2, "town_cast", "dough", 0, 23, false); fromBank.add((await lineOf(U.m2)).what); }
v = await t.sql(`select coalesce(jsonb_agg(w) filter (where town.cat('fish') ? w and town.cat('fish')->w->>'tier' <> 'common'), '[]'::jsonb) as rare from jsonb_array_elements_text($1::jsonb) w`, [JSON.stringify([...fromBank])]);
t.check("from the bank, sixty casts of dough at noon bring only common fish", v.rows[0].rare.length === 0 && fromBank.size > 2, { caught: [...fromBank], rare: v.rows[0].rare });
await t.sql(`delete from public.town_lines where member_id = $1`, [U.m2]);
v = await t.sql(`select count(*)::int as n from generate_series(1, 60) g, lateral (select town.cast_line('worm', 12, false, false, true, array[random(), random(), random(), random(), random(), random()]) as l) c
                  where town.cat('fish') ? (c.l->>'what') and town.cat('fish')->(c.l->>'what')->>'tier' <> 'common'`);
t.check("shallow water has only the common fish", v.rows[0].n === 0, v.rows);

t.section("the strike, by the database's clock");
await purse(U.m1, [{ item: "rod", n: 1 }, { item: "worm", n: 4 }]);
await setLine(U.m1, line("minnow", 6.2));
await clock(NOON + 20_000 - 301);
r = await call(U.m1, "town_strike", 120);
t.check("well before the bite it is too soon: nothing hooked, the line is gone", r.ok === true && r.hooked === false && r.how === "early" && (await lineOf(U.m1)) === null && r.what === undefined, r);
await setLine(U.m1, line("minnow", 6.2));
await clock(NOON + 20_000 - 300);
r = await call(U.m1, "town_strike", 120);
t.check("within the slack before the bite it hooks: the two clocks may differ a little", r.ok === true && r.hooked === true && r.what === "minnow", r);
await purse(U.m1, [{ item: "rod", n: 1 }, { item: "worm", n: 4 }]);
await setLine(U.m1, line("minnow", 6.2));
await clock(NOON + 20_000 + 1600 + 1500 + 1);
r = await call(U.m1, "town_strike", 3101);
t.check("past its moment (1.6 s) and the slack after it, it is missed", r.ok === true && r.hooked === false && r.how === "missed" && (await lineOf(U.m1)) === null, r);
await setLine(U.m1, line("minnow", 6.2));
await clock(NOON + 20_000 + 1600 + 1500);
r = await call(U.m1, "town_strike", 400);
t.check("in time, the fish is hooked and named, and the fight has cost its stamina", r.ok === true && r.hooked === true && r.landed === false && r.what === "minnow" && r.size === 6.2
  && r.purse.stamina.left === 48, r);
kept = await lineOf(U.m1);
t.check("the line is kept, struck", kept.struck_at === NOON + 23_100 && kept.reaction === 400 && kept.spent === false, kept);
r = await call(U.m1, "town_strike", 1);
t.check("it cannot be struck twice", r.ok === false && r.why === "none" && r.purse.stamina.left === 48, r);
r = await call(U.m1, "town_line");
t.check("asked after now, the line says what is on it", r.line.what === "minnow" && r.line.size === 6.2 && r.line.struck_at === NOON + 23_100, r);
// a float, a meal and no stamina change the moment
await purse(U.m2, [{ item: "rod", n: 1 }, { item: "floatBell", n: 1 }]);
await setLine(U.m2, line("minnow", 5));
await clock(NOON + 20_000 + 2400 + 1500);
r = await call(U.m2, "town_strike", null);
t.check("a bell float makes the moment half as long again", r.hooked === true, r);
await purse(U.m2, [{ item: "rod", n: 1 }], 0);
await setLine(U.m2, line("minnow", 5));
await clock(NOON + 20_000 + 960 + 1500 + 1);
r = await call(U.m2, "town_strike", null);
t.check("with no stamina left it is shorter, and missed where it would have hooked", r.hooked === false && r.how === "missed", r);
v = await plays(U.m2);
t.check("…and the miss is written down as played with no stamina", v[v.length - 1]?.spent === true && v[v.length - 1].won === false && v[v.length - 1].doc.how === "missed", v[v.length - 1] ?? "nothing was written down");

t.section("a landing, believed or not");
const struck = NOON + 23_100;
// a minnow: half a line at 0.14 a second is 3.57 s at the quickest; under half of that, nobody landed it
await clock(struck + 1785 - 1);
r = await call(U.m1, "town_land", "landed", { seed: 7, presses: [0.2, 0.9] });
let log = await plays(U.m1);
t.check("landed sooner than half the quickest fight there could be, it is not believed: slipped, and marked", r.ok === true && r.how === "slipped" && r.kept === false
  && heldIn(r.purse.bag, "minnow") === 0 && log[log.length - 1].doc.suspect === true && log[log.length - 1].doc.claims.how === "landed" && log[log.length - 1].won === false, { r, play: log[log.length - 1] });
t.check("the browser's own account of the fight is kept with it", same(log[log.length - 1].doc.claims.fight, { seed: 7, presses: [0.2, 0.9] }), log[log.length - 1].doc.claims);
await setLine(U.m1, line("minnow", 6.2, { struck_at: struck, reaction: 400, spent: false }));
await clock(struck + 1785);
r = await call(U.m1, "town_land", "landed", null);
log = await plays(U.m1);
t.check("after that long it is: into the bag, the longest of its kind yet", r.ok === true && r.how === "landed" && r.what === "minnow" && r.kept === true && r.record === true
  && heldIn(r.purse.bag, "minnow") === 1 && r.purse.best.minnow === 6.2 && (await lineOf(U.m1)) === null, r);
t.check("…written down as won, with how long the fight took", log[log.length - 1].won === true && Math.abs(log[log.length - 1].secs - 1.785) < 1e-6 && log[log.length - 1].doc.what === "minnow"
  && log[log.length - 1].doc.size === 6.2 && log[log.length - 1].doc.place === "deck" && log[log.length - 1].doc.suspect === false, log[log.length - 1]);
await setLine(U.m1, line("minnow", 5.1, { struck_at: struck }));
r = await call(U.m1, "town_land", "landed", null);
t.check("a shorter one is kept too, and is no record", r.how === "landed" && r.kept === true && r.record === false && heldIn(r.purse.bag, "minnow") === 2 && r.purse.best.minnow === 6.2, r);
await setLine(U.m1, line("minnow", 9, { struck_at: struck }));
await clock(struck + 900_001);
r = await call(U.m1, "town_land", "landed", null);
t.check("long after any fight would be over, it is not believed either", r.how === "slipped" && heldIn(r.purse.bag, "minnow") === 2, r);
r = await call(U.m1, "town_land", "landed", null);
t.check("with no line out there is nothing to land", r.ok === false && r.why === "none", r);
await setLine(U.m1, line("minnow", 9, { struck_at: struck }));
r = await call(U.m1, "town_land", "won", null);
t.check("only the ends there are, are ends", r.ok === false && r.why === "none" && (await lineOf(U.m1)) !== null, r);
r = await call(U.m1, "town_land", "slipped", JSON.stringify("x".repeat(10)));
log = await plays(U.m1);
t.check("a fish that slipped is gone, and an account that is no document is kept as nothing", r.ok === true && r.how === "slipped" && log[log.length - 1].doc.claims.fight === null, { r, play: log[log.length - 1] });
await clock(NOON);
await setLine(U.m1, line("koi", 88));
r = await call(U.m1, "town_land", "landed", null);
t.check("a line pulled up before anything was hooked is only left, whatever the browser calls it: nothing is told of what was coming", r.ok === true && r.how === "left" && r.what === null
  && r.kept === false && !JSON.stringify(r).includes("koi"), r);

t.section("what is no fish");
await purse(U.m1, [{ item: "rod", n: 1 }], 50);
await setLine(U.m1, line("boot", 0));
await clock(NOON + 20_000);
r = await call(U.m1, "town_strike", 300);
log = await plays(U.m1);
t.check("an old boot is landed at once: no fight, no stamina, into the bag", r.ok === true && r.hooked === true && r.landed === true && r.what === "boot" && r.kept === true
  && heldIn(r.purse.bag, "boot") === 1 && r.purse.stamina.left === 50 && (await lineOf(U.m1)) === null && log[log.length - 1].won === true && log[log.length - 1].doc.how === "landed", r);

t.section("a snapped line");
await purse(U.m1, [{ item: "rod", n: 1 }, { item: "lure", n: 1 }, { item: "worm", n: 2 }]);
await clock(NOON);
r = await call(U.m1, "town_cast", "lure", 16, 38, false);
t.check("a carved fish is not eaten by the cast", r.ok === true && heldIn(r.purse.bag, "lure") === 1, r);
await setLine(U.m1, line("giantSnakehead", 80, { bait: "lure", struck_at: NOON }));
await clock(NOON + 4000);
r = await call(U.m1, "town_land", "snapped", null);
t.check("…but goes with a snapped line", r.ok === true && r.how === "snapped" && heldIn(r.purse.bag, "lure") === 0 && heldIn(r.purse.bag, "worm") === 2, r);
await setLine(U.m1, line("minnow", 5, { struck_at: NOON }));
r = await call(U.m1, "town_land", "snapped", null);
t.check("a worm was gone when it was cast: a snapped line takes no more", r.how === "snapped" && heldIn(r.purse.bag, "worm") === 2, r);

t.section("a full bag");
await purse(U.m1, [{ item: "rod", n: 1 }, { item: "hoe", n: 1 }, { item: "can", n: 1 }, { item: "pot", n: 1 }, { item: "pan", n: 1 }]);
await setLine(U.m1, line("minnow", 7.7, { struck_at: NOON }));
await clock(NOON + 4000);
r = await call(U.m1, "town_land", "landed", null);
t.check("with no room the fish is landed and let go: not kept, though its length is the record", r.ok === true && r.how === "landed" && r.kept === false && r.record === true
  && heldIn(r.purse.bag, "minnow") === 0 && r.purse.best.minnow === 7.7, r);

t.section("the record of every go");
v = await t.sql(`select doc->>'how' as how, count(*)::int as n from public.town_plays where game = 'fishing' group by 1 order by 1`);
t.check("every end is there: too soon, missed, landed, slipped, snapped, left", same(v.rows.map((x) => x.how), ["early", "landed", "left", "missed", "slipped", "snapped"]), v.rows);
v = await t.sql(`select count(*)::int as n, count(*) filter (where at between to_timestamp(${NOON} / 1000.0) and to_timestamp(${NOON + 1_000_000} / 1000.0))::int as then from public.town_plays`);
t.check("each is dated by the town's clock, not the server's", v.rows[0].n > 10 && v.rows[0].then === v.rows[0].n, v.rows);
r = await t.as(U.m1, `select count(*) from public.town_plays`);
t.check("nobody in a browser reads the record yet", r.code === "42501", r);

t.section("running it again keeps what an admin changed");
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{reel}', '0.2') where key = 'fishing'`);
await t.run(FILE, "v108 a third time");
v = await t.sql(`select data->>'reel' as reel from public.town_catalog where key = 'fishing'`);
t.check("a number changed in the catalog is not put back", v.rows[0].reel === "0.2", v.rows);

await t.done();
