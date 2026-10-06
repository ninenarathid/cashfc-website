import { COOK_EASE, KITCHEN_GEAR } from "./gear";
import { BOWL, DISHES, DISH_IDS, ITEMS, MAKES, MAKE_IDS, isDish, type Cookware, type DishId, type ItemId } from "./items";
import { BLESSINGS } from "./fountain";
import { harderFor, hasThing, numberOf, useGift, usesLeft, works, type GiftRefusal } from "./gifts";
import { begun, hasBuff, mayEat, sitDown, spend } from "./stamina";
import type { TimingMods } from "./timing";
import { held, no, put, roomFor, take, type Done, type Purse, type Refusal, type Stack } from "./trade";

/**
 * Cooking and serving, as rules (the owner, 2026-10-03, and the bowls of 2026-10-04).
 *
 * - **A recipe is never told** ("เราจะไม่บอกสูตรอาหาร จะแค่ใบ้ไว้ในเกม"): things are
 *   picked by hand and put together ("ทำอาหาร ต้องเลือก วัตถุดิบเอง ไม่ใช่เลือกเป้น
 *   สูตร"), and if they are exactly a dish's, with its cookware in its cooks'
 *   hands, they become it. Whoever makes a dish first has found its recipe.
 * - **The wrong things make an odd dish** ("ถ้าเลือกผิดจะได้อาหารแปลกๆ มา กินได้ แต่ไม่ได้
 *   เพิ่ม stamina เยอะ และไม่มี buff"): cooked by somebody who holds cookware,
 *   things that are no recipe's (the wrong ones, the wrong amounts, the wrong
 *   cookware, too few cooks) come out as a pot of something that can be eaten
 *   and is good for little. Nothing says which of those it was: that is what
 *   makes cooking hard ("ทำเพื่อให้การทำอาหารยากขึ้น"), and what there is to ask one
 *   another about. Only somebody who has made the thing before is told when
 *   the cooks or the cookware are missing, and wastes nothing. Put together
 *   with bare hands, things that make nothing are lost, and leave a little
 *   compost.
 * - **But the way can be felt for** ("ถึงเราจะทำให้ทำอาหารยาก และต้องเดา วัตถุดิบ แต่ก็ยังต้องทำให้
 *   ผู้เล่นยังพอ คลำทางไปเจอวิธีทำที่ถูกต้องได้"): what comes of the wrong things has a
 *   taste, which says how near they were to making something (`tasteOf`):
 *   nothing like anything, some of it right, one thing off, the right things
 *   in the wrong amounts, everything right but the way it was cooked. It costs
 *   what was put in, each time. And a recipe somebody keeps missing by its
 *   last thing alone, the one a found recipe does not name, comes to say what
 *   that thing looks like and then to show its shadow, after so many tries
 *   (`CLUES`, lib/town/clues).
 * - **A dish takes its cookware, each piece in a cook's hand**, and as many
 *   cooks standing at the yard's places as its recipe says ("สูตรอาหารที่ต้องใช้
 *   มากกว่า 1 เครื่องมือ (ใช้หลายคนช่วยกันทำ)"). The things come from the bag of
 *   whoever begins it.
 * - **What is cooked comes as a big pot of it** ("อาหารถ้าทำเสร็จแล้ว จะได้มาเป็นหม้อ
 *   ใหญ่ๆ"), the yard's own: the cook brings none ("ช่วยเอาเงื่อนไข หม้อเปล่าในการทำอาหาร
 *   ออกไปเลย ดูจะยุ่งยากเกินไป"), only a free slot in the bag for it. The pot can
 *   be set down on an empty spot for others to ladle from, each with a bowl of
 *   their own ("คนทำสามารถวางไว้บนที่ว่างๆ ให้คนอื่นมาตักได้ (คนอื่นต้องมีถ้วย)").
 * - **A helping goes into a bowl, and the bowl goes with it** (the owner,
 *   2026-10-04: "ตอนตักใส่ถ้วย ถ้วยต้องหายไปด้วย ต้องกินหมดก่อนถ้วยค่อยกลับมา"): ladling takes
 *   a bowl out of the bag and puts the helping there instead; the bowl is back
 *   when the helping has been eaten (lib/town/stamina). Sold, or brought to the
 *   uncle, a helping goes bowl and all.
 * - **A pot whose last helping is ladled out is gone** ("หม้อสกปรก ตัดออกเลย พอตักครบ
 *   ออกหายออกจากพื้นไปเลย"): it was the yard's. There is no dirty pot and no washing
 *   up (there was, for a day).
 * - **Other things are made the same way** (lib/town/items' MAKES): a sauce, a
 *   paste, a basket. They come as themselves, into the bag, and need no pot
 *   to hold them. What is put together by hand needs no cookware at all.
 *
 * Pure, like the rest: each function is given what it needs and gives back
 * new things.
 */
