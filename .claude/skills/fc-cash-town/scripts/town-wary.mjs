// The fishing made harder to match its gifts, in a real browser on the dev test room: lines taken up again and
// again, and the rare fish are gone from that hand's water a while, with nothing on the screen to say so (a stardust
// bait then finds the water still); with the whispering float a strike too soon counts as a line taken up, without
// it it does not; a legend is landed only after two fights running, the second beginning as the first is won, and
// is one fish all the same; and from the fourth rank of the deck a fish that is uncommon or better is longer and
// fights harder, a common one as ever.
//
//   node town-wary.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes wary-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, until } from "./cdp.mjs";
import { F, K, PANEL, T, V, cast, enter, faults, hand, handOff, held, phase, purse, ready, result, strike, tally, text, toDeck } from "./fish-gifts.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const { ok, done } = tally();
const RARE = ["featherback", "goby", "wels", "gar", "moonFish", "koi", "arapaima"];
const wary = async (X) => (await purse(X)).wary ?? null;
const isWary = async (X) => { const w = await wary(X); return !!w && w.until > (await X.evaluate(`${T}.now()`)); };
/** A member as they begin: no line taken up lately, and these gifts. */
const fresh = (X, gifts = []) => X.evaluate(`(() => { ${T}.setGifts(${JSON.stringify(gifts)}); const p = ${T}.purse(); const q = { ...p }; delete q.wary; delete q.orb; ${T}.fished({ ...q, gifts: { ...q.gifts, used: {} } }); return true; })()`);
/** So many lines dropped straight through the keeper and ended each the same way: pulled up, or struck too soon. */
const upAndDown = (X, n, how) => X.evaluate(`(async () => { const place = ${V}.fishAt(), all = []; for (let i = 0; i < ${n}; i++) {
  const c = await ${K}.cast("worm", place, false, true); if (!c.ok) return c;
  if (${JSON.stringify(how)} === "left") await ${K}.land("left", null); else await ${K}.strike(-3, null);
  const w = ${T}.purse().wary; all.push(w ? w.ups.length : null); } return all; })()`);
/** So many stardust baits dropped (the day's count put back each time), each taken up without its being counted: what each brought, or why not. */
const stars = (X, n) => X.evaluate(`(async () => { const place = ${V}.fishAt(), all = []; for (let i = 0; i < ${n}; i++) {
  const p = ${T}.purse(); ${T}.fished({ ...p, gifts: { ...p.gifts, used: {} } });
  const c = await ${K}.cast("worm", place, false, true, "star"); all.push(c.ok ? "ok" : c.why);
  if (c.ok) { const w = ${T}.purse().wary; await ${K}.land("left", null); const q = ${T}.purse(); ${T}.fished(w ? { ...q, wary: w } : (() => { const r = { ...q }; delete r.wary; return r; })()); } } return all; })()`);

