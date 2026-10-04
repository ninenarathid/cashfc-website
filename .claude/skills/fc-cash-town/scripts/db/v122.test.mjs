/*
 * v122 — twenty fish from other waters: dry run in PGlite.
 *
 * v122 writes ten rows of the catalog over (the twenty fish, what they are eaten, cooked and made into, what three of
 * them do to a plant, what two of them hold, what the uncle may ask for and hint at) and writes the rule of what
 * takes a bait again: a fish may keep to the bank or the deck, bite only in the rain or never in it, and wait for a
 * sign (no stamina left, a crowd of lines, the weekend, the rain's end, a full moon). v105 to v121 are replayed as
 * they ran, v122 is run twice. Then:
 *
 *   · every rule case made from the code as it is now is put to the SQL, and must come back as the code answers it
 *     (what bites under every sign, a line dropped, when a sign holds, a fish put on a plant, a fish opened, a fish
 *     eaten, a thing made of one), and the farm's cases again under five skies;
 *   · the file's closing block; every row of the catalog is the code's; of the whole catalog 91 entries differ, and
 *     nothing that was there is changed but the catfish's baits and the lists the new things are in;
 *   · where no new fish swims (the later tiers' baits) what bites is what bit before the file, to the last digit;
 *   · the three functions written again are the ones they replace but for the lines meant, and no other is touched;
 *   · a member's own line under each sign, by the database's clock, its weather and the others' lines;
 *   · what the fish are for, through the functions a member calls: on a plant, opened, eaten, made into something;
 *   · run a third time.
 *
 *   node v122.test.mjs            (RULES=0 skips the cases without rain, RAIN=0 those with; VECTORS=next reads ./next)
 *   node mutate.mjs <the file> v122.test.mjs v122.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v122_"));
const HERE = new URL("./v122_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(122);
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
// the catalog as the code gives it now, written beside the cases
const CODE = JSON.parse(readFileSync(new URL(`./${DIR}/catalog.json`, import.meta.url), "utf8"));

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
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here too"') where key = 'carries'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;

const SLOT = 900000, MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const near = (a, b) => Math.abs(a - b) < 1e-9;
/** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
const purse = (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
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
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));
/** The lines of one text that are not in the other, in order (the longest run they share is left out). */
function differ(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const gone = [], more = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) gone.push(A[i++]); else more.push(B[j++]);
  }
  while (i < n) gone.push(A[i++]);
  while (j < m) more.push(B[j++]);
  return { gone, more };
}

// as it stands before the file: what bites on the later tiers' baits, where none of the twenty swims (every hour, in
// rain and out of it, lucky or not, off the deck and off the bank)
const LATER_BAITS = ["cricket", "branBait", "shrimpLive", "antEggs", "lure", "fermentedBait"];
const oldOdds = (await t.sql(`select b, h, r, l, s, town.odds(b, h, r, l, s) as o
  from unnest($1::text[]) b, generate_series(0, 23) h, unnest(array[false, true]) r, unnest(array[false, true]) l, unnest(array[false, true]) s order by 1, 2, 3, 4, 5`, [LATER_BAITS])).rows;
const textsWas = await texts();

await t.runTwice(FILE, "v122");
const textsNow = await texts();

const TEXTS = (n) => `(select coalesce(array_agg(x order by ord), '{}'::text[]) from jsonb_array_elements_text($${n}::jsonb) with ordinality as e(x, ord))`;
const FLOATS = (n) => `(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($${n}::jsonb) with ordinality as e(x, ord))`;
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
  odds: `town.odds($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${TEXTS(6)})`,
  cast_line: `town.cast_line($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${TEXTS(6)}, ${FLOATS(7)})`,
  signs_of: "to_jsonb(town.signs_of($1::bigint, $2::boolean, $3::int, $4::bigint, $5::boolean))",
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
  open: `town.open($1::jsonb, $2::int, ${FLOATS(3)})`,
  tidy_give: "town.tidy_give($1::jsonb)", has_all: "town.has_all($1::jsonb, $2::jsonb)", side_of: "town.side_of($1::jsonb, $2::text)",
  lay: "town.lay($1::jsonb, $2::text, $3::jsonb, $4::jsonb, $5::numeric)", agree: "town.agree($1::jsonb, $2::text, $3::boolean)",
  pull: "town.pull($1::jsonb, $2::jsonb)", push: "town.push($1::jsonb, $2::jsonb)", swap: "town.swap($1::jsonb, $2::jsonb, $3::jsonb)",
  roomy: "town.roomy($1::jsonb)",
};
const param = (fn, i, v) => (v === null ? null : fn === "roll" && i === 1 ? `{${v.join(",")}}` : typeof v === "object" ? JSON.stringify(v) : v);

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
const TEN = ["cooking", "dishes", "farming", "fish", "fishing", "hints", "items", "makes", "order", "scrolls"];
const TWENTY = ["loach", "mosquitofish", "mussel", "crayfish", "goldfish", "carp", "piranha", "herring", "archerfish", "pacu", "pike", "nilePerch", "salmon", "wels", "gar", "arapaima", "dozyFish", "popotoFish", "rainbowFish", "moonFish"];
const WAITERS = ["dozyFish", "popotoFish", "rainbowFish", "moonFish", "goldfish"], BANK = ["loach", "mosquitofish", "mussel", "crayfish", "goldfish"];
const DISHES = ["fishChips", "ukha", "thieboudienne", "piranhaSoup", "crawfishBoil", "masgouf", "salmonSteak", "arapaimaRoast"];
const SEEDS = ["seedGarlic", "seedBasil", "seedTomato", "seedCorn", "seedDaikon", "seedSweetPotato"];

