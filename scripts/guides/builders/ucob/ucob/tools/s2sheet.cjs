// Tiles the 2-second frame series (vid/s2/f0001.jpg = 1640 s) between two times into one sheet.
// usage: node s2sheet.cjs <from-s> <to-s> <out.png>
const sharp = require("sharp"), fs = require("fs");
const [a, b, out] = process.argv.slice(2);
const D = "scripts/guides/.work/ucob/vid/s2/";
(async () => {
  const comp = []; const cols = 5, TW = 400, TH = 225; let i = 0;
  for (let t = +a; t <= +b; t += 2) {
    const f = D + "f" + String((t - 1640) / 2 + 1).padStart(4, "0") + ".jpg";
    if (!fs.existsSync(f)) continue;
    const x = (i % cols) * (TW + 2), y = Math.floor(i / cols) * (TH + 16);
    comp.push({ input: Buffer.from(`<svg width="${TW}" height="16"><rect width="100%" height="100%" fill="#000"/><text x="3" y="12" fill="#ffd23f" font-size="13" font-family="Arial">${t}</text></svg>`), left: x, top: y });
    comp.push({ input: await sharp(f).resize(TW, TH).toBuffer(), left: x, top: y + 16 }); i++;
  }
  await sharp({ create: { width: cols * (TW + 2), height: Math.ceil(i / cols) * (TH + 16), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  console.log(i, out);
})();
