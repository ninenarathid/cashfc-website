// Every picture in a folder tiled into one sheet with its file name, for
// looking over a guide's finished footage pictures at once.
// usage: node scripts/guides/tools/contact.cjs <dir> <out.png> [cols=3] [tileWidth=520]
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const [dir, out, c = "3", tw = "520"] = process.argv.slice(2);
if (!dir || !out) { console.error("usage: contact.cjs <dir> <out.png> [cols] [tileWidth]"); process.exit(1); }
(async () => {
  const files = fs.readdirSync(dir).filter((f) => /\.(webp|png|jpg)$/.test(f)).sort();
  const cols = +c, W = +tw;
  const tiles = await Promise.all(files.map(async (f) => {
    const buf = await sharp(path.join(dir, f)).resize({ width: W }).png().toBuffer();
    return { buf, h: (await sharp(buf).metadata()).height, f };
  }));
  const rows = Math.ceil(tiles.length / cols), th = Math.max(...tiles.map((t) => t.h)) + 22;
  const comp = [];
  tiles.forEach((t, i) => {
    const x = (i % cols) * (W + 6), y = Math.floor(i / cols) * th;
    comp.push({ input: t.buf, left: x, top: y + 20 });
    comp.push({ input: Buffer.from(`<svg width="${W}" height="20"><text x="2" y="15" font-size="14" fill="#fff" font-family="sans-serif">${t.f}</text></svg>`), left: x, top: y });
  });
  await sharp({ create: { width: cols * (W + 6), height: rows * th, channels: 3, background: "#222" } })
    .composite(comp).png().toFile(out);
  console.log(files.length, out);
})();
