/*
 * v127 — the well keeps a book: dry run in PGlite.
 *
 * v127 follows water from the river to a plant: a trigger on `town_deeds` reads each line of water as it is written
 * (pour, fill, water) and keeps whose water is in the well, whose is in each can, what each carrier has poured all
 * told, and which plots a carrier's water reached each day. `town_well()` is the book a member reads,
 * `town_well_ranks()` the ranks for the names over heads, `town_well_take()` the yoke the well has for its carrier.
 * It writes two catalog rows over (two yokes: `items`, `farming`) and seeds one (`well`). No function of the game's
 * is written again but `town.deed_th`, which is given one word more from its own text. v105 to v122 are replayed as
 * they ran, then:
 *
 *   · a morning of water is carried before the file (the game's own functions, the well with five bucketfuls of
 *     nobody's), and the file is run twice;
 *   · its closing block; the lines written before are read once, in order, nobody's water first;
 *   · every rule case made from the code as it is now is put to the SQL (the yokes are among the buckets), and the
 *     farm's cases again under five skies;
 *   · the well's own rules, case by case, and thirty-six stories of water written line by line into the deeds: the
 *     book as each of four reads it along the way, and the four tables at the end, as the code keeps them;
 *   · the trigger never undoes a deed; water through the game's own functions; a yoke carries two; the gift taken;
 *   · who may read and call what; that nothing else changed (every function its own text, every other catalog row);
 *   · a member who goes; the book's count put right by the well when they differ; the file a third time.
 *
 *   node v127.test.mjs            (RULES=0 skips the cases of the earlier rules, RAIN=0 those in the rain, STORIES=<n> takes the first n)
 *   node mutate.mjs <the file> v127.test.mjs v127.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v127_"));
const HERE = new URL("./v127_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(127);
const DIR = process.env.VECTORS ?? "now";
const WHICH = process.env.RULES === "0" ? [] : process.env.RULES ? process.env.RULES.split(",").map(Number) : [106, 107, 108, 110, 111, 112, 113];
const need = (name, how) => {
  const at = new URL(`./${DIR}/${name}`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/${name}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run ${how}\` in the repo first`); process.exit(2); }
  return JSON.parse(readFileSync(at, "utf8"));
};
const vectors = [];
for (const n of WHICH) vectors.push(...need(`vectors-v${n}.json`, "lib/town/db-vectors.test.ts"));
const rainy = process.env.RAIN === "0" ? { slot: 900000, skies: [], cases: [] } : need("vectors-v118.json", "lib/town/db-vectors.test.ts");
// (RAIN=<n> takes every n-th of them: for the breaks, which are found by a tenth as surely as by all)
const thin = Number(process.env.RAIN) > 1 ? Number(process.env.RAIN) : 1;
const WELL = need("vectors-v127.json", "lib/town/db-vectors-well.test.ts");
const CODE = need("catalog.json", "lib/town/db-vectors.test.ts");
const STORIES = process.env.STORIES ? WELL.stories.slice(0, Number(process.env.STORIES)) : WELL.stories;

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
const RAN = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122];
const MIN = 60_000, HOUR = 3_600_000, SLOT = 900000;
// 09:00 in Bangkok, the day after the deeds began to be written down
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

/** A town as it stands live before the file: v105 to v122 as they ran, the game open, a clock the test moves. */
async function town(quiet = false) {
  const t = await supabaseLike({ extra });
  for (const n of RAN) { if (quiet) await t.sql(migration(n)); else await t.run(migration(n), `v${n}`); }
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
  await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
    create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
  const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
  return {
    t, one,
    clock: (ms) => t.sql(`update town.test_clock set ms = ${ms}`),
    /** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
    purse: (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
      on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]),
    call: async (who, fn, ...args) => {
      const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
      return r.error ? r : r.rows[0].r;
    },
    kept: async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; },
    plant: (x, y, doc) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
      on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant`, [x, y, JSON.stringify(doc)]),
    /** What the book keeps: the well's water (the oldest first), the cans, the carriers, what was reached. */
    book: async () => ({
      water: (await t.sql(`select member_id as by, buckets as left from public.town_well_water order by id`)).rows,
      cans: Object.fromEntries((await t.sql(`select member_id, item, carrier, waterings from public.town_well_cans order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, { by: r.carrier, left: r.waterings }])),
      carriers: Object.fromEntries((await t.sql(`select member_id, buckets, taken from public.town_carriers order by 1`)).rows.map((r) => [r.member_id, { buckets: r.buckets, taken: r.taken }])),
      reach: (await t.sql(`select day, carrier, x, y, owner, n from public.town_well_reach order by 1, 2, 3, 4`)).rows.reduce((all, r) => {
        (all[`${r.day}/${r.carrier}`] ??= {})[`${r.x},${r.y}`] = { owner: r.owner, n: r.n };
        return all;
      }, {}),
    }),
    wellIs: async () => Number((await one(`select doc from public.town_things where key = 'well'`)).doc),
  };
}

const T = await town();
const { t, one, clock, purse, call, kept, plant, book, wellIs } = T;
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here too"') where key = 'carries'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const NAME = Object.fromEntries((await t.sql(`select id, coalesce(character_name, display_name, discord_username, '') as name from public.profiles`)).rows.map((r) => [r.id, r.name]));
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

/* ── a morning of water, before the file ─────────────────────────────────── */

const RIVER = [16, 38];
const wellAt = (await one(`select town.cat('farming')->'wellAt' as at`)).at, AT_WELL = [wellAt[0] + 1, wellAt[1]];
const growing = (by, crop = "pumpkin") => ({ by, crop, sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: MORNING + 48 * HOUR, cured: 0, picked: 0, pickedAt: 0 });
/** A morning's water by the game's own functions: m1 carries two bucketfuls, m2 fills a can and waters a plant of the admin's. */
async function morning(k) {
  await k.t.sql(`update public.town_things set doc = '5'::jsonb where key = 'well'`);
  await k.purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
  await k.purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
  await k.plant(133, 5, growing(U.admin));
  await k.plant(134, 5, growing(U.admin));
  const said = [];
  for (let i = 0; i < 2; i++) { said.push(await k.call(U.m1, "town_chore", ...RIVER)); said.push(await k.call(U.m1, "town_chore", ...AT_WELL)); }
  said.push(await k.call(U.m2, "town_chore", ...AT_WELL));
  said.push(await k.call(U.m2, "town_tend", 133, 5));
  return said;
}
{
  const said = await morning(T);
  t.check("before the file: two bucketfuls carried, a can filled, a plant of somebody else's watered", said.every((r) => r.ok === true) && same(said.map((r) => r.chore ?? r.deed), ["draw", "pour", "draw", "pour", "fill", "water"]) && (await wellIs()) === 6, said.map((r) => r.ok ?? r));
}
const textsWas = await texts();
const deedsWas = (await one(`select count(*)::int as n from public.town_deeds`)).n;

await t.runTwice(FILE, "v127");
const textsNow = await texts();
let v, r;

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = await one(`select count(*) filter (where c.relrowsecurity)::int as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and (g.table_name like 'town\\_well%' or g.table_name = 'town_carriers') and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.relname in ('town_well_water', 'town_well_cans', 'town_carriers', 'town_well_reach', 'town_well_kept') and c.relnamespace = 'public'::regnamespace`);
t.check("the five tables are closed: row security on, nothing granted to a browser", same(v, { closed: 5, grants: 0 }), v);
v = await t.sql(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_well%' order by 1`);
t.check("the three functions are a member's to call, and nobody's signed out", same(v.rows, ["town_well", "town_well_ranks", "town_well_take"].map((proname) => ({ proname, anon: false, member: true }))), v.rows);
v = await t.sql(`select tgname, tgenabled from pg_trigger where tgrelid = 'public.town_deeds'::regclass and not tgisinternal`);
t.check("the deeds have the one trigger, and it is on", same(v.rows, [{ tgname: "town_deeds_well", tgenabled: "O" }]), v.rows);
v = await one(`select town.cat('well') as well, town.cat('farming')->'buckets' as buckets, town.cat('items')->'waterYoke' as yoke`);
t.check("the catalog has the well's numbers, the yokes among the buckets, and a yoke as a thing",
  same(v, { well: { ranks: [50, 200, 600], gifts: [[1, "waterYoke"], [3, "waterYokeGreat"]], listed: 40 }, buckets: { bucket: 1, bucketIron: 2, waterYoke: 2, waterYokeGreat: 4 }, yoke: { kind: "tool", tier: 1, stack: 1, pays: 0 } }), v);
v = await one(`select town.deed_th('gift') as gift, town.deed_th('pour') as pour, town.deed_th('something new') as unknown`);
t.check("the tally has a word for a gift taken, and its other words still", same(v, { gift: "รับของที่บ่อน้ำฝากไว้ให้", pour: "เทน้ำลงบ่อ", unknown: "something new" }), v);
v = await one(`select (select coalesce(sum(buckets), 0)::int from public.town_well_water) as followed, (select (doc #>> '{}')::int from public.town_things where key = 'well') as well`);
t.check("the book's count of the well's water is the well's own", v.followed === v.well && v.well === 6, v);
v = await one(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
       (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules, the book's among them, are nobody's in a browser", same(v, { member_has_rules: false, open: 0 }), v);

/* ── the lines written before ────────────────────────────────────────────── */

t.section("the lines written before the file are read once, in order");
v = await book();
t.check("the water the well held before the first line is nobody's and goes first: the can was filled from it", same(v.water, [{ by: null, left: 4 }, { by: U.m1, left: 1 }, { by: U.m1, left: 1 }]), v.water);
t.check("the carrier has the two bucketfuls poured before the file", same(v.carriers, { [U.m1]: { buckets: 2, taken: [] } }), v.carriers);
t.check("the can filled before is of nobody's water, with one watering gone from it", same(v.cans, { [`${U.m2}/can`]: { by: null, left: 7 } }), v.cans);
t.check("nobody's water reaches nothing", same(v.reach, {}), v.reach);
v = await one(`select count(*)::int as n, max(upto)::int as upto from public.town_well_kept`);
t.check("it is marked as read, up to the last line there was, and running the file again read nothing twice", v.n === 1 && v.upto === deedsWas, { ...v, deedsWas });

/* ── every rule again ────────────────────────────────────────────────────── */

// (the rules as SQL asks them: v122's dry run's own list, word for word)
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
{
  const tally = new Map();
  for (const c of vectors) {
    const sql = CALL[c.fn];
    if (!sql) throw new Error(`no SQL for ${c.fn}`);
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, c.args.map((a, i) => param(c.fn, i, a)))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    const ok = !error && same(got ?? null, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: c.args, want: c.want, got: error ?? got }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1600)}` : "");
  if (vectors.length) {
    const yoked = vectors.filter((c) => (c.fn === "chore" || c.fn === "chore_for") && /"hand":"waterYoke(Great)?"/.test(JSON.stringify(c.args[0])));
    t.check("a yoke is in the hand in some of the cases of carrying water", yoked.length >= 20, yoked.length);
  }
}

if (rainy.cases.length) {
  t.section(`rain on the plots: ${Math.ceil(rainy.cases.length / thin)} of the farm's cases again, under ${rainy.skies.length} skies`);
  const DRY_SKIES = ["clear", "cloudy", "fog"], rainTally = new Map();
  let sky = -1;
  for (let i = 0; i < rainy.cases.length; i += thin) {
    const c = rainy.cases[i];
    if (c.sky !== sky) {
      // this sky's wet quarter hours, as rain, drizzle and storm by turns; and beside them dry ones, which are to count for nothing
      sky = c.sky;
      await t.sql(`truncate public.town_weather`);
      const wet = new Set(rainy.skies[sky]), rows = rainy.skies[sky].map((s, n) => [s, ["rain", "drizzle", "storm"][n % 3]]);
      const lo = Math.min(...rainy.skies[sky]), hi = Math.max(...rainy.skies[sky]);
      for (let s = lo - 40; s <= hi + 40; s += 3) if (!wet.has(s)) rows.push([s, DRY_SKIES[Math.abs(s) % 3]]);
      await weather(rows);
    }
    const sql = CALL[c.fn];
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, c.args.map((a, k) => param(c.fn, k, a)))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    const ok = !error && same(got ?? null, c.want);
    const row = rainTally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { sky: c.sky, args: c.args, want: c.want, got: error ?? got }; }
    rainTally.set(c.fn, row);
  }
  for (const [fn, row] of rainTally) t.check(`in the rain, ${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1600)}` : "");
  t.check("the quarter hour is as long here as in the code", rainy.slot === SLOT, rainy.slot);
  await t.sql(`truncate public.town_weather`);
}

/* ── the well's own rules ────────────────────────────────────────────────── */

t.section(`the well's rules: ${WELL.rules.length} cases, each as the site's own code answers it`);
{
  const INTS = (n) => `(select coalesce(array_agg(x::int order by ord), '{}'::int[]) from jsonb_array_elements_text($${n}::jsonb) with ordinality as e(x, ord))`;
  const WCALL = {
    well_rank: "town.well_rank($1::int)", well_towards: "town.well_towards($1::int)", well_due: `town.well_due($1::int, ${INTS(2)})`,
    well_take: `town.well_take($1::jsonb, $2::int, ${INTS(3)})`,
  };
  const tally = new Map();
  for (const c of WELL.rules) {
    let got, error = null;
    try { got = (await t.db.query(`select ${WCALL[c.fn]} as r`, c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)))).rows[0].r; } catch (e) { error = e.message; }
    const ok = !error && same(got ?? null, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: c.args, want: c.want, got: error ?? got }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1200)}` : "");
  t.check("every one of the four rules has its cases", same([...tally.keys()].sort(), ["well_due", "well_rank", "well_take", "well_towards"]), [...tally.keys()]);
}

/* ── stories of water ────────────────────────────────────────────────────── */

const wipe = () => t.sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach restart identity`);
/** A line of water written into the deeds as the game's functions write it (v121): the trigger reads it. */
const write = (d) => t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, doc) values ($1, to_timestamp($2::bigint / 1000.0), $3, $4, $5::numeric, $6::jsonb)`, [
  d.by, d.at, d.what, d.what === "pour" ? "bucket" : d.what === "fill" ? d.can : "kangkong", d.what === "pour" ? d.n : 1,
  JSON.stringify(d.what === "water" ? { tile: d.tile, with: d.can, ...(d.whose ? { whose: d.whose } : {}) } : { well: 0 }),
]);
t.section(`${STORIES.length} stories of water, written line by line into the deeds: ${STORIES.reduce((n, s) => n + s.deeds.length, 0)} lines, the book read ${STORIES.reduce((n, s) => n + s.asks.length, 0)} times`);
{
  const kept0 = await book(), deeds0 = (await t.sql(`select member_id, at, what, thing, n, coins, doc from public.town_deeds order by id`)).rows;
  let badBook = null, badEnd = null, books = 0;
  for (const [n, s] of STORIES.entries()) {
    await wipe();
    let asked = 0;
    for (let i = 0; i <= s.deeds.length; i++) {
      for (; asked < s.asks.length && s.asks[asked].after === i; asked++) {
        const a = s.asks[asked], got = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [a.me, a.now])).r;
        const want = { ...a.want, carriers: a.want.carriers.map((c) => ({ ...c, name: NAME[c.id] })) };
        books++;
        if (!same(got, want)) badBook ??= { story: n, after: i, me: a.me, want, got };
      }
      if (i < s.deeds.length) await write(s.deeds[i]);
    }
    const end = await book(), want = { water: s.end.water, cans: s.end.cans, carriers: s.end.carriers, reach: s.end.reach };
    if (!same(end, want)) badEnd ??= { story: n, differs: Object.keys(want).filter((k) => !same(end[k], want[k])), want: JSON.stringify(want).slice(0, 500), got: JSON.stringify(end).slice(0, 500) };
  }
  t.check(`the book reads as the code's does, every time: ${books} readings`, !badBook && books > 100, badBook ? JSON.stringify(badBook).slice(0, 1800) : "");
  t.check("at each story's end the well's water, the cans, the carriers and what was reached are what the code keeps", !badEnd, badEnd ?? "");
  // (the morning's lines and what was kept of them, put back as they were)
  await wipe();
  for (const d of deeds0) await t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, coins, doc) values ($1, $2, $3, $4, $5, $6, $7::jsonb)`, [d.member_id, d.at, d.what, d.thing, d.n, d.coins, JSON.stringify(d.doc)]);
  await wipe2(kept0);
}
/** Put what the book kept back as it was (after the stories): the lines written back just now were read again by the trigger, as water of the book's own. */
async function wipe2(kept0) {
  await t.sql(`truncate public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach restart identity`);
  for (const w of kept0.water) await t.sql(`insert into public.town_well_water (member_id, buckets) values ($1, $2)`, [w.by, w.left]);
  for (const [key, c] of Object.entries(kept0.cans)) await t.sql(`insert into public.town_well_cans (member_id, item, carrier, waterings) values ($1, $2, $3, $4)`, [...key.split("/"), c.by, c.left]);
  for (const [id, c] of Object.entries(kept0.carriers)) await t.sql(`insert into public.town_carriers (member_id, buckets) values ($1, $2)`, [id, c.buckets]);
}

/* ── the trigger never undoes a deed ─────────────────────────────────────── */

t.section("a line the book cannot read is still written");
{
  const was = await book(), n0 = (await one(`select count(*)::int as n from public.town_deeds`)).n;
  // whose plant it was is no id at all: the book's reading fails, after it had taken a watering from the can
  r = await t.as("super", `insert into public.town_deeds (member_id, what, thing, n, doc) values ($1, 'water', 'pumpkin', 1, $2::jsonb)`, [U.m2, JSON.stringify({ tile: [133, 5], with: "can", whose: "nobody at all" })]);
  t.check("the line is written", !r.error && (await one(`select count(*)::int as n from public.town_deeds`)).n === n0 + 1, r);
  t.check("…and the book is as it was: what it had begun is undone with it", same(await book(), was), await book());
  // a line of something else is none of the book's
  await t.sql(`insert into public.town_deeds (member_id, what, thing, n) values ($1, 'draw', 'bucket', 1), ($1, 'pick', 'pumpkin', 4)`, [U.m1]);
  t.check("a bucket drawn and a plant picked are not read", same(await book(), was), await book());
  // a line of nobody's (their account gone) is not read either
  await t.sql(`insert into public.town_deeds (member_id, what, thing, n) values (null, 'pour', 'bucket', 3)`);
  t.check("nor a line of nobody's", same(await book(), was), await book());
}

/* ── water, through the game's own functions ─────────────────────────────── */

t.section("water carried, a can filled, plants watered: by the functions a member calls");
await clock(MORNING + 2 * HOUR);
{
  // the well is drawn down to what m1 carried: the four bucketfuls of nobody's go into four cans
  await purse(U.guest, 0, [{ item: "canBrass", n: 1 }], 100, { hand: "canBrass" });
  for (let i = 0; i < 4; i++) {
    await t.sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,0}', '{"item": "canBrass", "n": 1}') where member_id = $1`, [U.guest]);
    r = await call(U.guest, "town_chore", ...AT_WELL);
  }
  v = await book();
  t.check("four cans later the well holds only what was carried", r.ok === true && same(v.water, [{ by: U.m1, left: 1 }, { by: U.m1, left: 1 }]) && (await wellIs()) === 2, v.water);
  // m2 fills a can: of m1's water. A plant of the admin's watered with it is m1's water reaching the admin's plant
  await purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
  r = await call(U.m2, "town_chore", ...AT_WELL);
  v = await book();
  t.check("a can filled is of the oldest water there is: the carrier's", r.ok === true && r.chore === "fill" && same(v.cans[`${U.m2}/can`], { by: U.m1, left: 8 }) && same(v.water, [{ by: U.m1, left: 1 }]), v);
  const today = (await one(`select town.day_of(town.now_ms()) as d`)).d;
  r = await call(U.m2, "town_tend", 134, 5);
  v = await book();
  t.check("a plant of somebody else's watered from it: the carrier's water reached it", r.ok === true && r.deed === "water" && same(v.reach, { [`${today}/${U.m1}`]: { "134,5": { owner: U.admin, n: 1 } } }) && v.cans[`${U.m2}/can`].left === 7, v);
  // the carrier's own plant, watered with the carrier's water, is not what the book is for
  await plant(135, 5, growing(U.m1));
  r = await call(U.m2, "town_tend", 135, 5);
  v = await book();
  t.check("the carrier's own plant watered with it is not counted, though the can gives a watering", r.ok === true && Object.keys(v.reach[`${today}/${U.m1}`]).length === 1 && v.cans[`${U.m2}/can`].left === 6, v);
  // an hour on, the same plant again: the same line, one more
  await clock(MORNING + 3 * HOUR + MIN);
  r = await call(U.m2, "town_tend", 134, 5);
  v = await book();
  t.check("the same plant an hour later is the same line, one more", r.ok === true && same(v.reach[`${today}/${U.m1}`], { "134,5": { owner: U.admin, n: 2 } }), v.reach);

  r = await call(U.m1, "town_well");
  t.check("the carrier's book: two bucketfuls today, two waterings of them, of one plant, of one person's", same(r.wellBook, {
    buckets: 2, rank: 0, towards: 2 / 50, gift: false, today: { buckets: 2, waterings: 2, plants: 1, people: 1, watered: 0, helped: 0 },
    carriers: [{ id: U.m1, name: NAME[U.m1], buckets: 2, rank: 0 }],
  }) && r.now === MORNING + 3 * HOUR + MIN, r);
  r = await call(U.m2, "town_well");
  t.check("the waterer's book: nothing carried, four plants of others watered, for two people", same(r.wellBook.today, { buckets: 0, waterings: 0, plants: 0, people: 0, watered: 4, helped: 2 }) && r.wellBook.carriers.length === 1, r.wellBook);
  r = await call(U.admin, "town_well");
  t.check("somebody who only owns the plants reads the day's carriers too", same(r.wellBook.today, { buckets: 0, waterings: 0, plants: 0, people: 0, watered: 0, helped: 0 }) && same(r.wellBook.carriers.map((c) => c.name), [NAME[U.m1]]), r.wellBook);
}

