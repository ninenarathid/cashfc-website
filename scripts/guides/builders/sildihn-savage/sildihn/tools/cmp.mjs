// usage: node cmp.mjs <data.json> <outdir> [filter] -> local game8 picture beside ours, 3 pairs a row, 4 rows a sheet
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { sceneSvg } = await import("file:///scripts/guides/render.mjs");
const [file, out, filter] = process.argv.slice(2);
const IMG = "scripts/guides/.work/sildihn/dl/img";
const files = readdirSync(IMG);
const fight = JSON.parse(readFileSync(file, "utf8"));
mkdirSync(out, { recursive: true });
const pairs = [];
for (const [i, s] of fight.steps.entries()) {
  if (!s.scene || !s.game8?.[0]) continue;
  const id = s.game8[0].split("/")[3];
  const f = files.find((x) => x.includes("_" + id + "."));
  const tag = f ? f.split("_")[0] : "?";
  if (filter && !new RegExp(filter).test(tag)) continue;
  pairs.push({ i, tag, f: f && `${IMG}/${f}`, scene: s.scene });
}
const C = 300, P = 6, L = 18, cols = 3, rows = 4;
for (let s = 0; s * cols * rows < pairs.length; s++) {
  const chunk = pairs.slice(s * cols * rows, (s + 1) * cols * rows);
  const comps = []; let svg = "";
  for (const [k, p] of chunk.entries()) {
    const x = (k % cols) * (2 * C + 3 * P), y = Math.floor(k / cols) * (C + L + P);
    const g = p.f ? await sharp(p.f).flatten({ background: "#fff" }).resize(C, C, { fit: "contain", background: "#222" }).png().toBuffer() : null;
    const o = await sharp(Buffer.from(sceneSvg(p.scene, fight.defaults).svg)).resize(C, C, { fit: "contain", background: "#222" }).png().toBuffer();
    if (g) comps.push({ input: g, left: x, top: y + L });
    comps.push({ input: o, left: x + C + P, top: y + L });
    svg += `<text x="${x + 2}" y="${y + 14}" font-size="13" fill="#ffd27a" font-family="Arial">${p.tag} · step ${p.i}</text>`;
  }
  const W = cols * (2 * C + 3 * P), H = Math.ceil(chunk.length / cols) * (C + L + P);
  const name = `${out}/cmp-${filter ? filter.replace(/\W/g, "") + "-" : ""}${s + 1}.png`;
  await sharp({ create: { width: W, height: H, channels: 3, background: "#2a2a30" } }).composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(name);
  console.log(name);
}