t.section("what it should say afterwards (the file's closing block)");
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes ten rows over, and leaves the other eight as they were", same(v.rows.filter((x) => x.written).map((x) => x.key), TEN) && v.rows.length === before.length && v.rows.length === 18, v.rows.filter((x) => x.written).map((x) => x.key));
v = await t.sql(`select (select count(*) from jsonb_object_keys(c.data))::int as n, c.key from public.town_catalog c where c.key in ('items', 'fish', 'dishes', 'scrolls', 'makes') order by c.key`);
t.check("there are 351 things, 52 fish, 78 things to eat, 75 scrolls, 24 things made", same(Object.fromEntries(v.rows.map((x) => [x.key, x.n])), { dishes: 78, fish: 52, items: 351, makes: 24, scrolls: 75 }), v.rows);
v = await t.sql(`select data->'signs' as signs, jsonb_array_length(data->'fish') as fish, data->'baits' ? 'loach' as loach, data->'floats' as floats from public.town_catalog where key = 'fishing'`);
t.check("the signs' numbers are kept, a loach is a bait, a glowing float is a float",
  same(v.rows[0], { signs: { moon: 1.5, after: 30, crowd: 2, lately: 300, weekend: [0, 6] }, fish: 52, loach: true, floats: { floatBell: 1.5, floatGlow: 1.15, floatQuill: 1.25 } }), v.rows);
v = await t.sql(`select p.proname, pg_get_function_identity_arguments(p.oid) as args from pg_proc p
  where p.pronamespace = 'town'::regnamespace and p.proname in ('odds', 'cast_line', 'signs_of') order by 1`);
t.check("one rule of each name: what bites takes the signs as its sixth word, a line dropped as its sixth of seven; the two as they were are gone", same(v.rows, [
  { proname: "cast_line", args: "p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[]" },
  { proname: "odds", args: "p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[]" },
  { proname: "signs_of", args: "p_now bigint, p_spent boolean, p_others integer, p_wet bigint, p_rain boolean" }]), v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
  (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open,
  has_function_privilege('anon', 'public.town_cast(text, integer, integer, boolean)', 'execute') as anon_casts,
  has_function_privilege('authenticated', 'public.town_cast(text, integer, integer, boolean)', 'execute') as member_casts`);
t.check("the rules are no browser's to call, and a line is a member's to drop", same(v.rows[0], { member_has_rules: false, open: 0, anon_casts: false, member_casts: true }), v.rows);
v = await t.sql(`select (select string_agg(o->>'what', ', ') from jsonb_array_elements(town.odds('worm', 12, false, false, true, '{}')) o) as plain,
  (select string_agg(o->>'what', ', ') from jsonb_array_elements(town.odds('worm', 12, false, false, true, '{tired}')) o) as tired`);
t.check("on a worm off the bank at noon: the bank's own fish among the common ones, and the dozy one for somebody tired",
  v.rows[0].plain === "minnow, barb, perch, loach, mosquitofish, hyacinth, boot" && v.rows[0].tired === "minnow, barb, perch, loach, mosquitofish, dozyFish, hyacinth, boot", v.rows);
r = await t.as(U.m1, `select town.odds('worm', 12, false, false, false, '{}') as r`);
t.check("a member cannot ask the rule itself what bites", r.code === "42501", r);
r = await t.as(U.m1, `select town.signs_of(0, true, 9, 1, false) as r`);
t.check("…nor which signs hold", r.code === "42501", r);

t.section("nothing else moved");
const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
{
  const odd = after.filter((row) => !same(row.key === "carries" ? { ...row.data, note: undefined } : row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now, all eighteen", odd.length === 0 && after.length === 18 && Object.keys(CODE).length === 18, odd);
  // entry by entry: what is added, and what is written otherwise
  const added = [], changed = [];
  for (const row of after) {
    const was = before.find((b) => b.key === row.key).data;
    for (const k of Object.keys(row.data)) if (!(k in was)) added.push(`${row.key}.${k}`); else if (!same(was[k], row.data[k])) changed.push(`${row.key}.${k}`);
    for (const k of Object.keys(was)) if (!(k in row.data)) changed.push(`${row.key}.${k} (gone)`);
  }
  const wantAdded = [...TWENTY.map((f) => `fish.${f}`), ...TWENTY.map((f) => `items.${f}`), "items.hookScale", "items.floatGlow", ...DISHES.map((d) => `items.${d}`),
    ...DISHES.map((d) => `items.scroll${d[0].toUpperCase()}${d.slice(1)}`), ...DISHES.map((d) => `dishes.${d}`), "dishes.dozyFish", "dishes.rainbowFish",
    ...DISHES.map((d) => `scrolls.scroll${d[0].toUpperCase()}${d.slice(1)}`), "makes.hookScale", "makes.floatGlow", "makes.bowl", "fishing.signs"];
  const wantChanged = ["cooking.bowled", "cooking.inside", "cooking.needs", "cooking.recipes", "farming.tools", "fish.catfish", "fishing.baits", "fishing.fish", "fishing.floats", "hints.ids", "order.asks"];
  t.check("of the whole catalog 91 entries differ: eighty added, eleven written otherwise", added.length === 80 && same([...added].sort(), [...wantAdded].sort()) && same([...changed].sort(), wantChanged),
    { added: added.length, changed, odd: added.filter((a) => !wantAdded.includes(a)).concat(wantAdded.filter((a) => !added.includes(a))).slice(0, 8) });
  // of the eleven, nothing that was there is lost or moved: each list has what it had, in the order it had it
  const B = Object.fromEntries(before.map((b) => [b.key, b.data])), A = Object.fromEntries(after.map((a) => [a.key, a.data]));
  const within = (was, now) => { let i = 0; for (const x of now) if (i < was.length && same(x, was[i])) i++; return i === was.length; };
  const lost = [];
  if (!same(A.fishing.fish.slice(0, B.fishing.fish.length), B.fishing.fish)) lost.push("fishing.fish");
  for (const [key, list] of [["fishing.baits", "baits"]]) if (!within(B.fishing[list], A.fishing[list])) lost.push(key);
  if (!within(B.cooking.recipes, A.cooking.recipes) || !within(B.cooking.bowled, A.cooking.bowled)) lost.push("cooking.recipes/bowled");
  if (!within(B.hints.ids, A.hints.ids)) lost.push("hints.ids");
  // (the hints of the early game he was selling come first still, in their order; the eleven new ones after them and before the second tier's)
  const tier1 = (ids) => ids.filter(([id]) => A.items[id].tier === 1).map(([id]) => id);
  if (!same(tier1(A.hints.ids).slice(0, tier1(B.hints.ids).length), tier1(B.hints.ids)) || tier1(A.hints.ids).length !== tier1(B.hints.ids).length + 11) lost.push("hints.ids: the early game's order");
  for (const kind of ["fish", "crop", "made"]) if (!within(B.order.asks[kind], A.order.asks[kind])) lost.push(`order.asks.${kind}`);
  for (const [k, x] of Object.entries(B.cooking.needs)) if (!same(A.cooking.needs[k], x)) lost.push(`cooking.needs.${k}`);
  for (const [k, x] of Object.entries(B.farming.tools)) if (A.farming.tools[k] !== x) lost.push(`farming.tools.${k}`);
  for (const [k, x] of Object.entries(B.fishing.floats)) if (A.fishing.floats[k] !== x) lost.push(`fishing.floats.${k}`);
  for (const [k, x] of Object.entries(B.cooking.inside)) if (A.cooking.inside[k].chance !== x.chance || !within(x.scrolls, A.cooking.inside[k].scrolls)) lost.push(`cooking.inside.${k}`);
  const { loach, ...catfishBaits } = A.fish.catfish.baits;
  if (loach !== 0.5 || !same({ ...A.fish.catfish, baits: catfishBaits }, B.fish.catfish)) lost.push("fish.catfish");
  t.check("…and of those eleven, nothing that was there is lost or moved: each has what it had, in the order it had it, and something more", lost.length === 0, lost);
  t.check("the uncle asks for six of the twenty by themselves, and for nothing that is cooked or made of them",
    same(A.order.asks.fish.map(([id]) => id).filter((id) => TWENTY.includes(id)), ["loach", "mosquitofish", "mussel", "crayfish", "carp", "piranha"]) && same(A.order.asks.made, B.order.asks.made), A.order.asks.fish);
  v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'carries'`);
  t.check("a number an admin changed by hand in a row it does not write is as it was", v.rows[0].note === "an admin was here too", v.rows);
}

