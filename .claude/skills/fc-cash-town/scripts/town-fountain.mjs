// Cash Town's wishing fountain, tried in a real browser on the dev test room (the trial kept in the browser, `next
// dev` only), by two testers in two tabs of one browser:
//
// - a tap on the fountain in the plaza opens its panel, in the board's place;
// - a wish is chosen and coins are added by the handful; a toss takes them from the purse for good;
// - the pot, what is behind each wish and who tossed are the same in the other tab;
// - the coin that fills the pot grants the wish with the most behind it, and no more is taken than fills it;
// - the blessing is theirs whose coins were in the pot, and is held beside a meal's buff;
// - whoever was not in it is offered what is left of it for a coin;
// - the next pot of the day asks twice as much.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-fountain.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade";
const purse = (X) => X.evaluate(`${T}.purse()`);
const told = (X) => X.evaluate(`${T}.fountain()`);
const PANEL = `document.querySelector('section[aria-labelledby="town-fountain-h"]')`;
const open = (X) => X.evaluate(`!!${PANEL}`);
const text = (X) => X.evaluate(`${PANEL}?.innerText ?? ""`);
/** Tap a point of the map (counted from the map's own corner), as a finger or a mouse does. */
async function tap(X, mx, my) {
  const box = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + box.x, y = my + box.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(500);
}
/** Press the button in the panel whose words match. */
const press = async (X, re) => {
  const did = await X.evaluate(`(() => { const b = [...${PANEL}.querySelectorAll("button")].find((b) => ${re}.test(b.innerText)); if (!b || b.disabled) return false; b.click(); return true; })()`);
  await sleep(350);
  return did;
};
async function enter(X, letter, at = [20, 44]) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  // (out of the way: somebody standing in front of the fountain would take the tap meant for it)
  await X.evaluate(`window.__townView.warp(${at[0]}, ${at[1]})`);
  await sleep(600);
}
async function openFountain(X) {
  await X.evaluate(`window.__townView.warp(29, 34)`);
  // (the map follows the avatar there: the fountain is tapped once it has stopped moving on the screen)
  let at = null;
  await until("the fountain is drawn, and still", async () => {
    const now = await X.evaluate(`window.__townView.fountain()`), still = !!now && !!at && Math.abs(now.x - at.x) < 0.5 && Math.abs(now.y - at.y) < 0.5;
    at = now;
    return still;
  }, 20000, 400);
  await tap(X, at.x, at.y);
  await until("its panel has come", () => open(X), 15000);
}

