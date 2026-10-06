/*
 * v145 — an insect that eats pests, and a cure that keeps them off: dry run in PGlite.
 *
 * v145 writes four functions again: `town.feed` and `town.deed_for` (v140's: an insect that eats pests is let go on a
 * plant that has one, and eats it so often, by a number of the plot, its plant and the moment), `town.cure` (v110's:
 * the cure that is made covers the plant for a day after), `public.town_tend` (v121's: what came of the insect is
 * written down). And two rows of the catalog over: `farming` (`rids`, `cures`) and `insects` (two weights).
 *
 * Everything up to v138 is replayed in the order it ran and the file tried (it stops: v139 has not run); then v139 to
 * v144 and v146, which ran before it; then v145 twice. Then:
 *
 *   · the file's closing block;
 *   · nothing else moved: of the whole catalog five entries differ; every other rule of the farm's and of the
 *     insects' as it was, to the letter; the four written again held to the ones they replace, word for word but for
 *     the lines of v145.lines.mjs; no table, trigger or index; no write without a WHERE;
 *   · every case of v145's (lib/town/db-vectors-guard.test.ts: plants a pest strikes, before, during and after, with
 *     everything that is put on a plant in the hand, the two insects at many moments), each as the code answers it
 *     now; two of them as the rules answered before the file, which was otherwise;
 *   · the farm's own cases of the rules that read what a hand holds, under a clear sky and in the rain, again; the
 *     insects' rules and the forest's with nothing caught, a ladybird's doing, and the hunted cases of v139;
 *   · a dry day by the database's own rule, every haunt of grass and flowers a turn at a time, before the file and
 *     after: twice the ladybirds and twice the mantises, as many haunts with something as before; and hunted, a kind
 *     is scarce as it was;
 *   · by the function a member calls, with the database's clock: an insect off and one that eats, each written down;
 *     the plant then with no cover; the other covers refused; the cure and its day; the fish; who may; a third time.
 *
 *   FC_REPO=<the tree> node build-v145.mjs && node v145.test.mjs      (RULES=0 skips the cases; RULES=few puts one in four, for the breaks)
 *   node mutate.mjs v145_draft.sql v145.test.mjs v145.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CURE, DEED_FOR, FEED, TOWN_TEND } from "./v145.lines.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const here = (name) => new URL(`./${name}`, import.meta.url);
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history: it ran on 2026-10-06)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v145_"));
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(here("v145_draft.sql")) ? readFileSync(here("v145_draft.sql"), "utf8") : migration(145);
const read = (name) => JSON.parse(readFileSync(here(`now/${name}`), "utf8"));
const FEW = process.env.RULES === "few", NONE = process.env.RULES === "0";
const EATERS = ["ladybird", "mantis"];
// (few: one case in four, and every one of an insect that eats pests on a plant, of a cure, and of what answers a ladybird or a mantis)
const keep = (c) => (c.fn === "feed" && EATERS.includes(c.args[3])) || c.fn === "cure" || (c.fn === "tend" && EATERS.includes(c.args[5]?.hand)) || ["ladybird", "mantis"].includes(c.want?.bug) || c.keep || c.fn === "plenty";
const pickSome = (cases) => (NONE ? [] : FEW ? cases.filter((c, i) => i % 4 === 0 || keep(c)) : cases);
// (the farm's rules that read what a hand holds, or whether a plant has a pest: those written again and what stands on them)
const FARM_FNS = ["tool_of", "pest_at", "see", "feed", "cure", "deed_for", "tend", "tend_sure"];
const V145 = read("vectors-v145.json").cases, FARM = read("vectors-v110.json").filter((c) => FARM_FNS.includes(c.fn));
const rainy = NONE ? { slot: 900000, skies: [], cases: [] } : read("vectors-v118.json");
const V125 = read("vectors-v125.json"), V126 = read("vectors-v126.json"), V131 = read("vectors-v131.json"), V139 = read("vectors-v139.json");

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
/** A row as the SQL editor shows it: whole numbers and counts as numbers, whatever kind of number the column was. */
const plain = (row) => Object.fromEntries(Object.entries(row).map(([k, x]) => [k, typeof x === "bigint" ? Number(x) : typeof x === "string" && /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : x]));

const t = await supabaseLike({ extra });
// (in the order they ran: the well's v127 to v129 before the insects' v126 and v131, v130 after v131; the box, the ladybird, the ground; v136 is the party's, not the town's)
for (const n of [...Array.from({ length: 21 }, (_, i) => 105 + i), 127, 128, 129, 126, 131, 130, 135, 132, 133, 134, 138, 137]) await t.run(migration(n), `v${n}`);
const textOf = async (name) => (await t.sql(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid`, [name])).rows.map((r) => r.def).join("\n");

t.section("it will not run before v139");
{
  const was = await textOf("town.feed");
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v139, it stops at its first line and says why", !!stopped && /v139 has not run/.test(stopped), stopped);
  const v = await t.sql(`select town.cat('farming')->'rids' is null as no_numbers, (town.cat('insects')->'bugs'->'ladybird'->>'weight')::int as ladybird`);
  t.check("…having done nothing", (await textOf("town.feed")) === was && same(v.rows[0], { no_numbers: true, ladybird: 6 }), v.rows);
}
for (const n of [139, 140, 141, 142, 143, 144]) await t.run(migration(n), `v${n}`);
// (v146, three helpings and a buff's level, is another session's of the same evening and ran before this file went
// out; neither stands on the other. It is replayed before this one, as it ran, so that the farm's own cases, which the
// code makes with v146's purses, are answered by the rules the code now has. V145_ALONE=1 leaves it out: this file with
// no v146 before it; with RULES=0, since those cases want v146.)
if (!process.env.V145_ALONE) { let sql = null; try { sql = migration(146); } catch { /* not this tree's */ } if (sql) await t.run(sql, "v146"); }
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const V140_SQL = migration(140), V121_SQL = migration(121), V110_SQL = migration(110);

// a pumpkin sown one morning long ago, which a pest struck at eight the next day: the file's own closing check, and a member's
const KEY = "133,4", SOWN = 1578265200000, STRUCK = 1578358800000, MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000, IN = STRUCK + HOUR;
const pumpkin = (more = {}) => ({ by: "somebody", crop: "pumpkin", sown: SOWN, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more });
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${IN});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
// the word and the sky the insects' cases were made with: a dry first day, rain on the second's afternoon
await t.sql(`update public.town_secrets set word = $1 where key = 'wild'`, [V125.word]);
const wetSky = async () => { await t.sql(`alter table public.town_weather disable trigger user; truncate public.town_weather`);
  for (const slot of V125.wet) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 9, 2) on conflict (slot) do update set sky = 'rain'`, [slot]);
  await t.sql(`alter table public.town_weather enable trigger user`); };
