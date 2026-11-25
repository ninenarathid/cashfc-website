// usage: node cgrid.cjs out.png frame.png x y w h  -> the crop with a 50px grid (crop coords)
const sharp = require("sharp");
const [out, f, x, y, w, h] = process.argv.slice(2);
const W = +w, H = +h;
(async () => {
  let svg = "";
  for (let p = 0; p <= W; p += 50) svg += `<line x1="${p}" y1="0" x2="${p}" y2="${H}" stroke="#0ff" stroke-opacity="${p % 100 ? 0.25 : 0.6}"/>` + (p % 100 ? "" : `<text x="${p + 2}" y="12" font-size="12" fill="#ff0" font-family="Arial">${p}</text>`);
  for (let p = 0; p <= H; p += 50) svg += `<line x1="0" y1="${p}" x2="${W}" y2="${p}" stroke="#0ff" stroke-opacity="${p % 100 ? 0.25 : 0.6}"/>` + (p % 100 ? "" : `<text x="2" y="${p - 2}" font-size="12" fill="#ff0" font-family="Arial">${p}</text>`);
  await sharp(f).extract({ left: +x, top: +y, width: W, height: H }).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toFile(out);
  console.log(out);
})();
