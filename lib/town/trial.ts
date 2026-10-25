import{rootAfterFell}from'./trial-combos';
import{rootExtraction}from'./reward-root-extraction';
import{continueRow}from'./trial-combos';
import{rowContinue}from'./reward-row-continuation';
import{gardenRetry}from'./reward-garden-retry';
import{rainCare}from'./reward-rain';
import{commitCombo,matchesCombo,comboLoadout}from'./trial-combos';
import{guardSeed,sharedMealBond}from'./trial-combos';
import{rescueAction,rescueOffer,rememberRescue}from './reward-rescue';
import{plantCampFlag,flagBenefit,consumeCampRetry}from './reward-camp';
import{helpGarden}from './reward-help';
import{rememberGardenMisses}from './help-checkpoints';
import{beanAction}from "./reward-bean";
import{gardenAction}from "./reward-garden";
import{kitchenAction,kitchenCooked}from './reward-kitchen';
import{picnicPlace,picnicEat}from"./reward-picnic";
import{crownAction}from"./reward-crown";
import{lanternAction}from"./reward-lantern";
import{arenaAction}from"./reward-arena";
import{beginDragon}from"./reward-dragon";
import { TAILOR, cannotBuy } from "./tailor";
import { minBid, placeBid, ranked, winners, type AuctionBoard, type AuctionBoards, type AuctionRound, type Bid } from "./auction";
type TrialRound = AuctionRound & { bids: Bid[]; owners: AuctionBoard["owners"] };
import { bangkokMinute } from "./daylight";
// ── the pasture ── (lib/town/animal-act, docs/plans/animals)
import { animalAction, newAnimal, type AnimalInput, type AnimalWorld, type Spell, type WagonRun } from "./animal-act";
import { EMPTY_WORLD } from "./animal-world";
import { ANIMALS as ANIMAL_RULES, BREED as ANIMAL_BREEDS, SPECIES as ANIMAL_SPECIES, dayOf as animalDay, newHerd as newAnimalHerd, freeHome as freeAnimalHome, boughtStats as boughtAnimalStats, type Animal, type Stage as AnimalStage } from "./animals";
import { spotOf as pastureSpot } from "./pasture";
import { dressFrom, dropsFor } from "./wear";
import {boatAction} from './reward-boat';
import type {LotusBoat} from './lotus-boats';
import {buildCrossing} from "./reward-crossing";
import type {TemporaryCrossing} from "./temporary-crossings";
import {treePact} from "./reward-pact";
import {partReady,restPart} from "./tree-parts";
import {nursery} from "./reward-nursery";
import {callCloud,type CloudConsent} from "./reward-cloud";
import {springAction,type RewardSpring} from "./reward-springs";
import {conduit} from "./reward-conduit";
import {waterRelay} from "./reward-relay";
// CASINO_NATIVE_MAP: native Town runtime, private admin rehearsal.
import type { RockChoice } from "./geology";
import { scanMineral, beginExtraction, endExtraction } from "./reward-actions";
import { fieldProcess } from "./reward-field";
import { beginTrail,trailAction } from "./reward-trails";
import { beginCore,coreAction } from "./reward-core";
import { beginResource,resourceAction,type ResourceCorrection } from "./reward-resources";
import { startSchool,type FishPool } from "./reward-fishing";
import {portableLift} from "./reward-lift";
import type { RewardInput, RewardReply } from "./reward-types";
import { gardenTend, syncGarden } from "./gardening";
import { syncQuality } from "./quality-plant";
import { insectCare, type InsectCare } from "./insect-garden";
import { boxOffer, moveBox, newBox, roomyBox, sortBox, stow, unstow, upgradeBox, type Box, type BoxRefusal } from "./box";
import { craft, type CraftId } from "./crafting";
import { streamWork, type StreamAction, type StreamGate } from "./stream-work";
import { preparationReady, prepare, PREPARATION, type PrepId, type PrepRun, type PrepAnswers } from "./preparation";
import { makeCamp, campBenefit, type FieldCamp } from "./camps";
import { fitHook } from "./rod-hook";
import { cook, feastEat, hasMade, isFind, ladle, mayLeave, serve, setDown, takeUp, tidied, type Pot, type Taste } from "./cooking";
import { WATER, WILD, chore, choreFor, deedFor, inPestHours, ownerOf, pestHour, tend, type Bed, type Chore, type Deed, type FarmRefusal, type FarmSky, type Plot, type Swarms } from "./farm";
import { agree, lay, newDeal, sideOf, swap, type Deal, type Give } from "./deal";
import { backBait, hookBait, landCatch, loseBait } from "./fishing";
import { gather, holds, lanternLit, placeAt, ruleOf, sights, turnOf, type ForestRefusal, type Outcome, type Sight } from "./forest";
import { huntTold, mapDig, mapUse, type HuntTold } from "./hunt";
import { count as countLine, countsOf, harvestWork, newLine, type Done as Deeded, type LineKept } from "./line-points";
import { ALL_GIFTS, USES, giftsOf, stretchOf, takeGift as takeRankGift, useGift, wearCharms, wearFamiliar, wearing, type GiftId, type GiftRefusal } from "./gifts";
import { LINE_IDS, LINES, earnedOn, harvestReserve, mayWear, noLines, wornOf, type LineId, type LinesTold, type Worn } from "./lines";
import { gardensOf } from "./garden-visitors";
import { BUGS, HAUNTS, HAUNT_KINDS, SCARCE, bugTurn, comeback, farmBugs, hereFor, nectar, net, netMine, swarms, type BugId, type BugRefusal, type BugSight, type Comeback, type Haunt, type Hunt, type Mine, type Swarm, pestToRid } from "./insects";
import { NOTE, blessed, newFountain, tidyNote, told, toss, type Fountain, type FountainTold, type WishId, type WishNote } from "./fountain";
import { drop as dropDown, lying, pickUp, type Dropped } from "./ground";
import * as Shops from "./shop";
import { buyHint, hintPrice, hintsLeft } from "./hints";
import * as Notices from "./notices";
import { MARKET, counted, factorOf, factsOf, farmPricesOf, newMarket, pricesTold, rolled, type Logged, type Market, type MarketQuote, type PricesTold } from "./market";
import { CROPS, CROP_IDS, DISHES, ITEMS, STAGES, STAGE_AT, type BaitId, type CatchId, type DishId, type ItemId } from "./items";
import { UNLOCKS, give, newVillage, orderOf, shelfOf, sourcesAt, type Order, type Village } from "./orders";
import { count, keep, newTally, type Play, type Tally } from "./plays";
import { open } from "./scrolls";
import { SKIES } from "./skies";
import { STAMINA, bowlsBack, chew, dayOf, getUp, readScroll, sitDown, spend } from "./stamina";
import { moveSlot, sortBag } from "./bag";
import {
  RULES, buy, change, collect, handOf, hold, leave, letGo, newPurse, newStall, nextRoundAt, no, put, roomFor, roomy, roundOf, takeBack, takeOff, wear,
  type Done, type Purse, type Refusal, type Stall,
} from "./trade";
import { giveBed, leaveBed, plantsIn, type BedRefusal } from "./bed-hand";
import { KITCHEN, bedCorner, bedOf, wellBy, wellOf, yardFloor } from "./world";
import { collect as jarCollect, drop as jarDrop, newJar, settle, type Jar, type JarThing, type JarTold, type Owed } from "./jar";
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
import { glassReach, glassTurn, gnomeReach, gnomeWater, moveTargets, movePlant, plotKey, rowFor, rowTend, type MoveRefusal, type RowDeed } from "./farm";
import { rowOf, plotsOfBed } from "./world";
// ── gifts: well ──
import { MOON, drinkOffer, drinkTake, moonKeep, moonPour, rainFill, type WellGiftRefusal } from "./well-gifts";
// ── gifts: helpers ──
import { dust, pourFor, pourRow } from "./farm";
import { aided, belled, pouredAs, ring, share, type HelpRefusal } from "./helping";
// ── forging ──
import { FORGE, toolKindOf, type OptionId, type ToolKind } from "./tools";
import { beside, mayTwice } from "./farm";
import { canHolds } from "./farm";
import { houseDeedFor, houseDo as doHouse, type HouseDeed, type HouseRefusal } from "./insect-house";
import { canFx, netFx } from "./forged";
import { usePower } from "./powers";
import { heldStack as toolInHand } from "./trade";
import type { Stack } from "./trade";
import {
  bellows, bellowsLeft, choose as chooseOption, collect as collectSmelted, draw as drawOptions, forgeTry, markFound, markTop, moveForging, newBoard, newSmithy, redraw as redrawOption, setGem, smelt, smithView, soundSmithy, widen,
  type Did as SmithDid, type Outcome as ForgeOutcome, type SmithBoard, type SmithRefusal, type Smithy,
} from "./forge";
/** What each tester has at the smith (lib/town/forge), the village's board there, and every try that was made: the whole browser's. */
const smithKey = (id: string) => `cashtown.trial.smith.1.${id}`;
const SMITH_BOARD = "cashtown.trial.smith.board.1", SMITH_LOG = "cashtown.trial.smith.log.1";
/** The village's one great fire (lib/town/great-fire): the whole browser's, like the board. */
const SMITH_FIRE = "cashtown.trial.smith.fire.1";
/** A try as it is written down: who, at which tool, from which level for which, and how it went. */
export interface TryLogged { by: string; name: string; item: ToolKind; from: number; to: number; out: ForgeOutcome; level: number; at: number }
// ── mining ──
import { boardOf as caveBoardOf, breakRocks, caveAt, changesAt, crystalBroken, floorAtTile, floorRocks, floorSpots, floorTile, goneAt, openWay, setMoss, setTorch, stands, strikeRock, struckAt, struckTold, wayOpen, type CaveState, type CaveTold } from "./cave-state";
import { MINING, anyPick, crystalOf, drill, elementOf, helpersOf, holdsOf, mayRide, mine, mineOf, oreOf, payFirst, peekOf, pickOf, reachRest, torchDown, turnOf as mineTurn, veinEnd, wayRockOf, type Go as MineGo, type Holds, type Mined, type MineRefusal, type Peek, type PendingVein, type PlaceToday, type RockAt } from "./mining";
import { bagToPouch, pouchToBag, type PouchRefusal } from "./pouches";
import { ALL, GEMS, GEM_FX, ORES, gemBy, has as toolHas, levelOf } from "./tools";
import { fireSpent, fireTold, fireWhy, halfFound, joinRow, leaveRow, newGreatFire, soundGreatFire, type GreatFire, type Half } from "./great-fire";
import { isRest } from "./cave";
import { ALL_LINE_IDS, MORE_LINE_IDS } from "./lines";
import { MOUNTAIN_ROCKS } from "./world";
import { bySmith } from "./world";
/** The cave as the browser keeps it for every tester (lib/town/cave-state); what scripts have a rock hold, and the chances they hold; and each tester's own deeds at the mine. */
const CAVE_KEPT = "cashtown.trial.cave.1", MINE_FATE = "cashtown.trial.mine.fate.1", MINE_LUCK = "cashtown.trial.mine.luck.1";
const mineDeedsKey = (id: string) => `cashtown.trial.mine.deeds.1.${id}`;
/** What a script may have a rock hold. */
export type RockFate = "stone" | "shards" | "moss" | "vein" | "gem" | "way" | "crystal";
export interface MineDeed { what: string; thing: string | null; n: number; doc: Record<string, unknown>; at: number }
// ── end: mining ──
// ── felling ──
import { TREES as TREE_KNOBS, begin as fellBegin, braceGo, bracePay, fell, groveOf, newGrove, opened as fellOpened, rootBack, tidied as treesTidied, toldOf as treesTold, type FellLuck, type FellWent, type Grove, type TreeRefusal, type TreesTold } from "./trees";
import type { FellDid } from "./keeper";
import type { FellingAsk } from "./felling";
// ── end: felling ──
// ── the bridge built by hand ──
import { BRIDGE, drop as stoneDrop, laid as stoneLaid, lay as stoneLay, lift as stoneLift, luckFor, newWorks, pass as stonePass, told as worksTold, workOf, type BridgeRefusal, type WorksKept, type WorksTold } from "./bridge";
// ── the lamp relay ──
import { LAMPS, held as lampHeld, light as lampLight, lighted as lampLighted, litOf, newLamps, nightBegins, nightOf, pass as flamePass, postsOf, take as flameTake, told as lampsTold, type LampMap, type LampRefusal, type LampsKept, type LampsTold } from "./lamps";

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
/** The farm's second well (lib/town/world's WELLS): its water (its water's nature is the well's book's `southWater`). */
const WELL_SOUTH = "cashtown.trial.well.south.1";
const wellKey = (i: number) => (i === 1 ? WELL_SOUTH : WELL);
/** The well a plot's watering takes its water's nature from: the one nearest it. */
const wellOfKey = (key: string) => { const [x, y] = key.split(",").map(Number); return wellOf(x, y); };
/** Which well somebody on a tile stands at (the first, where none). */
const wellAt = (at: readonly [number, number] | null | undefined) => (at ? Math.max(0, wellBy(at[0], at[1])) : 0);
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
const WILD_REST = "cashtown.trial.wild.rest.1";
const BUG_TOOK = "cashtown.trial.bugs.took.1", BUG_BOOK = "cashtown.trial.bugs.book.1", BUG_BACK = "cashtown.trial.bugs.back.1";
/** The hours the farm was counted with insects that eat plants on it (lib/town/farm's Swarms). */
const SWARMS = "cashtown.trial.farm.swarms.1";
/** Every insect caught in this browser within the day: what the scarcity of each kind is counted from. */
const BUG_HUNTS = "cashtown.trial.bugs.hunts.1";
/** The well's book (lib/town/well): whose water is where, for the whole browser. */
const WELL_LOG = "cashtown.trial.welllog.1";
// Everybody's lines of work as they are kept, by member and by line (lib/town/line-points), and the title each wears.
const LINES_AT = "cashtown.trial.lines.1", TITLES = "cashtown.trial.titles.1";
/** The village's works (lib/town/bridge): the whole browser's, so that one tester hands a stone to another and all build one bridge. */
const WORKS_AT = "cashtown.trial.works.1";
/** The lamps of the farm and the forest (lib/town/lamps): the whole browser's, so that one tester hands a flame to another and all light one night. */
const LAMPS_AT = "cashtown.trial.lamps.1";
/** The thanks given (lib/town/thanks), and the jar at the well with what waits at it for each (lib/town/jar): the whole browser's. */
const THANKS = "cashtown.trial.thanks.1", JAR = "cashtown.trial.jar.1";
/** The bucketfuls in the cooking yard's water jar (lib/town/yard): the whole browser's. */
const YARD_JAR = "cashtown.trial.yardjar.1";
/** The stalls under signs (lib/town/shop): the whole browser's, each by its keeper, so that one tester buys at another's. */
const SHOPS = "cashtown.trial.shops.1";
/** What lies on the ground (lib/town/ground): the whole browser's, so that one tester picks up what another dropped. */
const GROUND_AT = "cashtown.trial.ground.1";
// ── felling ── (the mountain's trees, lib/town/trees: the whole browser's, so that one tester sees the stump another made)
const TREES_AT = "cashtown.trial.trees.1";
// ── the pasture ── (everybody's animals, the herds, the gate, the gifts' hours and the wagons: the whole browser's, so that one tester cares for another's animals)
const ANIMALS_AT = "cashtown.trial.animals.2";
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
/** (v276) What each member has to wear for good, bought or found. */
const dressedKey = (id: string) => `cashtown.trial.dressed.1.${id}`;
// (v297's in the browser: the auction's rounds, the bids that stand and who won what, and which of mine are limited)
const AUCTIONS = "cashtown.trial.auctions.1";
const limitedKey = (id: string) => `cashtown.trial.limited.1.${id}`;
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

  constructor(private readonly id: string, options: { memoryOnly?: boolean } = {}) { this.stored = !options.memoryOnly; }
  get memoryOnly() { return !this.stored; }
  casinoCoins(coins: number) { const purse = this.purse(); if (purse.coins === coins) return; this.write(purseKey(this.id), { ...purse, coins }); this.tell(); }

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
  // (the farm: each changed plant's Quality round settled as it stood before, as the trigger on town_plots does)
  private write(key: string, value: unknown) { this.set(key, JSON.stringify(key === FARM ? syncGarden(syncQuality(this.farm(), value as Record<string, Plot>, this.now(), this.sky())) : value)); }

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
  streamGate(): StreamGate | null { return this.read<StreamGate|null>("cashtown.trial.stream.1",()=>null,v=>v===null||!!v&&typeof v==="object"); }
  preparationBegin(recipe:PrepId,at:[number,number],request:string){
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request))return no("none");
    const old=this.read<PrepRun|null>(`cashtown.trial.preparation.1.${this.id}`,()=>null,v=>v===null||!!v&&typeof v==="object");
    const receipts=this.read<Record<string,string>>(`cashtown.trial.field.receipts.1.${this.id}`,()=>({}),v=>!!v&&typeof v==="object");
    if(old?.id===request||Object.hasOwn(receipts,request))return {ok:false as const,why:"had" as const};
    if(Object.keys(receipts).length>=1000)return {ok:false as const,why:"spent" as const};
    const refused=preparationReady(this.purse(),recipe,at);if(refused)return {ok:false as const,why:refused};
    const now=this.now(),run:PrepRun={id:request,recipe,seed:Math.floor(now%2147483647),at:now,until:now+PREPARATION.minutes*60000,tile:at};
    this.write(`cashtown.trial.preparation.1.${this.id}`,run);this.write(`cashtown.trial.field.receipts.1.${this.id}`,{...receipts,[request]:"prep-begin"});return {ok:true as const,run};
  }
  preparationEnd(id:string,answers:PrepAnswers,at:[number,number]){
    const receiptsKey=`cashtown.trial.field.receipts.1.${this.id}`,receipts=this.read<Record<string,string>>(receiptsKey,()=>({}),v=>!!v&&typeof v==="object");
    if(receipts[id]==="prep-end")return {ok:false as const,why:"had" as const};
    const key=`cashtown.trial.preparation.1.${this.id}`,run=this.read<PrepRun|null>(key,()=>null,v=>v===null||!!v&&typeof v==="object");
    const d=prepare(this.purse(),run,id,answers,at,this.now());if(!d.ok)return d;
    this.write(key,null);this.write(receiptsKey,{...receipts,[id]:"prep-end"});this.save(d.purse);
    this.counted({from:"play",what:"cooking",thing:d.made,n:d.n,won:d.mistakes===0,doc:{preparation:true}});
    return {ok:true as const,made:d.made,n:d.n,mistakes:d.mistakes};
  }
  camps():FieldCamp[]{return this.read<FieldCamp[]>("cashtown.trial.camps.1",()=>[],Array.isArray).filter(c=>c.until>this.now());}
  campsLook(){this.tell();}
  campDo(action:"place"|"benefit",site:number,supply:string|null,at:[number,number],request:string){
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request))return no("none");
    const key=`cashtown.trial.field.receipts.1.${this.id}`,receipts=this.read<Record<string,string>>(key,()=>({}),v=>!!v&&typeof v==="object");
    if(Object.hasOwn(receipts,request))return {ok:false as const,why:"had" as const};
    if(Object.keys(receipts).length>=1000)return {ok:false as const,why:"spent" as const};
    const camps=this.camps(),old=camps.find(c=>c.site===site)??null,now=this.now();
    const d=action==="place"?makeCamp(this.purse(),site,at,old,this.id,now):campBenefit(this.purse(),old,supply??"",at,now);
    if(!d.ok)return d;
    const bonus=action==="benefit"?flagBenefit(this.purse(),d.purse,d.camp,this.id,now):{purse:d.purse,camp:d.camp};const next=[...camps.filter(c=>c.site!==site),bonus.camp];this.write("cashtown.trial.camps.1",next);this.write(key,{...receipts,[request]:action});this.save(bonus.purse);
    if(action==="benefit"&&old)this.counted({from:"deed",what:"camp_prepare",thing:supply,n:1,doc:{owner:old.by}});
    return {ok:true as const,camps:next};
  }
  streamDo(action: StreamAction, choice: string, at: [number,number], request: string) {
    if (!/^[0-9a-f-]{36}$/i.test(request)) return no("none");
    const key=`cashtown.trial.stream.receipts.1.${this.id}`;
    const receipts=this.read<Record<string,{action:string;choice:string}>>(key,()=>({}),v=>!!v&&typeof v==="object");
    if (Object.hasOwn(receipts,request)) return { ok: false as const, why: "had" as const };
    const at_=wellAt(at);
    if (action==="pour" && this.well(at_)>=WATER.well) return no("full");
    const now=this.now(),d=streamWork(this.purse(),action,choice,at,this.streamGate(),this.id,now);
    if (!d.ok) return d;
    if (d.gate) this.write("cashtown.trial.stream.1",d.gate);
    if (d.nature) {
      this.write(wellKey(at_),this.well(at_)+1);
      this.wellSeen({by:this.id,at:now,what:"pour",n:1,well:at_});
      this.keepWellWater(at_,pouredIn(this.wellWaterOf(at_),d.nature,1,this.id,now,d.times));
    }
    this.write(key,{...receipts,[request]:{action,choice}});
    this.save(d.purse);
    return {ok:true as const,stream:this.streamGate(),...(d.got?{got:d.got}:{})};
  }
  private save(purse: Purse): Purse { this.write(purseKey(this.id), purse); this.tell(); return purse; }

  buy(item: ItemId, n: number) { return this.keep(buy(this.purse(), this.stall(), item, n, this.now(), this.shelf())); }
  craft(item: CraftId, request: string): Done<{ purse: Purse; item: CraftId; n: number; fee: number }> {
    const key = `cashtown.trial.craft.1.${this.id}`;
    const receipts = this.read<Record<string, { item: CraftId; fee: number }>>(key, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
    const old = Object.hasOwn(receipts, request) ? receipts[request] : null;
    if (old) return old.item === item ? { ok: true, purse: this.purse(), item, n: 1, fee: old.fee } : { ok: false, why: "none" };
    const did = this.keep(craft(this.purse(), item, this.now()));
    if (did.ok) this.write(key, { ...receipts, [request]: { item: did.item, fee: did.fee } });
    return did;
  }

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
  /** Every crop's price this round, as the farm is told it (v283). */
  farmPrices(): PricesTold { return farmPricesOf(this.market(), factsOf()); }
  /** Leave things with the uncle at this round's price. What is left counts as sold this round; what is taken back in the round it was left in was not sold. */
  leave(slot: number, n: number, quote?: MarketQuote) {
    const purse = this.purse(), market = this.market(), item = purse.bag[slot]?.item;
    if (quote && (!item || item !== quote.item || market.round !== quote.round ||
      factorOf(market, item) !== quote.f || ITEMS[item].pays !== quote.base)) return no("quote");
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
  noticePost(kind: "sell" | "want", item: ItemId, n: number, price: number, grade: 0 | 1 | 2 | 3 = 0) { return this.pin(Notices.post(this.purse(), this.pinboard(), this.id, kind, item, n, price, this.now(), this.seen(), undefined, grade)); }
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
  private boxed<T extends { purse: Purse; box: Box; item: ItemId }>(did: ({ ok: true } & T) | { ok: false; why: Refusal | BoxRefusal }) {
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
  boxOffer() { return boxOffer(this.box()); }
  boxMove(from: number, to: number, at: [number, number], expected: Box["things"]) {
    const did = moveBox(this.box(), from, to, at, expected);
    if (did.ok) { this.write(boxKey(this.id), did.box); this.tell(); }
    return did;
  }
  boxSort(at: [number, number], expected: Box["things"]) {
    const did = sortBox(this.box(), at, expected);
    if (did.ok) { this.write(boxKey(this.id), did.box); this.tell(); }
    return did;
  }
  boxUpgrade(slots: number, at: [number, number]) {
    const did = upgradeBox(this.purse(), this.box(), slots, at);
    if (did.ok) { this.write(boxKey(this.id), did.box); this.save(did.purse); }
    return did;
  }
  /** For scripts and the test window: a box with so many slots beyond the free ones. */
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
  /** (v276) What I have to wear for good. */
  dressed(): string[] { return this.read<string[]>(dressedKey(this.id), () => [], (v) => Array.isArray(v) && v.every((x) => typeof x === "string")); }
  /** (v276) Wear a thing of the bag into the wardrobe (town_dress). */
  dress(slot: number): Done<{ purse: Purse; wearable: string; dressed: string[] }> {
    const had = this.dressed(), did = dressFrom(this.purse(), slot, had);
    if (!did.ok) return did;
    const dressed = [...had, did.wearable];
    this.write(dressedKey(this.id), dressed);
    this.keep(did);
    return { ...did, dressed };
  }
  /** (v297) Buy a thing to wear at Granny Twilla's (town_tailor_buy): coins out, into the wardrobe for good. */
  tailorBuy(wearable: string): Done<{ purse: Purse; wearable: string; price: number; dressed: string[] }> {
    const had = this.dressed(), purse = this.purse();
    const why = cannotBuy(wearable, purse.coins, new Set(had), this.now());
    if (why) return { ok: false, why: why as Refusal };
    const price = TAILOR[wearable].price, dressed = [...had, wearable];
    this.write(dressedKey(this.id), dressed);
    return this.keep({ ok: true, purse: { ...purse, coins: purse.coins - price }, wearable, price, dressed });
  }
  /** (v297) Which of my things are limited, as town_dressed says: a wearable, its round and its number. */
  limited(): Record<string, [number, number]> { return this.read<Record<string, [number, number]>>(limitedKey(this.id), () => ({}), (v) => !!v && typeof v === "object"); }
  /**
   * (v297) The auction's rounds in the browser: the first round's two designs open from now (the real ones open on
   * Tuesday) to their real close, a pretend rival on the pumpkin so the board shows a held copy; settled when looked at.
   */
  private rounds(): TrialRound[] {
    const now = this.now();
    const made = this.read<TrialRound[]>(AUCTIONS, () => [], (v) => Array.isArray(v));
    if (made.length) return made;
    const close = Date.parse("2026-10-31T21:00:00+07:00"), hard = Date.parse("2026-10-31T22:00:00+07:00");
    const round = (id: number, design: string, wearables: string[], bids: Bid[]): TrialRound =>
      ({ id, design, wearables, run: 1, copies: 3, start: 8000, stepPct: 5, stepMin: 500, opensAt: now - 3600_000, closesAt: Math.max(close, now + 3 * 86400_000), hardClose: Math.max(hard, now + 3 * 86400_000 + 3600_000), settledAt: null, bids, owners: [] });
    const fresh = [round(1, "count", ["count", "counthat"], []), round(2, "pumpkin", ["pumpkin", "pumpkincrown"], [{ member: "trial-rival", name: "Mint", amount: 8500, at: now - 600_000 }])];
    this.write(AUCTIONS, fresh);
    return fresh;
  }
  private boardOf(r: TrialRound): AuctionBoard {
    const { bids, owners, ...round } = r;
    return { ...round, bids: ranked(bids).map((b) => ({ name: b.member === this.id ? "คุณ" : b.name, amount: b.amount, at: b.at, mine: b.member === this.id })),
      had: this.dressed().includes(r.wearables[0]), owners };
  }
  auctions(): AuctionBoards {
    const now = this.now();
    const all = this.rounds().map((r) => {
      if (r.settledAt || now < r.closesAt) return r;
      const won = winners(r, r.bids);
      const mine = won.find((w) => w.member === this.id);
      if (mine) {
        this.write(dressedKey(this.id), [...new Set([...this.dressed(), ...r.wearables])]);
        this.write(limitedKey(this.id), { ...this.limited(), ...Object.fromEntries(r.wearables.map((w) => [w, [r.run, mine.edition]])) });
      }
      return { ...r, settledAt: now, owners: won.map((w) => ({ member: w.member, name: w.name, edition: w.edition })) };
    });
    this.write(AUCTIONS, all);
    return { now, auctions: all.map((r) => this.boardOf(r)), owners: all.flatMap((r) => r.owners.map((o) => ({ member: o.member, outfit: r.wearables[0], edition: o.edition, copies: r.copies, run: r.run }))) };
  }
  /** (v297) A bid on a round (town_bid): paid and held at once; the one pushed out is paid back (a pretend rival's coins go nowhere). */
  bid(auction: number, amount: number): { ok: true; pay: number; auction: AuctionBoard } | { ok: false; why: Refusal; least?: number; auction?: AuctionBoard } {
    this.auctions();
    const all = this.rounds(), r = all.find((x) => x.id === auction);
    if (!r) return { ok: false, why: "none" };
    const purse = this.purse();
    const did = placeBid(r, r.bids, { id: this.id, name: "คุณ", coins: purse.coins, owns: this.dressed().includes(r.wearables[0]) }, amount, this.now());
    if (!did.ok) return { ok: false, why: did.why as Refusal, least: did.why === "low" ? minBid(r, r.bids, this.id) : undefined, auction: this.boardOf(r) };
    const next = { ...r, bids: did.bids, closesAt: did.closesAt };
    this.write(AUCTIONS, all.map((x) => (x.id === auction ? next : x)));
    // (what I had in and was pushed out of comes back to me; nobody else's purse is kept here)
    const back = did.out.filter((b) => b.member === this.id).reduce((n, b) => n + b.amount, 0);
    this.keep({ ok: true, purse: { ...purse, coins: purse.coins - did.pay + back } });
    return { ok: true, pay: did.pay, auction: this.boardOf(next) };
  }
  /** Open what may hold something (an old boot, a bottle, a chest): says what was in it, if anything. */
  openThing(slot: number) { return this.keep(open(this.purse(), slot, [Math.random(), Math.random()])); }

  /** Take up the thing in a slot of the bag, to hold it in the hand; or put away what is held. */
  hold(slot: number) { return this.keep(hold(this.purse(), slot)); }
  letGo() { this.save(letGo(this.purse())); }
  /** The bag put in order (lib/town/bag): a thing moved from one slot to another, and the whole of it sorted. */
  bagMove(from: number, to: number) { return this.keep(moveSlot(this.purse(), from, to)); }
  bagSort() { this.save(sortBag(this.purse())); }

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
  well(i = 0): number {
    return this.read<number>(wellKey(i), () => 0, (v) => typeof v === "number" && v >= 0 && v <= WATER.well);
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
    // (forging: a can that waters twice in an hour is offered a plant that is wet from one watering)
    return deedFor(key, this.farm()[key] ?? WILD, handOf(this.purse()), this.id, this.now(), this.owners().get(bedOf(x, y))?.by ?? null, this.sky(), mayTwice(this.purse(), this.now()));
  }
  /** Do to a plot what the thing in my hand does: clear it, till it, dig its plant out (a living one only when it is `sure`), sow it, water it, feed it, cure it, pick it. Says what was done and what came of it, or why not. */
  /**
   * My bed handed on to another tester of this browser, or given up (lib/town/bed-hand): the beds, the farm and my purse
   * written as the database would leave them (v288).
   */
  bedGive(bed: number, to: string, name: string): { ok: true; plants: number } | { ok: false; why: BedRefusal } {
    const now = this.now(), beds = this.beds(), plots = this.farm();
    const toHolds = [...this.owners()].filter(([n, o]) => n !== bed && o.by === to).length;
    const did = giveBed(bed, beds[bed], plots, this.id, to, toHolds, now);
    if (!did.ok) return did;
    this.write(FARM, { ...plots, ...did.plots });
    this.write(BEDS, { ...beds, [bed]: { ...did.bed, name: name || to } });
    this.counted({ from: "deed", what: "bed_give", thing: null, n: plantsIn(bed, plots), doc: { bed, to } });
    return { ok: true, plants: plantsIn(bed, plots) };
  }
  bedLeave(bed: number): { ok: true; plants: number } | { ok: false; why: BedRefusal } {
    const now = this.now(), beds = this.beds(), plots = this.farm();
    const did = leaveBed(bed, beds[bed], plots, this.purse(), this.id, now);
    if (!did.ok) return did;
    this.write(FARM, { ...plots, ...did.plots });
    const kept = { ...beds };
    delete kept[bed];
    this.write(BEDS, kept);
    this.save(did.purse);
    this.counted({ from: "deed", what: "bed_leave", thing: null, n: plantsIn(bed, plots), doc: { bed } });
    return { ok: true, plants: plantsIn(bed, plots) };
  }
  farmDo(key: string, name = "", sure = false, rotation = 0): { ok: true; deed: Deed; got: Array<[ItemId, number]>; also?: string[] } | { ok: false; why: Refusal | FarmRefusal } {
    // (somebody is at the farm: its hour is counted, if it has not been)
    this.swarmNote();
    const p = this.purse(), now = this.now(), plots = this.farm(), plot = plots[key] ?? WILD, beds = this.beds();
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), planted = this.plantedIn(plots);
    const holds = [...this.owners()].filter(([n, o]) => n !== bed && o.by === this.id).length;
    const did = gardenTend(key, plots, beds[bed], (planted.get(bed) ?? 0) - (plot.plant ? 1 : 0), holds, p, this.id, now, this.sky(), sure, this.putLuck ?? undefined, rotation);
    if (!did.ok) return did;
    if(did.deed==="sow"){const guarded=guardSeed(did.purse,did.plot,key,now);did.purse=guarded.purse;did.plot=guarded.plot;did.plots[key]=guarded.plot;}
    const next = { ...plots, ...did.plots };
    // (a watering on a hot afternoon does as much again, and has the nature of the well's water while it has one: lib/town/heat and waters, as the plot is kept)
    if (did.plot.soil === "wild" && !did.plot.plant) delete next[key]; else next[key] = this.poured(plot, did.plot, now, did.deed === "water" ? did.times ?? 1 : 0, this.bellWorn(bed), key);
    // ── forging: old tools ── (what the deed did to the plots beside it, with lightning in the tool or a can that rains: lib/town/farm's beside.
    // Each is kept as the one done was kept, and none of them is counted on a line: they are the tool's doing.)
    const more = beside(key, canFx(toolInHand(p)).rain ? plotsOfBed(x, y).map(([u, v]) => plotKey(u, v)) : this.rowKeys(key), plots, did.deed, p, did.purse, this.id, now, this.owners().get(bed)?.by ?? null, this.sky());
    for (const [k, beside2] of Object.entries(more.plots)) next[k] = did.deed === "water" && plots[k] ? this.poured(plots[k], beside2, now, 1, this.bellWorn(bed), k) : beside2;
    this.write(FARM, syncGarden(next));
    const kept = { ...beds };
    if (!did.bed) delete kept[bed];
    else kept[bed] = { ...did.bed, name: (did.bed.by === beds[bed]?.by && beds[bed]?.name) || name || did.bed.by };
    this.write(BEDS, kept);
    // (a plot sown anew forgets who helped the plant that was there)
    if (did.deed === "sow") this.wellSeen({ by: this.id, at: now, what: "sow", tile: [x, y] });
    // (a plant watered is a line of the well's book: with which can, and whose plant when not my own)
    if (did.deed === "water") this.wellSeen({ by: this.id, at: now, what: "water", can: handOf(p) ?? undefined, tile: [x, y], ...(plot.plant && plot.plant.by !== this.id ? { whose: plot.plant.by } : {}) });
    this.save(more.purse);
    // ── gifts: helpers ── (a friend watered in this bed a moment ago: the duet bell, lib/town/helping)
    if (did.deed === "water") this.bell(bed, [key], name);
    // (and it counts on a line, if it is one that does: help in somebody else's bed, a picking of one's own plant)
    // (forging: `kind`, somebody else's plant watered with a can of kind hands: so many points more, lib/town/line-points)
    const kind = did.deed === "water" && plot.plant && plot.plant.by !== this.id ? canFx(toolInHand(p)).kind : 0;
    this.counted({ from: "deed", what: did.deed, thing: plot.plant?.crop ?? null, n: 1, doc: {
      ...(plot.plant && plot.plant.by !== this.id ? { whose: plot.plant.by } : {}),
      ...(!plot.plant && beds[bed] && beds[bed].by !== this.id ? { owner: beds[bed].by } : {}),
      ...(kind > 0 ? { kind } : {}),
      ...(did.deed === "pick" && plot.plant ? harvestWork(plot.plant) : {}),
    } });
    const also = [...new Set([...Object.keys(more.plots), ...Object.keys(did.plots).filter(k => k !== key)])];
    return { ok: true, deed: did.deed, got: did.got, ...(also.length ? { also } : {}) };
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
    if(did.deed==="sow")for(const e of did.each){const g=guardSeed(did.purse,did.plots[e.key],e.key,now);did.purse=g.purse;did.plots[e.key]=g.plot;}
    const next = { ...plots }, sky = SKIES.sky(now);
    for (const [k, plot] of Object.entries(did.plots)) { if (plot.soil === "wild" && !plot.plant) delete next[k]; else next[k] = keptAs(plots[k], plot, now, sky, this.natureNow(now, wellOfKey(k))); }
    this.write(FARM, next);
    const kept = { ...beds };
    if (!did.bed) delete kept[bed];
    else kept[bed] = { ...did.bed, name: (did.bed.by === beds[bed]?.by && beds[bed]?.name) || name || did.bed.by };
    this.write(BEDS, kept);
    for (const e of did.each) {
      const was = plots[e.key]?.plant, [u, v] = e.key.split(",").map(Number);
      // (a plot sown anew forgets who helped the plant that was there)
      if (did.deed === "sow") this.wellSeen({ by: this.id, at: now, what: "sow", tile: [u, v] });
      this.counted({ from: "deed", what: did.deed, thing: e.crop, n: 1, doc: { ...(was && was.by !== this.id ? { whose: was.by } : {}), ...(!was && beds[bed] && beds[bed].by !== this.id ? { owner: beds[bed].by } : {}), ...(did.deed === "pick" && was ? harvestWork(was) : {}) } });
    }
    const offered=rowFor(key,keys,plots,p,this.id,now,this.owners().get(bed)?.by??null,this.sky())?.plots??[];this.save(continueRow(p,rememberGardenMisses(did.purse,offered,did.deed,plots,this.owners().get(bed)?.by??null,marks,did.each.map(e=>e.key),this.id,now),key,offered,did.each.map(e=>e.key),did.deed,next,this.owners().get(bed)?.by??null,marks,this.id,now,this.sky()));
    return { ok: true, deed: did.deed, done: did.each.map((e) => e.key), got: did.got, ...(did.seeds === undefined ? {} : { seeds: did.seeds }) };
  }
  /** The plots of the bed a plot is in that the garden gnome would water if it were sent now (lib/town/farm's gnomeReach), in the order it would go. */
  gnomeAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
    return bed < 0 ? [] : gnomeReach(bed, this.bedAt(x, y), this.purse(), this.id, this.now(), this.owners().get(bed)?.by ?? null, this.sky());
  }
  insectCare(key: string, slot: number, mode: InsectCare) {
    const plots = this.farm(), did = insectCare(key, plots[key] ?? WILD, this.purse(), slot, mode, this.id, this.now(), this.sky());
    if (!did.ok) return did;
    this.write(FARM, { ...plots, [key]: did.plot });
    this.save(did.purse);
    this.counted({ from: "deed", what: mode === "guard" ? "cure" : "feed", thing: did.plot.plant.crop, n: 1, doc: { ...(did.plot.plant.by !== this.id ? { whose: did.plot.plant.by } : {}) } });
    this.tell();
    return { ok: true as const };
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
  /** The plots of its bed my enchanted hoe may move the plant in a plot to now (lib/town/farm's moveTargets): none, when there is no move to offer. */
  moveAt(key: string): string[] {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y);
    return bed < 0 ? [] : moveTargets(key, this.bedAt(x, y), this.purse(), this.id, this.now(), this.owners().get(bed)?.by ?? null, this.sky());
  }
  /**
   * Move it (lib/town/farm's movePlant), laid on the farm as the database lays it (v273): the two plots emptied, then
   * the plants set in their new places, each write of the farm settling the bed's Quality (lib/town/quality-plant's
   * syncMove). Its owner's every deed in a bed counts as tending it; who helped each plant goes with it.
   */
  moveDo(from: string, to: string): { ok: true; swap: boolean; left: number } | { ok: false; why: MoveRefusal } {
    const [x, y] = from.split(",").map(Number), bed = bedOf(x, y), now = this.now();
    if (bed < 0) return { ok: false, why: "soil" };
    const did = movePlant(from, to, this.bedAt(x, y), this.purse(), this.id, now, this.owners().get(bed)?.by ?? null, this.sky());
    if (!did.ok) return did;
    this.write(FARM, { ...this.farm(), ...Object.fromEntries(Object.keys(did.plots).map((k) => [k, { soil: "tilled", plant: null } as Plot])) });
    this.write(FARM, { ...this.farm(), ...did.plots });
    const beds = this.beds();
    if (beds[bed]?.by === this.id) this.write(BEDS, { ...beds, [bed]: { ...beds[bed], tended: now } });
    const log = this.wellLog(), help = { ...log.help };
    delete help[from]; delete help[to];
    if (log.help[from]) help[to] = log.help[from];
    if (did.swap && log.help[to]) help[from] = log.help[to];
    this.write(WELL_LOG, { ...log, help });
    this.save(did.purse);
    return { ok: true, swap: did.swap, left: did.left };
  }
  /** Send it. (Its water is nobody's, and the plants its member's own: the well's book has nothing to read of it.) */
  /** The insect house (lib/town/insect-house): what the thing in my hand does at a plot with one in mind (set it down, fill a room, lift it), if anything. */
  houseAt(key: string): HouseDeed | null {
    const [x, y] = key.split(",").map(Number);
    return houseDeedFor(key, this.farm(), handOf(this.purse()), this.id, this.owners().get(bedOf(x, y))?.by ?? null, this.now());
  }
  /** Do it. The bed's plants are settled and given what the house gives them now by the farm's one write. */
  houseDo(key: string): { ok: true; deed: HouseDeed } | { ok: false; why: Refusal | HouseRefusal } {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), now = this.now(), plots = this.farm(), hand = handOf(this.purse());
    const did = doHouse(key, plots, this.purse(), this.id, this.owners().get(bed)?.by ?? null, now);
    if (!did.ok) return did;
    this.write(FARM, { ...plots, [key]: did.plot });
    // (its owner's every deed in a bed counts as tending it)
    const beds = this.beds();
    if (beds[bed]?.by === this.id) this.write(BEDS, { ...beds, [bed]: { ...beds[bed], tended: now } });
    this.save(did.purse);
    this.counted({ from: "deed", what: `house_${did.deed}`, thing: did.deed === "room" ? hand : "insectHouse", n: 1, doc: {} });
    return { ok: true, deed: did.deed };
  }
  gnomeDo(key: string): { ok: true; watered: string[] } | { ok: false; why: Refusal | FarmRefusal } {
    const [x, y] = key.split(",").map(Number), bed = bedOf(x, y), now = this.now(), plots = this.farm();
    if (bed < 0) return no("none");
    const did = gnomeWater(bed, this.bedAt(x, y), this.purse(), this.id, now, this.owners().get(bed)?.by ?? null, this.sky());
    if (!did.ok) return did;
    const next = { ...plots }, sky = SKIES.sky(now);
    for (const [k, plot] of Object.entries(did.plots)) next[k] = keptAs(plots[k], plot, now, sky, this.natureNow(now, wellOfKey(k)));
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
  private poured(was: Plot | undefined, next: Plot, now: number, times: number, worn = false, key?: string): Plot {
    const nature = this.natureNow(now, key ? wellOfKey(key) : 0);
    return times > 0 ? pouredAs(was, next, now, hotAt(now, SKIES.sky(now)), nature, this.id, times, worn) : keptAs(was, next, now, SKIES.sky(now), nature);
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
    for (const e of did.each) next[e.key] = this.poured(plots[e.key], did.plots[e.key], now, e.times, this.bellWorn(bed), e.key);
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
    this.save(rememberGardenMisses(did.purse,pourFor(key,keys,plots,p,this.id,now,this.owners().get(bed)?.by??null,this.sky()),"water",plots,this.owners().get(bed)?.by??null,marks,did.each.map(e=>e.key),this.id,now));
    this.bell(bed, did.each.map((e) => e.key), name);
    return { ok: true, done: did.each.map((e) => e.key) };
  }
  /** The ring of shared strength (lib/town/helping's share): give another tester of this browser stamina of mine; both purses are here. */
  ringTo(to: string, far: number, name: string): { ok: true; gave: number; paid: number; left: number } | { ok: false; why: HelpRefusal } {
    if (!to || to === this.id) return { ok: false, why: "none" };
    const other = trialFor(to), did = share(this.purse(), other.purse(), this.id, name || this.id, far, this.now());
    if (!did.ok) return did;
    const bond=sharedMealBond(did.mine,did.theirs,this.id,this.now());other.save(bond.theirs);
    this.save(bond.mine);
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
    for (const [k, plot] of Object.entries(did.plots)) next[k] = keptAs(plots[k], plot, now, sky, this.natureNow(now, wellOfKey(k)));
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
  private natureNow(now: number, i = 0): Nature | null { return natureOf(this.wellWaterOf(i), now); }
  /** A well's water's nature as kept, whether or not it still holds (the first's in the well's book, the second's by itself), and keeping it. */
  private wellWaterOf(i: number): WellWater | null { const log = this.wellLog(); return i === 1 ? log.southWater ?? null : log.wellWater; }
  private keepWellWater(i: number, w: WellWater | null) { this.write(WELL_LOG, { ...this.wellLog(), ...(i === 1 ? { southWater: w } : { wellWater: w }) }); }
  wellWater(i = 0): WellWater | null { const w = this.wellWaterOf(i); return w && natureOf(w, this.now()) ? w : null; }
  drawnNow(): Nature | null { const now = this.now(); return natureAt(now, SKIES.raining(now)); }
  /** For scripts and the test window: the well's water given a nature for so many minutes (as if somebody had poured it in), or none. */
  setWellWater(kind: Nature | null, minutes = 30, i = 0) {
    this.keepWellWater(i, kind ? { kind, until: this.now() + minutes * 60_000, by: this.id } : null);
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
  /* ── the bridge built by hand (lib/town/bridge): the works are everybody's, a stone is in one tester's hands ── */
  private worksKept(): WorksKept {
    return this.read<WorksKept>(WORKS_AT, newWorks, (v) => { const k = v as Partial<WorksKept> | null; return !!k && !!k.works && typeof k.works === "object" && !!k.works[BRIDGE.work] && !!k.carried && typeof k.carried === "object"; });
  }
  /** The works as I am told them (a tester has no name here: the page calls each by what the room calls them). */
  works(): WorksTold { return worksTold(this.worksKept(), this.id, () => ""); }
  /** For scripts: what the next stone I lift has in it (a kind, or null for a plain one), whatever its moment would draw. Once. */
  private marked: string | null | undefined;
  worksMark(kind: string | null) { this.marked = kind; }
  stoneLift(at: [number, number]): { ok: true } | { ok: false; why: BridgeRefusal } {
    const kept = this.worksKept(), now = this.now();
    const did = this.marked === undefined ? stoneLift(this.purse(), kept.carried[this.id] ?? null, workOf(kept, BRIDGE.work), at, this.id, now)
      : stoneLift(this.purse(), kept.carried[this.id] ?? null, workOf(kept, BRIDGE.work), at, this.id, now, luckFor(this.marked));
    if (!did.ok) return did;
    this.marked = undefined;
    this.write(WORKS_AT, { ...kept, carried: { ...kept.carried, [this.id]: did.carried } });
    this.save(did.purse);
    return { ok: true };
  }
  /** Hand the stone I hold on to another tester of this browser. */
  stonePass(to: string): { ok: true } | { ok: false; why: BridgeRefusal } {
    if (!to || to === this.id) return { ok: false, why: "none" };
    const kept = this.worksKept(), mine = kept.carried[this.id] ?? null;
    const did = stonePass(mine, to, trialFor(to).purse(), kept.carried[to] ?? null, workOf(kept, mine?.work ?? BRIDGE.work));
    if (!did.ok) return did;
    const carried = { ...kept.carried, [to]: did.carried };
    delete carried[this.id];
    this.write(WORKS_AT, { ...kept, carried });
    this.tell();
    return { ok: true };
  }
  /** Lay it at the foot: everybody whose hands it went through is counted it, is one of that span's hands, and has a helpers' point for it; and what was in the stone is set in the bridge. */
  stoneLay(at: [number, number]): { ok: true; have: number; spans: number; span: boolean; whole: boolean; into: number; find: string | null } | { ok: false; why: BridgeRefusal } {
    const kept = this.worksKept(), now = this.now(), mine = kept.carried[this.id] ?? null, did = stoneLay(this.purse(), mine, workOf(kept, mine?.work ?? BRIDGE.work), at, now);
    if (!did.ok) return did;
    const carried = { ...kept.carried };
    delete carried[this.id];
    this.write(WORKS_AT, stoneLaid({ ...kept, carried }, mine!.work, mine!.thing, did.hands, did.into, did.find, now));
    for (const h of did.hands) (h === this.id ? this : trialFor(h)).counted({ from: "deed", what: h === this.id ? "stone_lay" : "stone_hand", thing: mine!.thing, n: 1, doc: {} });
    this.save(did.purse);
    return { ok: true, have: did.have, spans: did.spans, span: did.span, whole: did.whole, into: did.into, find: did.find };
  }
  stoneDrop(): { ok: true } | { ok: false; why: BridgeRefusal } {
    const kept = this.worksKept(), mine = kept.carried[this.id] ?? null, did = stoneDrop(mine, workOf(kept, mine?.work ?? BRIDGE.work));
    if (!did.ok) return did;
    const carried = { ...kept.carried };
    delete carried[this.id];
    this.write(WORKS_AT, { ...kept, carried });
    this.tell();
    return { ok: true };
  }
  /** For scripts and the test window: the bridge opened (as its owner opens it, with one line) or closed again; and so many stones laid already (nobody's). */
  worksOpen(open = true) {
    const kept = this.worksKept(), w = kept.works[BRIDGE.work];
    this.write(WORKS_AT, { ...kept, works: { ...kept.works, [BRIDGE.work]: { ...w, opened: open ? w.opened ?? this.now() : null } } });
    this.tell();
  }
  worksHave(have: number) {
    const kept = this.worksKept(), w = kept.works[BRIDGE.work], need = w.needs[BRIDGE.thing], n = Math.max(0, Math.floor(have));
    this.write(WORKS_AT, { ...kept, works: { ...kept.works, [BRIDGE.work]: { ...w, done: need.need !== null && n >= need.need ? w.done ?? this.now() : null, needs: { ...w.needs, [BRIDGE.thing]: { ...need, have: n } } } } });
    this.tell();
  }
  /** For scripts and the test window: the bridge as it was at first: closed, no stone laid, nobody counted, nobody holding one. */
  worksAnew() { this.set(WORKS_AT, null); this.tell(); }

  /* ── the lamp relay (lib/town/lamps): the lamps are everybody's, a flame is in one tester's hands ── */
  private lampsKept(): LampsKept {
    return this.read<LampsKept>(LAMPS_AT, newLamps, (v) => { const k = v as Partial<LampsKept> | null; return !!k && Array.isArray(k.lit) && Array.isArray(k.full) && !!k.flames && typeof k.flames === "object"; });
  }
  /** The lamps as I am told them (a tester has no name here: the page calls each by what the room calls them). */
  lamps(): LampsTold { return lampsTold(this.lampsKept(), this.id, () => "", this.now()); }
  /** Whether a tester carries a stone in both hands (lib/town/bridge): hands that are not empty. */
  private stoneOf(id: string): boolean { return !!this.worksKept().carried[id]; }
  flameTake(map: string, at: [number, number]): { ok: true; until: number } | { ok: false; why: LampRefusal } {
    const kept = this.lampsKept(), now = this.now();
    const did = flameTake(this.purse(), kept.flames[this.id] ?? null, this.stoneOf(this.id), litOf(kept, map, nightOf(now)).length, map, at, this.id, now);
    if (!did.ok) return did;
    this.write(LAMPS_AT, lampHeld(kept, this.id, did.flame));
    this.tell();
    return { ok: true, until: did.flame.until };
  }
  /** Hand the flame I bear on to another tester of this browser: it is fresh again in their hands. */
  flamePass(to: string): { ok: true; until: number } | { ok: false; why: LampRefusal } {
    if (!to || to === this.id) return { ok: false, why: "none" };
    const kept = this.lampsKept(), now = this.now();
    const did = flamePass(kept.flames[this.id] ?? null, to, trialFor(to).purse(), kept.flames[to] ?? null, this.stoneOf(to), now);
    if (!did.ok) return did;
    this.write(LAMPS_AT, lampHeld(kept, to, did.flame, this.id));
    this.tell();
    return { ok: true, until: did.flame.until };
  }
  /** Light a post with it: the post is lit for the night, and everybody whose hands the flame went through has the helpers' points for it. */
  lampLight(map: string, post: number, at: [number, number]): { ok: true; n: number; of: number; full: boolean } | { ok: false; why: LampRefusal } {
    const kept = this.lampsKept(), now = this.now();
    const did = lampLight(this.purse(), kept.flames[this.id] ?? null, litOf(kept, map, nightOf(now)), map, post, at, now);
    if (!did.ok) return did;
    this.write(LAMPS_AT, lampLighted(kept, this.id, map as LampMap, post, did.hands, did.full, now));
    for (const h of did.hands) (h === this.id ? this : trialFor(h)).counted({ from: "deed", what: h === this.id ? "lamp_light" : "lamp_hand", thing: "flame", n: 1, doc: {} });
    this.save(did.purse);
    return { ok: true, n: did.n, of: did.of, full: did.full };
  }
  /** For scripts and the test window: the trial's clock put into tonight if it is day (to nine in the evening). */
  lampsNight() {
    const now = this.now();
    if (nightOf(now) !== null) return;
    this.write(CLOCK, now - Date.now() + (nightBegins(now) - now) + 3.5 * 3_600_000);
    this.tell();
  }
  /** For scripts and the test window: so many of a map's posts lit tonight already, the first so many by their numbers (nobody's flame). */
  lampsLit(map: LampMap, n: number) {
    const kept = this.lampsKept(), now = this.now(), night = nightOf(now);
    if (night === null) return;
    const of = postsOf(map), most = Math.max(0, Math.min(of, Math.floor(n)));
    const lit = [...kept.lit.filter((l) => !(l.night === night && l.map === map)), ...Array.from({ length: most }, (_, post) => ({ night, map, post, at: now, hands: [] as string[] }))];
    const full = kept.full.filter((f) => !(f.night === night && f.map === map));
    this.write(LAMPS_AT, { ...kept, lit, full: most >= of ? [...full, { night, map, at: now }] : full });
    this.tell();
  }
  /** For scripts: a flame in my hands that lives so many seconds from now, whatever the rule says (a check that walks by taps needs longer than five). */
  lampsFlame(secs: number = LAMPS.life, map: LampMap = "farm") {
    this.write(LAMPS_AT, lampHeld(this.lampsKept(), this.id, { from: map, until: this.now() + secs * 1000, hands: [this.id] }));
    this.tell();
  }
  /** For scripts and the test window: the lamps as they were at first: none lit, nobody bearing a flame, no night counted. */
  lampsAnew() { this.set(LAMPS_AT, null); this.tell(); }

  /** For scripts and the test window: so many bucketfuls in the yard's jar (nobody's water). */
  setYardJar(buckets: number) { this.write(YARD_JAR, Math.max(0, Math.floor(buckets))); this.tell(); }
  /** What the thing in my hand can do with water where I stand (by the river, or at the well), if anything; and doing it. */
  choreAt(where: "river" | "well" | null, at?: readonly [number, number] | null): Chore | null { return choreFor(this.purse(), where, this.well(wellAt(at))); }
  choreDo(where: "river" | "well" | null, at?: readonly [number, number] | null): { ok: true; chore: Chore } | { ok: false; why: Refusal } {
    const i = wellAt(at), p = this.purse(), well = this.well(i), now = this.now(), did = chore(p, where, well, now);
    if (!did.ok) return did;
    this.write(wellKey(i), did.well);
    // (the well's book: so many bucketfuls poured, and out of which bucket; a can filled; a bucket drawn, with nobody's hands on its water yet)
    if (did.chore === "pour") this.wellSeen({ by: this.id, at: now, what: "pour", n: did.well - well, can: handOf(p) ?? undefined, well: i });
    else if (did.chore === "fill") this.wellSeen({ by: this.id, at: now, what: "fill", n: well - did.well, can: handOf(p) ?? undefined, well: i });
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
    const rest=this.read<Record<string,{from:number;until:number}>>(WILD_REST,()=>({}),(v)=>!!v&&typeof v==='object'&&!Array.isArray(v)),now=this.now();
    return sights(this.salt(), now, SKIES.rains(), (spot, turn) => { const who = took[`${spot.id}:${turn}`] ?? []; return { n: who.length, mine: who.includes(this.id) }; }, lanternLit(this.purse())).filter(s=>!rest[s.id]||now<rest[s.id].from||now>=rest[s.id].until);
  }
  /** Gather what a place has, from the tile I stand on, with how its game went. Says what came of it, or why not (`lost`: a secret place's games were not both won, and my turn at it is spent). */
  gatherDo(id: number, at: [number, number], went: Outcome): { ok: true; got: Array<[ItemId, number]>; lost?: boolean } | { ok: false; why: Refusal | ForestRefusal | GiftRefusal } {
    const spot = placeAt(id);
    if (!spot) return no("none");
    const now = this.now(), has = holds(this.salt(), spot, now, SKIES.rains()), took = this.took(), key = `${id}:${has?.turn ?? 0}`, who = took[key] ?? [];
    const rest=this.read<Record<string,{from:number;until:number}>>(WILD_REST,()=>({}),(v)=>!!v&&typeof v==='object'&&!Array.isArray(v));
    if(rest[id]&&rest[id].from<=now&&now<rest[id].until)return no("none");
    const did = gather(this.purse(), spot, has, who.length, who.includes(this.id), handOf(this.purse()), at, went, now);
    if (!did.ok) return did;
    // (turns gone by are forgotten: only what the places have now is kept)
    const kept = Object.fromEntries(Object.entries(took).filter(([k]) => { const [s, t] = k.split(":").map(Number), p = placeAt(s); return !!p && t >= turnOf(p, now); }));
    this.write(WILD_TOOK, { ...kept, [key]: [...who, this.id] });
    if(did.rest)this.write(WILD_REST,{...Object.fromEntries(Object.entries(rest).filter(([,r])=>r.until>now)),[id]:did.rest});
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
    if (!bug) return hereFor(this.salt(), h, now, SKIES.rains(), this.backs(), this.hunts(), cloak, h.kind === "garden" ? gardensOf(this.farm(), now, this.sky())(h) : null);
    const turn = bugTurn(h, now);
    return { turn, bug, n: BUGS[bug].n[0], seed: h.id * 100003 + turn };
  }
  /** Every haunt that has an insect for me now. */
  bugs(): BugSight[] {
    const took = this.netted(), now = this.now();
    const mine = (h: Haunt, turn: number) => { const who = took[`${h.id}:${turn}`] ?? []; return { n: who.length, mine: who.includes(this.id) }; };
    const rolled = swarms(this.salt(), now, SKIES.rains(), mine, this.backs(), this.hunts(), wearing(this.purse(), "charmCloak"), gardensOf(this.farm(), now, this.sky())).filter((s) => !this.forced.has(s.id));
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
        // (forging: with a net that carries as much, the one that comes back is of the rare kinds so many times as often)
        const b = comeback(this.salt(), h, now, SKIES.rains(), backs, [Math.random(), Math.random(), Math.random()], hunts, netFx(toolInHand(this.purse())).rare);
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
    this.save(did.purse.professionRewards?.bugApproach?{...did.purse,professionRewards:{...did.purse.professionRewards,bugApproach:null}}:did.purse);
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
    this.save({ ...did.purse, professionRewards: { ...did.purse.professionRewards, bugApproach: null } });
    this.counted({ from: "deed", what: "net", thing: bug, n, doc: {} });
    return { ok: true, got: did.got, first, rid };
  }

  /* ── the well's book (lib/town/well) ── */
  private wellLog(): WellLog {
    // (a log kept before it remembered who helped each plant, or what each did in a round, is given those as empty)
    return { ...newLog(), ...this.read<WellLog>(WELL_LOG, newLog, (v) => { const l = v as Partial<WellLog> | null; return !!l && Array.isArray(l.water) && !!l.cans && !!l.carriers && !!l.days && !!l.reach && !!l.hands; }) };
  }
  private wellSeen(deed: WaterDeed) {
    const before = this.wellLog(), after = seen(before, deed), all = { ...this.linesAll() };
    // The legacy book still counts actual water. Only positive carried deltas award profession XP.
    for (const [who, carrier] of Object.entries(after.carriers)) {
      const previous = before.carriers[who]?.buckets ?? 0, delta = carrier.buckets - previous;
      if (delta <= 0) continue;
      const theirs = { ...(all[who] ?? {}) }, kept = theirs.well ?? { ...newLine(), points: previous };
      theirs.well = countLine(kept, { to: null, line: "well", raw: delta }, dayOf(deed.at));
      all[who] = theirs;
    }
    this.write(LINES_AT, all);
    this.write(WELL_LOG, after);
  }
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
  jarTake(): { ok: true; coins: number; things: JarThing[] } | { ok: false; why: Refusal } {
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
  moonPour(n: number, i = 0): { ok: true; poured: number; into: number; kind: Nature } | { ok: false; why: WellGiftRefusal } {
    const now = this.now(), did = moonPour(this.purse(), this.well(i), n, now);
    if (!did.ok) return did;
    this.write(wellKey(i), did.well);
    if (did.into > 0) this.wellSeen({ by: this.id, at: now, what: "pour", n: did.into, can: "thingMoon", well: i });
    this.keepWellWater(i, pouredIn(this.wellWaterOf(i), did.kind, did.poured, this.id, now, MOON.times));
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
  setWell(buckets: number, i = 0) { this.write(wellKey(i), Math.max(0, Math.min(WATER.well, Math.floor(buckets)))); this.tell(); }
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
    const now = this.now(), before=this.purse(), did = kitchenCooked(before,cookWith(before, things, crew, misses, now, how),misses,now,this.id,crypto.randomUUID());
    if (!did.ok) return did;
    const made = isFind(did.made) ? did.made : null, found = this.found(), first = !!made && !found.includes(made);
    // (a pot cooked while the yard's jar has water takes a bucketful of it, and has a helping more: lib/town/yard)
    const watered = freshen(did.purse, did.made, this.yardJar());
    if (watered.fresh) { this.write(YARD_JAR, watered.jar); this.wellSeen({ by: this.id, at: now, what: "fresh" }); }
    let purse = watered.purse;
    if(purse.professionRewards?.warmJob)purse={...purse,professionRewards:{...purse.professionRewards,warmJob:null}};
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
  rodHook(item: string | null) { return this.keep(fitHook(this.purse(), item)); }
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
      // (v276, v277: as town.work_counted) what a count of points may drop to wear, each a chance of its own
      const dropped = dropsFor(done, c, bangkokMinute(new Date(this.now())) / 60, SKIES.raining(this.now()), Math.random);
      if (dropped.length) {
        const had = this.read<string[]>(dressedKey(who), () => [], Array.isArray), fresh = dropped.filter((w) => !had.includes(w));
        if (fresh.length) this.write(dressedKey(who), [...had, ...fresh]);
      }
    }
    this.write(LINES_AT, all);
  }
  /** Everybody's worn title, by member. */
  private worn(): Record<string, Worn> {
    const kept = this.read<Record<string, unknown>>(TITLES, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v));
    return Object.fromEntries(Object.entries(kept).flatMap(([id, w]) => { const worn = wornOf(w); return worn ? [[id, worn]] : []; }));
  }
  /**
   * Profession XP and its remaining allowance; the separate well book keeps actual bucketfuls.
   */
  lines(): LinesTold {
    const told = noLines(), mine = this.linesAll()[this.id] ?? {}, day = dayOf(this.now()), log = this.wellLog();
    for (const id of ALL_LINE_IDS) {
      const k = mine[id] ?? newLine(), today = k.day === day ? k.today : 0;
      told.lines[id] = { points: k.points, today, bound: LINES[id].day,
        earned: earnedOn(id, k, day),
        full: id === "farming" ? harvestReserve(k, day) : Math.max(0, LINES[id].day - today) };
    }
    if (!mine.well) told.lines.well = { points: log.carriers[this.id]?.buckets ?? 0, today: log.days[String(day)]?.[this.id]?.buckets ?? 0 };
    // (lines to come: the trial gives every later line)
    return { ...told, worn: this.worn()[this.id] ?? null, given: [...MORE_LINE_IDS] };
  }
  /** Wear a title I have earned under my name, or none (null). */
  titleWear(worn: Worn | null): { ok: true } | { ok: false; why: Refusal } {
    const all = { ...this.worn() };
    if (worn === null) delete all[this.id];
    else {
      const points = Object.fromEntries(ALL_LINE_IDS.map((id) => [id, this.lines().lines[id].points]));
      if (!mayWear(points, worn.line, worn.rank)) return no("none");
      all[this.id] = { line: worn.line, rank: worn.rank };
    }
    this.write(TITLES, all);
    this.tell();
    return { ok: true };
  }
  /** Take the gift of a rank I have reached on a line (lib/town/gifts): once, into no bag. */
  giftTake(line: string, rank: number): { ok: true; gift: GiftId } | { ok: false; why: GiftRefusal } {
    const points = Object.fromEntries(ALL_LINE_IDS.map((id) => [id, this.lines().lines[id].points]));
    const did = takeRankGift(this.purse(), points, line, rank);
    if (!did.ok) return did;
    this.save(did.purse);
    return { ok: true, gift: did.gift };
  }
  /** For trying things out: every gift there is in my purse at once, whatever my ranks (or none of them, and nothing worn); or only the ones named, what is worn and follows kept where it is still had. */
  setGifts(all: boolean | readonly string[]) {
    const p = this.purse();
    if (Array.isArray(all)) {
      const had = ALL_GIFTS.map((g) => g.id).filter((id) => all.includes(id)), was = giftsOf(p);
      this.save({ ...p, gifts: { ...was, had, charms: was.charms.filter((id) => had.includes(id)), familiar: was.familiar && had.includes(was.familiar) ? was.familiar : null } });
      return;
    }
    this.save({ ...p, gifts: all ? { ...giftsOf(p), had: ALL_GIFTS.map((g) => g.id) } : { had: [], charms: [] } });
  }
  /** Wear these charms and no others (none: take them all off). */
  charmsWear(ids: readonly string[]): { ok: true } | { ok: false; why: GiftRefusal } {
    const before=this.purse();
    const did = wearCharms(before, ids);
    if (!did.ok) return did;
    this.save(comboLoadout(before)===comboLoadout(did.purse)?did.purse:{...did.purse,comboEpoch:(before.comboEpoch??0)+1});
    return { ok: true };
  }
  /** Have this familiar follow me and no other (null: none follows). */
  familiarWear(id: string | null): { ok: true } | { ok: false; why: GiftRefusal } {
    const before=this.purse();
    const did = wearFamiliar(before, id);
    if (!did.ok) return did;
    this.save(comboLoadout(before)===comboLoadout(did.purse)?did.purse:{...did.purse,comboEpoch:(before.comboEpoch??0)+1});
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
  private shopDeal(who: string, item: ItemId, n: number, at: [number, number], how: typeof Shops.buy, grade: 0 | 1 | 2 | 3) {
    const all = this.shopsKept(), raw = this.get(purseKey(who));
    if (raw === null) return { ok: false as const, why: "shut" as const };
    const did = how(this.purse(), JSON.parse(raw) as Purse, all[who], this.id, item, n, at, this.now(), undefined, grade);
    if (!did.ok) return did;
    // (the other's purse is in this browser too: both are written here)
    this.write(purseKey(who), did.theirs);
    this.write(SHOPS, { ...all, [who]: did.shop });
    this.save(did.mine);
    return { ok: true as const, coins: did.coins };
  }
  /** Buy at somebody's stall, or bring it what it wants, from the tile I stand on. */
  shopBuy(who: string, item: ItemId, n: number, at: [number, number], grade: 0 | 1 | 2 | 3 = 0) { return this.shopDeal(who, item, n, at, Shops.buy, grade); }
  shopSell(who: string, item: ItemId, n: number, at: [number, number], grade: 0 | 1 | 2 | 3 = 0) { return this.shopDeal(who, item, n, at, Shops.sell, grade); }

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
  /* ── felling: the mountain's trees are everybody's, so the browser's ── */
  // ── felling ──
  private grove(): Grove { return treesTidied(groveOf(this.read<unknown>(TREES_AT, newGrove, (v) => !!v && typeof v === "object")), this.now()); }
  /** The trees as I am told them: every one that is not grown, and those half cut. */
  trees(): TreesTold { return treesTold(this.grove(), this.purse(), this.now()); }
  /** Walk up to a tree with an axe in the hand: the game that fells it, or the state that refuses it. Its trees are held for me from now, for as long as a go is held: nobody else's board or press takes on them meanwhile. */
  fellBegin(tree: number, at: [number, number],direction?:import("./reward-domino").DominoDirection): { ok: true; trees: number[]; ask: FellingAsk; elder: boolean } | { ok: false; why: Refusal | TreeRefusal | GiftRefusal } {
    const grove = this.grove(), did = fellBegin(this.purse(), grove, tree, at, this.now(), this.fellSeed ?? Math.floor(Math.random() * 2 ** 31), undefined, this.id,direction);
    if(did.ok){const opened=fellOpened(grove,this.id,did.trees,this.now(),direction);opened.goes![this.id].comboLoadout=comboLoadout(this.purse());this.write(TREES_AT,opened);}
    return did;
  }
  /**
   * A go at felling as it was played: every tree that fell is a stump for the whole browser, and
   * its wood is in my bag. Whoever braced the trunk has their log, into their own bag (their purse is in this browser too).
   */
  fellDo(went: FellWent, at: [number, number], name = ""): ({ ok: true } & FellDid) | { ok: false; why: Refusal | TreeRefusal | GiftRefusal } {
    const luck = Array.from({ length: Math.max(3,TREE_KNOBS.echo.trees) }, (): FellLuck => this.fellLuck ?? { dark: Math.random(), scent: Math.random(), which: Math.random(), chain: Math.random(), keep: Math.random(), kind: Math.random() });
    const before=this.purse(),grove=this.grove(),t=this.now(),did=fell(before,grove,this.id,went,at,t,luck,undefined,name||this.id);
    if (!did.ok) return did;
    this.write(TREES_AT, did.grove);
    this.save(rootAfterFell(before,did,went.grain,at,t,grove.goes?.[this.id]?.comboLoadout));
    const raw = did.braced ? this.get(purseKey(did.braced)) : null;
    if (did.braced && raw !== null) this.write(purseKey(did.braced), bracePay(JSON.parse(raw) as Purse).purse);
    did.felled.forEach((f, i) => this.counted({ from: "deed", what: "fell", thing: f.kind, n: 1, doc: { tree: f.id, misses: f.misses, girth: f.girth, timber: f.timber, ...(did.plain ? { how: "plain" } : did.one ? { how: "one" } : {}), ...(f.keepsake ? { keepsake: f.keepsake } : {}), ...(i === 0 && did.braced ? { braced: did.braced } : {}) } }));
    // (a tree felled may be the village's tinder)
    const fire = did.felled.length ? this.fireFound("tinder", name) : null;
    return { ok: true, felled: did.felled, got: did.got, one: did.one, plain: did.plain, through: did.through, stood: did.stood, found: did.found, braced: did.braced, ...(fire ? { fire } : {}) };
  }
  /** Brace the trunk of somebody's open go, from the tile I stand on (their go is in this browser too). */
  fellBrace(feller: string, at: [number, number]): { ok: true; tree: number } | { ok: false; why: Refusal | TreeRefusal | GiftRefusal } {
    const did = braceGo(this.grove(), this.id, feller, at, this.now());
    if (!did.ok) return did;
    this.write(TREES_AT, did.grove);
    return { ok: true, tree: did.tree };
  }
  /** The stump I just made, grown again at once for the whole browser (an axe's own, counted by the day). */
  fellRoot(tree: number): { ok: true; left: number } | { ok: false; why: Refusal | TreeRefusal | GiftRefusal } {
    const did = rootBack(this.purse(), this.grove(), this.id, tree, this.now());
    if (!did.ok) return did;
    this.write(TREES_AT, did.grove);
    this.save(did.purse);
    return { ok: true, left: did.left };
  }
  /** For scripts trying things out: a tree as if it had been felled so many minutes ago by somebody (null: grown again); every tree grown again; a tree left half cut or whole. */
  setTree(id: number, minutesAgo: number | null, by = "somebody") {
    const g = this.grove(), down = { ...g.down };
    if (minutesAgo === null) delete down[id]; else down[id] = { at: this.now() - minutesAgo * 60_000, by };
    this.write(TREES_AT, { ...g, down });
    this.tell();
  }
  setTrees(grove: Grove | null) { this.write(TREES_AT, grove ?? newGrove()); this.tell(); }
  setHalf(id: number, half: boolean) { const g = this.grove(); this.write(TREES_AT, { ...g, half: half ? [...new Set([...g.half, id])] : g.half.filter((x) => x !== id) }); this.tell(); }
  /** For scripts: the numbers of chance a go is judged by, and the seed its trunks are made from, in place of chance (in this tab; null: chance again). */
  private fellLuck: FellLuck | null = null;
  private fellSeed: number | null = null;
  setFellLuck(luck: FellLuck | null) { this.fellLuck = luck; }
  setFellSeed(seed: number | null) { this.fellSeed = seed; }
  /** For scripts: so many uses of a tool's counted option made already in a stretch (lib/town/powers). */
  setPower(id: string, n: number, k: number) { const p = this.purse(); this.save({ ...p, powers: { ...(p.powers ?? {}), [id]: { k, n: Math.max(0, Math.floor(n)) } } }); }
  // ── end: felling ──
  /** Throw away what is in a slot (to make room). */
  drop(slot: number) { const p = this.purse(); this.save({ ...p, bag: p.bag.map((b, i) => (i === slot ? null : b)) }); }
  /** For scripts trying things out: put something in the bag, as much of it as fits, and coins in the purse. */
  grant(item: ItemId, n: number, coins = 0) {
    const p = this.purse();
    this.save({ ...p, coins: p.coins + coins, bag: put(p.bag, item, Math.min(n, roomFor(p.bag, item))) });
  }

  /* ── forging: the smith (lib/town/forge). What each tester has there is kept by tester; the board and the log are the browser's. ── */
  private smithLuck: number[] | null = null;
  /** For scripts trying things out: the numbers of chance the next tries and draws are read from, each used once and the last for good (in this tab; null: by chance). */
  setSmithLuck(luck: number[] | null) { this.smithLuck = luck && luck.length ? [...luck] : null; }
  private smithChance(): number { const l = this.smithLuck; return l ? (l.length > 1 ? l.shift()! : l[0]) : Math.random(); }
  smithy(): Smithy { return soundSmithy(this.read<unknown>(smithKey(this.id), newSmithy, (v) => !!v && typeof v === "object")); }
  smithBoard(): SmithBoard {
    const b = this.read<Partial<SmithBoard>>(SMITH_BOARD, newBoard, (v) => !!v && typeof v === "object" && !Array.isArray(v));
    return { tops: b.tops ?? {}, found: b.found ?? {} };
  }
  /** Every try made in this browser, the newest last: the failed ones too. */
  smithLog(): TryLogged[] { return this.read<TryLogged[]>(SMITH_LOG, () => [], Array.isArray); }
  smith() { return { smithy: this.smithy(), board: this.smithBoard() }; }
  /** Keep what a deed at the smith gave back: my purse and what I have there, whichever it changed. */
  private smithKeep<T extends { ok: boolean; purse?: Purse; smithy?: Smithy }>(did: T): T {
    if (did.ok) {
      if (did.smithy) this.write(smithKey(this.id), did.smithy);
      if (did.purse) this.write(purseKey(this.id), did.purse);
      this.tell();
    }
    return did;
  }
  smithSmelt(piece: ItemId, n: number) { return this.smithKeep(smelt(this.purse(), this.smithy(), piece, n, this.now())); }
  smithTake() { return this.smithKeep(collectSmelted(this.purse(), this.smithy(), this.now())); }
  smithWiden() { return this.smithKeep(widen(this.purse(), this.smithy())); }
  /** Who of these testers has a piece smelting now, and how many presses of the bellows that piece may still take. */
  smithNear(ids: string[]) {
    const now = this.now();
    return ids.filter((id) => id !== this.id).flatMap((id) => {
      const theirs = trialFor(id).smithy(), piece = smithView(theirs, now).now;
      return piece ? [{ id, piece, left: bellowsLeft(theirs, now) }] : [];
    });
  }
  smithBellows(whose: string): SmithDid<{ off: number }> {
    const did = bellows(trialFor(whose).smithy(), whose, this.id, this.now());
    if (!did.ok) return did;
    this.write(smithKey(whose), did.smithy);
    this.counted({ from: "deed", what: "bellows", thing: null, n: 1, doc: { whose } });
    this.tell();
    return { ok: true, off: did.off };
  }
  /* ── the great fire (lib/town/great-fire): the village's, so the browser's like the board ── */
  private greatFire(): GreatFire { return soundGreatFire(this.read<unknown>(SMITH_FIRE, newGreatFire, (v) => !!v && typeof v === "object" && !Array.isArray(v))); }
  /** What I may be told of the great fire. */
  fire() { return fireTold({ ...this.greatFire(), used: { [this.id]: this.purse().forgeDay ?? -1 } }, this.id, this.now()); }
  /** Whether my bag holds a tool that stands one level under the top: the row is for those who have one. */
  private underTop(): boolean { return this.purse().bag.some((s) => !!s && !!toolKindOf(s.item) && levelOf(s) === FORGE.top - 1); }
  fireJoin(name: string): { ok: true } | { ok: false; why: SmithRefusal } {
    const did = joinRow({ ...this.greatFire(), used: { [this.id]: this.purse().forgeDay ?? -1 } }, { id: this.id, name }, this.underTop(), this.now());
    if (!did.ok) return { ok: false, why: did.why };
    this.write(SMITH_FIRE, did.fire);
    this.tell();
    return { ok: true };
  }
  fireLeave(): { ok: true } | { ok: false; why: SmithRefusal } {
    const did = leaveRow(this.greatFire(), this.id);
    if (!did.ok) return { ok: false, why: "none" };
    this.write(SMITH_FIRE, did.fire);
    this.tell();
    return { ok: true };
  }
  /** A half found by a deed of mine, if its time has come and nobody has found it: kept, and told to whoever asks. */
  private fireFound(half: Half, name: string): { half: Half; lit: boolean } | null {
    const did = halfFound(this.greatFire(), half, { id: this.id, name: name || this.id }, this.now());
    if (!did.found) return null;
    this.write(SMITH_FIRE, did.fire);
    this.tell();
    return { half, lit: did.lit };
  }
  /** For scripts trying things out: its time has come (both halves gone, so the next rock and tree find them); both halves found by me now; so many made-up members before me in the row; a fresh fire. */
  fireDue() { this.write(SMITH_FIRE, { ...this.greatFire(), due: 0, flint: null, tinder: null }); this.tell(); }
  fireLight(name = "ทดสอบ") { const at = this.now(), f = this.greatFire(); this.write(SMITH_FIRE, { ...f, flint: { id: this.id, name, at }, tinder: { id: this.id, name, at } }); this.tell(); }
  fireRow(n: number, name = "ทดสอบ") {
    const f = this.greatFire(), at = this.now(), mine = f.row.find((w) => w.id === this.id) ?? { id: this.id, name, since: at };
    const fakes = Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => ({ id: `fake${i + 1}`, name: `ทดสอบ ${i + 1}`, since: at }));
    const rest = f.row.filter((w) => w.id !== this.id && !/^fake\d+$/.test(w.id));
    this.write(SMITH_FIRE, { ...f, row: [...fakes, mine, ...rest] });
    this.tell();
  }
  fireReset() {
    this.write(SMITH_FIRE, newGreatFire());
    const { forgeDay: _day, ...purse } = this.purse();
    this.smithKeep({ ok: true as const, purse });
    this.tell();
  }
  smithTry(slot: number, name: string) {
    // (a tool one level under the top is tried only with the great fire: asked before anything is taken)
    const held = this.purse().bag[slot], needs = !!held && !!toolKindOf(held.item) && levelOf(held) === FORGE.top - 1;
    if (needs) { const why = fireWhy({ ...this.greatFire(), used: { [this.id]: this.purse().forgeDay ?? -1 } }, this.id, this.now()); if (why) return { ok: false as const, why }; }
    const did = this.smithKeep(forgeTry(this.purse(), this.smithy(), slot, this.smithChance(), name));
    if (did.ok && needs) {
      this.save({ ...this.purse(), forgeDay: dayOf(this.now()) });
      this.write(SMITH_FIRE, fireSpent(this.greatFire(), { id: this.id, name }, did.out, this.now()));
    }
    if (did.ok) {
      // (every try is written down, whatever came of it; and the first of a kind at the top goes on the board)
      const now = this.now();
      this.write(SMITH_LOG, [...this.smithLog(), { by: this.id, name, item: did.item, from: did.from, to: did.from + 1, out: did.out, level: did.level, at: now }].slice(-500));
      if (did.level >= FORGE.top) this.write(SMITH_BOARD, markTop(this.smithBoard(), did.item, { id: this.id, name }, now));
      this.tell();
    }
    return did;
  }
  smithDraw(slot: number) { return this.smithKeep(drawOptions(this.purse(), this.smithy(), slot, this.smithChance(), this.smithChance())); }
  smithChoose(slot: number, pick: string, name: string) {
    const did = this.smithKeep(chooseOption(this.purse(), this.smithy(), slot, pick));
    if (did.ok) { this.write(SMITH_BOARD, markFound(this.smithBoard(), did.opt as OptionId, { id: this.id, name }, this.now())); this.tell(); }
    return did;
  }
  smithRedraw(slot: number, at: number, gem: ItemId) { return this.smithKeep(redrawOption(this.purse(), this.smithy(), slot, at, gem, this.smithChance(), this.smithChance())); }
  smithGem(slot: number, gem: ItemId | null, socket = 0) { return this.smithKeep(setGem(this.purse(), slot, gem, socket)); }
  /**
   * Two tools of my bag trade what the smith put into them. The trial takes the page's word for where I stand and
   * whether a game's board is open (it is the browser's own keeper); nothing goes on the board and no try is logged.
   */
  smithMove(from: number, to: number, how: { at: [number, number] | null; playing: boolean }) {
    const near = !!how.at && bySmith(how.at[0] + 0.5, how.at[1] + 0.5);
    const did = this.smithKeep(moveForging(this.purse(), this.smithy(), from, to, { near, playing: !!how.playing, now: this.now() }));
    return did.ok ? { ok: true as const, fee: did.fee, spilt: did.spilt } : did;
  }
  // ── mining ──
  /* ── the mountain's rocks and the cave (lib/town/mining, cave-state): rocks, ways down and torches are everybody's, so the browser's ── */
  private caveKept(): CaveState { return caveAt(this.read<unknown>(CAVE_KEPT, () => null, () => true), this.now()); }
  /** A place's rocks as they are laid on a day, in the world's tiles (0: the mountain's foot). */
  private rocksAt(floor: number, day: number): RockAt[] { return floor === 0 ? MOUNTAIN_ROCKS.map((r) => ({ id: r.id, x: r.x, y: r.y, look: r.look })) : floorRocks(floor, day); }
  /** The day's crystal rock, and what is known of a place for the rolls: which rock hides the way down (none once it is open), which is the crystal (none once it is broken). */
  private crystalToday(day: number) { return crystalOf(this.salt(), day, (n) => floorRocks(n, day)); }
  private todayAt(floor: number, s: CaveState): PlaceToday {
    if (floor <= 0) return { way: null, crystal: null };
    const c = this.crystalToday(s.day), mine = c && c.floor === floor ? c.rock : null;
    return { way: s.ways[String(floor)] ? null : wayRockOf(this.salt(), floor, s.day, floorRocks(floor, s.day), mine), crystal: s.crystal ? null : mine };
  }
  private fates(): Record<string, string> { return this.read<Record<string, string>>(MINE_FATE, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v)); }
  private mineLuck(): { shards?: number | null; chain?: number | null } { return this.read<{ shards?: number | null; chain?: number | null }>(MINE_LUCK, () => ({}), (v) => !!v && typeof v === "object" && !Array.isArray(v)); }
  /** What a rock holds when a script has said so, or holds a chance: in the roll's place. */
  private fateAt(floor: number, turn: number, today: PlaceToday, pick: Parameters<typeof holdsOf>[5]) {
    const fates = this.fates(), luck = this.mineLuck().shards;
    return (rock: number): Holds | null => {
      const said = fates[`${floor}:${rock}`];
      if (said) {
        const [what, seed] = said.split(":"), n = Number(seed) || 20261008;
        return what === "stone" ? { kind: "stone", shards: 0 } : what === "shards" ? { kind: "stone", shards: 2 } : what === "moss" ? { kind: "stone", shards: 0, moss: true } : what === "vein" ? { kind: "vein", gem: false, seed: n }
          : what === "gem" ? { kind: "vein", gem: true, seed: n } : what === "way" ? { kind: "way", shards: 0 } : what === "crystal" ? { kind: "crystal" } : null;
      }
      if (typeof luck !== "number") return null;
      const h = holdsOf(this.salt(), floor, rock, turn, today, pick), odds = floor > 0 ? MINING.cave : MINING.foot;
      return h.kind === "stone" ? { kind: "stone", shards: luck < odds.shard ? odds.n[1] : 0, ...(h.moss ? { moss: true } : {}) } : h;
    };
  }
  /** A deed at the mine written down (the trial keeps its newest hundred, for scripts), and counted on its line. */
  private mineDeed(what: string, thing: string | null, n: number, doc: Record<string, unknown>) {
    const all = this.mineDeeds();
    this.write(mineDeedsKey(this.id), [...all, { what, thing, n, doc, at: this.now() }].slice(-100));
    this.counted({ from: "deed", what, thing, n, doc });
  }
  mineDeeds(): MineDeed[] { return this.read<MineDeed[]>(mineDeedsKey(this.id), () => [], Array.isArray); }
  /**
   * A deed at the mine written down for whoever it is theirs (the one who struck first a rock that I broke for them, or
   * somebody whose swings went into a rock that broke): in their own list, and counted on their own lines. Everybody's
   * are in this browser.
   */
  private mineDeedFor(who: string, what: string, thing: string | null, n: number, doc: Record<string, unknown>) {
    if (who === this.id) { this.mineDeed(what, thing, n, doc); return; }
    const all = this.read<MineDeed[]>(mineDeedsKey(who), () => [], Array.isArray);
    this.write(mineDeedsKey(who), [...all, { what, thing, n, doc, at: this.now() }].slice(-100));
    const counts = countsOf({ from: "deed", what, thing, n, doc }, who);
    if (!counts.length) return;
    const lines = { ...this.linesAll() }, day = dayOf(this.now()), theirs = { ...(lines[who] ?? {}) };
    for (const c of counts) theirs[c.line] = countLine(theirs[c.line] ?? newLine(), c, day);
    lines[who] = theirs;
    this.write(LINES_AT, lines);
  }
  /** What I am told of the cave, on the floor and the tile I say I am on. */
  cave(floor = 0, at: [number, number] | null = null): CaveTold {
    const now = this.now(), s = this.caveKept(), p = this.purse(), kept = mineOf(p), pick = pickOf(p), turn = mineTurn(now), c = this.crystalToday(s.day);
    const gone: Record<string, number[]> = {};
    for (let f = 0; f <= MINING.floors; f++) {
      const ids = goneAt(s, f, now);
      if (s.crystal && c && c.floor === f && !ids.includes(c.rock)) ids.push(c.rock);
      if (ids.length) gone[String(f)] = ids;
    }
    // (a light gem: the rocks that hide a vein glint, within its reach of where I stand)
    const reach = toolHas(pick, "pkGleam") ? ALL : gemBy(pick, "light", GEM_FX.light.pick.glint), glints: number[] = [];
    if (reach > 0 && floor > 0 && at) {
      const today = this.todayAt(floor, s), fate = this.fateAt(floor, turn, today, pick);
      for (const r of floorRocks(floor, s.day)) {
        if (gone[String(floor)]?.includes(r.id) || (reach < ALL && Math.hypot(r.x - at[0], r.y - at[1]) > reach)) continue;
        if ((fate(r.id) ?? holdsOf(this.salt(), floor, r.id, turn, today, pick)).kind === "vein") glints.push(r.id);
      }
    }
    const [lf, lt] = kept.loose.k.split(":").map(Number);
    return {
      day: s.day, turn, again: changesAt(s, now), gone,
      ways: Object.fromEntries(Object.entries(s.ways).map(([f, w]) => [f, { x: w.x, y: w.y, rock: w.rock, name: w.name }])),
      torches: s.torches.filter((t) => t.until > now), moss: s.moss.filter((m) => m.until > now), deepest: caveBoardOf(s),
      rests: kept.rests, vein: kept.vein, loose: lt === turn && kept.loose.ids.length ? { floor: lf, ids: kept.loose.ids } : null, glints,
      place: floor, struck: struckTold(s, floor, this.id, now), paid: kept.paid,
      crystal: !c || s.crystal ? null : floor === c.floor ? { floor: c.floor, rock: c.rock } : pick && toolHas(pick, "pkGleam") ? { floor: c.floor, rock: null } : null,
    };
  }
  /**
   * Strike a rock of a place from the tile I stand on, with the swings I have made since I last said. They add up
   * with anybody's (the rock's tally is everybody's, so the browser's), and the rock breaks when it is struck whole
   * away: what it leaves is for whoever struck it first, I or another (their purse is in this browser too), and
   * whoever else struck some of it away is written down as having lent a hand.
   */
  mineDo(floor: number, rock: number, at: [number, number], swings: number, name: string, how?: "quake"):
    { ok: true; got: Array<[ItemId, number]>; broke: number[]; way: boolean; vein: PendingVein | null; crystal: boolean; chained: number | null; cost: number; part?: number; helped?: boolean; whose?: string | null; paid?: string | null; waits?: boolean; moss?: boolean; fire?: { half: "flint" | "tinder"; lit: boolean } } | { ok: false; why: MineRefusal } {
    const now = this.now(), s = this.caveKept(), rocks = this.rocksAt(floor, s.day), today = this.todayAt(floor, s), before = this.purse(), pick = pickOf(before);
    const c = this.crystalToday(s.day), crystal = c && c.floor === floor ? c.rock : null, element = elementOf(this.salt(), floor, s.day);
    const go: MineGo = {
      now, floor, rock, at, swings, rocks, standing: (id) => stands(s, floor, id, now, crystal), salt: this.salt(), day: s.day, today, element,
      points: this.lines().lines.mining.points, quake: how === "quake", fate: this.fateAt(floor, mineTurn(now), today, pick), chain: this.mineLuck().chain ?? null,
      who: this.id, name: name || this.id, struck: (id) => struckAt(s, floor, id, now),
    };
    const did = mine(before, go);
    if (!did.ok) return did;
    const nothing = { got: [] as Array<[ItemId, number]>, broke: [] as number[], way: false, vein: null, crystal: false, chained: null, cost: 0 };
    const first = did.struck.first, theirs = first === this.id ? null : did.struck.name || first;
    if (did.done === false) {
      // my swings went into it, and it still stands
      this.write(CAVE_KEPT, strikeRock(s, floor, rock, did.struck, now));
      this.save(did.purse);
      return { ok: true, ...nothing, part: did.part, whose: theirs };
    }
    let paid: Mined;
    if (did.done === "theirs") {
      // somebody else struck it first: it is they who are paid, as if they had broken it
      const raw = this.get(purseKey(first)), purse = raw === null ? null : JSON.parse(raw) as Purse;
      const got = purse ? payFirst(purse, { ...go, fate: this.fateAt(floor, mineTurn(now), today, anyPick(purse)) }, did.struck) : null;
      if (!got || !got.ok) {
        // (they cannot take what it leaves just now: it waits for them, struck whole away, with my swings in it)
        this.write(CAVE_KEPT, strikeRock(s, floor, rock, did.struck, now));
        this.save(did.purse);
        return { ok: true, ...nothing, part: 1, waits: true, whose: theirs };
      }
      paid = got;
      this.write(purseKey(first), got.purse);
    } else paid = did;
    let next = breakRocks(s, floor, paid.broke, now);
    const way = paid.way;
    if (way !== null) { const r = rocks.find((x) => x.id === way)!; next = openWay(next, floor, { rock: r.id, x: r.x, y: r.y, by: first, name: did.struck.name || first, at: now }); }
    if (paid.crystal) next = crystalBroken(next, { by: first, name: did.struck.name || first, at: now });
    // (moss let out of a rock glows where the rock stood, for everybody)
    for (const id of paid.moss) { const r = rocks.find((x) => x.id === id); if (r && floor > 0) next = setMoss(next, floor, r.x, r.y, first, now); }
    this.write(CAVE_KEPT, next);
    this.save(did.purse);
    const helpers = helpersOf(did.struck);
    for (const e of paid.each) {
      const doc = {
        floor, rock: e.rock, swings, ...(paid.spent ? { spent: true } : {}), ...(e.rock === paid.chained ? { chained: true } : {}), ...(how ? { how } : {}), hand: "pick",
        ...(e.rock === rock && first !== this.id ? { by: this.id } : {}), ...(e.rock === rock && helpers.length ? { with: helpers } : {}),
      };
      if (e.kind === "crystal") this.mineDeedFor(first, "crystal", "stone", 1, { ...doc, got: ORES[ORES.length - 1].shard, chip: GEMS[element].chip });
      else this.mineDeedFor(first, "mine", "stone", 1, { ...doc, ...(e.shards ? { got: oreOf(floor), shards: e.shards } : {}), ...(e.kind === "vein" ? { vein: true } : {}), ...(paid.moss.includes(e.rock) ? { moss: true } : {}) });
    }
    if (way !== null) this.mineDeedFor(first, "delve", null, 1, { floor, rock: way });
    for (const id of helpers) this.mineDeedFor(id, "hew", "stone", 1, { floor, rock, whose: first });
    this.tell();
    // (a plain rock broken by this call may be the village's flint: not the day's crystal rock)
    const fire = first === this.id && paid.each.some((e) => e.kind !== "crystal") ? this.fireFound("flint", name) : null;
    return first === this.id
      ? { ok: true, got: paid.got, broke: paid.broke, way: way !== null, vein: paid.vein, crystal: paid.crystal, chained: paid.chained, cost: paid.cost, part: 1, moss: paid.moss.length > 0, ...(fire ? { fire } : {}) }
      : { ok: true, ...nothing, broke: paid.broke, way: way !== null, crystal: paid.crystal, chained: paid.chained, part: 1, helped: true, whose: theirs, paid: first, moss: paid.moss.length > 0 };
  }
  springs(){return this.read<Record<string,RewardSpring>>("cashtown.trial.springs",()=>({}),v=>!!v&&typeof v==="object");}
  springsLook(){this.tell();}
  boats(){return this.read<Record<string,LotusBoat>>("cashtown.trial.boats",()=>({}),v=>!!v&&typeof v==="object");}
  boatFishingBusy(who:string,until:number|null){const rows=this.boatLines();if(until===null)delete rows[who];else rows[who]=until;this.write("cashtown.trial.boat-lines",rows);}
  boatLines(){return this.read<Record<string,number>>("cashtown.trial.boat-lines",()=>({}),v=>!!v&&typeof v==="object");}
  bridges(){return this.read<Record<string,TemporaryCrossing>>("cashtown.trial.bridges",()=>({}),v=>!!v&&typeof v==="object");}
  /** What a rock holds, for a pick that sees it. */
  rewardDo(input: RewardInput, request: string,correction?:ResourceCorrection,fishPool:FishPool=[],preview?:import("./reward-domino").DominoPreview): ({ ok: true } & RewardReply) | { ok: false; why: Refusal | GiftRefusal | "far" | "theirs" } {
    const now=this.now(), key=`cashtown.trial.rewards.${this.id}`;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request) || !input || !Array.isArray(input.at) || input.at.length!==2 || !input.at.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=10000)) return {ok:false,why:"none"};
    type Receipt = { request:string; command:string; reply:RewardReply; at:number };
    const receipts=this.read<Receipt[]>(key,()=>[],Array.isArray), command=JSON.stringify(input), old=receipts.find(r=>r.request===request);
    if (old) return old.command===command ? {ok:true,...old.reply} : {ok:false,why:"none"};
    const coupon=consumeCampRetry(this.purse(),input,now);if(!coupon.ok)return coupon;const p=coupon.purse;
    let did:ReturnType<typeof scanMineral>|ReturnType<typeof fieldProcess>|ReturnType<typeof beginTrail>|ReturnType<typeof startSchool>|ReturnType<typeof portableLift>;
    if(input.action==="rescueLook"||input.action==="rescueAsk"||input.action==="rescueBegin"||input.action==="rescueEnd"||input.action==="rescueCancel"){const target=input.target===this.id?p:input.target?trialFor(input.target).purse():undefined,offers=Object.fromEntries([...new Set([this.id,...Object.keys(this.linesAll())])].map(who=>[who,trialFor(who).purse()]));const d=rescueAction(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],this.id,target,Object.entries(offers).map(([who,q])=>rescueOffer(q,who,now,input.at)).filter((o):o is NonNullable<typeof o>=>!!o).slice(0,20));if(!d.ok)return d;if("targetPurse"in d&&d.targetPurse&&input.target)trialFor(input.target).save(d.targetPurse);const {targetPurse:_,...reply}=d as typeof d&{targetPurse?:Purse};did=reply;
    }else if(input.action==="campFlag"){const camps=this.camps(),d=plantCampFlag(p,input.site,input.line,input.at,camps.find(c=>c.site===input.site)??null,this.id,now);if(!d.ok)return d;const next=[...camps.filter(c=>c.site!==input.site),d.camp];this.write("cashtown.trial.camps.1",next);did={ok:true,purse:d.purse,camps:next};
    }else if(input.action==="rootExtractBegin"||input.action==="rootExtractEnd"||input.action==="rootExtractCancel"){const g=this.grove(),source=p.professionRewards?.rootSource,d=rootExtraction(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],matchesCombo(p,["charmEchoAxe","famPiglet"]),comboLoadout(p),!!source&&partReady(g.parts,source.tree,"root",now));if(!d.ok)return d;if(input.action==="rootExtractBegin"){if(p.combos?.actions?.[`root:${source!.key}`])return{ok:false,why:"none"};const bond=commitCombo(d.purse,"SC10",`root:${source!.key}`,now);if(!bond)return{ok:false,why:"spent"};d.purse=bond.purse;}if(d.got?.length&&source)this.write(TREES_AT,{...g,parts:restPart(g.parts,source.tree,"root",now)});did=d;
    }else if(input.action==="rowContinueBegin"||input.action==="rowContinueEnd"){const plots=this.farm(),d=rowContinue(p,input,request,now,this.id,plots,this.beds()[bedOf(...input.at)],this.sky(),matchesCombo(p,["charmHoe","charmGloves"]),comboLoadout(p));if(!d.ok)return d;if(input.action==="rowContinueBegin"){const bond=commitCombo(d.purse,"SC17",`row:${p.professionRewards!.rowContinuation!.id}`,now);if(!bond)return{ok:false,why:"spent"};d.purse=bond.purse;}if(d.plots)this.write(FARM,{...plots,...d.plots});for(const e of d.each??[])this.counted({from:"deed",what:p.professionRewards!.rowContinuation!.deed,thing:e.crop,n:1,doc:{owner:p.professionRewards!.rowContinuation!.owner,continuation:true}});did=d;
    }else if(input.action==="gardenRetryBegin"||input.action==="gardenRetryEnd"){const plots=this.farm(),d=gardenRetry(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],this.id,plots[input.at.join(",")],this.beds()[bedOf(...input.at)],this.sky(),matchesCombo(p,["charmGuard","famGnome"]),comboLoadout(p));if(!d.ok)return d;if(input.action==="gardenRetryBegin"){const token=`retry:${input.job!.split(":")[0]}:${input.at[1]}`;if(p.combos?.actions?.[token])return{ok:false,why:"none"};const bond=commitCombo(d.purse,"SC12",token,now);if(!bond)return{ok:false,why:"spent"};d.purse=bond.purse;}if(d.plots)this.write(FARM,{...plots,...d.plots});if(d.helpDone)this.counted({from:"deed",what:d.helpDone,thing:null,n:1,doc:{owner:this.owners().get(bedOf(...input.at))?.by,retry:true}});did=d;
    }else if(input.action==="rainCareBegin"||input.action==="rainCareEnd"||input.action==="rainCareCancel"){const plots=this.farm(),d=rainCare(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],this.id,plots[input.at.join(",")],this.sky(),matchesCombo(p,["charmGloves","famFrog"]),comboLoadout(p));if(!d.ok)return d;if("rainPassed"in d&&d.rainPassed){const bond=commitCombo(d.purse,"SC07",`rain:${input.at.join(",")}:${plots[input.at.join(",")]!.plant!.sown}:${p.professionRewards!.rainCare!.began}`,now);if(!bond)return{ok:false,why:"spent"};d.purse=bond.purse;}if("plots"in d&&d.plots)this.write(FARM,syncGarden({...plots,...d.plots}));did=d;
    }else if(input.action==="helpMend"||input.action==="reviveBegin"||input.action==="reviveEnd"||input.action==="reviveCancel"){const plots=this.farm(),bed=this.beds()[bedOf(...input.at)],d=helpGarden(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],this.id,plots,bed,this.sky());if(!d.ok)return d;if("helpDone"in d&&d.helpDone==="water"&&"plots"in d&&d.plots)d.plots[input.at.join(",")]=this.poured(plots[input.at.join(",")],d.plots[input.at.join(",")],now,"times"in d?d.times??1:1,this.bellWorn(bedOf(...input.at)),input.at.join(","));if("plots"in d&&d.plots)this.write(FARM,syncGarden({...plots,...d.plots}));if("helpDone"in d&&d.helpDone)this.counted({from:"deed",what:d.helpDone,thing:plots[input.at.join(",")]?.plant?.crop??null,n:1,doc:{whose:plots[input.at.join(",")]?.plant?.by??bed?.by}});did=d;
    }else if(input.action==="beanBegin"||input.action==="beanStage"||input.action==="beanEnd"||input.action==="beanCancel"){const d=beanAction(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],this.id,this.farm()[input.at.join(",")],this.sky());if(!d.ok)return d;did=d;
    }else if(input.action==="giantBegin"||input.action==="giantEnd"||input.action==="giantCancel"||input.action==="gardenBrush"||input.action==="pollenCollect"||input.action==="pollenApply"){const plots=this.farm(),owner=this.owners().get(bedOf(...input.at))?.by??null,d=gardenAction(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],this.id,plots,owner,this.sky());if(!d.ok)return d;if("plots"in d&&d.plots)this.write(FARM,syncGarden({...plots,...d.plots}));did=d;
    }else if(input.action==="kitchenBegin"||input.action==="kitchenEnd"||input.action==="kitchenCancel"||input.action==="flavorTune"){
      const d=kitchenAction(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],this.id);if(!d.ok)return d;if("banquet" in d&&d.banquet)this.write(POTS,[...this.pots(),...d.banquet.map(o=>({...o,name:this.nameOf()(this.id)}))]);did=d;
    }else if(input.action==="picnicPlace"||input.action==="picnicEat"){
      const pots=this.pots();if(input.action==="picnicPlace"){
        if(!mayLeave(pots,this.id,false)||pots.some(o=>!o.feast&&Math.abs(o.at[0]-input.at[0])<=1&&Math.abs(o.at[1]-input.at[1])<=1))return {ok:false,why:"none"};
        const d=picnicPlace(p,input.slot,input.at,this.id,request,now);if(!d.ok)return d;this.write(POTS,[...pots,{...d.picnic,name:this.nameOf()(this.id)}]);did=d;
      }else{const d=picnicEat(p,pots.find(o=>o.id===input.pot),input.at,input.seated,now);if(!d.ok)return d;this.write(POTS,d.picnic?pots.map(o=>o.id===input.pot?d.picnic!:o):pots.filter(o=>o.id!==input.pot));did=d;}
    }else if(input.action==="crownLook"||input.action==="crownBegin"||input.action==="crownCall"||input.action==="crownCancel"){
      const d=crownAction(p,input,request,now,this.salt(),SKIES.rains());if(!d.ok)return d;did=d;
    }else if(input.action==="lanternLook"||input.action==="lanternLight"){
      const known=(this.linesAll()[this.id]?.insects?.firsts??[]).filter(k=>k.startsWith("insects:")).map(k=>k.slice(8));
      const d=lanternAction(p,input,now,this.salt(),SKIES.rains(),known);if(!d.ok)return d;did=d;
    }else if(input.action==="arenaLook"||input.action==="arenaBegin"||input.action==="arenaEnd"||input.action==="arenaCancel"){
      const known=(this.linesAll()[this.id]?.insects?.firsts??[]).filter(k=>k.startsWith('insects:')).map(k=>k.slice(8));
      did=arenaAction(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],known);
    }else if(input.action==='boat'){const rows=this.boats(),owner=input.boat.owner??this.id,busy=this.boatLines(),old=rows[owner]??null,aboard=Object.values(rows).some(b=>b.until>now&&(b.owner===this.id||b.guest===this.id)),d=boatAction(p,{...input.boat,at:input.at},this.id,old,now,aboard,(busy[this.id]??0)>now||!!old&&(busy[old.owner]??0)>now||!!old?.guest&&(busy[old.guest]??0)>now);if(!d.ok)return d;this.write('cashtown.trial.boats',{...rows,[owner]:d.boat});did=d;
    }else if(input.action==="bridgeBuild"){const rows=this.bridges(),d=buildCrossing(p,input,request,this.id,rows[input.site]??null,now);if(!d.ok)return d;this.write("cashtown.trial.bridges",{...rows,[input.site]:d.bridge});did=d;}else if(input.action==="pactBegin"||input.action==="pactEnd"||input.action==="pactCancel"){
      const d=treePact(p,this.grove(),input,request,this.id,now,crypto.getRandomValues(new Uint32Array(1))[0]);if(!d.ok)return d;if(d.grove)this.write(TREES_AT,d.grove);const {grove:_,...out}=d;did=out;
    }else if(input.action==="nurseryLook"||input.action==="nurseryBegin"||input.action==="nurseryStage"||input.action==="nurseryEnd"||input.action==="nurseryCancel"){
      const proof=(this.linesAll()[this.id]?.felling?.firsts??[]).filter(k=>k.startsWith('felling:')).map(k=>k.slice(8));
      did=nursery(p,input,request,now,crypto.getRandomValues(new Uint32Array(1))[0],proof);
    }else if(input.action==="cloudBegin"||input.action==="cloudEnd"||input.action==="cloudCancel"||input.action==="cloudConsent"){
      const consents=this.read<Record<string,CloudConsent>>("cashtown.trial.cloud-consents",()=>({}),v=>!!v&&typeof v==='object'),source=carried(p),log=this.wellLog();
      const owners=Object.fromEntries([...this.owners()].map(([n,b])=>[n,b.by]));
      const d=callCloud(p,input,request,this.id,{plots:this.farm(),owners,consents,local:true,kind:source?log.kinds[`${this.id}/${source.hand}`]??null:null,rains:this.sky()},now,crypto.getRandomValues(new Uint32Array(1))[0]);if(!d.ok)return d;
      if(input.action==="cloudConsent"){const next={...consents},bed=bedOf(...input.at);if(d.consent)next[bed]=d.consent;else delete next[bed];this.write("cashtown.trial.cloud-consents",next);}
      if(d.plots&&Object.keys(d.plots).length)this.write(FARM,{...this.farm(),...d.plots});
      if(input.action==="cloudEnd"&&source&&!d.purse.bag.some(s=>s?.item===source.hand&&(s.water??0)>0)){const kinds={...log.kinds},line={...log.line};delete kinds[`${this.id}/${source.hand}`];delete line[`${this.id}/${source.hand}`];this.write(WELL_LOG,{...log,kinds,line});}
      const {plots:_,consent:__,...out}=d;did=out;
    }else if(input.action==="springPlace"||input.action==="springDraw"){
      const nodes=this.springs(),d=springAction(p,input,request,this.id,nodes[input.site]??null,now);if(!d.ok)return d;
      this.write("cashtown.trial.springs",{...nodes,[input.site]:d.spring});
      if(input.action==="springDraw")this.wellSeen({by:this.id,at:now,what:"draw",can:handOf(p)??undefined});
      did=d;
    }else if(input.action==="conduitBegin"||input.action==="conduitEnd"||input.action==="conduitCancel"){
      const bed=bedOf(...input.at),rests=this.read<Record<string,number>>("cashtown.trial.conduits",()=>({}),v=>!!v&&typeof v==='object');
      const c=conduit(p,input,request,this.bedAt(...input.at),rests[bed]??0,now,crypto.getRandomValues(new Uint32Array(1))[0],this.sky());
      if(!c.ok)return c;
      if(c.cooldown)this.write("cashtown.trial.conduits",{...rests,[bed]:c.cooldown});
      if(c.plots){
        const hand=handOf(p)!,plots=this.farm(),next={...plots};
        if(c.used)this.wellSeen({by:this.id,at:now,what:"ditch",n:c.used,plants:c.watered!.length,can:hand});
        for(const key of c.watered??[]){const [x,y]=key.split(',').map(Number),was=plots[key];next[key]=keptAs(was,c.plots[key],now,SKIES.sky(now),this.natureNow(now,wellOfKey(key)));this.wellSeen({by:this.id,at:now,what:"water",can:hand,tile:[x,y],...(was?.plant?.by!==this.id?{whose:was?.plant?.by}:{})});}
        this.write(FARM,next);
        const beds=this.beds();if(beds[bed]&&ownerOf(beds[bed],true,now)===this.id)this.write(BEDS,{...beds,[bed]:{...beds[bed],tended:now}});
      }
      const {plots:_,cooldown:__,...out}=c;did=out;
    }else if(input.action==="relayPlace"||input.action==="relaySend"||input.action==="relayTake"){
      const source=carried(p),log=this.wellLog(),key=source?`${this.id}/${source.hand}`:"";
      did=waterRelay(p,input,now,{kind:log.kinds[key],hands:log.line[key]});
      if(did.ok&&input.action==="relayTake"&&p.professionRewards?.relay){
        const relay=p.professionRewards.relay,k=`${this.id}/${relay.item}`,kinds={...log.kinds},line={...log.line};
        if(relay.kind&&relay.water>0)kinds[k]=relay.kind;else delete kinds[k];
        if(relay.water>0&&relay.hands?.length)line[k]=relay.hands;else delete line[k];
        this.write(WELL_LOG,{...log,kinds,line});
      }
    }else if(input.action==="dominoPreview"){
      const bond=preview?.(p,this.grove(),input.tree,input.direction,input.at,now,undefined,this.id);
      if(!bond)return {ok:false,why:"none"};did={ok:true,purse:bond.purse,combo:bond.effect};
    }else if(input.action==="liftAnchor"||input.action==="liftRide"){
      const proof=this.mineDeeds().filter(d=>["mine","crystal","vein","hew"].includes(d.what)&&d.n>0).map(d=>Number(d.doc.floor));
      did=portableLift(p,input,request,now,proof);
    }else if(input.action==="schoolStart"){
      did=startSchool(p,input.fish,fishPool,now);
    }else if (input.action==="scan") {
      const f=input.floor, s=this.caveKept(), crystal=this.crystalToday(s.day);
      if (!Number.isSafeInteger(f) || f<0 || f>MINING.floors || (f===0&&floorAtTile(...input.at)!==0) || (f>0 && !floorTile(f,s.day,input.at[0],input.at[1]))) return {ok:false,why:"far"};
      const today=this.todayAt(f,s), pick=pickOf(p), turn=mineTurn(now), fate=this.fateAt(f,turn,today,pick);
      did=scanMineral(p,input.mineral,input.at,now,{rocks:this.rocksAt(f,s.day),ore:oreOf(f),gem:GEMS[elementOf(this.salt(),f,s.day)].chip,
        stands:id=>stands(s,f,id,now,crystal?.floor===f ? crystal.rock : null),fate:id=>fate(id)??holdsOf(this.salt(),f,id,turn,today,pick)});
    } else if (input.action==="process") {
      if (input.kind==="mineral" && (!Number.isInteger(input.floor)||input.floor!<1||input.floor!>MINING.floors||!floorTile(input.floor!,this.caveKept().day,input.at[0],input.at[1]))) return {ok:false,why:"far"};
      did=fieldProcess(p,input.kind,input.recipe,now);
    } else if (input.action==="coreBegin") {
      const proof=this.mineDeeds().filter(d=>["mine","crystal","vein","hew"].includes(d.what)&&d.n>0).map(d=>Number(d.doc.floor));
      did=beginCore(p,input.floor,request,input.at,now,crypto.getRandomValues(new Uint32Array(1))[0],proof);
    } else if(input.action==="coreRoom"||input.action==="coreEnd"||input.action==="coreCancel") {
      did=coreAction(p,input,request,now);
    } else if(input.action==="dragonBegin"){
      did=beginDragon(p,input.fish,input.bait,input.current,input.at,request,now,crypto.getRandomValues(new Uint32Array(1))[0],fishPool);
    } else if (input.action==="trailBegin") {
      did=beginTrail(p,input.kind,request,input.at,now,crypto.getRandomValues(new Uint32Array(1))[0]);
    } else if(input.action==="trailStage"||input.action==="trailEnd"||input.action==="trailCancel") {
      did=trailAction(p,input,request,now);
    } else if(input.action==="resourceBegin") {
      did=beginResource(p,input.kind,input.recipe,request,input.at,now,crypto.getRandomValues(new Uint32Array(1))[0]);
    } else if(input.action==="resourceEnd"||input.action==="resourceCancel") {
      did=resourceAction(p,input,now,correction);
    } else if (input.action==="extractBegin") {
      const source=p.professionRewards?.extraction;if(source&&!partReady(this.grove().parts,source.tree,input.part,now))return {ok:false,why:"spent"};
      const seed=crypto.getRandomValues(new Uint32Array(1))[0];
      did=beginExtraction(p,request,input.part,input.at,now,seed);
    } else if (input.action==="extractEnd") {
      const run=p.professionRewards?.run,g=this.grove();if(run&&!partReady(g.parts,run.tree,run.part,now))return {ok:false,why:"spent"};
      did=endExtraction(p,input.run,input.marks,input.at,now);if(did.ok)did.purse={...did.purse,professionRewards:{...did.purse.professionRewards,rootSource:null,rootRun:null}};if(did.ok&&did.got?.length&&run)this.write(TREES_AT,{...g,parts:restPart(g.parts,run.tree,run.part,now)});
    }
    else return {ok:false,why:"none"};
    if (!did.ok) return did;
    const {purse,...reply}=did;
    const recoverable="beanPassed"in did&&did.beanPassed===false||"kitchenPassed"in did&&did.kitchenPassed===false;this.save(rememberRescue(p,purse,input.action,request,now,recoverable));
    this.write(key,[...receipts.filter(r=>r.at>=now-7*86400000),{request,command,reply,at:now}]);
    return reply;
  }
  minePeek(floor: number, rock: number): { ok: true; peek: Peek } | { ok: false; why: MineRefusal } {
    const now = this.now(), s = this.caveKept(), pick = pickOf(this.purse()), c = this.crystalToday(s.day), today = this.todayAt(floor, s);
    if (!pick || !toolHas(pick, "pkPeek")) return { ok: false, why: "tool" };
    if (!this.rocksAt(floor, s.day).some((r) => r.id === rock)) return { ok: false, why: "none" };
    if (!stands(s, floor, rock, now, c && c.floor === floor ? c.rock : null)) return { ok: false, why: "gone" };
    return { ok: true, peek: peekOf(this.fateAt(floor, mineTurn(now), today, pick)(rock) ?? holdsOf(this.salt(), floor, rock, mineTurn(now), today, pick)) };
  }
  /** The vein I opened, played out. */
  veinDo(strikes: Array<[number, number]>, choice?: RockChoice): { ok: true; got: Array<[ItemId, number]>; passed: number; of: number; again: boolean } | { ok: false; why: MineRefusal } {
    const did = veinEnd(this.purse(), strikes, this.now(), choice);
    if (!did.ok) return did;
    this.save(did.purse);
    const v = did.vein, chip = did.got.find((g) => g[0] !== oreOf(v.f))?.[0] ?? null;
    this.mineDeed("vein", did.got.some((g) => g[0] === oreOf(v.f)) ? oreOf(v.f) : null, did.passed, {
      floor: v.f, rock: v.rock, strikes: strikes.slice(0, 64), struck: did.struck, passed: did.passed, of: did.of, ...(v.mods.spent ? { spent: true } : {}), ...(chip ? { chip } : {}), ...(v.gem ? { gem: v.gem } : {}), ...(v.again ? { again: true } : {}),
    });
    return { ok: true, got: did.got, passed: did.passed, of: did.of, again: did.again };
  }
  /** I have come to a floor: a resting floor come to by an open way is one of my lift's stops from then on. */
  caveReach(floor: number) {
    const p = this.purse(), s = this.caveKept();
    if (!isRest(floor) || mineOf(p).rests.includes(floor) || !wayOpen(s, floor - 1)) return;
    this.save(reachRest(p, floor));
  }
  /** Ride the lift to the mouth (0) or a resting floor I have reached: where I come out. */
  liftRide(to: number): { ok: true; at: [number, number] | null } | { ok: false; why: MineRefusal } {
    if (!mayRide(this.purse(), to)) return { ok: false, why: "none" };
    this.mineDeed("lift", null, to, {});
    return { ok: true, at: to === 0 ? null : floorSpots(to, this.caveKept().day).liftAt ?? null };
  }
  /** Set the torch in my hand down on the tile I stand on: it lights that floor for everybody. */
  torchDown(at: [number, number]): { ok: true; until: number } | { ok: false; why: MineRefusal } {
    const now = this.now(), s = this.caveKept(), floor = floorAtTile(at[0], at[1]);
    if (!floor || !floorTile(floor, s.day, at[0], at[1])) return { ok: false, why: "here" };
    const did = torchDown(this.purse());
    if (!did.ok) return did;
    this.write(CAVE_KEPT, setTorch(s, floor, at[0], at[1], this.id, now));
    this.save(did.purse);
    this.mineDeed("torch", MINING.torch, 1, { floor, tile: at });
    return { ok: true, until: now + MINING.light.burns };
  }
  /** Break through the floor beside the tile I stand on: the way down opens there, for everybody. */
  drillDo(at: [number, number], name: string): { ok: true; at: [number, number]; left: number } | { ok: false; why: MineRefusal } {
    const now = this.now(), s = this.caveKept(), floor = floorAtTile(at[0], at[1]), spots = floor ? floorSpots(floor, s.day) : null;
    if (!floor || !spots) return { ok: false, why: "none" };
    // (the nearest free tile beside me: floor, with nothing on it, and not where one comes down)
    const free = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]): [number, number] => [at[0] + dx, at[1] + dy])
      .find(([x, y]) => floorTile(floor, s.day, x, y) && !(x === spots.up[0] && y === spots.up[1]) && !(x === spots.arrive[0] && y === spots.arrive[1]));
    if (!free) return { ok: false, why: "here" };
    const did = drill(this.purse(), floor, wayOpen(s, floor), now);
    if (!did.ok) return did;
    this.write(CAVE_KEPT, openWay(s, floor, { rock: null, x: free[0], y: free[1], by: this.id, name: name || this.id, at: now }));
    this.save(did.purse);
    this.mineDeed("delve", null, 1, { floor, how: "drill", tile: free });
    return { ok: true, at: free, left: did.left };
  }
  caveBoard() { return caveBoardOf(this.caveKept()); }
  /** A pouch's slot emptied into the bag, and a bag's slot put into a pouch that takes it (lib/town/pouches). */
  pouchOut(gift: string, slot: number): { ok: true; n: number } | { ok: false; why: PouchRefusal } {
    const did = pouchToBag(this.purse(), gift, slot);
    if (did.ok) this.save(did.purse);
    return did.ok ? { ok: true, n: did.n } : did;
  }
  pouchIn(slot: number): { ok: true; n: number } | { ok: false; why: PouchRefusal } {
    const did = bagToPouch(this.purse(), slot);
    if (did.ok) this.save(did.purse);
    return did.ok ? { ok: true, n: did.n } : did;
  }
  /* (for scripts) What a rock holds whatever the roll ("stone", "shards", "vein", "gem", "way", "crystal"; null: by the roll again), with the seed of a vein's face. */
  setRock(floor: number, rock: number, what: RockFate | null, seed?: number) {
    const all = { ...this.fates() };
    if (what) all[`${floor}:${rock}`] = seed === undefined ? what : `${what}:${seed}`; else delete all[`${floor}:${rock}`];
    this.write(MINE_FATE, all);
    this.tell();
  }
  unsetRocks() { this.set(MINE_FATE, null); this.tell(); }
  /** (for scripts) The number the chance of fragments is tried by (0: every plain rock has them, 1: none; null: by the roll), and the same for a neighbour's breaking. */
  setMineLuck(shards: number | null, chain: number | null = null) { this.write(MINE_LUCK, { shards, chain }); this.tell(); }
  /** (for scripts) The clock put forward by so many minutes: a turn of the rocks is twenty. */
  skipMinutes(minutes: number) { this.write(CLOCK, this.now() - Date.now() + minutes * 60_000); this.tell(); }
  /** (for scripts) Which rock of a floor hides the way down today, the day's crystal rock, a floor's element, and the cave as it is kept. */
  wayRock(floor: number): number | null { const s = this.caveKept(); return this.todayAt(floor, { ...s, ways: {} }).way; }
  crystalRock() { return this.crystalToday(this.caveKept().day); }
  /** (for scripts) What a rock holds now, for the pick in my hand: so that a script may choose one that is plain by the roll. Never asked by the page. */
  rockHolds(floor: number, rock: number): Holds {
    const s = this.caveKept(), today = this.todayAt(floor, s), pick = pickOf(this.purse()), turn = mineTurn(this.now());
    return this.fateAt(floor, turn, today, pick)(rock) ?? holdsOf(this.salt(), floor, rock, turn, today, pick);
  }
  elementAt(floor: number) { return elementOf(this.salt(), floor, this.caveKept().day); }
  caveState(): CaveState { return this.caveKept(); }
  /** (for scripts) The lift's stops as if these resting floors had been reached; and the cave as nobody had been in it. */
  setRests(floors: number[]) { const p = this.purse(); this.save({ ...p, mine: { ...mineOf(p), rests: floors.filter((n) => isRest(n)) } }); }
  caveReset() { for (const key of [CAVE_KEPT, MINE_FATE, MINE_LUCK, mineDeedsKey(this.id)]) this.set(key, null); const p = this.purse(); this.save({ ...p, mine: undefined, pouches: undefined }); }
  // ── end: mining ──

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
  /**
   * (forging) Use a counted option of the tool in my hand once (lib/town/powers): what its game does with it is the
   * page's to show (an insect held still, a net that sweeps); that it is counted, so many a day, is kept here.
   */
  toolPower(id: OptionId): { ok: true; left: number } | { ok: false; why: Refusal } {
    const p = this.purse(), used = usePower(p, toolInHand(p), id, this.now());
    if (!used.ok) return no("none");
    this.save(used.purse);
    return { ok: true, left: used.left };
  }
  /** (forging) The tool in a slot as if it had been forged: its plus, its options in the order of their milestones, its gems by their elements. To try what each does without the smith. */
  setTool(slot: number, plus: number, opts: string[] = [], gems: string[] = [], mastery?: Stack["mastery"]): boolean {
    const p = this.purse(), s = p.bag[slot];
    if (!s || !toolKindOf(s.item)) return false;
    const { plus: _p, opts: _o, gems: _g, makers: _m, ...bare } = s;
    this.save({ ...p, bag: p.bag.map((b, i) => (i !== slot ? b : { ...bare, ...(plus > 0 ? { plus: Math.min(FORGE.top, Math.floor(plus)) } : {}), ...(opts.length ? { opts: [...opts] } : {}), ...(gems.length ? { gems: [...gems] } : {}), ...(mastery ? { mastery: { ...mastery } } : {}) })) });
    return true;
  }
  /**
   * (forging) What trying the smith out takes, all at once: a bag of twenty slots, coins, fine timber, fragments, ore and
   * a few gems. The timber and the two ores are a metal tool's whole road to the top with the best of luck and a little
   * over (lib/town/forge's `TRIES` as it is since 2026-10-10: 88 fine timber, 8 iron, 32 silver); a wooden tool's road
   * takes twice the timber, and a try that fails takes its share again.
   */
  grantSmith() {
    if (this.purse().bag.length < 20) this.resize(20);
    const p = this.purse();
    let bag = p.bag;
    for (const [id, n] of [["timber", 100], ["shardCopper", 60], ["shardIron", 40], ["oreCopper", 6], ["oreIron", 20], ["oreSilver", 40], ["chipRuby", 20], ["gemRuby", 2], ["gemSapphire", 2], ["gemEmerald", 2]] as Array<[ItemId, number]>) {
      bag = put(bag, id, Math.min(n, roomFor(bag, id)));
    }
    this.save({ ...p, coins: p.coins + 20_000, bag });
  }
  /**
   * (forging: a move) What trying a move out takes: the tools of a line that has several, forged so that a move shows
   * everything there is to it (a plus, options, a gem, makers' names; of the farm's two a watering can full of water,
   * which holds more forged than it does plain). Each takes the place of the first of its kind in the bag, or an
   * empty slot. False where the bag has no room.
   */
  grantMove(line: "kitchen" | "farming"): boolean {
    if (this.purse().bag.length < 20) this.resize(20);
    const sets: Record<"kitchen" | "farming", Stack[]> = {
      kitchen: [
        { item: "pot", n: 1, plus: 7, opts: ["ckFire", "ckBase"], gems: ["fire"], makers: ["Aqua", "Nine"] },
        { item: "pan", n: 1 },
        { item: "grill", n: 1, plus: 3, opts: ["ckBrisk"], gems: ["water"], makers: ["Nine"] },
      ],
      farming: [
        { item: "hoe", n: 1, plus: 7, opts: ["hoClear", "hoFirst"], gems: ["earth"], makers: ["Nine", "Nine"] },
        { item: "can", n: 1, plus: 10, opts: ["cnDrop", "cnThrift", "cnRain"], gems: ["fire"], makers: ["Aqua", "Aqua", "Aqua"] },
      ],
    };
    const p = this.purse(), bag = [...p.bag];
    for (const made of sets[line]) {
      const at = bag.findIndex((s) => s?.item === made.item), slot = at >= 0 ? at : bag.findIndex((s) => !s);
      if (slot < 0) return false;
      // (a can is given full, as the can it now is)
      bag[slot] = made.item === "can" ? { ...made, water: canHolds(made) } : made;
    }
    this.save({ ...p, bag });
    return true;
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
  /* ── the pasture (lib/town/animal-act): everybody's animals as one world, kept in this browser ── */
  animalWorld(): AnimalWorld {
    return this.read<AnimalWorld>(ANIMALS_AT, () => EMPTY_WORLD, (v) => !!v && typeof v === "object" && Array.isArray((v as AnimalWorld).animals) && Array.isArray((v as AnimalWorld).herds));
  }
  /** The purses of the others a step may look at (an owner's gifts, a lender's): whoever has one in this browser. */
  private animalPurses(world: AnimalWorld): Record<string, Purse> {
    const out: Record<string, Purse> = {};
    for (const id of new Set([...world.animals.map((a) => a.owner), ...world.herds.map((h) => h.owner)])) {
      if (id === this.id) continue;
      const raw = this.get(purseKey(id));
      if (raw) { try { out[id] = JSON.parse(raw) as Purse; } catch { /* a purse that will not parse is nobody's */ } }
    }
    return out;
  }
  /** One step of the line, as the database's town_animals takes it: the world and my purse after it, and what it earned counted on its line. */
  animals(input: AnimalInput) {
    const world = this.animalWorld(), now = this.now();
    const r = animalAction(world, this.purse(), input, { me: this.id, now, rand: Math.random, newId: () => crypto.randomUUID(), spot: pastureSpot, onFarm: true }, this.animalPurses(world));
    // (a world the step changed is kept even on a look or a refusal: the warm bottle's moment is written so, as the database writes it)
    if (r.world !== world) this.write(ANIMALS_AT, r.world);
    if (r.ok && input.action !== "look") {
      for (const n of r.notes) if (n.pts) this.counted({ from: "deed", what: n.what, thing: null, n: n.n, doc: { ...(n.doc ?? {}), pts: n.pts } });
      this.save(r.purse);
    }
    return { ok: r.ok, ...(r.why ? { why: r.why } : {}), world: r.world, ...(r.got ? { got: r.got } : {}) };
  }
  /** For trying things out: an animal of any breed at any stage, mine at once (fed a day; `hearts` in hearts). */
  animalGive(breed: string, stage: AnimalStage, hearts = 0, sex: "m" | "f" = "f") {
    const b = ANIMAL_BREEDS.get(breed);
    if (!b) return null;
    const sp = ANIMAL_SPECIES[b.species], now = this.now(), world = this.animalWorld();
    // (the test window gives past the barn, as it gives past the coins: the first free barn is mine if I have none, and
    // an animal past its room waits in the pen)
    const held = world.herds.find((h) => h.owner === this.id);
    const taken = new Set(world.herds.map((h) => h.barn).filter((x) => x !== null));
    const free = Array.from({ length: ANIMAL_RULES.barns.count }, (_, i) => i).find((i) => !taken.has(i)) ?? null;
    const herd = held && held.barn !== null ? held : { ...(held ?? newAnimalHerd(this.id)), barn: free, lastCare: now };
    const home = freeAnimalHome(herd, world.animals) ?? "pen";
    const grown = stage === "adult" ? sp.grow[0] + sp.grow[1] : stage === "young" ? sp.grow[0] + 1 : 0;
    const a: Animal = {
      ...newAnimal(crypto.randomUUID(), this.id, b.species, b.id, stage === "coming" ? now + ANIMAL_RULES.hatch[sp.kind] : now, b.letter === "A", home, sex, boughtAnimalStats(Math.random)),
      at: now, food: 24, grown, hearts: Math.max(0, Math.min(10, hearts)) * ANIMAL_RULES.perHeart, today: { day: animalDay(now) },
    };
    this.write(ANIMALS_AT, { ...world, animals: [...world.animals, a], herds: [...world.herds.filter((h) => h.owner !== this.id), herd] });
    this.tell();
    return a;
  }
  /** For trying things out: a change laid straight onto one of the animals (rounds ready, hearts, food). */
  animalSet(id: string, patch: Partial<Animal>) {
    const world = this.animalWorld();
    this.write(ANIMALS_AT, { ...world, animals: world.animals.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
    this.tell();
  }
  /** For trying things out: spring wind or the pasture's harp blowing now (as if somebody had called it). */
  animalSpell(kind: Spell["kind"]) {
    const world = this.animalWorld(), now = this.now(), mins = kind === "wind" ? ANIMAL_RULES.wind.mins : ANIMAL_RULES.harp.mins;
    const spell: Spell = { kind, by: this.id, from: now, until: now + mins * 60_000, ...(kind === "harp" ? { who: [this.id] } : {}) };
    this.write(ANIMALS_AT, { ...world, spells: [...world.spells.filter((x) => x.until > now), spell] });
    this.tell();
  }
  /** For trying things out: the hay wagon setting off now, round the farm, the town and the forest. */
  animalWagon() {
    const world = this.animalWorld(), now = this.now();
    const run: WagonRun = { id: crypto.randomUUID(), by: this.id, from: now, stops: ["farm", "town", "forest"], riders: [] };
    this.write(ANIMALS_AT, { ...world, wagons: [...world.wagons.filter((r) => r.from > now - 24 * 3_600_000), run] });
    this.tell();
  }
  /** For trying things out: my herd as asked: a barn (a number, or the first free), how many it houses, its last care so many days ago. */
  animalHerd(patch: { barn?: number | null; room?: number; untendedDays?: number }) {
    const world = this.animalWorld(), now = this.now(), held = world.herds.find((h) => h.owner === this.id) ?? newAnimalHerd(this.id);
    const taken = new Set(world.herds.filter((h) => h.owner !== this.id).map((h) => h.barn));
    let barn = held.barn;
    if (patch.barn === null) barn = null;
    else if (patch.barn !== undefined && !taken.has(patch.barn)) barn = patch.barn;
    else if (patch.barn === undefined && barn === null) barn = Array.from({ length: ANIMAL_RULES.barns.count }, (_, i) => i).find((i) => !taken.has(i)) ?? null;
    const herd = { ...held, barn, room: patch.room ?? held.room, lastCare: patch.untendedDays !== undefined ? now - patch.untendedDays * 24 * 3_600_000 : barn !== held.barn ? now : held.lastCare };
    this.write(ANIMALS_AT, { ...world, herds: [...world.herds.filter((h) => h.owner !== this.id), herd] });
    this.tell();
    return herd;
  }
  /**
   * For trying things out: friends in the barns about, with grown animals of both sexes (one's door open, so its animals
   * are out; one barn left untended a month), one of them offering me an animal, one asking for one of mine, one lending
   * me one; `fill`: every other barn taken too, so that the untended one may be taken.
   */
  animalFriends(fill = false) {
    let world = this.animalWorld();
    const now = this.now(), me = this.id, H = 3_600_000, DAYS = 24 * H;
    const taken = new Set(world.herds.map((h) => h.barn).filter((b) => b !== null));
    const free = () => { const i = Array.from({ length: ANIMAL_RULES.barns.count }, (_, k) => k).find((k) => !taken.has(k)); if (i !== undefined) taken.add(i); return i ?? null; };
    const herds = [...world.herds], animals = [...world.animals];
    const friend = (id: string, open: boolean, untended = 0) => {
      if (herds.some((h) => h.owner === id)) return;
      const barn = free();
      herds.push({ ...newAnimalHerd(id), barn, room: 4, care: "anybody", lastCare: now - untended * DAYS, door: open ? [[now - 25 * 60_000, null]] : [] });
    };
    const grown = (owner: string, breed: string, sex: "m" | "f", hearts = 6) => {
      const b = ANIMAL_BREEDS.get(breed)!, sp = ANIMAL_SPECIES[b.species];
      const a: Animal = { ...newAnimal(crypto.randomUUID(), owner, b.species, b.id, now - 9 * DAYS, b.letter === "A", "barn", sex, boughtAnimalStats(Math.random)), at: now, food: 20, grown: sp.grow[0] + sp.grow[1], hearts: hearts * ANIMAL_RULES.perHeart, streak: 5, today: { day: animalDay(now) } };
      animals.push(a);
      return a;
    };
    const [mali, ploy, ton, old] = ["trial-friend-Mali", "trial-friend-Ploy", "trial-friend-Ton", "trial-friend-Somchai"];
    if (!herds.some((h) => h.owner === mali)) {
      friend(mali, true); friend(ploy, false); friend(ton, false); friend(old, false, 30);
      grown(mali, "barnHen", "m"); grown(mali, "barnHen", "f"); grown(mali, "meadowSheep", "m"); grown(mali, "dairyCow", "f");
      grown(ploy, "dairyCow", "m"); grown(ploy, "puddleDuck", "f"); grown(ton, "meadowSheep", "f"); grown(ton, "silkie", "f", 8); grown(old, "puddleDuck", "m");
    }
    if (fill) for (let n = 0; n < ANIMAL_RULES.barns.count; n++) friend(`trial-friend-Barn${n + 1}`, false);
    world = { ...world, herds, animals };
    // an offer to me (Ploy's duck), an ask for one of mine (Mali's of the other sex), a loan to me (Ton's ewe, for my ram if I have one)
    const mine = animals.filter((a) => a.owner === me && a.home !== "pen" && a.grown >= ANIMAL_SPECIES[a.species].grow[0] + ANIMAL_SPECIES[a.species].grow[1]);
    const offers = [...(world.offers ?? [])], asks = [...(world.asks ?? [])];
    const duck = animals.find((a) => a.owner === ploy && a.species === "duck");
    if (duck && !offers.some((o) => o.animal === duck.id)) offers.push({ id: crypto.randomUUID(), from: ploy, to: me, animal: duck.id, at: now - 2 * H });
    // (a ram of mine if there is one, else my first grown one)
    const target = mine.find((a) => a.species === "sheep" && a.sex === "m") ?? mine[0];
    if (target && !asks.some((q) => q.to === me)) {
      const theirs = animals.find((a) => a.owner === mali && a.species === target.species && a.sex !== target.sex) ?? grown(mali, ANIMAL_BREEDS.get(target.breed)!.letter === "A" ? target.breed : [...ANIMAL_BREEDS.values()].find((b) => b.species === target.species && b.letter === "A")!.id, target.sex === "m" ? "f" : "m");
      asks.push({ id: crypto.randomUUID(), from: mali, to: me, mine: theirs.id, theirs: target.id, at: now - 3 * H });
    }
    const ram = mine.find((a) => a.species === "sheep" && a.sex === "m"), ewe = animals.find((a) => a.owner === ton && a.species === "sheep");
    if (ewe) Object.assign(ewe, { lent: { to: me, until: now + 52 * 60_000, ...(ram ? { with: ram.id } : {}) } });
    this.write(ANIMALS_AT, { ...world, animals, offers, asks });
    this.tell();
  }
  /** For trying things out: an offer and an ask of mine standing (my first animal offered to a friend; asking a friend's for my first grown one). */
  animalMine() {
    const world = this.animalWorld(), now = this.now(), me = this.id;
    const mine = world.animals.filter((a) => a.owner === me);
    const offers = [...(world.offers ?? [])], asks = [...(world.asks ?? [])];
    const first = mine.find((a) => a.born <= now && !offers.some((o) => o.animal === a.id));
    if (first) offers.push({ id: crypto.randomUUID(), from: me, to: "trial-friend-Ton", animal: first.id, at: now - 1 * 3_600_000 });
    const grownOne = mine.find((a) => a.home !== "pen" && a.grown >= ANIMAL_SPECIES[a.species].grow[0] + ANIMAL_SPECIES[a.species].grow[1]);
    const theirs = grownOne && world.animals.find((a) => a.owner !== me && a.species === grownOne.species && a.sex !== grownOne.sex);
    if (grownOne && theirs && !asks.some((q) => q.from === me)) asks.push({ id: crypto.randomUUID(), from: me, to: theirs.owner, mine: grownOne.id, theirs: theirs.id, at: now - 2 * 3_600_000 });
    this.write(ANIMALS_AT, { ...world, offers, asks });
    this.tell();
  }
  animalsClear() { this.set(ANIMALS_AT, null); this.tell(); }
  /** Put the clock forward by so many hours: to try another hour's fish, or the next meal. */
  skipHours(hours: number) {
    this.write(CLOCK, this.now() - Date.now() + hours * 3_600_000);
    this.tell();
  }
  /** Begin again: my purse, the stall, its prices, the farm and the clock as they were at first. (What was played stays written down.) */
  reset() {
    this.set(`cashtown.trial.craft.1.${this.id}`, null);
    for (const key of [purseKey(this.id), boxKey(this.id), /* felling */ TREES_AT, GROUND_AT, SHOPS, STALL, MARKET_AT, MARKET_LOG, CLOCK, FARM, WELL, WELL_SOUTH, WELL_LOG, THANKS, JAR, YARD_JAR, BEDS, POTS, FOUND, FINDERS, DEALS, VILLAGE, WORKS_AT, LAMPS_AT, /* the pasture */ ANIMALS_AT]) this.set(key, null);
    // ── forging ──
    for (const key of [smithKey(this.id), SMITH_BOARD, SMITH_LOG, SMITH_FIRE]) this.set(key, null);
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
