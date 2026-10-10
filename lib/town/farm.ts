import { canFx, hoeFx, luckOf } from "./forged";
import { toolPaid } from "./forged-keep";
import { mayPower, powerLeft, powerUsed, usePower } from "./powers";
import { optN } from "./tools";
import { FIELD } from "./gear";
import { CROPS, CROP_IDS, ITEMS, growth, type CropId, type ItemId } from "./items";
import { BLESSINGS } from "./fountain";
import { famBy, gloved, harderFor, hasThing, numberOf, useGift, usesLeft, wearing } from "./gifts";
import { buffBy, hasBuff, isSpent, spend } from "./stamina";
// ── gifts: helpers ──
import { HELPING, bridged, chime, diesAt, dustUntil, dustsOf, type HelpRefusal } from "./helping";
import { DRY, rainingAt, wetMs, type Rain } from "./weather";
import { BANGKOK, DAY, HOUR, forged, handOf, handSlot, held, heldStack, no, put, roomFor, take, type Done, type Purse, type Refusal, type Stack } from "./trade";

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
 *   keeps pests off it for a day. (So do a few things caught: `PUT_ON`. Two of
 *   them, insects, also eat a pest that is already there, though not every time.)
 * - **Pests** strike a growing plant only between 08:00 and 18:00; one left
 *   for more than six hours kills it (so the six hours always end before
 *   midnight); anybody may cure anybody's plant, and the cure that is made
 *   keeps pests off it for a day after. A dead plant, pulled up,
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
  /**
   * The covers that take a pest off as well, and how often: the two insects that eat what eats a plant (the owner,
   * 2026-10-06: "แมลงที่ใช้กำจัด ศัตรูพืช … ช่วยทำให้กลับมาใช้งานได้ แต่มีโอกาศสำเร็จแค่ 70%", and then "เอาเต่าทอง 50% ตักแตนตำข้าว
   * 70%": the mantis, which takes a friend to catch, is the surer). Let go on a plant that has a pest, one rids it of
   * the pest so often, as a cure rids it, and keeps nothing off it afterwards ("การกำจัดแมลงด้วยแมลง จะไม่ทำให้ป้องกันแมลง
   * กลับมาโจมตีได้"); the other times it is off and gone, and the pest is where it was (`feed`). No other cover goes on
   * such a plant.
   */
  rids: { ladybird: 0.5, mantis: 0.7 } as Partial<Record<ItemId, number>>,
  /**
   * The cures that keep pests off the plant they have rid, and for how many hours (the owner, the same day: "แต่ยาฆ่าแมลง
   * จะยังป้องกันได้ 24 ชม"): the pest cure, which is made, for a day. The archerfish only spits the pest off.
   */
  cures: { pestCure: 24 } as Partial<Record<ItemId, number>>,
  /**
   * Pests: the hours of the day (Bangkok) they strike in, the chance for a growing plant in each of those hours, and
   * the hours after which a plant left to them dies. And what the farm's own insects add to that chance (`swarm`; the
   * owner, 2026-10-06: "ในช่วงที่มีแมลงมาโจมตีพืช ทำให้ % การโจมตีสูงขึ้นถ้ามี แมลงอยู่ในแมพ ฟาร์ม แต่ถ้าไม่มีเลยก็เท่าเดิม", and how
   * much, "สูงขึ้นเล็กน้อยพอ ซัก 1-2 %"): in an hour the farm was counted with `some` insects that eat plants on it or
   * more, the first of `adds`; with `many` or more, the second; with none, nothing. The steps are mine, his to
   * change: one insect is "some", and four are "many" (left alone, a dry day's farm has about six out at a time).
   * Who counts, and when, is `Swarms`, below.
   */
  pests: { from: 8, to: 18, chance: 0.03, kills: 6, swarm: { some: 1, many: 4, adds: [0.01, 0.02] as readonly [number, number] } },
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
// ── forging: old tools ── (what a tilled plot may turn up)
export const WORM: ItemId = "worm";
/** The hoes. */
export const HOES: ItemId[] = ["hoe", "hoeIron", "hoeSteel"];
/** The blades that pick one more: shears for a tree or a bush that bears for a season, a sickle for the rest; and how many pickings make a plant one of the first. */
export const BLADES: { tree: ItemId; plant: ItemId } = { tree: "shears", plant: "sickle" };
export const TREE_PICKS = 5;
/** Water: how many waterings each can holds when full, how many bucketfuls each bucket carries (and each yoke, and the cart: the well's own gifts to its carriers, lib/town/well and lib/town/cart), how many the well holds, and the stamina to draw a bucket at the river, pour it into the well, and fill a can there. */
export const WATER = {
  cans: { can: 8, canCopper: 12, canBrass: 18 } as Partial<Record<ItemId, number>>,
  buckets: { bucket: 1, bucketIron: 2, waterYoke: 2, waterYokeGreat: 4, waterCart: 6 } as Partial<Record<ItemId, number>>,
  // (the owner, 2026-10-07: 100 where it held 40; and a bucketful of it goes half as far in a can)
  well: 100,
  /** How many of the well's bucketfuls a can's filling takes (one until 2026-10-07): so a bucketful is four waterings of a plain can, six of a copper one, nine of a brass one. */
  fill: 2,
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
  /** How many bearings more than its kind has: one, of a plant the mandrake sang to as it was picked for what would have been the last time (lib/town/gifts' famMandrake). Missing from every other plant. */
  more?: number;
  /** The moments an hourglass of seasons was turned over its bed while it stood there (lib/town/gifts' thingHourglass): from each, for `HOURGLASS.hours`, it grows so many times as fast (`quickMs`). Missing from a plant no hourglass was turned over. */
  fast?: number[];
  // ── gifts: helpers ──
  /**
   * Its last watering with a can, as it was kept (lib/town/helping's pouredAs): whose it was, when, what it added
   * before anything made it the more, and how many times over it was kept in all; whether its waterer wore the duet
   * bell in a bed not their own (`worn`), and whether a bell has rung for it (`bell`). Missing from a plant no can has
   * watered since.
   */
  pour?: { by: string; at: number; base: number; x: number; worn?: boolean; bell?: boolean };
  /** The moments garden fae dust was sprinkled on it (lib/town/helping's diesAt): for so many hours from each its dying clock stands still. Missing from a plant never dusted. */
  dust?: number[];
  // ── forging: old tools ──
  /** The moment of the watering it was given on top of another in the same hour, by a can that waters twice (`water`): a plant takes only one such until it has dried. Missing from a plant never watered twice. */
  twice?: number;
  /** A seed sown in the damp furrow keeps moisture for its growing life. */
  moist?: boolean;
}
export interface Plot {
  soil: Soil; plant: Plant | null;
  // ── forging: old tools ── (a furrow left damp by the hoe that tilled it: what is sown in it has had its first watering. Missing from every other plot.)
  damp?: boolean;
}
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
 * other's work (`feed`, below), but for the two insects, which eat a pest that is there as often as not, or oftener
 * (`FARMING.rids`).
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

/**
 * The number an insect let go on a plant that has a pest is tried by (`FARMING.rids`): from the plot, its plant and
 * the very moment, which is the clock of whoever keeps the game, to the millisecond. Nobody chooses it, and whoever
 * keeps the game needs no dice of its own: the database's rule (`town.feed`) answers every case as this does.
 */
export const ridLuck = (key: string, p: Plant, now: number): number => roll(`rid|${key}`, now, p.sown);

/**
 * The hours the farm had insects that eat plants on it: an hour's number (milliseconds over an hour, whole: the `h`
 * the pests are rolled by) to how many there were. Counted by whoever keeps the game, once in each of the pests' hours,
 * the first time anybody looks at the farm in it: the insects out at the farm's haunts at that moment that nobody has
 * caught, less the ones that eat pests (`FARMING.rids`: a ladybird or a mantis left on the farm harms nothing). An
 * hour with no word had none, **or nobody at the farm to count**: nothing strikes oftener behind everybody's back.
 * What is counted is kept and never counted again, so that a pest, once worked out, stays worked out.
 */
