// A step's two pieces apart: the body alone, the head alone, and the two together, at the neck, with the skin in a
// far colour: node checks/piece-split.mjs <race> <g> <front|back> [sit|0..3] [skinHex] [scale]   (DIR=…)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const [race, g, view, which = "sit", skinHex = "#8a8f99", sc = "12"] = process.argv.slice(2), S = +sc;
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel-${race}.json`, "utf8")), { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
const med = (a) => [...a].sort((p, q) => p - q)[a.length >> 1];
const hexHsl = (hex) => L.hsl(...[1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)));
const shift = ([, s, l], [sb, lb], [ht, st, lt]) => L.rgb(ht, Math.max(0, Math.min(1, st * (s / Math.max(0.05, sb)))), Math.max(0.03, Math.min(0.97, lt + (l - lb) * (lt < 0.3 ? 0.6 : 1))));
const hs = j.skin.map((c) => L.hsl(...c)), base = [med(hs.map((h) => h[1])), med(hs.map((h) => h[2]))];
const skinMap = new Map(j.skin.map((c) => [c.join(","), shift(L.hsl(...c), base, hexHsl(skinHex))]));
const st = which === "sit" ? j.sit[g][view] : j.walk[g][view][+which], face = view === "back" ? j.face[g].back : j.face[g].round;
const [, , fw, fh, fox, foy] = j.frames[face], cx = st.hx + fox + fw / 2, top = st.hy + foy + fh - 34;
const CW = 70, CH = 56, OW = CW * 3, out = Buffer.alloc(OW * CH * 4);
[[st.body], [face], [st.body, face]].forEach((names, col) => {
  for (const name of names) {
    const [x, y, w, h, ox, oy] = j.frames[name], dx = name === face ? st.hx : 0, dy = name === face ? st.hy : 0;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const si = ((y + r) * W + x + c) * 4; if (!data[si + 3]) continue;
      const p = skinMap.get(`${data[si]},${data[si + 1]},${data[si + 2]}`) ?? [data[si], data[si + 1], data[si + 2]];
      const X = col * CW + Math.round(CW / 2 - cx) + dx + ox + c, Y = 4 - top + dy + oy + r;
      if (X < col * CW || X >= (col + 1) * CW || Y < 0 || Y >= CH) continue; out.set([...p, 255], (Y * OW + X) * 4);
    }
  }
});
const file = `work/debug/piece-split-${race}-${g}-${view}.png`;
await L.sharp(out, { raw: { width: OW, height: CH, channels: 4 } }).resize(OW * S, CH * S, { kernel: "nearest" }).flatten({ background: "#7a8a6a" }).png().toFile(file);
console.log(file);
