import { ITEMS, type ItemId } from "./items";
import { held, no, put, roomFor, type Done, type Purse, type Stack } from "./trade";

/**
 * Trading between two members, as rules (the owner, 2026-10-03: "ช่วยทำระบบ เทรด
 * แลกเปลี่ยน item สำหรับผู้เล่นด้วยกันเองด้วย"; "ไม่งั้นคนที่เน้นเล่นทำอาหาร จะไม่มีของจากสายอื่น
 * และทำอาหารไม่ได้").
 *
 * Two who stand near each other open a deal. Each lays out things from their
 * own bag; either may change their side, which takes back both their words;
 * when both have given their word, everything changes hands at once, or
 * nothing does (a bag with no room refuses the lot). Giving for nothing is a
 * deal like any other: the other side is simply empty.
 *
 * **Coins too** (the owner, 2026-10-03: "อย่าลืมทำระบบเทรด item หรือ popoto coin ให้ด้วย"):
 * each side may lay Popoto coins beside its things, so that a thing can be
 * bought and sold between two, not only swapped. Coins come from popoto, so
 * many a week for each person, and handing them on is a way round that for
 * anybody who would feed one purse from several: every deal that is done has
 * to be written down by whoever keeps it (the database's function, when there
 * is one), so that it can be seen. A thing that holds something (a pot of
 * food, a can with water in it) changes hands as it is.
 *
 * Pure: the keeping of a deal while it is open is somebody else's (the
 * browser's trial for now; the database's function when there is one, which
 * must do the swap itself, in one go, from what it holds of both bags).
 */
export const DEAL = {
  /** How many kinds of thing one side may lay out. */
  kinds: 8,
  /** How near two have to stand to open one, in tiles. */
  near: 3,
};

/** What one side lays out: so many of each thing. */
export type Give = Array<[ItemId, number]>;
export interface Deal {
  /** Who opened it, and with whom; and what each is called. */
  a: string; b: string; names: { a: string; b: string };
  give: { a: Give; b: Give };
  /** The Popoto coins each lays beside their things. */
  coins: { a: number; b: number };
  /** Each one's word. */
  ok: { a: boolean; b: boolean };
  at: number;
}
export const newDeal = (a: string, b: string, names: Deal["names"], at: number): Deal =>
  ({ a, b, names, give: { a: [], b: [] }, coins: { a: 0, b: 0 }, ok: { a: false, b: false }, at });
/** Which side of a deal somebody is, or null when they are neither. */
export const sideOf = (deal: Deal, me: string): "a" | "b" | null => (deal.a === me ? "a" : deal.b === me ? "b" : null);

/** A side, tidied: each kind once, whole numbers above nothing. */
export function tidyGive(give: Give): Give {
  const all = new Map<ItemId, number>();
  for (const [id, n] of give) if (id in ITEMS && Number.isInteger(n) && n > 0) all.set(id, (all.get(id) ?? 0) + n);
  return [...all];
}
/** Whether a bag has everything a side lays out. */
export const hasAll = (purse: Purse, give: Give) => tidyGive(give).every(([id, n]) => held(purse.bag, id) >= n);

/** Change one side of a deal, its things and its coins: both words are taken back. */
export function lay(deal: Deal, me: string, purse: Purse, give: Give, coins = 0): Done<{ deal: Deal }> {
  const side = sideOf(deal, me), mine = tidyGive(give);
  if (!side) return no("none");
  if (mine.length > DEAL.kinds || !Number.isInteger(coins) || coins < 0) return no("amount");
  if (!hasAll(purse, mine)) return no("none");
  if (coins > purse.coins) return no("coins");
  return { ok: true, deal: { ...deal, give: { ...deal.give, [side]: mine }, coins: { ...deal.coins, [side]: coins }, ok: { a: false, b: false } } };
}
/** Give one's word, or take it back. */
export function agree(deal: Deal, me: string, word = true): Done<{ deal: Deal }> {
  const side = sideOf(deal, me);
  if (!side) return no("none");
  return { ok: true, deal: { ...deal, ok: { ...deal.ok, [side]: word } } };
}

/** Take some things out of a bag, as the stacks they are (so that what a thing holds goes with it): from its last stacks first. */
export function pull(bag: Purse["bag"], give: Give): { bag: Purse["bag"]; stacks: Stack[] } {
  const out = bag.map((s) => (s ? { ...s } : null)), stacks: Stack[] = [];
  for (const [id, want] of give) {
    let n = want;
    for (let i = out.length - 1; i >= 0 && n > 0; i--) {
      const s = out[i];
      if (s?.item !== id) continue;
      const less = Math.min(n, s.n);
      n -= less;
      stacks.push({ ...s, n: less });
      out[i] = s.n === less ? null : { ...s, n: s.n - less };
    }
  }
  return { bag: out, stacks };
}
/** Put stacks into a bag: one that holds something into a slot of its own, as it is; the rest onto their own kind. Null when they do not fit. */
export function push(bag: Purse["bag"], stacks: Stack[]): Purse["bag"] | null {
  let out = bag.map((s) => (s ? { ...s } : null));
  for (const s of stacks) {
    if (s.of || s.water !== undefined) {
      const slot = out.findIndex((b) => !b);
      if (slot < 0) return null;
      out[slot] = { ...s };
    } else {
      if (roomFor(out, s.item) < s.n) return null;
      out = put(out, s.item, s.n);
    }
  }
  return out;
}

/**
 * Do the deal: what each laid out leaves their bag and goes into the other's,
 * and so do the coins. Refused, with nothing changed, when either has not
 * given their word, no longer has what they laid out, or has no room for what
 * is coming.
 */
export function swap(deal: Deal, a: Purse, b: Purse): Done<{ a: Purse; b: Purse }> {
  if (!deal.ok.a || !deal.ok.b) return no("none");
  if (!hasAll(a, deal.give.a) || !hasAll(b, deal.give.b)) return no("none");
  const pay = { a: deal.coins?.a ?? 0, b: deal.coins?.b ?? 0 };
  if (a.coins < pay.a || b.coins < pay.b) return no("coins");
  const fromA = pull(a.bag, tidyGive(deal.give.a)), fromB = pull(b.bag, tidyGive(deal.give.b));
  const bagA = push(fromA.bag, fromB.stacks), bagB = push(fromB.bag, fromA.stacks);
  if (!bagA || !bagB) return no("full");
  return { ok: true, a: { ...a, bag: bagA, coins: a.coins - pay.a + pay.b }, b: { ...b, bag: bagB, coins: b.coins - pay.b + pay.a } };
}
