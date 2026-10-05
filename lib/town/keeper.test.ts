import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HINT_IDS, HINT_PRICE, hintPrice } from "./hints";
import { DbKeeper, type Ask } from "./keeper";
import { shelfOf, sourcesAt } from "./orders";
import { SKIES } from "./skies";
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
    // (and, the game being theirs: whether there is a notice board beside the stall, for the uncle to offer by name;
    // whether the chest in the plaza is a storage box, with what I keep in it; and everybody's rank at the well, for
    // the names over heads)
    expect(db.asked).toEqual(["town_is_open", "town_me", "town_notices", "town_box", "town_well_ranks"]);
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
    expect(db.asked).toEqual(["town_is_open", "town_is_open", "town_is_open", "town_me", "town_notices", "town_box", "town_well_ranks"]);
    expect(k.open()).toBe(true);
    expect(k.ready()).toBe(true);
    expect(told).toBeGreaterThan(1);
    k.close();
    // closed, it asks no more
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    expect(db.asked).toHaveLength(7);
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
    expect(hintPrice(mine, [], (id) => sourcesAt(2, true).has(id))).toBe(HINT_PRICE[1]);
    expect(k.hintPrice()).toBeNull();
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

  it("keeps whom I have to thank, who thanked me, the board and the jar, each from the answer that brings it", async () => {
    const helper = { id: "bo", name: "Bo", water: 2, carry: 1 };
    const board = { today: [{ id: "cy", name: "Cy" }], week: 3, all: 9, top: [{ id: "me", name: "Me", n: 3 }], ever: [{ id: "me", name: "Me", n: 9 }] };
    const jar = (coins: number, mine: unknown = null) => ({ round: 7, coins, things: [], next: NOW + 3_600_000, mine });
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse({ coins: 20 }) }),
      town_well_ranks: () => ({ now: NOW, ranks: {}, thanked: [{ id: "di", name: "Di" }] }),
      town_to_thank: () => ({ now: NOW, toThank: { "133,5": [helper] } }),
      town_thank: (args) => ({ ok: true, thanked: ["bo"], now: NOW, toThank: {}, asked: args }),
      town_well: () => ({ now: NOW, wellBook: { buckets: 0, rank: 0, towards: 0, gift: false, today: {}, carriers: [] }, thanks: board, jar: jar(4) }),
      town_jar_drop: (args) => ({ ok: true, now: NOW, purse: purse({ coins: 15 }), jar: jar(9), asked: args }),
      town_jar_take: () => ({ ok: true, coins: 6, things: [["kangkong", 2]], now: NOW, purse: purse({ coins: 21 }), jar: jar(9) }),
    });
    const k = new DbKeeper("me", db.ask);
    await settle();
    // who thanked me today comes with everybody's rank
    expect(k.thanked()).toEqual([{ id: "di", name: "Di" }]);
    expect(k.toThank()).toEqual({});
    expect(k.thanks()).toBeNull();
    expect(k.jar()).toBeNull();
    await k.thankLook();
    expect(k.toThank()).toEqual({ "133,5": [helper] });
    // thanking tells the plot's tile, and the answer says who is left
    const did = await k.thankAt("133,5");
    expect(did).toMatchObject({ ok: true, thanked: ["bo"], asked: { p_x: 133, p_y: 5 } });
    expect(k.toThank()).toEqual({});
    // the book brings the board and the jar; the board's own "today" is who thanked me
    await k.wellLook();
    expect(k.thanks()).toEqual(board);
    expect(k.thanked()).toEqual([{ id: "cy", name: "Cy" }]);
    expect(k.jar()?.coins).toBe(4);
    // coins dropped, a thing dropped: each as the function takes it; the answer's purse and jar are kept
    expect(await k.jarDrop({ coins: 5 })).toMatchObject({ ok: true, asked: { p_coins: 5 } });
    expect([k.purse().coins, k.jar()?.coins]).toEqual([15, 9]);
    expect(await k.jarDrop({ slot: 2, n: 3 })).toMatchObject({ ok: true, asked: { p_slot: 2, p_n: 3 } });
    expect(await k.jarTake()).toMatchObject({ ok: true, coins: 6, things: [["kangkong", 2]] });
    expect(k.purse().coins).toBe(21);
    k.close();
  });

  it("knows of the heat, the pour over a bed and the yard's jar only where the database says there is a jar, and tells a pot that took its water", async () => {
    const bucket = (water: number): Purse => purse({ hand: "bucket", bag: [{ item: "bucket", n: 1, ...(water ? { water } : {}) }, ...Array(9).fill(null)] });
    const plant = { by: "di", crop: "pumpkin" as const, sown: NOW - 3_600_000, boost: 0, watered: 0, fed: 0, guard: NOW + 4 * 86_400_000, cured: 0, picked: 0, pickedAt: 0 };
    const plots = (watered: number) => ({ "132,5": { soil: "tilled", plant: { ...plant, watered } }, "133,5": { soil: "tilled", plant: { ...plant, watered } } });
    const pot = (left: number) => ({ item: "potFull", n: 1, of: { dish: "pumpkinSoup", left } });
    // (three in the afternoon in Bangkok, and a clear sky over this page)
    const sky = vi.spyOn(SKIES, "sky").mockReturnValue("clear");
    let jar: number | undefined, mine = bucket(1), pots: unknown[] = [];
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: mine }),
      town_well_ranks: () => ({ now: NOW, ranks: {}, ...(jar === undefined ? {} : { yard: { jar } }) }),
      town_farm: () => ({ now: NOW, well: 0, plots: plots(0), beds: {} }),
      town_hold: () => ({ ok: true, now: NOW, purse: (mine = bucket(1)) }),
      town_tend: () => ({ ok: true, deed: "water", got: [], now: NOW, purse: mine, key: "132,5", plot: plots(NOW)["132,5"], bed: null }),
      town_ditch: (args) => ({ ok: true, used: 1, watered: ["132,5", "133,5"], now: NOW, purse: (mine = bucket(0)), plots: plots(NOW), asked: args }),
      town_yard_pour: (args) => ({ ok: true, poured: 1, now: NOW, purse: (mine = bucket(0)), yard: { jar: (jar = (jar ?? 0) + 1) }, asked: args }),
      town_yard: () => ({ now: NOW, yard: { jar } }),
      town_kitchen: () => ({ now: NOW, pots: [], found: [], finders: {} }),
      town_cook: () => ({ ok: true, made: "pumpkinSoup", n: 5, first: false, now: NOW, purse: purse({ bag: [...pots, ...Array(10).fill(null)].slice(0, 10) as Purse["bag"] }) }),
    });
    // a database that says nothing of a jar: no heat, nothing to pour over a bed, no jar
    let k = new DbKeeper("me", db.ask);
    await settle();
    let stop = k.look("farm");
    await settle();
    expect([k.yardJar(), k.hot(), k.yardCanPour(), k.ditchAt("132,5")]).toEqual([null, false, false, []]);
    const farmAsked = () => db.asked.filter((f) => f === "town_farm").length;
    let asked = farmAsked();
    await k.farmDo("132,5", "Me");
    await settle();
    expect(farmAsked()).toBe(asked);
    stop();
    k.close();

    // …and one that does
    jar = 0;
    mine = bucket(1);
    k = new DbKeeper("me", db.ask);
    await settle();
    stop = k.look("farm");
    await settle();
    expect([k.yardJar(), k.hot(), k.yardCanPour()]).toEqual([0, true, true]);
    // the bucket in my hand would water both plants of the bed, the nearer first
    expect(k.ditchAt("133,5")).toEqual(["133,5", "132,5"]);
    expect(k.ditchAt("10,10")).toEqual([]);
    // a watering in the heat: the plot is kept with more than this answer says, so the farm is read again
    asked = farmAsked();
    await k.farmDo("132,5", "Me");
    await settle();
    expect(farmAsked()).toBe(asked + 1);
    // poured over the bed: told by the plot's tile, and the plots of the answer are kept
    const poured = await k.ditchDo("133,5");
    expect(poured).toMatchObject({ ok: true, used: 1, watered: ["132,5", "133,5"], asked: { p_x: 133, p_y: 5 } });
    expect(k.farm()["133,5"].plant?.watered).toBe(NOW);
    expect(k.ditchAt("133,5")).toEqual([]);
    // the jar: poured into from where I stand, and the answer says how full it is
    await k.hold(0);
    expect(await k.yardPour(null)).toEqual({ ok: false, why: "none" });
    expect(await k.yardPour([46, 38])).toMatchObject({ ok: true, poured: 1, asked: { p_x: 46, p_y: 38 } });
    expect([k.yardJar(), k.yardCanPour()]).toEqual([1, false]);
    // a soup that comes with a helping more than the rule of cooking says took the jar's water…
    pots = [pot(6)];
    expect(await k.cookDo([["pumpkin", 1]], ["pot"], [], { hits: 4, misses: 0, secs: 5 })).toMatchObject({ ok: true, n: 5, fresh: true });
    expect(k.yardJar()).toBe(0);
    // …and one that comes with what the rule says did not, whatever other pots of it I hold
    pots = [pot(6), pot(5)];
    const plain = await k.cookDo([["pumpkin", 1]], ["pot"], [], { hits: 4, misses: 0, secs: 5 });
    expect(plain.ok && !plain.fresh).toBe(true);
    expect(k.yardJar()).toBe(0);
    // under cloud it is not hot
    sky.mockReturnValue("cloudy");
    expect(k.hot()).toBe(false);
    stop();
    k.close();
    sky.mockRestore();
  });

  it("hands water on only where the database says there is a line, tells whoever takes it through the room, and reads the purse again when told it was handed some", async () => {
    const bucket = (water: number): Purse => purse({ hand: "bucket", bag: [{ item: "bucket", n: 1, ...(water ? { water } : {}) }, ...Array(9).fill(null)] });
    let line = false, mine = bucket(1);
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: mine }),
      town_well_ranks: () => ({ now: NOW, ranks: {}, ...(line ? { line: true } : {}) }),
      town_pass: (args) => ({ ok: true, n: 1, can: "bucket", into: "bucket", now: NOW, purse: (mine = bucket(0)), asked: args }),
    });
    // a database that says nothing of a line: a full bucket is not offered to be handed on
    let k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.canPass()).toBe(false);
    k.close();
    // …and one that does
    line = true;
    k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.canPass()).toBe(true);
    const told: Array<[string, string | undefined]> = [];
    k.onDeed = (what, to) => { told.push([what, to]); };
    expect(await k.passTo("you")).toMatchObject({ ok: true, n: 1, asked: { p_to: "you" } });
    expect(told).toEqual([["line", "you"]]);
    // (my bucket is empty now, as the answer's purse says)
    expect(k.canPass()).toBe(false);
    // told through the room that somebody handed me water: my purse is read again, whatever I am looking at
    mine = bucket(1);
    const before = db.asked.filter((f) => f === "town_me").length;
    k.nudged("line");
    await settle();
    expect(db.asked.filter((f) => f === "town_me").length).toBe(before + 1);
    expect(k.canPass()).toBe(true);
    k.close();
  });

  it("knows what the well's water is only where the database tells of it, reads it again when water is poured or the farm stirs, and names a bucket's water by its moment", async () => {
    let told: unknown, water: unknown = { kind: "dawn", by: "bo", until: NOW + 10 * 60_000 };
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }),
      town_well_ranks: () => ({ now: NOW, ranks: {}, ...(told === undefined ? {} : { wellWater: told }) }),
      town_chore: () => ({ ok: true, chore: "pour", well: 3, now: NOW, purse: purse() }),
    });
    const raining = vi.spyOn(SKIES, "raining").mockReturnValue(true);
    // a database that says nothing of the well's water: none, and a bucket's water is not named
    let k = new DbKeeper("me", db.ask);
    await settle();
    expect([k.wellWater(), k.drawnNow()]).toEqual([null, null]);
    const ranks = () => db.asked.filter((f) => f === "town_well_ranks").length;
    let asked = ranks();
    await k.choreDo("well", [1, 1]);
    k.nudged("farm");
    await settle();
    expect(ranks()).toBe(asked);
    k.close();
    // …and one that tells of it
    told = water;
    k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.wellWater()).toEqual(water);
    // (water drawn while it rains is the rain's; at three in the afternoon under a dry sky, plain)
    expect(k.drawnNow()).toBe("rain");
    raining.mockReturnValue(false);
    expect(k.drawnNow()).toBeNull();
    // a bucket poured into the well may have changed its water: it is asked for again
    asked = ranks();
    told = water = { kind: "rain", by: "me", until: NOW + 30 * 60_000 };
    await k.choreDo("well", [1, 1]);
    await settle();
    expect(ranks()).toBe(asked + 1);
    expect(k.wellWater()).toEqual(water);
    // …and so it is when the room says something was done on the farm
    told = null;
    k.nudged("farm");
    await settle();
    expect(ranks()).toBe(asked + 2);
    expect(k.wellWater()).toBeNull();
    // a nature that has run out by this page's clock is none, though nobody has said so yet
    told = { kind: "moon", by: "bo", until: NOW + 60_000 };
    k.nudged("farm");
    await settle();
    expect(k.wellWater()?.kind).toBe("moon");
    vi.setSystemTime(NOW + 61_000);
    expect(k.wellWater()).toBeNull();
    k.close();
    raining.mockRestore();
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
      if (fn !== "town_buy") { answer(fn === "town_is_open" ? true : fn === "town_well_ranks" ? { now: NOW, ranks: {} } : fn === "town_notices" || fn === "town_box" ? { now: NOW } : { now: NOW, purse: purse() }); return; }
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

  it("keeps my storage box as it is told of it, and knows of none where the database has none", async () => {
    const empty = Array<null>(10).fill(null), asked: Array<Record<string, unknown>> = [];
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }),
      town_box: () => ({ now: NOW, box: { things: [{ item: "minnow", n: 5 }, ...empty.slice(1)], more: 0 } }),
      town_box_put: (a) => { asked.push(a); return { ok: true, item: "rod", n: 1, now: NOW, purse: purse({ coins: 2 }), box: { things: [{ item: "minnow", n: 5 }, { item: "rod", n: 1 }, ...empty.slice(2)], more: 0 } }; },
      town_box_take: (a) => { asked.push(a); return { ok: false, why: "full", now: NOW, purse: purse({ coins: 2 }), box: { things: [{ item: "minnow", n: 5 }, { item: "rod", n: 1 }, ...empty.slice(2)], more: 0 } }; },
    });
    const k = new DbKeeper("me", db.ask);
    expect(k.box()).toBeNull();
    await settle();
    // asked for once as the game begins: what I keep is known before the chest is walked up to
    expect(k.box()?.things[0]).toEqual({ item: "minnow", n: 5 });
    expect(k.box()?.things).toHaveLength(10);
    const put = k.boxPut(3, 1, [35, 35]);
    await settle();
    // the slot, how many, and the tile I stand on; the answer brings the purse and the box as they now stand
    expect(await put).toMatchObject({ ok: true, item: "rod", n: 1 });
    expect(asked[0]).toEqual({ p_slot: 3, p_n: 1, p_x: 35, p_y: 35 });
    expect(k.box()?.things[1]).toEqual({ item: "rod", n: 1 });
    expect(k.purse().coins).toBe(2);
    const take = k.boxTake(1, 1, [33, 34]);
    await settle();
    expect(await take).toEqual({ ok: false, why: "full" });
    expect(asked[1]).toEqual({ p_slot: 1, p_n: 1, p_x: 33, p_y: 34 });
    k.close();

    // a database that has no box yet answers nothing: the chest is only a chest, and nothing can be put away
    const old = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }) });
    const o = new DbKeeper("me", old.ask);
    await settle();
    expect(old.asked).toContain("town_box");
    expect(o.box()).toBeNull();
    const none = o.boxPut(0, 1, [35, 35]);
    await settle();
    expect(await none).toEqual({ ok: false, why: "away" });
    expect(o.box()).toBeNull();
    o.close();
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
