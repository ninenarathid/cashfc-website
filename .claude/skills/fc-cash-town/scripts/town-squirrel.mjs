// The squirrel's other half (the forest's second rank; the owner's ladder of 2026-10-07): what lies on the forest's
// ground is fetched for its member as they walk past it, for no stamina, and the squirrel is seen running for it.
// Tried in the trial: with no squirrel nothing is fetched; with one, walking past a place two tiles off is enough,
// the thing is in the bag, no stamina is spent and the place has no more for me; what grows is left for my own
// hands; tired, it fetches with no game; a bag with no room gets nothing, and has it once there is room.
//
//   node .claude/skills/fc-cash-town/scripts/town-squirrel.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes squirrel-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townForest";
const PICKS = ["sticks", "leaves", "flowers", "bamboo", "clay", "nook", "glint"];
const enter = async (X, more = "") => {
  await X.goto(`${BASE}/town?townTest=Q&townRoom=check&townHour=12&townWeather=clear${more}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const sights = (X) => X.evaluate(`${F}?.sights?.() ?? []`);
const heldOf = (X, id) => X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === ${JSON.stringify(id)} ? s.n : 0), 0)`);
const left = (X) => X.evaluate(`${T}.purse().stamina.left`);
/** A place of a sort that nothing else of its sort lies within five tiles of, with a walkable tile `dx` beside it both ways along a line `dy` off it. */
async function lonely(X, all, sort, dy = 2, span = 4) {
  for (const s of all.filter((x) => sort(x))) {
    if (all.some((o) => o.id !== s.id && PICKS.includes(o.kind) && Math.max(Math.abs(o.x - s.x), Math.abs(o.y - s.y)) <= 5)) continue;
    const free = await X.evaluate(`[${-span}, ${span}, 2].every((dx) => ${V}.walkable(${s.x} + dx, ${s.y + dy})) && ${V}.walkable(${s.x + 2}, ${s.y})`);
    if (free) return s;
  }
  return null;
}

const X = await browser("Squirrel", { width: 1280, height: 860 });
try {
  await enter(X);
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
  await sleep(300);
  await enter(X);
  await X.evaluate(`${T}.setSalt?.("check")`);
  await X.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's things", async () => (await sights(X)).length > 40, 30000);
  let all = await sights(X);
  const one = await lonely(X, all, (s) => PICKS.includes(s.kind));
  ok("a place where something lies on the ground, with open ground about it", !!one, all.length);

  // ── with no squirrel: nothing is fetched ──
  await X.evaluate(`${V}.warp(${one.x + 2}, ${one.y})`);
  await sleep(1600);
  ok("with no squirrel, two tiles from it nothing is fetched and nothing is offered", (await X.evaluate(`${F}.fetched()`)) === 0 && (await heldOf(X, one.item)) === 0 && (await X.evaluate(`${F}.here()`)) === null);

  // ── with one, and a keeper that does not know of its fetching yet (a page out before its database's file): as it was ──
  await X.evaluate(`${K}.gives = () => false`);
  await X.evaluate(`${T}.setGifts(["famSquirrel"])`);
  const called = await X.evaluate(`${K}.familiarWear("famSquirrel")`);
  ok("the squirrel is called", called.ok === true, called);
  await sleep(1600);
  ok("where the keeper does not give the later gifts yet, the page fetches nothing and offers nothing from two tiles off", (await X.evaluate(`${F}.fetched()`)) === 0 && (await heldOf(X, one.item)) === 0 && (await X.evaluate(`${F}.here()`)) === null);
  // ── with one: walking past is enough ──
  await X.evaluate(`(delete ${K}.gives, ${T}.setStamina(100))`);
  await until("it is fetched from two tiles off, standing", async () => (await X.evaluate(`${F}.fetched()`)) === 1, 6000).catch(() => null);
  ok("with it at my heels, what lies two tiles off is fetched while I stand", (await X.evaluate(`${F}.fetched()`)) === 1 && (await heldOf(X, one.item)) === one.n, { fetched: await X.evaluate(`${F}.fetched()`), held: await heldOf(X, one.item), one });
  ok("…for no stamina", (await left(X)) === 100, await left(X));
  ok("…and the place has nothing more for me", !(await sights(X)).some((s) => s.id === one.id));
  ok("…the page says what the squirrel brought, with its picture", await X.evaluate(`!!document.querySelector('[data-forest-note="famSquirrel"]')`));
  await X.shot(`${OUT}/squirrel-fetched.png`);

  // walking past another, never stopping near it
  all = await sights(X);
  const two = await lonely(X, all, (s) => PICKS.includes(s.kind) && s.id !== one.id);
  ok("another such place", !!two);
  await X.evaluate(`${V}.warp(${two.x - 4}, ${two.y + 2})`);
  await sleep(900);
  const before = await X.evaluate(`${F}.fetched()`), had = await heldOf(X, two.item);
  await X.evaluate(`${V}.walk(${two.x + 4}, ${two.y + 2})`);
  let walking = false, shot = false;
  for (let i = 0; i < 80; i++) {
    const st = await X.evaluate(`({ n: ${F}.fetched(), me: ${V}.self() })`);
    if (!shot && Math.abs(st.me.x - two.x) < 1.6) { shot = true; await X.shot(`${OUT}/squirrel-running.png`); }
    if (st.n > before) { walking = st.me.moving; break; }
    await sleep(60);
  }
  ok("walking past a place two tiles to the side, it is fetched as I pass, without my stopping", walking === true && (await heldOf(X, two.item)) === had + two.n, { walking, held: await heldOf(X, two.item), had, two });
  ok("…for no stamina", (await left(X)) === 100, await left(X));
  await sleep(1500);

  // ── what grows is my own hands' ──
  all = await sights(X);
  const grows = all.find((s) => ["mushrooms", "greens", "berries"].includes(s.kind) && !all.some((o) => PICKS.includes(o.kind) && Math.max(Math.abs(o.x - s.x), Math.abs(o.y - s.y)) <= 3));
  await X.evaluate(`${V}.warp(${grows.x + 1}, ${grows.y})`);
  const n0 = await X.evaluate(`${F}.fetched()`);
  await sleep(1800);
  ok("what grows is not fetched: it is offered to my own hands, as ever", (await X.evaluate(`${F}.fetched()`)) === n0 && (await X.evaluate(`${F}.here()?.id`)) === grows.id && (await heldOf(X, grows.item)) === 0);

  // ── tired: fetched all the same, with no game ──
  await X.evaluate(`${T}.setStamina(0)`);
  all = await sights(X);
  const three = await lonely(X, all, (s) => PICKS.includes(s.kind));
  const h3 = await heldOf(X, three.item);
  await X.evaluate(`${V}.warp(${three.x + 2}, ${three.y})`);
  await until("fetched with no stamina", async () => (await heldOf(X, three.item)) === h3 + three.n, 6000).catch(() => null);
  ok("with no stamina left it fetches all the same, and no game comes up", (await heldOf(X, three.item)) === h3 + three.n && !(await gameUp(X)) && (await left(X)) === 0, { held: await heldOf(X, three.item), game: await gameUp(X) });
  await X.evaluate(`${T}.setStamina(100)`);

  // ── a bag with no room ──
  // (every slot taken by a thing that takes a slot to itself; then a place whose thing the bag has none of)
  await X.evaluate(`(() => { ${T}.empty(); for (const id of ["rod", "hoe", "can", "pot", "pan", "grill", "bucket", "bugNet", "skewer", "sickle", "mortar", "wok"]) if (${T}.purse().bag.some((s) => !s)) ${T}.grant(id, 1); })()`);
  const room = await X.evaluate(`${T}.purse().bag.filter((s) => !s).length`);
  all = await sights(X);
  const four = await lonely(X, all, (s) => PICKS.includes(s.kind));
  const h4 = await heldOf(X, four.item), n4 = await X.evaluate(`${F}.fetched()`);
  await X.evaluate(`${V}.warp(${four.x + 2}, ${four.y})`);
  await sleep(1800);
  ok("into a bag with no room nothing is fetched", room === 0 && (await X.evaluate(`${F}.fetched()`)) === n4 && (await heldOf(X, four.item)) === h4, { room, fetched: await X.evaluate(`${F}.fetched()`) });
  ok("…and the place still has it", (await sights(X)).some((s) => s.id === four.id));
  await X.evaluate(`${T}.drop(${T}.purse().bag.findIndex((s) => s && s.item === "rod"))`);
  await until("room made, it is fetched", async () => (await heldOf(X, four.item)) > h4, 20000).catch(() => null);
  ok("room made, the squirrel goes back for it", (await heldOf(X, four.item)) === h4 + four.n, { held: await heldOf(X, four.item), h4, four });

  // ── twenty fetches to a meal's hours (the owner, 2026-10-07): the last one, and what is after it ──
  await X.evaluate(`(${T}.empty(), ${T}.setUsed("famSquirrel", 19))`);
  all = await sights(X);
  const last = await lonely(X, all, (s) => PICKS.includes(s.kind));
  if (last) {
    const nl = await X.evaluate(`${F}.fetched()`);
    await X.evaluate(`${V}.warp(${last.x + 2}, ${last.y})`);
    await until("the last fetch of these hours", async () => (await X.evaluate(`${F}.fetched()`)) === nl + 1, 6000).catch(() => null);
    const used = await X.evaluate(`${T}.purse().gifts.used.famSquirrel?.n`);
    ok("the twentieth of these hours is fetched and counted, and the page says the squirrel rests", (await X.evaluate(`${F}.fetched()`)) === nl + 1 && used === 20
      && /พัก|rests/.test(await X.evaluate(`document.querySelector('[data-forest-note="famSquirrel"]')?.textContent ?? ""`)), { used, note: await X.evaluate(`document.querySelector('[data-forest-note]')?.textContent ?? ""`) });
    all = await sights(X);
    const past = await lonely(X, all, (s) => PICKS.includes(s.kind));
    if (past) {
      const hp = await heldOf(X, past.item), sp = await left(X);
      await X.evaluate(`${V}.warp(${past.x + 2}, ${past.y})`);
      await sleep(1800);
      ok("past the count nothing is fetched, from two tiles off nothing is offered, and no stamina is taken", (await X.evaluate(`${F}.fetched()`)) === nl + 1 && (await heldOf(X, past.item)) === hp && (await X.evaluate(`${F}.here()`)) === null && (await left(X)) === sp,
        { fetched: await X.evaluate(`${F}.fetched()`), here: await X.evaluate(`${F}.here()`) });
      await X.evaluate(`${V}.warp(${past.x + 1}, ${past.y})`);
      await sleep(1500);
      ok("…and from beside it the place is offered to my own hands, and still not taken by itself", (await X.evaluate(`${F}.here()?.id`)) === past.id && (await heldOf(X, past.item)) === hp && (await left(X)) === sp, { here: await X.evaluate(`${F}.here()`) });
    }
    await X.evaluate(`${T}.setUsed("famSquirrel", 0)`);
  }

  // ── sent to rest: nothing more is fetched ──
  await X.evaluate(`${K}.familiarWear(null)`);
  all = await sights(X);
  const five = await lonely(X, all, (s) => PICKS.includes(s.kind));
  if (five) {
    const n5 = await X.evaluate(`${F}.fetched()`);
    await X.evaluate(`${V}.warp(${five.x + 2}, ${five.y})`);
    await sleep(1500);
    ok("sent to rest, it fetches nothing", (await X.evaluate(`${F}.fetched()`)) === n5);
  }
  ok("no page errors", X.logs.length === 0, X.logs);
} catch (e) { ok("the run", false, e.message); console.log(X.logs.join("\n")); } finally { await X.close(); }

// at a phone's width: the squirrel's note fits
const P = await browser("SquirrelPhone", { width: 360, height: 740, mobile: true, dpr: 2 });
try {
  await enter(P);
  await P.evaluate(`${T}.setSalt?.("check")`);
  await P.evaluate(`(${T}.setGifts(["famSquirrel"]), ${T}.empty())`);
  await P.evaluate(`${K}.familiarWear("famSquirrel")`);
  await P.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await until("the forest's things", async () => (await sights(P)).length > 40, 30000);
  const all = await sights(P), s = all.find((x) => PICKS.includes(x.kind));
  await P.evaluate(`${V}.warp(${s.x + 1}, ${s.y + 1})`);
  await until("a note", () => P.evaluate(`!!document.querySelector('[data-forest-note="famSquirrel"]')`), 8000).catch(() => null);
  const box = await P.evaluate(`(() => { const r = document.querySelector('[data-forest-note="famSquirrel"]')?.getBoundingClientRect(); return r ? { l: r.left, r: r.right } : null; })()`);
  ok("at a phone's width the squirrel's note is whole on the screen", !!box && box.l >= 0 && box.r <= 360, box);
  await P.shot(`${OUT}/squirrel-phone.png`);
  ok("no page errors at a phone's width", P.logs.length === 0, P.logs);
} catch (e) { ok("the phone's run", false, e.message); } finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
