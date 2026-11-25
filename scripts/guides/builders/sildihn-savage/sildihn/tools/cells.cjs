// usage: node cells.cjs img n [x0 x1 y0 y1 in %] -> median colour of the middle of each of n x n cells
const sharp = require("sharp");
(async () => {
  const [f, nA, ...b] = process.argv.slice(2);
  const n = +nA; const [x0, x1, y0, y1] = b.length ? b.map(Number) : [10.9, 88.9, 10.9, 88.9];
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const rows = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const cx0 = (x0 + (x1 - x0) * (c + 0.2) / n) / 100 * W, cx1 = (x0 + (x1 - x0) * (c + 0.8) / n) / 100 * W;
      const cy0 = (y0 + (y1 - y0) * (r + 0.2) / n) / 100 * H, cy1 = (y0 + (y1 - y0) * (r + 0.8) / n) / 100 * H;
      const rs = [], gs = [], bs = [];
      for (let y = Math.round(cy0); y < cy1; y++) for (let x = Math.round(cx0); x < cx1; x++) { const i = (y * W + x) * 3; rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); }
      const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
      row.push([med(rs), med(gs), med(bs)].map((v) => v.toString(16).padStart(2, "0")).join(""));
    }
    rows.push(row.join(" "));
  }
  console.log(f.split(/[\/]/).pop().split("_")[0] + "\n" + rows.join("\n"));
})();
