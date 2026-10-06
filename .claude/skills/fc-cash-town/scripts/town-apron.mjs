// The enchanted apron's power (the kitchen's first rank, lib/town/gifts), in a real browser on the dev test room: with
// no apron the kitchen table says nothing of what is in the pot; worn as a charm, each thing put in glows by whether
// what is in can still become something real (green: on its way; red on the thing that is in the way, with a word
// that no recipe has this; gold when it is a recipe whole), and taking the wrong thing out mends it. It tells no
// recipe, and the cooking is as everybody's.
//
//   node town-apron.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes apron-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", C = "window.__townCook", KP = "window.__townKeeper", K = `document.querySelector("[data-town-kitchen]")`;
const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]];
const tap = async (X, what) => { await X.evaluate(`${K}.querySelector('${what}').click()`); await sleep(220); };
const warp = async (X, [x, y]) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(800); };
/** What the table shows of the pot: the word's state, and each thing's. */
const pot = (X) => X.evaluate(`(() => { const w = ${K}.querySelector("[data-kitchen-pot]"); return { word: w ? w.dataset.kitchenPot : null, text: w ? w.innerText.trim() : null,
  things: Object.fromEntries([...${K}.querySelectorAll("[data-kitchen-in]")].map((b) => [b.dataset.kitchenIn, b.dataset.pot ?? null])) }; })()`);

const X = await browser("Apron", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=A&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`${T}.resize(20)`);
  await X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify([...TOMYUM, ["pot", 1], ["hyacinth", 3], ["minnow", 2]])}) ${T}.grant(id, n); })()`);
  const places = await X.evaluate(`${C}.places()`);
  await warp(X, places.find((p) => p.kind === "stove").at);
  await until("the kitchen table is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook"), 6000);
  await X.evaluate(`${C}.act("cook")`);
  await until("the kitchen table is laid", () => X.evaluate(`${C}.open() && !!${K}`), 5000);
  await sleep(500);
  await tap(X, '[data-kitchen-tool="pot"]');
  await sleep(400);

  // ── with no apron ──
  await tap(X, '[data-kitchen-thing="snakehead"]');
  let said = await pot(X);
  ok("with no apron the table says nothing of what is in the pot", said.word === null && said.things.snakehead === null, said);

  // ── worn ──
  await X.evaluate(`${T}.setGifts(true)`);
  const wore = await X.evaluate(`${KP}.charmsWear(["charmApron"])`);
  ok("the enchanted apron is worn as a charm", wore.ok === true, wore);
  await sleep(600);
  said = await pot(X);
  ok("worn, a thing that can still become something real glows green, and the pot is said to be on its way", said.word === "fits" && said.things.snakehead === "fits" && said.text === "ยังไปต่อได้", said);
  await tap(X, '[data-kitchen-thing="tomato"]');
  await tap(X, '[data-kitchen-thing="hyacinth"]');
  said = await pot(X);
  ok("a thing no recipe has with the rest is the one that glows red; the rest are held as they are, and the pot says no recipe has this", said.word === "wrong" && said.things.hyacinth === "wrong" && said.things.snakehead === "held" && said.things.tomato === "held"
    && said.text === "ไม่มีสูตรแบบนี้", said);
  await X.shot(`${OUT}/apron-wrong.png`);
  await tap(X, '[data-kitchen-in="hyacinth"]');
  said = await pot(X);
  ok("taken out again, the pot is on its way once more", said.word === "fits" && !("hyacinth" in said.things) && said.things.tomato === "fits", said);
  // one tomato too many for any recipe that has these things
  await tap(X, '[data-kitchen-thing="tomato"]');
  await tap(X, '[data-kitchen-thing="chili"]');
  await tap(X, '[data-kitchen-thing="chili"]');
  await tap(X, '[data-kitchen-thing="scallion"]');
  said = await pot(X);
  ok("with every thing of a recipe in, in its amounts, the pot is a recipe whole, and every thing glows gold", said.word === "whole" && Object.values(said.things).every((v) => v === "whole") && Object.keys(said.things).length === 4 && said.text === "ครบสูตร", said);
  await X.shot(`${OUT}/apron-whole.png`);
  ok("nothing of it names a recipe: the word is a state", !/ต้มยำ|Tom yum/i.test(await X.evaluate(`${K}.querySelector("[data-kitchen-pot]").innerText`)));
  // taken off: nothing is said again
  await X.evaluate(`${KP}.charmsWear([])`);
  await sleep(600);
  said = await pot(X);
  ok("taken off, the table says nothing again", said.word === null && Object.values(said.things).every((v) => v === null), said);
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
