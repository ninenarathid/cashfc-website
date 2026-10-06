// Fishing that lasts longer (the owner, 2026-10-07), in a real browser on the dev test room: a fish that is hooked and
// gets away in the fight gives its bait back, and the page says so; a strike too soon loses the bait as ever; and the
// uncle's stall lets one member buy twenty worms in a round where it was ten.
//
//   node town-bait.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes bait-*.png.
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
const worms = (X) => X.evaluate(`${T}.purse().bag.reduce((n, s) => n + (s && s.item === "worm" ? s.n : 0), 0)`);
async function cast(X) {
  await until("the rod's panel is ready", async () => (await X.evaluate(`${F}?.phase()`)) === "ready" || (await press(X, "หย่อนอีก", PANEL), false), 8000, 120);
  await X.evaluate(`${F}.quick(true)`);
  await sleep(120);
  await press(X, "หย่อนเบ็ด", PANEL);
  await until("the line is out", () => X.evaluate(`${F}.phase() === "waiting"`), 3000, 40);
  return X.evaluate(`${F}.cast()`);
}

const X = await browser("Bait", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=Y&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);

  // ── the uncle's bait ──
  // (coins to buy with: the trial hands them out with a thing)
  await X.evaluate(`(${T}.resize(10), ${T}.grant("dough", 1, 500))`);
  const bought = await X.evaluate(`(async () => { const a = await ${K}.buy("worm", 20); const b = await ${K}.buy("worm", 1); return { a, b }; })()`), shelf = null;
  ok("the uncle sells one member twenty worms in a round, and not a twenty-first", bought.a?.ok === true && bought.b?.ok === false && (await worms(X)) === 20, { bought, shelf });

  // ── on the deck ──
  await X.evaluate(`${T}.grant("rod", 1)`);
  await X.evaluate(`window.__townView.warp(30, 40)`);
  await sleep(700);
  await walk(X, 17, 42);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "rod"))`);
  await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 6000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${PANEL}`), 5000);

  // a strike too soon: the bait is gone, as ever
  let had = await worms(X);
  await cast(X);
  await X.evaluate(`${F}.strike()`);
  await until("the go is over", () => X.evaluate(`${F}.phase() === "result"`), 6000);
  ok("a strike too soon loses the bait, as ever", (await worms(X)) === had - 1 && (await X.evaluate(`${F}.result().how`)) === "early", { had, now: await worms(X) });

  // a fish hooked, and let go in the fight: the bait is back
  let lost = null;
  for (let i = 0; i < 8 && !lost; i++) {
    had = await worms(X);
    const c = await cast(X);
    await until("the bite", () => X.evaluate(`(() => { const c = ${F}.cast(); return !c || c.since >= c.wait + 0.12; })()`), (c.wait + 6) * 1000, 30);
    await X.evaluate(`${F}.strike()`);
    await sleep(250);
    if ((await X.evaluate(`${F}.phase()`)) !== "fight") { await until("the go is over", () => X.evaluate(`${F}.phase() === "result"`), 6000).catch(() => {}); continue; }
    // (the reel never touched: the hook slips)
    await X.evaluate(`${F}.hold(false)`);
    await until("the fight is over", () => X.evaluate(`${F}.phase() === "result"`), 60000);
    const r = await X.evaluate(`${F}.result()`);
    if (r.how === "slipped" || r.how === "snapped") lost = { r, had, now: await worms(X), text: await X.evaluate(`${PANEL}.innerText.replace(/\\s+/g, " ")`) };
  }
  ok("a fish hooked and lost in the fight gives its bait back: as many worms as before the cast", !!lost && lost.now === lost.had && lost.r.back === true, lost);
  ok("…and the page says the bait is still mine", !!lost && /แต่เหยื่อยังอยู่/.test(lost.text), lost?.text);
  await X.shot(`${OUT}/bait-back.png`);
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
