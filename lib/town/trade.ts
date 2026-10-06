import { CARRIES } from "./gear";
import type { WishId } from "./fountain";
import { ITEMS, type BuffId, type DishId, type FishId, type ItemId, type MealBuffId } from "./items";

/**
 * Cash Town's trade: what the uncle's stall and the banker's counter do, as
 * rules with no storage of their own (the owner, 2026-10-03).
 *
 * - **The bag** has five slots to begin with, and everything takes one, tools
 *   too ("ปรับเหลือแค่ 5 ช่อง … ให้ผู้เล่นไปขยายกระเป๋ากันเอง"; tools, when asked:
 *   "กินช่องเหมือนของทั่วไป"). Things of a kind stack in a slot, up to a number
 *   of their own.
 * - **The uncle sells** from one stock for the whole village, refilled twice a
 *   day, and each person may buy only so many of a thing in a round ("ของที่ซื้อ
 *   มีจำกัด … เติม stock 2 รอบต่อวัน"; "กองกลาง + จำกัดต่อคน").
 * - **The uncle buys** nothing on the spot: what is left with him is fetched by
 *   his relatives at the next round, and the money then waits with him to be
 *   collected ("การซื้อ ขายของกับ ลุง popoto จะไม่ได้รับเงินทันที … ญาติลุง popoto
 *   มารับสินค้าไปขาย 2 รอบต่อวัน"). Until they come it can be taken back.
 * - **The banker changes popoto into Popoto coins**, one way, so many a week
 *   ("1 popoto = 5 … 20 ลูกต่อสัปดาห์"). The count of popoto really goes down;
 *   the record of who sent them is somebody else's to keep.
 *
 * What the things are is lib/town/items. Every number here is a knob that
 * will live in the database. Every function is given the moment it is asked
 * at, and gives back new values: nothing is changed in place, and nothing here
 * reads a clock or keeps anything. The browser's trial of it (lib/town/trial)
 * and, later, the database's functions are two keepers of the same rules.
 */

export { ITEMS };
export type { ItemId };

export const RULES = {
  /** Slots in a bag to begin with (five at first; ten since the owner's "เพิ่ม กระเป๋าเริ่มต้นจาก 5 เป็น 10 ช่อง", 2026-10-04). */
  slots: 10,
  /** Popoto coins for one popoto, and how many popoto one person may change in a week. */
  rate: 5,
  weekly: 20,
  /** The hours, in Bangkok, the uncle's relatives come by: they bring the stall its stock and fetch what was left to be sold. */
  rounds: [7, 19] as [number, number],
};

/** What the stall sells a thing for, how many it has each round for the whole village, and how many of them one person may buy. */
export interface Good { price: number; stock: number; each: number }
const good = (price: number, stock: number, each: number): Good => ({ price, stock, each });
/**
 * What the uncle's stall has: tools, bait, the kitchen's staples, a plain
 * meal, the first seeds, and the two simplest recipes, written out (the
 * owner, 2026-10-03: "สูตรง่ายๆ 1-2 อย่างมีขายใน ลุงขายของ"). A first set of
 * prices, to try with. His relatives pay less than he asks for everything he
 * sells (ITEMS' `pays`), so nothing is made by selling his goods back to him.
 */
