/*
 * v112 — a deal between two: dry run in PGlite.
 *
 * The rules: every case in now/vectors-v112.json (from `TOWN_VECTORS=<this folder>/now npx vitest run
 * lib/town/db-vectors.test.ts` in the repo) is put to the SQL and must come back as the code answered it. The
 * keeping: who may deal and with whom, one deal at a time, a side laid out and changed, both words and the swap done
 * in one go (things as they are, and coins), a swap that cannot be done, a deal called off and one left to lapse,
 * what each side is told, and the record that is kept for good.
 *
 *   node v112.test.mjs            (RULES=0 skips the cases, for a quick look at the keeping)
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v112_a_deal_between_two.sql" v112.test.mjs v112.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(112);   // (from supabase/, or from history once it has run)
const VECTORS = new URL("./now/vectors-v112.json", import.meta.url);
if (!existsSync(VECTORS)) { console.log("no now/vectors-v112.json: run `TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors.test.ts` in the repo first"); process.exit(2); }
const vectors = process.env.RULES === "0" ? [] : JSON.parse(readFileSync(VECTORS, "utf8"));

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
for (const n of [105, 106, 107, 108, 109, 110, 111]) await t.run(migration(n), `v${n}`);
await t.runTwice(FILE, "v112");

const CALL = {
  tidy_give: "town.tidy_give($1::jsonb)", has_all: "town.has_all($1::jsonb, $2::jsonb)", side_of: "town.side_of($1::jsonb, $2::text)",
  lay: "town.lay($1::jsonb, $2::text, $3::jsonb, $4::jsonb, $5::numeric)", agree: "town.agree($1::jsonb, $2::text, $3::boolean)",
  pull: "town.pull($1::jsonb, $2::jsonb)", push: "town.push($1::jsonb, $2::jsonb)", swap: "town.swap($1::jsonb, $2::jsonb, $3::jsonb)",
};
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

t.section(`the rules: ${vectors.length} cases, each as the site's own code answers it`);
const tally = new Map();
for (const v of vectors) {
  let got, error = null;
  try { got = (await t.db.query(`select ${CALL[v.fn]} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
  if (typeof got === "bigint") got = Number(got);
  const ok = !error && same(got ?? null, v.want);
  const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  row.n++;
  if (!ok) { row.bad++; row.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  tally.set(v.fn, row);
}
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1800)}` : "");

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select data from public.town_catalog where key = 'deals'`);
t.check("the deals' own numbers", same(v.rows[0]?.data, { idle: 600, near: 3, kinds: 8, shown: 10 }), v.rows);
v = await t.sql(`select c.relrowsecurity, (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name = 'town_deals' and grantee in ('anon', 'authenticated')) as grants
                   from pg_class c where c.oid = 'public.town_deals'::regclass`);
t.check("the deals' table has row security on, and nothing granted to a browser", v.rows[0].relrowsecurity === true && v.rows[0].grants === 0, v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
                        count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member
                   from pg_proc p where p.pronamespace = 'public'::regnamespace
                    and p.proname in ('town_deal', 'town_deal_open', 'town_deal_lay', 'town_deal_agree', 'town_deal_cancel')`);
t.check("the five functions a browser calls: members only", v.rows[0].anon === 0 && v.rows[0].member === 5, v.rows);
v = await t.sql(`select town.tidy_give('[["worm", 2], ["rod", 1], ["worm", 3], ["nothing", 1], ["rice", 0]]'::jsonb) as tidied`);
t.check("a side tidied: each kind once, in the order first named", same(v.rows[0].tidied, [["worm", 5], ["rod", 1]]), v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
                        (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const MIN = 60_000;
const NOON = Date.parse("2026-10-05T12:00:00+07:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
let NOW = NOON;
const clock = async (ms) => { NOW = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
/** Give a member a purse with these things in a bag of so many slots, and so many coins. */
const purse = async (who, stacks, coins = 0, slots = 6) => {
  const bag = [...stacks, ...Array(slots).fill(null)].slice(0, Math.max(slots, stacks.length));
  await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $3, town.fresh() || jsonb_build_object('bag', $2::jsonb))
               on conflict (member_id) do update set doc = excluded.doc, coins = excluded.coins`, [who, JSON.stringify(bag), coins]);
};
const rowOf = async (who) => (await t.sql(`select coins, doc from public.town_purses where member_id = $1`, [who])).rows[0];
const heldIn = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const deals = async () => (await t.sql(`select id, a, b, doc, touched, ended, ended_at from public.town_deals order by id`)).rows;
const give = (list) => JSON.stringify(list);

t.section("who may deal");
for (const [who, name] of [["anon", "anon"], [U.unver, "an unproved character"], [U.nochar, "an account with no character"]]) {
  let r = await t.as(who, `select public.town_deal() as r`);
  t.check(`${name} may not ask after a deal`, r.code === "42501", r);
  r = await t.as(who, `select public.town_deal_open('${U.m2}') as r`);
  t.check(`…nor open one`, r.code === "42501", r);
  r = await t.as(who, `select public.town_deal_lay('[]'::jsonb, 0) as r, public.town_deal_agree(true) as q, public.town_deal_cancel() as s`);
  t.check(`…nor lay out, agree or call off`, r.code === "42501", r);
}
for (const [who, name] of [["anon", "anon"], [U.m1, "a member"]]) {
  const r = await t.as(who, `select * from public.town_deals limit 1`);
  t.check(`${name} cannot read the deals' table`, r.code === "42501", r);
}
let r = await t.as(U.m1, `insert into public.town_deals (a, b, doc, touched, ended) values ('${U.m2}', '${U.m1}', '{"give": {"a": [["megaCatfish", 9]], "b": []}}'::jsonb, 0, 'done')`);
t.check("a member cannot write a deal by hand", r.code === "42501" && (await deals()).length === 0, r);
r = await t.as(U.m1, `select town.swap('{}'::jsonb, town.fresh(), town.fresh())`);
t.check("nor call a rule itself", r.code === "42501", r);

