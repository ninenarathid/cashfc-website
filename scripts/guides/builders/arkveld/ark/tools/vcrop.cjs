// usage: node vcrop.cjs <full.png> <x0%> <y0%> <w%> <h%> <out.webp|png> [width] [blur=x,y,w,h ...]  (percent of the whole frame)
const sharp = require("sharp");
const [f, x0, y0, w, h, out, ow, ...rest] = process.argv.slice(2);
(async () => {
  const m = await sharp(f).metadata();
  const px = (v, d) => Math.round(+v / 100 * d);
  let base = await sharp(f).png().toBuffer();
  const comps = [];
  for (const b of rest.filter((r) => r.startsWith("blur="))) {
    const [bx, by, bw, bh] = b.slice(5).split(",").map(Number);
    const reg = { left: px(bx, m.width), top: px(by, m.height), width: px(bw, m.width), height: px(bh, m.height) };
    const piece = await sharp(base).extract(reg).blur(12).toBuffer();
    comps.push({ input: piece, left: reg.left, top: reg.top });
  }
  if (comps.length) base = await sharp(base).composite(comps).png().toBuffer();
  const L = px(x0, m.width), T = px(y0, m.height), Wd = px(w, m.width), Hd = px(h, m.height);
  let img = sharp(base).extract({ left: L, top: T, width: Wd, height: Hd }).resize(+(ow || 1000));
  img = out.endsWith(".webp") ? img.webp({ quality: 86 }) : img.png();
  await img.toFile(out);
  console.log(out, Wd, "x", Hd, "ratio", (Wd / Hd).toFixed(2));
})();
