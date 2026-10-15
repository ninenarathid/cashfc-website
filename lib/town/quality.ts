/**
 * The farm's Quality (the owner, 2026-10-15: "Quality ต้องใช้งานได้จริง ไม่ใช่แค่ show", and the same day "ช่วยเปลี่ยน
 * Mechanic ของ quality เป็นบอก range ที่จะได้ quality ถ้าโชคดีก็ได้ quality บนๆ โชคไม่ดีก็ล่างๆ ของบางอย่างจะทำให้ range
 * สั้นลง (ลด range ด้านล่าง ด้านบนยังเท่าเดิม)"). The whole design, with the mock screens, is the artifact
 * https://claude.ai/artifact/6jR6hbg7pHtGmfa3vQHFJC; the rules here are its section 1.
 *
 * - Four bars of 25 (soil, water, pollen, guard). Each fills by the share of the plant's growing time it was covered,
 *   by the best source at each moment (never added): hand work half a bar, the insect house half, a fertiliser a whole
 *   bar or half of two, a companion plant in the same bed a whole bar. The bars are frozen when the plant is ripe.
 * - The four bars make the CEILING. The floor is 30 under it; partner plants, the pollen brush, a rare insect in the
 *   house and a three-day packet raise the floor (each once, 20 at the most), never the ceiling.
 * - At the pick every fruit is rolled on its own, evenly between floor and ceiling. The grade decides what the uncle's
 *   relatives pay and what a dish made of it restores.
 *
 * Pure, so it can be tested without a browser; the database holds the same numbers (and draws the real rolls).
 */

export type Role = "soil" | "water" | "pollen" | "guard";
export const ROLES: readonly Role[] = ["soil", "water", "pollen", "guard"];

export const QUALITY = {
  /** Points a full bar is worth. */
  bar: 25,
  /** Ceiling minus floor before anything narrows it. */
  spread: 30,
  /** The most the floor can be raised. */
  narrowest: 20,
  /** Each narrowing source at its fullest. */
  narrow: 10,
  /** What fennel takes off the soil of the plants it touches (✚), at full time. */
  fennel: 10,
} as const;

/* ── grades ── */

export type Grade = 0 | 1 | 2 | 3;
export const GRADES: ReadonlyArray<{ grade: Grade; from: number; to: number; th: string; en: string; pays: number; restores: number }> = [
  { grade: 0, from: 0, to: 39, th: "ธรรมดา", en: "Normal", pays: 1, restores: 0 },
  { grade: 1, from: 40, to: 69, th: "★ เงิน", en: "★ Silver", pays: 1.25, restores: 0.2 },
  { grade: 2, from: 70, to: 94, th: "★★ ทอง", en: "★★ Gold", pays: 1.75, restores: 0.4 },
  { grade: 3, from: 95, to: 100, th: "★★★ ยอดเยี่ยม", en: "★★★ Excellent", pays: 2.5, restores: 0.6 },
];

export function gradeOf(quality: number): Grade {
  return quality >= 95 ? 3 : quality >= 70 ? 2 : quality >= 40 ? 1 : 0;
}

/** A dish's grade: its lowest graded ingredient (things bought from the uncle carry no grade and do not count). */
export function dishGrade(ingredients: ReadonlyArray<Grade | null>): Grade {
  const graded = ingredients.filter((g): g is Grade => g !== null);
  return graded.length ? (Math.min(...graded) as Grade) : 0;
}

/* ── the bars ── */

/** A source covering one bar for a while: `level` 1 a whole bar, 0.5 half. Times in ms. */
export interface Cover { role: Role; level: number; from: number; to: number }
/** Something taking points off a bar while it lasts (fennel beside the plant): `points` at full time. */
export interface Penalty { role: Role; points: number; from: number; to: number }

/**
 * The four bars over a growing round [from, to): each bar is 25 × the time-weighted best level covering it, less any
 * penalty weighted the same way, and never under 0. Whole points (rounded down), as the database keeps them.
 */
