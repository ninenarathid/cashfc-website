// The dimension basket (the kitchen's second rank, lib/town/gifts), in a real browser on the dev test room, at a
// phone's width and a wide one: nothing of it in the bag's panel without the gift; with it, twelve places; a helping
// is put in from the bag by a tap and leaves the bag's slot; the thirteenth is refused; a dish taken up is taken
// back out, and eaten straight from the basket once sitting (refused standing, with the reason said), as one of this
// meal's hours' helpings, its bowl back at the end and its buff left.
//
//   node town-basket.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes basket-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", KP = "window.__townKeeper";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`, B = `document.querySelector("[data-town-basket]")`;
const purse = (X) => X.evaluate(`${T}.purse()`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const tap = async (X, what) => { await X.evaluate(`${B}.querySelector('${what}').click()`); await sleep(350); };
/** What the panel shows of the basket: its count, the dish in each place, what is taken up, and what the bag offers it. */
const seen = (X) => X.evaluate(`(() => { const b = ${B}; if (!b) return null; return {
  n: Number(b.dataset.in), holds: Number(b.dataset.holds), count: b.querySelector("[data-basket-count]")?.innerText.replace(/\\s+/g, " ").trim(),
  cells: [...b.querySelectorAll("[data-basket-cell]")].map((c) => c.dataset.basketCell), picked: b.querySelector("[data-basket-picked]")?.dataset.basketPicked ?? null,
  from: Object.fromEntries([...b.querySelectorAll("[data-basket-put]")].map((c) => [c.dataset.basketPut, c.disabled])),
  eat: b.querySelector("[data-basket-eat]") ? !b.querySelector("[data-basket-eat]").disabled : null, text: b.innerText.replace(/\\s+/g, " "),
  wide: b.getBoundingClientRect().width, over: b.scrollWidth > b.clientWidth + 1 }; })()`);
const openBag = async (X) => {
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 4000);
  await sleep(500);
};

