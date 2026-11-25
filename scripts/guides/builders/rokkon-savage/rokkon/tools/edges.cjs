// usage: node edges.cjs img axis(row|col) pos% [cls] -> runs of "orange-tinted" pixels along a row/column, in %
const sharp = require("sharp");
const [f, axis, posA, cls = "warm"] = process.argv.slice(2);
const C = { warm: (r, g, b) => r - b > 45, red: (r, g, b) => r > 180 && g < 110 && b < 90, blue: (r,g,b)=> b - r > 40 };
(async () => {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, pos = +posA;
  const n = axis === "row" ? W : H; let runs = [], start = -1;
  for (let k = 0; k <= n; k++) {
    let on = false;
    if (k < n) { const x = axis === "row" ? k : Math.round(pos / 100 * W), y = axis === "row" ? Math.round(pos / 100 * H) : k; const i = (y * W + x) * 3; on = C[cls](data[i], data[i + 1], data[i + 2]); }
    if (on && start < 0) start = k; if (!on && start >= 0) { if (k - start > 2) runs.push(`${(start / n * 100).toFixed(1)}-${(k / n * 100).toFixed(1)}`); start = -1; }
  }
  console.log(axis, pos, runs.join("  "));
})();
