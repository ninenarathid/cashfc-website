// Low-res frames (t0001.jpg = 0 s, every <step> s) tiled with their time, <per> to a sheet.
// usage: node tsheet.cjs <dir> <outprefix> <step> <from-s> <to-s> [cols=5] [tile=360]
const sharp = require("sharp"); const fs = require("fs"); const path = require("path");
const [dir, out, step, from, to, c = "5", tw = "360"] = process.argv.slice(2);
const cols = +c, W = +tw;
const files = fs.readdirSync(dir).filter((f) => /^t\d+\.jpg$/.test(f)).sort()
  .map((f) => ({ f, t: (parseInt(f.slice(1)) - 1) * +step })).filter((x) => x.t >= +from && x.t <= +to);
(async () => {
  const per = cols * 6;
  for (let s = 0; s * per < files.length; s++) {
    const chunk = files.slice(s * per, s * per + per);
    const tiles = await Promise.all(chunk.map(async (x) => ({ ...x, buf: await sharp(path.join(dir, x.f)).resize(W).png().toBuffer() })));
    const th = Math.round(W * 9 / 16) + 18, rows = Math.ceil(tiles.length / cols);
    const comp = [];
    tiles.forEach((t, i) => {
      const x = (i % cols) * (W + 4), y = Math.floor(i / cols) * th;
      comp.push({ input: t.buf, left: x, top: y + 18 });
      const mm = `${Math.floor(t.t / 60)}:${String(t.t % 60).padStart(2, "0")} (${t.t}s)`;
      comp.push({ input: Buffer.from(`<svg width="${W}" height="18"><text x="2" y="14" font-size="14" fill="#ff0" font-family="sans-serif">${mm}</text></svg>`), left: x, top: y });
    });
    const o = `${out}-${s + 1}.jpg`;
    await sharp({ create: { width: cols * (W + 4), height: rows * th, channels: 3, background: "#111" } }).composite(comp).jpeg({ quality: 80 }).toFile(o);
    console.log(o);
  }
})();
