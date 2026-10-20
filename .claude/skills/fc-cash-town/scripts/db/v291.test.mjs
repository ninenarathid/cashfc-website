// v291, a farm of animals, dry-run: the file runs as checked out on Windows (CR at its line ends) and again as written;
// its rules are lib/town/animals' and animal-act's, held to them case by case (the settling of an animal over random
// stretches, doors, speed-ups, stats and the pen; a child's and a bought animal's stats on the same rolls; a pet's
// hearts; the bands; a collection's units; the range; the meadow), and its steps as a member takes them: anon refused,
// a barn bought (one a member, never another's), a buy of a sex, the shop, feeding and petting with the line's points,
// friend care for helpers points (refused to a stranger), only the owner collecting, a cross of one of each sex, the pen,
// the barn door, an animal handed on, a friend's animal asked for a cross, a barn untended taken back only for one who
// waits when none is free, the meadow, a retried request answered once, the kitchen reading a farm egg as an egg, an
// animal's produce paid by its grade and falling when oversold.
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
const { FORAGE_BANDS } = await import("@/lib/town/animal-items");

const FILE = process.env.MIGRATION_FILE ?? process.env.V291_FILE ?? "supabase/v291_a_farm_of_animals.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
// (each check says FAIL and goes on, as the migration harness's do, so that mutate.mjs can see which ones a break trips)
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 200)} against ${JSON.stringify(b)?.slice(0, 200)}`); } };
const near = (a, b, what, tol = 1e-6) => { if (Math.abs(a - b) <= tol * Math.max(1, Math.abs(b))) checks++; else { failed++; console.log(`  FAIL ${what}: ${a} against ${b}`); } };
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

  // ── the rules, held to the page's ──
  const H = 3_600_000;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stats = () => ({ thrift: 1 + Math.floor(rnd() * 10), gentle: 1 + Math.floor(rnd() * 10), vigor: 1 + Math.floor(rnd() * 10) });
  const t0 = Number((await one("select town.now_ms() t")).t);
  // (the settling: barn or pen, either sex, any stats, a door opened and shut)
  for (let i = 0; i < 300; i++) {
    const sp = A.SPECIES_IDS[i % 4], breed = A.starterOf(sp).id;
    const at = t0 - Math.floor(rnd() * 60 * H);
    const a = { id: "00000000-0000-4000-8000-" + String(i).padStart(12, "0"), owner: "x", species: sp, breed, name: "", born: at - Math.floor(rnd() * 10 * H), bought: true,
      home: rnd() < 0.1 ? "pen" : "barn", sex: rnd() < 0.5 ? "m" : "f", stats: stats(), streak: Math.floor(rnd() * 15),
      at, food: Math.floor(rnd() * 25), grown: rnd() < 0.5 ? rnd() * A.adultAt(sp) : A.adultAt(sp), made: rnd() * 4, banked: rnd() < 0.7 ? 0 : 1,
      hearts: Math.floor(rnd() * 200) + (rnd() < 0.3 ? 0.81 : 0), today: { day: A.dayOf(at), ...(rnd() < 0.3 ? { out: true } : {}) }, speedUntil: rnd() < 0.3 ? at + rnd() * 30 * H : 0,
      windUntil: rnd() < 0.1 ? at + rnd() * 2 * H : 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 0 };
    const door = rnd() < 0.4 ? [[at + rnd() * 10 * H, rnd() < 0.5 ? null : at + 20 * H]] : [];
    const bottle = rnd() < 0.3, now = at + Math.floor(rnd() * 80 * H) + rnd();
    const ts = A.settle(a, now, { door, bottle });
    const db_ = (await one("select town.animal_settle($1::jsonb, $2::double precision, $3::jsonb, $4, $5::jsonb) r", [JSON.stringify(a), now, JSON.stringify(door), bottle, JSON.stringify(k)])).r;
    for (const f of ["food", "grown", "made", "hearts"]) near(db_[f], ts[f], `settled ${f} #${i}`, 1e-9);
    eq([db_.banked, db_.streak, db_.outBands, db_.at, db_.today.day, !!db_.today.out, !!db_.today.hungry], [ts.banked, ts.streak, ts.outBands, ts.at, ts.today.day, !!ts.today.out, !!ts.today.hungry], `settled #${i}`);
  }
  { const thrifty = { id: "00000000-0000-4000-8000-00000000aaaa", owner: "x", species: "chicken", breed: "barnHen", name: "", born: t0 - 20 * H, bought: true, home: "barn", sex: "f",
      stats: { thrift: 10, gentle: 1, vigor: 1 }, streak: 0, at: t0 - 10 * H, food: 10, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: A.dayOf(t0 - 10 * H) }, speedUntil: 0, windUntil: 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 0 };
    const db_ = (await one("select town.animal_settle($1::jsonb, $2::double precision, '[]'::jsonb, false, $3::jsonb) r", [JSON.stringify(thrifty), t0, JSON.stringify(k)])).r;
    eq([Math.round(db_.food * 1000), Math.round(A.settle(thrifty, t0, { door: [] }).food * 1000)], [Math.round((10 - 10 * (1 - 9 * A.ANIMALS.stats.thrift)) * 1000), Math.round((10 - 10 * (1 - 9 * A.ANIMALS.stats.thrift)) * 1000)], "a thrifty animal eats less"); }
  // (a child's stats, a bought animal's, a pet's hearts and how well an animal was cared for: the same on the same rolls)
  for (let i = 0; i < 200; i++) {
    const pa = { stats: stats(), hearts: Math.floor(rnd() * 201), streak: Math.floor(rnd() * 15) }, pb = { stats: stats(), hearts: Math.floor(rnd() * 201), streak: Math.floor(rnd() * 15) };
    const rolls = Array.from({ length: 6 }, () => rnd());
    const list = [...rolls];
    eq((await one("select town.animal_child_stats($1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb) r", [JSON.stringify(pa), JSON.stringify(pb), JSON.stringify(k), JSON.stringify(rolls)])).r,
      A.childStats(pa, pb, () => (list.length ? list.shift() : 0.5)), `child stats #${i}`);
    near(Number((await one("select town.animal_care($1::jsonb, $2::jsonb) r", [JSON.stringify(pa), JSON.stringify(k)])).r), A.careOf(pa), `care #${i}`, 1e-12);
    const three = [rnd(), rnd(), rnd()], b3 = [...three];
    eq((await one("select town.animal_bought_stats($1::jsonb, $2::jsonb) r", [JSON.stringify(k), JSON.stringify(three)])).r, A.boughtStats(() => b3.shift()), `bought stats #${i}`);
    const pet = { stats: stats(), hearts: Math.floor(rnd() * 200) + [0, 0.81, 3.9][i % 3] };
    eq(Number((await one("select town.animal_hearts_plus($1::jsonb, $2, $3::jsonb) r", [JSON.stringify(pet), [3, 2][i % 2], JSON.stringify(k)])).r), A.heartsPlus(pet, [3, 2][i % 2]), `hearts plus #${i}`);
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
  const ids = (await rows("select p.id from public.profiles p order by p.id")).map((r) => r.id);
  const [me, pal, third] = ids;
  const asOf = (who) => async (q, a = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(q, a)).rows[0].r; } finally { await db.exec("reset role"); } };
  // (an error of the database's own, a constraint say, is a refusal too: the step did not come off)
  const step = (who) => { const as = asOf(who); return async (input, request = null) => { try { return await as("select public.town_animals($1::jsonb, $2) r", [JSON.stringify(input), request]); } catch (e) { await db.exec("reset role").catch(() => {}); return { ok: false, why: `error ${e.code}` }; } }; };
  const mine = step(me), pals = step(pal);
  const coinsOf = async (who) => (await one("select coins::int c from public.town_purses where member_id = $1", [who])).c;
  const heldOf = async (who, item) => (await one("select doc->'bag' b from public.town_purses where member_id = $1", [who])).b.filter((s) => s?.item === item).reduce((t, s) => t + s.n, 0);
  const animal = async (id) => (await one("select a from public.town_animals where id = $1", [id]))?.a;
  // (anon is refused outright)
  await db.exec("set role anon");
  let refused = false;
  try { await db.query(`select public.town_animals('{"action":"look"}'::jsonb)`); } catch (e) { refused = e.code === "42501"; }
  await db.exec("reset role");
  eq(refused, true, "anon may not call it");
  eq((await one("select has_function_privilege('anon', 'public.town_animals(jsonb,text)', 'execute') r")).r, false, "anon has no grant to it");
  eq((await mine({ action: "look" })).ok, true, "a member looks");
  const give = async (who, coins, stacks) => {
    await step(who)({ action: "look" });
    const bag = [...stacks.map(([item, n, grade]) => ({ item, n, ...(grade ? { grade } : {}) })), ...Array(20 - stacks.length).fill(null)];
    await db.query("update public.town_purses set coins = $2, doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{bag}', $3::jsonb) where member_id = $1", [who, coins, JSON.stringify(bag)]);
  };
  // (the barns: none, no animals; one of the 24 a member, of coins, logs and stone tiles; never another's)
  await give(me, 20_000, [["chickFeed", 5]]);
  eq((await mine({ action: "buy", species: "chicken", sex: "f" })).why, "barn", "no barn, no animals");
  eq((await mine({ action: "barn", index: 3 })).why, "nothing", "a barn wants logs and stone tiles");
  await give(me, 20_000, [["log", 70], ["stoneTile", 25]]);
  eq((await mine({ action: "barn", index: 24 })).why, "none", "the barns are 24");
  const barn = await mine({ action: "barn", index: 3 }, "req-barn-0001");
  eq([barn.ok, barn.world.herds[0].barn, barn.world.herds[0].door], [true, 3, []], "a barn bought");
  eq([await coinsOf(me), await heldOf(me, "log"), await heldOf(me, "stoneTile")], [14_000, 10, 5], "paid 6,000, 60 logs and 20 stone tiles");
  eq([(await mine({ action: "barn", index: 3 }, "req-barn-0001")).ok, await coinsOf(me)], [true, 14_000], "a retried barn is the first one");
  eq((await mine({ action: "barn", index: 4 })).why, "had", "one barn a member");
  await give(pal, 20_000, [["log", 60], ["stoneTile", 20]]);
  eq((await pals({ action: "barn", index: 3 })).why, "taken", "a barn nobody else's");
  let dup = false;
  try { await db.query("insert into public.town_herds (owner, h, changed) values ($1::uuid, jsonb_build_object('owner', $2::text, 'barn', 3), 0)", [third, third]); } catch (e) { dup = e.code === "23505"; }
  eq(dup, true, "no barn two members', past the function too");
  eq((await pals({ action: "barn", index: 5 })).ok, true, "the friend's barn");
  // (a buy: a sex chosen, stats of 2 to 4, into the barn)
  await give(me, 100, []);
  eq((await mine({ action: "buy", species: "chicken", sex: "f" })).why, "coins", "a chick dearer than the purse");
  await give(me, 10_000, [["chickFeed", 5], ["seedCorn", 3], ["eggBasket", 1]]);
  eq((await mine({ action: "buy", species: "chicken", sex: "x" })).why, "none", "a sex is m or f");
  const bought = await mine({ action: "buy", species: "chicken", sex: "f" }, "req-buy-0001");
  const a0 = bought.world.animals[0];
  eq([bought.ok, bought.world.animals.length, a0.home, a0.sex, a0.breed, A.STAT_IDS.every((s) => a0.stats[s] >= 2 && a0.stats[s] <= 4)], [true, 1, "barn", "f", "barnHen", true], "a hen chick bought");
  const again = await mine({ action: "buy", species: "chicken", sex: "f" }, "req-buy-0001");
  eq([again.ok, (await one("select count(*)::int n from public.town_animals where owner = $1", [me])).n], [true, 1], "a retried buy is the first one");
  eq(await coinsOf(me), 9600, "paid once");
  const chick = a0.id;
  const fed = await mine({ action: "feed", id: chick, item: "chickFeed" });
  eq([fed.ok, Math.round(fed.world.animals[0].food)], [true, 24], "fed a day");
  eq((await mine({ action: "feed", id: chick, item: "chickFeed" })).why, "full", "a full trough");
  eq((await mine({ action: "pet", id: chick })).ok, true, "petted");
  eq((await mine({ action: "pet", id: chick })).why, "used", "once a day");
  eq(Number((await one("select (kept->>'points')::double precision p from public.town_work where member_id = $1 and line = 'animals'", [me])).p), 25, "the line's points: a feeding and a pet");
  eq((await one("select (h->>'lastCare')::double precision > 0 r from public.town_herds where owner = $1", [me])).r, true, "the owner's care written down");
  // (friend care: a stranger may not; one named may, from their own bag, for helpers points)
  await give(pal, 0, [["chickFeed", 2]]);
  eq((await pals({ action: "pet", id: chick })).why, "theirs", "a stranger may not care");
  eq((await mine({ action: "care", care: "named", carers: [pal] })).ok, true, "a carer named");
  await db.query("update public.town_animals set a = jsonb_set(a, '{food}', '0') where id = $1", [chick]);
  const cared = await pals({ action: "feed", id: chick, item: "chickFeed" });
  eq(cared.ok, true, "a friend feeds it");
  eq((await one("select count(*)::int n from public.town_deeds where member_id = $1 and what = 'animal_care' and (doc->>'pts')::int = 6", [pal])).n, 1, "a care deed of six points");
  eq((await pals({ action: "collect", id: chick, cracked: 0 })).why, "theirs", "only the owner collects");
  // (the thirty a day: a friend at twenty-nine has one more point of it)
  await db.query("update public.town_purses set doc = jsonb_set(doc, '{animalCare}', jsonb_build_object('day', $2::int, 'n', 29)) where member_id = $1", [pal, A.dayOf(t0)]);
  await db.query("update public.town_animals set a = jsonb_set(a, '{food}', '0') where id = $1", [chick]);
  await db.query("update public.town_purses set doc = jsonb_set(doc, '{bag}', $2::jsonb) where member_id = $1", [pal, JSON.stringify([{ item: "chickFeed", n: 1 }, ...Array(19).fill(null)])]);
  eq((await pals({ action: "feed", id: chick, item: "chickFeed" })).ok, true, "fed again by the friend");
  eq((await one("select max((doc->>'pts')::int) p from public.town_deeds where member_id = $1 and what = 'animal_care' and id = (select max(id) from public.town_deeds where member_id = $1)", [pal])).p, 1, "thirty a day at most");
  // (a grown hen with eggs waiting: collected with the basket, graded, a manure; then nothing to collect)
  const hen = { ...(await animal(chick)), grown: A.adultAt("chicken"), banked: 3, hearts: 200, at: t0, today: { day: A.dayOf(t0) } };
  await db.query("update public.town_animals set a = $2::jsonb where id = $1", [chick, JSON.stringify(hen)]);
  const got = await mine({ action: "collect", id: chick, cracked: 1 });
  eq([got.ok, got.got.n, got.got.item], [true, 2, "farmEgg"], "two eggs of three, one cracked");
  eq(got.got.grades.every((q) => q >= 70 && q <= 100), true, "ten hearts: the range 70..100");
  eq([await heldOf(me, "farmEgg"), await heldOf(me, "manure")], [2, 1], "the eggs and a manure in the bag");
  eq((await mine({ action: "collect", id: chick, cracked: 0 })).why, "nothing", "nothing waiting");
  // (a rooster gives nothing to collect: grown and fed, nothing banks)
  const roo = (await mine({ action: "buy", species: "chicken", sex: "m" })).world.animals.find((x) => x.id !== chick);
  await db.query("update public.town_animals set a = a || jsonb_build_object('grown', $2::float8, 'food', 24, 'at', $3::float8, 'born', $3::float8) where id = $1", [roo.id, A.adultAt("chicken"), t0 - 20 * H]);
  eq((await mine({ action: "pet", id: roo.id })).world.animals.find((x) => x.id === roo.id).banked, 0, "a rooster lays nothing");
  // (a cross: one of each sex, both grown with hearts, the right seed; a child that comes out later, both parents resting)
  const hen3 = (await mine({ action: "buy", species: "chicken", sex: "f" })).world.animals.find((x) => x.id !== chick && x.id !== roo.id);
  for (const id of [roo.id, hen3.id]) await db.query("update public.town_animals set a = a || jsonb_build_object('grown', $2::float8, 'hearts', 100, 'rest', 0) where id = $1", [id, A.adultAt("chicken")]);
  await db.query("update public.town_animals set a = a || '{\"hearts\": 100, \"rest\": 0}'::jsonb where id = $1", [chick]);
  eq((await mine({ action: "breed", a: chick, b: hen3.id, offering: "seedCorn" })).why, "sex", "a cross is one of each sex");
  const cross = await mine({ action: "breed", a: chick, b: roo.id, offering: "seedCorn" });
  eq(cross.ok, true, "a cross");
  const child = cross.world.animals.find((x) => ![chick, roo.id, hen3.id].includes(x.id));
  eq([child.home, child.born > t0, ["silkie", "barnHen"].includes(child.breed), ["m", "f"].includes(child.sex), A.STAT_IDS.every((s) => child.stats[s] >= 1 && child.stats[s] <= 10)],
    ["barn", true, true, true, true], "a child to come, in the barn, of a sex and stats");
  eq([cross.got.sex, cross.got.stats], [child.sex, child.stats], "its sex and stats told");
  eq((await mine({ action: "breed", a: chick, b: roo.id, offering: "seedCorn" })).why, "rest", "the parents rest");
  eq((await mine({ action: "cradle", id: chick })).why, "gift", "the cradle wants its gift");
  // (four in the barn: the next waits in the pen; the pen is frozen; back to the barn when there is room)
  const fifth = (await mine({ action: "buy", species: "chicken", sex: "f" })).world.animals.find((x) => ![chick, roo.id, hen3.id, child.id].includes(x.id));
  eq(fifth.home, "pen", "past the barn's four, into the pen");
  eq((await mine({ action: "feed", id: fifth.id, item: "chickFeed" })).why, "pen", "nothing done in the pen");
  eq((await mine({ action: "move", id: fifth.id, home: "barn" })).why, "places", "the barn is full");
  eq((await mine({ action: "move", id: hen3.id, home: "pen" })).ok, true, "to the pen");
  eq((await mine({ action: "move", id: fifth.id, home: "barn" })).ok, true, "and another back");
  // (the barn's door: mine alone, my animals settled to now)
  const opened = await mine({ action: "door", open: true });
  eq([opened.ok, opened.world.herds[0].door.at(-1)[1], opened.world.animals.every((x) => x.owner === me)], [true, null, true], "my barn's door opened");
  eq((await pals({ action: "look" })).world.herds.find((h) => h.owner === pal).door, [], "the friend's door as it was");
  eq((await pals({ action: "look" })).world.herds.find((h) => h.owner === me).credit, undefined, "what a barn left its owner is theirs to know");
  // (handing on: offered for a day, taken by the other into their pen, its hearts with it)
  eq((await mine({ action: "offer", id: hen3.id, to: me })).why, "none", "not to myself");
  const offered = await mine({ action: "offer", id: hen3.id, to: pal });
  eq([offered.ok, offered.world.offers.length], [true, 1], "offered");
  eq((await mine({ action: "offer", id: hen3.id, to: pal })).why, "used", "offered once");
  eq((await pals({ action: "look" })).world.offers.length, 1, "the other is told");
  eq((await step(third)({ action: "look" })).world.offers.length, 0, "nobody else is");
  const oid = offered.world.offers[0].id;
  eq((await step(third)({ action: "take", offer: oid, yes: true })).why, "none", "a third may not take it");
  const taken = await pals({ action: "take", offer: oid, yes: true });
  eq([taken.ok, taken.world.animals[0].owner, taken.world.animals[0].home, taken.world.animals[0].hearts, taken.world.offers.length], [true, pal, "pen", 100, 0], "taken into the other's pen");
  eq((await one("select owner::text o from public.town_animals where id = $1", [hen3.id])).o, pal, "its row is the other's");
  eq((await mine({ action: "pet", id: hen3.id })).why, "theirs", "no longer mine");
  // (a friend's animal asked for a cross: lent an hour on their yes, for that cross; the child the host's)
  await db.query("update public.town_animals set a = a || '{\"rest\": 0}'::jsonb where id = $1", [roo.id]);
  eq((await pals({ action: "ask", mine: hen3.id, theirs: roo.id })).why, "pen", "not from the pen");
  eq((await pals({ action: "move", id: hen3.id, home: "barn" })).ok, true, "into the friend's barn");
  eq((await pals({ action: "breed", a: hen3.id, b: roo.id, offering: null })).why, "lent", "a friend's animal unasked");
  const asked = await pals({ action: "ask", mine: hen3.id, theirs: roo.id });
  eq([asked.ok, asked.world.asks.length], [true, 1], "asked");
  const qid = asked.world.asks[0].id;
  eq((await pals({ action: "answer", ask: qid, yes: true })).why, "none", "the host does not answer their own ask");
  const lent = await mine({ action: "answer", ask: qid, yes: true });
  eq([lent.ok, lent.world.animals[0].lent?.to, lent.world.animals[0].lent?.with, lent.world.asks.length], [true, pal, hen3.id, 0], "lent for that cross");
  await give(pal, 1000, []);
  const fcross = await pals({ action: "breed", a: hen3.id, b: roo.id, offering: null });
  eq(fcross.ok, true, "the friend's cross");
  eq([fcross.world.animals.find((x) => ![hen3.id, roo.id].includes(x.id))?.owner, (await animal(roo.id)).lent], [pal, null], "the child the host's, the loan over");
  // (the meadow: a spot a band)
  const f1 = await mine({ action: "forage", spot: 3 });
  eq([f1.ok, (await mine({ action: "forage", spot: 3 })).why], [true, "used"], "a spot once a band");
  // (sold back: a quarter of what it cost)
  const before = await coinsOf(me);
  eq((await mine({ action: "sell", id: fifth.id })).ok, true, "sold back");
  eq((await coinsOf(me)) - before, 100, "a quarter of 400");
  // (a breed first bred: its scroll written out by its first breeder alone, and read, the step's offering known)
  await db.query("update public.town_pasture set found = found || jsonb_build_object('silkie', jsonb_build_object('by', $1::text, 'at', 0)) where one", [me]);
  eq((await pals({ action: "scroll", breed: "silkie" })).why, "theirs", "only the first breeder writes it out");
  const wrote = await mine({ action: "scroll", breed: "silkie" });
  eq([wrote.ok, wrote.got.item], [true, "scrollBreedChickenB"], "a scroll written out");
  eq((await mine({ action: "read", item: "scrollBreedChickenB" })).ok, true, "read");
  eq((await one("select doc->'recipes' ? 'scrollBreedChickenB' r from public.town_purses where member_id = $1", [me])).r, true, "known from now on");
  // (gifts: the cradle once a day, spring wind readying a round once an animal)
  await db.query("update public.town_purses set doc = jsonb_set(doc, '{gifts}', jsonb_build_object('had', jsonb_build_array('thingCradle', 'thingSpringWind'), 'charms', '[]'::jsonb, 'owed', 0, 'familiar', null, 'used', '{}'::jsonb)) where member_id = $1", [me]);
  await db.query("update public.town_animals set a = a || jsonb_build_object('food', 20, 'made', 3, 'banked', 0) where id = $1", [chick]);
  const cr = await mine({ action: "cradle", id: chick });
  eq([cr.ok, ["m", "f"].includes(cr.got.sex), (await mine({ action: "cradle", id: chick })).why], [true, true, "spent"], "the cradle once a day");
  eq((await mine({ action: "wind" })).ok, true, "the wind called");
  const came = await mine({ action: "enter" });
  eq(came.world.animals.find((x) => x.id === chick).banked, 1, "a round ready at once");
  const came2 = await mine({ action: "enter" });
  eq((came2.world.animals.find((x) => x.id === chick) ?? { banked: 1 }).banked, 1, "once an animal a day");
  // (the bench has six members: the barns are made five for this, the catalog's own number, and put back after)
  {
    const holder = ids[3], cared = ids[4], waiter = third, last = ids[5];
    const herdOf = (who, barn, lastCare) => JSON.stringify({ owner: who, barn, room: 4, door: [[0, null]], credit: 0, lastCare, facade: 0, care: "named", carers: [] });
    const setHerd = (who, barn, lastCare) => db.query("insert into public.town_herds (owner, h, changed) values ($1::uuid, $2::jsonb, 0) on conflict (owner) do update set h = excluded.h", [who, herdOf(who, barn, lastCare)]);
    await db.query("update public.town_catalog set data = jsonb_set(data, '{knobs,barns,count}', '5') where key = 'animals'");
    await setHerd(holder, 0, t0 - 29 * 24 * H);
    await setHerd(cared, 1, t0);
    const hid = "00000000-0000-4000-8000-00000000abcd";
    await db.query("insert into public.town_animals (id, owner, a, changed) values ($1::uuid, $2::uuid, town.animal_new($1::uuid, $2::uuid, 'chicken', 'barnHen', $3::float8, true, 'barn', 'f', '{\"thrift\": 1, \"gentle\": 1, \"vigor\": 1}'::jsonb), 0)", [hid, holder, t0 - 30 * 24 * H]);
    await give(waiter, 20_000, [["log", 60], ["stoneTile", 20]]);
    eq((await step(waiter)({ action: "barn", index: 0 })).why, "taken", "none taken back while a barn is free");
    await setHerd(last, 2, t0);
    eq((await step(waiter)({ action: "barn", index: 1 })).why, "taken", "a barn cared for is not taken back");
    const back = await step(waiter)({ action: "barn", index: 0 });
    eq([back.ok, (await animal(hid))?.home, (await animal(hid))?.owner], [true, "pen", holder], "taken back: its animals to its owner's pen");
    const hh = (await one("select h from public.town_herds where owner = $1", [holder])).h;
    eq([hh.barn, hh.credit, hh.door[0][1] !== null], [null, 6000, true], "its door shut, its price kept towards the next");
    eq([back.world.herds.find((h) => h.owner === holder)?.barn, back.world.herds.find((h) => h.owner === holder)?.credit], [null, undefined], "the step tells of the herd it changed, not what it left its owner");
    eq([await coinsOf(waiter), (await one("select (h->>'barn')::int b from public.town_herds where owner = $1", [waiter])).b], [14_000, 0], "the one who waited has it, at its price");
    await db.query("update public.town_catalog set data = jsonb_set(data, '{knobs,barns,count}', '24') where key = 'animals'");
  }
  // (nobody reaches the tables but through the function)
  for (const tbl of ["town_animals", "town_herds", "town_pasture", "town_animal_asks"]) {
    let no = false;
    await db.exec("set role authenticated");
    try { await db.query(`select * from public.${tbl}`); } catch (e) { no = e.code === "42501"; }
    await db.exec("reset role");
    eq(no, true, `${tbl} closed to members`);
  }
  console.log(`v291: ${checks} checks passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
} catch (e) { console.log(`  FAIL crashed: ${String(e.stack ?? e.message).split(String.fromCharCode(10)).slice(0, 3).join(" | ")}`); process.exitCode = 1; } finally { await db.close(); }
