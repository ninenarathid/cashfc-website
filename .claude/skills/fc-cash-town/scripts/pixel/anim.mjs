// strip.png + frame width -> animated GIF at xS scale on a dark tile; also a frame-diff report
import { createRequire } from "node:module";
const require = createRequire("E:/NinenineProject/fcnext/package.json");
const sharp = require("sharp");
import fs from "node:fs";
const [strip, fw, out, scale = "4", delay = "160"] = process.argv.slice(2);
const meta = await sharp(strip).metadata();
const n = Math.round(meta.width / +fw), S = +scale;
const frames = [];
for (let k = 0; k < n; k++) frames.push(await sharp(strip).extract({ left: k * +fw, top: 0, width: +fw, height: meta.height })
  .resize(+fw * S, meta.height * S, { kernel: "nearest" }).flatten({ background: "#2a2f3a" }).png().toBuffer());
await sharp(frames, { join: { animated: true } }).gif({ delay: Array(n).fill(+delay), loop: 0 }).toFile(out);
console.log("wrote", out, n, "frames");
