import { cliffAt, layMountain, mountainGround } from "./mountain";
import type { Current, FishingHabitat } from "./river-items";

/** Water overlays the existing mountain; the numbered trees and rocks keep their locations. */
export const mountainStreamMid = (u: number) => 47 + Math.sin(u / 7) * 1.1;
// Keep the ground around numbered trees, rocks and seats available to walkers.
// Their locations are already kept by the database and must survive this overlay.
const dry = new Set<string>();
for (const prop of layMountain().filter(p => p.solid)) {
  for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) dry.add(`${prop.u + du},${prop.v + dv}`);
}
export function mountainWater(u: number, v: number): { habitat: FishingHabitat; current: Current } | null {
  if (u < 7 || u > 70 || v < 40 || v > 54 || cliffAt(u,v)) return null;
  if (dry.has(`${Math.floor(u)},${Math.floor(v)}`)) return null;
  // Existing trails remain crossings, including the stone stairs.
  if (mountainGround(u,v) === "road") return null;
  if (Math.hypot(u-42,v-48) < 2.5 || Math.hypot(u-21,v-46) < 2.2) return {habitat:"pool",current:"eddy"};
  const offset=Math.abs(v-mountainStreamMid(u));
  return offset < 1.1 ? {habitat:"headwater",current:offset < 0.55 ? "run" : "shelter"} : null;
}
