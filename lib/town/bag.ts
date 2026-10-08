/**
 * A bag put in order: a thing moved from one slot to another, and the whole bag sorted (a member, by way of the
 * owner, 2026-10-08: "ขอ function sort ของในกระเป๋า และ ลากวางได้"; of how, he took what was put to him: "ตามที่เสนอ
 * ทำได้เลย").
 *
 * - **A thing moved** goes into an empty slot; onto more of the same thing it joins it, as far as a slot holds, and
 *   what does not fit stays where it was; onto anything else the two change places.
 * - **Sorted**, the bag has its things from its first slot on, with no gap: by kind (`KIND_ORDER`), then by tier
 *   (the early game's first), then by the thing; split stacks of one thing brought together into as few slots as
 *   hold them.
 * - What holds something (a pot its food, a can or a bucket its water) is never joined to another and keeps what it
 *   holds, wherever it goes.
 *
 * Nothing is made or lost by either, the bag has as many slots as it had, and what is in the hand is in the hand
 * still (the hand is a kind of thing, not a slot). The database has the same rules (v165: `town.bag_move`,
 * `town.bag_sort`), held to these case by case. Pure, and tested.
 */
import { ITEMS, type ItemId, type ItemKind } from "./items";
import { no, type Done, type Purse, type Stack } from "./trade";

/** The kinds in the order a sorted bag has them: what is worked with first, then what it brings, then what is made of that. */
export const KIND_ORDER: ItemKind[] = ["tool", "seed", "bait", "crop", "fish", "catch", "wild", "bug", "staple", "goods", "dish", "scroll"];

/**
 * Whether a stack may be joined to more of its thing: of a thing more than one of which go in a slot, and with
 * nothing hung on it but what it is and how many (a pot's food and a can's water today; whatever a later round hangs
 * on a stack keeps it whole too, with nothing to be written here).
 */
const joins = (s: Stack) => ITEMS[s.item].stack > 1 && Object.entries(s).every(([k, v]) => k === "item" || k === "n" || !v);

/**
 * A thing moved from one slot to another. Refused (`none`) for a slot the bag has not, the same slot twice, or an
 * empty slot to move from.
 */
export function moveSlot(purse: Purse, from: number, to: number): Done<{ purse: Purse }> {
  const bag = purse.bag;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= bag.length || to >= bag.length || from === to) return no("none");
  const a = bag[from], b = bag[to];
  if (!a) return no("none");
  const out = bag.map((s) => (s ? { ...s } : null)), stack = ITEMS[a.item].stack;
  if (b && b.item === a.item && joins(a) && joins(b) && b.n < stack) {
    const add = Math.min(a.n, stack - b.n);
    out[to] = { ...b, n: b.n + add };
    out[from] = a.n === add ? null : { ...a, n: a.n - add };
  } else {
    out[to] = { ...a };
    out[from] = b ? { ...b } : null;
  }
  return { ok: true, purse: { ...purse, bag: out } };
}

/** Where a stack stands in a sorted bag: before another, after it, or beside it (two alike in every way). */
function order(a: Stack, b: Stack): number {
  const ka = KIND_ORDER.indexOf(ITEMS[a.item].kind), kb = KIND_ORDER.indexOf(ITEMS[b.item].kind);
  if (ka !== kb) return ka - kb;
  // (within a kind: what the early game has first, then by the thing)
  const ta = ITEMS[a.item].tier, tb = ITEMS[b.item].tier;
  if (ta !== tb) return ta - tb;
  if (a.item !== b.item) return a.item < b.item ? -1 : 1;
  // (of one thing: the pots by their dish, the fuller first; then the more water; then the bigger stack)
  const da = a.of?.dish ?? "", db = b.of?.dish ?? "";
  if (da !== db) return da < db ? -1 : 1;
  return ((b.of?.left ?? 0) - (a.of?.left ?? 0)) || ((b.water ?? 0) - (a.water ?? 0)) || (b.n - a.n);
}

/** The bag sorted. It is never refused: a bag in order already comes back as it was. */
export function sortBag(purse: Purse): Purse {
  const whole: Stack[] = [], loose = new Map<ItemId, number>();
  for (const s of purse.bag) {
    if (!s) continue;
    if (joins(s)) loose.set(s.item, (loose.get(s.item) ?? 0) + s.n);
    else whole.push({ ...s });
  }
  for (const [item, n] of loose) {
    const stack = ITEMS[item].stack;
    for (let left = n; left > 0; left -= stack) whole.push({ item, n: Math.min(stack, left) });
  }
  whole.sort(order);
  return { ...purse, bag: purse.bag.map((_, i) => whole[i] ?? null) };
}

/**
 * What is in a slot, as a word: the thing, and for what holds something what it holds (two pots of food are told
 * apart by it); not how many. For whoever has to know that a slot still has what was meant when a move was asked for:
 * the panel while a thing is carried, the keeper when the move's turn comes.
 */
export const whatOf = (s: Stack | null | undefined): string => (s ? `${s.item}|${s.of ? `${s.of.dish}:${s.of.left}` : ""}|${s.water ?? ""}` : "");
/** A stack as a word that says the same of two alike, in whatever order they were written down (the database's is its own). */
const word = (s: Stack | null) => (s ? JSON.stringify(Object.entries(s).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : 1))) : "");
/**
 * Where the thing in a slot is once the bag is sorted: the first slot with a stack like it, or null when there is
 * none like it any more (a split stack that was brought together with its fellows). For whoever remembers a slot:
 * of several pots of food only the slot says which is the one in the hand (lib/town/trade's handSlot).
 */
export function sortedSlot(purse: Purse, slot: number): number | null {
  const s = purse.bag[slot];
  if (!s) return null;
  const like = word(s), at = sortBag(purse).bag.findIndex((x) => word(x) === like);
  return at < 0 ? null : at;
}
/** Whether sorting would change anything: a bag in order already has nothing to offer. */
export const sorted = (purse: Purse): boolean => { const bag = sortBag(purse).bag; return purse.bag.every((s, i) => word(s) === word(bag[i])); };
