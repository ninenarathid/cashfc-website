import type { Box, BoxRefusal } from "./box";
import { cook, hasMade, tidied, type FeastTold, type Pot, type Taste } from "./cooking";
import type { Give } from "./deal";
import { WILD, choreFor, deedFor, ownerOf, type Chore, type Deed, type FarmRefusal, type FarmSky, type Plot, type Swarms } from "./farm";
import type { FishRefusal, Strike } from "./fishing";
import type { ForestRefusal, Outcome, Sight } from "./forest";
import type { HuntTold } from "./hunt";
import { BUGS, type BugId, type BugRefusal, type BugSight, type Mine } from "./insects";
import type { FountainTold, Shade, WishId } from "./fountain";
import type { Dropped, GroundRefusal } from "./ground";
import { hintPrice } from "./hints";
import type { JarTold } from "./jar";
import { carried, type PassRefusal } from "./line";
import { reachOf } from "./ditch";
import { hotAt } from "./heat";
import { DISHES, ITEMS, type BaitId, type CatchId, type DishId, type ItemId } from "./items";
import { NO_PRICES, type PricesTold } from "./market";
import type { NoticeRefusal, PinboardTold } from "./notices";
import { shelfOf, sourcesAt, type Order } from "./orders";
import { ofMountain } from "./uses";
import type { ShopAsk, ShopRefusal, ShopTold, ShopsTold } from "./shop";
import { SKIES } from "./skies";
import type { FishingEnd, Play } from "./plays";
import { STAMINA, chew } from "./stamina";
import type { Helper, ThanksBoard } from "./thanks";
import { handOf, handSlot, newPurse, newStall, type Purse, type Refusal, type Stall } from "./trade";
import { sortedSlot, whatOf } from "./bag";
import { NATURES, natureAt, natureOf, type Nature, type WellWater } from "./waters";
import type { WellBook } from "./well";
import { CHARM_IDS, type GiftRefusal } from "./gifts";
import { linesOf, wornOf, type LinesTold, type Worn } from "./lines";
import { YARD, canPour, takesWater } from "./yard";
import type { KeptBed, KeptDeal, Trial } from "./trial";
// ── gifts: kitchen ──
import type { KitchenRefusal } from "./cooking";
/** (how a pot was cooked beyond the game's own account, told with it: by the hearth sprite, with no game; with the phoenix flame set to give back what comes to nothing) */
export interface Timing { sprite?: boolean; flame?: boolean }
/** What a go at the kitchen came to: `sprite`, the hearth sprite cooked it (its helping more is in `n`); `back`, it came to nothing and the phoenix flame gave every thing back. */
export type Cooked = { made: ItemId | null; n: number; first: boolean; taste?: Taste; fresh?: boolean; sprite?: boolean; back?: boolean };
import { bedOf } from "./world";
// ── mining ──
import type { CaveTold } from "./cave-state";
import type { MineRefusal, Peek, PendingVein } from "./mining";
import type { PouchRefusal } from "./pouches";
/**
 * What a go at a rock came to. Swings add up, mine and anybody's (lib/town/mining): `part` is how much of the rock
 * is struck away after this go, and `broke` is empty while it still stands. Once it broke: what it left me, the rocks
 * that broke, whether the way down was under it, the vein it opened, whether it was the crystal, the neighbour it took
 * with it, and its stamina. A rock somebody else struck first is theirs: `helped`, it broke and left me nothing
 * (`whose`: their name; `paid`: who they are, for the room to tell them that their purse changed); `waits`, it is
 * struck whole away and they cannot take what it leaves just now. (`part` and the rest are missing from a keeper
 * older than several picks on one rock: a rock then breaks at one go or not at all.) `moss`: a rock that broke let
 * glowing moss out.
 */
export interface MineDid { got: Array<[ItemId, number]>; broke: number[]; way: boolean; vein: PendingVein | null; crystal: boolean; chained: number | null; cost: number; part?: number; helped?: boolean; whose?: string | null; paid?: string | null; waits?: boolean; moss?: boolean }
/** What a vein played out came to: what it gave, how many glinting cells of how many, and whether the same face is to be played once more. */
export interface VeinDid { got: Array<[ItemId, number]>; passed: number; of: number; again: boolean }
export type MineDone<T> = ({ ok: true } & T) | { ok: false; why: Why | MineRefusal | PouchRefusal };
// ── end: mining ──
// ── gifts: farming ──
import { glassReach, gnomeReach, plotKey, rowFor, type RowDeed } from "./farm";
/** What a row's deed came to (lib/town/farm's rowTend), as a panel is told it. */
export interface RowDid { deed: RowDeed; done: string[]; got: Array<[ItemId, number]>; seeds?: number }
import { rowOf } from "./world";
// ── gifts: well ──
import type { WellGiftRefusal } from "./well-gifts";
// ── gifts: helpers ──
import { dust, pourFor } from "./farm";
import type { HelpRefusal } from "./helping";
// ── forging ──
import { mayTwice } from "./farm";
import { newBoard, soundSmithy, type Did as SmithDid, type Outcome as ForgeOutcome, type Pending, type SmithBoard, type Smelting, type Smithy } from "./forge";
import type { Element, OptionId } from "./tools";
// ── felling ──
import type { FellingAsk } from "./felling";
import type { FellOne, FellWent, KeepsakeId, TreeRefusal, TreesTold } from "./trees";
/**
 * What a go at felling came to, as a panel is told it: every tree that fell with what it gave, and all it brought
 * home; whether it was the axe's one chop, or the plain way; whether the trunk was cut through; whether the tree
 * stands after all (the ancient tree, of a go that was lost); the keepsakes found, each with whether it is the first
 * the village has; and who braced the trunk.
 */
export interface FellDid { felled: FellOne[]; got: Array<[ItemId, number]>; one: boolean; plain: boolean; through: boolean; stood: boolean; found: Array<{ id: KeepsakeId; first: boolean }>; braced: string | null }
// ── end: felling ──

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

export type Why = Refusal | FarmRefusal | ForestRefusal | BugRefusal | NoticeRefusal | PassRefusal | BoxRefusal | GroundRefusal | ShopRefusal | GiftRefusal | /* gifts: well */ WellGiftRefusal
  // ── gifts: fishing ──
  | FishRefusal
  // ── felling ──
  | TreeRefusal;
export type Did<T = unknown> = ({ ok: true } & T) | { ok: false; why: Why };
// ── gifts: kitchen ── (what a deed with a gift of the kitchen's comes to: the kitchen has reasons of its own for a no)
export type KitchenDid<T = unknown> = ({ ok: true } & T) | { ok: false; why: Why | KitchenRefusal };
/** What can be looked at, and what the room says has changed. */
export type Looked = "stall" | "farm" | "kitchen" | "deal" | "fountain" | "wild" | "bugs" | "notices" | "line" | "ground" | "shop"
  // ── mining ── (the mountain's rocks and the cave)
  | "cave"
  // ── felling ── (the mountain's trees: who felled which is everybody's)
  | "trees";
