// The whispering spoon (the kitchen's third rank, lib/town/gifts), in a real browser on the dev test room, at a wide
// screen and a phone's: nothing of it at the kitchen table without the gift; with it, a spoon by the hearth with its
// three answers of the day; asked of what is in the pot it tells the secret thing of the recipe the pot is on the way
// to (the nearest done, where it could still be more than one, saying how many), names the recipe only where the
// book has it, and that recipe is read whole from then on; asked where there is nothing to tell it is silent and not
// counted; after three it answers no more today. To its owner only: nothing is said to the room.
//
//   node town-spoon.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes spoon-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", C = "window.__townCook", K = `document.querySelector("[data-town-kitchen]")`;
const tap = async (X, what) => { await X.evaluate(`${K}.querySelector('${what}').click()`); await sleep(260); };
const warp = async (X, [x, y]) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(800); };
/** What the table shows of the spoon: its button (how many answers are left, whether it can be asked), what it told, the table's own word of a no, and the pinned recipe's lines. */
const seen = (X) => X.evaluate(`(() => { const k = ${K}, b = k.querySelector("[data-kitchen-spoon]"), w = k.querySelector("[data-kitchen-whisper]"), page = k.querySelector("[data-kitchen-page]");
  const box = w?.getBoundingClientRect(), stage = k.querySelector("[data-kitchen-stage]").getBoundingClientRect();
  return { spoon: b ? { left: Number(b.dataset.left), off: b.disabled, pips: b.querySelectorAll("span > span").length } : null,
    whisper: w ? { secret: w.dataset.kitchenWhisper, of: w.dataset.of, ways: Number(w.dataset.ways), text: w.innerText.replace(/\\s+/g, " ").trim(), fits: box.left >= stage.left - 1 && box.right <= stage.right + 1 && box.bottom <= stage.bottom + 1 && box.top >= stage.top - 1 && w.scrollWidth <= w.clientWidth + 1 } : null,
    why: k.querySelector("[data-kitchen-why]").innerText.trim(),
    page: page ? { id: page.dataset.kitchenPage, lines: [...page.querySelectorAll("[data-kitchen-line]")].map((l) => l.dataset.kitchenLine), secret: !!page.querySelector("[data-secret]") } : null }; })()`);

