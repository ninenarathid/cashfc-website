// Cash Town's lamp relay at dusk (lib/town/lamps, components/town/TownLamps), tried in a real browser on the dev test
// room (the trial kept in the browser, `next dev` only), by two testers in two windows of one browser, who share its
// lamps; then on a phone's screen:
//
// - by day (the trial's clock put to noon): the posts stand dark and the brazier cold, nothing is offered at the
//   fire, a flame asked for all the same is refused, and the board says when the lamps are lit;
// - by night (the trial's own switch): at the fire the strip says how it is done in three steps, the first lit; a
//   real tap takes a flame: it is in my hands with the moment it dies, the room is told, a bar burns down, and there
//   is no board; left alone it goes out after five seconds, which is said, and nothing is lost;
// - alone: a flame taken and a tap on the nearest dark post walks there and lights it: one of twelve, one stamina,
//   three helpers' points, and what it earned is said; a tap on a lit post says whose hands lit it, and a tap on a
//   dark one with no flame says where to get one;
// - two: whoever stands still with empty hands within three tiles is offered by name; a tap, and the flame is
//   theirs, fresh, and they are told; they light a post further out, and **whoever only handed it on sees what it
//   earned where they stand**; both are the night's lighters, in the order they came; whoever bears a flame already
//   is named with what they lack;
// - tired hands: the button is held, 1.2 seconds; let go of early nothing is done and nothing is lost; held to the
//   end the post is lit; no board on any page;
// - the board by the fire: so many lit of twelve, the three steps, the night's lighters, the nights counted;
// - what the night becomes at four, at eight and with all twelve lit, on the farm and in the forest, each with a
//   picture to be looked at (`lamps-<map>-<n>.png`: **a PASS does not say it is beautiful**); the last lamp is a
//   celebration with the lighters' names on every page that is on the map, and its fire gives no more flame;
// - and a phone's card, the board's panel and the celebration within its screen.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-lamps.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", L = "window.__townLamps", V = "window.__townView", S = "window.__cashTown", G = "window.__townGame";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, " ").trim() ?? null`);
const stamina = (X) => X.evaluate(`(() => { const p = ${T}.purse(); return p.stamina.day < 0 ? 100 : p.stamina.left; })()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const left = (X) => X.evaluate(`${L}.left()`);
const litOf = (X, map = "farm") => X.evaluate(`(${L}.lamps()?.maps.${map}.lit ?? []).map((l) => l.post)`);
const points = (X) => X.evaluate(`${T}.lines().lines.helpers.points`);
const note = (X) => X.evaluate(`${L}.note()`);
/** Whether a game's board is up on a page: the lamps have none, at any stamina. */
const board = (X) => X.evaluate(`(${G}?.kind ?? null) !== null || !!document.querySelector("[data-game], [data-town-game]")`);
const middle = (X, sel) => X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
/** A real press of the mouse on a point; with `ms`, held down that long before it is let go of. */
const press = async (X, x, y, ms = 0) => {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  if (ms) await sleep(ms);
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const tap = async (X, sel, ms = 0) => {
  const at = await middle(X, sel);
  if (!at) throw new Error(`nothing to tap: ${sel}`);
  await press(X, at.x, at.y, ms);
  await sleep(350);
};
/** A real tap on the map, at a point of the canvas: a box of the lamps' (the brazier, a board, a post), a little above its middle. */
const mapTap = async (X, box, up = 0.35) => {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`);
  await press(X, at.x + (box.x0 + box.x1) / 2, at.y + box.y0 + (box.y1 - box.y0) * up);
};
const postBox = (X, post) => X.evaluate(`(${L}.boxes().posts.find(([i]) => i === ${post}) ?? [])[1] ?? null`);
/** The map seen from further off: the wheel turned over its middle so many times. */
const zoomOut = async (X, n = 3) => {
  const c = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  for (let i = 0; i < n; i++) { await X.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: c.x, y: c.y, deltaX: 0, deltaY: 240 }); await sleep(120); }
};
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=lamps&townHour=21&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
  await until("the lamps' own code has come", () => X.evaluate(`!!${L}`), 60000);
}
/** A tester with empty hands and a full gauge. */
const fresh = (X) => X.evaluate(`(${T}.resize(10), ${T}.letGo(), ${T}.setStamina(100), 0)`);
const within = (P, sel) => P.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect();
  return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), w: innerWidth, h: innerHeight, scroll: document.documentElement.scrollWidth }; })()`);
const inside = (r) => !!r && r.left >= 0 && r.right <= r.w && r.top >= 0 && r.bottom <= r.h && r.scroll <= r.w;
/** Take a flame by a real tap on the button at the fire, and wait until it is in the hands. */
const takeFlame = async (X) => {
  await until("the fire's card comes up", () => there(X, "[data-lamps-take]"), 8000);
  await tap(X, "[data-lamps-take]");
  await until("the flame is in the hands", async () => (await left(X)) > 0, 4000);
};

const X = await browser("Lamps", { width: 1280, height: 860 });
try {
  await enter(X, "p");
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.lampsAnew())`);
  await sleep(500);
  await fresh(X);
  const a = await X.evaluate(`${T}.id`);
  const { fires: FIRES, posts: POSTS, boards: BOARDS, life: LIFE, reach: REACH, near: NEAR } = await X.evaluate(`({ fires: ${L}.fires, posts: ${L}.posts, boards: ${L}.boards, life: ${L}.life, reach: ${L}.reach, near: ${L}.near })`);
  const FIRE = FIRES.farm, BY_FIRE = [FIRE[0] + 1, FIRE[1] + 1], CAMP = [FIRES.forest[0] + 1, FIRES.forest[1] + 1];
  ok("a flame lives five seconds, is handed on within three tiles, and a post is lit from within two; twelve posts a map", LIFE === 5 && REACH === 3 && NEAR === 2 && POSTS.farm.length === 12 && POSTS.forest.length === 12, { LIFE, REACH, NEAR });

  // ── by day: the trial's clock put to noon
  const hour = await X.evaluate(`Math.floor((((${T}.now() + 7 * 3600000) % 86400000) + 86400000) % 86400000 / 3600000)`);
  await X.evaluate(`${T}.skipHours(${(12 - hour + 24) % 24})`);
  await warp(X, ...BY_FIRE);
  await until("the lamps' pictures have come", () => X.evaluate(`${L}.drawn()`), 20000);
  await sleep(700);
  ok("by day a page is told no night and no lamp lit", (await X.evaluate(`${L}.night()`)) === null && same(await litOf(X), []), await X.evaluate(`${L}.lamps()`));
  const dayBoxes = await X.evaluate(`${L}.boxes()`);
  ok("…the brazier, the board and the posts in sight stand on the map all the same", !!dayBoxes.fire && !!dayBoxes.board && dayBoxes.posts.length >= 1, { fire: !!dayBoxes.fire, board: !!dayBoxes.board, posts: dayBoxes.posts.length });
  ok("…nothing is offered at the fire, and no ring of light is cut in the day", (await X.evaluate(`${L}.atFire()`)) === true && !(await there(X, "[data-lamps-card]")) && (await X.evaluate(`${L}.rings()`)) === 0);
  await X.evaluate(`${L}.take()`);
  await sleep(500);
  ok("…and a flame asked for all the same is refused, and the page says when the lamps are lit", (await left(X)) === 0 && /17:30/.test((await note(X)) ?? ""), await note(X));
  await X.shot(`${OUT}/lamps-farm-day.png`);
  await mapTap(X, dayBoxes.board);
  await until("the board's panel opens", () => there(X, "[data-lamps-panel='farm']"), 8000).catch(() => {});
  ok("a tap on the board opens its panel, which says by day when the lamps are lit and how it is done in three steps", (await there(X, "[data-lamps-panel='farm']")) && /17:30/.test((await textOf(X, "[data-lamps-tonight]")) ?? "") && (await X.evaluate(`document.querySelectorAll("[data-lamps-panel] [data-lamps-steps] li").length`)) === 3, await textOf(X, "[data-lamps-tonight]"));
  await tap(X, "[data-lamps-close]");

  // ── by night
  await X.evaluate(`${L}.toNight()`);
  await until("the fire's card comes up", () => there(X, "[data-lamps-card='fire']"), 8000);
  ok("by night the fire offers a flame: the strip says how it is done in three steps, the first lit", (await X.evaluate(`${L}.night()`)) !== null && (await X.evaluate(`document.querySelector("[data-lamps-card] [data-lamps-steps]")?.dataset.lampsSteps`)) === "0"
    && (await X.evaluate(`document.querySelectorAll("[data-lamps-card] [data-lamps-steps] li").length`)) === 3 && (await there(X, "[data-lamps-take]")), await textOf(X, "[data-lamps-card]"));
  ok("…and with no lamp lit the night's dark is the map's own to lay, as it always was: no ring is cut, not about the fire either", (await X.evaluate(`${L}.rings()`)) === 0, await X.evaluate(`${L}.rings()`));
  await X.shot(`${OUT}/lamps-farm-0.png`);
  await takeFlame(X);
  const first = await left(X);
  ok("a tap takes a flame: it is in my hands for five seconds, for nothing, and the room is told the moment it dies", first > 3000 && first <= 5000 && (await stamina(X)) === 100 && (await X.evaluate(`${S}.me().flame`)) === (await X.evaluate(`${L}.lamps().flame.until`)), { first, room: await X.evaluate(`${S}.me().flame`) });
  ok("…the strip lights the second step, a bar says what is left, and no board is up", (await X.evaluate(`document.querySelector("[data-lamps-card] [data-lamps-steps]")?.dataset.lampsSteps`)) === "1" && (await there(X, "[data-lamps-left]")) && !(await board(X)), await textOf(X, "[data-lamps-card]"));
  await X.shot(`${OUT}/lamps-flame.png`);
  await until("the flame goes out", async () => (await left(X)) === 0, 7000);
  await sleep(500);
  ok("left alone it goes out after five seconds: that is said, the room is told, and nothing is lost", /ไฟดับ|went out/.test((await note(X)) ?? "") && (await X.evaluate(`${S}.me().flame`)) === 0 && (await stamina(X)) === 100 && same(await litOf(X), []), { note: await note(X), room: await X.evaluate(`${S}.me().flame`) });

  // ── alone: the nearest post (the fourth of the farm's, ten tiles east along the lane)
  const NEAREST = 4, was = await points(X);
  await sleep(600);
  await takeFlame(X);
  const box4 = await postBox(X, NEAREST);
  if (box4) await mapTap(X, box4);
  await until("the post is lit", async () => (await litOf(X)).includes(NEAREST), 8000).catch(() => {});
  ok("alone: a flame taken and a tap on the nearest dark post walks there and lights it, one of twelve", !!box4 && same(await litOf(X), [NEAREST]) && (await left(X)) === 0, { box: !!box4, lit: await litOf(X), left: await left(X), note: await note(X) });
  ok("…for one stamina and three helpers' points, and what it earned is said", (await stamina(X)) === 99 && (await points(X)) === was + 3 && (await there(X, "[data-lamps-earned]")) && /\+3/.test((await textOf(X, "[data-lamps-point]")) ?? ""), { stamina: await stamina(X), points: await points(X), earned: await textOf(X, "[data-lamps-earned]") });
  await sleep(3400);
  ok("…its ring is cut in the night's dark, and no board came up", (await X.evaluate(`${L}.rings()`)) === 1 && !(await board(X)), await X.evaluate(`${L}.rings()`));
  // (the ring is the day's own colours, not a glow over the dark: in its middle the hour's tint is taken away, and far from it the tint is laid exactly as the map lays it)
  const ring = (await X.evaluate(`${L}.ringsAt()`))[0], tint = await X.evaluate(`${L}.tint()`), sky = await X.evaluate(`${V}.sky().day.tint`);
  const inRing = ring ? await X.evaluate(`${L}.shadeAt(${ring.x}, ${ring.y})`) : null, edge = ring ? await X.evaluate(`${L}.shadeAt(${ring.x + ring.rx * 0.6}, ${ring.y})`) : null;
  const offRing = ring ? await X.evaluate(`${L}.shadeAt(${ring.x > 640 ? 8 : 1270}, 20)`) : null;
  ok("in a lit lamp's ring the night's tint is taken away: the day's own colours at its middle and well out towards its edge, once its light has come up", !!inRing && inRing.every((c) => c >= 250) && !!edge && edge.every((c) => c >= 250) && ring.k === 1, { ring, inRing, edge });
  ok("…and outside the ring the dark is the hour's own tint, exactly as the map lays it", same(tint, sky) && same(offRing, tint) && tint[0] < 255, { tint, sky, offRing });
  await X.shot(`${OUT}/lamps-farm-1.png`);
  const lit4 = await postBox(X, NEAREST);
  if (lit4) await mapTap(X, lit4);
  await sleep(500);
  ok("a tap on a lit post says it is lit", /ติดแล้ว|Lit tonight|is lit/.test((await note(X)) ?? ""), await note(X));
  await warp(X, POSTS.farm[10][0] + 1, POSTS.farm[10][1]);
  await sleep(500);
  ok("by a dark post with no flame the card says where to get one, and offers nothing to press", (await there(X, "[data-lamps-card='post']")) && !(await there(X, "[data-lamps-take]")) && !(await there(X, "[data-lamps-light]")), await textOf(X, "[data-lamps-card]"));

  // ── two: a flame handed on, and a post further out
  const Y = await X.window("LampsB");
  await enter(Y, "q");
  await fresh(Y);
  const b = await Y.evaluate(`${T}.id`);
  const MEET = [FIRE[0] + 8, FIRE[1] - 1], FAR = 5;
  await warp(X, ...BY_FIRE);
  await warp(Y, MEET[0] + 1, MEET[1]);
  await until("each page has the other", async () => !!(await X.evaluate(`${V}.at(${JSON.stringify(b)})`)) && !!(await Y.evaluate(`${V}.at(${JSON.stringify(a)})`)), 15000);
  const pa = await points(X), pb = await points(Y);
  await takeFlame(X);
  ok("nobody near: nobody is offered", same(await X.evaluate(`${L}.offered()`), []), await X.evaluate(`${L}.offered()`));
  await X.evaluate(`${V}.walk(${MEET[0]} + 0.5, ${MEET[1]} + 0.5)`);
  await until("the bearer has walked up", async () => !(await X.evaluate(`${V}.self()?.moving`)) && (await there(X, `[data-lamps-chip="${b}"]`)), 6000).catch(() => {});
  ok("whoever stands still with empty hands within three tiles is offered by name", same(await X.evaluate(`${L}.offered()`), [b]) && (await there(X, `[data-lamps-chip="${b}"]`)), { offered: await X.evaluate(`${L}.offered()`), left: await left(X) });
  ok("…and the other page draws the flame its bearer has, by what the room told it", (await Y.evaluate(`${S}.people().find((q) => q.id === ${JSON.stringify(a)})?.flame ?? 0`)) > 0);
  if (await there(X, `[data-lamps-chip="${b}"]`)) await tap(X, `[data-lamps-chip="${b}"]`);
  await until("the flame is the other's", async () => (await left(Y)) > 0, 5000).catch(() => {});
  const fresh2 = await left(Y);
  ok("a tap, and the flame is theirs, fresh again, for nothing; my hands are empty and that is said", fresh2 > 3000 && (await left(X)) === 0 && /ส่งไฟให้|Handed to/.test((await note(X)) ?? "") && (await stamina(X)) === 99, { fresh2, mine: await left(X), note: await note(X) });
  ok("…and whoever took it is told", await there(Y, "[data-lamps-gift]"), await textOf(Y, "[data-lamps-card]"));
  const box5 = await postBox(Y, FAR);
  if (box5) await mapTap(Y, box5);
  await until("the far post is lit", async () => (await litOf(Y)).includes(FAR), 8000).catch(() => {});
  ok("they light a post further out than one walks alone", !!box5 && (await litOf(Y)).includes(FAR), { box: !!box5, lit: await litOf(Y), note: await note(Y) });
  await until("the first page has it too", async () => (await litOf(X)).includes(FAR), 8000).catch(() => {});
  const hands = await X.evaluate(`${L}.lamps().maps.farm.lit.find((l) => l.post === ${FAR})?.hands.map((h) => h.id) ?? null`);
  ok("both whose hands the flame went through are counted it: three helpers' points each, and the post keeps both", same(hands, [a, b]) && (await points(X)) === pa + 3 && (await points(Y)) === pb + 3, { hands, a: await points(X), b: await points(Y) });
  ok("whoever only handed it on sees what it earned where they stand", (await there(X, "[data-lamps-earned]")) && /\+3/.test((await textOf(X, "[data-lamps-point]")) ?? ""), await textOf(X, "[data-lamps-earned]"));
  ok("the night's lighters are both, in the order they came", same(await X.evaluate(`${L}.lamps().maps.farm.lighters.map((h) => h.id)`), [a, b]), await X.evaluate(`${L}.lamps().maps.farm.lighters`));
  // (whoever bears a flame already is named with what they lack)
  await warp(Y, MEET[0] + 1, MEET[1]);
  await X.evaluate(`${L}.give(4)`);
  await Y.evaluate(`${L}.give(4)`);
  await until("the other is seen to bear one", async () => (await X.evaluate(`${L}.lacks()?.why ?? null`)) === "held", 4000).catch(() => {});
  ok("somebody close by who bears a flame already is not offered, and is named with what they lack", same(await X.evaluate(`${L}.offered()`), []) && same(await X.evaluate(`${L}.lacks()`), { who: b, why: "held" }) && (await there(X, "[data-lamps-lacks='held']")), await X.evaluate(`${L}.lacks()`));
  await sleep(4300);

  // ── tired hands: the button is held
  await X.evaluate(`${T}.setStamina(0)`);
  await warp(X, POSTS.farm[8][0] + 1, POSTS.farm[8][1] + 1);
  await X.evaluate(`${L}.give(30)`);
  await until("the held button comes up", () => there(X, "[data-lamps-light='hold']"), 6000);
  ok("with no stamina the post is lit by a button that is held, 1.2 seconds, and the card says so", (await X.evaluate(`document.querySelector("[data-lamps-light='hold']")?.dataset.hold`)) === "1.2" && (await X.evaluate(`${L}.hold()`)) === 1.2 && /กดปุ่มค้าง|hold the button/i.test((await textOf(X, "[data-lamps-said]")) ?? ""), await textOf(X, "[data-lamps-card]"));
  await tap(X, "[data-lamps-light='hold']", 300);
  await sleep(400);
  ok("let go of early, nothing is done and nothing is lost: the post is dark, the flame is still mine, and that is said", !(await litOf(X)).includes(8) && (await left(X)) > 0 && /กดค้าง|Keep it held/.test((await note(X)) ?? ""), { lit: await litOf(X), note: await note(X) });
  await tap(X, "[data-lamps-light='hold']", 1500);
  await until("the post is lit", async () => (await litOf(X)).includes(8), 5000).catch(() => {});
  ok("held to the end the post is lit, with no stamina, and no board came up on either page", (await litOf(X)).includes(8) && (await stamina(X)) === 0 && !(await board(X)) && !(await board(Y)), { lit: await litOf(X), stamina: await stamina(X) });
  await X.evaluate(`${T}.setStamina(100)`);

  // ── the board by the fire
  await warp(X, BOARDS.farm[0] + 1, BOARDS.farm[1] + 1);
  await sleep(500);
  const boardBox = await X.evaluate(`${L}.boxes().board`);
  if (boardBox) await mapTap(X, boardBox);
  await until("the board's panel opens", () => there(X, "[data-lamps-panel='farm']"), 8000).catch(() => {});
  const lighters = await X.evaluate(`[...document.querySelectorAll("[data-lamps-names] li")].map((e) => e.dataset.id)`);
  ok("the board says how many are lit tonight of twelve, with a lantern each", (await X.evaluate(`document.querySelector("[data-lamps-tonight]")?.dataset.lampsTonight`)) === "3" && /3\s*\/\s*12/.test((await textOf(X, "[data-lamps-have]")) ?? "")
    && (await X.evaluate(`document.querySelectorAll("[data-pip]").length`)) === 12 && (await X.evaluate(`document.querySelectorAll("[data-pip][data-lit='true']").length`)) === 3, await textOf(X, "[data-lamps-tonight]"));
  ok("…the three steps and the three lines said beforehand, the night's lighters in the order they came with no numbers, and the nights counted", (await X.evaluate(`document.querySelectorAll("[data-lamps-panel] [data-lamps-steps] li").length`)) === 3
    && (await X.evaluate(`document.querySelectorAll("[data-lamps-rules] li").length`)) === 3 && same(lighters, [a, b]) && (await X.evaluate(`document.querySelector("[data-lamps-nights]")?.dataset.lampsNights`)) === "0", { lighters, names: await textOf(X, "[data-lamps-names]") });
  await X.shot(`${OUT}/lamps-panel.png`);
  await tap(X, "[data-lamps-close]");

  // ── what the night becomes, on the farm: four, eight, and all twelve (pictures to be looked at)
  await warp(X, ...BY_FIRE);
  await warp(Y, BY_FIRE[0] + 1, BY_FIRE[1]);
  await zoomOut(X);
  for (const n of [4, 8]) {
    await X.evaluate(`${L}.lit("farm", ${n})`);
    await sleep(4200);
    ok(`with ${n} lit more of the night has come out on the farm`, (await X.evaluate(`${L}.tier()`)) === (n === 4 ? 1 : 2) && (await X.evaluate(`${L}.rings()`)) >= 1, { tier: await X.evaluate(`${L}.tier()`), rings: await X.evaluate(`${L}.rings()`) });
    await X.shot(`${OUT}/lamps-farm-${n}.png`);
  }
  await X.evaluate(`${L}.lit("farm", 11)`);
  await sleep(800);
  await X.evaluate(`${L}.give(30)`);
  await warp(X, POSTS.farm[11][0] + 1, POSTS.farm[11][1]);
  await until("the last post can be lit", () => there(X, "[data-lamps-light='press']"), 6000);
  await tap(X, "[data-lamps-light='press']");
  await until("the celebration comes up", () => there(X, "[data-lamps-fete='farm']"), 8000).catch(() => {});
  ok("the last lamp of the map is a celebration with the names of the night's lighters", (await there(X, "[data-lamps-fete='farm']")) && (await there(X, "[data-lamps-fete-names]")) && (await X.evaluate(`${L}.tier()`)) === 3, await textOf(X, "[data-lamps-fete]"));
  await until("the other page celebrates too", () => there(Y, "[data-lamps-fete='farm']"), 8000).catch(() => {});
  ok("…on every page that is on the map", await there(Y, "[data-lamps-fete='farm']"), await Y.evaluate(`${L}.fete()`));
  await X.shot(`${OUT}/lamps-farm-fete.png`);
  await warp(X, ...BY_FIRE);
  if (await there(X, "[data-lamps-fete]")) await tap(X, "[data-lamps-fete]");
  await sleep(9000);
  await X.shot(`${OUT}/lamps-farm-12.png`);
  await X.evaluate(`${L}.take()`);
  await sleep(500);
  ok("with every lamp lit the fire gives no more flame, the night is counted, and nothing is offered at it", (await left(X)) === 0 && (await X.evaluate(`${L}.lamps().maps.farm.full`)) === 1 && !(await there(X, "[data-lamps-take]")), { note: await note(X), full: await X.evaluate(`${L}.lamps().maps.farm.full`) });

  // ── the forest: the camp's own fire, and what its night becomes
  await warp(X, ...CAMP);
  await until("the forest's card comes up", () => there(X, "[data-lamps-card='fire']"), 10000);
  const ways = await X.evaluate(`${L}.ways("forest")`);
  ok("in the forest the camp's fire offers a flame, and its ways are laid out: three arms, mushrooms along them, the stream's own tiles", (await X.evaluate(`${L}.place()`)) === "forest" && ways.arms.length === 3 && ways.shrooms > 10 && ways.stream > 5, ways);
  await takeFlame(X);
  ok("a flame is taken at the camp's fire", (await left(X)) > 3500);
  await zoomOut(X, 0);
  await X.shot(`${OUT}/lamps-forest-0.png`);
  await sleep(5400);
  for (const n of [1, 4, 8, 12]) {
    await X.evaluate(`${L}.lit("forest", ${n})`);
    if (n === 12) { await until("the forest celebrates", () => there(X, "[data-lamps-fete='forest']"), 6000).catch(() => {}); if (await there(X, "[data-lamps-fete]")) await tap(X, "[data-lamps-fete]"); }
    await sleep(n === 12 ? 9000 : 4200);
    ok(`with ${n} lit in the forest: ${n === 12 ? "every lamp, the night at its most" : n >= 8 ? "glowing mushrooms along the trail" : n >= 4 ? "fireflies over the stream" : "its own light"}`, (await X.evaluate(`${L}.tier()`)) === (n === 12 ? 3 : n >= 8 ? 2 : n >= 4 ? 1 : 0) && (await X.evaluate(`${L}.rings()`)) >= 1, { tier: await X.evaluate(`${L}.tier()`), rings: await X.evaluate(`${L}.rings()`) });
    await X.shot(`${OUT}/lamps-forest-${n}.png`);
  }
  // (and by its trails: the way to the great tree, and the pool under the waterfall)
  await X.evaluate(`${V}.lookAt(${POSTS.forest[7][0]}, ${POSTS.forest[7][1]})`);
  await sleep(2500);
  await X.shot(`${OUT}/lamps-forest-tree.png`);
  await X.evaluate(`${V}.lookAt(${POSTS.forest[11][0] + 4}, ${POSTS.forest[11][1] - 3})`);
  await sleep(2500);
  await X.shot(`${OUT}/lamps-forest-fall.png`);
  await X.evaluate(`${V}.lookAt(${POSTS.farm[1][0]}, ${POSTS.farm[1][1]})`);

  // ── a phone's screen
  const P = await X.tab("LampsPhone", { width: 390, height: 780, dpr: 2, mobile: true });
  await enter(P, "r");
  await fresh(P);
  await P.evaluate(`${L}.lit("farm", 3)`);
  await warp(P, ...BY_FIRE);
  await until("the phone's card comes up", () => there(P, "[data-lamps-card='fire']"), 10000);
  ok("on a phone the fire's card is within the screen, its button too", inside(await within(P, "[data-lamps-card]")) && inside(await within(P, "[data-lamps-take]")), await within(P, "[data-lamps-card]"));
  await takeFlame(P);
  ok("…and so is the card of a flame borne", inside(await within(P, "[data-lamps-card='flame']")), await within(P, "[data-lamps-card]"));
  await P.shot(`${OUT}/lamps-phone-flame.png`);
  await sleep(5400);
  const pboard = await P.evaluate(`${L}.boxes().board`);
  if (pboard) await mapTap(P, pboard);
  await until("the phone's panel opens", () => there(P, "[data-lamps-panel]"), 8000).catch(() => {});
  const sheet = await within(P, "[data-lamps-panel]"), shut = await within(P, "[data-lamps-close]");
  ok("…and the board's panel, its button to shut it too", inside(sheet) && !!shut && shut.right <= shut.w && shut.top >= 0, { sheet, shut });
  await P.shot(`${OUT}/lamps-phone-panel.png`);
  if (await there(P, "[data-lamps-close]")) await tap(P, "[data-lamps-close]");
  await P.evaluate(`${L}.lit("farm", 11)`);
  await sleep(700);
  await P.evaluate(`${L}.lit("farm", 12)`);
  await until("the phone celebrates", () => there(P, "[data-lamps-fete]"), 8000).catch(() => {});
  ok("…and the night every lamp is lit", inside(await within(P, "[data-lamps-fete]")), await within(P, "[data-lamps-fete]"));
  await P.shot(`${OUT}/lamps-phone-fete.png`);
  const errors = [...X.errors(), ...Y.errors(), ...P.errors()];
  ok("no page threw anything", errors.length === 0, errors.slice(0, 4));
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/lamps-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
