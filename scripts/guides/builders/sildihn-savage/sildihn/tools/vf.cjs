// usage: node vf.cjs <video> <tag> <outdir> t1 t2 ... -> <outdir>/<tag>-<t>.png (full res) + sheet <outdir>/<tag>-sheet-<first>.png
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [video, tag, out, ...ts] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const files = [];
  for (const t of ts) {
    const f = path.join(out, `${tag}-${t}.png`);
    if (!fs.existsSync(f)) execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", f]);
    files.push([t, f]);
  }
  const W = +(process.env.VW || 420), cols = +(process.env.VC || 4);
  const comps = [];
  let H = 0;
  for (const [i, [t, f]] of files.entries()) {
    const b = await sharp(f).resize(W).png().toBuffer();
    const m = await sharp(b).metadata(); H = m.height;
    const x = (i % cols) * (W + 4), y = Math.floor(i / cols) * (m.height + 24);
    comps.push({ input: Buffer.from(`<svg width="${W}" height="22"><rect width="100%" height="100%" fill="#000"/><text x="6" y="16" fill="#ffd23f" font-size="15" font-family="Arial">${tag} t=${t}</text></svg>`), left: x, top: y });
    comps.push({ input: b, left: x, top: y + 22 });
  }
  const rows = Math.ceil(files.length / cols);
  const sheet = path.join(out, `${tag}-sheet-${ts[0]}.png`);
  await sharp({ create: { width: cols * (W + 4), height: rows * (H + 24), channels: 3, background: "#222" } }).composite(comps).png().toFile(sheet);
  console.log(sheet);
})();
