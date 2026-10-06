/*
 * v147 — pests come a little oftener to a farm with insects on it: dry run in PGlite.
 *
 * v147 keeps the farm's hours (`town_swarms`: an hour of the pests' to a row, how many insects that eat plants were on
 * the farm when it was first looked at in that hour), counts them (`town.farm_bugs`, `town.swarm_note`), tells them to
 * the page (`town.swarms_told`, in `public.town_farm`'s answer, v110's written again), and has `town.pest_at` (v118's,
 * written again) roll a little oftener in an hour that had some. One catalog row over (`farming`: `pests.swarm`).
 *
 * Everything is replayed in the order it ran, to v146, and the file tried (it stops: v145 has not run); then v145;
 * then v147 twice. Then:
 *
 *   · the file's closing block;
 *   · nothing else moved: of the whole catalog three entries differ; every other rule as it was, to the letter; the two
 *     written again held to the ones they replace, word for word but for the lines of v147.lines.mjs; one table, one
 *     index, no trigger; no write without a WHERE;
 *   · every case of v147's (lib/town/db-vectors-swarm.test.ts: plants of every pace under four skies of hours counted),
 *     each sky's hours laid in the table, each case as the code answers it; one of them asked before the file;
 *   · with no hour counted, everything as it was: v145's cases and the farm's own, under a clear sky and in the rain;
 *   · the count: at many moments of a day `town.farm_bugs` is what `town_bugs` tells a member who has caught nothing,
 *     for the farm's haunts and less the two that eat pests; a catch takes one off it; one come back is counted;
 *   · the hour: counted once by the first look, never again; not outside the pests' hours; told to the page once;
 *   · by the functions a member calls: a plant with a pest only for the insects, seen, cured;
 *   · who may; run a third time.
 *
 *   FC_REPO=<the tree> node build-v147.mjs && node v147.test.mjs      (RULES=0 skips the cases; RULES=few puts one in three, for the breaks)
 *   node mutate.mjs v147_draft.sql v147.test.mjs v147.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { PEST_AT, TOWN_FARM } from "./v147.lines.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const here = (name) => new URL(`./${name}`, import.meta.url);
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v147_"));
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(here("v147_draft.sql")) ? readFileSync(here("v147_draft.sql"), "utf8") : migration(147);
const read = (name) => JSON.parse(readFileSync(here(`now/${name}`), "utf8"));
const FEW = process.env.RULES === "few", NONE = process.env.RULES === "0";
// (few: one case in three, and every one whose answer the insects change: found by the first sky's answer to the same question)
const V147 = read("vectors-v147.json"), V125 = read("vectors-v125.json");
const plainOf = new Map(V147.cases.filter((c) => c.sky === 0).map((c) => [JSON.stringify([c.fn, c.args]), JSON.stringify(c.want)]));
const moved = (c) => c.sky !== 0 && plainOf.get(JSON.stringify([c.fn, c.args])) !== JSON.stringify(c.want);
const pickSome = (cases) => (NONE ? [] : FEW ? cases.filter((c, i) => i % 3 === 0 || (c.sky !== undefined && moved(c)) || (c.args?.[1]?.cured ?? 0) % 3600000 === 0 && (c.args?.[1]?.cured ?? 0) > 0) : cases);
const FARM_FNS = ["tool_of", "pest_at", "see", "feed", "cure", "deed_for", "tend", "tend_sure"];
const V145 = read("vectors-v145.json").cases, FARM = read("vectors-v110.json").filter((c) => FARM_FNS.includes(c.fn));
const rainy = NONE ? { slot: 900000, skies: [], cases: [] } : read("vectors-v118.json");

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

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
const lf = (s) => s.split("\r\n").join("\n");
const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3); };
const plain = (row) => Object.fromEntries(Object.entries(row).map(([k, x]) => [k, typeof x === "bigint" ? Number(x) : typeof x === "string" && /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : x]));

const t = await supabaseLike({ extra });
// (in the order they ran: the well's v127 to v129 before the insects' v126 and v131, v130 after v131; the box, the ladybird, the ground; v146 before v145; v136 is the party's, not the town's)
for (const n of [...Array.from({ length: 21 }, (_, i) => 105 + i), 127, 128, 129, 126, 131, 130, 135, 132, 133, 134, 138, 137, 139, 140, 141, 142, 143, 144, 146]) await t.run(migration(n), `v${n}`);
const textOf = async (name) => (await t.sql(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid`, [name])).rows.map((r) => r.def).join("\n");

t.section("it will not run before v145");
{
  const was = await textOf("town.pest_at");
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v145, it stops at its first lines and says why", !!stopped && /v145 has not run/.test(stopped), stopped);
  const v = await t.sql(`select to_regclass('public.town_swarms') is null as no_table, town.cat('farming')->'pests'->'swarm' is null as no_numbers`);
  t.check("…having done nothing", (await textOf("town.pest_at")) === was && same(v.rows[0], { no_table: true, no_numbers: true }), v.rows);
}
await t.run(migration(145), "v145");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const V118_SQL = migration(118), V110_SQL = migration(110);

const at = (s) => Date.parse(`${s}+07:00`);
const SEC = 1000, MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000, NOON = at("2026-10-05T12:00:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
// the word and the sky the insects' cases were made with: a dry first day, rain on the second's afternoon
await t.sql(`update public.town_secrets set word = $1 where key = 'wild'`, [V125.word]);
const wetSky = async () => { await t.sql(`alter table public.town_weather disable trigger user; truncate public.town_weather`);
  for (const slot of V125.wet) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 9, 2) on conflict (slot) do update set sky = 'rain'`, [slot]);
  await t.sql(`alter table public.town_weather enable trigger user`); };
const noSky = () => t.sql(`alter table public.town_weather disable trigger user; truncate public.town_weather; alter table public.town_weather enable trigger user`);

const CALL = {
  tool_of: "town.tool_of($1::text)",
  pest_at: "town.pest_at($1::text, $2::jsonb, $3::bigint)", see: "town.see($1::text, $2::jsonb, $3::bigint)",
  feed: "town.feed($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", cure: "town.cure($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)",
  deed_for: "town.deed_for($1::text, $2::jsonb, $3::text, $4::text, $5::bigint, $6::text)",
  tend: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint)",
  tend_sure: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint, $9::boolean)",
};
const answer = async (c) => { try { return (await t.db.query(`select ${CALL[c.fn]} as r`, c.args.map(param))).rows[0].r ?? null; } catch (e) { return { error: e.message }; } };
/** A sky's hours laid in the table as counted (each noted as its hour began), in place of whatever was there. */
const lay = async (hours) => {
  if (await t.sql(`select to_regclass('public.town_swarms') is not null as there`).then((x) => x.rows[0].there)) await t.sql(`delete from public.town_swarms where true`);
  if (hours.length) await t.sql(`insert into public.town_swarms (hour, bugs, noted) select h, n, h * 3600000 from unnest($1::bigint[], $2::int[]) as x(h, n)`, [hours.map((x) => x[0]), hours.map((x) => x[1])]);
};

