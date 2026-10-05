/*
 * v141 — the jar's row by name: dry run in PGlite.
 *
 * v141 writes two of the jar's functions again (v129's `town.jar_now` and `public.town_jar_drop`), each with a WHERE
 * on the one statement that had none: the live database refuses an UPDATE with no WHERE to whoever comes by the API
 * (safeupdate), and PGlite does not, which is how v129's own dry run passed. So what is held here is:
 *
 *   · read as they stand before the file, the site's functions have exactly two such statements, the jar's; after
 *     it, none (bare-writes.mjs: PGlite cannot refuse them, so they are read for);
 *   · the two written again are v129's, word for word but for the lines of v141.lines.mjs; nothing else of the
 *     well's moved, to the letter; no row of the catalog written;
 *   · the file looks at the jar once itself: a jar a round behind is at the round that is afterwards;
 *   · the jar does what it did: a drop of coins and of a thing, a round's turn with work done (shared, the log, what
 *     waits), a turn with an empty jar (the round moves, nothing shared), the book answered at each;
 *   · who may; the file's closing block; run a third time.
 *
 *   node build-v141.mjs && node v141.test.mjs
 *   node mutate.mjs v141_draft.sql v141.test.mjs v141.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { bareIn, bareWrites } from "./bare-writes.mjs";
import { JAR_DROP, JAR_NOW } from "./v141.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v141_draft.sql")) ? readFileSync(here("v141_draft.sql"), "utf8") : migration(141);

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
const lf = (s) => s.split("\r\n").join("\n");
const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3); };
/** The lines of one text that are not in the other, each way. */
const differ = (a, b) => { const x = a.split("\n"), y = b.split("\n"); return { gone: x.filter((l) => !y.includes(l)), more: y.filter((l) => !x.includes(l)) }; };

const t = await supabaseLike({ extra });
for (let n = 105; n <= 125; n++) await t.run(migration(n), `v${n}`);
t.section("it will not run before v129");
{
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v129, it stops at its first line and says why", !!stopped && /v129 has not run/.test(stopped), stopped);
}
// (in the order they ran: the well's v127 to v129 before the insects' v126 and v131, v130 after v131, then the rest)
for (const n of [127, 128, 129, 126, 131, 130, 135, 132, 133, 134, 138, 137, 139, 140]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);

const MORNING = Date.parse("2026-10-06T09:00:00+07:00"), HOUR = 3_600_000, MIN = 60_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const clock = (ms) => t.sql(`update town.test_clock set ms = ${ms}`);
const run = (q) => t.sql(q).then((r) => r.rows);
const purse = (who, coins, bag, left = 100) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const jarNow = async () => { const j = await one(`select round, coins, things from public.town_jar`); return j ?? null; };
const owedNow = async () => Object.fromEntries((await t.sql(`select member_id, coins, things from public.town_jar_owed order by member_id`)).rows.map((o) => [o.member_id, { coins: o.coins, things: o.things }]));
/** A deed written down as it would have been, the well's book reading it. */
const write = (by, at, what, n, doc = {}) => t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, coins, doc) values ($1, to_timestamp($2::bigint / 1000.0), $3, $4, $5, 0, $6::jsonb)`,
  [by, at, what, what === "water" ? "pumpkin" : "bucket", n, JSON.stringify(doc)]);
const count = (bag, item) => bag.reduce((k, s) => k + (s?.item === item ? s.n : 0), 0);
let r, v;

t.section("as things stand before the file");
const V129 = lf(migration(129));
const UNTOUCHED = ["town.jar_work", "town.jar_settle", "town.jar_shares", "town.jar_drop", "town.jar_collect", "town.jar_told", "town.well_book", "town.well_seen", "town.thanks_board",
  "public.town_well", "public.town_well_ranks", "public.town_jar_take", "public.town_well_take"];
const textOf = async (name) => (await t.sql(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid`, [name])).rows.map((x) => x.def).join("\n");
const beforeText = Object.fromEntries(await Promise.all(UNTOUCHED.map(async (name) => [name, await textOf(name)])));
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const catalogWas = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
{
  v = await bareWrites(run);
  t.check("before the file, two statements of the site's functions write a table with no WHERE: the jar's two", v.length === 2 && same(v.map((x) => x.fn).sort(), ["public.town_jar_drop(p_slot integer, p_n integer, p_coins integer)", "town.jar_now(p_now bigint)"]), v);
  t.check("the reading tells a write from what only looks like one", same(bareIn("begin insert into t (a) values (1) on conflict (a) do update set b = 2; select x from t for update; update t set a = 1 where b = 2; delete from t where a in (select a from u); end"), [])
    && bareIn("begin update t set a = (select max(b) from u where u.c = 1); end").length === 1 && bareIn("begin delete from t; end").length === 1
    && bareIn("begin if x then update public.t j set a = 1; end if; end").length === 1 && bareIn("-- update t set a = 1;\nbegin perform 'update t set a = 1'; end").length === 0);
  // a jar a round behind, as the live one stood: its round the evening before's, the clock in the morning's
  await t.sql(`truncate public.town_jar, public.town_jar_owed, public.town_jar_log restart identity`);
  const round = (await one(`select town.round_of(town.now_ms()) as r`)).r;
  await t.sql(`insert into public.town_jar (round) values ($1)`, [round - 1]);
}

