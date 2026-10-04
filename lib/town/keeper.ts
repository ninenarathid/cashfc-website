import { cook, hasMade, type Pot, type Taste } from "./cooking";
import type { Give } from "./deal";
import { WILD, choreFor, deedFor, ownerOf, type Chore, type Deed, type FarmRefusal, type Plot } from "./farm";
import type { Strike } from "./fishing";
import type { ForestRefusal, Outcome, Sight } from "./forest";
import { BUGS, type BugId, type BugRefusal, type BugSight } from "./insects";
import type { FountainTold, Shade, WishId } from "./fountain";
import { nextHint } from "./hints";
import { DISHES, ITEMS, type BaitId, type CatchId, type DishId, type ItemId } from "./items";
import { NO_PRICES, type PricesTold } from "./market";
import type { NoticeRefusal, PinboardTold } from "./notices";
import { shelfOf, sourcesAt, type Order } from "./orders";
import { SKIES } from "./skies";
import type { Rain } from "./weather";
import type { FishingEnd, Play } from "./plays";
import { STAMINA, chew } from "./stamina";
import { handOf, newPurse, newStall, type Purse, type Refusal, type Stall } from "./trade";
import type { WellBook } from "./well";
import type { KeptBed, KeptDeal, Trial } from "./trial";
import { bedOf } from "./world";

/**
 * Who keeps the game.
 *
 * The rules are lib/town's own, pure and tested, whoever keeps what they
 * decide. In `next dev`'s test room that is the browser's trial
 * (lib/town/trial, through lib/town/keeper-trial). For a member it is the
 * database (v105 to v115): every rule written again there, every outcome
 * decided there, and the page told. The panels ask a keeper and never know
 * which one it is.
 *
 * - **Reading is at once, doing waits.** Every answer of the database carries
 *   the purse as it now stands, and whatever else it touched: the keeper holds
 *   a copy of each, so `purse()`, `farm()` and `pots()` answer at once, as the
 *   trial's do. Only a deed waits for its answer.
 * - **The clock is the database's.** Every answer says what time it is there;
 *   `now()` is this browser's clock put right by the difference. What grows,
 *   what a meal has given so far and when the relatives come are worked out
 *   here by the same rules, from the copies, with that clock.
 * - **What others change is asked for**, never pushed: while somebody looks
 *   at the farm, the kitchen, the stall or a deal (`look`), on a slow timer,
 *   and at once when the room says something changed (`nudged`). The room
 *   carries only that word, never the change.
 * - **One thing at a time.** What is asked is asked in order and answered in
 *   order, so a look that began before a deed never paints over what the deed
 *   did.
 */

export type Why = Refusal | FarmRefusal | ForestRefusal | BugRefusal | NoticeRefusal;
export type Did<T = unknown> = ({ ok: true } & T) | { ok: false; why: Why };
/** What can be looked at, and what the room says has changed. */
export type Looked = "stall" | "farm" | "kitchen" | "deal" | "fountain" | "wild" | "bugs" | "notices";
export type Water = "river" | "well" | null;
/** A game of timing as the browser played it: the database keeps it with the play, and bounds what it costs. */
export interface Timing { hits: number; misses: number; secs: number; need?: number }
/** What a strike came to. `what` and `size` are told when something is hooked (the trial knows them even when nothing is). */
export interface Struck { hooked: boolean; how?: "early" | "missed"; what?: CatchId; size?: number; landed?: boolean; kept?: boolean; record?: boolean }
export interface Landed { how: FishingEnd; kept: boolean; record: boolean }

export interface Keeper {
  readonly id: string;
  /** The browser's trial when that is what keeps things: the test window and the "skip a round" buttons are its. Null when the database keeps them. */
  readonly trial: Trial | null;
  /** Whether my purse has been read yet; and whether the town's game is open to me (null until it is known). */
  ready(): boolean;
  open(): boolean | null;
  /** Be told when anything kept changes. Returns how to stop. */
  watch(fn: () => void): () => void;
  /** Keep what others may change in sight while it is looked at. Returns how to stop. */
  look(what: Looked): () => void;
  /** The room said something changed. */
  nudged(what: Looked): void;
  /** Set by the map: told after a deed of mine that others will want to see (and, for a deal, who). */
  onDeed: ((what: Looked, to?: string) => void) | null;
  now(): number;

  purse(): Purse;
  stall(): Stall;
  /** What I am told of the relatives' prices (lib/town/market): of each thing I hold or have left with the uncle whose price moves. Of none, where no price moves yet. */
  prices(): PricesTold;
  shelf(): ItemId[];
  order(): Order | null;
  nextHint(): ItemId | null;
  farm(): Record<string, Plot>;
  well(): number;
  owners(): Map<number, { by: string; name: string }>;
  deedAt(key: string): Deed | null;
  /** The stretches of rain the plots have had (lib/town/weather): what the farm's rules are read with. */
  rains(): readonly Rain[];
  choreAt(where: Water): Chore | null;
  pots(): Pot[];
  found(): ItemId[];
  finder(id: ItemId): string | null;
  madeBefore(id: ItemId): boolean;
  triesAt(id: ItemId): number;
  known(): DishId[];
  knownMakes(): ItemId[];
  cookTry(things: Array<[ItemId, number]>, crew: Array<ItemId | null>): Refusal | null;
  deal(): KeptDeal | null;
  /** The fountain as it was last told (lib/town/fountain); null until it has been looked at. */
  fountain(): FountainTold | null;
  /** The notice board beside the stall as it was last told (lib/town/notices); null until it has been looked at, and where there is none yet. */
  notices(): PinboardTold | null;

