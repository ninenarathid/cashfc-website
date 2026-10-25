/**
 * The weekly auction of limited outfits at Granny Twilla's (the owner, 2026-10-25: "ระบบประมูลรายสัปดาห์ ที่จะประมูล
 * เสื้อผ้า limited ได้ โดยเสื้อผ้า limited จะมีได้แค่ไม่กี่คนเท่านั้น แต่จะสามารถ rerun กลับมาให้ ประมูลใหม่ได้"; the first round
 * two Halloween designs, closing on Saturday 31 October at 21:00; the names of bidders shown: "ได้").
 *
 * A design is put up with so many copies. Whoever holds one of the top bids when it closes has a copy, and pays what
 * they bid. A bid is paid at once and held; whoever is pushed out of the top has every coin back at once, and raising
 * one's own bid pays only the difference; a bid is never taken back. While a copy is free the start price buys a place;
 * once all are held, a bid must beat the lowest of them by a step (5% of it, never under 500, in fifties). A bid in the
 * last five minutes moves the close to five minutes after it, never past the round's hard close. A tie goes to whoever
 * bid that much first. A copy is bound to its winner (worn, never traded), with its number in the round ("#1/3"), and the
 * coins leave the town. A design brought back is a new run of it; whoever has it from a run before keeps theirs and may
 * not bid on it again.
 *
 * The numbers (Claude and Codex, 2026-10-25, from the coins members held that day: of the 29 who played that week the
 * middle held 8,431, the top quarter 28,831, the top tenth 72,204): three copies a design, a start of 8,000 (Codex: the
 * middle holder may bid at once; mine had been 10,000), the step as above. The database keeps each round's own (v297's
 * `town_auctions`) and decides; this is the same rule for the page and the browser's trial. Pure.
 */

export interface AuctionRound {
  id: number;
  /** The design's key (its outfit's id in lib/town/wear) and what a copy gives to wear: the outfit first, then what goes with it. */
  design: string;
  wearables: readonly string[];
  /** Which time the design is up (1 the first). */
  run: number;
  copies: number;
  start: number;
  stepPct: number;
  stepMin: number;
  opensAt: number;
  closesAt: number;
  hardClose: number;
  settledAt?: number | null;
}

export interface Bid { member: string; name: string; amount: number; at: number }

/** The last five minutes, and how far a bid in them moves the close. */
export const LATE_MS = 5 * 60_000;

/** The step a bid must beat a held one by: a share of it, never under the least, in fifties. */
export const stepOf = (price: number, pct: number, least: number): number => Math.max(least, Math.ceil((price * pct) / 100 / 50) * 50);

/** The bids best first: the most, then whoever bid that much first. */
export const ranked = (bids: readonly Bid[]): Bid[] => [...bids].sort((a, b) => b.amount - a.amount || a.at - b.at);

/** The least a member may bid now: the start while a copy is free of the others, else the lowest held copy and a step; always more than their own. */
export function minBid(round: AuctionRound, bids: readonly Bid[], me: string): number {
  const others = ranked(bids.filter((b) => b.member !== me)), mine = bids.find((b) => b.member === me)?.amount ?? 0;
  const floor = others.length < round.copies ? round.start : others[round.copies - 1].amount + stepOf(others[round.copies - 1].amount, round.stepPct, round.stepMin);
  return Math.max(floor, mine + 1);
}

/** Whether the round takes bids at a moment. */
export const isOpen = (round: AuctionRound, ms: number): boolean => !round.settledAt && ms >= round.opensAt && ms < round.closesAt;

/** Where the close stands after a bid at a moment: five minutes after it when it came in the last five, never past the hard close. */
export const closeAfter = (round: AuctionRound, ms: number): number =>
  ms >= round.closesAt - LATE_MS ? Math.min(round.hardClose, Math.max(round.closesAt, ms + LATE_MS)) : round.closesAt;

export type BidRefusal = "closed" | "known" | "low" | "coins" | "none";

/**
 * A bid as the database takes it: what it costs the bidder now (the difference to their own), who is pushed out (each to
 * have back what they had in), the bids that stand after it, and the close; or why not.
 */
export function placeBid(round: AuctionRound, bids: readonly Bid[], me: { id: string; name: string; coins: number; owns: boolean }, amount: number, ms: number):
  | { ok: true; pay: number; out: Bid[]; bids: Bid[]; closesAt: number }
  | { ok: false; why: BidRefusal } {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, why: "none" };
  if (!isOpen(round, ms)) return { ok: false, why: "closed" };
  if (me.owns) return { ok: false, why: "known" };
  if (amount < minBid(round, bids, me.id)) return { ok: false, why: "low" };
  const mine = bids.find((b) => b.member === me.id)?.amount ?? 0, pay = amount - mine;
  if (me.coins < pay) return { ok: false, why: "coins" };
  const all = ranked([...bids.filter((b) => b.member !== me.id), { member: me.id, name: me.name, amount, at: ms }]);
  return { ok: true, pay, out: all.slice(round.copies), bids: all.slice(0, round.copies), closesAt: closeAfter(round, ms) };
}

/** Who has a copy when the round is settled, best first, each with its number in the round. */
export const winners = (round: AuctionRound, bids: readonly Bid[]): Array<Bid & { edition: number }> =>
  ranked(bids).slice(0, round.copies).map((b, i) => ({ ...b, edition: i + 1 }));

/** A round as the database tells a member of it (v297's town.auction_board): the bidders by name only, theirs marked. */
export interface AuctionBoard extends AuctionRound {
  bids: Array<{ name: string; amount: number; at: number; mine: boolean }>;
  /** Whether this member has the design already (from a round before, or this one settled). */
  had: boolean;
  /** Once settled: who has the copies, best first. */
  owners: Array<{ member: string; name: string; edition: number }>;
}
export interface AuctionBoards { now: number; auctions: AuctionBoard[] }
