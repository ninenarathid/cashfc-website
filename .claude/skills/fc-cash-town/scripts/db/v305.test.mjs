// v305, ten machines, one player each, popoto at the counter, dry-run: the file runs twice (CR line ends, then LF); a
// spin takes machine 1 to 10; sitting down or spinning holds a machine, one a player, and another is refused it until
// the holder has been idle a minute; popoto change at the counter with no week's limit, into Popoto coins or Casino
// Coins, spent in the bank's own book (on a week it never counts) so they are spent once, a retry changing nothing.
//   cd <the tree> && V305_BENCH=<the bench after v296, a .tar> node .claude/skills/fc-cash-town/scripts/db/v305.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v305_ten_machines_one_player_each.sql");
const BENCH = process.env.V305_BENCH ?? process.env.V304_BENCH ?? process.env.V299_BENCH;
if (!BENCH) throw new Error("V305_BENCH: the bench after v296 (v297's dry run keeps one with V297_BENCH)");
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

const ADMIN = "00000000-0000-0000-0000-00000000000a", M1 = "00000000-0000-0000-0000-000000000001", M2 = "00000000-0000-0000-0000-000000000002";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let request = 1;
const coins = async (m) => Number((await one("select coins from public.town_purses where member_id = $1", [m])).coins);
const chips = async (m) => Number((await one("select chips from public.casino_live_accounts where user_id = $1", [m]))?.chips ?? 0);
const revision = async () => Number((await one("select revision from public.casino_live_settings")).revision);
const spin = async (who, machine, force = null) => {
  await db.exec("update public.casino_live_spins set reveal_at = now() - interval '1 second'; update public.casino_live_accounts set available_at = now() - interval '1 second'");
  return as(who, "select public.casino_live_spin($1, $2, $3, $4) r", [uuid(request++), machine, force, await revision()]);
};
const sit = (who, machine) => as(who, "select public.casino_live_seat($1) r", [machine]);
const change = (who, n, to, req = uuid(request++)) => as(who, "select public.casino_live_popoto($1, $2, $3) r", [req, n, to]);
const left = async (m) => Number((await one("select profile_left l from public.town_popoto_left($1)", [m])).l);

