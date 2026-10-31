// A limited outfit's five colours and aura in a real browser on the dev test room: each design standing and walking, by
// day and by night, the wardrobe's colour row, and a look with no copy won, which must show no aura (a try in the shop).
// For Codex's UI review and the owner's look; it checks only that each step came up.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town-limited.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { OUTFITS, HATS, FACE_WEAR, HAIR_WEAR, WEAR_ALL_KEY, dyeChoices } = await import("@/lib/town/wear");
const { defaultLook, encodeLook, hairsFor } = await import("@/lib/town/look");
const [BASE = "http://localhost:3241", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
const idx = (list, id) => list.findIndex((w) => w.id === id);
const SETS = [
  { base: "pumpkinmonarch", hat: "pumpkinhead", face: "pumpkinglasses", hair: "pumpkincrown" },
  { base: "count", hat: "counthat", face: "batmask", hair: "rosefascinator" },
  { base: "moonkeeper", hat: "moonlanternhat", face: "moonmask", hair: "lanternpin" },
  { base: "mapleregent", hat: "maplehat", face: "maplemask", hair: "maplecomb" },
];
const url = (room, hour) => `${BASE}/town?townTest=A&townRoom=${room}&townMap=town2&townHour=${hour}&townWeather=clear`;

async function open(X, room, hour, set, gender, dye = 0) {
  await X.goto(url(room, hour));
  await until("ready", async () => (await status(X)) === "ready", 240000);
  const outfit = dyeChoices(OUTFITS, idx(OUTFITS, set.base))[dye];
  const look = { ...defaultLook("limited-shot"), gender, hair: hairsFor(gender, 0)[3], outfit, hat: gender ? idx(HATS, set.hat) : 0, faceWear: idx(FACE_WEAR, set.face), hairWear: gender ? 0 : idx(HAIR_WEAR, set.hair) };
  if (set.base === "pumpkinmonarch") look.faceWear = 0;
  await X.evaluate(`(() => { const id = sessionStorage.getItem("cashTown:test:A"); localStorage.setItem(${JSON.stringify(WEAR_ALL_KEY)}, "1"); localStorage.setItem("cashTown:look:" + id, ${JSON.stringify(encodeLook(look))}); location.reload(); })()`);
  await sleep(1500);
  await until("ready again", async () => (await status(X)) === "ready", 240000);
  await sleep(3500);
}

const X = await browser("limited", { width: 1280, height: 860 });
try {
  for (const [hour, when] of process.env.WARDROBE_ONLY ? [] : [[12, "day"], [21, "night"]]) {
    for (const set of SETS) {
      const gender = set.base === "mapleregent" || set.base === "pumpkinmonarch" ? 1 : 0;
      await open(X, `lim${Date.now() % 100000}`, hour, set, gender, 0);
      if (hour === 12 && set.base === SETS[0].base) { await X.shot(`${OUT}/noowner-${set.base}.png`); ok("no copy won: shot without an aura", true); }
      await X.evaluate(`${V}.won(${JSON.stringify(set.base)})`);
      await sleep(1600);
      await X.shot(`${OUT}/${when}-${set.base}-idle.png`);
      const me = await X.evaluate(`JSON.stringify(${V}.me ? ${V}.me() : null)`);
      // (a walk: a tap well to one side of the doll on the map)
      await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 640, y: 300 });
      for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: 900, y: 560, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
      await sleep(1300);
      await X.shot(`${OUT}/${when}-${set.base}-walk.png`);
      ok(`${when} ${set.base}`, true, me);
    }
  }
  // ── any other hat: the aura and the title stay, they go with the outfit alone (the owner, 2026-10-31) ──
  {
    const set = { ...SETS[0], hat: "cowboy" };
    await open(X, `lim${Date.now() % 100000}`, 21, set, 1, 0);
    await X.evaluate(`${V}.won("pumpkinmonarch")`);
    await sleep(1600);
    await X.shot(`${OUT}/otherhat-pumpkinmonarch.png`);
    ok("another hat", true);
  }
} finally {
  await X.close?.();
}

// ── the wardrobe's row of five colours, on each size ──
const pressWear = (P) => P.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && /ตู้แต่งตัว|แต่งตัว|Wardrobe/.test((x.getAttribute("aria-label") ?? "") + x.textContent)); if (!b) return false; b.click(); return true; })()`);
for (const [label, size] of [["desk", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }], ["small", { width: 360, height: 640 }]]) {
  const P = await browser(`limited-${label}`, size);
  try {
    for (const [i, set] of SETS.entries()) {
      await open(P, `limw${Date.now() % 100000}`, 12, set, i % 2, 1);
      await P.evaluate(`${V}.won(${JSON.stringify(set.base)})`);
      ok(`${label} wardrobe opens ${set.base}`, await pressWear(P));
      await sleep(700);
      await P.evaluate(`(() => { const t = [...document.querySelectorAll('[role="tab"]')].find((x) => /^ชุด|^Outfit/.test(x.textContent.trim())); t?.click(); })()`);
      await sleep(1800);
      await P.shot(`${OUT}/wardrobe-${label}-${set.base}.png`);
    }
    // (a colour pressed: the doll on the map behind in it)
    const picked = await P.evaluate(`(() => { const g = [...document.querySelectorAll('[role="group"]')].find((x) => x.hasAttribute("data-dye-row")); const b = g?.querySelectorAll("button")[3]; if (!b) return false; b.click(); const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    ok(`${label} a colour pressed, its button about 44 px`, picked && picked.h >= 44 && picked.w >= 40, picked);
    await sleep(1200);
    await P.shot(`${OUT}/wardrobe-${label}-picked.png`);
    // (each thing's own colour: the hat in another colour from the outfit)
    await P.evaluate(`(() => { const t = [...document.querySelectorAll('[role="tab"]')].find((x) => /ของตกแต่ง|Accessor|Wear/.test(x.textContent)); t?.click(); })()`);
    await sleep(1400);
    const rows = await P.evaluate(`document.querySelectorAll("[data-dye-row]").length`);
    ok(`${label} a colour row for each limited thing worn`, rows >= 1, rows);
    await P.evaluate(`(() => { const b = document.querySelectorAll("[data-dye-row]")[0]?.querySelectorAll("button")[2]; b?.click(); })()`);
    await sleep(1200);
    await P.shot(`${OUT}/wardrobe-${label}-wear.png`);
  } finally {
    await P.close?.();
  }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
