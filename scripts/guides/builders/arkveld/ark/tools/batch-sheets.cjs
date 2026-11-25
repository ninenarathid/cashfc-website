// node batch-sheets.cjs <video> <outdir>  -> one sheet per window below
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const FF = "scripts/guides/.work/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe";
const [vid, out] = process.argv.slice(2);
const W = [["C-dash1", 50, 65, 1], ["C-dash2", 108, 124, 1.5], ["F-tail", 184, 200, 1.5], ["G-stack", 198, 216, 1.5],
  ["H-towers", 222, 276, 2.5], ["I-fury", 318, 340, 2], ["J-chase1", 340, 384, 2.5], ["J-chase2", 385, 425, 2.5],
  ["K-beam1", 431, 470, 2.5], ["K-beam2", 471, 512, 2.5], ["L-exa", 515, 556, 2.5], ["M-stack", 573, 596, 1.5],
  ["N-exa1", 605, 640, 2.5], ["N-exa2", 641, 676, 2.5]];
const only = process.argv[4];
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const [name, a, b, every] of W) {
    if (only && !only.split(",").includes(name)) continue;
    const tmp = path.join(out, "tmp-" + name); fs.mkdirSync(tmp, { recursive: true });
    const times = []; for (let t = a; t <= b + 1e-6; t += every) times.push(Math.round(t * 10) / 10);
    const cols = 4, w = 400, h = 225, T = 18, P = 3, comp = [];
    for (const [i, t] of times.entries()) {
      const f = path.join(tmp, `f${i}.png`);
      let ok = false;
      for (let k = 0; k < 4 && !ok; k++) { try { execFileSync(FF, ["-loglevel", "error", "-y", "-ss", String(t), "-i", vid, "-frames:v", "1", "-vf", `scale=${w}:-1`, f]); ok = true; } catch (e) { console.error("retry", t); } }
      if (!ok) continue;
      const x = (i % cols) * (w + P), y = Math.floor(i / cols) * (h + T + P);
      comp.push({ input: Buffer.from(`<svg width="${w}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ffd23f" font-size="13" font-family="Arial">${Math.floor(t / 60)}:${String((t % 60).toFixed(1)).padStart(4, "0")} (${t}s)</text></svg>`), left: x, top: y }, { input: f, left: x, top: y + T });
    }
    const rows = Math.ceil(times.length / cols);
    await sharp({ create: { width: cols * (w + P), height: rows * (h + T + P), channels: 3, background: "#222" } }).composite(comp).png().toFile(path.join(out, name + ".png"));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(name, times.length);
  }
})();
