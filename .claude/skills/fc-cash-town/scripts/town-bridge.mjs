// Cash Town's bridge built by hand (lib/town/bridge, components/town/TownBridge), tried in a real browser on the dev
// test room (the trial kept in the browser, `next dev` only), by three testers in three windows of one browser, who
// share its works; then on a phone's screen:
//
// - closed, as it is built: nothing is offered at the pile, nothing can be tapped, and lifting is refused;
// - opened (the trial's own switch, as the owner's one line opens the database's): the strip says how it is done,
//   the step to do now lit; a thing in the hand is said to be in the way; a stone is lifted for one stamina, and
//   every page is told that its holder carries one;
// - its holder walks at half the pace, on their own page and on another's;
// - nobody near: nothing offered; somebody still with empty hands within six tiles is offered by name and has the
//   stone at once, for nothing, and is told; whoever has a thing in the hand, or walks, is named with what they lack;
//   whoever is nearer the foot is offered first;
// - laid at the foot for one stamina: the bar is one more, all three are counted one stone and a helpers' point;
// - the sign's panel: the bar, the three steps, the names in the order they came with no numbers, my count for me;
// - the hundredth stone is a span, the six-hundredth makes it whole, and nothing more is lifted;
// - with no stamina: lifted and laid all the same, a quarter of the pace, and handed on;
// - let go of with two presses; and a phone's card and panel within its screen.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-bridge.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", B = "window.__townBridge", V = "window.__townView", S = "window.__cashTown";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const stamina = (X) => X.evaluate(`(() => { const p = ${T}.purse(); return p.stamina.day < 0 ? 100 : p.stamina.left; })()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const held = (X) => X.evaluate(`${B}.held()`);
const have = (X) => X.evaluate(`${B}.works()?.works.bridge.needs.stone?.have ?? null`);
const mine = (X) => X.evaluate(`${B}.works()?.works.bridge.mine.stone ?? 0`);
const points = (X) => X.evaluate(`${T}.lines().lines.helpers.points`);
/** What a page has heard of somebody else: what they carry in their hands. */
const carriedBy = (X, id) => X.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify(id)})?.carry ?? null`);
/** A real press of the mouse on what a selector finds, or on a point of the map. */
const press = async (X, x, y) => {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const tap = async (X, sel) => {
  const at = await X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!at) throw new Error(`nothing to tap: ${sel}`);
  await press(X, at.x, at.y);
  await sleep(450);
};
/** A real tap on the map, at a point of the canvas: a box of the bridge's (its pile, its sign), a little above its middle, where nobody who stands before it is in the way. */
const mapTap = async (X, box) => {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`);
  await press(X, at.x + (box.x0 + box.x1) / 2, at.y + box.y0 + (box.y1 - box.y0) * 0.3);
};
const TOUCH = `window.dispatchEvent(new Event("pointermove"))`;
/** Walk to a tile and say how long it took on my own page, in milliseconds (town-cart.mjs says why it is begun so). */
const walk = (X, x, y) => X.evaluate(`(async () => {
  const v = ${V}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  ${TOUCH};
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  ${TOUCH};
  await wait(80);
  const from = performance.now();
  if (!v.walk(${x} + 0.5, ${y} + 0.5)) return { ms: -1 };
  await wait(60);
  while (v.self().moving) { if (performance.now() - from > 30000) return { ms: -2 }; ${TOUCH}; await wait(10); }
  return { ms: performance.now() - from, at: v.self() };
})()`);
/** On somebody's page: how long another tester is seen walking, from their first step to their last (begun before they are told to walk). */
const watch = (Y, id) => Y.evaluate(`(async () => {
  const v = ${V}, wait = (ms) => new Promise((r) => setTimeout(r, ms)), asked = performance.now();
  while (!v.at(${JSON.stringify(id)})?.moving) { if (performance.now() - asked > 8000) return { ms: -1 }; ${TOUCH}; await wait(10); }
  const from = performance.now();
  while (v.at(${JSON.stringify(id)})?.moving) { if (performance.now() - from > 30000) return { ms: -2 }; ${TOUCH}; await wait(10); }
  return { ms: performance.now() - from };
})()`);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=bridge&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
  await until("the bridge's own code has come", () => X.evaluate(`!!${B}`), 60000);
}
/** A tester with empty hands and a full gauge. */
const fresh = (X) => X.evaluate(`(${T}.resize(10), ${T}.letGo(), 0)`);

