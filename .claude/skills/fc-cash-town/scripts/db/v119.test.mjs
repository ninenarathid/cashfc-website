/*
 * v119 — a plant dug out: dry run in PGlite.
 *
 * v119 lets a hoe dig a plant out of a plot: a dead one (as before) and now a living one, both the bed's owner's
 * alone, a living one only when the call says it is meant (town_tend's fourth word). v105 to v118 are replayed as
 * they ran, v119 is run twice. Then:
 *
 *   · every rule case made from the code as it is now is put to the SQL with no weather kept, and must come back as
 *     the code answers it: among them the digging itself (uproot) and tending with the word given (tend_sure);
 *   · the farm's cases made again under five skies (vectors-v118.json) are put to it with each sky's wet quarter
 *     hours in the table: whether a plant is dead or living hangs on the rain it has had;
 *   · who may call what; a living plant and a dead one, by the owner, by somebody else, in a bed that is nobody's,
 *     with the word and without, as a page built before this calls and as the new one does.
 *
 *   node v119.test.mjs            (RULES=0 skips the cases without rain, RAIN=0 those with; VECTORS=next reads ./next)
 *   node mutate.mjs <the file> v119.test.mjs v119.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v119_"));
const HERE = new URL("./v119_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(119);
const DIR = process.env.VECTORS ?? "now";
const WHICH = process.env.RULES === "0" ? [] : process.env.RULES ? process.env.RULES.split(",").map(Number) : [106, 107, 108, 110, 111, 112, 113];
const vectors = [];
for (const n of WHICH) {
  const at = new URL(`./${DIR}/vectors-v${n}.json`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/vectors-v${n}.json: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors.test.ts\` in the repo first`); process.exit(2); }
  vectors.push(...JSON.parse(readFileSync(at, "utf8")));
}
const rainAt = new URL(`./${DIR}/vectors-v118.json`, import.meta.url);
if (process.env.RAIN !== "0" && !existsSync(rainAt)) { console.log(`no ${DIR}/vectors-v118.json: run the vectors' test in the repo first`); process.exit(2); }
const rainy = process.env.RAIN === "0" ? { slot: 900000, skies: [], cases: [] } : JSON.parse(readFileSync(rainAt, "utf8"));
// (RAIN=<n> takes every n-th of them: for the breaks, which are found by a tenth as surely as by all)
const thin = Number(process.env.RAIN) > 1 ? Number(process.env.RAIN) : 1;

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
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here"') where key = 'flotsam'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;

const SLOT = 900000;
// (the quarter hour it is, taken afresh where a section begins: the rule cases take minutes, and one may turn meanwhile)
let NOW = Date.now(), CUR = Math.floor(NOW / SLOT), p;
const tick = async () => { NOW = Date.now(); CUR = Math.floor(NOW / SLOT); await t.sql(`truncate public.town_weather`); };
/** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
const purse = (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const count = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
/** A plant of m2's at 151,5 that a pest has killed: a pumpkin sown so many days ago that one came, found by looking. */
const deadPlant = async () => {
  const r = await t.sql(`select p.plant from generate_series(2, 60) d,
      lateral (select jsonb_build_object('by', $1::text, 'crop', 'pumpkin', 'sown', town.now_ms() - d * 86400000::bigint, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0) as plant) p
     where (town.see('151,5', jsonb_build_object('soil', 'tilled', 'plant', p.plant), town.now_ms())->>'dead')::boolean limit 1`, [U.m2]);
  if (!r.rows[0]) throw new Error("no pumpkin a pest has killed was found");
  return r.rows[0].plant;
};
/** Put quarter hours of weather in the table, as the editor: each [slot, sky]. */
const weather = async (rows) => {
  for (let i = 0; i < rows.length; i += 4000) {
    const part = rows.slice(i, i + 4000);
    await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain)
      select s, k, 8, 16, case when k in ('rain', 'storm') then 2.5 when k = 'drizzle' then 0.2 else 0 end
        from unnest($1::bigint[], $2::text[]) as x(s, k) on conflict (slot) do nothing`, [part.map((r) => r[0]), part.map((r) => r[1])]);
  }
};

const never = "(town.now_ms() + 365::bigint * 86400000)";
/** A plant in a plot, sown at a moment and covered against pests for good: put there as the editor. */
const plantAt = (x, y, by, crop, sownMs) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled',
  jsonb_build_object('by', $3::text, 'crop', $4::text, 'sown', $5::bigint, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', ${never}, 'cured', 0, 'picked', 0, 'pickedAt', 0), town.now_ms())
  on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant`, [x, y, by, crop, sownMs]);