export const GOODS: Partial<Record<ItemId, Good>> = {
  rod: good(60, 6, 1), hoe: good(50, 6, 1), can: good(40, 6, 1),
  pot: good(80, 4, 1), pan: good(70, 4, 1), grill: good(60, 4, 1),
  worm: good(2, 240, 20), dough: good(3, 160, 20),
  rice: good(3, 100, 10), salt: good(2, 100, 10), riceBox: good(6, 40, 3),
  seedKangkong: good(4, 100, 8), seedScallion: good(5, 100, 8), seedCabbage: good(8, 60, 6),
  seedCarrot: good(8, 60, 6), seedChili: good(10, 40, 4), seedPumpkin: good(25, 20, 2),
  scrollFriedMinnow: good(40, 3, 1), scrollGrilledFish: good(40, 3, 1),
  // (how the cure for pests is made: more of it than of a dish's, since every plot wants the cure)
  scrollPestCure: good(40, 6, 1),
  // for serving, carrying water and cooking in
  bowl: good(5, 60, 5), bucket: good(20, 30, 4),
  // (a net for insects, from the first day: lib/town/insects. It can be made of what the forest gives, too.)
  bugNet: good(35, 6, 1),
  bucketIron: good(70, 6, 1), apron: good(120, 4, 1),
  // The early seeds that were to be found in the wild: sold here until foraging opens (it does not, today), since
  // without them half the early dishes could not be cooked at all.
  seedDaikon: good(10, 40, 4), seedCorn: good(12, 40, 4), seedTomato: good(14, 40, 4), seedBasil: good(8, 40, 4),
  seedSweetPotato: good(14, 40, 4), seedGarlic: good(10, 40, 4),
  // The later tiers' basic things (the owner, 2026-10-03: "make sure ว่า recipe ของอาหารทุกอย่าง สามารถหาได้ในเกม"): gear,
  // bait, staples, seeds, and the two things no line of work makes. What is grown, caught or made is not sold.
  rodTeak: good(240, 3, 1), floatQuill: good(90, 4, 1), hookSteel: good(90, 4, 1), lineBraid: good(90, 4, 1), netSmall: good(110, 4, 1),
  hoeIron: good(180, 4, 1), canCopper: good(150, 4, 1), sickle: good(120, 4, 1), krabung: good(150, 4, 1),
  mortar: good(130, 4, 1), steamer: good(160, 4, 1), cleaver: good(130, 4, 1), jar: good(110, 6, 2), wok: good(190, 4, 1),
  cricket: good(4, 80, 10), branBait: good(4, 80, 10), shrimpLive: good(6, 60, 10),
  sugar: good(6, 80, 10), oil: good(6, 80, 10), tamarind: good(5, 80, 10), egg: good(6, 60, 10), manure: good(8, 60, 10),
  // (and what the dishes of other countries take: flour came down a tier for them)
  flour: good(7, 80, 10), seaweed: good(8, 60, 10), tofu: good(7, 60, 10), rollingPin: good(90, 4, 1), sushiMat: good(100, 4, 1), stoneBowl: good(140, 4, 1),
  seedEggplant: good(18, 40, 4), seedCucumber: good(16, 40, 4), seedLongBean: good(16, 40, 4), seedLemongrass: good(20, 40, 4),
  seedGalangal: good(26, 30, 4), seedLime: good(70, 12, 2), seedPapaya: good(32, 20, 2),
  scrollSomTam: good(90, 3, 1), scrollOmelette: good(60, 3, 1),
  rodMaster: good(600, 2, 1), floatBell: good(220, 3, 1), hookTwin: good(220, 3, 1), lineSilk: good(220, 3, 1), netLong: good(260, 3, 1),
  hoeSteel: good(420, 3, 1), canBrass: good(360, 3, 1), shears: good(280, 3, 1), yoke: good(300, 3, 1),
  potBrass: good(460, 3, 1), stoveBig: good(380, 3, 1), panBrass: good(440, 3, 1), steamerBamboo: good(330, 3, 1), hotpot: good(520, 2, 1),
  ladle: good(50, 10, 1), tok: good(150, 6, 1),
  antEggs: good(14, 50, 10), lure: good(70, 10, 2), fermentedBait: good(12, 50, 10),
  stickyRice: good(7, 80, 10), soy: good(12, 60, 10), pepper: good(14, 60, 10), bananaLeaf: good(5, 80, 10),
  cheese: good(16, 50, 10), milk: good(9, 60, 10), oven: good(480, 2, 1),
  seedMango: good(95, 10, 2), seedBanana: good(60, 12, 2), seedCoconut: good(110, 8, 2), seedGinger: good(38, 30, 4),
  seedTurmeric: good(38, 30, 4), seedTaro: good(42, 30, 4), seedWatermelon: good(46, 20, 2),
  scrollGreenCurry: good(160, 2, 1), scrollHoMok: good(160, 2, 1),
};
/** The stall's shelf, in the order it is laid out. */
export const SHELF = Object.keys(GOODS) as ItemId[];