const noSky = () => t.sql(`alter table public.town_weather disable trigger user; truncate public.town_weather; alter table public.town_weather enable trigger user`);
await wetSky();

const CALL = {
  tool_of: "town.tool_of($1::text)",
  pest_at: "town.pest_at($1::text, $2::jsonb, $3::bigint)", see: "town.see($1::text, $2::jsonb, $3::bigint)",
  feed: "town.feed($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", cure: "town.cure($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)",
  deed_for: "town.deed_for($1::text, $2::jsonb, $3::text, $4::text, $5::bigint, $6::text)",
  tend: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint)",
  tend_sure: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint, $9::boolean)",
  wishes: "to_jsonb(town.wishes())",
  // (each asked the way one is asked and, every other case, the way a look at all of them asks: handed the row and the word)
  wild_holds: "town.wild_holds($1::int, $2::bigint)", wild_holds_all: "town.wild_holds($1::int, $2::bigint, town.cat('forest'), town.word())",
  bug_at: "town.bug_at($1::int, $2::bigint)", bug_at_all: "town.bug_at($1::int, $2::bigint, town.cat('insects'), town.word())",
  gather: "town.gather($1::jsonb, $2::int, $3::jsonb, $4::int, $5::boolean, $6::text, $7::int, $8::int, $9::float8, $10::float8, $11::bigint)",
  net: "town.net($1::jsonb, $2::int, $3::jsonb, $4::int, $5::boolean, $6::text, $7::int, $8::int, $9::float8, $10::bigint, $11::text)",
  rid_pick: "town.rid_pick($1::jsonb, $2::bigint, $3::float8)",
  bug_here: "town.bug_here($1::int, $2::bigint, $3::jsonb)", bug_here_all: "town.bug_here($1::int, $2::bigint, $3::jsonb, town.cat('insects'), town.word())",
  comeback: "town.comeback($1::int, $2::bigint, $3::jsonb, $4::float8, $5::float8, $6::float8)",
  comeback_all: "town.comeback($1::int, $2::bigint, $3::jsonb, $4::float8, $5::float8, $6::float8, town.cat('insects'), town.word())",
  plenty: "town.plenty($1::text, $2::bigint)", plenty_all: "town.plenty($1::text, $2::bigint, town.cat('insects'))",
};
const answer = async (c, both = false, n = 0) => {
  const sql = CALL[both && n % 2 && CALL[`${c.fn}_all`] ? `${c.fn}_all` : c.fn];
  if (!sql) throw new Error(`no SQL for ${c.fn}`);
  try { return (await t.db.query(`select ${sql} as r`, c.args.map(param))).rows[0].r ?? null; } catch (e) { return { error: e.message }; }
};
const COVERS = ["guardFert", "ladybird", "lavenderSachet", "mantis", "mosquitofish"], PLAIN = COVERS.filter((c) => !EATERS.includes(c)), CURES = ["archerfish", "pestCure"];