  buy(item: ItemId, n: number): Promise<Did>;
  hint(): Promise<Did<{ hint: ItemId }>>;
  orderGive(slot: number, n: number): Promise<Did<{ given: number; coins: number; opened: ItemId | null }>>;
  leave(slot: number, n: number): Promise<Did>;
  takeBack(at: number): Promise<Did>;
  collect(): Promise<Did<{ coins: number }>>;
  change(kind: keyof Purse["popoto"], n: number): Promise<Did>;
  /** Toss coins into the fountain, towards a wish: what it took (no more than fills the pot), what that counted for, and the wish that came true, if it filled it. */
  toss(wish: WishId, coins: number, note?: string | null): Promise<Did<{ took: number; counted: number; granted: WishId | null }>>;
  /** Toss coins onto somebody's wish (towards the wish it was for); say one should not be there; take my own back; and, an admin, hide one or show it again. */
  cheer(note: number, coins: number): Promise<Did<{ took: number; counted: number; granted: WishId | null }>>;
  wishReport(note: number): Promise<Did>;
  wishUnsay(note: number): Promise<Did>;
  wishHide(note: number, hidden: boolean): Promise<Did>;
  /** The notice board: pin a notice up (to sell so many of a thing from my bag, or of something wanted, with the coins put down); buy from one, or bring to one; take what was brought to mine; take mine down; collect what waits there; buy one more place. */
  noticePost(kind: "sell" | "want", item: ItemId, n: number, price: number): Promise<Did<{ id: number }>>;
  noticeBuy(id: number, n: number): Promise<Did<{ item: ItemId; coins: number }>>;
  noticeFill(id: number, n: number): Promise<Did<{ item: ItemId; coins: number }>>;
  noticeFetch(id: number): Promise<Did<{ item: ItemId; got: number }>>;
  noticeDown(id: number): Promise<Did<{ item: ItemId; things: number; coins: number }>>;
  noticeCollect(): Promise<Did<{ coins: number }>>;
  noticeSlot(): Promise<Did<{ coins: number }>>;
  sitDown(slot: number, seated: boolean): Promise<Did<{ dish: DishId }>>;
  /** Count the meal on, with so many eating beside one (asked every second; a keeper may ask less often of whoever it keeps with). */
  chew(company: number): void;
  getUp(company: number): Promise<void>;
  readScroll(slot: number): Promise<Did<{ dish: ItemId }>>;
  openThing(slot: number): Promise<Did<{ found: ItemId | null }>>;
  /** Take up the thing in a slot, to hold it; null puts away what is held. */
  hold(slot: number | null): Promise<Did>;
  wear(slot: number): Promise<Did>;
  takeOff(item: ItemId): Promise<Did>;
  serve(slot: number): Promise<Did<{ dish: DishId }>>;
  drop(slot: number): Promise<Did>;

  /**
   * Fishing. A line is dropped from a tile with a bait: the answer is how long until the bite and when the float
   * twitches first, in seconds (and how much of that has gone by already, getting here), never what is on its way.
   * A strike says what was hooked, if anything; `missed` that the float came up again with nobody striking; `land`
   * how the fight ended, with the hand's own account of it.
   */
  cast(bait: BaitId, place: { tile: [number, number]; deep: boolean }, rain: boolean, quick?: boolean): Promise<Did<{ wait: number; nibbles: number[]; lag: number; shade?: Shade }>>;
  strike(reaction: number, how: Strike | null): Promise<Did<Struck>>;
  missed(): Promise<{ what?: CatchId; size?: number }>;
  land(how: "landed" | "snapped" | "slipped" | "left", fight: Record<string, unknown> | null): Promise<Landed>;

  /** `sure`: the page has asked a second time and been told that a living plant is meant to be dug out (lib/town/farm). */
  farmDo(key: string, name: string, timing?: Timing, sure?: boolean): Promise<Did<{ deed: Deed; got: Array<[ItemId, number]> }>>;
  choreDo(where: Water, at: [number, number] | null): Promise<Did<{ chore: Chore }>>;

  /** The forest (lib/town/forest): every place that has something for me now. */
  wild(): Sight[];
  /** Gather what a place has, from the tile I stand on, with how its game went (and how long it took). */
  gatherDo(spot: number, at: [number, number], went: Outcome & { secs?: number }): Promise<Did<{ got: Array<[ItemId, number]> }>>;

  /** Insects (lib/town/insects): every haunt that has one for me now. */
  bugs(): BugSight[];
  /**
   * Catch what a haunt has, from the tile I stand on: how many swings missed first, and (a beetle, which comes down
   * only to something sweet) what whoever stands under its tree holds, and who they are. `first`: nobody in the
   * village had caught one before.
   */
  netDo(haunt: number, at: [number, number], went: { misses: number; lure?: ItemId | null; by?: string | null }, name: string): Promise<Did<{ got: Array<[ItemId, number]>; first: boolean }>>;
  /** The village's book of insects: who first caught each kind that has been caught. */
  bugBook(): Record<string, string>;

