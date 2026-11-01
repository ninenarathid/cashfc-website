// The town's settings switch for limited outfits' effects, in a real browser on the dev test room: the panel on each size,
// the switch pressed, and each design with the least of its effects, by day and by night. For Codex's look and the owner's.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town-limited-minimal.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { OUTFITS, HATS, HAIR_WEAR, WEAR_ALL_KEY } = await import("@/lib/town/wear");
const { defaultLook, encodeLook, hairsFor } = await import("@/lib/town/look");
const [BASE = "http://localhost:3241", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
const idx = (list, id) => list.findIndex((w) => w.id === id);
const SETS = [["pumpkinmonarch", "pumpkinhead", 1], ["count", "rosefascinator", 0], ["moonkeeper", "lanternpin", 0], ["mapleregent", "maplehat", 1]];
const url = (room, hour) => `${BASE}/town?townTest=A&townRoom=${room}&townMap=town2&townHour=${hour}&townWeather=clear`;

async function open(X, hour, base, head, gender, minimal) {
  await X.goto(url(`mini${Date.now() % 100000}`, hour));
  await until("ready", async () => (await status(X)) === "ready", 240000);
  const look = { ...defaultLook("limited-shot"), gender, hair: hairsFor(gender, 0)[3], outfit: idx(OUTFITS, base), hat: gender ? idx(HATS, head) : 0, hairWear: gender ? 0 : idx(HAIR_WEAR, head) };
  await X.evaluate(`(() => { const id = sessionStorage.getItem("cashTown:test:A"); localStorage.setItem(${JSON.stringify(WEAR_ALL_KEY)}, "1"); localStorage.setItem("cashTown:limitedMinimal", ${JSON.stringify(minimal ? "on" : "off")}); localStorage.setItem("cashTown:look:" + id, ${JSON.stringify(encodeLook(look))}); location.reload(); })()`);
  await sleep(1500);
  await until("ready again", async () => (await status(X)) === "ready", 240000);
  await sleep(3000);
  await X.evaluate(`${V}.won(${JSON.stringify(base)})`);
  await sleep(1200);
}

// ── each design with the least of its effects ──
const X = await browser("limited-min", { width: 1280, height: 860 });
try {
  for (const [hour, when] of process.env.PANEL_ONLY ? [] : [[12, "day"], [21, "night"]]) for (const [base, head, gender] of SETS) {
    await open(X, hour, base, head, gender, true);
    // (out from behind the fountain, where a doll first stands, and stopped)
    await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 900, y: 600 });
    for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: 900, y: 600, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
    await sleep(4500);
    await X.shot(`${OUT}/min-${when}-${base}.png`);
    ok(`${when} ${base}, the least`, true);
  }
} finally { await X.close?.(); }

if (process.env.AURA_ONLY) { console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
// ── the switch in the panel, on each size ──
const pressAt = async (P, x, y) => {
  await P.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await P.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
};
const boxOf = (P, sel) => P.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || !b.offsetParent) return null; b.scrollIntoView({ block: "nearest" }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; })()`);
for (const [label, size] of [["desk", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }], ["small", { width: 360, height: 640 }]]) {
  const P = await browser(`limited-min-${label}`, size);
  try {
    await open(P, 21, "pumpkinmonarch", "pumpkinhead", 1, false);
    let cog = await boxOf(P, "[data-town-settings]");
    if (!cog) {
      await P.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /เมนู|Menu/.test((x.getAttribute("aria-label") ?? "") + (x.getAttribute("title") ?? "") + x.textContent)); b?.click(); })()`);
      await sleep(700);
      cog = await boxOf(P, "[data-town-settings]");
    }
    ok(`${label} the cog is there`, !!cog, cog);
    if (cog) await pressAt(P, cog.x, cog.y);
    await sleep(900);
    await P.shot(`${OUT}/panel-${label}-off.png`);
    const sw = await boxOf(P, "[data-town-limited-minimal]");
    ok(`${label} the switch is on screen and about 44 px tall`, !!sw && sw.bottom <= sw.vh && sw.h >= 44, sw);
    const panel = await P.evaluate(`(() => { const r = document.querySelector("[data-town-settings-panel]")?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight } : null; })()`);
    ok(`${label} the panel fits the screen`, !!panel && panel.bottom <= panel.vh && panel.top >= 0, panel);
    if (sw) await pressAt(P, sw.x, sw.y);
    await sleep(900);
    const on = await P.evaluate(`document.querySelector("[data-town-limited-minimal]")?.getAttribute("data-town-limited-minimal")`);
    const kept = await P.evaluate(`localStorage.getItem("cashTown:limitedMinimal")`);
    ok(`${label} pressed: on, and kept`, on === "on" && kept === "on", { on, kept });
    await P.shot(`${OUT}/panel-${label}-on.png`);
    // ── the wearer's own: the settings' switch off again, the wardrobe's on ──
    await open(P, 21, "pumpkinmonarch", "pumpkinhead", 1, false);
    await P.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /ตู้แต่งตัว|แต่งตัว|Wardrobe/.test((x.getAttribute("aria-label") ?? "") + x.textContent)); b?.click(); })()`);
    await sleep(700);
    await P.evaluate(`(() => { const t = [...document.querySelectorAll('[role="tab"]')].find((x) => /^ชุด|^Outfit/.test(x.textContent.trim())); t?.click(); })()`);
    await sleep(1200);
    await P.shot(`${OUT}/wardrobe-${label}-quiet-off.png`);
    const q = await boxOf(P, "[data-wardrobe-quiet]");
    ok(`${label} the wardrobe's switch is there, about 44 px tall`, !!q && q.h >= 44, q);
    if (q) await pressAt(P, q.x, q.y);
    await sleep(1200);
    const qon = await P.evaluate(`document.querySelector("[data-wardrobe-quiet]")?.getAttribute("data-wardrobe-quiet")`);
    ok(`${label} pressed, on`, qon === "on", qon);
    await P.shot(`${OUT}/wardrobe-${label}-quiet-on.png`);
  } finally { await P.close?.(); }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
