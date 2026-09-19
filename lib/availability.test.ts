import { describe, expect, it } from "vitest";
import {
  DAYS, EMPTY, HOURS, SLOTS, describeDay, dayRanges, hourLabel, isEmpty,
  parse, serialise, slotIndex,
} from "@/lib/availability";

/**
 * The week grid as it is stored.
 *
 * This is a string in a column that two formats have now been written into, so
 * the interesting tests are about reading back what an older version of the site
 * wrote, and about the difference between "free at no time" and "never answered"
 * — which the type cannot express and a null has to.
 */

/** A grid with the given [day, hour] pairs switched on and nothing else. */
const grid = (...on: [number, number][]) => {
  const slots = Array<boolean>(SLOTS).fill(false);
  for (const [d, h] of on) slots[slotIndex(d, h)] = true;
  return slots;
};

const MONDAY = 0;
const SUNDAY = 6;

describe("the shape of the week", () => {
  it("is seven days of twenty-four hours", () => {
    expect(DAYS).toHaveLength(7);
    expect(SLOTS).toBe(168);
    expect(EMPTY).toHaveLength(SLOTS);
  });

  it("starts the week on Monday, because a raid week is planned from Monday", () => {
    expect(DAYS[MONDAY].en).toBe("Monday");
    expect(DAYS[SUNDAY].en).toBe("Sunday");
  });

  it("is row-major by day", () => {
    expect(slotIndex(MONDAY, 0)).toBe(0);
    expect(slotIndex(MONDAY, 23)).toBe(23);
    expect(slotIndex(1, 0)).toBe(HOURS);
    expect(slotIndex(SUNDAY, 23)).toBe(SLOTS - 1);
  });
});

describe("reading a stored grid", () => {
  it("reads the current 168-character format", () => {
    const slots = parse("1".repeat(SLOTS));
    expect(slots).toHaveLength(SLOTS);
    expect(slots.every(Boolean)).toBe(true);
  });

  it("round-trips through serialise", () => {
    const slots = grid([MONDAY, 20], [MONDAY, 21], [SUNDAY, 9]);
    const stored = serialise(slots);
    expect(stored).not.toBeNull();
    expect(parse(stored)).toEqual(slots);
  });

  /*
   * Everything unreadable reads as an empty grid rather than throwing. A member
   * row with a truncated string should render as "not filled in", not 500 the
   * profile page.
   */
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["digits that are not 0 or 1", "2".repeat(SLOTS)],
    ["letters", "x".repeat(SLOTS)],
    ["a length nobody ever wrote", "1".repeat(100)],
    ["one character short", "1".repeat(SLOTS - 1)],
  ])("reads %s as nothing filled in", (_name, raw) => {
    expect(parse(raw as string | null | undefined))
      .toEqual(Array<boolean>(SLOTS).fill(false));
  });
});

describe("reading what the four-block version wrote", () => {
  /* 28 characters: seven days of morning/afternoon/evening/late. */
  const legacy = (...blocks: [number, number][]) => {
    const out = Array<string>(28).fill("0");
    for (const [d, b] of blocks) out[d * 4 + b] = "1";
    return out.join("");
  };

  it("expands morning to 06:00–12:00", () => {
    const slots = parse(legacy([MONDAY, 0]));
    expect(dayRanges(slots, MONDAY)).toEqual([[6, 12]]);
  });

  it("expands afternoon to 12:00–18:00", () => {
    expect(dayRanges(parse(legacy([MONDAY, 1])), MONDAY)).toEqual([[12, 18]]);
  });

  it("expands evening to 18:00–22:00", () => {
    expect(dayRanges(parse(legacy([MONDAY, 2])), MONDAY)).toEqual([[18, 22]]);
  });

  /*
   * "Late" covered 22:00–02:00, and the expansion wraps with a modulo inside the
   * same day — so Monday-late means Monday 00:00–02:00 and Monday 22:00–24:00,
   * not Tuesday's small hours. Pinned as the behaviour it is: these are values
   * nobody writes any more, and moving them a day now would change what old
   * rows mean.
   */
  it("wraps late within its own day rather than into the next", () => {
    const slots = parse(legacy([MONDAY, 3]));
    expect(dayRanges(slots, MONDAY)).toEqual([[0, 2], [22, 24]]);
    expect(dayRanges(slots, 1)).toEqual([]);
  });

  /*
   * All four blocks ticked is still not a full day: the old format had no block
   * between 02:00 and 06:00, so there is no value anybody could have saved that
   * means "free at 04:00". Every row written by that version has this hole, and
   * it is a gap in what the format could say rather than a fault in the reading.
   */
  it("cannot express 02:00-06:00, so every legacy row has that hole", () => {
    const all = [...Array(7).keys()].flatMap(
      (d) => [0, 1, 2, 3].map((b) => [d, b] as [number, number]));
    const slots = parse(legacy(...all));

    expect(dayRanges(slots, MONDAY)).toEqual([[0, 2], [6, 24]]);
    for (let h = 2; h < 6; h++) {
      expect(slots[slotIndex(MONDAY, h)]).toBe(false);
    }
    for (const d of [...Array(7).keys()]) {
      expect(dayRanges(slots, d)).toEqual([[0, 2], [6, 24]]);
    }
  });
});

