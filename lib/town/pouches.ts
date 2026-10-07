import { giftsOf } from "./gifts";
import type { ItemId } from "./items";
import { ELEMENTS, GEMS, MINED, ORES } from "./tools";
import { ITEMS, put, roomFor, take, type Purse, type Stack } from "./trade";

/**
 * Pouches: slots beyond the bag's that hold only some things (the owner, 2026-10-08: a miner's sack and a bundle
 * for firewood, both limited). A pouch is a gift's: whoever has the gift has its slots, and they are in no slot of
 * the bag. What a pouch takes goes into it before the bag; what it does not take never goes in.
 *
 * Kept in the purse by the gift (`pouches`). Only plain things go in (a thing that carries something of its own, a
 * forged tool, a pot with food, is no thing of a pouch's). Pure, and every number a knob.
 */
export interface Pouch {
  /** The gift that gives it. */
  gift: string;
  /** How many slots it has, and which things they hold. */
  slots: number;
  holds: readonly ItemId[];
}
/** The pouches there are, in the order things are put into them. One line a pouch, each its builder's to add. */
export const POUCHES: readonly Pouch[] = [
  // ── mining ── (the mine's things: stone, ore fragments, gem fragments, big ore and gems)
  { gift: "thingSack", slots: 5, holds: [...MINED, ...ORES.map((o): ItemId => o.ore), ...ELEMENTS.map((e) => GEMS[e].gem)] },
];
export const pouchOf = (gift: string): Pouch | null => POUCHES.find((p) => p.gift === gift) ?? null;

type Kept = Pick<Purse, "gifts" | "pouches">;
/** A pouch's slots as they are kept, made sound: as many as it has, each empty or a plain stack of a thing it holds, never more than stack. */
function slotsOf(purse: Kept, pouch: Pouch): Array<Stack | null> {
  const kept = purse.pouches && typeof purse.pouches === "object" && !Array.isArray(purse.pouches) ? purse.pouches[pouch.gift] : null;
  return Array.from({ length: pouch.slots }, (_, i) => {
    const s = Array.isArray(kept) ? kept[i] : null;
    if (!s || typeof s !== "object" || !pouch.holds.includes(s.item) || !Number.isInteger(s.n) || s.n <= 0) return null;
    return { item: s.item, n: Math.min(s.n, ITEMS[s.item].stack) };
  });
}
/** The pouches somebody has, each with what is in it: those of the gifts they have, in the pouches' order. */
export const pouchesOf = (purse: Kept): Array<{ pouch: Pouch; slots: Array<Stack | null> }> => {
  const had = giftsOf(purse).had as string[];
  return POUCHES.filter((p) => had.includes(p.gift)).map((pouch) => ({ pouch, slots: slotsOf(purse, pouch) }));
};
const kept = <P extends Kept>(purse: P, gift: string, slots: Array<Stack | null>): P => ({ ...purse, pouches: { ...(purse.pouches ?? {}), [gift]: slots } });

/** How many more of a thing somebody has room for: in the pouches that take it, and in the bag. */
export function roomIn(purse: Pick<Purse, "bag" | "gifts" | "pouches">, id: ItemId): number {
  let room = roomFor(purse.bag, id);
  for (const { pouch, slots } of pouchesOf(purse)) if (pouch.holds.includes(id)) room += roomFor(slots, id);
  return room;
}
/** How many of a thing somebody has: in the pouches and in the bag. */
export function heldIn(purse: Pick<Purse, "bag" | "gifts" | "pouches">, id: ItemId): number {
  let n = purse.bag.reduce((t, s) => t + (s?.item === id ? s.n : 0), 0);
  for (const { slots } of pouchesOf(purse)) n += slots.reduce((t, s) => t + (s?.item === id ? s.n : 0), 0);
  return n;
}
/** A purse with some more of a thing: into the pouches that take it first, then the bag. (It must have the room: `roomIn`.) */
export function stow<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, id: ItemId, n: number): P {
  let out = purse, left = n;
  for (const { pouch, slots } of pouchesOf(purse)) {
    if (left <= 0 || !pouch.holds.includes(id)) continue;
    const add = Math.min(left, roomFor(slots, id));
    if (add > 0) { out = kept(out, pouch.gift, put(slots, id, add)); left -= add; }
  }
  return left > 0 ? { ...out, bag: put(out.bag, id, left) } : out;
}
/** A purse with several things more, each put away as `stow` puts it: null when they do not all fit. */
export function stowAll<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, things: ReadonlyArray<readonly [ItemId, number]>): P | null {
  let out = purse;
  for (const [id, n] of things) {
    if (n <= 0) continue;
    if (roomIn(out, id) < n) return null;
    out = stow(out, id, n);
  }
  return out;
}
/** A purse with some of a thing taken out: from the bag first, then the pouches. (It must hold as many: `heldIn`.) */
export function takeOut<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, id: ItemId, n: number): P {
  const inBag = Math.min(n, purse.bag.reduce((t, s) => t + (s?.item === id ? s.n : 0), 0));
  let out: P = inBag > 0 ? { ...purse, bag: take(purse.bag, id, inBag) } : purse, left = n - inBag;
  for (const { pouch, slots } of pouchesOf(purse)) {
    if (left <= 0) break;
    const less = Math.min(left, slots.reduce((t, s) => t + (s?.item === id ? s.n : 0), 0));
    if (less > 0) { out = kept(out, pouch.gift, take(slots, id, less)); left -= less; }
  }
  return out;
}
export type PouchRefusal = "none" | "full";
/** Move what is in a pouch's slot into the bag: as much of it as the bag has room for. */
export function pouchToBag<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, gift: string, slot: number): { ok: true; purse: P; n: number } | { ok: false; why: PouchRefusal } {
  const mine = pouchesOf(purse).find((p) => p.pouch.gift === gift), s = mine?.slots[slot];
  if (!mine || !s) return { ok: false, why: "none" };
  const n = Math.min(s.n, roomFor(purse.bag, s.item));
  if (n <= 0) return { ok: false, why: "full" };
  const slots = mine.slots.map((x, i) => (i !== slot ? x : s.n > n ? { item: s.item, n: s.n - n } : null));
  return { ok: true, n, purse: { ...kept(purse, gift, slots), bag: put(purse.bag, s.item, n) } };
}
/** Move what is in a slot of the bag into a pouch that takes it: as much of it as the pouches have room for. Only a plain thing. */
export function bagToPouch<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, slot: number): { ok: true; purse: P; n: number } | { ok: false; why: PouchRefusal } {
  const s = purse.bag[slot];
  if (!s || s.of || s.water !== undefined || (s.plus ?? 0) > 0 || s.opts?.length || s.gems?.length) return { ok: false, why: "none" };
  let out = purse, left = s.n;
  for (const { pouch } of pouchesOf(purse)) {
    if (left <= 0 || !pouch.holds.includes(s.item)) continue;
    const slots = slotsOf(out, pouch), add = Math.min(left, roomFor(slots, s.item));
    if (add > 0) { out = kept(out, pouch.gift, put(slots, s.item, add)); left -= add; }
  }
  if (left === s.n) return { ok: false, why: pouchesOf(purse).some((p) => p.pouch.holds.includes(s.item)) ? "full" : "none" };
  return { ok: true, n: s.n - left, purse: { ...out, bag: out.bag.map((x, i) => (i !== slot ? x : left > 0 ? { ...s, n: left } : null)) } };
}
