// usage: node g4.cjs out.png W cols img... -> each image at width W with a 5% grid (10% labelled), tiled
const sharp = require("sharp");
const path = require("path");
const [out, wA, colsA, ...imgs] = process.argv.slice(2);
const W = +wA, cols = +colsA, L = 18, P = 8;
(async () => {
  const items = [];
  for (const f of imgs) { const m = await sharp(f).metadata(); items.push({ f, H: Math.round(W * m.height / m.width) }); }
  const rows = Math.ceil(items.length / cols); const rh = [];
  for (let r = 0; r < rows; r++) rh.push(Math.max(...items.slice(r * cols, r * cols + cols).map((i) => i.H)));
  const comps = []; let svg = ""; let y0 = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const it = items[r * cols + c]; if (!it) continue;
      const x0 = c * (W + P), H = it.H, top = y0 + L;
      comps.push({ input: await sharp(it.f).flatten({ background: "#fff" }).resize(W, H, { fit: "fill" }).png().toBuffer(), left: x0, top });
      for (let p = 0; p <= 100; p += 5) {
        const major = p % 10 === 0, vx = x0 + p / 100 * W, vy = top + p / 100 * H;
        svg += `<line x1="${vx}" y1="${top}" x2="${vx}" y2="${top + H}" stroke="#00ffff" stroke-opacity="${major ? 0.55 : 0.2}"/>`;
        svg += `<line x1="${x0}" y1="${vy}" x2="${x0 + W}" y2="${vy}" stroke="#00ffff" stroke-opacity="${major ? 0.55 : 0.2}"/>`;
        if (major) svg += `<text x="${vx + 2}" y="${top + 11}" font-size="11" fill="#ff0" stroke="#000" stroke-width="0.5" font-family="Arial">${p}</text><text x="${x0 + 2}" y="${vy - 2}" font-size="11" fill="#ff0" stroke="#000" stroke-width="0.5" font-family="Arial">${p}</text>`;
      }
      svg += `<text x="${x0 + 4}" y="${y0 + 14}" font-size="14" fill="#ffd27a" font-family="Arial">${path.basename(it.f)}</text>`;
    }
    y0 += rh[r] + L + P;
  }
  const TW = cols * (W + P);
  await sharp({ create: { width: TW, height: y0, channels: 3, background: "#111" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${y0}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