export type Swarms = Readonly<Record<number, number>>;
/**
 * What the farm's rules are read under: the stretches of rain, and with them, when there are any, the hours the farm
 * had insects on it. A plain list of rain is a sky with no such hours: every rule answers under it as it always did.
 */
export type FarmSky = readonly Rain[] | { readonly rains: readonly Rain[]; readonly swarms: Swarms };
const rainsIn = (sky: FarmSky): readonly Rain[] => ("rains" in sky ? sky.rains : sky);
const bugsIn = (sky: FarmSky, h: number): number => ("rains" in sky ? sky.swarms[h] ?? 0 : 0);
/** The chance that a pest strikes a growing plant in an hour the farm was counted with so many insects that eat plants on it. */
export function pestChance(bugs: number): number {
  const { chance, swarm } = FARMING.pests;
  return chance + (bugs >= swarm.many ? swarm.adds[1] : bugs >= swarm.some ? swarm.adds[0] : 0);
}
/** The hour a moment is in, as the pests count hours; and whether it is one of theirs (Bangkok's clock). */
export const pestHour = (ms: number): number => Math.floor(ms / HOUR);
export function inPestHours(ms: number): boolean {
  const hour = Math.floor((((ms + BANGKOK) % DAY) + DAY) % DAY / HOUR);
  return hour >= FARMING.pests.from && hour < FARMING.pests.to;
}

/**
 * The hourglass of seasons (lib/town/gifts' thingHourglass, the farming line's fifth rank): how many hours a turning
 * lasts (how many times as fast a plant grows in them is the gift's own number), and how many turnings a plant
 * remembers (one a day at the most: none that matters is ever forgotten).
 */
export const HOURGLASS = { hours: 3, kept: 40 };
/**
 * The growth the hourglass has added to a plant between two moments, in milliseconds: for every stretch it ran over
 * the plant's bed, the part of it that lies between them, so many times over again (three times as fast is twice
 * more). Nothing, for a plant no hourglass was turned over: every clock of it is then as it always was.
 */
export function quickMs(p: Plant, from: number, to: number): number {
  if (!Array.isArray(p.fast) || !p.fast.length) return 0;
  const span = HOURGLASS.hours * HOUR;
  let ms = 0;
  for (const at of p.fast) if (typeof at === "number") ms += Math.max(0, Math.min(to, at + span) - Math.max(from, at));
  return ms * (numberOf("thingHourglass") - 1);
}
/** Until when the hourglass runs over a plant, if it does at a moment. */
export function quickUntil(p: Plant | null | undefined, now: number): number | null {
  const span = HOURGLASS.hours * HOUR, at = Array.isArray(p?.fast) ? p!.fast.filter((f) => typeof f === "number" && f <= now && now < f + span) : [];
  return at.length ? Math.max(...at) + span : null;
}

/** The hours a plant has grown by a moment: the clock's, faster once it is fed, what watering added, what the rain did, and what an hourglass turned over its bed did. */
export function grown(p: Plant, now: number, rains: FarmSky = DRY): number {
  const fed = p.fed ? Math.max(0, now - Math.max(p.fed, p.sown)) * (FARMING.feed - 1) : 0;
  // (rain is watering by the minute: what a watering adds, for every stretch as long as a watering lasts)
  const wet = rainsIn(rains), wetTime = p.moist ? Math.max(0, now - p.sown) : wet.length ? wetMs(wet, p.sown, now) : 0;
  const rained = wetTime * FARMING.water.adds / FARMING.water.every;
  return (Math.max(0, now - p.sown) + fed + p.boost + rained + quickMs(p, p.sown, now)) / HOUR;
}
/**
 * The mandrake's song (lib/town/gifts' famMandrake, the farming line's sixth rank): what part of its hours a crop
 * that is picked only once takes to bear the once more (one that bears again takes its own while, as ever).
 */
export const ENCORE = 0.5;
/** How many bearings more than its kind a plant has (none, but for one the mandrake sang to). */
export const moreOf = (p: Plant): number => (typeof p.more === "number" && p.more > 0 ? Math.floor(p.more) : 0);
/** The hours a plant waits to bear its one more: its kind's own while between two pickings, or, of a kind that is picked once, a part of its hours. */
export const encoreHours = (crop: CropId): number => CROPS[crop].again ?? CROPS[crop].hours * ENCORE;
/** Where a plant is in its growing, pests left out. (One that was picked and bears again waits by the clock, and by the hourglass with it; one the mandrake sang to has a bearing more than its kind, and waits for it the same way.) */
export function growing(p: Plant, now: number, rains: FarmSky = DRY): ReturnType<typeof growth> {
  const since = (now - p.pickedAt + (p.picked > 0 ? quickMs(p, p.pickedAt, now) : 0)) / HOUR, picks = CROPS[p.crop].picks ?? 1, more = moreOf(p);
  if (more > 0 && p.picked >= picks && p.picked < picks + more) { const ripe = since >= encoreHours(p.crop); return { stage: ripe ? 5 : 4, ripe, spent: false }; }
  return growth(p.crop, grown(p, now, rains), p.picked, since);
}

/**
 * When a pest struck a plant, if one has and it has not been cured since: the
 * first of the day's pest hours, since it was sown or last cured, in which the
 * roll for that plot and that hour came up, the plant being still unripe and
 * not covered. Null when none has. The roll comes up a little oftener in an
 * hour the farm had insects on it (`pestChance`, by the sky's `swarms`).
 */
export function pestAt(key: string, p: Plant, now: number, rains: FarmSky = DRY): number | null {
  const { from, to } = FARMING.pests;
  const start = Math.max(p.sown, p.cured, p.pickedAt);
  for (let h = Math.ceil(start / HOUR); h * HOUR <= now; h++) {
    const t = h * HOUR, hour = Math.floor((((t + BANGKOK) % DAY) + DAY) % DAY / HOUR);
    // (the pest that comes at the very moment a plant is rid of one is the one it was rid of: until 2026-10-06 a
    // plant cured on the stroke of the hour had it still, one moment in 3,600,000)
    if (hour < from || hour >= to || t < p.guard || t <= p.cured) continue;
    // (a ripe plant is safe: it only waits to be picked)
    if (growing(p, t, rains).ripe) return null;
    if (roll(key, h, p.sown) < pestChance(bugsIn(rains, h))) return t;
  }
  return null;
}

/** What a plot shows at a moment: its plant's stage, whether it is ripe, has a pest on it, is dead, or is wet (watered this hour, or rained on now). */
export interface Seen {
  soil: Soil; crop: CropId | null; by: string | null; stage: 0 | 1 | 2 | 3 | 4 | 5; ripe: boolean; pest: boolean; dead: boolean; wet: boolean;
  // ── forging: old tools ── (bare tilled ground that a hoe left damp)
  damp?: boolean;
}
export function see(key: string, plot: Plot, now: number, rains: FarmSky = DRY): Seen {
  const p = plot.plant;
  if (!p) return { soil: plot.soil, crop: null, by: null, stage: 0, ripe: false, pest: false, dead: false, wet: false, ...(plot.damp && plot.soil === "tilled" ? { damp: true } : {}) };
  // ── gifts: helpers ── (the moment it dies of its pest: so many hours after it struck, not counting the time fae dust lay on it)
  const struck = pestAt(key, p, now, rains), end = struck === null ? 0 : diesAt(p, struck, FARMING.pests.kills * HOUR), dead = struck !== null && now > end;
  // (a dead plant stays as it was when it died)
  const g = growing(p, dead ? end : now, rains);
  return {
    soil: plot.soil, crop: p.crop, by: p.by, stage: g.stage, ripe: g.ripe && !dead, pest: struck !== null && !dead, dead,
    wet: !!p.moist || now - p.watered < FARMING.water.every * 60_000 || rainingAt(rainsIn(rains), now),
  };
}

