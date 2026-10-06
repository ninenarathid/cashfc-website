// The wind net (the insects' fourth rank, lib/town/gifts' charmWind), in a real browser on the dev test room, with the
// mouse and a finger as the map takes them: not worn, a swing lands a moment after the tap; worn, a press on an insect
// within reach holds the gust over that point, a drag moves it (the map is not pulled about, and it goes no further
// than I reach), and letting go brings the net down that very moment, where it is aimed: on a ladybird it takes it, a
// tile beside it takes nothing and is a miss like any. A plain tap on a butterfly where it is has it, with no leading.
// Another gust waits as long as a plain swing and its rest. With no stamina the net is the plain tired one.
//
//   node town-wind.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes wind-*.png.
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
/** Where a point of the map is in the window: the map's own pixels, from the canvas's corner. */
const onScreen = (X, x, y) => X.evaluate(`(() => { const p = ${B}.project(${x}, ${y}), r = document.querySelector('canvas[role="img"]').getBoundingClientRect(); return p ? { x: r.left + p.x, y: r.top + p.y } : null; })()`);
const mouse = (X, type, p, buttons = 1) => X.send("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: type === "mouseMoved" && !buttons ? "none" : "left", buttons, clickCount: type === "mouseMoved" ? 0 : 1, pointerType: "mouse" });
const touch = (X, type, p) => X.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: p.x, y: p.y, id: 1 }] });
/** A point beyond an insect as I see it, so far past it: never under my own feet (a press on somebody is theirs, not the net's). */
const beyond = (at, by) => { const dx = at.q.aim.x - at.me.x, dy = at.q.aim.y - at.me.y, d = Math.hypot(dx, dy) || 1; return { x: at.q.aim.x + (dx / d) * by, y: at.q.aim.y + (dy / d) * by }; };
/**
 * A point of the map to press by an insect: seven tenths of a tile from it, on the map's own canvas (not under a
 * button), and not on my own picture (a press on somebody is theirs, not the net's: I stand a head and more tall on
 * the screen over the tiles behind me). The first such, going round it from the side away from me.
 */
const pressBy = async (X, at) => {
  const base = Math.atan2(at.q.aim.y - at.me.y, at.q.aim.x - at.me.x), feet = await onScreen(X, at.me.x, at.me.y);
  for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.4, -2.4, 3.1]) {
    const p = { x: at.q.aim.x + Math.cos(base + turn) * 0.7, y: at.q.aim.y + Math.sin(base + turn) * 0.7 };
    if (Math.hypot(p.x - at.me.x, p.y - at.me.y) < 1.1) continue;
    const c = await onScreen(X, p.x, p.y);
    if (c && feet && Math.abs(c.x - feet.x) < 60 && c.y > feet.y - 150 && c.y < feet.y + 40) continue;
    if (c && await X.evaluate(`document.elementFromPoint(${c.x}, ${c.y}) === document.querySelector('canvas[role="img"]')`)) return { map: p, screen: c };
  }
  return null;
};
const closeUp = async (X, file, box = { x: 440, y: 330, width: 400, height: 300 }, scale = 3) => {
  const s = await X.send("Page.captureScreenshot", { format: "png", clip: { ...box, scale } });
  writeFileSync(file, Buffer.from(s.data, "base64"));
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
  await X.evaluate(`${T}.grant("bugNet", 1)`);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
  await sleep(400);
};
/** Stand within reach of a ladybird, a step or two off; says where it and I are. */
const beside = async (X, id) => {
  for (let i = 0; i < 12; i++) {
    const q = await poseOf(X, id), me = await X.evaluate(`${V}.self()`);
    if (q && Math.hypot(q.aim.x - me.x, q.aim.y - me.y) <= 1.7 && Math.hypot(q.aim.x - me.x, q.aim.y - me.y) >= 0.6) return { q, me };
    if (!q) { await sleep(200); continue; }
    const t = await standNear(X, q.aim, q.aim, 0.8, 1.6);
    if (t) await warp(X, t.x, t.y);
  }
  return null;
};

