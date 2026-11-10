// The village's animal book in the bag (components/town/TownAnimalBook, lib/town/animal-book; the owner, 2026-11-10:
// "จะมีสมุดสายเลี้ยงสัตว์ไหม", then "ทำเลย"): driven in a real browser on the dev test room (the trial keeper, no database),
// at desktop, phone and a small phone.
//
// - the bag has the book, closed, after the farm book, with its own icon and the count of its pages;
// - opened, the four species are its categories and every breed a page: one bred by somebody shows its picture, name,
//   tier and who bred it first; one nobody has bred is a silhouette that says so;
// - each B–H page has its special: a shadow until the village finds it, then who found it first and how many times I
//   have, its habit's kind, and the habit itself at my third find;
// - a species nobody has bred past A: its starter open, the rest silhouettes, every special a shadow;
// - the pasture's own book (TownAnimals' "สมุด") tells the same, from the same function;
// - Escape shuts the book; every control a finger's size on a phone; no page errors.
//
// Prints PASS/FAIL lines and writes the shots to <outdir>: <size>-<n>-<state>.png.
//
//   node town-animal-book.mjs <base> <outdir> [desktop|phone|small|all]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", ONLY = "all"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const T = "window.__townTrade", P = "window.__townPasture";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, mobile: true }, small: { width: 360, height: 640, mobile: true } };
const FRIEND = "trial-friend-มะลิ";
const DIALOG = `document.querySelector("dialog[open] [data-notebook-reader]")`;

