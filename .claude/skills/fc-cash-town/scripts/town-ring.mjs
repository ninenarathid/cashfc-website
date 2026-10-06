// The ring of shared strength (the helpers' fourth rank, lib/town/gifts), in a real browser on the dev test room, by
// two testers in two windows of one browser (the trial keeps both purses there; who stands where is the room's): the
// wearer, standing still beside a friend, is offered the friend by name; one press gives the friend thirty stamina
// for fifteen of the wearer's own, light goes over from one to the other on both screens, and the friend's page says
// who gave it. Never above the friend's full gauge; refused to a wearer who has not the fifteen; three times a day.
//
//   node town-ring.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes ring-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm", R = "window.__townRing";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const stamina = (X) => X.evaluate(`${T}.purse().stamina.left`);
const chips = (X) => X.evaluate(`[...document.querySelectorAll("[data-ring-chip]")].map((b) => ({ id: b.dataset.ringChip, text: b.innerText.replace(/\\s+/g, " ").trim() }))`);
const noteOf = (X) => X.evaluate(`document.querySelector("[data-ring-note]")?.innerText ?? null`);
const news = (X) => X.evaluate(`(() => { const p = document.querySelector("[data-help-news]"); return p ? { what: p.dataset.helpNews, by: p.dataset.helpBy, text: p.innerText } : null; })()`);
const used = (X) => X.evaluate(`${T}.purse().gifts?.used?.charmRing?.n ?? 0`);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=helpring&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
/** Press the chip that offers somebody, and wait for the word of what came of it. */
async function give(X, id) {
  await until("the friend is offered", async () => (await chips(X)).some((c) => c.id === id), 8000, 80);
  await X.evaluate(`document.querySelector('[data-ring-chip="${id}"]').click()`);
  await until("a word of what came of it", async () => (await noteOf(X)) !== null, 6000, 60);
  return noteOf(X);
}
const noteGone = (X) => until("the word is gone", async () => (await noteOf(X)) === null, 8000, 100);

