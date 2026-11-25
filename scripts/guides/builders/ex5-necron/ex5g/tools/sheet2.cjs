// usage: node sheet2.cjs <video> <start-s> <end-s> <step-s> <outPrefix> [cols=4] [tileW=400]
// seeks each time separately (fast), 6 at a time; tiles 16 per sheet with time labels
const { execFile } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, a, b, st, pre, c, tw] = process.argv.slice(2);
const cols = +(c || 4), W = +(tw || 400), H = Math.round(W * 9 / 16), T = 20, P = 4;
const tmp = path.join(path.dirname(pre), "cache"); fs.mkdirSync(tmp, { recursive: true });
const times = []; for (let t = +a; t <= +b + 1e-9; t += +st) times.push(+t.toFixed(2));
const fileOf = (t) => path.join(tmp, `t${t.toFixed(2)}-${W}.png`);
const run = (t) => new Promise((res, rej) => fs.existsSync(fileOf(t)) ? res() :
  execFile(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", vid, "-frames:v", "1", "-vf", `scale=${W}:${H}`, fileOf(t)], (e) => e ? rej(e) : res()));
(async () => {
  const q = [...times]; await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await run(q.shift()); }));
  const per = cols * 4;
  for (let s = 0; s * per < times.length; s++) {
    const chunk = times.slice(s * per, (s + 1) * per), comp = [];
    for (const [i, t] of chunk.entries()) {
      const lab = `${Math.floor(t / 60)}:${(t % 60).toFixed(st % 1 ? 1 : 0).padStart(2, "0")} (${t}s)`;
      const x = (i % cols) * (W + P), y = Math.floor(i / cols) * (H + T + P);
      comp.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="5" y="15" fill="#ffd23f" font-size="15" font-family="Arial">${lab}</text></svg>`), left: x, top: y });
      comp.push({ input: fileOf(t), left: x, top: y + T });
    }
    const rows = Math.ceil(chunk.length / cols);
    await sharp({ create: { width: cols * (W + P), height: rows * (H + T + P), channels: 3, background: "#222" } }).composite(comp).png().toFile(`${pre}-${s + 1}.png`);
  }
  console.log(times.length, "frames", Math.ceil(times.length / per), "sheets");
})();
