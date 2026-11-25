// node full.cjs <video> <outdir> t1 t2 ...  -> f-<t>.png full size + g-<t>.png (960 wide, 5% grid)
const { execFileSync } = require("child_process");
const path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, out, ...ts] = process.argv.slice(2);
(async () => { for (const t of ts) {
  const full = path.join(out, `f-${t}.png`);
  for (let k = 0; k < 4; k++) { try { execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", vid, "-frames:v", "1", full]); break; } catch (e) {} }
  const W = 960, H = 540; let svg = "";
  for (let p = 0; p <= 100; p += 5) { const x = p / 100 * W, y = p / 100 * H, maj = p % 10 === 0;
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#0ff" stroke-opacity="${maj ? 0.45 : 0.15}"/><line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#0ff" stroke-opacity="${maj ? 0.45 : 0.15}"/>`;
    if (maj) svg += `<text x="${x + 2}" y="11" font-size="11" fill="#0ff">${p * 19.2}</text><text x="2" y="${y - 2}" font-size="11" fill="#0ff">${p * 10.8}</text>`; }
  await sharp(full).resize(W, H).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toFile(path.join(out, `g-${t}.png`));
  console.log(t);
} })();