t.section("a yoke carries two bucketfuls a trip, a great one four");
{
  await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'; truncate public.town_well_water restart identity`);
  for (const [yoke, holds] of [["waterYoke", 2], ["waterYokeGreat", 4]]) {
    const had = (await book()).carriers[U.m1].buckets, well0 = await wellIs();
    await purse(U.m1, 0, [{ item: yoke, n: 1 }], 100, { hand: yoke });
    r = await call(U.m1, "town_chore", ...RIVER);
    v = await kept(U.m1);
    t.check(`a ${yoke} drawn at the river holds ${holds}`, r.ok === true && r.chore === "draw" && same(v.bag[0], { item: yoke, n: 1, water: holds }) && v.stamina.left === 98, v.bag[0]);
    r = await call(U.m1, "town_chore", ...AT_WELL);
    v = await book();
    t.check(`…and poured, it is ${holds} more in the well and ${holds} more to its carrier`, r.ok === true && r.chore === "pour" && (await wellIs()) === well0 + holds && v.carriers[U.m1].buckets === had + holds && same(v.water.at(-1), { by: U.m1, left: holds }), v);
  }
  r = await call(U.m1, "town_leave", 0, 1);
  t.check("the uncle's relatives do not take a yoke: it fetches nothing", r.ok === false && r.why === "unwanted", r);
}

