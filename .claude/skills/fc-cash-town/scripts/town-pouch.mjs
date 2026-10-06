// The spellbound seed pouch (the farm's third rank, lib/town/gifts), in a real browser on the dev test room: with a
// seed in the hand on tilled soil, the whole row is offered beside sowing the one plot; it sows every plot of the row
// that is ready, seven for five seeds, at once (sowing is no game); with fewer seeds, as many plots as they reach;
// tired hands steady themselves for it once, as for a plot.
//
//   node town-pouch.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes pouch-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const BTN = `[data-farm-gift="thingPouch"]`;
const seeds = (X) => X.evaluate(`${T}.purse().bag.reduce((n, s) => n + (s && s.item === "seedPumpkin" ? s.n : 0), 0)`);
const stamina = (X) => X.evaluate(`${T}.purse().stamina.left`);
const sownIn = (X, y) => X.evaluate(`[132, 133, 134, 135, 136, 137, 138].filter((x) => ${K}.farm()[x + "," + ${y}]?.plant?.crop === "pumpkin").length`);
const till = (X, y, xs = [132, 133, 134, 135, 136, 137, 138]) => X.evaluate(`${JSON.stringify(xs)}.forEach((x) => ${T}.setPlot(x + "," + ${y}, { soil: "tilled", plant: null }))`);
const holdSeed = async (X) => { await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "seedPumpkin"))`); await sleep(400); };
const more = (X) => X.evaluate(`document.querySelector(${JSON.stringify(BTN)} + " [data-farm-gift-more]")?.textContent ?? null`);

const X = await browser("Pouch", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=P&townRoom=check&townHour=10&townWeather=cloudy`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await X.evaluate(`(${T}.resize(10), ${T}.setGifts(false), ${T}.setStamina(100), ${T}.grant("seedPumpkin", 9))`);
  // four rows of the first bed, tilled and ready (its plots are x 132 to 138)
  for (const y of [7, 8, 9, 10]) await till(X, y);
  await warp(X, 135, 7);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await holdSeed(X);
  await until("a seed in the hand is offered the soil", async () => (await X.evaluate(`${F}.deed()`)) === "sow", 6000);

  // ── without the pouch: one seed, one plot ──
  ok("without the pouch only the plot stood on is offered", (await X.evaluate(`${F}.row()`)) === null && (await has(X, `[data-farm-offer="sow"]`)) && !(await has(X, `[data-farm-gift]`)));

  // ── with it: the whole row beside the one plot ──
  await X.evaluate(`${T}.setGifts(["thingPouch"])`);
  await until("the row is offered", () => has(X, BTN), 6000);
  const offered = await X.evaluate(`${F}.row()`);
  ok("with the pouch the whole row is offered beside the one plot, which is still there: seven plots, the one stood on first",
    offered?.deed === "sow" && offered.plots.join(" ") === [135, 134, 136, 133, 137, 132, 138].map((x) => `${x},7`).join(" ") && (await has(X, `[data-farm-offer="sow"]`)), offered);
  ok("the button says what it would do now: seven plots, five seeds", /7 ช่อง · 5 เมล็ด/.test((await more(X)) ?? ""), await more(X));
  await X.shot(`${OUT}/pouch-offer.png`);
  await X.evaluate(`document.querySelector(${JSON.stringify(BTN)}).click()`);
  await until("the row is sown", async () => (await sownIn(X, 7)) === 7, 6000);
  await sleep(300);
  ok("it is no game: the seven plots are sown at once", (await gameUp(X)) === null && (await sownIn(X, 7)) === 7);
  ok("…for five seeds and the stamina of seven sowings", (await seeds(X)) === 4 && (await stamina(X)) === 93, { seeds: await seeds(X), stamina: await stamina(X) });
  ok("…the bed is mine, as with any first seed", (await X.evaluate(`${F}.owners().some((o) => o.bed === 0 && o.by === ${T}.id)`)) === true);
  ok("the page says how many were sown and for how many seeds", await X.evaluate(`/หว่านทั้งแถว 7 ช่อง ใช้ 5 เมล็ด/.test(${F}.note() ?? "")`), await X.evaluate(`${F}.note()`));
  await X.shot(`${OUT}/pouch-sown.png`);

  // ── fewer seeds: as many plots as they reach ──
  await warp(X, 132, 8);
  await until("the next row is offered", async () => (await X.evaluate(`${F}.row()?.plots.length`)) === 5, 6000);
  ok("with four seeds left, five plots are offered, the nearest first", (await X.evaluate(`${F}.row().plots.join(" ")`)) === [132, 133, 134, 135, 136].map((x) => `${x},8`).join(" ") && /5 ช่อง · 4 เมล็ด/.test((await more(X)) ?? ""), await more(X));
  await X.evaluate(`${F}.rowAct()`);
  await until("five are sown", async () => (await sownIn(X, 8)) === 5, 6000);
  await sleep(300);
  ok("…and sown, with no seed left", (await seeds(X)) === 0 && (await X.evaluate(`${F}.deed()`)) === null);

  // ── the plain deed is as it was ──
  await X.evaluate(`${T}.grant("seedPumpkin", 6)`);
  await holdSeed(X);
  await warp(X, 137, 8);
  await until("the two plots left of the row are offered", async () => (await X.evaluate(`${F}.row()?.plots.length`)) === 2, 6000);
  await X.evaluate(`${F}.act()`);
  await until("one more is sown", async () => (await sownIn(X, 8)) === 6, 6000);
  ok("the plain deed sows the one plot for one seed, as ever; one plot alone is then no row", (await seeds(X)) === 5 && (await X.evaluate(`${K}.farm()["137,8"].plant.crop`)) === "pumpkin");
  await warp(X, 138, 8);
  await until("the last is offered by itself", async () => (await X.evaluate(`${F}.deed()`)) === "sow", 6000);
  ok("…nothing is offered beside it there", (await X.evaluate(`${F}.row()`)) === null && !(await has(X, BTN)));

  // ── tired hands steady themselves once for the whole row ──
  await X.evaluate(`${T}.setStamina(0)`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await warp(X, 135, 9);
  await until("the third row is offered", () => has(X, BTN), 6000);
  const fits = await X.evaluate(`[...document.querySelectorAll("[data-farm-offer], [data-farm-gift]")].map((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44; })`);
  ok("at a phone's width both buttons are whole on the screen, each big enough for a thumb", fits.length === 2 && fits.every(Boolean), fits);
  await X.shot(`${OUT}/pouch-phone.png`);
  await X.evaluate(`${F}.rowAct()`);
  const game = await until("with no stamina a game comes up first", () => gameUp(X), 6000, 50);
  ok("with no stamina tired hands steady themselves first, as for one plot", game === "steady" && (await sownIn(X, 9)) === 0, game);
  await play(X);
  await until("the row is sown after the game", async () => (await sownIn(X, 9)) === 7, 30000);
  ok("…once, and the whole row is sown: seven plots for five seeds", (await seeds(X)) === 0 && (await sownIn(X, 9)) === 7, { seeds: await seeds(X) });
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
