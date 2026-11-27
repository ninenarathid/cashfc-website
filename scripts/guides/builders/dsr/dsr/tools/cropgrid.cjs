// The default crop of each candidate frame with a 50-px grid (crop coords), 2 across, for writing blur boxes.
// usage: node cropgrid.cjs out.png x,y,w,h img...   (or img@x,y,w,h per image)
const sharp = require("sharp"), path = require("path");
const [out, def, ...imgs] = process.argv.slice(2);
const S = 0.62;
(async () => {
  const tiles = [];
  for (const a of imgs) {
    const [f, c] = a.split("@");
    const [x, y, w, h] = (c || def).split(",").map(Number);
    const W = Math.round(w * S), H = Math.round(h * S);
    let svg = "";
    for (let g = 0; g <= w; g += 50) svg += `<line x1="${g * S}" y1="0" x2="${g * S}" y2="${H}" stroke="#0ff" stroke-opacity="${g % 100 ? 0.25 : 0.6}"/>` + (g % 100 ? "" : `<text x="${g * S + 2}" y="11" font-size="11" fill="#ff0" font-family="Arial">${g}</text>`);
    for (let g = 0; g <= h; g += 50) svg += `<line x1="0" y1="${g * S}" x2="${W}" y2="${g * S}" stroke="#0ff" stroke-opacity="${g % 100 ? 0.25 : 0.6}"/>` + (g % 100 ? "" : `<text x="2" y="${g * S - 2}" font-size="11" fill="#ff0" font-family="Arial">${g}</text>`);
    svg += `<text x="${W - 4}" y="${H - 6}" text-anchor="end" font-size="14" fill="#ff0" font-family="Arial" stroke="#000" stroke-width="3" paint-order="stroke">${path.basename(f)}</text>`;
    const buf = await sharp(f).extract({ left: x, top: y, width: w, height: h }).resize(W, H).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toBuffer();
    tiles.push({ buf, W, H });
  }
  const cols = 2, TW = Math.max(...tiles.map((t) => t.W)), TH = Math.max(...tiles.map((t) => t.H));
  const comp = tiles.map((t, i) => ({ input: t.buf, left: (i % cols) * (TW + 6), top: Math.floor(i / cols) * (TH + 6) }));
  await sharp({ create: { width: cols * (TW + 6), height: Math.ceil(tiles.length / cols) * (TH + 6), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  console.log(out);
})();
