/*
 * v120 — a quicker bite, and time to strike: dry run in PGlite.
 *
 * v120 writes three rows of the catalog over, for fishing: every wait for a bite halved (`fish`, `flotsam`), and
 * with no stamina left 0.6 of a strike's moment again (0.96 s), where v117 left it 0.3 (`fishing`). v105 to v119 are
 * replayed as they ran, v120 is run twice. Then:
 *
 *   · every rule case made from the code as it is now is put to the SQL, and must come back as the code answers it
 *     (a line dropped among them: cast_line; and the strike's moment: strike_window), and the farm's cases again
 *     under five skies;
 *   · the file's closing block; that of the whole catalog 39 entries moved, each wait to its half, and a number an
 *     admin changed by hand in another row is as it was;
 *   · a line dropped: the least and the most a fish may take, the same casts before the file and after, and a
 *     member's own cast;
 *   · the moment to strike in, for tired hands and fed ones, with a meal that sharpens the eye and a better float;
 *   · a strike judged by the database's clock, on either side of the old moment and of the new one;
 *   · run a third time.
 *
 *   node v120.test.mjs            (RULES=0 skips the cases without rain, RAIN=0 those with; VECTORS=next reads ./next)
 *   node mutate.mjs <the file> v120.test.mjs v120.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v120_"));
const HERE = new URL("./v120_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(120);
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
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here too"') where key = 'carries'`);
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
/** Put quarter hours of weather in the table, as the editor: each [slot, sky]. */
const weather = async (rows) => {
  for (let i = 0; i < rows.length; i += 4000) {
    const part = rows.slice(i, i + 4000);
    await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain)
      select s, k, 8, 16, case when k in ('rain', 'storm') then 2.5 when k = 'drizzle' then 0.2 else 0 end
        from unnest($1::bigint[], $2::text[]) as x(s, k) on conflict (slot) do nothing`, [part.map((r) => r[0]), part.map((r) => r[1])]);
  }
};

const windowOf = async (who) => Number((await one(`select town.strike_window(doc, town.now_ms()) as w from public.town_purses where member_id = $1`, [who])).w);
const near = (a, b) => Math.abs(a - b) < 1e-9;
/** A line dropped by the rules themselves, with these rolls: what takes it, and after how long. */
const castOf = async (bait, hour, rolls) => (await one(`select town.cast_line($1::text, $2::int, false, false, false, (select array_agg(x::float8 order by ord) from jsonb_array_elements_text($3::jsonb) with ordinality as e(x, ord))) as c`, [bait, hour, JSON.stringify(rolls)])).c;
/** Six hundred lines dropped with a worm at noon, the same six hundred every time: the shortest wait, the longest, and the mean. */
const sixHundred = async () => one(`select min((c->>'wait')::int)::int as least, max((c->>'wait')::int)::int as most, avg((c->>'wait')::int)::float8 as mean, count(*)::int as n
  from generate_series(1, 600) i, lateral (select town.cast_line('worm', 12, false, false, false, array[mod(i * 0.6180339887, 1)::float8, mod(i * 0.7548776662, 1)::float8, mod(i * 0.5698402910, 1)::float8, mod(i * 0.4142135624, 1)::float8, mod(i * 0.3247179572, 1)::float8, mod(i * 0.2360679775, 1)::float8]) as c) x`);

// as it stands before the file: 0.48 s to strike in with no stamina, 1.6 s with some; a minnow in 5 to 30 s
await purse(U.m1, 0, [{ item: "rod", n: 1 }], 100);
await purse(U.m2, 0, [{ item: "rod", n: 1 }], 0);
const was = {
  tired: await windowOf(U.m2), fed: await windowOf(U.m1),
  soonest: await castOf("worm", 12, [0, 0, 0, 0, 0, 0]), latest: await castOf("worm", 12, [0, 0.9999999, 0, 0, 0, 0]),
  many: await sixHundred(),
};

await t.runTwice(FILE, "v120");

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

let v, r;
const half = (pair) => pair.map((x) => Math.ceil(x / 2));
t.section("what it should say afterwards (the file's closing block)");
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes three rows over, and leaves the other fifteen as they were", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === "fish, fishing, flotsam" && v.rows.length === before.length && v.rows.length === 18, v.rows.filter((x) => x.written).map((x) => x.key));
v = await t.sql(`select (select data->'minnow'->'wait' from public.town_catalog where key = 'fish') as minnow,
         (select data->'catfish'->'wait' from public.town_catalog where key = 'fish') as catfish,
         (select data->'koi'->'wait' from public.town_catalog where key = 'fish') as koi,
         (select data->'hyacinth'->'wait' from public.town_catalog where key = 'flotsam') as hyacinth,
         (select max((f.value->'wait'->>1)::int) from public.town_catalog c, jsonb_each(c.data) f where c.key in ('fish', 'flotsam')) as longest`);
t.check("a minnow bites in 3 to 15 s, a catfish in 8 to 35, a koi in 30 to 120, hyacinth drifts in in 4 to 23; nothing takes longer than two minutes",
  same(v.rows[0], { minnow: [3, 15], catfish: [8, 35], koi: [30, 120], hyacinth: [4, 23], longest: 120 }), v.rows);
v = await t.sql(`select data->'spent' as spent, data->'strike' as strike, data->'slack' as slack from public.town_catalog where key = 'fishing'`);
t.check("with no stamina 0.6 of the strike's moment is left, of 1.6 s; the slack for the two clocks is as it was", same(v.rows[0], { spent: 0.6, strike: 1.6, slack: { late: 1500, early: 300 } }), v.rows);

t.section("nothing else moved");
{
  const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
  const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
  const moved = [];
  for (const row of after) {
    const a = flat(before.find((b) => b.key === row.key).data), b = flat(row.data);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) moved.push(`${row.key}.${k}: ${a[k]} → ${b[k]}`);
  }
  // what was to move: every wait there was before the file, to its half (a half second rounded up), and the tired strike
  const want = ["fishing.spent: 0.3 → 0.6"];
  for (const key of ["fish", "flotsam"]) for (const [id, f] of Object.entries(before.find((b) => b.key === key).data)) want.push(`${key}.${id}.wait: ${JSON.stringify(f.wait)} → ${JSON.stringify(half(f.wait))}`);
  t.check("of the whole catalog 39 entries differ: every wait to its half, and the tired strike", want.length === 39 && same([...moved].sort(), [...want].sort()), { moved: moved.length, odd: moved.filter((m) => !want.includes(m)).concat(want.filter((w) => !moved.includes(w))).slice(0, 6) });
  v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'carries'`);
  t.check("a number an admin changed by hand in a row it does not write is as it was", v.rows[0].note === "an admin was here too", v.rows);
}

