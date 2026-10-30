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
import { FARMING, encoreHours, grown, homeOf, quickMs, regrowMs, roll, type FarmSky, type Plant, type Plot } from "./farm";
import { HOUR } from "./trade";
import { DRY, type Rain } from "./weather";
import { COMPANIONS, NO_Q, PARTNERS, QUALITY, ROLES, accrue, barsOfQ, ceilingOf, chancesOf, coveredShare, gradeOf, narrowingOfQ, rangeOf, rollOne, type BedGift, type CompanionId, type Cover, type Grade, type NarrowCover, type Penalty, type PlantQ, type Range, type Role } from "./quality";
import { bedOf } from "./world";
import { HOUSE, houseCovers } from "./insect-house";
import { FERTS, type Fert, type FertId } from "./fertilisers";

export const HAND = {
  /** The stamina the farm's own care costs: compost put on a plant, the pollen brush. */
  costs: { compost: 1, brush: 2, fert: 1 },
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
  // (a bearing after the first waits the crop's own while, less what water has added since; one the mandrake sang to, the same: encoreHours)
  const wait = encoreHours(p.crop);
  return (t) => Math.min(1, Math.max(0, (t - p.pickedAt + quickMs(p, p.pickedAt, t) + regrowMs(p, t, rains)) / HOUR / wait));
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
  // (its fertilisers of Quality, lib/town/fertilisers: a base to the first picking, a top for its hours)
  if (p.base && p.picked === 0 && FERTS[p.base.item]) for (const r of ROLES) { const level = (FERTS[p.base.item].bars as Partial<Record<Role, number>>)[r]; if (level) out.push({ role: r, level, from: p.base.at, to: end, src: "base" }); }
  if (p.top && FERTS[p.top.item]) for (const r of ROLES) { const level = (FERTS[p.top.item].bars as Partial<Record<Role, number>>)[r]; if (level) out.push({ role: r, level, from: p.top.at, to: p.top.until ?? p.top.at, src: "top" }); }
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
 * (✚), fennel touching it (✚) taking soil, and the rooms of the bed's insect house that reaches it. Nothing for a plant
 * alone. (A dead helper helps until it is taken out.)
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
    if (o.crop === "fennel" && touching(mine, theirs)) fennel += QUALITY.fennel;
  }
  const cs = Object.fromEntries(ROLES.filter((r) => c[r]).map((r) => [r, c[r]!])) as Partial<Record<Role, number>>;
  const h = houseCovers(mine, plots);
  const gift: BedGift = { ...(Object.keys(cs).length ? { c: cs } : {}), ...(partner ? { p: 1 as const } : {}), ...(fennel ? { f: fennel } : {}), ...(h.length ? { h } : {}) };
  return Object.keys(gift).length ? gift : undefined;
}

/** What a round's bed gift covers, narrows and takes, from the round's last settle on (it holds until the bed changes). */
function giftOf(q: PlantQ): { covers: Cover[]; narrows: NarrowCover[]; penalties: Penalty[] } {
  const g = q.bed;
  return {
    covers: [...ROLES.flatMap((role) => (g?.c?.[role] ? [{ role, level: g.c[role]!, from: 0, to: END, src: "helper" }] : [])),
      ...(g?.h ?? []).map((e) => ({ role: e.r, level: HOUSE.level * e.s, from: e.from, to: e.to, src: "house" }))],
    narrows: [...(g?.p ? [{ kind: "partner" as const, from: 0, to: END }] : []), ...(g?.h ?? []).filter((e) => e.x).map((e) => ({ kind: "rare" as const, from: e.from, to: e.to, share: e.s }))],
    penalties: g?.f ? [{ role: "soil", points: g.f, from: 0, to: END }] : [],
  };
}

/** What a three-day packet on it narrows while it lasts (lib/town/fertilisers' `narrows`). */
export const fertNarrows = (p: Plant): NarrowCover[] =>
  p.top && (FERTS[p.top.item] as { narrows?: true } | undefined)?.narrows ? [{ kind: "packet", from: p.top.at, to: p.top.until ?? p.top.at }] : [];

/** A plant's round settled to a moment (nothing counts before `launch`). */
export function settled(p: Plant, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch): PlantQ {
  const q = p.q ?? NO_Q(Math.max(launch, roundStart(p)));
  if (!(now > q.at)) return q;
  const g = giftOf(q);
  return accrue(q, now, progressOf(p, rains), [...handCovers(p, q.at, rains), ...g.covers], g.penalties, [...g.narrows, ...fertNarrows(p)]);
}

