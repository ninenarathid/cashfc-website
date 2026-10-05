import { BUFFS, FISH, type BuffId, type CatchId } from "./items";
import { dayOf } from "./stamina";
import type { Line } from "./talk";
import { HOUR, no, type Done, type Purse } from "./trade";

/**
 * The wishing fountain in the middle of the plaza (the owner, 2026-10-05: "ช่วยทำ
 * บ่ออธิษฐาน … อยากให้ลงลึกรายละเอียด"; and to the numbers, "ใช้ได้ครับ").
 *
 * It is where Popoto coins leave the village for good. On the game's second
 * day the purses held 1,369 coins and the plots about 13,200 more still to be
 * picked, the uncle's relatives buy without limit, and nothing but his stall
 * took a coin back: so the fountain asks more the richer the village is.
 *
 * - **A coin is tossed towards a wish.** The wishes are the five things a meal
 *   leaves behind (lib/town/items' BUFFS) and five that only the fountain
 *   grants (BLESSINGS, below). What is tossed is gone.
 * - **The village fills a pot between them.** The day's first goal is a share
 *   of all the coins in everybody's purses, counted when the day's first coin
 *   is tossed, and never less than a least amount. A pot that is not filled
 *   stays as it is for the next day: no coin is tossed for nothing.
 * - **The coin that fills it grants the wish with the most behind it**, there
 *   and then, for three hours: to everybody whose coins are in that pot, and
 *   to whoever tosses one while it lasts (they have what is left of it). So
 *   when to fill it is the village's to choose, and what to wish for is
 *   theirs to settle between them.
 * - **A second blessing the same day costs twice the first, a third four
 *   times**, and that is the day's last: what is tossed after it waits in the
 *   pot for the morning.
 * - **Tossed together it counts for more**: when three people have tossed
 *   within the same minute, a coin counts for one and a half towards the goal.
 *   (Only towards the goal: a coin tossed is a coin gone.)
 * - **A toss may carry a line of words**, the wish itself (the owner: "คำอธิษฐาน
 *   ยืนยันว่าเอา"): one a member a day, read at the fountain by whoever looks.
 *   Words only: they change nothing of the pot or of a blessing. Anybody may
 *   toss a coin onto another's wish, report one, and take their own back.
 * - **A blessing is held beside a meal's buff, and beside another blessing**
 *   ("เอาแบบบัพคู่ หรือ มากกว่า 2 บัพได้ไปเลย"): each runs its own three hours
 *   (lib/town/stamina's buffsOf). The same one twice is no stronger, only
 *   longer.
 *
 * Pure, like lib/town/trade: every number is a knob the database keeps
 * (`town_knobs`), every function is given the moment and what it needs to
 * know of the village, and what it gives back is new.
 */
export const WISHING = {
  /** The day's first goal: this share of all the coins in the village's purses, and never less than `least`. */
  share: 0.03,
  least: 100,
  /** How many blessings a day, and how many times the last one's goal the next one's is. */
  rounds: 3,
  more: 2,
  /** How long a blessing lasts, in hours. */
  hours: 3,
  /** Tossed together: so many people within so many seconds, and what a coin then counts for towards the goal. */
  people: 3,
  within: 60,
  counts: 1.5,
};
export type Wishing = typeof WISHING;

/**
 * What only the fountain grants (the owner, 2026-10-05: "อยากให้ช่วยคิดบัฟใหม่ๆที่เกี่ยวกับตัวเกม หรือ gameplay ที่ผู้เล่นน่าจะชอบ
 * คิดเพิ่มแล้วใส่เข้าไปในบ่อน้ำพุได้เลย"). Each spares time or a chore, or gives a little more food; none makes a thing
 * fetch more coins, since the fountain is there to take coins out.
 *
 * - **swift**: a bite comes sooner (the wait is shorter by `by` of itself);
 * - **clear**: the water is clear, and the shade of what is on its way to the hook shows before the strike;
 * - **spring**: watering takes no water from the can;
 * - **sprout**: a seed sown is `by` of its way to ripe at once;
 * - **feast**: a pot cooked gives `by` helpings more;
 * - **carry**: a bucket drawn at the river holds `by` bucketfuls more (the owner, the same night: "ถ้าเป็นไปได้ บัฟเกี่ยวกับ
 *   ผู้เล่นที่ชอบขนน้ำมาเติมน้ำในบ่อให้ผู้อื่น").
 *
 * And two that wait for what they are about ("อยากให้ช่วยเพิ่ม บัฟที่เกี่ยวของกับ การหาของป่า การจับแมลงที่เพิ่มเข้ามาใหม่"): they
 * are named and drawn here, and wished for once the forest and the insects are in the game (`LATER`, below):
 *
 * - **forage**: each of the forest's games is a little kinder (lib/town/forest-eye: a look-alike fewer, a stroke to spare, one more shaken down);
 * - **net**: an insect's senses reach less far (1 / (1 + `by`) of the way: lib/town/insects).
 */
