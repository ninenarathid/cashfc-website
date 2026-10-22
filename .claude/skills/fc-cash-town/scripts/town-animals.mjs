// The animal line (docs/plans/animals, round 6): the animal farm east of the garden and its two gates, Uncle Popoto,
// the barns' plan and a barn bought, the stall's young of a sex, the cards' stats and care, a barn enlarged, Uncle's pen,
// animals handed on (offers in and out), friends' crosses (asks in and out, a loan), the nest's likely child, the three
// games played through, the barn's door (animals out to the meadows and the garden's lanes), walking into a barn (its
// inside shown, whoever is in it out of sight from outside), the one trough fed, the untended warnings, the book and the
// night: driven in a real browser on the dev test room (the trial keeper, no database). Screenshots of every state at
// desktop, phone and a small phone; PASS/FAIL lines for what can be read.
//
//   node town-animals.mjs <base> <outdir> [desktop|phone|small|all|ram]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3194", OUT = ".", ONLY = "all"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const S = "window.__townPasture", T = "window.__townTrade";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, mobile: true }, small: { width: 360, height: 640, mobile: true } };

async function enter(X, hour, who = "M") {
  await X.goto(`${BASE}/town?townTest=${who}&townRoom=pasture&townHour=${hour}&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
}
// (and the camera on where one stands: a lookAt before leaves it where it looked)
/** A real pointer moved (over the HUD in the top left, not the map): a page with no input for a while is taken as away and leaves its room (the site's bars come back). */
const alive = (X) => X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {});
const warp = async (X, x, y, ms = 2200) => { await alive(X); const r = await X.evaluate(`(() => { const r = window.__townView.warp(${x}, ${y}); window.__townView.lookAt(${x + 0.5}, ${y + 0.5}); return r; })()`); await sleep(ms); return r; };
const press = async (X, x, y) => {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const hit = (X, kind) => X.evaluate(`(${S}.hits().filter((h) => h.kind === ${JSON.stringify(kind)}).sort((a, b) => Math.hypot(a.x - innerWidth / 2, a.y - innerHeight / 2) - Math.hypot(b.x - innerWidth / 2, b.y - innerHeight / 2))[0] ?? null)`);
const tapMap = async (X, kind) => { const h = await hit(X, kind); if (!h) return false; await press(X, h.x, h.y); await sleep(700); return true; };
const click = async (X, sel) => (await alive(X), X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`));
const clickText = (X, re) => X.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((e) => ${re}.test(e.innerText)); if (!b) return false; b.click(); return true; })()`);
const choose = (X, sel, value) => X.evaluate(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); if (!s) return false; const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; set.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
const world = (X) => X.evaluate(`${S}.world()`);
const me = (X) => X.evaluate(`window.__townKeeper.id`);
const mine = async (X) => { const id = await me(X); return (await world(X)).animals.filter((a) => a.owner === id); };
const herd = async (X) => { const id = await me(X); return (await world(X)).herds.find((h) => h.owner === id) ?? null; };
const held = (X, id) => X.evaluate(`${T}.purse().bag.reduce((n, s) => n + (s?.item === ${JSON.stringify(id)} ? s.n : 0), 0)`);
const coins = (X) => X.evaluate(`${T}.purse().coins`);
const say = (X) => X.evaluate(`document.querySelector("[data-animals-said]")?.innerText ?? document.querySelector("[data-pasture-note]")?.innerText ?? ""`);
// (the panel's own list scrolled to a part of it: never the page, whose header would come down over the town)
const scrollPanel = (X, sel) => X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}), c = e?.closest(".overflow-y-auto"); if (!e || !c) return false; c.scrollTop += e.getBoundingClientRect().top - c.getBoundingClientRect().top - 28; window.scrollTo(0, 0); return true; })()`);
/** Every control of the panel and the map's chips shorter than 44 px (on a phone): none should be. */
const small = (X) => X.evaluate(`[...document.querySelectorAll("[data-pasture-panel] button, [data-pasture-panel] select, [data-pasture-chips] button")].filter((b) => b.offsetParent).map((b) => [b.innerText.trim().slice(0, 16), Math.round(b.getBoundingClientRect().height)]).filter(([, h]) => h < 44)`);

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
  // (the page itself never scrolled under the town: its header would come down over it)
  // (and the town back over the site's bars: a page reconnecting to its room shows them for a moment)
  const shot = async (name) => {
    await X.evaluate(`(window.scrollTo(0, 0), document.scrollingElement && (document.scrollingElement.scrollTop = 0))`);
    const over = await until("the town over the site's bars", () => X.evaluate(`!!document.querySelector("[data-town-hud-tier]")?.className.includes("inset-0")`), 40000).then(() => true).catch(() => false);
    // (nor mid view-transition: the site's header and tab bar are lifted over everything while one runs, globals.css)
    await until("no view transition running", () => X.evaluate(`!document.getAnimations().some((a) => String(a.effect?.pseudoElement ?? "").startsWith("::view-transition"))`), 15000).catch(() => {});
    await sleep(150);
    if (!over) console.log(`  (note: ${name} shot with the site's bars: ${JSON.stringify(await X.evaluate(`({ status: window.__cashTown?.status?.() ?? null, bars: localStorage.getItem("cashTown:bars"), full: !!document.fullscreenElement, hidden: document.visibilityState })`))})`);
    await X.shot(`${OUT}/${label}-${name}.png`);
  };
  const phone = label !== "desktop";
  const tall = async (what) => { if (phone) { const s = await small(X); ok(`${label}: every control of ${what} is 44 px tall or more`, s.length === 0, s); } };
  try {
    await enter(X, 9);
    await X.evaluate(`(${T}.reset(), ${T}.animalsClear(), ${T}.setGifts(false), ${T}.setLine("animals", 0), ${T}.fished({ ...${T}.purse(), coins: 30000 }))`);
    // ── the two gates in the garden's east rim, and the roads carried on through them
    await warp(X, 182, 21);
    await until("the pasture's own code", () => X.evaluate(`!!${S}`), 40000);
    await X.evaluate(`window.__townView.lookAt(187, 22)`); await sleep(1200);
    await shot("01-gate-north");
    await X.evaluate(`window.__townView.walk(191.5, 22.5)`);
    ok(`${label}: through the north gate along the road`, await until("in the animal farm", async () => (await X.evaluate(`window.__townView.self().x`)) > 189, 15000).then(() => true).catch(() => false));
    await warp(X, 182, 63);
    await X.evaluate(`window.__townView.lookAt(187, 64)`); await sleep(1200);
    await shot("02-gate-south");
    await X.evaluate(`window.__townView.walk(192.5, 64.5)`);
    ok(`${label}: through the south gate along its road`, await until("in the animal farm", async () => (await X.evaluate(`window.__townView.self().x`)) > 189, 15000).then(() => true).catch(() => false));
    ok(`${label}: the fence stops a walker between the gates`, !(await X.evaluate(`window.__townView.walkable(188, 40)`)) && await X.evaluate(`window.__townView.walkable(188, 22)`));
    // ── the whole animal farm from afar, friends in some of its barns
    await X.evaluate(`${T}.animalFriends()`);
    await warp(X, 214, 43);
    await X.evaluate(`(window.__townZoomFree = true, window.__townView.zoom(${phone ? 0.24 : 0.4}))`); await sleep(300);
    await X.evaluate(`window.__townView.lookAt(${phone ? 214 : 207}, 43)`); await sleep(9000);
    await shot("03-farm-whole");
    await X.evaluate(`(window.__townZoomFree = false, window.__townView.zoom(${phone ? 1.2 : 1.5}))`);

    // ── Uncle Popoto with no barn yet: his talk offers the barns first; the plan; one bought
    await warp(X, 191, 21);
    ok(`${label}: Uncle Popoto is tapped on the map`, await tapMap(X, "popoto"));
    await sleep(1200);
    for (let i = 0; i < 8 && !(await X.evaluate(`[...document.querySelectorAll("button")].some((e) => /เลือกซื้อโรง/.test(e.innerText))`)); i++) { await X.evaluate(`document.querySelector('[aria-labelledby="town-talk-h"]')?.click()`); await sleep(400); }
    await shot("04-talk-nobarn");
    ok(`${label}: with no barn he offers one first`, await clickText(X, "/เลือกซื้อโรง/"));
    await sleep(900);
    if (!(await X.evaluate(`document.querySelector("[data-animals-panel]")?.dataset.view === "barn"`))) await X.evaluate(`${S}.open("barn")`);
    await sleep(500);
    ok(`${label}: the barns' plan opens, 24 barns`, await X.evaluate(`document.querySelectorAll("[data-barn-cell]").length === 24`));
    ok(`${label}: a friend's barn can't be picked`, await X.evaluate(`document.querySelectorAll('[data-barn-state="taken"]').length >= 3 && [...document.querySelectorAll('[data-barn-state="taken"]')].every((b) => b.disabled)`));
    await shot("05-picker");
    await tall("the barns' plan");
    await click(X, '[data-barn-cell="9"]'); await sleep(400);
    await scrollPanel(X, "[data-barn-pick]"); await sleep(300);
    ok(`${label}: a free barn picked shows its price, logs short`, await X.evaluate(`!!document.querySelector('[data-barn-buy="9"]')?.disabled && !!document.querySelector('[data-need="log"][data-short="true"]')`));
    await shot("06-picker-price");
    await X.evaluate(`(${T}.grant("log", 99), ${T}.grant("stoneTile", 60))`); await sleep(600);
    const before = await coins(X);
    await click(X, '[data-barn-buy="9"]'); await sleep(900);
    { const h = await herd(X); ok(`${label}: barn 10 bought, two places, its first stage's coins`, h?.barn === 9 && h.room === 2 && before - (await coins(X)) === 500, { h, said: await say(X) }); }
    ok(`${label}: the panel turns to my barn`, await X.evaluate(`document.querySelector("[data-animals-panel]")?.dataset.view === "mine"`));
    await shot("07-mine-barn");

    // ── the stall: young of a sex chosen; a third past the barn's two waits in Uncle's pen
    await click(X, '[data-animals-tab="shop"]'); await sleep(500);
    // (both sexes shown: a hen chick and a ewe-or-ram lamb, a drake and a bull calf; each card says what its sex gives)
    const pickSex = async (sp, x) => { for (let i = 0; i < 5 && !(await X.evaluate(`document.querySelector('[data-buy="${sp}"] [data-sex-pick="${x}"]')?.getAttribute("aria-checked") === "true"`)); i++) { await click(X, `[data-buy="${sp}"] [data-sex-pick="${x}"]`); await sleep(250); } };
    for (const sp of ["duck", "sheep", "cow"]) await pickSex(sp, "m");
    ok(`${label}: each young's card says what the sex chosen gives`, await X.evaluate(`document.querySelector('[data-buy="chicken"] [data-yields]')?.dataset.yields === "yes" && document.querySelector('[data-buy="duck"] [data-yields]')?.dataset.yields === "no" && document.querySelector('[data-buy="sheep"] [data-yields]')?.dataset.yields === "yes" && document.querySelector('[data-buy="cow"] [data-yields]')?.dataset.yields === "no" && !!document.querySelector("[data-cross-rule]")`));
    await scrollPanel(X, "[data-cross-rule]"); await sleep(200);
    await shot("08-shop-sex");
    await scrollPanel(X, '[data-buy="sheep"]'); await sleep(200);
    await shot("08b-shop-sex-more");
    await tall("the stall");
    await click(X, '[data-buy="chicken"] [data-buy-go]'); await sleep(700);
    await click(X, '[data-buy="sheep"] [data-buy-go]'); await sleep(700);
    await pickSex("sheep", "f");
    await click(X, '[data-buy="sheep"] [data-buy-go]'); await sleep(700);
    { const m = await mine(X); ok(`${label}: a hen chick, a ram lamb and a ewe lamb; the third past the barn's two in the pen`, m.length === 3 && m.filter((a) => a.sex === "m").length === 1 && m.filter((a) => a.home === "pen").length === 1, m.map((a) => [a.species, a.sex, a.home])); }
    // ── enlarged to four; the one in the pen moved in
    await click(X, '[data-animals-tab="mine"]'); await sleep(500);
    await click(X, "[data-enlarge-buy]"); await sleep(800);
    ok(`${label}: the barn enlarged to four`, (await herd(X))?.room === 4, await say(X));
    await click(X, "[data-to-pen]"); await sleep(600);
    await click(X, '[data-pen-list] [data-move="barn"]'); await sleep(700);
    ok(`${label}: the one in the pen moved into the barn`, (await mine(X)).every((a) => a.home === "barn"), await say(X));
    // ── a card: its sex, its three stats, how well it is cared for
    await X.evaluate(`(() => { const t = ${T}; for (const a of t.animalWorld().animals.filter((x) => x.owner === window.__townKeeper.id)) t.animalSet(a.id, { grown: 999, hearts: 120, streak: 6, food: 18 }); t.animalGive("barnHen", "adult", 6, "m"); })()`);
    await click(X, '[data-animals-tab="mine"]'); await sleep(500);
    const ram = (await mine(X)).find((a) => a.species === "sheep" && a.sex === "m");
    await click(X, `[data-animal-card="${ram.id}"] button[aria-expanded]`); await sleep(400);
    await scrollPanel(X, `[data-animal-card="${ram.id}"]`); await sleep(200);
    ok(`${label}: the card shows its sex, three stats and its care`, await X.evaluate(`(() => { const c = document.querySelector('[data-animal-card="${ram.id}"]'); return c?.dataset.sex === "m" && c.querySelectorAll("[data-stat]").length === 3 && !!c.querySelector("[data-care]"); })()`));
    await shot("09-card-stats");
    await tall("an open card");

    // ── the three games, played through to what they give (a ewe's fleece; a hen's eggs; the friend's cow is not mine, so the cow is given)
    // (the bag cleared to the games' tools first: a go whose produce has no room is refused whole, never half lost)
    await X.evaluate(`(() => { const t = ${T}; t.fished({ ...t.purse(), bag: t.purse().bag.map((x) => (x && ["milker", "eggBasket", "woolShears"].includes(x.item) ? x : null)) }); t.grant("milker", 1); t.grant("eggBasket", 1); t.grant("woolShears", 1); for (const a of t.animalWorld().animals.filter((x) => x.owner === window.__townKeeper.id && x.home === "barn")) t.animalSet(a.id, { banked: a.species === "chicken" ? 4 : 1, at: t.now() }); })()`);
    const ewe = (await mine(X)).find((a) => a.species === "sheep" && a.sex === "f"), hen = (await mine(X)).find((a) => a.species === "chicken" && a.sex === "f");
    await X.evaluate(`${S}.close()`);
    for (const [id, game, item, play] of [[hen.id, "eggs", "farmEgg", playEggs], [ewe.id, "shear", "wool", playShear]]) {
      await X.evaluate(`${S}.play(${JSON.stringify(id)})`);
      await sleep(900);
      ok(`${label}: the ${game} board is up`, await X.evaluate(`!!document.querySelector('[data-town-game="${game}"]')`));
      const going = play(X);
      await sleep(3500);
      if (game === "eggs") await shot("10-game-eggs");
      await going;
      await sleep(1500);
      ok(`${label}: the ${game} go gave ${item}`, (await held(X, item)) > 0, await say(X));
    }

    // ── Uncle's pen and handing on: one offered me (taken), one of mine offered a friend
    await X.evaluate(`(${T}.animalFriends(), ${T}.animalMine())`); await sleep(400);
    await X.evaluate(`${S}.open("pen")`); await sleep(700);
    ok(`${label}: an offer in and mine out are shown`, await X.evaluate(`!!document.querySelector("[data-offers-in] [data-offer-take]") && !!document.querySelector("[data-offers-out] [data-unoffer]")`));
    await shot("11-pen-offers");
    await tall("the pen");
    await click(X, "[data-offers-in] [data-offer-take]"); await sleep(800);
    ok(`${label}: the offered duck is mine, waiting in my pen`, (await mine(X)).some((a) => a.species === "duck" && a.home === "pen"), await say(X));
    await scrollPanel(X, "[data-offers-out]"); await sleep(200);
    await shot("12-pen-handon");

    // ── the nest: a friend's ask for mine (lent), the child's likely stats, a cross told; my ask out
    await click(X, '[data-animals-tab="nest"]'); await sleep(600);
    ok(`${label}: a friend's ask for one of mine is shown`, await X.evaluate(`!!document.querySelector("[data-asks-in] [data-ask-yes]")`));
    await shot("13-nest-asks-in");
    await click(X, "[data-asks-in] [data-ask-yes]"); await sleep(800);
    ok(`${label}: said yes, mine is lent for an hour`, (await mine(X)).some((a) => a.lent && a.lent.until > 0), await say(X));
    const hens = (await mine(X)).filter((a) => a.species === "chicken" && a.home === "barn" && !(a.lent && a.lent.until > 0));
    const mom = hens.find((a) => a.sex === "f"), dad = hens.find((a) => a.sex === "m");
    await X.evaluate(`(() => { const t = ${T}; for (const id of ${JSON.stringify(hens.map((a) => a.id))}) t.animalSet(id, { hearts: 140, streak: 7, rest: 0 }); t.grant("seedCorn", 2); })()`);
    await sleep(500);
    if (mom && dad) {
      await click(X, `[data-parent="${mom.id}"]`); await sleep(300);
      await X.evaluate(`[...document.querySelectorAll('[data-parent="${dad.id}"]')].at(-1)?.click()`); await sleep(400);
    }
    ok(`${label}: the child's likely stats, a range each`, await X.evaluate(`document.querySelectorAll("[data-nest-range] [data-stat]").length === 3`));
    await scrollPanel(X, "[data-nest-range]"); await sleep(200);
    await shot("14-nest-range");
    await tall("the nest");
    await choose(X, "[data-offering]", "seedCorn"); await sleep(300);
    await click(X, "[data-breed]"); await sleep(900);
    ok(`${label}: a cross told with the child's sex and stats`, await X.evaluate(`!!document.querySelector("[data-nest-result]") && document.querySelectorAll("[data-nest-result] [data-stat]").length === 3`), await say(X));
    await scrollPanel(X, "[data-nest-result]"); await sleep(200);
    await shot("15-nest-result");
    await choose(X, "[data-ask-mine]", ewe.id); await sleep(500);
    await until("a friend's ram to ask for", () => X.evaluate(`!!document.querySelector("[data-ask-list] [data-ask]:not(:disabled)")`), 10000).catch(() => {});
    await click(X, "[data-ask-list] [data-ask]");
    await until("the ask is out", async () => (await world(X)).asks.some((q) => q.mine === ewe.id), 8000).catch(() => {});
    ok(`${label}: an ask sent to a friend for my ewe`, (await world(X)).asks.some((q) => q.mine === ewe.id), await say(X));
    await scrollPanel(X, "[data-asks-out]"); await sleep(200);
    await shot("16-nest-asks-out");
    await X.evaluate(`${S}.close()`); await sleep(300);

    // ── my barn's door: opened at it; the animals out to the meadows and the garden's lanes
    const b = (await X.evaluate(`${S}.barns()`))[9];
    await warp(X, b.x + 4, b.y + b.h + 1, 2500);
    ok(`${label}: the door's chip at my barn's door`, await X.evaluate(`!!document.querySelector('[data-door="shut"]')`));
    await shot("17-door-chip");
    await tall("the map's chips");
    await click(X, '[data-door="shut"]'); await sleep(1500);
    ok(`${label}: the door opened`, (await herd(X)).door.some((d) => d[1] === null));
    await sleep(7000);
    await shot("18-door-open");
    await X.evaluate(`${T}.skipHours(0.25)`); await sleep(2000);
    let out = null;
    for (let i = 0; i < 14 && !out; i++) {
      await warp(X, 165, 30, 1200);
      out = Object.values(await X.evaluate(`${S}.spots()`)).find((p) => p.x < 187 && p.inside < 0) ?? null;
      if (!out) await X.evaluate(`${T}.skipHours(0.17)`);
    }
    ok(`${label}: an animal out walks the garden's lanes`, !!out);
    if (out) { await warp(X, Math.floor(out.x) - 2, Math.floor(out.y) + 3, 1800); await X.evaluate(`window.__townView.lookAt(${out.x}, ${out.y + 1})`); await sleep(600); await shot("19-garden-lane"); }
    await warp(X, 209, 38, 2500);
    await shot("20-meadow-out");
    ok(`${label}: animals out on the meadows`, Object.values(await X.evaluate(`${S}.spots()`)).some((p) => p.x > 195 && p.y > 34 && p.y < 47));

    // ── walking into a barn: its roof off for whoever is in it; the trough fed
    // (the door shut, and the clock on a while: everybody home, settled in the barn)
    await X.evaluate(`(${T}.animals({ action: "door", open: false }), ${T}.skipHours(0.12))`);
    await warp(X, b.x + 4, b.y + b.h + 1, 1500);
    await X.evaluate(`window.__townView.walk(${b.x + 4.5}, ${b.y + 1.5})`);
    await until("inside the barn", async () => { const p = await X.evaluate(`window.__townView.self()`); return p.y < b.y + 3 && !p.moving; }, 15000).catch(() => {});
    await X.evaluate(`window.__townView.lookAt(${b.x + 4}, ${b.y + 2})`);
    await sleep(1500);
    ok(`${label}: walked in by the door, the roof off`, (await X.evaluate(`${S}.roofs()`))[9] === 0, await X.evaluate(`${S}.roofs()`));
    await shot("21-inside");
    // (room in the bag for the feed: the games and the nest filled it)
    await X.evaluate(`(() => { const t = ${T}; t.fished({ ...t.purse(), bag: t.purse().bag.map((x, i) => (i < 3 ? x : null)) }); for (const a of t.animalWorld().animals.filter((x) => x.owner === window.__townKeeper.id && x.home === "barn")) t.animalSet(a.id, { food: a.species === "sheep" ? 0 : 6, at: t.now() }); t.grant("chickFeed", 3); t.grant("sheepFeed", 3); })()`);
    await sleep(800);
    // (by its label: whoever stands before the trough is tapped there, as an animal would be)
    { const h = await X.evaluate(`${S}.hits().find((h) => h.kind === "trough" && h.tag) ?? null`); ok(`${label}: the trough is tapped by its label`, !!h); if (h) { await press(X, h.x, h.y); await sleep(700); } }
    await sleep(700);
    ok(`${label}: the trough opens, a slot a place`, await X.evaluate(`document.querySelectorAll("[data-animals-trough] [data-trough-slot]").length === 4`));
    await shot("22-trough");
    await tall("the trough");
    await click(X, "[data-trough-fill]"); await sleep(2200);
    ok(`${label}: every slot filled from the bag`, (await mine(X)).filter((a) => a.home === "barn" && a.born <= Date.now() + 3_600_000 * 10 && a.grown > 0).every((a) => a.food >= 23), (await mine(X)).map((a) => [a.species, a.home, Math.round(a.food)]));
    await shot("23-trough-filled");
    await X.evaluate(`${S}.close()`);

    // ── left untended: warned on coming to the farm and in my barn's panel
    await X.evaluate(`${T}.animalHerd({ untendedDays: 22 })`);
    await warp(X, 30, 30, 2500);
    await warp(X, 191, 22, 3500);
    ok(`${label}: warned of the untended barn on coming to the farm`, /ไม่มีใครดูแล/.test(await say(X)), await say(X));
    await shot("24-warning-arrival");
    await X.evaluate(`${S}.open("mine")`); await sleep(700);
    ok(`${label}: and in my barn's panel`, await X.evaluate(`!!document.querySelector("[data-untended]")`));
    await shot("25-warning-panel");
    await click(X, '[data-animals-tab="book"]'); await sleep(500);
    await shot("26-book");
    await X.evaluate(`${S}.close()`);

    if (!phone) console.log("  errors", JSON.stringify(X.errors()));
    ok(`${label}: no page errors`, X.errors().length === 0, X.errors());
  } finally { X.close(); }
  // by night: lying down in the barn
  const N = await browser(`animals-${label}-night`, SIZES[label]);
  try {
    await enter(N, 21, "N");
    await until("the pasture's own code", () => N.evaluate(`!!${S}`), 40000).catch(() => {});
    await N.evaluate(`(() => { const t = ${T}; t.animalsClear(); t.animalHerd({ barn: 9, room: 4 }); for (const b of ["dairyCow", "meadowSheep", "barnHen", "puddleDuck"]) t.animalGive(b, "adult", 5); })()`);
    const b = (await N.evaluate(`${S}.barns()`))[9];
    await N.evaluate(`window.__townView.warp(${b.x + 4}, ${b.y + 2})`);
    await sleep(4000);
    await N.shot(`${OUT}/${label}-27-night-inside.png`);
  } finally { N.close(); }
}

