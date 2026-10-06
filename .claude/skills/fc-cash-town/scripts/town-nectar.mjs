// A drop of nectar (the insects' third rank, lib/town/gifts' thingNectar), in a real browser on the dev test room: the
// hunter's belt is there only for whoever has the nectar and holds a net; a drop put down by the river at noon lies
// where I stand, and within ten seconds a dragonfly flies to it (the kind of that place and hour), to be netted as any
// other; one drop at a time; by a lamp at noon nothing is about and no drop is used; an insect left alone is off after
// its time; ten drops a day. And the belt at a phone's width.
//
//   node town-nectar.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes nectar-*.png.
import { mkdirSync, writeFileSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", B = "window.__townBugs";
const LURED = -1;
const poseOf = (X, id) => X.evaluate(`${B}.poses().find((p) => p.id === ${id}) ?? null`);
const held = (X, id) => X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(350); };
const belt = (X) => X.evaluate(`(() => { const b = document.querySelector("[data-bug-nectar]"); if (!b) return null; const r = b.getBoundingClientRect();
  return { left: Number(b.dataset.left), out: b.dataset.out === "1", disabled: b.disabled, x: r.left, y: r.top, w: r.width, h: r.height, title: b.title }; })()`);
const closeUp = async (X, file, box = { x: 440, y: 380, width: 400, height: 300 }, scale = 3) => {
  const s = await X.send("Page.captureScreenshot", { format: "png", clip: { ...box, scale } });
  writeFileSync(file, Buffer.from(s.data, "base64"));
};
/** A tile somebody can stand on nearest a point. */
const standNear = (X, at) => X.evaluate(`(() => { let best = null, d0 = 1e9;
  for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) { const x = Math.floor(${at.x}) + dx, y = Math.floor(${at.y}) + dy;
    if (!${V}.walkable(x, y)) continue;
    const d = Math.hypot(x + 0.5 - ${at.x}, y + 0.5 - ${at.y});
    if (d < d0) { d0 = d; best = { x, y }; } }
  return best; })()`);
/** The trial's clock put on to an hour of the day in Bangkok. */
const toHour = async (X, hour) => {
  const now = await X.evaluate(`${T}.now()`), h = (((now + 7 * 3600000) % 86400000) + 86400000) % 86400000 / 3600000;
  await X.evaluate(`${T}.skipHours(${((hour - h) % 24 + 24) % 24})`);
  await sleep(400);
};
const begin = async (X, who) => {
  const url = `${BASE}/town?townTest=${who}&townRoom=check&townHour=12&townWeather=clear`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${B}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the insects' own code has come", () => X.evaluate(`!!${B}`), 20000);
  await X.evaluate(`${T}.setSalt("check")`);
  await toHour(X, 12);
};

