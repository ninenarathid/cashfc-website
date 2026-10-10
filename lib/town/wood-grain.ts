/** The trunk's grain can be read before the timed chops start. The server judges choices, never a claimed grade. */
export type GrainSide = -1 | 1;
export interface GrainPlan { notches: [GrainSide, GrainSide, GrainSide]; lean: GrainSide }
export interface GrainChoice { notches: GrainSide[]; direction: GrainSide }
export type GrainQuality = "rough" | "clear" | "heart";
export type WoodPart = "wood" | "bark" | "sap" | "seed" | "root";
export interface WoodSelection extends GrainChoice { part: WoodPart }
export const WOOD_PARTS: WoodPart[] = ["wood", "bark", "sap", "seed", "root"];

export function grainOf(tree: number): GrainPlan {
  const n = Math.abs(Math.trunc(tree)) % 16;
  const side = (bit: number): GrainSide => ((n >> bit) & 1) ? 1 : -1;
  return { notches: [side(0), side(1), side(2)], lean: side(3) };
}

export function grainChoice(value: unknown): value is GrainChoice {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<GrainChoice>;
  return Array.isArray(v.notches) && v.notches.length === 3 && [0, 1, 2].every(i => v.notches![i] === -1 || v.notches![i] === 1) && (v.direction === -1 || v.direction === 1);
}

export function woodSelection(value: unknown): value is WoodSelection {
  return grainChoice(value) && WOOD_PARTS.includes((value as WoodSelection).part);
}

export function grainQuality(tree: number, choice: GrainChoice, misses: number): GrainQuality {
  if (!grainChoice(choice) || !Number.isFinite(misses) || misses < 0) return "rough";
  const plan = grainOf(tree);
  const hits = choice.notches.reduce((sum, side, i) => sum + Number(side === plan.notches[i]), Number(choice.direction === plan.lean));
  return hits === 4 && misses === 0 ? "heart" : hits >= 3 && misses <= 1 ? "clear" : "rough";
}