/* ── the clock ──────────────────────────────────────────────────────────── */

export const HOUR = 3_600_000, DAY = 24 * HOUR;
/** Bangkok is seven hours ahead all year. */
export const BANGKOK = 7 * HOUR;

/** The round a moment is in: two a day, numbered from long ago, each from one of the uncle's hours to the next. */
export function roundOf(now: number): number {
  const [a, b] = RULES.rounds;
  const t = now + BANGKOK - a * HOUR, day = Math.floor(t / DAY);
  return day * 2 + (t - day * DAY >= (b - a) * HOUR ? 1 : 0);
}
/** The moment a round begins. */
export function roundStart(round: number): number {
  const [a, b] = RULES.rounds;
  const day = Math.floor(round / 2);
  return day * DAY + (round - day * 2 ? b : a) * HOUR - BANGKOK;
}
/** When the relatives come next. */
export const nextRoundAt = (now: number) => roundStart(roundOf(now) + 1);
/**
 * A stretch of time as the stall counts it down: whole hours and minutes; and under ten minutes the seconds too
 * (`s` is null while they are not said). Never less than nothing.
 */
export function leftOf(ms: number): { h: number; m: number; s: number | null } {
  const secs = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return { h, m, s: h || m >= 10 ? null : secs % 60 };
}
/** The week a moment is in, from Monday's first minute in Bangkok. */
export function weekOf(now: number): number {
  return Math.floor((Math.floor((now + BANGKOK) / DAY) + 3) / 7);
}

/* ── what is kept ───────────────────────────────────────────────────────── */

/** Some of one thing, in a slot of a bag. */
/**
 * So many of a thing in one slot. A few things hold something: a pot of food its dish and the helpings left (`of`,
 * lib/town/cooking), a watering can the waterings left in it and a bucket whether it is full (`water`, lib/town/farm).
 */
export interface Stack { item: ItemId; n: number; of?: { dish: DishId; left: number }; water?: number }
/**
 * Some of one thing left with the uncle to be sold: what each fetches at the usual price, the round it was left in,
 * and the round's price it was left at, in hundredths of the usual one (lib/town/market; left out when it is the
 * usual price, as it is for everything the price of which does not move, and for a lot from before prices moved).
 */
export interface Lot { item: ItemId; n: number; pays: number; round: number; f?: number }
/** What a lot fetches in all: whole coins. */
export const lotWorth = (l: Lot) => (l.n * l.pays * (l.f ?? 100)) / 100;

/**
 * One person's: their coins and bag, what they have bought this round, what
 * they left to be sold, and their popoto; and how they are (lib/town/stamina):
 * their stamina, the day's meals, the meal they are at, the buff the last one
 * left; and what they have done: the longest of each fish landed, and the
 * recipes they know.
 */
