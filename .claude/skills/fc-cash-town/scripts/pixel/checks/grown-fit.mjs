// Does each drawing of a plant grown over its ground stand exactly on its square? (The owner, 2026-11-01: "ตรงตามพื้นที่ของตัวเอง
// แบบเป๊ะๆ".) Read from the drawings' own pixels at lib/town/giant-sizes' GROWN_LIFT: nothing wider than the square, and below the
// line of its left and right corners nothing outside its two front edges. Run it after any new drawing; it also says the least
// lift each drawing could have, and how much of its square each covers.
//   node checks/grown-fit.mjs <the tree>
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
const TREE = process.argv[2] ?? process.cwd();
const sharp = createRequire(join(TREE, "package.json"))("sharp");
const atlas = JSON.parse(readFileSync(join(TREE, "public/town/giants.json"), "utf8"));
const LIFT = Object.fromEntries([...readFileSync(join(TREE, "lib/town/giant-sizes.ts"), "utf8").match(/GROWN_LIFT[^{]*\{([^}]*)\}/)[1].matchAll(/(\w+): ([\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
const { data, info } = await sharp(join(TREE, "public/town", atlas.image)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const TOLERANCE = 0.004; // of the square's half-width: under one map pixel at seven a side
let bad = 0;
for (const [name, [X, Y, w, h]] of Object.entries(atlas.props)) {
  const crop = name.replace(/^big(\w+?)7[A-Z]$/, "$1").toLowerCase(), lift = LIFT[crop];
  const k = 2 / w; // a pixel in the square's half-widths, drawn as wide as the square
  const rows = [];
  for (let y = 0; y < h; y++) {
    let lo = Infinity, hi = -Infinity;
    for (let x = 0; x < w; x++) if (data[((Y + y) * info.width + X + x) * 4 + 3] >= 128) { lo = Math.min(lo, x); hi = Math.max(hi, x + 1); }
    if (hi > lo) rows.push({ up: h - 1 - y, lo, hi });
  }
  const over = (f) => Math.max(...rows.map((r) => { const at = f + r.up * k, room = at < 0.5 ? 2 * at : 1; return Math.max((w / 2 - r.lo) * k, (r.hi - w / 2) * k) - room; }));
  let least = 0; while (least < 0.6 && over(least) > TOLERANCE) least += 0.005;
  let inside = 0, all = 0;
  for (let i = 0; i < 300; i++) for (let m = 0; m < 150; m++) {
    const px = -1 + (i + 0.5) / 150, ph = (m + 0.5) / 150;
    if (Math.abs(px) + Math.abs(ph - 0.5) * 2 > 1) continue;
    all++;
    const r = rows.find((q) => q.up === Math.round((ph - lift) / k)), x = px / k + w / 2;
    if (r && x >= r.lo && x <= r.hi) inside++;
  }
  const fits = over(lift) <= TOLERANCE;
  if (!fits) bad++;
  console.log(`${fits ? "ok  " : "OVER"} ${name.padEnd(14)} lift ${lift}  least ${least.toFixed(3)}  past its edges ${Math.max(0, over(lift)).toFixed(3)}  covers ${(inside / all * 100).toFixed(0)}%`);
}
console.log(bad ? `${bad} drawings stand past their squares.` : "every drawing stands inside its square.");
process.exit(bad ? 1 : 0);
