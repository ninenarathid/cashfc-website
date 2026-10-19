// The animal line (docs/plans/animals): its pasture, Uncle Popoto and his panel, buying, feeding and petting, the
// three games played through to what they give, breeding at the nest, the book, friends' care, the gate, eggs laid
// out, the meadow's forage, the gifts' buttons, the hay wagon, the cloud ram, and the pasture by night: driven in a
// real browser on the dev test room (the trial keeper, no database). Screenshots of every state at desktop, phone and
// a small phone; PASS/FAIL lines for what can be read.
//
//   node town-animals.mjs <base> <outdir> [desktop|phone|small|all]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3191", OUT = ".", ONLY = "all"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const S = "window.__townPasture", T = "window.__townTrade";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, mobile: true }, small: { width: 360, height: 640, mobile: true } };

async function enter(X, hour, who = "M") {
  await X.goto(`${BASE}/town?townTest=${who}&townRoom=pasture&townHour=${hour}&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
}
const warp = async (X, x, y, ms = 2200) => { const r = await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(ms); return r; };
const press = async (X, x, y) => {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const hit = (X, kind) => X.evaluate(`(${S}.hits().filter((h) => h.kind === ${JSON.stringify(kind)}).sort((a, b) => Math.hypot(a.x - innerWidth / 2, a.y - innerHeight / 2) - Math.hypot(b.x - innerWidth / 2, b.y - innerHeight / 2))[0] ?? null)`);
const tapMap = async (X, kind) => { const h = await hit(X, kind); if (!h) return false; await press(X, h.x, h.y); await sleep(700); return true; };
const click = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`);
const clickText = (X, re) => X.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((e) => ${re}.test(e.innerText)); if (!b) return false; b.click(); return true; })()`);
const world = (X) => X.evaluate(`${S}.world()`);
const me = (X) => X.evaluate(`window.__townKeeper.id`);
const mine = async (X) => { const id = await me(X); return (await world(X)).animals.filter((a) => a.owner === id); };
const held = (X, id) => X.evaluate(`${T}.purse().bag.reduce((n, s) => n + (s?.item === ${JSON.stringify(id)} ? s.n : 0), 0)`);
const say = (X) => X.evaluate(`document.querySelector("[data-animals-said]")?.innerText ?? document.querySelector("[data-pasture-note]")?.innerText ?? ""`);

/** A milking go played by the members' hands: each handle in turn, about 50 ms off each chew. */
const playMilk = (X) => X.evaluate(`new Promise((done) => {
  document.querySelector('[data-town-game="milk"] [data-game-start]').click();
  for (let n = 0; n < 16; n++) setTimeout(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: n % 2 ? "ArrowRight" : "ArrowLeft" })), 1500 + n * 720 + (Math.random() - 0.5) * 100);
  setTimeout(done, 1500 + 16 * 720 + 900);
})`);
/** The coop's eggs: each egg tapped out of its box in turn, the basket slid under the one falling. */
const playEggs = (X) => X.evaluate(`new Promise((done) => {
  document.querySelector('[data-town-game="eggs"] [data-game-start]').click();
  const E = window.__townEggs, cv = document.querySelector('[data-town-game="eggs"] canvas');
  let waited = 0;
  const tick = setInterval(() => {
    const eggs = E.eggs(), falling = eggs.filter((e) => e.out !== null && !e.landed).sort((a, b) => a.out - b.out)[0];
    if (falling) E.aim(E.box(falling.box));
    else if (++waited % 20 === 0) { const next = eggs.find((e) => e.out === null); if (next) { const r = cv.getBoundingClientRect(), x = r.left + E.box(next.box) * r.width, y = r.top + (40 / 240) * r.height; cv.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: x, clientY: y, pointerType: "touch" })); } }
    if (eggs.length && eggs.every((e) => e.landed)) { clearInterval(tick); setTimeout(done, 900); }
  }, 30);
  setTimeout(() => { clearInterval(tick); done(); }, 20000);
})`);
/** The fleece's swirl traced with a finger, a little off the line now and then. */
const playShear = (X) => X.evaluate(`new Promise((done) => {
  document.querySelector('[data-town-game="shear"] [data-game-start]').click();
  const cv = document.querySelector('[data-town-game="shear"] canvas'), pts = [];
  for (let i = 0; i < 44; i++) { const t = i / 43, a = t * 2.25 * Math.PI * 2 - Math.PI / 2, r = 96 + (16 - 96) * t; pts.push({ x: 160 + Math.cos(a) * r * 1.15, y: 128 + Math.sin(a) * r * 0.8 }); }
  const fine = [];
  for (let i = 1; i < pts.length; i++) for (let k = 0; k < 6; k++) fine.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 6, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 6 });
  fine.push(pts[pts.length - 1]);
  const at = (p) => { const r = cv.getBoundingClientRect(); return { clientX: r.left + (p.x / 320) * r.width, clientY: r.top + (p.y / 240) * r.height }; };
  cv.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 7, ...at(fine[0]) }));
  let i = 0;
  const tick = setInterval(() => {
    if (i >= fine.length) { if (!document.querySelector('[data-town-game="shear"]')) { clearInterval(tick); done(); } i = fine.length - 1; }
    cv.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "touch", pointerId: 7, buttons: 1, ...at(fine[i]) }));
    i++;
  }, 55);
  setTimeout(() => { clearInterval(tick); done(); }, 30000);
})`);

async function run(label) {
  const X = await browser(`animals-${label}`, SIZES[label]);
  const shot = async (name) => { await X.shot(`${OUT}/${label}-${name}.png`); };
  const phone = label !== "desktop";
  try {
    await enter(X, 9);
    await X.evaluate(`(${T}.reset(), ${T}.animalsClear(), ${T}.setGifts(false), ${T}.setLine("animals", 0), ${T}.fished({ ...${T}.purse(), coins: 30000 }))`);
    await warp(X, 160, 0);
    await until("the pasture's own code", () => X.evaluate(`!!${S}`), 40000);
    ok(`${label}: the pasture's rows are the farm and can be walked to`, await warp(X, 160, -1));
    await shot("01-entrance");

    // Uncle Popoto: a tap on him, his talk, his stall
    ok(`${label}: Uncle Popoto is tapped on the map`, await tapMap(X, "popoto"));
    await sleep(1200);
    const talk = await X.evaluate(`!!document.querySelector('[aria-labelledby="town-talk-h"]') && document.body.innerText.includes("ลุง Popoto")`);
    ok(`${label}: his talk opens with his name`, talk);
    for (let i = 0; i < 8 && !(await X.evaluate(`[...document.querySelectorAll("button")].some((e) => /รับลูกสัตว์/.test(e.innerText))`)); i++) { await X.evaluate(`document.querySelector('[aria-labelledby="town-talk-h"]')?.click()`); await sleep(400); }
    await sleep(500);
    await shot("02-talk");
    ok(`${label}: he asks what one came for`, await clickText(X, "/รับลูกสัตว์/"));
    await sleep(800);
    if (!(await X.evaluate(`!!document.querySelector("[data-animals-panel]")`))) await X.evaluate(`${S}.open("shop")`);
    await sleep(600);
    ok(`${label}: his stall opens`, await X.evaluate(`document.querySelector("[data-animals-panel]")?.dataset.view === "shop"`));
    await shot("03-shop");
    for (const sp of ["chicken", "cow", "sheep", "duck"]) await click(X, `[data-buy="${sp}"] button`), await sleep(500);
    ok(`${label}: four babies bought, into two producing places and two in the nursery`, (await mine(X)).length === 4, (await mine(X)).map((a) => a.place));
    ok(`${label}: the coins paid`, (await X.evaluate(`${T}.purse().coins`)) === 30000 - 400 - 4000 - 2500 - 1000);
    await click(X, '[data-shop-item="chickFeed"] button');
    await sleep(400);
    ok(`${label}: a sack of chicken feed bought`, (await held(X, "chickFeed")) === 1);
    await X.evaluate(`document.querySelector('[data-animals-panel] .overflow-y-auto').scrollTop = 99999`);
    await sleep(300);
    await shot("04-shop-end");

    // my animals: the card, fed and petted
    await click(X, '[data-animals-tab="mine"]'); await sleep(500);
    await shot("05-mine");
    const chick = (await mine(X)).find((a) => a.species === "chicken");
    await click(X, `[data-animal-card="${chick.id}"] button[aria-expanded]`); await sleep(400);
    await click(X, `[data-animal-card="${chick.id}"] [data-animal-actions] button`); await sleep(300);
    await click(X, `[data-picker="feed"] button`); await sleep(500);
    ok(`${label}: the chick is fed from the bag`, (await world(X)).animals.find((a) => a.id === chick.id).food > 20, await say(X));
    const petBefore = (await world(X)).animals.find((a) => a.id === chick.id).hearts;
    await until("the card's buttons are free again", () => X.evaluate(`[...document.querySelectorAll("button")].some((e) => /^ลูบหัว$/.test(e.innerText.trim()) && !e.disabled)`), 10000).catch(() => {});
    await X.evaluate(`[...document.querySelectorAll("button")].find((e) => /^ลูบหัว$/.test(e.innerText.trim()) && !e.disabled)?.click()`); await sleep(800);
    ok(`${label}: and petted (closer by a pet)`, (await world(X)).animals.find((a) => a.id === chick.id).hearts > petBefore);
    ok(`${label}: the line counts points`, (await X.evaluate(`${T}.lines().lines.animals.points`)) > 0);
    await shot("06-card");

    // the three games, played through to what they give
    await X.evaluate(`(${T}.animalsClear(), ${T}.grant("milker", 1), ${T}.grant("eggBasket", 1), ${T}.grant("woolShears", 1))`);
    const ids = await X.evaluate(`(() => { const t = ${T}, a = [t.animalGive("dairyCow", "adult", 8), t.animalGive("barnHen", "adult", 8), t.animalGive("meadowSheep", "adult", 8), t.animalGive("puddleDuck", "adult", 5)]; for (const x of a) t.animalSet(x.id, { banked: x.species === "chicken" ? 4 : x.species === "duck" ? 3 : x.species === "cow" ? 2 : 1, at: t.now() }); return a.map((x) => x.id); })()`);
    await X.evaluate(`${S}.close()`);
    await warp(X, 150, -11, 1500);
    await shot("07-ready-bubbles");
    for (const [i, game, item, play] of [[0, "milk", "farmMilk", playMilk], [1, "eggs", "farmEgg", playEggs], [2, "shear", "wool", playShear]]) {
      await X.evaluate(`${S}.play(${JSON.stringify(ids[i])})`);
      await sleep(900);
      ok(`${label}: the ${game} board is up`, await X.evaluate(`!!document.querySelector('[data-town-game="${game}"]')`));
      await shot(`08-${game}-ready`);
      const going = play(X);
      await sleep(game === "shear" ? 3500 : 4200);
      await shot(`09-${game}-on`);
      await going;
      await sleep(1500);
      const got = await held(X, item);
      ok(`${label}: the ${game} go gave ${item}`, got > 0, { got, said: await say(X) });
      await shot(`10-${game}-done`);
    }
    ok(`${label}: a day's manure with the first collection`, (await held(X, "manure")) >= 1);

    // the nest: two hens of three hearts and more, and the right offering
    await X.evaluate(`(() => { const t = ${T}; t.animalsClear(); t.animalGive("barnHen", "adult", 4); t.animalGive("barnHen", "adult", 5); t.grant("seedCorn", 2); t.grant("copperNodule", 1); t.grant("dewClover", 1); t.fished({ ...t.purse(), coins: 5000 }); })()`);
    await X.evaluate(`${S}.open("nest")`); await sleep(700);
    const hens = (await mine(X)).map((a) => a.id);
    await click(X, `[data-parent="${hens[0]}"]`); await sleep(300);
    await X.evaluate(`[...document.querySelectorAll('[data-parent="${hens[1]}"]')].at(-1)?.click()`); await sleep(400);
    await X.evaluate(`(() => { const s = document.querySelector("[data-offering]"); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; set.call(s, "seedCorn"); s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
    await sleep(400);
    await shot("11-nest");
    await click(X, "[data-breed]"); await sleep(700);
    const coming = (await mine(X)).filter((a) => a.born > (Date.now() - 1000));
    ok(`${label}: a child is on its way in the nest`, coming.length === 1, await say(X));
    await shot("12-nest-laid");
    await click(X, '[data-animals-tab="book"]'); await sleep(500);
    await shot("13-book");
    // friends' care: anybody may; and a friend's hungry animal to care for
    await X.evaluate(`(() => { const t = ${T}, w = t.animalWorld(), now = t.now(); const pal = { ...w.animals[0], id: "pal-cow", owner: "pal", species: "cow", breed: "jersey", name: "Mocha", food: 0, grown: 168, place: "producing" }; localStorage.setItem("cashtown.trial.animals.1", JSON.stringify({ ...w, animals: [...w.animals, pal], herds: [...w.herds, { owner: "pal", keeping: 0, facade: 0, care: "anybody", carers: [] }] })); t.grant("cowFeed", 2); })()`);
    await click(X, '[data-animals-tab="care"]'); await sleep(600);
    await clickText(X, "/^ทุกคน$/"); await sleep(200);
    await click(X, "[data-care-save]"); await sleep(500);
    { const id = await me(X); ok(`${label}: who may care is saved`, (await world(X)).herds.find((h) => h.owner === id)?.care === "anybody"); }
    ok(`${label}: the friend's hungry cow is offered to care for`, await X.evaluate(`!!document.querySelector('[data-friend-card="pal-cow"]')`));
    await shot("14-care");
    await X.evaluate(`${S}.close()`);

    // the gate opened: out they go to the meadow; eggs laid out, with their owner's name; the forage
    await warp(X, 156, -3);
    await shot("15-gate-chip");
    await click(X, '[data-gate="shut"]'); await sleep(600);
    ok(`${label}: the gate is opened by its chip`, (await world(X)).gate.some((g) => g[1] === null));
    await X.evaluate(`(() => { const t = ${T}; for (const a of t.animalWorld().animals) if (a.owner === window.__townKeeper.id && a.born <= t.now()) t.animalSet(a.id, { outside: [{ at: [150, -26], n: 2 }], outBands: 4 }); t.animalGive("dairyCow", "adult", 3); t.animalGive("meadowSheep", "young", 2); t.animalGive("puddleDuck", "adult", 2); })()`);
    await warp(X, 151, -24, 9000);
    await shot("16-meadow-open");
    let egg = null;
    for (let i = 0; i < 4 && !egg; i++) { egg = await hit(X, "egg"); if (!egg) await warp(X, 150, -24, 1500); }
    ok(`${label}: an egg laid out is there to pick`, !!egg, await X.evaluate(`${S}.hits().map((h) => h.kind).join(",")`));
    const eggsBefore = await held(X, "farmEgg");
    if (egg) { await press(X, egg.x, egg.y); await until("walked to the egg and picked it up", async () => (await held(X, "farmEgg")) > eggsBefore, 15000).catch(() => {}); }
    ok(`${label}: picked up by its owner`, (await held(X, "farmEgg")) > eggsBefore, await say(X));
    // (room in the bag for what the meadow gives)
    await X.evaluate(`${T}.fished({ ...${T}.purse(), bag: ${T}.purse().bag.map((x, i) => (i < 3 ? x : null)) })`);
    const forage = await hit(X, "forage");
    const bagBefore = await X.evaluate(`${T}.purse().bag.filter(Boolean).length`);
    if (forage) { await press(X, forage.x, forage.y); await sleep(6000); }
    ok(`${label}: a forage spot gathered`, (await X.evaluate(`${T}.purse().bag.filter(Boolean).length`)) > bagBefore, await say(X));
    await shot("17-forage");

    // the gifts' buttons on the farm; the bell rung; the hay wagon boarded
    await X.evaluate(`(${T}.setGifts(true), ${T}.charmsWear(["charmHerdBell"]))`);
    await warp(X, 150, -14, 1500);
    ok(`${label}: the gifts' buttons are there on the farm`, await X.evaluate(`["bell", "harp", "wind", "wagon"].every((p) => !!document.querySelector('[data-power="' + p + '"]'))`));
    await click(X, '[data-power="bell"]'); await sleep(2500);
    await shot("18-powers-bell");
    await X.evaluate(`${T}.animalWagon()`);
    await warp(X, 151, -1, 2500);
    await shot("19-wagon-stop");
    ok(`${label}: boarding is offered by the standing wagon`, await click(X, "[data-wagon-board]"));
    await sleep(2500);
    ok(`${label}: sat on the wagon`, await X.evaluate(`!!document.querySelector("[data-wagon-off]")`));
    await shot("20-wagon-on");
    await click(X, "[data-wagon-off]"); await sleep(800);
    // the cloud ram ridden
    await X.evaluate(`${T}.familiarWear("famCloudRam")`);
    await sleep(1500);
    await warp(X, 160, -6, 1500);
    await X.evaluate(`window.__townView.walk ? window.__townView.walk(165, -6) : 0`);
    await sleep(1200);
    await shot("21-ram");
    await X.evaluate(`${T}.familiarWear(null)`);

    if (!phone) console.log("  errors", JSON.stringify(X.errors()));
    ok(`${label}: no page errors`, X.errors().length === 0, X.errors());
  } finally { X.close(); }
  // by night: lying down where they were (a page of its own, its sky at nine in the evening)
  const N = await browser(`animals-${label}-night`, SIZES[label]);
  try {
    await enter(N, 21, "N");
    await until("the pasture's own code", () => N.evaluate(`!!${S}`), 40000).catch(() => {});
    await N.evaluate(`(() => { const t = ${T}; t.animalsClear(); for (const b of ["dairyCow", "meadowSheep", "barnHen", "puddleDuck", "jersey", "silkie"]) t.animalGive(b, "adult", 5); t.animalGive("dairyCow", "baby", 1); })()`);
    await N.evaluate(`window.__townView.warp(150, -14)`);
    await sleep(4000);
    await N.shot(`${OUT}/${label}-22-night.png`);
  } finally { N.close(); }
}

for (const label of ONLY === "all" ? ["desktop", "phone", "small"] : [ONLY]) {
  console.log(`— ${label}`);
  await run(label).catch((e) => { fail++; console.log(`  FAIL ${label}: ${e.message}`); });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
