// usage: node frsheet.cjs <frlist.txt> <canddir> <out.png> <from> <to>: per mechanic a row of t-3, t, t+3 frames, labelled
const fs = require("fs"), path = require("path"), sharp = require("sharp");
const [list, dir, out, a, b] = process.argv.slice(2);
const rows = fs.readFileSync(list, "utf8").trim().split("\n").map((l) => l.split(" ")).slice(+a, +b);
const W = 560, H = Math.round(W * 536 / 1280), L = 20;
(async () => {
  const comps = [];
  for (const [r, [n, t]] of rows.entries()) {
    for (const [c, d] of [-3, 0, 3].entries()) {
      const f = path.join(dir, `${+t + d}.jpg`);
      if (!fs.existsSync(f)) continue;
      comps.push({ input: await sharp(f).resize(W, H).toBuffer(), left: c * (W + 4), top: r * (H + L) + L });
      comps.push({ input: Buffer.from(`<svg width="${W}" height="${L}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="15" fill="#ffd23f" font-size="14" font-family="Arial">${n} t=${+t + d}</text></svg>`), left: c * (W + 4), top: r * (H + L) });
    }
  }
  await sharp({ create: { width: 3 * (W + 4), height: rows.length * (H + L), channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
  console.log(out);
})();
