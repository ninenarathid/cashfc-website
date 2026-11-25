// usage: node grid4.cjs out.png a b c d -> four 1000x545 frames in a 2x2 grid at half size (500 wide each)
const sharp = require("sharp");
const [out, ...fs] = process.argv.slice(2);
(async () => {
  const comps = [];
  for (const [i, f] of fs.entries()) comps.push({ input: await sharp(f).resize(800).png().toBuffer(), left: (i % 2) * 806, top: Math.floor(i / 2) * 442 });
  await sharp({ create: { width: 1612, height: Math.ceil(fs.length / 2) * 442, channels: 3, background: "#000" } }).composite(comps).png().toFile(out);
})();