t.section("where no new fish swims, the water is as it was");
{
  const now = (await t.sql(`select b, h, r, l, s, town.odds(b, h, r, l, s, '{}') as o
    from unnest($1::text[]) b, generate_series(0, 23) h, unnest(array[false, true]) r, unnest(array[false, true]) l, unnest(array[false, true]) s order by 1, 2, 3, 4, 5`, [LATER_BAITS])).rows;
  const odd = now.filter((x, i) => JSON.stringify(x) !== JSON.stringify(oldOdds[i]));
  t.check(`on the later tiers' baits, what bites is what bit before the file, to the last digit: ${oldOdds.length} casts`, oldOdds.length === 1152 && now.length === 1152 && odd.length === 0, odd.slice(0, 2));
  const everySign = (await t.sql(`select b, h, r, l, s, town.odds(b, h, r, l, s, '{tired,crowd,weekend,after,full}') as o
    from unnest($1::text[]) b, generate_series(0, 23) h, unnest(array[false, true]) r, unnest(array[false, true]) l, unnest(array[false, true]) s order by 1, 2, 3, 4, 5`, [LATER_BAITS])).rows;
  t.check("…and under every sign at once it is the same water there", everySign.every((x, i) => JSON.stringify(x) === JSON.stringify(oldOdds[i])), everySign.find((x, i) => JSON.stringify(x) !== JSON.stringify(oldOdds[i])));
  v = await t.sql(`select town.odds('worm', 12, false, false, false, null) as a, town.odds('worm', 12, false, false, false, '{}') as b`);
  t.check("no signs said is no sign held", same(v.rows[0].a, v.rows[0].b), v.rows);
}

