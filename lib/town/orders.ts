import { roll } from "./farm";
import { CROPS, CROP_IDS, DISHES, DISH_IDS, FISH, FISH_IDS, ITEMS, LATER_MADE, MAKES, MAKE_IDS, type ItemId } from "./items";
import { dayOf } from "./stamina";
import { GOODS, no, type Done, type Purse } from "./trade";
import { sources, type Source } from "./uses";

/**
 * The uncle's daily order (the owner, 2026-10-03, reminding me while the game
 * was being finished: "อย่าลืมว่า ลุงขายของ จะมีเควส รายวันปลดล็อคของในร้านทีละอย่าง เราเอาของ
 * basic ขึ้นมาก่อน แล้วค่อยๆปลดล็อคไปดีกว่า"; it was his from the day's plan: "ลุงจะมีของที่
 * อยากได้วันละสามอย่าง ทั้งหมู่บ้านช่วยกันหามาให้ครบ ลุงก็จะมีของใหม่มาขาย").
 *
 * - **The stall begins with the basic things only** (`BASIC`): the first
 *   tools, bait, rice and salt, a plain meal, the first seeds, the two
 *   simplest recipes, and what a pot of food and the well need.
 * - **Each day the uncle wants three things**, so many of each: something
 *   from the river, something from the plots, something from the kitchen.
 *   Whoever brings some is paid for it on the spot, at what his relatives
 *   pay. The whole village fills the order between them.
 * - **A day whose order is filled opens one more thing on his shelf**, for
 *   everybody and for good: the next of `UNLOCKS`, in order. One a day at the
 *   most; a day that is not filled opens nothing, and the next day's order is
 *   a new one.
 *
 * He only ever asks for what can be had with what he already sells (worked
 * out by lib/town/uses, the same reckoning that says everything can be had),
 * and for nothing slow or rare: common fish, vegetables that ripen within two
 * days, and what is cooked or made of those by one or two cooks, of no later
 * tier than his shelf has reached. So an order can always be filled, and the
 * shelf can always grow to its end.
 *
 * Pure. A day is the game's day (it begins at dawn, like stamina). The order
 * of the unlocks and every number are knobs for the database.
 */
export const ORDER = {
  /** How many of a thing he wants, least and most: a fish, a vegetable, something cooked or made. */
  n: { fish: [4, 8], crop: [4, 8], made: [2, 4] } as Record<"fish" | "crop" | "made", [number, number]>,
  /** A vegetable he asks for ripens within so many hours. */
  ripe: 48,
  /** What he asks for of the kitchen is made by no more than so many cooks. */
  cooks: 2,
};

/** What the stall has from the first day. */
export const BASIC: ItemId[] = [
  "rod", "hoe", "can", "pot", "pan", "grill", "worm", "dough", "rice", "salt", "riceBox",
  "seedKangkong", "seedScallion", "seedCabbage", "seedCarrot", "seedChili", "seedPumpkin",
  "scrollFriedMinnow", "scrollGrilledFish", "scrollPestCure", "bowl", "bucket",
];
/**
 * What the orders open, in this order, one for each day filled: the early
 * seeds that were to be found in the wild; then the second tier, something
 * new to do with nearly every one (a bait, a seed, a staple, a piece of
 * cookware) before the better gear; then the third.
 */
