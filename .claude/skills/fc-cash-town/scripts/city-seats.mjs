// Every seat of the city (lib/town/city: the map's own 76, the park's benches, the bus stops, the café chairs, the picnic
// mat, the beach chairs, the kitchen's benches), sat on one after another in a real browser on the dev test room, each
// photographed close: the owner, 2026-11-23, "make sure ว่าทุกที่จะนั่งได้ถูกช่อง". Writes one sheet of them all. Muted.
//
//   node city-seats.mjs <base> <outdir>
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, sleep, status, until } from "./cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(path.resolve(HERE, "../../../../package.json"))("sharp");
const [BASE = "http://localhost:3440", OUT = "."] = process.argv.slice(2);
const V = "window.__townView";
const W = 1000, H = 700, CROP = 260;
const X = await browser("city-seats", { width: W, height: H });
const crops = [];
let sat = 0, not = [];
try {
  await X.goto(`${BASE}/town?townTest=S&townRoom=cityseats&townMap=city&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  const seats = await X.evaluate(`${V}.seats()`);
  console.log(`seats: ${seats.length}`);
  for (const s of seats) {
    const st = s.stand ?? { x: s.x, y: s.y + 1 };
    await X.evaluate(`(${V}.warp(${Math.floor(st.x)}, ${Math.floor(st.y)}), ${V}.lookAt(${(s.seat ?? s).x}, ${(s.seat ?? s).y}))`);
    await sleep(700);
    const ok = await X.evaluate(`${V}.sit(${s.i})`);
    await sleep(2300);
    const up = await X.evaluate(`[...document.querySelectorAll("button")].some((e) => /ลุกขึ้น|Stand up/.test(e.innerText))`);
    if (ok && up) sat++; else not.push(s.i);
    const file = path.join(OUT, `seat-${s.i}.png`);
    await X.shot(file);
    crops.push({ file, label: `${s.i}${ok && up ? "" : " ✗"}` });
  }
  await X.evaluate(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))`);
} catch (e) { console.log(`  ${e.message}`); }
finally { await X.close(); }
// one sheet: each shot's middle (the sitter, with the camera on the seat), ten across
const C = 10, cell = 200;
const parts = await Promise.all(crops.map(async (c, n) => {
  const buf = await sharp(c.file).extract({ left: Math.round(W / 2 - CROP / 2), top: Math.round(H / 2 - CROP / 2 - 30), width: CROP, height: CROP }).resize(cell, cell).png().toBuffer();
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="18"><rect width="${cell}" height="18" fill="rgba(0,0,0,0.65)"/><text x="4" y="13" font-size="12" fill="white" font-family="sans-serif">${c.label}</text></svg>`);
  return { input: await sharp(buf).composite([{ input: label, left: 0, top: 0 }]).png().toBuffer(), left: (n % C) * cell, top: Math.floor(n / C) * cell };
}));
await sharp({ create: { width: C * cell, height: Math.ceil(crops.length / C) * cell, channels: 4, background: "#000" } }).composite(parts).png().toFile(path.join(OUT, "seats-sheet.png"));
console.log(`sat on ${sat} of ${crops.length}; not: ${not.join(", ") || "none"}; sheet: ${path.join(OUT, "seats-sheet.png")}`);
