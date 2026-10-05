import { COOKING, cook, hasMade, isFind, ladle, serve, setDown, takeUp, type Pot, type Taste } from "./cooking";
import { WATER, WILD, chore, choreFor, deedFor, ownerOf, tend, type Bed, type Chore, type Deed, type FarmRefusal, type Plot } from "./farm";
import { agree, lay, newDeal, sideOf, swap, type Deal, type Give } from "./deal";
import { hookBait, landCatch, loseBait } from "./fishing";
import { SPOTS, gather, holds, sights, turnOf, type ForestRefusal, type Outcome, type Sight } from "./forest";
import { BUGS, HAUNTS, HAUNT_KINDS, bugTurn, net, swarmAt, swarms, type BugId, type BugRefusal, type BugSight, type Haunt, type Swarm, pestToRid } from "./insects";
import { NOTE, blessed, newFountain, tidyNote, told, toss, type Fountain, type FountainTold, type WishId, type WishNote } from "./fountain";
import { buyHint, nextHint } from "./hints";
import * as Notices from "./notices";
import { MARKET, counted, factorOf, factsOf, newMarket, pricesTold, rolled, type Logged, type Market, type PricesTold } from "./market";
import { CROPS, CROP_IDS, DISHES, STAGES, STAGE_AT, type BaitId, type CatchId, type DishId, type ItemId } from "./items";
import { UNLOCKS, give, newVillage, orderOf, shelfOf, sourcesAt, type Order, type Village } from "./orders";
import { count, keep, newTally, type Play, type Tally } from "./plays";
import { open } from "./scrolls";
import { SKIES } from "./skies";
import { STAMINA, bowlsBack, chew, dayOf, getUp, readScroll, sitDown, spend } from "./stamina";
import {
  RULES, buy, change, collect, handOf, hold, leave, letGo, newPurse, newStall, nextRoundAt, no, put, roomFor, roomy, roundOf, takeBack, takeOff, wear,
  type Done, type Purse, type Refusal, type Stall,
} from "./trade";
import { bedCorner, bedOf } from "./world";
import { collect as jarCollect, drop as jarDrop, newJar, settle, type Jar, type JarTold, type Owed } from "./jar";
import { boardOf, thank, toThank, type Helper, type Thanks, type ThanksBoard } from "./thanks";
import { bookOf, newLog, ranksOf, seen, takeGift, type WaterDeed, type WellBook, type WellLog } from "./well";

/**
 * The trade's rules kept in this browser, to try them (the owner, 2026-10-03,
 * asked how the two shopkeepers should work in dev first: "ลองในเบราว์เซอร์ก่อน").
 * The rules are the real ones (lib/town/trade, stamina, fishing); only the
 * keeping is not: the coins, the bag, the stamina and the stall's stock live in
 * localStorage, nothing is asked of the database, and nobody's real popoto are
 * touched. The database's functions take this one's place once the owner is
 * happy with how it plays.
 *
 * - A purse is one person's, by their id. The stall is one for the browser, so
 *   two tabs with two testers buy from the same stock, as a village would.
 * - The clock can be put forward to the next round, or by hours, for everybody
 *   in the browser, so a round, a meal or another hour's fish need not be
 *   waited for.
 * - A trial's member is given popoto to change that are not theirs: the middle
 *   of what verified members held when this was written.
 * - Every go at a mini-game is written down (lib/town/plays): a log of the
 *   newest and a tally of them all, each person's own. Beginning again leaves
 *   them: they are what happened.
 *
 * Only for `next dev`: whatever loads this does so behind a check production
 * compiles away.
 */

const STALL = "cashtown.trial.stall.1", CLOCK = "cashtown.trial.clock.1", FARM = "cashtown.trial.farm.2";
const WELL = "cashtown.trial.well.1", BEDS = "cashtown.trial.beds.1";
/** The fountain (lib/town/fountain): the village's, like the stall. */
const FOUNTAIN = "cashtown.trial.fountain.1", NOTES = "cashtown.trial.wishes.1";
/** The relatives' prices (lib/town/market): the village's, like the stall; and the rounds gone by, as they were written down. */
const MARKET_AT = "cashtown.trial.market.1", MARKET_LOG = "cashtown.trial.market.log.1";
/** The notice board beside the stall (lib/town/notices): the village's; and what the testers of this browser have met, which only grows. */
const PINBOARD = "cashtown.trial.notices.1", SEEN = "cashtown.trial.seen.1";
/** A wish's words as the trial keeps them: who wrote them and who tossed onto or reported them, by their ids. */
interface KeptNote { id: number; by: string; day: number; wish: WishId; note: string; cheers: string[]; reports: string[]; hidden: boolean; at: number }
/** The forest: the word its rolls hang on, and who has taken from which place in which turn. */
const WILD_SALT = "cashtown.trial.wild.salt.1", WILD_TOOK = "cashtown.trial.wild.took.1";
const BUG_TOOK = "cashtown.trial.bugs.took.1", BUG_BOOK = "cashtown.trial.bugs.book.1";
/** The well's book (lib/town/well): whose water is where, for the whole browser. */
const WELL_LOG = "cashtown.trial.welllog.1";
/** The thanks given (lib/town/thanks), and the jar at the well with what waits at it for each (lib/town/jar): the whole browser's. */
const THANKS = "cashtown.trial.thanks.1", JAR = "cashtown.trial.jar.1";
const POTS = "cashtown.trial.pots.1", FOUND = "cashtown.trial.found.1", FINDERS = "cashtown.trial.finders.1", DEALS = "cashtown.trial.deals.1", VILLAGE = "cashtown.trial.village.1";
/** The beds the test window plants as a show garden: the four round the well. */
const SHOW_BEDS = [8, 9, 14, 15];
/** A deal as the trial keeps it: open, or just ended (done, or called off), which both sides are shown for a moment. */
export type KeptDeal = Deal & { end?: "done" | "off"; endAt?: number };
/** How long an ended deal is kept, to be shown to the other side. */
const ENDED_MS = 6000;
/** A bed's keeping, with its owner's name as they were called when they took it (for its name plate). */
export type KeptBed = Bed & { name?: string };
const purseKey = (id: string) => `cashtown.trial.purse.2.${id}`;
/** How many slots a bag began with when this tester's purse was last looked at: a purse kept from when bags began smaller is given the rest, once (the test window can still make a bag smaller afterwards, to try one). */
const slotsKey = (id: string) => `cashtown.trial.slots.1.${id}`;
const playsKey = (id: string) => `cashtown.trial.plays.1.${id}`, tallyKey = (id: string) => `cashtown.trial.tally.1.${id}`;
/** The popoto a trial's member has to change: what a verified member held on 2026-10-03, about (profile), and a share of pictures'. */
const SAMPLE = { profile: 247, gallery: 31 };

