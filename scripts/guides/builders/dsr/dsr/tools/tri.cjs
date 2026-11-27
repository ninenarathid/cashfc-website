// Triage sheet: candidate frames side by side with their names. usage: node tri.cjs out.png cols width file...
const sharp = require("sharp"), path = require("path");
const [out, cols, width, ...fs] = process.argv.slice(2);
(async () => {
  const W = +width, H = Math.round(W * 9 / 16) + 18, C = +cols, comp = [];
  for (let i = 0; i < fs.length; i++) {
    const b = await sharp(fs[i]).resize(W, H - 18, { fit: "fill" }).toBuffer();
    const x = (i % C) * (W + 4), y = Math.floor(i / C) * (H + 4);
    comp.push({ input: b, left: x, top: y + 18 });
    comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="18"><text x="2" y="14" font-size="14" fill="#fc0" font-family="Arial">${path.basename(fs[i])}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: C * (W + 4), height: Math.ceil(fs.length / C) * (H + 4), channels: 3, background: "#111" } }).composite(comp).png().toFile(out);
  console.log(fs.length);
})();