  /**
   * The well's book (lib/town/well): what came of the water I carried, who carried today, my rank and whether the
   * well has something for me. Null until it has been read, and for as long as whoever keeps the game knows of no
   * book. `ranks` is everybody who has a rank, for the names over heads.
   */
  wellBook(): WellBook | null;
  ranks(): Record<string, number>;
  /** Read the book again. */
  wellLook(): Promise<void>;
  /** Take what the well has waiting for me. */
  wellTake(): Promise<Did<{ gift: ItemId; rank: number }>>;

  /** Put some things together. The other cooks are told both ways: what each holds (as the room shows it), and who they are (the database reads each one's hand itself). */
  cookDo(things: Array<[ItemId, number]>, crew: Array<ItemId | null>, cooks: string[], timing: Timing, name: string): Promise<Did<{ made: ItemId | null; n: number; first: boolean; taste?: Taste }>>;
  potDown(at: [number, number]): Promise<Did<{ pot: Pot }>>;
  potLadle(id: string, at: [number, number] | null): Promise<Did<{ pot: Pot | null }>>;
  potTake(id: string, at: [number, number] | null): Promise<Did>;

  dealOpen(other: string, myName: string, otherName: string): Promise<Did>;
  dealLay(give: Give, coins?: number): Promise<Did>;
  dealAgree(word?: boolean): Promise<Did<{ done: boolean }>>;
  dealCancel(): Promise<void>;

  /** Write a go at a game of timing down (the trial's own log; the database writes its own as the deed is done). */
  record(play: Play): void;
  /** Stop every timer: the member has left the town. */
  close(): void;
}

/**
 * One function of the town's, asked of the database: its answer as it came, or
 * `{ denied: true }` when the database refuses whoever asks (not signed in, no
 * proved character, the game not open to them), or null when it could not be
 * reached.
 */
export type Ask = (fn: string, args?: Record<string, unknown>) => Promise<unknown>;
type Answer = Record<string, unknown>;

/** How often what others may change is asked for while it is looked at, in milliseconds. A nudge from the room asks at once. */
const EVERY: Record<Looked, number> = { stall: 30_000, farm: 60_000, kitchen: 90_000, deal: 60_000, fountain: 60_000, wild: 45_000, bugs: 45_000, notices: 30_000 };
/** A deal that is open is the one thing two people watch each other do: asked for this often while it is. */
const DEAL_OPEN = 2500;
/** A meal is counted on with the database this often, and whenever the company changes. */
const CHEW = 20_000;
/** How often a keeper told the game is shut asks whether it is open yet. */
const SHUT_MS = 5 * 60_000;
/** How often everybody's rank at the well is asked for again. */
const RANKS_MS = 5 * 60_000;
/** How long an ended deal is still shown. */
const ENDED_MS = 6000;
/** The database gives a late strike this much grace (the catalog's `fishing.slack.late`), and a little for the clocks. */
const LATE_MS = 1500 + 300;
const AWAY: { ok: false; why: Why } = { ok: false, why: "away" };

export class DbKeeper implements Keeper {
  readonly trial = null;
  onDeed: ((what: Looked, to?: string) => void) | null = null;

  private readonly heard = new Set<() => void>();
  private readonly looking = new Map<Looked, { n: number; timer: ReturnType<typeof setTimeout> | null }>();
  private line: Promise<unknown> = Promise.resolve();
  private shut = false;

  private skew = 0;
  private mine: Purse = newPurse();
  private read = false;
  private opened: boolean | null = null;
  private stall_: Stall = newStall();
  private prices_: PricesTold = NO_PRICES;
  private unlocked = 0;
  private shelf_: ItemId[] = shelfOf(0);
  private order_: Order | null = null;
  private found_: ItemId[] = [];
  private finders_: Record<string, string> = {};
  private plots: Record<string, Plot> = {};
  private beds: Record<string, KeptBed> = {};
  private well_ = 0;
  private farmAt = 0;
  private pots_: Pot[] = [];
  private deal_: KeptDeal | null = null;
  private fountain_: FountainTold | null = null;
  private notices_: PinboardTold | null = null;
  /** What the forest's places and the haunts have for me, each until its turn ends; and the village's book of insects. */
  private wild_: Array<Sight & { until: number }> = [];
  private bugs_: Array<BugSight & { until: number }> = [];
  private book_: Record<string, string> = {};
  private wellBook_: WellBook | null = null;
  private ranks_: Record<string, number> = {};
  private ranksAgain: ReturnType<typeof setInterval> | null = null;

  /** The meal: who is beside me as last told to the database, when that was, and the timer for its end. */
  private company = 0;
  private chewed = 0;
  private chewing = false;
  private mealEnd: ReturnType<typeof setTimeout> | null = null;

  readonly id: string;
  private readonly rpc: Ask;
  constructor(id: string, rpc: Ask) {
    this.id = id;
    this.rpc = rpc;
    this.line = this.begin();
  }
  /** How many times the town could not be reached at the beginning, and the wait before it is asked again. */
  private tries = 0;
  private retry: ReturnType<typeof setTimeout> | null = null;

