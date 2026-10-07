/*
 * v155 (what the whole village sells fetches less than usual: the relatives' seven usual amounts halved) tried
 * against the stand-in database as it is after v154 (stand-in.mjs's snapshot, loaded in a second, in memory: nothing
 * is written anywhere).
 *
 *   FC_REPO=<the worktree's root> node v155.test.mjs          (MIGRATION_FILE=<a file> tries that one)
 *   FC_REPO=<the worktree's root> node mutate.mjs <the draft> v155.test.mjs v155.mutations.mjs
 *
 * It reads the draft beside the worktree's copy of this file while supabase/ has no v155 (then supabase/'s, then
 * history once it has run), and the site's own rule: lib/town/market of FC_REPO, loaded here (repo-ts-town.mjs) and
 * asked the same questions as the SQL over the catalog the database itself has. The file changes seven numbers and
 * no rule, so what is held is: the numbers are the code's; nothing else is touched; and the rule that was always
 * there now answers the owner's ask, in the reckoning and through what a member calls.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";

const { REPO: root } = await import("./repo-ts-town.mjs");
const M = await import("@/lib/town/market");
const T = await import("@/lib/town/trade");

const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v155_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : existsSync(db("v155_draft.sql")) ? readFileSync(db("v155_draft.sql"), "utf8") : migration(155));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
/** Chance that is the same every time (mulberry32). */
function chance(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), of: (list) => list[Math.floor(next() * list.length)] };
}

const t0 = Date.now();
const t = await standIn();
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
// (a clock of the test's own, set before anything is read: the rounds below turn when it says)
const NOON = Date.parse("2026-10-07T12:00:00+07:00"), HOUR = 3_600_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);

const SEVEN = ["market_crop", "market_fish", "market_catch", "market_dish", "market_goods", "market_wild", "market_bug"];
const WAS = { crop: 30, fish: 15, catch: 10, dish: 15, goods: 15, wild: 15, bug: 7 }, NOW = { crop: 15, fish: 8, catch: 5, dish: 8, goods: 8, wild: 8, bug: 4 };
const knobsOf = async () => (await one(`select town.market_knobs() as k`)).k;
const thingsOf = async () => (await one(`select town.market_things(town.market_knobs()) as r`)).r;
const otherKnobs = async () => (await t.sql(`select key, value from public.town_knobs where key <> all($1::text[]) order by key`, [SEVEN])).rows;
const rulesPrint = async () => (await one(`select count(*)::int as n, md5(string_agg(p.oid::regprocedure::text || ':' || md5(p.prosrc) || ':' || coalesce(p.proacl::text, ''), ',' order by p.oid::regprocedure::text)) as h
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'town' or (n.nspname = 'public' and p.proname like 'town\\_%')`));
const marketRow = async () => (await one(`select doc from public.town_things where key = 'market'`)).doc;
const catalogPrint = async () => (await one(`select count(*)::int as n, md5(string_agg(key || ':' || md5(data::text) || ':' || updated_at::text, ',' order by key)) as h from public.town_catalog`));
/** A village's rounds through the database's own rule, with the knobs it has now: the same selling every round, from every price the usual one. Where each thing stands after each round. */
async function playedDb(rounds, heads, sale) {
  let market = M.newMarket(0);
  const seen = [];
  for (let r = 0; r < rounds; r++) {
    market = (await one(`select town.market_rolled($1::jsonb, $2::int, $3::int, town.market_things(town.market_knobs()), town.market_knobs()) as r`, [JSON.stringify({ ...market, sold: sale(r) }), r + 1, heads])).r.market;
    seen.push(market);
  }
  return seen;
}
const VILLAGE = { kangkong: 300, cabbage: 70, chili: 25 }, HEADS = 38;