t.section("every function is the one it replaces, but for the lines meant");
{
  const OLD_ODDS = "town.odds(text,integer,boolean,boolean,boolean)", NEW_ODDS = "town.odds(text,integer,boolean,boolean,boolean,text[])";
  const OLD_CAST = "town.cast_line(text,integer,boolean,boolean,boolean,double precision[])", NEW_CAST = "town.cast_line(text,integer,boolean,boolean,boolean,text[],double precision[])";
  const MINE = "town_cast(text,integer,integer,boolean)";
  let d = differ(textsWas[OLD_ODDS] ?? "", textsNow[NEW_ODDS] ?? "x");
  t.check("what bites is v108's with a word more: of the old text three lines are written otherwise (its name, the bank's, the rain's)", same(d.gone, [
    "CREATE OR REPLACE FUNCTION town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean)",
    "    continue when p_shallow and f->>'tier' <> 'common';",
    "      * (case when p_rain then (f->>'rain')::double precision else 1::double precision end)"]) && d.more.length === 10 && d.more.includes("      * sky"), d);
  d = differ(textsWas[OLD_CAST] ?? "", textsNow[NEW_CAST] ?? "x");
  t.check("a line dropped is v108's with a word more: its name, and the signs handed on", same(d.gone, [
    "CREATE OR REPLACE FUNCTION town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_rnd double precision[])",
    "  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow);"]) && same(d.more, [
    "CREATE OR REPLACE FUNCTION town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[])",
    "  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs);"]), d);
  d = differ(textsWas[MINE] ?? "", textsNow[MINE] ?? "x");
  t.check("a member's line is v121's with every line kept but the cast and the deed, which take the signs", same(d.gone, [
    "  line := town.cast_line(p_bait, hour, town.raining(now_), coalesce(town.buff_of(purse, now_) = 'lucky', false), not deep::boolean,",
    "  perform town.note(me, 'cast', p_bait, 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y)));"]) && d.more.length === 9
    && d.more.includes("  line := town.cast_line(p_bait, hour, town.raining(now_), coalesce(town.buff_of(purse, now_) = 'lucky', false), not deep::boolean, signs,")
    && d.more.includes("  perform town.note(me, 'cast', p_bait, 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs)));"), d);
  const touched = [OLD_ODDS, OLD_CAST, MINE];
  const others = Object.keys(textsWas).filter((sig) => !touched.includes(sig) && textsWas[sig] !== textsNow[sig]);
  t.check("every other function, the rules among them, is its text from before to the letter", others.length === 0 && Object.keys(textsWas).length > 150, others);
  t.check("three are new (the two rules with a word more, and the signs), two are gone (the two rules as they were)",
    same(Object.keys(textsNow).filter((sig) => !(sig in textsWas)).sort(), [NEW_CAST, NEW_ODDS, "town.signs_of(bigint,boolean,integer,bigint,boolean)"].sort())
    && same(Object.keys(textsWas).filter((sig) => !(sig in textsNow)).sort(), [OLD_CAST, OLD_ODDS].sort()), { more: Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone: Object.keys(textsWas).filter((sig) => !(sig in textsNow)) });
}

/* ── a clock the test moves ──────────────────────────────────────────────── */

