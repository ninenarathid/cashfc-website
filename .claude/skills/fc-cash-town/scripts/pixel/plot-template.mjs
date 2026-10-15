// A plan of the farm's plots, for drawing a plant of more than one plot ON its plots (2026-10-15: the owner, of the first
// drawings, "พืชลูกผสม รู้สึกว่ายังทำภาพมาไม่ตรงช่องเท่าไหร่ ช่วยแก้ไขใหม่"). A plot on the map is a 2:1 diamond 64x32 screen px at
// scale 1, its centre at ((x−y)·32, (x+y)·16) (lib/town/world's toIso).
//
//   node plot-template.mjs <sheet> [out.png]     the plan for a sheet: its six items' plots outlined, one row on 3840x1280,
//                                                each plot 256x128 canvas px (so 64x32 of a drawing at 4 canvas px to its
//                                                pixel), every footprint's front corner on one ground line
//
// The plan goes to gen.mjs as the second reference (the first is the farm's plants, icons-farm-d), with the words that it
// is only a plan. An edit of a plan itself (the plants drawn into it, tpl-*) came out soft and moved off its plots.
// measure-wide.mjs then finds where each drawn plant's mounds are and how it stands on its plots (lib/town/wide-art.json).
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const W = 3840, H = 1280, PLOT = 256, GROUND = 1040;
/** The plots of each shape, in the map's tiles: a line runs along y (lower left to upper right on the screen). */
export const SHAPES = {
  row3: [[0, 0], [0, 1], [0, 2]],
  row2: [[0, 0], [0, 1]],
  front: [[1, 1], [0, 1], [1, 0]], // the corner in front, the other two behind it
  back: [[0, 0], [1, 0], [0, 1]], // the corner behind, the other two in front of it
  side: [[1, 0], [0, 0], [1, 1]], // the corner at the right, the other two to its left
};
/** Each sheet's six items, left to right, and their names (young A, ripe B). */
export const SHEETS = {
  "icons-wide-fit-a": { shapes: ["row3", "row3", "row3", "row3", "row3", "row3"], names: ["wideBlueCornA", "wideBlueCornB", "wideLotusRootBedA", "wideLotusRootBedB", "wideTrellisBerryA", "wideTrellisBerryB"] },
  "icons-wide-fit-b": { shapes: ["row2", "row2", "row2", "row2", "row2", "row2"], names: ["wideRowBeanA", "wideRowBeanB", "wideTeaBushA", "wideTeaBushB", "wideRedOkraA", "wideRedOkraB"] },
  "icons-wide-fit-c": { shapes: ["front", "front", "back", "back", "side", "side"], names: ["wideBottleGourdFrontA", "wideBottleGourdFrontB", "wideBottleGourdBackA", "wideBottleGourdBackB", "wideBottleGourdSideA", "wideBottleGourdSideB"] },
  "icons-wide-fit-d": { shapes: ["front", "front", "back", "back", "side", "side"], names: ["wideSunflowerPatchFrontA", "wideSunflowerPatchFrontB", "wideSunflowerPatchBackA", "wideSunflowerPatchBackB", "wideSunflowerPatchSideA", "wideSunflowerPatchSideB"] },
};
/** A plot's centre on the screen at scale 1, from its tile. */
export const screenOf = ([x, y]) => [(x - y) * 32, (x + y) * 16];

/** Each item's plot centres on the plan's canvas. */
export function planOf(sheet) {
  return SHEETS[sheet].shapes.map((shape, i) => {
    const c = SHAPES[shape].map(screenOf), xs = c.map(([x]) => x), ys = c.map(([, y]) => y);
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2, front = Math.max(...ys), k = PLOT / 64;
    const cx = (i + 0.5) * (W / 6);
    return { shape, centres: c.map(([x, y]) => [cx + (x - mid) * k, GROUND - PLOT / 4 + (y - front) * k]) };
  });
}

async function write(sheet, out) {
  const img = Buffer.alloc(W * H * 4), k = PLOT / 64;
  const inside = (px, py, [cx, cy]) => Math.abs(px - cx) / (32 * k) + Math.abs(py - cy) / (16 * k) <= 1;
  for (const { centres } of planOf(sheet)) {
    const x0 = Math.floor(Math.min(...centres.map(([x]) => x)) - 33 * k), x1 = Math.ceil(Math.max(...centres.map(([x]) => x)) + 33 * k);
    const y0 = Math.floor(Math.min(...centres.map(([, y]) => y)) - 17 * k), y1 = Math.ceil(Math.max(...centres.map(([, y]) => y)) + 17 * k);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const hit = centres.find((c) => inside(x + 0.5, y + 0.5, c));
      if (!hit) continue;
      // each plot outlined in a pale line four canvas px thick, and its middle marked with a small dark dot
      const edge = [[4, 0], [-4, 0], [0, 4], [0, -4]].some(([dx, dy]) => !inside(x + 0.5 + dx, y + 0.5 + dy, hit));
      const dot = Math.abs(x + 0.5 - hit[0]) <= 8 && Math.abs(y + 0.5 - hit[1]) <= 8;
      if (!edge && !dot) continue;
      img.set(dot ? [0x3a, 0x24, 0x12, 255] : [0xd9, 0xc8, 0xa0, 255], (y * W + x) * 4);
    }
  }
  await L.sharp(img, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
  console.log(`wrote ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [sheet, out = path.join(HERE, "work", "out", `plan-${process.argv[2]}.png`)] = process.argv.slice(2);
  if (!SHEETS[sheet]) throw new Error(`no such sheet: ${sheet} (${Object.keys(SHEETS).join(", ")})`);
  await write(sheet, out);
}
