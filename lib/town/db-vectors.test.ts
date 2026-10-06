import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COOKWARE_IDS, RECIPE_IDS, cook, goesIn, helpings, inHands, ladle, madeOf, mayTake, needsOf, oddHelpings, serve, setDown, takeUp, takes, tasteOf, tidy,
  type Pot,
} from "./cooking";
import { catalogOf } from "./catalog";
import { DEAL, agree, hasAll, lay, pull, push, sideOf, swap, tidyGive, type Deal, type Give } from "./deal";
import {
  BEDS, FARMING, HOES, WATER, chore, choreFor, cure, deedFor, feed, grown, hoe, ownerOf, pestAt, pick, plotKey, roll, see, sow, tend, toolOf, uproot, water, yieldOf,
  type Bed, type Plant, type Plot,
} from "./farm";
import { ALL_SIGNS, SIGNS, castLine, hookBait, landCatch, loseBait, oddsOf, signsOf, strikeWindowOf } from "./fishing";
import { CARRIES } from "./gear";
import { HINT_IDS, buyHint, nextHint } from "./hints";
import { BAITS, BUFF_LEVELS, CROPS, CROP_IDS, DISH_IDS, FISH_IDS, FLOTSAM_IDS, ITEMS, ITEM_IDS, SCROLLS, byOf, growth, type BaitId, type BuffId, type CatchId, type DishId, type ItemId, type MealBuffId, type Sign } from "./items";
import { UNLOCKS, give, mayAsk, orderOf, shelfOf, sourcesAt, wantsFor, type Village } from "./orders";
import { INSIDE, open } from "./scrolls";
import { bowlsBack, bowlsToday, buffBy, buffOf, chew, costOf, dayOf, eatenToday, getUp, levelOf, mealBuffs, mealOf, raised, readScroll, settle, sitDown, spend, staminaOf } from "./stamina";
import {
  GOODS, HOUR, buy, collect, held, hold, leave, newPurse, put, roomFor, roomy, roundOf, take, takeBack, takeOff, wear, weekOf,
  type Purse, type Stack, type Stall,
} from "./trade";
import { DRY, SLOT_MS, rainsOf, slotOf, type Rain } from "./weather";
import { BEDS_IN_FARM, FARM, bedCorner, bedOf } from "./world";

/**
 * The cases the database's rules are held to (lib/town/catalog says why there
 * are two copies of a rule). For each rule that a migration writes again in
 * SQL, a few hundred made-up purses, stalls, moments and arguments, each with
 * what the code answers. A migration's dry run asks the SQL the same and
 * wants the same answer, to the last field (.claude/skills/fc-cash-town/
 * scripts/db/vNNN.test.mjs reads the file this writes).
 *
 * Made by chance, from a seed: the same cases every time, and no hand picks
 * which corners are looked into.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors.test.ts
 */

/** A case: the SQL function, its arguments in order, and the code's answer. */
export interface Vector { fn: string; args: unknown[]; want: unknown }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

/**
 * What meals have left a purse, as one of today may have it (v146): now and then nothing more than it had (a purse
 * from before buffs had levels), else some of these buffs, each once, at a level, some run out already.
 */
function leveled(c: ReturnType<typeof chance>, now: number, ids: readonly MealBuffId[]): Pick<Purse, "buffs"> | Record<string, never> {
  if (c.maybe(0.45)) return {};
  const pool = [...ids], buffs: NonNullable<Purse["buffs"]> = [];
  for (let n = c.int(0, Math.min(3, pool.length)); n > 0; n--) {
    buffs.push({ id: pool.splice(c.int(0, pool.length - 1), 1)[0], level: c.int(1, BUFF_LEVELS), until: now + c.int(-1, 2) * 3_600_000 + c.int(1, 999) });
  }
  return { buffs };
}

/** Moments to try: either side of the uncle's two rounds, of dawn, of midnight, of a Monday. */
const MOMENTS = [
  "2026-10-04T06:59:59", "2026-10-04T07:00:00", "2026-10-04T12:34:56", "2026-10-04T18:59:59", "2026-10-04T19:00:00", "2026-10-04T23:59:59",
  "2026-10-05T00:00:00", "2026-10-05T04:59:59", "2026-10-05T05:00:00", "2026-10-11T23:59:59", "2026-10-12T00:00:01", "2027-01-01T03:00:00",
].map((s) => Date.parse(`${s}+07:00`));
const GOOD_IDS = Object.keys(GOODS) as ItemId[], CARRIERS = Object.keys(CARRIES) as ItemId[];

/** A bag as it might be: some slots empty, the rest with so many of something, a few of them holding something. */
function bagOf(c: ReturnType<typeof chance>, slots: number, favour: ItemId[] = []): Purse["bag"] {
  return Array.from({ length: slots }, (): Stack | null => {
    if (c.maybe(0.35)) return null;
    const item = favour.length && c.maybe(0.5) ? c.of(favour) : c.of(ITEM_IDS), n = c.int(1, ITEMS[item].stack);
    if (item === "potFull") return { item, n: 1, of: { dish: c.of(["tomYum", "friedMinnow"] as DishId[]), left: c.int(1, 4) } };
    if (item === "can" || item === "bucket") return c.maybe(0.5) ? { item, n: 1, water: c.int(0, 8) } : { item, n: 1 };
    return { item, n };
  });
}
/** A purse as it might be at a moment. */
function purseOf(c: ReturnType<typeof chance>, now: number, favour: ItemId[] = []): Purse {
  const round = roundOf(now), p = newPurse({ profile: c.int(0, 300), gallery: c.int(0, 40) });
  const bag = bagOf(c, c.of([5, 5, 10, 15, 20]), favour);
  const some = (list: ItemId[], most: number) => Array.from({ length: c.int(0, most) }, () => c.of(list)).filter((id, i, all) => all.indexOf(id) === i);
  return {
    ...p,
    coins: c.of([0, 3, 40, 250, 5000]),
    bag,
    bought: { round: c.maybe(0.7) ? round : round - c.int(1, 3), n: Object.fromEntries(some(GOOD_IDS, 4).map((id) => [id, c.int(1, 12)])) },
    left: Array.from({ length: c.int(0, 4) }, () => { const item = c.of(ITEM_IDS); return { item, n: c.int(1, 9), pays: ITEMS[item].pays || c.int(1, 9), round: round - c.int(-1, 2) }; }),
    changed: { week: weekOf(now), n: c.int(0, 20) },
    recipes: some(ITEM_IDS.filter((id) => ITEMS[id].kind === "dish"), 5) as DishId[],
    ...(c.maybe(0.5) ? { hand: c.maybe(0.2) ? null : c.of(ITEM_IDS) } : {}),
    ...(c.maybe(0.4) ? { wears: some(CARRIERS, 3) } : {}),
    ...(c.maybe(0.4) ? { hints: some(ITEM_IDS, 6) } : {}),
  };
}

