// usage: node sheet.cjs <video> <start-s> <end-s> <step-s> <outPrefix> [cols=4] [tileW=480]
// frames from start to end every step, tiled with time labels; 16 per sheet
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, a, b, st, pre, c, tw] = process.argv.slice(2);
const cols = +(c || 4), W = +(tw || 480), H = Math.round(W * 9 / 16), T = 20, P = 4;
const tmp = pre + "_tmp"; fs.mkdirSync(tmp, { recursive: true });
for (const f of fs.readdirSync(tmp)) fs.unlinkSync(path.join(tmp, f));
execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(a), "-t", String(+b - +a), "-i", vid, "-vf", `fps=1/${st},scale=${W}:${H}`, path.join(tmp, "f%04d.png")]);
const files = fs.readdirSync(tmp).sort();
const per = cols * 4;
(async () => {
  for (let s = 0; s * per < files.length; s++) {
    const chunk = files.slice(s * per, (s + 1) * per), comp = [];
    for (const [i, f] of chunk.entries()) {
      const n = s * per + i, t = +a + n * +st;
      const lab = `${Math.floor(t / 60)}:${String((t % 60).toFixed(st % 1 ? 1 : 0)).padStart(2, "0")} (${t}s)`;
      const x = (i % cols) * (W + P), y = Math.floor(i / cols) * (H + T + P);
      comp.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="5" y="15" fill="#ffd23f" font-size="15" font-family="Arial">${lab}</text></svg>`), left: x, top: y });
      comp.push({ input: path.join(tmp, f), left: x, top: y + T });
    }
    const rows = Math.ceil(chunk.length / cols);
    await sharp({ create: { width: cols * (W + P), height: rows * (H + T + P), channels: 3, background: "#222" } }).composite(comp).png().toFile(`${pre}-${s + 1}.png`);
  }
  console.log(files.length, "frames", Math.ceil(files.length / per), "sheets");
})();
