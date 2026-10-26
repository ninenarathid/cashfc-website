// The feast table in the editor's town's kitchen hall (the owner, 2026-10-26: "อาหารลอยอยู่ใต้โต๊ะ"): a tester cooks
// several dishes and sets them on the table (each tester's trial keeps its own table), and the hall is shot at desktop
// and phone sizes, standing and with somebody sitting at each side of the left table (the second tester, shot from
// their own page too). Each pot must stand on a table's top, drawn over the table, behind whoever sits on its near
// bench, with the table's few words over its back corner, clear of the pots. SIZES=desktop,phone,small picks sizes.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town2-feast-look.mjs <base> <outdir>
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { KITCHEN, YARD_SEATS } = await import("@/lib/town/world");
const { RECIPE_IDS, needsOf } = await import("@/lib/town/cooking");
const [BASE = "http://localhost:3197", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d).slice(0, 600)}`); };
const T = "window.__townTrade", C = "window.__townCook", V = "window.__townView", P = `document.querySelector("[data-feast-panel]")`;
const ROOM = `feasttop${Date.now() % 100000}`;
const url = (letter) => `${BASE}/town?townTest=${letter}&townRoom=${ROOM}&townMap=town2&townHour=12&townWeather=clear`;
const panel = (X) => X.evaluate(`!!${P}`);
const offers = (X) => X.evaluate(`${C}.offers()`);
const pots = (X) => X.evaluate(`${C}.pots().filter((p) => p.feast).map((p) => p.dish)`);

/** Every dish the trial cooks from its recipe's own things, one pot each, up to `n`. */
async function cookMany(X, n) {
  await X.evaluate(`(() => { for (const id of ["pan", "pot", "mortar", "bowl"]) ${T}.grant(id, 1); })()`);
  const made = [];
  for (const id of RECIPE_IDS) {
    if ((await X.evaluate(`${T}.purse().bag.filter((s) => s?.item === "potFull" && s.of?.dish !== "oddDish").length`)) >= n) break;
    const needs = needsOf(id);
    const d = await X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify(needs)}) ${T}.grant(id, n); ${T}.setStamina(100);
      const d = ${T}.cookDo(${JSON.stringify(needs)}, ["pan", "pot", "mortar"], 0, "A"); return d.ok ? d.made : null; })()`);
    if (d && d !== "oddDish") made.push(d);
  }
  return made;
}
/** Every pot of a dish in the bag set on the table, one after another (the panel's own call). */
async function setAll(X) {
  await until("the table is offered", async () => (await offers(X)).includes("feast"), 8000);
  const slots = await X.evaluate(`${T}.purse().bag.flatMap((s, i) => s?.item === "potFull" && s.of?.dish !== "oddDish" ? [i] : [])`);
  for (const slot of slots.reverse()) { await X.evaluate(`${C}.feastDo("set", null, ${slot})`); await sleep(700); }
}
async function sit(X, i) {
  const box = (await X.evaluate(`${V}.benches()`)).find((b) => b.i === i);
  if (!box) return null;
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`);
  // (low on the place: its top half is over the table's picture, whose tap opens the feast table)
  const x = (box.x0 + box.x1) / 2 + at.x, y = box.y1 - 4 + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  try { await until(`sat ${i}`, async () => ((await X.evaluate("window.__cashTown.me()")).sit ?? -1) === i, 15000); } catch { /* told below */ }
  return (await X.evaluate("window.__cashTown.me()")).sit;
}

const FLOOR = KITCHEN.floor;
const spot = FLOOR.find(([x, y]) => x === 69 && y === 52) ?? FLOOR[0];
for (const [label, size] of (process.env.SIZES ? (x) => x.filter(([l]) => process.env.SIZES.split(",").includes(l)) : (x) => x)([["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }], ["small", { width: 360, height: 640 }]])) {
  const A = await browser(`feasttop-a-${label}`, size), B = await browser(`feasttop-b-${label}`, size);
  try {
    await A.goto(url("S")); await B.goto(url("T"));
    for (const X of [A, B]) {
      await until("ready", async () => (await status(X)) === "ready", 240000);
      await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
      await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
    }
    {
      for (const X of [A, B]) await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
      const a = await cookMany(A, 6), b = await cookMany(B, 2);
      ok(`${label}: dishes cooked`, a.length >= 4 && b.length >= 1, { a, b });
      for (const X of [A, B]) { await X.evaluate(`${V}.warp(${spot[0]}, ${spot[1]})`); await sleep(1500); await setAll(X); }
      const on = await pots(A);
      ok(`${label}: pots on the feast table`, on.length >= 4, on);
    }
    const near = KITCHEN.seats.findIndex((s) => s.back && s.table === 0) + 2, far = KITCHEN.seats.findIndex((s) => !s.back && s.table === 0) + 1;
    await A.evaluate(`${V}.warp(${spot[0]}, ${spot[1]})`); await B.evaluate(`${V}.warp(${KITCHEN.seats[near].stand.join(", ")})`);
    await sleep(2000);
    await A.shot(`${OUT}/feast-${label}-standing.png`);
    // somebody on a far bench (behind the left table) and somebody on a near bench (before it, back to the viewer)
    const sa = await sit(A, YARD_SEATS + far), sb = await sit(B, YARD_SEATS + near);
    ok(`${label}: sat at both sides of the left table`, sa === YARD_SEATS + far && sb === YARD_SEATS + near, { sa, sb });
    await A.evaluate(`${P}?.querySelector("[data-feast-close]")?.click()`);
    await sleep(1500);
    await A.shot(`${OUT}/feast-${label}-sitting.png`);
    await B.shot(`${OUT}/feast-${label}-sitting-near.png`);
    await A.evaluate(`${V}.lookAt(71, 51)`);
    await sleep(1200);
    await A.shot(`${OUT}/feast-${label}-right.png`);
  } finally {
    await A.close?.(); await B.close?.();
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
