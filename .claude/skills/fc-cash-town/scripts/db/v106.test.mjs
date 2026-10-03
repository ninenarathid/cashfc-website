/*
 * v106 — the uncle keeps his books: dry run in PGlite.
 *
 * Two halves. The rules: every case in vectors-v106.json (made from the site's own rules by
 * `TOWN_VECTORS=<this folder> npx vitest run lib/town/db-vectors.test.ts`) is put to the SQL and must come back as the
 * code answered it. The keeping: who may call what, that a purse is kept and the stall is one for the village, and
 * that nothing is written any other way.
 *
 *   node v106.test.mjs
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v106_the_uncle_keeps_his_books.sql" v106.test.mjs v106.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U, CHAR } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(106);   // (from supabase/, or from history once it has run)
const VECTORS = new URL("./vectors-v106.json", import.meta.url);
if (!existsSync(VECTORS)) { console.log("no vectors-v106.json: run `TOWN_VECTORS=<this folder> npx vitest run lib/town/db-vectors.test.ts` in the repo first"); process.exit(2); }
const vectors = JSON.parse(readFileSync(VECTORS, "utf8"));

// The tables v105 counts popoto in, as they stand live.
const extra = `
create table public.kudos (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null,
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_character_id, day)
);
alter table public.kudos enable row level security;
create policy "kudos: read for everyone" on public.kudos for select using (true);
create table public.gallery_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles (id) on delete cascade,
  caption text, created_at timestamptz not null default now()
);
alter table public.gallery_posts enable row level security;
create policy "gallery: read posts" on public.gallery_posts for select using (true);
create table public.gallery_likes (
  post_id bigint not null references public.gallery_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);
alter table public.gallery_likes enable row level security;
create policy "gallery: read likes" on public.gallery_likes for select using (true);
`;

const t = await supabaseLike({ extra });
await t.run(migration(105), "v105");
await t.runTwice(FILE, "v106");

/* ── the rules, case by case ─────────────────────────────────────────────── */

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
};
/** A value as the query takes it: documents as text, a list of whole numbers as a Postgres array. */
const param = (fn, i, v) => (v === null ? null : fn === "roll" && i === 1 ? `{${v.join(",")}}` : typeof v === "object" ? JSON.stringify(v) : v);
/** A document with its keys in one order, to compare by. */
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

t.section(`the rules: ${vectors.length} cases, each as the site's own code answers it`);
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

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, jsonb_typeof(data) as is, case jsonb_typeof(data) when 'object' then (select count(*) from jsonb_object_keys(data)) end as n from public.town_catalog order by key`);
t.check("the catalog's seven documents", v.rows.map((r) => `${r.key} ${r.is} ${r.n}`).join(", ")
  === "carries object 3, goods object 97, hints object 2, items object 223, order object 2, rules object 3, shelf object 2", v.rows);
v = await t.sql(`select key, doc from public.town_things order by key`);
t.check("the village's three documents, as they begin", JSON.stringify(v.rows.map((r) => [r.key, settle(r.doc)]))
  === JSON.stringify([["found", []], ["stall", { round: 0, sold: {} }], ["village", { day: -1, got: {}, opened: -1, unlocked: 0 }]]), v.rows);
v = await t.sql(`select count(*)::int as n from information_schema.role_table_grants where table_schema = 'public'
                  and table_name in ('town_catalog', 'town_things', 'town_purses') and grantee in ('anon', 'authenticated')`);
t.check("nothing is granted to a browser on the tables", v.rows[0].n === 0, v.rows);
v = await t.sql(`select has_schema_privilege('anon', 'town', 'usage') as anon, has_schema_privilege('authenticated', 'town', 'usage') as member`);
t.check("no browser has the schema of the rules", v.rows[0].anon === false && v.rows[0].member === false, v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
                        count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member, count(*)::int as all
                   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_%'
                    and p.proname not in ('town_vote', 'town_vote_tally', 'town_my_vote', 'town_bank', 'town_exchange', 'town_popoto_left')`);