async function run(label, size) {
  console.log(`\n── ${label} ──`);
  const X = await browser(`Basket-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=K&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
    await sleep(500);
    await X.evaluate(`${T}.resize(10)`);
    // (noon by the trial's clock, whatever the hour is: lunch's hours, with five of them ahead)
    const to = await X.evaluate(`(() => { const now = ${T}.now(), day = 86400000, bkk = 7 * 3600000; const at = Math.floor((now + bkk) / day) * day - bkk + 12 * 3600000; return ((at > now ? at : at + day) - now) / 3600000; })()`);
    await X.evaluate(`${T}.skipHours(${to})`);
    await X.evaluate(`(${T}.grant("tomYum", 8), ${T}.grant("friedMinnow", 4), ${T}.grant("oddDish", 2), ${T}.grant("minnow", 3), ${T}.setStamina(20))`);
    await openBag(X);
    ok("without the gift the bag's panel has no basket", (await seen(X)) === null);

    await X.evaluate(`${T}.setGifts(["thingBasket"])`);
    await until("with it, the basket is in the bag's panel", async () => (await seen(X)) !== null, 4000);
    let s = await seen(X);
    ok("twelve places, all empty, and the bag's helpings offered to it (food only: no fish)", s.holds === 12 && s.n === 0 && s.cells.length === 12 && s.cells.every((c) => c === "")
      && JSON.stringify(Object.keys(s.from).sort()) === JSON.stringify(["friedMinnow", "oddDish", "tomYum"]) && /0 \/ 12/.test(s.count), s);
    await tap(X, '[data-basket-put="tomYum"]');
    s = await seen(X);
    ok("a tap puts one helping in: it is in a place of the basket and out of the bag", s.n === 1 && s.cells[0] === "tomYum" && (await has(X, "tomYum")) === 7 && JSON.stringify((await purse(X)).basket) === JSON.stringify([["tomYum", 1]]), s);
    await tap(X, "[data-basket-all]");
    await until("everything that fits goes in", async () => (await seen(X)).n === 12, 6000);
    s = await seen(X);
    const p = await purse(X);
    ok("put all in fills its twelve places and no more: the rest stays in the bag", s.n === 12 && s.cells.every((c) => c !== "") && p.basket.reduce((t, [, n]) => t + n, 0) === 12
      && (await has(X, "tomYum")) + (await has(X, "friedMinnow")) + (await has(X, "oddDish")) === 2 && /12 \/ 12/.test(s.count), { s, basket: p.basket });
    ok("…in no slot of the bag: the bag holds what is left and the fish", p.bag.filter(Boolean).length <= 3, p.bag);
    ok("full, nothing more is offered to it", Object.values(s.from).every((off) => off === true), s.from);
    const more = await X.evaluate(`${KP}.basketPut(${p.bag.findIndex((b) => b && b.item !== "minnow")}, 1)`);
    ok("a thirteenth is refused, and nothing is lost", more.ok === false && more.why === "full" && (await seen(X)).n === 12, more);
    ok("at this width the basket fits its panel", s.over === false && s.wide <= size.width, { wide: s.wide, over: s.over });
    await X.evaluate(`${B}.scrollIntoView({ block: "center" })`);
    await sleep(300);
    await X.shot(`${OUT}/basket-full-${label}.png`);

    // ── a dish taken up: back out, or eaten ──
    await tap(X, '[data-basket-cell="tomYum"]');
    s = await seen(X);
    ok("a tap on a place takes its dish up; standing, eating is not offered and the reason is said", s.picked === "tomYum" && s.eat === false && /นั่งลงก่อน|นั่ง/.test(s.text), s);
    const inBag = await has(X, "tomYum");
    await tap(X, "[data-basket-take]");
    s = await seen(X);
    ok("taken out, a helping is back in the bag and its place is free", s.n === 11 && (await has(X, "tomYum")) === inBag + 1, s);
    const stood = await X.evaluate(`${KP}.basketEat("tomYum", false)`);
    ok("the keeper itself refuses a meal standing", stood.ok === false && stood.why === "stand", stood);
    // sit down where I stand (the map's own menu), then eat from the basket
    await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "ปิด" || b.innerText.trim() === "ปิด").click()`);
    await sleep(300);
    await X.evaluate(`[...document.querySelectorAll("button[aria-expanded]")].find((b) => b.title === "ท่าทาง").click()`);
    await sleep(300);
    await X.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find((b) => /นั่งลง/.test(b.innerText)).click()`);
    await until("I am sat", async () => ((await X.evaluate(`window.__cashTown?.me?.().sit ?? -1`)) !== -1), 5000);
    await openBag(X);
    await tap(X, '[data-basket-cell="tomYum"]');
    s = await seen(X);
    ok("sitting, the dish taken up can be eaten", s.eat === true, s);
    const before = await purse(X), bowls = await has(X, "bowl");
    await tap(X, "[data-basket-eat]");
    await until("a helping out of the basket is being eaten", async () => (await purse(X)).eating?.dish === "tomYum", 4000);
    let q = await purse(X);
    ok("…one of this meal's hours' helpings, out of the basket and not the bag", q.meals.bowls[1] === 1 && q.basket.find(([d]) => d === "tomYum")[1] === before.basket.find(([d]) => d === "tomYum")[1] - 1 && (await has(X, "tomYum")) === inBag + 1, { meals: q.meals, basket: q.basket });
    await sleep(400);
    await X.evaluate(`${B}.scrollIntoView({ block: "center" })`);
    await X.shot(`${OUT}/basket-eating-${label}.png`);
    await X.evaluate(`${T}.skipHours(0.1)`);
    await X.evaluate(`${T}.chew(0)`);
    await sleep(300);
    q = await purse(X);
    ok("eaten up, it leaves its buff and gives its bowl back, as a helping out of the bag does", q.eating === null && JSON.stringify(q.buffs?.map((b) => [b.id, b.level])) === JSON.stringify([["hearty", 1]]) && (await has(X, "bowl")) === bowls + 1 && q.stamina.left > 20, { buffs: q.buffs, stamina: q.stamina });
    ok("no page errors", (X.logs ?? []).filter((l) => !/favicon|Download the React DevTools/.test(l)).length === 0, X.logs);
  } finally { await X.close(); }
}

await run("phone", { width: 360, height: 780, mobile: true });
await run("wide", { width: 1280, height: 860 });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
