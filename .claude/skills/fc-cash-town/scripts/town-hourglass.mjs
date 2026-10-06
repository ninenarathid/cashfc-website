// The hourglass of seasons (the farm's fifth rank, lib/town/gifts), in a real browser on the dev test room: had,
// standing in a bed of one's own, it is turned over the bed from a button of its own: every plant that lives there
// grows three times as fast for three hours, and the sand is seen over them and the hourglass over the bed, with how
// long is left, by day and by night. Once a day.
//
//   node town-hourglass.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes hourglass-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const BTN = `[data-farm-gift="thingHourglass"]`, HOUR = 3600000;
const page = (hour) => `${BASE}/town?townTest=O&townRoom=check&townHour=${hour}&townWeather=cloudy`;
const open = async (X, hour) => {
  await X.goto(page(hour));
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};

const X = await browser("Hourglass", { width: 1280, height: 860 });
try {
  await open(X, 10);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await open(X, 10);
  // (the trial's clock is put on to ten in the morning by Bangkok's: a turning is counted to a day, which begins at
  // dawn, and the three hours and a bit this check waits through must not cross one whatever the hour it is run at)
  await X.evaluate(`(() => { const H = 3600000, now = ${T}.now(), hour = (((now + 7 * H) % (24 * H)) + 24 * H) % (24 * H) / H; ${T}.skipHours((10 - hour + 24) % 24); })()`);
  await sleep(400);
  // four beds of mine with every vegetable at every stage (the test window's show garden): the first is at 148,12
  await X.evaluate(`(${T}.resize(10), ${T}.setGifts(false), ${T}.setStamina(50), ${T}.showGarden("O"))`);
  await warp(X, 153, 15);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await sleep(600);
  ok("without the hourglass nothing is offered in my bed", (await X.evaluate(`${F}.glass().length`)) === 0 && !(await has(X, BTN)));

  await X.evaluate(`${T}.setGifts(["thingHourglass"])`);
  await until("the hourglass is offered the bed", () => has(X, BTN), 6000);
  const reach = await X.evaluate(`${F}.glass()`);
  ok("had, it is offered over my bed: every plant that lives there, thirty-five of them", reach.length === 35 && (await X.evaluate(`Object.keys(${F}.sand()).length`)) === 0, reach.length);
  await X.shot(`${OUT}/hourglass-offer.png`);
  // a morning glory in its second stage (a tenth to three tenths of its six hours gone), watched
  const KEY = "149,12", was = await X.evaluate(`({ stage: ${F}.seen("${KEY}").stage, plant: ${K}.farm()["${KEY}"].plant, now: ${T}.now() })`);
  await X.evaluate(`document.querySelector(${JSON.stringify(BTN)}).click()`);
  await until("the sand runs", async () => (await X.evaluate(`Object.keys(${F}.sand()).length`)) === 35, 6000);
  const sand = await X.evaluate(`${F}.sand()`), turned = await X.evaluate(`${K}.farm()["${KEY}"].plant.fast`);
  ok("turned: the sand runs over every one of them, for three hours from that moment", Object.values(sand).every((u) => Math.abs(u - turned[0] - 3 * HOUR) < 1) && turned.length === 1 && Math.abs(turned[0] - was.now) < 20000, { turned, was: was.now });
  ok("…for no stamina; the day's turning is counted, and it is not offered again", (await X.evaluate(`${T}.purse().stamina.left`)) === 50 && (await X.evaluate(`${T}.purse().gifts.used.thingHourglass.n`)) === 1
    && (await X.evaluate(`${F}.glass().length`)) === 0 && !(await has(X, BTN)));
  await sleep(900);
  await X.shot(`${OUT}/hourglass-day.png`);
  const again = await X.evaluate(`${K}.glassDo("153,15")`);
  ok("asked all the same, it is refused: once a day", again.ok === false && again.why === "spent", again);
  // an hour on: the morning glory has grown three hours in it
  await X.evaluate(`${T}.skipHours(1)`);
  await sleep(1500);
  const then = await X.evaluate(`({ stage: ${F}.seen("${KEY}").stage, now: ${T}.now() })`);
  const hoursPlain = (then.now - was.plant.sown) / HOUR, hoursQuick = hoursPlain + 2 * Math.min(3, (then.now - turned[0]) / HOUR);
  const stageAt = (h) => { const part = h / 6; return part >= 1 ? 5 : part < 0.1 ? 1 : part < 0.3 ? 2 : part < 0.6 ? 3 : 4; };
  ok("an hour on the plant watched is a stage further than the clock alone would have it: three hours' growth in one", was.stage === 2 && then.stage === stageAt(hoursQuick) && stageAt(hoursQuick) > stageAt(hoursPlain), { was: was.stage, then: then.stage, hoursPlain, hoursQuick });
  // by night the sand is seen from across the farm
  await open(X, 22);
  await warp(X, 153, 17);
  await until("the farm's own code has come again", () => X.evaluate(`!!${F}`), 20000);
  await sleep(1800);
  ok("the page that came later knows of it from the plants themselves: the sand still runs", (await X.evaluate(`Object.keys(${F}.sand()).length`)) === 35);
  await X.shot(`${OUT}/hourglass-night.png`);
  // the three hours gone: no sand; and the plant is six hours ahead for good
  await X.evaluate(`${T}.skipHours(2.1)`);
  await until("the sand has run out", async () => (await X.evaluate(`Object.keys(${F}.sand()).length`)) === 0, 9000);
  ok("three hours gone, the sand has run out, and the same day it is not offered again", !(await has(X, BTN)) && (await X.evaluate(`${F}.glass().length`)) === 0);
  // tomorrow it is turned again, and the plants remember both; at a phone's width the button is whole
  await X.evaluate(`${T}.skipHours(24)`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await until("a day on it is offered again", () => has(X, BTN), 8000);
  const fits = await X.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(BTN)}).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44; })()`);
  ok("a day on it is offered again; at a phone's width the button is whole on the screen", fits === true);
  await X.evaluate(`${F}.glassTurn()`);
  await until("the sand runs again", async () => (await X.evaluate(`Object.keys(${F}.sand()).length`)) > 0, 6000);
  await sleep(700);
  await X.shot(`${OUT}/hourglass-phone.png`);
  const twice = await X.evaluate(`Object.values(${K}.farm()).filter((p) => p.plant && p.plant.fast && p.plant.fast.length === 2).length`);
  ok("turned again, the plants that were there both times remember both", twice > 10, twice);
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