const X = await browser("Wind", { width: 1280, height: 860 });
try {
  await begin(X, "X");
  const haunts = await X.evaluate(`${B}.haunts()`);
  const lb = await put(X, "ladybird", "farm", "field", 2), hl = haunts.find((h) => h.id === lb);
  await warp(X, ...Object.values(await standNear(X, hl)));
  await until("the ladybird is about", () => poseOf(X, lb), 10000, 100);

  // not worn: the plain net, a moment after the tap
  ok("with no wind net the net takes its moment to come down", (await X.evaluate(`${B}.windy()`)) === false && (await X.evaluate(`${B}.swingMs()`)) === 300);
  let at = await beside(X, lb);
  const off = { x: at.q.aim.x + 1.0, y: at.q.aim.y + 0.1 };
  ok("a press on an insect begins no aim", (await X.evaluate(`${B}.press(${at.q.aim.x}, ${at.q.aim.y})`)) === false && (await X.evaluate(`${B}.aimed()`)) === null);
  await X.evaluate(`${B}.tap(${off.x}, ${off.y})`);
  await until("the plain swing lands", () => X.evaluate(`${B}.lastSwing()`), 3000, 30);
  let sw = await X.evaluate(`${B}.lastSwing()`);
  ok("a plain swing lands three tenths of a second after it is begun", !!sw && sw.lands - sw.began === 300 && !sw.wind, sw);
  await sleep(800);

  // worn: aimed while pressed, down the moment it is let go
  await X.evaluate(`${T}.setGifts(["charmWind"])`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmWind"])`);
  await sleep(600);
  ok("the wind net is worn as a charm, and my net is the wind's", wore.ok === true && (await X.evaluate(`${B}.windy()`)) === true && (await X.evaluate(`${B}.swingMs()`)) === 0, wore);
  at = await beside(X, lb);
  const cam0 = await X.evaluate(`${V}.cam()`), had0 = await held(X, "ladybird");
  // (pressed a little beyond it, dragged far off and then onto it, and let go)
  const pressed = await pressBy(X, at), past = pressed.map, beside1 = pressed.screen;
  await mouse(X, "mousePressed", beside1);
  await sleep(120);
  let aimed = await X.evaluate(`${B}.aimed()`);
  ok("a press by an insect within reach holds the gust over that point", !!aimed && Math.hypot(aimed.x - past.x, aimed.y - past.y) < 0.15, { aimed, past, me: at.me });
  await X.shot(`${OUT}/wind-0-aim.png`);
  await closeUp(X, `${OUT}/wind-0-aim-near.png`);
  const farOff = await onScreen(X, at.me.x + 6, at.me.y - 5);
  await mouse(X, "mouseMoved", farOff);
  await sleep(120);
  aimed = await X.evaluate(`${B}.aimed()`);
  const me = await X.evaluate(`${V}.self()`);
  ok("dragged far off, it goes no further than I reach", !!aimed && Math.abs(Math.hypot(aimed.x - me.x, aimed.y - me.y) - 2.4) < 0.02, { aimed, me });
  const cam1 = await X.evaluate(`${V}.cam()`);
  ok("and the map is not pulled about by the drag", cam0.follow === true && cam1.follow === true && Math.abs(cam1.cx - cam0.cx) < 8 && Math.abs(cam1.cy - cam0.cy) < 8, { cam0, cam1 });
  await closeUp(X, `${OUT}/wind-1-reach-near.png`);
  // onto the ladybird, where it is this moment; and let go
  const q = await poseOf(X, lb), onIt = await onScreen(X, q.aim.x, q.aim.y);
  await mouse(X, "mouseMoved", onIt);
  await sleep(60);
  const t0 = Date.now();
  await mouse(X, "mouseReleased", onIt, 0);
  await until("the gust lands", () => X.evaluate(`(() => { const s = ${B}.lastSwing(); return s && s.wind ? s : null; })()`), 2000, 20);
  sw = await X.evaluate(`${B}.lastSwing()`);
  ok("let go, the net is down that very moment, where it was aimed", sw.wind === true && sw.lands === sw.began && Math.hypot(sw.at.x - q.aim.x, sw.at.y - q.aim.y) < 0.2 && Date.now() - t0 < 1500, { sw, q: q.aim });
  await sleep(90);
  await closeUp(X, `${OUT}/wind-2-gust-near.png`);
  await until("it is caught", async () => (await held(X, "ladybird")) > had0, 3000, 60).catch(() => {});
  ok("on the ladybird, it takes it", (await held(X, "ladybird")) === had0 + 1, await X.evaluate(`${B}.note()`));
  ok("the aim is put away", (await X.evaluate(`${B}.aimed()`)) === null);

  // another gust waits as long as a plain swing and its rest take
  const lb2 = await put(X, "ladybird", "farm", "field", 4), h2 = haunts.find((h) => h.id === lb2);
  await warp(X, ...Object.values(await standNear(X, h2)));
  await until("another ladybird is about", () => poseOf(X, lb2), 10000, 100);
  at = await beside(X, lb2);
  // (the gust that took the first one has had its rest)
  await sleep(900);
  at = await beside(X, lb2);
  // aimed a tile beside it: nothing is taken, and it is a miss like any
  const wide = { x: at.q.aim.x + 1.0, y: at.q.aim.y };
  const twice = await X.evaluate(`(() => { const a = ${B}.tap(${wide.x}, ${wide.y}), wait = ${B}.ready(), b = ${B}.tap(${wide.x}, ${wide.y}); return { a, b, wait }; })()`);
  await sleep(500);
  sw = await X.evaluate(`${B}.lastSwing()`);
  ok("aimed a tile beside the insect it takes nothing: a miss, counted as any", sw.wind === true && (await held(X, "ladybird")) === had0 + 1 && Object.values(await X.evaluate(`${B}.misses()`)).some((n) => n >= 1), { sw, misses: await X.evaluate(`${B}.misses()`) });
  ok("a second tap at once looses no second gust: one waits as long as a plain swing and its rest", twice.a === true && twice.b === true && twice.wait > 550 && twice.wait <= 650 && Math.hypot(sw.at.x - wide.x, sw.at.y - wide.y) < 0.35, { twice, sw, wide });
  await sleep(400);

  // a butterfly, tapped where it is: no leading
  const bf = await put(X, "butterflyWhite", "town", "blooms", 6), hb = haunts.find((h) => h.id === bf);
  await warp(X, ...Object.values(await standNear(X, hb)));
  await until("the butterfly is about", () => poseOf(X, bf), 10000, 100);
  let got = false, swings = 0;
  for (let i = 0; i < 40 && !got; i++) {
    const tapped = await X.evaluate(`(() => { const p = ${B}.poses().find((x) => x.id === ${bf}), me = ${V}.self(); if (!p || ${B}.ready() > 0) return null;
      return Math.hypot(p.aim.x - me.x, p.aim.y - me.y) <= 2.3 ? ${B}.tap(p.aim.x, p.aim.y) : false; })()`);
    if (tapped === null) { await sleep(100); continue; }
    if (tapped === false) { const p = await poseOf(X, bf); if (!p) break; const t = await standNear(X, p.aim); await warp(X, t.x, t.y); continue; }
    swings++;
    await sleep(350);
    got = (await held(X, "butterflyWhite")) > 0;
  }
  ok("a butterfly is taken by a gust aimed at where it is, with no leading: at the first that reaches it", got && swings <= 2, { got, swings });

  // tired hands: the plain net as tired hands have it
  await X.evaluate(`${T}.setStamina(0)`);
  await sleep(600);
  ok("with no stamina there is no gust: the net is the plain tired one", (await X.evaluate(`${B}.windy()`)) === false && (await X.evaluate(`${B}.swingMs()`)) === 600);
  { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} finally { await X.close(); }

// a finger, at a phone's width
const P = await browser("WindPhone", { width: 360, height: 740, dpr: 2, mobile: true });
try {
  await P.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 }).catch(() => {});
  await begin(P, "Y");
  const haunts = await P.evaluate(`${B}.haunts()`);
  const lb = await put(P, "ladybird", "farm", "field", 2), hl = haunts.find((h) => h.id === lb);
  await warp(P, ...Object.values(await standNear(P, hl)));
  await until("the ladybird is about", () => poseOf(P, lb), 10000, 100);
  await P.evaluate(`${T}.setGifts(["charmWind"])`);
  await P.evaluate(`${K}.charmsWear(["charmWind"])`);
  await sleep(600);
  const at = await beside(P, lb), had0 = await held(P, "ladybird"), cam0 = await P.evaluate(`${V}.cam()`);
  const start = (await pressBy(P, at)).screen;
  await touch(P, "touchStart", start);
  await sleep(120);
  ok("a finger put down by an insect holds the gust there", (await P.evaluate(`${B}.aimed()`)) !== null);
  const q = await poseOf(P, lb), onIt = await onScreen(P, q.aim.x, q.aim.y);
  await touch(P, "touchMove", { x: (start.x + onIt.x) / 2, y: (start.y + onIt.y) / 2 });
  await touch(P, "touchMove", onIt);
  await sleep(120);
  await P.shot(`${OUT}/wind-3-phone-aim.png`);
  const cam1 = await P.evaluate(`${V}.cam()`);
  await touch(P, "touchEnd", onIt);
  await until("it is caught", async () => (await held(P, "ladybird")) > had0, 3000, 60).catch(() => {});
  ok("dragged onto it and lifted, the net is down on it: caught, and the map was not pulled about", (await held(P, "ladybird")) === had0 + 1 && cam1.follow === true && Math.abs(cam1.cx - cam0.cx) < 8 && Math.abs(cam1.cy - cam0.cy) < 8, { cam0, cam1, note: await P.evaluate(`${B}.note()`) });
  // a drag that begins on no insect pulls the map about, as ever
  const me = await P.evaluate(`${V}.self()`), away = await onScreen(P, me.x + 2.5, me.y + 2.5);
  await sleep(700);
  await touch(P, "touchStart", away);
  await touch(P, "touchMove", { x: away.x + 40, y: away.y + 10 });
  await sleep(40);
  await touch(P, "touchMove", { x: away.x + 80, y: away.y + 20 });
  await sleep(120);
  const cam2 = await P.evaluate(`${V}.cam()`);
  await touch(P, "touchEnd", { x: away.x + 80, y: away.y + 20 });
  ok("a drag that begins on no insect pulls the map about, as ever, and looses nothing", cam2.follow === false && Math.abs(cam2.cx - cam1.cx) > 5 && (await P.evaluate(`${B}.aimed()`)) === null, { cam1, cam2 });
  { const thrown = P.logs.filter((x) => x.startsWith("exception")); ok("no page errors on the phone", thrown.length === 0, thrown); }
} finally { await P.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
