import type { SupabaseClient } from "@supabase/supabase-js";
import { allRowsOrThrow } from "@/lib/rows";
import { bangkokDay } from "@/lib/evercold";
import { readWalletSwitch, type WalletSwitch } from "@/lib/wallet";
import { readSwitch, type PrizeSwitch } from "@/lib/prizes";

/**
 * Aqua's page: the gil she is paying for, what is still to hand over, and the
 * settings that decide how much of it there is.
 *
 * Aqua looks after the money and the prize events on this site, and every gil
 * in the wallets is hers. The prize tab is where the cupboard is built; this
 * page is where she runs it: how much do I owe now, how fast is it growing,
 * why did yesterday cost a million, who am I meeting next, and what happens
 * to all of that if I change a chance.
 *
 * The owed figure is everything that has not reached anybody's hands yet:
 * gil sitting in wallets, plus cash-outs that have been pressed but not
 * handed over. A cash-out moves gil from the first to the second, so it
 * changes neither the total nor the line on the chart. Only a payment in and
 * a handover do.
 *
 * Reading only, here. The page writes through the functions the prize tab
 * already uses (lib/prizes.ts, lib/wallet.ts), which the database checks.
 */

/** The three sizes a payment is drawn in, smallest first. */
export type Size = "small" | "medium" | "large";
export const SIZES: Size[] = ["small", "medium", "large"];

/**
 * Where the sizes split, in gil.
 *
 * Set by what is actually in the cupboard: the small ones are 10 to 1,000
 * and turn up on most popotos, the middle ones are 10,000 and 20,000, and
 * the large ones are 30,000 and above, which come up a few times a day at
 * most. The split is what answers "was that day expensive because a lot of
 * people sent popoto, or because somebody hit a big one".
 */
export const MEDIUM_FROM = 10_000;
export const LARGE_FROM = 30_000;

export const sizeOf = (gil: number): Size =>
  gil >= LARGE_FROM ? "large" : gil >= MEDIUM_FROM ? "medium" : "small";

/**
 * The gil figure in a prize's name, for the item prizes that are gil in all
 * but kind.
 *
 * "ลาภมันฝรั่ง 10,000,000 Gils" is an item prize (v87): won, claimed and
 * handed over in game by hand, so the database keeps no amount for it. It is
 * still money Aqua has to find, and a total that leaves out ten million gil
 * because of how a prize was filed is a total that misleads the one person
 * it is for. So the figure is read off the name, and the page says that it
 * was. A name with no figure in it, a minion, is counted but not priced.
 */
