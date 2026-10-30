// The growth bar's decimal and a dark can's watering, in a real browser on the dev test room, at a desktop and a phone:
// two garlics of one age, the Quality panel open before and after one watering, one with a plain can and one with a dark
// can at +7; a kangkong in a later round, the same; and the smith's card of a fire hoe at +10 and a dark can at +7.
//
//   node town-gem-growth.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes gem-growth-*.png, and prints what the panel said.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3181", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const T = "window.__townTrade", K = "window.__townKeeper", F = "window.__townFarm", V = "window.__townView", S = "window.__townSmith";
const SIZES = [["desktop", 1280, 860], ["phone", 384, 730], ["small", 360, 640]];
const H = 3_600_000, FARM = "cashtown.trial.farm.2";
const said = (X) => X.evaluate(`[...document.querySelectorAll("[data-quality-inspector] header span")].map((e) => e.textContent).filter((t) => /%|สุก/.test(t ?? ""))[0] ?? null`);
const click = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`);
const openPanel = async (X) => { await click(X, "[data-quality-chip]"); await sleep(600); };
const closePanel = async (X) => { await click(X, '[data-quality-inspector] header button'); await sleep(350); };
let code = 0;
for (const [size, width, height] of SIZES) {
  const X = await browser(`Gem ${size}`, { width, height, mobile: size !== "desktop" });
  const shot = (name) => X.shot(`${OUT}/gem-growth-${size}-${name}.png`);
  try {
    await X.goto(`${BASE}/town?townTest=M&townRoom=check&townHour=12&townWeather=cloudy`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial", () => X.evaluate(`!!${T}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget())`);
    await sleep(400);
    await X.evaluate(`(${T}.resize(20), ${T}.setStamina(100), ${T}.grant("can", 2), ${T}.grant("hoe", 1))`);
    const [x, y] = await X.evaluate(`${T}.showGarden("M")`);
    // (two garlics of an age, and a kangkong picked two hours ago that waits twelve)
    const [A, B, C] = [`${x + 3},${y + 1}`, `${x + 4},${y + 1}`, `${x + 5},${y + 1}`];
    await X.evaluate(`(() => { const t = ${T}, now = t.now(), never = now + 8760 * ${H}, plots = { ...t.farm() };
      const garlic = { by: t.id, crop: "garlic", sown: now - 0.7236 * 60 * ${H}, boost: 0, watered: 0, fed: 0, guard: never, cured: 0, picked: 0, pickedAt: 0 };
      plots[${JSON.stringify(A)}] = { soil: "tilled", plant: { ...garlic } }; plots[${JSON.stringify(B)}] = { soil: "tilled", plant: { ...garlic } };
      plots[${JSON.stringify(C)}] = { soil: "tilled", plant: { ...garlic, crop: "kangkong", sown: now - 12 * ${H}, picked: 1, pickedAt: now - 2 * ${H}, boostAt: 0 } };
      t.write(${JSON.stringify(FARM)}, plots); t.tell();
      const p = t.purse(); let n = 0; t.save({ ...p, bag: p.bag.map((s) => (s && s.item === "can" ? { ...s, water: 20, ...(n++ === 1 ? { plus: 7, gems: ["dark"] } : {}) } : s)) }); })()`);
    const [plain, dark] = await X.evaluate(`${T}.purse().bag.map((s, i) => (s && s.item === "can" ? i : -1)).filter((i) => i >= 0)`);
    const hoe = await X.evaluate(`${T}.purse().bag.findIndex((s) => s && s.item === "hoe")`);
    await until("the farm's code", () => X.evaluate(`!!${F}`), 20000);
    const water = async (key, slot, name) => {
      const [px, py] = key.split(",").map(Number);
      await X.evaluate(`${V}.warp(${px}, ${py})`); await sleep(900);
      await X.evaluate(`${T}.hold(${slot})`); await sleep(400);
      await openPanel(X);
      const before = await said(X); await shot(`${name}-before`);
      await closePanel(X);
      const did = await X.evaluate(`${K}.farmDo(${JSON.stringify(key)}, "M", { hits: 1, misses: 0, secs: 1, need: 1 }).then((d) => ({ ok: d.ok, deed: d.deed, why: d.why }))`);
      await sleep(700);
      await openPanel(X);
      const after = await said(X); await shot(`${name}-after`);
      await closePanel(X);
      console.log(size, name, before, "->", after, did.ok ? "" : did.why);
    };
    await water(A, plain, "plain");
    await water(B, dark, "dark");
    await water(C, dark, "again");
    // (the smith's card: what each gem says of itself, where it is longest)
    await X.evaluate(`(${T}.setTool(${hoe}, 10, [], ["fire", "fire"]), ${S}.open("forge"))`);
    await sleep(800);
    await click(X, `[data-smith-tool="${hoe}"]`); await sleep(600);
    await X.evaluate(`document.querySelector("[data-smith-gem-does]")?.scrollIntoView({ block: "center" })`); await sleep(300);
    console.log(size, "hoe:", await X.evaluate(`document.querySelector("[data-smith-gem-does]")?.textContent ?? null`));
    await shot("hoe-card");
    await click(X, `[data-smith-tool="${dark}"]`); await sleep(600);
    await X.evaluate(`document.querySelector("[data-smith-gem-does]")?.scrollIntoView({ block: "center" })`); await sleep(300);
    console.log(size, "can:", await X.evaluate(`document.querySelector("[data-smith-gem-does]")?.textContent ?? null`));
    await shot("can-card");
    await X.evaluate(`${S}.close()`);
  } catch (e) { console.error(size, e.message); code = 1; } finally { X.close(); }
}
process.exit(code);