export interface Purse {
  coins: number;
  bag: Array<Stack | null>;
  bought: { round: number; n: Partial<Record<ItemId, number>> };
  left: Lot[];
  /** Popoto changed this week. */
  changed: { week: number; n: number };
  /** The popoto there are to change: those sent on the profile, and those from pictures. */
  popoto: { profile: number; gallery: number };
  /** Stamina left, on the day it was last counted (a new day begins it full). */
  stamina: { day: number; left: number };
  /**
   * Which of the day's three meals have been eaten of, and (`bowls`) how many helpings in each one's hours: three at
   * the most (lib/town/stamina). A purse from before helpings were counted has no `bowls`: a meal it ate is one.
   */
  meals: { day: number; eaten: [boolean, boolean, boolean]; bowls?: [number, number, number] };
  /** The meal being eaten: the dish, which meal of the day it is, when it was begun, how far it had been counted, and the stamina it has given so far. */
  eating: { dish: DishId; meal: 0 | 1 | 2; from: number; till: number; got: number } | null;
  /** The buff of the last helping eaten, as it was kept before buffs had levels: still written, for a page that knows no better. */
  buff: { id: BuffId; until: number } | null;
  /** What meals have left, each while it lasts: held together, each at its level (lib/town/stamina's mealBuffs reads them; a purse from before has only `buff`). */
  buffs?: Array<{ id: MealBuffId; level: number; until: number }>;
  /** The fountain's blessings somebody has, each while it lasts (lib/town/fountain): put there as the purse is read, and held beside the meal's buff. */
  blessed?: Array<{ id: WishId; until: number }>;
  best: Partial<Record<FishId, number>>;
  /** The recipes read off scrolls: of dishes, and of the one other thing a scroll tells of (lib/town/items' SCROLLS). */
  recipes: ItemId[];
  /** The thing taken up to hold in the hand, for everybody to see (handOf says whether it is still held). Missing from a purse older than hands. */
  hand?: ItemId | null;
  /** Bowls a meal has done with that the bag had no room for when it ended: they come back as soon as there is room (lib/town/stamina). */
  owed?: number;
  /** What is worn to carry more (a basket, a carrying basket, a carrying pole): each makes the bag bigger, and is no longer in it. */
  wears?: ItemId[];
  /** The gifts of the lines of work somebody has taken, and the charms worn of them, the familiar that follows, and what part of a point of stamina the gloves' half has left owing (lib/town/gifts reads them, and makes them sound): in no slot of the bag. */
  gifts?: { had: string[]; charms: string[]; owed?: number; familiar?: string | null; used?: Record<string, { k: number; n: number }> };
  /** The hints bought from the uncle (lib/town/hints), and what else has been made besides dishes (lib/town/cooking): each by the thing it is of. */
  hints?: ItemId[];
  made?: ItemId[];
  /** How many times something has been cooked that was a recipe's own but for its last thing: by the recipe (lib/town/cooking). */
  tries?: Partial<Record<ItemId, number>>;
  // ── gifts: kitchen ──
  /** The dimension basket (lib/town/cooking): the helpings kept in it, each dish once with how many of it, in the order they were first put in. In no slot of the bag. */
  basket?: Array<[DishId, number]>;
  /** The recipes whose secret thing the whispering spoon has told (lib/town/cooking): each is read whole from then on. */
  whispers?: ItemId[];
  /** The stardust spice sprinkled on the bowl being eaten (lib/town/cooking, lib/town/stamina): the meal it was sprinkled on, by the moment that meal began, and the level its buff is at once it is eaten up. Of no meal but that one. */
  spiced?: { from: number; level: number };
  // ── gifts: farming ──
  /** When the garden gnome last went down each bed of mine with its can, by the bed's number (lib/town/farm's gnomeWater: a bed rests an hour between two of its rounds). Only rounds that still count are kept. */
  gnomed?: Record<string, number>;
}
/** The village's: how many of each thing the stall has sold this round. */
export interface Stall { round: number; sold: Partial<Record<ItemId, number>> }

export const newPurse = (popoto: Purse["popoto"] = { profile: 0, gallery: 0 }): Purse => ({
  coins: 0, bag: Array<Stack | null>(RULES.slots).fill(null), bought: { round: 0, n: {} }, left: [], changed: { week: 0, n: 0 }, popoto: { ...popoto },
  stamina: { day: -1, left: 0 }, meals: { day: -1, eaten: [false, false, false] }, eating: null, buff: null, best: {}, recipes: [],
});
export const newStall = (): Stall => ({ round: 0, sold: {} });

