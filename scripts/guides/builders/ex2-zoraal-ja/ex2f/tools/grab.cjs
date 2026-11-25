// Full-res frames at given times (seconds, decimals ok) -> <outdir>/g_<t>.png
// usage: node grab.cjs <video> <outdir> <t1> <t2> ...
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [video, out, ...ts] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
for (const t of ts) {
  const f = path.join(out, `g_${t}.png`);
  execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", f]);
  console.log(f);
}
