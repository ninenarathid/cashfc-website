// A scouting sheet: frames s0001.. (one every 3 s) of one video, with their times. usage: node scoutsheet.cjs <dir> <out.png> [from-s] [to-s] [cols=6] [w=320]
const sharp = require("sharp"), fs = require("fs"), path = require("path");
const [dir, out, from = "0", to = "99999", c = "6", w = "320"] = process.argv.slice(2);
(async () => {
  const files = fs.readdirSync(dir).filter((f) => /^s\d+\.jpg$/.test(f)).sort()
    .map((f) => ({ f, t: (parseInt(f.slice(1)) - 1) * 3 })).filter((x) => x.t >= +from && x.t <= +to);
  const cols = +c, W = +w, H = Math.round(W * 9 / 16), T = 16;
  const comp = [];
  for (const [i, x] of files.entries()) {
    const X = (i % cols) * (W + 4), Y = Math.floor(i / cols) * (H + T + 4);
    comp.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="13" fill="#ffd23f" font-size="13" font-family="Arial">${x.t}s</text></svg>`), left: X, top: Y });
    comp.push({ input: await sharp(path.join(dir, x.f)).resize(W, H, { fit: "contain" }).toBuffer(), left: X, top: Y + T });
  }
  const rows = Math.ceil(files.length / cols);
  await sharp({ create: { width: cols * (W + 4), height: rows * (H + T + 4), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  console.log(files.length, out);
})();