/* ── ranks, and the gift ─────────────────────────────────────────────────── */

t.section("a rank, and what the well has for its carrier");
{
  await t.sql(`update public.town_carriers set buckets = 49 where member_id = $1`, [U.m1]);
  r = await call(U.m1, "town_well");
  t.check("one short of the first rank: no rank, nothing waiting, nearly there", r.wellBook.rank === 0 && r.wellBook.gift === false && Math.abs(r.wellBook.towards - 49 / 50) < 1e-12, r.wellBook);
  r = await call(U.m1, "town_well_ranks");
  t.check("…and nobody has a rank", same(r.ranks, {}), r);
  r = await call(U.m1, "town_well_take");
  t.check("nothing to take yet", r.ok === false && r.why === "none" && r.wellBook.buckets === 49, r);
  await purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
  await call(U.m1, "town_chore", ...RIVER);
  r = await call(U.m1, "town_chore", ...AT_WELL);
  r = await call(U.m1, "town_well");
  t.check("the fiftieth bucketful poured: the first rank, and something waiting", r.wellBook.buckets === 50 && r.wellBook.rank === 1 && r.wellBook.gift === true && r.wellBook.towards === 0 && r.wellBook.carriers.find((c) => c.id === U.m1)?.rank === 1, r.wellBook);
  r = await call(U.m2, "town_well_ranks");
  t.check("everybody is told the rank", same(r.ranks, { [U.m1]: 1 }) && typeof r.now === "number", r);
  // a full bag takes nothing, and nothing is lost by asking
  await purse(U.m1, 7, Array.from({ length: 10 }, () => ({ item: "rod", n: 1 })), 100);
  const deeds = (await one(`select count(*)::int as n from public.town_deeds`)).n;
  r = await call(U.m1, "town_well_take");
  v = await book();
  t.check("a full bag takes nothing: the gift waits", r.ok === false && r.why === "full" && r.wellBook.gift === true && same(v.carriers[U.m1].taken, []) && (await one(`select count(*)::int as n from public.town_deeds`)).n === deeds, r);
  await purse(U.m1, 7, [{ item: "rod", n: 1 }], 100);
  r = await call(U.m1, "town_well_take");
  v = await book();
  const line = await one(`select member_id, what, thing, n, coins, doc from public.town_deeds order by id desc limit 1`);
  t.check("with room, the yoke is in the bag, and the answer has the purse and the book", r.ok === true && r.gift === "waterYoke" && r.rank === 1 && count(r.purse.bag, "waterYoke") === 1 && r.purse.coins === 7 && r.wellBook.gift === false && count((await kept(U.m1)).bag, "waterYoke") === 1, r);
  t.check("…it is marked as taken, and written down as a deed", same(v.carriers[U.m1], { buckets: 50, taken: [1] }) && same({ ...line, n: Number(line.n), coins: Number(line.coins) }, { member_id: U.m1, what: "gift", thing: "waterYoke", n: 1, coins: 0, doc: { from: "well", rank: 1 } }), { carrier: v.carriers[U.m1], line });
  r = await call(U.m1, "town_well_take");
  t.check("once: asked again, there is nothing", r.ok === false && r.why === "none" && count((await kept(U.m1)).bag, "waterYoke") === 1, r);
  r = await call(U.m2, "town_well_take");
  t.check("somebody who has carried nothing has nothing waiting", r.ok === false && r.why === "none", r);
  // the last rank: the great yoke; the second has none
  await t.sql(`update public.town_carriers set buckets = 200 where member_id = $1`, [U.m1]);
  r = await call(U.m1, "town_well");
  t.check("the second rank has a name and no gift", r.wellBook.rank === 2 && r.wellBook.gift === false, r.wellBook);
  await t.sql(`update public.town_carriers set buckets = 600 where member_id = $1`, [U.m1]);
  r = await call(U.m1, "town_well_take");
  v = await book();
  t.check("at the last rank the well has the great yoke", r.ok === true && r.gift === "waterYokeGreat" && r.rank === 3 && same(v.carriers[U.m1].taken, [1, 3]) && r.wellBook.towards === 1 && r.wellBook.rank === 3, r);
  // somebody who reaches the last without having taken the first is given the first first
  await t.sql(`insert into public.town_carriers (member_id, buckets) values ($1, 700) on conflict (member_id) do update set buckets = 700, taken = '{}'`, [U.guest]);
  await purse(U.guest, 0, [], 100);
  const first = await call(U.guest, "town_well_take"), second = await call(U.guest, "town_well_take"), third = await call(U.guest, "town_well_take");
  t.check("the lower gift first, then the higher, then nothing", first.gift === "waterYoke" && second.gift === "waterYokeGreat" && third.ok === false && third.why === "none", [first.gift, second.gift, third]);
  r = await call(U.m2, "town_well_ranks");
  t.check("the ranks, as everybody is told them", same(r.ranks, { [U.m1]: 3, [U.guest]: 3 }), r);
}

