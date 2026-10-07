// The lulling flute (the insects' fifth rank, lib/town/gifts' thingFlute), in a real browser on the dev test room: it
// is on the hunter's belt for whoever has it and holds a net; with no insect on the screen it is not played, and is
// kept; played, every insect on the screen sleeps fifteen seconds (a grasshopper stays for somebody who walks up
// before its face, a cricket that is heard and not seen shows itself, a ladybird stops where it is), each still to be
// netted (a swing beside one misses, and it sleeps on); the flute rests until its five minutes come round, and the
// sleepers wake by themselves. In another tab of the same browser nobody is asleep: it is on its owner's screen only.
//
//   node town-flute.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes flute-*.png.
import { mkdirSync, writeFileSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", B = "window.__townBugs";
const poseOf = (X, id) => X.evaluate(`${B}.poses().find((p) => p.id === ${id}) ?? null`);
const held = (X, id) => X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(350); };
const flute = (X) => X.evaluate(`(() => { const b = document.querySelector("[data-bug-flute]"); if (!b) return null; const r = b.getBoundingClientRect();
  return { ready: b.dataset.ready === "1", wait: Number(b.dataset.wait), disabled: b.disabled, x: r.left, y: r.top, w: r.width, h: r.height, title: b.title }; })()`);
const asleep = (X) => X.evaluate(`${B}.asleep()`);
const standNear = (X, at, from = null, least = 0, most = 99) => X.evaluate(`(() => { let best = null, d0 = 1e9;
  for (let dx = -9; dx <= 9; dx++) for (let dy = -9; dy <= 9; dy++) { const x = Math.floor(${at.x}) + dx, y = Math.floor(${at.y}) + dy;
    if (!${V}.walkable(x, y)) continue;
    const d = Math.hypot(x + 0.5 - ${at.x}, y + 0.5 - ${at.y}), f = ${from ? `Math.hypot(x + 0.5 - ${from.x}, y + 0.5 - ${from.y})` : "50"};
    if (f < ${least} || f > ${most}) continue;
    if (d < d0) { d0 = d; best = { x, y }; } }
  return best; })()`);
