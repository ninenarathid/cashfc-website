import { FIELD } from "./gear";
import { BUFFS, CROPS, CROP_IDS, ITEMS, growth, type CropId, type ItemId } from "./items";
import { buffOf, spend } from "./stamina";
import { BANGKOK, DAY, HOUR, handOf, held, no, put, roomFor, take, type Done, type Purse, type Refusal, type Stack } from "./trade";

/**
 * Growing vegetables, as rules (the owner, 2026-10-03; lib/town/items has the
 * vegetables themselves). A plot of the farm goes from weeds to cleared ground
 * to tilled soil, with a hoe; one seed is sown in it; the plant grows through
 * five stages by the real clock (the first of them only what was sown, lying
 * in the ground) and is picked; some bear again. Along the way:
 *
 * - **A bed belongs to whoever sows in it first, the whole bed** ("เพื่อไม่ให้
 *   แย่งแปลงปลูกผักกัน ใครเริ่ม หว่านเมล้ดคนแรก แปลงจะเป็นของคนนั้นทั้งแปลง"): only its
 *   owner hoes, sows and picks there. It is free again when it has stood with
 *   nothing growing for more than a day, or has plants its owner has not
 *   tended for more than four days.
 * - **Watering** adds half an hour of growth, once an hour for each plot, and
 *   anybody may water anybody's plant; half as much again from somebody a meal
 *   has left with green fingers. **A can has to have water in it**
 *   ("บัวรดน้ำต้องเติมน้ำก่อน เติม 1 ถังรดได้ 5-10 ครั้งสำหรับ tier แรก"): it is filled at
 *   the well in the middle of the farm, a bucket of the well's water to a
 *   can; and **the well is filled by buckets carried from the river** ("ต้องมี
 *   คนขนน้ำมาจากแม่น้ำมาใส่บ่อตรงกลางแมพแปลงผัก").
 * - **Fertiliser**: one kind makes a plant grow faster from then on, the other
 *   keeps pests off it for a day.
 * - **Pests** strike a growing plant only between 08:00 and 18:00; one left
 *   for more than six hours kills it (so the six hours always end before
 *   midnight); anybody may cure anybody's plant. A dead plant, pulled up,
 *   leaves compost. A ripe plant is safe: nothing is lost by coming late to
 *   pick it.
 *
 * What is done depends on what is in the hand: a hoe, a seed, a watering can,
 * a bucket, a fertiliser, a cure; a sickle or shears pick more. Nothing says
 * which: that is for the players to find ("ส่วนใหญ่ผมอยากให้ ผู้เล่น หาข้อมูลกันเอา
 * เอง").
 *
 * Pure: every function is given the moment and gives back new things. Whether
 * a pest has struck is not kept but worked out from the plot and the hours
 * gone by, the same for everybody who looks.
 */
export const FARMING = {
  /** Stamina: clearing weeds, tilling, pulling up a dead plant, sowing, watering, feeding, curing, picking. */
  costs: { clear: 4, till: 4, pull: 2, sow: 1, water: 1, feed: 1, cure: 1, pick: 2 },
  /** A watering: the minutes of growth it adds, and the minutes before the same plot can be watered again. */
  water: { adds: 30, every: 60 },
  /** Growth fertiliser: how many times as fast a plant grows from when it is put on. */
  feed: 1.25,
  /** Pest-proof fertiliser: the hours it covers a plant. */
  guard: 24,
  /** Pests: the hours of the day (Bangkok) they strike in, the chance for a growing plant in each of those hours, and the hours after which a plant left to them dies. */
  pests: { from: 8, to: 18, chance: 0.03, kills: 6 },
  /** How many hits of the hoe it takes to clear a plot of weeds, and to till it. */
  swings: { clear: 3, till: 3 },
  /** What a dead plant leaves when it is pulled up. */
  pulled: "compost" as ItemId,
};
/** The hoes. */
export const HOES: ItemId[] = ["hoe", "hoeIron", "hoeSteel"];
/** The blades that pick one more: shears for a tree or a bush that bears for a season, a sickle for the rest; and how many pickings make a plant one of the first. */
export const BLADES: { tree: ItemId; plant: ItemId } = { tree: "shears", plant: "sickle" };
export const TREE_PICKS = 5;
/** Water: how many waterings each can holds when full, how many bucketfuls each bucket carries, how many the well holds, and the stamina to draw a bucket at the river, pour it into the well, and fill a can there. */
export const WATER = {
  cans: { can: 8, canCopper: 12, canBrass: 18 } as Partial<Record<ItemId, number>>,
  buckets: { bucket: 1, bucketIron: 2 } as Partial<Record<ItemId, number>>,
  well: 40,
  costs: { draw: 2, pour: 1, fill: 1 },
};
/**
 * A bed's keeping: the hours it may stand with nothing growing, and with
 * plants its owner has not tended, before it is free again; and how many beds
 * one person may hold at a time (not the owner's own number: without one, a
 * seed in each bed would hold the whole farm).
 */
