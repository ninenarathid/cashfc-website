// usage: node px.cjs img x,y x,y ... -> rgb at each pixel (and 5x5 mean)
const sharp = require("sharp");
(async () => {
  const [f, ...pts] = process.argv.slice(2);
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const p of pts) { const [x, y] = p.split(",").map(Number); const i = (y * info.width + x) * 3; console.log(p, data[i], data[i + 1], data[i + 2]); }
})();
