// Cash Town's bucket line, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by three testers in three tabs of one browser, who share its well:
//
// - one draws at the river's nearest stretch, one stands about the gate, one at the farm's well, each with a bucket;
// - with nobody near enough holding a bucket, nothing is offered; the one at the well is out of the river's reach;
// - the one by the river is offered to hand the water on to the one about the gate, by name; it is in their bucket
//   at once, and they are told; they hand it on through the gate to the one at the well, who pours it;
// - the well's book counts a bucketful for each of the three, and lists all three among the day's carriers;
// - water goes forward, never back; a bucket that has water takes none; with no stamina it is the short game.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-line.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", W = "window.__townWell", L = "window.__townLine";
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const stamina = (X) => X.evaluate(`(() => { const p = ${T}.purse(); return p.stamina.day < 0 ? 100 : p.stamina.left; })()`);
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(900); };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the line's own code has come", () => X.evaluate(`!!${L}`), 30000);
}
async function chore(X, what) {
  await until(`${what} is offered`, async () => (await X.evaluate(`${F}.chore()`)) === what, 8000);
  await X.evaluate(`${F}.act()`);
  await sleep(400);
  if (await gameUp(X)) { await play(X); await sleep(600); }
}
/** Hand the water on, when it is offered to that tester. */
async function handOn(X, to) {
  await until("handing on is offered", async () => (await X.evaluate(`${L}.next()`)) === to, 12000);
  await X.evaluate(`${L}.act()`);
  await sleep(500);
}

