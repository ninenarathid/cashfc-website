import { describe, expect, it } from "vitest";
import { grainChoice, grainOf, grainQuality } from "./wood-grain";

describe("reading wood grain", () => {
  it("offers every three-notch pattern and both leaning directions", () => {
    const plans = Array.from({ length: 16 }, (_, i) => grainOf(i));
    expect(new Set(plans.map(p => JSON.stringify(p))).size).toBe(16);
    expect(grainOf(0)).toEqual(grainOf(16));
  });
  it("judges each notch and the chosen fall direction, with misses affecting the heartwood", () => {
    for (let id = 0; id < 16; id++) {
      const p = grainOf(id), choice = { notches: p.notches, direction: p.lean };
      expect(grainQuality(id, choice, 0)).toBe("heart");
      expect(grainQuality(id, choice, 1)).toBe("clear");
      expect(grainQuality(id, choice, 2)).toBe("rough");
      expect(grainQuality(id, { ...choice, direction: -p.lean as -1 | 1 }, 0)).toBe("clear");
      expect(grainQuality(id, { ...choice, notches: choice.notches.map(s => -s as -1 | 1) }, 0)).toBe("rough");
    }
  });
  it("rejects missing, oversized and fabricated plans", () => {
    for (const value of [null, [], {}, { notches: [-1, 1], direction: 1 }, { notches: [0, 1, 1], direction: 1 }, { notches: [1, 1, 1, 1], direction: 1 }, { notches: [1, 1, 1], direction: "1" }]) expect(grainChoice(value)).toBe(false);
    expect(grainChoice({ notches: [-1, 1, -1], direction: 1 })).toBe(true);
  });
});