export const BLESSINGS = {
  swift: { name: { th: "ปลาชุม", en: "Quick bite" }, about: { th: "ปลากินเบ็ดไวขึ้น", en: "A bite comes sooner" }, icon: "buffSwift", by: 0.4 },
  clear: { name: { th: "น้ำใส", en: "Clear water" }, about: { th: "เห็นเงาของสิ่งที่กำลังมากินเบ็ด", en: "The shade of what is coming to the hook shows" }, icon: "buffClear", by: 1 },
  spring: { name: { th: "บัวไม่พร่อง", en: "Brimming can" }, about: { th: "รดน้ำแล้วน้ำในบัวไม่ลด", en: "Watering takes no water from the can" }, icon: "buffSpring", by: 1 },
  sprout: { name: { th: "ดินอุ่น", en: "Warm soil" }, about: { th: "เมล็ดที่หว่านโตนำไปก่อน", en: "A seed sown has a head start" }, icon: "buffSprout", by: 0.15 },
  feast: { name: { th: "หม้อใหญ่", en: "Big pot" }, about: { th: "ทำอาหารได้เพิ่มอีกหนึ่งที่", en: "A pot cooked gives a helping more" }, icon: "buffFeast", by: 1 },
  carry: { name: { th: "หาบน้ำ", en: "Water bearer" }, about: { th: "ตักน้ำจากแม่น้ำได้เพิ่มอีกหนึ่งถังต่อเที่ยว", en: "A bucket drawn holds one bucketful more" }, icon: "buffCarry", by: 1 },
  forage: { name: { th: "ตาป่า", en: "Forest eye" }, about: { th: "เกมเก็บของป่าง่ายขึ้นเล็กน้อย", en: "The forest's games are a little kinder" }, icon: "buffForage", by: 1 },
  net: { name: { th: "ย่องเบา", en: "Soft step" }, about: { th: "แมลงยอมให้เข้าใกล้ได้มากขึ้น", en: "An insect lets you come nearer" }, icon: "buffNet", by: 0.5 },
} satisfies Record<string, { name: Line; about: Line; icon: string; by: number }>;
export type BlessingId = keyof typeof BLESSINGS;
/** Anything that can be wished for, and had: what a meal leaves behind, and what only the fountain grants. */
export type WishId = BuffId | BlessingId;
/** Each of them, as it is named and drawn. */
export const WISH: Record<WishId, { name: Line; about: Line; icon: string; by: number }> = { ...BUFFS, ...BLESSINGS };
/**
 * Blessings that wait for what they are about to be in the game. None now: the forest and the insects are in it
 * (lib/town/forest-eye says what `forage` and `net` do), and their file, v125, puts the two at the end of the
 * database's own list (`town.wishes`), after v123's eleven.
 */
export const LATER: WishId[] = [];
/** What can be wished for, in the order they are listed: a meal's five, then the fountain's own. (The database says the same list, and the page shows what it says.) */
export const WISHES = (Object.keys(WISH) as WishId[]).filter((w) => !LATER.includes(w));

/** A line dropped under the swift blessing: the bite, and each twitch of the float before it, come sooner. (Whole seconds to the bite, as a line's are; one at the least.) */
export function hastened<T extends { wait: number; nibbles: number[] }>(cast: T, by: number = BLESSINGS.swift.by): T {
  return { ...cast, wait: Math.max(1, Math.ceil(cast.wait * (1 - by))), nibbles: cast.nibbles.map((n) => n * (1 - by)) };
}
/** What clear water shows of what is on its way to the hook: how rare a fish it is, or that it is no fish. */
export type Shade = "common" | "uncommon" | "rare" | "legend" | "other";
export const shadeOf = (what: CatchId): Shade => (what in FISH ? FISH[what as keyof typeof FISH].tier : "other");