const X = await browser("Fountain", { width: 1280, height: 860 });
try {
  await enter(X, "F", [29, 34]);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), localStorage.removeItem("cashtown.trial.fountain.1"))`);
  await sleep(400);
  const Y = await X.tab("FountainB");
  await enter(Y, "C");
  await Y.evaluate(`(${T}.reset(), ${T}.forget())`);
  await X.evaluate(`${T}.grant("worm", 1, 400)`);
  await Y.evaluate(`${T}.grant("worm", 1, 400)`);
  const start = [(await purse(X)).coins, (await purse(Y)).coins];

  await openFountain(X);
  ok("a tap on the fountain opens its panel", await open(X));
  let f = await told(X);
  ok("the pot is empty and the goal is the least there is, with so few coins about", f.pot === 0 && f.goal === 100 && f.who.length === 0 && f.blessings.length === 0, f);
  ok("nothing can be tossed until a wish is chosen and coins are in the hand", !(await press(X, /^โยน|เลือกพรก่อน/)));
  await X.shot(`${OUT}/fountain-empty.png`);

  ok("a wish is chosen", await press(X, /มือเย็น/));
  for (let i = 0; i < 3; i++) await press(X, /^\+10$/);
  ok("thirty coins tossed towards it leave the purse", (await press(X, /^โยน 30 เหรียญ/)) && (await until("the purse has paid", async () => (await purse(X)).coins === start[0] - 30, 8000).then(() => true, () => false)), (await purse(X)).coins);
  f = await told(X);
  ok("the pot has them, behind that wish, and says who tossed", f.pot === 30 && f.by.green === 30 && f.who.length === 1 && f.mine === true, f);
  ok("the panel says so", /30\s*\/\s*100/.test((await text(X)).replace(/\n/g, " ")) && /โยนแล้ว 1 คน/.test(await text(X)), await text(X));

  await openFountain(Y);
  f = await told(Y);
  ok("the other tester sees the same pot, and that their coin is not in it", f.pot === 30 && f.by.green === 30 && f.mine === false, f);
  ok("another wish gathers its own coins", (await press(Y, /โชคดี/)) && (await press(Y, /^\+50$/)) && (await press(Y, /^โยน 50 เหรียญ/)));
  await until("the pot has them", async () => (await told(Y)).pot === 80, 8000);
  f = await told(X);
  ok("…seen in the first tab too", f.pot === 80 && f.by.lucky === 50 && f.who.length === 2, f);

  // the coin that fills it: fifty offered towards a third wish, twenty taken; lucky has the most behind it (50 to 30 and 20)
  await press(X, /ตาไว/);
  await press(X, /^\+50$/);
  const before = (await purse(X)).coins;
  ok("fifty more are offered", await press(X, /^โยน 50 เหรียญ/));
  await until("the pot is filled", async () => (await told(X)).given === 1, 8000);
  ok("the fountain takes no more than fills the pot: twenty of fifty", (await purse(X)).coins === before - 20, (await purse(X)).coins - before);
  f = await told(X);
  ok("the wish with the most behind it comes true, for everybody whose coins were in the pot",
    f.blessings.length === 1 && f.blessings[0].id === "lucky" && f.blessings[0].people === 2 && f.blessings[0].mine === true && (await told(Y)).blessings[0]?.mine === true, f.blessings);
  ok("the pot is empty again, and the day's next asks twice as much", f.pot === 0 && f.goal === 200 && f.who.length === 0, f);
  ok("the panel says which wish came true", /เป็นจริงแล้ว/.test(await text(X)) && /พรที่กำลังเป็นจริง/.test(await text(X)), await text(X));
  const mine = (await purse(X)).blessed;
  ok("the blessing is in the purse the rules read, for three hours", Array.isArray(mine) && mine.length === 1 && mine[0].id === "lucky" && mine[0].until > Date.now() + 2.9 * 3600000, mine);
  await X.shot(`${OUT}/fountain-blessed.png`);

  // somebody who comes after: a third tester, who has tossed nothing
  const Z = await X.tab("FountainC");
  await enter(Z, "A");
  await Z.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.grant("worm", 1, 5))`);
  ok("somebody whose coin was not in the pot has no blessing", !(await purse(Z)).blessed, (await purse(Z)).blessed);
  await openFountain(Z);
  ok("…and is told a coin will give them what is left of it", /โยน 1 เหรียญเพื่อรับ/.test(await text(Z)), await text(Z));
  ok("a coin tossed while it lasts", (await press(Z, /ตาไว/)) && (await press(Z, /^\+1$/)) && (await press(Z, /^โยน 1 เหรียญ/)));
  await until("it is theirs", async () => (await purse(Z)).blessed?.[0]?.id === "lucky", 8000).catch(() => {});
  // (one coin gone, whatever it counted for: one and a half when the three of them tossed within the minute)
  ok("…has it, and the coin is in the next pot", (await purse(Z)).blessed?.[0]?.id === "lucky" && (await purse(Z)).coins === 4 && [1, 1.5].includes((await told(Z)).pot), [(await purse(Z)).blessed, (await told(Z)).pot]);

  // a wish in its writer's words: written with a toss, read by the others, a coin tossed onto it, reported, taken back
  const type = (P, words) => P.evaluate(`(() => { const el = ${PANEL}.querySelector('input[type="text"]'); if (!el) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(words)}); el.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  const noteOf = (P) => P.evaluate(`(() => { const li = ${PANEL}?.querySelector("[data-note]"); return li ? li.innerText.replace(/\\s+/g, " ") : null; })()`);
  await press(X, /มือนิ่ง/);
  ok("words too long for a wish cannot be tossed", (await type(X, "ก".repeat(81))) && (await press(X, /^\+1$/)) && !(await press(X, /^โยน 1 เหรียญ/)));
  await type(X, "  ขอให้ได้ปลาคาร์ป   ตัวใหญ่ ");
  await sleep(200);
  ok("a toss carries a line of words", await press(X, /^โยน 1 เหรียญ/));
  await until("the wish is read at the fountain", async () => /ขอให้ได้ปลาคาร์ป ตัวใหญ่/.test((await noteOf(X)) ?? ""), 8000).catch(() => {});
  ok("the wish is read there, tidied, with a way to take it back and none to toss onto one's own", /ขอให้ได้ปลาคาร์ป ตัวใหญ่/.test(await noteOf(X)) && /ลบของฉัน/.test(await noteOf(X)) && !/ร่วมอธิษฐาน 1 เหรียญ/.test(await noteOf(X)), await noteOf(X));
  await until("the other tester reads it", async () => /ขอให้ได้ปลาคาร์ป/.test((await noteOf(Y)) ?? ""), 8000).catch(() => {});
  const coinsY = (await purse(Y)).coins;
  ok("somebody else reads it, and tosses a coin onto it", /ขอให้ได้ปลาคาร์ป ตัวใหญ่/.test(await noteOf(Y)) && (await press(Y, /^ร่วมอธิษฐาน 1 เหรียญ/)));
  await until("the coin is counted beside it", async () => /ร่วมอธิษฐาน 1/.test((await noteOf(X)) ?? ""), 8000).catch(() => {});
  ok("…a coin gone from their purse, and counted beside the wish", (await purse(Y)).coins === coinsY - 1 && /ร่วมอธิษฐาน 1/.test(await noteOf(X)), [await noteOf(X), (await purse(Y)).coins - coinsY]);
  ok("a third reports it, once", (await press(Z, /^รายงาน$/)) && !(await press(Z, /^รายงาน$/)), await noteOf(Z));
  ok("its writer takes it back", (await press(X, /^ลบของฉัน$/)) && (await until("it is gone", async () => (await noteOf(X)) === null, 8000).then(() => true, () => false)), await noteOf(X));

  // the panel shut with its own button, and the board still opens in that place
  ok("its button shuts it", (await press(X, /^ปิด$/)) && !(await open(X)));
  await X.evaluate(`window.__townView.warp(24, 27)`);
  let board = null;
  await until("the board is on the screen, and still", async () => {
    const now = await X.evaluate(`window.__townView.board()`), still = !!now && !!board && Math.abs(now.x - board.x) < 0.5 && Math.abs(now.y - board.y) < 0.5 && now.y > 40;
    board = now;
    return still;
  }, 20000, 400);
  await tap(X, board.x, board.y);
  ok("the board opens in the same place, as it did", (await X.evaluate(`!!document.querySelector('section[aria-labelledby="town-board-h"]')`)) && !(await open(X)));
  // …and the fountain again once the board is shut (a panel lies over the map where the fountain is, so it is shut first)
  await X.evaluate(`(() => { const b = [...document.querySelector('section[aria-labelledby="town-board-h"]').querySelectorAll("button")].find((b) => /^ปิด$/.test(b.innerText)); b?.click(); })()`);
  await sleep(400);
  await openFountain(X);
  ok("the fountain's panel opens again, and the board is not beside it", (await open(X)) && !(await X.evaluate(`!!document.querySelector('section[aria-labelledby="town-board-h"]')`)));
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0 && Z.logs.length === 0, [...X.logs, ...Y.logs, ...Z.logs]);
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
