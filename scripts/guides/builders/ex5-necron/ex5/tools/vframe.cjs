// usage: node vframe.cjs <video> <t-seconds> <outdir> [previewW]  -> full PNG f-<t>.png and grid preview p-<t>.png
const { execFileSync } = require("child_process");
const path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, t, out, pw] = process.argv.slice(2);
const full = path.join(out, `f-${t}.png`);
execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", vid, "-frames:v", "1", full]);
(async () => {
  const W = +(pw || 960), H = Math.round(W * 9 / 16);
  let svg = "";
  for (let p = 0; p <= 100; p += 5) {
    const x = p / 100 * W, y = p / 100 * H, maj = p % 10 === 0;
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#0ff" stroke-opacity="${maj ? 0.5 : 0.2}"/><line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#0ff" stroke-opacity="${maj ? 0.5 : 0.2}"/>`;
    if (maj) svg += `<text x="${x + 2}" y="11" font-size="11" fill="#0ff">${p}</text><text x="2" y="${y - 2}" font-size="11" fill="#0ff">${p}</text>`;
  }
  await sharp(full).resize(W, H).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toFile(path.join(out, `p-${t}.png`));
  console.log(full);
})();
