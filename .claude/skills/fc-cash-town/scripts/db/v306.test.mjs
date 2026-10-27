// v306, one machine a player from any tab, dry-run: the file runs twice (CR line ends, then LF); two seats of one player
// already there are cut to the newest; the table refuses a second seat for a player; sitting down still holds a
// machine, refuses another's, and moves a player's one seat to the machine sat at.
//   cd <the tree> && V306_BENCH=<the bench after v296, a .tar> node .claude/skills/fc-cash-town/scripts/db/v306.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v306_one_machine_a_player_from_any_tab.sql");
const BENCH = process.env.V306_BENCH ?? process.env.V305_BENCH ?? process.env.V299_BENCH;
if (!BENCH) throw new Error("V306_BENCH: the bench after v296");
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(BENCH)]) });

let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 200)}`); } };
const ok = (v, what) => eq(!!v, true, what);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const as = async (who, q, a = [], role = "authenticated") => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
  try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const ADMIN = "00000000-0000-0000-0000-00000000000a", M1 = "00000000-0000-0000-0000-000000000001";
const sit = (who, machine) => as(who, "select public.casino_live_seat($1) r", [machine]);
const seatsOf = async (m) => (await rows("select machine from public.casino_live_seats where user_id = $1 order by machine", [m])).map((r) => r.machine);

try {
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/v256-stand-in.sql"), "utf8"));
  for (const f of ["v256_ninenine_can_announce_in_town", "v297_granny_twillas_shop_and_its_auction", "v298_two_chests_on_the_farm", "v204_casino_before_the_town_hall_opens", "v206_casino_when_the_doors_open"]) {
    await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  }
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/site-prize-stand-ins.sql"), "utf8"));
  await db.exec("drop publication if exists supabase_realtime; create publication supabase_realtime for table public.casino_live_settings, public.casino_live_prizes, public.casino_live_spins, public.casino_live_receipts, public.town_casino_announcements;");
  for (const f of ["v299_the_casino_in_the_town", "v303_casino_coins_of_its_own", "v304_the_coin_back_as_a_paytable", "v305_ten_machines_one_player_each"]) await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  await db.exec("update public.casino_live_settings set access = 'everyone', open = true");
  // two tabs' worth of seats for one player, as v305 could leave them
  await db.exec(`insert into public.casino_live_seats (machine, user_id, at) values (2, '${M1}', now() - interval '5 seconds'), (7, '${M1}', now())`);

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  ok(await db.exec(sql.replace(/\n/g, "\r\n")).then(() => true, (e) => { console.log(`  (${e.message})`); return false; }), "the file runs");
  ok(await db.exec(sql).then(() => true, () => false), "and runs again");
  eq(await seatsOf(M1), [7], "two seats of one player cut to the newest");
  ok(await db.exec(`insert into public.casino_live_seats (machine, user_id) values (3, '${M1}')`).then(() => false, () => true), "the table refuses a second seat for a player");
  eq((await sit(M1, 4))?.ok, true, "sitting down moves the one seat");
  eq(await seatsOf(M1), [4], "to the machine sat at");
  eq((await sit(ADMIN, 4))?.why, "taken", "another's machine is still refused");
  eq((await sit(ADMIN, 9))?.ok, true, "a free one is had");
  eq((await sit(M1, null))?.ok, true, "and letting go still does");
  eq(await seatsOf(M1), [], "holds nothing");
  eq((await rows("select count(*)::int n from public.casino_live_accounts where user_id = $1", [ADMIN]))[0].n, 1, "a player's own row is there to hold");
} finally {
  await db.close();
}
console.log(`${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
