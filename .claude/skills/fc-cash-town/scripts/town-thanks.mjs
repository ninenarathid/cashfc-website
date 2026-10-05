// Cash Town's thanks at the picking and the jar at the well, tried in a real browser on the dev test room (the trial
// kept in the browser, `next dev` only), by two testers in two tabs of one browser, who share its farm and its well:
//
// - one has a plant; the other carries a bucketful to the well, fills a can with it and waters that plant; standing
//   on the plot, its owner is offered a small card with who helped, and one tap thanks them: once a day;
// - the one thanked is told so on their map, and their book at the well counts it;
// - the book has the jar: coins dropped in, something held dropped in, a tool not taken; when the uncle's round has
//   turned the jar is shared to whoever worked for the others, and they take it from the book.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-thanks.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", W = "window.__townWell", K = "window.__townThanks";
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const chore = (X) => X.evaluate(`${F}.chore()`);
const deed = (X) => X.evaluate(`${F}.deed()`);
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(700); };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, b) => t + (b?.item === item ? b.n : 0), 0);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
const act = async (X, what, kind) => {
  await until(`${what} is offered`, async () => (await (kind === "deed" ? deed(X) : chore(X))) === what, 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
};

const WELL = [157, 23], RIVER = [17, 42], MINE = "133,5";
const X = await browser("Thanks", { width: 1280, height: 860 });
try {
  await enter(X, "W");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("kangkong", 3, 20), ${T}.grant("hoe", 1))`);
  const me = await X.evaluate(`${T}.id`), now = await X.evaluate(`${T}.now()`);
  await X.evaluate(`${T}.setPlot(${JSON.stringify(MINE)}, ${JSON.stringify({ soil: "tilled", plant: { by: me, crop: "kangkong", sown: now - 3600000, boost: 0, watered: 0, fed: 0, guard: now + 2 * 86400000, cured: 0, picked: 0, pickedAt: 0 } })})`);
  await warp(X, 133, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F} && !!${K}`), 20000);
  ok("a plant nobody has helped: nobody to thank", !(await there(X, "[data-thanks-chip]")) && (await X.evaluate(`${K}.here()`)).length === 0);

  // the other carries a bucketful, fills a can with it and waters my plant
  const Y = await X.tab("ThanksB");
  await enter(Y, "V");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1), ${T}.grant("can", 1))`);
  const other = await Y.evaluate(`${T}.id`);
  await warp(Y, ...RIVER);
  await until("the farm's own code has come to the other", () => Y.evaluate(`!!${F} && !!${K}`), 20000);
  await hold(Y, "bucket");
  await act(Y, "draw");
  await warp(Y, ...WELL);
  await act(Y, "pour");
  await hold(Y, "can");
  await act(Y, "fill");
  await warp(Y, 133, 5);
  await act(Y, "water", "deed");
  ok("the other, standing on my plot, is offered no thanks to give", !(await there(Y, "[data-thanks-chip]")));

  // back on my plot: the card
  await warp(X, 134, 5);
  await warp(X, 133, 5);
  await until("the card is offered", () => there(X, "[data-thanks-chip]"), 8000);
  const helpers = await X.evaluate(`${K}.toThank()`);
  ok("standing on my plot I am offered to thank who helped: they watered it once, with water they carried", helpers[MINE]?.length === 1 && helpers[MINE][0].id === other && helpers[MINE][0].water === 1 && helpers[MINE][0].carry === 1 && /ขอบคุณ/.test(await textOf(X, "[data-thanks-chip]")), helpers);
  await X.shot(`${OUT}/thanks-card.png`);
  await X.evaluate(`document.querySelector("[data-thanks-chip]").click()`);
  await until("thanked", async () => !(await there(X, "[data-thanks-chip]")), 5000);
  ok("one tap thanks them, says so, and the card is gone", /ขอบคุณแล้ว 1 คน/.test((await textOf(X, "[data-thanks-note]")) ?? "") && Object.keys(await X.evaluate(`${K}.toThank()`)).length === 0, await textOf(X, "[data-thanks-note]"));
  await warp(X, 134, 5);
  await warp(X, 133, 5);
  await sleep(600);
  ok("once a day: coming back to the plot, nobody is left to thank", !(await there(X, "[data-thanks-chip]")));

  // the one thanked is told (their page learns of it as it next hears from whoever keeps the game: here, at their next deed)
  await hold(Y, "bucket");
  await until("the other is told", () => there(Y, "[data-thanks-toast]"), 8000);
  ok("the one thanked is told so on their map", /ขอบคุณที่ช่วยดูแลผัก/.test(await textOf(Y, "[data-thanks-toast]")), await textOf(Y, "[data-thanks-toast]"));
  await Y.shot(`${OUT}/thanks-toast.png`);
  await sleep(6800);
  ok("…once, for a few seconds", !(await there(Y, "[data-thanks-toast]")));
  await warp(Y, ...WELL);
  await until("the book is offered", () => there(Y, "[data-well-chip]"), 8000);
  await Y.evaluate(`${W}.open()`);
  await until("the book opens", () => there(Y, "[data-well-thanks]"), 5000);
  const board = await Y.evaluate(`${W}.thanks()`);
  ok("their book counts it: one this week, one all told, thanked today by me, and they are the week's most thanked", board.week === 1 && board.all === 1 && board.today[0]?.id === me && board.top[0]?.id === other && /สัปดาห์นี้ 1/.test(await textOf(Y, "[data-well-thanks]")), board);

  // the jar
  ok("the book has the jar, empty, and says when it is next shared", (await there(Y, "[data-well-jar]")) && (await Y.evaluate(`${W}.jar()`)).coins === 0 && /แบ่งให้คนที่หาบน้ำ/.test(await textOf(Y, "[data-well-jar]")), await textOf(Y, "[data-well-jar]"));
  ok("with no coins, none can be dropped", await Y.evaluate(`[...document.querySelectorAll("[data-jar-give]")].every((b) => b.disabled)`));
  await Y.evaluate(`${W}.close()`);
  await warp(X, ...WELL);
  await until("my book is offered", () => there(X, "[data-well-chip]"), 8000);
  await X.evaluate(`${W}.open()`);
  await until("my book opens", () => there(X, "[data-well-jar]"), 5000);
  await X.evaluate(`document.querySelector('[data-jar-give="5"]').click()`);
  await until("five coins are in the jar", async () => (await X.evaluate(`${W}.jar()`)).coins === 5, 5000);
  await X.evaluate(`document.querySelector('[data-jar-give="10"]').click()`);
  await until("fifteen coins are in the jar", async () => (await X.evaluate(`${W}.jar()`)).coins === 15, 5000);
  ok("coins dropped into the jar leave my purse", (await purse(X)).coins === 5 && (await there(X, '[data-jar-coins-in="15"]')), (await purse(X)).coins);
  ok("with five coins left, ten cannot be dropped", await X.evaluate(`document.querySelector('[data-jar-give="10"]').disabled && !document.querySelector('[data-jar-give="5"]').disabled`));
  await hold(X, "hoe");
  ok("a tool held is not offered to the jar", !(await there(X, "[data-jar-give-thing]")));
  await hold(X, "kangkong");
  await until("the thing held is offered", () => there(X, "[data-jar-give-thing]"), 5000);
  await X.evaluate(`document.querySelector("[data-jar-give-thing]").click()`);
  await until("it is in the jar", async () => (await X.evaluate(`${W}.jar()`)).things.length === 1, 5000);
  ok("something grown, held in the hand, is dropped in one at a time", (await has(X, "kangkong")) === 2 && JSON.stringify((await X.evaluate(`${W}.jar()`)).things) === '[["kangkong",1]]', await X.evaluate(`${W}.jar()`));
  await X.shot(`${OUT}/thanks-jar.png`);
  ok("nothing waits for anybody before the round turns", (await X.evaluate(`${W}.jar()`)).mine === null && (await Y.evaluate(`${W}.jar()`)).mine === null);

  // the uncle's round turns: the jar is shared to whoever worked for the others
  await X.evaluate(`${T}.skipRound()`);
  await sleep(500);
  await Y.evaluate(`${W}.open()`);
  await until("the other's share waits", () => there(Y, "[data-jar-mine]"), 8000);
  const jar = await Y.evaluate(`${W}.jar()`);
  ok("when the round has turned, all of it waits for the one who carried and watered for me", jar.coins === 0 && jar.things.length === 0 && jar.mine?.coins === 15 && JSON.stringify(jar.mine.things) === '[["kangkong",1]]', jar);
  ok("…and nothing for me, who only gave", (await X.evaluate(`${W}.jar()`)).mine === null);
  await Y.shot(`${OUT}/thanks-share.png`);
  await Y.evaluate(`document.querySelector("[data-jar-take]").click()`);
  await until("taken", async () => (await purse(Y)).coins === 15, 5000);
  ok("taken from the book: the coins and the thing are in their purse, and nothing waits", (await has(Y, "kangkong")) === 1 && !(await there(Y, "[data-jar-mine]")) && (await Y.evaluate(`${W}.jar()`)).mine === null, await purse(Y));
  const errors = [...X.logs, ...Y.logs].filter((l) => /Uncaught|Unhandled|TypeError|ReferenceError/.test(String(l)));
  ok("no page errors", errors.length === 0, errors.slice(0, 3));
} catch (e) {
  ok("the check ran", false, e.stack ?? e.message);
} finally {
  X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