/** That plot with a pumpkin in it that a pest has killed: sown so many days ago that one came to that plot and was left, found by looking (the pest is the plot's own: what is dead in one plot may live in the next). */
const deadAt = async (x, y, by) => {
  const found = await t.sql(`select p.plant from generate_series(2, 90) d,
      lateral (select jsonb_build_object('by', $1::text, 'crop', 'pumpkin', 'sown', town.now_ms() - d * 86400000::bigint, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0) as plant) p
     where (town.see($2::text, jsonb_build_object('soil', 'tilled', 'plant', p.plant), town.now_ms())->>'dead')::boolean limit 1`, [by, `${x},${y}`]);
  if (!found.rows[0]) throw new Error(`no pumpkin a pest has killed was found for ${x},${y}`);
  return t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, town.now_ms())
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant`, [x, y, JSON.stringify(found.rows[0].plant)]);
};
/** Whose the bed of a tile is, and when it was last tended (so long ago). */
const setBed = (x, y, who, ago = 0) => t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of($1::int, $2::int), $3, town.now_ms() - $4::bigint, 0)
  on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [x, y, who, ago]);
const plotRow = (x, y) => one(`select soil, plant from public.town_plots where x = $1 and y = $2`, [x, y]);
const bedRow = (x, y) => one(`select member_id, tended, empty from public.town_beds where bed = town.bed_of($1::int, $2::int)`, [x, y]);
const plays = async () => (await one(`select count(*)::int as n from public.town_plays`)).n;
const HOE = [{ item: "hoe", n: 1 }];

// as it stands before the file: a living plant is nothing to its owner's hoe, a dead one is anybody's to pull up, and
// town_tend takes three words
const was = {};
await plantAt(148, 5, U.m2, "cabbage", Date.now() - 3600000);
await deadAt(151, 5, U.m2);
await setBed(148, 5, U.m2, 7200000);
await purse(U.m2, 0, HOE, 100, { hand: "hoe" });
await purse(U.guest, 0, HOE, 100, { hand: "hoe" });
was.own = await call(U.m2, "town_tend", 148, 5, null);
was.four = await t.as(U.m2, `select public.town_tend(148, 5, null, true) as r`);
was.pulled = await call(U.guest, "town_tend", 151, 5, null);

await t.runTwice(FILE, "v119");

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
  tend_sure: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint, $9::boolean)",
  uproot: "town.uproot($1::text, $2::jsonb, $3::jsonb, $4::boolean, $5::boolean, $6::text, $7::bigint)",
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


if (rainy.cases.length) {
  t.section(`rain on the plots: ${Math.ceil(rainy.cases.length / thin)} of the farm's cases again, under ${rainy.skies.length} skies`);
  const DRY_SKIES = ["clear", "cloudy", "fog"], rainTally = new Map();
  let sky = -1;
  for (let i = 0; i < rainy.cases.length; i += thin) {
    const v = rainy.cases[i];
    if (v.sky !== sky) {
      // this sky's wet quarter hours, as rain, drizzle and storm by turns; and beside them dry ones, which are to count for nothing
      sky = v.sky;
      await t.sql(`truncate public.town_weather`);
      const wet = new Set(rainy.skies[sky]), rows = rainy.skies[sky].map((s, n) => [s, ["rain", "drizzle", "storm"][n % 3]]);
      const lo = Math.min(...rainy.skies[sky]), hi = Math.max(...rainy.skies[sky]);
      for (let s = lo - 40; s <= hi + 40; s += 3) if (!wet.has(s)) rows.push([s, DRY_SKIES[Math.abs(s) % 3]]);
      await weather(rows);
    }
    const sql = CALL[v.fn];
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map((a, k) => param(v.fn, k, a)))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    const ok = !error && same(got ?? null, v.want);
    const row = rainTally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { sky: v.sky, args: v.args, want: v.want, got: error ?? got }; }
    rainTally.set(v.fn, row);
  }
  for (const [fn, row] of rainTally) t.check(`in the rain, ${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1600)}` : "");
  t.check("the quarter hour is as long here as in the code", rainy.slot === SLOT, rainy.slot);
  await t.sql(`truncate public.town_weather`);
}


