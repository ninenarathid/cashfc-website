import type { Plot } from "./farm";
import { BANGKOK, DAY, HOUR } from "./trade";
import type { Sky } from "./weather";

/**
 * A hot afternoon (the owner, 2026-10-05, of the members who carry water for
 * the others: one of nine things thought of for them, "ชอบทุกข้อเลยครับ").
 *
 * From noon to four, under a clear sky, the plots are parched: **a watering
 * done then does as much again**. Water is worth carrying most when the sun
 * is highest, and whoever comes with a can or a bucket then is twice as
 * welcome. Nothing dies of the heat, and a plant nobody waters loses nothing:
 * it is a reason to come, never a punishment for staying away.
 *
 * What it comes to: a plant watered on every hour of such an afternoon has
 * four waterings' worth more than on another day (two hours of growth with a
 * plain can). Rain gives as much for nothing in four hours of falling.
 *
 * Nothing says so. The plots show it: over a plant that could do with water
 * the air shimmers (components/town/TownFarm).
 *
 * Pure. The database does the same as it keeps a plot (v130: a trigger on
 * `town_plots`, so that whatever waters a plant is counted alike: a can,
 * a bucket poured over the bed).
 */
export const HEAT = {
  /** The hours of the day (Bangkok) it can be hot in: from the first, up to the second. */
  from: 12,
  to: 16,
  /** The skies it is hot under. */
  skies: ["clear"] as Sky[],
  /** How much more a watering does then: so many times what it added, on top. */
  by: 1,
};

const hourOf = (now: number) => Math.floor((((now + BANGKOK) % DAY) + DAY) % DAY / HOUR);
/** Whether it is hot at a moment, under the sky of that moment (null when the sky is not known: then it is not). */
export const hotAt = (now: number, sky: Sky | null | undefined): boolean =>
  !!sky && HEAT.skies.includes(sky) && hourOf(now) >= HEAT.from && hourOf(now) < HEAT.to;

/**
 * A plot as it is kept, written at `now` over what it `was`: when what was written is a watering (the same plant,
 * watered at this moment and not before) and it is hot, what the watering added is added once more.
 */
export function warmed(was: Plot | undefined, next: Plot, now: number, sky: Sky | null | undefined): Plot {
  const a = was?.plant, b = next.plant;
  if (!a || !b || a.sown !== b.sown || b.watered !== now || a.watered >= now) return next;
  const added = b.boost - a.boost;
  if (!(added > 0) || !hotAt(now, sky)) return next;
  return { ...next, plant: { ...b, boost: b.boost + added * HEAT.by } };
}