async function run(label, size) {
  console.log(`\n── ${label} ──`);
  const X = await browser(`Spoon-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=S&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
    await sleep(500);
    await X.evaluate(`${T}.resize(20)`);
    await X.evaluate(`(() => { for (const [id, n] of [["snakehead", 1], ["tomato", 2], ["chili", 2], ["minnow", 4], ["pot", 1], ["hyacinth", 2]]) ${T}.grant(id, n); ${T}.learn("tomYum"); })()`);
    const places = await X.evaluate(`${C}.places()`);
    await warp(X, places.find((p) => p.kind === "stove").at);
    await until("the kitchen table is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook"), 6000);
    await X.evaluate(`${C}.act("cook")`);
    await until("the kitchen table is laid", () => X.evaluate(`${C}.open() && !!${K}`), 5000);
    await sleep(500);
    await tap(X, '[data-kitchen-tool="pot"]');
    await tap(X, '[data-kitchen-recipe="tomYum"]');
    let s = await seen(X);
    ok("without the gift there is no spoon at the table; the recipe hides its last thing", s.spoon === null && s.page?.id === "tomYum" && s.page.secret === true && !s.page.lines.includes("scallion"), s);

    await X.evaluate(`${T}.setGifts(["thingSpoon"])`);
    await until("with it, a spoon by the hearth", async () => (await seen(X)).spoon !== null, 4000);
    s = await seen(X);
    ok("three answers today, and nothing to ask of an empty pot", s.spoon.left === 3 && s.spoon.pips === 3 && s.spoon.off === true, s.spoon);
    await tap(X, '[data-kitchen-thing="snakehead"]');
    await tap(X, '[data-kitchen-thing="tomato"]');
    ok("with something in the pot it can be asked", (await seen(X)).spoon.off === false);
    await tap(X, "[data-kitchen-spoon]");
    await until("the spoon whispers", async () => (await seen(X)).whisper !== null, 4000);
    await sleep(700);
    s = await seen(X);
    ok("it tells the secret thing of the recipe the pot is on the way to, by its name where the book has the recipe", s.whisper.secret === "scallion" && s.whisper.of === "tomYum" && s.whisper.ways === 1 && /ต้นหอม/.test(s.whisper.text) && /ต้มยำ/.test(s.whisper.text), s.whisper);
    ok("…on a slip that fits the hearth at this width", s.whisper.fits === true, s.whisper);
    ok("one answer of the day is gone", s.spoon.left === 2 && (await X.evaluate(`${T}.purse().gifts.used.thingSpoon.n`)) === 1, s.spoon);
    ok("and the recipe is read whole from then on: its last thing is a line like the others", s.page.secret === false && s.page.lines.includes("scallion") && JSON.stringify((await X.evaluate(`${T}.purse().whispers`))) === JSON.stringify(["tomYum"]), s.page);
    await X.shot(`${OUT}/spoon-told-${label}.png`);
    ok("nothing of it is said to the room", (await X.evaluate(`window.__cashTown?.said?.() ?? null`)) === null);
    await tap(X, "[data-kitchen-whisper]");
    s = await seen(X);
    ok("a tap puts the slip away", s.whisper === null && s.spoon.off === false, s);

    // nothing more to tell of this pot: silent, and not counted
    await tap(X, "[data-kitchen-spoon]");
    await sleep(500);
    s = await seen(X);
    ok("asked again of a pot whose recipe is read whole, it is silent and not counted", s.whisper === null && /ช้อนเงียบ/.test(s.why) && s.spoon.left === 2, s);
    await X.evaluate(`${C}.put([["hyacinth", 1], ["snakehead", 1]])`);
    await sleep(300);
    await tap(X, "[data-kitchen-spoon]");
    await sleep(500);
    s = await seen(X);
    ok("of a pot no recipe has, silent too", s.whisper === null && /ไม่มีสูตร/.test(s.why) && s.spoon.left === 2, s);

    // a pot that could still be two recipes, neither in the book
    await X.evaluate(`${C}.put([["minnow", 3]])`);
    await sleep(300);
    await tap(X, "[data-kitchen-spoon]");
    await until("the spoon whispers again", async () => (await seen(X)).whisper !== null, 4000);
    await sleep(600);
    s = await seen(X);
    ok("where the pot could still be two recipes it answers for the nearest done and says there are two; a recipe not in the book is not named", s.whisper.secret === "salt" && s.whisper.ways === 2 && s.whisper.of === ""
      && /ยังไม่อยู่ในสมุด/.test(s.whisper.text) && !/ปลาซิวทอด|น้ำปลา/.test(s.whisper.text.replace(/ชิ้นลับคือ\S*\s*\S+/, "")), s.whisper);
    await X.shot(`${OUT}/spoon-two-ways-${label}.png`);
    await tap(X, "[data-kitchen-whisper]");
    await tap(X, "[data-kitchen-spoon]");
    await until("a third answer", async () => (await seen(X)).whisper !== null, 4000);
    s = await seen(X);
    ok("the third answer is the other recipe; and the spoon answers no more today", s.whisper.ways === 1 && s.spoon.left === 0 && s.spoon.off === true
      && JSON.stringify(await X.evaluate(`${T}.purse().whispers`)) === JSON.stringify(["tomYum", "friedMinnow", "fishSauce"]), { s, w: await X.evaluate(`${T}.purse().whispers`) });
    await tap(X, "[data-kitchen-whisper]");
    const again = await X.evaluate(`window.__townKeeper.spoonAsk([["chili", 1]])`);
    ok("the keeper itself refuses a fourth", again.ok === false && again.why === "spent", again);
    await tap(X, '[data-kitchen-tab="notes"]');
    const told = await X.evaluate(`(() => { const u = ${K}.querySelector("[data-kitchen-whispers]"); return u ? { n: Number(u.dataset.kitchenWhispers), text: u.innerText.replace(/\\s+/g, " ") } : null; })()`);
    ok("the notebook keeps what the spoon has told", told?.n === 3 && /ต้นหอม/.test(told.text) && /เกลือ/.test(told.text), told);
    await X.evaluate(`${T}.skipHours(24)`);
    await sleep(400);
    ok("the next day it has its three answers again", (await seen(X)).spoon.left === 3, (await seen(X)).spoon);
    ok("no page errors", (X.logs ?? []).filter((l) => !/favicon|Download the React DevTools/.test(l)).length === 0, X.logs);
  } finally { await X.close(); }
}

await run("wide", { width: 1280, height: 860 });
await run("phone", { width: 360, height: 780, mobile: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
