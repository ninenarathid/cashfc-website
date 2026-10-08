// What is to come, looked at in real browsers (`next dev` only: the preview of 2026-10-08): the bridge over the river
// and the gate beyond it, the blacksmith's talk, the mountain's foot climbed by its stairs, the cave's dark with its
// pools of light and its small map, and a ladder down. Two testers, each a Chrome of its own, in the scripts' own
// room. Prints PASS/FAIL lines and writes pictures to <outdir> (1600 x 900).
//
//   node town-mountain.mjs <base> <outdir>
//
// Needs `next dev` (the test room, and the preview itself: a production build has none of this).
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
const SIZE = { width: 1600, height: 900 };
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__cashTown", V = "window.__townView", M = "window.__townMore";
/** The day whose cave the check walks: any day will do, as long as both testers are in the same one. */
const DAY = 20369;
const url = (X, more = "") => `${BASE}/town?townTest=${X.label}&townRoom=check&townHour=12&townWeather=clear&townCaveDay=${DAY}${more}`;
const enter = async (X, more = "") => {
  await X.goto(url(X, more));
  await until(`${X.label} ready`, async () => (await status(X)) === "ready", 240000);
  await until(`${X.label}'s preview`, () => X.evaluate(`!!${M}`), 30000);
};
const me = (X) => X.evaluate(`${T}.me().pos`);
/** Where X sees the other tester standing. */
const other = (X, name) => X.evaluate(`${T}.people().find((p) => p.name.endsWith(" ${name}"))?.pos ?? null`);
const frames = (X) => X.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))`);
const tap = async (X, x, y) => {
  const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: r.x + x, y: r.y + y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
};
const key = async (X, k) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code: k === " " ? "Space" : k, windowsVirtualKeyCode: k === "Escape" ? 27 : k === "Enter" ? 13 : 32 }); };
/** Walk X to a tile and wait until it stands there (or somewhere else, through a gate); gives every place it was seen on the way. */
async function walk(X, x, y, ms = 60000) {
  const went = await X.evaluate(`${V}.walk(${x}, ${y})`), seen = [];
  if (!went) return { went, seen, at: await me(X) };
  const end = Date.now() + ms;
  let moved = false;
  while (Date.now() < end) {
    const s = await X.evaluate(`${V}.self()`);
    seen.push({ x: s.x, y: s.y });
    if (s.moving) moved = true; else if (moved || seen.length > 6) break;
    await sleep(120);
  }
  return { went, seen, at: await me(X) };
}
/** The tile nearest a tile that can be stood on (a tree or a rock may stand on the one asked for). */
const open = (X, x, y) => X.evaluate(`(() => { for (let far = 0; far < 5; far++) for (let dy = -far; dy <= far; dy++) for (let dx = -far; dx <= far; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === far && ${V}.walkable(${x} + dx, ${y} + dy)) return [${x} + dx, ${y} + dy]; return null; })()`);
/** How bright the canvas is: the share of its pixels lighter than a dim grey, and the mean of a patch about a point of it. */
const bright = (X, at) => X.evaluate(`(() => {
  const c = document.querySelector("canvas"), k = c.width / c.getBoundingClientRect().width, g = c.getContext("2d");
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let lit = 0;
  for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 96) lit++;
  const mean = (x, y, r) => { const p = g.getImageData(Math.max(0, Math.round((x - r) * k)), Math.max(0, Math.round((y - r) * k)), Math.round(2 * r * k), Math.round(2 * r * k)).data; let s = 0; for (let i = 0; i < p.length; i += 4) s += p[i] + p[i + 1] + p[i + 2]; return s / (p.length / 4) / 3; };
  const at = ${at ? JSON.stringify(at) : `${V}.screenOf(${T}.me().id)`};
  return { share: lit / (d.length / 16), near: mean(at.x, at.y, 50), corner: mean(c.getBoundingClientRect().width - 90, c.getBoundingClientRect().height - 300, 60) };
})()`);

const A = await browser("MA", SIZE), B = await browser("MB", SIZE);
try {
  // ── the bridge being built: B looks at it half laid, and cannot cross ──
  await enter(B, "&townBridge=3&townAt=bridge");
  await sleep(2500);
  const half = await B.evaluate(`${M}.state().bridge`);
  ok("with three spans laid the bridge is drawn and not open", half.spans === 3 && half.open === false, half);
  const W = await B.evaluate(`${M}.world()`);
  const water = W.bridge.tiles.flat().filter(([x, y]) => !(x === 10 && y === 28) && !(x === 9 && y === 28) && !(x === 10 && y === 29) && !(x <= 5));
  ok("…its tiles over the water are not walked on", (await B.evaluate(`[[8,30],[7,31],[9,29],[6,32]].every(([x, y]) => !${V}.walkable(x, y))`)) === true, water);
  ok("…and nobody walks to the far bank", (await B.evaluate(`${V}.walk(3, 33)`)) === false);
  await B.evaluate(`${V}.lookAt(9, 31)`);
  await sleep(1200);
  await B.shot(`${OUT}/bridge-being-built.png`);
  await enter(B, "&townBridge=6&townBridgeOpen=0&townAt=bridge");
  ok("whole but not opened, it is still not walked on", (await B.evaluate(`${M}.state().bridge.spans === 6 && !${M}.state().bridge.open && !${V}.walkable(8, 30) && ${V}.walk(3, 33) === false`)) === true);

  // ── both in the preview as it is shown: the bridge whole and open ──
  await enter(A);
  await enter(B);
  await until("each sees the other", async () => (await other(A, "MB")) && (await other(B, "MA")), 30000);
  ok("both enter the town and see each other", true);

  // ── the blacksmith ──
  await A.evaluate(`${M}.go("smith")`);
  await sleep(1500);
  await A.shot(`${OUT}/smith.png`);
  const smith = await until("the blacksmith on the screen", async () => (await A.evaluate(`${V}.keepers()`)).find((k) => k.id === "smith"), 20000);
  ok("the blacksmith stands in the keepers' row, a third beside the uncle and the banker", (await A.evaluate(`${V}.keepers().map((k) => k.id).sort().join()`)) === "banker,smith,uncle");
  await tap(A, (smith.x0 + smith.x1) / 2, (smith.y0 + smith.y1) / 2);
  const said = await until("his talk", () => A.evaluate(`document.querySelector("#town-talk-h")?.textContent ?? null`), 8000).catch((e) => e.message);
  ok("a tap on him opens a talk under his name", said === "ช่างตีเหล็ก", said);
  await sleep(1200);
  const box = await A.evaluate(`(() => { const s = document.querySelector("[aria-labelledby=town-talk-h]"); const p = s?.querySelector("span[aria-hidden]"); return { lines: s?.querySelectorAll("span.rounded-full").length ?? 0, portrait: !!p && /url\\(/.test(p.style.backgroundImage), text: s?.querySelector("p.sr-only")?.textContent ?? "", choices: s?.querySelectorAll("[role=group] button").length ?? 0 }; })()`);
  ok("…with his portrait, a greeting and three lines more, and nothing to choose", box.portrait && box.lines === 4 && box.text.length > 5 && box.choices === 0, box);
  await A.shot(`${OUT}/smith-talk.png`);
  const texts = [box.text];
  for (let i = 0; i < 3; i++) { await key(A, "Enter"); await sleep(120); await key(A, "Enter"); await sleep(250); texts.push(await A.evaluate(`document.querySelector("[aria-labelledby=town-talk-h] p.sr-only")?.textContent ?? ""`)); }
  ok("Enter goes on through his lines, the last of which says his forge is not open", new Set(texts).size === 4 && /ยังไม่เปิด/.test(texts[3]), texts);
  await key(A, "Escape");
  await sleep(400);
  ok("Escape closes it", (await A.evaluate(`!document.querySelector("#town-talk-h")`)) === true);

  // ── over the bridge, and through the gate beyond it ──
  await A.evaluate(`${M}.go("bridge")`);
  await sleep(1200);
  await A.shot(`${OUT}/bridge.png`);
  const over = await walk(A, 3, 33);
  const wet = over.seen.filter((p) => { const tx = Math.floor(p.x), ty = Math.floor(p.y); return W.bridge.tiles.flat().some(([x, y]) => x === tx && y === ty) && tx >= 6 && tx <= 9; });
  ok("the bridge is walked across, over the water", over.went && over.at.x < 5 && wet.length >= 3, { went: over.went, at: over.at, wet: wet.length });
  ok("…in a straight line", wet.every((p) => Math.abs(p.x + p.y - wet[0].x - wet[0].y) < 0.6), wet.map((p) => (p.x + p.y).toFixed(2)));
  await A.evaluate(`${V}.lookAt(1.5, 33)`);
  await frames(A); await sleep(300);
  const gate = await until("the gateway beyond the bridge", async () => (await A.evaluate(`${V}.gates()`)).find((g) => g.to[0] < 2), 6000);
  await tap(A, (gate.x0 + gate.x1) / 2, (gate.y0 + gate.y1) / 2);
  const foot = await until("A at the mountain's foot", async () => { const p = await me(A); return p.y >= W.mountain.y && p; }, 20000).catch((e) => e.message);
  ok("a tap on the gateway on the far bank walks A to it and through, to the mountain's foot", !!foot.x && foot.x > W.mountain.x + 60, foot);
  const seen = await until("B sees A on the mountain", async () => { const p = await other(B, "MA"); return p && p.y >= W.mountain.y && p; }, 8000).catch((e) => e.message);
  ok("B, in town, sees A there at once, where A stands", !!seen.x && Math.hypot(seen.x - foot.x, seen.y - foot.y) < 0.6, { seen, foot });
  await sleep(900);
  await A.shot(`${OUT}/foot.png`);

  // ── the climb: only by the stairs ──
  const m = W.mountain, cliff = [m.x + 54, m.y + 20];
  ok("a cliff's face is not walked on", (await A.evaluate(`!${V}.walkable(${cliff[0]}, ${cliff[1]}) && ${V}.walk(${cliff[0]}, ${cliff[1]}) === false`)) === true);
  const below = await open(A, m.x + 58, m.y + 20), above = await open(A, m.x + 50, m.y + 20);
  await A.evaluate(`${V}.warp(${below[0]}, ${below[1]})`);
  await sleep(500);
  // (straight up the cliff from here is the slope: the way there is round by a stair)
  const up = await walk(A, above[0], above[1]);
  const onCliff = up.seen.filter((p) => p.x - m.x > 53.8 && p.x - m.x < 55.2);
  ok("the slope above is reached, by a stair and nowhere else", up.went && up.at.x - m.x < 53 && onCliff.length > 0 && onCliff.every((p) => { const v = p.y - m.y; return (v >= 13 && v < 15) || (v >= 43 && v < 45); }), { at: up.at, rows: onCliff.map((p) => (p.y - m.y).toFixed(1)) });
  await A.evaluate(`${M}.go("slope")`); await sleep(1500); await A.shot(`${OUT}/slope.png`);
  await A.evaluate(`${M}.go("upper")`); await sleep(1500); await A.shot(`${OUT}/upper.png`);
  // from the upper terrace to the lookout on foot: over the last cliff by one of its two stairs
  const top = await walk(A, W.at.lookout.x + 1, W.at.lookout.y + 1);
  const last = top.seen.filter((p) => p.x - m.x > 15.4 && p.x - m.x < 16.4);
  ok("and the summit's lookout, by a stair of the last cliff", top.went && top.at.x - m.x < 8 && last.length > 0 && last.every((p) => { const v = p.y - m.y; return (v >= 15 && v < 17) || (v >= 34 && v < 36); }), { at: top.at, rows: last.map((p) => (p.y - m.y).toFixed(1)) });
  await sleep(700);
  await A.shot(`${OUT}/summit-lookout.png`);
  const bench = await A.evaluate(`${V}.benches().length`);
  ok("the lookout's bench is there to be sat on", bench >= 1, bench);

  // ── into the cave ──
  await A.evaluate(`${M}.go("mouth")`);
  await sleep(600);
  const [mx, my] = W.at.mouthTiles[0];
  await A.evaluate(`${V}.walk(${mx}, ${my})`);
  const in1 = await until("A in the cave", async () => (await A.evaluate(`${M}.state().floor`)) === 1 && (await me(A)), 15000).catch((e) => e.message);
  const one = await A.evaluate(`${M}.spots(1)`);
  ok("stopping at the mine's mouth puts A in the cave, beside the first floor's ladder", !!in1.x && Math.floor(in1.x) === one.arrive[0] && Math.floor(in1.y) === one.arrive[1], { in1, one });
  await sleep(1800);
  const alone = await A.evaluate(`${M}.state()`), look = await bright(A);
  await A.shot(`${OUT}/cave-one.png`);
  ok("the cave is dark but for pools of light: the lamp on the ladder and A's own", alone.lit.lights === 2 && alone.lit.lit > 0 && alone.lit.lit / alone.lit.of < 0.12 && look.share < 0.12, { lit: alone.lit, look });
  ok("…lit about A, black far from A", look.near > 30 && look.corner < 6, look);
  // the small map fills as A walks: to the far end of the floor, by the ladder down
  const before = alone.seen[1] ?? 0;
  const far = await walk(A, one.down[0] + 1, one.down[1] + 1, 40000);
  await sleep(600);
  const after = (await A.evaluate(`${M}.state()`)).seen[1];
  ok("the small map fills in as A walks", far.went && before > 10 && after > before + 60, { before, after });
  await A.shot(`${OUT}/cave-small-map.png`);
  // A by the ladder down, far from the lamp: one pool. Then B comes and stands beside A: two
  const single = (await A.evaluate(`${M}.state()`)).lit;
  await B.evaluate(`${M}.go("cave1")`);
  await until("B in the cave", async () => (await B.evaluate(`${M}.state().floor`)) === 1, 15000);
  const hereB = await until("A sees B on the floor", async () => { const p = await other(A, "MB"); return p && p.y >= W.cave.y && p; }, 8000).catch((e) => e.message);
  ok("B comes down too, and A sees B on the same floor", !!hereB.x, hereB);
  await walk(B, one.down[0] + 3, one.down[1] + 2, 40000);
  await until("A sees B beside it", async () => { const p = await other(A, "MB"), q = await me(A); return p && Math.hypot(p.x - q.x, p.y - q.y) < 3.2; }, 20000);
  await sleep(900);
  const both = (await A.evaluate(`${M}.state()`)).lit;
  await A.shot(`${OUT}/cave-two.png`);
  ok("B's light is seen on A's screen: the lit ground grows", both.lights === 3 && both.lit > single.lit * 1.25, { single, both });
  // down the ladder
  await A.evaluate(`${V}.walk(${one.down[0]}, ${one.down[1]})`);
  const in2 = await until("A on the second floor", async () => (await A.evaluate(`${M}.state().floor`)) === 2 && (await me(A)), 15000).catch((e) => e.message);
  const two = await A.evaluate(`${M}.spots(2)`);
  ok("the ladder down puts A on the second floor, beside its ladder", !!in2.x && Math.floor(in2.x) === two.arrive[0] && Math.floor(in2.y) === two.arrive[1], { in2, two });
  const gone = await until("B sees A a floor down", async () => { const p = await other(B, "MA"); return p && Math.hypot(p.x - in2.x, p.y - in2.y) < 0.6 && p; }, 8000).catch((e) => e.message);
  ok("B sees A there at once (stood there, not walked across the rock between the floors)", !!gone.x, gone);
  await sleep(900);
  ok("on B's screen A's light is gone from the first floor", (await B.evaluate(`${M}.state().lit.lights`)) === 2);
  await A.shot(`${OUT}/cave-floor-two.png`);
  // B back in town still sees where A is
  await B.evaluate(`${V}.warp(30, 30)`);
  await sleep(1200);
  const from = await other(B, "MA"), at = await me(A);
  ok("B, back in town, sees where A is", !!from && Math.hypot(from.x - at.x, from.y - at.y) < 0.6, { from, at });
  // and back up
  await A.evaluate(`${V}.walk(${two.up[0]}, ${two.up[1]})`);
  const back = await until("A back on the first floor", async () => (await A.evaluate(`${M}.state().floor`)) === 1 && (await me(A)), 15000).catch((e) => e.message);
  ok("the ladder A came down by goes back up, to beside the first floor's ladder down", !!back.x && Math.max(Math.abs(Math.floor(back.x) - one.down[0]), Math.abs(Math.floor(back.y) - one.down[1])) === 1, back);

  // ── a resting floor, and the town at night ──
  await A.evaluate(`${M}.go("cave10")`);
  await until("A on a resting floor", async () => (await A.evaluate(`${M}.state().floor`)) === 10, 15000);
  await sleep(1500);
  const rest = await A.evaluate(`({ lights: ${M}.state().lit.lights, rocks: ${M}.rocks(10).length, lift: !!${M}.spots(10).lift, benches: ${V}.benches().length })`);
  ok("the tenth floor is a resting floor: a fire that lights it, logs to sit on, a lift, no rocks", rest.lights === 3 && rest.rocks === 0 && rest.lift && rest.benches >= 1, rest);
  await A.shot(`${OUT}/cave-resting-floor.png`);
  ok("no page errors", A.errors.length + B.errors.length === 0, [...A.errors(), ...B.errors()]);
} catch (e) { ok("the run", false, e.message); } finally { A.close(); B.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
