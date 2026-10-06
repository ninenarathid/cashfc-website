// Cash Town's water handed on as a game for two (lib/town/handing, components/town/TownHanding), tried in a real
// browser on the dev test room (the trial kept in the browser, `next dev` only), by two testers in two windows of
// one browser (two windows, not two tabs: of two tabs only the one in front is drawn often enough to play in):
//
// - one draws a bucket at the river, the other stands about the gate with an empty one; the button puts the board up
//   at once on the page of whoever throws and asks the other's, where it comes up by itself;
// - a real mouse moved up and down tips the one bucket, and the water is aimed as far as that; both pages have the
//   same moment; the aim is fixed after half a second and told to the other page before the water flies;
// - the water comes down beside where it was aimed; a steady hand gets the bucket under it: the water is in the
//   other's bucket, for one stamina of whoever threw, and both boards are gone;
// - **from the button to the water handed on is about two seconds** (the owner: "ต้องทำให้ minigame จบเร็วที่สุด เพราะถ้าช้า
//   ผู้เล่นจะคิดว่า วิ่งส่งเอาเองเร็วกว่า", then "อาจจะต้องเร็วกว่านี้ … เป็นการเน้น reaction เร็วๆ"): printed, and over three and a
//   half fails;
// - a real mouse moved along the picture slides the other bucket; one that is not under the water takes none:
//   nothing is handed on, nothing is lost, and both are told;
// - Escape gives it up, and the other is told; whoever gave it up is not asked again at once; somebody with their bag
//   open is not ready, and whoever throws is told;
// - with no stamina it is harder for whoever has none: only their side says so, only their bucket wanders from a
//   hand held still; a steady hand still does it, and with both tired too;
// - a page that asks nobody (as one built before this was a game): after a moment the water goes over as it always
//   did, at once, or by the short pour of tired hands;
// - on a phone the board is within the screen; somebody looking at another page is not offered.
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
/** A real mouse moved to a place on the game's picture, as shares of its width and height. */
async function mouseOn(X, sx, sy) {
  const b = await boxOf(X, '[data-look="handing"]');
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: b.x + b.w * sx, y: b.y + b.h * sy, pointerType: "mouse" });
}
/** Where up the picture a mouse tips the bucket to a tilt, and where along it a mouse puts the other bucket at a place on the ground. */
const upFor = (tilt) => 1 - (tilt + 0.4) / 1.8, alongFor = (place) => (62 + place * 86) / 180;
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the line's own code has come", () => X.evaluate(`!!${L}`), 30000);
}
/** The button pressed on the page of whoever has the water, once the other is offered. */
async function ask(From, to) {
  await until("handing on is offered", async () => (await From.evaluate(`${L}.next()`)) === to, 15000, 50);
  await From.evaluate(`${L}.act()`);
}
/** A board on both pages, and the other's yes heard by whoever throws (their board is up before it: from the button). */
async function bothUp(A, B) {
  await Promise.all([until("a board for whoever throws", async () => (await gameUp(A)) === "handing", 8000, 20), until("a board for whoever takes", async () => (await gameUp(B)) === "handing", 8000, 20)]);
  await until("the other's yes is heard", async () => (await A.evaluate(`${L}.match()`))?.phase === "playing", 5000, 15);
}
const bothGone = (A, B) => Promise.all([gameGone(A, 15000), gameGone(B, 15000)]);

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

  // ── asked, and a board on both ──
  const before = await stamina(X);
  await until("handing on is offered", async () => (await X.evaluate(`${L}.next()`)) === b, 15000, 50);
  const pressed = Date.now();
  await X.evaluate(`${L}.act()`);
  const first = await until("the thrower's board", async () => (await gameUp(X)) === "handing", 1500, 8).then(() => Date.now() - pressed).catch(() => null);
  await bothUp(X, Y);
  await Y.evaluate(`${G}.auto(true)`);
  // a real mouse moved up over the picture tips the bucket: so far that the water is aimed at where the other's stands
  const place = (await state(X)).place, tilt = 0.15 + 0.45 * place;
  await mouseOn(X, 0.5, upFor(tilt));
  const [mx, my] = [await X.evaluate(`${L}.match()`), await Y.evaluate(`${L}.match()`)];
  ok("the button puts the board up at once on the page of whoever throws, and it comes up on the other's by itself: the one throws, the other takes",
     first !== null && first < 400 && mx?.role === "from" && mx.with === b && mx.phase === "playing" && my?.role === "to" && my.with === a && my.phase === "playing", { first, mx, my });
  await until("the bucket is tipped", async () => { const s = await state(X); return !s || Math.abs(s.tilt - tilt) < 0.04; }, 800, 12).catch(() => {});
  ok("…each with its own word of what the hand does, and the other's name on the other's bucket",
     /เล็ง/.test((await textOf(X, "[data-town-game]")) ?? "") && /รีบลากถัง/.test((await textOf(Y, "[data-town-game]")) ?? "") && /V/.test((await textOf(X, '[data-look="handing"]')) ?? "") && /W/.test((await textOf(Y, '[data-look="handing"]')) ?? "")
     && /คุณ/.test((await textOf(X, '[data-look="handing"]')) ?? ""), [await textOf(X, "[data-town-game]"), await textOf(Y, "[data-town-game]")]);
  const [sx, sy] = [await state(X), await state(Y)];
  ok("a mouse moved up over the picture tips the bucket as far as that, and the water is aimed at the other's bucket", !!sx && Math.abs(sx.tilt - tilt) < 0.05 && Math.abs(sx.aim - place) < 0.1 && Math.abs(sy.place - place) < 1e-9, { tilt, place, sx });
  ok("both pages have the same moment", !!sx && !!sy && Math.abs(sx.t - sy.t) < 0.25, [sx?.t, sy?.t]);
  // in the air: the aim was fixed and told, and it comes down beside where it was aimed
  await until("the water flies", async () => { const s = await state(X); return !s || s.t > 0.82; }, 5000, 15);
  const fly = [await state(X), await state(Y)];
  await Promise.all([X.shot(`${OUT}/handing-throw.png`), Y.shot(`${OUT}/handing-catch.png`)]);
  ok("the aim is fixed before the water flies, and the other page has it: both have the water coming down in the same place, beside where it was aimed",
     !!fly[0] && !!fly[1] && Math.abs(fly[0].thrown - place) < 0.1 && Math.abs(fly[0].thrown - fly[1].thrown) < 0.005 && Math.abs(fly[0].landing - fly[1].landing) < 0.005 && Math.abs(fly[0].landing - fly[0].thrown) >= 0.2 - 1e-6,
     fly.map((s) => s && { t: s.t, thrown: s.thrown, landing: s.landing }));
  ok("…and the chips are gone while it is played", !(await there(X, "[data-line-chip]")));
  await bothGone(X, Y);
  await until("the water has gone over", async () => (await waterOf(Y)) === 1, 8000, 50);
  ok("a steady hand got the bucket under it: the water is in the other's bucket, mine is empty, and it cost me one stamina",
     (await waterOf(X)) === 0 && (await waterOf(Y)) === 1 && before - (await stamina(X)) === 1 && /ส่งน้ำ 1 ถัง/.test((await note(X)) ?? ""), { note: await note(X), spent: before - (await stamina(X)) });
  ok("…and both boards are gone", Date.now() - pressed < 8000 && !(await there(X, "[data-town-game]")) && !(await there(Y, "[data-town-game]")), Date.now() - pressed);
  await until("the taker is told", () => there(Y, "[data-line-toast]"), 8000).catch(() => {});
  ok("whoever took it is told so on their map", /มีคนส่งน้ำมาให้/.test((await textOf(Y, "[data-line-toast]")) ?? ""), await textOf(Y, "[data-line-toast]"));

  // ── how long it takes ──
  // (there and back again, each played by a steady hand from the moment its board is up: the button, the asking,
  // the aim, the swing, the flight, and the handing on)
  const took = [];
  for (const [From, To, to] of [[Y, X, a], [X, Y, b]]) {
    await sleep(700);
    await until("handing on is offered", async () => (await From.evaluate(`${L}.next()`)) === to, 15000, 50);
    const from = Date.now();
    await From.evaluate(`${L}.act()`);
    await Promise.all([playTwo(From, To), until("the water is over", async () => (await waterOf(To)) === 1, 12000, 25).then(() => took.push(Date.now() - from))]);
  }
  ok("from the button to the water in the other's bucket is about two seconds: far quicker than walking it", took.length === 2 && took.every((ms) => ms < 3500), took);
  console.log(`       (button to water handed on: ${took.join(" ms, ")} ms)`);

  // ── a bucket that is not under it ──
  const was = await stamina(Y);
  await sleep(700);
  await ask(Y, a);
  await bothUp(Y, X);
  const up = Date.now();
  // (a real mouse moved along the picture slides the taker's bucket: to its far end, and left there)
  await mouseOn(X, alongFor(1.3), 0.5);
  await Y.evaluate(`${G}.auto(true)`);
  await sleep(350);
  const far = await state(X);
  ok("a mouse moved along the picture slides the other's bucket there", !!far && far.x > 0.97, far?.x);
  await bothGone(Y, X);
  const called = Date.now() - up;
  await sleep(500);
  ok("a bucket that is not under the water takes none: nothing is handed on, the water is still the thrower's, and no stamina went",
     (await waterOf(Y)) === 1 && (await waterOf(X)) === 0 && (await stamina(Y)) === was, { y: await waterOf(Y), x: await waterOf(X) });
  ok("…both are told, and it took no longer than a catch", /รับน้ำไม่ทัน/.test((await note(Y)) ?? "") && /รับน้ำไม่ทัน/.test((await note(X)) ?? "") && called < 3000, { notes: [await note(Y), await note(X)], called });
  await Y.shot(`${OUT}/handing-spilt.png`);

  // ── given up ──
  await sleep(2600);
  await ask(Y, a);
  await bothUp(Y, X);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await bothGone(Y, X);
  ok("Escape gives it up: the board is gone from both, the other is told, and the water stays", /เลิกกลางคัน/.test((await note(Y)) ?? "") && (await waterOf(Y)) === 1 && (await waterOf(X)) === 0, await note(Y));

  // ── not ready ──
  // (whoever gave it up is not asked again at once: a board is not to come up over and over on a page that does not want it)
  await sleep(2900);
  await ask(Y, a);
  await until("the thrower is told", async () => /ยังไม่พร้อม/.test((await note(Y)) ?? ""), 6000, 50).catch(() => {});
  ok("asked again at once, whoever gave it up is not ready yet: no board comes up on their page, and the thrower's is gone", /ยังไม่พร้อม/.test((await note(Y)) ?? "") && (await gameUp(X)) === null && (await gameUp(Y)) === null, await note(Y));
  await sleep(8500);
  await X.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
  await until("the taker's bag is open", () => there(X, 'section[aria-labelledby="town-trade-h"]'), 5000);
  await ask(Y, a);
  await until("the thrower is told", async () => /ยังไม่พร้อม/.test((await note(Y)) ?? ""), 6000, 50).catch(() => {});
  ok("somebody with their bag open is not ready: the thrower is told, and no board stays up", /ยังไม่พร้อม/.test((await note(Y)) ?? "") && (await gameUp(Y)) === null && (await gameUp(X)) === null, await note(Y));
  await X.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
  await sleep(600);

  // ── tired hands: harder for whoever has none, and only for them ──
  await X.evaluate(`${T}.spend(500)`);
  await sleep(2400);
  await ask(Y, a);
  await bothUp(Y, X);
  // hands held still (the thrower's just short of the lip, so that nothing is thrown): the tired one's bucket wanders, the other's does not
  await mouseOn(Y, 0.5, upFor(0.1));
  const tired = [await Y.evaluate(`${L}.match()`), await X.evaluate(`${L}.match()`)];
  const tags = (P) => P.evaluate(`[...document.querySelectorAll('[data-look="handing"] > span')].map((e) => [e.innerText.replace(/\\s+/g, " ").trim(), !!e.querySelector("[data-handing-tired]")])`);
  const [ty, tx] = [await tags(Y), await tags(X)];
  const xs = [], tilts = [];
  for (let i = 0; i < 9; i++) { await sleep(70); const [p, q] = [await state(X), await state(Y)]; if (p && q && !p.over) { xs.push(p.x); tilts.push(q.tilt); } }
  await Promise.all([X.shot(`${OUT}/handing-tired-take.png`), Y.shot(`${OUT}/handing-tired-throw.png`)]);
  ok("with no stamina on one side, both pages know whose hands are tired", tired.every((m) => m?.tired.from === false && m.tired.to === true), tired);
  ok("…and only that side says so, on both boards", ty.length === 2 && tx.length === 2 && ty[0][1] === false && ty[1][1] === true && tx[0][1] === false && tx[1][1] === true, { ty, tx });
  ok("a tired hand held still: its bucket wanders from it; the other's stays where the hand is",
     xs.length > 4 && Math.max(...xs) - Math.min(...xs) > 0.03 && Math.max(...tilts.slice(2)) - Math.min(...tilts.slice(2)) < 0.01 && Math.abs(tilts[tilts.length - 1] - 0.1) < 0.03, { xs, tilts });
  await bothGone(Y, X);
  ok("…and nothing thrown is nothing caught", (await waterOf(Y)) === 1 && (await waterOf(X)) === 0);
  await sleep(700);
  await ask(Y, a);
  await playTwo(Y, X);
  await until("it goes over to tired hands", async () => (await waterOf(X)) === 1, 8000, 50).catch(() => {});
  ok("a steady hand still does it: the water is in the tired one's bucket", (await waterOf(X)) === 1 && (await waterOf(Y)) === 0, await note(Y));

  await Y.evaluate(`${T}.spend(500)`);
  await sleep(2400);
  await ask(X, b);
  await bothUp(X, Y);
  const both = await X.evaluate(`${L}.match()`), marks = [await tags(X), await tags(Y)];
  await Promise.all([X.evaluate(`${G}.auto(true)`), Y.evaluate(`${G}.auto(true)`)]);
  ok("with none on either side both are tired, and both say so", both?.tired.from === true && both.tired.to === true && marks.every((t) => t.length === 2 && t.every((s) => s[1])), { both, marks });
  await bothGone(X, Y);
  await until("it goes over between tired hands", async () => (await waterOf(Y)) === 1, 8000, 50).catch(() => {});
  ok("…and two steady hands still hand it over", (await waterOf(Y)) === 1 && (await waterOf(X)) === 0, [await note(X), await note(Y)]);

  // ── a page that asks nobody: as it always was ──
  await Y.evaluate(`${L}.mute(true)`);
  await sleep(2400);
  await ask(Y, a);
  await sleep(350);
  ok("asked, and no answer yet: the thrower's board is up and says who is being called, no moment goes by, and nothing is handed on",
     /กำลังเรียก/.test((await textOf(Y, "[data-handing-word]")) ?? "") && (await state(Y))?.waiting === true && (await waterOf(Y)) === 1, [await textOf(Y, "[data-handing-word]"), await state(Y)]);
  await until("with no answer, tired hands pour as they did", async () => (await gameUp(Y)) === "pouring", 6000, 50).catch(() => {});
  ok("no answer from the other page (one built before this was a game): tired hands have the short pour they had, alone", (await gameUp(Y)) === "pouring" && (await gameUp(X)) === null, await gameUp(Y));
  await play(Y);
  await until("it goes over", async () => (await waterOf(X)) === 1, 8000).catch(() => {});
  ok("…and played, the water goes over", (await waterOf(X)) === 1 && (await waterOf(Y)) === 0);
  await X.evaluate(`(${T}.setStamina(100), ${L}.mute(true))`);
  await sleep(2400);
  const t0 = Date.now();
  await ask(X, b);
  await until("with no answer and stamina, it goes over at once as it did", async () => (await waterOf(Y)) === 1, 8000, 50).catch(() => {});
  ok("…and with stamina it goes over at once, as it always did, a moment after nobody answered", (await waterOf(Y)) === 1 && Date.now() - t0 > 1700 && (await gameUp(X)) === null, Date.now() - t0);
  await X.evaluate(`${L}.mute(false)`);
  await Y.evaluate(`(${L}.mute(false), ${T}.setStamina(100))`);

  // ── on a phone ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  await sleep(2600);
  await ask(Y, a);
  await bothUp(Y, X);
  await Promise.all([Y.evaluate(`${G}.auto(true)`), X.evaluate(`${G}.auto(true)`)]);
  const [board, stage, wide] = [await boxOf(X, "[data-town-game]"), await boxOf(X, '[data-look="handing"]'), await X.evaluate("innerWidth")];
  await X.shot(`${OUT}/handing-phone.png`);
  ok("on a phone the board is within the screen, its picture most of the screen's width", !!board && board.x >= 0 && board.x + board.w <= wide + 0.5 && board.y >= 0 && stage.w > 280, { board, stage, wide });
  await bothGone(Y, X);
  await until("it goes over to the phone", async () => (await waterOf(X)) === 1, 8000, 50).catch(() => {});
  ok("…and it is played there the same", (await waterOf(X)) === 1);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });

  // ── somebody looking at another page is nobody to play with ──
  await Y.goto(`${BASE}/`);
  await until("the room says the other is on another page", async () => (await X.evaluate(`${S}.people().find((p) => p.id === ${JSON.stringify(b)})?.away ?? null`)) === true, 60000).catch(() => {});
  await sleep(1200);
  ok("somebody looking at another page, an empty bucket still in their hand, is not offered",
     (await X.evaluate(`${S}.people().find((p) => p.id === ${JSON.stringify(b)})?.away ?? null`)) === true && (await X.evaluate(`${L}.can()`)) === true && (await X.evaluate(`${L}.next()`)) === null && !(await there(X, "[data-line-chip]")),
     { people: await X.evaluate(`${S}.people()`), next: await X.evaluate(`${L}.next()`) });
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
