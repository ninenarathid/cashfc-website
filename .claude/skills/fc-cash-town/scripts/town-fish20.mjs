// Cash Town's twenty fish of 2026-10-05, tried in a real browser on the dev test room (the trial kept in the
// browser, `next dev` only). The owner: "ช่วยเพิ่มปลาขั้นแรก ไปอีก 20 แบบ … แต่ละปลามีเงื่อนไขในการเจอ และ วัตถุประสงค์ในการใช้งาน ที่แตกต่าง
// กันด้วย". Each of them with its name and its picture in the bag; the dozy fish for somebody with no stamina and
// never otherwise; the popoto fish when others are said to be fishing (`&townSigns=crowd`); the bank's own off the
// bank; a loach offered as a bait once it is held, and a fish it brings fought and landed; and what the fish are
// for: three put on a plant, two opened, two eaten as they are, three made into something by hand. Prints PASS/FAIL
// lines and writes screenshots to <outdir>.
//
//   node town-fish20.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };

const FISH = `document.querySelector('[aria-labelledby="town-fish-h"]')`, TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const text = (X, el) => X.evaluate(`${el}.innerText.replace(/\\s+/g, " ")`);
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
const T = (X, js) => X.evaluate(`(() => { const t = window.__townTrade; return ${js}; })()`);
const purse = (X) => T(X, `t.purse()`);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const slotOf = async (X, item) => (await purse(X)).bag.findIndex((s) => s?.item === item);
const count = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const TWENTY = ["loach", "mosquitofish", "mussel", "crayfish", "goldfish", "carp", "piranha", "herring", "archerfish", "pacu", "pike", "nilePerch", "salmon", "wels", "gar", "arapaima", "dozyFish", "popotoFish", "rainbowFish", "moonFish"];
const NAMES = ["ปลาโดโจ", "ปลากินยุง", "หอยกาบ", "กุ้งเครย์ฟิช", "ปลาทอง", "ปลาไน", "ปลาปิรันยา", "ปลาเฮอร์ริง", "ปลาเสือพ่นน้ำ", "ปลาเปคู", "ปลาไพค์", "ปลากะพงไนล์", "ปลาแซลมอน", "ปลาเวลส์", "ปลาการ์จระเข้", "ปลาช่อนอะเมซอน", "ปลาขี้เซา", "ปลาโปโปโต้", "ปลาสายรุ้ง", "ปลาจันทรา"];
/** Walk to a tile and stand there. */
async function walk(X, x, y, ms = 40000) {
  await X.evaluate(`window.__cashTown.walkTo(${x}, ${y})`);
  return until(`I stand at ${x},${y}`, async () => { const p = (await me(X)).pos; return Math.floor(p.x) === x && Math.floor(p.y) === y; }, ms).catch((e) => e.message);
}
/** Drop a line (the short wait), and say what it was told once it is out. */
async function cast(X) {
  await until("the rod's panel is ready", () => X.evaluate(`window.__townFish?.phase() === "ready"`), 5000);
  await X.evaluate(`window.__townFish.quick(true)`);
  await sleep(120);
  await press(X, "หย่อนเบ็ด", FISH);
  await until("the line is out", () => X.evaluate(`window.__townFish.phase() === "waiting"`), 3000);
  return X.evaluate(`window.__townFish.cast()`);
}
/** On from what a go came to. Its buttons are not to be pressed until it has been shown a moment (lib/town/fishing's `REST`), so the press is waited for. */
const dropAgain = (X) => until("what the go came to can be left", () => press(X, "หย่อนอีก", FISH), 5000, 60);
/** So many lines dropped and struck too soon (a script's strike, taken whenever it comes): what was on each (the trial writes it down with the go). */
async function dropped(X, many) {
  const got = [];
  for (let i = 0; i < many; i++) {
    await cast(X);
    await X.evaluate(`window.__townFish.strike()`);
    await until("that cast is over", () => X.evaluate(`window.__townFish.phase() === "result"`), 3000);
    got.push(await T(X, `t.plays().at(-1).what`));
    await dropAgain(X);
  }
  return got;
}
/** The rod taken up at a place to fish from, and its panel open. */
async function begin(X, bait, n) {
  await T(X, `(t.empty(), t.grant("rod", 1), t.grant(${JSON.stringify(bait)}, ${n}), t.hold(0))`);
  await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 6000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${FISH}`), 5000);
  await sleep(300);
}
// (from what a go came to, its button is waited for: it is not to be pressed until that has been shown a moment)
const close = async (X) => {
  if ((await X.evaluate(`window.__townFish?.phase()`)) === "result") await until("what the go came to can be left", () => press(X, "พอแล้ว", FISH), 5000, 60);
  else await press(X, "พอแล้ว", FISH);
  await sleep(300);
};
/** A hand on the reel: reel below the middle of the safe stretch (lower in it while the fish surges). */
async function fight(X) {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    const f = await X.evaluate(`(() => { const f = window.__townFish?.fight(); if (!f) return null;
      const on = f.t >= f.surge.from - 0.3 && f.t < f.surge.to;
      window.__townFish.hold(f.tension < f.lo + (f.hi - f.lo) * (on ? 0.25 : 0.5)); return { over: f.over }; })()`);
    if (!f) break;
    await sleep(20);
  }
  await until("the fight is over", () => X.evaluate(`window.__townFish.phase() === "result"`), 5000);
  return X.evaluate(`window.__townFish.result()`);
}

const X = await browser("Twenty", { width: 1280, height: 860 });
try {
  const enter = async (more = "") => {
    await X.goto(`${BASE}/town?townTest=G&townRoom=check&townHour=12&townWeather=clear${more}`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!window.__townTrade`), 20000);
  };
  await enter();
  await T(X, `(t.reset(), t.forget())`);
  await sleep(500);

  // every one of them in a bag, with its own name and its own picture
  await T(X, `(t.resize(30), ${JSON.stringify(TWENTY)}.forEach((id) => t.grant(id, 1)))`);
  const held = (await purse(X)).bag.filter(Boolean).map((s) => s.item);
  ok("all twenty can be had and held: a slot each", TWENTY.every((id) => held.includes(id)), held);
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 5000).catch(() => {});
  await sleep(800);
  const drawn = await X.evaluate(`(() => { const p = ${TRADE}; if (!p) return null;
    return { pictures: p.querySelectorAll("canvas, img, [data-icon]").length, broken: [...p.querySelectorAll("img")].filter((i) => i.complete && !i.naturalWidth).length }; })()`);
  ok("the bag opens with them in it, and no picture is missing", !!drawn && drawn.broken === 0, drawn);
  await X.shot(`${OUT}/fish20-bag.png`);
  // the card of each says its name, and nothing of what it is for
  const cards = [];
  for (const [i, id] of TWENTY.entries()) {
    await T(X, `t.hold(${await slotOf(X, id)})`);
    await sleep(60);
    cards.push((await me(X)).hold === id ? NAMES[i] : `${id}: not held`);
  }
  ok("each can be taken in the hand, for the room to see", cards.every((c, i) => c === NAMES[i]), cards.filter((c, i) => c !== NAMES[i]));
  await X.evaluate(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
  await sleep(300);

  // the deck: somebody with stamina never sees the dozy fish; with none, it is among the lines
  await X.evaluate(`window.__townView.warp(30, 40)`);
  await sleep(700);
  const stood = await walk(X, 17, 42);
  ok("on the deck, where a line reaches deep water", stood === true && (await X.evaluate(`window.__townView.fishAt()`))?.deep === true, stood);
  await begin(X, "worm", 20);
  await T(X, `t.setStamina(100)`);
  let got = await dropped(X, 15);
  ok("with stamina, fifteen lines on a worm bring up nothing that waits for a sign, and nothing of the bank's",
    !got.some((w) => ["dozyFish", "popotoFish", "rainbowFish", "moonFish", "goldfish", "loach", "mosquitofish", "mussel", "crayfish"].includes(w)), got);
  await T(X, `(t.grant("worm", 20), t.setStamina(0))`);
  got = await dropped(X, 25);
  ok("with none, the dozy fish is among twenty-five", got.includes("dozyFish") && !got.includes("popotoFish"), got);
  await close(X);

  // others fishing too (said by the address, in the trial): the popoto fish
  await enter("&townSigns=crowd");
  await X.evaluate(`window.__townView.warp(30, 40)`);
  await sleep(700);
  await walk(X, 17, 42);
  await begin(X, "dough", 20);
  await T(X, `t.grant("dough", 10)`);
  await T(X, `t.setStamina(100)`);
  got = await dropped(X, 25);
  ok("with others' lines in the water, the popoto fish is among twenty-five", got.includes("popotoFish") && !got.includes("dozyFish"), got);
  await close(X);
  await enter();

  // a loach on the hook, off the deck: a fish that takes it is fought and landed
  await X.evaluate(`window.__townView.warp(30, 40)`);
  await sleep(700);
  await walk(X, 17, 42);
  await begin(X, "loach", 12);
  await T(X, `t.setStamina(100)`);
  const ready = await text(X, FISH);
  ok("a loach in the bag is offered as a bait", /ปลาโดโจ/.test(ready) && /หย่อนเบ็ด/.test(ready), ready);
  let landed = null, tries = 0;
  while (!landed && tries < 10) {
    tries++;
    const c = await cast(X);
    await until("the bite", () => X.evaluate(`(() => { const c = window.__townFish.cast(); return !c || c.since >= c.wait + 0.12; })()`), (c.wait + 5) * 1000, 30);
    await X.evaluate(`window.__townFish.strike()`);
    await sleep(150);
    if ((await X.evaluate(`window.__townFish.phase()`)) === "fight") {
      const r = await fight(X);
      if (r.how === "landed") { landed = r; await sleep(400); await X.shot(`${OUT}/fish20-landed.png`); }
    }
    await dropAgain(X);
  }
  // (whichever of them is about at this hour: the trial's clock is the real one)
  ok(`on a loach, one of the fish that take it is fought and landed (${tries} casts)`, !!landed && ["piranha", "nilePerch", "catfish", "pike", "gar", "wels", "salmon", "arapaima"].includes(landed.what), landed);
  ok("…and it is in the bag, a loach the fewer for every line", !!landed && count((await purse(X)).bag, landed.what) >= 1 && count((await purse(X)).bag, "loach") === 12 - tries, (await purse(X)).bag);
  await close(X);

  // what they are for, by the same rules the panels ask
  const KEY = "132,4", plant = { by: "somebody", crop: "pumpkin", sown: 0, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
  await T(X, `(t.empty(), t.clearFarm(), t.setPlot(${JSON.stringify(KEY)}, { soil: "tilled", plant: { ...${JSON.stringify(plant)}, sown: t.now() - 3600000 } }),
    t.grant("herring", 1), t.grant("mosquitofish", 1), t.grant("carp", 1), t.hold(0))`);
  ok("a herring in the hand is offered to a growing plant as its fertiliser is", (await T(X, `t.deedAt(${JSON.stringify(KEY)})`)) === "feed");
  let did = await T(X, `t.farmDo(${JSON.stringify(KEY)}, "G")`);
  ok("…put on, it is used up and the plant is fed", did.ok === true && did.deed === "feed" && count((await purse(X)).bag, "herring") === 0 && (await T(X, `t.farm()[${JSON.stringify(KEY)}].plant.fed`)) > 0, did);
  await T(X, `t.hold(${await slotOf(X, "mosquitofish")})`);
  did = await T(X, `t.farmDo(${JSON.stringify(KEY)}, "G")`);
  ok("a mosquitofish keeps the pests off it", did.ok === true && (await T(X, `t.farm()[${JSON.stringify(KEY)}].plant.guard > t.now()`)) === true, did);
  await T(X, `t.hold(${await slotOf(X, "carp")})`);
  ok("a carp is nothing to a plant", (await T(X, `t.deedAt(${JSON.stringify(KEY)})`)) === null);
  await T(X, `(t.empty(), t.clearFarm(), t.grant("wels", 1), t.grant("pacu", 1), t.grant("dozyFish", 1), t.grant("gar", 1), t.grant("moonFish", 1), t.grant("mussel", 2))`);
  did = await T(X, `t.openThing(0)`);
  ok("a wels opened holds a recipe scroll", did.ok === true && /^scroll/.test(did.found ?? ""), did);
  did = await T(X, `t.openThing(${await slotOf(X, "pacu")})`);
  ok("a pacu opened holds a seed, or nothing", did.ok === true && (did.found === null || /^seed/.test(did.found)), did);
  await T(X, `t.setStamina(40)`);
  did = await T(X, `t.sitDown(${await slotOf(X, "dozyFish")}, true)`);
  ok("somebody sits down to a dozy fish as it is", did.ok === true && did.dish === "dozyFish", did);
  await T(X, `t.getUp(0)`);
  const NO_HANDS = `[null]`;
  did = await T(X, `t.cookDo([["gar", 1]], ${NO_HANDS}, 0, "G")`);
  ok("a gar is made into a hook, by hand", did.ok === true && did.made === "hookScale" && count((await purse(X)).bag, "hookScale") === 1, did);
  did = await T(X, `t.cookDo([["moonFish", 1]], ${NO_HANDS}, 0, "G")`);
  ok("a moonfish into a float", did.ok === true && did.made === "floatGlow", did);
  did = await T(X, `t.cookDo([["mussel", 2]], ${NO_HANDS}, 0, "G")`);
  ok("two mussels into a bowl", did.ok === true && did.made === "bowl", did);
  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await sleep(900);
  await X.shot(`${OUT}/fish20-made.png`);

  ok("no page errors", X.logs.length === 0, X.logs);
} catch (e) {
  ok("the check ran to its end", false, String(e?.stack ?? e).slice(0, 600));
  await X.shot(`${OUT}/fish20-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
