// Every face piece of every built race: the cells the town will recolour as eyes (lib/town/pixeldoll isEye) must
// all be at that face's two eyes (its blink boxes, give or take 3 cells), and each face must have two eyes of a
// sane size, side by side. node checks/eye-audit.mjs [race ...]   (DIR= another atlas folder)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const races = process.argv.slice(2).length ? process.argv.slice(2) : ["lalafell", "hyur", "elezen", "miqote", "roegadyn", "aura", "hrothgar", "viera"];
let bad = 0;
for (const race of races) {
  const file = `${DIR}/${race === "lalafell" ? "pixel" : `pixel-${race}`}.json`;
  if (!fs.existsSync(file)) { console.log(`${race}: not in ${DIR}`); continue; }
  const j = JSON.parse(fs.readFileSync(file, "utf8")), { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
  const names = Object.keys(j.frames).filter((n) => n.startsWith("face-"));
  const notes = [];
  for (const n of names) {
    const [x, y, w, h] = j.frames[n], eyes = j.faceData?.[n]?.eyes ?? [], back = n.endsWith("-back");
    let stray = 0, cells = 0;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const si = ((y + r) * W + x + c) * 4; if (!data[si + 3]) continue;
      const [hh, ss, ll] = L.hsl(data[si], data[si + 1], data[si + 2]);
      if (!(hh >= 245 && hh <= 310 && ss > 0.15 && ll > 0.12)) continue;
      cells++;
      if (!eyes.some((e) => c >= e.x0 - 3 && c <= e.x1 + 3 && r >= e.y0 - 3 && r <= e.y1 + 3)) stray++;
    }
    const problems = [];
    if (back) { if (cells) problems.push(`${cells} eye-coloured cell(s) on the back of the head`); }
    else {
      if (eyes.length !== 2) problems.push(`${eyes.length} eye(s) to blink`);
      if (stray) problems.push(`${stray} eye-coloured cell(s) away from the eyes`);
      for (const e of eyes) if (e.x1 - e.x0 > 12 || e.y1 - e.y0 > 12) problems.push(`an eye ${e.x1 - e.x0 + 1}x${e.y1 - e.y0 + 1} cells`);
      if (eyes.length === 2 && Math.abs((eyes[0].y0 + eyes[0].y1) - (eyes[1].y0 + eyes[1].y1)) / 2 > 4) problems.push("the eyes at different heights");
      if (!cells) problems.push("no eye-coloured cells");
    }
    if (problems.length) { bad++; notes.push(`  ${n}: ${problems.join("; ")}`); }
  }
  console.log(`${race}: ${names.length} faces, ${notes.length ? `${notes.length} with problems` : "all eyes in place"}`);
  for (const t of notes) console.log(t);
}
console.log(bad ? `${bad} face(s) with problems` : "every face's eye colour is at its eyes, and nowhere else");
process.exitCode = bad ? 1 : 0;
