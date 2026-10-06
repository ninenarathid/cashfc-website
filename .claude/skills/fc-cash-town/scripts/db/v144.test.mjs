/*
 * v144 — the notice board may ask more than the uncle does, too: dry run in PGlite.
 *
 * v128 held a notice of what the uncle sells to his own price. v144 writes `town.notice_cap` again, v128's word for
 * word less that one line, so that a notice has the most a stall has (v143's `town.shop_cap`). Every migration of
 * the town's before it is replayed, v143 among them, then:
 *
 *   · before the file a notice of worms cannot ask more than the uncle asks; the file is run twice; its closing block;
 *   · nothing else changed: no function new or gone, one written again and differing from v128's by the one line
 *     that goes (and the file's text of it is v128's own less that line: build-v144.mjs), every other function its
 *     own text, no table, no knob, no row; no function writes to a table with no WHERE;
 *   · the rule is held to the site's own code directly (lib/town/notices is loaded here, repo-ts-town.mjs): the most
 *     of every thing there is, by the board's numbers and by two others; and a run of notices pinned through the
 *     function a member calls, of what the uncle sells and what he does not, priced about his price and about the
 *     most, each answered as the code answers it;
 *   · each thing said plainly: dearer than the uncle both ways and no dearer than the most, the board's tenth kept
 *     as before, a stall as it was, who may, the file a third time.
 *
 *   FC_REPO=<the tree whose code is meant> node v144.test.mjs
 *   node mutate.mjs <the file, with plain line ends> v144.test.mjs v144.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { again } from "./build-v144.mjs";
import { NOTICE_CAP } from "./v144.lines.mjs";

await import("./repo-ts-town.mjs");
const N = await import("@/lib/town/notices");
const SHOPS = await import("@/lib/town/shop");
const { ITEMS } = await import("@/lib/town/items");
const { GOODS, newPurse } = await import("@/lib/town/trade");
const { shelfOf } = await import("@/lib/town/orders");

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const lf = (s) => s.split("\r\n").join("\n");
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v144_"));
const HERE_FILE = new URL("./v144_draft.sql", import.meta.url);
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE_FILE) ? readFileSync(HERE_FILE, "utf8") : migration(144));
const V128 = lf(migration(128));

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
// (in the order they ran; v136 is the party's, not the town's)
const RAN = [...Array.from({ length: 21 }, (_, i) => 105 + i), 127, 128, 129, 126, 131, 130, 135, 132, 133, 134, 138, 137, 139, 140, 141, 142, 143];
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const MET = ["kangkong", "minnow", "cabbage", "carp", "koi"];
const SEEN = [...new Set([...MET, ...shelfOf(0)])];
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
/** Chance that is the same every time (mulberry32). */
function chance(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), of: (list) => list[Math.floor(next() * list.length)], maybe: (p) => next() < p };
}

const t = await supabaseLike({ extra });
for (const n of RAN) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
// (what the village has met: said here, and not looked for again while the run lasts)
await t.sql(`update public.town_things set doc = jsonb_build_object('at', $1::bigint, 'ids', $2::jsonb) where key = 'seen'`, [MORNING + 10 * 365 * 86_400_000, JSON.stringify(Object.fromEntries(MET.map((id) => [id, true])))]);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
/** A member's purse: so many coins, and these slots as its bag. */
const purse = (who, coins, bag) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)));
  return r.error ? r : r.rows[0].r;
};
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const notices = async () => (await t.sql(`select id::int, member_id, kind, item, n, rest, price from public.town_notices order by id`)).rows;
const wipe = () => t.sql(`delete from public.town_notices where true; delete from public.town_notice_books where true; delete from public.town_notice_sales where true; delete from public.town_shops where true`);
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));
const said = (r) => ({ ok: r.ok, why: r.why });
const CAP_SIG = "town.notice_cap(text,jsonb)";
let v, r;

/* ── before the file ─────────────────────────────────────────────────────── */

