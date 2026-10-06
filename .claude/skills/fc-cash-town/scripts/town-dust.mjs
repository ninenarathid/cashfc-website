// Garden fae dust (the helpers' fifth rank, lib/town/gifts), in a real browser on the dev test room, by two testers
// in two windows of one browser (the trial keeps the farm and both purses there): standing on a neighbour's plant
// that has a pest, the dust is offered; sprinkled, the plant glitters, the page says until when it holds, the pest
// is still there, and the plant's owner is told who did it and has them to thank. Seven hours on the dusted plant
// lives where one nobody dusted has died. Not on a plant of one's own, not twice on one plant, five a day.
//
//   node town-dust.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes dust-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(650); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const BTN = `[data-farm-gift="thingDust"]`;
const seen = (X, key) => X.evaluate(`${F}.seen(${JSON.stringify(key)})`);
const news = (X) => X.evaluate(`(() => { const p = document.querySelector("[data-help-news]"); return p ? { what: p.dataset.helpNews, by: p.dataset.helpBy, text: p.innerText } : null; })()`);
const usedOf = (X) => X.evaluate(`${T}.purse().gifts?.used?.thingDust?.n ?? 0`);
const toHour = (X, hour) => X.evaluate(`(() => { const h = new Date(${T}.now() + 7 * 3600000), now = h.getUTCHours() + h.getUTCMinutes() / 60; ${T}.skipHours(((${hour} - now) % 24 + 24) % 24 + 0.02); })()`);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=helpdust&townHour=14&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
/** A bed of somebody's, every plot of it sown at half past seven this morning (the trial's clock is at two): the plants a pest has struck since, by their keys. */
const pestBed = (X, bed, bx, by, who) => X.evaluate(`(() => { const now = ${T}.now(), struck = [];
  for (let v = 0; v < 7; v++) for (let u = 0; u < 7; u++) ${T}.setPlot((${bx} + u) + "," + (${by} + v), { soil: "tilled", plant: { by: ${JSON.stringify(who)}, crop: "pumpkin", sown: now - 6.5 * 3600000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } });
  ${T}.write("cashtown.trial.beds.1", { ...${T}.beds(), [${bed}]: { by: ${JSON.stringify(who)}, tended: now, empty: 0, name: ${JSON.stringify(who)} } });
  return true; })()`);
const struckIn = (X, bx, by) => X.evaluate(`(() => { const out = []; for (let v = 0; v < 7; v++) for (let u = 0; u < 7; u++) { const k = (${bx} + u) + "," + (${by} + v); if (${F}.seen(k).pest) out.push(k); } return out; })()`);
const xy = (k) => k.split(",").map(Number);

