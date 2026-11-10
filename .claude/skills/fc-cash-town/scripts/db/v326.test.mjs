// v326, barns of eight and sixteen, dry-run on a bench through v325: the look's size measured first on v325 as it is
// (today's pasture and the full one: 24 barns of 16 and every pen full), then the file runs twice (CR at its line ends,
// and as written) and the second run changes no function and no row; the catalog's stages are the code's and nothing
// else of the row changed; every new rule is the page's case by case (lib/town/animals' partsOf, owedOf, partsKept and
// lib/town/animal-act's own); then as members through public.town_animals: a part handed over (credit first), the same
// request again, nothing owed in the bag, more than owed, the last part (the barn grows), a stage paid at once refused a
// delivery and a stage paid in parts refused 'enlarge', the top; a barn taken back that keeps what was handed over, built
// or not, and a barn had again that grows back for the coins alone, stage by stage; the look (no step's lock, its stages,
// another's animal lighter unless I may care for it, a herd without its parts to others, the warm bottle's moment still
// written); a stranger, an unproved member and who may call what. And the look's size after.
//   cd <the tree> && FC_REPO=<the tree> V326_BENCH=<a bench through v325> node .claude/skills/fc-cash-town/scripts/db/v326.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
process.env.FC_REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
await import("./repo-ts-town.mjs");
const { ANIMALS, partsOf, owedOf, partsKept, newHerd, stagesPaid } = await import("@/lib/town/animals");
const { animalAction } = await import("@/lib/town/animal-act");
const T = await import("@/lib/town/trade");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v326_barns_of_eight_and_sixteen.sql";
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(process.env.V326_BENCH)]) });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); } };
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const fns = async () => (await rows("select p.proname, md5(replace(pg_get_functiondef(p.oid),chr(13),'')) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town','public') and p.prokind = 'f' order by 1, 2")).map((r) => r.proname + r.d).join();
const as = async (who, q, a = []) => {
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who === "anon" ? "" : who]);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(who === "anon" ? { role: "anon" } : { sub: who, role: "authenticated" })]);
    await db.exec(`set role ${who === "anon" ? "anon" : "authenticated"}`);
    return { row: (await db.query(q, a)).rows[0] };
  } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const J = (v) => JSON.parse(JSON.stringify(v));
let seed = 326_000;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (list) => list[Math.floor(rnd() * list.length)];
const HOUR = 3_600_000;
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = "00000000-0000-0000-0000-000000000001", B = "00000000-0000-0000-0000-000000000002", C = "00000000-0000-0000-0000-000000000003", UNVER = "00000000-0000-0000-0000-000000000004";
const STAGES = ANIMALS.barns.stages, [, , S3, S4] = STAGES;

