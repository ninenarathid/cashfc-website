import { ITEMS, type ItemId } from "./items";
import {
  FORGE, GEMS, SMELTING, SMELTS, drawable, drawnOf, elementOfGem, gemsOf, has, isWooden, levelOf, settable, toolKindOf,
  type Element, type OptionId, type ToolKind,
} from "./tools";
import { HOUR, held, put, roomFor, take, type Purse, type Stack } from "./trade";

/**
 * The blacksmith's rules (2026-10-08): smelting, a forging try, the options drawn at a tool's milestones, a gem set.
 *
 * - **Smelting** turns fragments into a piece (big ore, or a gem): so many fragments, fine timber and a fee a piece.
 *   A member has a queue of a few places; the pieces smelt one after another by the clock, also while the member is
 *   away, and wait at the smith until they are taken: nothing is lost by being away. A friend may work the bellows.
 * - **A forging try** spends its materials and its fee whether it takes or not (the table is the owner's). What
 *   comes of it is read from a number of chance that whoever keeps the game draws: nothing here draws one.
 * - **At a milestone** two options are drawn and one is chosen; an option can be drawn again for a gem and coins,
 *   the old one kept if wished. A draw waits until it is chosen: it cannot be had again by walking away.
 * - **A gem** is set into a tool's socket with a mount of copper; one set over another replaces it.
 *
 * Pure: every function is given the moment it is asked at and whatever chance it needs, and gives back new values.
 * What a member has at the smith is a `Smithy`; the keepers (the browser's trial, the database) hold it. Coins paid
 * to the smith leave the game. Every number is a knob, here or in lib/town/tools.
 */
export const SMITH = {
  /** Places in a member's queue to begin with, and how many more each widening gives; what the two widenings take. */
  places: 3,
  wider: 3,
  more: [{ timber: 20, coins: 200 }, { timber: 40, coins: 500 }] as ReadonlyArray<{ timber: number; coins: number }>,
  /** A friend at the bellows: so many milliseconds off the piece now smelting; one member helps the same queue so many times an hour; and so many points on the helpers' line. */
  bellows: { off: 30_000, each: 3, per: HOUR, points: 2 },
  /** Setting a gem: the mount, and the fee. */
  gem: { mount: "oreCopper" as ItemId, mounts: 1, fee: 50 },
  /** Drawing a milestone's option again: so many gems of any element, and the fee. */
  redraw: { gems: 1, fee: 100 },
  /** How many options a draw lays out to choose from. */
  offer: 2,
};

/** A try: the level tried for; how likely it takes, fails and stays, fails and loses a level (hundredths); the fee; and a metal tool's ore and timber. */
export interface Try { to: number; take: number; stay: number; down: number; fee: number; ore: ItemId; n: number; timber: number }
/** The table (the odds and the fees are the owner's, and are not to be changed). */
export const TRIES: readonly Try[] = [
  { to: 1, take: 100, stay: 0, down: 0, fee: 10, ore: "shardCopper", n: 5, timber: 2 },
  { to: 2, take: 100, stay: 0, down: 0, fee: 20, ore: "shardCopper", n: 8, timber: 2 },
  { to: 3, take: 100, stay: 0, down: 0, fee: 40, ore: "shardCopper", n: 12, timber: 3 },
  { to: 4, take: 100, stay: 0, down: 0, fee: 80, ore: "shardIron", n: 16, timber: 3 },
  { to: 5, take: 90, stay: 10, down: 0, fee: 150, ore: "oreIron", n: 1, timber: 4 },
  { to: 6, take: 80, stay: 15, down: 5, fee: 250, ore: "oreIron", n: 2, timber: 4 },
  { to: 7, take: 70, stay: 20, down: 10, fee: 400, ore: "oreSilver", n: 2, timber: 5 },
  { to: 8, take: 60, stay: 25, down: 15, fee: 600, ore: "oreSilver", n: 3, timber: 5 },
  { to: 9, take: 50, stay: 25, down: 25, fee: 900, ore: "oreSilver", n: 4, timber: 6 },
  { to: 10, take: 40, stay: 30, down: 30, fee: 1500, ore: "oreSilver", n: 5, timber: 6 },
];
/** What a try for a level takes of a kind of tool: a wooden tool half the ore (rounded up) and twice the timber. Null past the top. */
export function tryCost(kind: ToolKind, to: number): { fee: number; ore: ItemId; n: number; timber: number } | null {
  const t = TRIES.find((x) => x.to === to);
  if (!t) return null;
  return isWooden(kind) ? { fee: t.fee, ore: t.ore, n: Math.ceil(t.n / 2), timber: t.timber * 2 } : { fee: t.fee, ore: t.ore, n: t.n, timber: t.timber };
}
/** How a try for a level may go, in hundredths: null past the top. */
export const tryOdds = (to: number): { take: number; stay: number; down: number } | null => {
  const t = TRIES.find((x) => x.to === to);
  return t ? { take: t.take, stay: t.stay, down: t.down } : null;
};