export const COOKING = {
  /** The stamina a dish costs whoever begins it. */
  cost: 4,
  /** The stirs the game of timing asks for: so many, and one more for each kind of thing put in. Each miss is a helping lost, down to half of them. */
  stirs: 2,
  /**
   * The stirring is the kindest of the games of timing (the owner, 2026-10-04: "ทำอาหารทำให้ง่ายกว่าปกติหน่อย เพราะกว่าจะหา
   * วัตถุดิบมาปรุงอาหารได้ ก็ยากมากแล้ว ไม่อยากให้ fail มาก ถ้าพลาดก็ยังได้อะไรบ้าง"): the stretch to stir at is so many times
   * as wide as the hoe's, and with no stamina left it is a little narrower and the ladle a little quicker, where
   * the other games come down to a third of themselves (lib/town/stamina). With the hoe's stretch a hand as unsure
   * as the members' were on the game's first day (0.07 s either way) missed three stirs of a pot stirred seven
   * times, and was left with half of it, fed. With this it loses a helping of one such pot in three, and with no
   * stamina one or two of each. A miss never took everything: half the pot is always left, and one of anything
   * else that is made.
   *
   * Since 2026-10-04 the stirring is a game of its own, the ladle taken round the pot (lib/town/stirring), and these
   * are read by it: `wide` is how much kinder its good pace is than a plain one, and with no stamina `zone` is what
   * is left of the good pace's width and `speed` how much less patient it is with a slip. Of made-up hands, one
   * whose pace wanders as an unsure hand's does loses two helpings in five pots of seven stirs, a practised one
   * hardly any; with no stamina, three helpings in two pots and one in eight.
   */
  stirring: { wide: 2, spent: { zone: 0.75, speed: 1.15 } },
  /** How many kinds of thing can be put together at most. */
  kinds: 8,
  /** How near a pot that is set down one has to stand to ladle from it, in tiles; and from one set on a rattan table. */
  reach: 1.8,
  tok: 3.2,
  /** The helpings more a pot gives when whoever cooks has a ladle. */
  ladle: 1,
  /** How many pots of food one person may leave standing about at a time. */
  pots: 6,
  /** The odd dish: a helping for every so many things put in, never fewer than one or more than so many. */
  odd: { per: 2, most: 4 },
  /**
   * How many times a recipe was missed by its last thing alone before it said what that thing looks like. Read by
   * nothing since 2026-10-06 (the page's own `CLUES`, lib/town/clues, says it after the first miss); kept because
   * the database's catalog row has it.
   */
  clue: 3,
};

const COOKWARE = new Set<string>([...DISH_IDS.flatMap((id) => DISHES[id].recipe?.in ?? []), ...MAKE_IDS.flatMap((id) => MAKES[id]!.in)]);
/** Every piece of cookware there is, in the order the recipes first name them. */
export const COOKWARE_IDS = [...COOKWARE] as Cookware[];
/** What comes of things that make no dish, cooked all the same. */
export const ODD: DishId = "oddDish";
/** Whether a thing is cookware: something a dish, or anything else, is made in. */
export const isCookware = (id: ItemId | null | undefined): id is Cookware => !!id && COOKWARE.has(id);
/** The kinds of thing that are never put in: a tool, a scroll, a dish already. */
export const NOT_PUT_IN = ["tool", "scroll", "dish", "bug"];
/** Whether a thing can be put in. */
export const goesIn = (id: ItemId) => !NOT_PUT_IN.includes(ITEMS[id].kind);

/** Things, tidied: each kind once with how many of it, kinds in order. */
export function tidy(things: Array<[ItemId, number]>): Array<[ItemId, number]> {
  const all = new Map<ItemId, number>();
  for (const [id, n] of things) if (n > 0) all.set(id, (all.get(id) ?? 0) + n);
  return [...all].sort(([a], [b]) => (a < b ? -1 : 1));
}
/** Whether every piece of some cookware is in a different cook's hand. */
export function inHands(tools: Cookware[], crew: Array<ItemId | null>): boolean {
  const hands = crew.filter(isCookware) as Cookware[];
  return tools.every((tool) => { const i = hands.indexOf(tool); if (i < 0) return false; hands.splice(i, 1); return true; });
}
/** What some things are the makings of, whoever cooks them: a dish, or something else that is made; or nothing. */
export function madeOf(things: Array<[ItemId, number]>): ItemId | null {
  const mine = JSON.stringify(tidy(things));
  for (const id of DISH_IDS) { const r = DISHES[id].recipe; if (r && JSON.stringify(tidy(r.needs)) === mine) return id; }
  for (const id of MAKE_IDS) if (JSON.stringify(tidy(MAKES[id]!.needs)) === mine) return id;
  return null;
}
/** What making a thing takes: its cookware, and how many cooks. */
export const takes = (id: ItemId): { in: Cookware[]; cooks: number } =>
  (id in DISHES ? { in: DISHES[id as DishId].recipe!.in, cooks: DISHES[id as DishId].recipe!.cooks } : { in: MAKES[id]!.in, cooks: 1 });