t.section("today's carriers: in the order they came, a day at a time");
{
  await wipe();
  const dawn = Date.parse("2026-10-07T05:00:00+07:00");
  const pour = (who, at, n) => t.sql(`insert into public.town_deeds (member_id, at, what, thing, n) values ($1, to_timestamp($2::bigint / 1000.0), 'pour', 'bucket', $3)`, [who, at, n]);
  await pour(U.m2, dawn - 10 * MIN, 3);
  await pour(U.guest, dawn + MIN, 1);
  await pour(U.m1, dawn + 2 * MIN, 2);
  await pour(U.guest, dawn + 3 * MIN, 4);
  // (two who came at the same moment are told in the order of their ids)
  await pour(U.admin, dawn + 2 * MIN, 1);
  await clock(dawn + HOUR);
  r = await call(U.m2, "town_well");
  t.check("after dawn: the three who came since, in the order they came, each with the day's bucketfuls", same(r.wellBook.carriers.map((c) => [c.id, c.buckets]), [[U.guest, 5], [U.m1, 2], [U.admin, 1]]), r.wellBook.carriers);
  t.check("…and yesterday's carrier has poured nothing today, three all told", r.wellBook.today.buckets === 0 && r.wellBook.buckets === 3, r.wellBook);
  await clock(dawn - MIN);
  r = await call(U.m2, "town_well");
  t.check("before dawn it is still yesterday: only who poured then", same(r.wellBook.carriers.map((c) => [c.id, c.buckets]), [[U.m2, 3]]) && r.wellBook.today.buckets === 3, r.wellBook.carriers);
  await t.sql(`update public.town_catalog set data = jsonb_set(data, '{listed}', '1') where key = 'well'`);
  await clock(dawn + HOUR);
  r = await call(U.m2, "town_well");
  t.check("the book lists as many as the catalog says, the first to come", same(r.wellBook.carriers.map((c) => c.id), [U.guest]), r.wellBook.carriers);
  await t.sql(`update public.town_catalog set data = jsonb_set(data, '{listed}', '40') where key = 'well'`);
  // what is older than a week is thrown away as the book is opened
  const day = (await one(`select town.day_of(town.now_ms()) as d`)).d;
  await t.sql(`insert into public.town_well_reach (day, carrier, x, y, owner, n) values ($1, $3, 133, 5, $4, 2), ($2, $3, 133, 5, $4, 2)`, [day - 8, day - 7, U.m1, U.m2]);
  await call(U.admin, "town_well");
  v = (await t.sql(`select day from public.town_well_reach order by day`)).rows.map((x) => x.day);
  t.check("a line more than a week old is thrown away as the book is opened, one a week old is kept", same(v, [day - 7]), v);
}

