/*
 * v138 — few ladybirds, and anywhere: dry run in PGlite.
 *
 * v138 writes one row of the catalog over (`insects`), and in it one insect: the ladybird weighs 6 where it weighed
 * 60, keeps to no map, and has the hours and the dry sky of the others at its haunts. No table, no function.
 *
 * v105 to v135 are replayed in the order they ran, then v138 twice. Then:
 *
 *   · the file's closing block; of the whole catalog four entries moved, all the ladybird's, and a number an admin
 *     changed by hand in another row is as it was;
 *   · every case of the insects' rules made from the code as it is now (what a haunt has, of its own or come back,
 *     where one comes back, a catch; the forest's with them, and a ladybird's doing), each as the code answers it;
 *   · a dry day and a wet afternoon by the database's own rule, every haunt of grass and of flowers ten minutes at a
 *     time, before the file and after: how many ladybirds, on which maps, at what hours, under what sky;
 *   · what a member is told at dawn and at noon, and a ladybird of the forest caught by the function a member calls;
 *   · run a third time.
 *
 *   FC_REPO=<the tree with the file> node v138.test.mjs      (RULES=0 skips the cases; RULES=few puts one in four, for the breaks)
 *   node mutate.mjs <the file> v138.test.mjs v138.mutations.mjs
 */
import { readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(138);
// (few: one case in four, and every one that answers a ladybird: there are seven, on the three maps)
const few = (told) => (process.env.RULES === "0" ? { ...told, cases: [] } : process.env.RULES === "few" ? { ...told, cases: told.cases.filter((c, i) => i % 4 === 0 || c.want?.bug === "ladybird") } : told);
const read = (n) => JSON.parse(readFileSync(here(`now/vectors-v${n}.json`), "utf8"));
const V125 = few(read(125)), V126 = few(read(126)), V131 = few(read(131));

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

const t = await supabaseLike({ extra });
// (in the order they ran: the well's v127 to v129 before the insects' v126 and v131, v130 after v131)
for (const n of [...Array.from({ length: 21 }, (_, i) => 105 + i), 127, 128, 129, 126, 131, 130, 135, 132, 133]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);

const at = (s) => Date.parse(`${s}+07:00`);
const MIN = 60_000, HOUR = 3_600_000, QUARTER = 900_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${at("2026-10-05T12:00:00")});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
// the word and the sky the cases were made with: a dry first day, rain on the second's afternoon
await t.sql(`update public.town_secrets set word = $1 where key = 'wild'`, [V125.word]);
await t.sql(`alter table public.town_weather disable trigger user`);
for (const slot of V125.wet) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 9, 2) on conflict (slot) do update set sky = 'rain'`, [slot]);
await t.sql(`alter table public.town_weather enable trigger user`);

const HAUNTS = (await t.sql(`select town.cat('insects')->'haunts' as h`)).rows[0].h;
/** What every haunt of grass and of flowers has from a moment to another, ten minutes at a time (a turn of theirs: each is met once), by the database's own rule. */
const lookedOver = async (from, to) => (await t.sql(`
  select (h.ord - 1)::int as haunt, h.v->>1 as place, town.bug_at((h.ord - 1)::int, x.t, town.cat('insects'), town.word()) as has
    from jsonb_array_elements(town.cat('insects')->'haunts') with ordinality as h(v, ord), generate_series($1::bigint, $2::bigint - 1, 600000) as x(t)
   where h.v->>0 in ('field', 'blooms')`, [from, to])).rows.filter((r) => r.has?.bug === "ladybird")
  .map((r) => ({ haunt: r.haunt, place: r.place, turn: r.has.turn, hour: (((Number(r.has.until) - 10 * MIN + 7 * HOUR) % (24 * HOUR)) / HOUR) }));
const byPlace = (rows) => rows.reduce((by, r) => ({ ...by, [r.place]: (by[r.place] ?? 0) + 1 }), {});
const DAY1 = [at("2026-10-05T00:00:00"), at("2026-10-06T00:00:00")];
// (the second day's rain, from two in the afternoon to half past five, and the half hour after it)
const WET = [at("2026-10-06T14:10:00"), at("2026-10-06T17:30:00")];
const toldAt = async (who, ms) => { await clock(ms); const r = await t.as(who, `select public.town_bugs() as r`); return r.error ? r : r.rows[0].r; };
const ladybirdsTold = (told) => (told.bugs ?? []).filter(([, bug]) => bug === "ladybird").map(([id]) => HAUNTS[id][1]);

// as it stands before the file
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here too"') where key = 'carries'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const was = { day: await lookedOver(...DAY1), wet: await lookedOver(...WET), dawn: await toldAt(U.m1, at("2026-10-05T05:30:00")) };

await t.runTwice(FILE, "v138");

let v, r;
t.section("what it should say afterwards (the file's closing block)");
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes one row over, the insects', and leaves every other as it was", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === "insects" && v.rows.length === before.length && v.rows.length > 20, { written: v.rows.filter((x) => x.written).map((x) => x.key), rows: v.rows.length });
v = await t.sql(`select data->'bugs'->'ladybird' as ladybird from public.town_catalog where key = 'insects'`);
t.check("a ladybird weighs 6, keeps to no map, is out from six to six under a dry sky, and has its chance in ten still",
  same(v.rows[0].ladybird, { n: [1, 1], at: ["field", "blooms"], dry: true, cost: 1, rids: 0.1, habit: "crawl", hours: [[6, 18]], weight: 6 }), v.rows);
v = await t.sql(`select count(*)::int as insects, sum((b.value->>'weight')::int)::int as weights from public.town_catalog c, jsonb_each(c.data->'bugs') b where c.key = 'insects'`);
t.check("there are twenty-four insects still, and their weights come to 1,560", same(v.rows[0], { insects: 24, weights: 1560 }), v.rows);

t.section("nothing else moved");
{
  const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
  const flat = (x, at_ = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at_ ? `${at_}.${k}` : k, out); else out[at_] = JSON.stringify(x); return out; };
  const moved = [];
  for (const row of after) {
    const a = flat(before.find((b) => b.key === row.key).data), b = flat(row.data);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) moved.push(`${row.key}.${k}: ${a[k]} → ${b[k]}`);
  }
  const want = ["insects.bugs.ladybird.weight: 60 → 6", 'insects.bugs.ladybird.places: ["farm","town"] → undefined', "insects.bugs.ladybird.hours: [[5,18]] → [[6,18]]", "insects.bugs.ladybird.dry: undefined → true"];
  t.check("of the whole catalog four entries differ, all the ladybird's: its weight, its maps, its hours, its sky", same([...moved].sort(), [...want].sort()), { moved: moved.length, odd: moved.filter((m) => !want.includes(m)).concat(want.filter((w) => !moved.includes(w))).slice(0, 6) });
  v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'carries'`);
  t.check("a number an admin changed by hand in a row it does not write is as it was", v.rows[0].note === "an admin was here too", v.rows);
  v = await t.sql(`select town.cat('insects')->'haunts' as h, town.cat('insects')->'order' as o`);
  t.check("the haunts are where they were, all of them, and the insects are weighed in the order they were", same(v.rows[0].h, HAUNTS) && same(v.rows[0].o, before.find((b) => b.key === "insects").data.order) && HAUNTS.length > 90, HAUNTS.length);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

