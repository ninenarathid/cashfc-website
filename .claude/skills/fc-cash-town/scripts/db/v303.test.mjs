// v303, Casino Coin, dry-run: the file runs twice (CR line ends, then LF); a spin takes Casino Coins, never the purse's
// Popoto coins; Popoto coins change into Casino Coins at the rate, one way, once a request, nothing else in the purse
// moving; free coins once a town day; the pair pays Casino Coins and is left to the desk; both let in
// only when a spin is; the desk saves the rate and the free coins; the admins' trial wiped of its coins changed and
// taken too, a spin of it from before v303 given back in Popoto coins and one after in Casino Coins; anon and a member
// refused what is not theirs.
//   cd <the tree> && V303_BENCH=<the bench after v296, a .tar> node .claude/skills/fc-cash-town/scripts/db/v303.test.mjs
// (the same bench as v299's and v300's dry runs)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v303_casino_coins_of_its_own.sql");
const BENCH = process.env.V303_BENCH ?? process.env.V299_BENCH;
if (!BENCH) throw new Error("V303_BENCH: the bench after v296 (v297's dry run keeps one with V297_BENCH)");
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(BENCH)]) });

let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const ok = (v, what) => eq(!!v, true, what);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
/** A call as somebody: what it returned, or { error } with the database's words. */
const as = async (who, q, a = [], role = "authenticated") => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
  try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const refused = (r, words, what) => ok(r && typeof r === "object" && "error" in r && (!words || r.error.includes(words)), `${what} (${r?.error ?? JSON.stringify(r)?.slice(0, 120)})`);

const ADMIN = "00000000-0000-0000-0000-00000000000a", M1 = "00000000-0000-0000-0000-000000000001", M2 = "00000000-0000-0000-0000-000000000002";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let request = 1;
const coins = async (m) => Number((await one("select coins from public.town_purses where member_id = $1", [m])).coins);
const chips = async (m) => Number((await one("select chips from public.casino_live_accounts where user_id = $1", [m]))?.chips ?? 0);
const revision = async () => Number((await one("select revision from public.casino_live_settings")).revision);
const spin = async (who, force = null, machine = 1) => {
  await db.exec("update public.casino_live_spins set reveal_at = now() - interval '1 second'; update public.casino_live_accounts set available_at = now() - interval '1 second'");
  return as(who, "select public.casino_live_spin($1, $2, $3, $4) r", [uuid(request++), machine, force, await revision()]);
};
const buy = (who, n, req = uuid(request++)) => as(who, "select public.casino_live_buy($1, $2) r", [req, n]);
const free = (who) => as(who, "select public.casino_live_free() r");
const access = (to) => db.query("update public.casino_live_settings set access = $1, open = ($1 = 'everyone')", [to]);

