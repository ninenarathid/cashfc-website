// v283, the farm picks for one stamina and tells its prices, dry-run: the file runs on the chain through v277 as checked
// out on Windows (CR at its line ends) and again as written (the second run changes nothing); then:
//   * the catalog's `farming` and `pouches` rows are the code's: a picking for 1 stamina, the farm's pouch of 30 slots;
//   * the pouches as a purse keeps them: six slots kept before are the first six of thirty, the code's to the digit;
//   * pickings by hand, the Quality's salt set empty so that the draws are the code's: the database's answer is the
//     code's (lib/town/farm, gardening), and a picking with stamina costs one;
//   * public.town_farm_prices(): every crop's price this round as lib/town/market's farmPricesOf tells it (a price that
//     has moved among them), for a member; closed to anon and to whoever is not a member.
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v283.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V277 } from "./build-v277.mjs";
// (the code read is the tree it is run in, FC_REPO or not)
process.env.FC_REPO ??= process.cwd().replace(/\\/g, "/");
await import("./repo-ts-town.mjs");
const farm = await import("@/lib/town/farm");
const { gardenHarvest } = await import("@/lib/town/gardening");
const P = await import("@/lib/town/pouches");
const trade = await import("@/lib/town/trade");
const market = await import("@/lib/town/market");
const { catalogOf } = await import("@/lib/town/catalog");
const { CROPS } = await import("@/lib/town/items");
const { bedCorner, BEDS_IN_FARM } = await import("@/lib/town/world");
const { dayOf, staminaOf } = await import("@/lib/town/stamina");

