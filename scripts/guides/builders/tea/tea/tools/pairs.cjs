// node pairs.cjs out.png a.png b.png : two gridded frames stacked
const sharp = require("sharp");
const [out, ...f] = process.argv.slice(2);
(async () => {
  const comp = [];
  for (const [i, p] of f.entries()) {
    comp.push({ input: await sharp(p).resize(1280, 720).png().toBuffer(), left: 0, top: i * 740 + 20 });
    comp.push({ input: Buffer.from(`<svg width="1280" height="20"><rect width="100%" height="100%" fill="#000"/><text x="4" y="15" fill="#ff0" font-size="15" font-family="Arial">${p.split("/").pop()}</text></svg>`), left: 0, top: i * 740 });
  }
  await sharp({ create: { width: 1280, height: f.length * 740, channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
})();
