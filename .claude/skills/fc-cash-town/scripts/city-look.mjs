// The city (lib/town/city, 2026-11-23), looked at in a real browser on the dev test room: the park and its fountain,
// the rooms from outside and in, the shopkeepers, the smith, the casino's and the clothes shop's doors, the event hall,
// the museum, the beach and its dock, the canal, the ways out; desktop and phone; what of its pictures a page holds; and
// a few rules read back (where one may walk, the ground's heights, where one may fish). Muted (the owner's rule).
//
//   node city-look.mjs <base> <outdir> [spot ...]        (SIZES=desktop,phone,small; HOUR=12)
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3440", OUT = "."] = process.argv.slice(2);
const only = process.argv.slice(4);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
// (the game's tiles: the map's own less 16 in x)
const SPOTS = {
  park: [50, 66], fountain: [53, 72], board: [40, 73], hallIn: [40, 22], hallOut: [40, 30], mart: [60, 26], uncle: [64, 26],
  smith: [70, 31], kitchenOut: [101, 93], kitchenIn: [98, 80], bank: [4, 110], hospital: [8, 87], casino: [18, 105],
  clothes: [46, 109], eventhall: [9, 76], museum: [108, 30], beach: [98, 117], dock: [98, 123], canal: [15, 20],
  gatesNE: [80, 12], gateNW: [-5, 40], amusement: [96, 55],
  rimSouth: [56, 87], rimEast: [73, 70], stairs: [53, 69], kerb: [30, 66], waterSquares: [70, 47], fountainBench: [57, 70], shopDoor: [48, 109],
};
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730 }, small: { width: 360, height: 640 } };
for (const label of (process.env.SIZES ?? "desktop,phone").split(",")) {
  const X = await browser(`city-${label}`, SIZES[label]);
  try {
    await X.goto(`${BASE}/town?townTest=L&townRoom=citylook&townMap=city&townHour=${process.env.HOUR ?? 12}&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 300000);
    ok(`${label}: the page has an editor's town`, (await X.evaluate(`${V}.town2().on`)) === true);
    for (const [name, [x, y]] of Object.entries(SPOTS)) {
      if (only.length && !only.includes(name)) continue;
      const moved = await X.evaluate(`${V}.warp(${x}, ${y})`);
      if (!moved) { ok(`${label}: stood at ${name} (${x}, ${y})`, false, await X.evaluate(`${V}.walkable(${x}, ${y})`)); continue; }
      await sleep(+(process.env.WAIT ?? 2600));
      await X.shot(`${OUT}/city-${label}-${name}.png`);
    }
    const mem = await X.evaluate(`${V}.town2()`);
    console.log(`  ${label}: pictures held ${mem.pictures} of ${mem.of}, ${(mem.bytes / 1e6).toFixed(1)} MB decoded (just after the tour)`);
    if (label === "desktop" && !only.length) {
      await sleep(17000);
      const still = await X.evaluate(`${V}.town2()`);
      console.log(`  ${label}: standing still: ${still.pictures} pictures, ${(still.bytes / 1e6).toFixed(1)} MB decoded`);
      ok("the canal is not walked", (await X.evaluate(`${V}.walkable(19, 20)`)) === false);
      ok("the park is walked", (await X.evaluate(`${V}.walkable(50, 66)`)) === true);
      ok("the dock's boards are walked", (await X.evaluate(`${V}.walkable(98, 123)`)) === true);
      ok("the city hall's floor is walked", (await X.evaluate(`${V}.walkable(40, 22)`)) === true);
      for (const [n, x, y] of [["park", 50.5, 66.5], ["road", 30.5, 66.5], ["pavement", 32.5, 60.5]]) console.log(`  height at the ${n}:`, await X.evaluate(`${V}.liftAt ? ${V}.liftAt(${x}, ${y}) : null`));
      await X.evaluate(`${V}.warp(98, 123)`); await sleep(800);
      console.log("  fish at the dock:", JSON.stringify(await X.evaluate(`${V}.fishAt()`)));
      await X.evaluate(`${V}.warp(15, 20)`); await sleep(800);
      console.log("  fish at the canal's bank:", JSON.stringify(await X.evaluate(`${V}.fishAt()`)));
    }
  } catch (e) { console.log(`  ${label}: ${e.message}`); fail++; }
  finally { await X.close(); }
}
console.log(`${pass} passed, ${fail} failed`);
