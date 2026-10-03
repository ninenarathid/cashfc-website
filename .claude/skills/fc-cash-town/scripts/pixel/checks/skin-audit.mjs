// Skin the builder missed: every step of a race (walking front and back, sitting) with its face, the skin ramp
// painted magenta, so skin left in its own colour shows; and a count of cells that are not skin but are warm and
// close to a skin colour, beside skin (the likely misses).
//   node checks/skin-audit.mjs <race> [scale]      (DIR= another atlas folder)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const race = process.argv[2], S = +(process.argv[3] ?? 2);
const j = JSON.parse(fs.readFileSync(`${DIR}/${race === "lalafell" ? "pixel" : `pixel-${race}`}.json`, "utf8"));
const { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
const ramp = j.skin, key = new Set(ramp.map((c) => c.join(",")));
const rampL = ramp.map((c) => L.hsl(...c)[2]);
const near = (r, g, b) => Math.min(...ramp.map((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b)));
const isWarm = (r, g, b) => { const [h, s, l] = L.hsl(r, g, b); return (h <= 45 || h >= 345) && s > 0.2 && l > 0.25 && l < 0.92; };
const cols = [];
for (const g of ["f", "m"]) {
  const faces = j.face[g] ?? j.face;
  for (const view of ["front", "back"]) {
    const steps = j.walk[g][view].map((s, k) => [s, `${g} ${view} ${k}`]);
    if (j.sit?.[g]?.[view]) steps.push([j.sit[g][view], `${g} sit ${view}`]);
    for (const [s, label] of steps) cols.push({ s, label, face: view === "back" ? (faces.back ?? j.face.back) : faces.round });
  }
}
if (process.env.G) for (let k = cols.length - 1; k >= 0; k--) if (!cols[k].label.startsWith(process.env.G + " ")) cols.splice(k, 1);
if (process.env.ONLY) { const want = process.env.ONLY.split(","); for (let k = cols.length - 1; k >= 0; k--) if (!want.includes(cols[k].label)) cols.splice(k, 1); }
const per = Math.min(+(process.env.PER ?? 10), cols.length), CW = +(process.env.CW ?? 130), CH = +(process.env.CH ?? 250), rowsN = Math.ceil(cols.length / per), OW = CW * per, OH = CH * rowsN, out = Buffer.alloc(OW * OH * 4);
let total = 0;
cols.forEach(({ s, label, face }, k) => {
  const col = k % per, row = (k / per) | 0;
  let suspects = 0;
  for (const [name, dx, dy] of [[s.body, 0, 0], [face, s.hx, s.hy]]) {
    const [x, y, w, h, ox, oy] = j.frames[name];
    const at = (c, r) => { if (c < 0 || r < 0 || c >= w || r >= h) return null; const si = ((y + r) * W + x + c) * 4; return data[si + 3] ? [data[si], data[si + 1], data[si + 2]] : null; };
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const p = at(c, r); if (!p) continue;
      const skin = key.has(p.join(","));
      let px = p;
      if (skin) { const l = L.hsl(...p)[2]; px = L.rgb(300, 1, 0.25 + l * 0.5); }
      else if (isWarm(...p) && near(...p) < 60) {
        // beside skin?
        let beside = false;
        for (let dy2 = -1; dy2 <= 1 && !beside; dy2++) for (let dx2 = -1; dx2 <= 1; dx2++) { const q = at(c + dx2, r + dy2); if (q && key.has(q.join(","))) { beside = true; break; } }
        if (beside) suspects++;
        if (process.env.MARK) px = beside ? [255, 235, 0] : [0, 230, 255];
      }
      const X = col * CW + 65 + dx + ox + c, Y = row * CH + CH - 4 + dy + oy + r;
      if (X < col * CW || X >= (col + 1) * CW || Y < row * CH || Y >= (row + 1) * CH) continue;
      out.set([...px, 255], (Y * OW + X) * 4);
    }
  }
  total += suspects;
  if (suspects) console.log(`  ${label}: ${suspects} warm cell(s) close to a skin colour, beside skin, not skin`);
});
const file = `work/debug/skin-audit-${race}${process.env.G ? "-" + process.env.G : ""}.png`;
await L.sharp(out, { raw: { width: OW, height: OH, channels: 4 } }).resize(OW * S, OH * S, { kernel: "nearest" }).flatten({ background: "#20242c" }).png().toFile(file);
console.log(`${race}: ${total} suspect cell(s); ${file}`);