// as things stand before the file
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here too"') where key = 'carries'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const UNTOUCHED = ["town.see", "town.feed", "town.cure", "town.deed_for", "town.tend", "town.tool_of", "town.water", "town.sow", "town.pick", "town.hoe", "town.uproot", "town.roll", "town.note", "town.grown", "town.wet_ms",
  "public.town_tend", "public.town_net", "public.town_bugs", "public.town_ditch", "town.bug_at", "town.bug_here", "town.backs_now", "town.comeback", "town.plenty", "town.net", "town.rid_pick", "town.plot_heat"];
const beforeText = Object.fromEntries(await Promise.all(UNTOUCHED.map(async (name) => [name, await textOf(name)])));
await noSky();
// (one of the cases: a plant a pest comes to only for the insects, under the sky with many in every hour. Before the file none came to it.)
const lone = V147.cases.find((c) => c.sky === 2 && c.fn === "pest_at" && c.want !== null && plainOf.get(JSON.stringify([c.fn, c.args])) === "null");
const was = { lone: await answer(lone) };
// (and a member's look at the farm, before: what the answer has)
await clock(NOON);
was.farm = (await t.as(U.m1, `select public.town_farm(0) as r`)).rows?.[0]?.r;

await t.runTwice(FILE, "v147");

let v, r;
t.section("what it should say afterwards (the file's closing block)");
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes one row over, the farm's, and leaves every other as it was", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === "farming" && v.rows.length === before.length && v.rows.length > 20, { written: v.rows.filter((x) => x.written).map((x) => x.key), rows: v.rows.length });
v = await t.sql(`select data->'pests' as pests from public.town_catalog where key = 'farming'`);
t.check("the pests' numbers: three in a hundred, and one or two more where the farm had some insects or many (one, and four)", same(v.rows[0].pests, { to: 18, from: 8, kills: 6, swarm: { adds: [0.01, 0.02], many: 4, some: 1 }, chance: 0.03 }), v.rows);
v = await t.sql(`select (select count(*) from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'town_swarms' and grantee in ('anon', 'authenticated')) as grants,
         (select relrowsecurity from pg_class where oid = 'public.town_swarms'::regclass) as rls,
         town.farm_bugs(town.now_ms()) >= 0 as counts`);
t.check("the table is there and closed, and the farm's insects can be counted", same(plain(v.rows[0]), { grants: 0, rls: true, counts: true }), v.rows);
v = await t.sql(`select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
           and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open,
         has_function_privilege('anon', 'public.town_farm(bigint)', 'execute') as anon_looks,
         has_function_privilege('authenticated', 'public.town_farm(bigint)', 'execute') as a_member_looks`);
