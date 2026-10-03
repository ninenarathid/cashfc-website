/*
 * v107 — a meal takes five minutes: dry run in PGlite.
 *
 * The rules: every case in vectors-v107.json (from `TOWN_VECTORS=<this folder> npx vitest run
 * lib/town/db-vectors.test.ts` in the repo) is put to the SQL and must come back as the code answered it. The
 * keeping: who may call what, a meal from sitting down to its buff, a meal left running, a scroll read.
 *
 *   node v107.test.mjs
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v107_a_meal_takes_five_minutes.sql" v107.test.mjs v107.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(107);   // (from supabase/, or from history once it has run)
const VECTORS = new URL("./vectors-v107.json", import.meta.url);
if (!existsSync(VECTORS)) { console.log("no vectors-v107.json: run `TOWN_VECTORS=<this folder> npx vitest run lib/town/db-vectors.test.ts` in the repo first"); process.exit(2); }
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
await t.runTwice(FILE, "v107");

const CALL = {
  meal_of: "town.meal_of($1::bigint)", stamina_of: "town.stamina_of($1::jsonb, $2::bigint)", buff_of: "town.buff_of($1::jsonb, $2::bigint)",
  eaten_today: "town.eaten_today($1::jsonb, $2::bigint)", cost_of: "town.cost_of($1::jsonb, $2::float8, $3::bigint)", spend: "town.spend($1::jsonb, $2::float8, $3::bigint)",
  sit_down: "town.sit_down($1::jsonb, $2::int, $3::boolean, $4::bigint)", chew: "town.chew($1::jsonb, $2::float8, $3::bigint)", get_up: "town.get_up($1::jsonb, $2::float8, $3::bigint)",
  settle: "town.settle($1::jsonb, $2::bigint)", read_scroll: "town.read_scroll($1::jsonb, $2::int)",
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
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1200)}` : "");

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, (select count(*) from jsonb_object_keys(data))::int as n from public.town_catalog where key in ('stamina', 'dishes', 'scrolls') order by key`);
t.check("the three documents it seeds", v.rows.map((r) => `${r.key} ${r.n}`).join(", ") === "dishes 43, scrolls 6, stamina 7", v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
                        count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member
                   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_sit', 'town_chew', 'town_get_up', 'town_read')`);
t.check("the four functions a browser calls: members only", v.rows[0].anon === 0 && v.rows[0].member === 4, v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules, town.meal_of(town.now_ms()) between 0 and 2 as a_meal`);
t.check("the rules are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].a_meal === true, v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const NOON = Date.parse("2026-10-05T12:00:00+07:00"), MIN = 60_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = async (ms) => { await t.sql(`update town.test_clock set ms = ${ms}`); };
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const noArg = async (who, fn) => { const r = await t.as(who, `select public.${fn}() as r`); return r.error ? r : r.rows[0].r; };
/** Give a member a purse with these things in its first slots and so much stamina left today. */
const purse = async (who, stacks, left) => {
  const bag = [...stacks, null, null, null, null, null].slice(0, 5);
  await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::int)))
               on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify(bag), left]);
};

t.section("who may sit down to eat");
for (const [who, name] of [["anon", "anon"], [U.unver, "an unproved character"], [U.nochar, "an account with no character"]]) {
  const r = await t.as(who, `select public.town_sit(0, true) as r`);
  t.check(`${name} is refused`, r.code === "42501", r);
}

