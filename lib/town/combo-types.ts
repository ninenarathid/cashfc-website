/** Public projections only. The recipe registry lives outside the client import graph. */
import{giftsOf}from'./gifts';
export const comboWearKey=(p:Pick<import('./trade').Purse,'gifts'>&{comboEpoch?:number})=>{const g=giftsOf(p);return JSON.stringify([[...g.charms].sort(),g.familiar,...(p.comboEpoch?[p.comboEpoch]:[])]);};
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
  quiet?:number;
  path?:number[];stop?:number|null;previewAt?:number;
  cue: ComboCue; fresh: boolean;
  index?: number; side?: -1 | 1; cavities?: boolean; echo?: -1 | 1; resume?: number;
}
export interface ComboReply { cue?: ComboCue; effect?: ComboEffect; job?:string;part?:{item:import('./items').ItemId;n:number} }
export type ComboContext = "wear" | "wood" | "cavity" | "echo" | "cookBegin" | "cookRetry" | "cookCancel" | 'rowBegin' | 'bugBegin' | 'bugEnd' | 'bugCancel' | 'forestListen';

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
