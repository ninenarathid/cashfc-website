// usage: node zoom.cjs out a.webp b.webp -> each picture's lower half (y 45%..100%) at 1.6x, stacked
const sharp = require("sharp");
const [out, ...fs] = process.argv.slice(2);
(async () => {
  const parts = [];
  for (const f of fs) {
    const m = await sharp(f).metadata();
    const top = Math.round(m.height * 0.45);
    parts.push(await sharp(f).extract({ left: 0, top, width: m.width, height: m.height - top }).resize(Math.round(m.width * 1.6)).png().toBuffer());
  }
  const ms = await Promise.all(parts.map((p) => sharp(p).metadata()));
  const W = Math.max(...ms.map((m) => m.width)), H = ms.reduce((a, m) => a + m.height + 6, 0);
  let y = 0; const comp = [];
  for (const [i, p] of parts.entries()) { comp.push({ input: p, left: 0, top: y }); y += ms[i].height + 6; }
  await sharp({ create: { width: W, height: H, channels: 3, background: "#000" } }).composite(comp).png().toFile(out);
})();
