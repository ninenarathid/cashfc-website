import { ITEMS, type ItemId } from "./items";
import { dayOf } from "./stamina";
import { HOUR, no as refuse, plainStack, put, roomFor, type Purse, type Refusal } from "./trade";

/**
 * The notice board beside the uncle's stall, where members sell to one another
 * (not the Popoto Board in the middle of town, lib/town/board: that one is the
 * building work and its vote). The owner, 2026-10-05: "กระดานฝากขายระหว่างสมาชิก
 * ทำได้เลย"; its numbers: "3 ช่อง หัก 10% ประกาศ 3 วัน ใช้ได้"; and both ways at
 * once: "ทั้ง ซื้อ ขาย เลย แต่ การรับซื้อห้าม show ไอเทม ที่ยังไม่มีคนพบเด็ดขาด".
 *
 * - **A notice to sell** takes the things out of the bag and pins them up at a
 *   price each. Anybody else buys some or all, and has them at once.
 * - **A notice of something wanted** puts the coins down, so many of a thing at
 *   a price each. Anybody who holds the thing brings some or all; what is
 *   brought waits on the board for whoever wanted it. **Only a thing somebody
 *   has found can be wanted** (`seen`: what has been in anybody's bag, and what
 *   the uncle's shelf shows): a notice must never name a thing nobody has met.
 * - **Whoever sells is owed nine tenths.** What a member's things fetch, either
 *   way, waits at the board, and a tenth of it is nobody's: the coins leave the
 *   game. It is counted to the hundredth of a coin and paid in whole coins, the
 *   rest waiting with it, so that selling one by one loses nobody anything.
 * - **Three notices a member** at once, three days each. More places can be
 *   bought, each for twice the one before. A notice past its days is off the
 *   board, and its things (or its coins) wait for its writer to take it down.
 * - **A price has a most**: so many times what the relatives usually pay, and
 *   so many coins for a thing they do not take. What the uncle sells was held
 *   to his own price at first; **it may be asked more for than he asks** now,
 *   here as at a stall (the owner, 2026-10-06, of the stall: "ช่วยทำให้ตั้งราคา
 *   แพงกว่าร้านขายของลุงได้", and of the board: "กระดานฝากขาย เอาเหมือนกัน").
 * - A thing that holds something (a pot with food in it, a can with water) is
 *   not put up: only the plain thing.
 *
 * Every number is a knob the database keeps. Pure: nothing here reads a clock
 * or keeps anything; the browser's trial and the database are two keepers of
 * the same rules, as with the rest of the trade.
 */
export const NOTICES = {
  /** Notices a member may have up at once; how many more places can be bought; and what the first costs (each after, twice the one before). */
  slots: 3,
  more: 5,
  slotPrice: 100,
  /** What the board keeps of what a thing is sold for, in hundredths. */
  fee: 10,
  /** How long a notice stays up, in hours. */
  hours: 72,
  /** The most a price is: so many times what the relatives usually pay for the thing; for a thing they do not take, so many coins. */
  cap: 10,
  capless: 500,
  /** The most of a thing on one notice. */
  most: 200,
  /** How many notices are told at once, the newest first; and how many days of what was sold. */
  shown: 120,
  days: 7,
};
export type NoticeKnobs = typeof NOTICES;

/** Why the board did not do a thing, besides the trade's own reasons. */
export type NoticeRefusal = Refusal
  | "slots"   // every place I have on the board is taken (or no more can be bought)
  | "dear"    // a price above the most the thing may be asked or offered for
  | "own";    // my own notice: nothing to buy from myself, or to bring myself

/** A notice on the board. `left`: how many are still to be bought, or still wanted. `held`: of a wanted notice, how many have been brought and wait for its writer. */
export interface Notice { id: number; by: string; kind: "sell" | "want"; item: ItemId; n: number; left: number; price: number; held: number; at: number; until: number }
/** Something sold over the board, either way. */
export interface Sale { at: number; item: ItemId; n: number; price: number }
/** The board, as the village keeps it: its notices, what each member is owed (in hundredths of a coin), how many more places each has bought, and what has been sold. */
export interface Pinboard { next: number; notices: Notice[]; due: Record<string, number>; more: Record<string, number>; sales: Sale[] }
export const newPinboard = (): Pinboard => ({ next: 1, notices: [], due: {}, more: {}, sales: [] });

