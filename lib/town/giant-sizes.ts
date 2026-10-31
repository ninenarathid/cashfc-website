import { CROPS, ITEMS, type CropId, type ItemId } from "./items";
import { GRADES, type Grade } from "./quality";
import { bedCorner, bedOf } from "./world";
import type { Plot } from "./farm";

/**
 * **A plant grown over its bed** (the owner, 2026-10-31: "ยิ่ง quality เยอะยิ่งใหญ่ สุงสุดได้ คือ ทั้งแปลงเป้นผักต้นเดียว ใช้คนในการ
 * ช่วยกันถอนมากขึ้น ได้ราคาสูง ขึ้น ให้คุ้มกันพื้นที่ๆกินไป", and "จะกดปล่อยให้โตได้ ต้องมีพื้นที่รองรับก่อน").
 *
 * A ripe plant's ceiling (the four bars, frozen) says how large it may grow; the ground must be ready before it is
 * asked to: every plot of the square is tilled and has nothing on it. The square holds the root, and all of it lies in
 * the plant's bed. A giant already on 2x2 (rank 7's) counts as that size and grows on the same way.
 *
 * Plan only as yet: the first look of the rules, for the owner's mock pictures. Numbers are the two AIs' first figures.
 */
export interface GiantSize {
  /** How many plots a side. */
  n: 2 | 3 | 4 | 5 | 6 | 7;
  /** The ceiling it asks for. */
  from: number;
  /** How many hands it takes to pull out, its grower too. */
  hands: number;
  /** The further wait, in times the crop's own hours; also what a plot pays for. */
  wait: number;
  th: string;
  en: string;
}
export const SIZES: readonly GiantSize[] = [
  { n: 2, from: 70, hands: 2, wait: 0.5, th: "ใหญ่", en: "Big" },
  { n: 3, from: 78, hands: 3, wait: 1, th: "โต", en: "Grown" },
  { n: 4, from: 85, hands: 3, wait: 1.5, th: "ยักษ์", en: "Giant" },
  { n: 5, from: 90, hands: 4, wait: 2, th: "มหึมา", en: "Colossal" },
  { n: 6, from: 95, hands: 5, wait: 2.5, th: "มหาศาล", en: "Vast" },
  { n: 7, from: 100, hands: 6, wait: 3, th: "เต็มแปลง", en: "Whole bed" },
];
/** The crops that may grow so, for now: those that have their pictures. */
export const GROW_CROPS = ["pumpkin", "carrot", "daikon", "cabbage", "taro"] as const;
/** The largest size a ceiling allows, if any. */
export const sizeFor = (ceiling: number): GiantSize | null => SIZES.filter((s) => ceiling >= s.from).at(-1) ?? null;
export const sizeOf = (n: number): GiantSize | undefined => SIZES.find((s) => s.n === n);

/**
 * How large it is drawn within its step (the owner, 2026-10-31: "1x1 2x2 3x3 4x4 ขั้นตามนั้น แต่มี เล็กใหญ่ต่างกันตาม stat ที่ต่างกันได้เล็กน้อย แต่ต้อง
 * ไม่ใหญ่ไปกว่า break point ต่อไป"): at each step it fills its square; the Quality past that step's mark makes it a little
 * larger, up to `FIT_TOP` of its square just under the next mark. n = 1 is a plant of one plot. The largest of a step stays
 * under the smallest of the next (lib/town/giant-sizes.test.ts holds them to it).
 */
export const FIT_LOW = 0.97;
export const FIT_TOP: Readonly<Record<number, number>> = { 1: 1.2, 2: 1.12, 3: 1.08, 4: 1.08, 5: 1.08, 6: 1.08, 7: 1.06 };
export function fitOf(quality: number, n: number): number {
  const i = SIZES.findIndex((s) => s.n === n), from = n === 1 ? 0 : (SIZES[i]?.from ?? 100), next = n === 1 ? SIZES[0].from : (SIZES[i + 1]?.from ?? 101);
  return FIT_LOW + ((FIT_TOP[n] ?? 1.06) - FIT_LOW) * Math.max(0, Math.min(1, (quality - from) / (next - from)));
}

/** Why a plot of the square is not ready: something stands on it, or it is not tilled. */
export type NotReady = "plant" | "soil";
export interface GrowFrame {
  x0: number;
  y0: number;
  n: number;
  /** Every plot of the square. */
  cells: string[];
  /** Those not ready, and why. */
  blocked: Map<string, NotReady>;
}

/** What is wrong with a plot for growing onto, if anything. */
function notReady(key: string, plots: Readonly<Record<string, Plot>>, own: ReadonlySet<string>): NotReady | null {
  if (own.has(key)) return null;
  const plot = plots[key];
  if (plot?.plant || plot?.soil === "house") return "plant";
  return plot?.soil === "tilled" ? null : "soil";
}

/**
 * The square of `n` a side that holds the plant's plots with the fewest plots not ready (nearest the plant's middle
 * among equals), in its bed; null when none fits. `own`: the plots the plant stands on now.
 */
export function growFrame(root: string, n: number, plots: Readonly<Record<string, Plot>>): GrowFrame | null {
  const [rx, ry] = root.split(",").map(Number), bed = bedOf(rx, ry);
  if (bed < 0) return null;
  const [cx, cy] = bedCorner(bed), plant = plots[root]?.plant;
  const own = new Set(plant?.footprint?.length ? plant.footprint : [root]);
  const at = [...own].map((k) => k.split(",").map(Number));
  const x1 = Math.min(...at.map(([x]) => x)), x2 = Math.max(...at.map(([x]) => x)), y1 = Math.min(...at.map(([, y]) => y)), y2 = Math.max(...at.map(([, y]) => y));
  let best: GrowFrame | null = null, bestScore = Infinity;
  for (let y0 = cy; y0 + n <= cy + 7; y0++) for (let x0 = cx; x0 + n <= cx + 7; x0++) {
    if (x1 < x0 || y1 < y0 || x2 >= x0 + n || y2 >= y0 + n) continue;
    const cells: string[] = [], blocked = new Map<string, NotReady>();
    for (let y = y0; y < y0 + n; y++) for (let x = x0; x < x0 + n; x++) {
      const key = `${x},${y}`, why = notReady(key, plots, own);
      cells.push(key);
      if (why) blocked.set(key, why);
    }
    const off = Math.abs(x0 + (n - 1) / 2 - (x1 + x2) / 2) + Math.abs(y0 + (n - 1) / 2 - (y1 + y2) / 2);
    const score = blocked.size * 100 + off;
    if (score < bestScore) { bestScore = score; best = { x0, y0, n, cells, blocked }; }
  }
  return best;
}

/** What the relatives pay for it whole: every plot of it as if it had borne for the further wait, by its grade. */
export function saleOf(crop: CropId, n: number, grade: Grade): number {
  const size = sizeOf(n), c = CROPS[crop], it = ITEMS[crop as ItemId];
  if (!size || !it) return 0;
  return Math.floor(n * n * ((c.yield[0] + c.yield[1]) / 2) * it.pays * size.wait * GRADES[grade].pays);
}
/** How many more hours it takes. */
export const waitOf = (crop: CropId, n: number) => CROPS[crop].hours * (sizeOf(n)?.wait ?? 0);
/** How many more seeds: one for each row it grows by (the owner, 2026-10-31, to one a plot's twelve days of the uncle's pumpkin seeds). `side`: the side of the square it stands on now. */
export const seedsFor = (n: number, side = 1) => Math.max(0, n - side);
