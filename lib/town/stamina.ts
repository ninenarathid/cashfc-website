import { BOWL, BUFFS, BUFF_HOURS, DISHES, SCROLLS, inBowl, isDish, type BuffId, type DishId, type ItemId } from "./items";
import type { WishId } from "./fountain";
import { BANGKOK, DAY, HOUR, no, put, roomFor, type Done, type Purse } from "./trade";

/**
 * Stamina, meals and what a meal leaves behind (the owner, 2026-10-03).
 *
 * - **The gauge** is full once a day ("รี 1 ครั้งต่อวัน"), at dawn. Mini-games
 *   spend it. With none left they can still be played, only much harder ("ไม่ใช่
 *   ว่าจะเล่นต่อไม่ได้ แต่จะเล่นต่อแล้วยากขึ้นมากๆ").
 * - **Three meals a day add to it**: breakfast, lunch and dinner, each once,
 *   each in its own hours by the real clock in Bangkok (asked, he chose "ตามเวลา
 *   จริง").
 * - **A meal takes five minutes, sitting down** ("อยากให้การทานข้าวใช้เวลาระดับ
 *   นึง … คนที่กินข้าวในชีวิตจริง อาจจะอยาก login เข้ามาเพื่อหาเพื่อนทานข้าว"). The
 *   stamina comes as it is eaten; getting up early keeps what was eaten and
 *   forfeits the rest. Finishing it leaves the dish's buff for a few hours.
 * - **A helping is eaten out of its bowl** ("ตอนตักใส่ถ้วย ถ้วยต้องหายไปด้วย ต้องกินหมดก่อน
 *   ถ้วยค่อยกลับมา", 2026-10-04): the bowl left the bag when the helping was
 *   ladled (lib/town/cooking), and is back when the meal ends, eaten up or left
 *   half eaten. A bag with no room for it then is owed it, and has it as soon
 *   as there is room: no bowl is lost to a full bag.
 * - **Eaten together it gives more**: each other person eating beside one adds
 *   a tenth of the dish's stamina, up to five of them. Alone it gives all the
 *   dish says, so nobody is the worse for eating alone.
 *
 * Pure, like lib/town/trade: every number is a knob, every function is given
 * the moment, and what it gives back is new.
 */
export const STAMINA = {
  max: 100,
  /** The hour, in Bangkok, a day begins: the gauge is full again and the day's three meals are ahead. */
  dawn: 5,
  /** The hour each meal begins at: breakfast, lunch, dinner. Each runs until the next; dinner until the day ends. */
  meals: [5, 11, 17] as [number, number, number],
  /** How long a meal takes, in minutes. */
  minutes: 5,
  /** What each other person eating beside one adds, as a share of the dish's stamina, and how many of them count. */
  together: 0.1,
  company: 5,
  /**
   * With none left every mini-game is much harder (the owner, 2026-10-03: "ถ้า stamina หมด mini game ทุกอย่างจะยากขึ้น
   * มากด้วย"). Fishing: how much of the strike's moment is left, how much of the safe stretch a fight keeps, how
   * much harder the fish surges, and how much further and faster the safe stretch moves. (The game of timing took
   * its stretch and its marker's speed from here, and keeps them as they were: lib/town/timing.)
   *
   * About three times as hard as it first was (the owner, on the game's first day, 2026-10-04: "เมื่อ stamina หมด
   * minigame จะยากขึ้นกว่านี้อีกสามเท่า แต่ยังคงเป็นไปได้ที่จะเล่นผ่าน ถ้าเป็นคนที่เล่นเก่งมาก … เพื่อที่อาหารจะได้สำคัญ
   * มากขึ้น"). With the first numbers (0.6, 0.6, 1.3, 1.15, 1.3) a practised hand landed the four small common fish
   * nearly as often with no stamina as with it, and nobody had to eat. These are set by what comes of a whole go (a
   * strike, then the fight it begins), played by made-up players as the fight's own numbers were: of a hundred
   * bites a practised hand lands 35 where it landed 95, a very good one 85, one that plays as the members did that
   * first day hardly any, and nobody the bigger fish: those are for somebody who has eaten. A third of each number
   * was tried, and is no game: with a fifth of the stretch even the very good hand lands one small fish in four.
   * - The strike's moment is half of what it was with none, 0.48 s for 0.96. Under about 0.3 s a strike is the
   *   quickness of the nerves and of the phone, not skill, so the weight is on the fight.
   * - The safe stretch is 0.35 of its width where it was 0.6, and moves a little faster.
   *
   * Eased that night (the owner: "ตอนนี้คนตกปลาน้อยเพราะพอสตามิน่าหมด เล่นยากเกินไป ช่วยทำให้ ง่ายขึ้นหน่อย"). The made-up
   * players above were wrong about the strike. They were given 0.42 s from the bite to the strike; the members' own,
   * kept with every go (146 strikes with stamina, by ten members), come half within 0.63 s, a tenth within 0.47, the
   * quickest ever at 0.31. So with 0.48 s to strike in, eight bites in ten were gone before the hand came down,
   * however well it would have fought, and what it did hook was hooked late. Six lines were dropped with no stamina
   * in the half day those numbers stood, and one fish landed; the farm's work was done over five hundred times with
   * none in the same hours. Played again by hands that strike as the members do, of a hundred bites of the four
   * small common fish:
   * - as it was (0.48 s to strike in, 0.35 of the stretch): a member lands none, the quicker members nine, a very
   *   good hand fifty-four;
   * - as it is (0.96 s, half the stretch): forty-two, seventy-seven, ninety-seven. A minnow or a barb is landed
   *   more often than not, a catfish by the quick; the bigger fish are still for somebody who has eaten (nine in a
   *   hundred for the very good hand, none for the others).
   * The strike's moment is what it first was, since under about half a second it is the nerves and the phone that
   * are tried, not skill; the stretch is between what it first was and what it became. The surge, the sway and the
   * pace are not changed.
   */
  spent: { strike: 0.6, band: 0.5, surge: 1.3, sway: 1.15, pace: 1.4 },
};
export const MEALS = ["breakfast", "lunch", "dinner"] as const;

