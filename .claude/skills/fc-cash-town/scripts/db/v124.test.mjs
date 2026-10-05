/*
 * v124 — the relatives' price moves: dry run in PGlite.
 *
 * v124 adds the market (its knobs, its row, town_market_log, the rules that move a price) and writes five functions
 * again: v106's town.leave and town.collect (a lot keeps the round's price, and is paid by it), v121's town_leave and
 * town_take_back (the price, and what is left counted as sold), and town_stall (the prices of what I hold).
 *
 * v105 to v122 are replayed as they ran, then v123 (its draft, until it has run), then v124 twice. The rules are held
 * to the site's own code directly: lib/town/market is loaded here (repo-ts-town.mjs) and asked the same questions as
 * the SQL, over the catalog the database itself has, so that a thing the code knows and the database does not yet
 * (another session's, not shipped) cannot make them differ.
 *
 *   node v124.test.mjs
 *   node mutate.mjs v124_draft.sql v124.test.mjs v124.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

await import("./repo-ts-town.mjs");
const M = await import("@/lib/town/market");
const T = await import("@/lib/town/trade");

const here = (name) => new URL(`./${name}`, import.meta.url);
const draft = (n) => (existsSync(here(`v${n}_draft.sql`)) ? readFileSync(here(`v${n}_draft.sql`), "utf8") : migration(n));
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : draft(124);

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
await t.run(draft(123), "v123");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const NOON = Date.parse("2026-10-05T12:00:00+07:00"), HOUR = 3_600_000, ROUND = 12 * HOUR;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
await t.runTwice(FILE, "v124");

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
/** Chance that is the same every time (mulberry32). */
function chance(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), of: (list) => list[Math.floor(next() * list.length)], maybe: (p) => next() < p };
}

/* ── the rules, held to the site's own code over the database's own catalog ── */

const cat = Object.fromEntries((await t.sql(`select key, data from public.town_catalog`)).rows.map((r) => [r.key, r.data]));
const facts = { items: cat.items, goods: cat.goods, fish: cat.fish, flotsam: cat.flotsam, crops: cat.crops, baits: cat.fishing.baits, kept: cat.fishing.kept };
const K = (await one(`select town.market_knobs() as k`)).k;
const moving = M.movingOf(facts);

