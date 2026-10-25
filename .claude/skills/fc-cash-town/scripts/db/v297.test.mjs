// v297, Granny Twilla's shop and its auction, dry-run: the file runs twice (as checked out on Windows, CR at its line
// ends, and as written); the shop's chat zone; a look of version 7 in the announcements' faces; the catalog's `tailor`
// row against lib/town/tailor; a member buying (charged once, a request retried answered once, a thing had or out of
// season or too dear refused); the auction against lib/town/auction case by case (a free copy at the start, a step
// over the lowest held one, a tie to the first, the one pushed out paid back whole at once, a raise paying only the
// difference, a bid in the last minutes moving the close but never past the hard one, a design had already refused,
// a closed round refused), the settling (copies numbered best first, bound with their round, the coins gone), the
// coins of everybody concerned adding up, and anon and a stranger refused everything.
//   cd <the tree> && FC_REPO=<the tree> V297_BENCH=<a scratch file> node .claude/skills/fc-cash-town/scripts/db/v297.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { TAILOR } = await import("@/lib/town/tailor");
const AU = await import("@/lib/town/auction");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v297_granny_twillas_shop_and_its_auction.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const ok = (v, what) => eq(!!v, true, what);
// the realtime schema v293 needs, as its own dry run made it
const REALTIME = `
 create schema if not exists realtime;
 grant usage on schema realtime to anon, authenticated;
 create table if not exists realtime.messages (id bigint generated always as identity primary key, extension text not null);
 alter table realtime.messages enable row level security;
 grant select, insert on realtime.messages to anon, authenticated;
 create or replace function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;`;
// (the bench as it is after v296, kept between runs: V297_BENCH, built once from the replay when it is not there)
const CACHE = process.env.V297_BENCH;
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
let db;
if (CACHE && existsSync(CACHE)) db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
else {
  db = await rewardDB(252);
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  await db.exec(REALTIME);
  // (the town's rooms and their topics, v101 and v102, which the stand-in leaves out and v293 stands on: as v293's own dry run)
  const { migration } = await import(pathToFileURL(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "pglite-harness.mjs")).href);
  for (const n of [101, 102]) try { await db.exec(migration(n, { repo: process.env.FC_REPO ?? process.cwd() })); } catch (e) { console.log(`  (v${n}: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  for (let n = 276; n <= 296; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { console.log(`  (v${n} did not replay here: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  }
  if (CACHE) writeFileSync(CACHE, Buffer.from(await (await db.dumpDataDir("none")).arrayBuffer()));
}
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const asOf = (who, role = "authenticated") => async (q, a = []) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
  try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { ok: false, why: `error ${e.code}` }; } finally { await db.exec("reset role"); }
};
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const coinsOf = async (m) => Number((await one("select coins from public.town_purses where member_id = $1", [m]))?.coins ?? NaN);
const setCoins = async (m, c) => { await db.query("select town.purse_of($1, true)", [m]); await db.query("update public.town_purses set coins = $2 where member_id = $1", [m, c]); };

