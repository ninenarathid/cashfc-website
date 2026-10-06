import { describe, expect, it } from "vitest";
import { catalogOf } from "./catalog";
import { giftAt, numberOf, takeGift } from "./gifts";
import { LINES, rankOf } from "./lines";
import { STAMINA, dayOf, staminaOf } from "./stamina";
import { newPurse, type Purse } from "./trade";
import { DRINK, drinkOffer, drinkTake, hasDrunk, mealHours, toastOf } from "./well-gifts";

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
});
