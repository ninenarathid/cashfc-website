// Several pots of food in one bag (a member, 2026-10-07: "พอคร๊าฟอาหารเสร็จ set down for company … ทำไมมันถึงดรอปอาหาร
// อันอื่นที่อยู่ในกระเป๋า ไม่ใช่อันที่เพิ่งคร๊าฟ", and "เวลาลงหม้ออาหาร ทำไมต้องถือพร้อมกันสามอัน"), in a real browser on the
// dev test room, at a wide screen and a phone's. Three pots are cooked, two of them of one dish. From the card of the
// third, "set the pot down for company" sets that pot down and no other, and "ladle one and eat" would ladle from
// it. In the bag, a pot taken up is the only one marked as held, and another can be taken up in its place; on the
// map, the offer names the dish of the pot in the hand and sets that one down.
//
//   node town-pots.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes pots-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", C = "window.__townCook", G = "window.__townGame", KEEPER = "window.__townKeeper", K = `document.querySelector("[data-town-kitchen]")`;
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]], MINNOW = [["minnow", 3], ["salt", 1]];
const NAME = { tomYum: "ต้มยำปลาช่อน", friedMinnow: "ปลาซิวทอด" };
const tap = async (X, what) => { await X.evaluate(`${K}.querySelector('${what}').click()`); await sleep(260); };
const purse = (X) => X.evaluate(`${T}.purse()`);
/** The pots of food in the bag: each by its slot, its dish and its helpings. */
const potsIn = async (X) => (await purse(X)).bag.flatMap((s, i) => (s?.item === "potFull" && s.of ? [{ slot: i, dish: s.of.dish, left: s.of.left }] : []));
const onGround = (X) => X.evaluate(`${C}.pots().map((p) => ({ dish: p.dish, left: p.left }))`);
const came = (X) => X.evaluate(`${K}?.querySelector("[data-kitchen-came]")?.dataset.kitchenCame ?? null`);
/** The slots of the bag's panel that are marked as held. */
const marked = (X) => X.evaluate(`[...${TRADE}.querySelectorAll('ul[aria-label="กระเป๋า"] > li')].flatMap((li, i) => (li.querySelector("[data-bag-held]") ? [i] : []))`);
const pick = async (X, slot) => { await X.evaluate(`${TRADE}.querySelector('ul[aria-label="กระเป๋า"] > li:nth-child(${slot + 1}) button').click()`); await sleep(300); };
/** The button that takes up the thing looked at, or puts it away: what it says, and a press of it. */
const holdWord = (X) => X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => ["ถือ", "เก็บ"].includes(b.innerText.trim()))?.innerText.trim() ?? null`);
const pressHold = async (X) => { await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => ["ถือ", "เก็บ"].includes(b.innerText.trim())).click()`); await sleep(500); };
const offerDown = (X) => X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith("วางหม้อ") && !b.closest("[data-town-kitchen]"))?.innerText.replace(/\\s*Space\\s*$/i, "").trim() ?? null`);
const cookIt = async (X, things, tool) => {
  await tap(X, `[data-kitchen-tool="${tool}"]`);
  await X.evaluate(`${C}.put(${JSON.stringify(things)})`);
  await sleep(300);
  await tap(X, "[data-kitchen-go]");
  await until("the game is laid", () => X.evaluate(`!!${G}`), 5000);
  await X.evaluate(`${G}.drive(0.9)`);
  await until("the go is over", async () => (await came(X)) != null, 40000);
  await sleep(300);
};

async function run(label, size) {
  console.log(`\n── ${label} ──`);
  const X = await browser(`Pots-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=P&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
    await sleep(500);
    await X.evaluate(`${T}.resize(20)`);
    // (the cookware first, so that each pot of food comes into the first slot its own things leave free: one after the other)
    const grant = (list) => X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify(list)}) ${T}.grant(id, n); ${T}.setStamina(100); })()`);
    await grant([["pot", 1], ["pan", 1], ["bowl", 2]]);
    const stove = (await X.evaluate(`${C}.places()`)).find((p) => p.kind === "stove").at;
    const toStove = async () => {
      await X.evaluate(`window.__townView.warp(${stove[0]}, ${stove[1]})`);
      await until("cooking is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook"), 8000);
      await X.evaluate(`${C}.act("cook")`);
      await until("the table is laid", () => X.evaluate(`!!${K}`), 5000);
      await sleep(600);
    };
    await toStove();

    // ── three pots, two of one dish; the card of the third ──
    await grant(TOMYUM);
    await cookIt(X, TOMYUM, "pot");
    await tap(X, "[data-kitchen-again]");
    await grant(MINNOW);
    await cookIt(X, MINNOW, "pan");
    await tap(X, "[data-kitchen-again]");
    // (a helping out of the first pot, so that the two pots of one dish can be told apart by what is left in them)
    const firstPot = (await potsIn(X))[0];
    await X.evaluate(`${T}.serve(${firstPot.slot})`);
    await grant(TOMYUM);
    await cookIt(X, TOMYUM, "pot");
    let pots = await potsIn(X);
    const fresh = pots.at(-1), older = pots.slice(0, -1);
    ok("three pots of food in the bag, two of one dish, and the one just cooked is not the first of them",
      pots.length === 3 && fresh.dish === "tomYum" && older[0].dish === "tomYum" && older[1].dish === "friedMinnow" && older[0].left !== fresh.left && fresh.slot > older[0].slot && (await came(X)) === "found", pots);
    ok("the card is of the pot just cooked: its slot", (await X.evaluate(`${C}.result()?.slot`)) === fresh.slot, await X.evaluate(`${C}.result()`));
    await X.shot(`${OUT}/pots-card-${label}.png`);
    await tap(X, "[data-kitchen-down]");
    await until("the table is put away", () => X.evaluate(`!${K}`), 5000);
    await sleep(400);
    let ground = await onGround(X);
    ok("\"set the pot down for company\" sets down the pot just cooked: its dish, with every helping it came with", ground.length === 1 && ground[0].dish === fresh.dish && ground[0].left === fresh.left, ground);
    ok("…and the two older pots are still in the bag, where they were", JSON.stringify(await potsIn(X)) === JSON.stringify(older), await potsIn(X));
    await X.shot(`${OUT}/pots-down-${label}.png`);
    // (taken up again: three in the bag once more)
    // (set down in the yard, a dish is on the feast table: it is taken back from the table, as its panel takes one)
    await until("the pot is on the feast table", async () => (await X.evaluate(`${C}.feast().pots.length`)) === 1, 5000);
    await X.evaluate(`${C}.feastDo("take", ${C}.feast().pots[0])`);
    await until("it is in the bag again", async () => (await potsIn(X)).length === 3, 5000);
    pots = await potsIn(X);

    // ── the bag: one pot is held, not three ──
    await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
    await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 4000);
    await sleep(500);
    const [p0, p1, p2] = pots;
    // (the hand still has the cookware the last pot was cooked in)
    ok("before any of them is taken up, no pot of food is marked as held", !(await marked(X)).some((i) => pots.some((p) => p.slot === i)), await marked(X));
    await pick(X, p1.slot);
    ok("a pot looked at can be taken up", (await holdWord(X)) === "ถือ", await holdWord(X));
    await pressHold(X);
    ok("taken up: that pot is marked as held, and neither of the other two", JSON.stringify(await marked(X)) === JSON.stringify([p1.slot]) && (await purse(X)).hand === "potFull", { marked: await marked(X), pots });
    ok("…and its button now puts it away", (await holdWord(X)) === "เก็บ", await holdWord(X));
    await X.evaluate(`${TRADE}.querySelector('ul[aria-label="กระเป๋า"]').scrollIntoView({ block: "center" })`);
    await sleep(250);
    await X.shot(`${OUT}/pots-bag-${label}.png`);
    await pick(X, p2.slot);
    ok("another pot looked at is not the one held: it can be taken up in its place", (await holdWord(X)) === "ถือ", await holdWord(X));
    await pressHold(X);
    ok("taken up in its place: the mark is on it alone", JSON.stringify(await marked(X)) === JSON.stringify([p2.slot]), await marked(X));
    // (a thing that is not a pot is held as ever: marked wherever the bag has it)
    const pan = (await purse(X)).bag.findIndex((s) => s?.item === "pan");
    await pick(X, pan);
    await pressHold(X);
    ok("a thing that is no pot of food is held as ever, and no pot is marked then", JSON.stringify(await marked(X)) === JSON.stringify([pan]) && (await purse(X)).hand === "pan", await marked(X));
    await pick(X, p2.slot);
    await pressHold(X);
    ok("the pot taken up again: marked alone", JSON.stringify(await marked(X)) === JSON.stringify([p2.slot]), await marked(X));
    await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => b.innerText.trim() === "ปิด").click()`);
    await until("the bag is put away", () => X.evaluate(`!${TRADE}`), 4000);

    // ── the map: the offer names the pot in the hand, and sets that one down ──
    const home = await X.evaluate(`window.__townView.self()`);
    await X.evaluate(`window.__townView.warp(${Math.floor(home.x) + 6}, ${Math.floor(home.y) + 6})`);
    await until("setting a pot down is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("down"), 8000);
    await sleep(400);
    let word = await offerDown(X);
    ok("on the map the offer names the dish of the pot in the hand", !!word && word !== "วางหม้อ" && word.includes(NAME[p2.dish]), word);
    await X.shot(`${OUT}/pots-offer-${label}.png`);
    await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith("วางหม้อ") && !b.closest("[data-town-kitchen]")).click()`);
    await until("a pot stands on the ground", async () => (await onGround(X)).length === 1, 5000);
    ground = await onGround(X);
    ok("…and sets that pot down: the one taken up, not the first of the bag", ground[0].dish === p2.dish && ground[0].left === p2.left && JSON.stringify(await potsIn(X)) === JSON.stringify([p0, p1]), { ground, bag: await potsIn(X) });
    // (the slot it was in is empty: the hand is on the first pot there is, and the offer says so)
    await X.evaluate(`window.__townView.warp(${Math.floor(home.x) + 12}, ${Math.floor(home.y) + 6})`);
    await until("setting a pot down is offered again", async () => (await X.evaluate(`${C}.offers()`)).includes("down"), 8000);
    await sleep(400);
    word = await offerDown(X);
    ok("with that one gone the hand is on the first pot there is, and the offer names it", (await X.evaluate(`${KEEPER}.handSlot()`)) === p0.slot && !!word && word.includes(NAME[p0.dish]), { word, slot: await X.evaluate(`${KEEPER}.handSlot()`) });
    ok("nothing was thrown on the page", X.errors.length === 0, X.errors);
  } finally { X.close(); }
}

await run("wide", { width: 1280, height: 860 });
await run("phone", { width: 390, height: 844, mobile: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
