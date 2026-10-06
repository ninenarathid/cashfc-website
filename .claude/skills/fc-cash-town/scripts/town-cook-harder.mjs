// Good dishes are harder for the skilled (lib/town/gifts' harderFor, lib/town/cooking's harderCook), in a real browser
// on the dev test room: below the kitchen's fourth rank a dish of the second tier is stirred as it always was; from
// the fourth rank its good pace is 8% a rank narrower and a slip costs so much sooner, to the tenth; a dish of the
// first tier is stirred the same at every rank; and the board says nothing of it.
//
//   node town-cook-harder.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes harder-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", C = "window.__townCook", G = "window.__townGame", K = `document.querySelector("[data-town-kitchen]")`;
const OMELETTE = [["egg", 2], ["oil", 1]], TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]];
const near = (a, b) => Math.abs(a - b) < 1e-9;
/** The stirring laid for what is in the pot: its good pace's width, how long a slip may last, the stirs wanted, and the board's own words; then put away with nothing cooked. */
const laid = async (X, things, tool) => {
  await X.evaluate(`${K}.querySelector('[data-kitchen-tool="${tool}"]').click()`);
  await sleep(300);
  await X.evaluate(`${C}.put(${JSON.stringify(things)})`);
  await sleep(300);
  await X.evaluate(`${K}.querySelector("[data-kitchen-go]").click()`);
  await until("the game is laid", () => X.evaluate(`!!${G} && ${G}.kind === "stirring"`), 5000);
  const s = await X.evaluate(`(() => { const g = ${G}.state(), el = document.querySelector("[data-town-game]"); return { wide: g.hi - g.lo, mid: (g.hi + g.lo) / 2, grace: g.grace, need: g.need, words: el.innerText.replace(/\\s+/g, " ").trim() }; })()`);
  return s;
};
const stop = async (X) => {
  await X.evaluate(`[...document.querySelector("[data-town-game]").querySelectorAll("button")].find((b) => /เลิก/.test(b.innerText)).click()`);
  await until("the table is back", () => X.evaluate(`!!${K}`), 5000);
  await sleep(300);
};

const X = await browser("Harder", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=R&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false), ${T}.setLine("kitchen", 0))`);
  await sleep(500);
  await X.evaluate(`${T}.resize(20)`);
  await X.evaluate(`(() => { for (const [id, n] of [["egg", 2], ["oil", 1], ["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1], ["pan", 1], ["pot", 1]]) ${T}.grant(id, n); ${T}.setStamina(100); })()`);
  const places = await X.evaluate(`${C}.places()`);
  await X.evaluate(`window.__townView.warp(${places.find((p) => p.kind === "stove").at.join(", ")})`);
  await sleep(900);
  await until("the kitchen table is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook"), 6000);
  await X.evaluate(`${C}.act("cook")`);
  await until("the kitchen table is laid", () => X.evaluate(`${C}.open() && !!${K}`), 5000);
  await sleep(500);

  const plain = await laid(X, OMELETTE, "pan");
  await X.shot(`${OUT}/harder-plain.png`);
  await stop(X);
  const simple = await laid(X, TOMYUM, "pot");
  await stop(X);
  ok("with no rank, a dish of the second tier and one of the first are stirred at the same good pace", near(plain.wide, simple.wide) && near(plain.grace, simple.grace) && plain.grace === 1, { plain, simple });

  await X.evaluate(`${T}.setLine("kitchen", 699)`);
  await sleep(400);
  const third = await laid(X, OMELETTE, "pan");
  await stop(X);
  ok("at the third rank still", near(third.wide, plain.wide) && near(third.grace, plain.grace), third);

  await X.evaluate(`${T}.setLine("kitchen", 700)`);
  await sleep(400);
  const fourth = await laid(X, OMELETTE, "pan");
  await X.shot(`${OUT}/harder-fourth.png`);
  await stop(X);
  ok("at the fourth rank the second tier's dish is 8% harder: a pace so much narrower about the same middle, a slip that costs so much sooner", near(fourth.wide * 1.08, plain.wide) && near(fourth.grace * 1.08, plain.grace) && near(fourth.mid, plain.mid) && fourth.need === plain.need, { fourth, plain });
  ok("…and the board says nothing of it: the same words as for anybody", fourth.words === plain.words, { fourth: fourth.words, plain: plain.words });
  const easy = await laid(X, TOMYUM, "pot");
  await stop(X);
  ok("the simplest dish is as it is for everybody, at that rank too", near(easy.wide, simple.wide) && near(easy.grace, simple.grace), easy);

  await X.evaluate(`${T}.setLine("kitchen", 12000)`);
  await sleep(400);
  const tenth = await laid(X, OMELETTE, "pan");
  await stop(X);
  ok("at the tenth rank, 56% harder; and the simplest dish still as it is", near(tenth.wide * 1.56, plain.wide) && near(tenth.grace * 1.56, plain.grace), { tenth, plain });
  const last = await laid(X, TOMYUM, "pot");
  await stop(X);
  ok("…the simplest dish still as it is", near(last.wide, simple.wide), last);
  const bag = await X.evaluate(`${T}.purse().bag.filter(Boolean).map((b) => [b.item, b.n])`);
  ok("nothing was cooked for the looking", bag.some(([i, n]) => i === "egg" && n === 2) && bag.some(([i, n]) => i === "snakehead" && n === 1), bag);
  ok("no page errors", (X.logs ?? []).filter((l) => !/favicon|Download the React DevTools/.test(l)).length === 0, X.logs);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
