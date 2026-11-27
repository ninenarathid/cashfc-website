// Tiles frames 3 across at 1/3 scale with a 50px grid (in full-res pixels) for setting crops and blur boxes.
// usage: node grid9.cjs <out.jpg> <img...>
const sharp = require("sharp"); const path = require("path");
const [out, ...files] = process.argv.slice(2);
(async () => {
  const S = 1 / 3, tiles = [];
  for (const f of files) {
    const m = await sharp(f).metadata();
    const w = Math.round(m.width * S), h = Math.round(m.height * S);
    let g = "";
    for (let x = 0; x <= m.width; x += 100) g += `<line x1="${x * S}" y1="0" x2="${x * S}" y2="${h}" stroke="#0ff" stroke-opacity="${x % 500 ? 0.25 : 0.7}" stroke-width="1"/>` + (x % 200 ? "" : `<text x="${x * S + 2}" y="10" font-size="10" fill="#ff0">${x}</text>`);
    for (let y = 0; y <= m.height; y += 100) g += `<line x1="0" y1="${y * S}" x2="${w}" y2="${y * S}" stroke="#0ff" stroke-opacity="${y % 500 ? 0.25 : 0.7}" stroke-width="1"/>` + (y % 200 ? "" : `<text x="2" y="${y * S + 10}" font-size="10" fill="#ff0">${y}</text>`);
    const buf = await sharp(f).resize(w, h).composite([{ input: Buffer.from(`<svg width="${w}" height="${h}">${g}<text x="${w - 140}" y="${h - 6}" font-size="14" fill="#f0f" font-family="sans-serif">${path.basename(f)}</text></svg>`) }]).png().toBuffer();
    tiles.push({ buf, w, h });
  }
  const cols = 3, W = 645, H = Math.max(...tiles.map((t) => t.h)) + 5;
  await sharp({ create: { width: cols * W, height: Math.ceil(tiles.length / cols) * H, channels: 3, background: "#111" } })
    .composite(tiles.map((t, i) => ({ input: t.buf, left: (i % cols) * W, top: Math.floor(i / cols) * H }))).jpeg({ quality: 82 }).toFile(out);
  console.log(out);
})();
