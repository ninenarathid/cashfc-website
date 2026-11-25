// usage: node grid.cjs out.png img1 [img2] -> each image at its own aspect (width 880) with a 5% grid, side by side
const sharp = require("sharp");
const path = require("path");
const [out, ...imgs] = process.argv.slice(2);
const W = +(process.env.GW ?? 880), L = 18;
(async () => {
  const comps = []; let svg = ""; let maxH = 0; const hs = [];
  for (const f of imgs) { const m = await sharp(f).metadata(); hs.push(Math.round(W * m.height / m.width)); }
  maxH = Math.max(...hs);
  for (const [k, f] of imgs.entries()) {
    const x0 = k * (W + 8), H = hs[k];
    comps.push({ input: await sharp(f).flatten({background:"#fff"}).resize(W, H, { fit: "fill" }).png().toBuffer(), left: x0, top: L });
    for (let p = 0; p <= 100; p += 5) {
      const major = p % 10 === 0, vx = x0 + p / 100 * W, vy = L + p / 100 * H;
      svg += `<line x1="${vx}" y1="${L}" x2="${vx}" y2="${L + H}" stroke="#00ffff" stroke-opacity="${major ? 0.6 : 0.25}"/>`;
      svg += `<line x1="${x0}" y1="${vy}" x2="${x0 + W}" y2="${vy}" stroke="#00ffff" stroke-opacity="${major ? 0.6 : 0.25}"/>`;
      if (major) svg += `<text x="${vx + 2}" y="${L + 11}" font-size="11" fill="#ff0" font-family="Arial">${p}</text><text x="${x0 + 2}" y="${vy - 2}" font-size="11" fill="#ff0" font-family="Arial">${p}</text>`;
    }
    svg += `<text x="${x0 + 4}" y="14" font-size="14" fill="#ffd27a" font-family="Arial">${path.basename(f)}</text>`;
  }
  const TW = imgs.length * (W + 8);
  await sharp({ create: { width: TW, height: maxH + L, channels: 3, background: "#111" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${maxH + L}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
