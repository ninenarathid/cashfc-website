// node sheet6.cjs <dir> <outprefix> : the footage pictures six to a sheet (2 across, 900 px), for checking blur
const sharp = require("sharp"); const fs = require("fs");
const [dir, out] = process.argv.slice(2);
(async () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
  for (let s = 0; s * 6 < files.length; s++) {
    const chunk = files.slice(s * 6, s * 6 + 6), comp = [];
    for (const [i, f] of chunk.entries()) {
      const buf = await sharp(`${dir}/${f}`).resize(900).png().toBuffer();
      const x = (i % 2) * 906, y = Math.floor(i / 2) * 530;
      comp.push({ input: buf, left: x, top: y + 20 });
      comp.push({ input: Buffer.from(`<svg width="900" height="20"><text x="2" y="15" font-size="15" fill="#ff0" font-family="Arial">${f}</text></svg>`), left: x, top: y });
    }
    await sharp({ create: { width: 1812, height: 1590, channels: 3, background: "#222" } }).composite(comp).png().toFile(`${out}-${s + 1}.png`);
  }
})();
