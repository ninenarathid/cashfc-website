// The garden fae anklet (the helpers' second rank, lib/town/gifts), in a real browser on the dev test room: worn,
// a neighbour's plant grows twice as much from a watering; each plant watered within eight seconds of the last is of
// a run, told by a tune that climbs a note a plant and seen as a note going up from the plant and a row of pips; the
// run begins anew after eight seconds; from its twentieth plant a watering is three times over; the long pour of the
// gloves counts each plant of its row; and on a hot afternoon the whole is never more than three times.
//
//   node town-anklet.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes anklet-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm", G = "window.__townGame";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(600); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const ADDS = 30 * 60_000;
const boost = (X, key) => X.evaluate(`${K}.farm()[${JSON.stringify(key)}].plant.boost`);
const chip = (X) => X.evaluate(`(() => { const c = document.querySelector("[data-anklet-run]"); return c ? { run: Number(c.dataset.ankletRun), times: Number(c.dataset.ankletTimes) } : null; })()`);
const canOf = (X, n) => X.evaluate(`(() => { if (!${T}.purse().bag.some((s) => s?.item === "can")) ${T}.grant("can", 1); const p = ${T}.purse(), slot = p.bag.findIndex((s) => s?.item === "can");
  ${T}.save({ ...p, bag: p.bag.map((s, i) => (i === slot ? { ...s, water: ${n} } : s)), hand: "can" }); })()`);
const plantRow = (X, x0, y, by) => X.evaluate(`Array.from({ length: 7 }, (_, i) => ${T}.setPlot((${x0} + i) + "," + ${y}, { soil: "tilled", plant: { by: ${JSON.stringify(by)} ?? ${T}.id, crop: "pumpkin", sown: ${T}.now() - 5 * 3600000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 9999 * 3600000, cured: 0, picked: 0, pickedAt: 0 } }))`);
/** Water the plant I am taken to, by hand. */
async function waterAt(X, x, y) {
  await warp(X, x, y);
  await until(`the plant at ${x},${y} is offered to the can`, async () => (await X.evaluate(`${F}.deed()`)) === "water", 6000, 60);
  await X.evaluate(`${F}.act()`);
  await until(`the plant at ${x},${y} is watered`, () => X.evaluate(`${F}.seen("${x},${y}").wet`), 6000, 60);
}
/** The trial's clock put forward to an hour of Bangkok's day. */
const toHour = (X, hour) => X.evaluate(`(() => { const h = new Date(${T}.now() + 7 * 3600000), now = h.getUTCHours() + h.getUTCMinutes() / 60; ${T}.skipHours(((${hour} - now) % 24 + 24) % 24 + 0.05); })()`);

