// The moon flask (the well's sixth rank, lib/town/well-gifts, components/town/TownMoon and moon-art), tried in a real
// browser on the dev test room (the trial kept in the browser, `next dev` only), by one tester under a dry sky and
// then under rain, and at a phone's width:
//
// - without the flask nothing of it is shown; the well's sixth rank is taken by the bucketfuls poured;
// - its plate under the clock says what it keeps: three places, empty at first;
// - plain water is not offered to it, and whoever keeps the game refuses it;
// - a yoke of rain water: "เก็บใส่ขวด" keeps three bucketfuls and leaves one, for nothing; a full flask keeps no
//   more; another water than it has is not mixed in, and the plate says so;
// - at the well, beside the bucket's own pour: a bucketful of the flask, or all of it; the well has the water's
//   nature three times as long (an hour and a half a bucketful), and a light goes up out of the well;
// - into a full well the nature is given all the same; a bucket of the same water poured after it shortens nothing;
// - with no stamina the pour is the short game of tired hands; not away from the well;
// - at a phone's width the plate and its buttons fit; with the town kept still nothing of it moves.
//
// Prints PASS/FAIL lines and writes moon-*.png to <outdir>.
//
//   node town-moon.mjs <base> <outdir>
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", M = "window.__townMoon", V = "window.__townView", F = "window.__townFarm";
const HOUR = 3_600_000, MIN = 60_000;
const purse = (X) => X.evaluate(`${T}.purse()`);
const stamina = (X) => X.evaluate(`(() => { const p = ${K}.purse(), now = ${K}.now(); const day = Math.floor((now + 2 * 3600000) / 86400000); return p.stamina.day === day ? p.stamina.left : 100; })()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText?.replace(/\\s+/g, " ").trim() ?? null`);
const boxOf = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return b ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; })()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const pips = (X) => X.evaluate(`[...document.querySelectorAll("[data-moon-pip]")].map((e) => e.dataset.moonPip === "full")`);
const wellWater = (X) => X.evaluate(`(() => { const w = ${K}.wellWater(); return w ? { kind: w.kind, mins: (w.until - ${K}.now()) / 60000 } : null; })()`);
const hourOf = (ms) => (((ms + 7 * HOUR) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) / HOUR;
/** A real mouse pressed on something of the page, at its middle. */
async function clickOn(X, sel) {
  const b = await boxOf(X, sel);
  if (!b) throw new Error(`nothing to press: ${sel}`);
  const at = { x: b.x + b.w / 2, y: b.y + b.h / 2, button: "left", clickCount: 1, pointerType: "mouse" };
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", ...at });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...at });
}
async function enter(X, letter, sky) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=wellgifts&townHour=12&townWeather=${sky}`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${K}`), 30000);
}
/** A chore with water done where I stand (with the short game of tired hands, when it comes up). */
async function chore(X, what) {
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 30000);
  await until(`${what} is offered`, async () => (await X.evaluate(`${F}.chore()`)) === what, 8000, 100);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
  if (await gameUp(X)) { await play(X); await sleep(600); }
}
const RIVER = [17, 42], WELL = [157, 23];

