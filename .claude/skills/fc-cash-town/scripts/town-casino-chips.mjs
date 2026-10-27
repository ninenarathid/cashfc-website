// The casino's own coins (v303) in a real browser, against the stand-in with v303 in it (the bench of
// town-casino-db.mjs with v303 last in BENCH_EXTRA). Production is not touched.
//
// An admin in the trial sits at a machine with no Casino Coins: the button sends to the counter; there, today's free
// coins are taken, five spins' worth changed from Popoto coins (the town's own count of the purse follows), the count
// in the room's corner opens the counter; back at the machine a spin takes Casino Coins and the pair pays them back.
// A member on a phone, open to everybody, does the same. Pictures at 1280x860, 384x730 and 360x640.
//
//   node town-bench.mjs 3299   (as for town-casino-db.mjs, with v303 after v299)
//   node town-casino-chips.mjs <base> <outdir> [bench]
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
async function walkIn(X) {
  await X.evaluate(`${V}.warp(${OUTSIDE[0]}, ${OUTSIDE[1]})`); await sleep(900);
  const gate = (await X.evaluate(`${V}.gates()`)).find((g) => g.to[0] === DOOR[0] && g.to[1] === DOOR[1]);
  if (!gate) return false;
  await tap(X, ...middle(gate));
  await until("in the casino", async () => (await casino(X)).place === "casino", 20000);
  await sleep(1500);
  return true;
}
/** Sit at machine n, or (the room is wide: a phone sees part of it) the machine nearest the screen's middle that is in sight; which one. */
async function sitAt(X, n) {
  let box = null;
  const size = await X.evaluate(`({ w: innerWidth, h: innerHeight })`);
  await until(`machine ${n} drawn`, async () => {
    const seen = (await casino(X)).boxes.filter((b) => b.n > 0 && middle(b)[0] > 20 && middle(b)[0] < size.w - 20 && middle(b)[1] > 90 && middle(b)[1] < size.h - 200);
    box = seen.find((b) => b.n === n) ?? seen.sort((a, b) => Math.abs(middle(a)[0] - size.w / 2) - Math.abs(middle(b)[0] - size.w / 2))[0] ?? null; return !!box; }, 15000);
  await tap(X, ...middle(box));
  try { await until("the sheet is open", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "slots"`), 10000); }
  catch (e) { await X.shot(`${OUT}/fail-sit.png`); console.log("  (sit failed: " + JSON.stringify({ box, error: await X.evaluate(`document.querySelector(".casino-error")?.innerText ?? null`), pane: await X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane`) }) + ")"); throw e; }
  await until("sat at the machine", () => X.evaluate(`!document.querySelector(".casino-in-town .casino-spin")?.disabled`), 20000);
  return box.n;
}
const text = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? ""`);
const click = (X, sel) => X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.disabled) return false; e.click(); return true; })()`);
const pane = (X) => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane`);
const chipsOf = async (m) => Number((await sql(`select chips from public.casino_live_accounts where user_id = $1`, [m]))[0]?.chips ?? 0);
const coinsOf = async (m) => Number((await sql(`select coins from public.town_purses where member_id = $1`, [m]))[0].coins);
const pick = (X, value) => X.evaluate(`(() => { const s = document.querySelector('.casino-in-town select[aria-label="ผลที่จะออก"]'); if (!s) return false;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);

/** The whole round: no coins at the machine, the counter, free coins, a change, a spin paid in them. */
async function round(X, label, m, { admin }) {
  // (walked up the room first, as a player would: the back wall is out of a phone's sight from the door)
  await X.evaluate(`${V}.warp(356.5, 117.5)`); await sleep(1500);
  const at = await sitAt(X, admin ? 5 : 6);
  ok(`${label}: with no Casino Coins the button sends to the counter`, /แลกที่เคาน์เตอร์/.test(await text(X, ".casino-in-town .casino-spin")), await text(X, ".casino-in-town .casino-spin"));
  ok(`${label}: the machine says the coins held`, /Casino Coin\s*0/.test(await text(X, ".casino-in-town .casino-allowance")), await text(X, ".casino-in-town .casino-allowance"));
  ok(`${label}: no simulation button`, !(await X.evaluate(`!!document.querySelector(".casino-simulate-toggle")`)));
  ok(`${label}: ten machines in the room`, new Set((await casino(X)).boxes.map((b) => b.n).filter((n) => n > 0)).size === 10, (await casino(X)).boxes.map((b) => b.n));
  ok(`${label}: no row of machines to pick, the machine named`, !(await X.evaluate(`!!document.querySelector(".casino-in-town .casino-machines")`)) && /เครื่อง \d/.test(await text(X, ".casino-in-town .casino-console h2")));
  await X.shot(`${OUT}/1-machine-no-coins-${label}.png`);
  await click(X, ".casino-in-town .casino-spin"); await sleep(700);
  ok(`${label}: and opens it`, (await pane(X)) === "desk");
  await X.shot(`${OUT}/2-counter-${label}.png`);
  await click(X, ".casino-chips-free"); await sleep(1500);
  ok(`${label}: today's free coins taken`, (await chipsOf(m)) === 100, await chipsOf(m));
  ok(`${label}: and said`, /รับฟรี 100/.test(await text(X, ".casino-chips-note")), await text(X, ".casino-chips-note"));
  ok(`${label}: once a day`, /รับฟรีวันนี้แล้ว/.test(await text(X, ".casino-chips-taken")) && !(await X.evaluate(`!!document.querySelector(".casino-chips-free")`)));
  const purse0 = await coinsOf(m), shown0 = await X.evaluate(`window.__townKeeper.purse().coins`);
  await click(X, ".casino-chips-packs button:nth-child(2)"); await sleep(300);
  ok(`${label}: five spins' worth chosen`, /แลก 500 Casino Coin · 500 Popoto coin/.test(await text(X, ".casino-chips-buy")), await text(X, ".casino-chips-buy"));
  await click(X, ".casino-chips-buy"); await sleep(1800);
  ok(`${label}: changed: 500 Popoto coins for 500 Casino Coins`, (await coinsOf(m)) === purse0 - 500 && (await chipsOf(m)) === 600, { coins: await coinsOf(m), chips: await chipsOf(m), purse0 });
  ok(`${label}: the town's own count of the purse follows`, (await X.evaluate(`window.__townKeeper.purse().coins`)) === shown0 - 500, { shown0, now: await X.evaluate(`window.__townKeeper.purse().coins`) });
  ok(`${label}: the town's status bar says the Casino Coins held`, /600/.test(await text(X, "[data-casino-chips]")), await text(X, "[data-casino-chips]"));
  // popoto changed at the counter, no week's limit (v305): ten popoto into fifty Popoto coins
  const popoto0 = Number((await sql(`select profile_left l from public.town_popoto_left($1)`, [m]))[0].l), coinsP = await coinsOf(m);
  ok(`${label}: the counter offers popoto`, /แลก popoto · มี/.test(await text(X, ".casino-popoto")), await text(X, ".casino-popoto"));
  if (popoto0 >= 10) {
    await click(X, ".casino-popoto-row button:nth-of-type(1)"); await sleep(1800);
    ok(`${label}: ten popoto changed into fifty Popoto coins`, (await coinsOf(m)) === coinsP + 50 && Number((await sql(`select profile_left l from public.town_popoto_left($1)`, [m]))[0].l) === popoto0 - 10, { coins: await coinsOf(m), coinsP, popoto0 });
  }
  await X.shot(`${OUT}/3-counter-after-${label}.png`);
  await click(X, ".casino-chip-count"); await sleep(500);
  ok(`${label}: the corner's count closes the counter again`, (await pane(X)) === "none");
  ok(`${label}: and the sheet is gone from the screen`, await X.evaluate(`getComputedStyle(document.querySelector(".casino-in-town .casino-lower")).display === "none"`));
  await click(X, ".casino-chip-count"); await sleep(500);
  ok(`${label}: and opens it`, (await pane(X)) === "desk");
  ok(`${label}: the counter offers the way back to the machine`, (await text(X, ".casino-chips-back")).includes(String(at)), await text(X, ".casino-chips-back"));
  await click(X, ".casino-chips-back");
  await until("back at the machine", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "slots" && !document.querySelector(".casino-in-town .casino-spin")?.disabled`), 20000);
  ok(`${label}: the spin is paid in Casino Coins`, /ปั่น · 100 Casino Coin/.test(await text(X, ".casino-in-town .casino-spin")), await text(X, ".casino-in-town .casino-spin"));
  if (admin) ok(`${label}: the pair forced`, await pick(X, "pair"));
  else await sql(`update public.casino_live_prizes set chance = case when id = 'pair' then 100 else 0 end`);
  const purse1 = await coinsOf(m);
  await click(X, ".casino-in-town .casino-spin"); await sleep(5600);
  const r = await text(X, ".casino-in-town .casino-result");
  // (v304: the pair pays a row of the paytable, a part of the price)
  // (one pair, or two: "200 + 20")
  const said = /ได้ ([\d,]+(?: \+ [\d,]+)?) Casino Coin!/.exec(r), parts = said ? said[1].split(" + ").map((x) => Number(x.replace(/,/g, ""))) : [];
  const back = said ? [null, String(parts.reduce((n, a) => n + a, 0))] : null;
  ok(`${label}: the pairs of the paytable paid, said by their coins alone`, !!said && parts.every((a) => [20, 50, 150, 200, 500].includes(a)) && !/%/.test(r) && /หมุนต่อได้เลย/.test(r), r);
  ok(`${label}: the price taken and that part paid back in Casino Coins, the purse untouched`, !!back && (await chipsOf(m)) === 600 - 100 + Number(back[1]) && (await coinsOf(m)) === purse1, { chips: await chipsOf(m), coins: await coinsOf(m), back });
  await X.shot(`${OUT}/4-coins-back-${label}.png`);
  await X.evaluate(`document.querySelector(".casino-in-town .casino-prize-details").open = true`); await sleep(400);
  ok(`${label}: the machine shows its paytable, five rows of coins`, (await X.evaluate(`document.querySelectorAll(".casino-in-town .casino-paytable-row:not(.is-prize)").length`)) === 5);
  // (a prize's own name may hold one, as the gold's purity does: what the list itself says has none)
  const listed = await X.evaluate(`(() => { const d = document.querySelector(".casino-in-town .casino-prize-details").cloneNode(true); d.querySelectorAll(".is-prize span:last-child").forEach((e) => e.remove()); return d.textContent; })()`);
  ok(`${label}: and no chance in it`, !listed.includes("%"), listed);
  const box = await X.evaluate(`(() => { const r = document.querySelector(".casino-in-town .casino-lower").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  for (let k = 0; k < 6; k++) { await X.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: box.x, y: box.y, deltaX: 0, deltaY: 120 }); await sleep(120); }
  await sleep(400);
  await X.shot(`${OUT}/5-paytable-${label}.png`);
  // standing up with X shuts the open machine's sheet (the owner, 2026-10-27)
  await X.evaluate(`document.querySelector("canvas")?.focus()`);
  for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "x", code: "KeyX", windowsVirtualKeyCode: 88, ...(type === "keyDown" ? { text: "x" } : {}) });
  await sleep(1500);
  ok(`${label}: standing up with X shuts the machine's sheet`, (await pane(X)) === "none", await pane(X));
}

