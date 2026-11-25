// grids for every pick: cg/<name>.png (crop with a 50 px grid), and pairs stacked 2 per sheet
const sharp = require("sharp");
const fs = require("fs");
const M = "scripts/guides/.work/m12s2";
const picks = JSON.parse(fs.readFileSync(M + "/tools/picks.json", "utf8"));
const only = process.argv.slice(2);
(async () => {
  for (const [name, [src, x, y, w, h]] of Object.entries(picks)) {
    if (only.length && !only.includes(name)) continue;
    const img = await sharp(`${M}/cand/${src}.png`).extract({ left: x, top: y, width: w, height: h }).png().toBuffer();
    let svg = "";
    for (let gx = 0; gx <= w; gx += 50) svg += `<line x1="${gx}" y1="0" x2="${gx}" y2="${h}" stroke="#0ff" stroke-opacity="${gx % 100 ? 0.3 : 0.7}"/>` + (gx % 100 ? "" : `<text x="${gx + 2}" y="14" font-size="14" fill="#ff0" font-family="Arial">${gx}</text>`);
    for (let gy = 0; gy <= h; gy += 50) svg += `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="#0ff" stroke-opacity="${gy % 100 ? 0.3 : 0.7}"/>` + (gy % 100 ? "" : `<text x="2" y="${gy - 2}" font-size="14" fill="#ff0" font-family="Arial">${gy}</text>`);
    await sharp(img).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`) }]).png().toFile(`${M}/cg/${name}.png`);
  }
  console.log("ok");
})();
