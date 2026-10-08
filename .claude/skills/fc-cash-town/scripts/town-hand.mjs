// Cash Town's quick ways of the hand and the bag, tried in a real browser on the dev test room (the trial kept in the
// browser, `next dev` only). Members' asks, by way of the owner, 2026-10-08: "กด i เพื่อเปิดปิดช่องเก็บของ", "มีปุ่ม /
// คีย์ลัดสลับเครื่องมือในตัวแบบไวๆ ไม่ต้องเปิดช่องเก็บของเพื่อกดถือทุกครั้ง", "เวลาตกปลาแล้วกำลังรอให้ปลาติดเบ็ดเผลอไปกดเปิด
// กระเป๋าแล้วมันหลุดเลย", and of an insect that would not be caught, "กดหลายรอบแล้วแต่ก็ยังจับไม่ได้".
//
// - the hand's quick bar (components/town/TownHand): none with nothing to hold; the bag's tools and seed in its
//   order, each with its key; the keys 1 to 9 take one up and put it away again, Q goes round; a click does the
//   same; nothing while something is typed;
// - the I key opens my bag and shuts it, and types an "i" in the chat's box;
// - a line in the water stays there while my bag is looked into, and no bait is lost;
// - with a net in the hand, a tap on an insect that is over my own doll is a swing at it, not a look at my card;
// - a phone: one button beside the chat's, which unfolds the things over it; a tap takes one up and folds it.
//
// Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-hand.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", V = "window.__townView", B = "window.__townBugs", H = "window.__townHand", S = "window.__cashTown";
const FISH = `document.querySelector('[aria-labelledby="town-fish-h"]')`, TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const key = async (X, code, k = code) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: code.startsWith("Digit") ? 48 + Number(code.slice(5)) : code.startsWith("Key") ? code.charCodeAt(3) : 0 }); await sleep(350); };
const click = async (X, x, y) => { for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
const hand = (X) => X.evaluate(`${T}.purse().hand ?? null`);
const held = (X, id) => X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(800); };
const press = (X, words) => X.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)})); if (!b) return false; b.click(); return true; })()`);
const bar = (X) => X.evaluate(`[...document.querySelectorAll('[data-town-hand="bar"] button')].map((b) => ({ slot: +b.dataset.handSlot, on: b.getAttribute("aria-pressed") === "true", key: b.querySelector("kbd")?.innerText ?? "" }))`);
async function enter(X, letter, more = "") {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=10&townWeather=cloudy${more}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
}

const X = await browser("Hand", { width: 1280, height: 860 });
try {
  await enter(X, "A");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`); await sleep(600);
  await X.evaluate(`${T}.resize(10)`);
  console.log("the quick bar and its keys");
  ok("with nothing to take in the hand there is no bar", (await bar(X)).length === 0 && !(await X.evaluate(`!!document.querySelector("[data-town-hand]")`)));
  await X.evaluate(`(${T}.grant("kangkong", 5), ${T}.grant("hoe", 1), ${T}.grant("minnow", 2), ${T}.grant("can", 1), ${T}.grant("seedKangkong", 6))`);
  await until("the bar is there", async () => (await bar(X)).length === 3, 20000);
  let b = await bar(X);
  ok("the bag's tools and seed are on it in the bag's order, each with its key, and what is only carried is not", same(b.map((s) => s.slot), [1, 3, 4]) && same(b.map((s) => s.key), ["1", "2", "3"]) && b.every((s) => !s.on), b);
  await key(X, "Digit2", "2");
  b = await bar(X);
  ok("the key 2 takes the second up: the can is in my hand, and lit on the bar", (await hand(X)) === "can" && same(b.map((s) => s.on), [false, true, false]) && (await X.evaluate(`${S}.me().hold`)) === "can", { hand: await hand(X), b });
  await key(X, "Digit2", "2");
  ok("the same key again puts it away", (await hand(X)) === null && (await bar(X)).every((s) => !s.on), await hand(X));
  const round = [];
  for (let i = 0; i < 4; i++) { await key(X, "KeyQ", "q"); round.push(await hand(X)); }
  ok("Q goes round them, from the first and back to it", same(round, ["hoe", "can", "seedKangkong", "hoe"]), round);
  await key(X, "KeyQ", "ๆ");
  ok("…by the key's place: with a Thai layout the same key", (await hand(X)) === "can", await hand(X));
  await key(X, "Digit9", "9");
  ok("a key with nothing on it changes nothing", (await hand(X)) === "can");
  await X.evaluate(`document.querySelector('[data-town-hand="bar"] [data-hand-slot="4"]').click()`); await sleep(400);
  ok("a click on a thing takes it up, and a click on what is held puts it away", (await hand(X)) === "seedKangkong" && (await X.evaluate(`(document.querySelector('[data-town-hand="bar"] [data-hand-slot="4"]').click(), true)`)) && (await sleep(400), (await hand(X)) === null), await hand(X));
  await X.shot(`${OUT}/hand-bar.png`);

  // typing: the keys are the chat's
  await key(X, "Enter", "Enter");
  await until("the chat's box has the keys", () => X.evaluate(`document.activeElement?.tagName === "INPUT"`), 3000);
  for (const [code, k] of [["Digit1", "1"], ["KeyQ", "q"], ["KeyI", "i"]]) { await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, text: k }); await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code }); await sleep(120); }
  ok("while something is typed the keys are the chat's: 1, q and i are typed, nothing is taken up, no bag opened", (await X.evaluate(`document.activeElement.value`)) === "1qi" && (await hand(X)) === null && !(await X.evaluate(`!!${TRADE}`)), { typed: await X.evaluate(`document.activeElement.value`), hand: await hand(X) });
  await X.evaluate(`(() => { const i = document.activeElement; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, ""); i.dispatchEvent(new Event("input", { bubbles: true })); i.blur(); })()`); await sleep(300);

  console.log("the I key");
  await key(X, "KeyI", "i");
  ok("I opens my bag", await X.evaluate(`!!${TRADE} && ${TRADE}.innerText.includes("กระเป๋าของฉัน")`));
  await key(X, "KeyI", "ร");
  ok("…and I again shuts it (the same key with a Thai layout)", !(await X.evaluate(`!!${TRADE}`)));

  // (a piece of work's game is not given up by the key: found by Codex's check. Weeds pulled on a farm plot.)
  await key(X, "Digit1", "1");
  await warp(X, 140, 9);
  await until("the farm's own code has come", () => X.evaluate(`!!window.__townFarm`), 30000);
  await until("the hoe's work is offered", () => X.evaluate(`!!window.__townFarm.offer()`), 8000);
  await X.evaluate(`window.__townFarm.act()`);
  await until("the game's board is up", () => X.evaluate(`!!document.querySelector('[data-foot="board"] [data-town-game]')`), 5000, 50);
  await key(X, "KeyI", "i");
  ok("while a piece of work's game is played, I opens nothing and the game goes on", !(await X.evaluate(`!!${TRADE}`)) && (await X.evaluate(`!!document.querySelector('[data-foot="board"] [data-town-game]')`)), { trade: await X.evaluate(`!!${TRADE}`) });
  await key(X, "Escape", "Escape");
  await until("the game is given up", () => X.evaluate(`!document.querySelector('[data-foot="board"]')`), 5000, 50);

  console.log("a line in the water, and the bag");
  await X.evaluate(`(${T}.grant("rod", 1), ${T}.grant("worm", 5))`);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "rod"))`); await sleep(400);
  await warp(X, 17, 42);
  await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 8000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel is ready", () => X.evaluate(`window.__townFish?.phase() === "ready"`), 8000);
  await X.evaluate(`window.__townFish.quick(false)`); await sleep(150);
  await press(X, "หย่อนเบ็ด");
  await until("the line is out", () => X.evaluate(`window.__townFish.phase() === "waiting"`), 4000, 40);
  const worms = await held(X, "worm");
  await key(X, "KeyI", "i");
  await sleep(500);
  ok("with the line out, I opens my bag and the line stays in the water: the rod's panel is there still, no bait gone", (await X.evaluate(`!!${TRADE} && !!${FISH} && window.__townFish?.phase() === "waiting"`)) && (await held(X, "worm")) === worms, { trade: await X.evaluate(`!!${TRADE}`), fish: await X.evaluate(`window.__townFish?.phase() ?? null`), worms: [worms, await held(X, "worm")] });
  await X.shot(`${OUT}/hand-fishing-bag.png`);
  await key(X, "KeyI", "i");
  ok("…and with the bag shut again it is out still", (await X.evaluate(`!${TRADE} && window.__townFish?.phase() === "waiting"`)));
  await key(X, "Digit1", "1");
  ok("while the rod's panel is up the hand's keys do nothing: the rod is held still", (await hand(X)) === "rod" && (await X.evaluate(`window.__townFish?.phase() === "waiting"`)), await hand(X));

  console.log("a net, and an insect over my own doll");
  await X.evaluate(`${T}.grant("bugNet", 1)`);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`); await sleep(500);
  await until("the insects' own code has come", () => X.evaluate(`!!${B} && typeof ${T}.setBug === "function"`), 30000);
  const haunt = await X.evaluate(`(() => { const all = ${B}.haunts().filter((h) => h.place === "farm" && h.kind === "field"); return all[0] ?? null; })()`);
  await X.evaluate(`${T}.setBug(${haunt.id}, "ladybird")`);
  await warp(X, haunt.x, haunt.y);
  await until("the ladybird is about", () => X.evaluate(`${B}.poses().find((p) => p.id === ${haunt.id}) ?? null`), 10000, 100);
  // (stand on it: where it crawls now; then find a moment at which the point to tap is on my own doll)
  let at = null;
  for (let i = 0; i < 40 && !at; i++) {
    const p = await X.evaluate(`${B}.poses().find((q) => q.id === ${haunt.id}) ?? null`);
    if (!p) break;
    await X.evaluate(`${V}.warp(${Math.floor(p.aim.x)}, ${Math.floor(p.aim.y)})`); await sleep(450);
    const q = await X.evaluate(`(() => { const p = ${B}.poses().find((q) => q.id === ${haunt.id}); if (!p) return null; const s = ${B}.project(p.aim.x, p.aim.y), c = document.querySelector("canvas").getBoundingClientRect(); return s ? { x: s.x + c.left, y: s.y + c.top, who: ${V}.who(s.x, s.y), me: ${S}.me().id } : null; })()`);
    if (q && q.who === q.me) at = q;
  }
  ok("(the ladybird is under my own doll: a tap on it is a tap on me)", !!at, at);
  if (at) {
    await click(X, at.x, at.y);
    await until("the swing lands", async () => !(await X.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {});
    await sleep(600);
    const card = await X.evaluate(`[...document.querySelectorAll(".pop-in")].some((e) => e.innerText.includes("(คุณ)") && e.querySelector("img"))`);
    ok("with the net in my hand that tap is a swing: the ladybird is caught, and my own card is not opened", (await held(X, "ladybird")) === 1 && !card, { ladybirds: await held(X, "ladybird"), card });
  }
  { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/hand-stopped.png`).catch(() => {});
} finally { await X.close(); }

console.log("a phone");
const P = await browser("HandPhone", { width: 384, height: 730, dpr: 2, mobile: true });
try {
  await enter(P, "B");
  await P.evaluate(`(${T}.reset(), ${T}.forget())`); await sleep(600);
  await P.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1), ${T}.grant("can", 1), ${T}.grant("seedKangkong", 6))`);
  await until("the hand's button is there", () => P.evaluate(`!!document.querySelector('[data-town-hand="phone"] button')`), 20000);
  const row = await P.evaluate(`(() => { const b = document.querySelector('[data-town-hand="phone"] button').getBoundingClientRect(), c = document.querySelector('button[aria-label="แชท"]').getBoundingClientRect(); return { b: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], c: [Math.round(c.left), Math.round(c.top)] }; })()`);
  ok("one button, a thumb wide, in the row of the chat's button, and no row of things on the map", row.b[1] === row.c[1] && row.b[0] > row.c[0] && row.b[2] >= 44 && row.b[3] >= 44 && !(await P.evaluate(`!!document.querySelector('[data-town-hand="bar"]')`)), row);
  await P.evaluate(`document.querySelector('[data-town-hand="phone"] button').click()`); await sleep(400);
  const menu = await P.evaluate(`(() => { const m = document.querySelector('[data-town-hand="phone"] [role=menu]'); if (!m) return null; const r = m.getBoundingClientRect(); return { n: m.querySelectorAll("button").length, within: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, words: m.innerText.replace(/\\s+/g, " ") }; })()`);
  ok("a tap unfolds the things over it, by name, within the screen", !!menu && menu.n === 3 && menu.within && /จอบ/.test(menu.words) && /บัวรดน้ำ/.test(menu.words), menu);
  await P.shot(`${OUT}/hand-phone.png`);
  await P.evaluate(`document.querySelector('[data-town-hand="phone"] [role=menu] [data-hand-slot="1"]').click()`); await sleep(500);
  ok("a tap on one takes it in the hand and folds the rest away", (await hand(P)) === "can" && !(await P.evaluate(`!!document.querySelector('[data-town-hand="phone"] [role=menu]')`)), await hand(P));

  // A price's box can be emptied and typed anew (a member on a phone: "มันไม่ให้ลบออกหมด จะใส่ 1 5 แล้วลบ 1 ออกก็ไม่ได้"):
  // the stall held up, with worms to sell.
  console.log("a price's box");
  await P.evaluate(`${T}.grant("worm", 5)`);
  await P.evaluate(`document.querySelector('button[title="ท่าทาง"]').click()`); await sleep(300);
  await P.evaluate(`document.querySelector("[data-emote-sign]").click()`);
  await until("the sign's panel", () => P.evaluate(`!!window.__townSign && !!document.querySelector("[data-sign-panel]")`), 20000);
  await P.evaluate(`window.__townSign.form("shop", "ขาย หนอน", [{ kind: "sell", item: "worm", n: 3, price: 10 }])`);
  await until("the line's boxes", () => P.evaluate(`!!document.querySelector("[data-line-price]")`), 5000);
  const PRICE = `document.querySelector("[data-line-price]")`;
  const typeIn = async (text) => { await P.evaluate(`(() => { const el = ${PRICE}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`); await sleep(200); };
  await P.evaluate(`${PRICE}.focus()`); await sleep(200);
  const marked = await P.evaluate(`(() => { const el = ${PRICE}; return { value: el.value, from: el.selectionStart, to: el.selectionEnd, pad: el.inputMode }; })()`);
  ok("a tap into the box marks all of it (typing takes its place), and it asks for a number pad", marked.value === "10" && marked.from === 0 && marked.to === 2 && marked.pad === "numeric", marked);
  await typeIn("");
  ok("it can be emptied: it does not read 1 again by itself", (await P.evaluate(`${PRICE}.value`)) === "", await P.evaluate(`${PRICE}.value`));
  await typeIn("5");
  ok("…and typed anew: 5, not 15", (await P.evaluate(`${PRICE}.value`)) === "5");
  await typeIn("999999");
  const cap = await P.evaluate(`${PRICE}.max`);
  ok("over its most it reads as the most, as before", Number(cap) > 5 && (await P.evaluate(`${PRICE}.value`)) === cap, { cap, value: await P.evaluate(`${PRICE}.value`) });
  await typeIn("7"); await typeIn("");
  await P.evaluate(`${PRICE}.blur()`); await sleep(250);
  ok("left empty, it reads the last number typed again", (await P.evaluate(`${PRICE}.value`)) === "7", await P.evaluate(`${PRICE}.value`));
  await P.shot(`${OUT}/hand-price-phone.png`);
  { const thrown = P.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await P.shot(`${OUT}/hand-phone-stopped.png`).catch(() => {});
} finally { await P.close(); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
