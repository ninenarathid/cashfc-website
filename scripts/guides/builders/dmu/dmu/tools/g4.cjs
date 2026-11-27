// usage: node g4.cjs <out.png> f1 f2 f3 f4 : 2x2 frames (1280x536) at 0.75 scale with a 50 px grid in frame coords
const sharp = require("sharp"), path = require("path");
const [out, ...fs] = process.argv.slice(2);
const S = 0.75, W = 1280 * S, H = 536 * S, L = 18;
(async () => {
  const comps = []; let svg = "";
  for (const [i, f] of fs.entries()) {
    const x0 = (i % 2) * (W + 6), y0 = Math.floor(i / 2) * (H + L) + L;
    comps.push({ input: await sharp(f).resize(Math.round(W), Math.round(H)).toBuffer(), left: Math.round(x0), top: Math.round(y0) });
    for (let x = 0; x <= 1280; x += 50) svg += `<line x1="${x0 + x * S}" y1="${y0}" x2="${x0 + x * S}" y2="${y0 + H}" stroke="#0ff" stroke-opacity="${x % 100 ? 0.18 : 0.45}"/>` + (x % 100 ? "" : `<text x="${x0 + x * S + 1}" y="${y0 + 9}" font-size="9" fill="#ff0" font-family="Arial">${x}</text>`);
    for (let y = 0; y <= 536; y += 50) svg += `<line x1="${x0}" y1="${y0 + y * S}" x2="${x0 + W}" y2="${y0 + y * S}" stroke="#0ff" stroke-opacity="${y % 100 ? 0.18 : 0.45}"/>` + (y % 100 ? "" : `<text x="${x0 + 1}" y="${y0 + y * S - 1}" font-size="9" fill="#ff0" font-family="Arial">${y}</text>`);
    svg += `<text x="${x0 + 4}" y="${y0 - 4}" font-size="13" fill="#ffd27a" font-family="Arial">${path.basename(f)}</text>`;
  }
  const TW = 2 * W + 6, TH = Math.ceil(fs.length / 2) * (H + L) + L;
  await sharp({ create: { width: Math.round(TW), height: Math.round(TH), channels: 3, background: "#111" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(TW)}" height="${Math.round(TH)}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