export type Water = "river" | "well" | null;
/** A game of timing as the browser played it: the database keeps it with the play, and bounds what it costs. */
export interface Timing { hits: number; misses: number; secs: number; need?: number }
/** What a strike came to. `what` and `size` are told when something is hooked (the trial knows them even when nothing is). */
export interface Struck { hooked: boolean; how?: "early" | "missed"; what?: CatchId; size?: number; landed?: boolean; kept?: boolean; record?: boolean }
/** (`back`: the bait came back, of a fish that got away in the fight) */
// ── gifts: fishing ── (`again`: the otter drove the fish back, and it is to be fought once more at once: the go has not ended;
// `more`: it was one of two on a rod of two lines, and the other is on still)
export interface Landed { how: FishingEnd; kept: boolean; record: boolean; back?: boolean; again?: boolean; more?: boolean }
/** How a line is dropped when it is not the plain one: "pair", a rod of two lines (two baits, a second fish on the second line); "star", a stardust bait (none from the bag: the bait named is not looked at). */
export type CastHow = "pair" | "star";
/** One of the two a rod of two lines hooked: what it is and how long, and (what is no fish) that it came in at once. */
export interface Hooked { what: CatchId; size: number; landed: boolean; kept?: boolean }
/** (a strike's answer, of a rod of two lines: the two, in their order; and `harder`: how many times as hard the deck's good fish are for me, where they are: lib/town/gifts' harderFor) */
export interface Struck { pair?: Hooked[]; harder?: number }
/** What a line dropped is told of: how long until the bite and when the float twitches; and, where it is told, a shade or the thing itself of what is on its way (`coming2`: of the second line's), and that two lines are out. */
export type CastTold = { wait: number; nibbles: number[]; lag: number; shade?: Shade; coming?: CatchId; pair?: boolean; coming2?: CatchId };

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
  /**
   * How many helpings a meal's hours take with whoever keeps the game: three (lib/town/stamina), or one where the
   * database still counts a meal once. The page asks, so that it never shows a helping to come that would be refused:
   * it goes out before the database's file is run.
   */
  helpings(): number;
  stall(): Stall;
  /** What I am told of the relatives' prices (lib/town/market): of each thing I hold or have left with the uncle whose price moves. Of none, where no price moves yet. */
  prices(): PricesTold;
  shelf(): ItemId[];
  order(): Order | null;
  /** What the uncle's next hint costs me (lib/town/hints), or null when he has none for me. Which hint it will be is by chance and the keeper's to say, at the buying. */
  hintPrice(): number | null;
  farm(): Record<string, Plot>;
  well(): number;
  owners(): Map<number, { by: string; name: string }>;
  deedAt(key: string): Deed | null;
  /** The stretches of rain the plots have had (lib/town/weather), and the hours the farm was counted with insects on it (lib/town/farm's Swarms): what the farm's rules are read with. */
  rains(): FarmSky;
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
  /**
   * The slot the thing in my hand is in (lib/town/trade's handSlot; -1 with nothing held): of two pots of food, which
   * is the one held. The slot it was taken up from is the page's own to remember: a purse says only what kind of
   * thing is held, so a page loaded again holds the first there is.
   */
  handSlot(): number;
  /**
   * Whether whoever keeps the game lets the bag be put in order (lib/town/bag): false from a database before v165,
   * and the page then offers neither to sort it nor to move a thing in it.
   */
  bagTidy(): boolean;
  /** A thing moved from one slot of my bag to another: into an empty one, onto more of itself, or changing places with what is there. */
  bagMove(from: number, to: number): Promise<Did>;
  /** My bag sorted: by kind, split stacks brought together, no gap. */
  bagSort(): Promise<Did>;
  wear(slot: number): Promise<Did>;
  takeOff(item: ItemId): Promise<Did>;
  serve(slot: number): Promise<Did<{ dish: DishId }>>;
  drop(slot: number): Promise<Did>;
  /**
   * Things dropped on the ground (lib/town/ground): what lies about now, as last told (null until it has been, and
   * for as long as whoever keeps the game knows of no ground: a thing can then only be thrown away, `drop`).
   * Dropping what is in a slot of my bag where I stand, for anybody to pick up; and picking a thing up from the tile
   * I stand on. Whoever is in town is told through the room when either is done (`ground`).
   */
  ground(): Dropped[] | null;
  groundDrop(slot: number, at: [number, number]): Promise<Did<{ id: number }>>;
  groundTake(id: number, at: [number, number]): Promise<Did<{ item: ItemId; n: number }>>;

  /**
   * Fishing. A line is dropped from a tile with a bait: the answer is how long until the bite and when the float
   * twitches first, in seconds (and how much of that has gone by already, getting here), never what is on its way.
   * A strike says what was hooked, if anything; `missed` that the float came up again with nobody striking; `land`
   * how the fight ended, with the hand's own account of it.
   */
  /** (`coming`: what is on its way, told only to whoever wears the whispering float, lib/town/gifts) */
  cast(bait: BaitId, place: { tile: [number, number]; deep: boolean }, rain: boolean, quick?: boolean, how?: CastHow): Promise<Did<CastTold>>;
  strike(reaction: number, how: Strike | null): Promise<Did<Struck>>;
  missed(): Promise<{ what?: CatchId; size?: number }>;
  // ── gifts: fishing ──
  /** Light my sky orb under a sky ("night", "rain" or "moon": lib/town/fishing's ORB): for its minutes the water answers me as if under it, and bites come sooner. Says until when. */
  orbLight(sky: string): Promise<Did<{ until: number }>>;
  /** (`which`: of two fish still on a rod of two lines, the one that has ended: the first, or 1 for the second) */
  land(how: "landed" | "snapped" | "slipped" | "left", fight: Record<string, unknown> | null, which?: 0 | 1): Promise<Landed>;

  /** `sure`: the page has asked a second time and been told that a living plant is meant to be dug out (lib/town/farm). */
  // (forging: `also`, the plots beside it that the tool in the hand did the same to, by their keys: lib/town/farm's beside)
  farmDo(key: string, name: string, timing?: Timing, sure?: boolean): Promise<Did<{ deed: Deed; got: Array<[ItemId, number]>; also?: string[] }>>;
  choreDo(where: Water, at: [number, number] | null): Promise<Did<{ chore: Chore }>>;
  // ── gifts: farming ──
  /**
   * A row at a time (lib/town/farm's rowFor): what a gift of the farming line would do to the whole row of the bed
   * from the plot I stand on, with the thing in my hand: which work, and the plots, the one stood on first. Null:
   * nothing to offer (and never, where whoever keeps the game knows of no rows). Doing it is one deed: `marks` says
   * how each plot's beat went, by its key; `done` is the plots it did, in the order it did them (and `seeds`, of a
   * row sown from the pouch, how many seeds it took).
   */
  rowAt(key: string): { deed: RowDeed; plots: string[] } | null;
  rowDo(key: string, name: string, marks: Record<string, boolean>, timing?: Timing): Promise<Did<RowDid>>;
  /**
   * The garden gnome (lib/town/farm's gnomeWater): the plots of the bed I stand in that it would water if I sent it
   * now, in the order it would go (none: there is nothing to send it for), and sending it.
   */
  gnomeAt(key: string): string[];
  gnomeDo(key: string): Promise<Did<{ watered: string[] }>>;
  /**
   * The hourglass of seasons (lib/town/farm's glassTurn): the plots of the bed I stand in that it would quicken if I
   * turned it now (none: there is nothing to turn it for), and turning it: which plots it quickened, and until when
   * the sand runs.
   */
  glassAt(key: string): string[];
  glassDo(key: string): Promise<Did<{ quickened: string[]; until: number }>>;
  // ── gifts: helpers ──
  /**
   * The long pour of the gardener's gloves (lib/town/farm's pourFor): the plants of the row of somebody else's bed
   * that it would water from the plot I stand on, with the can in my hand, from the row's head (none: there is no
   * row to pour along, and never where whoever keeps the game knows of no such pour). Pouring is one deed: `marks`
   * says which plants the water reached, by their keys; `done` is the plots it watered.
   */
  pourAt(key: string): string[];
  pourDo(key: string, name: string, marks: Record<string, boolean>, timing?: Timing): Promise<Did<{ done: string[] }>>;
  /**
   * The ring of shared strength (lib/town/helping's share): give somebody standing near thirty stamina of mine, for
   * half of it. `far`: how many tiles off they stand, as the map has them (who stands where is the page's to say).
   * `name`: what I am called, for the friend to be told by. Whoever was given it is told through the room.
   */
  ringTo(to: string, far: number, name: string): Promise<{ ok: true; gave: number; paid: number; left: number } | { ok: false; why: Why | HelpRefusal }>;
  /**
   * Garden fae dust (lib/town/farm's dust): whether I could sprinkle it on the plant in the plot I stand on (another
   * member's, with a pest, no dust on it yet, and one left to my day), and sprinkling it: how many the day has left,
   * and until when it holds. The plant's owner is told through the room, and reads who did it in their own purse.
   */
  dustAt(key: string): boolean;
  dustDo(key: string, name: string): Promise<{ ok: true; left: number; until: number } | { ok: false; why: Why | HelpRefusal }>;

  /** The forest (lib/town/forest): every place that has something for me now. */
  wild(): Sight[];
  /** Gather what a place has, from the tile I stand on, with how its game went (and how long it took). `lost`: a secret place's two games were not both won, and my turn at it is spent with nothing got (lib/town/forest). */
  gatherDo(spot: number, at: [number, number], went: Outcome & { secs?: number }): Promise<Did<{ got: Array<[ItemId, number]>; lost?: boolean }>>;

  // ── gifts: forest ──
  /**
   * A sprite's treasure map (lib/town/hunt): the hunt I am on, as I am told it (which map of the day, the digs so far,
   * the ring on the forest the chest lies inside), or null. Using a map begins one; digging from the tile I stand on
   * says how warm it was, or brings the chest up with what it holds.
   */
  hunt(): HuntTold | null;
  mapUse(): Promise<Did<{ left: number }>>;
  mapDig(at: [number, number]): Promise<Did<{ found: boolean; warm: number; digs: number; got: Array<[ItemId, number]> }>>;

  /** Insects (lib/town/insects): every haunt that has one for me now. */
  bugs(): BugSight[];
  /**
   * Catch what a haunt has, from the tile I stand on: how many swings missed first, and (a beetle, which comes down
   * only to something sweet) what whoever stands under its tree holds, and who they are. `first`: nobody in the
   * village had caught one before.
   */
  netDo(haunt: number, at: [number, number], went: { misses: number; lure?: ItemId | null; by?: string | null }, name: string): Promise<Did<{ got: Array<[ItemId, number]>; first: boolean; rid?: string | null }>>;
  /** The village's book of insects: who first caught each kind that has been caught. */
  bugBook(): Record<string, string>;
  // ── gifts: insects ──
  /**
   * A drop of nectar put down on the tile I stand on (lib/town/insects' nectar): what it brings is the keeper's to
   * say and is in my purse from then (`lured`); `left` is how many drops the day still has. And catching an insect
   * that is mine alone and no haunt's (the one come to my drop), as a haunt's is caught.
   */
  nectarDrop(at: [number, number]): Promise<Did<{ left: number }>>;
  netMine(which: Mine, at: [number, number], went: { misses: number }, name: string): Promise<Did<{ got: Array<[ItemId, number]>; first: boolean; rid?: string | null }>>;

  /**
   * The well's book (lib/town/well): what came of the water I carried, who carried today, my rank and whether the
   * well has something for me. Null until it has been read, and for as long as whoever keeps the game knows of no
   * book. `ranks` is everybody who has a rank, for the names over heads.
   */
  wellBook(): WellBook | null;
  ranks(): Record<string, number>;
  /**
   * My lines of work (lib/town/lines): the points I have on each and what today has been worth, and the title I
   * wear. Null until they have been read, and for as long as whoever keeps the game knows of no lines (a database
   * before its file: the page then shows nothing of them). `titles` is the title everybody wears who chose one, for
   * the names over heads. `linesRead` reads mine again (a screen that shows them asks as it opens).
   */
  lines(): LinesTold | null;
  titles(): Record<string, Worn>;
  linesRead(): void;
  /** Wear a title I have earned under my name, or none (null). */
  titleWear(worn: Worn | null): Promise<Did>;
  /**
   * The gifts of ranks (lib/town/gifts). `gifting` says whether whoever keeps the game gives them at all (a database
   * before their file does not: the page then offers none, and shows no place to wear one). What I have and wear is
   * in my purse (`giftsOf(purse())`). A gift is taken once, of a rank I have reached; the charms I name are worn and
   * no others (none: all taken off).
   */
  gifting(): boolean;
  giftTake(line: string, rank: number): Promise<Did<{ gift: string }>>;
  charmsWear(ids: readonly string[]): Promise<Did>;
  /**
   * Whether whoever keeps the game gives this gift yet (a database gives the gifts its files have brought it: the
   * page offers no other, and shows nothing of one). And the familiar that follows me: one I have, or none (null).
   */
  gives(id: string): boolean;
  familiarWear(id: string | null): Promise<Did>;
  /** Use a gift that is counted once (lib/town/gifts' `USES`): refused when it does not work for me now or has no time left in this stretch. Says how many are left. */
  giftUse(id: string): Promise<Did<{ left: number }>>;
  /** Read the book again. */
  wellLook(): Promise<void>;
  /** Take what the well has waiting for me. */
  wellTake(): Promise<Did<{ gift: ItemId; rank: number }>>;

  /**
   * Thanks (lib/town/thanks): every plot of mine with somebody in it to thank today, each by name (as last asked);
   * thanking whoever helped the plant in one; the board, as last read with the book; and who has thanked me today
   * (asked for with everybody's rank).
   */
  toThank(): Record<string, Array<Helper & { name: string }>>;
  thankLook(): Promise<void>;
  thankAt(key: string): Promise<Did<{ thanked: string[] }>>;
  thanks(): ThanksBoard | null;
  thanked(): Array<{ id: string; name: string }>;
  /** The jar at the well (lib/town/jar), as last read with the book; dropping coins or a thing into it; taking what waits for me. */
  jar(): JarTold | null;
  jarDrop(what: { coins: number } | { slot: number; n: number }): Promise<Did>;
  jarTake(): Promise<Did<{ coins: number; things: Array<[ItemId, number]> }>>;

  /** Whether it is a hot afternoon now (lib/town/heat): a watering does as much again. Never, where whoever keeps the game knows of no heat. */
  hot(): boolean;
  /**
   * A bucket poured over a bed (lib/town/ditch): the plots the bucket in my hand would water from the plot I stand
   * on (none: there is nothing to offer), and pouring it: how many bucketfuls it took, and which plots it watered.
   */
  ditchAt(key: string): string[];
  ditchDo(key: string): Promise<Did<{ used: number; watered: string[] }>>;
  /**
   * The cooking yard's water jar (lib/town/yard): the bucketfuls in it (null until it is known, and for as long as
   * whoever keeps the game knows of no jar), whether the bucket in my hand can be poured in, and pouring it from
   * where I stand.
   */
  yardJar(): number | null;
  yardCanPour(): boolean;
  yardPour(at: [number, number] | null): Promise<Did<{ poured: number }>>;
  /**
   * A bucket line (lib/town/line): whether I hold a bucket with water that can be handed on (never, where whoever
   * keeps the game knows of no line), and handing it on to somebody. Who stands near enough is the page's to say:
   * nothing that keeps the game knows where anybody is. Whoever takes it is told through the room (`line`).
   */
  canPass(): boolean;
  passTo(to: string): Promise<Did<{ n: number }>>;
  /**
   * Waters that differ (lib/town/waters): the nature the well's water has now, with until when and whose doing it
   * is (null when it has none, and where whoever keeps the game knows of no such thing); and the nature of water
   * drawn at this moment, for the page to name a bucket's water by as it is drawn (what counts is the keeper's own).
   */
  wellWater(): WellWater | null;
  drawnNow(): Nature | null;

  /**
   * The storage box in the plaza (lib/town/box): what I keep in it, as last told. Null until it has been read, and
   * for as long as whoever keeps the game knows of no box. Putting so many of what is in a slot of my bag away, and
   * taking so many of what is in a slot of the box out, from the tile I stand on.
   */
  box(): Box | null;
  /** Read it again. */
  boxLook(): Promise<void>;
  boxPut(slot: number, n: number, at: [number, number]): Promise<Did<{ item: ItemId; n: number }>>;
  boxTake(slot: number, n: number, at: [number, number]): Promise<Did<{ item: ItemId; n: number }>>;

  /**
   * A stall of one's own (lib/town/shop), under a sign held up (lib/town/sign). What I am told of stalls: mine, when
   * I have one open; the things that may be wanted; the rules' numbers. Null until it has been read, and for as long
   * as whoever keeps the game knows of no stalls. Opening one on the tile I stand on, and shutting it.
   * `shopBeater` gives the way my stall's keeper is told I am still here: a thing of its own, which goes on working
   * after this keeper is closed (the town's page gone and the stay going on: lib/town/session).
   */
  shops(): ShopsTold | null;
  shopLook(): Promise<void>;
  shopOpen(ask: ShopAsk, at: [number, number]): Promise<Did>;
  shopClose(): Promise<void>;
  shopBeater(): () => void;
  /**
   * Somebody else's stall: looking at it (null: no longer), which reads it now and again whenever the room says a
   * stall changed; what was last read of it (`told` null: they have none open); and buying from it or bringing to
   * it, from the tile I stand on. Its keeper is told through the room (`shop`).
   */
  shopVisit(who: string | null): Promise<void>;
  shopSeen(): { who: string; told: ShopTold | null } | null;
  shopBuy(who: string, item: ItemId, n: number, at: [number, number]): Promise<Did<{ coins: number }>>;
  shopSell(who: string, item: ItemId, n: number, at: [number, number]): Promise<Did<{ coins: number }>>;

  /**
   * Put some things together. The other cooks are told both ways: what each holds (as the room shows it), and who
   * they are (the database reads each one's hand itself). `fresh`: the pot took a bucketful of the yard's jar, and has
   * a helping more than `n` says.
   */
  cookDo(things: Array<[ItemId, number]>, crew: Array<ItemId | null>, cooks: string[], timing: Timing, name: string): Promise<KitchenDid<Cooked>>;
  /** Set a pot of food in my bag down where I stand: the one in `slot`, or with none said the first there is. */
  potDown(at: [number, number], slot?: number): Promise<Did<{ pot: Pot }>>;
  potLadle(id: string, at: [number, number] | null): Promise<Did<{ pot: Pot | null }>>;
  potTake(id: string, at: [number, number] | null): Promise<Did>;
  /**
   * The feast table (lib/town/cooking), where whoever keeps the game has one: null from a database that has not had
   * v159, whose pots stand where they were set and whose page offers nothing of a table.
   */
  feast(): FeastTold | null;
  /** Eat a helping of a pot on the feast table out of one of the table's own bowls: sitting down in the yard, with no bowl of mine, and nothing carried off. */
  feastEat(id: string, at: [number, number] | null, seated: boolean): Promise<Did<{ dish: DishId }>>;
  // ── gifts: kitchen ──
  /**
   * The dimension basket (lib/town/cooking): so many helpings of the dish in a slot of my bag put into it; so many of
   * a dish taken back out, into the bag; and sitting down to a helping straight out of it, as to one out of the bag.
   * What it holds is in my purse (`basketOf(purse())`).
   */
  basketPut(slot: number, n: number): Promise<KitchenDid<{ dish: DishId; n: number }>>;
  basketTake(dish: DishId, n: number): Promise<KitchenDid<{ dish: DishId; n: number }>>;
  basketEat(dish: DishId, seated: boolean): Promise<KitchenDid<{ dish: DishId }>>;
  /**
   * The whispering spoon (lib/town/cooking): asked of what is in the pot (things of my bag), it tells me the secret
   * thing of the recipe the pot is on the way to (`of`), how many ways the pot could still go, and how many times
   * more it will answer today. Me alone: nothing of it goes to the room.
   */
  spoonAsk(things: Array<[ItemId, number]>): Promise<KitchenDid<{ of: ItemId; secret: ItemId; ways: number; left: number }>>;
  /**
   * The stardust spice (lib/town/cooking): sitting down to a helping out of a slot of my bag, or out of the basket,
   * with the spice sprinkled on it: eaten up, its buff is at the last level at once. Once a day.
   */
  spiceEat(from: { slot: number } | { dish: DishId }, seated: boolean): Promise<KitchenDid<{ dish: DishId }>>;

  dealOpen(other: string, myName: string, otherName: string): Promise<Did>;
  dealLay(give: Give, coins?: number): Promise<Did>;
  dealAgree(word?: boolean): Promise<Did<{ done: boolean }>>;
  dealCancel(): Promise<void>;

  // ── gifts: well ── (lib/town/well-gifts)
  /**
   * The flask of living water: hold a drink out to somebody standing near, from the tile I stand on (null: put it
   * away), which says until when it is held; and drink what somebody holds out to me, from the tile I stand on: what
   * I had of it, and what its giver had for the giving. Whoever gave it is told through the room (`line`: their purse
   * has changed by another's hand).
   */
  drinkOffer(to: string | null, at: [number, number]): Promise<Did<{ till: number | null }>>;
  drinkTake(from: string, at: [number, number]): Promise<Did<{ got: number; back: number }>>;
  /**
   * The rain frog: the empty bucket in my hand filled by the rain, while it rains and the frog follows me. Says how
   * many bucketfuls. (When it rains is the sky's, lib/town/skies: whoever keeps the game judges by its own.)
   */
  rainFill(): Promise<Did<{ n: number }>>;
  /**
   * The moon flask: the nature of the water in the bucket I hold, when it has one, as whoever keeps the game has it
   * (null for plain water, for no water, and where it is not known yet; `moonLook` asks again, for a page that sees
   * the bucket's water change). Keeping that water in my flask; and pouring so many bucketfuls of the flask into the
   * well, from the tile I stand on: how many were poured, and how many the well had room for.
   */
  carriedKind(): Nature | null;
  moonLook(): void;
  moonKeep(): Promise<Did<{ n: number; kind: Nature }>>;
  moonPour(n: number, at: [number, number] | null): Promise<Did<{ poured: number; into: number; kind: Nature }>>;

  // ── forging ── (lib/town/forge: the blacksmith)
  /**
   * Use a counted option of the tool in my hand once (lib/town/powers), where its game is played on the page and the
   * page has to ask for the count: a net that holds an insect still, a net that sweeps. Refused where the tool has
   * no such option, the day's are spent, or whoever keeps the game knows of no such thing.
   */
  toolPower(id: OptionId): Promise<Did<{ left: number }>>;
  /**
   * What I have at the smith and the village's board there: null from a database that has not had the file, and the
   * page then offers nothing of a smith (no screen, no choice in his talk).
   */
  smith(): SmithTold | null;
  /** Ask what I have at the smith again (the database's; the trial's is in the browser already). */
  smithLook(): void;
  /** Put so many pieces of one kind in to smelt; take what is done; widen the queue. */
  smithSmelt(piece: ItemId, n: number): Promise<SmithDid<{ timber: number; fee: number }>>;
  smithTake(): Promise<SmithDid<{ got: Array<[ItemId, number]> }>>;
  smithWiden(): Promise<SmithDid>;
  /** Who of these members has a piece smelting now (those standing by the forge with me), each with how many presses of the bellows that piece may still take (`left`); and a press of the bellows for one of them. */
  smithNear(ids: string[]): Promise<Array<{ id: string; piece: Smelting; left: number }>>;
  smithBellows(whose: string): Promise<SmithDid<{ off: number }>>;
  /** A try at the tool in a slot of my bag: whoever keeps the game draws how it goes. `name` is mine, for the board. */
  smithTry(slot: number, name: string): Promise<SmithDid<{ out: ForgeOutcome; from: number; level: number; owed: number }>>;
  /** The draw the tool in a slot is owed, laid out (the same one, if it waits already); one of it chosen; and a milestone's option drawn again for a gem. */
  smithDraw(slot: number): Promise<SmithDid<{ pending: Pending }>>;
  smithChoose(slot: number, pick: string, name: string): Promise<SmithDid<{ opt: OptionId; kept: boolean }>>;
  smithRedraw(slot: number, at: number, gem: ItemId): Promise<SmithDid<{ pending: Pending }>>;
  /** Set a gem of my bag into the tool in a slot. */
  smithGem(slot: number, gem: ItemId): Promise<SmithDid<{ element: Element; over: Element | null }>>;
  /**
   * Two tools of one line trade what the smith put into them (lib/town/forge's `moveForging`): the two slots of my
   * bag, and what the page knows of the moment: the tile I stand on (null where it cannot say) and whether a game's
   * board is open on it. What it cost, and how much water a can that holds less now has lost.
   */
  smithMove(from: number, to: number, how: MoveHow): Promise<SmithDid<{ fee: number; spilt: number }>>;
  // ── mining ──
  /**
   * The mountain's rocks and the cave (lib/town/mining, lib/town/cave-state): what I am told of them, or null from
   * whoever keeps no cave (the page then offers nothing there). `caveLook` asks again with the floor and the tile I
   * am on: what glints for me and the crystal rock are told by where I stand.
   */
  cave(): CaveTold | null;
  caveLook(floor: number, at: [number, number] | null): Promise<void>;
  /** Strike a rock of a place (0: the mountain's foot) from the tile I stand on, with the swings I have made since I last said: they add up with anybody's, and the rock breaks when it is struck whole away. `how` "quake": a counted power, one swing for every rock within a step. */
  mineDo(floor: number, rock: number, at: [number, number], swings: number, name: string, how?: "quake"): Promise<MineDone<MineDid>>;
  /** What a rock holds, for a pick that sees into it. */
  minePeek(floor: number, rock: number): Promise<MineDone<{ peek: Peek }>>;
  /** The vein I opened, played out: its strikes in their order. */
  veinDo(strikes: Array<[number, number]>): Promise<MineDone<VeinDid>>;
  /** I have come to a floor: a resting floor reached is one of my lift's stops from then on. */
  caveReach(floor: number): Promise<void>;
  /** Ride the lift to the mouth (0) or to a resting floor I have reached: where I come out, in the world's tiles (null: before the mouth). */
  liftRide(to: number): Promise<MineDone<{ at: [number, number] | null }>>;
  /** Set the torch in my hand down on the tile I stand on. */
  torchDown(at: [number, number]): Promise<MineDone<{ until: number }>>;
  /** Break through the floor beside the tile I stand on (a counted power of the pick): the way down opens there, for everybody. */
  drillDo(at: [number, number], name: string): Promise<MineDone<{ at: [number, number]; left: number }>>;
  /** The village's board: the deepest floor reached today and who opened the way to it, or null. */
  caveBoard(): { floor: number; by: string; name: string; at: number } | null;
  /** A pouch's slot emptied into the bag; a slot of the bag put into a pouch that takes it (lib/town/pouches). */
  pouchOut(gift: string, slot: number): Promise<MineDone<{ n: number }>>;
  pouchIn(slot: number): Promise<MineDone<{ n: number }>>;
  // ── end: mining ──
  // ── felling ── (lib/town/trees, lib/town/felling)
  /** The mountain's trees as I am told them: every one that is not grown, and those half cut. Null where whoever keeps the game keeps no trees (then nothing is felled, and every tree is drawn grown). */
  trees(): TreesTold | null;
  /** Walk up to a tree with an axe in the hand, from the tile I stand on: the game that fells it (the trees it is for, and what the game is made from), or the state that refuses it. */
  fellBegin(tree: number, at: [number, number]): Promise<Did<{ trees: number[]; ask: FellingAsk; elder: boolean }>>;
  /** A go at felling as it was played, or the plain way, from the tile I stand on: what it brought home (the tree comes down however a go went). `name`: mine, for the book of the pines. */
  fellDo(went: FellWent, at: [number, number], name: string): Promise<Did<FellDid>>;
  /** Brace the trunk of somebody's go that is open, from the tile I stand on: the tree it is at. Paid when their go is over. */
  fellBrace(feller: string, at: [number, number]): Promise<Did<{ tree: number }>>;
  /** The stump I just made grown again at once, for everybody (an axe's own, counted by the day): how many times are left. */
  fellRoot(tree: number): Promise<Did<{ left: number }>>;
  // ── end: felling ──

  /** Write a go at a game of timing down (the trial's own log; the database writes its own as the deed is done). */
  record(play: Play): void;
  /** Stop every timer: the member has left the town. */
  close(): void;
}
// ── forging ──
/** What a keeper tells of the smith: what the member has there, and the village's board. */
export interface SmithTold { smithy: Smithy; board: SmithBoard }
/** What the page says of the moment a move is asked at: the tile the member stands on, and whether a game's board is open. */
export interface MoveHow { at: [number, number] | null; playing: boolean }