/** Every case for the rules of v106: the bag, the hand, what is worn, the stall, the uncle's order, his hints. */
export function vectorsV106(): Vector[] {
  const c = chance(20261004), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });

  // the hash everything by chance is drawn with, and the clock's three counts
  for (let i = 0; i < 300; i++) {
    const word = c.of(["want", "many", "weeds", "133,5", "x", ""]), nums = Array.from({ length: c.int(0, 3) }, () => c.of([0, 1, -7, c.int(0, 99999), 1759550400000 + c.int(0, 1e9)]));
    add("roll", [word, nums], roll(word, ...nums));
  }
  for (const now of [...MOMENTS, ...Array.from({ length: 60 }, () => MOMENTS[0] + c.int(0, 400) * 3_600_000 + c.int(0, 3_599_999))]) {
    add("round_of", [now], roundOf(now));
    add("week_of", [now], weekOf(now));
    add("day_of", [now], dayOf(now));
  }

  // the bag
  for (let i = 0; i < 400; i++) {
    const bag = bagOf(c, c.of([5, 10, 20])), id = c.maybe(0.6) ? (bag.find(Boolean)?.item ?? c.of(ITEM_IDS)) : c.of(ITEM_IDS);
    add("held", [bag, id], held(bag, id));
    add("room", [bag, id], roomFor(bag, id));
    const room = roomFor(bag, id), has = held(bag, id);
    if (room > 0) { const n = c.int(1, room); add("put", [bag, id, n], put(bag, id, n)); }
    if (has > 0) { const n = c.int(1, has); add("take", [bag, id, n], take(bag, id, n)); }
  }

  // the hand, and what is worn
  for (let i = 0; i < 250; i++) {
    const now = c.of(MOMENTS), p = purseOf(c, now, CARRIERS), slot = c.maybe(0.1) ? c.of([-1, p.bag.length, null]) : c.int(0, p.bag.length - 1);
    add("hold", [p, slot], hold(p, slot as number));
    add("wear", [p, slot], wear(p, slot as number));
    const off = c.maybe(0.75) ? c.of(CARRIERS) : c.of(ITEM_IDS);
    add("take_off", [p, off], takeOff(p, off));
  }

  // the stall
  for (let i = 0; i < 500; i++) {
    const now = c.of(MOMENTS), round = roundOf(now), p = purseOf(c, now);
    const stall: Stall = { round: c.maybe(0.7) ? round : round - 1, sold: Object.fromEntries(Array.from({ length: c.int(0, 5) }, () => [c.of(GOOD_IDS), c.int(0, 130)])) };
    const id = c.maybe(0.85) ? c.of(GOOD_IDS) : c.of(ITEM_IDS), n = c.maybe(0.08) ? c.of([0, -2, null]) : c.int(1, 12);
    const shelf = c.maybe(0.25) ? null : shelfOf(c.int(0, UNLOCKS.length));
    add("buy", [p, stall, id, n, now, shelf], buy(p, stall, id, n as number, now, shelf ?? undefined));
  }
  // (each of the stall's limits as the only one in the way: the village's stock nearly gone, the round's limit each
  // nearly reached, a bag nearly full, coins for a few only; with everything else plentiful)
  for (let i = 0; i < 240; i++) {
    const now = c.of(MOMENTS), round = roundOf(now), id = c.of(GOOD_IDS), g = GOODS[id]!, which = i % 4, n = c.int(1, 6);
    const rich: Purse = { ...newPurse(), coins: 1_000_000, bag: Array<null>(20).fill(null), bought: { round, n: {} } };
    const stall: Stall = { round, sold: which === 0 ? { [id]: Math.max(0, g.stock - c.int(0, 3)) } : {} };
    const p: Purse = which === 1 ? { ...rich, bought: { round, n: { [id]: Math.max(0, g.each - c.int(0, 3)) } } }
      : which === 2 ? { ...rich, bag: put(Array<null>(1).fill(null), id, Math.max(0, ITEMS[id].stack - c.int(0, 3))) }
        : which === 3 ? { ...rich, coins: g.price * c.int(0, 3) + c.int(0, g.price - 1) } : rich;
    add("buy", [p, stall, id, n, now, null], buy(p, stall, id, n, now));
  }
  for (let i = 0; i < 400; i++) {
    const now = c.of(MOMENTS), p = purseOf(c, now), slot = c.maybe(0.1) ? c.of([-1, p.bag.length, null]) : c.int(0, p.bag.length - 1);
    const n = c.maybe(0.08) ? c.of([0, -1, null]) : c.int(1, 6);
    add("leave", [p, slot, n, now], leave(p, slot as number, n as number, now));
    const at = c.int(-1, 4);
    add("take_back", [p, at, now], takeBack(p, at, now));
    add("collect", [p, now], collect(p, now));
  }
  // (and what his relatives do not take, by name: so that the refusal is tried whatever the dice gave above)
  for (const id of ITEM_IDS.filter((x) => !ITEMS[x].pays && x !== "potFull").slice(0, 6)) {
    const now = MOMENTS[0], p: Purse = { ...newPurse(), bag: put(Array<null>(5).fill(null), id, 1) };
    add("leave", [p, 0, 1, now], leave(p, 0, 1, now));
  }

  // the uncle's shelf and his order
  for (const n of [-2, 0, 1, 6, 7, 40, UNLOCKS.length, UNLOCKS.length + 5]) add("shelf_of", [n], shelfOf(n));
  for (let stage = 0; stage <= UNLOCKS.length; stage += stage < 8 ? 1 : 7) {
    for (const kind of ["fish", "crop", "made"] as const) add("asks", [kind, stage], mayAsk(stage)[kind]);
    for (let day = 20360; day < 20372; day++) add("wants", [day, stage], wantsFor(day, stage));
  }
  for (let i = 0; i < 500; i++) {
    const now = c.of(MOMENTS), today = dayOf(now), unlocked = c.maybe(0.1) ? UNLOCKS.length : c.int(0, UNLOCKS.length);
    const opened = unlocked > 0 && c.maybe(0.3) ? today : c.of([-1, today - 1]);
    const wants = wantsFor(today, opened === today ? unlocked - 1 : unlocked);
    const village: Village = {
      unlocked, opened, day: c.maybe(0.7) ? today : c.of([-1, today - 1]),
      got: Object.fromEntries([...wants.filter(() => c.maybe(0.6)).map(([item, n]) => [item, c.maybe(0.3) ? n : c.int(0, n + 2)]), ...(c.maybe(0.2) ? [[c.of(ITEM_IDS), c.int(1, 5)]] : [])]),
    };
    add("order_of", [village, now], orderOf(village, now));
    const p = purseOf(c, now, wants.map(([item]) => item)), slot = c.maybe(0.08) ? c.of([-1, p.bag.length, null]) : c.int(0, p.bag.length - 1);
    const n = c.maybe(0.08) ? c.of([0, -1, null]) : c.int(1, 10);
    add("give", [p, village, slot, n, now], give(p, village, slot as number, n as number, now));
  }

  // his hints, as v106 wrote the two rules: three words, and the first he has. They are drawn by chance since v135,
  // which gave each rule a fourth word (vectorsV135, below); these are what the code answers with no chance in it
  // (0: the first), and so what v106's own rules answer still. A dry run that replays v135 asks these with a
  // fourth word of 0 (`town.next_hint($1::jsonb, $2::jsonb, $3::int, 0)`): the three-word rules are gone then.
  for (let i = 0; i < 300; i++) {
    const now = c.of(MOMENTS), p = purseOf(c, now), stage = c.int(0, UNLOCKS.length), at = sourcesAt(stage, true);
    const found = Array.from({ length: c.int(0, 8) }, () => c.of(ITEM_IDS));
    add("next_hint", [p, found, stage], nextHint(p, 0, found, (id) => at.has(id)));
    add("buy_hint", [p, found, stage], buyHint(p, 0, found, (id) => at.has(id)));
  }

  // (somebody who has heard everything there is to hear at a stage, or found it, is sold nothing)
  for (let i = 0; i < 12; i++) {
    const now = c.of(MOMENTS), stage = c.of([0, 3, 20, UNLOCKS.length]), at = sourcesAt(stage, true), can = HINT_IDS.filter((id) => at.has(id));
    const half = can.filter(() => c.maybe(0.5)), p: Purse = { ...purseOf(c, now), coins: 100_000, hints: half }, found = can.filter((id) => !half.includes(id));
    add("next_hint", [p, found, stage], nextHint(p, 0, found, (id) => at.has(id)));
    add("buy_hint", [p, found, stage], buyHint(p, 0, found, (id) => at.has(id)));
  }

  // a purse nobody has used
  const fresh = newPurse() as Partial<Purse>;
  delete fresh.coins; delete fresh.popoto; delete fresh.changed;
  add("fresh", [], fresh);
  return out;
}

/** Every case for the rules of v107: stamina, the three meals, a meal eaten and left, a scroll read. */
export function vectorsV107(): Vector[] {
  const c = chance(20261005), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const SCROLL_IDS = Object.keys(SCROLLS) as ItemId[], BUFF_IDS: BuffId[] = ["calm", "keen", "lucky", "hearty", "green"];
  // (and the forest's two, which its dishes leave since v146: no purse from before has one as its one buff)
  const MEAL_IDS: MealBuffId[] = [...BUFF_IDS, "forage", "net"];
  /** A day's meals, with how many helpings each has had: counted (v146), or not (a purse from before: a meal eaten is one). */
  const helpings = (meals: Purse["meals"]): Purse["meals"] =>
    (c.maybe(0.4) ? meals : { ...meals, bowls: meals.eaten.map((e) => (e ? c.int(1, 3) : 0)) as [number, number, number] });
  /** A purse as it might be with a day's eating behind it. */
  const fed = (now: number): Purse => {
    const p = purseOf(c, now, [...DISH_IDS, ...SCROLL_IDS]), today = dayOf(now), from = now - c.int(0, 9) * 60_000 - c.int(0, 59_999);
    return {
      ...p,
      stamina: c.maybe(0.2) ? p.stamina : { day: c.maybe(0.8) ? today : today - 1, left: c.of([0, 3, 41.5, 77.25, 99.9, 100]) },
      meals: c.maybe(0.2) ? p.meals : helpings({ day: c.maybe(0.8) ? today : today - 1, eaten: [c.maybe(0.4), c.maybe(0.4), c.maybe(0.4)] }),
      eating: c.maybe(0.5) ? null : { dish: c.of(DISH_IDS), meal: c.of([0, 1, 2]), from, till: from + c.int(0, Math.max(0, Math.min(now - from, 300_000))), got: c.of([0, 1.5, 12.25]) },
      buff: c.maybe(0.5) ? null : { id: c.of(BUFF_IDS), until: now + c.int(-2, 2) * 3_600_000 + c.int(0, 999) },
      ...leveled(c, now, MEAL_IDS),
      // (a blessing of the fountain's beside them, now and then: the same buff from both is the stronger of the two)
      ...(c.maybe(0.2) ? { blessed: [{ id: c.of(MEAL_IDS), until: now + c.int(-1, 1) * 3_600_000 + c.int(1, 999) }] } : {}),
      // (a bowl or two owed from a meal that ended with the bag full; and a bag with no room, now and then)
      ...(c.maybe(0.25) ? { owed: c.int(0, 2) } : {}),
      ...(c.maybe(0.2) ? { bag: p.bag.map((s) => s ?? { item: "driftwood" as ItemId, n: 1 }) } : {}),
    };
  };
  for (const now of [...MOMENTS, ...Array.from({ length: 40 }, () => MOMENTS[0] + c.int(0, 72) * 3_600_000 + c.int(0, 3_599_999))]) add("meal_of", [now], mealOf(now));
  for (let i = 0; i < 500; i++) {
    const now = c.of(MOMENTS) + c.int(0, 3) * 977_000, p = fed(now), n = c.of([0, 1, 2, 3, 4, 5, 7, 12, 2.5]), company = c.of([0, 0, 1, 2, 5, 9, -1]);
    add("stamina_of", [p, now], staminaOf(p, now));
    add("buff_of", [p, now], buffOf(p, now));
    add("eaten_today", [p, now], eatenToday(p, now));
    // (v146: the helpings a meal has had, what meals have left and at what level, and a buff raised by one more helping)
    const id = c.of(MEAL_IDS);
    add("bowls_today", [p, now], bowlsToday(p, now));
    add("meal_buffs", [p, now], mealBuffs(p, now));
    add("level_of", [p, now, id], levelOf(p, now, id));
    add("buff_by", [p, now, id], buffBy(p, now, id));
    add("raised", [p, id, now], raised(p, id, now));
    add("cost_of", [p, n, now], costOf(p, n, now));
    add("spend", [p, n, now], spend(p, n, now));
    const slot = c.maybe(0.1) ? c.of([-1, p.bag.length, null]) : c.int(0, p.bag.length - 1), seated = c.maybe(0.85);
    add("sit_down", [p, slot, seated, now], sitDown(p, slot as number, seated, now));
    add("chew", [p, company, now], chew(p, company, now));
    add("get_up", [p, company, now], getUp(p, company, now));
    add("settle", [p, now], settle(p, now));
    const more = c.of([0, 0, 1, 2]);
    add("bowls_back", [p, more], bowlsBack(p, more));
    add("read_scroll", [p, slot], readScroll(p, slot as number));
  }
  // (v146: a helping begun or refused by how many the meal's hours have had: every count, counted and from before
  // helpings were, with a dish in the hand's reach, seated, and no meal under way)
  for (const now of MOMENTS) for (const had of [0, 1, 2, 3, 4]) for (const counted of [true, false]) {
    const meal = mealOf(now), base = purseOf(c, now, DISH_IDS);
    const p: Purse = {
      ...base, eating: null, bag: base.bag.map((s, i) => (i === 0 ? { item: c.of(DISH_IDS), n: 2 } : s)),
      meals: { day: dayOf(now), eaten: [0, 1, 2].map((i) => i === meal && had > 0) as [boolean, boolean, boolean], ...(counted ? { bowls: [0, 1, 2].map((i) => (i === meal ? had : 0)) as [number, number, number] } : {}) },
    };
    add("sit_down", [p, 0, true, now], sitDown(p, 0, true, now));
    add("bowls_today", [p, now], bowlsToday(p, now));
  }
  // a scroll of a recipe known already, and of one that is not: whatever the purses above happened to hold
  for (const [scroll, dish] of Object.entries(SCROLLS) as Array<[ItemId, DishId]>) {
    const now = c.of(MOMENTS), base = purseOf(c, now, [scroll]), bag = base.bag.map((s, i) => (i === 0 ? { item: scroll, n: 2 } : s));
    for (const recipes of [[dish], [], [dish, "tomYum"] as DishId[]]) add("read_scroll", [{ ...base, bag, recipes }, 0], readScroll({ ...base, bag, recipes }, 0));
  }
  return out;
}