t.section("before the file");
await purse(U.m1, 100, [{ item: "worm", n: 12 }, { item: "scrollPestCure", n: 1 }, { item: "kangkong", n: 9 }]);
r = await call(U.m1, "town_notice_post", "sell", "worm", 5, 3);
t.check("a notice of worms, which the uncle sells for two, cannot ask three", same(said(r), { ok: false, why: "dear" }) && (await notices()).length === 0, r);
const textsWas = await texts();
const tablesWas = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((x) => x.relname);
const knobsWas = (await t.sql(`select key, value from public.town_knobs order by key`)).rows;

await t.runTwice(FILE, "v144");
const textsNow = await texts();

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = await one(`select town.notice_cap('worm', town.notice_knobs()) as worm_on_the_board, town.shop_cap('worm', town.shop_knobs()) as worm_at_a_stall,
       (town.cat('goods')->'worm'->>'price')::int as the_uncle_asks, town.notice_cap('kangkong', town.notice_knobs()) as kangkong,
       town.notice_cap('scrollPestCure', town.notice_knobs()) as what_the_relatives_do_not_take`);
t.check("a worm may be asked ten for on the board, as at a stall, where the uncle asks two; what he does not sell is as it was; what his relatives do not take has the flat most",
  same(v, { worm_on_the_board: 10, worm_at_a_stall: 10, the_uncle_asks: 2, kangkong: 30, what_the_relatives_do_not_take: 500 }), v);
v = await one(`select (select count(*)::int from jsonb_object_keys(town.cat('items')) i(key) where town.notice_cap(i.key, town.notice_knobs()) is distinct from town.shop_cap(i.key, town.shop_knobs())) as unlike,
       (select count(*)::int from jsonb_each(town.cat('goods')) g where town.notice_cap(g.key, town.notice_knobs()) > (g.value->>'price')::numeric) as dearer_on_the_board`);
t.check("every thing there is has the same most on the board as at a stall, and every thing the uncle sells may be asked more for than he asks", same(v, { unlike: 0, dearer_on_the_board: 103 }), v);
v = await one(`select position('goods' in pg_get_functiondef('town.notice_cap(text, jsonb)'::regprocedure)) = 0 as asks_nothing_of_his_shelf`);
t.check("the board's most asks nothing of the uncle's shelf", v.asks_nothing_of_his_shelf === true, v);
v = await one(`select count(*)::int as open from pg_proc p where p.pronamespace = 'town'::regnamespace
   and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("the rules are nobody's in a browser", v.open === 0 && (await one(`select has_schema_privilege('authenticated', 'town', 'usage') as u`)).u === false, v);
v = await one(`select count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member,
       count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as signed_out
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_notice%'`);
t.check("the board's eight functions are a member's still, and none somebody signed out's", same(v, { member: 8, signed_out: 0 }), v);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("no function is new, none is gone", added.length === 0 && gone.length === 0, { added, gone });
  const others = Object.keys(textsWas).filter((sig) => sig !== CAP_SIG && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter: the stall's own most and the rule that pins a notice up among them", others.length === 0 && Object.keys(textsWas).length > 200
    && "town.shop_cap(text,jsonb)" in textsNow && "town_notice_post(text,text,integer,integer)" in textsNow, others);
  const A = textsWas[CAP_SIG].split("\n"), B = textsNow[CAP_SIG].split("\n"), at = A.findIndex((line, i) => line !== B[i]);
  t.check("the board's most is v128's less one line: the one that held what the uncle sells to his price", A.length === B.length + 1 && at >= 0
    && A[at].trim() === NOTICE_CAP[0][0].trim() && same([...A.slice(0, at), ...A.slice(at + 1)], B), { at, gone: A[at] });
  t.check("…and the file's text of it is v128's own less that line, word for word", FILE.includes(again(V128, "town.notice_cap", NOTICE_CAP)) && FILE.split("create or replace function").length === 2);
  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  t.check("it writes no row of the catalog", after.length === before.length && after.every((row, i) => row.key === before[i].key && same(row.data, before[i].data) && String(row.updated_at) === String(before[i].updated_at)));
  t.check("…adds and turns no knob", same((await t.sql(`select key, value from public.town_knobs order by key`)).rows, knobsWas));
  const tables = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((x) => x.relname);
  t.check("…and makes no table", same(tables, tablesWas));
  v = { purse: await kept(U.m1), up: (await notices()).length };
  t.check("what a member had is as it was, and nothing is on the board", v.purse.coins === 100 && v.up === 0, v);
  v = await bareWrites((q) => t.sql(q).then((x) => x.rows));
  t.check("no function writes to a table with no WHERE (the live database refuses those to a member)", v.length === 0, v);
}

