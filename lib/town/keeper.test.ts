import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inPestHours, pestAt, pestHour, roll, see, type Plant } from "./farm";
import { HINT_IDS, HINT_PRICE, hintPrice } from "./hints";
import { DbKeeper, type Ask } from "./keeper";
import { shelfOf, sourcesAt } from "./orders";
import { SKIES } from "./skies";
import { newPurse, type Purse, type Stack } from "./trade";
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
    // whether the chest in the plaza is a storage box, with what I keep in it; whether a bag can be put in order;
    // whether things can be dropped on the ground, with what lies about; whether the village has works, with what I
    // carry in my hands; and everybody's rank at the well, for the names over heads)
    expect(db.asked).toEqual(["town_is_open", "town_me", "town_notices", "town_box", "town_bag", "town_ground", "town_shop", "town_works_read", "town_well_ranks", "town_work"]);
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
    expect(db.asked).toEqual(["town_is_open", "town_is_open", "town_is_open", "town_me", "town_notices", "town_box", "town_bag", "town_ground", "town_shop", "town_works_read", "town_well_ranks", "town_work"]);
    expect(k.open()).toBe(true);
    expect(k.ready()).toBe(true);
    expect(told).toBeGreaterThan(1);
    k.close();
    // closed, it asks no more
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    expect(db.asked).toHaveLength(12);
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

  it("holds a pot of food by the slot it was taken up from and sets that one down, saying the slot only when it is not the first pot there is", async () => {
    const pot = (left: number): Stack => ({ item: "potFull", n: 1, of: { dish: "friedMinnow", left } });
    let mine = purse({ bag: [pot(4), { item: "salt", n: 1 }, pot(3), pot(2), null, null, null, null, null, null] });
    const sent: Array<Record<string, unknown>> = [];
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: mine }),
      town_hold: ({ p_slot }) => {
        const s = p_slot === null ? null : mine.bag[p_slot as number];
        if (p_slot !== null && !s) return { ok: false, why: "none", now: NOW, purse: mine };
        mine = { ...mine, hand: s?.item ?? null };
        return { ok: true, now: NOW, purse: mine };
      },
      // (as v158's: the slot that is said, or with none the first pot of the bag)
      town_pot_down: (args) => {
        sent.push(args);
        const slot = "p_slot" in args ? (args.p_slot as number) : mine.bag.findIndex((s) => s?.item === "potFull"), s = mine.bag[slot];
        if (s?.item !== "potFull" || !s.of) return { ok: false, why: "none", now: NOW, purse: mine };
        mine = { ...mine, bag: mine.bag.map((b, i) => (i === slot ? null : b)) };
        return { ok: true, now: NOW, purse: mine, pot: { id: String(sent.length), by: "me", dish: s.of.dish, left: s.of.left, at: [args.p_x, args.p_y] } };
      },
    });
    const k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.handSlot()).toBe(-1);
    // taken up from a slot: that slot is the hand's, and whoever watches is told once it is
    const seen: number[] = [];
    const stop = k.watch(() => { seen.push(k.handSlot()); });
    expect(await k.hold(3)).toMatchObject({ ok: true });
    expect(k.handSlot()).toBe(3);
    expect(seen.at(-1)).toBe(3);
    // an empty slot taken up is refused, and the hand is where it was
    expect(await k.hold(5)).toMatchObject({ ok: false });
    expect(k.handSlot()).toBe(3);
    // set down: the pot of that slot, said by its slot
    expect(await k.potDown([20, 20], k.handSlot())).toMatchObject({ ok: true, pot: { left: 2 } });
    expect(sent.at(-1)).toEqual({ p_x: 20, p_y: 20, p_slot: 3 });
    expect(k.purse().bag.map((s) => s?.of?.left ?? null).slice(0, 4)).toEqual([4, null, 3, null]);
    // its slot is empty now: the hand's pot is the first there is, which is asked for as it always was (a database that has not had v158 answers that)
    expect(k.handSlot()).toBe(0);
    expect(await k.potDown([24, 20], k.handSlot())).toMatchObject({ ok: true, pot: { left: 4 } });
    expect(sent.at(-1)).toEqual({ p_x: 24, p_y: 20 });
    // with no slot said at all, as a page from before: the first there is
    expect(await k.potDown([28, 20])).toMatchObject({ ok: true, pot: { left: 3 } });
    expect(sent.at(-1)).toEqual({ p_x: 28, p_y: 20 });
    expect(k.handSlot()).toBe(-1);
    // a page loaded again knows no slot: it holds the first pot there is
    mine = purse({ bag: [null, pot(5), pot(6), null, null, null, null, null, null, null], hand: "potFull" });
    const again = new DbKeeper("me", db.ask);
    await settle();
    expect(again.handSlot()).toBe(1);
    // …until one is taken up; and put away, there is none
    await again.hold(2);
    expect(again.handSlot()).toBe(2);
    await again.hold(null);
    expect(again.handSlot()).toBe(-1);
    stop();
    k.close(); again.close();
  });

  it("puts a bag in order only where the database says it can, and through a move and a sort the pot in the hand is the pot it was", async () => {
    const { moveSlot, sortBag } = await import("./bag");
    const pot = (left: number): Stack => ({ item: "potFull", n: 1, of: { dish: "friedMinnow", left } });
    let mine = purse({ bag: [pot(1), { item: "salt", n: 1 }, pot(3), null, pot(2), null, null, null, null, null], hand: "potFull" });
    const sent: string[] = [];
    const answers: Record<string, (args: Record<string, unknown>) => unknown> = {
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: mine }),
      town_hold: ({ p_slot }) => {
        const s = p_slot === null ? null : mine.bag[p_slot as number];
        if (p_slot !== null && !s) return { ok: false, why: "none", now: NOW, purse: mine };
        mine = { ...mine, hand: s?.item ?? null };
        return { ok: true, now: NOW, purse: mine };
      },
      town_bag_move: ({ p_from, p_to }) => {
        sent.push(`move ${p_from} ${p_to}`);
        const did = moveSlot(mine, p_from as number, p_to as number);
        if (did.ok) mine = did.purse;
        return { ok: did.ok, ...(did.ok ? {} : { why: did.why }), now: NOW, purse: mine };
      },
      town_bag_sort: () => { sent.push("sort"); mine = sortBag(mine); return { ok: true, now: NOW, purse: mine }; },
    };
    // a database that has not had the file: asked once, told nothing, and nothing offered
    const before = new DbKeeper("me", database(answers).ask);
    await settle();
    expect(before.bagTidy()).toBe(false);
    before.close();
    answers.town_bag = () => ({ ok: true, tidy: true, now: NOW });
    const db = database(answers);
    const k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.bagTidy()).toBe(true);
    expect(db.asked.filter((f) => f === "town_bag")).toHaveLength(1);
    const heldLeft = () => k.purse().bag[k.handSlot()]?.of?.left;
    // a page loaded again remembers no slot: the first pot there is, the one with one helping, is the one held
    expect(k.handSlot()).toBe(0);
    // …and changing places with another pot it is held still (Codex's check: with no slot remembered, the other became the hand's)
    expect(await k.bagMove(0, 2)).toMatchObject({ ok: true });
    expect([k.handSlot(), heldLeft()]).toEqual([2, 1]);
    // moved by the other pot's being dragged onto it, likewise
    expect(await k.bagMove(4, 2)).toMatchObject({ ok: true });
    expect([k.handSlot(), heldLeft()]).toEqual([4, 1]);
    // a move refused leaves the hand where it was
    expect(await k.bagMove(3, 4)).toMatchObject({ ok: false, why: "none" });
    expect([k.handSlot(), heldLeft()]).toEqual([4, 1]);
    // sorted, the fuller pots are first, and the pot in the hand is the one with one helping still
    expect(await k.bagSort()).toMatchObject({ ok: true });
    expect(k.purse().bag.slice(0, 4).map((s) => s?.of?.left ?? null)).toEqual([3, 2, 1, null]);
    expect([k.handSlot(), heldLeft()]).toEqual([2, 1]);
    // the same on a page loaded again, which remembers no slot: the first pot is held, and sorted it is that pot still
    mine = purse({ bag: [pot(1), null, pot(3), null, null, null, null, null, null, null], hand: "potFull" });
    const again = new DbKeeper("me", db.ask);
    await settle();
    expect([again.handSlot(), again.purse().bag[again.handSlot()]?.of?.left]).toEqual([0, 1]);
    expect(await again.bagSort()).toMatchObject({ ok: true });
    expect([again.handSlot(), again.purse().bag[again.handSlot()]?.of?.left]).toEqual([1, 1]);
    // another pot taken up and the bag sorted before that is answered: the slot is read in the sort's own turn (Codex's check)
    mine = purse({ bag: [pot(1), null, pot(3), pot(2), null, null, null, null, null, null], hand: "potFull" });
    const quick = new DbKeeper("me", db.ask);
    await settle();
    await quick.hold(0);
    const both = [quick.hold(3), quick.bagSort()];
    await settle();
    await Promise.all(both);
    expect(quick.purse().bag.slice(0, 3).map((s) => s?.of?.left)).toEqual([3, 2, 1]);
    expect([quick.handSlot(), quick.purse().bag[quick.handSlot()]?.of?.left]).toEqual([1, 2]);
    // with nothing in the hand no slot is made up
    await quick.hold(null);
    await quick.bagMove(0, 5);
    expect(quick.handSlot()).toBe(-1);
    expect(sent.at(-1)).toBe("move 0 5");
    // a thing let go of while a sort is not yet answered: by the move's turn another thing is in its slot, and the
    // move is not asked at all (Codex's second look: the hoe that the sort had put there was moved in its place)
    mine = purse({ bag: [{ item: "kangkong", n: 5 }, { item: "hoe", n: 1 }, null, null, null, null, null, null, null, null] });
    const late = new DbKeeper("me", db.ask);
    await settle();
    const from = sent.length;
    const pair = [late.bagSort(), late.bagMove(0, 3)];
    await settle();
    expect(await Promise.all(pair)).toEqual([expect.objectContaining({ ok: true }), { ok: false, why: "none" }]);
    expect(sent.slice(from)).toEqual(["sort"]);
    expect(late.purse().bag.slice(0, 4).map((s) => s?.item ?? null)).toEqual(["hoe", "kangkong", null, null]);
    // …and a move asked of a slot that was empty is not made good by something having come into it meanwhile
    const two = [late.bagMove(1, 3), late.bagMove(3, 2)];
    await settle();
    expect(await Promise.all(two)).toEqual([expect.objectContaining({ ok: true }), { ok: false, why: "none" }]);
    expect(late.purse().bag.slice(0, 4).map((s) => s?.item ?? null)).toEqual(["hoe", null, null, "kangkong"]);
    k.close(); again.close(); quick.close(); late.close();
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
      if (fn !== "town_buy") { answer(fn === "town_is_open" ? true : fn === "town_well_ranks" ? { now: NOW, ranks: {} } : fn === "town_notices" || fn === "town_box" || fn === "town_bag" || fn === "town_ground" || fn === "town_shop" || fn === "town_works_read" || fn === "town_work" ? { now: NOW } : { now: NOW, purse: purse() }); return; }
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

  // ── the bridge built by hand ── (lib/town/bridge; v160)
  it("keeps the village's works as it is told them, tells the taker of a stone and everybody of every stone laid, and knows of none where the database has none", async () => {
    // (the spans' hands and what was found in the stones come with it, once a stone is laid)
    const bridge = (have: number, mine: number, helpers: string[] = []) => ({ open: true, done: null, needs: { stone: { need: 600, have } }, helpers: helpers.map((id) => ({ id, name: id })), mine: mine ? { stone: mine } : {},
      built: helpers.length ? { 1: helpers.map((id) => ({ id, name: id })) } : {}, finds: have >= 100 ? [{ kind: "pearl", at: NOW, span: 1, hands: helpers.map((id) => ({ id, name: id })) }] : [] });
    let told: unknown = { works: { bridge: bridge(98, 0) }, carried: null };
    const sent: Array<[string, Record<string, unknown>]> = [], nudges: Array<[string, string | undefined]> = [];
    const answer = (more: Record<string, unknown> = {}) => ({ now: NOW, purse: purse(), works: told, ...more });
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }),
      town_works_read: () => ({ now: NOW, works: told }),
      town_stone_lift: (a) => { sent.push(["lift", a]); told = { works: { bridge: bridge(98, 0) }, carried: { work: "bridge", thing: "stone" } }; return answer({ ok: true }); },
      town_stone_pass: (a) => { sent.push(["pass", a]); told = { works: { bridge: bridge(98, 0) }, carried: null }; return answer({ ok: true }); },
      town_stone_lay: (a) => {
        sent.push(["lay", a]);
        const have = ((told as { works: { bridge: { needs: { stone: { have: number } } } } }).works.bridge.needs.stone.have) + 1;
        told = { works: { bridge: bridge(have, 1, ["me"]) }, carried: null };
        return answer({ ok: true, have, spans: Math.floor(have / 100), span: have % 100 === 0, whole: false, into: 1, find: have === 100 ? "pearl" : null });
      },
      town_stone_drop: () => { sent.push(["drop", {}]); return answer({ ok: false, why: "none" }); },
    });
    const k = new DbKeeper("me", db.ask);
    k.onDeed = (what, to) => { nudges.push([what, to]); };
    expect(k.works()).toBeNull();
    await settle();
    // asked for once as the game begins: the bridge is known before its pile is walked up to
    expect(k.works()?.works.bridge).toMatchObject({ open: true, needs: { stone: { need: 600, have: 98 } } });
    expect(k.works()?.carried).toBeNull();
    // lifting: the tile I stand on; the answer brings what I carry, and nobody else is told through the room
    const lift = k.stoneLift([41, 28]);
    await settle();
    expect(await lift).toMatchObject({ ok: true });
    expect(sent[0]).toEqual(["lift", { p_x: 41, p_y: 28 }]);
    expect(k.works()?.carried).toEqual({ work: "bridge", thing: "stone" });
    expect(nudges).toEqual([]);
    // handing on: to whom; whoever takes it is told through the room, and my hands are empty
    const pass = k.stonePass("them");
    await settle();
    expect(await pass).toMatchObject({ ok: true });
    expect(sent[1]).toEqual(["pass", { p_to: "them" }]);
    expect(k.works()?.carried).toBeNull();
    expect(nudges).toEqual([["works", "them"]]);
    // laying: the tile; every stone laid is told to everybody (each page shows whoever had a hand in it what it earned), the one that finishes a span like any other
    const one = k.stoneLay([12, 28]);
    await settle();
    expect(await one).toMatchObject({ ok: true, have: 99, span: false, into: 1, find: null });
    expect(sent[2]).toEqual(["lay", { p_x: 12, p_y: 28 }]);
    expect(nudges).toEqual([["works", "them"], ["works", undefined]]);
    expect(k.works()?.works.bridge).toMatchObject({ built: { 1: [{ id: "me", name: "me" }] }, finds: [] });
    const span = k.stoneLay([12, 28]);
    await settle();
    expect(await span).toMatchObject({ ok: true, have: 100, spans: 1, span: true, find: "pearl" });
    expect(nudges[2]).toEqual(["works", undefined]);
    expect(k.works()?.works.bridge).toMatchObject({ needs: { stone: { have: 100 } }, mine: { stone: 1 }, helpers: [{ id: "me", name: "me" }], finds: [{ kind: "pearl", at: NOW, span: 1, hands: [{ id: "me", name: "me" }] }] });
    // a refusal is the rule's own word, and what is kept is as it was told
    const none = k.stoneDrop();
    await settle();
    expect(await none).toEqual({ ok: false, why: "none" });
    // the room says the works changed (a stone handed to me, a span laid by somebody): asked for again, wherever I am
    told = { works: { bridge: bridge(100, 1, ["me"]) }, carried: { work: "bridge", thing: "stone" } };
    const before = db.asked.filter((fn) => fn === "town_works_read").length;
    k.nudged("works");
    await settle();
    expect(db.asked.filter((fn) => fn === "town_works_read").length).toBe(before + 1);
    expect(k.works()?.carried).toEqual({ work: "bridge", thing: "stone" });
    // a bridge that is not open is told as that and nothing more, whatever came with it
    told = { works: { bridge: { open: false, done: null, needs: { stone: { need: 600, have: 5 } }, helpers: [{ id: "me", name: "me" }], mine: { stone: 1 } } }, carried: null };
    await k.worksLook();
    expect(k.works()?.works.bridge).toEqual({ open: false, done: null, needs: {}, helpers: [], mine: {}, built: {}, finds: [] });
    k.close();

    // a database that has no works yet answers nothing: nothing of them is shown, nothing is asked for when the room
    // says so, and a stone asked for all the same could not be reached
    const old = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }) });
    const o = new DbKeeper("me", old.ask);
    await settle();
    expect(old.asked).toContain("town_works_read");
    expect(o.works()).toBeNull();
    const asked = old.asked.length;
    o.nudged("works");
    await o.worksLook();
    await settle();
    expect(old.asked).toHaveLength(asked);
    const away = o.stoneLift([41, 28]);
    await settle();
    expect(await away).toEqual({ ok: false, why: "away" });
    expect(o.works()).toBeNull();
    o.close();
  });

  it("keeps what lies on the ground as it is told of it, looks again while something lies, and asks when the room says so", async () => {
    let lying: unknown[] = [{ id: 7, by: "them", stack: { item: "minnow", n: 3 }, at: [30, 40], until: NOW + 10_000 }];
    const sent: Array<Record<string, unknown>> = [], told: string[] = [];
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }),
      town_ground: () => ({ now: Date.now(), ground: lying }),
      town_ground_drop: (a) => { sent.push(a); lying = [...lying, { id: 8, by: "me", stack: { item: "rod", n: 1 }, at: [31, 40], until: Date.now() + 10_000 }]; return { ok: true, id: 8, now: Date.now(), purse: purse({ coins: 1 }), ground: lying }; },
      town_ground_take: (a) => { sent.push(a); lying = lying.filter((d) => (d as { id: number }).id !== a.p_id); return a.p_id === 7 ? { ok: true, item: "minnow", n: 3, now: Date.now(), purse: purse({ coins: 2 }), ground: lying } : { ok: false, why: "lost", now: Date.now(), purse: purse({ coins: 2 }), ground: lying }; },
    });
    const k = new DbKeeper("me", db.ask);
    k.onDeed = (what) => { told.push(what); };
    expect(k.ground()).toBeNull();
    await settle();
    // asked for once as the game begins: what lies about is known without anybody saying so
    expect(k.ground()).toHaveLength(1);
    expect(k.ground()![0]).toMatchObject({ id: 7, stack: { item: "minnow", n: 3 }, at: [30, 40] });
    // while something lies it is looked at again every few seconds, by itself
    const before = db.asked.filter((f) => f === "town_ground").length;
    await vi.advanceTimersByTimeAsync(3100);
    await settle();
    expect(db.asked.filter((f) => f === "town_ground").length).toBe(before + 1);
    // dropping: the slot and the tile I stand on; the room is told
    const drop = k.groundDrop(2, [31, 40]);
    await settle();
    expect(await drop).toMatchObject({ ok: true, id: 8 });
    expect(sent[0]).toEqual({ p_slot: 2, p_x: 31, p_y: 40 });
    expect(told).toEqual(["ground"]);
    expect(k.ground()!.map((d) => d.id)).toEqual([7, 8]);
    expect(k.purse().coins).toBe(1);
    // picking up: which, and the tile; it lies there no longer, and the room is told again
    const take = k.groundTake(7, [30, 41]);
    await settle();
    expect(await take).toMatchObject({ ok: true, item: "minnow", n: 3 });
    expect(sent[1]).toEqual({ p_id: 7, p_x: 30, p_y: 41 });
    expect(told).toEqual(["ground", "ground"]);
    expect(k.ground()!.map((d) => d.id)).toEqual([8]);
    // one that is not there any more is taken off what is known, and nobody is told
    const late = k.groundTake(99, [30, 41]);
    await settle();
    expect(await late).toEqual({ ok: false, why: "lost" });
    expect(told).toHaveLength(2);
    // a thing's time runs out: it is no longer among what lies, with nothing asked for that
    lying = [];
    await vi.advanceTimersByTimeAsync(11_000);
    await settle();
    expect(k.ground()).toEqual([]);
    // with nothing lying nothing is asked, until the room says something was dropped
    const quiet = db.asked.filter((f) => f === "town_ground").length;
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(db.asked.filter((f) => f === "town_ground").length).toBe(quiet);
    lying = [{ id: 9, by: "them", stack: { item: "kangkong", n: 5 }, at: [20, 20], until: Date.now() + 10_000 }];
    k.nudged("ground");
    await settle();
    expect(k.ground()!.map((d) => d.id)).toEqual([9]);
    // (a thing this page was built before is left out: it could not be drawn)
    lying = [{ id: 10, by: "them", stack: { item: "somethingNew", n: 1 }, at: [20, 20], until: Date.now() + 10_000 }];
    k.nudged("ground");
    await settle();
    expect(k.ground()).toEqual([]);
    k.close();

    // a database that keeps no ground answers nothing: nothing lies, the room's word asks nothing, and a thing is only thrown away
    const old = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }) });
    const o = new DbKeeper("me", old.ask);
    await settle();
    expect(o.ground()).toBeNull();
    const asked = old.asked.length;
    o.nudged("ground");
    await settle();
    expect(old.asked).toHaveLength(asked);
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

  it("keeps the hours the farm had insects on it as it is told them, each telling laid over the last, and works the pests out by them; none where the database tells none", async () => {
    // a pumpkin sown at six one morning; a plot whose roll for nine o'clock is between four and five in a hundred, with no pest before: found by looking
    const HOUR = 3_600_000, NINE = Math.ceil(NOW / (24 * HOUR)) * 24 * HOUR + 2 * HOUR, H = pestHour(NINE), SOWN = NINE - 3 * HOUR;
    expect(inPestHours(NINE)).toBe(true);
    const plant: Plant = { by: "me", crop: "pumpkin", sown: SOWN, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
    let key = "";
    for (let x = 132; x < 190 && !key; x++) for (let y = 4; y < 40 && !key; y++) {
      const k = `${x},${y}`, r = roll(k, H, SOWN);
      if (r >= 0.04 && r < 0.05 && pestAt(k, plant, NINE + HOUR - 1) === null) key = k;
    }
    expect(key).not.toBe("");
    let asked = 0;
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }),
      // (the first look: the plot, and an earlier hour that had some; the second: nine o'clock, with many; the third: nothing new)
      town_farm: () => { asked++; return { now: NOW + asked, well: 0, plots: asked === 1 ? { [key]: { soil: "tilled", plant } } : {}, beds: {}, swarms: asked === 1 ? { [H - 1]: 2 } : asked === 2 ? { [H]: 6 } : {} }; },
    });
    const k = new DbKeeper("me", db.ask);
    const stop = k.look("farm");
    await settle();
    const pest = () => see(key, k.farm()[key], NINE + HOUR - 1, k.rains()).pest;
    // told only of the hour before, which has nothing for this plot: no pest
    expect(k.rains()).toMatchObject({ swarms: { [H - 1]: 2 } });
    expect(pest()).toBe(false);
    // told of nine o'clock too: both hours are kept, and the plant has had a pest since nine
    k.nudged("farm");
    await settle();
    expect(k.rains()).toMatchObject({ swarms: { [H - 1]: 2, [H]: 6 } });
    expect(pest()).toBe(true);
    expect(pestAt(key, plant, NINE + HOUR - 1, k.rains())).toBe(NINE);
    // told nothing new: what it has, it keeps
    k.nudged("farm");
    await settle();
    expect(asked).toBe(3);
    expect(pest()).toBe(true);
    stop();
    k.close();
    // a database that tells no hours (it has not had the file): the pests are as they always were
    const old = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }), town_farm: () => ({ now: NOW + 1, well: 0, plots: { [key]: { soil: "tilled", plant } }, beds: {} }) });
    const o = new DbKeeper("me", old.ask), halt = o.look("farm");
    await settle();
    expect(o.rains()).toMatchObject({ swarms: {} });
    expect(see(key, o.farm()[key], NINE + HOUR - 1, o.rains()).pest).toBe(false);
    // …and what is not an hour and a number is not kept
    const odd = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }), town_farm: () => ({ now: NOW + 1, well: 0, plots: {}, beds: {}, swarms: { [H]: "many", soon: 3, [H + 1]: -2, [H + 2]: 5 } }) });
    const q = new DbKeeper("me", odd.ask), end = q.look("farm");
    await settle();
    expect(q.rains()).toEqual({ rains: SKIES.rains(), swarms: { [H + 2]: 5 } });
    halt(); end(); o.close(); q.close();
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

  it("knows of stalls only where the database does; reads its own again when somebody comes to it; and is heard from after it is closed", async () => {
    const mine = { at: [30, 40], lines: [{ kind: "sell", item: "kangkong", n: 10, left: 10, price: 4 }, { kind: "sell", item: "notAThingOfThisPage", n: 1, left: 1, price: 1 }], since: NOW, took: 0, paid: 0 };
    const told = (open: boolean, took = 0) => ({ mine: open ? { ...mine, took } : null, seen: ["kangkong", "minnow", "notAThingOfThisPage"], lines: 6, reach: 3, most: 200, cap: 10, capless: 500, every: 50 });
    let open = false, took = 0, beats = 0;
    const db = database({
      town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse({ coins: 7 }) }),
      town_shop: () => ({ now: NOW, shops: told(open, took), purse: purse({ coins: 7 + took }) }),
      town_shop_open: (a) => { open = true; return { ok: true, now: NOW, shops: told(true), asked: a }; },
      town_shop_close: () => { open = false; return { ok: true, now: NOW, shops: told(false) }; },
      town_shop_beat: () => { beats++; return { ok: true }; },
      town_shop_look: (a) => ({ now: NOW, shopWho: a.p_who, shopTold: { by: a.p_who, at: [30, 40], lines: [{ kind: "buy", item: "minnow", price: 6, can: 2 }, { kind: "sell", item: "notAThingOfThisPage", price: 1, can: 1 }] } }),
      town_shop_buy: (a) => ({ ok: true, coins: 8, now: NOW, purse: purse({ coins: 1 }), shopWho: a.p_who, shopTold: null }),
    });
    const nudges: Array<[string, string | undefined]> = [];
    const k = new DbKeeper("me", db.ask);
    k.onDeed = (what, to) => { nudges.push([what, to]); };
    expect(k.shops()).toBeNull();
    await settle();
    // asked for once as the game begins; a thing this page was built before is left out of what may be wanted
    expect(k.shops()).toMatchObject({ mine: null, seen: ["kangkong", "minnow"], lines: 6 });
    // with no stall of mine open, the room's word asks nothing
    const quiet = db.asked.filter((f) => f === "town_shop").length;
    k.nudged("shop");
    await settle();
    expect(db.asked.filter((f) => f === "town_shop").length).toBe(quiet);
    // opening one: its lines and the tile I stand on
    const did = k.shopOpen([{ kind: "sell", item: "kangkong" as never, n: 10, price: 4 }], [30, 40]);
    await settle();
    expect(await did).toMatchObject({ ok: true, asked: { p_lines: [{ kind: "sell", item: "kangkong", n: 10, price: 4 }], p_x: 30, p_y: 40 } });
    expect(k.shops()?.mine?.lines).toHaveLength(1);
    // somebody came to it: read again, with my purse
    took = 12;
    k.nudged("shop");
    await settle();
    expect(k.shops()?.mine?.took).toBe(12);
    expect(k.purse().coins).toBe(19);
    // somebody else's: read as it is looked at, and again at the room's word; bought at, and its keeper told
    await k.shopVisit("them");
    expect(k.shopSeen()).toEqual({ who: "them", told: { by: "them", at: [30, 40], lines: [{ kind: "buy", item: "minnow", price: 6, can: 2 }] } });
    const looks = db.asked.filter((f) => f === "town_shop_look").length;
    k.nudged("shop");
    await settle();
    expect(db.asked.filter((f) => f === "town_shop_look").length).toBe(looks + 1);
    const bought = k.shopBuy("them", "kangkong" as never, 2, [31, 40]);
    await settle();
    expect(await bought).toMatchObject({ ok: true, coins: 8 });
    expect(nudges).toContainEqual(["shop", "them"]);
    expect(k.shopSeen()).toEqual({ who: "them", told: null });
    await k.shopVisit(null);
    expect(k.shopSeen()).toBeNull();
    // the way my stall's keeper hears I am still here goes on working when this keeper is closed (the town's page gone, the stay going on)
    const beat = k.shopBeater();
    k.close();
    beat();
    await settle();
    expect(beats).toBe(1);
  });

  it("offers no stall where the database keeps none: nothing is asked of it afterwards", async () => {
    const db = database({ town_is_open: () => true, town_me: () => ({ now: NOW, purse: purse() }) });
    const k = new DbKeeper("me", db.ask);
    await settle();
    expect(k.shops()).toBeNull();
    const n = db.asked.length;
    await k.shopLook();
    await k.shopClose();
    await k.shopVisit("them");
    expect(db.asked.length).toBe(n);
    expect(k.shopSeen()).toEqual({ who: "them", told: null });
    k.close();
  });
});
