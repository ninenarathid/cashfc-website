import { FIELD } from "./gear";
import { BUFFS, CROPS, CROP_IDS, ITEMS, growth, type CropId, type ItemId } from "./items";
import { BLESSINGS } from "./fountain";
import { hasBuff, spend } from "./stamina";
import { DRY, rainingAt, wetMs, type Rain } from "./weather";
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
 *   owner sows and picks there. It is free again when it has stood with
 *   nothing growing for more than a day, or has plants its owner has not
 *   tended for more than four days.
 * - **A hoe works in anybody's bed** (the owner, 2026-10-04: "ยังขุดแปลงคนอื่นได้
 *   เหมือนเดิมแต่ เสีย stamina และถ้า stamina หมดก็จะเกมยากขึ้นเหมือนปกติ"): anybody may
 *   clear its weeds and till its soil, for the stamina it costs anybody and by
 *   the same game (harder with none left, as everywhere). It is help, like
 *   watering: the bed stays its owner's, and only the owner's own deeds count
 *   as tending it. (For its first day the database let nobody hoe in a bed
 *   that was somebody's.)
 * - **A hoe digs a plant out, for the bed's owner only** (the owner, later
 *   that day: "ช่วยทำให้สามารถใช้จอบ ขุดเอาพืชที่ไม่ต้องการออกได้ ทั้งพืชที่ปกติ และพืชที่ตายแล้ว
 *   ไม่ต้องเล่นมินิเกม แต่ต้องกด ยืนยันก่อนว่าจะเอาออกจริง ใช้ได้เฉพาะเจ้าของแปลงผัก"): one that
 *   has died, which leaves compost as it always did, and now one that lives,
 *   which leaves nothing. No game, with stamina or without: it is asked for
 *   twice, and the second asking is the page's (components/town/TownFarm).
 *   Here a living plant goes only when the asking says it is meant (`sure`),
 *   so that nothing which did not ask about a living plant can dig one out: a
 *   page built before this, or one that still thinks the plant dead when a
 *   friend has just cured it. (Until then anybody's hoe pulled up what had
 *   died, in anybody's bed. In a bed that is nobody's, anybody's still does.)
 * - **Watering** adds half an hour of growth, once an hour for each plot, and
 *   anybody may water anybody's plant; half as much again from somebody a meal
 *   has left with green fingers. **A can has to have water in it**
 *   ("บัวรดน้ำต้องเติมน้ำก่อน เติม 1 ถังรดได้ 5-10 ครั้งสำหรับ tier แรก"): it is filled at
 *   the well in the middle of the farm, a bucket of the well's water to a
 *   can; and **the well is filled by buckets carried from the river** ("ต้องมี
 *   คนขนน้ำมาจากแม่น้ำมาใส่บ่อตรงกลางแมพแปลงผัก").
 * - **Rain waters everything** (the owner, 2026-10-04: "ระหว่างที่ฝนตก พืชทั้งหมดจะถือว่า
 *   รดน้ำแล้ว ตลอดการตก"): while it rains every plant is watered, for as long as
 *   it rains. It adds what watering on the hour would (half an hour of growth
 *   to an hour of rain, by the minute), a plot is wet all the while, and a can
 *   has nothing to do there. The rain is the database's (lib/town/weather),
 *   given to these rules as its stretches (`rains`): none, where nothing is
 *   said of it.
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
  /**
   * Stamina: clearing weeds, tilling, pulling up a dead plant, sowing, watering, feeding, curing, picking. Clearing
   * and tilling were 4 each: on the game's first morning two hundred plots were hoed for thirty-six sown, and half
   * the village had no stamina left (the owner, 2026-10-04: "1 + 2 ครับ ทำเลย").
   */
  costs: { clear: 2, till: 2, pull: 2, sow: 1, water: 1, feed: 1, cure: 1, pick: 2 },
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
  /**
   * Tired hands: with no stamina left, how many hits of the hoe's game everything else on the farm asks for (sowing,
   * watering, feeding, curing, picking, and carrying water; not digging a plant out, which is never a game: it is
   * asked for twice instead). The owner, 2026-10-04, had the
   * mini-games made three times as hard with none, "เพื่อที่อาหารจะได้สำคัญมากขึ้น"; told that this work has no game and so
   * stays free, he said "ออกแบบเพิ่มเลย". So with none it is a short game (water is poured, the rest is steadied:
   * `gameFor`), as hard as the tired stretch, and dropped at the third miss like the hoe's (lib/town/timing):
   * nothing is done then and nothing lost, and it may be tried again at once. Two hits and not the hoe's three, for lighter work: of made-up hands, one as unsure
   * as the members' were does it one go in four, a practised one two in three, a very good one nearly always; a
   * better can or blade widens the stretch as a better hoe does. Watering a bed so takes about as long as sitting
   * down to a meal, which is the point. With stamina it is done at once, as ever.
   */
  tired: 2,
};
/** The hoes. */
export const HOES: ItemId[] = ["hoe", "hoeIron", "hoeSteel"];
/** The blades that pick one more: shears for a tree or a bush that bears for a season, a sickle for the rest; and how many pickings make a plant one of the first. */
export const BLADES: { tree: ItemId; plant: ItemId } = { tree: "shears", plant: "sickle" };
export const TREE_PICKS = 5;
/** Water: how many waterings each can holds when full, how many bucketfuls each bucket carries (and each yoke, and the cart: the well's own gifts to its carriers, lib/town/well and lib/town/cart), how many the well holds, and the stamina to draw a bucket at the river, pour it into the well, and fill a can there. */
export const WATER = {
  cans: { can: 8, canCopper: 12, canBrass: 18 } as Partial<Record<ItemId, number>>,
  buckets: { bucket: 1, bucketIron: 2, waterYoke: 2, waterYokeGreat: 4, waterCart: 6 } as Partial<Record<ItemId, number>>,
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
/**
 * What is put on a plant: the two fertilisers and the cure; and three of the fish that came on 2026-10-05, each of
 * which does as one of those does (a herring dug in feeds a plant, as fish were buried under corn; a mosquitofish
 * keeps the pests off it for a day; an archerfish spits a pest off it). Used up by it, like the powder. Of the three
 * kinds, `guard` keeps pests off a plant that has none and `cure` takes off one that is there: neither does the
 * other's work (`feed`, below).
 */
export const PUT_ON: Partial<Record<ItemId, "feed" | "guard" | "cure">> = {
  growFert: "feed", guardFert: "guard", pestCure: "cure",
  herring: "feed", mosquitofish: "guard", archerfish: "cure",
  // (and two made of the forest's things: rotted leaves to grow in, and a scent the pests keep away from)
  mulch: "feed", lavenderSachet: "guard",
  // (and five insects let go on a plant, lib/town/insects: a ladybird and a mantis eat what would eat it; a butterfly
  // sets its flowers; a scarab buries what feeds it)
  ladybird: "guard", mantis: "guard", butterflyWhite: "feed", monarch: "feed", scarab: "feed",
};
/** What can be done to a plot with a thing in the hand, by its kind. */
export const toolOf = (hand: ItemId | null): "hoe" | "can" | "seed" | "feed" | "guard" | "cure" | null =>
  (isHoe(hand) ? "hoe" : isCan(hand) ? "can" : cropOf(hand) ? "seed" : (hand && PUT_ON[hand]) || null);

/** A number in [0, 1) from a few numbers and a word: the same for everybody. */
export function roll(word: string, ...n: number[]): number {
  let h = 2166136261;
  for (const ch of `${word}|${n.join("|")}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The hours a plant has grown by a moment: the clock's, faster once it is fed, what watering added, and what the rain did. */
export function grown(p: Plant, now: number, rains: readonly Rain[] = DRY): number {
  const fed = p.fed ? Math.max(0, now - Math.max(p.fed, p.sown)) * (FARMING.feed - 1) : 0;
  // (rain is watering by the minute: what a watering adds, for every stretch as long as a watering lasts)
  const rained = rains.length ? wetMs(rains, p.sown, now) * FARMING.water.adds / FARMING.water.every : 0;
  return (Math.max(0, now - p.sown) + fed + p.boost + rained) / HOUR;
}
/** Where a plant is in its growing, pests left out. */
const growing = (p: Plant, now: number, rains: readonly Rain[] = DRY) => growth(p.crop, grown(p, now, rains), p.picked, (now - p.pickedAt) / HOUR);

/**
 * When a pest struck a plant, if one has and it has not been cured since: the
 * first of the day's pest hours, since it was sown or last cured, in which the
 * roll for that plot and that hour came up, the plant being still unripe and
 * not covered. Null when none has.
 */
export function pestAt(key: string, p: Plant, now: number, rains: readonly Rain[] = DRY): number | null {
  const { from, to, chance } = FARMING.pests;
  const start = Math.max(p.sown, p.cured, p.pickedAt);
  for (let h = Math.ceil(start / HOUR); h * HOUR <= now; h++) {
    const t = h * HOUR, hour = Math.floor((((t + BANGKOK) % DAY) + DAY) % DAY / HOUR);
    if (hour < from || hour >= to || t < p.guard) continue;
    // (a ripe plant is safe: it only waits to be picked)
    if (growing(p, t, rains).ripe) return null;
    if (roll(key, h, p.sown) < chance) return t;
  }
  return null;
}

/** What a plot shows at a moment: its plant's stage, whether it is ripe, has a pest on it, is dead, or is wet (watered this hour, or rained on now). */
export interface Seen { soil: Soil; crop: CropId | null; by: string | null; stage: 0 | 1 | 2 | 3 | 4 | 5; ripe: boolean; pest: boolean; dead: boolean; wet: boolean }
export function see(key: string, plot: Plot, now: number, rains: readonly Rain[] = DRY): Seen {
  const p = plot.plant;
  if (!p) return { soil: plot.soil, crop: null, by: null, stage: 0, ripe: false, pest: false, dead: false, wet: false };
  const struck = pestAt(key, p, now, rains), dead = struck !== null && now - struck > FARMING.pests.kills * HOUR;
  // (a dead plant stays as it was when it died)
  const g = growing(p, dead ? struck! + FARMING.pests.kills * HOUR : now, rains);
  return {
    soil: plot.soil, crop: p.crop, by: p.by, stage: g.stage, ripe: g.ripe && !dead, pest: struck !== null && !dead, dead,
    wet: now - p.watered < FARMING.water.every * 60_000 || rainingAt(rains, now),
  };
}

/** Why something was not done to a plot, beyond a purse's own reasons: the wrong thing in the hand, a plot not ready for it, watered already this hour, somebody else's bed, not ripe yet, as many beds held as one may, a living plant that nothing said was meant to go. */
export type FarmRefusal = "hand" | "soil" | "wet" | "theirs" | "unripe" | "beds" | "sure";
type Did = Done<{ purse: Purse; plot: Plot; got?: Array<[ItemId, number]> }> | { ok: false; why: FarmRefusal };
const not = (why: FarmRefusal): { ok: false; why: FarmRefusal } => ({ ok: false, why });
const hasInHand = (purse: Purse, hand: ItemId | null) => !!hand && held(purse.bag, hand) > 0;

/** Clear a plot of weeds, or till cleared ground, with a hoe in the hand. (A plot with a plant in it is not the hoe's to clear: digging it out is `uproot`. The plot's name and the rain are taken as every deed takes them, and the database's takes them; neither is needed any more.) */
export function hoe(_key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, _rains: readonly Rain[] = DRY): Did {
  if (toolOf(hand) !== "hoe" || !hasInHand(purse, hand)) return not("hand");
  if (plot.plant) return not("soil");
  if (plot.soil === "wild") return { ok: true, plot: { soil: "cleared", plant: null }, purse: spend(purse, FARMING.costs.clear, now) };
  if (plot.soil === "cleared") return { ok: true, plot: { soil: "tilled", plant: null }, purse: spend(purse, FARMING.costs.till, now) };
  return not("soil");
}

/**
 * Dig the plant out of a plot with a hoe in the hand, by somebody who may (the bed's owner; or anybody, in a bed that
 * is nobody's): the ground is left cleared. One that has died leaves compost, if there is room for it; one that
 * lives leaves nothing, and goes only when it is `sure` that a living one is meant.
 */
export function uproot(key: string, purse: Purse, plot: Plot, may: boolean, sure: boolean, hand: ItemId | null, now: number, rains: readonly Rain[] = DRY): Did {
  if (toolOf(hand) !== "hoe" || !hasInHand(purse, hand)) return not("hand");
  if (!plot.plant) return not("soil");
  if (!may) return not("theirs");
  const dead = see(key, plot, now, rains).dead;
  if (!dead && !sure) return not("sure");
  const left = FARMING.pulled, room = dead && roomFor(purse.bag, left) > 0;
  return { ok: true, plot: { soil: "cleared", plant: null }, purse: { ...spend(purse, FARMING.costs.pull, now), bag: room ? put(purse.bag, left, 1) : purse.bag }, got: room ? [[left, 1]] : [] };
}

/** Sow the seed in the hand in a tilled plot: one seed, one plot. */
export function sow(purse: Purse, plot: Plot, hand: ItemId | null, me: string, now: number): Did {
  const crop = cropOf(hand);
  if (!crop || !hasInHand(purse, hand)) return not("hand");
  if (plot.soil !== "tilled" || plot.plant) return not("soil");
  return {
    ok: true,
    // (under the fountain's warm soil a seed is some of its way to ripe at once: lib/town/fountain)
    plot: { soil: "tilled", plant: { by: me, crop, sown: now, boost: hasBuff(purse, now, "sprout") ? BLESSINGS.sprout.by * CROPS[crop].hours * 3_600_000 : 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } },
    purse: { ...spend(purse, FARMING.costs.sow, now), bag: take(purse.bag, hand!, 1) },
  };
}

/** How many waterings are left in the cans of a kind in a bag (the one in the hand is the one with water in it, if any has). */
export const waterIn = (bag: Purse["bag"], id: ItemId | null) => bag.reduce((t, s) => t + (s && s.item === id ? s.water ?? 0 : 0), 0);
/** A bag with one stack changed. */
const setStack = (bag: Purse["bag"], slot: number, to: Stack) => bag.map((s, i) => (i === slot ? to : s));

/** Water a growing plant, anybody's, with a can in the hand that has water in it: once an hour for each plot, and not while the rain does it. A better can adds more, and so does a meal that left green fingers. */
export function water(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, rains: readonly Rain[] = DRY): Did | { ok: false; why: Refusal } {
  if (toolOf(hand) !== "can" || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now, rains), p = plot.plant;
  if (!p || seen.dead || (seen.ripe && !CROPS[p.crop].again) || growing(p, now, rains).spent) return not("soil");
  if (seen.wet) return not("wet");
  const slot = purse.bag.findIndex((s) => s?.item === hand && (s.water ?? 0) > 0);
  if (slot < 0) return no("dry");
  const can = purse.bag[slot]!, green = hasBuff(purse, now, "green") ? 1 + BUFFS.green.by : 1;
  return {
    ok: true, plot: { ...plot, plant: { ...p, watered: now, boost: p.boost + FARMING.water.adds * 60_000 * (FIELD[hand!] ?? 1) * green } },
    purse: { ...spend(purse, FARMING.costs.water, now), bag: setStack(purse.bag, slot, { ...can, water: can.water! - (hasBuff(purse, now, "spring") ? 0 : 1) }) },
  };
}

/**
 * Put the fertiliser in the hand on a growing plant: one makes it grow faster from now on, the other keeps pests off it
 * for a day. **What keeps pests off does not take one off**: it does not go on a plant that has a pest on it, which
 * is the cure's to rid first. (It did until 2026-10-05, by the way a strike is counted: every strike before a cover's
 * end is passed over, the one before the cover was put on with them. So whatever covers a plant cured it too, and for
 * a day more; and the day the insects came the members found that a ladybird, which is caught for a point of stamina,
 * did the work of a cure that takes a scroll, a pot and five things. The owner: "แมลงที่หาง่ายกว่า จะทำให้ ยาไล่แมลง
 * ไม่มีคนใช้เพราะทำยากกว่า". A plant covered so before then stays rid of its pest: nothing is counted again.)
 */
export function feed(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, rains: readonly Rain[] = DRY): Did {
  const kind = toolOf(hand);
  if ((kind !== "feed" && kind !== "guard") || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now, rains), p = plot.plant;
  if (!p || seen.dead || (kind === "feed" && p.fed) || (kind === "guard" && (p.guard > now || seen.pest))) return not("soil");
  const plant = kind === "feed" ? { ...p, fed: now } : { ...p, guard: now + FARMING.guard * HOUR };
  return { ok: true, plot: { ...plot, plant }, purse: { ...spend(purse, FARMING.costs.feed, now), bag: take(purse.bag, hand!, 1) } };
}

/** Rid a plant, anybody's, of its pest, with a cure in the hand. */
export function cure(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, rains: readonly Rain[] = DRY): Did {
  if (toolOf(hand) !== "cure" || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now, rains);
  if (!plot.plant || !seen.pest) return not("soil");
  return { ok: true, plot: { ...plot, plant: { ...plot.plant, cured: now } }, purse: { ...spend(purse, FARMING.costs.cure, now), bag: take(purse.bag, hand!, 1) } };
}

/** Whether a vegetable is a tree or a bush that bears for a season (picked five times and more): shears are for those, a sickle for the rest. */
export const isTree = (crop: CropId) => (CROPS[crop].picks ?? 1) >= TREE_PICKS;
/** How many a picking gives: between the vegetable's least and most, the same for everybody who asks about that picking; one more with the right blade in the hand (a sickle, or shears for a tree). */
export function yieldOf(key: string, p: Plant, hand: ItemId | null = null): number {
  const [lo, hi] = CROPS[p.crop].yield;
  return lo + Math.floor(roll(key, p.sown, p.picked) * (hi - lo + 1)) + (hand === (isTree(p.crop) ? BLADES.tree : BLADES.plant) ? 1 : 0);
}

/** Pick a ripe plant into the bag (which must have the room), by somebody who may. One that bears again goes back a stage; another leaves the plot cleared. */
export function pick(key: string, purse: Purse, plot: Plot, may: boolean, hand: ItemId | null, now: number, rains: readonly Rain[] = DRY): Did | { ok: false; why: Refusal } {
  const p = plot.plant, seen = see(key, plot, now, rains);
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
 * the map offers. In somebody else's bed only the helping deeds are offered:
 * the hoe's on bare ground (clearing, tilling), watering, feeding and curing;
 * never sowing, picking, or digging a plant out, dead (`pull`) or living
 * (`uproot`). (Picking needs nothing in the hand: a ripe plant is picked
 * whatever is held, unless what is held has a deed of its own to do. With a
 * hoe in the hand a ripe plant is dug out, not picked: so it is asked twice.)
 */
export type Deed = "clear" | "till" | "pull" | "uproot" | "sow" | "water" | "feed" | "cure" | "pick";
export function deedFor(key: string, plot: Plot, hand: ItemId | null, me: string, now: number, owner: string | null = null, rains: readonly Rain[] = DRY): Deed | null {
  const seen = see(key, plot, now, rains), kind = toolOf(hand), p = plot.plant, mine = owner === null || owner === me;
  if (kind === "hoe") return p ? (!mine ? null : seen.dead ? "pull" : "uproot") : plot.soil === "wild" ? "clear" : plot.soil === "cleared" ? "till" : null;
  if (kind === "seed") return mine && plot.soil === "tilled" && !p ? "sow" : null;
  if (p && !seen.dead) {
    if (kind === "cure" && seen.pest) return "cure";
    if (kind === "can" && !seen.wet && !growing(p, now, rains).spent && !(seen.ripe && !CROPS[p.crop].again)) return "water";
    if (kind === "feed" && !p.fed) return "feed";
    // (what keeps pests off is for a plant that has none: one that has is the cure's)
    if (kind === "guard" && p.guard <= now && !seen.pest) return "feed";
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
 * `sure` is the asking's own word that a living plant is meant to be dug out
 * (the page's second asking, answered): without it only a dead one goes.
 */
export function tend(key: string, plot: Plot, bed: Bed | undefined, others: number, holds: number, purse: Purse, me: string, now: number, rains: readonly Rain[] = DRY, sure = false):
  { ok: true; deed: Deed; purse: Purse; plot: Plot; bed: Bed | undefined; got: Array<[ItemId, number]> } | { ok: false; why: Refusal | FarmRefusal } {
  const hand = handOf(purse), owner = ownerOf(bed, others > 0 || !!plot.plant, now);
  const deed = deedFor(key, plot, hand, me, now, owner, rains);
  if (!deed) return { ok: false, why: owner !== null && owner !== me ? "theirs" : "soil" };
  if (deed === "sow" && owner === null && holds >= BEDS.each) return { ok: false, why: "beds" };
  const did = deed === "clear" || deed === "till" ? hoe(key, purse, plot, hand, now, rains) : deed === "pull" || deed === "uproot" ? uproot(key, purse, plot, true, sure, hand, now, rains)
    : deed === "sow" ? sow(purse, plot, hand, me, now) : deed === "water" ? water(key, purse, plot, hand, now, rains)
      : deed === "feed" ? feed(key, purse, plot, hand, now, rains) : deed === "cure" ? cure(key, purse, plot, hand, now, rains) : pick(key, purse, plot, true, hand, now, rains);
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
/** How much of its game a piece of the farm's work asks for: clearing and tilling always, digging a plant out never (it is asked for twice instead), anything else only of tired hands. None: it is done at once. */
export const hitsFor = (work: Deed | Chore, spent: boolean): number =>
  (work === "clear" || work === "till" ? FARMING.swings[work] : work === "pull" || work === "uproot" ? 0 : spent ? FARMING.tired : 0);
/**
 * Which game each piece of the farm's work is, when it is one (the owner, 2026-10-04: every one of them was the game
 * of timing, "การกดตามจังหว่ะ ดูจะมีเยอะไปหน่อย … ทำ minigame อื่นให้สอดคล้องกับ action ที่ทำ"): weeds are pulled
 * (lib/town/weeding); soil is tilled by the game of timing, the hoe's swing, and nothing else is any more
 * (lib/town/timing); water is poured, whether onto a plant, out of the river, into the well or into a can
 * (lib/town/pouring); and what else tired hands do they have to steady themselves for (lib/town/steady). Each gives
 * back what the game of timing gave (hits, misses, how long), so nothing that reads it changes.
 */
export type FarmGame = "weeding" | "timing" | "pouring" | "steady";
export const gameFor = (work: Deed | Chore): FarmGame | null =>
  (work === "clear" ? "weeding" : work === "till" ? "timing" : work === "pull" || work === "uproot" ? null
    : work === "water" || work === "draw" || work === "pour" || work === "fill" ? "pouring" : "steady");
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
    return { ok: true, chore: what, well, purse: { ...spend(purse, WATER.costs.draw, now), bag: setStack(purse.bag, slot, { item: hand, n: 1, water: WATER.buckets[hand]! + (hasBuff(purse, now, "carry") ? BLESSINGS.carry.by : 0) }) } };
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
