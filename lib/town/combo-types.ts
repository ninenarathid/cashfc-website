/** Public projections only. The recipe registry lives outside the client import graph. */
export type ComboCue = "water" | "wood" | "echo";
export interface ComboFound {
  key: string; cue: ComboCue; at: number; requires: string[]; version?: number;
  name: { th: string; en: string }; does: { th: string; en: string };
}
export interface ComboState {
  found: ComboFound[];
  used: Record<string, { day: number; n: number }>;
  last?: { action: string; key: string; cue: ComboCue; at: number; fresh: boolean };
  actions?: Record<string, { key: string; cue: ComboCue; at: number; index?: number; side?: number; resume?: number }>;
}
export interface ComboEffect {
  cue: ComboCue; fresh: boolean;
  index?: number; side?: -1 | 1; cavities?: boolean; echo?: -1 | 1; resume?: number;
}
export interface ComboReply { cue?: ComboCue; effect?: ComboEffect }
export type ComboContext = "wear" | "wood" | "cavity" | "echo";

/** Untrusted old purses do not expose undiscovered placeholders or a global combo count. */
export function foundCombos(purse: { combos?: unknown }): ComboFound[] {
  const state = purse.combos as Partial<ComboState> | undefined;
  if (!Array.isArray(state?.found)) return [];
  return state.found.filter((v): v is ComboFound => !!v && typeof v.key === "string" &&
    ["water", "wood", "echo"].includes(v.cue) && Number.isFinite(v.at) &&
    Array.isArray(v.requires) && v.requires.every(id => typeof id === "string") &&
    typeof v.name?.th === "string" && typeof v.name?.en === "string" &&
    typeof v.does?.th === "string" && typeof v.does?.en === "string");
}
