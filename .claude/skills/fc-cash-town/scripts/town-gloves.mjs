// The gardener's gloves (the helpers' first rank, lib/town/gifts), in a real browser on the dev test room: worn, work
// in somebody else's bed takes no stamina at all, and a row of their thirsty plants is offered at one long pour
// beside watering the one plant. The pour is a game of its own (lib/town/longpour): the water runs along the row
// while the button is held; let go between the marks beyond the last plant, the whole row is watered; let go sooner,
// the plants ahead of it get none; held too long it is spilt, and the row's last plants get none. Each plant watered
// earns its point on the helpers' line. In a bed of one's own nothing is changed.
//
//   node town-gloves.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes gloves-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm", G = "window.__townGame";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const BTN = `[data-farm-gift="charmGloves"]`;
const stamina = (X) => X.evaluate(`${T}.purse().stamina.left`);
const water = (X) => X.evaluate(`${T}.purse().bag.reduce((n, s) => n + (s && s.item === "can" ? s.water ?? 0 : 0), 0)`);
const points = (X) => X.evaluate(`${K}.lines().lines.helpers.points`);
/** A can with so many waterings in it, in my hand. */
const canOf = (X, n) => X.evaluate(`(() => { if (!${T}.purse().bag.some((s) => s?.item === "can")) ${T}.grant("can", 1); const p = ${T}.purse(), slot = p.bag.findIndex((s) => s?.item === "can");
  ${T}.save({ ...p, bag: p.bag.map((s, i) => (i === slot ? { ...s, water: ${n} } : s)), hand: "can" }); })()`);
/** A row of growing plants that no pest comes to, sown by somebody: `crops` along x from `x0`. */
const plantRow = (X, x0, y, crops, by) => X.evaluate(`${JSON.stringify(crops)}.forEach((crop, i) => { if (crop) ${T}.setPlot((${x0} + i) + "," + ${y}, { soil: "tilled", plant: { by: ${JSON.stringify(by)} ?? ${T}.id, crop, sown: ${T}.now() - 5 * 3600000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 9999 * 3600000, cured: 0, picked: 0, pickedAt: 0 } }); })`);
const wetAt = (X, keys) => X.evaluate(`${JSON.stringify(keys)}.map((k) => ${F}.seen(k).wet)`);
const rowAt = (y) => [132, 133, 134, 135, 136, 137, 138].map((x) => `${x},${y}`);
async function pourUp(X) {
  await until("the long pour is offered", () => has(X, BTN), 6000);
  await X.evaluate(`document.querySelector(${JSON.stringify(BTN)}).click()`);
  await until("the long pour is up", async () => (await gameUp(X)) === "longpour", 6000, 30);
}
const pourGone = (X) => until("the pour is over", async () => (await gameUp(X)) === null, 12000, 40);

