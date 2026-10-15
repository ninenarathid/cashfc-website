// What is out now (the time bands' newcomers, lib/town/band-species), on the dev test room at three sizes: the clock's
// band opens the book of what is out on this map in this band, the unfound as dark shapes with where, when and how;
// a newcomer caught (a mason bee, by the net) is named in it after, its card in the village's book with its time
// icon; and the forest before dawn. Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-outnow.mjs <base> <outdir> [desk,phone,small]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3144", OUT = ".", ONLY = "desk,phone,small"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const K = "window.__townTrade", V = "window.__townView", B = "window.__townBugs";
const SIZES = { desk: { width: 1280, height: 860 }, phone: { width: 384, height: 730 }, small: { width: 360, height: 640 } };
const poseOf = (X, id) => X.evaluate(`${B}.poses().find((p) => p.id === ${id}) ?? null`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(500); };
const standNear = (X, at) => X.evaluate(`(() => { let best = null, d0 = 1e9;
  for (let dx = -9; dx <= 9; dx++) for (let dy = -9; dy <= 9; dy++) { const x = Math.floor(${at.x}) + dx, y = Math.floor(${at.y}) + dy;
    if (!${V}.walkable(x, y)) continue; const d = Math.hypot(x + 0.5 - ${at.x}, y + 0.5 - ${at.y}); if (d < d0) { d0 = d; best = { x, y }; } }
  return best; })()`);
async function lead(X, id, ms = 300) {
  const a = await poseOf(X, id), t0 = Date.now();
  await sleep(60);
  const b = await poseOf(X, id), dt = Date.now() - t0;
  if (!a || !b) return false;
  const at = { x: b.aim.x + ((b.aim.x - a.aim.x) / dt) * (ms + 25), y: b.aim.y + ((b.aim.y - a.aim.y) / dt) * (ms + 25) };
  return X.evaluate(`${B}.tap(${at.x}, ${at.y})`);
}
const openBook = async (X) => { await X.evaluate(`document.querySelector("[data-town-out-now]")?.click()`); await until("the book", () => X.evaluate(`!!document.querySelector("dialog[open] [data-notebook-reader]")`), 6000, 100); await sleep(500); };
const closeBook = async (X) => { await X.evaluate(`document.querySelector("dialog[open] [data-notebook-reader] header button")?.click()`); await sleep(400); };
const pageOf = (X, id) => X.evaluate(`(() => { const b = [...document.querySelectorAll("dialog[open] nav button")]; const i = b.findIndex((x) => x.innerText.includes(${JSON.stringify(id)})); if (i >= 0) b[i].click(); return i; })()`);

for (const size of ONLY.split(",")) {
  const X = await browser(`outnow-${size}`, SIZES[size]);
  try {
    console.log(size);
    await X.goto(`${BASE}/town?townTest=B&townRoom=outnow${size}&townHour=8.5&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial", () => X.evaluate(`!!${K} && typeof ${K}.setBug === "function" && !!${B}`), 20000);
    await X.evaluate(`${K}.setSalt("outnow")`);
    await sleep(800);
    await X.shot(`${OUT}/${size}-0-hud.png`);
    const box = await X.evaluate(`(() => { const r = document.querySelector("[data-town-out-now]").getBoundingClientRect(); return { w: r.width, h: r.height }; })()`);
    ok("the clock's band is a button", box.w > 30 && box.h > 10, box);
    await openBook(X);
    const titles = await X.evaluate(`[...document.querySelectorAll("dialog[open] nav button")].map((b) => b.innerText.trim())`);
    ok("the town in the late morning: the newcomers out here, unfound as shapes", titles.length >= 3 && titles.some((t) => t.includes("ยังไม่พบ") || t.includes("Not found")), titles);
    await X.shot(`${OUT}/${size}-1-outnow-town.png`);
    await closeBook(X);
    if (size === "desk" || size === "phone") {
      // a mason bee among the town's newcomers' flowers, caught with the net
      const id = await X.evaluate(`(() => { const all = ${B}.haunts().filter((h) => h.place === "town" && h.kind === "petals"); return all[0]?.id ?? -1; })()`);
      await X.evaluate(`${K}.setBug(${id}, "masonBee")`);
      const h = await X.evaluate(`${B}.haunts().find((x) => x.id === ${id})`);
      await warp(X, ...Object.values(await standNear(X, h)));
      await until("the bee is about", () => poseOf(X, id), 8000, 100).catch(() => null);
      await sleep(700);
      await X.shot(`${OUT}/${size}-1b-onmap.png`);
      await X.evaluate(`${K}.grant("bugNet", 1)`);
      await X.evaluate(`${K}.hold(${K}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
      await sleep(400);
      let got = false;
      for (let i = 0; i < 16 && !got; i++) {
        const q = await poseOf(X, id);
        if (!q) break;
        const me = await X.evaluate(`${V}.self()`);
        if (Math.hypot(q.aim.x - me.x, q.aim.y - me.y) > 1.6) { const t = await standNear(X, q.aim); await warp(X, t.x, t.y); continue; }
        if (await lead(X, id)) await sleep(900);
        got = await X.evaluate(`${K}.purse().bag.some((s) => s && s.item === "masonBee")`);
      }
      ok("a newcomer is caught as an insect of its habit is", got);
      await sleep(500);
      await X.shot(`${OUT}/${size}-2-caught.png`);
      await openBook(X);
      const named = await pageOf(X, "ผึ้งเมสัน") >= 0 || await pageOf(X, "Mason bee") >= 0;
      ok("caught, it is named in what is out now", named);
      await sleep(400);
      await X.shot(`${OUT}/${size}-3-outnow-found.png`);
      await closeBook(X);
      // its card in the village's book, with its time icon
      await X.evaluate(`document.querySelector('button[title="กระเป๋า"], button[title="Bag"]')?.click()`);
      await sleep(600);
      await X.evaluate(`document.querySelector("[data-bug-book] button")?.click()`);
      await until("the village's book", () => X.evaluate(`!!document.querySelector("dialog[open] [data-notebook-reader]")`), 6000, 100).catch(() => null);
      await pageOf(X, "ผึ้งเมสัน");
      await sleep(500);
      ok("its card shows its time icon", await X.evaluate(`!!document.querySelector('[data-bug="masonBee"] [data-bug-time="sun"]')`));
      await X.shot(`${OUT}/${size}-4-book-card.png`);
      await closeBook(X);
      await X.evaluate(`document.querySelector('button[title="กระเป๋า"], button[title="Bag"]')?.click()`);
      await sleep(300);
    }
    // the forest before dawn
    await X.goto(`${BASE}/town?townTest=B&townRoom=outnow${size}b&townHour=4.2&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial", () => X.evaluate(`!!${K} && !!${B}`), 20000);
    const f = await X.evaluate(`${B}.haunts().find((x) => x.place === "forest" && x.kind === "petals")`);
    await warp(X, ...Object.values(await standNear(X, f)));
    await sleep(1500);
    await openBook(X);
    const forest = await X.evaluate(`document.querySelector("dialog[open] h3")?.innerText ?? ""`);
    ok("the forest before dawn", /ก่อนรุ่ง|Before dawn/.test(forest) && /ป่า|Forest/.test(forest), forest);
    await X.shot(`${OUT}/${size}-5-outnow-forest-dawn.png`);
    await closeBook(X);
  } catch (e) { ok(`${size} ran`, false, e.message); }
  finally { await X.close?.(); }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
