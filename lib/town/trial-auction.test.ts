import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newPurse } from "./trade";
import { Trial } from "./trial";

/**
 * The trial's stand-in for the weekly auction (v297's town_bid and its settling), with several testers in one
 * browser as the dev room has them: Codex's check of the shop (2026-10-25) found a tester pushed out of the copies was
 * never paid back, and only the tester whose look settled a round was given the set.
 */
const NOW = Date.parse("2026-10-28T12:00:00+07:00");
const kept = new Map<string, string>();
const purse = (id: string) => JSON.parse(kept.get(`cashtown.trial.purse.2.${id}`)!).coins as number;

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  kept.clear();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => kept.set(k, v), removeItem: (k: string) => kept.delete(k) } }));
  for (const id of ["A", "B", "C", "D"]) kept.set(`cashtown.trial.purse.2.${id}`, JSON.stringify({ ...newPurse({ profile: 247, gallery: 31 }), coins: 20000 }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("the trial's auction with several testers", () => {
  it("pays back a tester pushed out of the copies, in full, at once", () => {
    const [a, b, c, d] = ["A", "B", "C", "D"].map((id) => new Trial(id));
    for (const t of [a, b, c]) { expect(t.bid(1, 8000).ok).toBe(true); vi.advanceTimersByTime(1000); }
    expect(purse("C")).toBe(12000);
    expect(d.bid(1, 8500).ok).toBe(true);
    // (three copies: the latest of the three equal bids is the one pushed out)
    expect(purse("C")).toBe(20000);
    expect([purse("A"), purse("B"), purse("D")]).toEqual([12000, 12000, 11500]);
  });

  it("gives every winner the set, whoever's look settles the round", () => {
    const [a, b] = ["A", "B"].map((id) => new Trial(id));
    expect(a.bid(1, 8000).ok).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(b.bid(1, 9000).ok).toBe(true);
    vi.setSystemTime(Date.parse("2026-11-05T12:00:00+07:00"));
    a.auctions();
    for (const t of [a, b]) {
      expect(t.dressed()).toEqual(expect.arrayContaining(["count", "counthat", "batmask", "rosefascinator"]));
      expect(Object.keys(t.limited())).toContain("count");
    }
    expect(b.limited().count[1]).toBe(1);
    expect(a.limited().count[1]).toBe(2);
  });
});