/** Whether two gifts of a bed are the same (none and none alike). */
const sameGift = (a: BedGift | undefined, b: BedGift | undefined): boolean =>
  (a?.p ?? 0) === (b?.p ?? 0) && (a?.f ?? 0) === (b?.f ?? 0) && ROLES.every((r) => (a?.c?.[r] ?? 0) === (b?.c?.[r] ?? 0))
  && (a?.h ?? []).length === (b?.h ?? []).length
  && (a?.h ?? []).every((e, i) => { const f = b!.h![i]; return e.r === f.r && e.from === f.from && e.to === f.to && e.s === f.s && (e.x ?? 0) === (f.x ?? 0) && (e.k ?? 0) === (f.k ?? 0); });
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
  const beds = new Set<number>(), done = new Set<string>(), fresh = new Set<string>();
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    // (an insect house set, filled or lifted changes the bed around it, as a plant does)
    if (JSON.stringify(before[key]?.house ?? null) !== JSON.stringify(after[key]?.house ?? null)) beds.add(keyBed(key));
    const was = rootAt(before, key), p = rootAt(after, key);
    if (!was && !p) continue;
    if (was && p && samePlanting(was, p)) {
      if (was === p) continue;
      // (a pick: a new round, the bed's gift kept as it is; any other change: the round as it stood, settled)
      if (was.q) {
        set(key, { ...p, q: p.picked > was.picked ? { ...NO_Q(Math.max(launch, now)), ...(was.q.bed ? { bed: was.q.bed } : {}) } : settled(was, now, rains, launch) });
        done.add(key);
        continue;
      }
      // (one with no round yet, growing when Quality came: its first, settled with what the bed gives it, which has
      // stood since then, for a change of the bed would have given it a round)
      fresh.add(key);
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
    if (same && !fresh.has(key) && sameGift(p.q?.bed, gift)) continue;
    const q = done.has(key) ? p.q!
      : fresh.has(key) ? (p.picked > was!.picked ? NO_Q(Math.max(launch, now)) : settled({ ...was!, q: { ...NO_Q(Math.max(launch, roundStart(was!))), ...(gift ? { bed: gift } : {}) } }, now, rains, launch))
      : same ? settled(was!, now, rains, launch) : p.q ?? NO_Q(Math.max(launch, roundStart(p)));
    // (one set down here with a round already, which the hoe moved: the house here keeps pests off it from now, lib/town/farm's houseKeepAt)
    const arrived = !same && !!p.q, { bed: _, ...rest } = q, { hg: _hg, hs: _hs, ...bare } = p, hg = houseKept(p, q.bed, gift, now, arrived), hs = arrived ? now : p.hs;
    set(key, { ...bare, ...(hg ? { hg } : {}), ...(hs !== undefined ? { hs } : {}), q: gift ? { ...rest, bed: gift } : rest });
  }
  return out;
}

/**
 * What a plant keeps of the stretches its bed's insect house kept pests off it (lib/town/farm's houseKeepAt), as its gift
 * changes from `was` to `gift`: those it had (`hg`), and each guard room of the gift it had that the new one does not
 * hold (a room filled again, the house lifted, the plant moved out of reach), from when it stood there (`hs`) up to
 * now; every one of them when the plant has `arrived` somewhere else. Only what can still bear on its pests: a stretch
 * over before it was sown, last cured or picked is dropped. In order, each once. (The database's trigger keeps the
 * same, town.house_kept.)
 */
export function houseKept(p: Plant, was: BedGift | undefined, gift: BedGift | undefined, now: number, arrived = false): Array<[number, number, number]> | undefined {
  // (each with how often it kept a pest off: a gift written before that was, as the weakest hunter, FARMING.pests.house.old)
  const old = FARMING.pests.house.old, start = Math.max(p.sown, p.cured, p.pickedAt), still = (gift?.h ?? []).filter((e) => e.r === "guard");
  const out: Array<[number, number, number]> = (p.hg ?? []).map(([a, b, k]) => [a, b, k ?? old]);
  for (const e of was?.h ?? []) {
    if (e.r !== "guard" || (!arrived && still.some((f) => f.from === e.from && f.to === e.to && (f.k ?? old) === (e.k ?? old)))) continue;
    const from = Math.max(e.from, p.hs ?? 0), to = Math.min(e.to, now);
    if (to > from) out.push([from, to, e.k ?? old]);
  }
  const kept = out.filter(([, b]) => b > start).sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2])
    .filter((x, i, a) => i === 0 || x[0] !== a[i - 1][0] || x[1] !== a[i - 1][1] || x[2] !== a[i - 1][2]);
  return kept.length ? kept : undefined;
}

