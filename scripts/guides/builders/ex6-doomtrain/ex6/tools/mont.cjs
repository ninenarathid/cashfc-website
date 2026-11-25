// usage: node mont.cjs <outPrefix> <cols> <cellW> <files...>  -> sheets of cols x 3 with labels
const sharp = require("sharp");
const path = require("path");
const [out, cols, cw, ...files] = process.argv.slice(2);
const C = +cols, W = +cw, H = Math.round(W * 0.75), L = 20, rows = 3;
(async () => {
  for (let s = 0; s * C * rows < files.length; s++) {
    const chunk = files.slice(s * C * rows, (s + 1) * C * rows);
    const comps = []; let svg = "";
    for (const [k, f] of chunk.entries()) {
      const x = (k % C) * (W + 6), y = Math.floor(k / C) * (H + L + 6);
      comps.push({ input: await sharp(f).resize(W, H, { fit: "contain", background: "#222" }).png().toBuffer(), left: x, top: y + L });
      svg += `<text x="${x + 4}" y="${y + 15}" font-family="Arial" font-size="15" fill="#ffd27a">${path.basename(f)}</text>`;
    }
    const TW = C * (W + 6), TH = Math.ceil(chunk.length / C) * (H + L + 6);
    await sharp({ create: { width: TW, height: TH, channels: 3, background: "#111" } })
      .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }])
      .png().toFile(`${out}-${s + 1}.png`);
    console.log(`${out}-${s + 1}.png`);
  }
})();
