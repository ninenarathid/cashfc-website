// zoom into a finished picture to check the blur: node zo.cjs <img> x,y,w,h <out> [outW=1400]  (coords in the image's own pixels)
const sharp = require("sharp");
const [f, r, out, ow] = process.argv.slice(2); const [x, y, w, h] = r.split(",").map(Number);
sharp(f).extract({ left: x, top: y, width: w, height: h }).resize(+(ow || 1400)).png().toFile(out).then(() => console.log("ok"));
