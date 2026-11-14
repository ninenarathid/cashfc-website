import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newPurse } from "./trade";
import { Trial } from "./trial";

/**
 * The trial's stand-in for the weekly auction (v297's town_bid and its settling), with several testers in one
 * browser as the dev room has them: Codex's check of the shop (2026-10-25) found a tester pushed out of the copies was
 * never paid back, and only the tester whose look settled a round was given the set. The rounds are the second
 * round's (3 moon lantern, 4 maple), laid in by each test with no rival but a pretend one at 8,500 on the maple.
 */
const NOW = Date.parse("2026-11-10T12:00:00+07:00");
const CLOSE = Date.parse("2026-11-15T20:00:00+07:00");
const round = (id: number, design: string, wearables: string[], bids: Array<{ member: string; name: string; amount: number; at: number }>, closesAt = CLOSE) =>
  ({ id, design, wearables, run: 1, copies: 3, start: 8000, stepPct: 5, stepMin: 500, opensAt: NOW - 3600_000, closesAt, hardClose: closesAt + 30 * 60_000, settledAt: null, bids, owners: [] });
const rounds = (closesAt = CLOSE) => [
  round(3, "moonkeeper", ["moonkeeper", "moonlanternhat", "moonmask", "lanternpin"], [], closesAt),
  round(4, "mapleregent", ["mapleregent", "maplehat", "maplemask", "maplecomb"], [{ member: "trial-rival", name: "Mint", amount: 8500, at: NOW - 600_000 }], closesAt),
];
const kept = new Map<string, string>();
const purse = (id: string) => JSON.parse(kept.get(`cashtown.trial.purse.2.${id}`)!).coins as number;

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  kept.clear();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => kept.set(k, v), removeItem: (k: string) => kept.delete(k) } }));
  for (const id of ["A", "B", "C", "D"]) kept.set(`cashtown.trial.purse.2.${id}`, JSON.stringify({ ...newPurse({ profile: 247, gallery: 31 }), coins: 20000 }));
  kept.set("cashtown.trial.auctions.2", JSON.stringify(rounds()));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("the trial's auction with several testers", () => {
  it("pays back a tester pushed out of the copies, in full, at once", () => {
    const [a, b, c, d] = ["A", "B", "C", "D"].map((id) => new Trial(id));
    for (const t of [a, b, c]) { expect(t.bid(3, 8000).ok).toBe(true); vi.advanceTimersByTime(1000); }
    expect(purse("C")).toBe(12000);
    expect(d.bid(3, 8500).ok).toBe(true);
    // (three copies: the latest of the three equal bids is the one pushed out)
    expect(purse("C")).toBe(20000);
    expect([purse("A"), purse("B"), purse("D")]).toEqual([12000, 12000, 11500]);
  });

  it("moves a tester's bid to the other design, coins and all, one design at a time (the owner, 2026-10-26)", () => {
    const [a, b] = ["A", "B"].map((id) => new Trial(id));
    expect(a.bid(3, 9000).ok).toBe(true);
    expect(purse("A")).toBe(11000);
    vi.advanceTimersByTime(1000);
    expect(b.bid(3, 8000).ok).toBe(true);
    // (the maple has the pretend rival at 8,500 and a copy free: A's 9,000 moves there at its sum, paying nothing)
    const moved = a.bid(4, 9000);
    expect(moved).toMatchObject({ ok: true, pay: 0 });
    expect(purse("A")).toBe(11000);
    const boards = a.auctions().auctions;
    expect(boards.find((r) => r.id === 3)!.bids.map((x) => x.mine)).toEqual([false]);
    expect(boards.find((r) => r.id === 4)!.bids.find((x) => x.mine)?.amount).toBe(9000);
    expect(moved.ok && moved.from?.id).toBe(3);
    // (back again, raised: only the difference is taken)
    expect(a.bid(3, 9500)).toMatchObject({ ok: true, pay: 500 });
    expect(purse("A")).toBe(10500);
    expect(a.auctions().auctions.find((r) => r.id === 4)!.bids.some((x) => x.mine)).toBe(false);
  });

  it("gives every winner the set, whoever's look settles the round", () => {
    const [a, b] = ["A", "B"].map((id) => new Trial(id));
    expect(a.bid(3, 8000).ok).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(b.bid(3, 9000).ok).toBe(true);
    vi.setSystemTime(CLOSE + 1000);
    a.auctions();
    for (const t of [a, b]) {
      expect(t.dressed()).toEqual(expect.arrayContaining(["moonkeeper", "moonlanternhat", "moonmask", "lanternpin"]));
      expect(Object.keys(t.limited())).toContain("moonkeeper");
    }
    expect(b.limited().moonkeeper[1]).toBe(1);
    expect(a.limited().moonkeeper[1]).toBe(2);
  });

  it("moves both rounds' close for a late bid on one (v334), and closing them now settles both (the TEST panel)", () => {
    kept.set("cashtown.trial.auctions.2", JSON.stringify(rounds(NOW + 2 * 60_000)));
    const a = new Trial("A");
    expect(a.bid(3, 8000).ok).toBe(true);
    const [r3, r4] = a.auctions().auctions;
    expect([r3.closesAt, r4.closesAt]).toEqual([NOW + 5 * 60_000, NOW + 5 * 60_000]);
    a.auctionCloseIn(0);
    const after = a.auctions().auctions;
    expect(after.every((r) => !!r.settledAt)).toBe(true);
    expect(a.dressed()).toEqual(expect.arrayContaining(["moonkeeper", "lanternpin"]));
    a.auctionCloseIn(null);
    expect(a.auctions().auctions.map((r) => [r.id, !!r.settledAt])).toEqual([[3, false], [4, false]]);
  });
});
