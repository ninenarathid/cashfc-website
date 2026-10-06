// "ตัวฉัน" and the gifts of ranks (the owner, 2026-10-06), played in the trial and read off the screen: a rank's gift
// taken on its rung and on the leaf of what one wears; two charms worn at a time, a third refused a place; one taken
// off and another put on; the leaf opened from one's own card; a dot on the lines' button while a gift waits.
//
//   node .claude/skills/fc-cash-town/scripts/town-me.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes me-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 900)}`); };
const T = "window.__townTrade", K = "window.__townKeeper";
const L = `document.querySelector("[data-town-lines]")`, M = `document.querySelector("[data-town-me]")`;
const enter = async (X) => {
  await X.goto(`${BASE}/town?townTest=G&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const gifts = (X) => X.evaluate(`(${K}.purse().gifts ?? { had: [], charms: [] })`);
const worn = (X) => X.evaluate(`${M}.querySelector("[data-me-worn]").dataset.meWorn`);
const click = async (X, sel, wait = 450) => { await X.evaluate(`document.querySelector(${JSON.stringify(sel)}).click()`); await sleep(wait); };
async function tap(X, mx, my) {
  const box = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + box.x, y = my + box.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}

for (const [label, size] of [["wide", { width: 1280, height: 860 }], ["phone", { width: 390, height: 844, mobile: true }]]) {
  const X = await browser(`Me ${label}`, size);
  try {
    await enter(X);
    await X.evaluate(`(${T}.reset(), ${T}.forget())`);
    await sleep(400);
    await X.evaluate(`(localStorage.removeItem("cashtown.trial.lines.1"), localStorage.removeItem("cashtown.trial.titles.1"))`);
    await enter(X);
    ok(`[${label}] with no rank reached nothing waits: no dot on the lines' button`, await X.evaluate(`document.querySelector("[data-town-lines-button]").dataset.due === undefined`));
    // the first rank of four lines, and not quite of a fifth
    await X.evaluate(`(${T}.setLine("kitchen", 60), ${T}.setLine("fishing", 55), ${T}.setLine("farming", 50), ${T}.setLine("insects", 300), ${T}.setLine("forest", 49))`);
    await until("a gift waits: the dot", () => X.evaluate(`document.querySelector("[data-town-lines-button]").dataset.due === ""`), 6000);
    ok(`[${label}] a rank reached: a dot on the lines' button says a gift waits`, true);

    // ── on the rung ──
    await click(X, "[data-town-lines-button]", 900);
    await X.evaluate(`${L}.querySelector('[data-lines-line="kitchen"]').click()`);
    await sleep(350);
    const rung = await X.evaluate(`[...${L}.querySelectorAll("[data-lines-rank]")].map((li) => ({ rank: Number(li.dataset.linesRank), take: !!li.querySelector("[data-lines-take]"), gift: li.querySelector("[data-lines-gift]")?.dataset.linesGift ?? null }))`);
    ok(`[${label}] the rung of the rank had offers its gift, unnamed; no other rung says anything of one`, rung[0].take && rung[0].gift === null && rung.slice(1).every((r) => !r.take && r.gift === null), rung);
    await click(X, `[data-lines-take="1"]`, 700);
    const after = await X.evaluate(`(() => { const li = ${L}.querySelector('[data-lines-rank="1"]'); return { take: !!li.querySelector("[data-lines-take]"), gift: li.querySelector("[data-lines-gift]")?.dataset.linesGift ?? null, text: li.innerText.replace(/\\s+/g, " ") }; })()`);
    ok(`[${label}] taken: the rung names it, and it is in the purse and in no slot of the bag`, !after.take && after.gift === "charmApron" && /ผ้ากันเปื้อนต้องมนตร์/.test(after.text)
      && JSON.stringify((await gifts(X)).had) === '["charmApron"]' && (await X.evaluate(`${K}.purse().bag.every((s) => !s || !String(s.item).startsWith("charm"))`)), { after, gifts: await gifts(X) });
    await X.shot(`${OUT}/me-rung-${label}.png`);

    // ── the leaf of what I wear ──
    await click(X, `[data-lines-leaf="me"]`, 600);
    ok(`[${label}] "ตัวฉัน" opens beside the lines: two empty places, a place for a familiar that says nothing of what is to come`, await X.evaluate(`!!${M} && ${M}.querySelectorAll('[data-me-slot=""]').length === 2 && !!${M}.querySelector("[data-me-familiar]")`));
    const due = await X.evaluate(`[...${M}.querySelectorAll("[data-me-due]")].map((li) => ({ id: li.dataset.meDue, text: li.innerText.replace(/\\s+/g, " ") }))`);
    ok(`[${label}] what waits is listed by its line and rank, not by its name: the deck's, the insects' and the farm's`, due.map((d) => d.id).join() === "charmFloat,charmNet,charmHoe" && due.every((d) => !/ทุ่น|สวิง|จอบ/.test(d.text)), due);
    for (const id of ["charmFloat", "charmNet", "charmHoe"]) await click(X, `[data-me-take="${id}"]`, 600);
    ok(`[${label}] each is taken there; nothing more waits, the dot is gone, and the count says four of six`, (await gifts(X)).had.length === 4 && (await X.evaluate(`${M}.querySelectorAll("[data-me-due]").length`)) === 0
      && (await X.evaluate(`document.querySelector("[data-town-lines-button]").dataset.due === undefined`)) && (await X.evaluate(`${M}.querySelector("[data-me-count]").dataset.meCount`)) === "4/6", await gifts(X));
    ok(`[${label}] what is still to get is a number and no name`, await X.evaluate(`/อีก 2 ชิ้น/.test(${M}.querySelector("[data-me-count]").innerText) && !/ถุงมือ|ตะกร้า/.test(${M}.innerText)`));

    // ── two worn at a time ──
    await click(X, `[data-me-charm="charmFloat"]`, 600);
    await click(X, `[data-me-charm="charmHoe"]`, 600);
    ok(`[${label}] two charms put on, in the order they were: kept by the keeper`, (await worn(X)) === "charmFloat,charmHoe" && JSON.stringify((await gifts(X)).charms) === '["charmFloat","charmHoe"]', await gifts(X));
    ok(`[${label}] with both places taken the others cannot be put on, and the leaf says why`, await X.evaluate(`[...${M}.querySelectorAll("[data-me-charm]")].length === 2 && [...${M}.querySelectorAll("[data-me-charm]")].every((b) => b.disabled) && !!${M}.querySelector("[data-me-full]")`));
    await X.shot(`${OUT}/me-worn-${label}.png`);
    await click(X, `[data-me-slot="charmFloat"]`, 600);
    await click(X, `[data-me-charm="charmNet"]`, 600);
    ok(`[${label}] one taken off and another put on in its place`, (await worn(X)) === "charmHoe,charmNet", await gifts(X));
    const refused = await X.evaluate(`${K}.charmsWear(["charmHoe", "charmNet", "charmApron"])`);
    const none = await X.evaluate(`${K}.charmsWear(["charmGloves"])`);
    const again = await X.evaluate(`${K}.giftTake("kitchen", 1)`);
    const early = await X.evaluate(`${K}.giftTake("forest", 1)`);
    ok(`[${label}] the keeper refuses a third, one not had, a gift taken twice and one of a rank not reached`, refused.why === "slots" && none.why === "none" && again.why === "had" && early.why === "rank", { refused, none, again, early });

    // ── from my own card ──
    await X.evaluate(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))`);
    await sleep(300);
    if (await X.evaluate(`!!${L}`)) await X.evaluate(`${L}.querySelector("header button:last-child").click()`);
    await sleep(400);
    // (a tap on my own doll, as a finger would)
    const mine = await X.evaluate(`window.__cashTown.me().id`);
    const at = await X.evaluate(`window.__townView.screenOf(${JSON.stringify(mine)})`);
    await tap(X, at.x, at.y);
    await until("my card", () => X.evaluate(`!!document.querySelector("[data-town-me-button]")`), 5000);
    await click(X, "[data-town-me-button]", 900);
    ok(`[${label}] my own card has the way to "ตัวฉัน", and it opens the board at that leaf with what I wear`, (await X.evaluate(`!!${M}`)) && (await worn(X)) === "charmHoe,charmNet");
    ok(`[${label}] no page errors`, (X.errors ?? []).length === 0, X.errors);
  } finally { await X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