  /**
   * The first thing asked: whether the game is open to me (v115's `town_is_open`: an admin always, a proved
   * character once the owner has opened it), so that somebody it is not open to is told so without being refused
   * anything. Then my purse. A database that has not heard the question is asked for the purse straight away, and
   * says no by refusing it.
   */
  private async begin() {
    let open: unknown = null;
    try { open = await this.rpc("town_is_open"); } catch { open = null; }
    if (open === false) {
      if (this.opened !== false) { this.opened = false; this.tell(); }
      // Shut to me now. Asked again now and then, so that the game opens here when its owner opens it, without the
      // page being loaded again.
      this.retry = setTimeout(() => { this.retry = null; this.line = this.line.then(() => this.begin()); }, SHUT_MS);
      return;
    }
    await this.once("town_me", {});
    // Everybody's rank at the well, for the names over heads: asked once the game is mine, and again now and then.
    // (A database that has no such book yet answers nothing, and nobody has a rank.)
    if (this.read && !this.shut && !this.ranksAgain) {
      void this.ask("town_well_ranks");
      this.ranksAgain = setInterval(() => { void this.ask("town_well_ranks"); }, RANKS_MS);
    }
    if (this.read || this.opened === false || this.shut) return;
    // The town could not be reached: asked again in a while, a little later each time. (On a timer, not here: what
    // is asked meanwhile is answered "away" at once, not kept waiting.)
    this.retry = setTimeout(() => { this.retry = null; this.line = this.line.then(() => this.begin()); }, Math.min(60_000, 4000 * 2 ** this.tries++));
  }

  /* ── asking ── */
  private tell() { for (const fn of this.heard) fn(); }
  watch(fn: () => void): () => void { this.heard.add(fn); return () => { this.heard.delete(fn); }; }
  now(): number { return Date.now() + this.skew; }
  ready(): boolean { return this.read; }
  open(): boolean | null { return this.opened; }

  /** Ask, in turn: after everything asked before it has been answered. Null when it could not be had. */
  private ask(fn: string, args: Record<string, unknown> = {}): Promise<Answer | null> {
    const asked = this.line.then(() => this.once(fn, args));
    this.line = asked.catch(() => null);
    return asked;
  }
  private async once(fn: string, args: Record<string, unknown>): Promise<Answer | null> {
    if (this.shut) return null;
    const sent = Date.now();
    let got: unknown = null;
    try { got = await this.rpc(fn, args); } catch { got = null; }
    // (a function that answers with a table answers with a list of one line)
    const a = (Array.isArray(got) ? got[0] : got) as Answer | null;
    if (!a || typeof a !== "object") return null;
    if (a.denied) { if (this.opened !== false) { this.opened = false; this.tell(); } return null; }
    this.take(a, sent);
    return a;
  }

  /** Keep what an answer brought. */
  private take(a: Answer, sent: number) {
    // The database's clock, less this one's: read off the middle of the asking, so that half the journey each way cancels.
    if (typeof a.now === "number") this.skew = a.now - (sent + Date.now()) / 2;
    if (a.purse && typeof a.purse === "object") { this.mine = a.purse as Purse; this.read = true; this.opened = true; this.meal(); }
    if (a.stall && typeof a.stall === "object") this.stall_ = a.stall as Stall;
    // (the stall's answer, and a thing left or taken back: a database that has no moving price yet says nothing, and every thing keeps its one price)
    if (a.prices && typeof a.prices === "object" && typeof (a.prices as PricesTold).things === "object") this.prices_ = a.prices as PricesTold;
    if (typeof a.unlocked === "number") this.unlocked = a.unlocked;
    // The shelf is the database's, and the database can come to sell a thing this page was built before (the scroll of
    // the cure for pests did, on the game's first day, with members in town who had not loaded the page again). Such
    // a thing is left off: a shelf one short is better than a shelf that cannot be drawn. How many of his orders are
    // filled is the uncle's own count when he says it, and only otherwise the length of his shelf.
    if (Array.isArray(a.shelf)) {
      const shelf = a.shelf as ItemId[];
      this.shelf_ = shelf.filter((id) => id in ITEMS);
      if (typeof a.unlocked !== "number") this.unlocked = Math.max(0, shelf.length - shelfOf(0).length);
    }
    if (a.order && typeof a.order === "object") this.order_ = a.order as Order;
    // (a list of what has been found: a thing opened says `found` too, of what was in it, which is one thing or none)
    if (Array.isArray(a.found)) this.found_ = a.found as ItemId[];
    if (a.finders && typeof a.finders === "object") this.finders_ = a.finders as Record<string, string>;
    if (a.plots && typeof a.plots === "object") for (const [key, plot] of Object.entries(a.plots as Record<string, Plot>)) this.plot(key, plot);
    if (typeof a.key === "string" && a.plot && typeof a.plot === "object") this.plot(a.key, a.plot as Plot);
    if (a.beds && typeof a.beds === "object") this.beds = a.beds as Record<string, KeptBed>;
    if (typeof a.key === "string" && "bed" in a) {
      const [x, y] = a.key.split(",").map(Number), n = String(bedOf(x, y)), beds = { ...this.beds };
      if (a.bed && typeof a.bed === "object") beds[n] = a.bed as KeptBed; else delete beds[n];
      this.beds = beds;
    }
    if (typeof a.well === "number") this.well_ = a.well;
    if (Array.isArray(a.pots)) this.pots_ = a.pots as Pot[];
    if (a.fountain && typeof a.fountain === "object") this.fountain_ = a.fountain as FountainTold;
    if (a.notices && typeof a.notices === "object" && Array.isArray((a.notices as PinboardTold).notices)) this.notices_ = a.notices as PinboardTold;
    // (a thing or an insect this page was built before is left out: it could not be drawn)
    if (Array.isArray(a.wild)) {
      this.wild_ = (a.wild as Array<[number, ItemId | null, number, number]>).filter((s) => Array.isArray(s) && (s[1] === null || s[1] in ITEMS)).map(([id, item, n, until]) => ({ id, item, n, until }));
    }
    if (Array.isArray(a.bugs)) {
      this.bugs_ = (a.bugs as Array<[number, BugId, number, number, number]>).filter((s) => Array.isArray(s) && s[1] in BUGS).map(([id, bug, turn, seed, until]) => ({ id, bug, turn, seed, until }));
    }
    if (a.book && typeof a.book === "object") this.book_ = a.book as Record<string, string>;
    if (a.ranks && typeof a.ranks === "object") this.ranks_ = a.ranks as Record<string, number>;
    if (a.wellBook && typeof a.wellBook === "object") {
      this.wellBook_ = a.wellBook as WellBook;
      // (my own rank is in my book: it need not wait for everybody's to be asked for again)
      const others = { ...this.ranks_ };
      delete others[this.id];
      this.ranks_ = this.wellBook_.rank > 0 ? { ...others, [this.id]: this.wellBook_.rank } : others;
    }
    if ("deal" in a) this.dealt(a.deal as (KeptDeal & { end?: string | null }) | null, !!a.purse);
    this.tell();
  }
  private plot(key: string, plot: Plot) {
    const next = { ...this.plots };
    if (plot.soil === "wild" && !plot.plant) delete next[key]; else next[key] = plot;
    this.plots = next;
  }
  /** My deal as the database tells it: open, or just ended (which is shown for a moment, then forgotten). */
  private dealt(told: (KeptDeal & { end?: string | null }) | null, withPurse: boolean) {
    const was = this.deal_;
    if (!told) { this.deal_ = was?.end ? was : null; return; }
    const end = told.end === "done" || told.end === "off" ? told.end : undefined;
    if (!end) { this.deal_ = { ...told, end: undefined }; return; }
    // an end is news once: when the deal that was open here is the one that ended
    if (was && !was.end && was.at === told.at) {
      this.deal_ = { ...told, end, endAt: Date.now() };
      setTimeout(() => { if (this.deal_?.end && this.deal_.at === told.at) { this.deal_ = null; this.tell(); } }, ENDED_MS);
      // what changed hands is in my purse now, whoever gave the last word: asked for, when this answer did not bring it
      if (end === "done" && !withPurse) void this.ask("town_me");
    }
  }

