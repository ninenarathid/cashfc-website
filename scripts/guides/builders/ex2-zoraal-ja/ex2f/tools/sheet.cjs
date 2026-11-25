// Contact sheet from 1-fps thumbnails s0001.jpg (= t 0s) ...
// usage: node sheet.cjs <thumbdir> <out.png> <from-s> <to-s> [step-s=1] [cols=5] [tileW=384]
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const [dir, out, from, to, stepA, colsA, wA] = process.argv.slice(2);
const step = Number(stepA ?? 1), cols = Number(colsA ?? 5), W = Number(wA ?? 384), H = Math.round(W * 9 / 16), T = 18, P = 3;
(async () => {
  const ts = [];
  for (let t = Number(from); t <= Number(to); t += step) {
    const f = path.join(dir, `s${String(t + 1).padStart(4, "0")}.jpg`);
    if (fs.existsSync(f)) ts.push([t, f]);
  }
  const comp = [];
  ts.forEach(([t, f], i) => {
    const x = (i % cols) * (W + P), y = Math.floor(i / cols) * (H + T + P);
    comp.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="5" y="14" fill="#ffd23f" font-size="14" font-family="Arial">${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} (${t}s)</text></svg>`), left: x, top: y });
    comp.push({ file: f, left: x, top: y + T });
  });
  const inputs = [];
  for (const c of comp) inputs.push(c.file ? { input: await sharp(c.file).resize(W, H, { fit: "fill" }).toBuffer(), left: c.left, top: c.top } : c);
  const rows = Math.ceil(ts.length / cols);
  await sharp({ create: { width: cols * (W + P), height: rows * (H + T + P), channels: 3, background: "#222" } })
    .composite(inputs).png().toFile(out);
  console.log(out, ts.length, "tiles");
})();