const CALL = {
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
};
const cases = [...V125.cases, ...V131.cases];
t.section(`the insects' rules and the forest's: ${cases.length} cases, each as the site's own code answers it now`);
{
  const tally = new Map();
  let ladybirds = 0;
  for (const [n, c] of cases.entries()) {
    const sql = CALL[n % 2 && CALL[`${c.fn}_all`] ? `${c.fn}_all` : c.fn];
    if (!sql) throw new Error(`no SQL for ${c.fn}`);
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, c.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    const ok = !error && same(got ?? null, c.want);
    if (c.want?.bug === "ladybird") ladybirds++;
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: c.args.map((a) => (Array.isArray(a) ? a.length : a && typeof a === "object" ? "…" : a)), want: c.want, got: error ?? got }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1200)}` : "");
  if (cases.length) t.check("what a haunt has, of its own and come back, where one comes back, and a catch were all asked; a ladybird is among the answers", ["bug_at", "bug_here", "comeback", "net"].every((fn) => tally.has(fn)) && ladybirds > 0, { fns: [...tally.keys()], ladybirds });
}
if (V126.cases.length) {
  // (a ladybird's doing is made under a clear sky: the farm's plots as they stand, no rain)
  await t.sql(`alter table public.town_weather disable trigger user`);
  const sky = (await t.sql(`select slot, sky, wind, gust, rain from public.town_weather`)).rows;
  await t.sql(`truncate public.town_weather`);
  t.section(`a ladybird's doing: ${V126.cases.length} cases`);
  let bad = 0, first = null;
  for (const c of V126.cases) {
    let got, error = null;
    try { got = (await t.db.query(`select ${CALL[c.fn]} as r`, c.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (error || !same(got ?? null, c.want)) { bad++; first ??= { want: c.want, got: error ?? got }; }
  }
  t.check(`rid_pick: ${V126.cases.length} cases`, bad === 0, bad ? `${bad} differ; the first: ${JSON.stringify(first).slice(0, 600)}` : "");
  for (const s of sky) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, $2, $3, $4, $5)`, [s.slot, s.sky, s.wind, s.gust, s.rain]);
  await t.sql(`alter table public.town_weather enable trigger user`);
}

/* ── a day of them, by the database's own rule ───────────────────────────── */

t.section("a dry day and a wet afternoon, every haunt of grass and of flowers ten minutes at a time");
{
  const day = await lookedOver(...DAY1), wet = await lookedOver(...WET);
  const wasBy = byPlace(was.day), by = byPlace(day);
  t.check("before the file there were ladybirds on the farm and in the town, none in the forest, and well over a hundred in the day", (wasBy.farm ?? 0) > 40 && (wasBy.town ?? 0) > 40 && !wasBy.forest && was.day.length > 150, { wasBy, n: was.day.length });
  t.check("…and from five to six every haunt that had anything had one", was.day.filter((x) => x.hour >= 5 && x.hour < 6).length > 40, was.day.filter((x) => x.hour >= 5 && x.hour < 6).length);
  t.check("after it there are some on every map: the farm, the town and the forest", (by.farm ?? 0) > 0 && (by.town ?? 0) > 0 && (by.forest ?? 0) > 0, by);
  t.check("…a few on each, where the farm and the town had scores: under thirty on a map in the day, and not a third of what there were in all", Object.values(by).every((n) => n < 30) && day.length * 3 < was.day.length && day.length >= 12, { was: was.day.length, now: day.length, by });
  t.check("none before six in the morning, none from six in the evening", day.length > 0 && day.every((x) => x.hour >= 6 && x.hour < 18), day.filter((x) => !(x.hour >= 6 && x.hour < 18)).slice(0, 4));
  t.check("in the rain there were dozens before the file", was.wet.length > 24, was.wet.length);
  t.check("…and after it none: not in the rain, nor in the half hour after it", wet.length === 0, wet.slice(0, 4));
}

/* ── what a member is told, and a catch ──────────────────────────────────── */

const rpc = async (who, fn, args = {}) => {
  const keys = Object.keys(args);
  const x = await t.as(who, `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, keys.map((k) => param(args[k])));
  return x.error ? { error: x.error } : x.rows[0].r;
};
const grant = async (who, item, n = 1) => { await t.sql(`insert into public.town_purses (member_id, doc) values ($1, town.fresh()) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', town.put(doc->'bag', $2, $3::int)) where member_id = $1`, [who, item, n]); };
const heldOf = async (who, item) => (await t.sql(`select town.held(doc->'bag', $2) as n from public.town_purses where member_id = $1`, [who, item])).rows[0]?.n ?? 0;