t.check("the rules are no browser's, new or written again; the farm is a member's to look at and nobody else's", same(plain(v.rows[0]), { open: 0, anon_looks: false, a_member_looks: true }), v.rows);
// (the "Reading it" queries run, on a table with a few hours in it)
await lay([[Math.floor(NOON / HOUR), 0], [Math.floor(NOON / HOUR) + 1, 2], [Math.floor(NOON / HOUR) + 2, 6]]);
v = await t.sql(`select date_trunc('day', to_timestamp(s.hour * 3600) at time zone 'Asia/Bangkok') as day, count(*) as hours_counted,
         count(*) filter (where s.bugs = 0) as none, count(*) filter (where s.bugs between 1 and 3) as some,
         count(*) filter (where s.bugs >= 4) as many, round(avg(s.bugs), 1) as insects_an_hour
    from public.town_swarms s group by 1 order by 1 desc`);
t.check("the hours counted read a day at a time: none, some, many", v.rows.length === 1 && same(plain({ ...v.rows[0], day: 0 }), { day: 0, hours_counted: 3, none: 1, some: 1, many: 1, insects_an_hour: 2.7 }), v.rows);
v = await t.sql(`select to_char(to_timestamp(s.hour * 3600) at time zone 'Asia/Bangkok', 'HH24:00') as hour, s.bugs from public.town_swarms s order by s.hour`);
t.check("…and hour by hour, by Bangkok's clock", same(v.rows, [{ hour: "12:00", bugs: 0 }, { hour: "13:00", bugs: 2 }, { hour: "14:00", bugs: 6 }]), v.rows);
await lay([]);

t.section("nothing else moved");
{
  const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
  const flat = (x, at_ = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at_ ? `${at_}.${k}` : k, out); else out[at_] = JSON.stringify(x); return out; };
  const movedRows = [];
  for (const row of after) {
    const a = flat(before.find((b) => b.key === row.key).data), b = flat(row.data);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) movedRows.push(`${row.key}.${k}: ${a[k]} → ${b[k]}`);
  }
  const want = ["farming.pests.swarm.some: undefined → 1", "farming.pests.swarm.many: undefined → 4", "farming.pests.swarm.adds: undefined → [0.01,0.02]"];
  t.check("of the whole catalog three entries differ: how many insects are some, how many are many, and what each adds", same([...movedRows].sort(), [...want].sort()), { moved: movedRows.length, odd: movedRows.filter((m) => !want.includes(m)).concat(want.filter((w) => !movedRows.includes(w))).slice(0, 6) });
  v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'carries'`);
  t.check("a number an admin changed by hand in a row it does not write is as it was", v.rows[0].note === "an admin was here too", v.rows);
  const odd = [];
  for (const name of UNTOUCHED) if ((await textOf(name)) !== beforeText[name] || !beforeText[name]) odd.push(name);
  t.check("every other rule is as it was, to the letter: what a plot shows, a cover, a cure, what a hand is offered, tending, the roll, what is out at a haunt and how scarce, a catch, a ladybird's doing", odd.length === 0, odd);
  for (const [name, from, lines, whose] of [["town.pest_at", V118_SQL, PEST_AT, "v118"], ["public.town_farm", V110_SQL, TOWN_FARM, "v110"]]) {
    const old = words(from, name), now = words(FILE, name);
    let made = old, once = true;
    for (const [a, b] of lines) { if (!made || made.split(a).length !== 2) once = false; else made = made.replace(a, () => b); }
    t.check(`${name} is ${whose}'s, but for the lines of v147.lines.mjs`, !!old && !!now && once && old !== now && made === now,
      !old ? `not found in ${whose}` : !now ? "not in the file" : !once ? `a line meant is not in ${whose}'s once` : "it differs elsewhere: run build-v147.mjs");
  }
  const made = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  const bare = lf(FILE).replace(/--.*$/gm, "");
  t.check("the file makes five functions (three new, two written again), one table and its index, and no trigger", same(made.sort(), ["public.town_farm", "town.farm_bugs", "town.pest_at", "town.swarm_note", "town.swarms_told"])
    && (bare.match(/create\s+table/gi) ?? []).length === 1 && (bare.match(/create\s+index/gi) ?? []).length === 1 && !/create\s+trigger/i.test(bare), made);
  const writes = await bareWrites((q) => t.sql(q).then((x) => x.rows));
  t.check("no function writes to a table without saying which rows (the live database refuses one)", writes.length === 0, writes);
  v = await t.sql(`select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'town_swarms' order by ordinal_position`);
  t.check("the table is an hour, how many, and when it was counted", same(v.rows, [{ column_name: "hour", data_type: "bigint", is_nullable: "NO" }, { column_name: "bugs", data_type: "integer", is_nullable: "NO" }, { column_name: "noted", data_type: "bigint", is_nullable: "NO" }]), v.rows);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

