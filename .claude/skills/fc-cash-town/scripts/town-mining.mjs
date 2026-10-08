// Mining and the cave, in real browsers (`next dev` only: the trial keeps the game, and the maps are the preview's).
// Two testers, two windows of one Chrome (one cave between them, as the trial keeps it), in the scripts' own room:
// a rock broken by real taps in the swings it takes and gone from the other's map at once, back twenty minutes on;
// stone always and fragments by the chance held; with no stamina twice the swings; a vein opened and played by real
// clicks, a gem's, a tired one; the way down found by one and open to the other; down to a resting floor and the lift
// back to it; a torch that lights the other's screen; the mountain's own rocks and the yard's chest; the crystal
// rock refused under +10 and broken at it; each gift; options and gems measured; the counted powers; the day's turn;
// and the board on a phone. Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-mining.mjs <base> <outdir> [section,…]
//
// Needs `next dev`. A section named (rock, vein, way, light, lift, foot, power, crystal, day, gift, gem, share, phone) runs alone.
// (`share`: several picks on one rock, a press held, a rock tapped with no pick, a vein's family and its best go,
// glowing moss. Its rows were written with the build of 2026-10-08's evening, when the word was to build and not to
// test yet: they have never been run, and are to be proved with the rest at the next pass in a browser.)
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", ONLY = ""] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const want = (name) => !ONLY || ONLY.split(",").includes(name);
const SIZE = { width: 1440, height: 860 };
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const T = "window.__cashTown", V = "window.__townView", M = "window.__townMore", K = "window.__townTrade", N = "window.__townMine", G = "window.__townVein";
const url = (X, more = "") => `${BASE}/town?townTest=${X.label}&townRoom=check&townHour=12&townWeather=clear${more}`;
const enter = async (X, more = "&townAt=cave1") => {
  await X.goto(url(X, more));
  await until(`${X.label} ready`, async () => (await status(X)) === "ready", 240000);
  await until(`${X.label}'s layers`, () => X.evaluate(`!!${M} && !!${K} && !!${N}`), 60000);
  await sleep(1200);
};
const tap = async (X, x, y) => {
  const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: r.x + x, y: r.y + y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
};
/** A real click on the middle of an element. */
const click = async (X, selector) => {
  const at = await X.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: "nearest" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!at) return false;
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
  return true;
};
const me = (X) => X.evaluate(`${T}.me().pos`);
const told = (X) => X.evaluate(`${N}.told()`);
const where = (X) => X.evaluate(`${N}.where()`);
const stamina = (X) => X.evaluate(`(() => { const p = ${K}.purse(); return p.stamina.left; })()`);
const count = (X, item) => X.evaluate(`${K}.purse().bag.reduce((t, s) => t + (s && s.item === ${JSON.stringify(item)} ? s.n : 0), 0)`);
const points = (X) => X.evaluate(`${K}.lines().lines.mining.points`);
/** A tester as they begin a section: an empty bag, stamina, a pick in the hand (forged as said). */
const kit = (X, { stamina: st = 100, plus = 0, opts = [], gems = [] } = {}) => X.evaluate(`(() => {
  const t = ${K}; t.empty(); t.setStamina(${st}); t.grant("pick", 1); t.setTool(0, ${plus}, ${JSON.stringify(opts)}, ${JSON.stringify(gems)}); t.hold(0); return true;
})()`);
/** Go to a named place of the preview's (a script's own move: the layout's ladder is not stood back from), and wait until there. */
const go = async (X, name, floor) => {
  await X.evaluate(`(${N}.meant(), ${M}.go(${JSON.stringify(name)}))`);
  if (floor !== undefined) await until(`${X.label} on floor ${floor}`, async () => (await where(X)).floor === floor, 15000);
  await sleep(900);
};
/** Walk X to a tile and wait until it stands still. */
async function walk(X, x, y, ms = 40000) {
  const went = await X.evaluate(`${V}.walk(${x}, ${y})`);
  if (!went) return false;
  const end = Date.now() + ms;
  let moved = false, still = 0;
  while (Date.now() < end) {
    const s = await X.evaluate(`${V}.self()`);
    if (s.moving) { moved = true; still = 0; } else if (moved || ++still > 5) break;
    await sleep(120);
  }
  return true;
}
/** Stand X beside a rock: on the tile beside it nearest to where X is. */
async function beside(X, floor, rock) {
  const r = (await X.evaluate(`${N}.rocks(${floor})`)).find((x) => x.id === rock), at = await me(X);
  if (Math.max(Math.abs(Math.floor(at.x) - r.x), Math.abs(Math.floor(at.y) - r.y)) <= 1) return r;
  const free = await X.evaluate(`[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]].map(([dx, dy]) => [${r.x} + dx, ${r.y} + dy]).filter(([x, y]) => ${V}.walkable(x, y))`);
  free.sort((a, b) => Math.hypot(a[0] + 0.5 - at.x, a[1] + 0.5 - at.y) - Math.hypot(b[0] + 0.5 - at.x, b[1] + 0.5 - at.y));
  for (const [x, y] of free) if (await walk(X, x, y)) break;
  return r;
}
const gone = async (X, floor, rock) => ((await told(X)).gone[String(floor)] ?? []).includes(rock);
/** Strike a rock through the page's own way of striking, so many times at the most; gives how many swings were made. */
async function strike(X, floor, rock, most = 40) {
  await beside(X, floor, rock);
  let n = 0;
  for (; n < most; n++) {
    if (await gone(X, floor, rock)) break;
    if (await X.evaluate(`!!${G}`)) break;
    await X.evaluate(`${N}.hit(${floor}, ${rock})`);
    await sleep(360);
  }
  await sleep(250);
  return n;
}
/** The rocks of a floor that still stand and are plain by the roll (no vein, not the way down's, not the crystal), nearest X first. */
async function plain(X, floor) {
  const at = await me(X), t = await told(X), way = await X.evaluate(`${K}.wayRock(${floor})`), c = await X.evaluate(`${K}.crystalRock()`);
  const kinds = await X.evaluate(`Object.fromEntries(${N}.rocks(${floor}).map((r) => [r.id, ${K}.rockHolds(${floor}, r.id).kind]))`);
  return (await X.evaluate(`${N}.rocks(${floor})`)).filter((r) => r.id !== way && kinds[r.id] === "stone" && !(c && c.floor === floor && c.rock === r.id) && !(t.gone[String(floor)] ?? []).includes(r.id))
    .map((r) => ({ ...r, far: Math.hypot(r.x + 0.5 - at.x, r.y + 0.5 - at.y) })).sort((a, b) => a.far - b.far);
}
/** How much of the small map is drawn: the pixels of its corner of the canvas that are no part of the dark. */
const mapInk = (X) => X.evaluate(`(() => {
  const c = document.querySelector("canvas"), k = c.width / c.getBoundingClientRect().width, d = c.getContext("2d").getImageData(0, Math.round(100 * k), Math.round(280 * k), Math.round(190 * k)).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 170) n++;
  return Math.round(n / (k * k));
})()`);
const card = (X) => X.evaluate(`(() => { const el = document.querySelector("[data-mine-came]"); return el ? { kind: el.dataset.mineCame, got: Object.fromEntries([...el.querySelectorAll("[data-mine-got]")].map((g) => [g.dataset.mineGot, Number(g.dataset.n)])) } : null; })()`);
const note = (X) => X.evaluate(`document.querySelector("[data-mine-note]")?.textContent ?? null`);
const lit = (X) => X.evaluate(`${M}.state().lit`);
/** Play the vein that is up: towards each glinting cell in turn, round the knots, by real clicks (or the board's own handle); gives the state at its end. */
async function playVein(X, clicks = true, wantGem = false) {
  for (let i = 0; i < 30; i++) {
    const s = await X.evaluate(`${G} ? ${G}.state() : null`);
    if (!s || s.phase !== "play" || s.left <= 0) break;
    const shut = new Set(s.face.knots.map(([x, y]) => `${x},${y}`).filter((k) => !s.ice.some(([x, y]) => `${x},${y}` === k)));
    // the nearest glinting cell not yet passed (a gem's first, where one is wanted), by steps of one or two cells in a line
    const goals = s.face.points.map((p, k) => ({ ...p, k })).filter((p) => !s.got.includes(p.k)), first = wantGem ? goals.filter((p) => p.gem > 0) : [];
    const from = `${s.head[0]},${s.head[1]}`, seen = new Map([[from, null]]), queue = [s.head];
    let found = null;
    while (queue.length && !found) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const far of [1, 2]) {
        let cx = x, cy = y, passed = [], stop = false;
        for (let k = 0; k < far; k++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= 6 || ny >= 6 || shut.has(`${nx},${ny}`)) { stop = true; break; } cx = nx; cy = ny; passed.push(`${cx},${cy}`); }
        if (stop || seen.has(`${cx},${cy}`)) continue;
        seen.set(`${cx},${cy}`, { from: `${x},${y}`, to: [x + dx * far, y + dy * far] });
        if ((first.length ? first : goals).some((p) => passed.includes(`${p.x},${p.y}`))) { found = `${cx},${cy}`; break; }
        queue.push([cx, cy]);
      }
      if (found) break;
    }
    if (!found) break;
    let step = found;
    while (seen.get(step) && seen.get(step).from !== from) step = seen.get(step).from;
    const to = seen.get(step).to;
    if (clicks) { if (!(await click(X, `[data-vein-cell="${to[0]},${to[1]}"]`))) break; }
    else await X.evaluate(`${G}.strike(${JSON.stringify(to)})`);
    await sleep(320);
  }
  return X.evaluate(`${G} ? ${G}.state() : null`);
}
const veinCame = (X) => X.evaluate(`(() => { const el = document.querySelector("[data-vein-came]"); return el ? { phase: el.dataset.veinCame, got: Object.fromEntries([...el.querySelectorAll("[data-vein-got]")].map((g) => [g.dataset.veinGot, Number(g.dataset.n)])) } : null; })()`);

