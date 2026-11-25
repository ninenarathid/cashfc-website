// usage: node vsheet.cjs <video> <out.png> <start-s> <end-s> <every-s> [cols] [w]
// frames from start to end every N seconds, tiled with their times
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, out, a, b, every, colsA, wA] = process.argv.slice(2);
const cols = +(colsA || 4), W = +(wA || 400), H = Math.round(W * 9 / 16), T = 18, P = 3;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vs-"));
const times = []; for (let t = +a; t <= +b; t += +every) times.push(t);
(async () => {
  const comp = [];
  for (const [i, t] of times.entries()) {
    const f = path.join(tmp, `f${i}.png`);
    execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", vid, "-frames:v", "1", "-vf", `scale=${W}:-1`, f]);
    const x = (i % cols) * (W + P), y = Math.floor(i / cols) * (H + T + P);
    const label = Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ffd23f" font-size="13" font-family="Arial">${Math.floor(t / 60)}:${String(Math.round(t % 60 * 10) / 10).padStart(2, "0")} (${t}s)</text></svg>`);
    comp.push({ input: label, left: x, top: y }, { input: f, left: x, top: y + T });
  }
  const rows = Math.ceil(times.length / cols);
  await sharp({ create: { width: cols * (W + P), height: rows * (H + T + P), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(out, times.length);
})();
