// v334, the auction's rounds close together, dry-run: the file runs twice (CRLF as checked out on Windows, and LF); its
// "afterwards" queries; two rounds closing at the same minute stay together through late bids (a bid on either, a bid
// moving away from one), each never past its own hard close, never shortened; a round far off, one not yet open and one
// settled are left alone; the page's twin (lib/town/auction's closeTogether) agrees; once they close, both settle in one
// look and a winner of one cannot bid on the other; the coins add up; anon and a stranger refused.
// The bench is any PGlite dump with v297 in it (V334_BENCH; the one after v326 was used).
//   cd <the tree> && FC_REPO=<the tree> V334_BENCH=<dump> node .claude/skills/fc-cash-town/scripts/db/v334.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
await import("./repo-ts-town.mjs");
const AU = await import("@/lib/town/auction");

const REPO = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? resolve(REPO, "supabase/v334_the_auction_closes_together.sql");
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const ok = (v, what) => eq(!!v, true, what);
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
if (!process.env.V334_BENCH) throw new Error("V334_BENCH: a PGlite dump with v297 in it");
const db = new PGlite({ loadDataDir: new Blob([readFileSync(process.env.V334_BENCH)]) });
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
// seconds from now to a round's close (each query is its own moment: a second either way is the same)
const leftOf = async (id) => Number((await one("select extract(epoch from closes_at - now())::int s from public.town_auctions where id = $1", [id])).s);
const near = (s, want) => Math.abs(s - want) <= 2;

