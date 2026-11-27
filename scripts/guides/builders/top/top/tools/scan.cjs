// Scan a video straight from its URL (nothing stored but small jpgs): one frame every N s, tiled into sheets with timestamps.
// usage: node scan.cjs <urlfile> <outdir> <every-s> <from-s> <to-s> [cols=4] [w=480]
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { ffmpeg } = require("../../../../tools/paths.cjs");
const [uf, out, every, from, to, c = "4", w = "480"] = process.argv.slice(2);
const url = fs.readFileSync(uf, "utf8").trim();
fs.mkdirSync(out, { recursive: true });
const E = +every, A = +from, B = +to, cols = +c, W = +w;
execFileSync(ffmpeg(), ["-loglevel", "error", "-y", "-ss", String(A), "-to", String(B), "-i", url, "-vf", `fps=1/${E},scale=${W}:-1`, "-q:v", "5", path.join(out, "f%03d.jpg")]);
const files = fs.readdirSync(out).filter((f) => /^f\d+\.jpg$/.test(f)).sort();
(async () => {
  const per = cols * 5;
  for (let s = 0; s * per < files.length; s++) {
    const chunk = files.slice(s * per, (s + 1) * per);
    const comp = [];
    let H = 0;
    for (const [i, f] of chunk.entries()) {
      const buf = await sharp(path.join(out, f)).toBuffer();
      const m = await sharp(buf).metadata(); H = m.height;
      const t = A + (s * per + i) * E;
      const x = (i % cols) * (W + 4), y = Math.floor(i / cols) * (H + 22);
      comp.push({ input: Buffer.from(`<svg width="${W}" height="20"><rect width="100%" height="100%" fill="#000"/><text x="4" y="15" fill="#ffd23f" font-size="15" font-family="Arial">${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")} (${Math.round(t)}s)</text></svg>`), left: x, top: y });
      comp.push({ input: buf, left: x, top: y + 20 });
    }
    const rows = Math.ceil(chunk.length / cols);
    await sharp({ create: { width: cols * (W + 4), height: rows * (H + 22), channels: 3, background: "#222" } }).composite(comp).jpeg({ quality: 80 }).toFile(path.join(out, `sheet-${s + 1}.jpg`));
  }
  for (const f of files) fs.unlinkSync(path.join(out, f));
  console.log(files.length, "frames");
})();