/**
 * The dish some things make, cooked by some cooks with what they hold: the one
 * whose recipe is exactly those things, every piece of whose cookware is in a
 * cook's hand (a cook to a piece), with cooks enough. Null when they make
 * none.
 */
export function dishOf(things: Array<[ItemId, number]>, crew: Array<ItemId | null>): DishId | null {
  const made = madeOf(things);
  if (!made || !(made in DISHES)) return null;
  const t = takes(made);
  return crew.length >= t.cooks && inHands(t.in, crew) ? (made as DishId) : null;
}

/** How many helpings a dish cooked so comes to: what its recipe says, more from better cookware (in a cook's hand, or the stove in the bag of whoever begins it) and a ladle, less for every stir missed (never under half). */
export function helpings(dish: DishId, crew: Array<ItemId | null>, misses: number, bag: Purse["bag"] = []): number {
  const gear = [...crew, ...bag.map((s) => (s?.item === "stoveBig" ? s.item : null))];
  const full = DISHES[dish].recipe!.serves * Math.max(1, ...gear.map((id) => (id ? KITCHEN_GEAR[id] ?? 1 : 1))) + (bag.some((s) => s?.item === "ladle") ? COOKING.ladle : 0);
  return Math.max(Math.ceil(full / 2), Math.round(full) - Math.max(0, Math.floor(misses)));
}
/** How many stirs putting some things together asks for, and how much wider the mark is for what the cook carries. */
export const stirsFor = (things: Array<[ItemId, number]>) => COOKING.stirs + tidy(things).length;
export const easeOf = (bag: Purse["bag"]) => Math.max(1, ...bag.map((s) => (s ? COOK_EASE[s.item] ?? 1 : 1)));
/** What the pot's stirring is played with (lib/town/stirring): its own wide pace, wider for what the cook carries, and what having no stamina does to it. */
export const stirMods = (bag: Purse["bag"], spent: boolean, calm = 1): TimingMods => ({ tool: easeOf(bag), spent, wide: COOKING.stirring.wide, tired: COOKING.stirring.spent, ...(calm > 1 ? { buff: calm } : {}) });

/** How many helpings of the odd dish some things come to: one for every so many of them (never none, never many), less for every stir missed (never under half). */
export function oddHelpings(things: Array<[ItemId, number]>, misses: number): number {
  const full = Math.max(1, Math.min(COOKING.odd.most, Math.floor(things.reduce((t, [, n]) => t + n, 0) / COOKING.odd.per)));
  return Math.max(Math.ceil(full / 2), full - Math.max(0, Math.floor(misses)));
}
/** Whether somebody has made a thing before, and so knows all of its recipe. */
export const hasMade = (purse: Purse, id: ItemId) => (purse.made ?? []).includes(id);
/** Whether what came of the cooking is a recipe found: a dish that has one, or something else that is made. The odd dish is not. */
export const isFind = (made: ItemId | null): made is ItemId => !!made && (made in MAKES || !!DISHES[made as DishId]?.recipe);

/** Everything there is a recipe for: the dishes that are cooked, and what else is made. */
export const RECIPE_IDS: ItemId[] = [...DISH_IDS.filter((id) => DISHES[id].recipe), ...MAKE_IDS];
/** What goes into a thing. */
export const needsOf = (id: ItemId): Array<[ItemId, number]> => (id in DISHES ? DISHES[id as DishId].recipe?.needs ?? [] : MAKES[id]?.needs ?? []);
/**
 * What the enchanted apron's wearer is shown of what is in the pot (lib/town/gifts; the owner, 2026-10-07: a line's
 * first charm is to cut the line's most disheartening part out, and the kitchen's is a guess that costs everything
 * put in). `fits`: the things can still become something real: every one of them, in no greater amount, is in some
 * one recipe. `whole`: they are a recipe as they are. `wrong`: when they do not fit, the things that are in the way
 * (with that one out, or one fewer of it, the rest would fit); all of them, when no one thing is. Whose recipe, what
 * is still to go in and what it is cooked in are not told: only whether the pot is on a way that leads somewhere.
 */
export function potSays(things: Array<[ItemId, number]>): { fits: boolean; whole: boolean; wrong: ItemId[] } {
  const mine = tidy(things);
  if (!mine.length) return { fits: true, whole: false, wrong: [] };
  const within = (some: Array<[ItemId, number]>) => RECIPE_IDS.some((id) => { const needs = new Map(needsOf(id)); return some.every(([k, n]) => (needs.get(k) ?? 0) >= n); });
  if (within(mine)) return { fits: true, whole: madeOf(mine) !== null, wrong: [] };
  const less = (k: ItemId) => mine.flatMap(([j, n]): Array<[ItemId, number]> => (j !== k ? [[j, n]] : n > 1 ? [[j, n - 1]] : []));
  const wrong = mine.filter(([k]) => within(less(k))).map(([k]) => k);
  return { fits: false, whole: false, wrong: wrong.length ? wrong : mine.map(([k]) => k) };
}