t.section("before it: the complaint");
const k0 = await knobsOf(), things0 = await thingsOf(), others0 = await otherKnobs(), rules0 = await rulesPrint(), market0 = await marketRow(), catalog0 = await catalogPrint();
t.check("the seven usual amounts are as v124 and v131 left them", same(k0.usual, WAS), k0.usual);
{
  const at = (await playedDb(8, HEADS, () => VILLAGE)).at(-1).at;
  t.check("a village of 38 that leaves three hundred kangkong a round, round after round, is paid over the usual price for them", at.kangkong.f > 100 && at.chili.f === 150, [at.kangkong, at.cabbage, at.chili]);
}

t.section("v155, twice over");
await t.runTwice(FILE, "v155");
const K = await knobsOf(), things = await thingsOf();
t.check("the seven usual amounts are halved, a half that is not whole gone up", same(K.usual, NOW), K.usual);
t.check("which are the numbers the site's own code has, as every other knob of the market's is", same(K, M.MARKET), { code: M.MARKET.usual, knobs: K.usual });
t.check("every other knob of the town's is as it was", same(await otherKnobs(), others0) && others0.length > 12, (await otherKnobs()).filter((k, i) => !same(k, others0[i])));
t.check("no rule is written, dropped, or given to anybody", same(await rulesPrint(), rules0) && rules0.n > 300, [rules0, await rulesPrint()]);
t.check("the market's own row and the catalog are not touched", same(await marketRow(), market0) && same(await catalogPrint(), catalog0), [await marketRow(), await catalogPrint()]);
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes to a table with no WHERE", bare.length === 0, bare);

const cat = Object.fromEntries((await t.sql(`select key, data from public.town_catalog`)).rows.map((r) => [r.key, r.data]));
const facts = { items: cat.items, goods: cat.goods, fish: cat.fish, flotsam: cat.flotsam, crops: cat.crops, baits: cat.fishing.baits, kept: cat.fishing.kept };
const moving = M.movingOf(facts);
{
  const want = Object.fromEntries(moving.map((id) => { const x = M.thingOf(id, facts); return [id, [x.usual, x.floor, x.ceil]]; }));
  const differ = [...new Set([...Object.keys(things), ...moving])].filter((id) => !same(things[id], want[id]));
  t.check(`every thing whose price moves (${moving.length}) has the usual amount, the floor and the ceiling the site's code gives it`, moving.length > 200 && differ.length === 0, differ.slice(0, 6).map((id) => [id, things[id], want[id]]));
  const kept = moving.filter((id) => things0[id]?.[1] !== things[id][1] || things0[id]?.[2] !== things[id][2]);
  t.check("the least and the most each price is are as they were: a vegetable to two fifths, a dish not under its usual price, nothing under its cost and half again",
    kept.length === 0 && same(things.kangkong, [5, 40, 150]) && things.friedMinnow[1] === 100 && things.minnow[1] === 100, kept.slice(0, 6).map((id) => [id, things0[id], things[id]]));
  const scaled = moving.filter((id) => Math.abs(things[id][0] / things0[id][0] - NOW[cat.items[id].kind] / WAS[cat.items[id].kind]) > 1e-9);
  t.check("each usual amount is its old one by its kind's new number over the old", scaled.length === 0, scaled.slice(0, 6).map((id) => [id, things0[id], things[id]]));
}