  /* ── what others change ── */
  look(what: Looked): () => void {
    const l = this.looking.get(what) ?? { n: 0, timer: null };
    l.n++;
    this.looking.set(what, l);
    if (l.n === 1) this.fetch(what);
    return () => {
      l.n--;
      if (l.n <= 0 && l.timer) { clearTimeout(l.timer); l.timer = null; }
    };
  }
  nudged(what: Looked) { if ((this.looking.get(what)?.n ?? 0) > 0 || what === "deal") this.fetch(what); }
  /** Ask for one of them now, and again in its time while it is looked at. */
  private fetch(what: Looked) {
    const l = this.looking.get(what);
    if (l?.timer) { clearTimeout(l.timer); l.timer = null; }
    const asked = what === "stall" ? this.ask("town_stall")
      : what === "kitchen" ? this.ask("town_kitchen")
      : what === "deal" ? this.ask("town_deal")
      : what === "fountain" ? this.ask("town_fountain")
      : what === "notices" ? this.ask("town_notices")
      : what === "wild" ? this.ask("town_wild")
      : what === "bugs" ? this.ask("town_bugs")
      : this.ask("town_farm", { p_since: this.farmAt }).then((a) => { if (a && typeof a.now === "number") this.farmAt = a.now; return a; });
    void asked.then(() => {
      const still = this.looking.get(what);
      if (this.shut || !still || still.n <= 0 || still.timer) return;
      still.timer = setTimeout(() => { still.timer = null; this.fetch(what); }, what === "deal" && this.deal_ && !this.deal_.end ? DEAL_OPEN : EVERY[what]);
    });
  }

  /* ── what is kept, read at once ── */
  /** My purse; while a meal is on, with what it has given up to this moment (the rule's own count, kept only when the database counts it). */
  purse(): Purse { return this.mine.eating ? chew(this.mine, this.company, this.now()).purse : this.mine; }
  stall(): Stall { return this.stall_; }
  prices(): PricesTold { return this.prices_; }
  shelf(): ItemId[] { return this.shelf_; }
  order(): Order | null { return this.order_; }
  nextHint(): ItemId | null { const at = sourcesAt(this.unlocked, true); return nextHint(this.mine, this.found_, (id) => at.has(id)); }
  farm(): Record<string, Plot> { return this.plots; }
  well(): number { return this.well_; }
  owners(): Map<number, { by: string; name: string }> {
    const now = this.now(), planted = new Map<number, number>(), out = new Map<number, { by: string; name: string }>();
    for (const [key, plot] of Object.entries(this.plots)) {
      if (!plot.plant) continue;
      const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
      planted.set(bed, (planted.get(bed) ?? 0) + 1);
    }
    for (const [n, bed] of Object.entries(this.beds)) {
      const by = ownerOf(bed, (planted.get(Number(n)) ?? 0) > 0, now);
      if (by) out.set(Number(n), { by, name: bed.name || "" });
    }
    return out;
  }
  deedAt(key: string): Deed | null {
    const [x, y] = key.split(",").map(Number);
    return deedFor(key, this.plots[key] ?? WILD, handOf(this.mine), this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, SKIES.rains());
  }
  rains(): readonly Rain[] { return SKIES.rains(); }
  choreAt(where: Water): Chore | null { return choreFor(this.mine, where, this.well_); }
  wellBook(): WellBook | null { return this.wellBook_; }
  ranks(): Record<string, number> { return this.ranks_; }
  pots(): Pot[] { return this.pots_; }
  found(): ItemId[] { return this.found_; }
  finder(id: ItemId): string | null { return this.finders_[id] ?? null; }
  madeBefore(id: ItemId): boolean { return hasMade(this.mine, id); }
  triesAt(id: ItemId): number { return this.mine.tries?.[id] ?? 0; }
  known(): DishId[] { return [...new Set<ItemId>([...this.mine.recipes, ...this.found_])].filter((id): id is DishId => id in DISHES); }
  knownMakes(): ItemId[] { return [...new Set<ItemId>([...(this.mine.made ?? []), ...this.mine.recipes, ...this.found_])].filter((id) => !(id in DISHES)); }
  cookTry(things: Array<[ItemId, number]>, crew: Array<ItemId | null>): Refusal | null {
    const did = cook(this.mine, things, crew, 0, this.now());
    return did.ok ? null : did.why;
  }
  deal(): KeptDeal | null { return this.deal_; }
  fountain(): FountainTold | null { return this.fountain_; }
  notices(): PinboardTold | null { return this.notices_; }

