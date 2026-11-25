// node thumbsheet.cjs out.png first last  (thumbs/tNNNN.jpg, frame k = time (k-1)*10s)
const sharp = require("sharp");
const [out, a, b] = process.argv.slice(2);
const D = "scripts/guides/.work/m12s2/vid/thumbs/";
(async () => {
  const comps = []; const cols = 6, W = 320, H = 180, T = 18;
  let n = 0;
  for (let k = +a; k <= +b; k++, n++) {
    const f = D + "t" + String(k).padStart(4, "0") + ".jpg";
    const x = (n % cols) * (W + 4), y = Math.floor(n / cols) * (H + T + 4);
    const t = (k - 1) * 10;
    comps.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ffd23f" font-size="14" font-family="Arial">t=${t} (${Math.floor(t/60)}:${String(t%60).padStart(2,"0")})</text></svg>`), left: x, top: y });
    comps.push({ input: await sharp(f).resize(W, H).toBuffer(), left: x, top: y + T });
  }
  const rows = Math.ceil(n / cols);
  await sharp({ create: { width: cols * (W + 4), height: rows * (H + T + 4), channels: 3, background: "#222" } }).composite(comps).jpeg({ quality: 80 }).toFile(out);
  console.log(out);
})();
