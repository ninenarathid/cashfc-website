import type { Taste } from "./cooking";
import type { Give } from "./deal";
import type { Chore, Deed } from "./farm";
import { ALL_SIGNS, PAIR, SIGNS, castFrom, driveBack, lightOrb, oddsOf, orbHaste, orbOf, seeded, sift, signsOf, underOrb, type Cast, type Strike } from "./fishing";
import type { Outcome } from "./forest";
import { hastened, shadeOf, type Shade, type WishId } from "./fountain";
import { type CatchId, FISH, type BaitId, type DishId, type FishId, type ItemId, type Sign } from "./items";
import { wearing, works } from "./gifts";
import type { CastHow, CastTold, Did, Hooked, Keeper, Landed, Looked, Struck, Timing, Water } from "./keeper";
import type { Worn } from "./lines";
import type { Play } from "./plays";
import type { ShopAsk } from "./shop";
import { SKIES } from "./skies";
import { STAMINA, hasBuff, isSpent, levelOf } from "./stamina";
import type { Purse } from "./trade";
import { trialFor, type Trial } from "./trial";
import { wetMs } from "./weather";

const HOUR = 3_600_000;
const bangkokHour = (now: number) => Math.floor((((now + 7 * HOUR) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) / HOUR);

/**
 * The browser's trial as a keeper (lib/town/keeper): the same rules, kept in
 * this browser, answering at once. What the database decides for a member is
 * decided here: what takes the bait is drawn when the line is dropped and told
 * only at the strike, as there.
 *
 * Only for `next dev`: loaded behind a check production compiles away, like
 * the trial itself.
 */
class TrialKeeper implements Keeper {
  onDeed: ((what: Looked, to?: string) => void) | null = null;
  /** The line that is out: what is on its way, and the bait it took. */
  // ── gifts: fishing ── (`again`: the otter has driven this line's fish back once; `two`: what is on the second line of a rod of two lines, while both are on)
  private out: { cast: Cast; bait: BaitId; again?: boolean; two?: { what: CatchId; size: number } } | null = null;
  /** For scripts: what the next lines bring, whatever the odds (this keeper is `next dev`'s only). */
  private fated: CatchId[] = [];
  willBite(ids: CatchId[]) { this.fated = [...ids]; }

  constructor(readonly id: string, readonly trial: Trial) {}

  ready() { return true; }
  open() { return true; }
  watch(fn: () => void) { return this.trial.watch(fn); }
  /** Everything is in this browser already; but an hour of the pests' is counted by its first look at the farm, as the database counts it (lib/town/farm's Swarms), and again every so often while it is looked at, for the hour that turns meanwhile. */
  look(what?: string) {
    if (what !== "farm") return () => {};
    this.trial.swarmNote();
    const t = setInterval(() => this.trial.swarmNote(), 20_000);
    return () => clearInterval(t);
  }
  nudged() { /* everything is in this browser already */ }
  now() { return this.trial.now(); }

  purse() { return this.trial.purse(); }
  helpings() { return STAMINA.bowls; }
  stall() { return this.trial.stall(); }
  shelf() { return this.trial.shelf(); }
  order() { return this.trial.order(); }
  hintPrice() { return this.trial.hintPrice(); }
  farm() { return this.trial.farm(); }
  well() { return this.trial.well(); }
  owners() { return this.trial.owners(); }
  deedAt(key: string) { return this.trial.deedAt(key); }
  rains() { return this.trial.sky(); }
  choreAt(where: Water) { return this.trial.choreAt(where); }
  pots() { return this.trial.pots(); }
  found() { return this.trial.found(); }
  finder(id: ItemId) { return this.trial.finder(id); }
  madeBefore(id: ItemId) { return this.trial.madeBefore(id); }
  triesAt(id: ItemId) { return this.trial.triesAt(id); }
  known() { return this.trial.known(); }
  knownMakes() { return this.trial.knownMakes(); }
  cookTry(things: Array<[ItemId, number]>, crew: Array<ItemId | null>) { return this.trial.cookTry(things, crew); }
  deal() { return this.trial.deal(); }
  fountain() { return this.trial.fountain(); }
  prices() { return this.trial.prices(); }
  notices() { return this.trial.notices(); }

  async buy(item: ItemId, n: number): Promise<Did> { return this.trial.buy(item, n); }
  async hint(): Promise<Did<{ hint: ItemId }>> { return this.trial.hint(); }
  async orderGive(slot: number, n: number) { return this.trial.orderGive(slot, n); }
  async leave(slot: number, n: number): Promise<Did> { return this.trial.leave(slot, n); }
  async takeBack(at: number): Promise<Did> { return this.trial.takeBack(at); }
  async collect(): Promise<Did<{ coins: number }>> { return this.trial.collect(); }
  async change(kind: keyof Purse["popoto"], n: number): Promise<Did> { return this.trial.change(kind, n); }
  async toss(wish: WishId, coins: number, note: string | null = null): Promise<Did<{ took: number; counted: number; granted: WishId | null }>> { return this.trial.toss(wish, coins, note); }
  async cheer(note: number, coins: number): Promise<Did<{ took: number; counted: number; granted: WishId | null }>> { return this.trial.cheer(note, coins); }
  async wishReport(note: number): Promise<Did> { return this.trial.wishReport(note); }
  async noticePost(kind: "sell" | "want", item: ItemId, n: number, price: number): Promise<Did<{ id: number }>> { return this.trial.noticePost(kind, item, n, price); }
  async noticeBuy(id: number, n: number): Promise<Did<{ item: ItemId; coins: number }>> { return this.trial.noticeBuy(id, n); }
  async noticeFill(id: number, n: number): Promise<Did<{ item: ItemId; coins: number }>> { return this.trial.noticeFill(id, n); }
  async noticeFetch(id: number): Promise<Did<{ item: ItemId; got: number }>> { return this.trial.noticeFetch(id); }
  async noticeDown(id: number): Promise<Did<{ item: ItemId; things: number; coins: number }>> { return this.trial.noticeDown(id); }
  async noticeCollect(): Promise<Did<{ coins: number }>> { return this.trial.noticeCollect(); }
  async noticeSlot(): Promise<Did<{ coins: number }>> { return this.trial.noticeSlot(); }
  async wishUnsay(note: number): Promise<Did> { return this.trial.wishUnsay(note); }
  // (nobody is an admin in the trial)
  async wishHide(): Promise<Did> { return { ok: false, why: "none" }; }
  async sitDown(slot: number, seated: boolean): Promise<Did<{ dish: DishId }>> { return this.trial.sitDown(slot, seated); }
  chew(company: number) { this.trial.chew(company); }
  async getUp(company: number) { this.trial.getUp(company); }
  async readScroll(slot: number): Promise<Did<{ dish: ItemId }>> { return this.trial.readScroll(slot); }
  async openThing(slot: number): Promise<Did<{ found: ItemId | null }>> { return this.trial.openThing(slot); }
  async hold(slot: number | null): Promise<Did> {
    if (slot === null) { this.trial.letGo(); return { ok: true }; }
    return this.trial.hold(slot);
  }
  async wear(slot: number): Promise<Did> { return this.trial.wear(slot); }
  async takeOff(item: ItemId): Promise<Did> { return this.trial.takeOff(item); }
  async serve(slot: number): Promise<Did<{ dish: DishId }>> { return this.trial.serve(slot); }
  async drop(slot: number): Promise<Did> { this.trial.drop(slot); return { ok: true }; }
  ground() { return this.trial.ground(); }
  // (whoever else is in town is in another tab: told through the room, as the database's keeper tells them)
  async groundDrop(slot: number, at: [number, number]): Promise<Did<{ id: number }>> {
    const did = this.trial.groundDrop(slot, at);
    if (did.ok) this.onDeed?.("ground");
    return did;
  }
  async groundTake(id: number, at: [number, number]): Promise<Did<{ item: ItemId; n: number }>> {
    const did = this.trial.groundTake(id, at);
    if (did.ok) this.onDeed?.("ground");
    return did;
  }

  async cast(bait: BaitId, place: { tile: [number, number]; deep: boolean }, rain: boolean, quick = false, how?: CastHow): Promise<Did<CastTold>> {
    // ── gifts: fishing ── (a rod of two lines is its owner's to drop, and takes two of the bait)
    const pair = how === "pair";
    if (pair && !works(this.trial.purse(), "thingRod")) return { ok: false, why: "none" };
    const used = pair ? this.trial.baits(bait, PAIR.lines) : this.trial.bait(bait);
    if (!used.ok) return used;
    const now = this.trial.now(), p = this.trial.purse();
    // What some fish wait for (lib/town/fishing's signs), by this browser's clock, its purse and its sky. The others'
    // lines it cannot know (each tab keeps its own): `&townSigns=crowd` says they are out, and any other sign named
    // there holds as well, so that a fish that waits for the moon need not be waited for.
    const named = (typeof location === "undefined" ? "" : new URLSearchParams(location.search).get("townSigns") ?? "").split(",").filter((x): x is Sign => ALL_SIGNS.includes(x as Sign));
    const signs = [...new Set([...signsOf({ now, spent: isSpent(p, now), others: 0, wet: wetMs(SKIES.rains(), now - SIGNS.after * 60_000, now) }, rain), ...named])];
    const rnd = seeded(Math.floor(Math.random() * 2 ** 31));
    // (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
    const sky = orbOf(p, now), under = underOrb(sky, bangkokHour(now), rain, signs);
    // (what may take it: the bait's own odds, and, of a pair, never a legend)
    const own = oddsOf(bait, under.hour, under.rain, levelOf(p, now, "lucky"), !place.deep, under.signs), odds = pair ? sift(own, PAIR.never) : own;
    const draw = () => { const fate = this.fated.shift(); return castFrom(fate ? [{ what: fate, p: 1 }] : odds, rnd); };
    const drawn = draw(), second = pair ? draw() : null;
    // (the fountain's blessings: a bite that comes sooner, and water clear enough to see the shade of what is coming)
    const blessed = hasBuff(p, now, "swift") ? hastened(drawn) : drawn;
    // (and under an orb the bite comes sooner still)
    const cast = sky ? hastened(blessed, orbHaste()) : blessed;
    this.out = { cast, bait, ...(second ? { two: { what: second.what, size: second.size } } : {}) };
    // (the trial's short wait: a fifth of it, never so short that the float cannot be watched)
    const k = quick ? 0.2 : 1, wait = Math.max(2, cast.wait * k);
    return { ok: true, wait, nibbles: cast.nibbles.map((n) => n * k).filter((n, i, all) => n >= 1 && wait - n >= 1.5 && (i === 0 || n - all[i - 1] >= 1.5)), lag: 0, ...(hasBuff(p, now, "clear") ? { shade: shadeOf(cast.what) } : {}), ...(wearing(p, "charmFloat") ? { coming: cast.what } : {}),
      ...(second ? { pair: true } : {}), ...(second && wearing(p, "charmFloat") ? { coming2: second.what } : {}) };
  }
  // ── gifts: fishing ──
  async orbLight(sky: string): Promise<Did<{ until: number }>> {
    const did = lightOrb(this.trial.purse(), sky, this.trial.now());
    if (!did.ok) return did;
    this.trial.fished(did.purse);
    return { ok: true, until: did.until };
  }
  async strike(_reaction: number, how: Strike | null): Promise<Did<Struck>> {
    const o = this.out;
    if (!o) return { ok: false, why: "none" };
    const { what, size } = o.cast;
    if (!how) { this.out = null; return { ok: true, hooked: false, how: "early", what, size }; }
    // ── gifts: fishing ── (a rod of two lines: both are hooked by the one strike; what is no fish comes in at once, a fish's fight is paid for, each its own)
    if (o.two) {
      const told: Hooked[] = [], onhook: Array<{ what: CatchId; size: number }> = [];
      for (const thing of [{ what, size }, o.two]) {
        if (!(thing.what in FISH)) told.push({ what: thing.what, size: 0, landed: true, kept: this.trial.land(thing.what, 0).kept });
        else { this.trial.spend(FISH[thing.what as FishId].fight.effort); onhook.push(thing); told.push({ ...thing, landed: false }); }
      }
      if (!onhook.length) this.out = null;
      else { o.cast = { ...o.cast, ...onhook[0] }; o.two = onhook[1]; }
      return { ok: true, hooked: true, what: told[0].what, size: told[0].size, landed: !onhook.length, kept: told[0].kept, pair: told };
    }
    if (!(what in FISH)) {
      // no fish: it comes in with no fight
      this.out = null;
      return { ok: true, hooked: true, what, size: 0, landed: true, ...this.trial.land(what, 0) };
    }
    // a fight costs its stamina whatever comes of it
    this.trial.spend(FISH[what as FishId].fight.effort);
    return { ok: true, hooked: true, what, size, landed: false };
  }
  async missed() {
    const o = this.out;
    this.out = null;
    return o ? { what: o.cast.what, size: o.cast.size } : {};
  }
  async land(how: "landed" | "snapped" | "slipped" | "left", _fight?: Record<string, unknown> | null, which?: 0 | 1): Promise<Landed> {
    const o = this.out;
    if (!o) return { how, kept: false, record: false };
    // ── gifts: fishing ── (two fish still on a rod of two lines: one of them has ended, and the line is a line as any other from here, with the other)
    if (o.two && how !== "left") {
      const first = { what: o.cast.what, size: o.cast.size }, mine = which === 1 ? o.two : first, other = which === 1 ? first : o.two;
      o.cast = { ...o.cast, ...other };
      o.two = undefined;
      if (how === "landed") return { how, ...this.trial.land(mine.what, mine.size), more: true };
      if (how === "snapped") this.trial.lose(o.bait);
      return { how, kept: false, record: false, ...(this.trial.back(o.bait) ? { back: true } : {}), more: true };
    }
    // ── gifts: fishing ── (the otter drives a fish that got away back, once to a line: the line stays out, and the fight is to be had again)
    const driven = driveBack(this.trial.purse(), how, !!o.again, this.trial.now());
    if (driven.ok) { this.trial.fished(driven.purse); o.again = true; return { how, kept: false, record: false, again: true }; }
    this.out = null;
    if (how === "landed") return { how, ...this.trial.land(o.cast.what, o.cast.size) };
    if (how === "snapped") this.trial.lose(o.bait);
    // (a fish hooked and lost in the fight gives the bait it took back, where the bag has room)
    const back = (how === "snapped" || how === "slipped") && this.trial.back(o.bait);
    return { how, kept: false, record: false, ...(back ? { back: true } : {}) };
  }

  async farmDo(key: string, name: string, timing?: Timing, sure = false): Promise<Did<{ deed: Deed; got: Array<[ItemId, number]> }>> {
    const did = this.trial.farmDo(key, name, sure);
    // every miss of the hoe is a little more stamina gone
    if (did.ok && timing?.misses) this.trial.spend(timing.misses);
    return did;
  }
  async choreDo(where: Water): Promise<Did<{ chore: Chore }>> { return this.trial.choreDo(where); }
  wellBook() { return this.trial.wellBook(); }
  ranks() { return this.trial.ranks(); }
  lines() { return this.trial.lines(); }
  titles() { return this.trial.titles(); }
  linesRead() { /* the trial's are read as they are asked for */ }
  async titleWear(worn: Worn | null): Promise<Did> { return this.trial.titleWear(worn); }
  gifting() { return true; }
  async giftTake(line: string, rank: number): Promise<Did<{ gift: string }>> { return this.trial.giftTake(line, rank); }
  async charmsWear(ids: readonly string[]): Promise<Did> { return this.trial.charmsWear(ids); }
  gives() { return true; }
  async familiarWear(id: string | null): Promise<Did> { return this.trial.familiarWear(id); }
  async giftUse(id: string): Promise<Did<{ left: number }>> { return this.trial.giftUse(id); }
  async wellLook() { /* the book is in this browser already */ }
  async wellTake(): Promise<Did<{ gift: ItemId; rank: number }>> { return this.trial.wellTake(); }
  toThank() { return this.trial.toThank(); }
  async thankLook() { /* who helped is in this browser already */ }
  async thankAt(key: string): Promise<Did<{ thanked: string[] }>> { return this.trial.thankAt(key); }
  thanks() { return this.trial.thanksBoard(); }
  thanked() { return this.trial.thanksBoard().today; }
  jar() { return this.trial.jar(); }
  async jarDrop(what: { coins: number } | { slot: number; n: number }): Promise<Did> { return this.trial.jarDrop(what); }
  async jarTake(): Promise<Did<{ coins: number; things: Array<[ItemId, number]> }>> { return this.trial.jarTake(); }
  hot() { return this.trial.hot(); }
  ditchAt(key: string) { return this.trial.ditchAt(key); }
  async ditchDo(key: string): Promise<Did<{ used: number; watered: string[] }>> { return this.trial.ditchDo(key); }
  yardJar() { return this.trial.yardJar(); }
  yardCanPour() { return this.trial.yardCanPour(); }
  async yardPour(): Promise<Did<{ poured: number }>> { return this.trial.yardPour(); }
  wellWater() { return this.trial.wellWater(); }
  drawnNow() { return this.trial.drawnNow(); }
  canPass() { return this.trial.canPass(); }
  async passTo(to: string): Promise<Did<{ n: number }>> {
    const did = this.trial.passTo(to);
    // (whoever took it is in another tab: told through the room, as the database's keeper tells them)
    if (did.ok) this.onDeed?.("line", to);
    return did;
  }
  box() { return this.trial.box(); }
  async boxLook() { /* the box is in this browser already */ }
  async boxPut(slot: number, n: number, at: [number, number]): Promise<Did<{ item: ItemId; n: number }>> { return this.trial.boxPut(slot, n, at); }
  async boxTake(slot: number, n: number, at: [number, number]): Promise<Did<{ item: ItemId; n: number }>> { return this.trial.boxTake(slot, n, at); }

  shops() { return this.trial.shops(); }
  async shopLook() { /* stalls are in this browser already */ }
  async shopOpen(ask: ShopAsk, at: [number, number]): Promise<Did> { return this.trial.shopOpen(ask, at); }
  async shopClose() { this.trial.shopClose(); }
  shopBeater() { const trial = this.trial; return () => trial.shopBeat(); }
  private visit: string | null = null;
  async shopVisit(who: string | null) { this.visit = who; }
  shopSeen() { return this.visit ? { who: this.visit, told: this.trial.shopOf(this.visit) } : null; }
  // (the stall's keeper is in another tab: told through the room, as the database's keeper tells them)
  async shopBuy(who: string, item: ItemId, n: number, at: [number, number]): Promise<Did<{ coins: number }>> {
    const did = this.trial.shopBuy(who, item, n, at);
    if (did.ok) this.onDeed?.("shop", who);
    return did;
  }
  async shopSell(who: string, item: ItemId, n: number, at: [number, number]): Promise<Did<{ coins: number }>> {
    const did = this.trial.shopSell(who, item, n, at);
    if (did.ok) this.onDeed?.("shop", who);
    return did;
  }

  wild() { return this.trial.wild(); }
  async gatherDo(spot: number, at: [number, number], went: Outcome): Promise<Did<{ got: Array<[ItemId, number]> }>> { return this.trial.gatherDo(spot, at, went); }
  bugs() { return this.trial.bugs(); }
  async netDo(haunt: number, at: [number, number], went: { misses: number; lure?: ItemId | null }, name: string): Promise<Did<{ got: Array<[ItemId, number]>; first: boolean; rid?: string | null }>> {
    return this.trial.netDo(haunt, at, went.misses, went.lure ?? null, name);
  }
  bugBook() { return this.trial.bugBook(); }

  async cookDo(things: Array<[ItemId, number]>, crew: Array<ItemId | null>, _cooks: string[], timing: Timing, name: string): Promise<Did<{ made: ItemId | null; n: number; first: boolean; taste?: Taste; fresh?: boolean }>> {
    return this.trial.cookDo(things, crew, timing.misses, name);
  }
  async potDown(at: [number, number]) { return this.trial.potDown(at); }
  async potLadle(id: string) { return this.trial.potLadle(id); }
  async potTake(id: string): Promise<Did> { return this.trial.potTake(id); }

  async dealOpen(other: string, myName: string, otherName: string): Promise<Did> { return this.trial.dealOpen(other, myName, otherName); }
  async dealLay(give: Give, coins = 0): Promise<Did> { return this.trial.dealLay(give, coins); }
  async dealAgree(word = true): Promise<Did<{ done: boolean }>> { return this.trial.dealAgree(word); }
  async dealCancel() { this.trial.dealCancel(); }

  record(play: Play) { this.trial.record(play); }
  close() { /* nothing of its own to stop */ }
}

const keepers = new Map<string, TrialKeeper>();
/** The one trial's keeper for somebody in this tab. */
export function trialKeeper(id: string): Keeper {
  let k = keepers.get(id);
  if (!k) { k = new TrialKeeper(id, trialFor(id)); keepers.set(id, k); }
  return k;
}