const X = await browser("Moon", { width: 1280, height: 860 });
try {
  // ── under a dry sky, at noon by the trial's clock: water drawn is plain ──
  await enter(X, "W", "clear");
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false), ${T}.setCarried(0))`);
  await sleep(400);
  await X.evaluate(`${T}.skipHours(${((12.05 - hourOf(Date.now())) % 24 + 24) % 24})`);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1), ${T}.grant("waterYokeGreat", 1), ${T}.setStamina(60), ${T}.setWell(5))`);
  ok("without the flask nothing of it is shown", !(await there(X, "[data-town-moon]")) && !(await there(X, "[data-well-gifts]")), await textOf(X, "[data-town-moon]"));
  await X.evaluate(`${T}.setCarried(5999)`);
  let did = await X.evaluate(`${K}.giftTake("well", 6)`);
  ok("with 5,999 bucketfuls poured the well's sixth rank is not reached", did.ok === false && did.why === "rank", did);
  await X.evaluate(`${T}.setCarried(6000)`);
  did = await X.evaluate(`${K}.giftTake("well", 6)`);
  await until("the flask's own code has come", () => X.evaluate(`!!${M}`), 60000);
  await until("its plate is shown", () => there(X, "[data-town-moon]"), 8000, 100);
  ok("with 6,000 its gift is taken: the moon flask, in no slot of the bag; its plate under the clock has three empty places", did.ok === true && did.gift === "thingMoon" && (await pips(X)).join() === "false,false,false"
     && (await X.evaluate(`document.querySelector("[data-town-moon]").dataset.townMoon`)) === "" && (await purse(X)).bag.filter(Boolean).length === 2, { did, pips: await pips(X) });
  await hold(X, "bucket");
  await warp(X, ...RIVER);
  await chore(X, "draw");
  await until("the bucket has water", async () => (await waterOf(X, "bucket")) === 1, 6000, 100);
  await sleep(400);
  did = await X.evaluate(`${K}.moonKeep()`);
  ok("plain water is not offered to the flask, and whoever keeps the game refuses it", (await X.evaluate(`${M}.kind()`)) === null && !(await there(X, "[data-moon-keep]")) && did.ok === false && did.why === "plain" && (await waterOf(X, "bucket")) === 1, [await X.evaluate(`${M}.kind()`), did]);
  await X.shot(`${OUT}/moon-empty.png`);

  // ── under rain: water drawn is the rain's ──
  await enter(X, "W", "rain");
  await until("the flask's own code has come", () => X.evaluate(`!!${M}`), 60000);
  await hold(X, "waterYokeGreat");
  await warp(X, ...RIVER);
  await chore(X, "draw");
  await until("the yoke has water", async () => (await waterOf(X, "waterYokeGreat")) === 4, 6000, 100);
  await until("keeping it is offered", () => there(X, '[data-moon-keep="rain"]'), 8000, 100).catch(() => {});
  ok("a yoke of rain water in the hand: the plate offers to keep it", (await X.evaluate(`${M}.kind()`)) === "rain" && (await X.evaluate(`${M}.canKeep()`)) === true && /เก็บใส่ขวด/.test((await textOf(X, "[data-moon-keep]")) ?? ""), [await X.evaluate(`${M}.kind()`), await textOf(X, "[data-moon-keep]")]);
  await X.shot(`${OUT}/moon-keep-offered.png`);
  const before = await stamina(X);
  await clickOn(X, "[data-moon-keep]");
  await until("it is kept", async () => (await purse(X)).moon?.n === 3, 6000, 50);
  let p = await purse(X);
  ok("a real mouse on \"เก็บใส่ขวด\": three bucketfuls go into the flask and one stays in the yoke, for no stamina", p.moon.kind === "rain" && p.moon.n === 3 && (await waterOf(X, "waterYokeGreat")) === 1 && (await stamina(X)) === before, { moon: p.moon, water: await waterOf(X, "waterYokeGreat") });
  ok("the plate shows what it keeps: three places filled, and the water's name", (await pips(X)).join() === "true,true,true" && /น้ำฝน/.test((await textOf(X, "[data-town-moon]")) ?? "") && (await X.evaluate(`document.querySelector("[data-town-moon]").dataset.townMoon`)) === "rain:3"
     && /เก็บน้ำฝนใส่ขวด 3 ถัง/.test((await textOf(X, "[data-moon-note]")) ?? ""), [await pips(X), await textOf(X, "[data-town-moon]")]);
  await X.shot(`${OUT}/moon-kept.png`);
  did = await X.evaluate(`${K}.moonKeep()`);
  ok("a flask that has its three is offered no more, and keeps no more", !(await there(X, "[data-moon-keep]")) && did.ok === false && did.why === "brim" && (await waterOf(X, "waterYokeGreat")) === 1, did);
  await X.evaluate(`${T}.setMoon("dawn", 1)`);
  await until("the plate says so", () => there(X, "[data-moon-other]"), 5000, 100).catch(() => {});
  did = await X.evaluate(`${K}.moonKeep()`);
  ok("another water than it has is not mixed in: the plate says the flask keeps another, and offers nothing", (await there(X, "[data-moon-other]")) && !(await there(X, "[data-moon-keep]")) && did.ok === false && did.why === "other", [await textOf(X, "[data-moon-other]"), did]);
  await X.evaluate(`${T}.setMoon("rain", 3)`);

  // ── at the well ──
  ok("away from the well nothing is offered to pour, and whoever keeps the game refuses", !(await there(X, "[data-moon-pour]")) && (await X.evaluate(`${K}.moonPour(1, [17, 42])`)).why === "none" && (await purse(X)).moon.n === 3, await X.evaluate(`${M}.canPour()`));
  await X.evaluate(`${T}.setWell(36)`);
  await warp(X, ...WELL);
  await until("pouring the flask is offered", () => there(X, '[data-moon-pour="1"]'), 8000, 100);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 30000);
  await until("the bucket's own pour is offered", async () => (await X.evaluate(`${F}.chore()`)) === "pour", 8000, 100);
  ok("at the well the flask's pour is offered beside the bucket's own: a bucketful, or all three", (await there(X, '[data-moon-pour="1"]')) && /เททั้งหมด 3/.test((await textOf(X, '[data-moon-pour="all"]')) ?? "") && (await there(X, '[data-farm-offer="pour"]')), [await textOf(X, "[data-town-moon]"), await X.evaluate(`${F}.offer()`)]);
  await X.shot(`${OUT}/moon-at-the-well.png`);
  const st = await stamina(X), book = await X.evaluate(`${K}.wellBook()?.buckets ?? 0`);
  await clickOn(X, '[data-moon-pour="1"]');
  await until("it is poured", async () => (await purse(X)).moon?.n === 2, 6000, 30);
  const lit = await X.evaluate(`${M}.lit()`);
  await sleep(350);
  await X.shot(`${OUT}/moon-poured.png`);
  let w = await wellWater(X);
  ok("a bucketful of the flask: the well has one more, the flask one fewer, for a pour's stamina", (await X.evaluate(`${K}.well()`)) === 37 && (await purse(X)).moon.n === 2 && (await stamina(X)) === st - 1 && (await pips(X)).join() === "true,true,false", [await X.evaluate(`${K}.well()`), await stamina(X)]);
  ok("the well has the rain's nature for an hour and a half of that one bucketful, where a bucket's gives half an hour", w?.kind === "rain" && w.mins > 89 && w.mins <= 90, w);
  ok("a light goes up out of the well, and the plate says what the well's water is and for how long", lit?.kind === "rain" && lit.n === 1 && /น้ำในบ่อเป็นน้ำฝนแล้ว · อีก 1 ชม. 30 นาที/.test((await textOf(X, "[data-moon-note]")) ?? ""), [lit, await textOf(X, "[data-moon-note]")]);
  ok("it is a bucketful poured in the well's book, like any", (await X.evaluate(`${K}.wellBook()?.buckets ?? 0`)) === book + 1, [book, await X.evaluate(`${K}.wellBook()?.buckets`)]);
  await sleep(3000);
  await clickOn(X, '[data-moon-pour="all"]');
  await until("it is all poured", async () => !("moon" in (await purse(X))), 6000, 30);
  w = await wellWater(X);
  ok("all of it: two more into the well, the flask empty, three hours more of the rain's nature", (await X.evaluate(`${K}.well()`)) === 39 && (await pips(X)).join() === "false,false,false" && !(await there(X, "[data-moon-pour]")) && w.kind === "rain" && w.mins > 265 && w.mins <= 270, [await X.evaluate(`${K}.well()`), w]);
  // a bucket of the same water poured after the flask: nothing is shortened
  await chore(X, "pour");
  await until("the yoke is poured", async () => (await waterOf(X, "waterYokeGreat")) === 0, 6000, 50);
  const after = await wellWater(X);
  ok("a bucket of the same water poured after it shortens nothing (a bucket's most alone is two hours)", (await X.evaluate(`${K}.well()`)) === 40 && after.kind === "rain" && after.mins > w.mins - 1, [w, after]);
  // into a full well
  await X.evaluate(`${T}.setMoon("moon", 2)`);
  await until("pouring the flask is offered", () => there(X, '[data-moon-pour="all"]'), 8000, 100);
  const full = await X.evaluate(`${K}.wellBook()?.buckets ?? 0`);
  await clickOn(X, '[data-moon-pour="all"]');
  await until("it is poured", async () => !("moon" in (await purse(X))), 6000, 30);
  w = await wellWater(X);
  ok("into a full well: the water runs over and nothing is counted, and the well takes the nature all the same (another takes the first one's place)", (await X.evaluate(`${K}.well()`)) === 40 && w.kind === "moon" && w.mins > 175 && w.mins <= 180 && (await X.evaluate(`${K}.wellBook()?.buckets ?? 0`)) === full, [w, full]);
  await sleep(700);
  await X.shot(`${OUT}/moon-full-well.png`);

  // ── tired hands ──
  await X.evaluate(`(${T}.setMoon("dawn", 1), ${T}.setStamina(0), ${T}.setWell(10))`);
  await until("pouring the flask is offered", () => there(X, '[data-moon-pour="1"]'), 8000, 100);
  await clickOn(X, '[data-moon-pour="1"]');
  await until("the game of tired hands is up", () => there(X, '[data-game="pouring"]'), 5000, 50).catch(() => {});
  ok("with no stamina the pour is the short game of tired hands, as any pour is", (await there(X, '[data-game="pouring"]')) && (await X.evaluate(`${M}.working()`)) === 1 && (await purse(X)).moon?.n === 1, await X.evaluate(`${M}.working()`));
  await X.shot(`${OUT}/moon-tired.png`);
  await play(X);
  await until("it is poured", async () => !("moon" in (await purse(X))), 8000, 50).catch(() => {});
  w = await wellWater(X);
  ok("…and played through, the flask is poured", !("moon" in (await purse(X))) && (await X.evaluate(`${K}.well()`)) === 11 && w.kind === "dawn", [await purse(X).then((q) => q.moon), w]);

  // ── at a phone's width, and with the town kept still ──
  const Z = await X.window("MoonPhone", { width: 360, height: 700, mobile: true });
  await Z.goto(`${BASE}/town`);
  await sleep(1500);
  await Z.evaluate(`localStorage.setItem("cashTown:motion", "off")`);
  await enter(Z, "U", "rain");
  await Z.evaluate(`(${T}.setGifts(["thingMoon", "famFrog"]), ${T}.resize(10), ${T}.grant("bucket", 1), ${T}.setMoon("moon", 2), ${T}.setWell(10), ${K}.familiarWear("famFrog"))`);
  await until("the flask's own code has come", () => Z.evaluate(`!!${M}`), 60000);
  await warp(Z, ...WELL);
  await until("pouring the flask is offered", () => there(Z, '[data-moon-pour="all"]'), 8000, 100);
  const [mb, pb, ab, fb] = [await boxOf(Z, "[data-town-moon]"), await boxOf(Z, '[data-moon-pour="1"]'), await boxOf(Z, '[data-moon-pour="all"]'), await boxOf(Z, "[data-town-frog]")];
  ok("at a phone's width the plate and its buttons fit, under the frog's sky, and the buttons are a finger's size", mb.x >= 0 && mb.x + mb.w <= 360 && pb.h >= 44 && ab.h >= 44 && ab.x + ab.w <= 360 && !!fb && mb.y >= fb.y + fb.h, { mb, pb, ab, fb });
  ok("with the town kept still nothing of it moves", await Z.evaluate(`(() => { const d = document.querySelector("[data-town-moon]"); const pip = d?.querySelector(".tmo-pip"); return !!d && d.hasAttribute("data-still") && !!pip && getComputedStyle(pip).animationName === "none"; })()`),
     await Z.evaluate(`document.querySelector("[data-town-moon]")?.outerHTML.slice(0, 200)`));
  await Z.shot(`${OUT}/moon-phone.png`);
  await Z.evaluate(`localStorage.setItem("cashTown:motion", "on")`);

  const errors = [...X.logs, ...Z.logs].filter((l) => !/favicon|ERR_|Failed to load resource|supabase|WebSocket|realtime/i.test(l));
  ok("no page threw", errors.length === 0, errors.slice(0, 4));
} catch (e) {
  ok("the check ran to its end", false, e.message);
} finally {
  X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
