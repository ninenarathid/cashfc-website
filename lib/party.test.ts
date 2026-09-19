import { describe, expect, it } from "vitest";
import {
  DEFAULT_RUN_MINUTES, FOOD_MINUTES, RUN_MINUTES, SHAPE_SIZE, fmtFood,
  fmtLength, fmtRuns, foodToMinutes, mapsToMinutes, minutesToFood,
  minutesToRuns, runsToMinutes, shapeFits, slotsOf,
} from "@/lib/party";
import type { Shape } from "@/lib/party";

/**
 * The arithmetic and the seat maths behind a listing.
 *
 * shapeFits is worth the most here: it is asked while somebody is editing a
 * party that already has people in it, and the cost of getting it wrong is a
 * member silently losing their seat after a save.
 */

const SHAPES: Shape[] = ["light", "four", "full", "eight", "alliance", "open"];

describe("the seats a shape has", () => {
  it("agrees with SHAPE_SIZE for every shape", () => {
    for (const shape of SHAPES) {
      expect(slotsOf(shape)).toHaveLength(SHAPE_SIZE[shape]);
    }
  });

  it("gives every seat a distinct id", () => {
    for (const shape of SHAPES) {
      const ids = slotsOf(shape).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("has no seats at all for an open party", () => {
    expect(slotsOf("open")).toEqual([]);
  });

  it("numbers a headcount rather than naming roles", () => {
    const four = slotsOf("four");
    expect(four.map((s) => s.id)).toEqual(["1", "2", "3", "4"]);
    expect(four.every((s) => s.free)).toBe(true);
    expect(slotsOf("eight").map((s) => s.id))
      .toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("names the four of a light party", () => {
    expect(slotsOf("light").map((s) => s.id)).toEqual(["Tank", "Heal", "D1", "D2"]);
    expect(slotsOf("light").map((s) => s.role))
      .toEqual(["tank", "healer", "dps", "dps"]);
    expect(slotsOf("light").some((s) => s.free)).toBe(false);
  });

  it("names the eight of a full party", () => {
    expect(slotsOf("full").map((s) => s.id))
      .toEqual(["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"]);
    expect(slotsOf("full").filter((s) => s.role === "tank")).toHaveLength(2);
    expect(slotsOf("full").filter((s) => s.role === "healer")).toHaveLength(2);
    expect(slotsOf("full").filter((s) => s.role === "dps")).toHaveLength(4);
  });

  /*
   * An alliance is the eight-player party three times over, and a seat carries
   * its wing so B-H2 is not the same chair as A-H2.
   */
  it("builds an alliance as three wings of the same eight", () => {
    const seats = slotsOf("alliance");
    expect(seats).toHaveLength(24);
    expect(seats[0].id).toBe("A-MT");
    expect(seats[0].wing).toBe("A");
    expect(seats.at(-1)?.id).toBe("C-D4");
    for (const wing of ["A", "B", "C"]) {
      expect(seats.filter((s) => s.wing === wing)).toHaveLength(8);
    }
  });
});

describe("whether a party can change shape without losing anybody", () => {
  /*
   * The change people actually make: an extreme becomes a savage tier, eight
   * players either way, and everybody keeps the chair they are in.
   */
  it("allows a full party to stay full", () => {
    expect(shapeFits("full", { MT: 1, H1: 1, D1: 1 })).toBe(true);
  });

  it("allows any shape when nobody is sitting", () => {
    for (const shape of SHAPES) expect(shapeFits(shape, {})).toBe(true);
  });

  it("refuses to shrink below the number of people sitting", () => {
    const six = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
    expect(shapeFits("eight", six)).toBe(true);
    expect(shapeFits("four", six)).toBe(false);
  });

  /*
   * The condition that is easy to miss, and the reason "the new shape is bigger"
   * is not the test. An alliance has 24 seats to a full party's 8, but its seats
   * are named A-MT and A-H1 — so the MT of a full party has no chair in it, and
   * growing the party would drop them.
   */
  it("refuses a bigger shape that does not contain the seats in use", () => {
    expect(SHAPE_SIZE.alliance).toBeGreaterThan(SHAPE_SIZE.full);
    expect(shapeFits("alliance", { MT: 1 })).toBe(false);
    expect(shapeFits("alliance", { "A-MT": 1 })).toBe(true);
  });

  it("refuses a same-size shape whose seats are named differently", () => {
    expect(SHAPE_SIZE.light).toBe(SHAPE_SIZE.four);
    expect(shapeFits("four", { Tank: 1 })).toBe(false);
    expect(shapeFits("light", { 1: 1 })).toBe(false);
  });

  /*
   * A party with no seats holds everybody, so it fits only if nobody is sat
   * down — there would be no chair left to be in.
   */
  it("lets an open party take nobody and refuses it anybody", () => {
    expect(shapeFits("open", {})).toBe(true);
    expect(shapeFits("open", { MT: 1 })).toBe(false);
  });

  /* People waiting without a seat still have to fit in what is left over. */
  it("counts the people standing as well as the people sitting", () => {
    expect(shapeFits("full", { MT: 1, H1: 1 }, [1, 2, 3, 4, 5, 6])).toBe(true);
    expect(shapeFits("full", { MT: 1, H1: 1 }, [1, 2, 3, 4, 5, 6, 7])).toBe(false);
  });
});

describe("an evening measured in food", () => {
  it("is thirty minutes to the serving", () => {
    expect(FOOD_MINUTES).toBe(30);
    expect(foodToMinutes(1)).toBe(30);
    expect(foodToMinutes(3)).toBe(90);
  });

  it("round-trips a whole number of servings", () => {
    for (const food of [1, 2, 3, 6, 12]) {
      expect(minutesToFood(foodToMinutes(food))).toBe(food);
    }
  });

  it("keeps the half serving people actually say", () => {
    expect(foodToMinutes(2.5)).toBe(75);
    expect(minutesToFood(75)).toBe(2.5);
  });

  it("writes it the way a listing reads", () => {
    expect(fmtFood(90)).toBe("3 food");
    expect(fmtFood(75)).toBe("2.5 food");
    expect(fmtFood(30)).toBe("1 food");
  });
});

describe("an evening measured in runs", () => {
  it("uses the minutes the content actually takes", () => {
    expect(runsToMinutes(3, "extreme")).toBe(60);
    expect(runsToMinutes(3, "savage")).toBe(90);
    expect(runsToMinutes(2, "ultimate")).toBe(90);
  });

  it("falls back to the default for content with no figure of its own", () => {
    expect(runsToMinutes(2, undefined)).toBe(2 * DEFAULT_RUN_MINUTES);
    expect(RUN_MINUTES.savage).toBe(30);
  });

  /*
   * Clamped at both ends: a listing cannot claim a five-minute evening, and
   * nothing on the board runs longer than a day.
   */
  it("never goes below fifteen minutes or above a day", () => {
    expect(runsToMinutes(0, "savage")).toBe(15);
    expect(runsToMinutes(-5, "savage")).toBe(15);
    expect(runsToMinutes(9999, "savage")).toBe(1440);
  });

  it("never reads back as fewer than one run", () => {
    expect(minutesToRuns(0, "savage")).toBe(1);
    expect(minutesToRuns(1, "savage")).toBe(1);
    expect(minutesToRuns(90, "savage")).toBe(3);
  });

  it("round-trips a plausible number of runs", () => {
    for (const kind of ["extreme", "savage", "ultimate", "dungeon"] as const) {
      for (const runs of [1, 2, 3, 4]) {
        expect(minutesToRuns(runsToMinutes(runs, kind), kind)).toBe(runs);
      }
    }
  });

  it("writes one run without an s", () => {
    expect(fmtRuns(1)).toBe("1 run");
    expect(fmtRuns(3)).toBe("3 runs");
    expect(fmtRuns(0)).toBe("0 runs");
  });
});

describe("how long the board privately gives a map night", () => {
  it("assumes two maps each when the listing does not say", () => {
    expect(mapsToMinutes(undefined)).toBe(90);
  });

  it("scales with how many each person brings", () => {
    expect(mapsToMinutes(4)).toBe(180);
  });

  /*
   * Never less than an hour: filing a party as history while people are still
   * portalling is the expensive direction of this guess.
   */
  it("gives at least an hour and at most a day", () => {
    expect(mapsToMinutes(1)).toBe(60);
    expect(mapsToMinutes(0)).toBe(60);
    expect(mapsToMinutes(999)).toBe(1440);
  });
});

describe("saying a length out loud", () => {
  it.each([
    [0, "0m"],
    [45, "45m"],
    [60, "1h"],
    [90, "1h 30m"],
    [120, "2h"],
    [150, "2h 30m"],
    [1440, "24h"],
  ])("writes %i minutes as %s", (minutes, want) => {
    expect(fmtLength(minutes)).toBe(want);
  });
});
