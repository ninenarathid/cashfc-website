// v291 and the page meeting: lib/town/keeper's DbKeeper, as the page drives it, against the stand-in with v291 run
// (the bench as it is after v290, cached: V291_BENCH). Two members; every step through `keeper.animals`, and after
// each the world the keeper holds (a look's whole, then each step's part merged into it) held to a fresh look's.
//   cd <the tree> && V291_BENCH=<scratch>/bench-v290.tar FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v291.keeper.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
await import("./repo-ts-town.mjs");
const { DbKeeper } = await import("@/lib/town/keeper");
const A = await import("@/lib/town/animals");

const CACHE = process.env.V291_BENCH;
if (!CACHE || !existsSync(CACHE)) throw new Error("V291_BENCH: the cached bench after v290 (made by v291.test.mjs)");
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 160)} against ${JSON.stringify(b)?.slice(0, 160)}`); } };
try {
  await db.exec(readFileSync("supabase/v291_a_farm_of_animals.sql", "utf8"));
  const [me, pal] = (await db.query("select p.id from public.profiles p order by p.id limit 2")).rows.map((r) => r.id);
  // (an RPC as a member: PostgREST's named arguments, the member's claims; one at a time, as PGlite is one connection
  // and a keeper may ask in the background while another asks: the claims would cross)
  let line = Promise.resolve();
  const askAs = (who) => (fn, args = {}) => { const run = line.then(() => askOne(who, fn, args)); line = run.catch(() => {}); return run; };
  const askOne = async (who, fn, args) => {
    const names = Object.keys(args);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who]);
    await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
    await db.exec("set role authenticated");
    try {
      const casts = { p_input: "::jsonb" };
      const r = await db.query(`select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}${casts[n] ?? ""}`).join(", ")}) r`, names.map((n) => (n === "p_input" ? JSON.stringify(args[n]) : args[n])));
      return r.rows[0].r;
    } finally { await db.exec("reset role"); }
  };
  const give = async (who, coins, stacks) => {
    await line;
    const bag = [...stacks.map(([item, n]) => ({ item, n })), ...Array(20 - stacks.length).fill(null)];
    await db.query("update public.town_purses set coins = $2, doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{bag}', $3::jsonb) where member_id = $1", [who, coins, JSON.stringify(bag)]);
  };
  const K = new DbKeeper(me, askAs(me)), P = new DbKeeper(pal, askAs(pal));
  const sortW = (w) => ({ animals: [...w.animals].sort((x, y) => (x.id < y.id ? -1 : 1)).map((a) => ({ id: a.id, owner: a.owner, breed: a.breed, place: a.place, banked: a.banked, hearts: a.hearts, food: Math.round(a.food * 1000), name: a.name })),
    gate: w.gate, found: w.found, spells: w.spells.length, wagons: w.wagons.length });
  /** The keeper's world held to a fresh look's. */
  const same = async (k, what) => {
    const fresh = await askAs(k === K ? me : pal)("town_animals", { p_input: { action: "look" }, p_request: null });
    eq(sortW(k.animalWorld()), sortW(fresh.world), `${what}: the keeper holds what a look tells`);
  };
  const look = await K.animals({ action: "look" });
  eq(look.ok, true, "a look");
  await P.animals({ action: "look" });
  await give(me, 20_000, [["chickFeed", 5], ["eggBasket", 1], ["seedCorn", 3], ["log", 20]]);
  await give(pal, 0, [["chickFeed", 2]]);
  const b1 = await K.animals({ action: "buy", species: "chicken" }, "keeper-buy-1");
  eq([b1.ok, b1.world.animals.length, b1.why ?? null], [true, 1, null], "a chick bought through the keeper");
  await same(K, "after a buy");
  const b2 = await K.animals({ action: "buy", species: "chicken" }, "keeper-buy-2");
  const [c1, c2] = b2.world.animals.filter((a) => a.owner === me).map((a) => a.id);
  eq((await K.animals({ action: "feed", id: c1, item: "chickFeed" })).ok, true, "fed");
  eq((await K.animals({ action: "pet", id: c1 })).ok, true, "petted");
  eq((await K.animals({ action: "name", id: c1, name: "Pip" })).ok, true, "named");
  await same(K, "after feeding, petting, naming");
  eq((await P.animals({ action: "pet", id: c1 })).why, "theirs", "a stranger is refused through the keeper");
  eq((await K.animals({ action: "care", care: "named", carers: [pal] })).ok, true, "a carer named");
  await db.query("update public.town_animals set a = jsonb_set(a, '{food}', '0') where id = $1", [c1]);
  eq((await P.animals({ action: "feed", id: c1, item: "chickFeed" })).ok, true, "the friend feeds it");
  // (the friend's keeper knew the pasture as it was at its look, and the step brings back only the animal it touched: that
  // one is as a look tells it; the rest it learns at its next look, as the page does every 30 s)
  { const fresh = (await askAs(pal)("town_animals", { p_input: { action: "look" }, p_request: null })).world.animals.find((x) => x.id === c1);
    const held = P.animalWorld().animals.find((x) => x.id === c1);
    eq([held?.food, held?.today?.pet ?? null], [fresh?.food, fresh?.today?.pet ?? null], "the friend's keeper holds the animal it cared for as a look tells it"); }
  // (grown hens with eggs and hearts: collect, then a cross)
  for (const id of [c1, c2]) await db.query("update public.town_animals set a = a || jsonb_build_object('grown', $2::float8, 'banked', 2, 'hearts', 100, 'rest', 0) where id = $1", [id, A.adultAt("chicken")]);
  await K.animals({ action: "look" });
  const got = await K.animals({ action: "collect", id: c1, cracked: 0 });
  eq([got.ok, got.got?.item, got.got?.n], [true, "farmEgg", 2], "collected through the keeper");
  await same(K, "after a collection");
  const cross = await K.animals({ action: "breed", a: c1, b: c2, offering: "seedCorn" });
  eq(cross.ok, true, "a cross through the keeper");
  await same(K, "after a cross");
  eq((await K.animals({ action: "keeping" })).ok, true, "places built of logs");
  const opened = await K.animals({ action: "gate", open: true });
  eq([opened.ok, opened.world.gate.at(-1)?.[1]], [true, null], "the gate");
  await same(K, "after the gate");
  await P.animals({ action: "look" });
  eq(P.animalWorld().gate.at(-1)?.[1], null, "the other member's keeper sees the gate open after a look");
  const f = await K.animals({ action: "forage", spot: 0 });
  eq(f.ok, true, "the meadow");
  const sold = await K.animals({ action: "sell", id: c2 });
  eq([sold.ok, sold.world.animals.some((a) => a.id === c2)], [true, false], "sold: gone from the keeper's world");
  await same(K, "after a sale");
  console.log(`v291 keeper: ${checks} checks passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
} catch (e) { console.log(`  FAIL crashed: ${String(e.stack ?? e.message).split(String.fromCharCode(10)).slice(0, 4).join(" | ")}`); process.exitCode = 1; } finally { await db.close(); }
