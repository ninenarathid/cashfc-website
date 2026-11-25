// usage: node outpair.cjs out.png a.webp b.webp -> two finished footage pictures side by side at 820 px
const sharp = require("sharp");
const [out, ...fs] = process.argv.slice(2);
(async () => {
  const W = 820, H = 492, comps = [];
  for (const [k, f] of fs.entries()) comps.push({ input: await sharp(f).resize(W, H, { fit: "contain", background: "#222" }).png().toBuffer(), left: k * (W + 8), top: 0 });
  await sharp({ create: { width: fs.length * (W + 8), height: H, channels: 3, background: "#222" } }).composite(comps).png().toFile(out);
})();
