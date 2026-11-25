// node mk.cjs <name> : reads specs/<name>.full.json (src, crop, blurFull, marksFull, std: [list of HUD keys]) in FULL-frame coords,
// writes specs/<name>.json in crop coords, renders out/<name>.webp, and out/<name>-gv.png (grid + boxes)
const fs = require("fs"), { execFileSync } = require("child_process");
const S = "scripts/guides/.work/ex5g";
const name = process.argv[2], mode = process.argv[3] || "both";
const f = JSON.parse(fs.readFileSync(`${S}/specs/${name}.full.json`, "utf8"));
const STD = { party: [1196, 503, 290, 214], enemy: [420, 400, 182, 34], cast: [700, 493, 215, 26], target: [812, 628, 370, 36],
  hotbar: [708, 730, 495, 75], minimap: [1795, 0, 125, 245], topbar: [1585, 0, 335, 22] };
const [cx, cy, cw, ch] = f.crop;
const boxes = [...(f.std || []).map((k) => STD[k]), ...(f.blurFull || [])];
const blur = boxes.map(([x, y, w, h]) => [x - cx, y - cy, w, h]).filter(([x, y, w, h]) => x + w > 0 && y + h > 0 && x < cw && y < ch)
  .map(([x, y, w, h]) => { const X = Math.max(0, x), Y = Math.max(0, y); return [X, Y, Math.min(w - (X - x), cw - X), Math.min(h - (Y - y), ch - Y)]; });
const mv = (p) => [p[0] - cx, p[1] - cy];
const marks = (f.marksFull || []).map((m) => m.t === "arrow" ? { ...m, from: mv(m.from), to: mv(m.to) } : { ...m, at: mv(m.at) });
const spec = { labelsFull: true, src: f.src, out: `${S}/out/${name}.webp`, crop: f.crop, blur, marks, width: 1000 };
fs.writeFileSync(`${S}/specs/${name}.json`, JSON.stringify(spec, null, 1));
if (mode !== "render") execFileSync("node", [`${S}/tools/gv.cjs`, `${S}/specs/${name}.json`, `${S}/out/${name}-gv.png`, "-", "1500"]);
if (mode !== "gv") console.log(execFileSync("node", ["scripts/guides/annotate-frame.cjs", `${S}/specs/${name}.json`]).toString().trim());
