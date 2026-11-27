// Two grid crops per sheet (cand/g-<name>.png -> cand/pair-NN.png). usage: node pairs.cjs name ...
const sharp = require("sharp");
const D = "scripts/guides/.work/ucob/cand/";
const names = process.argv.slice(2);
(async () => {
  for (let i = 0; i < names.length; i += 2) {
    const pair = names.slice(i, i + 2), comp = []; let y = 0, w = 1000;
    for (const n of pair) {
      const buf = await sharp(D + `g-${n}.png`).toBuffer(), m = await sharp(buf).metadata();
      comp.push({ input: Buffer.from(`<svg width="600" height="28"><rect width="100%" height="100%" fill="#000"/><text x="4" y="20" fill="#0f0" font-size="18">${n}</text></svg>`), left: 0, top: y });
      comp.push({ input: buf, left: 0, top: y + 28 }); y += m.height + 28; w = m.width;
    }
    await sharp({ create: { width: w, height: y, channels: 3, background: "#000" } }).composite(comp).png().toFile(D + `pair-${String(i / 2 + 1).padStart(2, "0")}.png`);
  }
  console.log(Math.ceil(names.length / 2));
})();
