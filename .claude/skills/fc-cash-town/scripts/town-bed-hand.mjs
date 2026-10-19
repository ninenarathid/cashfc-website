// A bed's owner hands it on or gives it up (lib/town/bed-hand, 2026-10-19), in a real browser on the dev test room,
// by two testers in two windows of one browser who share its farm: standing in my bed its chip opens its card; the
// tester standing by me is offered with how many beds they hold; handing it on is asked again, and done, the bed is
// theirs with its plants; giving another bed up is asked again, and done, its plants are gone, its insect house in my
// bag and the bed nobody's. Screenshots at desktop and phone size; PASS/FAIL lines.
//
//   node town-bed-hand.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3186", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const T = "window.__townTrade";
const corner = (bed) => { const col = bed % 6, row = Math.floor(bed / 6); return [128 + (col < 3 ? 4 : 33) + (col % 3) * 8, 4 + Math.floor(row / 2) * 21 + (row % 2) * 8]; };
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=bedhand&townHour=12&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
const click = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`);
const shown = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);

for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const X = await browser(`bed-${label}`, size);
  try {
    await enter(X, "M");
    const me = await X.evaluate(`${T}.id`);
    const B = await X.window("B", size);
    await enter(B, "B");
    const pal = await B.evaluate(`${T}.id`);
    const [ax, ay] = corner(30), [cx, cy] = corner(32), [bx, by] = corner(31);
    // M's bed 30 with two plants, B's bed 31, M's bed 32 with a plant and an insect house
    await X.evaluate(`(() => {
      const t = ${T}, now = t.now(), p = (by, crop) => ({ by, crop, sown: now - 7200000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 });
      localStorage.setItem("cashtown.trial.beds.1", JSON.stringify({ 30: { by: ${JSON.stringify(me)}, name: "ทดสอบ M", tended: now, empty: 0 }, 31: { by: ${JSON.stringify(pal)}, name: "ทดสอบ B", tended: now, empty: 0 }, 32: { by: ${JSON.stringify(me)}, name: "ทดสอบ M", tended: now, empty: 0 } }));
      localStorage.setItem("cashtown.trial.farm.2", JSON.stringify({
        "${ax + 2},${ay + 2}": { soil: "tilled", plant: p(${JSON.stringify(me)}, "kangkong") }, "${ax + 3},${ay + 2}": { soil: "tilled", plant: p(${JSON.stringify(me)}, "chili") },
        "${bx + 1},${by + 1}": { soil: "tilled", plant: p(${JSON.stringify(pal)}, "kangkong") },
        "${cx + 2},${cy + 2}": { soil: "tilled", plant: p(${JSON.stringify(me)}, "kangkong") }, "${cx + 4},${cy + 4}": { soil: "house", plant: null, house: { by: ${JSON.stringify(me)}, at: now - 3600000, rooms: [null, null] } },
      }));
    })()`);
    await X.evaluate(`window.__townView.warp(${ax + 2}, ${ay + 3})`);
    await B.evaluate(`window.__townView.warp(${ax + 4}, ${ay + 3})`);
    await sleep(3000);
    await until("my bed's chip", () => shown(X, "[data-bed-chip]"), 15000).catch(() => {});
    ok(`${label}: standing in my bed, its chip`, await shown(X, "[data-bed-chip]"));
    await click(X, "[data-bed-chip]");
    await sleep(800);
    const offered = await X.evaluate(`[...document.querySelectorAll("[data-bed-give]")].map((b) => b.getAttribute("data-bed-give"))`);
    ok(`${label}: the tester by me is offered`, offered.includes(pal), offered);
    await X.shot(`${OUT}/bed-${label}-card.png`);
    await click(X, `[data-bed-give="${pal}"]`);
    await sleep(600);
    ok(`${label}: handing it on is asked again`, await shown(X, '[data-bed-ask="give"]'));
    ok(`${label}: with "leave it" under the finger`, await X.evaluate(`document.activeElement?.hasAttribute("data-bed-ask-no") ?? false`));
    await X.shot(`${OUT}/bed-${label}-give-ask.png`);
    await click(X, "[data-bed-ask-yes]");
    await sleep(1200);
    const owners = await X.evaluate(`Object.fromEntries([...${T}.owners()].map(([n, o]) => [n, o.by]))`);
    ok(`${label}: the bed is theirs`, owners[30] === pal, owners);
    const plants = await X.evaluate(`Object.values(${T}.farm()).filter((p) => p.plant && p.plant.by === ${JSON.stringify(pal)}).length`);
    ok(`${label}: with its plants`, plants === 3, plants);
    await X.shot(`${OUT}/bed-${label}-given.png`);
    // giving bed 32 up
    await X.evaluate(`window.__townView.warp(${cx + 2}, ${cy + 3})`);
    await sleep(1500);
    await click(X, "[data-bed-chip]");
    await sleep(600);
    await click(X, "[data-bed-leave]");
    await sleep(600);
    ok(`${label}: giving it up is asked again`, await shown(X, '[data-bed-ask="leave"]'));
    await X.shot(`${OUT}/bed-${label}-leave-ask.png`);
    await click(X, "[data-bed-ask-yes]");
    await sleep(1200);
    const after = await X.evaluate(`(() => { const t = ${T}; return { owned: [...t.owners()].some(([n]) => n === 32), plants: Object.entries(t.farm()).filter(([k, p]) => p.plant && k === "${cx + 2},${cy + 2}").length, house: t.purse().bag.some((s) => s?.item === "insectHouse") }; })()`);
    ok(`${label}: given up: nobody's, its plant gone, its house in my bag`, !after.owned && after.plants === 0 && after.house, after);
    await X.shot(`${OUT}/bed-${label}-left.png`);
  } finally { X.close(); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