/* ── the rule, held to the site's own code ───────────────────────────────── */

t.section("the rule, held to the site's own code");
{
  const ids = Object.keys(ITEMS);
  for (const [name, k] of [["by the board's own numbers", { cap: N.NOTICES.cap, capless: N.NOTICES.capless }], ["by two other numbers", { cap: 3, capless: 77 }]]) {
    const got = (await one(`select coalesce(jsonb_object_agg(i.key, town.notice_cap(i.key, $1::jsonb)), '{}'::jsonb) as r from jsonb_object_keys(town.cat('items')) i(key)`, [JSON.stringify(k)])).r;
    const bad = ids.filter((id) => got[id] !== N.capOf(id, { ...N.NOTICES, ...k }));
    t.check(`the most of every thing there is, ${name}: ${ids.length} things, each as the code has it`, ids.length > 400 && Object.keys(got).length === ids.length && bad.length === 0, bad.slice(0, 6).map((id) => [id, got[id], N.capOf(id, { ...N.NOTICES, ...k })]));
  }
  t.check("…and as the code has a stall's", ids.every((id) => N.capOf(id) === SHOPS.capOf(id)));
  // notices pinned through the function a member calls: of what the uncle sells and what he does not, priced about his price and about the most
  const c = chance(144), HIS = ["worm", "dough", "rod", "hoe", "salt", "rice", "seedKangkong", "scrollPestCure"], NOT = ["kangkong", "minnow", "carp", "koi", "cabbage", "catfish"];
  let bad = null, n = 0, overHis = 0, dear = 0;
  for (let i = 0; i < 420; i++) {
    const item = c.maybe(0.7) ? c.of(HIS) : c.of(NOT), kind = c.maybe(0.6) ? "sell" : "want", most = N.capOf(item), his = GOODS[item]?.price ?? null;
    const price = c.of([1, his ?? 2, (his ?? 2) + 1, (his ?? 2) + 3, most - 1, most, most + 1, most + 40].filter((p) => p >= 1)), amount = c.of([1, 1, 2, 5]);
    const bag = [{ item, n: Math.min(ITEMS[item].stack, 6) }, ...Array(9).fill(null)], coins = c.of([0, 30, 5000]);
    await wipe();
    await purse(U.m1, coins, bag);
    const want = N.post({ ...newPurse(), coins, bag }, N.newPinboard(), U.m1, kind, item, amount, price, MORNING, SEEN);
    const got = await call(U.m1, "town_notice_post", kind, item, amount, price);
    n++;
    if (want.ok && his !== null && price > his) overHis++;
    if (!want.ok && want.why === "dear") dear++;
    if (!bad && !(got.ok === want.ok && (want.ok || got.why === want.why))) bad = { kind, item, amount, price, coins, want: want.ok ? "ok" : want.why, got: got.error ?? (got.ok ? "ok" : got.why) };
  }
  t.check(`a notice is pinned up or refused as the code has it (${n} notices; ${overHis} of what the uncle sells above his price, ${dear} too dear)`, !bad && overHis > 60 && dear > 40, bad ?? { overHis, dear });
}

/* ── each thing, said plainly ────────────────────────────────────────────── */

