/*
 * v139 — hunted, an insect grows scarce: dry run in PGlite.
 *
 * v139 adds one rule (`town.plenty`: how much of its usual self a kind is, by what the village has caught of it in the
 * day before a moment, read from the catches as v121 writes them down), writes two again (`town.bug_at`, v125's, and
 * `town.comeback`, v131's: each thinned by it), makes an index on the catches, and writes the catalog's `insects` row
 * over with `scarce`.
 *
 * v105 to v135 are replayed in the order they ran (the file tried once before v131), then the storage box's v134 and
 * v138 as they ran, and the things dropped on the ground (v137) where this tree has it; then v139 twice. Then:
 *
 *   · the file's closing block; of the whole catalog two entries moved, `insects.scarce`'s;
 *   · with nothing caught, every case of the insects' rules and the forest's as before the file: v125's and v131's,
 *     made with no catches, each as the code answers it;
 *   · with three made-up days of catches written down as catches are, every case of v139's: how plentiful each kind
 *     is, what every haunt has, what comes back and what is there after;
 *   · the two rules written again held to the ones they replace, word for word but for the lines of v139.lines.mjs;
 *     what calls them is as it was;
 *   · by the functions a member calls, with the database's clock: what is caught during a turn changes nothing of
 *     that turn; an hour on the kinds hunted are mostly gone and the others are where they were; a day on everything
 *     is back; a member's own catch counts from the next moment; a hunted kind does not come back after a catch;
 *   · the catches are read through the index; who may; run a third time; and run where v138 has not.
 *
 *   FC_REPO=<the tree> node build-v139.mjs && node v139.test.mjs      (RULES=0 skips the cases; RULES=few puts one in four, for the breaks)
 *   node mutate.mjs v139_draft.sql v139.test.mjs v139.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { BUG_AT, COMEBACK } from "./v139.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v139_draft.sql")) ? readFileSync(here("v139_draft.sql"), "utf8") : migration(139);
// (few: one case in four, with every case of how plentiful a kind is and every one marked to be kept: those in the thick of a burst)
const few = (told) => (process.env.RULES === "0" ? { ...told, cases: [] } : process.env.RULES === "few" ? { ...told, cases: told.cases.filter((c, i) => i % 4 === 0 || c.keep || c.fn === "plenty") } : told);
const read = (n) => JSON.parse(readFileSync(here(`now/vectors-v${n}.json`), "utf8"));
const V125 = few(read(125)), V131 = few(read(131)), V139 = few(read(139));

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
// (in the order they ran: the well's v127 to v129 before the insects' v126 and v131, v130 after v131)
for (const n of [...Array.from({ length: 21 }, (_, i) => 105 + i), 127, 128, 129, 126]) await t.run(migration(n), `v${n}`);

t.section("it will not run before v131");
{
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v131, it stops at its first line and says why", !!stopped && /v131 has not run/.test(stopped), stopped);
  const v = await t.sql(`select to_regprocedure('town.plenty(text, bigint, jsonb)') is null as no_rule, not exists (select 1 from pg_indexes where indexname = 'town_deeds_net') as no_index, town.cat('insects')->'scarce' is null as no_numbers`);
  t.check("…having done nothing", same(v.rows[0], { no_rule: true, no_index: true, no_numbers: true }), v.rows);
}
const V125_SQL = migration(125), V131_SQL = migration(131);
for (const n of [131, 130, 135, 132, 133, 134]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);

const at = (s) => Date.parse(`${s}+07:00`);
const SEC = 1000, MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const NOON = at("2026-10-05T12:00:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
// the word and the sky the cases were made with: a dry first day, rain on the second's afternoon
await t.sql(`update public.town_secrets set word = $1 where key = 'wild'`, [V125.word]);
await t.sql(`alter table public.town_weather disable trigger user`);
for (const slot of V125.wet) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 9, 2) on conflict (slot) do update set sky = 'rain'`, [slot]);
await t.sql(`alter table public.town_weather enable trigger user`);

/** Catches written down as town.note writes them (the moment kept to the millisecond): each [insect, moment, how many]. */
const noteCatches = async (rows, who = U.m2) => {
  for (let i = 0; i < rows.length; i += 2000) {
    const part = rows.slice(i, i + 2000);
    await t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, coins, doc)
      select $1, to_timestamp(x.ms / 1000.0), 'net', x.bug, x.n, 0, '{}'::jsonb from unnest($2::text[], $3::bigint[], $4::numeric[]) as x(bug, ms, n)`, [who, part.map((r) => r[0]), part.map((r) => r[1]), part.map((r) => r[2])]);
  }
};
const noCatches = () => t.sql(`delete from public.town_deeds where what = 'net'`);
const textOf = async (name) => (await t.sql(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1`, [name])).rows.map((r) => r.def).join("\n");
const UNTOUCHED = ["town.bug_here", "public.town_bugs", "public.town_net", "town.net", "town.wild_fits", "town.backs_now", "town.note"];

