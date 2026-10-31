import { describe, expect, it } from "vitest";
import { FIT_LOW, FIT_TOP, SIZES, fitOf, seedsFor, sizeFor } from "./giant-sizes";

describe("the steps of a plant grown over its ground", () => {
  it("goes up one side at a time, to the whole bed", () => {
    expect(SIZES.map((s) => s.n)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(sizeFor(69)).toBeNull();
    expect(sizeFor(70)?.n).toBe(2);
    expect(sizeFor(99)?.n).toBe(6);
    expect(sizeFor(100)?.n).toBe(7);
  });
  it("is never larger than the next step, at any Quality", () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const top = n * (FIT_TOP[n] ?? 1), nextLeast = (n + 1) * FIT_LOW;
      expect(top).toBeLessThan(nextLeast);
      for (let q = 0; q <= 100; q++) expect(n * fitOf(q, n)).toBeLessThan(nextLeast);
    }
  });
  it("grows a little with Quality inside a step", () => {
    expect(fitOf(78, 3)).toBeCloseTo(FIT_LOW);
    expect(fitOf(84, 3)).toBeGreaterThan(fitOf(80, 3));
    expect(fitOf(100, 7)).toBeLessThanOrEqual(FIT_TOP[7]);
  });
  it("takes one seed a row", () => {
    expect(seedsFor(7)).toBe(6);
    expect(seedsFor(7, 2)).toBe(5);
    expect(seedsFor(2)).toBe(1);
  });
});