export class Trial {
  private readonly heard = new Set<() => void>();
  /** Whether the browser gives storage. When it does not (a private window), things are kept here and last as long as the page. */
  private stored = true;
  private readonly memory = new Map<string, string>();

  constructor(private readonly id: string) {}

  /** Another tab changed something: tell whoever is watching here. */
  private readonly onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith("cashtown.trial.")) this.tell(); };
  private tell() { for (const fn of this.heard) fn(); }
  /** Be told when anything changes (here or in another tab). Returns how to stop. Other tabs are listened to only while somebody is watching. */
  watch(fn: () => void): () => void {
    if (!this.heard.size) window.addEventListener("storage", this.onStorage);
    this.heard.add(fn);
    return () => {
      this.heard.delete(fn);
      if (!this.heard.size) window.removeEventListener("storage", this.onStorage);
    };
  }

  private get(key: string): string | null {
    if (this.stored) { try { return window.localStorage.getItem(key); } catch { this.stored = false; } }
    return this.memory.get(key) ?? null;
  }
  private set(key: string, raw: string | null) {
    if (this.stored) {
      try { if (raw === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, raw); return; } catch { this.stored = false; }
    }
    if (raw === null) this.memory.delete(key); else this.memory.set(key, raw);
  }
  private read<T>(key: string, fresh: () => T, sound: (v: unknown) => boolean): T {
    const raw = this.get(key);
    if (raw !== null) {
      try { const v: unknown = JSON.parse(raw); if (sound(v)) return v as T; } catch { /* a value that will not parse is a fresh start */ }
    }
    return fresh();
  }
  private write(key: string, value: unknown) { this.set(key, JSON.stringify(value)); }

  /** The trial's clock: the real one, put forward by however much was skipped. */
  now(): number { return Date.now() + this.read<number>(CLOCK, () => 0, (v) => typeof v === "number" && Number.isFinite(v)); }
  /** My purse (with a bowl it was owed, when there is room for it now: lib/town/stamina; and, once, the slots a bag has gained since it was kept). */
  purse(): Purse {
    const kept = this.read<Purse>(purseKey(this.id), () => newPurse(SAMPLE), (v) => {
      const p = v as Partial<Purse> | null;
      return !!p && typeof p.coins === "number" && Array.isArray(p.bag) && Array.isArray(p.left) && !!p.bought && !!p.changed && !!p.popoto
        && !!p.stamina && !!p.meals && Array.isArray(p.recipes) && !!p.best;
    });
    if (this.get(slotsKey(this.id)) === String(RULES.slots)) return this.blessed(bowlsBack(kept));
    const grown = roomy(kept);
    if (grown !== kept) this.write(purseKey(this.id), grown);
    this.set(slotsKey(this.id), String(RULES.slots));
    return this.blessed(bowlsBack(grown));
  }
  /** A purse with the fountain's blessings its tester has (lib/town/fountain), as the database reads one. */
  private blessed(purse: Purse): Purse { return blessed(purse, this.kept(), this.id, this.now()); }
  private kept(): Fountain {
    return this.read<Fountain>(FOUNTAIN, newFountain, (v) => { const f = v as Partial<Fountain> | null; return !!f && typeof f.pot === "number" && Array.isArray(f.who) && Array.isArray(f.lately) && Array.isArray(f.blessings); });
  }
  /** The fountain as a member is told it. (All the coins the trial knows of are this tester's own; and a tester is called by their letter.) */
  fountain(): FountainTold {
    const today = dayOf(this.now());
    const notes = this.notes().filter((n) => (!n.hidden || n.by === this.id) && n.day >= today - 1).sort((a, b) => b.at - a.at).slice(0, NOTE.shown)
      .map((n): WishNote => ({ id: n.id, by: n.by, wish: n.wish, note: n.note, cheers: n.cheers.length, mine: n.by === this.id, cheered: n.cheers.includes(this.id), reported: n.reports.includes(this.id), hidden: n.hidden, at: n.at }));
    return told(this.kept(), this.id, this.now(), this.purse().coins, (id) => id, undefined, notes);
  }
  private notes(): KeptNote[] { return this.read<KeptNote[]>(NOTES, () => [], (v) => Array.isArray(v)); }
  /** Toss coins into it, towards a wish; with a line of words, if I like (my wish of the day: a new one takes the old one's place). */
  toss(wish: WishId, coins: number, note: string | null = null) {
    const said = tidyNote(note);
    if (note && note.trim() && !said) return { ok: false as const, why: "note" as const };
    const purse = this.purse(), did = toss(purse, this.kept(), this.id, wish, coins, this.now(), purse.coins);
    if (did.ok) {
      this.write(purseKey(this.id), did.purse);
      this.write(FOUNTAIN, did.fountain);
      if (said) {
        const all = this.notes(), day = dayOf(this.now()), mine = all.find((n) => n.by === this.id && n.day === day);
        this.write(NOTES, [...all.filter((n) => n !== mine), { id: mine?.id ?? Math.max(0, ...all.map((n) => n.id)) + 1, by: this.id, day, wish, note: said, cheers: [], reports: [], hidden: false, at: this.now() }]);
      }
      this.tell();
    }
    return did;
  }
  /** Toss coins onto somebody's wish: towards the wish it was for. */
  cheer(id: number, coins: number) {
    const n = this.notes().find((x) => x.id === id && !x.hidden);
    if (!n) return { ok: false as const, why: "gone" as const };
    if (n.by === this.id) return { ok: false as const, why: "none" as const };
    const did = this.toss(n.wish, coins);
    if (did.ok && !n.cheers.includes(this.id)) { this.write(NOTES, this.notes().map((x) => (x.id === id ? { ...x, cheers: [...x.cheers, this.id] } : x))); this.tell(); }
    return did;
  }
  /** Say a wish should not be there (the third report hides it); take my own back. */
  wishReport(id: number) {
    const n = this.notes().find((x) => x.id === id);
    if (!n || n.by === this.id || n.reports.includes(this.id)) return { ok: false as const, why: "none" as const };
    this.write(NOTES, this.notes().map((x) => (x.id === id ? { ...x, reports: [...x.reports, this.id], hidden: x.hidden || x.reports.length + 1 >= NOTE.reports } : x)));
    this.tell();
    return { ok: true as const };
  }
  wishUnsay(id: number) {
    const all = this.notes(), n = all.find((x) => x.id === id && x.by === this.id);
    if (!n) return { ok: false as const, why: "none" as const };
    this.write(NOTES, all.filter((x) => x !== n));
    this.tell();
    return { ok: true as const };
  }
  stall(): Stall {
    return this.read<Stall>(STALL, newStall, (v) => { const s = v as Partial<Stall> | null; return !!s && typeof s.round === "number" && !!s.sold; });
  }

  /** Keep what a rule gave back, if it gave anything. */
  private keep<T extends { purse: Purse; stall?: Stall }>(done: Done<T>): Done<T> {
    if (done.ok) {
      this.write(purseKey(this.id), done.purse);
      if (done.stall) this.write(STALL, done.stall);
      this.tell();
    }
    return done;
  }
  /** Keep a purse as it has become. */
  private save(purse: Purse): Purse { this.write(purseKey(this.id), purse); this.tell(); return purse; }

  buy(item: ItemId, n: number) { return this.keep(buy(this.purse(), this.stall(), item, n, this.now(), this.shelf())); }

  /* ── the uncle's order: the village's, so the browser's ── */
  village(): Village {
    return this.read<Village>(VILLAGE, newVillage, (v) => { const x = v as Partial<Village> | null; return !!x && typeof x.unlocked === "number" && typeof x.day === "number" && !!x.got; });
  }
  /** What the stall has open, and today's order as it stands. */
  shelf(): ItemId[] { return shelfOf(this.village().unlocked); }
  order(): Order { return orderOf(this.village(), this.now()); }
  /** Bring the uncle some of what is in a slot, for today's order. Says how many he took, what he paid, and what it opened (if it filled the order). */
  orderGive(slot: number, n: number): Done<{ purse: Purse; given: number; coins: number; opened: ItemId | null }> {
    const did = give(this.purse(), this.village(), slot, n, this.now());
    if (!did.ok) return did;
    this.write(VILLAGE, did.village);
    this.save(did.purse);
    return did;
  }
  /** For the test window: so many of the uncle's things open (none of them, all of them, one more). */
  setUnlocked(n: number) {
    this.write(VILLAGE, { ...this.village(), unlocked: Math.max(0, Math.min(UNLOCKS.length, Math.floor(n))), opened: -1 });
    this.tell();
  }
  /** The market, brought to this round: each round gone by moves every price once, and is written down. (A trial's village is counted as its fewest heads.) */
  private market(): Market {
    const round = roundOf(this.now()), fresh = this.get(MARKET_AT) === null;
    const kept = this.read<Market>(MARKET_AT, () => newMarket(round), (v) => { const m = v as Partial<Market> | null; return !!m && typeof m.round === "number" && !!m.at && !!m.sold; });
    const did = rolled(kept, round, MARKET.heads, factsOf());
    if (fresh || did.log.length) this.write(MARKET_AT, did.market);
    if (did.log.length) this.write(MARKET_LOG, [...this.marketLog(), ...did.log].slice(-4 * MARKET.lately));
    return did.market;
  }
  private marketLog(): Logged[] { return this.read<Logged[]>(MARKET_LOG, () => [], (v) => Array.isArray(v)); }
  /** What I am told of prices: of what I hold, and of what I have left with the uncle. */
  prices(): PricesTold {
    const p = this.purse(), market = this.market();
    return pricesTold(market, this.marketLog(), [...p.bag.flatMap((s) => (s ? [s.item] : [])), ...p.left.map((l) => l.item)], factsOf());
  }
  /** Leave things with the uncle at this round's price. What is left counts as sold this round; what is taken back in the round it was left in was not sold. */
  leave(slot: number, n: number) {
    const purse = this.purse(), market = this.market(), item = purse.bag[slot]?.item;
    const did = leave(purse, slot, n, this.now(), item ? factorOf(market, item) : 100);
    if (did.ok && item) this.write(MARKET_AT, counted(market, item, n));
    return this.keep(did);
  }
  takeBack(at: number) {
    const purse = this.purse(), lot = purse.left[at], did = takeBack(purse, at, this.now());
    if (did.ok && lot && lot.round === roundOf(this.now())) this.write(MARKET_AT, counted(this.market(), lot.item, -lot.n));
    return this.keep(did);
  }
  collect() { return this.keep(collect(this.purse(), this.now())); }
  change(kind: keyof Purse["popoto"], n: number) { return this.keep(change(this.purse(), kind, n, this.now())); }

  /* ── the notice board: the village's, so the browser's ── */
  private pinboard(): Notices.Pinboard {
    return this.read<Notices.Pinboard>(PINBOARD, Notices.newPinboard, (v) => { const b = v as Partial<Notices.Pinboard> | null; return !!b && typeof b.next === "number" && Array.isArray(b.notices) && !!b.due && !!b.more && Array.isArray(b.sales); });
  }
  /** What may be wanted: whatever has been in a tester's bag or left with the uncle when the board was looked at, what is on a notice, and what is on his shelf. */
  private seen(): ItemId[] {
    const p = this.purse(), was = this.read<ItemId[]>(SEEN, () => [], Array.isArray);
    const now = [...new Set<ItemId>([...was, ...p.bag.flatMap((s) => (s ? [s.item] : [])), ...p.left.map((l) => l.item), ...this.pinboard().notices.map((n) => n.item)])];
    if (now.length !== was.length) this.write(SEEN, now);
    return [...new Set<ItemId>([...now, ...this.shelf()])].sort();
  }
  /** The board as a member is told it. (A tester is called by their letter.) */
  notices(): Notices.PinboardTold { return Notices.told(this.pinboard(), this.id, this.now(), (id) => id, this.seen()); }
  /** Keep what a deed at the board came to, if it came to anything. */
  private pin<T extends { purse: Purse; board: Notices.Pinboard }>(did: ({ ok: true } & T) | { ok: false; why: Notices.NoticeRefusal }) {
    if (did.ok) { this.write(PINBOARD, did.board); this.save(did.purse); }
    return did;
  }
  noticePost(kind: "sell" | "want", item: ItemId, n: number, price: number) { return this.pin(Notices.post(this.purse(), this.pinboard(), this.id, kind, item, n, price, this.now(), this.seen())); }
  noticeBuy(id: number, n: number) { return this.pin(Notices.buy(this.purse(), this.pinboard(), this.id, id, n, this.now())); }
  noticeFill(id: number, n: number) { return this.pin(Notices.fill(this.purse(), this.pinboard(), this.id, id, n, this.now())); }
  noticeFetch(id: number) { return this.pin(Notices.fetch(this.purse(), this.pinboard(), this.id, id)); }
  noticeDown(id: number) { return this.pin(Notices.takeDown(this.purse(), this.pinboard(), this.id, id)); }
  noticeCollect() { return this.pin(Notices.collectDue(this.purse(), this.pinboard(), this.id)); }
  noticeSlot() { return this.pin(Notices.moreSlot(this.purse(), this.pinboard(), this.id)); }

  /** Sit down to the dish in a slot of the bag (somebody standing is refused). */
  sitDown(slot: number, seated: boolean) { return this.keep(sitDown(this.purse(), slot, seated, this.now())); }
  /** Count the meal on to now, with so many eating beside one. Says whether it has just been finished. */
  chew(company: number): boolean {
    const before = this.purse();
    if (!before.eating) return false;
    const { purse, done } = chew(before, company, this.now());
    this.save(purse);
    return done;
  }
  getUp(company: number) { const p = this.purse(); if (p.eating) this.save(getUp(p, company, this.now())); }
  readScroll(slot: number) { return this.keep(readScroll(this.purse(), slot)); }
  /** Open what may hold something (an old boot, a bottle, a chest): says what was in it, if anything. */
  openThing(slot: number) { return this.keep(open(this.purse(), slot, [Math.random(), Math.random()])); }

  /** Take up the thing in a slot of the bag, to hold it in the hand; or put away what is held. */
  hold(slot: number) { return this.keep(hold(this.purse(), slot)); }
  letGo() { this.save(letGo(this.purse())); }

  /** Put a bait on the hook: one of it leaves the bag (a bait that is not eaten stays, and is lost only with a snapped line). A rod has to be in the bag too. */
  bait(bait: BaitId): Done<{ purse: Purse }> { return this.keep(hookBait(this.purse(), bait)); }
  /** The line snapped: a bait that was not eaten goes with it. */
  lose(bait: BaitId) { this.save(loseBait(this.purse(), bait)); }
  /** Spend the stamina a fight costs. */
  spend(n: number) { this.save(spend(this.purse(), n, this.now())); }
  /** Land what was caught: into the bag when there is room for it, and, a fish, onto the record when it is the longest of its kind yet. */
  land(what: CatchId, size: number): { kept: boolean; record: boolean } {
    const { purse, kept, record } = landCatch(this.purse(), what, size);
    this.save(purse);
    return { kept, record };
  }
  /* ── the farm: one for the browser, like the stall, so that two testers in two tabs tend the same plots ── */
  /** Every plot that is not weeds, by its tile. */
  farm(): Record<string, Plot> {
    return this.read<Record<string, Plot>>(FARM, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
  }
  /** The beds that have been somebody's, by their number (lib/town/world's bedOf), and how many buckets of water the well holds. */
  beds(): Record<string, KeptBed> {
    return this.read<Record<string, KeptBed>>(BEDS, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
  }
  well(): number {
    return this.read<number>(WELL, () => 0, (v) => typeof v === "number" && v >= 0 && v <= WATER.well);
  }
  /** How many plots of each bed have a plant in them. */
  private plantedIn(plots: Record<string, Plot>): Map<number, number> {
    const n = new Map<number, number>();
    for (const [key, plot] of Object.entries(plots)) {
      if (!plot.plant) continue;
      const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
      n.set(bed, (n.get(bed) ?? 0) + 1);
    }
    return n;
  }
  /** Whose every bed is now: the beds that are somebody's, with their owner's name. */
  owners(): Map<number, { by: string; name: string }> {
    const now = this.now(), planted = this.plantedIn(this.farm()), out = new Map<number, { by: string; name: string }>();
    for (const [n, bed] of Object.entries(this.beds())) {
      const by = ownerOf(bed, (planted.get(Number(n)) ?? 0) > 0, now);
      if (by) out.set(Number(n), { by, name: bed.name || by });
    }
    return out;
  }
  /** What the thing in my hand can do to a plot now, if anything. */
  deedAt(key: string): Deed | null {
    const [x, y] = key.split(",").map(Number);
    return deedFor(key, this.farm()[key] ?? WILD, handOf(this.purse()), this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, SKIES.rains());
  }
  /** Do to a plot what the thing in my hand does: clear it, till it, dig its plant out (a living one only when it is `sure`), sow it, water it, feed it, cure it, pick it. Says what was done and what came of it, or why not. */
  farmDo(key: string, name = "", sure = false): { ok: true; deed: Deed; got: Array<[ItemId, number]> } | { ok: false; why: Refusal | FarmRefusal } {
    const p = this.purse(), now = this.now(), plots = this.farm(), plot = plots[key] ?? WILD, beds = this.beds();
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), planted = this.plantedIn(plots);
    const holds = [...this.owners()].filter(([n, o]) => n !== bed && o.by === this.id).length;
    const did = tend(key, plot, beds[bed], (planted.get(bed) ?? 0) - (plot.plant ? 1 : 0), holds, p, this.id, now, SKIES.rains(), sure);
    if (!did.ok) return did;
    const next = { ...plots };
    if (did.plot.soil === "wild" && !did.plot.plant) delete next[key]; else next[key] = did.plot;
    this.write(FARM, next);
    const kept = { ...beds };
    if (!did.bed) delete kept[bed];
    else kept[bed] = { ...did.bed, name: (did.bed.by === beds[bed]?.by && beds[bed]?.name) || name || did.bed.by };
    this.write(BEDS, kept);
    // (a plot sown anew forgets who helped the plant that was there)
    if (did.deed === "sow") this.wellSeen({ by: this.id, at: now, what: "sow", tile: [x, y] });
    // (a plant watered is a line of the well's book: with which can, and whose plant when not my own)
    if (did.deed === "water") this.wellSeen({ by: this.id, at: now, what: "water", can: handOf(p) ?? undefined, tile: [x, y], ...(plot.plant && plot.plant.by !== this.id ? { whose: plot.plant.by } : {}) });
    this.save(did.purse);
    return { ok: true, deed: did.deed, got: did.got };
  }
  /** What the thing in my hand can do with water where I stand (by the river, or at the well), if anything; and doing it. */
  choreAt(where: "river" | "well" | null): Chore | null { return choreFor(this.purse(), where, this.well()); }
  choreDo(where: "river" | "well" | null): { ok: true; chore: Chore } | { ok: false; why: Refusal } {
    const p = this.purse(), well = this.well(), now = this.now(), did = chore(p, where, well, now);
    if (!did.ok) return did;
    this.write(WELL, did.well);
    // (the well's book: so many bucketfuls poured; a can filled)
    if (did.chore === "pour") this.wellSeen({ by: this.id, at: now, what: "pour", n: did.well - well });
    else if (did.chore === "fill") this.wellSeen({ by: this.id, at: now, what: "fill", can: handOf(p) ?? undefined });
    this.save(did.purse);
    return { ok: true, chore: did.chore };
  }
  /* ── the forest: what each place has is everybody's, so the browser's ── */
  /** The word the forest's rolls hang on: made once for the browser (the database has one of its own, that nobody reads). */
  private salt(): string {
    let s = this.get(WILD_SALT);
    if (!s) { s = Math.random().toString(36).slice(2, 12); this.set(WILD_SALT, s); }
    return s;
  }
  /** Who has taken from each place in which turn: by "place:turn". */
  private took(): Record<string, string[]> {
    return this.read<Record<string, string[]>>(WILD_TOOK, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
  }
  /** Every place of the forest that has something for me now. */
  wild(): Sight[] {
    const took = this.took();
    return sights(this.salt(), this.now(), SKIES.rains(), (spot, turn) => { const who = took[`${spot.id}:${turn}`] ?? []; return { n: who.length, mine: who.includes(this.id) }; });
  }
  /** Gather what a place has, from the tile I stand on, with how its game went. Says what came of it, or why not. */
  gatherDo(id: number, at: [number, number], went: Outcome): { ok: true; got: Array<[ItemId, number]> } | { ok: false; why: Refusal | ForestRefusal } {
    const spot = SPOTS[id];
    if (!spot) return no("none");
    const now = this.now(), has = holds(this.salt(), spot, now, SKIES.rains()), took = this.took(), key = `${id}:${has?.turn ?? 0}`, who = took[key] ?? [];
    const did = gather(this.purse(), spot, has, who.length, who.includes(this.id), handOf(this.purse()), at, went, now);
    if (!did.ok) return did;
    // (turns gone by are forgotten: only what the places have now is kept)
    const kept = Object.fromEntries(Object.entries(took).filter(([k]) => { const [s, t] = k.split(":").map(Number); return !!SPOTS[s] && t >= turnOf(SPOTS[s], now); }));
    this.write(WILD_TOOK, { ...kept, [key]: [...who, this.id] });
    this.save(did.purse);
    return { ok: true, got: did.got };
  }
  /** For scripts trying things out: the word the forest's rolls hang on, as it is told (so that what a place has can be known beforehand). */
  setSalt(word: string) { this.set(WILD_SALT, word); this.set(WILD_TOOK, null); this.set(BUG_TOOK, null); this.tell(); }

  /* ── insects: what each haunt has is everybody's too, rolled from the same word ── */
  /** Who has caught each haunt's insect in which turn: by "haunt:turn". */
  private netted(): Record<string, string[]> {
    return this.read<Record<string, string[]>>(BUG_TOOK, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
  }
  /** For scripts trying things out: the insect a haunt has, whatever the rolls say (in this tab; null lets the rolls say again). */
  private forced = new Map<number, BugId>();
  setBug(haunt: number, bug: BugId | null) { if (bug) this.forced.set(haunt, bug); else this.forced.delete(haunt); this.tell(); }
  /** What a haunt has now. */
  private swarm(h: Haunt, now: number): Swarm | null {
    const bug = this.forced.get(h.id);
    if (!bug) return swarmAt(this.salt(), h, now, SKIES.rains());
    const turn = bugTurn(h, now);
    return { turn, bug, n: BUGS[bug].n[0], seed: h.id * 100003 + turn };
  }
  /** Every haunt that has an insect for me now. */
  bugs(): BugSight[] {
    const took = this.netted(), now = this.now();
    const mine = (h: Haunt, turn: number) => { const who = took[`${h.id}:${turn}`] ?? []; return { n: who.length, mine: who.includes(this.id) }; };
    const rolled = swarms(this.salt(), now, SKIES.rains(), mine).filter((s) => !this.forced.has(s.id));
    const told = [...this.forced.keys()].flatMap((id) => {
      const h = HAUNTS[id], has = h ? this.swarm(h, now) : null, t = has ? mine(h, has.turn) : null;
      return has && t && !t.mine && t.n < HAUNT_KINDS[h.kind].shares ? [{ id, bug: has.bug, turn: has.turn, seed: has.seed }] : [];
    });
    return [...rolled, ...told];
  }
  /** The village's book of insects: who first caught each kind. */
  bugBook(): Record<string, string> { return this.read<Record<string, string>>(BUG_BOOK, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v)); }
  /** Catch what a haunt has, from the tile I stand on, after so many swings that missed. Says what came of it and whether it is the village's first, or why not. */
  netDo(id: number, at: [number, number], misses: number, lure: ItemId | null, name: string): { ok: true; got: Array<[ItemId, number]>; first: boolean; rid: string | null } | { ok: false; why: Refusal | BugRefusal } {
    const h = HAUNTS[id];
    if (!h) return no("none");
    const now = this.now(), has = this.swarm(h, now), took = this.netted(), key = `${id}:${has?.turn ?? 0}`, who = took[key] ?? [];
    const did = net(this.purse(), h, has, who.length, who.includes(this.id), handOf(this.purse()), at, misses, now, lure);
    if (!did.ok) return did;
    const kept = Object.fromEntries(Object.entries(took).filter(([k]) => { const [s, t] = k.split(":").map(Number); return !!HAUNTS[s] && t >= bugTurn(HAUNTS[s], now); }));
    this.write(BUG_TOOK, { ...kept, [key]: [...who, this.id] });
    const book = this.bugBook(), first = !book[has!.bug];
    if (first) this.write(BUG_BOOK, { ...book, [has!.bug]: name || this.id });
    // a ladybird, now and then: some plant of the farm is rid of its pest, as a cure rids it
    let rid: string | null = null;
    const rids = BUGS[has!.bug].rids ? this.ridChance ?? BUGS[has!.bug].rids! : 0;
    if (rids > 0 && Math.random() < rids) {
      const farm = this.farm();
      rid = pestToRid(farm, now, SKIES.rains(), Math.random());
      if (rid) this.write(FARM, { ...farm, [rid]: { ...farm[rid], plant: { ...farm[rid].plant!, cured: now } } });
    }
    this.save(did.purse);
    return { ok: true, got: did.got, first, rid };
  }
  /** For scripts trying things out: how likely an insect that may take a pest with it does, whatever its own chance is (in this tab; null: its own). */
  private ridChance: number | null = null;
  setRidChance(chance: number | null) { this.ridChance = chance; }

  /* ── the well's book (lib/town/well) ── */
  private wellLog(): WellLog {
    // (a log kept before it remembered who helped each plant, or what each did in a round, is given those as empty)
    return { ...newLog(), ...this.read<WellLog>(WELL_LOG, newLog, (v) => { const l = v as Partial<WellLog> | null; return !!l && Array.isArray(l.water) && !!l.cans && !!l.carriers && !!l.days && !!l.reach && !!l.hands; }) };
  }
  private wellSeen(deed: WaterDeed) { this.write(WELL_LOG, seen(this.wellLog(), deed)); }
  /** The book as I read it now; a carrier is called what their bed is called by, if they have one. */
  wellBook(): WellBook {
    const names = new Map([...this.owners().values()].map((o) => [o.by, o.name]));
    return bookOf(this.wellLog(), this.id, this.now(), (id) => names.get(id) ?? id);
  }
  ranks(): Record<string, number> { return ranksOf(this.wellLog()); }
  wellTake(): { ok: true; gift: ItemId; rank: number } | { ok: false; why: Refusal } {
    const did = takeGift(this.purse(), this.wellLog(), this.id);
    if (!did.ok) return did;
    this.write(WELL_LOG, did.log);
    this.save(did.purse);
    return { ok: true, gift: did.gift, rank: did.rank };
  }
  /* ── thanks, and the jar at the well (lib/town/thanks, lib/town/jar) ── */
  private nameOf(): (id: string) => string {
    const names = new Map([...this.owners().values()].map((o) => [o.by, o.name]));
    return (id) => names.get(id) ?? id;
  }
  private given(): Thanks[] { return this.read<Thanks[]>(THANKS, () => [], Array.isArray); }
  toThank(): Record<string, Array<Helper & { name: string }>> {
    const name = this.nameOf();
    return Object.fromEntries(Object.entries(toThank(this.wellLog(), this.given(), this.id, this.now())).map(([plot, list]) => [plot, list.map((h) => ({ ...h, name: name(h.id) }))]));
  }
  thankAt(key: string): { ok: true; thanked: string[] } | { ok: false; why: Refusal } {
    const did = thank(this.wellLog(), this.given(), key, this.id, this.now());
    if (!did.ok) return did;
    this.write(THANKS, did.given);
    this.tell();
    return { ok: true, thanked: did.thanked };
  }
  thanksBoard(): ThanksBoard { return boardOf(this.given(), this.id, this.now(), this.nameOf()); }
  /** The jar and what waits at it, shared out first if a round has turned. */
  private jarKept(): { jar: Jar; owed: Owed } {
    const now = this.now();
    const kept = this.read<{ jar: Jar; owed: Owed }>(JAR, () => ({ jar: newJar(roundOf(now)), owed: {} }), (v) => { const k = v as { jar?: Partial<Jar>; owed?: unknown } | null; return !!k && !!k.jar && typeof k.jar.round === "number" && Array.isArray(k.jar.things) && !!k.owed; });
    const did = settle(kept.jar, kept.owed, this.wellLog(), now);
    if (did.jar !== kept.jar || did.owed !== kept.owed) this.write(JAR, { jar: did.jar, owed: did.owed });
    return { jar: did.jar, owed: did.owed };
  }
  jar(): JarTold {
    const { jar, owed } = this.jarKept();
    return { ...jar, next: nextRoundAt(this.now()), mine: owed[this.id] ?? null };
  }
  jarDrop(what: { coins: number } | { slot: number; n: number }): { ok: true } | { ok: false; why: Refusal } {
    const { jar, owed } = this.jarKept(), did = jarDrop(this.purse(), jar, what);
    if (!did.ok) return did;
    this.write(JAR, { jar: did.jar, owed });
    this.save(did.purse);
    return { ok: true };
  }
  jarTake(): { ok: true; coins: number; things: Array<[ItemId, number]> } | { ok: false; why: Refusal } {
    const { jar, owed } = this.jarKept(), did = jarCollect(this.purse(), owed, this.id);
    if (!did.ok) return did;
    this.write(JAR, { jar, owed: did.owed });
    this.save(did.purse);
    return { ok: true, coins: did.coins, things: did.things };
  }
  /** For scripts and the test window: so many bucketfuls poured, all told, as mine. */
  setCarried(buckets: number) {
    const log = this.wellLog(), mine = log.carriers[this.id] ?? { buckets: 0, taken: [] };
    this.write(WELL_LOG, { ...log, carriers: { ...log.carriers, [this.id]: { ...mine, buckets: Math.max(0, Math.floor(buckets)) } } });
    this.tell();
  }

  /** For scripts trying things out: a plot as it is told (a plant sown days ago that a pest has had, say: nothing else brings one about for certain). */
  setPlot(key: string, plot: Plot) { this.write(FARM, { ...this.farm(), [key]: plot }); this.tell(); }
  /** For the test window: so many buckets in the well. */
  setWell(buckets: number) { this.write(WELL, Math.max(0, Math.min(WATER.well, Math.floor(buckets)))); this.tell(); }
  /**
   * For the test window: the four beds round the well planted as a show garden, mine (the owner: "ขอวิธี test การปลูกพืช
   * ให้ผมด้วย อยากรู้ว่า แต่ละอันมีกี่ state และ หน้าตาตอนโตเต็มที่เป้นยังไงบ้าง"). Every vegetable has a row of its own, seven
   * rows to a bed, and along it each stage of its growing, from what was sown to ripe. No pest comes to them; the
   * clock moves them on like any plant. Says where its first plot is.
   */
  showGarden(name = ""): [number, number] {
    const now = this.now(), plots = { ...this.farm() }, beds = { ...this.beds() }, never = now + 365 * 24 * 3_600_000;
    SHOW_BEDS.forEach((bed, b) => {
      const [bx, by] = bedCorner(bed);
      for (let v = 0; v < 7; v++) for (let u = 0; u < 7; u++) delete plots[`${bx + u},${by + v}`];
      CROP_IDS.slice(b * 7, b * 7 + 7).forEach((crop, v) => {
        for (let stage = 1; stage <= STAGES; stage++) {
          // the middle of each stage; the last, just ripe
          const part = stage === STAGES ? 1 : (STAGE_AT[stage - 1] + STAGE_AT[stage]) / 2;
          plots[`${bx + stage - 1},${by + v}`] = {
            soil: "tilled",
            plant: { by: this.id, crop, sown: now - part * CROPS[crop].hours * 3_600_000, boost: 0, watered: 0, fed: 0, guard: never, cured: 0, picked: 0, pickedAt: 0 },
          };
        }
      });
      beds[bed] = { by: this.id, tended: now, empty: 0, name: name || this.id };
    });
    this.write(FARM, plots);
    this.write(BEDS, beds);
    this.tell();
    return bedCorner(SHOW_BEDS[0]);
  }
  /** For the test window: the whole farm back to weeds, and every bed nobody's. */
  clearFarm() { this.set(FARM, null); this.set(BEDS, null); this.tell(); }

  /* ── the kitchen: the pots set down and what has been found are the browser's, like the farm ── */
  /** The pots of food that stand about, for anybody with a bowl. */
  pots(): Pot[] { return this.read<Pot[]>(POTS, () => [], Array.isArray); }
  /** Everything anybody in this browser has made at least once: a find is everybody's (the owner: "เจอ 1 คน เท่ากับ ทุกคนรู้สูตร"). */
  found(): ItemId[] { return this.read<ItemId[]>(FOUND, () => [], Array.isArray); }
  /** Who found each of them first, as they were called then. */
  finders(): Record<string, string> { return this.read<Record<string, string>>(FINDERS, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v)); }
  finder(id: ItemId): string | null { return this.finders()[id] ?? null; }
  /** Whether I have made a thing myself, and so read all of its recipe (anybody else reads all but its last thing: lib/town/hints). */
  madeBefore(id: ItemId): boolean { return hasMade(this.purse(), id); }
  /** How many times I have missed a recipe by its last thing alone (lib/town/cooking). */
  triesAt(id: ItemId): number { return this.purse().tries?.[id] ?? 0; }
  /** The recipes I can read: the dishes I have read of or made, and those anybody has found; and what else is known to be made. */
  known(): DishId[] {
    const p = this.purse();
    return [...new Set<ItemId>([...p.recipes, ...this.found()])].filter((id): id is DishId => id in DISHES);
  }
  knownMakes(): ItemId[] { const p = this.purse(); return [...new Set<ItemId>([...(p.made ?? []), ...p.recipes, ...this.found()])].filter((id) => !(id in DISHES)); }
  /** Whether putting some things together would be refused, and why (nothing is done). */
  cookTry(things: Array<[ItemId, number]>, crew: Array<ItemId | null>): Refusal | null {
    const did = cook(this.purse(), things, crew, 0, this.now());
    return did.ok ? null : did.why;
  }
  /**
   * Put some things together, having stirred with so many misses. Says what came of it, and whether it is a find:
   * the first time anybody made it, which is written down with the name of whoever did. What I have made is written
   * in my purse, and I read all of its recipe from then on. The odd dish is nobody's find.
   */
  cookDo(things: Array<[ItemId, number]>, crew: Array<ItemId | null>, misses: number, name = ""): Done<{ purse: Purse; made: ItemId | null; n: number; first: boolean; taste?: Taste }> {
    const did = cook(this.purse(), things, crew, misses, this.now());
    if (!did.ok) return did;
    const made = isFind(did.made) ? did.made : null, found = this.found(), first = !!made && !found.includes(made);
    let purse = did.purse;
    if (made && made in DISHES && !purse.recipes.includes(made as DishId)) purse = { ...purse, recipes: [...purse.recipes, made as DishId] };
    if (made && !hasMade(purse, made)) purse = { ...purse, made: [...(purse.made ?? []), made] };
    if (first && made) { this.write(FOUND, [...found, made]); this.write(FINDERS, { ...this.finders(), [made]: name || this.id }); }
    this.save(purse);
    return { ...did, purse, first };
  }
  /** Set the pot of food I hold down where I stand, if nothing stands there and I have not left too many about already. */
  potDown(at: [number, number]): Done<{ purse: Purse; pot: Pot }> {
    const p = this.purse(), pots = this.pots();
    if (pots.some((o) => Math.abs(o.at[0] - at[0]) <= 1 && Math.abs(o.at[1] - at[1]) <= 1)) return no("taken");
    if (pots.filter((o) => o.by === this.id).length >= COOKING.pots) return no("many");
    const did = setDown(p, p.bag.findIndex((s) => s?.item === "potFull"), this.id, at, `${this.id}-${this.now()}`);
    if (!did.ok) return did;
    this.write(POTS, [...pots, did.pot]);
    this.save(did.purse);
    return did;
  }
  /** Ladle a helping out of a pot that stands about, into my bowl. Its last helping out, the pot is gone. */
  potLadle(id: string): Done<{ purse: Purse; pot: Pot | null }> {
    const pots = this.pots(), pot = pots.find((o) => o.id === id);
    if (!pot) return no("gone");
    const did = ladle(this.purse(), pot);
    if (!did.ok) return did;
    const left = did.pot;
    this.write(POTS, left ? pots.map((o) => (o.id === id ? left : o)) : pots.filter((o) => o.id !== id));
    this.save(did.purse);
    return did;
  }
  /** Take my pot of food up again. */
  potTake(id: string): Done<{ purse: Purse }> {
    const pots = this.pots(), pot = pots.find((o) => o.id === id);
    if (!pot) return no("gone");
    const did = takeUp(this.purse(), pot, this.id);
    if (!did.ok) return did;
    this.write(POTS, pots.filter((o) => o.id !== id));
    this.save(did.purse);
    return did;
  }
  /** Ladle a helping out of the pot in a slot of my own bag, into my bowl. */
  serve(slot: number) { return this.keep(serve(this.purse(), slot)); }
  /** The uncle's next hint for me (of what can be made with what he sells so far), and buying it. */
  nextHint(): ItemId | null { const at = sourcesAt(this.village().unlocked, true); return nextHint(this.purse(), this.found(), (id) => at.has(id)); }
  hint() { const at = sourcesAt(this.village().unlocked, true); return this.keep(buyHint(this.purse(), this.found(), (id) => at.has(id))); }
  /** Put on what carries more, from a slot of the bag; and take one off. */
  wear(slot: number) { return this.keep(wear(this.purse(), slot)); }
  takeOff(item: ItemId) { return this.keep(takeOff(this.purse(), item)); }

  /* ── a deal with another tester of this browser: both purses are here, so the swap is one write ── */
  private deals(): KeptDeal[] {
    const real = Date.now();
    return this.read<KeptDeal[]>(DEALS, () => [], Array.isArray).filter((d) => !d.end || real - (d.endAt ?? 0) < ENDED_MS);
  }
  /** The deal I am in (open, or just ended), if any. */
  deal(): KeptDeal | null { return this.deals().find((d) => sideOf(d, this.id)) ?? null; }
  /** Open a deal with somebody. Refused when either of us is in one already. */
  dealOpen(other: string, myName: string, otherName: string): Done<{ deal: Deal }> {
    const all = this.deals();
    if (other === this.id) return no("none");
    if (all.some((d) => !d.end && (sideOf(d, this.id) || sideOf(d, other)))) return no("busy");
    const deal = newDeal(this.id, other, { a: myName, b: otherName }, this.now());
    this.write(DEALS, [...all.filter((d) => !sideOf(d, this.id)), deal]);
    this.tell();
    return { ok: true, deal };
  }
  private dealPut(next: KeptDeal) {
    this.write(DEALS, this.deals().map((d) => (d.a === next.a && d.b === next.b && d.at === next.at ? next : d)));
    this.tell();
  }
  /** Lay out my side of the deal: its things, and its coins. */
  dealLay(give: Give, coins = 0): Done<{ deal: Deal }> {
    const deal = this.deal();
    if (!deal || deal.end) return no("gone");
    const did = lay(deal, this.id, this.purse(), give, coins);
    if (did.ok) this.dealPut(did.deal);
    return did;
  }
  /** Give my word (or take it back). When both have, everything changes hands: says so. */
  dealAgree(word = true): Done<{ done: boolean }> {
    const deal = this.deal();
    if (!deal || deal.end) return no("gone");
    const did = agree(deal, this.id, word);
    if (!did.ok) return did;
    if (!did.deal.ok.a || !did.deal.ok.b) { this.dealPut(did.deal); return { ok: true, done: false }; }
    // both purses are in this browser: the other's is read and written here too
    const other = deal.a === this.id ? deal.b : deal.a, raw = this.get(purseKey(other));
    if (raw === null) return no("gone");
    const theirs = JSON.parse(raw) as Purse, mine = this.purse();
    const done = deal.a === this.id ? swap(did.deal, mine, theirs) : swap(did.deal, theirs, mine);
    if (!done.ok) { this.dealPut({ ...did.deal, ok: { a: false, b: false } }); return done; }
    this.write(purseKey(other), deal.a === this.id ? done.b : done.a);
    this.dealPut({ ...did.deal, end: "done", endAt: Date.now() });
    this.save(deal.a === this.id ? done.a : done.b);
    return { ok: true, done: true };
  }
  /** Call the deal off. */
  dealCancel() {
    const deal = this.deal();
    if (deal && !deal.end) this.dealPut({ ...deal, end: "off", endAt: Date.now() });
  }

  /** Write a go at a mini-game down, whatever its end: onto the log, and into the tally. */
  record(play: Play) {
    this.write(playsKey(this.id), keep(this.plays(), play));
    this.write(tallyKey(this.id), count(this.tally(), play));
    this.tell();
  }
  /** My goes at the mini-games, the oldest first (the log keeps only its newest), and the tally of them all. */
  plays(): Play[] { return this.read<Play[]>(playsKey(this.id), () => [], Array.isArray); }
  tally(): Tally {
    return this.read<Tally>(tallyKey(this.id), newTally, (v) => { const t = v as Partial<Tally> | null; return !!t && !!t.games && !!t.fishing?.caught && !!t.fishing.places; });
  }
  /** Throw away what is in a slot (to make room). */
  drop(slot: number) { const p = this.purse(); this.save({ ...p, bag: p.bag.map((b, i) => (i === slot ? null : b)) }); }
  /** For scripts trying things out: put something in the bag, as much of it as fits, and coins in the purse. */
  grant(item: ItemId, n: number, coins = 0) {
    const p = this.purse();
    this.save({ ...p, coins: p.coins + coins, bag: put(p.bag, item, Math.min(n, roomFor(p.bag, item))) });
  }

  /* ── for the test window (TownTest), which is the owner's way to look at everything and try anything ── */
  /** So much stamina left today: none, to try how much harder everything is without it. */
  setStamina(left: number) {
    this.save({ ...this.purse(), stamina: { day: dayOf(this.now()), left: Math.max(0, Math.min(STAMINA.max, left)) } });
  }
  /** A bag of so many slots. One that is growing keeps everything; one that is shrinking keeps what fits in front, and says no when a slot to go is full. */
  resize(slots: number): boolean {
    const p = this.purse(), n = Math.max(1, Math.floor(slots));
    if (p.bag.slice(n).some(Boolean)) return false;
    this.save({ ...p, bag: Array.from({ length: n }, (_, i) => p.bag[i] ?? null) });
    return true;
  }
  /** Know a dish's recipe without having found it: as a scroll tells it, or (`whole`) as somebody who has made it knows it. */
  learn(dish: DishId, whole = false) {
    const p = this.purse(), made = p.made ?? [];
    this.save({ ...p, recipes: p.recipes.includes(dish) ? p.recipes : [...p.recipes, dish], made: !whole || made.includes(dish) ? made : [...made, dish] });
  }
  /** Empty the bag. */
  empty() { const p = this.purse(); this.save({ ...p, bag: p.bag.map(() => null) }); }
  /** Forget every go at the mini-games: the log and the tally. */
  forget() {
    for (const key of [playsKey(this.id), tallyKey(this.id)]) this.set(key, null);
    this.tell();
  }

  /** Put the clock forward to just after the relatives next come. */
  skipRound() {
    const now = this.now();
    this.write(CLOCK, now - Date.now() + (nextRoundAt(now) - now) + 1000);
    this.tell();
  }
  /** Put the clock forward by so many hours: to try another hour's fish, or the next meal. */
  skipHours(hours: number) {
    this.write(CLOCK, this.now() - Date.now() + hours * 3_600_000);
    this.tell();
  }
  /** Begin again: my purse, the stall, its prices, the farm and the clock as they were at first. (What was played stays written down.) */
  reset() {
    for (const key of [purseKey(this.id), STALL, MARKET_AT, MARKET_LOG, CLOCK, FARM, WELL, WELL_LOG, THANKS, JAR, BEDS, POTS, FOUND, FINDERS, DEALS, VILLAGE]) this.set(key, null);
    this.tell();
  }
}

const trials = new Map<string, Trial>();
/** The one trial for somebody in this tab: the stall's panel, the fishing and the map all watch the same one. */
export function trialFor(id: string): Trial {
  let t = trials.get(id);
  if (!t) { t = new Trial(id); trials.set(id, t); }
  return t;
}
