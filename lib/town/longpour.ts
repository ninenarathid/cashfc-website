import { partOf, slowPartOf } from "./forged";
import { TIMING, narrowed, type TimingMods } from "./timing";

/**
 * The long pour (lib/town/gifts' charmGloves, the helpers' first rank; the owner, 2026-10-07: a power that does many
 * at once has a longer, harder game of its own, and a miss costs a part of what it would have given, never the
 * whole): a game of its own, for watering a whole row of somebody else's bed at once.
 *
 * The row lies across the board, each thirsty plant at its own place in it. The button is held, and the water runs
 * along the row from its head, gathering pace and never quite evenly; each plant it reaches is watered as it comes
 * to it. It is let go **once**: the water stops where it had got to. Let go between the two marks beyond the last
 * plant, the whole row is watered. Let go sooner, the plants it had not reached get none. Held past the marks it
 * runs out of the bed and is spilt, and the row's last plants get none of it.
 *
 * So a careful hand may stop a plant short and be sure of the rest; the whole row is for a hand that dares the
 * marks. One plant's pour is two short ones and a mark a fifth of the way wide; this is one pour three times as
 * long, with the water going faster the further it runs: by the time it is at the marks they are as long in passing
 * as one plant's are, and it cannot be tried again.
 *
 * A better can and steady hands widen the marks (as in lib/town/pouring); tired hands have narrower marks and
 * quicker water (the hoe's own numbers for no stamina); and a row that has a crop harder for whoever pours
 * (lib/town/farm's hardIn) has narrower marks.
 *
 * Pure: it is told whether the button is held, and for how long.
 */
export const LONG = {
  /** The plots a second the water runs at first, how many more with every second, and how much its pace wavers either way (with how long one wavering takes, in seconds). */
  speed: 1.6, gain: 0.5, sway: 0.45, beat: 1.3,
  /** How far before the first plant's plot the water sets off, in plots. */
  lead: 0.8,
  /** How far apart the two marks are beyond the last plant's middle, in plots, and the widest they get. */
  zone: 0.6, most: 1.4,
  /** How many of the row's last plants get none of water that was spilt (one plant, at the least, is always watered by it). */
  spill: 2,
  /** The longest a pour is believed to have taken, in seconds: what whoever keeps the game allows for it (lib/town/helping's bridged). */
  longest: 12,
};

/**
 * A long pour as it stands: where each plant stands in the row (its plot's number along it, the lowest first), where
 * the water sets off, where the whole row is reached (the last plant's middle) and how far beyond that the marks
 * end, its pace, what it gains and how it wavers, how long the button has been held, whether it is held now, where
 * the water stood when it was let go (null: not yet), and whether it was spilt.
 */
export interface LongPour { places: number[]; from: number; end: number; zone: number; speed: number; gain: number; sway: number; phase: number; t: number; held: boolean; at: number | null; spilt: boolean }

/** Begin one over the plants at these places of a row (`hard`: how much harder the row is for whoever pours, 1 where it is not; `seed`: where its wavering begins). */
export function startLong(places: readonly number[], mods: TimingMods = {}, hard = 1, seed = 0): LongPour {
  // ── forging: old tools ── (the can's own: its water runs at so many times its pace, and its marks are so many times as wide, with the rest of what widens them and never past the cap)
  const at = [...places].map((p) => Math.floor(p)).sort((a, b) => a - b), tired = mods.spent ? mods.tired ?? TIMING.spent : null, k = (tired ? tired.speed : 1) * slowPartOf(1, mods.pace ?? 1);
  const zone = Math.min(LONG.most, LONG.zone * (tired ? tired.zone : 1) * Math.sqrt(mods.tool ?? 1) * (mods.buff ?? 1) * (mods.wide ?? 1) * narrowed({ hard })
    * partOf(Math.sqrt(mods.tool ?? 1) * (mods.buff ?? 1) * (mods.wide ?? 1), mods.forged ?? 1));
  const part = ((Math.imul(seed | 0, 2654435761) >>> 0) % 1000) / 1000;
  return { places: at, from: (at[0] ?? 0) - LONG.lead, end: (at[at.length - 1] ?? 0) + 0.5, zone, speed: LONG.speed * k, gain: LONG.gain * k, sway: LONG.sway * k, phase: part * Math.PI * 2, t: 0, held: false, at: null, spilt: false };
}
/** Where the water has got to along the row after so many seconds of pouring, in plots. */
export function frontAt(s: LongPour, t: number): number {
  const u = Math.max(0, t), w = (Math.PI * 2) / LONG.beat;
  return s.from + s.speed * u + 0.5 * s.gain * u * u + (s.sway / w) * (Math.cos(s.phase) - Math.cos(w * u + s.phase));
}
/** Where it is now. */
export const front = (s: LongPour): number => (s.at !== null ? s.at : frontAt(s, s.t));
/** Whether it is over: let go, or spilt. */
export const longOver = (s: LongPour): boolean => s.at !== null || s.spilt;
/** Whether the water stands between the marks: let go now, the whole row is watered. */
export const atMarks = (s: LongPour): boolean => { const x = front(s); return !s.spilt && x >= s.end && x <= s.end + s.zone; };

/** So many seconds gone by with the button held, or not. */
export function pourOn(s: LongPour, hold: boolean, dt: number): LongPour {
  if (longOver(s)) return s;
  if (hold) {
    const t = s.t + Math.max(0, dt);
    // past the marks: out of the bed, and spilt
    return frontAt(s, t) > s.end + s.zone ? { ...s, t, held: false, spilt: true } : { ...s, t, held: true };
  }
  // let go: the water stops where it had got to (a button never held has poured nothing yet)
  return s.held ? { ...s, held: false, at: frontAt(s, s.t) } : s;
}
/** How each plant came out of it, in the order they stand: true, watered. Spilt water leaves the row's last plants with none. */
export function reached(s: LongPour): boolean[] {
  const n = s.places.length, x = s.spilt ? Infinity : s.at ?? -Infinity;
  return s.places.map((p, i) => x >= p + 0.5 && !(s.spilt && i >= Math.max(1, n - LONG.spill)));
}
/** How many seconds the water takes from setting off to the whole row. */
export function longSecs(s: LongPour): number {
  let lo = 0, hi = 60;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (frontAt(s, mid) < s.end) lo = mid; else hi = mid; }
  return hi;
}
