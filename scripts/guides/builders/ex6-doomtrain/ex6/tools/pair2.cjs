// usage: node pair2.cjs out a.png b.png -> side by side
const sharp = require("sharp");
const [out, a, b] = process.argv.slice(2);
(async () => {
  const A = await sharp(a).png().toBuffer(), B = b ? await sharp(b).png().toBuffer() : null;
  const ma = await sharp(A).metadata(), mb = B ? await sharp(B).metadata() : { width: 0, height: 0 };
  await sharp({ create: { width: ma.width + mb.width + (B ? 8 : 0), height: Math.max(ma.height, mb.height), channels: 3, background: "#000" } })
    .composite([{ input: A, left: 0, top: 0 }, ...(B ? [{ input: B, left: ma.width + 8, top: 0 }] : [])]).png().toFile(out);
})();