/* ── what is kept ───────────────────────────────────────────────────────── */

/** A piece in the queue: what comes out, and from when until when it smelts. */
export interface Smelting { piece: ItemId; from: number; till: number }
/** A draw that waits to be chosen: for which kind of tool, which milestone (0, 1, 2), the options laid out, and (of a draw made again) the one the tool has, which may be kept. */
export interface Pending { item: ToolKind; at: number; offer: OptionId[]; old?: OptionId }
/**
 * What a member has at the smith: the queue in its order (pieces that are done stay in it until they are taken); how
 * many times it was widened; how many pieces a timber already burned still smelts; who worked the bellows lately;
 * and a draw that waits.
 */
export interface Smithy { queue: Smelting[]; more: number; ember: number; helps: Array<{ by: string; at: number }>; pending: Pending | null }
export const newSmithy = (): Smithy => ({ queue: [], more: 0, ember: 0, helps: [], pending: null });
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** A smithy made sound, whatever was kept: only pieces that are smelted, in order of their ends; counts within their bounds. */
export function soundSmithy(kept: unknown): Smithy {
  const k = (kept && typeof kept === "object" ? kept : {}) as Partial<Record<keyof Smithy, unknown>>;
  const queue = (Array.isArray(k.queue) ? k.queue : []).filter((q): q is Smelting => !!q && typeof q === "object" && typeof (q as Smelting).piece === "string" && (q as Smelting).piece in SMELTS && num((q as Smelting).from) && num((q as Smelting).till) && (q as Smelting).till >= (q as Smelting).from)
    .map((q) => ({ piece: q.piece, from: q.from, till: q.till })).sort((a, b) => a.till - b.till);
  const helps = (Array.isArray(k.helps) ? k.helps : []).filter((h): h is { by: string; at: number } => !!h && typeof h === "object" && typeof (h as { by: unknown }).by === "string" && num((h as { at: unknown }).at)).map((h) => ({ by: h.by, at: h.at }));
  const p = k.pending as Partial<Pending> | null | undefined;
  const pending = p && typeof p === "object" && toolKindOf(p.item) && Number.isInteger(p.at) && (p.at as number) >= 0 && (p.at as number) < FORGE.milestones.length && Array.isArray(p.offer) && p.offer.every((o) => typeof o === "string")
    ? { item: p.item as ToolKind, at: p.at as number, offer: [...p.offer] as OptionId[], ...(typeof p.old === "string" ? { old: p.old as OptionId } : {}) } : null;
  return {
    queue, helps, pending,
    more: num(k.more) ? Math.max(0, Math.min(SMITH.more.length, Math.floor(k.more))) : 0,
    ember: num(k.ember) ? Math.max(0, Math.floor(k.ember)) : 0,
  };
}

