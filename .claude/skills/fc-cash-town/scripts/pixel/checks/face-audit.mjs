// Every eye shape of a gender is its round face redrawn with other eyes, so their skin must agree: where one face
// has skin and the other has something light and warm that is not skin (and no skin within two cells), one of
// them is wrong. The eyes themselves are left out (each face's blink boxes and two cells round them): there
// they differ by design. That is how a collar taken for skin on three eye shapes of six shows without anybody
// looking, or a sleepy eye's lid left tan on a face of any other colour.
//   node checks/face-audit.mjs [race ...]   (DIR= another atlas folder; MOST= cells a face may differ by, default 6)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const MOST = +(process.env.MOST ?? 6);
const races = process.argv.slice(2).length ? process.argv.slice(2) : ["hyur", "elezen", "miqote", "roegadyn", "aura", "hrothgar", "viera"];
let bad = 0;
for (const race of races) {
  const file = `${DIR}/pixel-${race}.json`;
  if (!fs.existsSync(file)) { console.log(`${race}: not in ${DIR}`); continue; }
  const j = JSON.parse(fs.readFileSync(file, "utf8")), { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
  const key = new Set(j.skin.map((c) => c.join(",")));
  /** A face piece's cells by their place on the head: "S" skin, "w" light and warm but not skin, "o" anything else. */
  const cellsOf = (name) => {
    const [x, y, w, h, ox, oy] = j.frames[name], m = new Map();
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const si = ((y + r) * W + x + c) * 4; if (!data[si + 3]) continue;
      const p = [data[si], data[si + 1], data[si + 2]], [hh, s, l] = L.hsl(...p);
      m.set(`${ox + c},${oy + r}`, key.has(p.join(",")) ? "S" : (hh <= 50 || hh >= 340) && s > 0.2 && l > 0.45 ? "w" : "o");
    }
    return m;
  };
  /** A face's eyes, as boxes on the head. */
  const eyesOf = (name) => { const [, , , , ox, oy] = j.frames[name]; return (j.faceData?.[name]?.eyes ?? []).map((e) => [e.x0 + ox - 2, e.y0 + oy - 2, e.x1 + ox + 2, e.y1 + oy + 2]); };
  const skinNear = (m, x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (m.get(`${x + dx},${y + dy}`) === "S") return true; return false; };
  const notes = [];
  for (const g of Object.keys(j.face)) {
    const round = cellsOf(j.face[g].round), roundEyes = eyesOf(j.face[g].round);
    for (const [e, name] of Object.entries(j.face[g])) {
      if (e === "round" || e === "back") continue;
      const other = cellsOf(name), eyes = [...roundEyes, ...eyesOf(name)];
      // skin on one, light warm not-skin on the other at the same place, and no skin near it there
      let more = 0, less = 0;
      for (const [k, v] of other) {
        const [x, y] = k.split(",").map(Number);
        if (eyes.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) continue;
        if (v === "S" && round.get(k) === "w" && !skinNear(round, x, y)) more++;
        if (v === "w" && round.get(k) === "S" && !skinNear(other, x, y)) less++;
      }
      if (more > MOST) notes.push(`${name}: ${more} cell(s) are skin here and not on the round face`);
      if (less > MOST) notes.push(`${name}: ${less} cell(s) are skin on the round face and not here`);
    }
  }
  bad += notes.length;
  console.log(`${race}: ${notes.length ? "" : "every eye shape's skin agrees with its round face"}`);
  for (const n of notes) console.log("  " + n);
}
console.log(bad ? `${bad} face(s) disagree` : "every face's skin agrees with its round face");
process.exitCode = bad ? 1 : 0;