t.section("what a member is told, and a ladybird of the forest caught");
{
  t.check("before the file, a member looking at half past five in the morning was told of ladybirds, many", ladybirdsTold(was.dawn).length > 5, ladybirdsTold(was.dawn).length);
  const dawn = await toldAt(U.m1, at("2026-10-05T05:30:00"));
  t.check("after it, of none at that hour, though the look itself is answered", Array.isArray(dawn.bugs) && ladybirdsTold(dawn).length === 0, { n: dawn.bugs?.length, ladybirds: ladybirdsTold(dawn) });
  // a ladybird of the forest, out on the dry day: found by the rule, then told to a member and caught by one
  const one = (await lookedOver(...DAY1)).find((x) => x.place === "forest");
  const turnOf = one ? (await t.sql(`select (town.bug_at($1::int, x.t)->>'until')::bigint as until from generate_series($2::bigint, $3::bigint - 1, 600000) as x(t) where (town.bug_at($1::int, x.t)->>'turn')::bigint = $4 limit 1`, [one.haunt, ...DAY1, one.turn])).rows[0] : null;
  const when = turnOf ? Number(turnOf.until) - 5 * MIN : 0;
  const told = one ? await toldAt(U.m1, when) : { bugs: [] };
  const seen = (told.bugs ?? []).find(([id, bug]) => id === one?.haunt && bug === "ladybird");
  t.check("a member in the town is told of one in the forest, at its haunt, in its turn", !!one && !!seen && HAUNTS[one.haunt][1] === "forest", { one, told: (told.bugs ?? []).length });
  await grant(U.m1, "bugNet");
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bugNet') where member_id = $1`, [U.m1]);
  const [px, py] = one ? HAUNTS[one.haunt][3][0] : [0, 0];
  r = one ? await rpc(U.m1, "town_net", { p_haunt: one.haunt, p_x: Math.floor(px), p_y: Math.floor(py), p_misses: 0 }) : null;
  t.check("…and catches it with a net, as any insect: one ladybird in the bag", r?.ok === true && same(r.got, [["ladybird", 1]]) && (await heldOf(U.m1, "ladybird")) === 1, r);
  v = await t.sql(`select what, thing, n::int as n, doc->>'map' as map from public.town_deeds where member_id = $1 order by id desc limit 1`, [U.m1]);
  t.check("…written down as a catch in the forest", same(v.rows[0], { what: "net", thing: "ladybird", n: 1, map: "forest" }), v.rows);
  r = await t.as("anon", `select public.town_bugs() as r`);
  t.check("nobody signed out is told what is out, as ever", r.code === "42501", r);
  r = await t.as("anon", `select public.town_net(0, 0, 0) as r`);
  t.check("…nor catches anything", r.code === "42501", r);
  r = await t.as(U.m1, `select town.bug_at(0, town.now_ms()) as r`);
  t.check("…and the rule of what is out is no browser's to ask", r.code === "42501", r);
}

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{bugs,ladybird,weight}', '60') where key = 'insects'`);
await t.run(FILE, "v138 a third time");
v = await t.sql(`select (select (data->'bugs'->'ladybird'->>'weight')::int from public.town_catalog where key = 'insects') as weight,
  (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written,
  (select count(*)::int from public.town_catalog) as rows, (select data->>'note' from public.town_catalog where key = 'carries') as note`);
t.check("run again, it writes its row over again, as its head says: a number changed by hand in it is put back; no other row, and the admin's note stands", same(v.rows[0], { weight: 6, written: "insects", rows: before.length, note: "an admin was here too" }), v.rows);

await t.done();