export type SmithRefusal =
  | "none"     // nothing of the kind there: no such piece, nothing done to take, no draw waiting
  | "amount"   // not a whole number above nothing
  | "tool"     // what is in that slot is no tool that is forged
  | "top"      // it is at the top already; the queue cannot be widened further
  | "ore"      // not enough fragments, ore or the mount
  | "timber"   // not enough fine timber
  | "coins"    // not enough coins
  | "places"   // no place free in the queue
  | "full"     // no room in the bag
  | "gem"      // no such gem in the bag
  | "same"     // that element is set in it already
  | "unbuilt"  // nothing to draw, or that element does nothing for this tool yet
  | "owed"     // a draw waits to be chosen first
  | "self"     // one's own bellows
  | "idle"     // nothing smelting there now
  | "tired"    // helped that queue as often as one may this hour
  | "away";    // the town's books could not be reached
export type Did<T = unknown> = ({ ok: true } & T) | { ok: false; why: SmithRefusal };
const no = (why: SmithRefusal): { ok: false; why: SmithRefusal } => ({ ok: false, why });
const whole = (n: number) => Number.isInteger(n) && n > 0;

/* ── smelting ───────────────────────────────────────────────────────────── */

/** How many places a member's queue has. */
export const placesOf = (s: Smithy): number => SMITH.places + SMITH.wider * Math.max(0, Math.min(SMITH.more.length, s.more));
/** The queue at a moment: the pieces that are done and wait to be taken, the one smelting, those waiting their turn; and how many places are free (a piece that is done takes none). */
export function smithView(s: Smithy, now: number): { done: Smelting[]; now: Smelting | null; waiting: Smelting[]; places: number; free: number } {
  const done = s.queue.filter((q) => q.till <= now), rest = s.queue.filter((q) => q.till > now);
  const cur = rest.find((q) => q.from <= now) ?? null;
  return { done, now: cur, waiting: rest.filter((q) => q !== cur), places: placesOf(s), free: Math.max(0, placesOf(s) - rest.length) };
}
/** Whether a bag has an axe whose seasoned wood makes a timber smelt more than one piece, and how many pieces it then smelts. */
export const dryOf = (bag: Purse["bag"]): number => (bag.some((s) => has(s, "axDry")) ? 2 : 1);
/** How much fine timber so many pieces take now: one a piece, less what a timber already burned still smelts. */
export function timberFor(s: Smithy, n: number, dry: number): { timber: number; ember: number } {
  let ember = s.ember, timber = 0;
  for (let i = 0; i < n; i++) {
    if (ember > 0) { ember--; continue; }
    timber += SMELTING.timber;
    ember = Math.max(0, dry - 1);
  }
  return { timber, ember };
}
/** What putting so many pieces in to smelt takes, as things stand: the fragments, the timber, the coins. Null for what is not smelted. */
export function smeltCost(purse: Purse, s: Smithy, piece: ItemId, n: number): { of: ItemId; fragments: number; timber: number; fee: number } | null {
  const rule = SMELTS[piece];
  if (!rule) return null;
  return { of: rule.of, fragments: SMELTING.fragments * n, timber: timberFor(s, n, dryOf(purse.bag)).timber, fee: rule.fee * n };
}
/** How many pieces of a kind could be put in now: by the places free, the fragments, the timber and the coins. */
export function maySmelt(purse: Purse, s: Smithy, piece: ItemId, now: number): number {
  const rule = SMELTS[piece];
  if (!rule) return 0;
  let n = Math.min(smithView(s, now).free, Math.floor(held(purse.bag, rule.of) / SMELTING.fragments), rule.fee > 0 ? Math.floor(purse.coins / rule.fee) : Infinity);
  while (n > 0 && timberFor(s, n, dryOf(purse.bag)).timber > held(purse.bag, "timber")) n--;
  return Math.max(0, n);
}
/** Put so many pieces of one kind in to smelt: they are paid for now and join the end of the queue. */
export function smelt(purse: Purse, s: Smithy, piece: ItemId, n: number, now: number): Did<{ purse: Purse; smithy: Smithy; timber: number; fee: number }> {
  const rule = SMELTS[piece];
  if (!rule) return no("none");
  if (!whole(n)) return no("amount");
  if (smithView(s, now).free < n) return no("places");
  if (held(purse.bag, rule.of) < SMELTING.fragments * n) return no("ore");
  const burn = timberFor(s, n, dryOf(purse.bag));
  if (held(purse.bag, "timber") < burn.timber) return no("timber");
  const fee = rule.fee * n;
  if (purse.coins < fee) return no("coins");
  let bag = take(purse.bag, rule.of, SMELTING.fragments * n);
  if (burn.timber > 0) bag = take(bag, "timber", burn.timber);
  const queue = [...s.queue];
  let from = Math.max(now, ...queue.map((q) => q.till));
  for (let i = 0; i < n; i++) { const till = from + rule.mins * 60_000; queue.push({ piece, from, till }); from = till; }
  return { ok: true, purse: { ...purse, coins: purse.coins - fee, bag }, smithy: { ...s, queue, ember: burn.ember }, timber: burn.timber, fee };
}
/** Take what is done: as much of it as the bag has room for; the rest goes on waiting. */
export function collect(purse: Purse, s: Smithy, now: number): Did<{ purse: Purse; smithy: Smithy; got: Array<[ItemId, number]> }> {
  const done = s.queue.filter((q) => q.till <= now);
  if (!done.length) return no("none");
  let bag = purse.bag;
  const got = new Map<ItemId, number>(), left: Smelting[] = [];
  for (const q of done) {
    if (roomFor(bag, q.piece) < 1) { left.push(q); continue; }
    bag = put(bag, q.piece, 1);
    got.set(q.piece, (got.get(q.piece) ?? 0) + 1);
  }
  if (!got.size) return no("full");
  return { ok: true, purse: { ...purse, bag }, smithy: { ...s, queue: [...left, ...s.queue.filter((q) => q.till > now)] }, got: [...got] };
}
/** How many times more somebody may work the bellows of a queue this hour. */
export const bellowsLeft = (s: Smithy, by: string, now: number): number => Math.max(0, SMITH.bellows.each - s.helps.filter((h) => h.by === by && now - h.at < SMITH.bellows.per).length);
/** Work the bellows of somebody's queue: so much off the piece smelting now, and off everything behind it. Never one's own. */
export function bellows(s: Smithy, owner: string, by: string, now: number): Did<{ smithy: Smithy; off: number }> {
  if (by === owner) return no("self");
  const cur = smithView(s, now).now;
  if (!cur) return no("idle");
  if (bellowsLeft(s, by, now) < 1) return no("tired");
  const off = Math.min(SMITH.bellows.off, cur.till - now);
  // (the piece smelting ends sooner; whatever waits behind it begins and ends as much sooner)
  const queue = s.queue.map((q) => (q.till <= now ? q : q === cur ? { ...q, till: q.till - off } : { ...q, from: q.from - off, till: q.till - off }));
  return { ok: true, off, smithy: { ...s, queue, helps: [...s.helps.filter((h) => now - h.at < SMITH.bellows.per), { by, at: now }] } };
}
/** What the next widening of the queue takes: null when it is as wide as it gets. */
export const widerCost = (s: Smithy): { timber: number; coins: number } | null => SMITH.more[s.more] ?? null;
/** Widen the queue: so many places more, for fine timber and coins. */
export function widen(purse: Purse, s: Smithy): Did<{ purse: Purse; smithy: Smithy }> {
  const cost = widerCost(s);
  if (!cost) return no("top");
  if (held(purse.bag, "timber") < cost.timber) return no("timber");
  if (purse.coins < cost.coins) return no("coins");
  return { ok: true, purse: { ...purse, coins: purse.coins - cost.coins, bag: take(purse.bag, "timber", cost.timber) }, smithy: { ...s, more: s.more + 1 } };
}

