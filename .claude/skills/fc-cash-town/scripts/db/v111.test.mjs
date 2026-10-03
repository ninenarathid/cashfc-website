/*
 * v111 — a pot on the fire: dry run in PGlite.
 *
 * v111 writes five of the catalog's rows over and three of v107's functions again, so the proof is the whole of the
 * town's rules: v105 to v110 are replayed as they ran, v111 is run twice, and every case made from the code as it is
 * now (`TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors.test.ts`: the cases of v106, v107, v108,
 * v110 and v111 together) is put to the SQL and must come back as the code answers it. Then the keeping: who may
 * cook, what is told and what is not, whose hands count, a find and its finder, a pot set down, ladled from (a bowl
 * to a helping) and gone with its last, a meal's bowl coming back, and what the river's finds have in them.
 *
 *   node v111.test.mjs            (RULES=0 skips the cases, for a quick look at the keeping; RULES=107,111 puts only those files' cases)
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v111_a_pot_on_the_fire.sql" v111.test.mjs v111.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(111);   // (from supabase/, or from history once it has run)
const vectors = [];
const WHICH = process.env.RULES === "0" ? [] : process.env.RULES ? process.env.RULES.split(",").map(Number) : [106, 107, 108, 110, 111];
for (const n of WHICH) {
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
for (const n of [105, 106, 107, 108, 109, 110]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
// as it stands live before this file, with a mark an admin left in a row this file does not touch
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here"') where key = 'flotsam'`);
await t.runTwice(FILE, "v111");

const RND = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($6::jsonb) with ordinality as e(x, ord))";
const ROLLS = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($3::jsonb) with ordinality as e(x, ord))";
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
  // v107 (three of them written again here)
  meal_of: "town.meal_of($1::bigint)", stamina_of: "town.stamina_of($1::jsonb, $2::bigint)", buff_of: "town.buff_of($1::jsonb, $2::bigint)",
  eaten_today: "town.eaten_today($1::jsonb, $2::bigint)", cost_of: "town.cost_of($1::jsonb, $2::float8, $3::bigint)", spend: "town.spend($1::jsonb, $2::float8, $3::bigint)",
  sit_down: "town.sit_down($1::jsonb, $2::int, $3::boolean, $4::bigint)", chew: "town.chew($1::jsonb, $2::float8, $3::bigint)", get_up: "town.get_up($1::jsonb, $2::float8, $3::bigint)",
  settle: "town.settle($1::jsonb, $2::bigint)", read_scroll: "town.read_scroll($1::jsonb, $2::int)", bowls_back: "town.bowls_back($1::jsonb, $2::int)",
  // v108
  odds: "town.odds($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean)",
  cast_line: `town.cast_line($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${RND})`,
  hook_bait: "town.hook_bait($1::jsonb, $2::text)", lose_bait: "town.lose_bait($1::jsonb, $2::text)",
  land_catch: "town.land_catch($1::jsonb, $2::text, $3::float8)", strike_window: "town.strike_window($1::jsonb, $2::bigint)",
  // v110
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
  // v111
  tidy: "town.tidy($1::jsonb)", made_of: "town.made_of($1::jsonb)", takes: "town.takes($1::text)", in_hands: "town.in_hands($1::jsonb, $2::jsonb)",
  helpings: "town.helpings($1::text, $2::jsonb, $3::float8, $4::jsonb)", odd_helpings: "town.odd_helpings($1::jsonb, $2::float8)",
  taste_of: "town.taste_of($1::jsonb, $2::jsonb)", cook: "town.cook($1::jsonb, $2::jsonb, $3::jsonb, $4::float8, $5::bigint)",
  set_down: "town.set_down($1::jsonb, $2::int, $3::text, $4::jsonb, $5::text)", ladle: "town.ladle($1::jsonb, $2::jsonb)",
  may_take: "town.may_take($1::jsonb, $2::text)", take_up: "town.take_up($1::jsonb, $2::jsonb, $3::text)", serve: "town.serve($1::jsonb, $2::int)",
  open: `town.open($1::jsonb, $2::int, ${ROLLS})`,
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
let v = await t.sql(`select key, (select count(*) from jsonb_object_keys(data))::int as n from public.town_catalog where key in ('items', 'goods', 'makes', 'cooking') order by key`);
t.check("the kitchen's two documents, and the things and the goods written over", v.rows.map((r) => `${r.key} ${r.n}`).join(", ") === "cooking 20, goods 101, items 312, makes 21", v.rows);
v = await t.sql(`select jsonb_array_length(data->'basic') as basic, jsonb_array_length(data->'unlocks') as unlocks from public.town_catalog where key = 'shelf'`);
t.check("the shelf: twenty-one things from the first day, eighty more to open", v.rows[0].basic === 21 && v.rows[0].unlocks === 80, v.rows);
v = await t.sql(`select data->'pot'->>'pays' as pot, data ? 'potDirty' as dirty, data ? 'soap' as soap, data ? 'scrubber' as scrubber, data ? 'brush' as brush, data ? 'ash' as ash from public.town_catalog where key = 'items'`);
t.check("a pot to cook in fetches forty again; there is no dirty pot, and nothing to wash one with", same(v.rows[0], { pot: "40", dirty: false, soap: false, scrubber: false, brush: false, ash: false }), v.rows);
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes five rows over, adds two, and leaves the rest as they were", v.rows.filter((r) => r.written).map((r) => r.key).join(", ") === "cooking, goods, hints, items, makes, order, shelf", v.rows.filter((r) => r.written).map((r) => r.key));
v = await t.sql(`select (select data->>'note' from public.town_catalog where key = 'flotsam') as note, jsonb_array_length((select data->'ids' from public.town_catalog where key = 'hints')) as hints`);
t.check("what an admin changed in a row it leaves is still theirs; and there are eighty-seven hints to sell", v.rows[0].note === "an admin was here" && v.rows[0].hints === 87, v.rows);
await t.sql(`update public.town_catalog set data = data - 'note' where key = 'flotsam'`);
v = await t.sql(`select doc from public.town_things where key = 'finders'`);
t.check("nobody has found anything yet", v.rows.length === 1 && same(v.rows[0].doc, {}), v.rows);
v = await t.sql(`select c.relrowsecurity, (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name = 'town_pots' and grantee in ('anon', 'authenticated')) as grants
                   from pg_class c where c.oid = 'public.town_pots'::regclass`);
t.check("the pots' table has row security on, and nothing granted to a browser", v.rows[0].relrowsecurity === true && v.rows[0].grants === 0, v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
                        count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member
                   from pg_proc p where p.pronamespace = 'public'::regnamespace
                    and p.proname in ('town_kitchen', 'town_cook', 'town_pot_down', 'town_pot_ladle', 'town_pot_take', 'town_serve', 'town_open')`);
t.check("the seven functions a browser calls: members only", v.rows[0].anon === 0 && v.rows[0].member === 7, v.rows);
v = await t.sql(`select town.made_of('[["minnow", 3], ["salt", 1]]'::jsonb) as made, town.taste_of('[["minnow", 3]]'::jsonb, '["pan"]'::jsonb)->>'taste' as taste`);
t.check("three minnows and salt are fried minnow; without the salt, one thing short", v.rows[0].made === "friedMinnow" && v.rows[0].taste === "less", v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
                        (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const MIN = 60_000, HOUR = 3_600_000;
// 12:00 in Bangkok: lunch
const NOON = Date.parse("2026-10-05T12:00:00+07:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
let NOW = NOON;
const clock = async (ms) => { NOW = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
/** Give a member a purse with these things in a bag of so many slots, that one in the hand, so much stamina left today, and whatever else of a purse. */
const purse = async (who, stacks, hand = null, more = {}, slots = 10) => {
  const bag = [...stacks, ...Array(slots).fill(null)].slice(0, Math.max(slots, stacks.length));
  await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'hand', $3::text,
                 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 80)) || $4::jsonb)
               on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify(bag), hand, JSON.stringify(more)]);
};
const hold = async (who, item) => { await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text) where member_id = $1`, [who, item]); };
const docOf = async (who) => (await t.sql(`select doc from public.town_purses where member_id = $1`, [who])).rows[0].doc;
const heldIn = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const pots = async () => (await t.sql(`select id, member_id, dish, helpings, x, y, tok from public.town_pots order by id`)).rows;
const thing = async (key) => (await t.sql(`select doc from public.town_things where key = $1`, [key])).rows[0].doc;
const plays = async (who) => (await t.sql(`select game, won, secs, spent, doc from public.town_plays where member_id = $1 and game = 'cooking' order by id`, [who])).rows;
const things = (list) => JSON.stringify(list);
const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]];
const stock = (list, n = 1) => list.map(([item, k]) => ({ item, n: k * n }));

t.section("who may come to the kitchen");
for (const [who, name] of [["anon", "anon"], [U.unver, "an unproved character"], [U.nochar, "an account with no character"]]) {
  let r = await t.as(who, `select public.town_kitchen() as r`);
  t.check(`${name} may not look at the kitchen`, r.code === "42501", r);
  r = await t.as(who, `select public.town_cook('[["minnow", 3], ["salt", 1]]'::jsonb, '{}', null) as r`);
  t.check(`…nor cook`, r.code === "42501", r);
  r = await t.as(who, `select public.town_pot_down(50, 50) as r`);
  t.check(`…nor set a pot down`, r.code === "42501", r);
  r = await t.as(who, `select public.town_pot_ladle(1, 50, 50) as r, public.town_pot_take(1, 50, 50) as q`);
  t.check(`…nor ladle from one, nor take one up`, r.code === "42501", r);
  r = await t.as(who, `select public.town_serve(0) as r, public.town_open(0) as q`);
  t.check(`…nor serve, nor open anything`, r.code === "42501", r);
}
for (const [who, name] of [["anon", "anon"], [U.m1, "a member"]]) {
  const r = await t.as(who, `select * from public.town_pots limit 1`);
  t.check(`${name} cannot read the pots' table`, r.code === "42501", r);
}
let r = await t.as(U.m1, `insert into public.town_pots (member_id, dish, helpings, x, y, set_at) values ('${U.m1}', 'shabu', 99, 50, 50, 0)`);
t.check("a member cannot set a pot down by hand", r.code === "42501" && (await pots()).length === 0, r);
r = await t.as(U.m1, `update public.town_things set doc = '{"tomYum": {"name": "Me"}}'::jsonb where key = 'finders'`);
t.check("nor write themselves in as a finder", r.code === "42501" && same(await thing("finders"), {}), r);
r = await t.as(U.m1, `select town.cook(town.fresh(), '[]'::jsonb, '[null]'::jsonb, 0, 0)`);
t.check("nor call a rule itself", r.code === "42501", r);

