// usage: node cgrid.cjs <full.png> <x> <y> <w> <h> <out.png> -> the crop at full res with a 50px grid in crop coords
const sharp = require("sharp");
const [f, x, y, w, h, out] = process.argv.slice(2).map((v, i) => (i >= 1 && i <= 4 ? +v : v));
(async () => {
  let svg = "";
  for (let i = 0; i <= w; i += 50) svg += `<line x1="${i}" y1="0" x2="${i}" y2="${h}" stroke="#0ff" stroke-opacity="${i % 100 ? 0.18 : 0.45}"/>` + (i % 100 ? "" : `<text x="${i + 2}" y="12" font-size="12" fill="#ff0" font-family="Arial">${i}</text>`);
  for (let j = 0; j <= h; j += 50) svg += `<line x1="0" y1="${j}" x2="${w}" y2="${j}" stroke="#0ff" stroke-opacity="${j % 100 ? 0.18 : 0.45}"/>` + (j % 100 ? "" : `<text x="2" y="${j - 2}" font-size="12" fill="#ff0" font-family="Arial">${j}</text>`);
  await sharp(f).extract({ left: x, top: y, width: w, height: h }).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`) }]).png().toFile(out);
})();