const closeUp = async (X, file, box = { x: 340, y: 280, width: 600, height: 420 }, scale = 2) => {
  const s = await X.send("Page.captureScreenshot", { format: "png", clip: { ...box, scale } });
  writeFileSync(file, Buffer.from(s.data, "base64"));
};
const begin = async (X, who, fresh = true) => {
  const url = `${BASE}/town?townTest=${who}&townRoom=check&townHour=12&townWeather=clear`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${B}`), 20000);
  if (fresh) {
    await X.evaluate(`(${T}.reset(), ${T}.forget())`);
    await sleep(500);
    await X.goto(url);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the insects' own code has come", () => X.evaluate(`!!${B}`), 20000);
    await X.evaluate(`${T}.setSalt("check")`);
  }
  await X.evaluate(`${T}.grant("bugNet", 1)`);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
  await sleep(400);
};

const X = await browser("Flute", { width: 1280, height: 860 });
try {
  await begin(X, "F");
  const haunts = await X.evaluate(`${B}.haunts()`);
  // three haunts of the farm's that are near one another: a grasshopper, a cricket and a ladybird, all on one screen
  const fields = haunts.filter((h) => h.place === "farm" && h.kind === "field");
  let trio = null;
  for (const a of fields) { const near = fields.filter((b) => b !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)).slice(0, 2); if (!trio || Math.hypot(near[1].x - a.x, near[1].y - a.y) < trio.d) trio = { a, b: near[0], c: near[1], d: Math.hypot(near[1].x - a.x, near[1].y - a.y) }; }
  const farAway = fields.slice().sort((p, q) => Math.hypot(q.x - trio.a.x, q.y - trio.a.y) - Math.hypot(p.x - trio.a.x, p.y - trio.a.y))[0];
  ok("the belt has no flute for whoever has none", (await flute(X)) === null);
  await X.evaluate(`${T}.setGifts(["thingFlute"])`);
  await sleep(500);
  let f = await flute(X);
  ok("with the flute and a net in the hand, it is on the belt, ready", !!f && f.ready === true && f.disabled === false && f.w >= 44 && f.title.length > 3, f);

  // the three, on one screen
  await X.evaluate(`${T}.setBug(${trio.a.id}, "grasshopper")`);
  await X.evaluate(`${T}.setBug(${trio.b.id}, "cricket")`);
  await X.evaluate(`${T}.setBug(${trio.c.id}, "ladybird")`);
  await X.evaluate(`${T}.setBug(${farAway.id}, "grasshopper")`);
  const mid = { x: (trio.a.x + trio.b.x + trio.c.x) / 3, y: (trio.a.y + trio.b.y + trio.c.y) / 3 };
  await warp(X, ...Object.values(await standNear(X, mid, trio.a, 4.5, 30)));
  await until("the three are about", async () => (await poseOf(X, trio.a.id)) && (await poseOf(X, trio.b.id)) && (await poseOf(X, trio.c.id)), 10000, 100);
  await sleep(500);
  const cricket0 = await poseOf(X, trio.b.id);
  ok("a cricket is heard and not seen", cricket0.seen === false, cricket0);
  await X.shot(`${OUT}/flute-0-before.png`);
  await X.evaluate(`document.querySelector("[data-bug-flute]").click()`);
  await sleep(350);
  await X.shot(`${OUT}/flute-1-played.png`);
  let z = await asleep(X);
  const t0 = Date.now();
  ok("played, every insect on the screen sleeps: the three of them, for fifteen seconds", [trio.a.id, trio.b.id, trio.c.id].every((id) => z.some((s) => s.id === id)) && z.every((s) => s.until - Date.now() > 13500 && s.until - Date.now() <= 15000), z);
  ok("…and one off the screen does not", !z.some((s) => s.id === farAway.id), z.map((s) => s.id));
  const cricket1 = await poseOf(X, trio.b.id);
  ok("the cricket shows itself asleep, where its song came from, and sings no more", cricket1.seen === true && cricket1.sings === false && Math.hypot(cricket1.x - cricket0.x, cricket1.y - cricket0.y) < 0.01, cricket1);
  f = await flute(X);
  ok("the flute rests: the belt says how long, five minutes at the most", !!f && f.ready === false && f.disabled === true && f.wait > 0 && f.wait <= 300, f);
  const again = await X.evaluate(`${K}.giftUse("thingFlute")`);
  ok("played again at once, it is refused", again.ok === false && again.why === "spent", again);
  await sleep(900);
  await closeUp(X, `${OUT}/flute-2-asleep.png`);
  // a ladybird stops where it is
  const lb0 = await poseOf(X, trio.c.id);
  await sleep(1500);
  const lb1 = await poseOf(X, trio.c.id);
  ok("a ladybird asleep walks nowhere", Math.hypot(lb1.x - lb0.x, lb1.y - lb0.y) < 0.001 && lb1.flying === false, { lb0, lb1 });
  // a swing beside it misses, and it sleeps on
  const at = await standNear(X, lb1.aim, lb1.aim, 0.8, 1.6);
  await warp(X, at.x, at.y);
  const had0 = await held(X, "ladybird");
  await X.evaluate(`${B}.tap(${lb1.aim.x + 1.0}, ${lb1.aim.y})`);
  await until("the swing lands", async () => !(await X.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {});
  await sleep(450);
  const lb2 = await poseOf(X, trio.c.id);
  ok("a net that comes down beside a sleeper misses it, and it sleeps on", (await held(X, "ladybird")) === had0 && !!lb2 && Math.hypot(lb2.x - lb1.x, lb2.y - lb1.y) < 0.001 && (await asleep(X)).some((s) => s.id === trio.c.id), { lb2 });
  await sleep(450);
  await X.evaluate(`${B}.tap(${lb1.aim.x}, ${lb1.aim.y})`);
  await until("the swing lands", async () => !(await X.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {});
  await sleep(500);
  ok("one that comes down on it takes it", (await held(X, "ladybird")) === had0 + 1, await X.evaluate(`${B}.note()`));
  // a grasshopper stays for somebody who walks up before its face
  const g0 = await poseOf(X, trio.a.id), face = g0.right ? 1 : -1;
  const front = await standNear(X, { x: g0.x + (face * 1.2) / Math.SQRT2, y: g0.y - (face * 1.2) / Math.SQRT2 }, g0, 0.7, 1.9);
  await X.evaluate(`${V}.warp(${front.x}, ${front.y})`);
  await sleep(700);
  const g1 = await poseOf(X, trio.a.id);
  ok("a grasshopper asleep stays for somebody who comes up before its face", !!g1 && g1.mind.visit === g0.mind.visit && Math.hypot(g1.x - g0.x, g1.y - g0.y) < 0.001 && Date.now() - t0 < 14000, { g0: g0.mind, g1: g1?.mind, ms: Date.now() - t0 });
  await X.evaluate(`${B}.tap(${g1.aim.x}, ${g1.aim.y})`);
  await until("the swing lands", async () => !(await X.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {});
  await sleep(500);
  ok("…who nets it there", (await held(X, "grasshopper")) === 1, await X.evaluate(`${B}.note()`));
  // they wake by themselves
  await until("the sleepers wake", async () => (await asleep(X)).length === 0, 20000, 200);
  await sleep(700);
  const cricket2 = await poseOf(X, trio.b.id);
  ok("after fifteen seconds they wake: the cricket is heard and not seen again", Date.now() - t0 >= 14500 && Date.now() - t0 < 19000 && !!cricket2 && cricket2.seen === false, { ms: Date.now() - t0, cricket2 });

  // in another tab of the same browser, nobody is asleep to it
  await X.evaluate(`${T}.skipHours(0.09)`);
  await sleep(700);
  f = await flute(X);
  ok("five minutes on the flute is ready again", !!f && f.ready === true && f.disabled === false, f);
  const O = await X.tab("FluteOther");
  await begin(O, "G", false);
  // (the same cricket at the same haunt in the other tab: what a script puts at a haunt is its tab's own)
  await O.evaluate(`${T}.setBug(${trio.b.id}, "cricket")`);
  const me = await X.evaluate(`${V}.self()`);
  await warp(O, Math.floor(me.x) + 1, Math.floor(me.y) + 1);
  await until("the other tab has the cricket", () => poseOf(O, trio.b.id), 10000, 100);
  await X.evaluate(`document.querySelector("[data-bug-flute]").click()`);
  await sleep(600);
  ok("played again, the cricket sleeps on my screen", (await asleep(X)).some((s) => s.id === trio.b.id), await asleep(X));
  const theirs = await poseOf(O, trio.b.id);
  ok("…and on nobody else's: there it is not asleep, and not seen", (await asleep(O)).length === 0 && !!theirs && theirs.seen === false, { theirs, asleep: await asleep(O) });
  // nothing on the screen to lull: it is not played, and is kept. (In the town at half past five in the morning, the
  // trial's clock put on to it: the night's insects are in, and the day's not out.)
  const now = await X.evaluate(`${T}.now()`), hour = (((now + 7 * 3600000) % 86400000) + 86400000) % 86400000 / 3600000;
  await X.evaluate(`${T}.skipHours(${(((5.5 - hour) % 24) + 24) % 24})`);
  await X.evaluate(`${T}.unsetBugs()`);
  await warp(X, ...Object.values(await standNear(X, { x: 30.5, y: 30.5 })));
  await sleep(900);
  const out = await X.evaluate(`${B}.poses().filter((p) => p.on).length`);
  f = await flute(X);
  await X.evaluate(`document.querySelector("[data-bug-flute]").click()`);
  await sleep(500);
  const kept = await flute(X);
  ok("with no insect on the screen it is not played: the page says so, and the flute is kept", out === 0 && f.ready === true && kept.ready === true && /แมลง/.test((await X.evaluate(`${B}.note()`)) ?? "") && (await asleep(X)).length === 0, { out, f, kept, note: await X.evaluate(`${B}.note()`) });
  { const thrown = [...X.logs, ...O.logs].filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} finally { await X.close(); }

// a phone's width: the belt's two things, one over the other
const P = await browser("FlutePhone", { width: 360, height: 740, dpr: 2, mobile: true });
try {
  await begin(P, "H");
  await P.evaluate(`${T}.setGifts(["thingFlute", "thingNectar"])`);
  await sleep(700);
  const both = await P.evaluate(`[...document.querySelectorAll("[data-bug-belt] button")].map((b) => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, on: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b || b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) }; })`);
  ok("at a phone's width the belt's two things are on the screen, a thumb wide each, with nothing over them", both.length === 2 && both.every((b) => b.x >= 0 && b.x + b.w <= 360 && b.y >= 0 && b.y + b.h <= 740 && b.w >= 44 && b.h >= 44 && b.on) && Math.abs(both[0].y - both[1].y) >= 44, both);
  await P.shot(`${OUT}/flute-3-phone.png`);
  { const thrown = P.logs.filter((x) => x.startsWith("exception")); ok("no page errors on the phone", thrown.length === 0, thrown); }
} finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