/** Why something was not done. */
export type Refusal =
  | "coins"    // not enough Popoto coins
  | "sold"     // the stall has none left this round
  | "each"     // this person has bought all they may this round
  | "full"     // no room in the bag
  | "none"     // nothing of the kind there (an empty slot, a lot that is not there, a thing the stall does not sell)
  | "unwanted" // the relatives do not take it
  | "gone"     // the relatives have fetched it already
  | "nothing"  // no money waiting
  | "cap"      // this week's popoto are changed already
  | "popoto"   // not that many popoto to change
  | "amount"   // not a whole number above nothing
  | "tool"     // the tool for it is not in the bag
  | "meal"     // this meal has been eaten already, or one is being eaten
  | "stand"    // a meal is eaten sitting down
  | "known"    // the recipe is known already
  | "dry"      // no water: an empty can, an empty bucket, an empty well
  | "worn"     // one of the kind is worn already
  | "crew"     // not everybody the dish takes is at their place
  | "taken"    // something stands there already
  | "many"     // as many pots of food standing about as one person may leave
  | "note"     // a wish's words cannot be kept: too long
  | "busy"     // one of the two is in a deal already
  | "away";    // the town's books could not be reached (the database's keeping: lib/town/keeper)
export type Done<T> = ({ ok: true } & T) | { ok: false; why: Refusal };

const whole = (n: number) => Number.isInteger(n) && n > 0;
export const no = (why: Refusal): { ok: false; why: Refusal } => ({ ok: false, why });

/* ── the bag ────────────────────────────────────────────────────────────── */

/** How many of something are in a bag. */
export const held = (bag: Purse["bag"], id: ItemId) => bag.reduce((t, s) => t + (s?.item === id ? s.n : 0), 0);
/** How many more of it the bag has room for: what its own stacks lack, and every empty slot. */
export function roomFor(bag: Purse["bag"], id: ItemId): number {
  const stack = ITEMS[id].stack;
  return bag.reduce((t, s) => t + (!s ? stack : s.item === id ? stack - s.n : 0), 0);
}
/** A bag with some more of something in it: onto its own stacks first, then into the first empty slots. (It must have the room.) */
export function put(bag: Purse["bag"], id: ItemId, n: number): Purse["bag"] {
  const out = bag.map((s) => (s ? { ...s } : null)), stack = ITEMS[id].stack;
  for (const s of out) if (n > 0 && s?.item === id && s.n < stack) { const add = Math.min(n, stack - s.n); s.n += add; n -= add; }
  for (let i = 0; i < out.length && n > 0; i++) if (!out[i]) { const add = Math.min(n, stack); out[i] = { item: id, n: add }; n -= add; }
  return out;
}
/** A bag with some of something taken out of it, from its last stacks first. (It must hold as many.) */
export function take(bag: Purse["bag"], id: ItemId, n: number): Purse["bag"] {
  const out = bag.map((s) => (s ? { ...s } : null));
  for (let i = out.length - 1; i >= 0 && n > 0; i--) {
    const s = out[i];
    if (s?.item !== id) continue;
    const less = Math.min(n, s.n);
    n -= less;
    out[i] = s.n === less ? null : { item: id, n: s.n - less };
  }
  return out;
}

/**
 * A bag as big as bags are now: one kept from when they began smaller is given the slots it lacks, at its end (what
 * is in it stays where it is). As big as a bag begins, and as much again as what is worn carries.
 */
export function roomy(purse: Purse): Purse {
  const want = RULES.slots + (purse.wears ?? []).reduce((n, w) => n + (CARRIES[w] ?? 0), 0);
  return purse.bag.length >= want ? purse : { ...purse, bag: [...purse.bag, ...Array<null>(want - purse.bag.length).fill(null)] };
}

/* ── the hand ───────────────────────────────────────────────────────────── */

/**
 * Anything in the bag can be held in the hand (the owner, 2026-10-03: "ของทุก
 * ชิ้นสามารถ กดใส่เพื่อถือในมือได้เช่น คันเบ็ดหรือปลา"): it stays in the bag, and the
 * hand shows it to the town. What is held is held while there is still one of
 * it in the bag: sold, eaten or used up to the last, the hand is empty again.
 */
