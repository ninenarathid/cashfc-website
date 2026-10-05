// Cash Town's fishing, tried in a real browser on the dev test room (the trial kept in the browser, `next dev` only):
// up the finished deck's steps to where a line reaches water (and not where it does not); the rod in the hands; only
// the baits in the bag offered and nothing told of what they bring; a strike too soon and a bite left alone both lose
// the fish; a line that has only just gone out takes no strike, and what a go came to is not left by the space bar
// however it is hammered (Enter, or a click a moment on); a strike at the bite and a hand on the reel land one while
// the safe stretch moves; every go written down;
// no stamina said to be harder; the bank's shallows and their common fish; the sounds, each made and measured; the
// bag opened like a bag, a thing's card on hover, a thing held in the hand; a meal, a recipe scroll, and the test
// window that conjures anything. Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-fish.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };

const FISH = `document.querySelector('[aria-labelledby="town-fish-h"]')`, TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`,
  TEST = `document.querySelector('[aria-labelledby="town-test-h"]')`;
const text = (X, el) => X.evaluate(`${el}.innerText.replace(/\\s+/g, " ")`);
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
const purse = (X) => X.evaluate(`window.__townTrade.purse()`);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
// (what comes to the bank: the common fish and, since the twenty fish of 2026-10-05, the shallows' own and the common ones that wait for a sign)
const COMMON = ["minnow", "barb", "tilapia", "perch", "catfish", "hyacinth", "boot", "loach", "mosquitofish", "mussel", "crayfish", "goldfish", "carp", "dozyFish", "popotoFish", "rainbowFish"];
/** Walk to a tile and stand there. */
async function walk(X, x, y, ms = 30000) {
  await X.evaluate(`window.__cashTown.walkTo(${x}, ${y})`);
  return until(`I stand at ${x},${y}`, async () => { const p = (await me(X)).pos; return Math.floor(p.x) === x && Math.floor(p.y) === y; }, ms).catch((e) => e.message);
}
/** Drop a line (the short wait, or the whole of it: three seconds at the least, so that there is a moment to strike too soon in once the line has settled), and say what it was told once it is out. */
async function cast(X, quick = true, drop = () => press(X, "หย่อนเบ็ด", FISH)) {
  await until("the rod's panel is ready", () => X.evaluate(`window.__townFish?.phase() === "ready"`), 5000);
  await X.evaluate(`window.__townFish.quick(${quick})`);
  await sleep(120);
  await drop();
  await until("the line is out", () => X.evaluate(`window.__townFish.phase() === "waiting"`), 3000, 40);
  return X.evaluate(`window.__townFish.cast()`);
}
/** On from what a go came to. Its buttons are not to be pressed until it has been shown a moment (lib/town/fishing's `REST`), so the press is waited for. */
const dropAgain = (X) => until("what the go came to can be left", () => press(X, "หย่อนอีก", FISH), 5000, 60);
/** How long the line has been out, in seconds (nothing when none is). */
const since = (X) => X.evaluate(`window.__townFish.cast()?.since ?? null`);
/** Whether a button of the rod's panel is there and not to be pressed. */
const dim = (X, words) => X.evaluate(`(() => { const b = [...${FISH}.querySelectorAll("button")].find((x) => x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)})); return b ? b.disabled : null; })()`);
const worms = async (X) => (await purse(X)).bag.find((s) => s?.item === "worm")?.n ?? 0;
/** Wait for the bite and strike a moment after it. Says what phase follows. */
async function strikeAtBite(X, c) {
  await until("the bite", () => X.evaluate(`(() => { const c = window.__townFish.cast(); return !c || c.since >= c.wait + 0.12; })()`), (c.wait + 5) * 1000, 30);
  await X.evaluate(`window.__townFish.strike()`);
  await sleep(150);
  return X.evaluate(`window.__townFish.phase()`);
}
/** A hand on the reel: reel below the middle of the safe stretch (lower in it while the fish surges). Says how it ended, and how far the stretch moved meanwhile. */
async function fight(X) {
  const end = Date.now() + 120000;
  let low = 1, high = 0;
  while (Date.now() < end) {
    const f = await X.evaluate(`(() => { const f = window.__townFish?.fight(); if (!f) return null;
      const on = f.t >= f.surge.from - 0.3 && f.t < f.surge.to;
      window.__townFish.hold(f.tension < f.lo + (f.hi - f.lo) * (on ? 0.25 : 0.5)); return { at: f.at, over: f.over }; })()`);
    if (!f) break;
    low = Math.min(low, f.at); high = Math.max(high, f.at);
    await sleep(20);
  }
  await until("the fight is over", () => X.evaluate(`window.__townFish.phase() === "result"`), 5000);
  return { ...(await X.evaluate(`window.__townFish.result()`)), moved: high - low };
}

const X = await browser("Fwide", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=F&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!window.__townTrade`), 20000);
  await X.evaluate(`(window.__townTrade.reset(), window.__townTrade.forget())`);
  await sleep(500);
  await X.evaluate(`(window.__townTrade.grant("rod", 1), window.__townTrade.grant("worm", 20))`);
  const begin = () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`);

  // the landward part of the deck is too far from the water; its riverward part is not
  await X.evaluate(`window.__townView.warp(30, 40)`);
  await sleep(700);
  const inland = await walk(X, 25, 41);
  await sleep(400);
  ok("up the steps, the landward part of the deck is no place to fish from", inland === true && (await X.evaluate(`window.__townView.fishAt()`)) === null
    && !(await X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`)), inland);
  const stood = await walk(X, 17, 42);
  const place = await until("it is a place to fish from", () => X.evaluate(`window.__townView.fishAt()`), 5000).catch((e) => e.message);
  ok("its riverward part is: the line lands in deep water", stood === true && place?.deep === true && place.tile?.join() === "17,42", { stood, place });
  await sleep(600);
  ok("the way to begin does not show with the rod in the bag: it has to be in the hand", !(await begin()));
  await X.evaluate(`window.__townTrade.hold(0)`);
  await until("the way to begin shows", begin, 5000);
  ok("…and shows once the rod is held", (await me(X)).hold === "rod");
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${FISH}`), 5000);
  await sleep(300);
  let ready = await text(X, FISH);
  ok("the panel offers the bait in my bag, and says nothing of what it may bring", /ไส้เดือน/.test(ready) && /หย่อนเบ็ด/.test(ready) && /น้ำลึก/.test(ready) && !/%/.test(ready) && !/อาจได้/.test(ready), ready);
  ok("a bait I do not have is not shown", !/เหยื่อแป้ง/.test(ready) && !/ข้าวโพด/.test(ready) && !/ปลาซิว/.test(ready), ready);
  ok("with the panel open the rod is in my hands, for the room to see", (await me(X)).fish === 1);
  await X.shot(`${OUT}/fish-ready.png`);

  // The hand's rest (the members, 2026-10-06: the space bar hammered through a fight went on from the catch, dropped
  // the next line and struck it at once, a bait gone each time). The space bar, hammered as through a fight: so many
  // times, a tenth of a second apart, for as long as it is asked to go on.
  const space = async (type) => X.send("Input.dispatchKeyEvent", { type, key: " ", code: "Space", windowsVirtualKeyCode: 32, text: type === "keyDown" ? " " : undefined });
  const enter = async () => { for (const type of ["rawKeyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
  const hammer = async (n, whilst = async () => true) => { let done = 0; for (let i = 0; i < n && (await whilst()); i++) { await space("keyDown"); await space("keyUp"); done++; await sleep(80); } return done; };
  const settled = (X) => until("the line has settled", async () => (await since(X)) >= 2.05, 4000, 30);

  // a line that has only just gone out takes no strike; a moment on, one before the bite scares it off, and the bait is gone
  await cast(X, false);
  let shut = await dim(X, "ตวัดเบ็ด"), taps = await hammer(5, async () => (await since(X)) < 1.6);
  ok(`a line that has only just gone out takes no strike: its button is not to be pressed, and the space bar hammered on does nothing (${taps} times)`,
    shut === true && taps >= 2 && (await X.evaluate(`window.__townFish.phase()`)) === "waiting" && (await since(X)) < 2, { shut, taps, since: await since(X) });
  ok("with the line out the room is told so", (await me(X)).fish === 2);
  await settled(X);
  await sleep(60);
  ok("…two seconds on, the button is there to be pressed", (await dim(X, "ตวัดเบ็ด")) === false, await since(X));
  await press(X, "ตวัดเบ็ด", FISH);
  await until("too soon", () => X.evaluate(`window.__townFish.phase() === "result"`), 3000, 30);
  ok("a strike before the bite loses the fish", (await X.evaluate(`window.__townFish.result().how`)) === "early");
  ok("…and the bait went with it", (await worms(X)) === 19);
  await X.shot(`${OUT}/fish-early.png`);
  await dropAgain(X);

  // the space bar does what the big button does: drops the line, and strikes (not a line that has only just gone out)
  const bySpace = await cast(X, false, async () => { await space("keyDown"); await space("keyUp"); }).then(() => true, (e) => e.message);
  await X.shot(`${OUT}/fish-waiting.png`);
  taps = await hammer(4, async () => (await since(X)) < 1.6);
  const held = (await X.evaluate(`window.__townFish.phase()`)) === "waiting";
  await settled(X);
  await space("keyDown"); await space("keyUp");
  const struck = await until("the space bar strikes", () => X.evaluate(`window.__townFish.phase() === "result"`), 3000, 30).catch((e) => e.message);
  ok("the space bar drops the line and strikes, like the big button, and does not strike a line only just out", bySpace === true && held && struck === true && (await X.evaluate(`window.__townFish.result().how`)) === "early", { bySpace, held, taps, struck });

  // …and what a go came to is not left by it: its buttons wait a moment, the space bar does nothing there, Enter goes on
  shut = [await dim(X, "หย่อนอีก"), await dim(X, "พอแล้ว")];
  const before = await worms(X);
  taps = await hammer(14);
  ok(`what a go came to is not left by the space bar, however it is hammered (${taps} times): no line is dropped, no bait gone`,
    (await X.evaluate(`window.__townFish.phase()`)) === "result" && (await worms(X)) === before && before === 18, { phase: await X.evaluate(`window.__townFish.phase()`), before, now: await worms(X) });
  ok("…its two buttons are not to be pressed at first, and are a second on; the one that goes on says Enter",
    shut[0] === true && shut[1] === true && (await dim(X, "หย่อนอีก")) === false && (await dim(X, "พอแล้ว")) === false && /enter/i.test(await text(X, FISH)) && !/space/i.test(await text(X, FISH)), { shut, text: await text(X, FISH) });
  await enter();
  const on = await until("Enter goes on", () => X.evaluate(`window.__townFish.phase() === "ready"`), 3000, 30).catch((e) => e.message);
  ok("Enter goes on to the baits, and is not taken for the town's key to type with", on === true && !(await X.evaluate(`/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? "")`)), on);

  // a bite left alone is lost too
  let c = await cast(X);
  await until("it bit and was not struck", () => X.evaluate(`window.__townFish.phase() === "result"`), (c.wait + 6) * 1000);
  ok("a bite that is not struck within moments is lost", (await X.evaluate(`window.__townFish.result().how`)) === "missed");
  await dropAgain(X);

  // strike at the bite, and fight: a fish is landed within a few casts
  let landed = null, tries = 0, fights = 0, moved = 0, seenFight = false;
  while (!landed && tries < 10) {
    tries++;
    c = await cast(X);
    const phase = await strikeAtBite(X, c);
    if (phase === "fight") {
      fights++;
      if (fights === 1) { await sleep(500); seenFight = (await me(X)).fish === 3; await X.shot(`${OUT}/fish-fight.png`); }
      const res = await fight(X);
      moved = Math.max(moved, res.moved);
      if (res.how === "landed") landed = res;
    } else if (phase === "result") {
      const res = await X.evaluate(`window.__townFish.result()`);
      if (res.how === "landed" && !["hyacinth", "boot"].includes(res.what)) landed = res;
    }
    if (!landed) await dropAgain(X);
  }
  ok(`a strike at the bite hooks the fish, and it is landed (${tries} casts, ${fights} fights)`, !!landed, landed);
  // (as the members met it: the fish is landed and the hand goes on hammering)
  const left = await worms(X);
  taps = await hammer(12);
  ok(`the hand that fought it goes on hammering the space bar (${taps} times): the fish stays shown, and no line is dropped`,
    (await X.evaluate(`window.__townFish.result()?.what ?? null`)) === landed?.what && (await worms(X)) === left, { result: await X.evaluate(`window.__townFish.result()`), left, now: await worms(X) });
  ok("in the fight the safe stretch moves, and the room is told a fish is on", moved > 0.02 && seenFight, { moved, seenFight });
  await X.shot(`${OUT}/fish-landed.png`);
  let p = await purse(X);
  ok("the fish is in the bag, and the longest of its kind is remembered", !!landed && p.bag.some((s) => s?.item === landed.what) && p.best[landed.what] === landed.size, p);
  ok("fighting spent stamina", fights > 0 && p.stamina.left < 100, p.stamina);
  ready = (await dropAgain(X), await sleep(300), await text(X, FISH));
  ok("the fish I caught is offered as a bait only if it is one: found out by having it", landed?.what !== "minnow" || /ปลาซิว/.test(ready), ready);

  // every go was written down
  const log = await X.evaluate(`window.__townTrade.plays()`), tally = await X.evaluate(`window.__townTrade.tally()`);
  const won = log.find((l) => l.how === "landed" && l.fight);
  ok("every go is written down, whatever its end", log.length === tries + 3 && log[0].how === "early" && log[1].how === "early" && log[2].how === "missed" && tally.games.fishing.plays === log.length
    && log.every((l) => l.place === "deck" && l.tile.join() === "17,42" && l.bait === "worm"), { n: log.length, tries, hows: log.map((l) => l.how) });
  ok("…a fight with what it takes to play it again: its seed, and when the reel was held", !!won && won.fight.seed > 0 && won.fight.holds.length > 2 && won.fight.steps > 100 && won.fight.inBand > 0.3 && won.secs > 1, won?.fight && { ...won.fight, holds: won.fight.holds.length });

  // with no stamina it is said to be much harder, and written down as played so
  await X.evaluate(`window.__townTrade.setStamina(0)`);
  await sleep(400);
  ok("with no stamina left the panel shows it in red, and explains nothing", (await X.evaluate(`${FISH}.querySelector('[title="Stamina"]').className`)).includes("#ffb09c") && !/ยากขึ้น/.test(await text(X, FISH)));
  c = await cast(X);
  await strikeAtBite(X, c);
  if ((await X.evaluate(`window.__townFish.phase()`)) === "fight") {
    const f = await X.evaluate(`(() => { const f = window.__townFish.fight(); return { band: f.band, sway: f.sway, fish: f.fish }; })()`);
    ok("…and the safe stretch is narrower than the fish's own", f.band < 0.3, f);
    await fight(X);
  }
  await until("that go is over", () => X.evaluate(`window.__townFish.phase() === "result"`), 8000);
  ok("…and the go is written down as played with none", (await X.evaluate(`window.__townTrade.plays().at(-1).spent`)) === true);
  await X.evaluate(`window.__townTrade.setStamina(100)`);

  // the sounds: each is made, none silent, none clipped
  const sounds = [];
  for (const name of ["cast", "nibble", "bite", "strike", "perfect", "early", "missed", "surge", "strain", "landed", "flotsam", "record", "snapped", "slipped", "tick"])
    sounds.push([name, await X.evaluate(`window.__townFish.sound(${JSON.stringify(name)}, "common")`)]);
  const legend = await X.evaluate(`window.__townFish.sound("landed", "legend")`);
  const bad = sounds.filter(([n, m]) => !(m.peak > 0.03 && m.peak <= 0.95 && m.secs > (n === "tick" ? 0.005 : 0.05) && m.secs < 2.5));
  ok(`every sound of fishing is made, none silent and none clipped (${sounds.length} of them)`, bad.length === 0, bad);
  ok("a legend's landing ends on a longer tune than a common fish's", legend.secs > sounds.find(([n]) => n === "landed")[1].secs + 0.5 && legend.peak <= 0.95, legend);
  console.log("   " + sounds.map(([n, m]) => `${n} ${m.peak}/${m.secs}s`).join("  "));

  await until("what the go came to can be left", () => press(X, "พอแล้ว", FISH), 5000, 60);
  await sleep(300);
  ok("putting the rod away closes the panel, and the room is told", !(await X.evaluate(`!!${FISH}`)) && (await me(X)).fish === 0);

  // the bank: the shallows, with the common fish only
  const onBank = await walk(X, 24, 47, 40000);
  const bank = await until("the bank is a place to fish from", () => X.evaluate(`window.__townView.fishAt()`), 5000).catch((e) => e.message);
  ok("off the deck, the town's bank is a place to fish from too: the shallows", onBank === true && bank?.deep === false, { onBank, bank });
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${FISH}`), 5000);
  await sleep(300);
  const shallows = /น้ำตื้น/.test(await text(X, FISH)), got = [];
  for (let i = 0; i < 4; i++) {
    c = await cast(X);
    await X.evaluate(`window.__townFish.strike()`);   // (too soon, and a script's, taken whenever it comes: only what took the bait is wanted here)
    await until("that cast is over", () => X.evaluate(`window.__townFish.phase() === "result"`), 3000);
    // (the panel is not told what is on its way: it is in what the trial wrote down of the go)
    got.push(await X.evaluate(`window.__townTrade.plays().at(-1).what`));
    await dropAgain(X);
  }
  await X.shot(`${OUT}/fish-bank.png`);
  ok("its water is shallow: only the common fish come", shallows && got.every((w) => COMMON.includes(w)), got);
  ok("…written down as from the bank", (await X.evaluate(`window.__townTrade.plays().at(-1).place`)) === "bank");
  await press(X, "ปิด", FISH);

  // the bag, opened: a thing's card when the mouse is over it, a thing taken up, a thing held in the hand
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 4000);
  await sleep(400);
  const pocket = await X.evaluate(`(() => { const b = ${TRADE}.querySelector('button[aria-label^="คันเบ็ดไม้ไผ่"]'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pocket.x, y: pocket.y });
  await sleep(350);
  const card = await X.evaluate(`(() => { const t = ${TRADE}.querySelector('button[aria-label^="คันเบ็ดไม้ไผ่"] [role="tooltip"]'); return { shown: Number(getComputedStyle(t).opacity), text: t.innerText.replace(/\\s+/g, " ") }; })()`);
  ok("the mouse over a thing shows its card: its name and what it looks like, not what it is for", card.shown > 0.9 && /คันเบ็ดไม้ไผ่/.test(card.text) && /ไม้ไผ่เรียวยาว/.test(card.text) && !/ตกปลา/.test(card.text), card);
  await X.shot(`${OUT}/fish-bag.png`);
  let bag = await text(X, TRADE);
  ok("the recipe book is not there while no recipe is known", !/สมุดสูตรอาหาร/.test(bag), bag);
  await X.evaluate(`${TRADE}.querySelector('button[aria-label^="ไส้เดือน"]').click()`);
  await sleep(200);
  // (the button under the pockets, not the tag on a pocket that says a thing is held)
  await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => b.innerText.trim() === "ถือ").click()`);
  await sleep(400);
  ok("a thing taken up can be held in the hand, and the room is told", (await me(X)).hold === "worm" && /เก็บ/.test(await text(X, TRADE)), await me(X));
  await X.evaluate(`window.__cashTown.walkTo(26, 47)`);
  await sleep(700);
  ok("…and it is still held while walking", (await me(X)).hold === "worm");
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await sleep(500);
  await X.shot(`${OUT}/fish-held.png`);

  // a meal: sitting down, five minutes, the stamina coming back
  await X.evaluate(`(window.__townTrade.grant("riceBox", 1), window.__townTrade.spend(40))`);
  const hungry = (await purse(X)).stamina.left;
  await X.evaluate(`window.__cashTown.sitHere()`);
  await sleep(500);
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 4000);
  await X.evaluate(`${TRADE}.querySelector('button[aria-label^="ข้าวห่อใบตอง"]').click()`);
  await sleep(200);
  await press(X, "กิน", TRADE);
  await sleep(1400);
  let q = await purse(X);
  ok("sitting down, a meal begins and the room is told", q.eating?.dish === "riceBox" && (await me(X)).eat === "riceBox", q.eating);
  await X.shot(`${OUT}/fish-eating.png`);
  await X.evaluate(`window.__townTrade.skipHours(0.1)`);
  await until("the meal is finished", async () => !(await purse(X)).eating, 6000);
  q = await purse(X);
  ok("five minutes on, it is eaten: the stamina it gives is added, and that meal is done for today", Math.round(q.stamina.left - hungry) === 15 && q.meals.eaten.filter(Boolean).length === 1, { hungry, now: q.stamina.left, meals: q.meals });

  // a recipe scroll
  await X.evaluate(`window.__townTrade.grant("scrollGrilledFish", 1)`);
  await sleep(300);
  await X.evaluate(`${TRADE}.querySelector('button[aria-label^="ม้วนสูตร"]').click()`);
  await sleep(200);
  await press(X, "คลี่อ่าน", TRADE);
  await until("the scroll unrolls", () => X.evaluate(`!!document.querySelector('[aria-labelledby="town-scroll-h"]')`), 4000);
  await sleep(900);
  const scroll = await X.evaluate(`document.querySelector('[aria-labelledby="town-scroll-h"]').innerText.replace(/\\s+/g, " ")`);
  ok("the scroll shows the recipe: the dish, what goes in, and what it gives", /ปลาเผาเกลือ/.test(scroll) && /ปลานิล/.test(scroll) && /เกลือ/.test(scroll) && /Stamina \+25/.test(scroll), scroll);
  await X.shot(`${OUT}/fish-scroll.png`);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await until("the scroll rolls up", () => X.evaluate(`!document.querySelector('[aria-labelledby="town-scroll-h"]')`), 4000);
  bag = await text(X, TRADE);
  ok("…the recipe is in my book, which shows now that there is one in it", (await purse(X)).recipes.includes("grilledFish") && /สมุดสูตรอาหาร/.test(bag), bag);

  // the test window: every thing, and any of it conjured
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title.startsWith("หน้าต่างทดสอบ")).click()`);
  await until("the test window opens", () => X.evaluate(`!!${TEST}`), 5000);
  await sleep(400);
  const things = await X.evaluate(`${TEST}.querySelectorAll("ul.grid-cols-6 > li").length`);
  await press(X, "ตัวฉัน", TEST);
  await sleep(200);
  await X.evaluate(`[...${TEST}.querySelectorAll("div")].find((d) => d.children[0]?.innerText?.includes("ช่องกระเป๋า")).querySelectorAll("button")[1].click()`);
  await press(X, "ของ", TEST);
  await sleep(200);
  await X.evaluate(`${TEST}.querySelector('button[aria-label="ปลาคาร์ปทอง"]').click()`);
  await sleep(200);
  const detail = await text(X, TEST);
  await press(X, "เสก 1", TEST);
  await sleep(300);
  q = await purse(X);
  ok(`the test window lists every thing (${things}) with all there is to know of it`, things >= 70 && /legend/.test(detail) && /Golden koi/.test(detail) && /sway/.test(detail), detail.slice(0, 400));
  ok("…conjures any of it into the bag, which it can make bigger", q.bag.length === 10 && q.bag.some((s) => s?.item === "koi"), q.bag);
  await X.shot(`${OUT}/fish-test.png`);
  await press(X, "ประวัติมินิเกม", TEST);
  await sleep(300);
  ok("…and shows the record of the mini-games", /หย่อนเบ็ด \d+ ครั้ง/.test(await text(X, TEST)), (await text(X, TEST)).slice(0, 300));
  await X.shot(`${OUT}/fish-test-plays.png`);
  ok("no page errors", X.logs.length === 0, X.logs);
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
