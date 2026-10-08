// Cash Town's blacksmith, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by two testers in two tabs of one browser, then on a phone's screen:
//
// - his screen opens at its four leaves, under the picture of the forge;
// - smelting: what the bag can smelt, each with what it takes; pieces put in are paid for at once and smelt one
//   after another by the trial's clock; a queue that is full says so; what is done waits and is taken;
// - a friend standing by works the bellows of the piece that smelts, three times an hour, and it is done sooner;
//   nobody is offered their own;
// - forging: the tool on the anvil, what the next try takes (a wooden tool's own recipe) and how it may go, shown
//   before the try; to +4 every try takes; from the try to +5 the chance is held by this script: taken, stays, down
//   by one, and never under +4; whatever came of it, the materials and the fee are spent, and every try is written;
// - both draws of the first pool: two options laid out, one chosen; the second never offers the first; nothing is
//   forged while a draw waits; an option stays on its card when the level falls under it, and no new draw is laid
//   out when the level is back (NOT RUN since this was rewritten, 2026-10-08 evening: no option sleeps any more);
// - a gem set, what it does said on the tool's card only then; another set over it with a warning, the first gone;
// - an option drawn again for a gem and coins, the old one kept;
// - a tool that carries something is refused by the notice board and by a stall, and a deal carries it whole;
// - the board has the first to reach the top, and the village's book the options found;
// - the other tester sees the glow of a tool held at +7 and at the top, in its gem's colour.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-smith.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", S = "window.__townSmith", V = "window.__townView", C = "window.__cashTown";
const purse = (X) => X.evaluate(`${T}.purse()`);
const smithy = (X) => X.evaluate(`${T}.smithy()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const attr = (X, sel, name) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.getAttribute(${JSON.stringify(name)}) ?? null`);
const click = async (X, sel, wait = 300) => { const did = await X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`); await sleep(wait); return did; };
const count = (bag, item) => bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === "${item}")`);
const toolOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item) ?? null;
const leaf = async (X, v) => { await click(X, `[data-smith-tab="${v}"]`, 500); return (await attr(X, "[data-smith-panel]", "data-smith-view")) === v; };
const luck = (X, list) => X.evaluate(`${T}.setSmithLuck(${JSON.stringify(list)})`);
/** One try at the tool on the anvil, with the chance held: what the screen said came of it, and the tool afterwards. */
async function strike(X, item, list) {
  await luck(X, list);
  const before = (await X.evaluate(`${T}.smithLog().length`));
  if (!(await click(X, "[data-smith-strike]", 100))) return { out: "no button", tool: await toolOf(X, item) };
  await until("the try is written down", async () => (await X.evaluate(`${T}.smithLog().length`)) > before, 8000, 150);
  await until("the knocks are over", async () => !!(await attr(X, "[data-smith-said]", "data-out")), 8000, 150);
  return { out: await attr(X, "[data-smith-said]", "data-out"), said: await textOf(X, "[data-smith-said]"), tool: await toolOf(X, item) };
}
const offered = (X) => X.evaluate(`[...document.querySelectorAll("[data-smith-option]")].map((c) => ({ id: c.getAttribute("data-smith-option"), keep: c.getAttribute("data-keep") === "true", text: c.innerText }))`);
async function enter(X, letter, extra = "") {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear${extra}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
  await until("the smith's handle is there", () => X.evaluate(`!!${S}`), 20000);
}
const AXE_FIRST = ["axGrain", "axDust", "axKeen", "axResin", "axFresh", "axDry"], AXE_TOP = ["axOne", "axDouble", "axRoot", "axElder"];