t.section("a line dropped");
t.check("before the file, a minnow took the worm in 5 s at the soonest and 30 at the latest", was.soonest.what === "minnow" && was.soonest.wait === 5 && was.latest.what === "minnow" && was.latest.wait === 30, { soonest: was.soonest, latest: was.latest });
r = await castOf("worm", 12, [0, 0, 0, 0, 0, 0]);
t.check("after it, in 3 s at the soonest", r.what === "minnow" && r.wait === 3, r);
r = await castOf("worm", 12, [0, 0.9999999, 0, 0, 0, 0]);
t.check("…and 15 at the latest", r.what === "minnow" && r.wait === 15, r);
r = await castOf("worm", 12, [0, 0.9999999, 0.9, 0.5, 0.1, 0.5]);
t.check("a nibble is still three seconds from the bite and from another, or is not there", r.nibbles.every((n, i, all) => n >= 3 && r.wait - n >= 3 && (i === 0 || n - all[i - 1] >= 3)), r);
{
  const now = await sixHundred();
  t.check("the same six hundred lines, a worm at noon: none waits less than 3 s, and the longest waits half as long as it did",
    now.n === 600 && now.least >= 3 && now.least <= 4 && now.most === Math.ceil(was.many.most / 2) && was.many.most >= 50, { was: was.many, now });
  t.check("…and on the whole a bite comes in half the time", now.mean > was.many.mean * 0.47 && now.mean < was.many.mean * 0.55, { was: was.many.mean, now: now.mean });
}

