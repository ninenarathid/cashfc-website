import { move } from "./box";
import { works } from "./gifts";
import type { ItemId } from "./items";
import { no, type Done, type Purse, type Stack } from "./trade";

/**
 * The cloud ram's pack (the owner, 2026-11-04: "แพะขี่ของสายเลี้ยงสัตว์ ทำให้มีกระเป๋าที่จะเก็บอะไรก็ได้เพิ่มในตัวสัตว์ได้ 10 ช่อง
 * มีแต่เจ้าของที่ access ได้", and, asked when it opens: "ตอนใส่แกะเป็นภูต").
 *
 * Saddlebags on the pasture's cloud ram (the sixth rank's familiar, lib/town/gifts' famCloudRam): ten slots that hold
 * anything a box holds, as a box's slots do (things of a kind stack in one; a thing that holds something goes in and
 * comes out as it is). They are their owner's alone: nobody else is told of them nor reaches them. They open anywhere,
 * but only while the cloud ram is the familiar that follows (walked beside or ridden); with another familiar put on,
 * what is in them stays where it is, shut, until the ram follows again. Nothing is made and nothing is lost: what
 * leaves the bag is in the pack, and the other way about. Unlike a gift's pouch nothing goes in by itself.
 *
 * Pure; the database keeps the same (v319: `town_boxes.pack`, town.pack_put and town.pack_take).
 */
export const PACK = { slots: 10, gift: "famCloudRam" } as const;
export interface Pack { things: Array<Stack | null> }
export const newPack = (): Pack => ({ things: Array<Stack | null>(PACK.slots).fill(null) });
/** Why something was not done with the pack, beyond what a bag refuses for: the ram is not the familiar that follows, or the pack has no room. */
export type PackRefusal = "shut" | "packed";
type Did<T> = Done<T> | { ok: false; why: PackRefusal };

/** Whether my pack opens now: the cloud ram is the familiar that follows me. */
export const packOpen = (purse: Pick<Purse, "gifts">): boolean => works(purse, PACK.gift);
/** A pack as big as it is: one kept short is given the slots it lacks, at its end. */
export const roomyPack = (pack: Pack | null | undefined): Pack => {
  const things = Array.isArray(pack?.things) ? pack.things : [];
  return { things: things.length >= PACK.slots ? things : [...things, ...Array<null>(PACK.slots - things.length).fill(null)] };
};

/** Put so many of what is in a slot of my bag into the pack. */
export function packPut(purse: Purse, pack: Pack, slot: number, n: number): Did<{ purse: Purse; pack: Pack; item: ItemId; n: number }> {
  if (!packOpen(purse)) return { ok: false, why: "shut" };
  const kept = roomyPack(pack), did = move(purse.bag, slot, n, kept.things, "packed");
  if (!did.ok) return did.why === "packed" ? { ok: false, why: "packed" } : no(did.why);
  return { ok: true, purse: { ...purse, bag: did.out }, pack: { things: did.into }, item: did.item, n: did.n };
}
/** Take so many of what is in a slot of the pack out into my bag. */
export function packTake(purse: Purse, pack: Pack, slot: number, n: number): Did<{ purse: Purse; pack: Pack; item: ItemId; n: number }> {
  if (!packOpen(purse)) return { ok: false, why: "shut" };
  const kept = roomyPack(pack), did = move(kept.things, slot, n, purse.bag, "full");
  if (!did.ok) return did.why === "packed" ? { ok: false, why: "packed" } : no(did.why);
  return { ok: true, purse: { ...purse, bag: did.into }, pack: { things: did.out }, item: did.item, n: did.n };
}
