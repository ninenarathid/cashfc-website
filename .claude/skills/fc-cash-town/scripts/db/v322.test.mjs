// v322, the village's farm book, dry-run: the file runs twice (CR at its line ends, and as written) and the second run
// changes no function and no row of the book; what was found before is read from the purses, its first finder from the
// earliest deed of its seed among those who hold it ("" when none); a child found later is noted once, by the first
// purse to hold it, never moved by a second, and nothing that is not a crop is; the reader gives { crop: name } to a
// member and refuses anon; nobody but the functions reads or writes the table.
//   cd <the tree> && FC_REPO=<the tree> V322_BENCH=<a bench, as v321's dry run used> node .claude/skills/fc-cash-town/scripts/db/v322.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const FILE = process.env.MIGRATION_FILE ?? "supabase/v322_the_villages_farm_book.sql";
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(process.env.V322_BENCH)]) });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const fns = async () => (await rows("select p.proname, md5(replace(pg_get_functiondef(p.oid),chr(13),'')) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town','public') order by 1, 2")).map((r) => r.proname + r.d).join();
const as = async (who, q, a = []) => {
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who === "anon" ? "" : who]);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(who === "anon" ? { role: "anon" } : { sub: who, role: "authenticated" })]);
    await db.exec(`set role ${who === "anon" ? "anon" : "authenticated"}`);
    return { row: (await db.query(q, a)).rows[0] };
  } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const book = async () => Object.fromEntries((await rows("select crop, first_name, first_member from public.town_garden_book order by crop")).map((r) => [r.crop, [r.first_name, r.first_member]]));

try {
  const people = (await rows("select id from public.profiles order by id limit 3")).map((r) => r.id);
  if (people.length < 3) throw Error("the bench needs three people");
  const [A, B, C] = people, name = async (id) => (await one("select coalesce(town.giant_name($1::uuid), '') n", [id])).n;
  const put = async (who, gardenBook) => db.query(
    "insert into public.town_purses (member_id, doc) values ($1, $2) on conflict (member_id) do update set doc = public.town_purses.doc || excluded.doc",
    [who, JSON.stringify({ gardenBook })]);
  const seed = (await one("select town.cat('crops')->'teaBush'->>'seed' s")).s;
  // before the file: A and B both hold the tea bush, B held its seed first; C holds the red okra with no deed; a stray name
  await put(A, ["teaBush", "blueCorn"]); await put(B, ["teaBush", "notACrop"]); await put(C, ["redOkra"]);
  // (the town news told the blue corn's first finder, C, though only A holds it now; and a deed of A's seed came later)
  await db.query("delete from public.town_announcements where kind = 'cross'");
  await db.query("insert into public.town_announcements (event_key, member_id, kind, subject, level, name, portrait, at) values ('cross:blueCorn', $1, 'cross', 'blueCorn', 0, 'Told Finder', '{}', now() - interval '3 days')", [C]);
  await db.query("insert into public.town_deeds (member_id, at, what, thing, n, doc) values ($1, now() - interval '1 hour', 'hold', 'seedBlueCorn', 1, '{}')", [A]);
  await db.query("insert into public.town_deeds (member_id, at, what, thing, n, doc) values ($1, now() - interval '2 days', 'hold', $2, 1, '{}'), ($3, now() - interval '1 day', 'hold', $2, 1, '{}')", [B, seed, A]);

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const first = await book();
  eq(Object.keys(first).sort(), ["blueCorn", "redOkra", "teaBush"], "what the purses hold is in the book, and nothing that is not a crop");
  eq(first.blueCorn, ["Told Finder", C], "the one the town news told is the finder, before any deed");
  eq(first.teaBush, [await name(B), B], "the first to have had its seed is its finder");
  eq(first.redOkra, ["", null], "one with no deed is the book's somebody");
  const f1 = await fns();
  await db.exec(sql);
  eq(await fns(), f1, "a run again changes no function");
  eq(await book(), first, "a run again changes no row of the book");

  // found later
  await db.query("update public.town_purses set doc = jsonb_set(doc, '{gardenBook}', $2) where member_id = $1", [C, JSON.stringify(["redOkra", "rowBean"])]);
  eq((await book()).rowBean, [await name(C), C], "a child found later is noted with its finder");
  await db.query("update public.town_purses set doc = jsonb_set(doc, '{gardenBook}', $2) where member_id = $1", [A, JSON.stringify(["teaBush", "rowBean"])]);
  eq((await book()).rowBean, [await name(C), C], "a second finder does not move the first");
  await db.query("update public.town_purses set doc = doc || '{\"coins\": 5}' where member_id = $1", [B]);
  eq(Object.keys(await book()).length, 4, "a purse write that leaves its garden book alone notes nothing");
  await db.query("update public.town_purses set doc = jsonb_set(doc, '{gardenBook}', $2) where member_id = $1", [B, JSON.stringify(["teaBush", "notACrop", "alsoNot"])]);
  eq(Object.keys(await book()).length, 4, "a name that is not a crop is never noted");
  eq((await rows("select tgname from pg_trigger where tgrelid = 'public.town_purses'::regclass and tgname like 'town_purses_garden_book%' order by 1")).map((r) => r.tgname), ["town_purses_garden_book", "town_purses_garden_book_new"], "two triggers, once each");

  // the reader and the walls
  const read = await as(A, "select public.town_garden_book() b");
  eq(read.row?.b, { teaBush: await name(B), redOkra: "", rowBean: await name(C), blueCorn: "Told Finder" }, "a member reads { crop: first finder }");
  eq(!!(await as("anon", "select public.town_garden_book() b")).error, true, "anon may not read it");
  for (const who of ["anon", A]) {
    eq(!!(await as(who, "select * from public.town_garden_book")).error, true, `${who === "anon" ? "anon" : "a member"} may not read the table`);
    eq(!!(await as(who, "insert into public.town_garden_book (crop) values ('x')")).error, true, `${who === "anon" ? "anon" : "a member"} may not write it`);
    eq(!!(await as(who, "select town.garden_book_note()")).error, true, `${who === "anon" ? "anon" : "a member"} may not call the trigger's function`);
  }
} catch (e) { failed++; console.log("  THREW", e.message); }
console.log(`v322: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
