// usage: node grid.cjs out.png cols W img... -> each image (square-fit) with a 5% grid, tiled `cols` across, for measuring scenes
const sharp = require("sharp");
const path = require("path");
const [out, c, w, ...imgs] = process.argv.slice(2);
const W = +w, cols = +c, L = 18;
(async () => {
  const comps = []; let svg = "";
  const rows = Math.ceil(imgs.length / cols);
  for (const [k, f] of imgs.entries()) {
    const x0 = (k % cols) * (W + 8), y0 = Math.floor(k / cols) * (W + L + 8);
    comps.push({ input: await sharp(f).flatten({ background: "#fff" }).resize(W, W, { fit: "fill" }).png().toBuffer(), left: x0, top: y0 + L });
    for (let p = 0; p <= 100; p += 5) {
      const major = p % 10 === 0, vx = x0 + p / 100 * W, vy = y0 + L + p / 100 * W;
      svg += `<line x1="${vx}" y1="${y0 + L}" x2="${vx}" y2="${y0 + L + W}" stroke="#00ffff" stroke-opacity="${major ? 0.55 : 0.22}"/>`;
      svg += `<line x1="${x0}" y1="${vy}" x2="${x0 + W}" y2="${vy}" stroke="#00ffff" stroke-opacity="${major ? 0.55 : 0.22}"/>`;
      if (major) svg += `<text x="${vx + 2}" y="${y0 + L + 11}" font-size="11" fill="#ff0" font-family="Arial">${p}</text><text x="${x0 + 2}" y="${vy - 2}" font-size="11" fill="#ff0" font-family="Arial">${p}</text>`;
    }
    svg += `<text x="${x0 + 4}" y="${y0 + 14}" font-size="14" fill="#ffd27a" font-family="Arial">${path.basename(path.dirname(f))}/${path.basename(f)}</text>`;
  }
  const TW = cols * (W + 8), TH = rows * (W + L + 8);
  await sharp({ create: { width: TW, height: TH, channels: 3, background: "#111" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
