// The Popoto Casino as a room of the town, tried in a real browser before anything is pushed: the dev test room kept
// by the database's keeper against a stand-in with v299 in it (scripts/db/town-bench.mjs from the bench kept after
// v296, with v297, v298, v204, v206, the site's prize stand-ins and v299 as BENCH_EXTRA). Production is not touched.
//
// Shut, the kura is a storehouse like any other; let in, an admin sees "Popoto Casino" over its door, taps it, walks
// in, taps a machine, sits at it, forces the evercold and wins it: a prize row of the site's, its bell, the sheet saying
// where it went. A member is kept out while the admins try it, and let in once everybody is: walks in on a phone,
// spins. Pictures at 1280x860, 384x730 and 360x640.
//
//   node town-bench.mjs 3299   (BENCH_FROM=<the kept bench> BENCH_EXTRA=…, see scripts/db/README.md)
//   node town-casino-db.mjs <base> <outdir> [bench]
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
const memberOf = async (X) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id;
const casino = (X) => X.evaluate(`${V}.casino()`);
const door = (X) => X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`);
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}
const middle = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=casino&townHour=20&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate("!!window.__townKeeper && window.__townKeeper.ready()"), 60000);
}
const DOOR = [68, 34], OUTSIDE = [68, 35];
/** Walk in by the kura's door: stand before it, tap it, and wait to be in the casino. */
async function walkIn(X) {
  await X.evaluate(`${V}.warp(${OUTSIDE[0]}, ${OUTSIDE[1]})`); await sleep(900);
  const gate = (await X.evaluate(`${V}.gates()`)).find((g) => g.to[0] === DOOR[0] && g.to[1] === DOOR[1]);
  if (!gate) return false;
  await tap(X, ...middle(gate));
  await until("in the casino", async () => (await casino(X)).place === "casino", 20000);
  await sleep(1500);
  return true;
}
async function sitAt(X, n) {
  let box = null;
  await until(`machine ${n} drawn`, async () => { box = (await casino(X)).boxes.find((b) => b.n === n); return !!box; }, 15000);
  await tap(X, ...middle(box));
  await until("the sheet is open", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "slots"`), 10000);
  await until("sat at the machine", () => X.evaluate(`!document.querySelector(".casino-in-town .casino-spin")?.disabled`), 20000);
}
const pick = (X, value) => X.evaluate(`(() => { const s = document.querySelector('.casino-in-town select[aria-label="ผลที่จะออก"]'); if (!s) return false;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const spin = async (X) => { await X.evaluate(`document.querySelector(".casino-in-town .casino-spin")?.click()`); await sleep(5200); };
const resultOf = (X) => X.evaluate(`document.querySelector(".casino-in-town .casino-result")?.innerText ?? ""`);

// ── set up: closed, the prizes as the event will have them ──
await sql(`update public.casino_live_settings set access = 'closed', open = false where id = 1`);
await sql(`update public.casino_live_prizes set active = true, chance = 0.001, stock = 1, name = 'Evercold', kind = 'physical' where id = 'evercold'`);
await sql(`update public.casino_live_prizes set active = true, chance = 10, amount = 50 where id = 'pair'`);
await sql(`delete from public.casino_live_spins where true`); await sql(`update public.casino_live_prizes set issued = 0`);

const A = await browser("casino-a", { width: 1280, height: 860 });
try {
  await enter(A, "A");
  const a = await memberOf(A);
  await sql(`update public.profiles set is_admin = true, character_name = 'Nine' where id = $1`, [a]);
  await sql(`select town.purse_of($1, true)`, [a]); await sql(`update public.town_purses set coins = 5000 where member_id = $1`, [a]);
  // (the page read the purse as it opened: once more, as the database has it now)
  await A.evaluate(`window.__townKeeper.purseAgain?.()`); await sleep(800);
  await door(A); await sleep(1200);
  ok("closed: the door does not open for an admin", (await casino(A)).door === false);
  await A.evaluate(`${V}.warp(${OUTSIDE[0]}, ${OUTSIDE[1]})`); await sleep(1500);
  ok("closed: the kura has no way in", !(await A.evaluate(`${V}.gates()`)).some((g) => g.to[0] === DOOR[0] && g.to[1] === DOOR[1]));
  await A.shot(`${OUT}/1-kura-closed-desktop.png`);

  // ── the admins' trial ──
  await sql(`update public.casino_live_settings set access = 'admins', open = false where id = 1`);
  await door(A); await sleep(1200);
  ok("the admins' trial: the door opens for an admin", (await casino(A)).door === true);
  await sleep(600);
  await A.shot(`${OUT}/2-kura-open-desktop.png`);
  ok("walks in by tapping the kura's door", await walkIn(A));
  await A.shot(`${OUT}/3-casino-room-desktop.png`);
  await sitAt(A, 3);
  ok("the admin's sheet offers a forced result", await pick(A, "evercold"));
  await A.shot(`${OUT}/4-casino-sheet-desktop.png`);
  const purseBefore = Number((await sql(`select coins from public.town_purses where member_id = $1`, [a]))[0].coins);
  const shownBefore = await A.evaluate(`window.__townKeeper.purse().coins`);
  await spin(A);
  await sleep(1500);
  ok("the price is taken from the town's purse", Number((await sql(`select coins from public.town_purses where member_id = $1`, [a]))[0].coins) === purseBefore - 100);
  ok("and the town's own count of my coins follows", (await A.evaluate(`window.__townKeeper.purse().coins`)) === shownBefore - 100 && shownBefore === purseBefore,
    { shownBefore, after: await A.evaluate(`window.__townKeeper.purse().coins`), purseBefore });
  const won = await resultOf(A);
  ok("the evercold, forced, is won", won.includes("Evercold"), won);
  ok("the sheet says where it went", await A.evaluate(`!!document.querySelector(".casino-in-town .casino-where")`));
  const rows = await sql(`select prize_name, draw from public.prize_wins where winner = $1`, [a]);
  ok("a prize row of the site's, from the casino", rows.some((r) => r.prize_name === "Evercold" && r.draw === "casino"), rows);
  ok("its bell", (await sql(`select count(*)::int n from public.notifications where recipient = $1 and kind = 'prize_win'`, [a]))[0].n === 1);
  ok("marked a test", (await sql(`select count(*)::int n from public.casino_live_spins where test and user_id = $1`, [a]))[0].n === 1);
  await A.shot(`${OUT}/5-casino-win-desktop.png`);
  // the room's results, and the desk at the counter
  await A.evaluate(`document.querySelector('[aria-label="ผลในห้อง"]')?.click()`); await sleep(700);
  await A.shot(`${OUT}/6-casino-feed-desktop.png`);
  const counter = (await casino(A)).boxes.find((b) => b.n === 0);
  if (counter) { await tap(A, ...middle(counter)); await sleep(800); }
  ok("the counter opens the casino's desk", await A.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "desk"`));
  await A.shot(`${OUT}/7-casino-desk-desktop.png`);

  // ── a member on a phone ──
  for (const [label, size] of [["384x730", { width: 384, height: 730, mobile: true, dpr: 2 }], ["360x640", { width: 360, height: 640, mobile: true, dpr: 2 }]]) {
    const B = await browser(`casino-b-${label}`, size);
    try {
      await enter(B, label === "384x730" ? "B" : "C");
      const b = await memberOf(B);
      await sql(`select town.purse_of($1, true)`, [b]); await sql(`update public.town_purses set coins = 3000 where member_id = $1`, [b]);
      await sql(`update public.casino_live_settings set access = 'admins', open = false where id = 1`);
      await door(B); await sleep(1200);
      ok(`${label}: while the admins try it a member's door does not open`, (await casino(B)).door === false);
      await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
      await door(B); await sleep(1200);
      ok(`${label}: open to everybody, the member's door opens`, (await casino(B)).door === true);
      await B.evaluate(`${V}.warp(${OUTSIDE[0]}, ${OUTSIDE[1]})`); await sleep(1200);
      await B.shot(`${OUT}/8-kura-open-${label}.png`);
      ok(`${label}: walks in`, await walkIn(B));
      await B.shot(`${OUT}/9-casino-room-${label}.png`);
      await sitAt(B, 2);
      await B.shot(`${OUT}/10-casino-sheet-${label}.png`);
      await spin(B);
      const r = await resultOf(B);
      ok(`${label}: a member's spin comes back`, /ได้|ยังไม่ได้รางวัล/.test(r), r);
      ok(`${label}: no forced result for a member`, !(await B.evaluate(`!!document.querySelector('.casino-in-town select[aria-label="ผลที่จะออก"]')`)));
      await B.shot(`${OUT}/11-casino-spun-${label}.png`);
    } finally { await B.quit(); }
  }
} finally {
  await A.quit();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