const X = await browser("Bridge", { width: 1280, height: 860 });
try {
  await enter(X, "p");
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.worksAnew())`);
  await sleep(500);
  await fresh(X);
  const a = await X.evaluate(`${T}.id`);
  const { pile: PILE, foot: FOOT, reach: REACH, need: NEED } = await X.evaluate(`({ pile: ${B}.pile, foot: ${B}.foot, reach: ${B}.reach, need: ${B}.need })`);
  // by the pile, by the foot, and a straight stretch of open road west of the pile
  const BY_PILE = [PILE.x - 1, PILE.y + 1], BY_FOOT = [FOOT.x + 1, FOOT.y + 1], ROAD = [PILE.x - 6, PILE.y + 2], ROAD_END = [PILE.x - 2, PILE.y + 2];

  // ── closed, as it is built
  await warp(X, ...BY_PILE);
  await until("the works' pictures have come", () => X.evaluate(`${B}.drawn()`), 20000);
  await sleep(600);
  const closed = await X.evaluate(`${B}.works()`);
  ok("built closed: a page is told only that the bridge is not open", closed?.works.bridge.open === false && same(closed.works.bridge.needs, {}) && closed.carried === null, closed);
  ok("…nothing is offered at the pile, and there is nothing of it to tap (it stands under its cloth)", (await X.evaluate(`${B}.atPile()`)) === true && !(await there(X, "[data-bridge-card]")) && !(await there(X, "[data-bridge-lift]")) && (await X.evaluate(`${B}.boxes().pile`)) === null && (await X.evaluate(`${B}.boxes().sign`)) === null);
  await X.shot(`${OUT}/bridge-closed.png`);
  await X.evaluate(`${B}.lift()`);
  await sleep(500);
  ok("…and a stone asked for all the same is refused: closed, nothing lifted, no stamina gone", (await held(X)) === null && (await stamina(X)) === 100 && !(await X.evaluate(`${S}.me().carry`)), { held: await held(X), stamina: await stamina(X) });

  // ── opened
  await X.evaluate(`${T}.worksOpen()`);
  await until("the pile's card comes up", () => there(X, "[data-bridge-card='pile']"), 8000);
  ok("opened: by the pile a strip says how it is done in three steps, the first lit, over a button to lift a stone", (await X.evaluate(`document.querySelector("[data-bridge-steps]")?.dataset.bridgeSteps`)) === "0" && (await X.evaluate(`document.querySelectorAll("[data-bridge-steps] li").length`)) === 3
    && (await X.evaluate(`document.querySelector("[data-bridge-steps] [data-now='true']")?.innerText ?? ""`)).includes("ยกหิน") && /ยกหิน/.test((await textOf(X, "[data-bridge-lift]")) ?? ""), await textOf(X, "[data-bridge-card]"));
  ok("…and the pile, uncovered, can be tapped", !!(await X.evaluate(`${B}.boxes().pile`)));
  await X.shot(`${OUT}/bridge-pile.png`);
  await X.evaluate(`(${T}.grant("rod", 1), ${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === "rod")))`);
  await until("a thing in the hand is said to be in the way", () => there(X, "[data-bridge-lacks='mine']"), 6000).catch(() => {});
  ok("with a thing in the hand there is no button: it says to put it away first", (await there(X, "[data-bridge-lacks='mine']")) && !(await there(X, "[data-bridge-lift]")) && /เก็บของที่ถืออยู่ก่อน/.test((await textOf(X, "[data-bridge-lacks='mine']")) ?? ""), await textOf(X, "[data-bridge-card]"));
  await X.evaluate(`${T}.letGo()`);
  await until("the button is back", () => there(X, "[data-bridge-lift]"), 6000);

  // the second tester, far off; and the stretch walked with empty hands, for the pace
  const Y = await X.window("BridgeB");
  await enter(Y, "q");
  await fresh(Y);
  const b = await Y.evaluate(`${T}.id`);
  await warp(Y, PILE.x - 6, PILE.y + 14);
  await warp(X, ...ROAD);
  await until("the second tester's page has the first at the road's end", async () => { const who = await Y.evaluate(`${V}.at(${JSON.stringify(a)})`); return !!who && Math.abs(who.x - (ROAD[0] + 0.5)) < 0.01 && !who.moving; }, 15000);
  await Y.evaluate(`${V}.lookAt(${ROAD[0] + 2}, ${ROAD[1]})`);
  const quickest = (...walks) => (walks.every((w) => w.ms > 0) ? Math.min(...walks.map((w) => w.ms)) : -1);
  const plains = [await walk(X, ...ROAD_END), await walk(X, ...ROAD), await walk(X, ...ROAD_END), await walk(X, ...ROAD)], plain = quickest(...plains);
  ok("a stretch of four tiles is walked there and back with empty hands", plain > 500, plains);

  // ── a stone lifted
  await warp(X, ...BY_PILE);
  await until("the button to lift", () => there(X, "[data-bridge-lift]"), 6000);
  await tap(X, "[data-bridge-lift]");
  await until("a stone is in the hands", async () => (await held(X)) === "stone", 6000);
  ok("a press lifts a stone at once: it is in the hands, for one stamina, and nothing is in the bag for it", (await stamina(X)) === 99 && (await X.evaluate(`${T}.purse().bag.every((s) => !s || s.item === "rod")`)), { stamina: await stamina(X) });
  ok("…the strip's second step is lit, and nothing more is lifted while one is held", (await X.evaluate(`document.querySelector("[data-bridge-steps]")?.dataset.bridgeSteps`)) === "1" && (await there(X, "[data-bridge-card='held']")) && !(await there(X, "[data-bridge-lift]")), await textOf(X, "[data-bridge-card]"));
  await until("the other page is told who carries a stone", async () => (await carriedBy(Y, a)) === "stone", 10000).catch(() => {});
  ok("…and everybody's page is told its holder carries a stone", (await carriedBy(Y, a)) === "stone" && (await X.evaluate(`${S}.me().carry`)) === "stone", await carriedBy(Y, a));
  await sleep(500);
  await X.shot(`${OUT}/bridge-held.png`);

  // ── half the pace, on my page and on another's
  await warp(X, ...ROAD);
  await until("the second tester's page has the first at the road's end again", async () => { const who = await Y.evaluate(`${V}.at(${JSON.stringify(a)})`); return !!who && Math.abs(who.x - (ROAD[0] + 0.5)) < 0.01 && !who.moving; }, 15000);
  const seen = async (tile) => { const seeing = watch(Y, a); await sleep(150); const own = await walk(X, ...tile); return { theirs: await seeing, mine: own }; };
  const laden = [await seen(ROAD_END), await seen(ROAD)], slow = quickest(...laden.map((s) => s.mine)), slowSeen = quickest(...laden.map((s) => s.theirs));
  ok("with a stone the same stretch takes twice as long: half the pace", slow / plain > 1.8 && slow / plain < 2.25, { plain, slow, ratio: slow / plain });
  ok("…and on the other tester's page too, which walks them by the same rule", slowSeen / plain > 1.7 && slowSeen / plain < 2.3, { plain, slowSeen, ratio: slowSeen / plain });

  // ── nobody near; then somebody still with empty hands within six tiles
  await sleep(700);
  ok("with nobody within reach nothing is offered, and nobody is named", same(await X.evaluate(`${B}.offered()`), []) && (await X.evaluate(`${B}.lacks()`)) === null && !(await there(X, "[data-bridge-chip]")) && !(await there(X, "[data-bridge-lacks]")), await X.evaluate(`${B}.offered()`));
  await warp(Y, ROAD[0] - REACH - 1, ROAD[1]);
  await sleep(1200);
  ok("somebody a tile further than six is not offered", same(await X.evaluate(`${B}.offered()`), []), await X.evaluate(`${B}.offered()`));
  await warp(Y, ROAD[0] - REACH + 1, ROAD[1]);
  await until("the one within reach is offered", async () => same(await X.evaluate(`${B}.offered()`), [b]), 12000).catch(() => {});
  const chip = await textOf(X, "[data-bridge-chip]");
  ok("somebody standing still with empty hands within six tiles is offered, by name", same(await X.evaluate(`${B}.offered()`), [b]) && /ส่งหินต่อให้/.test(chip ?? "") && /q/i.test(chip ?? ""), chip);
  await X.shot(`${OUT}/bridge-offer.png`);
  await tap(X, "[data-bridge-chip]");
  await until("the stone has gone over", async () => (await held(Y)) === "stone", 8000);
  ok("a press, and the stone is in their hands at once: mine are empty, and it cost neither of us anything", (await held(X)) === null && (await stamina(X)) === 99 && (await stamina(Y)) === 100 && /ส่งหินให้/.test((await X.evaluate(`${B}.note()`)) ?? ""), { x: await held(X), note: await X.evaluate(`${B}.note()`) });
  await until("the taker is told", () => there(Y, "[data-bridge-toast]"), 8000).catch(() => {});
  ok("whoever takes it is told so on their map, and their strip says what to do next", /มีคนส่งหินมาให้/.test((await textOf(Y, "[data-bridge-toast]")) ?? "") && (await Y.evaluate(`document.querySelector("[data-bridge-steps]")?.dataset.bridgeSteps`)) === "1", await textOf(Y, "[data-bridge-toast]"));
  await until("each page is told who carries it now", async () => (await carriedBy(X, b)) === "stone" && (await carriedBy(Y, a)) === "", 10000).catch(() => {});
  ok("…and each page is told who carries it now", (await carriedBy(X, b)) === "stone" && (await carriedBy(Y, a)) === "", { b: await carriedBy(X, b), a: await carriedBy(Y, a) });
  await Y.shot(`${OUT}/bridge-taken.png`);

  // ── the third tester: a thing in the hand, walking, and then offered first for standing nearer the foot
  const Z = await X.window("BridgeC");
  await enter(Z, "r");
  await fresh(Z);
  const c = await Z.evaluate(`${T}.id`);
  await warp(X, PILE.x - 4, PILE.y + 17);
  await Z.evaluate(`(${T}.grant("rod", 1), ${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === "rod")))`);
  await warp(Z, ROAD[0] - REACH - 1, ROAD[1]);
  await until("the one with a thing in the hand is named", async () => (await Y.evaluate(`${B}.lacks()`))?.why === "hand", 12000).catch(() => {});
  ok("beside somebody with a thing in the hand: nothing to press, and it says by name that their hands have to be empty", same(await Y.evaluate(`${B}.lacks()`), { who: c, why: "hand" }) && !(await there(Y, "[data-bridge-chip]")) && /r.*ต้องมือเปล่าก่อน/i.test((await textOf(Y, "[data-bridge-lacks='hand']")) ?? ""), { lacks: await Y.evaluate(`${B}.lacks()`), text: await textOf(Y, "[data-bridge-lacks]") });
  await Y.shot(`${OUT}/bridge-lacks.png`);
  await Z.evaluate(`${T}.letGo()`);
  await until("with empty hands they are offered", async () => same(await Y.evaluate(`${B}.offered()`), [c]), 12000).catch(() => {});
  ok("with empty hands they are offered", same(await Y.evaluate(`${B}.offered()`), [c]) && (await Y.evaluate(`${B}.lacks()`)) === null, await Y.evaluate(`${B}.offered()`));
  let walking = null;
  await Z.evaluate(`${V}.walk(${ROAD[0] - REACH - 4} + 0.5, ${ROAD[1]} + 0.5)`);
  for (let i = 0; i < 60 && !walking; i++) { const l = await Y.evaluate(`${B}.lacks()`); if (l?.why === "walking") walking = { ...l, chip: await there(Y, "[data-bridge-chip]"), text: await textOf(Y, "[data-bridge-lacks='walking']") }; else await sleep(60); }
  ok("while they walk they are not offered, and it says they have to stand still", walking?.who === c && walking.chip === false && /ต้องยืนนิ่งก่อน/.test(walking.text ?? ""), walking);
  // both others within reach of the one who holds it: the third the nearer the foot, the first on the other side
  await warp(Z, ROAD[0] - REACH - 1, ROAD[1]);
  await warp(X, ROAD[0] - REACH + 3, ROAD[1]);
  await until("both are offered, whoever is nearer the foot first", async () => same(await Y.evaluate(`${B}.offered()`), [c, a]), 12000).catch(() => {});
  const two = await Y.evaluate(`[...document.querySelectorAll("[data-bridge-chip]")].map((e) => e.innerText.trim())`);
  ok("of two within reach whoever is nearer the bridge's foot is offered first: a chip each, the first named in full", same(await Y.evaluate(`${B}.offered()`), [c, a]) && two.length === 2 && /ส่งหินต่อให้/.test(two[0]) && /^หรือ/.test(two[1]), { offered: await Y.evaluate(`${B}.offered()`), two });
  await tap(Y, `[data-bridge-chip="${c}"]`);
  await until("the third has the stone", async () => (await held(Z)) === "stone", 8000);

  // ── laid at the foot
  await warp(Z, ...BY_FOOT);
  await until("the button to lay it", () => there(Z, "[data-bridge-lay]"), 8000);
  ok("at the foot the strip's last step is lit, over a button to lay the stone", (await Z.evaluate(`document.querySelector("[data-bridge-steps]")?.dataset.bridgeSteps`)) === "2" && /วางหิน/.test((await textOf(Z, "[data-bridge-lay]")) ?? ""), await textOf(Z, "[data-bridge-card]"));
  await Z.shot(`${OUT}/bridge-foot.png`);
  await tap(Z, "[data-bridge-lay]");
  await until("the stone is laid", async () => (await have(Z)) === 1, 8000);
  ok("a press lays it for one stamina: the bridge has one more, and the hands are empty", (await held(Z)) === null && (await stamina(Z)) === 99 && (await have(Z)) === 1, { stamina: await stamina(Z), have: await have(Z) });
  await until("every page has it", async () => (await have(X)) === 1 && (await have(Y)) === 1, 8000).catch(() => {});
  ok("all three whose hands it went through are counted one stone, each told their own", same([await mine(X), await mine(Y), await mine(Z)], [1, 1, 1]) && (await have(X)) === 1 && (await have(Y)) === 1, [await mine(X), await mine(Y), await mine(Z)]);
  ok("…and each has a point on the helpers' line", same([await points(X), await points(Y), await points(Z)], [1, 1, 1]), [await points(X), await points(Y), await points(Z)]);

  // ── the sign's panel
  const sign = await Z.evaluate(`${B}.boxes().sign`);
  ok("the sign stands at the foot, to be tapped", !!sign, sign);
  if (sign) await mapTap(Z, sign);
  await until("the sign's panel opens", () => there(Z, "[data-bridge-panel]"), 8000).catch(() => {});
  const panel = await Z.evaluate(`(() => { const p = document.querySelector("[data-bridge-panel]"); if (!p) return null;
    return { have: p.querySelector("[data-bridge-have]")?.innerText, spans: p.querySelectorAll("[data-span]").length, steps: p.querySelectorAll("[data-bridge-steps] li").length,
      names: [...p.querySelectorAll("[data-bridge-names] li")].map((e) => [e.dataset.id, e.innerText.trim()]), mine: p.querySelector("[data-bridge-mine]")?.dataset.bridgeMine, text: p.innerText }; })()`);
  ok("a tap on it opens its panel: the village's bar, so many of six hundred, in six spans, and the three steps", !!panel && panel.have.replace(/\s/g, "") === `1/${NEED}` && panel.spans === 6 && panel.steps === 3 && /ช่วงที่ 1 จาก 6/.test(panel.text), panel);
  ok("…everybody who has helped, in the order they came (the first to lift, then who it was handed to), by name and with no number", !!panel && same(panel.names.map(([id]) => id), [a, b, c]) && panel.names.every(([, name]) => name.length > 0 && !/\d/.test(name.replace(/ทดสอบ|test/gi, ""))), panel?.names);
  ok("…and my own count, shown to me", panel?.mine === "1" && /ผ่านมือฉัน/.test(panel.text), panel?.mine);
  await Z.shot(`${OUT}/bridge-panel.png`);
  await Z.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(400);
  ok("Escape shuts it", !(await there(Z, "[data-bridge-panel]")));

  // ── the hundredth stone is a span
  await X.evaluate(`${T}.worksHave(99)`);
  await warp(X, ...BY_PILE);
  await until("the button to lift", () => there(X, "[data-bridge-lift]"), 8000);
  await tap(X, "[data-bridge-lift]");
  await until("a stone is in the hands", async () => (await held(X)) === "stone", 6000);
  await warp(X, ...BY_FOOT);
  await until("the button to lay it", () => there(X, "[data-bridge-lay]"), 8000);
  ok("with ninety-nine laid, no span shows yet", (await X.evaluate(`${B}.spans()`)) === 0 && (await Y.evaluate(`${B}.spans()`)) === 0);
  await tap(X, "[data-bridge-lay]");
  await until("the span is laid", async () => (await X.evaluate(`${B}.spans()`)) === 1, 8000).catch(() => {});
  ok("the hundredth stone is a span: said aloud to whoever laid it, and every page's bridge has one span", (await X.evaluate(`${B}.spans()`)) === 1 && /ต่อสะพานได้อีกช่วง/.test((await textOf(X, "[data-bridge-toast]")) ?? "") && (await Y.evaluate(`${B}.spans()`)) === 1 && (await Z.evaluate(`${B}.spans()`)) === 1 && !(await X.evaluate(`${B}.whole()`)),
    { toast: await textOf(X, "[data-bridge-toast]"), y: await Y.evaluate(`${B}.spans()`) });
  await X.shot(`${OUT}/bridge-span.png`);

  // ── the six-hundredth makes it whole
  await X.evaluate(`${T}.worksHave(${NEED - 1})`);
  await warp(X, ...BY_PILE);
  await warp(Y, PILE.x, PILE.y + 2);
  await until("both are offered a stone", async () => (await there(X, "[data-bridge-lift]")) && (await there(Y, "[data-bridge-lift]")), 8000);
  await tap(X, "[data-bridge-lift]");
  await tap(Y, "[data-bridge-lift]");
  await until("both hold one", async () => (await held(X)) === "stone" && (await held(Y)) === "stone", 6000);
  await warp(X, ...BY_FOOT);
  await warp(Y, BY_FOOT[0], BY_FOOT[1] - 2);
  await until("the button to lay it", () => there(X, "[data-bridge-lay]"), 8000);
  await tap(X, "[data-bridge-lay]");
  await until("the bridge is whole", () => X.evaluate(`${B}.whole()`), 8000).catch(() => {});
  ok("the six-hundredth stone makes the bridge whole: six spans on every page, and it is said aloud", (await X.evaluate(`${B}.whole()`)) && (await X.evaluate(`${B}.spans()`)) === 6 && (await Y.evaluate(`${B}.whole()`)) && (await Z.evaluate(`${B}.spans()`)) === 6 && /สะพานเสร็จสมบูรณ์/.test((await textOf(X, "[data-bridge-toast]")) ?? ""), await textOf(X, "[data-bridge-toast]"));
  await until("no button to lay a stone that came too late", async () => !(await there(Y, "[data-bridge-lay]")) && (await there(Y, "[data-bridge-drop]")), 6000).catch(() => {});
  ok("a stone that came too late is not laid: there is only letting it go", (await held(Y)) === "stone" && !(await there(Y, "[data-bridge-lay]")) && (await there(Y, "[data-bridge-drop]")) && (await have(Y)) === NEED);
  await tap(Y, "[data-bridge-drop]");
  ok("letting go asks once more: after one press the stone is still held", (await held(Y)) === "stone" && (await Y.evaluate(`document.querySelector("[data-bridge-drop]")?.dataset.bridgeDrop`)) === "sure", await textOf(Y, "[data-bridge-drop]"));
  await tap(Y, "[data-bridge-drop]");
  await until("the stone is let go", async () => (await held(Y)) === null, 6000).catch(() => {});
  ok("…and after the second it is gone, with nothing back", (await held(Y)) === null && (await stamina(Y)) === 99 && (await have(Y)) === NEED, { held: await held(Y), stamina: await stamina(Y) });
  await warp(X, ...BY_PILE);
  await sleep(900);
  await X.evaluate(`${B}.lift()`);
  await sleep(500);
  ok("whole, nothing more is lifted: no button at the pile, and a stone asked for all the same is refused", !(await there(X, "[data-bridge-lift]")) && (await held(X)) === null && /สะพานเสร็จแล้ว/.test((await X.evaluate(`${B}.note()`)) ?? ""), await X.evaluate(`${B}.note()`));
  await warp(X, ...BY_FOOT);
  await X.evaluate(`${B}.panel()`);
  await until("the panel", () => there(X, "[data-bridge-panel]"), 6000);
  const done = await X.evaluate(`({ names: document.querySelectorAll("[data-bridge-names] li").length, text: document.querySelector("[data-bridge-panel]").innerText, full: document.querySelectorAll("[data-span][data-full='true']").length })`);
  ok("…and the names stay on the sign, under a bar that is full", done.names === 3 && done.full === 6 && /สะพานเสร็จสมบูรณ์แล้ว/.test(done.text), done);
  await X.shot(`${OUT}/bridge-whole.png`);
  await X.evaluate(`${B}.panel(false)`);

  // ── no stamina: never refused, a quarter of the pace
  await X.evaluate(`(${T}.worksHave(10), ${T}.spend(500))`);
  await Z.evaluate(`${T}.spend(500)`);
  await until("the room is told who is tired", async () => (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify(a)})?.spent`)) === true, 10000).catch(() => {});
  await warp(X, ...BY_PILE);
  await until("the button to lift", () => there(X, "[data-bridge-lift]"), 8000);
  await tap(X, "[data-bridge-lift]");
  await until("tired hands lift a stone", async () => (await held(X)) === "stone", 6000).catch(() => {});
  ok("with no stamina a stone is lifted all the same, at none", (await held(X)) === "stone" && (await stamina(X)) === 0, { held: await held(X), stamina: await stamina(X) });
  await warp(Y, PILE.x - 6, PILE.y + 14);
  await warp(Z, PILE.x - 6, PILE.y + 16);
  await warp(X, ...ROAD);
  await until("the second tester's page has the first at the road's end", async () => { const who = await Y.evaluate(`${V}.at(${JSON.stringify(a)})`); return !!who && Math.abs(who.x - (ROAD[0] + 0.5)) < 0.01 && !who.moving; }, 15000);
  await Y.evaluate(`${V}.lookAt(${ROAD[0] + 2}, ${ROAD[1]})`);
  const weary = [await seen(ROAD_END), await seen(ROAD)], crawl = quickest(...weary.map((s) => s.mine)), crawlSeen = quickest(...weary.map((s) => s.theirs));
  ok("…and walked at a quarter of the pace, on my page and on another's", crawl / plain > 3.6 && crawl / plain < 4.5 && crawlSeen / plain > 3.4 && crawlSeen / plain < 4.6, { plain, crawl, crawlSeen });
  await warp(Z, ROAD[0] - 3, ROAD[1]);
  await until("the tired one is offered the other tired one", async () => same(await X.evaluate(`${B}.offered()`), [c]), 12000).catch(() => {});
  await tap(X, "[data-bridge-chip]");
  await until("tired hands hand it on", async () => (await held(Z)) === "stone", 8000).catch(() => {});
  ok("tired hands hand it on to tired hands", (await held(Z)) === "stone" && (await held(X)) === null && (await stamina(X)) === 0 && (await stamina(Z)) === 0, { z: await held(Z), x: await held(X) });
  await warp(Z, ...BY_FOOT);
  await until("the button to lay it", () => there(Z, "[data-bridge-lay]"), 8000);
  await tap(Z, "[data-bridge-lay]");
  await until("tired hands lay it", async () => (await have(Z)) === 11, 8000).catch(() => {});
  ok("…and lay it, at none", (await have(Z)) === 11 && (await stamina(Z)) === 0 && (await held(Z)) === null, { have: await have(Z) });

  // ── a tap on the pile from far off walks up to it and lifts one
  await Y.evaluate(`${T}.letGo()`);
  await warp(Y, PILE.x - 5, PILE.y + 3);
  await sleep(600);
  const box = await Y.evaluate(`${B}.boxes().pile`);
  if (box) await mapTap(Y, box);
  await until("walked up to the pile, a stone is lifted", async () => (await held(Y)) === "stone", 20000).catch(() => {});
  ok("a tap on the pile from a few tiles off walks up to it and lifts a stone there", !!box && (await held(Y)) === "stone" && (await Y.evaluate(`${B}.atPile()`)) === true, { box, held: await held(Y) });

  // ── a phone's screen
  const P = await X.tab("BridgePhone", { width: 390, height: 780, dpr: 2, mobile: true });
  await enter(P, "s");
  await fresh(P);
  await warp(P, ...BY_PILE);
  await until("the button to lift", () => there(P, "[data-bridge-lift]"), 10000);
  await tap(P, "[data-bridge-lift]");
  await until("a stone is in the hands", async () => (await held(P)) === "stone", 6000);
  const within = (sel) => P.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), w: innerWidth, h: innerHeight, scroll: document.documentElement.scrollWidth }; })()`);
  const card = await within("[data-bridge-card]");
  ok("on a phone the strip and its buttons are within the screen, with nothing wider than it", !!card && card.left >= 0 && card.right <= card.w && card.bottom <= card.h && card.top >= 0 && card.scroll <= card.w, card);
  await P.shot(`${OUT}/bridge-phone-card.png`);
  await warp(P, ...BY_FOOT);
  await sleep(700);
  const psign = await P.evaluate(`${B}.boxes().sign`);
  if (psign) await mapTap(P, psign);
  await until("the phone's panel opens", () => there(P, "[data-bridge-panel]"), 8000).catch(() => {});
  const sheet = await within("[data-bridge-panel]"), shut = await within("[data-bridge-close]");
  ok("…and so is the sign's panel, its button to shut it too", !!sheet && !!shut && sheet.left >= 0 && sheet.right <= sheet.w && sheet.top >= 0 && sheet.bottom <= sheet.h && shut.right <= shut.w && shut.top >= 0 && sheet.scroll <= sheet.w, { sheet, shut });
  await P.shot(`${OUT}/bridge-phone-panel.png`);
  const errors = [...X.errors(), ...Y.errors(), ...Z.errors(), ...P.errors()];
  ok("no page threw anything", errors.length === 0, errors.slice(0, 4));
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/bridge-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