t.section("cooking: what the things make, and nothing told beforehand");
await purse(U.m1, [{ item: "pot", n: 1 }, { item: "bowl", n: 2 }, ...stock(TOMYUM, 3), { item: "worm", n: 3 }], "pot");
r = await call(U.m1, "town_cook", "not a list", [], null);
t.check("what is no list of things is refused, as an answer", r.error !== undefined || (r.ok === false && r.why === "none"), r);
r = await call(U.m1, "town_cook", things([["snakehead", 1], ["x'; drop table public.town_pots; --", 1]]), [], null);
t.check("a thing that is no word is refused", r.ok === false && r.why === "none" && heldIn(r.purse.bag, "snakehead") === 3, r);
r = await call(U.m1, "town_cook", things([["snakehead"]]), [], null);
t.check("…and a pair that is no pair", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_cook", things([["megaCatfish", 1]]), [], null);
t.check("…and what is not in the bag", r.ok === false && r.why === "none" && r.purse.stamina.left === 80, r);
r = await call(U.m1, "town_cook", things([["pot", 1]]), [], null);
t.check("a tool is not put in", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_cook", things([]), [], null);
t.check("nothing put in is nothing cooked", r.ok === false && r.why === "amount", r);
// the wrong things, in cookware: an odd dish, with its taste
r = await call(U.m1, "town_cook", things([...TOMYUM.slice(0, 3), ["worm", 1]]), [], { hits: 6, misses: 0, secs: 9.5 });
t.check("the wrong last thing, in a pot, is a pot of the odd dish: three helpings of it, in a free slot", r.ok === true && r.made === "oddDish" && r.n === 3 && r.first === false
  && r.purse.bag.some((s) => s?.item === "potFull" && s.of.dish === "oddDish" && s.of.left === 3) && heldIn(r.purse.bag, "snakehead") === 2 && r.purse.stamina.left === 76, r);
t.check("…which tastes of one thing not being the one", r.taste === "swap", r.taste);
t.check("…and is one more try at the recipe it missed by its last thing alone", same(r.purse.tries, { tomYum: 1 }), r.purse.tries);
t.check("…and no recipe is told: nothing found, nothing known", same(await thing("found"), []) && r.purse.recipes.length === 0 && (r.purse.made ?? []).length === 0, r.purse.recipes);
let p = await plays(U.m1);
t.check("the go is written down as not won, with what the browser said of the stirring", p.length === 1 && p[0].won === false && Math.abs(p[0].secs - 9.5) < 1e-6
  && same(p[0].doc, { what: "oddDish", need: 6, misses: 0, crew: [], claims: { hits: 6, misses: 0, secs: 9.5 } }), p);
// the right things
r = await call(U.m1, "town_cook", things(TOMYUM), [], { hits: 6, misses: 1, secs: 12 });
t.check("the right things are a pot of the dish: four helpings, less the one stir missed", r.ok === true && r.made === "tomYum" && r.n === 3 && r.taste === undefined && r.misses === 1
  && r.purse.bag.some((s) => s?.item === "potFull" && s.of.dish === "tomYum" && s.of.left === 3), r);
t.check("…its recipe is found, the first time by anybody, and its cook has made it", r.first === true && same(await thing("found"), ["tomYum"]) && same(r.purse.recipes, ["tomYum"]) && same(r.purse.made, ["tomYum"]), r.purse);
let f = await thing("finders");
t.check("…under the finder's character's name, at the town's clock", f.tomYum?.by === U.m1 && f.tomYum.name === "Member One" && f.tomYum.at === NOON, f);
r = await call(U.m1, "town_cook", things(TOMYUM), [], { misses: 99999 });
t.check("cooked again it is no first; of a hundred thousand misses thirty are counted, and half the helpings are left", r.ok === true && r.first === false && r.misses === 30 && r.n === 2, r);
t.check("…and the finder is who it was", (await thing("finders")).tomYum.at === NOON && (await thing("found")).length === 1);
p = await plays(U.m1);
t.check("both are written down as won", p.length === 3 && p[1].won === true && p[2].won === true && p[2].doc.claims.misses === 1000 && p[2].doc.misses === 30, p.slice(1));

t.section("whose hands count");
// crab curry takes two cooks, a mortar and a pot
const CRAB = [["crab", 3], ["curryPaste", 1], ["longBean", 1], ["eggplant", 1]];
await purse(U.m1, [{ item: "pot", n: 1 }, ...stock(CRAB, 4)], "pot");
await purse(U.m2, [{ item: "mortar", n: 1 }, { item: "bowl", n: 1 }], null);
r = await call(U.m1, "town_cook", things(CRAB), [], null);
t.check("a dish for two, cooked alone, is an odd dish that tastes of the way it was cooked", r.ok === true && r.made === "oddDish" && r.taste === "way", r);
r = await call(U.m1, "town_cook", things(CRAB), [U.m2], null);
t.check("the other named, but with the mortar still in the bag and not in the hand: an odd dish again", r.ok === true && r.made === "oddDish", r);
// somebody with an unproved character, who has a mortar in the hand all the same (a purse made by hand)
await purse(U.unver, [{ item: "mortar", n: 1 }], "mortar");
r = await call(U.m1, "town_cook", things(CRAB), [U.unver, U.nochar, "00000000-0000-0000-0000-0000000000ff", U.m1, U.m1], null);
t.check("whoever is no member of the town, or is the cook again, is no cook, mortar or no mortar", r.ok === true && r.made === "oddDish", r);
await hold(U.m2, "mortar");
r = await call(U.m1, "town_cook", things(CRAB), [U.m2, U.m2, U.unver], { misses: 0 });
t.check("with the other holding the mortar it is cooked", r.ok === true && r.made === "crabCurry" && r.first === true && same(r.purse.made, ["crabCurry"]), r);
p = await plays(U.m1);
t.check("…and who cooked beside is written down, each once", same(p[p.length - 1].doc.crew, [U.m2]), p[p.length - 1].doc);
t.check("the other paid nothing and learnt nothing", same((await docOf(U.m2)).recipes, []) && (await docOf(U.m2)).stamina.left === 80);
await purse(U.m1, [{ item: "pot", n: 1 }, ...stock(CRAB, 1)], "pot", { made: ["crabCurry"] });
r = await call(U.m1, "town_cook", things(CRAB), [], null);
t.check("having made it, the cook alone is told the cooks are not all there, and loses nothing", r.ok === false && r.why === "crew" && heldIn(r.purse.bag, "crab") === 3 && r.purse.stamina.left === 80, r);

t.section("bare hands, and a full bag");
await purse(U.m1, [{ item: "hyacinth", n: 9 }, { item: "worm", n: 2 }], null);
r = await call(U.m1, "town_cook", things([["hyacinth", 6]]), [], null);
t.check("six water hyacinths are woven by hand into a basket", r.ok === true && r.made === "basket" && r.n === 1 && heldIn(r.purse.bag, "basket") === 1 && r.first === true && same(r.purse.recipes, []) && same(r.purse.made, ["basket"]), r);
r = await call(U.m1, "town_cook", things([["worm", 2]]), [], null);
t.check("the wrong things with bare hands are lost, for a little compost", r.ok === true && r.made === null && r.n === 0 && heldIn(r.purse.bag, "worm") === 0 && heldIn(r.purse.bag, "compost") === 1 && typeof r.taste === "string", r);
await purse(U.m1, [{ item: "pot", n: 1 }, { item: "snakehead", n: 5 }, { item: "tomato", n: 5 }, { item: "chili", n: 5 }, { item: "scallion", n: 5 }], "pot", {}, 5);
r = await call(U.m1, "town_cook", things(TOMYUM), [], null);
t.check("with no slot for the pot of food nothing is cooked and nothing lost", r.ok === false && r.why === "full" && heldIn(r.purse.bag, "snakehead") === 5 && r.purse.stamina.left === 80, r);

t.section("a pot of food: set down, ladled from, gone with its last helping");
await t.sql(`delete from public.town_plays`);
await purse(U.m1, [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, { item: "bowl", n: 1 }], "potFull");
await purse(U.m2, [{ item: "bowl", n: 1 }], null, {}, 5);
r = await call(U.m1, "town_pot_down", 300, 5);
t.check("not off the map", r.ok === false && r.why === "none" && (await pots()).length === 0, r);
r = await call(U.m1, "town_pot_down", null, 50);
t.check("nor nowhere", r.ok === false && r.why === "none", r);
r = await call(U.m2, "town_pot_down", 50, 50);
t.check("nobody sets down a pot they have not got", r.ok === false && r.why === "none" && (await pots()).length === 0, r);
r = await call(U.m1, "town_pot_down", 50, 50);
let all = await pots();
t.check("the pot is set down on the tile, and leaves the bag", r.ok === true && all.length === 1 && all[0].member_id === U.m1 && all[0].dish === "tomYum" && all[0].helpings === 3 && all[0].x === 50 && all[0].y === 50
  && heldIn(r.purse.bag, "potFull") === 0 && same(r.pot, { id: String(all[0].id), by: U.m1, dish: "tomYum", left: 3, at: [50, 50] }), r);
const potId = Number(all[0].id);
r = await call(U.guest, "town_kitchen");
t.check("the kitchen is told: the pots that stand about, what has been found, and who found each", r.pots.length === 1 && same(r.pots[0], { id: String(potId), by: U.m1, dish: "tomYum", left: 3, at: [50, 50] })
  && r.found.includes("tomYum") && r.finders.tomYum === "Member One" && r.finders.crabCurry === "Member One" && r.now === NOW && !("purse" in r), r);
await purse(U.guest, [{ item: "potFull", n: 1, of: { dish: "oddDish", left: 2 } }], "potFull");
r = await call(U.guest, "town_pot_down", 51, 51);
t.check("nothing is set down on a tile beside another pot", r.ok === false && r.why === "taken" && (await pots()).length === 1 && heldIn(r.purse.bag, "potFull") === 1, r);
r = await call(U.m2, "town_pot_ladle", potId, 60, 60);
t.check("from too far off there is no ladling", r.ok === false && r.why === "none" && heldIn(r.purse.bag, "bowl") === 1, r);
r = await call(U.m2, "town_pot_ladle", 987654, 50, 51);
t.check("nor from a pot that is not there", r.ok === false && r.why === "gone", r);
r = await call(U.m2, "town_pot_ladle", potId, 50, 51);
t.check("beside it, a helping goes into the bowl, and the bowl goes with it", r.ok === true && r.dish === "tomYum" && heldIn(r.purse.bag, "tomYum") === 1 && heldIn(r.purse.bag, "bowl") === 0 && r.pot.left === 2
  && (await pots())[0].helpings === 2, r);
r = await call(U.m2, "town_pot_ladle", potId, 50, 51);
t.check("a second helping wants a second bowl", r.ok === false && r.why === "tool" && (await pots())[0].helpings === 2 && heldIn(r.purse.bag, "tomYum") === 1, r);
r = await call(U.m2, "town_pot_take", potId, 50, 51);
t.check("nobody but its owner takes it up", r.ok === false && r.why === "none" && (await pots()).length === 1, r);
r = await call(U.m1, "town_pot_ladle", potId, 49, 50);
t.check("its owner ladles from it like anybody", r.ok === true && r.pot.left === 1 && heldIn(r.purse.bag, "tomYum") === 1 && heldIn(r.purse.bag, "bowl") === 0, r);
await purse(U.m2, [{ item: "bowl", n: 1 }, { item: "tomYum", n: 1 }], null, {}, 5);
r = await call(U.m2, "town_pot_ladle", potId, 50, 51);
t.check("its last helping out, the pot is gone from the ground: there is no dirty pot", r.ok === true && r.pot === null && (await pots()).length === 0 && heldIn(r.purse.bag, "tomYum") === 2
  && !r.purse.bag.some((s) => s?.item === "potDirty"), r);
r = await call(U.m1, "town_pot_take", potId, 50, 50);
t.check("…and nothing is left to take up", r.ok === false && r.why === "gone", r);
// taken up again while there is food in it
await purse(U.m1, [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }, { item: "tok", n: 1 }], "potFull");
r = await call(U.m1, "town_pot_down", 150, 20);
t.check("a pot may stand at the farm too; on a rattan table it is reached from further", r.ok === true && r.pot.tok === true && (await pots())[0].tok === true, r);
const second = Number((await pots())[0].id);
await purse(U.m2, [{ item: "bowl", n: 1 }], null, {}, 5);
r = await call(U.m2, "town_pot_ladle", second, 153, 20);
t.check("…three tiles off, with a table", r.ok === true && r.pot.left === 1, r);
r = await call(U.m1, "town_pot_take", second, 150, 20);
t.check("its owner takes it up while there is food in it: a pot of food again", r.ok === true && (await pots()).length === 0 && r.purse.bag.some((s) => s?.item === "potFull" && s.of.dish === "tomYum" && s.of.left === 1), r);
// no more than so many standing about
await t.sql(`insert into public.town_pots (member_id, dish, helpings, x, y, set_at) select '${U.m1}', 'tomYum', 1, 10 + 3 * g, 10, 0 from generate_series(1, 6) g`);
r = await call(U.m1, "town_pot_down", 40, 40);
t.check("one person leaves six standing about and no more", r.ok === false && r.why === "many" && (await pots()).length === 6 && heldIn(r.purse.bag, "potFull") === 1, r);
await t.sql(`delete from public.town_pots`);

t.section("a helping from one's own pot");
await purse(U.m1, [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }, { item: "bowl", n: 1 }, { item: "bowl", n: 1 }], null, {}, 5);
r = await call(U.m1, "town_serve", 1);
t.check("only a pot of food is served from", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_serve", 0);
t.check("a helping, into a bowl, which goes with it", r.ok === true && r.dish === "tomYum" && heldIn(r.purse.bag, "tomYum") === 1 && heldIn(r.purse.bag, "bowl") === 1 && r.purse.bag[0].of.left === 1, r);
r = await call(U.m1, "town_serve", 0);
t.check("its last helping out, the pot is gone from the bag", r.ok === true && heldIn(r.purse.bag, "tomYum") === 2 && heldIn(r.purse.bag, "bowl") === 0 && heldIn(r.purse.bag, "potFull") === 0 && r.purse.bag[0] === null, r);
await purse(U.m1, [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }], null);
r = await call(U.m1, "town_serve", 0);
t.check("with no bowl there is no helping", r.ok === false && r.why === "tool" && r.purse.bag[0].of.left === 2, r);