t.section("the file runs, twice");
await t.runTwice(FILE);
const ROUND = (await one(`select town.round_of(town.now_ms()) as r`)).r;
{
  v = await jarNow();
  t.check("the file looks at the jar once itself: a jar a round behind is at the round that is, still empty", same(v, { round: ROUND, coins: 0, things: [] }) && same(await owedNow(), {}), v);
  v = await bareWrites(run);
  t.check("after the file, no function of the site's writes a table with no WHERE", v.length === 0, v);
}

t.section("word for word");
{
  const now = { jar_now: words(FILE, "town.jar_now"), jar_drop: words(FILE, "public.town_jar_drop") };
  const was = { jar_now: words(V129, "town.jar_now"), jar_drop: words(V129, "public.town_jar_drop") };
  let d = differ(was.jar_now ?? "", now.jar_now ?? "");
  t.check("town.jar_now is v129's, but for the line of v141.lines.mjs", !!now.jar_now && same(d.gone, JAR_NOW.map(([a]) => a)) && same(d.more, JAR_NOW.map(([, b]) => b)), d);
  d = differ(was.jar_drop ?? "", now.jar_drop ?? "");
  t.check("public.town_jar_drop is v129's, but for the line of v141.lines.mjs", !!now.jar_drop && same(d.gone, JAR_DROP.map(([a]) => a)) && same(d.more, JAR_DROP.map(([, b]) => b)), d);
  const moved = [];
  for (const name of UNTOUCHED) if ((await textOf(name)) !== beforeText[name]) moved.push(name);
  t.check("nothing else of the well's, the thanks' or the jar's moved, to the letter", moved.length === 0, moved);
  v = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  t.check("no row of the catalog was written", same(v, catalogWas));
  v = await one(`select p.prosecdef as definer, p.proconfig as config from pg_proc p where p.oid = 'public.town_jar_drop(integer, integer, integer)'::regprocedure`);
  t.check("a drop is still the definer's, with its search path", v.definer === true && same(v.config, ["search_path=public"]), v);
}

