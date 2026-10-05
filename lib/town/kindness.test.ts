import { describe, expect, it } from "vitest";
import { JAR, collect, drop, mayDrop, newJar, settle, settleWith, shares, workOf, type Jar, type Owed } from "./jar";
import { boardOf, helpersOf, thank, toThank, unthanked, type Thanks } from "./thanks";
import { newPurse, put, roundOf, roundStart, type Purse } from "./trade";
import { newLog, seen, type WaterDeed } from "./well";

const DAY = Date.parse("2026-10-06T09:00:00+07:00"), MIN = 60_000, HOUR = 3_600_000;
const play = (deeds: WaterDeed[]) => deeds.reduce(seen, newLog());
const name = (id: string) => id.toUpperCase();
/** Ann's plant in a plot: Bo carries, Cy fills a can and waters it twice, Di waters it once with a can the book never saw filled. */
const helpedPlot = (): WaterDeed[] => [
  { by: "ann", at: DAY, what: "sow", tile: [133, 5] },
  { by: "bo", at: DAY + 1, what: "pour", n: 1 },
  { by: "cy", at: DAY + 2, what: "fill", can: "can" },
  { by: "cy", at: DAY + 3, what: "water", can: "can", tile: [133, 5], whose: "ann" },
  { by: "cy", at: DAY + 4, what: "water", can: "can", tile: [133, 5], whose: "ann" },
  { by: "di", at: DAY + 5, what: "water", can: "canCopper", tile: [133, 5], whose: "ann" },
];

describe("thanks at the picking: the town's own popoto (the owner, 2026-10-03: \"โยนฟรีวันละ 1 ต่อคู่ นับคะแนนเป็น Popoto จาก cash town\")", () => {
  it("remembers who helped the plant in a plot: who watered it, and whose water it was", () => {
    const log = play(helpedPlot());
    expect(helpersOf(log, "133,5", "ann")).toEqual([{ id: "bo", water: 0, carry: 2 }, { id: "cy", water: 2, carry: 0 }, { id: "di", water: 1, carry: 0 }]);
    // nobody's but the owner's to ask about
    expect(helpersOf(log, "133,5", "cy")).toEqual([]);
    expect(helpersOf(log, "134,5", "ann")).toEqual([]);
    // my own watering of my own plant is no help; my own water on it neither
    const own = play([{ by: "ann", at: DAY, what: "pour", n: 1 }, { by: "ann", at: DAY + 1, what: "fill", can: "can" }, { by: "ann", at: DAY + 2, what: "water", can: "can", tile: [133, 5] }]);
    expect(own.help).toEqual({});
  });

  it("forgets them when the plot is sown anew, or the plant there is somebody else's", () => {
    let log = play(helpedPlot());
    log = seen(log, { by: "ann", at: DAY + HOUR, what: "sow", tile: [133, 5] });
    expect(helpersOf(log, "133,5", "ann")).toEqual([]);
    log = play([...helpedPlot(), { by: "cy", at: DAY + HOUR, what: "water", can: "can", tile: [133, 5], whose: "eve" }]);
    expect(helpersOf(log, "133,5", "ann")).toEqual([]);
    expect(helpersOf(log, "133,5", "eve").map((h) => h.id)).toEqual(["bo", "cy"]);
  });

  it("thanks everybody who helped, one a day from one person to another", () => {
    const log = play(helpedPlot());
    const first = thank(log, [], "133,5", "ann", DAY + MIN);
    expect(first.ok && first.thanked).toEqual(["bo", "cy", "di"]);
    if (!first.ok) return;
    // the same day: nobody is left to thank, in this plot or in another they helped with
    expect(thank(log, first.given, "133,5", "ann", DAY + 2 * MIN)).toEqual({ ok: false, why: "none" });
    expect(toThank(log, first.given, "ann", DAY + 2 * MIN)).toEqual({});
    // the next day they can be thanked again
    const tomorrow = DAY + 24 * HOUR;
    expect(unthanked(first.given, helpersOf(log, "133,5", "ann"), "ann", tomorrow).map((h) => h.id)).toEqual(["bo", "cy", "di"]);
    expect(Object.keys(toThank(log, first.given, "ann", tomorrow))).toEqual(["133,5"]);
    // and somebody who was thanked today for another plot is left out, the others not
    const some: Thanks[] = [{ from: "ann", to: "cy", day: first.given[0].day, at: DAY }];
    expect(toThank(log, some, "ann", DAY + MIN)["133,5"].map((h) => h.id)).toEqual(["bo", "di"]);
    // it is not mine to thank for somebody else's plant
    expect(thank(log, [], "133,5", "bo", DAY + MIN)).toEqual({ ok: false, why: "none" });
  });

  it("counts them on a board of its own: today's by whom, the week's, all told, and who has been thanked most", () => {
    const monday = Date.parse("2026-10-05T10:00:00+07:00"), lastWeek = monday - 3 * 24 * HOUR;
    const day = (at: number) => Math.floor((at + 7 * HOUR - 5 * HOUR) / (24 * HOUR));
    const t = (from: string, to: string, at: number): Thanks => ({ from, to, day: day(at), at });
    const given = [t("ann", "bo", lastWeek), t("cy", "bo", lastWeek), t("di", "bo", lastWeek), t("ann", "cy", monday), t("di", "cy", monday + MIN), t("ann", "bo", monday + 2 * MIN)];
    const board = boardOf(given, "cy", monday + HOUR, name);
    expect(board.today).toEqual([{ id: "ann", name: "ANN" }, { id: "di", name: "DI" }]);
    expect([board.week, board.all]).toEqual([2, 2]);
    // this week Cy has more; all told, Bo
    expect(board.top).toEqual([{ id: "cy", name: "CY", n: 2 }, { id: "bo", name: "BO", n: 1 }]);
    expect(board.ever).toEqual([{ id: "bo", name: "BO", n: 4 }, { id: "cy", name: "CY", n: 2 }]);
    expect(boardOf(given, "bo", monday + HOUR, name)).toMatchObject({ week: 1, all: 4, today: [{ id: "ann" }] });
  });
});