export function barsOf(covers: readonly Cover[], from: number, to: number, penalties: readonly Penalty[] = []): Record<Role, number> {
  const span = to - from, out = { soil: 0, water: 0, pollen: 0, guard: 0 } as Record<Role, number>;
  if (!(span > 0)) return out;
  const cuts = [...new Set([from, to, ...covers.flatMap((c) => [c.from, c.to]), ...penalties.flatMap((p) => [p.from, p.to])])]
    .filter((t) => t >= from && t <= to).sort((a, b) => a - b);
  for (const role of ROLES) {
    let got = 0, lost = 0;
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i], b = cuts[i + 1], mid = (a + b) / 2, share = (b - a) / span;
      const best = covers.reduce((m, c) => (c.role === role && c.from <= mid && mid < c.to ? Math.max(m, c.level) : m), 0);
      got += Math.min(1, best) * share;
      lost += penalties.reduce((m, p) => (p.role === role && p.from <= mid && mid < p.to ? m + p.points : m), 0) * share;
    }
    out[role] = Math.max(0, Math.floor(QUALITY.bar * got + 1e-9 - lost));
  }
  return out;
}

export const ceilingOf = (bars: Record<Role, number>): number => Math.min(100, ROLES.reduce((s, r) => s + bars[r], 0));

/* ── the range ── */

export type Narrowing = "partner" | "brush" | "rare" | "packet";
export const NARROWINGS: readonly Narrowing[] = ["partner", "brush", "rare", "packet"];

/**
 * How far the floor is raised: each source once, by the share of the round it was there (the brush is all or
 * nothing), 10 each at most, 20 in all; rounded down once.
 */
export function narrowingOf(shares: Partial<Record<Narrowing, number>>): number {
  const sum = NARROWINGS.reduce((s, k) => s + QUALITY.narrow * Math.min(1, Math.max(0, shares[k] ?? 0)), 0);
  return Math.min(QUALITY.narrowest, Math.floor(sum + 1e-9));
}

export interface Range { lo: number; hi: number }
export function rangeOf(ceiling: number, narrowing = 0): Range {
  const hi = Math.max(0, Math.min(100, Math.floor(ceiling)));
  return { lo: Math.max(0, hi - (QUALITY.spread - Math.min(QUALITY.narrowest, Math.max(0, narrowing)))), hi };
}

/** Each grade's chance in a range (every whole number in it equally likely). */
export function chancesOf({ lo, hi }: Range): Record<Grade, number> {
  const n = hi - lo + 1, out = { 0: 0, 1: 0, 2: 0, 3: 0 } as Record<Grade, number>;
  for (const g of GRADES) out[g.grade] = Math.max(0, Math.min(hi, g.to) - Math.max(lo, g.from) + 1) / n;
  return out;
}

/** One fruit's Quality: a whole number from lo to hi, both ends in. `rand` in [0, 1). */
export function rollOne({ lo, hi }: Range, rand: () => number): number {
  return lo + Math.min(hi - lo, Math.floor(rand() * (hi - lo + 1)));
}

/** What the uncle's relatives pay for one of a graded thing, from its plain price (after the market's factor). */
export const paidFor = (price: number, grade: Grade): number => Math.floor(price * GRADES[grade].pays);

/* ── companion plants ── */

export type Shape = "plus" | "ring" | "line" | "x" | "fig";
export type CompanionId =
  | "runnerBean" | "peanut" | "buckwheat" | "sesame" | "clover"
  | "gardenStrawberry" | "rhubarb" | "watercress" | "fig" | "chamomile"
  | "borage" | "lavender" | "passionfruit" | "milkweed" | "fennel"
  | "marigold" | "nasturtium" | "garlicChives" | "mint" | "dill";

