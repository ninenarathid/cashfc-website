// The stardust spice (the kitchen's fifth rank, lib/town/gifts), in a real browser on the dev test room, at a phone's
// width and a wide one: nothing of it in the bag's panel without the gift; with it, a jar that is held over the next
// bowl: the bag's "eat" then says it will sprinkle (only on a dish that leaves a buff), the bowl begun is a sprinkled
// one, and eaten up its buff is at the fourth level at once. Once a day; a bowl left half eaten loses it; and it is
// sprinkled on a bowl out of the basket the same.
//
//   node town-spice.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes spice-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", KP = "window.__townKeeper";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`, S = `document.querySelector("[data-town-spice]")`;
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
/** Take up the thing in a slot of the bag (its pocket in the panel). */
const pick = async (X, item) => { const slot = await slotOf(X, item); await X.evaluate(`(() => { const b = document.querySelectorAll('ul[aria-label="กระเป๋า"] > li')[${slot}].querySelector("button"); if (b.getAttribute("aria-pressed") !== "true") b.click(); })()`); await sleep(300); };
/** What the panel shows of the spice, and of the bag's own "eat". */
const seen = (X) => X.evaluate(`(() => { const s = ${S}, eat = ${TRADE}?.querySelector("[data-bag-eat]"), hold = s?.querySelector("[data-spice-hold]"), beat = document.querySelector("[data-basket-eat]");
  return { spice: s ? { state: s.dataset.state, left: Number(s.dataset.left), text: s.innerText.replace(/\\s+/g, " ").trim(), hold: hold ? { off: hold.disabled, on: hold.getAttribute("aria-pressed") === "true" } : null,
      fits: s.scrollWidth <= s.clientWidth + 1 } : null,
    eat: eat ? { text: eat.innerText.trim(), spiced: eat.dataset.spiced !== undefined, off: eat.disabled, icon: !!eat.querySelector("span[aria-hidden]"), label: eat.getAttribute("aria-label") } : null,
    basketEat: beat ? { text: beat.innerText.trim(), spiced: beat.dataset.spiced !== undefined } : null,
    levels: [...(${TRADE}?.querySelectorAll("[data-buff-level]") ?? [])].map((m) => Number(m.dataset.buffLevel)) }; })()`);
const openBag = async (X) => {
  if (await X.evaluate(`!!${TRADE}`)) return;
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 4000);
  await sleep(500);
};
const eatUp = async (X) => { await X.evaluate(`${T}.skipHours(0.1)`); await X.evaluate(`${T}.chew(0)`); await sleep(400); };

