// The moss stag (the forest's sixth rank; the owner's ladder of 2026-10-07): ridden on every map, its member moves
// twice as fast and gathers from its back whatever is within two tiles; everybody sees the rider on the stag. Tried in
// the trial with two members in two windows: one walks a stretch on foot and is timed; calls the stag, is seen by the
// other to have one, and rides the same stretch back in about half the time; the other's page walks the rider at the
// rider's pace, so they arrive on both screens together; from its back a place two tiles off is gathered, which on
// foot is too far; sat down, the rider is off its back; and it is ridden in town as in the forest.
//
//   node .claude/skills/fc-cash-town/scripts/town-stag.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes stag-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townForest";
const enter = async (X, letter, more = "") => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear${more}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
};
const self = (X) => X.evaluate(`${V}.self()`);
const seenBy = (Y, id) => Y.evaluate(`(window.__cashTown.people().find((p) => p.id === ${JSON.stringify(id)})?.pet ?? null)`);
const offers = (X) => X.evaluate(`[...document.querySelectorAll("[data-forest-offer]")].map((b) => b.dataset.forestOffer)`);
/** Walk to a tile and say how long it took, in milliseconds (by the page's own clock, so that waiting on the script's side is not counted). */
const timed = (X, x, y) => X.evaluate(`new Promise((done) => { const t0 = performance.now(); ${V}.walk(${x}, ${y}); const look = () => { const me = ${V}.self(); if (!me.moving && Math.hypot(me.x - ${x + 0.5}, me.y - ${y + 0.5}) < 0.2) done(Math.round(performance.now() - t0)); else requestAnimationFrame(look); }; requestAnimationFrame(look); })`);

