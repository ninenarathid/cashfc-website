// v299, the Popoto Casino in the town, dry-run: the file runs twice (CR line ends, then LF); who may spin, three ways;
// the admins' trial (forced results, every spin a test, nothing announced); where a win goes (a thing into prize_wins
// with its bell and the site's own claim, thread and hand-over; Gil into the wallet; coins and the pair into the
// purse); the reels (a prize four alike, the pair its first two alike and the third not, a miss its first two unlike);
// the wipe that leaves nothing of the trial behind (coins, stock, Gil set aside, counts, rows, threads, bells, wallet);
// the desk's save (six prizes, the pair a coin prize, coins back under the price) and the Aqua page's switch; the hint
// to 'casino-live' instead of the change feed; the casino's chat zone; and anon, a member and an unproved account
// refused what is not theirs.
//   cd <the tree> && V299_BENCH=<the bench after v296, a .tar> node .claude/skills/fc-cash-town/scripts/db/v299.test.mjs
// (the bench after v296: the one v297's dry run keeps with V297_BENCH)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// (the tree's files by FC_REPO, or the folder it is run from: the breaks run it from the harness's own folder)
const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v299_the_casino_in_the_town.sql");
const BENCH = process.env.V299_BENCH;
if (!BENCH) throw new Error("V299_BENCH: the bench after v296 (v297's dry run keeps one with V297_BENCH)");
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

const ADMIN = "00000000-0000-0000-0000-00000000000a", ADMIN2 = "00000000-0000-0000-0000-00000000000b";
const M1 = "00000000-0000-0000-0000-000000000001", M2 = "00000000-0000-0000-0000-000000000002", UNVER = "00000000-0000-0000-0000-000000000004";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let request = 1;

