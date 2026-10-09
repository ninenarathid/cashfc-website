// How often Cash Town draws its map, tried in a real browser on the dev test room (lib/town/pace, the owner,
// 2026-10-04: "บางคนรันแล้ว fps สูงเกินไป แล้วคอมร้อน … ช่วยล็อคให้รันได้มากสุดแค่ 60 fps", with a setting at the top right):
//
// - on a screen faster than 60 a second (headless Chrome asks for frames at the rate of the machine's own screen: the
//   first check says what that is, and fails where it is no faster, since nothing is proved there): the page is asked
//   for far more than 60 a second, and the town draws 60;
// - the settings at the top right: the cog opens a panel that says what the map draws at; choosing 30 draws 30, is
//   kept on the device and is still the choice after a reload; choosing 60 goes back;
// - walking is as fast at 30 as at 60: the same road in the same time;
// - a phone's cog is at the foot of its screen, beside the chat (no room in its corner); it is held to 60 all the same,
//   and to 30 when that is chosen there;
// - what a town nobody is at costs (the owner, 2026-10-05: "คนใน cashtown เล่นแล้วใช้ CPU เยอะมาก"): left alone for twenty
//   seconds it is drawn at 30, and the page is woken for no more frames than that (it sleeps between them); a touch
//   has it back at once; under the settings left open it does not rest; with its window behind another it is drawn at
//   20, and the mouse moved over it wakes it for a moment.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-fps.mjs <base> <outdir>      (http://localhost:3100  .)
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const sky = (X) => X.evaluate(`window.__townView.sky()`);
/** A touch of the page, as the map hears one (a click from a script is no touch: it moves no pointer). */
const touch = (X) => X.evaluate(`(window.dispatchEvent(new Event("pointermove")), 1)`);
/** How many frames a second the town itself asks the screen for: the page's own askings, counted over `ms`. */
const asks = (X, ms = 3000) => X.evaluate(`new Promise((res) => { const real = window.requestAnimationFrame; let n = 0; window.requestAnimationFrame = (f) => { n++; return real.call(window, f); }; setTimeout(() => { window.requestAnimationFrame = real; res(Math.round((n * 1000) / ${ms})); }, ${ms}); })`);
/** The same as `drawn`, with the page touched all the while. */
async function drawnTouched(X, secs = 4) {
  const f = [];
  for (let i = 0; i < secs * 2; i++) { await touch(X); await sleep(500); if (i % 2) f.push((await sky(X)).fps); }
  const by = [...f].sort((a, b) => a - b);
  return { mid: by[Math.floor(by.length / 2)], most: by[by.length - 1], least: by[0], all: f };
}
/** How many frames a second the browser asks the page for, counted by the page itself over `ms`. */
const asked = (X, ms = 3000) => X.evaluate(`new Promise((res) => { let n = 0; const t0 = performance.now(); const f = (t) => { n++; if (t - t0 >= ${ms}) res(Math.round((n * 1000) / (t - t0))); else requestAnimationFrame(f); }; requestAnimationFrame(f); })`);
/** How many the town draws: its own count of each second, read over a few; the middle one, and the most. */
async function drawn(X, secs = 6) {
  const f = [];
  for (let i = 0; i < secs; i++) { await sleep(1000); f.push((await sky(X)).fps); }
  const by = [...f].sort((a, b) => a - b);
  return { mid: by[Math.floor(by.length / 2)], most: by[by.length - 1], least: by[0], all: f };
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the map's handle", () => X.evaluate("!!window.__townView?.sky && !!window.__cashTown?.me"), 30000);
  await sleep(4000);
}
const panel = `document.querySelector("[data-town-settings-panel]")`;
// (the cog is in the menu at the top right since 2026-10-09: the menu is opened first)
const openMenu = (X) => X.evaluate(`document.querySelector("[data-town-menu-panel]")?.hidden && document.querySelector("[data-town-menu]").click()`);
const openSettings = async (X) => {
  await openMenu(X); await sleep(150);
  if (!(await X.evaluate(`!!${panel}`))) await X.evaluate(`document.querySelector("[data-town-settings]").click()`);
  await until("the settings open", () => X.evaluate(`!!${panel}`), 4000);
};
const choose = async (X, fps) => { await openSettings(X); await X.evaluate(`${panel}.querySelector('[data-fps="${fps}"]').click()`); await sleep(300); };
const chosen = (X) => X.evaluate(`[...${panel}.querySelectorAll('[role="radio"]')].filter((b) => b.getAttribute("aria-checked") === "true").map((b) => Number(b.dataset.fps))`);
/** Walk to a tile and say how long it took, in seconds, and how far it was as the crow flies. */
async function walk(X, x, y) {
  const from = (await X.evaluate(`window.__cashTown.me().pos`)), t0 = Date.now();
  await X.evaluate(`window.__cashTown.walkTo(${x}, ${y})`);
  await until("there", async () => { const p = await X.evaluate(`window.__cashTown.me().pos`); return Math.hypot(p.x - x, p.y - y) < 0.05; }, 20000, 40);
  return { secs: (Date.now() - t0) / 1000, far: Math.hypot(from.x - x, from.y - y) };
}