t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select p.proname, pg_get_function_identity_arguments(p.oid) as args,
         has_function_privilege('anon', p.oid, 'execute') as anon,
         has_function_privilege('authenticated', p.oid, 'execute') as member
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname = 'town_tend'`);
t.check("one town_tend, of four words: no browser signed out may call it, a member may", v.rows.length === 1
  && same(v.rows[0], { proname: "town_tend", args: "p_x integer, p_y integer, p_timing jsonb, p_sure boolean", anon: false, member: true }), v.rows);
v = await t.sql(`select p.proname, p.pronargs::int as args, has_function_privilege('authenticated', p.oid, 'execute') as member
    from pg_proc p
   where p.pronamespace = 'town'::regnamespace and p.proname in ('deed_for', 'hoe', 'tend', 'uproot')
   order by p.proname`);
t.check("the four rules, one of each, none of them a member's to call", same(v.rows, [
  { proname: "deed_for", args: 6, member: false }, { proname: "hoe", args: 5, member: false }, { proname: "tend", args: 9, member: false }, { proname: "uproot", args: 7, member: false }]), v.rows);
v = await t.sql(`with plot as (
    select jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', 'a', 'crop', 'kangkong',
      'sown', town.now_ms(), 'boost', 0, 'watered', 0, 'fed', 0, 'guard', town.now_ms() + 86400000,
      'cured', 0, 'picked', 0, 'pickedAt', 0)) as p)
  select town.deed_for('1,1', p, 'hoe', 'a', town.now_ms(), 'a') as mine,
         town.deed_for('1,1', p, 'hoe', 'b', town.now_ms(), 'a') as theirs,
         town.deed_for('1,1', p, 'hoe', 'b', town.now_ms(), null) as nobodys,
         town.deed_for('1,1', '{"soil": "wild", "plant": null}', 'hoe', 'b', town.now_ms(), 'a') as weeds
    from plot`);
t.check("a hoe at a living plant: its owner's to dig out, nobody else's, anybody's where the bed is nobody's; weeds are anybody's", same(v.rows[0], { mine: "uproot", theirs: null, nobodys: "uproot", weeds: "clear" }), v.rows);

t.section("who may call what");
let r;
for (const [who, name] of [["anon", "somebody signed out"], [U.unver, "an unproved character"], [U.nochar, "an account with no character"]]) {
  r = await t.as(who, `select public.town_tend(148, 5, null) as r`);
  t.check(`${name} may not tend a plot`, r.code === "42501", r);
  r = await t.as(who, `select public.town_tend(148, 5, null, true) as r`);
  t.check(`…nor with the word`, r.code === "42501", r);
}
for (const who of ["anon", U.m1]) {
  r = await t.as(who, `select town.uproot('1,1', '{}'::jsonb, '{}'::jsonb, true, true, 'hoe', 0)`);
  t.check(`the rule itself is not ${who === "anon" ? "somebody signed out" : "a member"}'s to call`, r.code === "42501", r);
  r = await t.as(who, `select town.tend('1,1', '{}'::jsonb, null, 0, 0, '{}'::jsonb, 'a', 0, true)`);
  t.check(`…nor tending with the word`, r.code === "42501", r);
}
v = await t.sql(`select string_agg(r.rolname || ' ' || f.name, ', ' order by r.rolname, f.name) as may
  from (values ('anon'), ('authenticated')) r(rolname),
       (values ('town.uproot(text, jsonb, jsonb, boolean, boolean, text, bigint)'), ('town.tend(text, jsonb, jsonb, integer, integer, jsonb, text, bigint, boolean)'),
               ('town.hoe(text, jsonb, jsonb, text, bigint)'), ('town.deed_for(text, jsonb, text, text, bigint, text)')) f(name)
 where has_function_privilege(r.rolname, f.name, 'execute')`);
t.check("…nor granted to them", v.rows[0].may === null, v.rows);
v = await t.sql(`select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where (n.nspname, p.proname) in (('public', 'town_tend'), ('town', 'tend'))`);
t.check("the functions of three and of eight words are gone: one of each name is left", v.rows[0].n === 2, v.rows);

t.section("before the file");
t.check("a living plant was nothing to its owner's hoe", was.own.ok === false && was.own.why === "soil", was.own);
t.check("town_tend took no fourth word", !!was.four.error, was.four);
t.check("a dead plant was anybody's to pull up, in anybody's bed", was.pulled.ok === true && was.pulled.deed === "pull", was.pulled);

