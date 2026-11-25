// usage: node cmp.mjs pairs.json outdir [overlay]
// pairs.json: { defaults, pairs: [{label, img, scene}] } -> side-by-side sheets (game8 | ours | 50% blend), 4 per sheet
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { sceneSvg } from "file:///scripts/guides/render.mjs";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const [file, out] = process.argv.slice(2);
const { defaults, pairs } = JSON.parse(readFileSync(file, "utf8"));
mkdirSync(out, { recursive: true });
const C = 440, P = 8, L = 22;
for (let s = 0; s * 4 < pairs.length; s++) {
  const chunk = pairs.slice(s * 4, s * 4 + 4);
  const comps = []; let svg = "";
  for (const [k, p] of chunk.entries()) {
    const y = P + k * (C + L + P);
    const g = await sharp(p.img).resize(C, C, { fit: "fill" }).png().toBuffer();
    const { svg: sv } = sceneSvg({ frame: [1, 1], ...p.scene }, defaults);
    const o = await sharp(Buffer.from(sv)).resize(C, C).png().toBuffer();
    const b64 = (b) => `data:image/png;base64,${b.toString("base64")}`;
    const blend = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${C}" height="${C}"><image href="${b64(g)}" width="${C}" height="${C}"/><image href="${b64(o)}" width="${C}" height="${C}" opacity="0.5"/></svg>`)).png().toBuffer();
    comps.push({ input: g, left: P, top: y + L }, { input: o, left: 2 * P + C, top: y + L }, { input: blend, left: 3 * P + 2 * C, top: y + L });
    svg += `<text x="${P}" y="${y + 16}" font-family="Arial" font-size="15" fill="#ffd27a">${p.label.replace(/[&<>]/g, "")}</text>`;
  }
  const W = 4 * P + 3 * C, H = P + chunk.length * (C + L + P);
  await sharp({ create: { width: W, height: H, channels: 3, background: "#2a2a30" } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`), left: 0, top: 0 }])
    .png().toFile(`${out}/cmp-${s + 1}.png`);
  console.log(`${out}/cmp-${s + 1}.png`);
}
