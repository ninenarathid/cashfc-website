import type { TimingMods } from "./timing";

/**
 * Stirring a pot, as a game of its own (the owner, 2026-10-04: every mini-game was the game of timing, "การกดตามจังหว่ะ
 * ดูจะมีเยอะไปหน่อย"; each is now what its work is). The ladle is taken round the pot, by a finger or the mouse, at a
 * steady pace: every full turn made at a good pace is a stir done, and so many stirs cook the dish. Stirred too
 * fast for a while the soup goes over the rim; too slowly, or left, it catches on the bottom: either is a miss,
 * and a miss is a helping lost, as it always was (lib/town/cooking). It cannot be lost altogether: a pot goes on
 * being stirred.
 *
 * It is the kindest of the games (the owner: "ทำอาหารทำให้ง่ายกว่าปกติหน่อย … ไม่อยากให้ fail มาก ถ้าพลาดก็ยังได้อะไรบ้าง"):
 * the good pace is a wide one, a slip has to last before it costs anything, and with no stamina left it is a little
 * narrower and a little less patient, where the other games come down to a third of themselves. What makes the
 * stirring easier (an apron) widens the good pace.
 *
 * Pure: it is told how far the ladle went round in each little while, and keeps the pace itself.
 */
export const STIRRING = {
  /** The good pace, turns a second: its middle, and how far either side of it is still good before anything widens it. */
  pace: 0.9, either: 0.36,
  /** How long, in seconds, the pace has to be off before it costs a helping; then it is counted afresh. */
  grace: 1,
  /** How quickly the pace that is kept follows the hand: the seconds over which it is smoothed. */
  smooth: 0.3,
  /** How long after the first touch nothing is held against the cook, while the ladle gets going. */
  lead: 0.8,
};

/**
 * A pot being stirred: how many stirs are wanted, the stirs done and the misses so far, how much of a turn has been
 * made at a good pace since the last stir, the pace now (turns a second), which way it is off (-1 too slow, 1 too
 * fast, 0 good), how long it has been off, the good pace's two ends, how long a slip may last, whether the ladle
 * has been moved at all yet, and how long it has been since it first was.
 */
export interface Stir { need: number; hits: number; misses: number; turned: number; pace: number; off: -1 | 0 | 1; out: number; lo: number; hi: number; grace: number; begun: boolean; t: number }

/** Begin a pot wanting so many stirs. */
export function startStir(need: number, mods: TimingMods): Stir {
  const tired = mods.spent ? mods.tired ?? { zone: 1, speed: 1 } : null;
  const either = Math.min(STIRRING.pace * 0.8, STIRRING.either * Math.sqrt(mods.wide ?? 1) * Math.sqrt(mods.tool ?? 1) * (tired ? tired.zone : 1));
  return {
    need: Math.max(1, Math.floor(need)), hits: 0, misses: 0, turned: 0, pace: 0, off: 0, out: 0,
    lo: STIRRING.pace - either, hi: STIRRING.pace + either, grace: STIRRING.grace / (tired ? tired.speed : 1), begun: false, t: 0,
  };
}

/** Whether the pot is stirred enough. */
export const stirred = (s: Stir) => s.hits >= s.need;

/** The ladle taken so far round (in turns, either way) in so many seconds. */
export function stir(s: Stir, turns: number, dt: number): Stir {
  if (stirred(s) || dt <= 0) return s;
  const moved = Math.abs(turns);
  if (!s.begun && moved === 0) return s;
  // the pace kept is the hand's, smoothed: a finger does not go round evenly
  const k = 1 - Math.exp(-dt / STIRRING.smooth), pace = s.pace + (moved / dt - s.pace) * k, t = s.begun ? s.t + dt : dt;
  const off: -1 | 0 | 1 = pace < s.lo ? -1 : pace > s.hi ? 1 : 0;
  let { turned, hits, misses, out } = s;
  if (off === 0) {
    out = 0;
    turned += moved;
    while (turned >= 1 && hits < s.need) { turned -= 1; hits++; }
  } else if (t > STIRRING.lead) {
    out += dt;
    if (out >= s.grace) { misses++; out = 0; }
  }
  return { ...s, begun: true, t, pace, off, turned: hits >= s.need ? 0 : turned, hits, misses, out };
}
