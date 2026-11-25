// Download game8's pictures listed in imgs.txt to dl/img/NN.<ext> and print their sizes.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const M = path.resolve(__dirname, "..");
const urls = fs.readFileSync(path.join(M, "imgs.txt"), "utf8").split(/\r?\n/).filter(Boolean);
(async () => {
  fs.mkdirSync(path.join(M, "dl/img"), { recursive: true });
  for (const [i, u] of urls.entries()) {
    const n = String(i + 1).padStart(2, "0");
    const out = path.join(M, "dl/img", `${n}.png`);
    if (!fs.existsSync(out)) {
      const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" } });
      const buf = Buffer.from(await r.arrayBuffer());
      await sharp(buf).png().toFile(out);
    }
    const m = await sharp(out).metadata();
    console.log(n, `${m.width}x${m.height}`);
  }
})();