/** The twenty helpers, five a role (the design's section 3); `uncle`: the four whose seeds he sells. */
export const COMPANIONS: Record<CompanionId, { role: Role; shape: Shape; uncle?: true; th: string; en: string }> = {
  runnerBean: { role: "soil", shape: "plus", uncle: true, th: "ถั่วรันเนอร์", en: "Runner bean" },
  peanut: { role: "soil", shape: "plus", th: "ถั่วลิสง", en: "Peanut" },
  buckwheat: { role: "soil", shape: "ring", th: "บัควีต", en: "Buckwheat" },
  sesame: { role: "soil", shape: "line", th: "งา", en: "Sesame" },
  clover: { role: "soil", shape: "x", th: "โคลเวอร์", en: "Clover" },
  gardenStrawberry: { role: "water", shape: "plus", uncle: true, th: "สตรอว์เบอร์รีสวน", en: "Garden strawberry" },
  rhubarb: { role: "water", shape: "ring", th: "รูบาร์บ", en: "Rhubarb" },
  watercress: { role: "water", shape: "line", th: "วอเตอร์เครส", en: "Watercress" },
  fig: { role: "water", shape: "fig", th: "มะเดื่อ", en: "Fig" },
  chamomile: { role: "water", shape: "x", th: "คาโมมายล์", en: "Chamomile" },
  borage: { role: "pollen", shape: "line", uncle: true, th: "โบราจ", en: "Borage" },
  lavender: { role: "pollen", shape: "ring", th: "ลาเวนเดอร์", en: "Lavender" },
  passionfruit: { role: "pollen", shape: "line", th: "เสาวรส", en: "Passionfruit vine" },
  milkweed: { role: "pollen", shape: "plus", th: "มิลค์วีด", en: "Milkweed" },
  fennel: { role: "pollen", shape: "x", th: "เฟนเนล", en: "Fennel" },
  marigold: { role: "guard", shape: "ring", uncle: true, th: "ดาวเรือง", en: "Marigold" },
  nasturtium: { role: "guard", shape: "x", th: "แนสเทอร์ฌัม", en: "Nasturtium" },
  garlicChives: { role: "guard", shape: "line", th: "กุยช่าย", en: "Garlic chives" },
  mint: { role: "guard", shape: "plus", th: "มิ้นต์", en: "Mint" },
  dill: { role: "guard", shape: "plus", th: "ผักชีลาว", en: "Dill" },
};

const PLUS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const X = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const RING = [...PLUS, ...X];

/**
 * The cells a helper standing at its anchor covers, as offsets. A line runs three cells each way along its axis
 * (rotation 0 east–west, 1 north–south); the fig is 2×2 from its anchor and covers the twelve cells round it.
 */
export function coverOffsets(shape: Shape, rotation = 0): number[][] {
  switch (shape) {
    case "plus": return PLUS;
    case "x": return X;
    case "ring": return RING;
    case "line": return [-3, -2, -1, 1, 2, 3].map((d) => (rotation % 2 ? [0, d] : [d, 0]));
    case "fig": {
      const out: number[][] = [];
      for (let y = -1; y <= 2; y++) for (let x = -1; x <= 2; x++) if (x < 0 || x > 1 || y < 0 || y > 1) out.push([x, y]);
      return out;
    }
  }
}

/** The share of a plant's cells (a garden crop may stand on several) that a helper covers. */
export function coveredShare(plantCells: readonly string[], helperAt: string, shape: Shape, rotation = 0, helperCells: readonly string[] = [helperAt]): number {
  const [x, y] = helperAt.split(",").map(Number);
  const reach = new Set(coverOffsets(shape, rotation).map(([u, v]) => `${x + u},${y + v}`));
  // a helper never covers itself
  const cells = plantCells.filter((c) => !helperCells.includes(c));
  return plantCells.length ? cells.filter((c) => reach.has(c)).length / plantCells.length : 0;
}

/* ── partners ── */

/**
 * Each main crop's one partner (the owner took the design page with them, 2026-10-15): planted touching it (✚) for the
 * whole round, it raises the floor by 10. Corn, the runner bean and pumpkin are the three sisters.
 */
export const PARTNERS: Record<string, string> = {
  kangkong: "watercress", scallion: "carrot", cabbage: "dill", carrot: "scallion", daikon: "nasturtium",
  corn: "runnerBean", chili: "basil", tomato: "basil", basil: "tomato", sweetPotato: "peanut", garlic: "chamomile",
  pumpkin: "runnerBean", eggplant: "marigold", cucumber: "dill", longBean: "sesame", lemongrass: "mint",
  galangal: "rhubarb", lime: "lavender", papaya: "passionfruit", mango: "buckwheat", banana: "sweetPotato",
  coconut: "peanut", ginger: "watercress", turmeric: "chamomile", taro: "watercress", watermelon: "nasturtium",
  bottleGourd: "borage", rowBean: "corn", trellisBerry: "borage", blueCorn: "runnerBean", teaBush: "clover",
  sunflowerPatch: "milkweed", redOkra: "garlicChives", lotusRootBed: "kangkong",
  // the sisters' bean, one of the helpers
  runnerBean: "corn",
};
