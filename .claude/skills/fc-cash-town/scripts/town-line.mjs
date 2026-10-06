// Cash Town's bucket line, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by three testers in three windows of one browser, who share its well (windows, not tabs: handing water on is
// a game the two play together, lib/town/handing, and of two tabs only the one in front is drawn often enough):
//
// - one draws at the river's nearest stretch, one stands about the gate, one at the farm's well, each with a bucket;
// - with nobody near enough holding a bucket, nothing is offered; the one at the well is out of the river's reach;
// - the one by the river is offered to hand the water on to the one about the gate, by name; played by both (the
//   game itself is town-handing's to try), it is in their bucket, and they are told; they hand it on through the gate
//   to the one at the well, who pours it;
// - the well's book counts a bucketful for each of the three, lists all three among the day's carriers, and says
//   that water can be handed on;
// - whoever is nearer the well is offered first, and then the others: a chip each; a bucket known to have water is
//   not offered; with no stamina it is the same game for two, with whoever has none marked tired;
// - two side by side on the farm: the one with water is told what the other lacks (a bucket that has water, no
//   bucket in the hand, walking), and is offered them once they stand still with an empty one, though they are the
//   further from the well; and everybody's page is told whether a held bucket has water, and draws it so.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-line.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play, playTwo } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", W = "window.__townWell", L = "window.__townLine", V = "window.__townView", S = "window.__cashTown";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const chips = (X) => X.evaluate(`[...document.querySelectorAll("[data-line-chip]")].map((e) => e.innerText.trim())`);
/** What a page has heard of somebody else: what they hold, and whether it has water. */
const heldBy = (X, id) => X.evaluate(`(() => { const p = ${S}.people().find((q) => q.id === ${JSON.stringify(id)}); return p ? [p.hold, p.wet] : null; })()`);
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
/** Hand the water on, when it is offered to that tester: the game for two, played by a steady hand on both their pages. */
async function handOn(X, to, To) {
  await until("handing on is offered", async () => (await X.evaluate(`${L}.next()`)) === to, 12000);
  await X.evaluate(`${L}.act()`);
  if (!(await playTwo(X, To))) throw new Error("the game for two did not come up on both pages");
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
  const Z = await X.window("LineC");
  await enter(Z, "U");
  await Z.evaluate(`(${T}.resize(10), ${T}.grant("bucketIron", 1), ${T}.setWell(0))`);
  const c = await Z.evaluate(`${T}.id`);
  await hold(Z, "bucketIron");
  await warp(Z, ...WELL);
  await sleep(1500);
  ok("somebody at the farm's well with a bucket is too far from the river: two cannot reach", (await X.evaluate(`${L}.next()`)) === null, await X.evaluate(`${L}.next()`));

  // the second stands about the gate
  const Y = await X.window("LineB");
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
  await handOn(X, b, Y);
  await until("the water has gone over", async () => (await waterOf(Y, "bucket")) === 1, 8000);
  ok("handed on, the two having played it: the water is in the other's bucket, mine is empty, and it cost me one stamina", (await waterOf(X, "bucket")) === 0 && before - (await stamina(X)) === 1 && /ส่งน้ำ 1 ถัง/.test((await X.evaluate(`${L}.note()`)) ?? ""), await X.evaluate(`${L}.note()`));
  await until("the taker is told", () => there(Y, "[data-line-toast]"), 8000);
  ok("whoever takes it is told so on their map", /มีคนส่งน้ำมาให้/.test((await textOf(Y, "[data-line-toast]")) ?? ""), await textOf(Y, "[data-line-toast]"));
  await Y.shot(`${OUT}/line-taken.png`);
  await until("the one about the gate is offered both ways", async () => same(await Y.evaluate(`${L}.offered()`), [c, a]), 12000).catch(() => {});
  ok("the one by the river, bucket empty, is offered nothing; the one about the gate is offered the one at the well first, through the gate, and then the one by the river", (await X.evaluate(`${L}.next()`)) === null && same(await Y.evaluate(`${L}.offered()`), [c, a]), { x: await X.evaluate(`${L}.next()`), y: await Y.evaluate(`${L}.offered()`) });
  const two = await chips(Y);
  ok("…a chip for each: the first named in full, the next as another", two.length === 2 && /ส่งน้ำต่อให้/.test(two[0]) && /U/.test(two[0]) && /^หรือ/.test(two[1]) && /W/.test(two[1]), two);
  await Y.shot(`${OUT}/line-two.png`);
  await handOn(Y, c, Z);
  await until("the water is at the well", async () => (await waterOf(Z, "bucketIron")) === 1, 8000);
  ok("handed on through the gate: one bucketful in the iron bucket of the one at the well", (await waterOf(Y, "bucket")) === 0 && (await waterOf(Z, "bucketIron")) === 1);
  await until("the one at the well is offered the one about the gate", async () => (await Z.evaluate(`${L}.next()`)) === b, 12000).catch(() => {});
  ok("the one at the well may hand it to the one about the gate, whose bucket is empty now: water goes any way (the one by the river is out of reach)", same(await Z.evaluate(`${L}.offered()`), [b]), await Z.evaluate(`${L}.offered()`));
  await chore(Z, "pour");
  ok("…and pours it in", (await Z.evaluate(`${F}.well()`)) === 1 && (await waterOf(Z, "bucketIron")) === 0);

  // the book: each of the three has carried a bucketful
  await until("the book is offered", () => there(Z, "[data-well-chip]"), 8000);
  await Z.evaluate(`${W}.open()`);
  await until("the book opens", () => there(Z, "[data-well-today]"), 5000);
  const book = await Z.evaluate(`${W}.book()`);
  ok("the well's book lists all three among today's carriers, a bucketful each", book.carriers.length === 3 && book.carriers.every((p) => p.buckets === 1) && [a, b, c].every((id) => book.carriers.some((p) => p.id === id)), book.carriers);
  ok("…and says that water can be handed on, and that it counts", /ส่งต่อมือกันได้/.test((await textOf(Z, "[data-well-line]")) ?? "") && /นับถัง/.test((await textOf(Z, "[data-well-line]")) ?? ""), await textOf(Z, "[data-well-line]"));
  await Z.shot(`${OUT}/line-book.png`);
  await Z.evaluate(`${W}.close()`);
  await warp(Y, 60, 40);
  await warp(Y, ...GATE);
  const mine = await X.evaluate(`${T}.wellBook()`);
  ok("…and the one by the river, who never left it, has a bucketful towards their rank", mine.buckets === 1 && mine.today.buckets === 1, mine);

  // a bucket that has water takes none
  await chore(X, "draw");
  await handOn(X, b, Y);
  await until("the second has water again", async () => (await waterOf(Y, "bucket")) === 1, 8000);
  await chore(X, "draw");
  await until("the room has said that the second's bucket has water", async () => same(await heldBy(X, b), ["bucket", true]), 12000).catch(() => {});
  await sleep(1200);
  ok("a bucket that has water is known to have it on everybody's page, and is not offered: the water stays", same(await heldBy(X, b), ["bucket", true]) && (await X.evaluate(`${L}.next()`)) === null && !(await there(X, "[data-line-chip]")) && (await waterOf(X, "bucket")) === 1,
     { held: await heldBy(X, b), next: await X.evaluate(`${L}.next()`) });
  ok("…and from as far off as the gate nothing is said of what they lack", (await X.evaluate(`${L}.lacks()`)) === null && !(await there(X, "[data-line-lacks]")), await X.evaluate(`${L}.lacks()`));

  // tired hands
  await handOn(Y, c, Z);
  await until("the third has it", async () => (await waterOf(Z, "bucketIron")) === 1, 8000);
  await X.evaluate(`${T}.spend(500)`);
  await sleep(400);
  await until("handing on is offered to tired hands", async () => (await X.evaluate(`${L}.next()`)) === b, 12000);
  await X.evaluate(`${L}.act()`);
  await until("the board comes up on both", async () => (await gameUp(X)) === "handing" && (await gameUp(Y)) === "handing", 8000, 40).catch(() => {});
  ok("with no stamina left it is the same game for two, whoever has none marked tired on both pages, and nothing handed on yet",
     (await gameUp(X)) === "handing" && (await gameUp(Y)) === "handing" && (await X.evaluate(`${L}.match()`))?.tired.from === true && (await Y.evaluate(`${L}.match()`))?.tired.from === true && (await waterOf(X, "bucket")) === 1,
     { x: await gameUp(X), y: await gameUp(Y), match: await X.evaluate(`${L}.match()`) });
  await X.shot(`${OUT}/line-tired.png`);
  await playTwo(X, Y);
  await until("played, it goes over", async () => (await waterOf(Y, "bucket")) === 1, 8000);
  ok("…and played, the water goes over", (await waterOf(X, "bucket")) === 0);

  // Two side by side on the farm's lane, the one with water the nearer the well: what the other lacks, and then the chip.
  const NEAR = [140, 21], FAR = [138, 21], PAST = [146, 21];
  await warp(Z, ...NEAR);
  await warp(Y, ...FAR);
  const further = (await Z.evaluate(`${L}.toWell(${FAR[0]} + 0.5, ${FAR[1]} + 0.5)`)) - (await Z.evaluate(`${L}.toWell(${NEAR[0]} + 0.5, ${NEAR[1]} + 0.5)`));
  await until("the one with water is told what the other lacks", async () => (await Z.evaluate(`${L}.lacks()`))?.why === "full", 12000).catch(() => {});
  ok("beside somebody whose bucket has water: nothing to press, and it says whose bucket has water already", (await waterOf(Z, "bucketIron")) === 1 && same(await Z.evaluate(`${L}.lacks()`), { who: b, why: "full" }) && /ถังของ .*V.* มีน้ำอยู่แล้ว/.test((await textOf(Z, "[data-line-lacks]")) ?? "") && !(await there(Z, "[data-line-chip]")),
     { lacks: await Z.evaluate(`${L}.lacks()`), text: await textOf(Z, "[data-line-lacks]") });
  await Z.shot(`${OUT}/line-lacks.png`);
  await Y.evaluate(`${T}.letGo()`);
  await until("…then that they hold no bucket", async () => (await Z.evaluate(`${L}.lacks()`))?.why === "bare", 12000).catch(() => {});
  ok("beside somebody with nothing in their hand: it says they have to hold an empty bucket", same(await Z.evaluate(`${L}.lacks()`), { who: b, why: "bare" }) && /V.*ต้องถือถังเปล่าไว้ในมือ/.test((await textOf(Z, "[data-line-lacks]")) ?? ""), await textOf(Z, "[data-line-lacks]"));
  await Y.evaluate(`${T}.grant("bucketIron", 1)`);
  await hold(Y, "bucketIron");
  await until("the one beside is offered", async () => (await Z.evaluate(`${L}.next()`)) === b, 12000).catch(() => {});
  ok("with an empty bucket in their hand they are offered, though they stand the further from the well", further > 1.5 && same(await Z.evaluate(`${L}.offered()`), [b]) && (await Z.evaluate(`${L}.lacks()`)) === null && /ส่งน้ำต่อให้/.test((await chips(Z))[0] ?? ""),
     { further, offered: await Z.evaluate(`${L}.offered()`), chips: await chips(Z) });
  await Z.shot(`${OUT}/line-beside.png`);
  // walking past: not offered, and said so while they are close by
  let walking = null;
  await Y.evaluate(`${V}.walk(${PAST[0]} + 0.5, ${PAST[1]} + 0.5)`);
  for (let i = 0; i < 40 && !walking; i++) { const l = await Z.evaluate(`${L}.lacks()`); if (l?.why === "walking") walking = { ...l, chip: await there(Z, "[data-line-chip]") }; else await sleep(100); }
  ok("while they walk past they are not offered, and it says they have to stand still", same(walking, { who: b, why: "walking", chip: false }), walking);
  await until("stopped, they are offered again", async () => (await Z.evaluate(`${L}.next()`)) === b, 15000).catch(() => {});
  await handOn(Z, b, Y);
  await until("the water is in the iron bucket of the one beside", async () => (await waterOf(Y, "bucketIron")) === 1, 8000).catch(() => {});
  ok("stopped, they are offered again and the water goes over", (await waterOf(Y, "bucketIron")) === 1 && (await waterOf(Z, "bucketIron")) === 0);
  await until("everybody's page is told whose bucket has water", async () => same(await heldBy(Z, b), ["bucketIron", true]) && same(await heldBy(Y, c), ["bucketIron", false]), 12000).catch(() => {});
  ok("each page is told whose held bucket has water now and whose is empty, and its own avatar the same", same(await heldBy(Z, b), ["bucketIron", true]) && same(await heldBy(Y, c), ["bucketIron", false]) && (await Y.evaluate(`${S}.me().wet`)) === true && (await Z.evaluate(`${S}.me().wet`)) === false,
     { b: await heldBy(Z, b), c: await heldBy(Y, c), me: [await Y.evaluate(`${S}.me().wet`), await Z.evaluate(`${S}.me().wet`)] });
  await sleep(600);
  await Y.shot(`${OUT}/line-held.png`);
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/line-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
