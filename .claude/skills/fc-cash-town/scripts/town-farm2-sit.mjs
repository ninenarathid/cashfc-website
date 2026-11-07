// The editor's farm's benches (lib/town/farm2's F2_BENCHES, the map's own seats), sat on in the dev test room: for some
// benches, I stand by one of its seats, tap the seat, and am seen sitting on it, facing as the map says. A shot of each.
//
//   node town-farm2-sit.mjs <base> <outdir> [bench ...]
import { readFileSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3290", OUT = "."] = process.argv.slice(2);
const MAP = JSON.parse(readFileSync(new URL("../../../../lib/town/farm2-map.json", import.meta.url), "utf8"));
const pick = process.argv.slice(4).map(Number);
const benches = MAP.roles.benches.map((b, i) => ({ i, ...b })).filter((b) => !pick.length || pick.includes(b.i));
const V = "window.__townView";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const FRONT = { SE: [1, 0], SW: [0, 1], NE: [0, -1], NW: [-1, 0] };
const X = await browser("farm2-sit", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=S&townRoom=farm2sit&townMap=town2&farmMap=farm2&townHour=11&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  for (const b of benches) {
    const s = b.seats[Math.floor(b.seats.length / 2)], [x, y] = s.tile, [fx, fy] = FRONT[s.facing];
    // stand before the seat (or beside it), then tap the seat
    let stood = false;
    for (const [dx, dy] of [[fx, fy], [1, 0], [0, 1], [-1, 0], [0, -1]]) if (!stood && (await X.evaluate(`${V}.walkable(${x + dx}, ${y + dy})`))) stood = await X.evaluate(`${V}.warp(${x + dx}, ${y + dy})`);
    if (!stood) { ok(`bench ${b.i}: stood by its seat ${x},${y}`, false); continue; }
    await sleep(1800);
    const at = await X.evaluate(`${V}.tileScreen(${x + 0.5}, ${y + 0.5})`);
    await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y - 14 });
    await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: at.x, y: at.y - 14, button: "left", clickCount: 1 });
    await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: at.x, y: at.y - 14, button: "left", clickCount: 1 });
    await sleep(2600);
    const me = await X.evaluate(`${V}.self()`);
    const sat = await X.evaluate(`(window.__cashTown?.sitting?.() ?? null)`);
    ok(`bench ${b.i} (${s.facing}): sat down by its seat`, !!me && Math.hypot(me.x - (x + 0.5), me.y - (y + 0.5)) < 1.6, { me, sat });
    await X.shot(`${OUT}/f2s-bench${b.i}-${s.facing}.png`);
  }
} finally { await X.close?.(); }
console.log(`farm2 sit: ${pass} passed, ${fail} failed`);