await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (0);
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$`);
let NOW = 0;
const clock = async (ms) => { NOW = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };
const at = (iso) => Date.parse(iso);
// a Monday noon with no moon to speak of (it is new on the tenth), a Saturday, and the night of the full moon (a Monday)
const MONDAY = at("2026-10-05T12:00:00+07:00"), SATURDAY = at("2026-10-03T12:00:00+07:00"), FULL = at("2026-10-26T21:00:00+07:00");
const DECK = [16, 38];
const bankAt = await one(`select split_part(p.key, ',', 1)::int as x, split_part(p.key, ',', 2)::int as y from jsonb_each((select data->'places' from public.town_catalog where key = 'fishing')) p where p.value = 'false'::jsonb order by 1, 2 limit 1`);
const BANK_TILE = [bankAt.x, bankAt.y];
const lineOf = async (who) => (await t.sql(`select doc from public.town_lines where member_id = $1`, [who])).rows[0]?.doc ?? null;
const lastCast = async (who) => (await t.sql(`select thing, doc, at from public.town_deeds where member_id = $1 and what = 'cast' order by id desc limit 1`, [who])).rows[0] ?? null;
/** So many lines dropped by a member, one after another, each from a full purse: what was on each, and the signs written beside the last. */
async function lines(who, bait, tile, many, left = 100, more = {}) {
  const what = [];
  let signs = null;
  for (let i = 0; i < many; i++) {
    await purse(who, 0, [{ item: "rod", n: 1 }, { item: bait, n: 3 }], left, { hand: "rod", ...more });
    await t.sql(`delete from public.town_lines where member_id = $1`, [who]);
    const got = await call(who, "town_cast", bait, tile[0], tile[1], false);
    if (!got.ok) return { what, signs, refused: got };
    what.push((await lineOf(who)).what);
    signs = (await lastCast(who)).doc.signs;
  }
  return { what, signs };
}
const has = (list, item) => list.includes(item), none = (list, items) => !list.some((x) => items.includes(x));
const othersOut = async (rows) => {
  await t.sql(`delete from public.town_lines where member_id <> $1`, [U.m1]);
  for (const [who, ago] of rows) await t.sql(`insert into public.town_lines (member_id, doc) values ($1, $2::jsonb)`, [who, JSON.stringify({ what: "minnow", size: 5, wait: 10, nibbles: [], bait: "worm", x: 16, y: 38, deep: true, hour: 12, rain: false, cast_at: NOW - ago, bites_at: NOW - ago + 10_000, struck_at: null })]);
};

t.section("a member's own line: the signs, by this clock, this purse, the others' lines and the rain that fell");
await t.sql(`select setseed(0.2261)`);
await clock(MONDAY);
await t.sql(`delete from public.town_lines`);
r = await lines(U.m1, "worm", DECK, 60);
t.check("a weekday noon, fed, alone, dry: no sign holds, and that is written beside the deed", same(r.signs, []) && r.what.length === 60, r.signs);
t.check("…and sixty such lines off the deck bring up nothing that waits for a sign, and nothing of the bank's", none(r.what, [...WAITERS, ...BANK]) && has(r.what, "minnow") && has(r.what, "piranha"), [...new Set(r.what)]);
r = await lines(U.m1, "worm", DECK, 60, 0);
t.check("with no stamina left the sign is the tired one's", same(r.signs, ["tired"]), r.signs);
t.check("…and the dozy fish is among sixty lines, a good many times", r.what.filter((x) => x === "dozyFish").length >= 6 && none(r.what, ["popotoFish", "rainbowFish", "moonFish", "goldfish"]), r.what.filter((x) => x === "dozyFish").length);
// the others' lines
await othersOut([[U.m2, 10_000], [U.admin, 299_000]]);
r = await lines(U.m1, "dough", DECK, 60);
t.check("two others' lines dropped within five minutes are a crowd", same(r.signs, ["crowd"]), r.signs);
t.check("…and the popoto fish is among sixty lines", r.what.filter((x) => x === "popotoFish").length >= 6 && none(r.what, ["dozyFish", "rainbowFish", "moonFish", "goldfish"]), r.what.filter((x) => x === "popotoFish").length);
await othersOut([[U.m2, 10_000]]);
r = await lines(U.m1, "dough", DECK, 30);
t.check("one other's line is no crowd", same(r.signs, []) && none(r.what, ["popotoFish"]), r);
await othersOut([[U.m2, 10_000], [U.admin, 300_000]]);
r = await lines(U.m1, "dough", DECK, 30);
t.check("nor two, one of them dropped five minutes ago", same(r.signs, []) && none(r.what, ["popotoFish"]), r);
await othersOut([[U.m2, 10_000], [U.admin, 20_000], [U.guest, 30_000]]);
r = await lines(U.m1, "dough", DECK, 5, 0);
t.check("three others, and no stamina: both signs, in the order the code lists them", same(r.signs, ["tired", "crowd"]), r.signs);
// my own line, still out, is no company: with one other's, a second line dropped over my first is no crowd
await othersOut([[U.m2, 10_000]]);
await purse(U.m1, 0, [{ item: "rod", n: 1 }, { item: "dough", n: 3 }], 100, { hand: "rod" });
await call(U.m1, "town_cast", "dough", DECK[0], DECK[1], false);
r = await call(U.m1, "town_cast", "dough", DECK[0], DECK[1], false);
v = await lastCast(U.m1);
t.check("my own line, still out, is no company: with one other's it is no crowd", r.ok === true && same(v.doc.signs, []), v);
await t.sql(`delete from public.town_lines`);
// the weekend, to the minute
{
  const edge = [];
  for (const [iso, want] of [["2026-10-02T23:59:59+07:00", []], ["2026-10-03T00:00:00+07:00", ["weekend"]], ["2026-10-04T23:59:59+07:00", ["weekend"]], ["2026-10-05T00:00:00+07:00", []]]) {
    await clock(at(iso));
    edge.push([iso, (await lines(U.m1, "dough", DECK, 1)).signs, want]);
  }
  t.check("Saturday and Sunday in Bangkok are the weekend, to the second: not Friday's last, nor Monday's first", edge.every(([, got, want]) => same(got, want)), edge);
}
await clock(SATURDAY);
r = await lines(U.m1, "dough", BANK_TILE, 60);
t.check("at the weekend a goldfish comes off the bank on dough", same(r.signs, ["weekend"]) && r.what.filter((x) => x === "goldfish").length >= 3, [...new Set(r.what)]);
t.check("…among the bank's own, and nothing of the deck's", has(r.what, "mosquitofish") && has(r.what, "mussel") && none(r.what, ["pacu", "pangasius", "piranha", "herring", "archerfish"]), [...new Set(r.what)]);
r = await lines(U.m1, "dough", DECK, 60);
t.check("…and never off the deck, weekend or not", none(r.what, BANK) && has(r.what, "carp"), [...new Set(r.what)]);
await clock(MONDAY);
r = await lines(U.m1, "dough", BANK_TILE, 60);
t.check("…nor off the bank on a weekday", none(r.what, ["goldfish"]) && has(r.what, "mussel"), [...new Set(r.what)]);
// the rain, and its end
const cur = Math.floor(MONDAY / SLOT);
await t.sql(`truncate public.town_weather`);
await weather([[cur - 3, "cloudy"], [cur - 2, "rain"], [cur - 1, "rain"], [cur, "cloudy"]]);
r = await lines(U.m1, "worm", DECK, 60);
t.check("dry now, and rain in the quarter hour before: the rain's end", same(r.signs, ["after"]), r.signs);
t.check("…and the rainbow fish is among sixty lines, with no salmon (it does not rain)", r.what.filter((x) => x === "rainbowFish").length >= 6 && none(r.what, ["salmon"]) && has(r.what, "archerfish"), [...new Set(r.what)]);
await clock(MONDAY + 30 * MIN);
r = await lines(U.m1, "worm", DECK, 3);
t.check("half an hour after the rain's last minute the sign is gone", same(r.signs, []) && none(r.what, ["rainbowFish"]), r);
await clock(MONDAY + 30 * MIN - 1000);
r = await lines(U.m1, "worm", DECK, 3);
t.check("…a second before that it still held", same(r.signs, ["after"]), r.signs);
await clock(MONDAY);
await t.sql(`truncate public.town_weather`);
await weather([[cur - 1, "rain"], [cur, "storm"]]);
r = await lines(U.m1, "worm", DECK, 60);
t.check("while it rains there is no end of it: no sign", same(r.signs, []), r.signs);
t.check("…a salmon comes up in it, and no archerfish, nor a rainbow", r.what.filter((x) => x === "salmon").length >= 4 && none(r.what, ["archerfish", "rainbowFish"]), [...new Set(r.what)]);
r = await lines(U.m1, "worm", DECK, 1, 100, {});
v = await lineOf(U.m1);
t.check("the line kept says it rains, by this database's weather and not the page's word", v.rain === true, v);
await t.sql(`truncate public.town_weather`);
// the moon
await clock(FULL);
r = await lines(U.m1, "dough", DECK, 200);
t.check("under the full moon of 2026-10-26 the sign holds", same(r.signs, ["full"]), r.signs);
t.check("…and the moonfish is among two hundred lines on dough by night, and rare among them", r.what.filter((x) => x === "moonFish").length >= 1 && r.what.filter((x) => x === "moonFish").length <= 30, r.what.filter((x) => x === "moonFish").length);
{
  const held = [];
  for (let d = -3; d <= 3; d++) { await clock(FULL + d * DAY); held.push((await lines(U.m1, "dough", DECK, 1)).signs.includes("full")); }
  t.check("three nights of it: the night before, the night, the night after", same(held, [false, false, true, true, true, false, false]), held);
}
await clock(FULL + 5 * DAY);
r = await lines(U.m1, "dough", DECK, 1);
t.check("five nights on there is no moon to speak of: only the weekend it has become", same(r.signs, ["weekend"]), r.signs);
// the bait
await clock(MONDAY);
r = await lines(U.m1, "worm", BANK_TILE, 60);
t.check("off the bank a loach comes up on a worm, and no piranha", r.what.filter((x) => x === "loach").length >= 5 && none(r.what, ["piranha", "archerfish", "herring", "mussel"]), [...new Set(r.what)]);
await purse(U.m1, 0, [{ item: "rod", n: 1 }, { item: "loach", n: 3 }, { item: "carp", n: 2 }], 100, { hand: "rod" });
await t.sql(`delete from public.town_lines where member_id = $1`, [U.m1]);
r = await call(U.m1, "town_cast", "loach", DECK[0], DECK[1], false);
v = await kept(U.m1);
t.check("a loach is a bait: one leaves the bag, and the line is out", r.ok === true && count(v.bag, "loach") === 2 && (await lineOf(U.m1))?.bait === "loach" && (await lastCast(U.m1)).thing === "loach", { r, bag: v.bag });
r = await call(U.m1, "town_cast", "carp", DECK[0], DECK[1], false);
t.check("a carp is no bait: refused, and still in the bag", r.ok === false && r.why === "none" && count((await kept(U.m1)).bag, "carp") === 2, r);
{
  const got = (await lines(U.m1, "loach", DECK, 60)).what;
  t.check("on a loach at noon off the deck: piranha and Nile perch, and nothing of the bank's or of a worm's", has(got, "piranha") && has(got, "nilePerch") && none(got, ["minnow", "perch", "barb", "loach", "arapaima", "pike"]), [...new Set(got)]);
}
await purse(U.m1, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 3 }], 100, { hand: "rod" });
await t.sql(`delete from public.town_lines where member_id = $1`, [U.m1]);
r = await t.as(U.m1, `select public.town_cast('worm', ${DECK[0]}, ${DECK[1]}) as r`);
t.check("a page built before still drops its line, with three words", r.rows?.[0]?.r?.ok === true && typeof r.rows[0].r.line.wait === "number", r);
r = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], true);
v = await lineOf(U.m1);
t.check("…or with a fourth it is no longer believed about (it says rain; none is kept)", r.ok === true && v.rain === false, { r, v });
r = await t.as("anon", `select public.town_cast('worm', ${DECK[0]}, ${DECK[1]}, false) as r`);
t.check("nobody signed out may drop a line, as ever", r.code === "42501", r);
await t.sql(`delete from public.town_lines`);

t.section("what the fish are for: on a plant");
const MORNING = at("2026-10-05T08:00:00+07:00");
await clock(MORNING);
// a plot of the first bed where a pest strikes a pumpkin at eleven, found by asking the rule (as v110's dry run does)
const struck = await one(`
  select x, y from generate_series(133, 138) x, generate_series(5, 10) y
   where town.pest_at(x || ',' || y, jsonb_build_object('by', '${U.m1}', 'crop', 'pumpkin', 'sown', ${MORNING} - 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0),
           ${MORNING}::bigint + 9 * 3600000) = ${MORNING}::bigint + 3 * 3600000 limit 1`);
if (!struck) throw new Error("no plot of the first bed where a pest strikes a pumpkin at eleven");
const [sx, sy] = [struck.x, struck.y];
const young = { by: U.m1, crop: "pumpkin", sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
const plant = (x, y, doc) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant`, [x, y, JSON.stringify(doc)]);
const plotOf = async (x, y) => (await t.sql(`select plant from public.town_plots where x = $1 and y = $2`, [x, y])).rows[0]?.plant ?? null;
const lastDeed = async (who) => (await t.sql(`select what, thing, n, doc from public.town_deeds where member_id = $1 order by id desc limit 1`, [who])).rows[0] ?? null;
await plant(132, 4, young);
await purse(U.m2, 0, [{ item: "herring", n: 2 }, { item: "mosquitofish", n: 2 }, { item: "archerfish", n: 2 }, { item: "carp", n: 1 }], 100, { hand: "herring" });
r = await call(U.m2, "town_tend", 132, 4, null);
v = await plotOf(132, 4);
t.check("a herring put on somebody's plant feeds it: it grows faster from now, and the fish is used up", r.ok === true && r.deed === "feed" && v.fed === MORNING && count((await kept(U.m2)).bag, "herring") === 1, { r, v });
v = await lastDeed(U.m2);
t.check("…written down as a plant fed, with what was in the hand and whose it was", v.what === "feed" && v.thing === "pumpkin" && v.doc.with === "herring" && v.doc.whose === U.m1, v);
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("a second herring does nothing to a plant already fed, and is kept", r.ok === false && count((await kept(U.m2)).bag, "herring") === 1, r);
await t.sql(`update public.town_purses set doc = doc || '{"hand": "mosquitofish"}'::jsonb where member_id = $1`, [U.m2]);
r = await call(U.m2, "town_tend", 132, 4, null);
v = await plotOf(132, 4);
t.check("a mosquitofish keeps the pests off it for a day", r.ok === true && r.deed === "feed" && v.guard === MORNING + 24 * HOUR && count((await kept(U.m2)).bag, "mosquitofish") === 1, { r, v });
await t.sql(`update public.town_purses set doc = doc || '{"hand": "archerfish"}'::jsonb where member_id = $1`, [U.m2]);
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("an archerfish does nothing to a plant with no pest on it, and is kept", r.ok === false && count((await kept(U.m2)).bag, "archerfish") === 2, r);
await plant(sx, sy, young);
await clock(MORNING + 3 * HOUR + 10 * MIN);
r = await call(U.m2, "town_tend", sx, sy, null);
v = await plotOf(sx, sy);
t.check("…and rids one of its pest where there is one", r.ok === true && r.deed === "cure" && v.cured === NOW && count((await kept(U.m2)).bag, "archerfish") === 1, { r, v });
v = await lastDeed(U.m2);
t.check("…written down as a pest cured with an archerfish", v.what === "cure" && v.doc.with === "archerfish", v);
await t.sql(`update public.town_purses set doc = doc || '{"hand": "carp"}'::jsonb where member_id = $1`, [U.m2]);
r = await call(U.m2, "town_tend", 132, 4, null);
t.check("a carp in the hand is nothing to a plant", r.ok === false && count((await kept(U.m2)).bag, "carp") === 1, r);
await t.sql(`delete from public.town_plots; delete from public.town_beds`);