t.section("the jar does what it did");
{
  // Tuesday 09:00, the round that began at seven: m1 has poured three bucketfuls (24), m2 watered a plant of somebody else's (1)
  await write(U.m1, MORNING - 10 * MIN, "pour", 3, { well: 3 });
  await write(U.m2, MORNING - 5 * MIN, "water", 1, { tile: [133, 5], with: "can", whose: U.admin });
  await purse(U.admin, 60, [{ item: "kangkong", n: 6 }, { item: "hoe", n: 1 }]);
  r = await call(U.admin, "town_well");
  t.check("the book answers, the jar in it: empty, in this round", !!r.wellBook && same({ coins: r.jar?.coins, things: r.jar?.things, round: r.jar?.round, mine: r.jar?.mine }, { coins: 0, things: [], round: ROUND, mine: null }), r.error ?? r.jar);
  r = await call(U.admin, "town_jar_drop", null, null, 50);
  t.check("fifty coins dropped: out of the purse, into the jar", r.ok === true && r.purse?.coins === 10 && r.jar?.coins === 50 && (await jarNow()).coins === 50, r.error ?? r);
  r = await call(U.admin, "town_jar_drop", 0, 4);
  t.check("four of something grown dropped: out of the bag, into the jar", r.ok === true && count(r.purse.bag, "kangkong") === 2 && same(r.jar?.things, [["kangkong", 4]]) && same((await jarNow()).things, [["kangkong", 4]]), r.error ?? r);
  const was = await jarNow();
  const refusals = [[await call(U.admin, "town_jar_drop", 1, 1), "unwanted"], [await call(U.admin, "town_jar_drop", null, null, 11), "coins"], [await call(U.admin, "town_jar_drop", null, null, 0), "amount"]];
  t.check("a tool, more coins than one has, no coins: each refused, and the jar as it was", refusals.every(([x, why]) => x.ok === false && x.why === why) && same(await jarNow(), was), refusals.map(([x]) => x.why ?? x));
  v = (await t.sql(`select member_id, round, what, coins, things from public.town_jar_log order by id`)).rows;
  t.check("every drop is written down: who, in which round, what", same(v, [{ member_id: U.admin, round: ROUND, what: "drop", coins: 50, things: [] }, { member_id: U.admin, round: ROUND, what: "drop", coins: 0, things: [["kangkong", 4]] }]), v);

  // the round turns: seven in the evening. The first to come to the well afterwards is answered, and the jar is shared.
  await clock(Date.parse("2026-10-06T19:00:30+07:00"));
  r = await call(U.m2, "town_well");
  v = await owedNow();
  t.check("when the round has turned, the book still answers whoever comes first", !!r.wellBook && !r.error, r.error ?? Object.keys(r));
  t.check("…and the jar is shared as it is looked at: twenty-four parts to one", same(v, { [U.m1]: { coins: 48, things: [["kangkong", 4]] }, [U.m2]: { coins: 2, things: [] } }), v);
  t.check("…the jar is empty, in the new round, and the one who looked is told what waits for them", same({ coins: r.jar?.coins, things: r.jar?.things, round: r.jar?.round }, { coins: 0, things: [], round: ROUND + 1 }) && same(r.jar?.mine, { coins: 2, things: [] })
    && same(await jarNow(), { round: ROUND + 1, coins: 0, things: [] }), r.jar);
  v = await one(`select member_id, round, what, coins, things from public.town_jar_log order by id desc limit 1`);
  t.check("the sharing is written down: what there was, and by whose work", v.member_id === null && v.round === ROUND && v.what === "share" && v.coins === 50 && same(v.things, { things: [["kangkong", 4]], work: [[U.m1, 24], [U.m2, 1]] }), v);
  await purse(U.m1, 3, []);
  r = await call(U.m1, "town_jar_take");
  t.check("the carrier takes theirs", r.ok === true && r.coins === 48 && r.purse?.coins === 51 && count(r.purse.bag, "kangkong") === 4 && r.jar?.mine === null, r.error ?? r);

  // a turn with an empty jar, work done or not: the round moves, nothing is shared (how the live jar stood at seven that evening)
  await write(U.m1, Date.parse("2026-10-06T21:00:00+07:00"), "pour", 2, { well: 5 });
  await clock(Date.parse("2026-10-07T07:00:10+07:00"));
  const logged = Number((await one(`select count(*) as n from public.town_jar_log`)).n);
  r = await call(U.guest, "town_well");
  t.check("a turn with an empty jar: the book answers, the round moves, nothing is shared or written", !!r.wellBook && r.jar?.round === ROUND + 2 && same(await jarNow(), { round: ROUND + 2, coins: 0, things: [] })
    && Number((await one(`select count(*) as n from public.town_jar_log`)).n) === logged && !(U.m1 in await owedNow()), r.error ?? r.jar);
  r = await call(U.m1, "town_well");
  t.check("the carrier's bucketfuls are in the book as it is read after the turn", r.wellBook?.buckets === 5 && r.wellBook?.today?.buckets === 0, r.error ?? r.wellBook);
  // two rounds on, nobody having looked in between, with something in the jar and work in the first of them only
  await purse(U.admin, 30, []);
  r = await call(U.admin, "town_jar_drop", null, null, 30);
  await write(U.guest, Date.parse("2026-10-07T09:00:00+07:00"), "pour", 1, { well: 6 });
  await clock(Date.parse("2026-10-08T07:30:00+07:00"));
  r = await call(U.admin, "town_well");
  t.check("two rounds on with nobody having looked: shared by the work since, the jar at the round that is", same((await owedNow())[U.guest], { coins: 30, things: [] }) && same(await jarNow(), { round: ROUND + 4, coins: 0, things: [] }), { owed: await owedNow(), jar: await jarNow(), r: r.error });
}

t.section("who may");
{
  r = await t.as("anon", `select public.town_jar_drop(null, null, 1)`);
  t.check("somebody signed out is refused a drop", !!r.error && r.code === "42501", r);
  r = await t.as(U.m1, `select town.jar_now(town.now_ms())`);
  t.check("the rule itself is nobody's to call from a browser", !!r.error && r.code === "42501", r);
  const jar = await jarNow();
  for (const who of [U.unver, U.nochar]) {
    r = await call(who, "town_jar_drop", null, null, 1);
    t.check(`${who === U.unver ? "a character never proved" : "somebody with no character"} drops nothing`, (!!r.error || r.ok !== true) && same(await jarNow(), jar), r);
  }
}

t.section("the file's closing block");
{
  v = await one(`select position('where j.one' in pg_get_functiondef('town.jar_now(bigint)'::regprocedure)) > 0 as jar_now,
    position('where j.one' in pg_get_functiondef('public.town_jar_drop(integer, integer, integer)'::regprocedure)) > 0 as jar_drop`);
  t.check("both say which row", v.jar_now === true && v.jar_drop === true, v);
  v = await one(`select j.round = town.round_of(town.now_ms()) as at_the_round from public.town_jar j`);
  t.check("the jar is at the round that is", v.at_the_round === true, v);
  v = await one(`select has_function_privilege('authenticated', 'town.jar_now(bigint)', 'execute') as rule_open,
    has_function_privilege('anon', 'public.town_jar_drop(integer, integer, integer)', 'execute') as anon_drops,
    has_function_privilege('authenticated', 'public.town_jar_drop(integer, integer, integer)', 'execute') as members_drop`);
  t.check("who may, as the file says: f | f | t", v.rule_open === false && v.anon_drops === false && v.members_drop === true, v);
}

t.section("a third time");
{
  const jar = await jarNow(), owed = await owedNow(), logged = Number((await one(`select count(*) as n from public.town_jar_log`)).n);
  await t.run(FILE, "v141 again");
  t.check("run again later, it changes nothing that is kept", same(await jarNow(), jar) && same(await owedNow(), owed) && Number((await one(`select count(*) as n from public.town_jar_log`)).n) === logged);
}

t.done();
