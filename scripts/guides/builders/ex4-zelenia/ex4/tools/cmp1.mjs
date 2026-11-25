// usage: node cmp1.mjs pairs.json out.png : one pair at its own aspect (game8 | ours | blend), 2x size
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { sceneSvg } from "file:///scripts/guides/render.mjs";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const [file, out] = process.argv.slice(2);
const { defaults, pairs } = JSON.parse(readFileSync(file, "utf8"));
const p = pairs[0];
const m = await sharp(p.img).metadata();
const W = m.width * 1.6, H = Math.round(m.height * 1.6);
const g = await sharp(p.img).flatten({ background: "#ffffff" }).resize(W, H, { fit: "fill" }).png().toBuffer();
const { svg } = sceneSvg(p.scene, defaults);
const o = await sharp(Buffer.from(svg)).resize(W, H, { fit: "fill" }).png().toBuffer();
const b64 = (b) => `data:image/png;base64,${b.toString("base64")}`;
const blend = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><image href="${b64(g)}" width="${W}" height="${H}"/><image href="${b64(o)}" width="${W}" height="${H}" opacity="0.5"/></svg>`)).png().toBuffer();
await sharp({ create: { width: W * 3 + 20, height: H, channels: 3, background: "#2a2a30" } })
  .composite([{ input: g, left: 0, top: 0 }, { input: o, left: W + 10, top: 0 }, { input: blend, left: 2 * W + 20, top: 0 }]).png().toFile(out);
console.log(out);
