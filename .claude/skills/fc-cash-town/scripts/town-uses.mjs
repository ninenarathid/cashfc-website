// What the specials are for (v325, lib/town/special-uses), in a real browser on the dev test room kept by the trial:
// the recipe book's ten shadows and the first maker of one cooked; the five buffs' chips; the feast table with a legend
// pot (eaten together), a pot with a carried buff, a covered pot, the golden cloth and the cushions laid (the panel, the
// hall's tables drawn with them, the town's news of the cloth); a blank recipe paper written; the first-rain egg offered on the farm;
// Granny's wool chips; moon sight's light at night. At 1280x860, 384x730 and 360x640, each scene photographed.
//   node town-uses.mjs <base> <outdir> [sizes: desk,phone,small]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3291", OUT = ".", SIZES = "desk,phone,small"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const SIZE = { desk: { width: 1280, height: 860 }, phone: { width: 384, height: 730 }, small: { width: 360, height: 640 } };
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const key = async (X, code, k) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: code.charCodeAt(3) }); await sleep(350); };
const YARD = [66, 47];
/** A real tap on the first element a selector (or a script giving one) finds: the page's own handlers, as a hand's. */
const tap = async (X, sel) => {
  const at = await X.evaluate(`JSON.stringify((() => { const e = ${sel.startsWith("(") ? sel : `document.querySelector(${JSON.stringify(sel)})`}; if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })())`);
  const p = JSON.parse(at);
  if (!p) return false;
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: p[0], y: p[1], button: "left", clickCount: 1 });
  await sleep(500);
  return true;
};
const T = "window.__townTrade", K = "window.__townKeeper";