/** A blessing: which wish, from when until when, whose coin filled the pot, and whose it is. */
export interface Blessing { id: WishId; from: number; until: number; by: string; of: string[] }

/** The fountain, as the village keeps it. */
export interface Fountain {
  /** The day the count below is of, that day's first goal, and how many blessings it has given. */
  day: number;
  first: number;
  given: number;
  /** The pot being filled: what is in it towards the goal, how much of that is behind each wish, and whose coins they are, in the order they first tossed. */
  pot: number;
  by: Partial<Record<WishId, number>>;
  who: string[];
  /** Who tossed lately, and when (for coins tossed together). */
  lately: Array<[who: string, at: number]>;
  /** The blessings that are running, the oldest first. */
  blessings: Blessing[];
}
export const newFountain = (): Fountain => ({ day: -1, first: 0, given: 0, pot: 0, by: {}, who: [], lately: [], blessings: [] });

/** The day's first goal, when the village's purses hold so many coins between them. */
export const firstGoal = (supply: number, k: Wishing = WISHING) => Math.max(k.least, Math.round(k.share * Math.max(0, supply)));

/** The fountain on the day a moment is in: a new day has a new first goal and its blessings ahead of it; the pot, and the blessings still running, are as they were. */
export function dawned(f: Fountain, now: number, supply: number, k: Wishing = WISHING): Fountain {
  const day = dayOf(now);
  return f.day === day ? f : { ...f, day, first: firstGoal(supply, k), given: 0 };
}

/** What the pot has to reach for the next blessing; null when the day's last has been given. */
export const goalOf = (f: Fountain, k: Wishing = WISHING): number | null => (f.given >= k.rounds ? null : f.first * k.more ** f.given);

/** The blessings somebody has now: those running that their coin is in, the oldest first. */
export const blessingsOf = (f: Fountain, me: string, now: number): Array<{ id: WishId; until: number }> =>
  f.blessings.filter((b) => b.until > now && b.of.includes(me)).map((b) => ({ id: b.id, until: b.until }));

/** The wish with the most behind it; of two with as much, the one just tossed towards, then the first as they are listed. */
function leading(by: Fountain["by"], last: WishId): WishId {
  const most = Math.max(...WISHES.map((w) => by[w] ?? 0));
  return (by[last] ?? 0) >= most ? last : WISHES.find((w) => (by[w] ?? 0) >= most)!;
}

/**
 * Toss coins towards a wish. `supply` is all the coins in the village's purses
 * now (it is read only on the day's first toss). The fountain takes no more
 * than fills the pot (`took`); what it took counts for `counted` towards the
 * goal; and when that fills the pot, `granted` is the wish that came true.
 */
export function toss(purse: Purse, f: Fountain, me: string, wish: WishId, coins: number, now: number, supply: number, k: Wishing = WISHING):
  Done<{ purse: Purse; fountain: Fountain; took: number; counted: number; granted: WishId | null }> {
  if (!WISHES.includes(wish)) return no("none");
  if (!Number.isInteger(coins) || coins < 1) return no("amount");
  if (coins > purse.coins) return no("coins");
  const today = dawned(f, now, supply, k), goal = goalOf(today, k);
  // (tossed together: this coin, and whoever else tossed within the last minute)
  const lately: Fountain["lately"] = [...today.lately.filter(([who, at]) => who !== me && now - at < k.within * 1000), [me, now]];
  const each = lately.length >= k.people ? k.counts : 1;
  // (no more than fills the pot; one coin at the least, which is what fills a pot that was full when the day began)
  const took = goal === null ? coins : Math.min(coins, Math.max(1, Math.ceil((goal - today.pot) / each)));
  const counted = goal === null ? took * each : Math.min(took * each, Math.max(goal - today.pot, 0));
  const by = { ...today.by, [wish]: (today.by[wish] ?? 0) + counted }, pot = today.pot + counted;
  const who = today.who.includes(me) ? today.who : [...today.who, me];
  // (those that have ended are let go; a coin tossed while one lasts has what is left of it)
  const running = today.blessings.filter((b) => b.until > now).map((b) => (b.of.includes(me) ? b : { ...b, of: [...b.of, me] }));
  const full = goal !== null && pot >= goal;
  const granted = full ? leading(by, wish) : null;
  const left = full ? pot - goal : pot;
  return {
    ok: true, took, counted, granted,
    purse: { ...purse, coins: purse.coins - took },
    fountain: {
      ...today, lately,
      given: today.given + (full ? 1 : 0),
      // (a pot filled is empty again; one that held more than its goal when the day began keeps the rest, and whose it is)
      pot: left, by: full && left <= 0 ? {} : by, who: full && left <= 0 ? [] : who,
      blessings: granted ? [...running, { id: granted, from: now, until: now + k.hours * HOUR, by: me, of: who }] : running,
    },
  };
}

