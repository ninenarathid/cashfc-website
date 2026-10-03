// The town's music in the dev test room: silent until the first tap anywhere, which starts it; at its end a piece
// begins again; then at several hours of the day: a piece from lib/town/music.json plays, from where the clock is and
// not from its top, softly and without clipping; the slider is the volume; off stops it and on brings it back; an hour
// of the same part of the day keeps the piece and one of another part brings its own after a fade; the choice is kept
// on the device. (The check's Chrome plays without a tap, so what a browser refuses before one is not tried here.)
//   node music-check.mjs http://localhost:3100 [hours, e.g. 3,8,14,19,23]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, sleep, status, until } from "../cdp.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const HOURS = (process.argv[3] ?? "3,8,14,19,23").split(",").map(Number);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const FILES = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, "lib/town/music.json"), "utf8"))).map((f) => `/town/${f}`);

let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

const M = "window.__townMusic";
const state = (X) => X.evaluate(`(() => { const m = ${M}, el = m?.el; return { playing: m?.playing, src: el?.getAttribute("src"), paused: el?.paused, at: el?.currentTime, long: el?.duration,
  clock: el?.duration ? (Date.now() / 1000) % el.duration : null, fade: m?.fade?.gain.value, gain: m?.master?.gain.value, vol: m?.volume, ctx: m?.ctx?.state, hour: m?.now?.hour }; })()`);
const sounding = (X) => until("the piece sounds", async () => { const s = await state(X); return s.playing && !s.paused && s.at > 0 && s.fade > 0.9 ? s : null; }, 30000);
/** What the music's own output carries for some seconds: the peak, and the level of the loud tenth of 400 ms stretches. */
const level = (X, secs) => X.evaluate(`new Promise((done) => {
  const m = ${M}, a = m.ctx.createAnalyser(); a.fftSize = 2048; m.master.connect(a);
  const buf = new Float32Array(a.fftSize), blocks = []; let peak = 0, bs = 0, bn = 0, t0 = performance.now();
  const t = setInterval(() => { a.getFloatTimeDomainData(buf); for (const v of buf) { peak = Math.max(peak, Math.abs(v)); bs += v * v; bn++; }
    if (performance.now() - t0 >= 400) { blocks.push(Math.sqrt(bs / bn)); bs = 0; bn = 0; t0 = performance.now(); } }, 20);
  setTimeout(() => { clearInterval(t); m.master.disconnect(a); blocks.sort((x, y) => x - y); done({ peak, loud: blocks[Math.floor(blocks.length * 0.9)] }); }, ${secs * 1000});
})`);