// the river's nearest stretch to the gate; a place about the gate; beside the farm's well
const RIVER = [42, 61], GATE = [58, 38], WELL = [157, 23];
const X = await browser("Line", { width: 1280, height: 860 });
try {
  await enter(X, "W");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1))`);
  const a = await X.evaluate(`${T}.id`);
  await hold(X, "bucket");
  await warp(X, ...RIVER);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await chore(X, "draw");
  ok("a bucket drawn at the river, and nobody about: nothing to hand it on to", (await waterOf(X, "bucket")) === 1 && (await X.evaluate(`${L}.can()`)) === true && (await X.evaluate(`${L}.next()`)) === null && !(await there(X, "[data-line-chip]")));

  // the third stands at the well: out of the river's reach
  const Z = await X.tab("LineC");
  await enter(Z, "U");
  await Z.evaluate(`(${T}.resize(10), ${T}.grant("bucketIron", 1), ${T}.setWell(0))`);
  const c = await Z.evaluate(`${T}.id`);
  await hold(Z, "bucketIron");
  await warp(Z, ...WELL);
  await sleep(1500);
  ok("somebody at the farm's well with a bucket is too far from the river: two cannot reach", (await X.evaluate(`${L}.next()`)) === null, await X.evaluate(`${L}.next()`));

  // the second stands about the gate
  const Y = await X.tab("LineB");
  await enter(Y, "V");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1))`);
  const b = await Y.evaluate(`${T}.id`);
  await warp(Y, ...GATE);
  await sleep(1500);
  ok("somebody about the gate with nothing in their hand is nobody to hand it to", (await X.evaluate(`${L}.next()`)) === null);
  await hold(Y, "bucket");
  await until("the one by the river is offered the one about the gate", async () => (await X.evaluate(`${L}.next()`)) === b, 12000);
  ok("with a bucket in their hand, the one by the river is offered to hand the water on to them, by name", /ส่งน้ำต่อให้/.test((await textOf(X, "[data-line-chip]")) ?? "") && /V/.test((await textOf(X, "[data-line-chip]")) ?? ""), await textOf(X, "[data-line-chip]"));
  ok("the one about the gate, with an empty bucket, is offered nothing", (await Y.evaluate(`${L}.can()`)) === false && !(await there(Y, "[data-line-chip]")));
  await X.shot(`${OUT}/line-offer.png`);
  const before = await stamina(X);
  await handOn(X, b);
  await until("the water has gone over", async () => (await waterOf(Y, "bucket")) === 1, 8000);
  ok("handed on: the water is in the other's bucket at once, mine is empty, and it cost me one stamina", (await waterOf(X, "bucket")) === 0 && before - (await stamina(X)) === 1 && /ส่งน้ำ 1 ถัง/.test((await X.evaluate(`${L}.note()`)) ?? ""), await X.evaluate(`${L}.note()`));
  await until("the taker is told", () => there(Y, "[data-line-toast]"), 8000);
  ok("whoever takes it is told so on their map", /มีคนส่งน้ำมาให้/.test((await textOf(Y, "[data-line-toast]")) ?? ""), await textOf(Y, "[data-line-toast]"));
  await Y.shot(`${OUT}/line-taken.png`);
  ok("water goes forward: the one by the river, bucket empty, is offered nothing; the one about the gate is offered the one at the well, through the gate", (await X.evaluate(`${L}.next()`)) === null && (await Y.evaluate(`${L}.next()`)) === c, { x: await X.evaluate(`${L}.next()`), y: await Y.evaluate(`${L}.next()`) });
  await handOn(Y, c);
  await until("the water is at the well", async () => (await waterOf(Z, "bucketIron")) === 1, 8000);
  ok("handed on through the gate: one bucketful in the iron bucket of the one at the well", (await waterOf(Y, "bucket")) === 0 && (await waterOf(Z, "bucketIron")) === 1);
  ok("the one at the well is offered nobody: nobody is nearer the well", (await Z.evaluate(`${L}.next()`)) === null);
  await chore(Z, "pour");
  ok("…and pours it in", (await Z.evaluate(`${F}.well()`)) === 1 && (await waterOf(Z, "bucketIron")) === 0);

  // the book: each of the three has carried a bucketful
  await until("the book is offered", () => there(Z, "[data-well-chip]"), 8000);
  await Z.evaluate(`${W}.open()`);
  await until("the book opens", () => there(Z, "[data-well-today]"), 5000);
  const book = await Z.evaluate(`${W}.book()`);
  ok("the well's book lists all three among today's carriers, a bucketful each", book.carriers.length === 3 && book.carriers.every((p) => p.buckets === 1) && [a, b, c].every((id) => book.carriers.some((p) => p.id === id)), book.carriers);
  await Z.shot(`${OUT}/line-book.png`);
  await Z.evaluate(`${W}.close()`);
  await warp(Y, 60, 40);
  await warp(Y, ...GATE);
  const mine = await X.evaluate(`${T}.wellBook()`);
  ok("…and the one by the river, who never left it, has a bucketful towards their rank", mine.buckets === 1 && mine.today.buckets === 1, mine);

  // a bucket that has water takes none
  await chore(X, "draw");
  await handOn(X, b);
  await until("the second has water again", async () => (await waterOf(Y, "bucket")) === 1, 8000);
  await chore(X, "draw");
  await until("handing on is offered again", async () => (await X.evaluate(`${L}.next()`)) === b, 12000);
  await X.evaluate(`${L}.act()`);
  await sleep(700);
  ok("into a bucket that has water already nothing is handed: said, and the water stays", (await waterOf(X, "bucket")) === 1 && /มีน้ำอยู่แล้ว/.test((await X.evaluate(`${L}.note()`)) ?? ""), await X.evaluate(`${L}.note()`));

  // tired hands
  await handOn(Y, c);
  await until("the third has it", async () => (await waterOf(Z, "bucketIron")) === 1, 8000);
  await X.evaluate(`${T}.spend(500)`);
  await sleep(400);
  await until("handing on is offered to tired hands", async () => (await X.evaluate(`${L}.next()`)) === b, 12000);
  await X.evaluate(`${L}.act()`);
  await sleep(500);
  ok("with no stamina left handing on is the short game of pouring", (await gameUp(X)) === "pouring" && (await waterOf(X, "bucket")) === 1, await gameUp(X));
  await X.shot(`${OUT}/line-tired.png`);
  await play(X);
  await until("played, it goes over", async () => (await waterOf(Y, "bucket")) === 1, 8000);
  ok("…and played, the water goes over", (await waterOf(X, "bucket")) === 0);
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/line-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
