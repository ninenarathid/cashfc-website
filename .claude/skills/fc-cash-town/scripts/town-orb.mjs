// The sky orb (the deck's fifth rank, lib/town/gifts' thingOrb), in a real browser on the dev test room, with two
// members: without it nothing of one shows; with it the orb is offered where the line is dropped from, with three
// skies to choose from; lit, the sky is laid over its owner's water with its minutes running down, bites come twice
// as soon, and it cannot be lit again that day; the other member's water is as the town's is; its minutes over, the
// water is the town's own again; the next day it can be lit anew.
//
//   node town-orb.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes orb-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, until } from "./cdp.mjs";
import { F, K, PANEL, T, V, cast, enter, faults, purse, ready, tally, text, toDeck } from "./fish-gifts.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const { ok, done } = tally();
const row = (X) => X.evaluate(`(() => { const r = ${PANEL}?.querySelector("[data-orb-row]"); return r ? { state: r.dataset.orbRow, left: r.querySelector("[data-orb-left]")?.innerText ?? null, skies: [...r.querySelectorAll("[data-orb-sky]")].map((b) => b.dataset.orbSky),
  button: !!r.querySelector("[data-orb-button]"), text: r.innerText.replace(/\\s+/g, " ").trim() } : null; })()`);
const over = (X) => X.evaluate(`(() => { const o = ${PANEL}?.querySelector("[data-orb]"); return o ? { sky: o.dataset.orb, moon: !!o.querySelector("[data-orb-moon]"), rain: !!o.querySelector("[data-orb-rain]") } : null; })()`);
/** So many lines dropped straight through the keeper, each made to bring a koi (which waits thirty seconds to two minutes), and taken up again: how long each was to wait. */
const waits = (X, n) => X.evaluate(`(async () => { const place = ${V}.fishAt(), all = []; for (let i = 0; i < ${n}; i++) { ${K}.willBite(["koi"]); const c = await ${K}.cast("worm", place, false, false); if (!c.ok) return c; all.push(c.wait); await ${K}.land("left", null); } return all; })()`);
const giveUp = async (X) => { await X.evaluate(`${F}.strike()`); await until("the go is over", () => X.evaluate(`${F}.phase() === "result"`), 6000, 60).catch(() => {}); };

