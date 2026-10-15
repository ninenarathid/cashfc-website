import { describe, expect, it } from "vitest";
import { CROP_IDS } from "./items";
import {
  COMPANIONS, NO_Q, PARTNERS, QUALITY, accrue, barsOf, barsOfQ, ceilingOf, narrowingOfQ, rangeOfQ, chancesOf, coverOffsets, coveredShare, dishGrade, gradeOf,
  narrowingOf, paidFor, rangeOf, rollOne, type Cover,
} from "./quality";

const H = 3_600_000;

describe("the farm's Quality", () => {
  it("grades at 40, 70 and 95", () => {
    expect([0, 39, 40, 69, 70, 94, 95, 100].map(gradeOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("fills a bar by the best source at each moment, never by adding two", () => {
    const hand: Cover = { role: "water", level: 0.5, from: 0, to: 10 * H }, house: Cover = { role: "water", level: 0.5, from: 0, to: 10 * H };
    expect(barsOf([hand, house], 0, 10 * H).water).toBe(12);
    expect(barsOf([hand, { role: "water", level: 1, from: 0, to: 10 * H }], 0, 10 * H).water).toBe(25);
  });

  it("weighs a bar by the share of the round it was covered", () => {
    // a companion planted half way through gives half the bar; hand work before it, half a bar the first half
    const late: Cover = { role: "soil", level: 1, from: 5 * H, to: 10 * H }, early: Cover = { role: "soil", level: 0.5, from: 0, to: 5 * H };
    expect(barsOf([late], 0, 10 * H).soil).toBe(12);
    expect(barsOf([late, early], 0, 10 * H).soil).toBe(18);
    // what lies outside the round does not count
    expect(barsOf([{ role: "soil", level: 1, from: -5 * H, to: 0 }], 0, 10 * H).soil).toBe(0);
  });

  it("takes fennel's points off the soil while it stands beside, never under 0", () => {
    const soil: Cover = { role: "soil", level: 1, from: 0, to: 10 * H };
    expect(barsOf([soil], 0, 10 * H, [{ role: "soil", points: QUALITY.fennel, from: 0, to: 10 * H }]).soil).toBe(15);
    expect(barsOf([], 0, 10 * H, [{ role: "soil", points: 10, from: 0, to: 10 * H }]).soil).toBe(0);
  });

  it("makes the ceiling of the four bars", () => {
    expect(ceilingOf({ soil: 20, water: 21, pollen: 15, guard: 12 })).toBe(68);
  });

  it("raises the floor by each source once, by its share of the round, 20 at the most", () => {
    expect(narrowingOf({})).toBe(0);
    expect(narrowingOf({ brush: 1 })).toBe(10);
    expect(narrowingOf({ brush: 1, rare: 0.5 })).toBe(15);
    expect(narrowingOf({ partner: 1, brush: 1, rare: 1, packet: 1 })).toBe(20);
    expect(narrowingOf({ rare: 0.37 })).toBe(3);
  });

  it("lays the range 30 under the ceiling, narrowed from below only", () => {
    expect(rangeOf(78)).toEqual({ lo: 48, hi: 78 });
    expect(rangeOf(78, 10)).toEqual({ lo: 58, hi: 78 });
    expect(rangeOf(100, 99)).toEqual({ lo: 90, hi: 100 });
    expect(rangeOf(20)).toEqual({ lo: 0, hi: 20 });
  });

  it("gives each grade its share of the range, so Excellent is never certain", () => {
    expect(chancesOf({ lo: 70, hi: 100 })[3]).toBeCloseTo(6 / 31);
    expect(chancesOf({ lo: 90, hi: 100 })[3]).toBeCloseTo(6 / 11);
    const c = chancesOf(rangeOf(100, 20));
    expect(c[3]).toBeLessThan(1);
    expect(c[0] + c[1] + c[2] + c[3]).toBeCloseTo(1);
  });

  it("rolls a whole number from floor to ceiling, both ends in", () => {
    expect(rollOne({ lo: 58, hi: 78 }, () => 0)).toBe(58);
    expect(rollOne({ lo: 58, hi: 78 }, () => 0.999999)).toBe(78);
    const seen = new Set<number>();
    let s = 1;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) seen.add(rollOne({ lo: 58, hi: 78 }, rand));
    expect(Math.min(...seen)).toBe(58);
    expect(Math.max(...seen)).toBe(78);
    expect(seen.size).toBe(21);
  });

  it("pays by the grade, and a dish takes its lowest graded ingredient", () => {
    expect([0, 1, 2, 3].map((g) => paidFor(40, g as 0 | 1 | 2 | 3))).toEqual([40, 50, 70, 100]);
    expect(dishGrade([3, 2, null])).toBe(2);
    expect(dishGrade([null, null])).toBe(0);
  });

  it("has twenty helpers, five a role, and the uncle sells one of each role", () => {
    const all = Object.values(COMPANIONS);
    expect(all).toHaveLength(20);
    for (const role of ["soil", "water", "pollen", "guard"]) {
      expect(all.filter((c) => c.role === role)).toHaveLength(5);
      expect(all.filter((c) => c.role === role && c.uncle)).toHaveLength(1);
    }
  });

  it("covers by its shape: four, eight, a line of six, or the fig's twelve round it", () => {
    expect(coverOffsets("plus")).toHaveLength(4);
    expect(coverOffsets("x")).toHaveLength(4);
    expect(coverOffsets("ring")).toHaveLength(8);
    expect(coverOffsets("line", 0)).toEqual([[-3, 0], [-2, 0], [-1, 0], [1, 0], [2, 0], [3, 0]]);
    expect(coverOffsets("line", 1)).toEqual([[0, -3], [0, -2], [0, -1], [0, 1], [0, 2], [0, 3]]);
    expect(coverOffsets("fig")).toHaveLength(12);
  });

  it("covers a plant on several cells by its share of them, and never itself", () => {
    expect(coveredShare(["3,3", "4,3"], "2,3", "plus")).toBe(0.5);
    expect(coveredShare(["3,3", "4,3"], "3,4", "ring")).toBe(1);
    expect(coveredShare(["5,5"], "5,5", "ring", 0, ["5,5"])).toBe(0);
  });

  it("names a partner for every main crop, a crop or a helper", () => {
    for (const crop of CROP_IDS) if (!(crop in COMPANIONS)) expect(PARTNERS[crop], crop).toBeDefined();
    for (const p of Object.values(PARTNERS)) expect(CROP_IDS.includes(p as never) || p in COMPANIONS, p).toBe(true);
  });

  describe("a plant's round, kept as it goes", () => {
    // a 10-hour plant growing by the clock, then ripe
    const linear = (t: number) => Math.min(1, Math.max(0, t / (10 * H)));
    const half: Cover = { role: "water", level: 0.5, from: 0, to: 20 * H }, full: Cover = { role: "soil", level: 1, from: 0, to: 20 * H };

    it("fills by the growing done while covered, and stops counting once ripe", () => {
      const q = accrue(NO_Q(0), 30 * H, linear, [half, full]);
      expect(q.span).toBeCloseTo(1);
      expect(barsOfQ(q)).toEqual({ soil: 25, water: 12, pollen: 0, guard: 0 });
    });

    it("comes to the same whether settled once or in pieces", () => {
      let q = NO_Q(0);
      for (const t of [2, 3.5, 7, 9.9, 12].map((h) => h * H)) q = accrue(q, t, linear, [half, full]);
      expect(barsOfQ(q)).toEqual(barsOfQ(accrue(NO_Q(0), 12 * H, linear, [half, full])));
    });

    it("weighs by growing, so a stretch of fast growth counts for more", () => {
      // grows 0.8 of the round in the first hour (a boost), 0.2 over the next nine; covered only in that first hour
      const fast = (t: number) => (t <= H ? (0.8 * t) / H : Math.min(1, 0.8 + (0.2 * (t - H)) / (9 * H)));
      const q = accrue(NO_Q(0), 10 * H, fast, [{ role: "guard", level: 1, from: 0, to: H }]);
      expect(barsOfQ(q).guard).toBe(20);
    });

    it("leaves a jump of growth between two settles out of the share", () => {
      // settled at 5 h on the old clock, then a watering jumps the plant on by 0.2: the new clock starts higher
      let q = accrue(NO_Q(0), 5 * H, linear, [full]);
      const after = (t: number) => Math.min(1, linear(t) + 0.2);
      q = accrue(q, 10 * H, after, [full]);
      expect(q.span).toBeCloseTo(0.8);
      expect(barsOfQ(q).soil).toBe(25);
    });

    it("narrows by the share of the growing each source covered, and the brush whole", () => {
      const q = accrue(NO_Q(0), 10 * H, linear, [full], [], [{ kind: "rare", from: 5 * H, to: 20 * H }, { kind: "partner", from: 0, to: 20 * H }]);
      expect(narrowingOfQ(q)).toBe(15);
      expect(narrowingOfQ(q, true)).toBe(20);
      expect(rangeOfQ(q, true)).toEqual({ lo: 15, hi: 25 });
    });
  });
});
