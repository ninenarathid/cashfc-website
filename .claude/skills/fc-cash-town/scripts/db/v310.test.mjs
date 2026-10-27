// v310, the village's book of fish, dry-run: the file runs twice (CR at its line ends, then as written) and a second run
// changes nothing; what it should say afterwards; the landings before it noted by the same rules as lib/town/fish-book's
// noteFish, the earliest first (the first kept, a bigger replacing, a tie keeping the earlier, what is no fish and what
// slipped left out); the trigger on a landing of a line by itself and on both of a rod of two lines, inside town_land;
// the giants' records from v309's hooks against giantRecords; anon, an unproved member and one with no character refused.
//   cd <the tree> && FC_REPO=<the tree> V310_BENCH=<a bench through v306, as v307.test.mjs keeps it> node .claude/skills/fc-cash-town/scripts/db/v310.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const FB = await import("@/lib/town/fish-book");
const { FISH } = await import("@/lib/town/items");

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v310_the_villages_book_of_fish.sql");
const BASE = "5568ab2b";
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 500)} against ${JSON.stringify(b)?.slice(0, 500)}`); } };
const ok = (v, what) => eq(!!v, true, what);
const CACHE = process.env.V310_BENCH ?? process.env.V309_BENCH;
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
const supa = (f) => readFileSync(join(ROOT, "supabase", f), "utf8");
let db;
if (CACHE && existsSync(CACHE)) db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
else {
  // (the bench as v307.test.mjs builds it, through v306)
  db = await rewardDB(252);
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  await db.exec(`create schema if not exists realtime; grant usage on schema realtime to anon, authenticated;
    create table if not exists realtime.messages (id bigint generated always as identity primary key, extension text not null);
    alter table realtime.messages enable row level security; grant select, insert on realtime.messages to anon, authenticated;
    create or replace function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;`);
  const { migration } = await import(pathToFileURL(join(BENCH, "pglite-harness.mjs")).href);
  for (const n of [101, 102]) try { await db.exec(migration(n, { repo: ROOT })); } catch (e) { console.log(`  (v${n}: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  for (let n = 275; n <= 306; n++) for (const f of readdirSync(join(ROOT, "supabase")).filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(supa(f)); } catch (e) { console.log(`  (v${n} did not replay here: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
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
const M1 = "00000000-0000-0000-0000-000000000001", M2 = "00000000-0000-0000-0000-000000000002", M3 = "00000000-0000-0000-0000-000000000003";
const UNVER = "00000000-0000-0000-0000-000000000004", NOCHAR = "00000000-0000-0000-0000-000000000005";
const NAME = { [M1]: "Member One", [M2]: "Member Two", [M3]: "Guest Three" };
const AT = [0, 23];

try {
  // ── what the file stands on: v307, v308, v256's and v299's readers (as v309.test.mjs gives them), and v309 ──
  for (const f of ["v307_a_giant_pulled_out_together.sql", "v308_what_i_won_at_the_casino_today.sql"]) {
    try { await db.exec(supa(f)); } catch (e) { console.log(`  (${f.slice(0, 4)} did not replay here: ${e.message.slice(0, 100)})`); await db.exec("rollback"); }
  }
  if (!(await one("select to_regprocedure('public.town_announcements_v299(bigint,text)') is not null or to_regprocedure('public.town_announcements_v309(bigint,text)') is not null as r")).r) {
    await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/v256-stand-in.sql"), "utf8"));
    await db.exec(supa("v256_ninenine_can_announce_in_town.sql"));
    const v299 = supa("v299_the_casino_in_the_town.sql").replace(/\r\n/g, "\n");
    await db.exec("begin;\n" + v299.slice(v299.indexOf("-- ── 7. a big win told"), v299.indexOf("notify pgrst")) + "commit;");
  }
  if (!(await one("select to_regclass('public.town_giant_hooks') is not null as r")).r) await db.exec(supa("v309_a_giant_fish_landed_together.sql"));
  await db.exec("update public.town_knobs set value = 1 where key = 'game_open'");
  const bagOf = (...things) => JSON.stringify([...things, ...Array(10 - things.length).fill(null)]);
  for (const m of [M1, M2, M3]) await db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('bag', $2::jsonb))", [m, bagOf({ item: "rod", n: 1 }, { item: "dough", n: 20 })]);

  // ── the landings before it: written down as town.record writes them, at times of their own ──
  const fish = Object.keys(FISH), [A, B, C] = ["carp", "tilapia", "catfish"];
  ok([A, B, C].every((id) => fish.includes(id)), "three kinds of fish to land");
  const T = Date.now() - 86_400_000;
  const past = [
    // [member, what, size, hours after T, how, won]
    [M3, B, 0, 1, "landed", true],          // a first of no length: the first, and no biggest yet
    [M1, A, 30, 2, "landed", true],         // the first carp
    [M2, A, 41, 3, "slipped", false],       // slipped: not landed
    [M2, A, 40, 4, "landed", true],         // bigger
    [M3, A, 40, 5, "landed", true],         // the same: the earlier stays
    [M1, "boot", 0, 6, "landed", true],     // no fish
    [M1, B, 20, 7, "landed", true],         // tilapia's first biggest
    [M2, "giantSteak", 9, 8, "landed", true], // not a fish either
  ];
  for (const [m, what, size, h, how, won] of past) {
    await db.query("insert into public.town_plays (member_id, game, at, won, secs, spent, buff, doc) values ($1, 'fishing', to_timestamp($2 / 1000.0), $3, 10, false, null, $4::jsonb)",
      [m, T + h * 3_600_000, won, JSON.stringify({ how, what, size, kept: true, record: false })]);
  }
  await db.query("insert into public.town_plays (member_id, game, at, won, secs, spent, buff, doc) values ($1, 'cooking', now(), true, 10, false, null, $2::jsonb)", [M1, JSON.stringify({ what: A, size: 99, how: "landed" })]);
  const noted = (book, list) => list.filter(([, , , , how, won]) => won && how === "landed").reduce((b, [m, what, size]) => FB.noteFish(b, what, size, NAME[m]), book);
  const wantBefore = noted({}, past);

  // ── the file, twice ──
  const fnsOf = async () => (await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') order by 1, 2")).map((r) => r.proname + r.d).join();
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  // (a file that stops leaves its transaction to be rolled back, so that the checks after say what is missing)
  const runs = (text) => db.exec(text).then(() => true, async (e) => { console.log(`  (${e.message} ${e.where ?? ""})`); await db.exec("rollback"); return false; });
  ok(await runs(sql.replace(/\n/g, "\r\n")), "the file runs (CR at its line ends)");
  const bookRows = async () => rows("select * from public.town_fish_book order by species");
  const once = await bookRows();
  ok(await runs(sql), "and runs again (as written)");
  const after = await fnsOf();
  await db.exec(sql);
  eq(await fnsOf(), after, "a second run changes no function");
  eq(await bookRows(), once, "nor the book");

  // ── what it should say afterwards ──
  eq((await one("select tgname r from pg_trigger where tgrelid = 'public.town_plays'::regclass and tgname = 'town_plays_fish_book'")).r, "town_plays_fish_book", "the trigger is there");
  const kinds = (await one(`select count(distinct p.doc->>'what')::int n from public.town_plays p, (select town.cat('fish') f) c
    where p.game = 'fishing' and p.won and p.doc->>'how' = 'landed' and c.f ? (p.doc->>'what')`)).n;
  eq(await one("select count(*)::int kinds, count(best_size)::int with_biggest from public.town_fish_book"), { kinds, with_biggest: kinds }, "a row a kind landed, each with a biggest");
  eq(await one(`select has_function_privilege('anon', 'public.town_fish_book()', 'EXECUTE') as anon_may,
         has_table_privilege('authenticated', 'public.town_fish_book', 'SELECT') as members_read`), { anon_may: false, members_read: false }, "who may read");

  // ── the landings before it ──
  const book = async (who = M1) => asOf(who)("select public.town_fish_book() r");
  let b = await book();
  eq(b.fish, wantBefore, "the landings before, as noteFish notes them the earliest first");
  eq([b.fish[A]?.first, b.fish[A]?.best, b.fish[B]?.first, b.fish[B]?.best], [NAME[M1], [40, NAME[M2]], NAME[M3], [20, NAME[M1]]],
    "the first kept, a bigger replacing it, a tie keeping the earlier, a first of no length with no biggest till one came");
  eq(["boot", "giantSteak"].filter((id) => id in b.fish), [], "what is no fish is not in the book");
  eq(b.giants, [], "no giant landed yet");
  const best = (id) => one("select best_member, best_name, best_size, first_member, first_name from public.town_fish_book where species = $1", [id]);
  eq(await best(A), { best_member: M2, best_name: NAME[M2], best_size: 40, first_member: M1, first_name: NAME[M1] }, "who, by id and by name");

  // ── the trigger: a landing of a line by itself, inside town_land ──
  // (a line as a cast leaves it, struck twenty seconds ago: a fight long enough to be landed)
  await db.exec("begin");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [M1]);
  await db.query("select set_config('request.jwt.claim.role','authenticated',true)");
  await db.exec("set local role authenticated");
  const cast = (await db.query("select public.town_cast('dough', $1, $2) r", AT)).rows[0].r;
  await db.exec("reset role");
  await db.exec("rollback");
  ok(cast?.ok, "a cast to take a line from");
  const lineOf = async (m) => (await one("select doc from public.town_lines where member_id = $1", [m]))?.doc ?? null;
  const lay = async (m, more) => {
    const t = Number((await one("select town.now_ms() r")).r);
    const doc = { x: AT[0], y: AT[1], bait: "dough", deep: false, hour: 12, rain: false, told: false, wait: 9, nibbles: [], cast_at: t - 30_000, current: "eddy", habitat: "town",
      bites_at: t - 21_000, struck_at: t - 20_000, reaction: 100, spent: false, comboLoadout: "[[],null]", ...more };
    await db.query("insert into public.town_lines (member_id, doc) values ($1, $2::jsonb) on conflict (member_id) do update set doc = excluded.doc", [m, JSON.stringify(doc)]);
  };
  const land = (m, fight = null) => asOf(m)("select public.town_land('landed', $1::jsonb) r", [fight === null ? null : JSON.stringify(fight)]);
  await lay(M1, { what: A, size: 45 });
  let r = await land(M1);
  eq([r?.ok, r?.how], [true, "landed"], "a carp landed by itself");
  b = await book();
  eq([b.fish[A]?.first, b.fish[A]?.best], [NAME[M1], [45, NAME[M1]]], "the bigger is the book's at once; the first is still the first");
  await lay(M2, { what: A, size: 45 });
  await land(M2);
  eq((await book()).fish[A]?.best, [45, NAME[M1]], "of two the same, the earlier");
  await lay(M2, { what: A, size: 45.1 });
  await land(M2);
  eq((await book()).fish[A], { first: NAME[M1], best: [45.1, NAME[M2]] }, "a tenth more is bigger, by another: the first is still the first");
  // slipped (a fight too short to be a landing): not landed, not noted
  await lay(M3, { what: A, size: 60, struck_at: Number((await one("select town.now_ms() r")).r) - 100 });
  r = await land(M3);
  eq([r?.how, (await book()).fish[A]?.best], ["slipped", [45.1, NAME[M2]]], "a landing too quick is no landing, and not noted");

  // ── the trigger: both of a rod of two lines (town.land_one, then the line left by itself) ──
  await lay(M3, { what: A, size: 50, others: [{ what: C, size: 70 }], paired: true });
  r = await land(M3, { which: 1 });
  eq([r?.ok, r?.how, r?.what, r?.more], [true, "landed", C, true], "the second line's fish landed first");
  ok((await lineOf(M3))?.what === A, "the first line's still on");
  b = await book();
  eq(b.fish[C], { first: NAME[M3], best: [70, NAME[M3]] }, "a kind new to the book: first and biggest");
  r = await land(M3);
  eq([r?.ok, r?.how, r?.what], [true, "landed", A], "then the other");
  eq((await book()).fish[A]?.best, [50, NAME[M3]], "and it is the biggest carp now");
  // what is no fish, landed as the strike lands it (town.record), passes the book by
  await db.query("select town.record($1, 'fishing', true, 0, false, null, $2::jsonb)", [M1, JSON.stringify({ how: "landed", what: "bottle", size: 5, kept: true })]);
  await db.query("select town.record($1, 'fishing', true, 0, false, null, $2::jsonb)", [M1, JSON.stringify({ how: "landed", what: B, size: 31 })]);
  b = await book();
  eq(["bottle" in b.fish, b.fish[B]?.best], [false, [31, NAME[M1]]], "a bottle landed is not noted; a tilapia is");
  // the whole of it, against noteFish over every landing there is
  const all = (await rows("select member_id, doc from public.town_plays where game = 'fishing' and won and doc->>'how' = 'landed' order by at, id"))
    .reduce((bk, p) => FB.noteFish(bk, p.doc.what, typeof p.doc.size === "number" ? p.doc.size : 0, NAME[p.member_id]), {});
  eq((await book()).fish, all, "the book, as noteFish over every landing in their order");

  // ── the giants: v309's hooks, landed by two ──
  const hook = (n, giant, size, end, more = {}) => ({ id: `g${n.toString(16).padStart(15, "0")}`, giant, size, weight: Math.round(size * 3) / 10, by: M1, byName: NAME[M1], tile: AT, water: "town",
    at: end - 60_000, netter: M2, netterName: NAME[M2], go: end - 30_000, scoops: [end - 12_000, end - 6_000, end], frays: [], calls: [], end, how: "landed", claimed: [], seed: n, ...more });
  const E = Date.now() - 3_600_000;
  const hooks = [
    hook(1, "sailbackCarp", 150, E + 1000),
    hook(2, "sailbackCarp", 160, E + 2000, { by: M3, byName: NAME[M3], netter: M1, netterName: NAME[M1] }),
    hook(3, "sailbackCarp", 160, E + 3000),                    // the same: the earlier stays
    hook(4, "sailbackCarp", 170, E + 4000, { how: "lost" }),   // got away
    hook(5, "lanternCatfish", 200, E + 500),                   // landed first of all
    hook(6, "lanternCatfish", 230, E + 5000, { netter: null, netterName: null }), // nobody netted it: not landed so
    hook(7, "notAGiant", 300, E + 600),
    hook(8, "palePaddlefish", 180, E + 6000, { how: "broke" }),
  ];
  for (const h of hooks) await db.query("insert into public.town_giant_hooks (id, by_id, at, doc) values ($1, $2, $3, $4::jsonb)", [h.id, h.by, h.at, JSON.stringify(h)]);
  b = await book();
  eq(b.giants, FB.giantRecords(hooks), "the giants' records, as giantRecords has them");
  eq(b.giants.map((g) => [g.id, g.size, g.angler, g.netter]), [["lanternCatfish", 200, NAME[M1], NAME[M2]], ["sailbackCarp", 160, NAME[M3], NAME[M1]]],
    "the biggest of each landed together, the earlier of two the same, in the order first landed");

  // ── who may ──
  for (const [who, role, name] of [[null, "anon", "anon"], [UNVER, "authenticated", "an unproved member"], [NOCHAR, "authenticated", "a member with no character"]]) {
    eq((await asOf(who, role)("select public.town_fish_book() r"))?.why, "error 42501", `${name} refused the book`);
  }
  eq((await asOf(M1)("select count(*) r from public.town_fish_book"))?.why, "error 42501", "a member reads no row straight");
  eq((await asOf(M1)("update public.town_fish_book set first_name = 'x' where true returning 1 r"))?.why, "error 42501", "nor writes one");
  eq((await asOf(M1)("insert into public.town_plays (member_id, game, won, doc) values ($1, 'fishing', true, '{\"how\":\"landed\",\"what\":\"carp\",\"size\":999}') returning 1 r", [M1]))?.why, "error 42501", "nor writes a landing to be noted");
  ok((await book(M3))?.fish?.[A], "a guest of the town reads it as any member");
  const { bareWrites } = await import("./bare-writes.mjs");
  eq((await bareWrites(rows)).filter((x) => /town_fish_book|fish_book_note/.test(x.fn)), [], "no write of this file's without a WHERE");

  console.log(`v310: ${checks} checks passed${failed ? `, ${failed} FAILED` : ""}.`);
  if (failed) process.exitCode = 1;
} catch (e) { console.error(e.message, e.detail ?? "", e.where ?? "", e.stack?.split("\n").slice(1, 4).join(" | ")); process.exitCode = 1; } finally { await db.close(); }