/* ── a forging try ──────────────────────────────────────────────────────── */

/** A stack with its own state written as it is kept: nothing kept that says nothing. */
function withState(s: Stack, plus: number, opts: Array<OptionId | null>, gems: Element[]): Stack {
  const { plus: _p, opts: _o, gems: _g, ...bare } = s;
  let last = -1;
  opts.forEach((o, i) => { if (o) last = i; });
  return { ...bare, ...(plus > 0 ? { plus } : {}), ...(last >= 0 ? { opts: opts.slice(0, last + 1).map((o) => o ?? "") } : {}), ...(gems.length ? { gems } : {}) };
}
const setSlot = (purse: Purse, slot: number, s: Stack): Purse => ({ ...purse, bag: purse.bag.map((b, i) => (i === slot ? s : b)) });
/** The options a draw for a milestone may lay out for a tool: those of the milestone's pool that are built, less every one the tool has. */
export function candidates(stack: Stack | null | undefined, at: number): OptionId[] {
  const kind = stack ? toolKindOf(stack.item) : null, pool = FORGE.pools[at];
  if (!kind || !pool) return [];
  const mine = drawnOf(stack);
  return drawable(kind, pool).filter((id) => !mine.includes(id));
}
/**
 * The milestone a tool is owed a draw at: the first its level has reached that has no option yet and something to
 * draw. -1 when it is owed none. (A level regained is owed nothing: the option drawn there never left the tool.)
 */
