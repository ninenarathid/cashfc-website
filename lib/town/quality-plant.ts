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
import { encoreHours, grown, quickMs, roll, type FarmSky, type Plant, type Plot } from "./farm";
import { HOUR } from "./trade";
import { DRY, type Rain } from "./weather";
import { COMPANIONS, NO_Q, PARTNERS, QUALITY, ROLES, accrue, barsOfQ, ceilingOf, chancesOf, coveredShare, gradeOf, narrowingOfQ, rangeOf, rollOne, type BedGift, type CompanionId, type Cover, type Grade, type NarrowCover, type Penalty, type PlantQ, type Range, type Role } from "./quality";
import { bedOf } from "./world";

export const HAND = {
  /** The stamina the farm's own care costs: compost put on a plant, the pollen brush. */
  costs: { compost: 1, brush: 2 },
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
  if (p.watered > 0) out.push({ role: "water", level: half, from: p.watered, to: p.watered + HAND.water, src: "watered" });
  if (p.moist) out.push({ role: "water", level: half, from: p.sown, to: end, src: "damp" });
  for (const [a, b] of rainsIn(rains)) out.push({ role: "water", level: half, from: a, to: b + HAND.afterRain, src: "rain" });
  if (p.localRain) out.push({ role: "water", level: half, from: p.localRain.from, to: p.localRain.until + HAND.afterRain, src: "cloud" });
  if (typeof p.wetUntil === "number") out.push({ role: "water", level: half, from, to: p.wetUntil, src: "wet" });
  if (typeof p.compost === "number") out.push({ role: "soil", level: half, from: p.compost, to: end, src: "compost" });
  if (typeof p.brushed === "number" && p.brushed >= roundStart(p)) out.push({ role: "pollen", level: half, from: p.brushed, to: end, src: "brush" });
  if (typeof p.pollenUntil === "number") out.push({ role: "pollen", level: half, from, to: p.pollenUntil, src: "pollinator" });
  if (p.guard > 0) out.push({ role: "guard", level: half, from, to: p.guard, src: "guard" });
  return out;
}

/* ── the bed around a plant ── */

const END = Number.MAX_SAFE_INTEGER;
const cellsOf = (key: string, p: Plant): string[] => p.footprint ?? [key];
const touching = (a: readonly string[], b: readonly string[]): boolean =>
  a.some((c) => { const [x, y] = c.split(",").map(Number); return b.some((d) => { const [u, v] = d.split(",").map(Number); return Math.abs(x - u) + Math.abs(y - v) === 1; }); });
const keyBed = (key: string): number => { const [x, y] = key.split(",").map(Number); return bedOf(x, y); };
/** The plant whose root is a plot, if one is. */
const rootAt = (plots: Readonly<Record<string, Plot>>, key: string): Plant | null => { const p = plots[key]?.plant; return p && (!p.root || p.root === key) ? p : null; };

/**
 * What the bed gives a plant now: the helpers of its bed by their shapes (each role's best), its partner touching it
 * (✚), and fennel touching it (✚) taking soil. Nothing for a plant alone. (A dead helper helps until it is taken out.)
 */
export function bedGift(key: string, plots: Readonly<Record<string, Plot>>): BedGift | undefined {
  const p = rootAt(plots, key);
  if (!p) return undefined;
  const mine = cellsOf(key, p), bed = keyBed(key), c: Partial<Record<Role, number>> = {};
  let partner = false, fennel = 0;
  for (const other of Object.keys(plots).sort()) {
    const o = other === key ? null : rootAt(plots, other);
    if (!o || keyBed(other) !== bed) continue;
    const theirs = cellsOf(other, o), helper = COMPANIONS[o.crop as CompanionId];
    if (helper) {
      const share = coveredShare(mine, other, helper.shape, o.rotation ?? 0, theirs);
      if (share > 0) c[helper.role] = Math.max(c[helper.role] ?? 0, share);
    }
    if (PARTNERS[p.crop] === o.crop && touching(mine, theirs)) partner = true;
    if ((o.crop as string) === "fennel" && touching(mine, theirs)) fennel += QUALITY.fennel;
  }
  const cs = Object.fromEntries(ROLES.filter((r) => c[r]).map((r) => [r, c[r]!])) as Partial<Record<Role, number>>;
  const gift: BedGift = { ...(Object.keys(cs).length ? { c: cs } : {}), ...(partner ? { p: 1 as const } : {}), ...(fennel ? { f: fennel } : {}) };
  return Object.keys(gift).length ? gift : undefined;
}

/** What a round's bed gift covers, narrows and takes, from the round's last settle on (it holds until the bed changes). */
function giftOf(q: PlantQ): { covers: Cover[]; narrows: NarrowCover[]; penalties: Penalty[] } {
  const g = q.bed;
  return {
    covers: ROLES.flatMap((role) => (g?.c?.[role] ? [{ role, level: g.c[role]!, from: 0, to: END, src: "helper" }] : [])),
    narrows: g?.p ? [{ kind: "partner", from: 0, to: END }] : [],
    penalties: g?.f ? [{ role: "soil", points: g.f, from: 0, to: END }] : [],
  };
}

