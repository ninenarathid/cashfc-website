// v265, the insect house, dry-run: the file runs twice (its guards against the chain through v263, and v264 when it is
// there); the catalog's rows are the code's; the house's deeds (town.house_deed_for, town.house_do) are the code's
// (lib/town/insect-house) on random beds; the bed's gift with a house and a round settled under it are the code's
// (lib/town/quality-plant's bedGift, settled); the trigger re-settles the bed when a house is set, filled or lifted as
// syncQuality does; the member's RPC sets, fills and lifts one; the house's own functions are closed; no bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v265.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const trade = await import("@/lib/town/trade");
const { catalogOf } = await import("@/lib/town/catalog");
const { houseDeedFor, houseDo } = await import("@/lib/town/insect-house");
const { bedGift, settled, syncQuality } = await import("@/lib/town/quality-plant");
const { NO_Q } = await import("@/lib/town/quality");
const { bedOf } = await import("@/lib/town/world");

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20);
let checks = 0, s = 47;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (xs) => xs[Math.floor(rand() * xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));

const BED = bedOf(133, 5), KEYS = [];
for (let x = 128; x < 142; x++) for (let y = 0; y < 14; y++) if (bedOf(x, y) === BED) KEYS.push(`${x},${y}`);
const CROPS = ["tomato", "tomato", "basil", "corn", "clover", "fennel", "dill", "chamomile", "runnerBean", "marigold", "buckwheat", "fig"];
const BUGS = ["honeyBee", "mantis", "lacewing", "hoverfly", "morpho", "lunaMoth", "orchidMantis", "goldenAnt", "cricket"];
const plant = (crop, more = {}) => ({ by: "me", crop, sown: T0 - Math.floor(rand() * 60) * H, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more });
const room = (now) => (rand() < 0.3 ? null : (() => { const from = now - Math.floor(rand() * 80) * H; return { bug: pick(BUGS.slice(0, 8)), from, until: from + pick([48, 72, 72 + 24, 48 + 24]) * H }; })());
/** A random bed: soil, plants (a fig on 2x2 now and then), and a house of mine or another's, or none. */
function bed(now, houses = rand() < 0.7 ? 1 : rand() < 0.5 ? 0 : 2) {
  const plots = {};
  for (const k of KEYS) { const r = rand(); if (r < 0.25) plots[k] = { soil: "tilled", plant: null }; else if (r < 0.35) plots[k] = { soil: "cleared", plant: null }; else if (r < 0.75) plots[k] = { soil: "tilled", plant: plant(pick(CROPS.slice(0, 11))) }; }
  if (rand() < 0.5) {
    const [x, y] = pick(KEYS).split(",").map(Number), cells = [`${x},${y}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x + 1},${y + 1}`];
    if (cells.every((c) => KEYS.includes(c))) { const p = plant("fig", { root: cells[0], footprint: cells, rotation: 0 }); for (const c of cells) plots[c] = { soil: "tilled", plant: p }; }
  }
  for (let i = 0; i < houses; i++) {
    const k = pick(KEYS);
    if (plots[k]?.plant?.root) continue;
    plots[k] = { soil: "house", plant: null, house: { by: rand() < 0.8 ? "me" : "them", at: now - 100 * H, rooms: [room(now), room(now)] } };
  }
  return plots;
}

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  const chain = ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade", "v261_a_dish_as_good_as_what_went_in", "v262_compost_and_the_pollen_brush", "v263_helper_plants_and_their_crossings"];
  const v264 = readdirSync("supabase").find((f) => f.startsWith("v264_") && f.endsWith(".sql"));
  if (v264 && existsSync(`supabase/${v264}`)) chain.push(v264.replace(/\.sql$/, ""));
  for (const f of chain) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v265_the_insect_house.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const cat = catalogOf();
  for (const key of ["quality", "items", "workshop"]) eq((await one("select town.cat($1) c", [key])).c, norm(cat[key]), `the catalog's ${key} is the code's`);

  // the house's deeds, on random beds with random things in the hand
  const HANDS = ["insectHouse", "hoe", "honeyBee", "mantis", "morpho", "lunaMoth", "cricket", "tomato", null];
  let did = 0;
  for (let k = 0; k < 60; k++) {
    const now = T0 + Math.floor(rand() * 40) * H, plots = bed(now, rand() < 0.5 ? 0 : 1);
    for (const key of KEYS.filter(() => rand() < 0.35)) {
      // (the hands biased to what the plot is for: a house's insects or the hoe at a house, the house at bare ground)
      const at = plots[key], hand = rand() < 0.3 ? pick(HANDS) : at?.house ? pick(["hoe", "honeyBee", "mantis", "morpho", "lunaMoth"]) : at && !at.plant ? "insectHouse" : pick(HANDS);
      const owner = pick(["me", "me", "me", "them", null]);
      const purse = { ...trade.newPurse(), bag: hand ? trade.put(trade.newPurse().bag, hand, 1) : trade.newPurse().bag, ...(hand ? { hand } : {}) };
      const got = (await one("select town.house_deed_for($1,$2::jsonb,$3,'me',$4,$5) d", [key, JSON.stringify(plots), hand && trade.held(purse.bag, hand) > 0 ? hand : null, owner, now])).d;
      eq(got ?? null, houseDeedFor(key, plots, hand, "me", owner, now) ?? null, `the deed at ${key} with ${hand}`);
      const sqlDid = (await one("select town.house_do($1,$2::jsonb,$3::jsonb,'me',$4,$5) d", [key, JSON.stringify(plots), JSON.stringify(purse), owner, now])).d;
      const tsDid = houseDo(key, plots, purse, "me", owner, now);
      eq(sqlDid.ok, tsDid.ok, `done or not at ${key} with ${hand}`);
      if (!tsDid.ok) { eq(sqlDid.why, tsDid.why, `why not at ${key} with ${hand}`); continue; }
      did++;
      eq(sqlDid.deed, tsDid.deed, "the deed done");
      eq(sqlDid.plot, norm(tsDid.plot), `the plot after ${tsDid.deed}`);
      eq(sqlDid.purse.bag, norm(tsDid.purse.bag), `the bag after ${tsDid.deed}`);
      eq(sqlDid.purse.stamina, norm(tsDid.purse.stamina), `the stamina after ${tsDid.deed}`);
    }
  }
  assert.ok(did >= 25, `enough deeds done (${did})`); checks++;

  // the bed's gift with a house, and a round settled under it
  let housed = 0;
  for (let k = 0; k < 50; k++) {
    const now = T0 + 30 * H, plots = bed(now);
    for (const key of KEYS) {
      const p = plots[key]?.plant;
      if (!p || (p.root && p.root !== key)) continue;
      const got = (await one("select town.quality_bed_gift($1,$2::jsonb) g", [key, JSON.stringify(plots)])).g, want = bedGift(key, plots);
      eq(got ?? null, norm(want), `the gift at ${key}`);
      if (!want?.h) continue;
      housed++;
      const q = { ...NO_Q(p.sown), bed: want }, at = now + Math.floor(rand() * 90) * H;
      eq((await one("select town.quality_settled($1::jsonb,$2) q", [JSON.stringify({ ...p, q }), at])).q, norm(settled({ ...p, q }, at, [])), `the round at ${key} under the house`);
    }
  }
  assert.ok(housed >= 40, `enough plants under a house (${housed})`); checks++;

  // the trigger: a house set, filled and lifted re-settles what it reaches, as syncQuality does
  for (let k = 0; k < 6; k++) {
    const now = T0 + 10 * H, plots = Object.fromEntries(Object.entries(bed(now, 0)).filter(([, p]) => !p.plant?.root));
    await db.exec(`delete from public.town_plots where bed=${BED}`);
    const rows = (ps, t) => Object.entries(ps).map(([key, p]) => { const [x, y] = key.split(",").map(Number); return [x, y, BED, p.soil, p.plant ? JSON.stringify(p.plant) : null, p.house ? JSON.stringify(p.house) : null, t]; });
    for (const r of rows(plots, now)) await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)", r);
    // (the rows go in one by one, each settling the bed as it changes: so does the code's farm)
    let ts = {};
    for (const [key, p] of Object.entries(plots)) ts = syncQuality(ts, { ...ts, [key]: p }, now);
    const free = Object.keys(plots).find((key) => !plots[key].plant);
    if (!free) continue;
    const [hx, hy] = free.split(",").map(Number);
    const steps = [
      { soil: "house", plant: null, house: { by: "me", at: now + H, rooms: [null, null] } },
      { soil: "house", plant: null, house: { by: "me", at: now + H, rooms: [{ bug: "honeyBee", from: now + 2 * H, until: now + 50 * H }, null] } },
      { soil: "house", plant: null, house: { by: "me", at: now + H, rooms: [{ bug: "honeyBee", from: now + 2 * H, until: now + 50 * H }, { bug: pick(["morpho", "lunaMoth", "orchidMantis", "goldenAnt"]), from: now + 3 * H, until: now + 75 * H }] } },
      { soil: "tilled", plant: null },
    ];
    for (const [i, step] of steps.entries()) {
      const t = now + (i + 1) * H;
      await db.query("update public.town_plots set soil=$3, plant=null, house=$4::jsonb, changed=$5 where x=$1 and y=$2", [hx, hy, step.soil, step.house ? JSON.stringify(step.house) : null, t]);
      ts = syncQuality(ts, { ...ts, [free]: step }, t);
      const live = Object.fromEntries((await db.query(`select x::text||','||y::text k, plant from public.town_plots where bed=${BED} and plant is not null`)).rows.map((r) => [r.k, r.plant.q]));
      for (const [key, p] of Object.entries(ts)) if (p.plant) eq(live[key], norm(p.plant.q), `the round at ${key} after step ${i}`);
    }
  }

  // the member's own RPC: set a house in my bed, put a bee in it, lift it with the hoe
  const me = (await one("select p.id from public.profiles p order by p.id limit 1"))?.id;
  let rpc = "not run (no profile on the bench)";
  if (me) {
    const as = async (sqlText, args = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [me]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(sqlText, args)).rows[0]; } finally { await db.exec("reset role"); } };
    const nowMs = Number((await one("select town.now_ms() t")).t);
    await db.exec(`delete from public.town_plots where bed=${BED}`);
    await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values(133,5,$1,'tilled',null,$2),(134,5,$1,'tilled',$3::jsonb,$2)", [BED, nowMs, JSON.stringify({ by: me, crop: "tomato", sown: nowMs - 2 * H, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 })]);
    await db.query("insert into public.town_beds(bed,member_id,tended,empty) values($1,$2,$3,0) on conflict(bed) do update set member_id=excluded.member_id,tended=excluded.tended,empty=0", [BED, me, nowMs]);
    const give = async (item) => { const p = (await one("select town.purse_of($1,true) p", [me])).p; await one("select town.keep_purse($1,$2::jsonb)", [me, JSON.stringify({ ...p, bag: trade.put(p.bag, item, 1), hand: item })]); };
    await give("insectHouse");
    let r = (await as("select public.town_house(133,5) r")).r;
    if (!r.ok && r.why === "verified") rpc = "not run (the bench's first profile is not a proved character)";
    else {
      eq(r.ok, true, `the house set: ${JSON.stringify(r).slice(0, 200)}`);
      eq((await one("select soil, house->>'by' b from public.town_plots where x=133 and y=5")), { soil: "house", b: me }, "the plot holds the house");
      await give("honeyBee");
      r = (await as("select public.town_house(133,5) r")).r;
      eq(r.ok && r.deed, "room", "a bee in the house");
      eq((await one("select plant->'q'->'bed'->'h'->0->>'r' r from public.town_plots where x=134 and y=5")).r, "pollen", "the tomato beside it is given the bee");
      await give("hoe");
      r = (await as("select public.town_house(133,5) r")).r;
      eq(r.ok && r.deed, "lift", "the house lifted");
      eq((await one("select soil, house from public.town_plots where x=133 and y=5")), { soil: "tilled", house: null }, "the plot tilled again");
      eq((await one("select plant->'q'->'bed' b from public.town_plots where x=134 and y=5")).b, null, "the tomato given nothing again");
      eq((await one("select count(*)::int n from public.town_deeds where what like 'house_%'")).n, 3, "three deeds written");
      rpc = "set, filled and lifted by a member"
    }
  }

  for (const sig of ["town.house_role(text)", "town.house_rare(text)", "town.house_reach(text,text)", "town.house_fav_near(text,text,jsonb)", "town.house_free(jsonb,bigint)", "town.house_deed_for(text,jsonb,text,text,text,bigint)", "town.house_do(text,jsonb,jsonb,text,text,bigint)"])
    for (const role of ["anon", "authenticated"]) eq((await one("select has_function_privilege($1,$2,'EXECUTE') ok", [role, sig])).ok, false, `${role} may not call ${sig}`);
  eq((await one("select has_function_privilege('anon','public.town_house(integer,integer)','EXECUTE') a, has_function_privilege('authenticated','public.town_house(integer,integer)','EXECUTE') m")), { a: false, m: true }, "a member may call town_house, a stranger not");
  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /house|quality_keep/.test(JSON.stringify(b))), [], "no bare write");
  console.log(`v265: ${checks} checks passed (${did} house deeds, ${housed} plants under a house, the trigger against the code; the RPC ${rpc}).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 1800));
  process.exitCode = 1;
} finally {
  await db.close();
}
