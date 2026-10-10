import { cliffAt, layMountain, mountainGround, type MountainGround } from "./mountain";
import { mountainStreamMid, mountainWater } from "./mountain-water";

/** Scenery only: deep fishing water and the saved walking layout keep their own rules. */
export function mountainRiverBed(u: number, v: number): number {
  const x = Math.max(0, Math.min(72, u)), mid = mountainStreamMid(x);
  // The banks meander independently: a narrow run opens into gravel bars and quiet pools.
  // The existing fishing channel remains inside this wider, asymmetric valley floor.
  const left = 1.12 + 1.45 * (0.5 + 0.5 * Math.sin(x / 5.1 + 0.8));
  const right = x > 55 ? 1.12 + 0.25 * (0.5 + 0.5 * Math.sin(x / 3.8)) : 1.12 + 1.8 * (0.5 + 0.5 * Math.sin(x / 6.3 - 1.4));
  const outlet = Math.max(0, u - 70) * 0.08;
  return Math.min(Math.max(mid - v - left - outlet, v - mid - right - outlet),
    Math.hypot(u - 42, v - 48) - 2.5, Math.hypot(u - 21, v - 46) - 2.2,
    // The foot-yard pool opens towards its empty northern bank, away from the existing trees.
    Math.hypot((u - 65) * 0.75, v - 46) - 2);
}

// Small root patches stay local to the existing dry buffers, without cutting the fishing channel.
const islands: Array<Array<{ u: number; v: number; radius: number }>> = [];
for (const prop of layMountain()) {
  // Boundary decorations are omitted at the outlet; they need no root patches there.
  if (prop.kind !== "mtree" && prop.kind !== "mrock" && prop.u === 71) continue;
  if (!prop.solid || mountainRiverBed(prop.u + 0.5, prop.v + 0.62) > 1.5) continue;
  const u = prop.u + 0.5, v = prop.v + 0.62;
  const island = { u, v, radius: prop.kind === "mrock" || prop.kind === "boulder" ? 0.55 : 0.8 };
  for (let y = Math.max(0, prop.v - 1); y <= Math.min(55, prop.v + 1); y++) for (let x = Math.max(0, prop.u - 1); x <= Math.min(71, prop.u + 1); x++) {
    (islands[y * 72 + x] ??= []).push(island);
  }
}
export function mountainRiverIsland(u: number, v: number): boolean {
  return u >= 0 && u < 72 && v >= 0 && v < 56 && (islands[Math.floor(v) * 72 + Math.floor(u)]?.some(p => Math.hypot(u - p.u, v - p.v) < p.radius) ?? false);
}

export function mountainRiverGround(u: number, v: number): "water" | "sand" | MountainGround | null {
  const bed = mountainRiverBed(u, v);
  if (bed < 0) {
    // Cascades span the cliff faces. Existing dry paths become shallow stone fords.
    if (cliffAt(u, v) || u < 0 || u >= 72 || mountainWater(u, v)) return "water";
    if (mountainRiverIsland(u, v)) return mountainGround(u, v);
    // Small stones and gravel link the water rather than square holes of grass.
    return "rock";
  }
  if (bed < 0.22 + 0.4 * (0.5 + 0.5 * Math.sin(u * 0.73 + v * 1.13))) {
    const ground = mountainGround(u, v);
    if (ground === "cliff" || ground === "stair" || ground === "road") return null;
    return "rock";
  }
  return null;
}

/** Pixel-sized foam, shallow water between ford stones, and the falling face of a cascade. */
export function riverPixel(u: number, v: number, ground: "water" | "rock", sample: readonly [number, number, number]): readonly [number, number, number] | null {
  // A smaller, cooler ripple pattern suits mountain water rather than the broad town river.
  const water = [sample[0] * 0.72 + 12, sample[1] * 0.84 + 7, sample[2] * 0.72 + 9] as const;
  const cliff = cliffAt(u, v);
  if (ground === "water" && cliff) {
    const foam = Math.sin(v * 19 + Math.sin(u * 7) * 1.7) * Math.cos(u * 13 + v * 9);
    const lip = cliff.rise > 0.88 + 0.05 * Math.sin(v * 17) || cliff.rise < 0.1 + 0.05 * Math.sin(v * 13);
    if (lip && foam > -0.1) return [207, 241, 231];
    if (foam > 0.62) return [155, 222, 224];
    // Both lips meet the channel's own colour; only the middle of the face is shaded.
    const shade = 1 - 0.22 * Math.sin(cliff.rise * Math.PI);
    return [water[0] * shade, water[1] * shade, water[2] * shade];
  }
  if (ground === "rock" && mountainRiverBed(u, v) < 0) {
    if (mountainRiverIsland(u, v)) return null;
    // These are deliberately still walkable shallows around the original trees and crossings.
    const x = u / 0.82, y = v / 0.67, nx = Math.floor(x), ny = Math.floor(y);
    const seed = Math.sin(nx * 73.3 + ny * 37.9);
    const dx = x - nx - 0.5 - seed * 0.16, dy = y - ny - 0.5 + seed * 0.12;
    if (Math.abs(seed) > 0.75 && dx * dx / 0.045 + dy * dy / 0.07 < 1) return null;
    return water;
  }
  // No dark rectangular rim between a fishing pool and the adjoining stone ford.
  if (ground === "water" && mountainRiverBed(u, v) < 0) return water;
  return null;
}
