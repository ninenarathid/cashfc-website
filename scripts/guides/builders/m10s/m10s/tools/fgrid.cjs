// usage: node fgrid.cjs <video> <outdir> <t1> [t2 ...] -> full-res f-<t>.png + a gridded 960 preview g-<t>.png (labels in full-res px)
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, out, ...ts] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const t of ts) {
    const f = path.join(out, `f-${t}.png`);
    if (!fs.existsSync(f)) execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", vid, "-frames:v", "1", f]);
    let svg = "";
    for (let x = 0; x <= 1920; x += 100) svg += `<line x1="${x / 2}" y1="0" x2="${x / 2}" y2="540" stroke="#0ff" stroke-opacity="${x % 500 ? 0.25 : 0.6}"/><text x="${x / 2 + 2}" y="10" font-size="10" fill="#ff0" font-family="Arial">${x}</text>`;
    for (let y = 0; y <= 1080; y += 100) svg += `<line x1="0" y1="${y / 2}" x2="960" y2="${y / 2}" stroke="#0ff" stroke-opacity="${y % 500 ? 0.25 : 0.6}"/><text x="2" y="${y / 2 - 2}" font-size="10" fill="#ff0" font-family="Arial">${y}</text>`;
    await sharp(f).resize(960, 540).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">${svg}</svg>`) }]).png().toFile(path.join(out, `g-${t}.png`));
    console.log(t);
  }
})();