/** The day a moment is in, counted from dawn in Bangkok. */
export const dayOf = (now: number) => Math.floor((now + BANGKOK - STAMINA.dawn * HOUR) / DAY);
/** Which meal's hours a moment is in: 0 breakfast, 1 lunch, 2 dinner. */
export function mealOf(now: number): 0 | 1 | 2 {
  const h = (((now + BANGKOK) % DAY) + DAY) % DAY / HOUR, [, lunch, dinner] = STAMINA.meals;
  return h >= dinner || h < STAMINA.dawn ? 2 : h >= lunch ? 1 : 0;
}
/** The moment the meal after this one begins. */
export function nextMealAt(now: number): number {
  const start = (now + BANGKOK) - ((((now + BANGKOK) % DAY) + DAY) % DAY);   // Bangkok's midnight before now
  const at = [...STAMINA.meals.map((h) => start + h * HOUR), start + DAY + STAMINA.meals[0] * HOUR].find((t) => t > now + BANGKOK)!;
  return at - BANGKOK;
}

/** The stamina somebody has now: what was left, or all of it on a new day. */
export const staminaOf = (purse: Purse, now: number) => (purse.stamina.day === dayOf(now) ? purse.stamina.left : STAMINA.max);
/** Whether somebody has no stamina left: every mini-game is then much harder (STAMINA.spent), never refused. */
export const isSpent = (purse: Purse, now: number) => staminaOf(purse, now) <= 0;
/** The buff a meal left, while it lasts. */
export const buffOf = (purse: Purse, now: number): BuffId | null => (purse.buff && purse.buff.until > now ? purse.buff.id : null);
/**
 * Every buff somebody has now, each once: the one a meal left, and the fountain's blessings they have that still run
 * (lib/town/fountain). They are held together (the owner, 2026-10-05: "เอาแบบบัพคู่ หรือ มากกว่า 2 บัพได้ไปเลย"); the
 * same one twice is no stronger.
 */
export function buffsOf(purse: Purse, now: number): WishId[] {
  const meal = buffOf(purse, now), mine = (purse.blessed ?? []).filter((b) => b.until > now).map((b) => b.id);
  return [...new Set(meal ? [meal, ...mine] : mine)];
}
/** Whether somebody has a buff now, from a meal or from the fountain: what every rule asks. */
export const hasBuff = (purse: Purse, now: number, id: WishId) => buffsOf(purse, now).includes(id);
/** Which of today's meals have been eaten. */
export const eatenToday = (purse: Purse, now: number): [boolean, boolean, boolean] =>
  (purse.meals.day === dayOf(now) ? purse.meals.eaten : [false, false, false]);

/** What something costs somebody, in stamina: less after a hearty meal. */
export const costOf = (purse: Purse, n: number, now: number) => Math.round(n * (hasBuff(purse, now, "hearty") ? 1 - BUFFS.hearty.by : 1));
/** Spend stamina on something: never below none (it is done all the same, the harder way). */
export function spend(purse: Purse, n: number, now: number): Purse {
  return { ...purse, stamina: { day: dayOf(now), left: Math.max(0, staminaOf(purse, now) - costOf(purse, n, now)) } };
}

/**
 * The bowls a meal has done with, back in the bag: `more` of them now, and any owed from before. One the bag has no
 * room for is owed (`owed` in the purse) until there is.
 */