/** Why something was not done to a plot, beyond a purse's own reasons: the wrong thing in the hand, a plot not ready for it, watered already this hour, somebody else's bed, not ripe yet, as many beds held as one may, a living plant that nothing said was meant to go. */
export type FarmRefusal = "hand" | "soil" | "wet" | "theirs" | "unripe" | "beds" | "sure" | "running";
type Did = Done<{ purse: Purse; plot: Plot; got?: Array<[ItemId, number]> }> | { ok: false; why: FarmRefusal };
const not = (why: FarmRefusal): { ok: false; why: FarmRefusal } => ({ ok: false, why });
const hasInHand = (purse: Purse, hand: ItemId | null) => !!hand && held(purse.bag, hand) > 0;

/** Clear a plot of weeds, or till cleared ground, with a hoe in the hand. (A plot with a plant in it is not the hoe's to clear: digging it out is `uproot`. The plot's name and the rain are taken as every deed takes them, and the database's takes them; neither is needed any more.) */
export function hoe(_key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, _rains: FarmSky = DRY): Did {
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
export function uproot(key: string, purse: Purse, plot: Plot, may: boolean, sure: boolean, hand: ItemId | null, now: number, rains: FarmSky = DRY): Did {
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
  // ── forging: old tools ── (a furrow the hoe left damp: the seed has had its first watering, a plain one, and is wet for its hour)
  const damp = plot.damp ? FARMING.water.adds * 60_000 : 0;
  return {
    ok: true,
    // (under the fountain's warm soil a seed is some of its way to ripe at once: lib/town/fountain)
    plot: { soil: "tilled", plant: { by: me, crop, sown: now, boost: (hasBuff(purse, now, "sprout") ? BLESSINGS.sprout.by * CROPS[crop].hours * 3_600_000 : 0) + damp, watered: plot.damp ? now : 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...(plot.damp ? { moist: true } : {}) } },
    purse: { ...spend(purse, FARMING.costs.sow, now), bag: take(purse.bag, hand!, 1) },
  };
}

/** How many waterings are left in the cans of a kind in a bag (the one in the hand is the one with water in it, if any has). */
export const waterIn = (bag: Purse["bag"], id: ItemId | null) => bag.reduce((t, s) => t + (s && s.item === id ? s.water ?? 0 : 0), 0);
/** A bag with one stack changed. */
const setStack = (bag: Purse["bag"], slot: number, to: Stack) => bag.map((s, i) => (i === slot ? to : s));
// ── forging: old tools ──
/** Whether a can that waters with no water in it is doing so now: its minutes have begun and are not over. */
export const canFullNow = (purse: Pick<Purse, "canFull">, now: number): boolean => typeof purse.canFull === "number" && purse.canFull > now;
/** How many waterings a can holds when full, as the stack it is: its kind's, and what its own forging adds (lib/town/forged). None, of what is no can. */
export const canHolds = (s: Stack | null | undefined): number => (s && s.item in WATER.cans ? WATER.cans[s.item]! + canFx(s).more : 0);
/**
 * The slot of the can a deed is done with: the one in the hand (the slot it was taken up from), when that carries
 * something of its own and will do; or the first of its kind that will, as ever. -1: none will.
 */
const canSlot = (purse: Purse, hand: ItemId | null, will: (s: Stack) => boolean): number => {
  const at = handSlot(purse, purse.handAt ?? null), mine = at >= 0 ? purse.bag[at] : null;
  return mine && mine.item === hand && forged(mine) && will(mine) ? at : purse.bag.findIndex((s) => !!s && s.item === hand && will(s));
};
/** What a watering adds to a plant, in milliseconds of growth: a better can's more, green fingers', and the share more of a can that carries as much. */
const wateringOf = (purse: Purse, hand: ItemId | null, now: number, fx: { rich: number }): number => FARMING.water.adds * 60_000 * (FIELD[hand!] ?? 1) * (1 + buffBy(purse, now, "green")) * (1 + fx.rich);
/** Whether the can in somebody's hand waters a plant twice in an hour now: it has the option, and the day has one left. */
export const mayTwice = (purse: Purse, now: number): boolean => canFx(heldStack(purse)).twice && powerLeft(purse, "cnTwice", now) > 0;
/** Whether a plant is wet from a watering it could take one more on top of: watered within the hour, not rained on, and not watered twice already since it was last dry. */
const wetOnce = (p: Plant, now: number, rains: FarmSky): boolean => now - p.watered < FARMING.water.every * 60_000 && !rainingAt(rainsIn(rains), now) && p.twice !== p.watered;

/** Water a growing plant, anybody's, with a can in the hand that has water in it: once an hour for each plot, and not while the rain does it. A better can adds more, and so does a meal that left green fingers. */
export function water(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, rains: FarmSky = DRY): Did | { ok: false; why: Refusal } {
  if (toolOf(hand) !== "can" || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now, rains), p = plot.plant;
  if (!p || seen.dead || (seen.ripe && !CROPS[p.crop].again) || growing(p, now, rains).spent) return not("soil");
  // ── forging: old tools ── (a plant watered already this hour takes one watering more from a can that waters twice, so many a day, counted by the option)
  const again = seen.wet && heldStack(purse)?.item === hand && wetOnce(p, now, rains) && mayTwice(purse, now);
  if (seen.wet && !again) return not("wet");
  // ── forging: old tools ── (a can that waters with no water in it: once it has run dry it goes on for its minutes, so often a day, counted by the
  // option; while they last no watering uses any water. The can is the one in the hand.)
  const wet = canSlot(purse, hand, (s) => (s.water ?? 0) > 0), mine = heldStack(purse), runs = canFullNow(purse, now);
  const begun = wet < 0 && !runs && mine?.item === hand && canFx(mine).full > 0 ? usePower(purse, mine, "cnFull", now) : null;
  const slot = wet >= 0 ? wet : runs || begun?.ok ? handSlot(purse, purse.handAt ?? null) : -1;
  if (slot < 0 || purse.bag[slot]?.item !== hand) return no("dry");
  const can = purse.bag[slot]!, from: Purse = begun?.ok ? { ...begun.purse, canFull: now + canFx(mine).full * 60_000 } : purse;
  // (a can that carries as much adds a share more, and uses so many of its waterings at once: what it has, of a can with fewer)
  const fx = canFx(can), free = hasBuff(purse, now, "spring") || runs || !!begun?.ok;
  const paid: Purse = { ...spend(from, FARMING.costs.water, now), bag: setStack(purse.bag, slot, { ...can, water: (can.water ?? 0) - (free ? 0 : Math.min(can.water!, fx.uses)) }) };
  // (a second watering in the hour: one of the day's is counted, and the plant takes no third until it has dried)
  const twice = again || !seen.wet ? usePower(paid, mine, "cnTwice", now) : null;
  return {
    ok: true, plot: { ...plot, plant: { ...p, watered: now, boost: p.boost + wateringOf(purse, hand, now, fx) * (twice?.ok && !again ? 2 : 1), ...(again || twice?.ok ? { twice: now } : {}) } },
    purse: twice?.ok ? twice.purse : paid,
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
 *
 * **But for an insect that eats pests** (`FARMING.rids`; the owner, the day after: they are to work again, a ladybird
 * half the time and a mantis seven times in ten). Let go on a plant that has a pest, it is used up as ever, for the
 * stamina it costs; so often it eats the pest, and the plant is rid of it as a cure rids it (`cured` is that moment)
 * and covered by nothing: a pest may come again the same day. The other times it is off, and the plant is as it was,
 * pest and all. (On a plant with no pest it is a cover as ever, for a day.)
 * `luck` is a number given in place of the moment's own (`ridLuck`): for the trial's scripts.
 */
export function feed(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, rains: FarmSky = DRY, luck?: number): Did {
  const kind = toolOf(hand);
  if ((kind !== "feed" && kind !== "guard") || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now, rains), p = plot.plant;
  // (how often what is in the hand takes off the pest that is there: nothing, for a cover that does not, and for a plant with none)
  const rids = kind === "guard" && seen.pest ? FARMING.rids[hand!] : undefined;
  if (!p || seen.dead || (kind === "feed" && p.fed) || (kind === "guard" && (p.guard > now || (seen.pest && rids === undefined)))) return not("soil");
  const off = rids !== undefined && (luck ?? ridLuck(key, p, now)) >= rids;
  const plant = kind === "feed" ? { ...p, fed: now } : rids === undefined ? { ...p, guard: now + FARMING.guard * HOUR } : off ? p : { ...p, cured: now };
  return { ok: true, plot: { ...plot, plant }, purse: { ...spend(purse, FARMING.costs.feed, now), bag: take(purse.bag, hand!, 1) } };
}

/**
 * What came of an insect let go on a plant that had a pest, read from the plot as it was and as it is: true, the pest
 * is gone (the plant was rid of it at that moment); false, the insect is, and the pest is not. Null when the deed was
 * no such thing: something else in the hand, or a plant with no pest. For the page, which says a word of it.
 */
export function ridCameOf(key: string, was: Plot, is: Plot, hand: ItemId | null, then: number, rains: FarmSky = DRY): boolean | null {
  if (!hand || FARMING.rids[hand] === undefined || !was.plant || !see(key, was, then, rains).pest) return null;
  return !!is.plant && is.plant.cured > was.plant.cured;
}

/** Rid a plant, anybody's, of its pest, with a cure in the hand. One that keeps pests off afterwards (`FARMING.cures`: the pest cure) covers the plant for so many hours from that moment, as a cover does. */
export function cure(key: string, purse: Purse, plot: Plot, hand: ItemId | null, now: number, rains: FarmSky = DRY): Did {
  if (toolOf(hand) !== "cure" || !hasInHand(purse, hand)) return not("hand");
  const seen = see(key, plot, now, rains);
  if (!plot.plant || !seen.pest) return not("soil");
  const keeps = FARMING.cures[hand!];
  return { ok: true, plot: { ...plot, plant: { ...plot.plant, cured: now, ...(keeps ? { guard: now + keeps * HOUR } : {}) } }, purse: { ...spend(purse, FARMING.costs.cure, now), bag: take(purse.bag, hand!, 1) } };
}

/**
 * What a cure that keeps pests off afterwards is said to do, in a line (the owner, 2026-10-06: "เขียนบอกสรรพคุณด้วยว่า
 * ป้องกันแมลงได้ 24 ชม"): the one made thing of the town's that says what it is for, by his word. Its own line in the
 * bag ends with the same words (lib/town/items, which a test holds to this); the scroll of how it is made has them too.
 */
export const cureWords = (id: ItemId): { th: string; en: string } | null => {
  const hours = FARMING.cures[id];
  return hours ? { th: `กำจัดศัตรูพืชบนต้น และป้องกันศัตรูพืชต่ออีก ${hours} ชม.`, en: `Rids a plant of its pest, and keeps pests off it for ${hours} hours after.` } : null;
};
/**
 * What an insect that eats pests is said to do, in a line, with how often as a number (the owner, 2026-10-07, shown
 * a ladybird's card in the bag, which said only what it looks like: "แก้ในเกมเลย"; until then how sure each is was
 * said in round words at the catch and nowhere else). Its own line in the bag ends with the same words (lib/town/items,
 * which a test holds to this), and what is said under one that is caught has them too (TownBugs' `howTo`). Of a plant
 * with no pest, which it covers for a day, nothing is said.
 */
export const ridWords = (id: ItemId): { th: string; en: string } | null => {
  const often = FARMING.rids[id];
  if (often === undefined) return null;
  const pct = Math.round(often * 100);
  return {
    th: `ปล่อยบนต้นที่มีศัตรูพืช มีโอกาส ${pct}% ที่จะกินศัตรูพืชให้ ถ้าไม่สำเร็จจะบินหนีไป กินแล้วไม่ป้องกันศัตรูพืชต่อ`,
    en: `Let go on a plant that has a pest, it eats the pest ${pct}% of the time, or else flies off. It keeps no pests off afterwards.`,
  };
};

/** Whether a vegetable is a tree or a bush that bears for a season (picked five times and more): shears are for those, a sickle for the rest. */
export const isTree = (crop: CropId) => (CROPS[crop].picks ?? 1) >= TREE_PICKS;
/** How many a picking gives: between the vegetable's least and most, the same for everybody who asks about that picking; one more with the right blade in the hand (a sickle, or shears for a tree). */
export function yieldOf(key: string, p: Plant, hand: ItemId | null = null): number {
  const [lo, hi] = CROPS[p.crop].yield;
  return lo + Math.floor(roll(key, p.sown, p.picked) * (hi - lo + 1)) + (hand === (isTree(p.crop) ? BLADES.tree : BLADES.plant) ? 1 : 0);
}

/** Pick a ripe plant into the bag (which must have the room), by somebody who may. One that bears again goes back a stage; another leaves the plot cleared. */
export function pick(key: string, purse: Purse, plot: Plot, may: boolean, hand: ItemId | null, now: number, rains: FarmSky = DRY): Did | { ok: false; why: Refusal } {
  const p = plot.plant, seen = see(key, plot, now, rains);
  if (!p || seen.dead) return not("soil");
  if (!may) return not("theirs");
  if (!seen.ripe) return not("unripe");
  const n = yieldOf(key, p, hasInHand(purse, hand) ? hand : null);
  if (roomFor(purse.bag, p.crop) < n) return no("full");
  const picked = p.picked + 1, last = picked >= (CROPS[p.crop].picks ?? 1) + moreOf(p);
  // (the mandrake that follows whoever picks sings as a plant is picked for what would be the last time, and the plant
  // bears once more: any crop, one that is picked only once too; so many plants a day, lib/town/gifts' USES; a plant
  // it has sung to is not sung to again)
  const sung = last && !moreOf(p) ? useGift(purse, "famMandrake", now) : null, mine = sung?.ok ? sung.purse : purse, spent = last && !sung?.ok;
  return {
    ok: true, got: [[p.crop, n]],
    plot: spent ? { soil: "cleared", plant: null } : { ...plot, plant: { ...p, picked, pickedAt: now, watered: 0, ...(sung?.ok ? { more: numberOf("famMandrake") } : {}) } },
    purse: { ...spend(mine, FARMING.costs.pick, now), bag: put(mine.bag, p.crop, n) },
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
// (`twice`: the can in the hand waters a plant twice in an hour now, lib/town/farm's mayTwice: a plant wet from one watering is offered another)
export function deedFor(key: string, plot: Plot, hand: ItemId | null, me: string, now: number, owner: string | null = null, rains: FarmSky = DRY, twice = false): Deed | null {
  const seen = see(key, plot, now, rains), kind = toolOf(hand), p = plot.plant, mine = owner === null || owner === me;
  if (kind === "hoe") return p ? (!mine ? null : seen.dead ? "pull" : "uproot") : plot.soil === "wild" ? "clear" : plot.soil === "cleared" ? "till" : null;
  if (kind === "seed") return mine && plot.soil === "tilled" && !p ? "sow" : null;
  if (p && !seen.dead) {
    if (kind === "cure" && seen.pest) return "cure";
    if (kind === "can" && (!seen.wet || (twice && wetOnce(p, now, rains))) && !growing(p, now, rains).spent && !(seen.ripe && !CROPS[p.crop].again)) return "water";
    if (kind === "feed" && !p.fed) return "feed";
    // (what keeps pests off is for a plant that has none: one that has is the cure's, and an insect's that eats them)
    if (kind === "guard" && p.guard <= now && (!seen.pest || FARMING.rids[hand!] !== undefined)) return "feed";
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
 * `luck` is `feed`'s: a number in place of the moment's own, for the trial's
 * scripts.
 */
export function tend(key: string, plot: Plot, bed: Bed | undefined, others: number, holds: number, purse: Purse, me: string, now: number, rains: FarmSky = DRY, sure = false, luck?: number):
  { ok: true; deed: Deed; purse: Purse; plot: Plot; bed: Bed | undefined; got: Array<[ItemId, number]>; times?: number } | { ok: false; why: Refusal | FarmRefusal } {
  const hand = handOf(purse), owner = ownerOf(bed, others > 0 || !!plot.plant, now);
  const deed = deedFor(key, plot, hand, me, now, owner, rains, mayTwice(purse, now));
  if (!deed) return { ok: false, why: owner !== null && owner !== me ? "theirs" : "soil" };
  if (deed === "sow" && owner === null && holds >= BEDS.each) return { ok: false, why: "beds" };
  const did = deed === "clear" || deed === "till" ? hoe(key, purse, plot, hand, now, rains) : deed === "pull" || deed === "uproot" ? uproot(key, purse, plot, true, sure, hand, now, rains)
    : deed === "sow" ? sow(purse, plot, hand, me, now) : deed === "water" ? water(key, purse, plot, hand, now, rains)
      : deed === "feed" ? feed(key, purse, plot, hand, now, rains, luck) : deed === "cure" ? cure(key, purse, plot, hand, now, rains) : pick(key, purse, plot, true, hand, now, rains);
  if (!did.ok) return did;
  // (work in somebody else's bed, or on somebody else's plant, with the gardener's gloves on: half its stamina)
  const theirs = (owner !== null && owner !== me) || (!!plot.plant && plot.plant.by !== me);
  const eased = theirs ? gloved(purse, did.purse, now) : did.purse;
  // ── gifts: helpers ── (somebody else's plant watered by whoever wears the anklet: the run is one longer, and the
  // watering so many times over. The plot is as any watering leaves it: whoever keeps the game makes it the more,
  // with the heat and the well's water, never past the bound of them all: lib/town/helping's pouredAs)
  const rung = deed === "water" && theirs ? chime(eased, now) : { purse: eased, times: 1 };
  // ── forging: old tools ── (the hoe's work with a forged hoe in the hand, a watering with a forged can: what its forging takes off the stamina, lib/town/forged-keep)
  const tool = heldStack(purse);
  const eased2 = deed === "clear" || deed === "till" ? toolPaid(purse, rung.purse, now, tool, hoeFx(tool), "hoFresh") : deed === "water" ? toolPaid(purse, rung.purse, now, tool, canFx(tool), "cnFresh") : rung.purse;
  // (a plot hoed by tired hands with a hoe they keep hold of: one of the day's is counted, by the option)
  const gripped = (deed === "clear" || deed === "till") && isSpent(purse, now) && hoeFx(tool).grip ? usePower(eased2, tool, "hoGrip", now) : null;
  const gripPaid = gripped?.ok ? gripped.purse : eased2, hfx = hoeFx(tool);
  // (a wild plot cleared with a hoe that does both: it is tilled by the same game, so many a day, counted by the option)
  const both = deed === "clear" && did.plot.soil === "cleared" && hfx.both ? usePower(gripPaid, tool, "hoBoth", now) : null, bothPaid = both?.ok ? both.purse : gripPaid;
  const tilled = deed === "till" || !!both?.ok;
  // (and a plot tilled with a hoe that leaves the furrow damp: what is sown in it has had its first watering, so many a day)
  const damp = tilled && hfx.wet ? usePower(bothPaid, tool, "hoWet", now) : null, paid = damp?.ok ? damp.purse : bothPaid;
  const left: Plot = both?.ok || damp?.ok ? { soil: "tilled", plant: null, ...(damp?.ok ? { damp: true } : {}) } : did.plot;
  const planted = others > 0 || !!did.plot.plant;
  let next: Bed | undefined = owner === null ? undefined : bed;
  if (deed === "sow" && owner === null) next = { by: me, tended: now, empty: 0 };
  else if (next && owner === me) next = { ...next, tended: now, empty: planted ? 0 : next.empty || now };
  // ── forging: old tools ── (a plot tilled with a hoe that carries as much turns up a worm so often, where the bag has room for it)
  const worm = tilled && luckOf(`worm|${key}`, now) < hfx.worm && roomFor(paid.bag, WORM) > 0;
  return { ok: true, deed, purse: worm ? { ...paid, bag: put(paid.bag, WORM, 1) } : paid, plot: left, bed: next, got: worm ? [...(did.got ?? []), [WORM, 1]] : did.got ?? [], ...(rung.times > 1 ? { times: rung.times } : {}) };
}

// ── forging: old tools ──
/**
 * What a deed done with a forged hoe or can does to the plots beside the one it was done to. `keys` are the plots of
 * its row (lib/town/world's `rowOf`), `plots` those of them that are kept, as they stood before the deed; `before`
 * and `after` the purse as the deed found it and as it left it; `owner` whose the bed is now. None of it costs
 * anything: no stamina, no water, no game.
 * - **Lightning** in the hoe or in the can: so often the nearest plot of the row that wants the same deed has it too
 *   (of two as near, the one further left). `luck`: a number of chance in place of the moment's own.
 * - **A can that rains** (the counted option: so often a day): a watering in a bed of one's own waters every plant
 *   of the row that could be watered now. Counted only where another plant is there to be watered.
 * Gives the purse with whatever was counted, and the plots it changed, by their keys: mostly none.
 */
export function beside(key: string, keys: readonly string[], plots: Readonly<Record<string, Plot>>, deed: Deed, before: Purse, after: Purse, me: string, now: number,
  owner: string | null = null, rains: FarmSky = DRY, luck?: number): { purse: Purse; plots: Record<string, Plot> } {
  const nothing = { purse: after, plots: {} as Record<string, Plot> }, hoes = deed === "clear" || deed === "till";
  if ((!hoes && deed !== "water") || !keys.includes(key)) return nothing;
  const hand = handOf(before), tool = heldStack(before), x0 = xOf(key), chance = hoes ? hoeFx(tool).next : canFx(tool).next, rains2 = !hoes && canFx(tool).rain && owner === me && mayPower(after, tool, "cnRain", now);
  const both = hoes && owner === me && powerUsed(after, "hoBoth", now) > powerUsed(before, "hoBoth", now);
  if (!(chance > 0) && !rains2 && !both) return nothing;
  const want = keys.filter((k) => k !== key && (rains2 || k.split(",")[1] === key.split(",")[1]) && deedFor(k, plots[k] ?? WILD, hand, me, now, owner, rains) === deed)
    .sort((a, b) => Math.abs(xOf(a) - x0) - Math.abs(xOf(b) - x0) || xOf(a) - xOf(b));
  if (!want.length) return nothing;
  const struck = (luck ?? luckOf(`next|${key}`, now)) < chance;
  if (hoes) {
    if (both) return { purse: after, plots: Object.fromEntries(want.slice(0, optN("hoBoth", "plots", tool) - 1).map((k) => [k, { soil: "tilled", plant: null } as Plot])) };
    const did = struck ? hoe(want[0], before, plots[want[0]] ?? WILD, hand, now, rains) : null;
    return did?.ok ? { purse: after, plots: { [want[0]]: did.plot } } : nothing;
  }
  const fx = canFx(tool), wet = (k: string): Plot => { const plot = plots[k]!, p = plot.plant!; return { ...plot, plant: { ...p, watered: now, boost: p.boost + wateringOf(before, hand, now, fx) } }; };
  const rained = rains2 ? usePower(after, tool, "cnRain", now) : null;
  if (rained?.ok) return { purse: rained.purse, plots: Object.fromEntries(want.map((k) => [k, wet(k)])) };
  return struck ? { purse: after, plots: { [want[0]]: wet(want[0]) } } : nothing;
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
  if (where === "well" && isCan(hand) && purse.bag.some((s) => s?.item === hand && (s.water ?? 0) < canHolds(s))) return "fill";
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
  // a can's filling takes so many bucketfuls of the well's water (WATER.fill), however much was left in the can. A well
  // that has fewer gives what it has, and the can so much of a filling more (half a can for one bucketful of two)
  if (well < 1) return no("dry");
  // ── forging: old tools ── (the can is filled as the stack it is: what it holds is its own, a filling may take fewer bucketfuls, and what it carries stays on it)
  const slot = canSlot(purse, hand, (s) => (s.water ?? 0) < canHolds(s)), can = purse.bag[slot]!, fill = Math.max(1, canFx(can).takes ?? WATER.fill);
  const cap = canHolds(can), take = Math.min(fill, well), had = can.water ?? 0;
  const water = take >= fill ? cap : Math.min(cap, had + Math.floor((cap * take) / fill));
  return { ok: true, chore: what, well: well - take, purse: { ...spend(purse, WATER.costs.fill, now), bag: setStack(purse.bag, slot, { ...can, item: hand, n: 1, water }) } };
}

/** Every vegetable's seed is a thing, and so is what it grows (a check the tests make). */
export const SEEDS: ItemId[] = CROP_IDS.map((c) => CROPS[c].seed).filter((s) => ITEMS[s].kind === "seed");

/* ── the gifts of the farming line (lib/town/gifts) ──────────────────────── */

/**
 * A row at a time (the owner, 2026-10-07: a rank's gift cuts a whole rule of its line out, and a power that does many
 * at once has a longer, harder game of its own, in which a miss costs a part of what it would have given, never the
 * whole). A bed is seven plots by seven; a row of it is the plots that share a y. Standing on a plot, a gift of the
 * farming line does to the whole row what the thing in the hand does to that plot, at once:
 *
 * - **the enchanted hoe** (a charm, worn): weeds or tills every plot of the row that wants the same work, by one game
 *   of a beat to a plot (lib/town/timing's `startRow`); a beat missed leaves its plot undone.
 * - **the spellbound seed pouch** (a thing, had): sows every plot of the row that is ready for a seed, with the seed
 *   in the hand, for five seeds where seven plots would take seven (`pouchSeeds`: in that measure for fewer plots,
 *   never more than the plots); with fewer seeds than that in the bag, as many plots as they reach. No game of its
 *   own: sowing has none (tired hands steady themselves once for the row, as for a plot).
 * - **the crescent sickle** (a charm, worn): picks every ripe plant of the row, in its wearer's own bed, by one sweep
 *   of the blade along it (lib/town/sweep). Every plant swung at is picked, as by hand; one cut well gives one more
 *   (its number), where the bag has room for it; one cut badly gives what it would have by hand and no more.
 *
 * It is **one deed** for whoever keeps the game, judged whole (`rowTend`): told how each plot's beat went, it does
 * each plot as `tend` would have done it by itself, one after another from the plot stood on outwards, so that the
 * stamina, the bed's keeping, the gloves and what is written down are each plot's own, as ever. A row of one plot is
 * no row: that is the plain deed.
 */
export type RowDeed = "clear" | "till" | "sow" | "pick";
/**
 * How much harder a crop is to work for somebody with so many points on the farming line (lib/town/gifts' harderFor;
 * the owner, 2026-10-07: good things are harder for the skilled): what is of the second tier or better, from the
 * line's fourth rank, 8% a rank. The simplest crops are as they are for everybody, and so is bare ground. "Harder"
 * on the farm is a narrower mark: the sickle's cut on that plant, and what tired hands are given to steady, pour or
 * time by (lib/town/timing's `hard`). Those games are the page's, as the hoe's always were: it is applied there, and
 * nothing on the screen says so.
 */
export const hardFor = (crop: CropId | null | undefined, points: number): number => (crop && ITEMS[crop].tier >= 2 ? harderFor("farming", points) : 1);
/** The seeds the pouch takes for so many plots of a row of `side`: five for seven (its number), in that measure for fewer, never more than the plots. */
export const pouchSeeds = (plots: number, side = 7): number => Math.min(plots, Math.ceil((plots * numberOf("thingPouch")) / side));
/** How many plots of a row so many seeds reach from the pouch. */
export function pouchPlots(seeds: number, side = 7): number {
  let plots = 0;
  while (plots < side && pouchSeeds(plots + 1, side) <= seeds) plots++;
  return plots;
}
/** What a plot's place in its row is: its x. */
const xOf = (key: string) => Number(key.split(",")[0]);
/**
 * What a gift of the farming line would do to the row from the plot stood on (`at`), if anything: which work, and the
 * plots of the row it would do it to, the one stood on first and then outwards (of two as near, the one further left).
 * `keys` are the row's plots (lib/town/world's `rowOf`), `plots` those of them that are kept (one that is not is
 * weeds), `owner` whose the bed is now.
 */
export function rowFor(at: string, keys: readonly string[], plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, now: number, owner: string | null = null, rains: FarmSky = DRY):
  { deed: RowDeed; plots: string[] } | null {
  if (!keys.includes(at)) return null;
  const hand = handOf(purse), want = (key: string) => deedFor(key, plots[key] ?? WILD, hand, me, now, owner, rains);
  const deed = want(at);
  const hoes = (deed === "clear" || deed === "till") && wearing(purse, "charmHoe"), sows = deed === "sow" && hasThing(purse, "thingPouch");
  // (the sickle is for its wearer's own beds: not somebody else's, nor one that is nobody's)
  const reaps = deed === "pick" && owner === me && wearing(purse, "charmSickle");
  if (!hoes && !sows && !reaps) return null;
  const x0 = xOf(at), all = keys.filter((key) => want(key) === deed).sort((a, b) => Math.abs(xOf(a) - x0) - Math.abs(xOf(b) - x0) || xOf(a) - xOf(b));
  // (the pouch sows as many plots as the seeds in the bag reach, the nearest first)
  const row = sows ? all.slice(0, pouchPlots(held(purse.bag, hand!), keys.length)) : all;
  return row.length > 1 ? { deed: deed as RowDeed, plots: row } : null;
}
/**
 * **The garden gnome** (a familiar, following; the owner, 2026-10-07, in place of the weeding it began with): it goes
 * down a whole bed of its member's with a can of its own and waters every plant there that could do with water, at
 * once: no water out of the member's can, no stamina, and what a plain can would have added to each (no better
 * can's more, no green fingers: the gnome's can is the gnome's). A bed rests an hour and a half (the gift's number, in minutes) between two of its rounds
 * (`numberOf("famGnome")` minutes: kept in the purse, `gnomed`), so it is best sent when the whole bed is dry.
 * Its member's own beds only. Rain waters everything already, and a wet plot takes none, as ever.
 *
 * `plots` is every plot of the bed that is kept, by its key; `owner` whose the bed is now. The plots it would water,
 * in the order it goes: down the bed a row at a time (none: there is nothing to send it for).
 */
/** The gnome's rounds as a purse keeps them: when it last went down each bed (nothing, of what is kept wrongly). */
const roundsOf = (purse: Purse): Record<string, unknown> => { const kept: unknown = purse.gnomed; return kept && typeof kept === "object" && !Array.isArray(kept) ? (kept as Record<string, unknown>) : {}; };
const gnomedAt = (purse: Purse, bed: number): number => { const at = roundsOf(purse)[String(bed)]; return typeof at === "number" ? at : -Infinity; };
export function gnomeReach(bed: number, plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, now: number, owner: string | null, rains: FarmSky = DRY): string[] {
  const rest = famBy(purse, "famGnome") * 60_000;
  if (!(rest > 0) || owner !== me || now - gnomedAt(purse, bed) < rest) return [];
  const yx = (key: string) => key.split(",").map(Number);
  return Object.keys(plots).filter((key) => deedFor(key, plots[key], "can", "", now, null, rains) === "water")
    .sort((a, b) => yx(a)[1] - yx(b)[1] || yx(a)[0] - yx(b)[0]);
}
/**
 * Send it: the purse (which remembers the round, and is otherwise as it was), the plots it watered as they now are,
 * and which those are, in the order it went. Refused when no gnome follows (`none`), in a bed that is not mine
 * (`theirs`), when it has been down this bed within the hour or every plant that grows here is wet already (`wet`),
 * and where nothing grows that water would help (`soil`).
 */
export function gnomeWater(bed: number, plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, now: number, owner: string | null, rains: FarmSky = DRY):
  { ok: true; purse: Purse; plots: Record<string, Plot>; watered: string[] } | { ok: false; why: Refusal | FarmRefusal } {
  const rest = famBy(purse, "famGnome") * 60_000;
  if (!(rest > 0)) return { ok: false, why: "none" };
  if (owner !== me) return { ok: false, why: "theirs" };
  const kept = Object.fromEntries(Object.entries(roundsOf(purse)).filter((e): e is [string, number] => typeof e[1] === "number" && now - e[1] < rest));
  if (now - gnomedAt(purse, bed) < rest) return { ok: false, why: "wet" };
  const watered = gnomeReach(bed, plots, purse, me, now, owner, rains);
  if (!watered.length) {
    const wet = Object.keys(plots).some((key) => { const s = see(key, plots[key], now, rains); return !!plots[key].plant && !s.dead && s.wet; });
    return { ok: false, why: wet ? "wet" : "soil" };
  }
  const next: Record<string, Plot> = {};
  for (const key of watered) { const p = plots[key].plant!; next[key] = { ...plots[key], plant: { ...p, watered: now, boost: p.boost + FARMING.water.adds * 60_000 } }; }
  return { ok: true, purse: { ...purse, gnomed: { ...kept, [String(bed)]: now } }, plots: next, watered };
}

/**
 * **The hourglass of seasons** (a thing, had; the owner, 2026-10-07): turned over one bed of its owner's, everything
 * growing there grows three times as fast for three hours (`quickMs`: the plants that stand in the bed at that
 * moment, each of which remembers the turning). Once a day (lib/town/gifts' USES). A plant that waits to bear again
 * waits a third as long through it; one that is ripe gains nothing, and nothing dies of it.
 *
 * The plots of a bed it would quicken (`plots`: every plot of the bed that is kept; `owner`: whose the bed is now):
 * every plant there that lives. None: there is nothing to turn it for (not its owner's bed, used already today, the
 * sand still running there, or nothing growing that it would help).
 */
export function glassReach(plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, now: number, owner: string | null, rains: FarmSky = DRY): string[] {
  const did = glassTurn(plots, purse, me, now, owner, rains);
  return did.ok ? did.quickened : [];
}
/**
 * Turn it: the purse with the day's turning counted, the plots it quickened as they now are, which those are, and
 * until when the sand runs. Refused without the hourglass (`none`), with the day's turning used (`spent`), in a bed
 * that is not mine (`theirs`), while it still runs there (`running`), and where nothing grows that it would help:
 * no plant, or only plants that are ripe or dead (`soil`).
 */
export function glassTurn(plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, now: number, owner: string | null, rains: FarmSky = DRY):
  { ok: true; purse: Purse; plots: Record<string, Plot>; quickened: string[]; until: number } | { ok: false; why: Refusal | FarmRefusal | "spent" } {
  if (!hasThing(purse, "thingHourglass")) return { ok: false, why: "none" };
  if (usesLeft(purse, "thingHourglass", now) < 1) return { ok: false, why: "spent" };
  if (owner !== me) return { ok: false, why: "theirs" };
  const yx = (key: string) => key.split(",").map(Number);
  const live = Object.keys(plots).filter((key) => !!plots[key].plant && !see(key, plots[key], now, rains).dead).sort((a, b) => yx(a)[1] - yx(b)[1] || yx(a)[0] - yx(b)[0]);
  if (live.some((key) => quickUntil(plots[key].plant, now) !== null)) return { ok: false, why: "running" };
  // (it is turned for what is still on its way: a bed of plants that only wait to be picked has nothing to gain)
  if (!live.some((key) => !see(key, plots[key], now, rains).ripe)) return { ok: false, why: "soil" };
  const used = useGift(purse, "thingHourglass", now);
  if (!used.ok) return { ok: false, why: used.why === "spent" ? "spent" : "none" };
  const next: Record<string, Plot> = {};
  for (const key of live) { const p = plots[key].plant!; next[key] = { ...plots[key], plant: { ...p, fast: [...(Array.isArray(p.fast) ? p.fast.filter((f) => typeof f === "number") : []), now].slice(-HOURGLASS.kept) } }; }
  return { ok: true, purse: used.purse, plots: next, quickened: live, until: now + HOURGLASS.hours * HOUR };
}

/** Whether the mandrake sang to the plant in a plot as it was picked: read from the plot as it was and as it is, for the page, which shows it. */
export const sungTo = (was: Plot | undefined, is: Plot | undefined): boolean => !!was?.plant && !!is?.plant && moreOf(is.plant) > moreOf(was.plant);

/** A plot a row's deed did: which, what grows or grew there, and how many it came to (a plot hoed or sown is one; a plant picked, how many were picked, the sickle's one more among them where it was `well` cut). */
export interface RowDone { key: string; crop: CropId | null; n: number; well?: boolean }
/**
 * Do a row's deed, whole. `marks` says how each plot's beat went, by its key (a plot it says nothing of was not in
 * the game, and is left). `rest` is how many plots of the bed outside this row have a plant, and `holds` how many
 * other beds are mine, as `tend` is told them. Gives the purse, the plots that changed and the bed's keeping as they
 * are afterwards, and each plot done in the order it was done. With nothing a row's power can do here: `none`.
 */
export function rowTend(at: string, keys: readonly string[], plots: Readonly<Record<string, Plot>>, bed: Bed | undefined, rest: number, holds: number, purse: Purse, me: string, now: number,
  marks: Readonly<Record<string, boolean>>, rains: FarmSky = DRY):
  { ok: true; deed: RowDeed; purse: Purse; plots: Record<string, Plot>; bed: Bed | undefined; each: RowDone[]; got: Array<[ItemId, number]>; seeds?: number } | { ok: false; why: Refusal | FarmRefusal } {
  const planted = (state: Readonly<Record<string, Plot>>, but: string) => rest + keys.filter((k) => k !== but && !!state[k]?.plant).length;
  const found = rowFor(at, keys, plots, purse, me, now, ownerOf(bed, planted(plots, "") > 0, now), rains);
  if (!found) return { ok: false, why: "none" };
  const state: Record<string, Plot> = {}, each: RowDone[] = [], sows = found.deed === "sow", reaps = found.deed === "pick", hand = handOf(purse), got = new Map<ItemId, number>();
  // (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  const spared = sows ? found.plots.length - pouchSeeds(found.plots.length, keys.length) : 0;
  let mine = purse, keeping = bed;
  for (const key of found.plots) {
    // (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    // sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    if (reaps ? !(key in marks) : !sows && marks[key] !== true) continue;
    const plot = state[key] ?? plots[key] ?? WILD, did = tend(key, plot, keeping, planted({ ...plots, ...state }, key), holds, mine, me, now, rains);
    if (!did.ok || did.deed !== found.deed) { if (!each.length && !did.ok) return did; break; }
    mine = did.purse; keeping = did.bed; state[key] = did.plot;
    // (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if (sows && each.length < spared) mine = { ...mine, bag: put(mine.bag, hand!, 1) };
    if (!reaps) { each.push({ key, crop: plot.plant?.crop ?? did.plot.plant?.crop ?? null, n: 1 }); continue; }
    // (a plant cut well: the sickle's one more, where the bag has room for it)
    const crop = plot.plant!.crop, well = marks[key] === true, more = well && roomFor(mine.bag, crop) >= numberOf("charmSickle") ? numberOf("charmSickle") : 0;
    if (more) mine = { ...mine, bag: put(mine.bag, crop, more) };
    const n = (did.got[0]?.[1] ?? 0) + more;
    each.push({ key, crop, n, well });
    got.set(crop, (got.get(crop) ?? 0) + n);
  }
  return { ok: true, deed: found.deed, purse: mine, plots: state, bed: keeping, each, got: [...got], ...(sows ? { seeds: each.length - Math.min(spared, each.length) } : {}) };
}

/* ── the gifts of the helpers' line (lib/town/gifts, lib/town/helping) ───── */

/**
 * Whether work on a plot is work for somebody else: in a bed that is another's, or on a plant another sowed (as
 * `tend` reckons it for the gardener's gloves). What the helpers' line counts, and what its gifts are for.
 */
export const theirsAt = (plot: Plot | undefined, owner: string | null, me: string): boolean => (owner !== null && owner !== me) || (!!plot?.plant && plot.plant.by !== me);
/**
 * **The gardener's gloves** (a charm, worn; the owner, 2026-10-07): work for somebody else takes no stamina at all
 * (`tend`, by the gloves' number: what is left to pay of it), and a row of somebody else's plants is watered at one
 * long pour (lib/town/longpour), with the can in the hand.
 *
 * The plots the long pour would water from the plot stood on (`at`): every plant of the row that is somebody else's
 * and that the can in the hand could water now, from the row's head (the lowest x) as far as the water in the can
 * reaches. None: there is no row to pour along (no gloves, no can with water, the plot stood on not one of them, or
 * only the one plant). Others' plants only: in a bed of one's own nothing is changed.
 */
export function pourFor(at: string, keys: readonly string[], plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, now: number, owner: string | null = null, rains: FarmSky = DRY): string[] {
  if (!keys.includes(at) || !wearing(purse, "charmGloves")) return [];
  const hand = handOf(purse), want = (key: string) => theirsAt(plots[key], owner, me) && deedFor(key, plots[key] ?? WILD, hand, me, now, owner, rains) === "water";
  if (!want(at)) return [];
  // (each plant takes a watering out of the can, as ever: but under the fountain's blessing, which spares the can)
  const reach = hasBuff(purse, now, "spring") || canFullNow(purse, now) ? keys.length : Math.floor(waterIn(purse.bag, hand));
  const row = keys.filter(want).sort((a, b) => xOf(a) - xOf(b)).slice(0, Math.max(0, reach));
  return row.length > 1 ? row : [];
}
/** A plant the long pour watered: which plot, what grows there, and how many times over the gifts of whoever poured make that watering (1: none do; lib/town/helping). */
export interface PourDone { key: string; crop: CropId; times: number }
/**
 * Pour, whole: one deed for whoever keeps the game. `marks` says which plants the water reached, by their keys (the
 * page's game says: lib/town/longpour); each of those is watered as `tend` would have watered it by itself, from the
 * row's head on, so that the can's water, the stamina (none, with the gloves on), the bed's keeping and what is
 * written down are each plant's own, as ever. `rest`, `holds`: as `tend` is told them. `secs`: how long the pour
 * took, as the page says (it is not counted against a run of waterings: lib/town/helping's bridged).
 */
export function pourRow(at: string, keys: readonly string[], plots: Readonly<Record<string, Plot>>, bed: Bed | undefined, rest: number, holds: number, purse: Purse, me: string, now: number,
  marks: Readonly<Record<string, boolean>>, secs = 0, rains: FarmSky = DRY):
  { ok: true; purse: Purse; plots: Record<string, Plot>; bed: Bed | undefined; each: PourDone[] } | { ok: false; why: Refusal | FarmRefusal } {
  const planted = (but: string) => rest + keys.filter((k) => k !== but && !!plots[k]?.plant).length;
  const row = pourFor(at, keys, plots, purse, me, now, ownerOf(bed, planted("") > 0, now), rains);
  if (!row.length) return { ok: false, why: "none" };
  const state: Record<string, Plot> = {}, each: PourDone[] = [];
  let mine = bridged(purse, secs, now), keeping = bed;
  for (const key of row) {
    if (marks[key] !== true) continue;
    const did = tend(key, plots[key], keeping, planted(key), holds, mine, me, now, rains);
    if (!did.ok || did.deed !== "water") { if (!each.length && !did.ok) return did; break; }
    mine = did.purse; keeping = did.bed; state[key] = did.plot;
    each.push({ key, crop: plots[key].plant!.crop, times: did.times ?? 1 });
  }
  return { ok: true, purse: mine, plots: state, bed: keeping, each };
}

/**
 * **Garden fae dust** (a thing, had; the owner, 2026-10-07): sprinkled on another member's plant that has a pest, its
 * dying clock stands still for twelve hours (its number): the plant does not die of the pest in that time
 * (lib/town/helping's diesAt). It is no cure: the pest is still there, to be rid by a cure or an insect as ever, and
 * when the dust is gone the clock goes on from where it stood. Five a day (lib/town/gifts' USES); no stamina, no game
 * (it is counted). Gives the purse with the day's use counted, the plot as it now is, how many are left to the day
 * and until when the dust holds. Refused without the dust (`none`), with the day's gone (`spent`), where no living
 * plant has a pest (`soil`), on a plant of one's own (`own`), and while dust still lies on it (`running`).
 */
export function dust(key: string, purse: Purse, plot: Plot, me: string, now: number, rains: FarmSky = DRY):
  { ok: true; purse: Purse; plot: Plot; left: number; until: number } | { ok: false; why: HelpRefusal } {
  if (!hasThing(purse, "thingDust")) return { ok: false, why: "none" };
  if (usesLeft(purse, "thingDust", now) < 1) return { ok: false, why: "spent" };
  const p = plot.plant;
  if (!p || !see(key, plot, now, rains).pest) return { ok: false, why: "soil" };
  if (p.by === me) return { ok: false, why: "own" };
  if (dustUntil(p, now) !== null) return { ok: false, why: "running" };
  const used = useGift(purse, "thingDust", now);
  if (!used.ok) return { ok: false, why: used.why === "spent" ? "spent" : "none" };
  return { ok: true, left: used.left, until: now + numberOf("thingDust") * HOUR, purse: used.purse, plot: { ...plot, plant: { ...p, dust: [...dustsOf(p), now].slice(-HELPING.dust.kept) } } };
}

/**
 * How much harder a crop is to work for somebody (the owner, 2026-10-07: good things are harder for the skilled, from
 * a line's fourth rank, 8% a rank; common things are as they are): **for somebody else it is the helpers' rank that
 * counts, for oneself the farming one** (`hardFor`). `farming`, `helpers`: the points somebody has on each line.
 * Bare ground and the simplest crops are as they are for everybody.
 */
export const hardIn = (crop: CropId | null | undefined, theirs: boolean, farming: number, helpers: number): number =>
  (crop && ITEMS[crop].tier >= 2 ? harderFor(theirs ? "helpers" : "farming", theirs ? helpers : farming) : 1);
/**
 * **The guardian's cloak** (a charm, worn; the owner, 2026-10-07): with no stamina, work for somebody else is no
 * harder at all, and the games of that work are twice as wide; they can still be failed. Whether somebody's hands
 * are tired for a piece of work (`spent`: they have no stamina): never, under the cloak, where the work is for
 * somebody else. And how many times as wide its games are for them there: its number, or once.
 */
export const tiredAt = (purse: Purse, spent: boolean, theirs: boolean): boolean => spent && !(theirs && wearing(purse, "charmGuard"));
export const guardBy = (purse: Purse, theirs: boolean): number => (theirs && wearing(purse, "charmGuard") ? numberOf("charmGuard") : 1);
