import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { giftAt, numberOf, takeGift } from "./gifts";
import { WATER } from "./farm";
import type { ItemId } from "./items";
import { carried } from "./line";
import { LINES, rankOf } from "./lines";
import { Skies } from "./skies";
import { STAMINA, dayOf, staminaOf } from "./stamina";
import { newPurse, type Purse } from "./trade";
import { NATURES, WATERS, pouredIn, type Nature } from "./waters";
import { FINE, SLOT_MS, slotOf, type Sky } from "./weather";
import { DRINK, FROG, MOON, moonKeep, moonOf, moonPour, croaksAt, drinkNear, drinkOffer, drinkTake, hasDrunk, mealHours, rainAhead, rainFill, rainNeed, readDrinkTold, skyAhead, toastOf } from "./well-gifts";

/** A moment by Bangkok's clock. */
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-07T12:00:00"), HOUR = 3_600_000;
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const why = (d: { ok: boolean; why?: string }) => (d.ok ? "ok" : d.why);
/** A purse with so much stamina today, and these gifts. */
const purse = (left: number, had: string[] = [], more: Partial<Purse> = {}): Purse => ({ ...newPurse(), stamina: { day: dayOf(NOON), left }, gifts: { had, charms: [] }, ...more });

describe("the well's fourth to sixth ranks are taken by whoever has poured enough", () => {
  it("the well's points are its book's bucketfuls, and its later ranks' marks are the ladder's own", () => {
    const marks = LINES.well.marks;
    expect([marks[3], marks[4], marks[5]]).toEqual([1500, 3000, 6000]);
    expect([giftAt("well", 4)?.id, giftAt("well", 5)?.id, giftAt("well", 6)?.id]).toEqual(["thingFlask", "famFrog", "thingMoon"]);
    for (const [rank, id] of [[4, "thingFlask"], [5, "famFrog"], [6, "thingMoon"]] as const) {
      const mark = marks[rank - 1];
      expect(rankOf("well", mark - 1)).toBe(rank - 1);
      expect(why(takeGift(newPurse(), { well: mark - 1 }, "well", rank))).toBe("rank");
      expect(done(takeGift(newPurse(), { well: mark }, "well", rank)).gift).toBe(id);
    }
    // (the first three ranks give no gift of this kind: the well's own book hands those over, lib/town/well)
    for (const rank of [1, 2, 3]) expect(why(takeGift(newPurse(), { well: 99999 }, "well", rank))).toBe("none");
  });
});