  /* ── deeds ── */
  /** A deed's answer as the panels take it: what the rule answered, or that the town could not be reached. */
  private async deed<T>(fn: string, args: Record<string, unknown> = {}): Promise<Did<T>> {
    const a = await this.ask(fn, args);
    if (!a) return AWAY;
    return (a.ok ? a : { ok: false, why: (a.why as Why) ?? "none" }) as Did<T>;
  }
  buy(item: ItemId, n: number) { return this.deed("town_buy", { p_item: item, p_n: n }); }
  hint() { return this.deed<{ hint: ItemId }>("town_hint"); }
  orderGive(slot: number, n: number) { return this.deed<{ given: number; coins: number; opened: ItemId | null }>("town_give", { p_slot: slot, p_n: n }); }
  leave(slot: number, n: number) { return this.deed("town_leave", { p_slot: slot, p_n: n }); }
  takeBack(at: number) { return this.deed("town_take_back", { p_at: at }); }
  collect() { return this.deed<{ coins: number }>("town_collect"); }
  async change(kind: keyof Purse["popoto"], n: number): Promise<Did> {
    const did = await this.deed("town_exchange", { p_kind: kind, p_popoto: n });
    // (the bank's own function answers with its counts and no purse: read mine again)
    if (did.ok) await this.ask("town_me");
    return did;
  }
  async toss(wish: WishId, coins: number, note: string | null = null) {
    const did = await this.deed<{ took: number; counted: number; granted: WishId | null }>("town_toss", { p_wish: wish, p_coins: coins, p_note: note });
    // (the pot is everybody's to see, and a wish granted is theirs whose coins were in it)
    if (did.ok) this.onDeed?.("fountain");
    return did;
  }
  async cheer(note: number, coins: number) {
    const did = await this.deed<{ took: number; counted: number; granted: WishId | null }>("town_cheer", { p_note: note, p_coins: coins });
    if (did.ok) this.onDeed?.("fountain");
    return did;
  }
  wishReport(note: number) { return this.deed("town_wish_report", { p_note: note }); }
  /** A deed at the notice board: what it came to, and the room told when it changed what others see there. */
  private async pinned<T>(fn: string, args: Record<string, unknown>, shown: boolean): Promise<Did<T>> {
    const did = await this.deed<T>(fn, args);
    if (did.ok && shown) this.onDeed?.("notices");
    return did;
  }
  noticePost(kind: "sell" | "want", item: ItemId, n: number, price: number) { return this.pinned<{ id: number }>("town_notice_post", { p_kind: kind, p_item: item, p_n: n, p_price: price }, true); }
  noticeBuy(id: number, n: number) { return this.pinned<{ item: ItemId; coins: number }>("town_notice_buy", { p_id: id, p_n: n }, true); }
  noticeFill(id: number, n: number) { return this.pinned<{ item: ItemId; coins: number }>("town_notice_fill", { p_id: id, p_n: n }, true); }
  noticeFetch(id: number) { return this.pinned<{ item: ItemId; got: number }>("town_notice_fetch", { p_id: id }, false); }
  noticeDown(id: number) { return this.pinned<{ item: ItemId; things: number; coins: number }>("town_notice_down", { p_id: id }, true); }
  noticeCollect() { return this.pinned<{ coins: number }>("town_notice_collect", {}, false); }
  noticeSlot() { return this.pinned<{ coins: number }>("town_notice_slot", {}, false); }
  async wishUnsay(note: number) { const did = await this.deed("town_wish_unsay", { p_note: note }); if (did.ok) this.onDeed?.("fountain"); return did; }
  async wishHide(note: number, hidden: boolean) { const did = await this.deed("town_wish_hide", { p_note: note, p_hidden: hidden }); if (did.ok) this.onDeed?.("fountain"); return did; }
  sitDown(slot: number, seated: boolean) { return this.deed<{ dish: DishId }>("town_sit", { p_slot: slot, p_seated: seated }); }
  chew(company: number) {
    if (!this.mine.eating || this.chewing) return;
    const real = Date.now();
    if (company === this.company && real - this.chewed < CHEW) return;
    this.munch(company);
  }
  /** Count the meal on with the database, with whoever is beside me now. */
  private munch(company: number) {
    this.chewing = true;
    this.company = company;
    this.chewed = Date.now();
    void this.ask("town_chew", { p_company: company }).finally(() => { this.chewing = false; });
  }
  /** A meal's end is asked for when its time is up, whoever is watching. */
  private meal() {
    if (this.mealEnd) { clearTimeout(this.mealEnd); this.mealEnd = null; }
    const e = this.mine.eating;
    if (!e) return;
    const till = e.from + STAMINA.minutes * 60_000 - this.now();
    this.mealEnd = setTimeout(() => { this.mealEnd = null; if (this.mine.eating) this.munch(this.company); }, Math.max(0, till) + 300);
  }
  async getUp(company: number) { if (this.mine.eating) await this.ask("town_get_up", { p_company: company }); }
  readScroll(slot: number) { return this.deed<{ dish: ItemId }>("town_read", { p_slot: slot }); }
  /** (Its answer's `found` is what was inside, one thing or none: not the list of what has been found, which is a list and so is not mistaken for it.) */
  openThing(slot: number) { return this.deed<{ found: ItemId | null }>("town_open", { p_slot: slot }); }
  hold(slot: number | null) { return this.deed("town_hold", { p_slot: slot }); }
  wear(slot: number) { return this.deed("town_wear", { p_slot: slot }); }
  takeOff(item: ItemId) { return this.deed("town_take_off", { p_item: item }); }
  serve(slot: number) { return this.deed<{ dish: DishId }>("town_serve", { p_slot: slot }); }
  drop(slot: number) { return this.deed("town_drop", { p_slot: slot }); }