t.section("a meal, from sitting down to its buff");
await purse(U.m1, [{ item: "tomYum", n: 2 }, { item: "scrollFriedMinnow", n: 1 }, { item: "scrollFriedMinnow", n: 1 }], 40);
let r = await call(U.m1, "town_sit", 0, false);
t.check("standing, nobody eats", r.ok === false && r.why === "stand" && r.purse.eating === null, r);
r = await call(U.m1, "town_sit", 1, true);
t.check("a scroll is not a meal", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_sit", 0, true);
t.check("sitting, the meal begins: a helping leaves the bag, lunch is marked eaten", r.ok === true && r.dish === "tomYum" && same(r.purse.bag[0], { item: "tomYum", n: 1 })
  && same(r.purse.meals.eaten, [false, true, false]) && r.purse.eating.dish === "tomYum" && r.purse.eating.from === NOON && r.purse.stamina.left === 40, r);
r = await call(U.m1, "town_sit", 0, true);
t.check("the same meal's hours are not eaten twice", r.ok === false && r.why === "meal" && same(r.purse.bag[0], { item: "tomYum", n: 1 }), r);
await clock(NOON + 2 * MIN);
r = await call(U.m1, "town_chew", 2);
// tom yum gives 40: two fifths of it in two minutes, a fifth more for two friends
t.check("two minutes in, with two friends: the stamina so far, and not done", r.ok === true && r.done === false && Math.abs(r.purse.stamina.left - (40 + 40 * 0.4 * 1.2)) < 1e-9 && r.purse.buff === null, r);
const two = r.purse.stamina.left;
await clock(NOON + 3 * MIN);
r = await call(U.m1, "town_chew", 99);
t.check("a made-up crowd counts for five", r.ok === true && Math.abs(r.purse.stamina.left - (two + 40 * 0.2 * 1.5)) < 1e-9, r);
await clock(NOON + 5 * MIN);
r = await call(U.m1, "town_chew", 0);
t.check("at five minutes it is done, and leaves its buff for three hours", r.ok === true && r.done === true && r.purse.eating === null
  && same(r.purse.buff, { id: "hearty", until: NOON + 5 * MIN + 3 * 3_600_000 }), r);

t.section("a meal left running");
await clock(NOON + 6 * 3_600_000);   // dinner's hours
await purse(U.m2, [{ item: "friedMinnow", n: 1 }], 10);
r = await call(U.m2, "town_sit", 0, true);
const sat = NOON + 6 * 3_600_000;
await clock(sat + 1 * MIN);
await call(U.m2, "town_chew", 0);
await clock(sat + 4 * 3_600_000);   // nobody looked for four hours
let me = await noArg(U.m2, "town_me");
// fried minnows give 20, alone: all of it by the fifth minute; its buff ran from then, and is over
t.check("a meal left running is finished when the purse is next read: all its stamina, its buff dated from its fifth minute", me.purse.eating === null
  && Math.abs(me.purse.stamina.left - 30) < 1e-9 && same(me.purse.buff, { id: "keen", until: sat + 5 * MIN + 3 * 3_600_000 }), me);
v = await t.sql(`select doc->'eating' as eating from public.town_purses where member_id = $1`, [U.m2]);
t.check("…though only reading it keeps nothing", v.rows[0].eating !== null && v.rows[0].eating.dish === "friedMinnow", v.rows);
r = await call(U.m2, "town_chew", 0);
v = await t.sql(`select doc->'eating' as eating, doc->'buff'->>'id' as buff from public.town_purses where member_id = $1`, [U.m2]);
t.check("the next thing done keeps it finished", r.ok === true && v.rows[0].eating === null && v.rows[0].buff === "keen", { r, rows: v.rows });

t.section("getting up early");
await clock(NOON + 24 * 3_600_000);   // the next day's lunch
await purse(U.m2, [{ item: "tomYum", n: 1 }], 50);
await call(U.m2, "town_sit", 0, true);
await clock(NOON + 24 * 3_600_000 + 1 * MIN);
r = await call(U.m2, "town_get_up", 0);
t.check("what was eaten stays, the rest and the buff are forfeit", r.ok === true && r.purse.eating === null && Math.abs(r.purse.stamina.left - (50 + 40 * 0.2)) < 1e-9
  && (r.purse.buff === null || r.purse.buff.id !== "hearty") && same(r.purse.meals.eaten, [false, true, false]), r);

t.section("a scroll");
await clock(NOON);
r = await call(U.m1, "town_read", 1);
t.check("a scroll read teaches its recipe and is used up", r.ok === true && r.dish === "friedMinnow" && same(r.purse.recipes, ["friedMinnow"]) && r.purse.bag[1] === null, r);
r = await call(U.m1, "town_read", 2);
t.check("a second of the same is known already, and is kept", r.ok === false && r.why === "known" && same(r.purse.bag[2], { item: "scrollFriedMinnow", n: 1 }), r);
r = await call(U.m1, "town_read", 0);
t.check("a dish has nothing written on it", r.ok === false && r.why === "none", r);

t.section("running it again keeps what an admin changed");
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{max}', '120') where key = 'stamina'`);
await t.run(FILE, "v107 a third time");
v = await t.sql(`select data->>'max' as max from public.town_catalog where key = 'stamina'`);
t.check("a number changed in the catalog is not put back", v.rows[0].max === "120", v.rows);

await t.done();
