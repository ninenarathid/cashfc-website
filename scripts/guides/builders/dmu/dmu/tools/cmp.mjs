// usage: node cmp.mjs <scenes.json> <outdir> : scenes.json = [{name, src, scene}] -> <outdir>/<name>.png (source | ours)
import { readFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
const repo = resolve(process.cwd());
const require = createRequire(join(repo, "package.json"));
const sharp = require("sharp");
const { sceneSvg } = await import(join(repo, "scripts/guides/render.mjs"));
const [file, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const items = JSON.parse(readFileSync(file, "utf8"));
const H = 520;
for (const it of items) {
  const { svg } = sceneSvg(it.scene, it.defaults ?? {});
  const ours = await sharp(Buffer.from(svg)).resize({ height: H }).png().toBuffer();
  const src = await sharp(it.src).flatten({ background: "#fff" }).resize({ height: H }).png().toBuffer();
  const a = await sharp(src).metadata(), b = await sharp(ours).metadata();
  await sharp({ create: { width: a.width + b.width + 10, height: H, channels: 3, background: "#222" } })
    .composite([{ input: src, left: 0, top: 0 }, { input: ours, left: a.width + 10, top: 0 }]).png().toFile(join(out, `${it.name}.png`));
  console.log(it.name);
}