const flatAll = (x, at_ = "", out = {}) => { if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) flatAll(y, at_ ? `${at_}.${k}` : k, out); else out[at_] = JSON.stringify(x); return out; };
const differ = (want, got) => { const a = flatAll(want), b = flatAll(got); return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).slice(0, 8).map((k) => `${k}: ${a[k]} → ${b[k]}`); };
const ask = async (cases, title, prefix) => {
  t.section(`${title}: ${cases.length} cases, each as the site's own code answers it now`);
  const tally = new Map();
  for (const c of cases) {
    const got = await answer(c), ok = !got?.error && same(got, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: c.args.map((a) => (a && typeof a === "object" ? (a.crop ? a : "…") : a)), differs: differ(c.want, got) }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${prefix}${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 900)}` : "");
  return tally;
};
const SKY_NAME = ["no hour counted", "some insects in every hour", "many insects in every hour", "an uneven week, with hours nobody counted"];
for (const [n, hours] of V147.skies.entries()) {
  await lay(hours);
  const cases = pickSome(V147.cases.filter((c) => c.sky === n));
  const tally = await ask(cases, `under ${SKY_NAME[n]}`, `${["none", "some", "many", "uneven"][n]}, `);
  if (!NONE) t.check(`${["none", "some", "many", "uneven"][n]}: when a pest came, what a plot shows, a cover, a cure, what a hand is offered and the tending were all asked`, ["pest_at", "see", "feed", "cure", "deed_for", "tend"].every((fn) => tally.has(fn)), [...tally.keys()]);
}
if (!NONE) {
  const changed = V147.cases.filter(moved), by = (fn) => changed.filter((c) => c.fn === fn).length;
  t.check("among them the insects change hundreds of answers: when a pest came, what a plot shows, and what a hand does", by("pest_at") > 60 && by("see") > 60 && by("deed_for") + by("cure") + by("tend") + by("feed") > 20, { pest_at: by("pest_at"), see: by("see"), hand: by("deed_for") + by("cure") + by("tend") + by("feed") });
}
{
  await lay(V147.skies[2]);
  const now = await answer(lone);
  t.check("before the file no pest came to a plant that one comes to now, in an hour the farm had many insects on it", was.lone === null && now === lone.want && now !== null, { was: was.lone, now, want: lone.want });
  await lay([]);
  t.check("…and with no hour counted, none comes to it still", (await answer(lone)) === null);
}
await lay([]);
await ask(pickSome(V145), "with no hour counted, a cover, an insect that eats pests and a cure, on plants a pest strikes", "uncounted, ");
await ask(pickSome(FARM), "…and the farm's own cases of those rules, under a clear sky", "the farm's, ");
if (rainy.cases.length) {
  const SLOT = rainy.slot, thin = FEW ? 6 : 1, some = rainy.cases.filter((c) => FARM_FNS.includes(c.fn)).filter((c, i) => i % thin === 0);
  t.section(`…and in the rain: ${some.length} cases, under ${rainy.skies.length} skies`);
  const tally = new Map();
  let sky = -1;
  for (const c of some) {
    if (c.sky !== sky) {
      sky = c.sky;
      await t.sql(`alter table public.town_weather disable trigger user; truncate public.town_weather`);
      const rows = rainy.skies[sky].map((s, n) => [s, ["rain", "drizzle", "storm"][n % 3]]);
      for (let i = 0; i < rows.length; i += 4000) {
        const part = rows.slice(i, i + 4000);
        await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) select s, k, 8, 16, case when k in ('rain', 'storm') then 2.5 else 0.2 end from unnest($1::bigint[], $2::text[]) as x(s, k) on conflict (slot) do nothing`, [part.map((x) => x[0]), part.map((x) => x[1])]);
      }
      await t.sql(`alter table public.town_weather enable trigger user`);
    }
    const got = await answer(c), ok = !got?.error && same(got, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { sky: c.sky, want: c.want, got }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`in the rain, ${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 900)}` : "");
  t.check("the quarter hour is as long here as in the code", SLOT === 900000, SLOT);
}

/* ── the count ───────────────────────────────────────────────────────────── */