type Did<T> = ({ ok: true } & T) | { ok: false; why: NoticeRefusal };
const no = (why: NoticeRefusal) => refuse(why as Refusal) as { ok: false; why: NoticeRefusal };
const whole = (n: number) => Number.isInteger(n) && n > 0;

/** The most a thing may be asked or offered for: by what the relatives pay for it, whether the uncle sells it or not (the same as at a stall: lib/town/shop). */
export function capOf(item: ItemId, k: NoticeKnobs = NOTICES): number {
  const pays = ITEMS[item].pays;
  return pays > 0 ? pays * k.cap : k.capless;
}
/** How many of a thing are in a bag as plain things: a stack that holds something is not counted. */
export const plain = (bag: Purse["bag"], id: ItemId) => bag.reduce((t, s) => t + (s && s.item === id && plainStack(s) ? s.n : 0), 0);
/** A bag with so many plain ones of a thing out of it, from its last stacks first. (It must hold as many.) */
export function takePlain(bag: Purse["bag"], id: ItemId, n: number): Purse["bag"] {
  const out = bag.map((s) => (s ? { ...s } : null));
  for (let i = out.length - 1; i >= 0 && n > 0; i--) {
    const s = out[i];
    if (!s || s.item !== id || !plainStack(s)) continue;
    const less = Math.min(n, s.n);
    n -= less;
    out[i] = s.n === less ? null : { ...s, n: s.n - less };
  }
  return out;
}
/** How many places a member has on the board, and how many of them are taken. A notice takes its place until it is gone from the board: sold out, or taken down. */
export const slotsOf = (board: Pinboard, who: string, k: NoticeKnobs = NOTICES) => k.slots + Math.min(k.more, board.more[who] ?? 0);
export const upOf = (board: Pinboard, who: string) => board.notices.filter((n) => n.by === who).length;
/** What one more place costs somebody; null when no more can be bought. */
export function nextSlot(board: Pinboard, who: string, k: NoticeKnobs = NOTICES): number | null {
  const has = board.more[who] ?? 0;
  return has >= k.more ? null : k.slotPrice * 2 ** has;
}
/** Whether a notice can still be bought from, or brought to. */
export const live = (n: Notice, now: number) => now < n.until && n.left > 0;
const owed = (board: Pinboard, who: string, coins: number, k: NoticeKnobs): Pinboard["due"] => ({ ...board.due, [who]: (board.due[who] ?? 0) + coins * (100 - k.fee) });

/**
 * Pin a notice up. To sell: so many plain ones of a thing leave my bag. Wanted: the coins for all of them leave my
 * purse, and the thing must be one somebody has found (`seen`).
 */
export function post(purse: Purse, board: Pinboard, me: string, kind: "sell" | "want", item: ItemId, n: number, price: number, now: number, seen: readonly ItemId[], k: NoticeKnobs = NOTICES): Did<{ purse: Purse; board: Pinboard; id: number }> {
  if (!(item in ITEMS) || (kind !== "sell" && kind !== "want")) return no("none");
  if (!whole(n) || !whole(price) || n > k.most) return no("amount");
  if (kind === "want" && !seen.includes(item)) return no("none");
  if (kind === "sell" && plain(purse.bag, item) < n) return no("none");
  if (price > capOf(item, k)) return no("dear");
  if (kind === "want" && purse.coins < n * price) return no("coins");
  if (upOf(board, me) >= slotsOf(board, me, k)) return no("slots");
  const notice: Notice = { id: board.next, by: me, kind, item, n, left: n, price, held: 0, at: now, until: now + k.hours * HOUR };
  return {
    ok: true, id: notice.id,
    purse: kind === "sell" ? { ...purse, bag: takePlain(purse.bag, item, n) } : { ...purse, coins: purse.coins - n * price },
    board: { ...board, next: board.next + 1, notices: [...board.notices, notice] },
  };
}

