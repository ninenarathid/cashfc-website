import { TIMING, type TimingMods } from "./timing";

/**
 * The crescent sickle's sweep (lib/town/gifts' charmSickle, the farming line's fourth rank; the owner, 2026-10-07: a
 * power that does many at once has a longer, harder game of its own, and a miss costs a part of what it would have
 * given, never the whole): a game of its own, for picking a whole ripe row at once.
 *
 * The row lies across the board, each ripe plant at its own place in it. The blade sets off from before the first of
 * them and sweeps along the row **once**, gathering pace all the way; a swing as it passes a plant, close to the
 * plant's middle, cuts that plant well. A swing too early or too late in its plot cuts it badly, a plant passed with
 * no swing was cut badly too, and a swing where no plant stands is only air. There is one swing to a plant and no
 * going back: the sweep ends when the blade is past the last of them.
 *
 * Every plant of the row is picked whatever comes of it (lib/town/farm's rowTend): one cut well gives one more, one
 * cut badly what it would have given by hand. So nothing is lost by a poor sweep but what the sickle adds.
 *
 * A keen eye widens every cut (a meal's buff, as for the hoe); tired hands have a narrower cut and a quicker blade
 * (the hoe's own numbers for no stamina); and a plant that is harder for whoever sweeps (lib/town/farm's hardFor: a
 * crop of the second tier or better, from the farming line's fourth rank) has a narrower cut of its own.
 *
 * Pure: where the blade is comes of the time alone.
 */
export const SWEEP = {
  /** How wide a plant's cut is, as a share of its plot, and the widest it gets. */
  zone: 0.42, most: 0.8,
  /** The plots a second the blade begins at, and how many more with every second gone. */
  speed: 1.5, gain: 0.55,
  /** How far before the first plant's plot the blade sets off, and how far past the last one's it runs out, in plots. */
  lead: 0.9, tail: 0.15,
};

/**
 * A sweep as it stands: where each plant to cut stands in the row (its plot's number along it, the lowest first), how
 * wide each one's cut is, where the blade sets off and runs out, its pace and what it gains, how each plant was cut
 * (null: not swung at yet), and how many swings fell on air.
 */
export interface Sweep { places: number[]; bands: number[]; from: number; to: number; speed: number; gain: number; cut: Array<boolean | null>; air: number }

/** Begin a sweep over the plants at these places of a row (`hard`: how much harder each of them is for whoever sweeps, 1 where it is not). */
export function startSweep(places: readonly number[], mods: TimingMods = {}, hard: readonly number[] = []): Sweep {
  const at = [...places].map((p, i) => ({ p: Math.floor(p), h: Math.max(1, hard[i] ?? 1) })).sort((a, b) => a.p - b.p);
  const tired = mods.spent ? TIMING.spent : null;
  const band = (h: number) => Math.min(SWEEP.most, (SWEEP.zone * (tired ? tired.zone : 1) * (mods.buff ?? 1)) / h);
  const first = at.length ? at[0].p : 0, last = at.length ? at[at.length - 1].p : 0;
  return {
    places: at.map((a) => a.p), bands: at.map((a) => band(a.h)), from: first - SWEEP.lead, to: last + 1 + SWEEP.tail,
    speed: SWEEP.speed * (tired ? tired.speed : 1), gain: SWEEP.gain * (tired ? tired.speed : 1), cut: at.map(() => null), air: 0,
  };
}
/** Where the blade is along the row at a moment (seconds since it set off), in plots. */
export const bladeAt = (s: Sweep, t: number): number => { const u = Math.max(0, t); return s.from + s.speed * u + 0.5 * s.gain * u * u; };
/** How fast it is going then, in plots a second. */
export const paceAt = (s: Sweep, t: number): number => s.speed + s.gain * Math.max(0, t);
/** Whether the blade has run out: the sweep is over. */
export const swept = (s: Sweep, t: number): boolean => bladeAt(s, t) >= s.to;
/** The plant whose plot the blade is over at a moment, by its number among the plants (−1: none). */
export const over = (s: Sweep, t: number): number => { const x = bladeAt(s, t); return s.places.findIndex((p) => x >= p && x < p + 1); };
/** A swing at a moment: the plant the blade is over is cut, well when the blade is within its cut, badly otherwise; a plant is cut once. */
export function swing(s: Sweep, t: number): Sweep {
  if (swept(s, t)) return s;
  const i = over(s, t);
  if (i < 0 || s.cut[i] !== null) return { ...s, air: s.air + 1 };
  const well = Math.abs(bladeAt(s, t) - (s.places[i] + 0.5)) <= s.bands[i] / 2;
  return { ...s, cut: s.cut.map((c, j) => (j === i ? well : c)) };
}
/** How each plant came out of it, in the order they stand: true, cut well; false, cut badly or passed with no swing. */
export const cuts = (s: Sweep): boolean[] => s.cut.map((c) => c === true);
/** How many seconds a whole sweep takes. */
export const sweepSecs = (s: Sweep): number => (Math.sqrt(s.speed * s.speed + 2 * s.gain * (s.to - s.from)) - s.speed) / s.gain;
