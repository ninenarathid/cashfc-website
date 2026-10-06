import { ITEMS, type ItemId } from "./items";
import { NOTICES, plain, takePlain } from "./notices";
import { put, roomFor, type Purse, type Refusal } from "./trade";

/**
 * A stall of one's own, under a sign held up (lib/town/sign; the owner,
 * 2026-10-06: "สามารถตั้งรับซื้อของ หรือ ขายของโดยไม่ผ่าน ลุงขายของ (ไม่โดนภาษี) แต่ผู้เล่น
 * ต้อง online ค้างไว้เท่านั้น", and "ร้านเดียวทั้งขายและรับซื้อพร้อมกัน น่าสนทำเลย").
 *
 * - **A stall is a few lines**, each a thing at a price: so many **to sell**
 *   out of my bag, or so many **wanted**, paid for out of my purse. One stall
 *   may have both kinds.
 * - **Nothing is set aside.** The things stay in the bag and the coins in the
 *   purse; each sale is looked at as it is made (the things are still there,
 *   the coins are, the bag has room), and things and coins change hands at
 *   once. So a stall that is gone leaves nothing behind to be given back.
 * - **Nothing is kept back**: no tenth, as the notice board keeps (his word).
 *   What it costs is being there: the stall is open only while its keeper is
 *   in town and has not walked off. Whoever keeps the game hears from the
 *   keeper's page every so often (`beat`); a stall not heard from for a while
 *   is shut.
 * - **Whoever buys or brings stands by the stall.**
 * - **Only what the village has met can be wanted**, as on the notice board
 *   (the owner, of the board: "การรับซื้อห้าม show ไอเทม ที่ยังไม่มีคนพบเด็ดขาด").
 * - **A price has a most**: so many times what the relatives usually pay for
 *   the thing (the notice board's own number), and so many coins for a thing
 *   they do not take. **What the uncle sells may be asked more for than he
 *   asks** (the owner, 2026-10-06: "ช่วยทำให้ตั้งราคาแพงกว่าร้านขายของลุงได้"): his
 *   shelf is small and so many a person a round, so whoever has some to
 *   spare, or is there when he has none, names their own price. (The notice
 *   board has the same most, from the same day: lib/town/notices' capOf.)
 * - Only plain things are sold (not a pot with food in it, nor a can with
 *   water).
 *
 * Every number is a knob the database keeps. Pure: the browser's trial and the
 * database are two keepers of the same rules.
 */
export const SHOP = {
  /** How many lines a stall may have. */
  lines: 6,
  /** How near the stall somebody stands to buy from it or bring to it, in tiles. */
  reach: 3,
  /** The most of a thing on one line. */
  most: 200,
  /** A stall not heard from for this long is shut, in seconds; and how often its keeper's page says it is still there. */
  quiet: 150,
  every: 50,
  /** The most a price is: so many times what the relatives usually pay, and for a thing they do not take, so many coins (the notice board's own two numbers; what the uncle asks is no part of it). */
  cap: NOTICES.cap,
  capless: NOTICES.capless,
};
export type ShopKnobs = typeof SHOP;

/** Why a stall did not do a thing, besides the trade's own reasons. */
export type ShopRefusal = Refusal
  | "lines"   // no line, too many, or a thing named twice
  | "dear"    // a price above the most the thing may be asked or offered for
  | "own"     // my own stall: nothing to buy from myself
  | "far"     // not standing by the stall
  | "shut"    // the stall is not open (its keeper walked off, or is gone)
  | "short"   // the stall's keeper has not the coins for it
  | "packed"; // the stall's keeper has no room in their bag for it

/** A line of a stall: so many of a thing to sell, or wanted, at a price each; `left` is how many are still to go. */
export interface ShopLine { kind: "sell" | "buy"; item: ItemId; n: number; left: number; price: number }
/** A stall: whose, the tile it stands on, its lines, since when, when its keeper's page was last heard from, and the coins it has taken and paid. */
export interface Shop { by: string; at: [number, number]; lines: ShopLine[]; since: number; beat: number; took: number; paid: number }
/** What somebody asks to put on their stall. */
export type ShopAsk = Array<{ kind: "sell" | "buy"; item: ItemId; n: number; price: number }>;

