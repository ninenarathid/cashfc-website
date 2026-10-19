// v291, a farm of animals, dry-run: the file runs as checked out on Windows (CR at its line ends) and again as written;
// its rules are lib/town/animals' and animal-act's, held to them case by case (the settling of an animal over random
// stretches, gates and speed-ups; the bands; a collection's units; the range; the meadow), and its steps as a member
// takes them: anon refused, a buy, the shop, feeding and petting with the line's points, friend care for helpers points
// (and refused to a stranger), only the owner collecting, a cross, the gate, the meadow, a retried request answered
// once, the kitchen reading a farm egg as an egg, an animal's produce paid by its grade and falling when oversold.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v291.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const A = await import("@/lib/town/animals");
const ACT = await import("@/lib/town/animal-act");
const { FORAGE_BANDS } = await import("@/lib/town/animal-items");

const FILE = process.env.V291_FILE ?? "supabase/v291_a_farm_of_animals.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const near = (a, b, what, tol = 1e-6) => { assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${what}: ${a} against ${b}`); checks++; };
// (the bench as it is after v290, kept between runs: V291_BENCH, built once from the replay when it is not there)
const CACHE = process.env.V291_BENCH;
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
let db;
if (CACHE && existsSync(CACHE)) db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
else {
  db = await rewardDB(252);
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 290; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  if (CACHE) writeFileSync(CACHE, Buffer.from(await (await db.dumpDataDir("none")).arrayBuffer()));
}
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
try {
  eq((await one("select town.reward_relay_place('[60,79]'::jsonb) r")).r, "town", "the bench has v290");
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  // (what it should say afterwards)
  eq((await one("select to_regprocedure('public.town_animals(jsonb,text)') is not null r")).r, true, "the function is there");
  eq((await one(`select town.made_of('[["blueEgg", 1], ["duckEgg", 1], ["oil", 1]]'::jsonb) r`)).r, "omelette", "any egg is an egg");
  eq((await one(`select town.made_of('[["lanternEgg", 2], ["milk", 1], ["sugar", 1]]'::jsonb) r`)).r, "lanternCustard", "a breed's own egg still its own");
  eq((await one(`select town.made_of('[["egg", 2], ["oil", 1]]'::jsonb) r`)).r, "omelette", "the uncle's egg as before");
  eq((await one("select data->'species'->'cow'->>'price' r from public.town_catalog where key = 'animals'")).r, "4000", "the catalog's row");
  eq([Number((await one("select town.grade_pays('farmEgg', 3) r")).r), Number((await one("select town.grade_pays('cream', 3) r")).r), Number((await one("select town.grade_pays('corn', 2) r")).r)], [2.5, 1, 1.75], "grade pay");
  eq((await one("select town.carries_grade('farmMilk') and town.carries_grade('butter') and town.carries_grade('corn') and not town.carries_grade('egg') r")).r, true, "carries a grade");
  const k = (await one("select town.cat('animals') k")).k;
  const things = (await one("select town.market_things((select data from public.town_catalog where key = 'market')) r")).r;
  if (things && things.farmEgg) eq(things.farmEgg[1] < 100 && things.cream[1] === 100, true, "an animal's produce falls; what is made of it does not");

  // ── the rules, held to the page's: the settling ──
  const H = 3_600_000;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const t0 = Number((await one("select town.now_ms() t")).t);
  for (let i = 0; i < 300; i++) {
    const sp = A.SPECIES_IDS[i % 4], breed = A.starterOf(sp).id;
    const at = t0 - Math.floor(rnd() * 60 * H);
    const a = { id: "00000000-0000-4000-8000-" + String(i).padStart(12, "0"), owner: "x", species: sp, breed, name: "", born: at - Math.floor(rnd() * 10 * H), bought: true,
      place: rnd() < 0.8 ? "producing" : "keeping", at, food: Math.floor(rnd() * 25), grown: rnd() < 0.5 ? rnd() * A.adultAt(sp) : A.adultAt(sp), made: rnd() * 4, banked: rnd() < 0.7 ? 0 : 1,
      hearts: Math.floor(rnd() * 200), today: { day: A.dayOf(at), ...(rnd() < 0.3 ? { out: true } : {}) }, speedUntil: rnd() < 0.3 ? at + rnd() * 30 * H : 0,
      windUntil: rnd() < 0.1 ? at + rnd() * 2 * H : 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 0 };
    const gate = rnd() < 0.4 ? [[at + rnd() * 10 * H, rnd() < 0.5 ? null : at + 20 * H]] : [];
    const bottle = rnd() < 0.3, now = at + Math.floor(rnd() * 80 * H) + rnd();
    const ts = A.settle(a, now, { gate, bottle });
    const db_ = (await one("select town.animal_settle($1::jsonb, $2::double precision, $3::jsonb, $4, $5::jsonb) r", [JSON.stringify(a), now, JSON.stringify(gate), bottle, JSON.stringify(k)])).r;
    for (const f of ["food", "grown", "made"]) near(db_[f], ts[f], `settled ${f} #${i}`, 1e-9);
    eq([db_.banked, db_.hearts, db_.outBands, db_.today.day, !!db_.today.out, !!db_.today.hungry], [ts.banked, ts.hearts, ts.outBands, ts.today.day, !!ts.today.out, !!ts.today.hungry], `settled #${i}`);
  }
  for (let i = 0; i < 200; i++) {
    const t = t0 + Math.floor(rnd() * 9 * 24 * H);
    eq((await one("select town.animal_band($1::double precision) r", [t])).r, A.bandOf(t), "a band");
    const play = { hits: Math.floor(rnd() * 20), misses: Math.floor(rnd() * 6), secs: 9 }, game = ["eggs", "shear", "milk"][i % 3], banked = 1 + (i % 3), cracked = i % 2;
    eq((await one("select town.animal_units($1, $2, $3::jsonb, $4) r", [game, banked, JSON.stringify(play), cracked])).r, A.unitsOf(game, banked, play, cracked), `units ${game}`);
    const a = { hearts: Math.floor(rnd() * 220), narrow: [0, 5, 10, 15, 25][i % 5] };
    eq((await one("select town.animal_range($1::jsonb, $2::jsonb) r", [JSON.stringify(a), JSON.stringify(k)])).r, A.rangeOf(a), "the range");
  }
  for (let band = 0; band < 8; band++) for (let spot = 0; spot < A.MEADOW.spots; spot++) {
    eq((await one("select town.animal_forage($1, $2, $3, $4::jsonb) r", [20380 + band, band, spot, JSON.stringify(k)])).r, A.forageAt(FORAGE_BANDS, 20380 + band, band, spot), "the meadow");
  }

  // ── a member's steps ──
  const [me, pal, third] = (await rows("select p.id from public.profiles p order by p.id limit 3")).map((r) => r.id);
  const asOf = (who) => async (q, a = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(q, a)).rows[0].r; } finally { await db.exec("reset role"); } };
  const step = (who) => { const as = asOf(who); return (input, request = null) => as("select public.town_animals($1::jsonb, $2) r", [JSON.stringify(input), request]); };
  const mine = step(me), pals = step(pal);
  // (anon is refused outright)
  await db.exec("set role anon");
  let refused = false;
  try { await db.query(`select public.town_animals('{"action":"look"}'::jsonb)`); } catch (e) { refused = e.code === "42501"; }
  await db.exec("reset role");
  eq(refused, true, "anon may not call it");
  eq((await mine({ action: "look" })).ok, true, "a member looks");
  const give = async (who, coins, stacks) => {
    await asOf(who)("select town.purse_of($1::uuid, false) r", [who]);
    const bag = [...stacks.map(([item, n, grade]) => ({ item, n, ...(grade ? { grade } : {}) })), ...Array(20 - stacks.length).fill(null)];
    await db.query("update public.town_purses set coins = $2, doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{bag}', $3::jsonb) where member_id = $1", [who, coins, JSON.stringify(bag)]);
  };
  await give(me, 100, []);
  eq((await mine({ action: "buy", species: "chicken" })).why, "coins", "a chick dearer than the purse");
  await give(me, 10_000, [["chickFeed", 5], ["seedCorn", 3], ["eggBasket", 1]]);
  const bought = await mine({ action: "buy", species: "chicken" }, "req-buy-0001");
  eq([bought.ok, bought.world.animals.length, bought.world.animals[0].place, bought.world.animals[0].breed], [true, 1, "producing", "barnHen"], "a chick bought");
  const again = await mine({ action: "buy", species: "chicken" }, "req-buy-0001");
  eq([again.ok, (await one("select count(*)::int n from public.town_animals where owner = $1", [me])).n], [true, 1], "a retried buy is the first one");
  eq((await one("select coins::int c from public.town_purses where member_id = $1", [me])).c, 9600, "paid once");
  const chick = bought.world.animals[0].id;
  const fed = await mine({ action: "feed", id: chick, item: "chickFeed" });
  eq([fed.ok, Math.round(fed.world.animals[0].food)], [true, 24], "fed a day");
  eq((await mine({ action: "feed", id: chick, item: "chickFeed" })).why, "full", "a full trough");
  eq((await mine({ action: "pet", id: chick })).ok, true, "petted");
  eq((await mine({ action: "pet", id: chick })).why, "used", "once a day");
  eq(Number((await one("select (kept->>'points')::double precision p from public.town_work where member_id = $1 and line = 'animals'", [me])).p), 25, "the line's points: a feeding and a pet");
  // (friend care: a stranger may not; one named may, from their own bag, for helpers points)
  await give(pal, 0, [["chickFeed", 2]]);
  eq((await pals({ action: "pet", id: chick })).why, "theirs", "a stranger may not care");
  eq((await mine({ action: "care", care: "named", carers: [pal] })).ok, true, "a carer named");
  await db.query("update public.town_animals set a = jsonb_set(a, '{food}', '0') where id = $1", [chick]);
  const cared = await pals({ action: "feed", id: chick, item: "chickFeed" });
  eq(cared.ok, true, "a friend feeds it");
  eq((await one("select count(*)::int n from public.town_deeds where member_id = $1 and what = 'animal_care' and (doc->>'pts')::int = 6", [pal])).n, 1, "a care deed of six points");
  eq((await pals({ action: "collect", id: chick, cracked: 0 })).why, "theirs", "only the owner collects");
  // (a grown hen with eggs waiting: collected with the basket, graded, a manure; then nothing to collect)
  const hen = { ...bought.world.animals[0], grown: A.adultAt("chicken"), banked: 3, hearts: 200, at: t0, today: { day: A.dayOf(t0) } };
  await db.query("update public.town_animals set a = $2::jsonb where id = $1", [chick, JSON.stringify(hen)]);
  const got = await mine({ action: "collect", id: chick, cracked: 1 });
  eq([got.ok, got.got.n, got.got.item], [true, 2, "farmEgg"], "two eggs of three, one cracked");
  eq(got.got.grades.every((q) => q >= 70 && q <= 100), true, "ten hearts: the range 70..100");
  const bag = (await one("select doc->'bag' b from public.town_purses where member_id = $1", [me])).b;
  eq([bag.filter((s) => s?.item === "farmEgg").reduce((t, s) => t + s.n, 0), bag.some((s) => s?.item === "manure")], [2, true], "the eggs and a manure in the bag");
  eq((await mine({ action: "collect", id: chick, cracked: 0 })).why, "nothing", "nothing waiting");
  // (a cross: two grown hens with hearts, the right seed: a child that comes out later, both parents resting)
  const two = await mine({ action: "buy", species: "chicken" });
  const hen2 = two.world.animals.find((x) => x.id !== chick);
  await db.query("update public.town_animals set a = $2::jsonb where id = $1", [hen2.id, JSON.stringify({ ...hen2, grown: A.adultAt("chicken"), hearts: 100 })]);
  await db.query("update public.town_animals set a = a || '{\"hearts\": 100, \"rest\": 0}'::jsonb where id = $1", [chick]);
  const cross = await mine({ action: "breed", a: chick, b: hen2.id, offering: "seedCorn" });
  eq(cross.ok, true, "a cross");
  const child = cross.world.animals.find((x) => x.id !== chick && x.id !== hen2.id);
  eq([child.place, child.born > t0, ["silkie", "barnHen"].includes(child.breed)], ["nursery", true, true], "a child to come, in the nursery");
  eq((await mine({ action: "breed", a: chick, b: hen2.id, offering: "seedCorn" })).why, "rest", "the parents rest");
  eq((await mine({ action: "cradle", id: chick })).why, "gift", "the cradle wants its gift");
  // (the gate: everybody's animals brought to now, the log written)
  const opened = await mine({ action: "gate", open: true });
  eq([opened.ok, opened.world.whole, opened.world.gate.at(-1)[1]], [true, true, null], "the gate opened");
  // (the meadow: a spot a band)
  const f1 = await mine({ action: "forage", spot: 3 });
  eq([f1.ok, (await mine({ action: "forage", spot: 3 })).why], [true, "used"], "a spot once a band");
  // (sold back: a quarter of what it cost)
  const before = (await one("select coins::int c from public.town_purses where member_id = $1", [me])).c;
  eq((await mine({ action: "sell", id: hen2.id })).ok, true, "sold back");
  eq((await one("select coins::int c from public.town_purses where member_id = $1", [me])).c - before, 100, "a quarter of 400");
  // (nobody reaches the tables but through the function)
  for (const tbl of ["town_animals", "town_herds", "town_pasture", "town_animal_asks"]) {
    let no = false;
    await db.exec("set role authenticated");
    try { await db.query(`select * from public.${tbl}`); } catch (e) { no = e.code === "42501"; }
    await db.exec("reset role");
    eq(no, true, `${tbl} closed to members`);
  }
  console.log(`v291: ${checks} checks passed`);
} finally { await db.close(); }
