// The animal farm's art in the game (docs/plans/animals, art round 2): the starters, each sex, the shorn ewe and ram and
// the fleeced, the babies and the young, walking toward the viewer and away and standing, in a barn and out on the
// meadow; and the barn's one trough with two and four slots of different feeds. Screenshots for the art review at
// desktop and phone (the trial keeper, no database).
//
//   node town-animals-art.mjs <base> <outdir> [desktop|phone|all]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3194", OUT = ".", ONLY = "all"] = process.argv.slice(2);
const S = "window.__townPasture", T = "window.__townTrade";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, mobile: true } };
const alive = (X) => X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {});
const look = async (X, x, y, ms = 2500) => { await alive(X); await X.evaluate(`(window.__townView.warp(${x}, ${y}), window.__townView.lookAt(${x + 0.5}, ${y + 0.5}))`); await sleep(ms); };

async function run(label) {
  const X = await browser(`animals-art-${label}`, SIZES[label]);
  const shot = async (name) => {
    await alive(X);
    await until("no view transition", () => X.evaluate(`!document.getAnimations().some((a) => String(a.effect?.pseudoElement ?? "").startsWith("::view-transition"))`), 15000).catch(() => {});
    await X.shot(`${OUT}/${label}-${name}.png`);
  };
  try {
    await X.goto(`${BASE}/town?townTest=A&townRoom=art&townHour=10&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial", () => X.evaluate(`!!${T}`), 30000);
    await look(X, 200, 22);
    await until("the pasture's code", () => X.evaluate(`!!${S}`), 40000);
    const b = (await X.evaluate(`${S}.barns()`))[9];
    // ── the barn's trough, four slots: a cow, a duck, a ewe and a hen, each its own feed and level
    const give = (list) => X.evaluate(`(() => { const t = ${T}; t.animalsClear(); t.animalHerd({ barn: 9, room: ${list.length <= 2 ? 2 : list.length <= 4 ? 4 : 16} });
      for (const [breed, stage, sex, food, banked] of ${JSON.stringify(list)}) { const a = t.animalGive(breed, stage, 6, sex); if (a) t.animalSet(a.id, { food, banked, made: banked ? 0 : 2, at: t.now() }); } return t.animalWorld().animals.length; })()`);
    await give([["dairyCow", "adult", "f", 24, 0], ["puddleDuck", "adult", "m", 10, 0], ["meadowSheep", "adult", "f", 24, 0], ["barnHen", "adult", "f", 7, 0]]);
    await look(X, b.x + 4, b.y + 2, 4000);
    await shot("01-inside-trough4");
    await give([["dairyCow", "adult", "m", 22, 0], ["meadowSheep", "adult", "m", 9, 1]]);
    await look(X, b.x + 4, b.y + 2, 4000);
    await shot("02-inside-trough2");
    // ── the starters, both sexes, shorn and fleeced, and the young of each kind: in the barn, then out
    await give([["barnHen", "adult", "f", 20, 0], ["barnHen", "adult", "m", 20, 0], ["puddleDuck", "adult", "f", 20, 0], ["puddleDuck", "adult", "m", 20, 0],
      ["meadowSheep", "adult", "f", 20, 0], ["meadowSheep", "adult", "m", 20, 1], ["dairyCow", "adult", "f", 20, 0], ["dairyCow", "adult", "m", 20, 0],
      ["barnHen", "baby", "f", 20, 0], ["barnHen", "young", "m", 20, 0], ["puddleDuck", "baby", "f", 20, 0], ["puddleDuck", "young", "f", 20, 0],
      ["meadowSheep", "baby", "f", 20, 0], ["meadowSheep", "young", "m", 20, 0], ["dairyCow", "baby", "f", 20, 0], ["dairyCow", "young", "m", 20, 0]]);
    await look(X, b.x + 4, b.y + 2, 4000);
    await shot("03-inside-herd");
    // the door opened: out they come toward the viewer, then along the lane away (a shot or two as they go)
    await X.evaluate(`${T}.animals({ action: "door", open: true })`);
    await look(X, b.x + 4, b.y + b.h + 3, 3500);
    await shot("04-out-door");
    await sleep(5000);
    await shot("05-out-lane");
    await sleep(6000);
    await look(X, b.x - 2, b.y + b.h + 2, 1500);
    await shot("06-out-lane-west");
    // out on the meadow a while on: grazing, standing, walking about
    await X.evaluate(`${T}.skipHours(0.3)`);
    const spots = Object.values(await X.evaluate(`${S}.spots()`)).filter((p) => p.x > 195 && p.y > 34 && p.y < 47);
    const at = spots[0] ?? { x: 206, y: 40 };
    await look(X, Math.floor(at.x), Math.floor(at.y) + 2, 4000);
    await shot("07-meadow");
    await sleep(4000);
    await shot("08-meadow-later");
    console.log(`  ${label}: errors ${JSON.stringify(X.errors())}`);
  } finally { X.close(); }
}
for (const label of ONLY === "all" ? ["desktop", "phone"] : [ONLY]) { console.log(`— ${label}`); await run(label).catch((e) => console.log(`  FAIL ${label}: ${e.message}`)); }
process.exit(0);
