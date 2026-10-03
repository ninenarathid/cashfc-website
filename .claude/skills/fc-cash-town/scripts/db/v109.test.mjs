/*
 * v109 — the uncle stocks up: dry run in PGlite.
 *
 * v109 changes no function: it writes seven of the catalog's rows over what v106 to v108 seeded. So the proof is
 * the whole of the town's rules again: v105 to v108 are replayed as they ran, v109 is run twice, and every case
 * made from the code as it is now (`TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors.test.ts`, the
 * cases of v106, v107 and v108 together) is put to the SQL and must come back as the code answers it. Then the
 * keeping: what it writes over and what it leaves, and a few things only the new rows make possible.
 *
 *   node v109.test.mjs
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v109_the_uncle_stocks_up.sql" v109.test.mjs v109.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(109);   // (from supabase/, or from history once it has run)
const vectors = [];
for (const n of [106, 107, 108]) {
  const at = new URL(`./now/vectors-v${n}.json`, import.meta.url);
  if (!existsSync(at)) { console.log(`no now/vectors-v${n}.json: run \`TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors.test.ts\` in the repo first`); process.exit(2); }
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
await t.run(migration(105), "v105");
await t.run(migration(106), "v106");
await t.run(migration(107), "v107");
await t.run(migration(108), "v108");
// as it stands live, before this file: what was seeded, and when
const before = Object.fromEntries((await t.sql(`select key, data, updated_at from public.town_catalog`)).rows.map((r) => [r.key, r]));
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.runTwice(FILE, "v109");

const RND = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($6::jsonb) with ordinality as e(x, ord))";
const CALL = {
  // v106
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
  // v107
  meal_of: "town.meal_of($1::bigint)", stamina_of: "town.stamina_of($1::jsonb, $2::bigint)", buff_of: "town.buff_of($1::jsonb, $2::bigint)",
  eaten_today: "town.eaten_today($1::jsonb, $2::bigint)", cost_of: "town.cost_of($1::jsonb, $2::float8, $3::bigint)", spend: "town.spend($1::jsonb, $2::float8, $3::bigint)",
  sit_down: "town.sit_down($1::jsonb, $2::int, $3::boolean, $4::bigint)", chew: "town.chew($1::jsonb, $2::float8, $3::bigint)", get_up: "town.get_up($1::jsonb, $2::float8, $3::bigint)",
  settle: "town.settle($1::jsonb, $2::bigint)", read_scroll: "town.read_scroll($1::jsonb, $2::int)",
  // v108
  odds: "town.odds($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean)",
  cast_line: `town.cast_line($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${RND})`,
  hook_bait: "town.hook_bait($1::jsonb, $2::text)", lose_bait: "town.lose_bait($1::jsonb, $2::text)",
  land_catch: "town.land_catch($1::jsonb, $2::text, $3::float8)", strike_window: "town.strike_window($1::jsonb, $2::bigint)",
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
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 900)}` : "");

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, case jsonb_typeof(data) when 'object' then (select count(*) from jsonb_object_keys(data)) end::int as n,
                            updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("the catalog's thirteen rows, the seven it writes and the six it leaves", v.rows.map((r) => `${r.key} ${r.n}${r.written ? " written" : ""}`).join(", ")
  === "carries 3, dishes 68 written, fish 32, fishing 15, flotsam 6, goods 105 written, hints 2 written, items 317 written, order 2 written, rules 3, scrolls 66 written, shelf 2 written, stamina 7", v.rows);
v = await t.sql(`select jsonb_array_length(data->'basic') as basic, jsonb_array_length(data->'unlocks') as unlocks from public.town_catalog where key = 'shelf'`);
t.check("the shelf: twenty-three things from the first day, eighty-two more to open", v.rows[0].basic === 23 && v.rows[0].unlocks === 82, v.rows);
v = await t.sql(`select jsonb_array_length(data->'ids') as hints from public.town_catalog where key = 'hints'`);
t.check("eighty-eight hints to sell", v.rows[0].hints === 88, v.rows);
v = await t.sql(`select (data->'pot'->>'pays')::int as pot, data->'flour'->>'tier' as flour, data ? 'sushi' as sushi, data ? 'scrollTomYum' as scroll, data ? 'oven' as oven from public.town_catalog where key = 'items'`);
t.check("a pot fetches nothing, flour is the second tier's, and the new things are there", same(v.rows[0], { pot: 0, flour: "2", sushi: true, scroll: true, oven: true }), v.rows);
v = await t.sql(`select (select count(*) from public.town_purses where coins > 0 or doc <> town.fresh())::int as purses, (select doc->>'unlocked' from public.town_things where key = 'village') as unlocked`);
t.check("nobody had a purse with anything in it, and nothing was opened", v.rows[0].purses === 0 && v.rows[0].unlocked === "0", v.rows);

t.section("what it writes over, and what it leaves");
v = await t.sql(`select key, data from public.town_catalog`);
const after = Object.fromEntries(v.rows.map((r) => [r.key, r.data]));
const changed = Object.keys(after).filter((k) => !same(after[k], before[k]?.data)).sort();
t.check("six rows are not what was seeded: every one it writes but one", same(changed, ["dishes", "goods", "hints", "items", "order", "scrolls", "shelf"].filter((k) => changed.includes(k))) && changed.length >= 6, changed);
for (const key of ["rules", "carries", "stamina", "fish", "flotsam", "fishing"]) t.check(`${key} is as it was seeded`, same(after[key], before[key].data));
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{reel}', '0.2') where key = 'fishing'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{salt,each}', '2') where key = 'goods'`);
await t.run(FILE, "v109 a third time");
v = await t.sql(`select (select data->>'reel' from public.town_catalog where key = 'fishing') as reel, (select data->'salt'->>'each' from public.town_catalog where key = 'goods') as salt`);
t.check("a number changed by hand in a row it leaves is kept", v.rows[0].reel === "0.2", v.rows);
t.check("…and one changed in a row it writes is the code's again (the file says so)", v.rows[0].salt === String(after.goods.salt.each), v.rows);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{reel}', '0.14') where key = 'fishing'`);

/* ── the keeping, with the new rows ──────────────────────────────────────── */