/** Catches written down as town.note writes them (the moment kept to the millisecond): each [insect, moment, how many]. */
const noteCatches = async (rows, who = U.m2) => {
  for (let i = 0; i < rows.length; i += 2000) {
    const part = rows.slice(i, i + 2000);
    await t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, coins, doc)
      select $1, to_timestamp(x.ms / 1000.0), 'net', x.bug, x.n, 0, '{}'::jsonb from unnest($2::text[], $3::bigint[], $4::numeric[]) as x(bug, ms, n)`, [who, part.map((r) => r[0]), part.map((r) => r[1]), part.map((r) => r[2])]);
  }
};
const noCatches = () => t.sql(`delete from public.town_deeds where what = 'net'`);
/** What every haunt of grass and of flowers has from a moment to another, ten minutes at a time (a turn of theirs: each is met once), by the database's own rule. */
const lookedOver = async (from, to) => (await t.sql(`
  select h.v->>1 as place, town.bug_at((h.ord - 1)::int, x.t, town.cat('insects'), town.word())->>'bug' as bug
    from jsonb_array_elements(town.cat('insects')->'haunts') with ordinality as h(v, ord), generate_series($1::bigint, $2::bigint - 1, 600000) as x(t)
   where h.v->>0 in ('field', 'blooms')`, [from, to])).rows;
const at = (s) => Date.parse(`${s}+07:00`);
const DAY1 = [at("2026-10-05T00:00:00"), at("2026-10-06T00:00:00")];
const count = (rows, bug, place) => rows.filter((r) => r.bug === bug && (!place || r.place === place)).length;

// as things stand before the file
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here too"') where key = 'carries'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const UNTOUCHED = ["town.tend", "town.see", "town.pest_at", "town.tool_of", "town.water", "town.sow", "town.pick", "town.hoe", "town.uproot", "town.roll", "town.note", "public.town_farm", "public.town_net",
  "town.bug_at", "town.bug_here", "town.comeback", "town.plenty", "town.net", "town.rid_pick", "public.town_bugs"];
const beforeText = Object.fromEntries(await Promise.all(UNTOUCHED.map(async (name) => [name, await textOf(name)])));
await noSky();
// (two of the cases: an insect that eats pests in the hand of somebody who has it, on a plant with a pest, at a moment it eats it; and the cure on such a plant. Before the file the insect did not go on, and the cure covered nothing.)
const eaten = V145.find((c) => c.fn === "feed" && EATERS.includes(c.args[3]) && c.want.ok === true && c.want.plot.plant.cured === c.args[4] && c.args[2].plant.cured === 0 && c.args[4] % HOUR !== 0);
const cured = V145.find((c) => c.fn === "cure" && c.args[3] === "pestCure" && c.want.ok === true);
const was = { eaten: await answer(eaten), cured: await answer(cured) };
await wetSky();
await noCatches();
was.day = await lookedOver(...DAY1);

await t.runTwice(FILE, "v145");

let v, r;
t.section("what it should say afterwards (the file's closing block)");
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes two rows over, the farm's and the insects', and leaves every other as it was", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === "farming, insects" && v.rows.length === before.length && v.rows.length > 20, { written: v.rows.filter((x) => x.written).map((x) => x.key), rows: v.rows.length });
v = await t.sql(`select (select data->'rids' from public.town_catalog where key = 'farming') as rids,
         (select data->'cures' from public.town_catalog where key = 'farming') as cures,
         (select (data->'bugs'->'ladybird'->>'weight')::int from public.town_catalog where key = 'insects') as ladybird,
         (select (data->'bugs'->'mantis'->>'weight')::int from public.town_catalog where key = 'insects') as mantis,
         (select data->'scarce' from public.town_catalog where key = 'insects') as scarce`);
t.check("a ladybird eats a pest half the time and a mantis seven times in ten; the pest cure keeps a plant 24 hours; they weigh 13 and 50; a kind is hunted scarce as it was",
  same(v.rows[0], { rids: { mantis: 0.7, ladybird: 0.5 }, cures: { pestCure: 24 }, ladybird: 13, mantis: 50, scarce: { day: 24, half: 20 } }), v.rows);
await noSky();
v = await t.sql(`with x as (
    select '133,4'::text as key, 1578362400000::bigint as an_hour_in,
           jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', 'somebody', 'crop', 'pumpkin', 'sown', 1578265200000,
             'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)) as plot,
           town.fresh() || jsonb_build_object('bag', town.put(town.put(town.put(town.put(town.put(town.fresh()->'bag',
             'ladybird', 1), 'mantis', 1), 'lavenderSachet', 1), 'pestCure', 1), 'archerfish', 1)) as purse)
  select (town.see(key, plot, an_hour_in)->>'pest')::boolean as has_a_pest,
         town.deed_for(key, plot, 'ladybird', 'me', an_hour_in, null) as a_ladybird_is_offered,
         round(town.roll('rid|' || key, an_hour_in, 1578265200000)::numeric, 2) as the_moments_number,
         (town.see(key, town.feed(key, purse, plot, 'ladybird', an_hour_in)->'plot', an_hour_in + 1)->>'pest')::boolean as a_pest_after_the_ladybird,
         town.held(town.feed(key, purse, plot, 'ladybird', an_hour_in)->'purse'->'bag', 'ladybird') as ladybirds_left,
         (town.see(key, town.feed(key, purse, plot, 'mantis', an_hour_in)->'plot', an_hour_in + 1)->>'pest')::boolean as a_pest_after_the_mantis,
         (town.feed(key, purse, plot, 'mantis', an_hour_in)->'plot'->'plant'->>'guard')::bigint as covered_by_the_mantis_until,
         (town.feed(key, purse, plot, 'lavenderSachet', an_hour_in)->>'ok')::boolean as a_sachet_goes_on,
         ((town.cure(key, purse, plot, 'pestCure', an_hour_in)->'plot'->'plant'->>'guard')::bigint - an_hour_in) / 3600000 as hours_a_cure_keeps_it,
         (town.cure(key, purse, plot, 'archerfish', an_hour_in)->'plot'->'plant'->>'guard')::bigint as covered_by_the_fish_until
    from x`);
t.check("a pumpkin of long ago with a pest on it, at a moment whose number is 0.68: a ladybird is offered, let go and off, the pest still there; a mantis eats it and covers nothing; a sachet does not go on; the cure keeps it 24 hours, the fish none",
  same(plain(v.rows[0]), { has_a_pest: true, a_ladybird_is_offered: "feed", the_moments_number: 0.68, a_pest_after_the_ladybird: true, ladybirds_left: 0, a_pest_after_the_mantis: false,
    covered_by_the_mantis_until: 0, a_sachet_goes_on: false, hours_a_cure_keeps_it: 24, covered_by_the_fish_until: 0 }), v.rows);
v = await t.sql(`select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
           and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open,
         has_function_privilege('anon', 'public.town_tend(integer, integer, jsonb, boolean)', 'execute') as anon_tends,
         has_function_privilege('authenticated', 'public.town_tend(integer, integer, jsonb, boolean)', 'execute') as a_member_tends`);
t.check("the rules are no browser's, written again or not; tending is a member's and nobody else's", same(plain(v.rows[0]), { open: 0, anon_tends: false, a_member_tends: true }), v.rows);

t.section("nothing else moved");
{
  const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
  const flat = (x, at_ = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at_ ? `${at_}.${k}` : k, out); else out[at_] = JSON.stringify(x); return out; };
  const moved = [];
  for (const row of after) {
    const a = flat(before.find((b) => b.key === row.key).data), b = flat(row.data);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) moved.push(`${row.key}.${k}: ${a[k]} → ${b[k]}`);
  }
  const want = ["farming.rids.ladybird: undefined → 0.5", "farming.rids.mantis: undefined → 0.7", "farming.cures.pestCure: undefined → 24", "insects.bugs.ladybird.weight: 6 → 13", "insects.bugs.mantis.weight: 22 → 50"];
  t.check("of the whole catalog five entries differ: how often each insect eats a pest, how long the cure keeps a plant, and the two weights", same([...moved].sort(), [...want].sort()), { moved: moved.length, odd: moved.filter((m) => !want.includes(m)).concat(want.filter((w) => !moved.includes(w))).slice(0, 6) });
  v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'carries'`);
  t.check("a number an admin changed by hand in a row it does not write is as it was", v.rows[0].note === "an admin was here too", v.rows);
  v = await t.sql(`select town.cat('insects')->'haunts' as h, town.cat('insects')->'order' as o, (select count(*)::int from jsonb_each(town.cat('insects')->'bugs')) as n`);
  t.check("the haunts are where they were, all of them, and the twenty-four insects are weighed in the order they were", same(v.rows[0].h, before.find((b) => b.key === "insects").data.haunts) && same(v.rows[0].o, before.find((b) => b.key === "insects").data.order) && v.rows[0].h.length > 90 && v.rows[0].n === 24, v.rows[0].n);
  const odd = [];
  for (const name of UNTOUCHED) if ((await textOf(name)) !== beforeText[name] || !beforeText[name]) odd.push(name);
  t.check("every other rule of the farm's and of the insects' is as it was, to the letter: a strike and how it is counted, what a plot shows, tending, the roll, what is out and how scarce, a catch, the deed's line", odd.length === 0, odd);
  for (const [name, from, lines, whose] of [["town.feed", V140_SQL, FEED, "v140"], ["town.deed_for", V140_SQL, DEED_FOR, "v140"], ["town.cure", V110_SQL, CURE, "v110"], ["public.town_tend", V121_SQL, TOWN_TEND, "v121"]]) {
    const old = words(from, name), now = words(FILE, name);
    let made = old, once = true;
    for (const [a, b] of lines) { if (!made || made.split(a).length !== 2) once = false; else made = made.replace(a, () => b); }
    t.check(`${name} is ${whose}'s, but for the lines of v145.lines.mjs`, !!old && !!now && once && old !== now && made === now,
      !old ? `not found in ${whose}` : !now ? "not in the file" : !once ? `a line meant is not in ${whose}'s once` : "it differs elsewhere: run build-v145.mjs");
  }
  const made = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  t.check("the file makes four functions and no more, no table, no trigger, no index", same(made.sort(), ["public.town_tend", "town.cure", "town.deed_for", "town.feed"]) && !/create\s+(table|trigger|index)/i.test(FILE.replace(/--.*$/gm, "")), made);
  const bare = await bareWrites((q) => t.sql(q).then((x) => x.rows));
  t.check("no function writes to a table without saying which rows (the live database refuses one)", bare.length === 0, bare);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

