// v259, the farm's Quality (first part), dry-run: the file runs twice on the reward chain through v256; the database's
// settle is the code's (lib/town/quality-plant) for random plants, moments and rain; the trigger on town_plots settles a
// plant as it stood before a change and starts a new round at a pick; nobody in a browser may call the functions.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v259.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { barsOfQ } = await import("@/lib/town/quality");
const { bedGift, progressOf, settled, syncQuality } = await import("@/lib/town/quality-plant");
const { rainsOf } = await import("@/lib/town/weather");

const H = 3_600_000, SLOT = 900_000, T0 = Date.UTC(2026, 9, 20), file = "supabase/v259_a_crop_counts_its_good_care.sql";
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const near = (a, b, what) => { assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} against ${b}`); checks++; };
let s = 7;
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];

// (two files share v253: rewardDB replays the first it finds, so the chain is laid by hand from v253 on; v255 and v256 are
// the town's announcements, which v256 checks against a real admin account, and the farm touches neither)
const db = await rewardDB(252);
for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  const sql = readFileSync(file, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const launch = catalogOf().quality.launch;
  eq((await one("select town.cat('quality') c")).c, JSON.parse(JSON.stringify(catalogOf().quality)), "the catalog row is the code's");

  // rain: a few stretches around the plants' lives, the same in the database and in the code
  const wet = [];
  for (let k = 0; k < 6; k++) { const a = Math.floor((T0 + rand() * 150 * H) / SLOT), n = 1 + Math.floor(rand() * 20); for (let i = 0; i < n; i++) wet.push(a + i); }
  for (const slot of new Set(wet)) await db.query("insert into public.town_weather(slot,sky,wind,gust,rain) values($1,$2,0,0,1) on conflict (slot) do update set sky=excluded.sky", [slot, pick(["drizzle", "rain", "storm"])]);
  const rains = rainsOf(wet);

  // random plants: crops that bear once and again, any of the hand covers, picked or not
  const crops = ["tomato", "corn", "chili", "kangkong", "pumpkin", "basil", "lime"];
  const plants = [];
  for (let i = 0; i < 120; i++) {
    const sown = T0 + Math.floor(rand() * 40 * H), picked = rand() < 0.3 ? 1 : 0, p = { by: "m1", crop: pick(crops), sown, boost: Math.floor(rand() * 3) * 1_800_000, watered: 0, fed: 0, guard: 0, cured: 0, picked, pickedAt: picked ? sown + 80 * H : 0 };
    if (rand() < 0.6) p.watered = sown + Math.floor(rand() * 60 * H);
    if (rand() < 0.2) p.moist = true;
    if (rand() < 0.3) p.fed = sown + Math.floor(rand() * 20 * H);
    if (rand() < 0.4) p.compost = sown + Math.floor(rand() * 30 * H);
    if (rand() < 0.4) p.brushed = sown + Math.floor(rand() * 100 * H);
    if (rand() < 0.4) p.guard = sown + Math.floor(rand() * 90 * H);
    if (rand() < 0.2) p.pollenUntil = sown + Math.floor(rand() * 60 * H);
    if (rand() < 0.3) p.q = { at: sown + Math.floor(rand() * 20 * H), span: 0, area: [0, 0, 0, 0], nar: [0, 0, 0] };
    plants.push(p);
  }

  // the round's progress and the settle, the database's against the code's
  for (const p of plants) {
    for (const t of [p.sown, p.sown + 10 * H, p.sown + 47 * H, p.sown + 140 * H]) {
      near((await one("select town.quality_progress($1::jsonb,$2::bigint) v", [JSON.stringify(p), t])).v, progressOf(p, rains)(t), `progress of ${p.crop} at +${(t - p.sown) / H}h`);
    }
    const now = p.sown + Math.floor((20 + rand() * 200) * H);
    const got = (await one("select town.quality_settled($1::jsonb,$2::bigint) q", [JSON.stringify(p), now])).q, want = settled(p, now, rains, launch);
    eq(got.at, want.at, "settled to the same moment");
    near(got.span, want.span, "the same growing counted");
    want.area.forEach((a, k) => near(got.area[k], a, `bar ${k}`));
    eq(barsOfQ(got), barsOfQ(want), "the same bars");
  }
  assert.ok(plants.some((p) => barsOfQ(settled(p, p.sown + 200 * H, rains, launch)).water >= 10), "some plant earned most of its water half");

  // the trigger: a watering settles the round as it stood; a pick starts a new one; another planting is left alone
  const p0 = { by: "m1", crop: "tomato", sown: T0, boost: 0, watered: T0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
  await db.query("insert into public.town_plots(x,y,bed,soil,plant,damp,changed) values(3,3,0,'tilled',$1::jsonb,false,$2) on conflict(x,y) do update set plant=excluded.plant,changed=excluded.changed", [JSON.stringify(p0), T0]);
  const t1 = T0 + 50 * H, p1 = { ...p0, watered: t1, boost: 1_800_000 };
  await db.query("update public.town_plots set plant=$1::jsonb, changed=$2 where x=3 and y=3", [JSON.stringify(p1), t1]);
  const kept = (await one("select plant from public.town_plots where x=3 and y=3")).plant;
  const code = syncQuality({ "3,3": { soil: "tilled", plant: p0 } }, { "3,3": { soil: "tilled", plant: p1 } }, t1, rains, launch)["3,3"].plant;
  eq(kept.q.at, code.q.at, "the trigger settled to the change");
  near(kept.q.span, code.q.span, "the trigger counted the growing the code counts");
  code.q.area.forEach((a, k) => near(kept.q.area[k], a, `the trigger's bar ${k}`));
  const t2 = T0 + 90 * H;
  await db.query("update public.town_plots set plant=$1::jsonb, changed=$2 where x=3 and y=3", [JSON.stringify({ ...kept, picked: 1, pickedAt: t2 }), t2]);
  eq((await one("select plant->'q' q from public.town_plots where x=3 and y=3")).q, { at: t2, span: 0, area: [0, 0, 0, 0], nar: [0, 0, 0] }, "a pick starts a new round");
  await db.query("update public.town_plots set plant=$1::jsonb, changed=$2 where x=3 and y=3", [JSON.stringify({ ...p0, sown: t2 + H }), t2 + H]);
  eq((await one("select plant->'q' q from public.town_plots where x=3 and y=3")).q, { at: t2 + H, span: 0, area: [0, 0, 0, 0], nar: [0, 0, 0] }, "another planting in its place starts a round of its own, nothing kept");

  // the bed around a plant: random beds of crops, helpers and fennel, the database's gift against the code's
  const KINDS = ["tomato", "basil", "carrot", "scallion", "corn", "runnerBean", "marigold", "borage", "rhubarb", "sesame", "clover", "fig", "fennel", "peanut", "dill", "mint"];
  for (let k = 0; k < 60; k++) {
    const plots = {};
    for (let n = 0; n < 14; n++) {
      const key = `${132 + Math.floor(rand() * 7)},${4 + Math.floor(rand() * 7)}`;
      plots[key] = { soil: "tilled", plant: { by: "m1", crop: pick(KINDS), sown: T0, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...(rand() < 0.3 ? { rotation: 1 } : {}) } };
    }
    for (const key of Object.keys(plots)) {
      const got = (await one("select town.quality_bed_gift($1,$2::jsonb) g", [key, JSON.stringify(plots)])).g, want = bedGift(key, plots);
      eq(got ?? null, want ? JSON.parse(JSON.stringify(want)) : null, `the gift at ${key}`);
    }
  }

  // the trigger on a bed change: a basil set beside a tomato, then taken out, the tomato's round as the code keeps it
  await db.exec("delete from public.town_plots where bed=0");
  const tom = { by: "m1", crop: "tomato", sown: T0, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, moist: true };
  await db.query("insert into public.town_plots(x,y,bed,soil,plant,damp,changed) values(133,5,0,'tilled',$1::jsonb,false,$2)", [JSON.stringify(tom), T0]);
  let bedCode = { "133,5": { soil: "tilled", plant: (await one("select plant from public.town_plots where x=133 and y=5")).plant } };
  const b1 = T0 + 20 * H, basil = { ...tom, crop: "basil", sown: b1 };
  await db.query("insert into public.town_plots(x,y,bed,soil,plant,damp,changed) values(134,5,0,'tilled',$1::jsonb,false,$2)", [JSON.stringify(basil), b1]);
  bedCode = syncQuality(bedCode, { ...bedCode, "134,5": { soil: "tilled", plant: basil } }, b1, rains, launch);
  const tomQ = (await one("select plant->'q' q from public.town_plots where x=133 and y=5")).q;
  eq(tomQ.at, bedCode["133,5"].plant.q.at, "the tomato settled when the basil was set");
  eq(tomQ.bed, { p: 1 }, "the tomato's partner beside it");
  const b2 = T0 + 50 * H;
  await db.query("update public.town_plots set plant=null, soil='tilled', changed=$1 where x=134 and y=5", [b2]);
  bedCode = syncQuality(bedCode, { "133,5": bedCode["133,5"] }, b2, rains, launch);
  const tomQ2 = (await one("select plant->'q' q from public.town_plots where x=133 and y=5")).q;
  eq(tomQ2.at, b2, "the tomato settled when the basil was taken out");
  eq(tomQ2.bed ?? null, null, "nothing beside it now");
  near(tomQ2.nar[0], bedCode["133,5"].plant.q.nar[0], "the partner's narrowing counted as the code counts it");
  near(tomQ2.span, bedCode["133,5"].plant.q.span, "the same growing counted");

  // nobody in a browser may call the functions
  for (const fn of ["town.quality_settled(jsonb,bigint)", "town.quality_accrue(jsonb,bigint,jsonb)", "town.quality_covers(jsonb,bigint,bigint)", "town.quality_progress(jsonb,bigint)", "town.quality_bed_gift(text,jsonb)"]) {
    for (const role of ["anon", "authenticated"]) eq((await one(`select has_function_privilege('${role}','${fn}','EXECUTE') a`)).a, false, `${role} may not call ${fn}`);
  }
  console.log(`v259: ${checks} checks passed (catalog, ${plants.length} plants' progress and settle against the code, the trigger, privileges).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