async function enter(X, who) {
  await X.goto(`${BASE}/town?townTest=${who}&townRoom=animalbook&townHour=10&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
}
/** The trial's pasture told as the village would have it: two hens bred (one by me, one by a friend), two of their specials found, none of the ducks past their starter. */
const village = (me) => ({
  animals: [], herds: [], spells: [], wagons: [], offers: [], asks: [],
  found: { silkie: { by: FRIEND, at: 1 }, araucana: { by: me, at: 2 }, jersey: { by: FRIEND, at: 3 } },
  specials: { silkie: { by: me, at: 4 }, araucana: { by: FRIEND, at: 5 } },
});
/** The bag's own scrolling list moved to show a thing in it (never the page, whose header would come down over the town). */
const scrollTo = (X, sel, at = "end") => X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false;
  let c = e.parentElement; while (c && !(c.scrollHeight > c.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(c).overflowY))) c = c.parentElement;
  if (!c) return false; const r = e.getBoundingClientRect(), b = c.getBoundingClientRect();
  c.scrollTop += ${JSON.stringify(at)} === "end" ? r.bottom - b.bottom + 12 : r.top - b.top - 12; window.scrollTo(0, 0); return true; })()`);
const clickIn = (X, root, sel, re) => X.evaluate(`(() => { const r = ${root}; const b = r && [...r.querySelectorAll(${JSON.stringify(sel)})].find((e) => ${re}.test(e.innerText.replace(/\\s+/g, " "))); if (!b || b.disabled) return false; b.click(); return true; })()`);
const pageOf = (X) => X.evaluate(`(() => { const p = ${DIALOG}?.querySelector("[data-animal-page]"); if (!p) return null; const s = p.querySelector("[data-animal-special]");
  return { id: p.dataset.animalPage, found: p.dataset.found === "true", text: p.innerText.replace(/\\s+/g, " "), first: p.querySelector("[data-animal-first]")?.innerText.replace(/\\s+/g, " ") ?? null,
    special: s ? { seen: s.dataset.seen === "true", mine: +s.dataset.mine, first: s.querySelector("[data-special-first]")?.innerText.replace(/\\s+/g, " ") ?? null, habit: s.querySelector("[data-habit-known]")?.innerText ?? null, kind: s.querySelector("[data-animal-habit]")?.dataset.animalHabit ?? null } : null }; })()`);
/** The picture at the page's head: how many of its pixels are drawn, and how many of those are the silhouette's colour. */
const picOf = (X) => X.evaluate(`(() => { const c = ${DIALOG}?.querySelector("[data-notebook-page] canvas"); if (!c || !c.width) return null; const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let drawn = 0, shade = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { drawn++; if (Math.abs(d[i] - 0x3a) < 3 && Math.abs(d[i + 1] - 0x42) < 3 && Math.abs(d[i + 2] - 0x56) < 3) shade++; } return { drawn, shade }; })()`);
/** Go to a breed's page: its species' category, then its place in the contents (A to H). */
async function go(X, species, letterIndex) {
  await clickIn(X, DIALOG, '[role="group"] button', new RegExp(`^${species}`).toString());
  await sleep(200);
  await X.evaluate(`${DIALOG}.querySelectorAll("nav button")[${letterIndex}]?.click()`);
  await until("the page's picture", async () => ((await picOf(X))?.drawn ?? 0) > 0, 15000).catch(() => {});
  await sleep(250);
}
/** Every control of the bag's books and of the open book shorter than 44 px (a finger's size). */
const small = (X) => X.evaluate(`[...document.querySelectorAll("[data-animal-book] > section > button, dialog[open] button")].filter((b) => b.offsetParent).map((b) => [b.innerText.trim().slice(0, 14), Math.round(b.getBoundingClientRect().height)]).filter(([, h]) => h < 43.5)`);

async function run(label) {
  const X = await browser(`animal-book-${label}`, SIZES[label]);
  const phone = label !== "desktop";
  // (on a phone the open book's leaf is taller than the screen: the book scrolled just so far that its special and habit
  // are above the page-turning foot, which stays at the screen's foot, before a shot)
  const shot = async (n, name) => {
    if (phone && n > 1) {
      await X.evaluate(`(() => { const d = document.querySelector("dialog[open]"), s = d?.querySelector("[data-animal-special]") ?? d?.querySelector("[data-animal-page]"), f = d?.querySelector("footer");
        if (!d || !s || !f) return; const by = s.getBoundingClientRect().bottom - f.getBoundingClientRect().top + 8; if (by > 0) d.scrollTop += by; })()`);
      await sleep(300);
    }
    await X.shot(`${OUT}/${label}-${n}-${name}.png`);
  };
  try {
    await enter(X, `B${label[0].toUpperCase()}${Date.now() % 10000}`);
    await X.evaluate(`(() => { const t = ${T}; t.animalsClear(); localStorage.setItem("cashtown.trial.animals.2", ${JSON.stringify(JSON.stringify(village("ME")))}.replaceAll('"ME"', JSON.stringify(window.__townKeeper.id)));
      t.fished({ ...t.purse(), animalSpecials: { silkie: 3, araucana: 1 } }); })()`);
    // (the bag, by its button: the I key's)
    await X.evaluate(`document.querySelector('button[aria-keyshortcuts="I"]')?.click()`);
    await until("the bag", () => X.evaluate(`!!document.querySelector("[data-animal-book]")`), 20000).catch(() => {});
    const order = await X.evaluate(`[...document.querySelectorAll("[data-bug-book], [data-fish-book], [data-farm-book], [data-animal-book]")].map((e) => [...e.attributes].find((a) => a.name.endsWith("-book")).name)`);
    ok(`${label}: the bag has the animal book, after the farm book`, order.at(-1) === "data-animal-book" && order.at(-2) === "data-farm-book", order);
    const cover = await X.evaluate(`document.querySelector("[data-animal-book] section > button")?.innerText.replace(/\\s+/g, " ") ?? ""`);
    ok(`${label}: its cover is closed, names it and counts its 32 pages`, /สมุดเลี้ยงสัตว์ของหมู่บ้าน/.test(cover) && /32/.test(cover) && !(await X.evaluate(`!!${DIALOG}`)), cover);
    await scrollTo(X, "[data-animal-book]"); await sleep(400);
    await shot(1, "bag-books");
    if (phone) ok(`${label}: the book's cover a finger's size`, (await small(X)).length === 0, await small(X));

    // open: the hens, found and not
    await X.evaluate(`document.querySelector("[data-animal-book] section > button").click()`);
    await until("the book open", () => X.evaluate(`!!${DIALOG}`), 10000).catch(() => {});
    const cats = await X.evaluate(`[...${DIALOG}.querySelectorAll('[role="group"] button')].map((b) => b.innerText.replace(/\\s+/g, " ").trim())`);
    ok(`${label}: open, its categories are the four species, eight pages each`, cats.length === 5 && ["ไก่ 8", "เป็ด 8", "แกะ 8", "วัว 8"].every((c) => cats.includes(c)), cats);
    await go(X, "ไก่", 1);
    const titles = await X.evaluate(`[...${DIALOG}.querySelectorAll("nav button")].map((b) => b.innerText.trim())`);
    ok(`${label}: the hens' contents: the bred by name, the rest not found`, titles.slice(0, 3).join("|") === "ไก่บ้าน|ไก่ซิลกี้|ไก่อาราอูคาน่า" && titles.slice(3).every((x) => x === "ยังไม่พบ"), titles);
    const silkie = await pageOf(X);
    ok(`${label}: a bred breed's page: its tier and who bred it first`, silkie?.id === "silkie" && silkie.found && /พันธุ์แท้/.test(silkie.text) && /เพาะได้คนแรก มะลิ/.test(silkie.first ?? ""), silkie);
    ok(`${label}: its picture is drawn, not a silhouette`, await picOf(X).then((p) => !!p && p.drawn > 50 && p.shade < p.drawn / 4), await picOf(X));
    ok(`${label}: its special found, by me first, three of three, and its habit told`, !!silkie?.special && silkie.special.seen && silkie.special.mine === 3 && /ฉัน/.test(silkie.special.first ?? "") && /10 หัวใจ/.test(silkie.special.habit ?? "") && /ฉันพบ 3\/3/.test(silkie.text), silkie?.special);
    await shot(2, "silkie-habit-told");
    await go(X, "ไก่", 2);
    const araucana = await pageOf(X);
    ok(`${label}: a breed I bred first; its special found by a friend first, one of my three, the habit not told yet`, araucana?.id === "araucana" && /เพาะได้คนแรก ฉัน/.test(araucana.first ?? "") && araucana.special?.seen && /มะลิ/.test(araucana.special.first ?? "") && araucana.special.mine === 1 && !araucana.special.habit && araucana.special.kind === "time" && /รู้นิสัยเมื่อพบครบ 3 ครั้ง/.test(araucana.text), araucana);
    await shot(3, "araucana-one-find");
    await go(X, "ไก่", 3);
    const marans = await pageOf(X);
    ok(`${label}: a breed nobody has bred: a silhouette that says so, its special a shadow with its habit's kind`, marans?.id === "marans" && !marans.found && /ยังไม่มีใครในหมู่บ้านเพาะได้/.test(marans.text) && !marans.special?.seen && /\?\?\?/.test(marans.text) && marans.special?.kind === "food", marans);
    ok(`${label}: …and its picture is the silhouette alone`, await picOf(X).then((p) => !!p && p.drawn > 50 && p.shade === p.drawn), await picOf(X));
    await shot(4, "hens-unfound");

    // a species nobody has bred past A
    await go(X, "เป็ด", 0);
    const duck = await pageOf(X), duckTitles = await X.evaluate(`[...${DIALOG}.querySelectorAll("nav button")].map((b) => b.innerText.trim())`);
    ok(`${label}: the ducks: the starter open, from the stall, with no special`, duck?.id === "puddleDuck" && duck.found && !duck.special && /จากร้านลุง/.test(duck.text) && !duck.first, duck);
    ok(`${label}: …and the other seven not found`, duckTitles[0] === "เป็ดบ้าน" && duckTitles.slice(1).length === 7 && duckTitles.slice(1).every((x) => x === "ยังไม่พบ"), duckTitles);
    await shot(5, "ducks-starter");
    await go(X, "เป็ด", 1);
    ok(`${label}: a duck past A: shut, its special a shadow`, await pageOf(X).then((p) => p?.id === "runner" && !p.found && !p.special?.seen), await pageOf(X));
    await shot(6, "ducks-unfound");
    if (phone) ok(`${label}: every control of the open book a finger's size`, (await small(X)).length === 0, await small(X));
    await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await sleep(500);
    ok(`${label}: Escape shuts the book, the bag still open`, !(await X.evaluate(`!!${DIALOG}`)) && (await X.evaluate(`!!document.querySelector("[data-animal-book]")`)));

    // the pasture's own book tells the same (one function for both)
    if (label === "desktop") {
      await X.evaluate(`document.querySelector('button[aria-keyshortcuts="I"]')?.click()`); await sleep(400);
      await X.evaluate(`window.__townView.warp(205, 36)`); await sleep(1500);
      await until("the pasture's own code", () => X.evaluate(`!!${P}`), 30000).catch(() => {});
      await X.evaluate(`${P}.open("book")`); await sleep(900);
      const pasture = await X.evaluate(`(() => { const s = document.querySelector('[data-book-special="silkieTwinEgg"]'), a = document.querySelector('[data-book-special="dawnBlueEgg"]'), m = document.querySelector('[data-book-special="cocoaShellEgg"]');
        return { silkie: s && [s.dataset.seen, s.dataset.mine, !!s.querySelector("[data-habit-known]")], araucana: a && [a.dataset.seen, a.dataset.mine], marans: m && m.dataset.seen,
          found: [...document.querySelectorAll("[data-animals-book] [data-book]")].map((e) => e.dataset.book + ":" + e.dataset.found).join(" "), head: document.querySelector("[data-animals-book] p")?.innerText ?? "" }; })()`);
      ok("the pasture's book tells the same specials", JSON.stringify(pasture.silkie) === JSON.stringify(["true", "3", true]) && JSON.stringify(pasture.araucana) === JSON.stringify(["true", "1"]) && pasture.marans === "false", pasture);
      ok("…the same hens bred, and the village's count", /silkie:true araucana:true marans:false/.test(pasture.found) && /พบแล้ว 7\/32/.test(pasture.head), pasture);
    }
    ok(`${label}: no page errors`, X.errors().length === 0, X.errors());
  } finally { X.close(); }
}

for (const label of ONLY === "all" ? ["desktop", "phone", "small"] : [ONLY]) {
  console.log(`— ${label}`);
  await run(label).catch((e) => { fail++; console.log(`  FAIL ${label}: ${e.message}`); });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
