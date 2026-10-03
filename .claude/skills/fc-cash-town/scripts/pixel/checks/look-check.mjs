// Looks in the town itself, close up: each look standing, sitting on the ground, sitting on a bench and seen from
// behind, on the plaza, photographed; and its eye colour counted on the screen against the same look with other eyes, so eyes
// that take the hair's colour show as a number, not an impression.
//   node checks/look-check.mjs [base] [outDir] <look,look,...>      a look is the 8 characters of Doing.look
// The eyes are counted for green and olive eyes (the two a fur colour once took), or for every look with EYES=1.
// The dev test room only (?townTest), with motion reduced so nothing blows across the picture.
import sharp from "sharp";
import * as L from "../pxlib.mjs";
import { browser, until, sleep, status } from "./cdp.mjs";
const { BENCHES } = await import("../../../../../../lib/town/world.ts");
const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "work/debug";
const CODES = (process.argv[4] ?? "5300d400").split(",");
// lib/town/look.ts EYE_COLORS, by index (the check reads their hues)
const EYE = ["#2f5fb3", "#4a8fe7", "#7fb8f0", "#2fa3a8", "#3fb27f", "#8fbf4a", "#d4a017", "#e8b84a", "#b5652b", "#8b4c2b", "#5a3a2a", "#d8424f", "#e0709a", "#8a5cd8", "#5b3f8c", "#9aa2ae", "#c0c7d4", "#3a3540"];
const hueOf = (hex) => L.hsl(...[1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)))[0];
// a bench that faces the viewer (down-right), to sit on
const BENCH = BENCHES.findIndex((b) => b.x === 28 && b.y === 31);
const T = "window.__cashTown", H = 420;
const X = await browser("L", { width: 900, height: 700 });
await X.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
let id = null;
const open = async (code) => {
  if (code && id) await X.evaluate(`localStorage.setItem("cashTown:look:${id}", "${code}")`);
  await X.goto(`${BASE}/town?townTest=L&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 120000);
  await until("the map's hooks", () => X.evaluate("!!window.__townView?.screenOf"), 20000);
  id ??= (await X.evaluate(`${T}.me()`)).id;
  for (let i = 0; i < 6; i++) await X.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "+" }))`);
};
/** Where I am on the screen once I and the camera have come to rest. */
const settled = async () => {
  let last = null;
  for (let i = 0; i < 60; i++) {
    const p = await X.evaluate(`window.__townView.screenOf(${JSON.stringify(id)})`);
    if (last && Math.abs(p.x - last.x) < 0.3 && Math.abs(p.y - last.y) < 0.3) return p;
    last = p; await sleep(300);
  }
  return last;
};
const shot = async () => {
  const p = await settled();
  const clip = { x: Math.max(0, Math.round(p.x - 150)), y: Math.max(0, Math.round(p.y - 190)), width: 300, height: H, scale: 1 };
  return Buffer.from((await X.send("Page.captureScreenshot", { format: "png", clip })).data, "base64");
};
/** To a corner of the plaza with no bench near, coming down the screen, so the doll faces the viewer. */
const toCorner = async () => { await X.evaluate(`${T}.walkTo(34, 36)`); await sleep(3000); await settled(); await X.evaluate(`${T}.walkTo(35, 37)`); await sleep(1200); };
const count = async (png, want) => {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [h, s, l] = L.hsl(data[i], data[i + 1], data[i + 2]);
    if (s > 0.25 && l > 0.2 && l < 0.85 && Math.min(Math.abs(h - want), 360 - Math.abs(h - want)) <= 14) n++;
  }
  return n;
};
try {
  await open(null);
  for (const code of CODES) {
    await open(code);
    await toCorner();
    const stand = await shot();
    await X.evaluate(`${T}.sitHere()`); await sleep(600);
    const ground = await shot();
    // up the screen a little, so the doll is seen from behind
    await X.evaluate(`${T}.walkTo(33, 35)`); await sleep(2200);
    const back = await shot();
    await X.evaluate(`${T}.sitOn(${BENCH})`); await sleep(2500);
    const bench = await shot();
    const file = `${OUT}/look-${code}.png`;
    await sharp({ create: { width: 1212, height: H, channels: 3, background: "#000" } })
      .composite([stand, ground, back, bench].map((input, i) => ({ input, left: i * 304, top: 0 }))).png().toFile(file);
    // the eyes: the same look with other eyes (red, or blue for red ones), in the same place; what the chosen
    // colour's hue gains over it is the eyes
    const eye = parseInt(code[5], 36), want = hueOf(EYE[eye]);
    if (!process.env.EYES && eye !== 4 && eye !== 5) { console.log(`${code}: ${file}`); continue; }
    const other = code.slice(0, 5) + (eye === 11 ? "0" : "b") + code.slice(6);
    await open(other);
    await toCorner();
    const control = await shot();
    const n = await count(stand, want), base = await count(control, want);
    console.log(`${code}: ${file}; eye colour ${EYE[eye]} (hue ${want.toFixed(0)}): ${n} px, ${base} px with other eyes`);
    if (eye < 15) ok(`${code}: the eyes are the colour chosen`, n - base >= 12, { n, base });
  }
  console.log("errors:", JSON.stringify(X.logs));
  console.log(`${pass} passed, ${fail} failed`);
} catch (e) { console.log("ERR", e.message); } finally { X.close(); process.exit(0); }
