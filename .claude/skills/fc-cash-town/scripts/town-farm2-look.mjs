// The editor's farm (lib/town/farm2, 2026-11-07), looked at in a real browser on the dev test room: the west gate, the
// garden's beds, a well and a chest, a fire bowl, a scarecrow over the beds, the barns' rows, Uncle Popoto's stall, the
// pen and the duck pond, the benches; desktop and phone, by day (or the hour HOUR says); what of its pictures a page holds;
// and a few rules read back (where one may walk).
//
//   node town-farm2-look.mjs <base> <outdir> [spot ...]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3290", OUT = "."] = process.argv.slice(2);
const only = process.argv.slice(4);
const HOUR = process.env.HOUR ?? 12;
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
/** Where to stand for each look (the game's tiles). */
const SPOTS = {
  gate: [146, 27], beds: [158, 22], behind: [158, 47], well: [176, 27], fire: [178, 32], scarecrow: [158, 55], benches: [207, 48],
  barns: [226, 22], barns2: [248, 33], uncle: [218, 54], pen: [232, 46], pond: [250, 45], south: [240, 92],
};
const SIZES = (process.env.SIZES ?? "desktop,phone").split(",");
for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730, mobile: true }]]) {
  if (!SIZES.includes(label)) continue;
  const X = await browser(`farm2-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=L&townRoom=farm2look&townMap=town2&farmMap=farm2&townHour=${HOUR}&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    for (const [name, [x, y]] of Object.entries(SPOTS)) {
      if (only.length && !only.includes(name)) continue;
      const moved = await X.evaluate(`${V}.warp(${x}, ${y})`);
      if (!moved) { ok(`${label}: stood at ${name} (${x}, ${y})`, false, await X.evaluate(`${V}.walkable(${x}, ${y})`)); continue; }
      await sleep(3200);
      await X.shot(`${OUT}/f2-${label}-${name}${HOUR != 12 ? `-h${HOUR}` : ""}.png`);
    }
    if (label === "desktop" && !only.length) {
      ok("a bed's plot is walked", (await X.evaluate(`${V}.walkable(146, 5)`)) === true);
      ok("a well's stone is not", (await X.evaluate(`${V}.walkable(173, 29)`)) === false);
      ok("the pond's water is not", (await X.evaluate(`${V}.walkable(252, 52)`)) === false);
    }
  } finally { await X.close?.(); }
}
console.log(`farm2 look: ${pass} passed, ${fail} failed`);