const X = await browser("Ring", { width: 1280, height: 860 });
try {
  await enter(X, "R");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await enter(X, "R");
  await X.evaluate(`(${T}.setGifts(["charmRing"]), ${T}.setStamina(60), ${T}.save({ ...${T}.purse(), aided: [] }))`);
  const a = await X.evaluate(`${T}.id`);
  await warp(X, 132, 15);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);

  const Y = await X.window("RingB");
  await enter(Y, "S");
  await Y.evaluate(`(${T}.setGifts(false), ${T}.setStamina(40), ${T}.save({ ...${T}.purse(), aided: [] }))`);
  const b = await Y.evaluate(`${T}.id`);
  await warp(Y, 133, 15);
  await until("the farm's own code has come to the second window", () => Y.evaluate(`!!${F}`), 20000);
  await until("the wearer's page has the friend on its map", () => X.evaluate(`!!window.__cashTown.people().find((p) => p.id === ${JSON.stringify(b)})`), 20000, 200);

  // ── had and not worn: nothing; worn: the friend beside me is offered by name ──
  await sleep(800);
  ok("with the ring had but not worn nobody is offered", (await chips(X)).length === 0);
  const wore = await X.evaluate(`${K}.charmsWear(["charmRing"])`);
  await until("the friend is offered", async () => (await chips(X)).length === 1, 8000, 80);
  const offered = (await chips(X))[0];
  ok("worn, standing still beside a friend: the friend is offered by name, with what would be given and how many givings the day has left", wore.ok === true && offered.id === b && /S/.test(offered.text) && /\+30/.test(offered.text) && /3/.test(offered.text), offered);
  ok("…the friend, who has no ring, is offered nobody", (await chips(Y)).length === 0);
  await X.shot(`${OUT}/ring-offer.png`);

  // ── a friend who does not stand near is not offered ──
  await warp(Y, 133, 25);
  await until("the friend far off is offered no more", async () => (await chips(X)).length === 0, 8000, 80);
  ok("a friend ten tiles off is not offered", (await X.evaluate(`${R}.near().length`)) === 0);
  await warp(Y, 133, 16);
  await until("the friend is back beside me", async () => (await chips(X)).length === 1, 8000, 80);

  // ── given: thirty for fifteen ──
  const said = await give(X, b);
  await until("the friend's stamina has come", async () => (await stamina(Y)) === 70, 6000, 60);
  ok("one press: the friend has thirty stamina, and mine falls by fifteen", (await stamina(X)) === 45 && (await stamina(Y)) === 70 && /\+30/.test(said) && /15/.test(said) && (await used(X)) === 1, { x: await stamina(X), y: await stamina(Y), said });
  await until("the friend is told who gave it", async () => (await news(Y))?.what === "ring", 6000, 60);
  const toldY = await news(Y);
  ok("the friend's page says who gave it, and how much", toldY.by === a && /\+30/.test(toldY.text) && /R/.test(toldY.text), toldY);
  const beams = { x: await X.evaluate(`${F}.beams()`), y: await Y.evaluate(`${F}.beams()`) };
  ok("light goes over from the giver to the friend on both screens", beams.x.some((p) => p[0] === a && p[1] === b) && beams.y.some((p) => p[0] === a && p[1] === b), beams);
  await X.shot(`${OUT}/ring-gave.png`);
  await Y.shot(`${OUT}/ring-had.png`);
  ok("the chip says one giving fewer is left", /2/.test((await chips(X))[0]?.text ?? ""), await chips(X));

  // ── never above the friend's full gauge ──
  await noteGone(X);
  await Y.evaluate(`${T}.setStamina(90)`);
  await X.evaluate(`${T}.setStamina(60)`);
  await give(X, b);
  await until("the friend's gauge is full", async () => (await stamina(Y)) === 100, 6000, 60);
  ok("where the friend's gauge has room for ten, ten is given and five paid", (await stamina(X)) === 55 && (await used(X)) === 2, { x: await stamina(X) });
  await noteGone(X);
  const full = await give(X, b);
  ok("a friend whose gauge is full is given nothing: said so, and no giving of the day is counted", /เต็ม/.test(full) && (await stamina(X)) === 55 && (await stamina(Y)) === 100 && (await used(X)) === 2, { full });

  // ── refused when the wearer has not the fifteen ──
  await noteGone(X);
  await Y.evaluate(`${T}.setStamina(20)`);
  await X.evaluate(`${T}.setStamina(10)`);
  const weak = await give(X, b);
  ok("a wearer who has not the fifteen gives nothing: said so", /ไม่พอ/.test(weak) && (await stamina(X)) === 10 && (await stamina(Y)) === 20 && (await used(X)) === 2, { weak });

  // ── at a phone's width; and three times a day ──
  await noteGone(X);
  await X.evaluate(`${T}.setStamina(80)`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(900);
  await until("the friend is offered on the phone", async () => (await chips(X)).length === 1, 8000, 80);
  const fits = await X.evaluate(`(() => { const r = document.querySelector("[data-ring-chip]").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44; })()`);
  ok("at a phone's width the offer is whole on the screen, and big enough for a thumb", fits === true);
  await X.shot(`${OUT}/ring-phone.png`);
  await give(X, b);
  await until("the third giving has come", async () => (await stamina(Y)) === 50, 6000, 60);
  await until("nobody is offered any more", async () => (await chips(X)).length === 0, 8000, 80);
  ok("the day's third giving is its last: the ring offers nobody after it", (await stamina(X)) === 65 && (await used(X)) === 3 && (await X.evaluate(`${R}.left()`)) === 0, { x: await stamina(X), used: await used(X) });
  const threw = [...(X.logs ?? []), ...(Y.logs ?? [])].filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on either page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
