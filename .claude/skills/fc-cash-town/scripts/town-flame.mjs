// The phoenix flame in a bottle (the kitchen's sixth rank, lib/town/gifts), in a real browser on the dev test room,
// at a wide screen and a phone's. A stove anywhere: with no flame nothing lays a kitchen table away from the yard;
// with it, the bag's panel sets its stove where its owner stands (the plaza, and the forest: another map), the table
// is laid over the flame, and walking off puts it out; sitting, there is nowhere to set it. And what comes to nothing
// comes back: with the flame set to guard the pot, things that are no recipe's are all in the bag again (the stamina
// paid, the taste told), three times a day; a real recipe is cooked as ever and costs none of the three; with the
// guard off, an odd dish as ever.
//
//   node town-flame.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes flame-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", C = "window.__townCook", G = "window.__townGame", K = `document.querySelector("[data-town-kitchen]")`;
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]], WRONG = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["hyacinth", 1]];
const tap = async (X, what) => { await X.evaluate(`${K}.querySelector('${what}').click()`); await sleep(260); };
const warp = async (X, [x, y]) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(900); };
const purse = (X) => X.evaluate(`${T}.purse()`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
/** What the table shows: where it is laid, the flame's guard, and the card of what came of a go. */
const seen = (X) => X.evaluate(`(() => { const k = ${K}; if (!k) return null; const stage = k.querySelector("[data-kitchen-stage]"), f = k.querySelector("[data-kitchen-flame]"), came = k.querySelector("[data-kitchen-came]");
  const sb = stage.getBoundingClientRect(), fb = f?.getBoundingClientRect();
  return { place: stage.dataset.kitchenStage, word: k.querySelector("header").innerText.replace(/\\s+/g, " "), phoenix: !!k.querySelector("[data-kitchen-phoenix]"),
    guard: f ? { left: Number(f.dataset.left), armed: f.dataset.armed !== undefined, off: f.disabled, fits: fb.right <= sb.right + 1 && fb.bottom <= sb.bottom + 1 && fb.width >= 44 && fb.height >= 44 } : null,
    came: came ? { kind: came.dataset.kitchenCame, taste: came.querySelector("[data-kitchen-taste]")?.dataset.kitchenTaste ?? null, text: came.innerText.replace(/\\s+/g, " ") } : null, over: k.scrollWidth > k.clientWidth + 1 }; })()`);
const openBag = async (X) => {
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 4000);
  await sleep(500);
};
/** Cook what is in the pot by hand: the game laid, the ladle taken round at a steady pace, the card waited for. */
const cookIt = async (X) => {
  await tap(X, "[data-kitchen-go]");
  await until("the game is laid", () => X.evaluate(`!!${G}`), 5000);
  await X.evaluate(`${G}.drive(0.9)`);
  await until("the go is over", async () => (await seen(X))?.came != null, 40000);
  await sleep(300);
};