t.section("dearer than the uncle, and no dearer than the board's most");
await wipe();
await purse(U.m1, 100, [{ item: "worm", n: 12 }, { item: "scrollPestCure", n: 1 }, { item: "kangkong", n: 9 }]);
await purse(U.m2, 60, []);
r = await call(U.m1, "town_notice_post", "sell", "worm", 5, 3);
t.check("a notice of five worms at three each goes up, where the uncle asks two", r.ok === true && same((await notices()).map((x) => [x.kind, x.item, x.n, x.price]), [["sell", "worm", 5, 3]]), r);
r = await call(U.m2, "town_notice_buy", (await notices())[0].id, 5);
v = { buyer: await kept(U.m2), due: (await call(U.m1, "town_notices")).notices.due, book: (await one(`select due::int as due from public.town_notice_books where member_id = $1`, [U.m1])).due };
t.check("somebody buys them: fifteen coins paid, and the board keeps its tenth as before", r.ok === true && r.coins === 15 && v.buyer.coins === 45 && v.book === 1350 && v.due === 13, [r.coins, v]);
r = await call(U.m1, "town_notice_post", "sell", "worm", 1, 10);
v = await call(U.m1, "town_notice_post", "sell", "worm", 1, 11);
t.check("ten a worm is the most, and eleven too dear", r.ok === true && same(said(v), { ok: false, why: "dear" }), [said(r), said(v)]);
r = await call(U.m1, "town_notice_post", "want", "worm", 5, 4);
t.check("worms are wanted at four each, where the uncle asks two: the twenty coins are put down", r.ok === true && r.purse.coins === 80, said(r));
await wipe();
// (the dearer one first: a notice that goes up takes its thing out of the bag)
v = await call(U.m1, "town_notice_post", "sell", "scrollPestCure", 1, 501);
r = await call(U.m1, "town_notice_post", "sell", "scrollPestCure", 1, 500);
t.check("a scroll the relatives do not take, which he sells for forty, may ask five hundred and no more", r.ok === true && same(said(v), { ok: false, why: "dear" }), [said(r), said(v)]);
r = await call(U.m1, "town_notice_post", "sell", "kangkong", 1, 30);
v = await call(U.m1, "town_notice_post", "sell", "kangkong", 1, 31);
t.check("what he does not sell has the most it had", r.ok === true && same(said(v), { ok: false, why: "dear" }), [said(r), said(v)]);

t.section("a stall is as it was");
await purse(U.m1, 100, [{ item: "worm", n: 12 }]);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 5, price: 10 }], 30, 40);
v = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 5, price: 11 }], 30, 40);
t.check("a stall still asks up to ten a worm, and no more", r.ok === true && same(said(v), { ok: false, why: "dear" }), [said(r), said(v)]);

t.section("who may");
r = await t.as(U.m2, `select town.notice_cap('worm', '{"cap": 10, "capless": 500}'::jsonb)`);
v = await t.as("anon", `select town.notice_cap('worm', '{"cap": 10, "capless": 500}'::jsonb)`);
t.check("the rule is not a member's to call, nor somebody signed out's", r.code === "42501" && v.code === "42501", [r, v]);
r = await call("anon", "town_notice_post", "sell", "worm", 1, 3);
v = await call(U.unver, "town_notice_post", "sell", "worm", 1, 3);
t.check("pinning a notice up is still not somebody signed out's, nor somebody's with no proved character", r.code === "42501" && v.code === "42501", [r, v]);

t.section("run a third time");
{
  const was = await notices();
  await t.run(FILE, "v144 a third time");
  t.check("the board is as it was", same(await notices(), was) && was.length >= 2, was);
  t.check("…every function its own text still", same(await texts(), textsNow));
  await purse(U.m1, 0, [{ item: "worm", n: 3 }]);
  r = await call(U.m1, "town_notice_post", "sell", "worm", 1, 7);
  t.check("…and a notice asks more than the uncle as before", r.ok === true, said(r));
}

await t.done();
