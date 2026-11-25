// usage: node vthumbs.cjs <video> <outdir> <every-s> [start] [end] [cols] [w] -> one sheet of small frames, labelled m:ss
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [video, out, every, start = 0, end = 99999, colsA = 5, wA = 320] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const tag = path.basename(video).split(".")[0];
(async () => {
  const W = +wA, H = Math.round(W * 9 / 16), T = 18, cols = +colsA;
  const ts = []; for (let t = +start; t <= +end; t += +every) ts.push(t);
  const comps = []; let k = 0;
  for (const t of ts) {
    const f = path.join(out, `${tag}-${t}.jpg`);
    if (!fs.existsSync(f)) { try { execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", `scale=${W}:-1`, "-q:v", "4", "-strict", "unofficial", f]); } catch { break; } }
    if (!fs.existsSync(f)) break;
    const x = (k % cols) * (W + 4), y = Math.floor(k / cols) * (H + T + 4);
    comps.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ffd23f" font-size="14" font-family="Arial">${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} (${t})</text></svg>`), left: x, top: y });
    comps.push({ input: await sharp(f).resize(W, H, { fit: "contain" }).toBuffer(), left: x, top: y + T });
    k++;
  }
  const rows = Math.ceil(k / cols);
  const sheet = path.join(out, `${tag}-s${start}-${end}-e${every}.png`);
  await sharp({ create: { width: cols * (W + 4), height: rows * (H + T + 4), channels: 3, background: "#222" } }).composite(comps).png().toFile(sheet);
  console.log(sheet, k);
})();
