// Cash Town's weather as everybody has it, tried in a real browser on the dev test room:
//
// - two testers in two tabs, kept by the database's keeper against the stand-in (scripts/db/town-bench.mjs, with
//   v118 in it): the stand-in is given a clear quarter hour, then two of heavy rain, then a clear one, and its clock
//   is put a little before the turn. Both tabs have the stand-in's clock and its weather; before the turn the clouds
//   gather and the light goes on both alike, with not a drop yet; after it both are in the rain, alike; whether it
//   rains is the database's word on both;
// - in that rain a plant is wet for both, and a can is offered nothing; with the clock put past the rain the same
//   can waters it;
// - in the trial (no database), `?townWeather=rain` is rain without end: what is sown is wet at once, and a morning
//   glory of six hours is ripe in a little over four.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>. It waits out a change of weather, so it takes four
// minutes or so.
//
//   node town-sky.mjs <base> <outdir> [bench]  (http://localhost:3100  .  http://127.0.0.1:3199)
import { browser, sleep, status, until } from "./cdp.mjs";
import { play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3199"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", F = "window.__townFarm", T = "window.__townTrade", SLOT = 900000;
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const skip = (ms) => post("/bench/skip", { ms });
const benchNow = async () => Number((await sql(`select town.now_ms() as now`))[0].now);
const sky = (X) => X.evaluate(`window.__townView.sky()`);
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(700); };
const far = (a, b) => Math.max(...Object.keys(a).map((k) => Math.abs(a[k] - b[k])));
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the database's keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready() && ${K}.open() === true`), 30000);
  await until("the weather has come", async () => (await sky(X)).known === true, 20000);
  return X.evaluate(`${K}.id`);
}
/** Both tabs' skies, read as near the same moment as may be. */
const both = async (X, Y) => { const [a, b] = await Promise.all([sky(X), sky(Y)]); return { a, b }; };

if (!(await fetch(`${BENCH}/bench/who?as=check`).then((r) => r.ok).catch(() => false))) {
  console.log(`no stand-in database at ${BENCH}: start scripts/db/town-bench.mjs first (see scripts/db/README.md)`);
  process.exit(2);
}
if (!(await sql(`select to_regprocedure('public.town_sky(bigint)') is not null as there`))[0].there) {
  console.log("the stand-in has no weather (v118): start it with the draft, BENCH_EXTRA=<v118's file>");
  process.exit(2);
}

