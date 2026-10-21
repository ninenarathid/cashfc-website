// Cash Town's chat heard across maps (the owner, 2026-10-22: members missed the town talking together after v293
// kept chat to each map). On the dev test room (`next dev` only), somebody on the farm talks and somebody in town
// reads it: the line is in the town's log with the farm's chip, no bubble is over a head on another map, and the
// history shows every map's lines (the owner, the same day: no choice of "this map", the whole town as before).
// At three sizes: nothing of the HUD lies on another.
//
//   node town-chat-maps.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const V = "window.__townView", S = "window.__cashTown";
const SIZES = { wide: { width: 1280, height: 860 }, phone: { width: 384, height: 730, dpr: 2, mobile: true }, short: { width: 360, height: 640, dpr: 2, mobile: true } };
const ROOM = `chatmaps${Date.now() % 100000}`;

async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=${ROOM}&townHour=17&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
}
const overlaps = (X) => X.evaluate(`(() => {
  const stage = document.querySelector("canvas")?.parentElement;
  if (!stage) return ["no map"];
  const seen = [...stage.querySelectorAll("button, [role=status], [role=log], ul[aria-label], form, section, aside")]
    .filter((e) => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 4 && r.height > 4 && st.visibility !== "hidden" && +st.opacity > 0.05; });
  const tops = seen.filter((e) => !seen.some((o) => o !== e && o.contains(e)));
  const name = (e) => (e.getAttribute("aria-label") || e.getAttribute("title") || e.innerText || e.tagName).replace(/\\s+/g, " ").trim().slice(0, 26);
  const out = [];
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) {
    const a = tops[i].getBoundingClientRect(), b = tops[j].getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 3 && h > 3) out.push(name(tops[i]) + " × " + name(tops[j]) + " (" + Math.round(w) + "×" + Math.round(h) + ")");
  }
  return out;
})()`);
const text = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? ""`);

// Somebody on the farm, the whole run.
const F = await browser("ChatFarm", { width: 900, height: 700 });
await enter(F, "F");
await F.evaluate(`${V}.warp(133, 5)`); await sleep(1500);
ok("the farmer is on the farm", (await F.evaluate(`${S}.me().x`)) >= 128);

for (const [label, size] of Object.entries(SIZES)) {
  const X = await browser("ChatTown" + label, size);
  console.log(`chat across maps · ${label}`);
  try {
    await enter(X, label === "wide" ? "A" : label === "phone" ? "B" : "C");
    await sleep(1500);
    await F.evaluate(`${S}.chat("ใครว่างมาช่วยรดน้ำที่ฟาร์มหน่อย แปลงใต้เยอะมาก")`); await sleep(1400);
    await X.evaluate(`${S}.chat("เดี๋ยวไปครับ ขอขายปลาก่อน")`); await sleep(1400);
    await F.evaluate(`${S}.chat("ขอบคุณ รออยู่ข้างบ่อนะ")`); await sleep(1500);
    const log = await text(X, "[data-foot-said] ul");
    ok("the farm's lines are in the town's log, with the farm's chip", log.includes("ใครว่างมาช่วยรดน้ำ") && log.includes("ฟาร์ม"), log);
    ok("my own line has no chip", !/ฟาร์ม[^\n]*ขอขายปลา/.test(log), log);
    const bubbles = await X.evaluate(`${S}.people?.().filter((p) => p.said).length ?? 0`);
    ok("no bubble over a head on another map", bubbles === 0, bubbles);
    let over = await overlaps(X);
    ok("with the log over the map, nothing lies on another", over.length === 0, over);
    await X.shot(`${OUT}/chat-maps-log-${label}.png`);

    // The history: a wide screen's by its button, a phone's by the chat's.
    await X.evaluate(`(document.querySelector('button[aria-label="แชท"]') ?? document.querySelector('button[title="ประวัติแชท"]')).click()`); await sleep(800);
    const hist = await text(X, "[data-foot-said] [role=log]");
    ok("the history has every map's lines", hist.includes("ใครว่างมาช่วยรดน้ำ") && hist.includes("ขอขายปลา") && hist.includes("ขอบคุณ"), hist);
    over = await overlaps(X);
    ok("the history open, nothing lies on another", over.length === 0, over);
    await X.shot(`${OUT}/chat-maps-history-${label}.png`);

    const placeholder = await X.evaluate(`document.querySelector("[data-foot-ctrl] form input")?.placeholder ?? ""`);
    ok("the box says the whole town hears it", placeholder.includes("ทุกคนในเมือง"), placeholder);
    { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
  } catch (e) { fail++; console.log(`  FAIL (stopped) ${e?.message ?? e}`); await X.shot(`${OUT}/chat-maps-${label}-stopped.png`).catch(() => {}); }
  finally { await X.close(); }
}
await F.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