const A = await browser("Smith", { width: 1280, height: 900 });
let B = null, P = null;
try {
  await enter(A, "A");
  await A.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(400);
  // (the test window's materials, and timber enough for a wooden tool's whole road with its failures)
  await A.evaluate(`(${T}.grantSmith(), ${T}.grant("axe", 1), ${T}.grant("hoe", 1), ${T}.grant("timber", 150))`);
  B = await A.tab("SmithB");
  await enter(B, "B");
  await B.evaluate(`(${T}.empty(), ${T}.resize(10))`);
  const idA = await A.evaluate(`${C}.me().id`), idB = await B.evaluate(`${C}.me().id`);
  await A.evaluate(`${V}.warp(36, 37)`); await B.evaluate(`${V}.warp(37, 37)`);
  await sleep(900);

  // ── the screen ──
  ok("nothing of the smith is on the map until it is asked for", !(await there(A, "[data-smith-panel]")));
  await A.evaluate(`${S}.open("smelt")`);
  await until("his screen has come", () => there(A, "[data-smith-panel]"), 20000);
  await sleep(600);
  ok("his screen opens at the smelting, with four leaves", (await attr(A, "[data-smith-panel]", "data-smith-view")) === "smelt" && (await A.evaluate(`document.querySelectorAll("[data-smith-tab]").length`)) === 4);
  ok("the forge's picture has come", await A.evaluate(`(() => { const i = document.querySelector("[data-smith-scene] img"); return !!i && i.complete && i.naturalWidth > 0; })()`));

  // ── smelting ──
  const p0 = await purse(A);
  ok("what the bag can smelt is listed: copper, iron and a ruby, and nothing it has no fragments for",
    (await there(A, '[data-smith-row="oreCopper"]')) && (await there(A, '[data-smith-row="oreIron"]')) && (await there(A, '[data-smith-row="gemRuby"]')) && !(await there(A, '[data-smith-row="oreSilver"]')) && !(await there(A, '[data-smith-row="gemOnyx"]')));
  ok("a piece of copper is said to take ten fragments, a timber and five coins, and five minutes",
    (await attr(A, '[data-smith-row="oreCopper"] [data-smith-need="shardCopper"]', "data-want")) === "10" && (await attr(A, '[data-smith-row="oreCopper"] [data-smith-need="timber"]', "data-want")) === "1"
    && (await attr(A, '[data-smith-row="oreCopper"] [data-smith-need="coins"]', "data-want")) === "5" && /5\s*(นาที|min)/.test(await textOf(A, '[data-smith-row="oreCopper"]')), await textOf(A, '[data-smith-row="oreCopper"]'));
  ok("the queue has three places, all free", (await attr(A, "[data-smith-places]", "data-smith-places")) === "3" && (await attr(A, "[data-smith-places]", "data-smith-free")) === "3");
  await click(A, '[data-smith-row="oreCopper"] button[aria-label="เพิ่มจำนวน"]', 200);
  ok("two are asked for at once", (await textOf(A, '[data-smith-row="oreCopper"] [data-smith-n]')) === "2");
  await click(A, '[data-smith-do="oreCopper"]', 500);
  const p1 = await purse(A), s1 = await smithy(A);
  ok("two pieces put in are paid for at once: twenty fragments, two timbers, ten coins", count(p0.bag, "shardCopper") - count(p1.bag, "shardCopper") === 20 && count(p0.bag, "timber") - count(p1.bag, "timber") === 2 && p0.coins - p1.coins === 10, { coins: p0.coins - p1.coins });
  ok("they smelt one after another: the second begins when the first ends, five minutes each", s1.queue.length === 2 && s1.queue[1].from === s1.queue[0].till && s1.queue[0].till - s1.queue[0].from === 300000 && s1.queue[1].till - s1.queue[1].from === 300000, s1.queue);
  ok("the first is on the fire with its countdown, the second waits", (await attr(A, '[data-smith-queue] li[data-on="true"]', "data-smith-piece")) === "oreCopper" && /[45]:\d\d/.test(await textOf(A, '[data-smith-queue] li[data-on="true"]')) && (await A.evaluate(`document.querySelectorAll('[data-smith-queue] li[data-on="false"]').length`)) === 1);
  await click(A, '[data-smith-do="gemRuby"]', 500);
  ok("a third fills the queue, and a full queue says so with nothing more to press", (await attr(A, "[data-smith-places]", "data-smith-free")) === "0" && (await attr(A, '[data-smith-row="oreCopper"] [data-smith-why]', "data-smith-why")) === "places" && !(await click(A, '[data-smith-do="oreCopper"]', 100)));
  ok("a gem takes ten minutes and twenty coins", (await smithy(A)).queue[2].till - (await smithy(A)).queue[2].from === 600000 && p1.coins - (await purse(A)).coins === 20);
  await A.shot(`${OUT}/smith-smelt.png`);

  // ── a friend at the bellows ──
  await B.evaluate(`${S}.open("smelt")`);
  await until("the friend's screen has come", () => there(B, "[data-smith-panel]"), 20000);
  await until("the friend is shown my fire", () => there(B, `[data-smith-fire="${idA}"]`), 12000);
  ok("nobody is shown their own fire", !(await there(A, `[data-smith-fire="${idA}"]`)) && !(await there(A, "[data-smith-fires]")));
  ok("the friend may work my bellows three times", (await attr(B, `[data-smith-blow="${idA}"]`, "data-left")) === "3");
  const till0 = (await smithy(A)).queue[0].till, rest0 = (await smithy(A)).queue[1].till;
  await click(B, `[data-smith-blow="${idA}"]`, 700);
  const blown = await smithy(A);
  ok("a go at the bellows takes half a minute off the piece that smelts, and off what waits behind it", till0 - blown.queue[0].till === 30000 && rest0 - blown.queue[1].till === 30000 && blown.queue[1].from === blown.queue[0].till, { off: till0 - blown.queue[0].till });
  ok("it is two points on the friend's helpers' line", (await B.evaluate(`${T}.lines().lines.helpers.points`)) === 2, await B.evaluate(`${T}.lines().lines.helpers`));
  await click(B, `[data-smith-blow="${idA}"]`, 700); await click(B, `[data-smith-blow="${idA}"]`, 900);
  ok("three times an hour and no more: the fourth is not to be pressed", till0 - (await smithy(A)).queue[0].till === 90000 && (await attr(B, `[data-smith-blow="${idA}"]`, "data-left")) === "0" && !(await click(B, `[data-smith-blow="${idA}"]`, 100)), await attr(B, `[data-smith-blow="${idA}"]`, "data-left"));
  ok("the trial itself refuses a fourth, and one's own", (await B.evaluate(`${T}.smithBellows("${idA}")`)).why === "tired" && (await A.evaluate(`${T}.smithBellows("${idA}")`)).why === "self");
  await B.shot(`${OUT}/smith-bellows.png`);
  await B.evaluate(`${S}.close()`);

  // ── by the clock, also while away ──
  await A.evaluate(`${S}.close()`);
  await A.evaluate(`${T}.skipHours(0.1)`);
  await sleep(500);
  await A.evaluate(`${S}.open("forge")`);
  await until("his screen is back", () => there(A, "[data-smith-panel]"), 10000);
  ok("six minutes on, with the screen shut meanwhile, a piece is done: the smelting's leaf says one waits", (await textOf(A, "[data-smith-due]")) === "1", await textOf(A, "[data-smith-due]"));
  await leaf(A, "smelt");
  const before = count((await purse(A)).bag, "oreCopper");
  ok("what is done is shown to be taken, and the next is on the fire", (await attr(A, "[data-smith-done]", "data-smith-done")) === "1" && (await attr(A, '[data-smith-queue] li[data-on="true"]', "data-smith-piece")) === "oreCopper");
  await click(A, "[data-smith-take]", 500);
  ok("taken, it is in the bag", count((await purse(A)).bag, "oreCopper") === before + 1 && !(await there(A, "[data-smith-done]")));
  await A.evaluate(`${T}.skipHours(30 * 24)`);
  await sleep(1200);
  ok("a month away, everything that was put in is done and waits: nothing is lost", (await attr(A, "[data-smith-done]", "data-smith-done")) === "2");
  await click(A, "[data-smith-take]", 500);
  ok("and is taken: a piece of copper and a ruby", count((await purse(A)).bag, "oreCopper") === before + 2 && count((await purse(A)).bag, "gemRuby") === count(p0.bag, "gemRuby") + 1);
  const wide0 = await purse(A);
  ok("three more places are offered for twenty timbers and two hundred coins", (await attr(A, '[data-smith-wider] [data-smith-need="timber"]', "data-want")) === "20" && (await attr(A, '[data-smith-wider] [data-smith-need="coins"]', "data-want")) === "200");
  await click(A, "[data-smith-widen]", 500);
  ok("widened: six places, the timber and the coins gone; the next asks forty and five hundred", (await attr(A, "[data-smith-places]", "data-smith-places")) === "6" && wide0.coins - (await purse(A)).coins === 200 && count(wide0.bag, "timber") - count((await purse(A)).bag, "timber") === 20
    && (await attr(A, '[data-smith-wider] [data-smith-need="timber"]', "data-want")) === "40" && (await attr(A, '[data-smith-wider] [data-smith-need="coins"]', "data-want")) === "500");

  // ── forging: a wooden tool, to +4 ──
  await leaf(A, "forge");
  const axeSlot = await slotOf(A, "axe");
  await click(A, `[data-smith-tool="${axeSlot}"]`, 400);
  ok("the axe is on the anvil, as it was bought", (await attr(A, "[data-smith-card]", "data-item")) === "axe" && (await attr(A, "[data-smith-card]", "data-plus")) === "0" && (await attr(A, "[data-smith-anvil]", "data-glow")) === "0");
  ok("its first try is said to take a wooden tool's share: three fragments, four timbers, ten coins; and to take for certain",
    (await attr(A, '[data-smith-try] [data-smith-need="shardCopper"]', "data-want")) === "3" && (await attr(A, '[data-smith-try] [data-smith-need="timber"]', "data-want")) === "4" && (await attr(A, '[data-smith-try] [data-smith-need="coins"]', "data-want")) === "10"
    && (await attr(A, "[data-smith-odds]", "data-smith-odds")) === "100/0/0");
  const f0 = await purse(A);
  let did = await strike(A, "axe", [0.999]);
  const f1 = await purse(A);
  ok("with the worst of luck the first try still takes: +1", did.out === "taken" && did.tool.plus === 1 && /\+1/.test(did.said), did);
  ok("and it spent what it said", count(f0.bag, "shardCopper") - count(f1.bag, "shardCopper") === 3 && count(f0.bag, "timber") - count(f1.bag, "timber") === 4 && f0.coins - f1.coins === 10);
  did = await strike(A, "axe", [0.999]);
  did = await strike(A, "axe", [0.999, 0, 0.5]);
  ok("to +3, each try taking", did.out === "taken" && did.tool.plus === 3, did);
  await until("the draw of +3 is laid out", () => there(A, "[data-smith-offer]"), 8000);
  let cards = await offered(A);
  ok("at +3 two options of the axe's first pool are laid out, not the same one twice", cards.length === 2 && cards[0].id !== cards[1].id && cards.every((c) => AXE_FIRST.includes(c.id) && !c.keep), cards);
  ok("each card says what its option is called and what it does", cards.every((c) => c.text.split("\n").filter((l) => l.trim()).length >= 4), cards);
  ok("while a draw waits there is nothing to strike, and no other leaf to turn to", !(await there(A, "[data-smith-try]")) && !(await click(A, '[data-smith-tab="gems"]', 100)) && (await A.evaluate(`${T}.smithTry(${axeSlot}, "A")`)).why === "owed");
  await A.shot(`${OUT}/smith-draw.png`);
  // (the same two, however often it is asked: shut and opened again)
  await A.evaluate(`${S}.close()`); await sleep(300);
  await luck(A, [0.9, 0.1]);
  await A.evaluate(`${S}.open("forge")`);
  await until("the draw is laid out again", () => there(A, "[data-smith-offer]"), 8000);
  ok("shut and opened again, it is the same two", JSON.stringify((await offered(A)).map((c) => c.id)) === JSON.stringify(cards.map((c) => c.id)), await offered(A));
  const first = cards[0].id;
  await click(A, `[data-smith-choose="${first}"]`, 600);
  ok("one is chosen, and is the axe's from then on", (await toolOf(A, "axe")).opts?.[0] === first && !(await there(A, "[data-smith-offer]")) && (await there(A, `[data-smith-opt="${first}"]`)), await toolOf(A, "axe"));
  did = await strike(A, "axe", [0.999]);
  ok("to +4, still for certain", did.out === "taken" && did.tool.plus === 4, did);

  // ── from the try to +5 it may fail ──
  ok("the try to +5 is said to take nine times in ten and never to lower; a wooden tool's share of it is one ore, eight timbers", (await attr(A, "[data-smith-odds]", "data-smith-odds")) === "90/10/0"
    && (await attr(A, '[data-smith-try] [data-smith-need="oreIron"]', "data-want")) === "1" && (await attr(A, '[data-smith-try] [data-smith-need="timber"]', "data-want")) === "8" && (await attr(A, '[data-smith-try] [data-smith-need="coins"]', "data-want")) === "150");
  const g0 = await purse(A);
  did = await strike(A, "axe", [0.95]);
  const g1 = await purse(A);
  ok("a try that fails and stays: still +4, and the screen says so", did.out === "stays" && did.tool.plus === 4 && /\+4/.test(did.said), did);
  ok("a failed try spent its ore, its timber and its fee all the same", count(g0.bag, "oreIron") - count(g1.bag, "oreIron") === 1 && count(g0.bag, "timber") - count(g1.bag, "timber") === 8 && g0.coins - g1.coins === 150);
  did = await strike(A, "axe", [0.5]);
  ok("a try that takes: +5", did.out === "taken" && did.tool.plus === 5, did);
  ok("the try to +6 is said to lower one time in twenty", (await attr(A, "[data-smith-odds]", "data-smith-odds")) === "80/15/5");
  did = await strike(A, "axe", [0.97]);
  ok("a try that fails and lowers: down by one, to +4", did.out === "down" && did.tool.plus === 4 && /\+4/.test(did.said), did);
  did = await strike(A, "axe", [0.999999]);
  ok("at +4 the worst of luck only stays: never under +4", did.out === "stays" && did.tool.plus === 4, did);
  ok("the option had at +3 is still the axe's", (await toolOf(A, "axe")).opts?.[0] === first && (await there(A, `[data-smith-opt="${first}"]`)));
  did = await strike(A, "axe", [0]);
  did = await strike(A, "axe", [0, 0.1, 0.9]);
  ok("to +6", did.out === "taken" && did.tool.plus === 6, did);
  await until("the draw of +6 is laid out", () => there(A, "[data-smith-offer]"), 8000);
  cards = await offered(A);
  ok("at +6 two more of the first pool are laid out, and never the one had at +3", cards.length === 2 && cards.every((c) => AXE_FIRST.includes(c.id) && c.id !== first), cards);
  const second = cards[1].id;
  await click(A, `[data-smith-choose="${second}"]`, 600);
  ok("the second is chosen", JSON.stringify((await toolOf(A, "axe")).opts) === JSON.stringify([first, second]));

  // ── an option stays the tool's when the level falls under it (nothing sleeps: the owner, 2026-10-08) ──
  did = await strike(A, "axe", [0.999]);
  ok("a try to +7 that lowers: +5", did.out === "down" && did.tool.plus === 5, did);
  ok("the option of +6 is on the card still, and nothing says it sleeps; so is the option of +3", (await there(A, `[data-smith-opt="${second}"]`)) && !/หลับอยู่/.test(await textOf(A, `[data-smith-opt="${second}"]`)) && (await there(A, `[data-smith-opt="${first}"]`)));
  did = await strike(A, "axe", [0]);
  await sleep(1500);
  ok("back at +6 it is the same option, and no new draw is laid out", did.tool.plus === 6 && (await there(A, `[data-smith-opt="${second}"]`)) && !(await there(A, "[data-smith-offer]")) && JSON.stringify((await toolOf(A, "axe")).opts) === JSON.stringify([first, second]));

  // ── the glow, seen by the other ──
  await A.evaluate(`${T}.hold(${axeSlot})`);
  await sleep(1200);
  const seen = async () => (await B.evaluate(`${C}.people().find((p) => p.id === "${idA}")`)) ?? {};
  ok("held at +6 it does not glow: the other is told nothing of it", ((await seen()).hold === "axe") && ((await seen()).tool ?? "") === "", await seen());
  did = await strike(A, "axe", [0]);
  await until("the other hears of the glow", async () => (await seen()).tool === "1", 8000);
  ok("held at +7 it glows, and the other tester is told so", did.tool.plus === 7 && (await attr(A, "[data-smith-anvil]", "data-glow")) === "1" && (await seen()).tool === "1", await seen());

  // ── a gem ──
  ok("the gems' leaf is turned to", await leaf(A, "gems"));
  ok("with nothing set, the card says the socket is empty and nothing of any gem", (await attr(A, "[data-smith-gem]", "data-smith-gem")) === "" && !(await there(A, "[data-smith-gem-does]")));
  const j0 = await purse(A);
  await click(A, '[data-smith-pick-gem="gemRuby"]', 400);
  ok("a gem chosen is said to take itself, a mount of copper and fifty coins; and nothing is to be lost", (await attr(A, '[data-smith-setting] [data-smith-need="oreCopper"]', "data-want")) === "1" && (await attr(A, '[data-smith-setting] [data-smith-need="coins"]', "data-want")) === "50" && !(await there(A, "[data-smith-warn]")));
  ok("what the gem would do is not said before it is set", !(await there(A, "[data-smith-gem-does]")) && !/ฟันน้อยลง/.test(await textOf(A, "[data-smith-gems]")));
  await click(A, "[data-smith-set]", 600);
  const j1 = await purse(A);
  ok("set: the ruby is in the axe, and a ruby, a copper and fifty coins are gone", JSON.stringify((await toolOf(A, "axe")).gems) === JSON.stringify(["fire"]) && count(j0.bag, "gemRuby") - count(j1.bag, "gemRuby") === 1 && count(j0.bag, "oreCopper") - count(j1.bag, "oreCopper") === 1 && j0.coins - j1.coins === 50);
  ok("once set, the tool's own card says what it does", (await attr(A, "[data-smith-gem]", "data-smith-gem")) === "fire" && ((await textOf(A, "[data-smith-gem-does]")) ?? "").length > 4, await textOf(A, "[data-smith-gem-does]"));
  await until("the other sees its colour", async () => (await seen()).tool === "1f1", 8000);
  ok("the glow is its gem's colour now, for the other tester too", (await seen()).tool === "1f1");
  ok("the same element is not to be set again", (await attr(A, '[data-smith-pick-gem="gemRuby"]', "data-can")) === "false");
  await click(A, '[data-smith-pick-gem="gemSapphire"]', 400);
  ok("another gem over it warns that the ruby will be gone", /ทับทิม/.test((await textOf(A, "[data-smith-warn]")) ?? ""), await textOf(A, "[data-smith-warn]"));
  await A.shot(`${OUT}/smith-gem-over.png`);
  await click(A, "[data-smith-set]", 600);
  const j2 = await purse(A);
  ok("set over: the sapphire is in it, the ruby is gone and does not come back", JSON.stringify((await toolOf(A, "axe")).gems) === JSON.stringify(["water"]) && count(j2.bag, "gemRuby") === count(j1.bag, "gemRuby") && count(j1.bag, "gemSapphire") - count(j2.bag, "gemSapphire") === 1 && j1.coins - j2.coins === 50);

  // ── an option drawn again ──
  await leaf(A, "forge");
  const r0 = await purse(A);
  await click(A, '[data-smith-again="0"]', 400);
  ok("drawing the option of +3 again asks for a gem of the bag's and a hundred coins", (await there(A, '[data-smith-redraw="0"]')) && (await there(A, '[data-smith-pay="gemEmerald"]')) && /100/.test(await textOf(A, "[data-smith-redraw]")));
  await luck(A, [0.2, 0.7]);
  await click(A, '[data-smith-pay="gemEmerald"]', 700);
  await until("the new draw is laid out", () => there(A, "[data-smith-offer]"), 8000);
  cards = await offered(A);
  const r1 = await purse(A);
  ok("two new ones are laid out beside the old one, which may be kept", cards.length === 3 && cards.filter((c) => c.keep).length === 1 && cards.find((c) => c.keep).id === first && cards.filter((c) => !c.keep).every((c) => AXE_FIRST.includes(c.id) && c.id !== first && c.id !== second), cards);
  ok("it took an emerald and a hundred coins", count(r0.bag, "gemEmerald") - count(r1.bag, "gemEmerald") === 1 && r0.coins - r1.coins === 100);
  await click(A, `[data-smith-choose="${first}"]`, 600);
  ok("the old one kept: the axe is as it was", JSON.stringify((await toolOf(A, "axe")).opts) === JSON.stringify([first, second]) && !(await there(A, "[data-smith-offer]")));

  // ── to the top, and the board ──
  await leaf(A, "board");
  ok("the board has nobody at the top with an axe yet, and two options found in the village's book", (await attr(A, '[data-smith-top-of="axe"]', "data-by")) === "" && (await attr(A, "[data-smith-found]", "data-smith-found")) === "2" && (await A.evaluate(`document.querySelectorAll("[data-smith-shade]").length`)) > 0);
  await leaf(A, "forge");
  for (let to = 8; to <= 10; to++) did = await strike(A, "axe", to === 10 ? [0, 0.3, 0.3] : [0]);
  ok("to the top: +10", did.tool.plus === 10, did);
  await until("the draw of the top is laid out", () => there(A, "[data-smith-offer]"), 8000);
  cards = await offered(A);
  ok("at the top two options of the second pool are laid out", cards.length === 2 && cards.every((c) => AXE_TOP.includes(c.id)), cards);
  await click(A, `[data-smith-choose="${cards[0].id}"]`, 600);
  ok("at the top there is nothing more to strike, and the axe on the anvil glows fully", (await there(A, "[data-smith-top]")) && !(await there(A, "[data-smith-strike]")) && (await attr(A, "[data-smith-anvil]", "data-glow")) === "2");
  await until("the other sees the full glow", async () => (await seen()).tool === "2w2", 8000);
  ok("the other tester sees it glow fully, in its sapphire's colour, the gem a level stronger", (await seen()).tool === "2w2", await seen());
  await A.shot(`${OUT}/smith-top.png`);
  await leaf(A, "board");
  ok("the board has the first to forge an axe to the top", (await attr(A, '[data-smith-top-of="axe"]', "data-by")) === idA && (await attr(A, '[data-smith-top-of="pick"]', "data-by")) === "" && (await attr(A, "[data-smith-found]", "data-smith-found")) === "3", await textOf(A, '[data-smith-top-of="axe"]'));
  await A.shot(`${OUT}/smith-board.png`);
  const log = await A.evaluate(`${T}.smithLog()`);
  ok("every try was written down, the failed ones too", log.length === 16 && log.filter((l) => l.out === "stays").length === 2 && log.filter((l) => l.out === "down").length === 2 && log.every((l) => l.item === "axe" && l.by === idA), log.map((l) => `${l.from}>${l.level} ${l.out}`));

  // ── a tool that carries something is no plain thing ──
  await A.evaluate(`${S}.close()`);
  const post = await A.evaluate(`${T}.noticePost("sell", "axe", 1, 10)`), plainPost = await A.evaluate(`${T}.noticePost("sell", "hoe", 1, 10)`);
  ok("the notice board does not take the forged axe to sell, and takes a plain hoe", post.ok === false && post.why === "none" && plainPost.ok === true, { post, plainPost });
  const at = await A.evaluate(`(() => { const p = ${V}.self(); return [Math.floor(p.x), Math.floor(p.y)]; })()`);
  const stall = await A.evaluate(`${T}.shopOpen([{ kind: "sell", item: "axe", n: 1, price: 10 }], ${JSON.stringify(at)})`);
  ok("a stall does not take it either", stall.ok === false && stall.why === "none", stall);
  const mine = await toolOf(A, "axe");
  const opened = await A.evaluate(`${T}.dealOpen("${idB}", "A", "B")`), laid = await A.evaluate(`${T}.dealLay([["axe", 1]])`);
  await A.evaluate(`${T}.dealAgree()`);
  const done = await B.evaluate(`${T}.dealAgree()`);
  await sleep(500);
  const theirs = await toolOf(B, "axe");
  ok("a deal carries it whole: the other has the axe with its plus, its three options and its gem, and I have none", opened.ok && laid.ok && done.ok && done.done === true && !(await toolOf(A, "axe"))
    && !!theirs && theirs.plus === 10 && JSON.stringify(theirs.opts) === JSON.stringify(mine.opts) && JSON.stringify(theirs.gems) === JSON.stringify(["water"]), { opened, laid, done, theirs });

  // ── a phone ──
  P = await A.tab("SmithPhone", { width: 390, height: 844, dpr: 2, mobile: true });
  await enter(P, "A");
  await P.evaluate(`${T}.grant("axe", 1)`);
  await P.evaluate(`${S}.open("forge")`);
  await until("his screen has come on a phone", () => there(P, "[data-smith-panel]"), 20000);
  await sleep(700);
  const box = await P.evaluate(`(() => { const r = document.querySelector("[data-smith-panel]").getBoundingClientRect(), s = document.querySelector("[data-smith-strike]")?.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: innerWidth, h: innerHeight, strike: s ? s.bottom : null }; })()`);
  ok("on a phone his screen fits the width, and the strike is on the first screen", box.left >= 0 && box.right <= box.w + 1 && box.top >= 0 && box.strike !== null && box.strike <= box.h, box);
  await P.shot(`${OUT}/smith-phone-forge.png`);
  for (const v of ["smelt", "gems", "board"]) { await leaf(P, v); await sleep(400); await P.shot(`${OUT}/smith-phone-${v}.png`); }
  ok("no page threw anything", A.errors().length === 0 && B.errors().length === 0 && P.errors().length === 0, [...A.errors(), ...B.errors(), ...P.errors()]);
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e.message}`);
  try { await A.shot(`${OUT}/smith-stopped.png`); } catch {}
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  A.close();
  process.exit(fail ? 1 : 0);
}