t.section("a living plant, dug out by the bed's owner and nobody else");
await plantAt(148, 5, U.m2, "cabbage", Date.now() - 3600000);
await plantAt(149, 5, U.m2, "kangkong", Date.now() - 7 * 3600000);
await deadAt(151, 5, U.m2);
await setBed(148, 5, U.m2, 7200000);
const bedWas = await bedRow(148, 5), playsWas = await plays();
await purse(U.guest, 0, HOE, 100, { hand: "hoe" });
for (const [word, how] of [[null, "as a page built before this asks: three words"], [false, "with the word withheld"], [true, "with the word given"]]) {
  r = word === null ? await call(U.guest, "town_tend", 148, 5, null) : await call(U.guest, "town_tend", 148, 5, null, word);
  p = await kept(U.guest);
  t.check(`somebody else's hoe, ${how}: the bed is somebody's`, r.ok === false && r.why === "theirs" && (await plotRow(148, 5)).plant?.crop === "cabbage" && p.stamina.left === 100, r);
}
t.check("…and the bed is as it was", same(await bedRow(148, 5), bedWas), await bedRow(148, 5));
await purse(U.m2, 0, HOE, 100, { hand: "hoe" });
r = await call(U.m2, "town_tend", 148, 5, null);
p = await kept(U.m2);
t.check("its owner's hoe, as a page built before this asks: not without the word", r.ok === false && r.why === "sure" && p.stamina.left === 100, r);
t.check("…told with the plot as it truly stands, and the plant stands", r.key === "148,5" && r.plot?.plant?.crop === "cabbage" && (await plotRow(148, 5)).plant?.crop === "cabbage", r);
r = await call(U.m2, "town_tend", 148, 5, null, false);
t.check("…nor with the word withheld", r.ok === false && r.why === "sure" && (await plotRow(148, 5)).plant?.crop === "cabbage", r);
r = await call(U.m2, "town_tend", 148, 5, null, null);
t.check("…nor with nothing for the word", r.ok === false && r.why === "sure" && (await plotRow(148, 5)).plant?.crop === "cabbage", r);
t.check("…and the bed is not tended by the asking", same(await bedRow(148, 5), bedWas), await bedRow(148, 5));
// (the rules themselves, as the editor: nothing for the word is the word withheld there too, whatever hands it to them)
v = await t.sql(`select town.uproot('148,5', town.purse_of($1::uuid, false), jsonb_build_object('soil', p.soil, 'plant', p.plant), true, null, 'hoe', town.now_ms())->>'why' as dig,
    town.tend('148,5', jsonb_build_object('soil', p.soil, 'plant', p.plant), jsonb_build_object('by', $2::text, 'tended', town.now_ms(), 'empty', 0), 1, 0, town.purse_of($1::uuid, false), $2::text, town.now_ms(), null)->>'why' as tend
  from public.town_plots p where p.x = 148 and p.y = 5`, [U.m2, U.m2]);
t.check("the rules themselves take nothing for the word as the word withheld", same(v.rows[0], { dig: "sure", tend: "sure" }), v.rows);
r = await t.as(U.m2, `select public.town_tend(p_x => $1, p_y => $2, p_timing => $3) as r`, [148, 5, null]);
t.check("called by name as the site calls it, three words: the same", !r.error && r.rows[0].r.ok === false && r.rows[0].r.why === "sure", r);
r = await t.as(U.m2, `select public.town_tend(p_x => $1, p_y => $2, p_timing => $3, p_sure => $4) as r`, [148, 5, null, true]);
r = r.error ? r : r.rows[0].r;
p = await kept(U.m2);
let row = await plotRow(148, 5), bed = await bedRow(148, 5);
t.check("with the word given, it is dug out: bare cleared ground", r.ok === true && r.deed === "uproot" && row.soil === "cleared" && row.plant === null && same(r.plot, { soil: "cleared", plant: null }), r);
t.check("…nothing is left of it: no compost, nothing in the bag but the hoe", same(r.got, []) && count(p.bag, "compost") === 0 && p.bag.filter(Boolean).length === 1, { got: r.got, bag: p.bag });
t.check("…for the stamina of pulling a plant up", p.stamina.left === 98, p.stamina);
t.check("…it is the owner's tending, and the bed still has plants", bed.member_id === U.m2 && Number(bed.tended) > Number(bedWas.tended) && Number(bed.empty) === 0, bed);
t.check("…and no game is written down for it", (await plays()) === playsWas, await plays());
// a ripe one: dug out all the same, and nothing harvested
v = await t.sql(`select town.see('149,5', jsonb_build_object('soil', soil, 'plant', plant), town.now_ms())->>'ripe' as ripe from public.town_plots where x = 149 and y = 5`);
r = await call(U.m2, "town_tend", 149, 5, null, true);
p = await kept(U.m2);
t.check("a ripe one is dug out all the same, and nothing is harvested", v.rows[0].ripe === "true" && r.ok === true && r.deed === "uproot" && same(r.got, []) && count(p.bag, "kangkong") === 0 && (await plotRow(149, 5)).plant === null, r);
// with something else in the hand the word digs nothing out
await plantAt(148, 5, U.m2, "cabbage", Date.now() - 3600000);
await purse(U.m2, 0, [{ item: "hoe", n: 1 }, { item: "can", n: 1, water: 5 }], 100, { hand: "can" });
r = await call(U.m2, "town_tend", 148, 5, null, true);
t.check("the word digs nothing out with a can in the hand: the plant is watered", r.ok === true && r.deed === "water" && (await plotRow(148, 5)).plant?.crop === "cabbage", r);
await purse(U.m2, 0, HOE, 100, {});
r = await call(U.m2, "town_tend", 148, 5, null, true);
t.check("…nor with nothing in the hand", r.ok === false && (await plotRow(148, 5)).plant?.crop === "cabbage", r);
// with no stamina left it is done all the same, and costs nothing there is none of
await purse(U.m2, 0, HOE, 0, { hand: "hoe" });
r = await call(U.m2, "town_tend", 148, 5, null, true);
p = await kept(U.m2);
t.check("with no stamina left it is dug out all the same", r.ok === true && r.deed === "uproot" && p.stamina.left === 0 && (await plotRow(148, 5)).plant === null, r);