/**
 * What the wrong things taste of: how near they came to making something.
 *
 * - `far`: nothing like anything; `some`: at least half of what something takes is there;
 * - `less`, `more`, `swap`: one thing short of something, one too many, or one that is not the one;
 * - `amounts`: the right things, in the wrong amounts;
 * - `way`: the right things in the right amounts, cooked in the wrong thing or by too few.
 */
export type Taste = "far" | "some" | "less" | "more" | "swap" | "amounts" | "way";
/**
 * How near some things are to making something, with the cooks at their places: measured against the recipe they
 * come nearest (the fewest kinds of thing wrong; then the fewest amounts; then the one whose cookware is in the
 * cooks' hands). Says the taste, the recipe it was measured against, and, when one thing is missing, which.
 */
export function tasteOf(things: Array<[ItemId, number]>, crew: Array<ItemId | null>): { taste: Taste; of: ItemId | null; lacks: ItemId | null } {
  const mine = new Map(tidy(things));
  let best: { id: ItemId; missing: ItemId[]; extra: number; off: number; rank: number } | null = null;
  for (const id of RECIPE_IDS) {
    const needs = needsOf(id), t = takes(id);
    const missing = needs.filter(([n]) => !mine.has(n)).map(([n]) => n), extra = [...mine.keys()].filter((k) => !needs.some(([n]) => n === k)).length;
    const off = needs.filter(([n, k]) => mine.has(n) && mine.get(n) !== k).length, ready = crew.length >= t.cooks && inHands(t.in, crew);
    const rank = (missing.length + extra) * 1000 + off * 10 + (ready ? 0 : 1);
    if (!best || rank < best.rank) best = { id, missing, extra, off, rank };
  }
  if (!best) return { taste: "far", of: null, lacks: null };
  const { id, missing, extra, off } = best, wrong = missing.length + extra, there = needsOf(id).length - missing.length;
  const taste: Taste = wrong === 0 ? (off ? "amounts" : "way")
    : missing.length === 1 && extra === 1 ? "swap" : wrong === 1 ? (extra ? "more" : "less")
      : there >= 1 && there * 2 >= needsOf(id).length ? "some" : "far";
  return { taste, of: taste === "far" ? null : id, lacks: taste === "less" || taste === "swap" ? missing[0] : null };
}


/**
 * Put some things together, with the cooks at their places (`crew`: what each
 * holds, whoever begins it first). What comes of it:
 *
 * - **a dish**: a pot of it, so many helpings, in a free slot of the bag
 *   (refused, with nothing lost, when the bag has none once the things are out
 *   of it);
 * - **something else that is made**: so many of it, into the bag (refused,
 *   with nothing lost, when there is no room);
 * - **the odd dish**: when the things are no recipe's, or are one's that the
 *   cooks and their cookware are not all there for, and whoever begins it
 *   holds cookware. A pot of it, like any dish. Somebody who has made the
 *   thing before is refused instead, with nothing lost, and so told that it is
 *   the cooks or the cookware;
 * - **nothing**: the same things put together with bare hands are lost, and a
 *   little compost is left if there is room.
 *
 * What is no recipe's comes with its `taste` (how near it was to something),
 * and a miss by a recipe's last thing alone is counted against that recipe
 * (`tries` in the purse), until the recipe says what the thing looks like.
 */
export function cook(purse: Purse, things: Array<[ItemId, number]>, crew: Array<ItemId | null>, misses: number, now: number):
  Done<{ purse: Purse; made: ItemId | null; n: number; taste?: Taste }> {
  const all = tidy(things);
  if (!all.length || all.length > COOKING.kinds) return no("amount");
  for (const [id, n] of all) if (!Number.isInteger(n) || !goesIn(id) || held(purse.bag, id) < n) return no("none");
  let made = madeOf(all);
  if (made) {
    const t = takes(made), short = crew.length < t.cooks;
    if (short || !inHands(t.in, crew)) {
      // somebody who has made it before is told what is missing, and wastes nothing; anybody else finds out by what comes of it
      if (hasMade(purse, made)) return no(short || crew.length > 1 || t.in.length > 1 ? "crew" : "tool");
      made = null;
    }
  }
  // what is cooked comes as a pot of it: a dish, or the odd dish that things which make nothing come to in the cookware of whoever begins it
  const dish = made ? (made in DISHES ? (made as DishId) : null) : isCookware(crew[0]) ? ODD : null;
  let bag = purse.bag;
  for (const [id, n] of all) bag = take(bag, id, n);
  // (the pot it comes in is the yard's: it takes a slot of the bag, and nothing else of the cook's)
  const pot = dish ? bag.findIndex((s) => !s) : -1;
  if (dish && pot < 0) return no("full");
  let spent = spend(purse, COOKING.cost, now);
  // what is no recipe's has a taste; and a miss by a recipe's last thing alone is one more try at that recipe
  const near = made ? null : tasteOf(all, crew);
  if (near?.of && near.lacks && (near.taste === "swap" || near.taste === "less") && near.lacks === needsOf(near.of).at(-1)?.[0]) {
    spent = { ...spent, tries: { ...spent.tries, [near.of]: (spent.tries?.[near.of] ?? 0) + 1 } };
  }
  if (dish) {
    // (under the fountain's big pot, a helping more: lib/town/fountain)
    const left = (made ? helpings(dish, crew, misses, purse.bag) : oddHelpings(all, misses)) + (hasBuff(purse, now, "feast") ? BLESSINGS.feast.by : 0);
    return { ok: true, made: dish, n: left, ...(near ? { taste: near.taste } : {}), purse: { ...spent, bag: bag.map((s, i) => (i === pot ? { item: "potFull" as ItemId, n: 1, of: { dish, left } } : s)) } };
  }
  // put together with bare hands, things that make nothing are lost
  if (!made) return { ok: true, made: null, n: 0, taste: near!.taste, purse: { ...spent, bag: roomFor(bag, "compost") > 0 ? put(bag, "compost", 1) : bag } };
  // what is made otherwise: every miss is one fewer, never under one
  const n = Math.max(1, MAKES[made]!.gives - Math.max(0, Math.floor(misses)));
  if (roomFor(bag, made) < n) return no("full");
  return { ok: true, made, n, purse: { ...spent, bag: put(bag, made, n) } };
}

