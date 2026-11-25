// Frames every N seconds from a clip, tiled 3 across, for reading a video's
// burned-in subtitles and picking frames.
// usage: node frames-sheet.cjs <clip.mp4> <outdir> <every-s> <offset-s-of-clip-start> [cols]
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const [clip, out, every, offset, colsArg] = process.argv.slice(2);
const FF = path.join("scripts/guides/.work", "ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe");
fs.mkdirSync(out, { recursive: true });
execFileSync(FF, ["-loglevel", "error", "-y", "-i", clip, "-vf", `fps=1/${every},scale=640:-1`, path.join(out, "f%03d.png")]);
const files = fs.readdirSync(out).filter((f) => /^f\d+\.png$/.test(f)).sort();
const cols = Number(colsArg ?? 3), W = 640, H = 360, P = 4, T = 22, per = cols * 4;
(async () => {
  for (let s = 0; s * per < files.length; s++) {
    const chunk = files.slice(s * per, (s + 1) * per);
    const comp = [];
    for (const [i, f] of chunk.entries()) {
      const n = s * per + i;
      const t = Number(offset) + n * Number(every);
      const label = Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="6" y="16" fill="#ffd23f" font-size="15" font-family="Arial">${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}  ${f}</text></svg>`);
      const x = (i % cols) * (W + P), y = Math.floor(i / cols) * (H + T + P);
      comp.push({ input: label, left: x, top: y });
      comp.push({ input: await sharp(path.join(out, f)).resize(W, H, { fit: "contain" }).toBuffer(), left: x, top: y + T });
    }
    const rows = Math.ceil(chunk.length / cols);
    await sharp({ create: { width: cols * (W + P), height: rows * (H + T + P), channels: 3, background: "#222" } })
      .composite(comp).png().toFile(path.join(out, `sheet-${s + 1}.png`));
  }
  console.log(files.length, "frames,", Math.ceil(files.length / per), "sheets");
})();