t.section("what the fish are for: opened");
await clock(MONDAY);
await t.sql(`select setseed(0.5147)`);
{
  const sold = Object.keys(CODE.goods), early = Object.keys(CODE.scrolls).filter((s) => CODE.items[s].tier === 1 && !sold.includes(s));
  const found = [];
  for (let i = 0; i < 40; i++) {
    await purse(U.m1, 0, [{ item: "wels", n: 1 }]);
    r = await call(U.m1, "town_open", 0);
    found.push(r.found);
    if (i === 0) { v = await kept(U.m1); t.check("a wels opened is gone, and a scroll is in the bag in its place", r.ok === true && count(v.bag, "wels") === 0 && count(v.bag, r.found) === 1, { r, bag: v.bag }); }
  }
  t.check("a wels always holds a scroll: one of the early game's that nobody sells, the eight new ones among them", early.length === 21 && found.every((f) => early.includes(f)) && found.some((f) => DISHES.some((d) => f === `scroll${d[0].toUpperCase()}${d.slice(1)}`)) && new Set(found).size >= 10, [...new Set(found)]);
  const seeds = [];
  for (let i = 0; i < 60; i++) {
    await purse(U.m1, 0, [{ item: "pacu", n: 2 }]);
    r = await call(U.m1, "town_open", 0);
    seeds.push(r.found);
  }
  const empty = seeds.filter((s) => s === null).length;
  t.check("a pacu holds a seed more often than not: one of the six early ones, each of them among sixty; and now and then nothing", seeds.filter(Boolean).every((s) => SEEDS.includes(s)) && SEEDS.every((s) => seeds.includes(s)) && empty >= 4 && empty <= 24, { empty, kinds: [...new Set(seeds)] });
  v = await lastDeed(U.m1);
  t.check("…written down as a pacu opened, with what was in it", v.what === "open" && v.thing === "pacu" && "found" in v.doc, v);
  await purse(U.m1, 0, [{ item: "pike", n: 1 }]);
  r = await call(U.m1, "town_open", 0);
  t.check("a pike does not open", r.ok === false && r.why === "none", r);
}