const X = await browser("Stag", { width: 1280, height: 860 });
try {
  await enter(X, "S");
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
  await sleep(300);
  await enter(X, "S");
  await X.evaluate(`(${T}.setSalt("check"), ${T}.setStamina(100))`);
  const me = await X.evaluate(`window.__cashTown.me().id`);
  const Y = await X.window("StagB");
  await enter(Y, "U");
  await until("the other is in the room", async () => (await seenBy(Y, me)) !== null, 30000);

  // a straight stretch of the trail up through the meadow: there on foot, and back on the stag
  const A = [144 + 48, 112 + 70], B = [144 + 49, 112 + 59];
  await X.evaluate(`${V}.warp(${A[0]}, ${A[1]})`);
  await Y.evaluate(`${V}.warp(${A[0] + 2}, ${A[1] - 5})`);
  await sleep(1500);
  const afoot = await timed(X, B[0], B[1]);
  ok("a stretch of the trail is walked on foot", afoot > 1500, afoot);
  await sleep(400);
  await X.shot(`${OUT}/stag-0-afoot.png`);

  // ── the stag called: everybody is told ──
  await X.evaluate(`${T}.setGifts(["famStag"])`);
  const called = await X.evaluate(`${K}.familiarWear("famStag")`);
  ok("the stag is called", called.ok === true, called);
  await until("the other is told a stag follows me", async () => (await seenBy(Y, me)) === "famStag", 8000);
  ok("the other is told a stag follows me", true);
  await sleep(700);
  await X.shot(`${OUT}/stag-1-mounted.png`);

  // ── twice as fast, on my page and on theirs ──
  const mine = timed(X, A[0], A[1]);
  // (the other's page: when it has me standing at the same tile)
  const theirs = Y.evaluate(`new Promise((done) => { const t0 = performance.now(); let went = false; const look = () => { const a = ${V}.at(${JSON.stringify(me)}); if (a && a.moving) went = true; if (a && went && !a.moving && Math.hypot(a.x - ${A[0] + 0.5}, a.y - ${A[1] + 0.5}) < 0.2) done(Math.round(performance.now() - t0)); else if (performance.now() - t0 > 20000) done(-1); else requestAnimationFrame(look); }; requestAnimationFrame(look); })`);
  await sleep(700);
  const mid = { mine: await self(X), theirs: await Y.evaluate(`${V}.at(${JSON.stringify(me)})`) };
  await X.shot(`${OUT}/stag-2-riding.png`);
  await Y.shot(`${OUT}/stag-2-seen.png`);
  const ridden = await mine, seen = await theirs;
  ok("the same stretch back on the stag takes about half the time", ridden < afoot * 0.62 && ridden > afoot * 0.38, { afoot, ridden });
  ok("half way, the other's page has the rider about where their own page has them", !!mid.theirs && Math.hypot(mid.mine.x - mid.theirs.x, mid.mine.y - mid.theirs.y) < 2.5, mid);
  ok("the other's page walks the rider at the rider's pace: they arrive there in the same time", seen > 0 && Math.abs(seen - ridden) < 900, { ridden, seen });

  // ── from its back, two tiles off ──
  await until("the forest's things", async () => ((await X.evaluate(`${F}?.sights?.()?.length ?? 0`)) > 40), 30000);
  const all = await X.evaluate(`${F}.sights()`);
  const grows = [];
  for (const s of all.filter((x) => ["mushrooms", "greens", "berries"].includes(x.kind))) {
    if (all.some((o) => o.id !== s.id && Math.max(Math.abs(o.x - s.x), Math.abs(o.y - s.y)) <= 4)) continue;
    if (await X.evaluate(`${V}.walkable(${s.x + 2}, ${s.y})`)) grows.push(s);
  }
  const g = grows[0];
  ok("a place where something grows, with open ground two tiles from it", !!g, all.length);
  await X.evaluate(`${V}.warp(${g.x + 2}, ${g.y})`);
  await until("it is offered from two tiles off", async () => (await X.evaluate(`${F}.here()?.id ?? null`)) === g.id, 6000, 120).catch(() => null);
  ok("from the stag's back a place two tiles off is offered", (await X.evaluate(`${F}.here()?.id ?? null`)) === g.id, await X.evaluate(`${F}.here()`));
  await sleep(300);
  await X.shot(`${OUT}/stag-3-reach.png`);
  // (the other, on foot at the same tile: nothing is offered)
  await Y.evaluate(`${V}.warp(${g.x + 2}, ${g.y})`);
  await until("the forest's things for the other", async () => ((await Y.evaluate(`${F}?.sights?.()?.length ?? 0`)) > 40), 30000);
  await sleep(1200);
  ok("…which on foot is too far: the other, at the same tile, is offered nothing", (await Y.evaluate(`${F}.here()`)) === null, await Y.evaluate(`${F}.here()`));
  const had = await X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === ${JSON.stringify(g.item)} ? s.n : 0), 0)`);
  await X.evaluate(`${F}.act()`);
  await until("its game", () => gameUp(X), 4000);
  const b = await X.evaluate(`window.__townGame.bunch()`);
  for (const [i, c] of b.cells.entries()) if (c && c.good) { await X.evaluate(`window.__townGame.take(${i})`); await sleep(110); }
  await until("it is gathered", async () => (await X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === ${JSON.stringify(g.item)} ? s.n : 0), 0)`)) > had, 6000).catch(() => null);
  ok("…and gathered from there, by its own game, for its own stamina", (await X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === ${JSON.stringify(g.item)} ? s.n : 0), 0)`)) === had + g.n && (await X.evaluate(`${T}.purse().stamina.left`)) === 98,
    { stamina: await X.evaluate(`${T}.purse().stamina.left`) });

  // ── sat down, the rider is off its back; standing again, on it ──
  await X.evaluate(`window.__cashTown.sitHere()`);
  await sleep(1300);
  await X.shot(`${OUT}/stag-4-sat.png`);
  ok("sat down on the ground, I am sat (the stag stands by)", (await X.evaluate(`window.__cashTown.me().sit`)) !== -1);
  await X.evaluate(`window.__cashTown.standUp()`);
  await sleep(600);

  // ── sent to rest: on foot again, at a walker's pace, and the other is told ──
  await X.evaluate(`${K}.familiarWear(null)`);
  await until("the other is told it is gone", async () => (await seenBy(Y, me)) === "", 8000);
  await X.evaluate(`${V}.warp(${A[0]}, ${A[1]})`);
  await sleep(900);
  const again = await timed(X, B[0], B[1]);
  ok("sent to rest, the stretch takes a walker's time again", Math.abs(again - afoot) < afoot * 0.2, { afoot, again });

  // ── in town too ──
  await X.evaluate(`${K}.familiarWear("famStag")`);
  await X.evaluate(`${V}.warp(30, 30)`);
  await sleep(1200);
  await X.evaluate(`${V}.walk(36, 30)`);
  await sleep(500);
  await X.shot(`${OUT}/stag-5-town.png`);
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs]);
} catch (e) { ok("the run", false, e.message); console.log(X.logs.join("\n")); } finally { await X.close(); }

// at a phone's width: the rider and the stag are whole on the screen
const P = await browser("StagPhone", { width: 360, height: 740, mobile: true, dpr: 2 });
try {
  await enter(P, "S");
  await P.evaluate(`(${T}.setGifts(["famStag"]), ${K}.familiarWear("famStag"))`);
  await P.evaluate(`${V}.warp(${144 + 48}, ${112 + 66})`);
  await sleep(2500);
  await P.shot(`${OUT}/stag-phone.png`);
  ok("no page errors at a phone's width", P.logs.length === 0, P.logs);
} catch (e) { ok("the phone's run", false, e.message); } finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
