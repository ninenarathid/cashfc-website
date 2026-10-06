// The guardian's cloak (the helpers' sixth rank, lib/town/gifts), and good things made harder for the skilled, in a
// real browser on the dev test room: with no stamina, work in somebody else's bed is no harder at all for the
// cloak's wearer (what is done at once with stamina is done at once; the hoe's games are not the tired ones), and
// the games of that work are twice as wide (the swing's stretch, the time between the weeding's gusts, the long
// pour's marks); in a bed of one's own nothing is changed. And from the helpers' fourth rank a neighbour's crop of
// the second tier or better has narrower marks, by the helpers' rank and not the farming one, where the simplest
// crops are as they are.
//
//   node town-guard.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes guard-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm", G = "window.__townGame";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(650); };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const hold = (X, item) => X.evaluate(`(() => { const p = ${T}.purse(), slot = p.bag.findIndex((s) => s?.item === ${JSON.stringify(item)}); ${T}.hold(slot); })()`);
const canOf = (X, n) => X.evaluate(`(() => { if (!${T}.purse().bag.some((s) => s?.item === "can")) ${T}.grant("can", 1); const p = ${T}.purse(), slot = p.bag.findIndex((s) => s?.item === "can");
  ${T}.save({ ...p, bag: p.bag.map((s, i) => (i === slot ? { ...s, water: ${n} } : s)) }); })()`);
const plantRow = (X, x0, y, crop, by) => X.evaluate(`Array.from({ length: 7 }, (_, i) => ${T}.setPlot((${x0} + i) + "," + ${y}, { soil: "tilled", plant: { by: ${JSON.stringify(by)} ?? ${T}.id, crop: ${JSON.stringify(crop)}, sown: ${T}.now() - 5 * 3600000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 9999 * 3600000, cured: 0, picked: 0, pickedAt: 0 } }))`);
/** Stand on a plot and begin what the hand does there (or the long pour): which game comes up (null: none, it was done at once), with what the game has to show. */
async function beginAt(X, x, y, how = "act") {
  await warp(X, x, y);
  await until(`something is offered at ${x},${y}`, async () => (await X.evaluate(`${F}.offer()`)) !== null, 6000, 60);
  await X.evaluate(`${F}.${how}()`);
  await sleep(450);
  const kind = await gameUp(X);
  const state = kind ? await X.evaluate(`(() => { const g = ${G}; return g.kind === "weeding" ? g.patch() : g.kind === "timing" ? g.round() : g.state(); })()`) : null;
  return { kind, state };
}
async function giveUp(X) {
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await until("the game is given up", async () => (await gameUp(X)) === null, 4000, 40);
}
const wear = (X, ids) => X.evaluate(`${K}.charmsWear(${JSON.stringify(ids)})`);