/** Where two answers differ: each entry by its path, as it was wanted and as it came. */
const flatAll = (x, at_ = "", out = {}) => { if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) flatAll(y, at_ ? `${at_}.${k}` : k, out); else out[at_] = JSON.stringify(x); return out; };
const differ = (want, got) => { const a = flatAll(want), b = flatAll(got); return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).slice(0, 8).map((k) => `${k}: ${a[k]} → ${b[k]}`); };
const ask = async (cases, title, prefix, both = false) => {
  t.section(`${title}: ${cases.length} cases, each as the site's own code answers it now`);
  const tally = new Map();
  for (const [n, c] of cases.entries()) {
    const got = await answer(c, both, n), ok = !got?.error && same(got, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { hand: c.fn === "deed_for" ? c.args[2] : c.fn === "tend" || c.fn === "tend_sure" ? c.args[5]?.hand : c.args[3], differs: differ(c.want, got) }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${prefix}${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 900)}` : "");
  return tally;
};
{
  const cases = pickSome(V145), tally = await ask(cases, "a cover, an insect that eats pests and a cure, on plants a pest strikes", "");
  if (!NONE) {
    t.check("a cover, a cure, what the hand is offered, the tending and what a plot shows were all asked", ["feed", "cure", "deed_for", "tend", "see"].every((fn) => tally.has(fn)), [...tally.keys()]);
    const tried = cases.filter((c) => c.fn === "feed" && EATERS.includes(c.args[3]) && c.want.ok === true && c.args[2].plant.guard === 0 && (c.want.plot.plant.guard ?? 0) === 0);
    const ate = (id) => tried.filter((c) => c.args[3] === id && c.want.plot.plant.cured === c.args[4]).length, off = (id) => tried.filter((c) => c.args[3] === id && c.want.plot.plant.cured !== c.args[4]).length;
    t.check("among them each of the two insects eats a pest a hundred times and more, and is off a hundred times and more", EATERS.every((id) => ate(id) > 100 && off(id) > 100), Object.fromEntries(EATERS.map((id) => [id, [ate(id), off(id)]])));
  }
  t.check("before the file an insect did not go on a plant with a pest on it: now it does, and at that moment eats it", same(was.eaten, { ok: false, why: "soil" }) && (await answer(eaten))?.ok === true && (await answer(eaten)).plot.plant.cured === eaten.args[4], { was: was.eaten, now: (await answer(eaten))?.ok });
  t.check("…and the cure rid a plant and covered nothing: now it covers it for a day from that moment", was.cured?.ok === true && was.cured.plot.plant.guard === cured.args[2].plant.guard && (await answer(cured)).plot.plant.guard === cured.args[4] + 24 * HOUR, { was: was.cured?.plot?.plant?.guard, now: (await answer(cured))?.plot?.plant?.guard });
}
await ask(pickSome(FARM), "the farm's own cases of those rules, under a clear sky", "the farm's, ");
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
// the insects: their rules read the row this file writes over
await wetSky();
await noCatches();
{
  const tally = await ask(pickSome([...V125.cases, ...V131.cases]), "with nothing caught, the insects' rules and the forest's", "unhunted, ", true);
  if (!NONE) t.check("what a haunt has, of its own and come back, where one comes back, and a catch were all asked", ["bug_at", "bug_here", "comeback", "net"].every((fn) => tally.has(fn)), [...tally.keys()]);
}
if (!NONE) {
  await noSky();
  await ask(pickSome(V126.cases), "a ladybird's doing when it is caught", "caught, ");
  await wetSky();
  await noteCatches(V139.hunts.map((h) => [h.bug, h.at, h.n]));
  const tally = await ask(pickSome(V139.cases), "hunted: how plentiful each kind is, what a haunt has, what comes back", "hunted, ", true);
  t.check("how plentiful a kind is was asked, with what a haunt has and what comes back", ["plenty", "bug_at", "bug_here", "comeback"].every((fn) => tally.has(fn)), [...tally.keys()]);
  await noCatches();
}

/* ── a day of them, by the database's own rule ───────────────────────────── */

t.section("a dry day, every haunt of grass and of flowers ten minutes at a time: twice the ladybirds, twice the mantises");
{
  const day = await lookedOver(...DAY1);
  const share = (bug, place) => count(day, bug, place) / Math.max(1, count(was.day, bug, place));
  t.check("before the file there were some of each: ladybirds on all three maps, mantises on the farm alone", ["town", "farm", "forest"].every((p) => count(was.day, "ladybird", p) > 5) && count(was.day, "mantis", "farm") > 25 && count(was.day, "mantis") === count(was.day, "mantis", "farm"),
    { ladybird: ["town", "farm", "forest"].map((p) => count(was.day, "ladybird", p)), mantis: count(was.day, "mantis") });
  t.check("after it about twice as many ladybirds in the day", share("ladybird") > 1.6 && share("ladybird") < 2.5, { was: count(was.day, "ladybird"), now: count(day, "ladybird") });
  t.check("…on every map", ["town", "farm", "forest"].every((p) => count(day, "ladybird", p) > count(was.day, "ladybird", p)), ["town", "farm", "forest"].map((p) => [count(was.day, "ladybird", p), count(day, "ladybird", p)]));
  t.check("and about twice as many mantises, on the farm alone still", share("mantis") > 1.6 && share("mantis") < 2.5 && count(day, "mantis") === count(day, "mantis", "farm"), { was: count(was.day, "mantis"), now: count(day, "mantis") });
  t.check("as many haunts have something as before, turn for turn: the two take the place of others, they add no insect", day.filter((x) => x.bug).length === was.day.filter((x) => x.bug).length && day.length === was.day.length, { was: was.day.filter((x) => x.bug).length, now: day.filter((x) => x.bug).length });
  t.check("none of either before six in the morning or from six in the evening, as ever", (await lookedOver(at("2026-10-05T18:00:00"), at("2026-10-06T06:00:00"))).filter((x) => EATERS.includes(x.bug)).length === 0);
  // hunted, each is scarce as every insect is: forty of each caught through the morning, and the afternoon has few
  const noon = at("2026-10-05T12:00:00"), afternoon = [noon, at("2026-10-05T18:00:00")];
  const free = await lookedOver(...afternoon);
  await noteCatches(EATERS.flatMap((bug) => Array.from({ length: 40 }, (_, i) => [bug, noon - (i + 1) * 4 * MIN, 1])));
  const hunted = await lookedOver(...afternoon);
  v = await t.sql(`select round(town.plenty('ladybird', $1::bigint)::numeric, 2)::float8 as ladybird, round(town.plenty('mantis', $1::bigint)::numeric, 2)::float8 as mantis, town.plenty('grasshopper', $1::bigint) as grasshopper`, [noon]);
  t.check("forty of each caught in a morning, and each is a third of itself or so; a kind nobody caught is whole", v.rows[0].ladybird > 0.3 && v.rows[0].ladybird < 0.4 && v.rows[0].mantis > 0.3 && v.rows[0].mantis < 0.4 && v.rows[0].grasshopper === 1, v.rows);
  t.check("…so the afternoon has well under two thirds of the ladybirds and of the mantises it would have had: hunted, they grow scarce as before",
    EATERS.every((bug) => count(free, bug) > 12 && count(hunted, bug) < count(free, bug) * 0.66), EATERS.map((bug) => [bug, count(free, bug), count(hunted, bug)]));
  await noCatches();
}
await noSky();

/* ── by the function a member calls ──────────────────────────────────────── */

const rpc = async (who, fn, args = {}) => {
  const keys = Object.keys(args);
  const x = await t.as(who, `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, keys.map((k) => param(args[k])));
  return x.error ? { error: x.error } : x.rows[0].r;
};
/** A member with these things in a bag of ten, one of them in the hand, fed. */
const holding = async (who, hand, things) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'hand', $3::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)))
  on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify([...things.map(([item, n]) => ({ item, n })), ...Array(10).fill(null)].slice(0, 10)), hand]);
