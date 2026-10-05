/*
 * v128 — a board to sell on: dry run in PGlite.
 *
 * v128 adds the notice board: its knobs, three closed tables, the village's memory of what has been met, the rules,
 * and eight functions a member may call. It writes nothing again.
 *
 * v105 to v122 are replayed as they ran, then v123 and v124 (their drafts, until they have run), then v128 twice. The
 * rules are held to the site's own code directly: lib/town/notices is loaded here (repo-ts-town.mjs) and three members
 * do the same things, in the same order, at the board the code keeps and at the board the database keeps: every
 * answer, every purse and the board as each is told it must be the same.
 *
 *   node v128.test.mjs                       (after v123 and v124, as it will be run)
 *   V128_ALONE=1 node v128.test.mjs          (straight after v122: it stands on neither)
 *   node mutate.mjs v128_draft.sql v128.test.mjs v128.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

await import("./repo-ts-town.mjs");
const N = await import("@/lib/town/notices");
const T = await import("@/lib/town/trade");
const S = await import("@/lib/town/stamina");

const here = (name) => new URL(`./${name}`, import.meta.url);
const draft = (n) => (existsSync(here(`v${n}_draft.sql`)) ? readFileSync(here(`v${n}_draft.sql`), "utf8") : migration(n));
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : draft(128);

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
for (let n = 105; n <= 122; n++) await t.run(migration(n), `v${n}`);
// (v128 stands on nothing of v123 to v127: V128_ALONE=1 tries it straight after v122)
if (!process.env.V128_ALONE) { await t.run(draft(123), "v123"); await t.run(draft(124), "v124"); }
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const NOON = Date.parse("2026-10-05T12:00:00+07:00"), HOUR = 3_600_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
let NOW = NOON;
const clock = async (ms) => { NOW = ms; await t.sql(`update town.test_clock set ms = $1`, [ms]); };
await t.runTwice(FILE, "v128");

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
/** Chance that is the same every time (mulberry32). */
function chance(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), of: (list) => list[Math.floor(next() * list.length)], maybe: (p) => next() < p };
}
/** A deed the database dies of is answered as a refusal with nothing in it, so that the check that asked says FAIL and the run goes on. */
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? { ok: false, why: "died", died: `${r.error} (${r.code ?? "no code"})`, purse: { coins: NaN, bag: [] }, notices: { notices: [], mine: [], seen: [], sales: {} } } : r.rows[0].r;
};
const purse = (who, coins, bag) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))]);
const notices = async () => (await t.sql(`select id::int, member_id, kind, item, n, rest, price, held, at::float8 as at, until::float8 as until from public.town_notices order by id`)).rows;
const book = async (who) => (await t.sql(`select due::float8 as due, more from public.town_notice_books where member_id = $1`, [who])).rows[0] ?? { due: 0, more: 0 };
const deeds = async (who, what) => (await t.sql(`select thing, n::float8 as n, coins::float8 as coins, doc from public.town_deeds where member_id = $1 and what = $2 order by id`, [who, what])).rows;

/* ── the closing block ───────────────────────────────────────────────────── */

t.section("what is kept, and who may");
let v = await t.sql(`select count(*)::int as n from public.town_knobs where key like 'notice\\_%'`);
t.check("eleven knobs", v.rows[0].n === 11, v.rows);
const K = (await one(`select town.notice_knobs() as k`)).k;
t.check("the knobs come to the numbers the site's code has", same(K, { slots: N.NOTICES.slots, more: N.NOTICES.more, slot_price: N.NOTICES.slotPrice, fee: N.NOTICES.fee, hours: N.NOTICES.hours,
  cap: N.NOTICES.cap, capless: N.NOTICES.capless, most: N.NOTICES.most, shown: N.NOTICES.shown, days: N.NOTICES.days }), K);
