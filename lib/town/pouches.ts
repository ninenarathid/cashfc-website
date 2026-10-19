import { giftsOf } from "./gifts";
import { learnMinerals } from "./reward-knowledge";
import { CROP_IDS, FISH_IDS, ITEM_IDS, type ItemId } from "./items";
import { ELEMENTS, GEMS, MINED, ORES } from "./tools";
import { ITEMS, gradeIn, held, put, roomFor, take, type Purse, type Stack } from "./trade";

/**
 * Pouches: slots beyond the bag's that hold only some things (the owner, 2026-10-08: a miner's sack and a bundle
 * for firewood, both limited). A pouch is a gift's: whoever has the gift has its slots, and they are in no slot of
 * the bag. What a pouch takes goes into it before the bag; what it does not take never goes in.
 *
 * Kept in the purse by the gift (`pouches`). Only plain things go in (a thing that carries something of its own, a
 * forged tool, a pot with food, is no thing of a pouch's), but for a grade: graded produce keeps its grade in a pouch,
 * one grade to a slot as in the bag (the farm's pouch, 2026-10-16). Pure, and every number a knob.
 */
export interface Pouch {
  /** The gift that gives it. */
  gift: string;
  /** How many slots it has, and which things they hold. */
  slots: number;
  holds: readonly ItemId[];
}
/** What a grade is, in a pouch's slot as in the bag's: normal (0) or one of the three stars. */
type Grade = 0 | 1 | 2 | 3;
/**
 * The farm's (the owner, 2026-10-16: "ช่วยทำให้ เครื่องรางบางชิ้นในสาย ปลูกพืช มี กระเป๋าเก็บของสำหรับสายนี้โดยเฉพาะ สำหรับ
 * เก็บพืช เมล็ด ได้ ให้slot มากกว่าสายอื่นเล็กน้อย"): everything the farm grows, the three helper plants that are wild
 * things too (mint, chamomile, lavender) among them, and every seed.
 */
export const FARM_HOLDS: readonly ItemId[] = [...new Set<ItemId>([...CROP_IDS, ...ITEM_IDS.filter((id) => ITEMS[id].kind === "seed")])];
/** The pouches there are, in the order things are put into them. One line a pouch, each its builder's to add. */
export const POUCHES: readonly Pouch[] = [
  { gift: "thingCreel", slots: 5, holds: FISH_IDS },
  // ── mining ── (the mine's things: stone, ore fragments, gem fragments, big ore and gems)
  { gift: "thingSack", slots: 5, holds: [...MINED, ...ORES.map((o): ItemId => o.ore), ...ELEMENTS.map((e) => GEMS[e].gem),
    "slateLayer", "clayPocket", "quartzCore", "pyriteCluster", "copperNodule", "ironNodule", "silverNodule", "mineralSalt", "wholeGeode"] },
  // ── felling ── (wood: logs and fine timber)
  { gift: "thingBundle", slots: 3, holds: ["log", "timber", "knottedWood", "straightWood", "heartwood", "cedarSliver", "pineBark", "pinePitch", "pineNut", "rootFiber"] },
  // ── farming ── (the spellbound seed pouch's, rank 3: six slots on 2026-10-16; thirty since v283, the owner,
  // 2026-10-19, when members said they had nowhere to keep a crop while its price was low: "กระเป๋าฟาร์ม แก้เป็น 30 ช่องไปเลย")
  { gift: "thingPouch", slots: 30, holds: FARM_HOLDS },
];
export const pouchOf = (gift: string): Pouch | null => POUCHES.find((p) => p.gift === gift) ?? null;

