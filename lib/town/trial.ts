import { newBox, roomyBox, stow, unstow, type Box } from "./box";
import { cook, feastEat, hasMade, isFind, ladle, mayLeave, serve, setDown, takeUp, tidied, type Pot, type Taste } from "./cooking";
import { WATER, WILD, chore, choreFor, deedFor, inPestHours, ownerOf, pestHour, tend, type Bed, type Chore, type Deed, type FarmRefusal, type FarmSky, type Plot, type Swarms } from "./farm";
import { agree, lay, newDeal, sideOf, swap, type Deal, type Give } from "./deal";
import { backBait, hookBait, landCatch, loseBait } from "./fishing";
import { gather, holds, lanternLit, placeAt, ruleOf, sights, turnOf, type ForestRefusal, type Outcome, type Sight } from "./forest";
import { huntTold, mapDig, mapUse, type HuntTold } from "./hunt";
import { count as countLine, countsOf, newLine, type Done as Deeded, type LineKept } from "./line-points";
import { GIFTS, USES, giftsOf, stretchOf, takeGift as takeRankGift, useGift, wearCharms, wearFamiliar, wearing, type GiftId, type GiftRefusal } from "./gifts";
import { LINE_IDS, mayWear, noLines, wornOf, type LineId, type LinesTold, type Worn } from "./lines";
import { BUGS, HAUNTS, HAUNT_KINDS, SCARCE, bugTurn, comeback, farmBugs, hereFor, nectar, net, netMine, swarms, type BugId, type BugRefusal, type BugSight, type Comeback, type Haunt, type Hunt, type Mine, type Swarm, pestToRid } from "./insects";
import { NOTE, blessed, newFountain, tidyNote, told, toss, type Fountain, type FountainTold, type WishId, type WishNote } from "./fountain";
import { drop as dropDown, lying, pickUp, type Dropped } from "./ground";
import * as Shops from "./shop";
import { buyHint, hintPrice, hintsLeft } from "./hints";
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
import { KITCHEN, bedCorner, bedOf, yardFloor } from "./world";
import { collect as jarCollect, drop as jarDrop, newJar, settle, type Jar, type JarTold, type Owed } from "./jar";
import { boardOf, thank, toThank, type Helper, type Thanks, type ThanksBoard } from "./thanks";
// ── gifts: kitchen ──
import { basketEat, basketPut, basketTake, cookWith, spiceEat, spoon, type CookHow, type Gifted } from "./cooking";
import { bookOf, newLog, ranksOf, seen, takeGift, type WaterDeed, type WellBook, type WellLog } from "./well";
import { ditch, reachOf } from "./ditch";
import { hotAt } from "./heat";
import { canPour, freshen, pourIn } from "./yard";
import { carried, pass, type PassRefusal } from "./line";
import { keptAs, natureAt, natureOf, pouredIn, type Nature, type WellWater } from "./waters";
// ── gifts: farming ──
import { glassReach, glassTurn, gnomeReach, gnomeWater, plotKey, rowFor, rowTend, type RowDeed } from "./farm";
import { rowOf } from "./world";
// ── gifts: well ──
import { MOON, drinkOffer, drinkTake, moonKeep, moonPour, rainFill, type WellGiftRefusal } from "./well-gifts";
// ── gifts: helpers ──
import { dust, pourFor, pourRow } from "./farm";
import { aided, belled, pouredAs, ring, share, type HelpRefusal } from "./helping";

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
const BUG_TOOK = "cashtown.trial.bugs.took.1", BUG_BOOK = "cashtown.trial.bugs.book.1", BUG_BACK = "cashtown.trial.bugs.back.1";
/** The hours the farm was counted with insects that eat plants on it (lib/town/farm's Swarms). */
const SWARMS = "cashtown.trial.farm.swarms.1";
/** Every insect caught in this browser within the day: what the scarcity of each kind is counted from. */
const BUG_HUNTS = "cashtown.trial.bugs.hunts.1";
/** The well's book (lib/town/well): whose water is where, for the whole browser. */
const WELL_LOG = "cashtown.trial.welllog.1";
// Everybody's lines of work as they are kept, by member and by line (lib/town/line-points), and the title each wears.
const LINES_AT = "cashtown.trial.lines.1", TITLES = "cashtown.trial.titles.1";
/** The thanks given (lib/town/thanks), and the jar at the well with what waits at it for each (lib/town/jar): the whole browser's. */
const THANKS = "cashtown.trial.thanks.1", JAR = "cashtown.trial.jar.1";
/** The bucketfuls in the cooking yard's water jar (lib/town/yard): the whole browser's. */
const YARD_JAR = "cashtown.trial.yardjar.1";
/** The stalls under signs (lib/town/shop): the whole browser's, each by its keeper, so that one tester buys at another's. */
const SHOPS = "cashtown.trial.shops.1";
/** What lies on the ground (lib/town/ground): the whole browser's, so that one tester picks up what another dropped. */
const GROUND_AT = "cashtown.trial.ground.1";
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
/** What a tester keeps in the plaza's storage box (lib/town/box): each tester's own, like a purse. */
const boxKey = (id: string) => `cashtown.trial.box.1.${id}`;
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

  /* ── the storage box in the plaza: each tester's own ── */
  box(): Box {
    return roomyBox(this.read<Box>(boxKey(this.id), newBox, (v) => { const b = v as Partial<Box> | null; return !!b && Array.isArray(b.things) && typeof b.more === "number"; }));
  }
  /** Keep what a deed at the box came to. (What goes into a box has been in a bag: the notice board counts it as met, though it may never be in one when the board is looked at.) */
  private boxed<T extends { purse: Purse; box: Box; item: ItemId }>(did: ({ ok: true } & T) | { ok: false; why: Refusal | "far" | "packed" }) {
    if (!did.ok) return did;
    const met = this.read<ItemId[]>(SEEN, () => [], Array.isArray);
    if (!met.includes(did.item)) this.write(SEEN, [...met, did.item]);
    this.write(boxKey(this.id), did.box);
    this.save(did.purse);
    return did;
  }
  /** Put so many of what is in a slot of my bag away in my box; take so many of what is in a slot of the box out. */
  boxPut(slot: number, n: number, at: [number, number]) { return this.boxed(stow(this.purse(), this.box(), slot, n, at)); }
  boxTake(slot: number, n: number, at: [number, number]) { return this.boxed(unstow(this.purse(), this.box(), slot, n, at)); }
  /** For scripts and the test window: a box with so many slots beyond the free ones (how a box grows is not settled: this is how a bigger one is tried). */
  setBoxMore(more: number) {
    this.write(boxKey(this.id), roomyBox({ ...this.box(), more: Math.max(0, Math.floor(more)) }));
    this.tell();
  }

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
  /** A fish got away in the fight: its bait comes back, where there is room. Says whether it did. */
  back(bait: BaitId): boolean { const p = this.purse(), q = backBait(p, bait); if (q === p) return false; this.save(q); return true; }
  /** Spend the stamina a fight costs. */
  spend(n: number) { this.save(spend(this.purse(), n, this.now())); }
  // ── gifts: fishing ──
  /** My purse as a rule of the deck's gifts left it (lib/town/fishing: baits hooked, the otter's count, the orb's sky, the lines taken up): kept. */
  fished(purse: Purse) { this.save(purse); }
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
  /**
   * The hours the farm was counted with insects that eat plants on it (lib/town/farm's Swarms): the trial's own count,
   * one for the browser like the farm itself.
   */
  swarms(): Swarms {
    return this.read<Record<number, number>>(SWARMS, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
  }
  /** Count this hour, if it is one of the pests' and has not been counted: the first look at the farm in it, or the first deed there. (Not while a script holds the count, unless it is the script that asks.) */
  swarmNote(asked = false) {
    const now = this.now(), h = pestHour(now), kept = this.swarms();
    if ((this.swarmHeld && !asked) || !inPestHours(now) || h in kept) return;
    const took = this.netted();
    const n = farmBugs(this.salt(), now, SKIES.rains(), (haunt, turn) => (took[`${haunt.id}:${turn}`] ?? []).length, this.backs(), this.hunts(), (haunt) => this.swarm(haunt, now));
    // (a fortnight is kept: no plant looks further back)
    this.write(SWARMS, { ...Object.fromEntries(Object.entries(kept).filter(([hour]) => Number(hour) > h - 14 * 24)), [h]: n });
  }
  /** For scripts trying things out: keep the hours from being counted by themselves, so that what the script says of an hour is all that is said of it (in this tab). */
  private swarmHeld = false;
  holdSwarm(held: boolean) { this.swarmHeld = held; }
  /** For scripts trying things out: how many insects an hour was counted with (the hour a moment is in; this one, when none is said), or null for no hour counted at all. */
  setSwarm(n: number | null, at = this.now()) { this.write(SWARMS, n === null ? {} : { ...this.swarms(), [pestHour(at)]: n }); this.tell(); }
  /** What the farm's rules are read under here: the rain, and the hours counted. */
  sky(): FarmSky { return { rains: SKIES.rains(), swarms: this.swarms() }; }
  /** What the thing in my hand can do to a plot now, if anything. */
  deedAt(key: string): Deed | null {
    const [x, y] = key.split(",").map(Number);
    return deedFor(key, this.farm()[key] ?? WILD, handOf(this.purse()), this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, this.sky());
  }
  /** Do to a plot what the thing in my hand does: clear it, till it, dig its plant out (a living one only when it is `sure`), sow it, water it, feed it, cure it, pick it. Says what was done and what came of it, or why not. */
  farmDo(key: string, name = "", sure = false): { ok: true; deed: Deed; got: Array<[ItemId, number]> } | { ok: false; why: Refusal | FarmRefusal } {
    // (somebody is at the farm: its hour is counted, if it has not been)
    this.swarmNote();
    const p = this.purse(), now = this.now(), plots = this.farm(), plot = plots[key] ?? WILD, beds = this.beds();
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), planted = this.plantedIn(plots);
    const holds = [...this.owners()].filter(([n, o]) => n !== bed && o.by === this.id).length;
    const did = tend(key, plot, beds[bed], (planted.get(bed) ?? 0) - (plot.plant ? 1 : 0), holds, p, this.id, now, this.sky(), sure, this.putLuck ?? undefined);
    if (!did.ok) return did;
    const next = { ...plots };
    // (a watering on a hot afternoon does as much again, and has the nature of the well's water while it has one: lib/town/heat and waters, as the plot is kept)
    if (did.plot.soil === "wild" && !did.plot.plant) delete next[key]; else next[key] = this.poured(plot, did.plot, now, did.deed === "water" ? did.times ?? 1 : 0, this.bellWorn(bed));
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
    // ── gifts: helpers ── (a friend watered in this bed a moment ago: the duet bell, lib/town/helping)
    if (did.deed === "water") this.bell(bed, [key], name);
    // (and it counts on a line, if it is one that does: help in somebody else's bed, a picking of one's own plant)
    this.counted({ from: "deed", what: did.deed, thing: plot.plant?.crop ?? null, n: 1, doc: {
      ...(plot.plant && plot.plant.by !== this.id ? { whose: plot.plant.by } : {}),
      ...(!plot.plant && beds[bed] && beds[bed].by !== this.id ? { owner: beds[bed].by } : {}),
    } });
    return { ok: true, deed: did.deed, got: did.got };
  }
  // ── gifts: farming ──
  /** The plots of the row of its bed a plot is in, by their keys. */
  private rowKeys(key: string): string[] { const [x, y] = key.split(",").map(Number); return rowOf(x, y).map(([u, v]) => plotKey(u, v)); }
  /** What a gift of the farming line would do to the whole row from a plot (lib/town/farm's rowFor), if anything. */
  rowAt(key: string): { deed: RowDeed; plots: string[] } | null {
    const [x, y] = key.split(",").map(Number);
    return rowFor(key, this.rowKeys(key), this.farm(), this.purse(), this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, this.sky());
  }
  /** Do it, whole: one deed. Each plot done is kept, and counted, as if it had been done by itself. */
  rowDo(key: string, name: string, marks: Record<string, boolean>): { ok: true; deed: RowDeed; done: string[]; got: Array<[ItemId, number]>; seeds?: number } | { ok: false; why: Refusal | FarmRefusal } {
    this.swarmNote();
    const p = this.purse(), now = this.now(), plots = this.farm(), beds = this.beds(), keys = this.rowKeys(key);
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), planted = this.plantedIn(plots);
    const holds = [...this.owners()].filter(([n, o]) => n !== bed && o.by === this.id).length;
    const did = rowTend(key, keys, plots, beds[bed], (planted.get(bed) ?? 0) - keys.filter((k) => !!plots[k]?.plant).length, holds, p, this.id, now, marks, this.sky());
    if (!did.ok) return did;
    const next = { ...plots }, sky = SKIES.sky(now);
    for (const [k, plot] of Object.entries(did.plots)) { if (plot.soil === "wild" && !plot.plant) delete next[k]; else next[k] = keptAs(plots[k], plot, now, sky, this.natureNow(now)); }
    this.write(FARM, next);
    const kept = { ...beds };
    if (!did.bed) delete kept[bed];
    else kept[bed] = { ...did.bed, name: (did.bed.by === beds[bed]?.by && beds[bed]?.name) || name || did.bed.by };
    this.write(BEDS, kept);
    for (const e of did.each) {
      const was = plots[e.key]?.plant, [u, v] = e.key.split(",").map(Number);
      // (a plot sown anew forgets who helped the plant that was there)
      if (did.deed === "sow") this.wellSeen({ by: this.id, at: now, what: "sow", tile: [u, v] });
      this.counted({ from: "deed", what: did.deed, thing: e.crop, n: 1, doc: { ...(was && was.by !== this.id ? { whose: was.by } : {}), ...(!was && beds[bed] && beds[bed].by !== this.id ? { owner: beds[bed].by } : {}) } });
    }
    this.save(did.purse);
    return { ok: true, deed: did.deed, done: did.each.map((e) => e.key), got: did.got, ...(did.seeds === undefined ? {} : { seeds: did.seeds }) };
  }
  /** The plots of the bed a plot is in that the garden gnome would water if it were sent now (lib/town/farm's gnomeReach), in the order it would go. */
  gnomeAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
    return bed < 0 ? [] : gnomeReach(bed, this.bedAt(x, y), this.purse(), this.id, this.now(), this.owners().get(bed)?.by ?? null, this.sky());
  }
  /** The plots of the bed a plot is in that my hourglass of seasons would quicken if I turned it now (lib/town/farm's glassReach). */
  glassAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
    return bed < 0 ? [] : glassReach(this.bedAt(x, y), this.purse(), this.id, this.now(), this.owners().get(bed)?.by ?? null, this.sky());
  }
  /** Turn it over that bed. */
  glassDo(key: string): { ok: true; quickened: string[]; until: number } | { ok: false; why: Refusal | FarmRefusal | GiftRefusal } {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), now = this.now();
    if (bed < 0) return no("none");
    const did = glassTurn(this.bedAt(x, y), this.purse(), this.id, now, this.owners().get(bed)?.by ?? null, this.sky());
    if (!did.ok) return did;
    this.write(FARM, { ...this.farm(), ...did.plots });
    const beds = this.beds();
    if (beds[bed]) this.write(BEDS, { ...beds, [bed]: { ...beds[bed], tended: now } });
    this.save(did.purse);
    return { ok: true, quickened: did.quickened, until: did.until };
  }
  /** Send it. (Its water is nobody's, and the plants its member's own: the well's book has nothing to read of it.) */
  gnomeDo(key: string): { ok: true; watered: string[] } | { ok: false; why: Refusal | FarmRefusal } {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), now = this.now(), plots = this.farm();
    if (bed < 0) return no("none");
    const did = gnomeWater(bed, this.bedAt(x, y), this.purse(), this.id, now, this.owners().get(bed)?.by ?? null, this.sky());
    if (!did.ok) return did;
    const next = { ...plots }, sky = SKIES.sky(now);
    for (const [k, plot] of Object.entries(did.plots)) next[k] = keptAs(plots[k], plot, now, sky, this.natureNow(now));
    this.write(FARM, next);
    // (its owner's every deed in a bed counts as tending it)
    const beds = this.beds();
    if (beds[bed]) this.write(BEDS, { ...beds, [bed]: { ...beds[bed], tended: now } });
    this.save(did.purse);
    return { ok: true, watered: did.watered };
  }
  // ── gifts: helpers ──
  /**
   * A plot as it is kept after a deed: a watering with a can so many `times` over (what `tend` said: 1, with no gift
   * of the helpers' line in it) is kept by lib/town/helping's pouredAs, with the heat and the well's water and never
   * past the bound of them all, and the plant remembers it; anything else (`times` 0) as it always was.
   */
  private poured(was: Plot | undefined, next: Plot, now: number, times: number, worn = false): Plot {
    return times > 0 ? pouredAs(was, next, now, hotAt(now, SKIES.sky(now)), this.natureNow(now), this.id, times, worn) : keptAs(was, next, now, SKIES.sky(now), this.natureNow(now));
  }
  /** The plants of the row the long pour of the gardener's gloves would water from a plot (lib/town/farm's pourFor): none, when there is no row to pour along. */
  pourAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number);
    return pourFor(key, this.rowKeys(key), this.farm(), this.purse(), this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, this.sky());
  }
  /** Pour, whole: one deed. Each plant watered is kept, written in the well's book and counted, as if it had been watered by itself. */
  pourDo(key: string, name: string, marks: Record<string, boolean>, secs = 0): { ok: true; done: string[] } | { ok: false; why: Refusal | FarmRefusal } {
    this.swarmNote();
    const p = this.purse(), now = this.now(), plots = this.farm(), beds = this.beds(), keys = this.rowKeys(key);
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), planted = this.plantedIn(plots);
    const holds = [...this.owners()].filter(([n, o]) => n !== bed && o.by === this.id).length;
    const did = pourRow(key, keys, plots, beds[bed], (planted.get(bed) ?? 0) - keys.filter((k) => !!plots[k]?.plant).length, holds, p, this.id, now, marks, secs, this.sky());
    if (!did.ok) return did;
    const next = { ...plots }, hand = handOf(p) ?? undefined;
    for (const e of did.each) next[e.key] = this.poured(plots[e.key], did.plots[e.key], now, e.times, this.bellWorn(bed));
    this.write(FARM, next);
    const kept = { ...beds };
    if (!did.bed) delete kept[bed];
    else kept[bed] = { ...did.bed, name: (did.bed.by === beds[bed]?.by && beds[bed]?.name) || name || did.bed.by };
    this.write(BEDS, kept);
    for (const e of did.each) {
      const by = plots[e.key].plant!.by, [u, v] = e.key.split(",").map(Number);
      this.wellSeen({ by: this.id, at: now, what: "water", can: hand, tile: [u, v], ...(by !== this.id ? { whose: by } : {}) });
      this.counted({ from: "deed", what: "water", thing: e.crop, n: 1, doc: by !== this.id ? { whose: by } : {} });
    }
    this.save(did.purse);
    this.bell(bed, did.each.map((e) => e.key), name);
    return { ok: true, done: did.each.map((e) => e.key) };
  }
  /** The ring of shared strength (lib/town/helping's share): give another tester of this browser stamina of mine; both purses are here. */
  ringTo(to: string, far: number, name: string): { ok: true; gave: number; paid: number; left: number } | { ok: false; why: HelpRefusal } {
    if (!to || to === this.id) return { ok: false, why: "none" };
    const other = trialFor(to), did = share(this.purse(), other.purse(), this.id, name || this.id, far, this.now());
    if (!did.ok) return did;
    other.save(did.theirs);
    this.save(did.mine);
    return { ok: true, gave: did.gave, paid: did.paid, left: did.left };
  }
  /** Garden fae dust (lib/town/farm's dust): whether I could sprinkle it on the plant in a plot now, and sprinkling it. */
  dustAt(key: string): boolean { return dust(key, this.purse(), this.farm()[key] ?? WILD, this.id, this.now(), this.sky()).ok; }
  dustDo(key: string, name: string): { ok: true; left: number; until: number } | { ok: false; why: HelpRefusal } {
    const now = this.now(), plots = this.farm(), plot = plots[key] ?? WILD, did = dust(key, this.purse(), plot, this.id, now, this.sky());
    if (!did.ok) return did;
    const whose = plot.plant!.by, log = this.wellLog(), was = log.help[key]?.owner === whose ? log.help[key] : { owner: whose, by: {} };
    this.write(FARM, { ...plots, [key]: did.plot });
    // (the plant's owner is told who did it, in their own purse, which is in this browser too; and has me among those to thank at the picking)
    const other = trialFor(whose);
    other.save(aided(other.purse(), { what: "dust", by: this.id, name: name || this.id, n: 1, at: now, key }));
    this.write(WELL_LOG, { ...log, help: { ...log.help, [key]: { owner: whose, by: { ...was.by, [this.id]: was.by[this.id] ?? { water: 0, carry: 0 } } } } });
    this.save(did.purse);
    this.counted({ from: "deed", what: "dust", thing: plot.plant!.crop, n: 1, doc: { whose } });
    return { ok: true, left: did.left, until: did.until };
  }
  /** Whether I wear the duet bell in a bed that is not my own (lib/town/helping): what a watering of mine there is marked with. */
  private bellWorn(bed: number): boolean { return wearing(this.purse(), "charmBell") && (this.owners().get(bed)?.by ?? null) !== this.id; }
  /**
   * The duet bell, after a watering of mine in a bed (lib/town/helping's ring): when a friend watered there within
   * the ten seconds and one of us wears the bell, both waterings are doubled as they are kept, each of us has the
   * stamina it gives back, is told of it (the friend's purse is in this browser too), and is counted the points.
   */
  private bell(bed: number, watered: string[], name: string) {
    const now = this.now(), plots = this.farm(), [bx, by] = bedCorner(bed);
    const rang = ring(this.bedAt(bx, by), watered, this.id, this.bellWorn(bed), now);
    if (!rang) return;
    this.write(FARM, { ...plots, ...rang.plots });
    const others = (who: string, keys: string[]) => keys.filter((k) => plots[k].plant!.by !== who).length, pals = Object.keys(rang.pals), called = this.nameOf();
    const mine = belled(this.purse(), rang.mine.length, now);
    this.save(aided(mine.purse, { what: "bell", by: rang.near[0], name: called(rang.near[0]), n: rang.mine.length, at: now, back: mine.back }));
    this.counted({ from: "deed", what: "bell", thing: null, n: others(this.id, rang.mine), doc: {} });
    for (const pal of pals) {
      const other = trialFor(pal), theirs = belled(other.purse(), rang.pals[pal].length, now);
      other.save(aided(theirs.purse, { what: "bell", by: this.id, name: name || this.id, n: rang.pals[pal].length, at: now, back: theirs.back }));
      other.counted({ from: "deed", what: "bell", thing: null, n: others(pal, rang.pals[pal]), doc: {} });
    }
  }
  /** Whether it is a hot afternoon now (lib/town/heat), by this page's sky. */
  hot(): boolean { const now = this.now(); return hotAt(now, SKIES.sky(now)); }
  /** Every plot of the bed a tile is in that is not weeds, by its tile. */
  private bedAt(x: number, y: number): Record<string, Plot> {
    const bed = bedOf(x, y);
    return Object.fromEntries(Object.entries(this.farm()).filter(([k]) => { const [u, v] = k.split(",").map(Number); return bedOf(u, v) === bed; }));
  }
  /** The plots the bucket in my hand would water, poured over the bed from a plot of it (lib/town/ditch): none, when there is nothing to pour or nothing to pour it on. */
  ditchAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number);
    return bedOf(x, y) < 0 ? [] : reachOf(this.purse(), this.bedAt(x, y), [x, y], this.now(), this.sky());
  }
  /** Pour it. */
  ditchDo(key: string): { ok: true; used: number; watered: string[] } | { ok: false; why: Refusal | FarmRefusal } {
    const [x, y] = key.split(",").map(Number), p = this.purse(), now = this.now(), plots = this.farm();
    if (bedOf(x, y) < 0) return no("none");
    const did = ditch(p, this.bedAt(x, y), [x, y], now, this.sky());
    if (!did.ok) return did;
    const next = { ...plots }, sky = SKIES.sky(now), hand = handOf(p) ?? undefined;
    for (const [k, plot] of Object.entries(did.plots)) next[k] = keptAs(plots[k], plot, now, sky, this.natureNow(now));
    this.write(FARM, next);
    // (its owner's every deed in a bed counts as tending it)
    const beds = this.beds(), bed = String(bedOf(x, y));
    if (beds[bed] && ownerOf(beds[bed], true, now) === this.id) this.write(BEDS, { ...beds, [bed]: { ...beds[bed], tended: now } });
    // (the well's book: the pourer's own water on each plant it reached, each a watering)
    this.wellSeen({ by: this.id, at: now, what: "ditch", n: did.used, plants: did.watered.length, can: hand });
    for (const k of did.watered) {
      const by = plots[k].plant!.by, [u, v] = k.split(",").map(Number);
      this.wellSeen({ by: this.id, at: now, what: "water", can: hand, tile: [u, v], ...(by !== this.id ? { whose: by } : {}) });
    }
    this.save(did.purse);
    return { ok: true, used: did.used, watered: did.watered };
  }
  /** The cooking yard's jar (lib/town/yard): the bucketfuls in it, whether the bucket in my hand can be poured in, and pouring it. */
  yardJar(): number { return this.read<number>(YARD_JAR, () => 0, (v) => typeof v === "number" && v >= 0); }
  yardCanPour(): boolean { return canPour(this.purse(), this.yardJar()); }
  yardPour(): { ok: true; poured: number } | { ok: false; why: Refusal } {
    const now = this.now(), did = pourIn(this.purse(), this.yardJar(), now);
    if (!did.ok) return did;
    this.write(YARD_JAR, did.jar);
    this.wellSeen({ by: this.id, at: now, what: "yard", n: did.poured, can: handOf(this.purse()) ?? undefined });
    this.save(did.purse);
    return { ok: true, poured: did.poured };
  }
  /** Waters that differ (lib/town/waters): the nature the well's water has now, if any, with whose doing it is; and the nature of water drawn at this moment. */
  private natureNow(now: number): Nature | null { return natureOf(this.wellLog().wellWater, now); }
  wellWater(): WellWater | null { const w = this.wellLog().wellWater; return w && natureOf(w, this.now()) ? w : null; }
  drawnNow(): Nature | null { const now = this.now(); return natureAt(now, SKIES.raining(now)); }
  /** For scripts and the test window: the well's water given a nature for so many minutes (as if somebody had poured it in), or none. */
  setWellWater(kind: Nature | null, minutes = 30) {
    this.write(WELL_LOG, { ...this.wellLog(), wellWater: kind ? { kind, until: this.now() + minutes * 60_000, by: this.id } : null });
    this.tell();
  }
  /** A bucket line (lib/town/line): whether I hold a bucket with water to hand on, and handing it on to another tester of this browser. */
  canPass(): boolean { return !!carried(this.purse()); }
  passTo(to: string): { ok: true; n: number } | { ok: false; why: PassRefusal } {
    if (!to || to === this.id) return { ok: false, why: "none" };
    const other = trialFor(to), now = this.now(), did = pass(this.purse(), other.purse(), now);
    if (!did.ok) return did;
    this.wellSeen({ by: this.id, at: now, what: "pass", n: did.n, can: did.can, to, into: did.into });
    other.save(did.to);
    this.save(did.from);
    return { ok: true, n: did.n };
  }
  /** For scripts and the test window: so many bucketfuls in the yard's jar (nobody's water). */
  setYardJar(buckets: number) { this.write(YARD_JAR, Math.max(0, Math.floor(buckets))); this.tell(); }
  /** What the thing in my hand can do with water where I stand (by the river, or at the well), if anything; and doing it. */
  choreAt(where: "river" | "well" | null): Chore | null { return choreFor(this.purse(), where, this.well()); }
  choreDo(where: "river" | "well" | null): { ok: true; chore: Chore } | { ok: false; why: Refusal } {
    const p = this.purse(), well = this.well(), now = this.now(), did = chore(p, where, well, now);
    if (!did.ok) return did;
    this.write(WELL, did.well);
    // (the well's book: so many bucketfuls poured, and out of which bucket; a can filled; a bucket drawn, with nobody's hands on its water yet)
    if (did.chore === "pour") this.wellSeen({ by: this.id, at: now, what: "pour", n: did.well - well, can: handOf(p) ?? undefined });
    else if (did.chore === "fill") this.wellSeen({ by: this.id, at: now, what: "fill", n: well - did.well, can: handOf(p) ?? undefined });
    else this.wellSeen({ by: this.id, at: now, what: "draw", can: handOf(p) ?? undefined, kind: natureAt(now, SKIES.raining(now)) ?? undefined });
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
  /** Every place of the forest that has something for me now (with the firefly lantern worn: what is buried too, and the secret places). */
  wild(): Sight[] {
    const took = this.took();
    return sights(this.salt(), this.now(), SKIES.rains(), (spot, turn) => { const who = took[`${spot.id}:${turn}`] ?? []; return { n: who.length, mine: who.includes(this.id) }; }, lanternLit(this.purse()));
  }
  /** Gather what a place has, from the tile I stand on, with how its game went. Says what came of it, or why not (`lost`: a secret place's games were not both won, and my turn at it is spent). */
  gatherDo(id: number, at: [number, number], went: Outcome): { ok: true; got: Array<[ItemId, number]>; lost?: boolean } | { ok: false; why: Refusal | ForestRefusal | GiftRefusal } {
    const spot = placeAt(id);
    if (!spot) return no("none");
    const now = this.now(), has = holds(this.salt(), spot, now, SKIES.rains()), took = this.took(), key = `${id}:${has?.turn ?? 0}`, who = took[key] ?? [];
    const did = gather(this.purse(), spot, has, who.length, who.includes(this.id), handOf(this.purse()), at, went, now);
    if (!did.ok) return did;
    // (turns gone by are forgotten: only what the places have now is kept)
    const kept = Object.fromEntries(Object.entries(took).filter(([k]) => { const [s, t] = k.split(":").map(Number), p = placeAt(s); return !!p && t >= turnOf(p, now); }));
    this.write(WILD_TOOK, { ...kept, [key]: [...who, this.id] });
    this.save(did.purse);
    if (did.got[0]) this.counted({ from: "deed", what: "gather", thing: did.got[0][0], n: did.got[0][1], doc: { how: ruleOf(spot).how, kind: spot.kind } });
    return { ok: true, got: did.got, ...(did.lost ? { lost: true } : {}) };
  }
  // ── gifts: forest ── (a sprite's treasure map, lib/town/hunt: the chest's tile hangs on the forest's word and on whose map it is)
  /** The hunt I am on, as I am told it. */
  hunt(): HuntTold | null { return huntTold(this.purse(), this.salt(), this.id, this.now()); }
  /** Use a map: a hunt begins. */
  mapUse(): { ok: true; left: number } | { ok: false; why: GiftRefusal } {
    const did = mapUse(this.purse(), this.now());
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true, left: did.left };
  }
  /** Dig for the chest from the tile I stand on: how warm it was, or the chest and what it holds. */
  mapDig(at: [number, number]): { ok: true; found: boolean; warm: number; digs: number; got: Array<[ItemId, number]> } | { ok: false; why: Refusal } {
    const did = mapDig(this.purse(), this.salt(), this.id, at, this.now(), [Math.random(), Math.random()]);
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true, found: did.found, warm: did.warm, digs: did.digs, got: did.got };
  }
  /** For scripts trying things out: the word the forest's rolls hang on, as it is told (so that what a place has can be known beforehand). */
  setSalt(word: string) { this.set(WILD_SALT, word); this.set(WILD_TOOK, null); this.set(BUG_TOOK, null); this.set(BUG_BACK, null); this.set(BUG_HUNTS, null); this.tell(); }

  /* ── insects: what each haunt has is everybody's too, rolled from the same word ── */
  /** Who has caught each haunt's insect in which turn: by "haunt:turn". */
  private netted(): Record<string, string[]> {
    return this.read<Record<string, string[]>>(BUG_TOOK, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
  }
  /** For scripts trying things out: the insect a haunt has, whatever the rolls say (in this tab; null lets the rolls say again). */
  private forced = new Map<number, BugId>();
  setBug(haunt: number, bug: BugId | null) { if (bug) this.forced.set(haunt, bug); else this.forced.delete(haunt); this.tell(); }
  /** For scripts: every haunt back to what the rolls say (in this tab). */
  unsetBugs() { this.forced.clear(); this.tell(); }
  /** The insects that have come back somewhere after a catch, those whose turn is not over (lib/town/insects' comeback). */
  backs(): Comeback[] {
    const now = this.now();
    return this.read<Comeback[]>(BUG_BACK, () => [], (v) => Array.isArray(v)).filter((b) => !!HAUNTS[b.haunt] && b.turn >= bugTurn(HAUNTS[b.haunt], now));
  }
  /** What has been caught in the village within the day, which each kind grows scarce by (lib/town/insects' plentyOf). */
  hunts(): Hunt[] {
    const now = this.now();
    return this.read<Hunt[]>(BUG_HUNTS, () => [], (v) => Array.isArray(v)).filter((x) => !!BUGS[x.bug] && x.at > now - SCARCE.day * 3_600_000);
  }
  /** For scripts trying things out: what has been caught, as if it had been (null: nothing has). */
  setHunts(hunts: Hunt[] | null) { this.write(BUG_HUNTS, hunts ?? []); this.tell(); }
  /** What a haunt has now (`cloak`: for whoever wears the butterfly-wing cloak, lib/town/insects' hereFor). */
  private swarm(h: Haunt, now: number, cloak = false): Swarm | null {
    const bug = this.forced.get(h.id);
    if (!bug) return hereFor(this.salt(), h, now, SKIES.rains(), this.backs(), this.hunts(), cloak);
    const turn = bugTurn(h, now);
    return { turn, bug, n: BUGS[bug].n[0], seed: h.id * 100003 + turn };
  }
  /** Every haunt that has an insect for me now. */
  bugs(): BugSight[] {
    const took = this.netted(), now = this.now();
    const mine = (h: Haunt, turn: number) => { const who = took[`${h.id}:${turn}`] ?? []; return { n: who.length, mine: who.includes(this.id) }; };
    const rolled = swarms(this.salt(), now, SKIES.rains(), mine, this.backs(), this.hunts(), wearing(this.purse(), "charmCloak")).filter((s) => !this.forced.has(s.id));
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
    const now = this.now(), has = this.swarm(h, now, wearing(this.purse(), "charmCloak")), took = this.netted(), key = `${id}:${has?.turn ?? 0}`, who = took[key] ?? [];
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
      rid = pestToRid(farm, now, this.sky(), Math.random());
      if (rid) this.write(FARM, { ...farm, [rid]: { ...farm[rid], plant: { ...farm[rid].plant!, cured: now } } });
    }
    // caught, it is gone for everybody; and one of a haunt's own comes back somewhere else on that map a little later
    const hunts = this.hunts();
    if (!has!.back) {
      const backs = this.backs();
      // (a haunt where something was caught this turn already has had its insect: only one a script put there can have
      // been caught where the rolls had none, and nothing comes back to such a haunt)
      let back: Comeback | null = null;
      for (let i = 0; i < 12 && !back; i++) {
        const b = comeback(this.salt(), h, now, SKIES.rains(), backs, [Math.random(), Math.random(), Math.random()], hunts);
        if (!b) break;
        if (!took[`${b.haunt}:${b.turn}`]?.length) back = b;
      }
      if (back) {
        this.write(BUG_BACK, [...backs, back]);
        setTimeout(() => this.tell(), Math.max(0, back.from - now) + 60);
      }
    }
    // and it counts against its kind from the next turn on, for a day
    this.write(BUG_HUNTS, [...hunts, { bug: has!.bug, at: now, n: has!.n }]);
    this.save(did.purse);
    this.counted({ from: "deed", what: "net", thing: has!.bug, n: has!.n, doc: {} });
    return { ok: true, got: did.got, first, rid };
  }
  /** For scripts trying things out: how likely an insect that may take a pest with it does, whatever its own chance is (in this tab; null: its own). */
  private ridChance: number | null = null;
  setRidChance(chance: number | null) { this.ridChance = chance; }
  /** For scripts: the number an insect let go on a plant that has a pest is tried by (lib/town/farm's `feed`: under how often that insect eats one, it does), in place of the moment's own (in this tab; null: the moment's). */
  private putLuck: number | null = null;
  setPutLuck(luck: number | null) { this.putLuck = luck; }
  // ── gifts: insects ──
  /** A drop of nectar where I stand (lib/town/insects' nectar): what it brings is drawn here, as the database draws it, and kept in my purse. */
  nectarDrop(at: [number, number]): { ok: true; left: number } | { ok: false; why: BugRefusal | GiftRefusal } {
    const did = nectar(this.purse(), at, this.now(), this.salt(), SKIES.rains(), this.hunts(), this.nectarLuck ?? [Math.random(), Math.random(), Math.random()]);
    if (!did.ok) return did;
    this.save(did.purse);
    this.counted({ from: "deed", what: "nectar", thing: did.lured.bug, n: did.lured.n, doc: {} });
    return { ok: true, left: did.left };
  }
  /** For scripts trying things out: the three numbers a drop is drawn by (which insect, how many, how soon), in place of chance (in this tab; null: chance again). */
  private nectarLuck: [number, number, number] | null = null;
  setNectarLuck(r: [number, number, number] | null) { this.nectarLuck = r; }
  /** Catch an insect that is mine alone (lib/town/insects' netMine: the one come to my drop), from the tile I stand on, after so many swings that missed: a catch like any, in the book, against its kind, on the line. */
  netMine(which: Mine, at: [number, number], misses: number, name: string): { ok: true; got: Array<[ItemId, number]>; first: boolean; rid: string | null } | { ok: false; why: Refusal | BugRefusal } {
    const now = this.now(), p = this.purse(), did = netMine(p, which, handOf(p), at, misses, now);
    if (!did.ok) return did;
    const bug = did.got[0][0] as BugId, n = did.got[0][1], book = this.bugBook(), first = !book[bug];
    if (first) this.write(BUG_BOOK, { ...book, [bug]: name || this.id });
    // (a ladybird, now and then, as one of a haunt's)
    let rid: string | null = null;
    const rids = BUGS[bug].rids ? this.ridChance ?? BUGS[bug].rids! : 0;
    if (rids > 0 && Math.random() < rids) {
      const farm = this.farm();
      rid = pestToRid(farm, now, this.sky(), Math.random());
      if (rid) this.write(FARM, { ...farm, [rid]: { ...farm[rid], plant: { ...farm[rid].plant!, cured: now } } });
    }
    this.write(BUG_HUNTS, [...this.hunts(), { bug, at: now, n }]);
    this.save(did.purse);
    this.counted({ from: "deed", what: "net", thing: bug, n, doc: {} });
    return { ok: true, got: did.got, first, rid };
  }

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
    this.counted({ from: "deed", what: "thank", thing: null, n: did.thanked.length, doc: { to: did.thanked } });
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
  /* ── gifts: well ── (lib/town/well-gifts) ── */
  /** Hold a drink of the flask of living water out to another tester of this browser, from the tile I stand on (null: put it away). */
  drinkOffer(to: string | null, at: [number, number]): { ok: true; till: number | null } | { ok: false; why: WellGiftRefusal } {
    const did = drinkOffer(this.purse(), this.id, to, at, this.now());
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true, till: did.till };
  }
  /** Drink what another tester holds out to me, from the tile I stand on: both purses are in this browser, so both are written here. */
  drinkTake(from: string, at: [number, number]): { ok: true; got: number; back: number } | { ok: false; why: WellGiftRefusal } {
    if (!from || from === this.id) return { ok: false, why: "none" };
    const other = trialFor(from), did = drinkTake(other.purse(), this.purse(), from, this.id, at, this.now());
    if (!did.ok) return did;
    other.save(did.giver);
    this.save(did.drinker);
    return { ok: true, got: did.got, back: did.back };
  }
  /** The rain fills the empty bucket in my hand, while it rains by this page's sky and the rain frog follows me: a bucket drawn, of the rain's water, with nobody's hands on it yet. */
  rainFill(): { ok: true; n: number } | { ok: false; why: WellGiftRefusal } {
    const now = this.now(), did = rainFill(this.purse(), SKIES.raining(now), now);
    if (!did.ok) return did;
    this.wellSeen({ by: this.id, at: now, what: "draw", can: did.can, kind: natureAt(now, true) ?? undefined });
    this.save(did.purse);
    return { ok: true, n: did.n };
  }
  /** The nature of the water in the bucket I hold, when it has one (the well's log has it by who holds which bucket). */
  carriedKind(): Nature | null { const c = carried(this.purse()); return c ? this.wellLog().kinds[`${this.id}/${c.hand}`] ?? null : null; }
  /** Keep the water of the bucket I hold in my moon flask. */
  moonKeep(): { ok: true; n: number; kind: Nature } | { ok: false; why: WellGiftRefusal } {
    const did = moonKeep(this.purse(), this.carriedKind());
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true, n: did.n, kind: did.kind };
  }
  /**
   * Pour so many bucketfuls of my flask into the well: what the well has room for is a bucketful poured like any
   * other in its book, and the well takes the water's nature from all of it, so many times as long.
   */
  moonPour(n: number): { ok: true; poured: number; into: number; kind: Nature } | { ok: false; why: WellGiftRefusal } {
    const now = this.now(), did = moonPour(this.purse(), this.well(), n, now);
    if (!did.ok) return did;
    this.write(WELL, did.well);
    if (did.into > 0) this.wellSeen({ by: this.id, at: now, what: "pour", n: did.into, can: "thingMoon" });
    const log = this.wellLog();
    this.write(WELL_LOG, { ...log, wellWater: pouredIn(log.wellWater, did.kind, did.poured, this.id, now, MOON.times) });
    this.save(did.purse);
    return { ok: true, poured: did.poured, into: did.into, kind: did.kind };
  }
  /** For scripts and the test window: what my moon flask keeps (null: nothing). */
  setMoon(kind: Nature | null, n = MOON.holds) {
    const { moon: _was, ...rest } = this.purse();
    this.save((kind ? { ...rest, moon: { kind, n: Math.max(1, Math.min(MOON.holds, Math.floor(n))) } } : rest) as Purse);
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
  /** The pots of food that stand about, for anybody with a bowl: as they stand now (lib/town/cooking's tidied: an hour on the ground, then the feast table, then gone). */
  pots(): Pot[] { return tidied(this.read<Pot[]>(POTS, () => [], Array.isArray), this.now(), KITCHEN.feast.tile).pots; }
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
  cookDo(things: Array<[ItemId, number]>, crew: Array<ItemId | null>, misses: number, name = "", how: CookHow = {}): Gifted<{ purse: Purse; made: ItemId | null; n: number; first: boolean; taste?: Taste; fresh?: boolean; sprite?: boolean; back?: boolean }> {
    // (── gifts: kitchen ── with what the kitchen's gifts change of it: lib/town/cooking's cookWith)
    const now = this.now(), did = cookWith(this.purse(), things, crew, misses, now, how);
    if (!did.ok) return did;
    const made = isFind(did.made) ? did.made : null, found = this.found(), first = !!made && !found.includes(made);
    // (a pot cooked while the yard's jar has water takes a bucketful of it, and has a helping more: lib/town/yard)
    const watered = freshen(did.purse, did.made, this.yardJar());
    if (watered.fresh) { this.write(YARD_JAR, watered.jar); this.wellSeen({ by: this.id, at: now, what: "fresh" }); }
    let purse = watered.purse;
    if (made && made in DISHES && !purse.recipes.includes(made as DishId)) purse = { ...purse, recipes: [...purse.recipes, made as DishId] };
    if (made && !hasMade(purse, made)) purse = { ...purse, made: [...(purse.made ?? []), made] };
    if (first && made) { this.write(FOUND, [...found, made]); this.write(FINDERS, { ...this.finders(), [made]: name || this.id }); }
    this.save(purse);
    return { ...did, purse, first, ...(watered.fresh ? { fresh: true } : {}) };
  }
  /**
   * Set a pot of food down where I stand (the one in `slot`, or the first there is): on the feast table, for a dish
   * set down in the cooking yard; else on the ground, if nothing stands there. Refused when I have left as many
   * there already as one person may.
   */
  potDown(at: [number, number], slot?: number): Done<{ purse: Purse; pot: Pot }> {
    const p = this.purse(), pots = this.pots(), now = this.now();
    const did = setDown(p, slot ?? p.bag.findIndex((s) => s?.item === "potFull"), this.id, at, `${this.id}-${now}`, { now, yard: yardFloor(at[0], at[1]), tile: KITCHEN.feast.tile });
    if (!did.ok) return did;
    if (!did.pot.feast && pots.some((o) => !o.feast && Math.abs(o.at[0] - at[0]) <= 1 && Math.abs(o.at[1] - at[1]) <= 1)) return no("taken");
    if (!mayLeave(pots, this.id, !!did.pot.feast)) return no("many");
    // (told with what its cook is called, as the database tells a pot)
    did.pot.name = this.nameOf()(this.id);
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
    this.counted({ from: "deed", what: "ladle", thing: pot.dish, n: 1, doc: { pot: id, ...(pot.by !== this.id ? { whose: pot.by } : {}) } });
    return did;
  }
  /** Eat a helping at the feast table, out of one of the table's own bowls: begun at once, never in my bag. */
  feastEat(id: string, seated: boolean): Done<{ purse: Purse; pot: Pot | null; dish: DishId }> {
    const pots = this.pots(), pot = pots.find((o) => o.id === id);
    if (!pot) return no("gone");
    const did = feastEat(this.purse(), pot, seated, this.now());
    if (!did.ok) return did;
    const left = did.pot;
    this.write(POTS, left ? pots.map((o) => (o.id === id ? left : o)) : pots.filter((o) => o.id !== id));
    this.save(did.purse);
    this.counted({ from: "deed", what: "ladle", thing: pot.dish, n: 1, doc: { pot: id, bowl: "table", ...(pot.by !== this.id ? { whose: pot.by } : {}) } });
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
  // ── gifts: kitchen ──
  /** Keep what a deed with a gift of the kitchen's came to, if it came to anything. */
  private gifted<T extends { purse: Purse }, W>(did: ({ ok: true } & T) | { ok: false; why: W }) { if (did.ok) this.save(did.purse); return did; }
  /** The dimension basket (lib/town/cooking): helpings put in from a slot of the bag, taken back out, and one sat down to straight out of it. */
  basketPut(slot: number, n: number) { return this.gifted(basketPut(this.purse(), slot, n)); }
  basketTake(dish: string, n: number) { return this.gifted(basketTake(this.purse(), dish, n)); }
  basketEat(dish: string, seated: boolean) { return this.gifted(basketEat(this.purse(), dish, seated, this.now())); }
  /** The whispering spoon, asked of what is in the pot: the secret thing of the recipe it is on the way to. */
  spoonAsk(things: Array<[ItemId, number]>) { return this.gifted(spoon(this.purse(), things, this.now())); }
  /** A helping sat down to with the stardust spice sprinkled on it, out of a slot of the bag or out of the basket. */
  spiceEat(from: { slot: number } | { dish: string }, seated: boolean) { return this.gifted(spiceEat(this.purse(), from, seated, this.now())); }
  /** What the uncle's next hint costs me (of what can be made with what he sells so far), and buying it: which one it is, by chance. */
  hintPrice(): number | null { const at = sourcesAt(this.village().unlocked, true); return hintPrice(this.purse(), this.found(), (id) => at.has(id)); }
  hint() { const at = sourcesAt(this.village().unlocked, true); return this.keep(buyHint(this.purse(), this.hintChance ?? Math.random(), this.found(), (id) => at.has(id))); }
  /** For scripts trying things out: the hints he may sell me next, as they are listed, and the number of chance the next are drawn by (in this tab; 0 is the first of them; null: by chance). */
  hintsLeft(): ItemId[] { const at = sourcesAt(this.village().unlocked, true); return hintsLeft(this.purse(), this.found(), (id) => at.has(id)); }
  private hintChance: number | null = null;
  setHintChance(r: number | null) { this.hintChance = r; }
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
    // (a fish landed, a pot of a real recipe: each counts on its line)
    this.counted({ from: "play", what: play.game, thing: (play as { what?: string }).what ?? null, n: 1, won: play.won, doc: {} });
    this.tell();
  }

  /* ── the lines of work (lib/town/lines, line-points): everybody's, since what one does may count for another ── */
  private linesAll(): Record<string, Partial<Record<LineId, LineKept>>> {
    return this.read<Record<string, Partial<Record<LineId, LineKept>>>>(LINES_AT, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
  }
  /** Something done, counted on whatever line it counts on, for whoever it counts for (mine, or the cook's whose pot I ladled from, or whoever I thanked). */
  private counted(done: Deeded) {
    const counts = countsOf(done, this.id);
    if (!counts.length) return;
    const all = { ...this.linesAll() }, day = dayOf(this.now());
    for (const c of counts) {
      const who = c.to ?? this.id, theirs = { ...(all[who] ?? {}) };
      theirs[c.line] = countLine(theirs[c.line] ?? newLine(), c, day);
      all[who] = theirs;
    }
    this.write(LINES_AT, all);
  }
  /** Everybody's worn title, by member. */
  private worn(): Record<string, Worn> {
    const kept = this.read<Record<string, unknown>>(TITLES, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
    return Object.fromEntries(Object.entries(kept).flatMap(([id, w]) => { const worn = wornOf(w); return worn ? [[id, worn]] : []; }));
  }
  /**
   * My lines as I am told them: each one's points and what today has been worth; the well's is the bucketfuls its
   * own book counts (lib/town/well), which no bound holds. And the title I wear.
   */
  lines(): LinesTold {
    const told = noLines(), mine = this.linesAll()[this.id] ?? {}, day = dayOf(this.now()), log = this.wellLog();
    for (const id of LINE_IDS) { const k = mine[id]; if (k) told.lines[id] = { points: k.points, today: k.day === day ? k.today : 0 }; }
    told.lines.well = { points: log.carriers[this.id]?.buckets ?? 0, today: log.days[String(day)]?.[this.id]?.buckets ?? 0 };
    return { ...told, worn: this.worn()[this.id] ?? null };
  }
  /** Wear a title I have earned under my name, or none (null). */
  titleWear(worn: Worn | null): { ok: true } | { ok: false; why: Refusal } {
    const all = { ...this.worn() };
    if (worn === null) delete all[this.id];
    else {
      const points = Object.fromEntries(LINE_IDS.map((id) => [id, this.lines().lines[id].points]));
      if (!mayWear(points, worn.line, worn.rank)) return no("none");
      all[this.id] = { line: worn.line, rank: worn.rank };
    }
    this.write(TITLES, all);
    this.tell();
    return { ok: true };
  }
  /** Take the gift of a rank I have reached on a line (lib/town/gifts): once, into no bag. */
  giftTake(line: string, rank: number): { ok: true; gift: GiftId } | { ok: false; why: GiftRefusal } {
    const points = Object.fromEntries(LINE_IDS.map((id) => [id, this.lines().lines[id].points]));
    const did = takeRankGift(this.purse(), points, line, rank);
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true, gift: did.gift };
  }
  /** For trying things out: every gift there is in my purse at once, whatever my ranks (or none of them, and nothing worn); or only the ones named, what is worn and follows kept where it is still had. */
  setGifts(all: boolean | readonly string[]) {
    const p = this.purse();
    if (Array.isArray(all)) {
      const had = GIFTS.map((g) => g.id).filter((id) => all.includes(id)), was = giftsOf(p);
      this.save({ ...p, gifts: { ...was, had, charms: was.charms.filter((id) => had.includes(id)), familiar: was.familiar && had.includes(was.familiar) ? was.familiar : null } });
      return;
    }
    this.save({ ...p, gifts: all ? { ...giftsOf(p), had: GIFTS.map((g) => g.id) } : { had: [], charms: [] } });
  }
  /** Wear these charms and no others (none: take them all off). */
  charmsWear(ids: readonly string[]): { ok: true } | { ok: false; why: GiftRefusal } {
    const did = wearCharms(this.purse(), ids);
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true };
  }
  /** Have this familiar follow me and no other (null: none follows). */
  familiarWear(id: string | null): { ok: true } | { ok: false; why: GiftRefusal } {
    const did = wearFamiliar(this.purse(), id);
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true };
  }
  /** Use a counted gift once (lib/town/gifts): it has to work for me now, and to have a time left in this stretch. */
  giftUse(id: string): { ok: true; left: number } | { ok: false; why: GiftRefusal } {
    const did = useGift(this.purse(), id, this.now());
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true, left: did.left };
  }
  /** The title everybody wears who chose one, by member: for the names over heads. */
  titles(): Record<string, Worn> { return this.worn(); }
  /** For scripts trying things out: so many points on a line of mine, as if earned before today. */
  setLine(line: LineId, points: number) {
    const all = { ...this.linesAll() }, mine = { ...(all[this.id] ?? {}) };
    mine[line] = { ...(mine[line] ?? newLine()), points: Math.max(0, points) };
    all[this.id] = mine;
    this.write(LINES_AT, all);
    this.tell();
  }
  /** My goes at the mini-games, the oldest first (the log keeps only its newest), and the tally of them all. */
  plays(): Play[] { return this.read<Play[]>(playsKey(this.id), () => [], Array.isArray); }
  tally(): Tally {
    return this.read<Tally>(tallyKey(this.id), newTally, (v) => { const t = v as Partial<Tally> | null; return !!t && !!t.games && !!t.fishing?.caught && !!t.fishing.places; });
  }
  /* ── a stall under a sign: the whole browser's; both purses are here, so a sale is one go ── */
  private shopsKept(): Record<string, Shops.Shop> { return this.read<Record<string, Shops.Shop>>(SHOPS, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v)); }
  /** What I am told of stalls: mine if it is open, and what may be wanted. */
  shops(): Shops.ShopsTold { return Shops.told(this.shopsKept()[this.id], this.now(), this.seen()); }
  /** Open a stall where I stand (one that was open is opened anew). */
  shopOpen(ask: Shops.ShopAsk, at: [number, number]) {
    const did = Shops.open(this.purse(), this.id, ask, at, this.now(), this.seen());
    if (did.ok) { this.write(SHOPS, { ...this.shopsKept(), [this.id]: did.shop }); this.tell(); }
    return did;
  }
  shopClose() {
    const all = { ...this.shopsKept() };
    if (!(this.id in all)) return;
    delete all[this.id];
    this.write(SHOPS, all);
    this.tell();
  }
  /** I am still here. */
  shopBeat() {
    const all = this.shopsKept(), mine = all[this.id];
    if (mine && Shops.alive(mine, this.now())) this.write(SHOPS, { ...all, [this.id]: Shops.beat(mine, this.now()) });
  }
  /** Somebody's stall as a comer is told it; null when they have none open. */
  shopOf(who: string): Shops.ShopTold | null {
    const raw = this.get(purseKey(who));
    return raw === null ? null : Shops.toldOf(this.shopsKept()[who], JSON.parse(raw) as Purse, this.now());
  }
  private shopDeal(who: string, item: ItemId, n: number, at: [number, number], how: typeof Shops.buy) {
    const all = this.shopsKept(), raw = this.get(purseKey(who));
    if (raw === null) return { ok: false as const, why: "shut" as const };
    const did = how(this.purse(), JSON.parse(raw) as Purse, all[who], this.id, item, n, at, this.now());
    if (!did.ok) return did;
    // (the other's purse is in this browser too: both are written here)
    this.write(purseKey(who), did.theirs);
    this.write(SHOPS, { ...all, [who]: did.shop });
    this.save(did.mine);
    return { ok: true as const, coins: did.coins };
  }
  /** Buy at somebody's stall, or bring it what it wants, from the tile I stand on. */
  shopBuy(who: string, item: ItemId, n: number, at: [number, number]) { return this.shopDeal(who, item, n, at, Shops.buy); }
  shopSell(who: string, item: ItemId, n: number, at: [number, number]) { return this.shopDeal(who, item, n, at, Shops.sell); }

  /* ── things dropped on the ground: the whole browser's, like the farm ── */
  /** What lies about now. */
  ground(): Dropped[] { return lying(this.read<Dropped[]>(GROUND_AT, () => [], Array.isArray), this.now()); }
  /** Drop what is in a slot of my bag where I stand, for anybody to pick up while it lies. */
  groundDrop(slot: number, at: [number, number]): Done<{ id: number }> {
    // (a number of its own: the moment, and a little chance for two dropped in the same one)
    const did = dropDown(this.purse(), slot, this.id, at, this.now(), this.now() * 100 + Math.floor(Math.random() * 100));
    if (!did.ok) return did;
    this.write(GROUND_AT, [...this.ground(), did.dropped]);
    this.save(did.purse);
    return { ok: true, id: did.dropped.id };
  }
  /** Pick a thing up from the ground, from the tile I stand on. */
  groundTake(id: number, at: [number, number]) {
    const all = this.ground(), did = pickUp(this.purse(), all.find((d) => d.id === id), at, this.now());
    if (did.ok) { this.write(GROUND_AT, all.filter((d) => d.id !== id)); this.save(did.purse); }
    return did;
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
  /** A counted gift used so many times in the stretch now is in: to try what its last use and the one after are like. */
  setUsed(id: GiftId, n: number) {
    const p = this.purse(), mine = giftsOf(p), rule = USES[id];
    if (rule) this.save({ ...p, gifts: { ...mine, used: { ...mine.used, [id]: { k: stretchOf(rule, this.now()), n: Math.max(0, Math.floor(n)) } } } });
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
    for (const key of [purseKey(this.id), boxKey(this.id), GROUND_AT, SHOPS, STALL, MARKET_AT, MARKET_LOG, CLOCK, FARM, WELL, WELL_LOG, THANKS, JAR, YARD_JAR, BEDS, POTS, FOUND, FINDERS, DEALS, VILLAGE]) this.set(key, null);
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