/**
 * Every case for the rules of v108: what bites, a cast worked out, the purse around a cast, how long there is to strike.
 * And, since the twenty fish of 2026-10-05 (v122): what bites under each of the signs some fish wait for, and when a
 * sign holds.
 */
export function vectorsV108(): Vector[] {
  const c = chance(20261006), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const TACKLE_IDS = ["rod", "rodTeak", "rodMaster", "floatGlow", "floatQuill", "floatBell", "hookScale", "hookSteel", "lineSilk", "netLong"] as ItemId[];
  const CATCHES = [...FISH_IDS, ...FLOTSAM_IDS] as CatchId[];
  for (const bait of BAITS) for (let hour = 0; hour < 24; hour += bait === "worm" ? 1 : 3) for (const rain of [false, true]) for (const lucky of [false, true]) for (const shallow of [false, true]) {
    add("odds", [bait, hour, rain, lucky, shallow, []], oddsOf(bait, hour, rain, lucky, shallow));
  }
  // (the early game's baits again under each sign by itself and under all of them: the fish that wait for one)
  for (const bait of ["worm", "dough", "minnow", "loach"] as BaitId[]) for (let hour = 0; hour < 24; hour += bait === "worm" ? 1 : 3) for (const rain of [false, true]) for (const shallow of [false, true]) {
    for (const signs of [...ALL_SIGNS.map((x) => [x]), ALL_SIGNS] as Sign[][]) add("odds", [bait, hour, rain, false, shallow, signs], oddsOf(bait, hour, rain, false, shallow, signs));
  }
  for (let i = 0; i < 900; i++) {
    const bait = c.of(BAITS), hour = c.int(0, 23), rain = c.maybe(0.3), lucky = c.maybe(0.3), shallow = c.maybe(0.4);
    const signs = ALL_SIGNS.filter(() => c.maybe(0.3));
    const rnd = Array.from({ length: 6 }, () => (c.maybe(0.05) ? c.of([0, 0.2999999, 0.3, 0.75, 0.9999999]) : c.next()));
    let k = 0;
    add("cast_line", [bait, hour, rain, lucky, shallow, signs, rnd], castLine(bait, hour, rain, lucky, () => rnd[k++], shallow, signs));
    // (v146: a lucky meal at a level. The database is told that there is luck, and how much it does)
    const level = c.int(0, BUFF_LEVELS);
    k = 0;
    add("cast_luck", [bait, hour, rain, level > 0, shallow, signs, rnd, byOf("lucky", level)], castLine(bait, hour, rain, level, () => rnd[k++], shallow, signs));
    if (i % 3 === 0) add("odds_luck", [bait, hour, rain, level > 0, shallow, signs, byOf("lucky", level)], oddsOf(bait, hour, rain, level, shallow, signs));
  }
  // when a sign holds: moments over two months of days and nights (so every day of the week and every age of the
  // moon, its edges among them), somebody tired or not, the others' lines on either side of a crowd, rain that fell or not
  for (let i = 0; i < 700; i++) {
    const now = MOMENTS[0] + c.int(0, 60 * 24) * HOUR + c.int(0, 3_599_999), rain = c.maybe(0.25);
    const scene = { now, spent: c.maybe(0.3), others: c.of([0, 0, 1, SIGNS.crowd - 1, SIGNS.crowd, SIGNS.crowd + 3]), wet: c.of([0, 0, 1, 90_000, 1_800_000]) };
    add("signs_of", [scene.now, scene.spent, scene.others, scene.wet, rain], signsOf(scene, rain));
  }
  for (let i = 0; i < 500; i++) {
    const now = c.of(MOMENTS), base = purseOf(c, now, [...BAITS, ...TACKLE_IDS, ...CATCHES]);
    const p: Purse = {
      ...base,
      stamina: { day: c.maybe(0.8) ? dayOf(now) : dayOf(now) - 1, left: c.of([0, 0, 12, 100]) },
      buff: c.maybe(0.5) ? null : { id: c.of(["keen", "keen", "calm", "lucky"] as BuffId[]), until: now + c.int(-1, 1) * 3_600_000 + c.int(1, 999) },
      ...leveled(c, now, ["keen", "calm", "lucky"]),
      best: Object.fromEntries(Array.from({ length: c.int(0, 4) }, () => [c.of(FISH_IDS), c.of([5, 12.3, 40, 99.9])])),
    };
    const bait = c.maybe(0.9) ? c.of(BAITS) : (c.of(ITEM_IDS) as BaitId), what = c.of(CATCHES), size = c.of([0, 4.2, 12.3, 12.4, 33, 250.5]);
    add("hook_bait", [p, bait], hookBait(p, bait));
    add("lose_bait", [p, bait], loseBait(p, bait));
    add("land_catch", [p, what, size], landCatch(p, what, size));
    add("strike_window", [p, now], strikeWindowOf(p, now));
  }
  return out;
}

/**
 * Every case for the rules of v110, the farm: what a thing in the hand is for, which bed a tile is in, how a plant
 * grows, when a pest strikes and what a plot shows, whose a bed is, each deed on a plot and all of them together with
 * the bed's keeping, and water carried from the river to the well to the can.
 *
 * Given stretches of rain (v118: rain waters the plots), the same cases are made under that rain, a share of them,
 * and only those the rain can touch.
 */