t.section("the rule over a village's rounds: the database's reckoning and the site's own, round by round");
{
  const c = chance(20261007);
  let bad = 0, first = null, cases = 0, fell = 0, rose = 0;
  for (let run = 0; run < 8; run++) {
    const heads = c.of([10, 25, 38, 60]), often = Array.from({ length: 12 }, () => c.of(moving));
    const sales = Array.from({ length: 10 }, () => Object.fromEntries(Array.from({ length: c.int(0, 9) }, () => [c.of(often), c.int(1, 600)])));
    const got = await playedDb(10, heads, (r) => sales[r]);
    let market = M.newMarket(0);
    for (let r = 0; r < 10; r++) {
      market = M.rolled({ ...market, sold: sales[r] }, r + 1, heads, facts).market;
      cases++;
      if (!same(got[r], market)) { bad++; first ??= { run, r, heads, sold: sales[r], differ: moving.filter((id) => !same(got[r].at[id], market.at[id])).slice(0, 4).map((id) => [id, got[r].at[id], market.at[id]]) }; }
    }
    fell += Object.values(market.at).filter((s) => s.f < 100).length; rose += Object.values(market.at).filter((s) => s.f > 100).length;
  }
  t.check(`${cases} rounds of eight villages: every price where the site's code puts it, some fallen (${fell}) and some risen (${rose})`, bad === 0 && fell > 0 && rose > 0, first);
}
{
  const seen = await playedDb(8, HEADS, () => VILLAGE), at = seen.at(-1).at;
  t.check("the same village, the same three hundred kangkong a round: now more than its usual amount (190), and its price under the usual one (73 hundredths)",
    things.kangkong[0] * HEADS === 190 && at.kangkong.f === 73 && same(seen.map((m) => m.at.kangkong.f).slice(0, 4), [84, 78, 75, 74]), seen.map((m) => m.at.kangkong.f));
  t.check("…cabbages likewise (53), and chili, of which it sells little, over it still (150)", at.cabbage.f === 53 && at.chili.f === 150, [at.cabbage, at.chili]);
  const usual = (await playedDb(8, HEADS, () => ({ kangkong: 190 }))).at(-1).at;
  t.check("sold at just its usual amount, a thing keeps its usual price", usual.kangkong.f === 100, usual.kangkong);
  const dumped = (await playedDb(8, HEADS, () => ({ kangkong: 5000, friedMinnow: 500, minnow: 5000 }))).at(-1).at;
  t.check("sold beyond all measure, it falls to two fifths and no further; a dish and a minnow not at all", dumped.kangkong.f === 40 && dumped.friedMinnow.f === 100 && dumped.minnow.f === 100, [dumped.kangkong, dumped.friedMinnow, dumped.minnow]);
}

t.section("through what a member calls: a round with a great deal of one thing left to be sold");
const purse = (who, coins, bag) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))]);
const R0 = T.roundOf(NOON);
// (the market begun anew at this round, as it stood the day v124 ran: every price the usual one)
await t.sql(`update public.town_things set doc = jsonb_build_object('round', $1::int, 'at', '{}'::jsonb, 'sold', '{}'::jsonb) where key = 'market'`, [R0]);
await t.sql(`delete from public.town_market_log where true`);
await purse(U.m1, 0, [...Array(8).fill({ item: "kangkong", n: 20 }), { item: "carrot", n: 4 }]);
let r = await call(U.m1, "town_stall");
t.check("the stall tells kangkong at its usual price, between two fifths and half as much again", same(r?.prices?.things?.kangkong, { f: 100, floor: 40, ceil: 150, was: [] }), r?.prices ?? r);
for (let slot = 0; slot < 8; slot++) r = await call(U.m1, "town_leave", slot, 20);
t.check("a hundred and sixty left at the usual price, and counted as sold this round", r?.ok === true && same(r.purse.left, [{ item: "kangkong", n: 160, pays: 3, round: R0 }]) && (await marketRow()).sold.kangkong === 160, r?.purse?.left ?? r);
await clock(NOON + 8 * HOUR);   // 20:00: the evening's round
await purse(U.m2, 0, [{ item: "kangkong", n: 20 }, { item: "carrot", n: 6 }]);
r = await call(U.m2, "town_stall");
const heads = (await one(`select town.market_heads(town.market_knobs()) as h`)).h;
t.check("the round turns: kangkong, sold at three times the village's usual amount, is a quarter under its usual price (it was 83 before the file); carrot, unsold, a tenth over",
  r?.prices?.round === R0 + 1 && r.prices.things.kangkong.f === 75 && r.prices.things.carrot.f === 110 && same(r.prices.things.kangkong.was, [[R0, 100, 160]]), r?.prices ?? r);
{
  const m = await marketRow(), want = M.rolled({ round: R0, at: {}, sold: { kangkong: 160 } }, R0 + 1, heads, facts).market;
  t.check(`…and the whole market stands where the site's own rule puts it, the village counted as ${heads}`, same(m, want), Object.keys(want.at).filter((id) => !same(m.at[id], want.at[id])).slice(0, 5).map((id) => [id, m.at[id], want.at[id]]));
}
r = await call(U.m2, "town_leave", 0, 20);
t.check("a lot left now keeps this round's price", r?.ok === true && same(r.purse.left, [{ item: "kangkong", n: 20, pays: 3, round: R0 + 1, f: 75 }]), r?.purse?.left ?? r);
r = await call(U.m1, "town_collect");
t.check("what was left before the price fell is paid at the price it was left at: 160 kangkong, 480 coins", r?.ok === true && r.coins === 480, r);
await clock(NOON + 20 * HOUR);   // 08:00 the next morning
r = await call(U.m2, "town_collect");
t.check("twenty at 75 hundredths of three coins: forty-five coins", r?.ok === true && r.coins === 45 && r.purse.coins === 45, r);

