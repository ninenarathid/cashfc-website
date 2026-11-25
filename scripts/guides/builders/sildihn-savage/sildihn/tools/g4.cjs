// usage: node g4.cjs out.png img1..img4 -> 2x2 at 440 px with a 5% grid (labels every 10%)
const sharp = require("sharp");
const path = require("path");
const [out, ...imgs] = process.argv.slice(2);
const W = 440, L = 16, P = 6;
(async () => {
  const comps = []; let svg = "";
  const hs = [];
  for (const f of imgs) { const m = await sharp(f).metadata(); hs.push(Math.round(W * m.height / m.width)); }
  const H = Math.max(...hs);
  for (const [k, f] of imgs.entries()) {
    const x0 = (k % 2) * (W + P), y0 = Math.floor(k / 2) * (H + L + P) + L, h = hs[k];
    comps.push({ input: await sharp(f).flatten({ background: "#fff" }).resize(W, h, { fit: "fill" }).png().toBuffer(), left: x0, top: y0 });
    for (let p = 0; p <= 100; p += 5) {
      const major = p % 10 === 0, vx = x0 + p / 100 * W, vy = y0 + p / 100 * h;
      svg += `<line x1="${vx}" y1="${y0}" x2="${vx}" y2="${y0 + h}" stroke="#00ffff" stroke-opacity="${major ? 0.55 : 0.22}"/>`;
      svg += `<line x1="${x0}" y1="${vy}" x2="${x0 + W}" y2="${vy}" stroke="#00ffff" stroke-opacity="${major ? 0.55 : 0.22}"/>`;
      if (major && p > 0 && p < 100) svg += `<text x="${vx + 1}" y="${y0 + 9}" font-size="9" fill="#f0f" font-family="Arial">${p}</text><text x="${x0 + 1}" y="${vy - 1}" font-size="9" fill="#f0f" font-family="Arial">${p}</text>`;
    }
    svg += `<text x="${x0 + 2}" y="${y0 - 3}" font-size="13" fill="#ffd27a" font-family="Arial">${path.basename(f).split("_")[0]}</text>`;
  }
  const rows = Math.ceil(imgs.length / 2), TW = 2 * W + P, TH = rows * (H + L + P);
  await sharp({ create: { width: TW, height: TH, channels: 3, background: "#111" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