t.section("what the fish are for: eaten as they are");
await clock(MORNING);
await purse(U.m1, 0, [{ item: "dozyFish", n: 2 }, { item: "rainbowFish", n: 1 }, { item: "pike", n: 1 }], 50);
r = await call(U.m1, "town_sit", 0, true);
t.check("somebody sits down to a dozy fish as to a dish", r.ok === true && r.dish === "dozyFish", r);
await clock(MORNING + 6 * MIN);
await call(U.m1, "town_chew", 0);
v = await kept(U.m1);
t.check("…eaten up, it has given twelve stamina and no buff, one is left, and no bowl is owed (it came in none)", near(Number((await one(`select town.stamina_of(doc, town.now_ms()) as s from public.town_purses where member_id = $1`, [U.m1])).s), 62)
  && count(v.bag, "dozyFish") === 1 && v.eating === null && !v.buff && !v.owed && count(v.bag, "bowl") === 0, { stamina: v.stamina, buff: v.buff, owed: v.owed, eating: v.eating });
await clock(MORNING + 4 * HOUR + 30 * MIN);
r = await call(U.m1, "town_sit", 1, true);
await clock(NOW + 6 * MIN);
await call(U.m1, "town_chew", 0);
v = await one(`select town.stamina_of(doc, town.now_ms()) as s, town.buff_of(doc, town.now_ms()) as buff, (doc->'buff'->>'until')::bigint as until from public.town_purses where member_id = $1`, [U.m1]);
t.check("a rainbow fish at the next meal gives five more, and leaves its luck for three hours", r.ok === true && r.dish === "rainbowFish" && near(Number(v.s), 67) && v.buff === "lucky" && Number(v.until) - NOW > 2.8 * HOUR && Number(v.until) - NOW <= 3 * HOUR, v);
await clock(MORNING + 10 * HOUR);
r = await call(U.m1, "town_sit", 2, true);
t.check("a pike is not sat down to", r.ok === false && r.why === "none", r);
{
  const now = await lines(U.m1, "minnow", DECK, 1, 100, { buff: { id: "lucky", until: NOW + HOUR } });
  t.check("(a line dropped under that luck is dropped all the same)", now.what.length === 1, now);
}
await t.sql(`delete from public.town_lines`);

