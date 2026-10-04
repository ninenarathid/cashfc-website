import { ITEMS, SCROLLS, type ItemId } from "./items";
import { GOODS, no, put, type Done, type Purse } from "./trade";

/**
 * The recipe scrolls nobody sells (the owner, 2026-10-03: "อาหารมีหลายอย่างมาก ทำไมม้วน
 * สูตรมีแค่ 6 อัน"). There is a scroll for every dish that has a recipe; the
 * uncle sells the six simplest; every other is found in what the river brings
 * up that is no fish:
 *
 * - **an old boot** has one stuffed in its toe now and then, of the early game's dishes;
 * - **an old bottle** always has one rolled up in it, of the early game's or the second tier's;
 * - **an old chest** always has one, of the second tier's or the third's.
 *
 * Two fish hold something too (2026-10-05, of the twenty fish the owner asked for, each good for something of its
 * own): a wels has swallowed a scroll of the early game's, always; a pacu's belly has a seed in it, more often
 * than not, of the six early vegetables the uncle sells only once his first orders are filled.
 *
 * Which one is chance, the same for every scroll it could be: so whoever fishes
 * a great deal has scrolls they do not need, and somebody who cooks wants
 * them. A scroll is a thing like any other and changes hands in a deal
 * (lib/town/deal): that is the point of it ("อยากให้ ผู้เล่นมีปฏิสัมพันธ์ มี communicate
 * กันมากที่สุด"). What a scroll tells is what any found recipe tells: all but its
 * last thing (lib/town/hints).
 *
 * Nothing says what can be opened: the bag offers it for the thing that can.
 *
 * Pure: the chance is given, as two numbers.
 */
export const INSIDE: Partial<Record<ItemId, { chance: number; tiers?: Array<1 | 2 | 3>; things?: ItemId[] }>> = {
  boot: { chance: 0.35, tiers: [1] },
  bottle: { chance: 1, tiers: [1, 2] },
  chest: { chance: 1, tiers: [2, 3] },
  wels: { chance: 1, tiers: [1] },
  pacu: { chance: 0.8, things: ["seedGarlic", "seedBasil", "seedTomato", "seedCorn", "seedDaikon", "seedSweetPotato"] },
};

/** The scroll of each thing that has one: a dish, or the cure for pests. */
export const SCROLL_OF = Object.fromEntries((Object.keys(SCROLLS) as ItemId[]).map((scroll) => [SCROLLS[scroll], scroll])) as Partial<Record<ItemId, ItemId>>;
/** The scrolls that are only found, of dishes of some tiers: every one the uncle does not sell, in the order the things are listed. */
export const foundScrolls = (tiers: Array<1 | 2 | 3>): ItemId[] => (Object.keys(SCROLLS) as ItemId[]).filter((s) => !GOODS[s] && tiers.includes(ITEMS[s].tier));
/** What may be inside a thing that opens, in the order one is drawn from: the scrolls of its tiers that are only found, or the things it names. */
export const insideOf = (id: ItemId): ItemId[] => { const x = INSIDE[id]; return !x ? [] : x.things ?? foundScrolls(x.tiers ?? []); };
/** Whether a thing can be opened. */
export const opens = (id: ItemId | null | undefined): boolean => !!id && id in INSIDE;

/**
 * Open the thing in a slot of the bag: it is gone, and what was in it is in the
 * bag instead (`found`; null when it was empty). `rolls` are two numbers in
 * [0, 1): whether there is anything in it, and which. Refused, with nothing
 * lost, when it is nothing that opens, or the bag would have no slot for a
 * thing once the thing is gone (asked for before it is known whether there
 * is one, so that a full bag is no way to look inside for nothing).
 */
export function open(purse: Purse, slot: number, rolls: [number, number]): Done<{ purse: Purse; found: ItemId | null }> {
  const s = purse.bag[slot], inside = s ? INSIDE[s.item] : undefined;
  if (!s || !inside) return no("none");
  const bag = purse.bag.map((b, i) => (i !== slot ? b : s.n === 1 ? null : { ...s, n: s.n - 1 }));
  if (!bag.some((b) => !b)) return no("full");
  const all = insideOf(s.item);
  const found = rolls[0] < inside.chance && all.length ? all[Math.min(all.length - 1, Math.max(0, Math.floor(rolls[1] * all.length)))] : null;
  return { ok: true, found, purse: { ...purse, bag: found ? put(bag, found, 1) : bag } };
}
