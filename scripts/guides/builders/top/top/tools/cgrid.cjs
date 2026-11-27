// usage: node cgrid.cjs out.png src.png cx cy [w h] -> the crop with a 50 px grid labelled in crop coords
const sharp = require("sharp");
const [out, src, cx, cy, w = 1100, h = 600] = process.argv.slice(2);
(async () => {
  const W = +w, H = +h;
  const img = await sharp(src).extract({ left: +cx, top: +cy, width: W, height: H }).png().toBuffer();
  let svg = "";
  for (let x = 0; x <= W; x += 50) svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#0ff" stroke-opacity="${x % 100 ? 0.25 : 0.55}"/>` + (x % 100 ? "" : `<text x="${x + 2}" y="12" font-size="12" fill="#ff0" font-family="Arial">${x}</text>`);
  for (let y = 0; y <= H; y += 50) svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#0ff" stroke-opacity="${y % 100 ? 0.25 : 0.55}"/>` + (y % 100 ? "" : `<text x="2" y="${y - 2}" font-size="12" fill="#ff0" font-family="Arial">${y}</text>`);
  await sharp(img).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toFile(out);
  console.log(out);
})();
