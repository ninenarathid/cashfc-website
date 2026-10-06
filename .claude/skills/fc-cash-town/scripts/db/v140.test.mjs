/*
 * v140 — a cover is not a cure: dry run in PGlite.
 *
 * v140 writes two of the farm's rules again: `town.feed` (v110's) no longer puts a thing that keeps pests off (`guard`)
 * on a plant that has a pest, and `town.deed_for` (v119's) no longer offers it there. No table, no catalog row.
 *
 * v105 to v118 are replayed as they ran and the file tried (it stops: v119 has not run); then the rest in the order
 * they ran, v139 where this tree has it; then v140 twice. Then:
 *
 *   · the file's closing block: a pumpkin of long ago with a pest on it, a ladybird and a cure;
 *   · nothing else moved: no row of the catalog written, every other rule of the farm's as it was, to the letter;
 *     the two written again held to the ones they replace, word for word but for the lines of v140.lines.mjs;
 *   · every case of v140's (lib/town/db-vectors-guard.test.ts: plants a pest strikes, before, during and after, with
 *     everything that is put on a plant in the hand), each as the code answers it now; and one of them as the rules
 *     answered it before the file, which was the other way;
 *   · the farm's own cases of the rules that read what a hand holds (lib/town/db-vectors.test.ts), under a clear sky
 *     and in the rain, again;
 *   · by the function a member calls, with the database's clock: each of the five covers refused to a plant with a
 *     pest, kept in the bag, nothing written down; a cure taken; then a cover; a plant with none covered at once; a
 *     plant covered while it had a pest, before the file, rid of it still;
 *   · who may; run a third time.
 *
 * Its rule cases are v140's own (`now/vectors-v140.json`, and the farm's): made from the tree as v140 went out, 9cf5932,
 * where no cover went on a plant with a pest and no cure covered one. v145 lets two insects go on such a plant and has
 * the pest cure keep it a day; lib/town/db-vectors-guard.test.ts writes the cases of the code as it stands to
 * `vectors-v145.json`, which v145.test.mjs reads. This file is run again only with the cases of 9cf5932.
 *
 *   FC_REPO=<the tree> node build-v140.mjs && node v140.test.mjs      (RULES=0 skips the cases; RULES=few puts one in four, for the breaks)
 *   node mutate.mjs v140_draft.sql v140.test.mjs v140.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { DEED_FOR, FEED } from "./v140.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v140_draft.sql")) ? readFileSync(here("v140_draft.sql"), "utf8") : migration(140);
const read = (name) => JSON.parse(readFileSync(here(`now/${name}`), "utf8"));
const FEW = process.env.RULES === "few", NONE = process.env.RULES === "0";
const pickSome = (cases) => (NONE ? [] : FEW ? cases.filter((c, i) => i % 4 === 0) : cases);
// (the farm's rules that read what a hand holds, or whether a plant has a pest: the two written again and what stands on them)
const FARM_FNS = ["tool_of", "pest_at", "see", "feed", "cure", "deed_for", "tend", "tend_sure"];
const V140 = read("vectors-v140.json").cases, FARM = read("vectors-v110.json").filter((c) => FARM_FNS.includes(c.fn));
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

const t = await supabaseLike({ extra });
for (let n = 105; n <= 118; n++) await t.run(migration(n), `v${n}`);
const V110_SQL = migration(110), V119_SQL = migration(119);

t.section("it will not run before v119");
{
  const was = (await t.sql(`select pg_get_functiondef('town.feed(text, jsonb, jsonb, text, bigint)'::regprocedure) as def`)).rows[0].def;
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v119, it stops at its first line and says why", !!stopped && /v119 has not run/.test(stopped), stopped);
  const now = (await t.sql(`select pg_get_functiondef('town.feed(text, jsonb, jsonb, text, bigint)'::regprocedure) as def`)).rows[0].def;
  t.check("…having done nothing", now === was && !/pest/.test(now));
}
// (in the order they ran: the well's v127 to v129 before the insects' v126 and v131, v130 after v131, the box, the ladybird, the ground)
for (const n of [119, 120, 121, 122, 123, 124, 125, 127, 128, 129, 126, 131, 130, 135, 132, 133, 134, 138, 137]) await t.run(migration(n), `v${n}`);
{ let sql = null; try { sql = migration(139); } catch { /* not this tree's yet */ } if (sql) await t.run(sql, "v139"); }
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);

