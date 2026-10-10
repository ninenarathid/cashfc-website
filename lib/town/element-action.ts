import { ELEMENTS, gemsOf, type Element } from "./tools";
import type { Stack } from "./trade";

export type MixMotion = "steam" | "crystal" | "magma" | "storm" | "vortex" | "halo" | "eclipse";
/** Visual recipes only: these do not grant additional gameplay bonuses. */
const MIXES: Record<string, MixMotion> = {
  "fire:water": "steam", "fire:ice": "steam", "fire:earth": "magma", "fire:lightning": "storm", "fire:wind": "vortex", "fire:light": "halo", "fire:dark": "eclipse",
  "water:ice": "crystal", "water:earth": "crystal", "water:lightning": "storm", "water:wind": "vortex", "water:light": "halo", "water:dark": "eclipse",
  "ice:earth": "crystal", "ice:lightning": "storm", "ice:wind": "vortex", "ice:light": "halo", "ice:dark": "crystal",
  "earth:lightning": "magma", "earth:wind": "vortex", "earth:light": "halo", "earth:dark": "magma",
  "lightning:wind": "storm", "lightning:light": "halo", "lightning:dark": "storm",
  "wind:light": "halo", "wind:dark": "vortex", "light:dark": "eclipse",
};
export interface ElementAction { elements: Element[]; mix: MixMotion | null; doubled: boolean; key: string }
export function elementAction(stack: Stack | null | undefined): ElementAction | null {
  const gems = gemsOf(stack);
  if (!gems.length) return null;
  const doubled = gems.length === 2 && gems[0] === gems[1];
  const elements = [...new Set(gems)].sort((a, b) => ELEMENTS.indexOf(a) - ELEMENTS.indexOf(b));
  const key = elements.join(":");
  return { elements, mix: elements.length === 2 ? MIXES[key] : null, doubled, key: doubled ? `${key}:${key}` : key };
}