t.section("running it again");
// (each of the seven turned by somebody since, to a number that is neither the old one nor the file's)
const TURNED = Object.fromEntries(Object.entries(NOW).map(([kind, n]) => [kind, n + 2]));
for (const [kind, n] of Object.entries(TURNED)) await t.sql(`update public.town_knobs set value = $2 where key = $1`, [`market_${kind}`, n]);
const market1 = await marketRow();
await t.run(FILE, "v155 a third time");
t.check("a number somebody has turned since stays turned, each of the seven, and the market is left as it stands", same((await knobsOf()).usual, TURNED) && same(await marketRow(), market1), (await knobsOf()).usual);
for (const [kind, n] of Object.entries(NOW)) await t.sql(`update public.town_knobs set value = $2 where key = $1`, [`market_${kind}`, n]);
{
  await t.sql(`delete from public.town_knobs where key = 'market_bug'`);
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("where one of the seven is not there, it stops at its first line and says why", !!stopped && /v155 needs v124/.test(stopped), stopped);
  await t.sql(`insert into public.town_knobs (key, value) values ('market_bug', 4)`);
}

t.section("what it should say afterwards (the file's closing block)");
let v = await one(`select town.market_knobs()->'usual' as usual, (select count(*)::int from public.town_knobs where key like 'market\\_%') as knobs`);
t.check("the usual amounts, and nineteen knobs of the market's", same(v, { usual: NOW, knobs: 19 }), v);
v = await one(`select town.market_things(town.market_knobs())->'kangkong' as kangkong`);
t.check("kangkong: five a head a round, two fifths at the least, half as much again at the most", same(v.kangkong, [5, 40, 150]), v);
v = await one(`select count(*) filter (where (e.value->>'f')::int < 100)::int as under, count(*) filter (where (e.value->>'f')::int = 100)::int as usual, count(*) filter (where (e.value->>'f')::int > 100)::int as over
  from public.town_things t, jsonb_each(t.doc->'at') e where t.key = 'market'`);
t.check("the reading of where prices stand counts every thing once", v.under + v.usual + v.over === moving.length && v.under >= 1, v);
v = (await t.sql(`select e.key as thing, (e.value->>1)::numeric as sold, (e.value->>0)::int as price_then, (m.doc->'at'->e.key->>'f')::int as price_now
    from public.town_market_log l, jsonb_each(l.doc) e, public.town_things m
   where l.round = (select max(round) from public.town_market_log) and m.key = 'market' and (e.value->>1)::numeric > 0
   order by (e.value->>1)::numeric * coalesce((town.cat('items')->e.key->>'pays')::numeric, 0) desc limit 20`)).rows;
t.check("the reading of what was sold most says how many, the price then and the price now", v.length === 1 && v[0].thing === "kangkong" && Number(v[0].sold) === 160 && v[0].price_then === 100 && v[0].price_now === 75, v);
v = await one(`select count(*)::int as n from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("no rule of schema town is for anybody to call", v.n === 0, v);

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
