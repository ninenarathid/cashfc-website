import { describe, expect, it } from "vitest";
import { linesOf, startPair, stepPair } from "./fishing";
import { newPurse, type Purse } from "./trade";

describe("later rods and the extra line", () => {
  for (const item of ["rod", "rodTeak", "rodMaster"] as const) for (const gift of [false, true]) {
    it(`${item} ${gift ? "with" : "without"} the gift uses the held rod`, () => {
      const p: Purse = { ...newPurse(), hand: item, bag: [{ item, n: 1 }, { item: "rodMaster", n: 1 }],
        ...(gift ? { gifts: { had: ["thingRod"], charms: [], familiar: null, used: {} } } : {}) };
      expect(linesOf(p, 0)).toBe((item === "rod" ? 1 : 2) + (gift ? 1 : 0));
    });
  }
  it("never casts from an absent rod", () => { expect(linesOf(newPurse())).toBe(0); });
});

describe("three fish on one reel", () => {
  it("keeps the other two alive when one line is lost", () => {
    let p = startPair(["tilapia", "carp", "catfish"], "good", {}, 713);
    expect(p.fights).toHaveLength(3);
    p = { ...p, tension: 1.05, strain: 0.99, silk: 0 };
    p = stepPair(p, true, 1 / 30);
    expect(p.ended.filter(Boolean)).toHaveLength(1);
    expect(p.ended.filter((x) => x === null)).toHaveLength(2);
    const lost = p.ended.findIndex(Boolean), f = p.fights[lost];
    p = stepPair(p, false, 1 / 30);
    expect(p.fights[lost]).toBe(f);
  });
  it("can land one fish while both other fights continue", () => {
    let p = startPair(["tilapia", "carp", "catfish"], "good", {}, 5);
    p = { ...p, tension: (p.lo[1] + p.hi[1]) / 2, fights: p.fights.map((f, i) => i === 1 ? { ...f, line: 0 } : f) };
    p = stepPair(p, false, 1 / 30);
    expect(p.ended[1]).toBe("landed");
    expect(p.ended[0]).toBeNull(); expect(p.ended[2]).toBeNull();
  });
  it("runs after the first fish is lost and stops only when every line ends", () => {
    const p = startPair(["tilapia", "carp", "catfish"], "good", {}, 67);
    const lone = { ...p, ended: ["snapped", "landed", null] as typeof p.ended };
    const next = stepPair(lone, false, 1 / 30);
    expect(next.t).toBeGreaterThan(lone.t);
    const over = { ...next, ended: ["snapped", "landed", "slipped"] as typeof p.ended };
    expect(stepPair(over, true, 1 / 30)).toBe(over);
  });
  it("rejects line counts outside the available rods and gift", () => {
    expect(() => startPair(["tilapia"], "good", {}, 1)).toThrow();
    expect(() => startPair(["tilapia", "carp", "catfish", "minnow"], "good", {}, 1)).toThrow();
  });
});
