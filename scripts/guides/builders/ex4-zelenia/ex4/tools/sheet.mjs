// usage: node sheet.mjs <fight.json> <outdir>: the cheatsheet in TH and EN, plus the panels as the page shows them on a phone
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { cheatsheetPicture } from "file:///scripts/guides/cheatsheet.mjs";
import { sceneSvg } from "file:///scripts/guides/render.mjs";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const [file, out] = process.argv.slice(2);
const fight = JSON.parse(readFileSync(file, "utf8"));
mkdirSync(out, { recursive: true });
for (const lang of ["th", "en"]) {
  const { buf } = await cheatsheetPicture(fight.cheatsheet, fight.defaults, lang);
  await sharp(buf).png().toFile(`${out}/cheatsheet-${lang}.png`);
  await sharp(buf).resize(1100).png().toFile(`${out}/cheatsheet-${lang}-small.png`);
}
// a phone's view of the panel grid: 384 px wide, two columns of ~170 px pictures
const P = 170, G = 10, cols = 2, panels = fight.cheatsheet.panels;
const rows = Math.ceil(panels.length / cols);
const comps = [];
for (const [i, p] of panels.entries()) {
  if (!p.scene) continue;
  const { svg } = sceneSvg({ frame: [1, 1], ...p.scene }, fight.defaults);
  comps.push({ input: await sharp(Buffer.from(svg)).resize(P, P).png().toBuffer(), left: G + (i % cols) * (P + G), top: G + Math.floor(i / cols) * (P + G) });
}
await sharp({ create: { width: G + cols * (P + G), height: G + rows * (P + G), channels: 3, background: "#161c25" } })
  .composite(comps).png().toFile(`${out}/phone-panels.png`);
console.log("ok");
