// usage: node stackn.cjs out.png a b ... -> images stacked vertically at 1000 px wide with their names
const sharp = require("sharp");
const path = require("path");
const [out, ...fs] = process.argv.slice(2);
(async () => {
  const comps = []; let y = 0;
  for (const f of fs) {
    const b = await sharp(f).resize(1000).png().toBuffer(); const m = await sharp(b).metadata();
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="22"><rect width="1000" height="22" fill="#000"/><text x="6" y="16" font-size="15" fill="#ffd23f" font-family="Arial">${path.basename(f)}</text></svg>`), left: 0, top: y });
    comps.push({ input: b, left: 0, top: y + 22 }); y += m.height + 28;
  }
  await sharp({ create: { width: 1000, height: y, channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
})();