/** A pot set down in the world: whose, what is in it, how many helpings are left, where it stands, and whether it stands on a rattan table. */
export interface Pot { id: string; by: string; dish: DishId; left: number; at: [number, number]; tok?: boolean }
/** How near one has to stand to a pot to ladle from it. */
export const reachOf = (pot: Pot) => (pot.tok ? COOKING.tok : COOKING.reach);

/** Set the pot of food in a slot of the bag down on a tile. (On a rattan table, when one is carried: more can gather round it.) */
export function setDown(purse: Purse, slot: number, me: string, at: [number, number], id: string): Done<{ purse: Purse; pot: Pot }> {
  const s = purse.bag[slot];
  if (!s || s.item !== "potFull" || !s.of) return no("none");
  const tok = held(purse.bag, "tok") > 0;
  return { ok: true, pot: { id, by: me, dish: s.of.dish, left: s.of.left, at, ...(tok ? { tok } : {}) }, purse: { ...purse, bag: purse.bag.map((b, i) => (i === slot ? null : b)) } };
}
/**
 * Ladle a helping out of a pot that is set down, into a bowl of one's own: the bowl leaves the bag, and the helping
 * is there instead. Gives the pot as it is afterwards: null when that was its last helping, and the pot is gone.
 */
export function ladle(purse: Purse, pot: Pot): Done<{ purse: Purse; pot: Pot | null }> {
  if (pot.left < 1) return no("none");
  if (!held(purse.bag, BOWL)) return no("tool");
  const bag = take(purse.bag, BOWL, 1);
  if (roomFor(bag, pot.dish) < 1) return no("full");
  return { ok: true, pot: pot.left > 1 ? { ...pot, left: pot.left - 1 } : null, purse: { ...purse, bag: put(bag, pot.dish, 1) } };
}
/** Whether somebody may take a pot up: only whoever set it down. */
export const mayTake = (pot: Pot, me: string) => pot.by === me;
/** Take one's pot of food up again, into a free slot of the bag. */
export function takeUp(purse: Purse, pot: Pot, me: string): Done<{ purse: Purse }> {
  if (!mayTake(pot, me) || pot.left < 1) return no("none");
  const slot = purse.bag.findIndex((s) => !s);
  if (slot < 0) return no("full");
  const stack: Stack = { item: "potFull", n: 1, of: { dish: pot.dish, left: pot.left } };
  return { ok: true, purse: { ...purse, bag: purse.bag.map((b, i) => (i === slot ? stack : b)) } };
}
/** Ladle a helping out of the pot of food in a slot of one's own bag, into a bowl. Its last helping out, the pot is gone. */
export function serve(purse: Purse, slot: number): Done<{ purse: Purse; dish: DishId }> {
  const s = purse.bag[slot];
  if (!s || s.item !== "potFull" || !s.of || s.of.left < 1) return no("none");
  if (!held(purse.bag, BOWL)) return no("tool");
  const dish = s.of.dish, left = s.of.left - 1;
  const bag = take(purse.bag.map((b, i) => (i !== slot ? b : left ? { ...s, of: { dish, left } } : null)), BOWL, 1);
  if (roomFor(bag, dish) < 1) return no("full");
  return { ok: true, dish, purse: { ...purse, bag: put(bag, dish, 1) } };
}

/* ── The gifts of the kitchen's ranks (lib/town/gifts; the owner, 2026-10-07: each rank cuts a whole rule of its line out) ── */

