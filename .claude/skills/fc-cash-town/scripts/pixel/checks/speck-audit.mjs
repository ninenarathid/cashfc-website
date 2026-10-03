// Floating specks: every step of every built race (walking, sitting) under every head it may wear (each eye shape,
// the back of the head), bald. Whatever of the doll is not joined to the rest of it is a speck somebody will see
// beside their avatar: a cell of a sitting frame's own head left behind, a bit of an ear.
//   node checks/speck-audit.mjs [race ...]   (DIR= another atlas folder)
import fs from "node:fs";
import * as L from "../pxlib.mjs";
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const races = process.argv.slice(2).length ? process.argv.slice(2) : ["hyur", "elezen", "miqote", "roegadyn", "aura", "hrothgar", "viera"];
let bad = 0;
for (const race of races) {
  const file = `${DIR}/pixel-${race}.json`;
  if (!fs.existsSync(file)) { console.log(`${race}: not in ${DIR}`); continue; }
  const j = JSON.parse(fs.readFileSync(file, "utf8")), { data } = await L.loadRaw(`${DIR}/${j.image}`), W = j.size[0];
  const notes = [];
  for (const g of Object.keys(j.walk)) for (const view of ["front", "back"]) {
    const steps = j.walk[g][view].map((s, k) => [s, `${g} ${view} ${k}`]);
    if (j.sit?.[g]?.[view]) steps.push([j.sit[g][view], `${g} sit ${view}`]);
    const faces = view === "back" ? [["back", j.face[g].back]] : Object.entries(j.face[g]).filter(([k]) => k !== "back");
    for (const [s, label] of steps) for (const [fk, face] of faces) {
      const cells = new Map();
      for (const [name, dx, dy] of [[s.body, 0, 0], [face, s.hx, s.hy]]) {
        const [x, y, w, h, ox, oy] = j.frames[name];
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (data[((y + r) * W + x + c) * 4 + 3]) cells.set(`${dx + ox + c},${dy + oy + r}`, name === face ? "head" : "body");
      }
      const seen = new Set(), comps = [];
      for (const k of cells.keys()) {
        if (seen.has(k)) continue;
        const st = [k], mem = []; seen.add(k);
        while (st.length) {
          const q = st.pop(); mem.push(q);
          const [x, y] = q.split(",").map(Number);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = `${x + dx},${y + dy}`; if (cells.has(n) && !seen.has(n)) { seen.add(n); st.push(n); } }
        }
        comps.push(mem);
      }
      comps.sort((a, b) => b.length - a.length);
      for (const c of comps.slice(1)) notes.push(`${label} (${fk}): ${c.length} cell(s) of the ${cells.get(c[0])} apart from the doll at ${c[0]}`);
    }
  }
  bad += notes.length;
  console.log(`${race}: ${notes.length ? notes.length + " speck(s)" : "no specks"}`);
  for (const n of notes.slice(0, 30)) console.log("  " + n);
}
console.log(bad ? `${bad} speck(s) in all` : "every doll is in one piece");
process.exitCode = bad ? 1 : 0;