t.section("a meal's bowl");
await purse(U.m1, [{ item: "tomYum", n: 2 }], null, {}, 5);
r = await call(U.m1, "town_sit", 0, true);
t.check("sitting down to a helping: the bowl is still out", r.ok === true && heldIn(r.purse.bag, "tomYum") === 1 && heldIn(r.purse.bag, "bowl") === 0, r);
await clock(NOON + 4 * MIN);
r = await call(U.m1, "town_chew", 0);
t.check("four minutes in, still out", r.done === false && heldIn(r.purse.bag, "bowl") === 0, r);
await clock(NOON + 5 * MIN);
r = await call(U.m1, "town_chew", 0);
t.check("eaten up, the bowl is back in the bag", r.done === true && heldIn(r.purse.bag, "bowl") === 1 && r.purse.eating === null && heldIn((await docOf(U.m1)).bag, "bowl") === 1, r);
// left half eaten, at dinner
await clock(NOON + 6 * HOUR);
r = await call(U.m1, "town_sit", 0, true);
await clock(NOW + MIN);
r = await call(U.m1, "town_get_up", 0);
t.check("left half eaten, the bowl comes back all the same", heldIn(r.purse.bag, "bowl") === 2 && heldIn(r.purse.bag, "tomYum") === 0 && r.purse.eating === null, r);
// a full bag is owed its bowl
await clock(NOON + 24 * HOUR);
await purse(U.m2, [{ item: "tomYum", n: 2 }, { item: "boot", n: 5 }, { item: "boot", n: 5 }, { item: "boot", n: 5 }, { item: "boot", n: 5 }], null, {}, 5);
r = await call(U.m2, "town_sit", 0, true);
await clock(NOW + 6 * MIN);
r = await call(U.m2, "town_me");
t.check("a meal that ran out with the bag full: the bowl is owed, not lost", r.purse.eating === null && heldIn(r.purse.bag, "bowl") === 0 && r.purse.owed === 1, r.purse);
r = await call(U.m2, "town_drop", 4);
t.check("…and is in the bag as soon as there is room", r.ok === true && heldIn(r.purse.bag, "bowl") === 1 && !("owed" in r.purse), r.purse);
await call(U.m2, "town_hold", 0);
const kept = await docOf(U.m2);
t.check("…once, and kept there with the next thing done", heldIn(kept.bag, "bowl") === 1 && !("owed" in kept) && heldIn((await call(U.m2, "town_me")).purse.bag, "bowl") === 1, kept);
// what the uncle sells ready comes in no bowl
await clock(NOON + 48 * HOUR);
await purse(U.m2, [{ item: "riceBox", n: 1 }], null, {}, 5);
await call(U.m2, "town_sit", 0, true);
await clock(NOW + 5 * MIN);
r = await call(U.m2, "town_chew", 0);
t.check("a rice parcel eaten up leaves no bowl", r.done === true && heldIn(r.purse.bag, "bowl") === 0 && !("owed" in r.purse), r.purse);

