// A rod of two lines (the deck's third rank, lib/town/gifts' thingRod), in a real browser on the dev test room:
// without it only the plain line is offered; with it both lines are offered beside the plain one, for two of the
// bait; two floats ride the water; one strike hooks both, and the two are fought at once on one needle, each in a
// stretch of its own a quarter narrower; both landed are both shown, in the bag, and written down as a go each; one
// lost leaves the other still to be won; what is no fish comes in at once beside the fish that is fought; the plain
// line is as it was; and the whispering float tells both.
//
//   node town-rod.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes rod-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, until } from "./cdp.mjs";
import { F, K, PANEL, T, cast, enter, faults, hand, handOff, held, phase, purse, ready, result, strike, tally, text, toDeck } from "./fish-gifts.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const { ok, done } = tally();
const stamina = async (X) => (await purse(X)).stamina.left;
const plays = (X) => X.evaluate(`${T}.plays().filter((p) => p.game === "fishing").map((p) => ({ how: p.how, what: p.what, won: p.won }))`);
const pairButton = (X) => X.evaluate(`(() => { const b = ${PANEL}?.querySelector("[data-fish-pair]"); return b ? { disabled: b.disabled, text: b.innerText.replace(/\\s+/g, " ").trim() } : null; })()`);
const PAIR = "หย่อนสองสาย";