// v138 first, as it is to run; then as things stand before the file
await t.run(migration(138), "v138");
// (and what else of the town's may stand before it: v137, pending when this was written, stands on nothing of the insects')
{ let sql = null; try { sql = migration(137); } catch { /* not this tree's */ } if (sql) await t.run(sql, "v137"); }
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here too"') where key = 'carries'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const beforeText = Object.fromEntries(await Promise.all(UNTOUCHED.map(async (name) => [name, await textOf(name)])));

await t.runTwice(FILE, "v139");

let v, r;
t.section("what it should say afterwards (the file's closing block)");
v = await t.sql(`select town.cat('insects')->'scarce' as scarce, town.cat('insects')->'bugs'->'ladybird'->>'weight' as ladybird, (select count(*)::int from jsonb_each(town.cat('insects')->'bugs')) as insects`);
t.check("a catch counts for a day, twenty counting halve a kind; a ladybird weighs 6 still; twenty-four insects", same(v.rows[0], { scarce: { day: 24, half: 20 }, ladybird: "6", insects: 24 }), v.rows);
v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes one row over, the insects', and leaves every other as it was", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === "insects" && v.rows.length === before.length, { written: v.rows.filter((x) => x.written).map((x) => x.key), rows: v.rows.length });
v = await t.sql(`select indexdef from pg_indexes where schemaname = 'public' and indexname = 'town_deeds_net'`);
t.check("the catches have an index of their own: by insect and moment, the catches alone", v.rows[0]?.indexdef === "CREATE INDEX town_deeds_net ON public.town_deeds USING btree (thing, at) WHERE (what = 'net'::text)", v.rows);
v = await t.sql(`select has_function_privilege('authenticated', 'town.plenty(text, bigint, jsonb)', 'execute') as plenty,
  (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the new rule is no browser's, like every rule", same(v.rows[0], { plenty: false, open: 0 }), v.rows);
v = await t.sql(`select b.key as insect, round(town.plenty(b.key, town.now_ms())::numeric, 2)::float8 as plenty from jsonb_each(town.cat('insects')->'bugs') b order by 2, 1`);
t.check("read with nothing caught, every kind is as plentiful as ever", v.rows.length === 24 && v.rows.every((x) => x.plenty === 1), v.rows.slice(0, 3));

t.section("nothing else moved");
const flat = (x, at_ = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at_ ? `${at_}.${k}` : k, out); else out[at_] = JSON.stringify(x); return out; };
const movedSince = (was, now) => {
  const moved = [];
  for (const row of now) {
    const a = flat(was.find((b) => b.key === row.key).data), b = flat(row.data);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) moved.push(`${row.key}.${k}: ${a[k]} → ${b[k]}`);
  }
  return moved.sort();
};
const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
{
  const moved = movedSince(before, after), want = ["insects.scarce.day: undefined → 24", "insects.scarce.half: undefined → 20"];
  t.check("of the whole catalog two entries differ: the day a catch counts for, and how many halve a kind", same(moved, want), { moved: moved.length, odd: moved.filter((m) => !want.includes(m)).concat(want.filter((w) => !moved.includes(w))).slice(0, 6) });
  v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'carries'`);
  t.check("a number an admin changed by hand in a row it does not write is as it was", v.rows[0].note === "an admin was here too", v.rows);
  const odd = [];
  for (const name of UNTOUCHED) if ((await textOf(name)) !== beforeText[name] || !beforeText[name]) odd.push(name);
  t.check("what calls the two rules is as it was, to the letter: what a haunt has with what came back, what a member is told, a catch", odd.length === 0, odd);
  v = await t.sql(`select count(*)::int as n from pg_trigger where tgrelid = 'public.town_deeds'::regclass and not tgisinternal`);
  const was = (await t.sql(`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name like 'town_%'`)).rows[0].n;
  t.check("no table and no trigger is made", !/create\s+(table|trigger)/i.test(FILE.replace(/--.*$/gm, "")) && was > 20, { triggers: v.rows[0].n, tables: was });
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

