// v300, Ninenine can add coins, dry-run: the file runs twice (CR line ends, then LF); `/coins` adds to Ninenine's own
// purse and to nobody else's (another admin, a member, anon, Ninenine without his admin flag all refused); 1 to
// 1,000,000 a time; a retry with the same request adds nothing twice; the rest of the purse untouched; each grant kept.
//   cd <the tree> && V300_BENCH=<the bench after v296, a .tar> node .claude/skills/fc-cash-town/scripts/db/v300.test.mjs
// (the same bench as v299's dry run; v256's stand-in gives it Ninenine's account)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v300_ninenine_can_add_coins.sql");
const BENCH = process.env.V300_BENCH ?? process.env.V299_BENCH;
if (!BENCH) throw new Error("V300_BENCH: the bench after v296 (v297's dry run keeps one with V297_BENCH)");
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
const NINE = "9c0e6904-df00-452d-b005-dac3fa6cd1d7", ADMIN = "00000000-0000-0000-0000-00000000000a", M1 = "00000000-0000-0000-0000-000000000001";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const add = (who, amount, request) => as(who, "select public.town_admin_coins($1, $2) r", [amount, request]);
const coins = async (m) => Number((await one("select coins from public.town_purses where member_id = $1", [m]))?.coins ?? NaN);

try {
  // without Ninenine's account it refuses to run
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  ok(await db.exec(sql).then(() => false, (e) => /Ninenine admin account is missing/.test(e.message)), "without Ninenine's account it stops");
  await db.exec("rollback");
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/v256-stand-in.sql"), "utf8"));
  await db.exec(`update public.profiles set is_admin = true where id = '${ADMIN}'`);
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);

  eq((await one("select has_function_privilege('anon', 'public.town_admin_coins(integer,uuid)', 'execute') r")).r, false, "anon may not call it");
  eq((await one("select has_table_privilege('authenticated', 'public.town_admin_coin_grants', 'select') r")).r, false, "nobody reads the grants");

  // Ninenine, with no purse yet: made, and the coins in it
  ok(!(await one("select 1 r from public.town_purses where member_id = $1", [NINE])), "Ninenine has no purse yet");
  const first = await add(NINE, 10000, uuid(1));
  ok(first?.ok === true && Number(first.coins) === await coins(NINE), `Ninenine adds ten thousand (${JSON.stringify(first)})`);
  const at0 = await coins(NINE);
  // the rest of the purse as it was
  await db.query("update public.town_purses set doc = jsonb_set(doc, '{bag}', '[{\"item\":\"worm\",\"n\":3}]') where member_id = $1", [NINE]);
  const bag = (await one("select doc -> 'bag' b from public.town_purses where member_id = $1", [NINE])).b;
  ok((await add(NINE, 5000, uuid(2)))?.ok, "and five thousand more");
  eq(await coins(NINE), at0 + 5000, "the purse holds them");
  // (the town's purse_of lays the bag out in its slots: the things in it are what count)
  const things = (b) => (b ?? []).filter(Boolean);
  eq(things((await one("select doc -> 'bag' b from public.town_purses where member_id = $1", [NINE])).b), things(bag), "the rest of the purse untouched");
  // a retry after a lost answer adds nothing twice; the same request for another amount is refused
  const again = await add(NINE, 5000, uuid(2));
  ok(again?.ok && Number(again.coins) === at0 + 5000, "the same request again adds nothing");
  eq(await coins(NINE), at0 + 5000, "still the same coins");
  eq((await add(NINE, 7000, uuid(2)))?.why, "amount", "the same request for another amount is refused");
  // amounts
  for (const [n, what] of [[0, "nothing"], [-5, "less than nothing"], [1000001, "over a million"], [null, "no amount"]]) eq((await add(NINE, n, uuid(9)))?.why, "amount", `${what} is refused`);
  eq((await add(NINE, 1, null))?.why, "amount", "no request is refused");
  ok((await add(NINE, 1000000, uuid(3)))?.ok, "a million at once is kept");
  // nobody else
  await db.query("select town.purse_of($1, true)", [ADMIN]); const admin0 = await coins(ADMIN);
  eq((await add(ADMIN, 100, uuid(4)))?.why, "forbidden", "another admin is refused");
  eq(await coins(ADMIN), admin0, "and their coins are as they were");
  eq((await add(M1, 100, uuid(5)))?.why, "forbidden", "a member is refused");
  ok((await as(null, "select public.town_admin_coins($1, $2) r", [100, uuid(6)], "anon"))?.error, "anon is refused");
  await db.exec(`update public.profiles set is_admin = false where id = '${NINE}'`);
  eq((await add(NINE, 100, uuid(7)))?.why, "forbidden", "Ninenine without his admin flag is refused");
  await db.exec(`update public.profiles set is_admin = true where id = '${NINE}'`);
  // each grant kept
  eq((await rows("select amount from public.town_admin_coin_grants order by at, amount")).map((r) => r.amount), [10000, 5000, 1000000], "each grant kept, once");
} finally {
  await db.close();
}
console.log(`${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