  async cast(bait: BaitId, place: { tile: [number, number]; deep: boolean }, rain: boolean): Promise<Did<{ wait: number; nibbles: number[]; lag: number; shade?: Shade }>> {
    const sent = Date.now(), a = await this.ask("town_cast", { p_bait: bait, p_x: place.tile[0], p_y: place.tile[1], p_rain: rain });
    if (!a) return AWAY;
    if (!a.ok) return { ok: false, why: (a.why as Why) ?? "none" };
    // (under clear water the database tells the shade of what is on its way, and nothing more of it)
    const line = a.line as { wait: number; nibbles: number[]; shade?: Shade };
    return { ok: true, wait: line.wait, nibbles: line.nibbles, lag: Math.max(0, (Date.now() - sent) / 2000), ...(line.shade ? { shade: line.shade } : {}) };
  }
  async strike(reaction: number): Promise<Did<Struck>> {
    const a = await this.ask("town_strike", { p_reaction: Math.round(reaction * 1000) });
    if (!a) return AWAY;
    if (!a.ok) return { ok: false, why: (a.why as Why) ?? "none" };
    return { ok: true, hooked: !!a.hooked, how: a.how as Struck["how"], what: a.what as CatchId | undefined, size: a.size as number | undefined,
      landed: !!a.landed, kept: a.kept as boolean | undefined, record: false };
  }
  async missed(): Promise<{ what?: CatchId; size?: number }> {
    // Told when the database, too, counts the bite as gone: it gives a late strike a moment's grace, and one sent
    // inside that would hook. The wait is in the line like everything else, so a line dropped again meanwhile is
    // dropped after this one has been given up, not before.
    this.line = this.line.then(() => new Promise((done) => setTimeout(done, LATE_MS)));
    const a = await this.ask("town_strike", { p_reaction: null });
    // (still hooked, by clocks that disagree: let it go)
    if (a?.ok && a.hooked && !a.landed) await this.ask("town_land", { p_how: "slipped", p_fight: null });
    return {};
  }
  async land(how: "landed" | "snapped" | "slipped" | "left", fight: Record<string, unknown> | null): Promise<Landed> {
    const a = await this.ask("town_land", { p_how: how, p_fight: fight });
    if (!a?.ok) return { how: how === "landed" ? "slipped" : how, kept: false, record: false };
    return { how: a.how as FishingEnd, kept: !!a.kept, record: !!a.record };
  }