t.check("the twelve functions a browser calls: members only", v.rows[0].anon === 0 && v.rows[0].member === 12 && v.rows[0].all === 12, v.rows);
v = await t.sql(`select jsonb_array_length(town.shelf_of(0)) as basic, jsonb_array_length(town.wants(town.day_of(town.now_ms()), 0)) as wants`);
t.check("twenty-three basic things, and three wanted today", v.rows[0].basic === 23 && v.rows[0].wants === 3, v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

// A clock the test moves: the rules' own, put in place of the real one.
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${Date.parse("2026-10-05T09:00:00+07:00")});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = async (iso) => { await t.sql(`update town.test_clock set ms = ${Date.parse(iso)}`); };
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : { ...r.rows[0].r, rows: r.rows };
};
const noArg = async (who, fn) => { const r = await t.as(who, `select public.${fn}() as r`); return r.error ? r : r.rows[0].r; };
// (m1 has been sent thirty popoto by a friend)
await t.sql(`insert into kudos (sender_id, receiver_character_id, day) select $1, $2, current_date - g from generate_series(1, 30) g`, [U.m2, CHAR.m1]);

t.section("who may come to the stall");
let r = await t.as("anon", `select public.town_me() as r`);
t.check("anon has no purse", r.code === "42501", r);
r = await t.as("anon", `select public.town_buy('rod', 1) as r`);
t.check("anon buys nothing", r.code === "42501", r);
r = await t.as(U.unver, `select public.town_me() as r`);
t.check("an unproved character is refused", r.code === "42501", r);
r = await t.as(U.nochar, `select public.town_buy('rod', 1) as r`);
t.check("an account with no character is refused", r.code === "42501", r);
r = await t.as(U.unver, `select public.town_stall() as r`);
t.check("…and is not shown the stall either", r.code === "42501", r);

t.section("the rules are not for browsers, nor the tables");
r = await t.as(U.m1, `select town.put('[null]'::jsonb, 'rod', 1) as r`);
t.check("a member cannot call a rule directly", r.code === "42501", r);
r = await t.as(U.m1, `select town.keep_purse($1, '{"coins": 99999}'::jsonb)`, [U.m1]);
t.check("…least of all the one that keeps a purse", r.code === "42501", r);
for (const table of ["town_catalog", "town_things", "town_purses"]) {
  r = await t.as(U.m1, `select * from public.${table}`);
  t.check(`a member cannot read ${table}`, r.code === "42501", r);
}
r = await t.as(U.m1, `update public.town_things set doc = '{"unlocked": 74, "day": -1, "got": {}, "opened": -1}'::jsonb where key = 'village'`);
t.check("a member cannot open the shelf by hand", r.code === "42501", r);
r = await t.as(U.m1, `update public.town_catalog set data = jsonb_set(data, '{rod,price}', '0') where key = 'goods'`);
t.check("…nor change a price", r.code === "42501", r);

t.section("a purse");
let me = await noArg(U.m1, "town_me");
t.check("a member who has done nothing has the purse the game begins with: five empty slots, no coins, their popoto to change",
  me.purse?.coins === 0 && same(me.purse.bag, [null, null, null, null, null]) && same(me.purse.popoto, { profile: 30, gallery: 0 }) && me.purse.changed.n === 0
  && same(me.purse.left, []) && same(me.purse.recipes, []) && me.now === Date.parse("2026-10-05T09:00:00+07:00"), me);
v = await t.sql(`select count(*)::int as n from public.town_purses`);
t.check("looking makes no purse", v.rows[0].n === 0, v.rows);
r = await t.as(U.m1, `select * from public.town_exchange('profile', 20)`);
me = await noArg(U.m1, "town_me");
t.check("the banker's coins are the purse's coins, and what was changed shows", r.rows?.[0]?.ok === true && me.purse.coins === 100 && me.purse.popoto.profile === 10, { r, me });

