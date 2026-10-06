// The enchanted hoe's power (the farm's first rank, lib/town/gifts), in a real browser on the dev test room: with no
// charm a hoe clears the plot stood on, by its own game; worn as a charm, the whole row of the bed is one game, a beat
// to a plot, and each plot whose beat was hit is cleared while one whose beat was missed is left weeds. The stamina of
// each plot done is paid, and no more.
//
//   node town-hoe.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes hoe-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm", G = "window.__townTiming";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const soil = (X, x, y) => X.evaluate(`${F}.seen("${x},${y}").soil`);
/** Swing at the row's next beat: over the stretch (a hit) or off it (a miss), found by watching the marker. */
async function swing(X, hit) {
  await until(hit ? "the marker is over the stretch" : "the marker is off the stretch", () => X.evaluate(`(() => { const r = ${G}?.round(); if (!r) return false;
    const inside = r.at >= r.lo + r.width * 0.25 && r.at <= r.lo + r.width * 0.75, clear = r.at < r.lo - 0.08 || r.at > r.lo + r.width + 0.08;
    if (${hit} ? inside : clear) { ${G}.press(); return true; } return false; })()`), 8000, 4);
  await sleep(90);
}

const X = await browser("Hoe", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=H&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(`${BASE}/town?townTest=H&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1))`);
  // a bed's row of weeds: the first bed's third row (its corner is the farm's 4,4)
  const row = Array.from({ length: 7 }, (_, i) => [133 + i, 7]);
  await warp(X, row[3][0], row[3][1]);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "hoe"))`);
  await sleep(500);
  await until("the hoe is offered the weeds", async () => (await X.evaluate(`${F}.deed()`)) === "clear", 6000);
  ok("the row is seven plots of weeds", (await Promise.all(row.map(([x, y]) => soil(X, x, y)))).every((s) => s === "wild"));

  // ── with no charm: the plot stood on, by the weeding's own game ──
  await X.evaluate(`${F}.act()`);
  await sleep(900);
  ok("with no charm the hoe's work is the plot's own game, and no row's", (await gameUp(X)) && (await X.evaluate(`!document.querySelector("[data-row-marks]")`)));
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await sleep(500);

  // ── worn: the whole row at a swing ──
  await X.evaluate(`${T}.setGifts(true)`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmHoe"])`);
  ok("the enchanted hoe is worn as a charm", wore.ok === true, wore);
  await X.evaluate(`${T}.setStamina(100)`);
  await sleep(400);
  const before = await X.evaluate(`${T}.purse().stamina.left`);
  await X.evaluate(`${F}.act()`);
  await until("the row's game is up", () => X.evaluate(`!!document.querySelector("[data-row-marks]") && !!${G}`), 6000);
  const beats = await X.evaluate(`${G}.round().need`);
  ok("worn, the game is the row's: a beat to each of its seven plots", beats === 7 && (await X.evaluate(`document.querySelector("[data-row-marks]").dataset.rowMarks`)) === "", { beats });
  await X.shot(`${OUT}/hoe-row.png`);
  // hit, hit, miss, hit, miss, hit, hit
  const went = [true, true, false, true, false, true, true];
  for (const hit of went) await swing(X, hit);
  await until("the game is over", async () => !(await X.evaluate(`!!document.querySelector("[data-row-marks]")`)), 6000);
  await until("the plots are worked", async () => (await Promise.all(row.map(([x, y]) => soil(X, x, y)))).filter((s) => s === "cleared").length === 5, 12000).catch(() => {});
  // (the beats go from the plot stood on outwards: the fourth of the row, then its neighbours either side)
  const order = [3, 2, 4, 1, 5, 0, 6].map((i) => row[i]);
  const soils = await Promise.all(order.map(([x, y]) => soil(X, x, y)));
  ok("each plot whose beat was hit is cleared, and each whose beat was missed is weeds still: the plot stood on first, then outwards",
    soils.map((s) => (s === "cleared" ? 1 : 0)).join("") === went.map((h) => (h ? 1 : 0)).join("") && soils.every((s) => s === "cleared" || s === "wild"), { soils, went });
  const after = await X.evaluate(`${T}.purse().stamina.left`);
  ok("the stamina of the five plots done is paid, and no more", before - after === 5 * 2, { before, after });
  ok("the page says how many of the row were done", await X.evaluate(`[...document.querySelectorAll("p")].some((p) => /ทั้งแถว: เสร็จ 5 จาก 7 ช่อง/.test(p.innerText))`));
  await X.shot(`${OUT}/hoe-done.png`);
  // the two left: a row of two is still a row; one plot alone is the plot's own game
  await warp(X, row[2][0], row[2][1]);
  await until("the hoe is offered the weeds left", async () => (await X.evaluate(`${F}.deed()`)) === "clear", 6000);
  await X.evaluate(`${F}.act()`);
  await until("the row's game is up again", () => X.evaluate(`!!document.querySelector("[data-row-marks]") && !!${G}`), 6000);
  ok("what is left of the row is a row of its own: two beats for two plots", (await X.evaluate(`${G}.round().need`)) === 2);
  await swing(X, true);
  await swing(X, false);
  await until("the game is over", async () => !(await X.evaluate(`!!document.querySelector("[data-row-marks]")`)), 6000);
  await until("one more is cleared", async () => (await soil(X, row[2][0], row[2][1])) === "cleared", 8000);
  await warp(X, row[4][0], row[4][1]);
  await until("the hoe is offered the last", async () => (await X.evaluate(`${F}.deed()`)) === "clear", 6000);
  await X.evaluate(`${F}.act()`);
  await sleep(900);
  ok("one plot alone is no row: its own game, as ever", (await gameUp(X)) && (await X.evaluate(`!document.querySelector("[data-row-marks]")`)));
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