const CALL = {
  wishes: "to_jsonb(town.wishes())",
  // (each asked the way one is asked and, every other case, the way a look at all of them asks: handed the row and the word)
  wild_holds: "town.wild_holds($1::int, $2::bigint)", wild_holds_all: "town.wild_holds($1::int, $2::bigint, town.cat('forest'), town.word())",
  bug_at: "town.bug_at($1::int, $2::bigint)", bug_at_all: "town.bug_at($1::int, $2::bigint, town.cat('insects'), town.word())",
  gather: "town.gather($1::jsonb, $2::int, $3::jsonb, $4::int, $5::boolean, $6::text, $7::int, $8::int, $9::float8, $10::float8, $11::bigint)",
  net: "town.net($1::jsonb, $2::int, $3::jsonb, $4::int, $5::boolean, $6::text, $7::int, $8::int, $9::float8, $10::bigint, $11::text)",
  bug_here: "town.bug_here($1::int, $2::bigint, $3::jsonb)", bug_here_all: "town.bug_here($1::int, $2::bigint, $3::jsonb, town.cat('insects'), town.word())",
  comeback: "town.comeback($1::int, $2::bigint, $3::jsonb, $4::float8, $5::float8, $6::float8)",
  comeback_all: "town.comeback($1::int, $2::bigint, $3::jsonb, $4::float8, $5::float8, $6::float8, town.cat('insects'), town.word())",
  plenty: "town.plenty($1::text, $2::bigint)", plenty_all: "town.plenty($1::text, $2::bigint, town.cat('insects'))",
};
const ask = async (cases, title, must) => {
  t.section(`${title}: ${cases.length} cases, each as the site's own code answers it`);
  const tally = new Map();
  for (const [n, c] of cases.entries()) {
    const sql = CALL[n % 2 && CALL[`${c.fn}_all`] ? `${c.fn}_all` : c.fn];
    if (!sql) throw new Error(`no SQL for ${c.fn}`);
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, c.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    const ok = !error && same(got ?? null, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: c.args.map((a) => (Array.isArray(a) ? a.length : a && typeof a === "object" ? "…" : a)), want: c.want, got: error ?? got }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${must.prefix}${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1200)}` : "");
  if (cases.length) t.check(`${must.prefix}every rule meant was asked`, must.fns.every((fn) => tally.has(fn)), [...tally.keys()]);
};
await noCatches();
await ask([...V125.cases, ...V131.cases], "with nothing caught, the insects' rules and the forest's as they were", { prefix: "unhunted, ", fns: ["bug_at", "bug_here", "comeback", "net"] });
await noteCatches(V139.hunts.map((h) => [h.bug, h.at, h.n]));
v = await t.sql(`select count(*)::int as n, sum(n)::int as insects, count(distinct thing)::int as kinds, bool_and(floor(extract(epoch from at) * 1000)::bigint = any($1::bigint[])) as to_the_ms from public.town_deeds where what = 'net'`, [V139.hunts.map((h) => h.at)]);
t.check("three made-up days of catches are written down as catches are, each kept to its millisecond", v.rows[0].n === V139.hunts.length && v.rows[0].kinds >= 15 && v.rows[0].to_the_ms === true && v.rows[0].n > 900, v.rows);
await ask(V139.cases, "hunted: how plentiful each kind is, what a haunt has, what comes back", { prefix: "hunted, ", fns: ["plenty", "bug_at", "bug_here", "comeback"] });
{
  // (the rule read plainly, at moments of those days)
  const some = V139.hunts.filter((h) => h.bug === "dragonfly"), mid = some[Math.floor(some.length / 2)].at + 1;
  v = await t.sql(`select town.plenty('dragonfly', $1::bigint) as hunted, town.plenty('herculesBeetle', $1::bigint) as left_alone, town.plenty('dragonfly', $2::bigint) as long_after, town.plenty('dragonfly', $3::bigint) as long_before`, [mid, some[some.length - 1].at + DAY, some[0].at]);
  t.check("in the thick of it a dragonfly is under a third of itself; a kind nobody caught is whole; a day after the last catch, and before the first, so is a dragonfly",
    v.rows[0].hunted < 1 / 3 && v.rows[0].hunted > 0.05 && v.rows[0].left_alone === 1 && v.rows[0].long_after === 1 && v.rows[0].long_before === 1, v.rows);
  // other deeds are not catches: a dragonfly left with the uncle, bought, or held is no hunting
  const was = (await t.sql(`select town.plenty('dragonfly', $1::bigint) as p`, [mid])).rows[0].p;
  await t.sql(`insert into public.town_deeds (member_id, at, what, thing, n) select $1, to_timestamp(($2::bigint - 1000) / 1000.0), w, 'dragonfly', 500 from unnest(array['leave', 'hold', 'take_back', 'buy']) w`, [U.m2, mid]);
  r = (await t.sql(`select town.plenty('dragonfly', $1::bigint) as p`, [mid])).rows[0].p;
  t.check("only a catch counts: dragonflies left with the uncle or held by the hundred change nothing", r === was, { was, now: r });
  await t.sql(`delete from public.town_deeds where what in ('leave', 'hold', 'take_back', 'buy') and n = 500`);
}

/* ── what is written again ───────────────────────────────────────────────── */

t.section("the rules written again are the ones they replace, word for word but for the lines meant");
{
  for (const [name, from, lines, whose] of [["town.bug_at", V125_SQL, BUG_AT, "v125"], ["town.comeback", V131_SQL, COMEBACK, "v131"]]) {
    const old = words(from, name), now = words(FILE, name);
    let made = old, once = true;
    for (const [a, b] of lines) { if (!made || made.split(a).length !== 2) once = false; else made = made.replace(a, () => b); }
    t.check(`${name} is ${whose}'s, but for the lines of v139.lines.mjs`, !!old && !!now && once && old !== now && made === now,
      !old ? `not found in ${whose}` : !now ? "not in the file" : !once ? `a line meant is not in ${whose}'s once` : "it differs elsewhere: run build-v139.mjs");
  }
  const made = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  t.check("the file makes three functions: the new rule and the two written again", same(made.sort(), ["town.bug_at", "town.comeback", "town.plenty"]), made);
}