const X = await browser("F", { width: 1100, height: 720 });
let P = null;
try {
  console.log("a fast screen:");
  await enter(X, "F");
  await touch(X);
  const raw = await asked(X);
  ok(`this screen asks the page for far more than 60 frames a second (${raw})`, raw > 100, `${raw} a second: this machine's screen is no faster than the pace, so nothing is proved here`);
  const first = await sky(X);
  ok("the town is held to 60 until somebody chooses", first.pace === 60, first.pace);
  const at60 = await drawn(X);
  ok(`…and draws 60 of them, no more (${at60.all.join(" ")})`, at60.most <= 61 && at60.mid >= 57, at60);
  ok("…of as many as the screen has, still", (await asked(X, 2000)) > 100);

  console.log("the settings at the top right:");
  await openMenu(X); await sleep(200);
  const cog = await X.evaluate(`(() => { const b = document.querySelector("[data-town-settings]"), c = document.querySelector("canvas").getBoundingClientRect(); if (!b) return null; const r = b.getBoundingClientRect(); return { down: r.top - c.top, in: c.right - r.right, title: b.title }; })()`);
  ok("there is a cog in the menu at the top right of the town", !!cog && cog.down > 40 && cog.down < 240 && cog.in < 320 && cog.title === "ตั้งค่า", cog);
  await openSettings(X);
  await sleep(1200);
  const shown = await X.evaluate(`({ text: ${panel}.innerText.replace(/\\s+/g, " ").trim(), now: Number(${panel}.querySelector("[data-drawn]").dataset.drawn), emoji: /\\p{Extended_Pictographic}/u.test(${panel}.innerText) })`);
  ok("its panel says what the map draws at now, and offers 30 and 60", /ความลื่นของภาพ/.test(shown.text) && /30 fps/.test(shown.text) && /60 fps/.test(shown.text) && shown.now >= 57 && shown.now <= 61 && !shown.emoji, shown);
  ok("60 is the one chosen", JSON.stringify(await chosen(X)) === "[60]", await chosen(X));
  await X.shot(`${OUT}/fps-settings.png`);

  await choose(X, 30);
  ok("choosing 30 is the choice at once", JSON.stringify(await chosen(X)) === "[30]" && (await sky(X)).pace === 30, await chosen(X));
  ok("…and is kept on this device", (await X.evaluate(`localStorage.getItem("cashTown:fps")`)) === "30");
  await sleep(1500);
  const at30 = await drawn(X);
  ok(`…and the town draws 30 (${at30.all.join(" ")})`, at30.most <= 31 && at30.mid >= 28, at30);
  ok("…which the panel says", await X.evaluate(`(() => { const n = Number(${panel}.querySelector("[data-drawn]").dataset.drawn); return n >= 28 && n <= 31; })()`));
  await X.shot(`${OUT}/fps-settings-30.png`);

  console.log("walking is as fast at 30 as at 60:");
  await X.evaluate(`window.__townView.warp(32, 37)`); await sleep(800);
  const slowThere = await walk(X, 40.5, 37.5), slowBack = await walk(X, 32.5, 37.5);
  await choose(X, 60);
  ok("choosing 60 goes back", JSON.stringify(await chosen(X)) === "[60]" && (await sky(X)).pace === 60 && (await X.evaluate(`localStorage.getItem("cashTown:fps")`)) === "60");
  await sleep(1500);
  const again = await drawn(X, 4);
  ok(`…and the town draws 60 again (${again.all.join(" ")})`, again.most <= 61 && again.mid >= 57, again);
  const fastThere = await walk(X, 40.5, 37.5), fastBack = await walk(X, 32.5, 37.5);
  const slow = slowThere.secs + slowBack.secs, fast = fastThere.secs + fastBack.secs;
  ok(`the same road there and back takes the same time (${slow.toFixed(2)} s at 30, ${fast.toFixed(2)} s at 60)`, Math.abs(slow - fast) < 0.5 && slow > 3 && slow < 9, { slowThere, slowBack, fastThere, fastBack });

  console.log("kept over a reload:");
  await choose(X, 30);
  await enter(X, "F");
  ok("after a reload the town is still held to 30", (await sky(X)).pace === 30, (await sky(X)).pace);
  const kept = await drawn(X, 4);
  ok(`…and draws 30 (${kept.all.join(" ")})`, kept.most <= 31 && kept.mid >= 28, kept);
  await openSettings(X);
  ok("…and the panel has 30 chosen", JSON.stringify(await chosen(X)) === "[30]", await chosen(X));
  // what is kept that is no choice is read as 60
  await X.evaluate(`localStorage.setItem("cashTown:fps", "240")`);
  await enter(X, "F");
  ok("a kept number that is no choice is read as 60", (await sky(X)).pace === 60, (await sky(X)).pace);
  const odd = await drawn(X, 4);
  ok(`…and 60 is what is drawn (${odd.all.join(" ")})`, odd.most <= 61 && odd.mid >= 57, odd);

  console.log("left alone, the map rests:");
  await touch(X);
  await sleep(150);
  ok("touched, it is drawn at the pace chosen", (await sky(X)).paceNow === 60, (await sky(X)).paceNow);
  await sleep(21000);
  const rest = await drawn(X, 4);
  ok(`nobody touching the page for twenty seconds, it is drawn at 30 (${rest.all.join(" ")})`, (await sky(X)).paceNow === 30 && rest.most <= 31 && rest.mid >= 28, rest);
  ok("…with 60 still the pace chosen", (await sky(X)).pace === 60);
  const dozing = await asks(X);
  ok(`…and the page is woken for no more frames than it draws: it sleeps between them (${dozing} a second, of the ${raw} to be had)`, dozing >= 27 && dozing <= 36, dozing);
  await touch(X);
  await sleep(150);
  ok("a touch, and it is 60 again at once", (await sky(X)).paceNow === 60, (await sky(X)).paceNow);
  const woke = await drawnTouched(X, 4);
  ok(`…and stays there while it is touched (${woke.all.join(" ")})`, woke.most <= 61 && woke.mid >= 57, woke);
  await openSettings(X);
  await sleep(22000);
  const read = await drawn(X, 3);
  ok(`under the settings left open it does not rest: what they say it draws at is what was chosen (${read.all.join(" ")})`, (await sky(X)).paceNow === 60 && read.mid >= 57 && (await X.evaluate(`Number(${panel}.querySelector("[data-drawn]").dataset.drawn)`)) >= 57, read);
  await X.evaluate(`document.querySelector("[data-town-settings]").click()`);
  await until("the settings shut", () => X.evaluate(`!${panel}`), 4000);

  console.log("its window behind another:");
  await touch(X);
  await X.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await sleep(1000);
  ok("just gone behind, it is still drawn as chosen", !(await X.evaluate(`document.hasFocus()`)) && (await sky(X)).paceNow === 60, { focus: await X.evaluate(`document.hasFocus()`), pace: (await sky(X)).paceNow });
  await sleep(3500);
  const behind = await drawn(X, 4);
  ok(`a few seconds on, it is drawn at 20 (${behind.all.join(" ")})`, (await sky(X)).paceNow === 20 && behind.most <= 21 && behind.mid >= 19, behind);
  const few = await asks(X);
  ok(`…and the page is woken for no more than that (${few} a second)`, few >= 18 && few <= 26, few);
  await touch(X);
  await sleep(150);
  ok("the mouse moved over it wakes it", (await sky(X)).paceNow === 60, (await sky(X)).paceNow);
  await sleep(4000);
  ok("…for a moment", (await sky(X)).paceNow === 20, (await sky(X)).paceNow);
  await X.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await touch(X);
  await sleep(150);
  ok("in front again, it is drawn as chosen", (await X.evaluate(`document.hasFocus()`)) && (await sky(X)).paceNow === 60, (await sky(X)).paceNow);
  ok("no errors on the page", X.logs.length === 0, X.logs);

  console.log("a phone:");
  P = await browser("G", { width: 390, height: 780, dpr: 2, mobile: true });
  await enter(P, "G");
  const rawP = await asked(P);
  ok(`the phone's screen asks for far more than 60 too (${rawP})`, rawP > 100, rawP);
  await openMenu(P); await sleep(200);
  const cogP = await P.evaluate(`(() => { const all = document.querySelectorAll("[data-town-settings]"), c = document.querySelector("canvas").getBoundingClientRect(); if (all.length !== 1) return { n: all.length }; const r = all[0].getBoundingClientRect(); return { n: 1, fromTop: r.top - c.top, fromLeft: r.left - c.left, up: innerHeight - r.bottom }; })()`);
  ok("a phone has one cog, in the menu at the top right as a wide screen has", cogP.n === 1 && cogP.fromTop > 40 && cogP.fromTop < 240 && cogP.fromLeft > 80, cogP);
  const phone = await drawn(P, 5);
  ok(`…and is held to 60 all the same (${phone.all.join(" ")})`, (await sky(P)).pace === 60 && phone.most <= 61, phone);
  await choose(P, 30);
  await sleep(1500);
  const phone30 = await drawn(P, 4);
  ok(`…and to 30 when that is chosen there (${phone30.all.join(" ")})`, (await sky(P)).pace === 30 && phone30.most <= 31 && phone30.mid >= 28, phone30);
  await P.shot(`${OUT}/fps-phone.png`);
  ok("no errors on the phone's page", P.logs.length === 0, P.logs);
} catch (e) {
  fail++;
  console.log("ERR", e.message);
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  X.close(); P?.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 1200);
}
