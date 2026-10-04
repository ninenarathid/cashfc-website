// Cash Town's well and its book, tried in a real browser on the dev test room (the trial kept in the browser, `next
// dev` only), by two testers in two tabs of one browser, who share its farm and its well:
//
// - standing at the farm's well a small book is offered, and nowhere else; opened, it says what I have carried, and
//   who carried today; Escape and walking off shut it;
// - a bucketful drawn at the river and poured into the well is mine in the book, and I am on today's list;
// - the other tester fills a can at the well and waters two plants with it: one of mine (my own water on my own
//   plant is not what the book counts) and one of somebody else's, which is my water reaching their plant; the
//   other's book says they watered two plants of two people's;
// - forty-nine bucketfuls carried is no rank; the fiftieth is one: the book says what I am called, the well has
//   something for me, and taking it puts a yoke in my bag, once;
// - the yoke draws two bucketfuls at the river and pours two into the well;
// - the other tester is told my rank (it is written under my name on their map).
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-well.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", W = "window.__townWell";
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const chore = (X) => X.evaluate(`${F}.chore()`);
const deed = (X) => X.evaluate(`${F}.deed()`);
const book = (X) => X.evaluate(`${W}?.book() ?? null`);
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(700); };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, b) => t + (b?.item === item ? b.n : 0), 0);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
/** One bucketful (or what the thing in the hand holds) from the river into the well. */
async function carry(X, thing) {
  await hold(X, thing);
  await warp(X, ...RIVER);
  await until("drawing is offered", async () => (await chore(X)) === "draw", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(400);
  await warp(X, ...WELL);
  await until("pouring is offered", async () => (await chore(X)) === "pour", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
}

const WELL = [157, 23], RIVER = [17, 42], MINE = "133,5", THEIRS = "134,5";
const X = await browser("Well", { width: 1280, height: 860 });
try {
  await enter(X, "W");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1), ${T}.grant("hoe", 1))`);
  const me = await X.evaluate(`${T}.id`);
  await warp(X, 133, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  ok("away from the well no book is offered", !(await there(X, "[data-well-chip]")));

  await X.evaluate(`${T}.letGo?.()`);
  await warp(X, ...WELL);
  await until("the book is offered at the well", () => there(X, "[data-well-chip]"), 8000);
  let b = await book(X);
  ok("at the well, with empty hands, a small book is offered and nothing else", (await chore(X)) === null && /สมุดบ่อน้ำ/.test(await textOf(X, "[data-well-chip]")), await textOf(X, "[data-well-chip]"));
  ok("nobody has carried anything: nothing poured, no rank, nobody on today's list", b && b.buckets === 0 && b.rank === 0 && b.gift === false && b.carriers.length === 0, b);
  await X.shot(`${OUT}/well-chip.png`);

  await X.evaluate(`document.querySelector("[data-well-chip]").click()`);
  await until("the book opens", () => there(X, "[data-well-panel]"), 5000);
  ok("opened, it says nobody has carried today, and I have no name yet", /ยังไม่มีใครหาบน้ำ/.test(await textOf(X, "[data-well-panel]")) && (await there(X, '[data-well-rank="0"]')) && !(await there(X, "[data-well-take]")), await textOf(X, "[data-well-panel]"));
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(300);
  ok("Escape shuts it, and the little book is back", !(await there(X, "[data-well-panel]")) && (await there(X, "[data-well-chip]")));

  // a bucketful carried
  await carry(X, "bucket");
  b = await book(X);
  ok("a bucketful poured into the well is mine in the book, and I am on today's list", b.buckets === 1 && b.today.buckets === 1 && b.carriers.length === 1 && b.carriers[0].id === me && b.carriers[0].buckets === 1, b);
  ok("with a bucket in the hand at the well, the book is offered above what the bucket does", (await there(X, "[data-well-chip]")), await chore(X));

  // two plants: one of mine, one of somebody else's; the other tester waters both with a can filled from my water
  const now = await X.evaluate(`${T}.now()`);
  const growing = (by) => ({ soil: "tilled", plant: { by, crop: "kangkong", sown: now - 3600000, boost: 0, watered: 0, fed: 0, guard: now + 2 * 86400000, cured: 0, picked: 0, pickedAt: 0 } });
  await X.evaluate(`(${T}.setPlot(${JSON.stringify(MINE)}, ${JSON.stringify(growing(me))}), ${T}.setPlot(${JSON.stringify(THEIRS)}, ${JSON.stringify(growing("somebody-else"))}))`);

  const Y = await X.tab("WellB");
  await enter(Y, "V");
  // (a browser made for this check: the second tester's purse is new, and the farm and the well are the first's)
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("can", 1))`);
  const other = await Y.evaluate(`${T}.id`);
  await warp(Y, ...WELL);
  await until("the farm's own code has come to the other", () => Y.evaluate(`!!${F}`), 20000);
  await hold(Y, "can");
  await until("filling is offered", async () => (await chore(Y)) === "fill", 5000);
  await Y.evaluate(`${F}.act()`);
  await sleep(400);
  for (const key of [MINE, THEIRS]) {
    await warp(Y, ...key.split(",").map(Number));
    await until(`watering ${key} is offered`, async () => (await deed(Y)) === "water", 5000);
    await Y.evaluate(`${F}.act()`);
    await sleep(450);
  }
  await warp(Y, ...WELL);
  await until("the other's book is offered", () => there(Y, "[data-well-chip]"), 8000);
  const theirs = await book(Y);
  ok("the other's book: nothing carried, two plants of two other people's watered", theirs.buckets === 0 && theirs.today.watered === 2 && theirs.today.helped === 2 && theirs.carriers[0]?.id === me, theirs);
  await until("my book has it", async () => (await book(X))?.today.waterings === 1, 8000);
  b = await book(X);
  ok("my book: my water was one watering, of one plant, of one person's (my own plant is not counted)", b.today.waterings === 1 && b.today.plants === 1 && b.today.people === 1, b.today);
  await X.evaluate(`${W}.open()`);
  await until("the book opens", () => there(X, "[data-well-panel]"), 5000);
  await X.shot(`${OUT}/well-book.png`);
  ok("opened, it says so in words", /รดไป 1 ครั้ง/.test(await textOf(X, "[data-well-today]")) && /1 ถัง/.test(await textOf(X, "[data-well-carriers]")), await textOf(X, "[data-well-panel]"));
  await X.evaluate(`${W}.close()`);

  // a rank, and what the well has for it
  await X.evaluate(`${T}.setCarried(49)`);
  await sleep(300);
  b = await book(X);
  ok("forty-nine bucketfuls is no rank, and nothing waits", b.buckets === 49 && b.rank === 0 && b.gift === false && !(await there(X, "[data-well-waiting]")), b);
  await carry(X, "bucket");
  await until("the fiftieth is counted", async () => (await book(X))?.buckets === 50, 5000);
  b = await book(X);
  ok("the fiftieth is the first rank: something waits at the well, and the little book shows it", b.rank === 1 && b.gift === true && (await there(X, "[data-well-waiting]")), b);
  await X.evaluate(`document.querySelector("[data-well-chip]").click()`);
  await until("the book opens", () => there(X, "[data-well-take]"), 5000);
  ok("the book says what I am called now", /คนหาบน้ำ/.test(await textOf(X, "[data-well-rank]")) && (await there(X, '[data-well-rank="1"]')), await textOf(X, "[data-well-rank]"));
  await X.shot(`${OUT}/well-gift.png`);
  await X.evaluate(`document.querySelector("[data-well-take]").click()`);
  await until("the yoke is in the bag", async () => (await has(X, "waterYoke")) === 1, 5000);
  ok("taken: a yoke is in the bag, the book says so, and nothing waits any more", /คานหาบน้ำ/.test(await textOf(X, "[data-well-note]")) && !(await there(X, "[data-well-take]")) && (await book(X)).gift === false, await textOf(X, "[data-well-note]"));
  const again = await X.evaluate(`${W}.take().then(() => ${T}.purse().bag.filter((s) => s?.item === "waterYoke").length)`);
  ok("once: asked again, there is still one", again === 1, again);
  await X.evaluate(`${W}.close()`);

  // the yoke carries two
  await hold(X, "waterYoke");
  await warp(X, ...RIVER);
  await until("drawing is offered with the yoke", async () => (await chore(X)) === "draw", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(400);
  ok("a yoke drawn at the river holds two bucketfuls", (await purse(X)).bag.find((s) => s?.item === "waterYoke")?.water === 2, (await purse(X)).bag);
  await warp(X, ...WELL);
  await until("pouring is offered with the yoke", async () => (await chore(X)) === "pour", 5000);
  await X.evaluate(`${F}.act()`);
  await until("two more are counted", async () => (await book(X))?.buckets === 52, 5000);
  ok("…and pours two into the well: fifty-two all told", (await book(X)).buckets === 52 && (await X.evaluate(`${F}.well()`)) >= 2, await book(X));
  await X.shot(`${OUT}/well-yoke.png`);

  // the other is told my rank
  await until("the other is told my rank", async () => (await Y.evaluate(`${W}?.ranks()?.[${JSON.stringify(me)}] ?? 0`)) === 1, 8000);
  ok("the other tester is told my rank, and has none", (await Y.evaluate(`${W}.ranks()`))[other] === undefined, await Y.evaluate(`${W}.ranks()`));
  // (a step aside, so that the two do not stand in each other: what I am called is under my name on their map)
  await warp(Y, 158, 24);
  await sleep(600);
  await Y.shot(`${OUT}/well-title.png`);

  // walking off shuts the book
  await X.evaluate(`${W}.open()`);
  await until("the book opens", () => there(X, "[data-well-panel]"), 5000);
  await warp(X, 150, 20);
  await sleep(500);
  ok("walking off shuts the book, and it is not offered away from the well", !(await there(X, "[data-well-panel]")) && !(await there(X, "[data-well-chip]")));
  const errors = X.logs.filter((l) => /Uncaught|Unhandled|TypeError|ReferenceError/.test(String(l)));
  ok("no page errors", errors.length === 0, errors.slice(0, 3));
} catch (e) {
  ok("the check ran", false, e.stack ?? e.message);
} finally {
  X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
