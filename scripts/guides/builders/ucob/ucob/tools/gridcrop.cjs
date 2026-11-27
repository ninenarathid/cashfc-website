// The crop of a candidate with a 50 px grid labelled in full-frame coords, for placing blur boxes and marks.
// usage: node gridcrop.cjs <t> <name> [x y w h]
const sharp = require("sharp");
const [t, n, X = 250, Y = 118, Wd = 1250, Ht = 703] = process.argv.slice(2);
const D = "scripts/guides/.work/ucob/cand/";
(async () => {
  const x = +X, y = +Y, w = +Wd, h = +Ht;
  const img = await sharp(D + `v-${t}.png`).extract({ left: x, top: y, width: w, height: h }).toBuffer();
  let s = "";
  for (let gx = Math.ceil(x / 50) * 50; gx <= x + w; gx += 50) {
    const p = gx - x, major = gx % 100 === 0;
    s += `<line x1="${p}" y1="0" x2="${p}" y2="${h}" stroke="${major ? "#ff0" : "#999"}" stroke-width="1" opacity="0.55"/>`;
    if (major) s += `<text x="${p + 2}" y="14" fill="#ff0" font-size="15" font-family="Arial">${gx}</text>`;
  }
  for (let gy = Math.ceil(y / 50) * 50; gy <= y + h; gy += 50) {
    const p = gy - y, major = gy % 100 === 0;
    s += `<line x1="0" y1="${p}" x2="${w}" y2="${p}" stroke="${major ? "#ff0" : "#999"}" stroke-width="1" opacity="0.55"/>`;
    if (major) s += `<text x="2" y="${p - 2}" fill="#ff0" font-size="15" font-family="Arial">${gy}</text>`;
  }
  const marked = await sharp(img).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${s}</svg>`) }]).png().toBuffer();
  await sharp(marked).resize(1000).png().toFile(D + `g-${n}.png`);
})();