/** A plant's round settled to a moment (nothing counts before `launch`). */
export function settled(p: Plant, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch): PlantQ {
  const q = p.q ?? NO_Q(Math.max(launch, roundStart(p)));
  if (!(now > q.at)) return q;
  const g = giftOf(q);
  return accrue(q, now, progressOf(p, rains), [...handCovers(p, q.at, rains), ...g.covers], g.penalties, g.narrows);
}

/** Whether two gifts of a bed are the same (none and none alike). */
const sameGift = (a: BedGift | undefined, b: BedGift | undefined): boolean =>
  (a?.p ?? 0) === (b?.p ?? 0) && (a?.f ?? 0) === (b?.f ?? 0) && ROLES.every((r) => (a?.c?.[r] ?? 0) === (b?.c?.[r] ?? 0));
/** The same planting before and after a change (and not one sown in its place). */
const samePlanting = (a: Plant, b: Plant): boolean => a.sown === b.sown && a.crop === b.crop && a.by === b.by;

/**
 * The farm about to be written: every plant that changed has its round settled up to now as it stood before the
 * change, so what comes after counts from now; a plant picked starts a new round. (The trigger on `town_plots` does
 * this in the database.)
 */
export function syncQuality(before: Readonly<Record<string, Plot>>, after: Record<string, Plot>, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch): Record<string, Plot> {
  let out = after;
  const set = (key: string, plant: Plant) => { if (out === after) out = { ...after }; out[key] = { ...out[key], plant }; };
  const beds = new Set<number>(), done = new Set<string>();
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const was = rootAt(before, key), p = rootAt(after, key);
    if (!was && !p) continue;
    if (was && p && samePlanting(was, p)) {
      if (was === p) continue;
      // (a pick: a new round, the bed's gift kept as it is; any other change: the round as it stood, settled)
      set(key, { ...p, q: p.picked > was.picked ? { ...NO_Q(Math.max(launch, now)), ...(was.q?.bed ? { bed: was.q.bed } : {}) } : settled(was, now, rains, launch) });
      done.add(key);
      continue;
    }
    // a plant set, taken out or put in another's place: the bed around it changes
    beds.add(keyBed(key));
  }
  if (!beds.size) return out;
  // every plant of a bed that changed whose gift changes with it (and one newly set): settled with what the bed gave it
  // until now, and given what it gives it from now (the database's trigger does the same, and no more)
  for (const key of Object.keys(out)) {
    const p = rootAt(out, key);
    if (!p || !beds.has(keyBed(key))) continue;
    const was = rootAt(before, key), same = !!was && samePlanting(was, p), gift = bedGift(key, out);
    if (same && sameGift(p.q?.bed, gift)) continue;
    const q = done.has(key) ? p.q! : same ? settled(was!, now, rains, launch) : p.q ?? NO_Q(Math.max(launch, roundStart(p)));
    const { bed: _, ...rest } = q;
    set(key, { ...p, q: gift ? { ...rest, bed: gift } : rest });
  }
  return out;
}

/** What the inspector shows of a plant now: its bars, how far its floor is raised, its range and each grade's chance. */
export function qualityNow(p: Plant, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch) {
  const q = settled(p, now, rains, launch), bars = barsOfQ(q), narrowing = narrowingOfQ(q, typeof p.brushed === "number" && p.brushed >= roundStart(p)), range = rangeOf(ceilingOf(bars), narrowing);
  return { bars, narrowing, range, chances: chancesOf(range), grown: progressOf(p, rains)(now) };
}

/** What covers each bar at a moment, the best of them (and, among the best, the one that lasts longest): what the inspector names. */
export function coveringNow(p: Plant, now: number, rains: FarmSky = DRY): Partial<Record<Role, Cover>> {
  const out: Partial<Record<Role, Cover>> = {};
  for (const c of handCovers(p, now, rains)) {
    if (!(c.from <= now && now < c.to)) continue;
    const was = out[c.role];
    if (!was || c.level > was.level || (c.level === was.level && c.to > was.to)) out[c.role] = c;
  }
  return out;
}

/**
 * A pick's fruits: the round's range as it stands (ripe, so frozen), and one even roll a fruit. The draws are the same
 * for the same plant, picking and fruit (a retry with a full bag gives the same fruits, never a new roll). The database
 * draws with md5 over a salt of its own that no browser sees; with an empty salt (the trial, the bench) it draws as here.
 */
export function harvestOf(key: string, p: Plant, n: number, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch, salt = "", from = 0):
  { range: Range; values: number[]; groups: Array<[Grade, number]> } {
  const q = settled(p, now, rains, launch), brushed = typeof p.brushed === "number" && p.brushed >= roundStart(p);
  const range = rangeOf(ceilingOf(barsOfQ(q)), narrowingOfQ(q, brushed));
  // (fruits after the pick's own, the garden twine's and the sickle's, are drawn as the fruits that follow: `from` on)
  const values = Array.from({ length: n }, (_, i) => rollOne(range, () => roll(`quality|${salt}|${key}`, p.sown, p.picked, from + i)));
  const count = [0, 0, 0, 0];
  for (const v of values) count[gradeOf(v)]++;
  return { range, values, groups: ([0, 1, 2, 3] as const).filter((g) => count[g] > 0).map((g) => [g, count[g]] as [Grade, number]) };
}
