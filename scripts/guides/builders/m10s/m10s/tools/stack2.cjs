// usage: node stack2.cjs out.png a.png b.png -> the two stacked vertically
const sharp = require("sharp");
const [out, ...fs] = process.argv.slice(2);
(async () => {
  const comps = [];
  let y = 0;
  for (const f of fs) { const m = await sharp(f).metadata(); comps.push({ input: f, left: 0, top: y }); y += m.height + 6; }
  await sharp({ create: { width: 960, height: y, channels: 3, background: "#000" } }).composite(comps).png().toFile(out);
})();
