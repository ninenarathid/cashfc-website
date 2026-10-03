// Cash Town's vegetable plots, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by two testers in two tabs of one browser, who share its farm:
//
// - a plot of weeds (of many kinds, scattered) is cleared and tilled with a hoe by the game of timing, a seed is sown,
//   and the bed is the sower's: its name plate says so, and the other tester can neither hoe, sow nor pick in it;
// - a watering can waters nothing until it is filled: a bucket is drawn at the river, poured into the farm's well,
//   and the can is filled there; the other tester may water too;
// - time is put forward until the plant is ripe, it is picked into the bag and bears again;
// - a bed nobody has tended for more than four days is anybody's again;
// - nothing is offered to a hand that holds the wrong thing; every go at the hoe is written down.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-farm.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm";
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const deed = (X) => X.evaluate(`${F}.deed()`);
const chore = (X) => X.evaluate(`${F}.chore()`);
const seen = (X, key) => X.evaluate(`${F}.seen(${JSON.stringify(key)})`);
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(700); };
const shown = (X, re) => X.evaluate(`[...document.querySelectorAll("button, p")].some((b) => ${re}.test(b.innerText))`);
/** Play the game of timing with a steady hand: press whenever the marker is well inside the stretch. */
async function swing(X) {
  await until("the game of timing is up", () => X.evaluate(`!!window.__townTiming`), 4000);
  const end = Date.now() + 40000;
  while (Date.now() < end) {
    const done = await X.evaluate(`(() => { const t = window.__townTiming; if (!t) return true; const r = t.round();
      if (r.at > r.lo + r.width * 0.2 && r.at < r.lo + r.width * 0.8) t.press(); return false; })()`);
    if (done) return true;
    await sleep(8);
  }
  return false;
}
const has = async (X, item) => (await purse(X)).bag.reduce((t, b) => t + (b?.item === item ? b.n : 0), 0);
/** Put the fertiliser that keeps pests off on the plant I stand at. */
async function guard(X) {
  await hold(X, "guardFert");
  await until("the fertiliser is offered", async () => (await deed(X)) === "feed", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
}
/** Clear a plot and till it, with the hoe. */
async function dig(X) {
  await hold(X, "hoe");
  for (const want of ["clear", "till"]) {
    await until(`the hoe is offered: ${want}`, async () => (await deed(X)) === want, 5000);
    await X.evaluate(`${F}.act()`);
    await swing(X);
    await sleep(400);
  }
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}

// A bed is seven plots by seven: the first begins at 132,4; the next along at 140,4.
const KEY = "133,5", WELL = [157, 23], RIVER = [17, 42];
const X = await browser("Farm", { width: 1280, height: 860 });
try {
  await enter(X, "M");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1), ${T}.grant("can", 1), ${T}.grant("seedKangkong", 3), ${T}.grant("rod", 1), ${T}.grant("bucket", 1), ${T}.grant("guardFert", 2))`);
  await warp(X, 133, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await sleep(900);
  ok("an untended plot is weeds", (await seen(X, KEY)).soil === "wild");
  // the weeds: many kinds, none to three on a plot, never the same row after row
  const weeds = await X.evaluate(`(() => { const all = []; for (let y = 4; y < 11; y++) for (let x = 132; x < 139; x++) all.push(${F}.weeds(x, y)); return all; })()`);
  const kinds = new Set(weeds.flat()), counts = new Set(weeds.map((w) => w.length));
  ok("the weeds are of many kinds, scattered: none, one, two or three to a plot", kinds.size >= 9 && counts.size >= 3 && Math.max(...counts) <= 3, { kinds: [...kinds], counts: [...counts] });
  ok("with nothing in the hand, nothing is offered", (await deed(X)) === null && !(await shown(X, "/ถางหญ้า|พรวนดิน|หว่านเมล็ด/")));
  await hold(X, "rod");
  ok("…nor with the wrong thing in it", (await deed(X)) === null);

  // the hoe: clear the weeds, then till, each by the game of timing
  await hold(X, "hoe");
  await until("the hoe's work is offered", async () => (await deed(X)) === "clear", 4000);
  await X.shot(`${OUT}/farm-weeds.png`);
  const before = (await purse(X)).stamina;
  await X.evaluate(`${F}.act()`);
  ok("the hoe's work is the game of timing", await swing(X));
  await until("the plot is cleared", async () => (await seen(X, KEY)).soil === "cleared", 4000);
  ok("three good swings clear the weeds, for stamina", (await deed(X)) === "till" && (await purse(X)).stamina.left < (before.day < 0 ? 100 : before.left), await purse(X));
  await X.evaluate(`${F}.act()`);
  await sleep(300);
  await X.shot(`${OUT}/farm-timing.png`);
  await swing(X);
  await until("the plot is tilled", async () => (await seen(X, KEY)).soil === "tilled", 4000);
  ok("three more till the soil, and the hoe has no more to do there", (await deed(X)) === null);

  // a seed: the bed is the sower's
  ok("nobody owns a bed nothing was sown in", (await X.evaluate(`${F}.owners()`)).length === 0);
  await hold(X, "seedKangkong");
  ok("a seed in the hand is offered tilled soil", (await deed(X)) === "sow");
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  let s = await seen(X, KEY), p = await purse(X);
  ok("it is sown: one seed gone, and only what was sown lies in the plot", s.crop === "kangkong" && s.stage === 1 && p.bag.find((b) => b?.item === "seedKangkong").n === 2, { s });
  ok("a plot with a plant in it takes no second seed", (await deed(X)) === null);
  // (kept from pests for a day: whether one comes hangs on the hour the check is run at, and one left six hours kills)
  await guard(X);
  ok("a fertiliser that keeps pests off is put on it", (await X.evaluate(`${F}.plots()`))[KEY].plant.guard > 0 && (await has(X, "guardFert")) === 1);
  let owners = await X.evaluate(`${F}.owners()`);
  ok("the whole bed is the first sower's, by name", owners.length === 1 && owners[0].bed === 0 && /M/.test(owners[0].name), owners);

  // water: a can as it is bought is empty
  await hold(X, "can");
  ok("a watering can is offered the plant", (await deed(X)) === "water");
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("…but an empty one waters nothing, and says there is no water", (await seen(X, KEY)).wet === false && (await shown(X, "/ไม่มีน้ำ/")));
  // a bucket, at the river
  await warp(X, ...RIVER);
  ok("by the river a can does nothing", (await chore(X)) === null);
  await hold(X, "bucket");
  await until("a bucket is offered the river", async () => (await chore(X)) === "draw", 5000);
  await X.shot(`${OUT}/farm-river.png`);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("a bucket is filled at the river", (await waterOf(X, "bucket")) === 1 && (await chore(X)) === null);
  // to the farm's well
  await warp(X, ...WELL);
  await until("a full bucket is offered the well", async () => (await chore(X)) === "pour", 5000);
  ok("the well begins empty", (await X.evaluate(`${F}.well()`)) === 0);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("…and poured into the farm's well", (await X.evaluate(`${F}.well()`)) === 1 && (await waterOf(X, "bucket")) === 0);
  await hold(X, "can");
  await until("a can is offered the well", async () => (await chore(X)) === "fill", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  const filled = await waterOf(X, "can");
  ok("the can is filled at the well, with a bucket of its water: five to ten waterings", filled >= 5 && filled <= 10 && (await X.evaluate(`${F}.well()`)) === 0 && (await chore(X)) === null, { filled });
  await X.shot(`${OUT}/farm-well.png`);
  await warp(X, 133, 5);
  await until("the can is offered the plant again", async () => (await deed(X)) === "water", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("with water in it the plant is watered: wet for the hour, one watering less in the can", (await seen(X, KEY)).wet === true && (await deed(X)) === null && (await waterOf(X, "can")) === filled - 1);
  await X.shot(`${OUT}/farm-sprout.png`);

  // a second plot of my bed, tilled, for the other tester to try
  await warp(X, 134, 5);
  await dig(X);
  ok("another plot of my own bed is mine to till", (await seen(X, "134,5")).soil === "tilled");

  // the other tester, in another tab of the same browser: the same farm
  const Y = await X.tab("FarmB");
  await enter(Y, "B");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1), ${T}.grant("can", 1), ${T}.grant("seedKangkong", 3), ${T}.setWell(3))`);
  await warp(Y, 134, 5);
  await until("the farm's own code has come to the other", () => Y.evaluate(`!!${F}`), 20000);
  await sleep(900);
  ok("the other tester sees the same farm, and whose the bed is", (await seen(Y, KEY)).crop === "kangkong" && (await Y.evaluate(`${F}.owners()`)).some((o) => o.bed === 0 && /M/.test(o.name)));
  await hold(Y, "seedKangkong");
  ok("in somebody's bed, a seed is offered nothing", (await deed(Y)) === null);
  await warp(Y, 135, 5);
  await hold(Y, "hoe");
  ok("…and a hoe nothing", (await deed(Y)) === null);
  // but they may water: with a can filled at the well
  await warp(Y, ...WELL);
  await hold(Y, "can");
  await until("the other's can is offered the well", async () => (await chore(Y)) === "fill", 5000);
  await Y.evaluate(`${F}.act()`);
  await sleep(400);
  await X.evaluate(`${T}.skipHours(1.1)`);
  await sleep(600);
  await warp(Y, 133, 5);
  await until("the other's can is offered my plant", async () => (await deed(Y)) === "water", 5000);
  await Y.evaluate(`${F}.act()`);
  await sleep(500);
  ok("anybody may water anybody's plant", (await seen(X, KEY)).wet === true);
  // a bed of their own, the next along
  await warp(Y, 140, 5);
  await dig(Y);
  await hold(Y, "seedKangkong");
  await Y.evaluate(`${F}.act()`);
  await sleep(500);
  owners = await X.evaluate(`${F}.owners()`);
  ok("a free bed is theirs once they sow in it: two beds, two owners", owners.length === 2 && owners.some((o) => o.bed === 1 && /B/.test(o.name)), owners);
  await warp(X, 136, 6);
  for (let i = 0; i < 3; i++) { await X.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 640, y: 380, deltaX: 0, deltaY: -240 }); await sleep(80); }
  await sleep(900);
  await X.shot(`${OUT}/farm-beds.png`);
  await warp(X, 133, 5);

  // time: its stages, and ripe
  await hold(X, "can");
  await X.evaluate(`${T}.skipHours(3)`);
  await sleep(700);
  s = await seen(X, KEY);
  ok("hours on it has grown, and can be watered again", s.stage >= 2 && !s.ripe && (await deed(X)) === "water", s);
  await X.evaluate(`${T}.skipHours(3)`);
  await sleep(700);
  s = await seen(X, KEY);
  ok("six hours on it is ripe, the last of its five stages", s.stage === 5 && s.ripe === true, s);
  await X.shot(`${OUT}/farm-ripe.png`);
  await warp(Y, 133, 5);
  await hold(Y, "hoe");
  ok("a ripe plant is not the other's to pick", (await deed(Y)) === null);
  await hold(X, "rod");
  ok("a ripe plant of my bed is picked whatever I hold", (await deed(X)) === "pick");
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  p = await purse(X);
  s = await seen(X, KEY);
  const got = p.bag.find((b) => b?.item === "kangkong")?.n ?? 0;
  ok("picked: two or three of it in the bag", got >= 2 && got <= 3, p.bag);
  ok("it bears again: back a stage, not ripe", s.crop === "kangkong" && s.stage === 4 && !s.ripe && (await deed(X)) === null, s);
  // (still under the day's cover from pests it was given when it was sown)
  await X.evaluate(`${T}.skipHours(12)`);
  await sleep(700);
  ok("…and ripe again half a day on", (await seen(X, KEY)).ripe === true && (await deed(X)) === "pick");

  // left alone for more than four days, a bed is anybody's again
  await X.evaluate(`${T}.skipHours(90)`);
  await sleep(900);
  ok("more than four days untended, the beds are nobody's", (await X.evaluate(`${F}.owners()`)).length === 0);
  await warp(Y, 134, 5);
  await hold(Y, "seedKangkong");
  await until("the tilled plot is offered the other's seed now", async () => (await deed(Y)) === "sow", 5000);
  await Y.evaluate(`${F}.act()`);
  await sleep(600);
  owners = await X.evaluate(`${F}.owners()`);
  ok("…and whoever sows in it next has it", owners.length === 1 && owners[0].bed === 0 && /B/.test(owners[0].name), owners);

  // every go at the hoe was written down
  const log = (await X.evaluate(`${T}.plays()`)).filter((l) => l.game === "farming");
  ok("the hoe's rounds are written down, with their hits and misses", log.length === 4 && log[0].what === "clear" && log[1].what === "till" && log.every((l) => l.hits === 3 && l.need === 3 && l.secs > 0), log);

  // a few more plots at their stages, to look at
  await X.evaluate(`${T}.reset()`);
  await sleep(400);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1))`);
  for (const [x, y, item] of [[133, 5, "seedKangkong"], [134, 5, "seedCorn"], [135, 5, "seedPumpkin"], [134, 6, "seedChili"], [135, 6, "seedTomato"], [133, 6, "seedCabbage"]]) {
    await X.evaluate(`${T}.grant(${JSON.stringify(item)}, 1)`);
    await warp(X, x, y);
    await dig(X);
    await hold(X, item);
    await X.evaluate(`${F}.act()`);
    await sleep(350);
  }
  await X.evaluate(`${T}.skipHours(30)`);
  await warp(X, 134, 8);
  await sleep(1200);
  await X.shot(`${OUT}/farm-plots.png`);

  // the test window's show garden: every vegetable at every stage, in the four beds round the well
  await X.evaluate(`${T}.showGarden("M")`);
  await sleep(700);
  const row = [];
  for (let i = 0; i < 5; i++) row.push(await seen(X, `${148 + i},12`));
  ok("the show garden has a row to each vegetable, from what was sown to ripe", row.every((r, i) => r.crop === "kangkong" && r.stage === i + 1) && row[4].ripe === true && !row[3].ripe, row);
  const planted = Object.entries(await X.evaluate(`${F}.plots()`)).filter(([, plot]) => plot.plant);
  ok("…twenty-six vegetables at five stages each, beside what was sown before", planted.length === 26 * 5 + 6 && new Set(planted.map(([, plot]) => plot.plant.crop)).size === 26, planted.length);
  ok("its four beds are mine", (await X.evaluate(`${F}.owners()`)).filter((o) => [8, 9, 14, 15].includes(o.bed) && /M/.test(o.name)).length === 4, await X.evaluate(`${F}.owners()`));
  await warp(X, 157, 22);
  await sleep(1500);
  await X.shot(`${OUT}/farm-garden.png`);
  await warp(X, 150, 15);
  await sleep(1500);
  await X.shot(`${OUT}/farm-garden-near.png`);
  // a week on, everything that was sown is ripe (or has been, and waits)
  await X.evaluate(`${T}.skipHours(24 * 13)`);
  await sleep(900);
  ok("thirteen days on, every one of them is ripe", (await Promise.all(planted.filter(([key]) => !["133,5", "134,5", "135,5", "134,6", "135,6", "133,6"].includes(key)).map(([key]) => seen(X, key)))).every((r) => r.ripe && r.stage === 5));
  await X.evaluate(`${T}.clearFarm()`);
  await sleep(500);
  ok("the farm is cleared again", Object.keys(await X.evaluate(`${F}.plots()`)).length === 0 && (await X.evaluate(`${F}.owners()`)).length === 0);
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs]);
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
