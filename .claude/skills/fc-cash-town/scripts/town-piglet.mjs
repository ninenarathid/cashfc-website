// The truffle piglet (the forest's third rank; the owner's ladder of 2026-10-07): digging with no hoe held, nothing
// bruised however badly one digs, one more out of every hole, ten holes to a meal's hours. Tried in the trial: with
// no piglet and no hoe a mound offers nothing; with the piglet its way is offered, with how many holes it has left;
// its game has the piglet on the board and a part rooted at twice is not bruised; one more comes out; with a hoe in
// the hand the hoe's way is offered beside it and is as for anybody; past its count the piglet's way is gone.
//
//   node .claude/skills/fc-cash-town/scripts/town-piglet.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes piglet-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townForest", G = "window.__townGame";
const enter = async (X) => {
  await X.goto(`${BASE}/town?townTest=I&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const sights = (X) => X.evaluate(`${F}?.sights?.() ?? []`);
const bag = (X) => X.evaluate(`JSON.stringify(${T}.purse().bag.filter(Boolean).map((s) => [s.item, s.n]))`);
const got = async (X, was) => { const now = JSON.parse(await bag(X)), old = new Map(JSON.parse(was)); return now.map(([id, n]) => [id, n - (old.get(id) ?? 0)]).filter(([, n]) => n > 0); };
const left = (X) => X.evaluate(`${T}.purse().stamina.left`);
const pigLeft = (X) => X.evaluate(`document.querySelector('[data-forest-offer="piglet"]')?.dataset.left ?? null`);
const offers = (X) => X.evaluate(`[...document.querySelectorAll("[data-forest-offer]")].map((b) => b.dataset.forestOffer)`);
/** Stand on a mound that has something, the next one not dug yet. */
const dugAt = new Set();
async function toMound(X) {
  const m = (await sights(X)).find((s) => s.kind === "mound" && !dugAt.has(s.id));
  dugAt.add(m.id);
  await X.evaluate(`${V}.warp(${m.x}, ${m.y})`);
  await sleep(900);
  return m;
}
/** Dig the mound's thing out; `again`: striking a part once more after it is bare, first. */
async function dig(X, again = false) {
  const d = await X.evaluate(`${G}.dig()`);
  let struck = false;
  for (const [i, c] of d.cells.entries()) if (c.over) {
    for (let n = c.earth; n > 0; n--) { await X.evaluate(`${G}.strike(${i})`); await sleep(60); }
    if (again && !struck && (await gameUp(X)) === "digging") { struck = true; await X.evaluate(`${G}.strike(${i})`); await sleep(60); }
  }
  return d;
}

const X = await browser("Piglet", { width: 1280, height: 860 });
try {
  await enter(X);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
  await sleep(300);
  await enter(X);
  await X.evaluate(`${T}.setSalt?.("check")`);
  await X.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's things", async () => (await sights(X)).length > 40, 30000);

  // ── no piglet, no hoe: nothing ──
  let m = await toMound(X);
  ok("with no piglet and no hoe, a mound offers nothing", (await offers(X)).length === 0 && (await X.evaluate(`${F}.here()`)) === null);

  // ── the piglet, and no hoe ──
  await X.evaluate(`${T}.setGifts(["famPiglet"])`);
  const called = await X.evaluate(`${K}.familiarWear("famPiglet")`);
  ok("the piglet is called", called.ok === true, called);
  await until("its way is offered", async () => (await offers(X)).includes("piglet"), 6000).catch(() => null);
  ok("with it at my heels the mound offers the piglet's way, and no hoe's", JSON.stringify(await offers(X)) === '["piglet"]', await offers(X));
  ok("…with the ten holes it has to these hours", (await pigLeft(X)) === "10", await pigLeft(X));
  await sleep(500);
  await X.shot(`${OUT}/piglet-offer.png`);
  let was = await bag(X);
  // (the space bar is the piglet's, where it is the only way)
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space" });
  await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space" });
  ok("the space bar begins it: a digging with the piglet on the board", (await until("the digging game", () => gameUp(X), 4000).catch((e) => e.message)) === "digging"
    && (await X.evaluate(`document.querySelector('[data-look="digging"]')?.dataset.gentle`)) === "1" && (await X.evaluate(`!!document.querySelector("[data-dig-piglet]")`)));
  let d = await X.evaluate(`${G}.dig()`);
  const first = d.cells.findIndex((c) => c.over);
  for (let n = d.cells[first].earth; n > 0; n--) { await X.evaluate(`${G}.strike(${first})`); await sleep(60); }
  await X.evaluate(`${G}.strike(${first})`);
  await sleep(250);
  ok("a part rooted at again is not bruised", (await X.evaluate(`${G}.dig().misses`)) === 0 && (await X.evaluate(`${G}.dig().hits`)) === 1, await X.evaluate(`JSON.stringify(${G}.dig())`));
  ok("…and the piglet is over the place it roots at", (await X.evaluate(`document.querySelector("[data-dig-piglet]")?.dataset.digPiglet`)) === String(first));
  await X.shot(`${OUT}/piglet-digging.png`);
  await dig(X);
  await until("it is dug out", async () => (await got(X, was)).length > 0, 6000).catch(() => null);
  let came = await got(X, was);
  ok("every part laid bare, what the mound had comes out and one more", came.length === 1 && came[0][1] === m.n + 1, { came, n: m.n });
  ok("…for the stamina digging costs", (await left(X)) === 97, await left(X));
  ok("…the page says what came, with the piglet's picture", await X.evaluate(`!!document.querySelector('[data-forest-note="famPiglet"]')`));
  await sleep(400);
  await X.shot(`${OUT}/piglet-dug.png`);

  // ── a hoe in the hand too: both ways, and the hoe's is as for anybody ──
  await X.evaluate(`(${T}.grant("hoe", 1), ${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "hoe")))`);
  m = await toMound(X);
  await until("both ways are offered", async () => (await offers(X)).length === 2, 6000).catch(() => null);
  ok("with a hoe in the hand both ways are offered: the hoe's, and the piglet's beside it", JSON.stringify(await offers(X)) === '["dig","piglet"]', await offers(X));
  ok("…the piglet has nine holes left", (await pigLeft(X)) === "9", await pigLeft(X));
  await sleep(400);
  await X.shot(`${OUT}/piglet-both.png`);
  was = await bag(X);
  await X.evaluate(`${F}.act()`);
  await until("the digging game", () => gameUp(X), 4000);
  ok("the hoe's way is the hoe's game: no piglet on the board", (await X.evaluate(`document.querySelector('[data-look="digging"]')?.dataset.gentle`)) === "0" && !(await X.evaluate(`!!document.querySelector("[data-dig-piglet]")`)));
  d = await dig(X, true);
  await until("it is dug out", async () => (await got(X, was)).length > 0, 6000).catch(() => null);
  came = await got(X, was);
  ok("…a part struck again is bruised: one fewer (never none), and no more", came.length === 1 && came[0][1] === Math.max(1, m.n - 1), { came, n: m.n });
  ok("…and no hole of the piglet's is counted", (await X.evaluate(`${K}.purse().gifts.used?.famPiglet?.n ?? 0`)) === 1);
  // the piglet's way, chosen with the hoe held
  m = await toMound(X);
  await until("both ways are offered", async () => (await offers(X)).length === 2, 6000).catch(() => null);
  was = await bag(X);
  await X.evaluate(`document.querySelector('[data-forest-offer="piglet"]').click()`);
  await until("the digging game", () => gameUp(X), 4000);
  await dig(X);
  await until("it is dug out", async () => (await got(X, was)).length > 0, 6000).catch(() => null);
  came = await got(X, was);
  ok("the piglet's way chosen with the hoe held: one more, and its hole counted", came.length === 1 && came[0][1] === m.n + 1 && (await X.evaluate(`${K}.purse().gifts.used.famPiglet.n`)) === 2, { came, n: m.n });

  // ── past its count ──
  for (let i = 0; i < 8; i++) await X.evaluate(`${K}.giftUse("famPiglet")`);
  m = await toMound(X);
  await sleep(600);
  ok("past its ten holes only the hoe's way is offered", JSON.stringify(await offers(X)) === '["dig"]', await offers(X));
  await X.evaluate(`${T}.letGo()`);
  await sleep(900);
  ok("…and with no hoe in the hand, nothing", (await offers(X)).length === 0, await offers(X));
  ok("no page errors", X.logs.length === 0, X.logs);
} catch (e) { ok("the run", false, e.message); console.log(X.logs.join("\n")); } finally { await X.close(); }

// at a phone's width: both buttons are whole on the screen, and the board with the piglet on it
const P = await browser("PigletPhone", { width: 360, height: 740, mobile: true, dpr: 2 });
try {
  await enter(P);
  await P.evaluate(`${T}.setSalt?.("check")`);
  await P.evaluate(`(${T}.empty(), ${T}.setGifts(["famPiglet"]), ${T}.grant("hoe", 1), ${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "hoe")))`);
  await P.evaluate(`${K}.familiarWear("famPiglet")`);
  await P.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's things", async () => (await sights(P)).length > 40, 30000);
  const m = (await sights(P)).find((s) => s.kind === "mound");
  await P.evaluate(`${V}.warp(${m.x}, ${m.y})`);
  await until("both ways are offered", async () => (await offers(P)).length === 2, 8000).catch(() => null);
  const boxes = await P.evaluate(`[...document.querySelectorAll("[data-forest-offer]")].map((b) => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height }; })`);
  ok("at a phone's width both ways are whole on the screen, each tall enough for a thumb", boxes.length === 2 && boxes.every((b) => b.l >= 0 && b.r <= 360 && b.h >= 44), boxes);
  await sleep(400);
  await P.shot(`${OUT}/piglet-phone-offer.png`);
  await P.evaluate(`${F}.actPiglet()`);
  await until("the digging game", () => gameUp(P), 4000);
  await sleep(500);
  const board = await P.evaluate(`(() => { const r = document.querySelector("[data-town-game]").getBoundingClientRect(); return { l: r.left, r: r.right }; })()`);
  ok("…and the piglet's board fits", board.l >= 0 && board.r <= 360, board);
  await P.shot(`${OUT}/piglet-phone-game.png`);
  ok("no page errors at a phone's width", P.logs.length === 0, P.logs);
} catch (e) { ok("the phone's run", false, e.message); } finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