const NOON = Date.parse("2026-10-05T12:00:00+07:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const purse = async (who, stacks, coins = 0, more = {}) => {
  const bag = [...stacks, null, null, null, null, null].slice(0, 5);
  await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 40)) || $4::jsonb)
               on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify(bag), JSON.stringify(more)]);
};
const heldIn = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);

t.section("the town's functions, on the new rows");
for (const [who, name] of [["anon", "anon"], [U.m1, "a member"]]) {
  const r = await t.as(who, `select * from public.town_catalog limit 1`);
  t.check(`${name} still cannot read the catalog`, r.code === "42501", r);
}
await purse(U.m1, [], 500);
let r = await call(U.m1, "town_stall");
t.check("the stall has its twenty-three things from the first day, and none of the new ones yet", r.shelf.length === 23 && !r.shelf.includes("seaweed") && !r.shelf.includes("flour"), r.shelf);
r = await call(U.m1, "town_buy", "seaweed", 1);
t.check("what his orders have not opened is not sold", r.ok === false && r.why === "none", r);
await t.sql(`update public.town_things set doc = jsonb_set(doc, '{unlocked}', '82') where key = 'village'`);
r = await call(U.m1, "town_stall");
t.check("with every order filled the shelf is whole: a hundred and five things", r.shelf.length === 105 && r.shelf.includes("oven") && r.shelf.includes("cheese"), r.shelf.length);
r = await call(U.m1, "town_buy", "seaweed", 2);
t.check("…and seaweed is bought, eight coins a sheet", r.ok === true && heldIn(r.purse.bag, "seaweed") === 2 && r.purse.coins === 484, r);
r = await call(U.m1, "town_buy", "rollingPin", 1);
t.check("…and a rolling pin, for ninety", r.ok === true && heldIn(r.purse.bag, "rollingPin") === 1 && r.purse.coins === 394, r);
// a scroll that is only found is read like the uncle's; an odd dish is a meal, a poor one; a pot fetches nothing
await purse(U.m2, [{ item: "scrollSushi", n: 1 }, { item: "oddDish", n: 1 }, { item: "pot", n: 1 }, { item: "sushi", n: 1 }]);
r = await call(U.m2, "town_read", 0);
t.check("a scroll that is only found is read like any other", r.ok === true && r.dish === "sushi" && same(r.purse.recipes, ["sushi"]) && r.purse.bag[0] === null, r);
r = await call(U.m2, "town_leave", 2, 1);
t.check("the uncle's relatives do not take a clay pot", r.ok === false, r);
r = await call(U.m2, "town_leave", 3, 1);
t.check("…but they take sushi", r.ok === true && r.purse.left.length === 1 && r.purse.left[0].pays === 34, r);
r = await call(U.m2, "town_sit", 1, true);
t.check("an odd dish is sat down to like any dish", r.ok === true && r.dish === "oddDish", r);
await t.sql(`update town.test_clock set ms = ${NOON + 5 * 60_000}`);
r = await call(U.m2, "town_chew", 0);
t.check("…and gives its six, and no buff", r.ok === true && r.done === true && Math.abs(r.purse.stamina.left - 46) < 1e-9 && r.purse.buff === null, r);

await t.done();
