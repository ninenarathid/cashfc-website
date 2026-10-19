// The farm's second gate and the town's southern strip (2026-10-19), looked at in a real browser on the dev test room:
// the gate at the head of the farm's southern lane, walked through into the town; where it puts you, at the foot of
// the lane through the strip; the strip and its river; the lane up past the feast hall; walked back through to the
// farm; the gates by night. Screenshots at desktop and phone size; PASS/FAIL lines for what can be read.
//
//   node town-second-gate.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3188", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView", T = "window.__townTrade";
async function enter(X, hour) {
  await X.goto(`${BASE}/town?townTest=M&townRoom=gate2&townHour=${hour}&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
const self = (X) => X.evaluate(`${V}.self()`);
/** Walk to a point and wait till standing still again (or gone through a gate). */
async function walk(X, x, y) {
  await X.evaluate(`${V}.walk(${x}, ${y})`);
  await sleep(400);
  await until("stood still", async () => !(await self(X))?.moving, 30000);
  await sleep(1200);
}

for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`gate2-${label}`, size);
  try {
    await enter(X, 12);
    await X.evaluate(`(${T}.reset(), ${T}.forget())`);
    // the farm's side: the gate in the west fence's gap, at the head of the southern half's lane
    ok(`${label}: stood on the farm's southern lane`, await X.evaluate(`${V}.warp(132, 63)`));
    await sleep(2500);
    await X.shot(`${OUT}/gate2-${label}-farm.png`);
    const farmGates = await X.evaluate(`${V}.gates()`);
    ok(`${label}: its gateway is drawn and tappable`, farmGates.some((g) => g.to[0] === 128 && g.to[1] === 63), farmGates.map((g) => g.to));
    // through it, into the town: at the foot of the lane, 42 rows below where the first gate puts you
    await walk(X, 128.5, 63.5);
    const inTown = await self(X);
    ok(`${label}: through the farm's second gate into the town at (60.5, 73.5)`, inTown && Math.abs(inTown.x - 60.5) < 0.6 && Math.abs(inTown.y - 73.5) < 0.6, inTown);
    await sleep(1500);
    await X.shot(`${OUT}/gate2-${label}-town.png`);
    // the strip: its river and its woods; its bank is no place to fish from
    await X.evaluate(`${V}.warp(54, 70)`);
    await sleep(2500);
    await X.shot(`${OUT}/gate2-${label}-strip.png`);
    ok(`${label}: the strip's bank is no place to fish`, (await X.evaluate(`(${V}.warp(51, 72), ${V}.fishAt())`)) == null);
    // the lane up past the feast hall, to the east path
    await X.evaluate(`${V}.warp(58, 50)`);
    await sleep(2500);
    await X.shot(`${OUT}/gate2-${label}-lane.png`);
    await walk(X, 57.5, 34.5);
    const top = await self(X);
    ok(`${label}: walked up the lane to the east path`, top && Math.abs(top.x - 57.5) < 1 && Math.abs(top.y - 34.5) < 1, top);
    // and back down it, and through the town's second gate to the farm
    await walk(X, 63.5, 72.5);
    const onFarm = await self(X);
    ok(`${label}: through the town's second gate onto the farm at (130.5, 63.5)`, onFarm && Math.abs(onFarm.x - 130.5) < 0.6 && Math.abs(onFarm.y - 63.5) < 0.6, onFarm);
    // the first gates as they were
    await X.evaluate(`${V}.warp(60, 31)`);
    await sleep(1500);
    await walk(X, 63.5, 30.5);
    const first = await self(X);
    ok(`${label}: the first gate still leads to the farm's first lane (130.5, 21.5)`, first && Math.abs(first.x - 130.5) < 0.6 && Math.abs(first.y - 21.5) < 0.6, first);
    if (label === "desktop") {
      // the whole of the lane from above, and the two gates by night
      await X.evaluate(`(${V}.warp(58, 56), ${V}.zoom(0.55))`);
      await sleep(3000);
      await X.shot(`${OUT}/gate2-${label}-overview.png`);
      await enter(X, 21);
      await X.evaluate(`(${V}.warp(60, 72), ${V}.zoom(1))`);
      await sleep(3000);
      await X.shot(`${OUT}/gate2-${label}-town-night.png`);
      await X.evaluate(`${V}.warp(131, 63)`);
      await sleep(3000);
      await X.shot(`${OUT}/gate2-${label}-farm-night.png`);
    }
  } catch (e) {
    ok(`${label}: ran through`, false, String(e?.message ?? e).slice(0, 300));
  } finally { await X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
