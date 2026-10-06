// The duet bell (the helpers' third rank, lib/town/gifts), in a real browser on the dev test room, by two testers in
// two windows of one browser (the trial keeps both purses and the farm there): one of them wears the bell, the other
// has no gift at all. Alone it does nothing. When the other waters a plant of the same neighbour's bed within ten
// seconds, the bell rings for both: both waterings are doubled (the first one's too), each has two stamina back,
// each page says who it rang with and swings a bell over both heads, and each is counted a point more on the
// helpers' line. More than ten seconds apart, it does not ring.
//
//   node town-bell.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes bell-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(600); };
const ADDS = 30 * 60_000;
const boost = (X, key) => X.evaluate(`${K}.farm()[${JSON.stringify(key)}].plant.boost`);
const stamina = (X) => X.evaluate(`${T}.purse().stamina.left`);
const points = (X) => X.evaluate(`${K}.lines().lines.helpers.points`);
const news = (X) => X.evaluate(`(() => { const p = document.querySelector("[data-help-news]"); return p ? { what: p.dataset.helpNews, by: p.dataset.helpBy, text: p.innerText } : null; })()`);
const canOf = (X, n) => X.evaluate(`(() => { if (!${T}.purse().bag.some((s) => s?.item === "can")) ${T}.grant("can", 1); const p = ${T}.purse(), slot = p.bag.findIndex((s) => s?.item === "can");
  ${T}.save({ ...p, bag: p.bag.map((s, i) => (i === slot ? { ...s, water: ${n} } : s)), hand: "can" }); })()`);
const plantRow = (X, x0, y, by) => X.evaluate(`Array.from({ length: 7 }, (_, i) => ${T}.setPlot((${x0} + i) + "," + ${y}, { soil: "tilled", plant: { by: ${JSON.stringify(by)}, crop: "pumpkin", sown: ${T}.now() - 5 * 3600000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 9999 * 3600000, cured: 0, picked: 0, pickedAt: 0 } }))`);
async function waterAt(X, x, y) {
  await warp(X, x, y);
  await until(`the plant at ${x},${y} is offered to the can`, async () => (await X.evaluate(`${F}.deed()`)) === "water", 6000, 60);
  await X.evaluate(`${F}.act()`);
  await until(`the plant at ${x},${y} is watered`, () => X.evaluate(`${F}.seen("${x},${y}").wet`), 6000, 60);
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=helpbell&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}

