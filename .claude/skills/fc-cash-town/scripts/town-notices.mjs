// Cash Town's notice board beside the uncle's stall, tried in a real browser on the dev test room (the trial kept in
// the browser, `next dev` only), by two testers in two tabs of one browser, the second on a phone's screen:
//
// - the stall has a third tab, the board; a notice to sell is written from what is in the bag, with the most it may
//   ask and what the board keeps said plainly, and pinned;
// - the other tester sees it, buys some, and has the things at once; nine tenths wait at the board for the first,
//   who collects them;
// - a notice of something wanted offers only what has been met, puts the coins down, is brought to by whoever holds
//   the thing, and its writer takes what was brought;
// - a fourth notice has no place until one is bought; a notice taken down gives back what it held;
// - nothing is wider than its panel.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-notices.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };

const T = "window.__townTrade";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`, TALK = `document.querySelector('[aria-labelledby="town-talk-h"]')`, BOARD = `${TRADE}.querySelector("[data-notices]")`;
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
const purse = (X) => X.evaluate(`${T}.purse()`);
const told = (X) => X.evaluate(`${T}.notices()`);
const has = async (X, item) => (await purse(X)).bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const click = async (X, x, y) => { for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
const enter = async (X) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
const said = (X) => X.evaluate(`${TRADE}.querySelector('[aria-live="polite"]')?.innerText.trim() ?? ""`);
async function come(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
/** Tap the uncle on the map, go through what he says, and ask him for the board by its name: his stall opens at it. */
async function toBoard(X) {
  await X.evaluate(`window.__townView.lookAt(46, 27.2)`);
  await sleep(900);
  const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
  const k = (await X.evaluate(`window.__townView.keepers()`)).find((b) => b.id === "uncle");
  await click(X, r.x + (k.x0 + k.x1) / 2, r.y + (k.y0 + k.y1) / 2);
  await until("the talk opens", () => X.evaluate(`!!${TALK}`), 4000);
  for (let i = 0; i < 8 && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)); i++) { await enter(X); await sleep(160); }
  const offers = await X.evaluate(`[...${TALK}.querySelector('[role="group"]').querySelectorAll("button")].map((b) => b.innerText.replace(/\\s+/g, " ").trim())`);
  await press(X, "กระดานฝากขาย", TALK);
  await until("the stall opens at the board", () => X.evaluate(`!!${TRADE} && !!${BOARD}`), 5000);
  await sleep(250);
  const tabs = await X.evaluate(`[...${TRADE}.querySelectorAll('[role="tablist"]')[0].querySelectorAll('[role="tab"]')].map((b) => b.innerText.replace(/\\s+/g, " ").trim())`);
  return { offers, tabs };
}
const tab = async (X, which) => { await X.evaluate(`${BOARD}.querySelector('[data-notices-tab="${which}"]').click()`); await sleep(250); };
/** Write a number into one of the form's boxes, as typing does. */
const type = async (X, box, value) => {
  await X.evaluate(`(() => { const i = ${BOARD}.querySelector("[${box}]"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, ${JSON.stringify(String(value))}); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await sleep(150);
};
const rows = (X) => X.evaluate(`[...${BOARD}.querySelectorAll("li[data-notice]")].map((li) => li.innerText.replace(/\\s+/g, " ").trim())`);
const within = (X) => X.evaluate(`(() => { const s = ${TRADE}.querySelector(".overflow-y-auto"); return s.scrollWidth <= s.clientWidth + 1; })()`);

const X = await browser("Notices", { width: 1280, height: 860 });
try {
  await come(X, "N");
  await X.evaluate(`(${T}.reset(), localStorage.removeItem("cashtown.trial.notices.1"), localStorage.removeItem("cashtown.trial.seen.1"))`);
  const Y = await X.tab("NoticesB", { width: 390, height: 780, dpr: 2, mobile: true });
  await come(Y, "O");
  await Y.evaluate(`${T}.reset()`);
  await X.evaluate(`(${T}.grant("kangkong", 30), ${T}.grant("can", 1))`);
  await Y.evaluate(`${T}.grant("minnow", 7, 300)`);
  await sleep(400);

  console.log("a notice to sell");
  const { offers, tabs } = await toBoard(X);
  ok("the uncle offers the board by its own name, beside buying and selling", ["ซื้อของ", "ฝากขาย", "กระดานฝากขาย"].every((o) => offers.includes(o)), offers);
  ok("…and his stall opens at it: the third tab, the board", tabs.length === 3 && /กระดาน/.test(tabs[2]), tabs);
  let b = await told(X);
  ok("nothing is pinned, three places are mine, and one more costs a hundred", b.notices.length === 0 && b.mine.length === 0 && b.slots === 3 && b.more === 100 && b.due === 0, b);
  await tab(X, "mine");
  await X.evaluate(`${BOARD}.querySelector('[data-notice-new="sell"]').click()`); await sleep(250);
  const picks = await X.evaluate(`[...${BOARD}.querySelectorAll("[data-notice-pick]")].map((x) => x.dataset.noticePick)`);
  ok("a thing to sell is picked from what is in the bag", picks.includes("kangkong") && picks.includes("can") && picks.length === 2, picks);
  await X.evaluate(`${BOARD}.querySelector('[data-notice-pick="kangkong"]').click()`); await sleep(250);
  await type(X, "data-notice-n", 25);
  await type(X, "data-notice-price", 99);
  let form = await X.evaluate(`({ n: ${BOARD}.querySelector("[data-notice-n]").value, price: ${BOARD}.querySelector("[data-notice-price]").value, sum: ${BOARD}.querySelector("[data-notice-sum]").innerText.replace(/\\s+/g, " "), known: ${BOARD}.querySelector("[data-notice-known]")?.innerText.replace(/\\s+/g, " ") ?? "" })`);
  ok("a price above the most a thing may ask is brought down to it: thirty for a kangkong", form.n === "25" && form.price === "30", form);
  await type(X, "data-notice-price", 4);
  form = await X.evaluate(`({ sum: ${BOARD}.querySelector("[data-notice-sum]").innerText.replace(/\\s+/g, " "), known: ${BOARD}.querySelector("[data-notice-known]")?.innerText.replace(/\\s+/g, " ") ?? "" })`);
  ok("what it comes to is said before it is pinned: ninety of a hundred coins, the board keeping a tenth, for three days", /ขายหมดได้ 90/.test(form.sum) && /หัก 10%/.test(form.sum) && /3 วัน/.test(form.sum), form);
  ok("…with what the relatives give for one, to price it by", /ญาติลุงให้ชิ้นละ 3/.test(form.known), form);
  await X.shot(`${OUT}/notices-writing.png`);
  await X.evaluate(`${BOARD}.querySelector("[data-notice-pin]").click()`); await sleep(400);
  b = await told(X);
  ok("pinned: twenty-five out of the bag, one notice of mine, and the board says so", (await has(X, "kangkong")) === 5 && b.mine.length === 1 && b.mine[0].left === 25 && b.mine[0].price === 4 && /ปักประกาศแล้ว/.test(await said(X)), [b.mine, await said(X)]);
  ok("my own notice has a way down and nothing to buy", (await rows(X)).some((r) => /ผักบุ้ง ×25/.test(r) && /เอาลง/.test(r) && /เหลือ 2 วัน 23 ชม\.|เหลือ 3 วัน 0 ชม\./.test(r)), await rows(X));

  console.log("somebody else buys");
  await toBoard(Y);
  let list = await rows(Y);
  ok("the other tester sees it on the board, with whose it is", list.length === 1 && /ผักบุ้ง ×25/.test(list[0]) && /ชิ้นละ 4/.test(list[0]) && /· test-N/.test(list[0]) && /ซื้อ 1/.test(list[0]), list);
  await Y.evaluate(`[...${BOARD}.querySelector("li[data-notice]").querySelectorAll("button")].find((x) => x.innerText.trim() === "ซื้อ 1").click()`); await sleep(350);
  ok("one bought: four coins paid, the kangkong in the bag at once", (await purse(Y)).coins === 296 && (await has(Y, "kangkong")) === 1 && /ซื้อ ผักบุ้ง 1 ชิ้น จ่าย 4 coin/.test(await said(Y)), [await purse(Y), await said(Y)]);
  await Y.evaluate(`[...${BOARD}.querySelector("li[data-notice]").querySelectorAll("button")].find((x) => /^ซื้อ \\d\\d/.test(x.innerText.trim())).click()`); await sleep(350);
  ok("…and then all that is left: the notice is gone from the board", (await has(Y, "kangkong")) === 25 && (await purse(Y)).coins === 200 && (await rows(Y)).length === 0, [await purse(Y), await rows(Y)]);
  ok("nothing is wider than its panel on a phone", await within(Y));
  await Y.shot(`${OUT}/notices-phone-bought.png`);
  await sleep(400);
  b = await told(X);
  ok("ninety coins wait at the board for the first tester, and the notice is no longer theirs to mind", b.due === 90 && b.mine.length === 0, b);
  await until("the first tester's panel says so", () => X.evaluate(`/90/.test(${BOARD}.innerText)`), 4000).catch(() => null);
  await press(X, "รับเงิน", BOARD); await sleep(350);
  ok("collected: ninety coins in the purse, nothing more waiting", (await purse(X)).coins === 90 && (await told(X)).due === 0 && /รับเงิน 90 coin/.test(await said(X)), [await purse(X), await said(X)]);
  b = await told(X);
  ok("what was sold is remembered for the board's own account of prices: twenty-five kangkong for a hundred coins today", b.sales.kangkong?.length === 1 && b.sales.kangkong[0][1] === 25 && b.sales.kangkong[0][2] === 100, b.sales);

  console.log("a notice of something wanted");
  await X.evaluate(`${BOARD}.querySelector('[data-notice-new="want"]').click()`); await sleep(250);
  let offered = await X.evaluate(`[...${BOARD}.querySelectorAll("[data-notice-pick]")].map((x) => x.dataset.noticePick)`);
  // (a trial's village is this browser: the other tester's minnows were met when they looked at the board with them in the bag)
  ok("what may be wanted is what has been met: what is in the testers' bags, what was on a notice, the uncle's shelf, and nothing more", offered.includes("kangkong") && offered.includes("can") && offered.includes("worm") && offered.includes("minnow") && !offered.includes("megaCatfish")
    && !offered.includes("carrot") && offered.length === (await told(X)).seen.length, offered);
  await tab(Y, "mine");
  await Y.evaluate(`${BOARD}.querySelector('[data-notice-new="sell"]').click()`); await sleep(200);
  await Y.evaluate(`${BOARD}.querySelector('[data-notice-pick="minnow"]').click()`); await sleep(200);
  await Y.evaluate(`${BOARD}.querySelector("[data-notice-pin]").click()`); await sleep(350);
  await press(Y, "เอาลง", BOARD); await sleep(350);
  ok("a notice taken down gives back what it held", (await has(Y, "minnow")) === 7 && (await told(Y)).mine.length === 0 && /เอาประกาศลงแล้ว/.test(await said(Y)), [await purse(Y), await said(Y)]);
  await press(X, "ยกเลิก", BOARD); await sleep(200);
  await X.evaluate(`${BOARD}.querySelector('[data-notice-new="want"]').click()`); await sleep(250);
  await X.evaluate(`(() => { const i = ${BOARD}.querySelector('input[type="search"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, "ปลาซิว"); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await sleep(250);
  offered = await X.evaluate(`[...${BOARD}.querySelectorAll("[data-notice-pick]")].map((x) => x.dataset.noticePick)`);
  ok("a thing is found by its name: of twenty-five met, the two with a minnow in their names", offered.length === 2 && offered[0] === "minnow", offered);
  await X.evaluate(`${BOARD}.querySelector('[data-notice-pick="minnow"]').click()`); await sleep(250);
  await type(X, "data-notice-n", 6);
  await type(X, "data-notice-price", 5);
  form = await X.evaluate(`${BOARD}.querySelector("[data-notice-sum]").innerText.replace(/\\s+/g, " ")`);
  ok("the coins to put down are said: thirty, of which whoever brings it gets nine tenths", /วางเงินไว้ที่กระดาน 30/.test(form) && /90%/.test(form), form);
  await X.evaluate(`${BOARD}.querySelector("[data-notice-pin]").click()`); await sleep(400);
  ok("pinned: thirty coins put down", (await purse(X)).coins === 60 && (await told(X)).mine[0]?.kind === "want", [await purse(X), (await told(X)).mine]);
  await X.shot(`${OUT}/notices-mine.png`);
  await tab(Y, "want");
  list = await rows(Y);
  ok("the other tester, who holds seven, is offered to bring one or six", list.length === 1 && /ปลาซิว ต้องการ 6/.test(list[0]) && /ส่ง 6/.test(list[0]) && /ส่ง 1/.test(list[0]), list);
  await Y.evaluate(`[...${BOARD}.querySelector("li[data-notice]").querySelectorAll("button")].find((x) => x.innerText.trim() === "ส่ง 6").click()`); await sleep(350);
  ok("six brought: out of the bag, and twenty-seven coins wait at the board", (await has(Y, "minnow")) === 1 && (await told(Y)).due === 27 && (await purse(Y)).coins === 200 && /เงินรอรับที่กระดาน/.test(await said(Y)), [await told(Y), await said(Y)]);
  await Y.shot(`${OUT}/notices-phone-wanted.png`);
  await sleep(400);
  await tab(X, "mine");
  list = await rows(X);
  ok("the writer is told six wait, and takes them: the notice is done with, and gone", list.some((r) => /รับของ 6/.test(r)), list);
  await press(X, "รับของ 6", BOARD); await sleep(350);
  ok("…six minnows in the bag", (await has(X, "minnow")) === 6 && (await told(X)).mine.length === 0 && /รับ ปลาซิว 6 ชิ้นแล้ว/.test(await said(X)), [await purse(X), await said(X)]);

  console.log("places");
  for (let i = 0; i < 3; i++) await X.evaluate(`${T}.noticePost("sell", "kangkong", 1, 3)`);
  await sleep(400);
  b = await told(X);
  ok("three notices up: no place for a fourth, and the page says so instead of offering one", b.mine.length === 3 && !(await X.evaluate(`!!${BOARD}.querySelector("[data-notice-new]")`)) && /ช่องประกาศเต็มแล้ว/.test(await X.evaluate(`${BOARD}.innerText`)), b.mine.length);
  ok("a place costs a hundred, and the purse has sixty: its button is off", await X.evaluate(`${BOARD}.querySelector("[data-notice-slot]").disabled`));
  await X.evaluate(`${T}.grant("worm", 1, 100)`); await sleep(400);
  await X.evaluate(`${BOARD}.querySelector("[data-notice-slot]").click()`); await sleep(350);
  b = await told(X);
  ok("bought: four places, the next for two hundred, and a notice can be written again", b.slots === 4 && b.more === 200 && (await purse(X)).coins === 60 && await X.evaluate(`!!${BOARD}.querySelector("[data-notice-new]")`), [b.slots, b.more, (await purse(X)).coins]);
  ok("nothing is wider than its panel", await within(X));
  await X.shot(`${OUT}/notices-places.png`);
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0, [X.logs, Y.logs]);
  await X.evaluate(`(${T}.reset(), localStorage.removeItem("cashtown.trial.notices.1"), localStorage.removeItem("cashtown.trial.seen.1"))`);
} catch (e) { ok("the run", false, e.message); await X.shot(`${OUT}/notices-died.png`).catch(() => {}); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