/**
 * Why a gift of the kitchen's was not used, beyond the trade's reasons and the gifts' own: the spoon has nothing to
 * say of a pot that no recipe has (`astray`), or of one whose every recipe its owner reads whole already (`known`);
 * the hearth sprite cooks only what its member has made before (`unmade`).
 */
export type KitchenRefusal = "astray" | "known" | "unmade";
/** What a deed with a gift of the kitchen's comes to. */
export type Gifted<T> = ({ ok: true } & T) | { ok: false; why: Refusal | GiftRefusal | KitchenRefusal };
/** A no, for a reason of any of the three sorts. */
const nay = <W extends Refusal | GiftRefusal | KitchenRefusal>(why: W): { ok: false; why: W } => ({ ok: false, why });

/**
 * The dimension basket (the kitchen's second rank): a food pocket of its owner's own. It holds so many helpings
 * (the gift's number), of any dishes together, in no slot of the bag: a helping is put into it from the bag, taken
 * back out, or eaten straight from it as from the bag. Food only: whatever is a dish (a helping in its bowl, the
 * uncle's rice parcel, the odd dish), and nothing else. A helping in it has its bowl with it, as one in the bag has:
 * the bowl is back when it has been eaten.
 *
 * What a purse keeps in it, made sound: dishes only, each once, a whole number of helpings of each, in the order
 * they were first put in.
 */
export function basketOf(purse: Pick<Purse, "basket">): Array<[DishId, number]> {
  const out: Array<[DishId, number]> = [];
  for (const e of Array.isArray(purse.basket) ? (purse.basket as unknown[]) : []) {
    if (!Array.isArray(e) || e.length !== 2) continue;
    const [id, n] = e as [unknown, unknown];
    if (typeof id === "string" && Object.prototype.hasOwnProperty.call(DISHES, id) && typeof n === "number" && Number.isInteger(n) && n > 0 && !out.some(([d]) => d === id)) out.push([id as DishId, n]);
  }
  return out;
}
/** How many helpings are in the basket, and how many more it has room for (none, for whoever has no basket). */
export const inBasket = (purse: Pick<Purse, "basket">): number => basketOf(purse).reduce((t, [, n]) => t + n, 0);
export const basketRoom = (purse: Pick<Purse, "basket" | "gifts">): number => (hasThing(purse, "thingBasket") ? Math.max(0, numberOf("thingBasket") - inBasket(purse)) : 0);

/** Put so many helpings of the dish in a slot of the bag into the basket. */
export function basketPut(purse: Purse, slot: number, n: number): Gifted<{ purse: Purse; dish: DishId; n: number }> {
  const s = purse.bag[slot];
  if (!hasThing(purse, "thingBasket") || !s || !isDish(s.item)) return no("none");
  if (!Number.isInteger(n) || n < 1 || n > s.n) return no("amount");
  if (n > basketRoom(purse)) return no("full");
  const dish = s.item, mine = basketOf(purse);
  return {
    ok: true, dish, n,
    purse: {
      ...purse,
      bag: purse.bag.map((b, i) => (i !== slot ? b : s.n === n ? null : { item: s.item, n: s.n - n })),
      basket: mine.some(([d]) => d === dish) ? mine.map(([d, k]): [DishId, number] => (d === dish ? [d, k + n] : [d, k])) : [...mine, [dish, n]],
    },
  };
}
/** A basket with so many helpings of a dish out of it (it must hold as many). */
const less = (mine: Array<[DishId, number]>, dish: DishId, n: number) => mine.flatMap(([d, k]): Array<[DishId, number]> => (d !== dish ? [[d, k]] : k > n ? [[d, k - n]] : []));
/** Take so many helpings of a dish back out of the basket, into the bag. */
export function basketTake(purse: Purse, dish: string, n: number): Gifted<{ purse: Purse; dish: DishId; n: number }> {
  const mine = basketOf(purse), had = mine.find(([d]) => d === dish);
  if (!hasThing(purse, "thingBasket") || !had) return no("none");
  if (!Number.isInteger(n) || n < 1 || n > had[1]) return no("amount");
  if (roomFor(purse.bag, had[0]) < n) return no("full");
  return { ok: true, dish: had[0], n, purse: { ...purse, bag: put(purse.bag, had[0], n), basket: less(mine, had[0], n) } };
}
/** Sit down to a helping of a dish out of the basket: as to one out of the bag (lib/town/stamina's sitDown), but that it leaves the basket. */
export function basketEat(purse: Purse, dish: string, seated: boolean, now: number): Gifted<{ purse: Purse; dish: DishId }> {
  const mine = basketOf(purse), had = mine.find(([d]) => d === dish);
  if (!hasThing(purse, "thingBasket") || !had) return no("none");
  if (!seated) return no("stand");
  if (!mayEat(purse, now)) return no("meal");
  return { ok: true, dish: had[0], purse: { ...purse, basket: less(mine, had[0], 1), ...begun(purse, had[0], now) } };
}