export function vectorsV110(rains: readonly Rain[] = DRY, share = 1): Vector[] {
  const c = chance(20261007), out: Vector[] = [], whole = share === 1, many = (n: number) => Math.round(n * share);
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const SEED_IDS = CROP_IDS.map((id) => CROPS[id].seed), CANS = Object.keys(WATER.cans) as ItemId[], BUCKETS = Object.keys(WATER.buckets) as ItemId[];
  const HANDS: ItemId[] = [...HOES, ...CANS, ...BUCKETS, "growFert", "guardFert", "pestCure", "herring", "mosquitofish", "archerfish", "sickle", "shears", ...SEED_IDS];
  const WHO = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-00000000000a"];
  const KEYS = Array.from({ length: 40 }, () => { const [x, y] = bedCorner(c.int(0, BEDS_IN_FARM - 1)); return plotKey(x + c.int(0, 6), y + c.int(0, 6)); });
  /** A moment at any hour of the day or night. */
  const moment = () => c.of(MOMENTS) + c.int(0, 47) * HOUR + c.int(0, 3_599_999);

  /** A plant as it might stand at a moment: just sown or long ripe, watered or not, fed, covered, cured, picked. */
  const plantOf = (now: number): Plant => {
    const crop = c.of(CROP_IDS), cr = CROPS[crop], picks = cr.picks ?? 1;
    const age = Math.floor(c.of([0, 0.04, 0.2, 0.45, 0.8, 1, 1.2, 2.5]) * cr.hours * HOUR) + c.int(0, 3_599_999), sown = now - age;
    const within = () => sown + c.int(0, age);
    const picked = picks > 1 && age > cr.hours * HOUR && c.maybe(0.5) ? c.int(1, picks) : 0;
    let boost = 0;
    for (let i = c.of([0, 0, 1, 3, 8]); i > 0; i--) boost += FARMING.water.adds * 60_000 * c.of([1, 1.5, 2.2]);
    return {
      by: c.of(WHO), crop, sown, boost,
      watered: c.maybe(0.5) ? Math.max(sown, now - c.int(0, 2 * HOUR)) : 0,
      fed: c.maybe(0.3) ? within() : 0,
      // (covered until after now, as often as not: without it few of the slow ones live to be ripe)
      guard: c.maybe(0.5) ? (c.maybe(0.6) ? now + c.int(1, 24) * HOUR : within() + FARMING.guard * HOUR) : 0,
      cured: c.maybe(0.25) ? within() : 0,
      picked, pickedAt: picked ? Math.max(sown, now - c.int(0, 60 * HOUR)) : 0,
    };
  };
  const plotOf = (now: number): Plot => {
    const r = c.next();
    return r < 0.12 ? { soil: "wild", plant: null } : r < 0.24 ? { soil: "cleared", plant: null } : r < 0.4 ? { soil: "tilled", plant: null } : { soil: "tilled", plant: plantOf(now) };
  };
  /** A plot at a moment: now and then one whose plant a pest struck within the last hours (it is cured, or dead, six hours on: chance alone finds few). */
  const scene = (): { now: number; key: string; plot: Plot } => {
    const key = c.of(KEYS);
    for (let n = c.maybe(0.15) ? 40 : 0; n > 0; n--) {
      const crop = c.of(CROP_IDS), sown = moment();
      const plant: Plant = { by: c.of(WHO), crop, sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
      const struck = pestAt(key, plant, sown + CROPS[crop].hours * HOUR, rains);
      if (struck !== null) return { now: struck + c.int(0, 8 * HOUR), key, plot: { soil: "tilled", plant } };
    }
    const now = moment();
    return { now, key, plot: plotOf(now) };
  };
  /** Somebody at the farm: with that thing in the bag, most times, and in the hand; some stamina left, or none; a meal's buff, or none. */
  const farmer = (now: number, hand: ItemId | null): Purse => {
    const p = purseOf(c, now, [...HANDS, ...CROP_IDS, FARMING.pulled]), bag = [...p.bag];
    if (hand && c.maybe(0.88)) {
      const cap = WATER.cans[hand], carries = WATER.buckets[hand];
      bag[c.int(0, bag.length - 1)] = cap ? (c.maybe(0.2) ? { item: hand, n: 1 } : { item: hand, n: 1, water: c.of([0, 1, cap - 1, cap]) })
        : carries ? (c.maybe(0.4) ? { item: hand, n: 1 } : { item: hand, n: 1, water: c.of([0, 1, carries]) })
          : { item: hand, n: c.int(1, ITEMS[hand].stack) };
    }
    const next: Purse = {
      ...p, bag, hand: c.maybe(0.92) ? hand : c.maybe(0.5) ? null : c.of(HANDS),
      stamina: { day: c.maybe(0.85) ? dayOf(now) : dayOf(now) - 1, left: c.of([0, 1, 3, 50, 100]) },
      buff: c.maybe(0.3) ? { id: c.of(["hearty", "green", "calm"] as BuffId[]), until: now + c.int(-1, 1) * HOUR + c.int(1, 999) } : null,
      ...leveled(c, now, ["hearty", "green", "calm"]),
    };
    if (next.hand === null && c.maybe(0.5)) delete next.hand;
    return next;
  };
  /** The thing a plot is ready for, most times; anything, the rest; nothing, now and then. */
  const handFor = (key: string, plot: Plot, now: number): ItemId | null => {
    if (c.maybe(0.07)) return null;
    if (c.maybe(0.25)) return c.of(HANDS);
    const seen = see(key, plot, now, rains);
    if (!plot.plant) return plot.soil === "tilled" ? c.of(SEED_IDS) : c.of(HOES);
    if (seen.dead) return c.of(HOES);
    // (the cure, or the fish that does as it does: 2026-10-05)
    if (seen.pest && c.maybe(0.6)) return c.of(["pestCure", "pestCure", "archerfish"] as ItemId[]);
    if (seen.ripe && c.maybe(0.6)) return c.of(["sickle", "shears", null, "hoe"] as Array<ItemId | null>);
    // (a can as often as it was; and now and then, for a powder, the fish that does as it does)
    const hand = c.of([...CANS, ...CANS, "growFert", "guardFert", "sickle", "shears"] as ItemId[]);
    return hand === "growFert" && c.maybe(0.4) ? "herring" : hand === "guardFert" && c.maybe(0.4) ? "mosquitofish" : hand;
  };

  // what each thing is for in the hand; and which bed every tile of the farm is in, with a rim of what is not the farm
  for (const id of whole ? [...ITEM_IDS, null] : []) add("tool_of", [id], toolOf(id));
  for (let y = FARM.y - 2; whole && y < FARM.y + FARM.h + 2; y++) for (let x = FARM.x - 2; x < FARM.x + FARM.w + 2; x++) add("bed_of", [x, y], bedOf(x, y));

  // how a plant grows: each vegetable either side of every stage, and one that bears again either side of its next picking
  for (const crop of whole ? CROP_IDS : []) {
    const cr = CROPS[crop], picks = cr.picks ?? 1, again = cr.again ?? 10;
    for (const part of [-0.5, 0, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.99, 1, 1.5]) add("growth", [crop, part * cr.hours, 0, 0], growth(crop, part * cr.hours, 0, 0));
    for (let picked = 1; picked <= picks + 1; picked += picks > 4 ? 3 : 1) {
      for (const since of [0, again - 0.25, again, again + 3]) add("growth", [crop, cr.hours * 2, picked, since], growth(crop, cr.hours * 2, picked, since));
    }
  }

  // a plant's hours, its pest, what its plot shows, what a picking gives
  for (let i = 0; i < many(700); i++) {
    const { now, key, plot } = scene(), plant = plot.plant ?? plantOf(now);
    add("grown", [plant, now], grown(plant, now, rains));
    add("pest_at", [key, plant, now], pestAt(key, plant, now, rains));
    add("see", [key, plot, now], see(key, plot, now, rains));
    const blade = c.of(["sickle", "shears", null, "hoe"] as Array<ItemId | null>);
    add("yield_of", [key, plant, blade], yieldOf(key, plant, blade));
  }

  // whose a bed is
  for (let i = 0; i < (whole ? 300 : 0); i++) {
    const now = moment(), tended = now - c.of([0, 1, 23, 24, 25, 95, 96, 97, 200]) * HOUR - c.int(0, 1) * c.int(0, 3_599_999);
    const bed: Bed | undefined = c.maybe(0.08) ? undefined : { by: c.of(WHO), tended, empty: c.maybe(0.5) ? 0 : tended + c.int(0, Math.max(0, now - tended)) };
    const planted = c.maybe(0.5);
    add("owner_of", [bed ?? null, planted, now], ownerOf(bed, planted, now));
  }

  // each deed by itself
  for (let i = 0; i < many(900); i++) {
    const { now, key, plot } = scene(), me = c.of(WHO), fits = handFor(key, plot, now), p = farmer(now, fits);
    const hand = c.maybe(0.92) ? fits : c.of(HANDS);
    add("hoe", [key, p, plot, hand, now], hoe(key, p, plot, hand, now, rains));
    add("sow", [p, plot, hand, me, now], sow(p, plot, hand, me, now));
    add("water", [key, p, plot, hand, now], water(key, p, plot, hand, now, rains));
    add("feed", [key, p, plot, hand, now], feed(key, p, plot, hand, now, rains));
    add("cure", [key, p, plot, hand, now], cure(key, p, plot, hand, now, rains));
    const may = c.maybe(0.85);
    add("pick", [key, p, plot, may, hand, now], pick(key, p, plot, may, hand, now, rains));
    const owner = c.of([null, me, c.of(WHO)]);
    add("deed_for", [key, plot, hand, me, now, owner], deedFor(key, plot, hand, me, now, owner, rains));
  }
  // (a ripe plant and a bag with no room for what it bears)
  for (let i = 0; i < many(60); i++) {
    const now = moment(), key = c.of(KEYS), crop = c.of(CROP_IDS), me = c.of(WHO);
    const plant: Plant = { by: me, crop, sown: now - CROPS[crop].hours * HOUR - c.int(0, HOUR), boost: 0, watered: 0, fed: 0, guard: now + HOUR, cured: 0, picked: 0, pickedAt: 0 };
    const full: Purse = { ...farmer(now, null), bag: Array.from({ length: 5 }, (_, n): Stack => (n === 0 && c.maybe(0.5) ? { item: crop, n: ITEMS[crop].stack - c.int(0, 2) } : { item: "pebble" as ItemId, n: 1 })) };
    add("pick", [key, full, { soil: "tilled", plant }, true, null, now], pick(key, full, { soil: "tilled", plant }, true, null, now, rains));
    add("tend", [key, { soil: "tilled", plant }, { by: me, tended: now - HOUR, empty: 0 }, 2, 0, full, me, now], tend(key, { soil: "tilled", plant }, { by: me, tended: now - HOUR, empty: 0 }, 2, 0, full, me, now, rains));
  }

  // tending: the deed the hand offers, with the bed's keeping
  for (let i = 0; i < many(1100); i++) {
    const { now, key, plot } = scene(), me = c.of(WHO), p = farmer(now, handFor(key, plot, now));
    const tended = now - c.of([0, 1, 20, 30, 90, 100]) * HOUR - c.int(0, 3_599_999);
    const bed: Bed | undefined = c.maybe(0.3) ? undefined : { by: c.maybe(0.7) ? me : c.of(WHO), tended, empty: c.maybe(0.6) ? 0 : tended + c.int(0, now - tended) };
    const others = c.of([0, 0, 1, 5]), holds = c.of([0, 1, BEDS.each, BEDS.each + 1]);
    add("tend", [key, plot, bed ?? null, others, holds, p, me, now], tend(key, plot, bed, others, holds, p, me, now, rains));
  }

  // water: drawn at the river, poured into the well, a can filled there
  for (let i = 0; i < (whole ? 700 : 0); i++) {
    const now = moment(), where = c.of(["river", "well", "well", null] as Array<"river" | "well" | null>), well = c.of([0, 0, 1, WATER.well - 1, WATER.well, c.int(0, WATER.well)]);
    const p = farmer(now, c.maybe(0.85) ? c.of([...BUCKETS, ...CANS]) : c.maybe(0.5) ? c.of(HANDS) : null);
    add("chore_for", [p, where, well], choreFor(p, where, well));
    add("chore", [p, where, well, now], chore(p, where, well, now));
  }

  // digging a plant out (v119): a hoe, most times, at a plot with a plant in it, most times, living or dead; by
  // somebody who may or may not, with the word that a living one is meant or without; by itself, and by way of the
  // bed's keeping (`tend_sure` is tend() with that word given, which the cases above never give)
  for (let i = 0; i < many(900); i++) {
    let at = scene();
    for (let n = 0; n < 3 && !at.plot.plant; n++) at = scene();
    const { now, key, plot } = at, me = c.of(WHO), hand = c.maybe(0.85) ? c.of(HOES) : handFor(key, plot, now);
    // (now and then a bag with no room for what a dead plant leaves)
    const p: Purse = c.maybe(0.12) && hand ? { ...farmer(now, hand), hand, bag: Array.from({ length: 5 }, (_, n): Stack => (n === 0 ? { item: hand, n: 1 } : { item: "pebble" as ItemId, n: 1 })) } : farmer(now, hand);
    const may = c.maybe(0.8), sure = c.maybe(0.5);
    add("uproot", [key, p, plot, may, sure, hand, now], uproot(key, p, plot, may, sure, hand, now, rains));
    const tended = now - c.of([0, 1, 20, 30, 90, 100]) * HOUR - c.int(0, 3_599_999);
    const bed: Bed | undefined = c.maybe(0.2) ? undefined : { by: c.maybe(0.7) ? me : c.of(WHO), tended, empty: c.maybe(0.6) ? 0 : tended + c.int(0, now - tended) };
    const others = c.of([0, 0, 1, 5]), holds = c.of([0, 1, BEDS.each]), word = c.maybe(0.6);
    add("tend_sure", [key, plot, bed ?? null, others, holds, p, me, now, word], tend(key, plot, bed, others, holds, p, me, now, rains, word));
  }
  return out;
}

/** The farm's rules that the rain can touch. */
const RAIN_FNS = ["grown", "pest_at", "see", "hoe", "water", "feed", "cure", "pick", "deed_for", "tend", "uproot", "tend_sure"];
/**
 * The skies v118's cases are made under, each the quarter hours that are wet: showers of half an hour, rains of
 * four hours, whole wet days, rain without a break, and a quarter hour here and there. Over every quarter hour a
 * plant of the cases could live through: from forty days before the moments they are made at to a fortnight after.
 */
export function skiesV118(): number[][] {
  const DAY_MS = 24 * HOUR, spans: Array<[number, number]> = [
    [slotOf(MOMENTS[0] - 40 * DAY_MS), slotOf(MOMENTS[MOMENTS.length - 2] + 15 * DAY_MS)],
    [slotOf(MOMENTS[MOMENTS.length - 1] - 40 * DAY_MS), slotOf(MOMENTS[MOMENTS.length - 1] + 15 * DAY_MS)],
  ];
  const slots = spans.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i));
  const sky = (k: number, stretch: number, share: number) => slots.filter((s) => roll("sky", k, Math.floor(s / stretch)) < share);
  return [sky(0, 2, 0.25), sky(1, 16, 0.2), sky(2, 96, 0.5), slots, sky(4, 1, 0.03)];
}
/** Every case for v118's rain on the plots: the farm's cases again, a fifth of them, under each of those skies. */
export function vectorsV118(): { slot: number; skies: number[][]; cases: Array<Vector & { sky: number }> } {
  const skies = skiesV118();
  return { slot: SLOT_MS, skies, cases: skies.flatMap((wet, sky) => vectorsV110(rainsOf(wet), 0.2).filter((v) => RAIN_FNS.includes(v.fn)).map((v) => ({ ...v, sky }))) };
}

