/**
 * The plants of more than one plot drawn as one (the owner, 2026-10-15: "พืชที่กินมากกว่า 1 ช่อง แบบผสม ช่วย gen ภาพใหม่
 * ให้ดูเชื่อมต่อกัน ไม่ใช่ ภาพ 1 ช่องแบบนี้ / แบบขนาดใหญ่ ไป Gen ภาพให้ออกมาดีๆ"): which picture of the atlas stands over a
 * footprint when the plant is grown (stage 4, `A`) or ripe (stage 5, `B`), and whether it is turned over. Younger ones
 * keep a sprout on each plot.
 *
 * The rows (three plots or two) are drawn running from the lower left to the upper right: a row along y as drawn, one
 * along x turned over. The L-shapes have three views: Front (the other two plots behind the corner), Back (in front of
 * it), and Side (the corner at the right; turned over for the corner at the left). The giants (2x2) stand as one.
 */
export const WIDE: Record<string, string> = {
  blueCorn: "wideBlueCorn", lotusRootBed: "wideLotusRootBed", trellisBerry: "wideTrellisBerry", rowBean: "wideRowBean",
  teaBush: "wideTeaBush", redOkra: "wideRedOkra", bottleGourd: "wideBottleGourd", sunflowerPatch: "wideSunflowerPatch",
};

export interface WideSprite { name: string; flip: boolean; giant: boolean }

/** The one picture of a plant over its plots (`cells`, its footprint's tiles), or null when it keeps one a plot. */
export function wideSprite(crop: string, giant: boolean, stage: number, cells: ReadonlyArray<readonly [number, number]>): WideSprite | null {
  if (stage < 4) return null;
  const ab = stage >= 5 ? "B" : "A";
  if (giant) return { name: `giant${crop[0].toUpperCase()}${crop.slice(1)}${ab}`, flip: false, giant: true };
  const base = WIDE[crop];
  if (!base || cells.length < 2 || cells.length > 3) return null;
  const xs = new Set(cells.map(([x]) => x)), ys = new Set(cells.map(([, y]) => y));
  if (xs.size === 1 || ys.size === 1) return { name: base + ab, flip: ys.size === 1, giant: false };
  // an L: its corner is the plot beside both others; where the others lie from it on the screen (x−y across, x+y down)
  const corner = cells.find(([x, y]) => cells.filter(([u, v]) => Math.abs(u - x) + Math.abs(v - y) === 1).length === 2);
  if (!corner) return null;
  const others = cells.filter((c) => c !== corner).map(([x, y]) => [x - corner[0] - (y - corner[1]), x - corner[0] + (y - corner[1])] as const);
  if (others.every(([, down]) => down < 0)) return { name: `${base}Front${ab}`, flip: false, giant: false };
  if (others.every(([, down]) => down > 0)) return { name: `${base}Back${ab}`, flip: false, giant: false };
  return { name: `${base}Side${ab}`, flip: others.every(([across]) => across > 0), giant: false };
}