t.section("a dead plant, pulled up by the bed's owner and nobody else");
await purse(U.guest, 0, HOE, 100, { hand: "hoe" });
for (const word of [false, true]) {
  r = await call(U.guest, "town_tend", 151, 5, null, word);
  p = await kept(U.guest);
  t.check(`somebody else's hoe at what has died there, the word ${word ? "given" : "withheld"}: the bed is somebody's`, r.ok === false && r.why === "theirs" && (await plotRow(151, 5)).plant?.crop === "pumpkin" && p.stamina.left === 100 && count(p.bag, "compost") === 0, r);
}
await purse(U.m2, 0, HOE, 100, { hand: "hoe" });
r = await call(U.m2, "town_tend", 151, 5, null);
p = await kept(U.m2);
bed = await bedRow(148, 5);
t.check("its owner pulls it up with no word: a dead one needs none", r.ok === true && r.deed === "pull" && (await plotRow(151, 5)).plant === null && (await plotRow(151, 5)).soil === "cleared", r);
t.check("…it leaves compost, for the same stamina", same(r.got, [["compost", 1]]) && count(p.bag, "compost") === 1 && p.stamina.left === 98, { got: r.got, left: p.stamina });
t.check("…and it was the bed's last plant: the day it may stand empty begins", bed.member_id === U.m2 && Number(bed.empty) > 0 && Number(bed.empty) === Number(bed.tended), bed);
// a bag with no room: pulled up all the same, the compost left where it lay
await deadAt(152, 5, U.m2);
await purse(U.m2, 0, [{ item: "hoe", n: 1 }, ...Array(9).fill({ item: "pebble", n: 1 })], 100, { hand: "hoe" });
r = await call(U.m2, "town_tend", 152, 5, null, true);
p = await kept(U.m2);
t.check("with no room in the bag it is pulled up all the same, and nothing comes of it", r.ok === true && r.deed === "pull" && same(r.got, []) && count(p.bag, "compost") === 0 && (await plotRow(152, 5)).plant === null, r);