const heldOf = async (who, item) => Number((await t.sql(`select town.held(doc->'bag', $2) as n from public.town_purses where member_id = $1`, [who, item])).rows[0]?.n ?? 0);
const staminaOf = async (who) => Number((await t.sql(`select town.stamina_of(doc, town.now_ms()) as n from public.town_purses where member_id = $1`, [who])).rows[0]?.n ?? -1);
const plotAt = async (x, y) => (await t.sql(`select soil, plant from public.town_plots where x = $1 and y = $2`, [x, y])).rows[0] ?? null;
const setPlot = (x, y, plant) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 1)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = 1`, [x, y, JSON.stringify(plant)]);
const pestOn = async (x, y) => (await t.sql(`select (town.see($1, jsonb_build_object('soil', soil, 'plant', plant), town.now_ms())->>'pest')::boolean as pest from public.town_plots where x = $2 and y = $3`, [`${x},${y}`, x, y])).rows[0]?.pest;
const deeds = async (who) => (await t.sql(`select what, thing, doc->>'with' as with_, doc->'rid' as rid, doc->>'whose' as whose from public.town_deeds where member_id = $1 order by id`, [who])).rows;
const noDeeds = () => t.sql(`delete from public.town_deeds where true`);
const numberAt = async (ms) => Number((await t.sql(`select town.roll('rid|133,4', $1::bigint, $2::bigint) as r`, [ms, SOWN])).rows[0].r);

t.section("a member with an insect that eats pests in the hand, at a plant with a pest on it");
await noDeeds();
await clock(IN);
await setPlot(133, 4, pumpkin());
t.check("(a pumpkin stands on the farm with a pest on it, an hour in; the moment's number is over a ladybird's half and under a mantis's seven in ten)", (await pestOn(133, 4)) === true && (await numberAt(IN)) > 0.5 && (await numberAt(IN)) < 0.7, await numberAt(IN));
{
  // a ladybird, at a moment it is off
  await holding(U.m1, "ladybird", [["ladybird", 2], ["pestCure", 1]]);
  const stood = await plotAt(133, 4);
  r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
  t.check("a ladybird is let go on it: the deed is done", r?.ok === true && r.deed === "feed", r?.error ?? { ok: r?.ok, deed: r?.deed, why: r?.why });
  t.check("…and it is off: the plant is as it was to the letter, pest and all, and the page is told so", same(await plotAt(133, 4), stood) && (await pestOn(133, 4)) === true && same(r?.plot, stood) && r?.key === "133,4", { plot: await plotAt(133, 4), told: r?.plot });
  t.check("…the ladybird gone from the bag all the same, and a point of stamina with it", (await heldOf(U.m1, "ladybird")) === 1 && (await staminaOf(U.m1)) === 99, { held: await heldOf(U.m1, "ladybird"), stamina: await staminaOf(U.m1) });
  // the second, a minute on, at a moment it eats
  await clock(IN + MIN);
  t.check("(a minute on the moment's number is under a half)", (await numberAt(IN + MIN)) < 0.5, await numberAt(IN + MIN));
  r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
  v = await plotAt(133, 4);
  t.check("the second, a minute on, eats the pest: the plant is rid of it at that moment, as a cure rids it", r?.ok === true && r.deed === "feed" && v.plant.cured === IN + MIN && (await pestOn(133, 4)) === false && same(r.plot, v), r?.error ?? { ok: r?.ok, cured: v?.plant?.cured });
  t.check("…and is covered by nothing: no cover was put on it", v.plant.guard === 0 && same(v.plant, pumpkin({ cured: IN + MIN })), v.plant);
  t.check("…the second ladybird gone too", (await heldOf(U.m1, "ladybird")) === 0 && (await staminaOf(U.m1)) === 98, { held: await heldOf(U.m1, "ladybird") });
  t.check("both are written down as what was put on the plant, with what came of each: off, then eaten; and whose plant it was", same(await deeds(U.m1), [{ what: "feed", thing: "pumpkin", with_: "ladybird", rid: false, whose: "somebody" }, { what: "feed", thing: "pumpkin", with_: "ladybird", rid: true, whose: "somebody" }]), await deeds(U.m1));
  // rid so, a pest may come again; and an insect let go on it now is a cover, for a day, with nothing said of a pest
  v = await t.sql(`select town.pest_at('133,4', $1::jsonb, $2::bigint) as again`, [JSON.stringify(pumpkin({ cured: IN + MIN })), IN + 20 * DAY]);
  t.check("a plant rid so is not kept from the next pest: one comes to this one later", v.rows[0].again !== null && Number(v.rows[0].again) > IN + MIN, v.rows);
  await holding(U.m1, "mantis", [["mantis", 1]]);
  await clock(IN + 2 * MIN);
  r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
  v = await plotAt(133, 4);
  t.check("a mantis let go on the plant now, which has no pest, covers it for a day from that moment, as on any plant", r?.ok === true && r.deed === "feed" && v.plant.guard === IN + 2 * MIN + 24 * HOUR && v.plant.cured === IN + MIN && (await heldOf(U.m1, "mantis")) === 0, r?.error ?? v?.plant);
  t.check("…written down with no word of a pest: none was there", same((await deeds(U.m1)).at(-1), { what: "feed", thing: "pumpkin", with_: "mantis", rid: null, whose: "somebody" }), (await deeds(U.m1)).at(-1));
  // a mantis at the first moment, whose number is under its seven in ten
  await noDeeds();
  await clock(IN);
  await setPlot(133, 4, pumpkin({ by: U.m1 }));
  await holding(U.m1, "mantis", [["mantis", 1]]);
  r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
  v = await plotAt(133, 4);
  t.check("a mantis at the moment the ladybird was off eats the pest: it is the surer of the two", r?.ok === true && v.plant.cured === IN && v.plant.guard === 0 && (await pestOn(133, 4)) === false, r?.error ?? v?.plant);
  t.check("…on one's own plant, written down with nobody's name beside it", same(await deeds(U.m1), [{ what: "feed", thing: "pumpkin", with_: "mantis", rid: true, whose: null }]), await deeds(U.m1));
}
{
  // how often, by the rule a member's call reaches: every seventh millisecond of an hour of the pest
  v = await t.sql(`select count(*) filter (where (town.feed('133,4', $1::jsonb, $2::jsonb, 'ladybird', x.t)->'plot'->'plant'->>'cured')::bigint = x.t)::int as ladybird,
      count(*) filter (where (town.feed('133,4', $3::jsonb, $2::jsonb, 'mantis', x.t)->'plot'->'plant'->>'cured')::bigint = x.t)::int as mantis, count(*)::int as n
    from generate_series($4::bigint, $4::bigint + 13999, 7) as x(t)`,
    [JSON.stringify({ bag: [{ item: "ladybird", n: 1 }], hand: "ladybird" }), JSON.stringify({ soil: "tilled", plant: pumpkin() }), JSON.stringify({ bag: [{ item: "mantis", n: 1 }], hand: "mantis" }), IN + 1]);
  const row = v.rows[0];
  t.check("over two thousand moments of that pest a ladybird eats it about half the time and a mantis about seven times in ten", row.n === 2000 && row.ladybird > 920 && row.ladybird < 1080 && row.mantis > 1320 && row.mantis < 1480, row);
}

t.section("the other covers, and what makes a plant grow");
await noDeeds();
await clock(IN);
await setPlot(133, 4, pumpkin());
for (const cover of PLAIN) {
  await holding(U.m1, cover, [[cover, 2], ["pestCure", 1]]);
  const stood = await plotAt(133, 4);
  r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
  t.check(`${cover}: it does not go on a plant with a pest, as since v140, and is told the plot is not ready for it`, r?.ok === false && r.why === "soil", r?.error ?? { ok: r?.ok, why: r?.why });
  t.check(`…it is in the bag still, both of them, and the plant has its pest`, (await heldOf(U.m1, cover)) === 2 && same(await plotAt(133, 4), stood), { held: await heldOf(U.m1, cover) });
}
t.check("nothing of those three is written down as done", (await deeds(U.m1)).length === 0, await deeds(U.m1));
// a plant with no pest is covered at once, by each of the five, the insects among them, whatever the moment's number
for (const [i, cover] of COVERS.entries()) {
  await setPlot(134 + i, 4, pumpkin({ sown: IN }));
  await holding(U.m1, cover, [[cover, 1]]);
  r = await rpc(U.m1, "town_tend", { p_x: 134 + i, p_y: 4 });
  v = await plotAt(134 + i, 4);
  t.check(`${cover}: on a plant with no pest it goes on at once, for a day`, r?.ok === true && r.deed === "feed" && v.plant.guard === IN + 24 * HOUR && v.plant.cured === 0 && (await heldOf(U.m1, cover)) === 0, r?.error ?? { ok: r?.ok, why: r?.why });
}
t.check("…none of those five written down with a word of a pest", (await deeds(U.m1)).length === 5 && (await deeds(U.m1)).every((d) => d.what === "feed" && d.rid === null), await deeds(U.m1));
{
  // (another plot has its own strikes: one of this bed with a pest now is found by looking, as the first was)
  let spot = null;
  for (let y = 5; y <= 10 && !spot; y++) for (let x = 132; x <= 138 && !spot; x++) {
    const s = (await t.sql(`select (town.see($1, $2::jsonb, town.now_ms())->>'pest')::boolean as pest`, [`${x},${y}`, JSON.stringify({ soil: "tilled", plant: pumpkin() })])).rows[0].pest;
    if (s) spot = [x, y];
  }
  t.check("(another pumpkin of that morning has a pest on it now)", !!spot, spot);
  if (spot) {
    await setPlot(spot[0], spot[1], pumpkin());
    await holding(U.m1, "growFert", [["growFert", 1]]);
    r = await rpc(U.m1, "town_tend", { p_x: spot[0], p_y: spot[1] });
    v = await plotAt(spot[0], spot[1]);
    t.check("what makes a plant grow goes on it with its pest there, as ever, and leaves the pest", r?.ok === true && r.deed === "feed" && v.plant.fed === IN && v.plant.guard === 0 && v.plant.cured === 0 && (await pestOn(spot[0], spot[1])) === true, r?.error ?? { ok: r?.ok, why: r?.why });
    t.check("…written down with no word of a pest either", (await deeds(U.m1)).at(-1).rid === null && (await deeds(U.m1)).at(-1).with_ === "growFert", (await deeds(U.m1)).at(-1));
  }
}

t.section("a cure");
await noDeeds();
await clock(IN);
await setPlot(133, 4, pumpkin());
await holding(U.m2, "pestCure", [["pestCure", 2], ["lavenderSachet", 1]]);
r = await rpc(U.m2, "town_tend", { p_x: 133, p_y: 4 });
v = await plotAt(133, 4);
t.check("the pest cure, anybody's, takes the pest off, as ever", r?.ok === true && r.deed === "cure" && v.plant.cured === IN && (await pestOn(133, 4)) === false && (await heldOf(U.m2, "pestCure")) === 1, r?.error ?? { ok: r?.ok, deed: r?.deed, why: r?.why });
t.check("…and keeps pests off the plant for 24 hours from that moment", v.plant.guard === IN + 24 * HOUR && same(r.plot, v), v.plant);
{
  const x = await t.sql(`select town.pest_at('133,4', $1::jsonb, $2::bigint) as within, town.pest_at('133,4', $1::jsonb, $3::bigint) as later`, [JSON.stringify(v.plant), IN + 24 * HOUR - 1, IN + 20 * DAY]);
  t.check("no pest comes to it within those hours; one does later", x.rows[0].within === null && x.rows[0].later !== null && Number(x.rows[0].later) >= IN + 24 * HOUR, x.rows);
  // (and that is the cure's doing: of the forty-nine plots of that bed, pumpkins rid of a pest at that moment and no more, some are struck again within the day; kept by the cure, none)
  const y = await t.sql(`select count(*) filter (where town.pest_at(p.k, $1::jsonb, $3::bigint) is not null)::int as rid_only, count(*) filter (where town.pest_at(p.k, $2::jsonb, $3::bigint) is not null)::int as kept, count(*)::int as n
    from (select a || ',' || b as k from generate_series(132, 138) a, generate_series(4, 10) b) p`, [JSON.stringify(pumpkin({ cured: IN })), JSON.stringify(pumpkin({ cured: IN, guard: IN + 24 * HOUR })), IN + 24 * HOUR - 1]);
  t.check("of a bed of plants only rid of a pest, some are struck again within the day; of the same plants with the cure's day, none", y.rows[0].n === 49 && y.rows[0].rid_only > 3 && y.rows[0].kept === 0, y.rows);
}
r = await rpc(U.m2, "town_tend", { p_x: 133, p_y: 4 });
t.check("a second cure does nothing to it: it has no pest", r?.ok === false && r.why === "soil" && (await heldOf(U.m2, "pestCure")) === 1, { ok: r?.ok, why: r?.why });
await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'lavenderSachet') where member_id = $1`, [U.m2]);
r = await rpc(U.m2, "town_tend", { p_x: 133, p_y: 4 });
t.check("nor does a cover go on it: it is covered", r?.ok === false && r.why === "soil" && (await heldOf(U.m2, "lavenderSachet")) === 1, { ok: r?.ok, why: r?.why });
await setPlot(133, 4, pumpkin());
await holding(U.m2, "archerfish", [["archerfish", 1]]);
r = await rpc(U.m2, "town_tend", { p_x: 133, p_y: 4 });
v = await plotAt(133, 4);
t.check("an archerfish takes the pest off and covers nothing, as ever", r?.ok === true && r.deed === "cure" && v.plant.cured === IN && v.plant.guard === 0 && (await pestOn(133, 4)) === false, r?.error ?? v?.plant);
t.check("each is written down as a cure with what was in the hand, and no word more", same(await deeds(U.m2), [{ what: "cure", thing: "pumpkin", with_: "pestCure", rid: null, whose: "somebody" }, { what: "cure", thing: "pumpkin", with_: "archerfish", rid: null, whose: "somebody" }]), await deeds(U.m2));
{
  // a plant covered or cured before the file is as it was: nothing is counted again
  v = await t.sql(`select town.see('133,4', $1::jsonb, $2::bigint) as covered, town.see('133,4', $3::jsonb, $2::bigint) as cured, town.see('133,4', $4::jsonb, $5::bigint) as left_`,
    [JSON.stringify({ soil: "tilled", plant: pumpkin({ guard: IN + 24 * HOUR }) }), IN + 1000, JSON.stringify({ soil: "tilled", plant: pumpkin({ cured: IN }) }), JSON.stringify({ soil: "tilled", plant: pumpkin() }), STRUCK + 7 * HOUR]);
  t.check("a plant covered while it had a pest, before v140, is rid of it still; one cured before this file is cured still; one left with its pest is dead of it seven hours on",
    v.rows[0].covered.pest === false && v.rows[0].cured.pest === false && v.rows[0].left_.dead === true, v.rows);
}

