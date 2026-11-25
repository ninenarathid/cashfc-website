// usage: node grid.cjs out.png img  -> the image scaled to width 880 (aspect kept) with a 5% grid
const sharp = require("sharp");
const path = require("path");
const [out, f] = process.argv.slice(2);
(async () => {
  const m = await sharp(f).metadata();
  const W = 880, H = Math.round(880 * m.height / m.width), L = 18;
  let svg = "";
  for (let p = 0; p <= 100; p += 2.5) {
    const major = p % 10 === 0, mid = p % 5 === 0, vx = p / 100 * W, vy = L + p / 100 * H;
    const op = major ? 0.7 : mid ? 0.35 : 0.15;
    svg += `<line x1="${vx}" y1="${L}" x2="${vx}" y2="${L + H}" stroke="#00ffff" stroke-opacity="${op}"/>`;
    svg += `<line x1="0" y1="${vy}" x2="${W}" y2="${vy}" stroke="#00ffff" stroke-opacity="${op}"/>`;
    if (major) svg += `<text x="${vx + 2}" y="${L + 11}" font-size="11" fill="#ff0" font-family="Arial">${p}</text><text x="2" y="${vy - 2}" font-size="11" fill="#ff0" font-family="Arial">${p}</text>`;
  }
  svg += `<text x="4" y="14" font-size="14" fill="#ffd27a" font-family="Arial">${path.basename(f)}</text>`;
  await sharp({ create: { width: W, height: H + L, channels: 3, background: "#111" } })
    .composite([{ input: await sharp(f).resize(W, H).png().toBuffer(), left: 0, top: L }, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + L}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