/* ── by the functions a member calls ─────────────────────────────────────── */

const rpc = async (who, fn, args = {}) => {
  const keys = Object.keys(args);
  const x = await t.as(who, `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, keys.map((k) => param(args[k])));
  return x.error ? { error: x.error } : x.rows[0].r;
};
const grant = async (who, item, n = 1) => { await t.sql(`insert into public.town_purses (member_id, doc) values ($1, town.fresh()) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', town.put(doc->'bag', $2, $3::int)) where member_id = $1`, [who, item, n]); };
const HAUNTS = (await t.sql(`select town.cat('insects')->'haunts' as h`)).rows[0].h;
const toldAt = async (who, ms) => { await clock(ms); const x = await rpc(who, "town_bugs"); return x.error ? x : x.bugs.map(([id, bug, turn]) => `${id}:${bug}:${turn}`); };
/** What every haunt would have at a moment with nothing caught: the same rule, handed a row with no `scarce` in it. */
const unhuntedAt = async (ms) => (await t.sql(`select (h.ord - 1)::int as id, town.bug_at((h.ord - 1)::int, $1::bigint, town.cat('insects') - 'scarce', town.word()) as has
  from jsonb_array_elements(town.cat('insects')->'haunts') with ordinality as h(v, ord)`, [ms])).rows.filter((x) => x.has).map((x) => `${x.id}:${x.has.bug}:${x.has.turn}`);

t.section("a turn is as it began, an hour on the hunted are scarce, a day on they are back");
{
  await noCatches();
  await t.sql(`delete from public.town_takes; delete from public.town_comebacks`);
  const first = await toldAt(U.m1, NOON), plain = await unhuntedAt(NOON);
  t.check("with nothing caught a member is told what the haunts roll, as before the file", Array.isArray(first) && first.length > 15 && same([...first].sort(), [...plain].sort()), { told: first.length, plain: plain.length });
  // every kind that is out at noon, caught three hundred times at this very moment
  const kinds = [...new Set(first.map((x) => x.split(":")[1]))];
  await noteCatches(kinds.flatMap((bug) => Array.from({ length: 300 }, () => [bug, NOON, 1])), U.m2);
  const during = [await toldAt(U.m1, NOON), await toldAt(U.m1, NOON + SEC), await toldAt(U.m2, NOON + SEC)];
  t.check("what is caught during a turn changes nothing of that turn: both members are told the same haunts, the same insects", during.every((d) => same(d, first)), during.map((d) => d.length));
  // (each haunt for as long as its own turn lasts: asked again a minute at a time until every turn begun before noon is over)
  let held = true;
  for (let m = 1; m <= 60 && held; m++) {
    const told = await toldAt(U.m1, NOON + m * MIN);
    for (const x of first) { const [id, , turn] = x.split(":"); const until = (await t.sql(`select (town.bug_at($1::int, $2::bigint)->>'until')::bigint as u, (town.bug_at($1::int, $2::bigint)->>'turn')::bigint as turn`, [Number(id), NOON])).rows[0]; if (until.u > NOON + m * MIN && String(until.turn) === turn && !told.includes(x)) held = false; }
    if (m > 12 && m % 12) continue;
  }
  t.check("…to the last minute of each haunt's turn", held);
  const hourOn = NOON + 61 * MIN, told = await toldAt(U.m1, hourOn), would = await unhuntedAt(hourOn);
  const kindOf = (x) => x.split(":")[1], hunted = would.filter((x) => kinds.includes(kindOf(x))), other = would.filter((x) => !kinds.includes(kindOf(x)));
  t.check("an hour on, of the haunts that would have had one of those kinds hardly any has", hunted.length > 12 && told.filter((x) => kinds.includes(kindOf(x))).length <= Math.ceil(hunted.length * 0.2), { would: hunted.length, has: told.filter((x) => kinds.includes(kindOf(x))).length });
  t.check("…none has another insect instead, and none has one where there would have been none", told.every((x) => would.includes(x)), told.filter((x) => !would.includes(x)).slice(0, 4));
  t.check("…and a kind nobody caught is at every haunt it would have been at", other.every((x) => told.includes(x)), { other: other.length, missing: other.filter((x) => !told.includes(x)).slice(0, 4) });
  v = await t.sql(`select round(town.plenty($1, $2::bigint)::numeric, 4)::float8 as p`, [kinds[0], hourOn]);
  t.check("three hundred caught an hour ago: the kind is a sixteenth of itself", Math.abs(v.rows[0].p - 20 / (20 + 300 * (23 * 60 - 1) / (24 * 60))) < 0.001, v.rows);
  // (a day after the catches, and an hour more: the longest turn is an hour, and a turn is as it began)
  const nearly = NOON + DAY - 30 * MIN, nearlyTold = await toldAt(U.m1, nearly), nearlyWould = await unhuntedAt(nearly);
  t.check("half an hour short of a day on, most of them are back and not all: what is left of three hundred catches still counts a little", nearlyTold.length < nearlyWould.length && nearlyTold.length > nearlyWould.length * 0.5 && nearlyTold.every((x) => nearlyWould.includes(x)), { told: nearlyTold.length, would: nearlyWould.length });
  const dayOn = NOON + DAY + 61 * MIN, back = await toldAt(U.m1, dayOn), whole = await unhuntedAt(dayOn);
  t.check("a day on, everything is as it would have been with nothing caught", back.length > 15 && same([...back].sort(), [...whole].sort()), { told: back.length, would: whole.length });
}

t.section("a member's own catch counts, from the next moment and for a day");
{
  await noCatches();
  await t.sql(`delete from public.town_takes; delete from public.town_comebacks`);
  await grant(U.m1, "bugNet");
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bugNet') where member_id = $1`, [U.m1]);
  const T = at("2026-10-05T13:30:00"), told = await rpc(U.m1, "town_bugs");
  await clock(T);
  const out = (await rpc(U.m1, "town_bugs")).bugs, lures = (await t.sql(`select town.cat('insects')->'bugs' as b`)).rows[0].b;
  const [id, bug] = out.find(([, b]) => lures[b].habit !== "lure" && lures[b].n[1] === 1);
  const [px, py] = HAUNTS[id][3][0];
  r = await rpc(U.m1, "town_net", { p_haunt: id, p_x: Math.floor(px), p_y: Math.floor(py), p_misses: 0 });
  t.check("a member catches an insect, as ever", r?.ok === true && r.got?.[0]?.[0] === bug && !!told, r);
  v = await t.sql(`select town.plenty($1, $2::bigint) as at_the_catch, town.plenty($1, $2::bigint + 1) as next, town.plenty($1, $2::bigint + $3::bigint - 1) as last, town.plenty($1, $2::bigint + $3::bigint) as day_on`, [bug, T, DAY]);
  t.check("its kind is whole at the moment of the catch, a twenty-first less the moment after, and whole again a day on to the millisecond",
    v.rows[0].at_the_catch === 1 && Math.abs(v.rows[0].next - 20 / 21) < 1e-6 && v.rows[0].next < 1 && v.rows[0].last < 1 && v.rows[0].last > 0.9999999 && v.rows[0].day_on === 1, v.rows);
  v = await t.sql(`select count(*)::int as n from public.town_deeds where what = 'net' and thing = $1 and member_id = $2 and floor(extract(epoch from at) * 1000)::bigint = $3`, [bug, U.m1, T]);
  t.check("…read from the line the catch itself wrote, by the database's clock", v.rows[0].n === 1, v.rows);
}

t.section("a kind that is hunted does not come back after a catch");
{
  await noCatches();
  await t.sql(`delete from public.town_takes; delete from public.town_comebacks`);
  for (const who of [U.m1, U.m2, U.admin, U.guest]) { await grant(who, "bugNet"); await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bugNet', 'stamina', jsonb_build_object('day', town.day_of($2::bigint), 'left', 100)) where member_id = $1`, [who, NOON]); }
  // every insect of the town's day but the dragonfly, caught beyond counting the evening before (so that the chance
  // of one coming back is nothing, and not merely small: what a catch brings back is drawn by chance)
  const hunted = ["butterflyWhite", "monarch", "ladybird"];
  await noteCatches(hunted.flatMap((bug) => Array.from({ length: 50 }, () => [bug, NOON - 14 * HOUR, 1e12])), U.guest);
  let catches = 0, brought = 0;
  for (let step = 0; step < 40 && catches < 8; step++) {
    const now = at("2026-10-05T09:00:00") + step * 11 * MIN;
    await clock(now);
    const who = [U.m1, U.m2, U.admin][catches % 3], told = (await rpc(who, "town_bugs")).bugs;
    const one = told.find(([id, bug]) => bug === "dragonfly" && HAUNTS[id][1] === "town");
    if (!one) continue;
    const [px, py] = HAUNTS[one[0]][3][0];
    r = await rpc(who, "town_net", { p_haunt: one[0], p_x: Math.floor(px), p_y: Math.floor(py), p_misses: 0 });
    if (r?.ok) { catches++; if (r.bugsAgain) brought++; }
  }
  v = await t.sql(`select count(*)::int as n, coalesce(string_agg(distinct bug, ', '), '') as bugs from public.town_comebacks`);
  t.check("eight dragonflies are caught in the town over a morning, with the butterflies and the ladybirds of its flowers hunted out", catches === 8, { catches });
  t.check("what comes back is a dragonfly or nothing: never one of the kinds hunted out", v.rows[0].n === brought && (v.rows[0].bugs === "" || v.rows[0].bugs === "dragonfly"), v.rows);
  t.check("…and most catches bring nothing back, where every one brought something before", brought < catches, { catches, brought });
  v = await t.sql(`select count(*)::int as n from public.town_deeds where what = 'net' and thing = 'dragonfly' and doc ? 'next'`);
  t.check("…each written down with where one came back, or without", v.rows[0].n === brought, v.rows);
}

t.section("the catches are read through their index, and a look at every haunt stays quick");
{
  await noCatches();
  // a busy day: twelve thousand lines of other deeds, and four thousand catches of the day's kinds
  await t.sql(`insert into public.town_deeds (member_id, at, what, thing, n) select $1, to_timestamp(($2::bigint - (g * 7000)) / 1000.0), (array['water', 'hold', 'leave', 'pick', 'cast'])[1 + g % 5], 'x', 1 from generate_series(1, 12000) g`, [U.m2, NOON]);
  const kinds = ["dragonfly", "butterflyWhite", "grasshopper", "ladybird", "cicada", "caterpillar", "damselfly", "scarab"];
  await noteCatches(Array.from({ length: 4000 }, (_, i) => [kinds[i % kinds.length], NOON - 1 - i * 20_000, 1]), U.m2);
  await t.sql(`analyze public.town_deeds`);
  v = await t.sql(`explain select coalesce(sum(d.n * (86400000 - ($1::bigint - m.ms))), 0) from public.town_deeds d, lateral (select floor(extract(epoch from d.at) * 1000)::bigint as ms) m
    where d.what = 'net' and d.thing = 'dragonfly' and d.at > to_timestamp(($1::bigint - 86400000) / 1000.0) - interval '1 second' and d.at < to_timestamp($1::bigint / 1000.0) + interval '1 second' and m.ms < $1::bigint and m.ms > $1::bigint - 86400000`, [NOON]);
  const plan = v.rows.map((x) => Object.values(x)[0]).join("\n");
  t.check("a kind's day of catches is found by the index, not by reading every deed", /town_deeds_net/.test(plan) && !/Seq Scan on town_deeds/.test(plan), plan.slice(0, 400));
  await clock(NOON);
  const began = Date.now(), told = await rpc(U.m1, "town_bugs"), took = Date.now() - began;
  t.check("a member's look at every haunt, with four thousand catches in the day, is answered in under two seconds here", Array.isArray(told.bugs) && took < 2000, { ms: took, n: told.bugs?.length });
  console.log(`      (a look at every haunt: ${took} ms in PGlite, ${told.bugs.length} told)`);
  await t.sql(`delete from public.town_deeds where thing = 'x'`);
}

t.section("who may");
{
  r = await t.as("anon", `select public.town_bugs() as r`);
  t.check("nobody signed out is told what is out, as ever", r.code === "42501", r);
  r = await t.as(U.m1, `select town.plenty('dragonfly', town.now_ms()) as r`);
  t.check("how plentiful a kind is, is no browser's to ask", r.code === "42501", r);
  r = await t.as(U.m1, `select town.bug_at(0, town.now_ms()) as r`);
  t.check("…nor the rule of what is out", r.code === "42501", r);
  r = await t.as(U.m1, `select count(*) from public.town_deeds`);
  t.check("…nor the catches themselves", r.code === "42501", r);
  r = await t.as(U.unver, `select public.town_bugs() as r`);
  t.check("somebody with no proved character is told nothing of the town's, as ever", !!r.error || r.code === "42501" || r.rows?.[0]?.r?.ok === false, r);
}

t.section("running it again, and running it where v138 has not run");
{
  await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
  await t.sql(`update public.town_catalog set data = jsonb_set(data, '{scarce,half}', '30') where key = 'insects'`);
  await t.run(FILE, "v139 a third time");
  v = await t.sql(`select (select (data->'scarce'->>'half')::int from public.town_catalog where key = 'insects') as half,
    (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written,
    (select count(*)::int from public.town_catalog) as rows, (select data->>'note' from public.town_catalog where key = 'carries') as note`);
  t.check("run again, it writes its row over again, as its head says: a number changed by hand in it is put back; no other row, and the admin's note stands", same(v.rows[0], { half: 20, written: "insects", rows: before.length, note: "an admin was here too" }), v.rows);
  // the insects' row as it was before v138, and this file alone: it leaves what both leave
  await t.sql(`update public.town_catalog set data = jsonb_set(jsonb_set(data, '{bugs,ladybird}', '{"n":[1,1],"at":["field","blooms"],"cost":1,"rids":0.1,"habit":"crawl","hours":[[5,18]],"places":["farm","town"],"weight":60}'::jsonb) - 'scarce', '{note}', 'null'::jsonb) - 'note' where key = 'insects'`);
  await t.run(FILE, "v139 where v138 has not run");
  const alone = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
  t.check("run where v138 has not, it leaves the catalog as the two leave it: the ladybird's four entries with it", same(alone, after), movedSince(after, alone).slice(0, 6));
}

await t.done();