v = await t.sql(`select c.relname, c.relrowsecurity as closed, (select count(*)::int from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.oid in ('public.town_notices'::regclass, 'public.town_notice_books'::regclass, 'public.town_notice_sales'::regclass) order by 1`);
t.check("the three tables are closed books: row security on, and no grant to a browser", same(v.rows, ["town_notice_books", "town_notice_sales", "town_notices"].map((relname) => ({ relname, closed: true, grants: 0 }))), v.rows);
v = await t.sql(`select (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as rules_open,
    has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules`);
t.check("the rules are nobody's in a browser", same(v.rows[0], { rules_open: 0, member_has_rules: false }), v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member, count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon, count(*)::int as n
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_notice%'`);
t.check("the board's eight are a member's, and nobody's signed out", same(v.rows[0], { member: 8, anon: 0, n: 8 }), v.rows);
v = await t.sql(`select doc from public.town_things where key = 'seen'`);
t.check("what the village has met begins empty, never looked for", same(v.rows[0]?.doc, { at: 0, ids: {} }), v.rows);

/* ── the small rules, held to the site's own code ────────────────────────── */

t.section("the small rules, over the database's own catalog");
const cat = Object.fromEntries((await t.sql(`select key, data from public.town_catalog`)).rows.map((r) => [r.key, r.data]));
const ITEM_IDS = Object.keys(cat.items);
{
  const got = (await one(`select coalesce(jsonb_object_agg(i.key, town.notice_cap(i.key, town.notice_knobs())), '{}'::jsonb) as r from jsonb_object_keys(town.cat('items')) i(key)`)).r;
  const bad = ITEM_IDS.filter((id) => got[id] !== N.capOf(id));
  t.check(`the most a thing may be asked for: ${ITEM_IDS.length} things`, ITEM_IDS.length > 200 && bad.length === 0, bad.slice(0, 6).map((id) => [id, got[id], N.capOf(id)]));
  t.check("…what the uncle sells never above his price, a vegetable ten times what the relatives pay, a tool they do not take five hundred",
    got.worm === 2 && got.rod === 60 && got.kangkong === 30 && Object.values(got).includes(500), [got.worm, got.rod, got.kangkong]);
  const c = chance(128);
  let cases = 0, wrong = 0, first = null;
  for (let i = 0; i < 400; i++) {
    const id = c.of(["kangkong", "can", "potFull", "bucket", "minnow"]);
    const stack = () => c.maybe(0.25) ? null : (() => {
      const item = c.maybe(0.6) ? id : c.of(["worm", "carrot", "can", "bucket"]), s = { item, n: c.int(1, 20) };
      if (c.maybe(0.2)) s.water = c.of([0, 1, 3]);
      if (c.maybe(0.12)) s.of = c.maybe(0.2) ? null : { dish: "friedMinnow", left: 2 };
      return s;
    })();
    const bag = Array.from({ length: 10 }, stack), have = N.plain(bag, id), n = c.int(1, Math.max(1, have));
    const got2 = await one(`select town.plain($1::jsonb, $2) as plain, town.take_plain($1::jsonb, $2, $3) as took`, [JSON.stringify(bag), id, Math.min(n, Math.max(have, 1))]);
    cases++;
    // (so many taken out is asked only where the bag holds as many)
    if (got2.plain !== have || (have >= n && !same(got2.took, N.takePlain(bag, id, n)))) { wrong++; first ??= { bag, id, n, have, got: got2 }; }
  }
  t.check(`plain things in a bag, and so many taken out: ${cases} bags`, wrong === 0, first);
}

/* ── three members at two boards ─────────────────────────────────────────── */

t.section("three members at the board the code keeps and the board the database keeps");
const WHO = [U.m1, U.m2, U.guest];
const NAME = Object.fromEntries((await t.sql(`select id, coalesce(character_name, display_name, discord_username, '') as name from public.profiles`)).rows.map((r) => [r.id, r.name]));
const name = (id) => NAME[id] ?? "";
const BAG = [{ item: "kangkong", n: 20 }, { item: "kangkong", n: 20 }, { item: "kangkong", n: 13 }, { item: "minnow", n: 20 }, { item: "carrot", n: 9 }, { item: "worm", n: 20 }, { item: "can", n: 1, water: 2 }, { item: "can", n: 1 }];
for (const who of WHO) await purse(who, 4000, BAG);
const mine = Object.fromEntries(await Promise.all(WHO.map(async (who) => [who, (await call(who, "town_me")).purse])));
t.check("each of the three begins with the same bag and four thousand coins", WHO.every((who) => mine[who].coins === 4000 && mine[who].bag.filter(Boolean).length === 8), mine[U.m1]);
{
  const c = chance(20261005), ids = new Map();   // the code's notice → the database's
  let board = N.newPinboard(), seen = (await call(U.m1, "town_notices")).notices.seen;
  const shelf = (await one(`select town.shelf_of((town.thing('village', false)->>'unlocked')::int) as s`)).s;
  t.check("what may be wanted at first: what is in the three bags, and what is on the uncle's shelf", ["kangkong", "minnow", "carrot", "worm", "can"].every((id) => seen.includes(id)) && shelf.every((id) => seen.includes(id))
    && !seen.includes("megaCatfish") && seen.length === new Set([...shelf, "kangkong", "minnow", "carrot", "worm", "can"]).size, seen);
  const THINGS = ["kangkong", "minnow", "carrot", "worm", "can", "rod", "megaCatfish", "catfish", "friedMinnow", "nothing"];
  const tells = (who) => {
    const told = N.told(board, who, NOW, name, seen), map = (n) => ({ ...n, id: ids.get(n.id) });
    return { ...told, notices: told.notices.map(map), mine: told.mine.map(map) };
  };
  const counts = {}, refusals = {}, wrong = [];
  let steps = 0;
  for (let i = 0; i < 1400 && wrong.length < 3; i++) {
    const who = c.of(WHO), p = mine[who], up = board.notices, pick = () => (up.length && c.maybe(0.93) ? c.of(up) : { id: 9999, item: "kangkong", left: 5, held: 0 });
    const op = c.of(["sell", "sell", "want", "want", "buy", "buy", "buy", "fill", "fill", "fill", "fetch", "down", "collect", "slot", "wait"]);
    let did, got, label;
    if (op === "wait") { await clock(NOW + c.of([1, 5, 30, 600, 2 * 3600, 9 * 3600, 30 * 3600]) * 1000); continue; }
    if (op === "sell" || op === "want") {
      const item = c.of(THINGS), cap = item === "nothing" ? 10 : N.capOf(item);
      const n = c.maybe(0.06) ? c.of([0, -2, 201]) : c.int(1, op === "sell" ? 25 : 12), price = c.maybe(0.06) ? c.of([0, cap + 1, cap * 3]) : c.int(1, Math.max(1, Math.min(cap, op === "want" ? 30 : cap)));
      label = [op, item, n, price];
      did = N.post(p, board, who, op, item, n, price, NOW, seen);
      got = await call(who, "town_notice_post", op, item, n, price);
      if (did.ok && got.ok) ids.set(did.id, got.id);
    } else if (op === "buy" || op === "fill") {
      const at = pick(), n = c.maybe(0.05) ? c.of([0, -1]) : c.int(1, Math.max(1, Math.min(at.left + (c.maybe(0.1) ? 3 : 0), 14)));
      label = [op, at.id, n];
      did = (op === "buy" ? N.buy : N.fill)(p, board, who, at.id, n, NOW);
      got = await call(who, op === "buy" ? "town_notice_buy" : "town_notice_fill", ids.get(at.id) ?? 999999, n);
    } else if (op === "fetch" || op === "down") {
      const own = up.filter((x) => x.by === who), at = own.length && c.maybe(0.85) ? c.of(own) : pick();
      label = [op, at.id];
      did = (op === "fetch" ? N.fetch : N.takeDown)(p, board, who, at.id);
      got = await call(who, op === "fetch" ? "town_notice_fetch" : "town_notice_down", ids.get(at.id) ?? 999999);
    } else if (op === "collect") { label = [op]; did = N.collectDue(p, board, who); got = await call(who, "town_notice_collect"); }
    else { label = [op]; did = N.moreSlot(p, board, who); got = await call(who, "town_notice_slot"); }
    steps++;
    counts[op] = (counts[op] ?? 0) + (did.ok ? 1 : 0);
    if (!did.ok) refusals[`${op}:${did.why}`] = (refusals[`${op}:${did.why}`] ?? 0) + 1;
    if (got.died) { wrong.push({ i, label, died: got.died }); continue; }
    if (did.ok) { board = did.board; mine[who] = did.purse; }
    // the answer, the purse, and the board as this member is told it
    const said = did.ok
      ? { ok: true, ...(op === "sell" || op === "want" ? { id: ids.get(did.id) } : op === "buy" || op === "fill" ? { item: did.item, coins: did.coins } : op === "fetch" ? { item: did.item, got: did.got }
        : op === "down" ? { item: did.item, things: did.things, coins: did.coins } : { coins: did.coins }) }
      : { ok: false, why: did.why };
    const { purse: gotPurse, notices: gotBoard, now: _now, ...answer } = got;
    const want = tells(who), { seen: gotSeen, ...gotTold } = gotBoard ?? {}, { seen: _seen, ...wantTold } = want;
    if (!same(answer, said)) wrong.push({ i, label, answer, said });
    else if (gotPurse.coins !== mine[who].coins || !same(gotPurse.bag, mine[who].bag)) wrong.push({ i, label, purse: { coins: gotPurse.coins, bag: gotPurse.bag }, want: { coins: mine[who].coins, bag: mine[who].bag } });
    else if (!same(gotTold, wantTold)) wrong.push({ i, label, told: gotTold, want: wantTold });
    seen = gotSeen ?? seen;
  }
  t.check(`every answer, every purse and the board as each is told it are the same at both: ${steps} deeds`, wrong.length === 0 && steps > 1200, wrong[0]);
  t.check("…with every deed done many times over", ["sell", "want", "buy", "fill", "fetch", "down", "collect", "slot"].every((op) => (counts[op] ?? 0) >= 12), counts);
  const WHYS = ["sell:none", "sell:amount", "sell:dear", "sell:slots", "want:none", "want:coins", "want:dear", "buy:gone", "buy:own", "buy:amount", "fill:gone", "fill:own", "fill:none", "fetch:none", "down:none", "collect:nothing", "slot:slots"];
  t.check("…and refused in every way it can be", WHYS.every((w) => refusals[w] > 0), WHYS.filter((w) => !refusals[w]));
  // nothing made, nothing lost: every coin and every kangkong is in a purse, on the board, owed, or the board's tenth
  const rows = await notices(), purses = (await t.sql(`select member_id, coins, doc from public.town_purses where member_id = any($1)`, [WHO])).rows;
  const sold = (await one(`select coalesce(sum(n::bigint * price), 0)::float8 as coins from public.town_notice_sales`)).coins;
  const due = (await one(`select coalesce(sum(due), 0)::float8 as due from public.town_notice_books`)).due;
  const slots = (await one(`select coalesce(sum(-coins), 0)::float8 as coins from public.town_deeds where what = 'notice_slot'`)).coins;
  const collected = (await one(`select coalesce(sum(coins), 0)::float8 as coins from public.town_deeds where what = 'notice_collect'`)).coins;
  const inPurses = purses.reduce((n, p) => n + p.coins, 0), pinned = rows.filter((x) => x.kind === "want").reduce((n, x) => n + x.rest * x.price, 0);
  t.check("no coin is made or lost: the purses, the coins put down on notices, what is owed, the places bought and the board's tenth come to what there was",
    Math.abs(inPurses + pinned + due / 100 + slots + (sold * K.fee) / 100 - 3 * 4000) < 1e-6 && Math.abs(sold * (100 - K.fee) / 100 - collected - due / 100) < 1e-6, { inPurses, pinned, due, slots, sold, collected });
  const kang = purses.reduce((n, p) => n + p.doc.bag.filter((s) => s?.item === "kangkong").reduce((m, s) => m + s.n, 0), 0)
    + rows.filter((x) => x.item === "kangkong").reduce((n, x) => n + (x.kind === "sell" ? x.rest : x.held), 0);
  t.check("…and no thing either: every kangkong is in a bag or on the board", kang === 3 * 53, kang);
  t.check("a can with water in it never left a bag", purses.every((p) => p.doc.bag.some((s) => s?.item === "can" && s.water === 2)), purses.map((p) => p.doc.bag.filter((s) => s?.item === "can")));
}

/* ── one of each, said plainly ───────────────────────────────────────────── */

t.section("a notice to sell");
await t.sql(`delete from public.town_notices; delete from public.town_notice_books; delete from public.town_notice_sales; delete from public.town_deeds`);
await clock(NOON + 400 * HOUR);
await purse(U.m1, 0, [{ item: "kangkong", n: 20 }, { item: "kangkong", n: 10 }, { item: "can", n: 1, water: 3 }]);
await purse(U.m2, 99, []);
let r = await call(U.m1, "town_notice_post", "sell", "kangkong", 25, 4);
const first = r.id;
t.check("twenty-five kangkong pinned up at four coins: out of the bag, on the board for three days", r.ok === true && r.purse.bag.filter(Boolean).reduce((n, s) => n + (s.item === "kangkong" ? s.n : 0), 0) === 5
  && same(r.notices.mine.map((n) => [n.kind, n.item, n.n, n.left, n.price, n.mine, n.until - NOW]), [["sell", "kangkong", 25, 25, 4, true, 72 * HOUR]]), r);
r = await call(U.m1, "town_notice_post", "sell", "can", 1, 10);
t.check("a can with water in it is no plain can: it cannot be put up", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_notice_post", "sell", "kangkong", 5, 31);
t.check("a price above ten times what the relatives pay is refused", r.ok === false && r.why === "dear", r);
r = await call(U.m2, "town_notice_buy", first, 10);
t.check("somebody else buys ten: forty coins paid, the ten in their bag at once", r.ok === true && r.coins === 40 && r.purse.coins === 59 && r.purse.bag[0]?.n === 10 && r.notices.notices[0]?.left === 15, r);
t.check("…and nine tenths of it waits at the board for the writer: 3,600 hundredths", (await book(U.m1)).due === 3600, await book(U.m1));
v = await t.sql(`select at::float8 as at, item, n, price, kind, seller, buyer, notice::int as notice from public.town_notice_sales`);
t.check("the sale is written down: what, how many, at what price, who sold and who bought", same(v.rows, [{ at: NOW, item: "kangkong", n: 10, price: 4, kind: "sell", seller: U.m1, buyer: U.m2, notice: first }]), v.rows);
r = await call(U.m1, "town_notice_buy", first, 1);
t.check("the writer cannot buy from their own notice", r.ok === false && r.why === "own", r);
r = await call(U.m2, "town_notice_buy", first, 16);
t.check("more than is left is refused: gone", r.ok === false && r.why === "gone", r);
r = await call(U.m2, "town_notice_buy", first, 15);
t.check("without the coins it is refused: fifteen at four is sixty, and fifty-nine are left", r.ok === false && r.why === "coins" && r.purse.coins === 59, r);
{
  const FULL = Array(10).fill({ item: "worm", n: 20 });
  await purse(U.guest, 500, FULL);
  r = await call(U.guest, "town_notice_buy", first, 1);
  t.check("a bag with no room buys nothing", r.ok === false && r.why === "full" && r.purse.coins === 500 && (await notices())[0]?.rest === 15, r);
  const had = (await one(`select coins, doc from public.town_purses where member_id = $1`, [U.m1]));
  await purse(U.m1, had.coins, FULL);
  r = await call(U.m1, "town_notice_down", first);
  t.check("…and a notice is not taken down into one: all of it comes back, or the notice stays", r.ok === false && r.why === "full" && (await notices()).length === 1, r);
  await t.sql(`update public.town_purses set doc = $2 where member_id = $1`, [U.m1, JSON.stringify(had.doc)]);
}
r = await call(U.m1, "town_notice_collect");
t.check("the writer collects thirty-six coins", r.ok === true && r.coins === 36 && r.purse.coins === 36 && r.notices.due === 0 && (await book(U.m1)).due === 0, r);
r = await call(U.m1, "town_notice_collect");
t.check("…and nothing more waits", r.ok === false && r.why === "nothing", r);
{
  const d = [await deeds(U.m1, "notice_post"), await deeds(U.m2, "notice_buy"), await deeds(U.m1, "notice_collect")];
  t.check("each of them is written down as a deed: what was pinned, what was bought and paid, what was collected", same(d[0], [{ thing: "kangkong", n: 25, coins: 0, doc: { kind: "sell", price: 4, notice: first } }])
    && same(d[1], [{ thing: "kangkong", n: 10, coins: -40, doc: { notice: first, price: 4, from: U.m1 } }]) && same(d[2]?.map((x) => [x.thing, x.coins]), [[null, 36]]), d);
}
await clock(NOW + 72 * HOUR);
r = await call(U.m2, "town_notice_buy", first, 1);
t.check("past its three days a notice is off the board: nothing can be bought from it", r.ok === false && r.why === "gone" && r.notices.notices.length === 0, r);
r = await call(U.m1, "town_notices");
t.check("…and it is still its writer's, to take down", r.notices.mine.length === 1 && r.notices.mine[0]?.left === 15 && r.notices.notices.length === 0, r.notices);
r = await call(U.m2, "town_notice_down", first);
t.check("nobody else can take it down", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_notice_down", first);
t.check("taken down: the fifteen not sold are back in the bag, and the notice is gone", r.ok === true && r.things === 15 && r.coins === 0 && r.notices.mine.length === 0
  && r.purse.bag.filter(Boolean).reduce((n, s) => n + (s.item === "kangkong" ? s.n : 0), 0) === 20 && (await notices()).length === 0, r);

t.section("a notice of something wanted");
await purse(U.m1, 200, []);
await purse(U.m2, 0, [{ item: "minnow", n: 7 }]);
r = await call(U.m1, "town_notice_post", "want", "megaCatfish", 1, 50);
t.check("a thing nobody has met cannot be wanted: refused as a thing that is not there, and nothing pinned", r.ok === false && r.why === "none" && (await notices()).length === 0 && !r.notices.seen.includes("megaCatfish"), r);
r = await call(U.m1, "town_notice_post", "want", "minnow", 10, 5);
const wanted = r.id;
t.check("ten minnows wanted at five coins: fifty coins put down", r.ok === true && r.purse.coins === 150 && same(r.notices.mine.map((n) => [n.kind, n.item, n.left, n.held]), [["want", "minnow", 10, 0]]), r);
r = await call(U.m1, "town_notice_post", "want", "minnow", 100, 5);
t.check("more than the purse can put down is refused", r.ok === false && r.why === "coins", r);
r = await call(U.m2, "town_notice_fill", wanted, 4);
t.check("somebody brings four: out of their bag, and nine tenths of twenty coins wait for them", r.ok === true && r.coins === 20 && r.purse.bag[0]?.n === 3 && r.purse.coins === 0 && r.notices.due === 18, r);
t.check("…what was brought is told only to whoever wanted it", r.notices.notices[0]?.held === 0 && r.notices.notices[0]?.left === 6 && (await call(U.m1, "town_notices")).notices.mine[0]?.held === 4, r.notices.notices);
r = await call(U.m2, "town_notice_fill", wanted, 4);
t.check("more than they hold is refused", r.ok === false && r.why === "none", r);
r = await call(U.m1, "town_notice_fill", wanted, 1);
t.check("the writer cannot bring to their own notice", r.ok === false && r.why === "own", r);
r = await call(U.m2, "town_notice_fetch", wanted);
t.check("only its writer takes what was brought", r.ok === false && r.why === "none", r);
{
  const had = (await one(`select coins, doc from public.town_purses where member_id = $1`, [U.m1]));
  await purse(U.m1, had.coins, [...Array(9).fill({ item: "worm", n: 20 }), { item: "minnow", n: 18 }]);
  r = await call(U.m1, "town_notice_fetch", wanted);
  t.check("with room for two only, two are taken and two wait on", r.ok === true && r.got === 2 && r.notices.mine[0]?.held === 2 && r.purse.bag[9]?.n === 20, r);
  r = await call(U.m1, "town_notice_fetch", wanted);
  t.check("…and with room for none, none", r.ok === false && r.why === "full" && (await notices())[0]?.held === 2, r);
  await t.sql(`update public.town_purses set doc = $2 where member_id = $1`, [U.m1, JSON.stringify(had.doc)]);
  await t.sql(`update public.town_notices set held = 4 where id = $1`, [wanted]);
}
r = await call(U.m1, "town_notice_fetch", wanted);
t.check("the writer takes the four: in the bag, and the notice still wants six", r.ok === true && r.got === 4 && r.purse.bag[0]?.n === 4 && r.notices.mine[0]?.held === 0 && r.notices.mine[0]?.left === 6, r);
r = await call(U.m1, "town_notice_down", wanted);
t.check("taken down: the thirty coins not spent come back", r.ok === true && r.coins === 30 && r.things === 0 && r.purse.coins === 180 && (await notices()).length === 0, r);
{
  const d = [await deeds(U.m2, "notice_fill"), await deeds(U.m1, "notice_fetch"), (await deeds(U.m1, "notice_down")).at(-1), (await deeds(U.m1, "notice_post")).at(-1)];
  t.check("…each written down: what was brought and to whom, what was taken, what came back, and the coins put down", same(d[0], [{ thing: "minnow", n: 4, coins: 0, doc: { notice: wanted, price: 5, to: U.m1 } }])
    && same(d[1], [{ thing: "minnow", n: 2, coins: 0, doc: { notice: wanted } }, { thing: "minnow", n: 4, coins: 0, doc: { notice: wanted } }]) && d[2]?.coins === 30 && d[2]?.doc?.kind === "want" && d[3]?.coins === -50, d);
}

t.section("what the village has met");
await purse(U.guest, 0, [{ item: "megaCatfish", n: 1 }]);
r = await call(U.m1, "town_notice_post", "want", "megaCatfish", 1, 50);
t.check("a thing that has just come into somebody's bag is not met until the bags are looked through again", r.ok === false && r.why === "none", r);
await clock(NOW + 11 * 60_000);
r = await call(U.m1, "town_notices");
t.check("ten minutes on they are, and it may be wanted", r.notices.seen.includes("megaCatfish"), r.notices.seen);
await purse(U.guest, 0, []);
await clock(NOW + 11 * 60_000);
r = await call(U.m1, "town_notice_post", "want", "megaCatfish", 1, 50);
t.check("…and stays met when nobody holds it any more: what the village has met only grows", r.ok === true && r.notices.seen.includes("megaCatfish"), r);
// (two things the catalog has and the village has not met: one a hint names, one a scroll)
const [hinted, written] = ITEM_IDS.filter((id) => !r.notices.seen.includes(id) && !["catfish", "friedMinnow"].includes(id));
await t.sql(`insert into public.town_deeds (member_id, at, what, thing) values ($1, to_timestamp(town.now_ms() / 1000.0), 'hint', $2), ($1, to_timestamp(town.now_ms() / 1000.0), 'read', $3), ($1, to_timestamp(town.now_ms() / 1000.0), 'leave', 'catfish'), ($1, to_timestamp(town.now_ms() / 1000.0), 'eat', 'friedMinnow')`, [U.m2, hinted, written]);
await clock(NOW + 11 * 60_000);
r = await call(U.m1, "town_notices");
t.check("what was left with the uncle or eaten since the last look was held, and is met; what a hint or a scroll only names is not",
  !!hinted && !!written && r.notices.seen.includes("catfish") && r.notices.seen.includes("friedMinnow") && !r.notices.seen.includes(hinted) && !r.notices.seen.includes(written), r.notices.seen.filter((id) => ["catfish", "friedMinnow", hinted, written].includes(id)));
t.check("…and nothing told as met is a thing the catalog does not have", r.notices.seen.every((id) => ITEM_IDS.includes(id)), r.notices.seen.filter((id) => !ITEM_IDS.includes(id)));

t.section("places, and who may");
await t.sql(`delete from public.town_notices; delete from public.town_notice_books`);
await purse(U.m1, 5000, [{ item: "kangkong", n: 20 }]);
for (let i = 0; i < 3; i++) r = await call(U.m1, "town_notice_post", "sell", "kangkong", 1, 3);
r = await call(U.m1, "town_notice_post", "sell", "kangkong", 1, 3);
t.check("a fourth notice is refused: three places", r.ok === false && r.why === "slots" && r.notices.slots === 3 && r.notices.more === 100, r);
const paid = [];
for (let i = 0; i < 5; i++) { r = await call(U.m1, "town_notice_slot"); paid.push(r.coins); }
t.check("five more places are bought, each for twice the one before", same(paid, [100, 200, 400, 800, 1600]) && r.purse.coins === 5000 - 3100 && r.notices.slots === 8 && r.notices.more === null, [paid, r.notices.slots, r.notices.more]);
r = await call(U.m1, "town_notice_slot");
t.check("…and no sixth", r.ok === false && r.why === "slots", r);
await purse(U.m2, 99, []);
r = await call(U.m2, "town_notice_slot");
t.check("a place is not had without the coins for it", r.ok === false && r.why === "coins" && r.purse.coins === 99 && (await book(U.m2)).more === 0, r);
r = await call(U.m1, "town_notice_post", "sell", "kangkong", 1, 3);
t.check("the fourth notice goes up now", r.ok === true && r.notices.mine.length === 4, r);
t.check("each place bought is written down with what it cost", same((await deeds(U.m1, "notice_slot")).map((x) => x.coins), [-100, -200, -400, -800, -1600]));
for (const [who, label] of [[null, "somebody signed out"], [U.unver, "somebody with no proved character"]]) {
  r = await t.as(who, `select public.town_notices() as r`);
  const post = await t.as(who, `select public.town_notice_post('sell', 'kangkong', 1, 3) as r`);
  t.check(`${label} is refused the board, and cannot pin a notice`, !!r.error && !!post.error, [r, post]);
}
r = await t.as(U.m1, `select * from public.town_notices`);
t.check("the notices are no member's to read as a table", !!r.error || r.rows.length === 0, r);
r = await t.as(U.m1, `update public.town_notice_books set due = 999999 where member_id = '${U.m1}'`);
t.check("…nor what the board owes theirs to write", (!!r.error || r.affected === 0) && (await book(U.m1)).due === 0, r);
r = await t.as(U.m1, `insert into public.town_notices (member_id, kind, item, n, rest, price, at, until) values ('${U.m1}', 'sell', 'megaCatfish', 5, 5, 1, 0, 99999999999999)`);
t.check("…nor a notice theirs to write by hand", !!r.error, r);
r = await t.as(U.m1, `select town.seen_now() as r`);
t.check("…nor the rules to call", !!r.error, r);

t.section("running it again, after an admin turned a knob");
await t.sql(`update public.town_knobs set value = 20 where key = 'notice_fee'`);
const before = [await notices(), await book(U.m1), (await one(`select doc from public.town_things where key = 'seen'`)).doc];
await t.run(FILE, "v128 a third time");
t.check("run again, the file leaves the notices, the books, what the village has met and a knob an admin turned as they are",
  same([await notices(), await book(U.m1), (await one(`select doc from public.town_things where key = 'seen'`)).doc], before) && (await one(`select value from public.town_knobs where key = 'notice_fee'`)).value === 20);
await purse(U.m2, 100, []);
r = await call(U.m2, "town_notice_buy", (await notices())[0]?.id, 1);
t.check("a knob turned is the board's number at once: a fifth kept of the next thing sold", r.ok === true && (await book(U.m1)).due === 3 * 80, await book(U.m1));

await t.done();