describe("the flask of living water (the well's fourth rank): a drink for a friend", () => {
  const giver = purse(40, ["thingFlask"]);

  it("is held out by whoever has the flask, to somebody else, from a tile, for twenty seconds", () => {
    expect(DRINK).toEqual({ gives: 30, back: 10, reach: 3, waits: 20 });
    expect(numberOf("thingFlask")).toBe(DRINK.gives);
    const did = done(drinkOffer(giver, "A", "B", [10, 12], NOON));
    expect(did.till).toBe(NOON + 20_000);
    expect(did.purse.toast).toEqual({ to: "B", at: [10, 12], till: NOON + 20_000 });
    expect(did.purse.stamina).toEqual(giver.stamina);
    // another takes its place; and it is put away
    const next = done(drinkOffer(did.purse, "A", "C", [11, 12], NOON + 5000));
    expect(next.purse.toast).toEqual({ to: "C", at: [11, 12], till: NOON + 25_000 });
    const away = done(drinkOffer(next.purse, "A", null, [11, 12], NOON + 6000));
    expect(away.till).toBeNull();
    expect("toast" in away.purse).toBe(false);
  });

  it("is not held out with no flask, to oneself, to nobody, or from what is no tile", () => {
    expect(why(drinkOffer(purse(40), "A", "B", [10, 12], NOON))).toBe("none");
    expect(why(drinkOffer(purse(40), "A", null, [10, 12], NOON))).toBe("none");
    expect(why(drinkOffer(giver, "A", "A", [10, 12], NOON))).toBe("none");
    expect(why(drinkOffer(giver, "A", "", [10, 12], NOON))).toBe("none");
    expect(why(drinkOffer(giver, "A", "B", [10.5, 12], NOON))).toBe("none");
    expect(why(drinkOffer(giver, "A", "B", [10] as unknown as [number, number], NOON))).toBe("none");
  });

  it("drunk by the friend: thirty stamina to them, ten to the flask's owner, the drink no longer held out, and who gave it kept", () => {
    const held = done(drinkOffer(giver, "A", "B", [10, 12], NOON)).purse;
    const did = done(drinkTake(held, purse(20), "A", "B", [12, 13], NOON + 3000));
    expect([did.got, did.back]).toEqual([30, 10]);
    expect(staminaOf(did.drinker, NOON + 3000)).toBe(50);
    expect(staminaOf(did.giver, NOON + 3000)).toBe(50);
    expect("toast" in did.giver).toBe(false);
    expect(did.drinker.drunk).toEqual({ k: mealHours(NOON), by: "A" });
    // nothing but stamina: no coins, no things
    expect(did.drinker.coins).toBe(0);
    expect(did.giver.coins).toBe(0);
    expect(did.drinker.bag).toEqual(purse(20).bag);
    expect(did.giver.bag).toEqual(giver.bag);
    expect(did.giver.gifts).toEqual(giver.gifts);
  });

  it("never above a full gauge, either of them; and somebody whose gauge is full is given none", () => {
    const held = done(drinkOffer(purse(95, ["thingFlask"]), "A", "B", [10, 12], NOON)).purse;
    const did = done(drinkTake(held, purse(85.5), "A", "B", [10, 12], NOON));
    expect(staminaOf(did.drinker, NOON)).toBe(STAMINA.max);
    expect(staminaOf(did.giver, NOON)).toBe(STAMINA.max);
    expect([did.got, did.back]).toEqual([14.5, 5]);
    expect(why(drinkTake(held, purse(100), "A", "B", [10, 12], NOON))).toBe("sated");
    // (a purse last counted on another day begins this one full)
    expect(why(drinkTake(held, { ...purse(3), stamina: { day: dayOf(NOON) - 1, left: 3 } }, "A", "B", [10, 12], NOON))).toBe("sated");
    // (and a giver whose gauge is full gives all the same, and has nothing of it)
    const full = done(drinkOffer(purse(100, ["thingFlask"]), "A", "B", [10, 12], NOON)).purse;
    expect(done(drinkTake(full, purse(0), "A", "B", [10, 12], NOON)).back).toBe(0);
  });

  it("once in a meal's hours for whoever drinks, whoever gives it; and again in the next meal's", () => {
    const held = done(drinkOffer(giver, "A", "B", [10, 12], NOON)).purse;
    const first = done(drinkTake(held, purse(10), "A", "B", [10, 12], NOON));
    expect(hasDrunk(first.drinker, NOON + HOUR)).toBe(true);
    // the same giver again, and another giver: refused, and nothing changed
    const again = done(drinkOffer(first.giver, "A", "B", [10, 12], NOON + 60_000)).purse;
    expect(why(drinkTake(again, first.drinker, "A", "B", [10, 12], NOON + 61_000))).toBe("drunk");
    const other = done(drinkOffer(purse(30, ["thingFlask"]), "C", "B", [10, 12], NOON + 60_000)).purse;
    expect(why(drinkTake(other, first.drinker, "C", "B", [10, 12], NOON + 61_000))).toBe("drunk");
    // lunch runs from eleven to five: at five it is dinner's hours, and a drink is theirs again
    const dinner = at("2026-10-07T17:00:00");
    expect(hasDrunk(first.drinker, dinner - 1)).toBe(true);
    expect(hasDrunk(first.drinker, dinner)).toBe(false);
    const late = done(drinkOffer(first.giver, "A", "B", [10, 12], dinner)).purse;
    expect(done(drinkTake(late, first.drinker, "A", "B", [10, 12], dinner + 1000)).got).toBe(30);
    // the giver has no count: three friends in a row, ten each
    let mine = giver;
    for (const [i, friend] of ["B", "C", "D"].entries()) {
      const out = done(drinkOffer(mine, "A", friend, [10, 12], NOON + i * 1000)).purse;
      mine = done(drinkTake(out, purse(0), "A", friend, [10, 12], NOON + i * 1000 + 500)).giver;
    }
    expect(staminaOf(mine, NOON + 5000)).toBe(70);
    // (and a ring of two with a flask each has one drink each in these hours, no more)
    const a = purse(0, ["thingFlask"]), b = purse(0, ["thingFlask"]);
    const ab = done(drinkTake(done(drinkOffer(a, "A", "B", [1, 1], NOON)).purse, b, "A", "B", [1, 1], NOON));
    const ba = done(drinkTake(done(drinkOffer(ab.drinker, "B", "A", [1, 1], NOON)).purse, ab.giver, "B", "A", [1, 1], NOON));
    expect([staminaOf(ba.drinker, NOON), staminaOf(ba.giver, NOON)]).toEqual([40, 40]);
    expect(why(drinkTake(done(drinkOffer(ba.drinker, "A", "B", [1, 1], NOON)).purse, ba.giver, "A", "B", [1, 1], NOON))).toBe("drunk");
  });

  it("refused to somebody it is not held out to, too late, and from too far", () => {
    const held = done(drinkOffer(giver, "A", "B", [10, 12], NOON)).purse;
    // nothing held out; held out to somebody else; by somebody who has no flask (a purse written wrongly); to oneself
    expect(why(drinkTake(giver, purse(0), "A", "B", [10, 12], NOON))).toBe("none");
    expect(why(drinkTake(held, purse(0), "A", "C", [10, 12], NOON))).toBe("none");
    expect(why(drinkTake({ ...held, gifts: { had: [], charms: [] } }, purse(0), "A", "B", [10, 12], NOON))).toBe("none");
    expect(why(drinkTake(held, held, "A", "A", [10, 12], NOON))).toBe("none");
    // the twenty seconds: still held at the last of them, gone at their end
    expect(why(drinkTake(held, purse(0), "A", "B", [10, 12], NOON + 19_999))).toBe("ok");
    expect(why(drinkTake(held, purse(0), "A", "B", [10, 12], NOON + 20_000))).toBe("late");
    // three tiles any way; and what is no tile is far
    expect(why(drinkTake(held, purse(0), "A", "B", [13, 9], NOON))).toBe("ok");
    expect(why(drinkTake(held, purse(0), "A", "B", [14, 12], NOON))).toBe("far");
    expect(why(drinkTake(held, purse(0), "A", "B", [10, 16], NOON))).toBe("far");
    expect(why(drinkTake(held, purse(0), "A", "B", [10.2, 12], NOON))).toBe("far");
    // (too late is said before too far, and both before a drink already had)
    expect(why(drinkTake(held, purse(0, [], { drunk: { k: mealHours(NOON), by: "Z" } }), "A", "B", [99, 99], NOON + 30_000))).toBe("late");
    expect(why(drinkTake(held, purse(0, [], { drunk: { k: mealHours(NOON), by: "Z" } }), "A", "B", [99, 99], NOON))).toBe("far");
  });

  it("reads what is kept soundly, and nothing else", () => {
    expect(toastOf({})).toBeNull();
    expect(toastOf({ toast: { to: "B", at: [1, 2], till: 5 } })).toEqual({ to: "B", at: [1, 2], till: 5 });
    for (const bad of [null, "x", [], { to: "", at: [1, 2], till: 5 }, { to: 3, at: [1, 2], till: 5 }, { to: "B", at: [1], till: 5 }, { to: "B", at: [1, 2.5], till: 5 }, { to: "B", at: [1, 2], till: "5" }]) {
      expect(toastOf({ toast: bad as unknown as Purse["toast"] }), JSON.stringify(bad)).toBeNull();
    }
    expect(hasDrunk({}, NOON)).toBe(false);
    for (const bad of [null, "x", { k: String(mealHours(NOON)) }, { k: mealHours(NOON) - 1, by: "A" }]) expect(hasDrunk({ drunk: bad as unknown as Purse["drunk"] }, NOON), JSON.stringify(bad)).toBe(false);
  });

  it("the catalog carries its numbers for the database", () => {
    const c = catalogOf();
    expect(c.well.drink).toEqual({ back: 10, reach: 3, waits: 20 });
    expect(c.gifts.gifts.thingFlask).toEqual({ kind: "thing", line: "well", rank: 4, by: 30 });
  });

  it("the words two pages say of a drink are read carefully", () => {
    expect(readDrinkTold({ k: "dr", m: "offer", t: 5 })).toEqual({ k: "dr", m: "offer", t: 5 });
    expect(readDrinkTold({ k: "dr", m: "ok", g: 30, b: 10 })).toEqual({ k: "dr", m: "ok", g: 30, b: 10 });
    expect(readDrinkTold({ k: "dr", m: "no", w: "drunk" })).toEqual({ k: "dr", m: "no", w: "drunk" });
    expect(readDrinkTold({ k: "dr", m: "off", more: 1 })).toEqual({ k: "dr", m: "off" });
    // (the bucket line's words, and what is no word of a drink at all, are none of its)
    for (const bad of [null, "dr", { k: "ask", m: "x" }, { k: "dr" }, { k: "dr", m: "offer" }, { k: "dr", m: "offer", t: "5" }, { k: "dr", m: "ok", g: 30 }, { k: "dr", m: "ok", g: -1, b: 0 }, { k: "dr", m: "no", w: "because" }, { k: "dr", m: "what" }]) {
      expect(readDrinkTold(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(drinkNear({ x: 10.9, y: 12.1 }, { x: 13.2, y: 9.5 })).toBe(true);
    expect(drinkNear({ x: 10.9, y: 12.1 }, { x: 14.0, y: 12.5 })).toBe(false);
  });
});

describe("the rain frog (the well's fifth rank): the sky ahead, a croak before rain, and a bucket the rain fills", () => {
  const Q = SLOT_MS, T0 = 1_960_000 * Q, at3 = T0 + 3 * 60_000;
  /** A sky by the quarter hours from T0 on: each word in turn, and nothing known past them. */
  const sky = (...words: Array<Sky | null>) => (ms: number): Sky | null => words[slotOf(ms) - slotOf(T0)] ?? null;
  const frog = (more: Partial<Purse> = {}, hand: ItemId | null = "bucket"): Purse => {
    const p: Purse = { ...newPurse(), stamina: { day: dayOf(NOON), left: 50 }, gifts: { had: ["famFrog", "famGnome"], charms: [], familiar: "famFrog" }, ...more };
    return hand ? { ...p, bag: p.bag.map((s, i) => (i === 0 ? { item: hand, n: 1 } : s)), hand } : p;
  };

  it("shows this quarter hour's sky and the three to come: forty-five minutes ahead", () => {
    expect(FROG).toEqual({ ahead: 45, croaks: 15, fills: 12 });
    expect(numberOf("famFrog")).toBe(45);
    const ahead = skyAhead(at3, sky("clear", "cloudy", "rain", "storm", "clear"));
    expect(ahead).toEqual([{ at: at3, sky: "clear" }, { at: T0 + Q, sky: "cloudy" }, { at: T0 + 2 * Q, sky: "rain" }, { at: T0 + 3 * Q, sky: "storm" }]);
    // the moment forty-five minutes on is in the last quarter hour shown, wherever in this one it is asked
    for (const into of [0, 1, 7 * 60_000, Q - 1]) {
      const a = skyAhead(T0 + into, sky("clear", "clear", "clear", "rain"));
      expect(a.length).toBe(4);
      expect(slotOf(T0 + into + FROG.ahead * 60_000)).toBe(slotOf(a[3].at));
    }
    // a quarter hour the database has not written yet is not known, and says so
    expect(skyAhead(at3, sky("clear", "cloudy")).map((q) => q.sky)).toEqual(["clear", "cloudy", null, null]);
    expect(skyAhead(at3, sky("clear"), 20).length).toBe(2);
  });

  it("says when the weather turns within what it shows: rain in so many minutes, or its end", () => {
    expect(rainAhead(skyAhead(at3, sky("clear", "cloudy", "rain", "storm")))).toEqual({ rain: 27 });
    expect(rainAhead(skyAhead(at3, sky("cloudy", "drizzle", "clear", "clear")))).toEqual({ rain: 12 });
    expect(rainAhead(skyAhead(at3, sky("rain", "rain", "storm", "fog")))).toEqual({ clears: 42 });
    expect(rainAhead(skyAhead(T0 + Q - 1, sky("storm", "clear")))).toEqual({ clears: 1 });
    // nothing turns; the sky now is not known; what is not known is passed over
    expect(rainAhead(skyAhead(at3, sky("clear", "cloudy", "fog", "clear")))).toBeNull();
    expect(rainAhead(skyAhead(at3, sky("rain", "rain", "drizzle", "storm")))).toBeNull();
    expect(rainAhead(skyAhead(at3, sky(null, "rain", "rain", "rain")))).toBeNull();
    expect(rainAhead(skyAhead(at3, sky("clear", null, "rain", "rain")))).toEqual({ rain: 27 });
    expect(rainAhead([])).toBeNull();
  });

  it("croaks in the quarter hour before rain, and at no other time", () => {
    expect(croaksAt(at3, sky("clear", "rain"))).toBe(true);
    expect(croaksAt(T0, sky("fog", "drizzle"))).toBe(true);
    expect(croaksAt(T0 + Q - 1, sky("cloudy", "storm"))).toBe(true);
    // not while it rains, not with dry weather ahead, not half an hour before, and not of a sky it does not know
    expect(croaksAt(at3, sky("rain", "rain"))).toBe(false);
    expect(croaksAt(at3, sky("clear", "cloudy", "rain"))).toBe(false);
    expect(croaksAt(at3, sky("clear", null))).toBe(false);
    expect(croaksAt(at3, sky(null, "rain"))).toBe(false);
    expect(croaksAt(at3, sky("rain", "clear"))).toBe(false);
  });

  it("under rain the empty bucket its member holds fills by itself: all it carries, for no stamina", () => {
    for (const [hand, n] of [["bucket", 1], ["bucketIron", 2], ["waterYoke", 2], ["waterYokeGreat", 4], ["waterCart", 6]] as Array<[ItemId, number]>) {
      const p = frog({}, hand), need = rainNeed(p)!;
      expect([need.hand, need.slot, need.n, need.ms]).toEqual([hand, 0, n, n * 12_000]);
      const did = done(rainFill(p, true, NOON));
      expect([did.n, did.can]).toEqual([n, hand]);
      expect(did.purse.bag[0]).toEqual({ item: hand, n: 1, water: n });
      expect(did.purse.rained).toBe(NOON);
      expect(staminaOf(did.purse, NOON)).toBe(50);
      expect(did.purse.coins).toBe(0);
      // (it is a bucket of water like any other: the hand that holds it has it to hand on or pour)
      expect(carried(did.purse)).toEqual({ hand, slot: 0, has: n });
    }
  });

  it("only in rain, only with the frog following, only an empty bucket in the hand", () => {
    expect(why(rainFill(frog(), false, NOON))).toBe("dry");
    // the frog had but resting, another familiar following, no frog at all
    expect(why(rainFill(frog({ gifts: { had: ["famFrog"], charms: [], familiar: null } }), true, NOON))).toBe("none");
    expect(why(rainFill(frog({ gifts: { had: ["famFrog", "famGnome"], charms: [], familiar: "famGnome" } }), true, NOON))).toBe("none");
    expect(why(rainFill(frog({ gifts: { had: [], charms: [] } }), true, NOON))).toBe("none");
    expect(rainNeed(frog({ gifts: { had: [], charms: [] } }))).toBeNull();
    // nothing in the hand, what is no bucket, a bucket in the bag that is not held, one that has water already
    expect(why(rainFill(frog({}, null), true, NOON))).toBe("hand");
    expect(why(rainFill(frog({}, "can"), true, NOON))).toBe("hand");
    expect(why(rainFill({ ...frog(), hand: null }, true, NOON))).toBe("hand");
    const full = frog();
    expect(why(rainFill({ ...full, bag: full.bag.map((s, i) => (i === 0 ? { item: "bucket" as ItemId, n: 1, water: 1 } : s)) }, true, NOON))).toBe("hand");
    // (no frog is said before no rain, and no rain before no bucket)
    expect(why(rainFill(frog({ gifts: { had: [], charms: [] } }, null), false, NOON))).toBe("none");
    expect(why(rainFill(frog({}, null), false, NOON))).toBe("dry");
  });

  it("not sooner after the last than this bucket takes to fill: twelve seconds a bucketful", () => {
    const first = done(rainFill(frog({}, "waterYokeGreat"), true, NOON)).purse;
    // poured out, and held under the rain again
    const empty: Purse = { ...first, bag: first.bag.map((s, i) => (i === 0 ? { item: "waterYokeGreat" as ItemId, n: 1 } : s)) };
    expect(why(rainFill(empty, true, NOON + 47_999))).toBe("soon");
    expect(done(rainFill(empty, true, NOON + 48_000)).n).toBe(4);
    // a smaller bucket is full sooner
    const small: Purse = { ...empty, bag: empty.bag.map((s, i) => (i === 0 ? { item: "bucket" as ItemId, n: 1 } : s)), hand: "bucket" };
    expect(why(rainFill(small, true, NOON + 11_999))).toBe("soon");
    expect(done(rainFill(small, true, NOON + 12_000)).n).toBe(1);
    // so however it is asked, no more than five bucketfuls a minute come of the rain: an hour of it is three hundred
    let p = frog({}, "waterCart"), got = 0;
    for (let t = NOON; t < NOON + 3_600_000; t += 1000) {
      const did = rainFill(p, true, t);
      if (!did.ok) continue;
      got += did.n;
      p = { ...did.purse, bag: did.purse.bag.map((s, i) => (i === 0 ? { item: "waterCart" as ItemId, n: 1 } : s)) };
    }
    expect(got).toBe(300);
    // (a time kept wrongly is no time at all)
    expect(why(rainFill({ ...empty, rained: "x" as unknown as number }, true, NOON))).toBe("ok");
  });

  it("the catalog carries its numbers, and a sky can be laid out ahead in `next dev`", () => {
    const c = catalogOf();
    expect(c.well.frog).toEqual({ croaks: 15, fills: 12 });
    expect(c.gifts.gifts.famFrog).toEqual({ kind: "familiar", line: "well", rank: 5, by: 45 });
    const skies = new Skies(), from = slotOf(Date.now());
    skies.forceAhead([FINE, { sky: "cloudy", wind: 5, gust: 9, rain: 0 }, { sky: "rain", wind: 10, gust: 20, rain: 1.2 }], from);
    expect([0, 1, 2, 3, 50].map((i) => skies.sky((from + i) * Q + 1))).toEqual(["clear", "cloudy", "rain", "rain", "rain"]);
    expect(skies.raining((from + 1) * Q + 5)).toBe(false);
    expect(skies.raining((from + 2) * Q)).toBe(true);
    expect(skies.sky((from - 3) * Q)).toBe("clear");
    // (whatever the database says afterwards is not taken)
    expect(skies.take({ now: Date.now(), slots: [[from, "storm", 1, 1, 1]] }, Date.now())).toBe(false);
    expect(skies.reaches(60)).toBe(true);
  });
});

describe("the moon flask (the well's sixth rank): water that differs, kept for the moment of its owner's choosing", () => {
  const MIN = 60_000;
  /** A purse with the flask, and a bucket in the hand with so much water in it. */
  const flask = (hand: ItemId | null = "waterYokeGreat", water = 4, more: Partial<Purse> = {}): Purse => {
    const p: Purse = { ...newPurse(), stamina: { day: dayOf(NOON), left: 50 }, gifts: { had: ["thingMoon"], charms: [] }, ...more };
    return hand ? { ...p, bag: p.bag.map((s, i) => (i === 0 ? { item: hand, n: 1, ...(water ? { water } : {}) } : s)), hand } : p;
  };

  it("keeps three bucketfuls of one nature, out of the bucket in the hand; the rest stays in the bucket", () => {
    expect(MOON).toEqual({ holds: 3, times: 3 });
    expect(numberOf("thingMoon")).toBe(MOON.times);
    for (const kind of NATURES) {
      const did = done(moonKeep(flask(), kind));
      expect([did.n, did.kind, did.can]).toEqual([3, kind, "waterYokeGreat"]);
      expect(did.purse.moon).toEqual({ kind, n: 3 });
      expect(did.purse.bag[0]).toEqual({ item: "waterYokeGreat", n: 1, water: 1 });
      // for nothing: no stamina, no coin
      expect(staminaOf(did.purse, NOON)).toBe(50);
      expect(did.purse.coins).toBe(0);
    }
    // a bucketful at a time, of the same water: one, two, three, and then it has all it holds
    let p = flask("bucket", 1);
    for (const n of [1, 2, 3]) {
      const did = done(moonKeep(p, "dawn"));
      expect(did.purse.moon).toEqual({ kind: "dawn", n });
      expect(did.purse.bag[0]).toEqual({ item: "bucket", n: 1 });
      p = { ...did.purse, bag: did.purse.bag.map((s, i) => (i === 0 ? { item: "bucket" as ItemId, n: 1, water: 1 } : s)) };
    }
    expect(why(moonKeep(p, "dawn"))).toBe("brim");
    expect(moonOf(p)).toEqual({ kind: "dawn", n: 3 });
  });

  it("not plain water, not another nature than it has, not with no water in the hand, not without the flask", () => {
    expect(why(moonKeep(flask(), null))).toBe("plain");
    expect(why(moonKeep(flask(), undefined))).toBe("plain");
    expect(why(moonKeep(flask(), "sea" as Nature))).toBe("plain");
    expect(why(moonKeep(flask("bucket", 1, { moon: { kind: "moon", n: 1 } }), "rain"))).toBe("other");
    expect(done(moonKeep(flask("bucket", 1, { moon: { kind: "moon", n: 1 } }), "moon")).purse.moon).toEqual({ kind: "moon", n: 2 });
    expect(why(moonKeep(flask("waterYokeGreat", 0), "dawn"))).toBe("hand");
    expect(why(moonKeep(flask(null), "dawn"))).toBe("hand");
    expect(why(moonKeep(flask("can", 5), "dawn"))).toBe("hand");
    expect(why(moonKeep({ ...flask(), gifts: { had: ["thingFlask"], charms: [] } }, "dawn"))).toBe("none");
    // (no flask is said first; then no water; then what water it is; then what the flask has)
    expect(why(moonKeep({ ...flask(null), gifts: { had: [], charms: [] } }, null))).toBe("none");
    expect(why(moonKeep(flask(null, 0, { moon: { kind: "moon", n: 3 } }), null))).toBe("hand");
    expect(why(moonKeep(flask("bucket", 1, { moon: { kind: "moon", n: 3 } }), null))).toBe("plain");
    expect(why(moonKeep(flask("bucket", 1, { moon: { kind: "moon", n: 3 } }), "rain"))).toBe("other");
  });

  it("poured into the well when its owner likes: a bucketful or all of it, for a pour's stamina", () => {
    const full = flask(null, 0, { moon: { kind: "dawn", n: 3 } });
    const one = done(moonPour(full, 10, 1, NOON));
    expect([one.poured, one.into, one.kind, one.well]).toEqual([1, 1, "dawn", 11]);
    expect(one.purse.moon).toEqual({ kind: "dawn", n: 2 });
    expect(staminaOf(one.purse, NOON)).toBe(50 - WATER.costs.pour);
    const all = done(moonPour(full, 10, 3, NOON));
    expect([all.poured, all.into, all.well]).toEqual([3, 3, 13]);
    expect("moon" in all.purse).toBe(false);
    // more asked for than it has: all it has
    expect(done(moonPour(one.purse, 10, 9, NOON)).poured).toBe(2);
    // a well with little room, and one that is full: what fits goes in, the rest runs over, and all of it is poured
    const tight = done(moonPour(full, WATER.well - 1, 3, NOON));
    expect([tight.poured, tight.into, tight.well]).toEqual([3, 1, WATER.well]);
    const over = done(moonPour(full, WATER.well, 2, NOON));
    expect([over.poured, over.into, over.well]).toEqual([2, 0, WATER.well]);
    expect(over.purse.moon).toEqual({ kind: "dawn", n: 1 });
    // nothing but the flask and the stamina changes
    expect(all.purse.bag).toEqual(full.bag);
    expect(all.purse.coins).toBe(0);
  });

  it("not with nothing in it, not by what is no number of bucketfuls, not without the flask", () => {
    expect(why(moonPour(flask(null, 0), 10, 1, NOON))).toBe("dry");
    expect(why(moonPour(flask(null, 0, { moon: { kind: "dawn", n: 0 } }), 10, 1, NOON))).toBe("dry");
    expect(why(moonPour(flask(null, 0, { moon: { kind: "sea" as Nature, n: 2 } }), 10, 1, NOON))).toBe("dry");
    for (const n of [0, -1, 1.5, NaN]) expect(why(moonPour(flask(null, 0, { moon: { kind: "dawn", n: 3 } }), 10, n, NOON)), String(n)).toBe("amount");
    expect(why(moonPour({ ...flask(null, 0, { moon: { kind: "dawn", n: 3 } }), gifts: { had: [], charms: [] } }, 10, 1, NOON))).toBe("none");
    // (what is kept wrongly is an empty flask)
    for (const bad of [null, "x", { kind: "dawn" }, { kind: "dawn", n: 4 }, { kind: "dawn", n: 1.5 }, { n: 2 }]) expect(moonOf({ moon: bad as unknown as Purse["moon"] }), JSON.stringify(bad)).toBeNull();
  });

  it("works three times as long in the well: an hour and a half a bucketful, six hours at the most", () => {
    expect([WATERS.lasts, WATERS.most]).toEqual([30, 120]);
    // a bucket's bucketful, and the flask's
    expect(pouredIn(null, "dawn", 1, "A", NOON)!.until).toBe(NOON + 30 * MIN);
    expect(pouredIn(null, "dawn", 1, "A", NOON, MOON.times)).toEqual({ kind: "dawn", by: "A", until: NOON + 90 * MIN });
    expect(pouredIn(null, "moon", 3, "A", NOON, MOON.times)!.until).toBe(NOON + 270 * MIN);
    // the most: two hours of a bucket's, six of the flask's (more of the same keeps it longer, up to that from now)
    expect(pouredIn(null, "dawn", 9, "A", NOON)!.until).toBe(NOON + 120 * MIN);
    const three = pouredIn(null, "dawn", 3, "A", NOON, MOON.times);
    expect(pouredIn(three, "dawn", 3, "B", NOON + 60 * MIN, MOON.times)).toEqual({ kind: "dawn", by: "B", until: NOON + 420 * MIN });
    expect(pouredIn(three, "dawn", 3, "B", NOON, MOON.times)!.until).toBe(NOON + 360 * MIN);
    // times of one is a bucket's, as it always was
    for (const n of [1, 2, 5]) expect(pouredIn(null, "rain", n, "A", NOON, 1)).toEqual(pouredIn(null, "rain", n, "A", NOON));
  });

  it("a bucket of the same water poured after a flask never shortens what the well has; another nature still takes its place", () => {
    const long = pouredIn(null, "moon", 3, "A", NOON, MOON.times)!;
    // (a bucket's most is two hours from now: alone it would have cut four and a half hours to two)
    const after = pouredIn(long, "moon", 1, "B", NOON + 10 * MIN)!;
    expect(after.until).toBe(long.until);
    expect(after.by).toBe("B");
    // near its end a bucket lengthens it as ever
    expect(pouredIn(long, "moon", 1, "B", long.until - 10 * MIN)!.until).toBe(long.until + 30 * MIN);
    // another nature takes its place; plain water changes nothing; one that has run out is gone
    expect(pouredIn(long, "rain", 1, "B", NOON + 10 * MIN)).toEqual({ kind: "rain", by: "B", until: NOON + 40 * MIN });
    expect(pouredIn(long, null, 4, "B", NOON + 10 * MIN)).toEqual(long);
    expect(pouredIn(long, "moon", 0, "B", long.until + 1, MOON.times)).toBeNull();
  });

  it("the catalog carries its numbers", () => {
    const c = catalogOf();
    expect(c.well.moon).toEqual({ holds: 3 });
    expect(c.gifts.gifts.thingMoon).toEqual({ kind: "thing", line: "well", rank: 6, by: 3 });
  });
});
