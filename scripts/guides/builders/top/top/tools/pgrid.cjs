// usage: node pgrid.cjs out.jpg cx cy w h src1 [src2] -> crops stacked vertically with a 50 px grid in crop coords, fixed HUD pre-blurred
const sharp = require("sharp");
const [out, cx, cy, w, h, ...srcs] = process.argv.slice(2);
const FIXED = JSON.parse(process.env.FIXED || "[]");
(async () => {
  const W = +w, H = +h; const comps = []; let y0 = 0;
  for (const src of srcs) {
    let img = await sharp(src).extract({ left: +cx, top: +cy, width: W, height: H }).png().toBuffer();
    const bl = [];
    for (const [x, y, bw, bh] of FIXED) {
      const X = Math.max(0, x), Y = Math.max(0, y), BW = Math.min(bw, W - X), BH = Math.min(bh, H - Y);
      bl.push({ input: await sharp(img).extract({ left: X, top: Y, width: BW, height: BH }).resize(Math.max(1, BW >> 3), Math.max(1, BH >> 3)).resize(BW, BH, { kernel: "nearest" }).blur(8).toBuffer(), left: X, top: Y });
    }
    if (bl.length) img = await sharp(img).composite(bl).png().toBuffer();
    let svg = "";
    for (let x = 0; x <= W; x += 50) svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#0ff" stroke-opacity="${x % 100 ? 0.25 : 0.6}"/>` + (x % 100 ? "" : `<text x="${x + 2}" y="14" font-size="14" fill="#ff0" font-family="Arial">${x}</text>`);
    for (let y = 0; y <= H; y += 50) svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#0ff" stroke-opacity="${y % 100 ? 0.25 : 0.6}"/>` + (y % 100 ? "" : `<text x="2" y="${y - 2}" font-size="14" fill="#ff0" font-family="Arial">${y}</text>`);
    svg += `<text x="${W - 150}" y="${H - 8}" font-size="22" fill="#f0f" font-family="Arial">${src.split("/").pop()}</text>`;
    comps.push({ input: await sharp(img).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toBuffer(), left: 0, top: y0 });
    y0 += H + 6;
  }
  await sharp({ create: { width: W, height: y0, channels: 3, background: "#111" } }).composite(comps).jpeg({ quality: 82 }).toFile(out);
  console.log(out);
})();
