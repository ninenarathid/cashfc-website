// Tiles the given pictures 2 across at full size (525), each with its file name, for reading source diagrams.
// usage: node quad.cjs <out.png> <img...>
const sharp = require("sharp");
const path = require("path");
const [out, ...files] = process.argv.slice(2);
(async () => {
  const W = 525, cols = 2;
  const tiles = await Promise.all(files.map(async (f) => ({ buf: await sharp(f).resize(W, W, { fit: "contain", background: "#222" }).png().toBuffer(), f: path.basename(f) })));
  const rows = Math.ceil(tiles.length / cols), th = W + 22;
  const comp = [];
  tiles.forEach((t, i) => {
    const x = (i % cols) * (W + 6), y = Math.floor(i / cols) * th;
    comp.push({ input: t.buf, left: x, top: y + 22 });
    comp.push({ input: Buffer.from(`<svg width="${W}" height="22"><text x="2" y="16" font-size="15" fill="#ff0" font-family="sans-serif">${t.f}</text></svg>`), left: x, top: y });
  });
  await sharp({ create: { width: cols * (W + 6), height: rows * th, channels: 3, background: "#111" } }).composite(comp).png().toFile(out);
  console.log(out);
})();