export const BEDS = { empty: 24, untended: 96, each: 2 };

export type Soil = "wild" | "cleared" | "tilled";
/** A plant in a plot: who sowed it, what, and what has been done to it. Times are milliseconds. */
export interface Plant {
  by: string;
  crop: CropId;
  sown: number;
  /** Growth added by watering. */
  boost: number;
  /** When it was last watered, when growth fertiliser was put on it, until when it is covered against pests, and when it was last cured: each 0 when never. */
  watered: number;
  fed: number;
  guard: number;
  cured: number;
  /** How many times it has been picked, and when last. */
  picked: number;
  pickedAt: number;
}
export interface Plot { soil: Soil; plant: Plant | null }
export const WILD: Plot = { soil: "wild", plant: null };
/** A plot's name in the farm's keeping: its tile. */
export const plotKey = (tx: number, ty: number) => `${tx},${ty}`;
/** A bed's keeping: whose it is, when its owner last tended it, and since when nothing has grown in it (0 while something does). */
export interface Bed { by: string; tended: number; empty: number }
/** Whose a bed is at a moment, there being plants in it or not: nobody's when it was never sown, or has lapsed. */
export function ownerOf(bed: Bed | undefined, planted: boolean, now: number): string | null {
  if (!bed) return null;
  if (planted ? now - bed.tended > BEDS.untended * HOUR : now - (bed.empty || bed.tended) > BEDS.empty * HOUR) return null;
  return bed.by;
}

/** Which vegetable a seed grows, if it is one. */
export const cropOf = (seed: ItemId | null | undefined): CropId | null => (seed ? CROP_IDS.find((c) => CROPS[c].seed === seed) ?? null : null);
const isHoe = (id: ItemId | null) => !!id && HOES.includes(id);
const isCan = (id: ItemId | null) => !!id && id in WATER.cans;
/** What can be done to a plot with a thing in the hand, by its kind. */
export const toolOf = (hand: ItemId | null): "hoe" | "can" | "seed" | "feed" | "guard" | "cure" | null =>
  (isHoe(hand) ? "hoe" : isCan(hand) ? "can" : cropOf(hand) ? "seed" : hand === "growFert" ? "feed" : hand === "guardFert" ? "guard" : hand === "pestCure" ? "cure" : null);

