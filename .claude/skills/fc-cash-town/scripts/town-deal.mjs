// Cash Town's trading between members, tried in a real browser on the dev test room (the trial kept in the browser,
// `next dev` only), by two testers in two tabs of one browser:
//
// - a deal is opened from the other's card on the map, and only when they stand near;
// - both see it; each lays out things from their own bag by tapping them, and takes them back the same way;
// - one side changing takes back both words; with both words given everything changes hands at once, and both are told;
// - a bag with no room refuses the lot, and nothing moves; a deal called off by one is off for both;
// - a pot of food changes hands with its food in it;
// - coins are laid beside the things, and change hands with them: a thing is sold, not only swapped.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-deal.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", D = "window.__townDeal";
const purse = (X) => X.evaluate(`${T}.purse()`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const deal = (X) => X.evaluate(`${D}.deal()`);
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(800); };
const grant = (X, list) => X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify(list)}) ${T}.grant(id, n); })()`);
const shown = (X, re) => X.evaluate(`[...document.querySelectorAll("p")].some((b) => ${re}.test(b.innerText))`);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
/** Tap a point of the map (counted from the map’s own corner), as a finger or a mouse does. */
async function tap(X, mx, my) {
  const box = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + box.x, y = my + box.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}
/** Press the button whose label (or text) matches. */
const press = (X, re) => X.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((b) => ${re}.test(b.getAttribute("aria-label") ?? "") || ${re}.test(b.innerText)); if (!b || b.disabled) return false; b.click(); return true; })()`);
/** In the deal's panel: tap a thing in my bag (to lay one out), or one I have laid out (to take one back). */
const PANEL = `document.querySelector('section[aria-label="แลกของ"]')`;
const tapIn = (X, where, re) => X.evaluate(`(() => { const b = [...${PANEL}.querySelectorAll(${JSON.stringify(where)})].find((b) => ${re}.test(b.getAttribute("aria-label") ?? "")); if (!b || b.disabled) return false; b.click(); return true; })()`);
const bagTap = async (X, re) => { const did = await tapIn(X, 'ul[aria-label="ของในกระเป๋า"] button', re); await sleep(300); return did; };
const chipTap = async (X, re) => { const did = await tapIn(X, "div > div:first-child ul button", re); await sleep(300); return did; };
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the deal's own code has come", () => X.evaluate(`!!${D}`), 20000);
}