describe("the jar at the well: what one drops, those who worked for the others are given", () => {
  const purse = (coins: number, ...items: Array<[Parameters<typeof put>[1], number]>): Purse => ({ ...newPurse(), coins, bag: items.reduce((bag, [id, n]) => put(bag, id, n), newPurse().bag) });
  const round = roundOf(DAY);

  it("takes coins, and what is grown, caught or cooked: never a tool, a pot of food or a bucket of water", () => {
    let did = drop(purse(10), newJar(round), { coins: 4 });
    expect(did.ok && [did.purse.coins, did.jar.coins]).toEqual([6, 4]);
    expect(drop(purse(3), newJar(round), { coins: 4 })).toEqual({ ok: false, why: "coins" });
    for (const coins of [0, -2, 1.5]) expect(drop(purse(10), newJar(round), { coins })).toEqual({ ok: false, why: "amount" });
    const p = purse(0, ["kangkong", 5], ["hoe", 1]);
    did = drop(p, newJar(round), { slot: 0, n: 3 });
    expect(did.ok && [did.purse.bag[0], did.jar.things]).toEqual([{ item: "kangkong", n: 2 }, [["kangkong", 3]]]);
    if (did.ok) {
      // more of the same goes onto its own entry; the last of a stack empties its slot
      const more = drop(did.purse, did.jar, { slot: 0, n: 2 });
      expect(more.ok && [more.purse.bag[0], more.jar.things]).toEqual([null, [["kangkong", 5]]]);
    }
    expect(drop(p, newJar(round), { slot: 1, n: 1 })).toEqual({ ok: false, why: "unwanted" });
    expect(drop(p, newJar(round), { slot: 2, n: 1 })).toEqual({ ok: false, why: "none" });
    expect(drop(p, newJar(round), { slot: 0, n: 6 })).toEqual({ ok: false, why: "amount" });
    expect(mayDrop({ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } })).toBe(false);
    expect(mayDrop({ item: "bucket", n: 1, water: 1 })).toBe(false);
    expect(mayDrop({ item: "tilapia", n: 2 })).toBe(true);
    expect(mayDrop({ item: "seedKangkong", n: 2 })).toBe(false);
  });

  it("shares by work, all of it: whole shares first, then one at a time to whoever fell furthest short", () => {
    expect(shares(10, [["a", 1], ["b", 1]])).toEqual([["a", 5], ["b", 5]]);
    expect(shares(10, [["a", 3], ["b", 1]])).toEqual([["a", 8], ["b", 2]]);
    // 7 by 1 : 1 : 1 is 2 each and one over, to the first by id
    expect(shares(7, [["a", 1], ["b", 1], ["c", 1]])).toEqual([["a", 3], ["b", 2], ["c", 2]]);
    // one thing among three: to whoever did most
    expect(shares(1, [["a", 2], ["b", 9], ["c", 2]])).toEqual([["b", 1]]);
    expect(shares(0, [["a", 1]])).toEqual([]);
    expect(shares(5, [])).toEqual([]);
    for (const [total, work] of [[13, [["a", 5], ["b", 3], ["c", 2]]], [100, [["a", 7], ["b", 7], ["c", 1]]], [2, [["a", 1], ["b", 1], ["c", 1], ["d", 1]]]] as Array<[number, Array<[string, number]>]>) {
      expect(shares(total, work).reduce((t, [, n]) => t + n, 0)).toBe(total);
    }
  });

  it("counts a bucketful poured as so many waterings, and only what was done for others", () => {
    const log = play([
      { by: "bo", at: DAY, what: "pour", n: 2 },
      { by: "cy", at: DAY + 1, what: "fill", can: "can" },
      { by: "cy", at: DAY + 2, what: "water", can: "can", tile: [133, 5], whose: "ann" },
      { by: "ann", at: DAY + 3, what: "water", can: "can", tile: [134, 5] },
      { by: "di", at: DAY + 13 * HOUR, what: "pour", n: 1 },
    ]);
    expect(workOf(log, round, round + 1)).toEqual([["bo", 2 * JAR.bucket], ["cy", 1]]);
    expect(workOf(log, round, round + 2)).toEqual([["bo", 2 * JAR.bucket], ["cy", 1], ["di", JAR.bucket]]);
    expect(workOf(log, round + 2, round + 5)).toEqual([]);
  });

  it("is shared when the uncle's relatives next come by, among those who worked since; nobody having worked, it keeps what it has", () => {
    const log = play([{ by: "bo", at: DAY, what: "pour", n: 3 }, { by: "cy", at: DAY + 1, what: "water", can: "can", tile: [133, 5], whose: "ann" }]);
    const jar: Jar = { round, coins: 50, things: [["kangkong", 4], ["tilapia", 1]] };
    // the same round: nothing happens
    expect(settle(jar, {}, log, DAY + HOUR)).toEqual({ jar, owed: {}, shared: false });
    const next = roundStart(round + 1) + MIN, did = settle(jar, {}, log, next);
    expect(did.shared).toBe(true);
    expect(did.jar).toEqual(newJar(round + 1));
    // 24 parts to 1: 48 coins and 2; the four kangkong all to Bo (3.84 of them, and the one over); the one fish to Bo
    expect(did.owed).toEqual({ bo: { coins: 48, things: [["kangkong", 4], ["tilapia", 1]] }, cy: { coins: 2, things: [] } });
    // what waited already is added to
    const again = settleWith({ round: round + 1, coins: 10, things: [["kangkong", 1]] }, did.owed, [["cy", 5]], round + 2);
    expect(again.owed.cy).toEqual({ coins: 12, things: [["kangkong", 1]] });
    expect(again.owed.bo).toEqual(did.owed.bo);
    // nobody worked: the jar keeps it, and is marked as looked at this round
    expect(settle(jar, {}, newLog(), next)).toEqual({ jar: { ...jar, round: round + 1 }, owed: {}, shared: false });
    // an empty jar shares nothing, whoever worked
    expect(settle(newJar(round), {}, log, next)).toEqual({ jar: newJar(round + 1), owed: {}, shared: false });
  });

  it("hands over what waits: the coins, and as many of the things as the bag has room for", () => {
    const owed: Owed = { bo: { coins: 48, things: [["kangkong", 4], ["tilapia", 1]] } };
    const did = collect(purse(1), owed, "bo");
    expect(did.ok && [did.coins, did.things, did.purse.coins, did.owed]).toEqual([48, [["kangkong", 4], ["tilapia", 1]], 49, {}]);
    expect(collect(purse(1), owed, "cy")).toEqual({ ok: false, why: "nothing" });
    // a full bag: the coins come, the things wait on
    const full: Purse = { ...newPurse(), bag: newPurse().bag.map(() => ({ item: "rod" as const, n: 1 })) };
    const some = collect(full, owed, "bo");
    expect(some.ok && [some.coins, some.things, some.owed]).toEqual([48, [], { bo: { coins: 0, things: [["kangkong", 4], ["tilapia", 1]] } }]);
    // …and with only things waiting and no room, nothing is taken
    if (some.ok) expect(collect(full, some.owed, "bo")).toEqual({ ok: false, why: "full" });
  });
});