const X = await browser("Gloves", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=G&townRoom=check&townHour=10&townWeather=cloudy`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  // a neighbour's bed (the farm's first: its corner is 132,4), with three rows of young plants of theirs; and a bed of mine (the show garden)
  await X.evaluate(`(${T}.resize(14), ${T}.setGifts(false), ${T}.setStamina(100), ${T}.showGarden("G"), ${T}.setLine("helpers", 0))`);
  await X.evaluate(`${T}.write("cashtown.trial.beds.1", { ...${T}.beds(), 0: { by: "N", tended: ${T}.now(), empty: 0, name: "Nan" } })`);
  await plantRow(X, 132, 7, Array(7).fill("pumpkin"), "N");
  await plantRow(X, 132, 8, ["pumpkin", "carrot", "kangkong", "cabbage", "chili", "scallion", "pumpkin"], "N");
  await plantRow(X, 132, 9, Array(7).fill("cabbage"), "N");
  await plantRow(X, 132, 10, Array(7).fill("kangkong"), "N");
  await canOf(X, 40);
  await warp(X, 135, 7);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await until("the neighbour's plant is offered to the can", async () => (await X.evaluate(`${F}.deed()`)) === "water", 6000);

  // ── not worn: the one plant, for its stamina ──
  ok("with no gloves worn only the one plant is offered", (await X.evaluate(`${F}.pour().length`)) === 0 && (await has(X, `[data-farm-offer="water"]`)) && !(await has(X, `[data-farm-gift]`)));
  await X.evaluate(`${F}.act()`);
  await until("the plant is watered", async () => (await wetAt(X, ["135,7"]))[0], 6000);
  ok("…and watering a neighbour's plant by hand costs its point of stamina, as ever", (await stamina(X)) === 99 && (await water(X)) === 39 && (await points(X)) === 1, { stamina: await stamina(X), points: await points(X) });

  // ── worn: no stamina, and the row beside the one plant ──
  await X.evaluate(`${T}.setGifts(["charmGloves"])`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmGloves"])`);
  await warp(X, 134, 7);
  await until("the row is offered", () => has(X, BTN), 6000);
  const offered = await X.evaluate(`${F}.pour()`);
  ok("worn, the row of the neighbour's thirsty plants is offered beside the one plant: six of them, not the one watered already", wore.ok === true && offered.length === 6 && !offered.includes("135,7") && (await has(X, `[data-farm-offer="water"]`)), offered);
  ok("…the button says how many plants", /6/.test(await X.evaluate(`document.querySelector(${JSON.stringify(BTN)} + " [data-farm-gift-more]")?.innerText ?? ""`)));
  await X.shot(`${OUT}/gloves-offer.png`);
  await X.evaluate(`${F}.act()`);
  await until("the one plant is watered by hand", async () => (await wetAt(X, ["134,7"]))[0], 6000);
  ok("the one plant watered by hand takes no stamina with the gloves on, and earns its point", (await stamina(X)) === 99 && (await water(X)) === 38 && (await points(X)) === 2, { stamina: await stamina(X) });

  // ── the long pour: the whole row ──
  await warp(X, 133, 7);
  await pourUp(X);
  const begun = await X.evaluate(`${G}.state()`);
  ok("it is a game of its own: the row's thirsty plants at their places, the water not yet poured, the marks beyond the last plant", (await has(X, `[data-look="longpour"]`)) && begun.places.join() === "0,1,4,5,6"
    && begun.front < 0 && Math.abs(begun.zone - 0.6) < 1e-9 && begun.end === 6.5 && (await X.evaluate(`document.querySelectorAll('[data-pour-plant="waits"]').length`)) === 5 && (await has(X, "[data-marks]")), begun);
  await X.shot(`${OUT}/gloves-pour.png`);
  // (the real button, held with a real mouse for a moment: the water runs while it is held)
  const btn = await X.evaluate(`(() => { const b = document.querySelector("[data-town-game] button.min-h-14").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", ...btn, button: "left", clickCount: 1, pointerType: "mouse" });
  await until("the water has reached the first plants", async () => ((await X.evaluate(`${G}?.state?.().front ?? 99`)) > 1.6), 8000, 20);
  const mid = await X.evaluate(`({ held: ${G}.state().held, wet: document.querySelectorAll('[data-pour-plant="wet"]').length, waits: document.querySelectorAll('[data-pour-plant="waits"]').length })`);
  ok("held, the water runs along the row: the plants behind it are watered, the ones ahead still wait", mid.held === true && mid.wet === 2 && mid.waits === 3, mid);
  await X.shot(`${OUT}/gloves-running.png`);
  // (and a steady hand lets go between the marks)
  await X.evaluate(`${G}.steady(0.5)`);
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...btn, button: "left", clickCount: 1, pointerType: "mouse" });
  await pourGone(X);
  await until("the row is watered", async () => (await wetAt(X, rowAt(7))).every(Boolean), 6000);
  ok("let go between the marks, the whole row is watered: five plants more, each a watering out of the can", (await water(X)) === 33, { water: await water(X) });
  ok("…for no stamina, and a point each on the helpers' line", (await stamina(X)) === 99 && (await points(X)) === 7, { stamina: await stamina(X), points: await points(X) });
  ok("the page says how many plants had their water", await X.evaluate(`/5 จาก 5/.test(${F}.note() ?? "")`), await X.evaluate(`${F}.note()`));
  await sleep(500);
  await X.shot(`${OUT}/gloves-done.png`);

  // ── let go too soon: the plants ahead of the water get none ──
  await warp(X, 135, 8);
  await pourUp(X);
  await X.evaluate(`${G}.stopAfter(3)`);
  await pourGone(X);
  await until("part of the row is watered", async () => (await wetAt(X, rowAt(8)))[3], 6000);
  ok("let go as the water passes the fourth plant: four are watered, and the three ahead of it are left dry", (await wetAt(X, rowAt(8))).join() === "true,true,true,true,false,false,false" && (await water(X)) === 29 && (await points(X)) === 11, await wetAt(X, rowAt(8)));
  await warp(X, 137, 8);
  ok("…and what is left of the row is a row to pour along again", (await X.evaluate(`${F}.pour().length`)) === 3, await X.evaluate(`${F}.pour()`));

  // ── held too long: spilt, and the row's last plants get none; tired hands have narrower marks ──
  await X.evaluate(`${T}.setStamina(0)`);
  await warp(X, 135, 9);
  await pourUp(X);
  const tired = await X.evaluate(`${G}.state()`);
  ok("with no stamina the marks are narrower and the water quicker", Math.abs(tired.zone - 0.6 * 0.35) < 1e-9 && tired.speed > begun.speed * 1.3, { zone: tired.zone, speed: tired.speed });
  await X.evaluate(`${G}.spill()`);
  await until("it is spilt", async () => (await X.evaluate(`${G}?.state?.().spilt ?? true`)) === true, 9000, 20);
  await X.shot(`${OUT}/gloves-spilt.png`);
  await pourGone(X);
  await until("the spilt row is kept", async () => (await wetAt(X, rowAt(9)))[0], 6000);
  ok("held past the marks it is spilt: the row's last two plants get none, the five before them are watered", (await wetAt(X, rowAt(9))).join() === "true,true,true,true,true,false,false" && (await water(X)) === 24, await wetAt(X, rowAt(9)));
  ok("…tired hands pay no stamina they have not got, and earn their points all the same", (await stamina(X)) === 0 && (await points(X)) === 16, { points: await points(X) });

  // ── given up: nothing is poured ──
  await X.evaluate(`${T}.setStamina(100)`);
  await warp(X, 135, 10);
  await pourUp(X);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await pourGone(X);
  ok("given up before it is poured, nothing is watered and nothing spent", (await wetAt(X, rowAt(10))).every((w) => !w) && (await water(X)) === 24);

  // ── at a phone's width ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await until("the row is offered at a phone's width", () => has(X, BTN), 6000);
  const chip = await X.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(BTN)}).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })()`);
  await X.shot(`${OUT}/gloves-phone-offer.png`);
  await X.evaluate(`${F}.pourAct()`);
  await until("the pour is up at a phone's width", async () => (await gameUp(X)) === "longpour", 6000, 30);
  const fits = await X.evaluate(`(() => { const r = document.querySelector("[data-town-game]").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })()`);
  ok("at a phone's width the button and the board are whole on the screen", chip === true && fits === true, { chip, fits });
  await X.evaluate(`${G}.hold(true)`);
  await until("the water is half way on the phone", async () => ((await X.evaluate(`${G}?.state?.().front ?? 99`)) > 3), 8000, 20);
  await X.shot(`${OUT}/gloves-phone.png`);
  await X.evaluate(`(${G}.hold(false), 0)`);
  await pourGone(X);
  ok("the button let go on the phone: the plants the water had reached are watered", (await wetAt(X, rowAt(10))).slice(0, 3).every(Boolean) && !(await wetAt(X, rowAt(10)))[6], await wetAt(X, rowAt(10)));
  await X.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });

  // ── others' plants only ──
  await warp(X, 150, 14);
  await until("my own plant is offered to the can", async () => (await X.evaluate(`${F}.deed()`)) === "water", 6000);
  const was = await stamina(X);
  ok("in a bed of my own there is no long pour: only the one plant", (await X.evaluate(`${F}.pour().length`)) === 0 && !(await has(X, BTN)));
  await X.evaluate(`${F}.act()`);
  await until("my own plant is watered", async () => (await wetAt(X, ["150,14"]))[0], 6000);
  ok("…and my own plant costs its stamina as ever", (await stamina(X)) === was - 1, { was, now: await stamina(X) });
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