export function owedOf(stack: Stack | null | undefined): number {
  const level = levelOf(stack), mine = drawnOf(stack);
  return FORGE.milestones.findIndex((m, i) => level >= m && !mine[i] && candidates(stack, i).length > 0);
}
/** Which of a tool's materials for its next try a bag lacks: nothing, when it has them all. */
export function tryLacks(purse: Purse, slot: number): Array<"ore" | "timber" | "coins"> {
  const s = purse.bag[slot], kind = s ? toolKindOf(s.item) : null, cost = kind ? tryCost(kind, levelOf(s) + 1) : null;
  if (!cost) return [];
  return [...(held(purse.bag, cost.ore) < cost.n ? ["ore" as const] : []), ...(held(purse.bag, "timber") < cost.timber ? ["timber" as const] : []), ...(purse.coins < cost.fee ? ["coins" as const] : [])];
}
export type Outcome = "taken" | "stays" | "down";
/** How a try for a level goes, from a number of chance (0 up to 1). */
export function outcomeOf(to: number, r: number): Outcome {
  const o = tryOdds(to);
  if (!o) return "stays";
  const x = Math.max(0, Math.min(0.999999, r)) * 100;
  return x < o.take ? "taken" : x < o.take + o.stay ? "stays" : "down";
}
/**
 * A try at the tool in a slot of the bag. Its materials and its fee are spent, taken or not. `r` is the number of
 * chance whoever keeps the game drew. A failure leaves the level or lowers it by one, as the table says, and never
 * under the floor; the tool is never lost.
 */
export function forgeTry(purse: Purse, s: Smithy, slot: number, r: number): Did<{ purse: Purse; out: Outcome; from: number; level: number; item: ToolKind; owed: number }> {
  const stack = purse.bag[slot], kind = stack ? toolKindOf(stack.item) : null;
  if (!stack || !kind) return no("tool");
  const from = levelOf(stack);
  if (from >= FORGE.top) return no("top");
  // (a draw the tool is owed is chosen before it is forged further)
  if (owedOf(stack) >= 0) return no("owed");
  const cost = tryCost(kind, from + 1)!;
  if (held(purse.bag, cost.ore) < cost.n) return no("ore");
  if (held(purse.bag, "timber") < cost.timber) return no("timber");
  if (purse.coins < cost.fee) return no("coins");
  const out = outcomeOf(from + 1, r);
  const level = out === "taken" ? from + 1 : out === "down" ? Math.max(Math.min(from, FORGE.floor), from - 1) : from;
  const bag = take(take(purse.bag, cost.ore, cost.n), "timber", cost.timber);
  // (the tool stays in its slot: taking its materials never moves it, for a tool is no ore and no timber)
  const forged = withState(bag[slot] ?? stack, level, drawnOf(stack), gemsOf(stack));
  const next = setSlot({ ...purse, coins: purse.coins - cost.fee, bag }, slot, forged);
  return { ok: true, purse: next, out, from, level, item: kind, owed: owedOf(forged) };
}

