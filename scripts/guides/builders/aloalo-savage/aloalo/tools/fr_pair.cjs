// usage: node fr_pair.cjs out.png nameA nameB -> two standard crops at 0.75 scale with a 50px crop-coordinate grid
const sharp = require("sharp");
const D = "scripts/guides/.work/aloalo/fr";
const [out, ...names] = process.argv.slice(2);
const S = 0.75, W = 825, H = 450, L = 16, P = 8;
(async () => {
  const comps = []; let svg = "";
  for (const [k, n] of names.entries()) {
    const x0 = k * (W + P);
    comps.push({ input: await sharp(`${D}/pick/${n}.png`).extract({ left: 540, top: 205, width: 1100, height: 600 }).resize(W, H).png().toBuffer(), left: x0, top: L });
    for (let p = 50; p < 1100; p += 50) svg += `<line x1="${x0 + p * S}" y1="${L}" x2="${x0 + p * S}" y2="${L + H}" stroke="#0ff" stroke-opacity="${p % 100 ? 0.12 : 0.4}"/>` + (p % 100 ? "" : `<text x="${x0 + p * S + 1}" y="${L + 10}" font-size="9" fill="#ff0">${p}</text>`);
    for (let p = 50; p < 600; p += 50) svg += `<line x1="${x0}" y1="${L + p * S}" x2="${x0 + W}" y2="${L + p * S}" stroke="#0ff" stroke-opacity="${p % 100 ? 0.12 : 0.4}"/>` + (p % 100 ? "" : `<text x="${x0 + 1}" y="${L + p * S - 1}" font-size="9" fill="#ff0">${p}</text>`);
    svg += `<text x="${x0 + 4}" y="12" font-size="12" fill="#ffd27a" font-family="Arial">${n}</text>`;
  }
  const TW = names.length * (W + P), TH = H + L;
  await sharp({ create: { width: TW, height: TH, channels: 3, background: "#222" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out);
  console.log(out);
})();