const X = await browser("Deal", { width: 1280, height: 860 });
try {
  await enter(X, "F");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(400);
  const Y = await X.tab("DealB");
  await enter(Y, "C");
  await X.evaluate(`${T}.resize(6)`);
  await Y.evaluate(`${T}.resize(6)`);
  await grant(X, [["snakehead", 2], ["minnow", 4], ["rod", 1]]);
  await grant(Y, [["tomYum", 2], ["bowl", 1]]);
  const idY = (await me(Y)).id, idX = (await me(X)).id;

  // far apart: no way to open one
  await warp(X, 30, 30);
  await warp(Y, 38, 30);
  await until("the fisher sees the cook", () => X.evaluate(`!!window.__townView.screenOf(${JSON.stringify(idY)})`), 15000);
  let at = await X.evaluate(`window.__townView.screenOf(${JSON.stringify(idY)})`);
  await tap(X, at.x, at.y);
  ok("somebody far off has a card, with no way to trade on it", (await X.evaluate(`[...document.querySelectorAll("button")].some((b) => /เดินไปหา|Walk/.test(b.innerText))`)) && !(await X.evaluate(`[...document.querySelectorAll("button")].some((b) => /แลกของ/.test(b.innerText))`)));
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });

  // near: the card offers a deal
  await warp(Y, 31, 30);
  await sleep(1200);
  at = await X.evaluate(`window.__townView.screenOf(${JSON.stringify(idY)})`);
  await tap(X, at.x, at.y);
  await until("the card of somebody near offers a deal", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => /แลกของ/.test(b.innerText))`), 5000);
  await X.shot(`${OUT}/deal-card.png`);
  ok("it is opened from their card", await press(X, "/แลกของ/"));
  await until("both see the deal", async () => !!(await deal(X)) && !!(await deal(Y)), 6000);
  const d0 = await deal(X);
  ok("the deal is between the two, with nothing laid out and no word given", d0.a === idX && d0.b === idY && d0.give.a.length === 0 && d0.give.b.length === 0 && !d0.ok.a && !d0.ok.b, d0);

  // each lays out from their own bag, by tapping
  ok("a tap on a thing in my bag lays one out", (await bagTap(X, "/^ปลาช่อน ×2$/")) === true);
  await bagTap(X, "/^ปลาซิว ×4$/");
  await bagTap(X, "/^ปลาซิว ×3$/");
  let d = await deal(Y);
  ok("…and the other sees it", JSON.stringify(d.give.a) === JSON.stringify([["snakehead", 1], ["minnow", 2]]), d.give);
  await bagTap(Y, "/^ต้มยำปลาช่อน ×2$/");
  await bagTap(Y, "/^ต้มยำปลาช่อน ×1$/");
  // a tap on what is laid out takes one back
  const back = await chipTap(Y, "/^ต้มยำปลาช่อน ×2$/");
  d = await deal(X);
  ok("the other lays out theirs, and takes one back", back === true && JSON.stringify(d.give.b) === JSON.stringify([["tomYum", 1]]), d.give);
  await X.shot(`${OUT}/deal-open.png`);

  // words
  await press(X, "/^ตกลงแลก$/");
  await sleep(400);
  ok("one word given: nothing has moved", (await deal(X)).ok.a === true && (await has(X, "tomYum")) === 0 && (await has(Y, "snakehead")) === 0);
  await bagTap(Y, "/^ต้มยำปลาช่อน ×1$/");
  d = await deal(X);
  ok("the other changing their side takes my word back", d.ok.a === false && d.ok.b === false && JSON.stringify(d.give.b) === JSON.stringify([["tomYum", 2]]), d);
  await press(X, "/^ตกลงแลก$/");
  await sleep(300);
  await press(Y, "/^ตกลงแลก$/");
  await until("with both words everything changes hands", async () => (await has(X, "tomYum")) === 2 && (await has(Y, "snakehead")) === 1, 6000);
  ok("each has what the other laid out, and no more of what they gave", (await has(X, "snakehead")) === 1 && (await has(X, "minnow")) === 2 && (await has(Y, "minnow")) === 2 && (await has(Y, "tomYum")) === 0);
  await until("both are told", async () => (await shown(X, "/แลกของเรียบร้อย/")) && (await shown(Y, "/แลกของเรียบร้อย/")), 6000).then(() => ok("both are told it is done", true), (e) => ok("both are told it is done", false, e.message));
  await X.shot(`${OUT}/deal-done.png`);
  await sleep(6500);
  ok("the deal is over for both", (await deal(X)) === null && (await deal(Y)) === null);

  // no room: nothing moves
  await grant(Y, [["boot", 1], ["hyacinth", 1], ["bottle", 1]]);
  const full = (await purse(Y)).bag.filter(Boolean).length;
  await X.evaluate(`${D}.open(${JSON.stringify(idY)}, "C")`);
  await sleep(400);
  await X.evaluate(`${D}.lay([["rod", 1]])`);
  await X.evaluate(`${D}.agree()`);
  const refused = await Y.evaluate(`${D}.agree()`);
  ok("a bag with no room refuses the lot: nothing moves, and the words are taken back", full === 6 && refused.ok === false && refused.why === "full" && (await has(X, "rod")) === 1 && (await has(Y, "rod")) === 0 && (await deal(X)).ok.a === false, { full, refused });
  await Y.evaluate(`${D}.cancel()`);
  await until("called off by one, it is off for both", async () => (await shown(X, "/ยกเลิกการแลกแล้ว/")), 6000).then(() => ok("a deal called off by one is off for both", true), (e) => ok("a deal called off by one is off for both", false, e.message));

  // a pot of food, as it is
  await sleep(6500);
  await Y.evaluate(`(${T}.empty(), ${T}.grant("pot", 1))`);
  await Y.evaluate(`(() => { const t = ${T}; const p = t.purse(); p.bag[0] = { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }; localStorage.setItem(Object.keys(localStorage).find((k) => k.startsWith("cashtown.trial.purse") && k.endsWith(${JSON.stringify(idY)})), JSON.stringify(p)); })()`);
  await sleep(300);
  await Y.evaluate(`${D}.open(${JSON.stringify(idX)}, "F")`);
  await sleep(300);
  await Y.evaluate(`${D}.lay([["potFull", 1]])`);
  await Y.evaluate(`${D}.agree()`);
  await X.evaluate(`${D}.agree()`);
  await sleep(500);
  const got = (await purse(X)).bag.find((s) => s?.item === "potFull");
  ok("a pot of food changes hands with its food in it", got?.of?.dish === "tomYum" && got.of.left === 3, got);

  // coins beside the things: a thing sold
  await sleep(6500);
  await X.evaluate(`${T}.grant("rod", 0, 40)`);
  const before = [(await purse(X)).coins, (await purse(Y)).coins];
  await Y.evaluate(`(${T}.empty(), ${T}.grant("minnow", 2))`);
  await X.evaluate(`${D}.open(${JSON.stringify(idY)}, "B")`);
  await sleep(400);
  await until("the deal's panel is up", () => X.evaluate(`!!document.querySelector('[aria-label="Popoto coin ของฉัน"]')`), 5000);
  // +10 twice, +1, and one taken back: twenty coins
  for (const label of ["+10 coin", "+10 coin", "+1 coin", "-1 coin"]) { await X.evaluate(`document.querySelector('[aria-label="${label}"]').click()`); await sleep(250); }
  await Y.evaluate(`${D}.lay([["minnow", 2]])`);
  await sleep(300);
  let dc = await deal(Y);
  ok("coins are laid beside the things with a tap, and the other sees them", dc.coins.a === 20 && dc.coins.b === 0 && JSON.stringify(dc.give.b) === JSON.stringify([["minnow", 2]]), dc);
  ok("more coins than are in the purse cannot be laid", (await X.evaluate(`${D}.lay([], 100000)`)).why === "coins");
  await X.shot(`${OUT}/deal-coins.png`);
  await X.evaluate(`${D}.lay([], 20)`);
  await Y.evaluate(`${D}.agree()`);
  await X.evaluate(`${D}.agree()`);
  await sleep(600);
  ok("with both words given the coins and the things change hands at once", (await purse(X)).coins === before[0] - 20 && (await purse(Y)).coins === before[1] + 20 && (await has(X, "minnow")) >= 2 && (await has(Y, "minnow")) === 0,
    { coins: [(await purse(X)).coins, (await purse(Y)).coins], before });
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs]);
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
