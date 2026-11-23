// The city (lib/town/city), in a real browser: sitting on a bench of the sunken park (the sitter on the seat, not sunk a
// second time), and the chests: each of the three, tapped, walked to and opened (the one box). Muted (the owner's rule).
//
//   node city-sit.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3440", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
const press = async (X, x, y) => {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const warp = async (X, x, y, ms = 2600) => { await X.evaluate(`(${V}.warp(${x}, ${y}), ${V}.lookAt(${x + 0.5}, ${y + 0.5}))`); await sleep(ms); };
const X = await browser("city-sit", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=M&townRoom=citysit&townMap=city&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  // a bench in the park, by the fountain
  await warp(X, 50, 72);
  const benches = await X.evaluate(`${V}.benches()`);
  const b = benches.sort((p, q) => Math.hypot((p.x0 + p.x1) / 2 - 640, (p.y0 + p.y1) / 2 - 430) - Math.hypot((q.x0 + q.x1) / 2 - 640, (q.y0 + q.y1) / 2 - 430))[0];
  ok("a bench of the park is on the screen", !!b, benches.length);
  if (b) {
    await press(X, Math.round((b.x0 + b.x1) / 2), Math.round((b.y0 + b.y1) / 2));
    await sleep(5000);
    await X.shot(`${OUT}/city-sit-park.png`);
    const me = await X.evaluate(`${V}.self()`);
    ok("sat down (the stand-up button is shown)", await X.evaluate(`[...document.querySelectorAll("button")].some((e) => /ลุกขึ้น|Stand up/.test(e.innerText))`), me);
  }
  // the chests
  for (const [name, x, y] of [["park", 38, 62], ["cityhall", 35, 24], ["kitchen", 96, 79]]) {
    await warp(X, x, y);
    const sb = await X.evaluate(`${V}.storebox()`);
    ok(`${name}: a chest to tap`, !!sb, sb);
    if (!sb) continue;
    await press(X, Math.round(sb.x), Math.round(sb.y));
    await sleep(3500);
    await X.shot(`${OUT}/city-chest-${name}.png`);
    const after = await X.evaluate(`${V}.storebox()`);
    ok(`${name}: the box opened`, !!after?.open, after);
    await X.evaluate(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))`);
    await sleep(600);
  }
} catch (e) { console.log(`  ${e.message}`); fail++; }
finally { await X.close(); }
console.log(`${pass} passed, ${fail} failed`);