t.section("what the fish are for: made into something, by hand");
await clock(MONDAY);
await purse(U.m1, 0, [{ item: "gar", n: 1 }, { item: "moonFish", n: 1 }, { item: "mussel", n: 5 }, { item: "rod", n: 1 }], 100);
r = await call(U.m1, "town_cook", JSON.stringify([["gar", 1]]), [], { hits: 3, misses: 0, secs: 2 });
v = await kept(U.m1);
t.check("a gar's scale is ground into a hook, by hand", r.ok === true && r.made === "hookScale" && count(v.bag, "hookScale") === 1 && count(v.bag, "gar") === 0, { r, bag: v.bag });
r = await call(U.m1, "town_cook", JSON.stringify([["moonFish", 1]]), [], { hits: 3, misses: 0, secs: 2 });
v = await kept(U.m1);
t.check("a moonfish's into a float", r.ok === true && r.made === "floatGlow" && count(v.bag, "floatGlow") === 1 && count(v.bag, "moonFish") === 0, { r, bag: v.bag });
t.check("…with which there is 1.84 s to strike in, where there was 1.6 (the hook does nothing to that)", near(Number((await one(`select town.strike_window(doc, town.now_ms()) as w from public.town_purses where member_id = $1`, [U.m1])).w), 1.6 * 1.15), v.bag);
r = await call(U.m1, "town_cook", JSON.stringify([["mussel", 2]]), [], { hits: 3, misses: 0, secs: 2 });
v = await kept(U.m1);
t.check("two mussels' shells make a bowl", r.ok === true && r.made === "bowl" && count(v.bag, "bowl") === 1 && count(v.bag, "mussel") === 3, { r, bag: v.bag });
v = await one(`select doc from public.town_things where key = 'found'`);
t.check("…and each is a find, as anything first made is", ["hookScale", "floatGlow", "bowl"].every((x) => v.doc.includes(x)), v.doc);
{
  await purse(U.m1, 0, [{ item: "pan", n: 1 }, { item: "salt", n: 1 }, { item: "popotoFish", n: 2 }], 100, { hand: "pan" });
  r = await call(U.m1, "town_cook", JSON.stringify([["salt", 1], ["popotoFish", 2]]), [], { hits: 4, misses: 0, secs: 3 });
  v = await kept(U.m1);
  t.check("two popoto fish and salt in a pan are fish and chips, a pot of four helpings", r.ok === true && r.made === "fishChips" && same(v.bag.find((s) => s?.item === "potFull")?.of, { dish: "fishChips", left: 4 }), { r, bag: v.bag });
}

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{signs,crowd}', '9') where key = 'fishing'`);
await t.sql(`update public.town_catalog set data = data - 'loach' where key = 'fish'`);
await t.run(FILE, "v122 a third time");
v = await t.sql(`select (select (data->'signs'->>'crowd')::int from public.town_catalog where key = 'fishing') as crowd, (select data ? 'loach' from public.town_catalog where key = 'fish') as loach,
  (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written`);
t.check("run again, it writes its ten rows over again, as its head says: what was changed by hand in them is put back", v.rows[0].crowd === 2 && v.rows[0].loach === true && v.rows[0].written === TEN.join(", "), v.rows);
v = await t.sql(`select count(*)::int as n, (select data->>'note' from public.town_catalog where key = 'carries') as note from public.town_catalog`);
t.check("…and there are eighteen rows still, the admin's note in the row it does not write among them", v.rows[0].n === 18 && v.rows[0].note === "an admin was here too", v.rows);
{
  const again = await texts(), odd = Object.keys(textsNow).filter((sig) => sig !== "town.now_ms()" && textsNow[sig] !== again[sig]);
  t.check("…and every function is what it was after the first run (the test's clock aside)", odd.length === 0 && Object.keys(again).length === Object.keys(textsNow).length, odd);
}

await t.done();