const X = await browser("Nectar", { width: 1280, height: 860 });
try {
  await begin(X, "V");
  const haunts = await X.evaluate(`${B}.haunts()`);
  const water = haunts.find((h) => h.place === "town" && h.kind === "water"), lamp = haunts.find((h) => h.place === "town" && h.kind === "lamp");
  const by = await standNear(X, water.perches[0]);
  await warp(X, by.x, by.y);

  // the belt: only with the nectar, and a net in the hand
  await X.evaluate(`${T}.grant("bugNet", 1)`);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
  await sleep(500);
  ok("with a net and no nectar there is no belt", (await belt(X)) === null);
  await X.evaluate(`${T}.setGifts(["thingNectar"])`);
  await X.evaluate(`${T}.letGo()`);
  await sleep(500);
  ok("with the nectar and no net in the hand there is none either", (await belt(X)) === null);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
  await sleep(600);
  let b = await belt(X);
  ok("with both, the belt has the nectar: ten drops, ready", !!b && b.left === 10 && b.out === false && b.disabled === false && b.w >= 44 && b.h >= 44 && b.title.length > 3, b);
  await X.shot(`${OUT}/nectar-0-belt.png`);

  // a drop by the river at noon: a dragonfly, three seconds on
  await X.evaluate(`${T}.setNectarLuck([0.5, 0, 0])`);
  const me = await X.evaluate(`${V}.self()`), t0 = await X.evaluate(`${T}.now()`);
  await X.evaluate(`document.querySelector("[data-bug-nectar]").click()`);
  const l = await until("a drop is out", () => X.evaluate(`${B}.lured()`), 4000, 60);
  ok("a drop put down lies on the tile I stand on", l.x === Math.floor(me.x) && l.y === Math.floor(me.y), { l, me });
  ok("what comes is of that place and hour: by the river at noon, a dragonfly", l.bug === "dragonfly" && l.n === 1, l);
  ok("it comes within ten seconds (three, by this luck) and stays two minutes", l.from - t0 >= 2900 && l.from - t0 <= 10200 && l.until - l.from === 120000, { from: l.from - t0 });
  b = await belt(X);
  ok("the belt counts it: nine drops, and one out", !!b && b.left === 9 && b.out === true && b.disabled === true, b);
  ok("until it has come there is no insect at the drop", (await poseOf(X, LURED)) === null);
  await sleep(350);
  await closeUp(X, `${OUT}/nectar-1-drop.png`);
  const again = await X.evaluate(`${K}.nectarDrop([${l.x}, ${l.y}])`);
  ok("a second drop while one is out is refused", again.ok === false && again.why === "out", again);
  // (on its way in: a picture a second before it is there)
  await sleep(Math.max(0, l.from - (await X.evaluate(`${T}.now()`)) - 900));
  await closeUp(X, `${OUT}/nectar-2-coming.png`, { x: 240, y: 180, width: 800, height: 600 }, 2);
  const came = await until("the dragonfly has come", () => poseOf(X, LURED), 6000, 60);
  ok("then it is there, at a perch a step or two from the drop, to be netted as any other", came.bug === "dragonfly" && came.open === true && Math.hypot(came.aim.x - (l.x + 0.5), came.aim.y - (l.y + 0.5)) < 3.2, came);
  await sleep(300);
  await X.shot(`${OUT}/nectar-3-there.png`);
  await closeUp(X, `${OUT}/nectar-3-there-near.png`);
  // caught as a dragonfly is: stood still by where it hovers
  let got = false;
  for (let i = 0; i < 60 && !got; i++) {
    const q = await poseOf(X, LURED);
    if (!q) break;
    if (q.mind.land < Date.now() && Math.hypot(q.x - me.x, q.y - me.y) <= 2.35) {
      if (await X.evaluate(`${B}.tap(${q.aim.x}, ${q.aim.y})`)) { await until("the swing lands", async () => !(await X.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {}); await sleep(450); }
      got = (await held(X, "dragonfly")) > 0;
    } else await sleep(120);
  }
  ok("a swing on it takes it", got, await X.evaluate(`${B}.note()`));
  ok("the drop is done with, and nothing more is at it", (await X.evaluate(`${B}.lured()`)) === null && (await poseOf(X, LURED)) === null);
  ok("it is a catch like any: against its kind, and in the village's book", (await X.evaluate(`${T}.hunts().filter((h) => h.bug === "dragonfly").length`)) === 1 && (await X.evaluate(`${T}.bugBook().dragonfly`)) !== undefined);
  b = await belt(X);
  ok("and another drop may be put down", !!b && b.left === 9 && b.out === false && b.disabled === false, b);

  // by a lamp at noon nothing is about: no drop is put down, and none is used
  await warp(X, Math.floor(lamp.perches[0].x), Math.floor(lamp.perches[0].y));
  const at = await X.evaluate(`${V}.self()`), from = await X.evaluate(`(() => { const all = ${B}.haunts().filter((h) => h.place === "town" && ["blooms", "water", "field", "lamp", "litter"].includes(h.kind));
    let best = null, d0 = 1e9; for (const h of all) for (const p of h.perches) { const d = Math.hypot(p.x - ${Math.floor(lamp.perches[0].x)} - 0.5, p.y - ${Math.floor(lamp.perches[0].y)} - 0.5); if (d < d0) { d0 = d; best = h; } } return best.kind; })()`);
  await X.evaluate(`document.querySelector("[data-bug-nectar]").click()`);
  await sleep(500);
  const said = await X.evaluate(`${B}.note()`);
  b = await belt(X);
  ok("by a lamp at noon no insect is about: the page says so, no drop is put down, and none is used", from === "lamp" && /แมลง/.test(said ?? "") && (await X.evaluate(`${B}.lured()`)) === null && !!b && b.left === 9, { from, said, b, at });
  await X.shot(`${OUT}/nectar-4-quiet.png`);

  // left alone, it is off after its time
  await warp(X, by.x, by.y);
  let did = await X.evaluate(`${K}.nectarDrop([${by.x}, ${by.y}])`);
  await until("it has come", () => poseOf(X, LURED), 8000, 80);
  await X.evaluate(`${T}.skipHours(0.04)`);
  await sleep(900);
  ok("an insect left alone is off after its two minutes", did.ok === true && (await X.evaluate(`${B}.lured()`)) === null && (await poseOf(X, LURED)) === null, did);
  // ten a day
  for (let i = 0; i < 12; i++) {
    did = await X.evaluate(`${K}.nectarDrop([${by.x}, ${by.y}])`);
    if (!did.ok) break;
    await X.evaluate(`${T}.skipHours(0.04)`);
    await sleep(150);
  }
  await sleep(500);
  b = await belt(X);
  ok("the eleventh drop of a day is refused, and the belt says none is left", did.ok === false && did.why === "spent" && !!b && b.left === 0 && b.disabled === true, { did, b });
  await X.shot(`${OUT}/nectar-5-spent.png`);
  { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} finally { await X.close(); }

// a phone's width
const P = await browser("NectarPhone", { width: 360, height: 740, dpr: 2, mobile: true });
try {
  await begin(P, "W");
  const haunts = await P.evaluate(`${B}.haunts()`), water = haunts.find((h) => h.place === "town" && h.kind === "water"), by = await standNear(P, water.perches[0]);
  await warp(P, by.x, by.y);
  await P.evaluate(`${T}.grant("bugNet", 1)`);
  await P.evaluate(`${T}.setGifts(["thingNectar"])`);
  await P.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
  await P.evaluate(`${T}.setNectarLuck([0.5, 0, 0])`);
  await sleep(700);
  const b = await belt(P);
  ok("at a phone's width the belt is on the screen, a thumb wide", !!b && b.x >= 0 && b.x + b.w <= 360 && b.y >= 0 && b.y + b.h <= 740 && b.w >= 44 && b.h >= 44, b);
  const over = await P.evaluate(`(() => { const el = document.querySelector("[data-bug-nectar]"), r = el.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === top || el.contains(top); })()`);
  ok("…and nothing lies over it", over === true);
  await P.evaluate(`document.querySelector("[data-bug-nectar]").click()`);
  await until("a drop is out on the phone", () => P.evaluate(`${B}.lured()`), 4000, 60);
  await until("its dragonfly has come", () => poseOf(P, LURED), 8000, 80);
  await sleep(300);
  await P.shot(`${OUT}/nectar-6-phone.png`);
  { const thrown = P.logs.filter((x) => x.startsWith("exception")); ok("no page errors on the phone", thrown.length === 0, thrown); }
} finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
