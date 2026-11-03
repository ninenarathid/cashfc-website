// The cloud ram's pack (the owner, 2026-11-04: ten slots on the ram for anything, its owner's alone, open while the
// ram is the familiar put on) and the familiars drawn anew (the helpers' fairy, and two frames for every familiar).
// In the trial: with the ram put on, its pack's button is beside the ride button; things go in and come back; with
// another familiar the button is gone and what is in the pack stays; the fairy and a few others are shot following.
//
//   node .claude/skills/fc-cash-town/scripts/town-ram-pack.mjs <base-url> <out-dir> [1280x860|384x730|360x640]
//
// Needs `next dev` (the trial's test room). Writes pack-<size>-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", SIZE = "1280x860"] = process.argv.slice(2);
const [W, H] = SIZE.split("x").map(Number);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView";
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const press = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`, true);
const shot = (X, name) => X.shot(`${OUT}/pack-${W}-${name}.png`);

const X = await browser("Pack", { width: W, height: H });
try {
  await X.goto(`${BASE}/town?townTest=P&townRoom=pack&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(["famCloudRam", "famGardenMender", "famDwarf", "famRiverDragon", "famSquirrel"]), ${T}.setStamina(100), ${T}.grant("worm", 6), ${T}.grant("rod", 1))`);
  await sleep(500);
  await X.evaluate(`${V}.warp(40, 40)`);
  // (something to put away: whatever the trial's bag holds)
  const wear = (id) => X.evaluate(`${K}.familiarWear(${JSON.stringify(id)})`);
  ok("the cloud ram is put on", (await wear("famCloudRam")).ok === true);
  await until("the pack's button", () => has(X, '[data-ram-pack="closed"]'), 6000).catch(() => null);
  ok("with the ram on, the pack's button is there", await has(X, '[data-ram-pack="closed"]'));
  await sleep(600);
  await shot(X, "1-button");
  await press(X, '[data-ram-pack="closed"]');
  await until("the pack open", () => has(X, '[data-ram-pack="open"]'), 4000).catch(() => null);
  ok("it opens", await has(X, '[data-ram-pack="open"]'));
  const first = await X.evaluate(`(() => { const b = document.querySelector('[data-ram-pack-bag] [data-slot]'); return b ? b.dataset.item : null; })()`);
  ok("the bag has something to put in", !!first, first);
  await X.evaluate(`document.querySelector('[data-ram-pack-bag] [data-slot]')?.click()`, true);
  await until("in the pack", async () => (await X.evaluate(`document.querySelector('[data-ram-pack-count]')?.textContent ?? ''`)).startsWith("1"), 5000).catch(() => null);
  ok("a stack goes into the pack", (await X.evaluate(`document.querySelector('[data-ram-pack-count]')?.textContent ?? ''`)).startsWith("1"));
  await sleep(300);
  await shot(X, "2-open");
  await press(X, "[data-ram-pack-close]");
  // ── another familiar: the button is gone, what is in the pack stays ──
  ok("the fairy is put on", (await wear("famGardenMender")).ok === true);
  await sleep(500);
  ok("with another familiar the pack's button is gone", !(await has(X, "[data-ram-pack]")));
  ok("…and what is in the pack stays", (await X.evaluate(`${K}.pack().things.filter(Boolean).length`)) === 1);
  // the fairy following: walk a little and shoot her in flight
  await X.evaluate(`${V}.walk(44, 40)`);
  await sleep(700);
  await shot(X, "3-fairy");
  for (const id of ["famDwarf", "famRiverDragon", "famSquirrel"]) {
    await wear(id); await X.evaluate(`${V}.walk(40, 40)`); await sleep(650); await shot(X, `4-${id}`); await X.evaluate(`${V}.walk(44, 40)`); await sleep(400);
  }
  // back to the ram: it comes out again
  await wear("famCloudRam");
  await until("the pack's button again", () => has(X, '[data-ram-pack="closed"]'), 6000).catch(() => null);
  await press(X, '[data-ram-pack="closed"]');
  await until("open again", () => has(X, '[data-ram-pack="open"]'), 4000).catch(() => null);
  await X.evaluate(`document.querySelector('[data-ram-pack-things] [data-slot]')?.click()`, true);
  await until("out again", async () => (await X.evaluate(`document.querySelector('[data-ram-pack-count]')?.textContent ?? ''`)).startsWith("0"), 5000).catch(() => null);
  ok("with the ram again it comes back out", (await X.evaluate(`document.querySelector('[data-ram-pack-count]')?.textContent ?? ''`)).startsWith("0"));
} catch (e) {
  fail++; console.log("  FAIL", e?.message ?? e);
} finally {
  console.log(`${pass} passed, ${fail} failed`);
  await X.quit();
  process.exit(fail ? 1 : 0);
}
