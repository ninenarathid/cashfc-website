// grid.cjs <out.png> <cols> <files...>: each image at 500x500 with a 5% grid (10% labelled)
const sharp = require("sharp"); const path = require("path");
const [out, cols, ...files] = process.argv.slice(2);
(async () => {
  const S = 500, C = +cols, comp = [];
  let lines = "";
  for (let i = 0; i <= 20; i++) { const p = i * S / 20; const o = i % 2 ? 0.25 : 0.6;
    lines += `<line x1="${p}" y1="0" x2="${p}" y2="${S}" stroke="#0ff" stroke-opacity="${o}" stroke-width="1"/><line x1="0" y1="${p}" x2="${S}" y2="${p}" stroke="#0ff" stroke-opacity="${o}" stroke-width="1"/>`;
    if (i % 2 === 0 && i > 0 && i < 20) lines += `<text x="${p + 2}" y="11" font-size="11" fill="#ff0">${i * 5}</text><text x="2" y="${p - 2}" font-size="11" fill="#ff0">${i * 5}</text>`; }
  const grid = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${lines}</svg>`);
  for (const [i, f] of files.entries()) {
    const img = await sharp(f).resize(S, S, { fit: "fill" }).composite([{ input: grid }]).png().toBuffer();
    const x = (i % C) * (S + 4), y = Math.floor(i / C) * (S + 24);
    comp.push({ input: img, left: x, top: y + 22 });
    comp.push({ input: Buffer.from(`<svg width="${S}" height="20"><text x="2" y="15" font-size="15" fill="#fff" font-family="sans-serif">${path.basename(f)}</text></svg>`), left: x, top: y });
  }
  const rows = Math.ceil(files.length / C);
  await sharp({ create: { width: C * (S + 4), height: rows * (S + 24), channels: 3, background: "#222" } }).composite(comp).png().toFile(out);
  console.log(out);
})();
