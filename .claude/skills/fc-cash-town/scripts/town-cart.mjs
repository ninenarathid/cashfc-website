// Cash Town's water cart, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by two testers in two tabs of one browser:
//
// - at the well's second rank, with the yoke taken first, the well has a cart waiting: taken, it is in the bag;
// - held, it draws six bucketfuls at the river and pours six into the well;
// - a stretch of road walked with a bucket in the hand, then with the cart: the cart takes about twice as long;
// - with the other tester standing beside the road, the same stretch takes what a bucket takes;
// - the other tester's page moves the cart by the same rule: slow while they stand far off, as fast as anybody while
//   they stand beside it.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-cart.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", W = "window.__townWell", V = "window.__townView";
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(450); };
const has = async (X, item) => (await purse(X)).bag.reduce((t, b) => t + (b?.item === item ? b.n : 0), 0);
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const book = (X) => X.evaluate(`${W}?.book() ?? null`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
async function enter(X, letter) {
  // (a cloudy sky: nothing of the heat or the waters is meant here)
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
async function chore(X, what) {
  await until(`${what} is offered`, async () => (await X.evaluate(`${F}.chore()`)) === what, 8000);
  await X.evaluate(`${F}.act()`);
  await sleep(400);
  if (await gameUp(X)) { await play(X); await sleep(600); }
}
/**
 * A walk is begun only on a page that has just drawn. At the first frame that comes more than a second after the
 * last, `session.step` puts everybody where they were going (its old rule, for a tab come back to): on a machine
 * busy with something else, or while a second tab loads, a walk begun before such a frame was over at once (seen
 * here, with four dry runs going beside the browser). So this touches the page, as a member's tap does (a page
 * nobody touches rests at fewer frames, lib/town/pace), waits for two frames, and goes on moving the mouse while
 * it watches.
 */
const TOUCH = `window.dispatchEvent(new Event("pointermove"))`;
/** Walk to a tile and say how long it took on my own page, in milliseconds (and where I stopped). */
const walk = (X, x, y) => X.evaluate(`(async () => {
  const v = ${V}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // (touched, and two frames drawn since: the frame that ends a long gap is not the one a walk begins on)
  ${TOUCH};
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  ${TOUCH};
  await wait(80);
  const from = performance.now();
  if (!v.walk(${x} + 0.5, ${y} + 0.5)) return { ms: -1 };
  await wait(60);
  while (v.self().moving) { if (performance.now() - from > 20000) return { ms: -2 }; ${TOUCH}; await wait(10); }
  return { ms: performance.now() - from, at: v.self() };
})()`);
/** On somebody's page: how long another tester is seen walking, from their first step to their last (begin this before they are told to walk). */
const watch = (Y, id) => Y.evaluate(`(async () => {
  const v = ${V}, wait = (ms) => new Promise((r) => setTimeout(r, ms)), asked = performance.now();
  while (!v.at(${JSON.stringify(id)})?.moving) { if (performance.now() - asked > 8000) return { ms: -1 }; ${TOUCH}; await wait(10); }
  const from = performance.now();
  while (v.at(${JSON.stringify(id)})?.moving) { if (performance.now() - from > 20000) return { ms: -2 }; ${TOUCH}; await wait(10); }
  return { ms: performance.now() - from, at: v.at(${JSON.stringify(id)}) };
})()`);

const RIVER = [17, 42], WELL = [157, 23];
const X = await browser("Cart", { width: 1280, height: 860 });
try {
  await enter(X, "W");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1), ${T}.setWell(0))`);
  const a = await X.evaluate(`${T}.id`);

  // the well's second rank: the yoke first, then the cart
  await warp(X, ...WELL);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await until("the well's own code has come", () => X.evaluate(`!!${W}`), 20000);
  await X.evaluate(`${T}.setCarried(200)`);
  await sleep(400);
  let b = await book(X);
  ok("two hundred bucketfuls is the second rank, and something waits at the well", b.rank === 2 && b.gift === true, b);
  await X.evaluate(`${W}.take()`);
  await sleep(400);
  b = await book(X);
  ok("the lower rank's first: a yoke, and something waits still", (await has(X, "waterYoke")) === 1 && (await has(X, "waterCart")) === 0 && b.gift === true, b);
  await X.evaluate(`document.querySelector("[data-well-chip]").click()`);
  await until("the book opens", () => there(X, "[data-well-take]"), 5000);
  await X.shot(`${OUT}/cart-waiting.png`);
  await X.evaluate(`document.querySelector("[data-well-take]").click()`);
  await until("the cart is in the bag", async () => (await has(X, "waterCart")) === 1, 5000);
  ok("then the cart: in the bag, the book says so by name, and nothing waits any more", /รถเข็นน้ำ/.test(await textOf(X, "[data-well-note]")) && !(await there(X, "[data-well-take]")) && (await book(X)).gift === false, await textOf(X, "[data-well-note]"));
  const again = await X.evaluate(`${W}.take().then(() => ${T}.purse().bag.filter((s) => s?.item === "waterCart").length)`);
  ok("once: asked again, there is still one", again === 1, again);
  await X.evaluate(`${W}.close()`);

  // six bucketfuls a trip
  await hold(X, "waterCart");
  await warp(X, ...RIVER);
  await chore(X, "draw");
  ok("a cart drawn at the river holds six bucketfuls", (await waterOf(X, "waterCart")) === 6, (await purse(X)).bag);
  await sleep(600);
  await X.shot(`${OUT}/cart-held.png`);
  await warp(X, ...WELL);
  await chore(X, "pour");
  await until("the six are in the well", async () => (await X.evaluate(`${T}.well()`)) === 6, 5000).catch(() => {});
  b = await book(X);
  ok("…and pours six into the well: six more of mine", (await X.evaluate(`${T}.well()`)) === 6 && (await waterOf(X, "waterCart")) === 0 && b.buckets === 206, { well: await X.evaluate(`${T}.well()`), b });

  // a stretch of open road in the town: four tiles along a row, and the row beside it free for somebody to stand on
  const road = await X.evaluate(`(() => {
    const v = ${V};
    for (let y = 30; y < 50; y++) for (let x = 20; x < 50; x++) {
      let free = true;
      for (let i = -1; i <= 5 && free; i++) free = v.walkable(x + i, y) && v.walkable(x + i, y + 1) && v.walkable(x + i, y - 1);
      if (free) return { x, y };
    }
    return null;
  })()`);
  ok("there is a stretch of open road to walk", !!road, road);
  const [x0, y0] = [road.x, road.y], FROM = [x0, y0], TO = [x0 + 4, y0], BESIDE = [x0 + 2, y0 + 1], FAR = [x0 + 2, y0 + 12 < 64 ? y0 + 12 : y0 - 12];

  // (each walk is timed there and back, twice where it matters, and the quickest kept: a machine busy with something
  // else only ever lengthens one)
  const quickest = (...walks) => (walks.every((w) => w.ms > 0) ? Math.min(...walks.map((w) => w.ms)) : -1);
  const thereAndBack = async () => [await walk(X, ...TO), await walk(X, ...FROM)];

  // with a bucket in the hand, then with the cart
  await hold(X, "bucket");
  await warp(X, ...FROM);
  const plains = [...(await thereAndBack()), ...(await thereAndBack())], plain = quickest(...plains);
  ok("the stretch is walked there and back with a bucket in the hand", plain > 600 && Math.abs(plains[0].at.x - (TO[0] + 0.5)) < 0.01 && Math.abs(plains[1].at.x - (FROM[0] + 0.5)) < 0.01, plains);
  await hold(X, "waterCart");
  const alone = quickest(...(await thereAndBack()), ...(await thereAndBack()));
  ok("with the cart, alone, it takes about twice as long", alone / plain > 1.7 && alone / plain < 2.3, { plain, alone, ratio: alone / plain });

  // somebody beside the road
  const Y = await X.tab("CartB");
  await enter(Y, "V");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1))`);
  const other = await Y.evaluate(`${T}.id`);
  await hold(Y, "bucket");
  await warp(Y, ...BESIDE);
  await until("the first tester's page has the second standing beside the road", async () => {
    const who = await X.evaluate(`${V}.at(${JSON.stringify(other)})`);
    return !!who && Math.abs(who.x - (BESIDE[0] + 0.5)) < 0.01 && Math.abs(who.y - (BESIDE[1] + 0.5)) < 0.01 && !who.moving;
  }, 10000);
  const two = quickest(...(await thereAndBack()), ...(await thereAndBack()));
  ok("with somebody beside the road the cart goes as fast as anybody", two / plain > 0.8 && two / plain < 1.25, { plain, two, ratio: two / plain });
  await X.shot(`${OUT}/cart-two.png`);

  // the other page moves the cart by the same rule
  await until("the second tester's page has the first, cart in hand, at the road's end", async () => {
    const who = await Y.evaluate(`${V}.at(${JSON.stringify(a)})`);
    return !!who && Math.abs(who.x - (FROM[0] + 0.5)) < 0.01 && !who.moving;
  }, 10000);
  /** The first tester walks to a tile: how long the second tester's page saw them walk, and how long their own did. */
  const seen = async (tile) => { const seeing = watch(Y, a); await sleep(150); const mine = await walk(X, ...tile); return { theirs: await seeing, mine }; };
  const beside = [await seen(TO), await seen(FROM)];
  await warp(Y, ...FAR);
  await until("the first tester's page has the second far off", async () => {
    const who = await X.evaluate(`${V}.at(${JSON.stringify(other)})`);
    return !!who && Math.abs(who.y - (FAR[1] + 0.5)) < 0.01;
  }, 10000);
  await Y.evaluate(`${V}.lookAt(${x0 + 2}, ${y0})`);
  const gone = [await seen(TO), await seen(FROM)];
  const seenTwo = quickest(...beside.map((s) => s.theirs)), seenAlone = quickest(...gone.map((s) => s.theirs)), lone = quickest(...gone.map((s) => s.mine));
  ok("on the other tester's page the cart is as fast as anybody while they stand beside it, and half as fast when they have gone",
    seenTwo > 0 && seenAlone > 0 && seenAlone / seenTwo > 1.7 && seenAlone / seenTwo < 2.3 && lone / plain > 1.7 && lone / plain < 2.3, { seenTwo, seenAlone, lone, plain });

  // put down, it is nothing to walking
  await hold(X, "bucket");
  const after = quickest(...(await thereAndBack()));
  ok("with the cart in the bag and a bucket in the hand, nothing is slow", after / plain > 0.8 && after / plain < 1.25, { after, plain });
} catch (e) {
  ok("the run", false, String(e?.message ?? e));
} finally {
  await X.close?.();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