/**
 * Every case for the rules of v111, the kitchen: what some things make, what a dish takes and whether the cooks hold
 * it, how many helpings come of it, what the wrong things taste of, cooking itself, a pot set down, ladled from (a
 * bowl for each helping) and taken up, a helping served from one's own pot, and what the river's finds have in them.
 */
export function vectorsV111(): Vector[] {
  const c = chance(20261008), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const PUT_IN = ITEM_IDS.filter(goesIn), DISHES_COOKED = RECIPE_IDS.filter((id) => (DISH_IDS as ItemId[]).includes(id)) as DishId[];
  const WHO = ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-00000000000a"];
  const shuffled = <T,>(list: T[]): T[] => { const all = [...list]; for (let i = all.length - 1; i > 0; i--) { const j = c.int(0, i); [all[i], all[j]] = [all[j], all[i]]; } return all; };
  type Things = Array<[ItemId, number]>;

  /** Some things to put together: a recipe's own, or nearly; or anything. */
  const thingsFor = (id: ItemId): Things => {
    const needs = needsOf(id).map(([a, n]): [ItemId, number] => [a, n]), r = c.next();
    if (r < 0.34) return needs;
    if (r < 0.44) return needs.slice(0, -1);
    if (r < 0.50) { const gone = c.int(0, needs.length - 1); return needs.filter((_, i) => i !== gone); }
    if (r < 0.58) return [...needs.slice(0, -1), [c.of(PUT_IN), needs[needs.length - 1][1]]];
    if (r < 0.64) return [...needs, [c.of(PUT_IN), c.int(1, 3)]];
    if (r < 0.72) return needs.map(([a, n], i): [ItemId, number] => [a, i === 0 ? n + 1 : n]);
    if (r < 0.76) return shuffled([...needs, needs[0]]);
    if (r < 0.80) return shuffled(needs);
    if (r < 0.87) return Array.from({ length: c.int(1, 10) }, (): [ItemId, number] => [c.of(PUT_IN), c.int(1, 4)]);
    if (r < 0.90) return [];
    if (r < 0.94) return [...needs.slice(1), [c.of(ITEM_IDS), c.int(1, 2)]];
    return needs.map(([a, n]): [ItemId, number] => [a, c.of([n, 0, -1, 1.5])]);
  };
  /** The cooks at their places, by what each holds: what a thing takes, or nearly; or anybody. */
  const crewFor = (id: ItemId): Array<ItemId | null> => {
    const t = takes(id), r = c.next(), right = shuffled([...t.in, ...Array<null>(Math.max(0, t.cooks - t.in.length)).fill(null)] as Array<ItemId | null>);
    if (r < 0.55) return right.length ? right : [null];
    if (r < 0.65) return [...right, c.of([null, c.of(COOKWARE_IDS)])];
    if (r < 0.75) return right.slice(1);
    if (r < 0.85) return right.map((h, i) => (i === 0 ? c.of(COOKWARE_IDS) : h));
    if (r < 0.92) return [null];
    return Array.from({ length: c.int(1, 4) }, () => c.of([null, c.of(COOKWARE_IDS), c.of(ITEM_IDS)]));
  };
  /** A cook: with the things in the bag, most times; with a free slot or none; having made some things before, and missed some. */
  const cookOf = (now: number, things: Things, id: ItemId): Purse => {
    const p = purseOf(c, now, ["stoveBig", "ladle", "compost", "driftwood"] as ItemId[]);
    let bag: Purse["bag"] = Array.from({ length: c.of([5, 10, 15, 20]) }, (_, i) => (c.maybe(0.45) ? p.bag[i % p.bag.length] : null));
    if (c.maybe(0.9)) for (const [item, n] of things) {
      const want = Number.isInteger(n) && n > 0 ? n + c.of([0, 0, 0, 1, 3]) : 1;
      if (item in ITEMS) bag = put(bag, item, Math.min(want, roomFor(bag, item)));
    }
    if (c.maybe(0.12)) bag = bag.map((s) => s ?? { item: "driftwood" as ItemId, n: 1 });
    return {
      ...p, bag,
      stamina: { day: c.maybe(0.85) ? dayOf(now) : dayOf(now) - 1, left: c.of([0, 2, 50, 100]) },
      ...(c.maybe(0.6) ? { made: [...(c.maybe(0.45) ? [id] : []), ...Array.from({ length: c.int(0, 3) }, () => c.of(RECIPE_IDS))] } : {}),
      ...(c.maybe(0.4) ? { tries: Object.fromEntries(Array.from({ length: c.int(0, 3) }, () => [c.maybe(0.5) ? id : c.of(RECIPE_IDS), c.int(1, 4)])) } : {}),
    };
  };

  // things tidied; what they make; what a thing takes; whether the cooks hold it
  for (let i = 0; i < 500; i++) {
    const id = c.of(RECIPE_IDS), things = thingsFor(id), crew = crewFor(id);
    add("tidy", [things], tidy(things));
    add("made_of", [things], madeOf(things));
    const tools = takes(c.maybe(0.7) ? id : c.of(RECIPE_IDS)).in;
    add("in_hands", [tools, crew], inHands(tools, crew));
  }
  for (const id of RECIPE_IDS) {
    add("takes", [id], takes(id));
    add("made_of", [needsOf(id)], madeOf(needsOf(id)));
    add("made_of", [shuffled(needsOf(id))], madeOf(shuffled(needsOf(id))));
  }

  // helpings: of a dish, by its cooks' cookware, a stove and a ladle in the bag, and the stirs missed; and of the odd dish
  for (let i = 0; i < 500; i++) {
    const dish = c.of(DISHES_COOKED), crew = crewFor(dish), misses = c.of([0, 0, 1, 2, 3, 9, 2.7, -1, 0.5]);
    const bag: Purse["bag"] = Array.from({ length: 5 }, () => (c.maybe(0.25) ? { item: c.of(["stoveBig", "ladle"] as ItemId[]), n: 1 } : c.maybe(0.3) ? { item: c.of(ITEM_IDS), n: 1 } : null));
    add("helpings", [dish, crew, misses, bag], helpings(dish, crew, misses, bag));
    const things = thingsFor(dish).filter(([, n]) => Number.isInteger(n) && n > 0);
    add("odd_helpings", [things, misses], oddHelpings(things, misses));
  }

  // what the wrong things taste of
  for (let i = 0; i < 1400; i++) {
    const id = c.of(RECIPE_IDS), things = thingsFor(id).filter(([item, n]) => Number.isInteger(n) && n > 0 && item in ITEMS), crew = crewFor(id);
    add("taste_of", [things, crew], tasteOf(things, crew));
  }

  // cooking
  for (let i = 0; i < 2600; i++) {
    const now = c.of(MOMENTS), id = c.of(RECIPE_IDS), things = thingsFor(id), crew = crewFor(id), misses = c.of([0, 0, 0, 1, 2, 4, 9, 1.5, -2]);
    const p = cookOf(now, things, id);
    add("cook", [p, things, crew, misses, now], cook(p, things, crew, misses, now));
  }

  // a pot of food: set down, ladled from, taken up; and a helping served from one's own
  const potOf = (): Pot =>
    ({ id: `${c.int(1, 9999)}`, by: c.of(WHO), dish: c.of(DISHES_COOKED), left: c.of([0, 1, 1, 2, 5]), at: [c.int(40, 60), c.int(40, 60)], ...(c.maybe(0.2) ? { tok: true } : {}) });
  for (let i = 0; i < 700; i++) {
    const now = c.of(MOMENTS), me = c.of(WHO), dish = c.of(DISHES_COOKED), pot = potOf();
    const base = purseOf(c, now, ["bowl", "bowl", "tok", "potFull", pot.dish, dish] as ItemId[]);
    const bag = base.bag.map((s): Stack | null => (s?.item === "potFull" ? { item: "potFull", n: 1, ...(c.maybe(0.92) ? { of: { dish, left: c.of([0, 1, 1, 2, 4]) } } : {}) } : s));
    const p: Purse = { ...base, bag: c.maybe(0.12) ? bag.map((s) => s ?? { item: "driftwood" as ItemId, n: 1 }) : bag };
    const slot = c.maybe(0.1) ? c.of([-1, p.bag.length, null]) : (c.maybe(0.7) ? Math.max(0, p.bag.findIndex((s) => s?.item === "potFull")) : c.int(0, p.bag.length - 1));
    const at: [number, number] = [c.int(40, 60), c.int(40, 60)], id = `${c.int(1, 9999)}`;
    add("set_down", [p, slot, me, at, id], setDown(p, slot as number, me, at, id));
    add("ladle", [p, pot], ladle(p, pot));
    add("may_take", [pot, me], mayTake(pot, me));
    add("take_up", [p, pot, me], takeUp(p, pot, me));
    add("serve", [p, slot], serve(p, slot as number));
  }


  // what the river's finds have in them
  const OPENS = Object.keys(INSIDE) as ItemId[];
  for (let i = 0; i < 700; i++) {
    const now = c.of(MOMENTS), base = purseOf(c, now, [...OPENS, ...OPENS, ...(Object.keys(SCROLLS) as ItemId[]).slice(0, 12)]);
    const p: Purse = { ...base, bag: c.maybe(0.15) ? base.bag.map((s) => s ?? { item: "driftwood" as ItemId, n: 1 }) : base.bag };
    const slot = c.maybe(0.1) ? c.of([-1, p.bag.length, null]) : (c.maybe(0.75) ? Math.max(0, p.bag.findIndex((s) => !!s && OPENS.includes(s.item))) : c.int(0, p.bag.length - 1));
    const rolls: [number, number] = [c.maybe(0.2) ? c.of([0, 0.3499999, 0.35, 0.9999999]) : c.next(), c.maybe(0.2) ? c.of([0, 0.9999999, 0.5]) : c.next()];
    add("open", [p, slot, rolls], open(p, slot as number, rolls));
  }
  return out;
}

