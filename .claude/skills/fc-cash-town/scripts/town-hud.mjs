// Cash Town's HUD, tried in a real browser on the dev test room (the trial kept in the browser, `next dev` only):
// that nothing on the screen lies on anything else. The owner, 2026-10-08, with three screenshots ("แก้ไขปัญหา UI บังใน
// Cash town"): "get up" on the chat's lines, the clock under the wardrobe's button on a phone, the bucket line's chips
// across the pouring board; and the stall's bag leaving the shelf no room on a phone. Everything under the top row is
// one grid now (components/town/TownFoot), and this holds it to that at three sizes of screen:
//
// - sitting, with lines of chat over the map: the way to get up is over the chat (its lines and its box are one
//   thing: the owner, the same day, "ปุ่มลุกขึ้นควรจะอยู่ด้านบนแชท"), with the history open too, and nothing overlaps;
// - on a farm plot with water in the bucket and two friends beside with empty ones: the deed and the chips to hand
//   it on, one under the other; a game's board up: the chips put away, and on a narrow screen the whole foot the board's;
// - a phone at the uncle's stall with a bag of twenty-five slots: the bag folded to a line, the shelf with room, and
//   the fold opened and shut by its button.
//
// What counts as lying on another: two of the HUD's own pieces (buttons, pills, boards, the chat's lines) whose boxes
// share more than a sliver, neither inside the other. A panel that is opened (the stall, a talk) covers what is
// under it on purpose, and is not asked here.
//
// Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-hud.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", L = "window.__townLine", V = "window.__townView", S = "window.__cashTown";
const HOUR = 3_600_000;
const SIZES = { wide: { width: 1280, height: 860 }, phone: { width: 384, height: 730, dpr: 2, mobile: true }, short: { width: 360, height: 640, dpr: 2, mobile: true } };
const LINES = ["ดี5555", "กินในเกมไปหาไรกินนอกเกมด้วยดีกว่า55", "เลิกกินแล้วลุกไปเอาน้ำมาเติมบ่อหน่อยได้ไหม ถังหมดแล้ว"];

async function enter(X, letter, more = "") {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=10&townWeather=cloudy${more}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
}
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)}))`); await sleep(350); };
const click = async (X, x, y) => { for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
const enterKey = async (X) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
const say = async (X) => { for (const l of LINES) { await X.evaluate(`${S}.chat(${JSON.stringify(l)})`); await sleep(1300); } };
const box = (X, sel) => X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(), st = getComputedStyle(e); return { x: r.left, y: r.top, w: r.width, h: r.height, shown: r.width > 0 && r.height > 0 && st.visibility !== "hidden" }; })()`);

/** Every pair of the HUD's pieces that lie on one another: by what each says, and by how much. */
const overlaps = (X) => X.evaluate(`(() => {
  const stage = document.querySelector("canvas")?.parentElement;
  if (!stage) return ["no map"];
  const seen = [...stage.querySelectorAll("button, [role=status], [role=timer], [role=log], ul[aria-label], p.pop-in, form, section, [data-town-game], aside, [data-head-toast] > * > *, [data-well-gifts] > *")]
    .filter((e) => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 4 && r.height > 4 && st.visibility !== "hidden" && +st.opacity > 0.05; });
  const tops = seen.filter((e) => !seen.some((o) => o !== e && o.contains(e)));
  const name = (e) => (e.getAttribute("aria-label") || e.getAttribute("title") || e.innerText || e.tagName).replace(/\\s+/g, " ").trim().slice(0, 26);
  const out = [];
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) {
    const a = tops[i].getBoundingClientRect(), b = tops[j].getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 3 && h > 3) out.push(name(tops[i]) + " × " + name(tops[j]) + " (" + Math.round(w) + "×" + Math.round(h) + ")");
  }
  return out;
})()`);
/** Whether every piece of the HUD is within the screen. */
const within = (X, size) => X.evaluate(`[...document.querySelector("canvas").parentElement.querySelectorAll(".town-foot button, .town-foot [data-town-game]")].every((e) => { const r = e.getBoundingClientRect(); return r.width === 0 || (r.left >= -1 && r.right <= ${size.width} + 1 && r.top >= 0 && r.bottom <= ${size.height} + 1); })`);