/**
 * The whispering spoon (the kitchen's third rank): asked while cooking, it tells its owner the secret thing of the
 * recipe that what is in the pot is on the way to: the one thing a found recipe never names (its last). To its
 * owner only, and so many times a day (lib/town/gifts' USES).
 *
 * **Which recipe, where the pot can still be more than one.** The pot is on the way to every recipe that has each
 * thing in it, in no smaller an amount (what the apron's `potSays` calls fitting). Of those, the ones its owner
 * reads whole already (made, or told by the spoon before) are left out: there is nothing to tell of them. Of the
 * rest it answers for **the one nearest done**: the fewest things still to go in; of two as near, the first in the
 * book's own order. It says how many ways the pot could still go (`ways`), so a member knows it chose.
 *
 * It tells nothing, and is not counted, of a pot with nothing in it, of one no recipe has (`astray`), and of one
 * whose every recipe is read whole already (`known`).
 */
export function spoonSays(things: Array<[ItemId, number]>, known: readonly string[]): { ok: true; of: ItemId; secret: ItemId; ways: number } | { ok: false; why: "amount" | KitchenRefusal } {
  const mine = tidy(things);
  if (!mine.length) return { ok: false, why: "amount" };
  const total = mine.reduce((t, [, n]) => t + n, 0);
  const fits = RECIPE_IDS.map((id, i) => ({ id, i, needs: needsOf(id) })).filter(({ needs }) => { const takes = new Map(needs); return mine.every(([k, n]) => (takes.get(k) ?? 0) >= n); });
  if (!fits.length) return { ok: false, why: "astray" };
  const open = fits.filter(({ id }) => !known.includes(id)).map((f) => ({ ...f, short: f.needs.reduce((t, [, n]) => t + n, 0) - total })).sort((a, b) => a.short - b.short || a.i - b.i);
  if (!open.length) return { ok: false, why: "known" };
  const best = open[0];
  return { ok: true, of: best.id, secret: best.needs[best.needs.length - 1][0], ways: open.length };
}
/** The recipes whose secret thing the spoon has told somebody, made sound: recipes there are, each once. */
export function whispersOf(purse: Pick<Purse, "whispers">): ItemId[] {
  const out: ItemId[] = [];
  for (const id of Array.isArray(purse.whispers) ? (purse.whispers as unknown[]) : []) if (typeof id === "string" && RECIPE_IDS.includes(id as ItemId) && !out.includes(id as ItemId)) out.push(id as ItemId);
  return out;
}
/** Whether somebody reads all of a recipe: they have made the thing, or the spoon has told them its secret thing. */
export const readsAll = (purse: Purse, id: ItemId) => hasMade(purse, id) || whispersOf(purse).includes(id);
/**
 * Ask the spoon about what is in the pot (things of one's own bag, as they would be cooked). It answers as `spoonSays`
 * does, is counted once, and the recipe is read whole from then on (`whispers` in the purse).
 */
export function spoon(purse: Purse, things: Array<[ItemId, number]>, now: number): Gifted<{ purse: Purse; of: ItemId; secret: ItemId; ways: number; left: number }> {
  if (!hasThing(purse, "thingSpoon")) return no("none");
  const all = tidy(things);
  if (!all.length || all.length > COOKING.kinds) return no("amount");
  for (const [id, n] of all) if (!Number.isInteger(n) || !Object.prototype.hasOwnProperty.call(ITEMS, id) || !goesIn(id) || held(purse.bag, id) < n) return no("none");
  if (usesLeft(purse, "thingSpoon", now) < 1) return nay("spent");
  const told = whispersOf(purse), says = spoonSays(all, [...(purse.made ?? []), ...told]);
  if (!says.ok) return says;
  const used = useGift(purse, "thingSpoon", now);
  if (!used.ok) return nay(used.why);
  return { ok: true, of: says.of, secret: says.secret, ways: says.ways, left: used.left, purse: { ...used.purse, whispers: [...told, says.of] } };
}

/** How a pot is cooked beyond the hand's own account of its game: by the hearth sprite, with no game at all; and with the phoenix flame set to take back what comes to nothing. */
export interface CookHow { sprite?: boolean; flame?: boolean }
/**
 * Put some things together as `cook` does, with what the kitchen's later gifts change of it (`how`).
 *
 * **The hearth sprite** (the fourth rank, a familiar): while it follows its member, a recipe they have made before
 * is cooked at once with no game: as a pot stirred with no miss, and so many helpings more in it (the gift's number;
 * something that is made otherwise comes as its full number and no more). So many pots to a meal's hours
 * (lib/town/gifts' USES). Everything else is as ever: the things leave the bag, the stamina is paid, the cooks and
 * the cookware the recipe takes have to be there (refused with nothing lost, and not counted, when they are not),
 * and the pot is a pot like any other, which the line counts as it counts one cooked by hand. What its member has
 * not made is not the sprite's to cook (`unmade`): a guess is still a guess, and a guess can still be wrong.
 *
 * **The phoenix flame in a bottle** (the sixth rank, a thing). It is a stove anywhere, which is the page's to offer:
 * nothing here ever asked where a cook stands. And where its owner set it to (`how.flame`), things that are no
 * recipe's come to nothing at all instead of an odd dish (or, put together by hand, instead of being lost): **every
 * one of them is back in the bag** (`back`), so many times a day (USES counts the giving back). The guess is still
 * a guess: its stamina is paid, its taste is told, and a miss by a recipe's last thing alone is counted as ever.
 * With none of the day's left, what came of it is as it always was.
 */
