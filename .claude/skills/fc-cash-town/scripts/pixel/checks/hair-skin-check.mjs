// Skin left in hair pieces: named hairstyles on their standing doll in a far skin (dark grey) and a pale hair, as
// the town would paint them, and beside each the same with the cells that are close to a skin colour but are not
// skin proper marked magenta.   node checks/hair-skin-check.mjs <race> <hair:view,...> [scale]   (DIR= another folder)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const [race, list, sc] = process.argv.slice(2), S = +(sc ?? 4), SKIN = process.env.SKIN ?? "#3a3d46", HAIR = process.env.HAIR ?? "#d8c9a0";
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel-${race}.json`, "utf8")), { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
const med = (a) => [...a].sort((p, q) => p - q)[a.length >> 1];
const hexHsl = (hex) => L.hsl(...[1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)));
const shift = ([, s, l], [sb, lb], [ht, st, lt]) => L.rgb(ht, Math.max(0, Math.min(1, st * (s / Math.max(0.05, sb)))), Math.max(0.03, Math.min(0.97, lt + (l - lb) * (lt < 0.3 ? 0.6 : 1))));
const hs = j.skin.map((c) => L.hsl(...c)), base = [med(hs.map((h) => h[1])), med(hs.map((h) => h[2]))];
const skinMap = new Map(j.skin.map((c) => [c.join(","), shift(L.hsl(...c), base, hexHsl(SKIN))]));
const near = (r, g, b) => Math.min(...j.skin.map((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b)));
const isHair = ([h, s, l]) => h >= 70 && h <= 170 && s > 0.2 && l > 0.08, TO = hexHsl(HAIR);
const items = list.split(",").map((s) => s.split(":"));
const CW = 110, CH = +(process.env.CH ?? 190), OW = CW * 2 * items.length, out = Buffer.alloc(OW * CH * 4);
const piece = (name, hairKey, mark) => { const [x, y, w, h] = j.frames[name], px = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const si = ((y + r) * W + x + c) * 4; if (!data[si + 3]) { px.push(null); continue; }
    const k = `${data[si]},${data[si + 1]},${data[si + 2]}`, to = skinMap.get(k);
    px.push(to ?? (mark && near(data[si], data[si + 1], data[si + 2]) <= 40 ? [255, 0, 255] : [data[si], data[si + 1], data[si + 2]])); }
  if (hairKey) { const hits = px.map((p, i) => (p && !(p[0] === 255 && p[1] === 0 && p[2] === 255) && isHair(L.hsl(...p)) ? i : -1)).filter((i) => i >= 0);
    if (hits.length) { const sb = med(hits.map((i) => L.hsl(...px[i])[1])), lb = med(hits.map((i) => L.hsl(...px[i])[2])); for (const i of hits) px[i] = shift(L.hsl(...px[i]), [sb, lb], TO); } }
  return { px, w, h }; };
const blit = (name, dx, dy, col, key, mark) => { const [, , , , ox, oy] = j.frames[name], { px, w, h } = piece(name, key, mark);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const p = px[r * w + c]; if (!p) continue;
    const X = col * CW + 55 + dx + ox + c, Y = CH - 5 + dy + oy + r; if (X < col * CW || X >= (col + 1) * CW || Y < 0 || Y >= CH) continue; out.set([...p, 255], (Y * OW + X) * 4); } };
items.forEach(([hair, view], n) => { const g = hair[0], st = j.walk[g][view][1];
  for (const m of [0, 1]) { const col = n * 2 + m;
    blit(st.body, 0, 0, col, !!j.furKey, false);
    blit(view === "back" ? j.face[g].back : j.face[g].round, st.hx, st.hy, col, !!j.furKey, false);
    blit(j.hair[hair][view], st.hx, st.hy, col, true, !!m); } });
const file = `work/debug/hair-skin-${race}.png`;
await L.sharp(out, { raw: { width: OW, height: CH, channels: 4 } }).resize(OW * S, CH * S, { kernel: "nearest" }).flatten({ background: "#7a8a6a" }).png().toFile(file);
console.log(file, items.map((i) => i.join(":")).join(" "));