t.section("who may");
r = await t.as("anon", `select public.town_tend(133, 4) as r`);
t.check("nobody signed out tends a plot, as ever", r.code === "42501", r);
for (const [name, call] of [["town.feed", `town.feed('133,4', '{}'::jsonb, '{}'::jsonb, 'ladybird', 0)`], ["town.deed_for", `town.deed_for('133,4', '{}'::jsonb, 'ladybird', 'me', 0, null)`], ["town.cure", `town.cure('133,4', '{}'::jsonb, '{}'::jsonb, 'pestCure', 0)`]]) {
  r = await t.as(U.m1, `select ${call} as r`);
  t.check(`${name}, written again, is no browser's to call`, r.code === "42501", r);
}
r = await t.as(U.unver, `select public.town_tend(133, 4) as r`);
t.check("somebody with no proved character tends nothing, as ever", !!r.error || r.code === "42501" || r.rows?.[0]?.r?.ok === false, r);
r = await t.as(U.nochar, `select public.town_tend(133, 4) as r`);
t.check("…nor somebody with no character at all", !!r.error || r.code === "42501" || r.rows?.[0]?.r?.ok === false, r);

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(jsonb_set(data, '{rids,ladybird}', '0.9'), '{cures,pestCure}', '1') where key = 'farming'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{bugs,mantis,weight}', '22') where key = 'insects'`);
await t.run(FILE, "v145 a third time");
v = await t.sql(`select (select (data->'rids'->>'ladybird')::float8 from public.town_catalog where key = 'farming') as ladybird, (select (data->'cures'->>'pestCure')::int from public.town_catalog where key = 'farming') as cure,
  (select (data->'bugs'->'mantis'->>'weight')::int from public.town_catalog where key = 'insects') as mantis,
  (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written,
  (select count(*)::int from public.town_catalog) as rows, (select data->>'note' from public.town_catalog where key = 'carries') as note`);
t.check("run again, it writes its two rows over again, as its head says: numbers changed by hand in them are put back; no other row, and the admin's note stands", same(v.rows[0], { ladybird: 0.5, cure: 24, mantis: 50, written: "farming, insects", rows: before.length, note: "an admin was here too" }), v.rows);
v = await t.sql(`select (town.feed('133,4', town.fresh() || jsonb_build_object('bag', town.put(town.fresh()->'bag', 'mantis', 1)), $1::jsonb, 'mantis', $2::bigint)->'plot'->'plant'->>'cured')::bigint as cured`, [JSON.stringify({ soil: "tilled", plant: pumpkin() }), IN]);
t.check("…and a mantis eats that pest at that moment still", Number(v.rows[0].cured) === IN, v.rows);

await t.done();
