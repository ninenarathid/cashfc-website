import { describe, expect, it } from "vitest";
import { OTHERS, TUNES, heard, tickEvery } from "./sfx";

describe("the sounds of fishing", () => {
  it("ends a bigger fish on a bigger tune", () => {
    const order = ["flotsam", "common", "uncommon", "rare", "legend"] as const;
    for (let i = 1; i < order.length; i++) expect(TUNES[order[i]].length).toBeGreaterThan(TUNES[order[i - 1]].length);
    for (const tier of order) {
      const tune = TUNES[tier];
      // each note after the one before it, none together; in a range an ear takes for a tune
      for (let i = 1; i < tune.length; i++) expect(tune[i][1]).toBeGreaterThan(tune[i - 1][1]);
      for (const [hz] of tune) { expect(hz).toBeGreaterThan(200); expect(hz).toBeLessThan(3000); }
    }
    // a fish's tune goes up; what is no fish goes down
    for (const tier of ["common", "uncommon", "rare"] as const) expect(TUNES[tier][TUNES[tier].length - 1][0]).toBeGreaterThan(TUNES[tier][0][0]);
    expect(TUNES.flotsam[1][0]).toBeLessThan(TUNES.flotsam[0][0]);
  });

  it("lets somebody else's fishing be heard softer than one's own, fainter with distance, and not at all from far off", () => {
    expect(heard(0)).toBe(OTHERS.loud);
    expect(heard(0)).toBeLessThan(0.6);
    for (let d = 1; d <= OTHERS.far; d++) expect(heard(d)).toBeLessThan(heard(d - 1));
    expect(heard(OTHERS.far)).toBe(0);
    expect(heard(40)).toBe(0);
    // half way off it is already much fainter than beside them
    expect(heard(OTHERS.far / 2)).toBeLessThan(heard(0) * 0.3);
    expect(heard(-3)).toBe(OTHERS.loud);
  });

  it("ticks the reel quicker while line is being won, and quicker still as the line tightens", () => {
    expect(tickEvery(true, 0.5)).toBeLessThan(tickEvery(false, 0.5));
    expect(tickEvery(true, 0.9)).toBeLessThan(tickEvery(true, 0.2));
    for (const t of [-1, 0, 0.5, 1, 2]) { expect(tickEvery(true, t)).toBeGreaterThan(0.04); expect(tickEvery(true, t)).toBeLessThan(0.1); }
  });
});
