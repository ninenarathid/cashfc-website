// v304, the coin back as a paytable, dry-run: the file runs twice (CR line ends, then LF); five rows to begin with, and
// the settings refuse any other shape; a pair pays the row its share draws, a part of the price rounded down and never
// all of it, the row's symbol on the first two reels; the shares hold over many pairs; the coins are the account's; the
// desk saves the table (and keeps it when it sends none), refuses a row worth nothing at its price, and keeps the pair's
// own amount at the table's average; the wipe of the trial takes back what each pair paid.
//   cd <the tree> && V304_BENCH=<the bench after v296, a .tar> node .claude/skills/fc-cash-town/scripts/db/v304.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v304_the_coin_back_as_a_paytable.sql");
const BENCH = process.env.V304_BENCH ?? process.env.V303_BENCH ?? process.env.V299_BENCH;
if (!BENCH) throw new Error("V304_BENCH: the bench after v296 (v297's dry run keeps one with V297_BENCH)");
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(BENCH)]) });

let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const ok = (v, what) => eq(!!v, true, what);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const as = async (who, q, a = [], role = "authenticated") => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
  try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const refused = (r, words, what) => ok(r && typeof r === "object" && "error" in r && (!words || r.error.includes(words)), `${what} (${r?.error ?? JSON.stringify(r)?.slice(0, 120)})`);
const fails = async (q, what) => ok(await db.exec(q).then(() => false, () => true), what);

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let request = 1;
const coins = async (m) => Number((await one("select coins from public.town_purses where member_id = $1", [m])).coins);
const chips = async (m) => Number((await one("select chips from public.casino_live_accounts where user_id = $1", [m]))?.chips ?? 0);
const revision = async () => Number((await one("select revision from public.casino_live_settings")).revision);
const spin = async (who, force = null) => {
  await db.exec("update public.casino_live_spins set reveal_at = now() - interval '1 second'; update public.casino_live_accounts set available_at = now() - interval '1 second'");
  return as(who, "select public.casino_live_spin($1, $2, $3, $4) r", [uuid(request++), 1, force, await revision()]);
};
const PCT = { cherry: 20, popoto: 50, gold: 150, seven: 200, evercold: 500 };