const rpc = async (who, fn, args = {}) => {
  const keys = Object.keys(args);
  const x = await t.as(who, `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, keys.map((k) => param(args[k])));
  return x.error ? { error: x.error } : x.rows[0].r;
};
const HAUNTS = (await t.sql(`select town.cat('insects')->'haunts' as h`)).rows[0].h, EATERS = ["ladybird", "mantis"];
const counted = async (ms) => Number((await t.sql(`select town.farm_bugs($1::bigint) as n`, [ms])).rows[0].n);
/** What a member who has caught nothing is told is out on the farm, less the two that eat pests: [haunt, insect, turn]. */
const toldOnFarm = async (who, ms) => { await clock(ms); const told = await rpc(who, "town_bugs"); return (told.bugs ?? []).filter(([id, bug]) => HAUNTS[id][1] === "farm" && !EATERS.includes(bug)); };
await wetSky();
await t.sql(`delete from public.town_takes where true; delete from public.town_comebacks where true; delete from public.town_deeds where true`);

t.section("the count: what is out on the farm that nobody has caught, less the two that eat pests");
{
  const DAY1 = at("2026-10-05T06:00:00");
  let bad = null, most = 0, sum = 0, eaters = 0, moments = 0;
  for (let ms = DAY1; ms < DAY1 + 14 * HOUR; ms += 13 * MIN) {
    const told = await toldOnFarm(U.m1, ms), n = await counted(ms);
    const all = (await rpc(U.m1, "town_bugs")).bugs.filter(([id]) => HAUNTS[id][1] === "farm");
    eaters += all.length - told.length;
    if (n !== told.length) bad ??= { ms, n, told: told.length };
    most = Math.max(most, n); sum += n; moments++;
  }
  t.check("at every moment of a day, a quarter hour or so apart, it is what a member who has caught nothing is told is out on the farm, less ladybirds and mantises", bad === null && moments > 60, bad ?? moments);
  t.check("…some six of them at a time by day, never more than the farm has haunts; and ladybirds and mantises were out beside them, uncounted", sum / moments > 3 && most >= 6 && most <= HAUNTS.filter((h) => h[1] === "farm").length && eaters > 10, { mean: sum / moments, most, eaters });
  // a catch takes one off the count
  const ms = at("2026-10-05T10:07:00"), told = await toldOnFarm(U.m1, ms), n = await counted(ms);
  t.check("(a moment with several on the farm)", told.length >= 3 && n === told.length, { n, told: told.length });
  const [haunt, , turn] = told[0];
  await t.sql(`insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', $1, $2, $3, now())`, [haunt, turn, U.m2]);
  t.check("one of them caught by somebody: one fewer is counted, and it is gone for the other member too", (await counted(ms)) === n - 1 && (await toldOnFarm(U.m1, ms)).length === n - 1, { now: await counted(ms) });
  // (the same haunt caught in another turn of its own is nothing to this one)
  await t.sql(`insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', $1, $2, $3, now())`, [told[1][0], Number(told[1][2]) - 1, U.m2]);
  t.check("…a catch in another turn of a haunt's takes nothing off", (await counted(ms)) === n - 1);
  // one come back to a haunt of the farm's that has nothing is counted; a ladybird come back is not
  const empty = HAUNTS.map((h, i) => [h, i]).filter(([h]) => h[1] === "farm" && h[0] === "field").map(([, i]) => i);
  let free = null;
  for (const i of empty) { if ((await t.sql(`select town.bug_here($1::int, $2::bigint, '[]'::jsonb) is null as none`, [i, ms])).rows[0].none) { free = i; break; } }
  t.check("(a haunt of the farm's with nothing in its turn)", free !== null, free);
  if (free !== null) {
    const turnOf = async (i) => Number((await t.sql(`select (town.bug_at($1::int, $2::bigint)->>'turn') as t`, [i, ms])).rows[0].t ?? (await t.sql(`select (b->>'turn') as t from (select town.bug_at(i, $1::bigint) as b from generate_series(0, 93) i) x where b is not null limit 1`, [ms])).rows[0].t);
    const cols = (await t.sql(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'town_comebacks' order by ordinal_position`)).rows.map((x) => x.column_name);
    // (its turn's number: the turn a moment is in, by the haunt's own minutes: asked of the rule with a haunt that has something)
    const kindEvery = Number((await t.sql(`select (town.cat('insects')->'kinds'->'field'->>'every')::int as e`)).rows[0].e);
    const withOne = async (bug) => {
      await t.sql(`delete from public.town_comebacks where true`);
      // every turn it could be in is given one: the right one among them is the one read
      for (let k = -2; k <= 2; k++) {
        const turn = Math.floor(ms / (kindEvery * MIN)) + k;
        await t.sql(`insert into public.town_comebacks (${cols.join(", ")}) select ${cols.map((c) => ({ haunt: "$1::int", turn: "$2::bigint", bug: "$3::text", n: "1", from_ms: "$4::bigint", "from": "$4::bigint", at_ms: "$4::bigint", by: "$5::uuid", member_id: "$5::uuid", whose: "$5::uuid", at: "to_timestamp($4::bigint / 1000.0)", created_at: "now()" })[c] ?? "null").join(", ")}`, [free, turn, bug, ms - 1000, U.m2]).catch(() => {});
      }
      return counted(ms);
    };
    const withGrass = await withOne("grasshopper"), withLady = await withOne("ladybird");
    t.check("an insect come back to it after a catch is counted like any; a ladybird come back is not", withGrass === n && withLady === n - 1, { n: n - 1, withGrass, withLady, cols, turnOf: await turnOf(told[2]?.[0] ?? 0) });
    await t.sql(`delete from public.town_comebacks where true`);
  }
  await t.sql(`delete from public.town_takes where true`);
}

/* ── the hour ────────────────────────────────────────────────────────────── */

t.section("the farm's hour: counted once by the first look, and told to the page once");
{
  await lay([]);
  const TEN = at("2026-10-05T10:07:00"), H = Math.floor(TEN / HOUR);
  const rows = async () => (await t.sql(`select hour, bugs, noted from public.town_swarms order by hour`)).rows.map(plain);
  t.check("(before anybody looks, no hour is counted; and the farm's answer had no hours before the file)", (await rows()).length === 0 && was.farm && !("swarms" in was.farm), was.farm ? Object.keys(was.farm) : was.farm);
  await clock(TEN);
  const n = await counted(TEN);
  r = await rpc(U.m1, "town_farm", { p_since: 0 });
  t.check("a member looks at the farm at seven past ten: the hour is counted, with what is on the farm at that moment", same(await rows(), [{ hour: H, bugs: n, noted: TEN }]) && n >= 3, await rows());
  t.check("…and the answer tells it, beside the plots, the beds and the well as ever", same(r?.swarms, { [H]: n }) && typeof r.now === "number" && "plots" in r && "beds" in r && "well" in r, r?.error ?? { swarms: r?.swarms, keys: Object.keys(r ?? {}) });
  t.check("…the rest of the answer being what it was before the file, to the letter", same({ ...r, swarms: undefined, now: 0 }, { ...was.farm, now: 0 }), Object.keys(r ?? {}));
  // every insect on the farm caught: the hour stays as it was counted
  const told = await toldOnFarm(U.m1, TEN + 5 * MIN);
  for (const [haunt, , turn] of told) await t.sql(`insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', $1, $2, $3, now()) on conflict do nothing`, [haunt, turn, U.m2]);
  t.check("(five minutes on every insect on the farm is caught: none is counted now)", (await counted(TEN + 5 * MIN)) === 0);
  r = await rpc(U.m2, "town_farm", { p_since: 0 });
  t.check("another look in the same hour counts nothing again: the hour is as it was counted, for good", same(await rows(), [{ hour: H, bugs: n, noted: TEN }]) && same(r?.swarms, { [H]: n }), await rows());
  // a page that asked a minute ago is not told again
  await clock(TEN + 6 * MIN);
  r = await rpc(U.m1, "town_farm", { p_since: TEN + 5 * MIN });
  t.check("a page that has asked since is told no hour again", same(r?.swarms, {}), r?.swarms);
  r = await rpc(U.m1, "town_farm", { p_since: TEN });
  t.check("…but one that asked as the hour was being counted is told it once more, never missed", same(r?.swarms, { [H]: n }), r?.swarms);
  // the next hour, with every insect of its first moment caught beforehand: counted with none, and not told (an hour with none is not told)
  const ELEVEN = (H + 1) * HOUR + 30 * SEC;
  for (const [haunt, , turn] of await toldOnFarm(U.m1, ELEVEN)) await t.sql(`insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', $1, $2, $3, now()) on conflict do nothing`, [haunt, turn, U.m2]);
  await clock(ELEVEN);
  r = await rpc(U.m1, "town_farm", { p_since: TEN + 6 * MIN });
  t.check("the next hour, looked at with every insect on the farm caught: counted with none, and no hour is told for it", same(await rows(), [{ hour: H, bugs: n, noted: TEN }, { hour: H + 1, bugs: 0, noted: ELEVEN }]) && same(r?.swarms, {}), { rows: await rows(), told: r?.swarms });
  // an hour that is not the pests' is not counted at all
  for (const [name, when] of [["seven in the morning", at("2026-10-06T07:20:00")], ["six in the evening", at("2026-10-05T18:00:00")], ["midnight", at("2026-10-06T00:10:00")]]) {
    await clock(when);
    await rpc(U.m1, "town_farm", { p_since: when });
    t.check(`a look at ${name} counts no hour: it is not one of the pests'`, (await rows()).length === 2, await rows());
  }
  // eight in the morning is, and five in the afternoon
  await clock(at("2026-10-06T08:00:00"));
  await rpc(U.m1, "town_farm", { p_since: 0 });
  await clock(at("2026-10-06T17:59:59"));
  await rpc(U.m1, "town_farm", { p_since: 0 });
  v = await rows();
  t.check("a look on the stroke of eight is the day's first hour counted, and one a second before six its last", v.length === 4 && v[2].hour === Math.floor(at("2026-10-06T08:00:00") / HOUR) && v[3].hour === Math.floor(at("2026-10-06T17:00:00") / HOUR), v);
  // an hour nobody looked at has no row, and is an hour with none
  t.check("the hours between, which nobody looked at the farm in, have no row: nothing was counted behind anybody's back", !v.some((x) => x.hour > H + 1 && x.hour < v[2].hour));
  // a month on, a page asking for the first time is not told hours that old; a fortnight on, it is
  await clock(TEN + 14 * DAY);
  r = await rpc(U.m1, "town_farm", { p_since: 0 });
  t.check("a fortnight on, a page that asks for the first time is told the hours that had insects, all of them", Object.keys(r?.swarms ?? {}).filter((h) => Number(h) <= v[3].hour).length === v.filter((x) => x.bugs > 0).length && v.filter((x) => x.bugs > 0).length >= 1, r?.swarms);
  await clock(TEN + 33 * DAY);
  r = await rpc(U.m1, "town_farm", { p_since: 0 });
  t.check("thirty-three days on, it is told none of those hours: no plant looks so far back", same(Object.keys(r?.swarms ?? { x: 1 }).filter((h) => Number(h) <= v[3].hour), []), r?.swarms);
  await t.sql(`delete from public.town_takes where true`);
}

/* ── by the functions a member calls ─────────────────────────────────────── */

const holding = async (who, hand, things) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'hand', $3::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)))
  on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify([...things.map(([item, n]) => ({ item, n })), ...Array(10).fill(null)].slice(0, 10)), hand]);
