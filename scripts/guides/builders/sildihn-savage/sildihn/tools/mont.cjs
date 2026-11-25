// usage: node mont.cjs out.png cols w img... -> labelled montage
const sharp = require("sharp");
const path = require("path");
const [out, colsA, wA, ...imgs] = process.argv.slice(2);
const cols = +colsA, W = +wA, T = 20, P = 6;
(async () => {
  const items = [];
  for (const f of imgs) { const b = await sharp(f).flatten({background:"#fff"}).resize(W).png().toBuffer(); const m = await sharp(b).metadata(); items.push({ b, h: m.height, f }); }
  const rows = Math.ceil(items.length / cols); const rh = [];
  for (let r = 0; r < rows; r++) rh.push(Math.max(...items.slice(r * cols, r * cols + cols).map((i) => i.h)));
  const comps = []; let y = 0; let svg = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) { const it = items[r * cols + c]; if (!it) continue; const x = c * (W + P);
      comps.push({ input: it.b, left: x, top: y + T }); svg += `<text x="${x + 4}" y="${y + 15}" font-size="15" fill="#ffd27a" font-family="Arial">${path.basename(it.f)}</text>`; }
    y += rh[r] + T + P;
  }
  const TW = cols * (W + P);
  await sharp({ create: { width: TW, height: y, channels: 3, background: "#222" } }).composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${y}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
