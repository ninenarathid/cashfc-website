// node sheet4g.cjs <specdir> <outprefix> : footage pictures 4 to a sheet with a grid in VIDEO pixels (every 50), for placing blur boxes
const sharp = require("sharp"); const fs = require("fs");
const [specdir, out] = process.argv.slice(2);
(async () => {
  const specs = fs.readdirSync(specdir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(fs.readFileSync(`${specdir}/${f}`, "utf8")));
  const TW = 900, k = TW / 853, TH = Math.round(480 * k);
  for (let s = 0; s * 4 < specs.length; s++) {
    const comp = [];
    for (const [i, sp] of specs.slice(s * 4, s * 4 + 4).entries()) {
      const x0 = sp.crop[0];
      let g = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">`;
      for (let vx = Math.ceil(x0 / 50) * 50; vx <= x0 + 853; vx += 50) { const X = (vx - x0) * k; g += `<line x1="${X}" y1="0" x2="${X}" y2="${TH}" stroke="${vx % 100 ? "#f0f" : "#0ff"}" stroke-opacity="0.5"/>`; if (vx % 100 == 0) g += `<text x="${X + 2}" y="11" font-size="11" fill="#0ff" stroke="#000" stroke-width="2" paint-order="stroke">${vx}</text>`; }
      for (let vy = 0; vy <= 480; vy += 50) { const Y = vy * k; g += `<line x1="0" y1="${Y}" x2="${TW}" y2="${Y}" stroke="${vy % 100 ? "#f0f" : "#0ff"}" stroke-opacity="0.5"/>`; if (vy % 100 == 0) g += `<text x="2" y="${Y - 2}" font-size="11" fill="#0ff" stroke="#000" stroke-width="2" paint-order="stroke">${vy}</text>`; }
      g += "</svg>";
      const buf = await sharp(sp.out).resize(TW, TH).composite([{ input: Buffer.from(g) }]).png().toBuffer();
      const x = (i % 2) * (TW + 6), y = Math.floor(i / 2) * (TH + 22);
      comp.push({ input: buf, left: x, top: y + 20 });
      comp.push({ input: Buffer.from(`<svg width="${TW}" height="20"><text x="2" y="15" font-size="15" fill="#ff0" font-family="Arial">${sp.out.split("/").pop()}</text></svg>`), left: x, top: y });
    }
    await sharp({ create: { width: TW * 2 + 6, height: (TH + 22) * 2, channels: 3, background: "#222" } }).composite(comp).png().toFile(`${out}-${s + 1}.png`);
  }
})();