const X = await browser("Anklet", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=H&townRoom=check&townHour=10&townWeather=clear`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  // (a morning: no heat yet, whatever the hour this is run at)
  await toHour(X, 9);
  // a neighbour's bed (the farm's first: its corner is 132,4) with rows of young plants of theirs; and a bed of mine (the show garden)
  await X.evaluate(`(${T}.resize(14), ${T}.setGifts(false), ${T}.setStamina(100), ${T}.showGarden("H"))`);
  await X.evaluate(`${T}.write("cashtown.trial.beds.1", { ...${T}.beds(), 0: { by: "N", tended: ${T}.now(), empty: 0, name: "Nan" } })`);
  for (const y of [5, 6, 7, 8, 9, 10]) await plantRow(X, 132, y, "N");
  await canOf(X, 90);
  await warp(X, 132, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);

  // ── not worn: once over ──
  await waterAt(X, 132, 5);
  ok("with no anklet a neighbour's plant grows by one watering, and no run is shown", (await boost(X, "132,5")) === ADDS && (await chip(X)) === null && (await X.evaluate(`${F}.run()`)) === 0, await boost(X, "132,5"));
  ok("…the plant remembers whose watering it was", await X.evaluate(`(() => { const m = ${K}.farm()["132,5"].plant.pour; return !!m && m.by === ${T}.id && m.x === 1 && m.base === ${ADDS}; })()`));

  // ── worn: twice over, a run, a tune ──
  await X.evaluate(`${T}.setGifts(["charmGloves", "charmAnklet"])`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmGloves", "charmAnklet"])`);
  await waterAt(X, 133, 5);
  await until("the run is shown", async () => (await chip(X))?.run === 1, 4000, 60);
  ok("worn, the neighbour's plant grows twice as much from the watering", wore.ok === true && (await boost(X, "133,5")) === 2 * ADDS, await boost(X, "133,5"));
  ok("…a run is begun: shown as a pip and what a watering is worth, with a note going up from the plant", (await chip(X)).times === 2 && (await X.evaluate(`${F}.chimes()`)) === 1 && (await X.evaluate(`${F}.tune().join()`)) === "1", { chip: await chip(X), tune: await X.evaluate(`${F}.tune()`) });
  await X.shot(`${OUT}/anklet-first.png`);
  for (const x of [134, 135, 136]) await waterAt(X, x, 5);
  ok("each plant watered within eight seconds is of the run, and the tune climbs a note a plant", (await chip(X))?.run === 4 && (await X.evaluate(`${F}.tune().join()`)) === "1,2,3,4" && (await X.evaluate(`document.querySelectorAll("[data-anklet-run] .grid > span.bg-\\\\[\\\\#cfe9ff\\\\]").length`)) === 4,
    { chip: await chip(X), tune: await X.evaluate(`${F}.tune()`) });
  await X.shot(`${OUT}/anklet-run.png`);
  ok("…for no stamina (the gloves are on)", (await X.evaluate(`${T}.purse().stamina.left`)) === 99);
  // the gap
  await until("the run is over once eight seconds have gone by", async () => (await chip(X)) === null, 12000, 200);
  ok("more than eight seconds after the last plant the run is over, and is shown no more", (await X.evaluate(`${F}.run()`)) === 0);
  await waterAt(X, 137, 5);
  ok("…and the next plant begins a new one, at the first note again", (await chip(X))?.run === 1 && (await X.evaluate(`${F}.tune().at(-1)`)) === 1 && (await boost(X, "137,5")) === 2 * ADDS, await chip(X));

  // ── twenty in a row: three times ──
  await X.evaluate(`${T}.save({ ...${T}.purse(), chime: { n: 18, at: ${T}.now() } })`);
  await waterAt(X, 132, 6);
  ok("the nineteenth of a run is still twice over", (await boost(X, "132,6")) === 2 * ADDS && (await chip(X))?.run === 19 && (await chip(X)).times === 2, await chip(X));
  await waterAt(X, 133, 6);
  await until("the run is at its most", async () => (await chip(X))?.run === 20, 4000, 60);
  ok("the twentieth grows three times as much, and the run shows it", (await boost(X, "133,6")) === 3 * ADDS && (await chip(X)).times === 3 && (await X.evaluate(`${F}.tune().at(-1)`)) === 20, { chip: await chip(X), boost: await boost(X, "133,6") });
  await X.shot(`${OUT}/anklet-twenty.png`);

  // ── the long pour of the gloves: each plant of the row is of the run ──
  await warp(X, 134, 7);
  await until("the long pour is offered", () => has(X, `[data-farm-gift="charmGloves"]`), 6000);
  await X.evaluate(`${F}.pourAct()`);
  await until("the long pour is up", async () => (await gameUp(X)) === "longpour", 6000, 30);
  await X.evaluate(`${G}.steady(0.5)`);
  await until("the pour is over", async () => (await gameUp(X)) === null, 12000, 40);
  await until("the row is watered", () => X.evaluate(`${F}.seen("138,7").wet`), 6000);
  await until("the row's notes are played", async () => (await X.evaluate(`${F}.tune().length`)) >= 7 + 7, 6000, 80);
  const row7 = await X.evaluate(`[132, 133, 134, 135, 136, 137, 138].map((x) => ${K}.farm()[x + ",7"].plant.boost)`);
  ok("a row poured with the gloves: seven plants more of the run, each three times over, the pour's own seconds not breaking it", row7.every((b) => b === 3 * ADDS) && (await X.evaluate(`${F}.run()`)) === 27, { row7, run: await X.evaluate(`${F}.run()`) });
  ok("…and a note for each of them, one after another", (await X.evaluate(`${F}.tune().slice(-7).join()`)) === "21,22,23,24,25,26,27", await X.evaluate(`${F}.tune()`));
  await sleep(300);
  await X.shot(`${OUT}/anklet-row.png`);

  // ── one's own plant: as ever ──
  await X.evaluate(`${T}.save({ ...${T}.purse(), chime: undefined })`);
  await waterAt(X, 150, 14);
  ok("my own plant grows by one watering, and is of no run", (await boost(X, "150,14")) === ADDS && (await X.evaluate(`${F}.run()`)) === 0 && (await chip(X)) === null, await boost(X, "150,14"));

  // ── a hot afternoon: never more than three times ──
  await toHour(X, 13);
  await sleep(600);
  ok("(an afternoon under a clear sky is hot)", (await X.evaluate(`${F}.hot()`)) === true);
  await waterAt(X, 132, 9);
  ok("on a hot afternoon, where a watering does as much again by itself, the anklet's twice makes it three times and not four", (await boost(X, "132,9")) === 3 * ADDS && (await X.evaluate(`${K}.farm()["132,9"].plant.pour.x`)) === 3, await boost(X, "132,9"));
  await X.evaluate(`${K}.charmsWear(["charmGloves"])`);
  await waterAt(X, 133, 9);
  ok("…and with no anklet the heat is as it always was: twice", (await boost(X, "133,9")) === 2 * ADDS, await boost(X, "133,9"));

  // ── at a phone's width ──
  await X.evaluate(`${K}.charmsWear(["charmGloves", "charmAnklet"])`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await waterAt(X, 134, 9);
  await until("the run is shown on the phone", async () => (await chip(X)) !== null, 4000, 60);
  const fits = await X.evaluate(`(() => { const r = document.querySelector("[data-anklet-run]").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 60; })()`);
  ok("at a phone's width the run is whole on the screen", fits === true);
  await X.shot(`${OUT}/anklet-phone.png`);
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