t.section("the rules, as the site's own code answers them over this database's catalog");
t.check("the knobs come to the numbers the site's code has", same(K, M.MARKET), K);
{
  const things = (await one(`select town.market_things($1::jsonb) as r`, [JSON.stringify(K)])).r;
  const want = Object.fromEntries(moving.map((id) => { const x = M.thingOf(id, facts); return [id, [x.usual, x.floor, x.ceil]]; }));
  const differ = [...new Set([...Object.keys(things), ...moving])].filter((id) => !same(things[id], want[id]));
  t.check(`every thing whose price moves (${moving.length}), with its usual amount, its floor and its ceiling`, moving.length > 100 && differ.length === 0, differ.slice(0, 6).map((id) => [id, things[id], want[id]]));
  t.check("what the uncle sells, a tool, a seed and a scroll have one price", ["worm", "rod", "seedKangkong", "rice", "scrollFriedMinnow", "bowl"].every((id) => !(id in things)), Object.keys(things).filter((id) => id in cat.goods));
  t.check("a vegetable falls to two fifths, a minnow not at all, a dish not at all; the first tier rises to 150", same(things.kangkong, [10, 40, 150]) && things.minnow[1] === 100 && things.friedMinnow[1] === 100 && things.megaCatfish[2] === 115, [things.kangkong, things.minnow, things.friedMinnow, things.megaCatfish]);
  // other knobs, other numbers: the same in both
  const k2 = { ...M.MARKET, floor: 55, made: 90, margin: 220, ceil: [180, 140, 120], usual: { ...M.MARKET.usual, crop: 44, fish: 9 } };
  const things2 = (await one(`select town.market_things($1::jsonb) as r`, [JSON.stringify(k2)])).r;
  const want2 = Object.fromEntries(M.movingOf(facts, k2).map((id) => { const x = M.thingOf(id, facts, k2); return [id, [x.usual, x.floor, x.ceil]]; }));
  t.check("…and with every knob turned", same(things2, want2), Object.keys(want2).filter((id) => !same(things2[id], want2[id])).slice(0, 5).map((id) => [id, things2[id], want2[id]]));
}
{
  const c = chance(20261005);
  let bad = 0, first = null;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const usual = c.of([0.5, 3, 10, 47.5, 250, 1234.5]), floor = c.of([40, 40, 55, 73, 100]), ceil = c.of([115, 130, 150]);
    const st = { f: c.int(floor, ceil), m: usual * c.of([0, 0.01, 0.3, 1, 1, 2.5, 9, 40]) * (c.maybe(0.5) ? 1 : c.next() * 2) };
    const sold = c.maybe(0.3) ? 0 : Math.round(usual * c.next() * c.of([1, 3, 30])), k = c.maybe(0.8) ? M.MARKET : { ...M.MARKET, fall: c.of([10, 50]), rise: c.of([5, 30]), memory: c.of([20, 100]), bend: c.of([40, 100]) };
    const want = M.next(st, sold, usual, floor, ceil, k);
    const got = (await t.db.query(`select town.market_next($1::jsonb, $2::float8, $3::float8, $4::float8, $5::float8, $6::jsonb) as r`, [JSON.stringify(st), sold, usual, floor, ceil, JSON.stringify(k)])).rows[0].r;
    if (!same(got, want)) { bad++; first ??= { st, sold, usual, floor, ceil, want, got }; }
  }
  t.check(`a round on, for one thing: ${N} cases`, bad === 0, first);
}
{
  const c = chance(42), things = (await one(`select town.market_things($1::jsonb) as r`, [JSON.stringify(K)])).r;
  let bad = 0, first = null, cases = 0, fell = 0, rose = 0, logged = 0;
  for (let run = 0; run < 12; run++) {
    const heads = c.of([10, 25, 60]);
    let market = M.newMarket(41_000 + run * 100), round = market.round;
    for (let step = 0; step < 10; step++) {
      for (let i = 0, n = c.int(0, 8); i < n; i++) market = M.counted(market, c.of(moving), c.int(1, 900));
      round += c.of([1, 1, 1, 2, 5, 40]);
      const want = M.rolled(market, round, heads, facts);
      const got = (await t.db.query(`select town.market_rolled($1::jsonb, $2::int, $3::int, $4::jsonb, $5::jsonb) as r`, [JSON.stringify(market), round, heads, JSON.stringify(things), JSON.stringify(K)])).rows[0].r;
      cases++;
      if (!same(got.market, want.market) || !same(got.log, want.log)) { bad++; first ??= { round, heads, sold: market.sold, want: JSON.stringify(want).slice(0, 500), got: JSON.stringify(got).slice(0, 500) }; }
      market = want.market;
      logged += want.log.length;
      fell += Object.values(market.at).filter((s) => s.f < 100).length; rose += Object.values(market.at).filter((s) => s.f > 100).length;
    }
    // (within a round nothing moves)
    const stay = (await t.db.query(`select town.market_rolled($1::jsonb, $2::int, 25, $3::jsonb, $4::jsonb) as r`, [JSON.stringify(market), round, JSON.stringify(things), JSON.stringify(K)])).rows[0].r;
    if (!same(stay, { market, log: [] })) { bad++; first ??= { stay }; }
  }
  t.check(`the market brought to a round: ${cases} villages' rounds, prices fallen (${fell}) and risen (${rose}), ${logged} rounds written down`, bad === 0 && fell > 0 && rose > 0, first);
}
{
  // a lot keeps its price, and is paid by it: the rules of the stall, with a price
  const c = chance(7), NOW = NOON;
  let bad = 0, first = null, cases = 0;
  for (let i = 0; i < 400; i++) {
    let purse = { ...T.newPurse(), coins: c.int(0, 50), bag: [{ item: "kangkong", n: 20 }, { item: "catfish", n: 6 }, { item: "worm", n: 9 }, { item: "rod", n: 1 }, null, null, null, null, null, null] };
    for (let step = 0, n = c.int(1, 6); step < n; step++) {
      const slot = c.of([0, 0, 1, 2, 3, 4, -1]), many = c.of([1, 2, 5, 25, 0]), f = c.of([100, 100, 87, 40, 150, 63]), now = NOW + c.of([0, 0, ROUND, 2 * ROUND]);
      const want = T.leave(purse, slot, many, now, f);
      const got = (await t.db.query(`select town.leave($1::jsonb, $2::int, $3::int, $4::bigint, $5::int) as r`, [JSON.stringify(purse), slot, many, now, f])).rows[0].r;
      cases++;
      if (!same(got, want)) { bad++; first ??= { purse, slot, many, f, want, got }; }
      if (want.ok) purse = want.purse;
    }
    const at = NOW + c.of([ROUND, 2 * ROUND, 3 * ROUND]), want = T.collect(purse, at);
    const got = (await t.db.query(`select town.collect($1::jsonb, $2::bigint) as r`, [JSON.stringify(purse), at])).rows[0].r;
    cases++;
    if (!same(got, want)) { bad++; first ??= { purse, at, want, got }; }
  }
  t.check(`a lot left at a price, and what it fetches: ${cases} cases`, bad === 0, first);
  // (with the old rule left beside the new, the database cannot tell which is meant: said here, not died of)
  const plain = await t.db.query(`select town.leave($1::jsonb, 0, 3, $2::bigint) as r`, [JSON.stringify({ ...T.newPurse(), bag: [{ item: "kangkong", n: 5 }] }), NOW]).then((q) => q.rows[0].r, (e) => ({ died: e.message }));
  t.check("asked with no price, a lot is left at the usual one, as before", plain.ok === true && same(plain.purse.left, [{ item: "kangkong", n: 3, pays: 3, round: T.roundOf(NOW) }]), plain);
}

