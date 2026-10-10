import { cliffAt, layMountain, mountainGround, type MountainGround } from "./mountain";
import { mountainStreamMid, mountainWater } from "./mountain-water";

/** Scenery only: deep fishing water and the saved walking layout keep their own rules. */
export function mountainRiverBed(u: number, v: number): number {
  // Carry the same channel beyond both map edges, opening into the low-country river.
  const mid = mountainStreamMid(Math.max(0, Math.min(72, u)));
  const width = 1.1 + Math.max(0, u - 70) * 0.1;
  return Math.min(Math.abs(v - mid) - width, Math.hypot(u - 42, v - 48) - 2.5,
    Math.hypot(u - 21, v - 46) - 2.2);
}

// Rounded banks beneath the original tree roots and boulders, indexed once for ground painting.
const islands: Array<Array<{ u: number; v: number; radius: number }>> = [];
for (const prop of layMountain()) {
  if (!prop.solid || mountainRiverBed(prop.u + 0.5, prop.v + 0.62) > 1.5) continue;
  const island = { u: prop.u + 0.5, v: prop.v + 0.62, radius: prop.kind === "mrock" || prop.kind === "boulder" ? 0.55 : 0.8 };
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
  if (bed < 0.65 + 0.12 * Math.sin(u * 2.1 + v * 1.7)) {
    const ground = mountainGround(u, v);
    if (ground === "cliff" || ground === "stair" || ground === "road") return null;
    return "sand";
  }
  return null;
}

/** Pixel-sized foam, shallow water between ford stones, and the falling face of a cascade. */
export function riverPixel(u: number, v: number, ground: "water" | "rock", water: readonly [number, number, number]): readonly [number, number, number] | null {
  const cliff = cliffAt(u, v);
  if (ground === "water" && cliff) {
    const foam = Math.sin(v * 19 + Math.sin(u * 7) * 1.7) * Math.cos(u * 13 + v * 9);
    const lip = cliff.rise > 0.88 + 0.05 * Math.sin(v * 17) || cliff.rise < 0.1 + 0.05 * Math.sin(v * 13);
    if (lip && foam > -0.1) return [207, 241, 231];
    if (foam > 0.62) return [155, 222, 224];
    const shade = 0.66 + cliff.rise * 0.22;
    return [water[0] * shade, water[1] * shade, water[2] * shade];
  }
  if (ground === "rock" && mountainRiverBed(u, v) < 0) {
    if (mountainRiverIsland(u, v)) return null;
    // These are deliberately still walkable shallows around the original trees and crossings.
    const x = u / 0.82, y = v / 0.67, nx = Math.floor(x), ny = Math.floor(y);
    const seed = Math.sin(nx * 73.3 + ny * 37.9);
    const dx = x - nx - 0.5 - seed * 0.16, dy = y - ny - 0.5 + seed * 0.12;
    if (dx * dx / 0.045 + dy * dy / 0.07 < 1) return null;
    return [water[0] * 0.8 + 29, water[1] * 0.8 + 23, water[2] * 0.8 + 8];
  }
  return null;
}
