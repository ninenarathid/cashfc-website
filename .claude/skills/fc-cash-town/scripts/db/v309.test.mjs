// v309, a giant fish landed together, dry-run: the file runs twice (as checked out on Windows, CR at its line ends, and as
// written) and a second run changes no function; what it should say afterwards; its rules against lib/town/giant-fish
// (the numbers and the twenty, giantsOut, giantOf at every length, giantChance, callWords, settled); the cast's draw
// against the cast as it was, seed for seed (what comes up never changes, a giant only ever where no fish came up, and
// only on an eligible line); the strike that ties a giant to the post (no fight, no stamina, the line taken up) and the
// strikes that do not; every deed of town_giant_fish against giantFish on the database's own clock (the hold run out,
// the calls and their news, the join's reach, the scoops and the frays, the fight's time up, a steak each once, a full
// bag refused); town_giants_now; the readers, v299's without the calls and v309's with their `to`; the steak's market
// band against lib/town/market's thingOf; anon, an unproved member and one with no character refused.
//   cd <the tree> && FC_REPO=<the tree> V309_BENCH=<a bench through v306, as v307.test.mjs keeps it> node .claude/skills/fc-cash-town/scripts/db/v309.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const GF = await import("@/lib/town/giant-fish");
const { BAIT_AS } = await import("@/lib/town/items");
const { FRESH_JUNK } = await import("@/lib/town/fishing");
const MK = await import("@/lib/town/market");
const LP = await import("@/lib/town/line-points");
const { catalogOf } = await import("@/lib/town/catalog");

