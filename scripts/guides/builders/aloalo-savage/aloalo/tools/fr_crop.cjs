// usage: node fr_crop.cjs out-sheet.png name... -> standard crop (x540 y205 1100x600) of fr/pick/<name>.png, sheet with 100px crop grid
const sharp = require("sharp");
const D = "scripts/guides/.work/aloalo/fr";
const [out, ...names] = process.argv.slice(2);
const CX = +(process.env.CX ?? 540), CY = +(process.env.CY ?? 205), W = 550, H = 300, L = 18, P = 6, cols = 3;
(async () => {
  const comps = []; let svg = "";
  for (const [k, n] of names.entries()) {
    const x0 = (k % cols) * (W + P), y0 = Math.floor(k / cols) * (H + L + P);
    const buf = await sharp(`${D}/pick/${n}.png`).extract({ left: CX, top: CY, width: 1100, height: 600 }).resize(W, H).png().toBuffer();
    comps.push({ input: buf, left: x0, top: y0 + L });
    for (let p = 100; p < 1100; p += 100) svg += `<line x1="${x0 + p / 2}" y1="${y0 + L}" x2="${x0 + p / 2}" y2="${y0 + L + H}" stroke="#0ff" stroke-opacity="${p % 500 ? 0.22 : 0.55}"/>`;
    for (let p = 100; p < 600; p += 100) svg += `<line x1="${x0}" y1="${y0 + L + p / 2}" x2="${x0 + W}" y2="${y0 + L + p / 2}" stroke="#0ff" stroke-opacity="${p % 500 ? 0.22 : 0.55}"/>`;
    svg += `<text x="${x0 + 4}" y="${y0 + 14}" font-size="14" fill="#ffd27a" font-family="Arial">${n}</text>`;
  }
  const rows = Math.ceil(names.length / cols), TW = cols * (W + P), TH = rows * (H + L + P);
  await sharp({ create: { width: TW, height: TH, channels: 3, background: "#222" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