const X = await browser("Wary", { width: 1280, height: 860 });
let code = 1;
try {
  await enter(X, BASE, "W");
  await toDeck(X, [["worm", 99]]);
  await ready(X);

  // ── wary fish ──
  await fresh(X, ["thingBait"]);
  ok("a stardust bait finds rare fish in the water, to begin with", (await stars(X, 3)).join() === "ok,ok,ok");
  /** What the panel reads, less how many of each bait are left (lines dropped take worms). */
  const reads = async () => (await text(X)).replace(/×\d+/g, "×");
  const before = await reads();
  let ups = await upAndDown(X, 4, "left");
  ok("a line pulled up with nothing hooked is counted: three of them and nothing has changed; at the fourth the rare fish are gone", JSON.stringify(ups) === "[1,2,3,0]" && (await isWary(X)), { ups, wary: await wary(X) });
  const w = await wary(X), nowMs = await X.evaluate(`${T}.now()`);
  ok("…for ten minutes", Math.abs(w.until - nowMs - 600000) < 5000, { until: w.until - nowMs });
  ok("the stardust bait now finds the water still, and is not spent", (await stars(X, 3)).join() === "calm,calm,calm" && !(await purse(X)).gifts.used.thingBait, await stars(X, 1));
  await sleep(300);
  ok("nothing on the screen says so: the panel reads as it did", (await reads()) === before, { before, now: await reads() });
  await X.evaluate(`${T}.skipHours(11 / 60)`);
  ok("eleven minutes on, the rare fish are back", !(await isWary(X)) && (await stars(X, 2)).join() === "ok,ok");

  // with no float a strike too soon is a mistake; with it, a line taken up
  await fresh(X, []);
  ups = await upAndDown(X, 6, "early");
  ok("with no float six strikes too soon are six mistakes: nothing is counted", ups.every((n) => n === null) && !(await isWary(X)), ups);
  await fresh(X, ["charmFloat"]);
  await X.evaluate(`${K}.charmsWear(["charmFloat"])`);
  ups = await upAndDown(X, 4, "early");
  ok("with the whispering float worn the line told what was on its way: four strikes too soon are four lines taken up, and the rare fish are gone", JSON.stringify(ups) === "[1,2,3,0]" && (await isWary(X)), ups);

  // ── a legend's second bout ──
  await fresh(X, []);
  await X.evaluate(`(${T}.setStamina(100), ${T}.setLine("fishing", 0))`);
  let landed = null, bouts = [], tries = 0;
  for (; tries < 10 && !landed; tries++) {
    await X.evaluate(`${T}.setStamina(100)`);
    await cast(X, ["koi"]);
    const at = await strike(X);
    const paid = 100 - (await purse(X)).stamina.left;
    await hand(X, "win");
    const seen = await until("the first bout is over", async () => { const p = await phase(X), b = await X.evaluate(`${F}.bout?.() ?? null`); return p === "result" ? "result" : b === 2 ? "second" : null; }, 180000, 30);
    bouts.push(seen);
    if (seen === "second") {
      await sleep(250);
      const mark = await X.evaluate(`(() => { const b = ${PANEL}.querySelector('[data-fx="bout"]'); return { chip: b?.innerText ?? null, word: ${PANEL}.querySelector('[data-look="fight"] [aria-live="off"]')?.textContent ?? "", phase: ${F}.phase(), surge: ${F}.fight()?.surge.from, stamina: 100 - ${T}.purse().stamina.left, plays: ${T}.plays().length }; })()`);
      if (!landed && bouts.filter((b) => b === "second").length === 1) {
        await X.shot(`${OUT}/wary-second-bout.png`);
        ok("a legend is not landed by one fight: as the first is won the second begins at once, the fish away, and the page says so", at === "fight" && mark.phase === "fight" && mark.chip === "ยกที่สอง" && /ยกที่สอง/.test(mark.word) && mark.surge === 0, mark);
        ok("…with nothing more paid for it, and nothing written down yet: it is one fish", mark.stamina === paid && paid === 12, { paid, mark });
      }
    }
    const r = await result(X, 180000);
    if (r.how === "landed") landed = { r, plays: await X.evaluate(`${T}.plays().filter((p) => p.game === "fishing" && p.what === "koi").map((p) => p.won)`), koi: await held(X, "koi"), stamina: 100 - (await purse(X)).stamina.left };
  }
  ok(`both bouts won, it is landed: one koi in the bag, its fight paid for once, and one go won among the ${tries} it took`, !!landed && landed.koi === 1 && landed.stamina === 12 && landed.plays.filter(Boolean).length === 1 && landed.plays.length === tries, { landed, bouts });
  await X.shot(`${OUT}/wary-legend-landed.png`);
  // lost in the second bout, it is lost
  let lostSecond = null;
  for (let i = 0; i < 10 && !lostSecond; i++) {
    await X.evaluate(`${T}.setStamina(100)`);
    await cast(X, ["koi"]);
    await strike(X);
    await hand(X, "winThenSlack");
    const seen = await until("the first bout is over", async () => { const p = await phase(X), b = await X.evaluate(`${F}.bout?.() ?? null`); return p === "result" ? "result" : b === 2 ? "second" : null; }, 180000, 30);
    const r = await result(X, 180000);
    if (seen === "second" && r.how === "slipped") lostSecond = r;
  }
  ok("lost in the second bout, it is lost", !!lostSecond && lostSecond.what === "koi" && (await held(X, "koi")) === (landed ? 1 : 0), lostSecond);
  await handOff(X);

  // ── harder for the skilled ──
  await fresh(X, []);
  await X.evaluate(`(${T}.setLine("fishing", 0), ${T}.setStamina(100))`);
  await cast(X, ["snakehead"]);
  await strike(X);
  const plain = await X.evaluate(`(() => { const f = ${F}.fight(); return { pull: f.pull, power: f.power, length: f.length, band: f.hi - f.lo, harder: ${F}.harder() }; })()`);
  await hand(X, "slack");
  await result(X);
  await X.evaluate(`${T}.setLine("fishing", 700)`);
  const sizes = await X.evaluate(`(async () => { const place = ${V}.fishAt(), all = []; for (let i = 0; i < 30; i++) { ${K}.willBite(["snakehead"]); const c = await ${K}.cast("worm", place, false, true); if (!c.ok) return c; const s = await ${K}.strike(0.2, "good"); all.push(s.size); await ${K}.land("left", null); } return all; })()`);
  ok("at the fourth rank of the deck a snakehead is 8% longer than its kind ever is for others: none under 37.8 cm, where they begin at 35", Array.isArray(sizes) && sizes.every((s) => s >= 37.8 && s <= 75.6), sizes);
  await X.evaluate(`${T}.setStamina(100)`);
  await cast(X, ["snakehead"]);
  await strike(X);
  const hard = await X.evaluate(`(() => { const f = ${F}.fight(); return { pull: f.pull, power: f.power, length: f.length, band: f.hi - f.lo, harder: ${F}.harder() }; })()`);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  // (a line's length is its fish's, by what the strike was worth: a perfect one's four fifths, a late one's more)
  const ofLine = (length, line) => [0.8, 1, 1.15].some((worth) => near(length, line * worth));
  ok("…and fights 8% harder: its pull, its surge and its line to win, each 8% more; its safe stretch as wide as ever", plain.harder === 1 && near(hard.harder, 1.08) && near(hard.pull, plain.pull * 1.08) && near(hard.power, plain.power * 1.08)
    && ofLine(plain.length, 1.1) && ofLine(hard.length, 1.1 * 1.08) && near(hard.band, plain.band), { plain, hard });
  ok("nothing on the screen says so", !/1\.08|8%|ยากขึ้น/.test(await text(X)));
  await X.shot(`${OUT}/wary-harder.png`);
  await hand(X, "slack");
  await result(X);
  await cast(X, ["barb"]);
  await strike(X);
  const common = await X.evaluate(`(() => { const f = ${F}.fight(); return { pull: f.pull, length: f.length }; })()`);
  ok("a common fish is as it is for everybody", near(common.pull, 0.14) && ofLine(common.length, 0.8), common);
  await hand(X, "slack");
  await result(X);
  await X.evaluate(`${T}.setLine("fishing", 0)`);
  await handOff(X);
  ok("no page errors", faults(X).length === 0, faults(X));
  code = done();
} finally { await X.close(); }
process.exit(code);
