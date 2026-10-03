/*
 * v113 — a bigger bag: dry run in PGlite.
 *
 * v113 writes the catalog's `rules` row over (a bag begins with ten slots) and v107's purse_kept again (a bag kept
 * from when bags began smaller is given the slots it lacks). A purse is read by every function there is, so the proof
 * is the whole of the town's rules: v105 to v112 are replayed as they ran, v113 is run twice, and every case made
 * from the code as it is now is put to the SQL and must come back as the code answers it. Then the keeping: a new
 * purse, an old one, one with something worn, one bigger than it need be.
 *
 *   node v113.test.mjs            (RULES=0 skips the cases; VECTORS=next reads them from ./next instead of ./now)
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v113_a_bigger_bag.sql" v113.test.mjs v113.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(113);   // (from supabase/, or from history once it has run)
const DIR = process.env.VECTORS ?? "now";
const WHICH = process.env.RULES === "0" ? [] : process.env.RULES ? process.env.RULES.split(",").map(Number) : [106, 107, 108, 110, 111, 112, 113];
const vectors = [];
for (const n of WHICH) {
  const at = new URL(`./${DIR}/vectors-v${n}.json`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/vectors-v${n}.json: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors.test.ts\` in the repo first`); process.exit(2); }
  vectors.push(...JSON.parse(readFileSync(at, "utf8")));
}

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
for (const n of [105, 106, 107, 108, 109, 110, 111, 112]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here"') where key = 'flotsam'`);
// a purse from when a bag began with five, before this file
const old = [{ item: "rod", n: 1 }, null, { item: "worm", n: 3 }, null, { item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }];
await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 7, town.fresh() || jsonb_build_object('bag', $2::jsonb))`, [U.m1, JSON.stringify(old)]);
await t.runTwice(FILE, "v113");

const RND = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($6::jsonb) with ordinality as e(x, ord))";
const ROLLS = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($3::jsonb) with ordinality as e(x, ord))";
const CALL = {
  roll: "town.roll($1, variadic $2::bigint[])",
  round_of: "town.round_of($1::bigint)", week_of: "town.week_of($1::bigint)", day_of: "town.day_of($1::bigint)",
  held: "town.held($1::jsonb, $2)", room: "town.room($1::jsonb, $2)", put: "town.put($1::jsonb, $2, $3::int)", take: "town.take($1::jsonb, $2, $3::int)",
  hold: "town.hold($1::jsonb, $2::int)", wear: "town.wear($1::jsonb, $2::int)", take_off: "town.take_off($1::jsonb, $2)",
  buy: "town.buy($1::jsonb, $2::jsonb, $3, $4::int, $5::bigint, $6::jsonb)",
  leave: "town.leave($1::jsonb, $2::int, $3::int, $4::bigint)", take_back: "town.take_back($1::jsonb, $2::int, $3::bigint)", collect: "town.collect($1::jsonb, $2::bigint)",
  shelf_of: "town.shelf_of($1::int)", asks: "to_jsonb(town.asks($1, $2::int))", wants: "town.wants($1::int, $2::int)",
  order_of: "town.order_of($1::jsonb, $2::bigint)", give: "town.give($1::jsonb, $2::jsonb, $3::int, $4::int, $5::bigint)",
  next_hint: "town.next_hint($1::jsonb, $2::jsonb, $3::int)", buy_hint: "town.buy_hint($1::jsonb, $2::jsonb, $3::int)",
  fresh: "town.fresh()",
  meal_of: "town.meal_of($1::bigint)", stamina_of: "town.stamina_of($1::jsonb, $2::bigint)", buff_of: "town.buff_of($1::jsonb, $2::bigint)",
  eaten_today: "town.eaten_today($1::jsonb, $2::bigint)", cost_of: "town.cost_of($1::jsonb, $2::float8, $3::bigint)", spend: "town.spend($1::jsonb, $2::float8, $3::bigint)",
  sit_down: "town.sit_down($1::jsonb, $2::int, $3::boolean, $4::bigint)", chew: "town.chew($1::jsonb, $2::float8, $3::bigint)", get_up: "town.get_up($1::jsonb, $2::float8, $3::bigint)",
  settle: "town.settle($1::jsonb, $2::bigint)", read_scroll: "town.read_scroll($1::jsonb, $2::int)", bowls_back: "town.bowls_back($1::jsonb, $2::int)",
  odds: "town.odds($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean)",
  cast_line: `town.cast_line($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${RND})`,
  hook_bait: "town.hook_bait($1::jsonb, $2::text)", lose_bait: "town.lose_bait($1::jsonb, $2::text)",
  land_catch: "town.land_catch($1::jsonb, $2::text, $3::float8)", strike_window: "town.strike_window($1::jsonb, $2::bigint)",
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
  tidy: "town.tidy($1::jsonb)", made_of: "town.made_of($1::jsonb)", takes: "town.takes($1::text)", in_hands: "town.in_hands($1::jsonb, $2::jsonb)",
  helpings: "town.helpings($1::text, $2::jsonb, $3::float8, $4::jsonb)", odd_helpings: "town.odd_helpings($1::jsonb, $2::float8)",
  taste_of: "town.taste_of($1::jsonb, $2::jsonb)", cook: "town.cook($1::jsonb, $2::jsonb, $3::jsonb, $4::float8, $5::bigint)",
  set_down: "town.set_down($1::jsonb, $2::int, $3::text, $4::jsonb, $5::text)", ladle: "town.ladle($1::jsonb, $2::jsonb)",
  may_take: "town.may_take($1::jsonb, $2::text)", take_up: "town.take_up($1::jsonb, $2::jsonb, $3::text)", serve: "town.serve($1::jsonb, $2::int)",
  open: `town.open($1::jsonb, $2::int, ${ROLLS})`,
  tidy_give: "town.tidy_give($1::jsonb)", has_all: "town.has_all($1::jsonb, $2::jsonb)", side_of: "town.side_of($1::jsonb, $2::text)",
  lay: "town.lay($1::jsonb, $2::text, $3::jsonb, $4::jsonb, $5::numeric)", agree: "town.agree($1::jsonb, $2::text, $3::boolean)",
  pull: "town.pull($1::jsonb, $2::jsonb)", push: "town.push($1::jsonb, $2::jsonb)", swap: "town.swap($1::jsonb, $2::jsonb, $3::jsonb)",
  roomy: "town.roomy($1::jsonb)",
};
const param = (fn, i, v) => (v === null ? null : fn === "roll" && i === 1 ? `{${v.join(",")}}` : typeof v === "object" ? JSON.stringify(v) : v);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

t.section(`the rules, all of them: ${vectors.length} cases, each as the site's own code answers it now`);
const tally = new Map();
for (const v of vectors) {
  const sql = CALL[v.fn];
  if (!sql) throw new Error(`no SQL for ${v.fn}`);
  let got, error = null;
  try { got = (await t.db.query(`select ${sql} as r`, v.args.map((a, i) => param(v.fn, i, a)))).rows[0].r; } catch (e) { error = e.message; }
  if (typeof got === "bigint") got = Number(got);
  const ok = !error && same(got ?? null, v.want);
  const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  row.n++;
  if (!ok) { row.bad++; row.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  tally.set(v.fn, row);
}
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1600)}` : "");

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select data from public.town_catalog where key = 'rules'`);
t.check("a bag begins with ten slots; the uncle's hours and the dawn are as they were", same(v.rows[0].data, { dawn: 5, slots: 10, rounds: [7, 19] }), v.rows);
v = await t.sql(`select jsonb_array_length(town.fresh()->'bag') as n`);
t.check("a new bag has ten", v.rows[0].n === 10, v.rows);
v = await t.sql(`select jsonb_array_length(town.roomy('{"bag": [null, null, null, null, null], "wears": ["basket"]}'::jsonb)->'bag') as n`);
t.check("an old bag with a basket worn comes to fifteen", v.rows[0].n === 15, v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
                        (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes one row over and leaves the rest as they were", v.rows.filter((r) => r.written).map((r) => r.key).join(", ") === "rules", v.rows.filter((r) => r.written).map((r) => r.key));
v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'flotsam'`);
t.check("what an admin changed in a row it leaves is still theirs", v.rows[0].note === "an admin was here", v.rows);
await t.sql(`update public.town_catalog set data = data - 'note' where key = 'flotsam'`);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const docOf = async (who) => (await t.sql(`select coins, doc from public.town_purses where member_id = $1`, [who])).rows[0];

t.section("a new purse, and an old one");
let r = await call(U.m2, "town_me");
t.check("somebody who has done nothing yet is shown a bag of ten empty slots", r.purse.bag.length === 10 && r.purse.bag.every((s) => s === null) && r.purse.coins === 0, r.purse.bag);
r = await call(U.m1, "town_me");
t.check("a bag kept from when it began with five is given the five it lacks, at its end: what is in it stays where it is",
  r.purse.bag.length === 10 && same(r.purse.bag.slice(0, 5), old) && r.purse.bag.slice(5).every((s) => s === null) && r.purse.coins === 7, r.purse.bag);
t.check("…as it is read: what is kept is not touched until something is done", (await docOf(U.m1)).doc.bag.length === 5);
r = await call(U.m1, "town_hold", 0);
t.check("…and is kept so with the next thing done", r.ok === true && (await docOf(U.m1)).doc.bag.length === 10 && same((await docOf(U.m1)).doc.bag.slice(0, 5), old) && (await docOf(U.m1)).doc.hand === "rod", (await docOf(U.m1)).doc.bag);
r = await call(U.m1, "town_me");
t.check("…once: read again it is the same bag", r.purse.bag.length === 10 && same(r.purse.bag.slice(0, 5), old), r.purse.bag);
// the new slots are slots like any other
await t.sql(`update public.town_purses set coins = 1000 where member_id = $1`, [U.m1]);
const before = (await call(U.m1, "town_me")).purse.bag.filter(Boolean).length;
for (const item of ["hoe", "can", "pan", "grill", "bowl", "bucket", "pot"]) await call(U.m1, "town_buy", item, 1);
r = await call(U.m1, "town_me");
t.check("the slots it gained are filled like any others, and then the bag is full", r.purse.bag.filter(Boolean).length === 10 && before === 3 && r.purse.bag.length === 10, r.purse.bag.map((s) => s?.item ?? null));

t.section("the keeping is v107's, with one thing more");
const words = (sql, name) => { const at = sql.indexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("\n$$;", at)); };
{
  const was = words(migration(107), "town.purse_kept"), is = words(FILE, "town.purse_kept");
  t.check("purse_kept is v107's word for word, but for the bag made roomy", !!was && was !== is
    && was.replace("return coalesce(doc, town.fresh()) || jsonb_build_object(", "return town.roomy(coalesce(doc, town.fresh())) || jsonb_build_object(") === is);
}

t.section("what is worn, and a bag bigger than it need be");
await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'wears', '["basket"]'::jsonb))
             on conflict (member_id) do update set doc = excluded.doc`, [U.guest, JSON.stringify([...old, null, null, null, { item: "minnow", n: 2 }, null])]);
r = await call(U.guest, "town_me");
t.check("an old bag of five with a basket worn (ten in all) comes to fifteen, and nothing in it moves", r.purse.bag.length === 15 && r.purse.bag[8]?.item === "minnow" && same(r.purse.bag.slice(0, 5), old), r.purse.bag);
r = await call(U.guest, "town_take_off", "basket");
t.check("the basket taken off, it is a bag of ten", r.ok === true && r.purse.bag.length === 10 && r.purse.bag.filter(Boolean).length === 5, r.purse.bag);
await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', (select jsonb_agg('null'::jsonb) from generate_series(1, 24))))
             on conflict (member_id) do update set doc = excluded.doc`, [U.admin]);
r = await call(U.admin, "town_me");
t.check("a bag bigger than it need be is left alone: nothing here ever makes one smaller", r.purse.bag.length === 24, r.purse.bag.length);

t.section("running it again, after an admin changed the number");
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{slots}', '12') where key = 'rules'`);
r = await call(U.m2, "town_me");
t.check("a number raised in the catalog is enough: every bag has the slots at the next look", r.purse.bag.length === 12 && (await call(U.m1, "town_me")).purse.bag.length === 12, r.purse.bag.length);
await t.run(FILE, "v113 a third time");
v = await t.sql(`select data->>'slots' as slots from public.town_catalog where key = 'rules'`);
t.check("run again, this file puts its own number back: it is written over, as its head says", v.rows[0].slots === "10", v.rows);
r = await call(U.m1, "town_me");
t.check("…and no bag that grew is made smaller for it", r.purse.bag.length >= 10 && r.purse.bag.filter(Boolean).length === 10, r.purse.bag.length);

await t.done();
