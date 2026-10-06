// Cash Town's water handed on (lib/town/handing, components/town/TownHanding, TownLine), tried in a real browser on
// the dev test room (the trial kept in the browser, `next dev` only), by two testers in two windows of one browser
// (two windows, not two tabs: of two tabs only the one in front is drawn often enough to play in):
//
// - **with stamina on both sides there is no game**: the button, and the water is in the other's bucket at once
//   (printed: how long), with no board on either page;
// - the room is told who has no stamina left; **with none on either side it is a game for two**: a board on both
//   pages, each saying step by step what to press (whoever throws: wait for ready, press Throw; whoever takes:
//   press Ready, press the side the arrow shows);
// - nothing is thrown before the other is ready; a real mouse on the Ready button, on the Throw button and on a
//   side's button plays it; tired hands that throw can only while the button is lit, and a press in the dark only
//   fumbles; the water flies to a side, the arrow shows which, the bucket is put there and it is caught: the water
//   is in the other's bucket (printed: how long from the throw);
// - tired hands that take it are shown the arrow late; the wrong side is a miss: nothing handed on, nothing lost,
//   both told; steady hands still do it, and with both tired too; on a phone the board and its buttons fit;
// - Escape gives it up, and the other is told; whoever gave it up is not asked again at once; somebody with their bag
//   open is not ready;
// - where the other is not there to play (a page that asks nobody, as one built before; somebody on another page)
//   it is as it was before there was a game: the short pour of tired hands, or at once.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-handing.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameGone, gameUp, play, playTwo } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", L = "window.__townLine", G = "window.__townGame", S = "window.__cashTown";
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const waterOf = async (X, item = "bucket") => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const stamina = (X) => X.evaluate(`(() => { const p = ${T}.purse(); return p.stamina.day < 0 ? 100 : p.stamina.left; })()`);
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(900); };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const state = (X) => X.evaluate(`${G}?.kind === "handing" ? ${G}.state() : null`);
const note = (X) => X.evaluate(`${L}.note()`);
const boxOf = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return b ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; })()`);
/** A real mouse pressed on something of the page, at its middle. */
async function clickOn(X, sel) {
  const b = await boxOf(X, sel);
  if (!b) throw new Error(`nothing to press: ${sel}`);
  const at = { x: b.x + b.w / 2, y: b.y + b.h / 2, button: "left", clickCount: 1, pointerType: "mouse" };
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", ...at });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...at });
}
/** What one page has heard of somebody: whether they have no stamina left, and whether they look at another page. */
const heardOf = (X, id) => X.evaluate(`(() => { const p = ${S}.people().find((q) => q.id === ${JSON.stringify(id)}); return p ? { spent: p.spent, away: p.away } : null; })()`);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the line's own code has come", () => X.evaluate(`!!${L}`), 30000);
}
/** The button pressed on the page of whoever has the water, once the other is offered. Gives back when. */
async function ask(From, to) {
  await until("handing on is offered", async () => (await From.evaluate(`${L}.next()`)) === to, 15000, 50);
  const at = Date.now();
  await From.evaluate(`${L}.act()`);
  return at;
}
/** A board on both pages, and the other's yes heard by whoever throws (their board is up before it: from the button). */
async function bothUp(A, B) {
  await Promise.all([until("a board for whoever throws", async () => (await gameUp(A)) === "handing", 8000, 20), until("a board for whoever takes", async () => (await gameUp(B)) === "handing", 8000, 20)]);
  await until("the other's yes is heard", async () => (await A.evaluate(`${L}.match()`))?.phase === "playing", 5000, 15);
}
const bothGone = (A, B) => Promise.all([gameGone(A, 15000), gameGone(B, 15000)]);
const tags = (P) => P.evaluate(`[...document.querySelectorAll('[data-look="handing"] > span')].map((e) => !!e.querySelector("[data-handing-tired]"))`);
const steps = (P) => P.evaluate(`(() => { const o = document.querySelector("[data-handing-steps]"); return o ? { at: Number(o.dataset.handingSteps), text: [...o.querySelectorAll("li")].map((l) => l.innerText.replace(/\\s+/g, " ").trim()) } : null; })()`);

const RIVER = [42, 61], GATE = [58, 38];
const X = await browser("Handing", { width: 1280, height: 860 });
try {
  await enter(X, "W");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1))`);
  const a = await X.evaluate(`${T}.id`);
  await hold(X, "bucket");
  await warp(X, ...RIVER);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await until("drawing is offered", async () => (await X.evaluate(`${F}.chore()`)) === "draw", 8000);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  if (await gameUp(X)) { await play(X); await sleep(600); }

  const Y = await X.window("HandingB");
  await enter(Y, "V");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1))`);
  const b = await Y.evaluate(`${T}.id`);
  await warp(Y, ...GATE);
  await hold(Y, "bucket");

  // ── with stamina on both sides: no game ──
  const before = await stamina(X);
  let pressed = await ask(X, b);
  await until("the water has gone over", async () => (await waterOf(Y)) === 1, 8000, 25);
  const atOnce = Date.now() - pressed;
  ok("with stamina on both sides there is no game: the button, and the water is in the other's bucket at once, for one stamina",
     (await waterOf(X)) === 0 && before - (await stamina(X)) === 1 && atOnce < 1500 && (await gameUp(X)) === null && (await gameUp(Y)) === null && !(await there(X, "[data-town-game]")) && !(await there(Y, "[data-town-game]")),
     { atOnce, x: await gameUp(X), y: await gameUp(Y) });
  console.log(`       (with stamina, button to water handed on: ${atOnce} ms)`);
  await until("the taker is told", () => there(Y, "[data-line-toast]"), 8000).catch(() => {});
  ok("…and whoever took it is told so on their map", /มีคนส่งน้ำมาให้/.test((await textOf(Y, "[data-line-toast]")) ?? ""), await textOf(Y, "[data-line-toast]"));

  // ── tired hands that throw: a game for two ──
  await Y.evaluate(`${T}.spend(500)`);
  await until("the room is told who has no stamina left", async () => (await heardOf(X, b))?.spent === true, 12000, 100).catch(() => {});
  ok("the room is told who has no stamina left, and who has", (await heardOf(X, b))?.spent === true && (await heardOf(Y, a))?.spent === false, [await heardOf(X, b), await heardOf(Y, a)]);
  await sleep(600);
  pressed = await ask(Y, a);
  const first = await until("the thrower's board", async () => (await gameUp(Y)) === "handing", 1500, 8).then(() => Date.now() - pressed).catch(() => null);
  await bothUp(Y, X);
  const [my, mx] = [await Y.evaluate(`${L}.match()`), await X.evaluate(`${L}.match()`)];
  ok("with no stamina on one side it is a game for two: the button puts a board up at once for whoever throws, and one comes up on the other's page by itself",
     first !== null && first < 400 && my?.role === "from" && my.with === a && mx?.role === "to" && mx.with === b && [my, mx].every((m) => m.tired.from === true && m.tired.to === false), { first, my, mx });
  const [ty, tx] = [await tags(Y), await tags(X)];
  ok("…and only the tired side is marked so, on both boards", ty.length === 2 && tx.length === 2 && ty[0] === true && ty[1] === false && tx[0] === true && tx[1] === false, { ty, tx });
  const [sy, sx] = [await steps(Y), await steps(X)];
  ok("each board says how it is played, in two steps, the first one lit: whoever throws waits for ready and presses Throw; whoever takes presses Ready and then the side the arrow shows",
     sy?.at === 0 && sx?.at === 0 && /รอเพื่อน/.test(sy.text[0]) && /สาด/.test(sy.text[1]) && /พร้อมรับ/.test(sx.text[0]) && /ลูกศร.*กดทางนั้น/.test(sx.text[1])
     && /กดสาดได้เฉพาะตอนปุ่มสว่าง/.test((await textOf(Y, "[data-handing-weary]")) ?? "") && !(await there(X, "[data-handing-weary]")), { sy, sx });
  await Promise.all([Y.shot(`${OUT}/handing-wait-throw.png`), X.shot(`${OUT}/handing-wait-take.png`)]);
  // nothing is thrown before the other is ready
  await clickOn(Y, "[data-handing-throw]");
  await sleep(150);
  ok("nothing is thrown at somebody who has not said ready: the Throw button does nothing yet, and the board says whom it waits for",
     (await state(Y))?.flew === null && (await state(Y))?.phase === "wait" && /รอ .*V|รอ .*W|รอ /.test((await textOf(Y, "[data-handing-word]")) ?? "") && (await waterOf(Y)) === 1, [await state(Y), await textOf(Y, "[data-handing-word]")]);
  // ready: a real mouse on the button
  await clickOn(X, "[data-handing-ready]");
  await until("the thrower hears ready", async () => (await state(Y))?.phase === "ready", 4000, 15);
  ok("a press on Ready: whoever takes is ready, whoever throws is told, and the second step is lit on both boards",
     (await state(X))?.ready === true && (await state(Y))?.ready === true && (await steps(Y))?.at === 1 && (await steps(X))?.at === 1 && !(await there(X, "[data-handing-ready]")) && (await there(X, '[data-handing-side="-1"]')) && (await there(X, '[data-handing-side="1"]')),
     [await state(X), await steps(Y), await steps(X)]);
  // tired hands that throw: only while the button is lit; a press in the dark only fumbles
  await until("the button is dark", async () => (await state(Y))?.lit === false, 3000, 10);
  await clickOn(Y, "[data-handing-throw]");
  const dark = await state(Y);
  ok("tired hands that throw: a press while the button is dark only fumbles for a moment, and nothing is thrown", dark?.flew === null && dark.fumbling === true && (await waterOf(Y)) === 1, dark);
  // (the button itself says when: it is lit while the bucket swings forward, and only just lit when it is pressed here)
  await until("the button is dark again", () => there(Y, '[data-handing-throw="dark"]'), 4000, 8);
  const lit = await until("the button is lit", () => there(Y, '[data-handing-throw="lit"]'), 4000, 6).then(() => true).catch(() => false);
  const thrown = Date.now();
  await clickOn(Y, "[data-handing-throw]");
  await until("it flies on both pages", async () => (await state(Y))?.flew !== null && (await state(X))?.flew !== null, 3000, 10);
  const fly = await state(X);
  ok("…and a press while it is lit throws it: the water flies on both pages, and whoever takes it (with stamina) is shown which way at once",
     lit && fly?.phase === "flight" && fly.shown === true && (fly.side === -1 || fly.side === 1) && fly.side === (await state(Y))?.side, fly);
  await Promise.all([Y.shot(`${OUT}/handing-fly-throw.png`), X.shot(`${OUT}/handing-fly-take.png`)]);
  ok("…the button of that side is the one that is lit up", (await X.evaluate(`document.querySelector('[data-go="true"]')?.dataset.handingSide ?? null`)) === String(fly.side), fly.side);
  await clickOn(X, `[data-handing-side="${fly.side}"]`);
  await until("the thrower sees the bucket go there", async () => { const s = await state(Y); return !s || s.put === fly.side; }, 2000, 10).catch(() => {});
  const seen = await state(Y);
  await until("it is over", async () => (await waterOf(X)) === 1, 6000, 20);
  const took = Date.now() - thrown;
  ok("a press on that side puts the bucket there (the other page sees it go), and it is caught: the water is in the other's bucket", (seen === null || seen.put === fly.side) && (await waterOf(X)) === 1 && (await waterOf(Y)) === 0 && /ส่งน้ำ 1 ถัง/.test((await note(Y)) ?? ""), { seen, note: await note(Y) });
  console.log(`       (the game, from the throw to the water handed on: ${took} ms)`);
  ok("…in under two seconds from the throw, and both boards are gone a moment later", took < 2000 && (await bothGone(Y, X)) && !(await there(X, "[data-town-game]")) && !(await there(Y, "[data-town-game]")), took);

  // ── tired hands that take it ──
  await sleep(700);
  await ask(X, b);
  await bothUp(X, Y);
  const late = [await X.evaluate(`${L}.match()`), await Y.evaluate(`${L}.match()`)];
  ok("with no stamina on the taker's side it is the game too, and it is the taker who is marked tired and told so", late.every((m) => m?.tired.from === false && m.tired.to === true)
     && /ลูกศรจะขึ้นช้า/.test((await textOf(Y, "[data-handing-weary]")) ?? "") && !(await there(X, "[data-handing-weary]")), late);
  await clickOn(Y, "[data-handing-ready]");
  await until("the thrower hears ready", async () => (await state(X))?.phase === "ready", 4000, 15);
  ok("whoever throws with stamina may throw as soon as the other is ready: the button is lit and stays lit", (await state(X))?.lit === true && (await sleep(700), (await state(X))?.lit === true));
  await clickOn(X, "[data-handing-throw]");
  await until("it flies for the taker", async () => (await state(Y))?.flew !== null, 3000, 8);
  const early = await state(Y);
  await until("the arrow shows", async () => { const s = await state(Y); return !s || s.shown === true; }, 3000, 8);
  const shownAt = (await state(Y))?.flew ?? null;
  ok("tired hands that take it are shown which way only late in its flight", early?.shown === false && early.flew < 0.3 && shownAt !== null && shownAt >= 0.4, { early, shownAt });
  // the wrong side on purpose
  const wrong = -early.side;
  await clickOn(Y, `[data-handing-side="${wrong}"]`);
  await bothGone(X, Y);
  await sleep(500);
  ok("the wrong side is a miss: nothing is handed on, the water is still the thrower's, and both are told", (await waterOf(X)) === 1 && (await waterOf(Y)) === 0 && /รับน้ำไม่ทัน/.test((await note(X)) ?? "") && /รับน้ำไม่ทัน/.test((await note(Y)) ?? ""), [await note(X), await note(Y)]);
  await sleep(700);
  await ask(X, b);
  await playTwo(X, Y);
  await until("it goes over to tired hands", async () => (await waterOf(Y)) === 1, 8000, 50).catch(() => {});
  ok("a steady hand still does it: the water is in the tired one's bucket", (await waterOf(Y)) === 1 && (await waterOf(X)) === 0, await note(X));

  // ── both tired, on a phone ──
  await X.evaluate(`${T}.spend(500)`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  await until("the room is told", async () => (await heardOf(Y, a))?.spent === true, 12000, 100).catch(() => {});
  await sleep(2000);
  await ask(Y, a);
  await bothUp(Y, X);
  const both = await Y.evaluate(`${L}.match()`), marks = [await tags(Y), await tags(X)];
  const [board, ready, wide, tall] = [await boxOf(X, "[data-town-game]"), await boxOf(X, "[data-handing-ready]"), await X.evaluate("innerWidth"), await X.evaluate("innerHeight")];
  await X.shot(`${OUT}/handing-phone.png`);
  ok("with none on either side both are marked tired, on both boards", both?.tired.from === true && both.tired.to === true && marks.every((t) => t.length === 2 && t.every(Boolean)), { both, marks });
  ok("on a phone the board is within the screen, and its button is as wide as the board and a finger high", !!board && board.x >= 0 && board.x + board.w <= wide + 0.5 && board.y >= 0 && board.y + board.h <= tall + 0.5 && !!ready && ready.w > 280 && ready.h >= 44, { board, ready, wide, tall });
  await Promise.all([Y.evaluate(`${G}.auto(true)`), X.evaluate(`${G}.auto(true)`)]);
  await bothGone(Y, X);
  await until("it goes over between tired hands", async () => (await waterOf(X)) === 1, 8000, 50).catch(() => {});
  ok("…and two steady pairs of tired hands still hand it over", (await waterOf(X)) === 1 && (await waterOf(Y)) === 0, [await note(Y), await note(X)]);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });

  // ── given up; not ready ──
  await sleep(2600);
  await ask(X, b);
  await bothUp(X, Y);
  await Y.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await Y.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await bothGone(X, Y);
  ok("Escape gives it up: the board is gone from both, the other is told, and the water stays", /เลิกกลางคัน/.test((await note(X)) ?? "") && (await waterOf(X)) === 1 && (await waterOf(Y)) === 0, await note(X));
  // (whoever gave it up is not asked again at once: a board is not to come up over and over on a page that does not want it)
  await sleep(2900);
  await ask(X, b);
  await until("the thrower is told", async () => /ยังไม่พร้อม/.test((await note(X)) ?? ""), 6000, 50).catch(() => {});
  ok("asked again at once, whoever gave it up is not ready yet: no board comes up on their page, and the thrower's is gone", /ยังไม่พร้อม/.test((await note(X)) ?? "") && (await gameUp(X)) === null && (await gameUp(Y)) === null, await note(X));
  await sleep(8500);
  await Y.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
  await until("the taker's bag is open", () => there(Y, 'section[aria-labelledby="town-trade-h"]'), 5000);
  await ask(X, b);
  await until("the thrower is told", async () => /ยังไม่พร้อม/.test((await note(X)) ?? ""), 6000, 50).catch(() => {});
  ok("somebody with their bag open is not ready: the thrower is told, and no board stays up", /ยังไม่พร้อม/.test((await note(X)) ?? "") && (await gameUp(X)) === null && (await gameUp(Y)) === null, await note(X));
  await Y.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
  await sleep(600);

  // ── the other not there to play: as it was before there was a game ──
  await X.evaluate(`${L}.mute(true)`);
  await sleep(2400);
  await ask(X, b);
  await sleep(350);
  ok("asked, and no answer yet: the thrower's board is up and says who is being called, and nothing is handed on",
     /กำลังเรียก/.test((await textOf(X, "[data-handing-word]")) ?? "") && (await state(X))?.waiting === true && (await waterOf(X)) === 1, [await textOf(X, "[data-handing-word]"), await state(X)]);
  await until("with no answer, tired hands pour as they did", async () => (await gameUp(X)) === "pouring", 6000, 50).catch(() => {});
  ok("no answer from the other page (one built before this was a game): tired hands have the short pour they had, alone", (await gameUp(X)) === "pouring" && (await gameUp(Y)) === null, await gameUp(X));
  await play(X);
  await until("it goes over", async () => (await waterOf(Y)) === 1, 8000).catch(() => {});
  ok("…and played, the water goes over", (await waterOf(Y)) === 1 && (await waterOf(X)) === 0);
  // whoever has the water has stamina, the other none, and does not answer: at once
  await Y.evaluate(`(${T}.setStamina(100), ${L}.mute(true))`);
  await until("the room is told", async () => (await heardOf(X, b))?.spent === false, 12000, 100).catch(() => {});
  await sleep(2400);
  const t0 = await ask(Y, a);
  await until("with no answer and stamina, it goes over as it did", async () => (await waterOf(X)) === 1, 8000, 50).catch(() => {});
  ok("…and whoever has stamina, with a tired taker who does not answer, hands it on at once a moment after nobody answered", (await waterOf(X)) === 1 && Date.now() - t0 > 1700 && (await gameUp(Y)) === null, Date.now() - t0);
  await Y.evaluate(`${L}.mute(false)`);
  await X.evaluate(`${L}.mute(false)`);

  // somebody looking at another page of the site (gone there by a link: the stay goes with them, bucket in hand): handed water all the same, with no game
  await Y.evaluate(`document.querySelector('a[href="/members"]').click()`);
  await until("the room says the other is on another page", async () => (await heardOf(X, b))?.away === true, 60000).catch(() => {});
  await sleep(1200);
  await ask(X, b);
  await until("tired hands pour at once", async () => (await gameUp(X)) === "pouring", 1500, 30).catch(() => {});
  ok("somebody looking at another page is still handed water, with no game for two and nothing waited for: tired hands have their short pour at once",
     (await heardOf(X, b))?.away === true && (await gameUp(X)) === "pouring", { heard: await heardOf(X, b), up: await gameUp(X) });
  await play(X);
  await until("it goes over", async () => (await waterOf(X)) === 0, 8000).catch(() => {});
  ok("…and the water goes over", (await waterOf(X)) === 0);
  ok("no page had an error", [...X.logs, ...Y.logs].length === 0, [...X.logs, ...Y.logs].slice(0, 5));
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/handing-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
