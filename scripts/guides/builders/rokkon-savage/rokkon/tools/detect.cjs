// usage: node detect.cjs img... -> blobs of role badges and pompoms, centroid in % of the picture
const sharp = require("sharp");
const CL = {
  T: (r, g, b) => b - r > 50 && b - g > 35 && b > 85 && r < 80,
  H: (r, g, b) => g - r > 18 && g - b > 18 && g < 100 && r < 70,
  D: (r, g, b) => r - g > 18 && r - b > 18 && r < 125 && g < 62 && r > 55,
  pB: (r, g, b) => b - r > 30 && b - g > 8 && g - r > 20 && b < 170,
  pY: (r, g, b) => r > 110 && g > 100 && b < 85 && Math.abs(r - g) < 25,
  pG: (r, g, b) => g - r > 40 && g - b > 20 && g > 98,
};
(async () => {
  for (const f of process.argv.slice(2)) {
    const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    const out = [];
    for (const [k, fn] of Object.entries(CL)) {
      const m = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (fn(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])) m[i] = 1;
      const seen = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        if (!m[i] || seen[i]) continue;
        let st = [i], sx = 0, sy = 0, n = 0; seen[i] = 1;
        while (st.length) { const j = st.pop(); const x = j % W, y = (j / W) | 0; sx += x; sy += y; n++;
          for (const q of [j - 1, j + 1, j - W, j + W]) if (q >= 0 && q < W * H && m[q] && !seen[q] && Math.abs((q % W) - x) <= 1) { seen[q] = 1; st.push(q); } }
        if (n >= (k.startsWith("p") ? 300 : 60)) out.push(`${k}(${(sx / n / W * 100).toFixed(1)},${(sy / n / H * 100).toFixed(1)})#${n}`);
      }
    }
    console.log(f.split(/[\/]/).pop().split("_")[0], out.join(" "));
  }
})();
