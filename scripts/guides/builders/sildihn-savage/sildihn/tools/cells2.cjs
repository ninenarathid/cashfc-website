// usage: node cells2.cjs out.json spec... where spec = tag:n[:x0:x1:y0:y1] -> robust median colour per cell (icons, white, gold excluded)
const sharp = require("sharp");
const fs = require("fs");
const IMG = "scripts/guides/.work/sildihn/dl/img";
const skip = (r, g, b) => (b - r > 50 && b - g > 35) || (g - r > 18 && g - b > 18 && g < 100 && r < 70) || (r - g > 18 && r - b > 18 && r < 125 && g < 62 && r > 55)
  || (r + g + b) / 3 > 185 || (r > 170 && g > 150 && b < 100) || (r > 150 && g < 90 && b < 90);
(async () => {
  const [out, ...specs] = process.argv.slice(2);
  const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
  for (const sp of specs) {
    const [tag, nA, ...b] = sp.split(":");
    const n = +nA; const [x0, x1, y0, y1] = b.length ? b.map(Number) : [10.9, 88.9, 10.9, 88.9];
    const f = fs.readdirSync(IMG).find((x) => x.startsWith(tag + "_"));
    const { data, info } = await sharp(`${IMG}/${f}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    const m = [];
    for (let r = 0; r < n; r++) { const row = [];
      for (let c = 0; c < n; c++) {
        const ax = (x0 + (x1 - x0) * (c + 0.1) / n) / 100 * W, bx = (x0 + (x1 - x0) * (c + 0.9) / n) / 100 * W;
        const ay = (y0 + (y1 - y0) * (r + 0.1) / n) / 100 * H, by = (y0 + (y1 - y0) * (r + 0.9) / n) / 100 * H;
        const rs = [], gs = [], bs = [];
        for (let y = Math.round(ay); y < by; y++) for (let x = Math.round(ax); x < bx; x++) { const i = (y * W + x) * 3; if (skip(data[i], data[i + 1], data[i + 2])) continue; rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); }
        const med = (a) => a.length ? a.sort((p, q) => p - q)[a.length >> 1] : 48;
        row.push("#" + [med(rs), med(gs), med(bs)].map((v) => v.toString(16).padStart(2, "0")).join(""));
      } m.push(row); }
    res[tag] = { n, box: [x0, x1, y0, y1], m };
    console.log(tag, "\n" + m.map((r) => r.join(" ")).join("\n"));
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 0));
})();