try {
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/v256-stand-in.sql"), "utf8"));
  for (const f of ["v256_ninenine_can_announce_in_town", "v297_granny_twillas_shop_and_its_auction", "v298_two_chests_on_the_farm", "v204_casino_before_the_town_hall_opens", "v206_casino_when_the_doors_open"]) {
    await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  }
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/site-prize-stand-ins.sql"), "utf8"));
  await db.exec("drop publication if exists supabase_realtime; create publication supabase_realtime for table public.casino_live_settings, public.casino_live_prizes, public.casino_live_spins, public.casino_live_receipts, public.town_casino_announcements;");
  for (const f of ["v299_the_casino_in_the_town", "v303_casino_coins_of_its_own", "v304_the_coin_back_as_a_paytable"]) await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  await db.exec("update public.casino_live_settings set access = 'everyone', open = true, per_player = 10000");
  for (const m of [ADMIN, M1, M2]) { await db.query("select town.purse_of($1, true)", [m]); await db.query("update public.town_purses set coins = 10000 where member_id = $1", [m]); }
  // thirty popoto on M1's character, given over thirty days
  await db.exec(`insert into public.kudos (sender_id, receiver_character_id, day) select '${M2}', 2001, current_date - g from generate_series(1, 30) g`);

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  for (const f of ["casino_live_seat(integer)", "casino_live_popoto(uuid,integer,text)"]) {
    eq((await one(`select has_function_privilege('anon', 'public.${f}', 'execute') r`)).r, false, `anon may not call ${f}`);
    eq((await one(`select has_function_privilege('authenticated', 'public.${f}', 'execute') r`)).r, true, `a member may call ${f}`);
  }
  for (const t of ["casino_live_seats", "casino_live_popoto_moves"]) eq((await one(`select has_table_privilege('authenticated', 'public.${t}', 'select') r`)).r, false, `nobody reads ${t}`);

  // ── ten machines, one player each ──
  for (const m of [ADMIN, M1, M2]) await as(m, "select public.casino_live_buy($1, $2) r", [uuid(request++), 2000]);
  eq((await sit(ADMIN, 3))?.ok, true, "a member sits at machine 3");
  const taken = await sit(M1, 3);
  eq([taken?.ok, taken?.why, typeof taken?.name === "string" && taken.name.length > 0], [false, "taken", true], "another is told it is taken, and by whom");
  refused(await spin(M1, 3), "Machine taken", "nor may spin it");
  eq((await sit(M1, 10))?.ok, true, "machine 10 is there");
  { const r = await spin(M1, 10); ok(r?.id, `and spins (${JSON.stringify(r)?.slice(0, 160)})`); }
  refused(await spin(ADMIN, 10), "Machine taken", "the spinner holds it");
  eq((await sit(M1, 11))?.why, "machine", "there is no machine 11");
  refused(await spin(M1, 11), "Invalid spin", "nor a spin on it");
  ok((await spin(ADMIN, 3))?.id, "the holder spins its own machine");
  const st = await as(M2, "select public.casino_live_state() r");
  eq((st?.seats ?? []).map((x) => x.machine), [3, 10], "the state says which machines are held");
  // one machine a player
  eq((await sit(ADMIN, 5))?.ok, true, "sitting at another");
  eq((await sit(M1, 3))?.ok, true, "lets the first go");
  eq((await rows("select machine from public.casino_live_seats where user_id = $1", [ADMIN])).map((r) => r.machine), [5], "one machine a player");
  // idle a minute: another may have it
  await db.exec(`update public.casino_live_seats set at = now() - interval '61 seconds' where user_id = '${ADMIN}'`);
  eq((await sit(M2, 5))?.ok, true, "a machine idle a minute is another's to take");
  await db.exec(`update public.casino_live_seats set at = now() - interval '61 seconds' where user_id = '${M2}'`);
  ok((await spin(ADMIN, 5))?.id, "and a spin takes one idle a minute back");
  eq((await sit(ADMIN, null))?.ok, true, "letting go");
  eq((await rows("select machine from public.casino_live_seats where user_id = $1", [ADMIN])).length, 0, "holds nothing");
  await db.exec("update public.casino_live_settings set access = 'closed', open = false");
  eq((await sit(M2, 7))?.why, "closed", "closed: nobody sits");
  await db.exec("update public.casino_live_settings set access = 'everyone', open = true");

  // ── popoto at the counter, no week's limit ──
  eq(await left(M1), 30, "thirty popoto to change");
  const c0 = await coins(M1), req = uuid(99000);
  const r1 = await change(M1, 10, "coins", req);
  eq([r1?.ok, Number(r1?.got), Number(r1?.popoto_left)], [true, 50, 20], "ten popoto into fifty Popoto coins");
  eq(await coins(M1), c0 + 50, "in the purse");
  eq(await left(M1), 20, "the popoto spent");
  eq((await change(M1, 10, "coins", req))?.ok, true, "the same request again");
  eq([await coins(M1), await left(M1)], [c0 + 50, 20], "changes nothing twice");
  eq((await change(M1, 5, "coins", req))?.why, "amount", "the same request for another amount is refused");
  eq((await one("select week::text w, kind, popoto, coins from public.town_exchanges where member_id = $1 order by id desc limit 1", [M1])), { w: "2000-01-03", kind: "profile", popoto: 10, coins: 50 }, "in the bank's own book, on a week it never counts");
  const bank = await as(M1, "select to_jsonb(x) r from public.town_exchange('profile', 20) x");
  eq([bank?.ok, Number(bank?.changed)], [true, 20], "the bank's week is still whole: twenty more there");
  eq(await left(M1), 0, "and every popoto is spent once");
  eq((await change(M1, 1, "coins"))?.why, "popoto", "none left: refused");
  await db.exec(`insert into public.kudos (sender_id, receiver_character_id, day) select '${ADMIN}', 2001, current_date - g from generate_series(1, 40) g`);
  const ch0 = await chips(M1);
  eq([Number((await change(M1, 4, "chips"))?.got), await chips(M1)], [20, ch0 + 20], "four popoto into twenty Casino Coins");
  await db.exec("update public.casino_live_settings set chip_rate = 3");
  eq(Number((await change(M1, 2, "chips"))?.got), 3, "at three a Casino Coin, ten coins' worth is three");
  await db.exec("update public.casino_live_settings set chip_rate = 1");
  for (let i = 0; i < 6; i++) ok((await change(M1, 5, "coins"))?.ok, `no week's limit (change ${i + 1})`);
  eq(await left(M1), 4, "forty less what was changed");
  for (const [n, what] of [[0, "nothing"], [1001, "over a thousand"], [null, "no amount"]]) eq((await change(M1, n, "coins"))?.why, "amount", `${what} is refused`);
  eq((await change(M1, 1, "gil"))?.why, "amount", "only coins or Casino Coins");
  eq((await change(M2, 1, "coins"))?.why, "popoto", "no popoto, no change");
  ok((await as(null, "select public.casino_live_popoto($1, 1, 'coins') r", [uuid(5)], "anon"))?.error, "anon is refused");
  eq((await one("select count(*)::int n from public.casino_live_popoto_moves")).n, 9, "every change kept once");
} finally {
  await db.close();
}
console.log(`${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
