// Three on one of the casino's sofas (the owner, 2026-10-27: "ทำให้นั่งบนโซฟา นั่งได้สามคน ตอน hover ขึ้นเมาส์เป็นรูปนั่ง
// เหมือนที่อื่นๆด้วย"), in real browsers against the stand-in (the bench of town-casino-chips.mjs). A desktop, a phone
// and a third: each taps the left sofa in turn and sits on a cushion of its own; the mouse over a sofa shows the
// seat, over a machine the hand. Pictures at 1280x860 and 384x730 with all three sat.
//
//   node town-casino-sofa.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3201", OUT = ".", BENCH = "http://127.0.0.1:3299"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const V = "window.__townView";
const sql = async (text, params = []) => {
  const r = await (await fetch(`${BENCH}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: text, params }) })).json();
  if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`);
  return r.rows;
};
const casino = (X) => X.evaluate(`${V}.casino()`);
const middle = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
async function point(X, mx, my, press = true) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  if (press) for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=casino&townHour=20&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1200);
  await X.evaluate(`${V}.warp(68, 35)`); await sleep(900);
  const gate = (await X.evaluate(`${V}.gates()`)).find((g) => g.to[0] === 68 && g.to[1] === 34);
  if (gate) await point(X, ...middle(gate));
  await until("in the casino", async () => (await casino(X)).place === "casino", 20000);
  await sleep(1500);
}
// the left sofa's three places: the floor before each cushion (lib/town/casino-room's CASINO_SOFA_SEATS)
const SPOTS = [342.5, 343.5, 344.5];
async function sit(X, label) {
  await X.evaluate(`${V}.warp(346, 120)`); await sleep(1500);
  const sofa = (await casino(X)).boxes.find((b) => b.n === 100);
  ok(`${label}: the sofa is on the screen`, !!sofa);
  if (!sofa) return null;
  // (its arm: whoever sits on a cushion is tapped for their card, as anywhere)
  const w = sofa.x1 - sofa.x0, left = sofa.x0 + w * .08, wide = await X.evaluate("innerWidth");
  await point(X, left > 12 ? left : Math.min(wide - 12, sofa.x1 - w * .08), sofa.y0 + (sofa.y1 - sofa.y0) * .7);
  const me = await until(`${label} on the sofa`, async () => { const m = await X.evaluate("window.__cashTown.me()"); return m && m.sit === -2 && Math.abs(m.y - 122.5) < 0.1 && SPOTS.some((x) => Math.abs(m.x - x) < 0.1) && m; }, 15000).catch(() => null);
  ok(`${label}: sits on the sofa`, !!me, await X.evaluate("window.__cashTown.me()"));
  return me ? me.x : null;
}

await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
const A = await browser("sofa-a", { width: 1280, height: 860 });
const B = await browser("sofa-b", { width: 384, height: 730, mobile: true, dpr: 2 });
const C = await browser("sofa-c", { width: 1280, height: 860 });
try {
  for (const [X, letter] of [[A, "A"], [B, "B"], [C, "C"]]) await enter(X, letter);
  // the mouse: the seat over a sofa, the hand over a machine (a mouse only; a finger has no cursor)
  await A.evaluate(`${V}.warp(346, 120)`); await sleep(1500);
  const sofa = (await casino(A)).boxes.find((b) => b.n === 100), machine = (await casino(A)).boxes.find((b) => b.n === 1);
  if (sofa) { await point(A, ...middle(sofa), false); ok("desktop: the seat over a sofa", (await A.evaluate(`${V}.cursor()`)) === "sit", await A.evaluate(`${V}.cursor()`)); await sleep(500); await A.shot(`${OUT}/sofa-hover-1280.png`); }
  if (machine) { await point(A, ...middle(machine), false); ok("desktop: the hand over a machine", (await A.evaluate(`${V}.cursor()`)) === "hand", await A.evaluate(`${V}.cursor()`)); }
  const sat = [];
  for (const [X, label] of [[A, "desktop"], [B, "phone"], [C, "third"]]) { sat.push(await sit(X, label)); await sleep(2500); }
  ok("three on one sofa, each on a cushion of their own", sat.every((x) => x !== null) && new Set(sat).size === 3, sat);
  await sleep(2000);
  await A.evaluate(`${V}.lookAt(343, 120)`); await B.evaluate(`${V}.lookAt(343, 120)`); await sleep(1200);
  await A.shot(`${OUT}/sofa-three-1280.png`);
  await B.shot(`${OUT}/sofa-three-384.png`);
  await A.evaluate(`${V}.zoom(3)`); await sleep(800);
  await A.shot(`${OUT}/sofa-three-close.png`);
} finally {
  await A.quit(); await B.quit(); await C.quit();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