  async farmDo(key: string, _name: string, timing?: Timing, sure = false): Promise<Did<{ deed: Deed; got: Array<[ItemId, number]> }>> {
    const [x, y] = key.split(",").map(Number);
    // (the word is sent only when it is given: a database that has not had v119 knows no such argument, and every
    // other deed is to go on being done there)
    const did = await this.deed<{ deed: Deed; got: Array<[ItemId, number]> }>("town_tend", { p_x: x, p_y: y, p_timing: timing ?? null, ...(sure ? { p_sure: true } : {}) });
    if (did.ok) this.onDeed?.("farm");
    return did;
  }
  /**
   * The forest and the insects (v125): what each place and each haunt has is asked for while it is looked at, and
   * kept until its turn ends. A database that has not had v125 answers nothing, and there is nothing to gather.
   */
  wild(): Sight[] { const now = this.now(); return this.wild_.filter((s) => s.until > now); }
  async gatherDo(spot: number, at: [number, number], went: Outcome & { secs?: number }): Promise<Did<{ got: Array<[ItemId, number]> }>> {
    const did = await this.deed<{ got: Array<[ItemId, number]> }>("town_gather", { p_spot: spot, p_x: at[0], p_y: at[1], p_went: went });
    // (gathered, or there is nothing there for me after all: either way the place has no more for me)
    if (did.ok || did.why === "had" || did.why === "bare" || did.why === "none") { this.wild_ = this.wild_.filter((s) => s.id !== spot); this.tell(); }
    return did;
  }
  bugs(): BugSight[] { const now = this.now(); return this.bugs_.filter((s) => s.until > now); }
  async netDo(haunt: number, at: [number, number], went: { misses: number; lure?: ItemId | null; by?: string | null }, name: string): Promise<Did<{ got: Array<[ItemId, number]>; first: boolean }>> {
    // (who stands under the tree is told by who they are: what they hold is their own purse's to say)
    const by = went.by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(went.by) ? went.by : null;
    const did = await this.deed<{ got: Array<[ItemId, number]>; first: boolean }>("town_net", { p_haunt: haunt, p_x: at[0], p_y: at[1], p_misses: went.misses, p_by: by });
    if (did.ok || did.why === "had" || did.why === "bare" || did.why === "none") {
      if (did.ok && did.first && did.got[0]) this.book_ = { ...this.book_, [did.got[0][0]]: name };
      this.bugs_ = this.bugs_.filter((s) => s.id !== haunt);
      this.tell();
    }
    return did;
  }
  bugBook(): Record<string, string> { return this.book_; }

  async choreDo(_where: Water, at: [number, number] | null): Promise<Did<{ chore: Chore }>> {
    if (!at) return { ok: false, why: "none" };
    const did = await this.deed<{ chore: Chore }>("town_chore", { p_x: at[0], p_y: at[1] });
    if (did.ok && did.chore !== "draw") this.onDeed?.("farm");
    // (the book changes with a bucketful poured: read again by whoever has had it open)
    if (did.ok && did.chore === "pour" && this.wellBook_) void this.ask("town_well");
    return did;
  }
  async wellLook() { await this.ask("town_well"); }
  wellTake() { return this.deed<{ gift: ItemId; rank: number }>("town_well_take"); }

  async cookDo(things: Array<[ItemId, number]>, _crew: Array<ItemId | null>, cooks: string[], timing: Timing): Promise<Did<{ made: ItemId | null; n: number; first: boolean; taste?: Taste }>> {
    const did = await this.deed<{ made: ItemId | null; n: number; first: boolean; taste?: Taste }>("town_cook", { p_things: things, p_crew: cooks, p_timing: timing });
    // a find is everybody's: the list of them is asked for again, by me and by whoever is in the kitchen
    if (did.ok && did.first) { void this.ask("town_kitchen"); this.onDeed?.("kitchen"); }
    return did;
  }
  async potDown(at: [number, number]): Promise<Did<{ pot: Pot }>> {
    const did = await this.deed<{ pot: Pot }>("town_pot_down", { p_x: at[0], p_y: at[1] });
    if (did.ok) { this.pots_ = [...this.pots_.filter((o) => o.id !== did.pot.id), did.pot]; this.tell(); this.onDeed?.("kitchen"); }
    else if (did.why === "taken") this.fetch("kitchen");
    return did;
  }
  async potLadle(id: string, at: [number, number] | null): Promise<Did<{ pot: Pot | null }>> {
    const did = await this.deed<{ pot: Pot | null }>("town_pot_ladle", { p_id: id, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
    if (did.ok) {
      const left = did.pot;
      this.pots_ = left ? this.pots_.map((o) => (o.id === id ? left : o)) : this.pots_.filter((o) => o.id !== id);
      this.tell();
      this.onDeed?.("kitchen");
    } else if (did.why === "gone") { this.pots_ = this.pots_.filter((o) => o.id !== id); this.tell(); }
    return did;
  }
  async potTake(id: string, at: [number, number] | null): Promise<Did> {
    const did = await this.deed("town_pot_take", { p_id: id, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
    if (did.ok || did.why === "gone") { this.pots_ = this.pots_.filter((o) => o.id !== id); this.tell(); }
    if (did.ok) this.onDeed?.("kitchen");
    return did;
  }

  async dealOpen(other: string): Promise<Did> {
    const did = await this.deed("town_deal_open", { p_other: other });
    if (did.ok) this.onDeed?.("deal", other);
    return did;
  }
  private other(): string | undefined { const d = this.deal_; return d ? (d.a === this.id ? d.b : d.a) : undefined; }
  async dealLay(give: Give, coins = 0): Promise<Did> {
    const to = this.other(), did = await this.deed("town_deal_lay", { p_give: give, p_coins: coins });
    if (did.ok) this.onDeed?.("deal", to);
    return did;
  }
  async dealAgree(word = true): Promise<Did<{ done: boolean }>> {
    const to = this.other(), did = await this.deed<{ done: boolean }>("town_deal_agree", { p_word: word });
    this.onDeed?.("deal", to);
    return did;
  }
  async dealCancel() {
    const to = this.other();
    await this.ask("town_deal_cancel");
    this.onDeed?.("deal", to);
  }

  record() { /* the database writes every go down itself, as the deed is done */ }
  close() {
    this.shut = true;
    for (const l of this.looking.values()) if (l.timer) clearTimeout(l.timer);
    this.looking.clear();
    if (this.mealEnd) clearTimeout(this.mealEnd);
    if (this.retry) clearTimeout(this.retry);
    if (this.ranksAgain) clearInterval(this.ranksAgain);
    this.heard.clear();
  }
}