/* ── what is written again ───────────────────────────────────────────────── */

t.section("each function written again is the one it replaces, word for word but for the lines meant");
const lf = (s) => s.split("\r\n").join("\n");
const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5)); };
const held = (name, was, ...lines) => {
  const old = words(was, name), now = words(FILE, name);
  let want = old, found = !!old;
  for (let i = 0; found && i < lines.length; i += 2) { found = want.split(lines[i]).length === 2; want = want.replace(lines[i], () => lines[i + 1]); }
  t.check(`${name} is as it last ran, but for the lines meant`, !!old && !!now && old !== now && found && want === now,
    !old ? "not found before" : !now ? "not in the file" : !found ? "a line meant is not in the old text" : "it differs elsewhere");
};
/** The newest text of a function among the files that ran before this one. */
const lastOf = (name) => { for (let n = 122; n >= 105; n--) { const sql = migration(n); if (words(sql, name)) return sql; } return ""; };
held("town.leave", lastOf("town.leave"),
  "create or replace function town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint)", "create or replace function town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint, p_f integer default 100)",
  "and (lots->i->>'pays')::int = pays then same := i; exit; end if;", "and (lots->i->>'pays')::int = pays\n       and coalesce((lots->i->>'f')::int, 100) = coalesce(p_f, 100) then same := i; exit; end if;",
  "    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur));",
  "    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur)\n      || case when coalesce(p_f, 100) = 100 then '{}'::jsonb else jsonb_build_object('f', p_f) end);");
held("town.collect", lastOf("town.collect"),
  "  select coalesce(sum((l->>'n')::int * (l->>'pays')::int) filter (where (l->>'round')::int < cur), 0)::int,",
  "  select floor(coalesce(sum((l->>'n')::int * (l->>'pays')::int * coalesce((l->>'f')::int, 100)) filter (where (l->>'round')::int < cur), 0) / 100.0)::int,");
held("public.town_leave", lastOf("public.town_leave"),
  "  did jsonb := town.leave(purse, p_slot, p_n, town.now_ms());",
  "  -- (the round's price for the thing: the market is brought to this round if it has turned)\n  f integer := town.factor_of(town.market_now(), purse->'bag'->p_slot->>'item');\n  did jsonb := town.leave(purse, p_slot, p_n, town.now_ms(), f);",
  "perform town.note(me, 'leave', purse->'bag'->p_slot->>'item', p_n); end if;",
  "perform town.note(me, 'leave', purse->'bag'->p_slot->>'item', p_n, 0,\n    case when f = 100 then '{}'::jsonb else jsonb_build_object('f', f) end); end if;\n  -- (what is left is counted as sold this round, for the next round's price)\n  if (did->>'ok')::boolean then perform town.market_count(purse->'bag'->p_slot->>'item', p_n); end if;",
  "  return town.answer(me, did);", "  return town.answer(me, did) || jsonb_build_object('prices', town.prices_told(me));");
