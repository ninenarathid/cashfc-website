// Every face piece of a race (each gender's six eye shapes and the back of the head), alone, in a skin far from the
// art's own, with what is close to a skin colour but not skin marked magenta, so skin left as drawn in a face
// shows: node checks/face-skins.mjs <race> [skinHex] [scale]   (DIR= another atlas folder; PLAIN=1 no marks)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const [race, skinHex = "#2b2b2b", sc = "5"] = process.argv.slice(2), S = +sc;
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel-${race}.json`, "utf8")), { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
const med = (a) => [...a].sort((p, q) => p - q)[a.length >> 1];
const hexHsl = (hex) => L.hsl(...[1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)));
const shift = ([, s, l], [sb, lb], [ht, st, lt]) => L.rgb(ht, Math.max(0, Math.min(1, st * (s / Math.max(0.05, sb)))), Math.max(0.03, Math.min(0.97, lt + (l - lb) * (lt < 0.3 ? 0.6 : 1))));
const hs = j.skin.map((c) => L.hsl(...c)), base = [med(hs.map((h) => h[1])), med(hs.map((h) => h[2]))];
const skinMap = new Map(j.skin.map((c) => [c.join(","), shift(L.hsl(...c), base, hexHsl(skinHex))]));
const near = (r, g, b) => Math.min(...j.skin.map((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b)));
const names = Object.keys(j.frames).filter((n) => n.startsWith("face-")).sort();
const sizes = names.map((n) => j.frames[n]), CW = Math.max(...sizes.map((f) => f[2])) + 6, CH = Math.max(...sizes.map((f) => f[3])) + 6;
const per = 7, rows = Math.ceil(names.length / per), OW = CW * per, OH = CH * rows, out = Buffer.alloc(OW * OH * 4);
let left = 0;
names.forEach((name, k) => {
  const [x, y, w, h] = j.frames[name], col = k % per, row = (k / per) | 0;
  let n = 0;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const si = ((y + r) * W + x + c) * 4; if (!data[si + 3]) continue;
    const p = [data[si], data[si + 1], data[si + 2]], to = skinMap.get(p.join(","));
    const [hh, ss, ll] = L.hsl(...p);
    const like = !to && (hh <= 50 || hh >= 340) && ss > 0.2 && ll > 0.45 && near(...p) <= 90;
    if (like) n++;
    out.set([...(to ?? (like && !process.env.PLAIN ? [255, 0, 255] : p)), 255], ((row * CH + 3 + r) * OW + col * CW + 3 + c) * 4);
  }
  left += n;
  if (n) console.log(`  ${name}: ${n} light warm cell(s) not skin`);
});
const file = `work/debug/face-skins-${race}.png`;
await L.sharp(out, { raw: { width: OW, height: OH, channels: 4 } }).resize(OW * S, OH * S, { kernel: "nearest" }).flatten({ background: "#7a8a6a" }).png().toFile(file);
console.log(`${race}: ${names.length} faces, ${left} light warm cell(s) not skin; ${file}`);
