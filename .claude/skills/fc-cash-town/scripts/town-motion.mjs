// Whether Cash Town moves, tried in a real browser on the dev test room (lib/town/motion; the owner, 2026-10-04:
// "ทำไมบาง browser ไม่เห็นฝน หรือ ลม ที่พัดมาใน cash town": the map stood still for a browser that asks for reduced motion,
// which is a setting of the machine's that many have on for other reasons):
//
// - every browser here is made to ask for reduced motion, as such a member's does. In the rain the rain falls all the
//   same, and lands; on a windy day leaves fall, blow and reach the ground; the picture changes from one moment to
//   the next;
// - the settings' panel (the cog) has the switch, on; turned off, nothing is in the air, the wet ground and its
//   puddles stay, and two pictures of the map half a second apart are the same to the pixel; that is kept on the
//   device and is still so after a reload; turned on, it rains again;
// - a phone has the cog at the foot of its screen beside the chat; its panel opens upwards and fits the screen, on a
//   short phone too; the switch works there the same.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-motion.mjs <base> <outdir>      (http://localhost:3100  .)
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const sky = (X) => X.evaluate(`(() => { const s = window.__townView.sky(); return { sky: s.weather.sky, moving: s.moving, rain: s.effects.rain, wet: s.effects.wet, leaves: s.effects.leaves, drops: s.drops, splashes: s.splashes }; })()`);
const leaves = (X) => X.evaluate(`window.__townView.leaves()`);
const kept = (X) => X.evaluate(`localStorage.getItem("cashTown:motion")`);
/** How much of the map's picture changes in `ms`: the share of its pixels that are another colour afterwards. */
const changes = (X, ms = 500) => X.evaluate(`new Promise((res) => {
  const c = document.querySelector("canvas"), look = () => c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  const a = look();
  setTimeout(() => { const b = look(); let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; res(n / (a.length / 4)); }, ${ms});
})`);
/** A browser that asks for reduced motion, as the machine of a member who saw no rain did. */
async function asking(label, size) {
  const X = await browser(label, size);
  await X.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  return X;
}
async function enter(X, letter, weather) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=${weather}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the map's handle", () => X.evaluate("!!window.__townView?.sky && !!window.__cashTown?.me"), 30000);
  await sleep(5000);
}
const panel = `document.querySelector("[data-town-settings-panel]")`;
const knob = `${panel}.querySelector("[data-town-motion]")`;
const openSettings = async (X) => {
  if (!(await X.evaluate(`!!${panel}`))) await X.evaluate(`document.querySelector("[data-town-settings]").click()`);
  await until("the settings open", () => X.evaluate(`!!${panel}`), 4000);
};
const shut = async (X) => { if (await X.evaluate(`!!${panel}`)) await X.evaluate(`document.querySelector("[data-town-settings]").click()`); await sleep(200); };
const flip = async (X) => { await openSettings(X); await X.evaluate(`${knob}.click()`); await sleep(700); };
const said = (X) => X.evaluate(`({ checked: ${knob}.getAttribute("aria-checked"), word: ${knob}.innerText.trim(), is: ${knob}.dataset.townMotion, role: ${knob}.getAttribute("role") })`);

