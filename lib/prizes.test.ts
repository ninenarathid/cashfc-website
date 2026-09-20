import { describe, expect, it } from "vitest";
import { inQueueOrder, oneIn, stockFits, type Win } from "@/lib/prizes";

/**
 * The three bits of prize arithmetic that are quietly wrong rather than broken.
 *
 * The queue order decides which person an admin serves next, and a queue that
 * serves the newest arrival first looks like a working list right up until
 * somebody has been waiting a fortnight. The one-in-N is the sentence that
 * catches a decimal point in the wrong place before a prize goes live at ten
 * times the chance it was meant to have. And a prize won by two people at
 * once leaves stock two at a time, so an odd number ends with one nobody can
 * ever win — a promise to one of a pair.
 */

const win = (o: Partial<Win> & { id: number; at: string }): Win => ({
  prizeId: 1, winner: "u", characterId: 1, name: "x", nameEn: null, detail: null,
  detailEn: null, icon: null, color: "#fff", tier: "rare", draw: "give",
  claimedAt: null, deliveredAt: null, seenWinner: null, seenAdmin: null, ...o,
});

const ids = (v: Win[]) => v.map((w) => w.id);

describe("inQueueOrder", () => {
  it("puts the people who are waiting first", () => {
    const got = inQueueOrder([
      win({ id: 1, at: "2026-09-01" }),
      win({ id: 2, at: "2026-09-02", claimedAt: "2026-09-02" }),
      win({ id: 3, at: "2026-09-03", deliveredAt: "2026-09-03" }),
    ]);
    expect(ids(got)).toEqual([2, 1, 3]);
  });

  it("serves the longest wait first, not the newest arrival", () => {
    const got = inQueueOrder([
      win({ id: 1, at: "2026-09-10", claimedAt: "2026-09-10" }),
      win({ id: 2, at: "2026-09-01", claimedAt: "2026-09-11" }),
      win({ id: 3, at: "2026-09-05", claimedAt: "2026-09-05" }),
    ]);
    expect(ids(got)).toEqual([2, 3, 1]);
  });

  it("shows what was handed over lately, newest first", () => {
    const got = inQueueOrder([
      win({ id: 1, at: "2026-09-01", deliveredAt: "2026-09-02" }),
      win({ id: 2, at: "2026-09-08", deliveredAt: "2026-09-09" }),
    ]);
    expect(ids(got)).toEqual([2, 1]);
  });

  it("leaves the caller's array alone", () => {
    const given = [
      win({ id: 1, at: "2026-09-09", claimedAt: "2026-09-09" }),
      win({ id: 2, at: "2026-09-01", claimedAt: "2026-09-01" }),
    ];
    inQueueOrder(given);
    expect(ids(given)).toEqual([1, 2]);
  });
});

describe("oneIn", () => {
  it("says what a percentage means in popotos", () => {
    expect(oneIn(2)).toBe(50);
    expect(oneIn(0.5)).toBe(200);
    expect(oneIn(0.1)).toBe(1000);
    expect(oneIn(100)).toBe(1);
  });

  it("has no answer for a prize that is never drawn", () => {
    expect(oneIn(0)).toBeNull();
  });
});

describe("stockFits", () => {
  it("lets any number through for the draws with one winner", () => {
    for (const draw of ["give", "receive", "daily"] as const) {
      expect(stockFits(draw, 1)).toBe(true);
      expect(stockFits(draw, 7)).toBe(true);
      expect(stockFits(draw, 0)).toBe(true);
      expect(stockFits(draw, null)).toBe(true);
    }
  });

  it("wants an even number when two people win at once", () => {
    expect(stockFits("both", 2)).toBe(true);
    expect(stockFits("both", 10)).toBe(true);
    expect(stockFits("both", 0)).toBe(true);
    expect(stockFits("both", 1)).toBe(false);
    expect(stockFits("both", 7)).toBe(false);
  });

  it("counts unlimited as fitting, because it never runs out mid-pair", () => {
    expect(stockFits("both", null)).toBe(true);
  });
});
