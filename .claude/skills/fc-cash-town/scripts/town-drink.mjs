// The flask of living water (the well's fourth rank, lib/town/well-gifts, components/town/TownDrink), tried in a real
// browser on the dev test room (the trial kept in the browser, `next dev` only), by two testers in two windows of one
// browser and a third at a phone's width:
//
// - the well's fourth rank is taken by the bucketfuls poured, and the flask is in no slot of the bag;
// - without the flask a friend's card offers no drink; with it, the card of somebody who stands near does;
// - a friend whose gauge is full is shown nothing, and the giver is told so by name;
// - a drink held out: the giver's chip counts down, the friend's page puts a card up with the giver's name;
//   a real mouse on "ดื่ม": thirty stamina to the friend, ten to the giver, both pages show it for a moment, with
//   what each had of it rising over their heads;
// - once in a meal's hours: held out again, the friend is shown nothing and the giver told; in the next meal's hours
//   it is theirs again, and "ไว้ก่อน" leaves it;
// - a friend near with no stamina left is named on a chip of the giver's page;
// - the keeper refuses a drink from too far, though the card was up; a drink nobody answers is put away at its time;
// - at a phone's width the card and its buttons fit; with the town kept still nothing of it moves.
//
// Prints PASS/FAIL lines and writes drink-*.png to <outdir>.
//
//   node town-drink.mjs <base> <outdir>
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", D = "window.__townDrink", V = "window.__townView";
const purse = (X) => X.evaluate(`${T}.purse()`);
const stamina = (X) => X.evaluate(`(() => { const p = ${K}.purse(), now = ${K}.now(); const day = Math.floor((now + 7 * 3600000 - 5 * 3600000) / 86400000); return p.stamina.day === day ? p.stamina.left : 100; })()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText?.replace(/\\s+/g, " ").trim() ?? null`);
const boxOf = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return b ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; })()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
async function mouse(X, x, y) {
  const at = { x, y, button: "left", clickCount: 1, pointerType: "mouse" };
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", ...at });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...at });
}
/** A real mouse pressed on something of the page, at its middle. */
async function clickOn(X, sel) {
  const b = await boxOf(X, sel);
  if (!b) throw new Error(`nothing to press: ${sel}`);
  await mouse(X, b.x + b.w / 2, b.y + b.h / 2);
}
/** Somebody's card opened by a tap on them (a point of the map is counted from the map's own corner). */
async function cardOf(X, id) {
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }).catch(() => {});
  await sleep(150);
  const at = await until(`${id} is on the screen`, () => X.evaluate(`${V}.screenOf(${JSON.stringify(id)})`), 15000, 100);
  const box = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`);
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x + box.x, y: at.y + box.y });
  await mouse(X, at.x + box.x, at.y + box.y);
  await sleep(400);
}
/** The meal's hours it is by a page's keeper, as the count of a drink is kept (lib/town/well-gifts' mealHours). */
const hoursNow = (X) => X.evaluate(`(() => { const now = ${K}.now() + 7 * 3600000, day = Math.floor((now - 5 * 3600000) / 86400000), h = (now % 86400000) / 3600000; return day * 3 + (h >= 17 || h < 5 ? 2 : h >= 11 ? 1 : 0); })()`);
async function enter(X, letter, more = "") {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=wellgifts&townHour=12&townWeather=clear${more}`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${K}`), 30000);
  await until("the flask's own code has come", () => X.evaluate(`!!${D}`), 60000);
}
const sees = (X, id) => until(`${id} is in the room`, () => X.evaluate(`!!${V}.at(${JSON.stringify(id)})`), 30000, 100);
/** Whether one page has somebody standing on a tile. */
const stands = (X, id, x, y, ms = 4000) => until(`${id} stands at ${x},${y}`, () => X.evaluate(`(() => { const p = ${V}.at(${JSON.stringify(id)}); return !!p && !p.moving && Math.floor(p.x) === ${x} && Math.floor(p.y) === ${y}; })()`), ms, 100).then(() => true).catch(() => false);
/**
 * Somebody put on a tile, and seen there by the other pages. (A page that has just come in is told where everybody
 * stands by a letter that may come after the word of a step taken meanwhile, and then has them where they stood
 * before: the step is said again until every page has it.)
 */
async function place(P, id, x, y, others) {
  for (let i = 0; i < 6; i++) {
    await warp(P, x, y);
    if ((await Promise.all(others.map((O) => stands(O, id, x, y)))).every(Boolean)) return;
  }
  throw new Error(`${id} is not seen at ${x},${y}`);
}

const X = await browser("Drink", { width: 1280, height: 860 });
try {
  await enter(X, "W");
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false), ${T}.setCarried(0))`);
  await sleep(400);
  const a = await X.evaluate(`${T}.id`);
  const Y = await X.window("DrinkB");
  await enter(Y, "V");
  await Y.evaluate(`(${T}.setGifts(false), ${T}.setCarried(0))`);
  const b = await Y.evaluate(`${T}.id`);
  await sees(X, b); await sees(Y, a);
  await place(X, a, 30, 40, [Y]);
  await place(Y, b, 31, 40, [X]);

  // ── the well's fourth rank ──
  await X.evaluate(`${T}.setCarried(1499)`);
  let did = await X.evaluate(`${K}.giftTake("well", 4)`);
  ok("with 1,499 bucketfuls poured the well's fourth rank is not reached", did.ok === false && did.why === "rank", did);
  await X.evaluate(`${T}.setCarried(1500)`);
  did = await X.evaluate(`${K}.giftTake("well", 4)`);
  let p = await purse(X);
  ok("with 1,500 its gift is taken: the flask of living water, in no slot of the bag", did.ok === true && did.gift === "thingFlask" && p.gifts.had.includes("thingFlask") && p.bag.every((s) => s === null), { did, bag: p.bag });
  await X.evaluate(`${T}.setGifts(false)`);
  await sleep(300);

  // ── without the flask ──
  await cardOf(X, b);
  ok("without the flask a friend's card offers no drink", !(await there(X, "[data-card-drink]")) && (await X.evaluate(`${D}.mine()`)) === false, await textOf(X, ".pop-in.w-60"));
  did = await X.evaluate(`${K}.drinkOffer(${JSON.stringify(b)}, [30, 40])`);
  ok("…and whoever keeps the game holds nothing out for them", did.ok === false && did.why === "none", did);

  // ── a friend whose gauge is full ──
  await X.evaluate(`(${T}.setGifts(["thingFlask"]), ${T}.setStamina(40))`);
  await until("the flask is mine", () => X.evaluate(`${D}.mine()`), 5000, 100);
  await cardOf(X, b);
  ok("with the flask, the card of somebody who stands near offers a drink", await there(X, "[data-card-drink]"), await textOf(X, ".pop-in.w-60"));
  await X.shot(`${OUT}/drink-card.png`);
  await clickOn(X, "[data-card-drink]");
  await until("the giver is told", () => X.evaluate(`${D}.note()`), 6000, 50).catch(() => {});
  ok("a friend whose gauge is full is shown nothing, and the giver is told so by name", /แรงเต็มอยู่แล้ว/.test((await X.evaluate(`${D}.note()`)) ?? "") && !(await there(Y, "[data-drink-card]")) && (await X.evaluate(`${D}.out()`)) === null,
     [await X.evaluate(`${D}.note()`), await Y.evaluate(`${D}.card()`)]);
  await sleep(600);
  ok("…and the drink is put away: the giver's purse holds none out", !("toast" in (await purse(X))), (await purse(X)).toast);

  // ── a drink held out, and drunk ──
  await Y.evaluate(`${T}.setStamina(20)`);
  await sleep(3400);
  await cardOf(X, b);
  await clickOn(X, "[data-card-drink]");
  await until("a card on the friend's page", () => there(Y, "[data-drink-card]"), 8000, 40);
  const [out, card] = [await X.evaluate(`${D}.out()`), await Y.evaluate(`${D}.card()`)];
  ok("a drink held out: the giver's chip names the friend and counts down, the friend's page puts a card up with the giver's name and a button",
     out?.id === b && card?.id === a && /ยื่นกระติกให้/.test((await textOf(X, "[data-drink-out]")) ?? "") && /ยื่นน้ำพุแห่งชีวิตให้/.test((await textOf(Y, "[data-drink-card]")) ?? "") && (await there(Y, "[data-drink-take]")) && (await there(Y, "[data-drink-later]")),
     { out, card, x: await textOf(X, "[data-drink-out]"), y: await textOf(Y, "[data-drink-card]") });
  p = await purse(X);
  ok("…kept in the giver's purse for twenty seconds, from the tile they stand on", p.toast?.to === b && p.toast.at[0] === 30 && p.toast.at[1] === 40 && Math.abs(p.toast.till - (await X.evaluate(`${K}.now()`)) - 20000) < 3000, p.toast);
  ok("nothing has been given yet", (await stamina(X)) === 40 && (await stamina(Y)) === 20, [await stamina(X), await stamina(Y)]);
  await Promise.all([X.shot(`${OUT}/drink-held-out.png`), Y.shot(`${OUT}/drink-offered.png`)]);
  await clickOn(Y, "[data-drink-take]");
  await until("it is drunk", async () => (await stamina(Y)) === 50, 8000, 40);
  await until("the giver's page shows it", () => there(X, "[data-drink-moment]"), 8000, 40).catch(() => {});
  ok("a real mouse on the button: thirty stamina to the friend and ten to the flask's owner", (await stamina(Y)) === 50 && (await stamina(X)) === 50, [await stamina(X), await stamina(Y)]);
  const [py, px] = [await purse(Y), await purse(X)];
  ok("…the friend's purse keeps who gave it and in which hours, and the giver's holds no drink out any more", py.drunk?.by === a && py.drunk.k === (await hoursNow(Y)) && !("toast" in px), { drunk: py.drunk, toast: px.toast, hours: await hoursNow(Y) });
  ok("…and nothing but stamina moved: no coin, no thing", px.coins === 0 && py.coins === 0 && px.bag.every((s) => s === null) && py.bag.every((s) => s === null), { x: px.coins, y: py.coins });
  const [my, mx] = [await Y.evaluate(`(() => { const e = document.querySelector("[data-drink-moment]"); return e ? { ...e.dataset } : null; })()`), await X.evaluate(`(() => { const e = document.querySelector("[data-drink-moment]"); return e ? { ...e.dataset } : null; })()`)];
  ok("both pages show it for a moment: the friend sees who gave it, the giver that it was drunk",
     my?.drinkMoment === "drank" && my.got === "30" && /ดื่มน้ำพุแห่งชีวิตของ/.test((await textOf(Y, "[data-drink-moment]")) ?? "") && /\+30/.test((await textOf(Y, "[data-drink-moment]")) ?? "")
     && mx?.drinkMoment === "gave" && /ดื่มแล้ว/.test((await textOf(X, "[data-drink-moment]")) ?? "") && /\+10/.test((await textOf(X, "[data-drink-moment]")) ?? ""),
     { my, mx, y: await textOf(Y, "[data-drink-moment]"), x: await textOf(X, "[data-drink-moment]") });
  const rise = (P) => P.evaluate(`[...document.querySelectorAll("[data-drink-rise]")].map((e) => [e.dataset.drinkRise, e.innerText.trim()])`);
  const [ry, rx] = [await rise(Y), await rise(X)];
  ok("…with what each had of it rising over their heads, on both pages", [ry, rx].every((r) => r.some(([id, t]) => id === b && t === "+30") && r.some(([id, t]) => id === a && t === "+10")), { ry, rx });
  await sleep(450);
  await Promise.all([X.shot(`${OUT}/drink-gave.png`), Y.shot(`${OUT}/drink-drank.png`)]);
  await until("the moment is over", async () => !(await there(X, "[data-drink-moment]")) && !(await there(Y, "[data-drink-moment]")), 8000, 100);

  // ── once in a meal's hours ──
  await cardOf(X, b);
  await clickOn(X, "[data-card-drink]");
  await until("the giver is told", async () => /ดื่มไปแล้วมื้อนี้/.test((await X.evaluate(`${D}.note()`)) ?? ""), 6000, 50).catch(() => {});
  ok("held out again in the same hours: the friend is shown nothing, and the giver is told they have drunk", /ดื่มไปแล้วมื้อนี้/.test((await X.evaluate(`${D}.note()`)) ?? "") && !(await there(Y, "[data-drink-card]")) && (await stamina(Y)) === 50, await X.evaluate(`${D}.note()`));
  // (and whoever keeps the game says the same, asked past the page)
  await X.evaluate(`${K}.drinkOffer(${JSON.stringify(b)}, [30, 40])`);
  did = await Y.evaluate(`${K}.drinkTake(${JSON.stringify(a)}, [31, 40])`);
  ok("…and whoever keeps the game refuses a second drink in these hours", did.ok === false && did.why === "drunk" && (await stamina(Y)) === 50 && (await stamina(X)) === 50, did);
  await X.evaluate(`${K}.drinkOffer(null, [30, 40])`);

  // ── the next meal's hours: theirs again; and "not now" ──
  // (thirteen hours on is another meal's hours whatever the hour: the trial's clock is the whole browser's)
  await X.evaluate(`${T}.skipHours(13)`);
  await sleep(600);
  await X.evaluate(`${T}.setStamina(40)`);
  await Y.evaluate(`${T}.setStamina(10)`);
  await sleep(3400);
  await cardOf(X, b);
  await clickOn(X, "[data-card-drink]");
  await until("a card on the friend's page", () => there(Y, "[data-drink-card]"), 8000, 40);
  ok("in the next meal's hours a drink is held out to them again", (await Y.evaluate(`${D}.card()`))?.id === a, await Y.evaluate(`${D}.card()`));
  await clickOn(Y, "[data-drink-later]");
  await until("the giver is told", async () => /ขอไว้ก่อน/.test((await X.evaluate(`${D}.note()`)) ?? ""), 6000, 50).catch(() => {});
  ok("\"ไว้ก่อน\" leaves it: nothing given, the giver told, the drink put away", /ขอไว้ก่อน/.test((await X.evaluate(`${D}.note()`)) ?? "") && (await stamina(Y)) === 10 && (await stamina(X)) === 40 && !(await there(Y, "[data-drink-card]")) && (await X.evaluate(`${D}.out()`)) === null,
     [await X.evaluate(`${D}.note()`), await stamina(X), await stamina(Y)]);
  await sleep(500);
  ok("…and the friend's one drink of these hours is still theirs", (await purse(Y)).drunk?.k !== (await hoursNow(Y)) && !("toast" in (await purse(X))), [(await purse(Y)).drunk, await hoursNow(Y)]);

  // ── a friend near with no stamina left ──
  ok("a friend who still has stamina is named on no chip", (await X.evaluate(`${D}.tired()`)) === null && !(await there(X, "[data-drink-chip]")), await X.evaluate(`${D}.tired()`));
  await Y.evaluate(`${T}.setStamina(0)`);
  await until("a chip names the tired friend", () => there(X, "[data-drink-chip]"), 15000, 100).catch(() => {});
  ok("a friend who stands near with no stamina left is named on a chip of the giver's page", (await X.evaluate(`${D}.tired()`)) === b && /หมดแรง/.test((await textOf(X, "[data-drink-chip]")) ?? ""), [await X.evaluate(`${D}.tired()`), await textOf(X, "[data-drink-chip]")]);
  await X.shot(`${OUT}/drink-tired-chip.png`);
  await clickOn(X, "[data-drink-chip]");
  await until("a card on the friend's page", () => there(Y, "[data-drink-card]"), 8000, 40);
  // (the keeper refuses a drink from too far off, though the card was up)
  await place(Y, b, 40, 40, [X]);
  await clickOn(Y, "[data-drink-take]");
  await until("the friend is told", () => Y.evaluate(`${D}.note()`), 6000, 50).catch(() => {});
  ok("from ten tiles off the keeper refuses it, though the card was up: nothing given, both told", /ยืนไกลเกินไป/.test((await Y.evaluate(`${D}.note()`)) ?? "") && (await stamina(Y)) === 0 && (await stamina(X)) === 40,
     [await Y.evaluate(`${D}.note()`), await X.evaluate(`${D}.note()`), await stamina(X), await stamina(Y)]);
  await until("the giver is told", async () => /อยู่ไกลเกินไป/.test((await X.evaluate(`${D}.note()`)) ?? ""), 6000, 50).catch(() => {});
  ok("…the giver by name", /อยู่ไกลเกินไป/.test((await X.evaluate(`${D}.note()`)) ?? ""), await X.evaluate(`${D}.note()`));
  await cardOf(X, b);
  ok("…and the card of somebody ten tiles off offers no drink", !(await there(X, "[data-card-drink]")), await textOf(X, ".pop-in.w-60"));
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }).catch(() => {});
  await place(Y, b, 31, 41, [X]);
  await sleep(3400);
  await until("the chip is back", () => there(X, "[data-drink-chip]"), 15000, 100);
  await clickOn(X, "[data-drink-chip]");
  await until("a card on the friend's page", () => there(Y, "[data-drink-card]"), 8000, 40);
  await clickOn(Y, "[data-drink-take]");
  await until("it is drunk", async () => (await stamina(Y)) === 30, 8000, 40);
  ok("from beside them the tired friend drinks: thirty to them, ten to the giver; and the chip is gone, for they have stamina again", (await stamina(Y)) === 30 && (await stamina(X)) === 50
     && (await until("the chip goes", async () => !(await there(X, "[data-drink-chip]")), 15000, 100).then(() => true).catch(() => false)), [await stamina(X), await stamina(Y)]);

  // ── a drink nobody answers ──
  await until("the moment is over", async () => !(await there(X, "[data-drink-moment]")), 8000, 100);
  await X.evaluate(`${D}.offer("nobodyThere", "Nobody")`);
  await until("it is held out", () => there(X, "[data-drink-out]"), 5000, 40);
  const left0 = await textOf(X, "[data-drink-out]");
  await sleep(2300);
  const left1 = await textOf(X, "[data-drink-out]");
  ok("a drink held out counts its seconds down", /\b(20|19)\b/.test(left0 ?? "") && /\b(18|17|16)\b/.test(left1 ?? ""), [left0, left1]);
  await clickOn(X, "[data-drink-away]");
  await sleep(500);
  ok("\"เก็บ\" puts it away: nothing held out on the page or in the purse", !(await there(X, "[data-drink-out]")) && !("toast" in (await purse(X))), (await purse(X)).toast);
  await X.evaluate(`${D}.offer("nobodyThere", "Nobody")`);
  await until("it is held out", () => there(X, "[data-drink-out]"), 5000, 40);
  await X.evaluate(`${T}.skipHours(0.01)`);
  await until("its time is up", async () => !(await there(X, "[data-drink-out]")), 6000, 50).catch(() => {});
  ok("left unanswered for its twenty seconds it is put away, and the giver told", !(await there(X, "[data-drink-out]")) && /ยังไม่ได้ดื่ม/.test((await X.evaluate(`${D}.note()`)) ?? ""), await X.evaluate(`${D}.note()`));

  // ── at a phone's width, and with the town kept still ──
  const Z = await X.window("DrinkPhone", { width: 360, height: 700, mobile: true });
  await Z.goto(`${BASE}/town`);
  await sleep(1500);
  await Z.evaluate(`localStorage.setItem("cashTown:motion", "off")`);
  await enter(Z, "U");
  await Z.evaluate(`(${T}.setGifts(false), ${T}.setStamina(5))`);
  const c = await Z.evaluate(`${T}.id`);
  await sees(X, c); await sees(Z, a);
  await place(Z, c, 30, 41, [X]);
  await place(X, a, 30, 40, [Y, Z]);
  await sleep(3400);
  await X.evaluate(`${D}.offer(${JSON.stringify(c)}, "ทดสอบ U")`);
  await until("a card on the phone", () => there(Z, "[data-drink-card]"), 8000, 40);
  const [cb, tb, lb] = [await boxOf(Z, "[data-drink-card]"), await boxOf(Z, "[data-drink-take]"), await boxOf(Z, "[data-drink-later]")];
  ok("at a phone's width the card fits, and its buttons are a finger's size", cb.x >= 0 && cb.x + cb.w <= 360 && tb.h >= 44 && lb.h >= 44 && tb.x >= cb.x && lb.x + lb.w <= cb.x + cb.w, { cb, tb, lb });
  ok("with the town kept still nothing of it moves", await Z.evaluate(`(() => { const d = document.querySelector("[data-town-drink]"); return !!d && d.hasAttribute("data-still") && getComputedStyle(document.querySelector("[data-drink-card] .td-bob")).animationName === "none"; })()`),
     await Z.evaluate(`document.querySelector("[data-town-drink]")?.outerHTML.slice(0, 200)`));
  await Z.shot(`${OUT}/drink-phone.png`);
  await clickOn(Z, "[data-drink-take]");
  await until("it is drunk", async () => (await stamina(Z)) === 35, 8000, 40);
  await sleep(300);
  ok("…and it is drunk there too: thirty to the friend", (await stamina(Z)) === 35 && (await there(Z, "[data-drink-moment]")), await stamina(Z));
  await Z.shot(`${OUT}/drink-phone-drank.png`);
  await Z.evaluate(`localStorage.setItem("cashTown:motion", "on")`);

  const errors = [...X.logs, ...Y.logs, ...Z.logs].filter((l) => !/favicon|ERR_|Failed to load resource|supabase|WebSocket|realtime/i.test(l));
  ok("no page threw", errors.length === 0, errors.slice(0, 4));
} catch (e) {
  ok("the check ran to its end", false, e.message);
} finally {
  X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