type Kept = Pick<Purse, "gifts" | "pouches">;
/** A pouch's slots as they are kept, made sound: as many as it has, each empty or a plain stack of a thing it holds (with its grade, one of the three stars), never more than stack. */
function slotsOf(purse: Kept, pouch: Pouch): Array<Stack | null> {
  const kept = purse.pouches && typeof purse.pouches === "object" && !Array.isArray(purse.pouches) ? purse.pouches[pouch.gift] : null;
  return Array.from({ length: pouch.slots }, (_, i) => {
    const s = Array.isArray(kept) ? kept[i] : null;
    if (!s || typeof s !== "object" || !pouch.holds.includes(s.item) || !Number.isInteger(s.n) || s.n <= 0) return null;
    const g = gradeIn(s);
    return { item: s.item, n: Math.min(s.n, ITEMS[s.item].stack), ...(g === 1 || g === 2 || g === 3 ? { grade: g } : {}) };
  });
}
/** The pouches somebody has, each with what is in it: those of the gifts they have, in the pouches' order. */
export const pouchesOf = (purse: Kept): Array<{ pouch: Pouch; slots: Array<Stack | null> }> => {
  const had = giftsOf(purse).had as string[];
  return POUCHES.filter((p) => had.includes(p.gift)).map((pouch) => ({ pouch, slots: slotsOf(purse, pouch) }));
};
const kept = <P extends Kept>(purse: P, gift: string, slots: Array<Stack | null>): P => ({ ...purse, pouches: { ...(purse.pouches ?? {}), [gift]: slots } });

/** How many more of a thing (of a grade, normal when not said) somebody has room for: in the pouches that take it, and in the bag. */
export function roomIn(purse: Pick<Purse, "bag" | "gifts" | "pouches">, id: ItemId, grade: Grade = 0): number {
  let room = roomFor(purse.bag, id, grade);
  for (const { pouch, slots } of pouchesOf(purse)) if (pouch.holds.includes(id)) room += roomFor(slots, id, grade);
  return room;
}
/** How many of a thing somebody has (of a grade, or of every grade when not said): in the pouches and in the bag. */
export function heldIn(purse: Pick<Purse, "bag" | "gifts" | "pouches">, id: ItemId, grade?: Grade): number {
  let n = held(purse.bag, id, grade);
  for (const { slots } of pouchesOf(purse)) n += held(slots, id, grade);
  return n;
}
/** A purse with some more of a thing (of a grade, normal when not said): into the pouches that take it first, then the bag. (It must have the room: `roomIn`.) */
export function stow<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, id: ItemId, n: number, grade: Grade = 0): P {
  let out = purse, left = n;
  for (const { pouch, slots } of pouchesOf(purse)) {
    if (left <= 0 || !pouch.holds.includes(id)) continue;
    const add = Math.min(left, roomFor(slots, id, grade));
    if (add > 0) { out = kept(out, pouch.gift, put(slots, id, add, grade)); left -= add; }
  }
  return left > 0 ? { ...out, bag: put(out.bag, id, left, grade) } : out;
}
/**
 * A picking's fruits put away, grade by grade (the farm's harvests: lib/town/farm's pick and the sickle's row,
 * lib/town/gardening's twine): each grade onto the stacks of its own already there first, the pouches' and then the
 * bag's, and only then into empty slots, the pouches' first and then the bag's. So no grade takes an empty slot that
 * another needed while its own stacks had room (Codex, 2026-10-16: five plain tomatoes took the pouch's last slot, and
 * a silver one was refused though the bag's stack of plain ones had room for the five). Null when they do not all fit.
 */
