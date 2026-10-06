// The familiars (the owner, 2026-10-06: "ใส่ ภูติ หรือ สัตว์เดินตามได้ 1 ชนิด"), tried in the trial with two members: one
// calls a familiar and the other is told which and sees it at their heels; it is sent to rest and is gone for both;
// and the garden gnome pulls a plot's weeds with no game, so many to a meal's hours, where another familiar does not.
//
//   node .claude/skills/fc-cash-town/scripts/town-familiar.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes familiar-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm";
const enter = async (X, letter) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const seenBy = (Y, id) => Y.evaluate(`(window.__cashTown.people().find((p) => p.id === ${JSON.stringify(id)})?.pet ?? null)`);

const X = await browser("Familiar", { width: 1280, height: 860 });
try {
  await enter(X, "E");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(400);
  await X.evaluate(`localStorage.removeItem("cashtown.gnome." + ${K}.id)`);
  await enter(X, "E");
  const me = await X.evaluate(`window.__cashTown.me().id`);
  const Y = await X.tab("FamiliarB");
  await enter(Y, "F");
  await until("the other is in the room", async () => (await seenBy(Y, me)) !== null, 20000);
  ok("with no familiar the room is told of none", (await seenBy(Y, me)) === "" && ((await X.evaluate(`window.__cashTown.me().pet ?? ""`)) === ""));

  // ── called: the room is told, and it is at my heels ──
  await X.evaluate(`${T}.setGifts(true)`);
  const called = await X.evaluate(`${K}.familiarWear("famSquirrel")`);
  ok("a familiar I have is called", called.ok === true, called);
  await until("the other is told which follows me", async () => (await seenBy(Y, me)) === "famSquirrel", 8000);
  ok("the other is told which follows me", true);
  await warp(X, 30, 30);
  await warp(Y, 32, 31);
  await X.evaluate(`${V}.walk?.(34, 30)`);
  await sleep(2600);
  await X.shot(`${OUT}/familiar-own.png`);
  await Y.shot(`${OUT}/familiar-seen.png`);
  await X.evaluate(`${K}.familiarWear("famButterfly")`);
  await until("changed, and the other is told the new one", async () => (await seenBy(Y, me)) === "famButterfly", 8000);
  ok("another is called in its place as often as one likes, and the other is told", true);
  await sleep(1200);
  await X.shot(`${OUT}/familiar-butterfly.png`);
  await X.evaluate(`${K}.familiarWear(null)`);
  await until("sent to rest, and the other is told", async () => (await seenBy(Y, me)) === "", 8000);
  ok("sent to rest, it is gone for the other too", true);
  await Y.close?.();

  // ── the gnome at the weeds ──
  await X.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1))`);
  await warp(X, 133, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await X.evaluate(`${T}.hold(${await slotOf(X, "hoe")})`);
  await sleep(500);
  await until("the hoe is offered the weeds", async () => (await X.evaluate(`${F}.deed()`)) === "clear", 6000);
  // (with a familiar that is no gnome the weeds are a game, as ever)
  await X.evaluate(`${K}.familiarWear("famSquirrel")`);
  await sleep(300);
  await X.evaluate(`${F}.act()`);
  await sleep(900);
  ok("with a squirrel at my heels the weeds are a game, as ever", await gameUp(X), "no game came up");
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await sleep(500);
  ok("…and the plot is weeds still", (await X.evaluate(`${F}.seen("133,5").soil`)) === "wild");
  await X.evaluate(`${K}.familiarWear("famGnome")`);
  await sleep(300);
  await X.evaluate(`${T}.setStamina(50)`);
  await sleep(200);
  const stamina = await X.evaluate(`${T}.purse().stamina.left`);
  await X.evaluate(`${F}.act()`);
  await until("the plot is cleared", async () => (await X.evaluate(`${F}.seen("133,5").soil`)) === "cleared", 6000);
  ok("with the gnome the weeds are pulled at once, with no game", !(await gameUp(X)));
  ok("…for the stamina clearing takes, and no miss", (await X.evaluate(`${T}.purse().stamina.left`)) === stamina - 2, { before: stamina, after: await X.evaluate(`${T}.purse().stamina.left`) });
  ok("…the page says the gnome did it and how many are left to these hours, and counts it on this device", (await X.evaluate(`[...document.querySelectorAll("p")].some((p) => /โนมถอนหญ้าให้แล้ว \\(มื้อนี้เหลือ 9\\)/.test(p.innerText))`))
    && (await X.evaluate(`JSON.parse(localStorage.getItem("cashtown.gnome." + ${K}.id)).n`)) === 1);
  // (tilling is the hoe's own game still: the gnome pulls weeds and no more)
  await until("the hoe is offered the soil", async () => (await X.evaluate(`${F}.deed()`)) === "till", 6000);
  await X.evaluate(`${F}.act()`);
  await sleep(900);
  ok("tilling is a game still: the gnome pulls weeds and no more", await gameUp(X), "no game came up");
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
