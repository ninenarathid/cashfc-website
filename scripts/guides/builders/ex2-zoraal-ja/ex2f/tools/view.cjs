// Downscaled view of a frame (optionally a crop) with a 10% grid, for choosing crops.
// usage: node view.cjs <in.png> <out.png> [left top width height] [outW=1200]
const sharp = require("sharp");
const [inp, out, l, t, w, h, ow] = process.argv.slice(2);
(async () => {
  let img = sharp(inp);
  const meta = await img.metadata();
  let L = 0, T = 0, W = meta.width, H = meta.height;
  if (w) { L = +l; T = +t; W = +w; H = +h; img = img.extract({ left: L, top: T, width: W, height: H }); }
  const OW = +(ow || 1200), OH = Math.round(OW * H / W);
  const buf = await img.resize(OW, OH).toBuffer();
  let lines = "";
  for (let i = 1; i < 10; i++) {
    const x = Math.round(OW * i / 10), y = Math.round(OH * i / 10);
    lines += `<line x1="${x}" y1="0" x2="${x}" y2="${OH}" stroke="#0f0" stroke-opacity="0.35"/><text x="${x + 2}" y="12" fill="#0f0" font-size="11">${Math.round(L + W * i / 10)}</text>`;
    lines += `<line x1="0" y1="${y}" x2="${OW}" y2="${y}" stroke="#0f0" stroke-opacity="0.35"/><text x="2" y="${y - 2}" fill="#0f0" font-size="11">${Math.round(T + H * i / 10)}</text>`;
  }
  await sharp(buf).composite([{ input: Buffer.from(`<svg width="${OW}" height="${OH}">${lines}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out, W, "x", H, "->", OW, "x", OH);
})();