export function stowHarvest<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, id: ItemId, groups: ReadonlyArray<readonly [Grade, number]>): P | null {
  const stack = ITEMS[id].stack, mine = pouchesOf(purse).filter((p) => p.pouch.holds.includes(id));
  const cur = mine.map((p) => p.slots.map((s) => (s ? { ...s } : null))), bag = purse.bag.map((s) => (s ? { ...s } : null)), touched = new Set<number>();
  let bagTouched = false;
  for (const [g, n] of groups) {
    let left = n;
    const onto = (slots: Array<Stack | null>, mark: () => void) => {
      for (const s of slots) if (left > 0 && s && s.item === id && gradeIn(s) === g && s.n < stack) { const add = Math.min(left, stack - s.n); s.n += add; left -= add; mark(); }
    };
    const into = (slots: Array<Stack | null>, mark: () => void) => {
      for (let i = 0; i < slots.length && left > 0; i++) if (!slots[i]) { const add = Math.min(left, stack); slots[i] = g ? { item: id, n: add, grade: g } : { item: id, n: add }; left -= add; mark(); }
    };
    cur.forEach((slots, k) => onto(slots, () => touched.add(k)));
    onto(bag, () => (bagTouched = true));
    cur.forEach((slots, k) => into(slots, () => touched.add(k)));
    into(bag, () => (bagTouched = true));
    if (left > 0) return null;
  }
  let out = purse;
  for (const k of [...touched].sort((a, b) => a - b)) out = kept(out, mine[k].pouch.gift, cur[k]);
  return bagTouched ? { ...out, bag } : out;
}
/** A thing to stow: what, how many, and (graded produce) of what grade. */
export type Stowed = readonly [ItemId, number] | readonly [ItemId, number, Grade];
/** A purse with several things more, each put away as `stow` puts it: null when they do not all fit. */
export function stowAll<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, things: ReadonlyArray<Stowed>): P | null {
  let out = purse;
  for (const [id, n, grade = 0] of things) {
    if (n <= 0) continue;
    if (roomIn(out, id, grade) < n) return null;
    out = stow(out, id, n, grade);
  }
  return learnMinerals(out, things.map(([id, n]) => [id, n] as const));
}
/** A purse with some of a thing taken out (the lowest grade first, as the bag gives it): from the bag first, then the pouches. (It must hold as many: `heldIn`.) */
export function takeOut<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, id: ItemId, n: number): P {
  const inBag = Math.min(n, held(purse.bag, id));
  let out: P = inBag > 0 ? { ...purse, bag: take(purse.bag, id, inBag) } : purse, left = n - inBag;
  for (const { pouch, slots } of pouchesOf(purse)) {
    if (left <= 0) break;
    const less = Math.min(left, held(slots, id));
    if (less > 0) { out = kept(out, pouch.gift, take(slots, id, less)); left -= less; }
  }
  return out;
}
/**
 * The same the other way about: from the pouches first, then the bag. What a seed sown is taken from (the owner,
 * 2026-10-16: the farm's pouch keeps seeds, and they are sown from it), so that the seed in the hand, which is the
 * bag's, is the last to go. (It must hold as many: `heldIn`.)
 */
export function useUp<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, id: ItemId, n: number): P {
  let out = purse, left = n;
  for (const { pouch, slots } of pouchesOf(purse)) {
    if (left <= 0) break;
    const less = Math.min(left, held(slots, id));
    if (less > 0) { out = kept(out, pouch.gift, take(slots, id, less)); left -= less; }
  }
  return left > 0 ? { ...out, bag: take(out.bag, id, left) } : out;
}
export type PouchRefusal = "none" | "full";
/** Move what is in a pouch's slot into the bag, with its grade: as much of it as the bag has room for. */
export function pouchToBag<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, gift: string, slot: number): { ok: true; purse: P; n: number } | { ok: false; why: PouchRefusal } {
  const mine = pouchesOf(purse).find((p) => p.pouch.gift === gift), s = mine?.slots[slot];
  if (!mine || !s) return { ok: false, why: "none" };
  const g = gradeIn(s) as Grade, n = Math.min(s.n, roomFor(purse.bag, s.item, g));
  if (n <= 0) return { ok: false, why: "full" };
  const slots = mine.slots.map((x, i) => (i !== slot ? x : s.n > n ? { ...s, n: s.n - n } : null));
  return { ok: true, n, purse: { ...kept(purse, gift, slots), bag: put(purse.bag, s.item, n, g) } };
}
/** Move what is in a slot of the bag into a pouch that takes it, with its grade: as much of it as the pouches have room for. Only a plain thing (graded produce is one). */
export function bagToPouch<P extends Pick<Purse, "bag" | "gifts" | "pouches">>(purse: P, slot: number): { ok: true; purse: P; n: number } | { ok: false; why: PouchRefusal } {
  const s = purse.bag[slot];
  if (!s || s.of || s.water !== undefined || (s.plus ?? 0) > 0 || s.opts?.length || s.gems?.length) return { ok: false, why: "none" };
  const g = gradeIn(s) as Grade;
  let out = purse, left = s.n;
  for (const { pouch } of pouchesOf(purse)) {
    if (left <= 0 || !pouch.holds.includes(s.item)) continue;
    const slots = slotsOf(out, pouch), add = Math.min(left, roomFor(slots, s.item, g));
    if (add > 0) { out = kept(out, pouch.gift, put(slots, s.item, add, g)); left -= add; }
  }
  if (left === s.n) return { ok: false, why: pouchesOf(purse).some((p) => p.pouch.holds.includes(s.item)) ? "full" : "none" };
  return { ok: true, n: s.n - left, purse: { ...out, bag: out.bag.map((x, i) => (i !== slot ? x : left > 0 ? { ...s, n: left } : null)) } };
}