/* ── sitting, with lines of chat ── */
for (const [label, size] of Object.entries(SIZES)) {
  const X = await browser("Hud" + label, size);
  console.log(`sitting · ${label}`);
  try {
    await enter(X, label === "wide" ? "A" : label === "phone" ? "B" : "C");
    await X.evaluate(`(${T}.reset(), ${T}.forget())`); await sleep(500);
    await say(X);
    let over = await overlaps(X);
    ok("with lines of chat over the map, nothing of the HUD lies on another (the clock clear of the buttons beside it)", over.length === 0, over);
    await X.evaluate(`${S}.sitHere()`); await sleep(900);
    const up = await box(X, "[data-stand-up]"), said = await box(X, "[data-foot-said] ul");
    over = await overlaps(X);
    ok("sat down: the way to get up is there, over the chat's lines, and nothing lies on another", !!up?.shown && !!said?.shown && up.y + up.h <= said.y + 1 && over.length === 0, { up, said, over });
    // (and with the chat's history open: a wide screen's by its button, a phone's by the chat's)
    await X.evaluate(`(document.querySelector('button[aria-label="แชท"]') ?? document.querySelector("[data-foot-ctrl] form button[type=button]")).click()`); await sleep(700);
    const log = await box(X, "[data-foot-said] [role=log]"), upNow = await box(X, "[data-stand-up]");
    ok(size.mobile ? "a phone's chat opened: its history and its box are one thing, and getting up is put away while it is typed in" : "the history opened: getting up is over it, not between it and the chat's box",
       !!log?.shown && (size.mobile ? !upNow?.shown : !!upNow?.shown && upNow.y + upNow.h <= log.y + 1), { log, upNow });
    await X.shot(`${OUT}/hud-sat-history-${label}.png`);
    await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await X.evaluate(`document.querySelector("[data-foot-said] button[aria-label]")?.click()`); await sleep(500);
    ok("…and all of it is within the screen", await within(X, size));
    await X.shot(`${OUT}/hud-sat-${label}.png`);
    { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
  } catch (e) { fail++; console.log(`  FAIL (stopped) ${e?.message ?? e}`); await X.shot(`${OUT}/hud-sat-${label}-stopped.png`).catch(() => {}); }
  finally { await X.close(); }
}

/* ── a screen a keyboard has made short, the chat open with more history than it has room for ── */
{
  // (no keyboard can be had here: a phone's screen 340 high leaves the grid as little as one does. Found by Codex's
  // check of the row that "get up" was given: with the history's row sized by its content, the chat's box was
  // pushed below the grid's foot, where a keyboard is.)
  const X = await browser("HudShortChat", { width: 384, height: 340, dpr: 2, mobile: true });
  console.log("the chat open on a very short screen");
  try {
    await enter(X, "K");
    await X.evaluate(`(${T}.reset(), ${T}.forget())`); await sleep(500);
    await say(X); await say(X);
    await X.evaluate(`document.querySelector('button[aria-label="แชท"]').click()`); await sleep(900);
    const r = await X.evaluate(`(() => { const f = document.querySelector("[data-foot-ctrl] form")?.getBoundingClientRect(), g = document.querySelector(".town-foot").getBoundingClientRect(), h = document.querySelector("[data-foot-said] [role=log]")?.parentElement.getBoundingClientRect(); return { grid: [Math.round(g.top), Math.round(g.bottom)], form: f ? [Math.round(f.top), Math.round(f.bottom)] : null, history: h ? [Math.round(h.top), Math.round(h.bottom)] : null }; })()`);
    ok("the history is taller than the room there is, and the chat's box stays at the foot: it is the history that gives way, upwards",
       !!r.form && !!r.history && r.history[1] - r.history[0] > r.grid[1] - r.grid[0] - 44 && r.form[1] <= r.grid[1] + 1 && r.history[1] <= r.form[0], r);
    await X.shot(`${OUT}/hud-short-chat.png`);
  } catch (e) { fail++; console.log(`  FAIL (stopped) ${e?.message ?? e}`); await X.shot(`${OUT}/hud-short-chat-stopped.png`).catch(() => {}); }
  finally { await X.close(); }
}

/* ── water in the bucket, two friends beside, and a game's board ── */
for (const label of ["wide", "short"]) {
  const size = SIZES[label], X = await browser("HudPour" + label, size);
  console.log(`a deed, chips and a board · ${label}`);
  try {
    await enter(X, label === "wide" ? "E" : "H", "&townHour=19");
    await X.evaluate(`(${T}.reset(), ${T}.forget())`); await sleep(500);
    await X.evaluate(`${T}.resize(10)`);
    const t0 = await X.evaluate(`${T}.now()`);
    const plant = { soil: "tilled", plant: { by: "somebody-else", crop: "pumpkin", sown: t0 - HOUR, boost: 0, watered: 0, fed: 0, guard: t0 + 4 * 86400000, cured: 0, picked: 0, pickedAt: 0 } };
    for (const k of ["132,5", "133,5", "134,5", "135,5", "136,5", "132,6", "133,6", "134,6"]) await X.evaluate(`${T}.setPlot(${JSON.stringify(k)}, ${JSON.stringify(plant)})`);
    await X.evaluate(`${T}.grant("bucket", 1)`);
    await hold(X, "bucket");
    await warp(X, 17, 42);
    await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 30000);
    await until("drawing is offered", async () => (await X.evaluate(`${F}.chore()`)) === "draw", 8000);
    await X.evaluate(`${F}.act()`); await sleep(400);
    if (await gameUp(X)) { await play(X); await sleep(600); }
    await X.evaluate(`${T}.spend(500)`); await sleep(300);
    await warp(X, 134, 5);
    for (const [letter, at] of [["F", [135, 7]], ["G", [133, 7]]]) {
      const Y = await X.window("HudFriend" + letter, SIZES.wide);
      await enter(Y, letter, "&townHour=19");
      await Y.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1))`);
      await hold(Y, "bucket");
      await warp(Y, ...at);
    }
    await until("handing on is offered", async () => !!(await X.evaluate(`${L}?.next?.()`)), 20000);
    await until("the pour is offered", async () => (await X.evaluate(`${F}.offer()`)) === "ditch", 8000);
    await say(X);
    const deed = await box(X, '[data-farm-offer="ditch"]'), chip = await box(X, "[data-line-chip]");
    let over = await overlaps(X);
    ok("the place's deed and the chips to hand water on are both there, the deed the lower, and nothing lies on another", !!deed?.shown && !!chip?.shown && deed.y >= chip.y + chip.h - 1 && over.length === 0, { deed, chip, over });
    ok("…all of it within the screen", await within(X, size));
    await X.shot(`${OUT}/hud-offer-${label}.png`);
    await X.evaluate(`${F}.act()`);
    await until("the board is up", async () => (await gameUp(X)) === "pouring", 5000, 50);
    await sleep(500);
    const board = await box(X, "[data-foot=board] [data-town-game], [data-foot=board] section"), chipNow = await box(X, "[data-line-chip]"), chatNow = await box(X, "[data-foot-ctrl]");
    over = await overlaps(X);
    ok("a game's board up: the chips are put away while it is, and nothing lies on it", !!board?.shown && !chipNow?.shown && over.length === 0, { board, chipNow, over });
    ok(label === "wide" ? "…and on a wide screen the chat's box stays beside it" : "…and on a narrow screen the foot is the board's alone: the chat and the buttons are put away, the board within the screen",
       label === "wide" ? !!chatNow?.shown : !chatNow?.shown && board.x >= 0 && board.x + board.w <= size.width && board.y + board.h <= size.height, { board, chatNow });
    await X.shot(`${OUT}/hud-board-${label}.png`);
    await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await until("the board is given up", async () => (await gameUp(X)) === null, 5000, 50);
    await sleep(400);
    ok("given up, the chips and the chat are back", !!(await box(X, "[data-line-chip]"))?.shown && !!(await box(X, "[data-foot-ctrl]"))?.shown);
    { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
  } catch (e) { fail++; console.log(`  FAIL (stopped) ${e?.message ?? e}`); await X.shot(`${OUT}/hud-pour-${label}-stopped.png`).catch(() => {}); }
  finally { await X.close(); }
}

/* ── a phone at the uncle's stall, with a big bag ── */
{
  const size = SIZES.phone, X = await browser("HudStall", size);
  console.log("the stall on a phone");
  try {
    await enter(X, "D");
    await X.evaluate(`(${T}.reset(), ${T}.forget())`); await sleep(500);
    await X.evaluate(`(${T}.resize(25), ${JSON.stringify(["pan", "hoe", "pot", "bucket", "can", "carrot", "salt", "scallion", "chili", "rice", "worm", "kangkong", "minnow", "catfish", "tomato", "garlic", "dough", "corn", "cabbage", "daikon", "rod", "pumpkin", "basil"])}.forEach((id) => ${T}.grant(id, 1)))`);
    await X.evaluate(`${V}.lookAt(46, 27.2)`); await sleep(900);
    const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
    const k = (await X.evaluate(`${V}.keepers()`)).find((b) => b.id === "uncle");
    await click(X, r.x + (k.x0 + k.x1) / 2, r.y + (k.y0 + k.y1) / 2);
    const TALK = `document.querySelector('[aria-labelledby="town-talk-h"]')`, TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
    await until("the talk opens", () => X.evaluate(`!!${TALK}`), 6000);
    for (let i = 0; i < 8 && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)); i++) { await enterKey(X); await sleep(200); }
    await X.evaluate(`[...${TALK}.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith("ฝากขาย")).click()`);
    await until("the stall opens", () => X.evaluate(`!!${TRADE}`), 6000);
    await sleep(500);
    const list = () => X.evaluate(`(() => { const e = ${TRADE}.querySelector(".overflow-y-auto"); return e ? e.clientHeight : 0; })()`);
    const bag = () => X.evaluate(`document.querySelector("[data-stall-bag]")?.dataset.stallBag ?? null`);
    const folded = await list();
    ok("with a bag of twenty-five slots the stall's bag is folded to a line, which says how many are taken", (await bag()) === "shut" && /23\/25/.test(await X.evaluate(`document.querySelector("[data-stall-bag]").innerText`)), { bag: await bag(), text: await X.evaluate(`document.querySelector("[data-stall-bag]")?.innerText`) });
    ok("…and the shelf has room: a third of the screen at the least", folded >= size.height / 3, folded);
    await X.shot(`${OUT}/hud-stall-phone.png`);
    await X.evaluate(`document.querySelector("[data-stall-bag] button").click()`); await sleep(400);
    const open = await list();
    ok("its button unfolds it: the pockets, two rows at a time, and the shelf still has room", (await bag()) === "open" && (await X.evaluate(`document.querySelectorAll("[data-stall-bag] li").length`)) === 25 && open >= 120, { bag: await bag(), open });
    await X.evaluate(`document.querySelector("[data-stall-bag] button").click()`); await sleep(300);
    ok("…and folds it again", (await bag()) === "shut" && (await list()) === folded);
    { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
  } catch (e) { fail++; console.log(`  FAIL (stopped) ${e?.message ?? e}`); await X.shot(`${OUT}/hud-stall-stopped.png`).catch(() => {}); }
  finally { await X.close(); }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