const X = await browser("Orb", { width: 1280, height: 860 });
let code = 1;
try {
  await enter(X, BASE, "U");
  await toDeck(X, [["worm", 99]]);
  await ready(X);

  // ── without it, and with it ──
  ok("with no sky orb nothing of one shows", (await row(X)) === null && (await over(X)) === null);
  const plain = await waits(X, 6);
  ok("…and a koi waits its thirty seconds to two minutes", Array.isArray(plain) && plain.every((w) => w >= 30 && w <= 120), plain);
  await X.evaluate(`${T}.setGifts(["thingOrb"])`);
  await until("the orb is offered", async () => (await row(X))?.state === "ready", 4000, 100);
  let r = await row(X);
  ok("with it the orb is offered where the line is dropped from, and no sky is asked for until it is opened", r.button && r.skies.length === 0, r);
  await X.evaluate(`${PANEL}.querySelector("[data-orb-button]").click()`);
  await until("the skies are offered", async () => (await row(X))?.skies.length === 3, 3000, 60);
  r = await row(X);
  ok("opened, three skies are offered: night, rain, a full moon, each drawn", r.skies.join() === "night,rain,moon" && /กลางคืน/.test(r.text) && /ฝน/.test(r.text) && /จันทร์เต็มดวง/.test(r.text)
    && (await X.evaluate(`${PANEL}.querySelectorAll("[data-orb-sky] svg[data-sky-art]").length`)) === 3, r);
  await X.shot(`${OUT}/orb-choose.png`);

  // ── lit ──
  await X.evaluate(`${PANEL}.querySelector('[data-orb-sky="moon"]').click()`);
  await until("the moon is lit", async () => (await row(X))?.state === "moon", 4000, 60);
  r = await row(X);
  const mine = await purse(X);
  ok("a full moon is chosen: it shines for me, with its thirty minutes running down", r.state === "moon" && /^(30:00|29:5\d)$/.test(r.left ?? "") && mine.orb?.sky === "moon" && !r.button && /จันทร์เต็มดวง/.test(r.text), { r, orb: mine.orb });
  ok("…counted once for the day", mine.gifts.used.thingOrb?.n === 1, mine.gifts.used);
  const before = r.left;
  await sleep(2100);
  ok("its minutes run down as they pass", (await row(X)).left !== before, { before, now: (await row(X)).left });
  await cast(X, ["minnow"]);
  let o = await over(X);
  ok("the sky is laid over my water: a night with a full moon on it", o?.sky === "moon" && o.moon === true, o);
  await sleep(400);
  await X.shot(`${OUT}/orb-moon.png`);
  await giveUp(X);
  await ready(X);
  const lit = await waits(X, 14);
  ok("under it bites come twice as soon: a koi never waits more than a minute, and some come sooner than a koi ever does", Array.isArray(lit) && lit.every((w) => w >= 15 && w <= 60) && lit.some((w) => w < 30), lit);
  const again = await X.evaluate(`${K}.orbLight("rain")`);
  ok("once a day: another sky is refused, and the moon holds", again.ok === false && again.why === "spent" && (await purse(X)).orb.sky === "moon", again);

  // ── for its owner alone ──
  const Y = await X.window("OrbB");
  await enter(Y, BASE, "V");
  await toDeck(Y, [["worm", 20]]);
  await cast(Y, ["minnow"]);
  ok("the member beside me fishes under the town's own sky: nothing is laid over their water", (await over(Y)) === null && (await row(Y)) === null && (await purse(Y)).orb === undefined);
  await Y.shot(`${OUT}/orb-other.png`);
  await giveUp(Y);

  // ── its minutes over, and the next day ──
  // (thirty-five minutes on; where that crosses the dawn a new day has begun, and the orb can be lit again)
  const dayOf = () => X.evaluate(`Math.floor((${T}.now() + 2 * 3600000) / 86400000)`), day = await dayOf();
  await X.evaluate(`${T}.skipHours(35 / 60)`);
  const rests = (await dayOf()) === day ? "spent" : "ready";
  await until("its minutes are over", async () => (await row(X))?.state === rests, 5000, 100);
  r = await row(X);
  await cast(X, ["minnow"]);
  ok("its minutes over, the water is the town's own again, and the orb rests for the day", r.state === rests && r.button === (rests === "ready") && (await over(X)) === null, r);
  await giveUp(X);
  await ready(X);
  const afterwards = await waits(X, 4);
  ok("…and a koi waits as it ever did", Array.isArray(afterwards) && afterwards.every((w) => w >= 30), afterwards);
  await X.evaluate(`${T}.skipHours(24)`);
  await until("the next day it can be lit anew", async () => (await row(X))?.state === "ready", 5000, 100);
  ok("the next day it can be lit anew", true);

  // ── rain, and at a phone's width ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  await X.evaluate(`${PANEL}.querySelector("[data-orb-button]").click()`);
  await until("the skies are offered", async () => (await row(X))?.skies.length === 3, 3000, 60);
  const fits = await X.evaluate(`(() => { const p = ${PANEL}.getBoundingClientRect(), all = [...${PANEL}.querySelectorAll("[data-orb-sky]")].map((b) => b.getBoundingClientRect()); return p.left >= 0 && p.right <= window.innerWidth + 0.5 && all.every((b) => b.left >= p.left && b.right <= p.right) && document.documentElement.scrollWidth <= window.innerWidth; })()`);
  ok("at a phone's width the three skies fit the panel", fits);
  await X.shot(`${OUT}/orb-phone-choose.png`);
  await X.evaluate(`${PANEL}.querySelector('[data-orb-sky="rain"]').click()`);
  await until("rain is lit", async () => (await row(X))?.state === "rain", 4000, 60);
  await cast(X, ["minnow"]);
  o = await over(X);
  const a = await X.evaluate(`${PANEL}.querySelector("[data-orb-rain]").style.backgroundPosition`);
  await sleep(300);
  const b = await X.evaluate(`${PANEL}.querySelector("[data-orb-rain]").style.backgroundPosition`);
  ok("under its rain, rain falls across my water", o?.sky === "rain" && o.rain === true && a !== b, { o, a, b });
  await X.shot(`${OUT}/orb-phone-rain.png`);
  await giveUp(X);
  ok("no page errors", faults(X).length === 0 && faults(Y).length === 0, [...faults(X), ...faults(Y)]);
  void text;
  code = done();
} finally { await X.close(); }
process.exit(code);