held("public.town_take_back", lastOf("public.town_take_back"),
  "    perform town.note(me, 'take_back', lot->>'item', (lot->>'n')::numeric);\n  end if;",
  "    perform town.note(me, 'take_back', lot->>'item', (lot->>'n')::numeric);\n    -- (taken back in the round it was left in, it was not sold)\n    if (lot->>'round')::int = town.round_of(town.now_ms()) then perform town.market_count(lot->>'item', -(lot->>'n')::int); end if;\n  end if;",
  "  return town.answer(me, did);", "  return town.answer(me, did) || jsonb_build_object('prices', town.prices_told(me));");
held("public.town_stall", lastOf("public.town_stall"), "    'found', town.thing('found', false),", "    'found', town.thing('found', false),\n    'prices', town.prices_told(me),");

/* ── the closing block ───────────────────────────────────────────────────── */

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select count(*)::int as n from public.town_knobs where key like 'market\\_%'`);
t.check("nineteen knobs", v.rows[0].n === 19, v.rows);
v = await t.sql(`select (t.doc->>'round')::int as round, t.doc->'at' as at, (select c.relrowsecurity from pg_class c where c.oid = 'public.town_market_log'::regclass) as closed,
    (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name = 'town_market_log' and grantee in ('anon', 'authenticated')) as grants
  from public.town_things t where t.key = 'market'`);
t.check("the market begins this round with every price the usual one, and its log is a closed book", same(v.rows[0], { round: T.roundOf(NOON), at: {}, closed: true, grants: 0 }), v.rows);
v = await t.sql(`select (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as rules_open,
    (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and p.proname = 'leave') as leaves, has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules`);
t.check("the rules are nobody's in a browser, and there is one rule for leaving a thing", same(v.rows[0], { rules_open: 0, leaves: 1, member_has_rules: false }), v.rows);
v = await t.sql(`select count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member, count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon, count(*)::int as n
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_leave', 'town_take_back', 'town_stall')`);
t.check("leaving, taking back and the stall are a member's, and nobody's signed out", same(v.rows[0], { member: 3, anon: 0, n: 3 }), v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const purse = (who, coins, bag) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))]);
const market = async () => (await one(`select doc from public.town_things where key = 'market'`)).doc;
const logs = async () => (await t.sql(`select round, doc from public.town_market_log order by round`)).rows;
const R0 = T.roundOf(NOON);
/** What the page was told, against the site's own telling of the same market, the same rounds written down, and what the same member holds. */
const asTheSiteTells = async (who, prices) => {
  const doc = (await one(`select doc from public.town_purses where member_id = $1`, [who])).doc;
  const held = [...doc.bag.filter(Boolean).map((x) => x.item), ...(doc.left ?? []).map((x) => x.item)];
  const want = M.pricesTold(await market(), (await logs()).map((x) => [x.round, x.doc]), held, facts);
  return { ok: held.length > 0 && same(prices, want), got: prices, want };
};

t.section("a round with a great deal of one thing left to be sold");
await purse(U.m1, 0, [...Array(8).fill({ item: "kangkong", n: 20 }), { item: "worm", n: 5 }, { item: "carrot", n: 4 }]);
let r = await call(U.m1, "town_stall");
t.check("the stall tells the price of what I hold whose price moves, and of nothing else", same(Object.keys(r.prices.things).sort(), ["carrot", "kangkong"]) && r.prices.round === R0, r.prices);
t.check("…each at its usual price, with its floor and its ceiling, and nothing yet behind it", same(r.prices.things.kangkong, { f: 100, floor: 40, ceil: 150, was: [] }), r.prices.things.kangkong);
for (let slot = 0; slot < 8; slot++) r = await call(U.m1, "town_leave", slot, 20);
t.check("a hundred and sixty left: each lot at the usual price, as a lot was before (no price written beside it)", r.ok === true && same(r.purse.left, [{ item: "kangkong", n: 160, pays: 3, round: R0 }]), r.purse.left);
t.check("…and counted as sold this round", (await market()).sold.kangkong === 160 && (await market()).round === R0, await market());
r = await call(U.m1, "town_leave", 8, 5);
t.check("what the uncle sells is left at its one price, and is no part of the market", r.ok === true && !("f" in r.purse.left.at(-1)) && !("worm" in r.prices.things) && (await market()).at.worm === undefined, [r.purse.left, r.prices.things]);
r = await call(U.m1, "town_take_back", 1);
t.check("worms taken back", r.ok === true && r.purse.left.length === 1, r.purse.left);
v = await t.sql(`select thing, n::int as n, doc from public.town_deeds where member_id = $1 and what = 'leave' order by id desc limit 1`, [U.m1]);
t.check("a lot left at the usual price is written down as it was before", v.rows[0].thing === "worm" && !("f" in v.rows[0].doc), v.rows);