const X = await browser("Bell", { width: 1280, height: 860 });
try {
  await enter(X, "P");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await enter(X, "P");
  await X.evaluate(`(${T}.resize(14), ${T}.setGifts(["charmBell"]), ${T}.setStamina(50), ${T}.setLine("helpers", 0), ${T}.save({ ...${T}.purse(), aided: [], rung: undefined }))`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmBell"])`);
  await X.evaluate(`${T}.write("cashtown.trial.beds.1", { ...${T}.beds(), 0: { by: "N", tended: ${T}.now(), empty: 0, name: "Nan" } })`);
  for (const y of [5, 6, 7, 8]) await plantRow(X, 132, y, "N");
  await canOf(X, 40);
  const a = await X.evaluate(`${T}.id`);
  await warp(X, 132, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);

  const Y = await X.window("BellB");
  await enter(Y, "Q");
  await Y.evaluate(`(${T}.resize(14), ${T}.setGifts(false), ${T}.setStamina(50), ${T}.setLine("helpers", 0), ${T}.save({ ...${T}.purse(), aided: [], rung: undefined }))`);
  await canOf(Y, 40);
  const b = await Y.evaluate(`${T}.id`);
  await warp(Y, 134, 6);
  await until("the farm's own code has come to the second window", () => Y.evaluate(`!!${F}`), 20000);

  // ── alone: nothing ──
  await waterAt(X, 132, 5);
  await sleep(600);
  ok("alone the bell does nothing: one watering's worth, no word of a bell", wore.ok === true && (await boost(X, "132,5")) === ADDS && (await news(X)) === null && (await stamina(X)) === 49, { boost: await boost(X, "132,5"), news: await news(X) });
  await until("ten seconds have gone by", async () => (await X.evaluate(`${T}.now() - ${K}.farm()["132,5"].plant.watered`)) > 10500, 15000, 250);

  // ── with a friend, within ten seconds ──
  await waterAt(X, 132, 6);
  await waterAt(Y, 133, 6);
  await until("the friend is told of the bell", async () => (await news(Y))?.what === "bell", 6000, 60);
  await until("the wearer is told of it too", async () => (await news(X))?.what === "bell", 6000, 60);
  const told = { x: await news(X), y: await news(Y) };
  ok("a friend with no bell waters in the same bed within ten seconds: it rings for both, and each page says who with", told.x.by === b && told.y.by === a && /ระฆังคู่หู/.test(told.x.text) && /ระฆังคู่หู/.test(told.y.text) && /\+2/.test(told.y.text), told);
  await X.shot(`${OUT}/bell-wearer.png`);
  await Y.shot(`${OUT}/bell-friend.png`);
  ok("both waterings count double: the friend's, and the wearer's from before it", (await boost(Y, "133,6")) === 2 * ADDS && (await boost(Y, "132,6")) === 2 * ADDS && (await boost(X, "132,6")) === 2 * ADDS, { first: await boost(X, "132,6"), second: await boost(Y, "133,6") });
  ok("each has two stamina back for the plant", (await stamina(X)) === 49 - 1 + 2 && (await stamina(Y)) === 50 - 1 + 2, { x: await stamina(X), y: await stamina(Y) });
  ok("each is counted a point more on the helpers' line: two for the plant watered", (await points(X)) === 1 + 2 && (await points(Y)) === 2, { x: await points(X), y: await points(Y) });
  const swung = { x: await X.evaluate(`${F}.bells()`), y: await Y.evaluate(`${F}.bells()`) };
  ok("a bell swings over both heads on both screens", swung.x.length === 1 && swung.x[0].includes(a) && swung.x[0].includes(b) && swung.y.length === 1 && swung.y[0].includes(a) && swung.y[0].includes(b), swung);

  // ── the friend goes on: each plant within ten seconds of the other's rings ──
  await waterAt(Y, 134, 6);
  ok("the friend's next plant within the ten seconds is doubled too, and the wearer's is not doubled twice", (await boost(Y, "134,6")) === 2 * ADDS && (await boost(Y, "132,6")) === 2 * ADDS && (await stamina(Y)) === 51 - 1 + 2 && (await stamina(X)) === 50, { y: await stamina(Y), x: await stamina(X) });

  // ── more than ten seconds apart: no bell ──
  await until("ten seconds have gone by again", async () => (await X.evaluate(`${T}.now() - ${K}.farm()["134,6"].plant.watered`)) > 10500, 15000, 250);
  await until("the word of the bell is gone", async () => (await news(Y)) === null, 8000, 100);
  await waterAt(Y, 132, 7);
  await sleep(500);
  ok("more than ten seconds after the other's watering no bell rings", (await boost(Y, "132,7")) === ADDS && (await news(Y)) === null && (await stamina(Y)) === 52 - 1, { boost: await boost(Y, "132,7"), y: await stamina(Y) });

  // ── at a phone's width the word of it fits ──
  await Y.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await waterAt(X, 133, 7);
  await until("the friend's phone is told of the bell", async () => (await news(Y))?.what === "bell", 6000, 60);
  const fits = await Y.evaluate(`(() => { const r = document.querySelector("[data-help-news]").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top > 60; })()`);
  ok("the wearer waters beside the friend's plant: it rings again, and at a phone's width the word of it is whole on the screen", fits === true && (await boost(X, "133,7")) === 2 * ADDS && (await boost(X, "132,7")) === 2 * ADDS, { fits });
  await sleep(250);
  await Y.shot(`${OUT}/bell-phone.png`);
  const threw = [...(X.logs ?? []), ...(Y.logs ?? [])].filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on either page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