type Did<T> = ({ ok: true } & T) | { ok: false; why: ShopRefusal };
const no = (why: ShopRefusal): { ok: false; why: ShopRefusal } => ({ ok: false, why });
const whole = (n: number) => Number.isInteger(n) && n > 0;

/** The most a thing may be asked or offered for at a stall: by what the relatives pay for it, whether the uncle sells it or not. */
export const capOf = (item: ItemId, k: ShopKnobs = SHOP) => (ITEMS[item].pays > 0 ? ITEMS[item].pays * k.cap : k.capless);
/** Whether a stall is open: its keeper's page has been heard from lately. */
export const alive = (shop: Shop, now: number, k: ShopKnobs = SHOP) => now - shop.beat < k.quiet * 1000;
/** Whether somebody on a tile stands by a stall. */
export const near = (shop: Shop, at: readonly [number, number], k: ShopKnobs = SHOP) => Math.max(Math.abs(at[0] - shop.at[0]), Math.abs(at[1] - shop.at[1])) <= k.reach;
/** How many of a line can change hands this moment: no more than are left on it, than its keeper holds (or can pay for, and has room for). */
export function canOf(line: ShopLine, keeper: Purse): number {
  if (line.kind === "sell") return Math.max(0, Math.min(line.left, plain(keeper.bag, line.item)));
  return Math.max(0, Math.min(line.left, Math.floor(keeper.coins / line.price), roomFor(keeper.bag, line.item)));
}

/**
 * Open a stall where I stand. Every thing to sell is in my bag now, as plain things; every thing wanted is one the
 * village has met (`seen`), and my purse has the coins for all that is wanted. Nothing leaves the bag or the purse.
 */
export function open(purse: Purse, me: string, ask: ShopAsk, at: readonly [number, number], now: number, seen: readonly ItemId[], k: ShopKnobs = SHOP): Did<{ shop: Shop }> {
  if (!Array.isArray(ask) || ask.length < 1 || ask.length > k.lines) return no("lines");
  if (new Set(ask.map((l) => l.item)).size !== ask.length) return no("lines");
  if (!Number.isInteger(at[0]) || !Number.isInteger(at[1])) return no("none");
  let owed = 0;
  for (const l of ask) {
    if (!(l.item in ITEMS) || (l.kind !== "sell" && l.kind !== "buy")) return no("none");
    if (!whole(l.n) || !whole(l.price) || l.n > k.most) return no("amount");
    if (l.price > capOf(l.item, k)) return no("dear");
    if (l.kind === "sell" && plain(purse.bag, l.item) < l.n) return no("none");
    if (l.kind === "buy" && !seen.includes(l.item)) return no("none");
    if (l.kind === "buy") owed += l.n * l.price;
  }
  if (owed > purse.coins) return no("coins");
  return { ok: true, shop: { by: me, at: [at[0], at[1]], lines: ask.map((l) => ({ kind: l.kind, item: l.item, n: l.n, left: l.n, price: l.price })), since: now, beat: now, took: 0, paid: 0 } };
}

/** The stall's keeper's page says it is still there. */
export const beat = (shop: Shop, now: number): Shop => ({ ...shop, beat: now });

function lineFor(shop: Shop | null | undefined, kind: ShopLine["kind"], me: string, item: ItemId, n: number, at: readonly [number, number], now: number, k: ShopKnobs): Did<{ shop: Shop; line: ShopLine }> {
  if (!whole(n)) return no("amount");
  if (!shop || !alive(shop, now, k)) return no("shut");
  if (shop.by === me) return no("own");
  if (!near(shop, at, k)) return no("far");
  const line = shop.lines.find((l) => l.kind === kind && l.item === item);
  if (!line || line.left < n) return no("gone");
  return { ok: true, shop, line };
}
const spent = (shop: Shop, line: ShopLine, n: number, coins: number): Shop =>
  ({ ...shop, took: shop.took + (line.kind === "sell" ? coins : 0), paid: shop.paid + (line.kind === "buy" ? coins : 0), lines: shop.lines.map((l) => (l === line ? { ...l, left: l.left - n } : l)) });

