// grid view in CROP coordinates.
// usage: node gv.cjs <spec.json> <out.png> [sub x,y,w,h in crop coords] [outW=1500]
// draws the crop with a grid (lines every 25, labels every 50) and the spec's blur boxes outlined red (numbered)
const fs = require("fs");
const sharp = require("sharp");
const [specF, out, sub, ow] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specF, "utf8"));
const [cx, cy, cw, ch] = spec.crop;
const [sx, sy, sw, sh] = sub && sub !== "-" ? sub.split(",").map(Number) : [0, 0, cw, ch];
const W = +(ow || 1500), k = W / sw, H = Math.round(sh * k);
let svg = "";
const step = sw > 700 ? 50 : sw > 300 ? 25 : 10, lab = step * 2;
for (let x = Math.ceil(sx / step) * step; x <= sx + sw; x += step) { const X = (x - sx) * k, maj = x % lab === 0; svg += `<line x1="${X}" y1="0" x2="${X}" y2="${H}" stroke="#0ff" stroke-opacity="${maj ? 0.6 : 0.22}"/>`; if (maj) svg += `<text x="${X + 2}" y="13" font-size="13" fill="#0ff" stroke="#000" stroke-width="0.5">${x + (spec.labelsFull ? cx : 0)}</text>`; }
for (let y = Math.ceil(sy / step) * step; y <= sy + sh; y += step) { const Y = (y - sy) * k, maj = y % lab === 0; svg += `<line x1="0" y1="${Y}" x2="${W}" y2="${Y}" stroke="#0ff" stroke-opacity="${maj ? 0.6 : 0.22}"/>`; if (maj) svg += `<text x="2" y="${Y - 2}" font-size="13" fill="#0ff" stroke="#000" stroke-width="0.5">${y + (spec.labelsFull ? cy : 0)}</text>`; }
(spec.blur || []).forEach(([x, y, w, h], i) => { svg += `<rect x="${(x - sx) * k}" y="${(y - sy) * k}" width="${w * k}" height="${h * k}" fill="none" stroke="#f00" stroke-width="2"/><text x="${(x - sx) * k + 3}" y="${(y - sy) * k + 14}" font-size="14" fill="#f44" font-weight="bold">${i}</text>`; });
(async () => {
  await sharp(spec.src).extract({ left: cx + sx, top: cy + sy, width: sw, height: sh }).resize(W, H)
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }]).png().toFile(out);
  console.log("ok", out);
})();
