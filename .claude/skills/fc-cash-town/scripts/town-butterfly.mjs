// The lucky butterfly (the insects' second rank, lib/town/gifts), and the insects made harder to match, in a real
// browser on the dev test room: with the butterfly following, the distance at which an insect startles is halved (a
// grasshopper lets its member stand before its face where it is off from anybody else, and a little of the
// butterfly's dust comes down over it); nearer than that, before its face still, it is off all the same. Good at the
// line (its sixth rank), the good insects' ring is narrower and they are warier, and a common one is as it was. A
// rare insect that would sit for good is at another perch of its haunt every twenty seconds.
//
//   node town-butterfly.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes butterfly-*.png.
import { mkdirSync, writeFileSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", B = "window.__townBugs";
const poseOf = (X, id) => X.evaluate(`${B}.poses().find((p) => p.id === ${id}) ?? null`);
const held = (X, id) => X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
/** A picture of the middle of the map, where I stand, drawn larger. */
const closeUp = async (X, file, box = { x: 440, y: 380, width: 400, height: 300 }, scale = 3) => {
  const s = await X.send("Page.captureScreenshot", { format: "png", clip: { ...box, scale } });
  writeFileSync(file, Buffer.from(s.data, "base64"));
};
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(350); };
/** A tile somebody can stand on nearest a point, so far from another at the least and the most. */
const standNear = (X, at, from = null, least = 0, most = 99) => X.evaluate(`(() => { let best = null, d0 = 1e9;
  for (let dx = -9; dx <= 9; dx++) for (let dy = -9; dy <= 9; dy++) { const x = Math.floor(${at.x}) + dx, y = Math.floor(${at.y}) + dy;
    if (!${V}.walkable(x, y)) continue;
    const d = Math.hypot(x + 0.5 - ${at.x}, y + 0.5 - ${at.y}), f = ${from ? `Math.hypot(x + 0.5 - ${from.x}, y + 0.5 - ${from.y})` : "50"};
    if (f < ${least} || f > ${most}) continue;
    if (d < d0) { d0 = d; best = { x, y }; } }
  return best; })()`);
const put = async (X, bug, place, kind, pick = 0) => {
  const id = await X.evaluate(`(() => { const all = ${B}.haunts().filter((h) => h.place === "${place}" && h.kind === "${kind}"); return all[${pick} % all.length]?.id ?? -1; })()`);
  await X.evaluate(`${T}.setBug(${id}, "${bug}")`);
  return id;
};
/**
 * Stand before a grasshopper's face, so far from it (a tile that is before it, between `least` and `most` away), having
 * come from far off; says whether it stayed, and how it and I stand then.
 */
async function before(X, id, haunt, least, most) {
  for (let i = 0; i < 16; i++) {
    await warp(X, ...Object.values(await standNear(X, haunt, haunt, 6.5, 9)));
    await until("it has landed", async () => { const q = await poseOf(X, id); return q && !q.flying ? q : null; }, 5000, 40).catch(() => null);
    const q = await poseOf(X, id);
    if (!q) continue;
    const f = q.right ? 1 : -1, v = q.mind.visit, want = (least + most) / 2;
    const at = await standNear(X, { x: q.x + (f * want) / Math.SQRT2, y: q.y - (f * want) / Math.SQRT2 }, q, least, most);
    // (before its face, by the map's own measure of sides)
    if (!at || ((at.x + 0.5 - q.x) - (at.y + 0.5 - q.y)) * f <= 0) continue;
    await X.evaluate(`${V}.warp(${at.x}, ${at.y})`);
    await sleep(700);
    const now = await poseOf(X, id);
    if (!now) continue;
    // (it looked about meanwhile and turned its back on me: that is another matter, tried again)
    if (now.mind.visit === v && (now.right ? 1 : -1) !== f) continue;
    // (its haunt's turn came round meanwhile, every ten minutes on the stroke: another insect's mind, begun anew)
    if (now.mind.visit < v) continue;
    return { stayed: now.mind.visit === v && !now.flying, d: Math.hypot(at.x + 0.5 - q.x, at.y + 0.5 - q.y), pose: now };
  }
  return null;
}

