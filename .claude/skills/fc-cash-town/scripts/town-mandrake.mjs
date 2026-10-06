// The mandrake sprout (the farm's sixth rank, lib/town/gifts), in a real browser on the dev test room: following its
// member, it sings as a plant is picked for what would be the last time, and that plant stays and bears once more:
// one that is picked only once too, after half its hours. The song is seen going up from the plant, a note stays
// over a plant that has its bearing more still to give, and a whole row swept with the sickle is sung to at once.
//
//   node town-mandrake.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes mandrake-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", F = "window.__townFarm", G = "window.__townGame";
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const pumpkins = (X) => X.evaluate(`${T}.purse().bag.reduce((n, s) => n + (s && s.item === "pumpkin" ? s.n : 0), 0)`);
const plantAt = (X, k) => X.evaluate(`${K}.farm()["${k}"]?.plant ?? null`);
const songsUsed = (X) => X.evaluate(`${T}.purse().gifts?.used?.famMandrake?.n ?? 0`);
const ripeRow = (X, x0, y, crops) => X.evaluate(`${JSON.stringify(crops)}.forEach((crop, i) => { if (crop) ${T}.setPlot((${x0} + i) + "," + ${y}, { soil: "tilled", plant: { by: ${T}.id, crop, sown: ${T}.now() - 400 * 3600000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 99999 * 3600000, cured: 0, picked: 0, pickedAt: 0 } }); })`);
const pickHere = async (X) => { await until("the ripe plant is offered to the hand", async () => (await X.evaluate(`${F}.deed()`)) === "pick", 6000); await X.evaluate(`${F}.act()`); };

const X = await browser("Mandrake", { width: 1280, height: 860 });
try {
  const url = `${BASE}/town?townTest=M&townRoom=check&townHour=10&townWeather=cloudy`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  // (the trial's clock is put on to ten in the morning by Bangkok's: its songs are counted to a day, which begins at dawn)
  await X.evaluate(`(() => { const H = 3600000, now = ${T}.now(), hour = (((now + 7 * H) % (24 * H)) + 24 * H) % (24 * H) / H; ${T}.skipHours((10 - hour + 24) % 24); })()`);
  await sleep(400);
  // a bed of mine (the show garden's first, at 148,12), and in it a row of seven ripe pumpkins: a pumpkin is picked once
  await X.evaluate(`(${T}.resize(14), ${T}.setGifts(false), ${T}.setStamina(100), ${T}.showGarden("M"))`);
  await ripeRow(X, 148, 17, Array(7).fill("pumpkin"));
  await warp(X, 148, 17);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);

  // ── with no mandrake: picked once and gone ──
  await pickHere(X);
  await until("the first pumpkin is picked", async () => (await pumpkins(X)) === 2, 6000);
  ok("with no mandrake a pumpkin is picked once and gone, as ever", (await plantAt(X, "148,17")) === null && (await X.evaluate(`${F}.sung().length`)) === 0);

  // ── following: it sings, and the plant stays ──
  await X.evaluate(`${T}.setGifts(["famMandrake"])`);
  const called = await X.evaluate(`${K}.familiarWear("famMandrake")`);
  await warp(X, 149, 17);
  await pickHere(X);
  await until("the second pumpkin is picked", async () => (await pumpkins(X)) === 4, 6000);
  const sung = await plantAt(X, "149,17");
  ok("with the mandrake at heel the plant picked is not gone: it stays, picked once, sung to", called.ok === true && sung?.crop === "pumpkin" && sung.picked === 1 && sung.more === 1, sung);
  ok("…the day's song is counted, and the page says it sang", (await songsUsed(X)) === 1 && (await X.evaluate(`/แมนเดรกร้องเพลง/.test(${F}.note() ?? "")`)), await X.evaluate(`${F}.note()`));
  ok("…its song is seen going up from the plant", (await X.evaluate(`${F}.singing()`)) >= 1);
  await sleep(650);
  await X.shot(`${OUT}/mandrake-song.png`);
  await sleep(2400);
  const seen = await X.evaluate(`${F}.seen("149,17")`);
  ok("the song over, the plant waits a stage back, with a note kept over it; and it is not picked yet", (await X.evaluate(`${F}.singing()`)) === 0 && seen.stage === 4 && seen.ripe === false
    && (await X.evaluate(`${F}.sung().join()`)) === "149,17" && (await X.evaluate(`${F}.deed()`)) === null, seen);
  await X.shot(`${OUT}/mandrake-waits.png`);
  // half a pumpkin's hours on (seventy-two): ripe again, picked the once more, and gone
  await X.evaluate(`${T}.skipHours(72.05)`);
  await until("it is ripe again", async () => (await X.evaluate(`${F}.seen("149,17").ripe`)) === true, 9000);
  await pickHere(X);
  await until("its bearing more is picked", async () => (await pumpkins(X)) === 6, 6000);
  ok("seventy-two hours on it is ripe again, is picked the once more, and then it is gone: a plant is sung to once", (await plantAt(X, "149,17")) === null && (await X.evaluate(`${F}.sung().length`)) === 0);

  // ── the sickle's row with the mandrake at heel: the whole row sung to at once ──
  await X.evaluate(`${T}.setGifts(["famMandrake", "charmSickle"])`);
  await X.evaluate(`${K}.charmsWear(["charmSickle"])`);
  await X.evaluate(`${K}.familiarWear("famMandrake")`);
  await warp(X, 152, 17);
  await until("the rest of the row is offered to the sickle", async () => (await X.evaluate(`${F}.row()?.plots.length`)) === 5, 6000);
  const usedBefore = await songsUsed(X);
  await X.evaluate(`${F}.rowAct()`);
  await until("the sweep is up", async () => (await gameUp(X)) === "sweep", 6000, 30);
  await X.evaluate(`(() => { const tick = () => { const g = ${G}; if (!g || g.kind !== "sweep") return; const s = g.state(); if (s.ended) return; const i = s.over;
    if (i >= 0 && s.cut[i] === null && Math.abs(s.at - (s.places[i] + 0.5)) <= s.bands[i] / 4) g.press(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
  await until("the sweep is over", async () => (await gameUp(X)) === null, 8000, 40);
  await until("the row is picked", async () => (await pumpkins(X)) === 6 + 15, 6000);
  await sleep(700);
  await X.shot(`${OUT}/mandrake-row.png`);
  const rowNow = await X.evaluate(`[150, 151, 152, 153, 154].map((x) => ${K}.farm()[x + ",17"]?.plant ?? null)`);
  ok("five pumpkins swept clean: three each, and every one sung to and still standing", rowNow.every((p) => p?.more === 1 && p.picked === 1) && (await X.evaluate(`${F}.sung().length`)) === 5, rowNow);
  ok("…five songs of the day's seven", (await songsUsed(X)) === (usedBefore === 1 ? 0 : usedBefore) + 5 || (await songsUsed(X)) === 5, { before: usedBefore, now: await songsUsed(X) });
  ok("the page says how many it sang to", await X.evaluate(`/แมนเดรกร้องเพลง 5 ต้น/.test(${F}.note() ?? "")`), await X.evaluate(`${F}.note()`));
  // the familiar itself is told to the room and drawn at its member's heels like any other
  ok("the room is told which familiar follows me", (await X.evaluate(`window.__cashTown?.people?.().find((p) => p.self)?.pet ?? ${T}.purse().gifts.familiar`)) === "famMandrake");
  const threw = (X.logs ?? []).filter((l) => l.startsWith("exception"));
  ok("nothing was thrown on the page", threw.length === 0, threw);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
