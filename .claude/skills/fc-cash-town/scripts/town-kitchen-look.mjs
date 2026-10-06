// The kitchen table, looked at: pictures of the cooking screen on a wide window and on a phone, in both languages
// and with nothing moving, for an eye to judge (town-cook.mjs is what checks that it works).
//
//   node .claude/skills/fc-cash-town/scripts/town-kitchen-look.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes kitchen-<size>-<what>.png.
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
const T = "window.__townTrade", C = "window.__townCook";
const K = `document.querySelector("[data-town-kitchen]")`;
const SIZES = [["wide", { width: 1280, height: 860 }], ["phone", { width: 390, height: 844, mobile: true }], ["small", { width: 360, height: 640, mobile: true }]];

for (const [label, size] of SIZES) {
  const X = await browser(`Kitchen ${label}`, size);
  try {
    const enter = async (more = "") => {
      await X.goto(`${BASE}/town?townTest=L&townRoom=check&townHour=12&townWeather=clear${more}`);
      await until("ready", async () => (await status(X)) === "ready", 240000);
      await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
      await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
    };
    const open = async () => {
      const places = await X.evaluate(`${C}.places()`);
      const at = places.find((p) => p.kind === "stove").at;
      await X.evaluate(`window.__townView.warp(${at[0]}, ${at[1]})`);
      await until("cooking is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook"), 8000);
      await X.evaluate(`${C}.act("cook")`);
      await until("the table is laid", () => X.evaluate(`!!${K}`), 5000);
      await sleep(900);
    };
    await enter();
    await X.evaluate(`(${T}.reset(), ${T}.forget())`);
    await sleep(400);
    await X.evaluate(`${T}.resize(20)`);
    await X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify([["snakehead", 2], ["tomato", 5], ["chili", 3], ["scallion", 2], ["garlic", 2], ["salt", 2], ["rice", 3], ["shiitake", 2], ["mint", 1], ["fishSauce", 1], ["hyacinth", 2],
      ["pot", 1], ["pan", 1], ["mortar", 1], ["bowl", 2]])}) ${T}.grant(id, n); })()`);
    // two recipes known, one of them made (read whole) and one that hides its last thing
    await X.evaluate(`(${T}.learn("tomYum"), ${T}.learn("mushroomSoup", true), ${T}.learn("friedRice"))`);
    await open();
    await X.shot(`${OUT}/kitchen-${label}-empty.png`);
    await X.evaluate(`${C}.tool(${T}.purse().bag.findIndex((s) => s?.item === "pot"))`);
    await sleep(400);
    await X.evaluate(`${C}.put([["snakehead", 1], ["tomato", 2], ["chili", 1], ["garlic", 1]])`);
    await sleep(500);
    const first = await X.evaluate(`${K}.querySelector("[data-kitchen-recipe]")?.dataset.kitchenRecipe ?? null`);
    if (label !== "wide") { await X.evaluate(`${K}.querySelector("[data-kitchen-strip]").click()`); await sleep(400); await X.shot(`${OUT}/kitchen-${label}-book.png`); }
    if (first) { await X.evaluate(`${K}.querySelector('[data-kitchen-recipe="tomYum"]').click()`); await sleep(400); }
    await X.shot(`${OUT}/kitchen-${label}-${label === "wide" ? "filled" : "page"}.png`);
    if (label !== "wide") { await X.evaluate(`[...${K}.querySelectorAll("button")].find((b) => b.innerText.trim() === "พับเก็บ").click()`); await sleep(400); await X.shot(`${OUT}/kitchen-${label}-filled.png`); }
    // what came of it, on its card: a miss by the hidden thing alone (garlic where the recipe wants something else)
    await X.evaluate(`${C}.put([["snakehead", 1], ["tomato", 2], ["chili", 2], ["garlic", 1]])`);
    await sleep(300);
    await X.evaluate(`${C}.go()`);
    await sleep(400);
    if (await gameUp(X)) { await play(X); await sleep(1200); }
    await X.shot(`${OUT}/kitchen-${label}-came.png`);
    if (label === "wide") {
      // in English, with nothing moving
      await X.evaluate(`(localStorage.setItem("fc_lang", "en"), localStorage.setItem("cashTown:motion", "off"))`);
      await enter();
      await open();
      await X.evaluate(`${C}.put([["snakehead", 1], ["tomato", 2], ["chili", 1]])`);
      await sleep(400);
      await X.evaluate(`${K}.querySelector('[data-kitchen-recipe="tomYum"]')?.click()`);
      await sleep(400);
      await X.shot(`${OUT}/kitchen-wide-en-still.png`);
      await X.evaluate(`[...${K}.querySelectorAll("[role=tab]")][1].click()`);
      await sleep(300);
      await X.shot(`${OUT}/kitchen-wide-en-notes.png`);
      await X.evaluate(`(localStorage.removeItem("fc_lang"), localStorage.removeItem("cashTown:motion"))`);
    }
    console.log(label, "known:", JSON.stringify(await X.evaluate(`${T}.known()`)), "first:", first);
  } finally { await X.close(); }
}
