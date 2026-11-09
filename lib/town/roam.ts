/**
 * Where an animal out of its barn goes, by kind of place: the meadows, the duck pond or the vegetable garden, a stretch
 * of ten minutes at a time. lib/town/pasture draws it there (which patch of that kind, and every step in it); the round
 * strip of a collection reads the kinds it went to (lib/town/specials), and v324's town.roam_kind is this, number for
 * number. Pure and with no imports, so that both can read it.
 *
 * The owner, 2026-10-22: "ช่วยทำให้ สัตว์เดินออกไปที่แปลงผักมากขึ้น": the garden a little more often than the meadows; a duck the
 * pond a third of the time.
 */

/** FNV-1a over a string's UTF-16 units: an animal's seed from its id. */
export const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** A number in [0, 1) from some whole numbers, the same on every page. */
export const mix = (...n: number[]) => { let h = 0x9e3779b9; for (const k of n) { h ^= k + 0x7f4a7c15 + (h << 6) + (h >>> 2); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0; } return (h >>> 0) / 4294967296; };

/** How long a stretch out in one patch lasts before an animal moves on. */
export const STRETCH = 10 * 60_000;
export const GARDEN_SHARE = 0.55, POND_SHARE = 0.3;
export type PatchKind = "meadow" | "pond" | "garden";

/** An animal's stretches: which one a moment is in (each animal's begin at a moment of its own), and when one begins. */
export const stretchOf = (seed: number) => {
  const off = seed % STRETCH;
  return { period: (tt: number) => Math.floor((tt + off) / STRETCH), start: (k: number) => k * STRETCH - off };
};

/** The kind of place an animal is at in its stretch `k`. */
export function patchKind(seed: number, species: string, k: number): PatchKind {
  if (species === "duck" && mix(seed, k, 21) < POND_SHARE) return "pond";
  return mix(seed, k, 22) < GARDEN_SHARE ? "garden" : "meadow";
}
