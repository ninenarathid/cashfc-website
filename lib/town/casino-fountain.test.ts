import { describe, expect, it } from "vitest";
import { coinsAt, FOUNTAIN_SECONDS, winSize } from "./casino-fountain";

const spin = (kind: string, amount: number) => ({ id: "spin-7", price: 100, prize: { kind, amount } }) as Parameters<typeof coinsAt>[0];

describe("Coins pouring out of a machine on a big win (2026-10-27)", () => {
  it("pours only for coins back above the price, and most for Gil or a thing", () => {
    expect(winSize({ price: 100, prize: null })).toBe("none");
    expect(winSize(spin("coin", 50))).toBe("none");
    expect(winSize(spin("coin", 150))).toBe("big");
    expect(winSize(spin("gil", 1000000))).toBe("grand");
    expect(coinsAt(spin("coin", 50), 1)).toEqual([]);
    const most = (s: Parameters<typeof coinsAt>[0]) => Math.max(...Array.from({ length: 40 }, (_, i) => coinsAt(s, i / 10).length));
    expect(most(spin("gil", 1000000))).toBeGreaterThan(most(spin("coin", 150)));
  });
  it("throws them up out of the tray, lets them fall to the floor before the machine and lie there, then fade", () => {
    const big = spin("coin", 200);
    const early = coinsAt(big, .3);
    expect(early.length).toBeGreaterThan(0);
    expect(early.some((c) => c.y < -10)).toBe(true);
    for (let t = 0; t <= FOUNTAIN_SECONDS; t += .05) for (const c of coinsAt(big, t)) {
      expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
      expect(c.y).toBeLessThanOrEqual(48 + 1e-9);
      if (c.lying) expect(c.y).toBeGreaterThanOrEqual(26);
    }
    expect(coinsAt(big, 3).some((c) => c.lying)).toBe(true);
    expect(coinsAt(big, FOUNTAIN_SECONDS + .1)).toEqual([]);
    // (the same spin, the same fountain on every page)
    expect(coinsAt(big, 1.2)).toEqual(coinsAt(spin("coin", 200), 1.2));
  });
});