/**
 * The fountain as a member is told it: the goal and how the pot stands, how
 * much is behind each wish, who has tossed into it (by name, in the order
 * they first did, and never how much each), whether my coin is in it; the
 * blessings running; and the numbers a page words itself with. The
 * database's `town.fountain_told` says the same of what it keeps.
 */
export interface FountainTold {
  goal: number | null;
  pot: number;
  by: Partial<Record<WishId, number>>;
  given: number;
  rounds: number;
  who: string[];
  mine: boolean;
  blessings: Array<{ id: WishId; from: number; until: number; by: string; people: number; mine: boolean }>;
  hours: number;
  people: number;
  within: number;
  counts: number;
  /** What can be wished for, as whoever keeps the fountain lists it. */
  wishes: WishId[];
  /** The wishes in their writers' words, the newest first; and whether whoever asks may hide one (an admin). */
  notes: WishNote[];
  admin: boolean;
}
/** A wish in its writer's words, as it is told: whose, towards what, how many tossed a coin onto it; whether it is mine, whether I tossed onto it or reported it, and whether it is hidden (told only to its writer and to an admin). */
export interface WishNote { id: number; by: string; wish: WishId; note: string; cheers: number; mine: boolean; cheered: boolean; reported: boolean; hidden: boolean; at: number }

/** How long a wish's words may be, in letters; and how many reports hide one. */
export const NOTE = { most: 80, reports: 3, shown: 12 };
/**
 * A wish's words as they are kept: what cannot be seen made a space, runs of spaces made one, none at either end.
 * Null when nothing is left, or more than eighty letters.
 */
export function tidyNote(text: string | null | undefined): string | null {
  // eslint-disable-next-line no-control-regex -- what cannot be seen is exactly what is meant
  const s = (text ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/ +/g, " ").replace(/^ +| +$/g, "");
  return s === "" || Array.from(s).length > NOTE.most ? null : s;
}
/** What the trial tells of the fountain it keeps: as the database tells it. `supply` is all the coins there are (a day's first goal is by them), `called` what somebody is called. */
export function told(f: Fountain, me: string, now: number, supply: number, called: (id: string) => string, k: Wishing = WISHING, notes: WishNote[] = []): FountainTold {
  const today = dawned(f, now, supply, k);
  return {
    goal: goalOf(today, k), pot: today.pot, by: today.by, given: today.given, rounds: k.rounds,
    who: today.who.map(called), mine: today.who.includes(me),
    blessings: today.blessings.filter((b) => b.until > now).map((b) => ({ id: b.id, from: b.from, until: b.until, by: called(b.by), people: b.of.length, mine: b.of.includes(me) })),
    hours: k.hours, people: k.people, within: k.within, counts: k.counts, wishes: WISHES, notes, admin: false,
  };
}

/** A purse as the rules are to see it: with the blessings somebody has, while they last (lib/town/stamina's buffsOf reads them beside the meal's). */
export function blessed(purse: Purse, f: Fountain, me: string, now: number): Purse {
  const mine = blessingsOf(f, me, now);
  if (mine.length) return { ...purse, blessed: mine };
  if (!purse.blessed) return purse;
  const rest = { ...purse };
  delete rest.blessed;
  return rest;
}
