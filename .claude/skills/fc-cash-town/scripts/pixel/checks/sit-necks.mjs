// Every race's sitting doll, both genders, front and back, bald, in a skin far from the art's own (so skin left in
// its own colour shows), cut to the head and shoulders: node checks/sit-necks.mjs [skinHex] [scale] [race ...]
//   (DIR= another atlas folder; WALK=1 the standing step instead; NECK=1 only the neck, for a closer look; FULL=1 the whole doll)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const [skinHex = "#7fb2e6", sc = "4", ...only] = process.argv.slice(2), S = +sc;
const races = only.length ? only : ["hyur", "elezen", "miqote", "roegadyn", "aura", "hrothgar", "viera"];
const med = (a) => [...a].sort((p, q) => p - q)[a.length >> 1];
const hexHsl = (hex) => L.hsl(...[1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)));
const shift = ([, s, l], [sb, lb], [ht, st, lt]) => L.rgb(ht, Math.max(0, Math.min(1, st * (s / Math.max(0.05, sb)))), Math.max(0.03, Math.min(0.97, lt + (l - lb) * (lt < 0.3 ? 0.6 : 1))));
const isHair = ([h, s, l]) => h >= 70 && h <= 170 && s > 0.2 && l > 0.08, HAIR = hexHsl("#d8c9a0");
const NECK = !!process.env.NECK, FULL = !!process.env.FULL, CW = NECK ? 64 : FULL ? 150 : 120, CH = NECK ? 46 : FULL ? (process.env.WALK ? 215 : 140) : 110;
for (const race of races) {
  const j = JSON.parse(fs.readFileSync(`${DIR}/pixel-${race}.json`, "utf8")), { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
  const hs = j.skin.map((c) => L.hsl(...c)), base = [med(hs.map((h) => h[1])), med(hs.map((h) => h[2]))];
  const skinMap = new Map(j.skin.map((c) => [c.join(","), shift(L.hsl(...c), base, hexHsl(skinHex))]));
  const tiles = [];
  for (const g of ["f", "m"]) for (const view of ["front", "back"]) tiles.push([g, view, process.env.WALK ? j.walk[g][view][1] : j.sit[g][view]]);
  const OW = CW * tiles.length, out = Buffer.alloc(OW * CH * 4);
  tiles.forEach(([g, view, st], col) => {
    const face = view === "back" ? j.face[g].back : j.face[g].round;
    // the head's box on the doll, to centre the cut on
    const [, , fw, fh, fox, foy] = j.frames[face];
    const cx = st.hx + fox + fw / 2, top = NECK ? st.hy + foy + fh - 30 : st.hy + foy;
    for (const [name, dx, dy] of [[st.body, 0, 0], [face, st.hx, st.hy]]) {
      const [x, y, w, h, ox, oy] = j.frames[name], px = [];
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const si = ((y + r) * W + x + c) * 4; if (!data[si + 3]) { px.push(null); continue; } px.push(skinMap.get(`${data[si]},${data[si + 1]},${data[si + 2]}`) ?? [data[si], data[si + 1], data[si + 2]]); }
      if (j.furKey) { const hits = px.map((p, i) => (p && isHair(L.hsl(...p)) ? i : -1)).filter((i) => i >= 0); if (hits.length) { const sb = med(hits.map((i) => L.hsl(...px[i])[1])), lb = med(hits.map((i) => L.hsl(...px[i])[2])); for (const i of hits) px[i] = shift(L.hsl(...px[i]), [sb, lb], HAIR); } }
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const p = px[r * w + c]; if (!p) continue;
        const X = col * CW + Math.round(CW / 2 - cx) + dx + ox + c, Y = 6 - top + dy + oy + r;
        if (X < col * CW || X >= (col + 1) * CW || Y < 0 || Y >= CH) continue; out.set([...p, 255], (Y * OW + X) * 4); }
    }
  });
  const file = `work/debug/${process.env.WALK ? "walk" : "sit"}-necks-${race}${NECK ? "-neck" : FULL ? "-full" : ""}.png`;
  await L.sharp(out, { raw: { width: OW, height: CH, channels: 4 } }).resize(OW * S, CH * S, { kernel: "nearest" }).flatten({ background: "#7a8a6a" }).png().toFile(file);
  console.log(file);
}