t.section("what a hoe still does in a neighbour's bed, and in one that is nobody's");
await plantAt(148, 5, U.m2, "cabbage", Date.now() - 3600000);
await setBed(148, 5, U.m2, 3600000);
await purse(U.guest, 0, HOE, 100, { hand: "hoe" });
await t.sql(`delete from public.town_plots where x = 150 and y = 6`);
r = await call(U.guest, "town_tend", 150, 6, JSON.stringify({ hits: 3, misses: 0, secs: 3 }));
t.check("somebody else still clears the weeds there, as v118 let them", r.ok === true && r.deed === "clear", r);
r = await call(U.guest, "town_tend", 150, 6, JSON.stringify({ hits: 3, misses: 0, secs: 3 }), true);
t.check("…and tills, the word making no difference to it", r.ok === true && r.deed === "till" && (await kept(U.guest)).stamina.left === 96, r);
// a bed its owner has left for more than four days is nobody's: what stands there is anybody's to dig out
await plantAt(132, 5, U.m1, "mango", Date.now() - 20 * 86400000);
await deadAt(133, 5, U.m1);
await setBed(132, 5, U.m1, 97 * 3600000);
v = await t.sql(`select town.owner_of(jsonb_build_object('by', member_id, 'tended', tended, 'empty', empty), true, town.now_ms()) as owner from public.town_beds where bed = town.bed_of(132, 5)`);
r = await call(U.guest, "town_tend", 132, 5, null);
t.check("in a bed that is nobody's, a living plant still waits for the word", v.rows[0].owner === null && r.ok === false && r.why === "sure" && (await plotRow(132, 5)).plant?.crop === "mango", { owner: v.rows, r });
r = await call(U.guest, "town_tend", 133, 5, null);
t.check("…what has died there is anybody's to pull up", r.ok === true && r.deed === "pull" && same(r.got, [["compost", 1]]), r);
r = await call(U.guest, "town_tend", 132, 5, null, true);
t.check("…and with the word, the living one is anybody's to dig out", r.ok === true && r.deed === "uproot" && (await plotRow(132, 5)).plant === null, r);
v = await t.sql(`select count(*)::int as n from public.town_beds where bed = town.bed_of(132, 5)`);
t.check("…the bed's old keeping is dropped: it is not the digger's for it", v.rows[0].n === 0, v.rows);

t.section("each is the one that ran, word for word, but for the digging");
{
  const words = (sql, name) => { const at = sql.indexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("\n$$;", at)); };
  const but = (old, pairs) => pairs.reduce((s, [a, b]) => (s && s.includes(a) ? s.replace(a, () => b) : null), old);
  const was110 = migration(110), was118 = migration(118);
  t.check("deed_for is v118's, with the hoe's line changed", but(words(was118, "town.deed_for"), [
    ["    return case when dead then 'pull' when p <> 'null'::jsonb then null", "    return case when p <> 'null'::jsonb then case when not mine then null when dead then 'pull' else 'uproot' end"],
  ]) === words(FILE, "town.deed_for"));
  t.check("tend is v110's, with the word passed down to the digging", but(words(was110, "town.tend"), [
    ["p_me text, p_now bigint)", "p_me text, p_now bigint, p_sure boolean default false)"],
    ["    when deed in ('clear', 'till', 'pull') then town.hoe(p_key, p_purse, p_plot, hand, p_now)",
     "    when deed in ('clear', 'till') then town.hoe(p_key, p_purse, p_plot, hand, p_now)\n    when deed in ('pull', 'uproot') then town.uproot(p_key, p_purse, p_plot, true, coalesce(p_sure, false), hand, p_now)"],
  ]) === words(FILE, "town.tend"));
  t.check("town_tend is v110's, with the word taken and passed down", but(words(was110, "public.town_tend"), [
    ["p_timing jsonb default null)", "p_timing jsonb default null, p_sure boolean default false)"],
    ["  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_);", "  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));"],
  ]) === words(FILE, "public.town_tend"));
  t.check("hoe is v110's, less its dead plant", (() => {
    const old = words(was110, "town.hoe"), now = words(FILE, "town.hoe");
    const from = old.indexOf("  if (town.see(p_key, p_plot, p_now)->>'dead')::boolean then"), to = old.indexOf("  end if;\n", from) + "  end if;\n".length;
    return from > 0 && (old.slice(0, from) + old.slice(to)).replace("  left_ text := f->>'pulled';\n  room boolean;\n", "") === now;
  })());
}

t.section("running it again");
await plantAt(148, 5, U.m2, "cabbage", Date.now() - 3600000);
await setBed(148, 5, U.m2, 3600000);
await t.run(FILE, "v119 a third time");
await purse(U.m2, 0, HOE, 100, { hand: "hoe" });
r = await call(U.m2, "town_tend", 148, 5, null);
t.check("run again, a living plant still waits for the word", r.ok === false && r.why === "sure" && (await plotRow(148, 5)).plant?.crop === "cabbage", r);
r = await t.as("anon", `select public.town_tend(148, 5, null, true) as r`);
t.check("…and still nobody signed out may tend", r.code === "42501", r);
v = await t.sql(`select count(*)::int as n from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'town_tend'`);
t.check("…and there is still one town_tend", v.rows[0].n === 1, v.rows);

t.section("the catalog");
{
  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  t.check("not a row of the catalog is touched", JSON.stringify(after) === JSON.stringify(before) && after.length === 18, after.length);
}

await t.done();

