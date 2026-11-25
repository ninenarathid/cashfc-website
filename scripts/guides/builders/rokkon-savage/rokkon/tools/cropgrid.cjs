// usage: node cropgrid.cjs out.png "name:file:x,y,w,h" ... -> crops at 0.5 scale with a 100px grid in crop coordinates, 2 per row
const sharp = require("sharp");
const [out, ...items] = process.argv.slice(2);
const S = 0.5, P = 8, T = 18;
(async () => {
  const tiles = [];
  for (const it of items) {
    const [name, file, box] = it.split("|");
    const [x, y, w, h] = box.split(",").map(Number);
    const img = await sharp(file).extract({ left: x, top: y, width: w, height: h }).resize(Math.round(w * S)).png().toBuffer();
    let svg = "";
    for (let gx = 0; gx <= w; gx += 100) svg += `<line x1="${gx * S}" y1="0" x2="${gx * S}" y2="${h * S}" stroke="#0ff" stroke-opacity="0.5"/><text x="${gx * S + 2}" y="10" font-size="10" fill="#ff0" stroke="#000" stroke-width="0.4">${gx}</text>`;
    for (let gy = 0; gy <= h; gy += 100) svg += `<line x1="0" y1="${gy * S}" x2="${w * S}" y2="${gy * S}" stroke="#0ff" stroke-opacity="0.5"/><text x="2" y="${gy * S - 2}" font-size="10" fill="#ff0" stroke="#000" stroke-width="0.4">${gy}</text>`;
    const g = await sharp(img).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * S)}" height="${Math.round(h * S)}">${svg}</svg>`) }]).png().toBuffer();
    tiles.push({ name, g, w: Math.round(w * S), h: Math.round(h * S) });
  }
  const cols = 2, colW = Math.max(...tiles.map((t) => t.w)), rowsH = [];
  for (let r = 0; r * cols < tiles.length; r++) rowsH.push(Math.max(...tiles.slice(r * cols, r * cols + cols).map((t) => t.h)));
  const comps = []; let lab = ""; let y = 0;
  for (let r = 0; r < rowsH.length; r++) {
    for (let c = 0; c < cols; c++) { const t = tiles[r * cols + c]; if (!t) continue; const x = c * (colW + P);
      comps.push({ input: t.g, left: x, top: y + T }); lab += `<text x="${x + 4}" y="${y + 14}" font-size="14" fill="#ffd27a" font-family="Arial">${t.name}</text>`; }
    y += rowsH[r] + T + P;
  }
  const W = cols * (colW + P);
  await sharp({ create: { width: W, height: y, channels: 3, background: "#222" } }).composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}">${lab}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
