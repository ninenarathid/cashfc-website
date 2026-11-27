// Tile a list of source pictures into one sheet with their names (for reading the source diagrams).
// usage: node sheet.cjs <out.png> <cols> <tileW> <file...>
const sharp = require("sharp");
const path = require("path");
const [out, c, tw, ...files] = process.argv.slice(2);
(async () => {
  const cols = +c, W = +tw;
  const tiles = await Promise.all(files.map(async (f) => {
    const buf = await sharp(f).resize({ width: W, height: W, fit: "contain", background: "#222" }).png().toBuffer();
    return { buf, f: path.basename(path.dirname(f)) + "/" + path.basename(f) };
  }));
  const rows = Math.ceil(tiles.length / cols), th = W + 22;
  const comp = [];
  tiles.forEach((t, i) => {
    const x = (i % cols) * (W + 6), y = Math.floor(i / cols) * th;
    comp.push({ input: t.buf, left: x, top: y + 20 });
    comp.push({ input: Buffer.from(`<svg width="${W}" height="20"><text x="2" y="15" font-size="15" fill="#ff0" font-family="sans-serif">${t.f}</text></svg>`), left: x, top: y });
  });
  await sharp({ create: { width: cols * (W + 6), height: rows * th, channels: 3, background: "#111" } }).composite(comp).png().toFile(out);
  console.log(out);
})();