/** The cloud ram's second seat; and whoever is inside a barn is out of sight from outside it. */
async function ramSeat() {
  const X = await browser("animals-ram", SIZES.desktop);
  try {
    const tag = String(Date.now() % 100000);
    await enter(X, 9, `R${tag}`);
    await until("the pasture's own code", () => X.evaluate(`!!${S}`), 40000);
    await X.evaluate(`(${T}.setGifts(true), ${T}.familiarWear("famCloudRam"))`);
    await warp(X, 205, 36);
    const P = await X.tab("RamFriend", SIZES.phone);
    await enter(P, 9, `Q${tag}`);
    await until("the friend's pasture code", () => P.evaluate(`!!${S}`), 40000);
    await warp(P, 206, 36);
    await warp(X, 205, 36);
    // (put on, the ram is walked beside: nobody to ask until the rider gets on, by its power's button: 2026-10-22)
    await until("the button to get on", () => X.evaluate(`document.querySelector("[data-town-ride]")?.dataset.townRide === "off"`), 15000).catch(() => {});
    ok("ram: put on, it is walked beside, and nobody is offered to ask yet", await X.evaluate(`document.querySelector("[data-town-ride]")?.dataset.townRide === "off" && !document.querySelector("[data-ram-ask]")`));
    await X.shot(`${OUT}/desktop-27a-ram-beside.png`);
    ok("ram: its button gets on", await click(X, "[data-town-ride]"));
    await until("the rider is offered to ask", () => X.evaluate(`!!document.querySelector("[data-ram-ask]")`), 90000).catch(() => {});
    ok("ram: the rider is offered to ask the member beside them", await click(X, "[data-ram-ask]"));
    await until("the invite has come", () => P.evaluate(`!!document.querySelector("[data-ram-invite]")`), 15000).catch(() => {});
    ok("ram: the member is asked onto the ram", await P.evaluate(`!!document.querySelector("[data-ram-invite]")`));
    await P.evaluate(`document.querySelector("[data-ram-invite] button")?.click()`);
    await sleep(1500);
    ok("ram: sat behind the rider", (await P.evaluate(`${S}.seat()`))?.startsWith("r:"), await P.evaluate(`${S}.seat()`));
    await X.evaluate(`window.__townView.walk(212, 36)`);
    await sleep(5000);
    const [a, b] = [await X.evaluate(`${S}.self()`), await P.evaluate(`${S}.self()`)];
    ok("ram: carried along where the rider goes", !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y) < 1.2, { a, b });
    await P.evaluate(`document.querySelector("[data-ram-off]")?.click()`);
    await sleep(1200);
    ok("ram: got down", !(await P.evaluate(`${S}.seat()`)));
    // (the friend walks into barn 6: out of sight for the rider outside it, in sight for the friend inside)
    await X.evaluate(`${T}.familiarWear(null)`);
    const barn = (await X.evaluate(`${S}.barns()`))[5];
    await warp(X, barn.x + 4, barn.y + barn.h + 2);
    await warp(P, barn.x + 4, barn.y + 1, 3500);
    const friend = await P.evaluate(`window.__townKeeper.id`);
    // (another page sees a warp as the walk there: waited for until it is in)
    await until("the friend seen in the barn", async () => { const p = await X.evaluate(`window.__townView.at(${JSON.stringify(friend)})`); return !!p && !p.moving && p.y < barn.y + barn.h && p.x >= barn.x; }, 40000).catch(() => {});
    await sleep(800);
    const seen = await X.evaluate(`window.__townView.at(${JSON.stringify(friend)})`);
    ok("barn: the friend stands in barn 6", !!seen && seen.y < barn.y + barn.h && seen.x >= barn.x, seen);
    ok("barn: whoever is inside a barn is out of sight from outside it", !!seen && await X.evaluate(`${S}.hides(${seen?.x ?? 0}, ${seen?.y ?? 0})`));
    ok("barn: and the friend inside sees in", (await P.evaluate(`${S}.roofs()`))[5] === 0, await P.evaluate(`${S}.roofs()`));
    await X.shot(`${OUT}/desktop-28-outside-friend-inside.png`);
    await P.shot(`${OUT}/phone-28-friend-inside.png`);
    ok("ram: no page errors", X.errors().length === 0 && P.errors().length === 0, [...X.errors(), ...P.errors()]);
  } finally { X.close(); }
}

if (ONLY === "all" || ONLY === "ram") { console.log("— ram"); await ramSeat().catch((e) => { fail++; console.log(`  FAIL ram: ${e.message}`); }); }
for (const label of ONLY === "all" ? ["desktop", "phone", "small"] : ONLY === "ram" ? [] : [ONLY]) {
  console.log(`— ${label}`);
  await run(label).catch((e) => { fail++; console.log(`  FAIL ${label}: ${e.message}`); });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
