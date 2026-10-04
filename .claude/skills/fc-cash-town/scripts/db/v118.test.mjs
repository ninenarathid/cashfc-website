/*
 * v118 — the same sky for everybody: dry run in PGlite.
 *
 * v118 gives the town's weather a table (a quarter of an hour to a row, written by the site's key, kept as written),
 * lets rain water the plots (v110's grown, pest_at and see again, with the rain in them), lets a hoe work in anybody's
 * bed (v110's deed_for again), has a line's rain decided here (v108's town_cast again), and writes the catalog's `items` row over (an old boot and an old chest fetch
 * something). v105 to v117 are replayed as they ran, v118 is run twice. Then:
 *
 *   · every rule case made from the code as it is now is put to the SQL with no weather kept, and must come back as
 *     the code answers it (no rain is what the rules were);
 *   · the farm's cases made again under five skies (now/vectors-v118.json) are put to it with each sky's wet quarter
 *     hours in the table, and dry ones beside them: the rain is counted here as the code counts it;
 *   · who may read and write the weather; what a page is told; rain on a plot, by the deeds themselves; a line in the
 *     rain; the boot and the chest sold.
 *
 *   node v118.test.mjs            (RULES=0 skips the cases without rain, RAIN=0 those with; VECTORS=next reads ./next)
 *   node mutate.mjs <the file> v118.test.mjs v118.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v118_"));
const HERE = new URL("./v118_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(118);
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
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here"') where key = 'flotsam'`);
const before = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;

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

// as it stands before the file: an old boot is nobody's to sell, and a line believes the browser about the rain
await purse(U.m1, 0, [{ item: "boot", n: 2 }, { item: "chest", n: 1 }, { item: "hyacinth", n: 3 }, { item: "rod", n: 1 }, { item: "worm", n: 5 }]);
const was = { boot: await call(U.m1, "town_leave", 0, 1), chest: await call(U.m1, "town_leave", 1, 1) };
{
  const place = (await one(`select key from jsonb_each(town.cat('fishing')->'places') limit 1`)).key.split(",").map(Number);
  was.place = place;
  await call(U.m1, "town_cast", "worm", place[0], place[1], true);
  was.rain = (await one(`select doc->>'rain' as rain from public.town_lines where member_id = $1`, [U.m1])).rain;
}

// …and a hoe has nothing to do in a bed that is somebody's
await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (148, 5, town.bed_of(148, 5), 'tilled',
  jsonb_build_object('by', $1::text, 'crop', 'pumpkin', 'sown', town.now_ms() - 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', town.now_ms() + 86400000::bigint * 30, 'cured', 0, 'picked', 0, 'pickedAt', 0), town.now_ms())`, [U.m2]);
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of(148, 5), $1, town.now_ms() - 7200000, 0)`, [U.m2]);
await purse(U.guest, 0, [{ item: "hoe", n: 1 }], 100, { hand: "hoe" });
was.hoe = await call(U.guest, "town_tend", 149, 5, null);

await t.runTwice(FILE, "v118");

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
let v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes one row of the catalog over, items, and leaves the other seventeen as they were", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === "items" && v.rows.length === 18 && v.rows.length === before.length, v.rows.filter((x) => x.written).map((x) => x.key));
v = await t.sql(`select data->'boot'->'pays' as boot, data->'chest'->'pays' as chest, data->'hyacinth'->'pays' as hyacinth, (select count(*)::int from jsonb_object_keys(data)) as things from public.town_catalog where key = 'items'`);
t.check("an old boot fetches three, an old chest twenty, a hyacinth two as before; three hundred and thirteen things", same(v.rows[0], { boot: 3, chest: 20, hyacinth: 2, things: 313 }), v.rows);
v = await t.sql(`select (select count(*)::int from public.town_weather) as kept,
  has_table_privilege('anon', 'public.town_weather', 'select') as anybody_reads,
  has_table_privilege('authenticated', 'public.town_weather', 'insert') as a_member_writes,
  has_table_privilege('service_role', 'public.town_weather', 'insert') as the_site_writes,
  has_table_privilege('service_role', 'public.town_weather', 'update') as the_site_changes`);
t.check("no weather kept yet; anybody reads it, no member writes it, the site inserts and does not change", same(v.rows[0], { kept: 0, anybody_reads: true, a_member_writes: false, the_site_writes: true, the_site_changes: false }), v.rows);
v = await t.sql(`select jsonb_typeof(public.town_sky()->'now') as clock, jsonb_array_length(public.town_sky()->'slots') as slots, town.raining(town.now_ms()) as raining, town.wet_ms(0, town.now_ms())::int as rain_ms`);
t.check("with none kept: a clock, no quarter hours, no rain", same(v.rows[0], { clock: "number", slots: 0, raining: false, rain_ms: 0 }), v.rows);

t.section("nothing else of the catalog moved");
const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const moved = [];
for (const row of after) {
  const a = flat(before.find((b) => b.key === row.key).data), b = flat(row.data);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) moved.push(`${row.key}.${k}: ${a[k]} -> ${b[k]}`);
}
t.check("of the whole catalog two entries differ: what a boot fetches, and a chest", same([...moved].sort(), ["items.boot.pays: 0 -> 3", "items.chest.pays: 0 -> 20"]), moved);
v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'flotsam'`);
t.check("what an admin changed in a row it leaves is still theirs", v.rows[0].note === "an admin was here", v.rows);
v = await t.sql(`select array_agg(key order by key) as keys from jsonb_each((select data from public.town_catalog where key = 'items')) e where (select data from public.town_catalog where key = 'flotsam') ? e.key and (e.value->>'pays')::int <= 0`);
t.check("everything a line brings up that is no fish fetches something now", v.rows[0].keys === null, v.rows);

t.section("who may read the weather, and who may write it");
await tick();
await weather([[CUR - 1, "clear"], [CUR, "rain"]]);
for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "an account with no character"], [U.m1, "a member"]]) {
  let r = await t.as(who, `select slot, sky from public.town_weather order by slot`);
  t.check(`${name} reads the weather`, !r.error && r.rows.length === 2 && r.rows[1].sky === "rain", r);
  r = await t.as(who, `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'storm', 1, 1, 9)`, [CUR + 1]);
  t.check(`…and may not write it`, r.code === "42501", r);
  r = await t.as(who, `update public.town_weather set sky = 'storm' where slot = $1`, [CUR]);
  t.check(`…nor change it`, r.code === "42501", r);
  r = await t.as(who, `delete from public.town_weather where slot = $1`, [CUR]);
  t.check(`…nor take it away`, r.code === "42501", r);
}
v = await t.sql(`select string_agg(sky, ',' order by slot) as skies from public.town_weather`);
t.check("…and it is as it was", v.rows[0].skies === "clear,rain", v.rows);
let r = await t.as("service", `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'cloudy', 7.3, 27.4, 0.1), ($2, 'drizzle', 5, 9, 0.2) on conflict (slot) do nothing`, [CUR + 1, CUR + 2]);
t.check("the site's key inserts the quarter hours to come", !r.error && (await one(`select count(*)::int as n from public.town_weather`)).n === 4, r);
r = await t.as("service", `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'storm', 1, 1, 9), ($2, 'fog', 2, 3, 0) on conflict (slot) do nothing`, [CUR, CUR + 3]);
v = await t.sql(`select sky from public.town_weather where slot = $1`, [CUR]);
t.check("…one that is kept already is left as it is, the new one beside it written", !r.error && v.rows[0].sky === "rain" && (await one(`select count(*)::int as n from public.town_weather`)).n === 5, { r, v: v.rows });
r = await t.as("service", `update public.town_weather set sky = 'clear' where slot = $1`, [CUR]);
t.check("the site's key may not change what is kept", r.code === "42501" && (await one(`select sky from public.town_weather where slot = $1`, [CUR])).sky === "rain", r);
r = await t.as("service", `delete from public.town_weather where slot = $1`, [CUR]);
t.check("…nor take it away", r.code === "42501" && (await one(`select count(*)::int as n from public.town_weather`)).n === 5, r);
r = await t.as("service", `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 1, 1, 9)`, [CUR + 12]);
t.check("…nor write rain for more than two hours from now", !!r.error && r.code === "22003", r);
r = await t.as("service", `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 1, 1, 9)`, [CUR - 720]);
t.check("…nor for more than a week and a little ago", !!r.error && r.code === "22003", r);
r = await t.as("service", `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 1, 1, 9)`, [CUR - 680]);
t.check("…a week ago it may: a gap that long is filled", !r.error, r);
r = await t.as("service", `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'snow', 1, 1, 0)`, [CUR + 4]);
t.check("a sky that is none of the six is not kept", !!r.error && r.code === "23514", r);
r = await t.as("service", `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 1, 1, 900)`, [CUR + 4]);
t.check("…nor a number out of all measure", !!r.error && r.code === "23514", r);
for (const who of ["anon", U.m1]) {
  r = await t.as(who, `select town.wet_ms(0, 1), town.raining(0), town.wet_sky('rain')`);
  t.check(`the rules themselves are not ${who === "anon" ? "somebody signed out" : "a member"}'s to call`, r.code === "42501", r);
}
v = await t.sql(`select string_agg(r.rolname || ' ' || f.name, ', ' order by r.rolname, f.name) as may
  from (values ('anon'), ('authenticated')) r(rolname),
       (values ('town.wet_ms(bigint, bigint)'), ('town.raining(bigint)'), ('town.wet_sky(text)'), ('town.grown(jsonb, bigint)'), ('town.deed_for(text, jsonb, text, text, bigint, text)'), ('public.town_weather_kept()')) f(name)
 where has_function_privilege(r.rolname, f.name, 'execute')`);
t.check("…nor granted to them, the trigger's function no more than the rest", v.rows[0].may === null, v.rows);
v = await t.sql(`select has_function_privilege('anon', 'public.town_sky(bigint)', 'execute') as anon, has_function_privilege('authenticated', 'public.town_sky(bigint)', 'execute') as member`);
t.check("asking the weather is anybody's", v.rows[0].anon === true && v.rows[0].member === true, v.rows);
await t.sql(`update public.town_weather set sky = 'rain' where slot = $1`, [CUR]);
t.check("this editor may mend a row", (await one(`select sky from public.town_weather where slot = $1`, [CUR])).sky === "rain");
await t.sql(`delete from public.town_weather where slot = $1`, [CUR - 680]);

t.section("what a page is told");
for (const [who, name] of [["anon", "somebody signed out"], [U.m1, "a member"]]) {
  r = await call(who, "town_sky", 0);
  t.check(`${name} is told the weather: this clock, the quarter hours, the wet ones`, typeof r.now === "number" && Math.abs(r.now - Date.now()) < 5000
    && same(r.slots, [[CUR - 1, "clear", 8, 16, 0], [CUR, "rain", 8, 16, 2.5], [CUR + 1, "cloudy", 7.3, 27.4, 0.1], [CUR + 2, "drizzle", 5, 9, 0.2], [CUR + 3, "fog", 2, 3, 0]])
    && same(r.wet, [CUR, CUR + 2]), r);
}
// (older rows: one the day before yesterday, some ten weeks back; what is told is reckoned from the quarter hour the database is in)
await weather([[CUR - 200, "storm"], [CUR - 199, "drizzle"], [CUR - 198, "cloudy"], [CUR - 5000, "rain"], [CUR - 7000, "rain"]]);
r = await call("anon", "town_sky");
const dbSlot = Math.floor(r.now / SLOT);
t.check("the quarter hours told begin two hours back; the wet ones are told from sixty days back at the most",
  r.slots.every((x) => x[0] >= dbSlot - 8) && r.slots.length === 5 && same(r.wet, [CUR - 5000, CUR - 200, CUR - 199, CUR, CUR + 2]), { first: r.slots?.[0], n: r.slots?.length, wet: r.wet });
r = await call("anon", "town_sky", (CUR - 199) * SLOT + 5);
t.check("…and only since the moment asked from", same(r.wet, [CUR - 199, CUR, CUR + 2]), r.wet);
r = await call("anon", "town_sky", null);
t.check("…a null for it is taken as the beginning", same(r.wet, [CUR - 5000, CUR - 200, CUR - 199, CUR, CUR + 2]), r.wet);
v = await t.sql(`select town.wet_ms($1, $2)::int as whole, town.wet_ms($3, $4)::int as part, town.wet_ms($2, $1)::int as back, town.raining($5) as now_, town.raining($6) as later`,
  [(CUR - 200) * SLOT + 300000, (CUR + 1) * SLOT, CUR * SLOT + 60000, CUR * SLOT + 180000, CUR * SLOT + 1, (CUR + 1) * SLOT + 1]);
t.check("rain is measured by the part of each wet quarter hour between two moments", same(v.rows[0], { whole: 3 * SLOT - 300000, part: 120000, back: 0, now_: true, later: false }), v.rows);

t.section("rain on a plot");
const never = "(town.now_ms() + 365::bigint * 86400000)";
const plantAt = (x, y, by, crop, sownMs, more = "") => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled',
  jsonb_build_object('by', $3::text, 'crop', $4::text, 'sown', $5::bigint, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', ${never}, 'cured', 0, 'picked', 0, 'pickedAt', 0) ${more}, town.now_ms())
  on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant`, [x, y, by, crop, sownMs]);
await tick();
// it rains now, and has for the last two hours (eight quarter hours and the part of this one that is gone), and goes on
await weather(Array.from({ length: 12 }, (_, i) => [CUR - 8 + i, "rain"]));
// a morning glory (six hours) sown 5 h 5 min ago: not ripe by the clock, ripe with an hour of rain's growth and a little
await plantAt(134, 5, U.m2, "kangkong", NOW - (5 * 60 + 5) * 60000);
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of(134, 5), $1, town.now_ms(), 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended`, [U.m2]);
v = await t.sql(`select town.see('134,5', jsonb_build_object('soil', soil, 'plant', plant), town.now_ms()) as seen, town.grown(plant, town.now_ms()) as grown from public.town_plots where x = 134 and y = 5`);
t.check("a plant two hours in the rain has grown an hour more than the clock says, and is ripe for it", v.rows[0].seen.ripe === true && v.rows[0].seen.wet === true && v.rows[0].grown >= 6 && v.rows[0].grown < 6.4, v.rows[0]);
await purse(U.m2, 0, []);
r = await call(U.m2, "town_tend", 134, 5, null);
t.check("…and its owner picks it", r.ok === true && r.deed === "pick" && r.got[0][0] === "kangkong", r.ok ? r.got : r);
// a cabbage sown an hour ago, in the same rain: wet, and a can has nothing to do
await plantAt(135, 5, U.m2, "cabbage", NOW - 3600000);
await purse(U.m1, 0, [{ item: "can", n: 1, water: 5 }], 100, { hand: "can" });
r = await call(U.m1, "town_tend", 135, 5, null);
p = await kept(U.m1);
t.check("while it rains a can waters nothing: the plot is wet, and no water is used", r.ok === false && p.bag[0].water === 5 && p.stamina.left === 100, r);
v = await t.sql(`select town.deed_for('135,5', jsonb_build_object('soil', soil, 'plant', plant), 'can', $1, town.now_ms(), $2) as deed from public.town_plots where x = 135 and y = 5`, [U.m1, U.m2]);
t.check("…it is not offered", v.rows[0].deed === null, v.rows);
// the rain stops: the same plot, the same can
await tick();
await weather([[CUR - 1, "rain"], [CUR, "cloudy"], [CUR + 1, "cloudy"]]);
r = await call(U.m1, "town_tend", 135, 5, null);
p = await kept(U.m1);
t.check("when it has stopped, the can waters as ever", r.ok === true && r.deed === "water" && p.bag[0].water === 4, r.ok ? r.deed : r);
v = await t.sql(`select (plant->>'boost')::float8 as boost from public.town_plots where x = 135 and y = 5`);
t.check("…and adds its half hour", v.rows[0].boost === 30 * 60000, v.rows);
// fog and cloud water nothing
await tick();
await weather(Array.from({ length: 12 }, (_, i) => [CUR - 8 + i, i % 2 ? "cloudy" : "fog"]));
await plantAt(136, 5, U.m2, "kangkong", NOW - (5 * 60 + 5) * 60000);
v = await t.sql(`select town.see('136,5', jsonb_build_object('soil', soil, 'plant', plant), town.now_ms()) as seen, town.raining(town.now_ms()) as raining, town.wet_ms(0, town.now_ms())::int as rain_ms from public.town_plots where x = 136 and y = 5`);
t.check("mist and cloud are no rain: nothing is wet, nothing grows the faster", v.rows[0].seen.ripe === false && v.rows[0].seen.wet === false && v.rows[0].raining === false && v.rows[0].rain_ms === 0, v.rows[0]);

t.section("a pest, in the rain");
{
  // a morning glory a pest comes to in its fifth or sixth hour, found by looking: with rain on it from its sowing it is
  // ripe by then (four hours of rain are six of growth), and a ripe plant is safe
  await tick();
  const found = await t.sql(`
    select k.key, s.sown, town.pest_at(k.key, town.fresh_plant(s.sown), s.sown + 8 * 3600000) as struck
      from (select x::text || ',' || y::text as key from generate_series(132, 138) x, generate_series(4, 10) y) k,
           (select (floor(town.now_ms() / 86400000.0)::bigint - d) * 86400000 + h * 3600000 as sown from generate_series(2, 9) d, generate_series(1, 4) h) s
     where town.pest_at(k.key, town.fresh_plant(s.sown), s.sown + 8 * 3600000) - s.sown between 4.25 * 3600000 and 5.75 * 3600000
     order by s.sown, k.key limit 1`.replaceAll("town.fresh_plant(s.sown)", "jsonb_build_object('by', 'x', 'crop', 'kangkong', 'sown', s.sown, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)"));
  const f = found.rows[0];
  t.check("there is a morning glory a pest comes to in its fifth or sixth hour, with no rain", !!f && Number(f.struck) > Number(f.sown), found.rows);
  if (f) {
    const sown = Number(f.sown), first = Math.floor(sown / SLOT);
    await weather(Array.from({ length: 36 }, (_, i) => [first + i, "rain"]));
    v = await t.sql(`select town.pest_at($1, p.plant, $2::bigint + 8 * 3600000) as struck, town.see($1, jsonb_build_object('soil', 'tilled', 'plant', p.plant), $2::bigint + 8 * 3600000) as seen
      from (select jsonb_build_object('by', 'x', 'crop', 'kangkong', 'sown', $2::bigint, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0) as plant) p`, [f.key, sown]);
    t.check("…and in the rain none comes: it was ripe before, and a ripe plant is safe", v.rows[0].struck === null && v.rows[0].seen.ripe === true && v.rows[0].seen.pest === false && v.rows[0].seen.dead === false, v.rows[0]);
  }
}

t.section("a line in the rain");
t.check("before the file, a line believed the browser: rain, because it said so", was.rain === "true", was);
await tick();
await purse(U.m1, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 5 }]);
await call(U.m1, "town_cast", "worm", was.place[0], was.place[1], true);
v = await t.sql(`select doc->>'rain' as rain from public.town_lines where member_id = $1`, [U.m1]);
t.check("after it, with no rain kept, a browser that says rain is not believed", v.rows[0].rain === "false", v.rows);
await weather([[CUR, "drizzle"], [CUR + 1, "storm"]]);
await call(U.m1, "town_cast", "worm", was.place[0], was.place[1], false);
v = await t.sql(`select doc->>'rain' as rain from public.town_lines where member_id = $1`, [U.m1]);
t.check("…and in the rain a line is in the rain, whatever the browser says", v.rows[0].rain === "true", v.rows);
r = await t.as(U.unver, `select public.town_cast('worm', $1, $2, false) as r`, was.place);
t.check("who may fish is as it was: nobody without a proved character", r.code === "42501", r);

t.section("each is the one that ran, word for word, but for the rain");
const words = (sql, name) => { const at = sql.indexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("\n$$;", at)); };
const but = (was, pairs) => pairs.reduce((s, [a, b]) => (s && s.includes(a) ? s.replace(a, () => b) : null), was);
{
  const was110 = migration(110), was108 = migration(108);
  t.check("grown is v110's, with the rain added", but(words(was110, "town.grown"), [
    ["      + p.boost) / 3600000::double precision", "      + p.boost\n      + town.wet_ms(p.sown, p_now)::double precision * (w.f->>'adds')::double precision / (w.f->>'every')::double precision) / 3600000::double precision"],
    ["(p_plant->>'boost')::double precision as boost) p", "(p_plant->>'boost')::double precision as boost) p,\n         (select town.cat('farming')->'water' as f) w"],
  ]) === words(FILE, "town.grown"));
  t.check("pest_at is v110's, with the rain in whether the plant was ripe", but(words(was110, "town.pest_at"), [
    ["  guard bigint := (p_plant->>'guard')::bigint;", "  guard bigint := (p_plant->>'guard')::bigint;\n  adds double precision := (f->'water'->>'adds')::double precision;\n  every double precision := (f->'water'->>'every')::double precision;"],
    ["          + boost) / 3600000::double precision >= hours end;", "          + boost\n          + town.wet_ms(sown, t)::double precision * adds / every) / 3600000::double precision >= hours end;"],
  ]) === words(FILE, "town.pest_at"));
  t.check("see is v110's, wet in the rain too", but(words(was110, "town.see"), [
    ["(f->'water'->>'every')::bigint * 60000);", "(f->'water'->>'every')::bigint * 60000 or town.raining(p_now));"],
  ]) === words(FILE, "town.see"));
  t.check("deed_for is v110's, less the hoe's refusal in a bed that is somebody's", but(words(was110, "town.deed_for"), [
    ["    return case when not mine then null when dead then 'pull' when p <> 'null'::jsonb then null", "    return case when dead then 'pull' when p <> 'null'::jsonb then null"],
  ]) === words(FILE, "town.deed_for"));
  t.check("town_cast is v108's, the rain this clock's", but(words(was108, "public.town_cast"), [
    ["town.cast_line(p_bait, hour, coalesce(p_rain, false),", "town.cast_line(p_bait, hour, town.raining(now_),"],
    ["'hour', hour, 'rain', coalesce(p_rain, false),", "'hour', hour, 'rain', town.raining(now_),"],
  ]) === words(FILE, "public.town_cast"));
}

t.section("a hoe in a neighbour's bed");
{
  await tick();
  const bedRow = () => one(`select member_id, tended, empty from public.town_beds where bed = town.bed_of(148, 5)`);
  const keptBed = await bedRow();
  t.check("before the file, a hoe had nothing to do in a bed that was somebody's", was.hoe.ok === false && was.hoe.why === "theirs", was.hoe);
  await purse(U.guest, 0, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 2 }], 100, { hand: "hoe" });
  r = await call(U.guest, "town_tend", 149, 5, JSON.stringify({ hits: 3, misses: 0, secs: 3 }));
  p = await kept(U.guest);
  t.check("after it, somebody else clears the weeds there, for the stamina it costs anybody", r.ok === true && r.deed === "clear" && p.stamina.left === 98, r.ok ? { deed: r.deed, left: p.stamina.left } : r);
  r = await call(U.guest, "town_tend", 149, 5, JSON.stringify({ hits: 3, misses: 2, secs: 5 }));
  p = await kept(U.guest);
  t.check("…and tills it, a miss of the hoe a point more each, as in a bed of one's own", r.ok === true && r.deed === "till" && r.misses === 2 && p.stamina.left === 94, r.ok ? { deed: r.deed, left: p.stamina.left } : r);
  t.check("the bed is still its owner's, and no more tended for it", same(await bedRow(), keptBed) && keptBed.member_id === U.m2, { was: keptBed, now: await bedRow() });
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'seedKangkong') where member_id = $1`, [U.guest]);
  r = await call(U.guest, "town_tend", 149, 5, null);
  t.check("sowing there is still the owner's alone", r.ok === false && r.why === "theirs" && count((await kept(U.guest)).bag, "seedKangkong") === 2, r);
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'hoe') where member_id = $1`, [U.guest]);
  r = await call(U.guest, "town_tend", 148, 5, null);
  t.check("a hoe does nothing to what grows there", r.ok === false && (await one(`select plant->>'crop' as crop from public.town_plots where x = 148 and y = 5`)).crop === "pumpkin", r);
  // with no stamina left it is still done (how hard the game is then is the browser's), and costs nothing there is none of
  await purse(U.guest, 0, [{ item: "hoe", n: 1 }], 0, { hand: "hoe" });
  r = await call(U.guest, "town_tend", 150, 5, JSON.stringify({ hits: 3, misses: 2, secs: 9 }));
  p = await kept(U.guest);
  t.check("with no stamina left it is done all the same, as in one's own bed", r.ok === true && r.deed === "clear" && p.stamina.left === 0, r.ok ? { deed: r.deed, left: p.stamina.left } : r);
  v = await t.sql(`select doc->>'what' as what, spent from public.town_plays where member_id = $1 and game = 'farming' order by id desc limit 1`, [U.guest]);
  t.check("…and written down as played with none", v.rows[0].what === "clear" && v.rows[0].spent === true, v.rows);
  // a dead plant of somebody's: pulled up by anybody
  await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (151, 5, town.bed_of(151, 5), 'tilled', $1::jsonb, town.now_ms()) on conflict (x, y) do update set plant = excluded.plant`, [JSON.stringify(await deadPlant())]);
  await purse(U.guest, 0, [{ item: "hoe", n: 1 }], 100, { hand: "hoe" });
  r = await call(U.guest, "town_tend", 151, 5, null);
  t.check("what has died there is pulled up by anybody", r.ok === true && r.deed === "pull", r.ok ? r.deed : r);
}

t.section("what a line brings up, sold");
t.check("before the file, an old boot and an old chest were nobody's to sell", was.boot.ok === false && was.boot.why === "unwanted" && was.chest.ok === false && was.chest.why === "unwanted", was);
await purse(U.m1, 0, [{ item: "boot", n: 2 }, { item: "chest", n: 1 }, { item: "hyacinth", n: 3 }]);
r = await call(U.m1, "town_leave", 0, 2);
p = await kept(U.m1);
t.check("two old boots are left with the uncle, at three coins each", r.ok === true && p.left.length === 1 && p.left[0].item === "boot" && p.left[0].n === 2 && p.left[0].pays === 3 && count(p.bag, "boot") === 0, r.ok ? p.left : r);
r = await call(U.m1, "town_leave", 1, 1);
p = await kept(U.m1);
t.check("…and an old chest at twenty", r.ok === true && p.left.some((l) => l.item === "chest" && l.pays === 20), r.ok ? p.left : r);
r = await call(U.m1, "town_leave", 2, 3);
p = await kept(U.m1);
t.check("…a hyacinth at two, as before", r.ok === true && p.left.some((l) => l.item === "hyacinth" && l.pays === 2 && l.n === 3), r.ok ? p.left : r);
await purse(U.m2, 0, [{ item: "boot", n: 1 }]);
r = await call(U.m2, "town_open", 0);
t.check("a boot is still opened, by whoever would sooner look inside", r.ok === true && count((await kept(U.m2)).bag, "boot") === 0, r);

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{boot,pays}', '9') where key = 'items'`);
await tick();
await weather([[CUR, "drizzle"], [CUR + 1, "storm"]]);
const keptRows = (await one(`select count(*)::int as n, string_agg(sky, ',' order by slot) as skies from public.town_weather`));
await t.run(FILE, "v118 a third time");
v = await t.sql(`select (data->'boot'->>'pays')::int as boot, (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written from public.town_catalog where key = 'items'`);
t.check("run again, it writes its one row over again, as its head says: a number changed by hand in it is put back", v.rows[0].boot === 3 && v.rows[0].written === "items", v.rows);
v = await t.sql(`select count(*)::int as n, string_agg(sky, ',' order by slot) as skies from public.town_weather`);
t.check("…and the weather kept is kept: every quarter hour as it was", same(v.rows[0], keptRows) && keptRows.n === 2, { was: keptRows, now: v.rows[0] });
r = await t.as(U.m1, `insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'storm', 1, 1, 9)`, [CUR + 2]);
t.check("…and still no member's to write", r.code === "42501", r);

await t.done();
