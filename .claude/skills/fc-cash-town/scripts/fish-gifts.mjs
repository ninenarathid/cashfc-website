// What the checks of the fishing deck's gifts share (town-otter, town-rod, town-silk, town-orb, town-stardust,
// town-wary): a tester brought to the deck with a rod in the hand and the rod's panel open, a line dropped that
// brings what the check names, a strike at the bite, and a hand on the reel that plays inside the page.
import { sleep, status, until } from "./cdp.mjs";

export const T = "window.__townTrade", K = "window.__townKeeper", F = "window.__townFish", V = "window.__townView";
export const PANEL = `document.querySelector('[aria-labelledby="town-fish-h"]')`;
/** A place on the finished deck whose line lands in deep water, and one on the bank whose line lands in the shallows. */
export const DECK = [17, 42];

export function tally() {
  let pass = 0, fail = 0;
  const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
  return { ok, done: () => { console.log(`\n${pass} passed, ${fail} failed`); return fail ? 1 : 0; } };
}
/** What the page threw or logged as an error (not what a browser says of a picture or a sound it could not have). */
export const faults = (X) => X.logs.filter((l) => !/favicon|Failed to load resource|AudioContext|net::ERR/i.test(l));
export const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
export const text = (X, el = PANEL) => X.evaluate(`(${el}?.innerText ?? "").replace(/\\s+/g, " ")`);
export const me = (X) => X.evaluate(`window.__cashTown.me()`);
export const purse = (X) => X.evaluate(`${T}.purse()`);
export const held = async (X, item) => (await purse(X)).bag.reduce((n, s) => n + (s && s.item === item ? s.n : 0), 0);
export const phase = (X) => X.evaluate(`${F}?.phase() ?? null`);

/** Into the test room as a tester (a letter), at a fixed hour under a fixed sky. */
export async function enter(X, base, letter, more = "&townHour=12&townWeather=clear") {
  await X.goto(`${base}/town?townTest=${letter}&townRoom=check${more}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
export async function walk(X, x, y, ms = 30000) {
  await X.evaluate(`window.__cashTown.walkTo(${x}, ${y})`);
  return until(`I stand at ${x},${y}`, async () => { const p = (await me(X)).pos; return Math.floor(p.x) === x && Math.floor(p.y) === y; }, ms).catch((e) => e.message);
}
/** Begun anew, with a rod and these things in the bag, on the deck, the rod in the hand and its panel open. */
export async function toDeck(X, things = [["worm", 40]], at = DECK) {
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(20), ${T}.grant("rod", 1))`);
  for (const [item, n] of things) await X.evaluate(`${T}.grant(${JSON.stringify(item)}, ${n})`);
  await X.evaluate(`${V}.warp(30, 40)`);
  await sleep(700);
  await walk(X, at[0], at[1]);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "rod"))`);
  await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 8000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${PANEL}`), 5000);
}
/** Back to where a line is dropped from, from whatever a go came to. */
export const ready = (X) => until("the rod's panel is ready", async () => (await phase(X)) === "ready" || (await press(X, "หย่อนอีก", PANEL), false), 12000, 120);
/** Drop a line with the short wait (by the button whose words these are), having said what it is to bring. Says what the page was told of it. */
export async function cast(X, fate = [], words = "หย่อนเบ็ด") {
  await ready(X);
  await X.evaluate(`(${F}.quick(true), ${K}.willBite(${JSON.stringify(fate)}))`);
  await sleep(150);
  await press(X, words, PANEL);
  await until("the line is out", async () => (await phase(X)) === "waiting", 4000, 40);
  return X.evaluate(`${F}.cast()`);
}
/** Wait for the bite and strike a moment after it. Says what phase follows. */
export async function strike(X) {
  const c = await X.evaluate(`${F}.cast()`);
  await until("the bite", () => X.evaluate(`(() => { const c = ${F}.cast(); return !c || c.since >= c.wait + 0.12; })()`), ((c?.wait ?? 10) + 6) * 1000, 30);
  await X.evaluate(`${F}.strike()`);
  await until("the strike is answered", async () => !["waiting", "striking"].includes(await phase(X)), 5000, 40);
  return phase(X);
}
/**
 * A hand on the reel, inside the page (so that it sees every frame): `how` is "win" (reel below the middle of the
 * safe stretch, lower in it while the fish surges), "slack" (never reel: the hook slips) or "taut" (only reel: the
 * line snaps). It plays whatever fight is on until it is told otherwise.
 */
export const hand = (X, how) => X.evaluate(`(() => {
  clearInterval(window.__fishHand);
  window.__fishMend = { seen: false, done: false };
  window.__fishHand = setInterval(() => {
    const h = window.__townFish, f = h?.fight?.(), p = h?.pair?.();
    // (two fish at once: the needle kept where the two stretches lie over each other, when they do; else in the
    // upper one. "loseOne": the reel left alone until one of the two is gone, then the other is won.)
    if (p) {
      const live = [0, 1].filter((i) => !p.ended[i]);
      if (!live.length) return;
      if (${JSON.stringify(how)} === "slack" || (${JSON.stringify(how)} === "loseOne" && live.length === 2)) return h.hold(false);
      if (${JSON.stringify(how)} === "taut") return h.hold(true);
      const lo = Math.max(...live.map((i) => p.lo[i])), hi = Math.min(...live.map((i) => p.hi[i]));
      const u = live.reduce((a, i) => (p.hi[i] > p.hi[a] ? i : a)), [a, b] = hi > lo ? [lo, hi] : [p.lo[u], p.hi[u]];
      const wild = live.some((i) => { const g = p.fights[i]; return g.t >= g.surge.from - 0.3 && g.t < g.surge.to; });
      return h.hold(p.tension < a + (b - a) * (wild ? 0.25 : 0.5));
    }
    if (!f) return;
    if (${JSON.stringify(how)} === "slack") return h.hold(false);
    if (${JSON.stringify(how)} === "taut") return h.hold(true);
    // (a line of dragon silk: only reeled until it begins to mend, let go at once so that it is mended in time, and
    // then won ("mendOnce") or only reeled again ("mendThenTaut"))
    if (${JSON.stringify(how)} === "mendOnce" || ${JSON.stringify(how)} === "mendThenTaut") {
      const st = window.__fishMend;
      if (f.mend) { st.seen = true; return h.hold(false); }
      if (st.seen) st.done = true;
      if (!st.done || ${JSON.stringify(how)} === "mendThenTaut") return h.hold(true);
    }
    const on = f.t >= f.surge.from - 0.3 && f.t < f.surge.to;
    h.hold(f.tension < f.lo + (f.hi - f.lo) * (on ? 0.25 : 0.5));
  }, 12);
  return true; })()`);
export const handOff = (X) => X.evaluate(`(clearInterval(window.__fishHand), ${F}?.hold(false), true)`);
/** Wait until the go has come to something, and say what. */
export async function result(X, ms = 90000) {
  await until("the go is over", async () => (await phase(X)) === "result", ms, 60);
  return X.evaluate(`${F}.result()`);
}