t.section("the moment to strike in");
t.check("before the file, a strike with no stamina had 0.48 s; with stamina 1.6", near(was.tired, 0.48) && near(was.fed, 1.6), was);
t.check("after it, 0.96 s with none", near(await windowOf(U.m2), 0.96), await windowOf(U.m2));
t.check("…and 1.6 s as ever with some", near(await windowOf(U.m1), 1.6), await windowOf(U.m1));
await purse(U.guest, 0, [{ item: "rod", n: 1 }, { item: "floatBell", n: 1 }], 0);
t.check("a bell float makes a tired moment half as long again, as it does a fed one: 1.44 s", near(await windowOf(U.guest), 1.44), await windowOf(U.guest));
await purse(U.guest, 0, [{ item: "rod", n: 1 }, { item: "floatBell", n: 1 }], 100);
t.check("…2.4 s with stamina, as ever", near(await windowOf(U.guest), 2.4), await windowOf(U.guest));
{
  const keen = await one(`select town.strike_window(doc || jsonb_build_object('buff', jsonb_build_object('id', 'keen', 'until', town.now_ms() + 3600000)), town.now_ms()) as w, town.buff_of(doc || jsonb_build_object('buff', jsonb_build_object('id', 'keen', 'until', town.now_ms() + 3600000)), town.now_ms()) as buff from public.town_purses where member_id = $1`, [U.m2]);
  t.check("a meal that sharpens the eye helps tired hands too: half as long again, 1.44 s", keen.buff === "keen" && near(Number(keen.w), 1.44), keen);
}