/* ── the options ────────────────────────────────────────────────────────── */

/** Two (or as many as there are) of some options, by two numbers of chance: never the same one twice. */
export function pickOffer(from: readonly OptionId[], r1: number, r2: number, n = SMITH.offer): OptionId[] {
  const left = [...from], out: OptionId[] = [];
  for (const r of [r1, r2].slice(0, n)) {
    if (!left.length) break;
    out.push(...left.splice(Math.min(left.length - 1, Math.floor(Math.max(0, Math.min(0.999999, r)) * left.length)), 1));
  }
  return out;
}
/** The slot of the tool a waiting draw is for: the one said, if it fits; or else the first in the bag that does. -1 when no tool in the bag fits it. */
export function pendingSlot(purse: Purse, p: Pending | null, slot = -1): number {
  if (!p) return -1;
  // (a draw made again is for the tool that has the old option, whatever its level has fallen to since: what was paid for it is not lost with a level)
  const fits = (s: Stack | null | undefined) => !!s && toolKindOf(s.item) === p.item && (p.old ? drawnOf(s)[p.at] === p.old : levelOf(s) >= FORGE.milestones[p.at] && !drawnOf(s)[p.at]);
  return fits(purse.bag[slot]) ? slot : purse.bag.findIndex(fits);
}
/**
 * Lay out the draw a tool is owed: two options of its milestone's pool. One draw waits at a time, and a draw that
 * waits is the one laid out again, whatever chance is given: it is not drawn anew by going away and coming back.
 */
export function draw(purse: Purse, s: Smithy, slot: number, r1: number, r2: number): Did<{ smithy: Smithy; pending: Pending; slot: number; fresh: boolean }> {
  const waits = pendingSlot(purse, s.pending, slot);
  if (s.pending && waits >= 0) return waits === slot ? { ok: true, smithy: s, pending: s.pending, slot, fresh: false } : no("owed");
  const stack = purse.bag[slot], kind = stack ? toolKindOf(stack.item) : null;
  if (!stack || !kind) return no("tool");
  const at = owedOf(stack);
  if (at < 0) return no("none");
  const pending: Pending = { item: kind, at, offer: pickOffer(candidates(stack, at), r1, r2) };
  return { ok: true, smithy: { ...s, pending }, pending, slot, fresh: true };
}
/**
 * Draw the option of a milestone again, for a gem of any element and a fee: two are laid out, and the old one may
 * be kept. Of any option the tool has: one drawn stays the tool's whatever its level has fallen to.
 */
export function redraw(purse: Purse, s: Smithy, slot: number, at: number, gem: ItemId, r1: number, r2: number): Did<{ purse: Purse; smithy: Smithy; pending: Pending }> {
  if (s.pending && pendingSlot(purse, s.pending, slot) >= 0) return no("owed");
  const stack = purse.bag[slot], kind = stack ? toolKindOf(stack.item) : null;
  if (!stack || !kind) return no("tool");
  const old = drawnOf(stack)[at];
  if (!old) return no("none");
  if (!elementOfGem(gem) || held(purse.bag, gem) < SMITH.redraw.gems) return no("gem");
  if (purse.coins < SMITH.redraw.fee) return no("coins");
  const from = candidates(stack, at);
  if (!from.length) return no("unbuilt");
  const pending: Pending = { item: kind, at, offer: pickOffer(from, r1, r2), old };
  return { ok: true, pending, smithy: { ...s, pending }, purse: { ...purse, coins: purse.coins - SMITH.redraw.fee, bag: take(purse.bag, gem, SMITH.redraw.gems) } };
}
/** Choose one of the options laid out (or, of a draw made again, keep the old one): it is the tool's from then on. */
export function choose(purse: Purse, s: Smithy, slot: number, pick: string): Did<{ purse: Purse; smithy: Smithy; item: ToolKind; at: number; opt: OptionId; kept: boolean }> {
  const p = s.pending;
  if (!p) return no("none");
  if (pendingSlot(purse, p, slot) !== slot) return no("tool");
  const kept = !!p.old && pick === p.old;
  if (!kept && !p.offer.includes(pick as OptionId)) return no("none");
  const stack = purse.bag[slot]!, opts = drawnOf(stack);
  opts[p.at] = pick as OptionId;
  return { ok: true, purse: setSlot(purse, slot, withState(stack, levelOf(stack), opts, gemsOf(stack))), smithy: { ...s, pending: null }, item: p.item, at: p.at, opt: pick as OptionId, kept };
}