/** Buy some of what a notice sells: the things are mine at once, and nine tenths of the coins wait at the board for its writer. */
export function buy(purse: Purse, board: Pinboard, me: string, id: number, n: number, now: number, k: NoticeKnobs = NOTICES): Did<{ purse: Purse; board: Pinboard; item: ItemId; coins: number }> {
  if (!whole(n)) return no("amount");
  const notice = board.notices.find((x) => x.id === id);
  if (!notice || notice.kind !== "sell" || !live(notice, now) || notice.left < n) return no("gone");
  if (notice.by === me) return no("own");
  const coins = n * notice.price;
  if (purse.coins < coins) return no("coins");
  if (roomFor(purse.bag, notice.item) < n) return no("full");
  return {
    ok: true, item: notice.item, coins,
    purse: { ...purse, coins: purse.coins - coins, bag: put(purse.bag, notice.item, n) },
    board: {
      ...board, due: owed(board, notice.by, coins, k), sales: [...board.sales, { at: now, item: notice.item, n, price: notice.price }],
      notices: board.notices.flatMap((x) => (x !== notice ? [x] : x.left === n ? [] : [{ ...x, left: x.left - n }])),
    },
  };
}

/** Bring some of what a notice wants: they leave my bag and wait on the board for its writer, and nine tenths of the coins wait there for me. */
export function fill(purse: Purse, board: Pinboard, me: string, id: number, n: number, now: number, k: NoticeKnobs = NOTICES): Did<{ purse: Purse; board: Pinboard; item: ItemId; coins: number }> {
  if (!whole(n)) return no("amount");
  const notice = board.notices.find((x) => x.id === id);
  if (!notice || notice.kind !== "want" || !live(notice, now) || notice.left < n) return no("gone");
  if (notice.by === me) return no("own");
  if (plain(purse.bag, notice.item) < n) return no("none");
  const coins = n * notice.price;
  return {
    ok: true, item: notice.item, coins,
    purse: { ...purse, bag: takePlain(purse.bag, notice.item, n) },
    board: {
      ...board, due: owed(board, me, coins, k), sales: [...board.sales, { at: now, item: notice.item, n, price: notice.price }],
      notices: board.notices.map((x) => (x !== notice ? x : { ...x, left: x.left - n, held: x.held + n })),
    },
  };
}

/** Take what has been brought to my notice: as many as the bag has room for. A notice with nothing more wanted and nothing more waiting is gone. */
export function fetch(purse: Purse, board: Pinboard, me: string, id: number): Did<{ purse: Purse; board: Pinboard; item: ItemId; got: number }> {
  const notice = board.notices.find((x) => x.id === id && x.by === me);
  if (!notice || notice.kind !== "want" || notice.held <= 0) return no("none");
  const got = Math.min(notice.held, roomFor(purse.bag, notice.item));
  if (got <= 0) return no("full");
  return {
    ok: true, item: notice.item, got,
    purse: { ...purse, bag: put(purse.bag, notice.item, got) },
    board: { ...board, notices: board.notices.flatMap((x) => (x !== notice ? [x] : x.left === 0 && x.held === got ? [] : [{ ...x, held: x.held - got }])) },
  };
}

/** Take my notice down: what was not sold comes back to my bag; of a wanted one, the coins not spent, and whatever was brought. All of it, or the notice stays. */
export function takeDown(purse: Purse, board: Pinboard, me: string, id: number): Did<{ purse: Purse; board: Pinboard; item: ItemId; things: number; coins: number }> {
  const notice = board.notices.find((x) => x.id === id && x.by === me);
  if (!notice) return no("none");
  const things = notice.kind === "sell" ? notice.left : notice.held, coins = notice.kind === "want" ? notice.left * notice.price : 0;
  if (roomFor(purse.bag, notice.item) < things) return no("full");
  return {
    ok: true, item: notice.item, things, coins,
    purse: { ...purse, coins: purse.coins + coins, bag: things ? put(purse.bag, notice.item, things) : purse.bag },
    board: { ...board, notices: board.notices.filter((x) => x !== notice) },
  };
}