const X = await browser("Rod", { width: 1280, height: 860 });
let code = 1;
try {
  await enter(X, BASE, "R");
  await toDeck(X, [["worm", 1]]);

  // ── without the rod, and with it ──
  await ready(X);
  ok("with no rod of two lines only the plain line is offered", (await pairButton(X)) === null && /หย่อนเบ็ด/.test(await text(X)));
  await X.evaluate(`${T}.setGifts(["thingRod"])`);
  await until("the pair is offered", async () => (await pairButton(X)) !== null, 4000, 100);
  let b = await pairButton(X);
  ok("with it both lines are offered beside the plain one; with one worm in the bag they cannot be dropped", !!b && b.disabled === true && /หย่อนสองสาย/.test(b.text) && /หย่อนเบ็ด/.test(await text(X)), b);
  await X.evaluate(`${T}.grant("worm", 39)`);
  await until("two can be dropped", async () => (await pairButton(X))?.disabled === false, 4000, 100);
  await X.shot(`${OUT}/rod-ready.png`);

  // ── two lines out ──
  let worms = await held(X, "worm");
  let c = await cast(X, ["barb", "minnow"], PAIR);
  ok("two lines go out for two worms, and nothing is told of what is on them", c.pair === true && c.coming === null && c.coming2 === null && (await held(X, "worm")) === worms - 2, { c, worms: await held(X, "worm") });
  ok("two floats ride the water", await X.evaluate(`!!${PANEL}.querySelector('[data-fx="float2"]')`));
  await X.shot(`${OUT}/rod-floats.png`);
  await X.evaluate(`${T}.setStamina(100)`);
  let at = await strike(X);
  ok("one strike hooks both: the two are fought at once, each fight paid for", at === "fight2" && (await stamina(X)) === 100 - 2 - 1, { at, stamina: await stamina(X) });
  const began = await X.evaluate(`(() => { const p = ${F}.pair(); return { fish: p.fights.map((f) => f.fish), wide: [p.hi[0] - p.lo[0], p.hi[1] - p.lo[1]], bands: [...${PANEL}.querySelectorAll("[data-band]")].filter((b) => b.style.display !== "none").length,
    fishes: ${PANEL}.querySelectorAll("[data-fish2]").length }; })()`);
  ok("each has a stretch of its own on the one gauge, a quarter narrower than its fish's", began.fish.join() === "barb,minnow" && Math.abs(began.wide[0] - 0.2 * 0.75) < 1e-9 && Math.abs(began.wide[1] - 0.22 * 0.75) < 1e-9 && began.bands === 2 && began.fishes === 2, began);
  await hand(X, "win");
  await sleep(1500);
  await X.shot(`${OUT}/rod-fight.png`);
  let r = await result(X);
  ok("both are landed: both shown, both in the bag", r.how === "landed" && r.also?.how === "landed" && [r.what, r.also.what].sort().join() === "barb,minnow" && (await held(X, "barb")) === 1 && (await held(X, "minnow")) === 1
    && (await X.evaluate(`${PANEL}.querySelectorAll("[data-came]").length`)) === 2, r);
  ok("…and written down as a go each, both won", JSON.stringify((await plays(X)).map((p) => [p.what, p.won]).sort()) === JSON.stringify([["barb", true], ["minnow", true]]), await plays(X));
  await X.shot(`${OUT}/rod-both.png`);

  // ── lost one at a time ──
  worms = await held(X, "worm");
  await cast(X, ["catfish", "carp"], PAIR);
  at = await strike(X);
  await hand(X, "loseOne");
  await until("one of the two is gone, and the other is on still", () => X.evaluate(`(() => { const p = ${F}.pair(); return !!p && p.ended.filter(Boolean).length === 1; })()`), 60000, 30);
  const mid = await X.evaluate(`(() => { const p = ${F}.pair(); return { ended: p.ended, phase: ${F}.phase(), bands: [...${PANEL}.querySelectorAll("[data-band]")].filter((b) => b.style.display !== "none").length, strain: p.strain, slack: p.slack }; })()`);
  ok("one slips the hook and the other is still to be won: the fight goes on with one stretch, its slack begun anew", mid.phase === "fight2" && mid.ended.filter((e) => e === "slipped").length === 1 && mid.bands === 1 && mid.slack < 0.5, mid);
  await X.shot(`${OUT}/rod-one-left.png`);
  r = await result(X);
  const lost = [r, r.also].find((o) => o?.how !== "landed"), won = [r, r.also].find((o) => o?.how === "landed");
  ok("the other is landed: one fish in the bag, one lost with its bait back", !!lost && !!won && lost.how === "slipped" && lost.back === true && (await held(X, won.what)) === 1 && (await held(X, "worm")) === worms - 1, { r, worms: [worms, await held(X, "worm")] });
  ok("…each written down as it ended", JSON.stringify((await plays(X)).slice(-2).map((p) => p.won).sort()) === JSON.stringify([false, true]), (await plays(X)).slice(-2));

  // ── what is no fish, beside a fish; and two that are no fish ──
  await cast(X, ["boot", "minnow"], PAIR);
  at = await strike(X);
  ok("an old boot and a minnow: the boot is in at once, and the minnow is fought alone, as any fish", at === "fight" && (await held(X, "boot")) === 1 && (await X.evaluate(`${F}.fight()?.fish`)) === "minnow", at);
  await hand(X, "win");
  r = await result(X);
  ok("…and both are shown when it is landed", r.how === "landed" && r.what === "minnow" && r.also?.what === "boot" && r.also.how === "landed", r);
  await cast(X, ["hyacinth", "boot"], PAIR);
  at = await strike(X);
  r = await result(X, 8000);
  ok("two things that are no fish both come in with no fight", at === "result" && r.how === "landed" && r.also?.how === "landed" && [r.what, r.also.what].sort().join() === "boot,hyacinth" && (await held(X, "boot")) === 2, { at, r });

  // ── the plain line, as it was ──
  worms = await held(X, "worm");
  c = await cast(X, ["minnow"]);
  at = await strike(X);
  ok("the plain line beside it is as it was: one worm, one fish, one fight", c.pair === false && (await held(X, "worm")) === worms - 1 && at === "fight" && !(await X.evaluate(`!!${PANEL}.querySelector('[data-fx="float2"]')`)), { c, at });
  await hand(X, "win");
  r = await result(X);
  ok("…landed, with nothing beside it", r.how === "landed" && r.what === "minnow" && !r.also, r);

  // ── with the whispering float both are told ──
  await X.evaluate(`${T}.setGifts(["thingRod", "charmFloat"])`);
  await X.evaluate(`${K}.charmsWear(["charmFloat"])`);
  c = await cast(X, ["perch", "boot"], PAIR);
  const told = await X.evaluate(`[...${PANEL}.querySelectorAll('[data-fx="whisper"], [data-fx="whisper2"]')].map((w) => ({ fx: w.dataset.fx, tier: w.dataset.tier, coming: w.dataset.coming }))`);
  ok("with the whispering float worn both lines are told of: a fish never landed as a shade, what is no fish as itself", c.coming === "perch" && c.coming2 === "boot" && told.length === 2 && told[0].tier === "common" && told[0].coming === "" && told[1].coming === "boot", { c, told });
  await X.shot(`${OUT}/rod-whisper.png`);
  await X.evaluate(`${F}.strike()`);
  await result(X, 8000).catch(() => {});

  // ── at a phone's width ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  await ready(X);
  const fitsReady = await X.evaluate(`(() => { const r = ${PANEL}.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 0.5 && document.documentElement.scrollWidth <= window.innerWidth; })()`);
  await X.shot(`${OUT}/rod-phone-ready.png`);
  await cast(X, ["barb", "tilapia"], PAIR);
  await strike(X);
  await hand(X, "win");
  await sleep(1800);
  const fits = await X.evaluate(`(() => { const r = ${PANEL}.getBoundingClientRect(), b = [...${PANEL}.querySelectorAll("button")].at(-1).getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 0.5 && b.bottom <= window.innerHeight && document.documentElement.scrollWidth <= window.innerWidth; })()`);
  ok("at a phone's width the two buttons and the fight of two fit the screen", fitsReady && fits, { fitsReady, fits });
  await X.shot(`${OUT}/rod-phone-fight.png`);
  await result(X);
  await handOff(X);
  ok("no page errors", faults(X).length === 0, faults(X));
  code = done();
} finally { await X.close(); }
process.exit(code);