export const UNLOCKS: ItemId[] = [
  "seedGarlic", "seedBasil", "seedTomato", "seedCorn", "seedDaikon", "seedSweetPotato",
  "cricket", "seedCucumber", "oil", "egg", "scrollOmelette", "flour", "mortar", "seedLongBean", "sugar", "rollingPin", "seedEggplant", "branBait", "wok",
  "seaweed", "seedLemongrass", "jar", "sushiMat", "seedGalangal", "shrimpLive", "steamer", "tofu", "seedLime", "cleaver", "stoneBowl", "seedPapaya", "scrollSomTam", "tamarind", "manure",
  "floatQuill", "hookSteel", "lineBraid", "netSmall", "rodTeak", "hoeIron", "canCopper", "sickle", "krabung", "bucketIron", "apron",
  "antEggs", "seedGinger", "soy", "stickyRice", "seedBanana", "bananaLeaf", "pepper", "milk", "seedTurmeric", "seedTaro", "fermentedBait", "cheese",
  "seedWatermelon", "steamerBamboo", "oven", "seedCoconut", "seedMango", "lure", "potBrass", "panBrass", "hotpot", "stoveBig", "ladle", "tok",
  "scrollGreenCurry", "scrollHoMok", "floatBell", "hookTwin", "lineSilk", "netLong", "rodMaster", "hoeSteel", "canBrass", "shears", "yoke",
];
/** What the stall sells when so many orders have been filled. */
export const shelfOf = (unlocked: number): ItemId[] => [...BASIC, ...UNLOCKS.slice(0, Math.max(0, Math.min(UNLOCKS.length, Math.floor(unlocked))))];

/** What the village has done for the uncle: how many of his orders were filled, and how today's stands. */
export interface Village {
  /** How many things his orders have opened. */
  unlocked: number;
  /** The day the count below is of, and how many of each thing have been brought that day. */
  day: number;
  got: Partial<Record<ItemId, number>>;
  /** The day an order last opened something (a day opens one thing at the most). */
  opened: number;
}
export const newVillage = (): Village => ({ unlocked: 0, day: -1, got: {}, opened: -1 });

/** Everything that can be had when so many things are open, and from where. Worked out once for each count. */
const had = new Map<number, Map<ItemId, Source>>();
export function sourcesAt(unlocked: number): Map<ItemId, Source> {
  let from = had.get(unlocked);
  if (!from) { from = sources(shelfOf(unlocked)); had.set(unlocked, from); }
  return from;
}

/** What he may ask for when so many things are open, by where it comes from. Worked out once for each count. */
const askable = new Map<number, Record<"fish" | "crop" | "made", ItemId[]>>();
export function mayAsk(unlocked: number): Record<"fish" | "crop" | "made", ItemId[]> {
  const have = askable.get(unlocked);
  if (have) return have;
  const shelf = shelfOf(unlocked), from = sourcesAt(unlocked);
  // (a common fish, and one that waits for nothing: no sign, and no rain. So an order can be filled on any day.)
  const fish = FISH_IDS.filter((id) => FISH[id].tier === "common" && !FISH[id].needs && (FISH[id].dry ?? 1) > 0 && from.has(id));
  const crop = CROP_IDS.filter((id) => from.has(id) && CROPS[id].hours <= ORDER.ripe);
  // what is quick to come by: those, what he sells, and the weed every line brings up; then what is made of them
  const quick = new Set<ItemId>([...fish, ...crop, ...shelf, ...(from.has("hyacinth") ? ["hyacinth" as ItemId] : [])]);
  // (and nothing of a later tier than his shelf has reached: while he sells only the early game's things, he asks
  // only for the early game's dishes, two of which he sells the recipe of)
  const top = Math.max(...shelf.map((id) => ITEMS[id].tier));
  const made: ItemId[] = [];
  for (let more = true; more;) {
    more = false;
    for (const id of [...DISH_IDS, ...MAKE_IDS]) {
      const r = id in DISHES ? DISHES[id as keyof typeof DISHES].recipe : { ...MAKES[id]!, cooks: 1 };
      // (nor for anything he sells himself, now or later: so what he may ask for only ever grows as his shelf opens)
      if (!r || made.includes(id) || quick.has(id) || id in GOODS || r.cooks > ORDER.cooks || ITEMS[id].stack < 2 || !ITEMS[id].pays || ITEMS[id].tier > top) continue;
      // (nor, for now, for what is cooked of the fish that came on 2026-10-05: the village had filled no order when
      // they came, and a dish nobody has found the recipe of would make the kitchen's third of one harder still.
      // The fish themselves he does ask for, which is how many will first hear of them.)
      if (LATER_MADE.includes(id)) continue;
      if (!r.needs.every(([n]) => quick.has(n)) || !r.in.every((t) => shelf.includes(t))) continue;
      made.push(id);
      quick.add(id);
      more = true;
    }
  }
  // (in the catalog's own order, whatever order they were found to be makeable in: the list for a stage is then
  // the same list with more in it, which is all the database keeps of it, lib/town/catalog)
  const all = [...DISH_IDS, ...MAKE_IDS] as ItemId[];
  made.sort((a, b) => all.indexOf(a) - all.indexOf(b));
  const out = { fish, crop, made };
  askable.set(unlocked, out);
  return out;
}