try {
  // ── the bench: v297, v298 and the casino's own two files, as they ran ──
  for (const f of ["v297_granny_twillas_shop_and_its_auction", "v298_two_chests_on_the_farm", "v204_casino_before_the_town_hall_opens", "v206_casino_when_the_doors_open"]) {
    await db.exec(readFileSync(join(ROOT, `supabase/${f}.sql`), "utf8"));
  }
  // a second admin (the two who try the casino: claims reach the other)
  await db.exec(`insert into auth.users (id) values ('${ADMIN2}') on conflict do nothing;
    insert into public.profiles (id, is_admin, character_id, character_name, character_verified_at) values ('${ADMIN2}', true, 1002, 'Aqua', now()) on conflict (id) do update set is_admin = true;
    update public.profiles set character_name = 'Nine' where id = '${ADMIN}';`);
  // The site's prize and wallet tables (v87, v91, v93), stood in for with the columns and the functions the casino uses,
  // their bodies as they ran (the bench is the town's: it has none of the site's).
  await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/site-prize-stand-ins.sql"), "utf8"));
  await db.exec(`
    drop publication if exists supabase_realtime;
    create publication supabase_realtime for table public.casino_live_settings, public.casino_live_prizes, public.casino_live_spins, public.casino_live_receipts, public.town_casino_announcements;`);
  // every player has coins to spin with
  for (const m of [ADMIN, ADMIN2, M1, M2]) { await db.query("select town.purse_of($1, true)", [m]); await db.query("update public.town_purses set coins = 10000 where member_id = $1", [m]); }
  const coins = async (m) => Number((await one("select coins from public.town_purses where member_id = $1", [m])).coins);

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);

  // ── what it says afterwards ──
  eq(await one("select access, open from public.casino_live_settings"), { access: "closed", open: false }, "closed, and open says so");
  eq((await rows("select id from public.casino_live_prizes order by id")).map((r) => r.id), ["cherry", "evercold", "gold", "pair", "popoto", "seven"], "six prizes");
  eq(await one("select active, kind from public.casino_live_prizes where id = 'evercold'"), { active: false, kind: "physical" }, "the evercold is there, unused");
  eq(await one("select active, kind, amount from public.casino_live_prizes where id = 'pair'"), { active: false, kind: "coin", amount: 50 }, "the pair is there, unused, coins");
  refused(await as(null, "update public.casino_live_prizes set kind = 'gil' where id = 'pair' returning 1 r", [], "postgres"), "pair_coin", "the pair is never anything but coins");
  eq((await one("select count(*)::int n from pg_policies where schemaname = 'realtime' and policyname in ('town_maps_receive', 'town_maps_send') and (coalesce(qual, '') || coalesce(with_check, '')) like '%casino%'")).n, 2, "both map policies name the casino");
  eq((await rows("select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1")).map((r) => r.tablename), ["town_casino_announcements"], "the casino's tables leave the change feed");
  eq((await one("select count(*)::int n from pg_policies where schemaname = 'realtime' and policyname = 'casino_live_room_write'")).n, 0, "pages no longer send on casino-live");
  ok(await as(M1, "select public.town_zone_topic('casino') is not null r"), "the casino's chat topic, for a member");
  for (const f of ["casino_live_access(text)", "casino_live_wipe_tests()", "casino_live_spin(uuid,integer,text,bigint)"]) {
    eq((await one(`select has_function_privilege('anon', 'public.${f}', 'execute') r`)).r, false, `anon may not call ${f}`);
  }
  eq((await one("select has_function_privilege('authenticated', 'casino.hint(text,jsonb)', 'execute') r")).r, false, "nobody calls the hint");

  const state = (who) => as(who, "select public.casino_live_state() r");
  const rev = async () => Number((await one("select revision from public.casino_live_settings")).revision);
  const spin = async (who, force = null, machine = 1) => {
    // (a machine is busy for 3.6 s and so is its player: the bench's clock is moved past both between spins)
    await db.exec("update public.casino_live_spins set reveal_at = reveal_at - interval '1 hour', created_at = created_at - interval '1 hour'; update public.casino_live_accounts set available_at = now() - interval '1 hour'");
    return as(who, "select public.casino_live_spin($1, $2, $3, $4) r", [uuid(request++), machine, force, await rev()]);
  };
  const save = async (who, patch = {}, prizePatch = {}) => {
    const s = (await state(ADMIN));
    const doc = { title: s.settings.title, access: s.settings.access, mode: s.settings.mode, price: s.settings.price, per_player: s.settings.per_player,
      budget: Number(s.settings.budget), pool_size: s.settings.pool_size, starts_at: s.settings.starts_at, ends_at: s.settings.ends_at,
      prizes: s.prizes.map((p) => ({ ...p, amount: Number(p.amount), chance: Number(p.chance), ...(prizePatch[p.id] ?? {}) })), ...patch };
    return as(who, "select public.casino_live_save($1, $2) r", [s.settings.revision, JSON.stringify(doc)]);
  };

  // ── closed: nobody ──
  refused(await spin(M1), "paused", "closed: a member may not spin");
  refused(await spin(ADMIN), "paused", "closed: nor an admin");
  refused(await as(M1, "select public.casino_live_access('admins') r"), "admin", "a member may not open it");
  refused(await as(UNVER, "select public.casino_live_state() r"), "denied", "an unproved account reads nothing");

  // ── the admins' trial ──
  const r0 = await rev();
  ok((await as(ADMIN, "select public.casino_live_access('admins') r")).settings.access === "admins", "the switch lets the admins in");
  eq(await one("select access, open from public.casino_live_settings"), { access: "admins", open: false }, "open still says no");
  eq(await rev(), r0, "the switch leaves the settings' revision as it was");
  ok((await rows("select event from realtime.sent where topic = 'casino-live'")).some((r) => r.event === "changed"), "the switch is told as 'changed'");
  // set the prizes as the event will have them, the evercold and the pair on
  const saved = await save(ADMIN, {}, { evercold: { active: true, chance: 0.001, stock: 1, name: "Evercold" }, pair: { active: true, chance: 10, amount: 50 } });
  ok(saved && !saved.error, `the desk saves six prizes (${saved?.error ?? "ok"})`);
  refused(await spin(M1), "paused", "while the admins try it a member may not spin");
  const coins0 = await coins(ADMIN), coins0b = await coins(ADMIN2), wallet0 = await one("select balance, earned from public.wallets where profile_id = $1", [ADMIN]);

  // a thing to hand over: the evercold, forced
  await db.exec("delete from realtime.sent");
  const s1 = await spin(ADMIN, "evercold");
  ok(s1 && !s1.error && s1.test === true && s1.forced === true, `an admin forces the evercold, a test (${s1?.error ?? ""})`);
  eq(s1.reels, ["evercold", "evercold", "evercold", "evercold"], "four evercolds on the reels");
  eq(s1.trail, undefined, "what it wrote is not told to the page");
  const win1 = await one("select w.* from public.prize_wins w order by id desc limit 1");
  eq([win1?.winner, win1?.prize_name, win1?.draw, win1?.prize_tier, win1?.prize_id], [ADMIN, "Evercold", "casino", "ultra", null], "it is a prize row of the winner's, from the casino");
  ok(await one("select 1 r from public.notifications where recipient = $1 and kind = 'prize_win' and body = $2", [ADMIN, String(win1?.id)]), "the winner's bell rings");
  eq((await one("select count(*)::int n from public.town_casino_announcements")).n, 0, "a test win is never announced");
  eq((await one("select count(*)::int n from public.casino_live_receipts")).n, 0, "no receipt is written any more");
  const hint = (await rows("select event, payload, private from realtime.sent where topic = 'casino-live'"));
  eq(hint.map((h) => h.event), ["spin"], "the spin is told, once, and nothing else");
  ok(hint[0].private && hint[0].payload.id === s1.id && hint[0].payload.prize.id === "evercold" && !("trail" in hint[0].payload), "with what a page draws of it");
  // the 1-1 thread: claimed, talked about, handed over
  const claimed = await as(ADMIN, "select public.claim_prize($1) r", [win1?.id]);
  ok(claimed && !claimed.error, "the winner claims it");
  ok(await one("select 1 r from public.notifications where recipient = $1 and kind = 'prize_claim' and body = $2", [ADMIN2, String(win1?.id)]), "the other admin is told");
  await as(ADMIN, "insert into public.prize_messages (win_id, author_id, body) values ($1, $2, 'when can we meet?') returning 1 r", [win1?.id, ADMIN], "postgres");
  ok(await one("select 1 r from public.notifications where recipient = $1 and kind = 'prize_ask' and body = $2", [ADMIN2, String(win1?.id)]), "a word in the thread reaches the other admin");
  const st = await state(ADMIN2);
  const w = st.winners.find((x) => x.win_id === Number(win1?.id));
  ok(w && w.test && w.claimed_at && !w.delivered_at && w.prize.id === "evercold", "the admins' list has the winner, claimed, a test");
  eq(st.tests, 1, "one test spin to wipe");
  ok(!("winners" in (await state(M1))) || (await state(M1)).winners.length === 0, "a member sees no list of winners");

  // Gil, forced: into the wallet
  const s2 = await spin(ADMIN, "gold", 2);
  ok(s2 && !s2.error && s2.prize.kind === "gil", `the gold, forced (${s2?.error ?? ""})`);
  const drop = await one("select * from public.wallet_drops order by id desc limit 1");
  eq([drop?.profile_id, drop?.amount, drop?.tier], [ADMIN, 1000000, "super"], "a million Gil paid into the wallet, loud");
  eq(Number((await one("select balance from public.wallets where profile_id = $1", [ADMIN])).balance), Number(wallet0?.balance ?? 0) + 1000000, "the wallet holds it");
  ok(await one("select 1 r from public.notifications where recipient = $1 and kind = 'wallet_drop'", [ADMIN]), "the wallet's bell rings");
  eq(Number((await one("select reserved from public.casino_live_settings")).reserved), 1000000, "the Gil is set aside from the budget");
  // the pair: coins back, by the first two reels
  const before = await coins(ADMIN2);
  const s3 = await spin(ADMIN2, "pair", 3);
  ok(s3 && !s3.error && s3.prize.id === "pair" && s3.reels[0] === s3.reels[1] && s3.reels[2] !== s3.reels[0] && s3.reels[3] !== s3.reels[0], `the pair: the first two alike, neither of the others (${JSON.stringify(s3?.reels)})`);
  eq(await coins(ADMIN2), before - 100 + 50, "the price taken and fifty coins back");
  // misses: never the first two alike
  let unlike = true;
  for (let i = 0; i < 12; i++) { const m = await spin(ADMIN2, "miss", 1 + (i % 5)); if (m.error || m.prize || m.reels[0] === m.reels[1]) unlike = false; }
  ok(unlike, "twelve misses, none with its first two reels alike");
  // forced only in the trial, only weighted
  const coinsBefore = await coins(ADMIN);
  // ── wipe ──
  const before2 = { issued: await rows("select id, issued from public.casino_live_prizes order by id") };
  const wiped = await as(ADMIN2, "select public.casino_live_wipe_tests() r");
  eq([wiped.spins, wiped.wins, wiped.drops], [15, 1, 1], "fifteen test spins wiped, one prize row, one payment");
  eq(await coins(ADMIN), coins0, "the first admin's coins as they were");
  eq(await coins(ADMIN2), coins0b, "the second admin's coins as they were");
  eq((await rows("select id, issued from public.casino_live_prizes where issued > 0")).length, 0, "no stock taken");
  eq(await one("select reserved::int, spins::int from public.casino_live_settings"), { reserved: 0, spins: 0 }, "no Gil set aside, no spins counted");
  eq((await one("select coalesce(sum(spins), 0)::int n from public.casino_live_accounts")).n, 0, "nobody's allowance used");
  eq((await one("select count(*)::int n from public.prize_wins")).n, 0, "the prize row gone");
  eq((await one("select count(*)::int n from public.prize_messages")).n, 0, "its thread gone");
  eq((await one("select count(*)::int n from public.notifications")).n, 0, "every bell of it gone");
  eq(Number((await one("select balance from public.wallets where profile_id = $1", [ADMIN])).balance), Number(wallet0?.balance ?? 0), "the wallet as it was");
  eq((await one("select count(*)::int n from public.wallet_drops")).n, 0, "the payment gone");
  eq((await one("select count(*)::int n from public.casino_live_spins")).n, 0, "the test spins gone");
  ok((await as(ADMIN, "select public.casino_live_wipe_tests() r")).spins === 0, "a wipe with nothing to wipe does nothing");
  void coinsBefore; void before2;
  refused(await as(M1, "select public.casino_live_wipe_tests() r"), "admin", "a member may not wipe");

  // ── everybody ──
  await as(ADMIN, "select public.casino_live_access('everyone') r");
  eq(await one("select access, open from public.casino_live_settings"), { access: "everyone", open: true }, "open to everybody, and open says so");
  refused(await spin(ADMIN, "evercold"), "trial", "no forced result once everybody is in, not even an admin's");
  const sure = await save(ADMIN, {}, { seven: { active: true, chance: 100, stock: 5, announce: true }, evercold: { active: false }, pair: { active: false },
    cherry: { active: false }, gold: { active: false }, popoto: { active: false } });
  ok(sure && !sure.error, `the desk makes the seven all but sure (${sure?.error ?? "ok"})`);
  refused(await save(ADMIN, {}, { seven: { active: true, chance: 99.5 }, popoto: { active: true, chance: 1 } }), "100", "chances over a hundred are refused");
  const s4 = await spin(M1);
  ok(s4 && !s4.error && s4.test === false && s4.prize?.id === "seven", `a member spins and wins (${s4?.error ?? JSON.stringify(s4?.prize)})`);
  ok(await one("select 1 r from public.prize_wins where winner = $1 and draw = 'casino'", [M1]), "the member's prize row");
  eq((await one("select count(*)::int n from public.town_casino_announcements")).n, 1, "a real win is announced");
  ok(!(await state(M2)).error, "another member reads the casino");
  refused(await spin(UNVER), null, "an unproved account may not spin");
  // a hint that cannot be sent stops nothing
  await db.exec("set test.realtime_down = 'on'");
  const s5 = await spin(M2, null, 2);
  await db.exec("reset test.realtime_down");
  ok(s5 && !s5.error, `a spin goes through though its hint could not be sent (${s5?.error ?? ""})`);
  // a trial again, while real spins stand: the wipe takes the trial's and leaves everybody's
  const real = (await one("select count(*)::int n from public.casino_live_spins where not test")).n;
  await as(ADMIN, "select public.casino_live_access('admins') r");
  ok(!(await spin(ADMIN, "miss", 3)).error, "an admin tries it again among real spins");
  eq((await as(ADMIN, "select public.casino_live_wipe_tests() r")).spins, 1, "the one test spin wiped");
  eq((await one("select count(*)::int n from public.casino_live_spins where not test")).n, real, "real spins are never wiped");
  await as(ADMIN, "select public.casino_live_access('everyone') r");

  // ── the desk ──
  refused(await save(ADMIN, {}, { pair: { kind: "gil", active: true, chance: 1, amount: 10 } }), "Invalid prize", "the pair as Gil is refused");
  refused(await save(ADMIN, {}, { seven: { active: false }, pair: { active: true, chance: 60, amount: 200 } }), "average", "coins back over the price are refused");
  refused(await save(ADMIN, {}, { seven: { active: false }, pair: { active: true, chance: 50, amount: 200 } }), "average", "coins back equal to the price are refused");
  const fine = await save(ADMIN, { access: "admins" }, { seven: { active: false }, pair: { active: true, chance: 49, amount: 200 } });
  ok(fine && !fine.error, `coins back just under the price are kept (${fine?.error ?? ""})`);
  eq(await one("select access, open from public.casino_live_settings"), { access: "admins", open: false }, "the desk's save sets who may spin");
  const legacy = await as(ADMIN, "select public.casino_live_save($1, $2) r", [await rev(), JSON.stringify({ ...(await (async () => { const s = await state(ADMIN); return { title: s.settings.title, open: true, mode: "weighted", price: 100, per_player: 100, budget: Number(s.settings.budget), pool_size: s.settings.pool_size, starts_at: null, ends_at: null, prizes: s.prizes.map((p) => ({ ...p, amount: Number(p.amount), chance: Number(p.chance) })) }; })()) })]);
  ok(legacy && !legacy.error && legacy.settings.access === "everyone", "a page that says only `open` opens it to everybody");
  refused(await as(ADMIN, "select public.casino_live_save($1, $2) r", [await rev(), JSON.stringify({ title: "x", access: "everyone", mode: "weighted", price: 100, per_player: 1, budget: 1, pool_size: 10, prizes: [] })]), "Six", "four prizes or none are refused");
  refused(await save(M1), "admin", "a member may not save");
} finally {
  await db.close();
}
console.log(`${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
