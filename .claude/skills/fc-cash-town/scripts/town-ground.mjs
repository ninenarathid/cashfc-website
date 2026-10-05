// Cash Town's things dropped on the ground, tried in a real browser on the dev test room (the trial kept in the
// browser, `next dev` only), by two testers in two tabs of one browser, who share its ground:
//
// - the bag offers to drop anything, not only what is worth nothing; dropped, the whole stack is out of the bag and
//   lies where I stand, and the bag's own panel offers it back with the seconds it has left;
// - with the bag shut it is drawn on the map and offered to me, standing by it; the other tester sees it lie there
//   too, taps it from a few tiles off, walks up and has it; it is gone from my map and my offer with it;
// - a bucket of water is picked up with its water;
// - a bag with no room picks nothing up, and the thing lies on; from too far nothing is picked up;
// - what nobody picks up is gone after ten seconds, from both maps, and is in nobody's bag;
// - on a phone the same, from the bag's sheet.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-ground.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", G = "window.__townGround", V = "window.__townView";
const purse = (X) => X.evaluate(`${T}.purse()`);
const lying = (X) => X.evaluate(`${G}.lying()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const count = (bag, item) => bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const BAG = `document.querySelector('section[aria-labelledby="town-trade-h"]')`;
const bagButton = (X) => X.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
/** In the bag's panel: take the thing up by its name, and press the button with these words. */
const pocket = async (X, name) => {
  // (a thing taken up stays taken up while its slot holds it: tapped only when it is not)
  await X.evaluate(`(() => { const b = [...${BAG}.querySelectorAll('ul[aria-label="กระเป๋า"] button')].find((b) => b.getAttribute("aria-label").startsWith(${JSON.stringify(name)})); if (b.getAttribute("aria-pressed") !== "true") b.click(); })()`);
  await sleep(250);
};
const press = async (X, re) => {
  const did = await X.evaluate(`(() => { const b = [...${BAG}.querySelectorAll("button")].find((b) => ${re}.test(b.innerText.trim())); if (!b || b.disabled) return false; b.click(); return true; })()`);
  await sleep(350);
  return did;
};
/** Tap a point of the map (counted from the map's own corner), as a finger or a mouse does. */
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the ground's own code has come", () => X.evaluate(`!!${G}`), 20000);
}
/** Drop the thing of a kind out of my bag where I stand, by the trial's own way (the bag's buttons are tried once, above). */
const dropNow = async (X, item) => {
  const at = await X.evaluate(`${V}.self()`), did = await X.evaluate(`window.__townKeeper.groundDrop(${await slotOf(X, item)}, [${Math.floor(at.x)}, ${Math.floor(at.y)}])`);
  return did;
};

const HERE = [30, 38], OFF = [33, 38], RIVER = [17, 42];
const X = await browser("Ground", { width: 1280, height: 860 });
try {
  await enter(X, "G");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(400);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("kangkong", 12), ${T}.grant("minnow", 3), ${T}.grant("bucket", 1))`);
  // (a bucket of water, to drop with its water in it)
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === "bucket"))`);
  await warp(X, ...RIVER);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await until("drawing is offered", async () => (await X.evaluate(`${F}.chore()`)) === "draw", 8000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
  await X.evaluate(`${T}.letGo()`);
  await warp(X, ...HERE);

  const Y = await X.tab("GroundB");
  await enter(Y, "H");
  await Y.evaluate(`(${T}.reset(), ${T}.resize(10))`);
  await warp(Y, ...OFF);
  await sleep(600);
  ok("nothing lies anywhere to begin with, and nothing is offered", (await lying(X)).length === 0 && (await lying(Y)).length === 0 && !(await there(X, "[data-ground-take]")) && (await X.evaluate(`${G}.lasts`)) === 10);

  // the bag: anything can be dropped
  await bagButton(X);
  await until("my bag is open", () => there(X, 'section[aria-labelledby="town-trade-h"]'), 5000);
  await pocket(X, "ผักบุ้ง");
  ok("the bag offers to drop a thing that is worth something too", await X.evaluate(`[...${BAG}.querySelectorAll("button")].some((b) => /^ทิ้ง$/.test(b.innerText.trim()))`));
  await press(X, /^ทิ้ง$/);
  await until("the kangkong lies on the ground", async () => (await lying(X)).length === 1, 5000);
  let things = await lying(X), now = await X.evaluate(`${T}.now()`);
  const me = await X.evaluate(`${T}.id`);
  ok("dropped, the whole stack is out of my bag and lies on the tile I stand on, for ten seconds", count((await purse(X)).bag, "kangkong") === 0 && things[0].stack.item === "kangkong" && things[0].stack.n === 12
    && things[0].at[0] === HERE[0] && things[0].at[1] === HERE[1] && things[0].by === me && things[0].until - now > 8000 && things[0].until - now <= 10000, { thing: things[0], now });
  ok("the bag's own panel offers it back, with the seconds it has left", /เก็บคืน/.test(await textOf(X, "[data-bag-lying]")) && /\d/.test(await textOf(X, "[data-bag-lying]")), await textOf(X, "[data-bag-lying]"));
  await X.shot(`${OUT}/ground-bag.png`);
  await X.evaluate(`document.querySelector("[data-bag-lying] button").click()`);
  await until("it is back in my bag", async () => count((await purse(X)).bag, "kangkong") === 12, 5000);
  ok("picked back up from the bag's panel: mine again, and nothing lies", (await lying(X)).length === 0 && !(await there(X, "[data-bag-lying]")));

  // on the map, for anybody
  await pocket(X, "ผักบุ้ง");
  await press(X, /^ทิ้ง$/);
  await until("it lies again", async () => (await lying(X)).length === 1, 5000);
  await bagButton(X);
  await until("it is drawn on my map, and offered to me who stand by it", async () => (await X.evaluate(`${G}.boxes().length`)) === 1 && (await there(X, "[data-ground-take]")), 5000);
  ok("with the bag shut it is drawn on the map and offered to me, standing by it", /เก็บ ผักบุ้ง/.test(await textOf(X, "[data-ground-take]")), await textOf(X, "[data-ground-take]"));
  await X.shot(`${OUT}/ground-lying.png`);
  await until("the other sees it lie there too", async () => (await lying(Y)).length === 1 && (await Y.evaluate(`${G}.boxes().length`)) === 1, 5000);
  ok("the other tester sees it too, and is not offered it from three tiles off", !(await there(Y, "[data-ground-take]")));
  const at = (await Y.evaluate(`${G}.boxes()`))[0];
  await tap(Y, at.x, at.y);
  await until("the other has walked up and has it", async () => count((await purse(Y)).bag, "kangkong") === 12, 9000);
  const him = await Y.evaluate(`${V}.self()`);
  ok("a tap on it from a few tiles off walks up to it and picks it up", Math.max(Math.abs(Math.floor(him.x) - HERE[0]), Math.abs(Math.floor(him.y) - HERE[1])) <= 1 && /เก็บ ผักบุ้ง ×12/.test(await textOf(Y, "[data-ground-note]") ?? ""), { him, note: await textOf(Y, "[data-ground-note]") });
  await until("it is gone from my map", async () => (await lying(X)).length === 0 && (await X.evaluate(`${G}.boxes().length`)) === 0, 5000);
  ok("…and it is gone from my map, my offer with it; I have none of it", !(await there(X, "[data-ground-take]")) && count((await purse(X)).bag, "kangkong") === 0);

  // a bucket with its water; and from too far
  await warp(Y, ...OFF);
  let did = await dropNow(X, "bucket");
  await until("the bucket lies", async () => (await lying(Y)).length === 1, 5000);
  const wet = (await lying(Y))[0];
  const far = await Y.evaluate(`window.__townKeeper.groundTake(${wet.id}, [${OFF[0]}, ${OFF[1]}])`);
  ok("from three tiles off nothing is picked up", did.ok === true && far.ok === false && far.why === "far" && (await lying(Y)).length === 1, far);
  await warp(Y, HERE[0] + 1, HERE[1]);
  await until("the other is offered the bucket", () => there(Y, "[data-ground-take]"), 5000);
  await Y.evaluate(`document.querySelector("[data-ground-take]").click()`);
  await until("the other has the bucket", async () => count((await purse(Y)).bag, "bucket") === 1, 5000);
  ok("a bucket of water is picked up with its water", wet.stack.water > 0 && (await purse(Y)).bag.find((s) => s?.item === "bucket").water === wet.stack.water, wet);

  // a bag with no room
  await Y.evaluate(`(${T}.empty(), ["rod", "hoe", "can", "pot", "pan", "grill", "bowl", "bugNet", "apron", "bucket"].forEach((t) => ${T}.grant(t, 1)))`);
  did = await dropNow(X, "minnow");
  await until("the minnows lie, and the other is offered them", () => there(Y, '[data-ground-take][data-item="minnow"]'), 5000);
  await Y.evaluate(`document.querySelector('[data-ground-take][data-item="minnow"]').click()`);
  await until("the other is told their bag is full", async () => /กระเป๋าเต็ม/.test((await textOf(Y, "[data-ground-note]")) ?? ""), 4000);
  ok("a bag with no room picks nothing up, and the thing lies on", (await lying(Y)).length === 1 && count((await purse(Y)).bag, "minnow") === 0);

  // nobody picks it up
  const dropped = (await lying(X))[0];
  await X.shot(`${OUT}/ground-waiting.png`);
  await until("ten seconds on it is gone from both maps", async () => (await lying(X)).length === 0 && (await lying(Y)).length === 0 && (await X.evaluate(`${G}.boxes().length`)) === 0 && (await Y.evaluate(`${G}.boxes().length`)) === 0, 14000, 300);
  const after = await X.evaluate(`${T}.now()`);
  ok("what nobody picks up is gone after ten seconds, and not before", after >= dropped.until && after - dropped.until < 2500, { until: dropped.until, after });
  ok("…it is in nobody's bag, and nobody is offered it", count((await purse(X)).bag, "minnow") === 0 && count((await purse(Y)).bag, "minnow") === 0 && !(await there(X, "[data-ground-take]")) && !(await there(Y, "[data-ground-take]")));
  const late = await Y.evaluate(`window.__townKeeper.groundTake(${dropped.id}, [${HERE[0]}, ${HERE[1]}])`);
  ok("asked for afterwards, it is not there", late.ok === false && late.why === "lost", late);
  ok("no page errors (wide)", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs]);

  // a phone (a tester of its own: the same one in two tabs at once is two of one person in the room)
  const P = await X.tab("GroundPhone", { width: 390, height: 780, dpr: 2, mobile: true });
  await enter(P, "J");
  await P.evaluate(`(${T}.reset(), ${T}.resize(10), ${T}.grant("cabbage", 4))`);
  await warp(P, HERE[0], HERE[1] + 2);
  await bagButton(P);
  await until("the bag is open on a phone", () => there(P, 'section[aria-labelledby="town-trade-h"]'), 5000);
  await pocket(P, "ผักกาดขาว");
  await press(P, /^ทิ้ง$/);
  await until("the cabbages lie", async () => (await lying(P)).length === 1, 5000);
  await sleep(300);
  const fit = await P.evaluate(`(() => { const b = document.querySelector("[data-bag-lying] button").getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: innerWidth, h: innerHeight, tall: b.height }; })()`);
  ok("on a phone the bag's sheet offers it back, within the screen and big enough for a finger", fit.top >= 0 && fit.bottom <= fit.h && fit.left >= 0 && fit.right <= fit.w && fit.tall >= 36, fit);
  // (picked back from the sheet, and dropped again with the sheet shut: ten seconds are too few to look at one thing twice,
  // and a picture of a phone's screen takes some of them: none is taken while a thing is waited on)
  await P.evaluate(`document.querySelector("[data-bag-lying] button")?.click()`);
  await until("picked back up from the sheet", async () => count((await purse(P)).bag, "cabbage") === 4, 5000);
  // (on a phone the sheet covers the bag's own button: it is shut by its own)
  await press(P, /^ปิด$/);
  await sleep(300);
  await dropNow(P, "cabbage");
  await until("with the sheet shut it is offered on the map", () => there(P, "[data-ground-take]"), 5000);
  const chip = await P.evaluate(`(() => { const b = document.querySelector("[data-ground-take]").getBoundingClientRect(); return { left: b.left, right: b.right, bottom: b.bottom, w: innerWidth, h: innerHeight, tall: b.height }; })()`);
  await P.evaluate(`document.querySelector("[data-ground-take]")?.click()`);
  await until("picked up on a phone", async () => count((await purse(P)).bag, "cabbage") === 4, 5000);
  await P.shot(`${OUT}/ground-phone.png`);
  ok("…and what is offered on the map is within the screen, a finger's size, and picks it up", chip.left >= 0 && chip.right <= chip.w && chip.bottom <= chip.h && chip.tall >= 44 && (await lying(P)).length === 0, chip);
  ok("no page errors (phone)", P.logs.length === 0, P.logs);
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e.message}`);
  await X.shot(`${OUT}/ground-stopped.png`).catch(() => {});
} finally {
  X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
