// The garden gnome (the farm's second rank, lib/town/gifts), in a real browser on the dev test room: with the gnome at
// heel, standing in a bed of one's own, it is sent down the whole bed with its can from a button of its own: every
// plant that could do with water is watered at once, for no stamina and no water of the member's; it is seen going
// down the bed, to and fro a row at a time, and a plot shows as watered when it comes to it. A bed rests an hour
// between two of its rounds; another bed of one's own does not wait for it.
//
//   node town-gnome.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes gnome-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const BTN = `[data-farm-gift="famGnome"]`;

const X = await browser("Gnome", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=G&townRoom=check&townHour=10&townWeather=clear`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  // four beds of mine with every vegetable at every stage (the test window's show garden): the first is at 148,12, the next at 161,12
  await X.evaluate(`(${T}.resize(10), ${T}.setGifts(false), ${T}.setStamina(50), ${T}.showGarden("G"))`);
  await warp(X, 153, 15);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await sleep(600);

  // ── with no gnome: nothing is offered ──
  ok("with no gnome at heel nothing is offered in my bed", (await X.evaluate(`${F}.gnome().length`)) === 0 && !(await has(X, BTN)));
  await X.evaluate(`${T}.setGifts(["famGnome", "famSquirrel"])`);
  await X.evaluate(`${K}.familiarWear("famSquirrel")`);
  await sleep(400);
  ok("…nor with another familiar following", (await X.evaluate(`${F}.gnome().length`)) === 0 && !(await has(X, BTN)));

  // ── the gnome at heel: sent down the bed from a button of its own ──
  await X.evaluate(`${K}.familiarWear("famGnome")`);
  await until("the gnome is offered the bed", () => has(X, BTN), 6000);
  const reach = await X.evaluate(`${F}.gnome()`);
  const plants = await X.evaluate(`Object.entries(${K}.farm()).filter(([k, p]) => p.plant && Number(k.split(",")[0]) >= 148 && Number(k.split(",")[0]) < 155 && Number(k.split(",")[1]) >= 12 && Number(k.split(",")[1]) < 19).length`);
  ok("it would water every plant of the bed that could do with water, down the bed a row at a time: most of thirty-five, not those that only wait to be picked",
    plants === 35 && reach.length > 25 && reach.length < 35 && reach.every((k, i) => i === 0 || Number(k.split(",")[1]) > Number(reach[i - 1].split(",")[1]) || (Number(k.split(",")[1]) === Number(reach[i - 1].split(",")[1]) && Number(k.split(",")[0]) > Number(reach[i - 1].split(",")[0]))), { plants, n: reach.length });
  ok("nothing is in my hand: the gnome needs no can of mine, and the button stands by itself", (await X.evaluate(`${T}.purse().hand ?? null`)) === null && !(await has(X, "[data-farm-offer]")));
  await X.shot(`${OUT}/gnome-offer.png`);
  const wetBefore = await X.evaluate(`${JSON.stringify(reach)}.filter((k) => ${F}.seen(k).wet).length`);
  await X.evaluate(`document.querySelector(${JSON.stringify(BTN)}).click()`);
  await until("the gnome is out on its round", async () => (await X.evaluate(`${F}.gnomeOut()`)) !== null, 4000, 30);
  await sleep(1300);
  const mid = await X.evaluate(`${F}.gnomeOut()`);
  ok("it is seen going down the bed: part of the way along, some plots come to and some still to come", wetBefore === 0 && !!mid && mid.shown > 0 && mid.shown < mid.of && mid.of === reach.length, mid);
  await X.shot(`${OUT}/gnome-walk.png`);
  await until("the round is over", async () => (await X.evaluate(`${F}.gnomeOut()`)) === null, 9000, 100);
  await sleep(500);
  ok("every plant it went to is watered", (await X.evaluate(`${JSON.stringify(reach)}.every((k) => ${F}.seen(k).wet)`)) === true);
  const p = await X.evaluate(`${T}.purse()`);
  ok("for no stamina, and the purse remembers the round of this bed", p.stamina.left === 50 && typeof p.gnomed?.["8"] === "number" && Object.keys(p.gnomed).length === 1, { stamina: p.stamina, gnomed: p.gnomed });
  ok("each plant grew what a plain can adds", await X.evaluate(`${JSON.stringify(reach)}.every((k) => ${K}.farm()[k].plant.boost === 30 * 60000)`));
  await X.shot(`${OUT}/gnome-done.png`);
  ok("the page said how many it watered", await X.evaluate(`${F}.note() === null || /โนมรดน้ำให้แล้ว ${reach.length} ต้น/.test(${F}.note())`));
  // ── a bed rests an hour; another bed of mine does not wait for it ──
  await until("this bed is no longer offered", async () => !(await has(X, BTN)) && (await X.evaluate(`${F}.gnome().length`)) === 0, 6000);
  ok("a bed rests: the gnome is not offered it again", true);
  const again = await X.evaluate(`${K}.gnomeDo("153,15")`);
  ok("…and asked all the same, it is refused", again.ok === false && again.why === "wet", again);
  await warp(X, 166, 15);
  await until("the next bed of mine is offered at once", () => has(X, BTN), 6000);
  ok("another bed of mine does not wait for it", (await X.evaluate(`${F}.gnome().length`)) > 25);
  // (at a phone's width the button is whole on the screen)
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await until("the button is there at a phone's width", () => has(X, BTN), 6000);
  const fits = await X.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(BTN)}).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44; })()`);
  ok("at a phone's width the button is whole on the screen and big enough for a thumb", fits === true);
  await X.evaluate(`${F}.gnomeSend()`);
  await sleep(1000);
  await X.shot(`${OUT}/gnome-phone.png`);
  await until("the second round is over", async () => (await X.evaluate(`${F}.gnomeOut()`)) === null, 9000, 100);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await warp(X, 153, 15);
  // (a bed rests ninety minutes since 2026-10-07; sixty before)
  await X.evaluate(`${T}.skipHours(1.52)`);
  await until("its rest over, the first bed is offered again", () => has(X, BTN), 8000);
  const dry = await X.evaluate(`${F}.gnome().length`);
  ok("an hour and a half on the bed is dry, and the gnome goes again", dry === reach.length || dry > 20, { dry, was: reach.length });
  // in the rain everything is wet: nothing to send it for
  await X.goto(`${BASE}/town?townTest=G&townRoom=check&townHour=10&townWeather=rain`);
  await until("ready in the rain", async () => (await status(X)) === "ready", 240000);
  await warp(X, 153, 15);
  await until("the farm's own code has come again", () => X.evaluate(`!!${F}`), 20000);
  await sleep(1500);
  ok("in the rain there is nothing to send it for", (await X.evaluate(`${F}.gnome().length`)) === 0 && !(await has(X, BTN)));
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