/**
 * Buy some of what a stall sells: the things leave its keeper's bag for mine, and my coins go to their purse, all of
 * them. Refused, with nothing changed, when the stall is shut, I stand too far, the line has not so many left or its
 * keeper no longer holds them, I have not the coins, or my bag has no room.
 */
export function buy(mine: Purse, theirs: Purse, kept: Shop | null | undefined, me: string, item: ItemId, n: number, at: readonly [number, number], now: number, k: ShopKnobs = SHOP): Did<{ mine: Purse; theirs: Purse; shop: Shop; coins: number }> {
  const found = lineFor(kept, "sell", me, item, n, at, now, k);
  if (!found.ok) return found;
  const { shop, line } = found, coins = n * line.price;
  if (plain(theirs.bag, item) < n) return no("gone");
  if (mine.coins < coins) return no("coins");
  if (roomFor(mine.bag, item) < n) return no("full");
  return {
    ok: true, coins, shop: spent(shop, line, n, coins),
    mine: { ...mine, coins: mine.coins - coins, bag: put(mine.bag, item, n) },
    theirs: { ...theirs, coins: theirs.coins + coins, bag: takePlain(theirs.bag, item, n) },
  };
}

/**
 * Bring some of what a stall wants: the things leave my bag for its keeper's, and their coins come to my purse, all
 * of them. Refused, with nothing changed, when the stall is shut, I stand too far, the line wants no more, I do not
 * hold so many plain ones, its keeper has not the coins, or their bag has no room.
 */
export function sell(mine: Purse, theirs: Purse, kept: Shop | null | undefined, me: string, item: ItemId, n: number, at: readonly [number, number], now: number, k: ShopKnobs = SHOP): Did<{ mine: Purse; theirs: Purse; shop: Shop; coins: number }> {
  const found = lineFor(kept, "buy", me, item, n, at, now, k);
  if (!found.ok) return found;
  const { shop, line } = found, coins = n * line.price;
  if (plain(mine.bag, item) < n) return no("none");
  if (theirs.coins < coins) return no("short");
  if (roomFor(theirs.bag, item) < n) return no("packed");
  return {
    ok: true, coins, shop: spent(shop, line, n, coins),
    mine: { ...mine, coins: mine.coins + coins, bag: takePlain(mine.bag, item, n) },
    theirs: { ...theirs, coins: theirs.coins - coins, bag: put(theirs.bag, item, n) },
  };
}

/** A line as whoever comes to a stall is told it: `can` is how many can change hands this moment. */
export interface ShopLineTold { kind: "sell" | "buy"; item: ItemId; price: number; can: number }
/** Somebody's stall, as whoever comes to it is told: whose, where, and the lines that have anything to them now. */
export interface ShopTold { by: string; at: [number, number]; lines: ShopLineTold[] }
/** My own stall as I am told it: every line with how many are left, and the coins it has taken and paid since it opened. */
export interface ShopMine { at: [number, number]; lines: ShopLine[]; since: number; took: number; paid: number }
/**
 * What a member is told of stalls: mine, when I have one open (null when I have none); the things that may be
 * wanted; and the rules' numbers, for the page to hold a form to before it asks.
 */
export interface ShopsTold { mine: ShopMine | null; seen: ItemId[]; lines: number; reach: number; most: number; cap: number; capless: number; every: number }

/** Somebody's stall as a comer is told it; null when it is not open. */
export function toldOf(shop: Shop | null | undefined, keeper: Purse, now: number, k: ShopKnobs = SHOP): ShopTold | null {
  if (!shop || !alive(shop, now, k)) return null;
  return { by: shop.by, at: shop.at, lines: shop.lines.map((l) => ({ kind: l.kind, item: l.item, price: l.price, can: canOf(l, keeper) })).filter((l) => l.can > 0) };
}
/** What I am told of stalls. */
export function told(mine: Shop | null | undefined, now: number, seen: readonly ItemId[], k: ShopKnobs = SHOP): ShopsTold {
  const open = mine && alive(mine, now, k) ? { at: mine.at, lines: mine.lines, since: mine.since, took: mine.took, paid: mine.paid } : null;
  return { mine: open, seen: [...seen], lines: k.lines, reach: k.reach, most: k.most, cap: k.cap, capless: k.capless, every: k.every };
}