/* ── who may ─────────────────────────────────────────────────────────────── */

t.section("who may read and call what");
for (const fn of ["town_well", "town_well_ranks", "town_well_take"]) {
  r = await call("anon", fn);
  t.check(`somebody signed out cannot call ${fn}`, r.code === "42501", r);
  const u = await call(U.unver, fn), n = await call(U.nochar, fn);
  t.check(`…nor somebody with no proved character`, u.code === "42501" && n.code === "42501", [u, n]);
}
for (const table of ["town_well_water", "town_well_cans", "town_carriers", "town_well_reach", "town_well_kept"]) {
  const a = await t.as("anon", `select * from public.${table}`), m = await t.as(U.m1, `select * from public.${table}`);
  const w = await t.as(U.m1, table === "town_carriers" ? `update public.town_carriers set buckets = 999 where member_id = '${U.m1}'` : `delete from public.${table}`);
  t.check(`${table}: nobody in a browser reads it or writes it`, a.code === "42501" && m.code === "42501" && w.code === "42501", [a, m, w]);
}
r = await t.as(U.m1, `select town.well_book('${U.m2}'::uuid, 0)`);
t.check("a member cannot ask the rules themselves for somebody else's book", r.code === "42501", r);
r = await t.as(U.m1, `select town.well_seen('${U.m1}'::uuid, 0, 'pour', 'bucket', 500, '{}'::jsonb)`);
t.check("…nor write a line of water of their own making", r.code === "42501" && (await book()).carriers[U.m1].buckets === 2, r);
r = await t.as(U.m1, `insert into public.town_deeds (member_id, what, thing, n) values ('${U.m1}', 'pour', 'bucket', 500)`);
t.check("…nor into the deeds, which are closed as they were", r.code === "42501", r);
{
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  const m = await call(U.m1, "town_well"), a = await call(U.admin, "town_well");
  t.check("while the game is shut the book is an admin's only", m.code === "42501" && !!a.wellBook, [m, a]);
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
}

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.well_rank(integer)", "town.well_towards(integer)", "town.well_due(integer,integer[])", "town.well_take(jsonb,integer,integer[])",
    "town.well_seen(uuid,bigint,text,text,numeric,jsonb)", "town.well_deed()", "town.well_book(uuid,bigint)", "town_well()", "town_well_ranks()", "town_well_take()"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("ten functions are new, none is gone", same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added, gone });
  const others = Object.keys(textsWas).filter((sig) => sig !== "town.deed_th(text)" && textsWas[sig] !== textsNow[sig]);
  t.check("every function there was, the rules among them, is its text from before to the letter", others.length === 0 && Object.keys(textsWas).length > 150, others);
  const d = differ(textsWas["town.deed_th(text)"], textsNow["town.deed_th(text)"]);
  t.check("the tally's words are v121's with one more: of the old text only its last line is written otherwise", same(d.gone, ["    else p_what end"]) && same(d.more, ["    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' else p_what end"]), d);

  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  const was = Object.fromEntries(before.map((row) => [row.key, row])), written = after.filter((row) => !was[row.key] || String(row.updated_at) !== String(was[row.key].updated_at)).map((row) => row.key);
  t.check("it seeds one row and writes two over, and leaves the other sixteen as they were", same(written, ["farming", "items", "well"]) && after.length === 19 && before.length === 18
    && after.every((row) => written.includes(row.key) || same(row.data, was[row.key].data)), written);
  const odd = after.filter((row) => !same(row.key === "carries" ? { ...row.data, note: undefined } : row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now, all nineteen", odd.length === 0 && Object.keys(CODE).length === 19, odd);
  const now = Object.fromEntries(after.map((row) => [row.key, row.data]));
  const itemsMore = Object.keys(now.items).filter((id) => !(id in was.items.data)), itemsMoved = Object.keys(was.items.data).filter((id) => !same(was.items.data[id], now.items[id]));
  const farmMoved = Object.keys(now.farming).filter((k) => !same(now.farming[k], was.farming.data[k]));
  t.check("of the whole catalog four entries differ: two yokes among the things, and what each carries", same(itemsMore, ["waterYoke", "waterYokeGreat"]) && itemsMoved.length === 0 && same(farmMoved, ["buckets"])
    && same(now.farming.buckets, { ...was.farming.data.buckets, waterYoke: 2, waterYokeGreat: 4 }), { itemsMore, itemsMoved, farmMoved });
  t.check("a number an admin changed by hand in a row it does not write is as it was", now.carries.note === "an admin was here too", now.carries.note);
}

/* ── a member who goes ───────────────────────────────────────────────────── */

t.section("a member who goes");
{
  await wipe();
  await clock(MORNING + 30 * HOUR);
  const at = MORNING + 30 * HOUR - 10 * MIN;
  for (const d of [{ by: U.m2, at, what: "pour", n: 3 }, { by: U.m1, at: at + 1, what: "fill", can: "can" }, { by: U.m1, at: at + 2, what: "water", can: "can", tile: [133, 5], whose: U.guest },
    { by: U.m2, at: at + 3, what: "fill", can: "can" }, { by: U.m2, at: at + 4, what: "water", can: "can", tile: [134, 5], whose: U.m1 }]) await write(d);
  v = await book();
  t.check("before: their water in the well, in two cans, reaching two plots", same(v.water, [{ by: U.m2, left: 1 }]) && Object.keys(v.reach).length === 1 && Object.keys(Object.values(v.reach)[0]).length === 2 && !!v.carriers[U.m2], v);
  await t.sql(`delete from public.profiles where id = $1`, [U.m2]);
  v = await book();
  t.check("their water in the well is nobody's now; somebody else's can filled with it is of nobody's water", same(v.water, [{ by: null, left: 1 }]) && same(v.cans, { [`${U.m1}/can`]: { by: null, left: 7 } }), v);
  t.check("their count, their can and what their water reached are gone with them", same(v.carriers, {}) && same(v.reach, {}), v);
  r = await call(U.m1, "town_well");
  t.check("the book still opens, with nobody on today's list", !!r.wellBook && same(r.wellBook.carriers, []), r);
}

/* ── the book's count put right by the well ──────────────────────────────── */

t.section("when the file first runs, the book's count is put right by the well itself");
{
  // a town whose well was drawn down by hand after the morning: the oldest water goes
  const B = await town(true);
  await morning(B);
  await B.t.sql(`update public.town_things set doc = '3'::jsonb where key = 'well'`);
  await B.t.sql(FILE);
  v = await B.book();
  t.check("a well with less than the lines say: the oldest lots are shortened to what it holds", same(v.water, [{ by: null, left: 1 }, { by: U.m1, left: 1 }, { by: U.m1, left: 1 }]), v.water);
  // …and one filled by hand: what the lines do not account for is nobody's, and comes last
  const C = await town(true);
  await morning(C);
  await C.t.sql(`update public.town_things set doc = '9'::jsonb where key = 'well'`);
  await C.t.sql(FILE);
  v = await C.book();
  t.check("a well with more than the lines say: the rest is nobody's", same(v.water, [{ by: null, left: 4 }, { by: U.m1, left: 1 }, { by: U.m1, left: 1 }, { by: null, left: 3 }]), v.water);
  // a town where nobody has carried anything yet
  const D = await town(true);
  await D.t.sql(`update public.town_things set doc = '7'::jsonb where key = 'well'`);
  await D.t.sql(FILE);
  v = await D.book();
  t.check("no line of water at all: what the well holds is nobody's, and the book is marked as begun", same(v.water, [{ by: null, left: 7 }]) && same(v.carriers, {}) && (await D.one(`select count(*)::int as n from public.town_well_kept`)).n === 1, v);
  await D.purse(U.m1, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
  r = await D.call(U.m1, "town_chore", ...AT_WELL);
  v = await D.book();
  t.check("…and the first can filled there is read by the trigger", r.ok === true && same(v.water, [{ by: null, left: 6 }]) && same(v.cans, { [`${U.m1}/can`]: { by: null, left: 8 } }), v);
}

/* ── a third time ────────────────────────────────────────────────────────── */

t.section("run a third time");
{
  const was = await book(), deeds = (await one(`select count(*)::int as n from public.town_deeds`)).n;
  await t.run(FILE, "v127 a third time");
  t.check("what the book keeps is as it was: no line is read twice", same(await book(), was), await book());
  t.check("…every function its own text still, and one trigger", same(await texts(), textsNow) && (await one(`select count(*)::int as n from pg_trigger where tgrelid = 'public.town_deeds'::regclass and not tgisinternal`)).n === 1);
  await purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
  await call(U.m1, "town_chore", ...RIVER);
  r = await call(U.m1, "town_chore", ...AT_WELL);
  v = await book();
  t.check("…and the next bucketful poured is read once", r.ok === true && (await one(`select count(*)::int as n from public.town_deeds`)).n === deeds + 2 && v.carriers[U.m1].buckets === (was.carriers[U.m1]?.buckets ?? 0) + 1, v.carriers);
}

await t.done();
