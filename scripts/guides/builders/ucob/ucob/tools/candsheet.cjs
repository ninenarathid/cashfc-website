// The picks' crops side by side, to choose moments. usage: node candsheet.cjs <out.png> name=t ...
const sharp = require("sharp");
const [out, ...items] = process.argv.slice(2);
const D = "scripts/guides/.work/ucob/cand/";
(async () => {
  const cols = 4, TW = 480, TH = 270, comp = [];
  for (const [i, it] of items.entries()) {
    const [n, t] = it.split("=");
    const x = (i % cols) * (TW + 4), y = Math.floor(i / cols) * (TH + 18);
    comp.push({ input: Buffer.from(`<svg width="${TW}" height="18"><rect width="100%" height="100%" fill="#000"/><text x="3" y="14" fill="#ffd23f" font-size="14" font-family="Arial">${n} ${t}</text></svg>`), left: x, top: y });
    comp.push({ input: await sharp(D + `v-${t}.png`).extract({ left: 250, top: 118, width: 1250, height: 703 }).resize(TW, TH).toBuffer(), left: x, top: y + 18 });
  }
  await sharp({ create: { width: cols * (TW + 4), height: Math.ceil(items.length / cols) * (TH + 18), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  console.log(out);
})();
