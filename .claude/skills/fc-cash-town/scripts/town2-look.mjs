// The editor's town (lib/town/town2, 2026-10-22), looked at in a real browser on the dev test room: its plaza, the
// shopkeepers, the kitchen hall from outside and in, the pier and a bridge, the gates; desktop and phone; what of its
// pictures a page holds; and a few rules read back (where one may walk and fish).
//
//   node town2-look.mjs <base> <outdir> [spot ...]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3195", OUT = "."] = process.argv.slice(2);
const only = process.argv.slice(4);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
const SPOTS = {
  plaza: [39, 44], uncle: [45, 31], banker: [53, 57], forge: [34, 55], kitchen: [67, 56], hall: [69, 52],
  pier: [13, 64], bridge: [3, 17], gates: [48, 12], shrine: [65, 20], north: [17, 6], bath: [66, 74],
};
for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`town2-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=L&townRoom=town2look&townMap=town2&townHour=${process.env.HOUR ?? 12}&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    ok(`${label}: the page has the editor's town`, (await X.evaluate(`${V}.town2().on`)) === true);
    for (const [name, [x, y]] of Object.entries(SPOTS)) {
      if (only.length && !only.includes(name)) continue;
      const moved = await X.evaluate(`${V}.warp(${x}, ${y})`);
      if (!moved) { ok(`${label}: stood at ${name} (${x}, ${y})`, false, await X.evaluate(`${V}.walkable(${x}, ${y})`)); continue; }
      await sleep(2600);
      await X.shot(`${OUT}/t2-${label}-${name}.png`);
    }
    const mem = await X.evaluate(`${V}.town2()`);
    console.log(`  ${label}: pictures held ${mem.pictures} of ${mem.of}, ${(mem.bytes / 1e6).toFixed(1)} MB decoded (just after the tour)`);
    // standing still a while where the tour ended: what a page holds for one place, the rest let go
    await sleep(17000);
    const still = await X.evaluate(`${V}.town2()`);
    console.log(`  ${label}: standing still: ${still.pictures} pictures, ${(still.bytes / 1e6).toFixed(1)} MB decoded`);
    if (label === "desktop") {
      ok("a tile of the river is not walked", (await X.evaluate(`${V}.walkable(2, 30)`)) === false);
      ok("the plaza is walked", (await X.evaluate(`${V}.walkable(36, 44)`)) === true);
      ok("a bridge's boards are walked", (await X.evaluate(`${V}.walkable(2, 17)`)) === true);
      ok("the hall's floor is walked", (await X.evaluate(`${V}.walkable(69, 49)`)) === true);
      ok("the hall is not walked into through its wall", (await X.evaluate(`(${V}.warp(70, 55), ${V}.walk(70.5, 52.5), 1)`)) === 1);
      await X.evaluate(`${V}.warp(13, 64)`); await sleep(800);
      console.log("  fish at the pier:", JSON.stringify(await X.evaluate(`${V}.fishAt()`)));
      await X.evaluate(`${V}.warp(5, 25)`); await sleep(800);
      console.log("  fish at the west bank:", JSON.stringify(await X.evaluate(`${V}.fishAt()`)));
    }
  } catch (e) { console.log(`  ${label}: ${e.message}`); fail++; }
  finally { await X.close(); }
}
console.log(`${pass} passed, ${fail} failed`);
