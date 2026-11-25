// usage: node vsheet.cjs <video> <outdir> <start-s> <end-s> <step-s> [cols=4] [w=640]
// Fast-seeks a frame every step seconds, then tiles them with their time.
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, out, a, b, step, colsArg, wArg] = process.argv.slice(2);
const cols = +(colsArg || 4), W = +(wArg || 640), H = Math.round(W * 9 / 16), T = 22, P = 4, per = cols * 4;
fs.mkdirSync(out, { recursive: true });
const times = [];
for (let t = +a; t <= +b; t += +step) times.push(+t.toFixed(2));
(async () => {
  const files = [];
  for (const t of times) {
    const f = path.join(out, `t${String(Math.round(t * 10)).padStart(5, "0")}.jpg`);
    if (!fs.existsSync(f)) execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", vid, "-frames:v", "1", "-vf", `scale=${W}:-1`, "-q:v", "3", f]);
    files.push([t, f]);
  }
  for (let s = 0; s * per < files.length; s++) {
    const chunk = files.slice(s * per, (s + 1) * per), comp = [];
    for (const [i, [t, f]] of chunk.entries()) {
      const x = (i % cols) * (W + P), y = Math.floor(i / cols) * (H + T + P);
      const label = Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="6" y="16" fill="#ffd23f" font-size="16" font-family="Arial">${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}  (${t}s)</text></svg>`);
      comp.push({ input: label, left: x, top: y }, { input: await sharp(f).resize(W, H, { fit: "contain" }).toBuffer(), left: x, top: y + T });
    }
    const rows = Math.ceil(chunk.length / cols);
    const name = path.join(out, `sheet-${String(a).padStart(4, "0")}-${s + 1}.png`);
    await sharp({ create: { width: cols * (W + P), height: rows * (H + T + P), channels: 3, background: "#222" } }).composite(comp).png().toFile(name);
    console.log(name);
  }
})();
