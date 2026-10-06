// The dragon-silk line (the deck's fourth rank, lib/town/gifts' charmLine), in a real browser on the dev test room:
// without it a line only reeled snaps and the fish is gone; worn, the line is drawn gold, and what would have lost
// the fish begins a count of three seconds over the water instead; not brought back into the safe stretch the fish
// is lost as ever; brought back in time it is on still (once to a fight: the line is plain again) and can be landed;
// and the second time in a fight it is lost at once. In a fight of two it holds the same.
//
//   node town-silk.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes silk-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, until } from "./cdp.mjs";
import { F, K, PANEL, T, cast, enter, faults, hand, handOff, result, strike, tally, text, toDeck } from "./fish-gifts.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const { ok, done } = tally();
const fight = (X) => X.evaluate(`(() => { const f = ${F}.fight(); return f ? { t: f.t, over: f.over, silk: f.silk ?? null, mend: f.mend ?? null, strain: f.strain, tension: f.tension, lo: f.lo, hi: f.hi } : null; })()`);
const shown = (X) => X.evaluate(`(() => { const b = ${PANEL}?.querySelector('[data-fx="silk"]'), l = ${PANEL}?.querySelector('[data-look="fight"] svg line[data-silk]');
  return { count: b && b.style.display !== "none" ? b.innerText.trim() : null, line: l?.dataset.silk ?? null }; })()`);
const mending = (X, ms = 60000) => until("it begins to mend", async () => !!(await fight(X))?.mend, ms, 15);
/** Everything the page has said under the water since this was last asked (the word changes many times a second). */
const heard = (X) => X.evaluate(`(() => { const all = window.__silkWords ?? []; window.__silkWords = []; if (!window.__silkEar) window.__silkEar = setInterval(() => {
  const w = ${PANEL}?.querySelector('[data-look="fight"] [aria-live="off"]')?.textContent; if (w && window.__silkWords.at(-1) !== w) window.__silkWords.push(w); }, 30); return all; })()`);

const X = await browser("Silk", { width: 1280, height: 860 });
let code = 1;
try {
  await enter(X, BASE, "S");
  await toDeck(X);
  await heard(X);

  // ── with no silk ──
  await cast(X, ["barb"]);
  await strike(X);
  let s = await shown(X);
  await hand(X, "taut");
  let r = await result(X);
  ok("with no dragon silk the line is plain, and only reeled it snaps: the fish is gone", s.line === "" && s.count === null && r.how === "snapped", { s, r });

  // ── worn ──
  await X.evaluate(`${T}.setGifts(["charmLine"])`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmLine"])`);
  ok("the dragon-silk line is worn as a charm", wore.ok === true, wore);
  await cast(X, ["barb"]);
  await strike(X);
  await sleep(200);
  s = await shown(X);
  ok("worn, the line is drawn gold, and nothing counts down while all is well", s.line === "1" && s.count === null && (await fight(X)).silk === 3, { s, f: await fight(X) });
  await hand(X, "taut");
  await mending(X);
  const began = await fight(X);
  await sleep(350);
  s = await shown(X);
  const words = await text(X);
  ok("strained through, the fish is not lost at once: three seconds begin, counted down over the water", began.over === null && began.mend.how === "snapped" && began.mend.left > 2.5 && s.line === "mend" && /^[123]$/.test(s.count ?? "") && /ใยมังกรยื้อไว้/.test(words), { began, s, words });
  await X.shot(`${OUT}/silk-mending.png`);
  r = await result(X);
  ok("not brought back, the fish is lost as ever", r.how === "snapped", r);

  // brought back in time: on still, once
  await cast(X, ["barb"]);
  await strike(X);
  await heard(X);
  await hand(X, "mendOnce");
  await mending(X);
  await until("it is mended", async () => { const f = await fight(X); return !f || f.over || !f.mend; }, 6000, 15);
  const mended = await fight(X);
  await sleep(150);
  s = await shown(X);
  ok("brought back into the safe stretch in time, the fish is on still: no more than half the strain left, the count gone", !!mended && mended.over === null && mended.strain <= 0.5 && s.count === null, { mended, s });
  ok("once to a fight: the silk has done what it does, and the line is plain again", !!mended && mended.silk === 0 && s.line === "", { mended, s });
  await X.shot(`${OUT}/silk-saved.png`);
  r = await result(X);
  const said = await heard(X);
  ok("…the page said it was saved, and the fish is landed from there", said.some((w) => /รอดแล้ว/.test(w)) && said.some((w) => /ใยมังกรยื้อไว้/.test(w)) && r.how === "landed" && r.what === "barb", { said, r });

  // the second time in a fight: lost at once
  await cast(X, ["barb"]);
  await strike(X);
  await hand(X, "mendThenTaut");
  await mending(X);
  await until("it is mended", async () => { const f = await fight(X); return !f || f.over || !f.mend; }, 6000, 15);
  const once = await fight(X);
  const again = await until("the fight is over, or a second mending begins", async () => { const f = await fight(X); return !f || f.over ? "over" : f.mend ? "mend" : null; }, 30000, 10);
  r = await result(X);
  ok("the second time in the same fight there is no mending: the line snaps at once", !!once && once.over === null && once.silk === 0 && again === "over" && r.how === "snapped", { once, again, r });

  // ── two fish at once ──
  await X.evaluate(`${T}.setGifts(["charmLine", "thingRod"])`);
  await cast(X, ["barb", "tilapia"], "หย่อนสองสาย");
  const at = await strike(X);
  await hand(X, "taut");
  await until("the pair begins to mend", () => X.evaluate(`!!${F}.pair()?.mend`), 60000, 15);
  await sleep(300);
  const two = await X.evaluate(`(() => { const p = ${F}.pair(), b = ${PANEL}.querySelector('[data-fx="silk"]'); return { ended: p.ended, mend: p.mend, count: b.style.display !== "none" ? b.innerText.trim() : null,
    lines: [...${PANEL}.querySelectorAll('[data-look="fight"] svg line[data-silk]')].map((l) => l.dataset.silk) }; })()`);
  ok("in a fight of two it holds the same: neither is lost at once, and the count runs over the water", at === "fight2" && two.ended.every((e) => !e) && two.mend?.how === "snapped" && /^[123]$/.test(two.count ?? "") && two.lines.join() === "mend,mend", two);
  await X.shot(`${OUT}/silk-two.png`);
  r = await result(X);
  ok("…not brought back, they are lost one at a time, as ever", r.how === "snapped" && r.also?.how === "snapped", r);

  // ── at a phone's width ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  await cast(X, ["barb"]);
  await strike(X);
  await hand(X, "taut");
  await mending(X);
  await sleep(300);
  const fits = await X.evaluate(`(() => { const r = ${PANEL}.getBoundingClientRect(), b = ${PANEL}.querySelector('[data-fx="silk"]').getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 0.5 && b.width > 100 && b.right <= r.right && document.documentElement.scrollWidth <= window.innerWidth; })()`);
  ok("at a phone's width the count fits the water", fits);
  await X.shot(`${OUT}/silk-phone.png`);
  await result(X);
  await handOff(X);
  ok("no page errors", faults(X).length === 0, faults(X));
  code = done();
} finally { await X.close(); }
process.exit(code);
