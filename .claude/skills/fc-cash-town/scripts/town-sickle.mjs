// The crescent sickle (the farm's fourth rank, lib/town/gifts), in a real browser on the dev test room: worn, in a bed
// of one's own, a whole ripe row is offered beside picking the one plant; it is a game of its own, one sweep of the
// blade along the row with a swing at each plant; every plant the sweep went along is picked, one cut well gives one
// more, one cut badly or passed gives what the hand would have. And a crop of the second tier or better has a
// narrower cut for somebody far up the farming line, where the simplest crops are as they are.
//
//   node town-sickle.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes sickle-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm", G = "window.__townGame";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const BTN = `[data-farm-gift="charmSickle"]`;
const pumpkins = (X) => X.evaluate(`${T}.purse().bag.reduce((n, s) => n + (s && s.item === "pumpkin" ? s.n : 0), 0)`);
/** A row of ripe plants of mine, that no pest comes to: `crops` along x from `x0`. */
const ripeRow = (X, x0, y, crops) => X.evaluate(`${JSON.stringify(crops)}.forEach((crop, i) => { if (crop) ${T}.setPlot((${x0} + i) + "," + ${y}, { soil: "tilled", plant: { by: ${T}.id, crop, sown: ${T}.now() - 400 * 3600000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 9999 * 3600000, cured: 0, picked: 0, pickedAt: 0 } }); })`);
/** Play the sweep that is up by a plan, a word to each plant in the order they stand: "well" (a swing at its middle), "badly" (a swing early in its plot), "pass" (none). */
const sweepBy = (X, plan) => X.evaluate(`(() => { const plan = ${JSON.stringify(plan)}; const tick = () => { const g = ${G}; if (!g || g.kind !== "sweep") return; const s = g.state(); if (s.ended) return;
  const i = s.over; if (i >= 0 && s.cut[i] === null) { const off = s.at - (s.places[i] + 0.5), half = s.bands[i] / 2;
    if (plan[i] === "well" ? Math.abs(off) <= half * 0.5 : plan[i] === "badly" && off > -0.47 && off < -half - 0.04) g.press(); }
  requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);

const X = await browser("Sickle", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=S&townRoom=check&townHour=10&townWeather=cloudy`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  // a bed of mine (the test window's show garden: the first of its beds is at 148,12), and in it a row of seven ripe pumpkins
  await X.evaluate(`(${T}.resize(14), ${T}.setGifts(false), ${T}.setStamina(100), ${T}.showGarden("S"))`);
  await ripeRow(X, 148, 17, Array(7).fill("pumpkin"));
  await warp(X, 151, 17);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await until("the ripe plant is offered to the hand", async () => (await X.evaluate(`${F}.deed()`)) === "pick", 6000);

  // ── not worn: the one plant ──
  ok("with no sickle worn only the one plant is offered", (await X.evaluate(`${F}.row()`)) === null && (await has(X, `[data-farm-offer="pick"]`)) && !(await has(X, `[data-farm-gift]`)));

  // ── worn: the whole row beside it, a game of its own ──
  await X.evaluate(`${T}.setGifts(["charmSickle"])`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmSickle"])`);
  await until("the row is offered", () => has(X, BTN), 6000);
  const offered = await X.evaluate(`${F}.row()`);
  ok("worn, the whole ripe row is offered beside the one plant, which is still there", wore.ok === true && offered?.deed === "pick" && offered.plots.length === 7 && (await has(X, `[data-farm-offer="pick"]`)), offered);
  await X.shot(`${OUT}/sickle-offer.png`);
  await X.evaluate(`document.querySelector(${JSON.stringify(BTN)}).click()`);
  await until("the sweep is up", async () => (await gameUp(X)) === "sweep", 6000, 30);
  const begun = await X.evaluate(`${G}.state()`);
  ok("it is a game of its own: the row's seven plants each with a cut to swing at, and a blade that has not set off yet", (await has(X, `[data-look="sweep"]`)) && begun.places.join() === "0,1,2,3,4,5,6" && begun.bands.every((b) => Math.abs(b - 0.42) < 1e-9)
    && begun.at < 0 && begun.cut.every((c) => c === null) && (await X.evaluate(`document.querySelectorAll('[data-sweep-plant="stands"]').length`)) === 7, begun);
  await X.shot(`${OUT}/sickle-sweep.png`);
  // well, well, badly, well, passed with no swing, well, well
  const plan = ["well", "well", "badly", "well", "pass", "well", "well"];
  await sweepBy(X, plan);
  await until("the blade is half way", async () => ((await X.evaluate(`${G}?.state?.().at ?? 99`)) > 3.6), 8000, 20);
  const half = await X.evaluate(`({ pace: ${G}.state().pace, well: document.querySelectorAll('[data-sweep-plant="well"]').length, badly: document.querySelectorAll('[data-sweep-plant="badly"]').length })`);
  ok("half way along: the plants behind the blade are cut, well or badly, and it has gathered pace", half.well === 3 && half.badly === 1 && half.pace > begun.pace * 1.3, half);
  await X.shot(`${OUT}/sickle-half.png`);
  await until("the sweep is over", async () => (await gameUp(X)) === null, 8000, 40);
  await until("the row is picked", async () => (await pumpkins(X)) > 0, 6000);
  await sleep(400);
  const got = await pumpkins(X);
  ok("every plant the sweep went along is picked: two each by hand, and one more from each of the five cut well", got === 7 * 2 + 5, { got });
  ok("…for the stamina of seven pickings; the plots are bare ground again", (await X.evaluate(`${T}.purse().stamina.left`)) === 100 - 14 && (await X.evaluate(`[148, 149, 150, 151, 152, 153, 154].every((x) => ${F}.seen(x + ",17").soil === "cleared" && !${F}.seen(x + ",17").crop)`)));
  ok("the page says what was picked and how many were cut clean", await X.evaluate(`/×19/.test(${F}.note() ?? "") && /ตวัดคม 5\\/7/.test(${F}.note() ?? "")`), await X.evaluate(`${F}.note()`));
  await X.shot(`${OUT}/sickle-done.png`);

  // ── good things are harder for the skilled: a narrower cut on a crop of the second tier or better ──
  await ripeRow(X, 148, 18, ["pumpkin", "eggplant", "mango", null, "carrot", "papaya", null]);
  await warp(X, 148, 18);
  await until("the mixed row is offered", async () => (await X.evaluate(`${F}.row()?.plots.length`)) === 5, 6000);
  await X.evaluate(`${F}.rowAct()`);
  await until("the sweep is up again", async () => (await gameUp(X)) === "sweep", 6000, 30);
  const plainBands = await X.evaluate(`${G}.state().bands`);
  ok("for a newcomer to the line every plant's cut is as wide as every other's", plainBands.length === 5 && plainBands.every((b) => Math.abs(b - 0.42) < 1e-9), plainBands);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await until("the sweep is given up", async () => (await gameUp(X)) === null, 4000, 40);
  ok("given up, nothing is picked", (await pumpkins(X)) === got && (await X.evaluate(`${F}.seen("149,18").crop`)) === "eggplant");
  await X.evaluate(`${T}.setLine("farming", 12000)`);
  await sleep(500);
  await X.evaluate(`${F}.rowAct()`);
  await until("the sweep is up for the master", async () => (await gameUp(X)) === "sweep", 6000, 30);
  const hard = await X.evaluate(`({ bands: ${G}.state().bands, places: ${G}.state().places })`);
  ok("at the line's tenth rank the eggplant's, the mango's and the papaya's cuts are narrower (by 1.56), the pumpkin's and the carrot's as they are",
    hard.places.join() === "0,1,2,4,5" && [0, 3].every((i) => Math.abs(hard.bands[i] - 0.42) < 1e-9) && [1, 2, 4].every((i) => Math.abs(hard.bands[i] - 0.42 / 1.56) < 1e-9), hard);
  // (at a phone's width the board is whole on the screen)
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await until("given up again", async () => (await gameUp(X)) === null, 4000, 40);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await until("the row is offered at a phone's width", () => has(X, BTN), 6000);
  await X.evaluate(`${F}.rowAct()`);
  await until("the sweep is up at a phone's width", async () => (await gameUp(X)) === "sweep", 6000, 30);
  const fits = await X.evaluate(`(() => { const r = document.querySelector("[data-town-game]").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })()`);
  ok("at a phone's width the board is whole on the screen", fits === true);
  await sleep(700);
  await X.shot(`${OUT}/sickle-phone.png`);
  await sweepBy(X, ["well", "well", "well", "well", "well"]);
  await until("the phone's sweep is over", async () => (await gameUp(X)) === null, 8000, 40);
  await until("the mixed row is picked", async () => (await X.evaluate(`${F}.seen("149,18").crop`)) !== "eggplant" || (await X.evaluate(`(${K}.farm()["149,18"]?.plant?.picked ?? 0) > 0`)), 6000);
  ok("the mixed row is picked too: what is picked once leaves bare ground, what bears again stays, picked once", (await X.evaluate(`${F}.seen("148,18").crop`)) === null && (await X.evaluate(`${K}.farm()["149,18"].plant.picked`)) === 1);

  // ── its wearer's own beds only ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await ripeRow(X, 132, 7, Array(7).fill("pumpkin"));
  await warp(X, 135, 7);
  await until("a ripe plant in a bed that is nobody's is offered to the hand", async () => (await X.evaluate(`${F}.deed()`)) === "pick", 6000);
  ok("in a bed that is not mine the row is not offered: only the one plant", (await X.evaluate(`${F}.row()`)) === null && !(await has(X, BTN)));
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
