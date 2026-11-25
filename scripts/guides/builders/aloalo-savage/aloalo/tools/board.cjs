// usage: node board.cjs img... -> dartboard colour per ring and 22.5-degree sector (clockwise from north)
const sharp = require("sharp");
const cls = (r, g, b) => (r > 180 && g > 170 && b < 110 ? "Y" : r > 170 && g < 90 && b < 90 ? "R" : b > 120 && r < 90 ? "B" : r > 200 && g > 100 && g < 170 && b < 90 ? "O" : "?");
(async () => {
  for (const f of process.argv.slice(2)) {
    const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, cx = 0.502 * W, cy = 0.495 * H;
    const out = [];
    for (const rr of [0.40, 0.335, 0.24, 0.17, 0.08]) {
      let s = "";
      for (let k = 0; k < 32; k++) {
        const a = (k * 11.25 + 5.6) * Math.PI / 180;
        const x = Math.round(cx + Math.sin(a) * rr * W), y = Math.round(cy - Math.cos(a) * rr * H);
        const i = (y * W + x) * 3; s += cls(data[i], data[i + 1], data[i + 2]);
      }
      out.push(rr + ":" + s);
    }
    console.log(f.split("_")[0], out.join("  "));
  }
})();
