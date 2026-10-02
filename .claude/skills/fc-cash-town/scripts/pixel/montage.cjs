// node montage.cjs out.png a.png b.png ... : stack sheets at half size on a dark ground
const sharp = require("E:/NinenineProject/fcnext/node_modules/sharp");
(async () => {
  const [out, ...ins] = process.argv.slice(2);
  const bufs = await Promise.all(ins.map(n => sharp(n).resize(768, 512).flatten({ background: "#2a2f3a" }).png().toBuffer()));
  await sharp({ create: { width: 768, height: 512 * ins.length, channels: 3, background: "#000" } })
    .composite(bufs.map((b, i) => ({ input: b, top: i * 512, left: 0 }))).png().toFile(out);
})();