export const handOf = (purse: Purse): ItemId | null => (purse.hand && held(purse.bag, purse.hand) > 0 ? purse.hand : null);
/** Take up the thing in a slot of the bag. */
export function hold(purse: Purse, slot: number): Done<{ purse: Purse }> {
  const s = purse.bag[slot];
  if (!s) return no("none");
  return { ok: true, purse: { ...purse, hand: s.item } };
}
/** Put away what is held. */
export const letGo = (purse: Purse): Purse => ({ ...purse, hand: null });

/* ── what is worn to carry more ─────────────────────────────────────────── */

/**
 * A bag is made bigger by what is worn (the owner, 2026-10-03: "ให้ผู้เล่นไปขยาย
 * กระเป๋ากันเอง"): a woven basket, a carrying basket, a carrying pole, each so
 * many slots more (lib/town/gear's CARRIES), one of a kind. The thing leaves
 * the bag when it is put on. Taking it off takes its slots away again: what
 * was in the bag has to fit in what is left, with the thing itself.
 */
export function wear(purse: Purse, slot: number): Done<{ purse: Purse }> {
  const s = purse.bag[slot], more = s ? CARRIES[s.item] : undefined;
  if (!s || !more) return no("none");
  if ((purse.wears ?? []).includes(s.item)) return no("worn");
  const bag = [...purse.bag.map((b, i) => (i !== slot ? b : s.n > 1 ? { ...s, n: s.n - 1 } : null)), ...Array<Stack | null>(more).fill(null)];
  return { ok: true, purse: { ...purse, bag, wears: [...(purse.wears ?? []), s.item] } };
}
export function takeOff(purse: Purse, item: ItemId): Done<{ purse: Purse }> {
  const more = CARRIES[item];
  if (!more || !(purse.wears ?? []).includes(item)) return no("none");
  const things = purse.bag.filter((s): s is Stack => !!s), slots = purse.bag.length - more;
  if (things.length + 1 > slots) return no("full");
  const bag: Purse["bag"] = [...things, { item, n: 1 }, ...Array<Stack | null>(slots - things.length - 1).fill(null)];
  return { ok: true, purse: { ...purse, bag, wears: (purse.wears ?? []).filter((w) => w !== item) } };
}

/* ── the uncle's stall ──────────────────────────────────────────────────── */

/** How many of something the stall has left this round, for the village. */
export function onShelf(stall: Stall, id: ItemId, now: number): number {
  return Math.max(0, (GOODS[id]?.stock ?? 0) - (stall.round === roundOf(now) ? stall.sold[id] ?? 0 : 0));
}
/** How many of it this person has bought this round. */
const boughtNow = (purse: Purse, id: ItemId, now: number) => (purse.bought.round === roundOf(now) ? purse.bought.n[id] ?? 0 : 0);

/** How many of something this person may buy now, and what stops them at that. `shelf` is what the stall has open (lib/town/orders); everything he ever sells, when it is not given. */
export function mayBuy(purse: Purse, stall: Stall, id: ItemId, now: number, shelf?: ItemId[]): { n: number; stop: Refusal } {
  const g = GOODS[id];
  if (!g || (shelf && !shelf.includes(id))) return { n: 0, stop: "none" };
  const limits: Array<[Refusal, number]> = [
    ["sold", onShelf(stall, id, now)],
    ["each", g.each - boughtNow(purse, id, now)],
    ["full", roomFor(purse.bag, id)],
    ["coins", Math.floor(purse.coins / g.price)],
  ];
  const n = Math.max(0, Math.min(...limits.map(([, v]) => v)));
  return { n, stop: limits.find(([, v]) => v <= n)![0] };
}

/** Buy some of something from the stall. */
export function buy(purse: Purse, stall: Stall, id: ItemId, n: number, now: number, shelf?: ItemId[]): Done<{ purse: Purse; stall: Stall }> {
  if (!whole(n)) return no("amount");
  const may = mayBuy(purse, stall, id, now, shelf);
  if (n > may.n) return no(may.stop);
  const round = roundOf(now);
  return {
    ok: true,
    purse: {
      ...purse,
      coins: purse.coins - n * GOODS[id]!.price,
      bag: put(purse.bag, id, n),
      bought: { round, n: { ...(purse.bought.round === round ? purse.bought.n : {}), [id]: boughtNow(purse, id, now) + n } },
    },
    stall: { round, sold: { ...(stall.round === round ? stall.sold : {}), [id]: (stall.round === round ? stall.sold[id] ?? 0 : 0) + n } },
  };
}