t.section("opening a deal");
await purse(U.m1, [{ item: "worm", n: 5 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, { item: "can", n: 1, water: 4 }], 20);
await purse(U.m2, [{ item: "minnow", n: 2 }, { item: "rice", n: 4 }], 8);
await purse(U.guest, [{ item: "salt", n: 3 }], 2);
r = await call(U.m1, "town_deal");
t.check("before any, there is none", r.deal === null && r.now === NOON, r);
r = await call(U.m1, "town_deal_open", U.m1);
t.check("nobody deals with themselves", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_deal_open", U.unver);
t.check("nor with somebody who is not of the town", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_deal_open", null);
t.check("nor with nobody", r.ok === false && r.why === "none" && (await deals()).length === 0, r);
r = await call(U.m1, "town_deal_open", U.m2);
t.check("a deal is opened with another member: nothing laid out, no word given, each named by their character",
  r.ok === true && r.deal?.a === U.m1 && r.deal.b === U.m2 && r.deal.mine === "a" && r.deal.end === null && same(r.deal.names, { a: "Member One", b: "Member Two" })
  && same(r.deal.give, { a: [], b: [] }) && same(r.deal.coins, { a: 0, b: 0 }) && same(r.deal.ok, { a: false, b: false }) && r.deal.at === NOON, r);
r = await call(U.m2, "town_deal");
t.check("the other is told of it, as their own side", r.deal?.mine === "b" && r.deal.a === U.m1, r);
r = await call(U.guest, "town_deal");
t.check("nobody else is", r.deal === null, r);
r = await call(U.m1, "town_deal_open", U.guest);
t.check("whoever is in a deal opens no other", r.ok === false && r.why === "busy" && (await deals()).length === 1, r);
r = await call(U.guest, "town_deal_open", U.m2);
t.check("…and is opened no other with", r.ok === false && r.why === "busy" && (await deals()).length === 1, r);
r = await call(U.guest, "town_deal_lay", give([["salt", 1]]), 0);
t.check("whoever is in none lays nothing out", r.ok === false && r.why === "gone", r);

t.section("laying out, and the words");
r = await call(U.m1, "town_deal_lay", give([["worm", 3]]), 5);
t.check("a side is laid out: things from the bag, and coins beside them", r.ok === true && same(r.deal.give.a, [["worm", 3]]) && r.deal.coins.a === 5 && heldIn(r.purse.bag, "worm") === 5 && r.purse.coins === 20, r);
r = await call(U.m1, "town_deal_lay", give([["worm", 6]]), 0);
t.check("not more than the bag has", r.ok === false && r.why === "none" && same(r.deal.give.a, [["worm", 3]]), r);
r = await call(U.m1, "town_deal_lay", give([["worm", 3]]), 21);
t.check("nor more coins than the purse has", r.ok === false && r.why === "coins" && r.deal.coins.a === 5, r);
r = await call(U.m1, "town_deal_lay", give([["worm", 3]]), -1);
t.check("nor coins below nothing", r.ok === false && r.why === "amount", r);
r = await call(U.m1, "town_deal_lay", give([["worm", 3]]), 2.5);
t.check("nor half a coin", r.ok === false && r.why === "amount" && r.deal.coins.a === 5, r);
r = await call(U.m1, "town_deal_lay", JSON.stringify("worm"), 0);
t.check("what is no list is no side", r.ok === false && r.why === "none" && same(r.deal.give.a, [["worm", 3]]), r);
r = await call(U.m1, "town_deal_lay", give([["worm'); drop table public.town_deals; --", 1]]), 0);
t.check("nor a thing that is no word", r.ok === false && r.why === "none" && (await deals()).length === 1, r);
r = await call(U.m1, "town_deal_agree", true);
t.check("one word is not a deal", r.ok === true && r.done === false && same(r.deal.ok, { a: true, b: false }) && heldIn(r.purse.bag, "worm") === 5, r);
r = await call(U.m2, "town_deal_lay", give([["minnow", 2]]), 0);
t.check("the other side changing takes back both words", r.ok === true && same(r.deal.ok, { a: false, b: false }) && same(r.deal.give, { a: [["worm", 3]], b: [["minnow", 2]] }), r);
r = await call(U.m2, "town_deal_agree", true);
r = await call(U.m2, "town_deal_agree", false);
t.check("a word is taken back", r.ok === true && r.done === false && same(r.deal.ok, { a: false, b: false }), r);
await call(U.m2, "town_deal_agree", true);
r = await call(U.m1, "town_deal_agree", true);
const m1 = await rowOf(U.m1), m2 = await rowOf(U.m2);
t.check("with both words everything changes hands at once: the things", r.ok === true && r.done === true && heldIn(m1.doc.bag, "worm") === 2 && heldIn(m1.doc.bag, "minnow") === 2
  && heldIn(m2.doc.bag, "worm") === 3 && heldIn(m2.doc.bag, "minnow") === 0, { m1: m1.doc.bag, m2: m2.doc.bag });
t.check("…and the coins", m1.coins === 15 && m2.coins === 13 && r.purse.coins === 15, { m1: m1.coins, m2: m2.coins });
t.check("…and both are told it is done", r.deal.end === "done" && (await call(U.m2, "town_deal")).deal?.end === "done", r.deal);
let all = await deals();
t.check("the deal is written down for good: who gave what to whom, things and coins", all.length === 1 && all[0].ended === "done" && Number(all[0].ended_at) === NOON
  && same(all[0].doc.give, { a: [["worm", 3]], b: [["minnow", 2]] }) && same(all[0].doc.coins, { a: 5, b: 0 }) && all[0].a === U.m1 && all[0].b === U.m2, all);
r = await call(U.m1, "town_deal_agree", true);
t.check("a deal that is done is done: no word moves anything again", r.ok === false && r.why === "gone" && (await rowOf(U.m1)).coins === 15, r);
await clock(NOON + 10_000);
r = await call(U.m1, "town_deal");
t.check("ten seconds on it is still told", r.deal?.end === "done", r);
await clock(NOON + 10_001);
r = await call(U.m1, "town_deal");
t.check("…and after that no more", r.deal === null, r);

t.section("what holds something changes hands as it is");
r = await call(U.m2, "town_deal_open", U.m1);
t.check("the other may open the next", r.ok === true && r.deal.mine === "a" && r.deal.b === U.m1, r);
await call(U.m1, "town_deal_lay", give([["potFull", 1], ["can", 1]]), 0);
await call(U.m1, "town_deal_agree", true);
r = await call(U.m2, "town_deal_agree", true);
t.check("a pot of food goes with its food, and a can with its water", r.ok === true && r.done === true
  && r.purse.bag.some((s) => s?.item === "potFull" && s.of?.dish === "tomYum" && s.of.left === 3) && r.purse.bag.some((s) => s?.item === "can" && s.water === 4)
  && heldIn((await rowOf(U.m1)).doc.bag, "potFull") === 0, r.purse.bag);

t.section("a swap that cannot be done");
await clock(NOW + MIN);
await purse(U.m1, [{ item: "worm", n: 5 }], 10);
await purse(U.m2, [{ item: "boot", n: 5 }, { item: "boot", n: 5 }, { item: "boot", n: 5 }, { item: "boot", n: 5 }, { item: "boot", n: 5 }, { item: "boot", n: 5 }], 0, 6);
await call(U.m1, "town_deal_open", U.m2);
await call(U.m1, "town_deal_lay", give([["worm", 2]]), 4);
await call(U.m1, "town_deal_agree", true);
r = await call(U.m2, "town_deal_agree", true);
t.check("a bag with no room refuses the lot: nothing moves, not the coins either", r.ok === false && r.why === "full" && (await rowOf(U.m1)).coins === 10 && (await rowOf(U.m2)).coins === 0
  && heldIn((await rowOf(U.m1)).doc.bag, "worm") === 5, r);
t.check("…both words are taken back, and the deal is still open", same(r.deal.ok, { a: false, b: false }) && r.deal.end === null && (await deals()).at(-1).ended === null, r.deal);
// what was laid out is spent meanwhile
await purse(U.m2, [], 0);
await purse(U.m1, [{ item: "worm", n: 1 }], 10);
await call(U.m2, "town_deal_agree", true);
r = await call(U.m1, "town_deal_agree", true);
t.check("a side that no longer has what it laid out moves nothing", r.ok === false && r.why === "none" && heldIn((await rowOf(U.m1)).doc.bag, "worm") === 1 && (await rowOf(U.m2)).coins === 0, r);
await purse(U.m1, [{ item: "worm", n: 5 }], 3);
await call(U.m2, "town_deal_agree", true);
r = await call(U.m1, "town_deal_agree", true);
t.check("nor coins that were spent since", r.ok === false && r.why === "coins" && (await rowOf(U.m1)).coins === 3 && (await rowOf(U.m2)).coins === 0, r);

t.section("called off, and left to lapse");
r = await call(U.m2, "town_deal_cancel");
t.check("either side calls it off", r.ok === true && r.deal.end === "off" && (await deals()).at(-1).ended === "off", r);
r = await call(U.m1, "town_deal");
t.check("…for both", r.deal?.end === "off", r);
r = await call(U.m1, "town_deal_agree", true);
t.check("a deal called off moves nothing", r.ok === false && r.why === "gone", r);
r = await call(U.m1, "town_deal_cancel");
t.check("…and is not called off twice", r.ok === false && r.why === "gone", r);
await clock(NOW + MIN);
r = await call(U.m1, "town_deal_open", U.m2);
t.check("both are free for the next", r.ok === true, r);
const opened = NOW;
await clock(opened + 9 * MIN);
r = await call(U.m1, "town_deal_lay", give([["worm", 1]]), 0);
t.check("nine minutes on it is still open, and a side laid out is a deal touched", r.ok === true && Number((await deals()).at(-1).touched) === NOW, r);
await clock(NOW + 10 * MIN);
r = await call(U.m2, "town_deal");
t.check("ten minutes after that, to the second, still open", r.deal?.end === null, r);
await clock(NOW + 1);
r = await call(U.guest, "town_deal_open", U.m2);
t.check("a deal left untouched longer is off by itself: the other is free to deal with somebody else", r.ok === true && r.deal.b === U.m2, r);
all = await deals();
t.check("…and it is written down as off, with nothing moved", all.at(-2).ended === "off" && (await rowOf(U.m1)).coins === 3 && heldIn((await rowOf(U.m1)).doc.bag, "worm") === 5, all.at(-2));
r = await call(U.m1, "town_deal_agree", true);
t.check("…and its other side finds it gone", r.ok === false && r.why === "gone", r);

t.section("the record, and an account that is closed");
v = await t.sql(`select count(*) filter (where ended = 'done')::int as done, count(*) filter (where ended = 'off')::int as off, count(*) filter (where ended is null)::int as open from public.town_deals`);
t.check("every deal is there: two done, two off, one open", v.rows[0].done === 2 && v.rows[0].off === 2 && v.rows[0].open === 1, v.rows);
try { await t.sql(`delete from auth.users where id = '${U.m2}'`); } catch { /* an account that cannot be closed fails the check below */ }
v = await t.sql(`select count(*)::int as n, count(*) filter (where b is null or a is null)::int as gone, count(*) filter (where ended = 'done' and (doc->'give'->'a' <> '[]'::jsonb or doc->'give'->'b' <> '[]'::jsonb))::int as said from public.town_deals`);
t.check("whoever goes, the deals they did stay written", v.rows[0].n === 5 && v.rows[0].gone === 5 && v.rows[0].said === 2, v.rows);
r = await call(U.guest, "town_deal");
t.check("a deal whose other side has gone is told as it stands", r.deal?.mine === "a" && r.deal.end === null, r);
r = await call(U.guest, "town_deal_agree", true);
t.check("…and can only be called off", r.ok === false && r.why === "gone", r);
r = await call(U.guest, "town_deal_cancel");
t.check("…which it is", r.ok === true && r.deal.end === "off", r);

t.section("running it again");
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{idle}', '900') where key = 'deals'`);
await t.run(FILE, "v112 a third time");
v = await t.sql(`select data->>'idle' as idle, (select count(*)::int from public.town_deals) as deals from public.town_catalog where key = 'deals'`);
t.check("a number an admin changed is not put back, and no deal is forgotten", v.rows[0].idle === "900" && v.rows[0].deals === 5, v.rows);

await t.done();