/** What waits at the board for somebody, in whole coins. */
export const dueOf = (board: Pinboard, who: string) => Math.floor((board.due[who] ?? 0) / 100);
/** Collect it: whole coins, the odd part waiting on. */
export function collectDue(purse: Purse, board: Pinboard, me: string): Did<{ purse: Purse; board: Pinboard; coins: number }> {
  const coins = dueOf(board, me);
  if (coins <= 0) return no("nothing");
  return { ok: true, coins, purse: { ...purse, coins: purse.coins + coins }, board: { ...board, due: { ...board.due, [me]: (board.due[me] ?? 0) - coins * 100 } } };
}

/** Buy one more place on the board. */
export function moreSlot(purse: Purse, board: Pinboard, me: string, k: NoticeKnobs = NOTICES): Did<{ purse: Purse; board: Pinboard; coins: number }> {
  const price = nextSlot(board, me, k);
  if (price === null) return no("slots");
  if (purse.coins < price) return no("coins");
  return { ok: true, coins: price, purse: { ...purse, coins: purse.coins - price }, board: { ...board, more: { ...board.more, [me]: (board.more[me] ?? 0) + 1 } } };
}

/** A notice as a member is told it: whose it is by name, and whether it is theirs. `held` is told only of one's own. */
export interface NoticeTold { id: number; kind: "sell" | "want"; item: ItemId; n: number; left: number; price: number; held: number; by: string; mine: boolean; until: number }
/**
 * The board as a member is told it: the notices that can be bought from or brought to, the newest first; my own,
 * whatever has become of them; what waits for me; my places and what one more costs; what may be wanted; and what
 * was sold over the board in the last days, a thing and a day at a time (`[day, how many, coins]`, the oldest first;
 * a day as lib/town/stamina counts one).
 */
export interface PinboardTold {
  notices: NoticeTold[];
  mine: NoticeTold[];
  due: number;
  slots: number;
  more: number | null;
  fee: number;
  hours: number;
  cap: number;
  capless: number;
  most: number;
  seen: ItemId[];
  sales: Record<string, Array<[day: number, n: number, coins: number]>>;
}
export function told(board: Pinboard, me: string, now: number, name: (id: string) => string, seen: readonly ItemId[], k: NoticeKnobs = NOTICES): PinboardTold {
  const tell = (n: Notice): NoticeTold => ({ id: n.id, kind: n.kind, item: n.item, n: n.n, left: n.left, price: n.price, held: n.by === me ? n.held : 0, by: name(n.by), mine: n.by === me, until: n.until });
  const today = dayOf(now), sales: PinboardTold["sales"] = {};
  for (const s of board.sales) {
    const day = dayOf(s.at);
    if (day <= today - k.days || day > today) continue;
    const rows = (sales[s.item] ??= []), row = rows.find((r) => r[0] === day);
    if (row) { row[1] += s.n; row[2] += s.n * s.price; } else rows.push([day, s.n, s.n * s.price]);
  }
  for (const rows of Object.values(sales)) rows.sort((a, b) => a[0] - b[0]);
  return {
    notices: board.notices.filter((n) => live(n, now)).sort((a, b) => b.id - a.id).slice(0, k.shown).map(tell),
    mine: board.notices.filter((n) => n.by === me).sort((a, b) => b.id - a.id).map(tell),
    due: dueOf(board, me), slots: slotsOf(board, me, k), more: nextSlot(board, me, k),
    fee: k.fee, hours: k.hours, cap: k.cap, capless: k.capless, most: k.most, seen: [...seen], sales,
  };
}
/** What the board owes whoever sells so many coins' worth: for the page to say before a thing is put up. */
export const afterFee = (coins: number, fee: number = NOTICES.fee) => Math.floor((coins * (100 - fee)) / 100);
