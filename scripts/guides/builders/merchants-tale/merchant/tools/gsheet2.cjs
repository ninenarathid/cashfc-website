// usage: node gsheet.cjs <out.png> <file...>: frames 620 px wide, 3 a row, a 10 % grid labelled in full-frame pixels (1920x1080)
const sharp = require("sharp");
const path = require("path");
const [out, ...files] = process.argv.slice(2);
const W = 960, H = 540, L = 18, cols = 2;
(async () => {
  const comps = []; let svg = "";
  for (const [k, f] of files.entries()) {
    const x0 = (k % cols) * (W + 8), y0 = Math.floor(k / cols) * (H + L + 6);
    comps.push({ input: await sharp(f).resize(W, H, { fit: "fill" }).png().toBuffer(), left: x0, top: y0 + L });
    for (let p = 0; p <= 100; p += 5) {
      const vx = x0 + p / 100 * W, vy = y0 + L + p / 100 * H;
      svg += `<line x1="${vx}" y1="${y0 + L}" x2="${vx}" y2="${y0 + L + H}" stroke="#00ffff" stroke-opacity="0.35"/>`;
      svg += `<line x1="${x0}" y1="${vy}" x2="${x0 + W}" y2="${vy}" stroke="#00ffff" stroke-opacity="0.35"/>`;
      if (p < 100 && p % 10 == 0) svg += `<text x="${vx + 2}" y="${y0 + L + 10}" font-size="9" fill="#ff0" font-family="Arial">${p * 19.2}</text><text x="${x0 + 2}" y="${vy + 10}" font-size="9" fill="#ff0" font-family="Arial">${p * 10.8}</text>`;
    }
    svg += `<text x="${x0 + 4}" y="${y0 + 14}" font-size="14" fill="#ffd27a" font-family="Arial">${path.basename(f)}</text>`;
  }
  const rows = Math.ceil(files.length / cols), TW = cols * (W + 8), TH = rows * (H + L + 6);
  await sharp({ create: { width: TW, height: TH, channels: 3, background: "#111" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