/**
 * One function of the town's, asked of the database: its answer as it came, or
 * `{ denied: true }` when the database refuses whoever asks (not signed in, no
 * proved character, the game not open to them), or null when it could not be
 * reached.
 */
export type Ask = (fn: string, args?: Record<string, unknown>) => Promise<unknown>;
type Answer = Record<string, unknown>;
/** What is read as a question's own turn in the line comes, and kept of its answer before the next one's (see `ask`). */
interface Turn { before?: () => boolean | void; after?: (a: Answer | null) => void }

/** How often what others may change is asked for while it is looked at, in milliseconds. A nudge from the room asks at once. */
const EVERY: Record<Looked, number> = { /* mining */ cave: 60_000, stall: 30_000, farm: 60_000, kitchen: 90_000, deal: 60_000, fountain: 60_000, wild: 45_000, bugs: 45_000, notices: 30_000, line: 60_000, ground: 10_000, shop: 30_000, /* felling */ trees: 60_000 };
/** A deal that is open is the one thing two people watch each other do: asked for this often while it is. */
const DEAL_OPEN = 2500;
/** A meal is counted on with the database this often, and whenever the company changes. */
const CHEW = 20_000;
/** How often a keeper told the game is shut asks whether it is open yet. */
const SHUT_MS = 5 * 60_000;
/** How often everybody's rank at the well is asked for again. */
const RANKS_MS = 5 * 60_000;
/** While something lies on the ground, how often it is looked at again (a thing lies ten seconds; the room's word of the next one may come seconds late). */
const GROUND_AGAIN = 3000;
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
  /** The slot the thing in the hand was taken up from, on this page. */
  private taken: number | null = null;
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
  private feast_: FeastTold | null = null;
  private deal_: KeptDeal | null = null;
  private fountain_: FountainTold | null = null;
  private notices_: PinboardTold | null = null;
  /** What the forest's places and the haunts have for me, each until its turn ends; and the village's book of insects. */
  private wild_: Array<Sight & { until: number }> = [];
  private bugs_: Array<BugSight & { until: number }> = [];
  // ── gifts: forest ── (the sprite's map I am following, as the database last told it)
  private hunt_: HuntTold | null = null;
  private book_: Record<string, string> = {};
  private wellBook_: WellBook | null = null;
  private ranks_: Record<string, number> = {};
  private lines_: LinesTold | null = null;
  private titles_: Record<string, Worn> = {};
  private gifting_ = false;
  // ── forging ── (nothing, until the database tells of a smith)
  private smith_: SmithTold | null = null;
  /** The gifts the database gives, as it last said; until it says (v151 said only that it gives some), the first round's six charms. */
  private gives_: readonly string[] = CHARM_IDS;
  private ranksAgain: ReturnType<typeof setInterval> | null = null;
  private toThank_: Record<string, Array<Helper & { name: string }>> = {};
  private thanks_: ThanksBoard | null = null;
  private thanked_: Array<{ id: string; name: string }> = [];
  private jar_: JarTold | null = null;
  /** The bucketfuls in the cooking yard's jar: null until a database that has one has said. */
  private yard_: number | null = null;
  /** Whether the database knows of a bucket line: said with everybody's rank. */
  private line_ = false;
  /** Whether the database knows of waters that differ, and the well's water as it last told it: both said with everybody's rank. */
  private waters_ = false;
  private water_: WellWater | null = null;
  private box_: Box | null = null;
  /** Whether the database lets a bag be put in order (it says so when asked, from v165 on). */
  private tidy_ = false;
  // ── mining ── (what the database last told of the cave: null until one that keeps a cave has said; and where I last said I was)
  private cave_: CaveTold | null = null;
  private caveAt_: { floor: number; at: [number, number] | null } = { floor: 0, at: null };
  /** What lies on the ground, as the database last told it: null until one that keeps a ground has said. */
  private ground_: Dropped[] | null = null;
  /** What the database last told of stalls (null until one that keeps stalls has said), and whose stall I am looking at, as last read. */
  private shops_: ShopsTold | null = null;
  private visit_: { who: string; told: ShopTold | null } | null = null;

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
    // (whether there is a notice board beside the stall, and what waits there for me: asked once as the game begins,
    // so that the uncle can offer it by name; a database without one answers nothing)
    if (this.read && !this.shut) void this.ask("town_notices");
    // (and whether the chest in the plaza is a storage box yet, with what I keep in it: asked once as the game begins;
    // a database without one answers nothing, and the chest is only a chest)
    if (this.read && !this.shut) void this.ask("town_box");
    // (and whether a bag can be put in order: asked once as the game begins; a database that has no such thing
    // answers nothing, and the bag offers neither to sort it nor to move a thing in it)
    if (this.read && !this.shut) void this.ask("town_bag");
    // (and whether things can be dropped on the ground, with what lies about now: asked once as the game begins; a
    // database that keeps no ground answers nothing, and a thing is only thrown away, as it was)
    if (this.read && !this.shut) void this.ask("town_ground");
    // (and whether a stall can be opened under a sign, with mine if one is still open: asked once as the game begins;
    // a database that keeps no stalls answers nothing, and a sign is only a chat room's)
    if (this.read && !this.shut) void this.ask("town_shop");
    // ── felling ── (and whether the mountain's trees are kept, with those that are not grown: asked once as the game
    // begins, and only where there is a mountain to fell them on, `next dev`; a database that keeps none answers nothing)
    if (process.env.NODE_ENV === "development" && this.read && !this.shut) void this.ask("town_trees");
    // Everybody's rank at the well, for the names over heads: asked once the game is mine, and again now and then.
    // (A database that has no such book yet answers nothing, and nobody has a rank.)
    if (this.read && !this.shut && !this.ranksAgain) {
      void this.ask("town_well_ranks");
      // (and my lines of work with everybody's worn title, in the same breath: a database with no lines answers nothing)
      void this.ask("town_work");
      this.ranksAgain = setInterval(() => { void this.ask("town_well_ranks"); void this.ask("town_work"); }, RANKS_MS);
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
  /**
   * `turn`: what is to be read as this question's own turn comes (every question asked before it has been answered by
   * then, and what it left is kept), and what is to be kept of its answer before the next one's turn. For what the
   * page remembers beside the purse and a later deed reads: the slot the hand's thing was taken up from. `before`
   * may say no (false): the question is then not asked at all, and is answered as refused, nothing there (`none`).
   */
  private ask(fn: string, args: Record<string, unknown> = {}, turn?: Turn): Promise<Answer | null> {
    const asked = this.line.then(turn ? async () => {
      if (turn.before?.() === false) return { ok: false, why: "none" } as Answer;
      const a = await this.once(fn, args);
      turn.after?.(a);
      return a;
    } : () => this.once(fn, args));
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
    // (the hours the farm had insects on it, told with the farm: those counted since it was last asked, laid over what is kept)
    if (a.swarms && typeof a.swarms === "object" && !Array.isArray(a.swarms)) {
      const told = Object.entries(a.swarms as Record<string, unknown>).filter(([h, n]) => Number.isInteger(Number(h)) && typeof n === "number" && n >= 0);
      if (told.length) this.swarms_ = { ...this.swarms_, ...Object.fromEntries(told.map(([h, n]) => [Number(h), n as number])) };
    }
    if (a.beds && typeof a.beds === "object") this.beds = a.beds as Record<string, KeptBed>;
    if (typeof a.key === "string" && "bed" in a) {
      const [x, y] = a.key.split(",").map(Number), n = String(bedOf(x, y)), beds = { ...this.beds };
      if (a.bed && typeof a.bed === "object") beds[n] = a.bed as KeptBed; else delete beds[n];
      this.beds = beds;
    }
    if (typeof a.well === "number") this.well_ = a.well;
    if (Array.isArray(a.pots)) this.pots_ = a.pots as Pot[];
    // (told with the pots by a database that has a feast table)
    if (a.feast && typeof a.feast === "object" && Array.isArray((a.feast as FeastTold).tile)) this.feast_ = a.feast as FeastTold;
    if (a.fountain && typeof a.fountain === "object") this.fountain_ = a.fountain as FountainTold;
    if (a.notices && typeof a.notices === "object" && Array.isArray((a.notices as PinboardTold).notices)) this.notices_ = a.notices as PinboardTold;
    // (a thing or an insect this page was built before is left out: it could not be drawn)
    if (Array.isArray(a.wild)) {
      this.wild_ = (a.wild as Array<[number, ItemId | null, number, number]>).filter((s) => Array.isArray(s) && (s[1] === null || s[1] in ITEMS)).map(([id, item, n, until]) => ({ id, item, n, until }));
    }
    if (Array.isArray(a.bugs)) {
      this.bugs_ = (a.bugs as Array<[number, BugId, number, number, number]>).filter((s) => Array.isArray(s) && s[1] in BUGS).map(([id, bug, turn, seed, until]) => ({ id, bug, turn, seed, until }));
    }
    // ── gifts: forest ── (the hunt I am on, told with the forest and with every use of a map and dig: none, when it says none)
    if ("hunt" in a) this.hunt_ = a.hunt && typeof a.hunt === "object" && typeof (a.hunt as HuntTold).area === "object" ? (a.hunt as HuntTold) : null;
    // (an insect comes back somewhere at that moment, v131: what is out is asked for again then)
    if (typeof a.bugsAgain === "number") this.bugsDue(a.bugsAgain);
    if (a.book && typeof a.book === "object") this.book_ = a.book as Record<string, string>;
    // ── felling ── (the trees that are not grown, told with every answer that touched one)
    if (a.trees && typeof a.trees === "object" && Array.isArray((a.trees as TreesTold).down)) this.trees_ = { down: (a.trees as TreesTold).down, half: Array.isArray((a.trees as TreesTold).half) ? (a.trees as TreesTold).half : [], ...(Array.isArray((a.trees as TreesTold).book) ? { book: (a.trees as TreesTold).book } : {}) };
    if (a.ranks && typeof a.ranks === "object") this.ranks_ = a.ranks as Record<string, number>;
    if (a.lines && typeof a.lines === "object") this.lines_ = linesOf(a.lines, a.worn);
    if (typeof a.gifting === "boolean") this.gifting_ = a.gifting;
    // ── forging ── (what I have at the smith, and the board: told by a database that has one, with my purse and with every deed there)
    if (a.smith && typeof a.smith === "object" && typeof (a.smith as { smithy?: unknown }).smithy === "object") {
      const told = a.smith as { smithy: unknown; board?: Partial<SmithBoard> | null };
      const board = told.board && typeof told.board === "object" ? told.board : this.smith_?.board ?? newBoard();
      this.smith_ = { smithy: soundSmithy(told.smithy), board: { tops: board.tops ?? {}, found: board.found ?? {} } };
    }
    if (Array.isArray(a.gives)) this.gives_ = (a.gives as unknown[]).filter((x): x is string => typeof x === "string");
    if (a.titles && typeof a.titles === "object") {
      this.titles_ = Object.fromEntries(Object.entries(a.titles as Record<string, unknown>).flatMap(([id, w]) => { const worn = wornOf(w); return worn ? [[id, worn]] : []; }));
    }
    if (a.toThank && typeof a.toThank === "object") this.toThank_ = a.toThank as Record<string, Array<Helper & { name: string }>>;
    if (a.thanks && typeof a.thanks === "object") { this.thanks_ = a.thanks as ThanksBoard; this.thanked_ = this.thanks_.today; }
    if (Array.isArray(a.thanked)) this.thanked_ = a.thanked as Array<{ id: string; name: string }>;
    if (a.jar && typeof a.jar === "object") this.jar_ = a.jar as JarTold;
    if (a.yard && typeof a.yard === "object" && typeof (a.yard as { jar?: unknown }).jar === "number") this.yard_ = (a.yard as { jar: number }).jar;
    if (a.line === true) this.line_ = true;
    if ("wellWater" in a) { this.waters_ = true; this.water_ = a.wellWater && typeof a.wellWater === "object" ? (a.wellWater as WellWater) : null; }
    if (a.box && typeof a.box === "object" && Array.isArray((a.box as Box).things)) this.box_ = a.box as Box;
    if (a.tidy === true && !this.tidy_) this.tidy_ = true;
    // ── mining ──
    if (a.cave && typeof a.cave === "object" && typeof (a.cave as CaveTold).day === "number" && !!(a.cave as CaveTold).gone) this.cave_ = a.cave as CaveTold;
    // (what lies on the ground; a thing this page was built before is left out: it could not be drawn)
    if (Array.isArray(a.ground)) { this.ground_ = (a.ground as Dropped[]).filter((d) => !!d && !!d.stack && d.stack.item in ITEMS && Array.isArray(d.at)); this.groundDue(); }
    // (stalls: what I am told of them, and the one I am looking at; a line of a thing this page was built before is left out)
    if (a.shops && typeof a.shops === "object" && Array.isArray((a.shops as ShopsTold).seen)) {
      const s = a.shops as ShopsTold;
      this.shops_ = { ...s, seen: s.seen.filter((id) => id in ITEMS), mine: s.mine ? { ...s.mine, lines: s.mine.lines.filter((l) => l.item in ITEMS) } : null };
    }
    if (typeof a.shopWho === "string" && this.visit_?.who === a.shopWho) {
      const t = a.shopTold && typeof a.shopTold === "object" && Array.isArray((a.shopTold as ShopTold).lines) ? (a.shopTold as ShopTold) : null;
      this.visit_ = { who: a.shopWho, told: t ? { ...t, lines: t.lines.filter((l) => l.item in ITEMS) } : null };
    }
    // ── gifts: well ── (the nature of the water in each of my buckets, told with the moon flask's answers)
    if (a.carried && typeof a.carried === "object" && !Array.isArray(a.carried)) this.kinds_ = a.carried as Record<string, Nature>;
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

  /** When an insect that was caught comes back somewhere, as the database told it: asked for then, while insects are looked at. */
  private bugsTimer: ReturnType<typeof setTimeout> | null = null;
  private bugsDue(at: number) {
    if (this.shut) return;
    if (this.bugsTimer) clearTimeout(this.bugsTimer);
    this.bugsTimer = setTimeout(() => { this.bugsTimer = null; this.nudged("bugs"); }, Math.min(10 * 60_000, Math.max(0, at - this.now())) + 400);
  }

  /**
   * While something lies on the ground it is asked for again every few seconds, and whoever watches is told when a
   * thing's time runs out. With nothing lying, nothing is asked: the room's word (`nudged`) begins it.
   */
  private groundTimer: ReturnType<typeof setTimeout> | null = null;
  private groundDue() {
    if (this.groundTimer) { clearTimeout(this.groundTimer); this.groundTimer = null; }
    const left = this.ground() ?? [];
    if (this.shut || !left.length) return;
    const first = Math.min(...left.map((d) => d.until)) - this.now();
    this.groundTimer = setTimeout(() => {
      this.groundTimer = null;
      this.tell();
      if (!this.ground()?.length) return;
      // (could not be reached: what is known goes on being counted down)
      void this.ask("town_ground").then((a) => { if (!a) this.groundDue(); });
    }, Math.max(50, Math.min(GROUND_AGAIN, first + 50)));
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
  nudged(what: Looked) {
    // (somebody handed me water: it is in my purse, which is read again)
    if (what === "line") { void this.ask("town_me"); return; }
    // (somebody dropped a thing, or picked one up: asked for, wherever I am in town; not of a database with no ground)
    if (what === "ground") { if (this.ground_) void this.ask("town_ground"); return; }
    // (somebody bought at a stall or brought to one: mine is read again with my purse, and so is the one I am looking at)
    if (what === "shop") {
      if (this.shops_?.mine) void this.ask("town_shop");
      if (this.visit_) void this.ask("town_shop_look", { p_who: this.visit_.who });
      return;
    }
    // (something was done on the farm: a bucket poured into the well may have changed what its water is)
    if (what === "farm" && this.waters_) void this.ask("town_well_ranks");
    if ((this.looking.get(what)?.n ?? 0) > 0 || what === "deal") this.fetch(what);
  }
  /** Ask for one of them now, and again in its time while it is looked at. */
  private fetch(what: Looked) {
    const l = this.looking.get(what);
    if (l?.timer) { clearTimeout(l.timer); l.timer = null; }
    const asked = what === "cave" ? this.ask("town_cave", { p_floor: this.caveAt_.floor, p_x: this.caveAt_.at?.[0] ?? null, p_y: this.caveAt_.at?.[1] ?? null })
      : what === "stall" ? this.ask("town_stall")
      : what === "kitchen" ? this.ask("town_kitchen").then((a) => { if (this.yard_ !== null) void this.ask("town_yard"); return a; })
      : what === "deal" ? this.ask("town_deal")
      : what === "fountain" ? this.ask("town_fountain")
      : what === "notices" ? this.ask("town_notices")
      : what === "wild" ? this.ask("town_wild")
      : what === "bugs" ? this.ask("town_bugs")
      : what === "line" ? this.ask("town_me")
      : what === "ground" ? this.ask("town_ground")
      : what === "shop" ? this.ask("town_shop")
      // ── felling ── (not asked of a database that keeps no trees)
      : what === "trees" ? (this.trees_ ? this.ask("town_trees") : Promise.resolve(null))
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
  // (a database that counts helpings says how many each meal has had, in every purse it tells: v146)
  helpings(): number { return this.mine.meals?.bowls ? STAMINA.bowls : 1; }
  stall(): Stall { return this.stall_; }
  prices(): PricesTold { return this.prices_; }
  shelf(): ItemId[] { return this.shelf_; }
  order(): Order | null { return this.order_; }
  hintPrice(): number | null {
    const at = sourcesAt(this.unlocked, true);
    // ── forging ── (a recipe of the mountain's things is hinted at only by a database whose shelf sells the tools for them: one from before has no such hint to sell)
    const mountain = this.shelf_.includes("axe") && this.shelf_.includes("pick");
    return hintPrice(this.mine, this.found_, (id) => at.has(id) && (mountain || !ofMountain(id)));
  }
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
    // (forging: a can that waters twice in an hour is offered a plant that is wet from one watering; whether it takes is the database's)
    return deedFor(key, this.plots[key] ?? WILD, handOf(this.mine), this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, this.rains(), mayTwice(this.mine, this.now()));
  }
  /**
   * The hours the farm was counted with insects on it, as the database tells them with the farm (v147; none from a
   * database that has not had the file: pests are then as they always were). The database counts; the page only
   * works the pests out by what it was told, as it does by the rain.
   */
  private swarms_: Swarms = {};
  rains(): FarmSky { return { rains: SKIES.rains(), swarms: this.swarms_ }; }
  choreAt(where: Water): Chore | null { return choreFor(this.mine, where, this.well_); }
  wellBook(): WellBook | null { return this.wellBook_; }
  ranks(): Record<string, number> { return this.ranks_; }
  lines(): LinesTold | null { return this.lines_; }
  titles(): Record<string, Worn> { return this.titles_; }
  // ── felling ──
  /** The trees as the database last told them: null until one that keeps trees has said. */
  private trees_: TreesTold | null = null;
  trees(): TreesTold | null { return this.trees_; }
  async fellBegin(tree: number, at: [number, number]): Promise<Did<{ trees: number[]; ask: FellingAsk; elder: boolean }>> {
    if (!this.trees_) return { ok: false, why: "none" };
    const a = await this.ask("town_fell_begin", { p_tree: tree, p_x: at[0], p_y: at[1] });
    if (!a) return AWAY;
    return a.ok === true ? { ok: true, trees: a.group as number[], ask: a.ask as FellingAsk, elder: !!a.elder } : { ok: false, why: (a.why as Why) ?? "none" };
  }
  async fellDo(went: FellWent, at: [number, number], _name: string): Promise<Did<FellDid>> {
    if (!this.trees_) return { ok: false, why: "none" };
    const a = await this.ask("town_fell", { p_went: went, p_x: at[0], p_y: at[1] });
    if (!a) return AWAY;
    if (a.ok !== true) return { ok: false, why: (a.why as Why) ?? "none" };
    const felled = (Array.isArray(a.felled) ? a.felled : []) as FellOne[];
    if (felled.length) this.onDeed?.("trees");
    this.tell();
    return {
      ok: true, felled, got: (Array.isArray(a.got) ? a.got : []) as Array<[ItemId, number]>, one: !!a.one, plain: !!a.plain, through: !!a.through, stood: !!a.stood,
      found: (Array.isArray(a.found) ? a.found : []) as FellDid["found"], braced: typeof a.braced === "string" ? a.braced : null,
    };
  }
  async fellBrace(feller: string, at: [number, number]): Promise<Did<{ tree: number }>> {
    if (!this.trees_) return { ok: false, why: "none" };
    const a = await this.ask("town_fell_brace", { p_feller: feller, p_x: at[0], p_y: at[1] });
    if (!a) return AWAY;
    return a.ok === true ? { ok: true, tree: Number(a.tree) || 0 } : { ok: false, why: (a.why as Why) ?? "none" };
  }
  async fellRoot(tree: number): Promise<Did<{ left: number }>> {
    if (!this.trees_) return { ok: false, why: "none" };
    const a = await this.ask("town_fell_root", { p_tree: tree });
    if (!a) return AWAY;
    if (a.ok !== true) return { ok: false, why: (a.why as Why) ?? "none" };
    this.onDeed?.("trees");
    this.tell();
    return { ok: true, left: Number(a.left) || 0 };
  }
  // ── end: felling ──
  linesRead() { if (this.lines_) void this.ask("town_work"); }
  titleWear(worn: Worn | null) { return this.deed("town_title_wear", { p_line: worn?.line ?? null, p_rank: worn?.rank ?? null }); }
  gifting() { return this.gifting_; }
  giftTake(line: string, rank: number) { return this.deed<{ gift: string }>("town_gift_take", { p_line: line, p_rank: rank }); }
  charmsWear(ids: readonly string[]) { return this.deed("town_charms_wear", { p_charms: [...ids] }); }
  gives(id: string) { return this.gifting_ && this.gives_.includes(id); }
  familiarWear(id: string | null) { return this.deed("town_familiar_wear", { p_id: id }); }
  giftUse(id: string) { return this.deed<{ left: number }>("town_gift_use", { p_id: id }); }
  // (as they stand at this moment: between two tellings a pot's hour on the ground may end, or the table be cleared of it)
  pots(): Pot[] { return this.feast_ ? tidied(this.pots_, this.now(), this.feast_.tile, this.feast_.ground).pots : this.pots_; }
  feast(): FeastTold | null { return this.feast_; }
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
  private async deed<T>(fn: string, args: Record<string, unknown> = {}, turn?: Turn): Promise<Did<T>> {
    const a = await this.ask(fn, args, turn);
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
  hold(slot: number | null) {
    // (the slot is kept as the deed's own turn ends, so that a move or a sort asked for straight after it reads it;
    // and told again: the purse was told of before the slot was kept)
    return this.deed("town_hold", { p_slot: slot }, { after: (a) => { if (a?.ok) { this.taken = slot; this.tell(); } } });
  }
  // (forging: with no slot of this page's, the one the purse itself remembers: of two tools of a kind, the one taken up)
  handSlot() { return handSlot(this.mine, this.taken ?? (Number.isInteger(this.mine.handAt) ? (this.mine.handAt as number) : null)); }
  bagTidy() { return this.tidy_; }
  // The bag put in order. Of two pots of food, the one that was held is held still: the slot the hand's thing is in
  // goes where that thing goes. Which slot that is, is read as the deed's own turn comes and by the bag as it then is
  // (`handSlot`): a page loaded again remembers no slot and holds the first pot there is, and a pot taken up a
  // moment before has been by then. Both found by Codex's check. Told again, as a thing held is.
  //
  // And a move is of the thing that was meant: what the slot had as the move was asked for (what the page showed,
  // `whatOf`) has to be in it still when the move's turn comes. A bag sorted a moment before, its answer not yet
  // here, has something else there by then: the move is not asked, and is refused (Codex's second look).
  bagMove(from: number, to: number) {
    const meant = whatOf(this.mine.bag[from]);
    let at = -1;
    return this.deed("town_bag_move", { p_from: from, p_to: to }, {
      before: () => { if (whatOf(this.mine.bag[from]) !== meant) return false; at = this.handSlot(); },
      after: (a) => { if (a?.ok && at >= 0) { this.taken = at === from ? to : at === to ? from : at; this.tell(); } },
    });
  }
  bagSort() {
    // (a stack brought together with its fellows is nowhere of its own: the first that has the thing is the hand's)
    let held = false, to: number | null = null;
    return this.deed("town_bag_sort", {}, {
      before: () => { const at = this.handSlot(); held = at >= 0; to = held ? sortedSlot(this.mine, at) : null; },
      after: (a) => { if (a?.ok && held) { this.taken = to; this.tell(); } },
    });
  }
  wear(slot: number) { return this.deed("town_wear", { p_slot: slot }); }
  takeOff(item: ItemId) { return this.deed("town_take_off", { p_item: item }); }
  serve(slot: number) { return this.deed<{ dish: DishId }>("town_serve", { p_slot: slot }); }
  drop(slot: number) { return this.deed("town_drop", { p_slot: slot }); }
  ground(): Dropped[] | null { if (!this.ground_) return null; const now = this.now(); return this.ground_.filter((d) => d.until > now); }
  async groundDrop(slot: number, at: [number, number]): Promise<Did<{ id: number }>> {
    const did = await this.deed<{ id: number }>("town_ground_drop", { p_slot: slot, p_x: at[0], p_y: at[1] });
    // (it lies there for anybody: the room is told, and everybody in town looks)
    if (did.ok) this.onDeed?.("ground");
    return did;
  }
  async groundTake(id: number, at: [number, number]): Promise<Did<{ item: ItemId; n: number }>> {
    const did = await this.deed<{ item: ItemId; n: number }>("town_ground_take", { p_id: id, p_x: at[0], p_y: at[1] });
    // (picked up, or not there any more: either way it lies there no longer)
    if ((did.ok || did.why === "lost") && this.ground_) { this.ground_ = this.ground_.filter((d) => d.id !== id); this.tell(); }
    if (did.ok) this.onDeed?.("ground");
    return did;
  }

  async cast(bait: BaitId, place: { tile: [number, number]; deep: boolean }, rain: boolean, _quick?: boolean, how?: CastHow): Promise<Did<CastTold>> {
    // (how the line is dropped is said only when it is not the plain way: a database that has not had v153 knows no such argument)
    const sent = Date.now(), a = await this.ask("town_cast", { p_bait: bait, p_x: place.tile[0], p_y: place.tile[1], p_rain: rain, ...(how ? { p_how: how } : {}) });
    if (!a) return AWAY;
    if (!a.ok) return { ok: false, why: (a.why as Why) ?? "none" };
    // (under clear water the database tells the shade of what is on its way, and nothing more of it)
    const line = a.line as { wait: number; nibbles: number[]; shade?: Shade; coming?: CatchId; pair?: boolean; coming2?: CatchId };
    return { ok: true, wait: line.wait, nibbles: line.nibbles, lag: Math.max(0, (Date.now() - sent) / 2000), ...(line.shade ? { shade: line.shade } : {}), ...(typeof line.coming === "string" ? { coming: line.coming } : {}),
      // ── gifts: fishing ──
      ...(line.pair ? { pair: true } : {}), ...(typeof line.coming2 === "string" ? { coming2: line.coming2 } : {}) };
  }
  // ── gifts: fishing ──
  orbLight(sky: string) { return this.deed<{ until: number }>("town_orb", { p_sky: sky }); }
  async strike(reaction: number): Promise<Did<Struck>> {
    const a = await this.ask("town_strike", { p_reaction: Math.round(reaction * 1000) });
    if (!a) return AWAY;
    if (!a.ok) return { ok: false, why: (a.why as Why) ?? "none" };
    return { ok: true, hooked: !!a.hooked, how: a.how as Struck["how"], what: a.what as CatchId | undefined, size: a.size as number | undefined,
      landed: !!a.landed, kept: a.kept as boolean | undefined, record: false,
      // ── gifts: fishing ──
      ...(Array.isArray(a.pair) ? { pair: a.pair as Hooked[] } : {}), ...(typeof a.harder === "number" && a.harder > 1 ? { harder: a.harder } : {}) };
  }
  async missed(): Promise<{ what?: CatchId; size?: number }> {
    // Told when the database, too, counts the bite as gone: it gives a late strike a moment's grace, and one sent
    // inside that would hook. The wait is in the line like everything else, so a line dropped again meanwhile is
    // dropped after this one has been given up, not before.
    this.line = this.line.then(() => new Promise((done) => setTimeout(done, LATE_MS)));
    const a = await this.ask("town_strike", { p_reaction: null });
    // (still hooked, by clocks that disagree: let it go)
    if (a?.ok && a.hooked && !a.landed) {
      const let1 = await this.ask("town_land", { p_how: "slipped", p_fight: null });
      // ── gifts: fishing ── (two fish on a rod of two lines: the other is let go too)
      if (let1?.more) await this.ask("town_land", { p_how: "slipped", p_fight: null });
    }
    return {};
  }
  async land(how: "landed" | "snapped" | "slipped" | "left", fight: Record<string, unknown> | null, which?: 0 | 1): Promise<Landed> {
    const a = await this.ask("town_land", { p_how: how, p_fight: which === undefined ? fight : { ...(fight ?? {}), which } });
    if (!a?.ok) return { how: how === "landed" ? "slipped" : how, kept: false, record: false };
    return { how: a.how as FishingEnd, kept: !!a.kept, record: !!a.record, ...(a.back ? { back: true } : {}),
      // ── gifts: fishing ──
      ...(a.again ? { again: true } : {}), ...(a.more ? { more: true } : {}) };
  }

  async farmDo(key: string, _name: string, timing?: Timing, sure = false): Promise<Did<{ deed: Deed; got: Array<[ItemId, number]> }>> {
    const [x, y] = key.split(",").map(Number);
    // (the word is sent only when it is given: a database that has not had v119 knows no such argument, and every
    // other deed is to go on being done there)
    const did = await this.deed<{ deed: Deed; got: Array<[ItemId, number]> }>("town_tend", { p_x: x, p_y: y, p_timing: timing ?? null, ...(sure ? { p_sure: true } : {}) });
    if (did.ok) this.onDeed?.("farm");
    // ── gifts: helpers ── (a duet bell rang: whoever it rang with has stamina back and is told of it, in their own purse, which they read again)
    if (did.ok) this.rangWith(did);
    // (a watering on a hot afternoon, or while the well's water has a nature, is kept with more than this answer says: the plot is read again)
    if (did.ok && did.deed === "water" && (this.hot() || this.wellWater())) this.fetch("farm");
    return did;
  }
  // ── gifts: farming ──
  /** Whether the database knows of the farming line's later gifts (v153): it says so by giving them, the seed pouch among them. A page out before the file offers none of what they do. */
  private farmGifts(): boolean { return this.gives("thingPouch"); }
  rowAt(key: string): { deed: RowDeed; plots: string[] } | null {
    if (!this.farmGifts()) return null;
    const [x, y] = key.split(",").map(Number);
    return rowFor(key, rowOf(x, y).map(([u, v]) => plotKey(u, v)), this.plots, this.mine, this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, this.rains());
  }
  async rowDo(key: string, _name: string, marks: Record<string, boolean>, timing?: Timing): Promise<Did<RowDid>> {
    const [x, y] = key.split(",").map(Number);
    // (the answer brings every plot it changed, and the bed's keeping: kept as any answer's are)
    const did = await this.deed<RowDid>("town_row", { p_x: x, p_y: y, p_marks: marks, p_timing: timing ?? null });
    if (did.ok) this.onDeed?.("farm");
    return did;
  }
  /** Every plot of a bed that is kept, by its key. */
  private bedPlots(bed: number): Record<string, Plot> {
    return Object.fromEntries(Object.entries(this.plots).filter(([k]) => { const [u, v] = k.split(",").map(Number); return bedOf(u, v) === bed; }));
  }
  gnomeAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
    if (bed < 0 || !this.farmGifts()) return [];
    return gnomeReach(bed, this.bedPlots(bed), this.mine, this.id, this.now(), this.owners().get(bed)?.by ?? null, this.rains());
  }
  glassAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
    if (bed < 0 || !this.farmGifts()) return [];
    return glassReach(this.bedPlots(bed), this.mine, this.id, this.now(), this.owners().get(bed)?.by ?? null, this.rains());
  }
  async glassDo(key: string): Promise<Did<{ quickened: string[]; until: number }>> {
    const [x, y] = key.split(",").map(Number);
    const did = await this.deed<{ quickened: string[]; until: number }>("town_hourglass", { p_x: x, p_y: y });
    if (did.ok) this.onDeed?.("farm");
    return did;
  }
  async gnomeDo(key: string): Promise<Did<{ watered: string[] }>> {
    const [x, y] = key.split(",").map(Number);
    // (the answer brings the plots it watered as they are kept: with what the heat added, if it is hot)
    const did = await this.deed<{ watered: string[] }>("town_gnome", { p_x: x, p_y: y });
    if (did.ok) this.onDeed?.("farm");
    return did;
  }
  // ── gifts: helpers ──
  /** Whether the database knows of the helpers' line's later gifts (v153): it says so by giving them, the anklet among them. A page out before the file offers none of what they do. */
  private helpGifts(): boolean { return this.gives("charmAnklet"); }
  /** After a watering of mine: whoever the duet bell rang with (the answer's `bell.with`) is told through the room that their purse changed. */
  private rangWith(did: unknown) {
    const pals = (did as { bell?: { with?: unknown } }).bell?.with;
    if (Array.isArray(pals)) for (const pal of pals) if (typeof pal === "string") this.onDeed?.("line", pal);
  }
  pourAt(key: string): string[] {
    if (!this.helpGifts()) return [];
    const [x, y] = key.split(",").map(Number);
    return pourFor(key, rowOf(x, y).map(([u, v]) => plotKey(u, v)), this.plots, this.mine, this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, this.rains());
  }
  async pourDo(key: string, _name: string, marks: Record<string, boolean>, timing?: Timing): Promise<Did<{ done: string[] }>> {
    const [x, y] = key.split(",").map(Number);
    // (the answer brings every plot it watered as it is kept, with what the heat and the well's water added)
    const did = await this.deed<{ done: string[] }>("town_longpour", { p_x: x, p_y: y, p_marks: marks, p_timing: timing ?? null });
    if (did.ok) { this.onDeed?.("farm"); this.rangWith(did); }
    return did;
  }
  dustAt(key: string): boolean {
    return this.helpGifts() && dust(key, this.mine, this.plots[key] ?? WILD, this.id, this.now(), this.rains()).ok;
  }
  async dustDo(key: string, _name: string): Promise<{ ok: true; left: number; until: number } | { ok: false; why: Why | HelpRefusal }> {
    const [x, y] = key.split(",").map(Number), whose = this.plots[key]?.plant?.by;
    const did = await this.deed<{ left: number; until: number }>("town_dust", { p_x: x, p_y: y }) as { ok: true; left: number; until: number } | { ok: false; why: Why | HelpRefusal };
    if (did.ok) { this.onDeed?.("farm"); if (whose) this.onDeed?.("line", whose); }
    return did;
  }
  async ringTo(to: string, far: number, _name: string): Promise<{ ok: true; gave: number; paid: number; left: number } | { ok: false; why: Why | HelpRefusal }> {
    if (!this.helpGifts()) return { ok: false, why: "none" };
    // (what I am called is the database's own to say: it knows me)
    const did = await this.deed<{ gave: number; paid: number; left: number }>("town_ring", { p_to: to, p_far: far }) as { ok: true; gave: number; paid: number; left: number } | { ok: false; why: Why | HelpRefusal };
    if (did.ok) this.onDeed?.("line", to);
    return did;
  }
  /**
   * The forest and the insects (v125): what each place and each haunt has is asked for while it is looked at, and
   * kept until its turn ends. A database that has not had v125 answers nothing, and there is nothing to gather.
   */
  wild(): Sight[] { const now = this.now(); return this.wild_.filter((s) => s.until > now); }
  async gatherDo(spot: number, at: [number, number], went: Outcome & { secs?: number }): Promise<Did<{ got: Array<[ItemId, number]>; lost?: boolean }>> {
    const did = await this.deed<{ got: Array<[ItemId, number]>; lost?: boolean }>("town_gather", { p_spot: spot, p_x: at[0], p_y: at[1], p_went: went });
    // (gathered, or there is nothing there for me after all: either way the place has no more for me)
    if (did.ok || did.why === "had" || did.why === "bare" || did.why === "none") { this.wild_ = this.wild_.filter((s) => s.id !== spot); this.tell(); }
    return did;
  }
  // ── gifts: forest ──
  hunt(): HuntTold | null { return this.hunt_; }
  mapUse() { return this.deed<{ left: number }>("town_map_use", {}); }
  mapDig(at: [number, number]) { return this.deed<{ found: boolean; warm: number; digs: number; got: Array<[ItemId, number]> }>("town_map_dig", { p_x: at[0], p_y: at[1] }); }
  bugs(): BugSight[] { const now = this.now(); return this.bugs_.filter((s) => s.until > now); }
  async netDo(haunt: number, at: [number, number], went: { misses: number; lure?: ItemId | null; by?: string | null }, name: string): Promise<Did<{ got: Array<[ItemId, number]>; first: boolean; rid?: string | null }>> {
    // (who stands under the tree is told by who they are: what they hold is their own purse's to say)
    const by = went.by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(went.by) ? went.by : null;
    const did = await this.deed<{ got: Array<[ItemId, number]>; first: boolean; rid?: string | null; ridPlot?: Plot }>("town_net", { p_haunt: haunt, p_x: at[0], p_y: at[1], p_misses: went.misses, p_by: by });
    // (a ladybird took a pest off some plant with it: that plot is as the database now has it, and the farm is told)
    if (did.ok && did.rid && did.ridPlot) { this.plot(did.rid, did.ridPlot); this.onDeed?.("farm"); }
    // (caught, it is gone from everybody's map: the room is told, and whoever looks at the insects asks again)
    if (did.ok) this.onDeed?.("bugs");
    if (did.ok || did.why === "had" || did.why === "bare" || did.why === "none") {
      if (did.ok && did.first && did.got[0]) this.book_ = { ...this.book_, [did.got[0][0]]: name };
      this.bugs_ = this.bugs_.filter((s) => s.id !== haunt);
      this.tell();
    }
    return did;
  }
  bugBook(): Record<string, string> { return this.book_; }
  // ── gifts: insects ──
  nectarDrop(at: [number, number]) { return this.deed<{ left: number }>("town_nectar", { p_x: at[0], p_y: at[1] }); }
  async netMine(which: Mine, at: [number, number], went: { misses: number }, name: string): Promise<Did<{ got: Array<[ItemId, number]>; first: boolean; rid?: string | null }>> {
    const did = await this.deed<{ got: Array<[ItemId, number]>; first: boolean; rid?: string | null; ridPlot?: Plot }>("town_net_mine", { p_which: which, p_x: at[0], p_y: at[1], p_misses: went.misses });
    // (a ladybird took a pest off some plant with it, as one of a haunt's does)
    if (did.ok && did.rid && did.ridPlot) { this.plot(did.rid, did.ridPlot); this.onDeed?.("farm"); }
    if (did.ok && did.first && did.got[0]) { this.book_ = { ...this.book_, [did.got[0][0]]: name }; this.tell(); }
    return did;
  }

  async choreDo(_where: Water, at: [number, number] | null): Promise<Did<{ chore: Chore }>> {
    if (!at) return { ok: false, why: "none" };
    const did = await this.deed<{ chore: Chore }>("town_chore", { p_x: at[0], p_y: at[1] });
    if (did.ok && did.chore !== "draw") this.onDeed?.("farm");
    // (the book changes with a bucketful poured: read again by whoever has had it open; and what the well's water is may have changed)
    if (did.ok && did.chore === "pour" && this.wellBook_) void this.ask("town_well");
    if (did.ok && did.chore === "pour" && this.waters_) void this.ask("town_well_ranks");
    return did;
  }
  async wellLook() { await this.ask("town_well"); }
  wellTake() { return this.deed<{ gift: ItemId; rank: number }>("town_well_take"); }
  toThank() { return this.toThank_; }
  async thankLook() { await this.ask("town_to_thank"); }
  thankAt(key: string) { const [x, y] = key.split(",").map(Number); return this.deed<{ thanked: string[] }>("town_thank", { p_x: x, p_y: y }); }
  thanks(): ThanksBoard | null { return this.thanks_; }
  thanked() { return this.thanked_; }
  jar(): JarTold | null { return this.jar_; }
  jarDrop(what: { coins: number } | { slot: number; n: number }) { return this.deed("town_jar_drop", "coins" in what ? { p_coins: what.coins } : { p_slot: what.slot, p_n: what.n }); }
  jarTake() { return this.deed<{ coins: number; things: Array<[ItemId, number]> }>("town_jar_take"); }
  shops(): ShopsTold | null { return this.shops_; }
  async shopLook() { if (this.shops_) await this.ask("town_shop"); }
  shopOpen(ask: ShopAsk, at: [number, number]) { return this.deed("town_shop_open", { p_lines: ask, p_x: at[0], p_y: at[1] }); }
  async shopClose() { if (this.shops_) await this.ask("town_shop_close"); }
  // (asked past the line of this keeper's own asking, and after it is closed: only that the database hears it matters)
  shopBeater(): () => void { const rpc = this.rpc; return () => { void rpc("town_shop_beat").catch(() => null); }; }
  async shopVisit(who: string | null) {
    this.visit_ = who ? { who, told: this.visit_?.who === who ? this.visit_.told : null } : null;
    if (who && this.shops_) await this.ask("town_shop_look", { p_who: who });
    else this.tell();
  }
  shopSeen() { return this.visit_; }
  async shopBuy(who: string, item: ItemId, n: number, at: [number, number]): Promise<Did<{ coins: number }>> {
    const did = await this.deed<{ coins: number }>("town_shop_buy", { p_who: who, p_item: item, p_n: n, p_x: at[0], p_y: at[1] });
    if (did.ok) this.onDeed?.("shop", who);
    return did;
  }
  async shopSell(who: string, item: ItemId, n: number, at: [number, number]): Promise<Did<{ coins: number }>> {
    const did = await this.deed<{ coins: number }>("town_shop_sell", { p_who: who, p_item: item, p_n: n, p_x: at[0], p_y: at[1] });
    if (did.ok) this.onDeed?.("shop", who);
    return did;
  }

  // ── mining ── (a database that keeps no cave answers nothing, and the page then offers nothing there)
  cave(): CaveTold | null { return this.cave_; }
  async caveLook(floor: number, at: [number, number] | null) { this.caveAt_ = { floor, at }; await this.ask("town_cave", { p_floor: floor, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null }); }
  async mineDo(floor: number, rock: number, at: [number, number], swings: number, _name: string, how?: "quake") {
    const did = await this.deed<MineDid>("town_mine", { p_floor: floor, p_rock: rock, p_x: at[0], p_y: at[1], p_swings: swings, ...(how ? { p_how: how } : {}) }) as MineDone<MineDid>;
    if (did.ok || did.why === "gone") this.onDeed?.("cave");
    // (my swings broke a rock somebody else struck first: it is they who are paid, and told through the room that their purse changed)
    if (did.ok && typeof did.paid === "string") this.onDeed?.("line", did.paid);
    return did;
  }
  minePeek(floor: number, rock: number) { return this.deed<{ peek: Peek }>("town_mine_peek", { p_floor: floor, p_rock: rock }) as Promise<MineDone<{ peek: Peek }>>; }
  veinDo(strikes: Array<[number, number]>) { return this.deed<VeinDid>("town_vein", { p_strikes: strikes }) as Promise<MineDone<VeinDid>>; }
  async caveReach(floor: number) { if (this.cave_) await this.ask("town_cave_reach", { p_floor: floor }); }
  liftRide(to: number) { return this.deed<{ at: [number, number] | null }>("town_lift", { p_to: to }) as Promise<MineDone<{ at: [number, number] | null }>>; }
  async torchDown(at: [number, number]) {
    const did = await this.deed<{ until: number }>("town_torch", { p_x: at[0], p_y: at[1] }) as MineDone<{ until: number }>;
    if (did.ok) this.onDeed?.("cave");
    return did;
  }
  async drillDo(at: [number, number], _name: string) {
    const did = await this.deed<{ at: [number, number]; left: number }>("town_drill", { p_x: at[0], p_y: at[1] }) as MineDone<{ at: [number, number]; left: number }>;
    if (did.ok) this.onDeed?.("cave");
    return did;
  }
  caveBoard() { return this.cave_?.deepest ?? null; }
  pouchOut(gift: string, slot: number) { return this.deed<{ n: number }>("town_pouch_out", { p_gift: gift, p_slot: slot }) as Promise<MineDone<{ n: number }>>; }
  pouchIn(slot: number) { return this.deed<{ n: number }>("town_pouch_in", { p_slot: slot }) as Promise<MineDone<{ n: number }>>; }
  // ── end: mining ──

  box(): Box | null { return this.box_; }
  async boxLook() { await this.ask("town_box"); }
  boxPut(slot: number, n: number, at: [number, number]) { return this.deed<{ item: ItemId; n: number }>("town_box_put", { p_slot: slot, p_n: n, p_x: at[0], p_y: at[1] }); }
  boxTake(slot: number, n: number, at: [number, number]) { return this.deed<{ item: ItemId; n: number }>("town_box_take", { p_slot: slot, p_n: n, p_x: at[0], p_y: at[1] }); }

  // (a database that knows of no heat has no yard's jar either: it says of the jar with everybody's rank)
  hot(): boolean { const now = this.now(); return this.yard_ !== null && hotAt(now, SKIES.sky(now)); }
  ditchAt(key: string): string[] {
    if (this.yard_ === null) return [];
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
    if (bed < 0) return [];
    const plots = Object.fromEntries(Object.entries(this.plots).filter(([k]) => { const [u, v] = k.split(",").map(Number); return bedOf(u, v) === bed; }));
    return reachOf(this.mine, plots, [x, y], this.now(), this.rains());
  }
  async ditchDo(key: string): Promise<Did<{ used: number; watered: string[] }>> {
    const [x, y] = key.split(",").map(Number);
    const did = await this.deed<{ used: number; watered: string[] }>("town_ditch", { p_x: x, p_y: y });
    if (did.ok) this.onDeed?.("farm");
    // (the book changes with it: read again by whoever has had it open)
    if (did.ok && this.wellBook_) void this.ask("town_well");
    return did;
  }
  yardJar(): number | null { return this.yard_; }
  yardCanPour(): boolean { return this.yard_ !== null && canPour(this.mine, this.yard_); }
  async yardPour(at: [number, number] | null): Promise<Did<{ poured: number }>> {
    if (!at) return { ok: false, why: "none" };
    const did = await this.deed<{ poured: number }>("town_yard_pour", { p_x: at[0], p_y: at[1] });
    if (did.ok) this.onDeed?.("kitchen");
    if (did.ok && this.wellBook_) void this.ask("town_well");
    return did;
  }

  wellWater(): WellWater | null { return this.water_ && natureOf(this.water_, this.now()) ? this.water_ : null; }
  drawnNow(): Nature | null { const now = this.now(); return this.waters_ ? natureAt(now, SKIES.raining(now)) : null; }
  canPass(): boolean { return this.line_ && !!carried(this.mine); }
  async passTo(to: string): Promise<Did<{ n: number }>> {
    const did = await this.deed<{ n: number }>("town_pass", { p_to: to });
    if (did.ok) this.onDeed?.("line", to);
    return did;
  }

  async cookDo(things: Array<[ItemId, number]>, _crew: Array<ItemId | null>, cooks: string[], timing: Timing): Promise<KitchenDid<Cooked>> {
    // (the helpings of each dish in the pots I hold, before: a pot that took the yard's water comes with more than the rule of cooking says)
    const inPots = (dish: ItemId) => this.mine.bag.reduce((t, s) => t + (s?.item === "potFull" && s.of?.dish === dish ? s.of.left : 0), 0);
    const before = Object.fromEntries(this.mine.bag.filter((s) => s?.item === "potFull" && s.of).map((s) => [s!.of!.dish, inPots(s!.of!.dish)]));
    const did = await this.deed<Cooked>("town_cook", { p_things: things, p_crew: cooks, p_timing: timing });
    // a find is everybody's: the list of them is asked for again, by me and by whoever is in the kitchen
    if (did.ok && did.first) { void this.ask("town_kitchen"); this.onDeed?.("kitchen"); }
    if (did.ok && this.yard_ !== null && takesWater(did.made) && inPots(did.made) - (before[did.made] ?? 0) >= did.n + YARD.gives) {
      this.yard_ = Math.max(0, this.yard_ - 1);
      this.tell();
      this.onDeed?.("kitchen");
      return { ...did, fresh: true };
    }
    return did;
  }
  async potDown(at: [number, number], slot?: number): Promise<Did<{ pot: Pot }>> {
    // (the first pot there is, is what the database takes when no slot is said: it is asked for so, which a database
    // that has not had v158 yet answers too; any other pot waits for v158, and is refused until then, never mistaken)
    const first = this.mine.bag.findIndex((s) => s?.item === "potFull");
    const did = await this.deed<{ pot: Pot }>("town_pot_down", { p_x: at[0], p_y: at[1], ...(slot === undefined || slot === first ? {} : { p_slot: slot }) });
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
  async feastEat(id: string, at: [number, number] | null, seated: boolean): Promise<Did<{ dish: DishId }>> {
    const did = await this.deed<{ dish: DishId; pot: Pot | null }>("town_feast_eat", { p_id: id, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null, p_seated: seated });
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
  // ── gifts: kitchen ──
  basketPut(slot: number, n: number) { return this.deed<{ dish: DishId; n: number }>("town_basket_put", { p_slot: slot, p_n: n }); }
  basketTake(dish: DishId, n: number) { return this.deed<{ dish: DishId; n: number }>("town_basket_take", { p_dish: dish, p_n: n }); }
  basketEat(dish: DishId, seated: boolean) { return this.deed<{ dish: DishId }>("town_basket_eat", { p_dish: dish, p_seated: seated }); }
  spoonAsk(things: Array<[ItemId, number]>) { return this.deed<{ of: ItemId; secret: ItemId; ways: number; left: number }>("town_spoon", { p_things: things }); }
  spiceEat(from: { slot: number } | { dish: DishId }, seated: boolean) {
    return this.deed<{ dish: DishId }>("town_spice_eat", { p_slot: "slot" in from ? from.slot : null, p_dish: "dish" in from ? from.dish : null, p_seated: seated });
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

  // ── gifts: well ──
  drinkOffer(to: string | null, at: [number, number]) { return this.deed<{ till: number | null }>("town_drink_offer", { p_to: to, p_x: at[0], p_y: at[1] }); }
  async drinkTake(from: string, at: [number, number]): Promise<Did<{ got: number; back: number }>> {
    const did = await this.deed<{ got: number; back: number }>("town_drink_take", { p_from: from, p_x: at[0], p_y: at[1] });
    // (the giver's purse has what the giving gave: they read it again, as somebody handed water does)
    if (did.ok) this.onDeed?.("line", from);
    return did;
  }
  rainFill() { return this.deed<{ n: number }>("town_rain_fill"); }
  /** The nature of the water in each bucket of mine that has one, as the database last told it (with the flask's own answers, and `town_moon`). */
  private kinds_: Record<string, Nature> = {};
  carriedKind(): Nature | null { const c = carried(this.mine), kind = c ? this.kinds_[c.hand] : undefined; return kind && NATURES.includes(kind) ? kind : null; }
  moonLook() { void this.ask("town_moon"); }
  moonKeep() { return this.deed<{ n: number; kind: Nature }>("town_moon_keep"); }
  async moonPour(n: number, at: [number, number] | null): Promise<Did<{ poured: number; into: number; kind: Nature }>> {
    if (!at) return { ok: false, why: "none" };
    const did = await this.deed<{ poured: number; into: number; kind: Nature }>("town_moon_pour", { p_x: at[0], p_y: at[1], p_n: n });
    // (the well has more water and another nature: everybody at the farm looks, and so do I, the book too)
    if (did.ok) { this.onDeed?.("farm"); if (this.wellBook_) void this.ask("town_well"); void this.ask("town_well_ranks"); }
    return did;
  }

  record() { /* the database writes every go down itself, as the deed is done */ }
  close() {
    this.shut = true;
    for (const l of this.looking.values()) if (l.timer) clearTimeout(l.timer);
    this.looking.clear();
    if (this.mealEnd) clearTimeout(this.mealEnd);
    if (this.bugsTimer) clearTimeout(this.bugsTimer);
    if (this.groundTimer) clearTimeout(this.groundTimer);
    if (this.retry) clearTimeout(this.retry);
    if (this.ranksAgain) clearInterval(this.ranksAgain);
    this.heard.clear();
  }

  // ── forging ── (lib/town/forge: every outcome is the database's, and each answer brings my purse and what I have at the smith)
  // (a counted option asked for by the page: the database has no such function yet, and nothing is counted or done)
  async toolPower(_id: OptionId): Promise<Did<{ left: number }>> { return { ok: false, why: "none" }; }
  smith(): SmithTold | null { return this.smith_; }
  smithLook() { if (this.smith_) void this.ask("town_smith"); }
  private async smithDeed<T>(fn: string, args: Record<string, unknown> = {}): Promise<SmithDid<T>> {
    if (!this.smith_) return { ok: false, why: "away" };
    return (await this.deed<T>(fn, args)) as SmithDid<T>;
  }
  smithSmelt(piece: ItemId, n: number) { return this.smithDeed<{ timber: number; fee: number }>("town_smith_smelt", { p_piece: piece, p_n: n }); }
  smithTake() { return this.smithDeed<{ got: Array<[ItemId, number]> }>("town_smith_take"); }
  smithWiden() { return this.smithDeed("town_smith_widen"); }
  async smithNear(ids: string[]): Promise<Array<{ id: string; piece: Smelting; left: number }>> {
    if (!this.smith_ || !ids.length) return [];
    const a = await this.ask("town_smith_near", { p_ids: ids });
    return a && Array.isArray(a.near) ? (a.near as Array<{ id: string; piece: Smelting; left: number }>).filter((x) => !!x && typeof x.id === "string" && !!x.piece && x.piece.piece in ITEMS) : [];
  }
  async smithBellows(whose: string) {
    const did = await this.smithDeed<{ off: number }>("town_smith_bellows", { p_whose: whose });
    // (whoever's queue it was is told through the room: their piece is done sooner)
    if (did.ok) this.onDeed?.("line", whose);
    return did;
  }
  smithTry(slot: number) { return this.smithDeed<{ out: ForgeOutcome; from: number; level: number; owed: number }>("town_smith_try", { p_slot: slot }); }
  smithDraw(slot: number) { return this.smithDeed<{ pending: Pending }>("town_smith_draw", { p_slot: slot }); }
  smithChoose(slot: number, pick: string) { return this.smithDeed<{ opt: OptionId; kept: boolean }>("town_smith_choose", { p_slot: slot, p_pick: pick }); }
  smithRedraw(slot: number, at: number, gem: ItemId) { return this.smithDeed<{ pending: Pending }>("town_smith_redraw", { p_slot: slot, p_at: at, p_gem: gem }); }
  smithGem(slot: number, gem: ItemId) { return this.smithDeed<{ element: Element; over: Element | null }>("town_smith_gem", { p_slot: slot, p_gem: gem }); }
  // (a move of what the smith put into a tool: the database has no such function yet, and nothing is moved or paid)
  async smithMove(_from: number, _to: number, _how: MoveHow): Promise<SmithDid<{ fee: number; spilt: number }>> { return { ok: false, why: "unbuilt" }; }
}
