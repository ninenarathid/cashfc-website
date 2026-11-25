// usage: node bounds.cjs img... -> bounding box of dark arena pixels (lum < 70) in % of width/height
const sharp = require("sharp");
(async () => {
  for (const f of process.argv.slice(2)) {
    const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    const rowc = new Array(H).fill(0), colc = new Array(W).fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3; const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (l < 70) { rowc[y]++; colc[x]++; }
    }
    for (let y = 0; y < H; y++) if (rowc[y] > W * 0.3) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let x = 0; x < W; x++) if (colc[x] > H * 0.3) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    console.log(f.split(/[\/]/).pop(), W, H, "x", x0, x1, "y", y0, y1, "%", (x0 / W * 100).toFixed(2), (x1 / W * 100).toFixed(2), (y0 / H * 100).toFixed(2), (y1 / H * 100).toFixed(2));
  }
})();
