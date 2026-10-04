import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HINT_IDS, nextHint } from "./hints";
import { DbKeeper, type Ask } from "./keeper";
import { shelfOf, sourcesAt } from "./orders";
import { newPurse, type Purse } from "./trade";
import { bedOf } from "./world";

/**
 * The database's keeper, with the database played by a script: what is asked,
 * in what order, and what is kept of each answer. (Against the real functions
 * it is tried by the fc-cash-town skill's scripts/db/keeper.test.mjs, in a
 * stand-in database; this one runs with every `npm test`.)
 */

const NOW = 1_800_000_000_000;
const purse = (more: Partial<Purse> = {}): Purse => ({ ...newPurse({ profile: 30, gallery: 0 }), ...more });
/** A database that answers each function from a table of answers (a function of its arguments), and writes down what it was asked. */
function database(answers: Record<string, (args: Record<string, unknown>) => unknown>) {
  const asked: string[] = [];
  const ask: Ask = async (fn, args = {}) => {
    asked.push(fn);
    const answer = answers[fn];
    if (!answer) return null;
    return answer(args);
  };
  return { ask, asked };
}
/** Let everything that is waiting on an answer go on. */
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); await vi.advanceTimersByTimeAsync(0); };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe("the database's keeper", () => {
  it("asks first whether the game is open, then for the purse", async () => {
    const db = database({ town_is_open: () => true, town_me: () => ({ now: NOW + 5000, purse: purse({ coins: 7 }) }) });
    const k = new DbKeeper("me", db.ask);
    expect(k.ready()).toBe(false);
    expect(k.open()).toBeNull();
    await settle();
    // (and, the game being theirs, everybody's rank at the well, for the names over heads)
    expect(db.asked).toEqual(["town_is_open", "town_me", "town_well_ranks"]);
    expect(k.ready()).toBe(true);
    expect(k.open()).toBe(true);
    expect(k.purse().coins).toBe(7);
    // the clock is the database's
    expect(Math.round((k.now() - Date.now()) / 1000)).toBe(5);
    k.close();
  });

  it("told the game is not open, asks nothing more; and asks again now and then, so that it opens here when its owner opens it", async () => {
    let open = false;
    const db = database({ town_is_open: () => open, town_me: () => ({ now: NOW, purse: purse() }) });
    const k = new DbKeeper("me", db.ask);
    let told = 0;
    k.watch(() => { told++; });
    await settle();
    expect(db.asked).toEqual(["town_is_open"]);
    expect(k.open()).toBe(false);
    expect(k.ready()).toBe(false);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 100);
    await settle();
    expect(db.asked).toEqual(["town_is_open", "town_is_open"]);
    expect(k.open()).toBe(false);
    open = true;
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 100);
    await settle();
    expect(db.asked).toEqual(["town_is_open", "town_is_open", "town_is_open", "town_me", "town_well_ranks"]);
    expect(k.open()).toBe(true);
    expect(k.ready()).toBe(true);
    expect(told).toBeGreaterThan(1);
    k.close();
    // closed, it asks no more
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    expect(db.asked).toHaveLength(5);
  });

  it("refused the purse by a database that has not heard the question, says the game is not open", async () => {
    const db = database({ town_me: () => ({ denied: true }) });
    const k = new DbKeeper("me", db.ask);
    await settle();
    expect(db.asked).toEqual(["town_is_open", "town_me"]);
    expect(k.open()).toBe(false);
    k.close();
  });

  it("says a town that cannot be reached is away, and asks again by itself", async () => {
    let up = false;
    const db = database({ town_is_open: () => (up ? true : null), town_me: () => (up ? { now: NOW, purse: purse() } : null), town_buy: () => null });
    const k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.ready()).toBe(false);
    expect(await k.buy("worm", 1)).toEqual({ ok: false, why: "away" });
    up = true;
    await vi.advanceTimersByTimeAsync(4100);
    await settle();
    expect(k.ready()).toBe(true);
    k.close();
  });

  it("keeps what each answer brings: the purse, the stall, the shelf, a refusal's reason", async () => {
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse({ coins: 10 }) }),
      town_buy: (a) => (a.p_item === "rod" ? { ok: false, why: "coins", now: NOW, purse: purse({ coins: 10 }), stall: { round: 3, sold: {} } }
        : { ok: true, now: NOW, purse: purse({ coins: 8 }), stall: { round: 3, sold: { worm: 1 } } }),
      town_stall: () => ({ now: NOW, stall: { round: 3, sold: { worm: 1 } }, shelf: Array(23).fill("worm"), unlocked: 2, found: ["friedMinnow"], order: { day: 1, wants: [], filled: false, opens: null } }),
    });
    const k = new DbKeeper("me", db.ask);
    expect(await k.buy("rod", 1)).toMatchObject({ ok: false, why: "coins" });
    expect((await k.buy("worm", 1)).ok).toBe(true);
    expect(k.purse().coins).toBe(8);
    expect(k.stall().sold.worm).toBe(1);
    expect(k.order()).toBeNull();
    const stop = k.look("stall");
    await settle();
    expect(k.shelf()).toHaveLength(23);
    expect(k.order()?.day).toBe(1);
    expect(k.found()).toEqual(["friedMinnow"]);
    stop();
    k.close();
  });

  it("leaves off the shelf a thing this page was built before, and takes the uncle's own count of his orders filled", async () => {
    const shelf = [...shelfOf(0), "seedGarlic", "somethingOfNextWeek"];
    // (somebody who has every hint there is with one order filled: with two there would be another to buy)
    const mine = purse({ hints: HINT_IDS.filter((id) => sourcesAt(1, true).has(id)) });
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: mine }),
      town_stall: () => ({ now: NOW, stall: { round: 3, sold: {} }, shelf, unlocked: 1, found: [], order: null }),
    });
    const k = new DbKeeper("me", db.ask);
    const stop = k.look("stall");
    await settle();
    expect(k.shelf()).toEqual([...shelfOf(0), "seedGarlic"]);
    // (one order filled, as he says: not two, as a shelf two longer than the first day's would say)
    expect(nextHint(mine, [], (id) => sourcesAt(2, true).has(id))).not.toBeNull();
    expect(k.nextHint()).toBeNull();
    stop();
    k.close();
  });

  it("keeps the well's book and everybody's rank: asked for at the beginning and now and then, the book when it is looked at", async () => {
    const book = (more: Record<string, unknown> = {}) => ({ buckets: 12, rank: 0, towards: 0.24, gift: false, today: { buckets: 2, waterings: 5, plants: 3, people: 2, watered: 0, helped: 0 }, carriers: [], ...more });
    let poured = 12;
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }),
      town_well_ranks: () => ({ now: NOW, ranks: { somebody: 2 } }),
      town_well: () => ({ now: NOW, wellBook: book({ buckets: poured, rank: poured >= 50 ? 1 : 0, gift: poured >= 50 }) }),
      town_chore: () => ({ ok: true, chore: "pour", well: 7, now: NOW, purse: purse() }),
      town_well_take: () => ({ ok: true, gift: "waterYoke", rank: 1, now: NOW, purse: purse({ coins: 1 }), wellBook: book({ buckets: poured, rank: 1 }) }),
    });
    const k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.ranks()).toEqual({ somebody: 2 });
    expect(k.wellBook()).toBeNull();
    // a bucketful poured by somebody who has not opened the book asks for no book
    await k.choreDo("well", [1, 1]);
    await settle();
    expect(db.asked.filter((f) => f === "town_well")).toHaveLength(0);
    await k.wellLook();
    expect(k.wellBook()?.buckets).toBe(12);
    expect(k.ranks()).toEqual({ somebody: 2 });
    // …and by somebody who has, reads it again: the rank it says is mine at once, with everybody's as they were
    poured = 50;
    await k.choreDo("well", [1, 1]);
    await settle();
    expect(db.asked.filter((f) => f === "town_well")).toHaveLength(2);
    expect(k.wellBook()).toMatchObject({ buckets: 50, rank: 1, gift: true });
    expect(k.ranks()).toEqual({ somebody: 2, me: 1 });
    // what the well has is taken: the answer brings the purse and the book
    const did = await k.wellTake();
    expect(did).toMatchObject({ ok: true, gift: "waterYoke", rank: 1 });
    expect(k.purse().coins).toBe(1);
    expect(k.wellBook()?.gift).toBe(false);
    // everybody's rank is asked for again every five minutes, and no more once it is closed
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 100);
    await settle();
    expect(db.asked.filter((f) => f === "town_well_ranks")).toHaveLength(2);
    k.close();
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    expect(db.asked.filter((f) => f === "town_well_ranks")).toHaveLength(2);
  });

  it("offers no book where the database has none yet: nothing is kept of an answer that never came", async () => {
    const db = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }) });
    const k = new DbKeeper("me", db.ask);
    await settle();
    await k.wellLook();
    expect(k.wellBook()).toBeNull();
    expect(k.ranks()).toEqual({});
    expect(await k.wellTake()).toEqual({ ok: false, why: "away" });
    k.close();
  });

  it("answers in the order asked, whatever order the answers would come in", async () => {
    const waits: Record<string, number> = { a: 300, b: 10, c: 100 };
    const done: string[] = [];
    const ask: Ask = (fn, args = {}) => new Promise((answer) => {
      if (fn !== "town_buy") { answer(fn === "town_is_open" ? true : fn === "town_well_ranks" ? { now: NOW, ranks: {} } : { now: NOW, purse: purse() }); return; }
      setTimeout(() => { done.push(String(args.p_item)); answer({ ok: true, now: NOW, purse: purse({ coins: done.length }) }); }, waits[String(args.p_item)]);
    });
    const k = new DbKeeper("me", ask);
    const all = Promise.all([k.buy("a" as never, 1), k.buy("b" as never, 1), k.buy("c" as never, 1)]);
    await vi.advanceTimersByTimeAsync(1000);
    await all;
    expect(done).toEqual(["a", "b", "c"]);
    expect(k.purse().coins).toBe(3);
    k.close();
  });

  it("keeps the farm as it is told of it: what changed, a plot gone back to weeds, whose a bed is", async () => {
    const bed = bedOf(133, 5);
    const plant = { by: "me", crop: "kangkong", sown: NOW, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
    let since = -1;
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }),
      town_farm: (a) => {
        since = Number(a.p_since);
        return since === 0
          ? { now: NOW + 1, well: 4, plots: { "133,5": { soil: "tilled", plant }, "134,5": { soil: "cleared", plant: null } }, beds: { [bed]: { by: "me", tended: NOW, empty: 0, name: "Me" } } }
          : { now: NOW + 2, well: 5, plots: { "134,5": { soil: "wild", plant: null } }, beds: { [bed]: { by: "me", tended: NOW, empty: 0, name: "Me" } } };
      },
      town_tend: () => ({ ok: true, now: NOW + 3, purse: purse(), deed: "clear", got: [], key: "135,5", plot: { soil: "cleared", plant: null }, bed: null, misses: 0 }),
    });
    const k = new DbKeeper("me", db.ask);
    const told: string[] = [];
    k.onDeed = (what) => told.push(what);
    const stop = k.look("farm");
    await settle();
    expect(Object.keys(k.farm()).sort()).toEqual(["133,5", "134,5"]);
    expect(k.well()).toBe(4);
    expect(k.owners().get(bed)).toEqual({ by: "me", name: "Me" });
    k.nudged("farm");
    await settle();
    // only what changed since the last answer was asked for; a plot back to weeds is forgotten
    expect(since).toBe(NOW + 1);
    expect(Object.keys(k.farm())).toEqual(["133,5"]);
    expect(k.well()).toBe(5);
    expect((await k.farmDo("135,5", "Me")).ok).toBe(true);
    expect(k.farm()["135,5"]?.soil).toBe("cleared");
    expect(told).toEqual(["farm"]);
    stop();
    k.close();
  });

  it("looks again in its time while somebody is looking, and not after", async () => {
    const db = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }), town_kitchen: () => ({ now: NOW, pots: [], found: [], finders: {} }) });
    const k = new DbKeeper("me", db.ask);
    const stop = k.look("kitchen");
    await settle();
    const count = () => db.asked.filter((f) => f === "town_kitchen").length;
    expect(count()).toBe(1);
    await vi.advanceTimersByTimeAsync(91_000);
    expect(count()).toBe(2);
    // a nudge is taken while it is looked at
    k.nudged("kitchen");
    await settle();
    expect(count()).toBe(3);
    stop();
    k.nudged("kitchen");
    await vi.advanceTimersByTimeAsync(200_000);
    expect(count()).toBe(3);
    k.close();
  });

  it("counts a meal on with the database when the company changes, not every second", async () => {
    const eating = { dish: "riceBox" as const, meal: 0 as const, from: NOW, till: NOW, got: 0 };
    const db = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse({ eating }) }), town_chew: () => ({ ok: true, done: false, now: NOW, purse: purse({ eating }) }) });
    const k = new DbKeeper("me", db.ask);
    await settle();
    const chews = () => db.asked.filter((f) => f === "town_chew").length;
    for (let i = 0; i < 5; i++) { k.chew(0); await vi.advanceTimersByTimeAsync(1000); }
    expect(chews()).toBe(1);
    k.chew(2);
    await settle();
    expect(chews()).toBe(2);
    await vi.advanceTimersByTimeAsync(21_000);
    k.chew(2);
    await settle();
    expect(chews()).toBe(3);
    k.close();
  });

  it("shows an ended deal for a moment, reads the purse again when it was the other who ended it, then forgets it", async () => {
    const open = { a: "me", b: "you", at: 5, names: { a: "Me", b: "You" }, give: { a: [], b: [] }, coins: { a: 0, b: 0 }, ok: { a: false, b: false }, id: 1, mine: "a", end: null };
    let deal: unknown = open;
    const db = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse({ coins: db.asked.filter((f) => f === "town_me").length }) }), town_deal: () => ({ now: NOW, deal }) });
    const k = new DbKeeper("me", db.ask);
    k.nudged("deal");
    await settle();
    expect(k.deal()?.end).toBeUndefined();
    deal = { ...open, end: "done" };
    k.nudged("deal");
    await settle();
    expect(k.deal()?.end).toBe("done");
    // the purse was asked for again: what changed hands is in it
    expect(db.asked.filter((f) => f === "town_me")).toHaveLength(2);
    expect(k.purse().coins).toBe(2);
    await vi.advanceTimersByTimeAsync(6100);
    expect(k.deal()).toBeNull();
    // told of the same ended deal again (the database tells it a little longer), it stays forgotten
    k.nudged("deal");
    await settle();
    expect(k.deal()).toBeNull();
    k.close();
  });
});
