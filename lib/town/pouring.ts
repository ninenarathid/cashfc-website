import { TIMING, type TimingMods } from "./timing";

/**
 * Pouring water, as a game of its own: what tired hands play when they water a plant, draw a bucket at the river,
 * pour it into the well or fill a can (lib/town/farm: with stamina left all of that is done at once). It was a
 * short round of the game of timing; now it is what the hands do (the owner, 2026-10-04: "การกดตามจังหว่ะ ดูจะมีเยอะไป
 * หน่อย").
 *
 * The button is held and the water rises; it is let go when the water stands between the two marks. Between them is
 * a good pour; short of them, or over them, is a miss; and held until it runs over the brim it is spilt, which is a
 * miss at once. After each pour the marks stand somewhere else and the water rises at another pace, so that no pour
 * is learnt by counting. So many good pours and the work is done; at the third miss tired hands drop it, with
 * nothing done and nothing lost, as with the hoe.
 *
 * As hard as the round of timing it takes the place of: the water is between the marks for as long as the marker
 * was over the stretch. A better can or blade widens the marks, as a better tool widened the stretch. Of made-up
 * hands, one that lets go as unsurely as the members pressed on the first day (0.07 s either way) does it a little
 * over one go in four, a practised one (0.035) two in three, a very good one (0.02) nineteen in twenty.
 *
 * Pure: it is told whether the button is held, and for how long.
 */
export const POURING = {
  /** How long the water takes from nothing to the brim, in seconds, and how much quicker or slower any one pour may be. */
  full: 0.9, sway: 0.15,
  /** How far apart the marks are, as a share of the way to the brim: with stamina, and with none left. */
  marks: 0.2, tired: 0.052,
  /** How low the lower mark may stand, and how near the brim the upper one. */
  from: 0.4, brim: 0.94,
};

/**
 * A pouring as it stands: how many good pours are wanted, the good ones and the misses so far, how many misses end
 * it (none, when it cannot be lost), how high the water stands (0 to 1), whether the button was held a moment ago,
 * whether it has just run over (it must be let go before it is held again), where the lower mark is and how far
 * the upper one is above it, how fast the water rises (of the way to the brim, a second), and the seed of what
 * comes next.
 */
export interface Pour { need: number; hits: number; misses: number; most: number; level: number; held: boolean; spilt: boolean; lo: number; width: number; rate: number; seed: number }

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}
/** Where the marks stand for the next pour, and how fast the water will rise. */
function next(width: number, seed: number): { lo: number; rate: number; seed: number } {
  const [a, s1] = draw(seed), [b, s2] = draw(s1);
  return { lo: POURING.from + a * Math.max(0, POURING.brim - width - POURING.from), rate: (1 + (b * 2 - 1) * POURING.sway) / POURING.full, seed: s2 };
}

/** Begin a pouring wanting so many good pours. */
export function startPour(need: number, mods: TimingMods, seed: number): Pour {
  const width = Math.min(0.4, (mods.spent ? POURING.tired : POURING.marks) * Math.sqrt(mods.tool ?? 1));
  return { need: Math.max(1, Math.floor(need)), hits: 0, misses: 0, most: mods.spent && mods.drops ? TIMING.spent.misses : 0, level: 0, held: false, spilt: false, width, ...next(width, seed | 0) };
}

/** Whether the work is done. */
export const poured = (p: Pour) => p.hits >= p.need;
/** Whether the work was dropped: as many misses as tired hands have in them, before it was done. */
export const dropped = (p: Pour) => p.most > 0 && p.misses >= p.most && !poured(p);
/** Whether the water stands between the marks. */
export const between = (p: Pour) => p.level >= p.lo && p.level <= p.lo + p.width;

/** So many seconds gone by with the button held, or not. */
export function pour(p: Pour, hold: boolean, dt: number): Pour {
  if (poured(p) || dropped(p)) return p;
  if (p.spilt) return hold ? p : { ...p, spilt: false, held: false };
  if (hold) {
    const level = p.level + p.rate * Math.max(0, dt);
    // over the brim: spilt, and the hand has to let go before it pours again
    if (level >= 1) return { ...p, level: 0, held: false, spilt: true, misses: p.misses + 1 };
    return { ...p, level, held: true };
  }
  if (!p.held) return p;
  // let go: a good pour between the marks (and the marks move), a miss anywhere else
  if (!between(p)) return { ...p, level: 0, held: false, misses: p.misses + 1 };
  return { ...p, level: 0, held: false, hits: p.hits + 1, ...next(p.width, p.seed) };
}
