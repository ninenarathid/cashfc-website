// The vein board's scene: one AI sheet in work/out -> public/town/mine-vein-<hash>.png, at its true pixels.
//   node build-mine-scene.mjs [out folder]
// Another board's scene the same way: SCENE=<its sheet in work/out> NAME=<the picture's name> (the giant pulled out
// together: SCENE=scene-giant-pull-game NAME=giant-pull, components/town/TownGiantPull's SCENE).
// SIZE=<w>x<h> cuts it to that many cells instead of its own grid's: an in-place edit shown in turn with the picture it
// was drawn from is cut on that one's grid, so that nothing behind jumps when they swap (the leaf roll opened:
// SCENE=scene-unroll-game-open NAME=unroll-game-open SIZE=306x204, the closed roll's).
// (The board asks for the picture by its name, components/town/TownVein's SCENE: change that when the hash changes.)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const src = path.join(HERE, "work", "out", `${process.env.SCENE ?? "scene-mining-game-vein"}.png`), out = process.argv[2] ?? path.join(HERE, "..", "..", "..", "..", "..", "public", "town");
const raw = await L.loadRaw(src), grid = L.detectGrid(raw, undefined, [3, 8]);
const [sw, sh] = (process.env.SIZE ?? "").split("x").map(Number);
const w = sw || Math.round(raw.W / grid.p) || Math.round(1536 / grid.p), h = sh || Math.round(raw.H / grid.p) || Math.round(1024 / grid.p);
const png = await L.sharp(src).resize(w, h, { kernel: "nearest" }).png({ palette: true, colours: 64, compressionLevel: 9 }).toBuffer();
const file = path.join(out, `${process.env.NAME ?? "mine-vein"}-${crypto.createHash("sha1").update(png).digest("hex").slice(0, 10)}.png`);
fs.writeFileSync(file, png);
console.log(`wrote ${file} ${w}x${h} (${(png.length / 1024).toFixed(1)} KB)`);
