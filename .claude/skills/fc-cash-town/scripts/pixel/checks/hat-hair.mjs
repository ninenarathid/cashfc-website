// Every hairstyle under every hat, heads only, as the browser lays them (the hair cut at the hat's brim): for finding
// the hats and hairstyles that do not agree.   node checks/hat-hair.mjs <out.png> [front|back] [f|m]   DIR=<build>
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const OUT = process.argv[2] ?? "work/debug/hat-hair.png", VIEW = process.argv[3] ?? "front", G = process.argv[4] ?? "f";
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel.json`, "utf8"));
const { data } = await L.loadRaw(`${DIR}/${j.image}`);
const W = j.size[0], CW = 64, CH = 76, S = 3;
const hairs = Object.keys(j.hair).filter((h) => h[0] === G && j.hair[h][VIEW]);
const hats = [null, ...Object.keys(j.wear?.hat ?? {})];
const OW = CW * hats.length, OH = CH * hairs.length, out = Buffer.alloc(OW * OH * 4);
const blit = (name, dx, dy, keep = () => true) => {
  const f = j.frames[name]; if (!f) return;
  const [x, y, w, h, ox, oy] = f;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const si = ((y + r) * W + x + c) * 4; if (!data[si + 3] || !keep(ox + c, oy + r)) continue;
    const X = dx + ox + c, Y = dy + oy + r; if (X < 0 || Y < 0 || X >= OW || Y >= OH) continue;
    data.copy(out, (Y * OW + X) * 4, si, si + 4);
  }
};
hairs.forEach((hair, ri) => hats.forEach((hat, ci) => {
  const hx = ci * CW + CW / 2, hy = ri * CH + CH - 14;
  blit(VIEW === "front" ? j.face[G].round : j.face.back, hx, hy);
  const clip = hat ? j.wear.hat[hat]?.clip?.[VIEW] : null;
  const under = clip ? (x, y) => y > clip.ys[Math.min(clip.ys.length - 1, Math.max(0, x - clip.x0))] : () => true;
  blit(j.hair[hair][VIEW], hx, hy, under);
  if (hat) blit(j.wear.hat[hat][VIEW], hx, hy);
}));
await L.sharp(out, { raw: { width: OW, height: OH, channels: 4 } }).resize(OW * S, OH * S, { kernel: "nearest" }).flatten({ background: "#3a4050" }).png().toFile(OUT);
console.log(OUT, hairs.join(" "), "|", hats.slice(1).join(" "));
