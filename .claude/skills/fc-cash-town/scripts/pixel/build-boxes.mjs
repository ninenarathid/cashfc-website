// Generated transparent pairs -> eight small sprites. No new art is drawn here.
// node build-boxes.mjs <source-dir> [public/town]
// Sources: box-10.png, box-20.png, box-30.png, box-40.png; closed left, open right.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { sharp, paletteOf, snap } from "./pxlib.mjs";

const source = process.argv[2];
if (!source) throw new Error("Give the directory holding the four generated box pairs");
const out = process.argv[3] ?? fileURLToPath(new URL("../../../../../public/town/", import.meta.url));
const widths = [51, 58, 64, 70], slots = [10, 20, 30, 40], pieces = [];
for (let t = 0; t < slots.length; t++) {
  const file = path.join(source, `box-${slots[t]}.png`);
  const { width, height } = await sharp(file).metadata();
  for (let opened = 0; opened < 2; opened++) {
    const half = Math.floor(width / 2);
    const { data, info } = await sharp(file).extract({ left: opened * half, top: 0, width: half, height })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = half, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < half; x++) {
      if (data[(y * half + x) * 4 + 3] < 128) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left) throw new Error(`Empty sprite in ${file}`);
    const sprite = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize({ width: widths[t], kernel: "nearest" }).raw().toBuffer({ resolveWithObject: true });
    // Hard pixel edges and the same limited palette for all tiers.
    for (let i = 3; i < sprite.data.length; i += 4) sprite.data[i] = sprite.data[i] >= 128 ? 255 : 0;
    pieces.push({ name: `storebox${slots[t]}${opened ? "Open" : ""}`, GW: sprite.info.width, GH: sprite.info.height, c: sprite.data });
  }
}
const palette = paletteOf(pieces, 64);
pieces.forEach(p => snap(p, palette));
const W = 280, PAD = 4, props = {};
let x = PAD, y = PAD, row = 0;
for (const p of pieces) {
  if (x + p.GW + PAD > W) { x = PAD; y += row + PAD; row = 0; }
  p.x = x; p.y = y;
  props[p.name] = [x, y, p.GW, p.GH, Math.floor(p.GW / 2), p.GH - 1];
  x += p.GW + PAD; row = Math.max(row, p.GH);
}
const H = y + row + PAD, sheet = Buffer.alloc(W * H * 4);
for (const p of pieces) for (let r = 0; r < p.GH; r++) p.c.copy(sheet, ((p.y + r) * W + p.x) * 4, r * p.GW * 4, (r + 1) * p.GW * 4);
const png = await sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10);
const image = `boxes-${hash}.png`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, image), png);
fs.writeFileSync(path.join(out, "boxes.json"), JSON.stringify({ v: 1, image, size: [W, H], props, textures: {} }));
console.log(`${image}: ${W}x${H}, ${png.length} bytes, ${pieces.length} sprites`);