export function gilInName(...names: (string | null | undefined)[]): number | null {
  for (const name of names) {
    const m = name?.match(/(\d[\d,]*)\s*gils?\b/i);
    if (!m) continue;
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** One payment into somebody's wallet. */
export interface AquaDrop { amount: number; prizeId: number | null; prize: string; to: string; at: string }

/** A win that has not been handed over yet: a cash-out, or an item. */
export interface AquaOpen {
  id: number;
  winner: string;
  prize: string;
  prizeEn: string | null;
  /** The cash-out figure. Null for an item prize. */
  gil: number | null;
  wonAt: string;
  /** When the winner asked for it. Null for a win nobody has claimed yet. */
  claimedAt: string | null;
}

/** A prize in the cupboard, with the settings Aqua can change from her page. */
export interface CupboardPrize {
  id: number;
  name: string;
  kind: "item" | "gil";
  /** Gil a win of it pays into the wallet. Null for an item. */
  gil: number | null;
  /** Percent of the popotos it is drawn on. */
  chance: number;
  active: boolean;
  /** How many are left, or null for no limit. */
  stock: number | null;
  draw: string;
  audience: string;
  otherSide: string;
}

/** Everything the page is drawn from, as read from the database. */
export interface AquaRaw {
  /** The Bangkok days on the chart, oldest first. The last one is today. */
  days: string[];
  /**
   * The last week of finished days, which is what a forecast is read from,
   * whatever span the chart happens to be showing.
   */
  recent: string[];
  drops: AquaDrop[];
  /** Popotos given on each of those days. */
  sends: Record<string, number>;
  /** What each wallet holds right now. */
  wallets: { to: string; balance: number }[];
  /** The wallet's switch and its cash-out bar. Null before v91. */
  purse: WalletSwitch | null;
  /** The prize draw's master switch. Null before v88. */
  master: PrizeSwitch | null;
  open: AquaOpen[];
  /** Cash-outs handed over during the span, for walking the owed line back. */
  handedOver: { gil: number; at: string }[];
  /** Account id → the name to print. */
  names: Record<string, string>;
  /** The whole cupboard, in the order the draw lays it out. */
  cupboard: CupboardPrize[];
}

export interface AquaDay {
  day: string;
  /** "27/09", for the axis. */
  label: string;
  small: number;
  medium: number;
  large: number;
  total: number;
  /** How many payments there were. */
  count: number;
  sends: number;
  /** Gil paid for each popoto given that day. Null on a day nobody gave one. */
  perSend: number | null;
  /** What was still owed when the day ended, or now for today. */
  owedEnd: number;
  today: boolean;
}

export interface AquaQueueItem {
  id: number;
  winner: string;
  who: string;
  prize: string;
  prizeEn: string | null;
  /** The cash-out figure. Null for an item. */
  gil: number | null;
  /** What an item is worth, where its name says. */
  worth: number | null;
  since: string;
  /** Whole days since it was asked for. */
  waited: number;
}

/** Everything one person is waiting for, which is one meeting in game. */
export interface AquaQueueGroup {
  winner: string;
  who: string;
  items: AquaQueueItem[];
  /** Cash-outs plus the items whose names give a figure. */
  gil: number;
  /** The longest any of it has waited, in whole days. */
  waited: number;
}

export interface AquaSummary {
  owed: {
    total: number;
    inWallets: number;
    /** How many wallets have anything in them. */
    holders: number;
    /** Wallets already past the cash-out bar, which can be handed over any time. */
    ready: number;
    readyGil: number;
    /** Cash-outs pressed and not yet handed over. */
    waitingGil: number;
    waiting: number;
    /** Item prizes won and not handed over, claimed or not. */
    items: number;
    /** What those are worth, where the name says. See gilInName. */
    itemsGil: number;
    /** Items whose name gives no figure, so they are counted and not priced. */
    itemsUnpriced: number;
  };
  /** The fullest wallets, for seeing who is about to ask. */
  purses: { name: string; balance: number; ready: boolean }[];
  days: AquaDay[];
  /** Paid in over the whole span. */
  paid: number;
  payments: number;
  /** A day, over the days that have finished. Today would only pull it down. */
  perDay: number;
  top: { day: string; gil: number } | null;
  perSend: number | null;
  today: number;
  recipients: { name: string; gil: number; count: number }[];
  byPrize: { name: string; count: number; gil: number; share: number }[];
  /** Claimed and not handed over, the longest wait first. */
  queue: AquaQueueItem[];
  /** The same, one row per person, the person waiting longest first. */
  groups: AquaQueueGroup[];
  /** Won and not claimed yet. Nobody's job until the winner presses it. */
  unclaimed: number;
  /** Popotos rolled a day on each line of prizes. See rollsPerDay. */
  rolls: Record<string, number>;
  /** What a day actually cost over the same week the forecast is read from. */
  recentPerDay: number;
}

/** A Bangkok date n days before `today`, as YYYY-MM-DD. */
export function daysBack(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00+07:00`);
  d.setTime(d.getTime() - n * 86_400_000);
  return bangkokDay(d.toISOString());
}

/** The span's days, oldest first, ending on `today`. */
export function spanDays(today: string, span: number): string[] {
  const out: string[] = [];
  for (let i = span - 1; i >= 0; i--) out.push(daysBack(today, i));
  return out;
}

/** How many whole days `from` is before `now`, and never less than nought. */
const daysSince = (from: string, now: number) =>
  Math.max(0, Math.floor((now - Date.parse(from)) / 86_400_000));

/** How many names each list is worth. */
const TOP = 10;

/** The last this many finished days are what a projection is read from. */
const PROJECT_FROM_DAYS = 7;

/**
 * Which prizes share their rolls.
 *
 * A prize is drawn on a popoto only if that popoto is one it can be won on:
 * drawn on giving or on receiving, for whoever it is open to, and with the
 * right person at the other end. Two prizes with the same three answers are
 * drawn on exactly the same popotos, which is what lets a busy one measure
 * how often a quiet one gets its chance.
 */
export const lineOf = (p: Pick<CupboardPrize, "draw" | "audience" | "otherSide">): string =>
  `${p.draw}|${p.audience}|${p.otherSide}`;

/**
 * How many popotos a day each line of prizes is actually drawn on.
 *
 * Measured, not assumed. Counting popotos sent is not enough: a prize that
 * asks for a proved FC member at the other end is not drawn on the hundreds
 * sent to characters nobody holds, which on a busy day is most of them. So
 * this is read off what the gil prizes on each line paid out: a prize at 40%
 * that paid four hundred times was drawn on about a thousand popotos. The
 * prizes on one line are pooled, so the common small ones carry the estimate
 * for the rare big ones beside them.
 */
export function rollsPerDay(
  cupboard: CupboardPrize[], drops: Pick<AquaDrop, "prizeId" | "at">[], days: string[],
): Record<string, number> {
  const inDays = new Set(days);
  const paid = new Map<number, number>();
  for (const d of drops) {
    if (d.prizeId == null || !inDays.has(bangkokDay(d.at))) continue;
    paid.set(d.prizeId, (paid.get(d.prizeId) ?? 0) + 1);
  }
  // Chances are added up in percent and divided once, so 40% and 20% make 60
  // and not the 0.6000000000000001 that adding them as fractions gives.
  const pool = new Map<string, { n: number; pct: number }>();
  for (const pz of cupboard) {
    if (pz.kind !== "gil" || !pz.active || !(pz.chance > 0)) continue;
    const key = lineOf(pz);
    const at = pool.get(key) ?? { n: 0, pct: 0 };
    at.n += paid.get(pz.id) ?? 0;
    at.pct += pz.chance;
    pool.set(key, at);
  }
  const out: Record<string, number> = {};
  for (const [key, { n, pct }] of pool) {
    if (pct > 0 && days.length && n > 0) out[key] = (n * 100) / pct / days.length;
  }
  return out;
}

/** What one prize is expected to do in a day, as it is set. */
export interface PrizeForecast {
  id: number;
  /** Wins a day. Null where there is nothing yet to measure its line by. */
  perDay: number | null;
  /** Gil a day, for a gil prize. Null where perDay is. */
  gilPerDay: number | null;
  /** Whether it can come up at all right now. */
  live: boolean;
}

/**
 * What the cupboard costs a day, as it is set, or as it would be set.
 *
 * Each prize at its own chance on the popotos its line is drawn on. The
 * whole cupboard shares one number from 0 to 100 (v90), so a total over 100
 * is a prize at the end of the line that can never come up. That is not
 * modelled here and is said out loud instead, the way the prize tab says it.
 */
export function forecast(
  cupboard: CupboardPrize[], rolls: Record<string, number>, walletOn: boolean,
): { prizes: PrizeForecast[]; gilPerDay: number; unknown: number; chance: number } {
  let gilPerDay = 0;
  let unknown = 0;
  let chance = 0;
  const prizes = cupboard.map((p) => {
    const live = p.active && p.chance > 0 && (p.kind !== "gil" || walletOn)
      && (p.stock == null || p.stock > 0);
    if (!live) return { id: p.id, perDay: 0, gilPerDay: p.kind === "gil" ? 0 : null, live };
    chance += p.chance;
    const r = rolls[lineOf(p)];
    if (r == null) {
      unknown += 1;
      return { id: p.id, perDay: null, gilPerDay: null, live };
    }
    const perDay = (r * p.chance) / 100;
    const gil = p.kind === "gil" ? perDay * (p.gil ?? 0) : null;
    if (gil != null) gilPerDay += gil;
    return { id: p.id, perDay, gilPerDay: gil, live };
  });
  return { prizes, gilPerDay, unknown, chance };
}

/**
 * Add it all up.
 *
 * Kept apart from the reading so it can be tested with made-up rows, and so
 * the page can be drawn from rows it did not read itself.
 */
export function summarize(raw: AquaRaw, now: number = Date.now()): AquaSummary {
  const last = raw.days[raw.days.length - 1];

  const rows = new Map<string, AquaDay>(raw.days.map((day) => [day, {
    day, label: `${day.slice(8, 10)}/${day.slice(5, 7)}`,
    small: 0, medium: 0, large: 0, total: 0, count: 0,
    sends: raw.sends[day] ?? 0, perSend: null, owedEnd: 0, today: day === last,
  }]));

  const byWho = new Map<string, { gil: number; count: number }>();
  const byPrize = new Map<string, { count: number; gil: number }>();
  for (const d of raw.drops) {
    const row = rows.get(bangkokDay(d.at));
    if (!row) continue;
    row[sizeOf(d.amount)] += d.amount;
    row.total += d.amount;
    row.count += 1;
    const w = byWho.get(d.to) ?? { gil: 0, count: 0 };
    w.gil += d.amount; w.count += 1; byWho.set(d.to, w);
    const p = byPrize.get(d.prize) ?? { count: 0, gil: 0 };
    p.gil += d.amount; p.count += 1; byPrize.set(d.prize, p);
  }

  const inWallets = raw.wallets.reduce((s, w) => s + w.balance, 0);
  const cashOuts = raw.open.filter((o) => o.gil != null);
  const waitingGil = cashOuts.reduce((s, o) => s + (o.gil ?? 0), 0);
  /** What the wallets owe: the part the chart below can walk back day by day. */
  const owedNow = inWallets + waitingGil;
  const items = raw.open.filter((o) => o.gil == null);
  const worth = items.map((o) => gilInName(o.prize, o.prizeEn));
  const itemsGil = worth.reduce<number>((s, w) => s + (w ?? 0), 0);

  /*
   * What was owed at the end of each day, walked back from what is owed now.
   *
   * Going back over a day undoes it: take off what was paid in that day, and
   * put back whatever was handed over. The alternative, adding up from the
   * first payment ever, would mean reading every payment there has ever been
   * to draw a fortnight.
   */
  const handed = new Map<string, number>();
  for (const h of raw.handedOver) {
    const day = bangkokDay(h.at);
    handed.set(day, (handed.get(day) ?? 0) + h.gil);
  }
  const list = raw.days.map((day) => rows.get(day)!);
  let owed = owedNow;
  for (let i = list.length - 1; i >= 0; i--) {
    const row = list[i];
    row.owedEnd = Math.max(0, owed);
    row.perSend = row.sends > 0 ? row.total / row.sends : null;
    owed = owed - row.total + (handed.get(row.day) ?? 0);
  }

  const paid = list.reduce((s, r) => s + r.total, 0);
  // From the first day anything was paid: days before the wallet existed are
  // not cheap days, they are days nothing could be paid, and averaging them in
  // made a week that cost 600,000 a day read as 330,000.
  const first = list.findIndex((r) => r.total > 0);
  const live = first < 0 ? [] : list.slice(first);
  const sends = live.reduce((s, r) => s + r.sends, 0);
  const done = live.filter((r) => !r.today);
  const top = list.reduce<AquaDay | null>(
    (best, r) => (r.total > 0 && (!best || r.total > best.total) ? r : best), null);

  const recentSet = new Set(raw.recent);
  const bar = raw.purse?.threshold ?? null;
  const ready = bar ? raw.wallets.filter((w) => w.balance >= bar) : [];

  const queue = raw.open
    .filter((o) => o.claimedAt != null)
    .map((o) => ({
      id: o.id, winner: o.winner, who: raw.names[o.winner] ?? "—",
      prize: o.prize, prizeEn: o.prizeEn, gil: o.gil,
      worth: o.gil == null ? gilInName(o.prize, o.prizeEn) : null,
      since: o.claimedAt!, waited: daysSince(o.claimedAt!, now),
    }))
    .sort((a, b) => a.since.localeCompare(b.since));

  const byWinner = new Map<string, AquaQueueGroup>();
  for (const q of queue) {
    const g = byWinner.get(q.winner)
      ?? { winner: q.winner, who: q.who, items: [], gil: 0, waited: 0 };
    g.items.push(q);
    g.gil += q.gil ?? q.worth ?? 0;
    g.waited = Math.max(g.waited, q.waited);
    byWinner.set(q.winner, g);
  }

  return {
    owed: {
      total: owedNow + itemsGil, inWallets,
      holders: raw.wallets.filter((w) => w.balance > 0).length,
      ready: ready.length, readyGil: ready.reduce((s, w) => s + w.balance, 0),
      waitingGil, waiting: cashOuts.length,
      items: items.length, itemsGil,
      itemsUnpriced: worth.filter((w) => w == null).length,
    },
    purses: raw.wallets
      .filter((w) => w.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, TOP)
      .map((w) => ({ name: raw.names[w.to] ?? "—", balance: w.balance, ready: bar != null && w.balance >= bar })),
    days: list,
    paid,
    payments: list.reduce((s, r) => s + r.count, 0),
    perDay: done.length ? done.reduce((s, r) => s + r.total, 0) / done.length : paid,
    top: top ? { day: top.day, gil: top.total } : null,
    perSend: sends > 0 ? paid / sends : null,
    today: rows.get(last)?.total ?? 0,
    recipients: [...byWho]
      .sort((a, b) => b[1].gil - a[1].gil)
      .slice(0, TOP)
      .map(([to, w]) => ({ name: raw.names[to] ?? "—", gil: w.gil, count: w.count })),
    byPrize: [...byPrize]
      .sort((a, b) => b[1].gil - a[1].gil)
      .map(([name, p]) => ({ name, count: p.count, gil: p.gil, share: paid ? p.gil / paid : 0 })),
    queue,
    groups: [...byWinner.values()].sort((a, b) => b.waited - a.waited || b.gil - a.gil),
    unclaimed: raw.open.filter((o) => o.claimedAt == null).length,
    rolls: rollsPerDay(raw.cupboard, raw.drops, raw.recent),
    recentPerDay: raw.recent.length
      ? raw.drops.filter((d) => recentSet.has(bangkokDay(d.at)))
        .reduce((sum, d) => sum + d.amount, 0) / raw.recent.length
      : 0,
  };
}

/**
 * Gil on an axis, where there is no room for six digits: 250k, 1.2M.
 *
 * The full figure is always one hover or one row of the table away. This is
 * only the tick.
 */
export function gilShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (a >= 1_000) {
    const k = n / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(Math.round(n));
}

/**
 * Read everything the page needs for the last `span` days.
 *
 * Throws rather than drawing short, for the reason the popoto chart gives: a
 * chart missing a page of rows looks exactly like a quiet day.
 */
export async function loadAqua(
  supabase: SupabaseClient, span: number, now: Date = new Date(),
): Promise<AquaRaw> {
  const today = bangkokDay(now.toISOString());
  const days = spanDays(today, span);
  // The week before today, for the forecast, read whatever span the chart shows.
  const recent = spanDays(daysBack(today, 1), PROJECT_FROM_DAYS);
  const from = `${recent[0] < days[0] ? recent[0] : days[0]}T00:00:00+07:00`;

  const fail = (what: string, e: { message: string } | null) => {
    if (e) throw new Error(`${what}: ${e.message}`);
  };

  // One count a day rather than every popoto row: this page wants how many,
  // never which, and thirty small counts are lighter than thirty thousand rows.
  const counting = Promise.all(days.map(async (day) => {
    const { count, error } = await supabase.from("kudos")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${day}T00:00:00+07:00`)
      .lt("created_at", `${daysBack(day, -1)}T00:00:00+07:00`);
    fail("kudos", error);
    return [day, count ?? 0] as const;
  }));

  const [drops, wallets, open, handedOver, people, prizes, counts, purse, master] = await Promise.all([
    allRowsOrThrow<{
      amount: number; prize_id: number | null; prize_name: string;
      profile_id: string; created_at: string;
    }>((a, b) => supabase.from("wallet_drops")
      .select("amount, prize_id, prize_name, profile_id, created_at")
      .gte("created_at", from).order("id").range(a, b)),
    allRowsOrThrow<{ profile_id: string; balance: number | string }>(
      (a, b) => supabase.from("wallets")
        .select("profile_id, balance").order("profile_id").range(a, b)),
    allRowsOrThrow<{
      id: number; winner: string; prize_name: string; prize_name_en: string | null;
      gil_amount: number | string | null; won_at: string; claimed_at: string | null;
    }>((a, b) => supabase.from("prize_wins")
      .select("id, winner, prize_name, prize_name_en, gil_amount, won_at, claimed_at")
      .is("delivered_at", null).order("id").range(a, b)),
    allRowsOrThrow<{ gil_amount: number | string; delivered_at: string }>(
      (a, b) => supabase.from("prize_wins")
        .select("gil_amount, delivered_at")
        .not("gil_amount", "is", null).gte("delivered_at", from)
        .order("id").range(a, b)),
    allRowsOrThrow<{ id: string; character_name: string | null; display_name: string | null }>(
      (a, b) => supabase.from("profiles")
        .select("id, character_name, display_name").order("id").range(a, b)),
    supabase.from("prizes")
      .select("id, name, kind, gil_amount, chance_pct, active, stock, draw, audience, other_side")
      .order("id", { ascending: true }),
    counting,
    readWalletSwitch(supabase),
    readSwitch(supabase),
  ]);
  fail("prizes", prizes.error);

  const names: Record<string, string> = {};
  for (const p of people) names[p.id] = p.character_name ?? p.display_name ?? "—";

  return {
    days,
    recent,
    drops: drops.map((d) => ({
      amount: Number(d.amount) || 0, prizeId: d.prize_id, prize: d.prize_name,
      to: d.profile_id, at: d.created_at,
    })),
    sends: Object.fromEntries(counts),
    wallets: wallets.map((w) => ({ to: w.profile_id, balance: Number(w.balance) || 0 })),
    purse,
    master,
    open: open.map((o) => ({
      id: o.id, winner: o.winner, prize: o.prize_name, prizeEn: o.prize_name_en,
      gil: o.gil_amount == null ? null : Number(o.gil_amount) || 0,
      wonAt: o.won_at, claimedAt: o.claimed_at,
    })),
    handedOver: handedOver.map((h) => ({ gil: Number(h.gil_amount) || 0, at: h.delivered_at })),
    names,
    cupboard: ((prizes.data ?? []) as {
      id: number; name: string; kind: string | null; gil_amount: number | null;
      chance_pct: number | string; active: boolean; stock: number | null;
      draw: string; audience: string; other_side: string | null;
    }[]).map((p) => ({
      id: p.id, name: p.name, kind: p.kind === "gil" ? "gil" : "item",
      gil: p.gil_amount == null ? null : Number(p.gil_amount) || 0,
      chance: Number(p.chance_pct) || 0, active: !!p.active, stock: p.stock,
      draw: p.draw, audience: p.audience, otherSide: p.other_side ?? "anyone",
    })),
  };
}
