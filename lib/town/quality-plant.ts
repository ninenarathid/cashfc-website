/**
 * A plant's Quality as it stands in the ground: what part of its round it has grown by a moment, what its own hand
 * work covers and for how long, and the settle that keeps its round (`Plant.q`) whenever the plant changes. The
 * rules themselves are lib/town/quality; the database settles the same way in a trigger on `town_plots`, before any
 * change of a plant, as the browser's trial does in its one write of the farm (`syncQuality`).
 *
 * Hand work covers half a bar (agreed with Codex, 2026-10-15): a watering 26 hours (one a day keeps it); rain while it
 * falls and 12 hours after; a damp furrow the plant's whole life; compost from when it is put on to the plant's last
 * bearing (once a planting); the pollen brush from the brushing to ripeness (once a round); a guard (pest-proof
 * fertiliser, the cure, moon water) until it runs out; a released pollinator until its `pollenUntil`.
 */
import { CROPS } from "./items";
import { encoreHours, grown, quickMs, type FarmSky, type Plant, type Plot } from "./farm";
import { HOUR } from "./trade";
import { DRY, type Rain } from "./weather";
import { NO_Q, QUALITY, accrue, barsOfQ, ceilingOf, chancesOf, narrowingOfQ, rangeOf, type Cover, type PlantQ } from "./quality";

export const HAND = {
  /** How long a watering keeps the water bar's half. */
  water: 26 * HOUR,
  /** How long the ground stays wet after rain stops. */
  afterRain: 12 * HOUR,
  /** Hand work's share of a bar. */
  level: 0.5,
};

const rainsIn = (sky: FarmSky): readonly Rain[] => ("rains" in sky ? sky.rains : sky);

/** When the plant's present round began: its sowing, or its last picking for a plant that bears again. */
export const roundStart = (p: Plant): number => (p.picked > 0 ? p.pickedAt : p.sown);

/** The part of its present round a plant has grown by a moment, 0 to 1 (stops at 1 when it is ripe). */
export function progressOf(p: Plant, rains: FarmSky = DRY): (t: number) => number {
  const c = CROPS[p.crop];
  if (p.picked === 0) return (t) => Math.min(1, Math.max(0, grown(p, t, rains) / c.hours));
  // (a bearing after the first waits the crop's own while; one the mandrake sang to, the same: encoreHours)
  const wait = encoreHours(p.crop);
  return (t) => Math.min(1, Math.max(0, (t - p.pickedAt + quickMs(p, p.pickedAt, t)) / HOUR / wait));
}

/**
 * What the plant's own record covers, as stretches of time. A guard and a pollinator are kept only as the moment they
 * run out, so they count from the round's last settle (`from`): the settle before every change makes that exact.
 */
export function handCovers(p: Plant, from: number, rains: FarmSky = DRY): Cover[] {
  const half = HAND.level, end = Number.MAX_SAFE_INTEGER, out: Cover[] = [];
  if (p.watered > 0) out.push({ role: "water", level: half, from: p.watered, to: p.watered + HAND.water });
  if (p.moist) out.push({ role: "water", level: half, from: p.sown, to: end });
  for (const [a, b] of rainsIn(rains)) out.push({ role: "water", level: half, from: a, to: b + HAND.afterRain });
  if (p.localRain) out.push({ role: "water", level: half, from: p.localRain.from, to: p.localRain.until + HAND.afterRain });
  if (typeof p.wetUntil === "number") out.push({ role: "water", level: half, from, to: p.wetUntil });
  if (typeof p.compost === "number") out.push({ role: "soil", level: half, from: p.compost, to: end });
  if (typeof p.brushed === "number" && p.brushed >= roundStart(p)) out.push({ role: "pollen", level: half, from: p.brushed, to: end });
  if (typeof p.pollenUntil === "number") out.push({ role: "pollen", level: half, from, to: p.pollenUntil });
  if (p.guard > 0) out.push({ role: "guard", level: half, from, to: p.guard });
  return out;
}

/** A plant's round settled to a moment (nothing counts before `launch`). */
export function settled(p: Plant, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch): PlantQ {
  const q = p.q ?? NO_Q(Math.max(launch, roundStart(p)));
  return now > q.at ? accrue(q, now, progressOf(p, rains), handCovers(p, q.at, rains)) : q;
}

/** The same planting before and after a change (and not one sown in its place). */
const samePlanting = (a: Plant, b: Plant): boolean => a.sown === b.sown && a.crop === b.crop && a.by === b.by;

/**
 * The farm about to be written: every plant that changed has its round settled up to now as it stood before the
 * change, so what comes after counts from now; a plant picked starts a new round. (The trigger on `town_plots` does
 * this in the database.)
 */
export function syncQuality(before: Readonly<Record<string, Plot>>, after: Record<string, Plot>, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch): Record<string, Plot> {
  let out = after;
  for (const [key, plot] of Object.entries(after)) {
    const p = plot?.plant, was = before[key]?.plant;
    if (!p || !was || was === p || (p.root && p.root !== key) || !samePlanting(was, p)) continue;
    const q = p.picked > was.picked ? NO_Q(Math.max(launch, now)) : settled(was, now, rains, launch);
    if (out === after) out = { ...after };
    out[key] = { ...plot, plant: { ...p, q } };
  }
  return out;
}

/** What the inspector shows of a plant now: its bars, how far its floor is raised, its range and each grade's chance. */
export function qualityNow(p: Plant, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch) {
  const q = settled(p, now, rains, launch), bars = barsOfQ(q), narrowing = narrowingOfQ(q, typeof p.brushed === "number" && p.brushed >= roundStart(p)), range = rangeOf(ceilingOf(bars), narrowing);
  return { bars, narrowing, range, chances: chancesOf(range), grown: progressOf(p, rains)(now) };
}
