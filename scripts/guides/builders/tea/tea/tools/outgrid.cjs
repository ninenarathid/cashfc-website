// node outgrid.cjs <outprefix> name... : finished footage pictures with a grid in OUTPUT pixels (1000 wide), 6 per sheet
const sharp = require("sharp");
const [out, ...names] = process.argv.slice(2);
(async () => {
  for (let s = 0; s * 6 < names.length; s++) {
    const comp = [];
    for (const [i, n] of names.slice(s * 6, s * 6 + 6).entries()) {
      const m = await sharp(`scripts/guides/data/frames/tea/${n}.webp`).metadata(), H = m.height;
      let g = `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${H}">`;
      for (let x = 0; x < 1000; x += 50) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${x % 100 ? "#f0f" : "#0ff"}" stroke-opacity="0.45"/>` + (x % 100 ? "" : `<text x="${x + 2}" y="12" fill="#0ff" font-size="12" stroke="#000" stroke-width="2" paint-order="stroke">${x}</text>`);
      for (let y = 0; y < H; y += 50) g += `<line x1="0" y1="${y}" x2="1000" y2="${y}" stroke="${y % 100 ? "#f0f" : "#0ff"}" stroke-opacity="0.45"/>` + (y % 100 ? "" : `<text x="2" y="${y - 2}" fill="#0ff" font-size="12" stroke="#000" stroke-width="2" paint-order="stroke">${y}</text>`);
      g += "</svg>";
      const buf = await sharp(`scripts/guides/data/frames/tea/${n}.webp`).composite([{ input: Buffer.from(g) }]).png().toBuffer().then((b) => sharp(b).resize(900).png().toBuffer());
      const x = (i % 2) * 906, y = Math.floor(i / 2) * 530;
      comp.push({ input: buf, left: x, top: y + 20 });
      comp.push({ input: Buffer.from(`<svg width="900" height="20"><text x="2" y="15" font-size="15" fill="#ff0" font-family="Arial">${n}</text></svg>`), left: x, top: y });
    }
    await sharp({ create: { width: 1812, height: 1590, channels: 3, background: "#222" } }).composite(comp).png().toFile(`${out}-${s + 1}.png`);
  }
})();
