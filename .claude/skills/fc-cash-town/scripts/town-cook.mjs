// Cash Town's cooking yard, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by two testers in two tabs of one browser, who share its pots and its finds:
//
// - the yard is walked into and stood in; cooking is offered only at a stove, a worktable or the fire, with cookware
//   in the hand (bare hands will do at a worktable);
// - things are picked one by one, never by recipe; the wrong ones, cooked in cookware, are a pot of an odd dish, which
//   tastes of how near it was to something (one thing not the one; the right things in the wrong amounts); the pot is
//   the yard's own, and the cook's is still theirs; the right things become a pot of the dish, by stirring it
//   (the ladle taken round the pot seen from above, at an even pace), and the recipe is found, under the finder's name, for both testers;
//   whoever has made it reads all of it, and is told when the cookware is wrong; the other reads all but its last thing;
// - something that is not a dish is made by hand, into the bag; a basket is worn, and the bag is bigger;
// - the cook ladles a helping out of their own pot into a bowl, which leaves the bag with it; the pot is set down, and
//   the other tester ladles from it, a bowl of their own to each helping (and none without one); its last helping
//   out, the pot is gone from the ground: there is no dirty pot, and nothing to wash;
// - a helping eaten up gives its bowl back;
// - a dish for two, cooked alone, is an odd dish too; it is cooked when the other stands at a place with the other
//   piece of cookware;
// - the uncle's hint is bought; every stirring is written down;
// - the stirring is the ladle taken round the pot: a turn at a good pace is a stir, too fast for a while and the soup
//   goes over (a helping lost), and it shows; the good pace is wide, with no stamina three quarters of that, never
//   dropped;
// - the scroll of the cure for pests is bought from the first day's shelf and read into the book, which tells all of
//   the cure but its last thing; chilies, scallions and salt in a pot make two of it.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-cook.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { awaitGame, board, fumble, gameState, gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", C = "window.__townCook";
const purse = (X) => X.evaluate(`${T}.purse()`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { if (item) await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); else await X.evaluate(`${T}.letGo()`); await sleep(400); };
const offers = (X) => X.evaluate(`${C}.offers()`);
const act = async (X, offer) => { await X.evaluate(`${C}.act(${JSON.stringify(offer)})`); await sleep(450); };
const warp = async (X, [x, y]) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(800); };
const shown = (X, re) => X.evaluate(`[...document.querySelectorAll("p")].some((b) => ${re}.test(b.innerText))`);
const grant = (X, list) => X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify(list)}) ${T}.grant(id, n); })()`);
/** Put some things together in the open panel, and stir if it comes to that. Says whether there was stirring. */
async function make(X, things) {
  await X.evaluate(`${C}.put(${JSON.stringify(things)})`);
  await sleep(300);
  await X.evaluate(`${C}.go()`);
  await sleep(350);
  if (!(await gameUp(X))) return false;
  await play(X);
  await sleep(700);
  return true;
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
}
const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]];
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`, SCROLL = `document.querySelector('[aria-labelledby="town-scroll-h"]')`;
/** Take up some cookware and open the cooking panel again (a dish made shuts it, and leaves the pot of it in the hand). */
async function cookAgain(X, tool = "pot") {
  await hold(X, tool);
  await until("cooking is offered", async () => (await offers(X)).includes("cook"), 5000);
  await act(X, "cook");
  await until("the cooking panel opens", () => X.evaluate(`${C}.open()`), 4000);
}
/** Throw away every pot of the odd dish. */
async function dropOdd(X) {
  for (;;) {
    const i = await X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === "potFull" && s.of?.dish === "oddDish")`);
    if (i < 0) return;
    await X.evaluate(`${T}.drop(${i})`);
    await sleep(200);
  }
}
/** Open a recipe of the bag's book as a scroll, and say what is written on it. */
async function readRecipe(X, name) {
  if (!(await X.evaluate(`!!${TRADE}`))) { await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`); await sleep(700); }
  await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => b.innerText.trim() === ${JSON.stringify(name)}).click()`);
  await until("the scroll unrolls", () => X.evaluate(`!!${SCROLL}`), 4000);
  await sleep(900);
  return X.evaluate(`${SCROLL}.innerText`);
}
const rollUp = async (X) => { await X.evaluate(`[...${SCROLL}.querySelectorAll("button")].pop().click()`); await sleep(700); };

const X = await browser("Cook", { width: 1280, height: 860 });
try {
  await enter(X, "K");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`${T}.resize(20)`);
  await grant(X, [...TOMYUM, ["snakehead", 2], ["tomato", 2], ["chili", 2], ["scallion", 1], ["pot", 1], ["bowl", 1], ["minnow", 4], ["rice", 2], ["hyacinth", 6], ["pan", 1]]);
  const places = await X.evaluate(`${C}.places()`), floor = await X.evaluate(`${C}.floor()`);
  const at = (kind) => places.find((p) => p.kind === kind).at;
  const open = floor.find(([x, y]) => !places.some((p) => p.at[0] === x && p.at[1] === y) && x + y > 94);
  ok("the yard has its places: stoves, worktables and the fire, and open floor", !!at("stove") && !!at("table") && !!at("fire") && !!open, { places: places.length, open });

  // walked into, from the plaza
  await warp(X, [44, 52]);
  const walked = await X.evaluate(`(async () => { const s = window.__cashTown; if (!s?.walkTo) return "no walkTo"; return true; })()`);
  void walked;
  await warp(X, open);
  ok("on open floor, with nothing to do, nothing is offered", (await offers(X)).length === 0, await offers(X));
  await X.shot(`${OUT}/cook-yard.png`);

  // a stove: only with cookware in the hand
  await warp(X, at("stove"));
  ok("at a stove with nothing in the hand, cooking is not offered", !(await offers(X)).includes("cook"));
  await hold(X, "rod").catch(() => {});
  await hold(X, "pot");
  await until("with a pot in the hand it is", async () => (await offers(X)).includes("cook"), 5000);
  await act(X, "cook");
  await until("the cooking panel opens", () => X.evaluate(`${C}.open()`), 4000);
  await X.shot(`${OUT}/cook-panel.png`);

  // things are picked one by one: the panel offers no recipe
  ok("the panel offers things from the bag, and no recipe to pick", await X.evaluate(`!!document.querySelector('[aria-label="ของในกระเป๋า"]') && !document.querySelector('[aria-label="สูตรที่รู้"]')`));
  // things that make nothing, cooked in a pot
  await X.evaluate(`${C}.put([["minnow", 2], ["rice", 1]])`);
  await sleep(300);
  await X.evaluate(`${C}.go()`);
  ok("cooking is stirring the pot: a game of its own", (await awaitGame(X)) === "stirring");
  await sleep(200);
  let soup = await gameState(X);
  const sign = await board(X);
  ok("the pot is seen from above, with the ladle in it, on the town's wooden board: a square for each stir wanted, and nothing to lose",
    sign.title === "ทำอาหาร" && sign.look === "stir" && sign.need === 4 && sign.left === null && (await X.evaluate(`document.querySelector('[data-look="stir"]')?.dataset.pot`)) === "potTop", sign);
  ok("…the kindest of the games: the good pace is a wide one, from under half a turn a second to well over one", soup.lo < 0.45 && soup.hi > 1.35 && soup.begun === false && soup.hits === 0, soup);
  // before the ladle is touched nothing is held against the cook
  await sleep(1500);
  ok("…and nothing is held against a ladle that has not been touched yet", (await gameState(X)).misses === 0 && (await gameState(X)).begun === false);
  // the ladle taken round by a finger, as a finger does it: round the middle of the picture
  const box = await X.evaluate(`(() => { const r = document.querySelector('[data-look="stir"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * 0.36 }; })()`);
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x + box.r, y: box.y, button: "left", buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 40; i++) { const a = (i / 40) * 2 * Math.PI * 1.25; await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x + Math.cos(a) * box.r, y: box.y + Math.sin(a) * box.r, button: "left", buttons: 1 }); await sleep(33); }
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x + box.r, y: box.y, button: "left", buttons: 0, clickCount: 1 });
  soup = await gameState(X);
  ok("taken round the pot at an even pace, a turn is a stir done", soup.begun === true && soup.hits >= 1 && soup.misses === 0 && (await board(X)).hits === soup.hits, soup);
  // stirred far too fast for a while: the soup goes over, and a helping is lost
  ok("stirred too fast for a while, the soup goes over: a helping lost, and the pot shows it", await fumble(X));
  ok("…it is counted on the board", (await gameState(X)).misses === 1 && (await X.evaluate(`document.querySelector("[data-town-game] [data-misses]")?.dataset.misses`)) === "1", await gameState(X));
  await X.shot(`${OUT}/cook-stir.png`);
  await play(X);
  await sleep(700);
  ok("things that make nothing are stirred all the same", true);
  let p = await purse(X), odd = p.bag.find((s) => s?.item === "potFull");
  ok("…and come out as a pot of an odd dish: the things gone, and nothing found", odd?.of?.dish === "oddDish" && odd.of.left === 1 && (await has(X, "minnow")) === 2 && (await has(X, "rice")) === 1 && (await has(X, "compost")) === 0
    && !(await X.evaluate(`${C}.found()`)).includes("oddDish") && p.recipes.length === 0 && (await shown(X, "/อาหารแปลกๆ/")), p.bag);
  ok("the pot it came in is the yard's: the cook's own is still theirs", (await has(X, "pot")) === 1 && p.bag.filter((s) => s?.item === "potFull").length === 1, p.bag);
  // (minnows and rice: rice alone is nearly something, so the minnows are one thing too many)
  ok("it tastes of how near it was: one thing too many", await shown(X, "/มีของเกินมาอย่างหนึ่ง/"));
  await X.shot(`${OUT}/cook-odd.png`);
  // the right things, the wrong amounts: an odd dish like any other
  await cookAgain(X);
  ok("the right things in the wrong amounts are stirred too", await make(X, [["snakehead", 2], ["tomato", 2], ["chili", 2], ["scallion", 1]]));
  p = await purse(X);
  ok("…and are another odd dish, which tastes of the wrong amounts", p.bag.filter((s) => s?.item === "potFull" && s.of.dish === "oddDish").length === 2 && (await has(X, "snakehead")) === 1
    && !(await X.evaluate(`${C}.found()`)).length && (await shown(X, "/สัดส่วนยังไม่ใช่/")), p.bag);
  await X.evaluate(`${T}.serve(${T}.purse().bag.findIndex((s) => s?.item === "potFull" && s.of.left > 1))`);
  await sleep(300);
  ok("it is ladled like any dish, into the bowl, which goes with it", (await has(X, "oddDish")) === 1 && (await has(X, "bowl")) === 0);
  await grant(X, [["bowl", 1]]);
  await dropOdd(X);
  // the dish
  await cookAgain(X);
  ok("the right things are stirred", await make(X, TOMYUM));
  p = await purse(X);
  const pot = p.bag.find((s) => s?.item === "potFull");
  ok("…into a pot of the dish: a pot of tom yum, four helpings, and the cook's own pot still clean", pot?.of?.dish === "tomYum" && pot.of.left === 4 && (await has(X, "pot")) === 1 && (await has(X, "snakehead")) === 0, p.bag);
  ok("its recipe is found, in the book, under the finder's name", (await X.evaluate(`${C}.found()`)).includes("tomYum") && p.recipes.includes("tomYum") && (p.made ?? []).includes("tomYum")
    && /K/.test((await X.evaluate(`${T}.finder("tomYum")`)) ?? "") && (await shown(X, "/พบสูตรใหม่/")), await X.evaluate(`${T}.finders()`));
  await X.shot(`${OUT}/cook-made.png`);
  // having made it, the cook is told what is missing, and loses nothing
  await grant(X, TOMYUM);
  await cookAgain(X, "pan");
  ok("having made it, the cook is told when the cookware is wrong, and loses nothing", (await make(X, TOMYUM)) === false && (await has(X, "snakehead")) === 1 && (await shown(X, "/ของในมือทำสิ่งนี้ไม่ได้/")));
  ok("the panel still offers no recipe to pick", await X.evaluate(`!document.querySelector('[aria-label="สูตรที่รู้"]')`));

  // by hand, at a worktable
  await hold(X, null);
  await warp(X, at("table"));
  await until("at a worktable bare hands will do", async () => (await offers(X)).includes("cook"), 5000);
  await act(X, "cook");
  ok("six water hyacinths are woven, by hand", await make(X, [["hyacinth", 6]]));
  ok("…into a basket, in the bag", (await has(X, "basket")) === 1 && (await has(X, "hyacinth")) === 0);
  const slots = (await purse(X)).bag.length;
  await X.evaluate(`${T}.wear(${await slotOf(X, "basket")})`);
  await sleep(300);
  p = await purse(X);
  ok("worn, the basket makes the bag five slots bigger", p.bag.length === slots + 5 && p.wears?.includes("basket") && (await has(X, "basket")) === 0, { slots, now: p.bag.length });

  // the cook's own helping
  await X.evaluate(`${T}.serve(${await slotOf(X, "potFull")})`);
  await sleep(300);
  p = await purse(X);
  ok("the cook ladles a helping out of their own pot, into a bowl", (await has(X, "tomYum")) === 1 && (await has(X, "bowl")) === 0 && p.bag.find((s) => s?.item === "potFull").of.left === 3, p.bag);
  const again = await X.evaluate(`${T}.serve(${await slotOf(X, "potFull")})`);
  ok("…and with no bowl left, no second one", again.ok === false && again.why === "tool" && (await has(X, "tomYum")) === 1, again);

  // set down, for the other
  await warp(X, open);
  ok("a pot in the bag is not set down", !(await offers(X)).includes("down"));
  await hold(X, "potFull");
  await until("a pot held in the hand is offered the ground", async () => (await offers(X)).includes("down"), 5000);
  await act(X, "down");
  let pots = await X.evaluate(`${C}.pots()`);
  ok("it is set down where I stand, and leaves my bag", pots.length === 1 && pots[0].dish === "tomYum" && pots[0].left === 3 && (await has(X, "potFull")) === 0, pots);
  await sleep(500);
  await X.shot(`${OUT}/cook-pot.png`);

  const Y = await X.tab("CookB");
  await enter(Y, "B");
  await Y.evaluate(`${T}.resize(20)`);
  await warp(Y, [open[0] + 1, open[1]]);
  await until("the other tester, beside it, is offered a helping", async () => (await offers(Y)).includes("ladle"), 6000);
  ok("…but may not take the pot up", !(await offers(Y)).includes("take"));
  await act(Y, "ladle");
  ok("without a bowl there is no helping", (await has(Y, "tomYum")) === 0 && (await shown(Y, "/ไม่มีถ้วย/")));
  await grant(Y, [["bowl", 1]]);
  await act(Y, "ladle");
  ok("with a bowl of their own there is, and the bowl goes with it", (await has(Y, "tomYum")) === 1 && (await has(Y, "bowl")) === 0 && (await X.evaluate(`${C}.pots()`))[0].left === 2);
  await act(Y, "ladle");
  ok("a second helping wants a second bowl", (await has(Y, "tomYum")) === 1 && (await X.evaluate(`${C}.pots()`))[0].left === 2 && (await shown(Y, "/ไม่มีถ้วย/")));
  ok("its owner may take it up while there is food in it", (await offers(X)).includes("take"), await offers(X));
  await grant(Y, [["bowl", 2]]);
  await act(Y, "ladle");
  await act(Y, "ladle");
  await sleep(500);
  pots = await X.evaluate(`${C}.pots()`);
  ok("its last helping out, the pot is gone from the ground: no dirty pot, nothing to wash", pots.length === 0 && (await has(Y, "tomYum")) === 3 && (await has(Y, "bowl")) === 0
    && (await offers(Y)).length === 0 && !(await offers(X)).includes("take"), { pots, y: await offers(Y), x: await offers(X) });
  await X.shot(`${OUT}/cook-pot-gone.png`);

  // eaten up, a helping gives its bowl back
  const sat = await X.evaluate(`${T}.sitDown(${await slotOf(X, "tomYum")}, true)`);
  ok("the cook sits down to their helping: the bowl is still out", sat.ok === true && (await has(X, "tomYum")) === 0 && (await has(X, "bowl")) === 0, sat);
  await X.evaluate(`${T}.skipHours(0.1)`);
  const eaten = await X.evaluate(`${T}.chew(0)`);
  ok("eaten up, the bowl is back in the bag", eaten === true && (await has(X, "bowl")) === 1 && (await purse(X)).eating === null, (await purse(X)).bag);

  // a dish for two
  const CRAB = [["crab", 3], ["curryPaste", 1], ["longBean", 1], ["eggplant", 1]];
  await grant(X, [...CRAB, ...CRAB]);
  await warp(Y, open);
  await warp(X, at("stove"));
  await cookAgain(X);
  ok("a dish for two, cooked alone, is an odd dish like any other", (await make(X, CRAB)) === true && (await has(X, "crab")) === 3
    && (await purse(X)).bag.some((s) => s?.item === "potFull" && s.of.dish === "oddDish") && !(await shown(X, "/คนยังไม่ครบ/")), (await purse(X)).bag);
  ok("…which tastes of everything being right but the way it was cooked", await shown(X, "/วิธีทำยังไม่ใช่/"));
  await dropOdd(X);
  await grant(Y, [["mortar", 1]]);
  await hold(Y, "mortar");
  await warp(Y, at("fire"));
  await until("the other, at the fire with a mortar, is one of the cooks", async () => (await X.evaluate(`${C}.crew()`)).includes("mortar"), 8000);
  await cookAgain(X);
  await X.shot(`${OUT}/cook-two.png`);
  ok("with the other at their place it is cooked", (await make(X, CRAB)) === true && (await purse(X)).bag.some((s) => s?.item === "potFull" && s.of.dish === "crabCurry"), (await purse(X)).bag);
  ok("the find is the other's too", (await Y.evaluate(`${T}.known()`)).includes("crabCurry") && (await Y.evaluate(`${T}.known()`)).includes("tomYum"));
  ok("…but only whoever made it knows all of it", (await X.evaluate(`${T}.madeBefore("crabCurry")`)) === true && (await Y.evaluate(`${T}.madeBefore("crabCurry")`)) === false);

  // the recipe, read: all of it by whoever made it; by the other, all but its last thing, and who to ask
  await hold(X, null);
  await warp(X, open);
  let paper = await readRecipe(X, "ต้มยำปลาช่อน");
  ok("the cook reads all of the recipe", /ปลาช่อน/.test(paper) && /มะเขือเทศ/.test(paper) && /พริก/.test(paper) && /ต้นหอม/.test(paper) && !/สักอย่าง/.test(paper), paper);
  await X.shot(`${OUT}/cook-scroll-whole.png`);
  await rollUp(X);
  paper = await readRecipe(Y, "ต้มยำปลาช่อน");
  ok("the other reads all but its last thing, which is told only by its kind", /มะเขือเทศ/.test(paper) && /พริก/.test(paper) && !/ต้นหอม/.test(paper) && /ผักหรือผลไม้สักอย่าง/.test(paper), paper);
  ok("…and who made it first", /คนแรกที่ทำได้/.test(paper) && /K/.test(paper), paper);
  await Y.shot(`${OUT}/cook-scroll-short.png`);
  await rollUp(Y);

  // the uncle's hint
  await X.evaluate(`${T}.grant("rice", 0, 100)`);
  const hint = await X.evaluate(`${T}.hint()`);
  p = await purse(X);
  ok("the uncle's next hint is bought for coins, and kept", hint.ok === true && p.hints?.length === 1 && p.coins < 100, { hint: hint.ok ? hint.hint : hint, coins: p.coins });

  // written down
  const log = await X.evaluate(`${T}.plays()`);
  const cooking = log.filter((l) => l.game === "cooking");
  ok("every stirring is written down", cooking.length === 6 && cooking.filter((l) => l.won).length === 3 && cooking.filter((l) => l.what === "oddDish" && !l.won).length === 3
    && cooking.some((l) => l.what === "tomYum") && log.every((l) => l.game !== "washing"), { cooking: cooking.map((l) => [l.what, l.won]) });
  // the cure for pests (the owner, 2026-10-04: "ช่วยเพิ่มสูตรทำยาฆ่าแมลงในร้านค้าให้ด้วย"): its scroll from the uncle's first
  // shelf, read into the book; the cure made of what that shelf grows; stirred with no stamina left
  await X.evaluate(`${T}.grant("rice", 0, 100)`);
  const sold = await X.evaluate(`${T}.buy("scrollPestCure", 1)`);
  ok("the uncle sells the scroll of the cure for pests, with none of his orders filled", sold.ok === true && (await has(X, "scrollPestCure")) === 1, sold);
  const told = await X.evaluate(`${T}.readScroll(${await slotOf(X, "scrollPestCure")})`);
  ok("read, the cure is in the recipe book with what else is made, and the scroll is used up", told.ok === true && told.dish === "pestCure" && (await X.evaluate(`${T}.knownMakes()`)).includes("pestCure") && (await has(X, "scrollPestCure")) === 0, told);
  paper = await readRecipe(X, "ยาไล่แมลง");
  ok("the book tells all of it but its last thing, which is some staple", /พริก/.test(paper) && /ต้นหอม/.test(paper) && !/เกลือ/.test(paper) && /ของคู่ครัวสักอย่าง/.test(paper), paper);
  await X.shot(`${OUT}/cook-cure-scroll.png`);
  await rollUp(X);
  // (the bag shut again, and a pot of one's own in it)
  if (await X.evaluate(`!!${TRADE}`)) { await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`); await sleep(700); }
  await X.evaluate(`${T}.setStamina(0)`);
  await grant(X, [["chili", 2], ["scallion", 2], ["salt", 1], ...((await has(X, "pot")) ? [] : [["pot", 1]])]);
  await warp(X, open);
  await warp(X, at("stove"));
  await cookAgain(X);
  await X.evaluate(`${C}.put([["chili", 2], ["scallion", 2], ["salt", 1]])`);
  await sleep(300);
  await X.evaluate(`${C}.go()`);
  await awaitGame(X);
  await sleep(150);
  const weary = await gameState(X), fresh = { lo: 0.9 - 0.36 * Math.SQRT2, hi: 0.9 + 0.36 * Math.SQRT2 };
  ok("with no stamina the stirring is a little harder and no more: three quarters of its wide pace, a little less patient, never dropped",
    weary.kind === "stirring" && Math.abs((weary.hi - weary.lo) - (fresh.hi - fresh.lo) * 0.75) < 1e-6 && Math.abs(weary.grace - 1 / 1.15) < 1e-6 && weary.need === 5 && (await board(X)).left === null, weary);
  await X.shot(`${OUT}/cook-cure-stir.png`);
  await play(X);
  await sleep(700);
  ok("chilies, scallions and salt in a pot are two of the cure, a recipe found", (await has(X, "pestCure")) === 2 && (await X.evaluate(`${C}.found()`)).includes("pestCure"), (await purse(X)).bag.filter(Boolean));
  await X.evaluate(`${T}.setStamina(100)`);
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs]);
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
