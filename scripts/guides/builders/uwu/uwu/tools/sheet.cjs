// tile given images (by glob prefix list) into one sheet with names
const sharp = require("sharp"); const fs = require("fs"); const path = require("path");
const [out, cols, tw, ...files] = process.argv.slice(2);
(async () => {
  const W = +tw, C = +cols;
  const tiles = await Promise.all(files.map(async f => { const buf = await sharp(f).resize({ width: W, height: W, fit: "contain", background: "#222" }).png().toBuffer(); return { buf, f: path.basename(f) }; }));
  const th = W + 22, rows = Math.ceil(tiles.length / C), comp = [];
  tiles.forEach((t, i) => { const x = (i % C) * (W + 6), y = Math.floor(i / C) * th;
    comp.push({ input: t.buf, left: x, top: y + 20 });
    comp.push({ input: Buffer.from(`<svg width="${W}" height="20"><text x="2" y="15" font-size="15" fill="#ff0" font-family="sans-serif">${t.f}</text></svg>`), left: x, top: y }); });
  await sharp({ create: { width: C * (W + 6), height: rows * th, channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  console.log(out);
})();
