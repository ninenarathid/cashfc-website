// The farm's two wells, each its own water (2026-10-19), in a real browser on the dev test room: each well's sign says
// its own water and its own nature; a can filled at the second well takes the second's water and leaves the first's,
// and one filled at the first takes the first's. Screenshots at desktop and phone size; PASS/FAIL lines.
//
//   node town-wells.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3185", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const T = "window.__townTrade", F = "window.__townFarm";
const NORTH = [156, 23], SOUTH = [156, 65];
for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`wells-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=M&townRoom=wells&townHour=12&townWeather=cloudy`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.grant("can", 1))`);
    await X.evaluate(`window.__townView.warp(${SOUTH[0] + 1}, ${SOUTH[1]})`);
    await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 30000);
    await X.evaluate(`(${T}.setWell(60, 0), ${T}.setWell(20, 1), ${T}.setWellWater("dawn", 30, 1))`);
    await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === "can"))`);
    await sleep(1500);
    ok(`${label}: the two wells, 60 and 20`, JSON.stringify(await X.evaluate(`${F}.wells()`)) === "[60,20]", await X.evaluate(`${F}.wells()`));
    await until("a can is offered the second well", async () => (await X.evaluate(`${F}.chore()`)) === "fill", 8000);
    await X.shot(`${OUT}/wells-${label}-south.png`);
    await X.evaluate(`${F}.act()`);
    await sleep(1200);
    ok(`${label}: a can filled at the second well takes its water, the first's as it was`, JSON.stringify(await X.evaluate(`${F}.wells()`)) === "[60,18]", await X.evaluate(`${F}.wells()`));
    await X.shot(`${OUT}/wells-${label}-south-filled.png`);
    // the first well: empty the can by holding a fresh one
    await X.evaluate(`(${T}.grant("can", 1))`);
    await X.evaluate(`${T}.hold(${T}.purse().bag.findLastIndex((s) => s?.item === "can" && !s.water))`);
    await X.evaluate(`window.__townView.warp(${NORTH[0] + 1}, ${NORTH[1]})`);
    await sleep(1500);
    await until("a can is offered the first well", async () => (await X.evaluate(`${F}.chore()`)) === "fill", 8000);
    await X.evaluate(`${F}.act()`);
    await sleep(1200);
    ok(`${label}: and one filled at the first takes the first's`, JSON.stringify(await X.evaluate(`${F}.wells()`)) === "[58,18]", await X.evaluate(`${F}.wells()`));
    await X.shot(`${OUT}/wells-${label}-north.png`);
  } finally { X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