export function cookWith(purse: Purse, things: Array<[ItemId, number]>, crew: Array<ItemId | null>, misses: number, now: number, how: CookHow = {}):
  Gifted<{ purse: Purse; made: ItemId | null; n: number; taste?: Taste; sprite?: boolean; back?: boolean }> {
  if (how.sprite !== true) {
    const did = cook(purse, things, crew, misses, now);
    if (!did.ok || how.flame !== true || (did.made !== null && did.made !== ODD) || !hasThing(purse, "thingFlame")) return did;
    const kept = useGift(purse, "thingFlame", now);
    if (!kept.ok) return did;
    // the bag as it was before anything left it; what the go cost and what it taught are the go's own
    return { ok: true, made: null, n: 0, ...(did.taste ? { taste: did.taste } : {}), back: true, purse: { ...kept.purse, stamina: did.purse.stamina, ...(did.purse.tries ? { tries: did.purse.tries } : {}) } };
  }
  if (!works(purse, "famSprite")) return nay("none");
  const recipe = madeOf(things);
  if (!recipe || !hasMade(purse, recipe)) return nay("unmade");
  const used = useGift(purse, "famSprite", now);
  if (!used.ok) return nay(used.why);
  const did = cook(used.purse, things, crew, 0, now);
  if (!did.ok) return did;
  // one more to the pot: the pot that was not in the bag before (the yard's pot takes a slot that had no pot in it)
  const more = numberOf("famSprite"), at = did.purse.bag.findIndex((s, i) => s?.item === "potFull" && s.of?.dish === did.made && purse.bag[i]?.item !== "potFull");
  if (at < 0) return { ...did, sprite: true };
  return { ...did, sprite: true, n: did.n + more, purse: { ...did.purse, bag: did.purse.bag.map((s, i) => (i === at && s?.of ? { ...s, of: { dish: s.of.dish, left: s.of.left + more } } : s)) } };
}

/**
 * The stardust spice (the kitchen's fifth rank): sprinkled on a bowl about to be eaten, out of the bag or out of the
 * basket. The meal is begun as ever, and when it is eaten up its buff is at the spice's level at once (the gift's
 * number: the last), whatever it was: lib/town/stamina's `spiceOf` and `raised`. Its hours are as they would have
 * been: a buff one has runs on as it ran, one that is new lasts as any new one. So many times a day
 * (lib/town/gifts' USES), counted as it is sprinkled.
 *
 * It can still come to nothing: getting up before the bowl is eaten forfeits its buff as ever, and the sprinkling
 * with it. A dish that leaves no buff has nothing for it to raise: it is not sprinkled, and not counted.
 */
export function spiceEat(purse: Purse, from: { slot: number } | { dish: string }, seated: boolean, now: number): Gifted<{ purse: Purse; dish: DishId }> {
  if (!hasThing(purse, "thingSpice")) return nay("none");
  const sat = "dish" in from ? basketEat(purse, from.dish, seated, now) : sitDown(purse, from.slot, seated, now);
  if (!sat.ok) return sat;
  if (!DISHES[sat.dish].buff) return nay("none");
  const used = useGift(sat.purse, "thingSpice", now);
  if (!used.ok) return nay(used.why);
  return { ok: true, dish: sat.dish, purse: { ...used.purse, spiced: { from: now, level: numberOf("thingSpice") } } };
}

/**
 * How many times harder the cooking of something is for somebody with so many points on the kitchen's line (the
 * owner, 2026-10-07: the gifts are near to too strong, so the game grows with whoever has them: lib/town/gifts'
 * harderFor). From the fourth rank, whatever has a recipe and is of the second tier or better, a dish or something
 * else that is made, is 8% harder a rank; the simplest things (the early game's), the odd dish and what comes to
 * nothing are as they are for everybody.
 *
 * What harder is, in each cooking game, where its outcome is judged: **stirring** (lib/town/stirring's startStir) is
 * a good pace so many times narrower and a slip that costs a helping so many times sooner; **roasting**
 * (lib/town/roasting's startRoast) is a fire that flares so many times oftener and a face done so many times nearer
 * to burnt. The games are played in the browser, which tells whoever keeps the game how many were missed, as it
 * always has: so it is the page that begins the game harder, and nothing of it is shown as a rule.
 */
export const harderCook = (made: ItemId | null, points: number): number => (isFind(made) && ITEMS[made].tier >= 2 ? harderFor("kitchen", points) : 1);
