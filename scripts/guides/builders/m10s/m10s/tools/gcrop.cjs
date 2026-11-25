const sharp = require("sharp");
const fs = require("fs");
const [file, out] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(file, "utf8"));
(async () => {
  for (let i = 0; i < jobs.length; i += 2) {
    const comps = []; let y = 0;
    for (const j of jobs.slice(i, i + 2)) {
      let svg = "";
      for (let x = 0; x <= 1100; x += 50) svg += `<line x1="${x}" y1="0" x2="${x}" y2="600" stroke="#0ff" stroke-opacity="${x % 100 ? 0.25 : 0.55}"/>` + (x % 100 ? "" : `<text x="${x + 2}" y="12" font-size="12" fill="#ff0" font-family="Arial">${x}</text>`);
      for (let yy = 0; yy <= 600; yy += 50) svg += `<line x1="0" y1="${yy}" x2="1100" y2="${yy}" stroke="#0ff" stroke-opacity="${yy % 100 ? 0.25 : 0.55}"/>` + (yy % 100 ? "" : `<text x="2" y="${yy - 2}" font-size="12" fill="#ff0" font-family="Arial">${yy}</text>`);
      const b = await sharp(j.src).extract({ left: j.x0, top: j.y0, width: 1100, height: 600 }).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="600">${svg}<text x="900" y="590" font-size="18" fill="#ff0" font-family="Arial">${j.name}</text></svg>`) }]).png().toBuffer();
      comps.push({ input: b, left: 0, top: y }); y += 606;
    }
    await sharp({ create: { width: 1100, height: y, channels: 3, background: "#000" } }).composite(comps).png().toFile(`${out}/g${i / 2 + 1}.png`);
  }
})();
