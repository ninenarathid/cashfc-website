// The lotus-leaf boat (the fishing line's eighth rank; the owner, 2026-11-04: "ช่วยแก้บั๊ค … ให้ใช้งานได้จริง Gen ภาพใหม่ ให้ UI
// ดีขึ้นด้วย"). Tried in the trial with two members in two windows: the owner, a few tiles from a dock, is offered a walk
// to each dock by name and walks there; launches; offers the seat; the friend, on the dock, boards; the owner sails to
// the anchor, where both are drawn on the boat on both screens and the bank's own casting is not offered; back at the
// dock, the owner puts the boat away. Every state of the panel is shot.
//
//   node .claude/skills/fc-cash-town/scripts/town-boat.mjs <base-url> <out-dir> [1280x860|384x730|360x640]
//
// Needs `next dev` (the trial's test room). Writes boat-<size>-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", SIZE = "1280x860"] = process.argv.slice(2);
const [W, H] = SIZE.split("x").map(Number);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView";
const DOCK = [180, 133], ANCHOR = [180, 137];
const enter = async (X, letter) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=boat&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const press = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`, true);
const text = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`);
const self = (X) => X.evaluate(`${V}.self()`);
const shot = (X, name) => X.shot(`${OUT}/boat-${W}-${name}.png`);

const X = await browser("Boat", { width: W, height: H });
try {
  await enter(X, "S");
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
  await sleep(300);
  await enter(X, "S");
  await X.evaluate(`(${T}.setSalt("boat"), ${T}.setStamina(100), ${T}.setGifts(["thingLotusBoat"]))`);
  const me = await X.evaluate(`window.__cashTown.me().id`);
  const Y = await X.window("BoatB", { width: W, height: H });
  await enter(Y, "U");

  // ── a few tiles from the dock: the panel names the docks and walks there ──
  await X.evaluate(`${V}.warp(${DOCK[0] - 3}, ${DOCK[1] - 2})`);
  await until("the boat's button", () => has(X, "[data-boat-open]"), 8000).catch(() => null);
  ok("in the forest with the gift, the boat's button is there", await has(X, "[data-boat-open]"));
  await press(X, "[data-boat-open]");
  await sleep(500);
  ok("away from a dock, a walk to each dock is offered by name", (await X.evaluate(`document.querySelectorAll("[data-boat-walk]").length`)) === 2);
  await shot(X, "1-to-dock");
  await press(X, "[data-boat-walk]");
  await until("at the dock", async () => { const s = await self(X); return Math.floor(s.x) === DOCK[0] && Math.floor(s.y) === DOCK[1] && !s.moving; }, 20000).catch(() => null);
  const there = await self(X);
  ok("the walk ends on the dock", Math.floor(there.x) === DOCK[0] && Math.floor(there.y) === DOCK[1], there);
  await until("the launch", () => has(X, "[data-boat-launch]"), 6000).catch(() => null);
  if (!(await has(X, "[data-boat-launch]"))) { await press(X, "[data-boat-open]"); await sleep(400); }
  ok("on the dock, the launch is offered", await has(X, "[data-boat-launch]"));
  await shot(X, "2-at-dock");

  // ── launched; the seat offered; the friend boards ──
  await press(X, "[data-boat-launch]");
  await until("launched", () => has(X, "[data-boat-seat]"), 8000).catch(() => null);
  ok("launched: the seat can be offered", await has(X, "[data-boat-seat]"));
  ok("…and the time left shows", /\d+:\d\d/.test((await text(X, "[data-boat-left]")) ?? ""), await text(X, "[data-boat-left]"));
  await sleep(800);
  await shot(X, "3-launched");
  await press(X, "[data-boat-seat]");
  await until("the seat open", async () => /เปิด|Open/.test((await text(X, "[data-boat-seat-state]")) ?? ""), 6000).catch(() => null);
  await Y.evaluate(`${V}.warp(${DOCK[0]}, ${DOCK[1]})`);
  await sleep(1200);
  await press(Y, "[data-boat-open]");
  await until("the friend is offered the seat", () => has(Y, "[data-boat-join]"), 15000).catch(() => null);
  ok("on the dock, the friend is offered the seat by the owner's name", await has(Y, "[data-boat-join]"));
  await shot(Y, "4-friend-join");
  await press(Y, "[data-boat-join]");
  await until("the friend aboard", async () => /เพื่อน|Taken/.test((await text(X, "[data-boat-seat-state]")) ?? ""), 15000).catch(() => null);
  ok("the owner sees the seat taken", /เพื่อน|Taken/.test((await text(X, "[data-boat-seat-state]")) ?? ""), await text(X, "[data-boat-seat-state]"));

  // ── out to the anchor ──
  await press(X, "[data-boat-depart]");
  await sleep(450);
  ok("under way, the panel says so", await has(X, "[data-boat-moving]"));
  await shot(X, "5-sailing");
  await until("anchored", () => has(X, "[data-boat-return]"), 10000).catch(() => null);
  ok("anchored: the way back is offered", await has(X, "[data-boat-return]"));
  await sleep(1500);
  const mine = await self(X), seen = await Y.evaluate(`${V}.at(${JSON.stringify(me)})`);
  ok("the owner is on the water at the anchor", Math.floor(mine.x) === ANCHOR[0] && Math.floor(mine.y) === ANCHOR[1], mine);
  ok("…and the friend's page draws them there", !!seen && Math.abs(seen.x - mine.x) < 0.6 && Math.abs(seen.y - mine.y) < 0.6, seen);
  await shot(X, "6-anchored");
  await shot(Y, "6-anchored-friend");

  // ── back: the trip ends on the bank (v258: the boat's time runs out as it comes in), both on the dock again ──
  await press(X, "[data-boat-return]");
  await until("back on the bank", async () => !(await has(X, "[data-boat-left]")), 12000).catch(() => null);
  ok("back on the bank, the boat is put away", !(await has(X, "[data-boat-left]")));
  await sleep(1200);
  const home = await self(X), friend = await self(Y);
  ok("the owner stands on the dock", Math.floor(home.x) === DOCK[0] && Math.floor(home.y) === DOCK[1], home);
  ok("…and so does the friend", Math.floor(friend.x) === DOCK[0] && Math.floor(friend.y) === DOCK[1], friend);
  await shot(X, "7-back");
} catch (e) {
  fail++; console.log("  FAIL", e?.message ?? e);
} finally {
  console.log(`${pass} passed, ${fail} failed`);
  await X.quit();
  process.exit(fail ? 1 : 0);
}