async function run(label, size) {
  console.log(`\n── ${label} ──`);
  const X = await browser(`Spice-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=P&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
    await sleep(500);
    await X.evaluate(`${T}.resize(10)`);
    // (ten in the morning by the trial's clock: breakfast's hours, with an hour of them ahead and lunch's after)
    const to = await X.evaluate(`(() => { const now = ${T}.now(), day = 86400000, bkk = 7 * 3600000; const at = Math.floor((now + bkk) / day) * day - bkk + 10 * 3600000; return ((at > now ? at : at + day) - now) / 3600000; })()`);
    await X.evaluate(`${T}.skipHours(${to})`);
    await X.evaluate(`(${T}.grant("tomYum", 4), ${T}.grant("grilledCorn", 1), ${T}.grant("friedMinnow", 2), ${T}.setStamina(20))`);
    // sat down where I stand (the map's own menu): a meal is eaten sitting
    await X.evaluate(`[...document.querySelectorAll("button[aria-expanded]")].find((b) => b.title === "ท่าทาง").click()`);
    await sleep(300);
    await X.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find((b) => /นั่งลง/.test(b.innerText)).click()`);
    await until("I am sat", async () => ((await X.evaluate(`window.__cashTown?.me?.().sit ?? -1`)) !== -1), 5000);
    await openBag(X);
    ok("without the gift the bag's panel has no spice", (await seen(X)).spice === null);

    await X.evaluate(`${T}.setGifts(["thingSpice"])`);
    await until("with it, the jar is in the bag's panel", async () => (await seen(X)).spice !== null, 4000);
    await pick(X, "tomYum");
    let s = await seen(X);
    ok("ready, once today; and eating is plain until it is held over a bowl", s.spice.state === "ready" && s.spice.left === 1 && s.spice.hold.on === false && s.eat.spiced === false && s.eat.label === null && s.spice.fits, s);
    await X.evaluate(`${S}.querySelector("[data-spice-hold]").click()`);
    await sleep(300);
    s = await seen(X);
    ok("held over the next bowl, the bag's own eat says it will sprinkle (the jar on it, and in words for a reader)", s.spice.state === "held" && s.spice.hold.on === true && s.eat.spiced === true && s.eat.icon === true && /โรยเครื่องเทศ/.test(s.eat.label ?? ""), s);
    await X.evaluate(`${S}.scrollIntoView({ block: "start" })`);
    await sleep(250);
    await X.shot(`${OUT}/spice-held-${label}.png`);
    await pick(X, "grilledCorn");
    s = await seen(X);
    ok("a dish that leaves no buff is eaten plain: there is nothing for the spice to raise", s.eat.spiced === false && s.eat.icon === false && s.spice.state === "held", s);
    const corn = await X.evaluate(`${KP}.spiceEat({ slot: ${await slotOf(X, "grilledCorn")} }, true)`);
    ok("…and the keeper itself does not sprinkle one: nothing begun, nothing counted", corn.ok === false && corn.why === "none" && (await purse(X)).eating === null && !(await purse(X)).gifts.used?.thingSpice, corn);

    await pick(X, "tomYum");
    await X.evaluate(`${TRADE}.querySelector("[data-bag-eat]").click()`);
    await until("a sprinkled bowl is being eaten", async () => (await purse(X)).eating?.dish === "tomYum", 4000);
    await sleep(400);
    let p = await purse(X);
    s = await seen(X);
    ok("the bowl begun is a sprinkled one: of this meal, counted once, and the panel says so", p.spiced?.from === p.eating.from && p.spiced.level === 4 && p.gifts.used.thingSpice.n === 1 && s.spice.state === "bowl" && s.spice.left === 0 && /ถ้วยนี้โรยแล้ว/.test(s.spice.text) && s.spice.hold.off === true, { spiced: p.spiced, s: s.spice });
    await X.evaluate(`${S}.scrollIntoView({ block: "center" })`);
    await sleep(250);
    await X.shot(`${OUT}/spice-bowl-${label}.png`);
    await eatUp(X);
    p = await purse(X);
    s = await seen(X);
    ok("eaten up, its buff is at the fourth level at once", p.eating === null && JSON.stringify(p.buffs.map((b) => [b.id, b.level])) === JSON.stringify([["hearty", 4]]) && JSON.stringify(s.levels) === JSON.stringify([4]), { buffs: p.buffs, levels: s.levels });
    ok("and the spice is used for today: it cannot be held again", s.spice.state === "spent" && s.spice.hold.off === true && /วันนี้ใช้แล้ว/.test(s.spice.text), s.spice);
    await X.evaluate(`${TRADE}.querySelector("[data-buff-level]").scrollIntoView({ block: "center" })`);
    await sleep(250);
    await X.shot(`${OUT}/spice-level4-${label}.png`);
    const again = await X.evaluate(`${KP}.spiceEat({ slot: ${await slotOf(X, "tomYum")} }, true)`);
    ok("the keeper itself refuses a second today, and begins no meal for it", again.ok === false && again.why === "spent" && (await purse(X)).eating === null, again);
    await pick(X, "tomYum");
    await X.evaluate(`${TRADE}.querySelector("[data-bag-eat]").click()`);
    await until("a plain bowl", async () => (await purse(X)).eating?.dish === "tomYum", 4000);
    await eatUp(X);
    ok("a plain bowl after it is plain (the buff is at its last level already)", (await purse(X)).buffs[0].level === 4 && (await purse(X)).gifts.used.thingSpice.n === 1);

    // the next day: held, sprinkled, and the bowl left half eaten
    await X.evaluate(`${T}.skipHours(24)`);
    await sleep(500);
    s = await seen(X);
    ok("the next day it is ready again", s.spice.state === "ready" && s.spice.left === 1, s.spice);
    await X.evaluate(`${S}.querySelector("[data-spice-hold]").click()`);
    await sleep(250);
    await pick(X, "tomYum");
    await X.evaluate(`${TRADE}.querySelector("[data-bag-eat]").click()`);
    await until("a sprinkled bowl again", async () => (await purse(X)).eating?.dish === "tomYum", 4000);
    await X.evaluate(`${KP}.getUp(0)`);
    await sleep(400);
    p = await purse(X);
    const clock = await X.evaluate(`${T}.now()`);
    ok("a bowl left before it is eaten forfeits its buff as ever, and the sprinkling with it", p.eating === null && (p.buffs ?? []).filter((b) => b.until > clock).length === 0 && p.gifts.used.thingSpice.n === 1 && (await seen(X)).spice.state === "spent", { buffs: p.buffs, used: p.gifts.used });

    // out of the basket, the same
    await X.evaluate(`(${T}.setGifts(["thingSpice", "thingBasket"]), ${T}.skipHours(24))`);
    await sleep(500);
    await X.evaluate(`${KP}.basketPut(${await slotOf(X, "friedMinnow")}, 2)`);
    await sleep(400);
    await X.evaluate(`${S}.querySelector("[data-spice-hold]").click()`);
    await sleep(250);
    await X.evaluate(`document.querySelector('[data-basket-cell="friedMinnow"]').click()`);
    await sleep(300);
    s = await seen(X);
    ok("held over a bowl of the basket's, its eat says it will sprinkle too", s.basketEat?.spiced === true && s.basketEat.text === "โรยแล้วกิน", s.basketEat);
    await X.evaluate(`document.querySelector("[data-basket-eat]").click()`);
    await until("a sprinkled bowl out of the basket", async () => (await purse(X)).eating?.dish === "friedMinnow", 4000);
    await eatUp(X);
    p = await purse(X);
    ok("…and eaten up, the fourth level", p.buffs.some((b) => b.id === "keen" && b.level === 4) && JSON.stringify(p.basket) === JSON.stringify([["friedMinnow", 1]]) && (await seen(X)).spice.hold.on === false, { buffs: p.buffs, basket: p.basket });
    ok("no page errors", (X.logs ?? []).filter((l) => !/favicon|Download the React DevTools/.test(l)).length === 0, X.logs);
  } finally { await X.close(); }
}

await run("phone", { width: 360, height: 780, mobile: true });
await run("wide", { width: 1280, height: 860 });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
