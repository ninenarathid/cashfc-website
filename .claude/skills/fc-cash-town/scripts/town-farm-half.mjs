// The farm's southern half (2026-10-19), looked at in a real browser on the dev test room: where the lane runs on
// south through the old rim, the new beds' quarters, where its lanes cross, its south end, the same by night; what a
// member holding two beds is told on sowing a third (in the new half); and the edges of the farm and the forest, where
// one map might be seen from the other. Screenshots at desktop and phone size; PASS/FAIL lines for what can be read.
//
//   node town-farm-half.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3184", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const T = "window.__townTrade", F = "window.__townFarm";
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(1600); };
async function enter(X, hour) {
  await X.goto(`${BASE}/town?townTest=M&townRoom=half&townHour=${hour}&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
/** Let the ground's chunks be painted where the camera is (a few slices a frame). */
const settle = async (X) => { await sleep(2500); };

const SPOTS = [["rim", 157, 41], ["quarter", 146, 52], ["crossing", 158, 64], ["south", 158, 82], ["corner", 131, 80]];
for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`half-${label}`, size);
  try {
    await enter(X, 12);
    await X.evaluate(`(${T}.reset(), ${T}.forget())`);
    await warp(X, 157, 30);
    await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 30000);
    for (const [name, x, y] of label === "desktop" ? SPOTS : SPOTS.slice(0, 3)) {
      ok(`${label}: ${name} (${x},${y}) is on the farm and walkable`, await X.evaluate(`window.__townView.warp(${x}, ${y})`));
      await settle(X);
      await X.shot(`${OUT}/half-${label}-${name}.png`);
    }
    // a member who holds two beds, sowing in a third of the new half
    await X.evaluate(`(() => {
      const t = ${T}, now = t.now();
      localStorage.setItem("cashtown.trial.beds.1", JSON.stringify({ 0: { by: t.id, name: "M", tended: now, empty: now }, 1: { by: t.id, name: "M", tended: now, empty: now } }));
      localStorage.setItem("cashtown.trial.farm.2", JSON.stringify({ "135,57": { soil: "tilled", plant: null }, "136,57": { soil: "tilled", plant: null } }));
      t.grant("seedKangkong", 3);
    })()`);
    await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === "seedKangkong"))`);
    await X.evaluate(`window.__townView.warp(135, 57)`);
    await sleep(1500);
    const offered = await X.evaluate(`${F}.deed()`);
    ok(`${label}: the seed is offered on a tilled plot of bed 30`, offered === "sow", offered);
    await X.evaluate(`${F}.act()`);
    await sleep(1200);
    const said = await X.evaluate(`[...document.querySelectorAll("p, div, span")].map((e) => e.innerText).find((t) => /คนละไม่เกิน 2 แปลง|at most 2 each/.test(t ?? "")) ?? null`);
    ok(`${label}: refused, and told the rule of two beds`, !!said, said);
    const owners = await X.evaluate(`[...${T}.owners()].map(([n, o]) => n)`);
    ok(`${label}: bed 30 stays nobody's`, !owners.includes(30), owners);
    await X.shot(`${OUT}/half-${label}-refused.png`);
    // holding one, the bed is theirs
    await X.evaluate(`(() => { const b = JSON.parse(localStorage.getItem("cashtown.trial.beds.1")); delete b[1]; localStorage.setItem("cashtown.trial.beds.1", JSON.stringify(b)); })()`);
    await X.evaluate(`window.__townView.warp(136, 57)`);
    await sleep(1200);
    await X.evaluate(`${F}.act()`);
    await sleep(1500);
    const after = await X.evaluate(`[...${T}.owners()].map(([n, o]) => n)`);
    ok(`${label}: holding one, they sow in bed 30 and it is theirs`, after.includes(30), after);
    await X.shot(`${OUT}/half-${label}-sown.png`);
  } finally { X.close(); }
}
// by night, and the edges where one map might be seen from the other (desktop, and a large screen)
for (const [label, size] of [["night", { width: 1280, height: 860 }], ["large", { width: 1920, height: 1080 }]]) {
  const X = await browser(`half-${label}`, size);
  try {
    await enter(X, label === "night" ? 21 : 12);
    await warp(X, 157, 30);
    for (const [name, x, y] of label === "night" ? [["crossing", 158, 64], ["rim", 157, 41]] : [["farm-sw", 131, 80], ["farm-s", 150, 82], ["forest-top", 160, 114], ["forest-ne", 190, 114]]) {
      await X.evaluate(`window.__townView.warp(${x}, ${y})`);
      await settle(X);
      await X.shot(`${OUT}/half-${label}-${name}.png`);
    }
    if (label === "night") {
      // a flame taken at the second brazier, by its own well (what the board and the card offer there)
      const L = "window.__townLamps";
      await until("the lamps' own code has come", () => X.evaluate(`!!${L}`), 20000);
      await X.evaluate(`${L}.toNight()`);
      await X.evaluate(`${L}.anew()`);
      await X.evaluate(`window.__townView.warp(156, 67)`);
      await sleep(1500);
      ok("night: by the second brazier, a flame is offered", await X.evaluate(`${L}.atFire()`));
      await X.evaluate(`${L}.take()`);
      await sleep(900);
      ok("night: a flame taken there", (await X.evaluate(`${L}.left()`)) > 0, await X.evaluate(`${L}.note()`));
      await X.shot(`${OUT}/half-night-flame.png`);
      // and every post of the farm lit: the southern half's night lifted, the braziers and both wells aglow
      await X.evaluate(`${L}.lit("farm", 52)`);
      await sleep(2500);
      ok("night: all fifty-two lit is the night's whole", (await X.evaluate(`${L}.tier()`)) === 3, await X.evaluate(`${L}.tier()`));
      for (const [name, x, y] of [["lit-crossing", 158, 64], ["lit-quarter", 146, 52]]) {
        await X.evaluate(`window.__townView.warp(${x}, ${y})`);
        await settle(X);
        await X.shot(`${OUT}/half-night-${name}.png`);
      }
    }
  } finally { X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