t.section("the round turns");
await clock(NOON + 8 * HOUR);   // 20:00: the evening's round
await purse(U.m2, 0, [{ item: "kangkong", n: 20 }, { item: "carrot", n: 6 }, { item: "catfish", n: 3 }]);
r = await call(U.m2, "town_stall");
t.check("the first to come moves the market on: kangkong, sold at more than the village's usual, is down; what nobody sold is up a tenth",
  r.prices.round === R0 + 1 && r.prices.things.kangkong.f === 83 && r.prices.things.carrot.f === 110 && r.prices.things.catfish.f === 110, r.prices.things);
t.check("…with the round that ended behind each: its price then, and how many were sold", same(r.prices.things.kangkong.was, [[R0, 100, 160]]) && same(r.prices.things.carrot.was, [[R0, 100, 0]]), r.prices.things);
let l = await logs();
t.check("the round that ended is written down: what was sold, at the price it had", l.length === 1 && l[0].round === R0 && same(l[0].doc, { kangkong: [100, 160] }), l);
t.check("the market is of the new round, with nothing sold in it yet", (await market()).round === R0 + 1 && same((await market()).sold, {}));
{
  const m = await market(), want = M.rolled({ round: R0, at: {}, sold: { kangkong: 160 } }, R0 + 1, 10, facts).market;
  t.check("…and stands where the site's own rule puts it, the village counted as ten", same(m, want), Object.keys(want.at).filter((id) => !same(m.at[id], want.at[id])).slice(0, 5));
}
r = await call(U.m2, "town_leave", 0, 20);
t.check("a lot left now keeps this round's price", r.ok === true && same(r.purse.left, [{ item: "kangkong", n: 20, pays: 3, round: R0 + 1, f: 83 }]), r.purse.left);
v = await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'leave' order by id desc limit 1`, [U.m2]);
t.check("…written down with it", v.rows[0].doc.f === 83, v.rows);
r = await call(U.m2, "town_leave", 1, 6);
t.check("carrots at a tenth more", r.ok === true && r.purse.left.at(-1).f === 110, r.purse.left);
r = await call(U.m2, "town_take_back", 1);
t.check("taken back in the round they were left in, they were not sold", r.ok === true && (await market()).sold.carrot === 0 && (await market()).sold.kangkong === 20, await market());
r = await call(U.m1, "town_collect");
t.check("what was left before the price moved is paid at the usual price: 160 kangkong, 480 coins", r.ok === true && r.coins === 480 && r.purse.coins === 480, r);

t.section("the next round: paid by the price each lot was left at, in whole coins");
await clock(NOON + 20 * HOUR);   // 08:00 the next morning
r = await call(U.m2, "town_collect");
t.check("twenty at 83 hundredths of three coins: forty-nine coins, the odd part lost", r.ok === true && r.coins === 49 && r.purse.coins === 49, r);
r = await call(U.m2, "town_stall");
t.check("kangkong, sold little, turns back up; carrot, still unsold, is up another tenth", r.prices.things.carrot.f === 121 && r.prices.things.catfish.f === 121 && (await market()).at.kangkong.f > 83, [r.prices.things, (await market()).at.kangkong]);
t.check("the graph has the two rounds that ended, the oldest first", same(r.prices.things.carrot.was, [[R0, 100, 0], [R0 + 1, 110, 0]]), r.prices.things.carrot.was);
{
  const told = await asTheSiteTells(U.m2, r.prices);
  t.check("what a member is told of prices is what the site's own rule tells of them", told.ok, told);
}
l = await logs();
t.check("each round is written down once", same(l.map((x) => x.round), [R0, R0 + 1]) && same(l[1].doc.kangkong, [83, 20]) && same(l[1].doc.carrot, [110, 0]), l.map((x) => [x.round, x.doc.kangkong, x.doc.carrot]));

t.section("a long while with nobody at the stall");
await clock(NOON + 20 * HOUR + 60 * ROUND);
r = await call(U.m2, "town_stall");
l = await logs();
t.check("the market is moved through as many rounds as it takes everything to settle, each written down, and no more", l.length === 2 + 28 && r.prices.things.carrot.f === 150 && r.prices.things.catfish.f === 150 && r.prices.round === R0 + 2 + 60, [l.length, r.prices.things.carrot]);
t.check("the graph is of the last seven days only", r.prices.things.carrot.was.length <= 14, r.prices.things.carrot.was.length);
{
  const told = await asTheSiteTells(U.m2, r.prices);
  t.check("…and after a long while too, when no round of the last seven days was written down", told.ok, told);
}
await purse(U.guest, 0, [{ item: "megaCatfish", n: 1 }, { item: "friedMinnow", n: 2 }, { item: "minnow", n: 9 }]);
r = await call(U.guest, "town_stall");
t.check("a great fish rises no higher than its tier's ceiling; what is cooked rises like the first tier; neither can fall under its floor", r.prices.things.megaCatfish.f === 115 && r.prices.things.friedMinnow.f === 150
  && r.prices.things.friedMinnow.floor === 100 && r.prices.things.minnow.floor === 100, r.prices.things);
r = await call(U.guest, "town_leave", 0, 1);
await clock(NOON + 20 * HOUR + 61 * ROUND);
r = await call(U.guest, "town_collect");
t.check("the great fish fetches 115 hundredths of 800", r.ok === true && r.coins === 920, r);

t.section("who is counted, and who may");
v = await t.sql(`select town.market_heads(town.market_knobs()) as heads`);
t.check("the village is counted as ten at the least", v.rows[0].heads === 10, v.rows);
for (const who of [U.m1, U.m2, U.guest]) await t.sql(`insert into public.town_deeds (member_id, at, what) values ($1, to_timestamp(town.now_ms() / 1000.0) - interval '1 day', 'hold'), ($1, to_timestamp(town.now_ms() / 1000.0) - interval '2 days', 'hold')`, [who]);
await t.sql(`insert into public.town_deeds (member_id, at, what) values ($1, to_timestamp(town.now_ms() / 1000.0) - interval '8 days', 'hold')`, [U.admin]);
await t.sql(`update public.town_knobs set value = 2 where key = 'market_heads'`);
v = await t.sql(`select town.market_heads(town.market_knobs()) as heads`);
t.check("…and otherwise as whoever has done anything in the town in the last seven days, each once", v.rows[0].heads === 3, v.rows);
await t.sql(`update public.town_knobs set value = 10 where key = 'market_heads'`);
r = await t.as(null, `select public.town_stall() as r`);
t.check("somebody signed out is refused the stall", !!r.error, r);
r = await t.as(U.m1, `select * from public.town_market_log`);
t.check("the log is no member's to read", !!r.error || r.rows.length === 0, r);
r = await t.as(U.m1, `select town.market_now() as r`);
t.check("…nor the rules to call", !!r.error, r);
r = await t.as(U.m1, `update public.town_things set doc = jsonb_set(doc, '{at,kangkong}', '{"f": 150, "m": 1}') where key = 'market'`);
t.check("…nor the market to write", !!r.error || r.affected === 0, r);

t.section("running it again, after an admin turned a knob");
await t.sql(`update public.town_knobs set value = 55 where key = 'market_floor'`);
const before = await market();
await t.run(FILE, "v124 a third time");
t.check("run again, the file leaves the market, its log and a knob an admin turned as they are", same(await market(), before) && (await logs()).length === l.length
  && (await one(`select value from public.town_knobs where key = 'market_floor'`)).value === 55, await market());
v = await t.sql(`select (town.market_things(town.market_knobs())->'kangkong'->>1)::int as floor`);
t.check("a knob turned is the market's number at once: nothing falls under 55 hundredths", v.rows[0].floor === 55, v.rows);

await t.done();