const setPlot = (x, y, plant) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 1)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = 1`, [x, y, JSON.stringify(plant)]);
const plotAt = async (x, y) => (await t.sql(`select soil, plant from public.town_plots where x = $1 and y = $2`, [x, y])).rows[0] ?? null;

t.section("a member at a plant that has a pest only for the insects");
{
  await noSky();
  await lay([]);
  // a pumpkin sown at six one morning in a bed of the farm's; nine o'clock is its first hour with a roll between three and five in a hundred, found by looking
  const SOWN = at("2026-10-07T06:00:00"), NINE = at("2026-10-07T09:00:00"), H = Math.floor(NINE / HOUR);
  const pumpkin = { by: U.m2, crop: "pumpkin", sown: SOWN, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
  // (over the whole farm, its twenty-four beds of forty-nine plots: one plot in fifty has such a roll)
  const found = (await t.sql(`select p.x, p.y from (select (c->>0)::int + dx as x, (c->>1)::int + dy as y
      from jsonb_array_elements(town.cat('farming')->'bedsAt') c, generate_series(0, 6) dx, generate_series(0, 6) dy) p
    where town.roll(p.x::text || ',' || p.y::text, $1::bigint, $2::bigint) >= 0.04 and town.roll(p.x::text || ',' || p.y::text, $1::bigint, $2::bigint) < 0.05
      and town.pest_at(p.x::text || ',' || p.y::text, $3::jsonb, $4::bigint) is null order by p.x, p.y limit 1`, [H, SOWN, JSON.stringify(pumpkin), NINE + 30 * MIN])).rows[0];
  const spot = found ? [Number(found.x), Number(found.y)] : null;
  t.check("(a plot whose roll for nine o'clock falls between four and five in a hundred, and no pest before)", !!spot, spot);
  if (spot) {
    const [x, y] = spot, key = `${x},${y}`;
    await setPlot(x, y, pumpkin);
    await clock(NINE + 30 * MIN);
    await holding(U.m1, "pestCure", [["pestCure", 2]]);
    r = await rpc(U.m1, "town_tend", { p_x: x, p_y: y });
    t.check("with no hour counted it has no pest: a cure is offered nothing", r?.ok === false && r.why === "soil", r?.error ?? r);
    // the hour counted with two: four in a hundred, and this plot's roll is over that
    await lay([[H, 2]]);
    v = await t.sql(`select town.roll($1, $2::bigint, $3::bigint) as r`, [key, H, SOWN]);
    const roll = Number(v.rows[0].r);
    r = await rpc(U.m1, "town_tend", { p_x: x, p_y: y });
    t.check("with some insects counted for nine o'clock it has none still: its roll is over four in a hundred", r?.ok === false && r.why === "soil" && roll >= 0.03 + 0.01 && roll < 0.05, { roll, r: r?.ok });
    // the hour counted with six: five in a hundred, and it has a pest since nine
    await lay([[H, 6]]);
    v = await t.sql(`select town.pest_at($1, $2::jsonb, town.now_ms()) as struck, town.see($1, jsonb_build_object('soil', 'tilled', 'plant', $2::jsonb), town.now_ms()) as seen`, [key, JSON.stringify(pumpkin)]);
    t.check("with many counted for nine o'clock it has had a pest since the stroke of nine", Number(v.rows[0].struck) === NINE && v.rows[0].seen.pest === true && v.rows[0].seen.dead === false, v.rows);
    await holding(U.m1, "pestCure", [["pestCure", 2]]);
    r = await rpc(U.m1, "town_tend", { p_x: x, p_y: y });
    v = await plotAt(x, y);
    t.check("…and a member's cure takes it off, and keeps the plant a day (v145)", r?.ok === true && r.deed === "cure" && v.plant.cured === NINE + 30 * MIN && v.plant.guard === NINE + 30 * MIN + 24 * HOUR, r?.error ?? { ok: r?.ok, why: r?.why });
    // left alone it dies of it six hours on; with the hour uncounted it lives
    v = await t.sql(`select town.see($1, jsonb_build_object('soil', 'tilled', 'plant', $2::jsonb), $3::bigint)->>'dead' as dead`, [key, JSON.stringify(pumpkin), NINE + 6 * HOUR + 1]);
    await lay([]);
    r = await t.sql(`select town.see($1, jsonb_build_object('soil', 'tilled', 'plant', $2::jsonb), $3::bigint)->>'dead' as dead`, [key, JSON.stringify(pumpkin), NINE + 6 * HOUR + 1]);
    t.check("left with it, the plant is dead six hours on; had the hour had no insects, it would live", v.rows[0].dead === "true" && r.rows[0].dead === "false", { counted: v.rows[0].dead, uncounted: r.rows[0].dead });
  }
  // a plant rid of a pest on the very stroke of its hour is rid of it
  const lonePlant = { by: U.m2, crop: "pumpkin", sown: 1578265200000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 }, STRUCK = 1578358800000;
  v = await t.sql(`select town.pest_at('133,4', $1::jsonb, $2::bigint) as struck, town.pest_at('133,4', $3::jsonb, $2::bigint) as cured_on_the_stroke, town.pest_at('133,4', $3::jsonb, $4::bigint) as and_an_hour_on,
      (town.see('133,4', jsonb_build_object('soil', 'tilled', 'plant', $3::jsonb), $2::bigint)->>'pest')::boolean as pest`,
    [JSON.stringify(lonePlant), STRUCK, JSON.stringify({ ...lonePlant, cured: STRUCK }), STRUCK + HOUR - 1]);
  t.check("a plant rid of its pest on the very stroke of the hour it came is rid of it: that hour's roll is the pest it was rid of", Number(v.rows[0].struck) === STRUCK && v.rows[0].cured_on_the_stroke === null && v.rows[0].and_an_hour_on === null && v.rows[0].pest === false, v.rows);
}

t.section("who may");
r = await t.as("anon", `select public.town_farm(0) as r`);
t.check("nobody signed out looks at the farm, as ever", r.code === "42501", r);
r = await t.as(U.unver, `select public.town_farm(0) as r`);
t.check("nor somebody with no proved character", !!r.error || r.code === "42501", r);
{
  const n = (await t.sql(`select count(*)::int as n from public.town_swarms`)).rows[0].n;
  t.check("…and neither of them counted an hour by trying", (await t.sql(`select count(*)::int as n from public.town_swarms`)).rows[0].n === n);
}
for (const [name, call] of [["town.farm_bugs", `town.farm_bugs(0)`], ["town.swarm_note", `town.swarm_note(0)`], ["town.swarms_told", `town.swarms_told(0)`], ["town.pest_at", `town.pest_at('133,4', '{}'::jsonb, 0)`]]) {
  r = await t.as(U.m1, `select ${call} as r`);
  t.check(`${name} is no browser's to call`, r.code === "42501", r);
}
await lay([[1, 5]]);
for (const who of ["anon", U.m1, U.admin]) {
  r = await t.as(who, `select * from public.town_swarms`);
  t.check(`the hours are not read from outside by ${who === "anon" ? "somebody signed out" : who === U.admin ? "an admin's browser" : "a member"}`, r.code === "42501", r.code ?? r.rows);
  r = await t.as(who, `insert into public.town_swarms (hour, bugs, noted) values (2, 0, 0)`);
  t.check(`…nor written`, r.code === "42501", r.code ?? r.rows);
  r = await t.as(who, `update public.town_swarms set bugs = 0 where hour = 1`);
  t.check(`…nor changed`, r.code === "42501", r.code ?? r.rows);
}
v = await t.sql(`select hour, bugs from public.town_swarms order by hour`);
t.check("the hour laid there is as it was: one row, five", same(v.rows.map(plain), [{ hour: 1, bugs: 5 }]), v.rows);

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{pests,swarm,many}', '99') where key = 'farming'`);
await t.run(FILE, "v147 a third time");
v = await t.sql(`select (select (data->'pests'->'swarm'->>'many')::int from public.town_catalog where key = 'farming') as many,
  (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written,
  (select count(*)::int from public.town_catalog) as rows, (select data->>'note' from public.town_catalog where key = 'carries') as note,
  (select count(*)::int from public.town_swarms) as hours_kept`);
t.check("run again, it writes its row over again, as its head says: a number changed by hand in it is put back; no other row; and the hours counted are kept", same(v.rows[0], { many: 4, written: "farming", rows: before.length, note: "an admin was here too", hours_kept: 1 }), v.rows);

await t.done();
