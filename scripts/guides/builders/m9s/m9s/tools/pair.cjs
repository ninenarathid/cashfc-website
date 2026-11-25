// usage: node pair.cjs out.png f1 f2 ... -> each frame at 960x540 two per row, labelled
const sharp = require("sharp");
const path = require("path");
const [out, ...fs] = process.argv.slice(2);
const W = 960, H = 540, T = 24;
(async () => {
  const comps = [];
  for (const [i, f] of fs.entries()) {
    const x = (i % 2) * (W + 6), y = Math.floor(i / 2) * (H + T + 6);
    comps.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="6" y="18" fill="#ffd23f" font-size="18" font-family="Arial">${path.basename(f)}</text></svg>`), left: x, top: y });
    comps.push({ input: await sharp(f).resize(W, H).toBuffer(), left: x, top: y + T });
  }
  const rows = Math.ceil(fs.length / 2);
  await sharp({ create: { width: 2 * W + 6, height: rows * (H + T + 6), channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
  console.log(out);
})();
