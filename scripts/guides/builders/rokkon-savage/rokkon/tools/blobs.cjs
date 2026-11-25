// usage: node blobs.cjs <kind> img... -> blobs of a colour class, centroid + radius in % of width
const sharp = require("sharp");
const K = {
  purple: (r, g, b) => b - g > 25 && r - g > 10 && b > 70,          // clouds (purple) on any floor
  orange: (r, g, b) => r > 200 && g > 120 && g < 200 && b < 90,
  red: (r, g, b) => r > 200 && g < 90 && b < 80,
  blue: (r, g, b) => b > 140 && b - r > 50 && g > 80,
  pink: (r, g, b) => r > 200 && b > 120 && g < 120,
  mag: (r, g, b) => r > 110 && b > 70 && g < 70 && r - g > 70 && b - g > 30,
  cyan: (r, g, b) => b > 200 && g > 150 && r < 100,
};
const [kind, ...files] = process.argv.slice(2);
const min = +(process.env.MIN ?? 120);
(async () => {
  for (const f of files) {
    const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, fn = K[kind];
    const m = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (fn(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])) m[i] = 1;
    const seen = new Uint8Array(W * H), out = [];
    for (let i = 0; i < W * H; i++) {
      if (!m[i] || seen[i]) continue;
      let st = [i], sx = 0, sy = 0, n = 0, x0 = W, x1 = 0; seen[i] = 1;
      while (st.length) { const j = st.pop(); const x = j % W, y = (j / W) | 0; sx += x; sy += y; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        for (const q of [j - 1, j + 1, j - W, j + W]) if (q >= 0 && q < W * H && m[q] && !seen[q] && Math.abs((q % W) - x) <= 1) { seen[q] = 1; st.push(q); } }
      if (n >= min) out.push(`(${(sx / n / W * 100).toFixed(1)},${(sy / n / W * 100).toFixed(1)} r${((x1 - x0) / 2 / W * 100).toFixed(1)})`);
    }
    console.log(f.split(/[\/]/).pop().split("_")[0], out.join(" "));
  }
})();
