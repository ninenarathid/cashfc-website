// usage: node win.cjs <start-s> <dur-s> <fps> [cols=4] [tileW=480]
// full-res frames of a window from the 1080p AV1 (GPU decode) into full/w<start>/, plus a labelled sheet sheets/w<start>.png
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const S = "scripts/guides/.work";
const FF = S + "/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [a, dur, fps, c, tw] = process.argv.slice(2);
const dir = `${S}/ex5g/full/w${a}`; fs.mkdirSync(dir, { recursive: true });
execFileSync(FF, ["-loglevel", "error", "-y", "-c:v", "av1_cuvid", "-ss", a, "-i", `${S}/vid/ex5-full.mp4`, "-t", dur, "-vf", `fps=${fps}`, `${dir}/f%03d.png`]);
const files = fs.readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).sort();
const cols = +(c || 4), W = +(tw || 480), H = Math.round(W * 9 / 16), T = 20, P = 4;
(async () => {
  const comp = [];
  for (const [i, f] of files.entries()) {
    const t = (+a + i / +fps).toFixed(2);
    const x = (i % cols) * (W + P), y = Math.floor(i / cols) * (H + T + P);
    comp.push({ input: Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="5" y="15" fill="#ffd23f" font-size="15" font-family="Arial">${f}  t=${t}s</text></svg>`), left: x, top: y });
    comp.push({ input: await sharp(path.join(dir, f)).resize(W, H).toBuffer(), left: x, top: y + T });
  }
  const rows = Math.ceil(files.length / cols);
  await sharp({ create: { width: cols * (W + P), height: rows * (H + T + P), channels: 3, background: "#222" } }).composite(comp).png().toFile(`${S}/ex5g/sheets/w${a}.png`);
  console.log(files.length, "frames ->", `sheets/w${a}.png`);
})();