try {
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/v256-stand-in.sql"), "utf8"));
  for (const f of ["v256_ninenine_can_announce_in_town", "v297_granny_twillas_shop_and_its_auction", "v298_two_chests_on_the_farm", "v204_casino_before_the_town_hall_opens", "v206_casino_when_the_doors_open"]) {
    await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  }
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/site-prize-stand-ins.sql"), "utf8"));
  await db.exec("drop publication if exists supabase_realtime; create publication supabase_realtime for table public.casino_live_settings, public.casino_live_prizes, public.casino_live_spins, public.casino_live_receipts, public.town_casino_announcements;");
  for (const f of ["v299_the_casino_in_the_town", "v303_casino_coins_of_its_own"]) await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  // live as it stands: the pair 20% for 50, in the admins' trial
  await db.exec("update public.casino_live_prizes set name = '50 Casino Coin', amount = 50, chance = 20, active = true where id = 'pair'; update public.casino_live_settings set access = 'admins', per_player = 10000");
  await db.query("select town.purse_of($1, true)", [ADMIN]); await db.query("update public.town_purses set coins = 100000 where member_id = $1", [ADMIN]);

  // ── the file, twice ──
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  // at a price too low for the table's smallest part, it stops before anything
  await db.exec("update public.casino_live_settings set price = 4");
  ok(await db.exec(sql).then(() => false, (e) => /pays nothing/.test(e.message)), "at a price of 4 it stops: a row would pay nothing");
  await db.exec("rollback");
  await db.exec("update public.casino_live_settings set price = 100");
  // nor with coin prizes the table would tip over the price on average (110 coins at 80% and the table's 12.9)
  await db.exec("update public.casino_live_prizes set kind = 'coin', amount = 110, chance = 80 where id = 'cherry'");
  ok(await db.exec(sql).then(() => false, (e) => /the price or more/.test(e.message)), "with coin prizes it would tip over the price, it stops");
  await db.exec("rollback");
  await db.exec("update public.casino_live_prizes set kind = 'physical', amount = 0, chance = 0.04 where id = 'cherry'");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  const table = (await one("select back_table t from public.casino_live_settings")).t;
  eq(table.map((r) => [r.sym, r.pct, r.share]), [["cherry", 20, 50], ["popoto", 50, 30], ["gold", 150, 13], ["seven", 200, 5], ["evercold", 500, 2]], "five rows to begin with");
  eq(await one("select name, amount::int, chance::float, active from public.casino_live_prizes where id = 'pair'"), { name: "50 Casino Coin", amount: 50, chance: 20, active: true }, "the pair's own row left as the desk has it");
  for (const [bad, what] of [
    ['[{"sym":"cherry","pct":1001,"share":1},{"sym":"popoto","pct":20,"share":1},{"sym":"gold","pct":30,"share":1},{"sym":"seven","pct":50,"share":1},{"sym":"evercold","pct":80,"share":1}]', "a part over 1,000%"],
    ['[{"sym":"cherry","pct":0,"share":1},{"sym":"popoto","pct":20,"share":1},{"sym":"gold","pct":30,"share":1},{"sym":"seven","pct":50,"share":1},{"sym":"evercold","pct":80,"share":1}]', "a part of nothing"],
    ['[{"sym":"cherry","pct":10,"share":1},{"sym":"popoto","pct":20,"share":1},{"sym":"gold","pct":30,"share":1},{"sym":"seven","pct":50,"share":1}]', "four rows"],
    ['[{"sym":"cherry","pct":10,"share":1},{"sym":"cherry","pct":20,"share":1},{"sym":"gold","pct":30,"share":1},{"sym":"seven","pct":50,"share":1},{"sym":"evercold","pct":80,"share":1}]', "a symbol twice"],
    ['[{"sym":"cherry","pct":10,"share":0},{"sym":"popoto","pct":20,"share":0},{"sym":"gold","pct":30,"share":0},{"sym":"seven","pct":50,"share":0},{"sym":"evercold","pct":80,"share":0}]', "no shares"],
    ['[{"sym":"cherry","pct":10.5,"share":1},{"sym":"popoto","pct":20,"share":1},{"sym":"gold","pct":30,"share":1},{"sym":"seven","pct":50,"share":1},{"sym":"evercold","pct":80,"share":1}]', "a part not whole"],
    ['[{"sym":"cherry","pct":"10","share":1},{"sym":"popoto","pct":20,"share":1},{"sym":"gold","pct":30,"share":1},{"sym":"seven","pct":50,"share":1},{"sym":"evercold","pct":80,"share":1}]', "a part as words"],
  ]) await fails(`update public.casino_live_settings set back_table = '${bad}'`, `the settings refuse a table with ${what}`);
  for (const f of ["casino.back_of(jsonb,integer)", "casino.back_average(jsonb,integer)"]) eq((await one(`select has_function_privilege('authenticated', '${f}', 'execute') r`)).r, false, `nobody calls ${f}`);

  // ── pairs, forced in the trial, many ──
  await as(ADMIN, "select public.casino_live_buy($1, $2) r", [uuid(90000), 60000]);
  const c0 = await chips(ADMIN), N = 400, seen = {};
  let paid = 0, bad = [];
  for (let i = 0; i < N; i++) {
    const r = await spin(ADMIN, "pair");
    const p = r?.prize;
    if (!p) { bad.push(r); continue; }
    seen[p.sym] = (seen[p.sym] ?? 0) + 1; paid += Number(p.amount);
    if (Number(p.amount) !== PCT[p.sym] || p.pct !== PCT[p.sym] || p.name !== `${PCT[p.sym]} Casino Coin` || r.reels[0] !== p.sym || r.reels[1] !== p.sym || r.reels[2] === p.sym || r.reels[3] === p.sym) bad.push(r);
  }
  eq(bad.length, 0, `every pair pays its row: a part of the price, its symbol on the first two, neither of the others (${JSON.stringify(bad[0] ?? null)?.slice(0, 200)})`);
  ok((seen.gold ?? 0) + (seen.seven ?? 0) + (seen.evercold ?? 0) > 0, "some pairs pay more than the price");
  eq(await chips(ADMIN), c0 - N * 100 + paid, "the account pays the price and gets back what the row says");
  const share = (s) => (seen[s] ?? 0) / N;
  ok(share("cherry") > 0.4 && share("cherry") < 0.6, `cherry about 50 in 100 (${share("cherry")})`);
  ok(share("popoto") > 0.2 && share("popoto") < 0.4, `popoto about 30 in 100 (${share("popoto")})`);
  ok(share("evercold") < 0.06, `evercold seldom (${share("evercold")})`);
  ok(Object.keys(seen).length >= 4, `the rows all come up (${JSON.stringify(seen)})`);
  eq((await one("select issued from public.casino_live_prizes where id = 'pair'")).issued, N, "each pair counted once");

  // ── the desk ──
  const doc = async (patch, drop = []) => {
    const s = await as(ADMIN, "select public.casino_live_state() r");
    const d = { ...s.settings, ...patch, prizes: s.prizes }; for (const k of drop) delete d[k];
    return as(ADMIN, "select public.casino_live_save($1, $2) r", [s.settings.revision, JSON.stringify(d)]);
  };
  const t2 = [{ sym: "cherry", pct: 15, share: 50 }, { sym: "popoto", pct: 25, share: 25 }, { sym: "gold", pct: 35, share: 15 }, { sym: "seven", pct: 60, share: 8 }, { sym: "evercold", pct: 90, share: 2 }];
  ok((await doc({ back_table: t2 }))?.settings, "the desk saves a table");
  eq((await one("select back_table t from public.casino_live_settings")).t.map((r) => r.pct), [15, 25, 35, 60, 90], "kept");
  eq((await one("select amount::int a from public.casino_live_prizes where id = 'pair'")).a, Math.round((50 * 15 + 25 * 25 + 15 * 35 + 8 * 60 + 2 * 90) / 100), "the pair's own amount is the table's average at the price");
  ok((await doc({}, ["back_table"]))?.settings, "a desk from before v304 saves");
  eq((await one("select back_table t from public.casino_live_settings")).t.map((r) => r.pct), [15, 25, 35, 60, 90], "and leaves the table as it was");
  refused(await doc({ back_table: t2.map((r, i) => i ? r : { ...r, pct: 1001 }) }), "Invalid coin back table", "a part over 1,000% is refused at the desk");
  ok((await doc({ back_table: t2.map((r, i) => i ? r : { ...r, pct: 300 }) }))?.settings, "a row over the price saves while the coins back average under it");
  ok((await doc({ back_table: t2 }))?.settings, "and the table before it again");
  refused(await doc({ price: 5 }), "at least 1 Casino Coin", "a price where a row pays nothing is refused");
  ok((await doc({ price: 7 }))?.settings, "a price where every row pays a coin saves");
  const p7 = await spin(ADMIN, "pair");
  ok(Number(p7?.prize?.amount) >= 1 && Number(p7?.prize?.amount) < 7, `at 7 a pair pays 1 to 6 (${p7?.prize?.amount})`);
  ok((await doc({ price: 100, back_table: table }))?.settings, "back to the first table");
  // the sum of coins back reads the pair at the table's exact average (22.3), not its rounded amount (22)
  await db.exec("update public.casino_live_prizes set kind = 'coin', amount = 200, chance = 49.11 where id = 'cherry'; update public.casino_live_prizes set chance = 8 where id = 'pair'");
  const old = [{ sym: "cherry", pct: 10, share: 40 }, { sym: "popoto", pct: 20, share: 30 }, { sym: "gold", pct: 30, share: 18 }, { sym: "seven", pct: 50, share: 9 }, { sym: "evercold", pct: 80, share: 3 }];
  refused(await doc({ back_table: old }), "Coins paid back", "coins back of 100.004 a spin at a price of 100 are refused");
  // (and the house is ahead on the table as it stands: 20% x 64.5 = 12.9 coins back of 100)
  refused(await doc({ back_table: table.map((r) => ({ ...r, pct: r.pct * 8 > 1000 ? 1000 : r.pct * 8 })) }), "Coins paid back", "a table paying back the price or more on average is refused");
  await db.exec("update public.casino_live_prizes set kind = 'physical', amount = 0, chance = 0.04 where id = 'cherry'; update public.casino_live_prizes set chance = 20 where id = 'pair'");

  // ── the wipe takes back what each pair paid ──
  const w = await as(ADMIN, "select public.casino_live_wipe_tests() r");
  eq(Number(w?.spins), N + 1, "every pair of the trial wiped");
  eq([await coins(ADMIN), await chips(ADMIN)], [100000, 0], "the Popoto coins back, the trial's Casino Coins gone");
  eq((await one("select issued from public.casino_live_prizes where id = 'pair'")).issued, 0, "and the pair's count");
} finally {
  await db.close();
}
console.log(`${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
