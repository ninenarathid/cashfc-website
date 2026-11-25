// usage: node mont2.cjs out.png cols w file... : tile previews with names
const sharp = require("sharp");
const [out, colsS, wS, ...files] = process.argv.slice(2); const cols = +colsS, W = +wS;
(async () => { const comps = []; let svg = ""; let H = 0; const hs = [];
  for (const f of files) { const m = await sharp(f).metadata(); hs.push(Math.round(W * m.height / m.width)); }
  const RH = Math.max(...hs) + 20;
  for (const [i, f] of files.entries()) { const x = (i % cols) * (W + 6), y = Math.floor(i / cols) * RH;
    comps.push({ input: await sharp(f).resize(W).png().toBuffer(), left: x, top: y + 18 });
    svg += `<text x="${x + 3}" y="${y + 14}" font-family="Arial" font-size="14" fill="#ff0">${f.split(/[\/]/).pop()}</text>`; }
  const TW = cols * (W + 6), TH = Math.ceil(files.length / cols) * RH;
  await sharp({ create: { width: TW, height: TH, channels: 3, background: "#111" } }).composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out); })();
