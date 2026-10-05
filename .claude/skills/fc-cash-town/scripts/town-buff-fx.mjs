// What shows when a buff is at work, tried in a real browser on the dev test room (the trial kept in the browser,
// `next dev` only). The fountain's blessings are put straight into what the trial keeps of it, for this tester:
//
// - at the line: the buffs that have a hand in fishing stand at the board's head, each with its light;
// - under the swift blessing the bite comes sooner, and rings spread under the float;
// - under clear water the shade of what is on its way shows under the float (how rare, never which);
// - with steady hands the safe stretch of the fight glows;
// - a purse with no buff shows none of it.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-buff-fx.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", FISH = `document.querySelector('[aria-labelledby="town-fish-h"]')`;
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
/** The fountain as the trial keeps it, with these blessings running for this tester. */
const bless = (X, id, wishes) => X.evaluate(`(() => {
  const now = ${T}.now();
  localStorage.setItem("cashtown.trial.fountain.1", JSON.stringify({ day: -1, first: 0, given: 0, pot: 0, by: {}, who: [], lately: [],
    blessings: ${JSON.stringify(wishes)}.map((w) => ({ id: w, from: now - 1000, until: now + 3600000, by: ${JSON.stringify(id)}, of: [${JSON.stringify(id)}] })) }));
  window.dispatchEvent(new StorageEvent("storage", { key: "cashtown.trial.fountain.1" }));
})()`);
async function walk(X, x, y, ms = 30000) {
  await X.evaluate(`window.__cashTown.walkTo(${x}, ${y})`);
  return until(`I stand at ${x},${y}`, async () => { const p = (await me(X)).pos; return Math.floor(p.x) === x && Math.floor(p.y) === y; }, ms).catch((e) => e.message);
}
async function cast(X) {
  await until("the rod's panel is ready", () => X.evaluate(`window.__townFish?.phase() === "ready"`), 8000);
  await press(X, "หย่อนเบ็ด", FISH);
  await until("the line is out", () => X.evaluate(`window.__townFish.phase() === "waiting"`), 4000);
  return X.evaluate(`window.__townFish.cast()`);
}
/** On from what a go came to. Its buttons are not to be pressed until it has been shown a moment (lib/town/fishing's `REST`), so the press is waited for. */
const dropAgain = (X) => until("what the go came to can be left", () => press(X, "หย่อนอีก", FISH), 5000, 60);
const fx = (X, name) => X.evaluate(`!!${FISH}?.querySelector('[data-fx="${name}"]')`);
const aura = (X) => X.evaluate(`${FISH}?.querySelector("[data-buffs]")?.getAttribute("data-buffs") ?? ""`);

const X = await browser("BuffFx", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=F&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), localStorage.removeItem("cashtown.trial.fountain.1"))`);
  await sleep(400);
  await X.evaluate(`(${T}.grant("rod", 1), ${T}.grant("worm", 20))`);
  const id = (await me(X)).id;

  await X.evaluate(`window.__townView.warp(30, 40)`);
  await sleep(700);
  await walk(X, 17, 42);
  await until("it is a place to fish from", () => X.evaluate(`window.__townView.fishAt()`), 8000);
  await X.evaluate(`${T}.hold(0)`);
  await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 8000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${FISH}`), 8000);

  // nothing, with no buff
  ok("with no buff, nothing stands at the board's head", (await aura(X)) === "");
  let c = await cast(X);
  await sleep(400);
  ok("…and nothing shows on the water", !(await fx(X, "swift")) && !(await fx(X, "clear")), c);
  const plain = c.wait;
  await until("the line is gone", () => X.evaluate(`["ready", "result"].includes(window.__townFish.phase())`), (plain + 12) * 1000, 200);
  if ((await X.evaluate(`window.__townFish.phase()`)) === "result") { await dropAgain(X); await sleep(300); }

  // the fountain's blessings, and a meal's two
  await bless(X, id, ["swift", "clear", "lucky", "calm", "hearty", "feast"]);
  await sleep(500);
  const had = (await X.evaluate(`${T}.purse().blessed`)) ?? [];
  ok("the trial's purse carries the blessings", had.map((b) => b.id).sort().join() === "calm,clear,feast,hearty,lucky,swift", had);
  await until("the rod's panel is ready again", () => X.evaluate(`window.__townFish?.phase() === "ready"`), 15000);
  ok("the buffs that have a hand in a line stand at the board's head, in their own order; one that has none does not",
    (await aura(X)) === "calm lucky swift clear hearty", await aura(X));
  ok("…each with its light", (await X.evaluate(`${FISH}.querySelectorAll("[data-buffs] > span").length`)) === 5);
  // (a wait is drawn by chance: under the swift blessing none is longer than three fifths of the longest there is)
  const waits = [];
  let shades = new Set(), ringed = false, shaded = false;
  for (let i = 0; i < 4; i++) {
    c = await cast(X);
    await sleep(250);
    waits.push(c.wait);
    ringed ||= await fx(X, "swift");
    shaded ||= await fx(X, "clear");
    shades.add(await X.evaluate(`${FISH}.querySelector('[data-fx="clear"]')?.getAttribute("data-shade") ?? null`));
    if (i === 0) await X.shot(`${OUT}/buff-fx-line.png`);
    // strike at once (a script's strike, taken whenever it comes): too soon, the line comes in, and the next can be dropped
    await X.evaluate(`window.__townFish.strike()`);
    await until("the strike is answered", () => X.evaluate(`["ready", "result", "fight"].includes(window.__townFish.phase())`), 6000, 100);
    if ((await X.evaluate(`window.__townFish.phase()`)) === "result") { await dropAgain(X); await sleep(400); }
  }
  ok("under the swift blessing rings spread under the float", ringed);
  ok("under clear water the shade of what is on its way shows, and says only how rare it is", shaded && [...shades].every((s) => ["common", "uncommon", "rare", "legend", "other"].includes(s)), [...shades]);
  ok("a bite under the swift blessing is never far off", Math.max(...waits) <= 72, waits);
  ok("no page errors", X.logs.length === 0, X.logs);
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
