import { describe, expect, it } from "vitest";
import { WATER, chore } from "./farm";
import { ITEMS } from "./items";
import { leave, newPurse, put, type Purse } from "./trade";
import { sources, usesOf } from "./uses";
import { WELL_BOOK, bookOf, dueOf, newLog, rankOf, ranksOf, seen, takeGift, towards, type WaterDeed } from "./well";

const DAY = Date.parse("2026-10-06T09:00:00+07:00"), MIN = 60_000;
const play = (deeds: WaterDeed[]) => deeds.reduce(seen, newLog());
const name = (id: string) => id.toUpperCase();

describe("the well's book: whose water went where (the owner, 2026-10-05: those who carry water for the others get nothing for it)", () => {
  it("follows water from the well to a can to a plant, the oldest water first", () => {
    const log = play([
      { by: "ann", at: DAY, what: "pour", n: 1 },
      { by: "bo", at: DAY + MIN, what: "pour", n: 2 },
      // the first can filled is of Ann's bucketful, the second of Bo's
      { by: "cy", at: DAY + 2 * MIN, what: "fill", can: "can" },
      { by: "di", at: DAY + 3 * MIN, what: "fill", can: "can" },
      { by: "cy", at: DAY + 4 * MIN, what: "water", can: "can", tile: [133, 5], whose: "di" },
      { by: "cy", at: DAY + 5 * MIN, what: "water", can: "can", tile: [134, 5], whose: "di" },
      { by: "cy", at: DAY + 6 * MIN, what: "water", can: "can", tile: [133, 5], whose: "di" },
      { by: "di", at: DAY + 7 * MIN, what: "water", can: "can", tile: [135, 5] },
    ]);
    expect(log.water).toEqual([{ by: "bo", left: 1 }]);
    const ann = bookOf(log, "ann", DAY + 10 * MIN, name), bo = bookOf(log, "bo", DAY + 10 * MIN, name);
    // Ann's bucketful: three waterings of two of Di's plants; Bo's: one, of Di's own plant by Di
    expect(ann.today).toEqual({ buckets: 1, waterings: 3, plants: 2, people: 1, watered: 0, helped: 0 });
    expect(bo.today).toEqual({ buckets: 2, waterings: 1, plants: 1, people: 1, watered: 0, helped: 0 });
    // Cy carried nothing and watered three plants of one other person's
    expect(bookOf(log, "cy", DAY + 10 * MIN, name).today).toEqual({ buckets: 0, waterings: 0, plants: 0, people: 0, watered: 3, helped: 1 });
    // today's carriers, in the order they came, by name
    expect(ann.carriers).toEqual([{ id: "ann", name: "ANN", buckets: 1, rank: 0 }, { id: "bo", name: "BO", buckets: 2, rank: 0 }]);
  });

  it("does not count a carrier's water on their own plant, nor water it knows nothing of", () => {
    const log = play([
      { by: "ann", at: DAY, what: "pour", n: 1 },
      { by: "bo", at: DAY + MIN, what: "fill", can: "can" },
      { by: "bo", at: DAY + 2 * MIN, what: "water", can: "can", tile: [133, 5], whose: "ann" },
      // a can the book never saw filled; and a well with nothing the book knows of
      { by: "cy", at: DAY + 3 * MIN, what: "water", can: "canCopper", tile: [134, 5], whose: "ann" },
      { by: "cy", at: DAY + 4 * MIN, what: "fill", can: "can" },
      { by: "cy", at: DAY + 5 * MIN, what: "water", can: "can", tile: [134, 5], whose: "ann" },
    ]);
    expect(bookOf(log, "ann", DAY + 6 * MIN, name).today).toMatchObject({ waterings: 0, plants: 0, people: 0 });
    expect(log.cans["cy/can"]).toEqual({ by: null, left: WATER.cans.can! - 1 });
  });

  it("stops following a can when it has given what it holds", () => {
    let log = play([{ by: "ann", at: DAY, what: "pour", n: 1 }, { by: "bo", at: DAY + 1, what: "fill", can: "can" }]);
    for (let i = 0; i < WATER.cans.can! + 3; i++) log = seen(log, { by: "bo", at: DAY + 10 + i, what: "water", can: "can", tile: [133 + (i % 5), 5], whose: "cy" });
    expect(bookOf(log, "ann", DAY + MIN, name).today.waterings).toBe(WATER.cans.can);
    expect(log.cans["bo/can"].left).toBe(0);
  });

  it("keeps a day to itself: the game's day, from dawn", () => {
    const before = Date.parse("2026-10-06T04:50:00+07:00"), after = Date.parse("2026-10-06T05:10:00+07:00");
    const log = play([{ by: "ann", at: before, what: "pour", n: 3 }, { by: "bo", at: after, what: "pour", n: 1 }]);
    expect(bookOf(log, "ann", before + MIN, name).carriers.map((c) => c.id)).toEqual(["ann"]);
    expect(bookOf(log, "ann", after + MIN, name).carriers.map((c) => c.id)).toEqual(["bo"]);
    expect(bookOf(log, "ann", after + MIN, name)).toMatchObject({ buckets: 3, today: { buckets: 0 } });
  });

  it("gives a carrier a rank by what they have poured, all told, and says how far along they are", () => {
    const [first, second, third] = WELL_BOOK.ranks;
    expect([0, first - 1, first, second - 1, second, third, third * 9].map(rankOf)).toEqual([0, 0, 1, 1, 2, 3, 3]);
    expect(towards(0)).toBe(0);
    expect(towards(first / 2)).toBe(0.5);
    expect(towards(first)).toBe(0);
    expect(towards(third)).toBe(1);
    const log = play([{ by: "ann", at: DAY, what: "pour", n: first }, { by: "bo", at: DAY + 1, what: "pour", n: first - 1 }]);
    expect(ranksOf(log)).toEqual({ ann: 1 });
    expect(bookOf(log, "bo", DAY + 2, name).carriers.map((c) => c.rank)).toEqual([1, 0]);
  });

  it("has a yoke at the well for whoever reaches the first rank, and a great one at the last, each once", () => {
    const [first, , third] = WELL_BOOK.ranks;
    expect(dueOf(first - 1, [])).toBeNull();
    expect(dueOf(first, [])).toEqual([1, "waterYoke"]);
    expect(dueOf(first, [1])).toBeNull();
    expect(dueOf(third, [1])).toEqual([3, "waterYokeGreat"]);
    // the lower one first, for somebody who never took it
    expect(dueOf(third, [])).toEqual([1, "waterYoke"]);

    let log = play([{ by: "ann", at: DAY, what: "pour", n: first }]);
    expect(bookOf(log, "ann", DAY + 1, name).gift).toBe(true);
    const full: Purse = { ...newPurse(), bag: newPurse().bag.map(() => ({ item: "rod" as const, n: 1 })) };
    expect(takeGift(full, log, "ann")).toEqual({ ok: false, why: "full" });
    expect(takeGift(newPurse(), log, "bo")).toEqual({ ok: false, why: "none" });
    const did = takeGift(newPurse(), log, "ann");
    expect(did.ok && did.gift).toBe("waterYoke");
    if (!did.ok) return;
    expect(did.purse.bag[0]).toEqual({ item: "waterYoke", n: 1 });
    log = did.log;
    expect(bookOf(log, "ann", DAY + 2, name).gift).toBe(false);
    expect(takeGift(did.purse, log, "ann")).toEqual({ ok: false, why: "none" });
  });

  it("makes the yokes things that carry water, come from the well, and are never sold", () => {
    for (const [, gift] of WELL_BOOK.gifts) {
      expect(ITEMS[gift].kind).toBe("tool");
      expect(usesOf(gift)).toEqual(["bucket"]);
      expect(sources().get(gift)).toBe("well");
      // (the uncle's relatives take nothing that fetches nothing)
      const p: Purse = { ...newPurse(), bag: put(newPurse().bag, gift, 1) };
      expect(leave(p, 0, 1, DAY)).toEqual({ ok: false, why: "unwanted" });
    }
    // nobody has one without something to carry the first water in
    expect(sources(["rod", "hoe"]).has("waterYoke")).toBe(false);
    expect(sources(["bucket"]).get("waterYoke")).toBe("well");
    // a yoke draws two bucketfuls at the river, a great one four, for what one bucket costs
    for (const [gift, holds] of [["waterYoke", 2], ["waterYokeGreat", 4]] as const) {
      const p: Purse = { ...newPurse(), bag: put(newPurse().bag, gift, 1), hand: gift, stamina: { day: -1, left: 50 } };
      const drew = chore(p, "river", 0, DAY);
      expect(drew.ok && drew.purse.bag[0]).toEqual({ item: gift, n: 1, water: holds });
      if (!drew.ok) continue;
      // …and pours as much of it as the well has room for
      const poured = chore(drew.purse, "well", WATER.well - 1, DAY);
      expect(poured.ok && poured.well).toBe(WATER.well);
      expect(poured.ok && poured.purse.bag[0]).toEqual({ item: gift, n: 1, water: holds - 1 });
    }
  });
});
