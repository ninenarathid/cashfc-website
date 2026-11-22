// Loy Krathong (v336) shot in a real browser on the dev test room, desktop and phone, each stage of the festival put
// around now by `&lk=`: the board's calendar; the stall on the map; the builder, a krathong put together and sent; the
// gallery; the float and the river; the results and the hall. For Codex's UI review and the owner's look; it checks
// only that each step came up.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town-festival.mjs <base> <outdir>
//   (SIZES=desktop,phone,small · STAGES=make,float,results)
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { PARTS } = await import("@/lib/town/krathong");
const KIT = Object.entries(PARTS.flatMap((p) => p.pay.slice(0, 2)).reduce((m, [id, n]) => ({ ...m, [id]: Math.max(m[id] ?? 0, 0) + n * 2 }), {}));
const [BASE = "http://localhost:3336", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
const url = (room, stage, hour) => `${BASE}/town?townTest=A&townRoom=${room}&townMap=town2&townHour=${hour}&townWeather=clear&lk=${stage}`;

async function tapAt(X, x, y) {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
}
async function press(X, words, within = "body", pick = "[0]") {
  const box = await X.evaluate(`(() => {
    const words = ${JSON.stringify(words)}, root = document.querySelector(${JSON.stringify(within)}) ?? document.body;
    const all = [...root.querySelectorAll("button")].filter((b) => b.offsetParent && !b.disabled && words.some((w) => (b.textContent + " " + (b.title || "")).includes(w)));
    const b = all${pick};
    if (!b) return null;
    b.scrollIntoView({ block: "center" });
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: b.textContent.trim().slice(0, 40) };
  })()`);
  if (box) { await tapAt(X, box.x, box.y); await sleep(700); }
  return box;
}
const STALL = 'section[aria-labelledby="town-krathong-h"]';
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);

const sizes = [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }], ["small", { width: 360, height: 640 }]]
  .filter(([l]) => (process.env.SIZES ?? "desktop,phone").split(",").includes(l));
const stages = (process.env.STAGES ?? "make,float,results").split(",");
for (const [label, size] of sizes) {
  const X = await browser(`festival-${label}`, size);
  const shot = (n) => X.shot(`${OUT}/festival-${label}-${n}.png`);
  try {
    for (const stage of stages) {
      const room = url(`lk${stage}${Date.now() % 100000}`, stage, stage === "make" ? 19 : 21);
      await X.goto(room);
      await until("ready", async () => (await status(X)) === "ready", 240000);
      // the festival kept fresh for the stage, then a bag with every part's things
      await X.evaluate(`localStorage.removeItem("cashtown.trial.festival.1")`);
      await X.goto(room);
      await until("ready again", async () => (await status(X)) === "ready", 240000);
      await until("festival hook", async () => !!(await X.evaluate(`!!${V}?.festival?.()?.live?.f`)), 20000).catch(() => {});
      await X.evaluate(`${V}.festival().kit()`);
      await X.evaluate(`${V}.warp(32, 41)`);
      await sleep(3500);
      await shot(`${stage}-01-map`);
      if (stage === "make") {
        await X.evaluate(`${V}.festival().open()`);
        await sleep(1500);
        ok(`${label}: the board opens on its calendar`, await X.evaluate(`[...document.querySelectorAll('[role=tab]')].some((t) => t.getAttribute('aria-selected') === 'true' && /ปฏิทิน|Festivals/.test(t.textContent))`));
        await shot(`${stage}-02-calendar`);
        await press(X, ["ไปซุ้มกระทง", "Go to the krathong stall"]);
        await sleep(1500);
        ok(`${label}: the stall opens from the calendar`, await has(X, STALL));
        await shot(`${stage}-03-builder`);
        await press(X, ["ฐานไม้แกะ"], STALL); await press(X, ["พวงดาวเรือง"], STALL); await press(X, ["หอยกับไข่มุก"], STALL);
        await press(X, ["ดอกไม้"], STALL, ".filter((b) => b.title === 'ดอกไม้')[0]"); await press(X, ["อัญมณี"], STALL);
        await X.evaluate(`(() => { const i = document.querySelector(${JSON.stringify(STALL + " input")}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'ดวงจันทร์กลางสายน้ำ'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        await sleep(600);
        await shot(`${stage}-04-chosen`);
        await press(X, ["ส่งประกวด", "Enter the contest"], STALL);
        await shot(`${stage}-05-confirm`);
        await press(X, ["ยืนยัน", "Confirm"], STALL);
        await sleep(1500);
        ok(`${label}: the krathong is made`, await X.evaluate(`document.querySelector(${JSON.stringify(STALL)})?.textContent.includes('ส่งประกวดแล้ว')`));
        await shot(`${stage}-06-made`);
        await press(X, ["ประกวด", "Entries"], STALL);
        await sleep(1200);
        await shot(`${stage}-07-gallery`);
      }
      if (stage === "float") {
        await X.evaluate(`${V}.festival().stall()`);
        await sleep(1500);
        ok(`${label}: the stall on a float night`, await has(X, STALL));
        await shot(`${stage}-02-make-to-float`);
        await press(X, ["ฐานใบไม้พับ"], STALL);
        await X.evaluate(`(() => { const i = document.querySelector(${JSON.stringify(STALL + " input")}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'ลอยใต้จันทร์'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        await press(X, ["ทำกระทงไว้ลอย", "Make it to float"], STALL); await press(X, ["ยืนยัน", "Confirm"], STALL);
        await sleep(1500);
        await press(X, ["ลอย", "Float"], STALL, ".filter((b) => b.getAttribute('role') === 'tab')[0]");
        await sleep(800);
        await shot(`${stage}-03-float-tab`);
        await press(X, ["ประกวด", "Entries"], STALL);
        await sleep(900);
        await press(X, ["ให้ popoto", "Give"], STALL);
        await shot(`${stage}-04-vote`);
        await press(X, ["ลอย", "Float"], STALL, ".filter((b) => b.getAttribute('role') === 'tab')[0]");
        await press(X, ["ลอยกระทง", "Float it"], STALL);
        await sleep(1500);
        await X.evaluate(`${V}.festival().river()`);
        await X.evaluate(`${V}.warp(8, 57)`);
        await sleep(4000);
        ok(`${label}: krathongs on the river`, (await X.evaluate(`${V}.festival().live.river.length`)) > 0);
        await shot(`${stage}-05-river`);
      }
      if (stage === "results") {
        await X.evaluate(`${V}.festival().awards()`);
        await sleep(2500);
        await shot(`${stage}-01b-hall`);
        await X.evaluate(`${V}.festival().stall()`);
        await sleep(2000);
        ok(`${label}: results shown`, await X.evaluate(`document.querySelector(${JSON.stringify(STALL)})?.textContent.includes('ช่างกระทง')`));
        await shot(`${stage}-02-results`);
        await press(X, ["ประกวด", "Entries"], STALL);
        await sleep(900);
        await shot(`${stage}-03-gallery-named`);
      }
    }
  } catch (e) { fail++; console.log("  THREW", e?.message ?? e); }
  await X.close();
}
console.log(`festival: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