const X = await browser("M");
const heard = new Map();
try {
  // nothing chosen yet on this device: silent until the first tap anywhere, which starts it, softly
  const town = `${BASE}/town?townTest=M&townRoom=check&townHour=${HOURS[0]}`;
  await X.goto(town);
  await until("ready", async () => (await status(X)) === "ready", 180000);
  await X.evaluate(`localStorage.removeItem("cashTown:music")`);
  await X.goto("about:blank");
  await X.goto(town);
  await until("ready", async () => (await status(X)) === "ready", 180000);
  await sleep(1500);
  ok("silent before any tap", !(await X.evaluate(`!!${M}?.playing`)));
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: 640, y: 430, button: "left", clickCount: 1 });
  const tapped = await sounding(X);
  ok("the first tap anywhere starts it, at the soft volume it begins with", FILES.includes(tapped.src) && Math.abs(tapped.vol - 0.3) < 1e-9, tapped);
  // the end of the file: the piece begins again by itself
  await X.evaluate(`${M}.el.currentTime = ${M}.el.duration - 1.5`);
  const round = await until("the piece begins again", async () => { const s = await state(X); return s.at < 10 && !s.paused ? s : null; }, 15000);
  ok("at its end the piece begins again", round.playing && round.src === tapped.src, round);

  for (const hour of HOURS) {
    const at = `${String(hour).padStart(2, "0")}:00`;
    await X.goto(`${BASE}/town?townTest=M&townRoom=check&townHour=${hour}`);
    await until("ready", async () => (await status(X)) === "ready", 180000);
    await sleep(1500);
    await X.evaluate(`localStorage.removeItem("cashTown:music")`);
    await X.evaluate(`document.querySelector('button[title="เพลง"], button[title="Music"]').click()`, true);
    await sleep(300);
    await X.evaluate(`document.querySelector('[role=switch]').click()`, true);
    const s = await sounding(X);
    heard.set(hour, s.src);
    ok(`${at} a piece of the town's plays`, FILES.includes(s.src) && s.ctx === "running" && s.hour === hour, s);
    ok(`${at} from where the clock is, not from its top`, Math.abs(s.at - s.clock) < 4 || Math.abs(s.at - s.clock) > s.long - 4, s);
    // (listened to from the same place each time: where the clock is may be the pause at the piece's end)
    await X.evaluate(`${M}.el.currentTime = 40`);
    await sleep(1000);
    const l = await level(X, 8);
    ok(`${at} softly at the volume it starts at, without clipping`, l.peak < 1 && db(l.loud) > -42 && db(l.loud) < -28, { peak: db(l.peak).toFixed(1), loud: db(l.loud).toFixed(1) });
    console.log(`    ${s.src}  loud tenth ${db(l.loud).toFixed(1)} dB  peak ${db(l.peak).toFixed(1)} dB  began at ${s.at.toFixed(0)} of ${s.long.toFixed(0)} s`);

    // the slider
    await X.evaluate(`(() => { const r = document.querySelector('input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, '20'); r.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(500);
    const v = await state(X);
    ok(`${at} the volume follows the slider`, Math.abs(v.vol - 0.2) < 1e-9 && Math.abs(v.gain - Math.pow(0.2, 1.5)) < 0.005, v);

    // off, and on again
    await X.evaluate(`document.querySelector('[role=switch]').click()`, true);
    await sleep(1300);
    const off = await state(X);
    ok(`${at} off stops it`, off.playing === false && off.paused === true, off);
    await X.evaluate(`document.querySelector('[role=switch]').click()`, true);
    const again = await sounding(X);
    ok(`${at} and on brings it back`, again.src === s.src, again);
  }

  // the hours: the same part of the day keeps its piece, another part brings its own (with the pieces there are now)
  const [first, ...rest] = HOURS, other = rest.find((h) => heard.get(h) !== heard.get(first));
  const same = HOURS.find((h) => h !== first && heard.get(h) === heard.get(first)) ?? first;
  if (other === undefined) console.log("  (one piece for all of these hours: nothing to change to)");
  else {
    await X.evaluate(`${M}.setHour(${first})`);
    await until("the first hour's piece", async () => { const s = await state(X); return s.src === heard.get(first) && s.fade > 0.9 && !s.paused; }, 20000);
    await X.evaluate(`${M}.setHour(${same})`);
    await sleep(1200);
    const kept = await state(X);
    ok(`${first}:00 to ${same}:00, the same piece, plays on`, kept.src === heard.get(first) && kept.fade > 0.9 && !kept.paused, kept);
    await X.evaluate(`${M}.setHour(${other})`);
    await sleep(1200);
    const fading = await state(X);
    ok(`to ${other}:00, the old piece fades away first`, fading.src === heard.get(first) && fading.fade < 0.9, fading);
    const next = await until("the next piece", async () => { const s = await state(X); return s.src === heard.get(other) && s.fade > 0.9 && !s.paused && s.at > 0 ? s : null; }, 20000);
    ok(`and its own comes in after it`, next.src === heard.get(other) && next.hour === other, next);
  }

  ok("the choice is kept on the device", /"on":true/.test((await X.evaluate(`localStorage.getItem("cashTown:music")`)) ?? ""));
  ok("no errors on the page", X.logs.length === 0, X.logs.slice(0, 5));
} catch (e) { fail++; console.log("ERR", e.message); } finally { X.close(); console.log(`${pass} passed, ${fail} failed`); setTimeout(() => process.exit(fail ? 1 : 0), 1000); }