t.section("what the river's finds have in them");
await purse(U.m1, [{ item: "bottle", n: 2 }, { item: "boot", n: 40 }, { item: "worm", n: 1 }], null, {}, 6);
r = await call(U.m1, "town_open", 2);
t.check("a worm does not open", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_open", 0);
const scrolls = (bag) => bag.filter((s) => s && /^scroll/.test(s.item));
t.check("a bottle always has a scroll in it, of a dish the uncle does not sell; the bottle is gone", r.ok === true && typeof r.found === "string" && /^scroll/.test(r.found) && heldIn(r.purse.bag, "bottle") === 1
  && scrolls(r.purse.bag).length === 1 && scrolls(r.purse.bag)[0].item === r.found, r);
v = await t.sql(`select (data ? $1) as sold from public.town_catalog where key = 'goods'`, [r.found]);
t.check("…one nobody sells", v.rows[0].sold === false, r.found);
let empty = 0, some = 0;
for (let i = 0; i < 40; i++) { const o = await call(U.m1, "town_open", 1); if (o.ok && o.found === null) empty++; else if (o.ok) some++; else break; if (i % 3 === 2) await purse(U.m1, [{ item: "bottle", n: 1 }, { item: "boot", n: 40 - i - 1 }], null, {}, 6); }
t.check("an old boot has one now and then, and is as often empty", empty > 5 && some > 2, { empty, some });
await purse(U.m1, [{ item: "chest", n: 2 }, { item: "boot", n: 5 }], null, {}, 2);
r = await call(U.m1, "town_open", 0);
t.check("with no slot for what might be in it, nothing is opened: a full bag is no way to look inside", r.ok === false && r.why === "full" && heldIn(r.purse.bag, "chest") === 2, r);

t.section("an account that is closed");
await purse(U.guest, [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }], "potFull");
await call(U.guest, "town_pot_down", 30, 30);
t.check("its pot stands", (await pots()).length === 1);
try { await t.sql(`delete from auth.users where id = '${U.guest}'`); } catch { /* an account that cannot be closed fails the check below */ }
t.check("…and goes with it", (await pots()).length === 0);
await t.sql(`delete from public.town_pots`);
await t.sql(`delete from auth.users where id = '${U.m1}'`);
r = await call(U.m2, "town_kitchen");
t.check("a finder who has gone is still named as they were called then", r.finders.tomYum === "Member One" && r.found.includes("tomYum"), r.finders);

t.section("running it again");
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{pots}', '9') where key = 'cooking'`);
await t.run(FILE, "v111 a third time");
v = await t.sql(`select data->>'pots' as pots, (select jsonb_array_length(doc) from public.town_things where key = 'found') as found, (select count(*)::int from jsonb_object_keys((select doc from public.town_things where key = 'finders'))) as finders
                   from public.town_catalog where key = 'cooking'`);
t.check("a number an admin changed in the kitchen's own row is not put back, and what was found is still found", v.rows[0].pots === "9" && v.rows[0].found >= 3 && v.rows[0].finders >= 3, v.rows);

await t.done();
