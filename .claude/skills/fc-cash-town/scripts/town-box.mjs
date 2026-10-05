// Cash Town's storage box, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by one tester and then a second in another tab of the same browser:
//
// - away from the chest in the plaza nothing is offered; a tap on the chest walks up to it and opens it, its lid up
//   while my panel is open; standing by it a small chip offers it too;
// - opened, it has ten empty slots over what is in my bag; a tap on a thing in the bag puts all of the stack away,
//   or half of it, or one, as chosen at the panel's head; a tap on a thing in the box takes it out the same way;
// - a bucket with water in it goes in and comes out with its water;
// - a box with every slot taken is full and says so, with nothing moved; a bag with no room takes nothing out;
// - Escape shuts it and the chip is back; opening my bag shuts it; walking off takes the chip away;
// - what is put away is still there after the page is loaded again; the other tester's box is their own, and empty;
// - a box given more slots shows them; on a phone the panel fits the screen.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-box.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", B = "window.__townBox", V = "window.__townView";
const purse = (X) => X.evaluate(`${T}.purse()`);
const box = (X) => X.evaluate(`${T}.box()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const count = (slots, item) => slots.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
/** Tap the thing in the bag's part of the panel, or in the box's, by what it is. */
const pick = async (X, part, item) => {
  const did = await X.evaluate(`(() => { const b = document.querySelector('[data-box-${part}] button[data-item="${item}"]'); if (!b) return false; b.click(); return true; })()`);
  await sleep(350);
  return did;
};
const step = async (X, s) => { await X.evaluate(`document.querySelector('[data-box-step="${s}"]').click()`); await sleep(150); };
const said = (X) => textOf(X, "[data-box-said]");
const key = async (X, k, code) => {
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: code });
  await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: code });
  await sleep(300);
};
/** Tap a point of the map (counted from the map's own corner), as a finger or a mouse does. */
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the box's own code has come", () => X.evaluate(`!!${B}`), 20000);
}
/** Where the chest is on the screen, once the map has stopped moving under it. */
async function chest(X) {
  let at = null;
  await until("the chest is drawn, and still", async () => {
    const now = await X.evaluate(`${V}.storebox()`), still = !!now && !!at && Math.abs(now.x - at.x) < 0.5 && Math.abs(now.y - at.y) < 0.5;
    at = now;
    return still;
  }, 20000, 400);
  return at;
}

const BOX = [34, 34], FAR = [30, 38], BY = [35, 35], RIVER = [17, 42];
const X = await browser("Box", { width: 1280, height: 860 });
try {
  await enter(X, "S");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(400);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("kangkong", 20), ${T}.grant("minnow", 12), ${T}.grant("bucket", 1))`);

  // a bucket of water, to put away with its water in it
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === "bucket"))`);
  await warp(X, ...RIVER);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await until("drawing is offered", async () => (await X.evaluate(`${F}.chore()`)) === "draw", 8000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
  await X.evaluate(`${T}.letGo()`);
  ok("a bucket has been filled at the river", (await purse(X)).bag.some((s) => s?.item === "bucket" && s.water > 0), (await purse(X)).bag);

  // away from the chest
  await warp(X, ...FAR);
  let at = await chest(X);
  const empty = await box(X);
  ok("a box begins with ten slots, all empty", empty.things.length === 10 && empty.things.every((s) => s === null) && empty.more === 0, empty);
  ok("away from the chest nothing is offered, and its lid is down", !(await there(X, "[data-box-chip]")) && !(await there(X, "[data-box-panel]")) && at.open === false, at);
  await X.shot(`${OUT}/box-far.png`);

  // a tap on the chest: walk up to it, and it opens
  await tap(X, at.x, at.y);
  await until("its panel has come", () => there(X, "[data-box-panel]"), 20000);
  const me = await X.evaluate(`${V}.self()`);
  ok("a tap on the chest walks up to it and opens it", Math.max(Math.abs(Math.floor(me.x) - BOX[0]), Math.abs(Math.floor(me.y) - BOX[1])) === 1 && !me.moving, me);
  await sleep(300);
  ok("its lid is up while my panel is open", (await X.evaluate(`${V}.storebox()`)).open === true);
  ok("opened, it says what it is and that nothing is in it", /กล่องเก็บของ/.test(await textOf(X, "[data-box-panel]")) && /^0 \/ 10$/.test(await textOf(X, "[data-box-count]")), await textOf(X, "[data-box-count]"));
  ok("it shows ten empty slots, and my bag's ten under them", (await X.evaluate(`document.querySelectorAll("[data-box-things] li").length`)) === 10 && (await X.evaluate(`document.querySelectorAll("[data-box-bag] li").length`)) === 10
    && (await X.evaluate(`document.querySelectorAll("[data-box-things] button").length`)) === 0);
  await X.shot(`${OUT}/box-open.png`);

  // all of a stack
  await pick(X, "bag", "kangkong");
  await until("the kangkong is put away", async () => count((await box(X)).things, "kangkong") === 20, 5000);
  ok("a tap on a thing in my bag puts the whole stack away", count((await purse(X)).bag, "kangkong") === 0 && /^1 \/ 10$/.test(await textOf(X, "[data-box-count]")) && /เข้ากล่อง/.test(await said(X)), await said(X));
  // half, then one
  await step(X, "half");
  await pick(X, "bag", "minnow");
  await until("half the minnows are put away", async () => count((await box(X)).things, "minnow") === 6, 5000);
  await step(X, "one");
  await pick(X, "bag", "minnow");
  await until("one more", async () => count((await box(X)).things, "minnow") === 7, 5000);
  ok("half of a stack, then one of it, as chosen at the panel's head", count((await purse(X)).bag, "minnow") === 5 && count((await box(X)).things, "minnow") === 7, await box(X));
  await pick(X, "things", "kangkong");
  await until("one kangkong is out", async () => count((await purse(X)).bag, "kangkong") === 1, 5000);
  await step(X, "all");
  await pick(X, "things", "kangkong");
  await until("the rest is out", async () => count((await purse(X)).bag, "kangkong") === 20, 5000);
  ok("a tap on a thing in the box takes it out the same way: one, then all the rest", count((await box(X)).things, "kangkong") === 0 && /ใส่กระเป๋า/.test(await said(X)), await said(X));

  // a bucket with its water
  await pick(X, "bag", "bucket");
  await until("the bucket is put away", async () => count((await box(X)).things, "bucket") === 1, 5000);
  const wet = (await box(X)).things.find((s) => s?.item === "bucket");
  await pick(X, "things", "bucket");
  await until("the bucket is out again", async () => count((await purse(X)).bag, "bucket") === 1, 5000);
  ok("a bucket of water goes in and comes out with its water", wet.water > 0 && (await purse(X)).bag.find((s) => s?.item === "bucket").water === wet.water, wet);

  // a full box, and a full bag
  await X.evaluate(`${T}.empty()`);
  const tools = ["rod", "hoe", "can", "pot", "pan", "grill", "bowl", "bugNet", "apron"];
  await X.evaluate(`(${JSON.stringify(tools)}.forEach((t) => ${T}.grant(t, 1)))`);
  for (const t of tools) await pick(X, "bag", t);
  await until("nine tools and the minnows are in the box", async () => (await box(X)).things.filter(Boolean).length === 10, 8000);
  await X.evaluate(`${T}.grant("worm", 5)`);
  await sleep(300);
  await pick(X, "bag", "worm");
  ok("a box with every slot taken is full and says so, with nothing moved", /กล่องเต็ม/.test(await said(X)) && count((await purse(X)).bag, "worm") === 5 && /^10 \/ 10$/.test(await textOf(X, "[data-box-count]")), await said(X));
  // (what stacks onto its own kind still goes in: the minnows' slot has room for thirteen more)
  await X.evaluate(`${T}.grant("minnow", 3)`);
  await sleep(300);
  await pick(X, "bag", "minnow");
  await until("three minnows onto the seven", async () => count((await box(X)).things, "minnow") === 10, 5000);
  ok("what stacks onto its own kind there still goes in", count((await purse(X)).bag, "minnow") === 0);
  const seeds = ["seedKangkong", "seedScallion", "seedCabbage", "seedCarrot", "seedChili", "seedPumpkin", "rice", "salt", "dough"];
  await X.evaluate(`(${JSON.stringify(seeds)}.forEach((t) => ${T}.grant(t, 1)))`);
  await sleep(300);
  ok("(my bag has no slot left)", (await purse(X)).bag.every(Boolean), (await purse(X)).bag);
  await pick(X, "things", "rod");
  ok("a bag with no room takes nothing out, and says so", /กระเป๋าเต็ม/.test(await said(X)) && count((await box(X)).things, "rod") === 1 && count((await purse(X)).bag, "rod") === 0, await said(X));
  await X.shot(`${OUT}/box-full.png`);

  // shutting it
  await key(X, "Escape", 27);
  ok("Escape shuts it, and a small chip offers it again", !(await there(X, "[data-box-panel]")) && /กล่องเก็บของ/.test(await textOf(X, "[data-box-chip]")) && /10 \/ 10/.test(await textOf(X, "[data-box-chip]")), await textOf(X, "[data-box-chip]"));
  await sleep(200);
  ok("its lid is down again", (await X.evaluate(`${V}.storebox()`)).open === false);
  await X.evaluate(`document.querySelector("[data-box-chip]").click()`);
  await until("the chip opens it", () => there(X, "[data-box-panel]"), 5000);
  // my bag's own panel takes its place
  await X.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
  await until("my bag is open", () => there(X, 'section[aria-labelledby="town-trade-h"]'), 5000);
  ok("opening my bag shuts the box", !(await there(X, "[data-box-panel]")) && !(await there(X, "[data-box-chip]")));
  await X.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
  await until("the chip is back", () => there(X, "[data-box-chip]"), 5000);
  await warp(X, ...FAR);
  await until("walking off takes the chip away", async () => !(await there(X, "[data-box-chip]")), 5000);
  ok("walking off takes the chip away", !(await there(X, "[data-box-panel]")));

  // kept
  const kept = await box(X);
  await enter(X, "S");
  await warp(X, ...BY);
  await until("the chip is offered by the chest", () => there(X, "[data-box-chip]"), 10000);
  ok("what was put away is there when the page is loaded again", JSON.stringify(await box(X)) === JSON.stringify(kept) && /10 \/ 10/.test(await textOf(X, "[data-box-chip]")), await box(X));

  // somebody else's box is their own
  const Y = await X.tab("BoxB");
  await enter(Y, "R");
  await warp(Y, BY[0], BY[1] - 1);
  await until("the other is offered the chest too", () => there(Y, "[data-box-chip]"), 10000);
  const theirs = await box(Y);
  ok("the other tester's box is their own, and empty", theirs.things.every((s) => s === null) && /0 \/ 10/.test(await textOf(Y, "[data-box-chip]")) && JSON.stringify(await box(X)) === JSON.stringify(kept), theirs);
  ok("my lid going up is mine to see: theirs is down", (await Y.evaluate(`${V}.storebox()`)).open === false);

  // a box that has been given more slots
  await X.evaluate(`${T}.setBoxMore(5)`);
  await sleep(300);
  await X.evaluate(`document.querySelector("[data-box-chip]").click()`);
  await until("the panel opens", () => there(X, "[data-box-panel]"), 5000);
  ok("a box given five more slots shows fifteen", /^10 \/ 15$/.test(await textOf(X, "[data-box-count]")) && (await X.evaluate(`document.querySelectorAll("[data-box-things] li").length`)) === 15, await textOf(X, "[data-box-count]"));
  await pick(X, "bag", "seedPumpkin");
  await until("a seed goes into a new slot", async () => count((await box(X)).things, "seedPumpkin") === 1, 5000);
  ok("and the new slots take things", (await box(X)).things[10]?.item === "seedPumpkin", (await box(X)).things);
  await X.shot(`${OUT}/box-more.png`);
  ok("no page errors (wide)", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs]);

  // a phone
  // (a tester of its own: the same one in two tabs at once is two of one person in the room)
  const P = await X.tab("BoxPhone", { width: 390, height: 780, dpr: 2, mobile: true });
  await enter(P, "Q");
  await P.evaluate(`(${T}.resize(10), ${T}.grant("minnow", 12), ${T}.grant("rod", 1), ${T}.grant("kangkong", 20))`);
  await warp(P, ...BY);
  await until("the chip is offered on a phone", () => there(P, "[data-box-chip]"), 10000);
  await P.shot(`${OUT}/box-phone-chip.png`);
  await P.evaluate(`document.querySelector("[data-box-chip]").click()`);
  await until("the panel opens on a phone", () => there(P, "[data-box-panel]"), 5000);
  await sleep(400);
  const fit = await P.evaluate(`(() => { const r = document.querySelector("[data-box-panel]").getBoundingClientRect(), b = document.querySelector("[data-box-bag] button, [data-box-things] button").getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: innerWidth, h: innerHeight, slot: Math.min(b.width, b.height), wide: document.documentElement.scrollWidth }; })()`);
  ok("on a phone the panel is within the screen, nothing wider than it, and a slot is big enough for a finger", fit.left >= 0 && fit.right <= fit.w + 0.5 && fit.top >= 0 && fit.bottom <= fit.h + 0.5 && fit.wide <= fit.w && fit.slot >= 44, fit);
  await P.shot(`${OUT}/box-phone.png`);
  await pick(P, "bag", "minnow");
  await until("the minnows are put away on a phone", async () => count((await box(P)).things, "minnow") === 12, 5000);
  ok("and a tap there moves things the same", /เข้ากล่อง/.test(await said(P)) && /^1 \/ 10$/.test(await textOf(P, "[data-box-count]")), await said(P));
  await P.shot(`${OUT}/box-phone-put.png`);
  ok("no page errors (phone)", P.logs.length === 0, P.logs);
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e.message}`);
  await X.shot(`${OUT}/box-stopped.png`).catch(() => {});
} finally {
  X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