try {
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);

  // ── what it should say afterwards ──
  eq((await one("select position('x.closes_at > now()' in prosrc) > 0 as r from pg_proc where proname = 'town_bid'")).r, true, "together: true");
  const { bareWrites } = await import("./bare-writes.mjs");
  eq((await bareWrites((q) => rows(q))).filter((f) => JSON.stringify(f).includes("town_bid")), [], "town_bid has no UPDATE or DELETE without a WHERE");
  eq(await one("select has_function_privilege('anon', 'public.town_bid(bigint, integer, uuid)', 'execute') as anon, has_function_privilege('authenticated', 'public.town_bid(bigint, integer, uuid)', 'execute') as members"), { anon: false, members: true }, "anon may not bid, members may");

  // (four who may play: town.member() refuses an unproved character or none, 42501)
  const players = [];
  for (const { id } of await rows("select p.id from public.profiles p order by p.id")) {
    const b = await asOf(id)("select public.town_auctions() r");
    if (Array.isArray(b?.auctions)) players.push(id);
  }
  const [m1, m2, m3, m4] = players;
  eq(players.length >= 4, true, "four members who may bid");
  for (const m of [m1, m2, m3, m4]) await setCoins(m, 100000);
  const sum0 = (await Promise.all([m1, m2, m3, m4].map(coinsOf))).reduce((n, c) => n + c, 0);
  // rounds of our own (designs nobody has), opened an hour ago unless told
  let k = 0;
  const roundOf = async (closesIn, hardIn, opensIn = -3600, settled = false) => Number((await one(`insert into public.town_auctions (design, wearables, run, copies, start_price, step_pct, step_min, opens_at, closes_at, hard_close, settled_at)
    values ($1, array[$1], 1, 2, 1000, 5, 500, now() + make_interval(secs => $2), now() + make_interval(secs => $3), now() + make_interval(secs => $4), case when $5 then now() - interval '1 day' end) returning id`, [`vtogether${'abcdefghijklmnop'[k++]}`, opensIn, closesIn, hardIn, settled])).id);
  const closeIn = (id, s, hard) => db.query("update public.town_auctions set closes_at = now() + make_interval(secs => $2), hard_close = now() + make_interval(secs => $3) where id = $1", [id, s, hard]);
  const on = (rid) => (who, amount, req) => asOf(who)("select public.town_bid($1, $2, $3) r", [rid, amount, req]);
  // the other rounds in the bench (the seeded Halloween pair) are long settled; anything else open would be moved too
  await db.query("update public.town_auctions set closes_at = least(closes_at, now() - interval '1 day'), hard_close = least(hard_close, now() - interval '1 day') where settled_at is null");
  await asOf(m1)("select public.town_auctions() r");

  const A = await roundOf(1800, 3600), B = await roundOf(1800, 3600);
  const far = await roundOf(3 * 86400, 3 * 86400 + 3600), notYet = await roundOf(240, 3600, 60), done = await roundOf(-86400, -86000, -90000, true);
  const farLeft = await leftOf(far), notYetLeft = await leftOf(notYet), doneAt = (await one("select closes_at::text c from public.town_auctions where id = $1", [done])).c;

  // ── a bid before the last five minutes moves nothing ──
  let r = await on(A)(m1, 1000, uuid(1));
  eq([r.ok, near(await leftOf(A), 1800), near(await leftOf(B), 1800)], [true, true, true], "an early bid leaves both closes");

  // ── a late bid on one moves both, to five minutes on; the far one, the one not open yet and the settled one stay ──
  await closeIn(A, 120, 1800); await closeIn(B, 120, 1800);
  r = await on(B)(m2, 1000, uuid(2));
  eq([r.ok, near(await leftOf(A), 300), near(await leftOf(B), 300)], [true, true, true], "a late bid on B moves A's close and B's alike");
  eq((await one("select (select closes_at from public.town_auctions where id = $1) = (select closes_at from public.town_auctions where id = $2) r", [A, B])).r, true, "to the very same moment");
  eq([near(await leftOf(far), farLeft), near(await leftOf(notYet), notYetLeft), (await one("select closes_at::text c from public.town_auctions where id = $1", [done])).c], [true, true, doneAt], "a round days off, one not open yet and one settled are not moved");
  r = await on(A)(m3, 1000, uuid(3));
  eq([r.ok, near(await leftOf(A), 300), near(await leftOf(B), 300)], [true, true, true], "and again from a late bid on A");

  // ── a close later than five minutes on is never shortened ──
  await closeIn(A, 120, 1800); await closeIn(B, 900, 1800);
  r = await on(A)(m4, 1500, uuid(4));   // (A is full: a step over the lowest, m3 pushed out and paid back)
  eq([r.ok, near(await leftOf(A), 300), near(await leftOf(B), 900)], [true, true, true], "B's later close kept");

  // ── a bid moving away from a round in its last five minutes moves them all, as a bid there would ──
  // (m1's bid stands on A; B closes in 20 minutes, A in 2)
  await closeIn(A, 120, 1800); await closeIn(B, 1200, 1800);
  r = await on(B)(m1, 1500, uuid(5));
  eq([r.ok, Number(r.from?.id), near(await leftOf(A), 300), near(await leftOf(B), 1200)], [true, A, true, true], "leaving A late moves A's close; B's later one kept");

  // ── never past each one's own hard close ──
  await closeIn(A, 120, 180); await closeIn(B, 120, 1800);
  r = await on(A)(m2, 2000, uuid(6));
  eq([r.ok, near(await leftOf(A), 180), near(await leftOf(B), 300)], [true, true, true], "A stops at its hard close, B goes on to five minutes");

  // ── the page's twin, case for case on the same rounds ──
  {
    const H = 3600_000, base = { design: "x", wearables: ["x"], run: 1, copies: 2, start: 1000, stepPct: 5, stepMin: 500, opensAt: 0 };
    const a = { ...base, id: 1, closesAt: 2 * 60_000, hardClose: 3 * 60_000 }, b = { ...base, id: 2, closesAt: 2 * 60_000, hardClose: 30 * 60_000 }, f = { ...base, id: 3, closesAt: 72 * H, hardClose: 73 * H };
    eq(AU.closeTogether([a, b, f], a, 0).map((x) => x.closesAt), [3 * 60_000, 5 * 60_000, 72 * H], "lib/town/auction's closeTogether: the hard close, five minutes on, the far one");
  }

  // ── the hole v334 closes: once both close (together), both settle in one look and the winner of one cannot bid on the other ──
  const C = await roundOf(120, 1800), D = await roundOf(120, 1800);
  r = await on(C)(m3, 5000, uuid(7));   // m3 holds a copy of C, quietly
  r = await on(D)(m4, 1500, uuid(8));   // a late bid on D (m4's, moved from A at its sum)
  eq((await one("select (select closes_at from public.town_auctions where id = $1) = (select closes_at from public.town_auctions where id = $2) r", [C, D])).r, true, "C's close went with D's");
  // (time passes: their one close is now behind us)
  await db.query("update public.town_auctions set closes_at = now() - interval '1 second', hard_close = greatest(hard_close, now()) where id in ($1, $2)", [C, D]);
  const board = await asOf(m1)("select public.town_auctions() r");
  const settledBoth = await rows("select settled_at from public.town_auctions where id in ($1, $2)", [C, D]);
  eq([settledBoth.every((x) => !!x.settled_at), new Set(settledBoth.map((x) => String(x.settled_at))).size], [true, 1], "both settled in the same look");
  ok(Array.isArray(board?.auctions), "the board still answers");
  r = await on(D)(m3, 9000, uuid(9));
  eq([r.ok, r.why], [false, "closed"], "C's winner cannot bid on D");
  eq((await one("select count(*)::int n from public.town_dressed where member_id = $1 and how = 'auction' and wearable in ((select design from public.town_auctions where id = $2), (select design from public.town_auctions where id = $3))", [m3, C, D])).n, 1, "m3 has one set, C's");

  // ── the coins add up through all of it: out of the purses = held by bids + paid for copies won ──
  const held = Number((await one("select coalesce(sum(b.amount), 0)::int s from public.town_bids b join public.town_auctions a on a.id = b.auction_id where a.design like 'vtogether%'")).s);
  eq((await Promise.all([m1, m2, m3, m4].map(coinsOf))).reduce((n, c) => n + c, 0) + held, sum0, "coins out of purses = coins held");
  eq((await rows("select b.member_id from public.town_bids b join public.town_auctions a on a.id = b.auction_id where a.settled_at is null group by b.member_id having count(*) > 1")).length, 0, "nobody's bid stands on two open rounds");

  // ── anon and a stranger ──
  eq(await asOf(null, "anon")("select public.town_bid($1, 9000, $2) r", [A, uuid(40)]).then((x) => !!x?.why?.startsWith("error")), true, "anon cannot bid");
  eq(await asOf(uuid(999))("select public.town_bid($1, 9000, $2) r", [A, uuid(41)]).then((x) => x?.ok !== true), true, "a stranger cannot bid");
} catch (e) {
  failed++; console.log("  THREW", e?.message ?? e);
} finally {
  console.log(`v334: ${checks} checks, ${failed} failed`);
  await db.close();
  if (failed) process.exitCode = 1;
  process.exit();
}
