import { push } from "./deal";
import type { ItemId } from "./items";
import { held, no, roomFor, take, wholeStack, type Done, type Purse, type Stack } from "./trade";
import { MOUNTAIN_PROPS, byStorebox } from "./world";

/**
 * The storage box in the plaza (the owner, 2026-10-05: "ช่วยทำ กล่องเก็บของ มาตั้ง
 * ไว้กลางเมือง เก็บได้ฟรี 10 ชิ้น อัพเกรดได้ในอนาคต").
 *
 * One chest stands in the middle of the town (lib/town/world's STOREBOX), and
 * whoever comes to it finds their own things in it: what a member puts away is
 * theirs alone, and nobody else sees it or takes it. It has ten slots for
 * nothing, and its slots are as a bag's: things of a kind stack in one, up to
 * a number of their own. A thing that holds something (a pot of food, a can
 * with water in it) goes in and comes out as it is.
 *
 * A character can buy more slots with logs and coins, up to forty. Logs in
 * the bag are used first, then logs in that character's box. Each purchase
 * names the capacity shown, so another device cannot buy the next tier by accident.
 *
 * Nothing is made and nothing is lost by it: what leaves the bag is in the
 * box, and the other way about. Pure; the database keeps the same (v134).
 */
export const BOX = {
  /** The slots a box has for nothing. */
  slots: 10,
  max: 40,
  upgrades: [
    { slots: 20, wood: 100, coins: 1000 },
    { slots: 30, wood: 200, coins: 3000 },
    { slots: 40, wood: 400, coins: 8000 },
  ],
  /** How near the box one stands to put things in and take them out, in tiles. */
  reach: 2,
};

/** One member's box: what is in each slot, and the slots it has beyond the free ones. */
export interface Box { things: Array<Stack | null>; more: number }
export interface BoxUpgrade { slots: number; wood: number; coins: number }
export const newBox = (): Box => ({ things: Array<Stack | null>(BOX.slots).fill(null), more: 0 });

/** Why something was not done at the box, beyond what a bag refuses for. */
export type BoxRefusal =
  | "far"     // not standing by the box
  | "packed"  // no room in the box
  | "wood"    // not enough logs in the bag and box together
  | "max"     // already at the largest capacity
  | "changed"; // the capacity offered has changed on another device
type Did<T> = Done<T> | { ok: false; why: BoxRefusal };
const not = (why: BoxRefusal): { ok: false; why: BoxRefusal } => ({ ok: false, why });

/** A box as big as it is to be: one kept from when it was smaller is given the slots it lacks, at its end (what is in it stays where it is). Never made smaller. */
export function roomyBox(box: Box): Box {
  const want = BOX.slots + Math.max(0, box.more);
  return box.things.length >= want ? box : { ...box, things: [...box.things, ...Array<null>(want - box.things.length).fill(null)] };
}

/** The next capacity and its price. Existing extra slots count toward the next tier. */
export function boxOffer(box: Box): BoxUpgrade | null {
  const slots = roomyBox(box).things.length;
  return BOX.upgrades.find((u) => u.slots > slots && u.slots <= BOX.max) ?? null;
}

/** Buy the capacity shown, without moving or losing any other stored things. */
export function upgradeBox(purse: Purse, box: Box, slots: number, at: readonly [number, number]): Did<{ purse: Purse; box: Box } & BoxUpgrade> {
  if (!nearBox(at)) return not("far");
  const kept = roomyBox(box), offer = boxOffer(kept);
  if (!offer) return not("max");
  if (slots !== offer.slots) return not("changed");
  const bagWood = held(purse.bag, "log");
  if (bagWood + held(kept.things, "log") < offer.wood) return not("wood");
  if (purse.coins < offer.coins) return no("coins");
  const fromBag = Math.min(bagWood, offer.wood);
  return {
    ok: true, ...offer,
    purse: { ...purse, coins: purse.coins - offer.coins, bag: take(purse.bag, "log", fromBag) },
    box: roomyBox({ ...kept, more: offer.slots - BOX.slots, things: take(kept.things, "log", offer.wood - fromBag) }),
  };
}

// ── mining ── (the second door: the chest in the mountain's foot yard opens the same box. Its tile is the layout's,
  // and there is none where the mountain is not laid)
/** The chests that open a member's box beyond the plaza's: each a tile. */
export const MORE_CHESTS: ReadonlyArray<{ x: number; y: number }> = MOUNTAIN_PROPS.filter((p) => p.kind === "storebox").map((p) => ({ x: p.x, y: p.y }));
/** Whether a tile is by one of them (and is not the chest itself). */
export const byMoreChest = (tx: number, ty: number, reach: number = BOX.reach) => MORE_CHESTS.some((c) => { const far = Math.max(Math.abs(tx - c.x), Math.abs(ty - c.y)); return far >= 1 && far <= reach; });
// ── end: mining ──
/** Whether somebody on a tile stands by the box. */
export const nearBox = (at: readonly [number, number]) => byStorebox(at[0], at[1], BOX.reach) || byMoreChest(at[0], at[1]);

/** How many of what is in a stack some slots have room for: a thing that holds something takes an empty slot of its own; the rest go onto their own kind first. */
export function fits(into: Array<Stack | null>, s: Stack): number {
  return wholeStack(s) ? Math.min(s.n, into.filter((x) => !x).length) : Math.min(s.n, roomFor(into, s.item));
}

/** Move so many of what is in a slot of some slots into others. Null when there is nothing of the kind to move, the number is no number of them, or they do not fit. */
function move(out: Array<Stack | null>, slot: number, n: number, into: Array<Stack | null>, full: "packed" | "full"):
  { ok: true; out: Array<Stack | null>; into: Array<Stack | null>; item: ItemId; n: number } | { ok: false; why: "none" | "amount" | "packed" | "full" } {
  const s = Number.isInteger(slot) && slot >= 0 ? out[slot] : null;
  if (!s) return { ok: false, why: "none" };
  if (!Number.isInteger(n) || n <= 0 || n > s.n) return { ok: false, why: "amount" };
  // (as the stack it is, so that what a thing holds goes with it)
  const moved = push(into, [{ ...s, n }]);
  if (!moved) return { ok: false, why: full };
  return { ok: true, out: out.map((b, i) => (i !== slot ? b : s.n === n ? null : { ...s, n: s.n - n })), into: moved, item: s.item, n };
}

/** Put so many of what is in a slot of my bag away in my box, from the tile I stand on. */
export function stow(purse: Purse, box: Box, slot: number, n: number, at: readonly [number, number]): Did<{ purse: Purse; box: Box; item: ItemId; n: number }> {
  if (!nearBox(at)) return not("far");
  const kept = roomyBox(box), did = move(purse.bag, slot, n, kept.things, "packed");
  if (!did.ok) return did.why === "packed" ? not("packed") : no(did.why);
  return { ok: true, purse: { ...purse, bag: did.out }, box: { ...kept, things: did.into }, item: did.item, n: did.n };
}

/** Take so many of what is in a slot of my box out into my bag, from the tile I stand on. */
export function unstow(purse: Purse, box: Box, slot: number, n: number, at: readonly [number, number]): Did<{ purse: Purse; box: Box; item: ItemId; n: number }> {
  if (!nearBox(at)) return not("far");
  const kept = roomyBox(box), did = move(kept.things, slot, n, purse.bag, "full");
  if (!did.ok) return did.why === "packed" ? not("packed") : no(did.why);
  return { ok: true, purse: { ...purse, bag: did.into }, box: { ...kept, things: did.out }, item: did.item, n: did.n };
}