// a pumpkin sown one morning long ago, which a pest struck at eight the next day: the file's own closing check, and a member's
const KEY = "133,4", SOWN = 1578265200000, STRUCK = 1578358800000, HOUR = 3_600_000, IN = STRUCK + HOUR;
const pumpkin = (more = {}) => ({ by: "somebody", crop: "pumpkin", sown: SOWN, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more });
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${IN});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);

const CALL = {
  tool_of: "town.tool_of($1::text)",
  pest_at: "town.pest_at($1::text, $2::jsonb, $3::bigint)", see: "town.see($1::text, $2::jsonb, $3::bigint)",
  feed: "town.feed($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", cure: "town.cure($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)",
  deed_for: "town.deed_for($1::text, $2::jsonb, $3::text, $4::text, $5::bigint, $6::text)",
  tend: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint)",
  tend_sure: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint, $9::boolean)",
};
const answer = async (c) => { try { return (await t.db.query(`select ${CALL[c.fn]} as r`, c.args.map(param))).rows[0].r ?? null; } catch (e) { return { error: e.message }; } };
const COVERS = ["guardFert", "ladybird", "lavenderSachet", "mantis", "mosquitofish"], CURES = ["archerfish", "pestCure"];

// as things stand before the file
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const UNTOUCHED = ["town.cure", "town.tend", "town.see", "town.pest_at", "town.tool_of", "town.water", "town.sow", "town.pick", "town.hoe", "town.uproot", "public.town_tend", "public.town_farm", "public.town_net"];
const textOf = async (name) => (await t.sql(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid`, [name])).rows.map((r) => r.def).join("\n");
const beforeText = Object.fromEntries(await Promise.all(UNTOUCHED.map(async (name) => [name, await textOf(name)])));
// (one of the cases: a cover in the hand of somebody who has it, on a plant with a pest. Before the file it went on, and the pest with it.)
const onPest = V140.find((c) => c.fn === "feed" && COVERS.includes(c.args[3]) && c.want.ok === false && c.want.why === "soil" && c.args[2].plant.guard === 0);
const wasAnswered = await answer(onPest);

await t.runTwice(FILE, "v140");

let v, r;
t.section("what it should say afterwards (the file's closing block)");
v = await t.sql(`with x as (
    select '133,4'::text as key, 1578362400000::bigint as an_hour_in,
           jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', 'somebody', 'crop', 'pumpkin', 'sown', 1578265200000,
             'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)) as plot,
           town.fresh() || jsonb_build_object('bag', town.put(town.put(town.fresh()->'bag', 'ladybird', 1), 'pestCure', 1)) as purse)
  select (town.see(key, plot, an_hour_in)->>'pest')::boolean as has_a_pest,
         (town.feed(key, purse, plot, 'ladybird', an_hour_in)->>'ok')::boolean as a_ladybird_goes_on,
         town.deed_for(key, plot, 'ladybird', 'me', an_hour_in, null) as a_ladybird_is_offered,
         (town.cure(key, purse, plot, 'pestCure', an_hour_in)->>'ok')::boolean as a_cure_goes_on,
         (town.feed(key, purse, plot, 'ladybird', 1578358800000 - 1)->>'ok')::boolean as a_ladybird_before_the_pest
    from x`);
t.check("a pumpkin of long ago with a pest on it: a ladybird does not go on and is not offered, a cure goes on; the moment before the pest, the ladybird went on",
  same(v.rows[0], { has_a_pest: true, a_ladybird_goes_on: false, a_ladybird_is_offered: null, a_cure_goes_on: true, a_ladybird_before_the_pest: true }), v.rows);
v = await t.sql(`select (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are no browser's, written again or not", v.rows[0].open === 0, v.rows);

t.section("nothing else moved");
{
  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  t.check("no row of the catalog is written: every one as it was, and when", after.length === before.length && after.every((row, i) => row.key === before[i].key && same(row.data, before[i].data) && String(row.updated_at) === String(before[i].updated_at)), after.length);
  const odd = [];
  for (const name of UNTOUCHED) if ((await textOf(name)) !== beforeText[name] || !beforeText[name]) odd.push(name);
  t.check("every other rule of the farm's is as it was, to the letter: a cure, a strike and how it is counted, what a plot shows, tending, and what a member calls", odd.length === 0, odd);
  for (const [name, from, lines, whose] of [["town.feed", V110_SQL, FEED, "v110"], ["town.deed_for", V119_SQL, DEED_FOR, "v119"]]) {
    const old = words(from, name), now = words(FILE, name);
    let made = old, once = true;
    for (const [a, b] of lines) { if (!made || made.split(a).length !== 2) once = false; else made = made.replace(a, () => b); }
    t.check(`${name} is ${whose}'s, but for the lines of v140.lines.mjs`, !!old && !!now && once && old !== now && made === now,
      !old ? `not found in ${whose}` : !now ? "not in the file" : !once ? `a line meant is not in ${whose}'s once` : "it differs elsewhere: run build-v140.mjs");
  }
  const made = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  t.check("the file makes two functions and no more, no table, no row", same(made.sort(), ["town.deed_for", "town.feed"]) && !/create\s+(table|trigger|index)|insert\s+into|update\s+public/i.test(FILE.replace(/--.*$/gm, "")), made);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

/** Where two answers differ: each entry by its path, as it was wanted and as it came. */
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const differ = (want, got) => { const a = flat(want), b = flat(got); return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).slice(0, 8).map((k) => `${k}: ${a[k]} → ${b[k]}`); };
const ask = async (cases, title, prefix) => {
  t.section(`${title}: ${cases.length} cases, each as the site's own code answers it now`);
  const tally = new Map();
  for (const c of cases) {
    const got = await answer(c), ok = !got?.error && same(got, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { hand: c.fn === "deed_for" ? c.args[2] : c.fn === "tend" || c.fn === "tend_sure" ? c.args[5]?.hand : c.args[3], differs: differ(c.want, got) }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${prefix}${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 900)}` : "");
  return tally;
};
await t.sql(`truncate public.town_weather`);
{
  const tally = await ask(pickSome(V140), "a cover and a cure, on plants a pest strikes", "");
  if (!NONE) t.check("a cover, a cure, what the hand is offered and the tending were all asked", ["feed", "cure", "deed_for", "tend"].every((fn) => tally.has(fn)), [...tally.keys()]);
  t.check("before the file a cover went on a plant with a pest on it, and it was covered a day: it does not now", wasAnswered?.ok === true && wasAnswered.plot.plant.guard > onPest.args[4] && same(await answer(onPest), { ok: false, why: "soil" }), { was: wasAnswered?.ok, now: await answer(onPest) });
  // (and what that did: the plant, covered so, had no pest any more; left alone it has one, and a cure rids it)
  const [key, purse, plot, , now] = onPest.args;
  v = await t.sql(`select (town.see($1, $2::jsonb, $3::bigint)->>'pest')::boolean as left_alone, (town.see($1, $4::jsonb, $3::bigint + 1)->>'pest')::boolean as covered_before`, [key, JSON.stringify(plot), now, JSON.stringify(wasAnswered?.plot ?? plot)]);
  t.check("…which had rid the plant of its pest, where left alone it has it still", v.rows[0].left_alone === true && v.rows[0].covered_before === false && !!purse, v.rows);
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
  await t.sql(`alter table public.town_weather disable trigger user; truncate public.town_weather; alter table public.town_weather enable trigger user`);
}

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
const plotAt = async (x, y) => (await t.sql(`select soil, plant from public.town_plots where x = $1 and y = $2`, [x, y])).rows[0] ?? null;
const setPlot = (x, y, plant) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 1)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = 1`, [x, y, JSON.stringify(plant)]);
const deeds = async (who) => (await t.sql(`select what, thing, doc->>'with' as with_ from public.town_deeds where member_id = $1 order by id`, [who])).rows;

t.section("a member with a cover in the hand, at a plant with a pest on it");
await clock(IN);
await setPlot(133, 4, pumpkin());
v = await t.sql(`select (town.see('133,4', jsonb_build_object('soil', soil, 'plant', plant), town.now_ms())->>'pest')::boolean as pest from public.town_plots where x = 133 and y = 4`);
t.check("(a pumpkin stands on the farm with a pest on it, an hour in)", v.rows[0].pest === true, v.rows);
for (const cover of COVERS) {
  await holding(U.m1, cover, [[cover, 2], ["pestCure", 1]]);
  const was = await plotAt(133, 4);
  r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
  t.check(`${cover}: it does not go on, and is told the plot is not ready for it`, r?.ok === false && r.why === "soil", r?.error ?? { ok: r?.ok, why: r?.why });
  t.check(`…it is in the bag still, both of them, and the plant has its pest`, (await heldOf(U.m1, cover)) === 2 && same(await plotAt(133, 4), was), { held: await heldOf(U.m1, cover) });
}
t.check("nothing of those five is written down as done", (await deeds(U.m1)).length === 0, await deeds(U.m1));
// somebody else's cure rids it; then a cover goes on, anybody's
await holding(U.m2, "pestCure", [["pestCure", 1]]);
r = await rpc(U.m2, "town_tend", { p_x: 133, p_y: 4 });
t.check("a cure, anybody's, takes the pest off", r?.ok === true && r.deed === "cure" && (await heldOf(U.m2, "pestCure")) === 0 && (await plotAt(133, 4)).plant.cured === IN, r?.error ?? { ok: r?.ok, deed: r?.deed, why: r?.why });
await clock(IN + 1000);
await holding(U.m1, "ladybird", [["ladybird", 2]]);
r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
v = await plotAt(133, 4);
t.check("then a ladybird goes on: the plant is covered for a day from that moment, and one ladybird is gone from the bag", r?.ok === true && r.deed === "feed" && v.plant.guard === IN + 1000 + 24 * HOUR && (await heldOf(U.m1, "ladybird")) === 1, r?.error ?? { ok: r?.ok, deed: r?.deed, why: r?.why, guard: v?.plant?.guard });
r = await rpc(U.m1, "town_tend", { p_x: 133, p_y: 4 });
t.check("…and a second does not, as ever: it is covered", r?.ok === false && r.why === "soil" && (await heldOf(U.m1, "ladybird")) === 1, { ok: r?.ok, why: r?.why });
t.check("each is written down with what was in the hand: a cure, and a cover", same(await deeds(U.m2), [{ what: "cure", thing: "pumpkin", with_: "pestCure" }]) && same(await deeds(U.m1), [{ what: "feed", thing: "pumpkin", with_: "ladybird" }]), { m1: await deeds(U.m1), m2: await deeds(U.m2) });
// a plant with no pest is covered at once, by each
for (const [i, cover] of COVERS.entries()) {
  await setPlot(134 + i, 4, pumpkin({ sown: IN }));
  await holding(U.m1, cover, [[cover, 1]]);
  r = await rpc(U.m1, "town_tend", { p_x: 134 + i, p_y: 4 });
  v = await plotAt(134 + i, 4);
  t.check(`${cover}: on a plant with no pest it goes on at once, for a day`, r?.ok === true && r.deed === "feed" && v.plant.guard === IN + 1000 + 24 * HOUR && (await heldOf(U.m1, cover)) === 0, r?.error ?? { ok: r?.ok, why: r?.why });
}
// what makes a plant grow goes on with a pest there or not
await setPlot(133, 5, pumpkin());
v = await t.sql(`select (town.see('133,5', jsonb_build_object('soil', soil, 'plant', plant), town.now_ms())->>'pest')::boolean as pest, town.pest_at('133,5', plant, town.now_ms()) as struck from public.town_plots where x = 133 and y = 5`);
{
  // (another plot has its own strikes: one of this bed with a pest now is found by looking, as the first was)
  let at = null;
  for (let y = 5; y <= 10 && !at; y++) for (let x = 132; x <= 138 && !at; x++) {
    const s = (await t.sql(`select (town.see($1, $2::jsonb, town.now_ms())->>'pest')::boolean as pest`, [`${x},${y}`, JSON.stringify({ soil: "tilled", plant: pumpkin() })])).rows[0].pest;
    if (s) at = [x, y];
  }
  t.check("(another pumpkin of that morning has a pest on it now)", !!at, v.rows);
  if (at) {
    await setPlot(at[0], at[1], pumpkin());
    await holding(U.m1, "growFert", [["growFert", 1]]);
    r = await rpc(U.m1, "town_tend", { p_x: at[0], p_y: at[1] });
    v = await plotAt(at[0], at[1]);
    t.check("what makes a plant grow goes on it with its pest there, as ever, and leaves the pest", r?.ok === true && r.deed === "feed" && v.plant.fed === IN + 1000 && v.plant.guard === 0
      && (await t.sql(`select (town.see($1, $2::jsonb, town.now_ms())->>'pest')::boolean as pest`, [`${at[0]},${at[1]}`, JSON.stringify(v)])).rows[0].pest === true, r?.error ?? { ok: r?.ok, why: r?.why });
  }
}
// a plant covered while it had a pest, before the file: rid of it still, and not dead of it later
await setPlot(132, 4, pumpkin({ guard: IN + 24 * HOUR }));
{
  const key = (await t.sql(`select (town.see($1, $2::jsonb, $3::bigint)->>'pest')::boolean as bare`, ["132,4", JSON.stringify({ soil: "tilled", plant: pumpkin() }), IN])).rows[0];
  // (the plot beside the first has strikes of its own: the first plot's plant is used, covered an hour into its pest)
  v = await t.sql(`select town.see('133,4', $1::jsonb, $2::bigint) as then_, town.see('133,4', $1::jsonb, $3::bigint) as later`, [JSON.stringify({ soil: "tilled", plant: pumpkin({ guard: IN + 24 * HOUR }) }), IN + 1000, STRUCK + 7 * HOUR]);
  t.check("a plant that was covered while it had a pest, before this was so, is rid of it still, and does not die of it: nothing is counted again", v.rows[0].then_.pest === false && v.rows[0].then_.dead === false && v.rows[0].later.pest === false && v.rows[0].later.dead === false && key !== undefined, v.rows);
  v = await t.sql(`select town.see('133,4', $1::jsonb, $2::bigint) as left_`, [JSON.stringify({ soil: "tilled", plant: pumpkin() }), STRUCK + 7 * HOUR]);
  t.check("…where the same plant left with its pest is dead of it seven hours on", v.rows[0].left_.dead === true, v.rows);
}

t.section("who may");
r = await t.as("anon", `select public.town_tend(133, 4) as r`);
t.check("nobody signed out tends a plot, as ever", r.code === "42501", r);
r = await t.as(U.m1, `select town.feed('133,4', '{}'::jsonb, '{}'::jsonb, 'ladybird', 0) as r`);
t.check("the rule written again is no browser's to call", r.code === "42501", r);
r = await t.as(U.m1, `select town.deed_for('133,4', '{}'::jsonb, 'ladybird', 'me', 0, null) as r`);
t.check("…nor the other", r.code === "42501", r);
r = await t.as(U.unver, `select public.town_tend(133, 4) as r`);
t.check("somebody with no proved character tends nothing, as ever", !!r.error || r.code === "42501" || r.rows?.[0]?.r?.ok === false, r);

t.section("running it again");
await t.run(FILE, "v140 a third time");
v = await t.sql(`select (town.feed('133,4', town.fresh() || jsonb_build_object('bag', town.put(town.fresh()->'bag', 'mantis', 1)), $1::jsonb, 'mantis', $2::bigint)->>'ok')::boolean as on_a_pest`, [JSON.stringify({ soil: "tilled", plant: pumpkin() }), IN]);
t.check("run a third time, it is as it was: a mantis does not go on a plant with a pest", v.rows[0].on_a_pest === false, v.rows);

await t.done();
