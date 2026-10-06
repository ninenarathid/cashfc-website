// The forest walker's lamp (the owner, 2026-10-06: "ของที่ช่วยให้ป่าสว่างเวลากลางคืน เอาแค่พอให้ตัวเองเล่นง่ายขชึ้น"), looked at in
// the trial: the forest at night without it and with it worn, the same place and the same moment of the night; and
// by day, where it does nothing. The pictures are the check: lamp-night-bare.png, lamp-night-worn.png, lamp-day-worn.png.
//
//   node .claude/skills/fc-cash-town/scripts/town-lamp.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room).
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townForest";
const enter = async (X, hour) => {
  await X.goto(`${BASE}/town?townTest=L&townRoom=check&townHour=${hour}&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
/** How bright the middle of the map is about my own doll, and far from it: the mean of a patch of the canvas each. */
const light = (X) => X.evaluate(`(() => {
  const c = document.querySelector("canvas"), me = ${V}.screenOf(window.__cashTown.me().id), k = c.width / c.getBoundingClientRect().width;
  const g = c.getContext("2d"), mean = (x, y, r) => { const d = g.getImageData(Math.max(0, Math.round((x - r) * k)), Math.max(0, Math.round((y - r) * k)), Math.round(2 * r * k), Math.round(2 * r * k)).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; };
  return { near: mean(me.x, me.y, 60), far: mean(Math.max(80, me.x - 420), me.y, 60) };
})()`);

const X = await browser("Lamp", { width: 1280, height: 860 });
try {
  await enter(X, 23);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(300);
  await X.evaluate(`(localStorage.removeItem("cashtown.trial.lines.1"), localStorage.removeItem("cashtown.trial.titles.1"))`);
  await enter(X, 23);
  await X.evaluate(`${T}.setSalt?.("check")`);
  // (the meadow inside the forest's gate, where things lie about)
  await X.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's things", async () => ((await X.evaluate(`${F}?.sights?.()?.length ?? 0`)) > 40), 30000);
  // (beside something that lies on the ground, so that its glint is in the picture)
  const lies = (await X.evaluate(`${F}.sights()`)).filter((s) => ["sticks", "leaves", "flowers", "mushrooms", "greens"].includes(s.kind));
  const here = lies.sort((a, b) => Math.hypot(a.x - 192, a.y - 178) - Math.hypot(b.x - 192, b.y - 178))[0];
  await X.evaluate(`${V}.warp(${here.x + 1}, ${here.y + 1})`);
  await sleep(2500);
  const bare = await light(X);
  ok("at night with no lamp nothing glints", (await X.evaluate(`${F}.glints()`)) === 0);
  await X.shot(`${OUT}/lamp-night-bare.png`);

  await X.evaluate(`${T}.setLine("forest", 60)`);
  const took = await X.evaluate(`${K}.giftTake("forest", 1)`);
  ok("the forest's first rank gives the lamp", took.ok && took.gift === "charmLamp", took);
  const wore = await X.evaluate(`${K}.charmsWear(["charmLamp"])`);
  ok("and it is worn as a charm", wore.ok && (await X.evaluate(`${K}.purse().gifts.charms.join()`)) === "charmLamp", wore);
  await sleep(1800);
  const worn = await light(X);
  await X.shot(`${OUT}/lamp-night-worn.png`);
  ok("at night in the forest, with the lamp worn, it is lighter about me than it was", worn.near > bare.near * 1.25, { bare, worn });
  // (measured as the page measures it: from where my doll stands to the middle of the thing's tile)
  const me = (await X.evaluate(`window.__cashTown.me().pos`));
  const near = (await X.evaluate(`${F}.sights()`)).filter((s) => s.kind !== "fruit" && Math.hypot(s.x + 0.5 - me.x, s.y + 0.5 - me.y) <= 5).length;
  ok("what lies within the lamp's five tiles glints, each thing once, and nothing beyond", near > 0 && (await X.evaluate(`${F}.glints()`)) === near, { near, glints: await X.evaluate(`${F}.glints()`) });
  ok("…and far from me it is as dark as it was", Math.abs(worn.far - bare.far) < Math.max(3, bare.far * 0.08), { bare, worn });

  // by day the lamp does nothing
  await enter(X, 12);
  await X.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's things by day", async () => ((await X.evaluate(`${F}?.sights?.()?.length ?? 0`)) > 40), 30000);
  await sleep(2500);
  const day = await light(X);
  ok("by day nothing glints, lamp or no", (await X.evaluate(`${F}.glints()`)) === 0);
  await X.evaluate(`${K}.charmsWear([])`);
  await sleep(1500);
  const dayBare = await light(X);
  await X.shot(`${OUT}/lamp-day-worn.png`);
  ok("by day it changes nothing", Math.abs(day.near - dayBare.near) < Math.max(3, dayBare.near * 0.04), { day, dayBare });
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