try {
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);

  // ── what it should say afterwards ──
  eq((await one("select count(*)::int n from pg_policies where schemaname = 'realtime' and policyname in ('town_maps_receive', 'town_maps_send') and (coalesce(qual, '') || coalesce(with_check, '')) like '%shop%'")).n, 2, "both map policies name the shop");
  eq((await one("select pg_get_constraintdef(oid) d from pg_constraint where conname = 'town_dressed_how_check'")).d.includes("'auction'"), true, "a thing may be had by auction");
  eq((await one("select count(*)::int n from pg_proc where prosrc like '%^(5[0-9a-z]{7}|6[0-9a-z]{12})$%'")).n, 0, "no function keeps the version-6-only test");
  const faces = await one("select pg_get_constraintdef(oid) d from pg_constraint where conname = 'town_announcement_faces_look_check'");
  if (faces) eq(faces.d.includes("7[0-9a-z]{17}"), true, "the faces take a look of version 7");
  eq((await one("select data d from public.town_catalog where key = 'tailor'")).d, JSON.parse(JSON.stringify(TAILOR)), "the catalog's tailor row is lib/town/tailor's");
  eq((await one("select (select count(*)::int from jsonb_object_keys(data)) n from public.town_catalog where key = 'tailor'")).n, 40, "forty things on her rails");
  eq((await rows("select design, run, copies, start_price from public.town_auctions order by id")).map((r) => [r.design, r.run, r.copies, r.start_price]), [["count", 1, 3, 8000], ["pumpkin", 1, 3, 8000]], "the first round's two designs");
  eq((await one("select to_char(closes_at at time zone 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') c from public.town_auctions where design = 'count'")).c, "2026-10-31 21:00", "closes Saturday 21:00 Bangkok");
  eq((await one("select has_function_privilege('anon', 'public.town_bid(bigint,integer,uuid)', 'execute') or has_function_privilege('anon', 'public.town_tailor_buy(text,uuid)', 'execute') or has_function_privilege('anon', 'public.town_auctions()', 'execute') r")).r, false, "anon may call none of it");
  eq((await one("select has_table_privilege('authenticated', 'public.town_bids', 'select') or has_table_privilege('authenticated', 'public.town_auctions', 'select') or has_table_privilege('anon', 'public.town_bids', 'select') r")).r, false, "the tables are closed to browsers");

  // ── the season, as lib/town/tailor's inSeason ──
  for (const [d, id] of [["2026-10-01 00:30+07", "skeleton"], ["2026-11-02 23:30+07", "batclip"], ["2026-11-03 00:30+07", "ghostcap"], ["2026-09-30 23:59+07", "batpendant"], ["2026-12-25 12:00+07", "knit"], ["2026-06-01 12:00+07", "pearls"]]) {
    const ms = Date.parse(d.replace(" ", "T").replace("+07", "+07:00"));
    const want = (await import("@/lib/town/tailor")).inSeason(TAILOR[id], ms) ? TAILOR[id].price : null;
    eq((await one("select town.tailor_price($1, $2::timestamptz) r", [id, d])).r, want, `${id} on ${d}`);
  }
  eq((await one("select town.tailor_price('witch', now()) r")).r, null, "not on her rails");

  // ── a member buys ──
  const ids = (await rows("select p.id from public.profiles p order by p.id")).map((r) => r.id);
  const [m1, m2, m3] = ids;
  const buy = (who, w, req) => asOf(who)("select public.town_tailor_buy($1, $2) r", [w, req]);
  await setCoins(m1, 5000);
  let r = await buy(m1, "knit", uuid(1));
  eq([r.ok, r.price, await coinsOf(m1)], [true, 1200, 3800], "bought: coins out");
  eq((await one("select how from public.town_dressed where member_id = $1 and wearable = 'knit'", [m1])).how, "shop", "into the wardrobe, bought");
  r = await buy(m1, "knit", uuid(1));
  eq([r.ok, r.repeated, await coinsOf(m1)], [true, true, 3800], "a request retried is answered once, charged once");
  r = await buy(m1, "knit", uuid(2));
  eq([r.ok, r.why, await coinsOf(m1)], [false, "known", 3800], "had already");
  r = await buy(m1, "pearls", uuid(3));
  eq([r.ok, r.why, await coinsOf(m1)], [false, "coins", 3800], "too dear");
  r = await buy(m1, "witch", uuid(4));
  eq([r.ok, r.why], [false, "none"], "not hers to sell");
  r = await buy(m1, "Knit; drop", uuid(5));
  eq([r.ok, r.why], [false, "none"], "a strange id");
  r = await buy(m1, "beach", uuid(1));
  eq([r.ok, r.why, await coinsOf(m1)], [false, "none", 3800], "a request's id for another thing is no request");
  eq(await asOf(null, "anon")("select public.town_tailor_buy('beach', $1) r", [uuid(6)]).then((x) => !!x?.why?.startsWith("error")), true, "anon cannot buy");
  eq(await asOf(uuid(999))("select public.town_tailor_buy('beach', $1) r", [uuid(7)]).then((x) => x?.ok !== true), true, "a stranger cannot buy");

  // ── the auction, a round of our own, open now ──
  const round = async (copies, start, opensAgo, closesIn, hardIn) => (await one(`insert into public.town_auctions (design, wearables, run, copies, start_price, step_pct, step_min, opens_at, closes_at, hard_close)
    values ('fox' || repeat('x', (select count(*)::int from public.town_auctions)), array['party', 'tophat'], 1, $1, $2, 5, 500, now() - make_interval(secs => $3), now() + make_interval(secs => $4), now() + make_interval(secs => $5)) returning id`, [copies, start, opensAgo, closesIn, hardIn])).id;
  const id = Number(await round(2, 1000, 3600, 3600, 7200));
  const bid = (who, amount, req) => asOf(who)("select public.town_bid($1, $2, $3) r", [id, amount, req]);
  for (const m of [m1, m2, m3]) await setCoins(m, 20000);
  const before = (await coinsOf(m1)) + (await coinsOf(m2)) + (await coinsOf(m3));
  // the page's own rule, run beside the database's at each step
  const roundTs = { id, design: "x", wearables: ["party"], run: 1, copies: 2, start: 1000, stepPct: 5, stepMin: 500, opensAt: 0, closesAt: Date.now() + 3600e3, hardClose: Date.now() + 7200e3 };
  let ts = [];
  const tsBid = (m, amount) => { const p = AU.placeBid(roundTs, ts, { id: m, name: m, coins: 1e9, owns: false }, amount, Date.now()); if (p.ok) ts = p.bids; return p; };
  r = await bid(m1, 999, uuid(11));
  eq([r.ok, r.why, r.least, tsBid(m1, 999).ok], [false, "low", 1000, false], "under the start");
  r = await bid(m1, 1000, uuid(12)); tsBid(m1, 1000);
  eq([r.ok, r.pay, await coinsOf(m1)], [true, 1000, 19000], "a free copy at the start: paid and held");
  r = await bid(m2, 1000, uuid(13)); tsBid(m2, 1000);
  eq([r.ok, await coinsOf(m2)], [true, 19000], "the second copy at the start too");
  r = await bid(m3, 1000, uuid(14));
  eq([r.ok, r.why, r.least, AU.minBid(roundTs, ts, m3)], [false, "low", 1500, 1500], "both held: the lowest and a step (500)");
  r = await bid(m3, 1500, uuid(15)); tsBid(m3, 1500);
  eq([r.ok, await coinsOf(m3), await coinsOf(m2), await coinsOf(m1)], [true, 18500, 20000, 19000], "the later of the two at 1000 pushed out, paid back whole at once");
  eq((await rows("select member_id from public.town_bids where auction_id = $1 order by amount desc, at", [id])).map((x) => x.member_id), [m3, m1], "the bids that stand");
  eq(ts.map((b) => b.member), [m3, m1], "the page's rule agrees");
  r = await bid(m1, 1000, uuid(16));
  eq([r.ok, r.why, r.least], [false, "low", 1001], "holding a copy, a raise need only be more than one's own");
  r = await bid(m1, 1200, uuid(24)); tsBid(m1, 1200);
  eq([r.ok, r.pay, await coinsOf(m1)], [true, 200, 18800], "a raise pays only the difference");
  r = await bid(m1, 3000, uuid(17)); tsBid(m1, 3000);
  eq([r.ok, r.pay, await coinsOf(m1)], [true, 1800, 17000], "and again");
  r = await bid(m1, 3000, uuid(17));
  eq([r.ok, r.repeated, await coinsOf(m1)], [true, true, 17000], "a bid retried is answered once");
  r = await bid(m2, 1999, uuid(18));
  eq([r.ok, r.why, r.least, AU.minBid(roundTs, ts, m2)], [false, "low", 2000, 2000], "the lowest held is 1500: the least is 1500 and its step");
  const least2 = AU.minBid(roundTs, ts, m2);
  r = await bid(m2, least2, uuid(19)); tsBid(m2, least2);
  eq([r.ok, await coinsOf(m3)], [true, 20000], "m3 pushed out, paid back");
  eq(r.auction.bids.map((b) => [b.amount, b.mine]), ts.map((b) => [b.amount, b.member === m2]), "the board as the member sees it: amounts, names and only their own marked");
  ok(r.auction.bids.every((b) => typeof b.name === "string" && !("member" in b)), "no bidder's id on the board");
  // the stakes add up: what is held in bids is what left the three purses
  const held = Number((await one("select sum(amount)::int s from public.town_bids where auction_id = $1", [id])).s);
  eq((await coinsOf(m1)) + (await coinsOf(m2)) + (await coinsOf(m3)) + held, before, "coins out of purses = coins held in bids");
  // a design had already
  await db.query("insert into public.town_dressed (member_id, wearable, how) values ($1, 'party', 'shop') on conflict do nothing", [m3]);
  r = await bid(m3, 50000, uuid(20));
  eq([r.ok, r.why, await coinsOf(m3)], [false, "known", 20000], "whoever has the design may not bid on it");
  await db.query("delete from public.town_dressed where member_id = $1 and wearable = 'party'", [m3]);
  // the last five minutes
  await db.query("update public.town_auctions set closes_at = now() + interval '2 minutes', hard_close = now() + interval '4 minutes' where id = $1", [id]);
  r = await bid(m3, 5000, uuid(21));
  const close = await one("select extract(epoch from closes_at - now())::int s, extract(epoch from hard_close - closes_at)::int h from public.town_auctions where id = $1", [id]);
  eq([r.ok, close.h], [true, 0], "a bid in the last five minutes moves the close, never past the hard close");
  r = await bid(m3, 6000, uuid(22));
  eq(r.ok, true, "a raise of one's own in the last minutes");
  // closed
  await db.query("update public.town_auctions set closes_at = now() - interval '1 second', hard_close = now() - interval '1 second' where id = $1", [id]);
  const standing = (await rows("select member_id, amount from public.town_bids where auction_id = $1 order by amount desc, at", [id])).map((x) => [x.member_id, x.amount]);
  const coinsBefore = [await coinsOf(m1), await coinsOf(m2), await coinsOf(m3)];
  const board = await asOf(m1)("select public.town_auctions() r");
  const mine = board.auctions.find((a) => Number(a.id) === id);
  ok(mine && mine.settledAt, "settled by whoever looks next");
  eq(mine.owners.map((o) => [o.member, o.edition]), standing.map(([m], i) => [m, i + 1]), "copies numbered best first");
  eq((await rows("select member_id, wearable, how, run, edition from public.town_dressed where how = 'auction' and wearable in ('party', 'tophat') order by edition, wearable")).length, 4, "the outfit and what goes with it, for each copy");
  eq([await coinsOf(m1), await coinsOf(m2), await coinsOf(m3)], coinsBefore, "winners' coins stay gone; nobody is paid at the close");
  r = await bid(m2, 99999, uuid(23));
  eq([r.ok, r.why], [false, "closed"], "a closed round takes nothing");
  const again = await asOf(m1)("select public.town_auctions() r");
  eq((await rows("select count(*)::int n from public.town_dressed where how = 'auction' and wearable = 'party'"))[0].n, 2, "settled once");
  const wardrobe = await asOf(standing[0][0])("select public.town_dressed() r");
  eq(wardrobe.limited.party, [1, 1], "the wardrobe says the round and the number");
  ok(again.auctions.length >= 3, "the first round's two and ours");

  // a round settled by a member's wardrobe alone, with one bid
  const id2 = Number(await round(3, 1000, 3600, 3600, 3600));
  await asOf(m2)("select public.town_bid($1, 1000, $2) r", [id2, uuid(30)]);
  await db.query("update public.town_auctions set closes_at = now() - interval '1 second', hard_close = now() - interval '1 second' where id = $1", [id2]);
  await asOf(m2)("select public.town_dressed() r");
  ok((await one("select settled_at from public.town_auctions where id = $1", [id2])).settled_at, "the wardrobe settles a round nobody looked at");
  // anon and a stranger
  eq(await asOf(null, "anon")("select public.town_auctions() r").then((x) => !!x?.why?.startsWith("error")), true, "anon reads no board");
  eq(await asOf(uuid(999))("select public.town_bid(1, 9000, $1) r", [uuid(40)]).then((x) => x?.ok !== true), true, "a stranger cannot bid");
  eq(await asOf(m1)("select count(*)::int r from public.town_bids").then((x) => typeof x === "object" && !!x?.why), true, "a member reads no bid table");
} finally {
  console.log(`v297: ${checks} checks, ${failed} failed`);
  await db.close();
  if (failed) process.exitCode = 1;
}
