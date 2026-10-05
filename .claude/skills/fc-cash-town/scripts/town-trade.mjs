// Cash Town's trade, tried in a real browser on the dev test room (the trial kept in the browser, `next dev` only):
// the banker changes popoto into Popoto coins up to the week's limit; the uncle sells from his stall into a bag of
// ten slots, takes things to be sold, and pays for them only after the next round, when the money is collected;
// the bag on the map shows the coins. Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-trade.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };

const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`, TALK = `document.querySelector('[aria-labelledby="town-talk-h"]')`;
/** Press the first button whose words begin so, in the talk or the trade's panel (or anywhere). */
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
const purse = (X) => X.evaluate(`window.__townTrade.purse()`);
const click = async (X, x, y) => { for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
const enter = async (X) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
/** Tap a shopkeeper on the map, and go through what they say until there is something to choose. */
async function talkTo(X, who) {
  await X.evaluate(`window.__townView.lookAt(46, 27.2)`);
  await sleep(900);
  const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
  const k = (await X.evaluate(`window.__townView.keepers()`)).find((b) => b.id === who);
  await click(X, r.x + (k.x0 + k.x1) / 2, r.y + (k.y0 + k.y1) / 2);
  await until("the talk opens", () => X.evaluate(`!!${TALK}`), 4000);
  for (let i = 0; i < 8 && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)); i++) { await enter(X); await sleep(160); }
  return X.evaluate(`${TALK}?.innerText.replace(/\\s+/g, " ") ?? ""`);
}

for (const [label, size] of [["wide", { width: 1280, height: 860 }], ["phone", { width: 390, height: 780, dpr: 2, mobile: true }]]) {
  const X = await browser("T" + label, size);
  try {
    await X.goto(`${BASE}/town?townTest=T${label === "wide" ? "" : "p"}&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!window.__townTrade`), 20000);
    await X.evaluate(`window.__townTrade.reset()`);
    await sleep(600);
    console.log(label);
    const fresh = await purse(X);
    ok("a new purse: no coins, ten empty slots, popoto to change", fresh.coins === 0 && fresh.bag.length === 10 && fresh.bag.every((s) => !s) && fresh.popoto.profile > 20, fresh);

    // the banker: all the week allows, at five coins a popoto
    const asks = await talkTo(X, "banker");
    ok("the banker greets, asks, and offers the exchange", /แลก popoto/.test(asks) && /คุยเล่น/.test(asks) && !/ยังไม่เปิด/.test(asks), asks);
    await X.shot(`${OUT}/trade-${label}-banker-asks.png`);
    await enter(X);   // the first choice has the keyboard
    await until("the bank opens", () => X.evaluate(`!!${TRADE}`), 4000);
    ok("Enter takes the first choice: the bank's panel opens and the talk closes", await X.evaluate(`${TRADE}.innerText.includes("ธนาคาร Popoto") && !${TALK}`));
    await press(X, "มากสุด", TRADE); await sleep(120);
    await press(X, "แลก", TRADE); await sleep(250);
    let p = await purse(X);
    ok("twenty popoto become a hundred coins, and the popoto are gone", p.coins === 100 && p.popoto.profile === fresh.popoto.profile - 20, p);
    ok("…and the week's limit is used up: the button is off, and it says why", await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => b.innerText.trim() === "แลก").disabled && /สัปดาห์นี้แลกครบแล้ว|แลกได้อีก 0/.test(${TRADE}.innerText)`));
    await X.shot(`${OUT}/trade-${label}-bank.png`);
    await press(X, "ปิด", TRADE); await sleep(200);

    // the uncle: buy a rod and five worms
    const uncle = await talkTo(X, "uncle");
    ok("the uncle greets, asks, and offers buying and selling", /ซื้อของ/.test(uncle) && /ฝากขาย/.test(uncle), uncle);
    await press(X, "ซื้อของ", TALK);
    await until("the stall opens", () => X.evaluate(`!!${TRADE}`), 4000);
    await sleep(200);
    // (the shelf is laid out by kind: tools first)
    const kinds = await X.evaluate(`[...${TRADE}.querySelectorAll('[role="tablist"] [role="tab"]')].map((b) => b.innerText.trim())`);
    // when the relatives come next, and how long until then (the owner, 2026-10-04: "ช่วยทำให้ขึ้นเวลาด้วยว่า รอบต่อไปที่เงินจะเข้า
    // เหลือเวลาอีกเท่าไหร่ เห็นทุกคนได้เลย")
    const round = () => X.evaluate(`(() => { const p = document.querySelector("[data-next-round]"); return p ? { at: Number(p.dataset.nextRound), text: p.innerText.replace(/\\s+/g, " ").trim() } : null; })()`);
    const first = await round();
    ok("the stall says when the relatives come next, and how long until then", !!first && /รอบถัดไป/.test(first.text) && /(07|19):00 น\./.test(first.text) && /อีก \d/.test(first.text) && !/จะได้/.test(first.text), first);
    ok("the shelf is laid out by kind, tools first", ["เครื่องมือ", "เหยื่อ", "ของครัว", "เมล็ดพันธุ์"].every((k) => kinds.includes(k)) && !(await X.evaluate(`${TRADE}.innerText.includes("ไส้เดือน")`)), kinds);
    ok("only the basic things are on it at first: no better rod yet", (await X.evaluate(`${TRADE}.innerText.includes("คันเบ็ดไม้ไผ่")`)) && !(await X.evaluate(`${TRADE}.innerText.includes("คันเบ็ดไม้สัก")`))
      && (await X.evaluate(`window.__townTrade.shelf().length`)) === 23);
    // (twenty-one, and the scroll of the cure for pests: the owner, 2026-10-04; and a net for insects, 2026-10-05)
    const tab = (name) => X.evaluate(`[...${TRADE}.querySelectorAll('[role="tablist"] [role="tab"]')].find((b) => b.innerText.trim() === ${JSON.stringify(name)})?.click()`);
    await tab("สูตรและคำใบ้"); await sleep(250);
    const scrolls = await X.evaluate(`[...${TRADE}.querySelectorAll("li")].map((li) => li.innerText.replace(/\\s+/g, " ").trim())`);
    ok("…and the scroll of how the cure for pests is made is one of them, at forty coins", (await X.evaluate(`window.__townTrade.shelf().includes("scrollPestCure")`)) && scrolls.some((s) => /ม้วนสูตร ยาไล่แมลง/.test(s) && /40/.test(s)), scrolls);
    await X.shot(`${OUT}/trade-${label}-scrolls.png`);
    await tab("เครื่องมือ"); await sleep(250);
    await X.evaluate(`[...${TRADE}.querySelectorAll("li")].find((li) => li.innerText.includes("คันเบ็ดไม้ไผ่")).querySelector("button:last-of-type").click()`);
    await sleep(150);
    await press(X, "เหยื่อ", TRADE); await sleep(200);
    await X.evaluate(`[...${TRADE}.querySelectorAll("li")].find((li) => li.innerText.includes("ไส้เดือน")).querySelector("button").click()`);   // ×5
    await sleep(250);
    await press(X, "เครื่องมือ", TRADE); await sleep(200);
    p = await purse(X);
    ok("a rod and five worms: thirty coins left, two slots taken", p.coins === 30 && p.bag.filter(Boolean).length === 2 && p.bag[0].item === "rod" && p.bag[1].n === 5, p);
    const rodRow = await X.evaluate(`[...${TRADE}.querySelectorAll("li")].find((li) => li.innerText.includes("คันเบ็ดไม้ไผ่")).innerText.replace(/\\s+/g, " ")`);
    ok("the rod can be bought once a round: its row says so and its button is off", /ซื้อครบ/.test(rodRow) && await X.evaluate(`[...${TRADE}.querySelectorAll("li")].find((li) => li.innerText.includes("คันเบ็ดไม้ไผ่")).querySelector("button:last-of-type").disabled`), rodRow);
    await X.shot(`${OUT}/trade-${label}-buy.png`);

    // leave the worms to be sold: nothing is paid until the relatives have come
    await press(X, "ฝากขาย", TRADE); await sleep(200);
    await X.evaluate(`[...${TRADE}.querySelectorAll("li")].find((li) => li.innerText.includes("ไส้เดือน")).querySelector("button").click()`);   // all of them
    await sleep(250);
    p = await purse(X);
    ok("the worms are out of the bag and with the uncle, and no coin has come", p.coins === 30 && p.bag.filter(Boolean).length === 1 && p.left.length === 1 && p.left[0].n === 5, p);
    ok("…and nothing can be collected yet", await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => b.innerText.trim() === "รับเงิน").disabled`));
    const left = await round();
    ok("…the stall says when the money comes, and how much: five worms at a coin each", !!left && /เงินเข้ารอบถัดไป/.test(left.text) && /อีก \d/.test(left.text) && /จะได้ 5/.test(left.text) && left.at === first.at, left);
    await X.shot(`${OUT}/trade-${label}-left.png`);
    await press(X, "ข้ามไปรอบถัดไป", TRADE); await sleep(1300);
    ok("after the next round the money is waiting", await X.evaluate(`!${"[...document.querySelectorAll('button')]"}.find((b) => b.innerText.trim() === "รับเงิน").disabled`));
    const next = await round();
    ok("…and the stall counts down to the round after: half a day on, with nothing more to come", !!next && next.at === first.at + 12 * 3600000 && !/จะได้/.test(next.text) && /อีก (11|12) ชม\./.test(next.text), next);
    await press(X, "ปิด", TRADE); await sleep(250);
    const paid = await talkTo(X, "uncle");
    ok("the uncle says the money has come, and offers it first", /เงินค่าของ/.test(paid) && /รับเงิน\s*5/.test(paid), paid);
    await X.shot(`${OUT}/trade-${label}-uncle-paid.png`);
    await enter(X);
    await until("the stall opens at what was left", () => X.evaluate(`!!${TRADE}`), 4000);
    await sleep(200);
    await press(X, "รับเงิน", TRADE); await sleep(250);
    p = await purse(X);
    ok("collected: five worms at a coin each", p.coins === 35 && p.left.length === 0, p);
    await X.shot(`${OUT}/trade-${label}-collected.png`);
    await press(X, "ปิด", TRADE); await sleep(250);

    // the bag on the map
    const hud = await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า")?.innerText.replace(/\\s+/g, " ").trim() ?? null`);
    ok("the bag's button on the map shows the coins", hud !== null && /35/.test(hud), hud);
    await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
    await sleep(300);
    ok("…and opens the bag", await X.evaluate(`!!${TRADE} && ${TRADE}.innerText.includes("กระเป๋าของฉัน")`));
    await X.shot(`${OUT}/trade-${label}-bag.png`);
    await press(X, "ปิด", TRADE); await sleep(200);

    // the uncle's order: three things a day, from the whole village; filled, it opens one more thing on his shelf
    const WANT = `document.querySelector('section[aria-label="ของที่ลุงอยากได้วันนี้"]')`;
    const order = await X.evaluate(`window.__townTrade.order()`);
    await talkTo(X, "uncle");
    await press(X, "ฝากขาย", TALK);
    await until("the stall opens at selling", () => X.evaluate(`!!${TRADE} && !!${WANT}`), 4000);
    ok("the uncle wants three things today, none of them brought yet", order.wants.length === 3 && order.wants.every((w) => w.got === 0) && order.opens === "seedGarlic"
      && (await X.evaluate(`${WANT}.querySelectorAll("li").length`)) === 3 && (await X.evaluate(`[...${WANT}.querySelectorAll("button")].every((b) => b.disabled)`)), order);
    await X.shot(`${OUT}/trade-${label}-order.png`);
    await X.evaluate(`window.__townTrade.resize(10)`);
    const coins = (await purse(X)).coins;
    for (const w of order.wants) {
      await X.evaluate(`window.__townTrade.grant(${JSON.stringify(w.item)}, ${w.n})`);
      await sleep(250);
      await X.evaluate(`[...${WANT}.querySelectorAll("button")].find((b) => !b.disabled).click()`);
      await sleep(300);
    }
    p = await purse(X);
    const after = await X.evaluate(`window.__townTrade.order()`);
    ok("bringing them is paid on the spot, and the things leave the bag", p.coins > coins && order.wants.every((w) => !p.bag.some((b) => b?.item === w.item)), { coins, now: p.coins });
    ok("the order filled puts one more thing on his shelf, and he says which", after.filled === true && after.opens === null && (await X.evaluate(`window.__townTrade.shelf()`)).includes("seedGarlic")
      && /ลุงมีของใหม่มาขาย: กลีบกระเทียม/.test(await X.evaluate(`${TRADE}.innerText`)), after);
    await press(X, "ซื้อของ", TRADE); await sleep(200);
    await press(X, "เมล็ดพันธุ์", TRADE); await sleep(200);
    ok("…and it is there to buy", await X.evaluate(`${TRADE}.innerText.includes("กลีบกระเทียม")`));

    // the uncle's hints come by chance (the owner, 2026-10-05: "ช่วยทำให้ คำใบ้จากลุงขายของ สุ่มด้วยครับ ตอนนี้เหมือนเรียง 1 23 4")
    await tab("สูตรและคำใบ้"); await sleep(250);
    const CARD = `${TRADE}.querySelector("[data-uncle-hint]")`;
    const card = () => X.evaluate(`(() => { const c = ${CARD}; return c ? { price: c.dataset.uncleHint, off: c.querySelector("button").disabled, text: c.innerText.replace(/\\s+/g, " ").trim(), heard: c.querySelectorAll("li").length } : null; })()`);
    const buyHint = async (n) => { await X.evaluate(`${CARD}.querySelector("button").click()`); await until(`hint ${n} is kept`, async () => ((await purse(X)).hints ?? []).length === n, 4000); await sleep(120); };
    await X.evaluate(`window.__townTrade.grant("rice", 0, 400)`);
    await sleep(250);
    const may = await X.evaluate(`window.__townTrade.hintsLeft()`), had = (await purse(X)).coins;
    let c = await card();
    ok("his hint says what it costs before it is bought, and not which it will be", !!c && c.price === "15" && !c.off && /คำใบ้ของลุง/.test(c.text) && /15/.test(c.text) && c.heard === 0 && may.length > 20, { c, may: may.length });
    // (for the check, the number of chance is said: nothing is the first he may sell, nearly 1 the last)
    await X.evaluate(`window.__townTrade.setHintChance(0)`);
    await buyHint(1);
    await X.evaluate(`window.__townTrade.setHintChance(0.999999)`);
    await buyHint(2);
    p = await purse(X);
    c = await card();
    ok("a number of chance says which: nothing the first he may sell, nearly one the last; each written under the button", p.hints[0] === may[0] && p.hints[1] === may[may.length - 1] && c.heard === 2 && p.coins === had - 30, { hints: p.hints, first: may[0], last: may[may.length - 1], c });
    // left to chance, as a member's are
    await X.evaluate(`window.__townTrade.setHintChance(null)`);
    for (let n = 3; n <= 8; n++) await buyHint(n);
    p = await purse(X);
    c = await card();
    const six = p.hints.slice(2), rest = may.slice(1, -1);
    ok("six more by chance: six different ones of those he may sell, fifteen coins each", new Set(p.hints).size === 8 && six.every((id) => rest.includes(id)) && p.coins === had - 8 * 15 && c.heard === 8 && c.price === "15", { six, coins: p.coins, c });
    ok("…and not the next six on his list, in their order", six.join() !== rest.slice(0, 6).join(), { six, listed: rest.slice(0, 6) });
    await X.shot(`${OUT}/trade-${label}-hints.png`);
    await press(X, "ปิด", TRADE); await sleep(200);

    // a chat, when that is what one stops for
    await talkTo(X, "banker");
    await press(X, "คุยเล่น", TALK); await sleep(300);
    const chat = await X.evaluate(`${TALK}?.innerText.replace(/\\s+/g, " ") ?? ""`);
    ok("a chat is the banker's next conversation, with nothing to choose after it", /ครับ/.test(chat) && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)), chat);
    for (let i = 0; i < 10 && await X.evaluate(`!!${TALK}`); i++) { await enter(X); await sleep(160); }
    ok("…and it closes at its end", !(await X.evaluate(`!!${TALK}`)));
    ok("no page errors", X.logs.length === 0, X.logs);
  } catch (e) { ok(`${label}: the run`, false, e.message); } finally { X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
