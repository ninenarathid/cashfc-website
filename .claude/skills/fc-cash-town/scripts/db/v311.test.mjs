// v311, the leaf roll and the shaken branch, dry-run: the file runs twice (CR at its line ends, then as written) and a
// second run changes no function and no catalog row; its catalog against lib/town/catalog's catalogOf() (the `boards`
// row, and the twenty-one merged into the other rows, nothing else of them touched); what a spot holds against heldAt
// over thousands of spots and turns; the haunts and a good garden drawing just what they drew before, none of the
// twenty-one; every deed of the leaf roll and the shaken branch against lib/town/board-insects on the database's clock
// (each refusal of board-insects.test.ts, two takes of one roll, a take with no stamina left, a full bag, a call to the
// town and its news), the insect book noted; town_boards_now; the readers; anon, unproved and no character refused.
// The database's clock is set by the test (town.now_ms is given a stand-in on the bench, which reads `test.now`).
//   cd <the tree> && FC_REPO=<the tree> V311_BENCH=<a bench through v306, as v307.test.mjs keeps it> node .claude/skills/fc-cash-town/scripts/db/v311.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const B = await import("@/lib/town/board-insects");
const LP = await import("@/lib/town/line-points");
const { catalogOf } = await import("@/lib/town/catalog");

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v311_the_leaf_roll_and_the_shaken_branch.sql");
const BASE = "5568ab2b";
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 500)} against ${JSON.stringify(b)?.slice(0, 500)}`); } };
const ok = (v, what) => eq(!!v, true, what);
const CACHE = process.env.V311_BENCH ?? process.env.V310_BENCH ?? process.env.V309_BENCH;
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
const why = (a) => (a?.ok ? "ok" : a?.why);

try {
  // ── what the file stands on: v307, v308, v256's and v299's readers (as v309.test.mjs gives them), v309 and v310 ──
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
  if (!(await one("select to_regclass('public.town_fish_book') is not null as r")).r) await db.exec(supa("v310_the_villages_book_of_fish.sql"));
  await db.exec("update public.town_knobs set value = 1 where key = 'game_open'");
  // (the database's clock, the test's: town.now_ms reads `test.now` when it is set)
  await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as
    $$ select coalesce(nullif(current_setting('test.now', true), '')::bigint, floor(extract(epoch from now()) * 1000)::bigint) $$`);
  let clock = 0;
  const setNow = async (ms) => { clock = ms; await db.query("select set_config('test.now', $1, false)", [String(ms)]); };
  const bagOf = (...things) => JSON.stringify([...things, ...Array(10 - things.length).fill(null)]);
  const setBag = (m, ...things) => db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('bag', $2::jsonb))", [m, bagOf(...things)]);
  const ROD = { item: "rod", n: 1 };

  const catBefore = Object.fromEntries((await rows("select key, data from public.town_catalog")).map((r) => [r.key, r.data]));
  const fnsOf = async () => (await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') order by 1, 2")).map((r) => r.proname + r.d).join();
  const catNow = async () => Object.fromEntries((await rows("select key, data from public.town_catalog")).map((r) => [r.key, r.data]));

  // ── the file, twice ──
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  const runs = (text) => db.exec(text).then(() => true, async (e) => { console.log(`  (${e.message} ${e.where ?? ""})`); await db.exec("rollback"); return false; });
  ok(await runs(sql.replace(/\n/g, "\r\n")), "the file runs (CR at its line ends)");
  const catOnce = await catNow();
  ok(await runs(sql), "and runs again (as written)");
  const after = await fnsOf();
  await db.exec(sql);
  eq(await fnsOf(), after, "a second run changes no function");
  eq(await catNow(), catOnce, "nor a catalog row");

  // ── the catalog, against catalogOf() ──
  const ts = JSON.parse(JSON.stringify(catalogOf())), cat = await catNow(), IDS = new Set(B.BOARD_IDS);
  eq(cat.boards, ts.boards, "the boards row, as lib/town/catalog writes it");
  eq(cat.boards.spots.length, 18, "eighteen spots");
  // (every difference between a row and catalogOf()'s that has to do with the twenty-one: none is left; and nothing else
  // of the rows merged into has changed)
  const diffs = [];
  // (jsonb keeps an object's keys in an order of its own: compared whatever their order)
  const canon = (v) => JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
  const diff = (a, b, path) => {
    if (canon(a) === canon(b)) return;
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${path}.${k}`); return; }
    diffs.push({ path, a, b });
  };
  for (const k of Object.keys(ts)) diff(cat[k], ts[k], k);
  const theirs = diffs.filter((d) => [...IDS].some((id) => d.path.includes(id) || JSON.stringify(d.b ?? null).includes(id) || JSON.stringify(d.a ?? null).includes(id)));
  eq(theirs.map((d) => d.path), [], "nothing of the twenty-one differs from catalogOf()");
  const strip = (doc, key) => {
    const d = JSON.parse(JSON.stringify(doc ?? {})), out = (l) => (Array.isArray(l) ? l.filter((x) => !IDS.has(x)) : l), drop = (o) => o && Object.fromEntries(Object.entries(o).filter(([k]) => !IDS.has(k)));
    if (key === "items") return drop(d);
    if (key === "work") return { ...d, insects: drop(d.insects) };
    if (key === "insects") return { ...d, bugs: drop(d.bugs), order: out(d.order) };
    if (key === "insect_garden") return { ...d, visitors: out(d.visitors), pollinators: out(d.pollinators), predators: out(d.predators) };
    if (key === "quality") return { ...d, skies: drop(d.skies), house: { ...d.house, soilWorkers: out(d.house?.soilWorkers) } };
    return d;
  };
  for (const key of ["items", "work", "insects", "insect_garden", "quality"]) eq(strip(cat[key], key), strip(catBefore[key], key), `${key}: nothing but the twenty-one changed`);
  eq(Object.keys(cat).filter((k) => JSON.stringify(cat[k]) !== JSON.stringify(catBefore[k])).sort(), ["boards", "insect_garden", "insects", "items", "quality", "work"], "and no other row");
  eq(B.BOARD_IDS.filter((id) => id in (cat.insects.garden?.draws ?? {})), [], "a good garden's draws have none of them");

  // ── what a spot holds, against heldAt ──
  const t0 = Date.UTC(2026, 9, 28, 11, 0), T0 = B.turnOf(t0);
  const cases = B.BOARD_SPOTS.flatMap((s) => Array.from({ length: 420 }, (_, k) => [s.id, T0 + k]));
  const heldDb = (await one("select jsonb_agg(town.board_held((c->>0)::integer, (c->>1)::bigint) order by n) r from jsonb_array_elements($1::jsonb) with ordinality x(c, n)", [JSON.stringify(cases)])).r;
  const heldTs = cases.map(([s, t]) => B.heldAt(B.BOARD_SPOTS[s], t));
  const off = cases.filter((_, i) => JSON.stringify(heldDb[i]) !== JSON.stringify(heldTs[i]));
  eq(off.length, 0, `heldAt, ${cases.length} spots and turns (${heldTs.filter((h) => h.length).length} holding)`);
  if (off.length) console.log("   first off:", JSON.stringify(off[0]), JSON.stringify(heldDb[cases.indexOf(off[0])]));
  eq(await one("select town.board_held(99, 1) a, town.board_held(-1, 1) b, town.board_held(null, 1) c"), { a: [], b: [], c: [] }, "no spot holds nothing");

  // ── the haunts and the good gardens draw as before, none of the twenty-one ──
  const haunts = (await one("select jsonb_array_length(data->'haunts') n from public.town_catalog where key = 'insects'")).n;
  const good = (ins) => ({ ...ins, garden: { ...ins.garden, least: 0 } });
  const drawn = async (ins) => (await one(`select jsonb_agg(town.bug_at(h, t, $1::jsonb, 'word') order by t, h) r
      from generate_series(0, $2 - 1) h, unnest($3::bigint[]) t`, [JSON.stringify(ins), haunts, Array.from({ length: 5 }, (_, j) => t0 + j * 37 * 60_000)])).r;
  const gardens = new Set(cat.insects.haunts.map((h, i) => (h[0] === "garden" ? i : -1)).filter((i) => i >= 0));
  for (const [what, pre, post] of [["the haunts", catBefore.insects, cat.insects], ["the haunts, every garden a good one", good(catBefore.insects), good(cat.insects)]]) {
    const a = await drawn(pre), b = await drawn(post);
    eq(b, a, `${what} draw as they did before`);
    eq(b.filter((x) => x && IDS.has(x.bug)).length, 0, `${what}: none of the twenty-one`);
    const inGardens = b.filter((x, i) => x && gardens.has(i % haunts)).length;
    console.log(`  (${what}: ${b.filter(Boolean).length} drawn of ${b.length}, ${inGardens} at the ${gardens.size} gardens' haunts)`);
    if (pre.garden.least === 0) ok(inGardens > 0, "a good garden draws (so its draws are what was checked)");
  }

  // ── the leaf roll ──
  for (const m of [M1, M2, M3]) await setBag(m, ROD);
  const turnRow = async (spot, turn) => (await one("select jsonb_build_object('spot', spot, 'turn', turn, 'opened', opened, 'taken', taken) r from public.town_board_turns where spot = $1 and turn = $2", [spot, turn]))?.r ?? null;
  const fullFor = async (m, id) => (await one("select town.room(town.purse_of($1, false)->'bag', $2) < 1 r", [m, id])).r;
  const rollDo = async (who, action, spotId, at, what) => {
    // (as lib/town/trial's boardRoll: an open is weighed in this turn's record, a take in the one rollTurnOf picks)
    const sp = B.BOARD_SPOTS[spotId], turn = B.turnOf(clock), kept = (await Promise.all([turn - 1, turn].map((k) => turnRow(spotId, k)))).filter(Boolean);
    const t = action === "open" ? kept.find((x) => x.turn === turn) ?? null : B.rollTurnOf(kept, spotId, who, clock), held = sp ? B.heldAt(sp, t?.turn ?? turn)[0] : undefined;
    const bagFull = action === "take" && held ? await fullFor(who, held) : false;
    const a = await asOf(who)("select public.town_board_roll($1, $2, $3, $4) r", [action, spotId, at?.[0] ?? null, at?.[1] ?? null]);
    const twin = action === "open" ? B.openRoll(sp, t, who, at, clock) : B.takeRoll(sp, t, who, at, clock, bagFull);
    eq(a?.ok ? { ok: true, turn: a.turn, ...("held" in a ? { held: a.held } : {}), ...("got" in a ? { got: a.got } : {}) } : { ok: false, why: a?.why }, twin, `${what}: as board-insects has it`);
    return a;
  };
  const spot = B.BOARD_SPOTS.find((s) => s.board === "roll" && s.place === "town");
  const holding = (s, from, more = () => true) => { for (let k = 0; k < 5000; k++) if (B.heldAt(s, from + k).length && more(from + k)) return from + k; throw new Error("no turn"); };
  const rt = holding(spot, T0), at = [spot.x, spot.y + 1];
  const empty = (() => { for (let k = 1; ; k++) if (!B.heldAt(spot, rt + k).length) return rt + k; })();
  await setNow(empty * B.BOARD.turn + 1000);
  eq(why(await rollDo(M1, "open", spot.id, at, "an open of a roll with nothing in it")), "none", "nothing in it this turn");
  eq(why(await rollDo(M1, "take", spot.id, at, "a take of nothing")), "none", "nor anything to take");
  await setNow(rt * B.BOARD.turn + 1000);
  const tree = B.BOARD_SPOTS.find((s) => s.board === "shake");
  eq(why(await rollDo(M1, "open", tree.id, [tree.x, tree.y], "a tree opened as a roll")), "none", "a tree is no roll");
  eq(why(await rollDo(M1, "open", 99, at, "no such spot")), "none", "no such spot");
  eq(why(await asOf(M1)("select public.town_board_roll('pick', $1, $2, $3) r", [spot.id, ...at])), "none", "no such deed");
  eq(why(await rollDo(M1, "open", spot.id, [spot.x + 9, spot.y], "an open from afar")), "far", "near the bush only");
  eq(why(await rollDo(M1, "open", spot.id, null, "an open from nowhere")), "far", "or from somewhere");
  let r = await rollDo(M1, "open", spot.id, at, "the open");
  eq([why(r), r.held], ["ok", B.heldAt(spot, rt)[0]], "opened: what is in it");
  const opened = clock;
  await setNow(opened + 2000);
  r = await rollDo(M1, "open", spot.id, at, "opened again");
  eq(r.turn?.opened?.[M1], opened, "opened again, the first time kept");
  await setNow(opened + B.BOARD.unrollMin - 1);
  eq(why(await rollDo(M1, "take", spot.id, at, "a take too soon")), "soon", "not before four seconds");
  await setNow(opened + B.BOARD.unrollMin);
  eq(why(await rollDo(M2, "take", spot.id, at, "a take by one who never opened it")), "soon", "nor by one who has not opened it");
  eq(why(await rollDo(M1, "take", spot.id, [spot.x + 3, spot.y], "a take from afar")), "far", "near the bush");
  await setBag(M1, ...Array.from({ length: 10 }, () => ROD));
  eq(why(await rollDo(M1, "take", spot.id, at, "a take into a full bag")), "full", "no room, no insect");
  await setBag(M1, ROD);
  const stamina = async (m) => Number((await one("select town.stamina_of(town.purse_of($1, false), town.now_ms()) s", [m])).s);
  const held = async (m, id) => Number((await one("select town.held(town.purse_of($1, false)->'bag', $2) n", [m, id])).n);
  // (an insect had from a board is a net's insect on the insects' line, as lib/town/line-points counts it)
  const netDeed = (thing) => ({ from: "deed", what: "net", thing, n: 1, doc: {} });
  const countsDb = (await one("select jsonb_agg(town.work_counts_of(d, 'x') order by n) r from jsonb_array_elements($1::jsonb) with ordinality x(d, n)", [JSON.stringify(B.BOARD_IDS.map(netDeed))])).r;
  eq(countsDb, B.BOARD_IDS.map((id) => LP.countsOf(netDeed(id), "x")), "each of the twenty-one's net deed counts as countsOf has it");
  eq(B.BOARD_IDS.map((id) => LP.countsOf(netDeed(id), "x")[0]?.raw), B.BOARD_IDS.map((id) => (B.boardRow(id).rare ? 8 : 3)), "a common one 3, a rare one 8");
  const FIRST = Number(cat.work.first);
  const insectPoints = async (m) => Number((await one("select kept->>'points' p from public.town_work where member_id = $1 and line = 'insects'", [m]))?.p ?? 0);
  const firstsOf = async (m) => (await one("select kept->'firsts' f from public.town_work where member_id = $1 and line = 'insects'", [m]))?.f ?? [];
  const gain = async (m, id) => LP.countsOf(netDeed(id), m)[0].raw + ((await firstsOf(m)).includes(`insects:${id}`) ? 0 : FIRST);
  const s0 = await stamina(M1), got = B.heldAt(spot, rt)[0], p0 = await insectPoints(M1), want0 = await gain(M1, got);
  r = await rollDo(M1, "take", spot.id, at, "the take");
  eq(await insectPoints(M1) - p0, want0, "the take on the insects' line: its worth and its first");
  eq([want0, await gain(M1, got)], [LP.countsOf(netDeed(got), M1)[0].raw + FIRST, LP.countsOf(netDeed(got), M1)[0].raw], "its first once: the next of its kind is its worth alone");
  eq((await rows("select thing, doc->>'board' board from public.town_deeds where what = 'net' and member_id = $1", [M1])).map((d) => [d.thing, d.board]), [[got, "roll"]], "a net's deed, the roll's");
  eq([why(r), r.got, r.turn?.taken, await held(M1, got), r.purse?.bag?.some((x) => x?.item === got)], ["ok", got, M1, 1, true], "taken: in my bag, and the purse that has it");
  eq(await stamina(M1), Math.max(0, s0 - 1), "one stamina");
  const book = async () => (await one("select town.thing('bugs', false) b")).b ?? {};
  eq([(await book())[got]?.by, (await book())[got]?.name], [M1, NAME[M1]], "the first of its kind, in the insect book");
  ok((await asOf(M2)("select public.town_bugs() r"))?.book?.[got] === NAME[M1], "and in the book town_bugs tells");
  eq(why(await rollDo(M2, "open", spot.id, at, "an open after the take")), "taken", "had: nobody else has it this turn");
  eq(why(await rollDo(M1, "take", spot.id, at, "a second take")), "taken", "nor twice");
  // the next turn with something in it: anybody's again; two take it, one has it, and with no stamina left
  const rt2 = holding(spot, rt + 1);
  await setNow(rt2 * B.BOARD.turn + 10);
  eq(why(await rollDo(M2, "open", spot.id, at, "the next turn's open")), "ok", "anybody's again the next turn");
  // (a leaf opened is its opener's while their hold runs: nobody else opens it; a re-open keeps the first time)
  const T2 = clock, far2 = [spot.x - 2, spot.y + 2];
  await setNow(T2 + 10);
  eq(why(await rollDo(M3, "open", spot.id, far2, "another's open while the hold runs")), "busy", "nobody else opens it while its opener's hold runs");
  await setNow(T2 + B.BOARD.hold - 1);
  eq(why(await rollDo(M3, "open", spot.id, far2, "another's open at the hold's last moment")), "busy", "to its last moment");
  await setNow(T2 + B.BOARD.hold);
  eq(why(await rollDo(M3, "open", spot.id, far2, "a second opener once the hold is over")), "ok", "two at one roll, one after the other");
  await setNow(T2 + B.BOARD.hold + 10);
  eq(why(await rollDo(M2, "open", spot.id, at, "the first opener again while the second's hold runs")), "busy", "nor the first again while the second's runs");
  await setNow(T2 + 2 * B.BOARD.hold);
  r = await rollDo(M2, "open", spot.id, at, "a re-open after both holds");
  eq([why(r), r.turn?.opened?.[M2]], ["ok", T2], "a re-open keeps the first opening's time");
  await setNow(T2 + 2 * B.BOARD.hold + 10);
  await db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 0)))", [M3]);
  eq(await stamina(M3), 0, "no stamina left");
  const got2 = B.heldAt(spot, rt2)[0], firstBy = (await book())[got2]?.by, p3 = await insectPoints(M3), want3 = await gain(M3, got2);
  r = await rollDo(M3, "take", spot.id, [spot.x - 2, spot.y + 2], "a take with no stamina left");
  eq([why(r), await held(M3, got2), await stamina(M3)], ["ok", 1, 0], "had all the same, with none left to spend");
  eq(await insectPoints(M3) - p3, want3, "and its points, stamina or none");
  eq(why(await rollDo(M2, "take", spot.id, at, "the other's take")), "taken", "of two, one has it");
  eq((await book())[got2]?.by, firstBy ?? M3, "the book keeps who had a kind first");
  // a leaf opened just before its turn's end: its take after the turn is over gives what that turn held, within the hold
  const lt = holding(spot, rt2 + 1), late = (lt + 1) * B.BOARD.turn - 5_000;
  await setNow(late);
  r = await rollDo(M1, "open", spot.id, at, "an open at the turn's end");
  eq([why(r), r.turn?.turn], ["ok", lt], "opened in its turn");
  await setNow(late + 6_000);
  eq(why(await rollDo(M2, "take", spot.id, at, "another's take after the turn of my open")), "none", "another's opening of the turn before is no way in");
  r = await rollDo(M1, "take", spot.id, at, "the take after the turn's end");
  eq([why(r), r.got, r.turn?.turn, r.turn?.taken], ["ok", B.heldAt(spot, lt)[0], lt, M1], "the take after the turn's end: what that turn held");
  eq((await turnRow(spot.id, lt))?.taken, M1, "taken in the turn it was opened in");
  const lt2 = holding(spot, lt + 2), late2 = (lt2 + 1) * B.BOARD.turn - 5_000;
  await setNow(late2);
  eq(why(await rollDo(M1, "open", spot.id, at, "another open at a turn's end")), "ok", "opened");
  await setNow(late2 + B.BOARD.hold);
  eq(why(await rollDo(M1, "take", spot.id, at, "a take once the hold is over")), "none", "once the hold is over, the turn before's leaf is gone");
  eq((await turnRow(spot.id, lt2))?.taken, null, "and nobody has it");

  // ── the shaken branch ──
  const shakeOf = async (id) => (await one("select doc from public.town_board_shakes where id = $1", [id]))?.doc ?? null;
  const latest = async (spotId, turn) => (await one("select doc from public.town_board_shakes where spot = $1 and turn = $2 order by at desc, id desc limit 1", [spotId, turn]))?.doc ?? null;
  const shakeDo = async (who, action, spotId, o = {}, what) => {
    const sp = B.BOARD_SPOTS[spotId];
    // (as lib/town/trial's boardShake: a call is weighed against the tree's latest shake of the turn, whatever id came
    // with it; any other deed's shake by its id, at its own tree)
    let live = o.id && action !== "call" ? await shakeOf(o.id) : await latest(spotId, B.turnOf(clock));
    if (live && live.spot !== spotId) live = null;
    let bagFull = false;
    if (action === "claim" && live && sp) {
      // (room for both of a full sheet's, one slot or two; else for the one due)
      const h = B.heldAt(sp, live.turn), g = who === live.by ? h[0] : h[Math.min(live.caught, h.length) - 1];
      const both = live.caught >= 2 && h.length >= 2;
      const roomOf = async (bag, id) => Number((await one("select town.room($1::jsonb, $2) r", [JSON.stringify(bag), id])).r);
      const bag = (await one("select town.purse_of($1, false)->'bag' b", [who])).b;
      if (!both) { if (g) bagFull = await fullFor(who, g); }
      else if (h[0] === h[1]) bagFull = (await roomOf(bag, h[0])) < 2;
      else bagFull = (await roomOf(bag, h[0])) < 1 || (await roomOf((await one("select town.put($1::jsonb, $2, 1) b", [JSON.stringify(bag), h[0]])).b, h[1])) < 1;
    }
    const a = await asOf(who)("select public.town_board_shake($1, $2, $3, $4, $5, $6, $7) r", [action, spotId, o.id ?? null, o.at?.[0] ?? null, o.at?.[1] ?? null, o.caught ?? null, o.text ?? null]);
    const twin = action === "call" ? B.callShake(sp, live, who, NAME[who], o.at ?? null, clock, a?.shake?.id ?? "s")
      : action === "text" ? B.callForHolder(live, who, o.text, clock)
      : action === "join" ? B.joinShake(sp, live, who, NAME[who], o.at ?? null, clock)
      : action === "end" ? B.endShake(live, who, o.caught ?? 0, clock)
      : B.claimShake(sp, live, who, bagFull);
    eq(a?.ok ? { ok: true, shake: a.shake, ...("words" in a ? { words: a.words } : {}), ...("got" in a ? { got: a.got } : {}), ...("more" in a ? { more: a.more } : {}) } : { ok: false, why: a?.why }, twin, `${what}: as board-insects has it`);
    return a;
  };
  const cherry = B.BOARD_SPOTS.find((s) => s.board === "shake" && s.tree === "cherry");
  const hourOf = (t) => B.bangkokHourOf(t * B.BOARD.turn);
  const st = holding(cherry, T0, (t) => hourOf(t) >= 16 && hourOf(t) < 23), near = [cherry.x + 1, cherry.y];
  await setNow(st * B.BOARD.turn + 1000);
  const go0 = clock;
  eq(why(await shakeDo(M1, "call", spot.id, { at }, "a call at a roll")), "none", "a roll is no tree");
  eq(why(await shakeDo(M1, "call", cherry.id, { at: [cherry.x + 9, cherry.y] }, "a call from afar")), "far", "near the tree only");
  let s = await shakeDo(M1, "call", cherry.id, { at: near }, "the call");
  eq([why(s), s.shake?.by, s.shake?.byName, s.shake?.turn], ["ok", M1, NAME[M1], st], "called");
  const id1 = s.shake.id;
  eq(why(await shakeDo(M2, "call", cherry.id, { at: near }, "a second call")), "busy", "one shake at a tree at a time");
  // the call to the town
  eq(why(await shakeDo(M2, "text", cherry.id, { id: id1, text: "hi" }, "a call to the town not mine")), "theirs", "the shaker calls the town");
  eq(why(await shakeDo(M1, "text", cherry.id, { id: id1 }, "a call of nothing")), "empty", "a call of nothing");
  eq(why(await shakeDo(M1, "text", cherry.id, { id: id1, text: "ก".repeat(121) }, "a call of 121 letters")), "long", "over 120 letters");
  s = await shakeDo(M1, "text", cherry.id, { id: id1, text: "  มาถือผ้า  หน่อย " }, "a call to the town");
  eq([why(s), s.words, s.shake?.calls?.length], ["ok", "มาถือผ้า หน่อย", 1], "a call goes out");
  const told = await rows("select member_id, subject, name, toward from public.town_announcements where kind = 'shake'");
  eq(told.map((x) => [x.member_id, x.subject, x.name, x.toward]), [[M1, "มาถือผ้า หน่อย", NAME[M1], { hook: id1, x: cherry.x, y: cherry.y }]], "as the town's news, with the way to the tree");
  eq(why(await shakeDo(M1, "text", cherry.id, { id: id1, text: "again" }, "a call too soon")), "soon", "a minute between calls");
  const kinds = async (fn) => ((await asOf(M2)(`select public.${fn}(null, null) r`))?.events ?? []).map((e) => e.kind);
  const shown = (await asOf(M2)("select public.town_announcements_v309(null, null) r"))?.events?.filter((e) => e.kind === "shake") ?? [];
  eq(shown.map((e) => e.to), [{ hook: id1, x: cherry.x, y: cherry.y }], "v309's reader has it, with its `to`");
  for (const fn of ["town_announcements_v299", "town_announcements_v256", "town_announcements"]) eq((await kinds(fn)).filter((k) => k === "shake" || k === "giant"), [], `${fn} has no shake or giant`);
  // the sheet held
  eq(why(await shakeDo(M1, "join", cherry.id, { id: id1, at: near }, "the shaker holds the sheet")), "self", "another holds the sheet");
  eq(why(await shakeDo(M2, "join", cherry.id, { id: id1, at: [cherry.x + 9, cherry.y] }, "a join from afar")), "far", "near the tree");
  await setNow(go0 + 1000);
  s = await shakeDo(M2, "join", cherry.id, { id: id1, at: near }, "the join");
  eq([why(s), s.shake?.holder, s.shake?.holderName, s.shake?.go], ["ok", M2, NAME[M2], go0 + 1000], "held: the shake begins");
  eq(why(await shakeDo(M3, "join", cherry.id, { id: id1, at: near }, "a second holder")), "late", "one holder");
  eq(why(await shakeDo(M1, "text", cherry.id, { id: id1, text: "x" }, "a call once held")), "late", "no call once it is held");
  eq(why(await shakeDo(M2, "claim", cherry.id, { id: id1 }, "a claim before the end")), "none", "nothing before the end");
  // the end
  eq(why(await shakeDo(M1, "end", cherry.id, { id: id1, caught: 2 }, "the shaker ends it")), "theirs", "the holder says what the sheet caught");
  await setNow(go0 + 1000 + B.BOARD.shakeMin - 1);
  eq(why(await shakeDo(M2, "end", cherry.id, { id: id1, caught: 2 }, "an end too soon")), "soon", "not before five seconds");
  await setNow(go0 + 1000 + B.BOARD.shakeMin);
  s = await shakeDo(M2, "end", cherry.id, { id: id1, caught: 9 }, "the end");
  eq([why(s), s.shake?.caught], ["ok", B.BOARD.drops], "two at the most");
  eq(why(await shakeDo(M2, "end", cherry.id, { id: id1, caught: 1 }, "a second end")), "late", "once");
  // each one
  const hs = B.heldAt(cherry, st);
  eq(why(await shakeDo(M3, "claim", cherry.id, { id: id1 }, "a stranger's claim")), "theirs", "for the two only");
  // (what two insects earn one after the other: each its worth, and the first of each kind once)
  const gains = async (m, ids) => { const had = new Set(await firstsOf(m)); let n = 0; for (const id of ids) { n += LP.countsOf(netDeed(id), m)[0].raw + (had.has(`insects:${id}`) ? 0 : FIRST); had.add(`insects:${id}`); } return n; };
  const heldBoth = async (m) => hs[0] === hs[1] ? [await held(m, hs[0])] : [await held(m, hs[0]), await held(m, hs[1])];
  for (const m of [M1, M2]) await db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 20)))", [m]);
  const q1 = await insectPoints(M1), w1 = await gains(M1, [hs[0], hs[1]]), sm1 = await stamina(M1);
  s = await shakeDo(M1, "claim", cherry.id, { id: id1 }, "the shaker's claim of a full sheet");
  eq([why(s), s.got, s.more], ["ok", hs[0], hs[1]], "the sheet caught both: the shaker has both, the first and the other");
  eq(await heldBoth(M1), hs[0] === hs[1] ? [2] : [1, 1], "both in the shaker's bag");
  eq(await insectPoints(M1) - q1, w1, "each on the insects' line, each its own");
  eq(sm1 - (await stamina(M1)), 1, "one stamina for the claim");
  eq(why(await shakeDo(M1, "claim", cherry.id, { id: id1 }, "a second claim")), "taken", "once each");
  await setBag(M2, ...Array.from({ length: 10 }, () => ROD));
  eq(why(await shakeDo(M2, "claim", cherry.id, { id: id1 }, "a claim into a full bag")), "full", "no room, no insect");
  // (room for one of the two only, the one I am due first: nothing at all, and nothing changed. Of one kind, a stack
  // with one place left; of two kinds, one empty slot, where the first fits and the other not)
  const stackOf = Number((await one("select (town.cat('items')->$1->>'stack')::int n", [hs[0]])).n);
  if (hs[0] === hs[1]) await setBag(M2, ...Array.from({ length: 9 }, () => ROD), { item: hs[0], n: stackOf - 1 });
  else await setBag(M2, ...Array.from({ length: 9 }, () => ROD));
  ok(!(await fullFor(M2, hs[1])), "the one I am due first would fit");
  const bagWas = (await one("select town.purse_of($1, false) p", [M2])).p, deedsWas = (await one("select count(*)::int n from public.town_deeds where member_id = $1", [M2])).n;
  eq(why(await shakeDo(M2, "claim", cherry.id, { id: id1 }, "a claim with room for one of the two")), "full", "room for one of the two only: full");
  const bagNow = (await one("select town.purse_of($1, false) p", [M2])).p;
  eq([bagNow.bag, bagNow.stamina, (await one("select count(*)::int n from public.town_deeds where member_id = $1", [M2])).n, (await shakeOf(id1)).claimed],
    [bagWas.bag, bagWas.stamina, deedsWas, [M1]], "and nothing changed: the bag, the stamina, the deeds, who has claimed");
  await setBag(M2, ROD);
  const q2 = await insectPoints(M2), w2 = await gains(M2, [hs[1], hs[0]]), sm2 = await stamina(M2);
  s = await shakeDo(M2, "claim", cherry.id, { id: id1 }, "the holder's claim of a full sheet");
  eq([why(s), s.got, s.more, s.shake?.claimed], ["ok", hs[1], hs[0], [M1, M2]], "the holder has both too, the second and the first");
  eq(await heldBoth(M2), hs[0] === hs[1] ? [2] : [1, 1], "both in the holder's bag");
  eq(await insectPoints(M2) - q2, w2, "and the holder's, each its own");
  eq(sm2 - (await stamina(M2)), 1, "one stamina");
  eq((await rows("select member_id, thing, doc->>'board' board, doc->>'shake' shake from public.town_deeds where what = 'net' and doc->>'shake' = $1 order by id", [id1])).map((d) => [d.member_id, d.thing, d.board]),
    [[M1, hs[0], "shake"], [M1, hs[1], "shake"], [M2, hs[1], "shake"], [M2, hs[0], "shake"]], "a net's deed for each insect, two each, once");
  eq(why(await shakeDo(M3, "call", cherry.id, { at: near }, "a call after the catch")), "taken", "its insects had this turn");
  eq(why(await shakeDo(M3, "call", cherry.id, { id: "s000000000000000", at: near }, "a call with a made-up id after the catch")), "taken", "nor with a made-up id");
  eq(why(await shakeDo(M3, "call", cherry.id, { id: id1, at: near }, "a call naming the shake that gave")), "taken", "nor naming the shake itself");
  eq((await rows("select count(*)::int n from public.town_board_shakes where spot = $1 and turn = $2", [cherry.id, st]))[0].n, 1, "one shake at the tree this turn");
  // one caught: one each, the same one
  const st1 = holding(cherry, st + 1, (t) => hourOf(t) >= 16 && hourOf(t) < 23);
  await setNow(st1 * B.BOARD.turn + 1000);
  const idOne = (await shakeDo(M1, "call", cherry.id, { at: near }, "a call (one to be caught)"))?.shake?.id;
  await setNow(clock + 1000);
  await shakeDo(M2, "join", cherry.id, { id: idOne, at: near }, "a join (one to be caught)");
  await setNow(clock + B.BOARD.shakeMin);
  eq((await shakeDo(M2, "end", cherry.id, { id: idOne, caught: 1 }, "an end with one caught"))?.shake?.caught, 1, "the sheet caught one");
  for (const m of [M1, M2]) await setBag(m, ROD);
  const h1 = B.heldAt(cherry, st1);
  const one1 = await shakeDo(M1, "claim", cherry.id, { id: idOne }, "the shaker's claim of one");
  const one2 = await shakeDo(M2, "claim", cherry.id, { id: idOne }, "the holder's claim of one");
  eq([one1.got, one1.more, one2.got, one2.more], [h1[0], null, h1[0], null], "one each, the same one, and no more");
  eq((await rows("select member_id, thing from public.town_deeds where what = 'net' and doc->>'shake' = $1 order by id", [idOne])).map((d) => [d.member_id, d.thing]),
    [[M1, h1[0]], [M2, h1[0]]], "a net's deed each");
  // nothing caught: nothing to claim, and the tree shaken again
  const st2 = holding(cherry, st1 + 1, (t) => hourOf(t) >= 16 && hourOf(t) < 23);
  await setNow(st2 * B.BOARD.turn + 1000);
  const id2 = (await shakeDo(M1, "call", cherry.id, { at: near }, "a call"))?.shake?.id;
  await setNow(clock + 1000);
  await shakeDo(M3, "join", cherry.id, { id: id2, at: near }, "a join");
  const g2 = clock;
  // (a shake under way keeps its tree till its time is up; begun and never ended, it frees the tree once past it)
  await setNow(g2 + B.BOARD.shake);
  eq(why(await shakeDo(M3, "call", cherry.id, { at: near }, "a call while a shake is under way")), "busy", "a shake under way keeps its tree");
  await setNow(g2 + B.BOARD.shake + 5000);
  eq(why(await shakeDo(M3, "call", cherry.id, { at: near }, "a call at the last moment of its grace")), "busy", "to the end of its grace");
  await setNow(g2 + B.BOARD.shake + 5001);
  eq(why(await shakeDo(M3, "end", cherry.id, { id: id2, caught: 1 }, "an end long after")), "late", "the shake is over in thirty seconds and five");
  const id3 = (await shakeDo(M3, "call", cherry.id, { at: near }, "a call after a shake that never ended"))?.shake?.id;
  ok(id3, "past its time, a shake begun and never ended frees its tree");
  eq(why(await shakeDo(M1, "call", cherry.id, { at: near }, "a call while the new one stands")), "busy", "and the new call holds it");
  eq(why(await shakeDo(M1, "call", cherry.id, { id: "sffffffffffffff0", at: near }, "a call with a made-up id while one stands")), "busy", "a made-up id makes no second call");
  eq(why(await shakeDo(M1, "call", cherry.id, { id: id2, at: near }, "a call naming the old shake")), "busy", "nor an old shake's id");
  await setNow(clock + 1000);
  await shakeDo(M2, "join", cherry.id, { id: id3, at: near }, "a join");
  await setNow(clock + B.BOARD.shakeMin);
  s = await shakeDo(M2, "end", cherry.id, { id: id3, caught: 0 }, "an end with nothing caught");
  eq(s.shake?.caught, 0, "the sheet caught nothing");
  eq(why(await shakeDo(M3, "claim", cherry.id, { id: id3 }, "a claim of nothing")), "none", "nothing to claim");
  await setNow(clock + 20_000);
  const id4 = (await shakeDo(M1, "call", cherry.id, { at: near }, "a call after nothing caught"))?.shake?.id;
  ok(id4, "the tree shaken again in its turn");
  await setNow(clock + B.BOARD.call);
  eq(why(await shakeDo(M2, "join", cherry.id, { id: id4, at: near }, "a join after the call ran out")), "late", "the call stands three minutes");
  // a call near the turn's end: answered after it, while the call stands
  const st3 = holding(cherry, st2 + 1, (t) => hourOf(t) >= 16 && hourOf(t) < 22 && B.heldAt(cherry, t + 1).length > 0);
  const callAt = (st3 + 1) * B.BOARD.turn - 10_000;
  await setNow(callAt);
  const id5 = (await shakeDo(M1, "call", cherry.id, { at: near }, "a call at a turn's end"))?.shake?.id;
  await setNow(callAt + B.BOARD.call);
  eq(why(await shakeDo(M2, "join", cherry.id, { id: id5, at: near }, "a join once the call has run out")), "late", "not once its call has run out");
  await setNow(callAt + 20_000);
  const other = B.BOARD_SPOTS.find((x) => x.board === "shake" && x.id !== cherry.id);
  eq(why(await shakeDo(M3, "join", other.id, { id: id5, at: [other.x + 1, other.y] }, "a join at another tree")), "late", "a shake is its own tree's");
  s = await shakeDo(M2, "join", cherry.id, { id: id5, at: near }, "a join after the turn's end");
  eq([why(s), s.shake?.turn, s.shake?.go], ["ok", st3, callAt + 20_000], "a join after the turn's end, while the call stands");

  // ── the boards now ──
  const now = await asOf(M3)("select public.town_boards_now() r");
  eq([now.turns.length >= 0, now.shakes.map((x) => x.id).includes(id5), now.shakes.every((x) => x.turn >= B.turnOf(clock) - 1)], [true, true, true], "this turn's shakes and the one before's");
  await setNow(rt2 * B.BOARD.turn + 20_000);
  eq((await asOf(M3)("select public.town_boards_now() r")).turns.filter((t) => t.spot === spot.id && t.turn <= rt2).map((t) => [t.turn, t.taken]),
    [...(rt >= rt2 - 1 ? [[rt, M1]] : []), [rt2, M3]], "the spots' turns of this turn and the one before, who took each");
  await setNow((Math.max(st3, lt2) + 10) * B.BOARD.turn);
  eq(await asOf(M3)("select public.town_boards_now() r"), { turns: [], shakes: [] }, "nothing of turns long gone");

  // ── who may ──
  for (const [who, role, name] of [[null, "anon", "anon"], [UNVER, "authenticated", "an unproved member"], [NOCHAR, "authenticated", "a member with no character"]]) {
    eq(why(await asOf(who, role)("select public.town_board_roll('open', 0, 0, 0) r")), "error 42501", `${name} refused the roll`);
    eq(why(await asOf(who, role)("select public.town_board_shake('call', 12) r")), "error 42501", `${name} refused the shake`);
    eq(why(await asOf(who, role)("select public.town_boards_now() r")), "error 42501", `${name} refused the boards`);
  }
  eq(await one(`select has_function_privilege('anon', 'public.town_board_roll(text,integer,integer,integer)', 'EXECUTE') as roll,
         has_function_privilege('anon', 'public.town_board_shake(text,integer,text,integer,integer,numeric,text)', 'EXECUTE') as shake,
         has_function_privilege('anon', 'public.town_boards_now()', 'EXECUTE') as now,
         has_function_privilege('authenticated', 'public.town_board_shake(text,integer,text,integer,integer,numeric,text)', 'EXECUTE') as members`),
    { roll: false, shake: false, now: false, members: true }, "anon may call none of them, members all");
  eq(why(await asOf(M1)("select count(*) r from public.town_board_turns")), "error 42501", "a member reads no turn straight");
  eq(why(await asOf(M1)("select count(*) r from public.town_board_shakes")), "error 42501", "nor a shake");
  eq(why(await asOf(M1)("select town.board_held(0, 1) r")), "error 42501", "nor reaches the rules");
  const { bareWrites } = await import("./bare-writes.mjs");
  eq((await bareWrites(rows)).filter((x) => /board|list_with|announcements_v299/.test(x.fn)), [], "no write of this file's without a WHERE");

  console.log(`v311: ${checks} checks passed${failed ? `, ${failed} FAILED` : ""}.`);
  if (failed) process.exitCode = 1;
} catch (e) { console.error(e.message, e.detail ?? "", e.where ?? "", e.stack?.split("\n").slice(1, 4).join(" | ")); process.exitCode = 1; } finally { await db.close(); }
