// usage: node fsheet.cjs out.png img... -> 1920x1080 frames at 640x360, 3 a row, with a 100px grid (labels in source px)
const sharp = require("sharp");
const path = require("path");
const [out, ...imgs] = process.argv.slice(2);
const W = 640, H = 360, L = 18, P = 6, cols = 3;
(async () => {
  const comps = []; let svg = "";
  for (const [k, f] of imgs.entries()) {
    const x0 = (k % cols) * (W + P), y0 = Math.floor(k / cols) * (H + L + P);
    comps.push({ input: await sharp(f).resize(W, H).png().toBuffer(), left: x0, top: y0 + L });
    for (let p = 100; p < 1920; p += 100) { const vx = x0 + p / 3; svg += `<line x1="${vx}" y1="${y0 + L}" x2="${vx}" y2="${y0 + L + H}" stroke="#0ff" stroke-opacity="${p % 500 ? 0.18 : 0.5}"/>`; }
    for (let p = 100; p < 1080; p += 100) { const vy = y0 + L + p / 3; svg += `<line x1="${x0}" y1="${vy}" x2="${x0 + W}" y2="${vy}" stroke="#0ff" stroke-opacity="${p % 500 ? 0.18 : 0.5}"/>`; }
    svg += `<text x="${x0 + 4}" y="${y0 + 14}" font-size="14" fill="#ffd27a" font-family="Arial">${path.basename(f)}</text>`;
  }
  const rows = Math.ceil(imgs.length / cols), TW = cols * (W + P), TH = rows * (H + L + P);
  await sharp({ create: { width: TW, height: TH, channels: 3, background: "#222" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