async function run(label, size) {
  console.log(`\n── ${label} ──`);
  const X = await browser(`Flame-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=F&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
    await sleep(500);
    await X.evaluate(`${T}.resize(20)`);
    await X.evaluate(`(() => { for (const [id, n] of [["snakehead", 3], ["tomato", 6], ["chili", 6], ["scallion", 1], ["hyacinth", 3], ["pot", 1]]) ${T}.grant(id, n); ${T}.setStamina(100); })()`);
    const home = await X.evaluate(`window.__townView.self()`);
    // (a few steps off where the tester comes in, which is the fountain's own tile: somewhere the ground is seen)
    await warp(X, [Math.floor(home.x) + 4, Math.floor(home.y) + 5]);
    // ── a stove anywhere ──
    ok("away from the yard nothing offers a kitchen table", !(await X.evaluate(`${C}.offers()`)).includes("cook") && (await seen(X)) === null);
    await X.evaluate(`${C}.stove()`);
    await sleep(700);
    ok("with no flame, asking for a stove lays nothing", (await seen(X)) === null && (await X.evaluate(`${C}.stoveSet()`)) === false);
    await openBag(X);
    ok("…and the bag's panel has nothing of one", (await X.evaluate(`!!document.querySelector("[data-town-flame]")`)) === false);
    await X.evaluate(`${T}.setGifts(["thingFlame"])`);
    await until("with it, the bottle is in the bag's panel", () => X.evaluate(`!!document.querySelector("[data-town-flame]")`), 4000);
    const row = await X.evaluate(`(() => { const f = document.querySelector("[data-town-flame]"); return { left: Number(f.dataset.left), fits: f.scrollWidth <= f.clientWidth + 1, text: f.innerText.replace(/\\s+/g, " ") }; })()`);
    ok("three givings back today, and a way to set its stove here", row.left === 3 && row.fits && /ตั้งเตาตรงนี้/.test(row.text), row);
    await X.evaluate(`document.querySelector("[data-town-flame]").scrollIntoView({ block: "center" })`);
    await sleep(250);
    await X.shot(`${OUT}/flame-bag-${label}.png`);
    await X.evaluate(`document.querySelector("[data-flame-stove]").click()`);
    await until("the kitchen table is laid over the flame", async () => (await seen(X))?.place === "flame", 5000);
    await sleep(500);
    let s = await seen(X);
    ok("in the plaza: the bag is put away and the kitchen table is laid over the phoenix flame", s.place === "flame" && s.phoenix && /บนเปลวฟีนิกซ์/.test(s.word) && (await X.evaluate(`!${TRADE}`)) && (await X.evaluate(`${C}.stoveSet()`)) === true && s.over === false, s);
    ok("the flame is set to guard the pot, three times today", s.guard?.armed === true && s.guard.left === 3 && s.guard.fits === true, s.guard);

    // ── what comes to nothing comes back ──
    await tap(X, '[data-kitchen-tool="pot"]');
    await X.evaluate(`${C}.put(${JSON.stringify(WRONG)})`);
    await sleep(300);
    await X.shot(`${OUT}/flame-table-${label}.png`);
    const before = await purse(X);
    await cookIt(X);
    s = await seen(X);
    let p = await purse(X);
    ok("things that are no recipe's come to nothing, and the flame gives every one back", s.came.kind === "back" && /เปลวฟีนิกซ์คืนของให้ครบ/.test(s.came.text) && JSON.stringify(p.bag) === JSON.stringify(before.bag) && !p.bag.some((b) => b?.item === "potFull"), { came: s.came, bag: p.bag });
    ok("…the taste is told and the stamina paid, as for any guess; one of the day's three is used", s.came.taste === "swap" && p.stamina.left === before.stamina.left - 4 && p.gifts.used.thingFlame.n === 1 && p.tries?.tomYum === 1, { taste: s.came.taste, stamina: p.stamina, used: p.gifts.used, tries: p.tries });
    await X.shot(`${OUT}/flame-back-${label}.png`);
    await tap(X, "[data-kitchen-again]");
    ok("back at the table, two are left", (await seen(X)).guard.left === 2 && (await seen(X)).guard.armed === true, (await seen(X)).guard);
    // a real recipe costs none of them
    await X.evaluate(`${C}.put(${JSON.stringify(TOMYUM)})`);
    await sleep(300);
    await cookIt(X);
    s = await seen(X);
    p = await purse(X);
    ok("a real recipe is cooked as ever, and costs none of the three", s.came.kind === "found" && p.bag.some((b) => b?.item === "potFull" && b.of.dish === "tomYum") && p.gifts.used.thingFlame.n === 1, { came: s.came, used: p.gifts.used });
    await tap(X, "[data-kitchen-again]");
    // the guard off: an odd dish, as ever
    await tap(X, "[data-kitchen-flame]");
    ok("the guard can be put off for a guess not worth one", (await seen(X)).guard.armed === false);
    await X.evaluate(`${C}.put([["hyacinth", 2]])`);
    await sleep(300);
    await cookIt(X);
    s = await seen(X);
    p = await purse(X);
    ok("with the guard off, things that are no recipe's are a pot of the odd dish, and gone", s.came.kind === "odd" && (await has(X, "hyacinth")) === 1 && p.bag.some((b) => b?.item === "potFull" && b.of.dish === "oddDish") && p.gifts.used.thingFlame.n === 1, { came: s.came, used: p.gifts.used });
    await X.evaluate(`${C}.shut()`);
    await sleep(400);
    ok("the table put away, the stove still stands where I stand (and is offered again)", (await X.evaluate(`${C}.stoveSet()`)) === true && (await X.evaluate(`${C}.offers()`)).includes("cook"));
    await X.shot(`${OUT}/flame-map-${label}.png`);

    // ── walking off puts it out; another map; sitting ──
    await warp(X, [Math.floor(home.x) + 6, Math.floor(home.y) + 5]);
    ok("walking off puts the stove out", (await X.evaluate(`${C}.stoveSet()`)) === false && !(await X.evaluate(`${C}.offers()`)).includes("cook"));
    await warp(X, [144 + 48, 112 + 66]);
    await X.evaluate(`${C}.stove()`);
    await until("in the forest, the table is laid over the flame too", async () => (await seen(X))?.place === "flame", 6000);
    ok("on another map (the forest) its stove is set the same", (await X.evaluate(`${C}.stoveSet()`)) === true && (await seen(X)).phoenix === true);
    await sleep(400);
    await X.shot(`${OUT}/flame-forest-${label}.png`);
    await X.evaluate(`${C}.shut()`);
    await sleep(500);
    await X.shot(`${OUT}/flame-forest-map-${label}.png`);
    await X.evaluate(`[...document.querySelectorAll("button[aria-expanded]")].find((b) => b.title === "ท่าทาง").click()`);
    await sleep(300);
    await X.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find((b) => /นั่งลง/.test(b.innerText)).click()`);
    await until("I am sat", async () => ((await X.evaluate(`window.__cashTown?.me?.().sit ?? -1`)) !== -1), 5000);
    await sleep(300);
    ok("sitting down puts it out", (await X.evaluate(`${C}.stoveSet()`)) === false);
    await X.evaluate(`${C}.stove()`);
    await sleep(3200);
    ok("…and sitting there is nowhere to set one: nothing is laid, and it is said so", (await seen(X)) === null && /ตั้งเตาไม่ได้/.test((await X.evaluate(`${C}.note()`)) ?? ""), await X.evaluate(`${C}.note()`));
    // at a stove of the yard's the table is the yard's own
    const places = await X.evaluate(`${C}.places()`);
    await X.evaluate(`[...document.querySelectorAll("button[aria-expanded]")].find((b) => b.title === "ท่าทาง").click()`);
    await sleep(300);
    await X.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find((b) => /ลุกขึ้น/.test(b.innerText))?.click()`);
    await sleep(300);
    await warp(X, places.find((q) => q.kind === "stove").at);
    await X.evaluate(`${C}.stove()`);
    await until("at the yard's stove the table is laid", async () => (await seen(X)) !== null, 6000);
    s = await seen(X);
    ok("at a stove of the yard's the table is the yard's own, with the flame's guard beside it", s.place === "stove" && s.phoenix === false && s.guard?.left === 2 && (await X.evaluate(`${C}.stoveSet()`)) === false, s);
    ok("no page errors", (X.logs ?? []).filter((l) => !/favicon|Download the React DevTools/.test(l)).length === 0, X.logs);
  } finally { await X.close(); }
}

await run("wide", { width: 1280, height: 860 });
await run("phone", { width: 360, height: 780, mobile: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
