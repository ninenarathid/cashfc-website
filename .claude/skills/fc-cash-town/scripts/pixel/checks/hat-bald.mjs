// Scalp bared by a hat (the owner, 2026-10-25, of a hat on a doll: "ช่วยแก้ pixel ล่างหมวกที่ดูเหมือนหัวล้านให้หน่อย check ทุก
// หมวกเลย"): the hair under a hat is taken away above the hat's brim line, column by column (lib/town/pixeldoll's
// hairUnder, the builder's `clip`); wherever that takes hair off skin the hat does not cover, the head shows bald. Every
// hat over every hairstyle of its doll, front and back, as the game lays them: the cells of the head's skin that the
// hair covered whole and covers no longer, under no hat.
//   node checks/hat-bald.mjs [hat ids]      DIR=<a build folder> (default fcnext's public/town)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const only = process.argv[2] ? new Set(process.argv[2].split(",")) : null;
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel.json`, "utf8"));
const pics = { "": await L.loadRaw(`${DIR}/${j.image}`) };
for (const [g, s] of Object.entries(j.sheets ?? {})) pics[g] = await L.loadRaw(`${DIR}/${s.image}`);
const cells = (name) => {
  const m = new Map(), f = j.frames[name]; if (!f) return m;
  const [x, y, w, h, ox, oy, g] = f, { data, W } = pics[g ?? ""];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const i = ((y + r) * W + x + c) * 4; if (data[i + 3] >= 128) m.set(`${ox + c},${oy + r}`, [data[i], data[i + 1], data[i + 2]]); }
  return m;
};
const skin = ([r, g, b]) => r > 150 && g > 90 && b < 170 && r > b + 40 && r > g;
const rows = [];
for (const [hat, worn] of Object.entries(j.wear?.hat ?? {})) {
  if (only && !only.has(hat)) continue;
  for (const view of ["front", "back"]) {
    const clip = worn.clip?.[view]; if (!clip || !worn[view]) continue;
    const top = cells(worn[view]);
    let worst = 0, sum = 0, at = "";
    for (const hair of Object.keys(j.hair)) {
      if (hair === "bald" || !j.hair[hair][view]) continue;
      const gg = hair[0] === "m" ? "m" : "f";
      const head = cells(view === "front" ? j.face[gg].round : j.face.back), full = cells(j.hair[hair][view]);
      let n = 0;
      for (const [k, c] of head) {
        if (!skin(c) || !full.has(k) || top.has(k)) continue;
        const [x, y] = k.split(",").map(Number), cut = clip.ys[Math.min(clip.ys.length - 1, Math.max(0, x - clip.x0))];
        if (y <= cut) n++;
      }
      sum += n; if (n > worst) { worst = n; at = hair; }
    }
    rows.push({ hat, view, worst, at, sum });
  }
}
rows.sort((a, b) => b.worst - a.worst);
for (const r of rows.filter((r) => r.worst > 0)) console.log(`${r.hat.padEnd(14)} ${r.view.padEnd(5)} worst ${String(r.worst).padStart(3)} (${r.at})  over all hairs ${r.sum}`);
console.log(`hats×views with bare scalp: ${rows.filter((r) => r.worst > 0).length} of ${rows.length}; cells over everything: ${rows.reduce((s, r) => s + r.sum, 0)}`);