const X = await browser("Guard", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=W&townRoom=check&townHour=10&townWeather=cloudy`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  // a neighbour's bed (the farm's first: its corner is 132,4): rows of common plants and of better ones, weeds and cleared ground; and a bed of mine (the show garden)
  await X.evaluate(`(${T}.resize(14), ${T}.setGifts(["charmGuard", "charmGloves"]), ${T}.showGarden("W"), ${T}.grant("hoe", 1), ${T}.setLine("helpers", 0), ${T}.setLine("farming", 0))`);
  await X.evaluate(`${T}.write("cashtown.trial.beds.1", { ...${T}.beds(), 0: { by: "N", tended: ${T}.now(), empty: 0, name: "Nan" } })`);
  await plantRow(X, 132, 6, "pumpkin", "N");
  await plantRow(X, 132, 7, "eggplant", "N");
  await plantRow(X, 132, 8, "kangkong", "N");
  await plantRow(X, 132, 9, "eggplant", "N");
  await X.evaluate(`[132, 133, 134, 135].forEach((x) => ${T}.setPlot(x + ",5", { soil: "cleared", plant: null }))`);
  await canOf(X, 60);
  await hold(X, "can");
  await warp(X, 132, 6);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);

  // ── as it is for everybody: rested, and tired ──
  await X.evaluate(`${T}.setStamina(100)`);
  await hold(X, "hoe");
  const restedTill = await beginAt(X, 132, 5);
  await giveUp(X);
  const restedWeed = await beginAt(X, 132, 4);
  await giveUp(X);
  await X.evaluate(`${T}.setStamina(0)`);
  const tiredTill = await beginAt(X, 132, 5);
  await giveUp(X);
  const tiredWeed = await beginAt(X, 132, 4);
  await giveUp(X);
  await hold(X, "can");
  const tiredWater = await beginAt(X, 132, 6);
  ok("(with no cloak, tired hands in a neighbour's bed have what they have everywhere: a narrow swing that is dropped at the third miss, quicker gusts in the weeds, and a game for a watering)",
    restedTill.kind === "timing" && near(restedTill.state.width, 0.17) && restedTill.state.most === 0 && tiredTill.kind === "timing" && near(tiredTill.state.width, 0.17 * 0.35) && tiredTill.state.most === 3
    && restedWeed.kind === "weeding" && tiredWeed.kind === "weeding" && tiredWeed.state.every < restedWeed.state.every && tiredWater.kind === "pouring" && tiredWater.state.most === 3,
    { restedTill: restedTill.state?.width, tiredTill: tiredTill.state?.width, restedWeed: restedWeed.state?.every, tiredWeed: tiredWeed.state?.every, tiredWater: tiredWater.kind });
  await giveUp(X);

  // ── the cloak worn, with no stamina ──
  const wore = await wear(X, ["charmGuard"]);
  const water = await beginAt(X, 132, 6);
  await until("the neighbour's plant is watered", () => X.evaluate(`${F}.seen("132,6").wet`), 6000, 60);
  ok("worn, with no stamina: a neighbour's plant is watered at once, with no game, as with stamina", wore.ok === true && water.kind === null && (await X.evaluate(`${T}.purse().stamina.left`)) === 0);
  await hold(X, "hoe");
  const till = await beginAt(X, 132, 5);
  ok("the swing in a neighbour's bed is not the tired one, and is twice as wide: it can be missed, and is not dropped", till.kind === "timing" && near(till.state.width, 0.17 * 2) && till.state.most === 0, till.state);
  await X.shot(`${OUT}/guard-till.png`);
  await giveUp(X);
  const weed = await beginAt(X, 132, 4);
  ok("the weeding there has twice as long between its gusts as a rested hand has", weed.kind === "weeding" && near(weed.state.every, restedWeed.state.every * 2) && weed.state.most === 0, { every: weed.state?.every, rested: restedWeed.state.every });
  await giveUp(X);

  // ── with stamina too the games are twice as wide; and the long pour ──
  await X.evaluate(`${T}.setStamina(100)`);
  const rested = await beginAt(X, 133, 5);
  ok("with stamina the cloak's games are twice as wide too", rested.kind === "timing" && near(rested.state.width, 0.34), rested.state);
  await giveUp(X);
  await wear(X, ["charmGuard", "charmGloves"]);
  await hold(X, "can");
  await X.evaluate(`${T}.setStamina(0)`);
  const pour = await beginAt(X, 134, 8, "pourAct");
  ok("the long pour's marks are twice as wide under the cloak, tired or not", pour.kind === "longpour" && near(pour.state.zone, 1.2) && near(pour.state.speed, 1.6), pour.state);
  await X.shot(`${OUT}/guard-pour.png`);
  await giveUp(X);
  await wear(X, ["charmGloves"]);
  const bare = await beginAt(X, 134, 8, "pourAct");
  ok("…where a tired hand with no cloak has them narrow, and the water quicker", bare.kind === "longpour" && near(bare.state.zone, 0.6 * 0.35) && bare.state.speed > 2, bare.state);
  await giveUp(X);

  // ── others' plants only ──
  await wear(X, ["charmGuard"]);
  const mine = await beginAt(X, 150, 14);
  ok("in a bed of my own nothing is changed: tired hands have their game for a watering", mine.kind === "pouring" && mine.state.most === 3 && near(mine.state.width, 0.052), mine.state);
  await giveUp(X);

  // ── good things are harder for the skilled: by the helpers' rank, in somebody else's bed ──
  await wear(X, ["charmGloves"]);
  await X.evaluate(`(${T}.setStamina(100), ${T}.setLine("farming", 12000))`);
  await sleep(400);
  const farmer = await beginAt(X, 134, 9, "pourAct");
  ok("a master of the farming line pours a neighbour's row of eggplants as a newcomer does: there it is the helpers' rank that counts", farmer.kind === "longpour" && near(farmer.state.zone, 0.6), farmer.state);
  await giveUp(X);
  await X.evaluate(`${T}.setLine("helpers", 30000)`);
  await sleep(400);
  const helper = await beginAt(X, 134, 9, "pourAct");
  ok("at the helpers' tenth rank the marks of a row of eggplants are narrower (by 1.56)", helper.kind === "longpour" && near(helper.state.zone, 0.6 / 1.56), helper.state);
  await giveUp(X);
  const common = await beginAt(X, 134, 8, "pourAct");
  ok("…and a row of the simplest crop is as it is for everybody", common.kind === "longpour" && near(common.state.zone, 0.6), common.state);
  await giveUp(X);
  await X.evaluate(`${T}.setStamina(0)`);
  const hardWater = await beginAt(X, 133, 9);
  ok("tired hands' game for one of those eggplants has narrower marks too, by the same rank", hardWater.kind === "pouring" && near(hardWater.state.width, 0.052 / 1.56), hardWater.state);
  await giveUp(X);
  const easyWater = await beginAt(X, 133, 8);
  ok("…and for a plant of the simplest crop the marks are as they are", easyWater.kind === "pouring" && near(easyWater.state.width, 0.052), easyWater.state);
  await giveUp(X);
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
