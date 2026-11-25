// usage: node sheetf.cjs <out.png> <cols> <tileW> <file...>   (labelled contact sheet of the given files)
const sharp = require("sharp");
const path = require("path");
const [out, c, tw, ...files] = process.argv.slice(2);
(async () => {
  const cols = +c, W = +tw;
  const tiles = await Promise.all(files.map(async (f) => {
    const buf = await sharp(f).resize({ width: W }).png().toBuffer();
    const m = await sharp(buf).metadata();
    return { buf, h: m.height, f: path.basename(f) };
  }));
  const rows = Math.ceil(tiles.length / cols);
  const th = Math.max(...tiles.map((t) => t.h)) + 22;
  const comp = [];
  tiles.forEach((t, i) => {
    const x = (i % cols) * (W + 6), y = Math.floor(i / cols) * th;
    comp.push({ input: t.buf, left: x, top: y + 20 });
    comp.push({ input: Buffer.from(`<svg width="${W}" height="20"><text x="2" y="15" font-size="14" fill="#fff" font-family="sans-serif">${t.f}</text></svg>`), left: x, top: y });
  });
  await sharp({ create: { width: cols * (W + 6), height: rows * th, channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  console.log(files.length, out);
})();
