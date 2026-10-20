// The animal farm's buildings in the game (art round 2, docs/plans/animals/ART-NEEDED 2b): a barn from outside with its
// door shut, the same with the door open, its inside with animals in it, the wide gates in the fence and
// Uncle Popoto's pen. Screenshots for the art review at desktop and phone (the trial keeper, no database).
//
//   node town-farm-buildings.mjs <base> <outdir> [desktop|phone|all]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3196", OUT = ".", ONLY = "all"] = process.argv.slice(2);
const S = "window.__townPasture", T = "window.__townTrade";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, mobile: true } };
const alive = (X) => X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {});
const look = async (X, x, y, ms = 2500) => { await alive(X); await X.evaluate(`(window.__townView.warp(${x}, ${y}), window.__townView.lookAt(${x + 0.5}, ${y + 0.5}))`); await sleep(ms); };

async function run(label) {
  const X = await browser(`farm-buildings-${label}`, SIZES[label]);
  const shot = async (name) => {
    await alive(X);
    await until("no view transition", () => X.evaluate(`!document.getAnimations().some((a) => String(a.effect?.pseudoElement ?? "").startsWith("::view-transition"))`), 15000).catch(() => {});
    await X.shot(`${OUT}/${label}-${name}.png`);
  };
  try {
    await X.goto(`${BASE}/town?townTest=A&townRoom=build&townHour=10&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial", () => X.evaluate(`!!${T}`), 30000);
    await look(X, 200, 22);
    await until("the pasture's code", () => X.evaluate(`!!${S}`), 40000);
    const barns = await X.evaluate(`${S}.barns()`), b = barns[9];
    await X.evaluate(`(() => { const t = ${T}; t.animalsClear(); t.animalHerd({ barn: 9, room: 4 });
      for (const [breed, stage, sex] of [["dairyCow", "adult", "f"], ["meadowSheep", "adult", "m"], ["barnHen", "adult", "f"], ["puddleDuck", "adult", "m"]]) { const a = t.animalGive(breed, stage, 6, sex); if (a) t.animalSet(a.id, { food: 20, at: t.now() }); } })()`);
    // the barns from outside, doors shut (mine and my neighbours')
    await look(X, b.x + 4, b.y + b.h + 4, 4000);
    await shot("01-barns-outside");
    // my door open
    await X.evaluate(`${T}.animals({ action: "door", open: true })`);
    await sleep(1500);
    await shot("02-barn-door-open");
    // inside
    await look(X, b.x + 4, b.y + 2, 4000);
    await shot("03-barn-inside");
    // the gates in the fence and Uncle Popoto's pen
    await look(X, 189, 21, 3500);
    await shot("05-gate-north");
    await look(X, 190, 29, 3500);
    await shot("06-pen");
    await look(X, 189, 63, 3500);
    await shot("07-gate-south");
    console.log(`  ${label}: errors ${JSON.stringify(X.errors())}`);
  } finally { X.close(); }
}
for (const label of ONLY === "all" ? ["desktop", "phone"] : [ONLY]) { console.log(`— ${label}`); await run(label).catch((e) => console.log(`  FAIL ${label}: ${e.message}`)); }
process.exit(0);