/**
 * A move of the enchanted hoe's laid on the farm (lib/town/farm's movePlant: `moved` is the two plots as it leaves them),
 * as the database lays it (v273): first the two plots emptied, then the plants set down in their new places, each a
 * change of the bed. In two steps, so that a plant set where another of the same sowing stood (two sown at one moment
 * from the seed pouch, changing places) is never taken for that one, and given its round.
 */
export function syncMove(before: Readonly<Record<string, Plot>>, moved: Readonly<Record<string, Plot>>, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch): Record<string, Plot> {
  const emptied = syncQuality(before, { ...before, ...Object.fromEntries(Object.keys(moved).map((k) => [k, { soil: "tilled", plant: null } as Plot])) }, now, rains, launch);
  return syncQuality(emptied, { ...emptied, ...moved }, now, rains, launch);
}

/** What the inspector shows of a plant now: its bars, how far its floor is raised, its range and each grade's chance. */
export function qualityNow(p: Plant, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch) {
  const q = settled(p, now, rains, launch), bars = barsOfQ(q), narrowing = narrowingOfQ(q, typeof p.brushed === "number" && p.brushed >= roundStart(p)), range = rangeOf(ceilingOf(bars), narrowing);
  return { bars, narrowing, range, chances: chancesOf(range), grown: progressOf(p, rains)(now) };
}

/**
 * How much a fertiliser put on now would raise a plant's ceiling by its ripeness (lib/town/fertilisers): the round
 * settled far ahead with it and without it, everything else alike, so that what differs is the fertiliser's alone.
 * What the page shows over each plant it could go on while one is held.
 */
export function fertGain(p: Plant, item: FertId, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch): number {
  const f = FERTS[item] as Fert, far = now + 40 * 24 * HOUR, q = settled(p, now, rains, launch);
  const on: Plant = { ...p, q, ...(f.slot === "base" ? { base: { item, at: now } } : { top: { item, at: now, until: now + (f.hours ?? 0) * HOUR } }) };
  const ceil = (x: Plant) => ceilingOf(barsOfQ(settled(x, far, rains, launch)));
  return ceil(on) - ceil({ ...p, q });
}

/** What covers each bar at a moment, the best of them (and, among the best, the one that lasts longest): what the inspector names. */
export function coveringNow(p: Plant, now: number, rains: FarmSky = DRY): Partial<Record<Role, Cover>> {
  const out: Partial<Record<Role, Cover>> = {};
  for (const c of [...handCovers(p, now, rains), ...(p.q ? giftOf(p.q).covers : [])]) {
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
 * They are drawn by the plot the plant was sown at, should the enchanted hoe have moved it since (lib/town/farm's
 * homeOf). `top`: every fruit at the top of the range, with no draw (the mandrake that follows whoever picks their own
 * plant: lib/town/farm's atTop).
 */
export function harvestOf(key: string, p: Plant, n: number, now: number, rains: FarmSky = DRY, launch: number = QUALITY.launch, salt = "", from = 0, top = false):
  { range: Range; values: number[]; groups: Array<[Grade, number]> } {
  const q = settled(p, now, rains, launch), brushed = typeof p.brushed === "number" && p.brushed >= roundStart(p);
  const range = rangeOf(ceilingOf(barsOfQ(q)), narrowingOfQ(q, brushed)), home = homeOf(key, p);
  // (fruits after the pick's own, the garden twine's and the sickle's, are drawn as the fruits that follow: `from` on)
  const values = Array.from({ length: n }, (_, i) => (top ? range.hi : rollOne(range, () => roll(`quality|${salt}|${home}`, p.sown, p.picked, from + i))));
  const count = [0, 0, 0, 0];
  for (const v of values) count[gradeOf(v)]++;
  return { range, values, groups: ([0, 1, 2, 3] as const).filter((g) => count[g] > 0).map((g) => [g, count[g]] as [Grade, number]) };
}