const A = await browser("MA", SIZE), B = await A.window("MB", SIZE);
try {
  await enter(A); await enter(B);
  await A.evaluate(`(${K}.caveReset(), ${K}.unsetRocks(), ${K}.setMineLuck(null), ${K}.setGifts(false))`);
  await B.evaluate(`(${K}.caveReset(), ${K}.setGifts(false))`);
  await kit(A); await kit(B);
  await sleep(800);
  const hooks = await A.evaluate(`${N}.hooks()`);
  console.log(`  (the layout's hooks: a way shut and shown ${hooks.way ? "yes" : "NO: the fallback"}, one crystal rock ${hooks.crystal ? "yes" : "NO"}, ${hooks.laid} floors laid)`);
  ok("the mine's layer is up for both, on the first floor, with thirty floors laid", (await where(A)).floor === 1 && (await where(B)).floor === 1 && hooks.laid === 30, { a: await where(A), hooks });
  const nameA = await A.evaluate(`${T}.me().name`);

  if (want("rock")) {
    console.log("a rock struck on the map");
    // ── real taps: the first walks up to it, then each is a swing ──
    await A.evaluate(`${K}.setMineLuck(0)`);
    const [r1, r2, r3] = await plain(A, 1);
    const need = await A.evaluate(`${N}.need(1, ${r1.id})`);
    ok("a pick as it is bought takes four swings to a rock of the first floors", need === 4, need);
    const before = { st: await stamina(A), pts: await points(A) };
    let seen = [], walked = false;
    for (let i = 0; i < 14; i++) {
      const h = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "caveRock" && x.id === r1.id);
      if (!h) break;
      await tap(A, h.x, h.y);
      if (!walked) { walked = true; await sleep(300); await until("A beside the rock", async () => !(await A.evaluate(`${V}.self().moving`)), 20000); await sleep(200); continue; }
      await sleep(400);
      seen.push([await A.evaluate(`${N}.swings(1, ${r1.id})`), await gone(A, 1, r1.id)]);
      if (seen.length === 2) await A.shot(`${OUT}/mining-striking.png`);
      if (seen[seen.length - 1][1]) break;
    }
    ok("a tap on a rock out of reach walks up to it, and then each tap is one swing: three leave it standing", JSON.stringify(seen.slice(0, 3)) === JSON.stringify([[1, false], [2, false], [3, false]]), seen);
    ok("…and the fourth breaks it", seen.length === 4 && seen[3][1] === true, seen);
    const c1 = await card(A);
    ok("a small card says what it left: a stone, and (the chance held) two fragments of copper", c1?.kind === "rock" && c1.got.stone === 1 && c1.got.shardCopper === 2, c1);
    ok("…which are in the bag, for one point of stamina whatever the swings", (await count(A, "stone")) === 1 && (await count(A, "shardCopper")) === 2 && before.st - (await stamina(A)) === 1, { stone: await count(A, "stone"), st: await stamina(A) });
    ok("…and count on the mining line: a point for the rock, ten for the first copper found", (await points(A)) - before.pts === 11, (await points(A)) - before.pts);
    await A.shot(`${OUT}/mining-broken.png`);
    const quick = Date.now();
    await until("B sees it gone", () => gone(B, 1, r1.id), 6000).catch(() => {});
    ok("the rock is gone from the other tester's map at once", (await gone(B, 1, r1.id)) && !(await B.evaluate(`${M}.hits()`)).some((x) => x.kind === "caveRock" && x.id === r1.id), { ms: Date.now() - quick });
    ok("…and a swing of theirs at it is nothing", (await B.evaluate(`${N}.hit(1, ${r1.id})`)) === false);
    const d1 = (await A.evaluate(`${K}.mineDeeds()`)).pop();
    ok("the deed is written down: a rock, its floor, its swings, what it left", d1?.what === "mine" && d1.doc.floor === 1 && d1.doc.rock === r1.id && d1.doc.swings === 4 && d1.doc.got === "shardCopper", d1);
    // ── the chance held the other way: stone, and no fragments ──
    await A.evaluate(`${K}.setMineLuck(1)`);
    await strike(A, 1, r2.id);
    const c2 = await card(A);
    ok("with the chance held against it a rock leaves its stone and nothing more", c2?.got.stone === 1 && c2.got.shardCopper === undefined && (await count(A, "stone")) === 2 && (await count(A, "shardCopper")) === 2, c2);
    // ── with no stamina: twice the swings, and never refused ──
    await A.evaluate(`${K}.setStamina(0)`);
    ok("with no stamina the same rock takes eight", (await A.evaluate(`${N}.need(1, ${r3.id})`)) === 8);
    const n3 = await strike(A, 1, r3.id, 7);
    ok("…seven swings leave it standing", n3 === 7 && !(await gone(A, 1, r3.id)), n3);
    await strike(A, 1, r3.id, 3);
    ok("…and the eighth breaks it, for no stamina at all", (await gone(A, 1, r3.id)) && (await stamina(A)) === 0 && (await count(A, "stone")) === 3);
    // ── twenty minutes on: the rocks are back, for both ──
    await A.evaluate(`${K}.setStamina(100)`);
    ok("three rocks are gone from the first floor", ((await told(B)).gone["1"] ?? []).length === 3, (await told(B)).gone);
    await A.evaluate(`${K}.skipMinutes(20)`);
    await sleep(1500);
    ok("twenty minutes on they stand again, on both testers' maps", !(await gone(A, 1, r1.id)) && !(await gone(B, 1, r1.id)) && (await B.evaluate(`${M}.hits()`)).some((x) => x.kind === "caveRock" && x.id === r1.id), { a: (await told(A)).gone, b: (await told(B)).gone });
    await A.evaluate(`${K}.setMineLuck(null)`);
  }

  if (want("vein")) {
    console.log("a special vein");
    await kit(A);
    const [r4, r5, r6] = await plain(A, 1);
    await A.evaluate(`${K}.setRock(1, ${r4.id}, "vein", 7)`);
    const st = await stamina(A), pts = await points(A), copper = await count(A, "shardCopper");
    await strike(A, 1, r4.id);
    await until("the board", () => A.evaluate(`!!${G}`), 8000).catch(() => {});
    const s0 = await A.evaluate(`${G} ? ${G}.state() : null`);
    ok("a rock that hides a vein opens the vein's board when it breaks", !!s0 && s0.phase === "play" && s0.face.points.length >= 4 && s0.face.points.length <= 6 && s0.face.knots.length >= 4, s0 && { p: s0.face.points.length, k: s0.face.knots.length });
    ok("…for three stamina more than the rock's one, with six strikes", st - (await stamina(A)) === 4 && s0?.left === 6, { st: st - (await stamina(A)), left: s0?.left });
    const how = await A.evaluate(`document.querySelector("[data-vein-how]")?.textContent ?? ""`);
    ok("the board says in a line or two how it is played", how.length > 30 && how.length < 170, how);
    ok("…and shows the face: six by six, its ore glinting, its knots, the cells that can be struck", (await A.evaluate(`document.querySelectorAll("[data-vein-cell]").length`)) === 36
      && (await A.evaluate(`document.querySelectorAll('[data-vein-cell][data-kind="ore"][data-shown="1"]').length`)) === s0.face.points.length
      && (await A.evaluate(`document.querySelectorAll('[data-vein-cell][data-kind="knot"]').length`)) === s0.face.knots.length
      && (await A.evaluate(`document.querySelectorAll('[data-vein-cell][data-may="1"]').length`)) >= 1);
    // a cell that is not in line with the crack's end is nothing
    const off = await A.evaluate(`(() => { const el = [...document.querySelectorAll('[data-vein-cell][data-may="0"]')].find((e) => { const [x, y] = e.dataset.veinCell.split(",").map(Number), h = ${G}.state().head; return x !== h[0] && y !== h[1]; }); return el ? el.dataset.veinCell : null; })()`);
    await click(A, `[data-vein-cell="${off}"]`);
    await sleep(250);
    ok("a click on a cell that is not in line with the crack's end is no strike", (await A.evaluate(`${G}.state().left`)) === 6 && (await A.evaluate(`${G}.state().path.length`)) === 1);
    await A.shot(`${OUT}/mining-vein-desktop.png`);
    const end = await playVein(A, true);
    ok("played by real clicks, each strike lengthens the crack two cells at the most and is counted", !!end && end.path.length > 1 && end.path.length - 1 <= (6 - end.left) * 2 && end.got.length >= 1, end && { path: end.path.length, left: end.left, got: end.got });
    await A.evaluate(`${G}.enough()`);
    await until("what it came to", async () => !!(await veinCame(A)), 8000).catch(() => {});
    const came = await veinCame(A);
    ok("the go over, the board says what it came to: two fragments for each glinting cell passed", came?.phase === "came" && came.got.shardCopper === end.got.length * 2, { came, got: end?.got });
    ok("…and they are in the bag", (await count(A, "shardCopper")) - copper === end.got.length * 2);
    await A.shot(`${OUT}/mining-vein-came.png`);
    await click(A, "[data-vein-next]");
    await sleep(500);
    ok("its button puts the board away", !(await A.evaluate(`!!${G}`)));
    const dv = (await A.evaluate(`${K}.mineDeeds()`)).pop();
    ok("the go is written down with its strikes, and counts three points beside the rock's one", dv?.what === "vein" && dv.doc.struck >= 1 && Array.isArray(dv.doc.strikes) && dv.doc.passed === end.got.length && (await points(A)) - pts >= 4, { dv, pts: (await points(A)) - pts });
    // ── a gem vein: of the floor's element of the day ──
    const element = await A.evaluate(`${K}.elementAt(1)`);
    await A.evaluate(`${K}.setRock(1, ${r5.id}, "gem", 11)`);
    await strike(A, 1, r5.id);
    await until("the board", () => A.evaluate(`!!${G}`), 8000).catch(() => {});
    const g0 = await A.evaluate(`${G} ? ${G}.state() : null`);
    ok("one vein in four is a gem's (here by a script's word): of the floor's element of the day, with one or two gem cells", g0?.gem === element && g0.face.points.filter((p) => p.gem > 0).length >= 1 && g0.face.points.filter((p) => p.gem > 0).length <= 2, { gem: g0?.gem, element });
    ok("…its gem cells shown as the gem's own fragments", (await A.evaluate(`document.querySelectorAll('[data-vein-cell][data-kind="gem"]').length`)) === g0.face.points.filter((p) => p.gem > 0).length);
    const gEnd = await playVein(A, true, true);
    await A.evaluate(`${G}.enough()`);
    await until("what it came to", async () => !!(await veinCame(A)), 8000).catch(() => {});
    const gCame = await veinCame(A), chip = Object.keys(gCame?.got ?? {}).find((k) => k.startsWith("chip"));
    const gems = (gEnd?.got ?? []).map((k) => g0.face.points[k]).filter((p) => p.gem > 0);
    ok("a gem cell passed gives the gem's fragments, one to three of them", gems.length >= 1 && !!chip && gCame.got[chip] === gems.reduce((t, p) => t + p.gem, 0) && (await count(A, chip)) === gCame.got[chip], { gCame, gems });
    await click(A, "[data-vein-next]");
    await sleep(400);
    // ── with no stamina left after the rock: two strikes fewer, and what glints is seen only at first ──
    await A.evaluate(`${K}.setStamina(1)`);
    await A.evaluate(`${K}.setRock(1, ${r6.id}, "vein", 5)`);
    await strike(A, 1, r6.id);
    await until("the board", () => A.evaluate(`!!${G}`), 8000).catch(() => {});
    const t0 = await A.evaluate(`${G} ? ${G}.state() : null`);
    // (the board waits: nothing glints, nothing is struck, and no press ends it, until "ready" is pressed)
    await sleep(2600);
    const waiting = await A.evaluate(`({ phase: ${G}.state().phase, shown: document.querySelectorAll('[data-vein-cell][data-kind="ore"][data-shown="1"]').length, card: !!document.querySelector("[data-vein-wait]"), end: !!document.querySelector("[data-vein-enough]") })`);
    ok("a vein opened with no stamina waits for its player: a card with the strikes there are, nothing glinting yet, no way to end it by a slip", waiting.phase === "ready" && waiting.shown === 0 && waiting.card && !waiting.end, waiting);
    await A.shot(`${OUT}/mining-vein-wait.png`);
    await click(A, "[data-vein-ready]");
    await sleep(150);
    const shownAt = await A.evaluate(`document.querySelectorAll('[data-vein-cell][data-kind="ore"][data-shown="1"]').length`);
    await sleep(2600);
    const shownLater = await A.evaluate(`document.querySelectorAll('[data-vein-cell][data-kind="ore"][data-shown="1"]').length`);
    ok("with no stamina the vein has two strikes fewer", t0?.left === 4 && t0.mods.spent === true, t0 && { left: t0.left });
    ok("…and what glints is shown only for two seconds, from the press of ready", shownAt === t0.face.points.length && shownLater === 0 && (await A.evaluate(`${G}.state().seen`)) === false, { shownAt, shownLater });
    ok("the press that ends a go says that what was won is kept", /เก็บแร่|keep ore/i.test(await A.evaluate(`document.querySelector("[data-vein-enough]")?.textContent ?? ""`)));
    await A.shot(`${OUT}/mining-vein-tired.png`);
    await playVein(A, false);
    await A.evaluate(`${G}.enough()`);
    await until("what it came to", async () => !!(await veinCame(A)), 8000).catch(() => {});
    await click(A, "[data-vein-next]");
    await sleep(400);
    await A.evaluate(`(${K}.setStamina(100), ${K}.unsetRocks())`);
  }

  if (want("way")) {
    console.log("the way down");
    await kit(A); await kit(B);
    const way = await A.evaluate(`${K}.wayRock(1)`), rocks = await A.evaluate(`${N}.rocks(1)`), spots = await A.evaluate(`${M}.spots(1)`);
    ok("one rock of the floor hides the way down", rocks.some((r) => r.id === way), way);
    const before = await told(B);
    ok("before anybody has found it no way down is open, and the village's board has nothing", !before.ways["1"] && (await A.evaluate(`${K}.caveBoard()`)) === null, before.ways);
    if (hooks.way) ok("…and no ladder down is drawn", !(await B.evaluate(`${M}.hits()`)).some((x) => x.kind === "ladderDown" && x.floor === 1));
    else {
      // (the fallback: the layout's own ladder stands, and takes nobody down until the way is found)
      await walk(B, spots.down[0], spots.down[1]);
      await sleep(900);
      ok("…and the layout's ladder takes nobody down yet", (await where(B)).floor === 1, await where(B));
    }
    const pts = await points(A);
    await strike(A, 1, way);
    const cw = await card(A);
    ok("the rock that hides it, broken, shows the way down on its card", cw?.kind === "way" && cw.got.stone === 1, cw);
    await A.shot(`${OUT}/mining-way-found.png`);
    ok("…for five points more than a rock's one", (await points(A)) - pts >= 6, (await points(A)) - pts);
    await until("B told of the way", async () => !!(await told(B)).ways["1"], 6000).catch(() => {});
    const wb = (await told(B)).ways["1"], wr = rocks.find((r) => r.id === way);
    ok("found by one, it is open to the other at once, where its rock stood, with who found it", !!wb && wb.rock === way && wb.x === wr.x && wb.y === wr.y && wb.name === nameA, wb);
    const board = await B.evaluate(`${K}.caveBoard()`);
    ok("the village's board has the deepest floor reached today and who opened the way to it", board?.floor === 2 && board.name === nameA, board);
    ok("the deed is written down", (await A.evaluate(`${K}.mineDeeds()`)).some((d) => d.what === "delve" && d.doc.floor === 1 && d.doc.rock === way));
    // both go down by it
    const downAt = hooks.way ? [wr.x, wr.y] : spots.down;
    await walk(B, downAt[0], downAt[1]);
    await until("B on the second floor", async () => (await where(B)).floor === 2, 15000).catch(() => {});
    ok("the other tester goes down by it to the second floor", (await where(B)).floor === 2, await where(B));
    await walk(A, downAt[0], downAt[1]);
    await until("A on the second floor", async () => (await where(A)).floor === 2, 15000).catch(() => {});
    ok("…and so does its finder", (await where(A)).floor === 2, await where(A));
    ok("the second floor's own way is not open", !(await told(A)).ways["2"]);
  }

  if (want("light")) {
    console.log("light in the dark");
    if ((await where(A)).floor !== 2) { await go(A, "cave2", 2); await go(B, "cave2", 2); }
    await kit(A); await kit(B);
    await sleep(600);
    ok("a walker sees two tiles about them", (await A.evaluate(`${N}.light()`)) === 2);
    // B stands still; A walks a few tiles off and sets a torch down
    const far = (await plain(A, 2))[3] ?? (await plain(A, 2))[0];
    await beside(A, 2, far.id);
    await sleep(600);
    const dark = await lit(B);
    await A.evaluate(`(${K}.grant("torch", 2), ${K}.hold(${K}.purse().bag.findIndex((s) => s && s.item === "torch")))`);
    await until("the torch's button", () => A.evaluate(`!!document.querySelector("[data-mine-torch]")`), 5000).catch(() => {});
    ok("a torch in the hand, in the cave, can be set down", await A.evaluate(`!!document.querySelector("[data-mine-torch]")`));
    await click(A, "[data-mine-torch]");
    await until("B told of the torch", async () => (await told(B)).torches.length === 1, 6000).catch(() => {});
    await sleep(900);
    const bright = await lit(B), torch = (await told(B)).torches[0], at = await me(A);
    ok("it stands where its bearer stood, one fewer in their bag, burning five minutes", !!torch && torch.f === 2 && torch.x === Math.floor(at.x) && torch.y === Math.floor(at.y) && (await count(A, "torch")) === 1 && Math.abs(torch.until - (await A.evaluate(`${K}.now()`)) - 300000) < 5000, torch);
    ok("…and lights the other tester's screen too", bright.lights === dark.lights + 1 && bright.lit > dark.lit, { dark, bright });
    await A.evaluate(`${V}.lookAt(${torch.x}, ${torch.y})`);
    await sleep(900);
    await A.shot(`${OUT}/mining-torch.png`);
    await B.shot(`${OUT}/mining-torch-other.png`);
    // a glowing mushroom held, and the lamp worn
    await A.evaluate(`(${K}.grant("glowMushroom", 1), ${K}.hold(${K}.purse().bag.findIndex((s) => s && s.item === "glowMushroom")))`);
    await sleep(500);
    ok("a glowing mushroom held lights three tiles (and the hand is not on the pick)", (await A.evaluate(`${N}.light()`)) === 3 && (await A.evaluate(`${N}.hit(2, ${far.id})`)) === false);
    await A.evaluate(`(${K}.hold(0), ${K}.setGifts(["charmMinerLamp"]), ${K}.charmsWear(["charmMinerLamp"]))`);
    await until("B told of the lamp", async () => (await B.evaluate(`${T}.people().find((p) => p.name === ${JSON.stringify(nameA)})?.lit ?? 0`)) === 4, 6000).catch(() => {});
    ok("the miner's lamp lights four tiles about its wearer", (await A.evaluate(`${N}.light()`)) === 4);
    ok("…and the room is told, so that those near see by it", (await B.evaluate(`${T}.people().find((p) => p.name === ${JSON.stringify(nameA)})?.lit ?? 0`)) === 4);
    await A.evaluate(`${K}.skipMinutes(5)`);
    await sleep(1500);
    ok("five minutes on the torch has burnt out, for both", (await told(A)).torches.length === 0 && (await told(B)).torches.length === 0);
    await A.evaluate(`${K}.setGifts(false)`);
  }

  if (want("lift")) {
    console.log("a resting floor and the lift");
    await kit(A, { plus: 10 }); await kit(B);
    await go(A, "cave9", 9);
    ok("nobody has a lift's stop before reaching a resting floor", (await told(A)).rests.length === 0);
    const way9 = await A.evaluate(`${K}.wayRock(9)`), r9 = (await A.evaluate(`${N}.rocks(9)`)).find((r) => r.id === way9), s9 = await A.evaluate(`${M}.spots(9)`);
    await strike(A, 9, way9);
    await sleep(600);
    const down9 = hooks.way ? [r9.x, r9.y] : s9.down;
    await walk(A, down9[0], down9[1]);
    await until("A on the tenth floor", async () => (await where(A)).floor === 10, 15000).catch(() => {});
    await sleep(800);
    ok("down the ninth floor's way is the tenth: a resting floor, with no rocks", (await where(A)).floor === 10 && (await A.evaluate(`${N}.rocks(10)`)).length === 0, await where(A));
    ok("reaching it makes it one of the lift's stops", JSON.stringify((await told(A)).rests) === "[10]", (await told(A)).rests);
    await A.shot(`${OUT}/mining-resting-floor.png`);
    const liftHit = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "lift");
    if (liftHit) await tap(A, liftHit.x, liftHit.y); else await A.evaluate(`${N}.lift(10)`);
    await until("the lift's panel", () => A.evaluate(`!!document.querySelector("[data-mine-lift]")`), 20000).catch(() => {});
    const stops = await A.evaluate(`[...document.querySelectorAll("[data-lift-stop]")].map((e) => [Number(e.dataset.liftStop), e.dataset.state])`);
    ok("a tap on the lift opens its panel: the mouth, this floor, and the floors not reached as states", JSON.stringify(stops) === JSON.stringify([[0, "reached"], [10, "here"], [20, "far"], [30, "far"]]), stops);
    await sleep(500);
    await A.shot(`${OUT}/mining-lift.png`);
    await click(A, '[data-lift-stop="0"]');
    await until("A at the mouth", async () => (await where(A)).mountain === true, 10000).catch(() => {});
    ok("the lift takes its rider up to the mine's mouth", (await where(A)).mountain === true, await where(A));
    await sleep(700);
    const mouth = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "mouth");
    if (mouth) await tap(A, mouth.x, mouth.y);
    await until("the lift's panel", () => A.evaluate(`!!document.querySelector("[data-mine-lift]")`), 20000).catch(() => {});
    ok("at the mouth a tap asks whoever has a stop where to", (await A.evaluate(`document.querySelector('[data-lift-stop="10"]')?.dataset.state`)) === "reached" && (await A.evaluate(`!!document.querySelector("[data-lift-walk]")`)), mouth);
    await click(A, '[data-lift-stop="10"]');
    await until("A on the tenth floor", async () => (await where(A)).floor === 10, 10000).catch(() => {});
    ok("…and the lift takes them back down to the resting floor", (await where(A)).floor === 10, await where(A));
    ok("the ride is written down", (await A.evaluate(`${K}.mineDeeds()`)).filter((d) => d.what === "lift").length === 2);
    // whoever has no stop walks in at the mouth, with no panel
    await go(B, "mouth");
    const mouthB = (await B.evaluate(`${M}.hits()`)).find((x) => x.kind === "mouth");
    if (mouthB) await tap(B, mouthB.x, mouthB.y);
    await until("B on the first floor", async () => (await where(B)).floor === 1, 20000).catch(() => {});
    ok("whoever has reached no resting floor is asked nothing at the mouth: they walk in", (await where(B)).floor === 1 && !(await B.evaluate(`!!document.querySelector("[data-mine-lift]")`)), await where(B));
    // the last floor: a sign at its way down
    await go(A, "cave30", 30);
    const s30 = await A.evaluate(`${M}.spots(30)`);
    await walk(A, s30.down[0] + 1, s30.down[1] + 2);
    await sleep(700);
    const last = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "ladderDown");
    if (last) await tap(A, last.x, last.y);
    await sleep(600);
    ok("at the thirtieth floor's way down there is a sign", await A.evaluate(`!!document.querySelector("[data-mine-sign]")`), last);
    await sleep(500);
    await A.shot(`${OUT}/mining-sign.png`);
    await click(A, "[data-mine-sign]");
  }

  if (want("foot")) {
    console.log("the mountain's foot");
    await kit(A);
    await go(A, "camp");
    await until("A on the mountain", async () => (await where(A)).mountain === true, 10000).catch(() => {});
    await A.evaluate(`${K}.setMineLuck(0)`);
    const rock = (await plain(A, 0))[0];
    ok("the mountain has rocks of its own, as hard as the first floors'", !!rock && (await A.evaluate(`${N}.need(0, ${rock.id})`)) === 4, rock);
    const n = await strike(A, 0, rock.id);
    const c = await card(A);
    ok("one breaks in four swings and leaves a stone, and (the chance held) one fragment of copper", n === 4 && c?.got.stone === 1 && c.got.shardCopper === 1, { n, c });
    ok("…and is gone from the mountain for everybody", (await gone(A, 0, rock.id)) && ((await told(B)).gone["0"] ?? []).includes(rock.id));
    await A.evaluate(`${K}.setMineLuck(null)`);
    await A.shot(`${OUT}/mining-foot.png`);
    // the yard's chest: a second door to the same box
    await go(A, "camp");
    const chest = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "chest");
    ok("the chest in the foot yard is on the screen", !!chest, await A.evaluate(`${M}.hits().map((h) => h.kind)`));
    if (chest) await tap(A, chest.x, chest.y);
    await until("the box's panel", () => A.evaluate(`!!document.querySelector("[data-box-panel]")`), 20000).catch(() => {});
    await sleep(400);
    ok("a tap on it walks up to it and opens my own storage box", await A.evaluate(`!!document.querySelector("[data-box-panel]")`));
    const at = await me(A), put = await A.evaluate(`${K}.boxPut(${K}.purse().bag.findIndex((s) => s && s.item === "stone"), 1, [${Math.floor(at.x)}, ${Math.floor(at.y)}])`);
    ok("…and what is put away there is in the same box as the plaza's", put?.ok === true && (await A.evaluate(`${K}.box().things.some((s) => s && s.item === "stone")`)), put);
    await A.shot(`${OUT}/mining-chest.png`);
    await A.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await A.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  }

  if (want("power")) {
    console.log("options, and the counted powers");
    // ── stone-sight: the first tap looks, and costs nothing ──
    await go(A, "cave3", 3);
    await kit(A, { plus: 3, opts: ["pkPeek"] });
    const [p1, p2] = await plain(A, 3);
    await A.evaluate(`${K}.setRock(3, ${p1.id}, "vein", 3)`);
    await beside(A, 3, p1.id);
    const st = await stamina(A);
    await A.evaluate(`${N}.hit(3, ${p1.id})`);
    await sleep(500);
    const peeks = await A.evaluate(`${N}.peeks()`);
    ok("a pick that sees into stone: the first tap on a rock says what it holds, for nothing", Object.values(peeks).includes("vein") && (await A.evaluate(`${N}.swings(3, ${p1.id})`)) === 0 && (await stamina(A)) === st && !(await gone(A, 3, p1.id)), peeks);
    await A.evaluate(`${K}.setRock(3, ${p1.id}, null)`);
    // ── loosened stone: the rocks that touch one that broke take a swing fewer ──
    await kit(A, { plus: 3, opts: ["pkLoose"] });
    const all3 = await A.evaluate(`${N}.rocks(3)`);
    const pair = all3.flatMap((a) => all3.filter((b) => b.id !== a.id && Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 2).map((b) => [a, b]))[0];
    if (pair) {
      await A.evaluate(`(${K}.setRock(3, ${pair[0].id}, "stone"), ${K}.setRock(3, ${pair[1].id}, "stone"))`);
      const was = await A.evaluate(`${N}.need(3, ${pair[1].id})`);
      await strike(A, 3, pair[0].id);
      await sleep(400);
      ok("a rock that touches one just broken is loosened: a swing fewer, for its breaker", (await A.evaluate(`${N}.need(3, ${pair[1].id})`)) === was - 1 && (await told(A)).loose?.ids.includes(pair[1].id), { was, now: await A.evaluate(`${N}.need(3, ${pair[1].id})`), loose: (await told(A)).loose });
    } else ok("(no two rocks of this floor touch today: the loosened stone is held by the unit tests)", true);
    // ── the earthshaker: one swing for every rock within a step ──
    await A.evaluate(`${K}.unsetRocks()`);
    await kit(A, { plus: 10, opts: ["pkCrumb", "pkSteady", "pkQuake"] });
    let shaken = null;
    for (const f of [4, 5, 6, 7, 8]) {
      const rs = await A.evaluate(`${N}.rocks(${f})`);
      for (const a of rs) for (const b of rs) {
        if (shaken || a.id >= b.id || Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) !== 2) continue;
        const mid = [Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2)];
        if (Math.max(Math.abs(mid[0] - a.x), Math.abs(mid[1] - a.y)) <= 1 && Math.max(Math.abs(mid[0] - b.x), Math.abs(mid[1] - b.y)) <= 1) shaken = { f, a, b, mid };
      }
      if (shaken) break;
    }
    if (shaken) {
      await go(A, `cave${shaken.f}`, shaken.f);
      await A.evaluate(`(${K}.setRock(${shaken.f}, ${shaken.a.id}, "stone"), ${K}.setRock(${shaken.f}, ${shaken.b.id}, "shards"))`);
      const stood = await A.evaluate(`${V}.walkable(${shaken.mid[0]}, ${shaken.mid[1]})`) && await walk(A, shaken.mid[0], shaken.mid[1]);
      await sleep(400);
      ok("the pick's counted powers have a belt of their own while it is held: ten quakes today", (await A.evaluate(`document.querySelector("[data-mine-quake]")?.dataset.left`)) === "10");
      await click(A, "[data-mine-quake]");
      await sleep(300);
      const st2 = await stamina(A);
      await A.evaluate(`${N}.hit(${shaken.f}, ${shaken.a.id})`);
      await sleep(900);
      ok("armed, one swing breaks every plain rock within a step, for one point of stamina", stood && (await gone(A, shaken.f, shaken.a.id)) && (await gone(A, shaken.f, shaken.b.id)) && st2 - (await stamina(A)) === 1, { stood, gone: (await told(A)).gone[String(shaken.f)] });
      ok("…and is counted: nine left today", (await A.evaluate(`document.querySelector("[data-mine-quake]")?.dataset.left`)) === "9" && (await A.evaluate(`document.querySelector("[data-mine-quake]")?.dataset.mineQuake`)) === "0");
      await A.shot(`${OUT}/mining-quake.png`);
    } else ok("(no floor from 4 to 8 has two rocks a step apart on both sides today: the earthshaker is held by the unit tests)", true);
    // ── the floor-breaker: the way down opened oneself, for everybody ──
    await A.evaluate(`${K}.unsetRocks()`);
    await kit(A, { plus: 10, opts: ["pkPeek", "pkCrumb", "pkDrill"] });
    const f = (await where(A)).floor;
    await sleep(500);
    ok("on a floor whose way nobody has found, the floor-breaker is offered, three a day", !(await told(A)).ways[String(f)] && (await A.evaluate(`document.querySelector("[data-mine-drill]")?.dataset.left`)) === "3", { f, ways: (await told(A)).ways });
    await click(A, "[data-mine-drill]");
    await until("the way broken through", async () => !!(await told(A)).ways[String(f)], 6000).catch(() => {});
    const drilled = (await told(A)).ways[String(f)], at = await me(A);
    ok("it opens the way down beside its user, for everybody, and is counted", !!drilled && drilled.rock === null && Math.max(Math.abs(drilled.x - Math.floor(at.x)), Math.abs(drilled.y - Math.floor(at.y))) === 1 && !!(await told(B)).ways[String(f)]
      && (await A.evaluate(`${K}.purse().powers?.pkDrill?.n`)) === 1 && !(await A.evaluate(`!!document.querySelector("[data-mine-drill]")`)), drilled);
    // ── a twin vein: played twice ──
    await kit(A, { plus: 10, opts: ["pkPeek", "pkCrumb", "pkTwin"] });
    const tv = (await plain(A, f))[0];
    await A.evaluate(`${K}.setRock(${f}, ${tv.id}, "vein", 21)`);
    await strike(A, f, tv.id);
    await until("the board", () => A.evaluate(`!!${G}`), 8000).catch(() => {});
    ok("a pick at the top has ten strikes at a vein", (await A.evaluate(`${G}.state().left`)) === 10);
    const one = await playVein(A, false);
    await A.evaluate(`${G}.enough()`);
    await until("what it came to", async () => !!(await veinCame(A)), 8000).catch(() => {});
    const iron = await count(A, "shardCopper");
    await click(A, "[data-vein-next]");
    await sleep(700);
    const again = await A.evaluate(`${G} ? ${G}.state() : null`);
    ok("a twin vein is played once more: the same face, a second go", !!again && again.round === 2 && again.phase === "play" && again.path.length === 1 && JSON.stringify(again.face) === JSON.stringify(one.face), again && { round: again.round, phase: again.phase });
    await A.shot(`${OUT}/mining-vein-twin.png`);
    await playVein(A, false);
    await A.evaluate(`${G}.enough()`);
    await until("what it came to", async () => (await veinCame(A))?.phase === "came" && (await A.evaluate(`${G}.state().phase`)) === "came", 8000).catch(() => {});
    await click(A, "[data-vein-next]");
    await sleep(600);
    ok("…and no more: the board is put away, the second go's ore in the bag, four twins left today", !(await A.evaluate(`!!${G}`)) && (await count(A, "shardCopper")) > iron && (await A.evaluate(`${K}.purse().powers?.pkTwin?.n`)) === 1, { copper: await count(A, "shardCopper"), iron });
    await A.evaluate(`${K}.unsetRocks()`);
  }

  if (want("crystal")) {
    console.log("the crystal rock");
    const c = await A.evaluate(`${K}.crystalRock()`);
    ok("the day's crystal rock stands on the twenty-eighth or the twenty-ninth floor", !!c && [28, 29].includes(c.floor), c);
    await kit(A, { plus: 10, opts: ["pkPeek", "pkCrumb", "pkGleam"] });
    await sleep(600);
    ok("a pick that gleams knows which floor has it today, from anywhere", (await A.evaluate(`document.querySelector("[data-mine-gleam]")?.dataset.mineGleam`)) === String(c.floor), await A.evaluate(`document.querySelector("[data-mine-gleam]")?.dataset.mineGleam`));
    await kit(A, { plus: 9 });
    await go(A, `cave${c.floor}`, c.floor);
    ok("on its floor it is told to whoever is there", (await told(A)).crystal?.rock === c.rock, (await told(A)).crystal);
    await beside(A, c.floor, c.rock);
    await A.evaluate(`${N}.hit(${c.floor}, ${c.rock})`);
    await sleep(500);
    const refused = await note(A);
    ok("a pick under +10 will not bite it: it stands, and nothing is spent", !!refused && !(await gone(A, c.floor, c.rock)) && (await A.evaluate(`${N}.swings(${c.floor}, ${c.rock})`)) === 0 && (await stamina(A)) === 100, refused);
    await A.shot(`${OUT}/mining-crystal-refused.png`);
    await kit(A, { plus: 10 });
    const element = await A.evaluate(`${K}.elementAt(${c.floor})`), pts = await points(A);
    await sleep(2800);
    await strike(A, c.floor, c.rock);
    const cc = await card(A), chip = Object.keys(cc?.got ?? {}).find((k) => k.startsWith("chip"));
    ok("a pick at +10 breaks it: twenty fragments of silver and five of the floor's gem", cc?.kind === "crystal" && cc.got.shardSilver === 20 && !!chip && cc.got[chip] === 5, { cc, element });
    await A.shot(`${OUT}/mining-crystal-broken.png`);
    ok("…for ten points and its firsts, and it is gone for the day", (await points(A)) - pts >= 10 && (await gone(A, c.floor, c.rock)) && (await told(A)).crystal === null, { pts: (await points(A)) - pts });
    await A.evaluate(`${K}.skipMinutes(20)`);
    await sleep(1200);
    ok("…a turn on it has not come back", await gone(A, c.floor, c.rock));
  }

  if (want("gift")) {
    console.log("the line's gifts");
    await A.evaluate(`(${K}.setGifts(false), ${K}.unsetRocks())`);
    await kit(A);
    await go(A, "cave4", 4);
    await sleep(1200);
    const few = await mapInk(A);
    await A.shot(`${OUT}/mining-map-walked.png`);
    await A.evaluate(`(${K}.setGifts(["charmMinerLamp", "famBat", "thingSack"]), ${K}.familiarWear("famBat"))`);
    await go(A, "cave5", 5);
    await sleep(1800);
    const whole = await mapInk(A);
    ok("the guiding bat follows its member, for everybody to see", Object.keys(await A.evaluate(`${V}.pets()`)).length >= 1 && (await B.evaluate(`${T}.people().find((p) => p.name === ${JSON.stringify(nameA)})?.pet`)) === "famBat", await A.evaluate(`${V}.pets()`));
    ok("…and with it a floor's small map is known whole on coming to it", whole > few * 2.5, { few, whole });
    await A.shot(`${OUT}/mining-bat.png`);
    // the sack: what a rock leaves goes into it before the bag
    await A.evaluate(`${K}.setMineLuck(0)`);
    const r = (await plain(A, 5))[0];
    await strike(A, 5, r.id);
    const purse = await A.evaluate(`${K}.purse()`);
    ok("with the miner's sack, what a rock leaves goes into the sack and not the bag", (purse.pouches?.thingSack ?? []).filter(Boolean).length === 2 && purse.bag.filter((s) => s && s.item !== "pick").length === 0, purse.pouches);
    await A.evaluate(`${K}.setMineLuck(null)`);
    await A.evaluate(`document.querySelector('button[title="กระเป๋า"]')?.click()`);
    await until("the bag", () => A.evaluate(`!!document.querySelector('section[aria-labelledby="town-trade-h"]')`), 6000).catch(() => {});
    await sleep(500);
    const row = await A.evaluate(`(() => { const el = document.querySelector('[data-pouch="thingSack"]'); return el ? [...el.querySelectorAll("[data-pouch-slot]")].map((s) => s.dataset.item ?? null) : null; })()`);
    if (row) {
      ok("the bag's panel shows the sack as a row of its own, five slots", row.length === 5 && row.filter(Boolean).length === 2, row);
      await A.shot(`${OUT}/mining-sack.png`);
      await click(A, '[data-pouch="thingSack"] [data-pouch-slot][data-item="stone"]');
      await sleep(500);
      ok("a tap on what is in it takes it out into the bag", (await count(A, "stone")) === 1, await count(A, "stone"));
    } else ok("the bag's panel shows the sack as a row of its own (the bag's button was not found by this script)", false, await A.evaluate(`[...document.querySelectorAll("button")].map((b) => Object.keys(b.dataset).join("|")).filter(Boolean).slice(0, 40)`));
    await A.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await A.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await A.evaluate(`${K}.setGifts(false)`);
  }

  if (want("gem")) {
    console.log("gems, measured");
    await kit(A);
    const plainNeed = [await A.evaluate(`${N}.need(1, 0)`), await A.evaluate(`${N}.need(15, 0)`), await A.evaluate(`${N}.need(25, 0)`)];
    ok("a plain pick: four, six and eight swings in the cave's three depths", JSON.stringify(plainNeed) === "[4,6,8]", plainNeed);
    await kit(A, { gems: ["fire"] });
    ok("a fire gem: fifteen in a hundred fewer swings, rounded up (seven of eight in the deep)", (await A.evaluate(`${N}.need(25, 0)`)) === 7 && (await A.evaluate(`${N}.need(15, 0)`)) === 6);
    await kit(A, { gems: ["dark"] });
    ok("a dark gem: every rock a swing more", (await A.evaluate(`${N}.need(1, 0)`)) === 5);
    // earth: a share off a rock's stamina, kept exact over the rocks (a pick at the top, one swing a rock, the gem a level stronger: a quarter)
    await go(A, "cave6", 6);
    await kit(A, { plus: 10, gems: ["earth"] });
    await A.evaluate(`${K}.setMineLuck(1)`);
    const four = (await plain(A, 6)).slice(0, 4), st = await stamina(A);
    for (const r of four) { await strike(A, 6, r.id); await sleep(250); }
    ok("an earth gem at the top: four rocks for three points of stamina", four.length === 4 && st - (await stamina(A)) === 3, st - (await stamina(A)));
    // water and ice, in a vein
    await kit(A, { gems: ["water"] });
    const wr = (await plain(A, 6))[0];
    await A.evaluate(`${K}.setRock(6, ${wr.id}, "vein", 7)`);
    await strike(A, 6, wr.id);
    await until("the board", () => A.evaluate(`!!${G}`), 8000).catch(() => {});
    ok("a water gem: one strike that a knot stops is given back (the board shows how many are left to give)", (await A.evaluate(`${G}.state().back`)) === 1 && (await A.evaluate(`document.querySelector("[data-vein-back]")?.dataset.veinBack`)) === "1");
    await A.evaluate(`${G}.enough()`);
    await until("what it came to", async () => !!(await veinCame(A)), 8000).catch(() => {});
    await click(A, "[data-vein-next]");
    await sleep(400);
    await kit(A, { gems: ["ice"] });
    const ir = (await plain(A, 6))[0];
    await A.evaluate(`${K}.setRock(6, ${ir.id}, "vein", 7)`);
    await strike(A, 6, ir.id);
    await until("the board", () => A.evaluate(`!!${G}`), 8000).catch(() => {});
    ok("an ice gem: one knot of the face is ice the crack may cross", (await A.evaluate(`${G}.state().ice.length`)) === 1 && (await A.evaluate(`document.querySelectorAll('[data-vein-cell][data-kind="ice"]').length`)) === 1);
    await A.shot(`${OUT}/mining-vein-ice.png`);
    await A.evaluate(`${G}.enough()`);
    await until("what it came to", async () => !!(await veinCame(A)), 8000).catch(() => {});
    await click(A, "[data-vein-next]");
    await sleep(400);
    // light: the rocks that hide a vein glint, within its reach of where one stands
    await kit(A, { gems: ["light"] });
    const near = (await plain(A, 6))[0], off = (await plain(A, 6)).filter((r) => Math.hypot(r.x - near.x, r.y - near.y) > 9)[0];
    await A.evaluate(`(${K}.setRock(6, ${near.id}, "vein", 3)${off ? `, ${K}.setRock(6, ${off.id}, "vein", 4)` : ""})`);
    await beside(A, 6, near.id);
    await until("the glint", async () => (await told(A)).glints.includes(near.id), 9000).catch(() => {});
    const glints = (await told(A)).glints;
    ok("a light gem: a rock near by that hides a vein glints, over the dark, and one far off does not", glints.includes(near.id) && (!off || !glints.includes(off.id))
      && (await A.evaluate(`[...document.querySelectorAll("[data-mine-glint]")].some((e) => e.style.opacity === "1")`)), { glints, near: near.id, off: off?.id });
    await A.shot(`${OUT}/mining-glint.png`);
    await kit(A);
    await sleep(2500);
    ok("…and nothing glints for a pick without it", (await told(A)).glints.length === 0);
    await A.evaluate(`(${K}.unsetRocks(), ${K}.setMineLuck(null))`);
  }

  if (want("day")) {
    console.log("the day's turn");
    await kit(A);
    await go(A, "cave2", 2);
    const before = await told(A), wayWas = await A.evaluate(`${K}.wayRock(2)`), rocksWas = JSON.stringify(await A.evaluate(`${N}.rocks(2)`));
    const now = await A.evaluate(`${K}.now()`), to = (() => { const d = new Date(now + 7 * 3600000); const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 5) - 7 * 3600000; return (next > now ? next : next + 86400000) - now; })();
    await A.evaluate(`${K}.skipMinutes(${Math.ceil(to / 60000) + 1})`);
    await sleep(2500);
    const after = await told(A);
    ok("at five in the morning the cave's day turns", after.day === before.day + 1, { before: before.day, after: after.day });
    ok("…no way down is open any more, and the village's board is empty", Object.keys(after.ways).length === 0 && after.deepest === null && Object.keys((await told(B)).ways).length === 0, after.ways);
    ok("…every floor is laid out anew, and whoever stood in it stands where it is come down into", JSON.stringify(await A.evaluate(`${N}.rocks(2)`)) !== rocksWas && (await A.evaluate(`(() => { const a = ${M}.spots(2).arrive, p = ${T}.me().pos; return Math.floor(p.x) === a[0] && Math.floor(p.y) === a[1]; })()`)), await me(A));
    ok("…the resting floors a member has reached are still theirs", JSON.stringify(after.rests) === JSON.stringify(before.rests), after.rests);
    console.log(`  (the rock that hides the second floor's way: ${wayWas} yesterday, ${await A.evaluate(`${K}.wayRock(2)`)} today)`);
  }

  if (want("share")) {
    console.log("several picks on one rock, a press held, no pick, a face's family, moss (rows never run yet)");
    await A.evaluate(`(${K}.unsetRocks(), ${K}.setMineLuck(1))`);
    await kit(A); await kit(B);
    await go(A, "cave7", 7); await go(B, "cave7", 7);
    await sleep(600);
    ok("each tester knows of the other on the floor", (await A.evaluate(`${N}.company()`)) && (await B.evaluate(`${N}.company()`)));
    // ── two picks on one rock: A begins it, B strikes the rest away, A is paid ──
    const [s1, s2, s3, s4] = await plain(A, 7);
    for (const r of [s1, s2, s3]) await A.evaluate(`${K}.setRock(7, ${r.id}, "shards")`);
    await beside(A, 7, s1.id); await beside(B, 7, s1.id);
    const was = { a: { st: await stamina(A), pts: await points(A), stone: await count(A, "stone") }, b: { st: await stamina(B), pts: await points(B), help: await B.evaluate(`${K}.lines().lines.helpers.points`) } };
    for (let i = 0; i < 2; i++) { await A.evaluate(`${N}.hit(7, ${s1.id})`); await sleep(380); }
    await A.evaluate(`${N}.flush()`);
    await sleep(300);
    ok("two swings of four leave the rock standing, half of it struck away, as whoever keeps the game has it", Math.abs((await A.evaluate(`${N}.part(7, ${s1.id})`)) - 0.5) < 0.01 && !(await gone(A, 7, s1.id)), await A.evaluate(`${N}.part(7, ${s1.id})`));
    await until("B is told of it", async () => ((await told(B)).struck?.[String(s1.id)]?.part ?? 0) > 0.4, 6000).catch(() => {});
    const seenByB = (await told(B)).struck?.[String(s1.id)];
    ok("the other tester is told the rock is half struck away, and whose it is", !!seenByB && Math.abs(seenByB.part - 0.5) < 0.01 && seenByB.mine === false && seenByB.by === nameA, seenByB);
    await B.shot(`${OUT}/mining-share-half.png`);
    for (let i = 0; i < 2 && !(await gone(B, 7, s1.id)); i++) { await B.evaluate(`${N}.hit(7, ${s1.id})`); await sleep(420); }
    await until("the rock is gone", () => gone(A, 7, s1.id), 6000).catch(() => {});
    const cardB = await B.evaluate(`(() => { const el = document.querySelector("[data-mine-came]"); return el ? { helped: el.dataset.mineHelped, got: el.querySelectorAll("[data-mine-got]").length } : null; })()`);
    const cardA = await A.evaluate(`(() => { const el = document.querySelector("[data-mine-came]"); return el ? { by: el.dataset.mineBy, got: Object.fromEntries([...el.querySelectorAll("[data-mine-got]")].map((g) => [g.dataset.mineGot, Number(g.dataset.n)])) } : null; })()`);
    ok("two more swings by the other break it: what it left is the first striker's, who pays its stamina", (await gone(A, 7, s1.id)) && (await count(A, "stone")) - was.a.stone === 1 && was.a.st - (await stamina(A)) === 1 && (await points(A)) - was.a.pts >= 1, { stone: await count(A, "stone"), st: await stamina(A) });
    ok("…and the first striker's page says so, with who struck the last of it away", !!cardA && cardA.got.stone === 1 && !!cardA.by, cardA);
    ok("…the other pays no stamina and has nothing of it in the bag, and is counted a point on the mining line and one on the helpers'", was.b.st === (await stamina(B)) && (await count(B, "stone")) === 0 && (await points(B)) - was.b.pts === 1 && (await B.evaluate(`${K}.lines().lines.helpers.points`)) - was.b.help === 1, { st: await stamina(B), pts: await points(B) });
    ok("…and their page says whom they helped", !!cardB && cardB.helped === nameA && cardB.got === 0, cardB);
    const deedsB = await B.evaluate(`${K}.mineDeeds().slice(-1)[0]`);
    ok("…written down as a hand lent", deedsB?.what === "hew" && deedsB.doc.rock === s1.id, deedsB);
    await A.shot(`${OUT}/mining-share-paid.png`);
    // ── a press held on a rock keeps swinging; let go, it stops ──
    await beside(A, 7, s2.id);
    const h2 = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "caveRock" && x.id === s2.id);
    const corner = await A.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
    await A.send("Input.dispatchMouseEvent", { type: "mousePressed", x: corner.x + h2.x, y: corner.y + h2.y, button: "left", buttons: 1, clickCount: 1 });
    await sleep(1150);
    const held = await A.evaluate(`${N}.swings(7, ${s2.id})`);
    await A.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: corner.x + h2.x, y: corner.y + h2.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(900);
    const after = await A.evaluate(`${N}.swings(7, ${s2.id})`), stood = !(await gone(A, 7, s2.id));
    ok("a press held on a rock swings by itself, a swing at the swing's own time (two or three in a second and a bit)", held >= 2 && held <= 3, held);
    ok("…and letting go stops it, with no swing more for the letting go", after === held && stood, { held, after, stood });
    await strike(A, 7, s2.id);
    // ── a rock tapped with no pick in the hand says so ──
    await A.evaluate(`(() => { const t = ${K}; t.empty(); return true; })()`);
    await sleep(300);
    const h3 = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "caveRock" && x.id === s3.id), stoodAt = await me(A);
    await tap(A, h3.x, h3.y);
    await sleep(500);
    const wants = await A.evaluate(`document.querySelector("[data-mine-note]")?.dataset.mineWants ?? null`), stays = await me(A);
    ok("a rock tapped with no pick in the hand says a pick is wanted, with its picture, and is no step", wants === "pick" && Math.hypot(stays.x - stoodAt.x, stays.y - stoodAt.y) < 0.2, { wants, note: await note(A) });
    await A.shot(`${OUT}/mining-no-pick.png`);
    await kit(A);
    // ── glowing moss: the chamber is lit for a minute, for both ──
    await A.evaluate(`${K}.setRock(7, ${s3.id}, "moss")`);
    const dark = { a: await lit(A), b: await lit(B) };
    await strike(A, 7, s3.id);
    await sleep(1500);
    const mossA = await A.evaluate(`${N}.moss()`), lightA = await A.evaluate(`${N}.mossLight()`);
    ok("a rock that lets moss out: the moss glows where it stood, and nothing of it is in the bag", mossA.length === 1 && mossA[0].f === 7 && !!(await A.evaluate(`!!document.querySelector("[data-mine-moss]")`)), mossA);
    ok("…and the chamber is lit: its breaker's light reaches its furthest wall, and far more of the screen is lit than before", Object.values(lightA)[0] > 5 && (await lit(A)).lit > dark.a.lit * 2, { lightA, before: dark.a, now: await lit(A) });
    await A.shot(`${OUT}/mining-moss.png`);
    await beside(B, 7, s3.id);
    await sleep(1200);
    ok("…for whoever else stands in that chamber too", (await lit(B)).lit > dark.b.lit * 2 && (await told(B)).moss.length === 1, { before: dark.b, now: await lit(B) });
    await A.evaluate(`${K}.skipMinutes(1.1)`);
    await sleep(2500);
    ok("a minute on it glows no more", (await A.evaluate(`${N}.moss()`)).length === 0 && (await lit(A)).lit < dark.a.lit * 1.5, await lit(A));
    // ── a vein's face says its family, and once the go is over the best go there was is drawn beside it ──
    if (s4) {
      await A.evaluate(`${K}.setRock(7, ${s4.id}, "vein", 11)`);
      await strike(A, 7, s4.id);
      await until("the board", () => A.evaluate(`!!${G}`), 8000).catch(() => {});
      const fam = await A.evaluate(`({ family: ${G}.state().family, said: document.querySelector("[data-town-vein]")?.dataset.family, lie: document.querySelector("[data-vein-lie]")?.dataset.veinLie ?? null })`);
      ok("a vein's board says which family its face comes of, and marks where it lies (a scatter lies anywhere)", ["seam", "cluster", "ring", "scatter"].includes(fam.family) && fam.said === fam.family && (fam.family === "scatter") === (fam.lie === null), fam);
      await A.evaluate(`${G}.strike([${(await A.evaluate(`${G}.state().head`)).join(",")}])`);
      await A.evaluate(`${G}.enough()`);
      await until("what it came to", async () => !!(await veinCame(A)), 8000).catch(() => {});
      const end = await A.evaluate(`(() => { const el = document.querySelector("[data-vein-came]"), best = document.querySelector("[data-vein-best]"); return { passed: Number(el?.dataset.veinPassed), could: Number(el?.dataset.veinCould), drawn: best ? Number(best.dataset.veinBest) : null, against: document.querySelector("[data-vein-against]")?.dataset.veinAgainst ?? null }; })()`);
      ok("a go ended at once passes nothing; its card says what the best go would have passed, and that go is drawn over the face", end.passed === 0 && end.could >= 2 && end.drawn === end.could && end.against === "more", end);
      await A.shot(`${OUT}/mining-vein-best.png`);
      await click(A, "[data-vein-next]");
      await sleep(400);
    }
    await A.evaluate(`(${K}.unsetRocks(), ${K}.setMineLuck(null))`);
  }

  if (want("phone")) {
    console.log("the board on a phone");
    const P = await A.window("MP", { width: 390, height: 780, dpr: 2, mobile: true });
    await enter(P);
    await P.evaluate(`${K}.caveReset()`);
    await kit(P);
    const r = (await plain(P, 1))[0];
    await P.evaluate(`${K}.setRock(1, ${r.id}, "vein", 7)`);
    await strike(P, 1, r.id);
    await until("the board", () => P.evaluate(`!!${G}`), 8000).catch(() => {});
    await sleep(700);
    const box = await P.evaluate(`(() => { const b = document.querySelector("[data-town-vein]")?.getBoundingClientRect(), c = document.querySelector("[data-vein-cell]")?.getBoundingClientRect(); const bar = [...document.querySelectorAll("nav")].map((n) => n.getBoundingClientRect()).filter((r) => r.top > innerHeight * 0.7).sort((a, b) => a.top - b.top)[0]; return b && c ? { left: b.left, right: b.right, top: b.top, bottom: b.bottom, cell: c.width, w: innerWidth, h: innerHeight, bar: bar?.top ?? innerHeight } : null; })()`);
    ok("on a phone the board is within the screen, above the tab bar", !!box && box.left >= 0 && box.right <= box.w && box.top >= 0 && box.bottom <= box.bar + 1, box);
    ok("…and a cell is a finger's size", !!box && box.cell >= 44, box?.cell);
    await P.shot(`${OUT}/mining-vein-phone.png`);
    await playVein(P, true);
    await P.shot(`${OUT}/mining-vein-phone-played.png`);
    await P.evaluate(`${G}.enough()`);
    await until("what it came to", async () => !!(await veinCame(P)), 8000).catch(() => {});
    await P.shot(`${OUT}/mining-vein-phone-came.png`);
    await click(P, "[data-vein-next]");
    await sleep(300);
    ok("played through by taps on a phone's screen", !(await P.evaluate(`!!${G}`)));
    ok("no page errors on the phone", P.errors.length === 0, P.errors);
  }

  ok("no page errors", A.errors.length === 0 && B.errors.length === 0, [...A.errors(), ...B.errors()].slice(0, 4));
} catch (e) {
  fail++;
  console.log(`  FAIL (the check stopped) ${e.message}`);
  try { await A.shot(`${OUT}/mining-stopped-A.png`); await B.shot(`${OUT}/mining-stopped-B.png`); } catch {}
} finally {
  await A.evaluate(`(${K}.unsetRocks(), ${K}.setMineLuck(null))`).catch(() => {});
  A.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