export function bowlsBack(purse: Purse, more = 0): Purse {
  const owed = (purse.owed ?? 0) + more;
  if (!owed) return purse;
  const fits = Math.min(owed, roomFor(purse.bag, BOWL)), rest = { ...purse };
  delete rest.owed;
  return { ...rest, bag: fits ? put(purse.bag, BOWL, fits) : purse.bag, ...(owed > fits ? { owed: owed - fits } : {}) };
}

/** Sit down to the dish in a slot of the bag: this meal's hours' one meal begins, and a helping leaves the bag. */
export function sitDown(purse: Purse, slot: number, seated: boolean, now: number): Done<{ purse: Purse; dish: DishId }> {
  const s = purse.bag[slot];
  if (!s || !isDish(s.item)) return no("none");
  if (!seated) return no("stand");
  const meal = mealOf(now), eaten = eatenToday(purse, now);
  if (purse.eating || eaten[meal]) return no("meal");
  const marked = eaten.map((e, i) => e || i === meal) as [boolean, boolean, boolean];
  return {
    ok: true, dish: s.item,
    purse: {
      ...purse,
      bag: purse.bag.map((b, i) => (i !== slot ? b : s.n === 1 ? null : { item: s.item, n: s.n - 1 })),
      meals: { day: dayOf(now), eaten: marked },
      eating: { dish: s.item, meal, from: now, till: now, got: 0 },
    },
  };
}

/** How far through the meal somebody is, from 0 to 1. */
export const mealProgress = (purse: Purse, now: number) =>
  (purse.eating ? Math.min(1, Math.max(0, (now - purse.eating.from) / (STAMINA.minutes * 60_000))) : 0);

/**
 * Count a meal on to now, with so many others eating beside one: the stamina
 * for the minutes since it was last counted, and, when its time is up, its end:
 * the dish's buff, if it has one, and its bowl back in the bag.
 */
export function chew(purse: Purse, company: number, now: number): { purse: Purse; done: boolean } {
  const e = purse.eating;
  if (!e) return { purse, done: false };
  const whole = STAMINA.minutes * 60_000, end = e.from + whole, till = Math.min(now, end);
  const dish = DISHES[e.dish];
  const gain = dish.stamina * (Math.max(0, till - e.till) / whole) * (1 + STAMINA.together * Math.min(STAMINA.company, Math.max(0, Math.floor(company))));
  const left = Math.min(STAMINA.max, staminaOf(purse, now) + gain);
  const done = now >= end;
  const after: Purse = {
    ...purse,
    stamina: { day: dayOf(now), left },
    eating: done ? null : { ...e, till, got: e.got + gain },
    buff: done && dish.buff ? { id: dish.buff, until: now + BUFF_HOURS * HOUR } : purse.buff,
  };
  return { done, purse: done ? bowlsBack(after, inBowl(e.dish) ? 1 : 0) : after };
}

/**
 * A meal whose time is up, finished: for a purse that was not looked at while
 * it ran out (a tab closed at the table). The rest of it counts as eaten
 * alone, and its buff runs from when the meal ended, not from when somebody
 * came back to look. A purse with no meal, or one still being eaten, is as it
 * was, but for a bowl it was owed and now has room for.
 */
export function settle(purse: Purse, now: number): Purse {
  if (!purse.eating) return bowlsBack(purse);
  const end = purse.eating.from + STAMINA.minutes * 60_000;
  return now >= end ? chew(purse, 0, end).purse : bowlsBack(purse);
}

/** Get up from a meal before it is finished: what was eaten stays, the rest and the buff are forfeit. Its bowl comes back all the same. */
export function getUp(purse: Purse, company: number, now: number): Purse {
  if (!purse.eating) return purse;
  const counted = chew(purse, company, now).purse;
  const up: Purse = { ...counted, eating: null, buff: counted.eating ? purse.buff : counted.buff };
  // (a meal that ran out as it was counted gave its bowl back already)
  return counted.eating && inBowl(purse.eating.dish) ? bowlsBack(up, 1) : up;
}

/** Read the scroll in a slot of the bag: its recipe is known from now on, and the scroll is used up. */
export function readScroll(purse: Purse, slot: number): Done<{ purse: Purse; dish: ItemId }> {
  const s = purse.bag[slot], dish = s ? SCROLLS[s.item] : undefined;
  if (!s || !dish) return no("none");
  if (purse.recipes.includes(dish)) return no("known");
  return {
    ok: true, dish,
    purse: { ...purse, recipes: [...purse.recipes, dish], bag: purse.bag.map((b, i) => (i !== slot ? b : s.n === 1 ? null : { item: s.item, n: s.n - 1 })) },
  };
}