const ROOT = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? join(ROOT, "supabase/v309_a_giant_fish_landed_together.sql");
const BASE = "5568ab2b";
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 500)} against ${JSON.stringify(b)?.slice(0, 500)}`); } };
const ok = (v, what) => eq(!!v, true, what);
const CACHE = process.env.V309_BENCH;
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
const { execFileSync } = await import("node:child_process");
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
const REALTIME = `
 create schema if not exists realtime;
 grant usage on schema realtime to anon, authenticated;
 create table if not exists realtime.messages (id bigint generated always as identity primary key, extension text not null);
 alter table realtime.messages enable row level security;
 grant select, insert on realtime.messages to anon, authenticated;
 create or replace function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;`;
const supa = (f) => readFileSync(join(ROOT, "supabase", f), "utf8");
let db;
if (CACHE && existsSync(CACHE)) db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
else {
  // (the bench as v307.test.mjs builds it, through v306)
  db = await rewardDB(252);
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  await db.exec(REALTIME);
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
const AT = [0, 23];  // a place on the town's water (no `waters` entry: the town's own)

try {
  // ── what the file stands on, as it stands live: v307 and v308, v256's reader (its admin's account as on the site),
  // and v299's: the casino's part of v299 asks for tables this bench has not, so only its readers are given ──
  for (const f of ["v307_a_giant_pulled_out_together.sql", "v308_what_i_won_at_the_casino_today.sql"]) {
    try { await db.exec(supa(f)); } catch (e) { console.log(`  (${f.slice(0, 4)} did not replay here: ${e.message.slice(0, 100)})`); await db.exec("rollback"); }
  }
  if (!(await one("select to_regprocedure('public.town_announcements_v299(bigint,text)') is not null as r")).r) {
    await db.exec(readFileSync(join(ROOT, ".claude/skills/fc-cash-town/scripts/db/v256-stand-in.sql"), "utf8"));
    await db.exec(supa("v256_ninenine_can_announce_in_town.sql"));
    const v299 = supa("v299_the_casino_in_the_town.sql").replace(/\r\n/g, "\n");
    await db.exec("begin;\n" + v299.slice(v299.indexOf("-- ── 7. a big win told"), v299.indexOf("notify pgrst")) + "commit;");
  }
  await db.exec("update public.town_knobs set value = 1 where key = 'game_open'");
  // (the database's clock, the test's: a night hour, 01:43 in Bangkok, when the town's water with dough has enough of
  // what is no fish for a giant; what a cast brings up is the hour's, and a test of it must not hang on when it is run.
  // town.now_ms reads `test.now`; every time of a hook is moved by goBack, as before)
  await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as
    $$ select coalesce(nullif(current_setting('test.now', true), '')::bigint, floor(extract(epoch from now()) * 1000)::bigint) $$`);
  await db.query("select set_config('test.now', $1, false)", [String(1_793_124_209_631)]);
  // a rod and dough for each angler, and a bag for each netter
  const bagOf = (...things) => JSON.stringify([...things, ...Array(10 - things.length).fill(null)]);
  for (const m of [M1, M2, M3]) await db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('bag', $2::jsonb))", [m, bagOf({ item: "rod", n: 1 }, { item: "dough", n: 20 })]);
  // the cast as it was, kept beside it under another name for the draw's comparison
  const before = (await one("select pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure) d")).d;
  await db.exec(before.replace("FUNCTION public.town_cast(", "FUNCTION public.town_cast_pre309(") + ";\ngrant execute on function public.town_cast_pre309(text,integer,integer,boolean,text,text) to authenticated;");
  const thingsBefore = (await one("select town.market_things(town.market_knobs()) r")).r;
  const fnsOf = async () => (await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') order by 1, 2")).map((r) => r.proname + r.d).join();

  // ── the file, twice ──
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  ok(await db.exec(sql.replace(/\n/g, "\r\n")).then(() => true, (e) => { console.log(`  (${e.message} ${e.where ?? ""})`); return false; }), "the file runs (CR at its line ends)");
  ok(await db.exec(sql).then(() => true, (e) => { console.log(`  (${e.message})`); return false; }), "and runs again (as written)");
  const after = await fnsOf(), catOf = async () => (await rows("select key, data from public.town_catalog order by key")).map((x) => x.key + JSON.stringify(x.data)).join();
  const catAfter = await catOf();
  await db.exec(sql);
  eq(await fnsOf(), after, "a second run changes no function");
  eq(await catOf(), catAfter, "nor a catalog row");

  // ── what it should say afterwards ──
  eq((await one("select data->'giantSteak' r from public.town_catalog where key = 'items'")).r, { kind: "catch", pays: 120, tier: 3, stack: 10 }, "the steak in the catalog");
  eq((await one("select town.market_things(town.market_knobs())->'giantSteak' r")).r, [0, 84, 100, 5, 120, null], "its band");
  eq((await rows(`select position('v309' in p.prosrc) > 0 as r from pg_proc p
     where p.oid in ('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure, 'public.town_strike(integer)'::regprocedure)`)).map((x) => x.r), [true, true], "the cast and the strike written");
  eq(await one(`select has_function_privilege('anon', 'public.town_giant_fish(text,text,integer,integer,text)', 'EXECUTE') as anon_fish,
         has_function_privilege('anon', 'public.town_giants_now()', 'EXECUTE') as anon_now,
         has_function_privilege('authenticated', 'public.town_giant_fish(text,text,integer,integer,text)', 'EXECUTE') as members_fish,
         has_table_privilege('authenticated', 'public.town_giant_hooks', 'SELECT') as members_read_hooks`),
    { anon_fish: false, anon_now: false, members_fish: true, members_read_hooks: false }, "who may call and read");
  ok((await one("select pg_get_constraintdef(oid) r from pg_constraint where conname = 'town_announcements_kind_check'")).r.includes("'giant'::text"), "a call is a kind of announcement");
  eq((await one("select count(*)::int n from public.town_giant_hooks")).n, 0, "no hook yet");
  // (the live database refuses an UPDATE or a DELETE with no WHERE to whoever comes by the API: none in what this file writes)
  const { bareWrites } = await import("./bare-writes.mjs");
  const mine = /^(public\.town_(cast|strike|giant_fish|giants_now|announcements_v299|announcements_v309)|town\.(giant_|giants_|market_knobs|market_things))/;
  eq((await bareWrites(rows)).filter((b) => mine.test(b.fn)), [], "no write of this file's without a WHERE");

  // ── the rules, against lib/town/giant-fish ──
  const { cue, tired, ...numbers } = GF.GIANT;
  eq((await one("select town.giant_rules() r")).r, { ...numbers, rareWeight: GF.RARE_WEIGHT, bait: GF.GIANT_BAIT, baitAs: BAIT_AS, junk: [...FRESH_JUNK],
    rows: GF.GIANT_IDS.map((id) => { const g = GF.GIANTS[id]; return { id, water: g.water, hours: g.hours, rare: !!g.rare, size: g.size, k: g.k }; }) }, "the numbers and the twenty, as lib/town/giant-fish has them");
  const WATERS = ["town", "creek", "headwater", "pool"];
  const outCases = WATERS.flatMap((water) => Array.from({ length: 24 }, (_, hour) => ({ water, hour })));
  eq((await one("select jsonb_agg(town.giants_out(c->>'water', (c->>'hour')::double precision) order by n) r from jsonb_array_elements($1::jsonb) with ordinality x(c, n)", [JSON.stringify(outCases)])).r,
    outCases.map((c) => GF.giantsOut(c.water, c.hour)), "giantsOut, every water at every hour");
  // giantOf: each giant out at each hour picked (the middle of its share), at every length in its range; and the roll's ends
  const ofCases = [];
  for (const { water, hour } of outCases) {
    const out = GF.giantsOut(water, hour), all = out.reduce((s, g) => s + g.w, 0);
    let from = 0;
    for (const g of out) {
      const [lo, hi] = GF.GIANTS[g.id].size;
      for (let i = 0; i <= hi - lo; i++) ofCases.push({ water, hour, r1: (from + g.w / 2) / all, r2: i / (hi - lo) });
      from += g.w;
    }
    for (const r1 of [0, 0.25, 0.5, 0.75, 0.999999]) for (const r2 of [0, 0.37, 0.5, 0.999999]) ofCases.push({ water, hour, r1, r2 });
  }
  const ofDb = (await one("select jsonb_agg(town.giant_of(c->>'water', (c->>'hour')::double precision, (c->>'r1')::double precision, (c->>'r2')::double precision) order by n) r from jsonb_array_elements($1::jsonb) with ordinality x(c, n)", [JSON.stringify(ofCases)])).r;
  const ofTs = ofCases.map((c) => GF.giantOf(c.water, c.hour, c.r1, c.r2));
  const ofOff = ofCases.filter((_, i) => JSON.stringify(ofDb[i]) !== JSON.stringify(ofTs[i]));
  eq(ofOff.length, 0, `giantOf, ${ofCases.length} rolls (every giant at every length of its own)`);
  if (ofOff.length) console.log("   first off:", JSON.stringify(ofOff[0]));
  eq((await one("select town.giant_of('town', 12, 0.5, 0.5) is not null as r")).r, true, "a giant out at noon in the town's water");
  const T = Date.now(), chanceCases = [];
  for (const bait of ["dough", "worm", "minnow", "cricket", "moth", "caterpillar", "zebrafish", "lure", "thingBait"]) for (const water of WATERS) for (const hour of [0, 3, 6, 7, 12, 19, 23])
    for (const junk of [0, 0.01, 0.019999, 0.02, 0.1, 0.55, 1]) for (const last of [null, T - GF.GIANT.every + 1, T - GF.GIANT.every]) for (const star of [false, true]) {
      const b = BAIT_AS[bait] ?? bait;
      chanceCases.push({ b, water, hour, junk, last, star, want: GF.giantChance(b, water, hour, junk, last, T, star) });
    }
  const chanceDb = (await one("select jsonb_agg(town.giant_chance(c->>'b', c->>'water', (c->>'hour')::double precision, (c->>'junk')::double precision, (c->>'last')::bigint, $2::bigint, (c->>'star')::boolean) order by n) r from jsonb_array_elements($1::jsonb) with ordinality x(c, n)", [JSON.stringify(chanceCases), T])).r;
  const chanceOff = chanceCases.filter((c, i) => chanceDb[i] !== c.want);
  eq(chanceOff.length, 0, `giantChance, ${chanceCases.length} casts`);
  if (chanceOff.length) console.log("   first off:", JSON.stringify(chanceOff[0]), chanceDb[chanceCases.indexOf(chanceOff[0])]);
  const texts = ["", "   ", "a", "  มา  ช่วย \t หน่อย  ", "\u3000x\u00a0\u00a0y\u2028z\ufeff", "x\r\ny\vz\f", "ก".repeat(120), "ก".repeat(121), ` ${"ก".repeat(120)} `, "😀".repeat(120), "😀".repeat(121), "a\u0085b", "a\u200bb"];
  eq((await one("select jsonb_agg(town.giant_words(t) order by n) r from jsonb_array_elements_text($1::jsonb) with ordinality x(t, n)", [JSON.stringify(texts)])).r,
    texts.map((t) => GF.callWords(t)), "callWords, word for word");
  eq((await one("select town.giant_words(null) r")).r, null, "no words, no call");
  const h0 = { id: "gx", giant: "sailbackCarp", size: 140, weight: 49.4, by: M1, byName: "x", tile: [1, 2], water: "town", at: T, netter: null, netterName: null, go: 0,
    scoops: [], frays: [], calls: [], end: 0, how: "", claimed: [], seed: 7 };
  const settleCases = [[h0, T + 1], [h0, T + GF.GIANT.hold - 1], [h0, T + GF.GIANT.hold], [{ ...h0, go: T + 9 }, T + 9 + GF.GIANT.fight + GF.GIANT.grace], [{ ...h0, go: T + 9 }, T + 10 + GF.GIANT.fight + GF.GIANT.grace],
    [{ ...h0, how: "landed", end: T + 5 }, T + 10 ** 9]];
  eq((await one("select jsonb_agg(town.giant_settled(c->0, (c->>1)::bigint) order by n) r from jsonb_array_elements($1::jsonb) with ordinality x(c, n)", [JSON.stringify(settleCases)])).r,
    settleCases.map(([h, t]) => GF.settled(h, t)), "settled, the hold and the fight run out");

  // ── the cast: seed for seed, against the cast as it was ──
  const castAs = async (fn, who, seed, bait = "dough") => {
    await db.exec("begin");
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [who]);
      await db.query("select set_config('request.jwt.claim.role','authenticated',true)");
      await db.exec("set local role authenticated");
      await db.query("select setseed($1)", [seed]);
      const a = (await db.query(`select public.${fn}($1, $2, $3) r`, [bait, ...AT])).rows[0].r;
      await db.exec("reset role");
      return { a, line: (await one("select doc from public.town_lines where member_id = $1", [who]))?.doc ?? null };
    } finally { await db.exec("rollback"); }
  };
  const SEEDS = 500;
  let giants = 0, junks = 0, same = 0, onFish = 0;
  let giantSeed = null;
  for (let s = 0; s < SEEDS; s++) {
    const seed = -1 + (2 * s) / SEEDS;
    const was = await castAs("town_cast_pre309", M1, seed), now_ = await castAs("town_cast", M1, seed);
    const pick = (l) => l && { what: l.what, size: l.size, wait: l.wait, nibbles: l.nibbles, bait: l.bait };
    if (JSON.stringify(pick(was.line)) === JSON.stringify(pick(now_.line))) same++;
    if (FRESH_JUNK.includes(was.line?.what)) junks++;
    if (now_.line?.giant) {
      giants++;
      if (!FRESH_JUNK.includes(now_.line.what)) onFish++;
      if (giantSeed === null) giantSeed = seed;
    }
  }
  eq(same, SEEDS, `what comes up, its size and its wait, as before at each of ${SEEDS} seeds`);
  eq(onFish, 0, "a giant only where no fish came up");
  ok(giants > 0 && giantSeed !== null, `giants hooked on some (${giants} of ${junks} casts that brought up no fish, of ${SEEDS})`);
  console.log(`  (the cast: ${giants} giants of ${junks} no-fish casts in ${SEEDS})`);
  // the draw itself: what is eligible, by the odds' share of no fish (2% of these is no fish: a giant is all of it)
  const ODDS = JSON.stringify([{ what: "boot", p: 0.02 }, { what: "carp", p: 0.98 }]), now0 = Number((await one("select town.now_ms() r")).r);
  const onCast = async (o) => (await one("select town.giant_on_cast($1::jsonb, $2, $3, $4, $5, $6, $7) r", [o.odds ?? ODDS, o.what ?? "boot", o.bait ?? "dough", o.water ?? "town", o.hour ?? 12, o.me ?? M2, now0])).r;
  ok((await onCast({}))?.id, "no fish, the water's bait, 2% no fish: a giant");
  ok(GF.GIANTS[(await onCast({ hour: 4 }))?.id]?.water === "town", "one of the town's water's");
  eq(await onCast({ what: "carp" }), null, "never where a fish came up");
  eq(await onCast({ bait: "worm" }), null, "not with another water's bait");
  ok((await onCast({ bait: "moth" }))?.id, "with what stands for its bait (a moth for dough)");
  ok((await onCast({ water: "pool", bait: "grasshopper" }))?.id, "the pool's with a grasshopper for a cricket");
  eq(await onCast({ odds: JSON.stringify([{ what: "boot", p: 0.0199 }, { what: "carp", p: 0.9801 }]) }), null, "not with less than 2% no fish");
  eq(await onCast({ odds: "[]" }), null, "not on nothing");

  // ── the strike: a giant tied to the post ──
  const lineOf = async (m) => (await one("select doc from public.town_lines where member_id = $1", [m]))?.doc ?? null;
  const purseOf = async (m) => (await one("select town.purse_of($1, false) p", [m])).p;
  await db.exec("begin");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [M1]);
  await db.query("select set_config('request.jwt.claim.role','authenticated',true)");
  await db.exec("set local role authenticated");
  await db.query("select setseed($1)", [giantSeed]);
  await db.query("select public.town_cast('dough', $1, $2) r", AT);
  await db.exec("reset role");
  await db.exec("commit");
  const giantLine = await lineOf(M1);
  ok(giantLine?.giant && FRESH_JUNK.includes(giantLine.what), "the cast keeps its giant on the line");
  eq(Object.keys(giantLine.giant ?? {}).sort(), ["id", "size", "weight"], "which, how long and how heavy");
  const setLine = async (m, doc) => db.query("insert into public.town_lines (member_id, doc) values ($1, $2::jsonb) on conflict (member_id) do update set doc = excluded.doc", [m, JSON.stringify(doc)]);
  const onTime = async (m, more = {}) => { const t = Number((await one("select town.now_ms() r")).r); await setLine(m, { ...giantLine, cast_at: t - 9000, bites_at: t, ...more }); };
  const strike = (m, reaction) => asOf(m)("select public.town_strike($1) r", [reaction]);
  const hooks = async () => (await one("select count(*)::int n from public.town_giant_hooks")).n;
  // too soon: as any line, and no hook
  await onTime(M1, { bites_at: Number((await one("select town.now_ms() r")).r) + 10_000 });
  let r = await strike(M1, 100);
  eq([r.ok, r.hooked, r.how, r.giant, await hooks(), await lineOf(M1)], [true, false, "early", undefined, 0, null], "a strike too soon: no giant, the line gone as ever");
  // a bite let go by (no reaction): as ever, what is no fish comes in, and no hook
  await onTime(M1);
  r = await strike(M1, null);
  eq([r.ok, r.giant, await hooks()], [true, undefined, 0], "a bite let go by hooks no giant");
  // struck in time
  await db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('bag', $2::jsonb))", [M1, bagOf({ item: "rod", n: 1 }, { item: "dough", n: 20 })]);
  await onTime(M1);
  const p0 = await purseOf(M1);
  r = await strike(M1, 120);
  const G = r.giant;
  eq([r.ok, r.hooked, r.landed, r.size, r.what], [true, true, false, 0, giantLine.what], "struck in time: hooked, not landed");
  eq(Object.keys(G ?? {}).sort(), ["at", "by", "byName", "calls", "claimed", "end", "frays", "giant", "go", "how", "id", "netter", "netterName", "scoops", "seed", "size", "tile", "water", "weight"].sort(), "the hook in GiantHook's shape");
  eq([G?.giant, G?.size, G?.weight, G?.by, G?.byName, G?.tile, G?.water, G?.netter, G?.go, G?.how, G?.calls, G?.claimed, Number.isInteger(G?.seed)],
    [giantLine.giant.id, giantLine.giant.size, giantLine.giant.weight, M1, NAME[M1], AT, "town", null, 0, "", [], [], true], "the line's giant, the angler, the post");
  eq([await hooks(), await lineOf(M1)], [1, null], "kept for the hold, the line taken up");
  const p1 = await purseOf(M1);
  eq([p1.bag, p1.stamina], [p0.bag, p0.stamina], "no fight: nothing in the bag, no stamina spent");
  // a second giant within twenty minutes: the cast's draw has none for this angler
  eq(await onCast({ me: M1 }), null, "none within twenty minutes of the last");

  // ── every deed against giantFish, on the database's clock ──
  const hookOf = async (id) => (await one("select doc from public.town_giant_hooks where id = $1", [id]))?.doc ?? null;
  // (the database's moment moved on: every time of the hook moved back)
  const goBack = async (id, ms) => db.query(`update public.town_giant_hooks set at = at - $2, doc = doc || jsonb_build_object('at', (doc->>'at')::bigint - $2,
      'go', case when (doc->>'go')::bigint > 0 then (doc->>'go')::bigint - $2 else 0 end, 'end', case when (doc->>'end')::bigint > 0 then (doc->>'end')::bigint - $2 else 0 end,
      'scoops', (select coalesce(jsonb_agg((x::text)::bigint - $2 order by n), '[]'::jsonb) from jsonb_array_elements(doc->'scoops') with ordinality a(x, n)),
      'frays', (select coalesce(jsonb_agg((x::text)::bigint - $2 order by n), '[]'::jsonb) from jsonb_array_elements(doc->'frays') with ordinality a(x, n)),
      'calls', (select coalesce(jsonb_agg((x::text)::bigint - $2 order by n), '[]'::jsonb) from jsonb_array_elements(doc->'calls') with ordinality a(x, n))) where id = $1`, [id, ms]);
  const roomFull = async (m) => (await one("select town.room(town.purse_of($1, false)->'bag', 'giantSteak') < 1 as r", [m])).r;
  const did = async (who, action, id, opts = {}, what) => {
    const was = await hookOf(id), bagFull = action === "claim" ? await roomFull(who) : false;
    const a = await asOf(who)("select public.town_giant_fish($1, $2, $3, $4, $5) r", [action, id, opts.at?.[0] ?? null, opts.at?.[1] ?? null, opts.text ?? null]);
    const twin = GF.giantFish(action, was, who, NAME[who] ?? "", Number(a?.now), { at: opts.at, text: opts.text, bagFull });
    eq(a?.ok ? { ok: true, hook: a.hook, ...(a.steak ? { steak: true } : {}) } : { ok: false, why: a?.why }, twin, `${what}: as giantFish has it`);
    return a;
  };
  const why = (a) => (a?.ok ? "ok" : a?.why);
  const id = G.id, [x, y] = AT;
  eq(why(await did(M1, "look", "gnothere0000000", {}, "a look at no hook")), "none", "no such hook");
  eq(why(await asOf(M1)("select public.town_giant_fish('cast', $1) r", [id])), "none", "no such deed");
  eq(why(await asOf(M1)("select public.town_giant_fish(null, $1) r", [id])), "none", "nor none");
  eq(why(await did(M2, "look", id, {}, "a look")), "ok", "anybody looks");
  // calls
  eq(why(await did(M2, "call", id, { text: "hi" }, "a call not mine")), "theirs", "a call is the angler's");
  eq(why(await did(M1, "call", id, {}, "no words")), "empty", "a call of nothing");
  eq(why(await did(M1, "call", id, { text: "  \t " }, "spaces")), "empty", "a call of spaces");
  eq(why(await did(M1, "call", id, { text: "ก".repeat(121) }, "121 letters")), "long", "over 120 letters");
  r = await did(M1, "call", id, { text: "  มาช่วย  ช้อนหน่อย  " }, "a call");
  eq([why(r), r.hook?.calls?.length], ["ok", 1], "a call goes out");
  const told = await rows("select member_id, kind, subject, name, toward, event_key from public.town_announcements where kind = 'giant'");
  eq(told.map((t) => [t.member_id, t.subject, t.name, t.toward]), [[M1, "มาช่วย ช้อนหน่อย", NAME[M1], { hook: id, x, y }]], "as the town's news: the words, the angler's name, the way to the post");
  eq(why(await did(M1, "call", id, { text: "again" }, "a call too soon")), "soon", "a minute between calls");
  await goBack(id, GF.GIANT.callGap);
  eq(why(await did(M1, "call", id, { text: "ก".repeat(120) }, "a second call")), "ok", "a minute on, 120 letters");
  await goBack(id, GF.GIANT.callGap);
  eq(why(await did(M1, "call", id, { text: "😀".repeat(120) }, "a third call")), "ok", "a third");
  await goBack(id, GF.GIANT.callGap);
  eq(why(await did(M1, "call", id, { text: "four" }, "a fourth call")), "many", "never a fourth");
  eq((await one("select count(*)::int n from public.town_announcements where kind = 'giant'")).n, 3, "three calls told");
  // the readers
  const kinds = async (fn, who = M2) => ((await asOf(who)(`select public.${fn}(null, null) r`))?.events ?? []).filter((e) => e.kind === "giant");
  const full = await kinds("town_announcements_v309");
  eq([full.length, full.every((e) => e.to?.hook === id && e.to.x === x && e.to.y === y)], [3, true], "v309's reader has the calls, each with its `to`");
  eq((await kinds("town_announcements_v299")).length, 0, "v299's, which pages from before ask, has none");
  eq((await kinds("town_announcements_v256")).length, 0, "nor v256's");
  eq((await kinds("town_announcements")).length, 0, "nor v255's");
  eq((await asOf(M2)("select public.town_announcements_v309(null, null) r"))?.events?.filter((e) => e.kind !== "giant").every((e) => !("to" in e)), true, "no other event has a `to`");
  // the join: reach and self
  eq(why(await did(M1, "join", id, { at: AT }, "the angler joins")), "self", "the angler cannot net it");
  eq(why(await did(M2, "join", id, {}, "a join from nowhere")), "far", "a join with no place");
  eq(why(await did(M2, "join", id, { at: [x + 7, y] }, "a join seven tiles off")), "far", "seven tiles off");
  eq(why(await did(M2, "scoop", id, {}, "a scoop before the join")), "soon", "nothing to scoop before the fight");
  eq(why(await did(M1, "fray", id, {}, "a fray before the join")), "soon", "nothing to fray before it");
  r = await did(M2, "join", id, { at: [x + 6, y - 6] }, "a join six tiles off");
  eq([why(r), r.hook?.netter, r.hook?.netterName, r.hook?.go > 0], ["ok", M2, NAME[M2], true], "six tiles off, the netter joins and the fight starts");
  eq(why(await did(M3, "join", id, { at: AT }, "a second netter")), "taken", "one netter");
  eq(why(await did(M1, "call", id, { text: "late" }, "a call in the fight")), "late", "no call once it is netted");
  // scoops
  eq(why(await did(M1, "scoop", id, {}, "the angler scoops")), "theirs", "the netter scoops");
  eq(why(await did(M2, "scoop", id, {}, "a scoop at once")), "soon", "the fish brought in first");
  await goBack(id, GF.GIANT.scoopGap);
  eq(why(await did(M2, "scoop", id, {}, "the first scoop")), "ok", "a scoop");
  eq(why(await did(M2, "scoop", id, {}, "a scoop too soon")), "soon", "six seconds between scoops");
  await goBack(id, GF.GIANT.scoopGap);
  eq(why(await did(M1, "fray", id, {}, "a fray")), "ok", "a fray, the line rubbed");
  eq(why(await did(M2, "fray", id, {}, "the netter frays")), "theirs", "the angler's line frays");
  eq(why(await did(M2, "scoop", id, {}, "the second scoop")), "ok", "a second scoop");
  await goBack(id, GF.GIANT.scoopGap);
  r = await did(M2, "scoop", id, {}, "the third scoop");
  eq([why(r), r.hook?.how, r.hook?.end > 0, r.hook?.scoops?.length], ["ok", "landed", true, 3], "the third lands it");
  eq(why(await did(M2, "scoop", id, {}, "a fourth scoop")), "gone", "landed is landed");
  eq(why(await did(M1, "free", id, {}, "freed when landed")), "gone", "and not let go");
  // steaks
  eq(why(await did(M3, "claim", id, {}, "a stranger's claim")), "theirs", "a steak for the two only");
  const held = async (m) => (await one("select town.held(town.purse_of($1, false)->'bag', 'giantSteak') n", [m])).n;
  // (each steak taken is the giant on its taker's fishing line, as lib/town/line-points counts it)
  const fishing = async (m) => (await one("select kept from public.town_work where member_id = $1 and line = 'fishing'", [m]))?.kept ?? { points: 0, firsts: [] };
  const giantDeed = (thing) => ({ from: "deed", what: "giant", thing, n: 1, doc: {} });
  eq((await one("select town.work_counts_of($1::jsonb, 'x') r", [JSON.stringify(giantDeed(G.giant))])).r, LP.countsOf(giantDeed(G.giant), "x"), "a giant's deed counts as countsOf has it");
  eq((await one("select town.work_counts_of($1::jsonb, 'x') r", [JSON.stringify(giantDeed("notAGiant"))])).r, LP.countsOf(giantDeed("notAGiant"), "x"), "and nothing that is no giant");
  eq((await one("select town.work_counts_of($1::jsonb, 'x') r", [JSON.stringify(giantDeed("glasswakeCarp"))])).r, [{ to: null, raw: 30, line: "fishing", first: "fishing:glasswakeCarp" }], "what it should say afterwards: the rare one a legend's");
  eq(LP.countsOf(giantDeed("glasswakeCarp"), "x"), [{ to: null, raw: 30, line: "fishing", first: "fishing:glasswakeCarp" }], "as countsOf has it");
  eq((await one("select data->'giants' r from public.town_catalog where key = 'work'")).r, JSON.parse(JSON.stringify(catalogOf().work.giants)), "each giant's worth, as linesRow writes it");
  const worth = LP.giantPoints(G.giant), FIRST = Number((await one("select data->>'first' r from public.town_catalog where key = 'work'")).r);
  const pointsOf = async (m) => Number((await fishing(m)).points ?? 0);
  const before1 = await pointsOf(M1), before2 = await pointsOf(M2);
  r = await did(M1, "claim", id, {}, "the angler's claim");
  eq([why(r), r.steak, await held(M1), r.purse?.bag?.some((s) => s?.item === "giantSteak")], ["ok", true, 1, true], "the angler's steak, and the purse that has it");
  eq(why(await did(M1, "claim", id, {}, "a second claim")), "taken", "once each");
  await db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('bag', $2::jsonb))", [M2, bagOf(...Array.from({ length: 10 }, () => ({ item: "rod", n: 1 })))]);
  eq(why(await did(M2, "claim", id, {}, "a full bag's claim")), "full", "no room, no steak");
  await db.query("select town.keep_purse($1, town.purse_of($1, true) || jsonb_build_object('bag', $2::jsonb))", [M2, bagOf({ item: "rod", n: 1 }, { item: "dough", n: 20 })]);
  r = await did(M2, "claim", id, {}, "the netter's claim");
  eq([why(r), await held(M2), r.hook?.claimed], ["ok", 1, [M1, M2]], "the netter's steak");
  eq([await pointsOf(M1) - before1, await pointsOf(M2) - before2], [worth + FIRST, worth + FIRST], "each of the two: the giant's worth on the fishing line, and its first");
  eq([(await fishing(M1)).firsts.includes(`fishing:${G.giant}`), (await fishing(M2)).firsts.includes(`fishing:${G.giant}`)], [true, true], "the first of it noted for each");
  eq((await rows("select member_id, thing from public.town_deeds where what = 'giant' order by id")).map((d) => [d.member_id, d.thing]), [[M1, G.giant], [M2, G.giant]], "a deed each, once");
  // the board: mine ended lately; somebody else's not
  const now = async (m) => (await asOf(m)("select public.town_giants_now() r")) ?? null;
  eq((await now(M1)).map((h) => h.id), [id], "the angler sees the landed one lately");
  eq((await now(M2)).map((h) => h.id), [id], "and the netter");
  eq((await now(M3)).map((h) => h.id), [], "nobody else: it is over");
  await goBack(id, GF.GIANT.after);
  eq((await now(M1)).map((h) => h.id), [], "ten minutes on, not even the angler");
  // the same giant landed again by the two: its worth again, no first
  const strikeAgain = async (m) => { await onTime(m); return (await strike(m, 80))?.giant?.id; };
  const idA = await strikeAgain(M1);
  await did(M2, "join", idA, { at: AT }, "a second giant's join");
  for (let k = 0; k < GF.GIANT.scoops; k++) { await goBack(idA, GF.GIANT.scoopGap); await did(M2, "scoop", idA, {}, `a second giant's scoop ${k + 1}`); }
  eq((await hookOf(idA)).how, "landed", "the same giant landed again");
  const again1 = await pointsOf(M1), again2 = await pointsOf(M2);
  await did(M2, "claim", idA, {}, "the netter's second claim");
  await did(M1, "claim", idA, {}, "the angler's second claim");
  eq([await pointsOf(M1) - again1, await pointsOf(M2) - again2], [worth, worth], "the same giant again: its worth, no first");
  await goBack(idA, GF.GIANT.after);

  // a second giant: held, frayed till it breaks
  const another = async (m) => { await onTime(m); return (await strike(m, 80))?.giant?.id; };
  const id2 = await another(M3);
  ok(id2, "a giant on another line");
  eq((await now(M1)).map((h) => h.id), [id2], "a giant held is everybody's to see");
  eq(why(await did(M1, "join", id2, { at: AT }, "a join")), "ok", "netted");
  r = await did(M3, "fray", id2, {}, "fray one");
  eq(why(await did(M3, "fray", id2, {}, "fray at once")), "soon", "two seconds between frays");
  await goBack(id2, GF.GIANT.frayGap);
  eq(why(await did(M3, "fray", id2, {}, "fray two")), "ok", "a second");
  await goBack(id2, GF.GIANT.frayGap);
  r = await did(M3, "fray", id2, {}, "fray three");
  eq([why(r), r.hook?.how], ["ok", "broke"], "the third breaks the line");
  eq(why(await did(M3, "claim", id2, {}, "a claim of a broken line")), "gone", "no steak of one that got away");
  await goBack(id2, GF.GIANT.after);
  // a third: the hold runs out (ten minutes, the owner's of 2026-10-28; four minutes before)
  eq(GF.GIANT.hold, 600_000, "the hold is ten minutes");
  const id3 = await another(M3);
  await goBack(id3, 240_000);
  eq((await did(M2, "look", id3, {}, "a look at four minutes")).hook?.how, "", "still held at four minutes");
  eq((await asOf(M2)("select public.town_giants_now() r")).map((h) => h.id).includes(id3), true, "and on everybody's board");
  await goBack(id3, GF.GIANT.hold - 240_000 - 1000);
  eq(why(await did(M2, "look", id3, {}, "a look before the hold is over")), "ok", "still held");
  eq((await hookOf(id3)).how, "", "and kept so");
  await goBack(id3, 1000);
  r = await did(M2, "look", id3, {}, "a look after the hold");
  eq([r.hook?.how, r.hook?.end], ["lost", (await hookOf(id3)).at + GF.GIANT.hold], "the hold has run out: lost");
  eq(why(await did(M2, "join", id3, { at: AT }, "a join too late")), "gone", "nobody joins it then");
  eq((await now(M2)).map((h) => h.id), [], "and nobody else sees it");
  eq((await now(M3)).map((h) => h.id), [id3], "but its angler, a while");
  // a fourth: the fight's time runs out; a fifth: let go
  const id4 = await another(M2);
  await did(M1, "join", id4, { at: AT }, "a join");
  await goBack(id4, GF.GIANT.fight + GF.GIANT.grace + 1);
  r = await did(M1, "scoop", id4, {}, "a scoop after the fight");
  eq(why(r), "gone", "the fight's time is up");
  eq((await did(M1, "look", id4, {}, "a look")).hook?.how, "lost", "lost");
  const id5 = await another(M2);
  eq(why(await did(M1, "free", id5, {}, "a stranger lets it go")), "theirs", "only the angler lets it go");
  eq((await did(M2, "free", id5, {}, "the angler lets it go")).hook?.how, "freed", "let go");
  eq(why(await did(M2, "call", id5, { text: "x" }, "a call after")), "gone", "nothing after");

  // ── the market ──
  const fixed = (await one("select town.market_things(town.market_knobs()) r")).r;
  const t = MK.thingOf("giantSteak", MK.factsOf());
  eq({ usual: fixed.giantSteak[0], floor: fixed.giantSteak[1], ceil: fixed.giantSteak[2], batch: fixed.giantSteak[3] }, t, "the steak's band, as lib/town/market's thingOf");
  eq(Math.max(fixed.giantSteak[0] * 40, fixed.giantSteak[3]), Math.max(t.usual * 40, t.batch), "five a round whatever the heads");
  const { giantSteak, ...others } = fixed;
  eq(others, thingsBefore, "every other thing's band as it was");

  // ── who may ──
  for (const [who, role, name] of [[null, "anon", "anon"], [UNVER, "authenticated", "an unproved member"], [NOCHAR, "authenticated", "a member with no character"]]) {
    eq(why(await asOf(who, role)("select public.town_giant_fish('look', $1) r", [id])), "error 42501", `${name} refused a deed`);
    eq(why(await asOf(who, role)("select public.town_giants_now() r")), "error 42501", `${name} refused the board`);
    eq(why(await asOf(who, role)("select public.town_announcements_v309(null, null) r")), "error 42501", `${name} refused the reader`);
  }
  eq(why(await asOf(M1)("select count(*) r from public.town_giant_hooks")), "error 42501", "a member reads no hook straight");
  eq(why(await asOf(M1)("insert into public.town_giant_hooks (id, by_id, at, doc) values ('g000000000000000', $1, 0, '{}') returning 1 r", [M1])), "error 42501", "nor writes one");
  eq(why(await asOf(M1)("select town.giant_of('town', 12, 0.5, 0.5) r")), "error 42501", "nor reaches the rules");
  const kept = (await hookOf(id)).claimed;
  eq(kept, [M1, M2], "the hook as it was");

  console.log(`v309: ${checks} checks passed${failed ? `, ${failed} FAILED` : ""}.`);
  if (failed) process.exitCode = 1;
} catch (e) { console.error(e.message, e.detail ?? "", e.where ?? "", e.stack?.split("\n").slice(1, 4).join(" | ")); process.exitCode = 1; } finally { await db.close(); }