const X = await browser("Butterfly", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=U&townRoom=check&townHour=12&townWeather=clear`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${B}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the insects' own code has come", () => X.evaluate(`!!${B}`), 20000);
  await X.evaluate(`${T}.setSalt("check")`);
  const haunts = await X.evaluate(`${B}.haunts()`);
  const gh = await put(X, "grasshopper", "farm", "field", 3), hg = haunts.find((h) => h.id === gh);
  await warp(X, ...Object.values(await standNear(X, hg, hg, 6.5, 9)));
  await until("the grasshopper is about", () => poseOf(X, gh), 10000, 100);

  // nobody's butterfly: before its face at seven tenths of its sight, it is off
  ok("with no butterfly, an insect's senses reach me whole", (await X.evaluate(`${B}.soft()`)) === 1);
  const bare = await before(X, gh, hg, 2.0, 2.6);
  ok("a grasshopper is off from somebody who stands before its face, well within its sight", !!bare && bare.stayed === false, bare);
  ok("…and nothing is lulled", (await X.evaluate(`${B}.lulls()`)) === 0);

  // the butterfly follows: the same place, and it stays
  await X.evaluate(`${T}.setGifts(["famButterfly"])`);
  const wore = await X.evaluate(`${K}.familiarWear("famButterfly")`);
  ok("the lucky butterfly follows me", wore.ok === true, wore);
  await sleep(600);
  ok("with it, half of an insect's senses reach me", (await X.evaluate(`${B}.soft()`)) === 0.5, await X.evaluate(`${B}.soft()`));
  const lucky = await before(X, gh, hg, 2.0, 2.35);
  ok("the grasshopper stays for me where it was off before: before its face, beyond half its sight", !!lucky && lucky.stayed === true && lucky.d > 1.65 && lucky.d < 3.3, lucky);
  await sleep(500);
  ok("a little of the butterfly's dust comes down over it while that is so", (await X.evaluate(`${B}.lulls()`)) >= 1, await X.evaluate(`${B}.lulls()`));
  await X.shot(`${OUT}/butterfly-lulled.png`);
  await closeUp(X, `${OUT}/butterfly-lulled-near.png`);
  // …and from there it is within a net's reach
  await X.evaluate(`${T}.grant("bugNet", 1)`);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
  await sleep(400);
  let got = false;
  for (let i = 0; i < 6 && !got; i++) {
    const q = await poseOf(X, gh);
    if (!q) break;
    if (await X.evaluate(`${B}.tap(${q.aim.x}, ${q.aim.y})`)) { await until("the swing lands", async () => !(await X.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {}); await sleep(450); }
    got = (await held(X, "grasshopper")) > 0;
    if (!got) await before(X, gh, hg, 2.0, 2.35);
  }
  ok("so I swing at it from before its face, and have it", got, await X.evaluate(`${B}.note()`));

  // nearer than half its sight, before its face still: it is off all the same
  const gh2 = await put(X, "grasshopper", "farm", "field", 5), hg2 = haunts.find((h) => h.id === gh2);
  await warp(X, ...Object.values(await standNear(X, hg2, hg2, 6.5, 9)));
  await until("another grasshopper is about", () => poseOf(X, gh2), 10000, 100);
  const close = await before(X, gh2, hg2, 0.7, 1.5);
  ok("come nearer than half its sight before its face, it is off all the same", !!close && close.stayed === false && close.d < 1.65, close);
  await X.shot(`${OUT}/butterfly-fled.png`);

  // good at the line: the good insects are harder, the common ones as they were
  const ring = { stick: await X.evaluate(`${B}.ringOf("stickInsect")`), hopper: await X.evaluate(`${B}.ringOf("grasshopper")`) };
  ok("below the line's fourth rank nothing is harder", (await X.evaluate(`${B}.wary()`)) === 1);
  await X.evaluate(`${T}.setLine("insects", 2200)`);
  await sleep(700);
  const wary = await X.evaluate(`${B}.wary()`);
  ok("at its sixth rank the good insects are 24% harder for me", Math.abs(wary - 1.24) < 1e-9, wary);
  const hard = { stick: await X.evaluate(`${B}.ringOf("stickInsect")`), hopper: await X.evaluate(`${B}.ringOf("grasshopper")`) };
  ok("the net's ring on a stick insect is that much narrower, on a grasshopper as it was", Math.abs(hard.stick - ring.stick / 1.24) < 1e-9 && hard.hopper === ring.hopper, { ring, hard });
  await sleep(300);
  const me = (await X.evaluate(`${B}.people()`))[0];
  ok("and they know of me from that much further off, with my butterfly's half", !!me && Math.abs(me.wary - 1.24) < 1e-9 && me.soft === 0.5, me);
  await X.evaluate(`${T}.setLine("insects", 0)`);

  // a rare insect does not stay: an orchid mantis among the forest's flowers
  const om = await put(X, "orchidMantis", "forest", "blooms", 2), ho = haunts.find((h) => h.id === om);
  await warp(X, ...Object.values(await standNear(X, ho, ho, 3, 6)));
  await until("the orchid mantis is about", () => poseOf(X, om), 10000, 100);
  await sleep(400);
  const seenAt = new Set(), t0 = Date.now();
  let first = (await poseOf(X, om)).mind.at, moved = null, moves = 0;
  seenAt.add(first);
  await X.shot(`${OUT}/butterfly-roam-0.png`);
  while (Date.now() - t0 < 45000) {
    const q = await poseOf(X, om);
    if (q && q.mind.at !== first) { if (moved === null) { moved = Date.now() - t0; await sleep(200); await X.shot(`${OUT}/butterfly-roam-1.png`); } seenAt.add(q.mind.at); first = q.mind.at; if (++moves >= 2) break; }
    await sleep(250);
  }
  ok("an orchid mantis is at another of its flowers within twenty seconds, and at another again after twenty more", moved !== null && moved <= 21000 && moves >= 2 && seenAt.size >= 2, { moved, moves, seen: [...seenAt] });
  const q = await poseOf(X, om);
  ok("it is where that perch is, to be found again", !!q && Math.hypot(q.x - ho.perches[q.mind.at].x, q.y - ho.perches[q.mind.at].y) < 0.01 && q.open === true, q);
  // a common one keeps to its ways
  const lb = await put(X, "caterpillar", "forest", "blooms", 4);
  ok("a caterpillar has no such clock", (await X.evaluate(`(${B}.poses().find((p) => p.id === ${lb}) ?? { mind: {} }).mind.roam`)) === undefined);
  { const thrown = X.logs.filter((l) => l.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
