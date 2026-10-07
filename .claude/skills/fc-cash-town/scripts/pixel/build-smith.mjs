// The smith's screen: its one scene, work/out/scene-town-game-smith.png -> public/town/smith-<hash>.png + lib/town/smith-art.json.
//
//   node build-smith.mjs [--out <tree>]      (in a worktree, name the tree: the default writes into fcnext's)
//
// The scene is a forge seen from the front, filling its canvas: the furnace on the left, the anvil in the middle with
// its top bare (components/town/TownSmith lays the tool on it), a quenching barrel on the right. The model draws it
// big; here its true pixels are found and the picture is kept at their size, to be shown blown up and crisp. The
// JSON beside the code says where the picture is and where in it the anvil's top and the furnace's mouth are, as
// shares of its width and height (found by eye on the sheet, and written here).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const at = process.argv.indexOf("--out"), TREE = at > 0 ? process.argv[at + 1] : "E:/NinenineProject/fcnext";
const SHEET = path.join(HERE, "work", "out", "scene-town-game-smith.png");
/** Where things are on the sheet, as shares of its width and height: the middle of the anvil's flat top, and the middle of the furnace's mouth. */
const SPOTS = { anvil: [0.495, 0.455], mouth: [0.148, 0.49] };

const raw = await L.loadRaw(SHEET);
const grid = L.detectGrid(raw, undefined, [6, 12]);
const g = L.cellsOf(raw, grid);
L.snap(g, L.paletteOf([g], 64));
const im = L.crop(g, new Set(Array.from({ length: g.GW * g.GH }, (_, i) => i)));
const png = await L.sharp(im.buf, { raw: { width: im.w, height: im.h, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10), pub = path.join(TREE, "public", "town");
for (const f of fs.readdirSync(pub)) if (/^smith-[0-9a-f]{10}\.png$/.test(f) && f !== `smith-${hash}.png`) fs.unlinkSync(path.join(pub, f));
fs.writeFileSync(path.join(pub, `smith-${hash}.png`), png);
fs.writeFileSync(path.join(TREE, "lib", "town", "smith-art.json"), JSON.stringify({ image: `/town/smith-${hash}.png`, size: [im.w, im.h], ...SPOTS }, null, 1) + "\n");
console.log(`wrote /town/smith-${hash}.png ${im.w}x${im.h} (${(png.length / 1024).toFixed(1)} KB), grid ${grid.p.toFixed(2)}`);