const X = await browser("SkyA", { width: 1280, height: 860 });
try {
  console.log("the same sky for two");
  // the turn: the next quarter hour's beginning that is more than two and a half minutes off, by the stand-in's clock
  let now = await benchNow();
  const turn = Math.floor(now / SLOT) + (SLOT - (now % SLOT) > 170000 ? 1 : 2);
  await sql(`truncate public.town_weather`);
  await sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'clear', 6, 12, 0), ($2, 'clear', 6, 12, 0), ($3, 'rain', 18, 38, 4), ($4, 'rain', 18, 38, 4), ($5, 'clear', 6, 12, 0), ($6, 'clear', 6, 12, 0)`,
    [turn - 2, turn - 1, turn, turn + 1, turn + 2, turn + 3]);
  // (a little under two and a half minutes before the turn)
  await skip(turn * SLOT - 145000 - now);
  const a = await enter(X, "Sa");
  const Y = await X.tab("SkyB");
  const b = await enter(Y, "Sb");
  now = await benchNow();
  let s = await both(X, Y);
  ok("both have the database's clock, to the second", Math.abs(s.a.clock - now) < 2500 && Math.abs(s.b.clock - now) < 2500 && Math.abs(s.a.clock - s.b.clock) < 1500, { bench: now, a: s.a.clock, b: s.b.clock });
  ok("…and its weather: fine, and no rain said", s.a.weather.sky === "clear" && s.b.weather.sky === "clear" && !s.a.raining && !s.b.raining, { a: s.a.weather, b: s.b.weather });

  // before the turn: the clouds gather and the light goes, on both alike, and not a drop yet
  await until("a minute and a half before the turn", async () => turn * SLOT - (await benchNow()) < 90000, 120000, 1000);
  s = await both(X, Y);
  ok("before the turn the clouds gather and the light goes, with not a drop yet", s.a.effects.clouds > 0.4 && s.a.effects.gloom > 0.03 && s.a.effects.gloom < 0.9 && s.a.effects.rain === 0 && s.a.effects.wet === 0 && !s.a.raining, s.a.effects);
  ok("…on both alike", far(s.a.effects, s.b.effects) < 0.04, { a: s.a.effects, b: s.b.effects });
  await X.shot(`${OUT}/sky-before.png`);

  // after it: rain, on both alike; and whether it rains is the database's word, on both
  await until("the turn, and forty seconds", async () => (await benchNow()) - turn * SLOT > 40000, 180000, 1000);
  s = await both(X, Y);
  ok("after the turn it rains, not yet at its hardest", s.a.effects.rain > 0.1 && s.a.effects.rain < 0.9 && s.a.effects.wet > 0 && s.a.drops > 0, { effects: s.a.effects, drops: s.a.drops });
  ok("…on both alike", far(s.a.effects, s.b.effects) < 0.05 && s.b.drops > 0, { a: s.a.effects, b: s.b.effects });
  ok("…and it rains for both, by the database's word", s.a.raining && s.b.raining && s.a.weather.sky === "rain" && s.b.weather.sky === "rain", { a: s.a.raining, b: s.b.raining });
  await X.shot(`${OUT}/sky-turning.png`);
  await until("three minutes into the rain", async () => (await benchNow()) - turn * SLOT > 185000, 180000, 1000);
  s = await both(X, Y);
  ok("three minutes on it is all there: heavy rain under a sky as dark as night, on both", s.a.effects.rain > 0.85 && s.a.effects.gloom === 1 && s.a.effects.wet === 1 && far(s.a.effects, s.b.effects) === 0, { a: s.a.effects, b: s.b.effects });
  await X.shot(`${OUT}/sky-rain.png`);

  console.log("rain on a plot");
  // a cabbage of B's, sown an hour ago by the stand-in's clock, kept from pests; A with a can that has water in it
  const KEY = "134,5";
  await sql(`delete from public.town_plots where x = 134 and y = 5`);
  await sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (134, 5, town.bed_of(134, 5), 'tilled',
    jsonb_build_object('by', $1::text, 'crop', 'cabbage', 'sown', town.now_ms() - 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', town.now_ms() + 86400000::bigint * 30, 'cured', 0, 'picked', 0, 'pickedAt', 0), town.now_ms())`, [b]);
  await sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of(134, 5), $1, town.now_ms(), 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [b]);
  await sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('hand', 'can', 'bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)))
    on conflict (member_id) do update set doc = excluded.doc`, [a, JSON.stringify([{ item: "can", n: 1, water: 5 }, ...Array(9).fill(null)])]);
  await X.evaluate(`${K}.hold(0).then(() => null)`);
  await warp(X, 134, 5);
  await warp(Y, 135, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await until("the plant is seen", async () => (await X.evaluate(`${F}.seen("${KEY}")`)).crop === "cabbage", 15000);
  await until("…by the other too", async () => (await Y.evaluate(`!!${F} && ${F}.seen("${KEY}").crop`)) === "cabbage", 15000);
  const seenA = await X.evaluate(`${F}.seen("${KEY}")`), seenB = await Y.evaluate(`${F}.seen("${KEY}")`);
  ok("in the rain the plant is wet, for both", seenA.wet === true && seenB.wet === true, { a: seenA, b: seenB });
  ok("…and a can is offered nothing", (await X.evaluate(`${F}.deed()`)) === null && (await X.evaluate(`${K}.purse().hand`)) === "can", await X.evaluate(`${F}.deed()`));
  const direct = await X.evaluate(`${K}.farmDo("${KEY}", "A").then((d) => d)`);
  ok("…asked all the same, the database refuses, and no water is used", direct.ok === false && (await X.evaluate(`${K}.purse().bag[0].water`)) === 5, direct);
  await X.shot(`${OUT}/sky-wet-plot.png`);
  // the clock put past the rain (and past its last puddle): the same can, the same plant
  now = await benchNow();
  await skip((turn + 2) * SLOT + 11 * 60000 - now);
  await enter(X, "Sa");
  await X.evaluate(`${K}.hold(0).then(() => null)`);
  await warp(X, 134, 5);
  await until("the farm's own code has come again", () => X.evaluate(`!!${F}`), 20000);
  await until("the can is offered the plant, the rain over", async () => (await X.evaluate(`${F}.deed()`)) === "water", 15000);
  s = { a: await sky(X) };
  ok("when the rain is over the sky is clear again, the puddles gone", s.a.effects.rain === 0 && s.a.effects.wet === 0 && s.a.effects.gloom === 0 && !s.a.raining && s.a.weather.sky === "clear", s.a.effects);
  await X.evaluate(`${F}.act()`);
  await until("it is watered", async () => (await X.evaluate(`${F}.seen("${KEY}")`)).wet === true, 6000);
  ok("…and the can waters as ever", (await X.evaluate(`${K}.purse().bag[0].water`)) === 4);
  // what the rain did for it: two quarter hours of rain are a quarter hour of growth, by the database's reckoning
  const grew = await sql(`select town.grown(plant, town.now_ms()) - (town.now_ms() - (plant->>'sown')::bigint) / 3600000.0 - (plant->>'boost')::float8 / 3600000 as more from public.town_plots where x = 134 and y = 5`);
  ok("…the plant has a quarter of an hour more of growth for half an hour of rain", Math.abs(Number(grew[0].more) - 0.25) < 1e-6, grew);
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs].slice(0, 4));
  await sql(`truncate public.town_weather`);
  await sql(`delete from public.town_plots where x = 134 and y = 5`);

  console.log("rain without end, in the trial");
  const Z = await X.tab("SkyT");
  await Z.goto(`${BASE}/town?townTest=Sr&townRoom=check&townHour=12&townWeather=rain`);
  await until("ready", async () => (await status(Z)) === "ready", 240000);
  await until("the trial is there", () => Z.evaluate(`!!${T}`), 20000);
  await Z.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await Z.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1), ${T}.grant("seedKangkong", 2), ${T}.grant("guardFert", 1), ${T}.grant("can", 1), ${T}.setWell(3))`);
  s = { a: await sky(Z) };
  ok("the weather asked for is the weather: rain, and it rains", s.a.weather.sky === "rain" && s.a.raining === true && s.a.effects.rain > 0.3, s.a);
  const slot = (item) => Z.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
  const take = async (item) => { await Z.evaluate(`${T}.hold(${await slot(item)})`); await sleep(350); };
  const swing = () => play(Z);
  await warp(Z, 133, 5);
  await until("the farm's own code has come to the trial", () => Z.evaluate(`!!${F}`), 20000);
  await take("hoe");
  for (const want of ["clear", "till"]) { await until(`the hoe is offered: ${want}`, async () => (await Z.evaluate(`${F}.deed()`)) === want, 5000); await Z.evaluate(`${F}.act()`); await swing(); await sleep(400); }
  await take("seedKangkong");
  await until("a seed is offered", async () => (await Z.evaluate(`${F}.deed()`)) === "sow", 5000);
  await Z.evaluate(`${F}.act()`);
  await sleep(500);
  await take("guardFert");
  await until("the fertiliser is offered", async () => (await Z.evaluate(`${F}.deed()`)) === "feed", 5000);
  await Z.evaluate(`${F}.act()`);
  await sleep(500);
  let seen = await Z.evaluate(`${F}.seen("133,5")`);
  ok("what is sown in the rain is wet at once", seen.crop === "kangkong" && seen.wet === true, seen);
  await take("can");
  ok("…and a can is offered nothing there", (await Z.evaluate(`${F}.deed()`)) === null);
  await Z.evaluate(`${T}.skipHours(3.9)`);
  await sleep(700);
  seen = await Z.evaluate(`${F}.seen("133,5")`);
  ok("under four hours on, a morning glory of six hours is not ripe yet", seen.ripe === false && seen.stage === 4, seen);
  await Z.evaluate(`${T}.skipHours(0.2)`);
  await sleep(700);
  seen = await Z.evaluate(`${F}.seen("133,5")`);
  ok("a little over four, it is: the rain was half as much growth again", seen.ripe === true, seen);
  await Z.shot(`${OUT}/sky-trial-rain.png`);
  ok("no page errors in the trial", Z.logs.length === 0, Z.logs.slice(0, 4));
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs).slice(0, 400)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