/**
 * Leave some of what is in a slot with the uncle, to be sold: it is out of the bag at once, and paid for after the
 * relatives come. `f` is the round's price for the thing, in hundredths of its usual one (lib/town/market): the lot
 * keeps it, whatever the price does afterwards.
 */
export function leave(purse: Purse, slot: number, n: number, now: number, f = 100): Done<{ purse: Purse }> {
  if (!whole(n)) return no("amount");
  const s = purse.bag[slot];
  if (!s || s.n < n) return no("none");
  const round = roundOf(now), pays = ITEMS[s.item].pays;
  if (!pays) return no("unwanted");
  const bag = purse.bag.map((b, i) => (i !== slot ? b : s.n === n ? null : { item: s.item, n: s.n - n }));
  const same = purse.left.findIndex((l) => l.item === s.item && l.round === round && l.pays === pays && (l.f ?? 100) === f);
  const left = same < 0 ? [...purse.left, { item: s.item, n, pays, round, ...(f === 100 ? {} : { f }) }]
    : purse.left.map((l, i) => (i === same ? { ...l, n: l.n + n } : l));
  return { ok: true, purse: { ...purse, bag, left } };
}

/** What is with the uncle: what he still holds (it can be taken back), and what the relatives have fetched, with the money that is waiting for it. */
export function waiting(purse: Purse, now: number): { held: Lot[]; fetched: Lot[]; coins: number } {
  const round = roundOf(now);
  const held = purse.left.filter((l) => l.round >= round), fetched = purse.left.filter((l) => l.round < round);
  // (whole coins: the odd part of what was fetched at a price that moved is lost)
  return { held, fetched, coins: Math.floor(fetched.reduce((t, l) => t + lotWorth(l), 0)) };
}

/** Take back something left with the uncle, while he still has it. `at` counts along `waiting().held`. */
export function takeBack(purse: Purse, at: number, now: number): Done<{ purse: Purse }> {
  const lot = waiting(purse, now).held[at];
  if (!lot) return no(purse.left.length ? "gone" : "none");
  if (roomFor(purse.bag, lot.item) < lot.n) return no("full");
  return { ok: true, purse: { ...purse, bag: put(purse.bag, lot.item, lot.n), left: purse.left.filter((l) => l !== lot) } };
}

/** Collect the money for everything the relatives have fetched. */
export function collect(purse: Purse, now: number): Done<{ purse: Purse; coins: number }> {
  const { held: stillHeld, coins } = waiting(purse, now);
  if (!coins) return no("nothing");
  return { ok: true, coins, purse: { ...purse, coins: purse.coins + coins, left: stillHeld } };
}

/* ── the banker's counter ───────────────────────────────────────────────── */

/** How many popoto this person may still change this week. */
export const mayChange = (purse: Purse, now: number) => Math.max(0, RULES.weekly - (purse.changed.week === weekOf(now) ? purse.changed.n : 0));

/** Change popoto of one kind into Popoto coins: they come off the count for good. */
export function change(purse: Purse, kind: keyof Purse["popoto"], n: number, now: number): Done<{ purse: Purse; coins: number }> {
  if (!whole(n)) return no("amount");
  if (n > mayChange(purse, now)) return no("cap");
  if (n > Math.floor(purse.popoto[kind])) return no("popoto");
  const coins = n * RULES.rate, week = weekOf(now);
  return {
    ok: true, coins,
    purse: {
      ...purse,
      coins: purse.coins + coins,
      popoto: { ...purse.popoto, [kind]: purse.popoto[kind] - n },
      changed: { week, n: RULES.weekly - mayChange(purse, now) + n },
    },
  };
}