t.section("buying");
r = await call(U.m1, "town_buy", "rod", 1);
t.check("a rod is bought: sixty coins, into the first slot", r.ok === true && r.purse.coins === 40 && same(r.purse.bag[0], { item: "rod", n: 1 }) && r.stall.sold.rod === 1 && typeof r.now === "number", r);
r = await call(U.m1, "town_buy", "rod", 1);
t.check("one rod a round each: the second is refused, and says why", r.ok === false && r.why === "each" && r.purse.coins === 40, r);
r = await call(U.m2, "town_buy", "worm", 1);
t.check("with no coins nothing is bought", r.ok === false && r.why === "coins" && r.purse.coins === 0, r);
r = await call(U.m1, "town_buy", "seedGarlic", 1);
t.check("what the shelf has not opened is not sold", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_buy", "rod'; drop table town_purses; --", 1);
t.check("a name that is no thing's is no thing", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_buy", "worm", 10);
t.check("ten worms: two coins each, stacked in one slot", r.ok === true && r.purse.coins === 20 && same(r.purse.bag[1], { item: "worm", n: 10 }) && r.stall.sold.worm === 10, r);
// the stock is the village's
await t.sql(`update public.town_purses set coins = 1000 where member_id = $1; insert into public.town_purses (member_id, coins) values ($2, 1000) on conflict (member_id) do update set coins = 1000`.replace("$1", `'${U.m1}'`).replace("$2", `'${U.m2}'`));
let stall = await noArg(U.m2, "town_stall");
t.check("the other member sees the same stall: what was sold, the shelf, today's order", stall.stall.sold.worm === 10 && stall.shelf.length === 23 && stall.order.wants.length === 3
  && stall.order.opens === "seedGarlic" && stall.unlocked === 0 && same(stall.found, []), stall);
await t.sql(`update public.town_things set doc = jsonb_set(doc, '{sold,worm}', '119') where key = 'stall'`);
r = await call(U.m2, "town_buy", "worm", 2);
t.check("the last of a round's stock: two are refused when one is left", r.ok === false && r.why === "sold", r);
r = await call(U.m2, "town_buy", "worm", 1);
t.check("…and the one is sold", r.ok === true && r.stall.sold.worm === 120, r);
r = await call(U.m1, "town_buy", "bowl", 1);
r = await call(U.m1, "town_buy", "bucket", 1);
r = await call(U.m1, "town_buy", "ash", 1);
r = await call(U.m1, "town_buy", "salt", 1);
t.check("a full bag takes nothing more", r.ok === false && r.why === "full" && r.purse.bag.every(Boolean), r);

t.section("selling: left with the uncle, paid after his relatives have been");
r = await call(U.m1, "town_leave", 1, 5);
t.check("five worms are left with him: out of the bag, no coin yet", r.ok === true && same(r.purse.bag[1], { item: "worm", n: 5 }) && r.purse.left.length === 1 && r.purse.left[0].n === 5, r);
const before = r.purse.coins;
r = await noArg(U.m1, "town_collect");
t.check("nothing can be collected before they come", r.ok === false && r.why === "nothing", r);
r = await call(U.m1, "town_leave", 1, 2);
r = await call(U.m1, "town_take_back", 0);
t.check("until they come it can be taken back", r.ok === true && r.purse.left.length === 0 && same(r.purse.bag[1], { item: "worm", n: 10 }), r);
r = await call(U.m1, "town_leave", 1, 5);
await clock("2026-10-05T19:00:01+07:00");
r = await call(U.m1, "town_take_back", 0);
t.check("once they have been it is gone", r.ok === false && r.why === "gone", r);
r = await noArg(U.m1, "town_collect");
t.check("…and the money waits: five worms at a coin each", r.ok === true && r.coins === 5 && r.purse.coins === before + 5 && r.purse.left.length === 0, r);
r = await call(U.m1, "town_buy", "rod", 1);
t.check("a new round: the stall is stocked again, and the limit each begins again (but the bag is full)", r.ok === false && r.why === "full", r);

t.section("the hand, and making room");
r = await call(U.m1, "town_hold", 0);
t.check("the rod is taken up", r.ok === true && r.purse.hand === "rod", r);
r = await noArg(U.m1, "town_hold");
t.check("…and put away", r.ok === true && r.purse.hand === null, r);
r = await call(U.m1, "town_drop", 4);
t.check("a thing is thrown away to make room", r.ok === true && r.purse.bag[4] === null, r);
r = await call(U.m1, "town_drop", 4);
t.check("an empty slot has nothing to throw", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_drop", 99);
t.check("…nor a slot that is not there", r.ok === false && r.why === "none", r);

t.section("the uncle's order, filled by the village between them");
await clock("2026-10-06T09:00:00+07:00");
stall = await noArg(U.m1, "town_stall");
const wants = stall.order.wants;
const stock = async (who, slot, item, n) => t.sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,${slot}}', $2::jsonb) where member_id = $1`, [who, JSON.stringify({ item, n })]);
await call(U.m2, "town_drop", 0);
await stock(U.m2, 0, wants[0].item, 2);
r = await call(U.m2, "town_give", 0, 2);
t.check("one member brings two of the first thing: paid on the spot", r.ok === true && r.given === 2 && r.coins > 0 && r.order.wants[0].got === 2 && r.opened === null, r);
await stock(U.m1, 4, wants[0].item, 20);
r = await call(U.m1, "town_give", 4, 20);
t.check("another brings more than is still wanted: only what is wanted is taken", r.ok === true && r.given === wants[0].n - 2 && r.purse.bag[4].n === 20 - (wants[0].n - 2), r);
r = await call(U.m1, "town_give", 4, 1);
t.check("…and no more of it is wanted", r.ok === false && r.why === "unwanted", r);
await stock(U.m1, 4, wants[1].item, wants[1].n);
r = await call(U.m1, "town_give", 4, wants[1].n);
await stock(U.m1, 4, wants[2].item, wants[2].n);
r = await call(U.m1, "town_give", 4, wants[2].n);
t.check("the third thing fills the order: the shelf opens its next thing", r.ok === true && r.opened === "seedGarlic" && r.order.filled === true && r.shelf.includes("seedGarlic") && r.shelf.length === 24, r);
stall = await noArg(U.m2, "town_stall");
t.check("for everybody", stall.unlocked === 1 && stall.shelf.includes("seedGarlic") && stall.order.opens === null, stall);
r = await call(U.m2, "town_buy", "seedGarlic", 1);
t.check("…and it is there to buy", r.ok === true && r.purse.bag.some((s) => s?.item === "seedGarlic"), r);
v = await t.sql(`select doc from public.town_things where key = 'village'`);
t.check("a day opens one thing at the most", v.rows[0].doc.unlocked === 1 && v.rows[0].doc.opened === v.rows[0].doc.day, v.rows);

t.section("a hint, and what is worn");
r = await noArg(U.m1, "town_hint");
t.check("the uncle's next hint is bought, and kept", r.ok === true && typeof r.hint === "string" && r.purse.hints.length === 1 && r.purse.hints[0] === r.hint, r);
await stock(U.m1, 4, "basket", 1);
r = await call(U.m1, "town_wear", 4);
t.check("a basket is worn: five slots more", r.ok === true && r.purse.bag.length === 10 && same(r.purse.wears, ["basket"]), r);
r = await call(U.m1, "town_take_off", "basket");
t.check("…and taken off again", r.ok === true && r.purse.bag.length === 5 && same(r.purse.wears, []), r);

t.section("running it again changes nothing that was kept");
const kept = (await t.sql(`select (select jsonb_agg(p order by member_id) from public.town_purses p) as purses, (select jsonb_agg(x order by key) from public.town_things x) as things,
                                  (select count(*) from public.town_catalog)::int as keys`)).rows[0];
// (the real clock again for the file itself, then the test's)
await t.run(FILE, "v106 a third time");
await t.sql(`create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const again = (await t.sql(`select (select jsonb_agg(p order by member_id) from public.town_purses p) as purses, (select jsonb_agg(x order by key) from public.town_things x) as things,
                                   (select count(*) from public.town_catalog)::int as keys`)).rows[0];
t.check("every purse, the stall and the village are as they were", same(kept, again), { kept, again });

await t.done();