const X = await asking("M", { width: 1100, height: 720 });
let P = null;
try {
  console.log("a browser that asks for reduced motion, in the rain:");
  await enter(X, "M", "rain");
  ok("the browser asks for reduced motion", await X.evaluate(`matchMedia("(prefers-reduced-motion: reduce)").matches`));
  ok("nothing is kept: nobody has chosen", (await kept(X)) === null, await kept(X));
  let s = await sky(X);
  ok("the town moves all the same", s.moving === true, s);
  ok(`…the rain falls (${s.drops} drops in the air) and lands (${s.splashes} rings)`, s.sky === "rain" && s.drops > 100 && s.splashes > 5, s);
  let moved = await changes(X);
  ok(`…and the picture changes from one moment to the next (${(moved * 100).toFixed(1)}% of it in half a second)`, moved > 0.01, moved);
  await X.shot(`${OUT}/motion-rain.png`);

  console.log("the switch in the settings:");
  await openSettings(X);
  const text = await X.evaluate(`({ text: ${panel}.innerText.replace(/\\s+/g, " ").trim(), emoji: /\\p{Extended_Pictographic}/u.test(${panel}.innerText) })`);
  ok("the panel has the frame rate and, under it, whether the town moves", /ความลื่นของภาพ/.test(text.text) && /ภาพเคลื่อนไหว/.test(text.text) && text.text.indexOf("ภาพเคลื่อนไหว") > text.text.indexOf("60 fps") && !text.emoji, text);
  let k = await said(X);
  ok("…a switch, and it is on", k.role === "switch" && k.checked === "true" && k.word === "เปิดอยู่" && k.is === "on", k);
  await X.shot(`${OUT}/motion-settings.png`);
  await flip(X);
  k = await said(X);
  ok("turned off, it says so", k.checked === "false" && k.word === "ปิดอยู่" && k.is === "off", k);
  ok("…and that is kept on this device", (await kept(X)) === "off", await kept(X));
  await shut(X);
  s = await sky(X);
  ok("nothing is in the air: no rain falling, none landing", s.moving === false && s.drops === 0 && s.splashes === 0, s);
  ok("…it is the same weather, the ground as wet", s.sky === "rain" && s.rain > 0.3 && s.wet === 1, s);
  moved = await changes(X);
  ok("…and the picture stands still: the same to the pixel half a second on", moved === 0, moved);
  await X.shot(`${OUT}/motion-off.png`);

  console.log("kept over a reload:");
  await enter(X, "M", "rain");
  s = await sky(X);
  ok("after a reload the town still stands still", s.moving === false && s.drops === 0, s);
  await openSettings(X);
  k = await said(X);
  ok("…and the switch is still off", k.checked === "false" && k.word === "ปิดอยู่", k);
  await flip(X);
  await shut(X);
  await sleep(2500);
  s = await sky(X);
  ok(`turned on, it rains again (${s.drops} drops)`, s.moving === true && s.drops > 100 && (await kept(X)) === "on", s);
  moved = await changes(X);
  ok("…and the picture changes again", moved > 0.01, moved);
  ok("no errors on the page", X.logs.length === 0, X.logs);

  console.log("a windy day:");
  await enter(X, "M", "windy");
  let l = await leaves(X);
  ok(`leaves fall from the trees and blow in on the wind (${l.fall} and ${l.wind})`, l.fall > 0 && l.wind > 0, l);
  await until("a leaf reaches the ground", async () => (await leaves(X)).down > 0, 25000);
  ok("…and reach the ground", (await leaves(X)).down > 0, await leaves(X));
  await X.shot(`${OUT}/motion-windy.png`);
  await flip(X);
  await shut(X);
  l = await leaves(X);
  ok("turned off, there are none", l.fall === 0 && l.wind === 0 && l.gust === 0, l);
  moved = await changes(X);
  ok("…and the picture stands still: the birds and the butterflies too", moved === 0, moved);
  await flip(X);
  await shut(X);
  ok("no errors on the page", X.logs.length === 0, X.logs);

  console.log("a phone, a short one:");
  P = await asking("N", { width: 360, height: 640, dpr: 2, mobile: true });
  await enter(P, "N", "rain");
  s = await sky(P);
  ok(`a phone that asks for reduced motion has the rain too (${s.drops} drops)`, (await P.evaluate(`matchMedia("(prefers-reduced-motion: reduce)").matches`)) && s.moving === true && s.drops > 30, s);
  const cog = await P.evaluate(`(() => { const all = document.querySelectorAll("[data-town-settings]"); if (all.length !== 1) return { n: all.length }; const chat = all[0].parentElement.previousElementSibling; const r = all[0].getBoundingClientRect(), c = chat?.getAttribute("aria-label") === "แชท" ? chat.getBoundingClientRect() : null; return { n: 1, left: r.left, right: r.right, top: r.top, bottom: r.bottom, wide: r.width, chat: c ? { right: c.right, top: c.top } : null, screen: [innerWidth, innerHeight] }; })()`);
  ok("its cog is at the foot of the screen, beside the chat", cog.n === 1 && cog.top > 400 && cog.left < 80 && cog.wide >= 40 && !!cog.chat && Math.abs(cog.chat.top - cog.top) < 3 && cog.left - cog.chat.right < 12 && cog.left >= cog.chat.right, cog);
  await openSettings(P);
  await sleep(300);
  const box = await P.evaluate(`(() => { const r = ${panel}.getBoundingClientRect(), c = document.querySelector("[data-town-settings]").getBoundingClientRect(), bar = document.querySelector("canvas").getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cogTop: c.top, stageTop: bar.top, screen: [innerWidth, innerHeight] }; })()`);
  ok("its panel opens upwards and fits the screen", box.left >= 8 && box.right <= box.screen[0] - 8 && box.bottom <= box.cogTop && box.top >= box.stageTop + 56, box);
  await P.shot(`${OUT}/motion-phone-settings.png`);
  await flip(P);
  await shut(P);
  s = await sky(P);
  ok("turned off there, the phone's town stands still", s.moving === false && s.drops === 0 && (await kept(P)) === "off" && (await changes(P)) === 0, s);
  await flip(P);
  await shut(P);
  await sleep(2000);
  ok("…and on again, it rains", (await sky(P)).drops > 30);
  await P.shot(`${OUT}/motion-phone.png`);
  ok("no errors on the phone's page", P.logs.length === 0, P.logs);
} catch (e) {
  fail++;
  console.log("ERR", e.message);
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  X.close(); P?.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 1200);
}
