import { describe, expect, it } from "vitest";
import { saidBox, saidType, snapped } from "./said-layer";

describe("what is said over a head, on the page's own pixels", () => {
  it("reads larger on a desk's screen and keeps a phone's size", () => {
    expect(saidType(384).size).toBe(12);
    expect(saidType(360).wrap).toBe(168);
    expect(saidType(1280).size).toBe(14);
    expect(saidType(3840).size).toBe(14);
  });

  it("keeps a bubble's middle on a whole pixel, however wide its line", () => {
    for (const width of [31, 31.4, 32, 100.9]) expect(saidBox([width], { line: 16 }).w % 2).toBe(0);
    expect(saidBox([40, 90.2, 12], { line: 16 })).toEqual({ w: 110, h: 58 });
  });

  it("sets a bubble on the screen's own pixels, at any screen's ratio", () => {
    expect(snapped(100.4, 1)).toBe(100);
    expect(snapped(100.4, 2)).toBe(100.5);
    expect(snapped(100.4, 1.5) * 1.5).toBeCloseTo(151);
    expect(snapped(100.4, 0)).toBe(100);
  });
});