const X = await browser("Dust", { width: 1280, height: 860 });
try {
  await enter(X, "D");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await enter(X, "D");
  // (pests strike by day: two in the afternoon, whatever the hour this is run at; and no insect counted on the farm, so that the roll is the plot's own)
  await X.evaluate(`${T}.holdSwarm(true)`);
  await toHour(X, 14);
  await X.evaluate(`(${T}.setGifts(false), ${T}.setStamina(60), ${T}.setLine("helpers", 0))`);
  const a = await X.evaluate(`${T}.id`);

  const Y = await X.window("DustB");
  await enter(Y, "E");
  await Y.evaluate(`(${T}.holdSwarm(true), ${T}.setGifts(false), ${T}.save({ ...${T}.purse(), aided: [] }))`);
  const b = await Y.evaluate(`${T}.id`);
  // two beds of the neighbour's (the farm's first two: corners 132,4 and 140,4) and one of mine (148,4), all sown this morning
  await pestBed(X, 0, 132, 4, b);
  await pestBed(X, 1, 140, 4, b);
  await pestBed(X, 2, 148, 4, a);
  await warp(X, 132, 4);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await warp(Y, 131, 3);
  await until("the farm's own code has come to the second window", () => Y.evaluate(`!!${F}`), 20000);
  await sleep(400);
  const all = [...(await struckIn(X, 132, 4)), ...(await struckIn(X, 140, 4))], mine = await struckIn(X, 148, 4);
  // (one of them that a pest struck within the last three hours: three hours on it lives still. It is the one dusted first, so that it has hours left when its dust is gone)
  await X.evaluate(`${T}.skipHours(3)`);
  await sleep(700);
  const late = [];
  for (const k of all) { const s = await seen(X, k); if (s.pest && !s.dead) late.push(k); }
  await X.evaluate(`${T}.skipHours(-3)`);
  await sleep(700);
  const sick = late.length ? [late[0], ...all.filter((k) => k !== late[0])] : all;
  ok(`(the farm's own roll struck ${sick.length} of the neighbour's plants since the morning, ${late.length} of them within the last three hours, and ${mine.length} of mine)`, sick.length >= 7 && late.length >= 1 && mine.length >= 1, { sick: sick.length, late: late.length, mine: mine.length });
  const clean = await X.evaluate(`(() => { for (let u = 0; u < 7; u++) for (let v = 0; v < 7; v++) { const k = (132 + u) + "," + (4 + v); if (!${F}.seen(k).pest) return k; } return null; })()`);

  // ── without the dust: nothing; with it: offered on a neighbour's pest-ridden plant ──
  await warp(X, ...xy(sick[0]));
  ok("without the dust nothing is offered on a neighbour's plant that has a pest", (await X.evaluate(`${F}.dust()`)) === false && !(await has(X, BTN)));
  await X.evaluate(`${T}.setGifts(["thingDust"])`);
  await until("the dust is offered", () => has(X, BTN), 6000);
  ok("with it, the dust is offered there, with how many the day has left", /5/.test(await X.evaluate(`document.querySelector(${JSON.stringify(BTN)} + " [data-farm-gift-more]")?.innerText ?? ""`)));
  await X.shot(`${OUT}/dust-offer.png`);
  await X.evaluate(`document.querySelector(${JSON.stringify(BTN)}).click()`);
  await until("the plant is dusted", async () => (sick[0] in (await X.evaluate(`${F}.dusted()`))), 6000, 60);
  const after = await seen(X, sick[0]);
  ok("sprinkled: the plant has the dust on it, and its pest still (it is no cure)", after.pest === true && after.dead === false && (await usedOf(X)) === 1 && (await X.evaluate(`${T}.purse().stamina.left`)) === 60, after);
  ok("the page says until when it holds", /ถึง \d\d:\d\d/.test(await X.evaluate(`${F}.note() ?? ""`)), await X.evaluate(`${F}.note()`));
  ok("…and it is help on the helpers' line", (await X.evaluate(`${K}.lines().lines.helpers.points`)) === 2);
  await sleep(500);
  await X.shot(`${OUT}/dust-on.png`);
  ok("it is not offered twice on one plant", (await X.evaluate(`${F}.dust()`)) === false && !(await has(X, BTN)));

  // ── the owner is told, and has somebody to thank ──
  await until("the plant's owner is told who did it", async () => (await news(Y))?.what === "dust", 8000, 80);
  const told = await news(Y);
  ok("the plant's owner is told who sprinkled it", told.by === a && /ผงภูตสวน/.test(told.text) && /D/.test(told.text), told);
  await Y.shot(`${OUT}/dust-told.png`);
  ok("…the owner's screen shows the dust on the plant too", sick[0] in (await Y.evaluate(`${F}.dusted()`)));
  ok("…and the owner has the duster among those to thank at the picking", await Y.evaluate(`(${K}.toThank()[${JSON.stringify(sick[0])}] ?? []).some((h) => h.id === ${JSON.stringify(a)})`), await Y.evaluate(`${K}.toThank()`));

  // ── not where there is no pest, nor on a plant of one's own ──
  await warp(X, ...xy(clean));
  ok("a plant with no pest is offered no dust", (await X.evaluate(`${F}.dust()`)) === false && !(await has(X, BTN)));
  await warp(X, ...xy(mine[0]));
  ok("nor a plant of my own, though it has a pest", (await seen(X, mine[0])).pest === true && (await X.evaluate(`${F}.dust()`)) === false && !(await has(X, BTN)));

  // ── five a day ──
  for (const k of sick.slice(2, 6)) {
    await warp(X, ...xy(k));
    await until(`the dust is offered at ${k}`, () => has(X, BTN), 6000);
    await X.evaluate(`${F}.dustAct()`);
    await until(`the plant at ${k} is dusted`, async () => (k in (await X.evaluate(`${F}.dusted()`))), 6000, 60);
  }
  await warp(X, ...xy(sick[6]));
  await sleep(500);
  ok("the day's fifth sprinkling is its last: a sixth plant is offered none", (await usedOf(X)) === 5 && (await X.evaluate(`${F}.dust()`)) === false && !(await has(X, BTN)) && (await seen(X, sick[6])).pest === true);

  // ── seven hours on ──
  await X.evaluate(`${T}.skipHours(7)`);
  await sleep(1200);
  const lived = await seen(X, sick[0]), died = await seen(X, sick[1]);
  ok("seven hours on, the dusted plant is alive with its pest, where one nobody dusted has died of its own", lived.pest === true && lived.dead === false && died.dead === true, { lived, died });
  await warp(X, ...xy(sick[0]));
  await sleep(400);
  await X.shot(`${OUT}/dust-night.png`);
  // ── at a phone's width ──
  await X.evaluate(`${T}.save({ ...${T}.purse(), gifts: { ...${T}.purse().gifts, used: {} } })`);
  await X.evaluate(`${T}.skipHours(6)`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(1200);
  const gone = await seen(X, sick[0]);
  ok("thirteen hours on the dust is gone from the plant, and its clock goes on (it has its pest still, and is not dead yet)", !(sick[0] in (await X.evaluate(`${F}.dusted()`))) && gone.pest === true, gone);
  await until("the dust is offered again on the phone", () => has(X, BTN), 6000);
  const fits = await X.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(BTN)}).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44; })()`);
  ok("its dust gone, the plant may be dusted again; at a phone's width the button is whole on the screen", fits === true);
  await X.shot(`${OUT}/dust-phone.png`);
  const threw = [...(X.logs ?? []), ...(Y.logs ?? [])].filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on either page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