// ── set up: the trial, the pair as v303 set it going, nobody's coins yet ──
await sql(`update public.casino_live_settings set access = 'admins', open = false, chip_rate = 1, free_chips = 100 where id = 1`);
await sql(`update public.casino_live_prizes set issued = 0`);
// (the pair as live has it: 20%, paid by v304's paytable)
await sql(`update public.casino_live_prizes set name = 'Casino Coin คืน', kind = 'coin', amount = 22, chance = 20, active = true where id = 'pair'`);
await sql(`delete from public.casino_live_spins where true`);
// (nobody holds a machine from a run before, v305)
const freeSeats = () => sql(`do $f$ begin if to_regclass('public.casino_live_seats') is not null then delete from public.casino_live_seats; end if; end $f$`);
await freeSeats(); await sql(`delete from public.casino_live_chip_moves where true`); await sql(`update public.casino_live_accounts set chips = 0, spins = 0`);

const A = await browser("chips-a", { width: 1280, height: 860 });
try {
  await enter(A, "A");
  const a = await memberOf(A);
  await sql(`update public.profiles set is_admin = true, character_name = 'Nine' where id = $1`, [a]);
  await sql(`select town.purse_of($1, true)`, [a]); await sql(`update public.town_purses set coins = 5000 where member_id = $1`, [a]);
  await A.evaluate(`window.__townKeeper.purseAgain?.()`); await sleep(800);
  await door(A); await sleep(1200);
  ok("desktop: walks in", await walkIn(A));
  await round(A, "desktop", a, { admin: true });
  ok("desktop: the trial's coins are tests", (await sql(`select count(*)::int n from public.casino_live_chip_moves where test and user_id = $1`, [a]))[0].n === 2);

  for (const [label, size, letter] of [["384x730", { width: 384, height: 730, mobile: true, dpr: 2 }, "B"], ["360x640", { width: 360, height: 640, mobile: true, dpr: 2 }, "C"]]) {
    const B = await browser(`chips-${label}`, size);
    try {
      await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
      await sql(`update public.casino_live_prizes set chance = case id when 'pair' then 20 when 'seven' then 0.02 when 'cherry' then 0.04 when 'gold' then 0.4 when 'popoto' then 6.4 else 0 end`);
      await freeSeats();
      await enter(B, letter);
      const b = await memberOf(B);
      await sql(`select town.purse_of($1, true)`, [b]); await sql(`update public.town_purses set coins = 3000 where member_id = $1`, [b]);
      await B.evaluate(`window.__townKeeper.purseAgain?.()`); await sleep(800);
      await door(B); await sleep(1200);
      ok(`${label}: walks in`, await walkIn(B));
      await round(B, label, b, { admin: false });
    } finally { await B.quit(); }
  }
} finally {
  await A.quit();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