describe("free at no time versus never answered", () => {
  /*
   * The distinction the null carries. Somebody who opened the page and saved
   * without painting anything has not said "never" — so an all-empty grid is
   * stored as absent, and the profile keeps asking.
   */
  it("stores an untouched grid as null", () => {
    expect(serialise(Array<boolean>(SLOTS).fill(false))).toBeNull();
  });

  it("stores a grid with one hour in it", () => {
    expect(serialise(grid([MONDAY, 3]))).toBe(`000${"1"}${"0".repeat(SLOTS - 4)}`);
  });

  it.each([
    ["null", null, true],
    ["undefined", undefined, true],
    ["all zeroes", EMPTY, true],
    ["a single hour", `1${"0".repeat(SLOTS - 1)}`, false],
  ])("isEmpty(%s) is %s", (_name, raw, want) => {
    expect(isEmpty(raw as string | null)).toBe(want);
  });
});

describe("the stretches somebody is free", () => {
  it("finds nothing in an empty day", () => {
    expect(dayRanges(parse(null), MONDAY)).toEqual([]);
  });

  it("returns [from, to) so a single hour is one wide", () => {
    expect(dayRanges(grid([MONDAY, 9]), MONDAY)).toEqual([[9, 10]]);
  });

  it("joins touching hours into one stretch", () => {
    expect(dayRanges(grid([MONDAY, 20], [MONDAY, 21], [MONDAY, 22]), MONDAY))
      .toEqual([[20, 23]]);
  });

  it("keeps a gap as two stretches", () => {
    expect(dayRanges(grid([MONDAY, 9], [MONDAY, 20], [MONDAY, 21]), MONDAY))
      .toEqual([[9, 10], [20, 22]]);
  });

  /* A stretch reaching the end of the day closes at 24, not 0. */
  it("ends a run at midnight as 24", () => {
    expect(dayRanges(grid([MONDAY, 22], [MONDAY, 23]), MONDAY))
      .toEqual([[22, 24]]);
  });

  it("reads each day independently", () => {
    const slots = grid([MONDAY, 9], [SUNDAY, 20]);
    expect(dayRanges(slots, MONDAY)).toEqual([[9, 10]]);
    expect(dayRanges(slots, 1)).toEqual([]);
    expect(dayRanges(slots, SUNDAY)).toEqual([[20, 21]]);
  });
});

describe("saying it in words", () => {
  it("labels an hour on the clock", () => {
    expect(hourLabel(9)).toBe("09:00");
    expect(hourLabel(20)).toBe("20:00");
  });

  /* Midnight closing a range is 24:00; midnight opening one is 00:00. */
  it("labels midnight as 24:00 only at the end of a range", () => {
    expect(hourLabel(0)).toBe("00:00");
    expect(hourLabel(0, true)).toBe("24:00");
  });

  it("says nothing for a day with nothing on it", () => {
    expect(describeDay(parse(null), MONDAY, "en")).toBe("");
  });

  it("says all day when every hour is on", () => {
    const slots = parse("1".repeat(SLOTS));
    expect(describeDay(slots, MONDAY, "en")).toBe("All day");
    expect(describeDay(slots, MONDAY, "th")).toBe("ทั้งวัน");
  });

  it("lists the stretches otherwise", () => {
    expect(describeDay(grid([MONDAY, 9], [MONDAY, 20], [MONDAY, 21]), MONDAY, "en"))
      .toBe("09:00–10:00, 20:00–22:00");
  });

  it("writes a stretch reaching midnight as 24:00", () => {
    expect(describeDay(grid([MONDAY, 22], [MONDAY, 23]), MONDAY, "en"))
      .toBe("22:00–24:00");
  });
});