for (const size of SIZES.split(",")) {
  const X = await browser(`uses-${size}`, SIZE[size]);
  const shot = (name) => X.shot(`${OUT}/${size}-${name}.png`);
  try {
    await X.goto(`${BASE}/town?townTest=U&townRoom=uses${size}&townMap=town2&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial", () => X.evaluate(`!!${T} && !!${K}`), 60000);
    // a clean purse each run: the bag emptied, coins, stamina
    await X.evaluate(`${T}.empty(); ${T}.setStamina(100); ${T}.grant("rice", 1, 20000)`);
    await sleep(500);

    // ── the recipe book: ten shadows, and a dish cooked has its first maker ──
    ok(`${size}: the keeper has the specials' uses`, await X.evaluate(`${K}.specialUses()`));
    const r = { needs: [["milk", 1], ["sugar", 1], ["fireflyEgg", 1]], in: ["steamer"] };
    await X.evaluate(`${JSON.stringify(r.needs)}.forEach(([i, n]) => ${T}.grant(i, n)); ${T}.grant("steamer", 1)`);
    const cooked = await X.evaluate(`JSON.stringify(${T}.cookDo(${JSON.stringify(r.needs)}, ["steamer"], 0, "Tester"))`);
    const c = JSON.parse(cooked);
    ok(`${size}: firefly custard cooked from its recipe`, c.ok && c.made === "fireflyCustard", c);
    await key(X, "KeyI", "i");
    await until("the bag", () => X.evaluate(`!!document.querySelector("[data-recipe-book]")`), 20000).catch(() => {});
    await tap(X, "[data-recipe-book] button");
    await sleep(800);
    const shadows = await X.evaluate(`[...document.querySelectorAll("button")].filter((e) => e.textContent.trim() === "???").length`);
    ok(`${size}: the book has the nine other dishes as shadows`, shadows >= 9, shadows);
    await shot("book");
    // a shadow's own page: its silhouette and its secret thing's clue
    await tap(X, `([...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "???"))`);
    await sleep(500);
    ok(`${size}: a shadow's page tells its secret thing's clue`, await X.evaluate(`!!document.querySelector("dialog[open] [data-recipe-shadow] [data-secret]")`));
    await shot("shadow");
    const closeBook = () => tap(X, `([...document.querySelectorAll("dialog[open] button")].find((b) => /ปิดสมุด|Close book/.test(b.textContent)))`);
    await closeBook(); await sleep(400); await key(X, "KeyI", "i"); await sleep(400);

    // ── the five buffs' chips ──
    await X.evaluate(`(() => { const p = ${K}.purse(), now = ${K}.now(); ${T}.fished({ ...p, buffs: [["gentle", 1], ["aroma", 2], ["featherlight", 3], ["moonSight", 4], ["luckyMatch", 2]].map(([id, level]) => ({ id, level, until: now + 3 * 3600000 })) }); })()`);
    await key(X, "KeyI", "i");
    await sleep(800);
    const chips = await X.evaluate(`["อ่อนโยน", "กลิ่นนำ", "ตัวเบา", "ตาจันทร์", "ฤกษ์ผสม"].filter((w) => document.body.innerText.includes(w)).length`);
    ok(`${size}: the bag shows the five buffs`, chips === 5, chips);
    await shot("buffs");

    // ── a blank recipe paper written ──
    await X.evaluate(`${T}.grant("blankRecipePaper", 1)`);
    // (and a dish whose scroll fetches more than the paper: its ink is shown, lib/town/special-uses' inkOf)
    await X.evaluate(`(() => { const p = ${K}.purse(); ${T}.fished({ ...p, made: [...new Set([...(p.made ?? []), "starPudding"])] }); })()`);
    await sleep(400);
    const paperAt = await X.evaluate(`${K}.purse().bag.findIndex((s) => s?.item === "blankRecipePaper")`);
    await tap(X, `[data-bag-slot="${paperAt}"] button`);
    await tap(X, "[data-bag-write]");
    await sleep(500);
    ok(`${size}: the paper offers the dish made`, await X.evaluate(`!!document.querySelector("[data-bag-write-recipe=fireflyCustard]")`));
    ok(`${size}: a richer scroll says its ink`, await X.evaluate(`Number(document.querySelector("[data-bag-write-recipe=starPudding]")?.dataset.ink) > 0 && /[0-9]/.test(document.querySelector("[data-bag-write-recipe=starPudding]")?.textContent ?? "")`));
    await shot("paper");
    await tap(X, "[data-bag-write-recipe=fireflyCustard]");
    await sleep(700);
    ok(`${size}: written: its scroll in the bag, the paper gone`, await X.evaluate(`${K}.purse().bag.some((s) => s?.item === "scrollFireflyCustard") && !${K}.purse().bag.some((s) => s?.item === "blankRecipePaper")`));
    await key(X, "KeyI", "i");

    // ── the feast table: a legend pot, a pot that carries a buff, a covered pot, the cloth and the cushions ──
    await X.evaluate(`window.__townView.warp(${YARD[0]}, ${YARD[1]})`);
    await sleep(2500);
    await X.evaluate(`${T}.empty()`);
    await X.evaluate(`(() => {
      const g = (i, n) => ${T}.grant(i, n);
      [["egg", 6], ["cream", 2], ["chili", 2], ["rebirthFlameEgg", 1]].forEach(([i, n]) => g(i, n)); ["oven", "cleaver", "panBrass", "pot"].forEach((t) => g(t, 1));
      window.__cooked = [${T}.cookDo([["egg", 6], ["cream", 2], ["chili", 2], ["rebirthFlameEgg", 1]], ["oven", "cleaver", "panBrass", "pot"], 0, "Tester")];
      [["silkieTwinEgg", 2], ["milk", 1], ["sugar", 1]].forEach(([i, n]) => g(i, n));
      window.__cooked.push(${T}.cookDo([["silkieTwinEgg", 2], ["milk", 1], ["sugar", 1]], ["pot"], 0, "Tester"));
      g("wholeGoldenFleece", 1); g("cloudFluffTuft", 1); g("shootingStarLock", 1);
    })()`);
    // (each pot set down a moment apart: the trial names a pot by its tester and the millisecond)
    for (let k = 0; k < 2; k++) { await X.evaluate(`(() => { const i = ${K}.purse().bag.findIndex((s) => s?.item === "potFull"); if (i >= 0) ${T}.potDown(${JSON.stringify(YARD)}, i); })()`); await sleep(300); }
    await sleep(400);
    const pots = await X.evaluate(`JSON.stringify(${K}.pots().filter((o) => o.feast).map((o) => [o.id, o.dish, o.carry ?? null]))`);
    console.log("  (pots)", pots, await X.evaluate(`JSON.stringify(window.__cooked.map((d) => [d.ok, d.why, d.made, d.n]))`));
    ok(`${size}: the legend pot and the carrying pot are on the table`, JSON.parse(pots).some((p) => p[1] === "phoenixBake") && JSON.parse(pots).some((p) => p[1] === "custard" && p[2] === "gentle"), pots);
    await X.evaluate(`window.__townCook?.feastShow(true)`);
    await sleep(900);
    ok(`${size}: the panel offers to lay the cloth and the cushions`, await X.evaluate(`!!document.querySelector("[data-feast-lay=cloth]") && !!document.querySelector("[data-feast-lay=cushions]")`));
    await tap(X, "[data-feast-lay=cloth]");
    await sleep(900);
    await tap(X, "[data-feast-lay=cushions]");
    await sleep(900);
    await tap(X, "[data-feast-pot] [data-feast-cover]");
    await sleep(900);
    ok(`${size}: cloth and cushions laid`, await X.evaluate(`document.querySelectorAll("[data-feast-laid]").length === 2`));
    ok(`${size}: the legend pot says it is eaten together`, await X.evaluate(`!!document.querySelector("[data-dish=phoenixBake] [data-feast-together]")`));
    ok(`${size}: the custard says what it carries`, await X.evaluate(`document.querySelector("[data-dish=custard] [data-feast-carry]")?.dataset.feastCarry === "gentle"`));
    ok(`${size}: a pot is covered`, await X.evaluate(`!!document.querySelector("[data-feast-covered]")`));
    await shot("feast");
    // a helping of the legend pot at the table, sitting
    await X.evaluate(`window.__townCook?.feastShow(false)`);
    await sleep(600);
    await X.evaluate(`window.__townView.zoom?.(3)`);
    await sleep(1500);
    await shot("hall");
    // the town's news of it, as the database's keeper tells it (the trial has no news of its own: the banner, by its handle)
    await X.evaluate(`window.__townAnnouncements?.show({ id: 9325, at: Date.now(), member: "test-cloth", name: "Mira", kind: "cloth", subject: "", level: 0, portrait: { look: null, expression: "neutral" } })`);
    await sleep(1500);
    ok(`${size}: the town is told of the golden cloth, in its own words`, await X.evaluate(`/ผ้าทองคำ|golden cloth/.test(document.querySelector("[data-town-announcement]")?.textContent ?? "")`));
    await shot("news");
    await tap(X, "[data-town-announcement] > button:last-child");
    ok(`${size}: and its banner put away by its own button`, await X.evaluate(`!document.querySelector("[data-town-announcement]")`));

    // ── the first-rain egg on the farm ──
    await X.evaluate(`${T}.empty(); ${T}.showGarden("Tester")`);
    await X.evaluate(`${T}.grant("firstRainEgg", 1)`);
    await sleep(300);
    await X.evaluate(`(() => { const i = ${K}.purse().bag.findIndex((s) => s?.item === "firstRainEgg"); ${K}.hold(i); })()`);
    const plot = await X.evaluate(`JSON.stringify(Object.keys(${K}.farm()).map((k) => k.split(",").map(Number)).find(([x, y]) => ${K}.rainAt(x + "," + y).length >= 3) ?? null)`);
    const at = JSON.parse(plot);
    ok(`${size}: a plot where the egg would water three or more`, !!at, plot);
    if (at) {
      await X.evaluate(`window.__townView.warp(${at[0]}, ${at[1]})`);
      await sleep(3000);
      ok(`${size}: the farm offers to throw it`, await X.evaluate(`!!document.querySelector("[data-farm-offer=rain]")`));
      await shot("rain");
      await tap(X, "[data-farm-offer=rain]");
      await sleep(1200);
      ok(`${size}: thrown: the egg gone`, await X.evaluate(`!${K}.purse().bag.some((s) => s?.item === "firstRainEgg")`));
    }

    // ── Granny's wool ──
    await X.evaluate(`${T}.grant("rareShadeLock", 1); ${T}.grant("rainbowArcLock", 1)`);
    await X.evaluate(`window.__townView.shop?.("tailor")`);
    await sleep(2500);
    await tap(X, "section[aria-labelledby=town-tailor-h] button[aria-pressed=false][title]");
    await sleep(900);
    ok(`${size}: Granny's checkout offers the wool`, await X.evaluate(`document.querySelectorAll("[data-tailor-wool-chip]").length === 2`));
    await tap(X, "[data-tailor-wool-chip=rareShadeLock]");
    await sleep(400);
    await shot("tailor");
    await key(X, "Escape", "Escape");
    await X.evaluate(`document.querySelector("[data-town-menu]") && null`);

    // ── moon sight at night ──
    await X.goto(`${BASE}/town?townTest=U&townRoom=uses${size}&townMap=town2&townHour=22&townWeather=clear`);
    await until("ready again", async () => (await status(X)) === "ready", 240000);
    await until("the trial again", () => X.evaluate(`!!${T} && !!${K}`), 60000);
    // the trial's clock to the next 22:00 in Bangkok, and moon sight at its fourth level
    await X.evaluate(`(() => { const now = ${K}.now(), h = new Date(now + 7 * 3600000).getUTCHours(), m = new Date(now + 7 * 3600000).getUTCMinutes(); ${T}.skipMinutes(((22 - h + 24) % 24) * 60 - m + 5); })()`);
    await X.evaluate(`(() => { const p = ${K}.purse(), now = ${K}.now(); ${T}.fished({ ...p, buffs: [{ id: "moonSight", level: 4, until: now + 3 * 3600000 }] }); })()`);
    await X.evaluate(`window.__townView.warp(30, 30)`);
    await sleep(3000);
    await shot("moon");
  } catch (e) { fail++; console.log("  THREW", e.message?.slice(0, 300)); }
  ok(`${size}: no page errors`, X.errors.length === 0, X.errors());
  console.log("  (console)", JSON.stringify((X.logs ?? []).filter((l) => l.startsWith("console.error")).slice(0, 6)));
  await X.close?.();
}
console.log(`town-uses: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