t.section("a member's own line, and a strike by the database's clock");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (0);
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$`);
const NOON = Date.parse("2026-10-05T12:00:00+07:00");
const clock = async (ms) => { await t.sql(`update town.test_clock set ms = ${ms}`); };
const setLine = async (who, doc) => { await t.sql(`insert into public.town_lines (member_id, doc) values ($1, $2::jsonb) on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify(doc)]); };
const lineOf = async (who) => (await t.sql(`select doc from public.town_lines where member_id = $1`, [who])).rows[0]?.doc ?? null;
const lastPlay = async (who) => (await t.sql(`select won, spent, doc->>'how' as how from public.town_plays where member_id = $1 order by id desc limit 1`, [who])).rows[0] ?? null;
{
  // a member drops a line a dozen times: each is told a wait, and it is what the thing on the line may take now
  await clock(NOON);
  await purse(U.m1, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 20 }], 100, { hand: "rod" });
  const odd = [];
  let casts = 0;
  for (let i = 0; i < 12; i++) {
    await t.sql(`delete from public.town_lines where member_id = $1`, [U.m1]);
    r = await call(U.m1, "town_cast", "worm", 16, 38, false);
    const kept = await lineOf(U.m1);
    if (!r.ok || !kept) { odd.push(r); continue; }
    casts++;
    const row = await one(`select coalesce(town.cat('fish')->$1->'wait', town.cat('flotsam')->$1->'wait') as wait`, [kept.what]);
    if (!(r.line.wait === kept.wait && Number.isInteger(kept.wait) && kept.wait >= row.wait[0] && kept.wait <= row.wait[1] && kept.wait <= 30 && kept.bites_at === kept.cast_at + kept.wait * 1000)) odd.push({ told: r.line.wait, kept: { what: kept.what, wait: kept.wait }, row: row.wait });
  }
  t.check("a member's line, dropped a dozen times with a worm at noon: each is told a wait within what the thing on it takes now, none over half a minute", casts === 12 && odd.length === 0, { casts, odd: odd.slice(0, 3) });
  await t.sql(`delete from public.town_lines where member_id = $1`, [U.m1]);
}
const out = (what, size) => ({ what, size, wait: 20, nibbles: [8], bait: "worm", x: 16, y: 38, deep: true, hour: 12, rain: false, cast_at: NOON, bites_at: NOON + 20_000, struck_at: null });
/** A strike so many thousandths of a second after the bite, by a member with so much stamina, a line with a minnow on it out. */
const strikeAt = async (who, left, after) => {
  await clock(NOON);
  await purse(who, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 4 }], left);
  await setLine(who, out("minnow", 6.2));
  await clock(NOON + 20_000 + after);
  return call(who, "town_strike", after);
};
r = await strikeAt(U.m2, 0, 900);
t.check("with no stamina, a strike 0.9 s after the bite hooks the fish: the page takes it now, and so does the database", r.ok === true && r.hooked === true && r.what === "minnow" && r.landed === false, r);
v = await lineOf(U.m2);
t.check("…the line is kept, struck by tired hands", v?.struck_at === NOON + 20_900 && v.reaction === 900 && v.spent === true, v);
r = await strikeAt(U.m2, 0, 960 + 1500);
t.check("with none, at the end of the moment (0.96 s) and of the slack after it (1.5 s), it still hooks", r.ok === true && r.hooked === true && r.what === "minnow", r);
r = await strikeAt(U.m2, 0, 960 + 1500 + 1);
t.check("with none, a thousandth of a second past that it is missed: nothing hooked, the line gone", r.ok === true && r.hooked === false && r.how === "missed" && (await lineOf(U.m2)) === null, r);
v = await lastPlay(U.m2);
t.check("…and written down as a go with no stamina that was missed", v?.how === "missed" && v.won === false && v.spent === true, v);
r = await strikeAt(U.m2, 0, 480 + 1500 + 1);
t.check("with none, just past what was the end of it (0.48 s and the slack) it hooks now", r.ok === true && r.hooked === true, r);
r = await strikeAt(U.m2, 0, -301);
t.check("with none, well before the bite is too soon, as ever", r.ok === true && r.hooked === false && r.how === "early", r);
r = await strikeAt(U.m1, 100, 1600 + 1500);
t.check("with stamina, the moment is as it was: at 1.6 s and the slack it hooks", r.ok === true && r.hooked === true, r);
r = await strikeAt(U.m1, 100, 1600 + 1500 + 1);
t.check("…and a thousandth past it is missed", r.ok === true && r.hooked === false && r.how === "missed", r);
r = await t.as("anon", `select public.town_strike(100) as r`);
t.check("nobody signed out may strike, as ever", r.code === "42501", r);
r = await t.as("anon", `select public.town_cast('worm', 16, 38, false) as r`);
t.check("…nor drop a line", r.code === "42501", r);
await t.sql(`delete from public.town_lines`);

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{spent}', '0.9') where key = 'fishing'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{minnow,wait}', '[1, 2]') where key = 'fish'`);
await t.run(FILE, "v120 a third time");
v = await t.sql(`select (select (data->>'spent')::float8 from public.town_catalog where key = 'fishing') as spent, (select data->'minnow'->'wait' from public.town_catalog where key = 'fish') as minnow,
  (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written`);
t.check("run again, it writes its three rows over again, as its head says: numbers changed by hand in them are put back", v.rows[0].spent === 0.6 && same(v.rows[0].minnow, [3, 15]) && v.rows[0].written === "fish, fishing, flotsam", v.rows);
v = await t.sql(`select count(*)::int as n, (select data->>'note' from public.town_catalog where key = 'carries') as note from public.town_catalog`);
t.check("…and there are eighteen rows still, the admin's note in the row it does not write among them", v.rows[0].n === 18 && v.rows[0].note === "an admin was here too", v.rows);

await t.done();