/**
 * Every case for the rules of v112, deals: a side tidied, whether a bag has it, a side laid out with its coins, a word
 * given and taken back, and the swap itself (what holds something changes hands as it is; a bag with no room refuses
 * the lot).
 */
export function vectorsV112(): Vector[] {
  const c = chance(20261010), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  const A = "00000000-0000-0000-0000-000000000001", B = "00000000-0000-0000-0000-000000000002", STRANGER = "00000000-0000-0000-0000-00000000000a";
  const HOLDERS = ["potFull", "can", "bucket", "bowl", "worm", "minnow", "rice"] as ItemId[];
  /** Somebody with things worth laying out: a pot of food, a can with water in it, things that stack. */
  const trader = (now: number): Purse => {
    const p = purseOf(c, now, HOLDERS);
    return c.maybe(0.15) ? { ...p, bag: p.bag.map((s) => s ?? { item: "driftwood" as ItemId, n: 1 }) } : p;
  };
  /** A side as somebody might lay it out: some of what the bag has, most times; now and then more than it has, a thing twice, nothing, too many kinds, a number that is none, a thing that is no thing. */
  const sideFor = (p: Purse): Give => {
    const has = p.bag.filter((s): s is Stack => !!s);
    return Array.from({ length: c.of([0, 1, 1, 2, 3, 3, 10]) }, (): [ItemId, number] => {
      if (has.length && c.maybe(0.82)) { const s = c.of(has); return [s.item, c.maybe(0.85) ? c.int(1, s.n) : c.of([s.n + 1, 0, -1, 1.5])]; }
      return [c.maybe(0.85) ? c.of(ITEM_IDS) : ("nothing" as ItemId), c.int(1, 3)];
    });
  };
  const dealOf = (pa: Purse, pb: Purse, now: number): Deal => ({
    a: A, b: B, names: { a: "Member One", b: "Member Two" }, at: now - c.int(0, 600_000),
    give: { a: tidyGive(sideFor(pa)), b: tidyGive(sideFor(pb)) },
    coins: { a: c.of([0, 0, 3, pa.coins, pa.coins + 1]), b: c.of([0, 0, 5, pb.coins, pb.coins + 7]) },
    ok: { a: c.maybe(0.8), b: c.maybe(0.8) },
  });

  for (let i = 0; i < 500; i++) {
    const now = c.of(MOMENTS), p = trader(now), give = sideFor(p);
    add("tidy_give", [give], tidyGive(give));
    add("has_all", [p, give], hasAll(p, give));
    const tidy = tidyGive(give), pulled = pull(p.bag, hasAll(p, give) ? tidy : []);
    add("pull", [p.bag, hasAll(p, give) ? tidy : []], pulled);
    const into = trader(now).bag;
    add("push", [into, pulled.stacks], push(into, pulled.stacks));
  }
  for (let i = 0; i < 700; i++) {
    const now = c.of(MOMENTS), pa = trader(now), pb = trader(now), deal = dealOf(pa, pb, now);
    const me = c.of([A, A, B, B, STRANGER]), mine = me === B ? pb : pa;
    add("side_of", [deal, me], sideOf(deal, me));
    const coins = c.of([0, 0, 1, mine.coins, mine.coins + 1, -1, 2.5]);
    const give = sideFor(mine);
    add("lay", [deal, me, mine, give, coins], lay(deal, me, mine, give, coins));
    const word = c.maybe(0.8);
    add("agree", [deal, me, word], agree(deal, me, word));
    add("swap", [deal, pa, pb], swap(deal, pa, pb));
  }
  // (both words given, both sides in the bag, coins enough: so that it is the room that decides)
  for (let i = 0; i < 500; i++) {
    const now = c.of(MOMENTS), pa = trader(now), pb = trader(now);
    const some = (p: Purse): Give => tidyGive(sideFor(p)).filter(([id, n]) => held(p.bag, id) >= n).slice(0, DEAL.kinds);
    const deal: Deal = {
      a: A, b: B, names: { a: "Member One", b: "Member Two" }, at: now, give: { a: some(pa), b: some(pb) },
      coins: { a: c.of([0, 0, Math.min(3, pa.coins), pa.coins]), b: c.of([0, 0, Math.min(5, pb.coins), pb.coins]) }, ok: { a: true, b: true },
    };
    add("swap", [deal, pa, pb], swap(deal, pa, pb));
  }
  return out;
}

/** Every case for the rule of v113: a bag kept from when bags began smaller is given the slots it lacks. */
export function vectorsV113(): Vector[] {
  const c = chance(20261011), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  for (let i = 0; i < 400; i++) {
    const p = purseOf(c, c.of(MOMENTS), CARRIERS);
    // bags of five (as they began), of ten, and bigger; with nothing worn, with something, and with wears that say nothing
    const q: Purse = c.maybe(0.15) ? { ...p, wears: [...(p.wears ?? []), "worm" as ItemId] } : p;
    add("roomy", [q], roomy(q));
  }
  return out;
}

/**
 * Every case for the rules of v135: the uncle's hints drawn by chance (the owner, 2026-10-05). v106's two rules with
 * the number of chance as a fourth word: purses as they come, and somebody who has heard most of a tier, all of it,
 * or all of two, so that what is left is few, or of the next tier, or nothing.
 */
export function vectorsV135(): Vector[] {
  const c = chance(20261005), out: Vector[] = [];
  const add = (fn: string, args: unknown[], want: unknown) => out.push({ fn, args, want: want === undefined ? null : JSON.parse(JSON.stringify(want)) });
  // a number of chance: any from 0 up to 1, and now and then an end of that or something beyond it or nothing (a rule
  // is handed random(), and is held to the code whatever it is handed)
  const ENDS = [0, 0.999999, 1, -0.25, 1.75, null];
  const r = () => (c.maybe(0.2) ? c.of(ENDS) : c.next()) as number;
  const sources = new Map<number, ReturnType<typeof sourcesAt>>();
  const both = (p: Purse, found: ItemId[], stage: number) => {
    const at = sources.get(stage) ?? sourcesAt(stage, true), x = r(), y = r();
    sources.set(stage, at);
    add("next_hint", [p, found, stage, x], nextHint(p, x, found, (id) => at.has(id)));
    add("buy_hint", [p, found, stage, y], buyHint(p, y, found, (id) => at.has(id)));
  };
  for (let i = 0; i < 300; i++) {
    const now = c.of(MOMENTS), p = purseOf(c, now), stage = c.int(0, UNLOCKS.length);
    both(p, Array.from({ length: c.int(0, 8) }, () => c.of(ITEM_IDS)), stage);
  }
  for (let i = 0; i < 300; i++) {
    const now = c.of(MOMENTS), stage = c.of([0, 1, 3, 8, 20, 45, UNLOCKS.length]), at = sources.get(stage) ?? sourcesAt(stage, true), can = HINT_IDS.filter((id) => at.has(id));
    sources.set(stage, at);
    // so many tiers known whole, and so much of the next; some of it heard from him, some read, the rest found by the village
    const whole = c.int(0, 3), share = c.of([0, 0.5, 0.9, 1]);
    const known = can.filter((id) => ITEMS[id].tier <= whole || (ITEMS[id].tier === whole + 1 && c.maybe(share)));
    const mine = known.filter(() => c.maybe(0.6)), found = known.filter((id) => !mine.includes(id));
    const p: Purse = { ...purseOf(c, now), coins: c.maybe(0.85) ? 100_000 : c.int(0, 100), hints: mine.filter((_, k) => k % 2 === 0), recipes: mine.filter((_, k) => k % 2 === 1) as DishId[] };
    both(p, found, stage);
  }
  return out;
}

