/**
 * What the hand's quick bar offers (components/town/TownHand): the things of the bag that are taken in the hand to
 * do something with, so that changing between them needs no opening of the bag (a member, by way of the owner,
 * 2026-10-08: "มีปุ่ม / คีย์ลัดสลับเครื่องมือในตัวแบบไวๆ ไม่ต้องเปิดช่องเก็บของเพื่อกดถือทุกครั้ง").
 *
 * Anything can be held, for the town to see; the bar is only of what a deed asks to be in the hand: a tool (a hoe, a
 * can, a bucket, a rod, a net, cookware, a pot of food to set down), a bag of seed, what is put on a plant, and what
 * a beetle is called down with. It tells nothing of what any of them is for: it is the bag's own things, by their
 * pictures. Pure, and tested.
 */
import { PUT_ON } from "./farm";
import { LURES } from "./insects";
import { ITEMS, type ItemId } from "./items";
import type { Purse } from "./trade";

/** How many the bar holds: one for each of the keys 1 to 9. */
export const HANDY_MOST = 9;

/** Whether a thing is one of those the bar offers. */
export function handy(id: ItemId): boolean {
  const kind = ITEMS[id]?.kind;
  return kind === "tool" || kind === "seed" || id in PUT_ON || LURES.includes(id);
}

/**
 * The slots of the bag the bar offers, in the bag's own order, nine at the most. A kind of thing is there once (the
 * hand is a kind of thing: of two stacks of one seed the first is taken up), but every pot of food is, each having a
 * dish of its own.
 */
export function handySlots(purse: Purse): number[] {
  const slots: number[] = [], seen = new Set<ItemId>();
  purse.bag.forEach((s, slot) => {
    if (!s || !handy(s.item) || slots.length >= HANDY_MOST) return;
    if (!s.of) { if (seen.has(s.item)) return; seen.add(s.item); }
    slots.push(slot);
  });
  return slots;
}

/** The slot the key that goes round the bar takes next: the one after what is held, the first with nothing held or at the bar's end; -1 with nothing to hold. */
export function nextHandy(slots: number[], held: number): number {
  if (!slots.length) return -1;
  const at = slots.indexOf(held);
  return slots[(at + 1) % slots.length];
}