try {
  const now = Number((await one("select town.now_ms() n")).n), today = Number((await one("select town.day_of($1::bigint) d", [now])).d);
  // ── the look's size on v325, then after: today's pasture (15 barns, 104 animals) and the full one ──
  const owners = Array.from({ length: 24 }, (_, i) => uuid(900 + i));
  for (const o of owners) { await db.query("insert into auth.users (id) values ($1) on conflict (id) do nothing", [o]); await db.query("insert into public.profiles (id) values ($1) on conflict (id) do nothing", [o]); }
  const BREEDS = [["cow", "dairyCow"], ["sheep", "meadowSheep"], ["chicken", "barnHen"], ["duck", "puddleDuck"], ["cow", "jersey"], ["sheep", "shetland"]];
  const strip = (k) => ({ at: now - k * 20 * HOUR, bands: 37, places: ["barn", "meadow", "garden"], ate: ["corn", "meadowOats", "sweetTimothy"], rain: false, wind: k % 2 === 0, company: true, heart: false, special: null, n: 4 });
  const typical = (i, owner, home) => { const [species, breed] = BREEDS[i % BREEDS.length]; return {
    id: uuid(10_000 + i), owner, species, breed, name: i % 5 ? "" : `Moo ${i}`, born: now - 30 * 24 * HOUR, bought: i % 3 === 0, home, sex: i % 3 ? "f" : "m",
    stats: { thrift: 3, gentle: 4, vigor: 2 }, streak: 6, at: now - 1234567, food: 17.234567891234, grown: 512.3456789, made: 3.456789123, banked: 1, hearts: 143.5,
    today: { day: today, pet: true, treat: false }, speedUntil: 0, windUntil: 0, narrow: 10, rest: 0, lent: null, outside: [], outBands: 3, body: 1.2345678,
    rearing: { was: 120.5, days: 6, pet: 4, treat: 3, out: 2, fed: 6 }, round: { since: now - 5 * HOUR, ate: ["corn", "meadowOats"] }, strips: [strip(1), strip(2), strip(3)] }; };
  const lay = async (barns, inBarn, inPen) => {
    await db.query("delete from public.town_animals where owner = any($1::uuid[])", [owners]);
    await db.query("delete from public.town_herds where owner = any($1::uuid[])", [owners]);
    let i = 0;
    for (let b = 0; b < barns; b++) {
      await db.query("insert into public.town_herds (owner, h, changed) values ($1, $2, 0)", [owners[b], JSON.stringify({ owner: owners[b], barn: b, room: inBarn[b], door: [], credit: 0, lastCare: now, facade: 0, care: "named", carers: [] })]);
      for (let k = 0; k < inBarn[b] + inPen[b]; k++, i++) await db.query("insert into public.town_animals (id, owner, a, changed) values ($1, $2, $3, 0)", [uuid(10_000 + i), owners[b], JSON.stringify(typical(i, owners[b], k < inBarn[b] ? "barn" : "pen"))]);
    }
    return i;
  };
  const size = async () => (await one("select length(town.animal_world($1)::text) n", [C])).n;
  const todays = { barns: 15, inBarn: [...Array(13).fill(4), 2, 2], inPen: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 4] };
  const n0 = await lay(todays.barns, todays.inBarn, todays.inPen), before0 = await size();
  const n1 = await lay(24, Array(24).fill(16), Array(24).fill(8)), before1 = await size();
  console.log(`  the look on v325: today's ${n0} animals ${before0} characters; 24 x 16 and the pens, ${n1} animals, ${before1}`);

  // ── the file, twice ──
  const animalsBefore = (await one("select data from public.town_catalog where key = 'animals'")).data;
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const f1 = await fns(), cat1 = (await one("select data from public.town_catalog where key = 'animals'")).data;
  await db.exec(sql);
  eq(await fns(), f1, "a run again changes no function");
  eq((await one("select data from public.town_catalog where key = 'animals'")).data, cat1, "a run again changes the row no more");

  // the look's size after, on the same pastures
  const after1 = await size();
  await lay(todays.barns, todays.inBarn, todays.inPen);
  const after0 = await size();
  console.log(`  the look on v326: today's ${after0} characters (was ${before0}); the full one ${after1} (was ${before1})`);
  eq(after1 < before1 * 0.75, true, `the full look is lighter (${after1} against ${before1})`);
  await db.query("delete from public.town_animals where owner = any($1::uuid[])", [owners]);
  await db.query("delete from public.town_herds where owner = any($1::uuid[])", [owners]);

  // ── the catalog: the code's stages, and nothing else of the row ──
  const K = (await one("select town.cat('animals') k")).k;
  eq(K.knobs.barns.stages, J(STAGES), "the stages are the code's");
  const strip_ = (d) => ({ ...d, knobs: { ...d.knobs, barns: { ...d.knobs.barns, stages: null } } });
  eq(strip_(K), strip_(animalsBefore), "nothing else of the animals row changed");

  // ── the rules, case by case ──
  const ITEMS_ = ["log", "timber", "stoneTile", "oreIron", "yarn", "salt", "corn"];
  const aBag = () => { let bag = Array.from({ length: 30 }, () => null); for (let k = 0; k < 6; k++) if (rnd() < 0.7) bag = T.put(bag, pick(ITEMS_), 1 + Math.floor(rnd() * 120), Math.floor(rnd() * 4)); return bag; };
  for (let i = 0; i < 150; i++) {
    const bag = aBag(), st = pick(STAGES);
    const has = st.needs.every(([id, n]) => T.held(bag, id) >= n);
    eq((await one("select town.animal_has_all($1, $2) h", [JSON.stringify(bag), JSON.stringify(st)])).h, has, `has_all ${st.room}`);
    if (has) eq((await one("select town.animal_take_all($1, $2) b", [JSON.stringify(bag), JSON.stringify(st)])).b, J(st.needs.reduce((b, [id, n]) => T.take(b, id, n), bag)), `take_all ${st.room}`);
    eq((await one("select town.animal_needs_doc($1) d", [JSON.stringify(st)])).d, Object.fromEntries(st.needs), `needs_doc ${st.room}`);
    const got = Object.fromEntries([["coins", Math.floor(rnd() * st.coins * 1.2)], ...st.needs.map(([id, n]) => [id, rnd() < 0.2 ? -3 : Math.floor(rnd() * n * 1.2)])].filter(() => rnd() < 0.8));
    const herd = { ...newHerd("o"), room: pick([2, 4, 8, 16]), ...(rnd() < 0.8 ? { parts: { [String(st.room)]: got, ...(rnd() < 0.3 ? { "16": { log: 5 } } : {}) } } : {}) };
    eq((await one("select town.animal_parts_of($1, $2) p", [JSON.stringify(herd), st.room])).p, partsOf(herd, st.room), `parts_of ${JSON.stringify(got)}`);
    const owed = owedOf(st, partsOf(herd, st.room));
    eq((await one("select town.animal_owed_none($1, $2) o", [JSON.stringify(st), JSON.stringify(partsOf(herd, st.room))])).o, owed.coins === 0 && !owed.things.length, `owed_none ${st.room}`);
    const kept = partsKept(herd);
    eq((await one("select town.animal_parts_kept($1, town.cat('animals')) k", [JSON.stringify(herd)])).k, Object.keys(kept).length ? { parts: kept } : {}, `parts_kept at ${herd.room}`);
  }

  // ── as members ──
  const purse = async (who, coins, bag) => {
    await db.query("insert into public.town_purses (member_id, coins, doc) values ($1, 0, '{}'::jsonb) on conflict (member_id) do nothing", [who]);
    const p = (await one("select town.purse_of($1, false) p", [who])).p;
    await db.query("update public.town_purses set coins = $2 where member_id = $1", [who, coins]);
    let b = Array.from({ length: Math.max(30, p.bag?.length ?? 10) }, () => null);
    for (const [id, n] of bag) b = T.put(b, id, n);
    await db.query("select town.keep_purse($1, $2::jsonb)", [who, JSON.stringify({ ...p, coins, left: p.left ?? [], bag: b })]);
  };
  const herdRow = (who, h) => db.query("insert into public.town_herds (owner, h, changed) values ($1, $2, 0) on conflict (owner) do update set h = excluded.h", [who, JSON.stringify({ ...newHerd(who), lastCare: now, ...h })]);
  const herdOf = async (who) => (await one("select h from public.town_herds where owner = $1", [who]))?.h;
  const call = async (who, input, request = null) => { const x = await as(who, "select public.town_animals($1::jsonb, $2) r", [JSON.stringify(input), request]); return x.row?.r ?? { error: x.error }; };
  const pursed = async (who) => (await one("select town.purse_of($1, false) p", [who])).p;
  const counts = (bag, ids) => Object.fromEntries(ids.map((id) => [id, T.held(bag ?? [], id)]));
  const IDS = ["log", "timber", "stoneTile", "oreIron", "yarn", "salt"];
  // (the page's own step on the same world and purse, for the same answer)
  const page = (h, coins, bag, input = { action: "deliver" }) => {
    let p = { ...T.newPurse(), coins, bag: Array.from({ length: 30 }, () => null) };
    for (const [id, n] of bag) p = { ...p, bag: T.put(p.bag, id, n) };
    return animalAction({ animals: [], herds: [{ ...newHerd(A), lastCare: now, ...h }], found: {}, spells: [], wagons: [], offers: [], asks: [] }, p, input, { me: A, now, rand: () => 0.5, newId: () => "x", spot: () => [0, 0] });
  };
  const sameAsPage = async (what, h, coins, bag, r) => {
    const ts = page(h, coins, bag), H = await herdOf(A), P = await pursed(A), tsH = ts.world.herds.find((x) => x.owner === A);
    eq([r?.ok, r?.why ?? null], [ts.ok, ts.why ?? null], `${what}: the page's answer`);
    if (!ts.ok) return;
    eq([H.room, H.credit, H.parts ?? null], [tsH.room, tsH.credit, tsH.parts ?? null], `${what}: the herd is the page's`);
    eq([P.coins, counts(P.bag, IDS)], [ts.purse.coins, counts(ts.purse.bag, IDS)], `${what}: the purse is the page's`);
    eq(r?.got, J(ts.got), `${what}: what it gave is the page's`);
  };

  await herdRow(A, { barn: 0, room: 4, credit: 400 });
  await herdRow(B, { barn: 1, room: 2 });
  await purse(B, 9000, [["log", 300]]);
  eq((await call(B, { action: "deliver" }))?.why, "stage", "a barn of 2: its next stage is paid at once, not delivered");
  await purse(A, 600, [["log", 150], ["stoneTile", 25], ["salt", 3]]);
  eq((await call(A, { action: "enlarge" }))?.why, "stage", "a barn of 4: its next stage is not bought at once");
  const req = "req-v326-deliver-one";
  const r1 = await call(A, { action: "deliver" }, req);
  await sameAsPage("a first part", { barn: 0, room: 4, credit: 400 }, 600, [["log", 150], ["stoneTile", 25], ["salt", 3]], r1);
  eq((await herdOf(A)).parts, { 8: { coins: 1000, log: 150, stoneTile: 25 } }, "its parts on the herd: coins of the credit and the purse");
  eq((await call(A, { action: "deliver" }, req))?.got, r1?.got, "the same request again answers its first answer");
  eq([(await herdOf(A)).parts, counts((await pursed(A)).bag, IDS)], [{ 8: { coins: 1000, log: 150, stoneTile: 25 } }, { log: 0, timber: 0, stoneTile: 0, oreIron: 0, yarn: 0, salt: 3 }], "and hands nothing over twice");
  eq((await call(A, { action: "deliver" }))?.why, "nothing", "nothing still owed in the bag, no coins: refused");
  const deed1 = await rows("select what, n, coins, doc from public.town_deeds where member_id = $1 and what like 'animal_%' order by at, id", [A]);
  eq(deed1.map((d) => [d.what, Number(d.n), Number(d.coins)]), [["animal_deliver", 8, -600]], "written down once, with the coins of the purse");
  eq([deed1[0]?.doc?.credit, deed1[0]?.doc?.things, deed1[0]?.doc?.done], [400, { log: 150, stoneTile: 25 }, false], "and the credit's part and the things");
  // more than is owed: only what is owed, and the barn grows
  const hA = await herdOf(A);
  await purse(A, 5000, [["log", 500], ["timber", 100], ["stoneTile", 20], ["oreIron", 30]]);
  const r2 = await call(A, { action: "deliver" });
  await sameAsPage("the last part", { barn: 0, room: 4, credit: 0, parts: hA.parts }, 5000, [["log", 500], ["timber", 100], ["stoneTile", 20], ["oreIron", 30]], r2);
  eq([(await herdOf(A)).room, "parts" in (await herdOf(A)), r2?.got?.grew], [8, false, 8], "the barn houses 8, its parts gone");
  eq((await rows("select what from public.town_deeds where member_id = $1 and what like 'animal_%' order by at, id", [A])).map((d) => d.what).slice(-2), ["animal_deliver", "animal_enlarge"], "the last part and the barn built, written down");
  // the top
  await purse(A, 20_000, S4.needs.map(([id, n]) => [id, n]));
  const r3 = await call(A, { action: "deliver" });
  eq([r3?.ok, (await herdOf(A)).room, r3?.got?.grew, (await pursed(A)).coins], [true, 16, 16, 5000], "16 in one go, with all of it in the bag");
  eq((await call(A, { action: "deliver" }))?.why, "full", "as large as it goes: deliver");
  eq((await call(A, { action: "enlarge" }))?.why, "full", "and enlarge");
  // buying fills it to sixteen, then the pen
  await purse(A, 100_000, []);
  for (let i = 0; i < 16; i++) eq((await call(A, { action: "buy", species: "chicken", sex: "f" }))?.ok, true, `a hen bought ${i + 1}`);
  eq((await one("select count(*) filter (where coalesce(a->>'home', 'barn') <> 'pen')::int b, count(*) filter (where a->>'home' = 'pen')::int p from public.town_animals where owner = $1", [A])), { b: 16, p: 0 }, "sixteen in the barn");
  eq((await call(A, { action: "buy", species: "chicken", sex: "f" }))?.ok, true, "the seventeenth");
  eq((await one("select count(*) filter (where a->>'home' = 'pen')::int p from public.town_animals where owner = $1", [A])).p, 1, "waits in the pen");

  // ── a barn taken back, and had again ──
  await db.query("delete from public.town_herds where owner = any($1::uuid[]) or owner = $2", [owners, B]);
  for (let b = 1; b < 24; b++) await herdRow(owners[b], { barn: b, room: 4 });
  await herdRow(A, { barn: 0, room: 16, lastCare: now - 40 * 24 * HOUR, parts: { "32": { log: 7 } } });
  await purse(C, 5000, [["log", 100], ["stoneTile", 30]]);
  const took = await call(C, { action: "barn", index: 0 });
  eq(took?.ok, true, "a member takes the barn left a month, none free");
  const left = await herdOf(A);
  eq([left.barn, left.room, left.credit], [null, 16, stagesPaid(16)], "its owner keeps the coins of every stage as credit");
  eq(left.parts, { 8: Object.fromEntries(S3.needs), 16: Object.fromEntries(S4.needs), 32: { log: 7 } }, "and every built stage paid in parts as handed over, whatever else was there kept");
  eq((await one("select count(*) filter (where a->>'home' = 'pen')::int p, count(*)::int n from public.town_animals where owner = $1", [A])), { p: 17, n: 17 }, "all seventeen in the pen, past its eight");
  eq((await call(A, { action: "buy", species: "chicken", sex: "f" }))?.why, "barn", "and none bought with no barn");
  // (the told herd: without its credit and parts to another)
  const toC = ((await call(C, { action: "look" }))?.world?.herds ?? []).find((h) => h.owner === A);
  eq(["credit" in toC, "parts" in toC], [false, false], "another is told the herd without its credit and parts");
  // had again: from the credit, stage by stage, the things already handed over
  await db.query("delete from public.town_herds where owner = $1", [owners[5]]);
  await purse(A, 0, [["log", 100], ["stoneTile", 30]]);
  eq((await call(A, { action: "barn", index: 5 }))?.ok, true, "a barn had again, of the credit");
  eq((await call(A, { action: "enlarge" }))?.ok, true, "enlarged to 4, of the credit");
  const g8 = await call(A, { action: "deliver" });
  eq([g8?.ok, g8?.got?.grew, (await herdOf(A)).room, (await herdOf(A)).parts], [true, 8, 8, { 16: Object.fromEntries(S4.needs), 32: { log: 7 } }], "8 back for the coins alone, the 16's parts waiting: no stage skipped");
  const g16 = await call(A, { action: "deliver" });
  eq([g16?.ok, (await herdOf(A)).room, (await herdOf(A)).credit, (await pursed(A)).coins], [true, 16, 0, 0], "16 back, the credit spent to the coin, nothing from the purse");

  // ── the look ──
  const BHEN = uuid(77_001), CHEN = uuid(77_002);
  await db.query("delete from public.town_herds where owner = any($1::uuid[])", [owners]);
  await herdRow(B, { barn: 1, room: 4, care: "named", carers: [] });
  await herdRow(C, { barn: 0, room: 4, care: "named", carers: [A] });
  for (const [id, owner] of [[BHEN, B], [CHEN, C]]) await db.query("insert into public.town_animals (id, owner, a, changed) values ($1, $2, $3, 0) on conflict (id) do update set a = excluded.a", [id, owner, JSON.stringify({ ...typical(1, owner, "barn"), id })]);
  const look = await call(A, { action: "look" });
  eq(look?.world?.stages, J(STAGES), "a look tells the stages");
  const told = (id) => (look?.world?.animals ?? []).find((a) => a.id === id);
  eq(["strips" in told(BHEN), "round" in told(BHEN), "rearing" in told(BHEN), told(BHEN).food, told(BHEN).outBands], [false, false, false, 17.234567891234, 3], "another's animal comes without its strips, round and rearing; the rest as it is");
  eq(["strips" in told(CHEN), "rearing" in told(CHEN)], [true, true], "one I may care for comes whole");
  eq((await call(B, { action: "look" }))?.world?.animals?.find((a) => a.id === BHEN)?.strips?.length, 3, "and my own whole");
  // (a look writes nothing, but the warm bottle's moment: written by a look as by any step)
  await herdRow(B, { barn: 1, room: 4 });
  const pB = await pursed(B), giftsB = { ...(pB.gifts ?? {}), had: [...new Set([...(pB.gifts?.had ?? []), K.gifts?.bottle ?? "thingWarmBottle"])] };
  await db.query("select town.keep_purse($1, $2::jsonb)", [B, JSON.stringify({ ...pB, gifts: giftsB })]);
  const changed0 = (await one("select changed from public.town_herds where owner = $1", [B])).changed;
  eq((await call(B, { action: "look" }))?.ok, true, "a look with the bottle's moment to write");
  eq(typeof (await herdOf(B)).bottleAt, "number", "writes it");
  const changed1 = (await one("select changed from public.town_herds where owner = $1", [B])).changed;
  eq((await call(B, { action: "look" }))?.ok, true, "the next look");
  eq((await one("select changed from public.town_herds where owner = $1", [B])).changed, changed1, "writes nothing");
  eq(changed1 !== changed0, true, "(the first did)");
  // (no lock: a look takes none, the steps still do)
  const def = (await one("select pg_get_functiondef('public.town_animals(jsonb,text)'::regprocedure) d")).d;
  eq(def.indexOf("act = 'look' and not") > 0 && def.indexOf("act = 'look' and not") < def.indexOf("from public.town_pasture where one for update"), true, "a look returns before the pasture's lock");

  // ── who ──
  eq(!!(await as("anon", "select public.town_animals('{\"action\":\"deliver\"}'::jsonb, null) r")).error, true, "anon may not call it");
  const un = await as(UNVER, "select public.town_animals('{\"action\":\"deliver\"}'::jsonb, null) r");
  eq(!!un.error || un.row?.r?.ok === false, true, "an unproved member is refused");
  eq((await call(uuid(424_242), { action: "deliver" }))?.ok ?? false, false, "one with no profile is refused");
  eq((await one(`select has_function_privilege('authenticated', 'public.town_animals(jsonb, text)', 'execute') as member, has_function_privilege('anon', 'public.town_animals(jsonb, text)', 'execute') as anon,
    (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`)),
    { member: true, anon: false, open: 0 }, "who may call what");
  // (the file's "what it should say afterwards")
  eq((await one("select jsonb_array_length(data #> '{knobs,barns,stages}') as stages, data #> '{knobs,barns,stages,2,room}' as third, data #> '{knobs,barns,stages,3,parts}' as parts, data ? 'specials' as specials_kept from public.town_catalog where key = 'animals'")),
    { stages: 4, third: 8, parts: true, specials_kept: true }, "afterwards: the catalog");
  eq((await one(`select position('''deliver''' in pg_get_functiondef('public.town_animals(jsonb,text)'::regprocedure)) > 0 as deliver,
         position('animal_has_all' in pg_get_functiondef('public.town_animals(jsonb,text)'::regprocedure)) > 0 as needs,
         position('''logs''' in pg_get_functiondef('public.town_animals(jsonb,text)'::regprocedure)) = 0 as no_logs,
         position('''stages''' in pg_get_functiondef('town.animal_world(uuid)'::regprocedure)) > 0 as told`)), { deliver: true, needs: true, no_logs: true, told: true }, "afterwards: the functions");
} catch (e) { failed++; console.log("  FAIL (threw)", e); }
console.log(`v326: ${checks} checks, ${failed} failed`);
await db.close();
process.exit(failed ? 1 : 0);
