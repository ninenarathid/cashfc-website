// node quad.cjs out.png a b c d : four 1280x720 gridded frames at half size in a 2x2 sheet
const sharp = require("sharp");
const [out, ...f] = process.argv.slice(2);
(async () => {
  const comp = [];
  for (const [i, p] of f.entries()) {
    const x = (i % 2) * 966, y = Math.floor(i / 2) * 566;
    comp.push({ input: await sharp(p).resize(960, 540).png().toBuffer(), left: x, top: y + 22 });
    comp.push({ input: Buffer.from(`<svg width="960" height="22"><rect width="100%" height="100%" fill="#000"/><text x="4" y="16" fill="#ff0" font-size="15" font-family="Arial">${p.split("/").pop()}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: 1926, height: 566 * Math.ceil(f.length / 2), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
})();
