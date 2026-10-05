// Cash Town's moving price, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), wide and on a phone:
//
// - a thing whose price moves says what one fetches this round where things are left to be sold, with a small line
//   that opens its graph; a thing with one price (a bait) says what it always said;
// - a village's worth and more of a vegetable left in one round, and the next round's price is lower: the row says by
//   how much, and a lot left then is worth that price, whatever the price does afterwards;
// - nothing left for some rounds, and the price climbs back, past the usual one, to the most it is ever;
// - the graph has the rounds gone by, the round we are in at its end, what the village left under it, a readout that
//   follows the pointer and the arrow keys, and the same numbers as a table;
// - nothing is wider than its panel.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-price.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };

const T = "window.__townTrade";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`, TALK = `document.querySelector('[aria-labelledby="town-talk-h"]')`;
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
const purse = (X) => X.evaluate(`${T}.purse()`);
const prices = (X) => X.evaluate(`${T}.prices()`);
const click = async (X, x, y) => { for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
const enter = async (X) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
const arrow = async (X, key) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key, code: key, windowsVirtualKeyCode: key === "ArrowLeft" ? 37 : 39 }); };
/** Tap the uncle on the map, and go through what he says until there is something to choose. */
async function talkToUncle(X) {
  await X.evaluate(`window.__townView.lookAt(46, 27.2)`);
  await sleep(900);
  const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
  const k = (await X.evaluate(`window.__townView.keepers()`)).find((b) => b.id === "uncle");
  await click(X, r.x + (k.x0 + k.x1) / 2, r.y + (k.y0 + k.y1) / 2);
  await until("the talk opens", () => X.evaluate(`!!${TALK}`), 4000);
  for (let i = 0; i < 8 && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)); i++) { await enter(X); await sleep(160); }
}
/** The row of a thing in the bag, where things are left to be sold: its words, its price as the page was told it, and whether it has a graph to open. */
const row = (X, name) => X.evaluate(`(() => {
  const li = [...${TRADE}.querySelectorAll("li")].find((x) => !x.dataset.lot && x.innerText.includes(${JSON.stringify(name)}) && /ฝาก 1/.test(x.innerText));
  if (!li) return null;
  const p = li.querySelector("[data-price]"), d = li.querySelector("[data-price-delta]");
  return { text: li.innerText.replace(/\\s+/g, " ").trim(), f: p ? Number(p.dataset.priceF) : null, delta: d ? Number(d.dataset.priceDelta) : null, graph: !!li.querySelector("button[data-price-graph]") };
})()`);
/** Leave everything of a thing: every stack of it in the bag, one after another (a stack is twenty). */
async function leaveAll(X, name) {
  for (let i = 0; i < 12; i++) {
    const did = await X.evaluate(`(() => {
      const li = [...${TRADE}.querySelectorAll("li")].find((x) => !x.dataset.lot && x.innerText.includes(${JSON.stringify(name)}) && /ฝาก 1/.test(x.innerText));
      const b = li && [...li.querySelectorAll("button")].find((x) => ["ทั้งหมด", "ฝาก 1"].includes(x.innerText.trim()));
      if (!b) return false; b.click(); return true; })()`);
    if (!did) return;
    await sleep(220);
  }
}
const lots = (X) => X.evaluate(`[...${TRADE}.querySelectorAll("li[data-lot]")].map((li) => li.innerText.replace(/\\s+/g, " ").trim())`);
const GRAPH = `${TRADE}.querySelector("[data-price-graph-of]")`;
const readout = (X) => X.evaluate(`${GRAPH}?.querySelector("[data-price-readout]")?.innerText.replace(/\\s+/g, " ").trim() ?? null`);

for (const [label, size] of [["wide", { width: 1280, height: 860 }], ["phone", { width: 390, height: 780, dpr: 2, mobile: true }]]) {
  const X = await browser("P" + label, size);
  try {
    await X.goto(`${BASE}/town?townTest=P${label === "wide" ? "" : "p"}&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await X.evaluate(`${T}.reset()`);
    await sleep(600);
    console.log(label);

    // a vegetable and a bait in the bag; the stall, at selling
    await X.evaluate(`(${T}.grant("kangkong", 160), ${T}.grant("worm", 5))`);
    await talkToUncle(X);
    await press(X, "ฝากขาย", TALK);
    await until("the stall opens at selling", () => X.evaluate(`!!${TRADE} && /ฝากขายจากกระเป๋า/.test(${TRADE}.innerText)`), 5000);
    await sleep(300);
    let veg = await row(X, "ผักบุ้ง"), bait = await row(X, "ไส้เดือน");
    ok("a vegetable says what one fetches this round, the usual three coins, and has a graph to open", !!veg && veg.f === 100 && veg.delta === null && veg.graph && /ได้ชิ้นละ 3\b/.test(veg.text), veg);
    ok("a bait has one price, said as it always was, and no graph", !!bait && bait.f === null && !bait.graph && /ได้ชิ้นละ 1\b/.test(bait.text), bait);
    const first = await prices(X);
    ok("…and the page is told a price only of what moves: the vegetable, not the bait", !!first.things.kangkong && !first.things.worm && first.things.kangkong.f === 100 && first.things.kangkong.was.length === 0, first);

    // more than a village's worth of it, left in one round
    await leaveAll(X, "ผักบุ้ง");
    let p = await purse(X), left = await lots(X);
    ok("a hundred and sixty left at the usual price: four hundred and eighty coins to come", p.left.reduce((t, l) => t + l.n, 0) === 160 && p.left.every((l) => l.f === undefined) && left.some((l) => /ผักบุ้ง/.test(l) && /480/.test(l)) && !left.some((l) => /[▲▼]/.test(l)), [p.left, left]);
    await press(X, "ข้ามไปรอบถัดไป", TRADE); await sleep(1300);
    await press(X, "รับเงิน", TRADE); await sleep(300);
    p = await purse(X);
    ok("the relatives pay the price it was left at", p.coins === 480 && p.left.length === 0, p);

    // the round after: the price has fallen
    await X.evaluate(`${T}.grant("kangkong", 21)`);
    await sleep(400);
    veg = await row(X, "ผักบุ้ง");
    ok("a round on, one fetches less: 83 hundredths of three coins, and the row says how far under usual", !!veg && veg.f === 83 && veg.delta === -17 && /ได้ชิ้นละ 2\.49/.test(veg.text) && /▼\s*17%/.test(veg.text), veg);
    await X.evaluate(`${TRADE}.querySelector('button[data-price-graph="kangkong"]').click()`);
    await until("the graph opens", () => X.evaluate(`!!${GRAPH}`), 3000);
    await sleep(200);
    const table = () => X.evaluate(`[...${GRAPH}.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map((c) => c.textContent.trim()))`);
    let rows = await table();
    ok("the graph says this round's price, and its table has this round and the one that ended: 160 left at the usual price", /รอบนี้/.test(await readout(X)) && /2\.49/.test(await readout(X))
      && rows.length === 2 && rows[0][0] === "รอบนี้" && rows[0][1] === "2.49" && rows[0][2] === "83%" && rows[1][1] === "3" && rows[1][2] === "100%" && rows[1][3] === "160", [await readout(X), rows]);
    await X.evaluate(`${GRAPH}.scrollIntoView({ block: "center" })`); await sleep(200);
    await X.shot(`${OUT}/price-${label}-fallen.png`);

    // a lot left now keeps this round's price
    await leaveAll(X, "ผักบุ้ง");
    p = await purse(X); left = await lots(X);
    const coming = await X.evaluate(`document.querySelector("[data-next-round]").innerText.replace(/\\s+/g, " ")`);
    ok("twenty-one left at 83 hundredths: fifty-two coins to come, the odd part lost, and the lot says how far under usual it was left", p.left.length === 1 && p.left[0].f === 83 && p.left[0].n === 21
      && left.some((l) => /ผักบุ้ง/.test(l) && /▼\s*17%/.test(l) && /\b52\b/.test(l)) && /จะได้ 52/.test(coming), [p.left, left, coming]);
    ok("…and what is left with the uncle still has its price told, for its lot", !!(await prices(X)).things.kangkong);
    await press(X, "ข้ามไปรอบถัดไป", TRADE); await sleep(1300);
    await press(X, "รับเงิน", TRADE); await sleep(300);
    p = await purse(X);
    ok("…and fifty-two is what the relatives pay", p.coins === 532, p.coins);

    // nothing left for some rounds: the price climbs back, a tenth of itself a round at the most, to the most it is ever
    for (let i = 0; i < 9; i++) { await X.evaluate(`${T}.skipRound()`); await sleep(120); await X.evaluate(`${T}.prices()`); }
    await X.evaluate(`${T}.grant("kangkong", 3)`);
    await sleep(500);
    veg = await row(X, "ผักบุ้ง");
    const told = (await prices(X)).things.kangkong;
    ok("left alone, the price climbs back past the usual one to the most it is ever, and the row says how far over", !!veg && veg.f === told.ceil && veg.f === 150 && veg.delta === 50 && /ได้ชิ้นละ 4\.5/.test(veg.text) && /▲\s*50%/.test(veg.text), [veg, told]);
    const fs = told.was.map((w) => w[1]);
    ok("…never by more than a tenth of itself in a round, and never under the least it is", fs.every((f, i) => i === 0 || f <= Math.floor(fs[i - 1] * 1.1 + 0.5)) && fs.every((f) => f >= told.floor) && Math.min(...fs) < 100, fs);
    ok("…and the graph is of the last seven days at the most", told.was.length <= 14 && told.was.every((w, i) => i === 0 || w[0] === told.was[i - 1][0] + 1), told.was);

    await X.evaluate(`${TRADE}.querySelector('button[data-price-graph="kangkong"]').click()`);
    await until("the graph opens", () => X.evaluate(`!!${GRAPH}`), 3000);
    await sleep(250);
    rows = await table();
    ok("the table has every round the graph has, the newest first", rows.length === told.was.length + 1 && rows[0][0] === "รอบนี้" && rows[0][1] === "4.5" && rows[0][2] === "150%", rows.slice(0, 3));
    // the pointer finds a round: the readout says it, not this one
    await X.evaluate(`${GRAPH}.querySelector("svg").scrollIntoView({ block: "center" })`);
    await sleep(200);
    const at = await X.evaluate(`(() => { const r = ${GRAPH}.querySelector("svg").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
    await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x + at.w * 0.3, y: at.y + at.h * 0.4 });
    await sleep(200);
    const pointed = await readout(X);
    ok("the pointer finds a round gone by: the readout says which, what one fetched, and how many the village left", !/รอบนี้/.test(pointed) && /(เช้า|ค่ำ)/.test(pointed) && /ชิ้นทั้งหมู่บ้าน/.test(pointed), pointed);
    await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
    await sleep(200);
    ok("…and away from it, this round again", /รอบนี้/.test(await readout(X)) && /4\.5/.test(await readout(X)), await readout(X));
    // the arrow keys step through the rounds
    await X.evaluate(`${GRAPH}.querySelector('[role="group"]').focus()`);
    await arrow(X, "ArrowLeft"); await sleep(150);
    const stepped = await readout(X);
    await arrow(X, "ArrowRight"); await sleep(150);
    ok("the arrow keys step a round back and on again", !/รอบนี้/.test(stepped) && /(เช้า|ค่ำ)/.test(stepped) && /รอบนี้/.test(await readout(X)), [stepped, await readout(X)]);
    ok("nothing is wider than its panel", await X.evaluate(`(() => { const s = ${TRADE}.querySelector(".overflow-y-auto"); return s.scrollWidth <= s.clientWidth + 1 && ${GRAPH}.querySelector("svg").getBoundingClientRect().width <= s.clientWidth; })()`),
      await X.evaluate(`(() => { const s = ${TRADE}.querySelector(".overflow-y-auto"); return [s.scrollWidth, s.clientWidth, ${GRAPH}.querySelector("svg").getBoundingClientRect().width]; })()`));
    await X.shot(`${OUT}/price-${label}-risen.png`);
    await X.evaluate(`${T}.reset()`);
    ok("no page errors", X.logs.length === 0, X.logs);
  } catch (e) { ok(`${label}: the run`, false, e.message); await X.shot(`${OUT}/price-${label}-died.png`).catch(() => {}); } finally { X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