/** A number in [0, 1) from a few numbers and a word: the same for everybody. */
export function roll(word: string, ...n: number[]): number {
  let h = 2166136261;
  for (const ch of `${word}|${n.join("|")}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The hours a plant has grown by a moment: the clock's, faster once it is fed, and what watering added. */
export function grown(p: Plant, now: number): number {
  const fed = p.fed ? Math.max(0, now - Math.max(p.fed, p.sown)) * (FARMING.feed - 1) : 0;
  return (Math.max(0, now - p.sown) + fed + p.boost) / HOUR;
}
/** Where a plant is in its growing, pests left out. */
const growing = (p: Plant, now: number) => growth(p.crop, grown(p, now), p.picked, (now - p.pickedAt) / HOUR);

/**
 * When a pest struck a plant, if one has and it has not been cured since: the
 * first of the day's pest hours, since it was sown or last cured, in which the
 * roll for that plot and that hour came up, the plant being still unripe and
 * not covered. Null when none has.
 */
export function pestAt(key: string, p: Plant, now: number): number | null {
  const { from, to, chance } = FARMING.pests;
  const start = Math.max(p.sown, p.cured, p.pickedAt);
  for (let h = Math.ceil(start / HOUR); h * HOUR <= now; h++) {
    const t = h * HOUR, hour = Math.floor((((t + BANGKOK) % DAY) + DAY) % DAY / HOUR);
    if (hour < from || hour >= to || t < p.guard) continue;
    // (a ripe plant is safe: it only waits to be picked)
    if (growing(p, t).ripe) return null;
    if (roll(key, h, p.sown) < chance) return t;
  }
  return null;
}

/** What a plot shows at a moment: its plant's stage, whether it is ripe, has a pest on it, is dead, or was watered this hour. */
export interface Seen { soil: Soil; crop: CropId | null; by: string | null; stage: 0 | 1 | 2 | 3 | 4 | 5; ripe: boolean; pest: boolean; dead: boolean; wet: boolean }
export function see(key: string, plot: Plot, now: number): Seen {
  const p = plot.plant;
  if (!p) return { soil: plot.soil, crop: null, by: null, stage: 0, ripe: false, pest: false, dead: false, wet: false };
  const struck = pestAt(key, p, now), dead = struck !== null && now - struck > FARMING.pests.kills * HOUR;
  // (a dead plant stays as it was when it died)
  const g = growing(p, dead ? struck! + FARMING.pests.kills * HOUR : now);
  return { soil: plot.soil, crop: p.crop, by: p.by, stage: g.stage, ripe: g.ripe && !dead, pest: struck !== null && !dead, dead, wet: now - p.watered < FARMING.water.every * 60_000 };
}

/** Why something was not done to a plot, beyond a purse's own reasons: the wrong thing in the hand, a plot not ready for it, watered already this hour, somebody else's bed, not ripe yet, as many beds held as one may. */
export type FarmRefusal = "hand" | "soil" | "wet" | "theirs" | "unripe" | "beds";
type Did = Done<{ purse: Purse; plot: Plot; got?: Array<[ItemId, number]> }> | { ok: false; why: FarmRefusal };
const not = (why: FarmRefusal): { ok: false; why: FarmRefusal } => ({ ok: false, why });
const hasInHand = (purse: Purse, hand: ItemId | null) => !!hand && held(purse.bag, hand) > 0;

/** Clear a plot of weeds, or till cleared ground, or pull up a dead plant (which leaves compost): each with a hoe in the hand. */
export function hoe(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number): Did {
  if (toolOf(hand) !== "hoe" || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now);
  if (seen.dead) {
    const left = FARMING.pulled, room = roomFor(purse.bag, left) > 0;
    return { ok: true, plot: { soil: "cleared", plant: null }, purse: { ...spend(purse, FARMING.costs.pull, now), bag: room ? put(purse.bag, left, 1) : purse.bag }, got: room ? [[left, 1]] : [] };
  }
  if (plot.plant) return not("soil");
  if (plot.soil === "wild") return { ok: true, plot: { soil: "cleared", plant: null }, purse: spend(purse, FARMING.costs.clear, now) };
  if (plot.soil === "cleared") return { ok: true, plot: { soil: "tilled", plant: null }, purse: spend(purse, FARMING.costs.till, now) };
  return not("soil");
}

/** Sow the seed in the hand in a tilled plot: one seed, one plot. */
export function sow(purse: Purse, plot: Plot, hand: ItemId | null, me: string, now: number): Did {
  const crop = cropOf(hand);
  if (!crop || !hasInHand(purse, hand)) return not("hand");
  if (plot.soil !== "tilled" || plot.plant) return not("soil");
  return {
    ok: true,
    plot: { soil: "tilled", plant: { by: me, crop, sown: now, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } },
    purse: { ...spend(purse, FARMING.costs.sow, now), bag: take(purse.bag, hand!, 1) },
  };
}

/** How many waterings are left in the cans of a kind in a bag (the one in the hand is the one with water in it, if any has). */
export const waterIn = (bag: Purse["bag"], id: ItemId | null) => bag.reduce((t, s) => t + (s && s.item === id ? s.water ?? 0 : 0), 0);
/** A bag with one stack changed. */
const setStack = (bag: Purse["bag"], slot: number, to: Stack) => bag.map((s, i) => (i === slot ? to : s));

/** Water a growing plant, anybody's, with a can in the hand that has water in it: once an hour for each plot. A better can adds more, and so does a meal that left green fingers. */
export function water(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number): Did | { ok: false; why: Refusal } {
  if (toolOf(hand) !== "can" || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now), p = plot.plant;
  if (!p || seen.dead || (seen.ripe && !CROPS[p.crop].again) || growing(p, now).spent) return not("soil");
  if (seen.wet) return not("wet");
  const slot = purse.bag.findIndex((s) => s?.item === hand && (s.water ?? 0) > 0);
  if (slot < 0) return no("dry");
  const can = purse.bag[slot]!, green = buffOf(purse, now) === "green" ? 1 + BUFFS.green.by : 1;
  return {
    ok: true, plot: { ...plot, plant: { ...p, watered: now, boost: p.boost + FARMING.water.adds * 60_000 * (FIELD[hand!] ?? 1) * green } },
    purse: { ...spend(purse, FARMING.costs.water, now), bag: setStack(purse.bag, slot, { ...can, water: can.water! - 1 }) },
  };
}

/** Put the fertiliser in the hand on a growing plant: one makes it grow faster from now on, the other keeps pests off it for a day. */
export function feed(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number): Did {
  const kind = toolOf(hand);
  if ((kind !== "feed" && kind !== "guard") || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now), p = plot.plant;
  if (!p || seen.dead || (kind === "feed" && p.fed) || (kind === "guard" && p.guard > now)) return not("soil");
  const plant = kind === "feed" ? { ...p, fed: now } : { ...p, guard: now + FARMING.guard * HOUR };
  return { ok: true, plot: { ...plot, plant }, purse: { ...spend(purse, FARMING.costs.feed, now), bag: take(purse.bag, hand!, 1) } };
}

/** Rid a plant, anybody's, of its pest, with a cure in the hand. */
export function cure(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number): Did {
  if (toolOf(hand) !== "cure" || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now);
  if (!plot.plant || !seen.pest) return not("soil");
  return { ok: true, plot: { ...plot, plant: { ...plot.plant, cured: now } }, purse: { ...spend(purse, FARMING.costs.cure, now), bag: take(purse.bag, "pestCure", 1) } };
}

/** Whether a vegetable is a tree or a bush that bears for a season (picked five times and more): shears are for those, a sickle for the rest. */
export const isTree = (crop: CropId) => (CROPS[crop].picks ?? 1) >= TREE_PICKS;
/** How many a picking gives: between the vegetable's least and most, the same for everybody who asks about that picking; one more with the right blade in the hand (a sickle, or shears for a tree). */
export function yieldOf(key: string, p: Plant, hand: ItemId | null = null): number {
  const [lo, hi] = CROPS[p.crop].yield;
  return lo + Math.floor(roll(key, p.sown, p.picked) * (hi - lo + 1)) + (hand === (isTree(p.crop) ? BLADES.tree : BLADES.plant) ? 1 : 0);
}

/** Pick a ripe plant into the bag (which must have the room), by somebody who may. One that bears again goes back a stage; another leaves the plot cleared. */
export function pick(key: string, purse: Purse, plot: Plot, may: boolean, hand: ItemId | null, now: number): Did | { ok: false; why: Refusal } {
  const p = plot.plant, seen = see(key, plot, now);
  if (!p || seen.dead) return not("soil");
  if (!may) return not("theirs");
  if (!seen.ripe) return not("unripe");
  const n = yieldOf(key, p, hasInHand(purse, hand) ? hand : null);
  if (roomFor(purse.bag, p.crop) < n) return no("full");
  const picked = p.picked + 1, spent = picked >= (CROPS[p.crop].picks ?? 1);
  return {
    ok: true, got: [[p.crop, n]],
    plot: spent ? { soil: "cleared", plant: null } : { ...plot, plant: { ...p, picked, pickedAt: now, watered: 0 } },
    purse: { ...spend(purse, FARMING.costs.pick, now), bag: put(purse.bag, p.crop, n) },
  };
}

/**
 * What the thing in the hand can do to a plot now, if anything: the one deed
 * the map offers. In somebody else's bed only the helping deeds are offered
 * (watering, feeding, curing). (Picking needs nothing in the hand: a ripe
 * plant is picked whatever is held, unless what is held has a deed of its own
 * to do.)
 */
export type Deed = "clear" | "till" | "pull" | "sow" | "water" | "feed" | "cure" | "pick";
export function deedFor(key: string, plot: Plot, hand: ItemId | null, me: string, now: number, owner: string | null = null): Deed | null {
  const seen = see(key, plot, now), kind = toolOf(hand), p = plot.plant, mine = owner === null || owner === me;
  if (kind === "hoe") return !mine ? null : seen.dead ? "pull" : p ? null : plot.soil === "wild" ? "clear" : plot.soil === "cleared" ? "till" : null;
  if (kind === "seed") return mine && plot.soil === "tilled" && !p ? "sow" : null;
  if (p && !seen.dead) {
    if (kind === "cure" && seen.pest) return "cure";
    if (kind === "can" && !seen.wet && !growing(p, now).spent && !(seen.ripe && !CROPS[p.crop].again)) return "water";
    if (kind === "feed" && !p.fed) return "feed";
    if (kind === "guard" && p.guard <= now) return "feed";
    if (seen.ripe && mine) return "pick";
  }
  return null;
}

/**
 * Tend a plot: do what the thing in the hand does to it, with the bed's
 * keeping. `others` is how many other plots of the bed have a plant, and
 * `holds` how many other beds are mine now. Whoever sows first in a free bed
 * owns it (unless they hold as many as one may); its owner's every deed there
 * counts as tending it; and when its last plant goes, the day it may stand
 * empty begins. A bed that has lapsed is nobody's: its keeping is dropped.
 */
export function tend(key: string, plot: Plot, bed: Bed | undefined, others: number, holds: number, purse: Purse, me: string, now: number):
  { ok: true; deed: Deed; purse: Purse; plot: Plot; bed: Bed | undefined; got: Array<[ItemId, number]> } | { ok: false; why: Refusal | FarmRefusal } {
  const hand = handOf(purse), owner = ownerOf(bed, others > 0 || !!plot.plant, now);
  const deed = deedFor(key, plot, hand, me, now, owner);
  if (!deed) return { ok: false, why: owner !== null && owner !== me ? "theirs" : "soil" };
  if (deed === "sow" && owner === null && holds >= BEDS.each) return { ok: false, why: "beds" };
  const did = deed === "clear" || deed === "till" || deed === "pull" ? hoe(key, purse, plot, hand, now)
    : deed === "sow" ? sow(purse, plot, hand, me, now) : deed === "water" ? water(key, purse, plot, hand, now)
      : deed === "feed" ? feed(key, purse, plot, hand, now) : deed === "cure" ? cure(key, purse, plot, hand, now) : pick(key, purse, plot, true, hand, now);
  if (!did.ok) return did;
  const planted = others > 0 || !!did.plot.plant;
  let next: Bed | undefined = owner === null ? undefined : bed;
  if (deed === "sow" && owner === null) next = { by: me, tended: now, empty: 0 };
  else if (next && owner === me) next = { ...next, tended: now, empty: planted ? 0 : next.empty || now };
  return { ok: true, deed, purse: did.purse, plot: did.plot, bed: next, got: did.got ?? [] };
}

/* ── water: from the river, to the well, to the can ─────────────────────── */

/** What the thing in the hand can do with water where one stands: draw a bucket at the river, pour it into the well, fill a can at the well. */
export type Chore = "draw" | "pour" | "fill";
export function choreFor(purse: Purse, where: "river" | "well" | null, well: number): Chore | null {
  const hand = handOf(purse);
  if (hand && hand in WATER.buckets) {
    if (where === "river" && purse.bag.some((s) => s?.item === hand && !s.water)) return "draw";
    if (where === "well" && well < WATER.well && purse.bag.some((s) => s?.item === hand && s.water)) return "pour";
  }
  if (where === "well" && isCan(hand) && purse.bag.some((s) => s?.item === hand && (s.water ?? 0) < WATER.cans[hand!]!)) return "fill";
  return null;
}
/** Do that chore. Gives the purse and the well as they are afterwards. */
export function chore(purse: Purse, where: "river" | "well" | null, well: number, now: number): Done<{ purse: Purse; well: number; chore: Chore }> {
  const what = choreFor(purse, where, well), hand = handOf(purse);
  if (!what || !hand) return no("none");
  if (what === "draw") {
    const slot = purse.bag.findIndex((s) => s?.item === hand && !s.water);
    return { ok: true, chore: what, well, purse: { ...spend(purse, WATER.costs.draw, now), bag: setStack(purse.bag, slot, { item: hand, n: 1, water: WATER.buckets[hand]! }) } };
  }
  if (what === "pour") {
    // as much of it as the well has room for; the rest stays in the bucket
    const slot = purse.bag.findIndex((s) => s?.item === hand && s.water), has = purse.bag[slot]!.water!, pours = Math.min(has, WATER.well - well);
    return { ok: true, chore: what, well: well + pours, purse: { ...spend(purse, WATER.costs.pour, now), bag: setStack(purse.bag, slot, has > pours ? { item: hand, n: 1, water: has - pours } : { item: hand, n: 1 }) } };
  }
  // a can takes one bucket of the well's water, however much was left in it
  if (well < 1) return no("dry");
  const slot = purse.bag.findIndex((s) => s?.item === hand && (s.water ?? 0) < WATER.cans[hand]!);
  return { ok: true, chore: what, well: well - 1, purse: { ...spend(purse, WATER.costs.fill, now), bag: setStack(purse.bag, slot, { item: hand, n: 1, water: WATER.cans[hand]! }) } };
}

/** Every vegetable's seed is a thing, and so is what it grows (a check the tests make). */
export const SEEDS: ItemId[] = CROP_IDS.map((c) => CROPS[c].seed).filter((s) => ITEMS[s].kind === "seed");
