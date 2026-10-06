// The otter (the deck's second rank, lib/town/gifts' famOtter), in a real browser on the dev test room, with two
// members: with no otter a fish that slips the hook is lost; with the otter at one's heels it is driven back for one
// more fight at once (the page shows the chase), with no bait and no stamina gone, and counted; lost again it is
// lost; driven back and fought again it is landed, and the go is written down once. The otter keeps by its member's
// float while their line is out, and the other member sees it there.
//
//   node town-otter.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes otter-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, until } from "./cdp.mjs";
import { DECK, F, K, PANEL, T, V, cast, enter, faults, hand, handOff, held, me, phase, purse, result, strike, tally, text, toDeck } from "./fish-gifts.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const { ok, done } = tally();
const stamina = async (X) => (await purse(X)).stamina.left;
const otterShown = (X) => X.evaluate(`(() => { const o = ${PANEL}?.querySelector('[data-fx="otter"]'); return o ? Number(o.dataset.otterLeft) : null; })()`);
const plays = (X) => X.evaluate(`${T}.plays().filter((p) => p.game === "fishing").map((p) => ({ how: p.how, what: p.what, won: p.won }))`);

const X = await browser("Otter", { width: 1280, height: 860 });
let code = 1;
try {
  await enter(X, BASE, "O");
  await toDeck(X);
  const id = (await me(X)).id;

  // ── with no otter ──
  await cast(X, ["snakehead"]);
  ok("with no otter nothing of one shows by the float", (await otterShown(X)) === null);
  let at = await strike(X);
  await hand(X, "slack");
  let r = await result(X);
  ok("with no otter a fish that slips the hook is lost, as ever", at === "fight" && r.how === "slipped" && r.what === "snakehead", { at, r });

  // ── the otter at my heels ──
  await X.evaluate(`${T}.setGifts(["famOtter"])`);
  const called = await X.evaluate(`${K}.familiarWear("famOtter")`);
  ok("the otter is called to follow", called.ok === true, called);
  await X.evaluate(`${T}.setStamina(100)`);
  const wormsBefore = await held(X, "worm");
  await cast(X, ["snakehead"]);
  ok("with the otter following, it is by the float, with how many it will still drive back", (await otterShown(X)) === 10, await otterShown(X));
  await X.shot(`${OUT}/otter-float.png`);
  at = await strike(X);
  const paid = 100 - (await stamina(X)), out = await held(X, "worm");
  await hand(X, "slack");
  await until("the otter drives it back", async () => (await phase(X)) === "driven", 60000, 40);
  await sleep(350);
  await X.shot(`${OUT}/otter-driven.png`);
  const words = await text(X);
  ok("a fish that slips the hook is driven back: the page shows the otter after it, and says once more", /นากต้อนปลากลับมา/.test(words) && (await X.evaluate(`!!${PANEL}.querySelector('[data-look="driven"]')`)), words);
  await until("it is fought again", async () => (await phase(X)) === "fight", 6000, 40);
  ok("…fought again at once: the same fish, no bait gone, no more stamina", (await X.evaluate(`${F}.fight().fish`)) === "snakehead" && (await held(X, "worm")) === out && out === wormsBefore - 1 && 100 - (await stamina(X)) === paid && paid === 7,
    { out, wormsBefore, paid, now: await stamina(X) });
  ok("…and counted: nine left to this meal's hours, by the keeper and beside the otter", (await purse(X)).gifts.used.famOtter.n === 1 && (await otterShown(X)) === 9, { used: (await purse(X)).gifts.used, shown: await otterShown(X) });
  await X.shot(`${OUT}/otter-fight.png`);
  r = await result(X);
  ok("lost again, it is lost (and its bait comes back, as of any fish lost in the fight)", r.how === "slipped" && r.back === true && (await held(X, "worm")) === wormsBefore && (await purse(X)).gifts.used.famOtter.n === 1, { r, worms: await held(X, "worm") });
  ok("the go is written down once, as a fish that slipped", JSON.stringify((await plays(X)).slice(-1)) === JSON.stringify([{ how: "slipped", what: "snakehead", won: false }]) && (await plays(X)).length === 2, await plays(X));

  // ── driven back, and landed the second time ──
  await cast(X, ["minnow"]);
  at = await strike(X);
  await hand(X, "taut");
  await until("the otter drives it back", async () => (await phase(X)) === "driven", 60000, 40);
  await hand(X, "win");
  r = await result(X);
  ok("a fish whose line snapped is driven back too; fought well the second time, it is landed and in the bag", r.how === "landed" && r.what === "minnow" && (await held(X, "minnow")) === 1, r);
  ok("…written down once, as a fish landed; two driven back in all", JSON.stringify((await plays(X)).slice(-1)) === JSON.stringify([{ how: "landed", what: "minnow", won: true }]) && (await plays(X)).length === 3 && (await purse(X)).gifts.used.famOtter.n === 2, await plays(X));
  await handOff(X);

  // ── by the float, for everybody ──
  const Y = await X.window("OtterB");
  await enter(Y, BASE, "Q");
  await Y.evaluate(`${V}.warp(${DECK[0] + 3}, ${DECK[1]})`);
  await until("the other is told which familiar follows me", () => Y.evaluate(`window.__cashTown.people().find((p) => p.id === ${JSON.stringify(id)})?.pet === "famOtter"`), 20000);
  const float = await X.evaluate(`${V}.fishAt().float`);
  const near = (p) => !!p && Math.hypot(p.x + 0.5 - float.x, p.y + 0.5 - float.y) < 1.1;
  const mine = () => X.evaluate(`${V}.pets()[${JSON.stringify(id)}] ?? null`), theirs = () => Y.evaluate(`${V}.pets()[${JSON.stringify(id)}] ?? null`);
  await sleep(1500);
  const resting = await mine();
  ok("with no line out the otter is at my heels, not out on the water", !!resting && !near(resting), { resting, float });
  await cast(X, ["catfish"]);
  await until("the otter swims out to my float", async () => near(await mine()), 8000, 100);
  ok("with my line out the otter keeps by my float", true);
  await until("the other member sees it there", async () => near(await theirs()), 12000, 100);
  ok("…and the other member sees it there too", true);
  await sleep(600);
  await X.shot(`${OUT}/otter-map-own.png`);
  await Y.shot(`${OUT}/otter-map-seen.png`);
  await X.evaluate(`${F}.strike()`);
  await result(X).catch(() => {});
  await press0(X);
  await until("the line is in again, and the otter comes back to my heels", async () => !near(await mine()), 10000, 100);
  ok("the line in again, it comes back to my heels", true);

  // ── at a phone's width ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  await cast(X, ["snakehead"]);
  await strike(X);
  await hand(X, "slack");
  await until("the otter drives it back", async () => (await phase(X)) === "driven", 60000, 40);
  await sleep(500);
  const fits = await X.evaluate(`(() => { const r = ${PANEL}.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 0.5 && document.documentElement.scrollWidth <= window.innerWidth; })()`);
  ok("at a phone's width the chase fits the screen", fits);
  await X.shot(`${OUT}/otter-phone.png`);
  await handOff(X);
  ok("no page errors", faults(X).length === 0 && faults(Y).length === 0, [...faults(X), ...faults(Y)]);
  code = done();
} finally { await X.close(); }
process.exit(code);

/** On from a result to the ready panel (the line is in). */
async function press0(X) { await until("ready again", async () => (await phase(X)) === "ready" || (await X.evaluate(`(() => { const b = [...${PANEL}.querySelectorAll("button")].find((x) => !x.disabled && x.innerText.trim().startsWith("หย่อนอีก")); if (b) b.click(); return false; })()`)), 8000, 150); }
