// A sprite's treasure map (the forest's fifth rank; the owner's ladder of 2026-10-07): used, it begins a hunt for a
// chest buried somewhere in the forest; the map is a ring drawn on the forest, and the chest is found by digging, hot
// and cold; it holds a rare thing of the day or a scroll, never coins; three maps a day. Tried in the trial: without
// the thing there is no map; with it, its button, the rolled map and the unrolling; the ring and where I stand; a dig
// far off is cold and one nearer is warmer, each marked on the ground and on the map; the chest is found by the
// warmths alone, comes up, and what it holds is in the bag; then the next map is another hunt.
//
//   node .claude/skills/fc-cash-town/scripts/town-map.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes map-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townForest";
const BANDS = [0, 1, 3, 6, 10], OFF = 5;
const warmth = (site, at) => { const d = Math.max(Math.abs(at[0] - site[0]), Math.abs(at[1] - site[1])), i = BANDS.findIndex((b) => d <= b); return i < 0 ? BANDS.length : i; };
const enter = async (X) => {
  await X.goto(`${BASE}/town?townTest=M&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const chip = (X) => X.evaluate(`(() => { const c = document.querySelector("[data-forest-mapchip]"); return c ? { hunt: c.dataset.hunt, left: c.dataset.left } : null; })()`);
const offers = (X) => X.evaluate(`[...document.querySelectorAll("[data-forest-offer]")].map((b) => b.dataset.forestOffer)`);
const bagOf = (X) => X.evaluate(`JSON.stringify(${T}.purse().bag.filter(Boolean).map((s) => [s.item, s.n]))`);
/** Stand on a tile and dig for the chest there: what the dig said. */
async function digAt(X, [x, y]) {
  await X.evaluate(`${V}.warp(${x}, ${y})`);
  // (stood there, as the page has it: a dig is from the tile the page knows I stand on)
  await until("the dig is offered there", async () => (await X.evaluate(`JSON.stringify(${F}.tile())`)) === JSON.stringify([x, y]) && (await X.evaluate(`${F}.digHere()`)) && (await offers(X)).includes("chest"), 6000, 100);
  const before = await X.evaluate(`({ n: ${F}.probes().length, hunt: ${F}.hunt()?.n ?? 0 })`);
  await X.evaluate(`document.querySelector('[data-forest-offer="chest"]').click()`);
  return until("the dig is answered", () => X.evaluate(`(() => { const p = ${F}.probes(), h = ${F}.hunt(); return (h?.n ?? 0) !== ${before.hunt} ? { found: true } : p.length > ${before.n} ? { found: false, warm: p[p.length - 1].warm } : null; })()`), 5000, 100);
}
/** Find the chest of the hunt that is on by the warmths alone: every tile it could be on is kept, and a dig at one of them keeps those that would have sounded so. */
async function seek(X, area, shots = null) {
  let could = [];
  for (let dx = -OFF; dx <= OFF; dx++) for (let dy = -OFF; dy <= OFF; dy++) could.push([area.x + dx, area.y + dy]);
  const walk = new Set(await X.evaluate(`${JSON.stringify(could)}.filter(([x, y]) => ${V}.walkable(x, y)).map((p) => p.join())`));
  could = could.filter((p) => walk.has(p.join()));
  const heard = [];
  for (let i = 0; i < 40 && could.length; i++) {
    const at = could[Math.floor(could.length / 2)], said = await digAt(X, at);
    if (said.found) return { digs: i + 1, heard, at };
    heard.push(said.warm);
    could = could.filter((p) => p.join() !== at.join() && warmth(p, at) === said.warm);
    if (shots && i === 1) { await sleep(500); await X.shot(shots); }
  }
  return null;
}

const X = await browser("Map", { width: 1280, height: 860 });
try {
  await enter(X);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
  await sleep(300);
  await enter(X);
  await X.evaluate(`(${T}.setSalt("map-check"), ${T}.setStamina(100))`);
  await X.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's own code has come", () => X.evaluate(`!!${F}`), 30000);
  await sleep(800);
  ok("without the thing there is no map's button, and no hunt", (await chip(X)) === null && (await X.evaluate(`${F}.hunt()`)) === null);

  // ── the map had: its button, and the unrolling ──
  await X.evaluate(`${T}.setGifts(["thingMap"])`);
  await until("the map's button", async () => (await chip(X)) !== null, 6000);
  ok("with it, its button is in the forest, with three maps left today", JSON.stringify(await chip(X)) === '{"hunt":"","left":"3"}', await chip(X));
  await X.evaluate(`document.querySelector("[data-forest-mapchip]").click()`);
  await until("the rolled map", () => X.evaluate(`!!document.querySelector("[data-forest-map-rolled]")`), 4000);
  ok("a tap shows the map rolled up still: no map is used by a slip of the finger", (await X.evaluate(`${K}.purse().gifts.used?.thingMap?.n ?? 0`)) === 0 && (await X.evaluate(`${F}.hunt()`)) === null);
  await sleep(400);
  await X.shot(`${OUT}/map-0-rolled.png`);
  await X.evaluate(`document.querySelector("[data-forest-unroll]").click()`);
  await until("the map", () => X.evaluate(`!!document.querySelector("[data-forest-map]")`), 5000);
  const hunt = await X.evaluate(`${F}.hunt()`);
  ok("unrolled: a hunt is on, the first of the day's three, and the map has its ring and where I stand", hunt?.n === 1 && hunt.digs === 0 && hunt.area.r === 8
    && (await X.evaluate(`!!document.querySelector("[data-map-ring]") && !!document.querySelector("[data-map-me]")`)) && (await X.evaluate(`document.querySelector("[data-map-left]").dataset.mapLeft`)) === "2", hunt);
  ok("…what the page is told of the hunt has no tile in it", JSON.stringify(Object.keys(await X.evaluate(`${K}.purse().forest.hunt`)).sort()) === '["digs","k","n"]' && JSON.stringify(Object.keys(hunt).sort()) === '["area","digs","n"]');
  await sleep(500);
  await X.shot(`${OUT}/map-1-unrolled.png`);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await sleep(300);
  ok("Escape rolls it up, and its button shows a hunt is on", !(await X.evaluate(`!!document.querySelector("[data-forest-map]")`)) && (await chip(X))?.hunt === "1", await chip(X));

  // ── hot and cold ──
  await X.evaluate(`${V}.warp(${144 + 48}, ${112 + 70})`);
  await sleep(900);
  const farOff = Math.max(Math.abs(144 + 48 - hunt.area.x), Math.abs(112 + 70 - hunt.area.y)) > hunt.area.r + 2;
  ok("far from the ring no dig is offered", !farOff || !(await offers(X)).includes("chest"), await offers(X));
  const bag0 = await bagOf(X), st0 = await X.evaluate(`${T}.purse().stamina.left`);
  const found = await seek(X, hunt.area, `${OUT}/map-2-digging.png`);
  ok("the chest is found by the warmths alone, in a few digs", !!found && found.digs <= 12, found);
  ok("…each dig that missed said how warm it was (never that it was the chest)", !!found && found.heard.every((w) => w >= 1 && w <= 5), found?.heard);
  await sleep(350);
  await X.shot(`${OUT}/map-3-chest.png`);
  const now = JSON.parse(await bagOf(X)), was = new Map(JSON.parse(bag0)), came = now.filter(([id, n]) => n > (was.get(id) ?? 0));
  ok("the chest is up: one thing more is in the bag, a rare thing of the forest or a scroll", came.length === 1 && (/^scroll/.test(came[0][0]) || ["truffle", "wildOrchid", "starShard"].includes(came[0][0])), came);
  ok("…for no stamina and no coin", (await X.evaluate(`${T}.purse().stamina.left`)) === st0 && (await X.evaluate(`${T}.purse().coins`)) === 0);
  ok("…the hunt is over, a chest is in my count, and the page says what came with the chest's picture", (await X.evaluate(`${F}.hunt()`)) === null && (await X.evaluate(`${K}.purse().forest.chests`)) === 1
    && (await X.evaluate(`!!document.querySelector('[data-forest-note="spriteChest"]')`)), await X.evaluate(`document.querySelector("[data-forest-note]")?.innerText`));
  ok("…and the map's button has two left", JSON.stringify(await chip(X)) === '{"hunt":"","left":"2"}', await chip(X));

  // ── the next map: another hunt; its digs are on the map ──
  await X.evaluate(`document.querySelector("[data-forest-mapchip]").click()`);
  await until("the rolled map", () => X.evaluate(`!!document.querySelector("[data-forest-unroll]")`), 4000);
  await X.evaluate(`document.querySelector("[data-forest-unroll]").click()`);
  await until("the second hunt", async () => (await X.evaluate(`${F}.hunt()?.n`)) === 2, 5000);
  const second = await X.evaluate(`${F}.hunt()`);
  ok("the second map of the day is another hunt", second.n === 2 && second.digs === 0 && (await X.evaluate(`${F}.probes().length`)) === 0, second);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  const refused = await X.evaluate(`${K}.mapUse()`);
  ok("with a hunt on, a map is not used up", refused.ok === false && refused.why === "had" && (await X.evaluate(`${K}.purse().gifts.used.thingMap.n`)) === 2, refused);
  // two digs that miss, then the map shows them
  const spots = [];
  for (let dx = -OFF; dx <= OFF && spots.length < 2; dx += 5) for (const dy of [-4, 4]) if (spots.length < 2 && (await X.evaluate(`${V}.walkable(${second.area.x + dx}, ${second.area.y + dy})`))) spots.push([second.area.x + dx, second.area.y + dy]);
  let misses = 0;
  for (const at of spots) { const said = await digAt(X, at); if (!said.found) misses++; }
  if ((await X.evaluate(`${F}.hunt()?.n`)) === 2) {
    await X.evaluate(`document.querySelector("[data-forest-mapchip]").click()`);
    await until("the map", () => X.evaluate(`!!document.querySelector("[data-forest-map]")`), 5000);
    await sleep(400);
    ok("the digs that missed are marked on the map, each in the colour of its warmth, and counted", (await X.evaluate(`document.querySelectorAll("[data-map-probe]").length`)) === misses && (await X.evaluate(`document.querySelector("[data-forest-map]").dataset.mapDigs`)) === String(misses), misses);
    await X.shot(`${OUT}/map-4-probes.png`);
    await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  } else ok("the digs that missed are marked on the map (one of the two found the chest: not looked at)", true);
  ok("no page errors", X.logs.length === 0, X.logs);
} catch (e) { ok("the run", false, e.message); console.log(X.logs.join("\n")); } finally { await X.close(); }

// at a phone's width
const P = await browser("MapPhone", { width: 360, height: 740, mobile: true, dpr: 2 });
try {
  await enter(P);
  await P.evaluate(`(${T}.reset(), ${T}.setGifts(false))`);
  await sleep(300);
  await enter(P);
  await P.evaluate(`(${T}.setSalt("map-phone"), ${T}.setGifts(["thingMap"]))`);
  await P.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the map's button", async () => (await chip(P)) !== null, 30000);
  await P.evaluate(`document.querySelector("[data-forest-mapchip]").click()`);
  await until("the rolled map", () => P.evaluate(`!!document.querySelector("[data-forest-unroll]")`), 4000);
  const rolled = await P.evaluate(`(() => { const r = document.querySelector("[data-forest-map-rolled] section").getBoundingClientRect(), b = document.querySelector("[data-forest-unroll]").getBoundingClientRect(); return { l: r.left, r: r.right, h: b.height }; })()`);
  ok("at a phone's width the rolled map is whole on the screen, its button tall enough for a thumb", rolled.l >= 0 && rolled.r <= 360 && rolled.h >= 44, rolled);
  await P.evaluate(`document.querySelector("[data-forest-unroll]").click()`);
  await until("the map", () => P.evaluate(`!!document.querySelector("[data-forest-map]")`), 5000);
  await sleep(500);
  const map = await P.evaluate(`(() => { const r = document.querySelector("[data-forest-map] section").getBoundingClientRect(); return { l: r.left, r: r.right }; })()`);
  ok("…and so is the map unrolled", map.l >= 0 && map.r <= 360, map);
  await P.shot(`${OUT}/map-phone-unrolled.png`);
  await P.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  const area = (await P.evaluate(`${F}.hunt()`)).area;
  const spot = await P.evaluate(`(() => { for (let d = 0; d < 6; d++) for (const [dx, dy] of [[d, 0], [0, d], [-d, 0], [0, -d]]) if (${V}.walkable(${area.x} + dx, ${area.y} + dy)) return [${area.x} + dx, ${area.y} + dy]; return null; })()`);
  await P.evaluate(`${V}.warp(${spot[0]}, ${spot[1]})`);
  await until("the dig is offered", async () => (await offers(P)).includes("chest"), 6000, 150);
  const box = await P.evaluate(`(() => { const r = document.querySelector('[data-forest-offer="chest"]').getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height }; })()`);
  ok("…and the dig's button", box.l >= 0 && box.r <= 360 && box.h >= 44, box);
  await P.evaluate(`document.querySelector('[data-forest-offer="chest"]').click()`);
  await sleep(900);
  await P.shot(`${OUT}/map-phone-dig.png`);
  ok("no page errors at a phone's width", P.logs.length === 0, P.logs);
} catch (e) { ok("the phone's run", false, e.message); } finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