/** One thing the uncle wants today: what, and how many. */
export type Want = [item: ItemId, n: number];
/** The uncle's order for a day, when so many things are open: one thing from the river, one from the plots, one from the kitchen (or what there is, while one of them has nothing yet). The same for everybody. */
export function wantsFor(day: number, unlocked: number): Want[] {
  const pool = mayAsk(unlocked), wants: Want[] = [];
  (["fish", "crop", "made"] as const).forEach((kind, i) => {
    // (a kind with nothing in it yet borrows from the river, which never has nothing)
    const from = (pool[kind].length ? pool[kind] : pool.fish).filter((id) => !wants.some(([w]) => w === id));
    if (!from.length) return;
    const [lo, hi] = ORDER.n[kind];
    wants.push([from[Math.floor(roll("want", day, i) * from.length)], lo + Math.floor(roll("many", day, i) * (hi - lo + 1))]);
  });
  return wants;
}

/** Today's order as it stands: each thing wanted, how many, how many have come; whether it is filled; and what filling it opens (nothing, when it has opened something already or the shelf is whole). */
export interface Order { day: number; wants: Array<{ item: ItemId; n: number; got: number }>; filled: boolean; opens: ItemId | null }
export function orderOf(village: Village, now: number): Order {
  const day = dayOf(now), today = village.day === day;
  // (the day's order is the one it began with: what it opened today does not change what was asked)
  const stage = village.opened === day ? village.unlocked - 1 : village.unlocked;
  const wants = wantsFor(day, stage).map(([item, n]) => ({ item, n, got: Math.min(n, today ? village.got[item] ?? 0 : 0) }));
  const filled = wants.length > 0 && wants.every((w) => w.got >= w.n);
  return { day, wants, filled, opens: village.opened === day ? null : UNLOCKS[village.unlocked] ?? null };
}

/**
 * Bring the uncle some of what is in a slot of the bag, for today's order: as
 * many as asked, or fewer when he wants fewer or the slot has fewer. Paid on
 * the spot, at what his relatives pay. The thing that fills the order opens
 * the next thing on his shelf.
 */
export function give(purse: Purse, village: Village, slot: number, n: number, now: number): Done<{ purse: Purse; village: Village; given: number; coins: number; opened: ItemId | null }> {
  if (!Number.isInteger(n) || n < 1) return no("amount");
  const s = purse.bag[slot];
  if (!s) return no("none");
  const order = orderOf(village, now), want = order.wants.find((w) => w.item === s.item);
  if (!want || want.got >= want.n) return no("unwanted");
  const given = Math.min(n, s.n, want.n - want.got), coins = given * ITEMS[s.item].pays;
  const got = { ...(village.day === order.day ? village.got : {}), [s.item]: want.got + given };
  const filled = order.wants.every((w) => (w.item === s.item ? want.got + given : w.got) >= w.n);
  const opened = filled && order.opens ? order.opens : null;
  return {
    ok: true, given, coins, opened,
    purse: { ...purse, coins: purse.coins + coins, bag: purse.bag.map((b, i) => (i !== slot ? b : s.n === given ? null : { ...s, n: s.n - given })) },
    village: { unlocked: village.unlocked + (opened ? 1 : 0), day: order.day, got, opened: opened ? order.day : village.opened },
  };
}

/** Every thing the stall ever sells is either there from the first day or opened by an order (a check the tests make). */
export const EVERY_GOOD = Object.keys(GOODS) as ItemId[];
