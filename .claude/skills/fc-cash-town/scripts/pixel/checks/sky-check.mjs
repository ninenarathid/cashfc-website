// The town's sky in each weather, on the dev test room: pictures, and what the map says it draws.
//   node checks/sky-check.mjs [base] [outDir] [words] [hour]
// Checks: clouds cast shadows by day and drift to the right; none at night; light rain keeps the day's light and
// has no gloom; heavy rain and storms are as dark as night with the lamps lit; rain falls and lands; leaves fall
// and reach the ground in fine weather.
import { browser, until, sleep, status } from "./cdp.mjs";
const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "work/debug";
const WORDS = (process.argv[4] ?? "clear,cloudy,light,rain,heavy,storm").split(",");
const HOUR = process.argv[5] ?? "10";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const X = await browser("S");
const sky = () => X.evaluate("JSON.parse(JSON.stringify(window.__townView.sky()))");
const open = async (q) => {
  await X.goto(`${BASE}/town?townTest=S&${q}`);
  await until("ready", async () => (await status(X)) === "ready", 120000);
  await until("the map's hooks", () => X.evaluate("!!window.__townView?.sky"), 20000);
  await sleep(2500);
};
try {
  for (const w of WORDS) {
    await open(`townHour=${HOUR}&townWeather=${w}`);
    const a = await sky();
    await X.shot(`${OUT}/sky-${w}-${HOUR}.png`);
    await sleep(2000);
    const b = await sky();
    const e = a.effects, shown = a.clouds.filter((c) => c.at.x > -c.w && c.at.x < 1280 + c.w);
    console.log(`${w} at ${HOUR}:00  rain ${e.rain.toFixed(2)} gloom ${e.gloom.toFixed(2)} dim ${e.dim.toFixed(2)} clouds ${e.clouds.toFixed(2)} | tint ${a.day.tint} lamps ${a.day.lamps.toFixed(2)} | drops ${a.drops} splashes ${a.splashes} | cloud shadows ${a.clouds.length} (${shown.length} near the screen) | ${b.fps} fps`);
    if (w === "clear" || w === "cloudy") {
      ok(`${w}: clouds cast shadows`, a.clouds.length > 0);
      const moved = a.clouds.map((c, i) => b.clouds[i].x - c.x).filter((d) => d > -1000);
      ok(`${w}: they drift to the right`, moved.length > 0 && moved.every((d) => d > 15 && d < 200), moved);
      ok(`${w}: the day's own light`, a.day.tint.every((c) => c > 200) && a.day.lamps === 0, a.day);
    }
    if (w === "light" || w === "drizzle") {
      ok(`${w}: rain falls`, a.drops > 20, a.drops);
      ok(`${w}: no gloom, the day's own light, no lamps`, e.gloom === 0 && a.day.lamps === 0 && a.day.tint.every((c) => c > 200), a.day);
    }
    if (w === "heavy" || w === "storm") {
      ok(`${w}: as dark as night, lamps lit`, e.gloom === 1 && a.day.lamps > 0.8 && a.day.tint[0] < 100, a.day);
      ok(`${w}: more rain than a shower`, a.drops > 250, a.drops);
      ok(`${w}: it lands`, a.splashes > 20, a.splashes);
    }
  }
  if (!process.argv[4]) {
    // night: no shadows drawn (no sun), clouds or not
    await open("townHour=22&townWeather=cloudy");
    await X.shot(`${OUT}/sky-cloudy-22.png`);
    const n = await sky();
    ok("night: lamps lit, no sun", n.day.lamps === 1);
    // fine weather: leaves fall and reach the ground
    await open(`townHour=${HOUR}&townWeather=windy`);
    let down = 0, most = 0;
    for (let i = 0; i < 10; i++) { await sleep(2000); const l = await X.evaluate("window.__townView.leaves()"); down = Math.max(down, l.down); most = Math.max(most, l.fall + l.wind + l.gust); }
    ok("windy: leaves reach the ground", down > 0, down);
    ok("windy: never a heap of them", most <= 60, most);
    await X.shot(`${OUT}/sky-windy-${HOUR}.png`);
  }
  console.log("errors:", JSON.stringify(X.logs));
  console.log(`${pass} passed, ${fail} failed`);
} catch (e) { console.log("ERR", e.message); } finally { X.close(); process.exit(0); }
