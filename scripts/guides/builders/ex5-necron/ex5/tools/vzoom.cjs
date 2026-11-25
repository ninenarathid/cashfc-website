// usage: node vzoom.cjs <full.png> x0 y0 w h out.png [W]  : region with a frame-percent grid (1%, labels every 5%)
const sharp = require("sharp");
const [f, x0, y0, w, h, out, ow] = process.argv.slice(2).map((v, i) => (i === 0 || i === 5 ? v : +v));
(async () => {
  const m = await sharp(f).metadata(); const W = +(ow || 900);
  const L = Math.round(x0 / 100 * m.width), T = Math.round(y0 / 100 * m.height), Wd = Math.round(w / 100 * m.width), Hd = Math.round(h / 100 * m.height);
  const H = Math.round(W * Hd / Wd); let svg = "";
  for (let p = Math.ceil(x0); p <= x0 + w; p++) { const x = (p - x0) / w * W, maj = p % 5 === 0; svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#0ff" stroke-opacity="${maj ? 0.6 : 0.15}"/>`; if (maj) svg += `<text x="${x + 2}" y="12" font-size="12" fill="#0ff">${p}</text>`; }
  for (let p = Math.ceil(y0); p <= y0 + h; p++) { const y = (p - y0) / h * H, maj = p % 5 === 0; svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#0ff" stroke-opacity="${maj ? 0.6 : 0.15}"/>`; if (maj) svg += `<text x="2" y="${y - 2}" font-size="12" fill="#0ff">${p}</text>`; }
  await sharp(f).extract({ left: L, top: T, width: Wd, height: Hd }).resize(W, H).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toFile(out);
})();