/* ── a gem ──────────────────────────────────────────────────────────────── */

/** Set a gem into the tool in a slot: a gem, a mount and a fee. It always takes; a gem already there is gone. */
export function setGem(purse: Purse, slot: number, gem: ItemId): Did<{ purse: Purse; item: ToolKind; element: Element; over: Element | null }> {
  const stack = purse.bag[slot], kind = stack ? toolKindOf(stack.item) : null;
  if (!stack || !kind) return no("tool");
  const element = elementOfGem(gem);
  if (!element || held(purse.bag, gem) < 1) return no("gem");
  if (!settable(kind, element)) return no("unbuilt");
  const over = gemsOf(stack)[0] ?? null;
  if (over === element) return no("same");
  if (held(purse.bag, SMITH.gem.mount) < SMITH.gem.mounts) return no("ore");
  if (purse.coins < SMITH.gem.fee) return no("coins");
  const bag = take(take(purse.bag, gem, 1), SMITH.gem.mount, SMITH.gem.mounts);
  const next = setSlot({ ...purse, coins: purse.coins - SMITH.gem.fee, bag }, slot, withState(bag[slot] ?? stack, levelOf(stack), drawnOf(stack), [element]));
  return { ok: true, purse: next, item: kind, element, over };
}
/** The gems a bag holds, each element once with how many of its gem: in the elements' order. */
export const gemsIn = (bag: Purse["bag"]): Array<{ element: Element; gem: ItemId; n: number }> =>
  (Object.keys(GEMS) as Element[]).map((element) => ({ element, gem: GEMS[element].gem, n: held(bag, GEMS[element].gem) })).filter((g) => g.n > 0);
/** The tools of a bag that can be forged, each with its slot. */
export const toolsIn = (bag: Purse["bag"]): Array<{ slot: number; stack: Stack; kind: ToolKind }> =>
  bag.flatMap((s, slot) => { const kind = s ? toolKindOf(s.item) : null; return s && kind ? [{ slot, stack: s, kind }] : []; });

/* ── the board ──────────────────────────────────────────────────────────── */

/** Who did something first, and when. */
export interface First { by: string; name: string; at: number }
/** The smith's board, the village's: who first forged each kind of tool to the top, and who first found each option. */
export interface SmithBoard { tops: Partial<Record<ToolKind, First>>; found: Partial<Record<OptionId, First>> }
export const newBoard = (): SmithBoard => ({ tops: {}, found: {} });
/** The board with a tool at the top written on it: only the first of its kind is. */
export const markTop = (b: SmithBoard, kind: ToolKind, who: { id: string; name: string }, now: number): SmithBoard =>
  (b.tops[kind] ? b : { ...b, tops: { ...b.tops, [kind]: { by: who.id, name: who.name, at: now } } });
/** The board with an option found written on it: only its first finder is. */
export const markFound = (b: SmithBoard, opt: OptionId, who: { id: string; name: string }, now: number): SmithBoard =>
  (b.found[opt] ? b : { ...b, found: { ...b.found, [opt]: { by: who.id, name: who.name, at: now } } });

/** A thing's name, for a line of the smith's log. */
export const nameOf = (id: ItemId, th: boolean): string => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