const CHAIN = [...BEFORE_V277, "v277_forty_six_things_to_wear"], FILE = "supabase/v283_the_farm_picks_for_one_and_tells_its_prices.sql";
const H = 3_600_000, T = Date.UTC(2026, 9, 20, 5), ME = "00000000-0000-0000-0000-0000000000a1";
let checks = 0, s = 283;
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const diffOf = (a, b, at = "") => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diffOf(a[k], b[k], `${at}.${k}`));
  return [`${at}: ${JSON.stringify(a)?.slice(0, 200)} against ${JSON.stringify(b)?.slice(0, 200)}`];
};
const eq = (a, b, what) => { try { assert.deepEqual(norm(a), norm(b)); } catch { assert.fail(`${what}:\n  ${diffOf(norm(a), norm(b)).slice(0, 12).join("\n  ")}`); } checks++; };
const ok = (c, what) => { assert.ok(c, what); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const v = async (q, a) => (await one(q, a)).v;
const fails = async (q, a = []) => { try { await db.query(q, a); return false; } catch { return true; } };
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const fnAfter = await v("select md5(replace(pg_get_functiondef('public.town_farm_prices()'::regprocedure),chr(13),'')) v");
  await db.exec(sql);
  eq(await v("select md5(replace(pg_get_functiondef('public.town_farm_prices()'::regprocedure),chr(13),'')) v"), fnAfter, "a second run leaves public.town_farm_prices as the first made it");

  /* ── the catalog ── */
  const code = catalogOf();
  const farming = await v("select data v from public.town_catalog where key = 'farming'"), pouches = await v("select data v from public.town_catalog where key = 'pouches'");
  eq(farming, code.farming, "the farming row is the code's");
  eq(farming.costs.pick, 1, "a picking costs one stamina");
  eq(pouches, code.pouches, "the pouches row is the code's");
  eq(pouches.find((p) => p.gift === "thingPouch").slots, 30, "the farm's pouch has thirty slots");
  eq(pouches.filter((p) => p.gift !== "thingPouch").map((p) => [p.gift, p.slots]), [["thingCreel", 5], ["thingSack", 5], ["thingBundle", 3]], "the other pouches as they were");

  /* ── the pouches as a purse keeps them ── */
  const SIX = [{ item: "kangkong", n: 40, grade: 2 }, null, { item: "seedTomato", n: 10 }, { item: "corn", n: 7 }, null, { item: "carrot", n: 3, grade: 3 }];
  for (const kept of [SIX, Array(6).fill(null), undefined]) {
    const purse = { ...trade.newPurse(), gifts: { had: ["thingPouch"], charms: [] }, ...(kept ? { pouches: { thingPouch: kept } } : {}) };
    const got = await v("select town.pouches_of($1::jsonb) v", [JSON.stringify(purse)]);
    eq(got, P.pouchesOf(purse).map((p) => ({ gift: p.pouch.gift, slots: p.slots, holds: [...p.pouch.holds] })), `the pouches as kept (${kept ? kept.filter(Boolean).length : "none"} kept)`);
    eq(got[0].slots.length, 30, "thirty slots");
    if (kept) eq(got[0].slots.slice(0, 6), kept, "the six kept before are the first six");
  }
  eq(await v("select town.room_in($1::jsonb,'kangkong') v", [JSON.stringify({ ...trade.newPurse(), bag: Array(10).fill({ item: "rod", n: 1 }), gifts: { had: ["thingPouch"], charms: [] }, pouches: { thingPouch: SIX } })]),
    P.roomIn({ ...trade.newPurse(), bag: Array(10).fill({ item: "rod", n: 1 }), gifts: { had: ["thingPouch"], charms: [] }, pouches: { thingPouch: SIX } }, "kangkong"), "the room in the pouch is the code's");

  /* ── pickings ── */
  await db.exec("update town.quality_salt set salt='' where one");
  await db.exec("delete from public.town_weather where true; delete from public.town_swarms where true");
  let picked = 0, cost1 = 0;
  for (let k = 0; k < 120; k++) {
    const [bx, by] = bedCorner(int(BEDS_IN_FARM)), key = `${bx + 1 + int(5)},${by + 1 + int(5)}`, crop = pick(["tomato", "corn", "pumpkin", "cabbage", "kangkong", "carrot", "chili"]), c = CROPS[crop], picks_ = c.picks ?? 1;
    const plant = { by: ME, crop, sown: T - Math.ceil((c.hours + 1) * (1 + rand())) * H - (picks_ + 2) * Math.ceil(c.again ?? 1) * H, boost: 0, watered: 0, fed: 0, guard: T + 999 * H, cured: 0, picked: 0, pickedAt: 0,
      q: { at: T - (1 + int(20)) * H, span: 0.3 + rand(), area: [rand(), rand(), rand(), rand()].map((a) => a * 0.95), nar: [rand() * 0.3, 0, 0] } };
    if (picks_ > 1 && rand() < 0.3) { plant.picked = 1; plant.pickedAt = T - Math.ceil((c.again ?? 1) * 1.3) * H; }
    const left = pick([100, 40, 1, 2]), pouch = rand() < 0.5;
    const purse = { ...trade.newPurse(), stamina: { day: dayOf(T), left }, bag: [{ item: "rod", n: 1 }, ...Array(9).fill(null)],
      gifts: { had: pouch ? ["thingPouch"] : [], charms: [] }, ...(pouch ? { pouches: { thingPouch: Array(30).fill(null) } } : {}) };
    const plot = { soil: "tilled", plant }, plots = { [key]: plot };
    const got = await v("select town.pick($1,$2::jsonb,$3::jsonb,true,null,$4,$5) v", [key, JSON.stringify(purse), JSON.stringify(plot), T, ME]);
    const base = farm.pick(key, purse, plot, true, null, T, [], ME), want = base.ok ? gardenHarvest(key, plots, purse, base, ME, T, []) : base;
    eq(got, want, `a picking of ${crop} at ${key}, ${left} stamina, ${pouch ? "with" : "without"} the pouch`);
    if (!want.ok) continue;
    picked++;
    if (staminaOf(purse, T) - staminaOf(want.purse, T) === 1) cost1++;
  }
  ok(picked > 80 && cost1 === picked, `every picking costs one stamina (${cost1} of ${picked})`);

  /* ── every crop's price, told at the farm ── */
  const member = (await one("select id from public.profiles where is_admin limit 1")).id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [member]);
  const round = await v("select town.round_of(town.now_ms()) v");
  const at = { kangkong: { f: 60, m: 500 }, carrot: { f: 140, m: 2 }, blueCorn: { f: 40, m: 90 } };
  await db.query("insert into public.town_things (key, doc) values ('market', $1::jsonb) on conflict (key) do update set doc = excluded.doc",
    [JSON.stringify({ round, at, sold: {} })]);
  const told = (await v("select public.town_farm_prices() v")).farmPrices;
  const want = market.farmPricesOf({ round, at, sold: {} }, market.factsOf());
  eq(told, want, "every crop's price this round, as the code tells it");
  ok(Object.keys(told.things).length > 40 && told.things.kangkong.f === 60 && told.things.carrot.f === 140 && told.things.blueCorn.f === 40 && told.things.tomato.f === 100,
    `the moved prices among them (${Object.keys(told.things).length} crops)`);
  ok(Object.values(told.things).every((t) => Array.isArray(t.was) && t.was.length === 0), "without the days gone by");
  ok(!("seedKangkong" in told.things) && !("minnow" in told.things), "crops only: no seed, no fish");

  /* ── who may ask ── */
  ok(!(await v("select has_function_privilege('anon','public.town_farm_prices()','execute') v")), "closed to anon");
  ok(await v("select has_function_privilege('authenticated','public.town_farm_prices()','execute') v"), "open to a signed-in member");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", ["00000000-0000-0000-0000-00000000dead"]);
  ok(await fails("select public.town_farm_prices()"), "refused to whoever is not a member");

  console.log(`v283 dry run: ${checks} checks passed`);
} finally {
  await db.close();
}