describe("the cases the database's rules are held to", () => {
  it("are made for the uncle's hints drawn by chance too (v135)", () => {
    const all = vectorsV135();
    expect(all.length).toBe(1200);
    expect(JSON.stringify(vectorsV135())).toBe(JSON.stringify(all));
    const next = all.filter((v) => v.fn === "next_hint"), buy = all.filter((v) => v.fn === "buy_hint");
    // a hint of every tier is drawn, and none where there is none; bought, refused for want of coins, and none to buy
    const tierOf = (v: Vector) => (v.want === null ? 0 : ITEMS[v.want as ItemId].tier);
    for (const tier of [0, 1, 2, 3]) expect(next.filter((v) => tierOf(v) === tier).length).toBeGreaterThan(25);
    expect([...new Set(buy.map((v) => { const w = v.want as { ok?: boolean; why?: string }; return w.ok ? "ok" : w.why; }))].sort()).toEqual(["coins", "none", "ok"]);
    // which is seldom the first he has: with no chance in it, most of these would be answered otherwise
    const sources = new Map<number, ReturnType<typeof sourcesAt>>();
    const first = (v: Vector) => { const stage = v.args[2] as number, at = sources.get(stage) ?? sourcesAt(stage, true); sources.set(stage, at); return nextHint(v.args[0] as Purse, 0, v.args[1] as ItemId[], (id) => at.has(id)); };
    const some = next.filter((v) => v.want !== null);
    expect(some.filter((v) => v.want !== first(v)).length).toBeGreaterThan(some.length * 0.6);
    // and what is drawn is always of the tier the first is of: the price is known before it is bought
    for (const v of some) expect(ITEMS[v.want as ItemId].tier).toBe(ITEMS[first(v)!].tier);
    // the ends of chance, what is beyond them, and no number at all are among them
    for (const end of [0, 0.999999, 1, -0.25, 1.75, null]) expect(next.some((v) => v.args[3] === end && v.want !== null)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v135.json`, JSON.stringify(all)); }
  });

  it("are made for a bag that grew too", () => {
    const all = vectorsV113();
    const grew = all.filter((v) => (v.want as Purse).bag.length > (v.args[0] as Purse).bag.length);
    expect(grew.length).toBeGreaterThan(80);
    expect(all.length - grew.length).toBeGreaterThan(80);
    // by five (a bag of five, nothing worn), and by more (something worn)
    expect(new Set(grew.map((v) => (v.want as Purse).bag.length - (v.args[0] as Purse).bag.length)).size).toBeGreaterThan(2);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v113.json`, JSON.stringify(all)); }
  });

  it("are made for deals too", () => {
    const all = vectorsV112();
    expect(all.length).toBeGreaterThan(4500);
    const of = <T,>(fn: string) => all.filter((v) => v.fn === fn).map((v) => v.want as T);
    const whys = (fn: string) => [...new Set(of<{ ok?: boolean; why?: string } | null>(fn).map((w) => (w?.ok ? "ok" : w?.why)))].sort();
    expect(whys("lay")).toEqual(["amount", "coins", "none", "ok"]);
    expect(whys("agree")).toEqual(["none", "ok"]);
    expect(whys("swap")).toEqual(["coins", "full", "none", "ok"]);
    // swaps in which things, coins, a pot of food and a can with water in it change hands
    const swaps = all.filter((v) => v.fn === "swap" && (v.want as { ok: boolean }).ok).map((v) => ({ deal: v.args[0] as Deal, a: v.args[1] as Purse, want: v.want as { a: Purse; b: Purse } }));
    expect(swaps.length).toBeGreaterThan(150);
    expect(swaps.filter((x) => x.deal.coins.a !== x.deal.coins.b).length).toBeGreaterThan(40);
    expect(swaps.some((x) => x.deal.give.a.some(([id]) => id === "potFull") && x.want.b.bag.some((s) => s?.item === "potFull" && s.of))).toBe(true);
    expect(swaps.some((x) => x.deal.give.a.some(([id]) => id === "can") || x.deal.give.b.some(([id]) => id === "can"))).toBe(true);
    expect(of<unknown[] | null>("push").filter((w) => w === null).length).toBeGreaterThan(20);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v112.json`, JSON.stringify(all)); }
  });

  it("are made for the kitchen too", () => {
    const all = vectorsV111();
    expect(all.length).toBeGreaterThan(9000);
    const of = <T,>(fn: string) => all.filter((v) => v.fn === fn).map((v) => v.want as T);
    const whys = (fn: string) => [...new Set(of<{ ok?: boolean; why?: string } | null>(fn).map((w) => (w?.ok ? "ok" : w?.why)))].sort();
    expect(whys("cook")).toEqual(["amount", "crew", "full", "none", "ok", "tool"]);
    expect(whys("set_down")).toEqual(["none", "ok"]);
    // (a helping always fits: it sits where its bowl sat)
    expect(whys("ladle")).toEqual(["none", "ok", "tool"]);
    expect(whys("take_up")).toEqual(["full", "none", "ok"]);
    expect(whys("serve")).toEqual(["none", "ok", "tool"]);
    // a pot ladled empty is gone, and one with more in it is not
    const ladled = of<{ ok: boolean; pot?: Pot | null }>("ladle").filter((w) => w.ok);
    expect(ladled.filter((w) => w.pot === null).length).toBeGreaterThan(30);
    expect(ladled.filter((w) => w.pot).length).toBeGreaterThan(30);
    expect(whys("open")).toEqual(["full", "none", "ok"]);
    // every taste there is; dishes, other things made, the odd dish and nothing at all; tries counted
    expect([...new Set(of<{ taste: string }>("taste_of").map((w) => w.taste))].sort()).toEqual(["amounts", "far", "less", "more", "some", "swap", "way"]);
    const cooked = all.filter((v) => v.fn === "cook" && (v.want as { ok: boolean }).ok).map((v) => ({ args: v.args as [Purse, unknown, unknown, number, number], want: v.want as { made: ItemId | null; n: number; taste?: string; purse: Purse } }));
    expect(cooked.filter((x) => x.want.made === "oddDish").length).toBeGreaterThan(150);
    expect(cooked.filter((x) => x.want.made === null).length).toBeGreaterThan(80);
    expect(new Set(cooked.map((x) => x.want.made)).size).toBeGreaterThan(70);
    expect(cooked.some((x) => x.want.made && !(DISH_IDS as ItemId[]).includes(x.want.made))).toBe(true);
    expect(cooked.filter((x) => JSON.stringify(x.want.purse.tries ?? {}) !== JSON.stringify(x.args[0].tries ?? {})).length).toBeGreaterThan(40);
    expect(new Set(of<number>("helpings")).size).toBeGreaterThan(6);
    // finds with a scroll in them and without
    const opened = of<{ ok: boolean; found?: ItemId | null }>("open").filter((w) => w.ok);
    expect(opened.filter((w) => w.found === null).length).toBeGreaterThan(20);
    expect(new Set(opened.map((w) => w.found)).size).toBeGreaterThan(30);
    expect(of<boolean>("may_take").filter(Boolean).length).toBeGreaterThan(100);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v111.json`, JSON.stringify(all)); }
  });

  it("are made for the farm too", () => {
    const all = vectorsV110();
    expect(all.length).toBeGreaterThan(12000);
    const of = <T,>(fn: string) => all.filter((v) => v.fn === fn).map((v) => v.want as T);
    const whys = (fn: string) => [...new Set(of<{ ok?: boolean; why?: string } | null>(fn).map((w) => (w?.ok ? "ok" : w?.why)))].sort();
    expect(whys("hoe")).toEqual(["hand", "ok", "soil"]);
    expect(whys("sow")).toEqual(["hand", "ok", "soil"]);
    expect(whys("water")).toEqual(["dry", "hand", "ok", "soil", "wet"]);
    expect(whys("feed")).toEqual(["hand", "ok", "soil"]);
    expect(whys("cure")).toEqual(["hand", "ok", "soil"]);
    expect(whys("pick")).toEqual(["full", "ok", "soil", "theirs", "unripe"]);
    // (tended with no word given, a living plant under its owner's hoe waits for one: `sure`)
    expect(whys("tend")).toEqual(["beds", "dry", "full", "ok", "soil", "sure", "theirs"]);
    expect(whys("chore")).toEqual(["dry", "none", "ok"]);
    // every deed and every chore is done somewhere; a bed taken, kept, dropped and left alone
    expect([...new Set(of<{ deed?: string }>("tend").map((w) => w.deed).filter(Boolean))].sort()).toEqual(["clear", "cure", "feed", "pick", "pull", "sow", "till", "water"]);
    expect([...new Set(of<{ chore?: string }>("chore").map((w) => w.chore).filter(Boolean))].sort()).toEqual(["draw", "fill", "pour"]);
    expect(new Set(of<string | null>("deed_for")).size).toBe(10);
    // digging a plant out (v119): refused every way it can be, and done to the living and to the dead; a dead one
    // leaves compost, or nothing where there is no room; a living one leaves nothing
    expect(whys("uproot")).toEqual(["hand", "ok", "soil", "sure", "theirs"]);
    const dug = all.filter((v) => v.fn === "uproot" && (v.want as { ok: boolean }).ok).map((v) => ({ dead: see(v.args[0] as string, v.args[2] as Plot, v.args[6] as number).dead, got: (v.want as { got: unknown[] }).got.length, sure: v.args[4] as boolean }));
    expect(dug.filter((d) => d.dead && d.got === 1).length).toBeGreaterThan(20);
    expect(dug.filter((d) => d.dead && d.got === 0).length).toBeGreaterThan(2);
    expect(dug.filter((d) => d.dead && !d.sure).length).toBeGreaterThan(10);
    expect(dug.filter((d) => !d.dead).length).toBeGreaterThan(100);
    expect(dug.filter((d) => !d.dead && (d.got !== 0 || !d.sure)).length).toBe(0);
    expect(whys("tend_sure")).toEqual(expect.arrayContaining(["ok", "soil", "sure", "theirs"]));
    const dugOut = all.filter((v) => v.fn === "tend_sure" && (v.want as { deed?: string }).deed === "uproot");
    expect(dugOut.length).toBeGreaterThan(60);
    // (never without the word, and by the bed's owner or in a bed that is nobody's: the bed is given back tended, or not at all)
    expect(dugOut.every((v) => v.args[8] === true)).toBe(true);
    expect(dugOut.some((v) => (v.want as { bed?: Bed }).bed?.by === v.args[6])).toBe(true);
    expect(dugOut.some((v) => !(v.want as { bed?: Bed }).bed)).toBe(true);
    expect(dugOut.every((v) => { const b = (v.want as { bed?: Bed }).bed; return !b || b.by === v.args[6]; })).toBe(true);
    expect(all.filter((v) => v.fn === "tend_sure" && (v.want as { deed?: string }).deed === "pull").length).toBeGreaterThan(10);
    expect(all.filter((v) => v.fn === "tend_sure" && (v.want as { why?: string }).why === "sure" && v.args[8] === false).length).toBeGreaterThan(20);
    const tended = all.filter((v) => v.fn === "tend" && (v.want as { ok: boolean }).ok);
    expect(tended.some((v) => v.args[2] === null && (v.want as { bed?: Bed }).bed)).toBe(true);
    expect(tended.some((v) => v.args[2] !== null && !(v.want as { bed?: Bed }).bed)).toBe(true);
    expect(tended.some((v) => (v.want as { bed?: Bed }).bed?.empty)).toBe(true);
    // plants at every stage, ripe, with a pest on them and dead of one; pickings of every size; beds owned and lapsed
    const seen = of<{ stage: number; ripe: boolean; pest: boolean; dead: boolean; wet: boolean }>("see");
    expect([...new Set(seen.map((w) => w.stage))].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    for (const what of ["ripe", "pest", "dead", "wet"] as const) expect(seen.filter((w) => w[what]).length).toBeGreaterThan(20);
    expect(of<number | null>("pest_at").filter((w) => w !== null).length).toBeGreaterThan(100);
    expect(new Set(of<number>("yield_of")).size).toBeGreaterThan(4);
    expect(of<string | null>("owner_of").filter((w) => w === null).length).toBeGreaterThan(50);
    expect(of<string | null>("owner_of").filter((w) => w !== null).length).toBeGreaterThan(50);
    expect(new Set(of<number>("bed_of")).size).toBe(BEDS_IN_FARM + 1);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v110.json`, JSON.stringify(all)); }
  });

  it("are made for the rain too: the farm's rules under five skies (v118)", () => {
    const { slot, skies, cases } = vectorsV118(), dry = vectorsV110(DRY, 0.2).filter((v) => RAIN_FNS.includes(v.fn));
    expect(slot).toBe(900_000);
    expect(skies.length).toBe(5);
    expect(cases.length).toBeGreaterThan(8000);
    const under = (sky: number, fn: string) => cases.filter((v) => v.sky === sky && v.fn === fn);
    const wetShare = (list: Vector[]) => list.filter((v) => (v.want as { wet?: boolean } | null)?.wet).length / Math.max(1, list.length);
    const refusedWet = (list: Vector[]) => list.filter((v) => (v.want as { why?: string } | null)?.why === "wet").length;
    for (let sky = 0; sky < skies.length; sky++) {
      // every rule the rain can touch is asked about under every sky
      for (const fn of RAIN_FNS) expect(under(sky, fn).length).toBeGreaterThan(fn === "tend" || fn === "pick" || fn === "uproot" || fn === "tend_sure" ? 150 : 100);
      // and the rain does something: plants have grown more than the clock, the fertiliser and the can account for
      const more = under(sky, "grown").filter((v) => (v.want as number) > grown(v.args[0] as Plant, v.args[1] as number) + 1e-9).length;
      expect(more).toBeGreaterThan(sky === 4 ? 20 : 80);
    }
    // under rain without a break every plant is wet and no can is offered; with no rain said, a good many are not
    expect(wetShare(under(3, "see").filter((v) => (v.want as { crop?: string | null }).crop))).toBe(1);
    expect(under(3, "deed_for").filter((v) => v.want === "water").length).toBe(0);
    expect(refusedWet(under(3, "water"))).toBeGreaterThan(refusedWet(dry.filter((v) => v.fn === "water")) + 10);
    expect(wetShare(dry.filter((v) => v.fn === "see" && (v.want as { crop?: string | null }).crop))).toBeLessThan(0.6);
    expect(dry.filter((v) => v.fn === "deed_for" && v.want === "water").length).toBeGreaterThan(10);
    // plants ripe, struck and dead under every sky, so that the rain is counted where it decides
    for (let sky = 0; sky < skies.length; sky++) {
      const seen = under(sky, "see").map((v) => v.want as { ripe: boolean; pest: boolean; dead: boolean });
      for (const what of ["ripe", "pest", "dead"] as const) expect(seen.filter((w) => w[what]).length).toBeGreaterThan(3);
    }
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v118.json`, JSON.stringify({ slot, skies, cases })); }
  });

  it("are made for fishing too", () => {
    const all = vectorsV108();
    expect(all.length).toBeGreaterThan(3500);
    // what bites under a sign, and when a sign holds: each sign held in some case and not in another
    const held = all.filter((v) => v.fn === "signs_of").map((v) => v.want as Sign[]);
    for (const sign of ALL_SIGNS) { expect(held.some((w) => w.includes(sign))).toBe(true); expect(held.some((w) => !w.includes(sign))).toBe(true); }
    const bit = new Set(all.filter((v) => v.fn === "odds").flatMap((v) => (v.want as Array<{ what: string }>).map((o) => o.what)));
    for (const id of FISH_IDS) expect(bit.has(id)).toBe(true);
    const whys = (fn: string) => new Set(all.filter((v) => v.fn === fn).map((v) => { const w = v.want as { ok?: boolean; why?: string } | null; return w?.ok ? "ok" : w?.why; }));
    expect([...whys("hook_bait")].sort()).toEqual(["none", "ok", "tool"]);
    // casts that bring a fish with nibbles and a length, and casts that bring what is no fish
    const casts = all.filter((v) => v.fn === "cast_line").map((v) => v.want as { what: string; nibbles: number[]; size: number });
    expect(casts.some((w) => w.nibbles.length === 2)).toBe(true);
    expect(casts.some((w) => w.size === 0)).toBe(true);
    expect(new Set(casts.map((w) => w.what)).size).toBeGreaterThan(25);
    // a catch that goes in and one that does not, a record and none; a moment to strike both longer and shorter than the plain one
    const landed = all.filter((v) => v.fn === "land_catch").map((v) => v.want as { kept: boolean; record: boolean });
    expect(new Set(landed.map((w) => `${w.kept}${w.record}`)).size).toBe(4);
    const windows = new Set(all.filter((v) => v.fn === "strike_window").map((v) => v.want as number));
    expect(windows.size).toBeGreaterThan(4);
    const dir = process.env.TOWN_VECTORS;
    // (the catalog itself beside the cases: a dry run that writes rows over holds every row to it)
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v108.json`, JSON.stringify(all)); writeFileSync(`${dir}/catalog.json`, JSON.stringify(catalogOf())); }
  });

  it("are made for stamina and meals too", () => {
    const all = vectorsV107();
    expect(all.length).toBeGreaterThan(5000);
    const whys = (fn: string) => new Set(all.filter((v) => v.fn === fn).map((v) => { const w = v.want as { ok?: boolean; why?: string } | null; return w?.ok ? "ok" : w?.why; }));
    expect([...whys("sit_down")].sort()).toEqual(["meal", "none", "ok", "stand"]);
    // (three helpings to a meal's hours: a third begun, and a fourth refused, among the cases)
    const sat = all.filter((v) => v.fn === "sit_down").map((v) => ({ had: (v.args[0] as Purse).meals.bowls, eating: (v.args[0] as Purse).eating, want: v.want as { ok: boolean; why?: string; purse?: Purse } }));
    expect(sat.some((x) => x.want.ok && x.want.purse!.meals.bowls!.includes(3))).toBe(true);
    expect(sat.some((x) => !x.want.ok && x.want.why === "meal" && !x.eating && x.had?.includes(3))).toBe(true);
    expect([...whys("read_scroll")].sort()).toEqual(["known", "none", "ok"]);
    // meals both under way and run out, with and without a buff at their end
    const chewed = all.filter((v) => v.fn === "chew").map((v) => v.want as { done: boolean; purse: Purse });
    expect(chewed.some((w) => w.done && w.purse.buff)).toBe(true);
    expect(chewed.some((w) => !w.done && w.purse.eating)).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v107.json`, JSON.stringify(all)); }
  });

  it("are made the same every time, a few thousand of them", () => {
    const all = vectorsV106();
    expect(all.length).toBeGreaterThan(4000);
    expect(JSON.stringify(vectorsV106())).toBe(JSON.stringify(all));
    // every rule is tried both ways: done, and refused for each of its reasons
    const whys = (fn: string) => new Set(all.filter((v) => v.fn === fn).map((v) => { const w = v.want as { ok?: boolean; why?: string } | null; return w?.ok ? "ok" : w?.why; }));
    expect([...whys("buy")].sort()).toEqual(["amount", "coins", "each", "full", "none", "ok", "sold"]);
    expect([...whys("leave")].sort()).toEqual(["amount", "none", "ok", "unwanted"]);
    expect([...whys("take_back")].sort()).toEqual(["full", "gone", "none", "ok"]);
    expect([...whys("collect")].sort()).toEqual(["nothing", "ok"]);
    expect([...whys("wear")].sort()).toEqual(["none", "ok", "worn"]);
    expect([...whys("take_off")].sort()).toEqual(["full", "none", "ok"]);
    expect([...whys("give")].sort()).toEqual(["amount", "none", "ok", "unwanted"]);
    expect([...whys("buy_hint")].sort()).toEqual(["coins", "none", "ok"]);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v106.json`, JSON.stringify(all)); }
  });
});