try {
  // ── the bench as live stands: v256, v297, v298, the casino's files and v299 as they ran ──
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/v256-stand-in.sql"), "utf8"));
  for (const f of ["v256_ninenine_can_announce_in_town", "v297_granny_twillas_shop_and_its_auction", "v298_two_chests_on_the_farm", "v204_casino_before_the_town_hall_opens", "v206_casino_when_the_doors_open"]) {
    await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  }
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/site-prize-stand-ins.sql"), "utf8"));
  await db.exec("drop publication if exists supabase_realtime; create publication supabase_realtime for table public.casino_live_settings, public.casino_live_prizes, public.casino_live_spins, public.casino_live_receipts, public.town_casino_announcements;");
  await db.exec(readFileSync(join(ROOT, "supabase/v299_the_casino_in_the_town.sql"), "utf8"));
  for (const m of [ADMIN, M1, M2]) { await db.query("select town.purse_of($1, true)", [m]); await db.query("update public.town_purses set coins = 10000 where member_id = $1", [m]); }
  await db.exec("update public.town_purses set doc = jsonb_set(doc, '{bag}', '[{\"item\":\"worm\",\"n\":3}]') where member_id in ('" + ADMIN + "', '" + M1 + "')");
  const bagOf = async (m) => ((await one("select doc -> 'bag' b from public.town_purses where member_id = $1", [m])).b ?? []).filter(Boolean);
  const bag0 = await bagOf(ADMIN);

  // the admins' trial already under way before v303, as live has it: a spin paid in Popoto coins
  await access("admins");
  ok((await spin(ADMIN, "miss"))?.id, "a trial spin before v303");
  eq(await coins(ADMIN), 9900, "paid in Popoto coins");
  const rev0 = await revision();

  // ── the file, twice ──
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  eq(await one("select chip_rate, free_chips from public.casino_live_settings"), { chip_rate: 1, free_chips: 100 }, "a Casino Coin a Popoto coin, 100 free a day");
  eq(await one("select active, chance::float from public.casino_live_prizes where id = 'pair'"), { active: false, chance: 0 }, "the pair left as the desk has it");
  eq(await revision(), rev0, "the settings' revision as it was");
  // (the pair set going as the desk, or the service key on the owner's word, will do it: 20% for 100 Casino Coin)
  await db.exec("update public.casino_live_prizes set name = '100 Casino Coin', amount = 100, chance = 20, active = true where id = 'pair'");
  eq(await chips(ADMIN), 0, "nobody has Casino Coins yet");
  eq(await coins(ADMIN), 9900, "and no purse moved");
  for (const f of ["casino_live_buy(uuid,integer)", "casino_live_free()"]) {
    eq((await one(`select has_function_privilege('anon', 'public.${f}', 'execute') r`)).r, false, `anon may not call ${f}`);
    eq((await one(`select has_function_privilege('authenticated', 'public.${f}', 'execute') r`)).r, true, `a member may call ${f}`);
  }
  eq((await one("select has_table_privilege('authenticated', 'public.casino_live_chip_moves', 'select') r")).r, false, "nobody reads the moves");
  eq((await one("select has_function_privilege('authenticated', 'casino.chips_let_in(public.casino_live_settings)', 'execute') r")).r, false, "the gate is the database's own");
  ok((await as(null, "select public.casino_live_free() r", [], "anon"))?.error, "anon is refused");

  // ── let in only when a spin is ──
  eq((await buy(M1, 100))?.why, "closed", "a member may not change coins in the admins' trial");
  eq((await free(M1))?.why, "closed", "nor take the free ones");
  eq(await coins(M1), 10000, "and the member's purse is as it was");
  refused(await spin(ADMIN), "Not enough Casino coins", "a spin with Popoto coins only is refused");
  eq(await coins(ADMIN), 9900, "and takes no Popoto coins");

  // ── changing coins ──
  const req = uuid(9000);
  const got = await buy(ADMIN, 500, req);
  eq([got?.ok, Number(got?.chips), Number(got?.coins)], [true, 500, 9400], "500 Casino Coins for 500 Popoto coins");
  eq([await chips(ADMIN), await coins(ADMIN)], [500, 9400], "both held");
  eq(await bagOf(ADMIN), bag0, "the rest of the purse untouched");
  const again = await buy(ADMIN, 500, req);
  eq([again?.ok, Number(again?.chips), await coins(ADMIN)], [true, 500, 9400], "the same request again changes nothing");
  eq((await buy(ADMIN, 700, req))?.why, "amount", "the same request for another amount is refused");
  for (const [n, what] of [[0, "nothing"], [100001, "over a hundred thousand"], [null, "no amount"]]) eq((await buy(ADMIN, n))?.why, "amount", `${what} is refused`);
  eq((await buy(ADMIN, 20000))?.why, "coins", "more than the purse holds is refused");
  eq([await chips(ADMIN), await coins(ADMIN)], [500, 9400], "and nothing moved");
  eq((await one("select kind, chips, coins::int, test from public.casino_live_chip_moves where request = $1", [req])), { kind: "buy", chips: 500, coins: 500, test: true }, "the change kept, a test");

  // ── the free coins ──
  const f1 = await free(ADMIN);
  eq([f1?.ok, Number(f1?.chips), f1?.given], [true, 600, 100], "100 free");
  eq((await free(ADMIN))?.why, "taken", "once a day");
  eq(await chips(ADMIN), 600, "not twice");
  const st = await as(ADMIN, "select public.casino_live_state() r");
  eq([Number(st?.account?.chips), st?.account?.free_today, Number(st?.account?.coins), st?.settings?.chip_rate, st?.settings?.free_chips], [600, true, 9400, 1, 100], "the state says the coins, the free ones taken, the purse, the rate");
  eq((await one("select count(*)::int n from public.casino_live_chip_moves where kind = 'free' and day is not null")).n, 1, "the free coins kept with their day");

  // ── spins in Casino Coins ──
  const pair = await spin(ADMIN, "pair");
  eq([pair?.prize?.id, pair?.reels?.[0] === pair?.reels?.[1]], ["pair", true], "the pair");
  eq([await chips(ADMIN), await coins(ADMIN)], [600, 9400], "its 100 back in Casino Coins, the purse untouched");
  ok((await one("select (trail ->> 'chips')::boolean c from public.casino_live_spins where id = $1", [pair.id])).c, "the spin's trail says Casino Coins");
  await spin(ADMIN, "miss");
  eq([await chips(ADMIN), await coins(ADMIN)], [500, 9400], "a miss takes 100 Casino Coins");
  const gil = await spin(ADMIN, "popoto");
  eq([gil?.prize?.kind, await chips(ADMIN)], ["gil", 400], "a Gil win takes its price too");

  // ── the desk ──
  const doc = async (patch) => {
    const s = await as(ADMIN, "select public.casino_live_state() r");
    const d = { ...s.settings, ...patch, prizes: s.prizes };
    return as(ADMIN, "select public.casino_live_save($1, $2) r", [s.settings.revision, JSON.stringify(d)]);
  };
  ok((await doc({ chip_rate: 3, free_chips: 0 }))?.settings, "the desk saves the rate and the free coins");
  eq(await one("select chip_rate, free_chips from public.casino_live_settings"), { chip_rate: 3, free_chips: 0 }, "kept");
  refused(await doc({ chip_rate: 0 }), "Invalid settings", "a rate of nothing is refused");
  refused(await doc({ free_chips: 100001 }), "Invalid settings", "too many free coins are refused");
  {
    const s = await as(ADMIN, "select public.casino_live_state() r");
    const d = { ...s.settings, prizes: s.prizes }; delete d.chip_rate; delete d.free_chips;
    ok((await as(ADMIN, "select public.casino_live_save($1, $2) r", [s.settings.revision, JSON.stringify(d)]))?.settings, "a desk from before v303 saves");
    eq(await one("select chip_rate, free_chips from public.casino_live_settings"), { chip_rate: 3, free_chips: 0 }, "and leaves both as they were");
  }
  eq((await free(M2))?.why, "closed", "still closed to members");
  const r3 = await buy(ADMIN, 10);
  eq([Number(r3?.chips), await coins(ADMIN)], [410, 9370], "at 3 a coin, 10 cost 30");
  await db.exec("update public.casino_live_settings set free_chips = 0");
  await access("everyone");
  eq((await free(M1))?.why, "off", "free coins turned off");
  await db.exec("update public.casino_live_prizes set chance = 60, amount = 200 where id = 'pair'");
  refused(await doc({}), "Coins paid back", "coins back of a spin as much as its price are refused (the free coins would spin for ever)");
  await db.exec("update public.casino_live_prizes set chance = 20, amount = 100 where id = 'pair'");
  await access("admins");

  // ── the trial wiped: the coins changed and taken too ──
  const w = await as(ADMIN, "select public.casino_live_wipe_tests() r");
  eq([w?.spins, w?.moves], [4, 3], "four spins and three moves wiped");
  eq(await coins(ADMIN), 10000, "every Popoto coin back: the spin before v303 and the coins changed");
  eq(await chips(ADMIN), 0, "the Casino Coins of the trial gone");
  eq(await bagOf(ADMIN), bag0, "the rest of the purse untouched");
  eq((await one("select spins from public.casino_live_accounts where user_id = $1", [ADMIN])).spins, 0, "the count of spins back");
  eq((await one("select count(*)::int n from public.casino_live_chip_moves")).n, 0, "the moves gone");
  ok((await free(ADMIN))?.why === "off", "(free coins still off)");
  await db.exec("update public.casino_live_settings set free_chips = 100");
  eq((await free(ADMIN))?.ok, true, "the trial's free coins wiped, today's may be taken again");
  eq((await as(ADMIN, "select public.casino_live_wipe_tests() r"))?.moves, 1, "a wipe of moves alone");
  eq(await chips(ADMIN), 0, "and its coins gone");

  // ── open to everyone: nothing of it is a test ──
  await access("everyone");
  const bag1 = await bagOf(M1);
  eq((await buy(M1, 300))?.ok, true, "a member changes coins");
  eq((await free(M1))?.ok, true, "and takes the free ones");
  eq([await chips(M1), await coins(M1)], [400, 10000 - 900], "at the rate of 3");
  eq(await bagOf(M1), bag1, "the member's bag untouched");
  ok((await spin(M1))?.id, "and spins with them");
  eq(await chips(M1) <= 400, true, "paid in Casino Coins");
  eq((await one("select count(*)::int n from public.casino_live_chip_moves where test")).n, 0, "nothing a test");
  eq((await as(ADMIN, "select public.casino_live_wipe_tests() r"))?.spins, 0, "the wipe finds nothing");
  ok(await chips(M1) > 0, "and leaves the member's coins alone");
  await access("closed");
  eq((await buy(M1, 1))?.why, "closed", "closed: no change");
  eq((await free(M2))?.why, "closed", "closed: no free coins");
} finally {
  await db.close();
}
console.log(`${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
