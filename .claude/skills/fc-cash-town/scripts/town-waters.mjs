// Cash Town's waters that differ, tried in a real browser on the dev test room (the trial kept in the browser, `next
// dev` only), by two testers in two tabs of one browser, who share its well:
//
// - a bucket drawn at six in the morning is named for the dew; poured into the well it gives the well the dew's
//   nature for half an hour: the well's sign names it, the book says what it is and whose doing, and a watering does
//   as much again; half an hour on, it is plain again;
// - the other tester, under a rainy sky, draws the rain's water and pours it in: it takes the dew's place, and under
//   a dry sky a watering does half as much again;
// - with the moon's water in the well a plant watered is kept from pests for twelve hours;
// - at an ordinary hour a bucket is plain water, is named for nothing, and changes nothing in the well.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-waters.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", W = "window.__townWell";
const MIN = 60_000, HOUR = 60 * MIN;
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(800); };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const plots = (X) => X.evaluate(`${F}.plots()`);
const hourOf = (ms) => (((ms + 7 * HOUR) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) / HOUR;
async function enter(X, letter, sky) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=9&townWeather=${sky}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
async function chore(X, what) {
  await until(`${what} is offered`, async () => (await X.evaluate(`${F}.chore()`)) === what, 8000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
  if (await gameUp(X)) { await play(X); await sleep(600); }
}
/** Put the trial's clock at an hour of Bangkok's day (a few minutes past it). */
async function clockTo(X, hour) {
  const now = await X.evaluate(`${T}.now()`);
  await X.evaluate(`${T}.skipHours(${((hour + 0.05 - hourOf(now)) % 24 + 24) % 24})`);
  await sleep(400);
}
/** Water the plant in a plot with the can, and say what its plant has afterwards. */
async function waterAt(X, x, y) {
  await hold(X, "can");
  await warp(X, x, y);
  await until("watering is offered", async () => (await X.evaluate(`${F}.deed()`)) === "water", 8000);
  await X.evaluate(`${F}.act()`);
  await until("it is watered", async () => ((await plots(X))[`${x},${y}`].plant.watered ?? 0) > 0, 6000);
  return (await plots(X))[`${x},${y}`].plant;
}

const RIVER = [17, 42], WELL = [157, 23];
const X = await browser("Waters", { width: 1280, height: 860 });
try {
  await enter(X, "W", "cloudy");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1), ${T}.grant("can", 1), ${T}.setWell(6))`);
  await clockTo(X, 6);
  const me = await X.evaluate(`${T}.id`), t0 = await X.evaluate(`${T}.now()`);
  const plant = { soil: "tilled", plant: { by: "somebody-else", crop: "pumpkin", sown: t0 - HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } };
  for (const key of ["132,5", "133,5", "134,5", "135,5", "136,5"]) await X.evaluate(`${T}.setPlot(${JSON.stringify(key)}, ${JSON.stringify(plant)})`);
  await hold(X, "can");
  await warp(X, ...WELL);
  await until("the farm's own code has come", () => X.evaluate(`!!${F} && typeof ${F}.wellWater === "function"`), 20000);
  await chore(X, "fill");

  /* ── the dew ── */
  ok("at six in the morning the well's water is plain", Math.floor(hourOf(await X.evaluate(`${T}.now()`))) === 6 && (await X.evaluate(`${F}.wellWater()`)) === null);
  let p = await waterAt(X, 132, 5);
  ok("…and a watering adds half an hour", p.boost === 30 * MIN, p.boost / MIN);
  await hold(X, "bucket");
  await warp(X, ...RIVER);
  await chore(X, "draw");
  ok("a bucket drawn at six is named for what it holds: the dew", /น้ำค้างยามเช้า/.test((await X.evaluate(`${F}.note()`)) ?? "") && (await waterOf(X, "bucket")) === 1, await X.evaluate(`${F}.note()`));
  await X.shot(`${OUT}/waters-drawn.png`);
  await warp(X, ...WELL);
  await chore(X, "pour");
  let w = await X.evaluate(`${F}.wellWater()`);
  const poured = await X.evaluate(`${T}.now()`);
  ok("poured into the well, it gives the well the dew's nature for half an hour, and it is my doing", w?.kind === "dawn" && w.by === me && Math.abs(w.until - poured - 30 * MIN) < 5000, w);
  await sleep(1200);
  await X.shot(`${OUT}/waters-well.png`);
  await until("the book is offered", () => there(X, "[data-well-chip]"), 8000);
  await X.evaluate(`${W}.open()`);
  await until("the book opens", () => there(X, "[data-well-water]"), 5000);
  ok("the book says what the well's water is, for how long yet, and whose doing; not what it does", (await there(X, '[data-well-water="dawn"]')) && /น้ำค้างยามเช้า/.test(await textOf(X, "[data-well-water]")) && /นาที/.test(await textOf(X, "[data-well-water]"))
    && /หาบมา/.test(await textOf(X, "[data-well-water]")) && !/เท่า|โต|เร็ว/.test(await textOf(X, "[data-well-water]")), await textOf(X, "[data-well-water]"));
  await X.shot(`${OUT}/waters-book.png`);
  await X.evaluate(`${W}.close()`);
  p = await waterAt(X, 133, 5);
  ok("while the well has the dew's nature a watering does as much again: an hour of growth", p.boost === 60 * MIN && p.guard === 0, p.boost / MIN);
  await X.evaluate(`${T}.skipHours(${31 / 60})`);
  await sleep(5600);
  ok("half an hour on, the well's water is plain again", (await X.evaluate(`${F}.wellWater()`)) === null);
  p = await waterAt(X, 134, 5);
  ok("…and so is a watering", p.boost === 30 * MIN, p.boost / MIN);

  /* ── an ordinary hour ── */
  await clockTo(X, 9);
  await hold(X, "bucket");
  await warp(X, ...RIVER);
  await chore(X, "draw");
  ok("a bucket drawn at nine is named for nothing", !/น้ำค้าง|น้ำฝน|แสงจันทร์/.test((await X.evaluate(`${F}.note()`)) ?? ""), await X.evaluate(`${F}.note()`));
  await warp(X, ...WELL);
  await chore(X, "pour");
  ok("…and poured in, gives the well no nature", (await X.evaluate(`${F}.wellWater()`)) === null);

  /* ── the rain's: drawn by the other tester, under a rainy sky ── */
  await X.evaluate(`${T}.setWellWater("dawn", 60)`);
  const Y = await X.tab("WatersB");
  await enter(Y, "V", "rain");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1))`);
  const other = await Y.evaluate(`${T}.id`);
  await hold(Y, "bucket");
  await warp(Y, ...RIVER);
  await until("the farm's own code has come to the other", () => Y.evaluate(`!!${F}`), 20000);
  await chore(Y, "draw");
  ok("a bucket drawn while it rains is named for the rain", /น้ำฝน/.test((await Y.evaluate(`${F}.note()`)) ?? ""), await Y.evaluate(`${F}.note()`));
  await warp(Y, ...WELL);
  await chore(Y, "pour");
  await sleep(700);
  w = await X.evaluate(`${F}.wellWater()`);
  ok("poured into a well that has the dew's, the rain's takes its place, and it is the other's doing: both pages have it", w?.kind === "rain" && w.by === other && (await Y.evaluate(`${F}.wellWater()`))?.kind === "rain", w);
  p = await waterAt(X, 135, 5);
  ok("under a dry sky, while the well has the rain's nature a watering does half as much again", p.boost === 45 * MIN, p.boost / MIN);

  /* ── the moon's ── */
  await X.evaluate(`${T}.setWellWater("moon", 30)`);
  await sleep(500);
  const now = await X.evaluate(`${T}.now()`);
  p = await waterAt(X, 136, 5);
  ok("with the moon's water in the well a watering adds what it always did, and the plant is kept from pests for twelve hours", p.boost === 30 * MIN && Math.abs(p.guard - now - 12 * HOUR) < 20000, { boost: p.boost / MIN, hours: (p.guard - now) / HOUR });
  await warp(X, ...WELL);
  await sleep(1300);
  await X.shot(`${OUT}/waters-moon.png`);
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/waters-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
