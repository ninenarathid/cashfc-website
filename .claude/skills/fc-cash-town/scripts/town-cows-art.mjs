// The cows in the game after the owner's fix (2026-10-20: the back views, the crooked legs): every cow and bull, and the
// young, in a barn, coming out of its door toward the viewer and walking away along the lane. For the art review.
//
//   node town-animals-art.mjs <base> <outdir> [desktop|phone|all]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3194", OUT = ".", ONLY = "all"] = process.argv.slice(2);
const S = "window.__townPasture", T = "window.__townTrade";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, mobile: true } };
const alive = (X) => X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {});
const look = async (X, x, y, ms = 2500) => { await alive(X); await X.evaluate(`(window.__townView.warp(${x}, ${y}), window.__townView.lookAt(${x + 0.5}, ${y + 0.5}))`); await sleep(ms); };

async function run(label) {
  const X = await browser(`cows-art-${label}`, SIZES[label]);
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
    const give = (list) => X.evaluate(`(() => { const t = ${T}; t.animalsClear(); t.animalHerd({ barn: 9, room: ${list.length <= 2 ? 2 : list.length <= 4 ? 4 : 16} });
      for (const [breed, stage, sex, food, banked] of ${JSON.stringify(list)}) { const a = t.animalGive(breed, stage, 6, sex); if (a) t.animalSet(a.id, { food, banked, made: banked ? 0 : 2, at: t.now() }); } return t.animalWorld().animals.length; })()`);
    // ── every cow and bull, and the young
    await give([["dairyCow", "adult", "f", 20, 0], ["dairyCow", "adult", "m", 20, 0], ["jersey", "adult", "f", 20, 0], ["jersey", "adult", "m", 20, 0],
      ["highland", "adult", "f", 20, 0], ["highland", "adult", "m", 20, 0], ["brownSwiss", "adult", "f", 20, 0], ["brownSwiss", "adult", "m", 20, 0],
      ["strawberryCow", "adult", "f", 20, 0], ["cocoaCow", "adult", "m", 20, 0], ["flowerCow", "adult", "f", 20, 0], ["milkyWayCow", "adult", "m", 20, 0],
      ["dairyCow", "baby", "f", 20, 0], ["dairyCow", "young", "f", 20, 0]]);
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
