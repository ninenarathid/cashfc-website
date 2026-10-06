// The whispering float's power (the deck's first rank, lib/town/gifts), in a real browser on the dev test room: with
// no float a line that is out tells nothing; worn as a charm, what is on its way is shown (a fish never landed as a
// shade and "???", one landed before as itself with its name; what is no fish as itself), a ring runs down to the
// bite, and the float flashes at the true bite. The strike's moment is no longer for it.
//
//   node town-float.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes float-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", F = "window.__townFish", PANEL = `document.querySelector('[aria-labelledby="town-fish-h"]')`;
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
async function walk(X, x, y, ms = 30000) {
  await X.evaluate(`window.__cashTown.walkTo(${x}, ${y})`);
  return until(`I stand at ${x},${y}`, async () => { const p = (await me(X)).pos; return Math.floor(p.x) === x && Math.floor(p.y) === y; }, ms).catch((e) => e.message);
}
/** Drop a line with the short wait, and say what the page was told of it. */
async function cast(X) {
  await until("the rod's panel is ready", async () => (await X.evaluate(`${F}?.phase()`)) === "ready" || (await press(X, "หย่อนอีก", PANEL), false), 8000, 120);
  await X.evaluate(`${F}.quick(true)`);
  await sleep(120);
  await press(X, "หย่อนเบ็ด", PANEL);
  await until("the line is out", () => X.evaluate(`${F}.phase() === "waiting"`), 3000, 40);
  return X.evaluate(`${F}.cast()`);
}
/** What the water shows of what is coming, if anything. */
const whisper = (X) => X.evaluate(`(() => { const w = ${PANEL}.querySelector('[data-fx="whisper"]'); return w ? { coming: w.dataset.coming, tier: w.dataset.tier, text: w.innerText.trim() } : null; })()`);
/** End a go at once: a strike too soon. */
const giveUp = async (X) => { await X.evaluate(`${F}.strike()`); await until("the go is over", () => X.evaluate(`${F}.phase() === "result"`), 6000).catch(() => {}); };

const X = await browser("Float", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=W&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("rod", 1), ${T}.grant("worm", 40))`);
  await X.evaluate(`window.__townView.warp(30, 40)`);
  await sleep(700);
  await walk(X, 17, 42);
  await X.evaluate(`${T}.hold(0)`);
  await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 6000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${PANEL}`), 5000);

  // ── with no float ──
  let c = await cast(X);
  ok("with no float a line that is out tells nothing of what is coming: no picture, no ring, no flash", c.coming === null && (await whisper(X)) === null
    && (await X.evaluate(`!${PANEL}.querySelector('[data-fx="count"]') && !${PANEL}.querySelector('[data-fx="flash"]')`)), c);
  await giveUp(X);

  // ── worn ──
  await X.evaluate(`${T}.setGifts(true)`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmFloat"])`);
  ok("the whispering float is worn as a charm", wore.ok === true, wore);
  // (nothing landed yet: whatever fish comes is a shade; what is no fish is itself)
  let shade = null, first = null;
  for (let i = 0; i < 8 && !shade; i++) {
    c = await cast(X);
    const w = await whisper(X);
    first ??= { c, w };
    if (w && w.coming === "" && w.text === "???") shade = { c, w };
    else await giveUp(X);
  }
  ok("worn, what is on its way is told as the line goes out", !!first?.c?.coming && !!first.w, first);
  ok("a fish never landed is a shade of its tier, and not named", !!shade && typeof shade.c.coming === "string" && ["common", "uncommon", "rare", "legend"].includes(shade.w.tier), shade);
  await X.shot(`${OUT}/float-shade.png`);
  // the ring runs down, and the float flashes at the true bite
  const ringAt = () => X.evaluate(`parseFloat(${PANEL}.querySelector('[data-fx="count"]')?.style.strokeDashoffset || "0")`);
  const a0 = await ringAt();
  await sleep(700);
  const a1 = await ringAt();
  ok("a ring runs down to the bite", a1 > a0 && a0 >= 0, { a0, a1 });
  await until("the bite", () => X.evaluate(`(() => { const c = ${F}.cast(); return !c || c.since >= c.wait + 0.1; })()`), (shade.c.wait + 6) * 1000, 30);
  const flashed = await X.evaluate(`parseFloat(${PANEL}.querySelector('[data-fx="flash"]')?.style.opacity || "0")`);
  ok("the float flashes at the true bite", flashed > 0.3, { flashed });
  await X.shot(`${OUT}/float-bite.png`);
  const known = shade.c.coming;
  await giveUp(X);
  // (that kind landed once: the next of it is itself, by name)
  await X.evaluate(`${T}.land(${JSON.stringify(known)}, 12)`);
  for (const id of ["minnow", "barb", "tilapia", "perch", "catfish", "loach", "mosquitofish", "mussel", "crayfish", "goldfish", "carp"]) await X.evaluate(`${T}.land(${JSON.stringify(id)}, 10)`).catch(() => {});
  await X.evaluate(`${T}.resize(40)`);
  let named = null;
  for (let i = 0; i < 10 && !named; i++) {
    c = await cast(X);
    const w = await whisper(X);
    if (w && w.coming && w.coming === c.coming && w.text !== "???" && w.text.length > 0) named = { c, w };
    if (!named) await giveUp(X);
  }
  ok("a kind landed before is shown as itself, with its name", !!named, { last: c });
  await X.shot(`${OUT}/float-known.png`);
  await giveUp(X);
  // taken off: nothing told again
  await X.evaluate(`${K}.charmsWear([])`);
  c = await cast(X);
  ok("taken off, nothing is told again", c.coming === null && (await whisper(X)) === null, c);
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
